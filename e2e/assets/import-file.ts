// The Excel file the import spec uploads (group 4 plan 5, P5-R1), built in memory with ExcelJS from the template's own
// columns (assetImportColumns, English headers on row 1 of the "Asset Import" sheet, as the template writes them). It
// never starts from the template itself: the template lists every active employee of a Production copy, and a failed
// test's trace keeps network bodies (critic R2). Nothing is written to disk. Every row carries its own tag: a blank tag
// would be generated at confirm without the run's marker and take a number from a company's sequence (critic R3).
import ExcelJS from "exceljs"
import { assetImportColumns } from "../../src/lib/asset-excel.ts"

// The upload check takes this type (or none) with a ZIP signature (src/lib/upload-signature.ts).
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export type ImportColumnKey = (typeof assetImportColumns)[number]["key"]
export type ImportRow = Partial<Record<ImportColumnKey, string>> & { assetTag: string }
export type ImportFile = { name: string; mimeType: string; buffer: Buffer }

export async function buildImportFile(name: string, rows: readonly ImportRow[]): Promise<ImportFile> {
  for (const row of rows) {
    if (!row.assetTag?.trim()) throw new Error(`a row of ${name} has no asset tag: every imported row carries the run's marker`)
  }
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Asset Import")
  sheet.columns = assetImportColumns.map(({ header, key }) => ({ header, key }))
  for (const row of rows) sheet.addRow(row)
  return { name, mimeType: XLSX_MIME, buffer: Buffer.from(await workbook.xlsx.writeBuffer()) }
}
