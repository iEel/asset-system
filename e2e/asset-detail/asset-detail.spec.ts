// The asset detail of page group 1 (spec docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md
// §10): (1) the detail's primary and the transactions at the top of "อื่น ๆ" are the register row's next button and the
// top of its ⋯, reasons included; (2) the history's chips filter it, the overview shows the latest 3, and the HO-, RT-
// and TR- links open; (3) the fact strip's cells open the register by custodian (no E2E role holds employee:view) and
// by location, and the round, and "ถือมาแล้ว N วัน" counts from the handover's date; (4) from a register search the
// page shows "k / N" and its links keep returnTo, and opened directly it shows neither; (5) the primary is the header's
// last button on the desktop and sits in the bottom bar on every tab on the phone. Beside them (R43), the files tab and
// the repair tab, axe included, on an asset with a photo and a repair. Every asset is the test's own, made through the
// app's APIs, so the dev data's counts never matter.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { downloadBy, openWorkbook } from "../cross-cutting/support/files.ts"
import { createAssets, createRoom, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { bangkokDate, txAssetTag } from "../transactions/tx-plan.ts"
import { createTxAsset, ensureSecondLocation, expectReachable, handoverByApi, readAssetMasters, record, visit, visitAssetPage } from "../transactions/tx-support.ts"
import { DETAIL_VIEWS, DETAIL_WORDS, PERSONAL_TRANSACTIONS } from "./detail-words.ts"
import {
  allHistoryLink, chipCount, controlNames, currentTab, factCell, historyChip, latestPanel, numberIn, openMoreActions, openRowActions,
  primaryAction, readMenuEntries, recordRepairByApi, registerNext, registerRows, returnByApi, shownDocuments, transactionPrefix,
  transferByApi, uploadPhotoByApi, type Locator,
} from "./detail-steps.ts"

test.describe("IT staff", () => {
  asUser("itStaff")

  test("the detail's primary and the top of อื่น ๆ are the register row's next button and the top of its ⋯, reasons included (spec §10 (1))", async ({ page, measure, e2eDevice }, testInfo) => {
    const receiver = readRunData().employees.receiver1
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "AD1", "โน้ตบุ๊กกฎการดำเนินการ")
    const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)
    // In Use with an open handover: รับคืน is the primary (spec §7.1 rule 1); ส่งมอบ and โอนย้าย wait for it, each with
    // the register's own reason.
    const expected = [
      { label: DETAIL_WORDS.checkout, reason: DETAIL_WORDS.reasonStatusNotReady, available: false },
      { label: DETAIL_WORDS.transfer, reason: DETAIL_WORDS.reasonOpenCheckout, available: false },
    ]
    // Where a link goes: the form, the handover it returns, and the page it comes back to.
    const target = (href: string) => {
      const url = new URL(href, page.url())
      return { path: url.pathname, checkoutId: url.searchParams.get("checkoutId"), back: new URL(url.searchParams.get("returnTo") ?? "/", page.url()).pathname }
    }

    // The register, searched to this one asset: its row's next button (the desktop table has one) and its ⋯.
    await visit(measure, `/th/assets?search=${encodeURIComponent(asset.assetTag)}`, "register, the asset searched", testInfo)
    let registerTarget: ReturnType<typeof target> | null = null
    if (e2eDevice === "desktop") {
      const next = registerNext(page, asset.assetTag)
      await expect(next).toHaveAccessibleName(`${DETAIL_WORDS.checkin} ${asset.assetTag}`)
      registerTarget = target((await next.getAttribute("href")) ?? "")
    }
    const registerMenu = await openRowActions(page, e2eDevice, asset.assetTag)
    const registerTransactions = transactionPrefix(await readMenuEntries(registerMenu), PERSONAL_TRANSACTIONS, DETAIL_WORDS.checkin)
    await record(measure, "register, the row's actions open", testInfo)
    await page.keyboard.press("Escape")

    // The asset's page: the same primary and the same items.
    await visitAssetPage(measure, asset.id, "asset with an open handover", testInfo)
    const primary = primaryAction(page, e2eDevice)
    await expect(primary).toHaveAccessibleName(DETAIL_WORDS.checkin)
    const detailTarget = target((await primary.getAttribute("href")) ?? "")
    const detailMenu = await openMoreActions(page, e2eDevice)
    const detailTransactions = transactionPrefix(await readMenuEntries(detailMenu), PERSONAL_TRANSACTIONS, DETAIL_WORDS.checkin)
    await record(measure, "asset page, อื่น ๆ open", testInfo)

    expect(detailTransactions).toEqual(registerTransactions)
    expect(detailTransactions).toEqual(expected)
    // Both open the return of the same handover, each coming back to the page the person is on (spec §7.1).
    expect(detailTarget).toEqual({ path: "/th/asset-management/checkin", checkoutId: handover.id, back: `/th/assets/${asset.id}` })
    if (registerTarget) expect(registerTarget).toEqual({ path: "/th/asset-management/checkin", checkoutId: handover.id, back: "/th/assets" })
  })

  test("the history's chips filter it, the overview shows the latest 3, and the HO-, RT- and TR- links open (spec §10 (2))", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(180_000)
    const data = readRunData()
    const room = await ensureSecondLocation()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "AD2", "โน้ตบุ๊กประวัติ")
    // Three transactions after the registration, each with its document: a handover, its return and a transfer.
    const handover = await handoverByApi(page, asset.id, data.employees.receiver1.id, masters.goodConditionId)
    const checkin = await returnByApi(page, asset.id, handover.id, data.employees.receiver1, masters)
    const transfer = await transferByApi(page, asset.id, room.id, data.employees.receiver2.id, `${asset.assetTag} ย้ายตามประวัติ`)
    const docs = [
      { chip: DETAIL_WORDS.checkout, code: handover.documentNo, path: `/th/asset-management/checkouts/${handover.id}`, title: DETAIL_WORDS.handoverDocument },
      { chip: DETAIL_WORDS.checkin, code: checkin.documentNo, path: `/th/asset-management/checkins/${checkin.id}`, title: DETAIL_WORDS.returnDocument },
      { chip: DETAIL_WORDS.transfer, code: transfer.documentNo, path: `/th/asset-management/transfers/${transfer.id}`, title: DETAIL_WORDS.transferDocument },
    ]
    const codes = docs.map((doc) => doc.code)
    const main = page.getByRole("main")

    // The overview: ความเคลื่อนไหวล่าสุด holds the latest three events, the three transactions (the registration came
    // first), and its link counts every event.
    await visitAssetPage(measure, asset.id, "asset with three transactions", testInfo)
    const allHistory = allHistoryLink(page).filter({ visible: true }).first()
    const total = numberIn(await allHistory.innerText())
    expect(total, "the registration and the three transactions at least").toBeGreaterThanOrEqual(4)
    expect(await shownDocuments(latestPanel(page), codes)).toEqual(codes)
    await expect(latestPanel(page).locator("tbody tr, li").filter({ visible: true })).toHaveCount(3)

    // The history tab: its count, ทั้งหมด and the overview's link agree, and every document is there.
    await allHistory.click()
    await page.waitForURL((url) => url.pathname === `/th/assets/${asset.id}` && url.searchParams.get("view") === "history")
    await record(measure, "the asset's history", testInfo)
    await expect(currentTab(page)).toContainText(DETAIL_WORDS.historyTab)
    expect(numberIn(await currentTab(page).innerText()), "the tab's count").toBe(total)
    expect(await chipCount(page, DETAIL_WORDS.chipAll), "ทั้งหมด").toBe(total)
    expect(await shownDocuments(main, codes)).toEqual(codes)
    // Chips show only for the categories with events (R17): no disposal here.
    await expect(historyChip(page, DETAIL_WORDS.disposalChip)).toHaveCount(0)
    // Each type's chip shows its own transaction and counts it; choosing one does not navigate (spec §7.6).
    const historyUrl = page.url()
    for (const doc of docs) {
      await historyChip(page, doc.chip).check()
      expect(await chipCount(page, doc.chip), doc.chip).toBe(1)
      expect(await shownDocuments(main, codes), doc.chip).toEqual([doc.code])
      expect(page.url(), "choosing a chip does not navigate").toBe(historyUrl)
    }
    await historyChip(page, DETAIL_WORDS.chipAll).check()
    expect(await shownDocuments(main, codes)).toEqual(codes)
    // The desktop offers the Excel export of every event in the page's language (asset:view, R15): one sheet, a header
    // row of 6 columns, then one row per event. The phone has no export (R17).
    const exportLink = main.getByRole("link", { name: DETAIL_WORDS.exportExcel, exact: true }).filter({ visible: true })
    if (e2eDevice === "desktop") {
      const href = new URL((await exportLink.getAttribute("href")) ?? "", page.url())
      expect([href.pathname, href.searchParams.get("locale")], "the export of this asset, in Thai").toEqual([`/api/assets/${asset.id}/history/export`, "th"])
      const { bytes } = await downloadBy(page, () => exportLink.click(), "asset-history", (name) => testInfo.outputPath(name))
      const [sheet] = Object.values(await openWorkbook(bytes))
      expect(sheet[0], "the export's 6 columns").toHaveLength(6)
      expect(sheet.length - 1, "every event").toBe(total)
    } else {
      await expect(exportLink).toHaveCount(0)
    }
    // Each document opens from its event (the document column on the desktop, the event's card on the phone).
    for (const doc of docs) {
      await visitAssetPage(measure, asset.id, `the asset's history, to its ${doc.chip}`, testInfo, "history")
      await main.getByRole("link", { name: doc.code }).filter({ visible: true }).first().click()
      await page.waitForURL((url) => url.pathname === doc.path)
      await expect(page.getByRole("heading", { level: 1, name: doc.title })).toBeVisible()
      await expect(page.getByText(doc.code, { exact: true }).first()).toBeVisible()
      await record(measure, `${doc.chip}: its document from the history`, testInfo)
    }
    // ?type= chooses the first chip, and an old link still opens the history (spec §7.3, §7.6).
    await visit(measure, `/th/assets/${asset.id}?view=history&type=transfer`, "the asset's history, its transfers", testInfo)
    await expect(historyChip(page, DETAIL_WORDS.transfer)).toBeChecked()
    expect(await shownDocuments(main, codes)).toEqual([transfer.documentNo])
    await visit(measure, `/th/assets/${asset.id}?view=operations`, "the asset's history from an old link", testInfo)
    await expect(currentTab(page)).toContainText(DETAIL_WORDS.historyTab)
  })

  test("from a register search the page shows k / N and its links keep returnTo; opened directly it shows neither (spec §10 (4))", async ({ page, measure, e2eDevice }, testInfo) => {
    const { runId } = readRunState()
    const masters = await readAssetMasters(page)
    for (const key of ["NAV1", "NAV2", "NAV3"]) await createTxAsset(page, masters, testInfo.project.name, key, "โน้ตบุ๊กก่อนหน้าถัดไป")
    // The tag rule applied to "NAV" is the three tags' common start: the search finds them and nothing else.
    const search = txAssetTag(runId, testInfo.project.name, "NAV")
    await visit(measure, `/th/assets?search=${encodeURIComponent(search)}`, "register, three assets searched", testInfo)
    const rows = await registerRows(page)
    expect(rows).toHaveLength(3)
    const returnTo = new URL(rows[0].href, page.url()).searchParams.get("returnTo") ?? ""
    expect(new URL(returnTo, page.url()).searchParams.get("search")).toBe(search)
    const main = page.getByRole("main")
    const crumbs = page.getByRole("navigation", { name: DETAIL_WORDS.breadcrumb })
    const searchCrumb = fillTemplate(DETAIL_WORDS.searchCrumb, { search })
    const previous = main.getByRole("link", { name: DETAIL_WORDS.previous, exact: true }).filter({ visible: true })
    const next = main.getByRole("link", { name: DETAIL_WORDS.next, exact: true }).filter({ visible: true })
    // A neighbour's link opens that asset and keeps the search.
    const opens = async (link: Locator, id: string) => {
      const url = new URL((await link.getAttribute("href")) ?? "", page.url())
      expect([url.pathname, url.searchParams.get("returnTo")], "the neighbour, with the search kept").toEqual([`/th/assets/${id}`, returnTo])
    }

    // The first, as the register opens it: 1 / 3, a next link and no previous one; the search's crumb (text, not a
    // link: the register's crumb already goes back, R10) and the back link to it (spec §7.2, R33).
    await visit(measure, rows[0].href, "the first asset of the search", testInfo)
    await expect(main).toContainText("1 / 3")
    await expect(previous).toHaveCount(0)
    await opens(next, rows[1].id)
    await expect(crumbs).toContainText(searchCrumb)
    await expect(crumbs.getByRole("link", { name: searchCrumb })).toHaveCount(0)
    await expect(crumbs.getByRole("link", { name: DETAIL_WORDS.register, exact: true })).toHaveAttribute("href", returnTo)
    await expect(main.getByRole("link", { name: DETAIL_WORDS.backToResults })).toHaveAttribute("href", returnTo)
    // The second, by the next link: next on both widths, previous on the desktop (the phone shows next only, §7.8).
    await next.click()
    await page.waitForURL((url) => url.pathname === `/th/assets/${rows[1].id}`)
    await record(measure, "the second asset of the search", testInfo)
    await expect(main).toContainText("2 / 3")
    if (e2eDevice === "desktop") await opens(previous, rows[0].id)
    await opens(next, rows[2].id)
    // The last: no next link.
    await next.click()
    await page.waitForURL((url) => url.pathname === `/th/assets/${rows[2].id}`)
    await record(measure, "the last asset of the search", testInfo)
    await expect(main).toContainText("3 / 3")
    await expect(next).toHaveCount(0)
    // Opened directly: no counter, no neighbours, no middle crumb.
    await visitAssetPage(measure, rows[0].id, "the first asset opened directly", testInfo)
    await expect(main).not.toContainText("1 / 3")
    await expect(previous).toHaveCount(0)
    await expect(next).toHaveCount(0)
    await expect(crumbs).not.toContainText(searchCrumb)
    await expect(crumbs).not.toContainText(DETAIL_WORDS.filtersCrumb)
  })

  test("the primary is the header's last button on the desktop, and on the phone it sits in the bottom bar on every tab, after สแกนรายการถัดไป from the scan page (spec §10 (5))", async ({ page, measure, e2eDevice }, testInfo) => {
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "AD5", "โน้ตบุ๊กแถบล่าง")
    const bar = page.locator('[data-slot="action-bar"]')
    await visitAssetPage(measure, asset.id, "a Ready asset", testInfo)
    if (e2eDevice === "desktop") {
      // DESIGN order (spec §7.2): back, อื่น ๆ, the pinned พิมพ์ป้าย and บันทึกซ่อม, the primary last; no bottom bar.
      expect(await controlNames(page.locator('[data-slot="page-header-actions"]'))).toEqual([DETAIL_WORDS.back, DETAIL_WORDS.more, DETAIL_WORDS.printLabel, DETAIL_WORDS.recordRepair, DETAIL_WORDS.checkout])
      await expect(bar).toBeHidden()
      return
    }
    // The phone, on every tab: exactly the primary first and wide, the pinned บันทึกซ่อม, then การดำเนินการอื่น (spec
    // §7.8, R21).
    for (const view of DETAIL_VIEWS) {
      if (view !== "overview") await visitAssetPage(measure, asset.id, `a Ready asset, ${view}`, testInfo, view)
      expect(await controlNames(bar), view).toEqual([DETAIL_WORDS.checkout, DETAIL_WORDS.recordRepair, DETAIL_WORDS.moreActions])
      await expectReachable(primaryAction(page, "phone"))
    }
    // The header's buttons are hidden on the phone, so แก้ไข and พิมพ์ป้าย end the bar's sheet, in the order
    // buildAssetDetailMoreGroups gives them (Task 8B, R21).
    const sheetItems = (await readMenuEntries(await openMoreActions(page, "phone"))).map((entry) => entry.label)
    expect(sheetItems.slice(-2)).toEqual([DETAIL_WORDS.edit, DETAIL_WORDS.printLabel])
    await page.keyboard.press("Escape")
    // From the scan page exactly the next scan (wide), the rule's primary, then การดำเนินการอื่น; บันทึกซ่อม moves into
    // the sheet (spec §7.8, today's field flow, R21).
    await visit(measure, `/th/assets/${asset.id}?returnTo=${encodeURIComponent("/th/asset-management/scan")}`, "a Ready asset from the scan page", testInfo)
    expect(await controlNames(bar)).toEqual([DETAIL_WORDS.scanNext, DETAIL_WORDS.checkout, DETAIL_WORDS.moreActions])
    await expect(bar.getByRole("link", { name: DETAIL_WORDS.scanNext })).toHaveAttribute("href", /^\/th\/asset-management\/scan(?:[?#]|$)/)
    await expect(page.getByRole("main").getByRole("link", { name: DETAIL_WORDS.backToScan })).toBeVisible()
  })

  // R43: no step of §10 opens these two tabs with content, so each is visited once, axe included (tx-support's visit),
  // in all four projects, on an asset of the test's own with a photo and a repair.
  test("the files tab and the repair tab pass the page checks on an asset with a photo and a repair (group 1 asset detail)", async ({ page, measure }, testInfo) => {
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "AD6", "โน้ตบุ๊กไฟล์และงานซ่อม")
    await uploadPhotoByApi(page, asset.id)
    const repair = await recordRepairByApi(page, asset.id, readRunData().employees.itStaff.id, `${asset.assetTag} จอกะพริบ`)
    const main = page.getByRole("main")

    // ไฟล์: the photo is a tile from the thumbnail route, and it loads.
    await visitAssetPage(measure, asset.id, "asset files with a photo", testInfo, "files")
    const tile = main.locator('img[src*="/api/attachments/"][src*="/thumbnail"]').filter({ visible: true }).first()
    await expect(tile).toBeVisible()
    expect(await tile.evaluate((image) => (image as HTMLImageElement).naturalWidth), "the tile loads").toBeGreaterThan(0)

    // ซ่อม / PM: the repair's row, its number shown.
    await visitAssetPage(measure, asset.id, "asset repairs with a repair", testInfo, "maintenance")
    await expect(main.getByText(repair.repairNo, { exact: true }).filter({ visible: true }).first()).toBeVisible()
  })
})

