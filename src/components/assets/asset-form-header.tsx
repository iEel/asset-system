"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"

// The asset form's header (group 4 plan 2 Task 6a, spec §8): on create the title, the line that says only the first
// card is needed, and the page's own switch in actions (the workspace's เพิ่มทีละรายการ / เพิ่มเป็นชุด). The edit variant
// keeps the subtitle until Task 7 names the asset here.
export function AssetFormHeader({ mode, title, backHref, actions }: { mode: "create" | "edit"; title: string; backHref: string; actions?: ReactNode }) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")

  return (
    <PageHeader
      title={title}
      meta={mode === "create" ? t("createRequiredHint") : t("subtitle")}
      actions={actions}
      className="mb-6"
      back={<PageBackLink href={backHref} label={tCommon("back")} />}
    />
  )
}
