"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { linkVariants } from "@/components/ui/button-variants"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
import type { AssetEditContext } from "@/lib/asset-form-rules"

// The asset form's header (group 4 plan 2 Task 6a, spec §8): on create the title, the line that says only the first
// card is needed, and the page's own switch in actions (the workspace's เพิ่มทีละรายการ / เพิ่มเป็นชุด). On edit (Task 7,
// spec §7.1) the title names the asset, and under it the code, the status, the holder, the room and a link to the asset
// page.
export function AssetFormHeader({
  mode,
  title,
  backHref,
  actions,
  edit,
}: {
  mode: "create" | "edit"
  title: string
  backHref: string
  actions?: ReactNode
  edit?: { assetTag: string; context: AssetEditContext }
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")

  return (
    <PageHeader
      title={title}
      meta={mode === "create" ? t("createRequiredHint") : edit ? <AssetFormEditMeta assetTag={edit.assetTag} context={edit.context} /> : t("subtitle")}
      actions={actions}
      className="mb-6"
      back={<PageBackLink href={backHref} label={tCommon("back")} />}
    />
  )
}

// The meta row is a wrapping flex row: the code and the status share the first line, each later fact takes a line.
function AssetFormEditMeta({ assetTag, context }: { assetTag: string; context: AssetEditContext }) {
  const t = useTranslations("asset")

  return (
    <>
      <span className="tag">{assetTag}</span>
      <StatusBadge label={context.statusNameTh} tone={getAssetStateTone(context.statusName)} />
      {context.holder ? (
        <span className="min-w-0 basis-full break-words">
          {context.holder.departmentName
            ? t("editHolderLine", { name: context.holder.name, department: context.holder.departmentName })
            : t("editHolderOnly", { name: context.holder.name })}
        </span>
      ) : null}
      {context.locationLine ? <span className="min-w-0 basis-full break-words">{context.locationLine}</span> : null}
      <span className="basis-full">
        <Link href={context.viewHref} className={linkVariants({ size: "inherit" })}>
          {t("viewAssetPage")}
        </Link>
      </span>
    </>
  )
}
