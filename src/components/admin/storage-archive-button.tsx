"use client"

import { useState } from "react"
import { Archive, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function StorageArchiveButton({ relativePath }: { relativePath: string }) {
  const router = useRouter()
  const t = useTranslations("storagePage")
  const [archiving, setArchiving] = useState(false)

  async function handleClick() {
    if (!window.confirm(t("archiveConfirm", { file: relativePath }))) return

    setArchiving(true)
    try {
      const response = await fetch("/api/admin/storage/archive-orphan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ relativePath }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? t("archiveFailed"))
      }

      toast.success(t("archiveSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("archiveFailed"))
    } finally {
      setArchiving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={archiving}
      className="inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-warning/30 bg-warning/5 px-3 text-xs font-medium text-warning transition-colors hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:min-h-0"
    >
      {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
      {t("archiveOrphanFile")}
    </button>
  )
}
