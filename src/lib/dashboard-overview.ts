// The dashboard's overview numbers (group 1 spec §6.4-6.6): one round of reads, each count through the register's
// own where builder, so every number opens a list that shows the same count. It never writes.
import { prisma } from "@/lib/db"
import { countDashboardAssetCrossScope } from "@/lib/asset-cross-scope"
import { assetNotClosedStatusWhere } from "@/lib/asset-custodian-state-filter"
import { buildAssetWhere, parseAssetListParams } from "@/lib/asset-list-query"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"
import {
  buildDashboardAudit,
  buildDashboardStatusRows,
  dashboardRegisterParams,
  type DashboardOverview,
} from "@/lib/dashboard-overview-rules"
import { startOfBangkokDay } from "@/lib/waiting-work-rules"

export type { DashboardOverview }

export async function getDashboardOverview({ companyId, now }: { companyId: string | null; now: Date }): Promise<DashboardOverview> {
  const totalWhere = buildAssetWhere(parseAssetListParams(dashboardRegisterParams("total", companyId)))

  const [
    total,
    idle180,
    custodianAssigned,
    responsibilityMissing,
    open,
    statusGroups,
    statuses,
    crossScopeTotal,
    rounds,
    itemGroups,
    branches,
  ] = await Promise.all([
    prisma.asset.count({ where: totalWhere }),
    prisma.asset.count({ where: buildAssetWhere(parseAssetListParams(dashboardRegisterParams("idle180", companyId))) }),
    prisma.asset.count({ where: buildAssetWhere(parseAssetListParams(dashboardRegisterParams("custodianAssigned", companyId))) }),
    prisma.asset.count({ where: buildAssetWhere(parseAssetListParams(dashboardRegisterParams("responsibilityMissing", companyId))) }),
    // The share's denominator: the very fragment inside custodianState=assigned, with the same company.
    prisma.asset.count({ where: { AND: [totalWhere, assetNotClosedStatusWhere] } }),
    prisma.asset.groupBy({
      by: ["statusId"],
      where: totalWhere,
      _count: { _all: true },
    }),
    prisma.assetStatus.findMany({ select: { id: true, name: true, nameTh: true, sortOrder: true } }),
    countDashboardAssetCrossScope(companyId),
    // Not narrowed by company, so otherOpen > 0 exactly when the rounds list's ?view=open holds another round.
    prisma.auditRound.findMany({
      where: { isActive: true, status: auditRoundOperationalWhere },
      select: { id: true, auditNo: true, name: true, status: true, startDate: true, endDate: true },
    }),
    prisma.auditItem.groupBy({
      by: ["auditRoundId", "expectedBranchId", "auditStatus"],
      where: { auditRound: { isActive: true, status: auditRoundOperationalWhere }, ...(companyId ? { expectedCompanyId: companyId } : {}) },
      _count: { _all: true },
    }),
    // Every branch: expectedBranchId is not a relation.
    prisma.branch.findMany({ select: { id: true, name: true, company: { select: { code: true } } } }),
  ])

  return {
    total,
    idle180,
    custodianAssigned,
    custodianShare: open > 0 ? custodianAssigned / open : null,
    responsibilityMissing,
    statusRows: buildDashboardStatusRows(
      statusGroups.map((group) => ({ statusId: group.statusId, count: group._count._all })),
      statuses,
    ),
    crossScopeTotal,
    audit: buildDashboardAudit({
      rounds,
      itemCounts: itemGroups.map((group) => ({
        auditRoundId: group.auditRoundId,
        expectedBranchId: group.expectedBranchId,
        auditStatus: group.auditStatus,
        count: group._count._all,
      })),
      branches: new Map(branches.map((branch) => [branch.id, { name: branch.name, companyCode: branch.company.code }])),
      today: startOfBangkokDay(now),
      narrowedToCompany: companyId !== null,
    }),
  }
}
