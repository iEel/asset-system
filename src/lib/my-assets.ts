import type { Prisma } from "@prisma/client"

export type MyAssetsUser = {
  employeeId?: string | null
}

export type MyAssetSummaryItem = {
  statusName: string | null
  hasPhoto: boolean
}

export function buildMyAssetsWhere(user: MyAssetsUser): Prisma.AssetWhereInput {
  const employeeId = user.employeeId?.trim()
  if (!employeeId) return { id: "__my_assets_no_employee__" }
  return { isActive: true, custodianId: employeeId }
}

export function summarizeMyAssets(items: MyAssetSummaryItem[]) {
  return {
    total: items.length,
    ready: items.filter((item) => normalizeStatus(item.statusName) === "ready").length,
    needsAttention: items.filter((item) => {
      const status = normalizeStatus(item.statusName)
      return status === "under maintenance" || status === "pending repair"
    }).length,
    missingPhoto: items.filter((item) => !item.hasPhoto).length,
  }
}

function normalizeStatus(value: string | null) {
  return (value ?? "").trim().toLocaleLowerCase()
}
