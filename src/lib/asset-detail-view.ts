import type { AssetHistoryCategory } from "./asset-history-rules.ts"

export const assetDetailViews = ["overview", "history", "components", "files", "maintenance"] as const

export type AssetDetailView = (typeof assetDetailViews)[number]

export type AssetDetailSectionId =
  | "overview"
  | "purchase"
  | "photos"
  | "purchase-documents"
  | "components"
  | "maintenance"

// Group 1 asset detail task 8 (R23): "ข้อมูลทรัพย์สิน" holds the overview and purchase anchors; the files tab (Task 11)
// holds the photos and its เอกสารจัดซื้อ. The history tab (Task 9) has no section: a tab link carries no anchor (R22).
// The maintenance tab keeps today's section until Task 12 replaces it.
const sectionIdsByAssetDetailView: Record<AssetDetailView, AssetDetailSectionId[]> = {
  overview: ["overview", "purchase"],
  history: [],
  components: ["components"],
  files: ["photos", "purchase-documents"],
  maintenance: ["maintenance"],
}

// ?view= values from before group 1 (bookmarks, old component-manager returns, the E2E helper) open their new tab.
const legacyAssetDetailViews = new Map<string, { view: AssetDetailView; historyType: AssetHistoryCategory | null }>([
  ["custody", { view: "components", historyType: null }],
  ["operations", { view: "history", historyType: null }],
  ["audit", { view: "history", historyType: "audit" }],
])

export function resolveAssetDetailView(raw: string | string[] | undefined): { view: AssetDetailView; historyType: AssetHistoryCategory | null } {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value && (assetDetailViews as readonly string[]).includes(value)) return { view: value as AssetDetailView, historyType: null }
  const legacy = value ? legacyAssetDetailViews.get(value) : undefined
  return legacy ? { ...legacy } : { view: "overview", historyType: null }
}

export function getAssetDetailViewSectionIds(view: AssetDetailView) {
  return sectionIdsByAssetDetailView[view]
}

export function isAssetDetailSectionVisible(view: AssetDetailView, sectionId: AssetDetailSectionId) {
  return sectionIdsByAssetDetailView[view].includes(sectionId)
}

// A tab link carries no #anchor, so the header, the tabs and the facts stay in view.
export function buildAssetDetailViewHref(
  locale: string,
  assetId: string,
  view: AssetDetailView,
  returnTo?: string | null,
) {
  return buildAssetDetailUrl(locale, assetId, view, null, returnTo)
}

function getAssetDetailSectionView(sectionId: AssetDetailSectionId): AssetDetailView {
  return assetDetailViews.find((view) => sectionIdsByAssetDetailView[view].includes(sectionId)) ?? "overview"
}

function buildAssetDetailUrl(
  locale: string,
  assetId: string,
  view: AssetDetailView,
  anchor: string | null,
  returnTo?: string | null,
) {
  const params = new URLSearchParams({ view })
  if (returnTo?.trim()) params.set("returnTo", returnTo)
  const url = `/${locale}/assets/${encodeURIComponent(assetId)}?${params.toString()}`
  return anchor ? `${url}#${anchor}` : url
}

// Wiki open question 43 (plan 2D-4): an in-page link to a section is "#id" when the current view renders the
// section, and otherwise the URL of the view that does, with the same returnTo and the section as the anchor.
// A currentView of null is a link from another page (the reports), which always opens the tab.
export function buildAssetDetailSectionHref(
  locale: string,
  assetId: string,
  currentView: AssetDetailView | null,
  sectionId: AssetDetailSectionId,
  returnTo?: string | null,
): string {
  if (currentView && isAssetDetailSectionVisible(currentView, sectionId)) return `#${sectionId}`
  return buildAssetDetailUrl(locale, assetId, getAssetDetailSectionView(sectionId), sectionId, returnTo)
}
