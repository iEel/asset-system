import assert from "node:assert/strict"
import test from "node:test"

import {
  ASSET_IMPORT_MAX_ROWS,
  assetImportIssueCodes,
  assetImportModelKey,
  assetImportScopedKey,
  validateAssetImportRows,
  type AssetImportIssue,
  type AssetImportReferences,
} from "../src/lib/asset-import-validate.ts"
import type { AssetImportCellValue } from "../src/lib/asset-import-mapping.ts"

// Group 4 plan 5 Task 1 (P5-R4, P5-R5): the pure validator gives each problem a code, the field, the value in the file
// and, for a clash, the asset or the earlier row that holds the value. One case per code, plus the review focus cases.

function references(): AssetImportReferences {
  return {
    assetsByTag: new Map([
      ["nb-0001", { id: "asset-1", assetTag: "NB-0001", active: true }],
      ["nb-0099", { id: "asset-99", assetTag: "NB-0099", active: false }],
    ]),
    // Built oldest first; the oldest active asset keeps the Serial (Review Focus 1).
    assetsBySerial: new Map([["sn-shared", { id: "asset-old", assetTag: "NB-OLD" }]]),
    categories: new Map([["nb", "cat-nb"], ["mon", "cat-mon"]]),
    companies: new Map([["gl", "co-gl"], ["sn", "co-sn"]]),
    branches: new Map([
      [assetImportScopedKey("co-gl", "hq"), { id: "br-hq", companyId: "co-gl" }],
      [assetImportScopedKey("co-gl", "cm"), { id: "br-cm", companyId: "co-gl" }],
    ]),
    departments: new Map([
      ["it", { id: "dep-it", companyId: "co-gl" }],
      ["acc-sn", { id: "dep-acc-sn", companyId: "co-sn" }],
    ]),
    locations: new Map([
      ["hq-1", { id: "loc-hq-1", branchId: "br-hq" }],
      ["cm-1", { id: "loc-cm-1", branchId: "br-cm" }],
    ]),
    statuses: new Map([
      ["ready", "st-ready"],
      ["พร้อมใช้งาน", "st-ready"],
      ["draft", "st-draft"],
      ["ร่าง", "st-draft"],
      ["in use", "st-in-use"],
      ["ใช้งานอยู่", "st-in-use"],
    ]),
    importableStatuses: new Set(["st-ready", "st-draft"]),
    conditions: new Map([
      ["good", "cd-good"],
      ["ดี", "cd-good"],
      ["lost", "cd-lost"],
      ["สูญหาย", "cd-lost"],
    ]),
    importableConditions: new Set(["cd-good"]),
    brands: new Map([["dell", "br-dell"], ["hp", "br-hp"], ["lenovo", "br-lenovo"]]),
    models: new Map([
      [assetImportModelKey("br-dell", "Pro 14"), { id: "md-dell-pro", brandId: "br-dell", categoryId: "cat-nb" }],
      [assetImportModelKey("br-hp", "Pro 14"), { id: "md-hp-pro", brandId: "br-hp", categoryId: "cat-nb" }],
      [assetImportModelKey("br-dell", "U2724"), { id: "md-dell-u27", brandId: "br-dell", categoryId: "cat-mon" }],
    ]),
    employees: new Map([["e001", { id: "emp-1", departmentId: "dep-it" }]]),
    suppliers: new Map([["sup1", "sup-1"]]),
  }
}

const base: Record<string, AssetImportCellValue> = {
  assetTag: null,
  name: "Notebook",
  categoryCode: "NB",
  companyCode: "GL",
  branchCode: "HQ",
  currentLocationCode: "HQ-1",
  status: "พร้อมใช้งาน",
  condition: "ดี",
  serialNumber: null,
  ownershipType: null,
  licenseTotalSeats: null,
  licenseUsedSeats: null,
  licenseAssignedAssetTag: null,
  brand: null,
  model: null,
  departmentCode: null,
  custodianCode: null,
  homeLocationCode: null,
  purchaseDate: null,
  purchasePrice: null,
  supplierCode: null,
  warrantyStartDate: null,
  warrantyEndDate: null,
  fixedAssetCode: null,
  poNumber: null,
  invoiceNumber: null,
  remark: null,
}

