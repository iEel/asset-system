// The preventive maintenance (PM) plan (spec §6.3 4; group 5 spec §9, §10, §16), as IT staff on the computer (and the
// same walk on the phone). The PM page shows one state per tab and finds a plan by search (?q=), never by position:
// the dev database keeps the old plans (decision 10.6). Each test makes its own run-marked assets and plans and ends
// its plans; the asset's status never changes with a plan's state.
import { asUser, expect, test } from "../support/fixtures.ts"
import {
  PM_LIST,
  answerRepair,
  areaTag,
  bangkokToday,
  choosePlanAsset,
  completeRecord,
  createAsset,
  createPlan,
  dayAfter,
  daysBetween,
  dueCell,
  endPlan,
  headerBadge,
  nextStepCard,
  planAction,
  planAssetCard,
  planRow,
  planRows,
  pmListUrl,
  pmTab,
  readAsset,
  readAssetMasters,
  saveRepairForm,
  valueBeside,
  visitPlanRow,
} from "./repair-data.ts"

asUser("itStaff")

// A plan's create (POST) and its edit (PATCH) as the PM form sends them.
const planCreated = (url: string, method: string) => url.endsWith("/api/maintenance-plans") && method === "POST"
const planSaved = (planId: string) => (url: string, method: string) => url.endsWith(`/api/maintenance-plans/${planId}`) && method === "PATCH"

