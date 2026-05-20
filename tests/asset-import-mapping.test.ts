import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetImportColumnMapping,
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
