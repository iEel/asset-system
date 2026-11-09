import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { FilterChipList, type FilterChipItem } from "@/components/ui/filter-chips"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { consumableReportDays, type ConsumableFrequentRow, type ConsumableReportDays } from "@/lib/consumable-service"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type ConsumablesFrequentReportProps = {
  locale: string
  // The page's รายการ / เครื่องที่เปลี่ยนของบ่อย TabNav.
  tabs: ReactNode
  days: ConsumableReportDays
  itemId: string | null
  assetId: string | null
  // Every kind, inactive ones too (ชนิด).
  items: Array<{ id: string; name: string; isActive: boolean }>
  // The machine chip when ?asset= is set; its link removes asset only.
  chips: FilterChipItem[]
  rows: ConsumableFrequentRow[]
  more: boolean
}

// ของใช้สิ้นเปลือง plan 3 Task 3: เครื่องที่เปลี่ยนของบ่อย, machines ranked by issue movements in the period (one ครั้ง
// per movement whatever its quantity), top 100. A GET form (ช่วง, ชนิด) as the house list filters, the machine chip, then
// the recent-panel shape: a desktop table and phone rows. Server-safe: no directive and no client hook.
export function ConsumablesFrequentReport({ locale, tabs, days, itemId, assetId, items, chips, rows, more }: ConsumablesFrequentReportProps) {
  const t = useTranslations("consumablesPage")
  const tCommon = useTranslations("common")
  const tAsset = useTranslations("asset")

  const daysOptions = consumableReportDays.map((value) => ({ value: String(value), label: t("days_option", { days: value }) }))
  const itemOptions = items.map((item) => ({ value: item.id, label: item.isActive ? item.name : t("item_inactive", { name: item.name }) }))
  const latest = (row: ConsumableFrequentRow) => t("latest_value", { date: formatAssetDetailDate(row.latestAt, locale), item: row.latestItemName })

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={<span>{t("cabinet")}</span>} />

      {tabs}

      <div className="space-y-3">
        <form role="search" method="get" action={`/${locale}/consumables`} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value="frequent" />
          {assetId ? <input type="hidden" name="asset" value={assetId} /> : null}
          <FilterSelect label={t("filter_days")} name="days" defaultValue={String(days)} options={daysOptions} fieldSize="md" className="w-full sm:w-36" />
          <FilterSelect label={t("filter_item")} name="item" defaultValue={itemId ?? ""} allLabel={t("item_all")} options={itemOptions} fieldSize="md" className="w-full sm:w-64" />
          <Button type="submit" variant="outline" className="max-sm:w-full">{tCommon("filter")}</Button>
        </form>
        <FilterChipList chips={chips} label={tAsset("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")} />
      </div>

      <ContentPanel divided flush>
        {rows.length === 0 ? (
          <EmptyNote padded>{t("report_empty")}</EmptyNote>
        ) : (
          <>
            <DataTable framed={false} className="hidden md:block" caption={t("tab_frequent")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("col_asset")}</DataTableHead>
                  <DataTableHead>{t("col_holder")}</DataTableHead>
                  <DataTableHead align="right">{t("col_count")}</DataTableHead>
                  <DataTableHead>{t("col_latest")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {rows.map((row) => (
                  <DataTableRow key={row.assetId}>
                    <DataTableCell className="min-w-56">
                      <Link href={`/${locale}/assets/${row.assetId}`} className={cn(linkVariants({ size: "inherit" }), "font-medium")}>
                        <span className="tag">{row.assetTag}</span>
                      </Link>
                      <span className="block break-words text-meta text-muted-foreground">{row.assetName}</span>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">{row.holderName ?? <Nil />}</DataTableCell>
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(row.count)}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">{latest(row)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <ContentPanelRows className="md:hidden">
              {rows.map((row) => (
                <li key={row.assetId} className="space-y-1">
                  <Link href={`/${locale}/assets/${row.assetId}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 max-w-full items-center font-medium")}>
                    <span className="tag">{row.assetTag}</span>
                  </Link>
                  <div className="break-words text-sm text-foreground">{row.assetName}</div>
                  <div className="break-words text-meta text-muted-foreground">{t("col_holder")}: {row.holderName ?? <Nil />}</div>
                  <div className="break-words text-meta text-muted-foreground">
                    {t("col_count")} <span className="num font-medium text-foreground">{formatCount(row.count)}</span> · {t("col_latest")} {latest(row)}
                  </div>
                </li>
              ))}
            </ContentPanelRows>
            {more ? (
              <p className="border-t border-border-soft px-4 py-3 text-meta text-muted-foreground md:px-5">{t("report_more")}</p>
            ) : null}
          </>
        )}
      </ContentPanel>
    </div>
  )
}
