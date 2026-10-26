// The asset detail as a person reads it (src/app/[locale]/(dashboard)/assets/[id]/page.tsx, page group 1, spec §7):
// the primary action, "อื่น ๆ" and its items, the fact strip, the history's chips and document links, previous / next,
// and the register row's next button and ⋯ for the same asset. The transactions a step sets up go through the app's
// own APIs, with the bodies the forms post.
import { readFileSync } from "node:fs"
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { readRunData } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { PHOTO_FIXTURE } from "../transactions/tx-support.ts"
import { DETAIL_WORDS, VIEWER_ABSENT_CONTROLS } from "./detail-words.ts"

// The spec files take the browser types from here: they import nothing from @playwright/test.
export type { Locator, Page }

// One item of "อื่น ๆ" or of a register row's ⋯ as a person reads it: its words, the reason an unavailable item gives,
// and whether choosing it does anything.
export type MenuEntry = { label: string; reason: string | null; available: boolean }

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The primary action (spec §7.2, §7.8, R21): the header's last link on the desktop (DESIGN order: back, อื่น ๆ, the
// pinned buttons, the primary last), the bottom bar's first link on the phone (outside the scan return, where
// "สแกนรายการถัดไป" leads and the primary comes second).
export function primaryAction(page: Page, device: E2eDevice): Locator {
  return device === "desktop"
    ? page.locator('[data-slot="page-header-actions"]').getByRole("link").filter({ visible: true }).last()
    : page.locator('[data-slot="action-bar"]').getByRole("link").first()
}

// The names of a row's links and buttons (the header's buttons, the bottom bar) in their order on screen.
export async function controlNames(row: Locator): Promise<string[]> {
  return row.locator("a, button").evaluateAll((nodes) =>
    nodes
      .filter((node) => node.checkVisibility())
      .map((node) => (node.getAttribute("aria-label") ?? node.textContent ?? "").replace(/\s+/g, " ").trim()),
  )
}

const moreTrigger = (page: Page, device: E2eDevice): Locator =>
  page.getByRole("button", { name: device === "desktop" ? DETAIL_WORDS.more : DETAIL_WORDS.moreActions, exact: true }).filter({ visible: true }).first()

async function openedMenu(page: Page, device: E2eDevice): Promise<Locator> {
  const menu = device === "desktop" ? page.getByRole("menu") : page.getByRole("dialog").filter({ visible: true }).last()
  await expect(menu).toBeVisible()
  return menu
}

// "อื่น ๆ" opened (spec §7.1, §7.8): its menu on the desktop, the bottom sheet behind "การดำเนินการอื่น" on the phone.
export async function openMoreActions(page: Page, device: E2eDevice): Promise<Locator> {
  await moreTrigger(page, device).click()
  return openedMenu(page, device)
}

// The same for a person who may have nothing there: null when the page shows no "อื่น ๆ".
export async function openMoreActionsIfShown(page: Page, device: E2eDevice): Promise<Locator | null> {
  if ((await moreTrigger(page, device).count()) === 0) return null
  return openMoreActions(page, device)
}

// A register row's ⋯ for one asset (src/components/assets/asset-register-row-actions.tsx): the dropdown in the
// table, the bottom sheet in the phone list.
export async function openRowActions(page: Page, device: E2eDevice, assetTag: string): Promise<Locator> {
  await page.getByRole("button", { name: fillTemplate(DETAIL_WORDS.rowActionsMenu, { assetTag }), exact: true }).filter({ visible: true }).first().click()
  return openedMenu(page, device)
}

// A register row's next button (the desktop table only): the one link of the row's actions.
export function registerNext(page: Page, assetTag: string): Locator {
  return page
    .locator('[data-slot="row-actions"]')
    .filter({ visible: true })
    .filter({ has: page.getByRole("button", { name: fillTemplate(DETAIL_WORDS.rowActionsMenu, { assetTag }), exact: true }) })
    .getByRole("link")
    .first()
}

