"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

type PurchaseDocument = {
  id: string
  documentType?: string
  documentNo?: string
  poNumber?: string | null
  invoiceNumber?: string | null
  documentDate?: Date | string | null
  supplierName?: string | null
  totalAmount?: number | string | null
  currency?: string | null
  attachments?: PurchaseDocumentAttachment[]
}

type PurchaseDocumentAttachment = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

export function AssetPurchaseDocuments({
  documents,
  canEdit,
}: {
  documents: PurchaseDocument[]
  canEdit: boolean
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const hasDocuments = documents.length > 0

  async function handleDelete(id: string) {
    if (!(await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" }))) return
    setDeletingId(id)

    try {
      const response = await fetch(`/api/attachments/${id}`, { method: "DELETE" })
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
    <ContentPanel title={t("purchaseDocuments")}>
      {!hasDocuments ? (
        <EmptyNote>{tCommon("noData")}</EmptyNote>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-md border border-border bg-background p-3">
              <div className="text-sm font-medium text-foreground">
                {document.documentType ? t(`purchaseDocumentTypes.${document.documentType}`) : t("purchaseDocuments")} · <span className="tag">{document.documentNo}</span>
              </div>
              <div className="mt-1 text-meta text-muted-foreground">
                {orNil(
                  [document.supplierName, document.poNumber ? `${t("poNumber")}: ${document.poNumber}` : null, document.invoiceNumber ? `${t("invoiceNumber")}: ${document.invoiceNumber}` : null]
                    .filter(Boolean)
                    .join(" · "),
                )}
              </div>
              {(document.attachments ?? []).length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(document.attachments ?? []).map((attachment) => (
                    <AttachmentCard key={attachment.id} attachment={attachment} deletingId={deletingId} onDelete={canEdit ? handleDelete : undefined} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ContentPanel>
  )
}

function AttachmentCard({
  attachment,
  deletingId,
  onDelete,
}: {
  attachment: PurchaseDocumentAttachment
  deletingId: string | null
  onDelete?: (id: string) => void
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")

  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
      <div className="mt-1 text-meta text-muted-foreground">
        {attachment.fileType} · {formatFileSize(attachment.fileSize)}
      </div>
      {/* An outline sm download link and, for an editor, a danger icon-sm delete. */}
      <div className="mt-3 flex gap-2">
        <a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
          <Download aria-hidden="true" />
          {t("download")}
        </a>
        {onDelete ? (
          <Button
            variant="danger"
            size="icon-sm"
            onClick={() => onDelete(attachment.id)}
            busy={deletingId === attachment.id}
            aria-label={tCommon("delete")}
            title={tCommon("delete")}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
