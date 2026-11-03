import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import test from "node:test"

// The E2E suite's repair and PM area (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §6.3, §6.7;
// tasks ER1–ER4). One test per task, appended in order. The specs run with `npm run test:e2e` against a running app;
// these pin what can be checked without one: who walks, the run marker on every asset, the wrong entry first, the
// expected-to-fail findings, the Thai copy against messages/th.json, and the outcomes against the app's own rules.
// The working tree is CRLF on Windows: every read strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const th = JSON.parse(read("messages/th.json"))
const titles = (source: string) => [...source.matchAll(/^test\("([^"]+)"/gm)].map((match) => match[1])
// Every write a file sends: request.post/put/patch/delete and the URL it names.
const writes = (source: string) => [...source.matchAll(/request\.(post|put|patch|delete)\(\s*[`"]([^`"]+)[`"]/g)].map((match) => `${match[1]} ${match[2]}`)

test("repair records: an unfinished record sends an asset in use to Under Maintenance and repaired brings it back In Use, IT staff, a wrong entry first (e2e repair task 1, ER1)", async () => {
  const spec = read("e2e/repair/repair-record.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  // Spec §2: IT staff open and close repair records; the phone runs on Chromium (WebKit only for the audit walk and the
  // desk delivery, spec §8).
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`))
  assert.ok(!spec.includes("runPhoneOnWebKit()"))
  assert.ok(titles(spec).some((title) => title.endsWith("(ER1)")), "the ER1 test")
  // Every asset carries the run id and the project (spec §5, §11 "Run order"); the arranging writes are the asset and
  // its handover, through the app; nothing touches the settings, LDAP or the import.
  assert.ok(data.includes("const tag = `${readRunState().runId}-${testInfo.project.name}-${suffix}`"))
  // Group 5 plan 2 Task 4: and a run-marked PM plan, ended by its own test.
  assert.deepEqual(writes(data), ["post /api/assets", "post /api/assets/${assetId}/checkout", "post /api/maintenance-plans", "patch /api/maintenance-plans/${planId}"])
  assert.deepEqual(writes(spec), [])
  for (const banned of ["/api/admin/settings", "ldap", "import-confirm", "import-preview"]) assert.ok(!`${spec}${data}`.toLowerCase().includes(banned), banned)
  // Spec §6.7: an empty required field, then a date pair reversed, each shown under its field.
  assert.ok(spec.includes(`await expect(page.locator("#repair-record-problem-error")).toHaveText("${th.common.validation.required}")`))
  assert.ok(spec.includes(`await expect(dialog.locator("#repair-complete-return-date-error")).toHaveText("${th.repairRecord.returnDateBeforeReported}")`))
  // The Thai copy the walk reads is the app's own (messages/th.json).
  for (const text of [th.repairRecord.createTitle, th.repairRecord.doneNo, th.repairRecord.complete, th.repairRecord.completeTitle, th.repairRecord.status.in_progress, th.repairRecord.status.closed, th.repairRecord.outcome.usable]) {
    assert.ok(spec.includes(text), text)
  }
  // The outcomes the test asserts are the app's rules (src/lib/repair-record-policy.ts): an asset in use with an active
  // handover goes Under Maintenance, and repaired brings it back In Use.
  const policy = await import("../src/lib/repair-record-policy.ts")
  const inUse = { statusName: "In Use", ownershipType: "personal", custodianId: "employee", hasActiveCheckout: true, hasOpenRecord: false }
  assert.equal(policy.getRepairRecordCreateEffect(inUse, { done: false, outcome: "usable" }).nextStatusName, "Under Maintenance")
  assert.equal(policy.getRepairRecordCompleteEffect({ ...inUse, statusName: "Under Maintenance" }, "usable").nextStatusName, "In Use")
  assert.ok(spec.includes(`toBe("Under Maintenance")`) && spec.includes(`expect(after.status.name, "repaired, with an active handover: In Use").toBe("In Use")`))
})

test("repair records: repaired brings a Ready asset back to Ready and beyond repair sends it to Pending Disposal; the asset page's axe finding stays expected to fail (e2e repair task 2, ER2)", async () => {
  const spec = read("e2e/repair/repair-record.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  assert.ok(titles(spec).some((title) => title.endsWith("(ER2)")), "the ER2 test")
  // The walk starts on the asset's own page (its "บันทึกซ่อม"), which opens without its axe check: finding AR2 has its own
  // test, marked expected to fail, so it reports itself once AR2 is fixed.
  assert.ok(spec.includes("  await page.goto(`/th/assets/${asset.id}`)\n"))
  assert.ok(spec.includes(`test("the asset page passes axe (ER2, finding AR2)"`))
  assert.ok(!spec.includes(`  test.fail(true, "AR2: `), "AR2 is fixed (FX2)")
  assert.ok(spec.includes("  await measure.visit(`/th/assets/${asset.id}`, \"asset page\")\n"), "AR2's test runs axe on the asset page")
  assert.ok(data.includes("export async function completeRecord(page: Page, measure: Measure, recordId: string, outcome:"))
  for (const text of [th.repairRecord.outcome.beyond_repair, th.repairRecord.status.closed]) assert.ok(spec.includes(text), text)
  // A shared asset with no custodian: repaired is Ready, beyond repair is Pending Disposal (the app's rules).
  const policy = await import("../src/lib/repair-record-policy.ts")
  const shared = { statusName: "Under Maintenance", ownershipType: "shared", custodianId: null, hasActiveCheckout: false, hasOpenRecord: false }
  assert.equal(policy.getRepairRecordCompleteEffect(shared, "usable").nextStatusName, "Ready")
  assert.equal(policy.getRepairRecordCompleteEffect(shared, "beyond_repair").nextStatusName, "Pending Disposal")
  assert.ok(spec.includes(`.toBe("Ready")`) && spec.includes(`.toBe("Pending Disposal")`))
})

test("repair records: a second open record is refused, a mistaken one is cancelled back to Ready; the print and the open search stay expected to fail (e2e repair task 3, ER3)", async () => {
  const spec = read("e2e/repair/repair-record.spec.ts")
  assert.ok(titles(spec).some((title) => title.endsWith("(ER3)")), "the ER3 test")
  // The refusal of a second open record is the app's own reason, beside the asset it will not take.
  assert.ok(spec.includes(th.maintenancePage.errors.MAINTENANCE_OPEN_RECORD_EXISTS))
  assert.ok(spec.includes(`await expect(option).toHaveAttribute("aria-disabled", "true")`))
  for (const text of [th.repairRecord.cancel, th.repairRecord.cancelTitle, th.repairRecord.confirmCancel, th.repairRecord.status.cancelled, th.repairRecord.movement.cancel, th.repairRecord.printTitle]) {
    assert.ok(spec.includes(text), text)
  }
  // The findings of this task: each its own test, marked expected to fail with its id.
  // AR1 is fixed (FX1) and AR3 is decided (DX4 (ก)): their tests run as plain tests.
  assert.ok(!spec.includes(`test.fail(true, "AR1: `), "AR1 is fixed")
  for (const [title, id] of [["the open asset search passes axe (ER3, finding AR3)", "AR3"]]) {
    const start = spec.indexOf(`test("${title}"`)
    assert.ok(start >= 0, title)
    assert.ok(!spec.slice(start, spec.indexOf("\n})", start)).includes(`test.fail(true, "${id}: `), `${id} is fixed`)
  }
  // Cancelled, a stock asset with no custodian goes back to Ready (the app's rule).
  const policy = await import("../src/lib/repair-record-policy.ts")
  const stock = { statusName: "Under Maintenance", ownershipType: "stock", custodianId: null, hasActiveCheckout: false, hasOpenRecord: false }
  assert.equal(policy.getRepairRecordCancelEffect(stock).nextStatusName, "Ready")
  assert.ok(spec.includes(`expect((await readAsset(page.request, asset.id)).status.name, "cancelled: back to Ready").toBe("Ready")`))
})

test("the PM plan: created with a wrong entry first, recorded done on 31 Jan with the next due date clamped to 28 Feb, paused, resumed and ended, IT staff (e2e repair task 4, ER4)", async () => {
  const spec = read("e2e/repair/pm-plan.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`))
  assert.ok(!spec.includes("runPhoneOnWebKit()"))
  assert.ok(titles(spec).some((title) => title.endsWith("(ER4)")), "the ER4 test")
  assert.deepEqual(writes(spec), [])
  assert.ok(data.includes("export async function planAction(page: Page, row: Locator, action: string, dialogTitle: string, toast: string)"))
  // Spec §6.7: the plan name left empty first, shown under its field.
  assert.ok(spec.includes(`await expect(page.locator("#maintenance-plan-title-error")).toHaveText("${th.common.validation.required}")`))
  // The month-end clamp the test expects is the app's own (src/lib/preventive-maintenance.ts): 31 Jan + 1 month is
  // 28 Feb 2026, shown as 28/02/2569 (th-TH, the Buddhist year).
  const { calculateNextMaintenanceDueDate } = await import("../src/lib/preventive-maintenance.ts")
  const next = calculateNextMaintenanceDueDate(new Date("2026-01-31"), "monthly")
  assert.equal(next.toISOString().slice(0, 10), "2026-02-28")
  assert.equal(next.toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" }), "28/02/2569")
  assert.ok(spec.includes(`await page.locator("#repair-record-date").fill("2026-01-31")`))
  assert.ok(spec.includes(`await expect(page.locator("#maintenance-plan-next-due-date")).toHaveValue("2026-02-28")`))
  assert.ok(spec.includes(`toContainText("${th.maintenancePage.pmNextDueDate}: 28/02/2569")`))
  // The list page size is one the PM list offers (src/lib/list-pagination.ts).
  const { LIST_PAGE_SIZES } = await import("../src/lib/list-pagination.ts")
  assert.ok((LIST_PAGE_SIZES as readonly number[]).includes(100))
  // The list's path moved to repair-data.ts with visitPlanRow, which looks for the plan page by page (e2e fix 2D).
  assert.ok(data.includes(`export const PM_LIST = "/th/maintenance/pm?pageSize=100"`))
  assert.match(spec, /^import \{ PM_LIST, [^}]*\bvisitPlanRow \} from "\.\/repair-data\.ts"$/m)
  // Every state change and its Thai copy, from messages/th.json.
  const actions = th.maintenancePage.pmActions
  for (const [action, title, toast] of [
    [actions.pause, actions.pauseTitle, actions.pauseSuccess],
    [actions.resume, actions.resumeTitle, actions.resumeSuccess],
    [actions.end, actions.endTitle, actions.endSuccess],
  ]) {
    assert.ok(spec.includes(`await planAction(page, row, "${action}", "${title}", "${toast}")`), action)
  }
  for (const text of [th.maintenancePage.pmCreateTitle, th.repairRecord.pmRecordDone, th.repairRecord.pmOverdue, th.maintenancePage.pmPlanStates.paused, th.maintenancePage.pmPlanStates.ended]) {
    assert.ok(spec.includes(text), text)
  }
  // The plan is looked for on whichever list page holds it (menu B shell task 13B loop 1 for the ended plan; e2e fix 2D
  // for every look, after E2E-1026E's 103 active plans pushed the paused plan to page 2): the list sorts active, paused,
  // then ended plans across every page, and an ended plan has no page of its own (the edit page 404s).
  const listPage = read("src/app/[locale]/(dashboard)/maintenance/pm/page.tsx")
  assert.ok(listPage.includes("// Active plans first, then paused, then ended, each by next due date, across every page"))
  assert.match(read("src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx"), /where: \{ id, planState: \{ not: "ended" \} \}/)
  // The helper walks forward from page 1 and stops where the plan's row shows, or on the page with no "next" link
  // (src/components/ui/pagination.tsx renders an enabled next as a link with rel="next").
  assert.ok(data.includes("export async function visitPlanRow(page: Page, measure: Measure, title: string, label: string): Promise<Locator>"))
  assert.ok(data.includes("await measure.visit(listPage === 1 ? PM_LIST : `${PM_LIST}&page=${listPage}`"))
  assert.ok(data.includes(`page.getByRole("main").locator('a[rel="next"]')`))
  assert.match(read("src/components/ui/pagination.tsx"), /<PaginationControl href=\{nextHref\} enabled=\{page < totalPages\} rel="next"/)
  assert.match(read("src/components/ui/pagination.tsx"), /<Link href=\{href\} rel=\{rel\}/)
  for (const label of ["PM plans after done", "PM plans, plan paused", "PM plans to resume", "PM plans, plan resumed", "PM plans to end", "PM plans, plan ended"]) {
    assert.ok(spec.includes(`row = await visitPlanRow(page, measure, title, "${label}")`), label)
  }
  assert.ok(!spec.includes("row()"), "no look at the plan assumes the page on screen")
  assert.match(spec, /row = await visitPlanRow\(page, measure, title, "PM plans, plan ended"\)\n\s*await expect\(row\.locator\('\[data-slot="status-badge"\]'\)\.last\(\)\)\.toHaveText\("จบแผน"\)/)
})

test("บันทึกซ่อม answers its questions, refuses a held asset at once, and a PM visit not done leaves its plan (group 5 plan 2 Task 4)", () => {
  const spec = read("e2e/repair/repair-record.spec.ts")
  const pm = read("e2e/repair/pm-plan.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  const repair = th.repairRecord
  // G5P2-R10: the save is the sticky footer's บันทึกซ่อม.
  assert.equal(repair.save, "บันทึกซ่อม")
  const saveHelper = data.slice(data.indexOf("export async function saveRepairForm("), data.indexOf("export async function completeRecord("))
  assert.ok(data.includes(`page.locator("[data-slot=sticky-form-footer]").getByRole("button", { name: "${repair.save}", exact: true })`))
  assert.ok(saveHelper.includes("await repairSaveButton(page).click()"))
  // The radios by their names: a ChoiceCard is named by its label only, its description is read after it.
  assert.equal(repair.doneYes, "ซ่อมเสร็จแล้ว")
  assert.equal(repair.doneNo, "ยังซ่อมไม่เสร็จ")
  assert.ok(data.includes(`export async function answerRepair(page: Page, answer: { done: boolean; outcome?: "${repair.outcome.usable}" | "${repair.outcome.beyond_repair}"; condition?: "ดี" | "พอใช้" })`))
  const e2eFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? e2eFiles(`${dir}/${entry.name}`) : entry.name.endsWith(".ts") ? [`${dir}/${entry.name}`] : []))
  for (const file of e2eFiles("e2e")) {
    assert.ok(!read(file).includes("ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)"), file)
    assert.ok(!read(file).includes(`ทรัพย์สินจะเปลี่ยนเป็น "อยู่ระหว่างซ่อม" จนกว่าจะกดซ่อมเสร็จ`), file)
  }
  // ER1: the eligibility line after the pick, and the status line instead of the old sentence.
  assert.ok(spec.includes(`await expect(page.locator('[data-repair-eligibility="ok"]')).toHaveText("${repair.createForm.eligibleOk}")`))
  assert.ok(spec.includes(`await expect(page.locator("[data-repair-status-line]")).toContainText("อยู่ระหว่างซ่อม")`))
  // ER3 (Review Focus 1): ?assetId= of the asset under repair names its open record and links to it, before any save.
  assert.equal(repair.createForm.eligibleOpenRecord, "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}")
  assert.ok(spec.includes("await expect(openRecord).toContainText(`มีบันทึกซ่อมที่ยังไม่เสร็จ ${record.repairNo}`)"))
  assert.ok(spec.includes(`openRecord.getByRole("link", { name: "${repair.openExistingRecord}", exact: true })`))
  // The held asset (Review Focus 3): refused at once with its HO- and รับคืน back to the asset, gone when the answer
  // no longer hits it.
  const heldStart = spec.indexOf(`test("a held asset is refused at once`)
  const held = spec.slice(heldStart, spec.indexOf("\n})", heldStart))
  assert.ok(heldStart >= 0 && titles(spec).some((title) => title.startsWith("a held asset is refused at once")), "the held asset test")
  assert.ok(held.includes("const handover = await handOverPermanently(page.request, masters, asset.id, receiver.id)"))
  assert.ok(held.includes(`await answerRepair(page, { done: true, outcome: "${repair.outcome.beyond_repair}" })`))
  assert.ok(held.includes(`await expect(heldNotice).toContainText("อยู่กับ")`) && held.includes("await expect(heldNotice).toContainText(handover.documentNo)"))
  assert.ok(held.includes(`heldNotice.getByRole("link", { name: "${repair.createForm.heldReturn}", exact: true })`))
  assert.ok(held.includes(`"/th/asset-management/checkin?checkoutId="`) && held.includes("`returnTo=%2Fth%2Fassets%2F${asset.id}`"))
  assert.ok(held.includes("await answerRepair(page, { done: false })") && held.includes(`await expect(page.locator("[data-repair-held]")).toHaveCount(0)`))
  assert.ok(held.includes("toHaveText(/ใช้งานอยู่\\s*→\\s*อยู่ระหว่างซ่อม/)"))
  assert.ok(!held.includes("saveRepairForm"), "the held asset is never saved")
  // A PM visit not done (G5P2-R6): ซ่อมเสร็จแล้ว pre-checked, no result, saved not done, the plan's date unchanged, and
  // the plan ended whatever happens.
  const visitStart = spec.indexOf(`test("a PM visit saved not done leaves its plan's date`)
  const visit = spec.slice(visitStart, spec.indexOf("\n})", visitStart))
  assert.ok(visitStart >= 0 && titles(spec).some((title) => title.startsWith("a PM visit saved not done leaves its plan's date")), "the PM visit test")
  assert.ok(visit.includes("const plan = await createPlan(page.request, { assetId: asset.id, title, nextDueDate })"))
  assert.ok(visit.includes(`await expect(page.getByRole("radio", { name: "${repair.doneYes}", exact: true })).toBeChecked()`))
  assert.ok(visit.includes(`await expect(page.locator("#repair-record-outcome").getByRole("radio", { checked: true })).toHaveCount(0)`))
  assert.ok(visit.includes("await answerRepair(page, { done: false })"))
  assert.ok(visit.includes(`await expect(page.locator("#maintenance-plan-next-due-date")).toHaveValue(nextDueDate)`))
  assert.match(visit, /\} finally \{\n\s+await endPlan\(page\.request, plan\.id\)\n\s+\}/)
  assert.ok(data.includes(`data: { action: "end" }`))
  // ER4: the PM path's card has no เปลี่ยน; the result and the condition are answered before the save.
  assert.ok(!pm.includes(`await expect(page.locator("#repair-record-asset")).toBeDisabled()`))
  // The card must be there first, or the count of 0 passes with no card at all (final review 7).
  assert.ok(pm.includes(`await expect(page.locator("[data-repair-asset-card]")).toBeVisible()\n  await expect(page.locator("#repair-record-asset").getByRole("button", { name: "${repair.createForm.change}", exact: true })).toHaveCount(0)`))
  assert.ok(pm.includes(`await expect(page.locator("#repair-record-outcome").getByRole("radio", { checked: true })).toHaveCount(0)`))
  assert.ok(pm.includes(`await answerRepair(page, { done: true, outcome: "${repair.outcome.usable}", condition: "ดี" })`))
  // The handover loop answers both questions explicitly; the open repair is not done.
  const handover = read("e2e/transactions/handover-condition.spec.ts")
  assert.ok(handover.includes(`await page.getByRole("radio", { name: "${repair.doneYes}", exact: true }).check()`))
  assert.ok(handover.includes(`await page.getByRole("radio", { name: "${repair.doneNo}", exact: true }).check()`))
  assert.ok(read("e2e/dashboard/dashboard-words.ts").includes(`repairNotDone: "${repair.doneNo}"`))
  // The form-errors walk presses บันทึกซ่อม too.
  const fieldErrors = read("e2e/cross-cutting/field-errors.spec.ts")
  const repairStart = fieldErrors.indexOf('test("repair record: ')
  const repairTest = fieldErrors.slice(repairStart, fieldErrors.indexOf("\n})", repairStart))
  assert.equal(repairTest.split("await repairSaveButton(page).click()").length - 1, 2)
  assert.ok(!repairTest.includes("await save(page)"))
})
