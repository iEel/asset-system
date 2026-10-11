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
import type { AuditScanComponent } from "@/components/audit/audit-scan-types"

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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      <form onSubmit={submit} className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="grid gap-3">
          <Field label={t("componentMissingRemarkOptional")}>
            <Textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
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
