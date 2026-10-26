import type { AssetHistoryCategory } from "./asset-history-rules.ts"

export const assetDetailViews = ["overview", "history", "components", "files", "maintenance"] as const

export type AssetDetailView = (typeof assetDetailViews)[number]

export type AssetDetailSectionId =
  | "overview"
  | "specs"
  | "purchase"
  | "photos"
  | "notes"
  | "ownership"
  | "components"
  | "handover"
  | "movement"
  | "maintenance"
  | "audit"

// Group 1 asset detail task 7: today's sections under the new tabs until Tasks 8-12 replace them.
const sectionIdsByAssetDetailView: Record<AssetDetailView, AssetDetailSectionId[]> = {
  overview: ["overview", "specs", "purchase", "notes"],
  history: ["movement", "audit"],
  components: ["ownership", "components", "handover"],
  files: ["photos"],
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
