// Disposal of one asset (spec §6.4.1–3, §6.7): IT staff request it, the IT head approves it alone, IT staff execute it
// with evidence, and the disposal print opens. On the way: a wrong entry first in each form (the error shows under the
// field, then the corrected entry saves); IT staff have no approve, nor has the unlinked seed admin; the approver cannot
// execute; execution waits for evidence.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import {
  actAs,
  chooseSearchable,
  createAssets,
  createRoom,
  employeeLabel,
  EVIDENCE_PDF,
  expectToast,
  pickDisposalAsset,
  readAssetChoices,
  recordPrefix,
  seedAdminApi,
  visibleButton,
  visibleLink,
} from "./disposal-support.ts"

asUser("itStaff")
// The second test reads the print of the first one's request: one after the other, and the second skips if the first
// fails.
test.describe.configure({ mode: "serial" })

let printPath = ""

test("IT staff request one disposal, the IT head approves it, IT staff execute it with evidence, and the print opens", async ({ page, measure, e2eTheme }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP1")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const [asset] = await createAssets(page, choices, roomId, [`${prefix}-A1`])
  const reason = `${prefix} ชำรุดเกินซ่อม เสนอตัดจำหน่าย`

  // 1. IT staff request it. A reason under 12 characters first: the error shows under the field and nothing is sent.
  await measure.visit("/th/disposal/new", "IT staff: new disposal request")
  await pickDisposalAsset(page, page.locator("#disposal-request-asset"), asset)
  await expect(page.getByText(`${asset.assetTag} - ${asset.name}`)).toBeVisible()
  await chooseSearchable(page, "disposal-request-requested-by", employeeLabel("itStaff"))
  const reasonField = page.locator("#disposal-request-reason")
  await reasonField.fill("สั้นไป")
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expect(page.locator("#disposal-request-reason-error")).toHaveText("เหตุผลการตัดจำหน่ายต้องมีอย่างน้อย 12 ตัวอักษร")
  await expect(reasonField).toHaveAttribute("aria-invalid", "true")
  await expect(reasonField).toBeFocused()
  await measure.recordPage("IT staff: the short reason's error under the field")
  await reasonField.fill(reason)
  await expect(page.locator("#disposal-request-reason-error")).toHaveCount(0)
  await measure.timed("IT staff: save the request", async () => {
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    await page.waitForURL(/\/th\/disposal\/[0-9a-f-]{36}$/)
  })
  await expectToast(page, "สร้างคำขอตัดจำหน่ายสำเร็จ")
  const requestUrl = new URL(page.url()).pathname
  const requestId = requestUrl.split("/").pop() as string
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(asset.name)
  const disposalNo = (await page.locator("header .tag").first().textContent())?.trim() ?? ""
  expect(disposalNo).toMatch(/^DP-\d{8}-\d{4}$/)
  await expect(page.getByRole("main").getByText("รออนุมัติ").first()).toBeVisible()
  await expect(page.getByRole("main").getByText("รอตัดจำหน่าย").first()).toBeVisible()
  await measure.recordPage("IT staff: the request, pending approval")

  // IT staff have no approve: no review on the page, and the decision API refuses them.
  await expect(visibleButton(page, "พิจารณาคำขอ")).toHaveCount(0)
  const staffDecision = await page.request.patch(`/api/disposal-requests/${requestId}`, { data: { decision: "approve", nextStatusId: choices.statusId } })
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

  // 2. The IT head approves it alone. A rejection with no reason first: the error shows under the remark.
  await actAs(page, "itHead", e2eTheme)
  await measure.visit(requestUrl, "IT head: the pending request")
  await visibleButton(page, "พิจารณาคำขอ").click()
  const decision = page.getByRole("dialog", { name: "พิจารณาคำขอตัดจำหน่าย" })
  await expect(decision).toBeVisible()
  await decision.locator("#disposal-decision-decision").selectOption("reject")
  await decision.getByRole("button", { name: "บันทึกผล" }).click()
  await expect(decision.locator("#disposal-decision-remark-error")).toHaveText("กรุณาระบุเหตุผลที่ไม่อนุมัติ")
  await measure.recordPage("IT head: the rejection's missing reason under the field")
  await decision.locator("#disposal-decision-decision").selectOption("approve")
  await decision.locator("#disposal-decision-remark").fill(`${prefix} อนุมัติให้ตัดจำหน่าย`)
  await measure.timed("IT head: save the approval", async () => {
    await decision.getByRole("button", { name: "บันทึกผล" }).click()
    await expect(decision).toHaveCount(0)
  })
  await expectToast(page, "บันทึกผลการพิจารณาสำเร็จ")
  await expect(page.getByRole("main").getByText("อนุมัติแล้ว").first()).toBeVisible()
  await expect(page.getByText(employeeLabel("itHead").split(" - ")[0]).first()).toBeVisible()

  // The approver cannot execute: no execute on the page, and the execute API refuses them.
  await expect(visibleButton(page, "บันทึกตัดจำหน่ายจริง")).toHaveCount(0)
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

  // 3. IT staff execute it. With no evidence yet the dialog says so and does not save.
  await actAs(page, "itStaff", e2eTheme)
  await measure.visit(requestUrl, "IT staff: the approved request")
  await visibleButton(page, "บันทึกตัดจำหน่ายจริง").click()
  let execution = page.getByRole("dialog", { name: "บันทึกผลการตัดจำหน่ายจริง" })
  await expect(execution.getByRole("alert")).toHaveText("กรุณาแนบหลักฐานก่อนบันทึกการตัดจำหน่ายจริง")
  await expect(execution.getByRole("button", { name: "บันทึกผล" })).toHaveAttribute("aria-disabled", "true")
  await measure.recordPage("IT staff: execution waits for evidence")
  await execution.getByRole("button", { name: "ยกเลิก" }).click()
  await expect(execution).toHaveCount(0)

  // The evidence (a fixture PDF) on the request.
  await measure.timed("IT staff: upload the evidence", async () => {
    await page.locator('input[type="file"]').first().setInputFiles(EVIDENCE_PDF)
    await expectToast(page, "อัปโหลดหลักฐานตัดจำหน่ายสำเร็จ")
  })
  await expect(page.getByText("evidence.pdf")).toBeVisible()

  // The execution: no document number first, the error shows under it; then the whole entry saves.
  await visibleButton(page, "บันทึกตัดจำหน่ายจริง").click()
  execution = page.getByRole("dialog", { name: "บันทึกผลการตัดจำหน่ายจริง" })
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
  await expectToast(page, "บันทึกผลการตัดจำหน่ายจริงสำเร็จ")
  await expect(page.getByRole("main").getByText("ตัดจำหน่ายแล้ว").first()).toBeVisible()
  await expect(page.getByText(`${prefix}-DOC`)).toBeVisible()
  await measure.recordPage("IT staff: the disposed request")

  // The asset left the books: its status is Disposed.
  const assetRead = await page.request.get(`/api/assets/${asset.id}`)
  expect(assetRead.status()).toBe(200)
  expect(((await assetRead.json()) as { status?: { name?: string } }).status?.name).toBe("Disposed")

  // 4. The disposal print opens and shows the number. Its axe check is the next test (finding D1).
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
  test.fail(true, "finding D1: dt and dd outside a dl on the print layout (axe dlitem, serious)")
  expect(printPath, "the workflow test opened the print").not.toBe("")
  await measure.visit(printPath, "IT staff: the disposal print")
  await expect(page.getByText("ใบอนุมัติตัดจำหน่ายทรัพย์สิน").first()).toBeVisible()
})
