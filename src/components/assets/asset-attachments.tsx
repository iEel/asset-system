"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, FileText, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { AssetPhotoFrame } from "@/components/assets/asset-photo-frame"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { StatusBadge } from "@/components/ui/status-badge"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { useApiError } from "@/components/ui/use-api-error"
import { isUnauthorizedError } from "@/lib/api-error-catalog"
import { getAssetPhotoGalleryState } from "@/lib/asset-photo-gallery"
import type { AssetFilePhoto, AssetFileRecord } from "@/lib/asset-files-rules"
import { formatCount } from "@/lib/display-format"
import { formatFileSize, MAX_UPLOAD_BYTES } from "@/lib/uploads"
import { cn, formatDate } from "@/lib/utils"

// One file per request: the route takes one file and, for a checklist photo, its label as the photoLabel field.
async function postAssetAttachment(assetId: string, file: File, label: string, fallbackError: string): Promise<void> {
  const formData = new FormData()
  formData.append("file", file)
  if (label) formData.append("photoLabel", label)

  const response = await fetch(`/api/assets/${assetId}/attachments`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.error ?? fallbackError)
  }
}

// The files tab's "รูปและไฟล์แนบ" (group 1 spec §7.7): the asset's photos as card-size tiles, its other files as rows,
// and for an editor the uploads, the missing checklist photos and the deletes.
export function AssetAttachments({
  assetId,
  photos,
  documents,
  missingChecklistLabels,
  canEdit,
}: {
  assetId: string
  photos: readonly AssetFilePhoto[]
  documents: readonly AssetFileRecord[]
  missingChecklistLabels: readonly string[]
  canEdit: boolean
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<AssetFilePhoto | null>(null)
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [uploadingLabel, setUploadingLabel] = useState<string | null>(null)
  const gallery = getAssetPhotoGalleryState(photos, showAllPhotos)
  const showPhotos = photos.length > 0 || (canEdit && missingChecklistLabels.length > 0)
  const showDocuments = documents.length > 0
  const split = showPhotos && showDocuments

  async function handleChecklistUpload(label: string, file: File | null) {
    if (!file) return
    setUploadingLabel(label)
    try {
      await postAssetAttachment(assetId, file, label, tCommon("error"))
      toast.success(t("uploadSuccess"))
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setUploadingLabel(null)
    }
  }

  async function handleDelete(file: { id: string; originalName: string }) {
    if (!(await confirm({ title: tCommon("deleteConfirm"), description: file.originalName, confirmLabel: tCommon("delete"), tone: "destructive" }))) return
    setDeletingId(file.id)

    try {
      const response = await fetch(`/api/attachments/${file.id}`, {
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
    // The tab wraps this panel in <div id="photos">, so it can be a ContentPanel (spec 2D D9).
    <ContentPanel divided title={t("filesTab.title")}>
      <div className="space-y-6">
        {canEdit ? <AssetFileUpload assetId={assetId} /> : null}

        {photos.length === 0 && documents.length === 0 ? <EmptyNote>{t("filesTab.empty")}</EmptyNote> : null}

        {showPhotos || showDocuments ? (
          <div className={cn("grid gap-6", split && "lg:grid-cols-12")}>
            {showPhotos ? (
              <div className={cn("min-w-0", split && "lg:col-span-7")}>
                <h3 className="mb-3 text-sm font-semibold text-foreground">{t("filesTab.photos", { count: formatCount(photos.length) })}</h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gallery.visibleItems.map((photo) => (
                    <PhotoTile
                      key={photo.id}
                      photo={photo}
                      onOpen={() => setPreview(photo)}
                      onDelete={canEdit ? () => handleDelete(photo) : undefined}
                      deleting={deletingId === photo.id}
                    />
                  ))}
                  {canEdit ? missingChecklistLabels.map((label) => (
                    <li key={`missing:${label}`} className="col-span-2 min-w-0 sm:col-span-1">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">{label}</span>
                        <StatusBadge label={t("photoChecklistPending")} tone="muted" />
                      </div>
                      <Field label={label} hideLabel>
                        <FileDropzone
                          file={null}
                          onFileChange={(file) => handleChecklistUpload(label, file)}
                          disabled={uploadingLabel === label}
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                          capture="environment"
                          title={t("dropAssetPhotoTitle")}
                          description={uploadingLabel === label ? t("uploading") : t("checklistPhotoDescription")}
                          browseLabel={t("dropAssetPhotoHint")}
                        />
                      </Field>
                    </li>
                  )) : null}
                </ul>
                {gallery.hasOverflow ? (
                  <GalleryToggle
                    expanded={showAllPhotos}
                    hiddenCount={gallery.hiddenCount}
                    showMoreLabel={(count) => t("showMorePhotos", { count })}
                    hideLabel={t("hideExtraPhotos")}
                    onClick={() => setShowAllPhotos((current) => !current)}
                  />
                ) : null}
              </div>
            ) : null}

            {showDocuments ? (
              <div className={cn("min-w-0", split && "lg:col-span-5")}>
                <h3 className="mb-3 text-sm font-semibold text-foreground">{t("filesTab.documents", { count: formatCount(documents.length) })}</h3>
                <ul className="divide-y divide-border-soft">
                  {documents.map((document) => (
                    <DocumentRow
                      key={document.id}
                      document={document}
                      onDelete={canEdit ? () => handleDelete(document) : undefined}
                      deleting={deletingId === document.id}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* The original, only when a person opens it. */}
      <AttachmentPreviewDialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
        title={preview?.label ?? preview?.originalName ?? ""}
        subtitle={preview?.originalName}
        kind="image"
        src={preview ? `/api/attachments/${preview.id}?inline=1` : ""}
        alt={preview?.originalName}
        downloadHref={preview ? `/api/attachments/${preview.id}` : undefined}
        downloadLabel={t("download")}
      />
    </ContentPanel>
  )
}

function PhotoTile({
  photo,
  onOpen,
  onDelete,
  deleting,
}: {
  photo: AssetFilePhoto
  onOpen: () => void
  onDelete?: () => void
  deleting: boolean
}) {
  const t = useTranslations("asset")
  const name = photo.label ?? photo.originalName

  return (
    <li className="min-w-0">
      {/* The photo is the control that opens the original (plan 2D-3 R5, the N3 EXEMPT row). */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("filesTab.openPhoto", { name })}
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <AssetPhotoFrame attachmentId={photo.id} alt={photo.originalName} canUpload={false} previewable={false} />
      </button>
      <div className="mt-2 flex min-w-0 items-center gap-2">
        {photo.primary ? <Chip>{t("filesTab.primaryPhoto")}</Chip> : null}
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</span>
        {onDelete ? (
          <Button
            variant="danger"
            size="icon-sm"
            onClick={onDelete}
            busy={deleting}
            aria-label={t("filesTab.deleteNamed", { name })}
            title={t("filesTab.deleteNamed", { name })}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function DocumentRow({
  document,
  onDelete,
  deleting,
}: {
  document: AssetFileRecord
  onDelete?: () => void
  deleting: boolean
}) {
  const t = useTranslations("asset")
  const name = document.originalName

  return (
    <li className="flex min-h-11 items-center gap-3 py-2">
      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{document.originalName}</div>
        <div className="text-meta text-muted-foreground">
          {formatFileSize(document.fileSize)} · {formatDate(document.uploadedAt)}
        </div>
      </div>
      <a
        href={`/api/attachments/${document.id}`}
        aria-label={t("filesTab.downloadNamed", { name: document.originalName })}
        title={t("filesTab.downloadNamed", { name: document.originalName })}
        className={buttonVariants({ variant: "outline", size: "icon-sm" })}
      >
        <Download aria-hidden="true" />
      </a>
      {onDelete ? (
        <Button
          variant="danger"
          size="icon-sm"
          onClick={onDelete}
          busy={deleting}
          aria-label={t("filesTab.deleteNamed", { name })}
          title={t("filesTab.deleteNamed", { name })}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  )
}

type QueuedFile = { key: string; file: File; error: string | null }

// An editor's uploads: the phone's camera, and a free zone that queues several files for one button.
function AssetFileUpload({ assetId }: { assetId: string }) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const nextKey = useRef(0)

  function addFiles(next: File[]) {
    if (next.length === 0) return
    setQueue((current) => [
      ...current,
      ...next.map((file) => {
        nextKey.current += 1
        return { key: `file-${nextKey.current}`, file, error: null }
      }),
    ])
  }

  function removeQueued(key: string) {
    setQueue((current) => current.filter((item) => item.key !== key))
  }

  async function uploadQueued() {
    const items = queue
    if (items.length === 0) return
    setUploading(true)
    setProgress({ done: 0, total: items.length })
    let uploaded = 0
    try {
      for (const [index, item] of items.entries()) {
        try {
          await postAssetAttachment(assetId, item.file, "", tCommon("error"))
          uploaded += 1
          setQueue((current) => current.filter((entry) => entry.key !== item.key))
        } catch (error) {
          // A lapsed session goes to the login (useApiError), and the rest wait in the queue.
          if (isUnauthorizedError(error)) {
            apiError.toast(error)
            break
          }
          const message = apiError.describe(error).message
          setQueue((current) => current.map((entry) => (entry.key === item.key ? { ...entry, error: message } : entry)))
        }
        setProgress({ done: index + 1, total: items.length })
      }
    } finally {
      setUploading(false)
      setProgress(null)
    }
    const remaining = items.length - uploaded
    if (uploaded > 0) {
      toast.success(t("filesTab.uploadDone", { count: formatCount(uploaded) }))
      router.refresh()
    }
    if (remaining > 0) toast.error(t("filesTab.uploadFailed", { count: formatCount(remaining) }))
  }

  return (
    <div className="space-y-3">
      <div className="md:hidden">
        <FileDropzone
          file={null}
          onFileChange={(file) => {
            if (file) addFiles([file])
          }}
          disabled={uploading}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          title={t("photoFrame.takePhoto")}
          browseLabel={t("filesTab.takePhotoHint")}
        />
      </div>
      {/* No accept list: the server's list decides, as before. */}
      <FileDropzone
        file={null}
        onFileChange={(file) => {
          if (file) addFiles([file])
        }}
        onFilesChange={addFiles}
        disabled={uploading}
        multiple
        title={t("dropFileTitle")}
        description={t("filesTab.dropDescription", { size: formatCount(MAX_UPLOAD_BYTES / (1024 * 1024)) })}
        browseLabel={t("dropFileHint")}
      />
      <FileQueueList
        items={queue.map((item) => ({ id: item.key, name: item.file.name, detail: item.error ?? formatFileSize(item.file.size) }))}
        disabled={uploading}
        onRemove={removeQueued}
      />
      {queue.length > 0 ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {progress ? (
            <span role="status" className="text-meta text-muted-foreground">
              {t("filesTab.uploadProgress", { done: formatCount(progress.done), total: formatCount(progress.total) })}
            </span>
          ) : null}
          <Button busy={uploading} onClick={uploadQueued}>
            <Upload aria-hidden="true" />
            {t("filesTab.upload", { count: formatCount(queue.length) })}
          </Button>
        </div>
      ) : null}
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
