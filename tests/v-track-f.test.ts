import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { firstErrorKey, readFieldErrors, resolveValidationMessage, validationMessageKey, withoutKeys, type MessageLookup } from "../src/lib/field-error-client.ts"
import { FIELD_FOCUS_MARGIN, fieldScrollTop } from "../src/lib/field-focus.ts"
import { triggerInvalidClasses } from "../src/components/ui/field-variants.ts"
import { atLeastOne, email, maxLength, minLength, notBefore, pattern, range, required } from "../src/lib/validation-rules.ts"

// V track plan 1, area F (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §7): the rule helpers,
// the messages, the field-error hook, the focus helper and the shared parts. One test per commit. Sources are read with
// LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the rule helpers return codes, not text, and restate what the browser checked before noValidate (V spec §4.5, §7.2)", () => {
  // required: empty, blank, an empty list and an unticked box are missing; 0 is a value.
  for (const value of [undefined, null, "", "   ", [], false]) assert.equal(required(value), "required", JSON.stringify(value))
  for (const value of ["a", " a ", 0, ["x"], true]) assert.equal(required(value), null, JSON.stringify(value))
  // Length rules leave an empty value to required. minLength counts the trimmed text (the old disabled gates did);
  // maxLength counts the text as typed, like the maxLength attribute.
  assert.equal(minLength("", 10), null)
  assert.equal(minLength("  short   ", 10), "tooShort")
  assert.equal(minLength("ten chars!", 10), null)
  assert.equal(maxLength("", 3), null)
  assert.equal(maxLength("abcd", 3), "tooLong")
  assert.equal(maxLength("abc", 3), null)
  assert.equal(maxLength("กขค", 3), null, "Thai letters count one each, as the attribute counts them")
  // range: numbers or typed text; text that is not a number is invalidNumber; either bound may be left out.
  assert.equal(range("", 1, 100), null)
  assert.equal(range(null, 1, 100), null)
  assert.equal(range("abc", 1, 100), "invalidNumber")
  assert.equal(range("0", 1, 100), "outOfRange")
  assert.equal(range(101, 1, 100), "outOfRange")
  assert.equal(range(" 50 ", 1, 100), null)
  assert.equal(range(-1, 0, undefined), "outOfRange")
  assert.equal(range(1e9, 0, undefined), null)
  assert.equal(range(7, undefined, 5), "outOfRange")
  // email: the browser's own type="email" rule (WHATWG), so nothing it accepted before is refused now.
  assert.equal(email(""), null)
  assert.equal(email("buyer@example.co.th"), null)
  for (const value of ["buyer", "buyer@", "@example.com", "buyer @example.com", "buyer@exa mple.com"]) assert.equal(email(value), "invalidEmail", value)
  // pattern: the whole value must match, like the pattern attribute.
  const roleName = /[a-z][a-z0-9_]*/
  assert.equal(pattern("", roleName), null)
  assert.equal(pattern("asset_admin", roleName), null)
  assert.equal(pattern("Asset_admin", roleName), "invalidFormat")
  assert.equal(pattern("asset admin", roleName), "invalidFormat", "a match inside the value is not enough")
  // notBefore: end before start is the catalog key; the same day is fine; an empty side is left to required.
  assert.equal(notBefore("2026-10-16", "2026-10-17"), "endBeforeStart")
  assert.equal(notBefore("2026-10-17", "2026-10-17"), null)
  assert.equal(notBefore("2026-10-18", "2026-10-17"), null)
  assert.equal(notBefore("", "2026-10-17"), null)
  assert.equal(notBefore("2026-10-16", ""), null)
  // atLeastOne: a group (scopes, destinations) needs one value that required accepts.
  assert.equal(atLeastOne([]), "required")
  assert.equal(atLeastOne(["", null, false]), "required")
  assert.equal(atLeastOne(["", "integration:read"]), null)
  // Pure and importable by tests and client code: no React, no zod, no "@/".
  assert.doesNotMatch(read("src/lib/validation-rules.ts"), /from "@\/|from "zod"|from "react"|"use client"/)
})

