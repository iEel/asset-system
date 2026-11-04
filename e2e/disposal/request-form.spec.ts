// The disposal request form and the request page (group 6 plan 3: boards DP-New, DP-Request, DP-Request-Phone).
// - The form: IT staff open it for a ready asset (?assetId=), the card and its ready line show and the requester starts
//   as them; a send with no method and no photo shows both errors with focus on the method; สูญหาย takes a PDF, ขาย
//   wants an image again; a HEIC is refused at once; with a PNG it sends and lands on the request page.
// - The request page: the requester cannot decide (no อนุมัติ, no action bar on the phone, print in the ⋯); the IT head's
//   own request says "คุณพิจารณาคำขอนี้เองไม่ได้"; the IT head approves with อนุมัติ, and ปฏิเสธ needs a remark and names
//   the asset's real status before the request.
// - A request with no photo (its uploads failed): the notice on the page, "ยังไม่มีรูป" in the approvals inbox, the server
//   refusing a HEIC, and the disposal round waiting for evidence (group 6 plan 4: the only way to record a disposal).
// axe runs on every page each test records (measure), in both themes across the four projects.
import { asUser, expect, test } from "../support/fixtures.ts"
import { recordSettled } from "../audit/settle.ts"
import { approvalsUrl, createInboxRequest, queueEntry } from "../approvals/approvals-support.ts"
import {
  actAs,
  approvedTab,
  checkRoundButton,
  chooseMethod,
  createAssets,
  createRoom,
  EVIDENCE_PDF,
  expectNoDecision,
  expectPresetRequester,
  expectReadyAssetCard,
  expectToast,
  PHOTO_PNG,
  readAssetChoices,
  readDisposalNo,
  recordPrefix,
  requestPhotoInput,
  roundTick,
  sendRequestButton,
  visibleButton,
  writeRoundSelection,
  type DisposalAsset,
} from "./disposal-support.ts"

asUser("itStaff")
// The IT head's test decides the request the form test sends: one after the other.
test.describe.configure({ mode: "serial" })

const PHOTO_REQUIRED = "ต้องมีรูปทรัพย์สินอย่างน้อย 1 รูป"
const METHOD_REQUIRED = "เลือกวิธีจำหน่าย"
const PHOTO_TYPE_REFUSED = "ใช้ไฟล์ JPG, PNG หรือ WEBP"
const READY_TH = "พร้อมใช้งาน"

let sent: { path: string; asset: DisposalAsset } | null = null

test("IT staff fill the request form: the card, the method and photo errors, สูญหาย takes a PDF, a HEIC is refused, and a PNG sends", async ({ page, measure, e2eDevice }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP4")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const [asset] = await createAssets(page, choices, roomId, [`${prefix}-A1`])

  // 1. Opened for a ready asset: its card with the ready line, and the requester is IT staff themselves.
  await measure.visit(`/th/disposal/new?assetId=${asset.id}`, "IT staff: the request form for a ready asset")
  await expectReadyAssetCard(page, asset)
  await expectPresetRequester(page, "itStaff")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ยื่นคำขอตัดจำหน่าย")
  await page.locator("#disposal-request-reason").fill(`${prefix} ชำรุดเกินซ่อม เสนอขายซาก`)

  // 2. Sent with no method and no photo: both errors, focus on the method group's first card.
  await sendRequestButton(page).click()
  await expect(page.locator("#disposal-request-type-error")).toHaveText(METHOD_REQUIRED)
  await expect(page.locator("#disposal-request-photos-error")).toHaveText(PHOTO_REQUIRED)
  await expect(page.locator('[data-disposal-method="sell"]')).toBeFocused()
  await expect(page).toHaveURL(/\/th\/disposal\/new\?assetId=/)
  await measure.recordPage("IT staff: the method and photo errors")

  // 3. สูญหาย with a PDF: any file will do, so the photo error goes; back to ขาย, it comes back (review focus 1).
  await chooseMethod(page, "สูญหาย")
  await expect(page.locator("#disposal-request-type-error")).toHaveCount(0)
  await requestPhotoInput(page).setInputFiles(EVIDENCE_PDF)
  await expect(page.getByText("evidence.pdf")).toBeVisible()
  await expect(page.locator("#disposal-request-photos-error")).toHaveCount(0)
  await chooseMethod(page, "ขาย")
  await expect(page.locator("#disposal-request-photos-error")).toHaveText(PHOTO_REQUIRED)

  // 4. A HEIC is refused at once and never queued (no real HEIC needed: the name and type decide).
  await requestPhotoInput(page).setInputFiles({ name: "x.heic", mimeType: "image/heic", buffer: Buffer.from("not a real heic") })
  await expect(page.locator("[data-disposal-photo-refused]")).toHaveText(PHOTO_TYPE_REFUSED)
  await expect(page.getByText("x.heic")).toHaveCount(0)
  await expect(page.locator("#disposal-request-photos-error")).toHaveText(PHOTO_REQUIRED)

  // 5. A PNG: queued as a photo, the errors gone, and the request sends to its page.
  await requestPhotoInput(page).setInputFiles(PHOTO_PNG)
  await expect(page.locator("[data-disposal-queued-photo]")).toHaveCount(1)
  await expect(page.locator("[data-disposal-photo-refused]")).toHaveCount(0)
  await expect(page.locator("#disposal-request-photos-error")).toHaveCount(0)
  await measure.recordPage("IT staff: the request form filled")
  await measure.timed("IT staff: send the request", async () => {
    await sendRequestButton(page).click()
    await page.waitForURL(/\/th\/disposal\/[0-9a-f-]{36}$/)
  })
  await expectToast(page, "สร้างคำขอตัดจำหน่ายสำเร็จ")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(asset.name)
  const disposalNo = await readDisposalNo(page)

  // 6. The request page as its requester, who has no approve: it waits for someone who may decide it.
  await expect(page.locator('[data-disposal-next-step="waiting"]')).toBeVisible()
  await expect(page.getByRole("main").getByText("รอพิจารณา").filter({ visible: true }).first()).toBeVisible()
  await expect(page.locator("[data-disposal-no-photo]")).toHaveCount(0)
  await expectNoDecision(page, e2eDevice, disposalNo)
  await measure.recordPage("IT staff: their sent request")
  sent = { path: new URL(page.url()).pathname, asset }
})

