import Link from "next/link"
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ClipboardCheck, FileCheck2, History, ShieldCheck, Trash2, Wrench } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalAgeStatus, sortApprovalInboxItemsByAge } from "@/lib/approval-aging"
import { approvalInboxFilters, filterApprovalInboxItems, parseApprovalInboxFilter, type ApprovalInboxFilter } from "@/lib/approval-inbox-filter"
import { getApprovalInboxSnapshot } from "@/lib/approval-inbox-query"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

type ApprovalInboxPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[] }>
}

export default async function ApprovalInboxPage({ params, searchParams }: ApprovalInboxPageProps) {
  const { locale } = await params
  const query = await searchParams
  const user = await getSessionUser()
  if (!user) redirect(`/${locale}/login`)

  const snapshot = await getApprovalInboxSnapshot(user, locale)
  if (!snapshot.access.canAnyApproval) notFound()

  const t = await getTranslations("approvalInboxPage")
  const { access, policy, items, summary } = snapshot
  const sortedItems = sortApprovalInboxItemsByAge(items, policy.slaDays)
  const activeFilter = parseApprovalInboxFilter(query.module)
  const filteredItems = filterApprovalInboxItems(sortedItems, activeFilter)
  const filterOptions: Array<{ key: ApprovalInboxFilter; label: string; count: number }> = approvalInboxFilters.map((filter) => ({
    key: filter,
    label: t(`filter_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/approvals/history`}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <History className="h-4 w-4" />
            {t("openDecisionHistory")}
          </Link>
          <Link
            href={`/${locale}/admin/settings`}
            className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t("openPolicySettings")}
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard label={t("total")} value={summary.total} tone={summary.total > 0 ? "danger" : "success"} />
        <SummaryCard label={t("disposal")} value={summary.disposal} tone={summary.disposal > 0 ? "danger" : "muted"} />
        <SummaryCard label={t("maintenance")} value={summary.maintenance} tone={summary.maintenance > 0 ? "warning" : "muted"} />
        <SummaryCard label={t("audit")} value={summary.audit} tone={summary.audit > 0 ? "warning" : "muted"} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("policyTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("policyDescription")}</p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <PolicyBadge label={t("policyDisposal")} enabled={policy.disposalRequired && access.canApproveDisposal} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <PolicyBadge label={t("policyMaintenance")} enabled={policy.maintenanceCloseRequired && access.canCloseMaintenance} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <PolicyBadge label={t("policyAuditClose")} enabled={policy.auditCloseRequired && access.canApproveAudit} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("minApprovers")}</div>
              <div className="font-semibold text-foreground">
                {policy.minApprovers} / {policy.segregationRequired ? t("sodOn") : t("sodOff")}
              </div>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("approvalSla")}</div>
              <div className="font-semibold text-foreground">{t("slaDays", { days: policy.slaDays })}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{t("queueTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("queueDescription")}</p>
            </div>
            <div className="text-sm font-medium text-muted-foreground">{t("filteredCount", { count: filteredItems.length })}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <FilterChip
                key={filter.key}
                href={filter.key === "all" ? `/${locale}/admin/approvals` : `/${locale}/admin/approvals?module=${filter.key}`}
                active={activeFilter === filter.key}
                label={filter.label}
                count={filter.count}
              />
            ))}
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div className="p-5">
            <ActionEmptyState
              icon={<FileCheck2 className="h-6 w-6" />}
              title={items.length === 0 ? t("emptyTitle") : t("emptyFilterTitle")}
              description={items.length === 0 ? t("emptyDescription") : t("emptyFilterDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <ApprovalInboxRow
                key={item.id}
                item={item}
                locale={locale}
                slaDays={policy.slaDays}
                labels={{
                  requestedBy: t("requestedBy"),
                  requestedAt: t("requestedAt"),
                  waitingDays: (days) => t("waitingDays", { days }),
                  overdueDays: (days) => t("overdueDays", { days }),
                }}
              />
            ))}
          </div>
        )}
      </section>
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

function ApprovalInboxRow({
  item,
  locale,
  slaDays,
  labels,
}: {
  item: ApprovalInboxItem
  locale: string
  slaDays: number
  labels: {
    requestedBy: string
    requestedAt: string
    waitingDays: (days: number) => string
    overdueDays: (days: number) => string
  }
}) {
  const ageStatus = getApprovalAgeStatus(item.requestedAt, new Date(), slaDays)
  return (
    <Link href={item.href} className="block p-5 transition-colors hover:bg-accent">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-1 rounded-md border p-2 ${toneClass(item.tone)}`}>{kindIcon(item.kind)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pillClass(item.tone)}`}>{moduleLabel(item.module, locale)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ageStatus.isOverdue ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"}`}>
                {ageStatus.isOverdue ? labels.overdueDays(ageStatus.daysOverdue) : labels.waitingDays(ageStatus.ageDays)}
              </span>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{labels.requestedBy}: {item.requestedBy || "-"}</span>
              <span>{labels.requestedAt}: {formatDateTime(item.requestedAt)}</span>
            </div>
          </div>
        </div>
        <div className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground">
          {item.actionLabel}
        </div>
      </div>
    </Link>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "danger" | "warning" | "success" | "muted"
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        <FileCheck2 className="h-5 w-5 text-current" />
      </div>
    </div>
  )
}

function PolicyBadge({
  label,
  enabled,
  enabledLabel,
  disabledLabel,
}: {
  label: string
  enabled: boolean
  enabledLabel: string
  disabledLabel: string
}) {
  return (
    <div className={`rounded-md border px-3 py-2 ${enabled ? "border-success/30 bg-success/5" : "border-border bg-background"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${enabled ? "text-success" : "text-muted-foreground"}`}>
        {enabled ? enabledLabel : disabledLabel}
      </div>
    </div>
  )
}

function kindIcon(kind: ApprovalInboxItem["kind"]): React.ReactNode {
  if (kind === "disposal_review") return <Trash2 className="h-4 w-4" />
  if (kind === "maintenance_close") return <Wrench className="h-4 w-4" />
  if (kind === "audit_round_close") return <ShieldCheck className="h-4 w-4" />
  return <ClipboardCheck className="h-4 w-4" />
}

function moduleLabel(module: ApprovalInboxItem["module"], locale: string) {
  const labels = {
    th: { disposal: "ตัดจำหน่าย", maintenance: "ซ่อมบำรุง", audit: "ตรวจนับ" },
    en: { disposal: "Disposal", maintenance: "Maintenance", audit: "Audit" },
  }
  return (locale === "th" ? labels.th : labels.en)[module]
}

function toneClass(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  return "border-primary/30 bg-primary/5 text-primary"
}

function pillClass(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return "bg-danger/10 text-danger"
  if (tone === "warning") return "bg-warning/10 text-warning"
  return "bg-primary/10 text-primary"
}

function summaryClass(tone: "danger" | "warning" | "success" | "muted") {
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  if (tone === "success") return "border-success/30 bg-success/5 text-success"
  return "border-border bg-surface text-muted-foreground"
}
