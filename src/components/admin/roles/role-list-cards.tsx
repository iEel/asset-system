import Link from "next/link"
import { useTranslations } from "next-intl"
import { StatusBadge } from "@/components/ui/status-badge"
import { isHighRiskRole, type RoleListItem } from "@/lib/admin-roles-list"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type RoleListCardsProps = {
  roles: readonly RoleListItem[]
  // /<locale>/admin/roles
  basePath: string
  permissionTotal: number
  className?: string
}

// Spec §6 phone (my call, no board): one card per role, like the user cards of plan 1. The name is the link to the edit
// page, stretched over the card (its ::before covers the <li>), so the whole card is clickable and the focus ring draws
// round the card, while the key, the status, the users and the permissions stay plain text that screen readers read.
// No fixed widths: long Thai names wrap. Server-safe.
export function RoleListCards({ roles, basePath, permissionTotal, className }: RoleListCardsProps) {
  const t = useTranslations("adminRolesPage")
  const tCommon = useTranslations("common")

  if (roles.length === 0) {
    return (
      <p data-slot="role-list-cards" className={cn("rounded-md border border-border bg-surface p-4 text-center text-sm text-muted-foreground", className)}>
        {tCommon("noData")}
      </p>
    )
  }

  return (
    <ul data-slot="role-list-cards" className={cn("grid min-w-0 gap-2.5", className)}>
      {roles.map((role) => (
        <li
          key={role.id}
          className="relative min-w-0 rounded-md border border-border bg-surface px-3.5 py-3 text-foreground transition-colors hover:border-control-border hover:bg-background motion-reduce:transition-none"
        >
          <span className="flex min-w-0 items-start gap-2">
            <Link
              href={`${basePath}/${role.id}/edit`}
              className="min-w-0 flex-1 break-words text-base font-semibold text-foreground before:absolute before:inset-0 before:rounded-md before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"
            >
              {role.label}
            </Link>
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              <StatusBadge label={role.isActive ? tCommon("active") : tCommon("inactive")} tone={role.isActive ? "success" : "muted"} />
            </span>
          </span>
          <span className="mt-0.5 block min-w-0 break-words text-meta text-muted-foreground">
            <span className="tag">{role.name}</span>
          </span>
          <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="min-w-0 break-words text-muted-foreground">
              {t("users")}{" "}
              <span className="num font-medium text-foreground">{role.userCount === 0 ? t("noUsers") : formatCount(role.userCount)}</span>
            </span>
            <span className="min-w-0 break-words text-muted-foreground">
              {t("permissions")}{" "}
              <span className="num font-medium text-foreground">{t("permissionsOf", { count: role.permissionKeys.length, total: permissionTotal })}</span>
            </span>
            {isHighRiskRole(role.permissionKeys) ? <StatusBadge label={t("highRiskBadge")} tone="warning" /> : null}
            <span aria-hidden="true" className="ml-auto text-primary">
              {tCommon("edit")} ›
            </span>
          </span>
          {!role.isActive && role.userCount > 0 ? (
            <span className="mt-1 block text-meta text-warning">{t("stillHasUsers", { count: role.userCount })}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
