// Disposal of a batch of two (spec §6.4.1–3, §6.7): IT staff request both in one batch with shared evidence (on the
// computer's form; the phone, where the form is not shown, through its API), the IT head approves them in one bulk
// approval on the approvals page (each in its panel on the phone, which has no ticks), and IT staff record them in
// disposal rounds (group 6 plan 4: per-row and bulk execution are retired). On the way: the batch form's missing method
// first; the IT head's own request is refused approval by the same IT head (the requester
// cannot approve their own request); the approver's round is blocked (the approver cannot record the disposal).
import { asUser, expect, test } from "../support/fixtures.ts"
import { recordSettled } from "../audit/settle.ts"
import { readRunData } from "../support/state.ts"
import {
  actAs,
  approvedTab,
  BATCH_PHONE_NOTE,
  batchLotInput,
  batchRequestId,
  checkRoundButton,
  chooseMethod,
  createAssets,
  createBatchThroughApi,
  createRoom,
  createRound,
  escapeRegExp,
  EVIDENCE_PDF,
  expectToast,
  openRoundForm,
  PHOTO_PNG,
  pickBatchMachines,
  readAssetChoices,
  recordPrefix,
  sendBatch,
  sendBatchButton,
  toast,
  visibleButton,
  writeRoundSelection,
  type DisposalAsset,
} from "./disposal-support.ts"

asUser("itStaff")
// One batch walks through four tests: the bulk approval, one request in a round of its own, the approver's blocked
// round (finding D3's test) and IT staff's round of the other with the shared document number (finding D2's test).
// Each needs the one before; a failure skips the rest.
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

  // 1. IT staff make the batch: both assets, the shared evidence (a PDF and the suite's PNG: the lot needs an image,
  // group 6 plan 3, P3-R3), and a reason. On the computer a send without a method first: the error shows under the
  // method, focus moves there and nothing is sent; there is no review step (request batches PB-R1). The form is for the
  // computer, so the phone reads its notice and makes the same batch through the API the form posts to.
  const reason = `${prefix} หมดอายุการใช้งาน เสนอตัดจำหน่ายทั้งชุด`
  await measure.visit("/th/disposal/batch/new", "IT staff: new disposal batch")
  if (e2eDevice === "phone") {
    await expect(page.locator("[data-disposal-batch-phone]")).toContainText(BATCH_PHONE_NOTE)
    const path = await createBatchThroughApi(page, { assets: batchAssets, disposalType: "dispose", reason, lotFiles: [EVIDENCE_PDF, PHOTO_PNG] })
    await measure.visit(path, "IT staff: the batch, two requests pending")
  } else {
    await pickBatchMachines(page, `${prefix}-A`, batchAssets)
    await page.locator("#disposal-batch-reason").fill(reason)
    await batchLotInput(page).setInputFiles(EVIDENCE_PDF)
    await expect(page.locator("[data-disposal-batch-lot]")).toContainText("evidence.pdf")
    await batchLotInput(page).setInputFiles(PHOTO_PNG)
    await expect(page.locator("[data-disposal-batch-lot] [data-disposal-queued-photo]")).toHaveCount(1)
    await sendBatchButton(page, 2).click()
    await expect(page.locator("#disposal-batch-type-error")).toHaveText("เลือกวิธีจำหน่าย")
    await expect(page.getByRole("radio", { name: "ขาย", exact: true })).toBeFocused()
    await expect(page).toHaveURL(/\/th\/disposal\/batch\/new$/)
    await measure.recordPage("IT staff: the missing method under the field")
    await chooseMethod(page, "ตัดจำหน่าย")
    await expect(page.locator("#disposal-batch-type-error")).toHaveCount(0)
    await sendBatch(page, measure, 2)
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^DPB-\d{8}-\d{4}$/)
  await expect(page.getByRole("main").getByText("evidence.pdf")).toBeVisible()
  await recordSettled(page, measure, "IT staff: the batch, two requests pending")
  // Each request's page, read off the batch's rows (cards on the phone).
  requestPaths = {}
  for (const asset of batchAssets) requestPaths[asset.assetTag] = `/th/disposal/${await batchRequestId(page, e2eDevice, asset)}`

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
      // The toast and the move to the next item race: on a slow server the toast can be gone before the URL changes,
      // so both are awaited together (inspection-confirm plan 4, E2E-1109R/S).
      await measure.timed("IT head: approve one in the panel", async () => {
        await panel.getByRole("button", { name: "อนุมัติ", exact: true }).click()
        await Promise.all([
          expect(toast(page, /^อนุมัติคำขอ DP-\d{8}-\d{4} แล้ว$/)).toBeVisible(),
          page.waitForURL((url) => url.searchParams.get("item") !== `disposal:${requestId}`),
        ])
      })
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
  await measure.visit(approvedTab(prefix), "IT head: approved disposals")
  for (const asset of batchAssets) await expect(page.getByRole("main").getByText(asset.assetTag).filter({ visible: true }).first()).toBeVisible()
})

