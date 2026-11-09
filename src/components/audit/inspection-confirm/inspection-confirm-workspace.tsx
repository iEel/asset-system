"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ClipboardCheck } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { Notice } from "@/components/ui/notice"
import { TabNav } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import type { InspectionPageRow } from "@/lib/inspection-confirm-page-model"
import { inspectionConfirmTabs, type InspectionConfirmTab, type InspectionTargetStatusName } from "@/lib/inspection-confirm-rules"
import { cn } from "@/lib/utils"
import { InspectionRowCard, InspectionTableRow } from "./inspection-row"

export type InspectionConfirmWorkspaceProps = {
  locale: string
  roundId: string
  auditNo: string
  tab: InspectionConfirmTab
  counts: Record<InspectionConfirmTab, number>
  /** The rows of the current tab only. */
  rows: InspectionPageRow[]
  canConfirm: boolean
  statusLabels: Record<InspectionTargetStatusName, string>
  links: { round: string; pendingFindings: string; pendingItems: string }
}

const bannerLinkClasses = cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")

// ยืนยันผลตรวจ (inspection-confirm plan 3 task 2): the five tabs and the read-only list. Task 3 adds the selection and the
// confirm dialog in here; the tick column slot already sits behind canConfirm.
export function InspectionConfirmWorkspace({ locale, roundId, tab, counts, rows, canConfirm, statusLabels, links }: InspectionConfirmWorkspaceProps) {
  const t = useTranslations("inspectionConfirmPage")
  const tCommon = useTranslations("common")
  const total = inspectionConfirmTabs.reduce((sum, key) => sum + counts[key], 0)

  // Nothing of this round is still under inspection: no tabs, just the way back.
  if (total === 0) {
    return (
      <ContentPanel>
        <ActionEmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          actionHref={links.round}
          actionLabel={t("backToRound")}
          actionVariant="secondary"
        />
      </ContentPanel>
    )
  }

  const confirmPath = `/${locale}/audit/rounds/${roundId}/confirm`
  const tabItems = inspectionConfirmTabs.map((key) => ({
    key,
    label: t(`tab_${key}`),
    count: formatCount(counts[key]),
    href: `${confirmPath}?tab=${key}`,
  }))
  const columnCount = canConfirm ? 6 : 5

  return (
    <section className="space-y-4">
      <TabNav aria-label={t("title")} items={tabItems} current={tab} />

      {!canConfirm ? <Notice tone="info">{t("noEditNotice")}</Notice> : null}

      {tab === "awaitingReview" && rows.length > 0 ? (
        <Notice tone="warning" action={<Link href={links.pendingFindings} className={bannerLinkClasses}>{t("awaitingReviewLink")}</Link>}>
          {t("awaitingReviewBanner")}
        </Notice>
      ) : null}
      {tab === "notScanned" && rows.length > 0 ? (
        <Notice tone="warning" action={<Link href={links.pendingItems} className={bannerLinkClasses}>{t("notScannedLink")}</Link>}>
          {t("notScannedBanner")}
        </Notice>
      ) : null}
      {/* Plan 4 replaces this note with the damaged and not-found actions. */}
      {(tab === "damaged" || tab === "notFound") && rows.length > 0 ? <Notice tone="neutral">{t("laterTabNote")}</Notice> : null}

      <ContentPanel divided flush>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {rows.length === 0 ? (
            <ActionEmptyState title={t("emptyTabTitle")} />
          ) : (
            rows.map((row) => <InspectionRowCard key={row.assetId} locale={locale} row={row} canConfirm={canConfirm} statusLabels={statusLabels} />)
          )}
        </div>
        <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t(`tab_${tab}`)} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              {canConfirm ? <DataTableHead className="w-10" hideLabel>{t("selectAll")}</DataTableHead> : null}
              <DataTableHead>{t("col_asset")}</DataTableHead>
              <DataTableHead>{t("col_result")}</DataTableHead>
              <DataTableHead>{t("col_location")}</DataTableHead>
              <DataTableHead>{t("col_holder")}</DataTableHead>
              <DataTableHead>{t("col_target")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {rows.length === 0 ? (
              <TableEmptyRow colSpan={columnCount} emptyState={{ title: t("emptyTabTitle") }} />
            ) : (
              rows.map((row) => <InspectionTableRow key={row.assetId} locale={locale} row={row} canConfirm={canConfirm} statusLabels={statusLabels} />)
            )}
          </DataTableBody>
        </DataTable>
      </ContentPanel>
    </section>
  )
}
