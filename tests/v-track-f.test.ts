import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
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
