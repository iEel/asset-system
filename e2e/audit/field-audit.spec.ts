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
// 7. the audit exports by permission (spec §6.2.5, §6.5), expected to fail until finding AU1 and decision U1.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { asUser, expect, runPhoneOnWebKit, test } from "../support/fixtures.ts"
import { ADMIN_STATE_FILE, fromRoot, runDir } from "../support/paths.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { createAuditAssets, createAuditPlaces, readAuditMasters, type AuditWalkData } from "./audit-data.ts"
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
