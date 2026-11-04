import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import ExcelJS from "exceljs"
import sharp from "sharp"

import {
  buildDisposalRoundReport,
  disposalRoundReportFileName,
  formatDisposalRoundReportDate,
  loadDisposalRoundReportPhotos,
  loadRoundReportPhoto,
  ROUND_REPORT_PHOTO_CONCURRENCY,
} from "../src/lib/disposal-round-report.ts"
import { buildDisposalExportColumns } from "../src/lib/disposal-export.ts"

// Group 6 plan 4 Task 5 (spec §11.5, §12): the round's accounting Excel (tag, name, Serial, photo), its route, and the
// disposal export's Thai headers with the round number. The working tree is CRLF on Windows: every read strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const thai = JSON.parse(read("messages/th.json")) as Record<string, unknown>

function message(key: string): string {
  const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], thai)
  return typeof value === "string" ? value : key
}

async function tinyJpeg(width = 40, height = 30) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } }).jpeg().toBuffer()
}

test("the report: sheet รายการ, the title, the header, the machines in order, one image and ไม่มีรูป for the other", async () => {
  const buffer = await buildDisposalRoundReport({
    roundNo: "DPR-20261105-0001",
    executionDate: new Date("2026-11-05T00:00:00.000Z"),
    machines: [
      { assetTag: "IT-0001", assetName: "Monitor 1", serialNumber: "SN-1", photo: await tinyJpeg() },
      { assetTag: "IT-0002", assetName: "Monitor 2", serialNumber: null, photo: null },
    ],
  })

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)
  const sheet = workbook.getWorksheet("รายการ")
  assert.ok(sheet, "the sheet รายการ")
  assert.equal(sheet.getCell("A1").value, "รอบตัดจำหน่าย DPR-20261105-0001 · วันที่ 5/11/2569")
  assert.deepEqual((sheet.getRow(2).values as unknown[]).slice(1), ["ลำดับ", "รหัสทรัพย์สิน", "ชื่อทรัพย์สิน", "Serial", "รูป"])
  assert.deepEqual((sheet.getRow(3).values as unknown[]).slice(1, 5), [1, "IT-0001", "Monitor 1", "SN-1"])
  assert.deepEqual((sheet.getRow(4).values as unknown[]).slice(1, 4), [2, "IT-0002", "Monitor 2"])
  assert.equal(sheet.rowCount, 4)

  const images = sheet.getImages()
  assert.equal(images.length, 1)
  assert.equal(images[0].range.tl.nativeRow, 2, "the image sits on the first machine's row")
  assert.equal(images[0].range.tl.nativeCol, 4, "in the photo column")
  assert.equal(sheet.getCell("E3").value, null)
  assert.equal(sheet.getCell("E4").value, "ไม่มีรูป")
  // The row fits the image (30 px ≈ 22.5 pt, plus a margin); the row without a photo keeps its height.
  assert.ok((sheet.getRow(3).height ?? 0) >= 30 * 0.75, "the photo row is as tall as the image")
  // The header row is styled as every export's.
  assert.equal(sheet.getRow(2).font?.bold, true)
})

test("a photo that is not an image still writes ไม่มีรูป, never a failure", async () => {
  const buffer = await buildDisposalRoundReport({
    roundNo: "DPR-20261105-0002",
    executionDate: new Date("2026-01-31T00:00:00.000Z"),
    machines: [{ assetTag: "IT-0003", assetName: "PC", serialNumber: "SN-3", photo: Buffer.from("not an image") }],
  })
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)
  const sheet = workbook.getWorksheet("รายการ")!
  assert.equal(sheet.getImages().length, 0)
  assert.equal(sheet.getCell("E3").value, "ไม่มีรูป")
  assert.equal(sheet.getCell("A1").value, "รอบตัดจำหน่าย DPR-20261105-0002 · วันที่ 31/1/2569")
})

test("the date is the Bangkok day in the Buddhist year; the file name carries the round and the date", () => {
  assert.equal(formatDisposalRoundReportDate(new Date("2026-11-04T18:00:00.000Z")), "5/11/2569")
  assert.equal(disposalRoundReportFileName("DPR-20261105-0001", new Date("2026-11-05T00:00:00.000Z")), "รอบตัดจำหน่าย-DPR-20261105-0001-2026-11-05.xlsx")
})

test("loadRoundReportPhoto: a missing file, a path outside the upload folder and a broken image give null", async () => {
  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads")
  assert.equal(await loadRoundReportPhoto(path.join(uploadRoot, "no-such-dir", "no-such-photo.jpg")), null)
  assert.equal(await loadRoundReportPhoto(path.resolve(process.cwd(), "package.json")), null)
  assert.equal(await loadRoundReportPhoto(""), null)
})

