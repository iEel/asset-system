// Disposal rounds and the accounting Excel (group 6 plan 4: boards DP-Queue, DP-Round-New, DP-Round; spec §10–§11).
// - Three approved requests, asked as บริจาค, ตัดจำหน่าย and บริจาค: the IT head who approved them sees each tick
//   disabled "คุณอนุมัติรายการนี้"; IT staff tick them on the approved tab, press "สร้างรอบตัดจำหน่าย 3 รายการ", choose
//   ขาย (which changes the method of all 3), fill the buyer, the document and the lump price 3,000.00, check, and save
//   all three in one round. Each request reads ตัดจำหน่ายแล้ว with method ขาย and links the round; the rounds list
//   shows it.
// - The round's accounting Excel: one row and one photo per machine (every request carries the suite's PNG).
// - The retired per-row and bulk execution answer 410 (P4-R1).
// - A selection that went stale: a request rejected meanwhile is named in the check and the round waits.
// - The phone: the approved tab has no ticks and says the round is made on a computer; the round page shows cards.
// axe runs on every page each test records (the queue, the create page, the round page), in both themes across the
// four projects.
import ExcelJS from "exceljs"
import { asUser, expect, test } from "../support/fixtures.ts"
import { recordSettled } from "../audit/settle.ts"
import { readRunData } from "../support/state.ts"
import { createInboxRequest, type InboxRequest } from "../approvals/approvals-support.ts"
import {
  actAs,
  approvedTab,
  checkRoundButton,
  chooseMethod,
  createAssets,
  createRoom,
  createRound,
  escapeRegExp,
  openRoundForm,
  readAssetChoices,
  recordPrefix,
  writeRoundSelection,
  type SavedRound,
} from "./disposal-support.ts"

asUser("itStaff")
// The Excel and the retired paths read the first test's round: one after the other.
test.describe.configure({ mode: "serial" })

let round: SavedRound | null = null
let roundRequests: InboxRequest[] = []

// The method each request was asked as (the round's ขาย replaces all three).
const ASKED = ["donate", "dispose", "donate"] as const

