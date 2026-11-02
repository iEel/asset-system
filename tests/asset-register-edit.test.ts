import assert from "node:assert/strict"
import test from "node:test"
import {
  REGISTER_FIELD_CORRECTION_FIELDS,
  buildFieldCorrectionSnapshot,
  planRegisterEditMovements,
  registerEditNeedsReason,
  type RegisterEditValues,
} from "../src/lib/asset-register-edit.ts"

const existing: RegisterEditValues & { id: string } = {
  id: "asset-1",
  assetTag: "IT-1",
  name: "Laptop",
  serialNumber: "SN-1",
  categoryId: "cat-1",
  brandId: "brand-1",
  modelId: null,
  companyId: "company-1",
  branchId: "branch-1",
  ownershipType: "personal",
  purchaseDate: new Date("2026-01-05T00:00:00.000Z"),
  purchasePrice: "15000.00",
  warrantyStartDate: null,
  warrantyEndDate: null,
  poNumber: null,
  invoiceNumber: "",
  currentLocationId: "loc-1",
  custodianId: "emp-1",
  departmentId: "dept-old",
  statusId: "status-ready",
  conditionId: "cond-good",
  licenseTotalSeats: null,
  licenseUsedSeats: null,
  licenseAssignedAssetId: null,
}

const plan = (next: Partial<RegisterEditValues>, extra: Partial<Parameters<typeof planRegisterEditMovements>[0]> = {}) =>
  planRegisterEditMovements({
    existing,
    next: { ...existing, ...next },
    nextDepartmentId: existing.departmentId,
    departmentAutomatic: false,
    correctionReason: null,
    referenceId: "ref-1",
    performedBy: "user-1",
    ...extra,
  })

const shape = (rows: ReturnType<typeof planRegisterEditMovements>) =>
  rows.map((row) => [row.movementType, row.fromValue, row.toValue, row.reason])

test("the 14 field-correction columns are the history's snapshot keys (P2-R5)", () => {
  assert.deepEqual([...REGISTER_FIELD_CORRECTION_FIELDS], [
    "name", "serialNumber", "categoryId", "brandId", "modelId", "companyId", "branchId", "ownershipType",
    "purchaseDate", "purchasePrice", "warrantyStartDate", "warrantyEndDate", "poNumber", "invoiceNumber",
  ])
})

test("a Serial-only save on a held บุคคล asset with a stale department writes the automatic department fix (no reason) and one field correction; no reason needed", () => {
  const rows = plan({ serialNumber: "SN-2" }, { nextDepartmentId: "dept-holder", departmentAutomatic: true })
  assert.deepEqual(shape(rows), [
    ["register_department_correction", "dept-old", "dept-holder", null],
    ["register_field_correction", JSON.stringify({ serialNumber: "SN-1" }), JSON.stringify({ serialNumber: "SN-2" }), "Asset register update"],
  ])
  assert.equal(registerEditNeedsReason({ locationChanged: false, custodianChanged: false, departmentChanged: true, departmentAutomatic: true }), false)
})

test("a room change writes register_location_correction with the reason, and needs one", () => {
  const rows = plan({ currentLocationId: "loc-2" }, { correctionReason: "บันทึกห้องผิด" })
  assert.deepEqual(shape(rows), [["register_location_correction", "loc-1", "loc-2", "บันทึกห้องผิด"]])
  assert.equal(registerEditNeedsReason({ locationChanged: true, custodianChanged: false, departmentChanged: false, departmentAutomatic: false }), true)
})

test("a holder change writes the custodian and the department corrections with the reason", () => {
  const rows = plan({ custodianId: "emp-2" }, { nextDepartmentId: "dept-2", correctionReason: "ผิดคน" })
  assert.deepEqual(shape(rows), [
    ["register_custodian_correction", "emp-1", "emp-2", "ผิดคน"],
    ["register_department_correction", "dept-old", "dept-2", "ผิดคน"],
  ])
  assert.equal(registerEditNeedsReason({ locationChanged: false, custodianChanged: true, departmentChanged: true, departmentAutomatic: false }), true)
  assert.equal(registerEditNeedsReason({ locationChanged: false, custodianChanged: false, departmentChanged: true, departmentAutomatic: false }), true, "a department chosen by the user")
  assert.equal(registerEditNeedsReason({ locationChanged: false, custodianChanged: false, departmentChanged: false, departmentAutomatic: false }), false)
})

