import assert from "node:assert/strict"
import test from "node:test"

import { buildCostInsights } from "../src/lib/cost-insights.ts"

test("summarizes purchase value, repair exposure, and missing price counts", () => {
  const insights = buildCostInsights([
    { id: "asset-1", label: "AST-001 - Notebook", purchasePrice: 40000, repairCost: 25000, repairCount: 3 },
    { id: "asset-2", label: "AST-002 - Printer", purchasePrice: 80000, repairCost: 5000, repairCount: 1 },
    { id: "asset-3", label: "AST-003 - Camera", purchasePrice: null, repairCost: 3000, repairCount: 1 },
  ])

  assert.equal(insights.totalPurchaseValue, 120000)
  assert.equal(insights.totalRepairCost, 33000)
  assert.equal(insights.missingPurchasePriceCount, 1)
  assert.equal(insights.highValueAssetCount, 1)
  assert.equal(insights.repairToPurchaseRatio, 0.275)
})

test("prioritizes high repair exposure by repair-to-purchase ratio", () => {
  const insights = buildCostInsights([
    { id: "asset-1", label: "AST-001 - Notebook", purchasePrice: 40000, repairCost: 25000, repairCount: 3 },
    { id: "asset-2", label: "AST-002 - Printer", purchasePrice: 80000, repairCost: 5000, repairCount: 1 },
    { id: "asset-3", label: "AST-003 - Camera", purchasePrice: null, repairCost: 3000, repairCount: 1 },
  ])

  assert.deepEqual(insights.highRepairExposureAssets.map((asset) => asset.id), ["asset-1", "asset-2", "asset-3"])
  assert.equal(insights.highRepairExposureAssets[0].repairToPurchaseRatio, 0.625)
  assert.equal(insights.highRepairExposureAssets[2].repairToPurchaseRatio, null)
})
