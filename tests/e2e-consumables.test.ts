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
    // เบิก 2 more → the short line under จำนวน, and nothing sent.
    `await expect(page.locator("#consumable-issue-quantity-error")).toHaveText(fillTemplate(W.shortWithCount, { onHand: 1, unit: UNIT }))`,
    `expect(sentIssues, "the short issue is refused in the dialog").toBe(0)`,
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
