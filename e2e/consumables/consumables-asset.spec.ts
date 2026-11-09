// ของใช้สิ้นเปลือง (consumables plan 3 Task 4): the machine's panel on its overview (asset-consumables-panel.tsx) and the
// เครื่องที่เปลี่ยนของบ่อย report (/th/consumables?view=frequent, consumables-frequent-report.tsx).
// - No run role holds consumable:* (e2e/support/run-plan.ts): the story runs as the seed admin through its saved session
//   (ADMIN_STATE_FILE), as consumables.spec.ts does; at the end the page takes IT staff's saved session (actAs) and the
//   same machine shows no panel (no consumable:view).
// - The story (desktop-light and phone-light): a run kind "<run> <project> สายชาร์จทดสอบ" (the project's code keeps the
//   two projects' kinds apart) and 5 received, both through the consumables API as the setup; a run asset (the asset
//   API, as the transaction specs make theirs). On the asset page the panel says "ยังไม่มีการเปลี่ยนของให้เครื่องนี้";
//   "+ บันทึกเปลี่ยนของ" opens เบิกไปใช้ with the machine locked (no picker); เบิก 1 → the panel lists it; เบิก 1 more →
//   the often notice "เครื่องนี้เปลี่ยน<kind> 2 ครั้งใน 90 วัน". The report filtered to the kind lists the machine once,
//   ครั้งที่เปลี่ยน 2, ล่าสุด naming the kind; filtered to the machine (its chip "เครื่อง <tag>") it lists that machine only.
//   The kind is then deactivated (API) so the cabinet's list does not keep the run's kinds.
// Writes: the run's asset, the run kind, its receipt, its two issues (through the panel) and its deactivation. No other
// kind is touched; no DELETE; no database access outside the app. axe through recordSettled on every state.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { expect, test } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { actAs, toast } from "../disposal/disposal-support.ts"
import { bangkokDate, projectCode } from "../transactions/tx-plan.ts"
import { createTxAsset, pickSearchable, readAssetMasters } from "../transactions/tx-support.ts"
import { CONSUMABLES_WORDS as W } from "./consumables-words.ts"

const LIGHT_ONLY = "the story runs in desktop-light and phone-light (consumables plan 3 Task 4)"
// The kind's unit: the API's default (consumableItemSchema), as the kind dialog's.
const UNIT = "ชิ้น"
// The issue dialog's kind select (consumable-issue-dialog.tsx FIELD_IDS.itemId).
const ISSUE_ITEM = "consumable-issue-item"

// The machine's panel: the overview's section headed ของใช้สิ้นเปลือง.
const panel = (page: Page) =>
  page.getByRole("main").locator("section").filter({ has: page.getByRole("heading", { level: 2, name: W.assetTitle, exact: true }) })

// The panel's issues: the table's rows from md, the phone rows below it (both in the DOM; one shows).
const panelRows = (page: Page, device: E2eDevice): Locator =>
  device === "desktop" ? panel(page).locator("table tbody tr") : panel(page).locator('[data-slot="content-panel-rows"] > li')

// The report's machines: the table's rows from md, the phone rows below it.
const reportRows = (page: Page, device: E2eDevice): Locator =>
  device === "desktop"
    ? page.getByRole("main").locator("table tbody tr")
    : page.getByRole("main").locator('[data-slot="content-panel-rows"] > li')

