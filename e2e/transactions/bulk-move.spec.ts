// Spec §6.1.6 and group 3 spec §10, §11, §17 (plan 4): IT staff add three E2E assets at once on the batch form (spec §7:
// the batch form is exercised too), then ย้ายที่ตั้งหลายรายการ moves them from its server-paged table. Four tests:
// - the batch form, in all four projects: three assets, the table on the desktop and a card per row on the phone. It is
//   the only E2E of the batch form, so it stays on the phone too, where it never opens the bulk-move page (Z12);
// - BM1 (desktop): rows gathered from two filters into one selection (the batch's two, and a held computer with one of
//   its three installed ส่วนควบ, a second one moved alone to the room before, P4-R1), the bar's errors, the review's
//   lines (only the ส่วนควบ that follows is counted, P4-R3), the page that stays with the result line and the refreshed
//   list (P4-R18), the links still installed, and the assets read back with their holder, department and branch;
// - BM2 (desktop): a tick handed over in another tab, named under the table in the row's words, its row read again on
//   the same page with the reason while it stays ticked (P4-R9; final review tests-1), then taken out (P4-R4, P4-R8), the
//   refused row disabled with its reason (P4-R22), the route's named 409 and its cap of 100 (P4-R10);
// - the phone: only the notice and its link, and nothing fetched (P4-R19).
// Not driven here (unit tests and the UAT list): paging with the button-mode Pagination and เลือกทั้งหมดในหน้านี้ up to
// the cap (the run's rooms do not reliably hold more than 25 rows), the category filter, the cross-branch, อยู่ที่ตั้งนี้แล้ว
// and ส่วนควบที่เลือกเอง lines, an inactive room, the 409 ASSET_CHANGED_DURING_OPERATION toast, a failed list with
// ลองอีกครั้ง, and License, written-off and outstanding rows. E2E makes no room, department or employee: the second room
// is the run's own.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { valueBeside } from "../repair/repair-data.ts"
import { projectCode, txAssetName, txAssetTag } from "./tx-plan.ts"
import {
  BULK_MOVE_LIST_PATH,
  bulkMoveListAnswer,
  bulkMoveRow,
  bulkMoveRowBox,
  createTxAsset,
  ensureSecondLocation,
  expectFieldError,
  handoverByApi,
  installComponentByApi,
  pickSearchable,
  readAsset,
  readAssetMasters,
  record,
  saveBulkMove,
  searchBulkMoveList,
  visit,
  visitAssetPage,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"

asUser("itStaff")

const PAGE = "/th/asset-management/bulk-move"
const DESKTOP_ONLY = "ย้ายที่ตั้งหลายรายการ works from the table on the desktop (group 3 spec §10.4)"
const PHONE_ONLY = "the phone shows only the notice (group 3 spec §10.4, §17)"
const BAR = '[data-slot="desktop-selection-bar"]'

// The batch test's three assets, by project, for BM1.
const batches = new Map<string, { id: string; assetTag: string }[]>()

test.describe("the batch form, then one bulk move", () => {
  test.describe.configure({ mode: "serial" })

  test("three assets added on the batch form at once: the shared values once, a tag per row", async ({ page, measure, e2eDevice }, testInfo) => {
    const { runId } = readRunState()
    const data = readRunData()
    const masters = await readAssetMasters(page)
    const tags = [1, 2, 3].map((index) => txAssetTag(runId, testInfo.project.name, `BM${index}`))
    const name = txAssetName(runId, testInfo.project.name, "จอภาพย้ายที่ตั้ง")

    // The batch form: the shared values once, a tag per row (the table on the desktop, a card per row on the phone).
    await visit(measure, "/th/assets/new", "new asset form", testInfo)
    await page.getByRole("group", { name: "วิธีเพิ่มทรัพย์สิน" }).getByRole("button", { name: "เพิ่มเป็นชุด" }).click()
    await page.locator("#asset-batch-name").fill(name)
    await page.locator("#asset-batch-category").selectOption(masters.categoryId)
    await page.locator("#asset-batch-company").selectOption(data.companyId)
    await page.locator("#asset-batch-branch").selectOption(data.branchId)
    await page.locator("#asset-batch-department").selectOption(data.departmentId)
    await page.locator("#asset-batch-current-location").selectOption(data.locationId)
    await page.locator("#asset-batch-status").selectOption(masters.readyStatusId)
    await page.locator("#asset-batch-condition").selectOption(masters.goodConditionId)
    await page.getByRole("button", { name: "เพิ่มแถว" }).click()
    await expect(page.locator("#asset-batch-row-count")).toContainText("รายการตอนนี้ 3 รายการ")
    const view = e2eDevice === "desktop" ? "row" : "card"
    for (const [index, tag] of tags.entries()) await page.locator(`#asset-batch-${view}-${index}-tag`).fill(tag)
    await record(measure, "batch form filled", testInfo)

    await page.getByRole("button", { name: "บันทึกทั้งชุด" }).click()
    await expect(page.getByText("ตรวจสอบก่อนบันทึก").first()).toBeVisible()
    for (const tag of tags) await expect(page.getByRole("main")).toContainText(tag)
    const created = page.waitForResponse((response) => response.url().endsWith("/api/assets/batch") && response.request().method() === "POST")
    await measure.timed("batch save", async () => {
      await page.getByRole("button", { name: "ยืนยันและบันทึกทั้งชุด" }).click()
      await created
    })
    const batch = (await (await created).json()) as { created: number; assetIds: string[]; assets: { id: string; assetTag: string }[] }
    expect(batch.created).toBe(3)
    expect(batch.assets.map((asset) => asset.assetTag).sort()).toEqual([...tags].sort())
    batches.set(testInfo.project.name, batch.assets)
    await expect(page.getByText("สร้างทรัพย์สินเป็นชุดสำเร็จ")).toBeVisible()
    await record(measure, "batch created", testInfo)
  })

  test("BM1: rows from two filters gathered into one selection move together, a held computer's ส่วนควบ counted once, the page stays with the result line and the links stay installed (group 3 spec §10, §11; P4-R1, P4-R3, P4-R12, P4-R17, P4-R18)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const { runId } = readRunState()
    const data = readRunData()
    const receiver = data.employees.receiver1
    const runRoom = runRecords(runId).location
    const room = await ensureSecondLocation()
    const masters = await readAssetMasters(page)
    const [bm1, bm2, bm3] = batches.get(testInfo.project.name) ?? []
    expect(bm3, "the batch test made this project's three assets").toBeDefined()
    // "ครบชุด" in all four names, and in no other spec's asset: filter 2's own word (Z9)
    const parent = await createTxAsset(page, masters, testInfo.project.name, "BMP", "โน้ตบุ๊กครบชุดพร้อมส่วนควบ", { custodianId: receiver.id })
    // c1 ticked with its computer, c2 already in the room, c3 follows (Review Focus 1; P4-R3)
    const c1 = await createTxAsset(page, masters, testInfo.project.name, "BMC1", "เมาส์ส่วนควบครบชุดเลือกเอง", { ownershipType: "component" })
    const c2 = await createTxAsset(page, masters, testInfo.project.name, "BMC2", "อะแดปเตอร์ส่วนควบครบชุดอยู่ห้องปลายทาง", { ownershipType: "component" })
    const c3 = await createTxAsset(page, masters, testInfo.project.name, "BMC3", "คีย์บอร์ดส่วนควบครบชุดย้ายตาม", { ownershipType: "component" })
    await installComponentByApi(page, parent.id, c1.id, "เมาส์", "1")
    await installComponentByApi(page, parent.id, c2.id, "อะแดปเตอร์", "2")
    await installComponentByApi(page, parent.id, c3.id, "คีย์บอร์ด", "3")
    const alone = await page.request.post("/api/assets/bulk-move", { data: { assetIds: [c2.id], toLocationId: room.id, reason: `${runId} ส่วนควบย้ายเดี่ยว`, remark: "" } })
    expect(alone.status()).toBe(200)
    expect(await alone.json(), "an installed ส่วนควบ moves alone (P4-R1)").toMatchObject({ updated: 1, unchanged: 0, componentSync: { updated: 0 } })

    // The first page is the server's (P4-R12); nothing is ticked yet, and the phone's notice is hidden.
    await visit(measure, PAGE, "bulk move, the first page", testInfo)
    await expect(page.getByRole("main")).toContainText(TX_WORDS.bulkNothingSelected)
    await expect(page.getByText(TX_WORDS.bulkDesktopOnlyTitle, { exact: true })).toBeHidden()

    // Filter 1: three words in another order than the name's (spec §11, AND across words) find the batch's three.
    const code = projectCode(testInfo.project.name)
    await searchBulkMoveList(page, `${code} จอภาพย้ายที่ตั้ง ${runId}`)
    await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 3 }))
    for (const asset of [bm1, bm2]) await bulkMoveRowBox(page, asset.assetTag).check()
    const pageBox = page.getByRole("checkbox", { name: TX_WORDS.bulkSelectPage, exact: true })
    await expect(pageBox).toHaveAttribute("aria-checked", "mixed")
    await expect(page.locator(BAR)).toContainText(fillTemplate(TX_WORDS.bulkSelectedCount, { count: 2 }))

    // Filter 2: the run, the project and ครบชุด find the computer and its three ส่วนควบ; the run's first room leaves out
    // the one already moved (an exact room, P4-R21). The ticks of filter 1 stay (P4-R9).
    const words = `${runId} ${code} ครบชุด`
    await searchBulkMoveList(page, words)
    await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 4 }))
    const inRoom = bulkMoveListAnswer(page, { q: words, locationId: data.locationId })
    await pickSearchable(page, "bulk-move-filter-location", runRoom.code, `${runRoom.code} - ${runRoom.name}`)
    expect((await inRoom).status()).toBe(200)
    await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 3 }))
    await expect(bulkMoveRow(page, c2.assetTag)).toHaveCount(0)
    await expect(pageBox).not.toHaveAttribute("aria-checked", "mixed")
    await expect(pageBox).not.toBeChecked()
    // The computer's row: every installed ส่วนควบ travels (P4-R2), and its holder; a ส่วนควบ's row names its computer.
    await expect(bulkMoveRow(page, parent.assetTag)).toContainText(fillTemplate(TX_WORDS.bulkComponentsFollow, { count: 3 }))
    await expect(bulkMoveRow(page, parent.assetTag)).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
    await expect(bulkMoveRow(page, c1.assetTag)).toContainText(fillTemplate(TX_WORDS.bulkComponentOf, { tag: parent.assetTag }))
    for (const asset of [parent, c1]) await bulkMoveRowBox(page, asset.assetTag).check()
    await expect(page.locator(BAR)).toContainText(fillTemplate(TX_WORDS.bulkSelectedCount, { count: 4 }))
    await record(measure, "bulk move, four ticked across two filters", testInfo)

    // A wrong entry first: no room and no reason, under the bar's fields, and no review.
    await page.getByRole("button", { name: fillTemplate(TX_WORDS.bulkReviewAndMove, { count: 4 }), exact: true }).click()
    await expectFieldError(page, "bulk-move-to-location", "กรุณาระบุข้อมูลนี้")
    await expectFieldError(page, "bulk-move-reason", "กรุณาระบุข้อมูลนี้")
    await expect(page.locator("#bulk-move-to-location")).toBeFocused()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await record(measure, "bulk move, the bar's errors", testInfo)
    await pickSearchable(page, "bulk-move-to-location", room.code, `${room.code} - ${room.name}`)
    const reason = `${runId} ย้ายรวมไปห้องปลายทาง`
    await page.locator("#bulk-move-reason").fill(reason)

    // The review (P4-R17): the four tags in the order ticked, the room, the reason, and one ส่วนควบ that follows (c1 is
    // ticked, c2 is already there: P4-R3); the holder and the department stay.
    const saved = await saveBulkMove(page, measure, 4, async (review) => {
      await expect(valueBeside(review, "ทรัพย์สิน")).toHaveText(fillTemplate(TX_WORDS.bulkReviewAssets, { count: 4, tags: [bm1, bm2, parent, c1].map((asset) => asset.assetTag).join(", ") }))
      await expect(valueBeside(review, "ย้ายไป")).toHaveText(`${room.code} - ${room.name}`)
      await expect(valueBeside(review, "เหตุผล")).toHaveText(reason)
      await expect(review).toContainText(fillTemplate(TX_WORDS.bulkComponentsMoved, { count: 1 }))
      await expect(review).toContainText(TX_WORDS.transferKeptBoth)
      for (const absent of [TX_WORDS.bulkAlreadyThere, TX_WORDS.bulkOtherBranch, TX_WORDS.bulkComponentsAlone]) await expect(review).not.toContainText(templatePattern(absent, {}))
      await review.locator("#bulk-move-remark").fill(`${runId} หมายเหตุย้ายรวม`)
      await record(measure, "bulk move review", testInfo)
    })
    expect(saved).toMatchObject({ updated: 4, unchanged: 0, componentSync: { updated: 1, skipped: 0 } })

    // The page stays (P4-R18): the result line, the ticks cleared, and the list fetched again with the same filters.
    await expect(page).toHaveURL(/\/th\/asset-management\/bulk-move(?:[?#]|$)/)
    const result = page.getByRole("status").filter({ hasText: templatePattern(TX_WORDS.bulkResultMoved, { count: "4" }) })
    // the result's {room} is the room's "code - name" (P4-R18; Z20)
    await expect(result).toContainText(`${room.code} - ${room.name}`)
    await expect(result).toContainText(fillTemplate(TX_WORDS.bulkComponentsMoved, { count: 1 }))
    await expect(result).not.toContainText(templatePattern(TX_WORDS.bulkAlreadyThere, {}))
    await expect(page.locator(BAR)).toHaveCount(0)
    await expect(page.getByRole("main")).toContainText(TX_WORDS.bulkNothingSelected)
    await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 0 }))
    await record(measure, "bulk move result line", testInfo)

    // The four now sit in the destination; every link stayed installed, c2's (moved alone) included (P4-R1; Z22)
    const inDestination = bulkMoveListAnswer(page, { q: words, locationId: room.id })
    await pickSearchable(page, "bulk-move-filter-location", room.code, `${room.code} - ${room.name}`)
    expect((await inDestination).status()).toBe(200)
    await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 4 }))
    await expect(bulkMoveRow(page, parent.assetTag)).toContainText(fillTemplate(TX_WORDS.bulkComponentsFollow, { count: 3 }))
    for (const asset of [bm1, bm2, parent, c1, c3]) {
      const after = await readAsset(page, asset.id)
      expect(after.currentLocationId, asset.assetTag).toBe(room.id)
      expect(after.departmentId, asset.assetTag).toBe(data.departmentId)
      expect(after.branchId, asset.assetTag).toBe(data.branchId)
      expect(after.status.name, asset.assetTag).toBe("Ready")
    }
    expect((await readAsset(page, parent.id)).custodianId, "the holder stays (spec §6, §10.2)").toBe(receiver.id)
    expect((await readAsset(page, bm1.id)).custodianId, "no holder is given").toBeNull()
    expect((await readAsset(page, bm3.id)).currentLocationId, "the one not ticked stays").toBe(data.locationId)
    await visitAssetPage(measure, parent.id, "a bulk-moved computer's history", testInfo, "history")
    // asset.movementTypes.bulk_location_move has the page's title words.
    await expect(page.getByRole("main")).toContainText(TX_WORDS.bulkTitle)
    await expect(page.getByRole("main")).toContainText(room.name)
  })
})

