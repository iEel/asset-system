"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Ban } from "lucide-react"
import { toast } from "sonner"
import { RowActions, type RowNextAction } from "@/components/ui/row-actions"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useApiError } from "@/components/ui/use-api-error"

// The row actions of a brand or a model on the brands page (group 7 spec §4.3). DELETE on /api/brands/[id] and
// /api/models/[id] only sets isActive = false, so ⋯ says "ปิดใช้งาน", not "ลบ", and asks first with the number of models
// and assets that use the record; deactivating does not touch them. An inactive record has nothing in ⋯: it comes back
// from its edit page.
export function BrandModelDeactivateButton({
  kind,
  endpoint,
  name,
  isActive,
  models = 0,
  assets,
  menuLabel,
  next,
  className,
}: {
  kind: "brand" | "model"
  endpoint: string
  name: string
  isActive: boolean
  models?: number
  assets: number
  menuLabel: string
  next: RowNextAction
  className?: string
}) {
  const t = useTranslations("brandModel")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const confirm = useConfirm()
  const apiError = useApiError()
  const openerRef = useRef<HTMLElement | null>(null)
  const [busy, setBusy] = useState(false)

  async function deactivate() {
    const confirmed = await confirm({
      title: t("deactivate.confirmTitle", { name }),
      // A brand counts its models and assets; a model only its assets.
      description: kind === "brand" ? t("deactivate.confirmBody", { models, assets }) : t("deactivate.confirmBodyModel", { assets }),
      confirmLabel: t("deactivate.action"),
      tone: "destructive",
      returnFocusRef: openerRef,
    })
    if (!confirmed) return

    setBusy(true)
    try {
      const response = await fetch(endpoint, { method: "DELETE" })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }
      toast.success(t("deactivate.success"))
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <RowActions
      code={name}
      menuLabel={menuLabel}
      next={next}
      openerRef={openerRef}
      className={className}
      groups={
        isActive
          ? [
              {
                key: `deactivate-${kind}`,
                items: [
                  {
                    kind: "action",
                    key: "deactivate",
                    label: t("deactivate.action"),
                    icon: <Ban aria-hidden="true" />,
                    destructive: true,
                    onSelect: () => {
                      if (!busy) void deactivate()
                    },
                  },
                ],
              },
            ]
          : []
      }
    />
  )
}
