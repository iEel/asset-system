import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  ASSET_MESSAGE_CODES,
  FIELD_IDS,
  emptyAssetFormValues,
  sectionOfField,
  validate,
  type AssetFormValues,
  type AssetRuleInput,
} from "../src/lib/asset-form-rules.ts"
import { changeFieldId, diffAssetFormValues, getAssetEditCorrection, sectionOfChange } from "../src/lib/asset-form-diff.ts"
import { registerEditNeedsReason } from "../src/lib/asset-register-edit.ts"

// The edit page's diff (group 4 plan 2 Task 8, spec §7.1, §7.3, §4 anti-goal): the fields the save writes, compared in
// their normal form, the automatic department fix marked, and the reason the room, holder or department needs.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")

const stored: AssetFormValues = {
  ...emptyAssetFormValues,
  id: "asset-1",
  assetTag: "AST-0001",
  name: "Notebook",
  categoryId: "cat-1",
  serialNumber: "S1",
  companyId: "co-1",
  branchId: "br-1",
  ownershipType: "personal",
  departmentId: "dept-old",
  custodianId: "emp-1",
  currentLocationId: "room-1",
  statusId: "st-1",
  conditionId: "cn-1",
  purchaseDate: "2026-01-05",
  purchasePrice: "1500.00",
  remark: null,
  customFieldsJson: '{"ram":"16GB","cpu":"i5"}',
}

test("a Serial change on a held บุคคล asset whose แผนก does not match: Serial and the automatic แผนก, no reason", () => {
  // The form opened with the holder's department (withDepartmentLock), then the person typed a new Serial.
  const values = { ...stored, serialNumber: "S2", departmentId: "dept-holder" }
  const correction = getAssetEditCorrection({ original: stored, values, departmentLocked: true })
  assert.deepEqual(correction, { departmentAutomatic: true, reasonNeeded: false })
  assert.deepEqual(diffAssetFormValues(stored, values, { departmentAutomatic: correction.departmentAutomatic }), [
    { field: "serialNumber", from: "S1", to: "S2", automatic: false },
    { field: "departmentId", from: "dept-old", to: "dept-holder", automatic: true },
  ])
  assert.equal(registerEditNeedsReason({ locationChanged: false, custodianChanged: false, departmentChanged: true, departmentAutomatic: true }), false)
})

test("a room, a holder or a แผนก the person changed needs the reason", () => {
  assert.deepEqual(getAssetEditCorrection({ original: stored, values: { ...stored, currentLocationId: "room-2" }, departmentLocked: true }), { departmentAutomatic: false, reasonNeeded: true })
  assert.deepEqual(getAssetEditCorrection({ original: stored, values: { ...stored, custodianId: "emp-2", departmentId: "dept-2" }, departmentLocked: true }), { departmentAutomatic: false, reasonNeeded: true })
  // A free type (ส่วนกลาง): the department picked by hand is a correction with a reason.
  const shared = { ...stored, ownershipType: "shared", custodianId: "" }
  assert.deepEqual(getAssetEditCorrection({ original: shared, values: { ...shared, departmentId: "dept-2" }, departmentLocked: false }), { departmentAutomatic: false, reasonNeeded: true })
  // A room diff is a row of the list too.
  assert.deepEqual(diffAssetFormValues(stored, { ...stored, currentLocationId: "room-2" }, { departmentAutomatic: false }), [
    { field: "currentLocationId", from: "room-1", to: "room-2", automatic: false },
  ])
})

test("a field changed back leaves the list, and empty text, null, number text and dates compare in their normal form", () => {
  assert.deepEqual(diffAssetFormValues(stored, { ...stored, name: "Notebook 2" }, { departmentAutomatic: false }).map((change) => change.field), ["name"])
  assert.deepEqual(diffAssetFormValues(stored, { ...stored, name: "Notebook" }, { departmentAutomatic: false }), [])
  assert.deepEqual(
    diffAssetFormValues(stored, { ...stored, remark: "", purchasePrice: "1500", purchaseDate: "2026-01-05", licenseTotalSeats: "" }, { departmentAutomatic: false }),
    [],
  )
  assert.deepEqual(diffAssetFormValues({ ...stored, licenseTotalSeats: 5 }, { ...stored, licenseTotalSeats: "5" }, { departmentAutomatic: false }), [])
  assert.deepEqual(diffAssetFormValues(stored, { ...stored, remark: "  new  " }, { departmentAutomatic: false }), [{ field: "remark", from: "", to: "new", automatic: false }])
})

