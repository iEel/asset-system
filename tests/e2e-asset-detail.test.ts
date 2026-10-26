import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The asset detail's E2E steps (plan docs/superpowers/plans/2026-10-26-group1-asset-detail.md, Task 13; spec 2026-10-25
// §10): what they stand on — the app's own words, the register's reasons, the page's view names, the suite's fixtures
// and users, the round cancelled after — and the transaction, licence, repair and roles steps that now read the canvas
// B page. Reads strip \r (the working tree may be CRLF).
const read = (f: string) => readFileSync(f, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []
// A words-file template and a th.json value are the same text whatever their placeholders are named.
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")

test("the asset detail steps read the app's own words, the register's reasons and the page's view names (group 1 asset detail task 13)", async () => {
  const { DETAIL_WORDS, DETAIL_VIEWS, PERSONAL_TRANSACTIONS, VIEWER_ABSENT_CONTROLS } = await import("../e2e/asset-detail/detail-words.ts")
  const { assetDetailViews } = await import("../src/lib/asset-detail-view.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(DETAIL_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  for (const text of [...PERSONAL_TRANSACTIONS, ...VIEWER_ABSENT_CONTROLS]) assert.ok(shapes.has(text), `"${text}" is a value of messages/th.json`)
  // The reasons are the register's own sentences (spec §7.1 reuses the asset.transactionReason* keys).
  assert.equal(DETAIL_WORDS.reasonStatusNotReady, th.asset.transactionReasonStatusNotReady)
  assert.equal(DETAIL_WORDS.reasonOpenCheckout, th.asset.transactionReasonOpenCheckout)
  // The keys the rulings name for the header's crumb and the fact strip (R10, R19), and one word for one thing (spec §5):
  // a purchase document is the app's "เอกสารจัดซื้อ" (R31).
  assert.equal(DETAIL_WORDS.searchCrumb, th.asset.registerCrumbSearch)
  assert.equal(DETAIL_WORDS.filtersCrumb, th.asset.registerCrumbFilters)
  assert.equal(DETAIL_WORDS.factStrip, th.asset.factStripLabel)
  assert.equal(DETAIL_WORDS.purchaseDocuments, th.asset.purchaseDocuments)
  assert.ok(!JSON.stringify(DETAIL_WORDS).includes("เอกสารการซื้อ"), "not the spec's เอกสารการซื้อ")
  // The overview's "จัดการ" needs asset:edit (R35), so the viewer never sees it (R42).
  assert.ok((VIEWER_ABSENT_CONTROLS as readonly string[]).includes("จัดการ"))
  // The tabs' view names (spec §7.3); visitAssetPage takes every one but the overview, the page without ?view=.
  assert.deepEqual([...DETAIL_VIEWS], [...assetDetailViews])
  const support = read("e2e/transactions/tx-support.ts")
  const union = /export async function visitAssetPage\([^)]*view\?: ([^)]*)\)/.exec(support)?.[1] ?? ""
  assert.deepEqual([...union.matchAll(/"(\w+)"/g)].map((match) => match[1]), assetDetailViews.filter((view) => view !== "overview"))
  // The fact strip's cells are found as the shared part marks them, as StatStrip marks its own.
  const factStrip = read("src/components/ui/fact-strip.tsx")
  assert.ok(factStrip.includes(`data-slot="fact-strip"`) && factStrip.includes(`data-slot="fact"`), "FactStrip marks its strip and its cells")
})

