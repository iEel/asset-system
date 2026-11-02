import assert from "node:assert/strict"
import test from "node:test"

import { assetImportColumns } from "../src/lib/asset-excel.ts"
import { ASSET_IMPORT_MAX_ROWS, type AssetImportIssue } from "../src/lib/asset-import-validate.ts"
import {
  ASSET_IMPORT_ROW_CAP,
  assetImportRequiredColumnKeys,
  buildImportIssueParts,
  defaultImportFilter,
  filterImportRows,
  getAssetImportWizardStep,
  splitImportMapping,
  summarizeAssetImportPreviewIssues,
} from "../src/lib/asset-import-wizard.ts"

// A stand-in for next-intl's t over the asset namespace: the Thai words of the keys the helper reads.
const words: Record<string, string> = {
  "importError.duplicateExisting": "ซ้ำกับข้อมูลที่มีอยู่แล้ว",
  "importError.duplicateInFile": "ซ้ำกับแถว {row} ในไฟล์",
  "importError.notUnder": "ไม่อยู่ภายใต้{parent}ที่ระบุ",
  "importError.notFound": "ไม่พบในข้อมูลอ้างอิง",
  "importError.required": "ต้องระบุ",
  "importError.tooLong": "ยาวเกิน {max} ตัวอักษร",
  "importIssue.line": "{field}: {problem}",
  "importIssue.value": "ค่าในไฟล์: {value}",
  "importIssue.usedBy": "ใช้อยู่กับ {tag}",
  "importIssue.usedByInactive": "ใช้อยู่กับ {tag} ที่ปิดใช้งานแล้ว",
  "importIssue.separator": " · ",
  "importIssue.fileForm": "ทั้งไฟล์",
}
function t(key: string, values: Record<string, string | number> = {}) {
  const text = words[key]
  assert.ok(text, `missing word ${key}`)
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]))
}
const fields = { serialNumber: "Serial Number", assetTag: "รหัสทรัพย์สิน", branchCode: "รหัสสาขา", companyCode: "รหัสบริษัท", name: "ชื่อทรัพย์สิน" }
const context = { fields, locale: "th" }

test("resolves import wizard step from UI state", () => {
  assert.equal(getAssetImportWizardStep({}), "template")
  assert.equal(getAssetImportWizardStep({ isLoading: true }), "upload")
  assert.equal(getAssetImportWizardStep({ hasSelectedFile: true, hasPreview: true }), "review")
  assert.equal(getAssetImportWizardStep({ hasPreview: true, isImporting: true }), "import")
  assert.equal(getAssetImportWizardStep({ hasSuccess: true }), "complete")
})

test("summarizes repeated import preview issues by field and code, each row once, keeping the first issue as the sample", () => {
  const categoryRequired = { field: "categoryCode", code: "required" }
  const summary = summarizeAssetImportPreviewIssues([
    { issues: [categoryRequired, { field: "companyCode", code: "notFound" }] },
    { issues: [{ field: "categoryCode", code: "required" }] },
    // The same field and code twice on one row counts the row once.
    { issues: [{ field: "licenseTotalSeats", code: "licenceOnlyForLicence" }, { field: "licenseTotalSeats", code: "licenceOnlyForLicence" }] },
    { issues: [] },
  ])

  assert.deepEqual(
    summary.map(({ field, code, count }) => ({ field, code, count })),
    [
      { field: "categoryCode", code: "required", count: 2 },
      { field: "companyCode", code: "notFound", count: 1 },
      { field: "licenseTotalSeats", code: "licenceOnlyForLicence", count: 1 },
    ],
  )
  assert.equal(summary[0].sample, categoryRequired)
  // The key is field + code: the same code on two fields is two groups, two values of one field are one group.
  const byKey = summarizeAssetImportPreviewIssues([
    { issues: [{ field: "assetTag", code: "duplicateExisting", value: "A" } as AssetImportIssue] },
    { issues: [{ field: "assetTag", code: "duplicateExisting", value: "B" } as AssetImportIssue] },
    { issues: [{ field: "serialNumber", code: "duplicateExisting", value: "A" } as AssetImportIssue] },
  ])
  assert.deepEqual(byKey.map((item) => `${item.field}:${item.code}:${item.count}`), ["assetTag:duplicateExisting:2", "serialNumber:duplicateExisting:1"])
})

test("issue parts: a Serial held by an active asset names the field, the problem, the file value and links the tag", () => {
  const parts = buildImportIssueParts(
    { code: "duplicateExisting", field: "serialNumber", value: "PF4XK2LM", conflict: { assetId: "a-17", assetTag: "GRL-COM-26-0017", inactive: false } },
    t,
    context,
  )
  assert.deepEqual(parts, {
    line: "Serial Number: ซ้ำกับข้อมูลที่มีอยู่แล้ว",
    value: "ค่าในไฟล์: PF4XK2LM",
    separator: " · ",
    usedBy: { before: "ใช้อยู่กับ ", tag: "GRL-COM-26-0017", after: "", href: "/th/assets/a-17" },
  })
})

