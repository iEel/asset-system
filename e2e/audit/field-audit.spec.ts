// The field audit walk and its review (spec §6.2, the user's second worry), in all four projects, the phone on WebKit
// (spec §8). One serial chain per project, on that project's own records (e2e/audit/audit-plan.ts); each block is one
// person's part:
// 1. IT staff open the round of the project's department on the round form, after it shows its errors under the
//    fields (spec §6.2.1, §6.7): no status choice, the department as a condition chip, the live count equal to the
//    round's items, the round open at once (group 2 spec §7, §14, §16);
// 2. IT staff walk room A by typing names and tags, from the round page's "เดินตรวจต่อ" (group 2 spec §8): the switch
//    and the category chips within the room and the tab, cleared on a room change, and a search with the room's items
//    first (group 2 spec §11); one matched, one mismatch (another department and the condition, with the photo the
//    condition asks for), a personal asset whose new custodian turns the department to ไม่ตรง, an asset of the other
//    room opened as a wrong room, a parent whose components are not all checked, an unknown and an out-of-scope
//    search, the find recorded again and still out of scope (spec §6.2.2, group 2 spec §12, §16);
// 3. in room B the header counts the round's own items only; the phone goes offline, saves a check, comes back and
//    sends it; one asset is marked not found from the pending list, whose room chips count its rows and whose dialog
//    names the asset (spec §6.2.2–3, group 2 spec §9, §11);
// 4. IT staff read the round page after the walk: the result and category chips equal their rows, each field's bar
//    its rows, and the parent with a component not found is listed once (group 2 spec §8, §16);
// 5. IT staff are refused the review of their own findings and the close of the round they opened; the findings page
//    gives them no tick and a panel that decides nothing (spec §6.2.4, group 2 spec §10);
// 6. the IT head reviews every finding in the panel: a row opens it with ?finding=, each decision moves to the next,
//    a reject without a reason is refused by the panel and the API, the component names its machine, and on the
//    desktop a batch from the selection bar reports one failure made on purpose; then the close from the next-step
//    card (spec §6.2.4, group 2 spec §8, §10, §16);
// 7. the IT head's own round: the room chips, their own finding (no tick, and the panel says why) and their own close
//    are refused, the card says why, and the round is cancelled from "อื่น ๆ";
// 8. the audit exports by permission (spec §6.2.5, §6.5): hidden from IT staff (finding AU1, fixed; the round page's
//    menu too), downloaded by the IT head from "ส่งออก ▾" in words with English headers (decision U1, DX6 (ก), group 2
//    spec §10), the round's Excel by a category (group 2 spec §16).
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import ExcelJS from "exceljs"
import { asUser, expect, runPhoneOnWebKit, test } from "../support/fixtures.ts"
import { PHONE } from "../support/matrix.ts"
import { ADMIN_STATE_FILE, fromRoot, runDir } from "../support/paths.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { createAuditAssets, createAuditPlaces, readAuditMasters, type AuditWalkData } from "./audit-data.ts"
import * as rounds from "./round-steps.ts"
import * as pending from "./pending-steps.ts"
import * as review from "./review-steps.ts"
import * as scan from "./scan-steps.ts"
import { recordSettled, settleToasts } from "./settle.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import * as roundPage from "./round-page-steps.ts"
import { ROUND_PAGE_WORDS as W } from "./round-page-words.ts"
import { SCAN_WORDS as S } from "./scan-words.ts"
import { REVIEW_WORDS as R } from "./review-words.ts"

runPhoneOnWebKit()
test.describe.configure({ mode: "serial" })

// The chain's state, one file per project in the run's folder (git-ignored): the records, the round, and the finding
// id the not-found save answers.
type AuditChain = AuditWalkData & { roundId: string; auditNo: string; notFoundFindingId?: string }
const chainFile = (project: string) => fromRoot(`${runDir(readRunState().runId)}/audit-${project}.json`)
function saveChain(project: string, chain: AuditChain) {
  writeFileSync(chainFile(project), `${JSON.stringify(chain, null, 2)}\n`)
}
function readChain(project: string): AuditChain {
  const file = chainFile(project)
  if (!existsSync(file)) throw new Error(`no audit chain for ${project}: the round was not opened in this run`)
  return JSON.parse(readFileSync(file, "utf8")) as AuditChain
}

// Bangkok's date as the date input holds it (YYYY-MM-DD), offset by whole days.
function bangkokDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

