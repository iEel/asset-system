import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 7 (spec §7.3): the tab counts, "ประวัติ N · ส่วนควบ N · ไฟล์ N · ซ่อม / PM N", in one
// round, each through the where its tab lists with; history is the total of Task 3's getAssetHistoryCounts (R11), the
// number the history tab's "ทั้งหมด" chip and the overview's "ดูประวัติทั้งหมด N รายการ" show. This file reads no
// rows of its own. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("getAssetDetailCounts: the history total and three counts in one Promise.all, each through its tab's where", () => {
  const source = read("src/lib/asset-detail-counts.ts")
  assert.match(source, /^import \{ prisma \} from "@\/lib\/db"$/m)
  assert.match(source, /^import \{ getAssetHistoryCounts \} from "@\/lib\/asset-history"$/m)
  assert.match(source, /^import \{ assetDetailComponentLinkWhere, assetDetailFileWhere, assetRepairRecordWhere, type AssetDetailCounts \} from "@\/lib\/asset-detail-data"$/m)
  assert.match(source, /export async function getAssetDetailCounts\(assetId: string\): Promise<AssetDetailCounts> \{/)
  assert.match(
    source,
    /const \[history, components, files, repairs\] = await Promise\.all\(\[\n\s+getAssetHistoryCounts\(assetId\),\n\s+prisma\.assetComponent\.count\(\{ where: assetDetailComponentLinkWhere\(assetId\) \}\),\n\s+prisma\.attachment\.count\(\{ where: assetDetailFileWhere\(assetId\) \}\),\n\s+prisma\.maintenanceTicket\.count\(\{ where: assetRepairRecordWhere\(assetId\) \}\),\n\s+\]\)/,
  )
  assert.match(source, /return \{ history: history\.total, components, files, repairs \}/)
  assert.doesNotMatch(source, /findMany|findFirst|include:|countAssetHistoryEvents|assetHistory\w*Where/, "counts only; the history count is Task 3's, not a second reading of its sources")
})
