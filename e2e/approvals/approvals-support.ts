// The approvals page's helpers (งานรออนุมัติ, page group 6 plan 2): run-marked disposal requests with a photo each, made
// through the APIs the forms post to, and the page's stable hooks (data-approval-row / -card / -panel / -strip-cell /
// -tabs). Each test makes its own room, assets and requests under its own workflow code (disposal-support.ts), so the
// four projects never share a record and a search for the code leaves only the test's own rows.
import { readFileSync } from "node:fs"
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice, E2eTheme } from "../support/matrix.ts"
import type { Measure } from "../support/measure.ts"
import { fromRoot } from "../support/paths.ts"
import type { E2eUserKey } from "../support/run-plan.ts"
import { readRunData } from "../support/state.ts"
import { actAs, createAssets, createRoom, readAssetChoices, type DisposalAsset } from "../disposal/disposal-support.ts"

export const APPROVALS = "/th/admin/approvals"
// The suite's image (a 96×64 PNG): a disposal photo may be JPG, PNG or WEBP (src/lib/disposal-photo.ts).
export const PHOTO_FIXTURE = fromRoot("e2e/fixtures/photo.png")

export type InboxRequest = { id: string; disposalNo: string; reason: string; asset: DisposalAsset }

// The approvals page with these query values (tab, search, item, pageSize, page), as the page writes its own links.
export function approvalsUrl(params: Record<string, string> = {}): string {
  const query = new URLSearchParams(params).toString()
  return query ? `${APPROVALS}?${query}` : APPROVALS
}

// One pending disposal request through the request API (the body the request form sends), with the suite's photo on it
// through the upload route the request page posts to. The user signed in on the page is its creator. disposalType is
// the method asked (sell, donate, destroy, lost, dispose).
export async function createInboxRequest(page: Page, asset: DisposalAsset, requester: E2eUserKey, reason: string, photo = true, disposalType = "dispose"): Promise<InboxRequest> {
  const response = await page.request.post("/api/disposal-requests", {
    data: {
      assetId: asset.id,
      disposalType,
      reason,
      requestedById: readRunData().employees[requester].id,
      approverId: null,
      saleValue: null,
      salvageValue: null,
      sourceType: null,
      sourceId: null,
    },
  })
  expect(response.status(), `POST /api/disposal-requests ${asset.assetTag}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const request = (await response.json()) as { id: string; disposalNo: string }
  if (photo) {
    const upload = await page.request.post(`/api/disposal-requests/${request.id}/attachments`, {
      multipart: { file: { name: `${asset.assetTag}.png`, mimeType: "image/png", buffer: readFileSync(PHOTO_FIXTURE) } },
    })
    expect(upload.status(), `POST /api/disposal-requests/${request.id}/attachments: ${(await upload.text()).slice(0, 300)}`).toBe(201)
  }
  return { id: request.id, disposalNo: request.disposalNo, reason, asset }
}

// IT staff make the test's room, its assets and one pending request (with a photo) for each, in this order, so the
// inbox lists them in it (the same age: the oldest request first). The page is IT staff's afterwards.
export async function createStaffRequests(page: Page, measure: Measure, theme: E2eTheme, prefix: string, count: number): Promise<InboxRequest[]> {
  await actAs(page, "itStaff", theme)
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบงานรออนุมัติ`)
  const choices = await readAssetChoices(page, measure)
  const tags = Array.from({ length: count }, (_, index) => `${prefix}-A${index + 1}`)
  const assets = await createAssets(page, choices, roomId, tags)
  const requests: InboxRequest[] = []
  for (const [index, asset] of assets.entries()) {
    requests.push(await createInboxRequest(page, asset, "itStaff", `${prefix} คำขอที่ ${index + 1} ชำรุดเกินซ่อม เสนอตัดจำหน่าย`))
  }
  return requests
}

// The queue's entry for a request: the table row from md, the card below it.
export function queueEntry(page: Page, device: E2eDevice, id: string, key = "disposal"): Locator {
  return page.locator(device === "phone" ? `[data-approval-card="${key}:${id}"]` : `[data-approval-row="${key}:${id}"]`)
}

// Every entry of the queue on screen.
export function queueEntries(page: Page, device: E2eDevice): Locator {
  return page.locator(device === "phone" ? "[data-approval-card]" : "[data-approval-row]")
}

// Open an item in the right panel the way a person does: a click on its row (on the title, away from the tick) or its
// card. The URL then names it, and its panel shows.
export async function openItem(page: Page, device: E2eDevice, request: InboxRequest): Promise<Locator> {
  const entry = queueEntry(page, device, request.id)
  if (device === "phone") await entry.click()
  else await entry.getByText(request.asset.name, { exact: true }).click()
  await page.waitForURL((url) => url.searchParams.get("item") === `disposal:${request.id}`)
  return disposalPanel(page, request.id)
}

// The disposal panel of this request.
export function disposalPanel(page: Page, id: string): Locator {
  return page.locator(`[data-approval-panel="disposal"] [data-approval-disposal-panel="${id}"]`)
}

// A tab of the queue and its count.
export function inboxTab(page: Page, label: string): Locator {
  return page.locator("[data-approval-tabs]").getByRole("link", { name: new RegExp(`^${label}`) })
}

export async function tabCount(page: Page, label: string): Promise<string> {
  return ((await inboxTab(page, label).locator(".num").innerText()) ?? "").trim()
}

// A strip cell's number (its first dd), as written on screen.
export async function stripValue(page: Page, cell: "overdue" | "oldest" | "total"): Promise<string> {
  const text = await page.locator(`[data-approval-strip-cell="${cell}"] dd`).first().innerText()
  return text.match(/[\d,]+/)?.[0] ?? ""
}

// A tick, by the row's accessible name "เลือก {title} · {codes}" (a blocked row's adds its reason in brackets).
export function tick(page: Page, request: InboxRequest): Locator {
  return page.getByRole("checkbox", { name: new RegExp(`^เลือก ${escape(request.asset.name)} · `) })
}

// The selection bar (from md): its count line and its primary button.
export function selectionBar(page: Page): Locator {
  return page.getByRole("group", { name: "รายการที่เลือก" })
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
