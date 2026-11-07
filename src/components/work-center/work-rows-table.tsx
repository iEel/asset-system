import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { RowActions, type RowActionGroup } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
import { cn, formatDate } from "@/lib/utils"
import type { WaitingWorkCounts } from "@/lib/waiting-work-rules"
import type { WorkRow, WorkRowMenuKey } from "@/lib/work-center-row-data"
import { WORK_SHOW_MAX, WORK_SHOW_STEP, type WorkRowUrgency } from "@/lib/work-center-rows"
import { buildWorkCenterHref, type WorkCenterParams } from "@/lib/work-center-view"
import type { WorkQueue, WorkQueueSummary } from "@/lib/work-queues"

// The urgency by shape, never color alone (diamond, triangle, dot), with its word for screen readers.
const urgencyTones: Record<WorkRowUrgency, "danger" | "warning" | "primary"> = { overdue: "danger", todo: "warning", ready: "primary" }
const URGENCIES: readonly WorkRowUrgency[] = ["overdue", "todo", "ready"]

// The page each queue tab links to, named by its destination.
const sourceHrefs: Record<WorkQueue, (locale: string) => string> = {
  approvals: (locale) => `/${locale}/admin/approvals`,
  maintenance: (locale) => `/${locale}/maintenance`,
  audit: (locale) => `/${locale}/audit/findings`,
  disposal: (locale) => `/${locale}/disposal`,
}

const emptyKeys: Record<WorkQueue | "overview", string> = {
  overview: "noBacklog",
  approvals: "noApprovalInboxIssues",
  maintenance: "noMaintenanceIssues",
  audit: "noAuditIssues",
  disposal: "noDisposalIssues",
}

// Rows that read "รอ" (a decision or a record someone waits on); the others read "ค้าง".
const waitingKinds = new Set<WorkRow["kind"]>(["approvedDisposal", "pendingDisposal", "pendingFinding"])
const requestKinds = new Set<WorkRow["kind"]>(["disposalApproval", "approvedDisposal", "pendingDisposal"])

type Translate = (key: string, values?: Record<string, string | number>) => string

