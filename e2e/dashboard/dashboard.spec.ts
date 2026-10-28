// The dashboard of page group 1 (spec docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md
// §10): (a) every งานที่รอคุณ row equals the bell's row of the same kind, and each count opens a list with the same
// total, (b) the order follows the person's work, (c) a KPI, a status row and (on the desktop) a status segment open the
// register with the same count and its chip, and a cell's filter note is its description and shows on keyboard focus,
// (d) a round the test opens shows its pace from its own dates, (e) the cross-scope number appears once.
// The dev database is a copy of Production whose counts move, so every step compares two surfaces, never a number.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import { createAssets, createRoom, escapeRegExp, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { saveRepairForm } from "../repair/repair-data.ts"
import { createPendingDisposal, itStaffApi } from "../shell/shell-steps.ts"
import { templatePattern } from "../shell/shell-words.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { recordSettled } from "../audit/settle.ts"
import { DASHBOARD_WORDS, SECTION_ORDER } from "./dashboard-words.ts"
import { bellRows, byWaitingOrder, countIn, expectedPace, FINDING_TABS, kpiCell, kpiLabels, LIST_TOTAL, section, sectionOrder, waitingHref, waitingRows } from "./dashboard-steps.ts"
import { currentFindingTab } from "../audit/review-steps.ts"

