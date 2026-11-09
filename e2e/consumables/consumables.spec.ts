// ของใช้สิ้นเปลือง (consumables plan 2 Task 5): the list page (/th/consumables), its dialogs and a kind's history page
// (/th/consumables/<id>).
// - No run role holds consumable:* (e2e/support/run-plan.ts): the user grants them later. The story runs as the seed
//   admin (system_admin holds consumable:* after the dev migration) through its saved session (ADMIN_STATE_FILE), as
//   e2e/admin/settings.spec.ts does; IT staff are checked refused: no menu row, the denied page for consumable:view,
//   and GET /api/consumables answers 403.
// - The story (desktop-light and phone-light): a run kind "<run> <project> เมาส์ทดสอบ" with ขั้นต่ำ 2 (the project's
//   code keeps the two projects' kinds apart: the name is unique); รับเข้า 3 → คงเหลือ 3 พอใช้; เบิก 2 to a run asset
//   through the picker (mode consumable) → คงเหลือ 1 ต้องซื้อเพิ่ม and the banner names the kind; เบิก 2 more → the hint "ของในตู้ไม่พอ
//   เหลือ 1 ชิ้น" under จำนวน, then the server's 409 says it under จำนวน (one request, nothing saved); ปรับยอด to 4 with a reason → คงเหลือ 4; the history lists รับเข้า +3, เบิก −2
//   with the asset's link and ปรับยอด +3 with the reason; ปิดใช้งาน names "ยังเหลือ 4 ชิ้น", the kind leaves the list, and
//   its history still opens, read-only.
// Writes: the run's asset (the asset API, as the transaction specs make theirs) and the run kind's own movements and
// deactivation, all through the page. No other kind is touched; no DELETE; no database access outside the app.
// axe through recordSettled on every state.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { menuItem } from "../asset-detail/detail-steps.ts"
import { menu, moreSheet, moreTab } from "../shell/shell-steps.ts"
import { fillTemplate, SHELL_WORDS } from "../shell/shell-words.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp, toast } from "../disposal/disposal-support.ts"
import { projectCode } from "../transactions/tx-plan.ts"
import { createTxAsset, pickAsset, readAssetMasters } from "../transactions/tx-support.ts"
import { CONSUMABLES_WORDS as W } from "./consumables-words.ts"

const LIST = "/th/consumables"
const LIGHT_ONLY = "the story runs in desktop-light and phone-light (consumables plan 2 Task 5)"
// The kind dialog's default unit (consumable-kind-dialog.tsx DEFAULT_UNIT), kept for the run kind.
const UNIT = "ชิ้น"
// The issue dialog's asset picker (consumable-issue-dialog.tsx FIELD_IDS.assetId): #<id>-search, #<id>-listbox.
const ISSUE_ASSET = "consumable-issue-asset"
const REASON = "E2E นับตู้ได้ 4 ชิ้น"

// The kind's name link: in the table from md and on its card below md (both in the DOM; one shows).
const kindLink = (page: Page, name: string) => page.getByRole("main").getByRole("link", { name, exact: true })

// The kind's row: the table's row on the desktop, its card on the phone.
function kindRow(page: Page, device: E2eDevice, name: string): Locator {
  const link = page.getByRole("link", { name, exact: true })
  return device === "desktop"
    ? page.getByRole("main").locator("table tbody tr").filter({ has: link })
    : page.locator("[data-consumables-cards] article").filter({ has: link })
}

// คงเหลือ "<n> ชิ้น" (the table's second cell, or the card's first value) and the state badge.
async function expectKind(page: Page, device: E2eDevice, name: string, onHand: number, state: string) {
  const row = kindRow(page, device, name)
  await expect(row).toHaveCount(1)
  const count = device === "desktop" ? row.locator("td").nth(1) : row.locator("dd").first()
  await expect(count).toHaveText(`${onHand} ${UNIT}`)
  await expect(row.locator('[data-slot="status-badge"]')).toHaveText(state)
}

// The row's ⋯ (named "การดำเนินการของ <name>"), then one of its items.
async function chooseFromMenu(page: Page, device: E2eDevice, name: string, item: string) {
  await kindRow(page, device, name).getByRole("button", { name: fillTemplate(W.moreActionsFor, { code: name }), exact: true }).click()
  // The dropdown on the desktop, the bottom sheet (buttons and links) on the phone (E2E-1110A).
  const actions = device === "desktop" ? page.getByRole("menu") : page.getByRole("dialog").filter({ visible: true }).last()
  await expect(actions).toBeVisible()
  await menuItem(actions, item).click()
}