test("IT staff record one batch request in a round of its own; the batch's shared evidence counts for it", async ({ page, measure, e2eDevice }) => {
  const [asset] = batchAssets
  const path = requestPaths[asset.assetTag]
  expect(path, "the batch test read the request's page").toBeTruthy()
  await measure.visit(path, "IT staff: an approved batch request")
  await expect(page.getByRole("main").getByText("อนุมัติแล้ว รอตัดจำหน่าย").filter({ visible: true }).first()).toBeVisible()
  // The batch's evidence counts for the request: in the round it is eligible, not "ยังไม่มีหลักฐาน".
  const requestId = path.split("/").pop() as string
  await openRoundForm(page, measure, e2eDevice, asset.assetTag, [{ id: requestId, asset }])
  await expect(page.locator('[data-disposal-round-machine="eligible"]')).toHaveCount(1)
  await expect(page.getByText("ยังไม่มีหลักฐาน")).toHaveCount(0)
  const round = await createRound(page, measure, { method: "ตัดจำหน่าย", recipient: `${queueSearch} ผู้รับซาก`, documentNo: `${asset.assetTag}-DOC` }, 1)
  await expect(page.getByRole("main")).toContainText(asset.assetTag)
  await measure.visit(path, "IT staff: the batch request, disposed")
  await expect(page.getByRole("main").getByText("ตัดจำหน่ายแล้ว").filter({ visible: true }).first()).toBeVisible()
  await expect(page.locator("[data-disposal-execution-round]")).toHaveText(round.roundNo)
  await measure.recordPage("IT staff: the batch request in its round")
})

// Finding D3 (fixed, FX3) was the old bulk execution's blocked preview; its successor is the approver's round. The IT
// head approved the request, so segregation of duties keeps them from recording it: on the computer the approved tab's
// tick is disabled with the reason, and the round page (with the request in the selection, as from another session)
// names it "คุณอนุมัติรายการนี้" and the round waits.
test("the approver's round is blocked with the reason (finding D3)", async ({ page, measure, e2eTheme, e2eDevice }) => {
  const asset = batchAssets[1]
  expect(asset, "the batch test made the request").toBeTruthy()
  const requestId = requestPaths[asset.assetTag].split("/").pop() as string
  await actAs(page, "itHead", e2eTheme)
  await measure.visit(approvedTab(asset.assetTag), "IT head: approved disposals")
  if (e2eDevice === "desktop") {
    await expect(page.getByRole("checkbox", { name: new RegExp(`^เลือก ${escapeRegExp(asset.name)} · .*\\(คุณอนุมัติรายการนี้\\)$`) })).toBeDisabled()
  }
  await writeRoundSelection(page, asset.assetTag, [requestId])
  await page.goto("/th/disposal/rounds/new", { waitUntil: "load" })
  const blocked = page.locator('[data-disposal-round-machine="blocked"]')
  await expect(blocked).toHaveCount(1)
  await expect(blocked).toContainText("คุณอนุมัติรายการนี้")
  await expect(page.locator("[data-disposal-round-blocked]")).toContainText("บันทึกในรอบนี้ไม่ได้ 1 รายการ")
  await expect(checkRoundButton(page)).toBeDisabled()
  await recordSettled(page, measure, "IT head: the round, blocked")
})

// Finding D2, decided (DX2 (ก)): a request has no document number until it is recorded, so the round takes one shared
// reference document number (now the round's own). IT staff fill it and the request is recorded.
test("IT staff record the other batch request in a round with the shared document number (finding D2)", async ({ page, measure, e2eDevice }) => {
  const asset = batchAssets[1]
  expect(asset, "the batch test made the request").toBeTruthy()
  const requestId = requestPaths[asset.assetTag].split("/").pop() as string
  await openRoundForm(page, measure, e2eDevice, asset.assetTag, [{ id: requestId, asset }])
  await expect(page.locator('[data-disposal-round-machine="eligible"]')).toHaveCount(1)
  const round = await createRound(page, measure, { method: "ตัดจำหน่าย", recipient: `${queueSearch} ผู้รับซาก`, documentNo: `${queueSearch}-BULK-DOC` }, 1)
  await expect(page.getByRole("main")).toContainText(`${queueSearch}-BULK-DOC`)
  await measure.visit(`/th/disposal?status=disposed&search=${encodeURIComponent(asset.assetTag)}`, "IT staff: disposed disposals")
  await expect(page.getByRole("main").getByText(asset.assetTag).filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByRole("main")).toContainText(round.roundNo)
})
