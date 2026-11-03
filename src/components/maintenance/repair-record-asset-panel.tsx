import Link from "next/link"
import { useTranslations } from "next-intl"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import type { RepairAssetFacts } from "@/lib/repair-record-outlook"
import { cn } from "@/lib/utils"

// The record page's asset card (group 5 plan 3, G5P3-R10, spec §8.3). Server-safe (no "use client"): the register photo
// or its empty frame, the name linking to the asset, the tag; สถานะปัจจุบัน as a badge; ผู้ถือครอง with the department
// under it; ที่ตั้ง with the branch under it; and the asset's repair list, whose count is the asset's active records, the
// count the list it opens shows. It differs from plan 2's picked card (RepairAssetCard), so it is a part of its own.
// returnTo is the record page's way back; the repair list it opens carries it along.
export function RepairRecordAssetPanel({ facts, locale, recordCount, returnTo }: {
  facts: RepairAssetFacts
  locale: string
  recordCount: number
  returnTo: string
}) {
  const t = useTranslations("repairRecord")

  return (
    <ContentPanel title={t("assetSection")}>
      <div className="space-y-4">
        <div className="flex min-w-0 items-start gap-3">
          <AssetThumbnail photo={facts.photo} assetTag={facts.assetTag} assetName={facts.name} size={44} />
          <div className="grid min-w-0 flex-1 gap-1">
            <Link href={`/${locale}/assets/${facts.id}`} className={cn(linkVariants({ size: "inherit" }), "min-w-0 break-words")}>
              {facts.name}
            </Link>
            <span className="tag w-fit">{facts.assetTag}</span>
          </div>
        </div>
        <KeyValueList
          items={[
            {
              key: "currentStatus",
              label: t("currentStatus"),
              value: <StatusBadge label={facts.statusLabel} tone={getAssetStateTone(facts.statusName)} />,
            },
            { key: "custodian", label: t("custodian"), value: stackedLines(facts.holderName, facts.departmentName) },
            { key: "location", label: t("location"), value: stackedLines(facts.roomName, facts.branchName) },
          ]}
        />
        <Link
          href={appendOperationalReturnTo(`/${locale}/maintenance?assetId=${facts.id}`, returnTo)}
          className={cn(linkVariants({ size: "inherit" }), "text-sm")}
        >
          {t("detail.assetRepairHistory", { count: recordCount })}
        </Link>
      </div>
    </ContentPanel>
  )
}

// A name with its parent under it (a department, a branch); nothing when both are empty, so KeyValueList shows Nil.
function stackedLines(main: string | null, sub: string | null) {
  if (!main && !sub) return null
  return (
    <>
      {main ? <span className="block">{main}</span> : null}
      {sub ? <span className="block text-meta text-muted-foreground">{sub}</span> : null}
    </>
  )
}
