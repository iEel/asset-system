export const maintenancePageViews = ["tickets", "pm"] as const

export type MaintenancePageView = (typeof maintenancePageViews)[number]

export function normalizeMaintenancePageView(value: string | undefined): MaintenancePageView {
  return value === "pm" ? "pm" : "tickets"
}

export function buildMaintenanceViewHref(locale: string, view: MaintenancePageView, assetId?: string) {
  const params = new URLSearchParams({ view })
  if (assetId) params.set("assetId", assetId)
  return `/${locale}/maintenance?${params.toString()}`
}