test("every field the save writes is compared, in the form's order; custom fields by key; isActive never", () => {
  const changed: AssetFormValues = {
    ...stored,
    assetTag: "AST-0009",
    brandId: "b-2",
    modelId: "m-2",
    homeLocationId: "room-9",
    statusId: "st-2",
    conditionId: "cn-2",
    licenseTotalSeats: "10",
    licenseUsedSeats: "2",
    licenseAssignedAssetId: "asset-9",
    supplierId: "sup-2",
    warrantyEndDate: "2027-01-01",
    fixedAssetCode: "FA-1",
    poNumber: "PO-1",
    invoiceNumber: "INV-1",
    customFieldsJson: JSON.stringify({ ram: "32GB", cpu: "i5", gpu: "none" }, null, 2),
    remark: "note",
    isActive: false,
  }
  assert.deepEqual(diffAssetFormValues(stored, changed, { departmentAutomatic: false }).map((change) => change.field), [
    "assetTag",
    "brandId",
    "modelId",
    "homeLocationId",
    "statusId",
    "conditionId",
    "licenseTotalSeats",
    "licenseUsedSeats",
    "licenseAssignedAssetId",
    "supplierId",
    "warrantyEndDate",
    "fixedAssetCode",
    "poNumber",
    "invoiceNumber",
    "customFields.ram",
    "customFields.gpu",
    "remark",
  ])
  // The same keys re-serialised are no change; JSON that does not parse is one row of its own (the rows' JSON written over
  // a stored one they could not read, so the list stays truthful to the save).
  assert.deepEqual(diffAssetFormValues(stored, { ...stored, customFieldsJson: JSON.stringify({ ram: "16GB", cpu: "i5" }, null, 2) }, { departmentAutomatic: false }), [])
  assert.deepEqual(diffAssetFormValues(stored, { ...stored, customFieldsJson: "{bad" }, { departmentAutomatic: false }), [
    { field: "customFieldsJson", from: '{"ram":"16GB","cpu":"i5"}', to: "{bad", automatic: false },
  ])
})

test("each change knows its section and the id ไปที่ช่อง focuses", () => {
  assert.equal(sectionOfChange("brandId"), "main")
  assert.equal(sectionOfChange("supplierId"), "purchase")
  assert.equal(sectionOfChange("remark"), "other")
  assert.equal(sectionOfChange("licenseAssignedAssetId"), "license")
  assert.equal(sectionOfChange("purchaseDate"), "purchase")
  assert.equal(sectionOfChange("customFields.ram"), "customFields")
  // The stored JSON has no field since the raw JSON editor left (2026-11-02): its row opens the custom-fields section.
  assert.equal(sectionOfChange("customFieldsJson"), "customFields")
  assert.equal(changeFieldId("currentLocationId", []), "asset-current-location")
  assert.equal(changeFieldId("brandId", []), "asset-brand")
  assert.equal(changeFieldId("remark", []), "asset-remark")
  assert.equal(changeFieldId("supplierId", []), "asset-supplier")
  assert.equal(changeFieldId("modelId", []), "asset-model")
  assert.equal(changeFieldId("licenseAssignedAssetId", []), "asset-license-assigned-asset")
})

test("the reason is a field of the main card, after the room and status rows; validate() asks for it only when needed", () => {
  const keys = Object.keys(FIELD_IDS)
  assert.equal(FIELD_IDS.correctionReason, "asset-correction-reason")
  assert.equal(keys.indexOf("correctionReason"), keys.indexOf("conditionId") + 1)
  assert.equal(sectionOfField("correctionReason"), "main")
  assert.ok((ASSET_MESSAGE_CODES as readonly string[]).includes("correctionReasonRequired"))
  const base: AssetRuleInput = {
    values: stored,
    original: stored,
    duplicates: { assetTag: false, serialNumber: false },
    install: { parentAssetId: "", componentRole: "", slotNo: "", reason: "" },
    customFields: { definitions: [], valueOf: () => "" },
    purchaseDocument: { file: null, documentNo: "", totalAmount: "" },
  }
  assert.equal(validate(base).correctionReason, undefined)
  assert.equal(validate({ ...base, correction: { required: false, reason: "" } }).correctionReason, undefined)
  assert.equal(validate({ ...base, correction: { required: true, reason: "   " } }).correctionReason, "correctionReasonRequired")
  assert.equal(validate({ ...base, correction: { required: true, reason: "ห้องผิด" } }).correctionReason, undefined)
  assert.equal(validate({ ...base, correction: { required: true, reason: "x".repeat(501) } }).correctionReason, "tooLong")
})

test("the diff file is pure and client-safe: relative imports only", () => {
  const source = read("src/lib/asset-form-diff.ts")
  for (const match of source.matchAll(/from "([^"]+)"/g)) assert.match(match[1], /^\.\/[\w-]+\.ts$/, match[1])
  assert.doesNotMatch(source, /prisma|"use client"|next\//)
})
