// Disposal of one asset (spec §6.4.1–3, §6.7): IT staff request it, the IT head approves it alone, IT staff execute it
// with evidence, and the disposal print opens. On the way: a wrong entry first in each form (the error shows under the
// field, then the corrected entry saves); IT staff have no approve, nor has the unlinked seed admin; the approver cannot
// execute. The request form (board DP-New, group 6 plan 3) needs a method and a photo, and the request page decides
// with separate อนุมัติ and ปฏิเสธ; execution waiting for evidence is request-form.spec.ts's (a request sent from the
// form always has its photo, which counts as evidence).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import {
  actAs,
  chooseMethod,
  chooseSearchable,
  createAssets,
  createRoom,
  employeeLabel,
  EVIDENCE_PDF,
  expectPresetRequester,
  expectReadyAssetCard,
  expectToast,
  PHOTO_PNG,
  pickDisposalAsset,
  readAssetChoices,
  readDisposalNo,
  recordPrefix,
  requestPhotoInput,
  seedAdminApi,
  sendRequestButton,
  visibleButton,
  visibleLink,
} from "./disposal-support.ts"

asUser("itStaff")
// The second test reads the print of the first one's request: one after the other, and the second skips if the first
// fails.
test.describe.configure({ mode: "serial" })

let printPath = ""

