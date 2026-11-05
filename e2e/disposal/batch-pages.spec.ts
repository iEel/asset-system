// The request-batch pages (request batches spec §4–§6: boards DP-Batch-New, DP-Batch, DP-Batches).
// - The form (desktop only): IT staff pick three machines (one with a Serial), give one its own photo, add the lot photo,
//   and the count line names the split; the send has no review step and lands on the batch page. The phone shows only
//   "สร้างชุดคำขอได้บนคอมพิวเตอร์", so a phone test makes the same batch through the API the form posts to.
// - The batch page: the machine with a photo shows its thumbnail, the others "ใช้รูปรวม"; the Serial (or –).
//   A machine's request opened from it goes back to the batch page (the back link and the batch-number crumb).
// - The approvals panel: the machine with its own photo opens on that photo, a machine without one on the lot photo.
// - After approval: "สร้างรอบตัดจำหน่ายจากชุดนี้ (3 เครื่อง)" (the computer; the phone reads, with no round button), a
//   round of the three, "ตัดจำหน่ายแล้ว 3/3" with each row's round, and the round's Excel has the own photo on its row.
// - A lost batch: no photo slot per machine, a PDF as the lot file, and it sends.
// - The list finds the batch by its number with "ตัดจำหน่ายแล้ว 3/3".
// axe runs on every page each test records (measure), in both themes across the four projects.
import ExcelJS from "exceljs"
import { asUser, expect, test } from "../support/fixtures.ts"
import { recordSettled } from "../audit/settle.ts"
import { disposalPanel } from "../approvals/approvals-support.ts"
import {
  actAs,
  BATCH_PHONE_NOTE,
  batchLotInput,
  batchMachinePhotoInput,
  batchMachineRow,
  batchPageMachine,
  batchRequestId,
  chooseMethod,
  createAssets,
  createBatchThroughApi,
  createRoom,
  createRound,
  EVIDENCE_PDF,
  PHOTO_PNG,
  pickBatchMachines,
  readAssetChoices,
  recordPrefix,
  sendBatch,
  thumbnailAttachmentId,
  writeRoundSelection,
  type DisposalAsset,
} from "./disposal-support.ts"

asUser("itStaff")
// One batch walks through the tests: made, approved, recorded in a round, then found in the list. A failure skips the rest.
test.describe.configure({ mode: "serial" })

let prefix = ""
let assets: DisposalAsset[] = []
let batchPath = ""
let batchNo = ""
let requestIds: string[] = []
let ownPhotoId = ""
let lotPhotoId = ""

