import { prisma } from "@/lib/db"
import { getAssetHistoryCounts } from "@/lib/asset-history"
import { assetDetailComponentLinkWhere, assetDetailFileWhere, assetRepairRecordWhere, type AssetDetailCounts } from "@/lib/asset-detail-data"

// Group 1 asset detail task 7 (spec §7.3, R22): the counts of the four tabs that have one (ภาพรวม has none), in one
// round. Files and repairs count through the where their tab lists with; components through the links Task 10
// renders (R58); the history through Task 3's own count, its sources and merge rules (R11). It never writes and reads
// no rows of its own.
export async function getAssetDetailCounts(assetId: string): Promise<AssetDetailCounts> {
  const [history, components, files, repairs] = await Promise.all([
    getAssetHistoryCounts(assetId),
    prisma.assetComponent.count({ where: assetDetailComponentLinkWhere(assetId) }),
    prisma.attachment.count({ where: assetDetailFileWhere(assetId) }),
    prisma.maintenanceTicket.count({ where: assetRepairRecordWhere(assetId) }),
  ])
  return { history: history.total, components, files, repairs }
}
