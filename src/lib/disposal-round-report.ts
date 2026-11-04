import { readFile } from "node:fs/promises"
import type ExcelJS from "exceljs"
import sharp from "sharp"
import { createWorkbook, styleWorksheetHeader } from "./asset-excel.ts"
import { assertSafeUploadPath } from "./uploads.ts"

// The round's accounting Excel (group 6 spec §11.5): one sheet "รายการ" with a title row, the header, and one row per
// machine (tag, name, Serial, photo). The file is for the accounting team, in Thai. A photo that is missing on disk, is
// not a JPG, PNG, WEBP or GIF (an old HEIC), or fails to convert reads "ไม่มีรูป"; nothing answers 500.

export const ROUND_REPORT_PHOTO_CONCURRENCY = 4
export const ROUND_REPORT_PHOTO_PX = 240
export const roundReportPhotoTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const

const SHEET_NAME = "รายการ"
const NO_PHOTO = "ไม่มีรูป"
const HEADERS = ["ลำดับ", "รหัสทรัพย์สิน", "ชื่อทรัพย์สิน", "Serial", "รูป"]
const TITLE_ROW = 1
const HEADER_ROW = 2
const PHOTO_COLUMN = 5
// Excel's row height is in points: a pixel is 0.75 pt. A little margin keeps the photo off the row's border.
const PX_TO_PT = 0.75
const PHOTO_MARGIN_PT = 6

export type DisposalRoundReportMachine = {
  assetTag: string
  assetName: string
  serialNumber: string | null
  photo: Buffer | null
}

export type DisposalRoundReportInput = {
  roundNo: string
  executionDate: Date
  machines: DisposalRoundReportMachine[]
}

function bangkokDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date)
  const part = (type: string) => Number(parts.find((candidate) => candidate.type === type)?.value)
  return { year: part("year"), month: part("month"), day: part("day") }
}

/** d/m/yyyy in the Buddhist year, by the Bangkok day: "5/11/2569". */
export function formatDisposalRoundReportDate(date: Date): string {
  const { year, month, day } = bangkokDateParts(date)
  return `${day}/${month}/${year + 543}`
}

/** รอบตัดจำหน่าย-<roundNo>-<yyyy-mm-dd of the round's date>.xlsx */
export function disposalRoundReportFileName(roundNo: string, executionDate: Date): string {
  const { year, month, day } = bangkokDateParts(executionDate)
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  return `รอบตัดจำหน่าย-${roundNo}-${dateKey}.xlsx`
}

async function readImage(photo: Buffer | null): Promise<{ extension: "jpeg" | "png" | "gif"; width: number; height: number } | null> {
  if (!photo || photo.length === 0) return null
  try {
    const metadata = await sharp(photo).metadata()
    const extension = metadata.format === "jpeg" || metadata.format === "png" || metadata.format === "gif" ? metadata.format : null
    if (!extension || !metadata.width || !metadata.height) return null
    // Fit inside the photo box, as the conversion did; a larger buffer from another caller is scaled for display only.
    const scale = Math.min(1, ROUND_REPORT_PHOTO_PX / metadata.width, ROUND_REPORT_PHOTO_PX / metadata.height)
    return { extension, width: Math.round(metadata.width * scale), height: Math.round(metadata.height * scale) }
  } catch {
    return null
  }
}