test("IT staff record three approved requests in one disposal round as ขาย with a lump price; the approver cannot tick them", async ({ page, measure, e2eTheme, e2eDevice }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP7")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบรอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`, `${prefix}-A3`])
  roundRequests = []
  for (const [index, asset] of assets.entries()) {
    roundRequests.push(await createInboxRequest(page, asset, "itStaff", `${prefix} คำขอที่ ${index + 1} ชำรุดเกินซ่อม เสนอตัดจำหน่าย`, true, ASKED[index]))
  }

  // 1. The IT head approves the three (through the decision API the request page posts to).
  await actAs(page, "itHead", e2eTheme)
  for (const request of roundRequests) {
    const decision = await page.request.patch(`/api/disposal-requests/${request.id}`, { data: { decision: "approve", approvalRemark: null } })
    expect(decision.status(), await decision.text()).toBe(200)
  }

  // The IT head approved them, so they cannot record them (segregation of duties): on the computer each tick is
  // disabled with the reason; the phone has no ticks at all. The round's preview blocks them too.
  await measure.visit(approvedTab(prefix), "IT head: the approved tab, their own approvals")
  if (e2eDevice === "phone") {
    await expect(page.locator("[data-disposal-round-tick]").filter({ visible: true })).toHaveCount(0)
    await expect(page.locator("[data-disposal-round-phone-note]")).toHaveText("สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์")
  } else {
    for (const request of roundRequests) {
      const own = page.getByRole("checkbox", { name: new RegExp(`^เลือก ${escapeRegExp(request.asset.name)} · DP-\\d{8}-\\d{4} \\(คุณอนุมัติรายการนี้\\)$`) })
      await expect(own).toBeDisabled()
    }
    await expect(page.locator("[data-disposal-round-select-all]")).toHaveCount(0)
  }
  const headPreview = await page.request.post("/api/disposal-rounds", { data: { mode: "preview", requestIds: roundRequests.map((request) => request.id) } })
  expect(headPreview.status()).toBe(200)
  const headItems = ((await headPreview.json()) as { items: { outcome: string; code: string | null }[] }).items
  expect(headItems).toEqual(roundRequests.map(() => expect.objectContaining({ outcome: "blocked", code: "DISPOSAL_SOD_CONFLICT" })))

  // 2. IT staff select the three (ticks on the computer) and open สร้างรอบตัดจำหน่าย.
  await actAs(page, "itStaff", e2eTheme)
  await openRoundForm(page, measure, e2eDevice, prefix, roundRequests)
  await expect(page.locator('[data-disposal-round-machine="eligible"]')).toHaveCount(3)
  const machines = page.getByRole("list", { name: "เครื่องในรอบ" })
  await expect(machines.getByText("ขอเป็น: บริจาค")).toHaveCount(2)
  await expect(machines.getByText("ขอเป็น: ตัดจำหน่าย")).toHaveCount(1)
  // Asked under two methods: none is preset (decision 11).
  await expect(page.getByRole("radio", { name: "ขาย", exact: true })).not.toBeChecked()

  // 3. ขาย changes the method of all three. A check with nothing else filled first: the buyer, the document and the
  // lump price show their errors under the fields, and nothing is saved.
  await chooseMethod(page, "ขาย")
  await expect(page.locator("[data-disposal-round-method-change]")).toHaveText("จะเปลี่ยนวิธีของ 3 คำขอเป็น ขาย")
  await expect(page.locator("#disposal-round-sale-value")).toBeVisible()
  await checkRoundButton(page).click()
  await expect(page.locator("#disposal-round-recipient-error")).toBeVisible()
  await expect(page.locator("#disposal-round-document-error")).toHaveText("กรุณากรอกเลขที่เอกสารอ้างอิง")
  await expect(page.locator("#disposal-round-sale-value-error")).toBeVisible()
  await expect(page.locator("#disposal-round-recipient")).toBeFocused()
  await recordSettled(page, measure, "IT staff: the round's missing entries under the fields")

  round = await createRound(page, measure, { method: "ขาย", recipient: `${prefix} ผู้ซื้อซาก`, documentNo: `${prefix}-DOC`, saleValue: "3000.00" }, 3)

  // 4. The round's page: its three machines (a table on the computer, cards on the phone), the lump price, the report.
  const main = page.getByRole("main")
  if (e2eDevice === "phone") {
    await expect(main.locator("article").filter({ visible: true })).toHaveCount(3)
    await expect(page.locator("[data-disposal-round-row]").filter({ visible: true })).toHaveCount(0)
  } else {
    await expect(page.locator("[data-disposal-round-row]")).toHaveCount(3)
  }
  for (const request of roundRequests) await expect(main).toContainText(request.asset.assetTag)
  await expect(main).toContainText("เครื่องในรอบ (3)")
  await expect(main).toContainText("3,000.00")
  await expect(main).toContainText(`${prefix}-DOC`)
  const report = page.locator("[data-disposal-round-report]")
  await expect(report).toHaveText("ส่งออกรายงานส่งบัญชี")
  await expect(report).toHaveAttribute("href", `/api/disposal-rounds/${round.id}/report`)

  // 5. Each request reads ตัดจำหน่ายแล้ว, with method ขาย, the round's lump price, and the round's link.
  for (const [index, request] of roundRequests.entries()) {
    await measure.visit(`/th/disposal/${request.id}`, `IT staff: request ${index + 1} of the round`)
    await expect(page.getByRole("main").getByText("ตัดจำหน่ายแล้ว").filter({ visible: true }).first()).toBeVisible()
    const execution = page.locator('[data-disposal-panel="execution"]')
    await expect(execution.locator("[data-disposal-execution-round]")).toHaveText(round.roundNo)
    await expect(execution.locator("[data-disposal-execution-round]")).toHaveAttribute("href", round.path)
    await expect(execution.locator("dd").filter({ hasText: /^ขาย$/ })).toHaveCount(1)
    await expect(execution).toContainText("ราคาขายเหมาของรอบ 3,000.00 บาท · 3 เครื่อง")
    const assetRead = await page.request.get(`/api/assets/${request.asset.id}`)
    expect(((await assetRead.json()) as { status?: { name?: string } }).status?.name).toBe("Disposed")
  }

  // 6. The rounds list shows the round; the queue's disposed tab links each request to it.
  await measure.visit(`/th/disposal/rounds?search=${encodeURIComponent(round.roundNo)}`, "IT staff: the disposal rounds")
  // The table row on the computer (named by the number), the card on the phone (its title links the round).
  await expect(page.getByRole("main")).toContainText(round.roundNo)
  const roundLink = page.getByRole("link", { name: new RegExp(escapeRegExp(round.roundNo)) }).or(page.locator(`a[href="${round.path}"]`))
  await expect(roundLink.filter({ visible: true }).first()).toBeVisible()
  await measure.visit(`/th/disposal?status=disposed&search=${encodeURIComponent(prefix)}`, "IT staff: the disposed tab")
  await expect(page.getByRole("main")).toContainText(round.roundNo)
})

