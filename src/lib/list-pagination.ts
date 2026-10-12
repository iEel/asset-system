// Server-side paging for the phase 2B lists (spec 2B §5.9.1, B4, R-k). Pure: no Prisma, no React, so tests import it.
// The URL carries page only above 1 and pageSize only when it is not 25, so every default link stays as it is today.
// The range line keeps using paginationRange (src/lib/master-data-query.ts).

export const LIST_PAGE_SIZES = [25, 50, 100] as const

export type ListPageSize = (typeof LIST_PAGE_SIZES)[number]
export type ListPageState = { page: number; pageSize: ListPageSize }
/** A search param as a page receives it, or a number a caller already has. */
export type ListPageParam = string | string[] | number | null | undefined

const DEFAULT_LIST_PAGE_SIZE: ListPageSize = LIST_PAGE_SIZES[0]

// A whole number written with digits only ("2", not "2.5", "1e3" or "-1"); a repeated key (an array) is not one.
function wholeNumber(value: ListPageParam): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : null
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}

function isListPageSize(value: number | null): value is ListPageSize {
  return LIST_PAGE_SIZES.some((size) => size === value)
}

/** page: a whole number of at least 1, else 1. pageSize: 25, 50 or 100, else 25. */
export function parseListPage(raw: { page?: ListPageParam; pageSize?: ListPageParam }): ListPageState {
  const page = wholeNumber(raw.page)
  const pageSize = wholeNumber(raw.pageSize)
  return {
    page: page !== null && page >= 1 ? page : 1,
    pageSize: isListPageSize(pageSize) ? pageSize : DEFAULT_LIST_PAGE_SIZE,
  }
}

/** The findMany window of a page. A page past the end gives an empty window: the page then redirects to lastListPage. */
export function listPageWindow({ page, pageSize }: ListPageState): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize }
}

/** The last page, at least 1 (an empty list still has page 1). */
export function lastListPage(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/**
 * Writes page and pageSize into params where they differ from the defaults (1 and 25) and drops any old value.
 * A filter link passes only { pageSize }: it goes back to page 1 and keeps the page size. Returns params.
 */
export function appendListPage(params: URLSearchParams, state: { page?: number; pageSize?: number }): URLSearchParams {
  params.delete("page")
  params.delete("pageSize")
  if (state.page !== undefined && state.page > 1) params.set("page", String(state.page))
  if (state.pageSize !== undefined && state.pageSize !== DEFAULT_LIST_PAGE_SIZE) params.set("pageSize", String(state.pageSize))
  return params
}
