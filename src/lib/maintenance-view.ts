export function buildMaintenancePageHref(
  locale: string,
  currentQuery: string,
  overrides: { page?: number; pageSize?: number; status?: string },
) {
  const params = new URLSearchParams(currentQuery)
  // A status tab (group 5 plan 5): its status, or none for ทั้งหมด; the other filters stay.
  if (overrides.status !== undefined) {
    if (overrides.status) params.set("status", overrides.status)
    else params.delete("status")
  }
  if (overrides.page !== undefined) params.set("page", String(overrides.page))
  if (overrides.pageSize !== undefined) params.set("pageSize", String(overrides.pageSize))
  return `/${locale}/maintenance?${params.toString()}`
}
