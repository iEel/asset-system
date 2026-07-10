import Link from "next/link"
import type React from "react"
import type { Prisma } from "@prisma/client"
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
import {
  buildDataQualityFixGroups,
  buildWorkCenterHref,
  buildWorkCenterUserScope,
  filterWorkCenterMetricKeys,
  getWorkCenterFocusPanels,
  getWorkCenterItemLimit,
  parseWorkCenterParams,
  type WorkCenterPanel,
  type WorkCenterParams,
  type WorkCenterUserScope,
} from "@/lib/work-center-view"
import { formatDateTime } from "@/lib/utils"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"

type WorkCenterPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ view?: string | string[]; panel?: string | string[] }>
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

export default async function WorkCenterPage({ params, searchParams }: WorkCenterPageProps) {
  const { locale } = await params
  const workCenterParams = parseWorkCenterParams(await searchParams)
  const user = await requirePagePermission(locale, "dashboard", "view")

  const t = await getTranslations("workCenter")
  const tCommon = await getTranslations("common")
  const today = startOfToday()
  const approvalInboxAccess = getApprovalInboxAccess(user)
  const employeeProfile = user.employeeId
    ? await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { departmentId: true } })
    : null
  const userScope = buildWorkCenterUserScope({
    employeeId: user.employeeId,
    departmentId: employeeProfile?.departmentId,
  })
  const isMineView = workCenterParams.view === "mine"
  const focusPanels = getWorkCenterFocusPanels(workCenterParams.panel, approvalInboxAccess.canAnyApproval)
  const isPanelFocused = (panel: Exclude<WorkCenterPanel, "overview">) => focusPanels.includes(panel)
  const approvalItemLimit = getWorkCenterItemLimit("approvals", workCenterParams.panel)
  const assetItemLimit = getWorkCenterItemLimit("assets", workCenterParams.panel)
  const maintenanceItemLimit = getWorkCenterItemLimit("maintenance", workCenterParams.panel)
  const auditItemLimit = getWorkCenterItemLimit("audit", workCenterParams.panel)
  const disposalItemLimit = getWorkCenterItemLimit("disposal", workCenterParams.panel)
  const missingResponsibilityWhere = applyAssetWorkCenterScope(
    { AND: [{ isActive: true }, assetMissingResponsibilityWhere] },
    isMineView,
    userScope,
  )
  const missingSerialWhere = applyAssetWorkCenterScope(
    { isActive: true, OR: [{ serialNumber: null }, { serialNumber: "" }] },
    isMineView,
    userScope,
  )
  const missingPhotoWhere = applyAssetWorkCenterScope(
    {
      isActive: true,
      ownershipType: { not: "software_license" },
      attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } },
    },
    isMineView,
    userScope,
  )
  const assetIssueWhere = applyAssetWorkCenterScope(
    {
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
    isMineView,
    userScope,
  )
  const overdueMaintenanceWhere = applyMaintenanceWorkCenterScope(
    { isActive: true, repairStatus: { in: openMaintenanceStatuses }, dueDate: { lt: today } },
    isMineView,
    userScope,
  )
  const waitingMaintenanceWhere = applyMaintenanceWorkCenterScope(
    { isActive: true, repairStatus: { in: waitingMaintenanceStatuses } },
    isMineView,
    userScope,
  )
  const completedMaintenanceWhere = applyMaintenanceWorkCenterScope(
    { isActive: true, repairStatus: "completed" },
    isMineView,
    userScope,
  )
  const maintenanceItemWhere = applyMaintenanceWorkCenterScope(
    {
      isActive: true,
      repairStatus: { in: openMaintenanceStatuses },
      OR: [{ dueDate: { lt: today } }, { repairStatus: { in: waitingMaintenanceStatuses } }, { repairStatus: "completed" }],
    },
    isMineView,
    userScope,
  )
  const pendingAuditFindingWhere = applyAuditFindingWorkCenterScope(
    { reviewStatus: "pending", auditRound: { isActive: true, status: auditRoundOperationalWhere } },
    isMineView,
    userScope,
  )
  const openAuditActionWhere = applyAuditFindingWorkCenterScope(
    { actionStatus: { in: ["planned", "in_progress"] }, auditRound: { isActive: true, status: auditRoundOperationalWhere } },
    isMineView,
    userScope,
  )
  const auditItemWhere = applyAuditFindingWorkCenterScope(
    { auditRound: { isActive: true, status: auditRoundOperationalWhere }, OR: [{ reviewStatus: "pending" }, { actionStatus: { in: ["planned", "in_progress"] } }] },
    isMineView,
    userScope,
  )
  const pendingAuditItemsWhere = applyAuditItemWorkCenterScope(
    { auditStatus: "pending", auditRound: { isActive: true, status: auditRoundOperationalWhere } },
    isMineView,
    userScope,
  )
  const pendingDisposalWhere = applyDisposalWorkCenterScope(
    { isActive: true, requestStatus: "pending" },
    isMineView,
    userScope,
  )
  const approvedDisposalWhere = applyDisposalWorkCenterScope(
    { isActive: true, requestStatus: "approved" },
    isMineView,
    userScope,
  )
  const disposalItemWhere = applyDisposalWorkCenterScope(
    { isActive: true, requestStatus: { in: ["pending", "approved"] } },
    isMineView,
    userScope,
  )

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
    prisma.asset.count({ where: missingResponsibilityWhere }),
    prisma.asset.count({ where: missingSerialWhere }),
    prisma.asset.count({ where: missingPhotoWhere }),
    prisma.maintenanceTicket.count({ where: overdueMaintenanceWhere }),
    prisma.maintenanceTicket.count({ where: waitingMaintenanceWhere }),
    prisma.maintenanceTicket.count({ where: completedMaintenanceWhere }),
    prisma.auditFinding.count({ where: pendingAuditFindingWhere }),
    prisma.auditFinding.count({ where: openAuditActionWhere }),
    prisma.auditItem.count({ where: pendingAuditItemsWhere }),
    prisma.disposalRequest.count({ where: pendingDisposalWhere }),
    prisma.disposalRequest.count({ where: approvedDisposalWhere }),
    approvalInboxAccess.canAnyApproval ? getApprovalInboxSnapshot(user, locale) : Promise.resolve(null),
    isPanelFocused("assets") ? prisma.asset.findMany({
      where: assetIssueWhere,
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
      take: assetItemLimit,
    }) : Promise.resolve([]),
    isPanelFocused("maintenance") ? prisma.maintenanceTicket.findMany({
      where: maintenanceItemWhere,
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: maintenanceItemLimit,
    }) : Promise.resolve([]),
    isPanelFocused("audit") ? prisma.auditFinding.findMany({
      where: auditItemWhere,
      include: {
        auditRound: { select: { id: true, auditNo: true, name: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: auditItemLimit,
    }) : Promise.resolve([]),
    isPanelFocused("disposal") ? prisma.disposalRequest.findMany({
      where: disposalItemWhere,
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: { requestDate: "asc" },
      take: disposalItemLimit,
    }) : Promise.resolve([]),
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
  const metricKeys = buildWorkCenterMetricKeys({
    approvalInbox: {
      visible: approvalInboxVisible,
      ...approvalInboxCounts,
    },
  })
  const metrics = filterWorkCenterMetricKeys(metricKeys, workCenterParams.panel).map((key) => metricMap[key])
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
  const dataQualityGroups = buildDataQualityFixGroups(locale, workCenterParams, {
    missingResponsibility: missingCustodian,
    missingSerial,
    missingPhoto,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <SummaryPill label={t("urgent")} value={urgentCount} tone="danger" />
          <SummaryPill label={t("allFollowUps")} value={followUpCount} tone="primary" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 rounded-md border border-border bg-background p-1 sm:inline-flex">
          <WorkCenterViewLink
            href={buildWorkCenterHref(locale, workCenterParams, { view: "all", panel: workCenterParams.panel })}
            active={workCenterParams.view === "all"}
          >
            {t("allWork")}
          </WorkCenterViewLink>
          <WorkCenterViewLink
            href={buildWorkCenterHref(locale, workCenterParams, { view: "mine", panel: workCenterParams.panel })}
            active={workCenterParams.view === "mine"}
          >
            {t("myWork")}
          </WorkCenterViewLink>
        </div>
        {isMineView && !userScope.enabled ? (
          <p className="text-xs text-warning">{t("myWorkUnavailable")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{isMineView ? t("myWorkDetail") : t("allWorkDetail")}</p>
        )}
      </div>

      <nav aria-label={t("focusNavigation")} className="flex flex-wrap gap-2">
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "overview" })}
          active={workCenterParams.panel === "overview"}
        >
          {t("focusPriority")}
        </WorkCenterFocusLink>
        {approvalInboxVisible ? (
          <WorkCenterFocusLink
            href={buildWorkCenterHref(locale, workCenterParams, { panel: "approvals" })}
            active={workCenterParams.panel === "approvals"}
          >
            {t("approvalInbox")}
          </WorkCenterFocusLink>
        ) : null}
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "assets" })}
          active={workCenterParams.panel === "assets"}
        >
          {t("assetDataTitle")}
        </WorkCenterFocusLink>
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "maintenance" })}
          active={workCenterParams.panel === "maintenance"}
        >
          {t("maintenanceTitle")}
        </WorkCenterFocusLink>
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "audit" })}
          active={workCenterParams.panel === "audit"}
        >
          {t("auditTitle")}
        </WorkCenterFocusLink>
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "disposal" })}
          active={workCenterParams.panel === "disposal"}
        >
          {t("disposalTitle")}
        </WorkCenterFocusLink>
      </nav>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {approvalInboxVisible && isPanelFocused("approvals") ? (
          <FollowUpPanel
            title={t("approvalInboxTitle")}
            subtitle={t("approvalInboxSubtitle")}
            href={`/${locale}/admin/approvals`}
            locale={locale}
            panel="approvals"
            currentParams={workCenterParams}
            viewAllLabel={tCommon("view")}
            showMoreLabel={t("showInWorkCenter")}
            collapseLabel={t("collapseList")}
          >
            {!approvalInboxSnapshot || approvalInboxSnapshot.items.length === 0 ? (
              <EmptyState label={t("noApprovalInboxIssues")} />
            ) : (
              approvalInboxSnapshot.items.slice(0, approvalItemLimit).map((item) => (
                <ApprovalFollowUpItem key={item.id} item={item} />
              ))
            )}
          </FollowUpPanel>
        ) : null}

        {isPanelFocused("assets") ? <FollowUpPanel
          title={t("assetDataTitle")}
          subtitle={t("assetDataSubtitle")}
          href={`/${locale}/assets`}
          locale={locale}
          panel="assets"
          currentParams={workCenterParams}
          viewAllLabel={tCommon("view")}
          showMoreLabel={t("showInWorkCenter")}
          collapseLabel={t("collapseList")}
        >
          <DataQualityFixGroups
            groups={dataQualityGroups}
            labels={{
              title: t("bulkFixTitle"),
              subtitle: t("bulkFixSubtitle"),
              openFilteredAssets: t("openFilteredAssets"),
              showInWorkCenter: t("showInWorkCenter"),
              issueLabels: {
                responsibility: t("dataQuality_responsibility"),
                serial: t("dataQuality_serial"),
                photo: t("dataQuality_photo"),
              },
              issueDetails: {
                responsibility: t("dataQuality_responsibilityDetail"),
                serial: t("dataQuality_serialDetail"),
                photo: t("dataQuality_photoDetail"),
              },
            }}
          />
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
        </FollowUpPanel> : null}

        {isPanelFocused("maintenance") ? <FollowUpPanel
          title={t("maintenanceTitle")}
          subtitle={t("maintenanceSubtitle")}
          href={`/${locale}/maintenance?overdue=yes`}
          locale={locale}
          panel="maintenance"
          currentParams={workCenterParams}
          viewAllLabel={tCommon("view")}
          showMoreLabel={t("showInWorkCenter")}
          collapseLabel={t("collapseList")}
        >
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
        </FollowUpPanel> : null}

        {isPanelFocused("audit") ? <FollowUpPanel
          title={t("auditTitle")}
          subtitle={t("auditSubtitle")}
          href={`/${locale}/audit/findings?status=pending`}
          locale={locale}
          panel="audit"
          currentParams={workCenterParams}
          viewAllLabel={tCommon("view")}
          showMoreLabel={t("showInWorkCenter")}
          collapseLabel={t("collapseList")}
        >
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
        </FollowUpPanel> : null}

        {isPanelFocused("disposal") ? <FollowUpPanel
          title={t("disposalTitle")}
          subtitle={t("disposalSubtitle")}
          href={`/${locale}/disposal?status=pending`}
          locale={locale}
          panel="disposal"
          currentParams={workCenterParams}
          viewAllLabel={tCommon("view")}
          showMoreLabel={t("showInWorkCenter")}
          collapseLabel={t("collapseList")}
        >
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
        </FollowUpPanel> : null}
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

function WorkCenterViewLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded px-3 py-1.5 text-center text-sm font-medium transition-colors sm:min-h-0 ${
        active ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  )
}

function WorkCenterFocusLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-md border px-3 text-center text-xs font-medium transition-colors sm:min-h-0 sm:h-9 ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  )
}

function FollowUpPanel({
  title,
  subtitle,
  href,
  locale,
  panel,
  currentParams,
  viewAllLabel,
  showMoreLabel,
  collapseLabel,
  children,
}: {
  title: string
  subtitle: string
  href: string
  locale: string
  panel: WorkCenterPanel
  currentParams: WorkCenterParams
  viewAllLabel: string
  showMoreLabel: string
  collapseLabel: string
  children: React.ReactNode
}) {
  const isExpanded = currentParams.panel === panel
  return (
    <section className={`min-w-0 rounded-lg border bg-surface p-4 shadow-sm ${isExpanded ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center">
          <Link
            href={buildWorkCenterHref(locale, currentParams, { panel: isExpanded ? "overview" : panel })}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-primary/20 px-3 text-xs font-medium text-primary hover:bg-primary/5 sm:min-h-0 sm:border-0 sm:px-0 sm:hover:bg-transparent sm:hover:underline"
          >
            {isExpanded ? collapseLabel : showMoreLabel}
          </Link>
          <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground hover:text-primary sm:min-h-0 sm:border-0 sm:px-0 sm:hover:underline">
            {viewAllLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function DataQualityFixGroups({
  groups,
  labels,
}: {
  groups: ReturnType<typeof buildDataQualityFixGroups>
  labels: {
    title: string
    subtitle: string
    openFilteredAssets: string
    showInWorkCenter: string
    issueLabels: Record<ReturnType<typeof buildDataQualityFixGroups>[number]["key"], string>
    issueDetails: Record<ReturnType<typeof buildDataQualityFixGroups>[number]["key"], string>
  }
}) {
  if (groups.length === 0) return null

  return (
    <div className="mb-3 rounded-md border border-dashed border-border bg-background p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-foreground">{labels.title}</div>
        <div className="text-xs text-muted-foreground">{labels.subtitle}</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {groups.map((group) => (
          <div key={group.key} className="rounded-md border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{labels.issueLabels[group.key]}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{labels.issueDetails[group.key]}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {group.count.toLocaleString("th-TH")}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={group.assetsHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary/20 px-3 text-center text-xs font-medium text-primary hover:bg-primary/5 sm:min-h-0 sm:border-0 sm:px-0 sm:hover:bg-transparent sm:hover:underline">
                {labels.openFilteredAssets}
              </Link>
              <Link href={group.workCenterHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-center text-xs font-medium text-muted-foreground hover:text-primary sm:min-h-0 sm:border-0 sm:px-0 sm:hover:underline">
                {labels.showInWorkCenter}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
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

function applyAssetWorkCenterScope(
  where: Prisma.AssetWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.AssetWhereInput {
  return applyWorkCenterScope(where, active, buildAssetScopeWhere(scope))
}

function applyMaintenanceWorkCenterScope(
  where: Prisma.MaintenanceTicketWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.MaintenanceTicketWhereInput {
  const scopeWhere = getScopedWhere<Prisma.MaintenanceTicketWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ reportedById: employeeId }, { assignedToId: employeeId }, { inspectedById: employeeId }, { asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

function applyAuditFindingWorkCenterScope(
  where: Prisma.AuditFindingWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.AuditFindingWhereInput {
  const scopeWhere = getScopedWhere<Prisma.AuditFindingWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ actionOwnerId: employeeId }, { asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

function applyAuditItemWorkCenterScope(
  where: Prisma.AuditItemWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.AuditItemWhereInput {
  const scopeWhere = getScopedWhere<Prisma.AuditItemWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

function applyDisposalWorkCenterScope(
  where: Prisma.DisposalRequestWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.DisposalRequestWhereInput {
  const scopeWhere = getScopedWhere<Prisma.DisposalRequestWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ requestedById: employeeId }, { approverId: employeeId }, { executedById: employeeId }, { asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

function buildAssetScopeWhere(scope: WorkCenterUserScope): Prisma.AssetWhereInput {
  return getScopedWhere<Prisma.AssetWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ custodianId: employeeId }] : []),
      ...(departmentId ? [{ departmentId }] : []),
    ],
  }))
}

function getScopedWhere<T extends { OR?: unknown; id?: unknown }>(
  scope: WorkCenterUserScope,
  build: (scope: { employeeId: string | null; departmentId: string | null }) => T,
): T {
  if (!scope.enabled) return { id: "__work_center_no_user_scope__" } as T
  return build(scope)
}

function applyWorkCenterScope<T>(where: T, active: boolean, scopeWhere: T): T {
  if (!active) return where
  return { AND: [where, scopeWhere] } as T
}

function toneClass(tone: WorkCenterMetric["tone"]) {
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  if (tone === "primary") return "border-primary/30 bg-primary/5 text-primary"
  if (tone === "success") return "border-success/30 bg-success/5 text-success"
  return "border-border bg-surface text-muted-foreground"
}
