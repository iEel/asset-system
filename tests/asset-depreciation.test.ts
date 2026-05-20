import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDepreciationSummary,
  buildDepreciationPeriodSnapshot,
  inferUsefulLifeMonths,
  parseDepreciationPolicySetting,
  resolveDepreciationPolicyForAsset,
} from "../src/lib/asset-depreciation.ts"

test("calculates straight-line depreciation and net book value", () => {
  const summary = buildDepreciationSummary(
    [
      {
        id: "asset-1",
        label: "SNI-EQU-24-0001 - Notebook",
        categoryCode: "Computer",
        categoryName: "Computer",
        ownershipType: "personal",
        purchasePrice: 120000,
        purchaseDate: new Date("2024-05-20T00:00:00.000Z"),
      },
    ],
    new Date("2026-05-20T00:00:00.000Z")
  )

  assert.equal(summary.totalAcquisitionCost, 120000)
  assert.equal(summary.totalAccumulatedDepreciation, 48000)
  assert.equal(summary.totalNetBookValue, 72000)
  assert.equal(summary.depreciableAssets[0].ageMonths, 24)
  assert.equal(summary.depreciableAssets[0].usefulLifeMonths, 60)
  assert.equal(summary.depreciableAssets[0].status, "depreciating")
})

test("caps accumulated depreciation at acquisition cost", () => {
  const summary = buildDepreciationSummary(
    [
      {
        id: "asset-1",
        label: "SNI-EQU-20-0001 - Printer",
        categoryCode: "Printer",
        categoryName: "Printer",
        ownershipType: "shared",
        purchasePrice: 60000,
        purchaseDate: new Date("2020-05-20T00:00:00.000Z"),
      },
    ],
    new Date("2026-05-20T00:00:00.000Z")
  )

  assert.equal(summary.totalAccumulatedDepreciation, 60000)
  assert.equal(summary.totalNetBookValue, 0)
  assert.equal(summary.fullyDepreciatedCount, 1)
  assert.equal(summary.depreciableAssets[0].status, "fully_depreciated")
})

test("tracks missing accounting inputs separately", () => {
  const summary = buildDepreciationSummary(
    [
      {
        id: "asset-1",
        label: "SNI-EQU-26-0001 - Unknown",
        categoryCode: null,
        categoryName: null,
        ownershipType: "stock",
        purchasePrice: null,
        purchaseDate: null,
      },
    ],
    new Date("2026-05-20T00:00:00.000Z")
  )

  assert.equal(summary.missingAccountingInfoCount, 1)
  assert.equal(summary.depreciableAssets.length, 0)
})

test("uses shorter useful life for software and computer components", () => {
  assert.equal(inferUsefulLifeMonths({ categoryCode: "License", categoryName: "ลิขสิทธิ์", ownershipType: "software_license" }), 36)
  assert.equal(inferUsefulLifeMonths({ categoryCode: "Computer Component", categoryName: "RAM", ownershipType: "component" }), 36)
  assert.equal(inferUsefulLifeMonths({ categoryCode: "CCTV", categoryName: "ระบบกล้องวงจรปิด", ownershipType: "shared" }), 60)
})

test("applies configured depreciation policy by category and residual value", () => {
  const policyResult = parseDepreciationPolicySetting(
    JSON.stringify({
      defaultUsefulLifeMonths: 72,
      defaultResidualRate: 0.1,
      rules: [{ match: "CCTV", usefulLifeMonths: 84, residualRate: 0.2 }],
    })
  )

  assert.equal(policyResult.isValid, true)
  assert.deepEqual(resolveDepreciationPolicyForAsset({ categoryCode: "CCTV", categoryName: "ระบบกล้องวงจรปิด", ownershipType: "shared" }, policyResult.policy), {
    usefulLifeMonths: 84,
    residualRate: 0.2,
  })

  const summary = buildDepreciationSummary(
    [
      {
        id: "asset-1",
        label: "SNI-CCTV-24-0001 - Camera",
        categoryCode: "CCTV",
        categoryName: "ระบบกล้องวงจรปิด",
        ownershipType: "shared",
        purchasePrice: 84000,
        purchaseDate: new Date("2024-05-20T00:00:00.000Z"),
      },
    ],
    new Date("2026-05-20T00:00:00.000Z"),
    { policy: policyResult.policy }
  )

  assert.equal(summary.depreciableAssets[0].usefulLifeMonths, 84)
  assert.equal(summary.depreciableAssets[0].residualValue, 16800)
  assert.equal(summary.depreciableAssets[0].depreciableCost, 67200)
  assert.equal(summary.depreciableAssets[0].accumulatedDepreciation, 19200)
  assert.equal(summary.totalResidualValue, 16800)
  assert.equal(summary.totalDepreciableCost, 67200)
})

test("rejects malformed depreciation policy settings", () => {
  const policyResult = parseDepreciationPolicySetting(
    JSON.stringify({
      defaultUsefulLifeMonths: 0,
      defaultResidualRate: 1,
      rules: [{ match: "", usefulLifeMonths: 0, residualRate: -1 }],
    })
  )

  assert.equal(policyResult.isValid, false)
  assert.ok(policyResult.errors.length >= 3)
})

test("builds depreciation period snapshot for accounting close", () => {
  const snapshot = buildDepreciationPeriodSnapshot({
    period: "2026-05",
    generatedAt: new Date("2026-05-20T12:00:00.000Z"),
    summary: buildDepreciationSummary(
      [
        {
          id: "asset-1",
          label: "SNI-EQU-24-0001 - Notebook",
          categoryCode: "Computer",
          categoryName: "Computer",
          ownershipType: "personal",
          purchasePrice: 120000,
          purchaseDate: new Date("2024-05-20T00:00:00.000Z"),
        },
      ],
      new Date("2026-05-20T00:00:00.000Z")
    ),
  })

  assert.equal(snapshot.period, "2026-05")
  assert.equal(snapshot.lockState, "draft")
  assert.equal(snapshot.assetCount, 1)
  assert.equal(snapshot.totals.netBookValue, 72000)
})
