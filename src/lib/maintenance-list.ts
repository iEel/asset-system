export type MaintenanceBoardCompatibility = "compatible" | "table_required"

const tableOnlyStatuses = new Set(["open", "closed"])
const allowedPageSizes = new Set([25, 50, 100])

export function buildMaintenancePagination(page: number, pageSize: number, total: number) {
  const safePageSize = allowedPageSizes.has(pageSize) ? pageSize : 25
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize))
  const requestedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
  const safePage = Math.min(requestedPage, totalPages)

  return {
    page: safePage,
    pageSize: safePageSize,
    total: safeTotal,
    totalPages,
    start: safeTotal ? (safePage - 1) * safePageSize + 1 : 0,
    end: Math.min(safePage * safePageSize, safeTotal),
  }
}

export function getMaintenanceBoardCompatibility(status: string): MaintenanceBoardCompatibility {
  return tableOnlyStatuses.has(status) ? "table_required" : "compatible"
}
