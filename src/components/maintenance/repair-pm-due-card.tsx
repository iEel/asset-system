import Link from "next/link"
import { useTranslations } from "next-intl"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTableFoot } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { pmCardFootLink, type PmCardRowView } from "@/lib/repair-list-view"
import { cn, formatDate } from "@/lib/utils"

// The repair list's PM card (group 5 spec §11.2, plan 5 G5P5-R7): the reminder set (overdue and due within 7 days),
// longest overdue first, 3 rows. Server-safe (no "use client"). It always renders, so #pm-due always lands. A row is the
// title with its due badge and "<asset name> · <tag>"; its only action is บันทึกว่าทำแล้ว (create), or the link to the
// asset's open record when there is one, since a new record would be refused. The foot links to the PM page filtered to
// the list it names (decision 6).
export function RepairPmDueCard({ rows, overdue, week, locale, returnTo, canCreate }: {
  rows: PmCardRowView[]
  overdue: number
  week: number
  locale: string
  returnTo: string
  canCreate: boolean
}) {
  const t = useTranslations("repairRecord")
  const tPage = useTranslations("maintenancePage")
  const total = overdue + week
  const footLink = pmCardFootLink(overdue, week)

  return (
    <ContentPanel
      id="pm-due"
      divided
      flush
      className="scroll-mt-6"
      title={t("pmDueTitle")}
      description={total > 0 ? t("pmDueHelp", { overdue: formatCount(overdue), soon: formatCount(week) }) : undefined}
      actions={<StatusBadge label={t("pmDueCount", { count: formatCount(total) })} tone={overdue > 0 ? "danger" : total > 0 ? "warning" : "muted"} />}
    >
      {rows.length === 0 ? (
        <EmptyNote padded>{t("pmDueEmpty")}</EmptyNote>
      ) : (
        <ContentPanelRows>
          {rows.map((row) => (
            <li key={row.id} data-pm-due-row={row.id} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 break-words text-sm font-medium text-foreground">{row.title}</span>
                  <StatusBadge
                    label={row.badge.kind === "overdue" ? t("pmOverdue", { days: row.badge.days }) : t("pmDueOn", { date: formatDate(row.badge.date) })}
                    tone={row.badge.kind === "overdue" ? "danger" : "warning"}
                  />
                </div>
                <div className="mt-1 break-words text-meta text-muted-foreground">
                  {row.assetName} · <span className="tag">{row.assetTag}</span>
                </div>
              </div>
              {row.openRecord ? (
                <Link href={appendOperationalReturnTo(`/${locale}/maintenance/${row.openRecord.id}`, returnTo)} className={cn(linkVariants(), "inline-flex min-h-11 shrink-0 items-center md:min-h-0")}>
                  {tPage("pmOpenRecord", { repairNo: row.openRecord.repairNo })}
                </Link>
              ) : canCreate ? (
                <Link href={appendOperationalReturnTo(`/${locale}/maintenance/new?planId=${row.id}`, returnTo)} className={cn(buttonVariants(), "shrink-0")}>
                  {t("pmRecordDone")}
                </Link>
              ) : null}
            </li>
          ))}
        </ContentPanelRows>
      )}
      {footLink ? (
        <DataTableFoot className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span>{t("shownOfTotal", { shown: formatCount(rows.length), total: formatCount(total) })}</span>
          <Link href={`/${locale}/maintenance/pm?due=${footLink.due}`} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
            {t(footLink.due === "overdue" ? "pmDueOverdueLink" : "pmDueWeekLink", { count: formatCount(footLink.count) })}
          </Link>
        </DataTableFoot>
      ) : null}
    </ContentPanel>
  )
}
