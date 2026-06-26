"use client"

import { useId, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"

type AuditMarkNotFoundButtonVariant = "icon" | "button"

export function AuditMarkNotFoundButton({ itemId, variant = "icon" }: { itemId: string; variant?: AuditMarkNotFoundButtonVariant }) {
  const router = useRouter()
  const t = useTranslations("auditPending")
  const tCommon = useTranslations("common")
  const titleId = useId()
  const descriptionId = useId()
  const remarkId = useId()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [remark, setRemark] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  function openDialog() {
    if (!saving) setDialogOpen(true)
  }

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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  const icon = saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />
  const trigger =
    variant === "button" ? (
      <button
        type="button"
        onClick={openDialog}
        disabled={saving}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-semibold text-warning transition-colors hover:bg-warning/15 disabled:opacity-50"
      >
        {icon}
        {t("markNotFound")}
      </button>
    ) : (
      <button
        type="button"
        onClick={openDialog}
        disabled={saving}
        title={t("markNotFound")}
        aria-label={t("markNotFound")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
      >
        {icon}
      </button>
    )

  return (
    <>
      {trigger}
      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4">
          <form
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-lg border border-border bg-surface shadow-xl sm:rounded-lg"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
              <div>
                <h2 id={titleId} className="text-base font-semibold text-foreground">
                  {t("notFoundDialogTitle")}
                </h2>
                <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                  {t("notFoundDialogDescription")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                aria-label={tCommon("close")}
                title={tCommon("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(92dvh-9rem)] space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <label htmlFor={remarkId} className="text-sm font-medium text-foreground">
                  {t("notFoundRemarkOptional")}
                </label>
                <textarea
                  id={remarkId}
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  disabled={saving}
                  rows={4}
                  placeholder={t("notFoundRemarkPlaceholder")}
                  className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>

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
            </div>

            <div className="grid gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-warning px-4 text-sm font-semibold text-white transition-colors hover:bg-warning/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                {t("notFoundConfirm")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