// The row's เบิก (its name carries the kind's, read by a screen reader only).
const issueButton = (page: Page, device: E2eDevice, name: string) =>
  kindRow(page, device, name).getByRole("button", { name: new RegExp(`^${W.issueShort}\\s+${escapeRegExp(name)}$`) })

// The dialog's submit, and the route's answer to it.
async function submit(page: Page, dialog: Locator, button: string, path: string, method = "POST") {
  const answered = page.waitForResponse((response) => new URL(response.url()).pathname === path && response.request().method() === method)
  await dialog.getByRole("button", { name: button, exact: true }).click()
  const response = await answered
  expect(response.status(), `${method} ${path}: ${(await response.text()).slice(0, 300)}`).toBeLessThan(300)
  return response
}

// The menu row ของใช้สิ้นเปลือง: in the desktop menu, or in the phone's เพิ่มเติม sheet (the same config).
async function expectMenuRow(page: Page, device: E2eDevice, shown: boolean) {
  if (device === "desktop") {
    await expect(menu(page).getByRole("link", { name: SHELL_WORDS.assetRegister, exact: true })).toBeVisible()
    const row = menu(page).getByRole("link", { name: W.navConsumables, exact: true })
    await (shown ? expect(row.filter({ visible: true })).toHaveCount(1) : expect(row).toHaveCount(0))
    return
  }
  await moreTab(page).click()
  const sheet = moreSheet(page)
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole("link", { name: SHELL_WORDS.assetRegister, exact: true })).toBeVisible()
  const row = sheet.getByRole("link", { name: W.navConsumables, exact: true })
  await (shown ? expect(row.filter({ visible: true })).toHaveCount(1) : expect(row).toHaveCount(0))
  await sheet.getByRole("button", { name: SHELL_WORDS.close, exact: true }).click()
  await expect(sheet).toBeHidden()
}

