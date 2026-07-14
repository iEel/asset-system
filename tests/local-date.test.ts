import assert from "node:assert/strict"
import test from "node:test"

import { toLocalDateInputValue } from "../src/lib/local-date.ts"

test("formats a Bangkok local date without UTC rollback", () => {
  assert.equal(toLocalDateInputValue(new Date("2026-07-14T00:30:00+07:00"), "Asia/Bangkok"), "2026-07-14")
})

test("formats the same instant for the requested local calendar", () => {
  const instant = new Date("2026-07-13T17:30:00.000Z")
  assert.equal(toLocalDateInputValue(instant, "Asia/Bangkok"), "2026-07-14")
  assert.equal(toLocalDateInputValue(instant, "UTC"), "2026-07-13")
})

test("returns an empty value for an invalid date", () => {
  assert.equal(toLocalDateInputValue(new Date("invalid"), "Asia/Bangkok"), "")
})
