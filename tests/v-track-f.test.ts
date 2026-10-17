import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { resolveValidationMessage, validationMessageKey, type MessageLookup } from "../src/lib/field-error-client.ts"
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
