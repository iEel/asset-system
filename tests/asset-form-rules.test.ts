import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  changeOwnershipType, countRequiredFilled, emptyAssetFormValues, FIELD_IDS, getAssetFormDepartmentLock, getRequiredAssetFields, isCustodyFrozen, sectionOfField, validate,
  type AssetField, type AssetFormValues,
} from "../src/lib/asset-form-rules.ts"
import { assetOwnershipTypes } from "../src/lib/asset-ownership.ts"

// The asset form's pure rules (group 4 plan 2 Task 5, spec §8): the required list behind the counter and validate(),
// the section each field sits in, and the file's purity (tests and client code import it).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")

const noExtras = {
  duplicates: { assetTag: false, serialNumber: false },
  install: { parentAssetId: "", componentRole: "", slotNo: "", reason: "" },
  customFields: { definitions: [], valueOf: () => "" },
  purchaseDocument: { file: null, documentNo: "", totalAmount: "" },
}

test("the required fields: 8 for บุคคล and License, 9 with the department for ส่วนกลาง, Stock and ส่วนควบ (spec §8)", () => {
  const eight = ["name", "categoryId", "ownershipType", "companyId", "branchId", "currentLocationId", "statusId", "conditionId"]
  const nine = ["name", "categoryId", "ownershipType", "companyId", "branchId", "departmentId", "currentLocationId", "statusId", "conditionId"]
  assert.equal(getRequiredAssetFields("personal").length, 8)
  assert.deepEqual(getRequiredAssetFields("personal"), eight)
  assert.deepEqual(getRequiredAssetFields("software_license"), eight)
  assert.equal(getRequiredAssetFields("stock").length, 9)
  assert.ok(getRequiredAssetFields("stock").includes("departmentId"))
  for (const ownership of ["shared", "stock", "component"] as const) assert.deepEqual(getRequiredAssetFields(ownership), nine, ownership)
})

test("the counter on an empty บุคคล form: the ownership type is filled, the rest are missing in visual order", () => {
  const empty: AssetFormValues = { ...emptyAssetFormValues }
  const counted = countRequiredFilled(empty, "personal")
  assert.deepEqual(counted, {
    filled: 1,
    total: 8,
    missing: ["name", "categoryId", "companyId", "branchId", "currentLocationId", "statusId", "conditionId"],
  })
  // Visual order is FIELD_IDS' order.
  const order = Object.keys(FIELD_IDS)
  assert.deepEqual([...counted.missing].sort((a, b) => order.indexOf(a) - order.indexOf(b)), counted.missing)
  // A department set (a locked one is set to the holder's) counts as filled; blank text does not.
  const stock = countRequiredFilled({ ...empty, ownershipType: "stock", name: "  ", departmentId: "dept-1" }, "stock")
  assert.equal(stock.total, 9)
  assert.equal(stock.filled, 2)
  assert.ok(stock.missing.includes("name"))
  assert.ok(!stock.missing.includes("departmentId"))
})

test("validate() asks exactly the required list on an empty form, for every ownership type (the counter cannot drift)", () => {
  for (const ownership of assetOwnershipTypes) {
    const values: AssetFormValues = { ...emptyAssetFormValues, ownershipType: ownership, currentLocationId: "", name: "" }
    const errors = validate({ values, ...noExtras })
    const requiredErrors = (Object.keys(errors) as AssetField[]).filter((key) => errors[key] === "required")
    assert.deepEqual(requiredErrors, countRequiredFilled(values, ownership).missing, ownership)
  }
})

test("each field has its section: the folded ones open on an error (Task 6a reveals them)", () => {
  const expected: Record<string, string> = {
    assetTag: "main", name: "main", categoryId: "main", serialNumber: "main", ownershipType: "main", companyId: "main", branchId: "main",
    departmentId: "main", custodianId: "main", homeLocationId: "main", currentLocationId: "main", statusId: "main", conditionId: "main",
    // Task 8: the edit page's reason sits in the main card, under the room and status rows.
    correctionReason: "main",
    licenseTotalSeats: "license", licenseUsedSeats: "license",
    parentAssetId: "install", componentRole: "install", slotNo: "install", installReason: "install",
    purchaseDate: "purchase", purchasePrice: "purchase", warrantyStartDate: "purchase", warrantyEndDate: "purchase",
    fixedAssetCode: "purchase", poNumber: "purchase", invoiceNumber: "purchase",
    purchaseDocumentNo: "documents", purchaseDocumentAmount: "documents", purchaseDocumentFile: "documents",
    assetPhotoFile: "photos",
    customFieldsJson: "other",
  }
  assert.deepEqual(Object.keys(expected).sort(), Object.keys(FIELD_IDS).sort(), "every FIELD_IDS key has a section")
  for (const [field, section] of Object.entries(expected)) assert.equal(sectionOfField(field as AssetField), section, field)
  assert.equal(sectionOfField("warrantyEndDate"), "purchase")
  assert.equal(sectionOfField("customFieldsJson"), "other")
  assert.equal(sectionOfField("assetPhotoFile"), "photos")
  assert.equal(sectionOfField("customFields.cpu"), "customFields")
})

