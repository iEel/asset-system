import Link from "next/link"
import { useTranslations } from "next-intl"
import type { UserStatusFilter } from "@/lib/admin-users-list"
import type { UserStatusCounts } from "@/lib/admin-users-page-data"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type UserStatusChipsProps = {
  value: UserStatusFilter
  // Follow the search and the role filter; defaultOnly is absent when the default role does not exist.
  counts: UserStatusCounts
  // The list URL for each status, built by the page: it keeps the search, the role, the sort and the page size, and
  // resets the page to 1.
  hrefFor: (status: UserStatusFilter) => string
  className?: string
}

// Board US-Users .fchip: a pill, 32px from md (44px below), the FilterMenuChip look. The chosen one is filled.
const chipClasses =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0"
const chipCurrentClasses = "border-primary-border bg-primary-soft font-semibold text-primary-hover"
const chipIdleClasses = "border-border bg-surface font-medium text-foreground hover:bg-background"

// Spec §4.2: one status at a time, with counts. ทั้งหมด / ใช้งาน / ไม่ใช้งาน, then ไม่เคยเข้าสู่ระบบ and
// มีแค่บทบาทเริ่มต้น (hidden when the default role does not exist), then ควรตรวจ only while it is chosen (the warning
// bar is its way in). The status is in the URL, so each chip is a real link marked with aria-current. Server-safe.
export function UserStatusChips({ value, counts, hrefFor, className }: UserStatusChipsProps) {
  const t = useTranslations("adminUsersPage.status")
  const groups: UserStatusFilter[][] = [
    ["all", "active", "inactive"],
    [
      "never",
      ...(counts.defaultOnly === undefined ? [] : (["defaultOnly"] as const)),
      ...(value === "review" ? (["review"] as const) : []),
    ],
  ]

  return (
    <nav aria-label={t("label")} data-slot="user-status-chips" className={cn("min-w-0", className)}>
      <ul className="flex flex-wrap items-center gap-1.5">
        {groups.map((group, index) => [
          index > 0 ? <li key={`divider-${index}`} aria-hidden="true" className="mx-1 h-5.5 w-px bg-border" /> : null,
          ...group.map((status) => {
            const current = status === value
            return (
              <li key={status} className="flex">
                <Link
                  href={hrefFor(status)}
                  aria-current={current ? "page" : undefined}
                  className={cn(chipClasses, current ? chipCurrentClasses : chipIdleClasses)}
                >
                  {t(status)}
                  <span className={cn("num", current ? "text-primary" : "text-faint-foreground")}>{formatCount(counts[status] ?? 0)}</span>
                </Link>
              </li>
            )
          }),
        ])}
      </ul>
    </nav>
  )
}
