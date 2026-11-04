// Disposal of a batch of two (spec §6.4.1–3, §6.7): IT staff request both in one batch with shared evidence, the IT
// head approves them in one bulk approval on the approvals page (each in its panel on the phone, which has no ticks),
// and IT staff execute them. On the way: the batch form's wrong entry first;
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
  PHOTO_PNG,
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
  // The batch's shared files need one image (group 6 plan 3, P3-R3): the suite's PNG beside the PDF.
  await page.locator('input[type="file"]').first().setInputFiles(PHOTO_PNG)
  await expect(page.getByText("photo.png")).toBeVisible()
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

  // 3. The IT head's pending queue sends them to the approvals page (group 6 plan 2: bulk approval lives there now):
  // the batch's two have its link, their own request reads that they cannot decide it.
  await measure.visit(`/th/disposal?status=pending&search=${encodeURIComponent(prefix)}`, "IT head: pending disposals")
  await expect(page.locator('[data-disposal-inbox-step="review"]').filter({ visible: true })).toHaveCount(2)
  await expect(page.locator('[data-disposal-inbox-step="own"]').filter({ visible: true })).toHaveCount(1)
  await expect(page.getByText("คุณเป็นผู้ขอ พิจารณาเองไม่ได้").filter({ visible: true })).toHaveCount(1)
  const inboxQueue = `/th/admin/approvals?tab=disposal&search=${encodeURIComponent(prefix)}`
  if (e2eDevice === "phone") {
    // The phone has no ticks (spec §7.7): each request is approved in its panel.
    for (const asset of batchAssets) {
      const requestId = requestPaths[asset.assetTag].split("/").pop() as string
      await measure.visit(`${inboxQueue}&item=${encodeURIComponent(`disposal:${requestId}`)}`, "IT head: a batch request in the approvals panel")
      const panel = page.locator(`[data-approval-disposal-panel="${requestId}"]`)
      await panel.locator("#approval-disposal-remark").fill(`${prefix} อนุมัติทั้งชุด`)
      await measure.timed("IT head: approve one in the panel", async () => {
        await panel.getByRole("button", { name: "อนุมัติ", exact: true }).click()
        await page.waitForURL((url) => url.searchParams.get("item") !== `disposal:${requestId}`)
      })
      await expectToast(page, /^อนุมัติคำขอ DP-\d{8}-\d{4} แล้ว$/)
    }
  } else {
    // The approvals page: the batch's two are tickable, their own request's tick is disabled with the reason.
    await measure.visit(inboxQueue, "IT head: the batch in the approvals page")
    await expect(page.getByRole("checkbox", { name: new RegExp(`^เลือก ${escapeRegExp(own.name)} · .*\\(คุณเป็นผู้ขอ\\)$`) })).toBeDisabled()
    for (const asset of batchAssets) {
      await page.getByRole("checkbox", { name: new RegExp(`^เลือก ${escapeRegExp(asset.name)} · `) }).check()
    }
    const bar = page.getByRole("group", { name: "รายการที่เลือก" })
    await expect(bar).toContainText("2 เลือกแล้ว (จากทุกหน้า) · คำขอตัดจำหน่าย")
    await bar.getByRole("button", { name: "ตรวจสอบและอนุมัติ 2 รายการ" }).click()
    const bulk = page.getByRole("dialog", { name: "อนุมัติ 2 รายการ" })
    await expect(bulk.getByText("อนุมัติได้ 2 รายการ · ข้ามไป 0 รายการ")).toBeVisible()
    // Neither was opened in the panel: the confirm warns, and does not block.
    await expect(bulk.locator("[data-approval-not-opened]")).toContainText("ยังไม่ได้เปิดดูรูป 2 รายการ")
    await bulk.locator("#approval-inbox-bulk-remark").fill(`${prefix} อนุมัติทั้งชุด`)
    await measure.recordPage("IT head: the bulk approval's confirm")
    await measure.timed("IT head: approve the two", async () => {
      await bulk.getByRole("button", { name: "อนุมัติ 2 รายการ" }).click()
      await expect(bulk).toHaveCount(0)
    })
    await expectToast(page, "อนุมัติแล้ว 2 รายการ")
    await measure.recordPage("IT head: the bulk approval's result")
  }

  // Their own request stays pending: no review on its page, and the bulk preview blocks it for segregation of duties.
  await measure.visit(`/th/disposal/${ownRequestId}`, "IT head: their own request")
  await expect(page.getByRole("main").getByText("รอพิจารณา").filter({ visible: true }).first()).toBeVisible()
  await expect(visibleButton(page, /^อนุมัติ$/)).toHaveCount(0)
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
  await expect(page.getByRole("main").getByText("อนุมัติแล้ว รอตัดจำหน่าย").filter({ visible: true }).first()).toBeVisible()
  // The batch's evidence counts for the request: the execution has no evidence notice.
  await visibleButton(page, /^บันทึกตัดจำหน่าย$/).click()
  const execution = page.getByRole("dialog", { name: "บันทึกตัดจำหน่าย", exact: true })
  await expect(execution.getByText("กรุณาแนบหลักฐานก่อนบันทึกตัดจำหน่าย")).toHaveCount(0)
  await chooseSearchable(page, "disposal-execution-executed-by", employeeLabel("itStaff"))
  await execution.locator("#disposal-execution-recipient").fill(`${queueSearch} ผู้รับซาก`)
  await execution.locator("#disposal-execution-document-no").fill(`${asset.assetTag}-DOC`)
  await measure.recordPage("IT staff: the execution of a batch request")
  await measure.timed("IT staff: save the execution", async () => {
    await execution.getByRole("button", { name: "บันทึกผล" }).click()
    await expect(execution).toHaveCount(0)
  })
  await expectToast(page, "บันทึกตัดจำหน่ายแล้ว")
  await expect(page.getByRole("main").getByText("ตัดจำหน่ายแล้ว").filter({ visible: true }).first()).toBeVisible()
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
  // The row's outcome; the result's summary term reads the same words.
  await expect(result.getByRole("listitem").getByText("ดำเนินการแล้ว", { exact: true })).toBeVisible()
  await expect(result.getByText(asset.assetTag).first()).toBeVisible()
  await measure.recordPage("IT staff: the bulk execution's result")
  await result.getByRole("button", { name: "ปิด" }).first().click()
  await measure.visit(`/th/disposal?status=disposed&search=${encodeURIComponent(asset.assetTag)}`, "IT staff: disposed disposals")
  await expect(page.getByRole("main").getByText(asset.assetTag).filter({ visible: true }).first()).toBeVisible()
})
