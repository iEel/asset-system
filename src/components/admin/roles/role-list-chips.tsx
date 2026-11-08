import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  ROLE_CHECK_FILTERS,
  ROLE_TYPE_FILTERS,
  type RoleCheckFilter,
  type RoleListFilters,
  type RoleTypeFilter,
} from "@/lib/admin-roles-list"
import type { RoleListCounts } from "@/lib/admin-roles-page-data"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type RoleListChipsProps = {
  type: RoleTypeFilter
  check: RoleCheckFilter | null
  // Follow the search only.
  counts: RoleListCounts
  // The list URL for a change, built by the page: it keeps the other filters, the search and the page size.
  hrefFor: (next: Partial<RoleListFilters>) => string
  className?: string
}

// The user list's chip look (user-status-chips.tsx): a pill, 32px from md (44px below); the chosen one is filled.
const chipClasses =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0"
const chipCurrentClasses = "border-primary-border bg-primary-soft font-semibold text-primary-hover"
const chipIdleClasses = "border-border bg-surface font-medium text-foreground hover:bg-background"

// One chip: a link with its count, marked with aria-current when chosen.
function ChipLink({ href, current, label, count }: { href: string; current: boolean; label: string; count: string }) {
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={cn(chipClasses, current ? chipCurrentClasses : chipIdleClasses)}>
      {label}
      <span className={cn("num", current ? "text-primary" : "text-faint-foreground")}>{count}</span>
    </Link>
  )
}

const typeLabelKeys = { all: "typeAll", system: "typeSystem", custom: "typeCustom" } as const
const checkLabelKeys = { highRisk: "checkHighRisk", noUsers: "checkNoUsers", inactive: "checkInactive" } as const

// Spec §6 (board US-Roles): two link-chip groups with counts. ประเภท: ทั้งหมด · บทบาทระบบ · บทบาททั่วไป, one at a
// time. ควรตรวจ: สิทธิ์สูง · ไม่มีผู้ใช้ · ไม่ใช้งาน, at most one, and clicking the chosen one clears it. The filters are
// in the URL, so each chip is a real link marked with aria-current; a chip goes back to page 1. Server-safe.
export function RoleListChips({ type, check, counts, hrefFor, className }: RoleListChipsProps) {
  const t = useTranslations("adminRolesPage")

  return (
    <div data-slot="role-list-chips" className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <nav aria-label={t("typeLabel")} className="min-w-0">
        <ul className="flex flex-wrap items-center gap-1.5">
          {ROLE_TYPE_FILTERS.map((value) => {
            const current = value === type
            return (
              <li key={value} className="flex">
                <ChipLink href={hrefFor({ type: value, page: 1 })} current={current} label={t(typeLabelKeys[value])} count={formatCount(counts[value])} />
              </li>
            )
          })}
        </ul>
      </nav>
      <span aria-hidden="true" className="h-5.5 w-px bg-border" />
      <nav aria-label={t("checkLabel")} className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span aria-hidden="true" className="text-meta font-medium text-muted-foreground">{t("checkLabel")}</span>
        <ul className="flex flex-wrap items-center gap-1.5">
          {ROLE_CHECK_FILTERS.map((value) => {
            const current = value === check
            return (
              <li key={value} className="flex">
                <ChipLink href={hrefFor({ check: current ? null : value, page: 1 })} current={current} label={t(checkLabelKeys[value])} count={formatCount(counts[value])} />
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
