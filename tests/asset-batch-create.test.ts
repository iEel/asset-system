import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetBatchPreviewRows,
  buildAssetBatchDuplicateCheckSummary,
  buildAssetBatchDuplicateMessage,
  buildAssetBatchCreateItems,
  createAssetBatchRows,
  defaultAssetBatchRowCount,
  findDuplicateBatchValues,
  normalizeAssetBatchRowCount,
  parseBatchSerialPaste,
  summarizeAssetBatchCreateResult,
} from "../src/lib/asset-batch-create.ts"
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

test("buildAssetBatchCreateItems overlays row values on common asset data", () => {
  const items = buildAssetBatchCreateItems({
    common: validCommon,
    rows: [
      {
        clientId: "row-1",
        serialNumber: "SN-001",
        assetTag: "SNI-COM-26-0001",
        custodianId: "emp-1",
      },
      {
        clientId: "row-2",
        serialNumber: "SN-002",
        assetTag: "",
        custodianId: "",
        currentLocationId: "",
        remark: "Keep in IT stock",
      },
    ],
    generatedAssetTags: ["SNI-COM-26-0002"],
  })

  assert.equal(items[0].assetTag, "SNI-COM-26-0001")
  assert.equal(items[0].serialNumber, "SN-001")
  assert.equal(items[0].custodianId, "emp-1")
  assert.equal(items[0].currentLocationId, "location-store")
  assert.equal(items[1].assetTag, "SNI-COM-26-0002")
  assert.equal(items[1].currentLocationId, "location-store")
  assert.equal(items[1].remark, "Keep in IT stock")
})

test("buildAssetBatchCreateItems always uses shared location and fixed asset code", () => {
  const items = buildAssetBatchCreateItems({
    common: { ...validCommon, fixedAssetCode: "FA-SHARED" },
    rows: [
      {
        clientId: "row-1",
        serialNumber: "SN-001",
        assetTag: "SNI-COM-26-0001",
        currentLocationId: "location-row-ignored",
        fixedAssetCode: "FA-ROW-IGNORED",
      },
      {
        clientId: "row-2",
        serialNumber: "SN-002",
        assetTag: "SNI-COM-26-0002",
      },
    ],
    generatedAssetTags: [],
  })

  assert.equal(items[0].currentLocationId, "location-store")
  assert.equal(items[0].fixedAssetCode, "FA-SHARED")
  assert.equal(items[1].currentLocationId, "location-store")
  assert.equal(items[1].fixedAssetCode, "FA-SHARED")
})

test("createAssetBatchRows starts with two editable rows and omits shared-only fields", () => {
  assert.equal(defaultAssetBatchRowCount, 2)
  assert.deepEqual(createAssetBatchRows(undefined, "qa-row"), [
    { clientId: "qa-row-1", serialNumber: "", assetTag: "", custodianId: "", departmentId: "", remark: "" },
    { clientId: "qa-row-2", serialNumber: "", assetTag: "", custodianId: "", departmentId: "", remark: "" },
  ])
})

test("normalizeAssetBatchRowCount keeps batch row count in supported range", () => {
  assert.equal(normalizeAssetBatchRowCount(1), 2)
  assert.equal(normalizeAssetBatchRowCount(8), 8)
  assert.equal(normalizeAssetBatchRowCount(101), 100)
  assert.equal(normalizeAssetBatchRowCount(Number.NaN), defaultAssetBatchRowCount)
})

test("findDuplicateBatchValues returns normalized duplicate serials and asset tags", () => {
  assert.deepEqual(
    findDuplicateBatchValues([
      { clientId: "row-1", serialNumber: "SN-001", assetTag: "TAG-001" },
      { clientId: "row-2", serialNumber: "sn-001", assetTag: "tag-001" },
      { clientId: "row-3", serialNumber: "SN-003", assetTag: "" },
    ]),
    { serialNumbers: ["sn-001"], assetTags: ["tag-001"] }
  )
})

test("summarizeAssetBatchCreateResult returns ids and tags for next actions", () => {
  assert.deepEqual(
    summarizeAssetBatchCreateResult([
      { id: "asset-1", assetTag: "TAG-001", name: "Desktop" },
      { id: "asset-2", assetTag: "TAG-002", name: "Desktop" },
    ]),
    {
      created: 2,
      assets: [
        { id: "asset-1", assetTag: "TAG-001", name: "Desktop" },
        { id: "asset-2", assetTag: "TAG-002", name: "Desktop" },
      ],
      assetIds: ["asset-1", "asset-2"],
    }
  )
})

test("buildAssetBatchDuplicateMessage explains duplicate fields clearly", () => {
  assert.equal(
    buildAssetBatchDuplicateMessage({
      duplicateBatchSerials: ["sn-001"],
      duplicateBatchAssetTags: [],
      existingSerials: ["sn-009"],
      existingAssetTags: ["tag-010"],
    }),
    "พบข้อมูลซ้ำ: Serial Number ซ้ำในชุดนี้ sn-001; Serial Number ซ้ำกับข้อมูลเดิม sn-009; Asset Tag ซ้ำกับข้อมูลเดิม tag-010"
  )
})

test("buildAssetBatchPreviewRows marks manual and auto-generated asset tag sources", () => {
  assert.deepEqual(
    buildAssetBatchPreviewRows([
      { clientId: "row-1", serialNumber: "SN-001", assetTag: "SNI-EQU-16-0031", custodianId: "emp-1", remark: "" },
      { clientId: "row-2", serialNumber: "", assetTag: "", custodianId: "", remark: "Keep spare" },
    ]),
    [
      { rowNo: 1, serialNumber: "SN-001", assetTag: "SNI-EQU-16-0031", assetTagSource: "manual", custodianId: "emp-1", remark: "" },
      { rowNo: 2, serialNumber: "", assetTag: "", assetTagSource: "auto", custodianId: "", remark: "Keep spare" },
    ]
  )
})

test("buildAssetBatchDuplicateCheckSummary reports a clean duplicate pre-check", () => {
  assert.deepEqual(
    buildAssetBatchDuplicateCheckSummary({
      duplicateBatchSerials: [],
      duplicateBatchAssetTags: [],
      existingSerials: [],
      existingAssetTags: [],
    }),
    { ok: true, message: "", duplicateCount: 0 }
  )
})

test("buildAssetBatchDuplicateCheckSummary reports duplicate count and message", () => {
  assert.deepEqual(
    buildAssetBatchDuplicateCheckSummary({
      duplicateBatchSerials: ["sn-001"],
      duplicateBatchAssetTags: ["tag-001"],
      existingSerials: ["sn-009"],
      existingAssetTags: [],
    }),
    {
      ok: false,
      message: "พบข้อมูลซ้ำ: Serial Number ซ้ำในชุดนี้ sn-001; Asset Tag ซ้ำในชุดนี้ tag-001; Serial Number ซ้ำกับข้อมูลเดิม sn-009",
      duplicateCount: 3,
    }
  )
})

test("parseBatchSerialPaste reads serials from Excel rows", () => {
  assert.deepEqual(parseBatchSerialPaste("SN-001\r\nSN-002\r\nSN-003"), ["SN-001", "SN-002", "SN-003"])
})

test("parseBatchSerialPaste reads the first column from tab-separated rows", () => {
  assert.deepEqual(parseBatchSerialPaste("SN-001\tDell\r\nSN-002\tHP"), ["SN-001", "SN-002"])
})

test("parseBatchSerialPaste removes empty rows and caps the result", () => {
  assert.deepEqual(parseBatchSerialPaste("SN-001\n\nSN-002\nSN-003", 2), ["SN-001", "SN-002"])
})
