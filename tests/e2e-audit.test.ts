import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The E2E suite's field audit walk and review (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md
// §6.2; the audit tasks EA1–EA5). One test per task, appended in order. The walk itself runs with `npm run test:e2e`
// against a running app; these pin what can be checked without one. The working tree is CRLF on Windows: every read
// strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const SPEC = "e2e/audit/field-audit.spec.ts"
// The Thai words of one namespace of messages/th.json, so the walk's words are the app's own.
const thai = (namespace: string) => JSON.parse(read("messages/th.json"))[namespace] as Record<string, string>

// The text of one block of the spec: from its describe line to the next top-level describe (or the end).
function block(source: string, title: string): string {
  const start = source.indexOf(`test.describe("${title}"`)
  assert.ok(start >= 0, `the block "${title}"`)
  const next = source.indexOf("\ntest.describe(", start + 1)
  return source.slice(start, next < 0 ? undefined : next)
}

test("the walk's records carry the run id and the project within the schemas' limits; IT staff open the round on the form after its errors under the fields (e2e audit task 1, EA1)", async () => {
  const { auditRecords, projectCode } = await import("../e2e/audit/audit-plan.ts")
  const { E2E_PROJECTS } = await import("../e2e/support/matrix.ts")
  // The longest run id the guard makes (after Z: T and the time).
  const runId = "E2E-1019T2359"
  assert.deepEqual(E2E_PROJECTS.map((project) => projectCode(project.name)), ["DL", "DD", "PL", "PD"])
  const tags = new Set<string>()
  for (const project of E2E_PROJECTS) {
    const records = auditRecords(runId, project.name)
    const prefix = `${runId}-${records.code}`
    // src/lib/validations/department.ts code max 20, location.ts code max 50, the asset tag column 50.
    assert.ok(records.department.code.startsWith(prefix) && records.department.code.length <= 20, records.department.code)
    for (const room of Object.values(records.rooms)) assert.ok(room.code.startsWith(prefix) && room.code.length <= 50 && room.name.startsWith(runId), room.code)
    for (const asset of records.assets) {
      assert.ok(asset.tag.startsWith(`${prefix}-`) && asset.tag.length <= 50, asset.tag)
      assert.ok(asset.name.startsWith(`${runId} ${records.code} `), asset.name)
      assert.ok(!tags.has(asset.tag), `${asset.tag} is the project's own`)
      tags.add(asset.tag)
    }
    // Room A: matched, mismatch, the parent and its two components; room B: not found and offline; the outsider is the
    // run's department in room A.
    const where = Object.fromEntries(records.assets.map((asset) => [asset.key, `${asset.room}/${asset.department}`]))
    assert.deepEqual(where, {
      matched: "roomA/round",
      mismatch: "roomA/round",
      parent: "roomA/round",
      component1: "roomA/round",
      component2: "roomA/round",
      notFound: "roomB/round",
      offline: "roomB/round",
      outOfScope: "roomA/run",
    })
    assert.deepEqual(records.components.map((component) => component.key), ["component1", "component2"])
    assert.ok(records.round.name.startsWith(runId) && records.ownRound.name.startsWith(runId) && records.unknownTag.startsWith(prefix))
  }
  assert.throws(() => projectCode("setup"), /no short code/)

  // Created through the app: the places as the seed admin, the assets and the component install as the person.
  const data = read("e2e/audit/audit-data.ts")
  for (const route of [`"/api/departments"`, `"/api/locations"`, `"/api/assets"`, "/components`"]) assert.ok(data.includes(route), route)
  assert.ok(!/prisma|mssql/i.test(data.replace(/^\/\/.*$/gm, "")), "no direct database access")

  // The spec: WebKit on the phone, one serial chain, IT staff open the round on the form; the errors under the fields.
  const spec = read(SPEC)
  assert.ok(!spec.includes(`from "@playwright/test"`), "the suite's own test")
  assert.ok(spec.split("\n").includes("runPhoneOnWebKit()"))
  assert.ok(spec.split("\n").includes(`test.describe.configure({ mode: "serial" })`))
  const open = block(spec, "IT staff open the round")
  assert.ok(open.includes(`asUser("itStaff")`))
  assert.ok(open.includes(`await measure.visit("/th/audit/rounds/new", "round form")`))
  assert.ok(open.includes(`toHaveText("${JSON.parse(read("messages/th.json")).common.validation.required}")`), "the required error under the name")
  assert.ok(open.includes(`toHaveText("${JSON.parse(read("messages/th.json")).common.validation.endBeforeStart}")`), "the date pair error under the end date")
  assert.ok(open.includes(thai("auditRound").createTitle) && open.includes(thai("auditRound").statusOpen))
})

