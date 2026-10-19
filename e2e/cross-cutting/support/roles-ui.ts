// Roles and permissions in the browser (spec §6.6): the requests refused, the approval inbox not found, and the
// controls a read-only list must not offer. The pages and requests themselves are refusals.ts's.
import type { APIRequestContext, Page, TestInfo } from "@playwright/test"
import { expect } from "../../support/fixtures.ts"
import type { Measure } from "../../support/measure.ts"
import { projectMarker } from "./records.ts"
import { isWriteLink, WRITE_BUTTON_NAMES, type ApiRefusal } from "./refusals.ts"
import { expectNotFound } from "./ui.ts"

// Each request answers 403, listed together so one run shows every answer.
export async function expectRefused(request: APIRequestContext, refusals: readonly ApiRefusal[]) {
  const answers: string[] = []
  for (const refusal of refusals) {
    const response = await request.fetch(refusal.path, { method: refusal.method, data: refusal.body })
    answers.push(`${refusal.method} ${refusal.path} ${response.status()}`)
  }
  expect(answers).toEqual(refusals.map((refusal) => `${refusal.method} ${refusal.path} 403`))
}

// The approval inbox is not found for a person who may approve nothing (src/app/[locale]/(dashboard)/admin/approvals).
export async function expectApprovalInboxNotFound(page: Page, measure: Measure, label: string) {
  await measure.visit("/th/admin/approvals", `approval inbox (${label})`)
  await expectNotFound(page)
}

// The controls on screen that lead to an action the person cannot take: links to a create, edit or approve page, and
// buttons named for a write.
export async function writeControls(page: Page): Promise<string[]> {
  const hrefs = await page.locator("main a[href]").filter({ visible: true }).evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
  const buttons = await page.locator("main button").filter({ visible: true }).evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()))
  return [...new Set([...hrefs.filter(isWriteLink).map((href) => `link ${href.split("?")[0]}`), ...buttons.filter((name) => WRITE_BUTTON_NAMES.includes(name)).map((name) => `button ${name}`)])]
}

// A read-only list's address for the test: the register filtered to the test's own asset (the dev database's first
// page holds other runs' assets, whose photos may sit in another checkout's upload folder: findings, note N10), and
// ":asset" the test's own asset.
export function readOnlyUrl(path: string, asset: { id: string }, slug: string, testInfo: TestInfo): string {
  if (path === "/th/assets") return `/th/assets?search=${encodeURIComponent(`${projectMarker(testInfo)}-${slug}`)}`
  return path.replace(":asset", asset.id)
}
