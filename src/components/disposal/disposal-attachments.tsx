"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, FileText, X } from "lucide-react"
import { toast } from "sonner"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { thumbnailUrl } from "@/lib/attachment-thumbnail"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { disposalEvidenceAccept, isDisposalPhotoFile } from "@/lib/disposal-photo"
import { getDisposalQueuedFileError } from "@/lib/disposal-request-form-rules"
import { formatFileSize } from "@/lib/uploads"
import { useApiError } from "@/components/ui/use-api-error"

type Attachment = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

// The last qualifying file of a pending or approved request cannot be deleted (group 6 spec §9.5, plan 1's rule): its
// last image, or for a lost request its last file. inheritedCount counts the batch's qualifying files, which count too.
export type DisposalLastFileLock = { requestStatus: string; disposalType: string; inheritedCount: number }

function lockedFileId(attachments: readonly Attachment[], lock: DisposalLastFileLock | null | undefined): string | null {
  if (!lock || !["pending", "approved"].includes(lock.requestStatus)) return null
  const qualifying = attachments.filter((file) => lock.disposalType === "lost" || isDisposalPhotoFile(file.fileType))
  return qualifying.length === 1 && lock.inheritedCount === 0 ? qualifying[0].id : null
}

// The request's evidence (group 6 spec §9.3, §9.5): images as 96px thumbnails that open the original in the preview
// dialog, other files (PDFs) as rows with their download. The upload takes JPG, PNG, WEBP or PDF and refuses HEIC before
// sending. The × shows only with canDelete (disposal:edit on the request page), and not on the last qualifying file; the
// server refuses that anyway with DISPOSAL_LAST_PHOTO, whose words the toast shows.
export function DisposalAttachments({
  requestId,
  attachments,
  canManage,
  canDelete = canManage,
  lastFileLock,
  uploadEndpoint = `/api/disposal-requests/${requestId}/attachments`,
  title,
  hint,
}: {
  requestId: string
  attachments: Attachment[]
  canManage: boolean
  canDelete?: boolean
  lastFileLock?: DisposalLastFileLock | null
  uploadEndpoint?: string
  title?: string
  hint?: string
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const tAsset = useTranslations("asset")
  const confirm = useConfirm()
  const [file, setFile] = useState<File | null>(null)
  const [typeError, setTypeError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Attachment | null>(null)
  const locked = lockedFileId(attachments, lastFileLock)
  const images = attachments.filter((attachment) => isDisposalPhotoFile(attachment.fileType))
  const documents = attachments.filter((attachment) => !isDisposalPhotoFile(attachment.fileType))

  async function upload(fileToUpload: File | null) {
    if (!fileToUpload) return
    if (getDisposalQueuedFileError(fileToUpload)) {
      setTypeError(t("photoTypeRefused"))
      return
    }
    setTypeError(null)
    setFile(fileToUpload)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", fileToUpload)
      const response = await fetch(uploadEndpoint, { method: "POST", body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      toast.success(t("evidenceUploadSuccess"))
      setFile(null)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" }))) return
    setDeletingId(id)
    try {
      const response = await fetch(`/api/attachments/${id}`, { method: "DELETE" })
      const payload = await response.json().catch(() => null)
      // A 409 DISPOSAL_LAST_PHOTO reads its own words, not the server's English.
      if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      toast.success(tCommon("deletedSuccess"))
      setPreview(null)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setDeletingId(null)
    }
  }

  function deleteButton(attachment: Attachment) {
    if (!canDelete) return null
    if (attachment.id === locked) return <p className="text-meta text-muted-foreground">{t("errors.DISPOSAL_LAST_PHOTO")}</p>
    return (
      <Button
        variant="danger"
        size="icon-sm"
        onClick={() => handleDelete(attachment.id)}
        busy={deletingId === attachment.id}
        aria-label={tCommon("delete")}
        title={tCommon("delete")}
      >
        <X aria-hidden="true" />
      </Button>
    )
  }

  return (
    <ContentPanel title={title ?? t("requestEvidence")}>
      {canManage ? (
        <div className="mb-4">
          <Field label={t("dropEvidenceTitle")} hideLabel hint={hint} error={typeError ?? undefined}>
            <FileDropzone
              file={file}
              onFileChange={upload}
              disabled={uploading}
              accept={disposalEvidenceAccept}
              capture="environment"
              title={t("dropEvidenceTitle")}
              hint={uploading ? t("uploadingEvidence") : t("dropEvidenceSelected")}
              browseLabel={t("dropEvidenceHint")}
            />
          </Field>
        </div>
      ) : null}
      {attachments.length === 0 ? (
        <EmptyNote>{tCommon("noData")}</EmptyNote>
      ) : (
        <div className="space-y-4">
          {images.length > 0 ? (
            <ul className="flex flex-wrap gap-3">
              {images.map((attachment) => (
                <li key={attachment.id} className="flex w-24 flex-col items-start gap-1.5">
                  {/* The thumbnail is the control that opens the original (2D-3 R5, the N3 EXEMPT row). */}
                  <button
                    type="button"
                    onClick={() => setPreview(attachment)}
                    aria-label={tAsset("filesTab.openPhoto", { name: attachment.originalName })}
                    title={attachment.originalName}
                    className="block size-24 overflow-hidden rounded-md border border-border bg-muted transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route */}
                    <img src={thumbnailUrl(attachment.id)} alt="" width={96} height={96} loading="lazy" decoding="async" className="size-full object-cover bg-image-stage" />
                  </button>
                  {deleteButton(attachment)}
                </li>
              ))}
            </ul>
          ) : null}
          {documents.length > 0 ? (
            <ul className="divide-y divide-border-soft">
              {documents.map((attachment) => (
                <li key={attachment.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{attachment.originalName}</div>
                    <div className="text-meta text-muted-foreground">{formatFileSize(attachment.fileSize)}</div>
                  </div>
                  <a href={`/api/attachments/${attachment.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Download aria-hidden="true" />
                    {t("download")}
                  </a>
                  {deleteButton(attachment)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {/* The original, only when a person opens a thumbnail. */}
      <AttachmentPreviewDialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
        title={preview?.originalName ?? ""}
        subtitle={preview ? formatFileSize(preview.fileSize) : undefined}
        kind="image"
        src={preview ? `/api/attachments/${preview.id}?inline=1` : ""}
        alt={preview?.originalName}
        downloadHref={preview ? `/api/attachments/${preview.id}` : undefined}
        downloadLabel={t("download")}
      />
    </ContentPanel>
  )
}
