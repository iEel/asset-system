import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { formatHistoryTime } from "@/lib/asset-history-view"
import { formatConsumableQuantityChange, parseConsumableHistoryPage } from "@/lib/consumable-rules"
import { getConsumableHistory, type ConsumableHistoryRow } from "@/lib/consumable-service"
import { formatCount } from "@/lib/display-format"
import { requirePagePermission } from "@/lib/page-auth"
import { cn } from "@/lib/utils"
import { ConsumableHistoryHeader } from "@/components/consumables/consumable-history-header"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, dataTableRowClasses } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Pagination } from "@/components/ui/pagination"

// ของใช้สิ้นเปลือง (consumables plan 2 Task 4): one kind's movements, newest first, 50 a page (?page=). consumable:view
// opens it; an inactive kind stays readable with no actions (the header). รับเข้า, เบิก and ปรับยอด rows show the received
// date, the asset (a link) or the reason under เครื่อง; โดย is the user as asset history names them.
type ConsumableHistoryPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ConsumableHistoryPage({ params, searchParams }: ConsumableHistoryPageProps) {
  const { locale, id } = await params
  const user = await requirePagePermission(locale, "consumable", "view")
  const canCreate = hasPermission(user, "consumable", "create")
  const canEdit = hasPermission(user, "consumable", "edit")
  const history = await getConsumableHistory(prisma, id, parseConsumableHistoryPage((await searchParams).page))
  if (!history) notFound()

  const t = await getTranslations("consumablesPage")
  const tCommon = await getTranslations("common")
  const basePath = `/${locale}/consumables/${id}`
  const pageHref = (target: number) => target <= 1 ? basePath : `${basePath}?page=${target}`
  const start = (history.page - 1) * history.pageSize + 1
  const end = start + history.rows.length - 1

  const typeLabel = (row: ConsumableHistoryRow) => t(`type_${row.type}`)
  const when = (row: ConsumableHistoryRow) => `${formatAssetDetailDate(row.performedAt, locale)} ${formatHistoryTime(row.performedAt)}`
  // The detail column (col_detail "เครื่อง / เหตุผล / วันที่รับ"): the asset for an issue, the reason for an adjust, the
  // received date for a receipt.
  const detail = (row: ConsumableHistoryRow) =>
    row.type === "issue" && row.asset ? (
      <Link href={`/${locale}/assets/${row.asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1.5 md:min-h-0")}>
        <span className="tag font-medium">{row.asset.assetTag}</span>
        <span>{row.asset.name}</span>
      </Link>
    ) : row.type === "adjust" ? (
      row.reason
    ) : row.type === "receive" && row.receivedDate ? (
      t("receivedOn", { date: formatAssetDetailDate(row.receivedDate, locale) })
    ) : null
  // Phone cards name each row's detail by its type: เครื่อง, เหตุผล or วันที่รับเข้า (with the bare date under that label).
  const detailItem = (row: ConsumableHistoryRow) =>
    row.type === "issue"
      ? { key: "detail", label: t("detail_asset"), value: detail(row) }
      : row.type === "adjust"
        ? { key: "detail", label: t("field_reason"), value: detail(row) }
        : { key: "detail", label: t("field_receivedDate"), value: row.receivedDate ? formatAssetDetailDate(row.receivedDate, locale) : null }
  const signed = (row: ConsumableHistoryRow) => (
    <span className={cn("num font-medium", row.quantityChange > 0 ? "text-success" : "text-foreground")}>
      {formatConsumableQuantityChange(row.quantityChange)}
    </span>
  )

  return (
    <div className="space-y-6">
      <ConsumableHistoryHeader locale={locale} item={history.item} canCreate={canCreate} canEdit={canEdit} />

      {history.rows.length === 0 ? (
        <ContentPanel>
          <ActionEmptyState title={t("noMovements")} />
        </ContentPanel>
      ) : (
        <ContentPanel divided flush>
          <DataTable framed={false} className="hidden md:block" caption={t("historyCaption", { name: history.item.name })} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("col_date")}</DataTableHead>
                <DataTableHead>{t("col_type")}</DataTableHead>
                <DataTableHead align="right">{t("col_quantity")}</DataTableHead>
                <DataTableHead align="right">{t("col_after")}</DataTableHead>
                <DataTableHead>{t("col_detail")}</DataTableHead>
                <DataTableHead>{t("col_note")}</DataTableHead>
                <DataTableHead>{t("col_by")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {history.rows.map((row) => (
                <tr key={row.id} className={dataTableRowClasses}>
                  <DataTableCell className="whitespace-nowrap num">{when(row)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">{typeLabel(row)}</DataTableCell>
                  <DataTableCell numeric>{signed(row)}</DataTableCell>
                  <DataTableCell numeric>{formatCount(row.onHandAfter)}</DataTableCell>
                  <DataTableCell className="min-w-48">{detail(row)}</DataTableCell>
                  <DataTableCell className="min-w-40 text-muted-foreground">{row.note}</DataTableCell>
                  <DataTableCell className="min-w-40">{row.actor}</DataTableCell>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>

          {/* Phone: one card per movement with the table's facts. */}
          <div data-consumable-history-cards className="grid gap-3 p-3 md:hidden">
            {history.rows.map((row) => (
              <article key={row.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{typeLabel(row)}</span>
                  {signed(row)}
                </div>
                <p className="mt-0.5 text-meta text-muted-foreground num">{when(row)}</p>
                <KeyValueList
                  className="mt-2"
                  items={[
                    { key: "after", label: t("col_after"), value: <span className="num">{formatCount(row.onHandAfter)}</span> },
                    detailItem(row),
                    { key: "note", label: t("col_note"), value: row.note },
                    { key: "by", label: t("col_by"), value: row.actor },
                  ]}
                />
              </article>
            ))}
          </div>

          {history.totalPages > 1 ? (
            <div className="border-t border-border-soft px-4 py-3 md:px-5">
              <Pagination
                page={history.page}
                totalPages={history.totalPages}
                previousHref={pageHref(history.page - 1)}
                nextHref={pageHref(history.page + 1)}
                labels={{
                  navigation: tCommon("pagination"),
                  previous: tCommon("previous"),
                  next: tCommon("next"),
                  pageOf: tCommon("pageOf", { page: history.page, total: history.totalPages }),
                  range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(history.total) }),
                }}
              />
            </div>
          ) : null}
        </ContentPanel>
      )}
    </div>
  )
}
