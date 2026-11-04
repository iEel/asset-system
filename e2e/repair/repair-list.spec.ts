// The repair list (MT-List; group 5 spec §11, §16; plan 5 Task 4), as IT staff on the computer and the phone, light
// and dark. The ต้องจัดการ strip counts globally, like the bell (G5P5-R1), and the dev database keeps its old records,
// assets and plans, so a cell is compared with the list it opens, read on the same page, never with a fixed number.
// The search, the status tabs and the cost total use three run-marked records of their own; the PM card's row uses a
// run-marked plan and record, closed and ended by the test. The stuck card is read only: the app has no way to put a
// run-marked asset into a repair status without an open record (status correction only goes back to Ready, the edit
// keeps the status, and create and import take Draft or Ready), so the card is checked on the dev database's own stuck
// assets and nothing is saved on them (the controller's ruling (a)). Decision 11 (ยังซ่อมไม่เสร็จ saved on an asset
// already อยู่ระหว่างซ่อม keeps that status) stays with the unit tests (G5P1-R10, tests/repair-record-policy.test.ts).
import { asUser, expect, test } from "../support/fixtures.ts"
import {
  answerRepair,
  areaTag,
  bangkokToday,
  completeRecord,
  countOf,
  createAsset,
  createPlan,
  dayAfter,
  dayBefore,
  endPlan,
  headerBadge,
  listRow,
  listRows,
  openRecordMenu,
  pmPlanTotal,
  readAsset,
  readAssetMasters,
  recordMenuItem,
  REPAIR_LIST,
  repairListPanel,
  repairTab,
  saveRepairForm,
  stripCell,
  stripCount,
  visitPlanRow,
} from "./repair-data.ts"

asUser("itStaff")

const count = (value: number) => new Intl.NumberFormat("th-TH").format(value)

test("the strip's cells open lists of their own size (group 5 plan 5, Review Focus 1)", async ({ page, measure }) => {
  await measure.visit(REPAIR_LIST, "repair list")
  // The heading sums the four cells (G5P5-R2), with their parts under it.
  const cells = { open: await stripCount(page, "open"), stuck: await stripCount(page, "stuck"), pmOverdue: await stripCount(page, "pmOverdue"), pmWeek: await stripCount(page, "pmWeek") }
  const sum = cells.open + cells.stuck + cells.pmOverdue + cells.pmWeek
  const heading = page.getByRole("heading", { level: 2, name: sum > 0 ? `ต้องจัดการ ${count(sum)} เรื่อง` : "ไม่มีงานที่ต้องจัดการ", exact: true })
  await expect(heading).toBeVisible()
  if (sum > 0) await expect(page.locator("[data-repair-strip-sum]")).toHaveText([cells.open, cells.stuck, cells.pmOverdue, cells.pmWeek].map(count).join(" + "))

  // ยังซ่อมไม่เสร็จ: the cell equals the tab of the unfiltered list, then it opens ?status=in_progress, where it is the
  // current cell and the list holds as many records.
  expect(countOf(await repairTab(page, "ยังซ่อมไม่เสร็จ").innerText()), "the open cell and the unfiltered list's tab").toBe(cells.open)
  await stripCell(page, "open").getByRole("link").click()
  await page.waitForURL((url) => url.pathname === REPAIR_LIST && url.searchParams.get("status") === "in_progress")
  await measure.recordPage("repair list, the open records")
  await expect(stripCell(page, "open").getByRole("link")).toHaveAttribute("aria-current", "page")
  await expect(repairTab(page, "ยังซ่อมไม่เสร็จ")).toHaveAttribute("aria-current", "page")
  const open = await stripCount(page, "open")
  expect(countOf(await repairTab(page, "ยังซ่อมไม่เสร็จ").innerText()), "the open cell and its list's tab").toBe(open)
  if (open > 0) await expect(page.getByRole("main")).toContainText(`จาก ${count(open)} รายการ`)

  // The PM cells open the PM page's due filters, whose plan count equals the cell.
  for (const [key, due] of [["pmOverdue", "overdue"], ["pmWeek", "week"]] as const) {
    await measure.visit(REPAIR_LIST, `repair list before the ${due} plans`)
    const cell = await stripCount(page, key)
    await stripCell(page, key).getByRole("link").click()
    await page.waitForURL((url) => url.pathname === "/th/maintenance/pm" && url.searchParams.get("due") === due)
    await measure.recordPage(`PM plans, due ${due}`)
    expect(await pmPlanTotal(page), `the ${key} cell and the PM page's ${due} list`).toBe(cell)
  }

  // ค้างสถานะซ่อมไม่มีบันทึก lands on the stuck card of this page.
  await measure.visit(REPAIR_LIST, "repair list before the stuck card")
  await stripCell(page, "stuck").getByRole("link").click()
  await page.waitForURL((url) => url.pathname === REPAIR_LIST && url.hash === "#stuck")
  await expect(page.locator("section#stuck")).toBeInViewport()
})

