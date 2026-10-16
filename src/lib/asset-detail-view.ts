export const assetDetailViews = ["overview", "custody", "operations", "audit"] as const

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

const assetDetailViewAnchor: Record<AssetDetailView, string> = {
  overview: "overview",
  custody: "ownership",
  operations: "movement",
  audit: "audit",
}

const sectionIdsByAssetDetailView: Record<AssetDetailView, AssetDetailSectionId[]> = {
  overview: ["overview", "specs", "purchase", "photos", "notes"],
  custody: ["ownership", "components", "handover"],
  operations: ["movement", "maintenance"],
  audit: ["audit"],
}

export function parseAssetDetailView(value?: string | string[]): AssetDetailView {
  const rawValue = Array.isArray(value) ? value[0] : value
  return assetDetailViews.includes(rawValue as AssetDetailView) ? (rawValue as AssetDetailView) : "overview"
}

export function getAssetDetailViewSectionIds(view: AssetDetailView) {
  return sectionIdsByAssetDetailView[view]
}

export function isAssetDetailSectionVisible(view: AssetDetailView, sectionId: AssetDetailSectionId) {
  return sectionIdsByAssetDetailView[view].includes(sectionId)
}

export function buildAssetDetailViewHref(
  locale: string,
  assetId: string,
  view: AssetDetailView,
  returnTo?: string | null,
) {
  return buildAssetDetailUrl(locale, assetId, view, assetDetailViewAnchor[view], returnTo)
}

function getAssetDetailSectionView(sectionId: AssetDetailSectionId): AssetDetailView {
  return assetDetailViews.find((view) => sectionIdsByAssetDetailView[view].includes(sectionId)) ?? "overview"
}

function buildAssetDetailUrl(
  locale: string,
  assetId: string,
  view: AssetDetailView,
  anchor: string,
  returnTo?: string | null,
) {
  const params = new URLSearchParams({ view })
  if (returnTo?.trim()) params.set("returnTo", returnTo)
  return `/${locale}/assets/${encodeURIComponent(assetId)}?${params.toString()}#${anchor}`
}

// Wiki open question 43 (plan 2D-4): an in-page link to a section is "#id" when the current view renders the
// section, and otherwise the URL of the view that does, with the same returnTo and the section as the anchor.
export function buildAssetDetailSectionHref(
  locale: string,
  assetId: string,
  currentView: AssetDetailView,
  sectionId: AssetDetailSectionId,
  returnTo?: string | null,
): string {
  if (isAssetDetailSectionVisible(currentView, sectionId)) return `#${sectionId}`
  return buildAssetDetailUrl(locale, assetId, getAssetDetailSectionView(sectionId), sectionId, returnTo)
}
