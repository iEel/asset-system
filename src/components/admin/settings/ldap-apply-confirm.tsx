"use client"

import type { RefObject } from "react"
import { useTranslations } from "next-intl"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"

type LdapApplyPerson = { code: string; name: string }

// The confirm before an LDAP sync runs (board AD-Settings, group 12 plan 5 Task 4): the preview's counts "เพิ่ม n · แก้ n ·
// ปิด n", the people it will deactivate in the danger tone (the first five, then "และอีก n คน") and an explicit button
// that says what it does. The caller sends the preview's deactivation count with the apply; focus goes back to Apply.
export function LdapApplyConfirm({
  open,
  creates,
  updates,
  deactivations,
  returnFocusRef,
  onConfirm,
  onClose,
}: {
  open: boolean
  creates: number
  updates: number
  deactivations: readonly LdapApplyPerson[]
  returnFocusRef: RefObject<HTMLElement | null>
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useTranslations("systemSettingsPage")

  return (
    <AccessibleDialog
      open={open}
      title={t("ldapApply.title")}
      description={t("ldapApply.counts", { creates, updates, deactivates: deactivations.length })}
      size="sm"
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      {deactivations.length > 0 ? (
        <AccessibleDialogBody>
          <Notice tone="danger" title={t("ldapApply.deactivateTitle")}>
            <ul className="list-disc space-y-1 pl-5">
              {deactivations.slice(0, 5).map((person) => (
                <li key={person.code}>
                  {person.name} <span className="tag">{person.code}</span>
                </li>
              ))}
            </ul>
            {deactivations.length > 5 ? <p className="mt-1">{t("ldapApply.more", { count: deactivations.length - 5 })}</p> : null}
          </Notice>
        </AccessibleDialogBody>
      ) : null}
      <AccessibleDialogFooter>
        <AccessibleDialogCancel />
        <Button variant={deactivations.length > 0 ? "destructive" : "default"} onClick={onConfirm}>
          {deactivations.length > 0 ? t("ldapApply.confirmDeactivate", { count: deactivations.length }) : t("ldapApply.confirm")}
        </Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
  )
}