test("IT staff request one disposal, the IT head approves it, IT staff execute it with evidence, and the print opens", async ({ page, measure, e2eTheme, e2eDevice }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP1")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const [asset] = await createAssets(page, choices, roomId, [`${prefix}-A1`])
  const reason = `${prefix} ชำรุดเกินซ่อม เสนอตัดจำหน่าย`

  // 1. IT staff request it. A reason under 12 characters first: the error shows under the field and nothing is sent.
  await measure.visit("/th/disposal/new", "IT staff: new disposal request")
  await pickDisposalAsset(page, page.locator("#disposal-request-asset"), asset)
  await expectReadyAssetCard(page, asset)
  await expectPresetRequester(page, "itStaff")
  await chooseMethod(page, "ตัดจำหน่าย")
  await requestPhotoInput(page).setInputFiles(PHOTO_PNG)
  await expect(page.locator("[data-disposal-queued-photo]")).toHaveCount(1)
  const reasonField = page.locator("#disposal-request-reason")
  await reasonField.fill("สั้นไป")
  await sendRequestButton(page).click()
  await expect(page.locator("#disposal-request-reason-error")).toHaveText("เหตุผลการตัดจำหน่ายต้องมีอย่างน้อย 12 ตัวอักษร")
  await expect(reasonField).toHaveAttribute("aria-invalid", "true")
  await expect(reasonField).toBeFocused()
  await measure.recordPage("IT staff: the short reason's error under the field")
  await reasonField.fill(reason)
  await expect(page.locator("#disposal-request-reason-error")).toHaveCount(0)
  await measure.timed("IT staff: save the request", async () => {
    await sendRequestButton(page).click()
    await page.waitForURL(/\/th\/disposal\/[0-9a-f-]{36}$/)
  })
  await expectToast(page, "สร้างคำขอตัดจำหน่ายสำเร็จ")
  const requestUrl = new URL(page.url()).pathname
  const requestId = requestUrl.split("/").pop() as string
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(asset.name)
  const disposalNo = await readDisposalNo(page)
  await expect(page.getByRole("main").getByText("รอพิจารณา").filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByRole("main").getByText("รอตัดจำหน่าย").filter({ visible: true }).first()).toBeVisible()
  await measure.recordPage("IT staff: the request, pending approval")

  // IT staff have no approve: no อนุมัติ or ปฏิเสธ on the page, and the decision API refuses them.
  await expect(visibleButton(page, /^อนุมัติ$/)).toHaveCount(0)
  await expect(visibleButton(page, /^ปฏิเสธ$/)).toHaveCount(0)
  const staffDecision = await page.request.patch(`/api/disposal-requests/${requestId}`, { data: { decision: "approve" } })
  expect(staffDecision.status(), "IT staff may not approve").toBe(403)

  // The seed admin holds every permission but no employee link, so segregation of duties keeps them from approving
  // (spec §6.4.2: the approver must be linked to an employee). A preview writes nothing.
  const admin = await seedAdminApi()
  try {
    const adminPreview = await admin.post("/api/disposal-requests/bulk-decision", { data: { mode: "preview", requestIds: [requestId] } })
    expect(adminPreview.status()).toBe(200)
    const adminItems = ((await adminPreview.json()) as { items: { outcome: string; code: string | null }[] }).items
    expect(adminItems).toEqual([expect.objectContaining({ outcome: "blocked", code: "DISPOSAL_SOD_CONFLICT" })])
  } finally {
    await admin.dispose()
  }

  // 2. The IT head approves it alone. ปฏิเสธ with no reason first: the error shows under the remark; then อนุมัติ.
  await actAs(page, "itHead", e2eTheme)
  await measure.visit(requestUrl, "IT head: the pending request")
  await visibleButton(page, /^ปฏิเสธ$/).click()
  const rejection = page.getByRole("dialog", { name: "ปฏิเสธ", exact: true })
  await expect(rejection).toBeVisible()
  await rejection.getByRole("button", { name: "บันทึกผล" }).click()
  await expect(rejection.locator("#disposal-decision-remark-error")).toHaveText("กรุณาระบุเหตุผลที่ไม่อนุมัติ")
  await measure.recordPage("IT head: the rejection's missing reason under the field")
  await rejection.getByRole("button", { name: "ยกเลิก" }).click()
  await expect(rejection).toHaveCount(0)
  await visibleButton(page, /^อนุมัติ$/).click()
  const decision = page.getByRole("dialog", { name: "อนุมัติ", exact: true })
  await expect(decision).toBeVisible()
  await expect(decision.locator("#disposal-decision-decision")).toHaveCount(0)
  await expect(decision.locator("#disposal-decision-remark")).toBeFocused()
  await decision.locator("#disposal-decision-remark").fill(`${prefix} อนุมัติให้ตัดจำหน่าย`)
  await measure.timed("IT head: save the approval", async () => {
    await decision.getByRole("button", { name: "บันทึกผล" }).click()
    await expect(decision).toHaveCount(0)
  })
  await expectToast(page, "บันทึกผลการพิจารณาสำเร็จ")
  await expect(page.getByRole("main").getByText("อนุมัติแล้ว รอตัดจำหน่าย").filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText(employeeLabel("itHead").split(" - ")[0]).filter({ visible: true }).first()).toBeVisible()

  // The approver cannot execute: no execute on the page, and the execute API refuses them.
  await expect(visibleButton(page, /^บันทึกตัดจำหน่าย$/)).toHaveCount(0)
  const headExecute = await page.request.patch(`/api/disposal-requests/${requestId}`, {
    data: {
      action: "execute",
      disposalType: "dispose",
      executionDate: new Date().toISOString().slice(0, 10),
      executedById: readRunData().employees.itHead.id,
      nextStatusId: choices.statusId,
      recipientName: `${prefix} ผู้รับซาก`,
      documentNo: `${prefix}-DOC`,
      // The body the execution dialog sends: every key present (the schema's preprocessed numbers need them).
      actualSaleValue: null,
      actualSalvageValue: null,
      executionRemark: null,
      useHistoricalEvidenceException: false,
      evidenceExceptionReason: null,
      evidenceExceptionAcknowledged: false,
    },
  })
  const headExecuteBody = (await headExecute.json()) as { code?: string }
  expect(headExecute.status(), `the approver may not execute: ${JSON.stringify(headExecuteBody)}`).toBe(403)
  expect(headExecuteBody.code).toBe("DISPOSAL_SOD_CONFLICT")
  await measure.recordPage("IT head: the approved request")

  // 3. IT staff execute it, with a document (a fixture PDF) added beside the request's photo as evidence.
  await actAs(page, "itStaff", e2eTheme)
  await measure.visit(requestUrl, "IT staff: the approved request")
  await measure.timed("IT staff: upload the evidence", async () => {
    await page.locator('input[type="file"]').first().setInputFiles(EVIDENCE_PDF)
    await expectToast(page, "อัปโหลดหลักฐานตัดจำหน่ายสำเร็จ")
  })
  await expect(page.getByText("evidence.pdf")).toBeVisible()

  // The execution: no document number first, the error shows under it; then the whole entry saves.
  await visibleButton(page, /^บันทึกตัดจำหน่าย$/).click()
  const execution = page.getByRole("dialog", { name: "บันทึกตัดจำหน่าย", exact: true })
  await expect(execution.getByText("กรุณาแนบหลักฐานก่อนบันทึกตัดจำหน่าย")).toHaveCount(0)
  await chooseSearchable(page, "disposal-execution-executed-by", employeeLabel("itStaff"))
  await execution.locator("#disposal-execution-recipient").fill(`${prefix} ผู้รับซาก`)
  await execution.getByRole("button", { name: "บันทึกผล" }).click()
  await expect(execution.locator("#disposal-execution-document-no-error")).toHaveText("กรุณากรอกเลขที่เอกสารอ้างอิง")
  await measure.recordPage("IT staff: the missing document number under the field")
  await execution.locator("#disposal-execution-document-no").fill(`${prefix}-DOC`)
  await measure.timed("IT staff: save the execution", async () => {
    await execution.getByRole("button", { name: "บันทึกผล" }).click()
    await expect(execution).toHaveCount(0)
  })
  await expectToast(page, "บันทึกตัดจำหน่ายแล้ว")
  await expect(page.getByRole("main").getByText("ตัดจำหน่ายแล้ว").filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText(`${prefix}-DOC`)).toBeVisible()
  await measure.recordPage("IT staff: the disposed request")

  // The asset left the books: its status is Disposed.
  const assetRead = await page.request.get(`/api/assets/${asset.id}`)
  expect(assetRead.status()).toBe(200)
  expect(((await assetRead.json()) as { status?: { name?: string } }).status?.name).toBe("Disposed")

  // 4. The disposal print opens and shows the number. Its axe check is the next test (finding D1). On the phone print
  // sits in the header's ⋯ (board DP-Request-Phone).
  if (e2eDevice === "phone") await visibleButton(page, `การดำเนินการของ ${disposalNo}`).click()
  await visibleLink(page, "พิมพ์เอกสารตัดจำหน่ายฉบับสมบูรณ์").first().click()
  await page.waitForURL(/\/print(?:\?|$)/)
  await expect(page.getByText("ใบอนุมัติตัดจำหน่ายทรัพย์สิน").first()).toBeVisible()
  await expect(page.getByText(disposalNo).first()).toBeVisible()
  await measure.screenshot("disposal-print")
  printPath = new URL(page.url()).pathname
})

// Finding D1: the shared print layout (src/components/asset-operations/operation-document-print.tsx) puts each field's
// dt and dd in a div grid with no dl, an axe serious violation (dlitem) on every print page. Expected to fail until it
// is fixed; Playwright then reports "expected to fail but passed".
test("the disposal print has no serious or critical axe violation (finding D1)", async ({ page, measure }) => {
  // Finding D1 fixed (FX1): this test now keeps the print's fields a description list.
  expect(printPath, "the workflow test opened the print").not.toBe("")
  await measure.visit(printPath, "IT staff: the disposal print")
  await expect(page.getByText("ใบอนุมัติตัดจำหน่ายทรัพย์สิน").first()).toBeVisible()
})
