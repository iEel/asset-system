import { assetFiltersUseWaitingWorkRules, type AssetListFilters, type AssetWhereOptions } from "@/lib/asset-list-query"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { DEFAULT_WAITING_WORK_RULES, startOfBangkokDay } from "@/lib/waiting-work-rules"

// The register's where options (server only). A load without a windowed value reads no setting, so it adds no query.
export async function getAssetWhereOptions(filters: AssetListFilters, now = new Date()): Promise<AssetWhereOptions> {
  return {
    today: startOfBangkokDay(now),
    rules: assetFiltersUseWaitingWorkRules(filters) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES,
  }
}
