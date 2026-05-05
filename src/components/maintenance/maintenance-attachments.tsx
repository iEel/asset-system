"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, Eye, FileText, Image as ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize } from "@/lib/uploads"

type Attachment = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

export function MaintenanceAttachments({
  ticketId,
  attachments,
}: {
  ticketId: string
  attachments: Attachment[]
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Attachment | null>(null)

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast.error(t("fileRequired"))
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    setUploading(true)

    try {
      const response = await fetch(`/api/maintenance-tickets/${ticketId}/attachments`, {
        method: "POST",
        body: formData,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))

      if (fileInputRef.current) fileInputRef.current.value = ""
      toast.success(t("uploadSuccess"))
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
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <FileText className="h-5 w-5 text-primary" />
        {t("attachments")}
      </h2>

      <form onSubmit={handleUpload} className="mb-4 rounded-md border border-border bg-background p-3">
        <input
          ref={fileInputRef}
          type="file"
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
        />
        <button
          type="submit"
          disabled={uploading}
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {t("uploadAttachment")}
        </button>
      </form>

      {attachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {tCommon("noData")}
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-md border border-border bg-background p-3">
              {isPreviewable(attachment) ? (
                <button
                  type="button"
                  onClick={() => setPreview(attachment)}
                  className="mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:bg-accent"
                >
                  {isImage(attachment) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/attachments/${attachment.id}?inline=1`}
                      alt={attachment.originalName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-sm">
                      <FileText className="h-10 w-10 text-danger" />
                      {t("pdfPreview")}
                    </div>
                  )}
                </button>
              ) : (
                <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-border bg-surface text-muted-foreground">
                  <FileText className="h-10 w-10" />
                </div>
              )}
              <div className="flex items-start gap-2">
                {isImage(attachment) ? (
                  <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                ) : (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <div className="break-words text-sm font-medium text-foreground">{attachment.originalName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {attachment.fileType} · {formatFileSize(attachment.fileSize)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {isPreviewable(attachment) ? (
                  <button
                    type="button"
                    onClick={() => setPreview(attachment)}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("preview")}
                  </button>
                ) : null}
                <a
                  href={`/api/attachments/${attachment.id}`}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("download")}
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deletingId === attachment.id}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                  title={tCommon("delete")}
                >
                  {deletingId === attachment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{preview.originalName}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {preview.fileType} · {formatFileSize(preview.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/attachments/${preview.id}`}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("download")}
                </a>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                  aria-label={tCommon("close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-background p-3">
              {isImage(preview) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/attachments/${preview.id}?inline=1`}
                  alt={preview.originalName}
                  className="mx-auto max-h-[76vh] max-w-full rounded-md object-contain"
                />
              ) : (
                <iframe
                  src={`/api/attachments/${preview.id}?inline=1`}
                  title={preview.originalName}
                  className="h-[76vh] w-full rounded-md border border-border bg-white"
                />
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function isImage(attachment: Attachment) {
  return attachment.fileType.startsWith("image/")
}

function isPdf(attachment: Attachment) {
  return attachment.fileType === "application/pdf"
}

function isPreviewable(attachment: Attachment) {
  return isImage(attachment) || isPdf(attachment)
}
