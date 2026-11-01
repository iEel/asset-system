export const assetRegisterStatusTabs = [
  { key: "ready", statusName: "Ready" },
  { key: "inUse", statusName: "In Use" },
  { key: "checkedOut", statusName: "Checked Out" },
  { key: "pendingRepair", statusName: "Pending Repair" },
  { key: "underMaintenance", statusName: "Under Maintenance" },
] as const

export type AssetRegisterStatusTabKey = (typeof assetRegisterStatusTabs)[number]["key"]

export type AssetRegisterStatusTab = {
  key: AssetRegisterStatusTabKey | "all" | "other"
  statusId: string
  count: number
  active: boolean
}

/** One status counted under สถานะอื่น; only statuses with an active row have a name, in English and in Thai. */
export type AssetRegisterOtherStatusCount = { statusId: string; name: string; nameTh: string; count: number }

export function buildStatusTabs({
  statuses,
  counts,
  statusId,
  statusGroup = "",
}: {
  statuses: ReadonlyArray<{ id: string; name: string; nameTh?: string }>
  counts: ReadonlyArray<{ statusId: string; count: number }>
  statusId: string
  statusGroup?: string
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
  const otherStatusActive = Boolean(statusId) && !tabStatusIds.includes(statusId)
  // สถานะอื่น counts every status outside the tabs, so the tabs add up to ทั้งหมด (spec §6.2).
  const otherCounts = counts.filter((item) => !tabStatusIds.includes(item.statusId))
  const otherCount = otherCounts.reduce((sum, item) => sum + item.count, 0)
  const otherBreakdown: AssetRegisterOtherStatusCount[] = otherCounts
    .flatMap((item) => {
      const status = statuses.find((candidate) => candidate.id === item.statusId)
      return status?.nameTh ? [{ statusId: item.statusId, name: status.name, nameTh: status.nameTh, count: item.count }] : []
    })
    .sort((a, b) => b.count - a.count)

  return {
    tabs: [
      { key: "all", statusId: "", count: total, active: !statusId && statusGroup !== "other" },
      ...statusTabs,
      { key: "other", statusId: "", count: otherCount, active: statusGroup === "other" || otherStatusActive },
    ] as AssetRegisterStatusTab[],
    tabStatusIds,
    otherBreakdown,
    otherStatusActive,
  }
}

export type AssetRegisterStatusSumLine = {
  terms: number[]
  total: number
  other: { count: number; top: Array<{ label: string; count: number }>; rest: number }
}

/**
 * The line under the tabs: each tab after ทั้งหมด adds up to ทั้งหมด, and สถานะอื่น names its three largest statuses;
 * the rest (smaller ones and statuses with no name) is summed (spec §6.2). The names are the page's language: English
 * reads `name`, Thai `nameTh` (final review C3).
 */
export function buildStatusSumLine(
  tabs: readonly AssetRegisterStatusTab[],
  otherBreakdown: readonly AssetRegisterOtherStatusCount[],
  locale = "th",
): AssetRegisterStatusSumLine {
  const otherCount = tabs.find((tab) => tab.key === "other")?.count ?? 0
  const top = otherBreakdown.slice(0, 3).map((item) => ({ label: locale === "en" ? item.name : item.nameTh, count: item.count }))
  return {
    terms: tabs.filter((tab) => tab.key !== "all").map((tab) => tab.count),
    total: tabs.find((tab) => tab.key === "all")?.count ?? 0,
    other: { count: otherCount, top, rest: otherCount - top.reduce((sum, item) => sum + item.count, 0) },
  }
}
