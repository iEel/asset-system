import Link from "next/link"
import { Download } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { PageBackLink } from "@/components/ui/page-header"
import { segmentedIdleClasses, segmentedOptionClasses, segmentedPressedClasses } from "@/components/ui/segmented"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { buildExactAssetRegisterHref } from "@/lib/asset-register-view-memory"
import { formatCount, formatMoney } from "@/lib/display-format"
import { breakdownPercent, breakdownPercentLabel, breakdownRowHref, type BreakdownDimension, type BreakdownGroup, type BreakdownTable } from "@/lib/report-breakdown"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
import { reportBreakdownDimensions, type ReportsOverviewData, type ReportsOverviewPreviewRow } from "@/lib/reports-overview-data"
import { cn } from "@/lib/utils"

// The operations tab's top-five lists still use this row (reports-operations-view.tsx).
export type ReportCountRow = {
  key: string
  label: string
  count: number
}

type Translate = Awaited<ReturnType<typeof getTranslations<"reportsPage">>>

export type ReportsOverviewViewProps = {
  locale: string
  hasActiveFilters: boolean
  hasMatchingAssets: boolean
  emptyCopy: {
    filtered: string
    dataset: string
  }
  data: ReportsOverviewData
  // The report's filters as a register query (no view, page or overview params): the row links add their group to it.
  baseQuery: string
  // The overview's own URL params as they are now; the group buttons and the breakdown links change one of them.
  breakdown: BreakdownDimension | null
  bq: string
  phoneGroup: BreakdownDimension
  // The phone's export card (board RP-Phone): the header's two exports, each only with its permission.
  exports: { registerHref?: string; overviewHref?: string; filterSummary: string }
}

const titleKeys = {
  status: "byStatus",
  category: "byCategory",
  company: "byCompany",
  branch: "byBranch",
  department: "byDepartment",
  ownership: "byOwnership",
} as const satisfies Record<BreakdownDimension, string>

// The phone's group buttons, in the board's order.
const phoneGroups = ["status", "category", "branch", "department", "ownership", "company"] as const satisfies readonly BreakdownDimension[]


const PREVIEW_PHONE_ROWS = 3

