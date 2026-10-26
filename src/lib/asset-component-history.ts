// The components tab's install/remove history (group 1 asset detail task 10): every link on either side of the asset,
// read once, and their documents once per kind through the shared reader (R13). It never writes.
import { prisma } from "@/lib/db"
import { buildAssetComponentHistory, type AssetComponentHistoryEvent } from "@/lib/asset-component-history-rules"
import { resolveAssetMovementDocuments } from "@/lib/asset-movement-documents"

const historyAssetSelect = { id: true, assetTag: true, name: true, isActive: true } as const

export async function getAssetComponentHistory(assetId: string): Promise<AssetComponentHistoryEvent[]> {
  // No take: the dev data holds at most 7 links per parent, 2.1 on average (2026-10-26).
  const rows = await prisma.assetComponent.findMany({
    where: { OR: [{ parentAssetId: assetId }, { componentAssetId: assetId }] },
    select: {
      id: true,
      parentAssetId: true,
      componentAssetId: true,
      installedAt: true,
      removedAt: true,
      reason: true,
      referenceType: true,
      referenceId: true,
      parentAsset: { select: historyAssetSelect },
      componentAsset: { select: historyAssetSelect },
    },
  })
  const documentOf = await resolveAssetMovementDocuments(rows)
  return buildAssetComponentHistory(rows, assetId, documentOf)
}
