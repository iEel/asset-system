import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetLabelPrintQueueWhere,
  normalizeLabelPrintAssetIds,
  normalizeLabelTapeSize,
} from "../src/lib/asset-label-print-tracking.ts"

test("normalizes label print asset ids by trimming, deduping, and limiting", () => {
  assert.deepEqual(
    normalizeLabelPrintAssetIds([" asset-1 ", "", "asset-2", "asset-1", "asset-3"], 2),
    ["asset-1", "asset-2"]
  )
})

test("normalizes label tape size to supported values", () => {
  assert.equal(normalizeLabelTapeSize("12"), "12")
  assert.equal(normalizeLabelTapeSize("unknown"), "24")
  assert.equal(normalizeLabelTapeSize(null, "18"), "18")
})

test("builds label print queue filters", () => {
  assert.deepEqual(buildAssetLabelPrintQueueWhere("unprinted"), {
    isActive: true,
    labelPrints: { none: {} },
  })
  assert.deepEqual(buildAssetLabelPrintQueueWhere("printed"), {
    isActive: true,
    labelPrints: { some: {} },
  })
  assert.deepEqual(buildAssetLabelPrintQueueWhere("recent"), { isActive: true })
  assert.deepEqual(buildAssetLabelPrintQueueWhere("unexpected"), { isActive: true })
})
