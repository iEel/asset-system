import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { toAuditScanItemRow } from "@/lib/audit-scan-rows"

export const auditScanItemSelect = {
  id: true,
  assetId: true,
  auditStatus: true,
  auditResult: true,
  expectedLocationId: true,
  expectedCustodianId: true,
  expectedDepartmentId: true,
  expectedConditionId: true,
  actualLocationId: true,
  actualCustodianId: true,
  actualDepartmentId: true,
  actualConditionId: true,
  lastScanAt: true,
  scannedBy: true,
  asset: {
    select: {
      assetTag: true,
      name: true,
      serialNumber: true,
      fixedAssetCode: true,
      categoryId: true,
      ownershipType: true,
      currentLocationId: true,
      custodianId: true,
      departmentId: true,
    },
  },
} satisfies Prisma.AuditItemSelect

/** Every audit item of a round (or only those changed after `since`) as scan rows. */
export async function loadAuditScanRows(roundId: string, options: { since?: Date } = {}) {
  const records = await prisma.auditItem.findMany({
    where: { auditRoundId: roundId, ...(options.since ? { updatedAt: { gt: options.since } } : {}) },
    select: auditScanItemSelect,
    orderBy: { asset: { assetTag: "asc" } },
  })
  if (records.length === 0) return []

  const userIds = Array.from(new Set(records.map((record) => record.scannedBy).filter((id): id is string => Boolean(id))))
  const [users, componentGroups] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
      : Promise.resolve([] as Array<{ id: string; displayName: string }>),
    prisma.assetComponent.groupBy({
      by: ["parentAssetId"],
      where: {
        status: "installed",
        removedAt: null,
        componentAsset: { isActive: true },
        // A full round can exceed SQL Server's 2,100 parameters, so it filters by relation; deltas are small lists.
        ...(options.since
          ? { parentAssetId: { in: records.map((record) => record.assetId) } }
          : { parentAsset: { auditItems: { some: { auditRoundId: roundId } } } }),
      },
      _count: { _all: true },
    }),
  ])

  const userNames = new Map(users.map((user) => [user.id, user.displayName]))
  const componentCounts = new Map(componentGroups.map((group) => [group.parentAssetId, group._count._all]))
  return records.map((record) => toAuditScanItemRow(record, { userNames, componentCounts }))
}
