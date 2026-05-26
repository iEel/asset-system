import assert from "node:assert/strict"
import test from "node:test"

import { getNextAssetTagRunningNumber, reserveAssetTagRunningNumbers } from "../src/lib/asset-tag-sequence.ts"

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

test("reserves consecutive running numbers after the highest existing number", () => {
  assert.deepEqual(
    reserveAssetTagRunningNumbers({
      existingAssetTags: ["SNI-COM-26-0001", "SNI-COM-26-0010"],
      sequencePrefix: "SNI-COM-26-",
      sequenceSuffix: "",
      runningDigits: 4,
      count: 3,
    }),
    ["0011", "0012", "0013"]
  )
})

test("reserved running numbers skip already-used generated tags", () => {
  assert.deepEqual(
    reserveAssetTagRunningNumbers({
      existingAssetTags: ["SNI-COM-26-0001", "SNI-COM-26-0002", "SNI-COM-26-0004"],
      sequencePrefix: "SNI-COM-26-",
      sequenceSuffix: "",
      runningDigits: 4,
      count: 3,
    }),
    ["0005", "0006", "0007"]
  )
})

test("reserved running numbers also skip manual tags typed in the same batch", () => {
  assert.deepEqual(
    reserveAssetTagRunningNumbers({
      existingAssetTags: ["SNI-COM-26-0001", "SNI-COM-26-0002"],
      reservedAssetTags: ["SNI-COM-26-0003"],
      sequencePrefix: "SNI-COM-26-",
      sequenceSuffix: "",
      runningDigits: 4,
      count: 2,
    }),
    ["0004", "0005"]
  )
})