// An item of an open menu or sheet by its words: a menu item on the desktop, a link or a button in the sheet.
export function menuItem(container: Locator, name: string | RegExp): Locator {
  const options = typeof name === "string" ? { name, exact: true } : { name }
  return container.getByRole("menuitem", options).or(container.getByRole("link", options)).or(container.getByRole("button", options)).first()
}

// Every item of an open menu or sheet, in order. Group labels and separators are not items; an unavailable item is
// aria-disabled and reads its reason on its second line (DropdownMenuItemDescription, in the menu and in the sheet).
export async function readMenuEntries(container: Locator): Promise<MenuEntry[]> {
  return container.locator('[role="menuitem"], li > a, li > button, li > [aria-disabled="true"]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const description = node.querySelector('[data-slot="dropdown-menu-item-description"]')
      const reason = description?.textContent?.replace(/\s+/g, " ").trim() || null
      const words = (node.textContent ?? "").replace(description?.textContent ?? "", "")
      return { label: words.replace(/\s+/g, " ").trim(), reason, available: node.getAttribute("aria-disabled") !== "true" }
    }),
  )
}

// The transaction items a menu starts with (spec §7.1: the register's ⋯ and the detail's "อื่น ๆ" both start with
// them), less the primary's own: `transactions` never repeat the primary, but the register's ⋯ leads with it on the
// phone, where the row has no next-step slot (R3).
export function transactionPrefix(entries: readonly MenuEntry[], labels: readonly string[], primary: string): MenuEntry[] {
  const lead: MenuEntry[] = []
  for (const entry of entries) {
    if (!labels.includes(entry.label)) break
    lead.push(entry)
  }
  return lead.filter((entry) => entry.label !== primary)
}

// A cell of the fact strip (spec §7.4, src/components/ui/fact-strip.tsx) by its label: the region named
// "ข้อมูลสำคัญของทรัพย์สิน" (R18, R19), shown on every desktop tab and on the phone's overview only.
export function factCell(page: Page, label: string): Locator {
  return page
    .getByRole("main")
    .getByRole("region", { name: DETAIL_WORDS.factStrip, exact: true })
    .filter({ visible: true })
    .locator('[data-slot="fact-strip"] [data-slot="fact"]')
    .filter({ has: page.getByRole("term").filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) }) })
}

// The first number of a text as the page formats it: a tab's or a chip's count, "ดูประวัติทั้งหมด 12 รายการ".
export function numberIn(text: string): number {
  const match = /\d[\d,]*/.exec(text)
  if (!match) throw new Error(`no number in "${text}"`)
  return Number(match[0].replaceAll(",", ""))
}

// The history's type chips (spec §7.6): radio ChoiceChips named by their type, each with its count beside the name.
export const historyChip = (page: Page, label: string): Locator => page.getByRole("main").getByRole("radio", { name: label, exact: true })
export async function chipCount(page: Page, label: string): Promise<number> {
  const chip = page.getByRole("main").locator('[data-slot="choice-chip"]').filter({ has: page.getByRole("radio", { name: label, exact: true }) })
  return numberIn(await chip.innerText())
}

// The tab the page is on (TabNav marks it aria-current).
export const currentTab = (page: Page): Locator => page.getByRole("main").locator('[data-slot="tab-nav"] a[aria-current="page"]')

// The overview's ความเคลื่อนไหวล่าสุด (spec §7.5): the panel whose link opens the whole history.
export const allHistoryLink = (page: Page): Locator => page.getByRole("link", { name: templatePattern(DETAIL_WORDS.allHistory, { count: "[\\d,]+" }) })
export const latestPanel = (page: Page): Locator => page.getByRole("main").locator("section").filter({ has: allHistoryLink(page) }).last()

// Which of the named documents a part of the page links, as a person sees it (the desktop table or the phone's cards).
export async function shownDocuments(scope: Locator, codes: readonly string[]): Promise<string[]> {
  const shown: string[] = []
  for (const code of codes) if ((await scope.getByRole("link", { name: code }).filter({ visible: true }).count()) > 0) shown.push(code)
  return shown
}

