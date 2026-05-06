"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, FileText, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize } from "@/lib/uploads"

type PurchaseDocument = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

export function AssetPurchaseDocuments({ documents }: { documents: PurchaseDocument[] }) {
  const router = useRouter()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
      {documents.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          {tCommon("noData")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {documents.map((attachment) => (
            <div key={attachment.id} className="rounded-md border border-border bg-background p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {attachment.fileType} · {formatFileSize(attachment.fileSize)}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/api/attachments/${attachment.id}`}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("download")}
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(attachment.id)}
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
          ))}
        </div>
      )}
    </div>
  )
}
