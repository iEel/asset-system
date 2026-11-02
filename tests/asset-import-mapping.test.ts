import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { assetImportColumns } from "../src/lib/asset-excel.ts"

import {
  buildAssetImportColumnMapping,
  normalizeImportCell,
  readAssetImportRowByMapping,
} from "../src/lib/asset-import-mapping.ts"

test("maps legacy Thai asset import headers to canonical import fields", () => {
  const mapping = buildAssetImportColumnMapping(["รหัสทรัพย์สิน", "รายละเอียด", "Serial"])

  assert.deepEqual(
    mapping
      .filter((column) => ["assetTag", "name", "serialNumber"].includes(column.key))
      .map((column) => ({
        key: column.key,
        sourceHeader: column.sourceHeader,
        sourceColumn: column.sourceColumn,
        confidence: column.confidence,
      })),
    [
      { key: "assetTag", sourceHeader: "รหัสทรัพย์สิน", sourceColumn: 1, confidence: "alias" },
      { key: "name", sourceHeader: "รายละเอียด", sourceColumn: 2, confidence: "alias" },
      { key: "serialNumber", sourceHeader: "Serial", sourceColumn: 3, confidence: "alias" },
    ]
  )
})

test("reads row values using the detected import mapping", () => {
  const mapping = buildAssetImportColumnMapping(["รหัสทรัพย์สิน", "รายละเอียด", "Serial"])
  const row = {
    getCell(index: number) {
      return {
        value: ["SNI-EQU-16-0031", "ปริ้นเตอร์ EPSON LQ-590", "FSVY060964"][index - 1],
      }
    },
  }

  const values = readAssetImportRowByMapping(row, mapping)

  assert.equal(values.assetTag, "SNI-EQU-16-0031")
  assert.equal(values.name, "ปริ้นเตอร์ EPSON LQ-590")
  assert.equal(values.serialNumber, "FSVY060964")
  assert.equal(values.categoryCode, null)
})

test("old and new Thai location headers both map after the glossary rename", () => {
  for (const header of ["พื้นที่", "ที่ตั้ง"]) {
    const column = buildAssetImportColumnMapping([header]).find((entry) => entry.key === "currentLocationCode")
    assert.equal(column?.sourceColumn, 1, header)
  }
  for (const header of ["พื้นที่ประจำ", "ที่ตั้งประจำ"]) {
    const column = buildAssetImportColumnMapping([header]).find((entry) => entry.key === "homeLocationCode")
    assert.equal(column?.sourceColumn, 1, header)
  }
})

test("the app's own Thai field labels map as headers, and the English template headers still do (P5-R5)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).asset.importField as Record<string, string>
  const column = (header: string, key: string) => buildAssetImportColumnMapping([header]).find((entry) => entry.key === key)
  assert.equal(column("รหัสที่ตั้งปัจจุบัน", "currentLocationCode")?.sourceColumn, 1)
  for (const [key, label] of Object.entries(th)) {
    assert.equal(column(label, key)?.sourceColumn, 1, `${key}: ${label}`)
  }
  for (const entry of assetImportColumns) {
    assert.equal(column(entry.header, entry.key)?.confidence, "template", entry.header)
  }
  // A whole header row of Thai labels maps every column to its own place.
  const labels = assetImportColumns.map((entry) => th[entry.key])
  const mapping = buildAssetImportColumnMapping(labels)
  assert.deepEqual(mapping.map((entry) => entry.sourceColumn), assetImportColumns.map((_, index) => index + 1))
})

test("exactly the seven required columns carry required: true", () => {
  assert.deepEqual(
    assetImportColumns.filter((entry) => "required" in entry && entry.required).map((entry) => entry.key),
    ["name", "categoryCode", "companyCode", "branchCode", "currentLocationCode", "status", "condition"]
  )
})

// Group 4 plan 5 final review: the ExcelJS cell shapes that used to read as "[object Object]". An error value (on its own
// or as a formula's saved result) reads as its error text, which the validator refuses (cellError); a formula with no
// saved result reads as blank; a hyperlink whose text is rich text reads as that text; a date past JavaScript's range
// reads as text no date parser accepts (invalidDate on its row) instead of throwing for the whole file.
test("error cells, formulas with no result, rich-text hyperlinks and invalid dates read safely", () => {
  assert.equal(normalizeImportCell({ error: "#N/A" }), "#N/A")
  assert.equal(normalizeImportCell({ formula: "VLOOKUP(A2,B:C,2,0)", result: { error: "#N/A" } }), "#N/A")
  assert.equal(normalizeImportCell({ formula: "A1*2" }), null)
  assert.equal(normalizeImportCell({ sharedFormula: "A2", result: 7 }), 7)
  assert.equal(normalizeImportCell({ formula: "A1", result: "SN-9 " }), "SN-9")
  assert.equal(normalizeImportCell({ text: { richText: [{ text: "NB-" }, { text: "0001" }] }, hyperlink: "https://x" }), "NB-0001")
  assert.equal(normalizeImportCell({ text: "Link text", hyperlink: "https://x" }), "Link text")
  assert.equal(normalizeImportCell(new Date(Number.NaN)), "Invalid Date")
  assert.equal(normalizeImportCell(new Date("2024-01-05T00:00:00Z")), "2024-01-05")
  assert.equal(normalizeImportCell({ unknown: true }), null)
})
