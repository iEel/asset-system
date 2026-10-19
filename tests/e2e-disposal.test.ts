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

test("one disposal is requested, approved alone and executed with evidence by the right people, and the print opens (e2e disposal task 1, ED1)", () => {
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
    `expect(headExecuteBody.code).toBe("DISPOSAL_SOD_CONFLICT")`,
    `await actAs(page, "itStaff", e2eTheme)`,
    `"กรุณาแนบหลักฐานก่อนบันทึกการตัดจำหน่ายจริง"`,
    `setInputFiles(EVIDENCE_PDF)`,
    `"กรุณากรอกเลขที่เอกสารอ้างอิง"`,
    `.toBe("Disposed")`,
    `"ใบอนุมัติตัดจำหน่ายทรัพย์สิน"`,
  ]) assert.ok(spec.includes(step), step)
  // Finding D1 is fixed (FX1): the print's test is a plain test.
  assert.ok(!spec.includes(`test.fail(true, "finding D1:`), "D1 is fixed")
  assert.ok(spec.includes(`test.describe.configure({ mode: "serial" })`), "the print test follows the workflow")
})

test("a batch of two is requested with shared evidence, approved in one bulk approval, and executed; the own request and the approver's execution are refused (e2e disposal task 2, ED2)", () => {
  assert.deepEqual(disposalSpecs().filter((file) => file === "batch-bulk-approval.spec.ts"), ["batch-bulk-approval.spec.ts"])
  const spec = read("e2e/disposal/batch-bulk-approval.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "IT staff walk it")
  assert.ok(spec.includes(`recordPrefix(testInfo, "DSP2")`), "its own records")
  assert.ok(spec.includes(`test.describe.configure({ mode: "serial" })`), "one batch through four tests")
  for (const step of [
    `await measure.visit("/th/disposal/batch/new"`,
    `"#disposal-batch-requested-by-error"`,
    `"ยืนยันสร้างชุดคำขอ"`,
    String.raw`/^DPB-\d{8}-\d{4}$/`,
    `requestedById: readRunData().employees.itHead.id`,
    `"ไม่สามารถอนุมัติได้เนื่องจากขัดกับการแยกหน้าที่"`,
    `"ยืนยันอนุมัติ 2 รายการ"`,
    `"อนุมัติแล้ว (2)"`,
    `code: "DISPOSAL_SOD_CONFLICT"`,
    `"ไม่สามารถดำเนินการได้เนื่องจากขัดกับการแยกหน้าที่"`,
  ]) assert.ok(spec.includes(step), step)
  // The phone's queue needs its selection mode before a row can be ticked.
  assert.ok(spec.includes(`if (e2eDevice === "phone") await page.getByRole("button", { name: "เลือกหลายรายการ" }).click()`), "the phone's selection mode")
  // Findings D3 and D2 stay expected failures until fixed.
  assert.ok(spec.includes(`test.fail(true, "finding D3:`), "D3 expected to fail")
  assert.ok(spec.includes(`test.fail(true, "finding D2:`), "D2 expected to fail")
  assert.ok(spec.indexOf(`"finding D3:`) < spec.indexOf(`"finding D2:`), "the approver's preview runs while the request is still approved")
})

test("an asset in an open audit round cannot be requested for disposal, with the reason, and can once the round is cancelled (e2e disposal task 3, ED3)", () => {
  assert.deepEqual(disposalSpecs(), ["batch-bulk-approval.spec.ts", "open-audit-block.spec.ts", "single-request.spec.ts"])
  const spec = read("e2e/disposal/open-audit-block.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "IT staff walk it")
  assert.ok(spec.includes(`recordPrefix(testInfo, "DSP3")`), "its own records")
  // The round is the test's own, on its own room, open.
  assert.ok(spec.includes(`scopeLocationId: roomId,`) && spec.includes(`status: "open",`), "an open round on the test's room")
  for (const step of [
    `await expect(option).toBeDisabled()`,
    `"อยู่ในรอบตรวจนับที่ยังไม่ปิด"`,
    String.raw`measure.expectRefusal({ method: "POST", url: /\/api\/disposal-requests$/, status: 400,`,
    `"ทรัพย์สินยังมีงานค้างที่ต้องปิดก่อนสร้างคำขอตัดจำหน่าย"`,
    `expect(before.status?.name).toBe("Ready")`,
    `await actAs(page, "itHead", e2eTheme)`,
    `{ data: { action: "cancel", reason:`,
    `"สร้างคำขอตัดจำหน่ายสำเร็จ"`,
  ]) assert.ok(spec.includes(step), step)
  // Every disposal test makes its own records under its own workflow code.
  const codes = disposalSpecs().map((file) => read(`e2e/disposal/${file}`).match(/recordPrefix\(testInfo, "(DSP\d)"\)/)?.[1])
  assert.deepEqual(codes.sort(), ["DSP1", "DSP2", "DSP3"])
})
