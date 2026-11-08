"use client"

import { useRouter } from "next/navigation"
import { FilterMenuChip } from "@/components/ui/filter-menu-chip"
import { buildUserListQuery, type UserListFilters } from "@/lib/admin-users-list"
import type { MasterDataListState } from "@/lib/master-data-query"

export type UserRoleFilterChipLabels = { label: string; all: string; search: string; empty: string }

type UserRoleFilterChipProps = {
  basePath: string
  state: MasterDataListState<string>
  // Already resolved: an unknown role id reads as ทุกบทบาท.
  filters: UserListFilters
  // Every role, active and inactive (the dev DB has more than 1,000), so the menu is searchable.
  options: readonly { value: string; label: string }[]
  labels: UserRoleFilterChipLabels
  className?: string
}

// Spec §4.2: "บทบาท: ทุกบทบาท" (role=<roleId>). Choosing a role keeps the search, the status, the sort and the page
// size, and resets the page to 1.
export function UserRoleFilterChip({ basePath, state, filters, options, labels, className }: UserRoleFilterChipProps) {
  const router = useRouter()
  return (
    <FilterMenuChip
      searchable
      label={labels.label}
      options={[{ value: "", label: labels.all }, ...options]}
      value={filters.roleId ?? ""}
      onValueChange={(next) => router.push(`${basePath}?${buildUserListQuery(state, filters, { roleId: next || null, page: 1 })}`)}
      searchPlaceholder={labels.search}
      emptyLabel={labels.empty}
      className={className}
    />
  )
}