test("the rules file stays pure: relative .ts imports, no React, no client component", () => {
  const source = read("src/lib/asset-form-rules.ts")
  assert.doesNotMatch(source, /"use client"|from "react"|from "@\/|@prisma\/client|\bprisma\./)
  for (const line of source.split("\n").filter((line) => line.startsWith("import "))) assert.match(line, /from "\.\/[\w-]+\.ts"$/, line)
  // validate() reads its required fields from the same list as the counter.
  assert.match(source, /const requiredFields: readonly AssetField\[\] = getRequiredAssetFields\(ownershipType\)/)
})

// Group 4 plan 2 Task 6b (spec §7.3, P2-R1, P2-R2): the department follows the holder on บุคคล and Stock, and a change of
// the ownership type keeps the holder except a change to ส่วนควบ.
const lockInput = {
  ownership: "personal" as const,
  custodianId: "emp-1",
  holderDepartmentId: "dept-holder",
  holderDepartmentName: "บัญชี",
  currentCustodianId: null,
  currentDepartmentId: null,
  openHandover: false,
}

test("the department lock: บุคคล and Stock with a holder take the holder's department; the others and no holder stay free", () => {
  assert.deepEqual(getAssetFormDepartmentLock(lockInput), { locked: true, departmentId: "dept-holder", text: "บัญชี" })
  assert.deepEqual(getAssetFormDepartmentLock({ ...lockInput, ownership: "stock" }), { locked: true, departmentId: "dept-holder", text: "บัญชี" })
  const free = { locked: false, departmentId: null, text: null }
  for (const ownership of ["shared", "component", "software_license"] as const) assert.deepEqual(getAssetFormDepartmentLock({ ...lockInput, ownership }), free, ownership)
  assert.deepEqual(getAssetFormDepartmentLock({ ...lockInput, ownership: "stock", custodianId: null }), free, "Stock with no holder")
  assert.deepEqual(getAssetFormDepartmentLock({ ...lockInput, custodianId: "" }), free, "an empty pick is no holder")
  // Under an open handover the holder, room and department are read-only (Task 7); the lock stays off.
  assert.deepEqual(getAssetFormDepartmentLock({ ...lockInput, currentCustodianId: "emp-1", currentDepartmentId: "dept-old", openHandover: true }), free)
  // On edit with the holder unchanged, the lock is the automatic fix: the holder's department.
  assert.deepEqual(getAssetFormDepartmentLock({ ...lockInput, currentCustodianId: "emp-1", currentDepartmentId: "dept-old" }), { locked: true, departmentId: "dept-holder", text: "บัญชี" })
  // A written-off asset (Disposed, Retired) cannot move custody: with the holder unchanged the lock stays off and the
  // stored department stays, as the server keeps it (final review); a new holder still locks (the server refuses it).
  for (const statusName of ["Disposed", "Retired"]) {
    const custodyFrozen = isCustodyFrozen(statusName)
    assert.equal(custodyFrozen, true, statusName)
    assert.deepEqual(getAssetFormDepartmentLock({ ...lockInput, currentCustodianId: "emp-1", currentDepartmentId: "dept-old", custodyFrozen }), free, statusName)
    assert.deepEqual(getAssetFormDepartmentLock({ ...lockInput, currentCustodianId: "emp-9", currentDepartmentId: "dept-old", custodyFrozen }), { locked: true, departmentId: "dept-holder", text: "บัญชี" }, `${statusName}, a new holder`)
  }
  for (const statusName of ["Ready", "In Use", "Checked Out", "Pending Disposal"]) assert.equal(isCustodyFrozen(statusName), false, statusName)
  // A holder whose department is unknown (not in the options) keeps the asset's department, still locked.
  assert.deepEqual(
    getAssetFormDepartmentLock({ ...lockInput, holderDepartmentId: null, holderDepartmentName: null, currentCustodianId: "emp-1", currentDepartmentId: "dept-old" }),
    { locked: true, departmentId: "dept-old", text: null },
  )
})

test("a change of the ownership type keeps the holder, except a change to ส่วนควบ (P2-R2)", () => {
  const held: AssetFormValues = { ...emptyAssetFormValues, ownershipType: "personal", custodianId: "emp-1", departmentId: "dept-1" }
  assert.deepEqual(changeOwnershipType(held, "software_license"), { ...held, ownershipType: "software_license" })
  for (const ownership of ["shared", "stock", "software_license", "personal"]) assert.equal(changeOwnershipType(held, ownership).custodianId, "emp-1", ownership)
  assert.deepEqual(changeOwnershipType(held, "component"), { ...held, ownershipType: "component", custodianId: "" })
  // Under an open handover the holder is read-only and the lock refuses a change, so ส่วนควบ keeps it (final review).
  assert.deepEqual(changeOwnershipType(held, "component", { custodyLocked: true }), { ...held, ownershipType: "component" })
  assert.deepEqual(changeOwnershipType(held, "component", { custodyLocked: false }), { ...held, ownershipType: "component", custodianId: "" })
  // An unknown value reads as the default type.
  assert.equal(changeOwnershipType(held, "bogus").ownershipType, "personal")
})

test("the home location has its id, in visual order before the current location", () => {
  const keys = Object.keys(FIELD_IDS)
  assert.equal(FIELD_IDS.homeLocationId, "asset-home-location")
  assert.equal(keys.indexOf("homeLocationId"), keys.indexOf("currentLocationId") - 1)
  assert.ok(keys.indexOf("homeLocationId") > keys.indexOf("custodianId"))
})
