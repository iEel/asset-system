import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDepreciationPolicyEditorState,
  buildDepreciationPolicyPreview,
  formatPurchasePriceInput,
  percentToRate,
  rateToPercent,
  sanitizePurchasePriceInput,
  sanitizeResidualPercentInput,
  sanitizeUsefulLifeMonthsInput,
  serializeDepreciationPolicyEditorState,
  type DepreciationPolicyEditorCategory,
} from "../src/lib/depreciation-policy-editor.ts"

const categories: DepreciationPolicyEditorCategory[] = [
  { id: "cat-notebook", code: "Notebook", name: "คอมพิวเตอร์พกพา" },
  { id: "cat-license", code: "License", name: "ลิขสิทธิ์" },
  { id: "cat-cctv", code: "CCTV", name: "ระบบกล้องวงจรปิด" },
]

test("builds editor groups from category-matched depreciation rules", () => {
  const state = buildDepreciationPolicyEditorState(
    {
      defaultUsefulLifeMonths: 60,
      defaultResidualRate: 0,
      rules: [
        { match: "License", usefulLifeMonths: 36, residualRate: 0 },
        { match: "CCTV", usefulLifeMonths: 84, residualRate: 0.1 },
      ],
    },
    categories
  )

  assert.equal(state.defaultUsefulLifeMonths, 60)
  assert.equal(state.defaultResidualRatePercent, 0)
  assert.deepEqual(state.groups.map((group) => group.categoryIds), [["cat-license"], ["cat-cctv"]])
  assert.deepEqual(state.unassignedCategoryIds, ["cat-notebook"])
})

test("matches category rules by exact lowercase code or name", () => {
  const state = buildDepreciationPolicyEditorState(
    {
      defaultUsefulLifeMonths: 60,
      defaultResidualRate: 0,
      rules: [
        { match: "license", usefulLifeMonths: 36, residualRate: 0 },
        { match: "ระบบกล้องวงจรปิด", usefulLifeMonths: 84, residualRate: 0.1 },
      ],
    },
    categories
  )

  assert.deepEqual(state.groups.map((group) => group.categoryIds), [["cat-license"], ["cat-cctv"]])
})

test("serializes editor groups back into the existing depreciation policy JSON shape", () => {
  const policy = serializeDepreciationPolicyEditorState(
    {
      defaultUsefulLifeMonths: 72,
      defaultResidualRatePercent: 5,
      groups: [
        {
          id: "group-license",
          name: "Software / License",
          usefulLifeMonths: 36,
          residualRatePercent: 0,
          categoryIds: ["cat-license"],
        },
        {
          id: "group-cctv",
          name: "CCTV policy",
          usefulLifeMonths: 84,
          residualRatePercent: 10,
          categoryIds: ["cat-cctv"],
        },
      ],
      legacyRules: [],
      unassignedCategoryIds: ["cat-notebook"],
    },
    categories
  )

  assert.deepEqual(policy, {
    defaultUsefulLifeMonths: 72,
    defaultResidualRate: 0.05,
    rules: [
      { match: "License", usefulLifeMonths: 36, residualRate: 0, label: "Software / License" },
      { match: "CCTV", usefulLifeMonths: 84, residualRate: 0.1, label: "CCTV policy" },
    ],
  })
})

test("keeps unmatched legacy text rules in serialized policy", () => {
  const state = buildDepreciationPolicyEditorState(
    {
      defaultUsefulLifeMonths: 60,
      defaultResidualRate: 0,
      rules: [{ match: "software_license", usefulLifeMonths: 36, residualRate: 0 }],
    },
    categories
  )

  assert.equal(state.groups.length, 0)
  assert.deepEqual(state.legacyRules, [{ match: "software_license", usefulLifeMonths: 36, residualRate: 0, sourceOrder: 0 }])

  const policy = serializeDepreciationPolicyEditorState(state, categories)
  assert.deepEqual(policy.rules, [{ match: "software_license", usefulLifeMonths: 36, residualRate: 0 }])
})