test.describe("the IT head", () => {
  asUser("itHead")

  test("each waiting row equals the bell's row of the same kind and opens a list with the same total, approvals come first, and the work order leads (spec §10 a, b)", async ({ page, measure }, testInfo) => {
    test.setTimeout(180_000)
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "DASH")
    const roomId = await createRoom(`${prefix}-ROOM`, `${prefix} ห้องทดสอบแดชบอร์ด`)
    const staff = await itStaffApi()
    try {
      // IT staff ask for a disposal: the IT head has approval work, as in the bell test.
      await createPendingDisposal(staff, choices, roomId, `${prefix}-1`)
    } finally {
      await staff.dispose()
    }

    await measure.visit("/th/dashboard", "IT head: dashboard")
    const rows = await waitingRows(page)
    expect(rows[0]?.key, "an approver's first row").toBe("approvalInbox")
    expect(rows.map((row) => row.key), "the shared order").toEqual(rows.map((row) => row.key).sort(byWaitingOrder))
    // (a) The bell lists the same kinds with the same counts.
    expect(await bellRows(page)).toEqual(rows)
    await recordSettled(page, measure, "IT head: the bell box over the dashboard")
    await page.keyboard.press("Escape")
    // The KPI is the rows' sum.
    const sum = rows.reduce((total, row) => total + Number(row.count.replaceAll(",", "")), 0)
    expect(Number((await countIn(kpiCell(page, DASHBOARD_WORDS.waitingTitle).locator("dd").first())).replaceAll(",", ""))).toBe(sum)

    // (b) The work order: งานที่รอคุณ, the round, then the totals; the sections the same way.
    const labels = await kpiLabels(page)
    expect(labels[0]).toBe(DASHBOARD_WORDS.waitingTitle)
    expect(labels[1]).toMatch(/^รอบตรวจนับ/)
    expect(labels.slice(2)).toEqual([DASHBOARD_WORDS.totalAssets, DASHBOARD_WORDS.custodianAssigned])
    expect(await sectionOrder(page)).toEqual(SECTION_ORDER.work)
    // The IT head holds dashboard:view: the section offers the work center.
    await expect(section(page, "waiting").getByRole("link", { name: DASHBOARD_WORDS.openWorkCenter }).filter({ visible: true })).toHaveCount(1)

    // (a) Each count opens a list that shows the same total (spec §6.3): the approvals row always (the test's pending
    // disposal is in it), then every other visible row whose list shows its total on screen (LIST_TOTAL). The links are
    // read on the dashboard first, then followed one by one.
    const lists: { key: string; count: string; total: "approvals" | "range"; href: string }[] = []
    for (const row of rows) {
      const total = LIST_TOTAL[row.key]
      if (total) lists.push({ key: row.key, count: row.count, total, href: await waitingHref(page, row.key) })
    }
    const followed: string[] = []
    for (const list of lists) {
      await measure.visit(list.href, `IT head: the list of ${list.key}`)
      if (list.total === "approvals") {
        expect(await countIn(kpiCell(page, new RegExp(`^${DASHBOARD_WORDS.approvalsTotal}$`)).locator("dd").first()), list.key).toBe(list.count)
      } else {
        await expect(page.getByRole("main"), list.key).toContainText(`จาก ${list.count} รายการ`)
        // Group 2 plan 4 (P4-R3): a findings link lands on its tab.
        const tab = FINDING_TABS[list.key]
        if (tab) await expect(currentFindingTab(page), list.key).toHaveText(new RegExp(`^${escapeRegExp(tab)}`))
      }
      followed.push(list.key)
    }
    expect(followed, "the approvals row is always followed").toContain("approvalInbox")
  })

  test("a round the IT head opens shows its pace mark from its own dates (spec §10 d)", async ({ page, measure }, testInfo) => {
    test.setTimeout(180_000)
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "DASHR")
    const roomId = await createRoom(`${prefix}-ROOM`, `${prefix} ห้องทดสอบรอบแดชบอร์ด`)
    await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])
    // A one-day round, today in Bangkok: its pace is 100% from its start, and nothing is counted yet. In its dates and
    // due today, no round in progress is due earlier and none started later, so the pick (R15) shows it. A tie on both
    // dates goes to the lower code: only an open round left with the same two dates can win it, such as the one-day
    // round of e2e/disposal/open-audit-block.spec.ts when that test fails before its cancel.
    const opened = await page.request.post("/api/audit-rounds", {
      data: {
        name: `${prefix} รอบทดสอบแดชบอร์ด`,
        auditYear: Number(bangkokDate().slice(0, 4)),
        scopeCompanyId: null,
        scopeBranchId: null,
        scopeDepartmentId: null,
        scopeLocationId: roomId,
        scopeCategoryId: null,
        scopeCustodianId: null,
        scopeStatusId: null,
        scopeConditionId: null,
        includeClosedAssets: false,
        riskPreset: "all",
        sampleRate: 100,
        startDate: bangkokDate(),
        endDate: bangkokDate(),
        status: "open",
      },
    })
    expect(opened.status(), await opened.text()).toBe(201)
    const round = (await opened.json()) as { id: string; auditNo: string }
    try {
      await measure.visit("/th/dashboard", "IT head: dashboard with an open round")
      const roundCell = kpiCell(page, /^รอบตรวจนับ /)
      const href = (await roundCell.getByRole("link").first().getAttribute("href")) ?? ""
      // The KPI opens the round's item list (/th/audit/rounds/<id>?…#audit-result-list): the id is the path's last part.
      const shownId = new URL(href, page.url()).pathname.split("/").pop() ?? ""
      const shown = (await (await page.request.get(`/api/audit-rounds/${shownId}`)).json()) as { auditNo: string; startDate: string; endDate: string }
      // The pick (spec §6.4, R15) shows the test's own round. If not, the test fails and names the round that won.
      expect(
        shown.auditNo,
        `the dashboard shows ${shown.auditNo} (${shown.startDate.slice(0, 10)} to ${shown.endDate.slice(0, 10)}), not the test's ${round.auditNo}: an open round due today that started today has a lower code, so it wins the tie (R15)`,
      ).toBe(round.auditNo)
      // The round's own dates give the pace the cell shows: one day, so 100%.
      const pace = expectedPace(shown.startDate, shown.endDate, bangkokDate())
      expect(pace).toBe("100%")
      await expect(roundCell).toContainText(`ควรถึง ${pace}`)
      // Its one branch has counted nothing, so it is behind the pace, with the words, not the colour alone.
      const branches = section(page, "branches")
      await expect(branches.getByRole("img", { name: templatePattern(DASHBOARD_WORDS.branchBarLabel, { branch: ".+", percent: "0%", pace: "100%" }) })).toHaveCount(1)
      await expect(branches.getByText(DASHBOARD_WORDS.branchBehind, { exact: true })).toBeVisible()
    } finally {
      const cancelled = await page.request.patch(`/api/audit-rounds/${round.id}`, { data: { action: "cancel", reason: `${prefix} ปิดรอบทดสอบแดชบอร์ด` } })
      expect(cancelled.ok(), await cancelled.text()).toBe(true)
    }
  })
})