test.describe("the IT head", () => {
  asUser("itHead")

  // The IT head, because the round this test opens is cancelled at the end, which needs audit:approve.
  test("the fact strip's cells open the register by custodian and by location and the round, and ถือมาแล้ว counts from the handover's date (spec §10 (3))", async ({ page, measure }, testInfo) => {
    test.setTimeout(180_000)
    const receiver = readRunData().employees.receiver1
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "ADF")
    // A room of the test's own, so the round below reaches this asset alone and the register by location lists it alone.
    const roomName = `${prefix} ห้องทดสอบหน้ารายละเอียด`
    const roomId = await createRoom(`${prefix}-ROOM`, roomName)
    const [asset] = await createAssets(page, choices, roomId, [`${prefix}-1`])
    // Handed over 46 days ago: the custodian's cell counts the Bangkok days from the handover's own date.
    const handedOverOn = bangkokDate(-46)
    await handoverByApi(page, asset.id, receiver.id, choices.conditionId, handedOverOn)
    const heldDays = Math.round((Date.parse(bangkokDate()) - Date.parse(handedOverOn)) / 86_400_000)
    // A round over the room, due in a week (the dashboard's one-day round, due today, still wins its pick): the asset
    // waits in it.
    const opened = await page.request.post("/api/audit-rounds", {
      data: {
        name: `${prefix} รอบทดสอบหน้ารายละเอียด`,
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
        endDate: bangkokDate(7),
        status: "open",
      },
    })
    expect(opened.status(), await opened.text()).toBe(201)
    const round = (await opened.json()) as { id: string; auditNo: string }
    try {
      await visitAssetPage(measure, asset.id, "asset with its fact strip", testInfo)
      const custodian = factCell(page, DETAIL_WORDS.custodianCell)
      await expect(custodian).toContainText(receiver.fullNameTh)
      await expect(custodian).toContainText(fillTemplate(DETAIL_WORDS.heldDays, { days: heldDays }))
      // ประกัน: no warranty date, and the IT head (asset:edit) is offered the edit form's purchase section.
      const warranty = factCell(page, DETAIL_WORDS.warrantyCell)
      await expect(warranty).toContainText(DETAIL_WORDS.warrantyUnknown)
      const purchase = new URL((await warranty.getByRole("link", { name: DETAIL_WORDS.addPurchase }).getAttribute("href")) ?? "", page.url())
      expect([purchase.pathname, purchase.hash.length > 1], "the edit form, at its purchase section").toEqual([`/th/assets/${asset.id}/edit`, true])
      // ตรวจนับล่าสุด: waiting in the round (the pending state wins, R35), whose code is the link that opens it.
      const audit = factCell(page, DETAIL_WORDS.auditCell)
      await expect(audit).toContainText(DETAIL_WORDS.auditPending)
      await audit.getByRole("link", { name: round.auditNo, exact: true }).click()
      await page.waitForURL((url) => url.pathname === `/th/audit/rounds/${round.id}`)
      await record(measure, "the round from the fact strip", testInfo)
      await expect(page.getByRole("main")).toContainText(round.auditNo)

      // ที่ตั้ง: the register by the asset's location, with its chip, holds the room's one asset. The link is exact
      // (`exact=1`), so the register's remembered view never adds to it (R9).
      await visitAssetPage(measure, asset.id, "asset, to its location", testInfo)
      await factCell(page, DETAIL_WORDS.locationCell).getByRole("link", { name: roomName }).click()
      await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("locationId") === roomId && url.searchParams.get("exact") === "1")
      await record(measure, "the register by the asset's location", testInfo)
      await expect(page.getByRole("group", { name: DETAIL_WORDS.activeFilters }).filter({ visible: true })).toContainText(`${DETAIL_WORDS.locationCell}: ${prefix}-ROOM - ${roomName}`)
      await expect(page.getByRole("main")).toContainText("จาก 1 รายการ")
      await expect(page.getByRole("main").getByText(asset.assetTag, { exact: true }).filter({ visible: true }).first()).toBeVisible()

      // ผู้ถือครอง: without employee:view the name opens the register by custodian, with its chip.
      await visitAssetPage(measure, asset.id, "asset, to its custodian", testInfo)
      await custodian.getByRole("link", { name: receiver.fullNameTh }).click()
      await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("custodianId") === receiver.id && url.searchParams.get("exact") === "1")
      await record(measure, "the register by the asset's custodian", testInfo)
      await expect(page.getByRole("group", { name: DETAIL_WORDS.activeFilters }).filter({ visible: true })).toContainText(receiver.fullNameTh)
    } finally {
      const cancelled = await page.request.patch(`/api/audit-rounds/${round.id}`, { data: { action: "cancel", reason: `${prefix} ปิดรอบทดสอบหน้ารายละเอียด` } })
      expect(cancelled.ok(), await cancelled.text()).toBe(true)
    }
  })
})
