import assert from "node:assert/strict"
import test from "node:test"

import { getNextAssetTagRunningNumber } from "../src/lib/asset-tag-sequence.ts"

test("uses the highest existing running number instead of counting matching tags", () => {
  assert.equal(
    getNextAssetTagRunningNumber({
      existingAssetTags: ["SNI-EQU-26-0001", "SNI-EQU-26-0010"],
      sequencePrefix: "SNI-EQU-26-",
      runningDigits: 4,
    }),
    11
  )
})

test("ignores tags from other prefixes and malformed running suffixes", () => {
  assert.equal(
    getNextAssetTagRunningNumber({
      existingAssetTags: ["SNI-EQU-25-0099", "SNI-EQU-26-0003-OLD", "SNI-EQU-26-ABCD"],
      sequencePrefix: "SNI-EQU-26-",
      runningDigits: 4,
    }),
    1
  )
})