// The register page's assets in their order on screen, each with the link its row opens (returnTo included). Read
// from the phone list at every width: on the desktop the table's rows are clickable <tr>s with no link
// (ClickableTableRow), and the phone list, always rendered in the table's order, is only hidden from md.
export async function registerRows(page: Page): Promise<{ id: string; href: string }[]> {
  const hrefs = await page.locator('[data-asset-mobile-list] a[href*="returnTo="]').evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
  const rows: { id: string; href: string }[] = []
  for (const href of hrefs) {
    const id = /^\/th\/assets\/([^/?#]+)\?/.exec(href)?.[1]
    if (id && id !== "new" && !rows.some((row) => row.id === id)) rows.push({ id, href })
  }
  return rows
}

// The page's write words a person who may not write must not see as a link or a button (VIEWER_ABSENT_CONTROLS).
export async function detailWriteControls(page: Page): Promise<string[]> {
  const main = page.getByRole("main")
  const found: string[] = []
  for (const name of VIEWER_ABSENT_CONTROLS) {
    const controls = main.getByRole("link", { name, exact: true }).or(main.getByRole("button", { name, exact: true })).filter({ visible: true })
    if ((await controls.count()) > 0) found.push(`control ${name}`)
  }
  return found
}

// A return of a handover through the checkin API, Ready in the run's room: every key of the return form's body
// (foundation note N3: the schema reads a missing optional key as missing).
export async function returnByApi(page: Page, assetId: string, checkoutId: string, returnedBy: { id: string; fullNameTh: string }, masters: { readyStatusId: string; goodConditionId: string }) {
  const data = readRunData()
  const response = await page.request.post(`/api/assets/${assetId}/checkin`, {
    data: {
      checkoutId,
      returnDate: bangkokDate(),
      returnBy: returnedBy.fullNameTh,
      returnByEmployeeId: returnedBy.id,
      receiveBy: data.employees.itStaff.fullNameTh,
      receiveByEmployeeId: data.employees.itStaff.id,
      conditionAfter: masters.goodConditionId,
      missingAccessories: "",
      damageNote: "",
      nextStatusId: masters.readyStatusId,
      nextLocationId: data.locationId,
      remark: "E2E asset detail return",
      maintenanceReportedById: "",
      maintenanceProblem: "",
    },
  })
  expect(response.status(), `POST /api/assets/${assetId}/checkin: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; documentNo: string }
}

// A transfer through the transfer API to a room and a custodian (the transfer form's body).
export async function transferByApi(page: Page, assetId: string, toLocationId: string, toCustodianId: string, reason: string) {
  const response = await page.request.post(`/api/assets/${assetId}/transfer`, { data: { toLocationId, toCustodianId, toDepartmentId: "", reason, remark: "" } })
  expect(response.status(), `POST /api/assets/${assetId}/transfer: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; documentNo: string }
}

// The suite's photo as the asset's own photo (module "asset"), through the upload route the files tab posts to.
export async function uploadPhotoByApi(page: Page, assetId: string) {
  const response = await page.request.post(`/api/assets/${assetId}/attachments`, {
    multipart: { file: { name: "photo.png", mimeType: "image/png", buffer: readFileSync(PHOTO_FIXTURE) } },
  })
  expect(response.status(), `POST /api/assets/${assetId}/attachments: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string }
}

// A repair done in one save, the asset usable after it (its status unchanged), through the repair form's route and
// with every key of its body.
export async function recordRepairByApi(page: Page, assetId: string, reportedById: string, problem: string) {
  const response = await page.request.post("/api/maintenance-tickets", {
    data: {
      assetId,
      maintenancePlanId: null,
      problem,
      reportedDate: bangkokDate(),
      done: true,
      outcome: "usable",
      reportedById,
      vendorId: null,
      repairCost: 1500,
      invoiceNo: null,
      remark: "E2E asset detail repair",
    },
  })
  expect(response.status(), `POST /api/maintenance-tickets: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; repairNo: string }
}
