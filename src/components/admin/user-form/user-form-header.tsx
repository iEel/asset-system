"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ChevronDown, History, Power, PowerOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemDescription,
  DropdownMenuItemText,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { UserStatusDialog } from "@/components/admin/user-form/user-status-dialog"
import type { UserFormData } from "@/lib/admin-user-form-data"
import { buildSystemLogRecordHref } from "@/lib/system-log-history"
import { formatDate, formatDateTime } from "@/lib/utils"

// The page header (spec §5): on create the title alone; on edit "แก้ไขผู้ใช้ · {name}", the status and login name, the
// last sign-in and the creation date, and อื่น ๆ with the account history (system:view only) and close or reopen.
// Closing waits while the form has unsaved edits, and never applies to your own account; the dialog is outside the
// menu and focus returns to อื่น ๆ (audit-round-header-menus.tsx).
export function UserFormHeader({
  title,
  backHref,
  user,
  canViewLogs,
  dirty,
}: {
  title: string
  backHref: string
  user: UserFormData["user"]
  canViewLogs: boolean
  dirty: boolean
}) {
  const locale = useLocale()
  const t = useTranslations("adminUsersPage")
  const tCommon = useTranslations("common")
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null)
  const openingDialogRef = useRef(false)
  const [statusOpen, setStatusOpen] = useState(false)

  if (!user) {
    return (
      <PageHeader
        title={title}
        meta={t("formSubtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />
    )
  }

  const statusBlocked = user.isSelf ? t("form.closeSelf") : dirty ? t("form.saveFirst") : null
  const statusLabel = user.isActive ? t("form.closeAccount") : t("form.reopenAccount")
  const StatusIcon = user.isActive ? PowerOff : Power

  return (
    <>
      <PageHeader
        title={title}
        meta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge label={user.isActive ? tCommon("active") : tCommon("inactive")} tone={user.isActive ? "success" : "muted"} />
            <span className="tag">{user.username}</span>
            <span className="num">
              {user.lastLoginAt ? t("form.lastLogin", { time: formatDateTime(user.lastLoginAt) }) : t("neverLoggedIn")}
            </span>
            <span className="num">{t("form.createdAt", { date: formatDate(user.createdAt) })}</span>
          </span>
        }
        actions={
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button ref={moreTriggerRef} variant="outline" size="md">
                {t("form.more")}
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72"
              onCloseAutoFocus={(event) => {
                if (!openingDialogRef.current) return
                openingDialogRef.current = false
                event.preventDefault()
              }}
            >
              {canViewLogs ? (
                <DropdownMenuItem asChild>
                  <Link href={buildSystemLogRecordHref(locale, "user", user.id)}>
                    <History aria-hidden="true" />
                    {t("form.history")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {statusBlocked ? (
                <DropdownMenuItem unavailable={true} variant={user.isActive ? "destructive" : "default"}>
                  <StatusIcon aria-hidden="true" />
                  <DropdownMenuItemText>
                    {statusLabel}
                    <DropdownMenuItemDescription>{statusBlocked}</DropdownMenuItemDescription>
                  </DropdownMenuItemText>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant={user.isActive ? "destructive" : "default"}
                  onSelect={() => {
                    openingDialogRef.current = true
                    setStatusOpen(true)
                  }}
                >
                  <StatusIcon aria-hidden="true" />
                  {statusLabel}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />
      <UserStatusDialog user={user} open={statusOpen} returnFocusRef={moreTriggerRef} onClose={() => setStatusOpen(false)} />
    </>
  )
}
