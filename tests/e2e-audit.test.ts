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
  // The master ids come from the asset form, on a page of its own beside the round form (group 2 plan 1 task 4: the
  // round form's conditions are chips with no select to read). Each select's options are waited for (13B loop 5).
  assert.match(data, /const form = await page\.context\(\)\.newPage\(\)\n\s*try \{\n\s*await form\.goto\("\/th\/assets\/new"\)/)
  assert.match(data, /const select = form\.locator\(`#\$\{id\}`\)\n(?:\s*\/\/[^\n]*\n)*\s*await expect\(select\.locator\('option:not\(\[value=""\]\)'\)\.first\(\)\)\.toBeAttached\(\)\n\s*return select\n\s*\.locator\("option"\)\n\s*\.evaluateAll\(/)
  assert.match(data, /\} finally \{\n\s*await form\.close\(\)\n\s*\}/)

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
  // Group 2 plan 1 (spec §7, §14, §16): no status choice, the department as a condition chip, the live count is the
  // round's items, and the round opens at once.
  assert.ok(open.includes(`await expect(page.locator("#audit-round-status")).toHaveCount(0)`))
  assert.ok(!open.includes(".selectOption(") && !open.includes(`{ name: "ดูตัวอย่าง" }`), "no status or scope select, no preview button")
  assert.ok(open.includes("const save = rounds.createButton(page)"))
  assert.ok(open.includes("await rounds.addCondition(page, \"แผนก\", records.department.code, `${records.department.code} - ${records.department.name}`)"))
  assert.ok(open.includes("await expect(rounds.willCreate(page, inRound.length)).toBeVisible()"))
  assert.ok(open.includes("const liveCount = await rounds.readWillCreate(page)"))
  assert.ok(open.includes(`expect(round.generatedItems, "the live count is the round's items (group 2 spec §16)").toBe(liveCount)`))
  assert.ok(open.includes(`expect(saved.status, "open at once, never a draft (group 2 spec §14)").toBe("open")`))
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
  for (const key of ["saveAllMatch", "photoRequiredMismatch", "addNotePhoto", "componentMarkMissing", "componentMissingConfirm", "searchRegister", "recordOutOfScope", "saveOutOfScope"]) {
    assert.ok(walk.includes(words[key]), key)
  }
  assert.ok(walk.includes(`asUser("itStaff")`))
  assert.ok(walk.includes(`if (e2eDevice === "phone") await scan.slowNetwork(page)`), "slow 4G on the phone only")
  // Found by typing: the tag for most, a word of the name for the mismatch.
  assert.ok(walk.includes("scan.findAndOpen(page, assets.matched.tag, assets.matched.tag)"))
  assert.ok(walk.includes(`scan.findAndOpen(page, "เครื่องพิมพ์", assets.mismatch.tag)`))
  // Group 2 plan 2 (spec §8): the walk opens the scan page from the next-step card's main button, not the old header link.
  assert.ok(walk.includes("await roundPage.nextStepCard(page).getByRole(\"link\", { name: fillTemplate(W.continueScan, { count: 7 }), exact: true }).click()"))
  assert.ok(!walk.includes(`{ name: "สแกนตรวจนับ" }`), "not the old header link")
  // The mismatch: another department and the condition, with the photo; the parent asks while a component is unchecked.
  assert.ok(walk.includes(`"บันทึก · ไม่ตรง 2 ข้อ (แผนก, สภาพ)"`))
  // N-AU1 (user decision 2026-10-21): the department and the condition differ, so the waiting save names both
  // ("ข้อมูลไม่ตรง ..."), not the condition alone.
  assert.ok(walk.includes(`scan.checkForm(page).getByText("${words.photoRequiredMismatch}")`), "the reason for a department and a condition mismatch")
  assert.ok(!walk.includes(words.photoRequiredCondition), "not the condition-alone reason")
  assert.ok(walk.includes(`scan.addPhoto(page, fromRoot("e2e/fixtures/photo.png"))`))
  // DX5 (ก): a tap on the waiting save opens the note-and-photo section (finding AU2), so the walk taps it.
  const mismatch = walk.slice(walk.indexOf(`"บันทึก · ไม่ตรง 2 ข้อ (แผนก, สภาพ)"`), walk.indexOf(`scan.addPhoto(page, fromRoot("e2e/fixtures/photo.png"))`))
  assert.ok(mismatch.includes(`await scan.saveButton(page).click({ force: true })`), "the waiting save is tapped (aria-disabled: forced past Playwright's wait)")
  assert.ok(mismatch.includes(`.toHaveAttribute("aria-expanded", "true")`), "and the section is open")
  assert.ok(!mismatch.includes(`getByRole("button", { name: "หมายเหตุ / รูป" }).click()`), "the walk does not open the section itself")
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
  assert.ok(room.includes(thai("common").offlineBannerWith.replace("{detail}", words.bannerQueued.replace("{count}", "1"))) && room.includes(thai("common").offlineBannerWith.replace("{detail}", words.bannerOfflineSaves)) && room.includes(words.pendingLink))
  assert.ok(room.includes("const notFound = { ...assets.notFound, room: records.rooms.roomB, custodian: null }"))
  assert.ok(room.includes(`pending.markNotFound(page, e2eDevice, notFound, () => recordSettled(page, measure, "not found dialog"))`))
  // Group 2 plan 2 (spec §9): the title and the room chips count the rows; room B stays chosen at 0 after its last item (P2-R11, P2-R12).
  assert.ok(room.includes("await pending.expectRoomChips(page, 1, { [chain.rooms.roomB]: 1 }, chain.rooms.roomB)"))
  assert.ok(room.includes("await roundPage.expectChipsMatchRows(page, pending.roomChips(page), pending.pendingRows(page, e2eDevice, runTags))"))
  assert.ok(room.includes("await pending.expectRoomChips(page, 0, { [chain.rooms.roomB]: 0 }, chain.rooms.roomB)"))
  const pendingSteps = read("e2e/audit/pending-steps.ts")
  for (const key of ["markNotFound", "notFoundDialogTitle", "notFoundConfirm", "notFoundSuccess"]) assert.ok(pendingSteps.includes(thai("auditPending")[key]), key)
  // Spec §9 (bugs 14, 15): the button sits on the row on both screens, and the dialog names the asset.
  assert.ok(!pendingSteps.includes("การดำเนินการของ"), "no ⋯ on the desktop row")
  assert.ok(pendingSteps.includes("for (const text of [asset.name, asset.tag, asset.room.code, asset.room.name, asset.custodian ?? W.noCustodian, W.notFoundResult]) await expect(dialog).toContainText(text)"))
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
  assert.ok(head.includes(`getByRole("main").getByText("${thai("auditRound").statusClosed}", { exact: true })`), "the closed badge, in the app's own word")
  const review = read("e2e/audit/review-steps.ts")
  assert.ok(review.includes("export function findingEntry(") && review.includes("export async function browserFetch("))
  // Group 2 plan 2 (spec §8, §13 bug 2): the close sits whole inside the next-step card, and the IT head did not open the round.
  assert.ok(head.includes(`const close = nextStep.getByRole("button", { name: "${thai("auditRound").closeRound}", exact: true })`))
  assert.ok(head.includes("await roundPage.expectInside(close, nextStep)"))
  assert.ok(head.includes("await expect(page.getByText(W.openerCannotClose)).toHaveCount(0)") && !head.includes("ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ"))
})

