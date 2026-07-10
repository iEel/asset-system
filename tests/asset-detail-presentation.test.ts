import assert from "node:assert/strict"
import test from "node:test"

import { resolveAssetResponsibilityValue } from "../src/lib/asset-detail-presentation.ts"

test("responsibility uses the custodian for personal assets", () => {
  assert.equal(
    resolveAssetResponsibilityValue({
      ownershipType: "personal",
      custodianLabel: "EMP-01 - Somchai",
      departmentLabel: "IT - Information Technology",
      currentLocationLabel: "HQ - Floor 2",
      installedParentLabel: null,
      licenseAssignedLabel: null,
    }),
    "EMP-01 - Somchai",
  )
})

test("responsibility uses the department for shared and stock assets", () => {
  for (const ownershipType of ["shared", "stock"] as const) {
    assert.equal(
      resolveAssetResponsibilityValue({
        ownershipType,
        custodianLabel: "EMP-01 - Somchai",
        departmentLabel: "IT - Information Technology",
        currentLocationLabel: "HQ - Floor 2",
        installedParentLabel: null,
        licenseAssignedLabel: null,
      }),
      "IT - Information Technology",
    )
  }
})

test("responsibility falls back to location when shared or stock asset has no department", () => {
  assert.equal(
    resolveAssetResponsibilityValue({
      ownershipType: "shared",
      custodianLabel: null,
      departmentLabel: null,
      currentLocationLabel: "HQ - Floor 2",
      installedParentLabel: null,
      licenseAssignedLabel: null,
    }),
    "HQ - Floor 2",
  )
})

test("responsibility uses parent asset for component assets", () => {
  assert.equal(
    resolveAssetResponsibilityValue({
      ownershipType: "component",
      custodianLabel: null,
      departmentLabel: null,
      currentLocationLabel: "HQ - Floor 2",
      installedParentLabel: "IT-NB-0001 - Lenovo ThinkPad",
      licenseAssignedLabel: null,
    }),
    "IT-NB-0001 - Lenovo ThinkPad",
  )
})

test("responsibility uses assigned asset for software licenses", () => {
  assert.equal(
    resolveAssetResponsibilityValue({
      ownershipType: "software_license",
      custodianLabel: null,
      departmentLabel: null,
      currentLocationLabel: "HQ - Floor 2",
      installedParentLabel: null,
      licenseAssignedLabel: "IT-NB-0001 - Lenovo ThinkPad",
    }),
    "IT-NB-0001 - Lenovo ThinkPad",
  )
})
