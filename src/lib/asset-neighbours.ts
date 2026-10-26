import { prisma } from "@/lib/db"
import { buildAssetOrderBy, parseAssetListParams } from "@/lib/asset-list-query"
import { buildAssetRegisterWhere } from "@/lib/asset-list-where-options"
import { pickAssetNeighbours, type AssetNeighbours } from "@/lib/asset-neighbours-rules"
import { withPerformanceTiming } from "@/lib/performance-timing"

// The asset page's previous / next (server only). It reads every id of the register's list in the register's own
// where and order, one query of ids only (about 2,000 short strings for the unfiltered register), and finds the
// asset among them (group 1 spec §7.2).
export async function getAssetNeighbours(params: URLSearchParams, assetId: string): Promise<AssetNeighbours | null> {
  const filters = parseAssetListParams(params)
  return withPerformanceTiming(
    "asset-detail.neighbours",
    async () => {
      const { where } = await buildAssetRegisterWhere(filters)
      const rows = await prisma.asset.findMany({
        where,
        orderBy: buildAssetOrderBy(filters),
        select: { id: true },
      })
      return pickAssetNeighbours(rows.map((row) => row.id), assetId)
    },
    { route: "/assets/[id]" },
  )
}
