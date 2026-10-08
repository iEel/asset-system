import assert from "node:assert/strict"
import test from "node:test"

import { displayYearRange, fromDisplayYear, toDisplayYear } from "../src/lib/display-year.ts"

test("Thai shows Buddhist-era years and converts back on input", () => {
  assert.equal(toDisplayYear(2026, "th"), 2569)
  assert.equal(fromDisplayYear(2569, "th"), 2026)
})

test("English keeps Gregorian years", () => {
  assert.equal(toDisplayYear(2026, "en"), 2026)
  assert.equal(fromDisplayYear(2026, "en"), 2026)
})

test("the Thai year field accepts exactly the API's 2000–2100 range, so a typed 2026 is refused", () => {
  assert.deepEqual(displayYearRange("th"), { min: 2543, max: 2643 })
  assert.deepEqual(displayYearRange("en"), { min: 2000, max: 2100 })
  const { min } = displayYearRange("th")
  assert.ok(2026 < min, "a Gregorian year typed on the Thai form is below the minimum")
})