test("the IT head's own finding and own close are refused by the segregation rules and the round is cancelled; the audit exports by permission (e2e audit task 5, EA5)", async () => {
  const { auditSegregationErrors } = await import("../src/lib/audit-segregation.ts")
  const spec = read(SPEC)
  const own = block(spec, "The IT head's own round")
  assert.ok(own.includes(`asUser("itHead")`))
  // The rules as the code has them (spec §6.2.4, the user's "เลือก 3"): the reporter may not review, the opener may not close.
  assert.ok(own.includes(`body: { error: "${auditSegregationErrors.reviewOwnFinding}" }`))
  assert.ok(own.includes(`body: { error: "${auditSegregationErrors.closeOwnRound}" }`))
  // Group 2 plan 2 (spec §8, §9): the next-step card tells the opener, with no close before step 3; the cancel is in
  // "อื่น ๆ"; the room chips before and after the not-found.
  assert.ok(own.includes("await expect(nextStep.getByText(W.openerCannotClose)).toBeVisible()") && !own.includes("ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ"))
  assert.ok(own.includes(`await expect(nextStep.getByRole("button", { name: "${thai("auditRound").closeRound}", exact: true })).toHaveCount(0)`))
  assert.ok(own.includes(`await page.getByRole("main").getByRole("button", { name: W.more, exact: true }).click()`) && own.includes(`await page.getByRole("menuitem", { name: W.cancelRound, exact: true }).click()`))
  assert.ok(own.includes(`await pending.expectRoomChips(page, 2, { [chain.rooms.roomB]: 2 }, "all")`) && own.includes(`await pending.expectRoomChips(page, 1, { [chain.rooms.roomB]: 1 }, "all")`))
  assert.ok(own.includes(thai("auditRound").cancelReasonRequired) && own.includes(thai("auditRound").cancelSuccess))

  // The exports: finding AU1 is fixed (FX4) and decision U1 is DX6 (ก): the IT head holds audit:export and downloads.
  const exports = block(spec, "The audit exports by permission")
  assert.ok(!exports.includes(`test.fail(true, "AU1: `) && !exports.includes(`test.fail(true, "U1: `), "AU1 is fixed (FX4); U1 is decided (DX6)")
  assert.ok(exports.includes(`page.getByRole("link", { name: "${thai("auditFinding").exportFindings}" })`))
  // Group 2 plan 2 (spec §8, §16): IT staff get no export menu on the round page; after the review the IT head sees the
  // rejected condition leave its bar (P2-R1) and the Excel export follow the category.
  assert.ok(exports.includes(`await expect(page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true })).toHaveCount(0)`))
  assert.ok(exports.includes(`await page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true }).click()`))
  assert.ok(exports.includes(`await expect(roundPage.fieldBar(card, "condition")).toHaveCount(0)`))
  assert.ok(exports.includes(`expect(tags.sort(), "the category's items only").toEqual([assets.component1.tag, assets.component2.tag].sort())`))
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  assert.deepEqual(Object.entries(E2E_ROLE_PERMISSIONS).filter(([, permissions]) => permissions.includes("audit:export")).map(([key]) => key), ["itHead"], "only the IT head holds audit:export (DX6)")
})

