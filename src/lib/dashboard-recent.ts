// The dashboard's recent asset events (group 1 spec §6.8): asset movements only, without a component's mirror rows,
// each with the document it belongs to. It never writes.
import { prisma } from "@/lib/db"
import {
  ASSET_MOVEMENT_MIRROR_TYPES,
  assetMovementReferenceLookup,
  type AssetMovementDocument,
  type AssetMovementReferenceLookup,
} from "@/lib/asset-movement-labels"

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

  const idsByLookup = new Map<AssetMovementReferenceLookup, Set<string>>()
  for (const movement of movements) {
    const lookup = assetMovementReferenceLookup(movement.referenceType)
    if (!lookup || !movement.referenceId) continue
    const ids = idsByLookup.get(lookup) ?? new Set<string>()
    ids.add(movement.referenceId)
    idsByLookup.set(lookup, ids)
  }
  const idsOf = (lookup: AssetMovementReferenceLookup) => [...(idsByLookup.get(lookup) ?? [])]
  const has = (lookup: AssetMovementReferenceLookup) => idsByLookup.has(lookup)
  const auditRoundSelect = { id: true, auditRound: { select: { id: true, auditNo: true } } } as const

  // Only the kinds present are read, all at once.
  const [checkouts, checkins, transfers, repairs, disposals, findings, items] = await Promise.all([
    has("checkout")
      ? prisma.assetCheckout.findMany({ where: { id: { in: idsOf("checkout") } }, select: { id: true, documentNo: true } })
      : [],
    has("checkin")
      ? prisma.assetCheckin.findMany({ where: { id: { in: idsOf("checkin") } }, select: { id: true, documentNo: true } })
      : [],
    has("transfer")
      ? prisma.assetTransfer.findMany({ where: { id: { in: idsOf("transfer") } }, select: { id: true, documentNo: true } })
      : [],
    has("repair")
      ? prisma.maintenanceTicket.findMany({ where: { id: { in: idsOf("repair") } }, select: { id: true, repairNo: true } })
      : [],
    has("disposal")
      ? prisma.disposalRequest.findMany({ where: { id: { in: idsOf("disposal") } }, select: { id: true, disposalNo: true } })
      : [],
    has("auditFinding")
      ? prisma.auditFinding.findMany({ where: { id: { in: idsOf("auditFinding") } }, select: auditRoundSelect })
      : [],
    has("auditItem")
      ? prisma.auditItem.findMany({ where: { id: { in: idsOf("auditItem") } }, select: auditRoundSelect })
      : [],
  ])

  const documents = new Map<AssetMovementReferenceLookup, Map<string, AssetMovementDocument>>()
  const put = (lookup: AssetMovementReferenceLookup, id: string, document: AssetMovementDocument | null) => {
    if (!document) return
    const byId = documents.get(lookup) ?? new Map<string, AssetMovementDocument>()
    byId.set(id, document)
    documents.set(lookup, byId)
  }
  // A checkout or check-in without a document number (legacy backfills) has no document to show.
  for (const row of checkouts) put("checkout", row.id, row.documentNo ? { kind: "checkout", id: row.id, code: row.documentNo } : null)
  for (const row of checkins) put("checkin", row.id, row.documentNo ? { kind: "checkin", id: row.id, code: row.documentNo } : null)
  for (const row of transfers) put("transfer", row.id, { kind: "transfer", id: row.id, code: row.documentNo })
  for (const row of repairs) put("repair", row.id, { kind: "repair", id: row.id, code: row.repairNo })
  for (const row of disposals) put("disposal", row.id, { kind: "disposal", id: row.id, code: row.disposalNo })
  for (const row of findings) put("auditFinding", row.id, { kind: "auditRound", id: row.auditRound.id, code: row.auditRound.auditNo })
  for (const row of items) put("auditItem", row.id, { kind: "auditRound", id: row.auditRound.id, code: row.auditRound.auditNo })

  return movements.map((movement) => {
    const lookup = assetMovementReferenceLookup(movement.referenceType)
    const document = lookup && movement.referenceId ? documents.get(lookup)?.get(movement.referenceId) ?? null : null
    return {
      id: movement.id,
      movementType: movement.movementType,
      performedAt: movement.performedAt,
      asset: movement.asset,
      document,
    }
  })
}
