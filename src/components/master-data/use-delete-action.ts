"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"

export function useDeleteAction(endpoint: string, options?: { returnFocusRef?: { current: HTMLElement | null } }) {
  const router = useRouter()
  const confirm = useConfirm()
  const tCommon = useTranslations("common")
  const [deleting, setDeleting] = useState(false)

  async function runDelete() {
    const confirmed = await confirm({
      title: tCommon("deleteConfirm"),
      confirmLabel: tCommon("delete"),
      tone: "destructive",
      returnFocusRef: options?.returnFocusRef,
    })
    if (!confirmed) return

    setDeleting(true)
    try {
      const response = await fetch(endpoint, { method: "DELETE" })
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

  return { deleting, runDelete }
}
