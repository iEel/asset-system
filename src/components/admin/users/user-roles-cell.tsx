import { useTranslations } from "next-intl"
import { Chip } from "@/components/ui/chip"
import { Nil } from "@/components/ui/nil"
import { splitRoleChips } from "@/lib/admin-users-list"
import { cn } from "@/lib/utils"

type UserRolesCellProps = {
  // Ordered by role name; label = displayNameTh || displayName.
  roles: readonly { id: string; label: string }[]
  className?: string
}

// Spec §4.3 บทบาท: two chips, then "+N", a disclosure that lists the rest; its aria-label names them. The <details> is
// marked data-no-row-click, so opening it does not open the row's edit page. Server-safe: no state, the browser opens it.
export function UserRolesCell({ roles, className }: UserRolesCellProps) {
  const t = useTranslations("adminUsersPage")
  if (roles.length === 0) return <Nil />
  const { shown, rest } = splitRoleChips(roles)

  return (
    <div data-slot="user-roles-cell" className={cn("flex min-w-0 flex-wrap items-start gap-1", className)}>
      {shown.map((role) => (
        <Chip key={role.id} title={role.label}>{role.label}</Chip>
      ))}
      {rest.length > 0 ? (
        <details data-no-row-click className="inline-flex min-w-0 flex-wrap items-start gap-1">
          <summary
            aria-label={t("moreRolesLabel", { count: rest.length, names: rest.map((role) => role.label).join(", ") })}
            className="inline-flex h-5.5 cursor-pointer list-none items-center rounded-control border border-control-border bg-surface px-2 text-meta font-medium text-primary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
          >
            {t("moreRoles", { count: rest.length })}
          </summary>
          {rest.map((role) => (
            <Chip key={role.id} title={role.label}>{role.label}</Chip>
          ))}
        </details>
      ) : null}
    </div>
  )
}
