import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Boxes, Edit, History, ShieldCheck, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildEmployeeDetailHrefs, buildEmployeeDetailSummary, buildEmployeeFollowUpItems, dedupeEmployeeMaintenanceLinks } from "@/lib/employee-detail"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"
import { getAuditRoundItemResultLabelKey } from "@/lib/audit-round-result-filters"
import { auditRoundStatusLabelKey, effectiveAuditRoundStatus } from "@/lib/audit-round-status"
import { getStatusTone } from "@/lib/status-tone"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendMasterDataReturnTo, normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type EmployeeDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EmployeeDetailPage({ params, searchParams }: EmployeeDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "employees", rawSearchParams.returnTo)
  await requirePagePermission(locale, "employee", "view")

  const t = await getTranslations("employee")
  const tCommon = await getTranslations("common")
  const tMaintenance = await getTranslations("maintenancePage")
  const tFinding = await getTranslations("auditFinding")
  const tAuditRound = await getTranslations("auditRound")
  const formatAuditItemStatus = (status: string) => {
    const key = getAuditItemStatusLabelKey(status)
    return key ? tFinding(key) : status
  }
  const formatAuditItemOutcome = (result: string | null, status: string) => {
    const resultKey = getAuditRoundItemResultLabelKey(result)
    if (resultKey) return tAuditRound(resultKey)
    return result || formatAuditItemStatus(status)
  }
  const tDisposal = await getTranslations("disposalPage")

  const employee = await prisma.employee.findFirst({
    where: { id },
    include: {
      company: { select: { code: true, nameTh: true } },
      branch: { select: { code: true, name: true } },
      department: { select: { code: true, name: true } },
      manager: { select: { id: true, code: true, fullNameTh: true } },
      subordinates: {
        where: { isActive: true },
        select: { id: true, code: true, fullNameTh: true, position: true },
        orderBy: { code: "asc" },
        take: 8,
      },
    },
  })
  if (!employee) notFound()

  const relatedEmployeeWhere = {
    isActive: true,
    OR: [{ reportedById: id }, { assignedToId: id }, { inspectedById: id }],
  }
  const openMaintenanceWhere = {
    ...relatedEmployeeWhere,
    ...openRepairRecordWhere,
  }
  const pendingAuditFindingWhere = {
    actionOwnerId: id,
    OR: [{ reviewStatus: "pending" }, { actionStatus: { in: ["planned", "in_progress"] } }],
  }
  const relatedDisposalWhere = {
    isActive: true,
    OR: [{ requestedById: id }, { approverId: id }, { executedById: id }],
  }
  const pendingDisposalWhere = {
    ...relatedDisposalWhere,
    requestStatus: { in: ["pending", "approved"] },
  }

  const [
    currentAssetCount,
    currentAssets,
    openCheckoutCount,
    checkoutHistory,
    openMaintenanceCount,
    maintenanceTickets,
    pendingAuditFindingCount,
    auditFindings,
    auditItems,
    scopedAuditRounds,
    pendingDisposalCount,
    disposalRequests,
  ] = await Promise.all([
    prisma.asset.count({ where: { custodianId: id, isActive: true } }),
    prisma.asset.findMany({
      where: { custodianId: id, isActive: true },
      select: {
        id: true,
        assetTag: true,
        name: true,
        ownershipType: true,
        category: { select: { code: true, name: true } },
        currentLocation: { select: { code: true, name: true } },
        status: { select: { name: true, nameTh: true, colorCode: true } },
        condition: { select: { name: true, nameTh: true, colorCode: true } },
      },
      orderBy: { assetTag: "asc" },
      take: 10,
    }),
    prisma.assetCheckout.count({ where: { custodianId: id, isReturned: false, transactionStatus: "active" } }),
    prisma.assetCheckout.findMany({
      where: { custodianId: id },
      select: {
        id: true,
        documentNo: true,
        checkoutDate: true,
        expectedReturnDate: true,
        checkedOutBy: true,
        isReturned: true,
        asset: { select: { id: true, assetTag: true, name: true } },
        checkins: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            documentNo: true,
            returnDate: true,
            returnBy: true,
            receiveBy: true,
            conditionAfter: true,
            nextStatus: true,
          },
        },
      },
      orderBy: { checkoutDate: "desc" },
      take: 10,
    }),
    prisma.maintenanceTicket.count({ where: openMaintenanceWhere }),
    prisma.maintenanceTicket.findMany({
      where: relatedEmployeeWhere,
      select: {
        id: true,
        repairNo: true,
        repairStatus: true,
        reportedDate: true,
        problem: true,
        reportedById: true,
        assignedToId: true,
        inspectedById: true,
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: { reportedDate: "desc" },
      take: 10,
    }),
    prisma.auditFinding.count({ where: pendingAuditFindingWhere }),
    prisma.auditFinding.findMany({
      where: { actionOwnerId: id },
      select: {
        id: true,
        findingType: true,
        reviewStatus: true,
        actionStatus: true,
        actionDueDate: true,
        reportedAt: true,
        asset: { select: { id: true, assetTag: true, name: true } },
        auditRound: { select: { id: true, auditNo: true, name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 10,
    }),
    prisma.auditItem.findMany({
      where: {
        OR: [{ expectedCustodianId: id }, { actualCustodianId: id }],
      },
      select: {
        id: true,
        auditStatus: true,
        auditResult: true,
        lastScanAt: true,
        findingRequired: true,
        asset: { select: { id: true, assetTag: true, name: true } },
        auditRound: { select: { id: true, auditNo: true, name: true } },
      },
      orderBy: [{ lastScanAt: "desc" }, { updatedAt: "desc" }],
      take: 10,
    }),
    prisma.auditRound.findMany({
      where: { scopeCustodianId: id, isActive: true },
      select: { id: true, auditNo: true, name: true, status: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
      take: 5,
    }),
    prisma.disposalRequest.count({ where: pendingDisposalWhere }),
    prisma.disposalRequest.findMany({
      where: relatedDisposalWhere,
      select: {
        id: true,
        disposalNo: true,
        requestStatus: true,
        requestDate: true,
        requestedById: true,
        approverId: true,
        executedById: true,
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: { requestDate: "desc" },
      take: 10,
    }),
  ])

  const hrefs = buildEmployeeDetailHrefs({ locale, employeeId: id })
  const editHref = appendMasterDataReturnTo(hrefs.edit, returnToHref)
  const summary = buildEmployeeDetailSummary({
    currentAssetCount,
    openCheckoutCount,
    openMaintenanceCount,
    pendingAuditFindingCount,
    pendingDisposalCount,
  })
  const followUpItems = buildEmployeeFollowUpItems({
    employmentStatus: employee.employmentStatus,
    currentAssetCount,
    openCheckoutCount,
    openMaintenanceCount,
    pendingAuditFindingCount,
    pendingDisposalCount,
  })
  const maintenanceRoleLinks = dedupeEmployeeMaintenanceLinks(
    maintenanceTickets.flatMap((ticket) => [
      ...(ticket.reportedById === id ? [{ id: ticket.id, role: "reported" as const }] : []),
      ...(ticket.assignedToId === id ? [{ id: ticket.id, role: "assigned" as const }] : []),
      ...(ticket.inspectedById === id ? [{ id: ticket.id, role: "inspected" as const }] : []),
    ])
  )
  const maintenanceRoleMap = new Map(maintenanceRoleLinks.map((link) => [link.id, link.roles]))
  const maintenanceStatusLabels = Object.fromEntries(maintenanceStatuses.map((status) => [status, tMaintenance(`statuses.${status}`)]))

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: employee.code, code: true },
        ]}
        title={employee.fullNameTh}
        meta={
          <>
            <span className="tag">{employee.code}</span>
            {employee.position ? <span>{employee.position}</span> : null}
            {employee.email ? <span>{employee.email}</span> : null}
            {employee.position || employee.email ? null : <span>{t("noContactDetail")}</span>}
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <Link href={editHref} className={buttonVariants({ size: "md" })}>
            <Edit aria-hidden="true" />
            {tCommon("edit")}
          </Link>
        }
      />

      <StatStrip
        items={[
          { key: "currentAssets", label: t("detailCurrentAssets"), value: formatCount(summary.currentAssetCount), foot: t("detailCurrentAssetsHelp"), footTitle: t("detailCurrentAssetsHelp"), href: hrefs.assets },
          { key: "openCheckouts", label: t("detailOpenCheckouts"), value: formatCount(summary.openCheckoutCount), foot: t("detailOpenCheckoutsHelp"), footTitle: t("detailOpenCheckoutsHelp"), attention: summary.openCheckoutCount > 0 },
          { key: "openMaintenance", label: t("detailOpenMaintenance"), value: formatCount(summary.openMaintenanceCount), foot: t("detailOpenMaintenanceHelp"), footTitle: t("detailOpenMaintenanceHelp"), attention: summary.openMaintenanceCount > 0 },
          { key: "pendingAudit", label: t("detailPendingAudit"), value: formatCount(summary.pendingAuditFindingCount), foot: t("detailPendingAuditHelp"), footTitle: t("detailPendingAuditHelp"), attention: summary.pendingAuditFindingCount > 0 },
          { key: "attention", label: t("detailAttention"), value: formatCount(summary.attentionCount), foot: t("detailAttentionHelp"), footTitle: t("detailAttentionHelp"), attention: summary.attentionCount > 0 },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ContentPanel title={t("detailProfileTitle")} description={t("detailProfileHelp")}>
            <KeyValueList
              items={[
                { key: "company", label: t("company"), value: <><span className="tag">{employee.company.code}</span> - {employee.company.nameTh}</> },
                { key: "branch", label: t("branch"), value: <><span className="tag">{employee.branch.code}</span> - {employee.branch.name}</> },
                { key: "department", label: t("department"), value: <><span className="tag">{employee.department.code}</span> - {employee.department.name}</> },
                { key: "position", label: t("position"), value: employee.position },
                { key: "email", label: t("email"), value: employee.email },
                { key: "manager", label: t("manager"), value: employee.manager ? <><span className="tag">{employee.manager.code}</span> - {employee.manager.fullNameTh}</> : null },
                { key: "employmentStatus", label: t("employmentStatus"), value: <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employee.employmentStatus === "active" ? "success" : "warning"} /> },
              ]}
            />
          </ContentPanel>

          <ContentPanel title={t("detailCurrentAssets")} description={t("detailCurrentAssetsSectionHelp", { shown: currentAssets.length, total: currentAssetCount })}>
            {currentAssets.length === 0 ? (
              <ActionEmptyState icon={<Boxes className="h-6 w-6" />} title={t("emptyCurrentAssetsTitle")} description={t("emptyCurrentAssetsHelp")} />
            ) : (
              <DataTable framed={false} caption={t("detailCurrentAssets")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("assetTag")}</DataTableHead>
                    <DataTableHead>{t("assetName")}</DataTableHead>
                    <DataTableHead>{t("assetCategory")}</DataTableHead>
                    <DataTableHead>{t("assetLocation")}</DataTableHead>
                    <DataTableHead>{t("assetStatus")}</DataTableHead>
                    <DataTableHead>{t("assetCondition")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {currentAssets.map((asset) => (
                    <DataTableRow key={asset.id}>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <Link href={`/${locale}/assets/${asset.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{asset.assetTag}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-56 text-foreground">{asset.name}</DataTableCell>
                      <DataTableCell className="min-w-44 text-muted-foreground"><span className="tag">{asset.category.code}</span> - {asset.category.name}</DataTableCell>
                      <DataTableCell className="min-w-44 text-muted-foreground"><span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap"><StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} /></DataTableCell>
                      <DataTableCell className="whitespace-nowrap"><StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} /></DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
            {currentAssetCount > 0 ? (
              <div className="mt-4">
                <Link href={hrefs.assets} className={buttonVariants({ variant: "outline", size: "md" })}>
                  {t("viewAllAssets")}
                </Link>
              </div>
            ) : null}
          </ContentPanel>

          <ContentPanel title={t("handoverHistoryTitle")} description={t("handoverHistoryHelp")}>
            {checkoutHistory.length === 0 ? (
              <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("emptyHandoverTitle")} description={t("emptyHandoverHelp")} />
            ) : (
              <DataTable framed={false} caption={t("handoverHistoryTitle")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("documentNo")}</DataTableHead>
                    <DataTableHead>{t("asset")}</DataTableHead>
                    <DataTableHead>{t("checkoutDate")}</DataTableHead>
                    <DataTableHead>{t("expectedReturnDate")}</DataTableHead>
                    <DataTableHead>{t("returnDate")}</DataTableHead>
                    <DataTableHead>{t("handoverBy")}</DataTableHead>
                    <DataTableHead>{t("receiveBy")}</DataTableHead>
                    <DataTableHead>{tCommon("status")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {checkoutHistory.map((checkout) => (
                    <DataTableRow key={checkout.id}>
                      <DataTableCell className="whitespace-nowrap font-medium text-foreground">{checkout.documentNo ? <span className="tag">{checkout.documentNo}</span> : <Nil />}</DataTableCell>
                      <DataTableCell className="min-w-56">
                        <Link href={`/${locale}/assets/${checkout.asset.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{checkout.asset.assetTag}</span> - {checkout.asset.name}
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(checkout.checkoutDate)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{checkout.expectedReturnDate ? formatDate(checkout.expectedReturnDate) : <Nil />}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{checkout.checkins[0]?.returnDate ? formatDate(checkout.checkins[0]?.returnDate) : <Nil />}</DataTableCell>
                      <DataTableCell className="min-w-36 text-muted-foreground">{orNil(checkout.checkedOutBy)}</DataTableCell>
                      <DataTableCell className="min-w-36 text-muted-foreground">{orNil(checkout.checkins[0]?.receiveBy)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <StatusBadge label={checkout.isReturned ? t("handoverReturned") : t("handoverOpen")} tone={checkout.isReturned ? "success" : "warning"} />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </ContentPanel>

          <ContentPanel title={t("maintenanceRelatedTitle")} description={t("maintenanceRelatedHelp")}>
            {maintenanceTickets.length === 0 ? (
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyMaintenanceTitle")} description={t("emptyMaintenanceHelp")} />
            ) : (
              <DataTable framed={false} caption={t("maintenanceRelatedTitle")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{tMaintenance("repairNo")}</DataTableHead>
                    <DataTableHead>{tMaintenance("asset")}</DataTableHead>
                    <DataTableHead>{t("employeeRole")}</DataTableHead>
                    <DataTableHead>{tMaintenance("reportedDate")}</DataTableHead>
                    <DataTableHead>{tMaintenance("problem")}</DataTableHead>
                    <DataTableHead>{tCommon("status")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {maintenanceTickets.map((ticket) => (
                    <DataTableRow key={ticket.id}>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <Link href={`/${locale}/maintenance/${ticket.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{ticket.repairNo}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-56">
                        <Link href={`/${locale}/assets/${ticket.asset.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{ticket.asset.assetTag}</span> - {ticket.asset.name}
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-44 text-muted-foreground">{orNil(formatRoleLabels(maintenanceRoleMap.get(ticket.id) ?? [], t))}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(ticket.reportedDate)}</DataTableCell>
                      <DataTableCell className="min-w-56 text-muted-foreground"><span className="line-clamp-2">{ticket.problem}</span></DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </ContentPanel>
        </div>

        <aside className="space-y-6">
          <ContentPanel title={t("followUpTitle")} description={t("followUpHelp")}>
            {followUpItems.length === 0 ? (
              <ActionEmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t("followUpEmptyTitle")} description={t("followUpEmptyHelp")} />
            ) : (
              <div className="space-y-3">
                {/* Each item is something to deal with now: a warning Notice, its help as the second line (spec 2D D7). */}
                {followUpItems.map((item) => (
                  <Notice key={item} tone="warning" title={t(`followUp.${item}.title`)}>
                    {t(`followUp.${item}.help`)}
                  </Notice>
                ))}
              </div>
            )}
          </ContentPanel>

          <ContentPanel title={t("subordinatesTitle")}>
            {employee.subordinates.length === 0 ? (
              <EmptyNote>{t("noSubordinates")}</EmptyNote>
            ) : (
              <div className="space-y-3">
                {employee.subordinates.map((subordinate) => (
                  <Link key={subordinate.id} href={`/${locale}/master-data/employees/${subordinate.id}`} className={quietRowLinkClasses}>
                    <div className="text-sm font-semibold text-foreground"><span className="tag">{subordinate.code}</span> - {subordinate.fullNameTh}</div>
                    <div className="mt-1 text-meta text-muted-foreground">{orNil(subordinate.position)}</div>
                  </Link>
                ))}
              </div>
            )}
          </ContentPanel>

          <ContentPanel title={t("auditRelatedTitle")} description={t("auditRelatedHelp")}>
            <div className="space-y-4">
              <MiniList
                title={t("auditFindingsTitle")}
                emptyLabel={t("emptyAuditFindings")}
                items={auditFindings.map((finding) => ({
                  id: finding.id,
                  title: finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo,
                  href: `/${locale}/audit/findings`,
                  meta: `${finding.auditRound.auditNo} / ${tFinding(`type_${finding.findingType}`)}`,
                  badge: tFinding(`actionStatus_${finding.actionStatus}`),
                  tone: finding.actionStatus === "done" || finding.actionStatus === "closed" ? "success" : "warning",
                }))}
              />
              <MiniList
                title={t("auditItemsTitle")}
                emptyLabel={t("emptyAuditItems")}
                items={auditItems.map((item) => ({
                  id: item.id,
                  title: `${item.asset.assetTag} - ${item.asset.name}`,
                  href: `/${locale}/audit/rounds/${item.auditRound.id}`,
                  meta: `${item.auditRound.auditNo} / ${formatAuditItemOutcome(item.auditResult, item.auditStatus)}`,
                  badge: item.findingRequired ? t("auditItemHasFinding") : formatAuditItemStatus(item.auditStatus),
                  tone: item.findingRequired ? "warning" : "info",
                }))}
              />
              <MiniList
                title={t("auditRoundsTitle")}
                emptyLabel={t("emptyAuditRounds")}
                items={scopedAuditRounds.map((round) => ({
                  id: round.id,
                  title: round.auditNo,
                  href: `/${locale}/audit/rounds/${round.id}`,
                  meta: `${round.name} / ${formatDate(round.startDate)} - ${formatDate(round.endDate)}`,
                  badge: getAuditRoundStatusLabel(round.status, tAuditRound),
                  tone: getStatusTone(effectiveAuditRoundStatus(round.status)),
                }))}
              />
            </div>
          </ContentPanel>

          <ContentPanel title={t("disposalRelatedTitle")} description={t("disposalRelatedHelp")}>
            <MiniList
              emptyLabel={t("emptyDisposals")}
              items={disposalRequests.map((request) => ({
                id: request.id,
                title: request.disposalNo,
                href: `/${locale}/disposal/${request.id}`,
                meta: `${request.asset.assetTag} - ${request.asset.name} / ${formatDateTime(request.requestDate)}`,
                badge: tDisposal(`statuses.${request.requestStatus}`),
                tone: request.requestStatus === "rejected" ? "danger" : request.requestStatus === "disposed" ? "success" : "warning",
              }))}
            />
          </ContentPanel>
        </aside>
      </div>
    </div>
  )
}

// A row link in a panel is a quiet grouping (2D-2 R4) with the shared row hover.
const quietRowLinkClasses = cn(
  "block rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
)

function MiniList({
  title,
  emptyLabel,
  items,
}: {
  title?: string
  emptyLabel: string
  items: Array<{
    id: string
    title: string
    href: string
    meta: string
    badge?: string
    tone?: string
  }>
}) {
  return (
    <div>
      {title ? <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3> : null}
      {items.length === 0 ? (
        <EmptyNote>{emptyLabel}</EmptyNote>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className={quietRowLinkClasses}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-meta text-muted-foreground">{item.meta}</div>
                </div>
                {item.badge ? <StatusBadge label={item.badge} tone={item.tone} /> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// null when the person has no role on the ticket: the cell shows Nil.
function formatRoleLabels(roles: string[], t: (key: string) => string) {
  if (roles.length === 0) return null
  return roles.map((role) => t(`maintenanceRole_${role}`)).join(" / ")
}

function getAuditRoundStatusLabel(status: string, tAuditRound: (key: string) => string) {
  return tAuditRound(auditRoundStatusLabelKey(status) ?? "statusOpen")
}
