"use client"

import { useState, type FormEvent } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { FileDropzone } from "@/components/ui/file-dropzone"
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
  const tCommon = useTranslations("common")
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
      <form onSubmit={submit} className="p-4">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-foreground">{t("componentMissingRemarkOptional")}</span>
            <textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              disabled={saving}
              rows={3}
              placeholder={t("componentMissingRemarkPlaceholder")}
              className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </label>
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
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-warning px-4 text-sm font-semibold text-white transition-colors hover:bg-warning-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
            {t("componentMissingConfirm")}
          </button>
        </div>
      </form>
    </AccessibleDialog>
  )
}