test("IT staff walk room A by typing on the phone, on a slow network: matched, mismatch with its photo, a parent with components, unknown and out of scope (e2e audit task 2, EA2)", async () => {
  const steps = await import("../e2e/audit/scan-steps.ts")
  // Spec §8: slow 4G on the phone's walk (latency, every request), and the keyboard-open height.
  assert.equal(steps.SLOW_4G_ROUND_TRIP_MS, 150)
  // The pages, RSC payloads and assets are slowed; the app's API calls are not (WebKit cannot resend an intercepted body).
  const slowed = (url: string) => steps.isSlowedOnThePhone(new URL(url, "http://localhost:3100"))
  assert.deepEqual(["/th/audit/rounds/r1/scan", "/th/audit/rounds/r1?_rsc=a", "/_next/static/chunks/a.js", "/api/audit-rounds/r1/scan", "/api/assets/a1/attachments"].map(slowed), [true, true, true, false, false])
  assert.deepEqual(steps.KEYBOARD_OPEN_VIEWPORT, { width: 390, height: 360 })
  assert.equal(steps.escapeRegExp("E2E-1019A-DL-A1 (x)"), "E2E-1019A-DL-A1 \\(x\\)")
  assert.ok(steps.tagPattern("E2E-1019A-DL-A1").test("ดู E2E-1019A-DL-A1 จอภาพ"))

  // The words the walk types and reads are the app's own (messages/th.json auditScan).
  const words = thai("auditScan")
  const helper = read("e2e/audit/scan-steps.ts")
  for (const key of ["searchItemsLabel", "roomSheetTitle"]) assert.ok(helper.includes(`"${words[key]}"`), key)
  const walk = block(read(SPEC), "IT staff walk room A")
  for (const key of ["saveAllMatch", "photoRequiredCondition", "addNotePhoto", "componentMarkMissing", "componentMissingConfirm", "searchRegister", "recordOutOfScope", "saveOutOfScope"]) {
    assert.ok(walk.includes(words[key]), key)
  }
  assert.ok(walk.includes(`asUser("itStaff")`))
  assert.ok(walk.includes(`if (e2eDevice === "phone") await scan.slowNetwork(page)`), "slow 4G on the phone only")
  // Found by typing: the tag for most, a word of the name for the mismatch.
  assert.ok(walk.includes("scan.findAndOpen(page, assets.matched.tag, assets.matched.tag)"))
  assert.ok(walk.includes(`scan.findAndOpen(page, "เครื่องพิมพ์", assets.mismatch.tag)`))
  // The mismatch: another department and the condition, with the photo; the parent asks while a component is unchecked.
  assert.ok(walk.includes(`"บันทึก · ไม่ตรง 2 ข้อ (แผนก, สภาพ)"`))
  assert.ok(walk.includes(`scan.addPhoto(page, fromRoot("e2e/fixtures/photo.png"))`))
  assert.ok(walk.includes(`page.getByRole("alertdialog", { name: "ส่วนควบยังตรวจไม่ครบ 1 ชิ้น" })`))
  assert.ok(walk.includes(`expect(parentScans, "cancelling the question sends nothing").toEqual([])`))
  // The keyboard-open height on the phone, then back.
  assert.ok(walk.includes("await page.setViewportSize(scan.KEYBOARD_OPEN_VIEWPORT)") && walk.includes("await page.setViewportSize(PHONE.viewport)"))
})

