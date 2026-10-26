import type { Prisma } from "@prisma/client"
import { applyAssetCrossScopeFilter } from "@/lib/asset-cross-scope"
import {
  assetFiltersUseWaitingWorkRules,
  buildAssetStatusCountWhere,
  type AssetListFilters,
  type AssetWhereOptions,
} from "@/lib/asset-list-query"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { DEFAULT_WAITING_WORK_RULES, startOfBangkokDay } from "@/lib/waiting-work-rules"

// The register's where options (server only). A load without a windowed value reads no setting, so it adds no query.
export async function getAssetWhereOptions(filters: AssetListFilters, now = new Date()): Promise<AssetWhereOptions> {
  return {
    today: startOfBangkokDay(now),
    rules: assetFiltersUseWaitingWorkRules(filters) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES,
  }
}

// The register's own list: its filters with the settings' windows, the cross-scope narrowing, then the status. The
// register page and the asset page's previous / next (asset-neighbours.ts) read this one where (group 1 spec §7.2).
export async function buildAssetRegisterWhere(filters: AssetListFilters): Promise<{ statusCountWhere: Prisma.AssetWhereInput; where: Prisma.AssetWhereInput }> {
  const whereOptions = await getAssetWhereOptions(filters)
  const statusCountWhere = await applyAssetCrossScopeFilter(buildAssetStatusCountWhere(filters, whereOptions), filters.crossScope)
  const where: Prisma.AssetWhereInput = filters.statusId ? { AND: [statusCountWhere, { statusId: filters.statusId }] } : statusCountWhere
  return { statusCountWhere, where }
}
