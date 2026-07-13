import Link from "next/link"
import type React from "react"
import type { Prisma } from "@prisma/client"
import { notFound, redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import { CheckCircle2, ClipboardList, FileCheck2, History, RotateCcw, XCircle } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import {
  approvalDecisionFilters,
  approvalDecisionModuleFilters,
  buildApprovalDecisionLogItems,
  filterApprovalDecisionLogItems,
  parseApprovalDecisionFilter,
  parseApprovalDecisionModuleFilter,
  summarizeApprovalDecisionLog,
  type ApprovalDecision,
  type ApprovalDecisionFilter,
  type ApprovalDecisionLogItem,
  type ApprovalDecisionModuleFilter,
} from "@/lib/approval-decision-log"
import { getApprovalInboxAccess } from "@/lib/approval-inbox-query"
import { prisma } from "@/lib/db"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

type ApprovalHistoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[]; decision?: string | string[] }>
}

export default async function ApprovalHistoryPage({ params, searchParams }: ApprovalHistoryPageProps) {
  const { locale } = await params
  const query = await searchParams
  const user = await getSessionUser()
  if (!user) redirect(`/${locale}/login`)

  const access = getApprovalInboxAccess(user)
  if (!access.canAnyApproval) notFound()

  const t = await getTranslations("approvalHistoryPage")
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}
  const translateLog = (key: string) => systemLogMessages[key.replaceAll(".", "_")] ?? key

  const logs = await prisma.systemLog.findMany({
    where: { OR: getAllowedDecisionWhere(access) },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  })
  const recordLabels = await buildSystemLogRecordLabels(logs)
  const items = buildApprovalDecisionLogItems(logs, recordLabels, locale, translateLog)
  const summary = summarizeApprovalDecisionLog(items)
  const activeModule = parseApprovalDecisionModuleFilter(query.module)
  const activeDecision = parseApprovalDecisionFilter(query.decision)
  const filteredItems = filterApprovalDecisionLogItems(items, activeModule, activeDecision)

  const moduleOptions = approvalDecisionModuleFilters.map((filter) => ({
    key: filter,
    label: t(`filter_module_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))
  const decisionOptions = approvalDecisionFilters.map((filter) => ({
    key: filter,
    label: t(`filter_decision_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/admin/approvals`}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          <FileCheck2 className="h-4 w-4" />
          {t("backToInbox")}
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard label={t("total")} value={summary.total} tone={summary.total > 0 ? "primary" : "muted"} icon={<History className="h-5 w-5" />} />
        <SummaryCard label={t("approved")} value={summary.approve} tone="success" icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard label={t("rejected")} value={summary.reject} tone="danger" icon={<XCircle className="h-5 w-5" />} />
        <SummaryCard label={t("closed")} value={summary.close + summary.execute} tone="warning" icon={<ClipboardList className="h-5 w-5" />} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-foreground">{t("filterTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("filterDescription")}</p>
          </div>
          <FilterGroup
            label={t("moduleFilter")}
            options={moduleOptions}
            activeModule={activeModule}
            activeDecision={activeDecision}
            locale={locale}
            param="module"
          />
          <FilterGroup
            label={t("decisionFilter")}
            options={decisionOptions}
            activeModule={activeModule}
            activeDecision={activeDecision}
            locale={locale}
            param="decision"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("timelineTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("timelineDescription")}</p>
          </div>
          <div className="text-sm font-medium text-muted-foreground">{t("filteredCount", { count: filteredItems.length })}</div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-5">
            <ActionEmptyState
              icon={<History className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <DecisionRow key={item.id} item={item} labels={{ actor: t("actor"), decidedAt: t("decidedAt"), viewDetails: t("viewDetails"), remark: t("remark"), field: t("field"), before: t("before"), after: t("after") }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FilterGroup({
  label,
  options,
  activeModule,
  activeDecision,
  locale,
  param,
}: {
  label: string
  options: Array<{ key: ApprovalDecisionModuleFilter | ApprovalDecisionFilter; label: string; count: number }>
  activeModule: ApprovalDecisionModuleFilter
  activeDecision: ApprovalDecisionFilter
  locale: string
  param: "module" | "decision"
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip
            key={option.key}
            href={buildFilterHref(locale, activeModule, activeDecision, param, option.key)}
            active={param === "module" ? activeModule === option.key : activeDecision === option.key}
            label={option.label}
            count={option.count}
          />
        ))}
      </div>
    </div>
  )
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-foreground">{count.toLocaleString("th-TH")}</span>
    </Link>
  )
}

function DecisionRow({
  item,
  labels,
}: {
  item: ApprovalDecisionLogItem
  labels: {
    actor: string
    decidedAt: string
    viewDetails: string
    remark: string
    field: string
    before: string
    after: string
  }
}) {
  return (
    <article className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-1 rounded-md border p-2 ${decisionClass(item.decision)}`}>{decisionIcon(item.decision)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{item.moduleLabel}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${decisionPillClass(item.decision)}`}>{item.actionLabel}</span>
              {item.href ? (
                <Link href={item.href} className="font-semibold text-primary hover:underline">
                  {item.recordLabel}
                </Link>
              ) : (
                <h3 className="font-semibold text-foreground">{item.recordLabel}</h3>
              )}
            </div>
            <p className="mt-1 text-sm text-foreground">{item.summary}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{labels.actor}: {item.actorLabel}</span>
              <span>{labels.decidedAt}: {formatDateTime(item.createdAt)}</span>
            </div>
          </div>
        </div>

        {(item.changes.length > 0 || item.remark) ? (
          <details className="shrink-0 lg:w-[28rem]">
            <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">{labels.viewDetails}</summary>
            <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3">
              {item.changes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="pb-1 pr-3 text-left font-medium">{labels.field}</th>
                        <th className="pb-1 pr-3 text-left font-medium">{labels.before}</th>
                        <th className="pb-1 text-left font-medium">{labels.after}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {item.changes.map((change, index) => (
                        <tr key={`${item.id}-${change.field}-${index}`}>
                          <td className="py-1.5 pr-3 text-foreground">{change.field}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{change.before}</td>
                          <td className="py-1.5 text-foreground">{change.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {item.remark ? (
                <p className="text-xs">
                  <span className="font-medium text-foreground">{labels.remark}:</span> {item.remark}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  )
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: "primary" | "success" | "danger" | "warning" | "muted"
  icon: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function buildFilterHref(
  locale: string,
  activeModule: ApprovalDecisionModuleFilter,
  activeDecision: ApprovalDecisionFilter,
  param: "module" | "decision",
  value: ApprovalDecisionModuleFilter | ApprovalDecisionFilter
) {
  const moduleFilterValue = param === "module" ? value : activeModule
  const decision = param === "decision" ? value : activeDecision
  const query = new URLSearchParams()
  if (moduleFilterValue !== "all") query.set("module", moduleFilterValue)
  if (decision !== "all") query.set("decision", decision)
  const queryString = query.toString()
  return `/${locale}/admin/approvals/history${queryString ? `?${queryString}` : ""}`
}

function getAllowedDecisionWhere(access: ReturnType<typeof getApprovalInboxAccess>): Prisma.SystemLogWhereInput[] {
  const conditions: Prisma.SystemLogWhereInput[] = []
  if (access.canApproveDisposal) conditions.push({ module: "disposal", action: { in: ["approve", "reject", "execute", "execute_historical_without_evidence"] } })
  if (access.canCloseMaintenance) conditions.push({ module: "maintenance", action: "close" })
  if (access.canApproveAudit) conditions.push({ module: "audit", action: { in: ["approve_finding", "reject_finding", "close"] } })
  return conditions
}

function decisionIcon(decision: ApprovalDecision): React.ReactNode {
  if (decision === "approve") return <CheckCircle2 className="h-4 w-4" />
  if (decision === "reject") return <XCircle className="h-4 w-4" />
  if (decision === "execute") return <RotateCcw className="h-4 w-4" />
  return <ClipboardList className="h-4 w-4" />
}

function decisionClass(decision: ApprovalDecision) {
  if (decision === "approve") return "border-success/30 bg-success/5 text-success"
  if (decision === "reject") return "border-danger/30 bg-danger/5 text-danger"
  if (decision === "execute") return "border-primary/30 bg-primary/5 text-primary"
  return "border-warning/30 bg-warning/5 text-warning"
}

function decisionPillClass(decision: ApprovalDecision) {
  if (decision === "approve") return "bg-success/10 text-success"
  if (decision === "reject") return "bg-danger/10 text-danger"
  if (decision === "execute") return "bg-primary/10 text-primary"
  return "bg-warning/10 text-warning"
}

function summaryClass(tone: "primary" | "success" | "danger" | "warning" | "muted") {
  if (tone === "primary") return "border-primary/30 bg-primary/5 text-primary"
  if (tone === "success") return "border-success/30 bg-success/5 text-success"
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  return "border-border bg-surface text-muted-foreground"
}
