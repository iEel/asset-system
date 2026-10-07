"use client"

import { useTranslations } from "next-intl"
import { Loader2, Trash2 } from "lucide-react"
import { useDeleteAction } from "@/components/master-data/use-delete-action"

export function MasterDataDeleteButton({ endpoint, showLabel = false }: { endpoint: string; showLabel?: boolean }) {
  const tCommon = useTranslations("common")
  const { deleting, runDelete } = useDeleteAction(endpoint)

  return (
    <button
      type="button"
      onClick={() => void runDelete()}
      disabled={deleting}
      title={tCommon("delete")}
      aria-label={tCommon("delete")}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 disabled:opacity-50 ${showLabel ? "w-full justify-start px-3" : "min-w-11"}`}
    >
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
      {showLabel ? tCommon("delete") : null}
    </button>
  )
}
