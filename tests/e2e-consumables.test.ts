import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The ของใช้สิ้นเปลือง E2E spec (consumables plan 2 Task 5, plan
// .superpowers/sdd/2026-11-10-consumables-2-list-dialogs-history): what it stands on — the app's own words, the seed
// admin's saved session (no run role holds consumable:*), IT staff refused, a run-marked kind only, and the story's
// steps. The spec runs with `npx playwright test e2e/consumables`; these pins need no app. Reads strip \r (the working
// tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []
const SPEC = "e2e/consumables/consumables.spec.ts"

test("the consumables spec reads the app's own words (consumables plan 2 task 5)", async () => {
  const { CONSUMABLES_WORDS: W } = await import("../e2e/consumables/consumables-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const all = new Set(values(th))
  for (const [name, text] of Object.entries(W)) assert.ok(all.has(text), `${name}: "${text}" is a value of messages/th.json`)
  const c = th.consumablesPage
  assert.equal(W.navConsumables, th.nav.consumables)
  assert.equal(W.cancel, th.common.cancel)
  assert.equal(W.moreActionsFor, th.common.moreActionsFor)
  const pageKeys = [
    "title", "issueShort", "lowItem", "state_ok", "state_low", "state_out", "menu_receive", "menu_adjust", "menu_deactivate",
    "addKind", "emptyAction", "createTitle", "createSubmit", "createToast", "issueTitle", "issueSubmit", "issueToast",
    "receiveTitle", "receiveSubmit", "receiveToast", "adjustTitle", "adjustSubmit", "adjustToast", "adjustLine",
    "deactivateTitle", "deactivateBody", "deactivateConfirm", "deactivateToast", "shortWithCount", "detailMeta",
    "inactiveBadge", "type_receive", "type_issue", "type_adjust", "receive", "adjustShort", "editShort",
  ] as const
  for (const key of pageKeys) assert.equal(W[key], c[key], `consumablesPage.${key}`)
  // The default unit the kind dialog starts with (consumable-kind-dialog.tsx DEFAULT_UNIT) and the story's short line.
  assert.match(read("src/components/consumables/consumable-kind-dialog.tsx"), /const DEFAULT_UNIT = "ชิ้น"/)
  const { fillTemplate } = await import("../e2e/shell/shell-words.ts")
  assert.equal(fillTemplate(W.shortWithCount, { onHand: 1, unit: "ชิ้น" }), "ของในตู้ไม่พอ เหลือ 1 ชิ้น")
  assert.ok(fillTemplate(W.deactivateBody, { onHand: 4, unit: "ชิ้น" }).startsWith("ยังเหลือ 4 ชิ้น"))
})

test("the spec runs as the seed admin with IT staff refused, through the suite's fixtures and recordSettled (consumables plan 2 task 5)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  // No run role holds consumable:*: the story needs the seed admin (system_admin), and IT staff are refused.
  for (const [user, permissions] of Object.entries(E2E_ROLE_PERMISSIONS)) {
    assert.ok(!permissions.some((permission: string) => permission.startsWith("consumable:")), `${user} holds no consumable permission`)
  }
  const spec = read(SPEC)
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!spec.includes(`from "@playwright/test"`), "nothing from @playwright/test")
  assert.ok(spec.includes("test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })"), "the seed admin's saved session")
  assert.ok(spec.includes(`asUser("itStaff")`), "IT staff for the refusal")
  assert.ok(spec.includes(`import { recordSettled } from "../audit/settle.ts"`), "axe once settled")
  assert.ok(!spec.includes("measure.recordPage("), "axe through recordSettled")
  assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), "the phone on Chromium")
  // Light only: desktop-light and phone-light.
  assert.ok(spec.includes(`test.skip(e2eTheme === "dark", LIGHT_ONLY)`))
  // The refusal: the denied page for consumable:view, no menu row, and the API's 403.
  assert.ok(spec.includes("/th/access-denied\\\\?(?=.*module=consumable)(?=.*action=view)"))
  assert.ok(spec.includes(`expect(denied.status(), "GET /api/consumables as IT staff").toBe(403)`))
  // No DELETE, no hazard, no DB, no other kind touched: the only writes are the run's asset and the run kind's own.
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(|signInOnce\(|\/api\/admin\/|prisma|sqlcmd/)
  assert.doesNotMatch(spec, /request\.(?:post|put|patch)\("\/api\/consumables/, "stock changes through the page, never the API")
  assert.ok(spec.includes("const kindName = `${readRunState().runId} ${projectCode(testInfo.project.name)} เมาส์ทดสอบ`"), "a run-marked kind per project")
})

test("the story: add a kind with min 2, receive 3, issue 2 through the picker, short by one, adjust to 4, the history and deactivate (consumables plan 2 task 5)", () => {
  const spec = read(SPEC)
  for (const step of [
    // The kind, run-marked, min 2.
    `await page.locator("#consumable-kind-min").fill("2")`,
    // รับเข้า 3 → คงเหลือ 3, พอใช้.
    `expectKind(page, e2eDevice, kindName, 3, W.state_ok)`,
    // เบิก 2 to the run asset through the picker → คงเหลือ 1, ต้องซื้อเพิ่ม, and the banner names it.
    `await pickAsset(page, ISSUE_ASSET, asset.assetTag, asset.assetTag)`,
    `expectKind(page, e2eDevice, kindName, 1, W.state_low)`,
    "fillTemplate(W.lowItem, { name: kindName, onHand: 1 })",
    // เบิก 2 more → the snapshot's count as a hint, then the server's 409 line under จำนวน (plan 2 final review: no client block).
    `await expect(page.locator("#consumable-issue-quantity-hint")).toHaveText(fillTemplate(W.shortWithCount, { onHand: 1, unit: UNIT }))`,
    `expect((await shortAnswer).status(), "the server refuses the short issue").toBe(409)`,
    `await expect(page.locator("#consumable-issue-quantity-error")).toHaveText(fillTemplate(W.shortWithCount, { onHand: 1, unit: UNIT }))`,
    `expect(sentIssues, "the short issue is asked of the server once").toBe(1)`,
    // ปรับยอด to 4 with a reason → คงเหลือ 4.
    `await page.locator("#consumable-adjust-counted").fill("4")`,
    `expectKind(page, e2eDevice, kindName, 4, W.state_ok)`,
    // The history: receive +3, issue −2 with the asset link, adjust +3 with the reason.
    "`/th/assets/${asset.id}`",
    `"−2"`,
    // ปิดใช้งาน: the confirm names ยังเหลือ 4 ชิ้น; the kind leaves the list; its history still opens.
    "fillTemplate(W.deactivateBody, { onHand: 4, unit: UNIT })",
    `expect(kindLink(page, kindName)).toHaveCount(0)`,
    `W.inactiveBadge`,
  ]) assert.ok(spec.includes(step), step)
  // The toast and the refresh together: on a slow server the toast can end before the refreshed page arrives.
  assert.ok((spec.match(/await Promise\.all\(\[\n\s*expect\(toast\(page, /g) ?? []).length >= 5, "each save waits for its toast with the refresh")
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 8, "axe on every state")
})

// Plan 3 Task 4 (.superpowers/sdd/2026-11-10-consumables-3-asset-section-report): the machine's panel and the
// เครื่องที่เปลี่ยนของบ่อย report, in e2e/consumables/consumables-asset.spec.ts.
const ASSET_SPEC = "e2e/consumables/consumables-asset.spec.ts"

test("the asset spec reads the panel's and the report's own words (consumables plan 3 task 4)", async () => {
  const { CONSUMABLES_WORDS: W } = await import("../e2e/consumables/consumables-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const a = th.assetConsumables
  assert.equal(W.assetTitle, a.title)
  assert.equal(W.assetRecord, a.record)
  assert.equal(W.assetEmpty, a.empty)
  assert.equal(W.assetOften, a.often)
  for (const key of ["itemOption", "tab_frequent", "col_count", "latest_value", "asset_chip", "issueTitle", "issueSubmit", "issueToast"] as const) {
    assert.equal(W[key], th.consumablesPage[key], `consumablesPage.${key}`)
  }
  assert.equal(W.activeFilters, th.asset.activeFilters)
  assert.equal(W.clearDrilldownFilter, th.asset.clearDrilldownFilter)
  // The words the panel and the report use, from the components the spec reads.
  const panel = read("src/components/assets/detail/asset-consumables-panel.tsx")
  for (const key of ["title", "record", "empty", "often"]) assert.ok(panel.includes(`t("${key}"`), `the panel says assetConsumables.${key}`)
  assert.ok(panel.includes(`data-slot="asset-consumables-often"`), "the often notice's hook")
  const report = read("src/components/consumables/consumables-frequent-report.tsx")
  for (const key of ["col_count", "latest_value", "tab_frequent"]) assert.ok(report.includes(`t("${key}"`), `the report says consumablesPage.${key}`)
  assert.ok(report.includes(`label={tAsset("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")}`), "the machine chip's group and remove words")
  const { fillTemplate } = await import("../e2e/shell/shell-words.ts")
  assert.equal(fillTemplate(W.assetOften, { itemName: "สายชาร์จ", count: 2 }), "เครื่องนี้เปลี่ยนสายชาร์จ 2 ครั้งใน 90 วัน")
  assert.equal(fillTemplate(W.itemOption, { name: "สายชาร์จ", onHand: 5 }), "สายชาร์จ (คงเหลือ 5)")
})

test("the asset spec runs as the seed admin, light only, with a run-marked kind and IT staff last (consumables plan 3 task 4)", () => {
  const spec = read(ASSET_SPEC)
  assert.ok(spec.includes(`import { expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!spec.includes(`from "@playwright/test"`), "nothing from @playwright/test")
  assert.ok(spec.includes("test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })"), "the seed admin's saved session")
  assert.ok(spec.includes(`test.skip(e2eTheme === "dark", LIGHT_ONLY)`), "desktop-light and phone-light")
  assert.ok(spec.includes(`import { recordSettled } from "../audit/settle.ts"`), "axe once settled")
  assert.ok(!spec.includes("measure.recordPage("), "axe through recordSettled")
  assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), "the phone on Chromium")
  assert.ok(spec.includes("const kindName = `${readRunState().runId} ${projectCode(testInfo.project.name)} สายชาร์จทดสอบ`"), "a run-marked kind per project")
  // No DELETE, no DB; the issues go through the panel, never the API.
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(|signInOnce\(|\/api\/admin\/|prisma|sqlcmd/)
  assert.doesNotMatch(spec, /request\.post\("\/api\/consumables\/(?:issue|adjust)/, "issues through the panel")
  // IT staff come last: the session swap ends the admin's part.
  const swap = spec.indexOf(`await actAs(page, "itStaff", e2eTheme)`)
  assert.ok(swap > 0, "IT staff through actAs")
  assert.ok(swap > spec.lastIndexOf("/th/consumables?view=frequent"), "after the report")
})

test("the asset story: empty panel, record twice with the machine locked, the often notice, the report by kind and by machine, no panel for IT staff (consumables plan 3 task 4)", () => {
  const spec = read(ASSET_SPEC)
  for (const step of [
    // Setup: 5 received.
    "data: { itemId: kindId, quantity: 5, receivedDate: bangkokDate() }",
    // The empty panel.
    "panel(page).getByText(W.assetEmpty, { exact: true })",
    // The dialog from + บันทึกเปลี่ยนของ, the machine locked.
    `panel(page).getByRole("button", { name: W.assetRecord, exact: true })`,
    "toContainText(`${asset.assetTag} · ${asset.name}`)",
    `issueDialog.locator("#consumable-issue-asset-search")).toHaveCount(0)`,
    "await issueOne(5)",
    "expect(panelRows(page, e2eDevice)).toHaveCount(1)",
    "await issueOne(4)",
    "expect(panelRows(page, e2eDevice)).toHaveCount(2)",
    // The often notice.
    "fillTemplate(W.assetOften, { itemName: kindName, count: 2 })",
    // The report by kind and by machine.
    "`/th/consumables?view=frequent&item=${encodeURIComponent(kindId)}`",
    "`/th/consumables?view=frequent&asset=${encodeURIComponent(asset.id)}`",
    "fillTemplate(W.asset_chip, { tag: asset.assetTag })",
    "await expectReportRow(page, e2eDevice, asset.assetTag, 2, kindName)",
    // IT staff: no panel.
    `getByRole("heading", { level: 2, name: W.assetTitle, exact: true })).toHaveCount(0)`,
  ]) assert.ok(spec.includes(step), step)
  assert.equal((spec.match(/await expectReportRow\(page, e2eDevice, asset\.assetTag, 2, kindName\)/g) ?? []).length, 2, "both report filters")
  assert.ok((spec.match(/await Promise\.all\(\[\n\s*expect\(toast\(page, /g) ?? []).length >= 2, "each issue waits for its toast with the refresh")
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 7, "axe on every state")
})

// Plan 4 Task 3 (.superpowers/sdd/2026-11-10-consumables-4-low-stock-warning): the low-stock warning on the work
// center, the notifications page, the bell and the filtered list, in e2e/consumables/consumables-warning.spec.ts.
const WARNING_SPEC = "e2e/consumables/consumables-warning.spec.ts"

test("the warning spec reads the topic's, the chip's and the work center's own words (consumables plan 4 task 3)", async () => {
  const { CONSUMABLES_WORDS: W } = await import("../e2e/consumables/consumables-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  assert.equal(W.filterLow, th.consumablesPage.filterLow)
  assert.equal(W.lowTopic, th.notifications.consumablesLow)
  assert.equal(W.bellEmpty, th.notifications.bellEmpty)
  assert.equal(W.notificationsTitle, th.notifications.title)
  assert.equal(W.advanceSection, th.notifications.sections.advance)
  assert.equal(W.topicMenu, th.notifications.actions.menu)
  assert.equal(W.workCenterTitle, th.workCenter.title)
  assert.equal(W.trackingAdvance, th.workCenter.tracking.advance)
  // The bell's row and the topic's link: the filtered list (Task 1's href); the chip from Task 2's list page.
  assert.ok(read("src/lib/waiting-work-rules.ts").includes("consumablesLow: (locale) => `/${locale}/consumables?state=low`"), "the topic's href")
  assert.ok(read("src/app/[locale]/(dashboard)/consumables/page.tsx").includes(`label: t("filterLow")`), "the list's chip")
  assert.match(read("src/components/work-center/work-center-tracking.tsx"), /href=\{`\/\$\{locale\}\/notifications#advance`\}/)
  assert.ok(read("src/components/layout/notification-bell.tsx").includes(`tNotifications("bellEmpty")`), "the bell's empty state")
})

test("the warning spec runs as the seed admin, light only, with a run-marked kind deactivated at the end and IT staff in their own context (consumables plan 4 task 3)", () => {
  const spec = read(WARNING_SPEC)
  assert.ok(spec.includes(`import { expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!spec.includes(`from "@playwright/test"`), "nothing from @playwright/test")
  assert.ok(spec.includes("test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })"), "the seed admin's saved session")
  assert.ok(spec.includes(`test.skip(e2eTheme === "dark", LIGHT_ONLY)`), "desktop-light and phone-light")
  assert.ok(spec.includes(`import { recordSettled } from "../audit/settle.ts"`), "axe once settled")
  assert.ok(!spec.includes("measure.recordPage("), "axe through recordSettled")
  assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), "the phone on Chromium")
  assert.ok(spec.includes("const kindName = `${runId} ${projectCode(testInfo.project.name)} หมึกทดสอบ`"), "a run-marked kind per project")
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(|signInOnce\(|\/api\/admin\/|prisma|sqlcmd/)
  // The setup through the API (min 2, 1 received); the restock through the page.
  assert.ok(spec.includes("data: { name: kindName, unit: UNIT, minQuantity: 2 }"))
  assert.ok(spec.includes("data: { itemId: kindId, quantity: 1, receivedDate: bangkokDate() }"))
  assert.doesNotMatch(spec, /quantity: 5/, "the restock through the row's ⋯")
  // Plan 4 final review: the deactivation in test.afterEach through a request context of its own, so a failed step or a
  // test timeout (which ends the test's own page) leaves no low kind behind.
  assert.ok(spec.includes("let kindId: string | null = null"), "the kind's id at describe scope")
  assert.ok(spec.includes("kindId = ((await created.json()) as { id: string }).id"), "recorded as soon as it is created")
  const afterAt = spec.indexOf("test.afterEach(async ({ playwright }) => {")
  assert.ok(afterAt > 0, "the cleanup in test.afterEach")
  const after = spec.slice(afterAt)
  assert.ok(after.includes("const admin = await playwright.request.newContext({ baseURL, storageState: fromRoot(ADMIN_STATE_FILE) })"), "its own admin context")
  assert.ok(after.includes("admin.patch(`/api/consumables/${id}`, { data: { isActive: false } })"), "deactivated")
  assert.ok(after.includes("await admin.dispose()"), "the context disposed")
  assert.ok(!spec.includes("page.request.patch("), "never through the test's page")
  // IT staff in their own saved session while the kind is low, before the restock.
  const staffAt = spec.indexOf(`storageState: fromRoot(authStateFile(runId, "itStaff"))`)
  assert.ok(staffAt > 0 && staffAt < spec.indexOf("W.menu_receive"), "IT staff while the kind is low")
  assert.ok(spec.includes(`expect(keys, "IT staff's summary has no consumablesLow").not.toContain("consumablesLow")`))
  // Plan 4 final review: the summary reads every queue of the dev copy, so it gets the heavy timeout (also the admin's).
  assert.ok(spec.includes(`staffPage.request.get("/api/notifications", { timeout: HEAVY_MS })`), "IT staff's summary, heavy timeout")
  assert.doesNotMatch(spec, /\.get\("\/api\/notifications"\)/, "no summary read without the heavy timeout")
  assert.ok(spec.includes("await expect(bellRow(staffBox)).toHaveCount(0)"))
})

test("the warning story: the work center and the notifications page before the bell, the bell's link to the filtered list, then restocked (consumables plan 4 task 3)", async () => {
  const spec = read(WARNING_SPEC)
  const steps = [
    // Plan 4 final review: the admin's summary lists consumablesLow, at least 1, just before the work center…
    `page.request.get("/api/notifications", { timeout: HEAVY_MS })`,
    `expect(low?.count ?? 0, "the admin's summary: consumablesLow").toBeGreaterThanOrEqual(1)`,
    `await page.goto("/th/work-center", { waitUntil: "load", timeout: HEAVY_MS })`,
    // …whose เตือนล่วงหน้า row links to the notifications page's section and counts the summary's advance keys.
    `await expect(advanceRow).toHaveAttribute("href", "/th/notifications#advance")`,
    `.toBe(advanceSum)`,
    "}).toPass({ timeout: HEAVY_MS * 2 })",
    // The notifications page's section, ทั้งหมด.
    `"/th/notifications?status=all#advance"`,
    `fillTemplate(W.topicMenu, { title: W.lowTopic })`,
    // The bell: the topic, at least 1, its link the filtered list (clicked after the pages above: it marks the topic read).
    "await expect(row).toHaveAttribute(\"href\", LOW_LIST)",
    `expect(toNumber(await row.locator(".num").innerText()), "the bell's count").toBeGreaterThanOrEqual(1)`,
    "await row.click()",
    // The filtered list: the chip, the kind ต้องซื้อเพิ่ม, the banner.
    "`${W.clearDrilldownFilter}: ${W.filterLow}`",
    `toHaveText(W.state_low)`,
    "fillTemplate(W.lowItem, { name: kindName, onHand: 1 })",
    // The restock: 5 more, the kind leaves the filtered list.
    `await page.locator("#consumable-receive-quantity").fill("5")`,
    "expect(kindLink(page, kindName)).toHaveCount(0)",
  ]
  let at = -1
  for (const step of steps) {
    const next = spec.indexOf(step, at + 1)
    assert.ok(next > at, `in order: ${step}`)
    at = next
  }
  // Shared dev data: counts are at least 1, never exact, and never asserted back to 0.
  // Plan 4 final review: the admin's consumablesLow, the notifications page and the bell (the work center's row is the
  // summary's advance sum, exactly).
  assert.equal((spec.match(/toBeGreaterThanOrEqual\(1\)/g) ?? []).length, 3, "the three counts")
  // The advance keys the spec sums are the work center's (src/lib/work-queues.ts).
  const { ADVANCE_WARNING_KEYS } = await import("../src/lib/work-queues.ts")
  assert.ok(spec.includes(`const ADVANCE_KEYS: readonly string[] = ${JSON.stringify(ADVANCE_WARNING_KEYS).replaceAll(",", ", ")}`), "the advance keys")
  assert.doesNotMatch(spec, /toBe\(0\)|toEqual\(0\)/)
  assert.ok((spec.match(/await Promise\.all\(\[\n\s*expect\(toast\(page, /g) ?? []).length >= 1, "the restock waits for its toast with the refresh")
  assert.ok(spec.includes("expect(toast(page, fillTemplate(W.receiveToast, { name: kindName })).last()).toBeVisible()"), "the latest toast")
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 6, "axe on every state")
})
