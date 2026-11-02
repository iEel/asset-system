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

// Group 4 plan 5 final review: SQL Server compares tags without case, so a typed "ast-it-00012" holds AST-IT-00012 and
// a generated tag skips it (a clash there failed the whole import with 409 on every retry).
test("reserved and existing tags count without case", () => {
  assert.deepEqual(
    reserveAssetTagRunningNumbers({
      existingAssetTags: ["AST-IT-00011"],
      reservedAssetTags: ["ast-it-00012"],
      sequencePrefix: "AST-IT-",
      runningDigits: 5,
      count: 1,
    }),
    ["00013"]
  )
  assert.equal(getNextAssetTagRunningNumber({ existingAssetTags: ["sni-equ-26-0007"], sequencePrefix: "SNI-EQU-26-", runningDigits: 4 }), 8)
  assert.deepEqual(
    reserveAssetTagRunningNumbers({
      existingAssetTags: ["AST-IT-00001"],
      reservedAssetTags: ["ast-it-00003-x"],
      sequencePrefix: "AST-IT-",
      sequenceSuffix: "-X",
      runningDigits: 5,
      count: 1,
    }),
    ["00004"]
  )
})
