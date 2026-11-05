import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import test from "node:test"
import { E2E_PROJECTS } from "../e2e/support/matrix.ts"

// The E2E suite's disposal workflows (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §6.4; tasks
// ED1–ED3). One test per task, appended in order. The specs run with `npm run test:e2e` against a running app; these
// pin what can be checked without one: who walks each step, the refusals asserted, each test's own records, and the
// findings kept as expected failures. The working tree is CRLF on Windows: every read strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const disposalSpecs = () => (existsSync("e2e/disposal") ? readdirSync("e2e/disposal").filter((file) => file.endsWith(".spec.ts")).sort() : [])

test("one disposal is requested, approved alone and recorded with evidence in a round by the right people, and the print opens (e2e disposal task 1, ED1)", () => {
  const support = read("e2e/disposal/disposal-support.ts")
  // The four projects' codes in record tags are the projects of the matrix, each its own.
  const codes = Object.fromEntries([...support.matchAll(/"((?:desktop|phone)-(?:light|dark))": "([A-Z]{2})"/g)].map((match) => [match[1], match[2]]))
  assert.deepEqual(Object.keys(codes), E2E_PROJECTS.map((project) => project.name))
  assert.equal(new Set(Object.values(codes)).size, 4)
  // The person changes inside a test by the run's saved sessions, never a sign-in; the theme cookie stays.
  assert.ok(support.includes("await context.clearCookies()"), "actAs drops the session it had")
  assert.ok(support.includes(`{ name: "theme", value: theme, url: baseURL }`), "actAs keeps the project's theme")
  assert.ok(!/signInOnce|\/login/.test(support), "no sign-in in the disposal helpers")
  // A room of the test's own, made by the seed admin as the setup makes the run's room; assets through the asset API.
  assert.ok(support.includes(`storageState: fromRoot(ADMIN_STATE_FILE)`), "the seed admin's saved session")
  assert.ok(support.includes(`locationType: "Room"`), "a room")
  assert.ok(support.includes(`page.request.post("/api/assets"`), "assets through the asset API")
  // The streamed form's options are waited for before readAssetChoices reads them (menu B shell task 13B loop 5).
  {
    const choices = support.slice(support.indexOf("export async function readAssetChoices("), support.indexOf("export type DisposalAsset"))
    const read0 = choices.indexOf(`const categoryId = await firstValue(page.locator("#asset-category"))`)
    for (const id of ["asset-category", "asset-condition"]) {
      const at = choices.indexOf(`await expect(page.locator('#${id} option:not([value=""])').first()).toBeAttached()`)
      assert.ok(at > choices.indexOf(`await measure.visit("/th/assets/new"`) && at < read0, id)
    }
  }
  for (const key of ["licenseTotalSeats", "licenseUsedSeats", "purchaseDate", "purchasePrice", "warrantyStartDate", "warrantyEndDate"]) {
    assert.ok(support.includes(`${key}: null,`), `${key} is sent`)
  }
  // A toast is read by axe only once its fade-in has ended.
  assert.ok(support.includes("getAnimations({ subtree: true }).length === 0"), "expectToast waits for the fade")

  assert.deepEqual(disposalSpecs().filter((file) => file === "single-request.spec.ts"), ["single-request.spec.ts"])
  const spec = read("e2e/disposal/single-request.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "IT staff walk it")
  assert.ok(spec.includes(`recordPrefix(testInfo, "DSP1")`), "its own records")
  for (const step of [
    `await measure.visit("/th/disposal/new"`,
    `"เหตุผลการตัดจำหน่ายต้องมีอย่างน้อย 12 ตัวอักษร"`,
    `expect(staffDecision.status(), "IT staff may not approve").toBe(403)`,
    `admin.post("/api/disposal-requests/bulk-decision"`,
    `await actAs(page, "itHead", e2eTheme)`,
    `"กรุณาระบุเหตุผลที่ไม่อนุมัติ"`,
    `expect(headItems).toEqual([expect.objectContaining({ outcome: "blocked", code: "DISPOSAL_SOD_CONFLICT" })])`,
    `expect(headExecuteBody.code).toBe("DISPOSAL_USE_ROUND")`,
    `await actAs(page, "itStaff", e2eTheme)`,
    `setInputFiles(EVIDENCE_PDF)`,
    `await openRoundForm(page, measure, e2eDevice, prefix, [{ id: requestId, asset }])`,
    `await expect(page.locator("#disposal-round-document-error")).toHaveText("กรุณากรอกเลขที่เอกสารอ้างอิง")`,
    `await createRound(page, measure, { method: "ตัดจำหน่าย"`,
    `await expect(page.locator("[data-disposal-execution-round]")).toHaveText(round.roundNo)`,
    `.toBe("Disposed")`,
    `"ใบอนุมัติตัดจำหน่ายทรัพย์สิน"`,
  ]) assert.ok(spec.includes(step), step)
  // Group 6 plan 3: the form needs a method and a photo, the requester is preset, and the request page decides with
  // separate ปฏิเสธ and อนุมัติ (dialogs titled by the decision); the execute words carry no "จริง".
  for (const step of [
    `await expectReadyAssetCard(page, asset)`,
    `await expectPresetRequester(page, "itStaff")`,
    `await chooseMethod(page, "ตัดจำหน่าย")`,
    `await requestPhotoInput(page).setInputFiles(PHOTO_PNG)`,
    `await sendRequestButton(page).click()`,
    `await visibleButton(page, /^ปฏิเสธ$/).click()`,
    `page.getByRole("dialog", { name: "ปฏิเสธ", exact: true })`,
    `await visibleButton(page, /^อนุมัติ$/).click()`,
    `page.getByRole("dialog", { name: "อนุมัติ", exact: true })`,
  ]) assert.ok(spec.includes(step), step)
  // Group 6 plan 4: the execution dialog is gone (P4-R1); the disposal is recorded only through a round.
  for (const gone of [`"พิจารณาคำขอ"`, "ตัดจำหน่ายจริง", `page.getByRole("dialog", { name: "บันทึกตัดจำหน่าย"`, "disposal-execution-executed-by", `action: "execute",\n      disposalType`, `"disposal-request-requested-by", employeeLabel`, `{ name: "บันทึก", exact: true }`, "nextStatusId: choices.statusId }"]) {
    assert.ok(!spec.includes(gone), `gone: ${gone}`)
  }
  // Finding D1 is fixed (FX1): the print's test is a plain test.
  assert.ok(!spec.includes(`test.fail(true, "finding D1:`), "D1 is fixed")
  assert.ok(spec.includes(`test.describe.configure({ mode: "serial" })`), "the print test follows the workflow")
})

test("a batch of two is requested with shared evidence, approved in one bulk approval, and recorded in rounds; the own request and the approver's round are refused (e2e disposal task 2, ED2)", () => {
  assert.deepEqual(disposalSpecs().filter((file) => file === "batch-bulk-approval.spec.ts"), ["batch-bulk-approval.spec.ts"])
  const spec = read("e2e/disposal/batch-bulk-approval.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "IT staff walk it")
  assert.ok(spec.includes(`recordPrefix(testInfo, "DSP2")`), "its own records")
  assert.ok(spec.includes(`test.describe.configure({ mode: "serial" })`), "one batch through four tests")
  for (const step of [
    `await measure.visit("/th/disposal/batch/new"`,
    // Request batches Task 5: the missing method under the field, no review step, the phone through the API.
    `"#disposal-batch-type-error"`,
    `await sendBatch(page, measure, 2)`,
    `toContainText(BATCH_PHONE_NOTE)`,
    `await createBatchThroughApi(page, {`,
    String.raw`/^DPB-\d{8}-\d{4}$/`,
    `requestedById: readRunData().employees.itHead.id`,
    `code: "DISPOSAL_SOD_CONFLICT"`,
    // Group 6 plan 3: the batch's shared files need an image (P3-R3).
    `setInputFiles(PHOTO_PNG)`,
    // Group 6 plan 4: each request is recorded in a round; the batch's evidence counts; the approver's round is blocked.
    `await openRoundForm(page, measure, e2eDevice, asset.assetTag, [{ id: requestId, asset }])`,
    `await expect(page.getByText("ยังไม่มีหลักฐาน")).toHaveCount(0)`,
    `await expect(blocked).toContainText("คุณอนุมัติรายการนี้")`,
    `await expect(checkRoundButton(page)).toBeDisabled()`,
    `await expect(page.locator("[data-disposal-execution-round]")).toHaveText(round.roundNo)`,
  ]) assert.ok(spec.includes(step), step)
  for (const gone of [`"ยืนยันสร้างชุดคำขอ"`, `"ตรวจสอบชุดคำขอ"`, `"#disposal-batch-requested-by-error"`]) {
    assert.ok(!spec.includes(gone), `the batch form's review step is gone: ${gone}`)
  }
  for (const gone of ["openBulkExecutionPreview", "ผลการดำเนินการตัดจำหน่ายแบบกลุ่ม", "disposal-execution-executed-by", `{ name: "บันทึกตัดจำหน่าย", exact: true }`]) {
    assert.ok(!spec.includes(gone), `the retired execution is gone: ${gone}`)
  }
  assert.ok(!spec.includes("ตัดจำหน่ายจริง"), "no old execute words")
  // The bulk approval moved to the approvals page (group 6 plan 2, P2-R2): the pending tab links there, the computer
  // ticks both and confirms with the not-opened warning, the phone (no ticks) approves each in the panel.
  for (const step of [
    `'[data-disposal-inbox-step="review"]'`,
    `"คุณเป็นผู้ขอ พิจารณาเองไม่ได้"`,
    "const inboxQueue = `/th/admin/approvals?tab=disposal&search=${encodeURIComponent(prefix)}`",
    String.raw`\\(คุณเป็นผู้ขอ\\)$`,
    `"ตรวจสอบและอนุมัติ 2 รายการ"`,
    `page.getByRole("dialog", { name: "อนุมัติ 2 รายการ" })`,
    `"ยังไม่ได้เปิดดูรูป 2 รายการ"`,
    `await expectToast(page, "อนุมัติแล้ว 2 รายการ")`,
    `panel.getByRole("button", { name: "อนุมัติ", exact: true })`,
  ]) assert.ok(spec.includes(step), step)
  for (const gone of [`"ยืนยันอนุมัติ 2 รายการ"`, `"ตรวจสอบก่อนอนุมัติแบบกลุ่ม"`, `"#disposal-bulk-approval-remark"`, `"ผลการอนุมัติแบบกลุ่ม"`]) {
    assert.ok(!spec.includes(gone), `the queue's bulk approval is gone: ${gone}`)
  }
  // Finding D3 is fixed (FX3); D2 is decided (DX2 (ก)): IT staff fill the shared reference document number.
  assert.ok(!spec.includes(`test.fail(true, "finding D3:`), "D3 is fixed")
  assert.ok(!spec.includes(`test.fail(true, "finding D2:`), "D2 is fixed")
  assert.ok(spec.includes("documentNo: `${queueSearch}-BULK-DOC` }, 1)"), "D2 fills the shared number")
  assert.ok(spec.indexOf("(finding D3)") < spec.indexOf("(finding D2)"), "the approver's round is checked while the request is still approved")
})

test("an asset in an open audit round cannot be requested for disposal, with the reason, and can once the round is cancelled (e2e disposal task 3, ED3)", () => {
  assert.deepEqual(disposalSpecs(), ["batch-bulk-approval.spec.ts", "batch-pages.spec.ts", "disposal-round.spec.ts", "open-audit-block.spec.ts", "request-form.spec.ts", "single-request.spec.ts"])
  const spec = read("e2e/disposal/open-audit-block.spec.ts")
  assert.ok(spec.indexOf("const roundResponse = await page.request.post") > spec.indexOf("await requestPhotoInput(page).setInputFiles(PHOTO_PNG)"), "the round opens after the form is filled")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "IT staff walk it")
  assert.ok(spec.includes(`recordPrefix(testInfo, "DSP3")`), "its own records")
  // The round is the test's own, on its own room, open.
  assert.ok(spec.includes(`scopeLocationId: roomId,`) && spec.includes(`status: "open",`), "an open round on the test's room")
  for (const step of [
    `await expect(option).toBeDisabled()`,
    `"อยู่ในรอบตรวจนับที่ยังไม่ปิด"`,
    // Group 6 plan 3: the request filled while the asset is ready is refused once the round opens; opened for the
    // blocked asset, the form names it over the picker; the send needs a method and a photo.
    `page.locator("[data-disposal-initial-blocked]")`,
    `"ทรัพย์สินยังมีงานค้างที่ต้องปิดก่อนสร้างคำขอตัดจำหน่าย · อยู่ในรอบตรวจนับที่ยังไม่ปิด"`,
    `await chooseMethod(page, "ทำลาย")`,
    `await requestPhotoInput(page).setInputFiles(PHOTO_PNG)`,
    String.raw`measure.expectRefusal({ method: "POST", url: /\/api\/disposal-requests$/, status: 400,`,
    `"ทรัพย์สินยังมีงานค้างที่ต้องปิดก่อนสร้างคำขอตัดจำหน่าย"`,
    `expect(before.status?.name).toBe("Ready")`,
    `await actAs(page, "itHead", e2eTheme)`,
    `{ data: { action: "cancel", reason:`,
    `"สร้างคำขอตัดจำหน่ายสำเร็จ"`,
  ]) assert.ok(spec.includes(step), step)
  // Every disposal test makes its own records under its own workflow code.
  const codes = disposalSpecs().map((file) => read(`e2e/disposal/${file}`).match(/recordPrefix\(testInfo, "(DSP\d)"\)/)?.[1])
  assert.deepEqual(codes.sort(), ["DSP1", "DSP2", "DSP3", "DSP4", "DSP7", "DSP9"])
})

test("the disposal specs read the request statuses by their one set of names (critique 2026-10-20 D3)", () => {
  const specs = ["single-request.spec.ts", "batch-bulk-approval.spec.ts", "open-audit-block.spec.ts", "request-form.spec.ts"].map((file) => read(`e2e/disposal/${file}`))
  for (const spec of specs) {
    assert.ok(spec.includes('getByText("รอพิจารณา")'))
    assert.doesNotMatch(spec, /getByText\("รออนุมัติ"\)/)
    assert.doesNotMatch(spec, /getByText\("อนุมัติแล้ว"\)/)
  }
  for (const spec of specs.slice(0, 2)) assert.ok(spec.includes('getByText("อนุมัติแล้ว รอตัดจำหน่าย")'))
})

test("the approvals page: strip, tabs, search, the panel, reject with a remark, bulk approve across pages with the not-opened warning, own requests, the phone (group 6 plan 2 Task 5)", () => {
  const support = read("e2e/approvals/approvals-support.ts")
  const spec = read("e2e/approvals/approvals-inbox.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itHead")`), "the IT head walks it")
  // Run-marked records of each test's own, made through the APIs, each with the suite's photo.
  assert.deepEqual([...spec.matchAll(/recordPrefix\(testInfo, "(APR\d)"\)/g)].map((match) => match[1]).sort(), ["APR1", "APR2"])
  assert.ok(support.includes(`page.request.post("/api/disposal-requests"`), "requests through the request API")
  assert.ok(support.includes("/attachments`") && support.includes(`fromRoot("e2e/fixtures/photo.png")`), "a photo on each")
  assert.ok(support.includes(`await actAs(page, "itStaff", theme)`), "IT staff make the requests")
  for (const step of [
    `"[data-approval-strip-cell]"`,
    `expect(await stripValue(page, "total"), "the total cell and the ทั้งหมด tab").toBe(await tabCount(page, "ทั้งหมด"))`,
    "await expect(page.getByRole(\"main\")).toContainText(`จาก ${disposalTotal}`)",
    `expect(await tabCount(page, "ตัดจำหน่าย")).toBe("3")`,
    `"รูปที่ 1 / 1"`,
    `"ถ้าปฏิเสธ"`,
    `"#approval-disposal-remark-error"`,
    `getByText("ไม่อนุมัติ")`,
    `"2 เลือกแล้ว (จากทุกหน้า) · คำขอตัดจำหน่าย"`,
    `pageSize: "25", page: "2"`,
    `"ตรวจสอบและอนุมัติ 2 รายการ"`,
    `"ยังไม่ได้เปิดดูรูป 1 รายการ"`,
    `await expectToast(page, "อนุมัติแล้ว 2 รายการ")`,
    `getByText("อนุมัติแล้ว รอตัดจำหน่าย")`,
    `"อนุมัติเองไม่ได้"`,
    `await expect(tick(page, own)).toBeDisabled()`,
    `'[data-approval-sod="blocked"]'`,
    `"กลับไปงานรออนุมัติ"`,
    `await expect(page.locator("[data-approval-tick]").filter({ visible: true })).toHaveCount(0)`,
    `await measure.recordPage("IT head: a request in the panel")`,
  ]) assert.ok(spec.includes(step), step)
  // The phone has no ticks: the bulk test skips there; the three requests walk one serial chain.
  assert.ok(spec.includes(`test.skip(e2eDevice === "phone",`), "no bulk approve on the phone")
  assert.ok(spec.includes(`test.describe.configure({ mode: "serial" })`), "one chain")
})

test("the disposal request form and the request page: the form's errors and photo rule, the requester, own and decide states, the no-photo request (group 6 plan 3 Task 5)", () => {
  const support = read("e2e/disposal/disposal-support.ts")
  const spec = read("e2e/disposal/request-form.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "IT staff walk it")
  assert.deepEqual([...spec.matchAll(/recordPrefix\(testInfo, "(DSP\d)"\)/g)].map((match) => match[1]), ["DSP4", "DSP5", "DSP6"])
  assert.ok(spec.includes(`test.describe.configure({ mode: "serial" })`), "the IT head decides the form's request")
  // The helpers pick the method by its word and read the preset requester; photos are the suite's PNG.
  assert.ok(support.includes(`page.getByRole("radio", { name: word, exact: true })`), "the method by its word")
  assert.ok(support.includes(`export const PHOTO_PNG = "e2e/fixtures/photo.png"`))
  assert.ok(support.includes(`page.getByRole("button", { name: "ส่งคำขอตัดจำหน่าย", exact: true })`))
  assert.ok(support.includes(`"ไม่มีงานค้าง: รับคืนแล้ว · ไม่มีงานซ่อม · ไม่อยู่ในรอบตรวจนับ · ไม่มีส่วนควบติดตั้ง"`))
  // Someone who cannot decide: no อนุมัติ or ปฏิเสธ, no action bar, and print in the ⋯ on the phone.
  assert.ok(support.includes(`await expect(page.locator('[data-slot="action-bar"]')).toHaveCount(0)`))
  assert.ok(support.includes("await visibleButton(page, `การดำเนินการของ ${disposalNo}`).click()"))
  for (const step of [
    "await measure.visit(`/th/disposal/new?assetId=${asset.id}`",
    `await expect(page.locator('[data-disposal-method="sell"]')).toBeFocused()`,
    `await chooseMethod(page, "สูญหาย")`,
    `await requestPhotoInput(page).setInputFiles(EVIDENCE_PDF)`,
    `await chooseMethod(page, "ขาย")`,
    `{ name: "x.heic", mimeType: "image/heic", buffer: Buffer.from(`,
    `const PHOTO_TYPE_REFUSED = "ใช้ไฟล์ JPG, PNG หรือ WEBP"`,
    `const PHOTO_REQUIRED = "ต้องมีรูปทรัพย์สินอย่างน้อย 1 รูป"`,
    `const METHOD_REQUIRED = "เลือกวิธีจำหน่าย"`,
    `'[data-disposal-next-step="waiting"]'`,
    `'[data-disposal-next-step="own"]'`,
    `"คุณพิจารณาคำขอนี้เองไม่ได้"`,
    `await expectNoDecision(page, e2eDevice, disposalNo)`,
    `await expectNoDecision(page, e2eDevice, ownRequest.disposalNo)`,
    `page.getByRole("dialog", { name: "อนุมัติ", exact: true })`,
    `page.getByRole("dialog", { name: "ปฏิเสธ", exact: true })`,
    `"กรุณาระบุเหตุผลที่ไม่อนุมัติ"`,
    "`คำขอเป็น ไม่อนุมัติ · ทรัพย์สินกลับเป็น ${READY_TH}`",
    `createInboxRequest(page, asset, "itStaff", `,
    `'[data-disposal-no-photo="none"]'`,
    `"อัปโหลดไม่สำเร็จ 2 ไฟล์ · คำขอนี้ยังไม่มีรูป"`,
    `toContainText("ยังไม่มีรูป")`,
    // Group 6 plan 4: without evidence the approved tab's tick is disabled and the round names it and waits.
    `await expect(roundTick(page, asset)).toHaveAccessibleName(/\\(ยังไม่มีหลักฐาน\\)$/)`,
    `await expect(blocked).toContainText("ยังไม่มีหลักฐาน · ให้ผู้ดูแลระบบบันทึก")`,
  ]) assert.ok(spec.includes(step), step)
  // The words the spec reads are the app's own.
  const th = JSON.parse(read("messages/th.json")) as { disposalPage: Record<string, unknown>; approvalInboxPage: Record<string, string> }
  const page = th.disposalPage as Record<string, string> & { requestPage: Record<string, string>; errors: Record<string, string> }
  assert.equal(page.photoRequired, "ต้องมีรูปทรัพย์สินอย่างน้อย 1 รูป")
  assert.equal(page.methodRequired, "เลือกวิธีจำหน่าย")
  assert.equal(page.photoTypeRefused, "ใช้ไฟล์ JPG, PNG หรือ WEBP")
  assert.equal(page.submitRequest, "ส่งคำขอตัดจำหน่าย")
  assert.equal(page.executeDisposal, "บันทึกตัดจำหน่าย")
  // The execution dialog's title and toast went with it (group 6 plan 4, P4-R1); plan 4 Task 6 records through a round.
  assert.equal(page.errors.DISPOSAL_EVIDENCE_REQUIRED, "กรุณาแนบหลักฐานก่อนบันทึกตัดจำหน่าย")
  assert.equal(page.requestPage.titleOwn, "คุณพิจารณาคำขอนี้เองไม่ได้")
  assert.equal(page.requestPage.noPhoto, "คำขอนี้ยังไม่มีรูป · แนบรูปได้ที่นี่")
  assert.equal(th.approvalInboxPage.noPhoto, "ยังไม่มีรูป")
  assert.equal(th.approvalInboxPage.effectReject, "คำขอเป็น ไม่อนุมัติ · ทรัพย์สินกลับเป็น {status}")
})

test("disposal rounds and the accounting Excel: the approver's ticks, three requests in one round as ขาย with a lump price, the report, the retired paths, a stale selection, the phone (group 6 plan 4 Task 6)", () => {
  const support = read("e2e/disposal/disposal-support.ts")
  const spec = read("e2e/disposal/disposal-round.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "IT staff walk it")
  assert.deepEqual([...spec.matchAll(/recordPrefix\(testInfo, "(DSP\d)"\)/g)].map((match) => match[1]), ["DSP7", "DSP8"])
  assert.ok(spec.includes(`test.describe.configure({ mode: "serial" })`), "the report reads the round test's round")
  // The helpers: the selection travels in sessionStorage (P4-R2); the computer ticks and uses the bar, the phone has no
  // ticks and says so; the round is filled, checked, then saved.
  for (const step of [
    `export const ROUND_SELECTION_KEY = "disposal-round-selection"`,
    `page.getByRole("group", { name: "รายการที่เลือกสำหรับรอบตัดจำหน่าย" })`,
    "bar.getByRole(\"button\", { name: `สร้างรอบตัดจำหน่าย ${requests.length} รายการ` })",
    `await expect(page.locator("[data-disposal-round-phone-note]")).toHaveText("สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์")`,
    `await expect(page.locator("[data-disposal-round-tick]").filter({ visible: true })).toHaveCount(0)`,
    `page.getByRole("button", { name: "ตรวจสอบรอบ", exact: true })`,
    "page.getByRole(\"button\", { name: `บันทึกรอบตัดจำหน่าย ${count} รายการ`, exact: true })",
    "`ตรวจสอบแล้ว · บันทึกได้ทั้ง ${count} รายการ`",
    `await expect(page.locator("#disposal-round-executed-by")).toContainText(employeeLabel("itStaff"))`,
    `toHaveText(/^รอบตัดจำหน่าย · /)`,
  ]) assert.ok(support.includes(step), step)
  for (const step of [
    `const ASKED = ["donate", "dispose", "donate"] as const`,
    String.raw`\\(คุณอนุมัติรายการนี้\\)$`,
    `await chooseMethod(page, "ขาย")`,
    `toHaveText("จะเปลี่ยนวิธีของ 3 คำขอเป็น ขาย")`,
    `saleValue: "3000.00" }, 3)`,
    `toContainText("ราคาขายเหมาของรอบ 3,000.00 บาท · 3 เครื่อง")`,
    `.toBe("Disposed")`,
    "`/th/disposal/rounds?search=${encodeURIComponent(round.roundNo)}`",
    `workbook.getWorksheet("รายการ")`,
    `["ลำดับ", "รหัสทรัพย์สิน", "ชื่อทรัพย์สิน", "Serial", "รูป"]`,
    `expect(sheet.getImages()).toHaveLength(3)`,
    `expect(execute.status()).toBe(410)`,
    `expect(bulk.status()).toBe(410)`,
    `"DISPOSAL_USE_ROUND"`,
    `toContainText("คำขอไม่อยู่ในสถานะอนุมัติแล้ว")`,
    `expect(commitBody.code).toBe("DISPOSAL_ROUND_BLOCKED")`,
    `await expect(checkRoundButton(page)).toBeDisabled()`,
    `main.locator("article").filter({ visible: true })).toHaveCount(3)`,
  ]) assert.ok(spec.includes(step), step)
  assert.ok(spec.includes(`import ExcelJS from "exceljs"`), "the report is read with exceljs")
  // The words the specs read are the app's own.
  const th = JSON.parse(read("messages/th.json")) as { disposalPage: { queue: Record<string, string>; rounds: Record<string, string> & { form: Record<string, string> & { blocked: Record<string, string> } } } }
  const { queue, rounds } = th.disposalPage
  assert.equal(queue.roundTickApprover, "คุณอนุมัติรายการนี้")
  assert.equal(queue.roundTickNoEvidence, "ยังไม่มีหลักฐาน")
  assert.equal(queue.roundCreate, "สร้างรอบตัดจำหน่าย {count} รายการ")
  assert.equal(queue.roundBarLabel, "รายการที่เลือกสำหรับรอบตัดจำหน่าย")
  assert.equal(queue.roundSelectedCount, "{count} เลือกแล้ว (จากทุกหน้า)")
  assert.equal(queue.roundPhoneNote, "สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์")
  assert.equal(rounds.pageTitle, "รอบตัดจำหน่าย · {title}")
  assert.equal(rounds.exportReport, "ส่งออกรายงานส่งบัญชี")
  assert.equal(rounds.saleLine, "ราคาขายเหมาของรอบ {value} บาท · {count} เครื่อง")
  assert.equal(rounds.form.review, "ตรวจสอบรอบ")
  assert.equal(rounds.form.save, "บันทึกรอบตัดจำหน่าย {count} รายการ")
  assert.equal(rounds.form.methodChange, "จะเปลี่ยนวิธีของ {count} คำขอเป็น {method}")
  assert.equal(rounds.form.footerReviewed, "ตรวจสอบแล้ว · บันทึกได้ทั้ง {count} รายการ")
  assert.equal(rounds.form.footerBlocked, "บันทึกไม่ได้ {count} รายการ · นำออกก่อนบันทึก")
  assert.equal(rounds.form.blockedTitle, "บันทึกในรอบนี้ไม่ได้ {count} รายการ")
  assert.equal(rounds.form.removeBlocked, "นำรายการที่บันทึกไม่ได้ออกทั้งหมด")
  assert.equal(rounds.form.blocked.DISPOSAL_SOD_CONFLICT, "คุณอนุมัติรายการนี้")
  assert.equal(rounds.form.blocked.DISPOSAL_INVALID_STAGE, "คำขอไม่อยู่ในสถานะอนุมัติแล้ว")
  assert.equal(rounds.form.blocked.DISPOSAL_EVIDENCE_REQUIRED, "ยังไม่มีหลักฐาน · ให้ผู้ดูแลระบบบันทึก")
})

test("the request-batch pages: the form with a photo per machine and the lot photo, the batch page, the approvals panel's first photo, a round from the batch, a lost batch, the list, the phone (request batches Task 5)", () => {
  const support = read("e2e/disposal/disposal-support.ts")
  const spec = read("e2e/disposal/batch-pages.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "IT staff walk it")
  assert.deepEqual([...spec.matchAll(/recordPrefix\(testInfo, "(DSP\d+)"\)/g)].map((match) => match[1]), ["DSP9", "DSP10"])
  assert.ok(spec.includes(`test.describe.configure({ mode: "serial" })`), "one batch through the tests")
  // The helpers: the form's machine rows, the lot input, the send with no review, the phone's batch through the API.
  for (const step of [
    `export const BATCH_PHONE_NOTE = "สร้างชุดคำขอได้บนคอมพิวเตอร์"`,
    `page.getByPlaceholder("ค้นหารหัสทรัพย์สิน Serial หรือชื่อ")`,
    "page.locator(`[data-disposal-batch-machine=\"${asset.assetTag}\"]`)",
    `page.locator("#disposal-batch-lot-files")`,
    "page.getByRole(\"button\", { name: `ส่งคำขอ ${count} เครื่อง`, exact: true })",
    "await expectToast(page, `สร้างชุดคำขอ ${count} รายการสำเร็จ`)",
    `page.request.post("/api/disposal-batches"`,
    "`/api/disposal-batches/${batch.batch.id}/attachments`",
    "`/api/disposal-requests/${request.id}/attachments`",
  ]) assert.ok(support.includes(step), step)
  assert.ok(!support.includes("ยืนยันสร้างชุดคำขอ"), "no review step")
  for (const step of [
    `toHaveText("3 เครื่อง · มีรูปของเครื่อง 1 · ที่เหลือใช้รูปรวม")`,
    "toHaveText(`Serial ${serial}`)",
    `toHaveText("Serial –")`,
    `toContainText("ใช้รูปรวม")`,
    `toContainText(BATCH_PHONE_NOTE)`,
    `.toBe(ownPhotoId)`,
    `.toBe(lotPhotoId)`,
    `page.getByRole("button", { name: "สร้างรอบตัดจำหน่ายจากชุดนี้ (3 เครื่อง)" })`,
    `await expect(roundButton.filter({ visible: true })).toHaveCount(0)`,
    `getByText("ตัดจำหน่ายแล้ว 3/3")`,
    `expect(rowsWithImages).toContain(ownRow)`,
    `await chooseMethod(page, "สูญหาย")`,
    `await expect(page.locator("[data-disposal-batch-machine-photo]")).toHaveCount(0)`,
    `setInputFiles(EVIDENCE_PDF)`,
    "`/th/disposal/batches?q=${encodeURIComponent(batchNo)}`",
    `toContainText("ตัดจำหน่ายแล้ว 3/3")`,
    `recordSettled(page, measure,`,
  ]) assert.ok(spec.includes(step), step)
  // The words the specs read are the app's own.
  const th = JSON.parse(read("messages/th.json")) as { disposalPage: { batchForm: Record<string, string>; batchPage: Record<string, string>; batchCreateSuccess: string } }
  const { batchForm, batchPage, batchCreateSuccess } = th.disposalPage
  assert.equal(batchForm.phoneTitle, "สร้างชุดคำขอได้บนคอมพิวเตอร์")
  assert.equal(batchForm.search, "ค้นหารหัสทรัพย์สิน Serial หรือชื่อ")
  assert.equal(batchForm.countLine, "{count} เครื่อง · มีรูปของเครื่อง {withPhoto} · ที่เหลือใช้รูปรวม")
  assert.equal(batchForm.submit, "ส่งคำขอ {count} เครื่อง")
  assert.equal(batchCreateSuccess, "สร้างชุดคำขอ {count} รายการสำเร็จ")
  assert.equal(batchPage.progress, "ตัดจำหน่ายแล้ว {disposed}/{total}")
  assert.equal(batchPage.useLotPhoto, "ใช้รูปรวม")
  assert.equal(batchPage.roundCreate, "สร้างรอบตัดจำหน่ายจากชุดนี้ ({count} เครื่อง)")
})
