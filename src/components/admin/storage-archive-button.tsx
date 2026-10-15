"use client"

import { useState } from "react"
import { Archive } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useApiError } from "@/components/ui/use-api-error"

export function StorageArchiveButton({ relativePath }: { relativePath: string }) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("storagePage")
  const confirm = useConfirm()
  const [archiving, setArchiving] = useState(false)

  async function handleClick() {
    if (!(await confirm({ title: t("archiveConfirm", { file: relativePath }), confirmLabel: t("archiveOrphanFile") }))) return

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
      apiError.toast(error instanceof Error ? error : t("archiveFailed"))
    } finally {
      setArchiving(false)
    }
  }

  // M14: a row button is outline sm (DESIGN: green, orange and red live only in badges); busy keeps focus and the
  // label while the request runs, and blocks a second click.
  return (
    <Button variant="outline" size="sm" busy={archiving} onClick={handleClick}>
      <Archive aria-hidden="true" />
      {t("archiveOrphanFile")}
    </Button>
  )
}
