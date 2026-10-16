"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
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
  legacyAttachments = [],
}: {
  documents: PurchaseDocument[]
  legacyAttachments?: PurchaseDocumentAttachment[]
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const hasDocuments = documents.length > 0 || legacyAttachments.length > 0

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
    <div className="mt-5 border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t("purchaseDocuments")}</h3>
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
                    <AttachmentCard key={attachment.id} attachment={attachment} deletingId={deletingId} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {/* A file without a document gets the document card's quiet grouping; inside a card a file has no box of its own. */}
          {legacyAttachments.map((attachment) => (
            <div key={attachment.id} className="rounded-md border border-border bg-background p-3">
              <AttachmentCard attachment={attachment} deletingId={deletingId} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AttachmentCard({
  attachment,
  deletingId,
  onDelete,
}: {
  attachment: PurchaseDocumentAttachment
  deletingId: string | null
  onDelete: (id: string) => void
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")

  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
      <div className="mt-1 text-meta text-muted-foreground">
        {attachment.fileType} · {formatFileSize(attachment.fileSize)}
      </div>
      {/* The same pair as the asset photos (asset-attachments.tsx): an outline sm download link and a danger icon-sm delete. */}
      <div className="mt-3 flex gap-2">
        <a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
          <Download aria-hidden="true" />
          {t("download")}
        </a>
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
      </div>
    </div>
  )
}
