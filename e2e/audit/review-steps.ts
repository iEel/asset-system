// The findings page (/th/audit/findings, messages/th.json auditFinding, group 2 spec §10) and the refusals the UI never
// sends: the six tabs, the rows and their ids, the panel a row opens with ?finding=, the next finding after a decision,
// the desktop selection bar, the export's cells, and a request sent from the page as the person's browser would.
import type { Locator, Page, Response } from "@playwright/test"
import type { Worksheet } from "exceljs"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { escapeRegExp } from "./scan-steps.ts"
import { REVIEW_WORDS } from "./review-words.ts"

export type AuditFindingTypeCode = "wrong_location" | "wrong_custodian" | "wrong_department" | "wrong_condition" | "not_found" | "out_of_scope"

// A row holds its finding's id: the desktop table's row, or the phone's card (both are in the page; one is hidden).
const idAttribute = (device: E2eDevice) => (device === "phone" ? "data-audit-finding-card" : "data-audit-finding-row")

// The findings of the page, in its order.
export function findingRows(page: Page, device: E2eDevice): Locator {
  return device === "phone" ? page.locator("[data-audit-finding-card]") : page.locator("tbody tr[data-audit-finding-row]")
}

// One finding, by its asset's tag and its type's code (the row carries the code; the screen shows the short word).
export function findingEntry(page: Page, device: E2eDevice, tag: string, type: AuditFindingTypeCode): Locator {
  const row = device === "phone" ? "" : "tbody tr"
  return page.locator(`${row}[${idAttribute(device)}][data-finding-type="${type}"]`).filter({ hasText: tag })
}

export async function findingId(entry: Locator, device: E2eDevice): Promise<string> {
  const id = await entry.getAttribute(idAttribute(device))
  if (!id) throw new Error("the finding's row carries no id")
  return id
}

// The ids of the page's findings, in the page's order (reported last first, then id).
export async function readFindingOrder(page: Page, device: E2eDevice): Promise<string[]> {
  return findingRows(page, device).evaluateAll((nodes, attribute) => nodes.map((node) => node.getAttribute(attribute) ?? ""), idAttribute(device))
}

// The panel of the chosen finding: the right pane on the desktop, the whole screen on the phone (spec §10, P4-R13).
export function findingPanel(page: Page): Locator {
  return page.locator("[data-audit-finding-panel]").filter({ visible: true })
}

// A click on the finding as a person makes it: on the desktop the row's เรื่อง chip (no control, so the row's own click,
// not its link); on the phone the card, which is one stretched link (P4-R13). The URL gains ?finding= and the panel
// holds it.
export async function openFinding(page: Page, entry: Locator, id: string): Promise<void> {
  const card = await entry.evaluate((node) => node.hasAttribute("data-audit-finding-card"))
  await (card ? entry : entry.locator("[data-audit-finding-subject]")).click()
  await page.waitForURL((url) => url.searchParams.get("finding") === id)
  await expect(findingPanel(page)).toHaveAttribute("data-finding-id", id)
}

// The six tabs (P4-R1): each label with its count, in order, and the current one.
export function findingTabs(page: Page): Locator {
  return page.getByRole("main").getByRole("navigation", { name: REVIEW_WORDS.tabsLabel, exact: true })
}
export function currentFindingTab(page: Page): Locator {
  return findingTabs(page).locator('a[aria-current="page"]')
}
export async function expectTabs(page: Page, expected: readonly (readonly [string, number])[], current: string): Promise<void> {
  await expect(findingTabs(page).getByRole("link")).toHaveText(expected.map(([label, count]) => new RegExp(`^${escapeRegExp(label)}\\s*${count}$`)))
  await expect(currentFindingTab(page)).toHaveText(new RegExp(`^${escapeRegExp(current)}\\s*\\d`))
}

// The desktop selection bar (spec §10, P4-R15).
export function selectionBar(page: Page): Locator {
  return page.locator('[data-slot="desktop-selection-bar"]')
}

// The finding the panel moves to after a decision on the pending tab (P4-R18), on one page where the IT head may decide
// every finding: the one after it in the page's order, else the first before it (the page's first); none when it was
// the last one left.
export function nextPendingAfter(order: readonly string[], id: string): string | null {
  const at = order.indexOf(id)
  if (at < 0) throw new Error(`${id} is not in the page's order`)
  return [...order.slice(at + 1), ...order.slice(0, at)][0] ?? null
}

// The next answer of a finding's review route (a decision in the panel, or one of the bar's).
export function reviewResponse(page: Page, findingId: string): Promise<Response> {
  return page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/audit-findings/${findingId}/review`)
}

// Every review request the page sends for one finding while the watch is on.
export function watchReviewPosts(page: Page, findingId: string): { posts: string[]; stop: () => void } {
  const posts: string[] = []
  const watch = (request: { url(): string; method(): string }) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === `/api/audit-findings/${findingId}/review`) posts.push(request.url())
  }
  page.on("request", watch)
  return { posts, stop: () => page.off("request", watch) }
}

// The cells of the named columns that hold a raw code (lower-case ASCII words joined by "_", such as
// "wrong_department"), as "<header> row <n>: <value>"; a missing column is named too. The exports write words
// (P4-R7, P4-R8), so this is empty.
export function rawCodeCells(sheet: Worksheet, headers: readonly string[]): string[] {
  const header = (sheet.getRow(1).values ?? []) as unknown[]
  const found: string[] = []
  for (const name of headers) {
    const column = header.indexOf(name)
    if (column <= 0) {
      found.push(`${name}: no such column`)
      continue
    }
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const value = String(row.getCell(column).value ?? "")
      if (/^[a-z]+(?:_[a-z]+)*$/.test(value)) found.push(`${name} row ${rowNumber}: ${value}`)
    })
  }
  return found
}

// A request from the page itself (the same session and cookies), for a refusal the UI never sends: the button is not
// offered, so the route's own answer is read this way.
export async function browserFetch(page: Page, url: string, method: string, body: unknown): Promise<{ status: number; body: unknown }> {
  return page.evaluate(
    async ({ url, method, body }) => {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      return { status: response.status, body: (await response.json().catch(() => null)) as unknown }
    },
    { url, method, body },
  )
}