test("offline the check waits on the device and is sent when the phone is back; the not-found from the pending list; the test's own offline window (e2e audit task 3, EA3)", async () => {
  const core = await import("../e2e/support/measure-core.ts")
  const page = "http://localhost:3100/th/audit/rounds/r1/scan"
  const records = {
    console: [
      { kind: "console" as const, text: "Failed to load resource: net::ERR_INTERNET_DISCONNECTED", pageUrl: page },
      { kind: "console" as const, text: "Failed to load resource: WebKit encountered an internal error", pageUrl: page },
      { kind: "console" as const, text: "Failed to load resource: WebKit encountered an internal error", pageUrl: page },
    ],
    failures: [
      { method: "GET", url: "http://localhost:3100/before", errorText: "net::ERR_INTERNET_DISCONNECTED", resourceType: "fetch", pageUrl: page },
      { method: "POST", url: "http://localhost:3100/api/audit-rounds/r1/scan", errorText: "WebKit encountered an internal error", resourceType: "fetch", pageUrl: page },
      { method: "GET", url: "http://localhost:3100/api/x", errorText: "net::ERR_ABORTED", resourceType: "fetch", pageUrl: page },
    ],
  }
  // Only what the window holds, and only the browser's offline error: the record before it and the aborted one stay.
  const split = core.splitOfflineRecords(records, { console: 1, failures: 1 })
  assert.deepEqual(split.console.map((message) => message.text), ["Failed to load resource: net::ERR_INTERNET_DISCONNECTED"])
  assert.deepEqual(split.failures.map((failure) => failure.url), ["http://localhost:3100/before", "http://localhost:3100/api/x"])
  assert.deepEqual(split.allowed, [
    { id: "offline-by-the-test", kind: "console", text: "Failed to load resource: WebKit encountered an internal error" },
    { id: "offline-by-the-test", kind: "console", text: "Failed to load resource: WebKit encountered an internal error" },
    { id: "offline-by-the-test", kind: "requestfailed", url: "http://localhost:3100/api/audit-rounds/r1/scan" },
  ])
  const measure = read("e2e/support/measure.ts")
  assert.match(measure, /async whileOffline<T>\(step: \(\) => Promise<T>\): Promise<T> \{\n[\s\S]*?setOffline\(true\)[\s\S]*?finally \{\n\s*await this\.page\.context\(\)\.setOffline\(false\)/)
  assert.ok(measure.includes("allowed: [...classified.allowed, ...this.offlineAllowed],"))
  // The reviewed allow-list is not widened for it: no entry lets the browser's offline error, or its console line, through.
  const { ALLOW_LIST } = await import("../e2e/support/allow-list.ts")
  for (const entry of ALLOW_LIST) {
    for (const text of ["net::ERR_INTERNET_DISCONNECTED", "WebKit encountered an internal error"]) {
      assert.ok(!(entry.errorText?.test(text) ?? false), `${entry.id} lets ${text} through`)
      assert.ok(!(entry.text?.test(`Failed to load resource: ${text}`) ?? false), `${entry.id} lets its console line through`)
    }
  }

  const words = thai("auditScan")
  const room = block(read(SPEC), "IT staff in room B, offline, and not found")
  assert.ok(room.includes("await measure.whileOffline(async () => {"))
  assert.ok(!room.includes("setOffline("), "the window is the measurement's")
  assert.ok(room.includes(words.savedQueued.replace("{assetTag}", "${assets.offline.tag}")), "kept on the device")
  assert.ok(room.includes(words.offlineBarOffline.replace("{count}", "1")) && room.includes(words.pendingLink))
  assert.ok(room.includes("pending.markNotFound(page, e2eDevice, assets.notFound.tag"))
  const pendingSteps = read("e2e/audit/pending-steps.ts")
  for (const key of ["markNotFound", "notFoundDialogTitle", "notFoundConfirm", "notFoundSuccess"]) assert.ok(pendingSteps.includes(thai("auditPending")[key]), key)
})

test("IT staff are refused the review and the close; the IT head reviews every finding and closes the round (e2e audit task 4, EA4)", async () => {
  const spec = read(SPEC)
  const refused = block(spec, "IT staff are refused the review and the close")
  assert.ok(refused.includes(`asUser("itStaff")`))
  assert.ok(refused.includes(thai("auditFinding").segregationReviewBlocked))
  // Both refusals are the test's own: declared, then read from the route.
  assert.ok(refused.includes('measure.expectRefusal({ method: "POST", url: /\\/api\\/audit-findings\\/[^/]+\\/review$/, status: 403'))
  assert.ok(refused.includes('measure.expectRefusal({ method: "PATCH", url: new RegExp(`/api/audit-rounds/${chain.roundId}$`), status: 403'))
  assert.equal((refused.match(/\{ status: 403, body: \{ error: "Forbidden: insufficient permissions" \} \}/g) ?? []).length, 2)

  const head = block(spec, "The IT head reviews and closes")
  assert.ok(head.includes(`asUser("itHead")`))
  const finding = thai("auditFinding")
  // Every finding the walk made: the department approved, the condition rejected, both not-founds and the outsider.
  for (const type of ["type_wrong_department", "type_wrong_condition", "type_not_found", "type_out_of_scope"]) assert.ok(head.includes(`type: "${finding[type]}"`), type)
  assert.equal((head.match(/action: "approve", remark/g) ?? []).length, 4)
  assert.equal((head.match(/action: "reject", remark/g) ?? []).length, 1)
  assert.ok(head.includes(`expect(mismatch.department?.code, "the approved department").toBe(runDepartment)`))
  assert.ok(head.includes(thai("auditRound").closeConfirm) && head.includes(thai("auditRound").closeSuccess))
  const review = read("e2e/audit/review-steps.ts")
  assert.ok(review.includes("export function findingEntry(") && review.includes("export async function browserFetch("))
})

test("the IT head's own finding and own close are refused by the segregation rules and the round is cancelled; the audit exports by permission (e2e audit task 5, EA5)", async () => {
  const { auditSegregationErrors } = await import("../src/lib/audit-segregation.ts")
  const spec = read(SPEC)
  const own = block(spec, "The IT head's own round")
  assert.ok(own.includes(`asUser("itHead")`))
  // The rules as the code has them (spec §6.2.4, the user's "เลือก 3"): the reporter may not review, the opener may not close.
  assert.ok(own.includes(`body: { error: "${auditSegregationErrors.reviewOwnFinding}" }`))
  assert.ok(own.includes(`body: { error: "${auditSegregationErrors.closeOwnRound}" }`))
  assert.ok(own.includes(thai("auditRound").closeSeparateApprover))
  assert.ok(own.includes(thai("auditRound").cancelReasonRequired) && own.includes(thai("auditRound").cancelSuccess))

  // The exports: expected to fail until finding AU1 (offered without audit:export) and decision U1 (no role holds it).
  const exports = block(spec, "The audit exports by permission")
  assert.ok(exports.includes(`test.fail(true, "AU1: `) && exports.includes(`test.fail(true, "U1: `))
  assert.ok(exports.includes(`page.getByRole("link", { name: "${thai("auditFinding").exportFindings}" })`))
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  for (const permissions of Object.values(E2E_ROLE_PERMISSIONS)) assert.ok(!permissions.includes("audit:export"), "no E2E role holds audit:export (U1)")
})
