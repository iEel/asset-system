"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize } from "@/lib/uploads"

type Attachment = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
  uploadedAt: Date | string
}

export function AssetAttachments({
  assetId,
  attachments,
}: {
  assetId: string
  attachments: Attachment[]
}) {
  const router = useRouter()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
      const response = await fetch(`/api/assets/${assetId}/attachments`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }

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
      const response = await fetch(`/api/attachments/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }

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
              <div className="text-sm font-medium text-foreground">{attachment.originalName}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {attachment.fileType} · {formatFileSize(attachment.fileSize)}
              </div>
              <div className="mt-3 flex gap-2">
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
    </section>
  )
}
