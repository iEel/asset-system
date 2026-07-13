"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, FileText, Image as ImageIcon, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { formatFileSize } from "@/lib/uploads"

type Attachment = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

export function DisposalAttachments({
  requestId,
  attachments,
  canManage,
  uploadEndpoint = `/api/disposal-requests/${requestId}/attachments`,
  title,
}: {
  requestId: string
  attachments: Attachment[]
  canManage: boolean
  uploadEndpoint?: string
  title?: string
}) {
  const router = useRouter()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function upload(fileToUpload: File | null) {
    if (!fileToUpload) return
    setFile(fileToUpload)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", fileToUpload)
      const response = await fetch(uploadEndpoint, { method: "POST", body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("evidenceUploadSuccess"))
      setFile(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("deleteConfirm"))) return
    setDeletingId(id)
    try {
      const response = await fetch(`/api/attachments/${id}`, { method: "DELETE" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(tCommon("savedSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <FileText className="h-5 w-5 text-primary" />
        {title ?? t("requestEvidence")}
      </h2>
      {canManage ? (
        <div className="mb-4">
          <FileDropzone
            file={file}
            onFileChange={upload}
            disabled={uploading}
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,application/pdf"
            capture="environment"
            title={t("dropEvidenceTitle")}
            hint={uploading ? t("uploadingEvidence") : t("dropEvidenceSelected")}
            browseLabel={t("dropEvidenceHint")}
          />
        </div>
      ) : null}
      {attachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{tCommon("noData")}</div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-md border border-border bg-background p-3">
              {attachment.fileType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/attachments/${attachment.id}?inline=1`} alt={attachment.originalName} className="mb-3 aspect-[4/3] w-full rounded-md border border-border object-cover" />
              ) : null}
              <div className="flex items-start gap-2">
                {attachment.fileType.startsWith("image/") ? <ImageIcon className="mt-0.5 h-4 w-4 text-info" /> : <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium text-foreground">{attachment.originalName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{attachment.fileType} · {formatFileSize(attachment.fileSize)}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <a href={`/api/attachments/${attachment.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">
                  <Download className="h-3.5 w-3.5" />
                  {t("download")}
                </a>
                {canManage ? (
                  <button type="button" onClick={() => handleDelete(attachment.id)} disabled={deletingId === attachment.id} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 sm:h-8 sm:min-h-0 sm:w-8 sm:min-w-0" aria-label={tCommon("delete")} title={tCommon("delete")}>
                    {deletingId === attachment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