test("the photos: the first image only when it is JPG, PNG, WEBP or GIF, read at most 4 at a time", async () => {
  assert.equal(ROUND_REPORT_PHOTO_CONCURRENCY, 4)
  const machines = Array.from({ length: 10 }, (_, index) => ({ requestId: `r${index}`, firstPhotoId: index === 9 ? null : `a${index}` }))
  const rows = machines.flatMap((machine, index) => machine.firstPhotoId
    ? [{ id: machine.firstPhotoId, filePath: `/uploads/${index}`, fileType: index === 1 ? "image/heic" : index === 2 ? "image/gif" : "image/jpeg" }]
    : [])
  const reads: unknown[] = []
  const db = {
    attachment: {
      async findMany(args: { where: { id: { in: string[] } } }) {
        reads.push(args)
        return rows.filter((row) => args.where.id.in.includes(row.id))
      },
    },
  }
  let inFlight = 0
  let peak = 0
  const loaded: string[] = []
  const photos = await loadDisposalRoundReportPhotos(db, machines, async (filePath) => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 5))
    inFlight -= 1
    loaded.push(filePath)
    return filePath === "/uploads/3" ? null : Buffer.from(filePath)
  })
  assert.equal(reads.length, 1, "one attachment read")
  assert.equal(peak, 4, "four at a time")
  assert.ok(!loaded.includes("/uploads/1"), "a HEIC is not converted")
  assert.ok(loaded.includes("/uploads/2"), "a GIF is")
  assert.equal(photos.length, 10)
  assert.equal(photos[1], null)
  assert.equal(photos[3], null)
  assert.equal(photos[9], null)
  assert.equal(photos[0]?.toString(), "/uploads/0")
})

test("the report route: disposal:view first, the round's file name through workbookResponse, the shared pool", () => {
  const route = read("src/app/api/disposal-rounds/[id]/report/route.ts")
  const get = route.slice(route.indexOf("export async function GET("))
  const gate = `requirePermission(user, "disposal", "view")`
  assert.ok(get.includes(gate))
  assert.ok(get.indexOf(gate) < get.indexOf("prisma"), "the permission before any read")
  assert.match(get, /workbookResponse\(buffer, disposalRoundReportFileName\(detail\.round\.roundNo, detail\.round\.executionDate\)\)/)
  assert.ok(get.includes("loadDisposalRoundReportPhotos(prisma, detail.machines)"))
  assert.ok(route.includes(`export const runtime = "nodejs"`))
  // Classified as a disposal:view route.
  assert.match(read("src/lib/rbac-route-matrix.ts"), /filePath: "src\/app\/api\/disposal-rounds\/\[id\]\/report\/route\.ts",\n\s+label: "[^"]+",\n\s+checks: \[\{ module: "disposal", action: "view" \}\]/)
})

test("the disposal export: Thai headers through messages with รหัสทรัพย์สิน and เลขที่รอบ, never Asset Tag", () => {
  const columns = buildDisposalExportColumns((key) => message(`disposalPage.export.${key}`))
  const headers = columns.map((column) => column.header)
  assert.ok(headers.includes("รหัสทรัพย์สิน"))
  assert.ok(headers.includes("เลขที่รอบ"))
  assert.ok(!headers.includes("Asset Tag"))
  assert.ok(headers.every((header) => !header.startsWith("disposalPage.")), "every header has its words")
  assert.deepEqual(columns.slice(0, 3).map((column) => column.key), ["disposalNo", "roundNo", "assetTag"])
  const route = read("src/app/api/disposal-requests/export/route.ts")
  assert.ok(!route.includes("Asset Tag"))
  assert.ok(route.includes("round: { select: { roundNo: true } }"))
  assert.ok(route.includes("buildDisposalExportColumns("))
  // Type, status and source in words, not keys.
  for (const call of ["types.${item.disposalType}", "statuses.${item.requestStatus}", "readDisposalSourceLinks("]) assert.ok(route.includes(call), call)
})

test("the bell's approved line names the round", () => {
  assert.equal(message("notifications.approvedDisposalsDetail"), "ยังไม่ได้บันทึกในรอบตัดจำหน่าย")
})

test("the system log has words for the round", () => {
  for (const [key, words] of [
    ["systemLogPage.module_disposal_round", "รอบตัดจำหน่าย"],
    ["systemLogPage.action_create_round", "สร้างรอบตัดจำหน่าย"],
    ["systemLogPage.field_roundId", "รอบตัดจำหน่าย"],
    ["systemLogPage.field_roundNo", "เลขที่รอบ"],
    ["systemLogPage.field_fromDisposalType", "วิธีที่ขอ"],
    ["disposalPage.rounds.form.approvedBy", "ผู้อนุมัติ: {name}"],
  ]) assert.equal(message(key), words, key)
})