test.describe("IT staff", () => {
  asUser("itStaff")

  test("IT staff see their work first: a repair row leads, no approvals row, the shared order, no work-center link (spec §10 b)", async ({ page, measure }, testInfo) => {
    test.setTimeout(180_000)
    // IT staff record an unfinished repair of one of the test's own assets (maintenance:create; not a hazard), through
    // the repair form as the repair spec's ER3 does, so they have a repair row whatever the dev data holds.
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "DASHS")
    const roomId = await createRoom(`${prefix}-ROOM`, `${prefix} ห้องทดสอบงานซ่อมแดชบอร์ด`)
    const [asset] = await createAssets(page, choices, roomId, [`${prefix}-A1`])
    await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "IT staff: repair form for the test's asset")
    await page.locator("#repair-record-problem").fill(`${prefix} ทดสอบแถวงานซ่อมบนแดชบอร์ด`)
    await page.getByRole("radio", { name: DASHBOARD_WORDS.repairNotDone }).check()
    const record = await saveRepairForm(page, measure, "IT staff: save an unfinished repair")
    expect(record.repairStatus).toBe("in_progress")

    await measure.visit("/th/dashboard", "IT staff: dashboard")
    const keys = (await waitingRows(page)).map((row) => row.key)
    // IT staff hold no approval, and openRepairs is the first kind after approvalInbox in the shared order: with the
    // record above it counts at least 1, so it is the first row whatever else the dev data holds.
    expect(keys[0], "IT staff's first row: the repair they just recorded").toBe("openRepairs")
    expect(keys).not.toContain("approvalInbox")
    expect(keys).toEqual([...keys].sort(byWaitingOrder))
    expect((await kpiLabels(page))[0]).toBe(DASHBOARD_WORDS.waitingTitle)
    expect(await sectionOrder(page)).toEqual(SECTION_ORDER.work)
    // No dashboard:view: no link to the work center (spec §6.3).
    await expect(page.getByRole("main").getByRole("link", { name: DASHBOARD_WORDS.openWorkCenter })).toHaveCount(0)
  })
})