test("issue parts: a tag held by a deactivated asset says so after the tag", () => {
  const parts = buildImportIssueParts(
    { code: "duplicateExisting", field: "assetTag", value: "OLD-1", conflict: { assetId: "a-9", assetTag: "OLD-1", inactive: true } },
    t,
    { fields, locale: "en" },
  )
  assert.equal(parts.line, "รหัสทรัพย์สิน: ซ้ำกับข้อมูลที่มีอยู่แล้ว")
  assert.equal(parts.value, "ค่าในไฟล์: OLD-1")
  assert.deepEqual(parts.usedBy, { before: "ใช้อยู่กับ ", tag: "OLD-1", after: " ที่ปิดใช้งานแล้ว", href: "/en/assets/a-9" })
})

test("issue parts: the row, the parent, the length and a missing value", () => {
  assert.deepEqual(buildImportIssueParts({ code: "duplicateInFile", field: "serialNumber", value: "S1", conflict: { row: 4 } }, t, context), {
    line: "Serial Number: ซ้ำกับแถว 4 ในไฟล์",
    value: "ค่าในไฟล์: S1",
    separator: " · ",
    usedBy: null,
  })
  assert.equal(buildImportIssueParts({ code: "notUnder", field: "branchCode", value: "B9", parent: "companyCode" }, t, context).line, "รหัสสาขา: ไม่อยู่ภายใต้รหัสบริษัทที่ระบุ")
  assert.equal(buildImportIssueParts({ code: "tooLong", field: "name", value: "x", max: 200 }, t, context).line, "ชื่อทรัพย์สิน: ยาวเกิน 200 ตัวอักษร")
  const required = buildImportIssueParts({ code: "required", field: "name", value: null }, t, context)
  assert.equal(required.line, "ชื่อทรัพย์สิน: ต้องระบุ")
  assert.equal(required.value, null)
  assert.equal(buildImportIssueParts({ code: "required", field: "name", value: "  " }, t, context).value, null)
  assert.equal(buildImportIssueParts({ code: "notFound", field: "unknownKey", value: 12 }, t, context).line, "unknownKey: ไม่พบในข้อมูลอ้างอิง")
  assert.equal(buildImportIssueParts({ code: "notFound", field: "unknownKey", value: 12 }, t, context).value, "ค่าในไฟล์: 12")
  assert.equal(buildImportIssueParts({ code: "required", field: "_form", value: null }, t, context).line, "ทั้งไฟล์: ต้องระบุ")
})

test("the default filter is the rows with errors when there are any, else every row", () => {
  assert.equal(defaultImportFilter({ totalRows: 48, readyRows: 45, errorRows: 3 }), "error")
  assert.equal(defaultImportFilter({ totalRows: 48, readyRows: 48, errorRows: 0 }), "all")
  assert.equal(defaultImportFilter({ totalRows: 0, readyRows: 0, errorRows: 0 }), "all")
})

test("the filter keeps its rows, then shows at most 100 and counts the hidden ones", () => {
  const rows = Array.from({ length: 250 }, (_, index) => ({ rowNumber: index + 2, status: index % 2 === 0 ? ("error" as const) : ("ready" as const) }))
  const errors = filterImportRows(rows, "error")
  assert.equal(errors.total, 125)
  assert.equal(errors.rows.length, 100)
  assert.equal(errors.hidden, 25)
  assert.ok(errors.rows.every((row) => row.status === "error"))
  assert.deepEqual(errors.rows.slice(0, 2).map((row) => row.rowNumber), [2, 4])

  const all = filterImportRows(rows, "all")
  assert.deepEqual([all.total, all.rows.length, all.hidden], [250, 100, 150])
  const ready = filterImportRows(rows.slice(0, 10), "ready")
  assert.deepEqual([ready.total, ready.rows.length, ready.hidden], [5, 5, 0])
  assert.deepEqual(ready.rows.map((row) => row.rowNumber), [3, 5, 7, 9, 11])
  const few = filterImportRows(rows, "error", 3)
  assert.deepEqual([few.total, few.rows.length, few.hidden], [125, 3, 122])
})

test("the mapping line: matched of total, and the missing columns split by required", () => {
  const column = (key: string, sourceColumn: number | null) => ({ key, label: key, sourceHeader: sourceColumn ? key : null, sourceColumn, confidence: sourceColumn ? ("template" as const) : ("missing" as const) })
  const split = splitImportMapping([column("name", 1), column("categoryCode", null), column("serialNumber", 3), column("remark", null), column("brand", null)])
  assert.deepEqual(split, { matched: 2, total: 5, missingRequired: ["categoryCode"], missingOptional: ["remark", "brand"] })
})

test("the client copies of the row cap and the required columns match the server's", () => {
  assert.equal(ASSET_IMPORT_ROW_CAP, ASSET_IMPORT_MAX_ROWS)
  assert.deepEqual(
    [...assetImportRequiredColumnKeys].sort(),
    assetImportColumns.filter((column) => "required" in column && column.required).map((column) => column.key).sort(),
  )
})