test("the asset detail spec walks the five steps through the suite's fixtures, compares the page with the register, and cancels its round (group 1 asset detail task 13)", () => {
  const spec = read("e2e/asset-detail/asset-detail.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  for (const user of ["itStaff", "itHead"]) assert.ok(spec.split("\n").some((line) => line.trim() === `asUser("${user}")`), user)
  assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), "the phone on Chromium")
  assert.doesNotMatch(spec, /measure\.(visit|recordPage)\(/, "measured through tx-support's visit and record (the settle and the known findings)")
  assert.ok(spec.includes("expect(detailTransactions).toEqual(registerTransactions)"), "(1) the detail's อื่น ๆ against the register's ⋯")
  assert.ok(spec.includes("expect(detailTransactions).toEqual(expected)"), "(1) with the reasons")
  assert.ok(spec.includes(`await expect(latestPanel(page).locator("tbody tr, li").filter({ visible: true })).toHaveCount(3)`), "(2) the overview shows the latest 3")
  assert.ok(spec.includes(`expect(page.url(), "choosing a chip does not navigate").toBe(historyUrl)`), "(2) the chips filter in place")
  assert.ok(spec.includes("fillTemplate(DETAIL_WORDS.heldDays, { days: heldDays })"), "(3) ถือมาแล้ว from the handover's date")
  assert.match(spec, /\} finally \{\n\s+const cancelled = await page\.request\.patch\(`\/api\/audit-rounds\/\$\{round\.id\}`, \{ data: \{ action: "cancel"/, "(3) the round is cancelled whatever happens")
  assert.ok(spec.includes(`await expect(main).toContainText("1 / 3")`) && spec.includes(`await expect(main).not.toContainText("1 / 3")`), "(4) the counter from the register, none opened directly")
  assert.ok(spec.includes(`expect(sheet[0], "the export's 6 columns").toHaveLength(6)`) && spec.includes(`expect(sheet.length - 1, "every event").toBe(total)`), "(2) the Excel holds every event (R15)")
  assert.ok(spec.includes("expect(await controlNames(bar)).toEqual([DETAIL_WORDS.scanNext, DETAIL_WORDS.checkout, DETAIL_WORDS.moreActions])"), "(5) the scan return leads the bar (R21)")
  assert.ok(spec.includes("expect(sheetItems.slice(-2)).toEqual([DETAIL_WORDS.edit, DETAIL_WORDS.printLabel])"), "(5) แก้ไข and พิมพ์ป้าย end the phone's sheet, in Task 8B's order (R21)")
  // R43: the files tab and the repair tab, axe included, on an asset of the test's own with a photo and a repair.
  for (const view of ["files", "maintenance"]) assert.match(spec, new RegExp(`await visitAssetPage\\(measure, asset\\.id, "[^"]+", testInfo, "${view}"\\)`), view)
  assert.ok(spec.includes("await uploadPhotoByApi(page, asset.id)") && spec.includes("await recordRepairByApi(page, asset.id, "), "(R43) a photo and a repair")
})

test("the transaction, licence, repair and roles steps read the canvas B page (group 1 asset detail task 13)", () => {
  const handover = read("e2e/transactions/handover.spec.ts")
  assert.ok(!handover.includes("toBeDisabled()"), "an action that cannot run is an item with its reason, not a disabled button")
  assert.equal(handover.split(`toContainEqual({ label: "ส่งมอบ", reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น", available: false })`).length - 1, 2)
  assert.ok(handover.includes(`await expect(primary).toHaveAccessibleName("ส่งมอบ")`))
  assert.ok(read("e2e/transactions/return.spec.ts").includes(`await expect(primary).toHaveAccessibleName("รับคืน")`))
  const transfer = read("e2e/transactions/transfer.spec.ts")
  assert.ok(transfer.includes(`await menuItem(await openMoreActions(page, e2eDevice), "โอนย้าย").click()`))
  assert.ok(transfer.includes(`for (const view of [undefined, "history"] as const)`))
  const cancel = read("e2e/transactions/cancel.spec.ts")
  assert.ok(cancel.includes("await menuItem(await openMoreActions(page, e2eDevice), /^ยกเลิกรายการ/).click()"))
  assert.ok(!cancel.includes("การดำเนินการเพิ่มเติม"), "the ⋯ of before B")
  assert.ok(read("e2e/transactions/desk-delivery.spec.ts").includes(`const primary = primaryAction(page, "phone")`))
  const register = read("e2e/transactions/register-asset.spec.ts")
  assert.ok(register.includes(`page.locator('main img[src*="/api/attachments/"][src*="/thumbnail?size=card"]')`), "the card size, never the original")
  assert.ok(register.includes(`page.locator("#overview").getByRole("link", { name: documentNo })`), "the purchase document in ข้อมูลทรัพย์สิน")
  assert.ok(register.includes(`getByRole("heading", { name: "เอกสารจัดซื้อ", exact: true })`) && !register.includes("เอกสารการซื้อ"), "the app's one word for it (R31)")
  assert.ok(read("e2e/repair/repair-record.spec.ts").includes(`getByRole("link", { name: "บันทึกซ่อม", exact: true }).filter({ visible: true }).first().click()`))
  const roles = read("e2e/cross-cutting/roles.spec.ts")
  assert.ok(roles.includes(`test("the viewer's asset page offers no write control on any tab (group 1 asset detail)"`))
  assert.ok(roles.includes(`toEqual([DETAIL_WORDS.moreActions])`), "the viewer's phone bar holds only การดำเนินการอื่น (R21)")
})
