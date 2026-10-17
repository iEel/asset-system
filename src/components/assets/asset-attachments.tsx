"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetPhotoGalleryState } from "@/lib/asset-photo-gallery"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { useApiError } from "@/components/ui/use-api-error"

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
  const apiError = useApiError()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [uploading, setUploading] = useState(false)
  const [uploadingPhotoLabel, setUploadingPhotoLabel] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [photoLabel, setPhotoLabel] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<PhotoPreviewState | null>(null)
  const [showAllChecklistPhotos, setShowAllChecklistPhotos] = useState(false)
  const [showAllOtherAttachments, setShowAllOtherAttachments] = useState(false)
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
  const checklistGallery = getAssetPhotoGalleryState(checklistItems, showAllChecklistPhotos)
  const otherAttachmentGallery = getAssetPhotoGalleryState(otherAttachments, showAllOtherAttachments)

  async function handleAutoUpload(file: File | null, label: string) {
    if (!file) return
    setSelectedFile(file)
    setUploading(true)
    try {
      await uploadAttachment(file, label)
      setSelectedFile(null)
      if (label === photoLabel) setPhotoLabel("")
      toast.success(t("uploadSuccess"))
      router.refresh()
    } catch (error) {
      setSelectedFile(null)
      apiError.toast(error)
    } finally {
      setUploading(false)
    }
  }

  async function handleChecklistUpload(label: string, file: File | null) {
    if (!file) return
    setUploadingPhotoLabel(label)
    try {
      await uploadAttachment(file, label)
      toast.success(t("uploadSuccess"))
      router.refresh()
    } catch (error) {
      apiError.toast(error)
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
    if (!(await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" }))) return
    setDeletingId(id)

    try {
      const response = await fetch(`/api/attachments/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }

      toast.success(tCommon("deletedSuccess"))
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    // The page wraps this panel in <div id="photos">, so it can be a ContentPanel (spec 2D D9). A count is plain text.
    <ContentPanel
      title={t("assetPhotos")}
      description={t("photoGalleryPreviewHelp")}
      actions={
        attachments.length > 0 ? (
          <span className="text-meta text-muted-foreground">{t("photoFileCount", { count: attachments.length })}</span>
        ) : undefined
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {primaryModelPhoto && (
          <PhotoPreview title={t("modelPhoto")} attachment={primaryModelPhoto} onPreview={setPreviewPhoto} />
        )}
      </div>

      {/* The checklist is a block of the panel, not a box: its cards are the quiet groupings (no box in a box). */}
      {photoChecklist.length > 0 && (
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t("photoChecklist")}</h3>
            <span className="text-meta num text-muted-foreground">
              {checklistItems.filter((item) => item.attachment).length}/{checklistItems.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {checklistGallery.visibleItems.map((item) => {
              const attachment = item.attachment

              return (
              <div key={item.label} className="overflow-hidden rounded-md border border-border bg-background">
                {attachment ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto({ title: item.label, attachment })}
                      className="relative block aspect-video w-full bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Image
                        src={`/api/attachments/${attachment.id}?inline=1`}
                        alt={attachment.originalName}
                        fill
                        unoptimized
                        className="object-contain p-2 bg-image-stage"
                      />
                    </button>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <div className="mt-1 truncate text-meta text-muted-foreground">{attachment.originalName}</div>
                        </div>
                        <StatusBadge label={t("photoChecklistDone")} tone="success" />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
                          <Download aria-hidden="true" />
                          {t("download")}
                        </a>
                        <Button
                          variant="danger"
                          size="icon-sm"
                          onClick={() => handleDelete(attachment.id)}
                          busy={deletingId === attachment.id}
                          aria-label={tCommon("delete")}
                          title={tCommon("delete")}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <StatusBadge label={t("photoChecklistPending")} tone="muted" />
                    </div>
                    <Field label={item.label} hideLabel>
                      <FileDropzone
                        file={null}
                        onFileChange={(file) => handleChecklistUpload(item.label, file)}
                        disabled={uploadingPhotoLabel === item.label}
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                        capture="environment"
                        title={t("dropAssetPhotoTitle")}
                        description={uploadingPhotoLabel === item.label ? t("uploading") : t("checklistPhotoDescription")}
                        browseLabel={t("dropAssetPhotoHint")}
                      />
                    </Field>
                  </div>
                )}
              </div>
              )
            })}
          </div>
          {checklistGallery.hasOverflow ? (
            <GalleryToggle
              expanded={showAllChecklistPhotos}
              hiddenCount={checklistGallery.hiddenCount}
              showMoreLabel={(count) => t("showMorePhotos", { count })}
              hideLabel={t("hideExtraPhotos")}
              onClick={() => setShowAllChecklistPhotos((current) => !current)}
            />
          ) : null}
        </div>
      )}

      {/* The drop zone draws its own dashed frame, so no box goes around it. */}
      <div className="mb-4">
        {photoChecklist.length > 0 && (
          <Field label={t("photoType")} className="mb-3">
            <NativeSelect value={photoLabel} onChange={(event) => setPhotoLabel(event.target.value)}>
              <option value="">{t("selectPhotoType")}</option>
              {photoChecklist.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <FileDropzone
          file={selectedFile}
          onFileChange={(file) => handleAutoUpload(file, photoLabel)}
          disabled={uploading}
          title={t("dropFileTitle")}
          hint={uploading ? t("uploading") : t("dropFileSelected")}
          browseLabel={t("dropFileHint")}
        />
      </div>

      <h3 className="mb-3 text-sm font-semibold text-foreground">{t("otherAttachments")}</h3>

      {otherAttachments.length === 0 ? (
        <EmptyNote>{tCommon("noData")}</EmptyNote>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {otherAttachmentGallery.visibleItems.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                downloadLabel={t("download")}
                deleteLabel={tCommon("delete")}
                deleting={deletingId === attachment.id}
                onDelete={() => handleDelete(attachment.id)}
                onPreview={isImage(attachment) ? () => setPreviewPhoto({ title: attachment.originalName, attachment }) : undefined}
              />
            ))}
          </div>
          {otherAttachmentGallery.hasOverflow ? (
            <GalleryToggle
              expanded={showAllOtherAttachments}
              hiddenCount={otherAttachmentGallery.hiddenCount}
              showMoreLabel={(count) => t("showMorePhotos", { count })}
              hideLabel={t("hideExtraPhotos")}
              onClick={() => setShowAllOtherAttachments((current) => !current)}
            />
          ) : null}
        </>
      )}

      <AttachmentPreviewDialog
        open={previewPhoto !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewPhoto(null)
        }}
        title={previewPhoto?.title ?? ""}
        subtitle={previewPhoto?.attachment.originalName}
        kind="image"
        src={previewPhoto ? `/api/attachments/${previewPhoto.attachment.id}?inline=1` : ""}
        alt={previewPhoto?.attachment.originalName}
        downloadHref={previewPhoto ? `/api/attachments/${previewPhoto.attachment.id}` : undefined}
        downloadLabel={t("download")}
      />
    </ContentPanel>
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
        className="relative block h-32 w-full bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Image
          src={`/api/attachments/${attachment.id}?inline=1`}
          alt={attachment.originalName}
          fill
          unoptimized
          className="object-contain p-2 bg-image-stage"
        />
      </button>
      <div className="p-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-meta text-muted-foreground">{attachment.originalName}</div>
      </div>
    </div>
  )
}

function AttachmentCard({
  attachment,
  downloadLabel,
  deleteLabel,
  deleting,
  onDelete,
  onPreview,
}: {
  attachment: Attachment
  downloadLabel: string
  deleteLabel: string
  deleting: boolean
  onDelete: () => void
  onPreview?: () => void
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      {onPreview ? (
        <button
          type="button"
          onClick={onPreview}
          className="relative block h-28 w-full bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src={`/api/attachments/${attachment.id}?inline=1`}
            alt={attachment.originalName}
            fill
            unoptimized
            className="object-contain p-2 bg-image-stage"
          />
        </button>
      ) : (
        <div className="flex h-28 items-center justify-center bg-background p-3 text-center text-meta font-medium text-muted-foreground">
          {attachment.fileType}
        </div>
      )}
      <div className="p-3">
        <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
        <div className="mt-1 text-meta text-muted-foreground">{formatFileSize(attachment.fileSize)}</div>
        <div className="mt-3 flex gap-2">
          <a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
            <Download aria-hidden="true" />
            {downloadLabel}
          </a>
          <Button variant="danger" size="icon-sm" onClick={onDelete} busy={deleting} aria-label={deleteLabel} title={deleteLabel}>
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function GalleryToggle({
  expanded,
  hiddenCount,
  showMoreLabel,
  hideLabel,
  onClick,
}: {
  expanded: boolean
  hiddenCount: number
  showMoreLabel: (count: number) => string
  hideLabel: string
  onClick: () => void
}) {
  return (
    <Button variant="outline" aria-expanded={expanded} className="mt-3 w-full sm:w-auto" onClick={onClick}>
      {expanded ? hideLabel : showMoreLabel(hiddenCount)}
    </Button>
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
