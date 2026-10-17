"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, FileText, Image as ImageIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

type Attachment = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

export function DisposalAttachments({
  requestId,
  attachments,
  canManage,
  uploadEndpoint = `/api/disposal-requests/${requestId}/attachments`,
  title,
}: {
  requestId: string
  attachments: Attachment[]
  canManage: boolean
  uploadEndpoint?: string
  title?: string
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function upload(fileToUpload: File | null) {
    if (!fileToUpload) return
    setFile(fileToUpload)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", fileToUpload)
      const response = await fetch(uploadEndpoint, { method: "POST", body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
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
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(tCommon("deletedSuccess"))
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ContentPanel title={title ?? t("requestEvidence")}>
      {canManage ? (
        <div className="mb-4">
          <FileDropzone
            file={file}
            onFileChange={upload}
            disabled={uploading}
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,application/pdf"
            capture="environment"
            title={t("dropEvidenceTitle")}
            hint={uploading ? t("uploadingEvidence") : t("dropEvidenceSelected")}
            browseLabel={t("dropEvidenceHint")}
          />
        </div>
      ) : null}
      {attachments.length === 0 ? (
        <EmptyNote>{tCommon("noData")}</EmptyNote>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-md border border-border bg-background p-3">
              {attachment.fileType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/attachments/${attachment.id}?inline=1`} alt={attachment.originalName} className="mb-3 aspect-[4/3] w-full rounded-md border border-border object-cover bg-image-stage" />
              ) : null}
              <div className="flex items-start gap-2">
                {attachment.fileType.startsWith("image/") ? <ImageIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium text-foreground">{attachment.originalName}</div>
                  <div className="mt-1 text-meta text-muted-foreground">{attachment.fileType} · {formatFileSize(attachment.fileSize)}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
                  <Download aria-hidden="true" />
                  {t("download")}
                </a>
                {canManage ? (
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
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ContentPanel>
  )
}
