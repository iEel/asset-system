import Link from "next/link"
import type React from "react"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
import { splitStatRows } from "@/lib/stat-strip-rows"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { assetMissingResponsibilityWhere, hasAssetResponsibility } from "@/lib/asset-ownership"
import { buildExactAssetRegisterHref } from "@/lib/asset-register-view-memory"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalInboxAccess, getApprovalInboxSnapshot } from "@/lib/approval-inbox-query"
import { getWaitingWork } from "@/lib/waiting-work"
import {
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  buildWaitingWorkHref,
  duePmWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  startOfBangkokDay,
  stuckRepairsWhere,
} from "@/lib/waiting-work-rules"
import {
  buildWorkCenterMetricKeys,
  calculateWorkCenterUrgentCount,
  isWorkCenterSharedKey,
  type WorkCenterMetricKey,
  type WorkCenterSharedKey,
} from "@/lib/work-center-metrics"
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
import { cn, formatDate, formatDateTime } from "@/lib/utils"
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
}

// The shared kinds' tone: danger for a decision someone waits on or a due date about to pass, warning for the rest.
const SHARED_TONES: Record<WorkCenterSharedKey, "danger" | "warning"> = {
  approvalInbox: "danger",
  openRepairs: "warning",
  stuckRepairs: "warning",
  duePm: "warning",
  pendingAuditFindings: "danger",
  openAuditActions: "warning",
  auditActionsDueSoon: "danger",
  pendingDisposals: "danger",
  approvedDisposals: "warning",
}

