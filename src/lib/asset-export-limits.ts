import type { Prisma } from "@prisma/client"
import { buildAssetWhere, parseAssetListParams } from "./asset-list-query.ts"

// The most rows one asset export writes. The export route caps its query with it, and the import-export page says it
// on the export-all card, so the two cannot drift apart (user decision 2026-10-21 Y1).
export const ASSET_EXPORT_MAX_ROWS = 5000

// What GET /api/assets/export with no query reads (P5-R10): the register's ทั้งหมด with no filter, from the same parser and
// where the route uses. The import-export page counts it for the export-all line.
export function assetExportAllWhere(): Prisma.AssetWhereInput {
  return buildAssetWhere(parseAssetListParams({}))
}

// Whether an export of `count` rows stops at the cap. The reports page's register line (header caption and phone card)
// says the file holds the newest ASSET_EXPORT_MAX_ROWS of n only then (group 10 plan 1 final review).
export function assetExportCapped(count: number): boolean {
  return count > ASSET_EXPORT_MAX_ROWS
}

// The export-all count line: above the cap it also says the file holds the newest ASSET_EXPORT_MAX_ROWS (the route's
// default order is createdAt desc), as the register's export menu does.
export function exportAllCountKey(count: number): "exportAllCount" | "exportAllCapped" {
  return assetExportCapped(count) ? "exportAllCapped" : "exportAllCount"
}
