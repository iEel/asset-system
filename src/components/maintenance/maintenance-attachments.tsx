"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, Eye, FileText, Image as ImageIcon, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize } from "@/lib/uploads"
import { getMaintenanceAttachmentDisplayName, getMaintenanceAttachmentType, maintenanceAttachmentTypes, type MaintenanceAttachmentType } from "@/lib/maintenance-attachments"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { NativeSelect } from "@/components/ui/native-select"
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
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <FileText className="h-5 w-5 text-primary" />
        {t("attachments")}
      </h2>

      {canEdit ? (
      <div className="mb-4 rounded-md border border-border bg-background p-3">
        {!canDelete ? <p className="mb-3 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">{t("closedEvidenceAppendOnlyHelp")}</p> : null}
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
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {tCommon("noData")}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedAttachments.map((group) => (
            <div key={group.type} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{t(`attachmentTypes.${group.type}`)}</h3>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{group.attachments.length}</span>
              </div>
              {group.attachments.map((attachment) => (
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
                  <div className="break-words text-sm font-medium text-foreground">{getMaintenanceAttachmentDisplayName(attachment.originalName)}</div>
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
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("preview")}
                  </button>
                ) : null}
                <a
                  href={`/api/attachments/${attachment.id}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("download")}
                </a>
                {canDelete ? (
                <button
                  type="button"
                  onClick={() => void handleDelete(attachment.id)}
                  disabled={deletingId === attachment.id}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger-soft disabled:opacity-50 sm:h-8 sm:min-h-0 sm:w-8 sm:min-w-0"
                  title={tCommon("delete")}
                >
                  {deletingId === attachment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
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
        closeLabel={tCommon("close")}
      />
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
