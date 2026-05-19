import type { ApprovalInboxItem } from "@/lib/approval-inbox"

export const approvalInboxFilters = ["all", "disposal", "maintenance", "audit"] as const

export type ApprovalInboxFilter = (typeof approvalInboxFilters)[number]

export function parseApprovalInboxFilter(
  value: string | string[] | undefined,
): ApprovalInboxFilter {
  const normalized = Array.isArray(value) ? value[0] : value
  return approvalInboxFilters.includes(normalized as ApprovalInboxFilter)
    ? (normalized as ApprovalInboxFilter)
    : "all"
}

export function filterApprovalInboxItems(
  items: ApprovalInboxItem[],
  filter: ApprovalInboxFilter,
) {
  if (filter === "all") return items
  return items.filter((item) => item.module === filter)
}