test("IT staff make a batch of three: one machine with its own photo, two on the lot photo, the Serial shown", async ({ page, measure, e2eDevice }, testInfo) => {
  prefix = recordPrefix(testInfo, "DSP9")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบชุดคำขอ`)
  const choices = await readAssetChoices(page, measure)
  const serial = `${prefix}-SN1`
  assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`, `${prefix}-A3`], { [`${prefix}-A1`]: serial })
  const [own, ...onLot] = assets
  const reason = `${prefix} หมดอายุการใช้งาน เสนอตัดจำหน่ายทั้งชุด`

  await measure.visit("/th/disposal/batch/new", "IT staff: new disposal batch")
  if (e2eDevice === "phone") {
    // The form is for the computer: the phone reads the notice, with the single request form beside it.
    await expect(page.locator("[data-disposal-batch-phone]")).toContainText(BATCH_PHONE_NOTE)
    await expect(page.locator("[data-disposal-batch-desktop]")).toBeHidden()
    batchPath = await createBatchThroughApi(page, {
      assets,
      disposalType: "dispose",
      reason,
      machineFiles: { [own.id]: [PHOTO_PNG] },
      lotFiles: [PHOTO_PNG],
    })
    await measure.visit(batchPath, "IT staff: the batch, three requests pending")
  } else {
    await expect(page.locator("[data-disposal-batch-phone]")).toBeHidden()
    await pickBatchMachines(page, `${prefix}-A`, assets)
    // The register's Serial on each row, – when there is none.
    await expect(batchMachineRow(page, own).locator("[data-disposal-batch-serial]")).toHaveText(`Serial ${serial}`)
    for (const asset of onLot) await expect(batchMachineRow(page, asset).locator("[data-disposal-batch-serial]")).toHaveText("Serial –")
    await batchMachinePhotoInput(page, own).setInputFiles(PHOTO_PNG)
    await expect(batchMachineRow(page, own).locator("[data-disposal-queued-photo]")).toHaveCount(1)
    await expect(page.locator("[data-disposal-batch-count]")).toHaveText("3 เครื่อง · มีรูปของเครื่อง 1 · ที่เหลือใช้รูปรวม")
    await batchLotInput(page).setInputFiles(PHOTO_PNG)
    await expect(page.locator("[data-disposal-batch-lot] [data-disposal-queued-photo]")).toHaveCount(1)
    await chooseMethod(page, "ตัดจำหน่าย")
    await page.locator("#disposal-batch-reason").fill(reason)
    await recordSettled(page, measure, "IT staff: the batch form, filled")
    batchPath = await sendBatch(page, measure, 3)
    await recordSettled(page, measure, "IT staff: the batch, three requests pending")
  }

  batchNo = ((await page.getByRole("heading", { level: 1 }).innerText()) ?? "").trim()
  expect(batchNo).toMatch(/^DPB-\d{8}-\d{4}$/)
  // The machine with its own photo shows its thumbnail; the other two read ใช้รูปรวม.
  const ownRow = batchPageMachine(page, e2eDevice, own)
  await expect(ownRow.locator("img")).toHaveCount(1)
  await expect(ownRow.locator("[data-disposal-batch-lot-photo]")).toHaveCount(0)
  ownPhotoId = await thumbnailAttachmentId(ownRow.locator("img"))
  for (const asset of onLot) {
    const row = batchPageMachine(page, e2eDevice, asset)
    await expect(row.locator("[data-disposal-batch-lot-photo]")).toContainText("ใช้รูปรวม")
    await expect(row.locator("img")).toHaveCount(0)
  }
  // The Serial: its own cell on the computer (– when none), beside the tag on the phone's card.
  await expect(ownRow).toContainText(serial)
  if (e2eDevice === "desktop") {
    for (const asset of onLot) await expect(batchPageMachine(page, e2eDevice, asset).locator("td").nth(3)).toHaveText("–")
  }
  // The lot photo, on the side.
  lotPhotoId = await thumbnailAttachmentId(page.locator("aside [data-approval-photos] img").first())
  expect(lotPhotoId).not.toBe(ownPhotoId)
  requestIds = []
  for (const asset of assets) requestIds.push(await batchRequestId(page, e2eDevice, asset))
  // A machine's request, opened from the batch page, goes back to the batch page (its back link and its crumb).
  await batchPageMachine(page, e2eDevice, own).getByRole("link", { name: /^DP-\d{8}-\d{4}$/ }).click()
  await page.waitForURL(/\/th\/disposal\/[0-9a-f-]{36}\?returnTo=/)
  await expect(page.locator('[data-slot="page-back-link"]')).toHaveAttribute("href", batchPath)
  await expect(page.getByRole("navigation", { name: "เส้นทางหน้า" }).getByRole("link", { name: batchNo, exact: true })).toHaveAttribute("href", batchPath)
  await page.locator('[data-slot="page-back-link"]').click()
  await page.waitForURL((url) => url.pathname === batchPath)
})

test("the IT head sees each machine's own photo first in the approvals panel, the lot photo for a machine without one", async ({ page, measure, e2eTheme }) => {
  expect(requestIds, "the batch test made the requests").toHaveLength(3)
  await actAs(page, "itHead", e2eTheme)
  const inboxQueue = `/th/admin/approvals?tab=disposal&search=${encodeURIComponent(prefix)}`
  const [ownId, lotId] = requestIds
  await measure.visit(`${inboxQueue}&item=${encodeURIComponent(`disposal:${ownId}`)}`, "IT head: the machine with its own photo in the panel")
  const ownPanel = disposalPanel(page, ownId).filter({ visible: true })
  await expect(ownPanel.locator("[data-approval-photos]")).toContainText("รูปที่ 1 / 2")
  expect(await thumbnailAttachmentId(ownPanel.locator("[data-approval-photos] img").first())).toBe(ownPhotoId)
  await measure.visit(`${inboxQueue}&item=${encodeURIComponent(`disposal:${lotId}`)}`, "IT head: a machine on the lot photo in the panel")
  const lotPanel = disposalPanel(page, lotId).filter({ visible: true })
  await expect(lotPanel.locator("[data-approval-photos]")).toContainText("รูปที่ 1 / 1")
  expect(await thumbnailAttachmentId(lotPanel.locator("[data-approval-photos] img").first())).toBe(lotPhotoId)
  // The three are approved (the bulk approval's own test walks the panel's buttons).
  for (const id of requestIds) {
    const approve = await page.request.patch(`/api/disposal-requests/${id}`, { data: { decision: "approve", approvalRemark: null } })
    expect(approve.status(), await approve.text()).toBe(200)
  }
})

