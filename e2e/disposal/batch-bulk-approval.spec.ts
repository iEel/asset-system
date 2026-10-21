// Disposal of a batch of two (spec §6.4.1–3, §6.7): IT staff request both in one batch with shared evidence, the IT
// head approves them in one bulk approval, and IT staff execute them. On the way: the batch form's wrong entry first;
// the IT head's own request is refused approval by the same IT head (the requester cannot approve their own request);
// the approver's bulk execution is blocked (the approver cannot execute).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import {
  actAs,
  chooseSearchable,
  createAssets,
  createRoom,
  employeeLabel,
  escapeRegExp,
  EVIDENCE_PDF,
  expectToast,
  openBulkExecutionPreview,
  readAssetChoices,
  recordPrefix,
  visibleButton,
  type DisposalAsset,
} from "./disposal-support.ts"

asUser("itStaff")
// One batch walks through four tests: the bulk approval, one execution on its page, the approver's blocked bulk
// execution (finding D3) and IT staff's bulk execution (finding D2). Each needs the one before (an expected failure
// lets the next run); an unexpected failure skips the rest.
test.describe.configure({ mode: "serial" })

let batchAssets: DisposalAsset[] = []
let requestPaths: Record<string, string> = {}
let queueSearch = ""

test("IT staff request two disposals in one batch with shared evidence, and the IT head approves them in one go but not their own", async ({ page, measure, e2eTheme, e2eDevice }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP2")
  queueSearch = prefix
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`, `${prefix}-A3`])
  batchAssets = assets.slice(0, 2)
  const own = assets[2]

  // 1. IT staff make the batch: both assets, the shared evidence, and a reason. Review without a requester first: the
  // error shows under the requester and the review waits.
  await measure.visit("/th/disposal/batch/new", "IT staff: new disposal batch")
  const search = page.getByPlaceholder("ค้นหารหัสหรือชื่อทรัพย์สิน")
  await search.fill(`${prefix}-A`)
  for (const asset of batchAssets) await page.getByRole("option", { name: new RegExp(escapeRegExp(asset.assetTag)) }).click()
  await expect(page.getByText("เลือกแล้ว 2 รายการ")).toBeVisible()
  await page.locator("#disposal-batch-reason").fill(`${prefix} หมดอายุการใช้งาน เสนอตัดจำหน่ายทั้งชุด`)
  await page.locator('input[type="file"]').first().setInputFiles(EVIDENCE_PDF)
  await expect(page.getByText("evidence.pdf")).toBeVisible()
  await page.getByRole("button", { name: "ตรวจสอบชุดคำขอ" }).click()
  await expect(page.locator("#disposal-batch-requested-by-error")).toHaveText("กรุณาระบุข้อมูลนี้")
  await expect(page.locator("#disposal-batch-requested-by")).toBeFocused()
  await measure.recordPage("IT staff: the missing requester under the field")
  await chooseSearchable(page, "disposal-batch-requested-by", employeeLabel("itStaff"))
  await page.getByRole("button", { name: "ตรวจสอบชุดคำขอ" }).click()
  await expect(page.getByRole("heading", { name: "ตรวจสอบก่อนสร้างชุดคำขอ" })).toBeVisible()
  for (const asset of batchAssets) await expect(page.getByText(`${asset.assetTag} - ${asset.name}`)).toBeVisible()
  await measure.recordPage("IT staff: the batch review")
  await measure.timed("IT staff: create the batch", async () => {
    await page.getByRole("button", { name: "ยืนยันสร้างชุดคำขอ" }).click()
    await page.waitForURL(/\/th\/disposal\/batches\/[0-9a-f-]{36}$/)
  })
  await expectToast(page, "สร้างชุดคำขอ 2 รายการสำเร็จ")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^DPB-\d{8}-\d{4}$/)
  await expect(page.getByText("evidence.pdf")).toBeVisible()
  await measure.recordPage("IT staff: the batch, two requests pending")
  // Each request's page, read off the batch's list.
  requestPaths = {}
  for (const asset of batchAssets) {
    const href = await page
      .getByRole("main")
      .locator(e2eDevice === "phone" ? "li" : "tr")
      .filter({ hasText: asset.assetTag })
      .locator("a[href*='/th/disposal/']")
      .first()
      .getAttribute("href")
    requestPaths[asset.assetTag] = new URL(href ?? "", page.url()).pathname
  }

  // 2. The IT head's own request (made through the API they would post it with), for the refusal below.
  await actAs(page, "itHead", e2eTheme)
  const ownRequest = await page.request.post("/api/disposal-requests", {
    data: {
      assetId: own.id,
      disposalType: "dispose",
      reason: `${prefix} คำขอของหัวหน้า IT เอง`,
      requestedById: readRunData().employees.itHead.id,
      approverId: null,
      saleValue: null,
      salvageValue: null,
      sourceType: null,
      sourceId: null,
    },
  })
  expect(ownRequest.status(), await ownRequest.text()).toBe(201)
  const ownRequestId = ((await ownRequest.json()) as { id: string }).id

  // 3. The IT head's pending queue: the batch's two are selectable, their own request is not, with the reason shown.
  await measure.visit(`/th/disposal?status=pending&search=${encodeURIComponent(prefix)}`, "IT head: pending disposals")
  if (e2eDevice === "phone") await page.getByRole("button", { name: "เลือกหลายรายการ" }).click()
  await expect(page.getByRole("note", { name: "ไม่สามารถอนุมัติได้เนื่องจากขัดกับการแยกหน้าที่" }).filter({ visible: true })).toHaveCount(1)
  for (const asset of batchAssets) {
    await page.getByRole("checkbox", { name: new RegExp(`ทรัพย์สิน ${escapeRegExp(asset.assetTag)}$`) }).filter({ visible: true }).check()
  }
  // The toolbar's count (its live region says the same to a screen reader).
  await expect(page.locator("div").filter({ hasText: /^เลือกแล้ว 2 รายการ$/ }).filter({ visible: true })).toHaveCount(1)
  await page.getByRole("button", { name: "ตรวจสอบและอนุมัติ" }).click()
  const bulk = page.getByRole("dialog", { name: "ตรวจสอบก่อนอนุมัติแบบกลุ่ม" })
  await expect(bulk.getByRole("button", { name: "ยืนยันอนุมัติ 2 รายการ" })).toBeVisible()
  await bulk.locator("#disposal-bulk-approval-remark").fill(`${prefix} อนุมัติทั้งชุด`)
  await measure.recordPage("IT head: the bulk approval's preview")
  await measure.timed("IT head: approve the two", async () => {
    await bulk.getByRole("button", { name: "ยืนยันอนุมัติ 2 รายการ" }).click()
    await expect(page.getByRole("dialog", { name: "ผลการอนุมัติแบบกลุ่ม" })).toBeVisible()
  })
  const result = page.getByRole("dialog", { name: "ผลการอนุมัติแบบกลุ่ม" })
  await expect(result.getByRole("heading", { name: "อนุมัติแล้ว (2)" })).toBeVisible()
  for (const asset of batchAssets) await expect(result.getByText(asset.assetTag)).toBeVisible()
  await measure.recordPage("IT head: the bulk approval's result")
  await result.getByRole("button", { name: "ปิด" }).first().click()
  await expect(result).toHaveCount(0)

  // Their own request stays pending: no review on its page, and the bulk preview blocks it for segregation of duties.
  await measure.visit(`/th/disposal/${ownRequestId}`, "IT head: their own request")
  await expect(page.getByRole("main").getByText("รอพิจารณา").first()).toBeVisible()
  await expect(visibleButton(page, "พิจารณาคำขอ")).toHaveCount(0)
  const ownPreview = await page.request.post("/api/disposal-requests/bulk-decision", { data: { mode: "preview", requestIds: [ownRequestId] } })
  expect(ownPreview.status()).toBe(200)
  const ownItems = ((await ownPreview.json()) as { items: { outcome: string; code: string | null }[] }).items
  expect(ownItems).toEqual([expect.objectContaining({ outcome: "blocked", code: "DISPOSAL_SOD_CONFLICT" })])

  // The batch's two are approved.
  await measure.visit(`/th/disposal?status=approved&search=${encodeURIComponent(prefix)}`, "IT head: approved disposals")
  for (const asset of batchAssets) await expect(page.getByRole("main").getByText(asset.assetTag).filter({ visible: true }).first()).toBeVisible()
})

test("IT staff execute one batch request on its page with the batch's shared evidence", async ({ page, measure }) => {
  const [asset] = batchAssets
  const path = requestPaths[asset.assetTag]
  expect(path, "the batch test read the request's page").toBeTruthy()
  await measure.visit(path, "IT staff: an approved batch request")
  await expect(page.getByRole("main").getByText("อนุมัติแล้ว รอตัดจำหน่าย").first()).toBeVisible()
  // The batch's evidence counts for the request: the execution has no evidence notice.
  await visibleButton(page, "บันทึกตัดจำหน่ายจริง").click()
  const execution = page.getByRole("dialog", { name: "บันทึกผลการตัดจำหน่ายจริง" })
  await expect(execution.getByText("กรุณาแนบหลักฐานก่อนบันทึกการตัดจำหน่ายจริง")).toHaveCount(0)
  await chooseSearchable(page, "disposal-execution-executed-by", employeeLabel("itStaff"))
  await execution.locator("#disposal-execution-recipient").fill(`${queueSearch} ผู้รับซาก`)
  await execution.locator("#disposal-execution-document-no").fill(`${asset.assetTag}-DOC`)
  await measure.recordPage("IT staff: the execution of a batch request")
  await measure.timed("IT staff: save the execution", async () => {
    await execution.getByRole("button", { name: "บันทึกผล" }).click()
    await expect(execution).toHaveCount(0)
  })
  await expectToast(page, "บันทึกผลการตัดจำหน่ายจริงสำเร็จ")
  await expect(page.getByRole("main").getByText("ตัดจำหน่ายแล้ว").first()).toBeVisible()
  await measure.recordPage("IT staff: the executed batch request")
})

// Finding D3: a dialog body that scrolls with nothing focusable in it cannot be scrolled from the keyboard (axe
// scrollable-region-focusable, serious; AccessibleDialogBody, src/components/ui/accessible-dialog.tsx). The bulk
// execution preview with nothing to execute is one: here the approver's own preview, which segregation of duties blocks
// (the approver cannot execute, in bulk too). Expected to fail until fixed.
test("the approver's bulk execution preview is blocked with the reason, and its body scrolls from the keyboard (finding D3)", async ({ page, measure, e2eTheme }) => {
  // Finding D3 fixed (FX3): this test now keeps a scrolling dialog body reachable from the keyboard.
  const asset = batchAssets[1]
  expect(asset, "the batch test made the request").toBeTruthy()
  await actAs(page, "itHead", e2eTheme)
  await measure.visit(`/th/disposal?status=approved&search=${encodeURIComponent(asset.assetTag)}`, "IT head: approved disposals")
  const dialog = await openBulkExecutionPreview(page, asset, employeeLabel("itStaff"), `${queueSearch} ผู้รับซาก`)
  await expect(dialog.getByText("ไม่สามารถดำเนินการได้เนื่องจากขัดกับการแยกหน้าที่").first()).toBeVisible()
  await expect(dialog.getByRole("alert")).toHaveText("ไม่มีคำขอตัดจำหน่ายที่อนุมัติแล้วซึ่งดำเนินการได้ด้วยข้อมูลร่วมนี้")
  await measure.recordPage("IT head: the bulk execution's preview, blocked")
  await dialog.getByRole("button", { name: "ยกเลิก" }).click()
  await expect(dialog).toHaveCount(0)
})

// Finding D2, decided (DX2 (ก)): a request has no document number until it is executed, so the bulk execution's
// dialog takes one shared reference document number, used by every row without its own (as the shared recipient is).
// IT staff fill it and the request is executed.
test("IT staff execute the other batch request in a bulk execution (finding D2)", async ({ page, measure }) => {
  const asset = batchAssets[1]
  expect(asset, "the batch test made the request").toBeTruthy()
  await measure.visit(`/th/disposal?status=approved&search=${encodeURIComponent(asset.assetTag)}`, "IT staff: approved disposals")
  const dialog = await openBulkExecutionPreview(page, asset, employeeLabel("itStaff"), `${queueSearch} ผู้รับซาก`, `${queueSearch}-BULK-DOC`)
  // The row is eligible, and uses the shared number.
  await expect(dialog.getByRole("listitem").getByText("ดำเนินการได้", { exact: true })).toBeVisible()
  await expect(dialog.getByText(`${queueSearch}-BULK-DOC`).first()).toBeVisible()
  await measure.recordPage("IT staff: the bulk execution's preview")
  await expect(dialog.locator("#disposal-bulk-execution-permanent")).toBeVisible()
  await dialog.locator("#disposal-bulk-execution-permanent").check()
  await dialog.getByRole("button", { name: "ยืนยันดำเนินการ 1 รายการ" }).click()
  const result = page.getByRole("dialog", { name: "ผลการดำเนินการตัดจำหน่ายแบบกลุ่ม" })
  await expect(result.getByText("ดำเนินการแล้ว", { exact: true })).toBeVisible()
  await expect(result.getByText(asset.assetTag).first()).toBeVisible()
  await measure.recordPage("IT staff: the bulk execution's result")
  await result.getByRole("button", { name: "ปิด" }).first().click()
  await measure.visit(`/th/disposal?status=disposed&search=${encodeURIComponent(asset.assetTag)}`, "IT staff: disposed disposals")
  await expect(page.getByRole("main").getByText(asset.assetTag).filter({ visible: true }).first()).toBeVisible()
})
