import assert from "node:assert/strict"
import test from "node:test"

import {
  countsAfterSave,
  distribution,
  parseDataQualityTab,
  rulesChange,
} from "../src/lib/data-quality-page-model.ts"
import { defaultAssetDataQualityRules, type AssetDataQualityRule } from "../src/lib/data-quality-rules.ts"

// Page group 12 plan 3 task 1 (spec §7): the data-quality page model.

function withRule(rules: readonly AssetDataQualityRule[], key: AssetDataQualityRule["key"], patch: Partial<AssetDataQualityRule>) {
  return rules.map((rule) => (rule.key === key ? { ...rule, ...patch } : { ...rule }))
}

test("parses the tab with rules as default", () => {
  assert.equal(parseDataQualityTab(undefined), "rules")
  assert.equal(parseDataQualityTab(""), "rules")
  assert.equal(parseDataQualityTab("bogus"), "rules")
  assert.equal(parseDataQualityTab("rules"), "rules")
  assert.equal(parseDataQualityTab("review"), "review")
  assert.equal(parseDataQualityTab(["review", "rules"]), "review")
})

test("distribution counts enabled rules only and sums to the total", () => {
  const result = distribution(defaultAssetDataQualityRules, [
    { key: "missingCustodian", count: 6 },
    { key: "missingSerial", count: 0 },
    { key: "missingPhoto", count: 2 },
    { key: "missingDepartment", count: 50 }, // disabled
    { key: "warrantyExpiring", count: 2 },
  ])
  assert.equal(result.total, 10)
  assert.deepEqual(
    result.segments.map((segment) => segment.key),
    ["missingCustodian", "missingPhoto", "warrantyExpiring"],
  )
  assert.equal(result.segments.reduce((sum, segment) => sum + segment.count, 0), result.total)
  assert.equal(result.segments[0].share, 0.6)
  assert.equal(result.segments[1].share, 0.2)
  assert.ok(Math.abs(result.segments.reduce((sum, segment) => sum + segment.share, 0) - 1) < 1e-9)
})

test("no enabled rules gives an empty distribution", () => {
  const allOff = defaultAssetDataQualityRules.map((rule) => ({ ...rule, enabled: false }))
  const result = distribution(allOff, [{ key: "missingCustodian", count: 5 }])
  assert.equal(result.total, 0)
  assert.deepEqual(result.segments, [])
})

test("rulesChange counts switches and severities", () => {
  const saved = defaultAssetDataQualityRules
  const draft = withRule(withRule(saved, "missingDepartment", { enabled: true }), "missingSerial", { severity: "danger" })
  const change = rulesChange(saved, draft)
  assert.equal(change.changed, 2)
  assert.equal(change.enabledBefore, 4)
  assert.equal(change.enabledAfter, 5)
  assert.deepEqual(change.turnedOn, ["missingDepartment"])
  assert.deepEqual(change.turnedOff, [])
})

test("toggling back clears the change", () => {
  const saved = defaultAssetDataQualityRules
  const toggled = withRule(saved, "missingPhoto", { enabled: false })
  const back = withRule(toggled, "missingPhoto", { enabled: true })
  const change = rulesChange(saved, back)
  assert.equal(change.changed, 0)
  assert.deepEqual(change.turnedOn, [])
  assert.deepEqual(change.turnedOff, [])
  assert.equal(rulesChange(saved, toggled).turnedOff[0], "missingPhoto")
})

test("a rule switched on but not saved counts after save", () => {
  const saved = defaultAssetDataQualityRules
  const savedDepartment = saved.find((rule) => rule.key === "missingDepartment")
  const savedCustodian = saved.find((rule) => rule.key === "missingCustodian")
  assert.equal(countsAfterSave({ key: "missingDepartment", enabled: true, severity: "warning" }, savedDepartment), "afterSave")
  assert.equal(countsAfterSave({ key: "missingCustodian", enabled: true, severity: "warning" }, savedCustodian), "count")
  assert.equal(countsAfterSave({ key: "missingCustodian", enabled: false, severity: "warning" }, savedCustodian), "off")
  assert.equal(countsAfterSave({ key: "missingDepartment", enabled: true, severity: "warning" }, undefined), "afterSave")
})
