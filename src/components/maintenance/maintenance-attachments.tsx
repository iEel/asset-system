"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { FileText, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize } from "@/lib/uploads"
import { formatCount } from "@/lib/display-format"
import { isThumbnailable, thumbnailUrl } from "@/lib/attachment-thumbnail"
import {
  getMaintenanceAttachmentDisplayName,
  getMaintenanceAttachmentType,
  isMaintenancePhotoType,
  maintenanceAttachmentTypes,
  type MaintenanceAttachmentType,
} from "@/lib/maintenance-attachments"
import { defaultAttachmentType } from "@/lib/repair-record-detail-rules"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { useApiError } from "@/components/ui/use-api-error"

type Attachment = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

export function MaintenanceAttachments({
  ticketId,
  repairStatus,
  attachments,
  canEdit,
  canDelete,
}: {
  ticketId: string
  repairStatus: string
  attachments: Attachment[]
  canEdit: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Attachment | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Group 5 spec §8.5: before the repair while the record is open, after it once closed or cancelled.
  const defaultType = defaultAttachmentType(repairStatus)
  const [attachmentType, setAttachmentType] = useState<MaintenanceAttachmentType>(defaultType)
  // The hint says why the type was set, only while it is still the one set; a cancelled record gets no reason.
  const defaultTypeHint =
    attachmentType !== defaultType
      ? undefined
      : defaultType === "before_repair"
        ? t("attachmentTypeDefaultOpen", { type: t(`attachmentTypes.${defaultType}`) })
        : repairStatus === "closed"
          ? t("attachmentTypeDefaultClosed", { type: t(`attachmentTypes.${defaultType}`) })
          : undefined
  const groupedAttachments = maintenanceAttachmentTypes
    .map((type) => ({
      type,
      attachments: attachments.filter((attachment) => getMaintenanceAttachmentType(attachment.originalName) === type),
    }))
    .filter((group) => group.attachments.length > 0)

  async function handleUpload(file: File | null) {
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("attachmentType", attachmentType)
    setSelectedFile(file)
    setUploading(true)

    try {
      const response = await fetch(`/api/maintenance-tickets/${ticketId}/attachments`, {
        method: "POST",
        body: formData,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))

      setSelectedFile(null)
      toast.success(t("uploadSuccess"))
      router.refresh()
    } catch (error) {
      setSelectedFile(null)
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
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      toast.success(tCommon("deletedSuccess"))
      setPreview(null)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ContentPanel
      title={t("attachments")}
      actions={<span className="text-meta num text-muted-foreground">{t("attachmentCount", { count: attachments.length })}</span>}
    >
      {attachments.length === 0 ? (
        <EmptyNote>{t("noAttachments")}</EmptyNote>
      ) : (
        <div className="space-y-4">
          {groupedAttachments.map((group) => (
            <div key={group.type} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-meta font-medium text-muted-foreground">{t(`attachmentTypes.${group.type}`)}</h3>
                <span className="text-meta num text-muted-foreground">{formatCount(group.attachments.length)}</span>
              </div>
              <ul className="flex flex-wrap gap-2">
                {group.attachments.map((attachment) => {
                  const name = getMaintenanceAttachmentDisplayName(attachment.originalName)
                  return (
                    <li key={attachment.id}>
                      {/* The tile stays a raw button: the image, the PDF or the named file is the control (plan 2D-4, for the EXEMPT list of 2D-5). */}
                      <button
                        type="button"
                        onClick={() => setPreview(attachment)}
                        aria-label={t("preview") + " " + name}
                        title={name}
                        className="flex size-18 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      >
                        {isThumbnailable(attachment.fileType) ? (
                          // eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route
                          <img
                            src={thumbnailUrl(attachment.id)}
                            alt=""
                            width={72}
                            height={72}
                            loading="lazy"
                            decoding="async"
                            className="size-full object-cover bg-image-stage"
                          />
                        ) : (
                          <>
                            <FileText className="size-5 shrink-0" aria-hidden="true" />
                            <span className="line-clamp-2 w-full break-all px-1 text-center text-meta leading-tight">{name}</span>
                          </>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {canEdit ? (
        <div className="mt-4 border-t border-border pt-4">
          {!canDelete ? <Notice tone="warning" className="mb-3">{t("closedEvidenceAppendOnlyHelp")}</Notice> : null}
          <Field label={t("attachmentType")} hint={defaultTypeHint} className="mb-3">
            <NativeSelect
              value={attachmentType}
              onChange={(event) => setAttachmentType(event.target.value as MaintenanceAttachmentType)}
            >
              {maintenanceAttachmentTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`attachmentTypes.${type}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {/* The camera only for a photo type, so a PDF can still be chosen for the others. A desktop browser ignores
              capture, so this type rule alone gives "the camera on the phone" (group 5 spec §8.5). */}
          <FileDropzone
            file={selectedFile}
            onFileChange={handleUpload}
            disabled={uploading}
            capture={isMaintenancePhotoType(attachmentType) ? "environment" : undefined}
            title={t("dropAttachmentTitle")}
            hint={uploading ? t("uploading") : t("dropFileSelected")}
            browseLabel={
              isMaintenancePhotoType(attachmentType)
                ? t(attachmentType === "before_repair" ? "takeBeforePhoto" : "takeAfterPhoto")
                : t("dropFileHint")
            }
          />
        </div>
      ) : null}

      <AttachmentPreviewDialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
        title={preview ? getMaintenanceAttachmentDisplayName(preview.originalName) : ""}
        subtitle={preview ? `${preview.fileType} · ${formatFileSize(preview.fileSize)}` : undefined}
        kind={preview && isImage(preview) ? "image" : "pdf"}
        // A file that is neither an image nor a PDF shows only its name, size, download and delete.
        src={preview && isPreviewable(preview) ? `/api/attachments/${preview.id}?inline=1` : ""}
        alt={preview?.originalName}
        downloadHref={preview ? `/api/attachments/${preview.id}` : undefined}
        downloadLabel={t("download")}
        actions={
          canDelete && preview ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleDelete(preview.id)}
              busy={deletingId === preview.id}
            >
              <Trash2 aria-hidden="true" />
              {tCommon("delete")}
            </Button>
          ) : null
        }
      />
    </ContentPanel>
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