test("every code has a Thai and an English message, with its limits when the form gives them (V spec §6.1, §7.1)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
  const lookup = (table: Record<string, string>): MessageLookup => ({
    has: (key) => typeof table[key] === "string",
    get: (key, params) => table[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name])),
  })
  const th = messages("th")
  const en = messages("en")
  assert.deepEqual(th.common.validation, {
    required: "กรุณาระบุข้อมูลนี้",
    tooShort: "ต้องมีอย่างน้อย {min} ตัวอักษร",
    tooShortPlain: "ข้อมูลสั้นเกินไป",
    tooLong: "ต้องไม่เกิน {max} ตัวอักษร",
    tooLongPlain: "ข้อมูลยาวเกินกำหนด",
    outOfRange: "ต้องอยู่ระหว่าง {min} ถึง {max}",
    outOfRangeMin: "ต้องไม่น้อยกว่า {min}",
    outOfRangeMax: "ต้องไม่เกิน {max}",
    outOfRangePlain: "ค่าอยู่นอกช่วงที่กำหนด",
    invalidDate: "วันที่ไม่ถูกต้อง",
    invalidNumber: "กรุณากรอกเป็นตัวเลข",
    invalidEmail: "รูปแบบอีเมลไม่ถูกต้อง",
    invalidFormat: "รูปแบบไม่ถูกต้อง",
    invalidChoice: "กรุณาเลือกจากรายการ",
    duplicate: "ข้อมูลนี้มีอยู่แล้วในระบบ",
    endBeforeStart: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น",
    invalid: "ข้อมูลไม่ถูกต้อง",
    tooManyDecimals: "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง",
  })
  assert.deepEqual(Object.keys(en.common.validation), Object.keys(th.common.validation))
  assert.equal(en.common.validation.tooShort, "Enter at least {min} characters")
  // A code with limits reads them when the form passes them, and a plain sentence when it does not (a server code
  // carries no limits).
  assert.equal(validationMessageKey("tooShort", { min: 10 }), "tooShort")
  assert.equal(validationMessageKey("tooShort"), "tooShortPlain")
  assert.equal(validationMessageKey("tooLong", { max: 100 }), "tooLong")
  assert.equal(validationMessageKey("tooLong", {}), "tooLongPlain")
  assert.equal(validationMessageKey("outOfRange", { min: 1, max: 100 }), "outOfRange")
  assert.equal(validationMessageKey("outOfRange", { min: 0 }), "outOfRangeMin")
  assert.equal(validationMessageKey("outOfRange", { max: 5 }), "outOfRangeMax")
  assert.equal(validationMessageKey("outOfRange"), "outOfRangePlain")
  assert.equal(validationMessageKey("required", { min: 1 }), "required")
  for (const [locale, table] of [["th", th], ["en", en]] as const) {
    const lookups = { validation: lookup(table.common.validation), apiErrors: lookup(table.apiErrors) }
    const say = (code: string, params?: Record<string, string | number>) => resolveValidationMessage(code, params, lookups)
    // Every code of the shared vocabulary (FIXED 1) and the date-pair key resolve to their own sentence, not the generic one.
    for (const code of ["required", "tooShort", "tooLong", "outOfRange", "invalidDate", "invalidNumber", "invalidEmail", "invalidFormat", "invalidChoice", "duplicate", "endBeforeStart"]) {
      assert.notEqual(say(code), table.common.validation.invalid, `${locale}: ${code}`)
    }
    assert.equal(say("invalid"), table.common.validation.invalid)
    // common.validation wins over a catalog key of the same name, then the catalog, then the generic sentence.
    assert.equal(say("endBeforeStart"), table.common.validation.endBeforeStart)
    assert.equal(say("licenseSeatsExceeded"), table.apiErrors.licenseSeatsExceeded, `${locale}: a custom server code reads its catalog message`)
    assert.equal(say("noSuchCode"), table.common.validation.invalid)
  }
  const thLookups = { validation: lookup(th.common.validation), apiErrors: lookup(th.apiErrors) }
  assert.equal(resolveValidationMessage("tooShort", { min: 10 }, thLookups), "ต้องมีอย่างน้อย 10 ตัวอักษร")
  assert.equal(resolveValidationMessage("tooShort", undefined, thLookups), "ข้อมูลสั้นเกินไป")
  assert.equal(resolveValidationMessage("outOfRange", { min: 1, max: 100 }, thLookups), "ต้องอยู่ระหว่าง 1 ถึง 100")
  assert.equal(resolveValidationMessage("outOfRange", { min: 0 }, thLookups), "ต้องไม่น้อยกว่า 0")
  assert.doesNotMatch(read("src/lib/field-error-client.ts"), /from "@\/|"use client"|from "react"|from "next-intl"/)
})

