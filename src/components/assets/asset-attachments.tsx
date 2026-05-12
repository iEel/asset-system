"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CheckCircle2, Download, FileText, ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react"
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

type PhotoPreviewState = {
  title: string
  attachment: Attachment
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
  const [uploadingPhotoLabel, setUploadingPhotoLabel] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [photoLabel, setPhotoLabel] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [checklistFiles, setChecklistFiles] = useState<Record<string, File | null>>({})
  const [previewPhoto, setPreviewPhoto] = useState<PhotoPreviewState | null>(null)
  const imageAttachments = attachments.filter(isImage)
  const primaryModelPhoto = modelPhotos.find(isImage)
  const legacyLabelCounts = photoChecklist.reduce<Record<string, number>>((counts, item) => {
    const legacyLabel = legacySanitizedLabel(item)
    counts[legacyLabel] = (counts[legacyLabel] ?? 0) + 1
    return counts
  }, {})
  const checklistItems = photoChecklist.map((item) => ({
    label: item,
    attachment: imageAttachments.find((attachment) => attachmentMatchesPhotoLabel(attachment, item, legacyLabelCounts)) ?? null,
  }))
  const checklistAttachmentIds = new Set(checklistItems.map((item) => item.attachment?.id).filter(Boolean))
  const otherAttachments = attachments.filter((attachment) => !checklistAttachmentIds.has(attachment.id))

  useEffect(() => {
    if (!previewPhoto) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewPhoto(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [previewPhoto])

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFile) {
      toast.error(t("fileRequired"))
      return
    }

    setUploading(true)
    try {
      await uploadAttachment(selectedFile, photoLabel)
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

  async function handleChecklistUpload(label: string) {
    const file = checklistFiles[label]
    if (!file) {
      toast.error(t("fileRequired"))
      return
    }

    setUploadingPhotoLabel(label)
    try {
      await uploadAttachment(file, label)
      setChecklistFiles((current) => ({ ...current, [label]: null }))
      toast.success(t("uploadSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setUploadingPhotoLabel(null)
    }
  }

  async function uploadAttachment(file: File, label: string) {
    const formData = new FormData()
    formData.append("file", file)
    if (label) formData.append("photoLabel", label)

    const response = await fetch(`/api/assets/${assetId}/attachments`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error ?? tCommon("error"))
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
          <PhotoPreview title={t("modelPhoto")} attachment={primaryModelPhoto} onPreview={setPreviewPhoto} />
        )}
      </div>

      {photoChecklist.length > 0 && (
        <div className="mb-4 rounded-md border border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">{t("photoChecklist")}</div>
            <div className="text-xs text-muted-foreground">
              {checklistItems.filter((item) => item.attachment).length}/{checklistItems.length}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {checklistItems.map((item) => {
              const attachment = item.attachment

              return (
              <div key={item.label} className="overflow-hidden rounded-md border border-border bg-surface">
                {attachment ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto({ title: item.label, attachment })}
                      className="relative block aspect-video w-full bg-muted/40 text-left transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <Image
                        src={`/api/attachments/${attachment.id}?inline=1`}
                        alt={attachment.originalName}
                        fill
                        unoptimized
                        className="object-contain p-2"
                      />
                    </button>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">{attachment.originalName}</div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          {t("photoChecklistDone")}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <a
                          href={`/api/attachments/${attachment.id}`}
                          className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-accent"
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
                  </>
                ) : (
                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <span className="text-xs text-muted-foreground">{t("photoChecklistPending")}</span>
                    </div>
                    <FileDropzone
                      file={checklistFiles[item.label] ?? null}
                      onFileChange={(file) => setChecklistFiles((current) => ({ ...current, [item.label]: file }))}
                      disabled={uploadingPhotoLabel === item.label}
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                      capture="environment"
                      title={t("dropAssetPhotoTitle")}
                      hint={t("dropFileSelected")}
                      browseLabel={t("dropAssetPhotoHint")}
                    />
                    <button
                      type="button"
                      onClick={() => handleChecklistUpload(item.label)}
                      disabled={uploadingPhotoLabel === item.label}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      {uploadingPhotoLabel === item.label ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {t("uploadChecklistPhoto")}
                    </button>
                  </div>
                )}
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
        {t("otherAttachments")}
      </h3>

      {otherAttachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {tCommon("noData")}
        </div>
      ) : (
        <div className="space-y-3">
          {otherAttachments.map((attachment) => (
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

      {previewPhoto ? (
        <PhotoLightbox
          preview={previewPhoto}
          closeLabel={tCommon("close")}
          downloadLabel={t("download")}
          onClose={() => setPreviewPhoto(null)}
        />
      ) : null}
    </section>
  )
}

function PhotoPreview({
  title,
  attachment,
  onPreview,
}: {
  title: string
  attachment: Attachment
  onPreview: (preview: PhotoPreviewState) => void
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={() => onPreview({ title, attachment })}
        className="relative block aspect-video w-full bg-muted/40 text-left transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <Image
          src={`/api/attachments/${attachment.id}?inline=1`}
          alt={attachment.originalName}
          fill
          unoptimized
          className="object-contain p-2"
        />
      </button>
      <div className="p-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{attachment.originalName}</div>
      </div>
    </div>
  )
}

function PhotoLightbox({
  preview,
  closeLabel,
  downloadLabel,
  onClose,
}: {
  preview: PhotoPreviewState
  closeLabel: string
  downloadLabel: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={preview.title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{preview.title}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{preview.attachment.originalName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={closeLabel}
            title={closeLabel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative min-h-[45vh] flex-1 bg-black">
          <Image
            src={`/api/attachments/${preview.attachment.id}?inline=1`}
            alt={preview.attachment.originalName}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
        <div className="flex justify-end border-t border-border px-4 py-3">
          <a
            href={`/api/attachments/${preview.attachment.id}`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            {downloadLabel}
          </a>
        </div>
      </div>
    </div>
  )
}

function isImage(attachment: Attachment) {
  return attachment.fileType.startsWith("image/")
}

function attachmentMatchesPhotoLabel(attachment: Attachment, label: string, legacyLabelCounts: Record<string, number>) {
  const normalizedLabel = normalizeAttachmentLabel(label)
  const legacyLabel = legacySanitizedLabel(label)
  const legacyLabelIsSafeFallback = Boolean(legacyLabel) && legacyLabelCounts[legacyLabel] === 1

  return [label, normalizedLabel, legacyLabelIsSafeFallback ? legacyLabel : ""]
    .filter(Boolean)
    .some((candidate) => attachment.originalName.startsWith(`${candidate} - `))
}

function normalizeAttachmentLabel(label: string) {
  return label.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim()
}

function legacySanitizedLabel(label: string) {
  const normalized = label.normalize("NFKD")
  return normalized.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim()
}