test.describe("IT staff open the round", () => {
  asUser("itStaff")

  test("IT staff open the round of the project's department on the round form, after its errors under the fields", async ({ page, measure, playwright, baseURL }, testInfo) => {
    const run = readRunData()
    const { runId } = readRunState()
    const project = testInfo.project.name
    const admin = await playwright.request.newContext({ baseURL, storageState: fromRoot(ADMIN_STATE_FILE) })
    const places = await measure.timed("the department and the two rooms (seed admin)", () => createAuditPlaces(admin, run, runId, project))
    await admin.dispose()
    const { records } = places

    await measure.visit("/th/audit/rounds/new", "round form")
    await expect(page.getByRole("heading", { level: 1, name: "สร้างรอบตรวจนับ" })).toBeVisible()
    // Group 2 spec §7, §14: the form offers no status; every round opens at once.
    await expect(page.locator("#audit-round-status")).toHaveCount(0)
    const masters = await readAuditMasters(page)
    const walk = await measure.timed("the walk's assets and components (IT staff)", () => createAuditAssets(page, run, places, masters))

    const save = rounds.createButton(page)
    const name = page.locator("#audit-round-name")
    // Spec §6.7: an empty required field first; the error shows under it and focus goes there.
    await save.click()
    await expect(page.locator("#audit-round-name-error")).toHaveText("กรุณาระบุข้อมูลนี้")
    await expect(name).toBeFocused()
    await expect(name).toHaveAttribute("aria-invalid", "true")
    await name.fill(records.round.name)
    await expect(page.locator("#audit-round-name-error")).toHaveCount(0)
    // Then the date pair reversed.
    await page.locator("#audit-round-start-date").fill(bangkokDate())
    await page.locator("#audit-round-end-date").fill(bangkokDate(-1))
    await save.click()
    await expect(page.locator("#audit-round-end-date-error")).toHaveText("วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น")
    await expect(page.locator("#audit-round-end-date")).toBeFocused()
    await page.locator("#audit-round-end-date").fill(bangkokDate(30))
    await expect(page.locator("#audit-round-end-date-error")).toHaveCount(0)

    // Scoped to the project's department by its condition chip: the live count settles on the department's assets (no
    // "ดูตัวอย่าง" button), and the sample lists each of them and not the outsider.
    const inRound = records.assets.filter((asset) => asset.department === "round")
    await rounds.waitForFirstCount(page)
    await rounds.addCondition(page, "แผนก", records.department.code, `${records.department.code} - ${records.department.name}`)
    await expect(rounds.willCreate(page, inRound.length)).toBeVisible()
    const liveCount = await rounds.readWillCreate(page)
    await rounds.showSample(page)
    await recordSettled(page, measure, "round form with its live count and sample")
    for (const asset of inRound) await expect(page.getByRole("main").getByText(asset.tag, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole("main").getByText(walk.assets.outOfScope.tag, { exact: true })).toHaveCount(0)

    const created = page.waitForResponse((response) => response.url().endsWith("/api/audit-rounds") && response.request().method() === "POST")
    const round = await measure.timed("save the round", async () => {
      await save.click()
      const response = await created
      expect(response.status(), "the round is saved").toBe(201)
      await page.waitForURL(/\/th\/audit\/rounds\/[0-9a-f-]{36}$/)
      return (await response.json()) as { id: string; auditNo: string; generatedItems: number }
    })
    expect(round.generatedItems, "one item per asset of the department, the components included").toBe(inRound.length)
    expect(round.generatedItems, "the live count is the round's items (group 2 spec §16)").toBe(liveCount)
    await expect(page.getByText(`สร้างรอบตรวจนับสำเร็จ และสร้างรายการตรวจ ${inRound.length} รายการ`)).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/th/audit/rounds/${round.id}$`))
    await expect(page.getByRole("heading", { level: 1, name: records.round.name })).toBeVisible()
    // Open at once (group 2 spec §14): the badge reads เปิดตรวจ and the route says open.
    await expect(page.getByRole("main").getByText("เปิดตรวจ", { exact: true }).first()).toBeVisible()
    const saved = (await (await page.request.get(`/api/audit-rounds/${round.id}`)).json()) as { status: string }
    expect(saved.status, "open at once, never a draft (group 2 spec §14)").toBe("open")
    await recordSettled(page, measure, "round page after the save")
    saveChain(project, { ...walk, roundId: round.id, auditNo: round.auditNo })
    expect(readChain(project).roundId, "the chain's state is saved for the next blocks").toBe(round.id)
  })
})

test.describe("IT staff walk room A", () => {
  asUser("itStaff")

  test("IT staff walk room A by typing: the switch and the category chips, a room-first search, matched, mismatch with its photo, a personal asset's custodian, a wrong room, a parent with components, an unknown, and an out-of-scope find recorded twice", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(420_000)
    const chain = readChain(testInfo.project.name)
    const { records, assets } = chain
    if (e2eDevice === "phone") await scan.slowNetwork(page)

    await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page")
    // Group 2 spec §8: the walk starts from the next-step card's main button; none of the round's eight items is checked yet.
    await roundPage.nextStepCard(page).getByRole("link", { name: fillTemplate(W.continueScan, { count: 8 }), exact: true }).click()
    await page.waitForURL(`**/th/audit/rounds/${chain.roundId}/scan**`)
    // Two rooms and none chosen yet: the room sheet opens by itself.
    await expect(page.getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })).toBeVisible()
    await measure.recordPage("scan page with the room sheet")
    await scan.pickRoom(page, records.rooms.roomA)
    await measure.recordPage("scan page in room A")

    // Group 2 spec §11: the header names the way back and counts the round's eight; the room button reads what is done
    // in the room and what is left (bug 21); the switch counts room A's six waiting items, its third tab "ทั้งห้อง"
    // (P3-R7). A row shows the name and the code, the custodian, and the components.
    const runTags = `${readRunState().runId}-${records.code}-`
    await expect(page.getByRole("link", { name: S.backToRound, exact: true })).toHaveAttribute("href", new RegExp(`^/th/audit/rounds/${chain.roundId}(?:[?#]|$)`))
    await expect(scan.progress(page)).toContainText("0 / 8")
    await expect(scan.roomButton(page)).toContainText(fillTemplate(S.roomProgress, { checked: 0, total: 6, pending: 6 }))
    await expect(scan.roomButton(page)).toContainText(S.roomChange)
    await scan.expectTabs(page, [[S.tabPending, 6], [S.tabChecked, 0], [S.tabRoom, 6]])
    await expect(scan.roomRows(page)).toHaveCount(6)
    await expect(scan.roomRows(page).filter({ hasText: assets.parent.tag })).toContainText(fillTemplate(S.componentCount, { count: 2 }))
    await expect(scan.roomRows(page).filter({ hasText: assets.personal.tag })).toContainText(readRunData().employees.receiver1.fullNameTh)

    // The category chips (decision 3, P3-R6): "ทุกหมวดหมู่" first, then the room's categories by count (four desktops, two
    // components). The component chip narrows the rows to the two components. Any room change clears it: room B
    // holds one category, so it shows no chips, and all of its rows; with no room the switch reads "ทั้งรอบ" over the
    // round's eight and the chips count them; back in room A the chips start from "ทุกหมวดหมู่" again.
    await scan.expectCategoryChips(page, 6, [4, 2])
    await recordSettled(page, measure, "scan page in room A with its category chips")
    await scan.categoryChips(page).getByRole("button").nth(2).click()
    await expect(scan.roomRows(page)).toHaveCount(2)
    for (const asset of [assets.component1, assets.component2]) await expect(scan.roomRows(page).filter({ hasText: asset.tag })).toHaveCount(1)
    await scan.pickRoom(page, records.rooms.roomB)
    await expect(scan.categoryChips(page)).toHaveCount(0)
    await scan.expectTabs(page, [[S.tabPending, 2], [S.tabChecked, 0], [S.tabRoom, 2]])
    await expect(scan.roomRows(page)).toHaveCount(2)
    await scan.clearRoom(page)
    await scan.expectTabs(page, [[S.tabPending, 8], [S.tabChecked, 0], [S.tabRound, 8]])
    await scan.expectCategoryChips(page, 8, [6, 2])
    await expect(scan.roomRows(page)).toHaveCount(8)
    await scan.categoryChips(page).getByRole("button").nth(2).click()
    await expect(scan.roomRows(page)).toHaveCount(2)
    await scan.pickRoom(page, records.rooms.roomA)
    await scan.expectCategoryChips(page, 6, [4, 2])
    await scan.expectTabs(page, [[S.tabPending, 6], [S.tabChecked, 0], [S.tabRoom, 6]])
    await expect(scan.roomRows(page)).toHaveCount(6)

    // The search (spec §11, bug 20, P3-R5): the project's own prefix finds the round's eight; room A's six come first,
    // then room B's two, the line counts both, all eight show (no "แสดงเพิ่ม" below eleven), and the switch stays
    // above the results.
    await scan.typeSearch(page, runTags)
    await scan.expectSearchLine(page, runTags, 6, 2)
    const found = scan.searchRows(page)
    await expect(found).toHaveCount(8)
    const roomATags = [assets.matched, assets.mismatch, assets.personal, assets.parent, assets.component1, assets.component2].map((asset) => asset.tag)
    const roomBTags = [assets.notFound, assets.offline].map((asset) => asset.tag)
    const order = (await found.allTextContents()).map((text) => [...roomATags, ...roomBTags].find((tag) => text.includes(tag)) ?? text)
    expect(order.slice(0, 6).sort(), "room A's items first").toEqual([...roomATags].sort())
    expect(order.slice(6).sort(), "then the other room's").toEqual([...roomBTags].sort())
    await expect(scan.searchResults(page).getByRole("button", { name: S.showMore, exact: true })).toHaveCount(0)
    await scan.expectAbove(scan.tabs(page), found.first())
    await recordSettled(page, measure, "search in room A, the room's items first")

    // Matched: found by its tag, every field as the system has it. A first scan asks one question, and a shared asset's
    // custodian is never compared, so its row is not shown (spec §12, bug 22).
    await scan.findAndOpen(page, assets.matched.tag, assets.matched)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ตรงทุกข้อ")
    await expect(scan.checkForm(page).getByText(S.firstScanHint, { exact: true })).toBeVisible()
    for (const field of ["location", "department", "condition"] as const) await expect(scan.checkField(page, field)).toHaveCount(1)
    await expect(scan.checkField(page, "custodian")).toHaveCount(0)
    await measure.recordPage("check of the matched asset")
    if (e2eDevice === "phone") {
      // The keyboard opens over the sheet for the note: the note stays above the pinned save bar, and the bar on screen.
      await scan.checkForm(page).getByRole("button", { name: "ถ่ายรูป / เพิ่มหมายเหตุ" }).click()
      const note = scan.checkForm(page).getByLabel("หมายเหตุผู้ตรวจ")
      await note.click()
      await page.setViewportSize(scan.KEYBOARD_OPEN_VIEWPORT)
      await expect(note).toBeFocused()
      await expect(note).toBeInViewport()
      await expect(scan.saveButton(page)).toBeInViewport({ ratio: 1 })
      await measure.recordPage("check of the matched asset, keyboard open")
      await page.setViewportSize(PHONE.viewport)
    }
    await measure.timed("save matched", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.matched.tag} บันทึกแล้ว · ตรงทุกข้อ`)
    })

    // Mismatch: found by a word of its name; it stands in another department and its condition is worse, so the save
    // waits for a photo and its reason names both (N-AU1: a department or location mismatch needs a photo too). A tap
    // on the waiting save opens the note-and-photo section (finding AU2, decided DX5 (ก)), and the person adds it there.
    await scan.findAndOpen(page, "เครื่องพิมพ์", assets.mismatch)
    const runDepartment = runRecords(readRunState().runId).department.code
    await scan.chooseInCheckField(page, "department", runDepartment, `${runDepartment} - `)
    await scan.chooseInCheckField(page, "condition", "พอใช้", "พอใช้")
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 2 ข้อ (แผนก, สภาพ)")
    await expect(scan.saveButton(page)).toHaveAttribute("aria-disabled", "true")
    await expect(scan.checkForm(page).getByText("ข้อมูลไม่ตรง ต้องแนบรูปก่อนบันทึก")).toBeVisible()
    // Playwright waits for an aria-disabled button to be enabled, so the tap is forced; it is still a real pointer
    // event at the button's centre, which pointer-events: none would hand to whatever lies under it. A forced tap skips
    // the check that nothing covers the button, so it waits until the condition's list has closed: in Task 51's third
    // run the tap landed on the closing list's "ดี" and changed the condition instead.
    await expect(page.getByRole("listbox")).toHaveCount(0)
    await settleToasts(page)
    await scan.saveButton(page).click({ force: true })
    await expect(scan.checkForm(page).getByRole("button", { name: "ถ่ายรูป / เพิ่มหมายเหตุ" })).toHaveAttribute("aria-expanded", "true")
    await scan.addPhoto(page, fromRoot("e2e/fixtures/photo.png"))
    await expect(scan.saveButton(page)).not.toHaveAttribute("aria-disabled", "true")
    await recordSettled(page, measure, "check of the mismatch with its photo")
    const photoUploaded = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${assets.mismatch.id}/attachments`) && response.request().method() === "POST")
    await measure.timed("save the mismatch with its photo", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.mismatch.tag} บันทึกแล้ว · ไม่ตรง: แผนก, สภาพ`)
      expect((await photoUploaded).status(), "the photo is uploaded after the save").toBe(201)
    })

    // A personal asset (P3-R15): its custodian is compared, so all four fields show. "ไม่ตรง" with nothing found chosen
    // asks for it under the field and moves focus there, sending nothing (spec §12); the save label already counts the
    // pressed row (P3-R22). A new custodian turns the department to ไม่ตรง, that person's department (N-AU1), and the
    // save then waits for a photo. Tapping ตรง on the custodian undoes both (P3-R8), and the asset saves as matched, so
    // the walk's findings stay the five of block 6.
    const personalPosts = scan.watchScanPosts(page, chain.roundId, assets.personal.id)
    await scan.findAndOpen(page, "โน้ตบุ๊ก", assets.personal)
    for (const field of ["location", "custodian", "department", "condition"] as const) await expect(scan.checkField(page, field)).toHaveCount(1)
    await scan.fieldAnswer(page, "condition", "mismatch").click()
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 1 ข้อ (สภาพ)")
    await scan.saveButton(page).click()
    await expect(scan.checkField(page, "condition").getByText(S.chooseFoundValue, { exact: true })).toBeVisible()
    await expect(scan.foundSelect(page, "condition")).toBeFocused()
    expect(personalPosts.posts, "a ไม่ตรง with nothing found sends nothing").toEqual([])
    await scan.fieldAnswer(page, "condition", "match").click()
    await expect(scan.checkField(page, "condition").getByText(S.chooseFoundValue, { exact: true })).toHaveCount(0)
    const receiver = readRunData().employees.receiver2
    const runDepartmentPlace = runRecords(readRunState().runId).department
    // The custodian's options read the department after the name (P3-R10).
    await scan.chooseInCheckField(page, "custodian", receiver.code, new RegExp(`^${scan.escapeRegExp(`${receiver.code} - ${receiver.fullNameTh} · `)}.*${scan.escapeRegExp(runDepartmentPlace.name)}`))
    const department = scan.checkField(page, "department")
    await expect(scan.fieldAnswer(page, "department", "mismatch")).toHaveAttribute("aria-pressed", "true")
    await expect(department).toHaveAttribute("data-mismatch", "true")
    await expect(department.getByText(S.departmentFollowsCustodian, { exact: true })).toBeVisible()
    await expect(scan.foundSelect(page, "department")).toContainText(`${runDepartmentPlace.code} - ${runDepartmentPlace.name}`)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 2 ข้อ (ผู้ถือครอง, แผนก)")
    await expect(scan.saveButton(page)).toHaveAttribute("aria-disabled", "true")
    await expect(scan.checkForm(page).getByText(S.photoRequiredPlacement)).toBeVisible()
    await recordSettled(page, measure, "check of the personal asset, the department following the new custodian")
    await scan.fieldAnswer(page, "custodian", "match").click()
    await expect(scan.fieldAnswer(page, "department", "match")).toHaveAttribute("aria-pressed", "true")
    await expect(department.getByText(S.departmentFollowsCustodian, { exact: true })).toHaveCount(0)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ตรงทุกข้อ")
    await expect(scan.saveButton(page)).not.toHaveAttribute("aria-disabled", "true")
    await measure.timed("save the personal asset", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.personal.tag} บันทึกแล้ว · ตรงทุกข้อ`)
    })
    personalPosts.stop()
    expect(personalPosts.posts, "saved once, as matched").toHaveLength(1)

    // A room-B asset opened from room A (spec §12): the walked room is not where the system has it, so the location opens
    // as ไม่ตรง with room A found and room B as the system's, and the save names it. Closed with "ไม่ใช่ชิ้นนี้", it
    // sends nothing; block 3 marks it not found.
    const roomBPosts = scan.watchScanPosts(page, chain.roundId, assets.notFound.id)
    await scan.findAndOpen(page, assets.notFound.tag, assets.notFound, { inRoom: 0, otherRooms: 1 })
    const location = scan.checkField(page, "location")
    await expect(scan.fieldAnswer(page, "location", "mismatch")).toHaveAttribute("aria-pressed", "true")
    await expect(location).toHaveAttribute("data-mismatch", "true")
    await expect(scan.foundSelect(page, "location")).toContainText(`${records.rooms.roomA.code} - ${records.rooms.roomA.name}`)
    await expect(location).toContainText(`${records.rooms.roomB.code} - ${records.rooms.roomB.name}`)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 1 ข้อ (ที่ตั้ง)")
    await recordSettled(page, measure, "check of an asset of the other room")
    await scan.checkForm(page).getByRole("button", { name: S.notThisOne, exact: true }).click()
    await expect(scan.checkForm(page)).toHaveCount(0)
    roomBPosts.stop()
    expect(roomBPosts.posts, "nothing is sent for the other room's asset").toEqual([])

    // A parent with two installed components: one confirmed with the parent; saving the parent asks first while the
    // other is unchecked, and cancelling sends nothing; the other is then marked missing from its own "ไม่พบ" beside
    // "พบ" (spec §12), and the parent saves. "พบ <tag>" is exact: it is a part of "ไม่พบ <tag>".
    await scan.findAndOpen(page, assets.parent.tag, assets.parent)
    const components = scan.checkForm(page).locator("[data-audit-component-row]")
    await expect(scan.checkForm(page).getByRole("heading", { name: "ส่วนควบ 2 ชิ้น" })).toBeVisible()
    await expect(components).toHaveCount(2)
    await measure.recordPage("check of the parent with its components")
    await components.filter({ hasText: assets.component1.tag }).getByRole("button", { name: `พบ ${assets.component1.tag}`, exact: true }).click()
    await expect(page.getByText("ยืนยันส่วนควบกับทรัพย์สินหลักแล้ว")).toBeVisible()
    await expect(components.filter({ hasText: assets.component1.tag })).toContainText("ยืนยันกับทรัพย์สินหลัก")
    await expect(scan.checkForm(page).getByText("ส่วนควบตรวจแล้ว 1 / 2")).toBeVisible()
    const parentScans: string[] = []
    const watchParent = (request: { url(): string; method(): string; postData(): string | null }) => {
      if (request.method() === "POST" && request.url().endsWith(`/api/audit-rounds/${chain.roundId}/scan`) && request.postData()?.includes(`"assetId":"${assets.parent.id}"`)) parentScans.push(request.url())
    }
    page.on("request", watchParent)
    await scan.saveButton(page).click()
    const ask = page.getByRole("alertdialog", { name: "ส่วนควบยังตรวจไม่ครบ 1 ชิ้น" })
    await expect(ask).toBeVisible()
    await recordSettled(page, measure, "the parent's save asks about the unchecked component")
    await ask.getByRole("button", { name: "ยกเลิก" }).click()
    await expect(ask).toBeHidden()
    expect(parentScans, "cancelling the question sends nothing").toEqual([])
    await components.filter({ hasText: assets.component2.tag }).getByRole("button", { name: `${S.componentNotFound} ${assets.component2.tag}`, exact: true }).click()
    const missing = page.getByRole("dialog", { name: "บันทึกส่วนควบที่ไม่พบ" })
    await expect(missing).toBeVisible()
    await recordSettled(page, measure, "component missing dialog")
    await missing.getByRole("button", { name: "ยืนยันว่าไม่พบส่วนควบ" }).click()
    await expect(page.getByText("บันทึกว่าไม่พบส่วนควบแล้ว")).toBeVisible()
    await expect(missing).toBeHidden()
    await expect(scan.checkForm(page).getByText("ส่วนควบตรวจแล้ว 1 / 2")).toHaveCount(0)
    await measure.timed("save the parent", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.parent.tag} บันทึกแล้ว · ตรงทุกข้อ`)
    })
    await expect(ask).toBeHidden()
    page.off("request", watchParent)
    expect(parentScans, "the parent is saved once, with no question").toHaveLength(1)

    // An unknown tag: not in the round, not in the register.
    await scan.typeSearch(page, records.unknownTag)
    await page.getByRole("button", { name: "ค้นในทะเบียนทั้งหมด" }).click()
    await expect(page.getByText("ไม่พบรหัสนี้ในทะเบียน · ตรวจตัวสะกดหรือพิมพ์ Serial")).toBeVisible()
    await recordSettled(page, measure, "unknown tag")

    // An asset of the run's department standing in room A: outside the round's scope, recorded as such. The page then
    // syncs its rows, the find among them.
    await scan.typeSearch(page, assets.outOfScope.tag)
    await page.getByRole("button", { name: "ค้นในทะเบียนทั้งหมด" }).click()
    await expect(page.getByText(`${assets.outOfScope.tag} ไม่อยู่ในขอบเขตรอบนี้`)).toBeVisible()
    await page.getByRole("button", { name: "บันทึกเป็นนอกขอบเขต" }).click()
    await expect(scan.checkHeading(page, assets.outOfScope)).toBeVisible()
    await expect(scan.checkForm(page).getByText("นอกขอบเขตรอบนี้")).toBeVisible()
    await expect(scan.saveButton(page)).toHaveText("บันทึกนอกขอบเขต")
    await recordSettled(page, measure, "check of the out-of-scope asset")
    const first = scan.nextScanSave(page, chain.roundId)
    await measure.timed("save out of scope", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.outOfScope.tag} บันทึกเป็นนอกขอบเขตแล้ว`)
    })
    expect((await first.saved).status(), "the first out-of-scope save").toBe(202)
    await first.synced

    // The find again (P3-R3, P3-R1): the round's own items hold no out-of-scope find, so the search finds nothing in the
    // round, and the register answers that it was recorded out of scope: its sheet opens at once, with no first-record
    // card (Task 4), every row as recorded (P3-R21: room A, its master room, so nothing reads ไม่ตรง), and nothing
    // changes, so no photo is asked (P3-R18). The save keeps it out of scope (block 4 reads นอกขอบเขต 1 and ทั้งหมด 8
    // on the round page, P3-R23).
    await scan.typeSearch(page, assets.outOfScope.tag)
    await expect(scan.searchRows(page)).toHaveCount(0)
    await page.getByRole("button", { name: "ค้นในทะเบียนทั้งหมด" }).click()
    await expect(scan.checkHeading(page, assets.outOfScope)).toBeVisible()
    await expect(page.getByRole("button", { name: "บันทึกเป็นนอกขอบเขต" })).toHaveCount(0)
    await expect(scan.checkForm(page).getByText(S.outOfScopeRecorded)).toBeVisible()
    await expect(scan.checkForm(page).locator('[data-mismatch="true"]')).toHaveCount(0)
    await expect(scan.saveButton(page)).toHaveText("บันทึกนอกขอบเขต")
    await expect(scan.saveButton(page)).not.toHaveAttribute("aria-disabled", "true")
    await recordSettled(page, measure, "check of the out-of-scope find, recorded before")
    const again = scan.nextScanSave(page, chain.roundId)
    await measure.timed("save the out-of-scope find again", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.outOfScope.tag} บันทึกเป็นนอกขอบเขตแล้ว`)
    })
    const response = await again.saved
    expect(response.status(), "the second save answers 200 with the item (P3-R24)").toBe(200)
    expect(await response.json(), "it stays out of scope (P3-R3)").toMatchObject({ status: "out_of_scope", auditResult: "out_of_scope" })
    await again.synced

    // Every own item of room A is checked, the find synced in: the switch and the chips count the ตรวจแล้ว tab (four
    // desktops, two components; the find is none of the room's rows), and the empty ยังไม่ตรวจ tab shows no chips (P3-R6).
    // The find is listed apart at the end of the ตรวจแล้ว tab, with its นอกขอบเขต badge, counted in none of the tabs (P3-R25).
    await scan.typeSearch(page, "")
    await scan.tabs(page).getByRole("button", { name: new RegExp(`^${S.tabChecked}`) }).click()
    await scan.expectTabs(page, [[S.tabPending, 0], [S.tabChecked, 6], [S.tabRoom, 6]])
    await scan.expectCategoryChips(page, 6, [4, 2])
    await expect(scan.roomRows(page)).toHaveCount(6)
    await expect(scan.roomRows(page).filter({ hasText: assets.outOfScope.tag })).toHaveCount(0)
    await expect(scan.recordedFinds(page).getByRole("heading")).toHaveText(fillTemplate(S.recordedOutOfScope, { count: 1 }))
    await expect(scan.recordedFinds(page).getByRole("button", { name: scan.tagPattern(assets.outOfScope.tag) })).toContainText(S.badgeOutOfScope)
    await recordSettled(page, measure, "room A, every item checked")
    await scan.tabs(page).getByRole("button", { name: new RegExp(`^${S.tabPending}`) }).click()
    await expect(scan.categoryChips(page)).toHaveCount(0)
  })
})

test.describe("IT staff in room B, offline, and not found", () => {
  asUser("itStaff")

  test("IT staff in room B: the phone goes offline, saves a check and sends it when it is back; one asset is marked not found", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(240_000)
    const project = testInfo.project.name
    const chain = readChain(project)
    const { records, assets } = chain
    if (e2eDevice === "phone") await scan.slowNetwork(page)

    await measure.visit(`/th/audit/rounds/${chain.roundId}/scan`, "scan page")
    await scan.pickRoom(page, records.rooms.roomB)
    // Own items only (P3-R1, P3-R2): the out-of-scope find is an item of the round but not one of its own, so after a
    // fresh load the header reads the walk's 6 of 8 with its one mismatch, room B's button its two waiting, and room
    // B's one category shows no chips.
    await expect(scan.progress(page)).toContainText("6 / 8")
    await expect(scan.progress(page)).toContainText(fillTemplate(S.progressMismatch, { count: 1 }))
    await expect(scan.roomButton(page)).toContainText(fillTemplate(S.roomProgress, { checked: 0, total: 2, pending: 2 }))
    await expect(scan.categoryChips(page)).toHaveCount(0)
    const list = page.locator("[data-audit-scan-room-list]")
    const offlineRow = list.getByRole("button", { name: scan.tagPattern(assets.offline.tag) })
    await expect(offlineRow).toBeVisible()

    // Offline (spec §6.2.3): the save fails to reach the server, so the check is kept on the device and marked to send.
    // The first answer of the scan route is the queued check's, sent once the phone is back: waited for over the whole
    // offline window (20 s on the slow WebKit phone in the rehearsal, more than the 15 s action timeout).
    const sent = page.waitForResponse((response) => response.url().endsWith(`/api/audit-rounds/${chain.roundId}/scan`) && response.request().method() === "POST", { timeout: 90_000 })
    await measure.whileOffline(async () => {
      await expect(scan.shellBanner(page)).toContainText("ออฟไลน์อยู่ · ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์")
      await offlineRow.click()
      await expect(scan.checkHeading(page, assets.offline)).toBeVisible()
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.offline.tag} เก็บไว้ในเครื่อง · จะส่งเมื่อมีสัญญาณ`)
      await expect(scan.shellBanner(page)).toContainText("ออฟไลน์อยู่ · การตรวจนับ 1 รายการรอส่ง จะส่งเองเมื่อออนไลน์")
      await expect(offlineRow).toContainText("รอส่ง")
      await recordSettled(page, measure, "offline with one check in the queue")
    })

    // Back online: the queue is sent by itself.
    await measure.timed("back online: the queue is sent", async () => {
      expect((await sent).status(), "the queued check is sent").toBe(200)
      await expect(scan.offlineBar(page)).toHaveCount(0)
      await expect(scan.shellBanner(page)).not.toContainText("ออฟไลน์อยู่")
    })
    await scan.tabs(page).getByRole("button", { name: /^ตรวจแล้ว/ }).click()
    // The offline item saved as matched: its badge reads พบตรง, the round page's word (P3-R19).
    await expect(list.getByRole("button", { name: scan.tagPattern(assets.offline.tag) })).toContainText(S.badgeFound)

    // Not found: from the room's pending list, the in-app dialog, no remark needed. The footer counts room B's own
    // item still waiting and opens the list with the room (P3-R14); the page finishes its requests first, so WebKit
    // raises no page error for one the navigation cancels (E2E-1027C). The link line is Task 3's, word for word.
    await scan.tabs(page).getByRole("button", { name: /^ยังไม่ตรวจ/ }).click()
    await roundPage.settlePageRequests(page)
    await page.getByRole("link", { name: "ของในห้องนี้ที่ยังหาไม่เจอ 1 รายการ →" }).click()
    await page.waitForURL(`**/th/audit/rounds/${chain.roundId}/pending**`)
    // Group 2 spec §9: the title counts the round's pending items; the room chips count by the item's own room, room B
    // stays chosen from the scan page and room A has nothing left; each chip's count is its rows (P2-R11, P2-R12).
    const runTags = `${readRunState().runId}-${records.code}-`
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.pendingTitle, { count: 1 }) })).toBeVisible()
    await pending.expectRoomChips(page, 1, { [chain.rooms.roomB]: 1 }, chain.rooms.roomB)
    await roundPage.expectChipsMatchRows(page, pending.roomChips(page), pending.pendingRows(page, e2eDevice, runTags))
    await expect(pending.pendingEntry(page, e2eDevice, assets.notFound.tag)).toBeVisible()
    await measure.recordPage("pending list of room B")
    // The dialog names the asset with its room as the item has it and no custodian (spec §9, bug 15).
    const notFound = { ...assets.notFound, room: records.rooms.roomB, custodian: null }
    const findingId = await measure.timed("mark not found", () =>
      pending.markNotFound(page, e2eDevice, notFound, () => recordSettled(page, measure, "not found dialog")),
    )
    await expect(pending.pendingEntry(page, e2eDevice, assets.notFound.tag)).toHaveCount(0)
    // The chosen room stays, at 0 (P2-R11).
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.pendingTitle, { count: 0 }) })).toBeVisible()
    await pending.expectRoomChips(page, 0, { [chain.rooms.roomB]: 0 }, chain.rooms.roomB)
    saveChain(project, { ...chain, notFoundFindingId: findingId })

    // The round has no item left to check (a GET of the round).
    const round = (await (await page.request.get(`/api/audit-rounds/${chain.roundId}`)).json()) as { items: { auditStatus: string; asset: { assetTag: string } }[] }
    expect(round.items.filter((item) => item.auditStatus === "pending").map((item) => item.asset.assetTag), "no item left to check").toEqual([])
  })
})