test("the first wrong field is focused and scrolled clear of the top edge and the sticky save bar (V spec §4.1, §4.2)", () => {
  // The dashboard scroll area runs from 64 to 864 in the viewport; the save bar covers its last 72px.
  const view = { scrollTop: 500, viewTop: 64, viewBottom: 864, coverBottom: 72 }
  assert.equal(FIELD_FOCUS_MARGIN, 24)
  // In view and clear of both edges: no scroll.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 300, fieldBottom: 380 }), null)
  // Above the view: its label lands 24px under the top edge.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 20, fieldBottom: 100 }), 500 + 20 - (64 + 24))
  // Behind the save bar: the least scroll that puts its error line 24px above the bar.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 740, fieldBottom: 820 }), 500 + 820 - (864 - 72 - 24))
  // Below the view: the same.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 1400, fieldBottom: 1480 }), 500 + 1480 - (864 - 72 - 24))
  // Taller than the room left: its top wins, so the label and the start of the control show.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 900, fieldBottom: 1900 }), 500 + 900 - (64 + 24))
  // Never above the start of the page.
  assert.equal(fieldScrollTop({ ...view, scrollTop: 10, fieldTop: 30, fieldBottom: 90 }), 0)
  const focus = read("src/lib/field-focus.ts")
  // The DOM half: the dashboard scroll area, the save bar, the label and the error line count; a closed <details> opens;
  // a group (fieldset) focuses its first control; a dialog or a sheet keeps the browser's own scroll.
  assert.match(focus, /closest<HTMLElement>\("\[data-dashboard-main\]"\)/)
  assert.match(focus, /querySelector<HTMLElement>\('\[data-slot="sticky-form-footer"\]'\)/)
  assert.match(focus, /label\[for="\$\{CSS\.escape\(control\.id\)\}"\]/)
  assert.match(focus, /getElementById\(`\$\{control\.id\}-error`\)/)
  assert.match(focus, /node\.tagName === "DETAILS"/)
  assert.match(focus, /behavior: "auto"/)
  assert.match(focus, /export function focusField\(target: HTMLElement\): HTMLElement \| null/)
  assert.match(focus, /export function waitForElement\(id: string, frames = 30\): Promise<HTMLElement \| null>/)
  assert.doesNotMatch(focus, /from "@\/|"use client"|from "react"|behavior: "smooth"/)
})

test("one hook holds a form's errors from validate() and from the server, clears them per field and focuses the first (V spec §4.1, §4.3, §7.2)", () => {
  // The server's fieldErrors (FIXED 2): string codes under dotted keys and _form; anything else is ignored.
  assert.deepEqual(readFieldErrors({ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { code: "duplicate", "rows.3.serialNumber": "duplicate", _form: "invalid", count: 3, empty: "" } }), {
    code: "duplicate",
    "rows.3.serialNumber": "duplicate",
    _form: "invalid",
  })
  for (const payload of [null, undefined, "Invalid request data", { error: "Unexpected error" }, { fieldErrors: {} }, { fieldErrors: ["required"] }, { fieldErrors: { name: 1 } }]) {
    assert.equal(readFieldErrors(payload), null, JSON.stringify(payload))
  }
  // The first key in the form's visual order that has an error; _form and keys the form does not show never focus.
  assert.equal(firstErrorKey({ name: "tooLong", code: "required" }, ["code", "name"]), "code")
  assert.equal(firstErrorKey({ _form: "invalid", "rows.3.serialNumber": "duplicate" }, ["code", "name"]), null)
  assert.equal(firstErrorKey({ code: "" }, ["code"]), null)
  // Clearing returns the same map when nothing changes, so a keystroke in a clean field does not render again.
  const errors = { code: "required", name: "tooLong" }
  assert.equal(withoutKeys(errors, ["email"]), errors)
  assert.deepEqual(withoutKeys(errors, ["code", "email"]), { name: "tooLong" })
  const hook = read("src/components/ui/use-field-errors.ts")
  assert.match(hook, /^"use client"\n/)
  assert.match(hook, /export function useFieldErrors<K extends string = string>\(options\?: \{ params\?: Partial<Record<K, ValidationParams>> \}\)/)
  assert.match(hook, /export function useValidationMessage\(\): \(code: string, params\?: ValidationParams\) => string/)
  // Messages: common.validation, then the api-error catalog (spec §7.1).
  assert.match(hook, /useTranslations\("common"\)/)
  assert.match(hook, /useTranslations\("apiErrors"\)/)
  assert.match(hook, /tCommon\.has\(`validation\.\$\{key\}`\)/)
  // The ref keeps focusFirst right after setErrors in the same handler; focus waits for the render that shows the errors.
  assert.match(hook, /errorsRef\.current = next/)
  assert.match(hook, /\}, \[focusRequest\]\)/)
  assert.match(hook, /await request\.options\?\.reveal\?\.\(key\)/)
  assert.match(hook, /waitForElement\(request\.options\?\.idFor\?\.\(key\) \?\? key\)/)
  assert.match(hook, /return useMemo\(\(\) => \(\{ errors, setErrors, applyServer, clear, message, focusFirst \}\)/)
  // Validation never goes through a toast (spec U2): the hook has none, and a form's catch keeps its own.
  assert.doesNotMatch(hook, /from "sonner"|\btoast\.|useApiError/)
})

