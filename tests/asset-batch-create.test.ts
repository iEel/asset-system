import assert from "node:assert/strict"
import test from "node:test"

import { assetBatchCreateSchema } from "../src/lib/validations/asset-batch.ts"

const validCommon = {
  name: "Desktop Computer Dell Optiplex",
  categoryId: "category-1",
  brandId: "brand-1",
  modelId: "model-1",
  licenseTotalSeats: "",
  licenseUsedSeats: "",
  licenseAssignedAssetId: "",
  companyId: "company-1",
  branchId: "branch-1",
  ownershipType: "stock",
  departmentId: "department-it",
  custodianId: "",
  homeLocationId: "location-store",
  currentLocationId: "location-store",
  statusId: "status-ready",
  conditionId: "condition-new",
  purchaseDate: "2026-05-26",
  purchasePrice: "25000",
  supplierId: "supplier-1",
  warrantyStartDate: "2026-05-26",
  warrantyEndDate: "2029-05-25",
  fixedAssetCode: "",
  poNumber: "PO-2026-001",
  invoiceNumber: "INV-2026-001",
  remark: "Batch purchase",
  customFieldsJson: "",
  isActive: true,
}

test("assetBatchCreateSchema accepts common asset data and row-specific serials", () => {
  const parsed = assetBatchCreateSchema.parse({
    common: validCommon,
    rows: [
      { clientId: "row-1", serialNumber: "SN-001", assetTag: "LEGACY-COM-001", custodianId: "", currentLocationId: "" },
      { clientId: "row-2", serialNumber: "SN-002", assetTag: "", custodianId: "", currentLocationId: "" },
    ],
    purchaseDocumentIds: ["doc-1"],
  })

  assert.equal(parsed.rows.length, 2)
  assert.equal(parsed.rows[0].assetTag, "LEGACY-COM-001")
  assert.equal(parsed.common.name, "Desktop Computer Dell Optiplex")
  assert.equal(parsed.common.currentLocationId, "location-store")
  assert.deepEqual(parsed.purchaseDocumentIds, ["doc-1"])
})

test("assetBatchCreateSchema rejects a single-row batch", () => {
  assert.throws(
    () =>
      assetBatchCreateSchema.parse({
        common: validCommon,
        rows: [{ clientId: "row-1", serialNumber: "SN-001" }],
      }),
    /Batch create requires at least 2 rows/
  )
})

test("assetBatchCreateSchema caps a batch at 100 rows", () => {
  assert.throws(
    () =>
      assetBatchCreateSchema.parse({
        common: validCommon,
        rows: Array.from({ length: 101 }, (_, index) => ({
          clientId: `row-${index + 1}`,
          serialNumber: `SN-${index + 1}`,
        })),
      }),
    /Batch create supports up to 100 rows/
  )
})
