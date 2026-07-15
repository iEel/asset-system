import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const item = {
  id: "item-1",
  assetId: "asset-1",
  assetTag: "AST-001",
  label: "AST-001 - Notebook",
  auditStatus: "pending",
  auditResult: null,
  expectedDepartmentId: "dep-1",
  expectedLocationId: "loc-1",
  expectedCustodianId: "emp-1",
  expectedConditionId: "condition-1",
  actualDepartmentId: null,
  actualLocationId: null,
  actualCustodianId: null,
  actualConditionId: null,
  ownershipType: "assigned",
  photoChecklist: [],
  components: [],
  installedIn: [],
}

test("audit scan extracted helpers preserve current value behavior", async () => {
  const helpers = await import("../src/components/audit/audit-scan-helpers.ts").catch(() => null)
  const types = await import("../src/components/audit/audit-scan-types.ts").catch(() => null)
  assert.ok(helpers, "audit-scan-helpers.ts must be importable")
  assert.ok(types, "audit-scan-types.ts must be importable")

  assert.equal(types.MAX_RECENT_AUDIT_SCANS, 8)
  assert.equal(helpers.getReadableAuditScanValue(item), "AST-001")
  assert.deepEqual(helpers.getEditableAuditValues(item), {
    actualLocationId: "loc-1",
    actualCustodianId: "emp-1",
    actualDepartmentId: "dep-1",
    actualConditionId: "condition-1",
  })
  assert.deepEqual(helpers.emptyToNull({ locationId: "", remark: "kept" }), {
    locationId: null,
    remark: "kept",
  })
})

test("audit scan extracted helpers preserve lookup normalization and bounded suggestions", async () => {
  const helpers = await import("../src/components/audit/audit-scan-helpers.ts").catch(() => null)
  assert.ok(helpers, "audit-scan-helpers.ts must be importable")

  assert.deepEqual(
    helpers.normalizeAuditLookupComponents([
      {
        assetId: "component-1",
        assetTag: "CMP-001",
        name: "RAM",
        componentRole: "memory",
        slotNo: "A1",
        auditItem: null,
      },
    ]),
    [
      {
        assetId: "component-1",
        assetTag: "CMP-001",
        name: "RAM",
        componentRole: "memory",
        slotNo: "A1",
        auditItemId: null,
        auditStatus: "out_of_round",
        auditResult: null,
      },
    ]
  )

  const maps = {
    locations: new Map([["loc-1", "Bangkok"]]),
    employees: new Map([["emp-1", "Somchai"]]),
    departments: new Map([["dep-1", "IT"]]),
    conditions: new Map<string, string>(),
  }
  assert.deepEqual(helpers.buildManualScanSuggestions("ast", [item], maps).map((row) => row.id), ["item-1"])
  assert.deepEqual(helpers.buildManualScanSuggestions("a", [item], maps), [])
})

test("audit scan controller imports extracted types and helpers instead of redeclaring them", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  assert.match(form, /from "\.\/audit-scan-types"/)
  assert.match(form, /from "\.\/audit-scan-helpers"/)
  assert.doesNotMatch(form, /^type AuditScanItem =/m)
  assert.doesNotMatch(form, /^function getReadableAuditScanValue/m)
  assert.doesNotMatch(form, /^function normalizeOutOfScopeAuditAsset/m)
})

test("audit scan presentation panels have a focused owner outside the controller", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  assert.ok(existsSync("src/components/audit/audit-scan-panels.tsx"), "audit-scan-panels.tsx must exist")
  const panels = readFileSync("src/components/audit/audit-scan-panels.tsx", "utf8")

  for (const component of [
    "ScanResultPanel",
    "RecentScansPanel",
    "AuditComponentPanel",
    "ManualScanSuggestionList",
    "PendingQueuePanel",
    "AssetFallbackPicker",
    "AuditQrScannerOverlay",
    "OptionList",
    "Field",
    "Select",
  ]) {
    assert.match(panels, new RegExp(`export function ${component}\\b`))
    assert.doesNotMatch(form, new RegExp(`^function ${component}\\b`, "m"))
  }

  assert.match(form, /from "\.\/audit-scan-panels"/)
  assert.doesNotMatch(panels, /\bfetch\(/)
  assert.doesNotMatch(panels, /localStorage/)
  assert.doesNotMatch(panels, /startNativeAssetQrScanner/)
})
