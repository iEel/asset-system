export const assetRegisterSortOptions = [
  { key: "newest", sort: "createdAt", direction: "desc" },
  { key: "oldest", sort: "createdAt", direction: "asc" },
  { key: "tagAsc", sort: "assetTag", direction: "asc" },
  { key: "tagDesc", sort: "assetTag", direction: "desc" },
  { key: "nameAsc", sort: "name", direction: "asc" },
  { key: "purchaseDateDesc", sort: "purchaseDate", direction: "desc" },
  { key: "priceDesc", sort: "purchasePrice", direction: "desc" },
] as const

export type AssetRegisterSortKey = (typeof assetRegisterSortOptions)[number]["key"]

export function getActiveSortKey(sort: string, direction: string): AssetRegisterSortKey | null {
  return assetRegisterSortOptions.find((option) => option.sort === sort && option.direction === direction)?.key ?? null
}