test.describe("IT staff read the round page after the walk", () => {
  asUser("itStaff")

  test("IT staff read the round page after the walk: each chip's count is its rows, the categories count within the result, each field's bar is its rows, the parent with a component not found is listed once", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(240_000)
    const chain = readChain(testInfo.project.name)
    const { assets, masters } = chain
    const roundHref = `/th/audit/rounds/${chain.roundId}`
    // The walk's own rows: every tag of the project's records starts with the run id and the project's code.
    const rows = roundPage.resultRows(page, e2eDevice, `${readRunState().runId}-${chain.records.code}-`)
    await measure.visit(roundHref, "round page after the walk (IT staff)")

    // The result chips (group 2 spec §8, P2-R2, P2-R3): the round's 8 items are พบตรง 5 (A1, A3, P1, C1, A5) + ไม่ตรง 1
    // (A2) + ไม่พบ 2 (A4, C2) + รอตรวจ 0; the out-of-scope find X1 apart, still after its second save (P3-R3); รอพิจารณา
    // counts the 4 items with a finding still waiting (A2, C2, A4, X1). Each chip opens rows of its count.
    const results = roundPage.resultChips(page)
    await roundPage.expectChips(results, [[W.resultAll, 8], [W.resultPending, 0], [W.resultFound, 5], [W.resultMismatch, 1], [W.resultNotFound, 2], [W.resultOutOfScope, 1], [W.resultPendingReview, 4]])
    await roundPage.expectChipsMatchRows(page, results, rows)

    // The category chips count within the result in use (decision 2): six desktops and two components in all, one of
    // each among the not-founds (A4, C2). Each chip opens rows of its count.
    const categories = roundPage.categoryChips(page)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryDesktop}`, 6)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryComponent}`, 2)
    await roundPage.expectChipsMatchRows(page, categories, rows)
    await roundPage.settlePageRequests(page)
    await roundPage.chipByLabel(results, W.resultNotFound).click()
    await page.waitForURL(/[?&]result=not_found(?:[&#]|$)/)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryDesktop}`, 1)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryComponent}`, 1)
    await roundPage.expectChipsMatchRows(page, categories, rows)

    // Step 2 of the next-step card counts findings (P2-R26): nothing is pending, and five findings wait (A2's department
    // and condition, C2, A4, X1), the rows of the findings page that "รอ 5" and the main button open; block 6 decides
    // those five. IT staff hold no audit:approve, so the main button is a neutral view link, not a call to review.
    await roundPage.settlePageRequests(page)
    await page.goto(roundHref)
    const findingsHref = new RegExp(`^/th/audit/findings\\?status=pending&roundId=${chain.roundId}(?:&|$)`)
    const nextStep = roundPage.nextStepCard(page)
    await expect(nextStep.getByRole("link", { name: fillTemplate(W.reviewWaiting, { count: 5 }), exact: true })).toHaveAttribute("href", findingsHref)
    await expect(nextStep.getByRole("link", { name: fillTemplate(W.viewPendingFindings, { count: 5 }), exact: true })).toHaveAttribute("href", findingsHref)

    // "ไม่ตรงเรื่องอะไร" (spec §8, P2-R1, P2-R18): the mismatch is wrong in its department and its condition, both
    // waiting, so each bar holds it once and the card says one item is wrong in more than one way. Each bar's word is
    // its link, its count beside it in the same item (Task 4); each bar opens its rows.
    const card = roundPage.mismatchCard(page)
    await expect(card.getByText(W.multipleFields, { exact: true })).toBeVisible()
    await recordSettled(page, measure, "round page, the mismatch card (IT staff)")
    for (const field of ["department", "condition"] as const) {
      const word = field === "department" ? W.fieldDepartment : W.fieldCondition
      await expect(roundPage.fieldBar(card, field)).toHaveAccessibleName(word)
      await expect(card.getByRole("listitem").filter({ has: page.locator(`a[href*="field=${field}"]`) })).toHaveText(new RegExp(`^${scan.escapeRegExp(word)}\\s*1$`))
      await roundPage.settlePageRequests(page)
      await roundPage.fieldBar(card, field).click()
      await page.waitForURL(new RegExp(`[?&]field=${field}(?:[&#]|$)`))
      await expect(rows).toHaveCount(1)
      await expect(rows).toContainText(assets.mismatch.tag)
      await roundPage.settlePageRequests(page)
      await page.goto(roundHref)
    }

    // "ส่วนควบไม่ครบ" (decision 6): the parent whose second component was marked not found in the walk, listed once,
    // with that component named under it; its code opens the component's own row on this page (P2-R17).
    const missingLine = roundPage.componentsMissingLine(card)
    await expect(missingLine).toHaveAccessibleName(new RegExp(`^${scan.escapeRegExp(fillTemplate(W.componentsMissingLine, { count: 1 }))}`))
    await missingLine.click()
    await page.waitForURL(/[?&]components=missing(?:[&#]|$)/)
    await expect(roundPage.filterChip(page, fillTemplate(W.componentsMissingChip, { count: 1 }))).toBeVisible()
    await expect(rows).toHaveCount(1)
    const parentRow = rows.filter({ hasText: assets.parent.tag })
    await expect(parentRow).toHaveCount(1)
    await expect(parentRow).toContainText(`${W.missingComponentPrefix} ${assets.component2.name} (${assets.component2.tag})`)
    await recordSettled(page, measure, "round page, parents with a component not found (IT staff)")
    await parentRow.getByRole("link", { name: assets.component2.tag, exact: true }).click()
    await page.waitForURL((url) => url.pathname === roundHref && url.searchParams.get("search") === assets.component2.tag && !url.searchParams.has("components"))
    await expect(rows).toHaveCount(1)
    await expect(rows).toContainText(assets.component2.tag)
  })
})

test.describe("IT staff are refused the review and the close", () => {
  asUser("itStaff")

  test("IT staff are refused the review of their own findings and the close of the round they opened", async ({ page, measure, e2eDevice }, testInfo) => {
    const chain = readChain(testInfo.project.name)
    if (!chain.notFoundFindingId) throw new Error("the not-found save left no finding id")
    await measure.visit(`/th/audit/findings?status=pending&roundId=${chain.roundId}`, "findings of the round (IT staff)")
    await expect(page.getByRole("heading", { level: 1, name: "รายการไม่ตรงจากการตรวจนับ" })).toBeVisible()
    // IT staff hold no audit approve, so the page offers them no review controls at all (decision DX3), nor the
    // segregation note that stands in for them for an approver who reported the finding.
    await expect(page.getByText("ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้").filter({ visible: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "อนุมัติ", exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "ปฏิเสธ", exact: true })).toHaveCount(0)
    // Group 2 plan 4 (spec §10): no tick and no selection bar; the panel a row opens reads the finding, its machine
    // included, and decides nothing: no decision, no plan, no close, no reason box.
    await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)
    await expect(review.selectionBar(page)).toBeHidden()
    const component = review.findingEntry(page, e2eDevice, chain.assets.component2.tag, "not_found")
    const componentId = await review.findingId(component, e2eDevice)
    await roundPage.settlePageRequests(page)
    await review.openFinding(page, component, componentId)
    const panel = review.findingPanel(page)
    await expect(panel).toContainText(fillTemplate(R.componentOf, { parentTag: chain.assets.parent.tag, parentName: chain.assets.parent.name }))
    for (const name of [R.approve, R.reject, R.actionPlan, R.closeFinding]) await expect(panel.getByRole("button", { name, exact: true })).toHaveCount(0)
    await expect(page.locator("#audit-review-reason")).toHaveCount(0)
    await expect(page.getByText(R.ownFinding).filter({ visible: true })).toHaveCount(0)
    await recordSettled(page, measure, "a finding's panel (IT staff, read only)")

    // The review route refuses them: IT staff hold no audit approve.
    measure.expectRefusal({ method: "POST", url: /\/api\/audit-findings\/[^/]+\/review$/, status: 403, reason: "IT staff hold no audit approve (spec §6.2.4)" })
    const reviewed = await review.browserFetch(page, `/api/audit-findings/${chain.notFoundFindingId}/review`, "POST", { action: "approve" })
    expect(reviewed).toEqual({ status: 403, body: { error: "Forbidden: insufficient permissions" } })

    // The round page offers them no close, and the close route refuses them: no approve, and they opened it.
    await roundPage.settlePageRequests(page)
    await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page (IT staff)")
    await expect(page.getByRole("heading", { level: 1, name: chain.records.round.name })).toBeVisible()
    await expect(page.getByRole("button", { name: "ปิดรอบตรวจ" })).toHaveCount(0)
    measure.expectRefusal({ method: "PATCH", url: new RegExp(`/api/audit-rounds/${chain.roundId}$`), status: 403, reason: "IT staff, who opened the round, may not close it (spec §6.2.4)" })
    const closed = await review.browserFetch(page, `/api/audit-rounds/${chain.roundId}`, "PATCH", { action: "close" })
    expect(closed).toEqual({ status: 403, body: { error: "Forbidden: insufficient permissions" } })
  })
})

test.describe("The IT head reviews and closes", () => {
  asUser("itHead")

  test("the IT head reviews every finding of the round in the panel, one batch on the desktop with a failure on purpose, and closes it", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(300_000)
    const chain = readChain(testInfo.project.name)
    const { assets } = chain
    const runDept = runRecords(readRunState().runId).department
    const runDepartment = runDept.code
    const listHref = `/th/audit/findings?status=pending&roundId=${chain.roundId}`
    await measure.visit(listHref, "findings of the round (IT head)")

    // The six tabs count within the round (P4-R1, P4-R3, spec §5): the walk's five findings wait, none is decided yet.
    await review.expectTabs(page, [[R.tabPending, 5], [R.tabApproved, 0], [R.tabRejected, 0], [R.tabFollowUp, 0], [R.tabClosed, 0], [R.tabAll, 5]], R.tabPending)
    const rows = review.findingRows(page, e2eDevice)
    await expect(rows).toHaveCount(5)

    // Each finding of the walk, by its asset and its type: the word of its เรื่อง chip (P4-R2) and the decision.
    type Decision = { key: "component" | "department" | "condition" | "notFound" | "outOfScope"; asset: { id: string; tag: string; name: string }; code: review.AuditFindingTypeCode; subject: string; type: string; action: "approve" | "reject"; remark: string }
    const decisions: Decision[] = [
      { key: "component", asset: assets.component2, code: "not_found", subject: R.subjectNotFound, type: "ไม่พบทรัพย์สิน", action: "approve", remark: "ยืนยันไม่พบส่วนควบ" },
      { key: "department", asset: assets.mismatch, code: "wrong_department", subject: R.subjectDepartment, type: "แผนกไม่ตรง", action: "approve", remark: `ย้ายไปแผนก ${runDepartment} ตามที่พบ` },
      { key: "condition", asset: assets.mismatch, code: "wrong_condition", subject: R.subjectCondition, type: "สภาพไม่ตรง", action: "reject", remark: "ตรวจซ้ำแล้ว สภาพยังดี" },
      { key: "notFound", asset: assets.notFound, code: "not_found", subject: R.subjectNotFound, type: "ไม่พบทรัพย์สิน", action: "approve", remark: "ยืนยันไม่พบ" },
      { key: "outOfScope", asset: assets.outOfScope, code: "out_of_scope", subject: R.subjectOutOfScope, type: "ทรัพย์สินนอกขอบเขต", action: "approve", remark: "อยู่นอกขอบเขตรอบนี้จริง" },
    ]
    const ids = {} as Record<Decision["key"], string>
    for (const decision of decisions) {
      const entry = review.findingEntry(page, e2eDevice, decision.asset.tag, decision.code)
      await expect(entry, `${decision.type} ${decision.asset.tag}`).toHaveCount(1)
      await expect(entry.locator("[data-audit-finding-subject]")).toHaveText(decision.subject)
      ids[decision.key] = await review.findingId(entry, e2eDevice)
    }
    expect(ids.notFound, "the not-found save's finding").toBe(chain.notFoundFindingId)
    // The page's order of its pending findings, for "k จาก N" and the next one (P4-R18).
    let order = await review.readFindingOrder(page, e2eDevice)
    expect([...order].sort(), "the five rows are the walk's findings").toEqual(Object.values(ids).sort())
    // On the desktop each can be ticked: none is the IT head's own (spec §10).
    if (e2eDevice === "desktop") await expect(rows.getByRole("checkbox")).toHaveCount(5)

    // A component's finding names its machine, in the row and in the panel (spec §10, §16, decision 6); the other
    // not-found is no component.
    const parentLine = fillTemplate(R.componentOf, { parentTag: assets.parent.tag, parentName: assets.parent.name })
    const component = review.findingEntry(page, e2eDevice, assets.component2.tag, "not_found")
    await expect(component).toContainText(parentLine)
    await expect(review.findingEntry(page, e2eDevice, assets.notFound.tag, "not_found")).not.toContainText(assets.parent.tag)

    // Choosing a row opens it in the panel with ?finding= (spec §10, §16), and a reload reopens it.
    const panel = review.findingPanel(page)
    await roundPage.settlePageRequests(page)
    await review.openFinding(page, component, ids.component)
    await roundPage.settlePageRequests(page)
    await page.reload()
    await expect(panel).toHaveAttribute("data-finding-id", ids.component)
    if (e2eDevice === "desktop") await expect(component).toHaveAttribute("aria-current", "true")
    await expect(panel).toContainText(parentLine)
    // ไม่พบ: approving leaves the register, with no word of a transfer (P4-R24).
    const effect = panel.locator("[data-audit-finding-effect]")
    await expect(effect).toHaveText(R.approveNoChangeNotFound)
    await expect(panel.getByRole("link", { name: R.openAsset, exact: true })).toHaveAttribute("href", new RegExp(`^/th/assets/${assets.component2.id}(?:[?#]|$)`))
    await expect(panel.getByRole("button", { name: R.approveAllFields, exact: true })).toHaveCount(0)
    await recordSettled(page, measure, "the findings panel, a component not found (IT head)")

    // A finding in the panel: as it is, or opened by its own link (?finding=, a shared link reopens it).
    const show = async (id: string) => {
      if (new URL(page.url()).searchParams.get("finding") === id) return
      await roundPage.settlePageRequests(page)
      await page.goto(`${listHref}&finding=${id}`)
      await expect(panel).toHaveAttribute("data-finding-id", id)
    }
    // Approve or reject in the panel: one review at once, no confirm dialog, then the panel holds the next finding the IT
    // head may decide (spec §10, P4-R18), its "k จาก N" counting those findings in the tab's order (all five here).
    const decide = async (decision: Decision) => {
      const id = ids[decision.key]
      await show(id)
      await expect(panel).toContainText(decision.type)
      await expect(panel).toContainText(fillTemplate(R.position, { position: order.indexOf(id) + 1, total: order.length }))
      await page.locator("#audit-review-reason").fill(decision.remark)
      const next = review.nextPendingAfter(order, id)
      const reviewed = review.reviewResponse(page, id)
      await measure.timed(`${decision.action} ${decision.type} ${decision.asset.tag}`, async () => {
        await panel.getByRole("button", { name: decision.action === "approve" ? R.approve : R.reject, exact: true }).click()
        expect((await reviewed).status(), "the decision is taken at once").toBe(200)
      })
      order = order.filter((other) => other !== id)
      if (next) {
        await page.waitForURL((url) => url.searchParams.get("finding") === next)
        await expect(panel).toHaveAttribute("data-finding-id", next)
        await expect(panel).toContainText(fillTemplate(R.position, { position: order.indexOf(next) + 1, total: order.length }))
      } else {
        await expect(panel.getByRole("button", { name: R.approve, exact: true }), "none left on the tab").toHaveCount(0)
      }
    }
    await decide(decisions[0])

    // The department: the comparison marks the two fields the item differs in, the sentence says what approving
    // changes, and the asset's other pending field is offered with "อนุมัติทุกช่องของทรัพย์สินนี้", not pressed: the
    // condition is rejected below.
    await show(ids.department)
    for (const field of ["department", "condition"]) await expect(panel.locator(`[data-audit-finding-field="${field}"]`)).toHaveAttribute("data-mismatch", "true")
    await expect(panel.locator('[data-audit-finding-field="location"]')).toHaveCount(1)
    await expect(panel.locator('[data-audit-finding-field="location"]')).not.toHaveAttribute("data-mismatch", "true")
    await expect(panel).toContainText(fillTemplate(R.approveChanges, { field: R.subjectDepartment, from: `${chain.records.department.code} - ${chain.records.department.name}`, to: `${runDept.code} - ${runDept.name}` }))
    await expect(panel.getByRole("button", { name: R.approveAllFields, exact: true })).toBeVisible()
    await recordSettled(page, measure, "the findings panel, a department to change (IT head)")
    await decide(decisions[1])

    // The condition, rejected: first without a reason, which the panel refuses with nothing sent and the review API
    // refuses too, missing or blank (decision 5, spec §16); then with its reason.
    await show(ids.condition)
    await expect(panel).toContainText(fillTemplate(R.approveChanges, { field: R.subjectCondition, from: "ดี", to: "พอใช้" }))
    const remark = page.locator("#audit-review-reason")
    await remark.fill("")
    const posts = review.watchReviewPosts(page, ids.condition)
    await panel.getByRole("button", { name: R.reject, exact: true }).click()
    await expect(page.locator("#audit-review-reason-error")).toHaveText(R.rejectReasonRequired)
    await expect(remark).toBeFocused()
    await expect(remark).toHaveAttribute("aria-invalid", "true")
    posts.stop()
    expect(posts.posts, "a reject without a reason sends nothing").toEqual([])
    await recordSettled(page, measure, "the findings panel, a reject without a reason (IT head)")
    measure.expectRefusal({ method: "POST", url: new RegExp(`/api/audit-findings/${ids.condition}/review$`), status: 400, reason: "a reject without a reason: the review schema refuses it (decision 5)" })
    for (const body of [{ action: "reject" }, { action: "reject", reviewRemark: "   " }]) {
      expect(await review.browserFetch(page, `/api/audit-findings/${ids.condition}/review`, "POST", body), JSON.stringify(body)).toEqual({ status: 400, body: { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } } })
    }
    await decide(decisions[2])

    // นอกขอบเขต: approving leaves the register, and says how to move the asset (P4-R24).
    await show(ids.outOfScope)
    await expect(effect).toHaveText(R.approveNoChangeOutOfScope)

    if (e2eDevice === "desktop") {
      // Several at once (spec §10, bugs 17-18): the header tick, the bar and its clear. X1 is decided through the API
      // first, as another tab would (P4-R16), so the bar's batch has one success and one failure, goes past the
      // failure, says so, and refreshes.
      await roundPage.settlePageRequests(page)
      await page.goto(listHref)
      await review.expectTabs(page, [[R.tabPending, 2], [R.tabApproved, 2], [R.tabRejected, 1], [R.tabFollowUp, 0], [R.tabClosed, 0], [R.tabAll, 5]], R.tabPending)
      await expect(rows).toHaveCount(2)
      const bar = review.selectionBar(page)
      const ticks = rows.getByRole("checkbox")
      const all = page.getByRole("main").getByRole("checkbox", { name: R.selectAll, exact: true })
      await expect(bar).toBeHidden()
      await all.check()
      for (const tick of await ticks.all()) await expect(tick).toBeChecked()
      await expect(bar).toContainText(fillTemplate(R.selectedCount, { count: 2 }))
      await bar.getByRole("button", { name: R.clearSelection, exact: true }).click()
      await expect(bar).toBeHidden()
      for (const tick of await ticks.all()) await expect(tick).not.toBeChecked()
      await all.check()
      await expect(bar.getByRole("button", { name: R.rejectSelected, exact: true })).toBeVisible()
      await recordSettled(page, measure, "the selection bar, two findings ticked (IT head)")
      const earlier = await review.browserFetch(page, `/api/audit-findings/${ids.outOfScope}/review`, "POST", { action: "approve", reviewRemark: decisions[4].remark })
      expect(earlier.status, "X1 decided through the API before the batch (P4-R16)").toBe(200)
      measure.expectRefusal({ method: "POST", url: new RegExp(`/api/audit-findings/${ids.outOfScope}/review$`), status: 400, reason: "decided through the API before the bar's batch (P4-R16): the batch reports it as a failure" })
      // "อนุมัติที่เลือก 2 รายการ" asks once, with an optional remark, before a batch changes the register (P4-R25).
      await bar.getByRole("button", { name: fillTemplate(R.approveSelected, { count: 2 }), exact: true }).click()
      const dialog = page.getByRole("dialog", { name: fillTemplate(R.batchApproveTitle, { count: 2 }) })
      await expect(dialog).toBeVisible()
      await recordSettled(page, measure, "the batch's approve dialog (IT head)")
      const answers = [review.reviewResponse(page, ids.notFound), review.reviewResponse(page, ids.outOfScope)] as const
      await measure.timed("approve the two ticked from the bar", async () => {
        await dialog.getByRole("button", { name: fillTemplate(R.batchApproveConfirm, { count: 2 }), exact: true }).click()
        const [notFound, outOfScope] = await Promise.all(answers)
        expect(notFound.status(), "A4 is approved").toBe(200)
        expect(outOfScope.status(), "X1 was decided already: one failure, and the batch goes on").toBe(400)
      })
      // The result stays in the bar, in the panel's words, until it is closed (bugs 17-18).
      await expect(bar.getByRole("status")).toHaveText(fillTemplate(R.batchResult, { succeeded: 1, failed: 1 }))
      await expect(bar.getByRole("listitem")).toHaveCount(1)
      await expect(bar.getByRole("listitem")).toContainText(`${assets.outOfScope.tag} ${R.subjectOutOfScope}: ${R.batchFailedAlreadyDecided}`)
      await expect(rows).toHaveCount(0)
      await recordSettled(page, measure, "the batch's result (IT head)")
      await bar.getByRole("button", { name: R.batchResultDismiss, exact: true }).click()
      await expect(bar).toBeHidden()
    } else {
      // The phone keeps its cards and has no ticks (spec §10): the last two are decided in the panel, the last leaving
      // none on the tab.
      await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)
      await decide(decisions[3])
      await decide(decisions[4])
    }

    // Every finding is decided: the tabs count four approved and one rejected, and the pending tab is empty.
    await roundPage.settlePageRequests(page)
    await page.goto(listHref)
    await review.expectTabs(page, [[R.tabPending, 0], [R.tabApproved, 4], [R.tabRejected, 1], [R.tabFollowUp, 0], [R.tabClosed, 0], [R.tabAll, 5]], R.tabPending)
    await expect(page.getByRole("main").getByText(R.emptyTitle, { exact: true }).filter({ visible: true })).toHaveCount(1)
    await recordSettled(page, measure, "findings of the round, all reviewed")

    // The approved department is the asset's now; the rejected condition is not (a GET of the asset).
    const mismatch = (await (await page.request.get(`/api/assets/${assets.mismatch.id}`)).json()) as { department: { code: string } | null; condition: { name: string } }
    expect(mismatch.department?.code, "the approved department").toBe(runDepartment)
    expect(mismatch.condition.name, "the rejected condition stays").toBe("Good")

    // The checklist is clear and the IT head did not open the round: "ปิดรอบตรวจ" sits whole inside the next-step card
    // (group 2 spec §8, §13 bug 2), with no opener's sentence, and the close goes through.
    await roundPage.settlePageRequests(page)
    await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page (IT head)")
    const nextStep = roundPage.nextStepCard(page)
    const close = nextStep.getByRole("button", { name: "ปิดรอบตรวจ", exact: true })
    await expect(close).toBeEnabled()
    await roundPage.expectInside(close, nextStep)
    await expect(page.getByText(W.openerCannotClose)).toHaveCount(0)
    await close.click()
    const confirm = page.getByRole("alertdialog", { name: "ยืนยันปิดรอบตรวจนับนี้?" })
    await expect(confirm).toBeVisible()
    await recordSettled(page, measure, "close confirmation")
    await measure.timed("close the round", async () => {
      await confirm.getByRole("button", { name: "ปิดรอบตรวจ" }).click()
      await expect(page.getByText("ปิดรอบตรวจนับสำเร็จ")).toBeVisible()
      await expect(close).toHaveCount(0)
    })
    await expect(page.getByRole("main").getByText("ปิดรอบแล้ว", { exact: true }).first()).toBeVisible()
    await recordSettled(page, measure, "round page, closed")
  })
})

