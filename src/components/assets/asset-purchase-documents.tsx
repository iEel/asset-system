"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, FileText, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize } from "@/lib/uploads"

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
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const hasDocuments = documents.length > 0 || legacyAttachments.length > 0

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("deleteConfirm"))) return
    setDeletingId(id)

    try {
      const response = await fetch(`/api/attachments/${id}`, { method: "DELETE" })
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
    <div className="mt-5 border-t border-border pt-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-primary" />
        {t("purchaseDocuments")}
      </h3>
      {!hasDocuments ? (
        <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          {tCommon("noData")}
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-md border border-border bg-background p-3">
              <div className="text-sm font-medium text-foreground">
                {document.documentType ? t(`purchaseDocumentTypes.${document.documentType}`) : t("purchaseDocuments")} · {document.documentNo}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {[document.supplierName, document.poNumber ? `${t("poNumber")}: ${document.poNumber}` : null, document.invoiceNumber ? `${t("invoiceNumber")}: ${document.invoiceNumber}` : null]
                  .filter(Boolean)
                  .join(" · ") || "-"}
              </div>
              {(document.attachments ?? []).length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(document.attachments ?? []).map((attachment) => (
                    <AttachmentCard key={attachment.id} attachment={attachment} deletingId={deletingId} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {legacyAttachments.map((attachment) => (
            <AttachmentCard key={attachment.id} attachment={attachment} deletingId={deletingId} onDelete={handleDelete} />
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
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {attachment.fileType} · {formatFileSize(attachment.fileSize)}
        </div>
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
          onClick={() => onDelete(attachment.id)}
          disabled={deletingId === attachment.id}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          aria-label={tCommon("delete")}
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
  )
}
