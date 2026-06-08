import assert from "node:assert/strict"
import test from "node:test"

import { buildAssetCloneFormState } from "../src/lib/asset-clone.ts"

test("builds a clone draft while clearing unique asset identity", () => {
  const state = buildAssetCloneFormState(
    {
      id: "asset-1",
      assetTag: "SNI-EQU-26-0001",
      name: "Notebook Dell Latitude 5440",
      categoryId: "category-1",
      brandId: "brand-1",
      modelId: "model-1",
      serialNumber: "SN-ORIGINAL",
      licenseTotalSeats: 10,
      licenseUsedSeats: 2,
      licenseAssignedAssetId: "assigned-asset-1",
      companyId: "company-1",
      branchId: "branch-1",
      ownershipType: "personal",
      departmentId: "department-1",
      custodianId: "employee-1",
      homeLocationId: "location-home",
      currentLocationId: "location-current",
      statusId: "maintenance-status",
      conditionId: "condition-1",
      purchaseDate: new Date("2026-01-15T00:00:00.000Z"),
      purchasePrice: { toString: () => "120000.00" },
      supplierId: "supplier-1",
      warrantyStartDate: new Date("2026-01-15T00:00:00.000Z"),
      warrantyEndDate: new Date("2029-01-14T00:00:00.000Z"),
      fixedAssetCode: "FA-ORIGINAL",
      poNumber: "PO-001",
      invoiceNumber: "INV-001",
      remark: "Shared purchasing remark",
      customFieldsJson: "{\"CPU\":\"Intel\"}",
      isActive: false,
      purchaseDocumentLinks: [{ purchaseDocumentId: "doc-1" }, { purchaseDocumentId: "doc-2" }],
    },
    { readyStatusId: "ready-status" }
  )

  assert.deepEqual(state.cloneSource, {
    id: "asset-1",
    assetTag: "SNI-EQU-26-0001",
    name: "Notebook Dell Latitude 5440",
  })
  assert.equal(state.asset.id, undefined)
  assert.equal(state.asset.assetTag, "")
  assert.equal(state.asset.serialNumber, "")
  assert.equal(state.asset.fixedAssetCode, "")
  assert.equal(state.asset.statusId, "ready-status")
  assert.equal(state.asset.isActive, true)
  assert.equal(state.asset.purchaseDate, "2026-01-15")
  assert.equal(state.asset.purchasePrice, "120000.00")
  assert.deepEqual(state.asset.purchaseDocumentIds, ["doc-1", "doc-2"])
  assert.equal(state.asset.custodianId, "employee-1")
  assert.equal(state.asset.currentLocationId, "location-current")
})

test("falls back to the source status when no Ready status is available", () => {
  const state = buildAssetCloneFormState(
    {
      id: "asset-2",
      assetTag: "SNI-EQU-26-0002",
      name: "UPS APC",
      categoryId: "category-2",
      brandId: null,
      modelId: null,
      serialNumber: null,
      licenseTotalSeats: null,
      licenseUsedSeats: null,
      licenseAssignedAssetId: null,
      companyId: "company-1",
      branchId: "branch-1",
      ownershipType: "shared",
      departmentId: null,
      custodianId: null,
      homeLocationId: null,
      currentLocationId: "location-current",
      statusId: "source-status",
      conditionId: "condition-1",
      purchaseDate: null,
      purchasePrice: null,
      supplierId: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
      fixedAssetCode: null,
      poNumber: null,
      invoiceNumber: null,
      remark: null,
      customFieldsJson: null,
      isActive: true,
      purchaseDocumentLinks: [],
    },
    {}
  )

  assert.equal(state.asset.statusId, "source-status")
})
