// The preventive maintenance (PM) plan (spec §6.3 4), as IT staff on the computer (and the same walk on the phone):
// create a monthly plan, find it in the "PM ถึงกำหนด" box, record it done, and see the next due date advance with the
// month-end clamp (31 Jan + 1 month = 28 Feb), then pause, resume and end it. The asset's status does not change. The
// create starts with one wrong entry that shows under its field (§6.7).
import { asUser, expect, test } from "../support/fixtures.ts"
import { PM_LIST, areaTag, chooseAsset, createAsset, headerBadge, planAction, readAsset, readAssetMasters, saveRepairForm, valueBeside, visitPlanRow } from "./repair-data.ts"

asUser("itStaff")

test("a monthly PM plan is created, recorded done on 31 Jan with its next due date clamped to 28 Feb, then paused, resumed and ended (ER4)", async ({ page, measure }, testInfo) => {
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "P1")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องสำรองไฟ`, ownershipType: "shared" })
  const title = `${tag} ตรวจเช็กประจำเดือน`

  // The PM page, then "เพิ่มแผน PM".
  await measure.visit(PM_LIST, "PM plans")
  await page.getByRole("main").getByRole("link", { name: "เพิ่มแผน PM", exact: true }).click()
  await page.waitForURL(/\/th\/maintenance\/pm\/new(?:\?|$)/)
  await measure.recordPage("new PM plan form")

  // A wrong entry first (spec §6.7): the asset chosen, no plan name. The error shows under the field.
  await chooseAsset(page, "maintenance-plan-asset", tag)
  await page.locator("#maintenance-plan-next-due-date").fill("2026-01-31")
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expect(page.locator("#maintenance-plan-title-error")).toHaveText("กรุณาระบุข้อมูลนี้")
  await expect(page.locator("#maintenance-plan-title")).toBeFocused()
  await measure.recordPage("new PM plan form with its error")

  await page.locator("#maintenance-plan-title").fill(title)
  await expect(page.locator("#maintenance-plan-frequency")).toHaveValue("monthly")
  const createdResponse = page.waitForResponse((response) => response.url().endsWith("/api/maintenance-plans") && response.request().method() === "POST")
  await measure.timed("save the PM plan", async () => {
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    await createdResponse
  })
  const created = await createdResponse
  expect(created.status()).toBe(201)
  const plan = (await created.json()) as { id: string; planNo: string; nextDueDate: string; planState: string }
  expect(plan.planNo).toMatch(/^PM-\d{8}-\d{4}$/)
  expect(plan.planState).toBe("active")
  await page.waitForURL(/\/th\/maintenance\/pm(?:\?|$)/)

  // Due on 31 Jan, so it is overdue and shows in the repair page's "PM ถึงกำหนด" box.
  await measure.visit("/th/maintenance", "repair list with PM due")
  const dueBox = page.locator("#pm-due")
  const dueRow = dueBox.locator("li").filter({ hasText: title })
  await expect(dueRow).toContainText(plan.planNo)
  await expect(dueRow).toContainText("เลยกำหนด")

  // Recorded done from the box: the form names the plan, the asset is fixed, and the date is the day the PM was done.
  await dueRow.getByRole("link", { name: "บันทึกว่าทำแล้ว" }).click()
  await page.waitForURL(new RegExp(`/th/maintenance/new\\?planId=${plan.id}`))
  await expect(page.getByText(`${plan.planNo} - ${title}`)).toBeVisible()
  await expect(page.locator("#repair-record-asset")).toBeDisabled()
  await expect(page.locator("#repair-record-asset-value")).toContainText(tag)
  await expect(page.locator("#repair-record-problem")).toHaveValue(title)
  await expect(page.getByRole("radio", { name: "ซ่อมเสร็จแล้ว" })).toBeChecked()
  await measure.recordPage("PM done form")
  await page.locator("#repair-record-date").fill("2026-01-31")
  const record = await saveRepairForm(page, measure, "save the PM done")
  await expect(headerBadge(page)).toHaveText("ซ่อมเสร็จแล้ว")
  await expect(valueBeside(page, "แผน PM")).toContainText(plan.planNo)
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("พร้อมใช้งาน")
  await measure.recordPage("PM done record")
  expect(record.repairStatus).toBe("closed")
  expect((await readAsset(page.request, asset.id)).status.name, "a PM done leaves the asset's status as it was").toBe("Ready")

  // The next due date: 31 Jan + 1 month = 28 Feb 2026 (not 3 Mar). The edit page holds it as the date input's value.
  await measure.visit(`/th/maintenance/pm/${plan.id}/edit`, "PM plan edit page")
  await expect(page.locator("#maintenance-plan-next-due-date")).toHaveValue("2026-02-28")
  // The asset select loads its chosen asset's label 250 ms after the page opens; leaving before it answers cancels it
  // (net::ERR_ABORTED on the phone in the dry run). Let it finish first (e2e fix loop 2).
  await page.waitForLoadState("networkidle")
  // The list orders plans by state across every page and the dev database grows run by run, so each look at the plan
  // finds it on whichever page holds it (e2e fix 2D: 103 active plans pushed the paused plan to page 2).
  let row = await visitPlanRow(page, measure, title, "PM plans after done")
  await expect(row).toContainText("กำหนด PM ครั้งถัดไป: 28/02/2569")
  await expect(row).toContainText("ใช้งาน")

  // Pause: the plan leaves the due box and has no "บันทึกว่าทำแล้ว". The list refreshes in place first (its row loses
  // the button, or leaves the page), then the plan is looked for again.
  await planAction(page, row, "พักแผน", "พักแผน PM นี้หรือไม่", "พักแผน PM แล้ว")
  await expect(row.getByRole("button", { name: "พักแผน", exact: true })).toHaveCount(0)
  row = await visitPlanRow(page, measure, title, "PM plans, plan paused")
  await expect(row.locator('[data-slot="status-badge"]').last()).toHaveText("พักแผน")
  await expect(row.getByRole("link", { name: "บันทึกว่าทำแล้ว" })).toHaveCount(0)
  await measure.visit("/th/maintenance", "repair list, plan paused")
  await expect(page.locator("#pm-due")).not.toContainText(title)

  // Resume: active again, back in the due box.
  row = await visitPlanRow(page, measure, title, "PM plans to resume")
  await planAction(page, row, "เปิดใช้งานต่อ", "เปิดใช้งานแผน PM นี้ต่อหรือไม่", "เปิดใช้งานแผน PM ต่อแล้ว")
  await expect(row.getByRole("button", { name: "เปิดใช้งานต่อ", exact: true })).toHaveCount(0)
  row = await visitPlanRow(page, measure, title, "PM plans, plan resumed")
  await expect(row.locator('[data-slot="status-badge"]').last()).toHaveText("ใช้งาน")
  await expect(row.getByRole("link", { name: "บันทึกว่าทำแล้ว" })).toBeVisible()
  await measure.visit("/th/maintenance", "repair list, plan resumed")
  await expect(page.locator("#pm-due").locator("li").filter({ hasText: title })).toContainText(plan.planNo)

  // End: for good. No record, no edit, no pause or resume. There is no plan page of its own (the edit page answers 404
  // for an ended plan), so the ended plan is read on the list, on a page near its end.
  row = await visitPlanRow(page, measure, title, "PM plans to end")
  await planAction(page, row, "จบแผน", "จบแผน PM นี้ถาวรหรือไม่", "จบแผน PM แล้ว")
  await expect(row.getByRole("button", { name: "จบแผน", exact: true })).toHaveCount(0)
  row = await visitPlanRow(page, measure, title, "PM plans, plan ended")
  await expect(row.locator('[data-slot="status-badge"]').last()).toHaveText("จบแผน")
  for (const name of ["บันทึกว่าทำแล้ว", "แก้ไข"]) await expect(row.getByRole("link", { name })).toHaveCount(0)
  for (const name of ["พักแผน", "เปิดใช้งานต่อ", "จบแผน"]) await expect(row.getByRole("button", { name })).toHaveCount(0)
  expect((await readAsset(page.request, asset.id)).status.name, "the plan's states leave the asset's status as it was").toBe("Ready")
})
