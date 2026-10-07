export const assetRegisterStatusTabs = [
  { key: "ready", statusName: "Ready" },
  { key: "inUse", statusName: "In Use" },
  { key: "checkedOut", statusName: "Checked Out" },
  { key: "pendingRepair", statusName: "Pending Repair" },
  { key: "underMaintenance", statusName: "Under Maintenance" },
] as const

export type AssetRegisterStatusTabKey = (typeof assetRegisterStatusTabs)[number]["key"]

export type AssetRegisterStatusTab = {
  key: AssetRegisterStatusTabKey | "all"
  statusId: string
  count: number
  active: boolean
}

export function buildStatusTabs({
  statuses,
  counts,
  statusId,
}: {
  statuses: ReadonlyArray<{ id: string; name: string }>
  counts: ReadonlyArray<{ statusId: string; count: number }>
  statusId: string
}) {
  const countByStatusId = new Map(counts.map((item) => [item.statusId, item.count]))
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  const statusTabs: AssetRegisterStatusTab[] = assetRegisterStatusTabs.flatMap((definition) => {
    const status = statuses.find((item) => item.name === definition.statusName)
    if (!status) return []
    return [{
      key: definition.key,
      statusId: status.id,
      count: countByStatusId.get(status.id) ?? 0,
      active: statusId === status.id,
    }]
  })
  const tabStatusIds = statusTabs.map((tab) => tab.statusId)

  return {
    tabs: [{ key: "all", statusId: "", count: total, active: !statusId }, ...statusTabs] as AssetRegisterStatusTab[],
    tabStatusIds,
    otherStatusActive: Boolean(statusId) && !tabStatusIds.includes(statusId),
  }
}