test("the IT head cannot decide their own request, approves IT staff's with อนุมัติ, and rejects another with a remark", async ({ page, measure, e2eTheme, e2eDevice }, testInfo) => {
  expect(sent, "the form test sent a request").not.toBeNull()
  const sentRequest = sent as { path: string; asset: DisposalAsset }
  const prefix = recordPrefix(testInfo, "DSP5")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const [toReject, own] = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])
  // IT staff's second request (to reject), then the IT head's own, each through the request API with a photo.
  const rejectRequest = await createInboxRequest(page, toReject, "itStaff", `${prefix} คำขอที่จะไม่อนุมัติ ชำรุดเกินซ่อม`)
  await actAs(page, "itHead", e2eTheme)
  const ownRequest = await createInboxRequest(page, own, "itHead", `${prefix} คำขอของหัวหน้า IT เอง`)

  // 1. Their own request: the warning says why, and nothing decides it.
  await measure.visit(`/th/disposal/${ownRequest.id}`, "IT head: their own request")
  const ownStep = page.locator('[data-disposal-next-step="own"]')
  await expect(ownStep).toBeVisible()
  await expect(ownStep).toContainText("คุณพิจารณาคำขอนี้เองไม่ได้")
  await expect(ownStep).toContainText("คุณเป็นผู้ขอ")
  await expectNoDecision(page, e2eDevice, ownRequest.disposalNo)
  await measure.recordPage("IT head: their own request, which they cannot decide")

  // 2. IT staff's request from the form: อนุมัติ opens the dialog with approve preset (no decision select, focus on the
  // remark), and confirming reads อนุมัติแล้ว รอตัดจำหน่าย.
  await measure.visit(sentRequest.path, "IT head: IT staff's pending request")
  await expect(page.locator('[data-disposal-next-step="decide"]')).toBeVisible()
  if (e2eDevice === "phone") {
    const bar = page.locator('[data-slot="action-bar"]')
    await expect(bar.getByRole("button", { name: "ปฏิเสธ", exact: true })).toBeVisible()
    await expect(bar.getByRole("button", { name: "อนุมัติ", exact: true })).toBeVisible()
  }
  await visibleButton(page, /^อนุมัติ$/).click()
  const approval = page.getByRole("dialog", { name: "อนุมัติ", exact: true })
  await expect(approval).toBeVisible()
  await expect(approval.locator("#disposal-decision-decision")).toHaveCount(0)
  await expect(approval.locator("#disposal-decision-remark")).toBeFocused()
  await measure.recordPage("IT head: the approve dialog")
  await measure.timed("IT head: approve", async () => {
    await approval.getByRole("button", { name: "บันทึกผล" }).click()
    await expect(approval).toHaveCount(0)
  })
  await expectToast(page, "บันทึกผลการพิจารณาสำเร็จ")
  await expect(page.locator('[data-disposal-next-step="approved"]')).toBeVisible()
  await expect(page.getByRole("main").getByText("อนุมัติแล้ว รอตัดจำหน่าย").filter({ visible: true }).first()).toBeVisible()
  await measure.recordPage("IT head: the approved request")

  // 3. Another run request: the effect of ปฏิเสธ names the asset's real status before the request; ปฏิเสธ needs a
  // remark, and the rejected request says what the asset went back to.
  await measure.visit(`/th/disposal/${rejectRequest.id}`, "IT head: another pending request")
  await expect(page.getByText(`คำขอเป็น ไม่อนุมัติ · ทรัพย์สินกลับเป็น ${READY_TH}`).filter({ visible: true })).toHaveCount(1)
  await visibleButton(page, /^ปฏิเสธ$/).click()
  const rejection = page.getByRole("dialog", { name: "ปฏิเสธ", exact: true })
  await expect(rejection).toBeVisible()
  await rejection.getByRole("button", { name: "บันทึกผล" }).click()
  await expect(rejection.locator("#disposal-decision-remark-error")).toHaveText("กรุณาระบุเหตุผลที่ไม่อนุมัติ")
  await expect(rejection.locator("#disposal-decision-remark")).toBeFocused()
  await measure.recordPage("IT head: the rejection's missing remark")
  const remark = `${prefix} ยังซ่อมได้ ให้ส่งซ่อมก่อน`
  await rejection.locator("#disposal-decision-remark").fill(remark)
  await measure.timed("IT head: reject", async () => {
    await rejection.getByRole("button", { name: "บันทึกผล" }).click()
    await expect(rejection).toHaveCount(0)
  })
  await expectToast(page, "บันทึกผลการพิจารณาสำเร็จ")
  const rejected = page.locator('[data-disposal-next-step="rejected"]')
  await expect(rejected).toContainText("ไม่อนุมัติ")
  await expect(rejected.locator("[data-disposal-reject-remark]")).toHaveText(`เหตุผล: ${remark}`)
  await expect(rejected).toContainText(`ทรัพย์สินกลับเป็น${READY_TH}`)
  await measure.recordPage("IT head: the rejected request")
  const assetRead = (await (await page.request.get(`/api/assets/${toReject.id}`)).json()) as { status?: { name?: string } }
  expect(assetRead.status?.name).toBe("Ready")
})

