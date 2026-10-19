// The files a person downloads (spec §6.5 "downloads a file that opens"): the download a click starts, and the
// workbook or PDF it holds, opened the way a spreadsheet program or a PDF reader would start (ExcelJS reads the
// workbook; a PDF starts with %PDF- and ends with %%EOF).
import { readFileSync } from "node:fs"
import type { Page } from "@playwright/test"
import ExcelJS from "exceljs"

export type Download = { file: string; filename: string; bytes: Buffer }

// Click the control and keep the file it downloads, under the test's own output folder.
export async function downloadBy(page: Page, click: () => Promise<void>, name: string, outputPath: (name: string) => string): Promise<Download> {
  const [download] = await Promise.all([page.waitForEvent("download"), click()])
  const failure = await download.failure()
  if (failure) throw new Error(`the download of ${name} failed: ${failure}`)
  const file = outputPath(`${name}-${download.suggestedFilename()}`)
  await download.saveAs(file)
  return { file, filename: download.suggestedFilename(), bytes: readFileSync(file) }
}

// Every sheet of the workbook as rows of plain cell values (row 1 is the header).
export async function openWorkbook(bytes: Buffer): Promise<Record<string, unknown[][]>> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(bytes as unknown as ArrayBuffer)
  const sheets: Record<string, unknown[][]> = {}
  workbook.eachSheet((sheet) => {
    const rows: unknown[][] = []
    sheet.eachRow((row) => {
      rows.push((row.values as unknown[]).slice(1).map((value) => (value && typeof value === "object" && "result" in value ? (value as { result: unknown }).result : value)))
    })
    sheets[sheet.name] = rows
  })
  return sheets
}

// A PDF a reader opens: the header and the end-of-file marker.
export function isPdf(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString("latin1") === "%PDF-" && bytes.subarray(-1024).toString("latin1").includes("%%EOF")
}
