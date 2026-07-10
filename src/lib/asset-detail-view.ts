export const assetDetailViews = ["overview", "custody", "operations", "audit"] as const

export type AssetDetailView = (typeof assetDetailViews)[number]

const assetDetailViewAnchor: Record<AssetDetailView, string> = {
  overview: "overview",
  custody: "ownership",
  operations: "movement",
  audit: "audit",
}

const sectionIdsByAssetDetailView: Record<AssetDetailView, string[]> = {
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

export function buildAssetDetailViewHref(
  locale: string,
  assetId: string,
  view: AssetDetailView,
  returnTo?: string | null,
) {
  const params = new URLSearchParams({ view })
  if (returnTo?.trim()) params.set("returnTo", returnTo)
  return `/${locale}/assets/${encodeURIComponent(assetId)}?${params.toString()}#${assetDetailViewAnchor[view]}`
}