function one(values: Record<string, AssetImportCellValue>, refs = references()) {
  const [row] = validateAssetImportRows([{ rowNumber: 2, values: { ...base, ...values } }], refs)
  return row
}

function issuesOf(values: Record<string, AssetImportCellValue>) {
  return one(values).issues
}

test("the cap is 1,000 rows and there are exactly the 15 codes of P5-R4", () => {
  assert.equal(ASSET_IMPORT_MAX_ROWS, 1000)
  assert.deepEqual([...assetImportIssueCodes].sort(), [
    "buddhistYear", "conditionNotAllowed", "duplicateExisting", "duplicateInFile", "invalidDate", "invalidInteger",
    "invalidNumber", "invalidOwnership", "licenceOnlyForLicence", "notFound", "notUnder", "required", "seatsOverTotal",
    "statusNotAllowed", "tooLong",
  ])
})

test("a clean row is ready, has no issues and carries its resolved ids", () => {
  const row = one({ brand: "Dell", model: "Pro 14", custodianCode: "E001", supplierCode: "SUP1", departmentCode: "IT", homeLocationCode: "HQ-1" })
  assert.equal(row.status, "ready")
  assert.deepEqual(row.issues, [])
  assert.equal(row.rowNumber, 2)
  assert.equal(row.values.name, "Notebook")
  assert.deepEqual(row.resolved, {
    categoryId: "cat-nb",
    companyId: "co-gl",
    branchId: "br-hq",
    currentLocationId: "loc-hq-1",
    statusId: "st-ready",
    conditionId: "cd-good",
    brandId: "br-dell",
    modelId: "md-dell-pro",
    departmentId: "dep-it",
    custodianId: "emp-1",
    custodianDepartmentId: "dep-it",
    homeLocationId: "loc-hq-1",
    supplierId: "sup-1",
    licenseAssignedAssetId: null,
  })
})

test("required: each of the seven required fields, with the blank value as null", () => {
  const issues = issuesOf({ name: "", categoryCode: null, companyCode: " ", branchCode: null, currentLocationCode: null, status: null, condition: null })
  assert.deepEqual(
    issues.filter((issue) => issue.code === "required"),
    ["name", "categoryCode", "companyCode", "branchCode", "currentLocationCode", "status", "condition"].map((field) => ({ code: "required", field, value: null }))
  )
  assert.equal(one({ name: "" }).status, "error")
})

test("notFound: a code that is not in the reference data keeps the file value", () => {
  assert.deepEqual(issuesOf({ categoryCode: "XX" }), [{ code: "notFound", field: "categoryCode", value: "XX" }])
  assert.deepEqual(issuesOf({ branchCode: "ZZ" }), [{ code: "notFound", field: "branchCode", value: "ZZ" }])
  assert.deepEqual(issuesOf({ custodianCode: "E404" }), [{ code: "notFound", field: "custodianCode", value: "E404" }])
  assert.deepEqual(issuesOf({ licenseAssignedAssetTag: "NB-0099", ownershipType: "software_license" }), [
    { code: "notFound", field: "licenseAssignedAssetTag", value: "NB-0099" },
  ])
})

test("notUnder: a location outside the branch, a department outside the company, a model outside the category", () => {
  assert.deepEqual(issuesOf({ currentLocationCode: "CM-1" }), [{ code: "notUnder", field: "currentLocationCode", value: "CM-1", parent: "branchCode" }])
  assert.deepEqual(issuesOf({ homeLocationCode: "CM-1" }), [{ code: "notUnder", field: "homeLocationCode", value: "CM-1", parent: "branchCode" }])
  assert.deepEqual(issuesOf({ departmentCode: "ACC-SN" }), [{ code: "notUnder", field: "departmentCode", value: "ACC-SN", parent: "companyCode" }])
  assert.deepEqual(issuesOf({ brand: "Dell", model: "U2724" }), [{ code: "notUnder", field: "model", value: "U2724", parent: "categoryCode" }])
  // A model that exists, but only under another brand.
  assert.deepEqual(issuesOf({ brand: "Lenovo", model: "U2724" }), [{ code: "notUnder", field: "model", value: "U2724", parent: "brand" }])
})