test("a search's status tabs and cost total: cancelled records stay out of the total, and the ยกเลิก tab has none (group 5 plan 5, Review Focus 1)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.setTimeout(240_000)
  const masters = await readAssetMasters(page)
  const search = areaTag(testInfo, "L1")
  const tags = { open: areaTag(testInfo, "L1A"), closed: areaTag(testInfo, "L1B"), cancelled: areaTag(testInfo, "L1C") }
  const assets = {
    open: await createAsset(page.request, masters, { tag: tags.open, name: `${tags.open} โน้ตบุ๊กซ่อมค้าง`, ownershipType: "stock" }),
    closed: await createAsset(page.request, masters, { tag: tags.closed, name: `${tags.closed} โน้ตบุ๊กซ่อมเสร็จ`, ownershipType: "stock" }),
    cancelled: await createAsset(page.request, masters, { tag: tags.cancelled, name: `${tags.cancelled} โน้ตบุ๊กบันทึกผิด`, ownershipType: "stock" }),
  }

  // Open, 1,000 baht, recorded two days ago (so its line counts days: "ซ่อมมา 2 วัน").
  await measure.visit(`/th/maintenance/new?assetId=${assets.open.id}`, "repair form, the open record")
  await page.locator("#repair-record-date").fill(dayAfter(bangkokToday(), -2))
  await page.locator("#repair-record-problem").fill(`${tags.open} จอกระพริบ`)
  await page.locator("#repair-record-cost").fill("1000")
  await answerRepair(page, { done: false })
  const open = await saveRepairForm(page, measure, "save the open record with a cost")
  await expect(headerBadge(page)).toHaveText("ยังซ่อมไม่เสร็จ")

  // Closed ใช้งานได้, 500 baht.
  await measure.visit(`/th/maintenance/new?assetId=${assets.closed.id}`, "repair form, the closed record")
  await page.locator("#repair-record-problem").fill(`${tags.closed} เปลี่ยนคีย์บอร์ด`)
  await page.locator("#repair-record-cost").fill("500")
  await answerRepair(page, { done: true, outcome: "ใช้งานได้", condition: "ดี" })
  const closed = await saveRepairForm(page, measure, "save the closed record with a cost")
  await expect(headerBadge(page)).toHaveText("ซ่อมเสร็จแล้ว")

  // 200 baht, then cancelled with its reason (as ER3 cancels, through the record's menu).
  await measure.visit(`/th/maintenance/new?assetId=${assets.cancelled.id}`, "repair form, the record to cancel")
  await page.locator("#repair-record-problem").fill(`${tags.cancelled} บันทึกผิดเครื่อง`)
  await page.locator("#repair-record-cost").fill("200")
  await answerRepair(page, { done: false })
  const cancelled = await saveRepairForm(page, measure, "save the record to cancel")
  const reason = `${tags.cancelled} เลือกเครื่องผิด`
  await recordMenuItem(await openRecordMenu(page, e2eDevice), "ยกเลิกบันทึก").click()
  const dialog = page.getByRole("dialog", { name: "ยกเลิกบันทึกนี้?" })
  await expect(dialog).toBeVisible()
  await dialog.locator("#repair-cancel-reason").fill(reason)
  const cancelling = page.waitForResponse((response) => response.url().endsWith(`/api/maintenance-tickets/${cancelled.id}`) && response.request().method() === "PATCH")
  await measure.timed("cancel the record with a cost", async () => {
    await dialog.getByRole("button", { name: "ยืนยันยกเลิก", exact: true }).click()
    expect((await cancelling).status()).toBe(200)
  })
  await expect(dialog).toBeHidden()
  await expect(headerBadge(page)).toHaveText("ยกเลิก")

  // The search, typed in the list's search box: three records, one of each status.
  await measure.visit(REPAIR_LIST, "repair list before the search")
  await repairListPanel(page).locator('input[name="search"]').fill(search)
  await repairListPanel(page).locator('input[name="search"]').press("Enter")
  await page.waitForURL((url) => url.pathname === REPAIR_LIST && url.searchParams.get("search") === search)
  await measure.recordPage("repair list, a search over three statuses")
  await expect(listRows(page)).toHaveCount(3)
  for (const [label, n] of [["ทั้งหมด", 3], ["ยังซ่อมไม่เสร็จ", 1], ["ซ่อมเสร็จแล้ว", 1], ["ยกเลิก", 1]] as const) {
    await expect(repairTab(page, label), label).toHaveText(new RegExp(`^${label}\\s*${n}$`))
  }
  await expect(repairTab(page, "ทั้งหมด")).toHaveAttribute("aria-current", "page")

  // The foot (G5P5-R4): the open and the closed record, 1,500.00 baht; the cancelled one is left out and said so.
  const costFoot = page.locator("[data-repair-cost]")
  await expect(costFoot).toContainText("ค่าใช้จ่ายรวม 2 รายการ")
  await expect(page.locator("[data-repair-cost-total]")).toContainText("1,500.00")
  await expect(costFoot).toContainText("ไม่นับ 1 รายการที่ยกเลิก")

  // The status cell's line (G5P5-R6): the open record's day count, the closed one's outcome, the cancel reason.
  await expect(listRow(page, open.id)).toContainText(/(?:ส่ง)?ซ่อมมา 2 วัน/)
  await expect(listRow(page, closed.id)).toContainText("ใช้งานได้")
  await expect(listRow(page, cancelled.id)).toContainText(reason)
  await expect(listRow(page, open.id)).toContainText("1,000.00")

  // ยังซ่อมไม่เสร็จ: the one open record and its own cost; nothing cancelled in it.
  await repairTab(page, "ยังซ่อมไม่เสร็จ").click()
  await page.waitForURL((url) => url.searchParams.get("status") === "in_progress" && url.searchParams.get("search") === search)
  await measure.recordPage("repair list, the search's open tab")
  await expect(listRows(page)).toHaveCount(1)
  await expect(costFoot).toContainText("ค่าใช้จ่ายรวม 1 รายการ")
  await expect(page.locator("[data-repair-cost-total]")).toContainText("1,000.00")
  await expect(costFoot).not.toContainText("ไม่นับ")
  // The tab counts leave the status out: they stay as they were.
  await expect(repairTab(page, "ทั้งหมด")).toHaveText(/^ทั้งหมด\s*3$/)

  // ยกเลิก: the cancelled record only, and no cost line (the foot holds the pager alone).
  await repairTab(page, "ยกเลิก").click()
  await page.waitForURL((url) => url.searchParams.get("status") === "cancelled" && url.searchParams.get("search") === search)
  await measure.recordPage("repair list, the search's cancelled tab")
  await expect(listRows(page)).toHaveCount(1)
  await expect(listRow(page, cancelled.id)).toContainText(reason)
  await expect(page.locator("[data-repair-cost]")).toHaveCount(0)
  await expect(page.getByRole("main")).toContainText("จาก 1 รายการ")

  // The assets follow the records: the open one under repair, the other two Ready.
  expect((await readAsset(page.request, assets.open.id)).status.name).toBe("Under Maintenance")
  expect((await readAsset(page.request, assets.closed.id)).status.name).toBe("Ready")
  expect((await readAsset(page.request, assets.cancelled.id)).status.name).toBe("Ready")
})