async function openList(page: Page) {
  await page.goto(LIST, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible()
}

test.describe("IT staff without consumable permissions", () => {
  asUser("itStaff")

  test("no menu row, the page refused, and the API answers 403", async ({ page, measure, e2eDevice, e2eTheme }) => {
    test.skip(e2eTheme === "dark", LIGHT_ONLY)
    await page.goto("/th/dashboard", { waitUntil: "load" })
    await expectMenuRow(page, e2eDevice, false)

    // The dashboard's loading.tsx streams the page, so requirePagePermission's redirect lands after the first load.
    await page.goto(LIST, { waitUntil: "load" })
    await expect(page).toHaveURL(new RegExp(`/th/access-denied\\?(?=.*module=consumable)(?=.*action=view)`))
    await page.waitForLoadState("load")
    await recordSettled(page, measure, "consumables: denied (IT staff)")

    const denied = await page.request.get("/api/consumables")
    expect(denied.status(), "GET /api/consumables as IT staff").toBe(403)
  })
})

test.describe("the cabinet as the seed admin: a run kind from add to deactivate", () => {
  // The seed admin's saved session (written by the global setup): no run role holds consumable:*.
  test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

  test("receive, issue through the picker, short, adjust, history and deactivate", async ({ page, measure, e2eDevice, e2eTheme }, testInfo) => {
    test.skip(e2eTheme === "dark", LIGHT_ONLY)
    test.setTimeout(240_000)
    const kindName = `${readRunState().runId} ${projectCode(testInfo.project.name)} เมาส์ทดสอบ`

    // The run's asset for the issue: Ready, in the run's room, through the asset API (as the transaction specs).
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "CSM", "เครื่องรับเมาส์")

    // The menu row (desktop menu or the phone's เพิ่มเติม sheet), then the list.
    await page.goto("/th/dashboard", { waitUntil: "load" })
    await expectMenuRow(page, e2eDevice, true)
    await openList(page)
    await recordSettled(page, measure, "consumables list")

    // A run kind with ขั้นต่ำ 2: + เพิ่มชนิดของ below the table, or the empty state's button in an empty cabinet.
    await page.getByRole("button", { name: W.addKind, exact: true }).or(page.getByRole("button", { name: W.emptyAction, exact: true })).click()
    const kindDialog = page.getByRole("dialog", { name: W.createTitle, exact: true })
    await expect(kindDialog).toBeVisible()
    await page.locator("#consumable-kind-name").fill(kindName)
    await expect(page.locator("#consumable-kind-unit")).toHaveValue(UNIT)
    await page.locator("#consumable-kind-min").fill("2")
    await recordSettled(page, measure, "consumables: add a kind")
    const created = await submit(page, kindDialog, W.createSubmit, "/api/consumables")
    const kindId = ((await created.json()) as { id: string }).id
    expect(kindId, "the new kind's id").toBeTruthy()
    // The toast and the refresh together: on a slow server the toast can end before the refreshed page arrives.
    await Promise.all([
      expect(toast(page, fillTemplate(W.createToast, { name: kindName }))).toBeVisible(),
      expectKind(page, e2eDevice, kindName, 0, W.state_out),
    ])
    await expect(kindDialog).toBeHidden()

    // รับเข้า 3 from the row's ⋯ (the kind preselected; today's date).
    await chooseFromMenu(page, e2eDevice, kindName, W.menu_receive)
    const receiveDialog = page.getByRole("dialog", { name: W.receiveTitle, exact: true })
    await expect(receiveDialog).toBeVisible()
    await expect(page.locator("#consumable-receive-item")).toContainText(kindName)
    await page.locator("#consumable-receive-quantity").fill("3")
    await recordSettled(page, measure, "consumables: receive")
    await submit(page, receiveDialog, W.receiveSubmit, "/api/consumables/receive")
    await Promise.all([
      expect(toast(page, fillTemplate(W.receiveToast, { name: kindName }))).toBeVisible(),
      expectKind(page, e2eDevice, kindName, 3, W.state_ok),
    ])
    await expect(receiveDialog).toBeHidden()
    await recordSettled(page, measure, "consumables list, after receive")

    // เบิก 2 to the run asset through the picker → คงเหลือ 1, ต้องซื้อเพิ่ม, and the banner names the kind.
    await issueButton(page, e2eDevice, kindName).click()
    const issueDialog = page.getByRole("dialog", { name: W.issueTitle, exact: true })
    await expect(issueDialog).toBeVisible()
    await expect(page.locator("#consumable-issue-item")).toContainText(kindName)
    await page.locator("#consumable-issue-quantity").fill("2")
    await pickAsset(page, ISSUE_ASSET, asset.assetTag, asset.assetTag)
    await recordSettled(page, measure, "consumables: issue")
    await submit(page, issueDialog, W.issueSubmit, "/api/consumables/issue")
    const lowBanner = page.getByRole("main").getByRole("status").filter({ hasText: fillTemplate(W.lowItem, { name: kindName, onHand: 1 }) })
    await Promise.all([
      expect(toast(page, fillTemplate(W.issueToast, { name: kindName }))).toBeVisible(),
      expectKind(page, e2eDevice, kindName, 1, W.state_low),
    ])
    await expect(issueDialog).toBeHidden()
    await expect(lowBanner).toBeVisible()
    await expect(lowBanner).toContainText(W.state_low)
    await recordSettled(page, measure, "consumables list, low after issue")

    // เบิก 2 more: the list's count is only a hint under จำนวน; the server's 409 CONSUMABLE_SHORT refuses it with the count left.
    let sentIssues = 0
    const countIssue = (request: { method(): string; url(): string }) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/consumables/issue") sentIssues += 1
    }
    page.on("request", countIssue)
    await issueButton(page, e2eDevice, kindName).click()
    await expect(issueDialog).toBeVisible()
    await page.locator("#consumable-issue-quantity").fill("2")
    await expect(page.locator("#consumable-issue-quantity-hint")).toHaveText(fillTemplate(W.shortWithCount, { onHand: 1, unit: UNIT }))
    await pickAsset(page, ISSUE_ASSET, asset.assetTag, asset.assetTag)
    const shortAnswer = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/consumables/issue")
    await issueDialog.getByRole("button", { name: W.issueSubmit, exact: true }).click()
    expect((await shortAnswer).status(), "the server refuses the short issue").toBe(409)
    await expect(page.locator("#consumable-issue-quantity-error")).toHaveText(fillTemplate(W.shortWithCount, { onHand: 1, unit: UNIT }))
    await expect(page.locator("#consumable-issue-quantity")).toBeFocused()
    await recordSettled(page, measure, "consumables: issue, short")
    page.off("request", countIssue)
    expect(sentIssues, "the short issue is asked of the server once").toBe(1)
    await issueDialog.getByRole("button", { name: W.cancel, exact: true }).click()
    await expect(issueDialog).toBeHidden()

    // ปรับยอด to 4 with a reason → คงเหลือ 4, พอใช้, and the banner no longer names the kind.
    await chooseFromMenu(page, e2eDevice, kindName, W.menu_adjust)
    const adjustDialog = page.getByRole("dialog", { name: fillTemplate(W.adjustTitle, { name: kindName }), exact: true })
    await expect(adjustDialog).toBeVisible()
    await expect(page.locator("#consumable-adjust-counted")).toHaveValue("1")
    await page.locator("#consumable-adjust-counted").fill("4")
    await expect(page.locator("#consumable-adjust-counted-hint")).toHaveText(fillTemplate(W.adjustLine, { from: 1, to: 4, diff: "+3" }))
    await page.locator("#consumable-adjust-reason").fill(REASON)
    await recordSettled(page, measure, "consumables: adjust")
    await submit(page, adjustDialog, W.adjustSubmit, "/api/consumables/adjust")
    await Promise.all([
      expect(toast(page, fillTemplate(W.adjustToast, { name: kindName }))).toBeVisible(),
      expectKind(page, e2eDevice, kindName, 4, W.state_ok),
    ])
    await expect(adjustDialog).toBeHidden()
    await expect(page.getByRole("main").getByRole("status").filter({ hasText: kindName })).toHaveCount(0)

    // The history, newest first: ปรับยอด +3 with the reason, เบิก −2 (U+2212) with the asset's link, รับเข้า +3.
    await kindLink(page, kindName).filter({ visible: true }).click()
    await page.waitForURL((url) => url.pathname === `/th/consumables/${kindId}`)
    await expect(page.getByRole("heading", { level: 1, name: kindName, exact: true })).toBeVisible()
    await expect(page.getByText(fillTemplate(W.detailMeta, { onHand: 4, unit: UNIT, min: 2 }), { exact: true })).toBeVisible()
    const movements = e2eDevice === "desktop"
      ? page.getByRole("main").locator("table tbody tr")
      : page.locator("[data-consumable-history-cards] article")
    await expect(movements).toHaveCount(3)
    await expect(movements.nth(0)).toContainText(W.type_adjust)
    await expect(movements.nth(0)).toContainText("+3")
    await expect(movements.nth(0)).toContainText(REASON)
    await expect(movements.nth(1)).toContainText(W.type_issue)
    await expect(movements.nth(1)).toContainText("−2")
    await expect(movements.nth(1).getByRole("link", { name: new RegExp(escapeRegExp(asset.assetTag)) })).toHaveAttribute("href", `/th/assets/${asset.id}`)
    await expect(movements.nth(2)).toContainText(W.type_receive)
    await expect(movements.nth(2)).toContainText("+3")
    await recordSettled(page, measure, "consumable history")

    // ปิดใช้งาน from the list: the confirm names what is left; the kind leaves the list.
    await openList(page)
    await chooseFromMenu(page, e2eDevice, kindName, W.menu_deactivate)
    const confirm = page.getByRole("alertdialog", { name: fillTemplate(W.deactivateTitle, { name: kindName }), exact: true })
    await expect(confirm).toBeVisible()
    await expect(confirm).toContainText(fillTemplate(W.deactivateBody, { onHand: 4, unit: UNIT }))
    await recordSettled(page, measure, "consumables: deactivate confirm")
    await submit(page, confirm, W.deactivateConfirm, `/api/consumables/${kindId}`, "PATCH")
    await Promise.all([
      expect(toast(page, fillTemplate(W.deactivateToast, { name: kindName }))).toBeVisible(),
      expect(kindLink(page, kindName)).toHaveCount(0),
    ])
    await expect(confirm).toBeHidden()
    await recordSettled(page, measure, "consumables list, after deactivate")

    // Its history still opens: ปิดใช้งานแล้ว, no action, the three movements.
    await page.goto(`/th/consumables/${kindId}`, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: kindName, exact: true })).toBeVisible()
    await expect(page.locator('[data-slot="status-badge"]').filter({ hasText: W.inactiveBadge }).filter({ visible: true })).toHaveCount(1)
    const main = page.getByRole("main")
    for (const name of [W.issueShort, W.receive, W.adjustShort, W.editShort]) await expect(main.getByRole("button", { name, exact: true })).toHaveCount(0)
    await expect(movements).toHaveCount(3)
    await recordSettled(page, measure, "consumable history, inactive")
  })
})