test("preserves metadata on unmatched legacy text rules", () => {
  const legacyRule = { match: "old", usefulLifeMonths: 36, residualRate: 0, label: "Old policy" }
  const state = buildDepreciationPolicyEditorState(
    {
      defaultUsefulLifeMonths: 60,
      defaultResidualRate: 0,
      rules: [legacyRule],
    },
    categories
  )

  assert.deepEqual(state.legacyRules, [{ ...legacyRule, sourceOrder: 0 }])

  const policy = serializeDepreciationPolicyEditorState(state, categories)
  assert.deepEqual(policy.rules, [legacyRule])
})

test("preserves original rule order when mixed legacy and matched rules round trip", () => {
  const policy = serializeDepreciationPolicyEditorState(
    buildDepreciationPolicyEditorState(
      {
        defaultUsefulLifeMonths: 60,
        defaultResidualRate: 0,
        rules: [
          { match: "soft", usefulLifeMonths: 24, residualRate: 0 },
          { match: "CCTV", usefulLifeMonths: 84, residualRate: 0.1 },
          { match: "old-cctv", usefulLifeMonths: 36, residualRate: 0 },
        ],
      },
      categories
    ),
    categories
  )

  assert.deepEqual(policy.rules, [
    { match: "soft", usefulLifeMonths: 24, residualRate: 0 },
    { match: "CCTV", usefulLifeMonths: 84, residualRate: 0.1, label: "CCTV policy" },
    { match: "old-cctv", usefulLifeMonths: 36, residualRate: 0 },
  ])
})

test("preserves metadata on matched category rules", () => {
  const metadataRule = {
    match: "CCTV",
    usefulLifeMonths: 84,
    residualRate: 0.1,
    label: "Security assets",
    source: "migration",
  }

  const policy = serializeDepreciationPolicyEditorState(
    buildDepreciationPolicyEditorState(
      {
        defaultUsefulLifeMonths: 60,
        defaultResidualRate: 0,
        rules: [metadataRule],
      },
      categories
    ),
    categories
  )

  assert.deepEqual(policy.rules, [
    {
      match: "CCTV",
      usefulLifeMonths: 84,
      residualRate: 0.1,
      label: "Security assets",
      source: "migration",
    },
  ])
})

test("converts residual rate values to editable percents and serialized rates", () => {
  assert.equal(rateToPercent(0.1), 10)
  assert.equal(percentToRate(10), 0.1)
})

test("sanitizes structured policy numeric input before serialization", () => {
  assert.equal(sanitizeUsefulLifeMonthsInput("", 60), 60)
  assert.equal(sanitizeUsefulLifeMonthsInput("0", 60), 1)
  assert.equal(sanitizeUsefulLifeMonthsInput("600.8", 60), 600)
  assert.equal(sanitizeUsefulLifeMonthsInput("abc", 60), 60)

  assert.equal(sanitizeResidualPercentInput("", 5), 5)
  assert.equal(sanitizeResidualPercentInput("-1", 5), 0)
  assert.equal(sanitizeResidualPercentInput("10.5", 5), 10.5)
  assert.equal(sanitizeResidualPercentInput("100", 5), 90)
  assert.equal(sanitizeResidualPercentInput("abc", 5), 5)
})

test("formats preview purchase price with thousands separators while preserving a numeric value", () => {
  assert.equal(sanitizePurchasePriceInput("120,000.50 บาท"), "120000.50")
  assert.equal(sanitizePurchasePriceInput("00120000"), "120000")
  assert.equal(sanitizePurchasePriceInput("."), "0.")
  assert.equal(formatPurchasePriceInput("120000"), "120,000")
  assert.equal(formatPurchasePriceInput("120000.50"), "120,000.50")
  assert.equal(formatPurchasePriceInput("0."), "0.")
})

test("preview uses purchase date as the depreciation start date", () => {
  const preview = buildDepreciationPolicyPreview({
    purchasePrice: 120000,
    purchaseDate: "2024-05-20",
    asOf: new Date("2026-05-20T00:00:00.000Z"),
    usefulLifeMonths: 60,
    residualRatePercent: 0,
  })

  assert.equal(preview.monthlyDepreciation, 2000)
  assert.equal(preview.ageMonths, 24)
  assert.equal(preview.accumulatedDepreciation, 48000)
  assert.equal(preview.netBookValue, 72000)
})