test("a request whose uploads failed: the no-photo notice, ยังไม่มีรูป in the inbox, a HEIC refused, and its round waits for evidence", async ({ page, measure, e2eTheme, e2eDevice }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP6")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const [asset] = await createAssets(page, choices, roomId, [`${prefix}-A1`])
  // Created through the API with no file, as when every upload after the create failed.
  const request = await createInboxRequest(page, asset, "itStaff", `${prefix} คำขอที่อัปโหลดรูปไม่สำเร็จ`, false)

  // 1. The request page says it has no photo; with the form's ?uploadErrors it says how many failed.
  await measure.visit(`/th/disposal/${request.id}`, "IT staff: a request with no photo")
  await expect(page.locator('[data-disposal-no-photo="none"]')).toHaveText("คำขอนี้ยังไม่มีรูป · แนบรูปได้ที่นี่")
  await measure.recordPage("IT staff: the no-photo notice")
  await measure.visit(`/th/disposal/${request.id}?uploadErrors=2`, "IT staff: a request whose uploads failed")
  await expect(page.locator('[data-disposal-no-photo="upload-failed"]')).toHaveText("อัปโหลดไม่สำเร็จ 2 ไฟล์ · คำขอนี้ยังไม่มีรูป")

  // 2. The server refuses a HEIC (the form refuses it before upload; the server is the second gate).
  const heic = await page.request.post(`/api/disposal-requests/${request.id}/attachments`, {
    multipart: { file: { name: "x.heic", mimeType: "image/heic", buffer: Buffer.from("not a real heic") } },
  })
  expect(heic.status(), `a HEIC upload is refused: ${(await heic.text()).slice(0, 200)}`).toBe(400)
  await measure.visit(`/th/disposal/${request.id}`, "IT staff: still no photo after the refused HEIC")
  await expect(page.locator('[data-disposal-no-photo="none"]')).toBeVisible()

  // 3. The IT head's approvals inbox flags the row: ยังไม่มีรูป.
  await actAs(page, "itHead", e2eTheme)
  await measure.visit(approvalsUrl({ tab: "disposal", search: prefix }), "IT head: the inbox with a request with no photo")
  await expect(queueEntry(page, e2eDevice, request.id)).toContainText("ยังไม่มีรูป")

  // 4. Approved (through the decision API the dialog posts to), it cannot be recorded without evidence: on the computer
  // the approved tab's tick is disabled "ยังไม่มีหลักฐาน"; the round page names it and the round waits.
  const decision = await page.request.patch(`/api/disposal-requests/${request.id}`, { data: { decision: "approve", approvalRemark: null } })
  expect(decision.status(), await decision.text()).toBe(200)
  await actAs(page, "itStaff", e2eTheme)
  await measure.visit(approvedTab(prefix), "IT staff: the approved request with no evidence")
  if (e2eDevice === "desktop") {
    await expect(roundTick(page, asset)).toBeDisabled()
    await expect(roundTick(page, asset)).toHaveAccessibleName(/\(ยังไม่มีหลักฐาน\)$/)
  }
  await writeRoundSelection(page, prefix, [request.id])
  await page.goto("/th/disposal/rounds/new", { waitUntil: "load" })
  const blocked = page.locator('[data-disposal-round-machine="blocked"]')
  await expect(blocked).toHaveCount(1)
  await expect(blocked).toContainText("ยังไม่มีหลักฐาน · ให้ผู้ดูแลระบบบันทึก")
  await expect(checkRoundButton(page)).toBeDisabled()
  await recordSettled(page, measure, "IT staff: the round waits for evidence")
})
