"use client"

import { useState, type FormEvent } from "react"
import { AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"
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
import { useFieldErrors } from "@/components/ui/use-field-errors"
import type { AuditScanComponent } from "@/components/audit/audit-scan-types"

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  remark: "audit-component-missing-remark",
} as const
type ComponentMissingField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as ComponentMissingField[]

// noValidate keeps the browser out like every V-track form (spec §4.5). Nothing here can be wrong before the request:
// an empty remark becomes the default one, and the photo is optional. The scan workspace sends the request and keeps
// its toast for a refusal (v-track U-R5, U-R6).
function validate(): Partial<Record<ComponentMissingField, string>> {
  return {}
}

export function AuditScanComponentMissingDialog({
  component,
  parentAssetTag,
  saving,
  onCancel,
  onSubmit,
}: {
  component: AuditScanComponent
  parentAssetTag: string
  saving: boolean
  onCancel: () => void
  onSubmit: (remark: string, evidence: File | null) => void
}) {
  const t = useTranslations("auditScan")
  const [remark, setRemark] = useState("")
  const [evidence, setEvidence] = useState<File | null>(null)
  const fieldErrors = useFieldErrors<ComponentMissingField>()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate())
    if (fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })) return
    onSubmit(remark.trim() || t("componentMissingDefaultRemark", { assetTag: parentAssetTag }), evidence)
  }

  return (
    <AccessibleDialog
      open
      title={t("componentMissingDialogTitle")}
      description={t("componentMissingDialogDescription", { asset: `${component.assetTag} - ${component.name}` })}
      busy={saving}
      size="sm"
      onClose={() => {
        if (!saving) onCancel()
      }}
    >
      <form onSubmit={submit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="grid gap-3">
          <Field label={t("componentMissingRemarkOptional")} id="audit-component-missing-remark" error={fieldErrors.message("remark")}>
            <Textarea
              value={remark}
              onChange={(event) => {
                setRemark(event.target.value)
                fieldErrors.clear("remark")
              }}
              disabled={saving}
              rows={3}
              placeholder={t("componentMissingRemarkPlaceholder")}
            />
          </Field>
          <FileDropzone
            file={evidence}
            onFileChange={setEvidence}
            disabled={saving}
            accept="image/*"
            capture="environment"
            title={t("componentMissingEvidenceTitle")}
            hint={t("componentMissingEvidenceSelected")}
            browseLabel={t("componentMissingEvidenceBrowse")}
          />
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button type="submit" variant="warning" busy={saving}>
            <AlertTriangle aria-hidden="true" />
            {t("componentMissingConfirm")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
