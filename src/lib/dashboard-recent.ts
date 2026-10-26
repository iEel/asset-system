// The dashboard's recent asset events (group 1 spec §6.8): asset movements only, without a component's mirror rows,
// each with the document it belongs to (the shared reader, R13). It never writes.
import { prisma } from "@/lib/db"
import { ASSET_MOVEMENT_MIRROR_TYPES, type AssetMovementDocument } from "@/lib/asset-movement-labels"
import { resolveAssetMovementDocuments } from "@/lib/asset-movement-documents"

export type RecentAssetEvent = {
  id: string
  movementType: string
  performedAt: Date
  asset: { id: string; assetTag: string; name: string }
  document: AssetMovementDocument | null
}

export async function getRecentAssetEvents(take: number): Promise<RecentAssetEvent[]> {
  const movements = await prisma.assetMovement.findMany({
    // An inactive asset's page answers 404; the parent's own row records a mirror row's event.
    where: { movementType: { notIn: [...ASSET_MOVEMENT_MIRROR_TYPES] }, asset: { isActive: true } },
    orderBy: [{ performedAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      movementType: true,
      referenceType: true,
      referenceId: true,
      performedAt: true,
      asset: { select: { id: true, assetTag: true, name: true } },
    },
  })

  const documentOf = await resolveAssetMovementDocuments(movements)

  return movements.map((movement) => ({
    id: movement.id,
    movementType: movement.movementType,
    performedAt: movement.performedAt,
    asset: movement.asset,
    document: documentOf(movement),
  }))
}