test("a model name shared by two brands resolves by its brand", () => {
  assert.equal(one({ brand: "Dell", model: "Pro 14" }).resolved.modelId, "md-dell-pro")
  assert.equal(one({ brand: "HP", model: "pro 14" }).resolved.modelId, "md-hp-pro")
  // Without a brand the name alone is ambiguous: the brand is asked for.
  assert.deepEqual(issuesOf({ model: "Pro 14" }), [{ code: "required", field: "brand", value: null }])
  // Without a brand a name held by one brand only still resolves, as before.
  assert.equal(one({ model: "U2724", categoryCode: "MON" }).resolved.modelId, "md-dell-u27")
  assert.deepEqual(issuesOf({ brand: "Dell", model: "Nope" }), [{ code: "notFound", field: "model", value: "Nope" }])
})

test("duplicateExisting: a tag names the asset that holds it, an inactive one says so (Review Focus 4)", () => {
  assert.deepEqual(issuesOf({ assetTag: "nb-0001" }), [
    { code: "duplicateExisting", field: "assetTag", value: "nb-0001", conflict: { assetId: "asset-1", assetTag: "NB-0001", inactive: false } },
  ])
  const [inactive] = issuesOf({ assetTag: "NB-0099" })
  assert.equal(inactive.code, "duplicateExisting")
  assert.deepEqual(inactive.conflict, { assetId: "asset-99", assetTag: "NB-0099", inactive: true })
})

test("duplicateExisting: a Serial already on two active assets names the oldest and never throws (Review Focus 1)", () => {
  assert.deepEqual(issuesOf({ serialNumber: "SN-SHARED" }), [
    { code: "duplicateExisting", field: "serialNumber", value: "SN-SHARED", conflict: { assetId: "asset-old", assetTag: "NB-OLD", inactive: false } },
  ])
})

test("duplicateInFile: the same Serial in rows 3 and 7 names row 3 on row 7", () => {
  const rows = validateAssetImportRows(
    [
      { rowNumber: 3, values: { ...base, serialNumber: "SN-A", assetTag: "T-1" } },
      { rowNumber: 5, values: { ...base, serialNumber: "SN-B" } },
      { rowNumber: 7, values: { ...base, serialNumber: "sn-a ", assetTag: "t-1" } },
    ],
    references()
  )
  assert.equal(rows[0].status, "ready")
  assert.equal(rows[1].status, "ready")
  assert.deepEqual(rows[2].issues, [
    { code: "duplicateInFile", field: "assetTag", value: "t-1", conflict: { row: 3 } },
    { code: "duplicateInFile", field: "serialNumber", value: "sn-a ", conflict: { row: 3 } },
  ])
})

test("invalidDate and buddhistYear: a year 2400 to 2700 is Buddhist, any other outside 1950 to 2100 is invalid", () => {
  assert.deepEqual(issuesOf({ purchaseDate: "2569-05-01" }), [{ code: "buddhistYear", field: "purchaseDate", value: "2569-05-01" }])
  assert.deepEqual(issuesOf({ warrantyStartDate: "1890-01-01" }), [{ code: "invalidDate", field: "warrantyStartDate", value: "1890-01-01" }])
  assert.deepEqual(issuesOf({ warrantyEndDate: "not a date" }), [{ code: "invalidDate", field: "warrantyEndDate", value: "not a date" }])
  assert.deepEqual(issuesOf({ purchaseDate: "2026-05-01", warrantyStartDate: 45000, warrantyEndDate: "2101-01-01" }), [
    { code: "invalidDate", field: "warrantyEndDate", value: "2101-01-01" },
  ])
})

