// The repair list's one read (group 5 spec §11, plan 5 G5P5-R1..R7). Server reader: the database is injected, so tests
// pass a fake and this file never imports the client.
import type { Prisma } from "@prisma/client"

import {
  buildMaintenanceWhere,
  buildMaintenanceWhereWithoutStatus,
  type ParsedMaintenanceListParams,
} from "./maintenance-query.ts"
import { readPmDueCounts, type PmDueCountsDb } from "./pm-due-counts.ts"
import { buildDuePmPlanWhere } from "./preventive-maintenance.ts"
import { openRepairRecordWhere, toRepairRecordStatus } from "./repair-record-policy.ts"
import {
  buildRepairStrip,
  foldRepairStatusCounts,
  toPmCardRowView,
  toRepairListRowView,
  type PmCardPlan,
  type PmCardRowView,
  type RepairListRecord,
  type RepairListRowView,
  type RepairStatusCounts,
  type RepairStrip,
} from "./repair-list-view.ts"
import { stuckRepairsWhere } from "./waiting-work-rules.ts"

export const repairListInclude = {
  asset: { select: { name: true, assetTag: true } },
  reportedBy: { select: { fullNameTh: true } },
  vendor: { select: { name: true } },
} as const

const repairListOrder: Prisma.MaintenanceTicketOrderByWithRelationInput[] = [{ reportedDate: "desc" }, { createdAt: "desc" }]

const stuckSelect = { id: true, name: true, assetTag: true, currentLocation: { select: { name: true } } } as const

const pmCardSelect = {
  id: true,
  title: true,
  nextDueDate: true,
  asset: {
    select: {
      name: true,
      assetTag: true,
      maintenanceTickets: {
        where: openRepairRecordWhere,
        select: { id: true, repairNo: true },
        orderBy: repairListOrder,
        take: 1,
      },
    },
  },
} as const

const cancelMovementSelect = { referenceId: true, reason: true, performedAt: true } as const

const STUCK_CARD_ROWS = 3
const PM_CARD_ROWS = 3

type CostSum = number | { toString(): string }

// Method syntax, so a fake may narrow the args.
export type RepairListPageDb = {
  maintenanceTicket: {
    findMany(args: {
      where: Prisma.MaintenanceTicketWhereInput
      include: typeof repairListInclude
      orderBy: Prisma.MaintenanceTicketOrderByWithRelationInput[]
      skip: number
      take: number
    }): Promise<RepairListRecord[]>
    count(args: { where: Prisma.MaintenanceTicketWhereInput }): Promise<number>
    groupBy(args: {
      by: ["repairStatus"]
      where: Prisma.MaintenanceTicketWhereInput
      _count: { _all: true }
    }): Promise<Array<{ repairStatus: string; _count: { _all: number } }>>
    // One signature for both reads (the cost: _sum; the open strip cell: _min); Prisma's generic aggregate fits it.
    aggregate(args: {
      where: Prisma.MaintenanceTicketWhereInput
      _count: { _all: true }
      _sum?: { repairCost: true }
      _min?: { reportedDate: true }
    }): Promise<{
      _count: { _all: number }
      _sum?: { repairCost: CostSum | null }
      _min?: { reportedDate: Date | null }
    }>
  }
  asset: {
    findMany(args: {
      where: Prisma.AssetWhereInput
      select: typeof stuckSelect
      orderBy: Prisma.AssetOrderByWithRelationInput
      take?: number
    }): Promise<Array<{ id: string; name: string; assetTag: string; currentLocation: { name: string } | null }>>
    count(args: { where: Prisma.AssetWhereInput }): Promise<number>
  }
  maintenancePlan: PmDueCountsDb["maintenancePlan"] & {
    findMany(args: {
      where: Prisma.MaintenancePlanWhereInput
      select: typeof pmCardSelect
      orderBy: Prisma.MaintenancePlanOrderByWithRelationInput
      take: number
    }): Promise<PmCardPlan[]>
  }
  assetMovement: {
    findMany(args: {
      where: Prisma.AssetMovementWhereInput
      select: typeof cancelMovementSelect
      orderBy: Prisma.AssetMovementOrderByWithRelationInput
    }): Promise<Array<{ referenceId: string | null; reason: string | null; performedAt: Date }>>
  }
}

