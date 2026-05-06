"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CheckCircle2, Download, FileText, ImageIcon, Loader2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize } from "@/lib/uploads"
import { FileDropzone } from "@/components/ui/file-dropzone"

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
  modelPhotos = [],
  photoChecklist = [],
}: {
  assetId: string
  attachments: Attachment[]
  modelPhotos?: Attachment[]
  photoChecklist?: string[]
}) {
  const router = useRouter()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [photoLabel, setPhotoLabel] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const imageAttachments = attachments.filter(isImage)
  const primaryAssetPhoto = imageAttachments[0]
  const primaryModelPhoto = modelPhotos.find(isImage)

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFile) {
      toast.error(t("fileRequired"))
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)
    if (photoLabel) formData.append("photoLabel", photoLabel)
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

      setSelectedFile(null)
      setPhotoLabel("")
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
        <ImageIcon className="h-5 w-5 text-primary" />
        {t("assetPhotos")}
      </h2>

      <div className="mb-4 grid grid-cols-1 gap-3">
        {primaryModelPhoto && (
          <PhotoPreview title={t("modelPhoto")} attachment={primaryModelPhoto} />
        )}
        {primaryAssetPhoto && (
          <PhotoPreview title={t("primaryAssetPhoto")} attachment={primaryAssetPhoto} />
        )}
      </div>

      {photoChecklist.length > 0 && (
        <div className="mb-4 rounded-md border border-border bg-background p-3">
          <div className="mb-2 text-sm font-semibold text-foreground">{t("photoChecklist")}</div>
          <div className="space-y-2">
            {photoChecklist.map((item) => {
              const complete = imageAttachments.some((attachment) => attachment.originalName.startsWith(`${item} - `))
              return (
                <div key={item} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground">{item}</span>
                  <span className={complete ? "inline-flex items-center gap-1 text-success" : "text-muted-foreground"}>
                    {complete && <CheckCircle2 className="h-4 w-4" />}
                    {complete ? t("photoChecklistDone") : t("photoChecklistPending")}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleUpload} className="mb-4 rounded-md border border-border bg-background p-3">
        {photoChecklist.length > 0 && (
          <select
            value={photoLabel}
            onChange={(event) => setPhotoLabel(event.target.value)}
            className="mb-3 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">{t("selectPhotoType")}</option>
            {photoChecklist.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        )}
        <FileDropzone
          file={selectedFile}
          onFileChange={setSelectedFile}
          disabled={uploading}
          title={t("dropFileTitle")}
          hint={t("dropFileSelected")}
          browseLabel={t("dropFileHint")}
        />
        <button
          type="submit"
          disabled={uploading}
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {t("uploadAssetPhoto")}
        </button>
      </form>

      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-primary" />
        {t("attachments")}
      </h3>

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

function PhotoPreview({ title, attachment }: { title: string; attachment: Attachment }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="relative aspect-video w-full">
        <Image
          src={`/api/attachments/${attachment.id}?inline=1`}
          alt={attachment.originalName}
          fill
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="p-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{attachment.originalName}</div>
      </div>
    </div>
  )
}

function isImage(attachment: Attachment) {
  return attachment.fileType.startsWith("image/")
}
