// The PM page's one read (group 5 spec §9, plan 4 G5P4-R1, R4, R5). Server reader: the database is injected, so tests
// pass a fake and this file never imports the client.
import type { Prisma } from "@prisma/client"

import { readPmDueCounts, type PmDueCounts, type PmDueCountsDb } from "./pm-due-counts.ts"
import {
  buildPmPlanListWhere,
  buildPmPlanSearchWhere,
  pmPlanListOrder,
  pmPlanTabs,
  toPmPlanRowView,
  type PmPlanOpenRecord,
  type PmPlanQuery,
  type PmPlanRecord,
  type PmPlanRowView,
  type PmPlanTab,
} from "./pm-plan-list.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

export const pmPlanRowSelect = {
  id: true,
  planNo: true,
  title: true,
  frequency: true,
  intervalDays: true,
  nextDueDate: true,
  planState: true,
  isActive: true,
  updatedAt: true,
  asset: { select: { id: true, name: true, assetTag: true, isActive: true, status: { select: { name: true, nameTh: true } } } },
  vendor: { select: { code: true, name: true } },
} as const

const openRecordSelect = { id: true, repairNo: true, assetId: true } as const

// Method syntax, so a fake may narrow the args.
export type PmPlanPageDb = {
  maintenancePlan: PmDueCountsDb["maintenancePlan"] & {
    groupBy(args: {
      by: ["planState"]
      where: Prisma.MaintenancePlanWhereInput
      _count: { _all: true }
    }): Promise<Array<{ planState: string; _count: { _all: number } }>>
    findMany(args: {
      where: Prisma.MaintenancePlanWhereInput
      select: typeof pmPlanRowSelect
      orderBy: Prisma.MaintenancePlanOrderByWithRelationInput[]
      skip: number
      take: number
    }): Promise<PmPlanRecord[]>
  }
  maintenanceTicket: {
    findMany(args: {
      where: Prisma.MaintenanceTicketWhereInput
      select: typeof openRecordSelect
      orderBy: Prisma.MaintenanceTicketOrderByWithRelationInput[]
    }): Promise<Array<{ id: string; repairNo: string; assetId: string }>>
  }
}

export type PmPlanPage = {
  rows: PmPlanRowView[]
  total: number
  tabCounts: Record<PmPlanTab, number>
  due: PmDueCounts | null
  allPlansCount: number
}

// The tab counts and the due counts follow the search (G5P4-R1); the due counts are read on the active tab only.
// allPlansCount counts every plan whatever the search, so the page tells "no plans yet" from "no match".
export async function readPmPlanPage(db: PmPlanPageDb, query: PmPlanQuery, now: Date): Promise<PmPlanPage> {
  const searchWhere = buildPmPlanSearchWhere(query.q)
  const listWhere = buildPmPlanListWhere(query, now)
  const skip = (query.page - 1) * query.pageSize
  const take = query.pageSize

  const [groups, plans, due, filteredTotal, allPlans] = await Promise.all([
    db.maintenancePlan.groupBy({ by: ["planState"], where: searchWhere, _count: { _all: true } }),
    db.maintenancePlan.findMany({ where: listWhere, select: pmPlanRowSelect, orderBy: pmPlanListOrder(query.tab), skip, take }),
    query.tab === "active" ? readPmDueCounts(db, now, query.q ? searchWhere : undefined) : Promise.resolve(null),
    query.due ? db.maintenancePlan.count({ where: listWhere }) : Promise.resolve(null),
    query.q ? db.maintenancePlan.count({ where: {} }) : Promise.resolve(null),
  ])

  const tabCounts = Object.fromEntries(pmPlanTabs.map((tab) => [tab, 0])) as Record<PmPlanTab, number>
  for (const group of groups) {
    if (pmPlanTabs.some((tab) => tab === group.planState)) tabCounts[group.planState as PmPlanTab] += group._count._all
  }
  const groupsTotal = groups.reduce((sum, group) => sum + group._count._all, 0)

  const openRecordByAsset = new Map<string, PmPlanOpenRecord>()
  const assetIds = [...new Set(plans.map((plan) => plan.asset.id))]
  if (assetIds.length > 0) {
    // Newest first, so the first record seen for an asset is its newest open record.
    const records = await db.maintenanceTicket.findMany({
      where: { ...openRepairRecordWhere, assetId: { in: assetIds } },
      select: openRecordSelect,
      orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
    })
    for (const record of records) {
      if (!openRecordByAsset.has(record.assetId)) openRecordByAsset.set(record.assetId, { id: record.id, repairNo: record.repairNo })
    }
  }

  return {
    rows: plans.map((plan) => toPmPlanRowView(plan, openRecordByAsset, now)),
    total: filteredTotal ?? tabCounts[query.tab],
    tabCounts,
    due,
    allPlansCount: allPlans ?? groupsTotal,
  }
}
