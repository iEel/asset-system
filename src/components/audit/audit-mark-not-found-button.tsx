"use client"

import { useImperativeHandle, useState, type FormEvent, type ReactNode, type Ref, type RefObject, type SyntheticEvent } from "react"
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
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import type { AuditPendingCustodian, AuditPendingPlace } from "@/lib/audit-pending-list-rules"

type AuditMarkNotFoundButtonVariant = "icon" | "button" | "row"

// React sends events up the component tree, so a click inside the not-found dialog (a portal outside the row) would
// reach the pending list's clickable row and open the asset page (P2-R28). In a row, this wrapper stops them before
// the row; ClickableTableRow already ignores the trigger itself (a button).
function stopRowEvent(event: SyntheticEvent) {
  event.stopPropagation()
}

function RowClickGuard({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return <>{children}</>
  return (
    <div data-no-row-click className="contents" onClick={stopRowEvent} onKeyDown={stopRowEvent}>
      {children}
    </div>
  )
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The photo
// is not a key: the server's file checks answer with a plain error, which keeps its toast.
const FIELD_IDS = {
  remark: "audit-not-found-remark",
} as const
type NotFoundField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as NotFoundField[]

// noValidate keeps the browser out like every V-track form (spec §4.5). Nothing here can be wrong before the request:
// the remark is optional and the server sets no limit on it, and the photo is optional (v-track U-R6).
function validate(): Partial<Record<NotFoundField, string>> {
  return {}
}

export type AuditMarkNotFoundButtonHandle = { open: () => void }

// What the dialog names (spec §9, bug 15): the pending row's own facts, from the item's expected room and custodian.
export type AuditNotFoundAsset = { name: string; tag: string; location: AuditPendingPlace | null; custodian: AuditPendingCustodian }

// An owner (for example a row ⋯ menu) can render this with hideTrigger, open it through ref.current?.open() and pass
// its own button as returnFocusRef, so focus goes back there when the dialog closes.
export function AuditMarkNotFoundButton({
  itemId,
  asset,
  variant = "icon",
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  itemId: string
  asset: AuditNotFoundAsset
  variant?: AuditMarkNotFoundButtonVariant
  ref?: Ref<AuditMarkNotFoundButtonHandle>
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("auditPending")
  const tCommon = useTranslations("common")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [remark, setRemark] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<NotFoundField>()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function openDialog() {
    if (!saving) setDialogOpen(true)
  }

  useImperativeHandle(ref, () => ({ open: openDialog }))

  function resetDialog() {
    setDialogOpen(false)
    setRemark("")
    setEvidenceFile(null)
    fieldErrors.setErrors({})
  }

  function closeDialog() {
    if (!saving) resetDialog()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate())
    if (focusFirstError()) return

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
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
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
    ) : variant === "row" ? (
      <Button variant="outline" size="sm" busy={saving} onClick={openDialog}>
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
    <RowClickGuard active={variant === "row"}>
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
        <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <KeyValueList
              items={[
                { key: "asset", label: t("asset"), value: <><span className="font-medium">{asset.name}</span> <span className="tag">{asset.tag}</span></> },
                { key: "location", label: t("expectedLocation"), value: asset.location ? <><span className="tag">{asset.location.code}</span> - {asset.location.name}</> : t("roomUnknown") },
                {
                  key: "custodian",
                  label: t("expectedCustodian"),
                  value: asset.custodian.kind === "person" ? <><span className="tag">{asset.custodian.code}</span> - {asset.custodian.name}</> : asset.custodian.kind === "none" ? t("noCustodian") : null,
                },
              ]}
            />
            <Notice tone="info">{t("notFoundResult")}</Notice>
            <Field label={t("notFoundRemarkOptional")} id="audit-not-found-remark" error={fieldErrors.message("remark")}>
              <Textarea
                value={remark}
                onChange={(event) => {
                  setRemark(event.target.value)
                  fieldErrors.clear("remark")
                }}
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
    </RowClickGuard>
  )
}
