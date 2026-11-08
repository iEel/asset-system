"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { FilterMenuChip } from "@/components/ui/filter-menu-chip"
import { buildUserListQuery, type UserListFilters } from "@/lib/admin-users-list"
import type { MasterDataListState } from "@/lib/master-data-query"

// clear starts the × link's name, as FilterChipList's removeLabel does: `${clear}: ${label}: ${role}`.
export type UserRoleFilterChipLabels = { label: string; all: string; search: string; empty: string; clear: string }

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
// size, and resets the page to 1. Spec §4.4: while a role is chosen, the phone row has a 44px × that clears it (same
// query, role removed, page 1). From md the × hides: the menu's ทุกบทบาท option clears the role there.
export function UserRoleFilterChip({ basePath, state, filters, options, labels, className }: UserRoleFilterChipProps) {
  const router = useRouter()
  const chosen = filters.roleId ? options.find((option) => option.value === filters.roleId)?.label ?? filters.roleId : null
  return (
    <>
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
      {filters.roleId ? (
        <Link
          href={`${basePath}?${buildUserListQuery(state, filters, { roleId: null, page: 1 })}`}
          aria-label={`${labels.clear}: ${labels.label}: ${chosen}`}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-primary-border bg-primary-soft text-primary-hover transition-colors hover:bg-primary-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none md:hidden"
        >
          <X aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </>
  )
}
