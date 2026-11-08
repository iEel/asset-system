// Roles and permissions in the browser (spec §6.6): the requests refused, the approval inbox refused, and the
// controls a read-only list must not offer. The pages and requests themselves are refusals.ts's.
import type { APIRequestContext, Page, TestInfo } from "@playwright/test"
import { expect } from "../../support/fixtures.ts"
import type { Measure } from "../../support/measure.ts"
import { projectMarker } from "./records.ts"
import { isWriteLink, WRITE_BUTTON_NAMES, WRITE_LINK_NAMES, WRITE_MENU_NAMES, type ApiRefusal } from "./refusals.ts"
import { DENIED_WORDS } from "../../admin/denied-readiness-words.ts"

// Each request answers 403, listed together so one run shows every answer.
export async function expectRefused(request: APIRequestContext, refusals: readonly ApiRefusal[]) {
  const answers: string[] = []
  for (const refusal of refusals) {
    const response = await request.fetch(refusal.path, refusal.method === "GET" ? { method: "GET" } : { method: refusal.method, data: refusal.body })
    answers.push(`${refusal.method} ${refusal.path} ${response.status()}`)
  }
  expect(answers).toEqual(refusals.map((refusal) => `${refusal.method} ${refusal.path} 403`))
}

// The approval inbox sends a person who may approve nothing to the denied page (src/app/[locale]/(dashboard)/admin/
// approvals; page group 12 §9, it was a 404): the permission line reads either approve in Thai words. The redirect
// reaches the browser after the streamed first load, as visitRefused's (ui.ts) does.
export async function expectApprovalInboxDenied(page: Page, measure: Measure, label: string, path = "/th/admin/approvals") {
  await page.goto(path, { waitUntil: "load" })
  await expect(page).toHaveURL(new RegExp(`/th/access-denied\\?(?=.*module=approval)(?=.*action=approve)(?=.*from=${encodeURIComponent(path)}(?:&|$))`))
  const main = page.getByRole("main")
  await expect(main.getByText(/^ไม่มีสิทธิ์เปิดหน้า /)).toBeVisible()
  await expect(main.getByText(DENIED_WORDS.needs.replace("{permission}", DENIED_WORDS.approvalWords), { exact: true })).toBeVisible()
  await page.waitForLoadState("load")
  await measure.recordPage(`approval inbox refused (${label})`)
}

// The controls on screen that lead to an action the person cannot take: links to a create, edit or approve page, and
// buttons named for a write, a ⋯ that holds only writes (by its aria-label), and a create link by its words.
export async function writeControls(page: Page): Promise<string[]> {
  const hrefs = await page.locator("main a[href]").filter({ visible: true }).evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
  const linkNames = await page.locator("main a[href]").filter({ visible: true }).evaluateAll((links) => links.map((link) => (link.textContent ?? "").trim()))
  const buttons = await page.locator("main button").filter({ visible: true }).evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()))
  const menus = await page.locator("main button[aria-label]").filter({ visible: true }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""))
  return [
    ...new Set([
      ...hrefs.filter(isWriteLink).map((href) => `link ${href.split("?")[0]}`),
      ...linkNames.filter((name) => WRITE_LINK_NAMES.includes(name)).map((name) => `link ${name}`),
      ...buttons.filter((name) => WRITE_BUTTON_NAMES.includes(name)).map((name) => `button ${name}`),
      ...menus.filter((name) => WRITE_MENU_NAMES.some((pattern) => pattern.test(name))).map((name) => `menu ${name}`),
    ]),
  ]
}

// A read-only list's address for the test: the register filtered to the test's own asset (the dev database's first
// page holds other runs' assets, whose photos may sit in another checkout's upload folder: findings, note N10), and
// ":asset" the test's own asset.
export function readOnlyUrl(path: string, asset: { id: string }, slug: string, testInfo: TestInfo): string {
  if (path === "/th/assets") return `/th/assets?search=${encodeURIComponent(`${projectMarker(testInfo)}-${slug}`)}`
  return path.replace(":asset", asset.id)
}