test.describe("the viewer", () => {
  asUser("viewer")

  test("the viewer reads the totals first; a KPI, a status row and a status segment open the register with the same count and chip; the cross-scope number appears once (spec §10 b, c, e)", async ({ page, measure, e2eDevice }) => {
    await measure.visit("/th/dashboard", "viewer: dashboard")
    // (b) The overview order.
    const labels = await kpiLabels(page)
    expect(labels.slice(0, 2)).toEqual([DASHBOARD_WORDS.totalAssets, DASHBOARD_WORDS.custodianAssigned])
    expect(labels[2]).toMatch(/^รอบตรวจนับ/)
    expect((await sectionOrder(page)).slice(0, 2)).toEqual(SECTION_ORDER.overview.slice(0, 2))
    // ล่าสุด is on the desktop only.
    if (e2eDevice === "desktop") await expect(section(page, "recent")).toBeVisible()
    else await expect(section(page, "recent")).toBeHidden()

    // (e) The cross-scope number appears once, as an exact register link.
    const crossScope = page.getByRole("main").locator('a[href*="crossScope="]')
    await expect(crossScope).toHaveCount(1)
    await expect(crossScope).toHaveAttribute("href", /crossScope=all&exact=1$/)

    // (c) The custodian KPI names its filter, and opens the register with the same count and its chip.
    const custodian = kpiCell(page, DASHBOARD_WORDS.custodianAssigned)
    const custodianLink = custodian.getByRole("link", { name: DASHBOARD_WORDS.custodianAssigned, exact: true })
    await expect(custodianLink).toHaveAccessibleDescription(DASHBOARD_WORDS.noteCustodian)
    // On keyboard focus the note shows (Task 6's :focus-visible), on every project, before any mouse move: the link is
    // focused, then Shift+Tab and Tab come back to it, so the browser treats the focus as the keyboard's.
    const custodianNote = custodian.getByText(DASHBOARD_WORDS.noteCustodian, { exact: true })
    await custodianLink.focus()
    await page.keyboard.press("Shift+Tab")
    await page.keyboard.press("Tab")
    await expect(custodianLink).toBeFocused()
    await expect(custodianNote).toBeVisible()
    await custodianLink.blur()
    await expect(custodianNote).toBeHidden()
    // On the desktop the note also shows on hover.
    if (e2eDevice === "desktop") {
      await custodian.hover()
      await expect(custodianNote).toBeVisible()
    }
    const custodianCount = await countIn(custodian.locator("dd").first())
    await custodianLink.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("custodianState") === "assigned" && url.searchParams.get("exact") === "1")
    await measure.recordPage("viewer: the register from the custodian KPI")
    await expect(page.getByRole("main")).toContainText(`จาก ${custodianCount} รายการ`)
    await expect(page.getByRole("group", { name: DASHBOARD_WORDS.activeFilters }).getByRole("link", { name: new RegExp(DASHBOARD_WORDS.custodianAssigned) })).toBeVisible()

    // The register opened for one status: the same count, its tab current or its chip.
    const expectStatusList = async (statusName: string, statusCount: string) => {
      await expect(page.getByRole("main")).toContainText(`จาก ${statusCount} รายการ`)
      const statusChip = page.getByRole("group", { name: DASHBOARD_WORDS.activeFilters }).getByRole("link", { name: new RegExp(escapeRegExp(statusName)) })
      const statusTab = page.getByRole("main").locator('a[aria-current="page"]').filter({ hasText: statusName })
      await expect(statusChip.or(statusTab).filter({ visible: true }).first()).toBeVisible()
    }

    // A status row opens its status exactly, on both widths (the phone's way to a status's list).
    await measure.visit("/th/dashboard", "viewer: dashboard, for a status row")
    const statusRow = section(page, "status").getByRole("row").last()
    const statusLink = statusRow.getByRole("link")
    const statusName = (await statusLink.innerText()).trim()
    const statusCount = (await statusRow.getByRole("cell").nth(1).innerText()).trim()
    await statusLink.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && Boolean(url.searchParams.get("statusId")) && url.searchParams.get("exact") === "1")
    await measure.recordPage("viewer: the register from a status row")
    await expectStatusList(statusName, statusCount)

    // On the desktop a segment of the status bar opens its status exactly too (spec §2 decision 3, R17): the count of
    // the table row with the same link, and its chip or tab. The bar is aria-hidden and its links are out of the tab
    // order, so the step finds the segment by its data attribute, as a pointer user clicks it.
    if (e2eDevice === "desktop") {
      await measure.visit("/th/dashboard", "viewer: dashboard, for a status segment")
      const segment = section(page, "status").locator("[data-status-segment]").first()
      const segmentStatusId = (await segment.getAttribute("data-status-segment")) ?? ""
      const segmentHref = (await segment.getAttribute("href")) ?? ""
      const segmentRow = section(page, "status").getByRole("row").filter({ has: page.locator(`a[href="${segmentHref}"]`) })
      const segmentName = (await segmentRow.getByRole("link").innerText()).trim()
      const segmentCount = (await segmentRow.getByRole("cell").nth(1).innerText()).trim()
      await segment.click()
      await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("statusId") === segmentStatusId && url.searchParams.get("exact") === "1")
      await measure.recordPage("viewer: the register from a status segment")
      await expectStatusList(segmentName, segmentCount)
    }

    // One company: the links on the desktop, a removable chip on the phone; the total opens the register for it.
    const { companyId } = readRunData()
    if (e2eDevice === "desktop") {
      // The switcher is on the dashboard; the steps above left the page on the register.
      await measure.visit("/th/dashboard", "viewer: dashboard, for one company")
      const switcher = page.getByRole("navigation", { name: DASHBOARD_WORDS.scopeNavigation })
      await switcher.locator(`a[href$="companyId=${companyId}"]`).click()
      await page.waitForURL((url) => url.searchParams.get("companyId") === companyId)
      await expect(switcher.locator(`a[href$="companyId=${companyId}"]`)).toHaveAttribute("aria-current", "page")
      await measure.recordPage("viewer: the dashboard for one company")
    } else {
      await measure.visit(`/th/dashboard?companyId=${companyId}`, "viewer: the dashboard for one company")
      await expect(page.getByRole("group", { name: DASHBOARD_WORDS.scopeNavigation }).getByRole("link")).toHaveAttribute("href", "/th/dashboard")
    }
    const total = kpiCell(page, DASHBOARD_WORDS.totalAssets)
    const totalLink = total.getByRole("link", { name: DASHBOARD_WORDS.totalAssets, exact: true })
    await expect(totalLink).toHaveAttribute("href", new RegExp(`companyId=${companyId}`))
    const companyTotal = await countIn(total.locator("dd").first())
    await totalLink.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("companyId") === companyId)
    await measure.recordPage("viewer: the register for one company")
    await expect(page.getByRole("main")).toContainText(`จาก ${companyTotal} รายการ`)
    // The company chip shows on both widths (spec §6.5).
    await expect(page.getByRole("group", { name: DASHBOARD_WORDS.activeFilters }).filter({ visible: true }).getByRole("link")).not.toHaveCount(0)
  })
})