async function openAsset(page: Page, assetId: string, name: string) {
  await page.goto(`/th/assets/${assetId}`, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
}

// The report's one row of the machine: its tag link, ครั้งที่เปลี่ยน, and ล่าสุด naming the kind.
async function expectReportRow(page: Page, device: E2eDevice, assetTag: string, count: number, kindName: string) {
  const rows = reportRows(page, device)
  await expect(rows).toHaveCount(1)
  const row = rows.first()
  await expect(row.getByRole("link", { name: assetTag, exact: true })).toBeVisible()
  if (device === "desktop") {
    await expect(row.locator("td").nth(2)).toHaveText(String(count))
    await expect(row.locator("td").nth(3)).toContainText(kindName)
  } else {
    await expect(row).toContainText(`${W.col_count} ${count}`)
    await expect(row).toContainText(kindName)
  }
}

test.describe("the machine's consumables as the seed admin: the panel, the often notice and the frequent report", () => {
  // The seed admin's saved session (written by the global setup): no run role holds consumable:*.
  test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

  test("record from the machine twice, the often notice, the report by kind and by machine, then IT staff see no panel", async ({ page, measure, e2eDevice, e2eTheme }, testInfo) => {
    test.skip(e2eTheme === "dark", LIGHT_ONLY)
    test.setTimeout(240_000)
    const kindName = `${readRunState().runId} ${projectCode(testInfo.project.name)} สายชาร์จทดสอบ`

    // Setup: the run's asset (Ready, in the run's room), then the run kind and 5 received, through the API.
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "CSA", "เครื่องเปลี่ยนของ")
    const created = await page.request.post("/api/consumables", { data: { name: kindName, unit: UNIT, minQuantity: 1 } })
    expect(created.status(), `POST /api/consumables: ${(await created.text()).slice(0, 300)}`).toBe(201)
    const kindId = ((await created.json()) as { id: string }).id
    expect(kindId, "the new kind's id").toBeTruthy()
    const received = await page.request.post("/api/consumables/receive", { data: { itemId: kindId, quantity: 5, receivedDate: bangkokDate() } })
    expect(received.status(), `POST /api/consumables/receive: ${(await received.text()).slice(0, 300)}`).toBe(200)

    // The machine's page: the panel, empty, with + บันทึกเปลี่ยนของ.
    await openAsset(page, asset.id, asset.name)
    await expect(panel(page)).toHaveCount(1)
    await expect(panel(page).getByText(W.assetEmpty, { exact: true })).toBeVisible()
    await expect(panel(page).locator('[data-slot="asset-consumables-often"]')).toHaveCount(0)
    await recordSettled(page, measure, "asset consumables panel, empty")

    // เบิก 1 from the panel: the dialog has the machine locked (no picker), the kind chosen from the select.
    const record = panel(page).getByRole("button", { name: W.assetRecord, exact: true })
    const issueDialog = page.getByRole("dialog", { name: W.issueTitle, exact: true })
    async function issueOne(onHand: number) {
      await record.click()
      await expect(issueDialog).toBeVisible()
      await expect(issueDialog.locator("[data-consumable-locked-asset]")).toContainText(`${asset.assetTag} · ${asset.name}`)
      await expect(issueDialog.locator("#consumable-issue-asset-search")).toHaveCount(0)
      await pickSearchable(page, ISSUE_ITEM, kindName, fillTemplate(W.itemOption, { name: kindName, onHand }))
      await expect(page.locator("#consumable-issue-quantity")).toHaveValue("1")
      await recordSettled(page, measure, `asset consumables: issue (${onHand} on hand)`)
      const answered = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/consumables/issue")
      await issueDialog.getByRole("button", { name: W.issueSubmit, exact: true }).click()
      const response = await answered
      expect(response.status(), `POST /api/consumables/issue: ${(await response.text()).slice(0, 300)}`).toBeLessThan(300)
    }

    await issueOne(5)
    // The toast and the refresh together: on a slow server the toast can end before the refreshed page arrives.
    await Promise.all([
      expect(toast(page, fillTemplate(W.issueToast, { name: kindName }))).toBeVisible(),
      expect(panelRows(page, e2eDevice)).toHaveCount(1),
    ])
    await expect(issueDialog).toBeHidden()
    await expect(panelRows(page, e2eDevice).first()).toContainText(kindName)
    await expect(panelRows(page, e2eDevice).first()).toContainText(`1 ${UNIT}`)
    await expect(panel(page).getByText(W.assetEmpty, { exact: true })).toHaveCount(0)
    await expect(panel(page).locator('[data-slot="asset-consumables-often"]')).toHaveCount(0)
    await recordSettled(page, measure, "asset consumables panel, one issue")

    // เบิก 1 more through the same panel: the often notice names the kind, 2 times in 90 days.
    await issueOne(4)
    const often = panel(page).locator('[data-slot="asset-consumables-often"]')
    // .last(): the first issue's toast can still be up (E2E-1110C).
    await Promise.all([
      expect(toast(page, fillTemplate(W.issueToast, { name: kindName })).last()).toBeVisible(),
      expect(panelRows(page, e2eDevice)).toHaveCount(2),
    ])
    await expect(issueDialog).toBeHidden()
    await expect(often).toBeVisible()
    await expect(often).toContainText(fillTemplate(W.assetOften, { itemName: kindName, count: 2 }))
    await recordSettled(page, measure, "asset consumables panel, often notice")

    // The report filtered to the kind: this machine only, 2 times, ล่าสุด names the kind.
    await page.goto(`/th/consumables?view=frequent&item=${encodeURIComponent(kindId)}`, { waitUntil: "load" })
    await expect(page.getByRole("main").locator('[data-slot="tab-nav"] a[aria-current="page"]')).toHaveText(W.tab_frequent)
    await expectReportRow(page, e2eDevice, asset.assetTag, 2, kindName)
    await recordSettled(page, measure, "consumables frequent report, by kind")

    // The report filtered to the machine: its chip, and the same machine only.
    await page.goto(`/th/consumables?view=frequent&asset=${encodeURIComponent(asset.id)}`, { waitUntil: "load" })
    const chips = page.getByRole("group", { name: W.activeFilters, exact: true })
    const chipLabel = fillTemplate(W.asset_chip, { tag: asset.assetTag })
    await expect(chips.getByRole("link", { name: `${W.clearDrilldownFilter}: ${chipLabel}`, exact: true })).toBeVisible()
    await expectReportRow(page, e2eDevice, asset.assetTag, 2, kindName)
    await recordSettled(page, measure, "consumables frequent report, by machine")

    // The run kind leaves the cabinet's list (its history stays).
    const deactivated = await page.request.patch(`/api/consumables/${kindId}`, { data: { isActive: false } })
    expect(deactivated.status(), `PATCH /api/consumables/${kindId}: ${(await deactivated.text()).slice(0, 300)}`).toBe(200)

    // Without permission: IT staff (no consumable:view) open the same machine and see no panel.
    await actAs(page, "itStaff", e2eTheme)
    await openAsset(page, asset.id, asset.name)
    await expect(page.getByRole("main").getByRole("heading", { level: 2, name: W.assetTitle, exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: W.assetRecord, exact: true })).toHaveCount(0)
    await recordSettled(page, measure, "asset page without consumable:view (IT staff)")
  })
})
