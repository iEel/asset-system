import { prisma } from "@/lib/db"
import { getCheckinReturnStatuses } from "@/lib/asset-status-flow"
import { getAssetOperationConditionOptions } from "@/lib/asset-lifecycle-policy"
import type { AssetOperationMode } from "@/lib/asset-operation-eligibility"
import { searchAssetOperationOptions, type AssetOperationSearchDb } from "@/lib/asset-operation-search"
import type { AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"

export type AssetOperationOption = { id: string; label: string }
export type AssetOperationNamedOption = AssetOperationOption & { name: string }
export type AssetOperationMasterOptions = {
  employees: AssetOperationOption[]
  departments: AssetOperationOption[]
  locations: AssetOperationOption[]
  statuses: AssetOperationNamedOption[]
  conditions: AssetOperationNamedOption[]
}

// The master lists the four transaction pages read (server search spec §3 goal 1): no asset, handover or repair. The
// asset of ส่งมอบ and โอนย้าย comes from the server search, one row at most here (getAssetOperationPreselect).
export async function getAssetOperationMasterOptions(): Promise<AssetOperationMasterOptions> {
  const [employees, departments, locations, statuses, conditions] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    getCheckinReturnStatuses(),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  return {
    employees: employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` })),
    departments: departments.map((department) => ({ id: department.id, label: `${department.code} - ${department.name}` })),
    locations: locations.map((location) => ({ id: location.id, label: `${location.code} - ${location.name}` })),
    statuses: statuses.map((status) => ({ id: status.id, label: status.nameTh, name: status.name })),
    conditions: getAssetOperationConditionOptions(conditions)
      .map((condition) => ({ id: condition.id, label: condition.nameTh, name: condition.name })),
  }
}

// ?assetId= on ส่งมอบ and โอนย้าย (spec 6.4): the search's by-id answer under the page's rule, so the form starts with
// the row chosen, or chosen-but-blocked with its reason. A repeated ?assetId= reaches the page as an array and the
// first counts, as asset-return-navigation reads returnTo (S-R5, S-R42). The pages call it after their permission check.
export async function getAssetOperationPreselect(
  mode: AssetOperationMode,
  assetId: string | string[] | undefined,
): Promise<AssetOperationSearchRow | null> {
  const id = Array.isArray(assetId) ? assetId[0] : assetId
  if (!id) return null
  const answer = await searchAssetOperationOptions(prisma as unknown as AssetOperationSearchDb, {
    mode,
    q: "",
    id,
    assignCustodian: false,
    handedOverAssetId: null,
  })
  return answer.rows[0] ?? null
}
