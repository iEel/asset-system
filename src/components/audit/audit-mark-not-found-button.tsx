"use client"

import { useId, useImperativeHandle, useState, type FormEvent, type Ref, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

type AuditMarkNotFoundButtonVariant = "icon" | "button"

export type AuditMarkNotFoundButtonHandle = { open: () => void }

// An owner (for example a row ⋯ menu) can render this with hideTrigger, open it through ref.current?.open() and pass
// its own button as returnFocusRef, so focus goes back there when the dialog closes.
export function AuditMarkNotFoundButton({
  itemId,
  variant = "icon",
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  itemId: string
  variant?: AuditMarkNotFoundButtonVariant
  ref?: Ref<AuditMarkNotFoundButtonHandle>
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("auditPending")
  const tCommon = useTranslations("common")
  const remarkId = useId()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [remark, setRemark] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  function openDialog() {
    if (!saving) setDialogOpen(true)
  }

  useImperativeHandle(ref, () => ({ open: openDialog }))

  function resetDialog() {
    setDialogOpen(false)
    setRemark("")
    setEvidenceFile(null)
  }

  function closeDialog() {
    if (!saving) resetDialog()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    try {
      const body = new FormData()
      body.append("remark", remark.trim())
      if (evidenceFile) body.append("evidence", evidenceFile)

      const response = await fetch(`/api/audit-items/${itemId}/mark-not-found`, {
        method: "POST",
        body,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("notFoundSuccess"))
      resetDialog()
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  const icon = <AlertTriangle className="text-warning" aria-hidden="true" />
  const trigger =
    variant === "button" ? (
      <Button variant="outline" busy={saving} onClick={openDialog} className="w-full">
        {icon}
        {t("markNotFound")}
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon-sm"
        busy={saving}
        onClick={openDialog}
        title={t("markNotFound")}
        aria-label={t("markNotFound")}
      >
        {icon}
      </Button>
    )

  return (
    <>
      {hideTrigger ? null : trigger}
      <AccessibleDialog
        open={dialogOpen}
        title={t("notFoundDialogTitle")}
        description={t("notFoundDialogDescription")}
        busy={saving}
        size="sm"
        returnFocusRef={returnFocusRef}
        onClose={closeDialog}
      >
        <form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <Field label={t("notFoundRemarkOptional")}>
              <Textarea
                id={remarkId}
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                disabled={saving}
                rows={4}
                placeholder={t("notFoundRemarkPlaceholder")}
                className="min-h-28"
              />
            </Field>

            <FileDropzone
              file={evidenceFile}
              onFileChange={setEvidenceFile}
              disabled={saving}
              accept="image/*"
              capture="environment"
              title={t("notFoundEvidenceTitle")}
              hint={t("notFoundEvidenceSelected")}
              browseLabel={t("notFoundEvidenceBrowse")}
            />
          </AccessibleDialogBody>

          <AccessibleDialogFooter>
            <AccessibleDialogCancel />
            <Button type="submit" variant="warning" busy={saving}>
              <AlertTriangle aria-hidden="true" />
              {t("notFoundConfirm")}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
    </>
  )
}