// Board WC, spec §4.2: one ranked table (overdue first by days overdue, then the oldest), on the overview across the
// four queues and on a queue tab filtered to it with the queue's parts line and its source page. Each row: the urgency
// dot, the work (name; tag · document; context), queue · type, the age and deadline lines, the next step and ⋯.
// Under it the legend, "แสดง n จาก m" and แสดงเพิ่ม (show + 8, a link) while rows are left and fewer than 200 show.
export function WorkRowsTable({
  locale,
  params,
  summary,
  counts,
  table,
}: {
  locale: string
  params: WorkCenterParams
  summary: WorkQueueSummary
  counts: WaitingWorkCounts
  table: { rows: WorkRow[]; total: number; show: number }
}) {
  const t = useTranslations("workCenter")
  const tRoot = useTranslations()
  const tNotifications = useTranslations("notifications")
  const queue = params.panel === "overview" || params.panel === "assets" ? null : params.panel
  const { rows, total } = table
  const shown = rows.length
  const moreCount = shown < total && shown < WORK_SHOW_MAX ? Math.min(WORK_SHOW_STEP, total - shown) : 0
  const queueEntry = queue ? summary.queues.find((entry) => entry.queue === queue) ?? null : null

  let partsLine: string | null = null
  if (queue === "approvals" && summary.approvalParts) {
    partsLine = t("parts.approvals", { disposal: summary.approvalParts.disposal, mismatches: summary.approvalParts.audit, rounds: summary.approvalParts.round })
  } else if (queueEntry && queue !== "approvals") {
    partsLine = queueEntry.keys
      .map((key) => `${tNotifications(key)} ${formatCount(counts[key] ?? 0)}`)
      .join(" · ")
  }

  const menuLabel = (row: WorkRow, key: WorkRowMenuKey) =>
    key === "openRecord" && requestKinds.has(row.kind) ? t("menu.openRequest") : t(`menu.${key}`)
  const menuGroups = (row: WorkRow): RowActionGroup[] => [
    {
      key: "open",
      items: row.menu.map((item) => ({ kind: "link", key: item.key, label: menuLabel(row, item.key), href: item.href })),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {queueEntry ? (
          <h2 className="text-base font-semibold text-foreground md:hidden">
            {t(`queue.${queueEntry.queue}`)} <span className="num">{formatCount(queueEntry.count)}</span>
          </h2>
        ) : null}
        {queue ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-meta">
            {partsLine ? <p className="num text-muted-foreground">{partsLine}</p> : null}
            <Link href={sourceHrefs[queue](locale)} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
              {t(`goTo.${queue}`)}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        ) : <span />}
        <p className="text-meta text-muted-foreground max-md:hidden">{t("table.sortNote")}</p>
      </div>

      <DataTable
        className="hidden md:block"
        caption={t("table.caption")}
        minWidth={880}
        footer={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>{t("table.shown", { shown, total })}</span>
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              {URGENCIES.map((urgency) => (
                <span key={urgency} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className={statusMarkerVariants({ tone: urgencyTones[urgency] })} />
                  {t(`urgency.${urgency}`)}
                </span>
              ))}
            </span>
            {moreCount > 0 ? (
              <Link
                href={buildWorkCenterHref(locale, params, { show: params.show + WORK_SHOW_STEP })}
                scroll={false}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ms-auto")}
              >
                {t("table.showMoreRows", { count: moreCount })}
              </Link>
            ) : null}
          </div>
        }
      >
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-44" />
          <col className="w-40" />
          <col className="w-48" />
        </colgroup>
        <DataTableHeader>
          <tr>
            <DataTableHead hideLabel>{t("table.urgency")}</DataTableHead>
            <DataTableHead>{t("table.work")}</DataTableHead>
            <DataTableHead>{t("table.queueKind")}</DataTableHead>
            <DataTableHead>{t("table.age")}</DataTableHead>
            <DataTableHead align="right">{t("table.nextStep")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={5} tone="clear">{t(emptyKeys[queue ?? "overview"])}</TableEmptyRow>
          ) : (
            rows.map((row) => {
              const age = ageLines(t, row)
              return (
                <DataTableRow key={`${row.kind}:${row.id}`}>
                  <DataTableCell>
                    <span className="flex h-5 items-center">
                      <span aria-hidden="true" className={statusMarkerVariants({ tone: urgencyTones[row.urgency] })} />
                      <span className="sr-only">{t(`urgency.${row.urgency}`)}</span>
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <p className="font-semibold break-words text-foreground">{row.title}</p>
                    <p className="text-meta text-muted-foreground">
                      {[row.assetTag, row.documentNo].some(Boolean) ? (
                        <span className="tag">{[row.assetTag, row.documentNo].filter(Boolean).join(" · ")}</span>
                      ) : null}
                      {row.context ? (
                        <>
                          {row.assetTag || row.documentNo ? " · " : null}
                          {tRoot(row.context.key, row.context.values)}
                        </>
                      ) : null}
                    </p>
                  </DataTableCell>
                  <DataTableCell>
                    <p className="text-foreground">{t(`queue.${row.queue}`)}</p>
                    <p className="text-meta text-muted-foreground">{t(`kind.${row.kind}`)}</p>
                  </DataTableCell>
                  <DataTableCell className="num">
                    <p className="text-foreground">{age.first}</p>
                    <p className={cn("text-meta", age.alert ? "font-medium text-danger" : "text-muted-foreground")}>{age.second}</p>
                  </DataTableCell>
                  <DataTableCell>
                    <RowActions
                      code={row.documentNo ?? row.assetTag ?? row.number}
                      name={row.title}
                      menuLabel={t("table.menuLabel", { code: row.documentNo ?? row.assetTag ?? row.number })}
                      next={{ label: tRoot(row.nextStep.labelKey), href: row.nextStep.href }}
                      groups={menuGroups(row)}
                    />
                  </DataTableCell>
                </DataTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>

      {/* Board WC-Phone: below md each row is a card: the urgency mark, the title (2 lines), tag · document, type ·
          context, the age lines, ⋯ in the corner (a bottom sheet) and the next step full width at 44px. */}
      <ul data-slot="work-center-cards" className="grid gap-2.5 md:hidden">
        {rows.length === 0 ? (
          <li className="rounded-lg border border-border bg-surface">
            <EmptyNote tone="clear" padded>{t(emptyKeys[queue ?? "overview"])}</EmptyNote>
          </li>
        ) : (
          rows.map((row) => {
            const age = ageLines(t, row)
            const codes = [row.assetTag, row.documentNo].filter(Boolean).join(" · ")
            return (
              <li key={`${row.kind}:${row.id}`} className="min-w-0 rounded-lg border border-border bg-surface py-3 ps-3.5 pe-2">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 flex shrink-0 items-center">
                    <span aria-hidden="true" className={statusMarkerVariants({ tone: urgencyTones[row.urgency] })} />
                    <span className="sr-only">{t(`urgency.${row.urgency}`)}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 break-words text-base font-semibold text-foreground">{row.title}</h3>
                    {codes ? (
                      <p className="break-all text-xs text-muted-foreground">
                        <span className="tag">{codes}</span>
                      </p>
                    ) : null}
                    <p className="mt-0.5 break-words text-meta text-muted-foreground">
                      {t(`kind.${row.kind}`)}
                      {row.context ? ` · ${tRoot(row.context.key, row.context.values)}` : null}
                    </p>
                    <p className="mt-1.5 text-meta num text-foreground">{age.first}</p>
                    <p className={cn("text-meta num", age.alert ? "font-medium text-danger" : "text-muted-foreground")}>{age.second}</p>
                  </div>
                  <RowActions
                    menu="sheet"
                    code={row.documentNo ?? row.assetTag ?? row.number}
                    name={row.title}
                    menuLabel={t("table.menuLabel", { code: row.documentNo ?? row.assetTag ?? row.number })}
                    groups={menuGroups(row)}
                    className="-mt-1.5 shrink-0"
                  />
                </div>
                <div className="pe-1.5">
                  <Link href={row.nextStep.href} className={cn(buttonVariants({ size: "md" }), "mt-2.5 min-h-11 w-full")}>
                    {tRoot(row.nextStep.labelKey)}
                    <span className="sr-only"> {row.documentNo ?? row.assetTag ?? row.number}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </li>
            )
          })
        )}
      </ul>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-meta text-muted-foreground md:hidden">
        <span className="num">{t("table.shown", { shown, total })}</span>
        {moreCount > 0 ? (
          <Link
            href={buildWorkCenterHref(locale, params, { show: params.show + WORK_SHOW_STEP })}
            scroll={false}
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "ms-auto")}
          >
            {t("table.showMoreRows", { count: moreCount })}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

// The ค้าง column's two lines (spec §4.2): approval rows wait against the SLA; rows with a due date count to it; the
// rest count from their since date.
function ageLines(t: Translate, row: WorkRow): { first: string; second: string; alert: boolean } {
  if (row.queue === "approvals") {
    return {
      first: t("age.waiting", { days: row.ageDays }),
      second: row.overdueDays > 0 ? t("deadline.overSla", { days: row.overdueDays }) : t("deadline.since", { date: formatDate(row.since) }),
      alert: row.overdueDays > 0,
    }
  }
  if (row.deadline && row.dueInDays !== null) {
    return {
      first: t("age.due", { date: formatDate(row.deadline) }),
      second: row.overdueDays > 0 ? t("deadline.overdue", { days: row.overdueDays }) : t("deadline.dueIn", { days: row.dueInDays }),
      alert: row.overdueDays > 0,
    }
  }
  return {
    first: t(waitingKinds.has(row.kind) ? "age.waiting" : "age.pending", { days: row.ageDays }),
    second: t("deadline.since", { date: formatDate(row.since) }),
    alert: false,
  }
}
