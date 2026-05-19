import Link from "next/link"
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ClipboardCheck, FileCheck2, ShieldCheck, Trash2, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { buildApprovalInboxItems, summarizeApprovalInbox, type ApprovalInboxItem } from "@/lib/approval-inbox"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

type ApprovalInboxPageProps = {
  params: Promise<{ locale: string }>
}

type ReadyAuditRound = {
  id: string
  auditNo: string
  name: string
  createdBy: string
  updatedAt: Date
}

export default async function ApprovalInboxPage({ params }: ApprovalInboxPageProps) {
  const { locale } = await params
  const user = await getSessionUser()
  if (!user) redirect(`/${locale}/login`)

  const canApproveDisposal = hasPermission(user, "disposal", "approve")
  const canCloseMaintenance = hasPermission(user, "maintenance", "edit")
  const canApproveAudit = hasPermission(user, "audit", "approve")
  if (!canApproveDisposal && !canCloseMaintenance && !canApproveAudit) notFound()

  const t = await getTranslations("approvalInboxPage")
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [...workflowApprovalSettingKeys] } },
    select: { key: true, value: true },
  })
  const policy = parseWorkflowApprovalPolicy(settings)

  const [disposalRequests, maintenanceTickets, auditFindings, auditRoundsReadyToClose] = await Promise.all([
    canApproveDisposal && policy.disposalRequired
      ? prisma.disposalRequest.findMany({
          where: { isActive: true, requestStatus: "pending" },
          include: {
            asset: { select: { assetTag: true, name: true } },
            requestedBy: { select: { code: true, fullNameTh: true } },
          },
          orderBy: { requestDate: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    canCloseMaintenance && policy.maintenanceCloseRequired
      ? prisma.maintenanceTicket.findMany({
          where: { isActive: true, repairStatus: "completed" },
          include: {
            asset: { select: { assetTag: true, name: true } },
            reportedBy: { select: { code: true, fullNameTh: true } },
          },
          orderBy: { updatedAt: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    canApproveAudit
      ? prisma.auditFinding.findMany({
          where: { reviewStatus: "pending", reportedBy: { not: user.id } },
          include: {
            auditRound: { select: { auditNo: true } },
            asset: { select: { assetTag: true } },
          },
          orderBy: { reportedAt: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    canApproveAudit && policy.auditCloseRequired
      ? getAuditRoundsReadyToClose(user.id)
      : Promise.resolve([]),
  ])

  const items = buildApprovalInboxItems({
    locale,
    policy,
    disposalRequests: disposalRequests.map((request) => ({
      id: request.id,
      disposalNo: request.disposalNo,
      assetTag: request.asset.assetTag,
      assetName: request.asset.name,
      requestedBy: `${request.requestedBy.code} - ${request.requestedBy.fullNameTh}`,
      requestDate: request.requestDate,
    })),
    maintenanceTickets: maintenanceTickets.map((ticket) => ({
      id: ticket.id,
      repairNo: ticket.repairNo,
      assetTag: ticket.asset.assetTag,
      assetName: ticket.asset.name,
      reportedBy: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`,
      updatedAt: ticket.updatedAt,
    })),
    auditFindings: auditFindings.map((finding) => ({
      id: finding.id,
      auditNo: finding.auditRound.auditNo,
      findingType: finding.findingType,
      assetTag: finding.asset?.assetTag ?? null,
      reportedBy: finding.reportedBy,
      reportedAt: finding.reportedAt,
    })),
    auditRoundsReadyToClose,
  })
  const summary = summarizeApprovalInbox(items)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/admin/settings`}
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          {t("openPolicySettings")}
        </Link>
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
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <PolicyBadge label={t("policyDisposal")} enabled={policy.disposalRequired && canApproveDisposal} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <PolicyBadge label={t("policyMaintenance")} enabled={policy.maintenanceCloseRequired && canCloseMaintenance} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <PolicyBadge label={t("policyAuditClose")} enabled={policy.auditCloseRequired && canApproveAudit} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("minApprovers")}</div>
              <div className="font-semibold text-foreground">
                {policy.minApprovers} / {policy.segregationRequired ? t("sodOn") : t("sodOff")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border p-5">
          <h2 className="font-semibold text-foreground">{t("queueTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("queueDescription")}</p>
        </div>
        {items.length === 0 ? (
          <div className="p-5">
            <ActionEmptyState
              icon={<FileCheck2 className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <ApprovalInboxRow key={item.id} item={item} locale={locale} labels={{ requestedBy: t("requestedBy"), requestedAt: t("requestedAt") }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

async function getAuditRoundsReadyToClose(currentUserId: string): Promise<ReadyAuditRound[]> {
  const rounds = await prisma.auditRound.findMany({
    where: { isActive: true, status: { not: "closed" }, createdBy: { not: currentUserId } },
    select: { id: true, auditNo: true, name: true, createdBy: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })
  const roundIds = rounds.map((round) => round.id)
  if (roundIds.length === 0) return []

  const [pendingItems, pendingFindings, openActions] = await Promise.all([
    prisma.auditItem.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, auditStatus: "pending" },
      _count: { _all: true },
    }),
    prisma.auditFinding.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, reviewStatus: "pending" },
      _count: { _all: true },
    }),
    prisma.auditFinding.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, actionStatus: { in: ["planned", "in_progress", "done"] } },
      _count: { _all: true },
    }),
  ])

  const blockedRoundIds = new Set<string>()
  for (const row of [...pendingItems, ...pendingFindings, ...openActions]) {
    if (row._count._all > 0) blockedRoundIds.add(row.auditRoundId)
  }

  return rounds.filter((round) => !blockedRoundIds.has(round.id))
}

function ApprovalInboxRow({
  item,
  locale,
  labels,
}: {
  item: ApprovalInboxItem
  locale: string
  labels: { requestedBy: string; requestedAt: string }
}) {
  return (
    <Link href={item.href} className="block p-5 transition-colors hover:bg-accent">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-1 rounded-md border p-2 ${toneClass(item.tone)}`}>{kindIcon(item.kind)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pillClass(item.tone)}`}>{moduleLabel(item.module, locale)}</span>
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