test("invalidNumber, invalidInteger and seatsOverTotal", () => {
  assert.deepEqual(issuesOf({ purchasePrice: "abc" }), [{ code: "invalidNumber", field: "purchasePrice", value: "abc" }])
  assert.deepEqual(issuesOf({ purchasePrice: -1 }), [{ code: "invalidNumber", field: "purchasePrice", value: -1 }])
  assert.deepEqual(issuesOf({ ownershipType: "software_license", licenseTotalSeats: "1.5", licenseUsedSeats: -2 }), [
    { code: "invalidInteger", field: "licenseTotalSeats", value: "1.5" },
    { code: "invalidInteger", field: "licenseUsedSeats", value: -2 },
  ])
  assert.deepEqual(issuesOf({ ownershipType: "software_license", licenseTotalSeats: 5, licenseUsedSeats: 6 }), [
    { code: "seatsOverTotal", field: "licenseUsedSeats", value: 6 },
  ])
})

test("licenceOnlyForLicence and invalidOwnership", () => {
  assert.deepEqual(issuesOf({ licenseTotalSeats: 5, licenseAssignedAssetTag: "NB-0001" }), [
    { code: "licenceOnlyForLicence", field: "licenseTotalSeats", value: 5 },
    { code: "licenceOnlyForLicence", field: "licenseAssignedAssetTag", value: "NB-0001" },
  ])
  assert.deepEqual(issuesOf({ ownershipType: "rented" }), [{ code: "invalidOwnership", field: "ownershipType", value: "rented" }])
  assert.equal(one({ ownershipType: "software_license", licenseAssignedAssetTag: "NB-0001" }).resolved.licenseAssignedAssetId, "asset-1")
})

test("statusNotAllowed and conditionNotAllowed: a value that exists but cannot be imported", () => {
  assert.deepEqual(issuesOf({ status: "ใช้งานอยู่" }), [{ code: "statusNotAllowed", field: "status", value: "ใช้งานอยู่" }])
  assert.deepEqual(issuesOf({ condition: "Lost" }), [{ code: "conditionNotAllowed", field: "condition", value: "Lost" }])
  assert.deepEqual(issuesOf({ status: "Gone" }), [{ code: "notFound", field: "status", value: "Gone" }])
  assert.equal(one({ status: "Draft" }).resolved.statusId, "st-draft")
})

test("tooLong: each length the database holds, with its max", () => {
  const name = "ก".repeat(201)
  assert.deepEqual(issuesOf({ name }), [{ code: "tooLong", field: "name", value: name, max: 200 }])
  assert.equal(one({ name: "ก".repeat(200) }).status, "ready")
  const cases: Array<[string, number]> = [["assetTag", 50], ["serialNumber", 100], ["fixedAssetCode", 50], ["poNumber", 50], ["invoiceNumber", 50]]
  for (const [field, max] of cases) {
    const value = "x".repeat(max + 1)
    const issues: AssetImportIssue[] = issuesOf({ [field]: value })
    assert.deepEqual(issues, [{ code: "tooLong", field, value, max }], field)
  }
})

test("every code of the list is produced by at least one case above", () => {
  const seen = new Set<string>()
  const samples: Array<Record<string, AssetImportCellValue>> = [
    { name: "" }, { categoryCode: "XX" }, { currentLocationCode: "CM-1" }, { assetTag: "NB-0001" }, { purchaseDate: "1890-01-01" },
    { purchaseDate: "2569-01-01" }, { purchasePrice: "x" }, { ownershipType: "software_license", licenseTotalSeats: "x" },
    { ownershipType: "software_license", licenseTotalSeats: 1, licenseUsedSeats: 2 }, { licenseTotalSeats: 1 }, { ownershipType: "x" },
    { status: "In Use" }, { condition: "Lost" }, { name: "x".repeat(201) },
  ]
  for (const sample of samples) for (const issue of issuesOf(sample)) seen.add(issue.code)
  const rows = validateAssetImportRows([{ rowNumber: 2, values: { ...base, assetTag: "A" } }, { rowNumber: 3, values: { ...base, assetTag: "A" } }], references())
  for (const issue of rows[1].issues) seen.add(issue.code)
  assert.deepEqual([...seen].sort(), [...assetImportIssueCodes].sort())
})
