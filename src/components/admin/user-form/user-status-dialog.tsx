"use client"

import { useRef, useState, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

// Close or reopen an account (spec §5.3): a confirm that names the account, with an optional หมายเหตุ, through
// PATCH /api/admin/users/[id]/status. The server keeps its rules (the last active system administrator, your own
// account); a refusal is a toast through useApiError. After it succeeds the page refreshes with the new status.
export function UserStatusDialog({
  user,
  open,
  returnFocusRef,
  onClose,
}: {
  user: { id: string; displayName: string; isActive: boolean }
  open: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("adminUsersPage")
  const tCommon = useTranslations("common")
  const noteRef = useRef<HTMLTextAreaElement | null>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const closing = user.isActive

  async function confirm() {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive, note: note.trim() || null }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(tCommon("savedSuccess"))
      setNote("")
      onClose()
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccessibleDialog
      open={open}
      title={closing ? t("form.closeTitle", { name: user.displayName }) : t("form.reopenTitle", { name: user.displayName })}
      description={closing ? t("form.closeBody") : t("form.reopenBody")}
      busy={saving}
      size="sm"
      initialFocusRef={noteRef}
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      <AccessibleDialogBody>
        <Field label={t("form.note")} id="admin-user-status-note">
          <Textarea
            ref={noteRef}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={saving}
            rows={3}
            maxLength={500}
            placeholder={t("form.notePlaceholder")}
          />
        </Field>
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel />
        <Button variant={closing ? "destructive" : "default"} busy={saving} onClick={() => void confirm()}>
          {closing ? t("form.closeAccount") : t("form.reopenAccount")}
        </Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
  )
}
