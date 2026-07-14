export const maintenancePageViews = ["tickets", "pm"] as const
export const maintenanceTicketLayouts = ["table", "board"] as const

export type MaintenancePageView = (typeof maintenancePageViews)[number]
export type MaintenanceTicketLayout = (typeof maintenanceTicketLayouts)[number]

export function normalizeMaintenancePageView(value: string | undefined): MaintenancePageView {
  return value === "pm" ? "pm" : "tickets"
}

export function buildMaintenanceViewHref(
  locale: string,
  view: MaintenancePageView,
  assetId?: string,
  layout?: MaintenanceTicketLayout,
) {
  const params = new URLSearchParams({ view })
  if (assetId) params.set("assetId", assetId)
  if (view === "tickets" && layout === "board") params.set("layout", layout)
  return `/${locale}/maintenance?${params.toString()}`
}

export function normalizeMaintenanceTicketLayout(value: string | undefined): MaintenanceTicketLayout {
  return value === "board" ? "board" : "table"
}

export function buildMaintenanceTicketLayoutHref(
  locale: string,
  currentQuery: string,
  layout: MaintenanceTicketLayout,
) {
  const params = new URLSearchParams(currentQuery)
  params.set("view", "tickets")
  params.set("page", "1")
  if (layout === "board") {
    params.set("layout", layout)
  } else {
    params.delete("layout")
  }
  return `/${locale}/maintenance?${params.toString()}`
}

export function buildMaintenancePageHref(
  locale: string,
  currentQuery: string,
  overrides: { page?: number; pageSize?: number },
) {
  const params = new URLSearchParams(currentQuery)
  if (overrides.page !== undefined) params.set("page", String(overrides.page))
  if (overrides.pageSize !== undefined) params.set("pageSize", String(overrides.pageSize))
  return `/${locale}/maintenance?${params.toString()}`
}
