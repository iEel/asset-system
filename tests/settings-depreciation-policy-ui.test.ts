import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("settings form exposes depreciation policy builder labels", () => {
  const form = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")
  const settingsPage = readFileSync("src/app/[locale]/(dashboard)/admin/settings/page.tsx", "utf8")
  const builder = readFileSync("src/components/admin/depreciation-policy-builder.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /depreciationPolicyBuilderTitle/)
  assert.match(settingsPage, /depreciationPolicyBuilderTitle/)
  assert.match(builder, /depreciationPolicyBuilderTitle/)

  for (const messages of [th.systemSettingsPage, en.systemSettingsPage]) {
    assert.equal(typeof messages.depreciationPolicyBuilderTitle, "string")
    assert.equal(typeof messages.depreciationDefaultUsefulLifeMonths, "string")
    assert.equal(typeof messages.depreciationDefaultResidualPercent, "string")
    assert.equal(typeof messages.depreciationStartBasisPurchaseDate, "string")
    assert.equal(typeof messages.depreciationPolicyGroups, "string")
    assert.equal(typeof messages.depreciationPreviewTitle, "string")
    assert.equal(typeof messages.depreciationAdvancedJson, "string")
  }
})

test("depreciation policy builder uses adapter helpers and exposes required sections", () => {
  const builder = readFileSync("src/components/admin/depreciation-policy-builder.tsx", "utf8")

  assert.match(builder, /"use client"/)
  assert.match(builder, /isPolicyJsonValid/)
  assert.match(builder, /buildDepreciationPolicyEditorState/)
  assert.match(builder, /serializeDepreciationPolicyEditorState/)
  assert.match(builder, /buildDepreciationPolicyPreview/)
  assert.match(builder, /sanitizeUsefulLifeMonthsInput/)
  assert.match(builder, /sanitizeResidualPercentInput/)
  assert.match(builder, /sanitizePurchasePriceInput/)
  assert.match(builder, /formatPurchasePriceInput/)
  assert.match(builder, /labels\.depreciationMethodStraightLine/)
  assert.match(builder, /labels\.depreciationStartBasisPurchaseDate/)
  assert.match(builder, /labels\.depreciationDefaultUsefulLifeMonths/)
  assert.match(builder, /labels\.depreciationDefaultResidualPercent/)
  assert.match(builder, /labels\.depreciationPolicyGroups/)
  assert.match(builder, /labels\.depreciationPolicyGroupName/)
  assert.match(builder, /labels\.depreciationAvailableCategories/)
  assert.match(builder, /labels\.depreciationSelectedCategories/)
  assert.match(builder, /labels\.depreciationSearchCategories/)
  assert.match(builder, /labels\.depreciationAssignedCategoryConflict/)
  assert.match(builder, /labels\.depreciationPreviewTitle/)
  assert.match(builder, /type="text"[\s\S]*inputMode="decimal"[\s\S]*formatPurchasePriceInput\(previewPurchasePrice\)/)
  assert.match(builder, /labels\.depreciationLegacyRules/)
  assert.match(builder, /<details[\s\S]*labels\.depreciationAdvancedJson/)
  assert.match(builder, /<textarea[\s\S]*onPolicyJsonChange/)
  assert.match(builder, /if \(!isPolicyJsonValid\) return/)
  assert.match(builder, /disabled=\{!isPolicyJsonValid\}/)
  assert.match(builder, /disabled=\{!isPolicyJsonValid \|\|/)
  assert.match(builder, /disabled=\{disabled \|\| isConflict\}/)
})

test("settings form renders depreciation builder instead of primary json textarea", () => {
  const form = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")

  assert.match(form, /import \{ DepreciationPolicyBuilder \} from "@\/components\/admin\/depreciation-policy-builder"/)
  assert.match(form, /<DepreciationPolicyBuilder/)
  assert.match(form, /categories=\{categories\}/)
  assert.match(form, /policyJson=\{getValue\(depreciationPolicySettingKey\)\}/)
  assert.match(form, /labels=\{labels\}/)
  assert.match(form, /onPolicyJsonChange=\{\(value\) => setValue\(depreciationPolicySettingKey, value\)\}/)
  assert.match(form, /hasInvalidDepreciationPolicy[\s\S]*ValidationMessage/)
  assert.doesNotMatch(form, /id="accounting-depreciation-policy"[\s\S]{0,200}rows=\{10\}/)
})

test("settings form blocks invalid depreciation policy before saving", () => {
  const form = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")
  const handleSubmit = form.slice(form.indexOf("async function handleSubmit"), form.indexOf("setSaving(true)"))

  assert.match(handleSubmit, /if \(hasInvalidDepreciationPolicy\) \{[\s\S]*toast\.error\(labels\.invalidAccountingDepreciationPolicy\)[\s\S]*return[\s\S]*\}/)
})

test("depreciation policy builder sanitizes structured numeric policy inputs", () => {
  const builder = readFileSync("src/components/admin/depreciation-policy-builder.tsx", "utf8")

  assert.match(builder, /defaultUsefulLifeMonths: sanitizeUsefulLifeMonthsInput\(event\.target\.value, state\.defaultUsefulLifeMonths\)/)
  assert.match(builder, /defaultResidualRatePercent: sanitizeResidualPercentInput\(event\.target\.value, state\.defaultResidualRatePercent\)/)
  assert.match(builder, /usefulLifeMonths: sanitizeUsefulLifeMonthsInput\(event\.target\.value, activeGroup\.usefulLifeMonths\)/)
  assert.match(builder, /residualRatePercent: sanitizeResidualPercentInput\(event\.target\.value, activeGroup\.residualRatePercent\)/)
  assert.doesNotMatch(builder, /defaultUsefulLifeMonths: Number\(event\.target\.value\)/)
  assert.doesNotMatch(builder, /defaultResidualRatePercent: Number\(event\.target\.value\)/)
  assert.doesNotMatch(builder, /usefulLifeMonths: Number\(event\.target\.value\)/)
  assert.doesNotMatch(builder, /residualRatePercent: Number\(event\.target\.value\)/)
})