// Read only: the dev database's own stuck assets (the controller's ruling (a)). No record is saved on them; a row's
// บันทึกซ่อม is checked by its link alone. Started on ?status=in_progress, so the expanded card shows it keeps the
// list's query (Review Focus 3).
test("the stuck card: its count is the strip's, the cell lands on it, ดูทั้งหมด lists every row and แสดงน้อยลง goes back to 3 (group 5 plan 5, Review Focus 3)", async ({ page, measure }, testInfo) => {
  await measure.visit(`${REPAIR_LIST}?status=in_progress`, "repair list, the open records, for the stuck card")
  const card = page.locator("section#stuck")
  const rows = card.locator("[data-repair-stuck-row]")
  const total = await stripCount(page, "stuck")
  await expect(card.locator('[data-slot="status-badge"]').first()).toHaveText(`${count(total)} ชิ้น`)

  await stripCell(page, "stuck").getByRole("link").click()
  await page.waitForURL((url) => url.pathname === REPAIR_LIST && url.hash === "#stuck")
  await expect(card).toBeInViewport()

  if (total === 0) {
    await expect(card).toContainText("ไม่มีทรัพย์สินค้างสถานะซ่อม")
    await expect(rows).toHaveCount(0)
    testInfo.annotations.push({ type: "stuck card", description: "the dev database has no stuck asset: the empty line was checked, the rows and the expand were not" })
    return
  }

  await expect(rows).toHaveCount(Math.min(total, 3))
  // A row's บันทึกซ่อม opens the form with its asset and comes back to this list (returnTo); only the link is read.
  const first = rows.first()
  const assetHref = (await first.getByRole("link").first().getAttribute("href")) ?? ""
  const assetId = assetHref.match(/^\/th\/assets\/([^/?#]+)/)?.[1]
  expect(assetId, "the row's name links to its asset").toBeTruthy()
  const createHref = (await first.getByRole("link", { name: "บันทึกซ่อม", exact: true }).getAttribute("href")) ?? ""
  const create = new URL(createHref, "http://repair.test")
  expect(create.pathname).toBe("/th/maintenance/new")
  expect(create.searchParams.get("assetId")).toBe(assetId)
  expect(create.searchParams.get("returnTo") ?? "").toMatch(/^\/th\/maintenance\?/)
  expect(create.searchParams.get("returnTo") ?? "").toContain("status=in_progress")

  if (total <= 3) {
    testInfo.annotations.push({ type: "stuck card", description: `the dev database has ${total} stuck assets (3 or fewer): ดูทั้งหมด and แสดงน้อยลง were not checked` })
    return
  }
  // ดูทั้งหมด: every row in the same card, the list's query kept, the anchor landed.
  await card.getByRole("link", { name: `ดูทั้งหมด ${count(total)} ชิ้น`, exact: true }).click()
  await page.waitForURL((url) => url.searchParams.get("stuck") === "all" && url.searchParams.get("status") === "in_progress" && url.hash === "#stuck")
  await measure.recordPage("repair list, the stuck card expanded")
  await expect(rows).toHaveCount(total)
  await expect(card).toContainText(`แสดง ${count(total)} จาก ${count(total)}`)
  await expect(card).toBeInViewport()
  // แสดงน้อยลง: back to 3, the query still kept, the anchor landed.
  await card.getByRole("link", { name: "แสดงน้อยลง", exact: true }).click()
  await page.waitForURL((url) => !url.searchParams.has("stuck") && url.searchParams.get("status") === "in_progress" && url.hash === "#stuck")
  await expect(rows).toHaveCount(3)
  await expect(card).toBeInViewport()
})

test("a PM card row whose asset has an open record links to the record, never บันทึกว่าทำแล้ว (group 5 plan 5, Review Focus 4)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.setTimeout(180_000)
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "L4")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องสำรองไฟ PM เกินกำหนด`, ownershipType: "shared" })
  const plan = await createPlan(page.request, { assetId: asset.id, title: `${tag} ตรวจแบตเตอรี่`, nextDueDate: dayBefore(bangkokToday()) })
  try {
    await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "repair form, the PM plan's asset")
    await page.locator("#repair-record-problem").fill(`${tag} แบตเตอรี่บวม`)
    await answerRepair(page, { done: false })
    const record = await saveRepairForm(page, measure, "save the open record of the PM plan's asset")

    await measure.visit(REPAIR_LIST, "repair list with the overdue plan")
    const card = page.locator("section#pm-due")
    // The card's count is the two PM cells' sum (G5P5-R7).
    const due = (await stripCount(page, "pmOverdue")) + (await stripCount(page, "pmWeek"))
    await expect(card.locator('[data-slot="status-badge"]').first()).toHaveText(`${count(due)} แผน`)
    const row = card.locator(`[data-pm-due-row="${plan.id}"]`)
    const openLink = `มีบันทึกซ่อมที่ยังไม่เสร็จ ${record.repairNo}`
    if ((await row.count()) === 1) {
      await expect(row).toContainText("เกินกำหนด 1 วัน")
      const link = row.getByRole("link", { name: openLink, exact: true })
      await expect(link).toBeVisible()
      const href = new URL((await link.getAttribute("href")) ?? "", "http://repair.test")
      expect(href.pathname).toBe(`/th/maintenance/${record.id}`)
      expect(href.searchParams.get("returnTo") ?? "").toMatch(/^\/th\/maintenance(?:\?|$)/)
      await expect(row.getByRole("link", { name: "บันทึกว่าทำแล้ว", exact: true })).toHaveCount(0)
    } else {
      // The dev database's older overdue plans fill the card's 3 rows: the PM page's row says the same.
      testInfo.annotations.push({ type: "PM card", description: `plan ${plan.planNo} is not among the card's 3 rows (older overdue plans come first); checked on the PM page's row instead` })
      await expect(card.locator("[data-pm-due-row]")).toHaveCount(3)
      const pmRow = await visitPlanRow(page, measure, plan.planNo, "active", "PM plans, the overdue plan with its open record")
      await expect(pmRow.getByRole("link", { name: openLink, exact: true })).toBeVisible()
      await expect(pmRow.getByRole("link", { name: /^บันทึกว่าทำแล้ว/ })).toHaveCount(0)
    }

    // The record is closed, so the run leaves no open record behind.
    await measure.visit(`/th/maintenance/${record.id}`, "the PM plan's asset's open record")
    await completeRecord(page, measure, e2eDevice, record.id, "ใช้งานได้", "close the PM plan's asset's record")
    await expect(headerBadge(page)).toHaveText("ซ่อมเสร็จแล้ว")
  } finally {
    await endPlan(page.request, plan.id)
  }
})

// axe on the list in both themes: the four projects run it light and dark, on the computer and the phone. measure.visit
// runs axe on each page; the expanded stuck card and the ยกเลิก tab (no cost line) are pages of their own.
test("the repair list passes axe (group 5 plan 5)", async ({ page, measure }) => {
  await measure.visit(REPAIR_LIST, "repair list")
  await expect(page.getByRole("heading", { level: 1, name: "ซ่อมบำรุง" })).toBeVisible()
  await measure.visit(`${REPAIR_LIST}?stuck=all#stuck`, "repair list, the stuck card expanded")
  await expect(page.locator("section#stuck")).toBeVisible()
  await measure.visit(`${REPAIR_LIST}?status=cancelled`, "repair list, the ยกเลิก tab")
  await expect(repairTab(page, "ยกเลิก")).toHaveAttribute("aria-current", "page")
})