test("IT staff read the round page after the walk: each chip's count is its rows, the categories within the result, a bar per field, the parent with a component not found (group 2 plan 2 task 7)", () => {
  const spec = read(SPEC)
  const title = `test.describe("IT staff read the round page after the walk"`
  const after = block(spec, "IT staff read the round page after the walk")
  assert.ok(after.includes(`asUser("itStaff")`))
  // In the chain after room B and before the refusals: the walk's results, no decision yet.
  assert.ok(spec.indexOf(`test.describe("IT staff in room B, offline, and not found"`) < spec.indexOf(title) && spec.indexOf(title) < spec.indexOf(`test.describe("IT staff are refused the review and the close"`))
  // The walk's counts (spec §8, P2-R2, P2-R3): 7 = 4 + 1 + 2 + 0, the out-of-scope find apart, four items waiting.
  assert.ok(after.includes("await roundPage.expectChips(results, [[W.resultAll, 7], [W.resultPending, 0], [W.resultFound, 4], [W.resultMismatch, 1], [W.resultNotFound, 2], [W.resultOutOfScope, 1], [W.resultPendingReview, 4]])"))
  assert.equal((after.match(/await roundPage\.expectChipsMatchRows\(page, (?:results|categories), rows\)/g) ?? []).length, 3)
  for (const [category, count] of [["categoryDesktop", 5], ["categoryComponent", 2], ["categoryDesktop", 1], ["categoryComponent", 1]] as const) {
    assert.ok(after.includes(`await roundPage.expectChip(categories, \`categoryId=\${masters.${category}}\`, ${count})`), `${category} ${count}`)
  }
  assert.ok(after.includes(`for (const field of ["department", "condition"] as const) {`) && after.includes("await expect(card.getByText(W.multipleFields, { exact: true })).toBeVisible()"))
  assert.ok(after.includes("await expect(roundPage.filterChip(page, fillTemplate(W.componentsMissingChip, { count: 1 }))).toBeVisible()"))
  assert.ok(after.includes("`${W.missingComponentPrefix} ${assets.component2.name} (${assets.component2.tag})`"))
  // Step 2 counts findings, the rows of the findings page (P2-R26): the five the IT head decides in block 6.
  assert.ok(after.includes("fillTemplate(W.reviewWaiting, { count: 5 })") && after.includes("fillTemplate(W.reviewItems, { count: 5 })"))
  assert.ok(after.includes(`await parentRow.getByRole("link", { name: assets.component2.tag, exact: true }).click()`))
  // "ส่วนควบของ <parent>" on the findings page is plan 4's step (spec §16), not this block's.
})