test("the round's accounting Excel lists each machine with its photo, and the retired execution answers 410", async ({ page, measure }) => {
  expect(round, "the round test saved a round").not.toBeNull()
  const saved = round as SavedRound
  await measure.visit(saved.path, "IT staff: the round, for its report")
  const href = await page.locator("[data-disposal-round-report]").getAttribute("href")
  expect(href).toBe(`/api/disposal-rounds/${saved.id}/report`)

  // The file the link downloads, read as a spreadsheet program would: sheet รายการ, the title, the headers, one row
  // per machine and one picture per machine (each request carries the suite's PNG).
  const response = await page.request.get(href ?? "")
  expect(response.status()).toBe(200)
  expect(response.headers()["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  expect(response.headers()["content-disposition"] ?? "").toContain(".xlsx")
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load((await response.body()) as unknown as ArrayBuffer)
  const sheet = workbook.getWorksheet("รายการ")
  if (!sheet) throw new Error("the report has no sheet รายการ")
  expect(String(sheet.getRow(1).getCell(1).value ?? "")).toContain(saved.roundNo)
  expect([1, 2, 3, 4, 5].map((column) => String(sheet.getRow(2).getCell(column).value ?? ""))).toEqual(["ลำดับ", "รหัสทรัพย์สิน", "ชื่อทรัพย์สิน", "Serial", "รูป"])
  const tags: string[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) tags.push(String(row.getCell(2).value ?? ""))
  })
  expect(tags.sort()).toEqual(roundRequests.map((request) => request.asset.assetTag).sort())
  expect(sheet.getImages()).toHaveLength(3)

  // Per-row and bulk execution are retired (P4-R1): a stale client is told to use a round.
  const [request] = roundRequests
  const execute = await page.request.patch(`/api/disposal-requests/${request.id}`, { data: { action: "execute" } })
  expect(execute.status()).toBe(410)
  expect(((await execute.json()) as { code?: string }).code).toBe("DISPOSAL_USE_ROUND")
  const bulk = await page.request.post("/api/disposal-requests/bulk-execution", { data: {} })
  expect(bulk.status()).toBe(410)
  expect(((await bulk.json()) as { code?: string }).code).toBe("DISPOSAL_USE_ROUND")
})

test("a request rejected after it was selected is named in the round's check, and the round waits until it is taken out", async ({ page, measure, e2eTheme }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP8")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบรอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])
  const [kept, stale] = [
    await createInboxRequest(page, assets[0], "itStaff", `${prefix} คำขอที่ยังอนุมัติอยู่ ชำรุดเกินซ่อม`),
    await createInboxRequest(page, assets[1], "itStaff", `${prefix} คำขอที่ไม่อนุมัติภายหลัง ชำรุดเกินซ่อม`),
  ]
  await actAs(page, "itHead", e2eTheme)
  const approve = await page.request.patch(`/api/disposal-requests/${kept.id}`, { data: { decision: "approve", approvalRemark: null } })
  expect(approve.status(), await approve.text()).toBe(200)
  const reject = await page.request.patch(`/api/disposal-requests/${stale.id}`, { data: { decision: "reject", approvalRemark: `${prefix} ไม่อนุมัติ` } })
  expect(reject.status(), await reject.text()).toBe(200)

  // The browser still holds a selection naming both (the selection travels in sessionStorage, P4-R2, and is not
  // re-read against the request's state until the round page checks it).
  await actAs(page, "itStaff", e2eTheme)
  await measure.visit(approvedTab(prefix), "IT staff: the approved tab")
  await writeRoundSelection(page, prefix, [kept.id, stale.id])
  await page.goto("/th/disposal/rounds/new", { waitUntil: "load" })
  await expect(page.locator("[data-disposal-round-machine]")).toHaveCount(2)
  const blocked = page.locator('[data-disposal-round-machine="blocked"]')
  await expect(blocked).toHaveCount(1)
  await expect(blocked).toContainText(stale.asset.name)
  await expect(blocked).toContainText("คำขอไม่อยู่ในสถานะอนุมัติแล้ว")
  await expect(page.locator("[data-disposal-round-blocked]")).toContainText("บันทึกในรอบนี้ไม่ได้ 1 รายการ")
  await expect(page.locator("[data-disposal-round-footer]").first()).toHaveText("บันทึกไม่ได้ 1 รายการ · นำออกก่อนบันทึก")
  await expect(checkRoundButton(page)).toBeDisabled()
  await recordSettled(page, measure, "IT staff: the stale request named in the round")

  // The server refuses the whole round as well, naming the machine (all or nothing).
  const commit = await page.request.post("/api/disposal-rounds", {
    data: {
      mode: "commit",
      requestIds: [kept.id, stale.id],
      disposalType: "dispose",
      // The UTC day is never after the Bangkok day.
      executionDate: new Date().toISOString().slice(0, 10),
      executedById: readRunData().employees.itStaff.id,
      recipientName: `${prefix} ผู้รับซาก`,
      documentNo: `${prefix}-DOC`,
      saleValue: null,
      remark: "",
      useHistoricalEvidenceException: false,
      evidenceExceptionReason: null,
    },
  })
  const commitBody = (await commit.json()) as { code?: string; items?: { requestId: string; outcome: string; code: string | null }[] }
  expect(commit.status(), JSON.stringify(commitBody).slice(0, 300)).toBe(409)
  expect(commitBody.code).toBe("DISPOSAL_ROUND_BLOCKED")
  expect(commitBody.items?.find((item) => item.requestId === stale.id)).toEqual(expect.objectContaining({ outcome: "blocked", code: "DISPOSAL_INVALID_STAGE" }))

  // Taking it out lets the round be checked.
  await page.getByRole("button", { name: "นำรายการที่บันทึกไม่ได้ออกทั้งหมด" }).click()
  await expect(page.locator("[data-disposal-round-machine]")).toHaveCount(1)
  await expect(page.locator('[data-disposal-round-machine="eligible"]')).toContainText(kept.asset.name)
  await expect(checkRoundButton(page)).toBeEnabled()
})