test("IT staff record the batch in a round from its page: ตัดจำหน่ายแล้ว 3/3, each row's round, and the own photo in the Excel", async ({ page, measure, e2eDevice }) => {
  expect(requestIds, "the batch test made the requests").toHaveLength(3)
  await measure.visit(batchPath, "IT staff: the approved batch")
  const roundButton = page.getByRole("button", { name: "สร้างรอบตัดจำหน่ายจากชุดนี้ (3 เครื่อง)" })
  if (e2eDevice === "phone") {
    // The phone reads the batch as cards, with no round button; the round is made on the computer, so the test leaves
    // the selection the button would.
    for (const asset of assets) await expect(batchPageMachine(page, e2eDevice, asset).locator("article")).toBeVisible()
    await expect(roundButton.filter({ visible: true })).toHaveCount(0)
    await expect(page.locator("[data-disposal-batch-round-phone-note]")).toHaveText("สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์")
    await writeRoundSelection(page, "", requestIds)
    await page.goto("/th/disposal/rounds/new", { waitUntil: "load" })
  } else {
    await measure.timed("IT staff: open the round from the batch", async () => {
      await roundButton.click()
      await page.waitForURL(/\/th\/disposal\/rounds\/new$/)
    })
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("สร้างรอบตัดจำหน่าย")
  await expect(page.locator('[data-disposal-round-machine="eligible"]')).toHaveCount(3)
  await recordSettled(page, measure, "IT staff: new disposal round from the batch")
  const round = await createRound(page, measure, { method: "ตัดจำหน่าย", recipient: `${prefix} ผู้รับซาก`, documentNo: `${prefix}-DOC` }, 3)

  await measure.visit(batchPath, "IT staff: the batch, disposed")
  await expect(page.getByRole("main").getByText("ตัดจำหน่ายแล้ว 3/3").first()).toBeVisible()
  for (const asset of assets) {
    await expect(batchPageMachine(page, e2eDevice, asset).getByRole("link", { name: new RegExp(`^${round.roundNo}`) })).toHaveAttribute("href", round.path)
  }
  await expect(page.getByRole("button", { name: /^สร้างรอบตัดจำหน่ายจากชุดนี้/ })).toHaveCount(0)

  // The round's Excel: the machine with its own photo has a picture on its row (the round report's photo column).
  const response = await page.request.get(`/api/disposal-rounds/${round.id}/report`)
  expect(response.status()).toBe(200)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load((await response.body()) as unknown as ArrayBuffer)
  const sheet = workbook.getWorksheet("รายการ")
  if (!sheet) throw new Error("the report has no sheet รายการ")
  let ownRow = 0
  sheet.eachRow((row, rowNumber) => {
    if (String(row.getCell(2).value ?? "") === assets[0].assetTag) ownRow = rowNumber
  })
  expect(ownRow, "the own-photo machine's row").toBeGreaterThan(2)
  const rowsWithImages = sheet.getImages().map((image) => (image.range.tl as unknown as { nativeRow: number }).nativeRow + 1)
  expect(rowsWithImages).toContain(ownRow)
})

test("a lost batch takes a PDF as the lot file, has no photo slot per machine, and sends", async ({ page, measure, e2eDevice }, testInfo) => {
  const lostPrefix = recordPrefix(testInfo, "DSP10")
  const roomId = await createRoom(`${lostPrefix}-R`, `${lostPrefix} ห้องทดสอบชุดคำขอสูญหาย`)
  const choices = await readAssetChoices(page, measure)
  const lost = await createAssets(page, choices, roomId, [`${lostPrefix}-A1`, `${lostPrefix}-A2`])
  const reason = `${lostPrefix} หาไม่พบระหว่างตรวจนับ แจ้งความแล้ว`
  let path = ""
  if (e2eDevice === "phone") {
    path = await createBatchThroughApi(page, { assets: lost, disposalType: "lost", reason, lotFiles: [EVIDENCE_PDF] })
    await measure.visit(path, "IT staff: the lost batch")
  } else {
    await measure.visit("/th/disposal/batch/new", "IT staff: new disposal batch (lost)")
    await pickBatchMachines(page, `${lostPrefix}-A`, lost)
    await chooseMethod(page, "สูญหาย")
    // A lost machine cannot be photographed: no slot per machine, the lot's file covers each.
    await expect(page.locator("[data-disposal-batch-machine-photo]")).toHaveCount(0)
    await batchLotInput(page).setInputFiles(EVIDENCE_PDF)
    await expect(page.locator("[data-disposal-batch-lot]")).toContainText("evidence.pdf")
    await page.locator("#disposal-batch-reason").fill(reason)
    await recordSettled(page, measure, "IT staff: the lost batch form, filled")
    path = await sendBatch(page, measure, 2)
    await recordSettled(page, measure, "IT staff: the lost batch")
  }
  expect(path).toMatch(/^\/th\/disposal\/batches\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("main").getByText("evidence.pdf").first()).toBeVisible()
  for (const asset of lost) await expect(batchPageMachine(page, e2eDevice, asset)).toBeVisible()
})

test("the batch list finds the batch by its number with ตัดจำหน่ายแล้ว 3/3", async ({ page, measure }) => {
  expect(batchNo, "the batch test made the batch").toMatch(/^DPB-/)
  await measure.visit(`/th/disposal/batches?q=${encodeURIComponent(batchNo)}`, "IT staff: the batch list, searched")
  const progress = page.locator("[data-batch-progress]").filter({ visible: true })
  await expect(progress).toHaveCount(1)
  await expect(progress).toContainText("ตัดจำหน่ายแล้ว 3/3")
  await expect(page.getByRole("main").getByText(batchNo).filter({ visible: true }).first()).toBeVisible()
  await expect(page.locator("[data-batch-strip]")).toBeVisible()
})
