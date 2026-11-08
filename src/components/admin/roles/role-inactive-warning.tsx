import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { linkVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import type { RoleListItem } from "@/lib/admin-roles-list"
import { cn } from "@/lib/utils"

type RoleInactiveWarningProps = {
  // Global: inactive roles that still have users, in list order.
  roles: readonly RoleListItem[]
  // The user list filtered to one role (/admin/users?role=<id>), built by the page.
  usersHref: (roleId: string) => string
  className?: string
}

// Spec §6 (replaces the StatStrip's "inactive role with users"): "บทบาทปิดใช้งานแต่ยังมีผู้ใช้ {n} บทบาท · {names}
// ยังผูกกับผู้ใช้ {users} คน …". The names list every such role and the users are their sum; the link opens the user list
// for the first one (my call in the spec). Server-safe.
export function RoleInactiveWarning({ roles, usersHref, className }: RoleInactiveWarningProps) {
  const t = useTranslations("adminRolesPage")
  if (roles.length === 0) return null

  return (
    <Notice
      tone="warning"
      role="note"
      data-slot="role-inactive-warning"
      action={
        <Link href={usersHref(roles[0].id)} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
          {t("inactiveWarningLink")}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
      className={className}
    >
      {t("inactiveWarning", {
        count: roles.length,
        names: roles.map((role) => role.label).join(", "),
        users: roles.reduce((sum, role) => sum + role.userCount, 0),
      })}
    </Notice>
  )
}