// The overview tab (group 10 spec §4, boards RP-Overview and RP-Phone): the status strip that adds up, six sorted group
// tables (eight rows, others, unassigned, the total) or one dimension's full list under `breakdown=`, and the ten newest
// assets before export. Below md: the strip 2 × 2 with the sum, an export card, group buttons with one table, and three
// preview cards. Server-only: it reads its own words.
export async function ReportsOverviewView({
  locale,
  hasActiveFilters,
  hasMatchingAssets,
  emptyCopy,
  data,
  baseQuery,
  breakdown,
  bq,
  phoneGroup,
  exports,
}: ReportsOverviewViewProps) {
  const t = await getTranslations("reportsPage")
  const tCommon = await getTranslations("common")
  const tAsset = await getTranslations("asset")
  const groupButtonLabels: Record<BreakdownDimension, string> = {
    status: t("status"),
    category: t("category"),
    company: t("company"),
    branch: t("branch"),
    department: t("department"),
    ownership: tAsset("ownershipType"),
  }
  const emptyLabel = selectReportEmptyCopy({ hasActiveFilters, hasMatchingAssets, ...emptyCopy })
  const base = new URLSearchParams(baseQuery)
  const { strip } = data

  // The report's own URL with the overview params changed: group buttons keep breakdown/bq, a breakdown link keeps group.
  const reportHref = (overrides: { breakdown?: string | null; bq?: string | null; group?: string | null }) => {
    const params = new URLSearchParams(base)
    params.set("view", "overview")
    const next = { breakdown, bq: bq || null, group: phoneGroup === "status" ? null : phoneGroup, ...overrides }
    for (const [name, value] of Object.entries(next)) {
      if (value) params.set(name, value)
    }
    return `/${locale}/reports?${params.toString()}`
  }
  const statusListHref = (statusId: string | null) => (statusId ? breakdownRowHref(locale, "status", statusId, base) : undefined)
  const viewListLink = (href: string | undefined, label: string) =>
    href ? (
      <Link href={href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
        {label}
      </Link>
    ) : null

  const total = formatCount(strip.total)
  const equation = t("stripEquation", {
    active: formatCount(strip.active),
    pending: formatCount(strip.pendingDisposal),
    writtenOff: formatCount(strip.writtenOff),
    total,
  })
  const retiredHref = statusListHref(strip.statusIds.retired)

  return (
    <div className="space-y-5" data-report-overview>
      <section aria-label={t("totalAssets")} data-report-overview-strip className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <StatStrip
            items={[
              { key: "totalAssets", label: t("totalAssets"), value: total, foot: t("stripTotalFoot") },
              {
                key: "active",
                operator: "=",
                label: t("stripActive"),
                value: formatCount(strip.active),
                foot: strip.activeExamples.length > 0
                  ? t("stripActiveFoot", { count: strip.activeStatusCount, examples: strip.activeExamples.join(" ") })
                  : t("stripActiveFootNone", { count: strip.activeStatusCount }),
              },
              {
                key: "pendingDisposal",
                operator: "+",
                label: t("stripPending"),
                value: formatCount(strip.pendingDisposal),
                foot: viewListLink(statusListHref(strip.statusIds.pendingDisposal), t("stripViewList")),
              },
              {
                key: "writtenOff",
                operator: "+",
                label: t("stripWrittenOff"),
                value: formatCount(strip.writtenOff),
                foot: (
                  <>
                    {viewListLink(statusListHref(strip.statusIds.disposed), t("stripViewList"))}
                    {strip.retired > 0 && retiredHref ? (
                      <>
                        {" · "}
                        {viewListLink(retiredHref, t("stripRetiredFoot", { count: strip.retired }))}
                      </>
                    ) : null}
                  </>
                ),
              },
            ]}
          />
          {/* The sum in words: on phones under the 2 × 2 strip (board RP-Phone), from lg for screen readers only. */}
          <p data-report-strip-equation className="mt-2 text-meta text-muted-foreground num lg:sr-only">{equation}</p>
        </div>
        <StatStrip
          items={[
            {
              key: "purchaseTotal",
              label: t("purchaseTotal"),
              value: formatMoney(strip.purchaseTotal),
              unit: tCommon("baht"),
              foot: (
                <>
                  <span className="max-md:hidden">{t("purchaseTotalFoot", { count: strip.total })}</span>
                  <span className="md:hidden">{t("purchaseTotalFootShort")}</span>
                  {" · "}
                  {viewListLink(`/${locale}/reports?${new URLSearchParams([...base, ["view", "accounting"]]).toString()}`, t("seeAccountingTab"))}
                </>
              ),
            },
          ]}
        />
      </section>

      {exports.registerHref || exports.overviewHref ? (
        <section data-report-export-card aria-labelledby="report-export-card-title" className="rounded-lg border border-border bg-surface p-4 md:hidden">
          <h2 id="report-export-card-title" className="text-base font-semibold text-foreground">{t("exportCardTitle")}</h2>
          <p className="mt-1 text-meta text-muted-foreground">
            {t("exportCardCount", { count: strip.total })} · {exports.filterSummary}
          </p>
          <div className="mt-3 grid gap-2">
            {exports.overviewHref ? (
              <a href={exports.overviewHref} download className={cn(buttonVariants({ size: "lg" }), "h-auto flex-col items-start gap-0 py-2 text-left whitespace-normal")}>
                <span className="inline-flex items-center gap-1.5"><Download aria-hidden="true" />{t("exportAssetOverview")}</span>
                <span className="text-meta font-normal opacity-90">{t("exportOverviewDescription")}</span>
              </a>
            ) : null}
            {exports.registerHref ? (
              <a href={exports.registerHref} download className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-auto flex-col items-start gap-0 py-2 text-left whitespace-normal")}>
                <span className="inline-flex items-center gap-1.5"><Download aria-hidden="true" />{t("exportAssetRegister")}</span>
                <span className="text-meta font-normal text-muted-foreground">{t("exportRegisterDescription", { count: strip.total })}</span>
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {data.full ? (
        <BreakdownFullList
          t={t}
          locale={locale}
          base={base}
          dimension={data.full.dimension}
          groups={data.full.groups}
          total={data.tables[data.full.dimension].total}
          bq={bq}
          backHref={reportHref({ breakdown: null, bq: null })}
          formHidden={[...base, ["view", "overview"], ["breakdown", data.full.dimension], ...(phoneGroup !== "status" ? [["group", phoneGroup] as [string, string]] : [])]}
          emptyLabel={emptyLabel}
        />
      ) : (
        <section aria-labelledby="report-breakdown-title" data-report-breakdowns className="space-y-3">
          <h2 id="report-breakdown-title" className="sr-only">{t("breakdownGroupsLabel")}</h2>
          <p className="text-meta text-muted-foreground max-md:hidden">{t("breakdownHelp")}</p>
          <p className="text-meta text-muted-foreground md:hidden">{t("breakdownHelpShort")}</p>
          <div className="hidden gap-4 md:grid md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {reportBreakdownDimensions.map((dimension) => (
              <BreakdownPanel
                key={dimension}
                t={t}
                locale={locale}
                base={base}
                table={data.tables[dimension]}
                emptyLabel={emptyLabel}
                viewAllHref={reportHref({ breakdown: dimension, bq: null })}
              />
            ))}
          </div>
          <div className="space-y-3 md:hidden" data-report-phone-groups>
            {/* Six links in Segmented's look that wrap instead of scrolling (board RP-Phone), so not TabNav's one row. */}
            <nav aria-label={t("breakdownGroupsLabel")}>
              <ul className="flex flex-wrap gap-2">
                {phoneGroups.map((dimension) => (
                  <li key={dimension} className="flex">
                    <Link
                      href={reportHref({ group: dimension === "status" ? null : dimension })}
                      scroll={false}
                      aria-current={dimension === phoneGroup ? "page" : undefined}
                      className={cn(segmentedOptionClasses, "border border-border px-3", dimension === phoneGroup ? segmentedPressedClasses : cn("bg-surface", segmentedIdleClasses))}
                    >
                      {groupButtonLabels[dimension]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <BreakdownPanel
              t={t}
              locale={locale}
              base={base}
              table={data.tables[phoneGroup]}
              emptyLabel={emptyLabel}
              viewAllHref={reportHref({ breakdown: phoneGroup, bq: null })}
            />
          </div>
        </section>
      )}

      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={t("previewShortTitle")}
        actions={<span className="text-meta text-muted-foreground num">{t("previewLatest", { count: data.preview.length, total: strip.total })}</span>}
      >
        {data.preview.length === 0 ? (
          <EmptyNote padded>{emptyLabel}</EmptyNote>
        ) : (
          <>
            <DataTable data-report-preview-table framed={false} caption={t("previewShortTitle")} className="hidden md:block">
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("previewColAsset")}</DataTableHead>
                  <DataTableHead>{t("category")}</DataTableHead>
                  <DataTableHead>{t("previewColBranchDepartment")}</DataTableHead>
                  <DataTableHead>{t("previewColHolderOwnership")}</DataTableHead>
                  <DataTableHead>{t("status")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {data.preview.map((asset) => (
                  <DataTableRow key={asset.id}>
                    <DataTableCell className="min-w-56">
                      <PreviewAssetName locale={locale} asset={asset} />
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">{asset.category}</DataTableCell>
                    <DataTableCell>
                      <span className="block text-foreground">{asset.branch}</span>
                      <span className="block text-meta text-faint-foreground">{asset.department ?? t("unassignedDepartment")}</span>
                    </DataTableCell>
                    <DataTableCell>
                      <span className={cn("block", asset.custodian ? "text-foreground" : "text-faint-foreground")}>{asset.custodian ?? t("noCustodian")}</span>
                      <span className="block text-meta text-faint-foreground">{asset.ownership}</span>
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge label={asset.statusLabel} status={asset.statusName} />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <ul data-report-preview-cards className="divide-y divide-border-soft md:hidden">
              {data.preview.slice(0, PREVIEW_PHONE_ROWS).map((asset) => (
                <li key={asset.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <PreviewAssetName locale={locale} asset={asset} />
                    <p className="mt-1 text-meta text-muted-foreground">
                      {asset.custodian ?? t("noCustodian")} · {asset.ownership}
                    </p>
                  </div>
                  <StatusBadge label={asset.statusLabel} status={asset.statusName} className="shrink-0" />
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="border-t border-border px-4 py-2.5 md:px-5">
          <Link href={buildExactAssetRegisterHref(locale, Object.fromEntries(base))} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
            {t("viewAllInRegister")}
          </Link>
        </div>
      </ContentPanel>
    </div>
  )
}

function PreviewAssetName({ locale, asset }: { locale: string; asset: ReportsOverviewPreviewRow }) {
  return (
    <>
      <Link
        href={`/${locale}/assets/${asset.id}`}
        title={asset.name}
        className={cn(linkVariants({ size: "inherit" }), "line-clamp-2 min-h-11 md:min-h-0")}
      >
        {asset.name}
      </Link>
      <span className="block text-meta text-faint-foreground"><span className="tag">{asset.assetTag}</span></span>
    </>
  )
}

function GroupName({ name, code }: { name: string; code: string | null }) {
  return (
    <>
      <span className="block">{name}</span>
      {code ? <span className="block text-meta text-faint-foreground"><span className="tag">{code}</span></span> : null}
    </>
  )
}

function ShareCell({ count, percent }: { count: number; percent: number }) {
  return (
    <span className="flex items-center justify-end gap-2">
      <span aria-hidden="true" className="h-1.5 w-12 overflow-hidden rounded-xs bg-border-soft max-sm:hidden">
        <span className="block h-full bg-primary" style={{ width: `${Math.min(100, percent)}%` }} />
      </span>
      <span className="w-14 text-right num">{breakdownPercentLabel(count, percent)}</span>
    </span>
  )
}

const rowLinkClasses = cn(linkVariants({ size: "inherit" }), "flex min-h-11 flex-col justify-center md:min-h-0")

function BreakdownHead({ t }: { t: Translate }) {
  return (
    <DataTableHeader>
      <tr>
        <DataTableHead>{t("breakdownColName")}</DataTableHead>
        <DataTableHead align="right">{t("breakdownColCount")}</DataTableHead>
        <DataTableHead align="right">{t("breakdownColShare")}</DataTableHead>
      </tr>
    </DataTableHeader>
  )
}

function BreakdownPanel({
  t,
  locale,
  base,
  table,
  emptyLabel,
  viewAllHref,
}: {
  t: Translate
  locale: string
  base: URLSearchParams
  table: BreakdownTable
  emptyLabel: string
  viewAllHref: string
}) {
  const { dimension } = table
  const title = t(titleKeys[dimension])
  const isEmpty = table.rows.length === 0 && !table.unassigned
  const topCount = table.rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <ContentPanel
      divided
      flush
      title={title}
      actions={<span className="text-meta text-muted-foreground num">{t("breakdownGroupCount", { count: table.groupCount, dimension })}</span>}
    >
      <div data-report-breakdown={dimension}>
        {isEmpty ? (
          <EmptyNote padded>{emptyLabel}</EmptyNote>
        ) : (
          <DataTable framed={false} caption={title}>
            <BreakdownHead t={t} />
            <DataTableBody>
              {table.rows.map((row) => (
                <DataTableRow key={row.key}>
                  <DataTableCell>
                    <Link href={breakdownRowHref(locale, dimension, row.key, base)} className={rowLinkClasses}>
                      <GroupName name={row.name} code={row.code} />
                    </Link>
                  </DataTableCell>
                  <DataTableCell numeric>{formatCount(row.count)}</DataTableCell>
                  <DataTableCell><ShareCell count={row.count} percent={row.percent} /></DataTableCell>
                </DataTableRow>
              ))}
              {table.others ? (
                <DataTableRow data-report-breakdown-others>
                  <DataTableCell className="text-muted-foreground">
                    {t("breakdownOthers", { count: table.others.groups, dimension })}
                    {dimension === "status" && table.others.names.length > 0 ? ` (${table.others.names.join(" · ")})` : null}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(table.others.count)}</DataTableCell>
                  <DataTableCell className="text-muted-foreground"><ShareCell count={table.others.count} percent={table.others.percent} /></DataTableCell>
                </DataTableRow>
              ) : null}
              {table.unassigned ? (
                <DataTableRow data-report-breakdown-unassigned>
                  <DataTableCell>
                    {/* Only the department has a register filter for "none" (dataQuality=department); the rest stay plain. */}
                    {dimension === "department" ? (
                      <Link href={breakdownRowHref(locale, dimension, null, base)} className={rowLinkClasses}>
                        {t("unassignedDepartment")}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{t("unassigned")}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric>{formatCount(table.unassigned.count)}</DataTableCell>
                  <DataTableCell><ShareCell count={table.unassigned.count} percent={table.unassigned.percent} /></DataTableCell>
                </DataTableRow>
              ) : null}
              <DataTableRow data-report-breakdown-total>
                <DataTableCell className="font-semibold text-foreground">
                  {t("breakdownTotal")}
                  {dimension === "department" && table.others && table.unassigned ? (
                    <span data-report-department-equation className="block text-meta font-normal text-muted-foreground num">
                      {t("breakdownDepartmentEquation", {
                        limit: table.rows.length,
                        top: formatCount(topCount),
                        others: formatCount(table.others.count),
                        unassigned: formatCount(table.unassigned.count),
                      })}
                    </span>
                  ) : null}
                </DataTableCell>
                <DataTableCell numeric className="font-semibold text-foreground">{formatCount(table.total)}</DataTableCell>
                <DataTableCell />
              </DataTableRow>
            </DataTableBody>
          </DataTable>
        )}
        {table.others ? (
          <div className="border-t border-border px-4 py-2.5 md:px-5">
            <Link href={viewAllHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
              {t("breakdownViewAll", { count: table.groupCount, dimension })}
            </Link>
          </div>
        ) : null}
      </div>
    </ContentPanel>
  )
}

function BreakdownFullList({
  t,
  locale,
  base,
  dimension,
  groups,
  total,
  bq,
  backHref,
  formHidden,
  emptyLabel,
}: {
  t: Translate
  locale: string
  base: URLSearchParams
  dimension: BreakdownDimension
  groups: BreakdownGroup[]
  total: number
  bq: string
  backHref: string
  formHidden: Array<[string, string]>
  emptyLabel: string
}) {
  const title = t(titleKeys[dimension])
  const named = groups.filter((group) => group.key !== null).length

  return (
    <section data-report-breakdown-full={dimension} aria-labelledby="report-breakdown-full-title" className="space-y-3">
      <PageBackLink href={backHref} label={t("backToOverview")} />
      <ContentPanel
        divided
        flush
        title={title}
        titleId="report-breakdown-full-title"
        actions={<span className="text-meta text-muted-foreground num">{t("breakdownGroupCount", { count: named, dimension })}</span>}
      >
        <form role="search" action={`/${locale}/reports`} className="flex flex-col gap-2 border-b border-border-soft px-4 py-3 sm:flex-row sm:items-end md:px-5">
          {formHidden.map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("breakdownSearch")}</span>
            <SearchField name="bq" defaultValue={bq} placeholder={t("breakdownSearchPlaceholder")} />
          </label>
          <Button type="submit" size="lg" variant="outline">{t("breakdownSearchSubmit")}</Button>
        </form>
        {total === 0 ? (
          <EmptyNote padded>{emptyLabel}</EmptyNote>
        ) : groups.length === 0 ? (
          <EmptyNote padded role="status">{t("breakdownNoMatch")}</EmptyNote>
        ) : (
          <DataTable framed={false} caption={title}>
            <BreakdownHead t={t} />
            <DataTableBody>
              {groups.map((group) => {
                const linked = group.key !== null || dimension === "department"
                return (
                  <DataTableRow key={group.key ?? "unassigned"}>
                    <DataTableCell>
                      {linked ? (
                        <Link href={breakdownRowHref(locale, dimension, group.key, base)} className={rowLinkClasses}>
                          <GroupName name={group.name} code={group.code} />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{t("unassigned")}</span>
                      )}
                    </DataTableCell>
                    <DataTableCell numeric>{formatCount(group.count)}</DataTableCell>
                    <DataTableCell><ShareCell count={group.count} percent={breakdownPercent(group.count, total)} /></DataTableCell>
                  </DataTableRow>
                )
              })}
              <DataTableRow data-report-breakdown-total>
                <DataTableCell className="font-semibold text-foreground">{t("breakdownTotal")}</DataTableCell>
                <DataTableCell numeric className="font-semibold text-foreground">{formatCount(total)}</DataTableCell>
                <DataTableCell />
              </DataTableRow>
            </DataTableBody>
          </DataTable>
        )}
      </ContentPanel>
    </section>
  )
}
