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
  // Group 5 plan 3 Task 5: ซ่อมเสร็จ opens from the header on the desktop or the bar on the phone.
  assert.ok(data.includes("export async function completeRecord(page: Page, measure: Measure, device: E2eDevice, recordId: string, outcome:"))
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
  // พิมพ์ by its exact name and visible: a substring match on the phone found the asset panel's link to an asset named
  // "… เครื่องพิมพ์…" (E2E-1104A); the header holds พิมพ์ on the desktop, the phone bar on the phone.
  assert.ok(spec.includes(`await page.getByRole("link", { name: "พิมพ์", exact: true }).filter({ visible: true }).first().click()`))
  assert.ok(!spec.includes(`getByRole("link", { name: "พิมพ์" })`))
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

test("the PM plan: created with a wrong entry first, recorded done on 31 Jan from its row with the next due date clamped to 28 Feb, paused, resumed and ended through ⋯, IT staff (e2e repair task 4, ER4; group 5 plan 4 Task 5)", async () => {
  const spec = read("e2e/repair/pm-plan.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`))
  assert.ok(!spec.includes("runPhoneOnWebKit()"))
  assert.ok(titles(spec).some((title) => title.endsWith("(ER4)")), "the ER4 test")
  assert.deepEqual(writes(spec), [])
  const er4Title = titles(spec).find((title) => title.endsWith("(ER4)")) ?? ""
  const er4Start = spec.indexOf(`test("${er4Title}"`)
  const er4 = spec.slice(er4Start, spec.indexOf("\n})", er4Start))
  // Spec §6.7: the plan name left empty first, shown under its field. The asset is the card the pick brings (G5P4-R9).
  assert.ok(er4.includes(`await expect(page.locator("#maintenance-plan-title-error")).toHaveText("${th.common.validation.required}")`))
  assert.ok(er4.includes("await choosePlanAsset(page, tag)"))
  assert.ok(data.includes("export async function choosePlanAsset(page: Page, tag: string)"))
  assert.ok(data.includes("await expect(planAssetCard(page)).toContainText(tag)"))
  assert.match(read("src/components/maintenance/pm-plan-asset-card.tsx"), /<div data-pm-asset-card /)
  // The frequency is a Segmented group (spec §10): buttons with aria-pressed inside the #maintenance-plan-frequency
  // fieldset; รายไตรมาส and back to รายเดือน, whose preview chains the month-end clamp (Review Focus 4).
  assert.ok(!spec.includes(`toHaveValue("monthly")`))
  const frequencies = th.maintenancePage.pmFrequencies
  assert.ok(er4.includes(`frequency.getByRole("button", { name: "${frequencies.quarterly}", exact: true }).click()`))
  assert.ok(er4.includes(`await expect(frequency.getByRole("button", { name: "${frequencies.monthly}", exact: true })).toHaveAttribute("aria-pressed", "true")`))
  assert.match(read("src/components/ui/segmented.tsx"), /aria-pressed=\{pressed\}/)
  assert.match(read("src/components/maintenance/maintenance-plan-form.tsx"), /<FieldGroup legend=\{t\("pmFrequencyLabel"\)\} id="maintenance-plan-frequency"/)
  assert.ok(er4.includes('await expect(preview).toHaveText([/31\\/01\\/2569/, /28\\/02\\/2569\\s*\\+1 เดือน/, /28\\/03\\/2569/, /28\\/04\\/2569/])'))
  assert.equal(th.maintenancePage.pmFormStepMonths.replace("{n, number}", "1"), "+1 เดือน")
  // The month-end clamp the test expects is the app's own (src/lib/preventive-maintenance.ts): 31 Jan + 1 month is
  // 28 Feb 2026, shown as 28/02/2569 (th-TH, the Buddhist year).
  const { calculateNextMaintenanceDueDate } = await import("../src/lib/preventive-maintenance.ts")
  const next = calculateNextMaintenanceDueDate(new Date("2026-01-31"), "monthly")
  assert.equal(next.toISOString().slice(0, 10), "2026-02-28")
  assert.equal(next.toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" }), "28/02/2569")
  assert.ok(er4.includes(`await page.locator("#repair-record-date").fill("2026-01-31")`))
  assert.ok(er4.includes(`await expect(page.locator("#maintenance-plan-next-due-date")).toHaveValue("2026-02-28")`))
  assert.ok(er4.includes(`await expect(row).toContainText("28/02/2569")`))
  // The plan is found on the PM page by its planNo (spec §16: by search, never by position, and no longer in the
  // repair list's #pm-due box), with its overdue days counted in Bangkok days: "เกินกำหนด N วัน".
  assert.ok(!spec.includes("#pm-due"))
  assert.equal(th.maintenancePage.pmDue.overdue, "เกินกำหนด {days} วัน")
  assert.ok(er4.includes('await expect(listed).toContainText(`เกินกำหนด ${daysBetween("2026-01-31", bangkokToday())} วัน`)'))
  assert.ok(er4.includes('await expect(row).toContainText(`เกินกำหนด ${daysBetween("2026-02-28", bangkokToday())} วัน`)'))
  assert.ok(data.includes(`export const PM_LIST = "/th/maintenance/pm"`))
  assert.ok(data.includes("export function pmListUrl(search: { q: string; tab?: PmTab; due?: PmDueBucket }): string"))
  assert.ok(data.includes(`if (search.tab && search.tab !== "active") params.set("state", search.tab)`))
  // The page's own query words (src/lib/pm-plan-list.ts): state, q and due.
  const list = read("src/lib/pm-plan-list.ts")
  for (const param of [`params.set("state", tab)`, `params.set("q", q)`, `params.set("due", due)`]) assert.ok(list.includes(param), param)
  assert.ok(data.includes("export async function visitPlanRow(page: Page, measure: Measure, planNo: string, tab: PmTab, label: string): Promise<Locator>"))
  assert.ok(data.includes("await measure.visit(pmListUrl({ q: planNo, tab }), label)"))
  assert.ok(data.includes("await expect(planRows(page)).toHaveCount(1)"))
  // The rows: the table's from md (data-pm-plan-row), the phone cards below (<article>), only the ones on screen.
  assert.ok(data.includes(`return page.getByRole("main").locator("tr[data-pm-plan-row], article").filter({ visible: true })`))
  const pmPage = read("src/app/[locale]/(dashboard)/maintenance/pm/page.tsx")
  assert.ok(pmPage.includes(`const rowData = { "data-pm-plan-row": plan.id } as const`))
  assert.ok(pmPage.includes(`<article key={plan.id} className=`))
  assert.ok(data.includes("export function dueCell(page: Page, bucket: PmDueBucket): Locator"))
  assert.ok(pmPage.includes(`data: { "data-pm-due-cell": bucket },`))
  // The overdue cell, which keeps the search, opens a list of that one plan; the plan is recorded done from its row.
  assert.ok(er4.includes(`await dueCell(page, "overdue").getByRole("link").click()`))
  assert.ok(er4.includes(`await page.waitForURL((url) => url.searchParams.get("due") === "overdue" && url.searchParams.get("q") === plan.planNo)`))
  assert.ok(er4.includes(`await overdueRow.getByRole("link", { name: /^${th.repairRecord.pmRecordDone}/ }).click()`))
  // Pause, resume and end are in ⋯ (spec §9): the menu on the desktop, the bottom sheet on the phone, then the confirm.
  assert.ok(data.includes("export async function planAction(page: Page, device: E2eDevice, row: Locator, action: string, dialogTitle: string, toast: string)"))
  assert.ok(data.includes("await planMenuItem(await openPlanMenu(page, device, row), action).click()"))
  assert.ok(data.includes("export async function openPlanMenu(page: Page, device: E2eDevice, row: Locator): Promise<Locator>"))
  assert.ok(data.includes(`const menu = device === "desktop" ? page.getByRole("menu") : page.getByRole("dialog").filter({ visible: true }).last()`))
  assert.equal(th.maintenancePage.pmRowActions, "การดำเนินการของแผน {planNo}")
  assert.ok(data.includes("export const PLAN_MENU_NAME = /^การดำเนินการของแผน /"))
  // An item by the start of its name: จบแผน reads its hint "ถาวร · มีให้ยืนยัน" after it.
  assert.ok(data.includes("const options = { name: new RegExp(`^${escapeRegExp(name)}`) }"))
  assert.match(read("src/components/maintenance/maintenance-plan-row-actions.tsx"), /label: t\("pmActions\.end"\), hint: t\("pmActions\.endHint"\)/)
  // Every state change and its Thai copy, from messages/th.json; after each, the plan leaves the tab it was on.
  const actions = th.maintenancePage.pmActions
  for (const [action, title, toast] of [
    [actions.pause, actions.pauseTitle, actions.pauseSuccess],
    [actions.resume, actions.resumeTitle, actions.resumeSuccess],
    [actions.end, actions.endTitle, actions.endSuccess],
  ]) {
    assert.ok(er4.includes(`await planAction(page, e2eDevice, row, "${action}", "${title}", "${toast}")\n  await expect(row).toHaveCount(0)`), action)
  }
  for (const [tab, label] of [["active", "PM plans after done"], ["paused", "PM plans, plan paused"], ["active", "PM plans, plan resumed"], ["ended", "PM plans, plan ended"]]) {
    assert.ok(er4.includes(`row = await visitPlanRow(page, measure, plan.planNo, "${tab}", "${label}")`), label)
  }
  // The ended tab (decision 10.1): "จบแผนเมื่อ <date>", no link and no button on the row, newest ended first.
  assert.equal(th.maintenancePage.pmEndedAt, "จบแผนเมื่อ {date}")
  assert.match(er4, /row = await visitPlanRow\(page, measure, plan\.planNo, "ended", "PM plans, plan ended"\)\n\s*await expect\(row\)\.toContainText\(\/จบแผนเมื่อ \\d\{2\}\\\/\\d\{2\}\\\/\\d\{4\}\/\)/)
  assert.ok(er4.includes(`await expect(row.getByRole("link")).toHaveCount(0)`) && er4.includes(`await expect(row.getByRole("button")).toHaveCount(0)`))
  assert.ok(er4.includes(`await expect(page.getByRole("main")).toContainText("${th.maintenancePage.pmOrderByEnded}")`))
  // An ended plan has no page of its own (the edit page 404s), so it is read on the list.
  assert.match(read("src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx"), /where: \{ id, planState: \{ not: "ended" \} \}/)
  for (const text of [th.maintenancePage.pmCreateTitle, th.repairRecord.pmRecordDone, th.maintenancePage.pmPlanStates.paused, th.maintenancePage.pmPlanStates.ended]) {
    assert.ok(spec.includes(text), text)
  }
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

test("the repair record's next step, its menu, its history oldest first, and a held asset's repair through the return to the disposal step (group 5 plan 3 Task 5)", async () => {
  const spec = read("e2e/repair/repair-record.spec.ts")
  const pm = read("e2e/repair/pm-plan.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  const handoverSpec = read("e2e/transactions/handover-condition.spec.ts")
  const repair = th.repairRecord
  const detail = repair.detail
  // The record's controls by device: ซ่อมเสร็จ in the header on the desktop (the card holds a second one) and in the
  // phone bar below md; "อื่น ๆ" (the header's menu) or "เพิ่มเติม" (the bar's sheet) for แก้ไขรายละเอียด and ยกเลิกบันทึก.
  assert.equal(detail.more, "อื่น ๆ")
  assert.equal(detail.phoneMore, "เพิ่มเติม")
  assert.ok(data.includes('import type { E2eDevice } from "../support/matrix.ts"'))
  assert.ok(data.includes("export function recordCompleteButton(page: Page, device: E2eDevice): Locator"))
  assert.ok(data.includes(`page.locator('[data-slot="page-header-actions"]').getByRole("button", { name: "${repair.complete}", exact: true })`))
  assert.ok(data.includes(`page.locator('[data-slot="action-bar"]').getByRole("button", { name: "${repair.complete}", exact: true })`))
  assert.ok(data.includes("export async function openRecordMenu(page: Page, device: E2eDevice): Promise<Locator>"))
  assert.ok(data.includes(`getByRole("button", { name: "${detail.more}", exact: true })`) && data.includes(`getByRole("button", { name: "${detail.phoneMore}", exact: true })`))
  assert.ok(data.includes("export function recordMenuItem(menu: Locator, name: string): Locator"))
  // completeRecord: no result is pre-checked (G5P3-R9), then the one given.
  const complete = data.slice(data.indexOf("export async function completeRecord("), data.indexOf("export async function planAction("))
  assert.ok(complete.includes("await recordCompleteButton(page, device).click()"))
  assert.ok(complete.includes(`await expect(dialog.locator("#repair-complete-outcome").getByRole("radio", { checked: true })).toHaveCount(0)`))
  // No spec presses an unscoped ซ่อมเสร็จ or ยกเลิกบันทึก on the record page: ซ่อมเสร็จ shows twice on the desktop (the header
  // and the card) and ยกเลิกบันทึก sits in the menu.
  for (const [file, source] of [["repair-record", spec], ["pm-plan", pm], ["handover-condition", handoverSpec]]) {
    assert.ok(!source.includes(`page.getByRole("button", { name: "${repair.complete}", exact: true }).click()`), `${file}: ซ่อมเสร็จ`)
    assert.ok(!source.includes(`page.getByRole("button", { name: "${repair.cancel}", exact: true }).click()`), `${file}: ยกเลิกบันทึก`)
  }
  assert.ok(handoverSpec.includes("await recordCompleteButton(page, e2eDevice).click()"))
  assert.ok(handoverSpec.includes(`await expect(dialog.locator("#repair-complete-outcome").getByRole("radio", { checked: true })).toHaveCount(0)`))
  assert.ok(handoverSpec.includes(`await expect(nextStepCard(page, "closedBeyond")).toBeVisible()`))
  // ER1–ER3 read the next-step card: open, and the ใช้งานได้ row's next status.
  assert.ok(data.includes("export function nextStepCard(page: Page, kind: RepairNextStepKind): Locator"))
  assert.ok(data.includes(`export function outcomeRow(page: Page, outcome: "usable" | "beyond_repair"): Locator`))
  assert.ok(data.includes("`[data-repair-next-step=\"${kind}\"]`") && data.includes("`[data-repair-next-step=\"open\"] [data-repair-outcome-row=\"${outcome}\"]`"))
  const er = (suffix: string) => {
    const title = titles(spec).find((name) => name.endsWith(suffix))
    assert.ok(title, suffix)
    const start = spec.indexOf(`test("${title}"`)
    return spec.slice(start, spec.indexOf("\n})", start))
  }
  const [er1, er2, er3] = [er("(ER1)"), er("(ER2)"), er("(ER3)")]
  for (const [name, body] of [["ER1", er1], ["ER2", er2], ["ER3", er3]]) {
    assert.ok(body.includes(`await expect(nextStepCard(page, "open")).toBeVisible()`), name)
    assert.ok(body.includes(`await expect(outcomeRow(page, "usable")).toContainText(`), name)
  }
  // ER1: a held asset goes back to its holder on its HO-; ซ่อมไม่ได้ is refused on the card.
  assert.ok(er1.includes("const handover = await handOverPermanently(page.request, masters, asset.id, receiver.id)"))
  assert.ok(er1.includes(`await expect(outcomeRow(page, "usable")).toContainText("ใช้งานอยู่")`))
  assert.equal(detail.note.backTo, "กลับไปที่ {holder} ตามใบส่งมอบ {documentNo}")
  assert.ok(er1.includes("await expect(outcomeRow(page, \"usable\")).toContainText(`กลับไปที่ ${receiver.fullNameTh} ตามใบส่งมอบ ${handover.documentNo}`)"))
  assert.ok(er1.includes(`await expect(outcomeRow(page, "beyond_repair").locator("[data-repair-held]")).toContainText(handover.documentNo)`))
  assert.ok(er1.includes("await recordCompleteButton(page, e2eDevice).click()"))
  // ER1's wrong entry: no result is pre-checked, so the result's own error shows beside the date's.
  assert.equal(th.apiErrors.repairOutcomeRequired, "เลือกผลการซ่อม")
  assert.ok(er1.includes(`await expect(dialog.locator("#repair-complete-outcome-error")).toHaveText("${th.apiErrors.repairOutcomeRequired}")`))
  // The asset panel's ผู้ถือครอง reads the name with the department under it, no employee code (G5P3-R10).
  assert.ok(er1.includes(`await expect(valueBeside(page, "ผู้ถือครอง")).toContainText(receiver.fullNameTh)`))
  assert.ok(er1.includes(`await expect(valueBeside(page, "ผู้ถือครอง")).not.toContainText(receiver.code)`))
  assert.ok(!spec.includes(`await expect(valueBeside(page, "ผู้ถือครอง")).toContainText(receiver.code)`))
  assert.ok(er1.includes(`await expect(nextStepCard(page, "closedUsable")).toBeVisible()`))
  // ER2: no holder (Review Focus 1), then the closed ซ่อมไม่ได้ card offers the disposal request.
  assert.ok(er2.includes(`await expect(outcomeRow(page, "usable")).toContainText("${detail.note.noHolder}")`))
  assert.ok(er2.includes(`await expect(nextStepCard(page, "closedBeyond")).toContainText("${detail.nextDisposal}")`))
  // ER3: แก้ไขรายละเอียด and ยกเลิกบันทึก through the menu; the cancelled card; the history oldest first.
  assert.ok(er3.includes(`await recordMenuItem(await openRecordMenu(page, e2eDevice), "${repair.edit}").click()`))
  assert.ok(er3.includes(`page.getByRole("dialog", { name: "${repair.editTitle}" })`))
  assert.ok(er3.includes(`await recordMenuItem(await openRecordMenu(page, e2eDevice), "${repair.cancel}").click()`))
  assert.ok(er3.includes(`await expect(nextStepCard(page, "cancelled")).toBeVisible()`))
  assert.ok(er3.includes(`await expect(recordMenuItem(menu, "${repair.cancel}")).toHaveCount(0)`))
  assert.equal(repair.movement.create, "บันทึกซ่อม")
  assert.ok(er3.includes(`const events = page.locator("#history [data-repair-history-event]")`))
  assert.ok(er3.includes(`await expect(events.first()).toContainText("${repair.movement.create}")`))
  assert.ok(er3.includes(`await expect(events.last()).toContainText("${repair.movement.cancel}")`))
  // The PM record follows the page: the closed card after the save.
  assert.ok(pm.includes(`await expect(nextStepCard(page, "closedUsable")).toBeVisible()`))

  // The held asset's repair (spec §16, Review Focus 2): IT staff, the desktop walks it all, the phone the card only.
  const heldTitle = "a held asset's repair: refused at ซ่อมไม่ได้, returned into ส่งซ่อม, then closed beyond repair with the disposal step"
  assert.ok(titles(spec).includes(heldTitle), "the held asset's repair test")
  const heldStart = spec.indexOf(`test("${heldTitle}"`)
  const held = spec.slice(heldStart, spec.indexOf("\n})", heldStart))
  const at = (part: string) => {
    const index = held.indexOf(part)
    assert.ok(index >= 0, part)
    return index
  }
  const steps = [
    "const handover = await handOverPermanently(page.request, masters, asset.id, receiver.id)",
    "await answerRepair(page, { done: false })",
    "const record = await saveRepairForm(page, measure,",
    `const heldRow = outcomeRow(page, "beyond_repair").locator("[data-repair-held]")`,
    "await expect(heldRow).toContainText(handover.documentNo)",
    `if (e2eDevice === "phone") return`,
    `await dialog.getByRole("radio", { name: "${repair.outcome.beyond_repair}", exact: true }).check()`,
    `await expect(dialog.locator("[data-repair-held]")).toContainText(handover.documentNo)`,
    `await heldRow.getByRole("link", { name: "${repair.createForm.heldReturn}", exact: true }).click()`,
    `await page.locator("#checkin-next-status").selectOption({ label: "ส่งซ่อม" })`,
    "const checkin = await saveReturnForm(page, asset.id",
    "expect(checkin.repair).toEqual({ id: record.id, repairNo: record.repairNo, joined: true })",
    `await expect(outcomeRow(page, "beyond_repair")).toContainText("รอตัดจำหน่าย")`,
    `await expect(outcomeRow(page, "beyond_repair").locator("[data-repair-held]")).toHaveCount(0)`,
    `await completeRecord(page, measure, e2eDevice, record.id, "${repair.outcome.beyond_repair}",`,
    `await expect(nextStepCard(page, "closedBeyond")).toContainText("${detail.nextDisposal}")`,
    `nextStepCard(page, "closedBeyond").getByRole("link", { name: "${repair.openDisposalRequest}", exact: true })`,
  ]
  const positions = steps.map(at)
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "the steps in order")
  assert.ok(held.includes(`url.searchParams.get("checkoutId") === handover.id`), "รับคืน opens that handover")
  assert.ok(held.includes(`.toBe("Pending Disposal")`))
  // The words the walk reads are the app's.
  assert.equal(repair.createForm.heldWithDocument, "อยู่กับ {holder} ตามใบส่งมอบ {documentNo} ต้องรับคืนก่อน")
  assert.equal(detail.nextDisposal, "ขั้นถัดไป: ยื่นคำขอตัดจำหน่าย")
  assert.equal(repair.openDisposalRequest, "ยื่นคำขอตัดจำหน่าย")
  // IT staff may return the asset, close the record and request its disposal (e2e/support/run-plan.ts).
  const plan = read("e2e/support/run-plan.ts")
  for (const permission of ["asset:edit", "disposal:create", "maintenance:edit"]) assert.ok(plan.includes(`"${permission}"`), permission)
  // The app's rules: held, ซ่อมไม่ได้ is refused naming the HO-; returned (no holder, no handover), it goes Pending
  // Disposal and ใช้งานได้ reads ไม่มีผู้ถือครอง (src/lib/repair-record-outlook.ts).
  const outlook = await import("../src/lib/repair-record-outlook.ts")
  const facts = {
    id: "a", assetTag: "T", name: "N", statusName: "Under Maintenance", statusLabel: "อยู่ระหว่างซ่อม", conditionId: "c", conditionLabel: "ดี",
    ownershipType: "personal", custodianId: "e", holderName: "ผู้รับ", departmentName: null, roomName: null, branchName: null, photo: null,
    openRecord: { id: "r", repairNo: "MT-1" }, activeCheckout: { id: "h", documentNo: "HO-1", holderName: "ผู้รับ" },
  }
  assert.deepEqual(outlook.getRepairCompleteOutlook(facts, "beyond_repair").outlook, { kind: "refused", held: { checkoutId: "h", documentNo: "HO-1", holderName: "ผู้รับ" } })
  const returned = { ...facts, custodianId: null, holderName: null, activeCheckout: null }
  assert.deepEqual(outlook.getRepairCompleteOutlook(returned, "beyond_repair").outlook, { kind: "status", nextStatusName: "Pending Disposal", note: { key: "thenDisposal", holderStays: null } })
  assert.deepEqual(outlook.getRepairCompleteOutlook(returned, "usable").outlook, { kind: "status", nextStatusName: "Ready", note: { key: "noHolder" } })
  // Run-marked data only: the spec itself writes nothing.
  assert.deepEqual(writes(spec), [])
})

test("the PM page's tabs, search and cells, the open record on its row, the stale edit refused and ตั้งรอบ PM back to the asset tab (group 5 plan 4 Task 5)", async () => {
  const spec = read("e2e/repair/pm-plan.spec.ts")
  const repairSpec = read("e2e/repair/repair-record.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  const pm = th.maintenancePage
  const body = (source: string, title: string) => {
    const start = source.indexOf(`test("${title}`)
    assert.ok(start >= 0, title)
    return source.slice(start, source.indexOf("\n})", start))
  }
  // Run-marked data only: the spec writes nothing itself; the plans it makes through the API are ended by the test.
  assert.deepEqual(writes(spec), [])
  assert.deepEqual(writes(repairSpec), [])

  // The tabs, the search and the cells (spec §9, Review Focus 1): a plan of an asset under repair is created (decision
  // 10.4), one search finds it and a plan due in 5 days, the cells read 1, 1 and 0 and each opens a list of its own
  // size that keeps the search; the cell in use links back without the filter. The ended tab reads "จบแผนเมื่อ".
  const cells = body(spec, "the PM page's tabs, search and cells")
  const cellSteps = [
    "const record = await saveRepairForm(page, measure, \"save the open repair\")",
    `expect((await readAsset(page.request, repaired.id)).status.name, "the asset is under repair").toBe("Under Maintenance")`,
    "await measure.visit(`/th/maintenance/pm/new?assetId=${repaired.id}`, \"new PM plan for an asset under repair\")",
    `await expect(planAssetCard(page)).toContainText("อยู่ระหว่างซ่อม")`,
    `expect(response.status(), "a plan of an asset under repair is created").toBe(201)`,
    "const soon = await createPlan(page.request, { assetId: near.id, title: `${nearTag} ตรวจแบตเตอรี่`, nextDueDate: dayAfter(bangkokToday(), 5) })",
    `await measure.visit(pmListUrl({ q: search }), "PM plans, one search of two plans")`,
    "await expect(planRows(page)).toHaveCount(2)",
    `await expect(page.locator("[data-pm-due-sum]")).toHaveText("1 + 1 + 0 = 2 แผนที่ใช้งาน")`,
    "await expect(overdueRow.getByRole(\"link\", { name: `มีบันทึกซ่อมที่ยังไม่เสร็จ ${record.repairNo}`, exact: true })).toBeVisible()",
    `for (const [bucket, count] of [["overdue", 1], ["soon", 1], ["later", 0]] as const) {`,
    `await page.waitForURL((url) => url.searchParams.get("due") === bucket && url.searchParams.get("q") === search)`,
    "await expect(planRows(page)).toHaveCount(count)",
    `await page.waitForURL((url) => !url.searchParams.has("due") && url.searchParams.get("q") === search)`,
    `await visitPlanRow(page, measure, overdue.planNo, "active", "PM plans, a search by planNo")`,
    `await completeRecord(page, measure, e2eDevice, record.id, "ใช้งานได้", "close the open repair")`,
    `await measure.visit(pmListUrl({ q: search, tab: "ended" }), "PM plans, the ended tab")`,
    "for (const plan of plans) await expect(planRow(page, plan.planNo)).toContainText(/จบแผนเมื่อ \\d{2}\\/\\d{2}\\/\\d{4}/)",
  ]
  const positions = cellSteps.map((step) => {
    const index = cells.indexOf(step)
    assert.ok(index >= 0, step)
    return index
  })
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "the steps in order")
  // The words are the app's: the sum line, the open record link, the soon badge, the tabs, the empty search, the foot.
  assert.equal(pm.pmDueSum, "{overdue} + {soon} + {later} = {total, number} แผนที่ใช้งาน")
  assert.equal(pm.pmOpenRecord, "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}")
  assert.equal(pm.pmDue.soon, "ใกล้ถึงกำหนด · อีก {days} วัน")
  assert.ok(cells.includes(`await expect(planRow(page, soon.planNo)).toContainText("ใกล้ถึงกำหนด · อีก 5 วัน")`))
  for (const [tab, count] of [[pm.pmPlanStates.active, 2], [pm.pmPlanStates.paused, 0], [pm.pmPlanStates.ended, 0]]) {
    assert.ok(cells.includes(`await expect(pmTab(page, "${tab}")).toHaveText(/^${tab}\\s*${count}$/)`), `${tab} ${count}`)
  }
  assert.ok(cells.includes(`.getByText("${pm.pmEmptyFiltered}")`))
  assert.equal(pm.pmRange, "แสดง {from}–{to} จาก {total}")
  assert.ok(cells.includes(`await expect(page.getByRole("main")).toContainText("แสดง 1–2 จาก 2 · ${pm.pmOrderByEnded}")`))
  assert.ok(data.includes("export function pmTab(page: Page, label: string): Locator"))
  assert.ok(data.includes(`page.getByRole("main").locator('[data-slot="tab-nav"]').getByRole("link", { name: new RegExp(\`^\${escapeRegExp(label)}\`) })`))
  // The plans of the run are ended whatever happens (decision 10.6: no clean-up, but no active plan left behind).
  assert.match(cells, /\} finally \{\n\s+for \(const plan of plans\) if \(!ended\.has\(plan\.id\)\) await endPlan\(page\.request, plan\.id\)\n\s+\}/)
  // The PM asset options and the server take an asset under repair: only written-off and inactive assets are refused.
  assert.equal(pm.errors.MAINTENANCE_PLAN_ASSET_WRITTEN_OFF, "ทรัพย์สินนี้ตัดจำหน่ายหรือปลดระวางแล้ว ตั้งแผน PM ไม่ได้")

  // The stale edit (Review Focus 3): two pages of one context open the edit page; the first saves one change, whose
  // summary reads "แก้ 1 ช่อง"; the second's save is refused with the reload message and keeps its values.
  const stale = body(spec, "a stale PM edit is refused")
  assert.equal(pm.pmFormChangeCount, "แก้ {count, number} ช่อง")
  assert.equal(th.assetOperation.summaryTitle, "สรุปก่อนบันทึก")
  assert.equal(pm.pmFormSaveEdit, "บันทึกการแก้ไข")
  const conflict = pm.errors.MAINTENANCE_PLAN_CONFLICT
  assert.ok(conflict.startsWith("แผนนี้ถูกแก้ไขหรือบันทึกว่าทำแล้วระหว่างที่เปิดหน้านี้"))
  const staleSteps = [
    "const second = await page.context().newPage()",
    "await second.goto(editUrl)",
    `await expect(page.getByRole("heading", { name: "${th.assetOperation.summaryTitle} · แก้ 1 ช่อง", exact: true })).toBeVisible()`,
    `await page.getByRole("button", { name: "${pm.pmFormSaveEdit}", exact: true }).click()`,
    `expect((await saved).status(), "the first save").toBe(200)`,
    `await second.getByRole("button", { name: "${pm.pmFormSaveEdit}", exact: true }).click()`,
    `expect(refusal.status(), "the stale save").toBe(409)`,
    `expect(((await refusal.json()) as { code?: string }).code).toBe("MAINTENANCE_PLAN_CONFLICT")`,
    `await expect(second.getByText("${conflict}").first()).toBeVisible()`,
    "await expect(second.locator(\"#maintenance-plan-notes\")).toHaveValue(notes)",
  ]
  const stalePositions = staleSteps.map((step) => {
    const index = stale.indexOf(step)
    assert.ok(index >= 0, step)
    return index
  })
  assert.deepEqual([...stalePositions].sort((a, b) => a - b), stalePositions, "the stale steps in order")
  assert.match(stale, /\} finally \{\n\s+await second\.close\(\)\n\s+await endPlan\(page\.request, plan\.id\)\n\s+\}/)
  // The form sends the plan's updatedAt as the page read it and toasts the refusal's own message.
  const form = read("src/components/maintenance/maintenance-plan-form.tsx")
  assert.ok(form.includes(`...(planId ? { action: "update", expectedUpdatedAt } : { assetId: values.assetId })`))
  assert.ok(form.includes(`throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))`))
  assert.ok(form.includes(`title={isEdit ? \`\${tOperation("summaryTitle")} · \${t("pmFormChangeCount", { count: changed.length })}\` : tOperation("summaryTitle")}`))

  // ตั้งรอบ PM from the asset's ซ่อม / PM tab comes back to the tab (decision 8, spec §12.1).
  const back = body(spec, "ตั้งรอบ PM from the asset tab comes back to the tab")
  assert.equal(findValue(th, "pmSetup"), "ตั้งรอบ PM")
  assert.ok(back.includes(`await page.getByRole("main").getByRole("link", { name: "ตั้งรอบ PM", exact: true }).filter({ visible: true }).first().click()`))
  assert.ok(back.includes('url.searchParams.get("returnTo") === `/th/assets/${asset.id}?view=maintenance`'))
  assert.ok(back.includes('await page.waitForURL((url) => url.pathname === `/th/assets/${asset.id}` && url.searchParams.get("view") === "maintenance")'))
  assert.match(back, /\} finally \{\n\s+if \(planId\) await endPlan\(page\.request, planId\)\n\s+\}/)
  assert.ok(read("src/components/assets/detail/asset-maintenance-tab.tsx").includes("appendOperationalReturnTo(`/${locale}/maintenance/pm/new?assetId=${encodeURIComponent(assetId)}`, `/${locale}/assets/${assetId}?view=maintenance`)"))
  assert.ok(read("src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx").includes(`const returnTo = normalizeMaintenanceReturnTo(locale, query.returnTo, "maintenance-pm")`))

  // A PM visit not done (plan 2's test): while its record is open, the PM page's row names it in place of
  // บันทึกว่าทำแล้ว (spec §9, Review Focus 2).
  const visit = body(repairSpec, "a PM visit saved not done leaves its plan's date")
  assert.ok(visit.includes(`const row = await visitPlanRow(page, measure, plan.planNo, "active", "PM plans with the open PM record")`))
  assert.ok(visit.includes("await expect(row.getByRole(\"link\", { name: `มีบันทึกซ่อมที่ยังไม่เสร็จ ${record.repairNo}`, exact: true })).toBeVisible()"))
  assert.ok(visit.includes(`await expect(row.getByRole("link", { name: /^${th.repairRecord.pmRecordDone}/ })).toHaveCount(0)`))
  assert.ok(visit.indexOf("visitPlanRow(") < visit.indexOf("} finally {"), "looked at while the plan is active")
})

test("the repair list's strip, status tabs and cost total, the stuck card and the PM card (group 5 plan 5 Task 4)", async () => {
  const spec = read("e2e/repair/repair-list.spec.ts")
  const repairSpec = read("e2e/repair/repair-record.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  const r = th.repairRecord
  const body = (title: string) => {
    const start = spec.indexOf(`test("${title}`)
    assert.ok(start >= 0, title)
    return spec.slice(start, spec.indexOf("\n})", start))
  }
  // IT staff, on Chromium; run-marked data only, and the spec writes nothing itself (its plan goes through createPlan
  // and is ended whatever happens).
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`))
  assert.ok(!spec.includes("runPhoneOnWebKit()"))
  assert.deepEqual(writes(spec), [])
  for (const banned of ["/api/admin/settings", "ldap", "import-confirm", "import-preview", "status-correction"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
  assert.deepEqual(titles(spec).map((title) => title.split(" (")[0].split(":")[0]), [
    "the strip's cells open lists of their own size",
    "a search's status tabs and cost total",
    "the stuck card",
    "a PM card row whose asset has an open record links to the record, never บันทึกว่าทำแล้ว",
    "the repair list passes axe",
  ])

  // The list helpers: the strip's cells by data-repair-strip-cell, the rows from md and the phone cards below.
  assert.ok(data.includes("export function stripCell(page: Page, key: RepairStripKey): Locator"))
  assert.ok(data.includes("return page.locator(`[data-repair-strip-cell=\"${key}\"]`)"))
  assert.ok(data.includes("export function listRows(page: Page): Locator"))
  assert.ok(data.includes(".//tr[@data-repair-row]"))
  assert.ok(data.includes(`return page.locator("section").filter({ has: page.locator("[data-repair-tabs]") }).last()`))
  // The markup the helpers read (src/components/maintenance/repair-list-strip.tsx and the page).
  const page = read("src/app/[locale]/(dashboard)/maintenance/page.tsx")
  assert.ok(page.includes(`rowData={{ "data-repair-row": row.id }}`))
  assert.ok(page.includes("<TabNav data-repair-tabs"))
  for (const key of ["open", "stuck", "pmOverdue", "pmWeek"]) assert.ok(read("src/components/maintenance/repair-list-strip.tsx").includes(`data: { "data-repair-strip-cell": "${key}" }`), key)

  // The strip (Review Focus 1, G5P5-R1): each cell against the list it opens, read on the same page; the PM cells
  // against the PM page's range total; the stuck cell lands on #stuck.
  const strip = body("the strip's cells open lists of their own size")
  for (const step of [
    `expect(countOf(await repairTab(page, "${r.status.in_progress}").innerText()), "the open cell and the unfiltered list's tab").toBe(cells.open)`,
    `await expect(stripCell(page, "open").getByRole("link")).toHaveAttribute("aria-current", "page")`,
    `for (const [key, due] of [["pmOverdue", "overdue"], ["pmWeek", "week"]] as const) {`,
    "expect(await pmPlanTotal(page), `the ${key} cell and the PM page's ${due} list`).toBe(cell)",
    `await page.waitForURL((url) => url.pathname === REPAIR_LIST && url.hash === "#stuck")`,
  ]) assert.ok(strip.includes(step), step)
  assert.equal(r.stripTitle, "ต้องจัดการ {count} เรื่อง")
  assert.equal(r.stripEmpty, "ไม่มีงานที่ต้องจัดการ")
  assert.equal(th.maintenancePage.pmRange, "แสดง {from}–{to} จาก {total}")
  assert.equal(th.common.showingRange, "{from}–{to} จาก {total} รายการ")

  // The search (Review Focus 1, G5P5-R4, R6): open 1,000, closed 500, cancelled 200; the tabs 3 · 1 · 1 · 1; the foot
  // 2 records, 1,500.00, one cancelled left out; the ยกเลิก tab has no cost line.
  const search = body("a search's status tabs and cost total")
  for (const step of [
    `await page.locator("#repair-record-cost").fill("1000")`,
    `await page.locator("#repair-record-cost").fill("500")`,
    `await page.locator("#repair-record-cost").fill("200")`,
    `await dialog.getByRole("button", { name: "ยืนยันยกเลิก", exact: true }).click()`,
    "await expect(listRows(page)).toHaveCount(3)",
    `for (const [label, n] of [["${th.common.all}", 3], ["${r.status.in_progress}", 1], ["${r.status.closed}", 1], ["${r.status.cancelled}", 1]] as const) {`,
    `await expect(costFoot).toContainText("ค่าใช้จ่ายรวม 2 รายการ")`,
    `await expect(page.locator("[data-repair-cost-total]")).toContainText("1,500.00")`,
    `await expect(costFoot).toContainText("ไม่นับ 1 รายการที่ยกเลิก")`,
    "await expect(listRow(page, open.id)).toContainText(/(?:ส่ง)?ซ่อมมา 2 วัน/)",
    "await expect(listRow(page, cancelled.id)).toContainText(reason)",
    `await repairTab(page, "${r.status.cancelled}").click()`,
    `await expect(page.locator("[data-repair-cost]")).toHaveCount(0)`,
  ]) assert.ok(search.includes(step), step)
  assert.equal(r.costTotal, "ค่าใช้จ่ายรวม {count} รายการ")
  assert.equal(r.costExcludesCancelled, "ไม่นับ {count} รายการที่ยกเลิก")
  assert.equal(r.detail.repairDays, "ซ่อมมา {days, number} วัน")
  assert.equal(r.detail.sentDays, "ส่งซ่อมมา {days, number} วัน")

  // The stuck card (Review Focus 3), read only on the dev database's own stuck assets (the controller's ruling (a)):
  // nothing is saved on them, the row's บันทึกซ่อม is checked by its href, and decision 11 stays with the unit tests.
  const stuck = body("the stuck card")
  for (const write of ["saveRepairForm", "answerRepair", "createAsset", "/th/maintenance/new?"]) assert.ok(!stuck.includes(write), write)
  for (const step of [
    "await expect(card.locator('[data-slot=\"status-badge\"]').first()).toHaveText(`${count(total)} ชิ้น`)",
    `await expect(card).toContainText("${r.stuckEmpty}")`,
    `expect(create.searchParams.get("assetId")).toBe(assetId)`,
    `expect(create.searchParams.get("returnTo") ?? "").toMatch(/^\\/th\\/maintenance\\?/)`,
    "await card.getByRole(\"link\", { name: `ดูทั้งหมด ${count(total)} ชิ้น`, exact: true }).click()",
    "await expect(rows).toHaveCount(total)",
    `await card.getByRole("link", { name: "${r.stuckShowLess}", exact: true }).click()`,
    "await expect(rows).toHaveCount(3)",
  ]) assert.ok(stuck.includes(step), step)
  assert.equal(r.stuckCount, "{count} ชิ้น")
  assert.equal(r.stuckShowAll, "ดูทั้งหมด {count} ชิ้น")
  assert.ok(spec.includes("Decision 11 (ยังซ่อมไม่เสร็จ saved on an asset") && spec.includes("G5P1-R10"))

  // The PM card (Review Focus 4): a plan due yesterday on an asset with an open record names the record, never
  // บันทึกว่าทำแล้ว; when older plans fill the 3 rows the PM page's row is read instead. The record is closed and the
  // plan ended.
  const pm = body("a PM card row whose asset has an open record")
  for (const step of [
    "const plan = await createPlan(page.request, { assetId: asset.id, title: `${tag} ตรวจแบตเตอรี่`, nextDueDate: dayBefore(bangkokToday()) })",
    "const openLink = `มีบันทึกซ่อมที่ยังไม่เสร็จ ${record.repairNo}`",
    `await expect(row.getByRole("link", { name: "${r.pmRecordDone}", exact: true })).toHaveCount(0)`,
    `const pmRow = await visitPlanRow(page, measure, plan.planNo, "active", "PM plans, the overdue plan with its open record")`,
    `await completeRecord(page, measure, e2eDevice, record.id, "ใช้งานได้", "close the PM plan's asset's record")`,
  ]) assert.ok(pm.includes(step), step)
  assert.match(pm, /\} finally \{\n\s+await endPlan\(page\.request, plan\.id\)\n\s+\}/)
  assert.equal(th.maintenancePage.pmOpenRecord, "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}")
  assert.equal(r.pmOverdue, "เกินกำหนด {days} วัน")

  // axe: measure.visit runs it on the list, light and dark (the four projects).
  assert.ok(body("the repair list passes axe").includes("await measure.visit(REPAIR_LIST, \"repair list\")"))

  // The record specs' list visits: the header's บันทึกซ่อม (the stuck rows hold one too), and ?assetId= rows by id.
  assert.ok(repairSpec.includes(`await page.locator('[data-slot="page-header-actions"]').getByRole("link", { name: "บันทึกซ่อม", exact: true }).click()`))
  assert.ok(repairSpec.includes("for (const record of [first, second]) await expect(listRow(page, record.id)).toBeVisible()"))
  assert.equal(r.assetFilter, "เฉพาะทรัพย์สินนี้")
})

// A value of messages/th.json by its key, wherever it sits.
function findValue(node: unknown, key: string): string | undefined {
  if (!node || typeof node !== "object") return undefined
  for (const [name, value] of Object.entries(node as Record<string, unknown>)) {
    if (name === key && typeof value === "string") return value
    const found = findValue(value, key)
    if (found !== undefined) return found
  }
  return undefined
}