test("a monthly PM plan is created, recorded done on 31 Jan from its row with its next due date clamped to 28 Feb, then paused, resumed and ended through ⋯ (ER4)", async ({ page, measure, e2eDevice }, testInfo) => {
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "P1")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องสำรองไฟ`, ownershipType: "shared" })
  const title = `${tag} ตรวจเช็กประจำเดือน`

  // The PM page, then "เพิ่มแผน PM".
  await measure.visit(PM_LIST, "PM plans")
  await page.getByRole("main").getByRole("link", { name: "เพิ่มแผน PM", exact: true }).first().click()
  await page.waitForURL(/\/th\/maintenance\/pm\/new(?:\?|$)/)
  await measure.recordPage("new PM plan form")

  // A wrong entry first (spec §6.7): the asset chosen (its card replaces the picker), no plan name. The error shows
  // under the field.
  await choosePlanAsset(page, tag)
  await page.locator("#maintenance-plan-next-due-date").fill("2026-01-31")
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expect(page.locator("#maintenance-plan-title-error")).toHaveText("กรุณาระบุข้อมูลนี้")
  await expect(page.locator("#maintenance-plan-title")).toBeFocused()
  await measure.recordPage("new PM plan form with its error")

  await page.locator("#maintenance-plan-title").fill(title)
  // The frequency is a Segmented group (spec §10): รายเดือน is on by default; รายไตรมาส turns it off and the preview
  // steps by 3 months; back on รายเดือน, the four rounds chain the month-end clamp (Review Focus 4).
  const frequency = page.locator("#maintenance-plan-frequency")
  const preview = page.locator("[data-pm-preview] [data-pm-preview-round]")
  await expect(frequency.getByRole("button", { name: "รายเดือน", exact: true })).toHaveAttribute("aria-pressed", "true")
  await frequency.getByRole("button", { name: "รายไตรมาส", exact: true }).click()
  await expect(frequency.getByRole("button", { name: "รายไตรมาส", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(frequency.getByRole("button", { name: "รายเดือน", exact: true })).toHaveAttribute("aria-pressed", "false")
  await expect(preview.nth(1)).toContainText("+3 เดือน")
  await frequency.getByRole("button", { name: "รายเดือน", exact: true }).click()
  await expect(frequency.getByRole("button", { name: "รายเดือน", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(preview).toHaveText([/31\/01\/2569/, /28\/02\/2569\s*\+1 เดือน/, /28\/03\/2569/, /28\/04\/2569/])
  const createdResponse = page.waitForResponse((response) => planCreated(response.url(), response.request().method()))
  await measure.timed("save the PM plan", async () => {
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    await createdResponse
  })
  const created = await createdResponse
  expect(created.status()).toBe(201)
  const plan = (await created.json()) as { id: string; planNo: string; nextDueDate: string; planState: string; frequency: string }
  expect(plan.planNo).toMatch(/^PM-\d{8}-\d{4}$/)
  expect(plan.planState).toBe("active")
  expect(plan.frequency).toBe("monthly")
  await page.waitForURL(/\/th\/maintenance\/pm(?:\?|$)/)

  // Due on 31 Jan, so it is overdue: the PM page finds it by its planNo, with its days counted in Bangkok days.
  const listed = await visitPlanRow(page, measure, plan.planNo, "active", "PM plans, the new plan")
  await expect(listed).toContainText(title)
  await expect(listed).toContainText(`เกินกำหนด ${daysBetween("2026-01-31", bangkokToday())} วัน`)
  // The overdue cell keeps the search and opens a list of that one plan.
  await expect(dueCell(page, "overdue").locator("dd").first()).toHaveText("1")
  await dueCell(page, "overdue").getByRole("link").click()
  await page.waitForURL((url) => url.searchParams.get("due") === "overdue" && url.searchParams.get("q") === plan.planNo)
  await expect(planRows(page)).toHaveCount(1)
  const overdueRow = planRow(page, plan.planNo)
  await expect(overdueRow).toBeVisible()
  await measure.recordPage("PM plans, the overdue cell")

  // Recorded done from the row: the form names the plan, the asset is fixed, and the date is the day the PM was done.
  await overdueRow.getByRole("link", { name: /^บันทึกว่าทำแล้ว/ }).click()
  await page.waitForURL(new RegExp(`/th/maintenance/new\\?planId=${plan.id}`))
  await expect(page.getByText(`${plan.planNo} - ${title}`)).toBeVisible()
  // The plan's asset is its card, with no เปลี่ยน (G5P2-R8).
  await expect(page.locator("#repair-record-asset-value")).toContainText(tag)
  await expect(page.locator("[data-repair-asset-card]")).toBeVisible()
  await expect(page.locator("#repair-record-asset").getByRole("button", { name: "เปลี่ยน", exact: true })).toHaveCount(0)
  await expect(page.locator("#repair-record-problem")).toHaveValue(title)
  // ซ่อมเสร็จแล้ว is pre-checked on the PM path, the result is not (G5P2-R6): it is answered before the save.
  await expect(page.getByRole("radio", { name: "ซ่อมเสร็จแล้ว", exact: true })).toBeChecked()
  await expect(page.locator("#repair-record-outcome").getByRole("radio", { checked: true })).toHaveCount(0)
  await measure.recordPage("PM done form")
  await answerRepair(page, { done: true, outcome: "ใช้งานได้", condition: "ดี" })
  await page.locator("#repair-record-date").fill("2026-01-31")
  const record = await saveRepairForm(page, measure, "save the PM done")
  await expect(headerBadge(page)).toHaveText("ซ่อมเสร็จแล้ว")
  // The record page's next-step card says what the close left (group 5 plan 3): ใช้งานได้, the asset's status now.
  await expect(nextStepCard(page, "closedUsable")).toBeVisible()
  await expect(nextStepCard(page, "closedUsable")).toContainText("ใช้งานได้")
  await expect(valueBeside(page, "แผน PM")).toContainText(plan.planNo)
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("พร้อมใช้งาน")
  await measure.recordPage("PM done record")
  expect(record.repairStatus).toBe("closed")
  expect((await readAsset(page.request, asset.id)).status.name, "a PM done leaves the asset's status as it was").toBe("Ready")

  // The next due date moves from the record date: 31 Jan + 1 month = 28 Feb 2026 (not 3 Mar). The edit page holds it as
  // the date input's value.
  await measure.visit(`/th/maintenance/pm/${plan.id}/edit`, "PM plan edit page")
  await expect(page.locator("#maintenance-plan-next-due-date")).toHaveValue("2026-02-28")
  // Nothing the page started is left to cancel when the test moves on (e2e fix loop 2).
  await page.waitForLoadState("networkidle")
  let row = await visitPlanRow(page, measure, plan.planNo, "active", "PM plans after done")
  await expect(row).toContainText("28/02/2569")
  await expect(row).toContainText(`เกินกำหนด ${daysBetween("2026-02-28", bangkokToday())} วัน`)

  // Pause from ⋯: the plan leaves the active tab. On the paused tab it shows its date only, with no due badge and no
  // "บันทึกว่าทำแล้ว", and the tab has no due cells.
  await planAction(page, e2eDevice, row, "พักแผน", "พักแผน PM นี้หรือไม่", "พักแผน PM แล้ว")
  await expect(row).toHaveCount(0)
  row = await visitPlanRow(page, measure, plan.planNo, "paused", "PM plans, plan paused")
  await expect(pmTab(page, "พักแผน")).toHaveAttribute("aria-current", "page")
  await expect(row).toContainText("28/02/2569")
  await expect(row.locator('[data-slot="status-badge"]')).toHaveCount(0)
  await expect(row.getByRole("link", { name: /^บันทึกว่าทำแล้ว/ })).toHaveCount(0)
  await expect(page.locator("[data-pm-due-cell]")).toHaveCount(0)

  // Resume: active again, with its "บันทึกว่าทำแล้ว".
  await planAction(page, e2eDevice, row, "เปิดใช้งานต่อ", "เปิดใช้งานแผน PM นี้ต่อหรือไม่", "เปิดใช้งานแผน PM ต่อแล้ว")
  await expect(row).toHaveCount(0)
  row = await visitPlanRow(page, measure, plan.planNo, "active", "PM plans, plan resumed")
  await expect(row.getByRole("link", { name: /^บันทึกว่าทำแล้ว/ })).toBeVisible()

  // End: for good. There is no plan page of its own (the edit page answers 404 for an ended plan), so the ended plan is
  // read on the ended tab: "จบแผนเมื่อ <date>", no record, no edit, no ⋯, newest ended first.
  await planAction(page, e2eDevice, row, "จบแผน", "จบแผน PM นี้ถาวรหรือไม่", "จบแผน PM แล้ว")
  await expect(row).toHaveCount(0)
  row = await visitPlanRow(page, measure, plan.planNo, "ended", "PM plans, plan ended")
  await expect(row).toContainText(/จบแผนเมื่อ \d{2}\/\d{2}\/\d{4}/)
  await expect(row.getByRole("link")).toHaveCount(0)
  await expect(row.getByRole("button")).toHaveCount(0)
  await expect(page.getByRole("main")).toContainText("เรียงจากที่จบแผนล่าสุด")
  expect((await readAsset(page.request, asset.id)).status.name, "the plan's states leave the asset's status as it was").toBe("Ready")
})

// The PM page's tabs, search and cells (spec §9, §16; Review Focus 1 and 2): an asset under repair still takes a plan
// (decision 10.4), and its row names the open record in place of "บันทึกว่าทำแล้ว" while it still counts as overdue.
// One search finds that plan and a plan due in 5 days: the tabs count 2, 0 and 0, the cells read 1, 1 and 0 and each
// opens a list of its own size that keeps the search, and the cell in use links back without its filter. The record
// is closed and the plans are ended, then the ended tab reads "จบแผนเมื่อ" for both.
test("the PM page's tabs, search and cells: a plan of an asset under repair, two plans of one search, cells that open lists of their own size, and the ended tab (group 5 plan 4)", async ({ page, measure, e2eDevice }, testInfo) => {
  const masters = await readAssetMasters(page)
  const search = areaTag(testInfo, "P3")
  const repaired = await createAsset(page.request, masters, { tag: search, name: `${search} เครื่องสแกนส่งซ่อม`, ownershipType: "shared" })
  const nearTag = areaTag(testInfo, "P3B")
  const near = await createAsset(page.request, masters, { tag: nearTag, name: `${nearTag} เครื่องสำรองไฟ`, ownershipType: "shared" })
  const plans: { id: string; planNo: string }[] = []
  const ended = new Set<string>()
  try {
    // An open repair first: the asset goes อยู่ระหว่างซ่อม.
    await measure.visit(`/th/maintenance/new?assetId=${repaired.id}`, "repair form for the PM asset")
    await expect(page.locator("#repair-record-asset-value")).toContainText(search)
    await answerRepair(page, { done: false })
    await page.locator("#repair-record-problem").fill(`${search} สแกนไม่ติด ส่งร้าน`)
    const record = await saveRepairForm(page, measure, "save the open repair")
    expect((await readAsset(page.request, repaired.id)).status.name, "the asset is under repair").toBe("Under Maintenance")

    // A plan for it: ?assetId= brings its card, which reads อยู่ระหว่างซ่อม, and the save is taken.
    await measure.visit(`/th/maintenance/pm/new?assetId=${repaired.id}`, "new PM plan for an asset under repair")
    await expect(planAssetCard(page)).toContainText(search)
    await expect(planAssetCard(page)).toContainText("อยู่ระหว่างซ่อม")
    await page.locator("#maintenance-plan-title").fill(`${search} ทำความสะอาดหัวสแกน`)
    await page.locator("#maintenance-plan-next-due-date").fill("2026-01-31")
    const createdResponse = page.waitForResponse((response) => planCreated(response.url(), response.request().method()))
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    const response = await createdResponse
    expect(response.status(), "a plan of an asset under repair is created").toBe(201)
    const overdue = (await response.json()) as { id: string; planNo: string }
    plans.push(overdue)
    await page.waitForURL(/\/th\/maintenance\/pm(?:\?|$)/)
    const soon = await createPlan(page.request, { assetId: near.id, title: `${nearTag} ตรวจแบตเตอรี่`, nextDueDate: dayAfter(bangkokToday(), 5) })
    plans.push(soon)

    // One search over both: the asset tags and the titles carry it.
    await measure.visit(pmListUrl({ q: search }), "PM plans, one search of two plans")
    await expect(planRows(page)).toHaveCount(2)
    await expect(pmTab(page, "ใช้งาน")).toHaveText(/^ใช้งาน\s*2$/)
    await expect(pmTab(page, "พักแผน")).toHaveText(/^พักแผน\s*0$/)
    await expect(pmTab(page, "จบแผน")).toHaveText(/^จบแผน\s*0$/)
    await expect(page.locator("[data-pm-due-sum]")).toHaveText("1 + 1 + 0 = 2 แผนที่ใช้งาน")
    // The plan of the asset under repair: overdue, with the open record's link and no "บันทึกว่าทำแล้ว".
    const overdueRow = planRow(page, overdue.planNo)
    await expect(overdueRow).toContainText(`เกินกำหนด ${daysBetween("2026-01-31", bangkokToday())} วัน`)
    await expect(overdueRow.getByRole("link", { name: `มีบันทึกซ่อมที่ยังไม่เสร็จ ${record.repairNo}`, exact: true })).toBeVisible()
    await expect(overdueRow.getByRole("link", { name: /^บันทึกว่าทำแล้ว/ })).toHaveCount(0)
    await expect(planRow(page, soon.planNo)).toContainText("ใกล้ถึงกำหนด · อีก 5 วัน")
    await expect(planRow(page, soon.planNo).getByRole("link", { name: /^บันทึกว่าทำแล้ว/ })).toBeVisible()

    // Each cell opens a list of its own size that keeps the search; pressed again, it links back without the filter.
    for (const [bucket, count] of [["overdue", 1], ["soon", 1], ["later", 0]] as const) {
      const cell = dueCell(page, bucket)
      await expect(cell.locator("dd").first()).toHaveText(String(count))
      await cell.getByRole("link").click()
      await page.waitForURL((url) => url.searchParams.get("due") === bucket && url.searchParams.get("q") === search)
      await expect(cell.getByRole("link")).toHaveAttribute("aria-current", "page")
      await expect(planRows(page)).toHaveCount(count)
      if (count === 0) await expect(page.getByRole("main").getByText("ไม่พบแผนที่ตรงกับการค้นหาหรือตัวกรอง").filter({ visible: true })).toHaveCount(1)
      await measure.recordPage(`PM plans, the ${bucket} cell`)
      await cell.getByRole("link").click()
      await page.waitForURL((url) => !url.searchParams.has("due") && url.searchParams.get("q") === search)
      await expect(planRows(page)).toHaveCount(2)
    }

    // The search by one planNo gives its one row.
    await visitPlanRow(page, measure, overdue.planNo, "active", "PM plans, a search by planNo")

    // The open record is closed, the plans are ended, and the ended tab holds both, newest ended first.
    await measure.visit(`/th/maintenance/${record.id}`, "the open repair")
    await completeRecord(page, measure, e2eDevice, record.id, "ใช้งานได้", "close the open repair")
    for (const plan of plans) {
      await endPlan(page.request, plan.id)
      ended.add(plan.id)
    }
    await measure.visit(pmListUrl({ q: search, tab: "ended" }), "PM plans, the ended tab")
    await expect(planRows(page)).toHaveCount(2)
    for (const plan of plans) await expect(planRow(page, plan.planNo)).toContainText(/จบแผนเมื่อ \d{2}\/\d{2}\/\d{4}/)
    await expect(pmTab(page, "ใช้งาน")).toHaveText(/^ใช้งาน\s*0$/)
    await expect(pmTab(page, "จบแผน")).toHaveText(/^จบแผน\s*2$/)
    await expect(page.locator("[data-pm-due-cell]")).toHaveCount(0)
    await expect(page.getByRole("main")).toContainText("แสดง 1–2 จาก 2 · เรียงจากที่จบแผนล่าสุด")
  } finally {
    for (const plan of plans) if (!ended.has(plan.id)) await endPlan(page.request, plan.id)
  }
})

// A stale PM edit (spec §10, Review Focus 3): two pages of one context open the edit page of a run-marked plan. The
// first saves one change, its summary reading "แก้ 1 ช่อง" before the save. The second, opened before that save, is
// refused (409 MAINTENANCE_PLAN_CONFLICT) with the reload message and keeps what was typed. The plan is ended.
test("a stale PM edit is refused: the second page's save after the first page's is refused with the reload message and keeps its values (group 5 plan 4, Review Focus 3)", async ({ page, measure }, testInfo) => {
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "P5")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องสำรองไฟแก้สองหน้า`, ownershipType: "shared" })
  const title = `${tag} ตรวจเช็กสองหน้า`
  const plan = await createPlan(page.request, { assetId: asset.id, title, nextDueDate: dayAfter(bangkokToday(), 30) })
  const second = await page.context().newPage()
  try {
    const editUrl = `/th/maintenance/pm/${plan.id}/edit`
    await measure.visit(editUrl, "PM plan edit page")
    await second.goto(editUrl)
    await expect(second.locator("#maintenance-plan-title")).toHaveValue(title)

    // The first page: one change, which the summary and the footer count, then the save goes through.
    await page.locator("#maintenance-plan-title").fill(`${title} แก้แล้ว`)
    await expect(page.getByRole("heading", { name: "สรุปก่อนบันทึก · แก้ 1 ช่อง", exact: true })).toBeVisible()
    await expect(page.locator("[data-pm-plan-footer]")).toContainText("แก้ 1 ช่อง")
    await measure.recordPage("PM plan edit page, one change")
    const saved = page.waitForResponse((response) => planSaved(plan.id)(response.url(), response.request().method()))
    await page.getByRole("button", { name: "บันทึกการแก้ไข", exact: true }).click()
    expect((await saved).status(), "the first save").toBe(200)
    await page.waitForURL(/\/th\/maintenance\/pm(?:\?|$)/)

    // The second page, opened before that save: refused, the toast says to reload, and the form keeps its values.
    const notes = `${tag} หมายเหตุจากหน้าที่สอง`
    await second.locator("#maintenance-plan-notes").fill(notes)
    const refused = second.waitForResponse((response) => planSaved(plan.id)(response.url(), response.request().method()))
    await second.getByRole("button", { name: "บันทึกการแก้ไข", exact: true }).click()
    const refusal = await refused
    expect(refusal.status(), "the stale save").toBe(409)
    expect(((await refusal.json()) as { code?: string }).code).toBe("MAINTENANCE_PLAN_CONFLICT")
    await expect(second.getByText("แผนนี้ถูกแก้ไขหรือบันทึกว่าทำแล้วระหว่างที่เปิดหน้านี้ โหลดหน้าใหม่แล้วแก้อีกครั้ง").first()).toBeVisible()
    await expect(second).toHaveURL(new RegExp(`/th/maintenance/pm/${plan.id}/edit`))
    await expect(second.locator("#maintenance-plan-notes")).toHaveValue(notes)
    await expect(second.locator("#maintenance-plan-title")).toHaveValue(title)

    // The plan holds the first page's change.
    const row = await visitPlanRow(page, measure, plan.planNo, "active", "PM plans after the first save")
    await expect(row).toContainText(`${title} แก้แล้ว`)
  } finally {
    await second.close()
    await endPlan(page.request, plan.id)
  }
})