test.describe("bulk move: refusals and the phone", () => {
  test("BM2: a tick handed over in another tab is named under the table and taken out, the row then shows disabled with its reason, and the route names it in one 409 and refuses more than 100 (group 3 plan 4 Review Focus 3; P4-R4, P4-R6, P4-R8, P4-R10, P4-R22)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const { runId } = readRunState()
    const data = readRunData()
    const receiver2 = data.employees.receiver2
    const room = await ensureSecondLocation()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "BMO", "โน้ตบุ๊กส่งมอบระหว่างเลือก")

    await visit(measure, PAGE, "bulk move, before the other tab", testInfo)
    await searchBulkMoveList(page, asset.assetTag)
    await bulkMoveRowBox(page, asset.assetTag).check()
    // The other tab: the asset is handed over after the tick.
    await handoverByApi(page, asset.id, receiver2.id, masters.goodConditionId)
    await pickSearchable(page, "bulk-move-to-location", room.code, `${room.code} - ${room.name}`)
    await page.locator("#bulk-move-reason").fill(`${runId} ย้ายหลังส่งมอบในอีกแท็บ`)
    await page.getByRole("button", { name: fillTemplate(TX_WORDS.bulkReviewAndMove, { count: 1 }), exact: true }).click()
    const review = page.getByRole("dialog", { name: TX_WORDS.bulkReviewTitle })
    await expect(review).toBeVisible()
    measure.expectRefusal({ method: "POST", url: /\/api\/assets\/bulk-move$/, status: 409, reason: "handed over in another tab after the tick (group 3 plan 4 Review Focus 3)" })
    const refused = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/assets/bulk-move" && response.request().method() === "POST")
    // The 409 reads the page on screen again (final review journeys-2, tests-1): the wait is set before the click.
    const reread = bulkMoveListAnswer(page, { q: asset.assetTag })
    await review.getByRole("button", { name: TX_WORDS.bulkReviewConfirm, exact: true }).click()
    expect((await refused).status()).toBe(409)
    expect((await reread).status()).toBe(200)

    // The review closes and focus goes to the remove button under the table (Z20); the list names it in the row's words.
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.locator("#bulk-move-selection").getByRole("button", { name: TX_WORDS.bulkRemoveBlocked, exact: true })).toBeFocused()
    await expect(page.getByRole("main")).toContainText(templatePattern(TX_WORDS.bulkBlocked, { count: "1" }))
    await expect(page.getByRole("main")).toContainText(asset.assetTag)
    await expect(page.getByRole("main")).toContainText(TX_WORDS.bulkReasonOpenCheckout)
    // Same page, no fresh visit: the row shows its reason, and its box stays ticked and enabled so it can be unticked (P4-R9).
    await expect(bulkMoveRow(page, asset.assetTag)).toContainText(TX_WORDS.bulkReasonOpenCheckout)
    await expect(bulkMoveRowBox(page, asset.assetTag)).toBeChecked()
    await expect(bulkMoveRowBox(page, asset.assetTag)).toBeEnabled()
    await record(measure, "bulk move, a refused asset named under the table", testInfo)
    await page.getByRole("button", { name: TX_WORDS.bulkRemoveBlocked, exact: true }).click()
    await expect(bulkMoveRowBox(page, asset.assetTag)).not.toBeChecked()
    await expect(bulkMoveRowBox(page, asset.assetTag), "unticked, the refused row locks with its reason").toBeDisabled()
    await expect(page.getByRole("main")).not.toContainText(templatePattern(TX_WORDS.bulkBlocked, {}))

    // A fresh visit: the row is refused, its box disabled with the reason as its description, and its holder shown.
    await visit(measure, PAGE, "bulk move, after the other tab", testInfo)
    await searchBulkMoveList(page, asset.assetTag)
    const box = bulkMoveRowBox(page, asset.assetTag)
    await expect(box).toBeDisabled()
    await expect(box).toHaveAccessibleDescription(TX_WORDS.bulkReasonOpenCheckout)
    await expect(bulkMoveRow(page, asset.assetTag)).toContainText(TX_WORDS.bulkReasonOpenCheckout)
    await expect(bulkMoveRow(page, asset.assetTag)).toContainText(`${receiver2.code} - ${receiver2.fullNameTh}`)
    await record(measure, "bulk move, a row with an open handover", testInfo)

    // The route itself, not a page event (plan 3 TR5): the named 409, and the cap of 100 under assetIds.
    const again = await page.request.post("/api/assets/bulk-move", { data: { assetIds: [asset.id], toLocationId: room.id, reason: `${runId} ย้ายซ้ำผ่าน route`, remark: "" } })
    expect(again.status()).toBe(409)
    expect(await again.json()).toEqual({ code: "ASSET_ACTIVE_CHECKOUT_EXISTS", error: "ASSET_ACTIVE_CHECKOUT_EXISTS", blocked: [{ assetId: asset.id, assetTag: asset.assetTag, code: "ASSET_ACTIVE_CHECKOUT_EXISTS" }] })
    const tooMany = await page.request.post("/api/assets/bulk-move", {
      data: { assetIds: Array.from({ length: 101 }, (_, index) => `${runId}-cap-${index}`), toLocationId: room.id, reason: `${runId} เกินร้อยรายการ`, remark: "" },
    })
    expect(tooMany.status()).toBe(400)
    expect(await tooMany.json()).toEqual({ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { assetIds: "outOfRange" } })
    expect((await readAsset(page, asset.id)).currentLocationId, "nothing moved").toBe(data.locationId)
  })

  test("the phone: only the notice and its link, and no list is fetched (group 3 spec §10.4, §17; P4-R19)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice !== "phone", PHONE_ONLY)
    const asked: string[] = []
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === BULK_MOVE_LIST_PATH) asked.push(request.url())
    })
    await visit(measure, PAGE, "bulk move on the phone, the notice", testInfo)
    await expect(page.getByRole("heading", { level: 1, name: TX_WORDS.bulkTitle })).toBeVisible()
    await expect(page.getByText(TX_WORDS.bulkDesktopOnlyTitle, { exact: true })).toBeVisible()
    await expect(page.getByText(TX_WORDS.bulkDesktopOnlyBody, { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: TX_WORDS.bulkBackToRegister, exact: true })).toHaveAttribute("href", "/th/assets")
    await expect(page.getByRole("table")).toHaveCount(0)
    await expect(page.locator("#bulk-move-search")).toBeHidden()
    expect(asked, "nothing is fetched below md (P4-R19)").toEqual([])
  })
})
