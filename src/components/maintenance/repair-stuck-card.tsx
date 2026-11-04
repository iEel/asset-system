import Link from "next/link"
import { useTranslations } from "next-intl"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTableFoot } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn } from "@/lib/utils"

// The card shows this many rows until "ดูทั้งหมด" (the reader's take, G5P5-R3).
const COLLAPSED_ROWS = 3

// The repair list's stuck card (group 5 spec §11.2, plan 5 G5P5-R3): assets in a repair status with no open record.
// Server-safe (no "use client"). It always renders, so #stuck always lands. A row is the asset's name (a link to the
// asset), "tag · room" under it, and บันทึกซ่อม (create) back to this page. "ดูทั้งหมด" opens every row in the same
// card (stuck=all with the rest of the query kept) and "แสดงน้อยลง" returns to 3.
export function RepairStuckCard({ rows, total, expanded, locale, returnTo, canCreate, moreHref, lessHref }: {
  rows: { id: string; name: string; assetTag: string; roomName: string | null }[]
  total: number
  expanded: boolean
  locale: string
  returnTo: string
  canCreate: boolean
  moreHref: string
  lessHref: string
}) {
  const t = useTranslations("repairRecord")

  return (
    <ContentPanel
      id="stuck"
      divided
      flush
      className="scroll-mt-6"
      title={t("stuckTitle")}
      actions={<StatusBadge label={t("stuckCount", { count: formatCount(total) })} tone={total > 0 ? "warning" : "muted"} />}
    >
      {total === 0 ? (
        <EmptyNote padded>{t("stuckEmpty")}</EmptyNote>
      ) : (
        <>
          <Notice tone="warning" className="mx-4 mt-3 md:mx-5">{t("stuckHelp")}</Notice>
          <ContentPanelRows>
            {rows.map((asset) => (
              <li key={asset.id} data-repair-stuck-row className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/${locale}/assets/${asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 min-w-0 max-w-full items-center md:min-h-0")}>
                    <span className="truncate">{asset.name}</span>
                  </Link>
                  <div className="text-meta text-muted-foreground">
                    <span className="tag">{asset.assetTag}</span> · {asset.roomName ?? <Nil />}
                  </div>
                </div>
                {canCreate ? (
                  <Link href={appendOperationalReturnTo(`/${locale}/maintenance/new?assetId=${asset.id}`, returnTo)} className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
                    {t("createTitle")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ContentPanelRows>
          {total > COLLAPSED_ROWS ? (
            <DataTableFoot className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-b-lg">
              <span>{t("shownOfTotal", { shown: formatCount(rows.length), total: formatCount(total) })}</span>
              <Link href={expanded ? lessHref : moreHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                {expanded ? t("stuckShowLess") : t("stuckShowAll", { count: formatCount(total) })}
              </Link>
            </DataTableFoot>
          ) : null}
        </>
      )}
    </ContentPanel>
  )
}
