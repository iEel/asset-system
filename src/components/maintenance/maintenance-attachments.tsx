"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, Eye, FileText, Image as ImageIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize } from "@/lib/uploads"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { getMaintenanceAttachmentDisplayName, getMaintenanceAttachmentType, maintenanceAttachmentTypes, type MaintenanceAttachmentType } from "@/lib/maintenance-attachments"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
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
  attachments,
  canEdit,
  canDelete,
}: {
  ticketId: string
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
  const [attachmentType, setAttachmentType] = useState<MaintenanceAttachmentType>("after_repair")
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
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ContentPanel title={t("attachments")}>
      {canEdit ? (
      <div className="mb-4">
        {!canDelete ? <Notice tone="warning" className="mb-3">{t("closedEvidenceAppendOnlyHelp")}</Notice> : null}
        <Field label={t("attachmentType")} className="mb-3">
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
        <FileDropzone
          file={selectedFile}
          onFileChange={handleUpload}
          disabled={uploading}
          title={t("dropFileTitle")}
          hint={uploading ? t("uploading") : t("dropFileSelected")}
          browseLabel={t("dropFileHint")}
        />
      </div>
      ) : null}

      {attachments.length === 0 ? (
        <EmptyNote>{tCommon("noData")}</EmptyNote>
      ) : (
        <div className="space-y-4">
          {groupedAttachments.map((group) => (
            <div key={group.type} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{t(`attachmentTypes.${group.type}`)}</h3>
                <span className="text-meta num text-muted-foreground">{formatCount(group.attachments.length)}</span>
              </div>
              {group.attachments.map((attachment) => (
                <div key={attachment.id} className="rounded-md border border-border bg-background p-3">
              {/* The thumbnail stays a raw button: the image or the PDF preview is the control (plan 2D-4, for the EXEMPT list of 2D-5). */}
              {isPreviewable(attachment) ? (
                <button
                  type="button"
                  onClick={() => setPreview(attachment)}
                  className="mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md bg-surface text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isImage(attachment) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/attachments/${attachment.id}?inline=1`}
                      alt={attachment.originalName}
                      className="h-full w-full object-cover bg-image-stage"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-sm">
                      <FileText className="h-10 w-10" />
                      {t("pdfPreview")}
                    </div>
                  )}
                </button>
              ) : (
                <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-md bg-surface text-muted-foreground">
                  <FileText className="h-10 w-10" />
                </div>
              )}
              <div className="flex items-start gap-2">
                {isImage(attachment) ? (
                  <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <div className="break-words text-sm font-medium text-foreground">{getMaintenanceAttachmentDisplayName(attachment.originalName)}</div>
                  <div className="mt-1 text-meta text-muted-foreground">
                    {attachment.fileType} · {formatFileSize(attachment.fileSize)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {isPreviewable(attachment) ? (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreview(attachment)}>
                    <Eye aria-hidden="true" />
                    {t("preview")}
                  </Button>
                ) : null}
                <a
                  href={`/api/attachments/${attachment.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                >
                  <Download aria-hidden="true" />
                  {t("download")}
                </a>
                {canDelete ? (
                <Button
                  variant="danger"
                  size="icon-sm"
                  onClick={() => void handleDelete(attachment.id)}
                  busy={deletingId === attachment.id}
                  aria-label={tCommon("delete")}
                  title={tCommon("delete")}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
                ) : null}
              </div>
            </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <AttachmentPreviewDialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
        title={preview ? getMaintenanceAttachmentDisplayName(preview.originalName) : ""}
        subtitle={preview ? `${preview.fileType} · ${formatFileSize(preview.fileSize)}` : undefined}
        kind={preview && isImage(preview) ? "image" : "pdf"}
        src={preview ? `/api/attachments/${preview.id}?inline=1` : ""}
        alt={preview?.originalName}
        downloadHref={preview ? `/api/attachments/${preview.id}` : undefined}
        downloadLabel={t("download")}
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