export default async function WorkCenterPage({ params, searchParams }: WorkCenterPageProps) {
  const { locale } = await params
  const workCenterParams = parseWorkCenterParams(await searchParams)
  const user = await requirePagePermission(locale, "dashboard", "view")

  const t = await getTranslations("workCenter")
  const tCommon = await getTranslations("common")
  const tDisposal = await getTranslations("disposalPage")
  const tNotifications = await getTranslations("notifications")
  const approvalInboxAccess = getApprovalInboxAccess(user)
  const now = new Date()
  // getWaitingWork only reads (R10): the work center never records count drops.
  const [employeeProfile, waitingWork] = await Promise.all([
    user.employeeId
      ? prisma.employee.findUnique({ where: { id: user.employeeId }, select: { departmentId: true } })
      : Promise.resolve(null),
    getWaitingWork(user, now),
  ])
  const today = startOfBangkokDay(now)
  const userScope = buildWorkCenterUserScope({
    employeeId: user.employeeId,
    departmentId: employeeProfile?.departmentId,
  })
  const isMineView = workCenterParams.view === "mine"
  const metricKeys = buildWorkCenterMetricKeys({ visibleKeys: waitingWork.visibleKeys })
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
  const openRepairWhere = applyMaintenanceWorkCenterScope({ ...openRepairsWhere }, isMineView, userScope)
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
  const disposalItemWhere = applyDisposalWorkCenterScope(
    { isActive: true, requestStatus: { in: ["pending", "approved"] } },
    isMineView,
    userScope,
  )

  // "ของฉัน" narrows each shared kind's where with the work center's scope; "ทั้งหมด" shows the source's numbers.
  const mineCounters: Record<Exclude<WorkCenterSharedKey, "approvalInbox">, () => Promise<number>> = {
    openRepairs: () => prisma.maintenanceTicket.count({ where: applyMaintenanceWorkCenterScope({ ...openRepairsWhere }, true, userScope) }),
    stuckRepairs: () => prisma.asset.count({ where: applyAssetWorkCenterScope(stuckRepairsWhere, true, userScope) }),
    duePm: () => prisma.maintenancePlan.count({ where: applyPlanWorkCenterScope(duePmWhere(today), true, userScope) }),
    pendingAuditFindings: () =>
      prisma.auditFinding.count({ where: applyAuditFindingWorkCenterScope(pendingAuditFindingsWhere, true, userScope) }),
    openAuditActions: () =>
      prisma.auditFinding.count({ where: applyAuditFindingWorkCenterScope(openAuditActionsWhere(today, waitingWork.rules), true, userScope) }),
    auditActionsDueSoon: () =>
      prisma.auditFinding.count({ where: applyAuditFindingWorkCenterScope(auditActionsDueSoonWhere(today, waitingWork.rules), true, userScope) }),
    pendingDisposals: () =>
      prisma.disposalRequest.count({ where: applyDisposalWorkCenterScope(pendingDisposalsWhere, true, userScope) }),
    approvedDisposals: () =>
      prisma.disposalRequest.count({ where: applyDisposalWorkCenterScope(approvedDisposalsWhere, true, userScope) }),
  }
  const mineCountKeys = isMineView
    ? metricKeys.filter((key): key is Exclude<WorkCenterSharedKey, "approvalInbox"> => isWorkCenterSharedKey(key) && key !== "approvalInbox")
    : []

  const [
    missingCustodian,
    missingSerial,
    missingPhoto,
    pendingAuditItems,
    mineCountValues,
    approvalInboxSnapshot,
    assetIssues,
    maintenanceItems,
    auditItems,
    disposalItems,
  ] = await Promise.all([
    prisma.asset.count({ where: missingResponsibilityWhere }),
    prisma.asset.count({ where: missingSerialWhere }),
    prisma.asset.count({ where: missingPhotoWhere }),
    prisma.auditItem.count({ where: pendingAuditItemsWhere }),
    Promise.all(mineCountKeys.map((key) => mineCounters[key]())),
    approvalInboxAccess.canAnyApproval && isPanelFocused("approvals") ? getApprovalInboxSnapshot(user, locale) : Promise.resolve(null),
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
      where: openRepairWhere,
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: [{ reportedDate: "asc" }, { createdAt: "asc" }],
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
      omit: { batchId: true },
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: { requestDate: "asc" },
      take: disposalItemLimit,
    }) : Promise.resolve([]),
  ])

  const mineCounts: Partial<Record<WorkCenterSharedKey, number>> = Object.fromEntries(
    mineCountKeys.map((key, index) => [key, mineCountValues[index]]),
  )
  // The approval inbox is the person's own in both views; every other shared kind shows the source's number in
  // "ทั้งหมด" and the scoped count in "ของฉัน".
  const countFor = (key: WorkCenterSharedKey): number =>
    key === "approvalInbox" || !isMineView ? waitingWork.counts[key] : mineCounts[key] ?? 0

  const approvalInboxCounts = waitingWork.approvalInbox
  const approvalInboxVisible = approvalInboxAccess.canAnyApproval
  const visibleAuditItems = approvalInboxVisible && approvalInboxCounts.audit > 0
    ? auditItems.filter((finding) => finding.reviewStatus !== "pending")
    : auditItems
  const visibleDisposalItems = approvalInboxVisible && approvalInboxCounts.disposal > 0
    ? disposalItems.filter((request) => request.requestStatus !== "pending")
    : disposalItems

  const ownMetrics: Record<Exclude<WorkCenterMetricKey, WorkCenterSharedKey>, WorkCenterMetric> = {
    missingCustodian: {
      key: "missingCustodian",
      label: t("missingCustodian"),
      value: missingCustodian,
      detail: t("missingCustodianDetail"),
      href: buildExactAssetRegisterHref(locale, { dataQuality: "responsibility" }),
      tone: "warning",
    },
    missingSerial: {
      key: "missingSerial",
      label: t("missingSerial"),
      value: missingSerial,
      detail: t("missingSerialDetail"),
      href: buildExactAssetRegisterHref(locale, { dataQuality: "serial" }),
      tone: "muted",
    },
    missingPhoto: {
      key: "missingPhoto",
      label: t("missingPhoto"),
      value: missingPhoto,
      detail: t("missingPhotoDetail"),
      href: buildExactAssetRegisterHref(locale, { dataQuality: "photo" }),
      tone: "muted",
    },
    pendingAuditItems: {
      key: "pendingAuditItems",
      label: t("pendingAuditItems"),
      value: pendingAuditItems,
      detail: t("pendingAuditItemsDetail"),
      href: `/${locale}/audit/rounds`,
      tone: "primary",
    },
  }
  const metricFor = (key: WorkCenterMetricKey): WorkCenterMetric => {
    if (!isWorkCenterSharedKey(key)) return ownMetrics[key]
    return {
      key,
      label: tNotifications(key),
      value: countFor(key),
      detail: tNotifications(`${key}Detail`),
      href: buildWaitingWorkHref(locale, key),
      tone: SHARED_TONES[key],
    }
  }
  const metrics = filterWorkCenterMetricKeys(metricKeys, workCenterParams.panel).map(metricFor)
  const urgentCount = calculateWorkCenterUrgentCount({
    approvalInbox: {
      visible: approvalInboxVisible,
      ...approvalInboxCounts,
    },
    pendingAuditFindings: countFor("pendingAuditFindings"),
    pendingDisposals: countFor("pendingDisposals"),
    approvedDisposals: countFor("approvedDisposals"),
  })
  const followUpCount = metrics.reduce((sum, metric) => sum + metric.value, 0)
  const dataQualityGroups = buildDataQualityFixGroups(locale, workCenterParams, {
    missingResponsibility: missingCustodian,
    missingSerial,
    missingPhoto,
  })

  // One cell per metric: the number, the queue it opens, its sentence as the foot line, and the warning foot when a
  // count that needs action is above 0 (R-d: no tone fill). StatStrip is one row from lg, so the cells go in rows of
  // at most four: eight cells in one row would leave each about 90px at 1024px.
  const metricRows = splitStatRows(
    metrics.map((metric): StatStripItem => ({
      key: metric.key,
      label: metric.label,
      value: formatCount(metric.value),
      href: metric.href,
      foot: metric.detail,
      footTitle: metric.detail,
      attention: metric.value > 0 && (metric.tone === "danger" || metric.tone === "warning"),
    })),
  )

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <StatStrip
        items={[
          { key: "urgent", label: t("urgent"), value: formatCount(urgentCount) },
          { key: "allFollowUps", label: t("allFollowUps"), value: formatCount(followUpCount) },
        ]}
      />

      <div className="space-y-2">
        <TabNav
          aria-label={t("viewNavigation")}
          current={workCenterParams.view}
          items={[
            { key: "all", label: t("allWork"), href: buildWorkCenterHref(locale, workCenterParams, { view: "all", panel: workCenterParams.panel }) },
            { key: "mine", label: t("myWork"), href: buildWorkCenterHref(locale, workCenterParams, { view: "mine", panel: workCenterParams.panel }) },
          ]}
        />
        {isMineView && !userScope.enabled ? (
          <Notice tone="warning">{t("myWorkUnavailable")}</Notice>
        ) : (
          <p className="text-xs text-muted-foreground">{isMineView ? t("myWorkDetail") : t("allWorkDetail")}</p>
        )}
      </div>

      <TabNav
        aria-label={t("focusNavigation")}
        current={workCenterParams.panel}
        items={[
          { key: "overview", label: t("focusPriority"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "overview" }) },
          ...(approvalInboxVisible ? [{ key: "approvals", label: t("approvalInbox"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "approvals" }) }] : []),
          { key: "assets", label: t("assetDataTitle"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "assets" }) },
          { key: "maintenance", label: t("maintenanceTitle"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "maintenance" }) },
          { key: "audit", label: t("auditTitle"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "audit" }) },
          { key: "disposal", label: t("disposalTitle"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "disposal" }) },
        ]}
      />

      {metricRows.length > 0 ? (
        <div className="space-y-3">
          {metricRows.map((row) => (
            <StatStrip key={row[0].key} items={row} />
          ))}
        </div>
      ) : null}

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
              <EmptyNote tone="clear">{t("noApprovalInboxIssues")}</EmptyNote>
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
          href={buildExactAssetRegisterHref(locale)}
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
            <EmptyNote tone="clear">{t("noAssetDataIssues")}</EmptyNote>
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
          href={`/${locale}/maintenance?status=in_progress`}
          locale={locale}
          panel="maintenance"
          currentParams={workCenterParams}
          viewAllLabel={tCommon("view")}
          showMoreLabel={t("showInWorkCenter")}
          collapseLabel={t("collapseList")}
        >
          {maintenanceItems.length === 0 ? (
            <EmptyNote tone="clear">{t("noMaintenanceIssues")}</EmptyNote>
          ) : (
            maintenanceItems.map((ticket) => (
              <FollowUpItem
                key={ticket.id}
                href={`/${locale}/maintenance/${ticket.id}`}
                title={`${ticket.repairNo} - ${ticket.asset.assetTag}`}
                meta={`${ticket.asset.name} · ${t("repairSince", { date: formatDate(ticket.reportedDate) })}`}
                tone="warning"
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
            <EmptyNote tone="clear">{t("noAuditIssues")}</EmptyNote>
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
            <EmptyNote tone="clear">{t("noDisposalIssues")}</EmptyNote>
          ) : (
            visibleDisposalItems.map((request) => (
              <FollowUpItem
                key={request.id}
                href={`/${locale}/disposal/${request.id}`}
                title={`${request.disposalNo} - ${request.asset.assetTag}`}
                meta={`${request.asset.name} · ${tDisposal(`statuses.${request.requestStatus}`)} · ${formatDateTime(request.requestDate)}`}
                tone={request.requestStatus === "pending" ? "danger" : "warning"}
              />
            ))
          )}
        </FollowUpPanel> : null}
      </section>
    </div>
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
  // D9 and D19: the shared panel (its border turns primary while the list is the focused one) with two text links,
  // 44px tall on phones and the same text link at every width (no shape change at sm).
  const isExpanded = currentParams.panel === panel
  return (
    <ContentPanel
      title={title}
      description={subtitle}
      className={isExpanded ? "border-primary-border" : undefined}
      actions={
        <>
          <Link
            href={buildWorkCenterHref(locale, currentParams, { panel: isExpanded ? "overview" : panel })}
            className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}
          >
            {isExpanded ? collapseLabel : showMoreLabel}
          </Link>
          <Link href={href} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
            {viewAllLabel}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </>
      }
    >
      <div className="space-y-2">{children}</div>
    </ContentPanel>
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
    <div className="mb-3 rounded-md border border-border bg-background p-3">
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
              <span className="num shrink-0 text-sm font-semibold text-foreground">{formatCount(group.count)}</span>
            </div>
            {/* D19: text links at every width, 44px tall on phones. */}
            <div className="mt-3 flex flex-col gap-x-4 gap-y-1 sm:flex-row sm:flex-wrap">
              <Link href={group.assetsHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                {labels.openFilteredAssets}
              </Link>
              <Link href={group.workCenterHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
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

// The status marker carries the urgency by shape (diamond, triangle, dot), not by color alone.
function FollowUpItem({ href, title, meta, tone }: { href: string; title: string; meta: string; tone: "danger" | "warning" | "primary" }) {
  return (
    <Link href={href} className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-row-hover">
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className={cn(statusMarkerVariants({ tone }), "mt-2")} />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta}</p>
        </div>
      </div>
    </Link>
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

function applyPlanWorkCenterScope(
  where: Prisma.MaintenancePlanWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.MaintenancePlanWhereInput {
  const scopeWhere = getScopedWhere<Prisma.MaintenancePlanWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ asset: { custodianId: employeeId } }] : []),
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
