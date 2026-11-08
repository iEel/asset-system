import Link from "next/link"
import { useTranslations } from "next-intl"
import { Chip } from "@/components/ui/chip"
import { StatusBadge } from "@/components/ui/status-badge"
import { splitRoleChips } from "@/lib/admin-users-list"
import type { UserListRow } from "@/lib/admin-users-page-data"
import { cn, formatDateTime } from "@/lib/utils"

type UserListCardsProps = {
  rows: readonly UserListRow[]
  // /<locale>/admin/users
  basePath: string
  className?: string
}

// Board US-Users-Phone: one card per user. The name is the link to the edit page, stretched over the card (the
// register's pattern: its ::before covers the <li>), so the whole card is clickable and the focus ring draws round the
// card, while the status, the left badge, the roles and the last sign-in stay plain text that screen readers read. The
// link reads "แก้ไขผู้ใช้ {name} ({username})" plus "(คุณ)" for the viewer's own account. The name, the you badge and the status; the login name, the
// department and the branch; two role chips and "+N" as plain text (the card is already the link); the last sign-in
// or ยังไม่เคยเข้าสู่ระบบ; and an "แก้ไข ›" hint. No fixed widths: long Thai names and roles wrap. Server-safe.
export function UserListCards({ rows, basePath, className }: UserListCardsProps) {
  const t = useTranslations("adminUsersPage")
  const tCommon = useTranslations("common")

  if (rows.length === 0) {
    return (
      <p data-slot="user-list-cards" className={cn("rounded-md border border-border bg-surface p-4 text-center text-sm text-muted-foreground", className)}>
        {tCommon("noData")}
      </p>
    )
  }

  return (
    <ul data-slot="user-list-cards" className={cn("grid min-w-0 gap-2.5", className)}>
      {rows.map((row) => {
        const { shown, rest } = splitRoleChips(row.roles)
        const label = t("editUserLabel", { name: row.displayName, username: row.username }) + (row.isSelf ? ` (${t("you")})` : "")
        const place = row.employee
          ? [row.employee.departmentName, row.employee.branchName].filter(Boolean).join(" · ")
          : t("noEmployeeLinked")
        return (
          <li
            key={row.id}
            className="relative min-w-0 rounded-md border border-border bg-surface px-3.5 py-3 text-foreground transition-colors hover:border-control-border hover:bg-background motion-reduce:transition-none"
          >
            <span className="flex min-w-0 items-start gap-2">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                <Link
                  href={`${basePath}/${row.id}/edit`}
                  className="min-w-0 break-words text-base font-semibold text-foreground before:absolute before:inset-0 before:rounded-md before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"
                >
                  <span aria-hidden="true">{row.displayName}</span>
                  <span className="sr-only">{label}</span>
                </Link>
                {row.isSelf ? (
                  <span aria-hidden="true" className="inline-flex h-5.5 shrink-0 items-center rounded-control border border-primary-border bg-primary-soft px-1.5 text-meta font-medium text-primary-hover">
                    {t("you")}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                {row.employee?.hasLeft ? <StatusBadge label={t("employeeLeft")} tone="warning" /> : null}
                <StatusBadge label={row.isActive ? tCommon("active") : tCommon("inactive")} tone={row.isActive ? "success" : "muted"} />
              </span>
            </span>
            <span className="mt-0.5 block min-w-0 break-words text-meta text-muted-foreground">
              <span className="tag">{row.username}</span> · {place}
            </span>
            {row.roles.length > 0 ? (
              <span className="mt-2 flex min-w-0 flex-wrap gap-1">
                {shown.map((role) => (
                  <Chip key={role.id} title={role.label}>{role.label}</Chip>
                ))}
                {rest.length > 0 ? (
                  <span className="inline-flex h-5.5 items-center rounded-control border border-control-border bg-surface px-2 text-meta font-medium text-primary">
                    {t("moreRoles", { count: rest.length })}
                  </span>
                ) : null}
              </span>
            ) : null}
            <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
              {row.lastLoginAt ? (
                <span className="num min-w-0 break-words text-muted-foreground">{t("lastLoginShort", { time: formatDateTime(row.lastLoginAt) })}</span>
              ) : (
                <span className="min-w-0 break-words text-warning">{t("neverLoggedIn")}</span>
              )}
              <span aria-hidden="true" className="ml-auto text-primary">
                {tCommon("edit")} ›
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