test("errors shown by a submit are read once, through focus, and a live error keeps a polite announcement (V spec §7.3, G5, U8)", () => {
  const field = read("src/components/ui/field.tsx")
  // No alert per error: after a submit the hook focuses the first wrong field, which reads its label and its error
  // (aria-describedby). Five alerts at once are an anti-goal (spec §3).
  assert.match(field, /function FieldError\(\{ className, \.\.\.props \}: React\.ComponentProps<"p">\) \{\n  return <p data-slot="field-error" className=\{cn\("text-meta text-danger", className\)\} \{\.\.\.props\} \/>\n\}/)
  assert.doesNotMatch(field, /role="alert"|aria-live="assertive"/)
  // A check that runs while typing (the asset form's duplicate tag and serial, spec U8) passes liveError: a polite live
  // region that is always there reads each new error once; the visible line is hidden from reading so it is not read twice.
  assert.match(field, /liveError\?: boolean/)
  assert.match(field, /\{liveError \? <span data-slot="field-error-live" className="sr-only" aria-live="polite">\{error\}<\/span> : null\}/)
  assert.match(field, /\{error \? <FieldError id=\{errorId\} aria-hidden=\{liveError \|\| undefined\}>\{error\}<\/FieldError> : null\}/)
  const assetForm = read("src/components/assets/asset-form.tsx")
  // v-track plan 2 A1: a save's other error of these fields shows in the same place (errorText).
  assert.match(assetForm, /id="asset-tag"\n\s+liveError\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(assetForm, /liveError\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
  assert.equal(assetForm.match(/\bliveError\b/g)?.length, 2)
  // SearchableSelect renders the same FieldError, so its errors follow the same rule.
  assert.match(read("src/components/ui/searchable-select.tsx"), /<FieldError id=\{errorId\}>/)
})

test("SearchableSelect shows the field error look, turns teal while focused or open, and its wrappers pass id and error on (V spec §7.3)", () => {
  // The trigger is a button, which takes no aria-invalid (jsx-a11y): data-invalid carries the state, the classes live
  // with the other field classes, and the error is tied by aria-describedby (field-primitives.test.ts).
  assert.equal(
    triggerInvalidClasses,
    "data-invalid:border-danger data-invalid:ring-1 data-invalid:ring-danger data-invalid:shadow-field-error data-invalid:focus:border-ring data-invalid:focus:ring-ring data-invalid:focus:shadow-field-focus data-invalid:aria-expanded:border-ring data-invalid:aria-expanded:ring-ring data-invalid:aria-expanded:shadow-field-focus",
  )
  assert.doesNotMatch(triggerInvalidClasses, /focus:(?:border|ring)-danger|aria-expanded:(?:border|ring)-danger/)
  const select = read("src/components/ui/searchable-select.tsx")
  assert.match(select, /import \{ fieldControlVariants, triggerInvalidClasses, type FieldSize \} from "@\/components\/ui\/field-variants"/)
  assert.match(select, /\n\s+data-invalid=\{error \? true : undefined\}\n/)
  assert.match(select, /\n\s+triggerInvalidClasses,\n/)
  assert.doesNotMatch(select, /"border-danger ring-1 ring-danger shadow-field-error"/)
  // The trigger id is the caller's id when given, so focusFirst finds it (stable ids: the form names them).
  assert.match(select, /const triggerId = id \?\? `\$\{generatedId\}-trigger`/)
  for (const path of ["src/components/maintenance/maintenance-option-select.tsx", "src/components/audit/audit-scan-check-field.tsx"]) {
    const source = read(path)
    assert.match(source, /\n\s+id\?: string\n/, path)
    assert.match(source, /\n\s+error\?: React\.ReactNode\n/, path)
    assert.match(source, /<SearchableSelect\n\s+id=\{id\}\n/, path)
    assert.match(source, /\n\s+error=\{error\}\n/, path)
  }
})

test("a group of choices shows its error under the group, tied to the group, and focus goes to its first control (V spec §7.3)", () => {
  const group = read("src/components/ui/field-group.tsx")
  // Server-safe like Field: useId is its only hook.
  assert.doesNotMatch(group, /"use client"|\buse(?:State|Effect|LayoutEffect|Context)\b|\bcreateContext\b/)
  assert.match(group, /function FieldGroup\(\{ legend, required, hint, error, id, className, children \}: FieldGroupProps\)/)
  // The group is the fieldset the old markup used (legend with the shared label class and star), with an id for
  // focusFirst and data-slot="field-group" for the focus helper, which measures it and focuses its first control.
  assert.match(group, /<fieldset id=\{groupId\} data-slot="field-group" aria-describedby=\{describedBy\} className=\{cn\("min-w-0", className\)\}>/)
  assert.match(group, /<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>\s*\{legend\}\s*\{required \? <FieldRequiredMark \/> : null\}\s*<\/legend>/)
  // Error before hint, as Field reads them; the error id is <group id>-error.
  assert.match(group, /const describedBy = \[errorId, hintId\]\.filter\(Boolean\)\.join\(" "\) \|\| undefined/)
  assert.match(group, /const errorId = error \? `\$\{groupId\}-error` : undefined/)
  assert.match(group, /\{error \? <FieldError id=\{errorId\} className="mt-1\.5">\{error\}<\/FieldError> : null\}/)
  assert.match(group, /export \{ FieldGroup \}/)
  assert.match(read("src/lib/field-focus.ts"), /\[data-slot="field-group"\]/)
})
