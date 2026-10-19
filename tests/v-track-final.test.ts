import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"

// V track, the final plan: one whole-number rule, the label print queue's gates, a live field's polite region, and the
// form-error rule in the design docs (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4.4, §4.5,
// §7.2, §7.3, §9). One test per task, appended in order. The working tree is CRLF on Windows: every read strips \r.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
const C = "src/components/"

test("one whole-number rule: every whole-number field reads its own sentence for a fraction (v-track final task 1, VF1)", async () => {
  const rules = (await import("../src/lib/validation-rules.ts")) as Record<string, unknown>
  assert.equal(typeof rules.wholeNumber, "function", "validation-rules.ts exports wholeNumber")
  const wholeNumber = rules.wholeNumber as (value: number | string | null | undefined) => string | null
  for (const value of ["0", "12", " 7 ", "2026", "1.0", "-3", "1e3", 5]) assert.equal(wholeNumber(value), null, String(value))
  for (const value of ["1.5", "40.5", "0.3", "2569.5", 2.5]) assert.equal(wholeNumber(value), "notWholeNumber", String(value))
  assert.equal(wholeNumber("abc"), "invalidNumber")
  for (const empty of ["", "  ", null, undefined]) assert.equal(wholeNumber(empty), null, "an empty value is left to required")
  const source = read("src/lib/validation-rules.ts")
  assert.match(source, /^export function wholeNumber\(value: number \| string \| null \| undefined\): RuleCode \| null \{$/m)
  assert.match(source, /^export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals" \| "notWholeNumber"$/m)
  // Its own sentence, clearer than invalidNumber's "กรุณากรอกเป็นตัวเลข" (plan 3 open issue 2).
  assert.equal(messages("th").common.validation.notWholeNumber, "กรุณากรอกเป็นจำนวนเต็ม")
  assert.equal(messages("en").common.validation.notWholeNumber, "Enter a whole number")
  // Every whole-number field writes the shared rule after its range (plan 2 P-R8's three restatements are gone).
  const sites: Record<string, readonly string[]> = {
    [`${C}assets/asset-form.tsx`]: [
      'check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? wholeNumber(values.licenseTotalSeats))',
      'check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? wholeNumber(values.licenseUsedSeats) ?? seatsExceeded(values))',
    ],
    [`${C}audit/audit-round-form.tsx`]: [
      'check("auditYear", required(values.auditYear) ?? range(values.auditYear, yearRange.min, yearRange.max) ?? wholeNumber(values.auditYear))',
      'check("sampleRate", required(values.sampleRate) ?? range(values.sampleRate, 1, 100) ?? wholeNumber(values.sampleRate))',
    ],
    [`${C}maintenance/maintenance-plan-form.tsx`]: [
      'check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays) : null)',
    ],
    "src/lib/system-settings-field-rules.ts": [
      'if (key === "asset_tag_running_digits") return range(value, 1, 12) ?? wholeNumber(value)',
      "if (key === ldapSyncMaxScheduledDeactivationsKey) return range(value, 0) ?? wholeNumber(value)",
      "if (key === operationDocumentRunningDigitsKey || labelWidthKeys.has(key) || labelHeightKeys.has(key) || labelQrSizeKeys.has(key)) return wholeNumber(value)",
      // A label's margin and gap keep their 0.5 step (not a whole number).
      "if (labelSpacingKeys.has(key)) return step(value, 0.5)",
    ],
  }
  for (const [path, lines] of Object.entries(sites)) {
    const text = read(path)
    for (const line of lines) assert.ok(text.includes(line), `${path}: ${line}`)
    assert.match(text, /^import \{[^}]*\bwholeNumber\b[^}]*\} from "@\/lib\/validation-rules"$/m, path)
    assert.doesNotMatch(text, /pattern\(String\(|function wholeNumber\(|Number\.isInteger\(Number\(value\.trim/, `${path}: no rule of its own`)
  }
  // No form restates a whole number with step(v, 1) any more.
  assert.deepEqual(findMatches(readSourceFiles("src"), /\bstep\([^()]*, 1\)/g), [])
})

test("the print queue's three buttons wait with their reason beside them (v-track final task 2, VF2)", () => {
  const source = read(`${C}assets/asset-label-batch-tool.tsx`)
  // Add filtered: one label; aria-disabled while the scope holds nothing, tied to the line that says so; the handler
  // returns first (spec §4.4; plan 2 open issue 16).
  assert.match(source, /<Button\n\s+aria-disabled=\{recentAssets\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{recentAssets\.length === 0 \? "asset-label-add-filtered-reason" : undefined\}\n\s+onClick=\{addRecentAssets\}\n\s+className="w-full shrink-0 sm:w-auto"\n\s+>\n\s+<Plus aria-hidden="true" \/>\n\s+\{labels\.addFilteredQueue\}\n\s+<\/Button>/)
  assert.match(source, /\{recentAssets\.length === 0 \? \(\n\s+<p id="asset-label-add-filtered-reason" className="mt-1 text-meta text-muted-foreground">\n\s+\{labels\.addFilteredQueueUnavailable\}\n\s+<\/p>\n\s+\) : null\}\n\s+<\/div>\n\s+<Button\n/)
  assert.match(source, /function addRecentAssets\(\) \{\n(?:\s+\/\/[^\n]*\n)+\s+if \(recentAssets\.length === 0\) return\n\s+setSelected\(/)
  // The two print buttons: aria-disabled with nothing selected, tied to the empty note under them; both handlers already
  // return first.
  assert.match(source, /<Button\n\s+variant="outline"\n\s+aria-disabled=\{selectedForPrint\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{selectedForPrint\.length === 0 \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{printFirstLabel\}\n\s+className="w-full"\n\s+>/)
  assert.match(source, /<Button\n\s+aria-disabled=\{selectedForPrint\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{selectedForPrint\.length === 0 \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{printLabels\}\n\s+className="w-full"\n\s+>/)
  assert.ok(source.includes('<EmptyNote id="asset-label-print-reason">{labels.noSelected}</EmptyNote>'))
  assert.match(source, /function printLabels\(\) \{\n\s+if \(selectedForPrint\.length === 0\) return\n/)
  assert.match(source, /function printFirstLabel\(\) \{\n\s+const \[firstAsset\] = selectedForPrint\n\s+if \(!firstAsset\) return\n/)
  // No plain disabled gate is left on the three, and the add button no longer swaps its label for the reason.
  assert.doesNotMatch(source, /\bdisabled=\{(?:recentAssets|selectedForPrint)\.length === 0\}/)
  assert.doesNotMatch(source, /labels\.addFilteredQueueUnavailable : labels\.addFilteredQueue/)
})

test("a live field's polite region reads only its live check; a save's or the server's error is read once, by focus (v-track final task 3, VF3)", () => {
  const field = read(`${C}ui/field.tsx`)
  assert.match(field, /\n {2}liveError\?: string \| null\n/)
  assert.ok(field.includes('{liveError !== undefined ? <span data-slot="field-error-live" className="sr-only" aria-live="polite">{liveError}</span> : null}'), "the region holds the live text only")
  assert.ok(field.includes("{error ? <FieldError id={errorId} aria-hidden={(liveError && liveError === error) || undefined}>{error}</FieldError> : null}"), "the line is hidden from reading only while the region holds it")
  assert.doesNotMatch(field, /aria-live="polite">\{error\}/)
  // Every caller passes its live check's own text (null while it finds nothing), never the shown error.
  const sources = readSourceFiles("src")
  assert.deepEqual(findMatches(sources, /\bliveError(?=[\s>])/g, (path) => path === `${C}ui/field.tsx`), [], "no liveError without a value")
  assert.deepEqual(countMatchesByFile(sources, /\bliveError=\{/g), {
    [`${C}admin/depreciation-policy-builder.tsx`]: 1,
    [`${C}admin/system-settings-form.tsx`]: 25,
    [`${C}assets/asset-batch-form.tsx`]: 4,
    [`${C}assets/asset-form.tsx`]: 2,
  })
  const assetForm = read(`${C}assets/asset-form.tsx`)
  assert.match(assetForm, /liveError=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : null\}\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(assetForm, /liveError=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : null\}\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
  const batch = read(`${C}assets/asset-batch-form.tsx`)
  assert.ok(batch.includes('const rowLiveError = (index: number, field: RowField) => (liveDuplicates[rowKey(index, field)] ? t("batchRowDuplicate") : null)'))
  for (const view of ["card", "row"]) {
    for (const name of ["assetTag", "serialNumber"]) {
      assert.match(batch, new RegExp(`id=\\{rowFieldId\\(index, "${name}", "${view}"\\)\\}[^\\n]* liveError=\\{rowLiveError\\(index, "${name}"\\)\\} error=\\{rowError\\(index, "${name}"\\)\\}>`), `${view} ${name}`)
    }
  }
  const form = read(`${C}admin/system-settings-form.tsx`)
  assert.match(form, /const settingLiveError = \(key: string\) => \{\n\s+const code = liveErrors\[settingFieldKey\(key\)\]\n\s+if \(!code\) return null\n\s+return code === "invalidPrefix" \? labels\.invalidPrefix : validationMessage\(code, settingControlParams\[key\]\)\n\s+\}/)
  // Each live setting names its key twice: the error it shows and its live text.
  const sites = [...form.matchAll(/error=\{settingError\(([^)]+)\)\} liveError=\{settingLiveError\(([^)]+)\)\}>/g)]
  assert.equal(sites.length, 15)
  for (const [, shown, live] of sites) assert.equal(live, shown)
  assert.ok(form.includes("errorFor={settingError}\n                liveErrorFor={settingLiveError}"))
  assert.ok(form.includes("jsonLiveError={settingLiveError(depreciationPolicySettingKey)}"))
  assert.ok(form.includes('<Field label={labels.prefix} required error={prefixEditorError("prefix")} liveError={prefixLiveCode ? labels.invalidPrefix : null}>'))
  const panel = form.slice(form.indexOf("function LabelTemplatePanel("), form.indexOf("function LabelPreviewPanel("))
  assert.match(panel, /\n {2}liveErrorFor\?: \(key: string\) => string \| null\n/)
  for (const suffix of ["width_mm", "height_mm", "qr_size", "margin_mm", "gap_mm", "layout", "primary_template", "secondary_template", "tertiary_template"]) {
    assert.ok(panel.includes(`error={errorFor?.(\`\${prefix}_${suffix}\`)} liveError={liveErrorFor?.(\`\${prefix}_${suffix}\`)}>`), suffix)
  }
  const builder = read(`${C}admin/depreciation-policy-builder.tsx`)
  assert.match(builder, /\n {2}jsonLiveError\?: string \| null\n/)
  assert.match(builder, /error=\{jsonError\}\n\s+liveError=\{jsonLiveError\}\n\s+className="mt-3"/)
})

test("the design docs state the form-error rule, and no doc or guard still waits for the V track (v-track final task 4, VF4)", () => {
  const design = read("DESIGN.md")
  const start = design.indexOf("\n### Forms: Errors Under the Field\n")
  assert.ok(start > design.indexOf("\n### Forms: Save Bar, Steps, Sections and Signature\n"), "DESIGN.md §5 holds the rule after the forms section")
  const section = design.slice(start, design.indexOf("\n### Navigation\n"))
  assert.ok(section.startsWith("\n### Forms: Errors Under the Field\n\n**The Error Under the Field Rule.** "), "the rule opens the section")
  for (const phrase of ["`noValidate`", "`validate()`", "`useFieldErrors`", "`focusFirst(order, { idFor, reveal })`", "`waitForDialogToClose`", "`fieldErrors`", "Guard V3", "`aria-disabled`", "`aria-describedby`", "`Field liveError`", "**One announcement per save:**", "`notWholeNumber`", "`FieldGroup`", "never in a box of its own"]) {
    assert.ok(section.includes(phrase), `the section names ${phrase}`)
  }
  // The clauses the V track made untrue are gone, and the rest of DESIGN.md points at the rule.
  assert.doesNotMatch(design, /one fixed answer|`role="alert"`, under the hint|until the V track|the rest come with the V track|in many forms they are the only check|such as a validation gate|disabled with the reason shown/)
  assert.match(design, /The V track \(spec `docs\/superpowers\/specs\/2026-10-17-v-track-field-errors-design\.md`, four plans\)/, "the overview")
  assert.ok(design.includes('`{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }`'), "the Thai Copy Rule")
  assert.match(design, /\n- \*\*Do\*\* check a form on save /)
  assert.match(design, /\n- \*\*Don't\*\* show a field's error in a toast /)
  // docs/14: the rows, the guard paragraph, the registry row and the QA line.
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  assert.match(index, /\n\| A form's errors \| `useFieldErrors`/)
  assert.ok(index.includes("a prerequisite gate is `aria-disabled` with `aria-describedby` to its visible reason"), "the Button row")
  assert.ok(index.includes("\n\n`tests/validation-guards.test.ts` holds the V track"), "the V guards")
  assert.match(index, /\n\| Form errors \| \[`2026-10-17-v-track-field-errors-design\.md`\]\(superpowers\/specs\/2026-10-17-v-track-field-errors-design\.md\)/)
  assert.ok(index.includes("[`2026-10-19-v-track-final.md`](superpowers/plans/2026-10-19-v-track-final.md)"), "the registry names the final plan")
  assert.match(index, /\n- Save each form empty and with a wrong value: /)
  // .impeccable/design.json: the gate, the error line, one Do and one Don't; no new narrative rule (its schema's sections
  // are colors, typography and elevation).
  type Design = {
    components: Array<{ name: string; description: string; html: string; css: string }>
    narrative: { rules: Array<{ section: string }>; dos: string[]; donts: string[] }
  }
  const json = JSON.parse(readFileSync(".impeccable/design.json", "utf8")) as Design
  const component = (name: string) => json.components.find((entry) => entry.name === name) ?? { name, description: "", html: "", css: "" }
  assert.match(component("Primary Button").description, /A prerequisite gate is aria-disabled: it keeps focus/)
  assert.ok(component("Text Field").html.includes('aria-describedby="ds-asset-tag-error ds-asset-tag-hint"'))
  assert.ok(component("Text Field").html.includes('<p class="ds-field-error" id="ds-asset-tag-error">'))
  assert.ok(component("Text Field").css.includes(".ds-field-error { margin: 0; font-size: 13px; line-height: 1.5385; color: #B3261E; }"))
  assert.match(component("Dialog").description, /A field's error shows under its field in the body/)
  assert.ok(json.narrative.dos.some((entry) => entry.startsWith("Do check a form on save")))
  assert.ok(json.narrative.donts.some((entry) => entry.startsWith("Don't show a field's error in a toast")))
  assert.deepEqual([...new Set(json.narrative.rules.map((entry) => entry.section))].sort(), ["colors", "elevation", "typography"])
  // The guards and pins no longer say the V track is still to come.
  for (const path of ["tests/form-migration-guards.test.ts", "tests/asset-status-correction-ui.test.ts", "tests/validation-guards.test.ts"]) {
    assert.doesNotMatch(read(path), /wait for the V track|the V track removes it|The V track adds required|until the V track|the V track ends with/, path)
  }
})