test.describe("The IT head's own round", () => {
  asUser("itHead")

  test("the IT head's own round: their own finding and their own close are refused, and the round is cancelled", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(180_000)
    const chain = readChain(testInfo.project.name)
    const { records, assets } = chain

    // A round of room B that the IT head opens themselves, through the round route with the body the form sends and a
    // status the route ignores (group 2 spec §7: the create API always opens the round).
    const opened = await page.request.post("/api/audit-rounds", {
      data: {
        name: records.ownRound.name,
        auditYear: Number(bangkokDate().slice(0, 4)),
        scopeDepartmentId: chain.departmentId,
        scopeLocationId: chain.rooms.roomB,
        includeClosedAssets: false,
        riskPreset: "all",
        sampleRate: 100,
        startDate: bangkokDate(),
        endDate: bangkokDate(7),
        status: "draft",
      },
    })
    expect(opened.status(), "the IT head's round is saved").toBe(201)
    const own = (await opened.json()) as { id: string; auditNo: string; generatedItems: number }
    expect(own.generatedItems, "room B's two assets").toBe(2)
    const ownSaved = (await (await page.request.get(`/api/audit-rounds/${own.id}`)).json()) as { status: string }
    expect(ownSaved.status, "a client's status is ignored: the round opens").toBe("open")

    // They mark one asset not found from the pending list (group 2 spec §9): the title and the room chips count room B's
    // two items, each chip's count is its rows, and "เดินตรวจต่อ (2)" opens the scan page (the IT head holds audit:edit);
    // after the save one is left.
    await measure.visit(`/th/audit/rounds/${own.id}/pending`, "pending list of the IT head's round")
    const ownRows = pending.pendingRows(page, e2eDevice, `${readRunState().runId}-${records.code}-`)
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.pendingTitle, { count: 2 }) })).toBeVisible()
    await expect(page.getByRole("main").getByRole("link", { name: fillTemplate(W.continueScan, { count: 2 }), exact: true })).toHaveAttribute("href", new RegExp(`^/th/audit/rounds/${own.id}/scan(?:[?#]|$)`))
    await pending.expectRoomChips(page, 2, { [chain.rooms.roomB]: 2 }, "all")
    await roundPage.expectChipsMatchRows(page, pending.roomChips(page), ownRows)
    const findingId = await pending.markNotFound(page, e2eDevice, { ...assets.notFound, room: records.rooms.roomB, custodian: null })
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.pendingTitle, { count: 1 }) })).toBeVisible()
    await pending.expectRoomChips(page, 1, { [chain.rooms.roomB]: 1 }, "all")
    await expect(ownRows).toHaveCount(1)

    // Their own finding (spec §10, Appendix A §10): the row has no tick, and the panel says why instead of the buttons;
    // the review route refuses it (segregation of duties).
    await roundPage.settlePageRequests(page)
    await measure.visit(`/th/audit/findings?status=pending&roundId=${own.id}`, "findings of the IT head's round")
    const entry = review.findingEntry(page, e2eDevice, assets.notFound.tag, "not_found")
    await expect(entry).toHaveCount(1)
    await expect(entry.getByRole("checkbox")).toHaveCount(0)
    await roundPage.settlePageRequests(page)
    await review.openFinding(page, entry, findingId)
    const panel = review.findingPanel(page)
    await expect(panel.getByText(R.ownFinding)).toBeVisible()
    await expect(panel.getByRole("button", { name: R.approve, exact: true })).toHaveCount(0)
    await expect(panel.getByRole("button", { name: R.reject, exact: true })).toHaveCount(0)
    await expect(page.locator("#audit-review-reason")).toHaveCount(0)
    await recordSettled(page, measure, "the panel of the IT head's own finding")
    measure.expectRefusal({ method: "POST", url: new RegExp(`/api/audit-findings/${findingId}/review$`), status: 403, reason: "the reporter may not review their own finding (segregation of duties)" })
    const reviewed = await review.browserFetch(page, `/api/audit-findings/${findingId}/review`, "POST", { action: "approve" })
    expect(reviewed).toEqual({ status: 403, body: { error: "Audit finding must be reviewed by a different user than the reporter" } })

    // Their own round: the next-step card tells the opener they cannot close it, and offers no close yet (room B's other
    // asset is still to check, so step 3 is not reached); the close route refuses the opener (spec §6.2.4: the rule as
    // the code has it, src/app/api/audit-rounds/[id]/route.ts closeOwnRound).
    await roundPage.settlePageRequests(page)
    await measure.visit(`/th/audit/rounds/${own.id}`, "the IT head's round")
    const nextStep = roundPage.nextStepCard(page)
    await expect(nextStep.getByText(W.openerCannotClose)).toBeVisible()
    await expect(nextStep.getByRole("button", { name: "ปิดรอบตรวจ", exact: true })).toHaveCount(0)
    measure.expectRefusal({ method: "PATCH", url: new RegExp(`/api/audit-rounds/${own.id}$`), status: 403, reason: "the opener may not close their own round (closeOwnRound)" })
    const closed = await review.browserFetch(page, `/api/audit-rounds/${own.id}`, "PATCH", { action: "close" })
    expect(closed).toEqual({ status: 403, body: { error: "Audit round must be closed by a different approver than the creator" } })

    // The round is cancelled from "อื่น ๆ" (group 2 spec §8) with a reason; an empty reason first shows its error under
    // the field.
    await page.getByRole("main").getByRole("button", { name: W.more, exact: true }).click()
    await recordSettled(page, measure, "the round's อื่น ๆ menu")
    await page.getByRole("menuitem", { name: W.cancelRound, exact: true }).click()
    const cancel = page.getByRole("dialog", { name: "ยืนยันยกเลิกรอบตรวจ" })
    await expect(cancel).toBeVisible()
    await cancel.getByRole("button", { name: "ยืนยันยกเลิก" }).click()
    await expect(page.locator("#audit-round-cancel-reason-error")).toHaveText("กรุณาระบุเหตุผลการยกเลิก")
    await expect(page.locator("#audit-round-cancel-reason")).toBeFocused()
    await page.locator("#audit-round-cancel-reason").fill("รอบทดสอบการแยกหน้าที่ของ E2E")
    await recordSettled(page, measure, "cancel dialog")
    await measure.timed("cancel the round", async () => {
      await cancel.getByRole("button", { name: "ยืนยันยกเลิก" }).click()
      await expect(page.getByText("ยกเลิกรอบตรวจสำเร็จ")).toBeVisible()
    })
    await expect(page.getByText("รอบนี้ถูกยกเลิกและอ่านได้อย่างเดียว ไม่สามารถสแกน แก้ผลตรวจ พิจารณา หรือปิดรอบต่อได้")).toBeVisible()
    await recordSettled(page, measure, "the IT head's round, cancelled")
  })
})