test("ownership shared → personal is one field correction, never ownership_type_change", () => {
  const rows = planRegisterEditMovements({
    existing: { ...existing, ownershipType: "shared" },
    next: { ...existing, ownershipType: "personal" },
    nextDepartmentId: existing.departmentId,
    departmentAutomatic: false,
    correctionReason: null,
    referenceId: "ref-1",
    performedBy: "user-1",
  })
  assert.deepEqual(shape(rows), [["register_field_correction", '{"ownershipType":"shared"}', '{"ownershipType":"personal"}', "Asset register update"]])
  assert.equal(rows.some((row) => row.movementType === "ownership_type_change"), false)
})

test("a tag change writes asset_tag_change with the plain tags", () => {
  assert.deepEqual(shape(plan({ assetTag: "IT-2" })), [["asset_tag_change", "IT-1", "IT-2", "Asset register update"]])
})

test("a 200-character name keeps the snapshot within 500 characters and valid JSON (Review Focus 4)", () => {
  const name = "ก\"\\".repeat(67).slice(0, 200)
  const rows = plan({ name })
  assert.equal(rows.length, 1)
  for (const value of [rows[0].fromValue, rows[0].toValue]) {
    assert.ok(value && value.length <= 500, String(value?.length))
    assert.ok(JSON.parse(value!).name !== undefined)
  }
  const long = buildFieldCorrectionSnapshot("name", "x".repeat(2000))
  assert.ok(long.length <= 500)
  assert.equal(JSON.parse(long).name, "x".repeat(long.length - '{"name":""}'.length))
  const quoted = buildFieldCorrectionSnapshot("name", "\"".repeat(400))
  assert.ok(quoted.length <= 500, String(quoted.length))
  assert.equal(typeof JSON.parse(quoted).name, "string")
  assert.equal(buildFieldCorrectionSnapshot("poNumber", null), '{"poNumber":null}')
})

test("unchanged values write nothing: null and empty text, a date by its day, a price by its number", () => {
  assert.deepEqual(plan({
    invoiceNumber: null,
    poNumber: "",
    purchaseDate: "2026-01-05",
    purchasePrice: 15000,
  }), [])
  assert.deepEqual(shape(plan({ purchaseDate: new Date("2026-02-01T00:00:00.000Z"), purchasePrice: 15000.5 })), [
    ["register_field_correction", '{"purchaseDate":"2026-01-05"}', '{"purchaseDate":"2026-02-01"}', "Asset register update"],
    ["register_field_correction", '{"purchasePrice":"15000"}', '{"purchasePrice":"15000.5"}', "Asset register update"],
  ])
})

test("status, condition and the License fields keep their own types", () => {
  assert.deepEqual(plan({ statusId: "status-in-use", conditionId: "cond-fair", licenseTotalSeats: 5 }).map((row) => row.movementType), [
    "license_total_seats_change",
    "status_change",
    "condition_change",
  ])
})

test("every row of one save shares its reference, referenceType register_edit, the asset and who saved", () => {
  const rows = plan(
    { currentLocationId: "loc-2", custodianId: "emp-2", name: "Laptop 2", assetTag: "IT-9", statusId: "status-in-use" },
    { nextDepartmentId: "dept-2", correctionReason: "แก้" },
  )
  assert.equal(rows.length, 6)
  for (const row of rows) {
    assert.equal(row.referenceId, "ref-1")
    assert.equal(row.referenceType, "register_edit")
    assert.equal(row.assetId, "asset-1")
    assert.equal(row.performedBy, "user-1")
  }
})

test("the missing reason reads its own words in the toast (P2-R4)", async () => {
  const { readFileSync } = await import("node:fs")
  const { getApiErrorKey } = await import("../src/lib/api-error-catalog.ts")
  assert.equal(getApiErrorKey("Correction reason is required"), "correctionReasonRequired")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
  assert.equal(words("th").apiErrors.correctionReasonRequired, "ระบุเหตุผลที่แก้")
  assert.equal(words("en").apiErrors.correctionReasonRequired, "Enter the reason for the correction")
  assert.equal(words("th").asset.transactionReasonOpenCheckoutCorrection, "มีการส่งมอบค้างอยู่ รับคืนหรือยกเลิกใบส่งมอบก่อนจึงแก้ได้")
  assert.equal(words("en").asset.transactionReasonOpenCheckoutCorrection, "An open handover: return it or cancel the handover first")
})
