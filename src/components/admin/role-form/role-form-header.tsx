"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ChevronDown, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import type { RoleFormRole } from "@/lib/role-form-data"
import { buildSystemLogRecordHref } from "@/lib/system-log-history"
import { cn } from "@/lib/utils"

// The page header (spec §7): on create the title and the subtitle as before; on edit "แก้ไขสิทธิ์บทบาท · {name}", the
// status and type badges, the key, and "ผู้ใช้ในบทบาทนี้ {n} คน", which jumps to the people section when the viewer
// may see it (user:view). อื่น ๆ holds the role's history and shows only to viewers of the logs (system:view), so a
// viewer without it gets no empty menu.
export function RoleFormHeader({
  role,
  backHref,
  userCount,
  canViewUsers,
  canViewLogs,
}: {
  role: RoleFormRole
  backHref: string
  userCount: number
  canViewUsers: boolean
  canViewLogs: boolean
}) {
  const locale = useLocale()
  const t = useTranslations("adminRolesPage")
  const tCommon = useTranslations("common")

  if (!role.id) {
    return (
      <PageHeader
        title={t("createTitle")}
        meta={t("createSubtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />
    )
  }

  const users = t("form.usersInRole", { count: userCount })

  return (
    <PageHeader
      title={t("form.editTitle", { name: role.displayNameTh || role.displayName })}
      meta={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge label={role.isActive ? tCommon("active") : tCommon("inactive")} tone={role.isActive ? "success" : "muted"} />
          <StatusBadge label={role.isSystem ? t("systemRole") : t("customRole")} tone={role.isSystem ? "info" : "neutral"} />
          <span className="tag">{role.name}</span>
          {canViewUsers ? <a href="#role-people" className={cn(linkVariants(), "num")}>{users}</a> : <span className="num">{users}</span>}
        </span>
      }
      actions={
        canViewLogs ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="md">
                {t("form.more")}
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem asChild>
                <Link href={buildSystemLogRecordHref(locale, "role", role.id)}>
                  <History aria-hidden="true" />
                  {t("form.history")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      className="mb-6"
      back={<PageBackLink href={backHref} label={tCommon("back")} />}
    />
  )
}
