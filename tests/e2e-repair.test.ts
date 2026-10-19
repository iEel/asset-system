import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
  assert.deepEqual(writes(data), ["post /api/assets", "post /api/assets/${assetId}/checkout"])
  assert.deepEqual(writes(spec), [])
  for (const banned of ["/api/admin/settings", "ldap", "import-confirm", "import-preview"]) assert.ok(!`${spec}${data}`.toLowerCase().includes(banned), banned)
  // Spec §6.7: an empty required field, then a date pair reversed, each shown under its field.
  assert.ok(spec.includes(`await expect(page.locator("#repair-record-problem-error")).toHaveText("${th.common.validation.required}")`))
  assert.ok(spec.includes(`await expect(dialog.locator("#repair-complete-return-date-error")).toHaveText("${th.repairRecord.returnDateBeforeReported}")`))
  // The Thai copy the walk reads is the app's own (messages/th.json).
  for (const text of [th.repairRecord.createTitle, th.repairRecord.doneNo, th.repairRecord.complete, th.repairRecord.completeTitle, th.repairRecord.status.in_progress, th.repairRecord.status.closed, th.repairRecord.outcome.usable, th.repairRecord.assetStatusEffect.toMaintenance]) {
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
  assert.ok(spec.includes(`  test.fail(true, "AR2: `))
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
  // AR1 is fixed (FX1): its test runs as a plain test.
  assert.ok(!spec.includes(`test.fail(true, "AR1: `), "AR1 is fixed")
  for (const [title, id] of [["the open asset search passes axe (ER3, finding AR3)", "AR3"]]) {
    const start = spec.indexOf(`test("${title}"`)
    assert.ok(start >= 0, title)
    assert.ok(spec.slice(start, spec.indexOf("\n})", start)).includes(`  test.fail(true, "${id}: `), `${id} is expected to fail`)
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
  assert.ok(spec.includes(`const PM_LIST = "/th/maintenance/pm?pageSize=100"`))
  // Every state change and its Thai copy, from messages/th.json.
  const actions = th.maintenancePage.pmActions
  for (const [action, title, toast] of [
    [actions.pause, actions.pauseTitle, actions.pauseSuccess],
    [actions.resume, actions.resumeTitle, actions.resumeSuccess],
    [actions.end, actions.endTitle, actions.endSuccess],
  ]) {
    assert.ok(spec.includes(`await planAction(page, row(), "${action}", "${title}", "${toast}")`), action)
  }
  for (const text of [th.maintenancePage.pmCreateTitle, th.repairRecord.pmRecordDone, th.repairRecord.pmOverdue, th.maintenancePage.pmPlanStates.paused, th.maintenancePage.pmPlanStates.ended]) {
    assert.ok(spec.includes(text), text)
  }
})
