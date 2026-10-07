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
