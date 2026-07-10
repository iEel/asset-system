import assert from "node:assert/strict"
import test from "node:test"
import {
  getFirstEnabledOptionIndex,
  getLastEnabledOptionIndex,
  getNextEnabledOptionIndex,
} from "../src/lib/searchable-select-navigation.ts"

const options = [
  { disabled: false },
  { disabled: true },
  { disabled: false },
  { disabled: true },
]

test("searchable select keyboard navigation skips disabled options and wraps", () => {
  assert.equal(getFirstEnabledOptionIndex(options), 0)
  assert.equal(getLastEnabledOptionIndex(options), 2)
  assert.equal(getNextEnabledOptionIndex(options, -1, 1), 0)
  assert.equal(getNextEnabledOptionIndex(options, 0, 1), 2)
  assert.equal(getNextEnabledOptionIndex(options, 2, 1), 0)
  assert.equal(getNextEnabledOptionIndex(options, -1, -1), 2)
  assert.equal(getNextEnabledOptionIndex(options, 2, -1), 0)
})

test("searchable select reports no active option when all choices are disabled", () => {
  const disabledOptions = [{ disabled: true }, { disabled: true }]

  assert.equal(getFirstEnabledOptionIndex(disabledOptions), -1)
  assert.equal(getLastEnabledOptionIndex(disabledOptions), -1)
  assert.equal(getNextEnabledOptionIndex(disabledOptions, -1, 1), -1)
})
