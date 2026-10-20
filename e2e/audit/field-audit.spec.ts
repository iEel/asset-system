// The field audit walk and its review (spec §6.2, the user's second worry), in all four projects, the phone on WebKit
// (spec §8). One serial chain per project, on that project's own records (e2e/audit/audit-plan.ts); each block is one
// person's part:
// 1. IT staff open the round of the project's department on the round form, after it shows its errors under the
//    fields (spec §6.2.1, §6.7);
// 2. IT staff walk room A by typing names and tags: one matched, one mismatch (another department and the condition,
//    with the photo the condition asks for), a parent whose components are not all checked, an unknown and an
//    out-of-scope search (spec §6.2.2);
// 3. in room B the phone goes offline, saves a check, comes back and sends it; one asset is marked not found from the
//    pending list (spec §6.2.2–3);
// 4. IT staff are refused the review of their own findings and the close of the round they opened (spec §6.2.4);
// 5. the IT head reviews every finding and closes the round (spec §6.2.4);
// 6. the IT head's own round: their own finding and their own close are refused, and the round is cancelled;
// 7. the audit exports by permission (spec §6.2.5, §6.5): hidden from IT staff (finding AU1, fixed), downloaded by the
//    IT head (decision U1, DX6 (ก)).
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import ExcelJS from "exceljs"
import { asUser, expect, runPhoneOnWebKit, test } from "../support/fixtures.ts"
import { PHONE } from "../support/matrix.ts"
import { ADMIN_STATE_FILE, fromRoot, runDir } from "../support/paths.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { createAuditAssets, createAuditPlaces, readAuditMasters, type AuditWalkData } from "./audit-data.ts"
import * as pending from "./pending-steps.ts"
import * as review from "./review-steps.ts"
import * as scan from "./scan-steps.ts"
import { recordSettled } from "./settle.ts"

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
    const masters = await readAuditMasters(page)
    const walk = await measure.timed("the walk's assets and components (IT staff)", () => createAuditAssets(page, run, places, masters))

    const save = page.getByRole("button", { name: "บันทึก", exact: true })
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

    // Open now, scoped to the project's department; the preview lists every asset of it and not the outsider.
    await page.locator("#audit-round-status").selectOption({ label: "เปิดตรวจ" })
    await page.getByLabel("แผนก", { exact: true }).selectOption({ label: `${records.department.code} - ${records.department.name}` })
    await page.getByRole("button", { name: "ดูตัวอย่าง" }).click()
    await expect(page.getByText("ตัวอย่างรายการที่จะเข้ารอบตรวจนับ")).toBeVisible()
    await measure.recordPage("round form with its preview")
    const inRound = records.assets.filter((asset) => asset.department === "round")
    for (const asset of inRound) await expect(page.locator("form").getByText(asset.tag, { exact: true })).toBeVisible()
    await expect(page.locator("form").getByText(walk.assets.outOfScope.tag, { exact: true })).toHaveCount(0)

    const created = page.waitForResponse((response) => response.url().endsWith("/api/audit-rounds") && response.request().method() === "POST")
    const round = await measure.timed("save the round", async () => {
      await save.click()
      const response = await created
      expect(response.status(), "the round is saved").toBe(201)
      await page.waitForURL(/\/th\/audit\/rounds\/[0-9a-f-]{36}$/)
      return (await response.json()) as { id: string; auditNo: string; generatedItems: number }
    })
    expect(round.generatedItems, "one item per asset of the department, the components included").toBe(inRound.length)
    await expect(page.getByText(`สร้างรอบตรวจนับสำเร็จ และสร้างรายการตรวจ ${inRound.length} รายการ`)).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/th/audit/rounds/${round.id}$`))
    await expect(page.getByRole("heading", { level: 1, name: records.round.name })).toBeVisible()
    await recordSettled(page, measure, "round page after the save")
    saveChain(project, { ...walk, roundId: round.id, auditNo: round.auditNo })
    expect(readChain(project).roundId, "the chain's state is saved for the next blocks").toBe(round.id)
  })
})

test.describe("IT staff walk room A", () => {
  asUser("itStaff")

  test("IT staff walk room A by typing: matched, mismatch with its photo, a parent with components, an unknown and an out-of-scope search", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(300_000)
    const chain = readChain(testInfo.project.name)
    const { records, assets } = chain
    if (e2eDevice === "phone") await scan.slowNetwork(page)

    await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page")
    await page.getByRole("link", { name: "สแกนตรวจนับ" }).first().click()
    await page.waitForURL(`**/th/audit/rounds/${chain.roundId}/scan**`)
    // Two rooms and none chosen yet: the room sheet opens by itself.
    await expect(page.getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })).toBeVisible()
    await measure.recordPage("scan page with the room sheet")
    await scan.pickRoom(page, records.rooms.roomA)
    await measure.recordPage("scan page in room A")

    // Matched: found by its tag, every field as the system has it.
    await scan.findAndOpen(page, assets.matched.tag, assets.matched.tag)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ตรงทุกข้อ")
    await measure.recordPage("check of the matched asset")
    if (e2eDevice === "phone") {
      // The keyboard opens over the sheet for the note: the note stays above the pinned save bar, and the bar on screen.
      await scan.checkForm(page).getByRole("button", { name: "หมายเหตุ / รูป" }).click()
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
    // waits for a photo. A tap on the waiting save opens the note-and-photo section (finding AU2, decided DX5 (ก)),
    // and the person adds it there.
    await scan.findAndOpen(page, "เครื่องพิมพ์", assets.mismatch.tag)
    const runDepartment = runRecords(readRunState().runId).department.code
    await scan.chooseInCheckField(page, "แผนก", runDepartment, `${runDepartment} - `)
    await scan.chooseInCheckField(page, "สภาพ", "พอใช้", "พอใช้")
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 2 ข้อ (แผนก, สภาพ)")
    await expect(scan.saveButton(page)).toHaveAttribute("aria-disabled", "true")
    await expect(scan.checkForm(page).getByText("สภาพไม่ตรง ต้องแนบรูปก่อนบันทึก")).toBeVisible()
    // Playwright waits for an aria-disabled button to be enabled, so the tap is forced; it is still a real pointer
    // event at the button's centre, which pointer-events: none would hand to whatever lies under it.
    await scan.saveButton(page).click({ force: true })
    await expect(scan.checkForm(page).getByRole("button", { name: "หมายเหตุ / รูป" })).toHaveAttribute("aria-expanded", "true")
    await scan.addPhoto(page, fromRoot("e2e/fixtures/photo.png"))
    await expect(scan.saveButton(page)).not.toHaveAttribute("aria-disabled", "true")
    await recordSettled(page, measure, "check of the mismatch with its photo")
    const photoUploaded = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${assets.mismatch.id}/attachments`) && response.request().method() === "POST")
    await measure.timed("save the mismatch with its photo", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.mismatch.tag} บันทึกแล้ว · ไม่ตรง: แผนก, สภาพ`)
      expect((await photoUploaded).status(), "the photo is uploaded after the save").toBe(201)
    })

    // A parent with two installed components: one confirmed with the parent; saving the parent asks first while the
    // other is unchecked, and cancelling sends nothing; the other is then marked missing, and the parent saves.
    await scan.findAndOpen(page, assets.parent.tag, assets.parent.tag)
    const components = scan.checkForm(page).locator("[data-audit-component-row]")
    await expect(scan.checkForm(page).getByRole("heading", { name: "ส่วนควบ 2 ชิ้น" })).toBeVisible()
    await expect(components).toHaveCount(2)
    await measure.recordPage("check of the parent with its components")
    await components.filter({ hasText: assets.component1.tag }).getByRole("button", { name: `พบ ${assets.component1.tag}` }).click()
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
    await components.filter({ hasText: assets.component2.tag }).getByRole("button", { name: `การดำเนินการของ ${assets.component2.tag}` }).click()
    await page.getByRole("menuitem", { name: "ไม่พบส่วนควบนี้" }).click()
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

    // An asset of the run's department standing in room A: outside the round's scope, recorded as such.
    await scan.typeSearch(page, assets.outOfScope.tag)
    await page.getByRole("button", { name: "ค้นในทะเบียนทั้งหมด" }).click()
    await expect(page.getByText(`${assets.outOfScope.tag} ไม่อยู่ในขอบเขตรอบนี้`)).toBeVisible()
    await page.getByRole("button", { name: "บันทึกเป็นนอกขอบเขต" }).click()
    await expect(scan.checkHeading(page, assets.outOfScope.tag)).toBeVisible()
    await expect(scan.checkForm(page).getByText("นอกขอบเขตรอบนี้")).toBeVisible()
    await expect(scan.saveButton(page)).toHaveText("บันทึกนอกขอบเขต")
    await recordSettled(page, measure, "check of the out-of-scope asset")
    await measure.timed("save out of scope", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.outOfScope.tag} บันทึกเป็นนอกขอบเขตแล้ว`)
    })
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
    const list = page.locator("[data-audit-scan-room-list]")
    const offlineRow = list.getByRole("button", { name: scan.tagPattern(assets.offline.tag) })
    await expect(offlineRow).toBeVisible()

    // Offline (spec §6.2.3): the save fails to reach the server, so the check is kept on the device and marked to send.
    // The first answer of the scan route is the queued check's, sent once the phone is back: waited for over the whole
    // offline window (20 s on the slow WebKit phone in the rehearsal, more than the 15 s action timeout).
    const sent = page.waitForResponse((response) => response.url().endsWith(`/api/audit-rounds/${chain.roundId}/scan`) && response.request().method() === "POST", { timeout: 90_000 })
    await measure.whileOffline(async () => {
      await expect(scan.offlineBar(page)).toContainText("ออฟไลน์ · รอส่ง 0 รายการ")
      await offlineRow.click()
      await expect(scan.checkHeading(page, assets.offline.tag)).toBeVisible()
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.offline.tag} เก็บไว้ในเครื่อง · จะส่งเมื่อมีสัญญาณ`)
      await expect(scan.offlineBar(page)).toContainText("ออฟไลน์ · รอส่ง 1 รายการ")
      await expect(offlineRow).toContainText("รอส่ง")
      await recordSettled(page, measure, "offline with one check in the queue")
    })

    // Back online: the queue is sent by itself.
    await measure.timed("back online: the queue is sent", async () => {
      expect((await sent).status(), "the queued check is sent").toBe(200)
      await expect(scan.offlineBar(page)).toHaveCount(0)
    })
    await list.getByRole("button", { name: /^ตรวจแล้ว/ }).click()
    await expect(list.getByRole("button", { name: scan.tagPattern(assets.offline.tag) })).toContainText("ตรวจแล้ว")

    // Not found: from the room's pending list, the in-app dialog, no remark needed.
    await list.getByRole("button", { name: /^ยังไม่ตรวจ/ }).click()
    await page.getByRole("link", { name: "ของที่หาไม่เจอ → รายการค้าง" }).click()
    await page.waitForURL(`**/th/audit/rounds/${chain.roundId}/pending**`)
    await expect(pending.pendingEntry(page, e2eDevice, assets.notFound.tag)).toBeVisible()
    await measure.recordPage("pending list of room B")
    const findingId = await measure.timed("mark not found", () =>
      pending.markNotFound(page, e2eDevice, assets.notFound.tag, () => recordSettled(page, measure, "not found dialog")),
    )
    await expect(pending.pendingEntry(page, e2eDevice, assets.notFound.tag)).toHaveCount(0)
    saveChain(project, { ...chain, notFoundFindingId: findingId })

    // The round has no item left to check (a GET of the round).
    const round = (await (await page.request.get(`/api/audit-rounds/${chain.roundId}`)).json()) as { items: { auditStatus: string; asset: { assetTag: string } }[] }
    expect(round.items.filter((item) => item.auditStatus === "pending").map((item) => item.asset.assetTag), "no item left to check").toEqual([])
  })
})

test.describe("IT staff are refused the review and the close", () => {
  asUser("itStaff")

  test("IT staff are refused the review of their own findings and the close of the round they opened", async ({ page, measure }, testInfo) => {
    const chain = readChain(testInfo.project.name)
    if (!chain.notFoundFindingId) throw new Error("the not-found save left no finding id")
    await measure.visit(`/th/audit/findings?status=pending&roundId=${chain.roundId}`, "findings of the round (IT staff)")
    await expect(page.getByRole("heading", { level: 1, name: "รายการไม่ตรงจากการตรวจนับ" })).toBeVisible()
    // Every finding of the round is theirs: the review buttons give way to the segregation note.
    await expect(page.getByText("ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้").filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "อนุมัติ", exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "ปฏิเสธ", exact: true })).toHaveCount(0)

    // The review route refuses them: IT staff hold no audit approve.
    measure.expectRefusal({ method: "POST", url: /\/api\/audit-findings\/[^/]+\/review$/, status: 403, reason: "IT staff hold no audit approve (spec §6.2.4)" })
    const reviewed = await review.browserFetch(page, `/api/audit-findings/${chain.notFoundFindingId}/review`, "POST", { action: "approve" })
    expect(reviewed).toEqual({ status: 403, body: { error: "Forbidden: insufficient permissions" } })

    // The round page offers them no close, and the close route refuses them: no approve, and they opened it.
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

  test("the IT head reviews every finding of the round and closes it", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(240_000)
    const chain = readChain(testInfo.project.name)
    const { assets } = chain
    const runDepartment = runRecords(readRunState().runId).department.code
    await measure.visit(`/th/audit/findings?status=pending&roundId=${chain.roundId}`, "findings of the round (IT head)")

    // Each finding of the walk, approved or rejected with a remark in its dialog.
    const decisions: { tag: string; type: string; action: "approve" | "reject"; remark: string }[] = [
      { tag: assets.mismatch.tag, type: "แผนกไม่ตรง", action: "approve", remark: `ย้ายไปแผนก ${runDepartment} ตามที่พบ` },
      { tag: assets.mismatch.tag, type: "สภาพไม่ตรง", action: "reject", remark: "ตรวจซ้ำแล้ว สภาพยังดี" },
      { tag: assets.component2.tag, type: "ไม่พบทรัพย์สิน", action: "approve", remark: "ยืนยันไม่พบส่วนควบ" },
      { tag: assets.notFound.tag, type: "ไม่พบทรัพย์สิน", action: "approve", remark: "ยืนยันไม่พบ" },
      { tag: assets.outOfScope.tag, type: "ทรัพย์สินนอกขอบเขต", action: "approve", remark: "อยู่นอกขอบเขตรอบนี้จริง" },
    ]
    await expect(page.getByRole("button", { name: "อนุมัติ", exact: true })).toHaveCount(decisions.length)
    for (const [index, decision] of decisions.entries()) {
      const approve = decision.action === "approve"
      const entry = review.findingEntry(page, e2eDevice, decision.tag, decision.type)
      await expect(entry).toHaveCount(1)
      await entry.getByRole("button", { name: approve ? "อนุมัติ" : "ปฏิเสธ", exact: true }).click()
      const dialog = page.getByRole("dialog", { name: approve ? "ยืนยันการอนุมัติรายการไม่ตรง" : "ยืนยันการปฏิเสธรายการไม่ตรง" })
      await expect(dialog).toBeVisible()
      await dialog.getByLabel(approve ? "หมายเหตุการอนุมัติ" : "หมายเหตุการปฏิเสธ").fill(decision.remark)
      if (index === 0) await recordSettled(page, measure, "review dialog")
      await measure.timed(`${decision.action} ${decision.type} ${decision.tag}`, async () => {
        await dialog.getByRole("button", { name: approve ? "อนุมัติรายการไม่ตรง" : "ปฏิเสธรายการไม่ตรง" }).click()
        await expect(dialog).toBeHidden()
        await expect(entry).toHaveCount(0)
      })
      await expect(page.getByText(approve ? "อนุมัติรายการไม่ตรงและปรับข้อมูลทรัพย์สินสำเร็จ" : "ปฏิเสธรายการไม่ตรงสำเร็จ").first()).toBeVisible()
    }
    await recordSettled(page, measure, "findings of the round, all reviewed")

    // The approved department is the asset's now; the rejected condition is not (a GET of the asset).
    const mismatch = (await (await page.request.get(`/api/assets/${assets.mismatch.id}`)).json()) as { department: { code: string } | null; condition: { name: string } }
    expect(mismatch.department?.code, "the approved department").toBe(runDepartment)
    expect(mismatch.condition.name, "the rejected condition stays").toBe("Good")

    // The checklist is clear and the IT head did not open the round: the close goes through.
    await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page (IT head)")
    const close = page.getByRole("button", { name: "ปิดรอบตรวจ" })
    await expect(close).toBeEnabled()
    await expect(page.getByText("ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ")).toHaveCount(0)
    await close.click()
    const confirm = page.getByRole("alertdialog", { name: "ยืนยันปิดรอบตรวจนับนี้?" })
    await expect(confirm).toBeVisible()
    await recordSettled(page, measure, "close confirmation")
    await measure.timed("close the round", async () => {
      await confirm.getByRole("button", { name: "ปิดรอบตรวจ" }).click()
      await expect(page.getByText("ปิดรอบตรวจนับสำเร็จ")).toBeVisible()
      await expect(close).toHaveCount(0)
    })
    await expect(page.getByRole("main").getByText("ปิดรอบ", { exact: true }).first()).toBeVisible()
    await recordSettled(page, measure, "round page, closed")
  })
})

test.describe("The IT head's own round", () => {
  asUser("itHead")

  test("the IT head's own round: their own finding and their own close are refused, and the round is cancelled", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(180_000)
    const chain = readChain(testInfo.project.name)
    const { records, assets } = chain

    // A round of room B that the IT head opens themselves, through the round route with the body the form sends.
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
        status: "open",
      },
    })
    expect(opened.status(), "the IT head's round is saved").toBe(201)
    const own = (await opened.json()) as { id: string; auditNo: string; generatedItems: number }
    expect(own.generatedItems, "room B's two assets").toBe(2)

    // They mark one asset not found: the finding is theirs.
    await measure.visit(`/th/audit/rounds/${own.id}/pending`, "pending list of the IT head's round")
    const findingId = await pending.markNotFound(page, e2eDevice, assets.notFound.tag)

    // Their own finding: the note instead of the buttons, and the review route refuses it (segregation of duties).
    await measure.visit(`/th/audit/findings?status=pending&roundId=${own.id}`, "findings of the IT head's round")
    const entry = review.findingEntry(page, e2eDevice, assets.notFound.tag, "ไม่พบทรัพย์สิน")
    await expect(entry.getByText("ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้")).toBeVisible()
    await expect(entry.getByRole("button", { name: "อนุมัติ", exact: true })).toHaveCount(0)
    measure.expectRefusal({ method: "POST", url: new RegExp(`/api/audit-findings/${findingId}/review$`), status: 403, reason: "the reporter may not review their own finding (segregation of duties)" })
    const reviewed = await review.browserFetch(page, `/api/audit-findings/${findingId}/review`, "POST", { action: "approve" })
    expect(reviewed).toEqual({ status: 403, body: { error: "Audit finding must be reviewed by a different user than the reporter" } })

    // Their own round: the close waits with the rule beside it, and the close route refuses the opener (spec §6.2.4:
    // the rule as the code has it, src/app/api/audit-rounds/[id]/route.ts closeOwnRound).
    await measure.visit(`/th/audit/rounds/${own.id}`, "the IT head's round")
    await expect(page.getByText("ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ")).toBeVisible()
    await expect(page.getByRole("button", { name: "ปิดรอบตรวจ" })).toBeDisabled()
    measure.expectRefusal({ method: "PATCH", url: new RegExp(`/api/audit-rounds/${own.id}$`), status: 403, reason: "the opener may not close their own round (closeOwnRound)" })
    const closed = await review.browserFetch(page, `/api/audit-rounds/${own.id}`, "PATCH", { action: "close" })
    expect(closed).toEqual({ status: 403, body: { error: "Audit round must be closed by a different approver than the creator" } })

    // The round is cancelled with a reason; an empty reason first shows its error under the field.
    await page.getByRole("button", { name: "ยกเลิกรอบตรวจ" }).click()
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
      await expect(page.getByRole("link", { name: "ส่งออกรายการไม่ตรง" })).toHaveCount(0)
      await expect(page.getByRole("link", { name: "ส่งออก PDF" })).toHaveCount(0)
    })
  })

  test.describe("IT head", () => {
    asUser("itHead")

    test("the findings export downloads the round's findings (decision U1)", async ({ page, measure }, testInfo) => {
      const chain = readChain(testInfo.project.name)
      await measure.visit(`/th/audit/findings?status=all&roundId=${chain.roundId}`, "findings of the round, all (IT head)")
      const downloading = page.waitForEvent("download")
      await page.getByRole("link", { name: "ส่งออกรายการไม่ตรง" }).click()
      const download = await downloading
      // The file as downloaded, kept in the report.
      const file = await download.path().catch(() => null)
      if (file) await testInfo.attach(`download ${download.suggestedFilename()}`, { path: file, contentType: "application/octet-stream" })
      expect(download.suggestedFilename(), "an Excel file").toMatch(/\.xlsx$/)
      expect(file, "the download completed").not.toBeNull()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(file ?? "")
      // The "Asset Tag" column (src/lib/audit-excel.ts auditFindingColumns), found by its header.
      const sheet = workbook.getWorksheet("Audit Findings")
      const header = (sheet?.getRow(1).values ?? []) as unknown[]
      const tagColumn = header.indexOf("Asset Tag")
      expect(tagColumn, "the Asset Tag column").toBeGreaterThan(0)
      const tags = new Set<string>()
      sheet?.eachRow((row) => tags.add(String(row.getCell(tagColumn).value ?? "")))
      for (const asset of [chain.assets.mismatch, chain.assets.component2, chain.assets.notFound, chain.assets.outOfScope]) {
        expect(tags.has(asset.tag), `${asset.tag} is in the export`).toBe(true)
      }
    })
  })
})