export type RepairListPage = {
  rows: RepairListRowView[]
  total: number
  statusCounts: RepairStatusCounts
  cost: { count: number; sum: number; cancelled: number }
  strip: RepairStrip
  stuck: { rows: { id: string; name: string; assetTag: string; roomName: string | null }[]; total: number }
  pm: { rows: PmCardRowView[]; overdue: number; week: number }
}

// The rows, the total, the tab counts and the cost follow the filters (decision 7); the strip, the stuck card and the
// PM card count globally, like the bell (G5P5-R1).
export async function readRepairListPage(
  db: RepairListPageDb,
  filters: ParsedMaintenanceListParams,
  now: Date,
): Promise<RepairListPage> {
  const where = buildMaintenanceWhere(filters)
  // G5P5-R4: the cost sums the filtered rows less the cancelled ones; on the ยกเลิก tab that is nothing.
  const onCancelledTab = filters.status === "cancelled"

  const [records, total, groups, costAggregate, cancelled, openAggregate, stuckAssets, stuckTotal, due, plans] = await Promise.all([
    db.maintenanceTicket.findMany({
      where,
      include: repairListInclude,
      orderBy: repairListOrder,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.maintenanceTicket.count({ where }),
    db.maintenanceTicket.groupBy({ by: ["repairStatus"], where: buildMaintenanceWhereWithoutStatus(filters), _count: { _all: true } }),
    onCancelledTab
      ? Promise.resolve(null)
      : db.maintenanceTicket.aggregate({
          where: { AND: [where, { repairStatus: { not: "cancelled" } }] },
          _count: { _all: true },
          _sum: { repairCost: true },
        }),
    db.maintenanceTicket.count({ where: { AND: [where, { repairStatus: "cancelled" }] } }),
    db.maintenanceTicket.aggregate({ where: openRepairRecordWhere, _count: { _all: true }, _min: { reportedDate: true } }),
    db.asset.findMany({
      where: stuckRepairsWhere,
      select: stuckSelect,
      orderBy: { assetTag: "asc" },
      ...(filters.stuck === "all" ? {} : { take: STUCK_CARD_ROWS }),
    }),
    db.asset.count({ where: stuckRepairsWhere }),
    readPmDueCounts(db, now),
    db.maintenancePlan.findMany({ where: buildDuePmPlanWhere(now), select: pmCardSelect, orderBy: { nextDueDate: "asc" }, take: PM_CARD_ROWS }),
  ])

  // G5P5-R6: the latest cancel movement's reason, read once for the page's cancelled rows.
  const cancelledIds = records.filter((record) => toRepairRecordStatus(record.repairStatus) === "cancelled").map((record) => record.id)
  const reasonById = new Map<string, string | null>()
  if (cancelledIds.length > 0) {
    const movements = await db.assetMovement.findMany({
      where: { referenceType: "maintenance", referenceId: { in: cancelledIds }, movementType: "maintenance_cancel" },
      select: cancelMovementSelect,
      orderBy: { performedAt: "asc" },
    })
    // Oldest first, so a later movement overwrites an earlier one.
    for (const movement of movements) {
      if (movement.referenceId) reasonById.set(movement.referenceId, movement.reason)
    }
  }

  return {
    rows: records.map((record) => toRepairListRowView(record, reasonById.get(record.id) ?? null, now)),
    total,
    statusCounts: foldRepairStatusCounts(groups),
    cost: {
      count: costAggregate?._count._all ?? 0,
      sum: costAggregate?._sum?.repairCost == null ? 0 : Number(costAggregate._sum.repairCost),
      cancelled,
    },
    strip: buildRepairStrip({
      open: { count: openAggregate._count._all, earliest: openAggregate._min?.reportedDate ?? null },
      stuck: stuckTotal,
      pmOverdue: due.overdue,
      pmWeek: due.week,
    }),
    stuck: {
      rows: stuckAssets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        assetTag: asset.assetTag,
        roomName: asset.currentLocation?.name ?? null,
      })),
      total: stuckTotal,
    },
    pm: { rows: plans.map((plan) => toPmCardRowView(plan, now)), overdue: due.overdue.count, week: due.week.count },
  }
}
