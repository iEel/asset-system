"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"

export function MasterDataDeleteButton({ endpoint, showLabel = false }: { endpoint: string; showLabel?: boolean }) {
  const router = useRouter()
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!(await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" }))) return

    setDeleting(true)
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }

      toast.success(tCommon("deletedSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
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
