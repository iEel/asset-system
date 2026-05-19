import Link from "next/link"
import type React from "react"
import { getTranslations } from "next-intl/server"
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileWarning,
  Package,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { assetMissingResponsibilityWhere, hasAssetResponsibility } from "@/lib/asset-ownership"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalInboxAccess, getApprovalInboxSnapshot } from "@/lib/approval-inbox-query"
import { buildWorkCenterMetricKeys, calculateWorkCenterUrgentCount, type WorkCenterMetricKey } from "@/lib/work-center-metrics"
import { formatDateTime } from "@/lib/utils"

type WorkCenterPageProps = {
  params: Promise<{ locale: string }>
}

type WorkCenterMetric = {
  key: WorkCenterMetricKey
  label: string
  value: number
  detail: string
  href: string
  tone: "danger" | "warning" | "primary" | "success" | "muted"
  icon: React.ReactNode
}

const openMaintenanceStatuses = ["open", "reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"]
const waitingMaintenanceStatuses = ["waiting_parts", "waiting_vendor"]
const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export default async function WorkCenterPage({ params }: WorkCenterPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "dashboard", "view")

  const t = await getTranslations("workCenter")
  const tCommon = await getTranslations("common")
  const today = startOfToday()
  const approvalInboxAccess = getApprovalInboxAccess(user)

  const [
    missingCustodian,
    missingSerial,
    missingPhoto,
    overdueMaintenance,
    waitingMaintenance,
    completedMaintenance,
    pendingAuditFindings,
    openAuditActions,
    pendingAuditItems,
    pendingDisposals,
    approvedDisposals,
    approvalInboxSnapshot,
    assetIssues,
    maintenanceItems,
    auditItems,
    disposalItems,
  ] = await Promise.all([
    prisma.asset.count({ where: { AND: [{ isActive: true }, assetMissingResponsibilityWhere] } }),
    prisma.asset.count({ where: { isActive: true, OR: [{ serialNumber: null }, { serialNumber: "" }] } }),
    prisma.asset.count({
      where: {
        isActive: true,
        ownershipType: { not: "software_license" },
        attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } },
      },
    }),
    prisma.maintenanceTicket.count({
      where: { isActive: true, repairStatus: { in: openMaintenanceStatuses }, dueDate: { lt: today } },
    }),
    prisma.maintenanceTicket.count({
      where: { isActive: true, repairStatus: { in: waitingMaintenanceStatuses } },
    }),
    prisma.maintenanceTicket.count({
      where: { isActive: true, repairStatus: "completed" },
    }),
    prisma.auditFinding.count({ where: { reviewStatus: "pending" } }),
    prisma.auditFinding.count({ where: { actionStatus: { in: ["planned", "in_progress"] } } }),
    prisma.auditItem.count({
      where: { auditStatus: "pending", auditRound: { isActive: true, status: { not: "closed" } } },
    }),
    prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "pending" } }),
    prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "approved" } }),
    approvalInboxAccess.canAnyApproval ? getApprovalInboxSnapshot(user, locale) : Promise.resolve(null),
    prisma.asset.findMany({
      where: {
        isActive: true,
        OR: [
          assetMissingResponsibilityWhere,
          { serialNumber: null },
          { serialNumber: "" },
          {
            AND: [
              { ownershipType: { not: "software_license" } },
              { attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        serialNumber: true,
        ownershipType: true,
        custodianId: true,
        departmentId: true,
        installedInLinks: { where: { status: "installed", removedAt: null }, select: { id: true }, take: 1 },
        attachments: {
          where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.maintenanceTicket.findMany({
      where: { isActive: true, repairStatus: { in: openMaintenanceStatuses }, OR: [{ dueDate: { lt: today } }, { repairStatus: { in: waitingMaintenanceStatuses } }, { repairStatus: "completed" }] },
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.auditFinding.findMany({
      where: { OR: [{ reviewStatus: "pending" }, { actionStatus: { in: ["planned", "in_progress"] } }] },
      include: {
        auditRound: { select: { id: true, auditNo: true, name: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 6,
    }),
    prisma.disposalRequest.findMany({
      where: { isActive: true, requestStatus: { in: ["pending", "approved"] } },
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: { requestDate: "asc" },
      take: 6,
    }),
  ])

  const approvalInboxCounts = approvalInboxSnapshot?.summary ?? { total: 0, disposal: 0, maintenance: 0, audit: 0 }
  const approvalInboxVisible = approvalInboxAccess.canAnyApproval
  const visibleMaintenanceItems = approvalInboxVisible && approvalInboxCounts.maintenance > 0
    ? maintenanceItems.filter((ticket) => ticket.repairStatus !== "completed")
    : maintenanceItems
  const visibleAuditItems = approvalInboxVisible && approvalInboxCounts.audit > 0
    ? auditItems.filter((finding) => finding.reviewStatus !== "pending")
    : auditItems
  const visibleDisposalItems = approvalInboxVisible && approvalInboxCounts.disposal > 0
    ? disposalItems.filter((request) => request.requestStatus !== "pending")
    : disposalItems

  const metricMap: Record<WorkCenterMetricKey, WorkCenterMetric> = {
    approvalInbox: {
      key: "approvalInbox",
      label: t("approvalInbox"),
      value: approvalInboxCounts.total,
      detail: t("approvalInboxDetail"),
      href: `/${locale}/admin/approvals`,
      tone: approvalInboxCounts.total > 0 ? "danger" : "primary",
      icon: <FileCheck2 className="h-5 w-5" />,
    },
    missingCustodian: {
      key: "missingCustodian",
      label: t("missingCustodian"),
      value: missingCustodian,
      detail: t("missingCustodianDetail"),
      href: `/${locale}/assets`,
      tone: "warning",
      icon: <Package className="h-5 w-5" />,
    },
    missingSerial: {
      key: "missingSerial",
      label: t("missingSerial"),
      value: missingSerial,
      detail: t("missingSerialDetail"),
      href: `/${locale}/assets`,
      tone: "muted",
      icon: <FileWarning className="h-5 w-5" />,
    },
    missingPhoto: {
      key: "missingPhoto",
      label: t("missingPhoto"),
      value: missingPhoto,
      detail: t("missingPhotoDetail"),
      href: `/${locale}/assets`,
      tone: "muted",
      icon: <ShieldAlert className="h-5 w-5" />,
    },
    overdueMaintenance: {
      key: "overdueMaintenance",
      label: t("overdueMaintenance"),
      value: overdueMaintenance,
      detail: t("overdueMaintenanceDetail"),
      href: `/${locale}/maintenance?overdue=yes`,
      tone: "danger",
      icon: <Wrench className="h-5 w-5" />,
    },
    waitingMaintenance: {
      key: "waitingMaintenance",
      label: t("waitingMaintenance"),
      value: waitingMaintenance,
      detail: t("waitingMaintenanceDetail"),
      href: `/${locale}/maintenance?status=waiting_parts`,
      tone: "warning",
      icon: <Clock className="h-5 w-5" />,
    },
    completedMaintenance: {
      key: "completedMaintenance",
      label: t("completedMaintenance"),
      value: completedMaintenance,
      detail: t("completedMaintenanceDetail"),
      href: `/${locale}/maintenance?status=completed`,
      tone: "success",
      icon: <Wrench className="h-5 w-5" />,
    },
    pendingAuditFindings: {
      key: "pendingAuditFindings",
      label: t("pendingAuditFindings"),
      value: pendingAuditFindings,
      detail: t("pendingAuditFindingsDetail"),
      href: `/${locale}/audit/findings?status=pending`,
      tone: "danger",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    openAuditActions: {
      key: "openAuditActions",
      label: t("openAuditActions"),
      value: openAuditActions,
      detail: t("openAuditActionsDetail"),
      href: `/${locale}/audit/findings?status=all`,
      tone: "warning",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    pendingAuditItems: {
      key: "pendingAuditItems",
      label: t("pendingAuditItems"),
      value: pendingAuditItems,
      detail: t("pendingAuditItemsDetail"),
      href: `/${locale}/audit/rounds`,
      tone: "primary",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    pendingDisposals: {
      key: "pendingDisposals",
      label: t("pendingDisposals"),
      value: pendingDisposals,
      detail: t("pendingDisposalsDetail"),
      href: `/${locale}/disposal?status=pending`,
      tone: "danger",
      icon: <Trash2 className="h-5 w-5" />,
    },
    approvedDisposals: {
      key: "approvedDisposals",
      label: t("approvedDisposals"),
      value: approvedDisposals,
      detail: t("approvedDisposalsDetail"),
      href: `/${locale}/disposal?status=approved`,
      tone: "warning",
      icon: <Trash2 className="h-5 w-5" />,
    },
  }
  const metrics = buildWorkCenterMetricKeys({
    approvalInbox: {
      visible: approvalInboxVisible,
      ...approvalInboxCounts,
    },
  }).map((key) => metricMap[key])
  const urgentCount = calculateWorkCenterUrgentCount({
    approvalInbox: {
      visible: approvalInboxVisible,
      ...approvalInboxCounts,
    },
    overdueMaintenance,
    pendingAuditFindings,
    pendingDisposals,
    approvedDisposals,
  })
  const followUpCount = metrics.reduce((sum, metric) => sum + metric.value, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <SummaryPill label={t("urgent")} value={urgentCount} tone="danger" />
          <SummaryPill label={t("allFollowUps")} value={followUpCount} tone="primary" />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {approvalInboxVisible ? (
          <FollowUpPanel title={t("approvalInboxTitle")} subtitle={t("approvalInboxSubtitle")} href={`/${locale}/admin/approvals`} viewAllLabel={tCommon("view")}>
            {!approvalInboxSnapshot || approvalInboxSnapshot.items.length === 0 ? (
              <EmptyState label={t("noApprovalInboxIssues")} />
            ) : (
              approvalInboxSnapshot.items.slice(0, 6).map((item) => (
                <ApprovalFollowUpItem key={item.id} item={item} />
              ))
            )}
          </FollowUpPanel>
        ) : null}

        <FollowUpPanel title={t("assetDataTitle")} subtitle={t("assetDataSubtitle")} href={`/${locale}/assets`} viewAllLabel={tCommon("view")}>
          {assetIssues.length === 0 ? (
            <EmptyState label={t("noAssetDataIssues")} />
          ) : (
            assetIssues.map((asset) => {
              const issues = [
                hasAssetResponsibility(asset) ? null : t("missingCustodianShort"),
                asset.serialNumber ? null : t("missingSerialShort"),
                asset.ownershipType === "software_license" || asset.attachments.length > 0 ? null : t("missingPhotoShort"),
              ].filter((issue): issue is string => Boolean(issue))
              return (
                <FollowUpItem
                  key={asset.id}
                  href={`/${locale}/assets/${asset.id}`}
                  title={`${asset.assetTag} - ${asset.name}`}
                  meta={issues.join(" · ")}
                  tone="warning"
                />
              )
            })
          )}
        </FollowUpPanel>

        <FollowUpPanel title={t("maintenanceTitle")} subtitle={t("maintenanceSubtitle")} href={`/${locale}/maintenance?overdue=yes`} viewAllLabel={tCommon("view")}>
          {visibleMaintenanceItems.length === 0 ? (
            <EmptyState label={t("noMaintenanceIssues")} />
          ) : (
            visibleMaintenanceItems.map((ticket) => (
              <FollowUpItem
                key={ticket.id}
                href={`/${locale}/maintenance/${ticket.id}`}
                title={`${ticket.repairNo} - ${ticket.asset.assetTag}`}
                meta={`${ticket.asset.name} · ${t(`maintenanceStatus_${ticket.repairStatus}`)} · ${formatDateTime(ticket.dueDate)}`}
                tone={ticket.dueDate && ticket.dueDate < today ? "danger" : "warning"}
              />
            ))
          )}
        </FollowUpPanel>

        <FollowUpPanel title={t("auditTitle")} subtitle={t("auditSubtitle")} href={`/${locale}/audit/findings?status=pending`} viewAllLabel={tCommon("view")}>
          {visibleAuditItems.length === 0 ? (
            <EmptyState label={t("noAuditIssues")} />
          ) : (
            visibleAuditItems.map((finding) => (
              <FollowUpItem
                key={finding.id}
                href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                title={finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo}
                meta={`${finding.auditRound.auditNo} · ${t(`findingType_${finding.findingType}`)} · ${t(`findingReview_${finding.reviewStatus}`)}`}
                tone={finding.reviewStatus === "pending" ? "danger" : "warning"}
              />
            ))
          )}
        </FollowUpPanel>

        <FollowUpPanel title={t("disposalTitle")} subtitle={t("disposalSubtitle")} href={`/${locale}/disposal?status=pending`} viewAllLabel={tCommon("view")}>
          {visibleDisposalItems.length === 0 ? (
            <EmptyState label={t("noDisposalIssues")} />
          ) : (
            visibleDisposalItems.map((request) => (
              <FollowUpItem
                key={request.id}
                href={`/${locale}/disposal/${request.id}`}
                title={`${request.disposalNo} - ${request.asset.assetTag}`}
                meta={`${request.asset.name} · ${t(`disposalStatus_${request.requestStatus}`)} · ${formatDateTime(request.requestDate)}`}
                tone={request.requestStatus === "pending" ? "danger" : "warning"}
              />
            ))
          )}
        </FollowUpPanel>
      </section>
    </div>
  )
}

function MetricCard({ metric }: { metric: WorkCenterMetric }) {
  return (
    <Link
      href={metric.href}
      className={`rounded-lg border p-4 shadow-sm transition-colors hover:bg-accent ${toneClass(metric.tone)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{metric.label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{metric.value.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
        </div>
        <div className="shrink-0 text-current">{metric.icon}</div>
      </div>
    </Link>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "danger" | "primary" }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${tone === "danger" ? "border-danger/30 bg-danger/5" : "border-primary/30 bg-primary/5"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
    </div>
  )
}

function FollowUpPanel({
  title,
  subtitle,
  href,
  viewAllLabel,
  children,
}: {
  title: string
  subtitle: string
  href: string
  viewAllLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
          {viewAllLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function ApprovalFollowUpItem({ item }: { item: ApprovalInboxItem }) {
  return (
    <FollowUpItem
      href={item.href}
      title={item.title}
      meta={`${item.description} · ${item.requestedBy} · ${formatDateTime(item.requestedAt)}`}
      tone={item.tone}
    />
  )
}

function FollowUpItem({ href, title, meta, tone }: { href: string; title: string; meta: string; tone: "danger" | "warning" | "primary" }) {
  return (
    <Link href={href} className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent">
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${followUpDotClass(tone)}`} />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta}</p>
        </div>
      </div>
    </Link>
  )
}

function followUpDotClass(tone: "danger" | "warning" | "primary") {
  if (tone === "danger") return "bg-danger"
  if (tone === "primary") return "bg-primary"
  return "bg-warning"
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function toneClass(tone: WorkCenterMetric["tone"]) {
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  if (tone === "primary") return "border-primary/30 bg-primary/5 text-primary"
  if (tone === "success") return "border-success/30 bg-success/5 text-success"
  return "border-border bg-surface text-muted-foreground"
}