/** The workbook for one round. Pure given the photo buffers (already converted by loadRoundReportPhoto). */
export async function buildDisposalRoundReport(input: DisposalRoundReportInput): Promise<ExcelJS.Buffer> {
  const workbook = createWorkbook()
  const worksheet = workbook.addWorksheet(SHEET_NAME)
  // Widths only: a column header would be written into row 1, where the title sits. 240 px ≈ 34 characters.
  worksheet.columns = [
    { key: "index", width: 8 },
    { key: "assetTag", width: 24 },
    { key: "assetName", width: 40 },
    { key: "serialNumber", width: 24 },
    { key: "photo", width: 35 },
  ]

  const title = worksheet.getRow(TITLE_ROW)
  title.getCell(1).value = `รอบตัดจำหน่าย ${input.roundNo} · วันที่ ${formatDisposalRoundReportDate(input.executionDate)}`
  title.font = { bold: true, size: 14 }
  title.height = 24
  worksheet.mergeCells(TITLE_ROW, 1, TITLE_ROW, HEADERS.length)

  worksheet.getRow(HEADER_ROW).values = HEADERS
  styleWorksheetHeader(worksheet, HEADER_ROW)

  const images = await Promise.all(input.machines.map((machine) => readImage(machine.photo)))
  input.machines.forEach((machine, index) => {
    const rowNumber = HEADER_ROW + 1 + index
    const row = worksheet.getRow(rowNumber)
    row.getCell(1).value = index + 1
    row.getCell(2).value = machine.assetTag
    row.getCell(3).value = machine.assetName
    row.getCell(4).value = machine.serialNumber ?? ""
    row.alignment = { vertical: "middle", wrapText: true }
    const image = images[index]
    if (!image) {
      row.getCell(PHOTO_COLUMN).value = NO_PHOTO
      return
    }
    const imageId = workbook.addImage({ buffer: machine.photo as unknown as ExcelJS.Buffer, extension: image.extension })
    worksheet.addImage(imageId, {
      tl: { col: PHOTO_COLUMN - 1, row: rowNumber - 1 },
      ext: { width: image.width, height: image.height },
      editAs: "oneCell",
    })
    row.height = image.height * PX_TO_PT + PHOTO_MARGIN_PT
  })

  return workbook.xlsx.writeBuffer()
}

/**
 * One photo for the report: read safely from the upload folder, turned upright, fitted inside 240 px and written as
 * JPEG 80. Null on any error (missing file, a path outside the folder, an image sharp cannot read).
 */
export async function loadRoundReportPhoto(filePath: string): Promise<Buffer | null> {
  try {
    if (!filePath) return null
    const file = await readFile(assertSafeUploadPath(filePath))
    return await sharp(file)
      .rotate()
      .resize(ROUND_REPORT_PHOTO_PX, ROUND_REPORT_PHOTO_PX, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer()
  } catch {
    return null
  }
}

/** Runs fn over the items with at most `limit` at once, keeping the items' order in the result. */
export async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// Method syntax, so a fake may narrow the args; Prisma's client fits as is.
export type DisposalRoundReportDb = {
  attachment: { findMany(args: object): Promise<unknown[]> }
}

type PhotoFileRow = { id: string; filePath: string; fileType: string }

/**
 * Each machine's photo (its first image: the request's, else its batch's, from readDisposalRound), in the machines'
 * order: one attachment read, then at most 4 conversions at once. Only JPG, PNG, WEBP and GIF are converted.
 */
export async function loadDisposalRoundReportPhotos(
  db: DisposalRoundReportDb,
  machines: ReadonlyArray<{ firstPhotoId: string | null }>,
  load: (filePath: string) => Promise<Buffer | null> = loadRoundReportPhoto,
): Promise<Array<Buffer | null>> {
  const photoIds = [...new Set(machines.flatMap((machine) => (machine.firstPhotoId ? [machine.firstPhotoId] : [])))]
  const rows = photoIds.length
    ? ((await db.attachment.findMany({
        where: { id: { in: photoIds }, isActive: true },
        select: { id: true, filePath: true, fileType: true },
      })) as PhotoFileRow[])
    : []
  const filesById = new Map(rows.map((row) => [row.id, row]))
  return mapWithConcurrency(machines, ROUND_REPORT_PHOTO_CONCURRENCY, async (machine) => {
    const file = machine.firstPhotoId ? filesById.get(machine.firstPhotoId) : undefined
    if (!file || !(roundReportPhotoTypes as readonly string[]).includes(file.fileType.toLowerCase())) return null
    return load(file.filePath)
  })
}
