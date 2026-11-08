import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { linkVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import { buildUserListQuery, type UserListFilters } from "@/lib/admin-users-list"
import type { MasterDataListState } from "@/lib/master-data-query"
import { cn } from "@/lib/utils"

type UserReviewWarningProps = {
  // Global: active accounts whose linked employee has left, whatever the search and the role filter.
  count: number
  basePath: string
  state: MasterDataListState<string>
  filters: UserListFilters
  className?: string
}

// Spec §4.1: "ควรตรวจ {n} บัญชี · …" with "ดู {n} บัญชีนี้ →", which opens the list with status=review. The count is
// global, so the link drops the search and the role and the list shows exactly the accounts counted. The system never
// closes these accounts itself. Server-safe.
export function UserReviewWarning({ count, basePath, state, filters, className }: UserReviewWarningProps) {
  const t = useTranslations("adminUsersPage")
  if (count === 0) return null
  const href = `${basePath}?${buildUserListQuery(state, filters, { status: "review", roleId: null, search: "", page: 1 })}`

  return (
    <Notice
      tone="warning"
      role="note"
      data-slot="user-review-warning"
      title={t("reviewTitle", { count })}
      action={
        <Link href={href} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
          {t("reviewLink", { count })}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
      className={className}
    >
      {t("reviewDetail")}
    </Notice>
  )
}
