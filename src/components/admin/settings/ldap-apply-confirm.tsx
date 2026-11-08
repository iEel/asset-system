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
// The preview lists every missing active employee, but the apply deactivates them only while the SAVED
// ldap_sync_deactivate_missing is on (src/lib/ldap-sync.ts): with it off the dialog says ปิด 0, lists nobody and says
// why in one neutral line, and the button is the plain ซิงก์.
export function LdapApplyConfirm({
  open,
  creates,
  updates,
  deactivations,
  deactivateMissing,
  returnFocusRef,
  onConfirm,
  onClose,
}: {
  open: boolean
  creates: number
  updates: number
  deactivations: readonly LdapApplyPerson[]
  // The saved ldap_sync_deactivate_missing is "true" (the sync lock guarantees the saved value is the one on screen).
  deactivateMissing: boolean
  returnFocusRef: RefObject<HTMLElement | null>
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useTranslations("systemSettingsPage")
  const deactivating = deactivateMissing ? deactivations : []

  return (
    <AccessibleDialog
      open={open}
      title={t("ldapApply.title")}
      description={t("ldapApply.counts", { creates, updates, deactivates: deactivating.length })}
      size="sm"
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      {!deactivateMissing ? (
        <AccessibleDialogBody>
          <p className="text-sm text-muted-foreground">{t("ldapApply.deactivateOff")}</p>
        </AccessibleDialogBody>
      ) : deactivating.length > 0 ? (
        <AccessibleDialogBody>
          <Notice tone="danger" title={t("ldapApply.deactivateTitle")}>
            <ul className="list-disc space-y-1 pl-5">
              {deactivating.slice(0, 5).map((person) => (
                <li key={person.code}>
                  {person.name} <span className="tag">{person.code}</span>
                </li>
              ))}
            </ul>
            {deactivating.length > 5 ? <p className="mt-1">{t("ldapApply.more", { count: deactivating.length - 5 })}</p> : null}
          </Notice>
        </AccessibleDialogBody>
      ) : null}
      <AccessibleDialogFooter>
        <AccessibleDialogCancel />
        <Button variant={deactivating.length > 0 ? "destructive" : "default"} onClick={onConfirm}>
          {deactivating.length > 0 ? t("ldapApply.confirmDeactivate", { count: deactivating.length }) : t("ldapApply.confirm")}
        </Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
  )
}