// ตั้งรอบ PM from the asset's ซ่อม / PM tab (decision 8, spec §12.1): the form opens with the asset and returnTo the tab,
// and the save comes back to the tab, which lists the new plan. The plan is ended.
test("ตั้งรอบ PM from the asset tab comes back to the tab (group 5 plan 4, decision 8)", async ({ page, measure }, testInfo) => {
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "P4")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องสำรองไฟจากแท็บ`, ownershipType: "shared" })
  const title = `${tag} ตรวจเช็กจากแท็บ`
  let planId: string | null = null
  try {
    await measure.visit(`/th/assets/${asset.id}?view=maintenance`, "asset page, the ซ่อม / PM tab")
    await page.getByRole("main").getByRole("link", { name: "ตั้งรอบ PM", exact: true }).filter({ visible: true }).first().click()
    await page.waitForURL((url) => url.pathname === "/th/maintenance/pm/new" && url.searchParams.get("assetId") === asset.id && url.searchParams.get("returnTo") === `/th/assets/${asset.id}?view=maintenance`)
    await expect(planAssetCard(page)).toContainText(tag)
    await measure.recordPage("new PM plan form from the asset tab")
    await page.locator("#maintenance-plan-title").fill(title)
    await page.locator("#maintenance-plan-frequency").getByRole("button", { name: "รายไตรมาส", exact: true }).click()
    await page.locator("#maintenance-plan-next-due-date").fill(dayAfter(bangkokToday(), 30))
    const createdResponse = page.waitForResponse((response) => planCreated(response.url(), response.request().method()))
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    const response = await createdResponse
    expect(response.status(), "the plan is created").toBe(201)
    const plan = (await response.json()) as { id: string; planNo: string; frequency: string }
    planId = plan.id
    expect(plan.frequency).toBe("quarterly")
    await page.waitForURL((url) => url.pathname === `/th/assets/${asset.id}` && url.searchParams.get("view") === "maintenance")
    await expect(page.getByRole("main")).toContainText(plan.planNo)
    await expect(page.getByRole("main")).toContainText(title)
    await measure.recordPage("asset tab with its new plan")
  } finally {
    if (planId) await endPlan(page.request, planId)
  }
})
