import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { ASSET_EXPORT_MAX_ROWS, assetExportAllWhere, exportAllCountKey } from "../src/lib/asset-export-limits.ts"

// Group 4 plan 5 Task 5 (P5-R10, recon export.md D2/D3): the import-export page counts what the unfiltered export
// writes, from the same code the route reads, and names the cap when the count is over it.
test("export all counts the register's ทั้งหมด with no filter: active records, as the route with no query", () => {
  assert.deepEqual(assetExportAllWhere(), { isActive: true })
  const route = readFileSync("src/app/api/assets/export/route.ts", "utf8")
  assert.match(route, /const filters = parseAssetListParams\(request\.nextUrl\.searchParams\)/)
  assert.match(route, /buildAssetWhere\(filters, /)
})

test("the count line names the cap only above it", () => {
  assert.equal(ASSET_EXPORT_MAX_ROWS, 5000)
  assert.equal(exportAllCountKey(0), "exportAllCount")
  assert.equal(exportAllCountKey(5000), "exportAllCount")
  assert.equal(exportAllCountKey(5001), "exportAllCapped")
})