// Spec §6.5: a role without the export permission does not see it; spec §6.2.5: the findings export downloads. IT staff
// hold no audit export and are offered none (finding AU1, fixed by FX4); the IT head holds it (spec §7's table since
// decision DX6 (ก)) and downloads the round's findings.
test.describe("The audit exports by permission", () => {
  test.describe("IT staff", () => {
    asUser("itStaff")

    test("IT staff, who hold no audit export, are not offered the findings export (finding AU1)", async ({ page, measure }, testInfo) => {
      // AU1 fixed (FX4): this test now keeps the exports hidden from a role without audit:export.
      const chain = readChain(testInfo.project.name)
      await measure.visit(`/th/audit/findings?status=all&roundId=${chain.roundId}`, "findings of the round, all (IT staff)")
      await expect(page.getByRole("heading", { level: 1, name: "รายการไม่ตรงจากการตรวจนับ" })).toBeVisible()
      // The findings export sits in "ส่งออก ▾" (spec §10), which needs audit:export: no menu and no export link.
      await expect(page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true })).toHaveCount(0)
      await expect(page.locator('main a[href^="/api/audit-findings/export"]')).toHaveCount(0)
      // Nor the round page's export menu (group 2 spec §8: "ส่งออก ▾" needs audit:export).
      await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page (IT staff, no export)")
      await expect(page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true })).toHaveCount(0)
    })
  })

  test.describe("IT head", () => {
    asUser("itHead")

    test("the findings export downloads the round's findings from ส่งออก ▾, in words (decision U1, group 2 spec §10)", async ({ page, measure }, testInfo) => {
      const chain = readChain(testInfo.project.name)
      await measure.visit(`/th/audit/findings?status=all&roundId=${chain.roundId}`, "findings of the round, all (IT head)")
      // "ส่งออก ▾" (spec §10, P4-R7): Excel and PDF, each of the page's filters and its language.
      await page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true }).click()
      const items = page.getByRole("menuitem")
      await expect(items).toHaveCount(2)
      // Task 3's two items, by their names: "ส่งออกรายการไม่ตรง …" (Excel) and "ส่งออก PDF …".
      const excel = items.filter({ hasText: R.exportExcel })
      for (const [item, route] of [[excel, "export"], [items.filter({ hasText: R.exportPdf }), "export-pdf"]] as const) {
        await expect(item).toHaveAttribute("href", new RegExp(`^/api/audit-findings/${route}\\?`))
        for (const param of ["status=all", `roundId=${chain.roundId}`, "locale=th"]) await expect(item).toHaveAttribute("href", new RegExp(`[?&]${scan.escapeRegExp(param)}(?:&|$)`))
      }
      await recordSettled(page, measure, "the findings export menu (IT head)")
      const downloading = page.waitForEvent("download")
      await excel.click()
      const download = await downloading
      // The file as downloaded, kept in the report.
      const file = await download.path().catch(() => null)
      if (file) await testInfo.attach(`download ${download.suggestedFilename()}`, { path: file, contentType: "application/octet-stream" })
      expect(download.suggestedFilename(), "an Excel file").toMatch(/\.xlsx$/)
      expect(file, "the download completed").not.toBeNull()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(file ?? "")
      // The sheet and its headers stay English (P4-R7): the "Asset Tag" column, found by its header.
      const sheet = workbook.getWorksheet("Audit Findings")
      if (!sheet) throw new Error("no Audit Findings sheet")
      const header = (sheet.getRow(1).values ?? []) as unknown[]
      const tagColumn = header.indexOf("Asset Tag")
      const typeColumn = header.indexOf("Finding Type")
      expect(tagColumn, "the Asset Tag column").toBeGreaterThan(0)
      expect(typeColumn, "the Finding Type column").toBeGreaterThan(0)
      const types = new Map<string, string[]>()
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const tag = String(row.getCell(tagColumn).value ?? "")
        types.set(tag, [...(types.get(tag) ?? []), String(row.getCell(typeColumn).value ?? "")])
      })
      for (const asset of [chain.assets.mismatch, chain.assets.component2, chain.assets.notFound, chain.assets.outOfScope]) {
        expect(types.has(asset.tag), `${asset.tag} is in the export`).toBe(true)
      }
      // The codes read as the page's words (P4-R7, P4-R8).
      expect(types.get(chain.assets.mismatch.tag)?.sort(), "A2's two findings, by their words").toEqual(["แผนกไม่ตรง", "สภาพไม่ตรง"].sort())
      expect(types.get(chain.assets.outOfScope.tag), "X1's finding, by its word").toEqual(["ทรัพย์สินนอกขอบเขต"])
      expect(review.rawCodeCells(sheet, ["Finding Type", "Review Status", "Action Status", "Action Taken"]), "no raw code in a cell (P4-R7, P4-R8)").toEqual([])
    })

    test("the round page after the review: the rejected finding leaves its bar, and a category narrows the result chips, the rows and the Excel export (group 2 spec §8, §16)", async ({ page, measure, e2eDevice }, testInfo) => {
      test.setTimeout(180_000)
      const chain = readChain(testInfo.project.name)
      const { assets, masters } = chain
      const rows = roundPage.resultRows(page, e2eDevice, `${readRunState().runId}-${chain.records.code}-`)
      await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page, closed (IT head)")

      // P2-R1: the rejected condition finding leaves its bar; the approved department stays, so one item, one field.
      const card = roundPage.mismatchCard(page)
      await expect(roundPage.fieldBar(card, "department")).toHaveAccessibleName(W.fieldDepartment)
      await expect(card.getByRole("listitem").filter({ has: page.locator('a[href*="field=department"]') })).toHaveText(new RegExp(`^${scan.escapeRegExp(W.fieldDepartment)}\\s*1$`))
      await expect(roundPage.fieldBar(card, "condition")).toHaveCount(0)
      await expect(card.getByText(W.multipleFields, { exact: true })).toHaveCount(0)

      // A category (decision 2): its chip joins the filter chips, the result chips count within it, the rows narrow to it.
      const component = roundPage.chipByHref(roundPage.categoryChips(page), `categoryId=${masters.categoryComponent}`)
      const label = await roundPage.chipLabel(component)
      await component.click()
      await page.waitForURL(new RegExp(`[?&]categoryId=${masters.categoryComponent}(?:[&#]|$)`))
      await expect(roundPage.filterChip(page, label)).toBeVisible()
      await roundPage.expectChips(roundPage.resultChips(page), [[W.resultAll, 2], [W.resultPending, 0], [W.resultFound, 1], [W.resultMismatch, 0], [W.resultNotFound, 1], [W.resultOutOfScope, 0], [W.resultPendingReview, 0]])
      await expect(rows).toHaveCount(2)
      for (const asset of [assets.component1, assets.component2]) await expect(rows.filter({ hasText: asset.tag })).toHaveCount(1)

      // "ส่งออก ▾" (spec §8): three exports, each of the chosen filters; the Excel one downloads the category's items only.
      await page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true }).click()
      const items = page.getByRole("menuitem")
      await expect(items).toHaveCount(3)
      for (const item of await items.all()) await expect(item).toContainText(W.exportScope)
      await expect(items.filter({ hasText: W.exportVariance })).toHaveAttribute("href", new RegExp(`[?&]categoryId=${masters.categoryComponent}(?:&|$)`))
      const excel = items.filter({ hasText: W.exportExcel })
      await expect(excel).toHaveAttribute("href", new RegExp(`[?&]categoryId=${masters.categoryComponent}(?:&|$)`))
      await recordSettled(page, measure, "the round's export menu (IT head)")
      // Group 2 plan 4 (P4-R7): each export speaks the page's language.
      for (const item of await items.all()) await expect(item).toHaveAttribute("href", /[?&]locale=th(?:&|$)/)
      const downloading = page.waitForEvent("download")
      await excel.click()
      const download = await downloading
      // The file as downloaded, kept in the report.
      const file = await download.path().catch(() => null)
      if (file) await testInfo.attach(`download ${download.suggestedFilename()}`, { path: file, contentType: "application/octet-stream" })
      expect(download.suggestedFilename(), "an Excel file").toMatch(/\.xlsx$/)
      expect(file, "the download completed").not.toBeNull()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(file ?? "")
      // The "Asset Tag" column (src/lib/audit-excel.ts auditResultColumns), found by its header on the export's one sheet.
      const sheet = workbook.worksheets[0]
      const tagColumn = ((sheet?.getRow(1).values ?? []) as unknown[]).indexOf("Asset Tag")
      expect(tagColumn, "the Asset Tag column").toBeGreaterThan(0)
      const tags: string[] = []
      sheet?.eachRow((row, rowNumber) => {
        if (rowNumber > 1) tags.push(String(row.getCell(tagColumn).value ?? ""))
      })
      expect(tags.sort(), "the category's items only").toEqual([assets.component1.tag, assets.component2.tag].sort())
      // The status columns hold words, never a code; the headers stay English (P4-R7).
      expect(review.rawCodeCells(sheet, ["Audit Status", "Audit Result", "Reconcile Status"]), "no raw code in a cell (P4-R7)").toEqual([])
    })
  })
})
