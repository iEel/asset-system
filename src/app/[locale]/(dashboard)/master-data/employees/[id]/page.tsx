import type React from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ClipboardCheck,
  Edit,
  History,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  Wrench,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildEmployeeDetailHrefs, buildEmployeeDetailSummary, buildEmployeeFollowUpItems, dedupeEmployeeMaintenanceLinks } from "@/lib/employee-detail"
import { formatDate, formatDateTime } from "@/lib/utils"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { StatusBadge } from "@/components/ui/status-badge"

type EmployeeDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "employee", "view")

  const t = await getTranslations("employee")
  const tCommon = await getTranslations("common")
  const tMaintenance = await getTranslations("maintenancePage")
  const tFinding = await getTranslations("auditFinding")
  const tDisposal = await getTranslations("disposalPage")

  const employee = await prisma.employee.findFirst({
    where: { id, isActive: true },
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
    repairStatus: { not: "closed" },
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
        status: { select: { nameTh: true, colorCode: true } },
        condition: { select: { nameTh: true, colorCode: true } },
      },
      orderBy: { assetTag: "asc" },
      take: 10,
    }),
    prisma.assetCheckout.count({ where: { custodianId: id, isReturned: false } }),
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
        checkin: {
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
        dueDate: true,
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
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: hrefs.list },
                { label: employee.code },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{employee.fullNameTh}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {employee.code} / {[employee.position, employee.email].filter(Boolean).join(" / ") || t("noContactDetail")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={hrefs.list}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <Link
            href={hrefs.edit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Edit className="h-4 w-4" />
            {tCommon("edit")}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryTile icon={<Boxes className="h-5 w-5" />} label={t("detailCurrentAssets")} value={summary.currentAssetCount} detail={t("detailCurrentAssetsHelp")} href={hrefs.assets} />
        <SummaryTile icon={<History className="h-5 w-5" />} label={t("detailOpenCheckouts")} value={summary.openCheckoutCount} detail={t("detailOpenCheckoutsHelp")} tone={summary.openCheckoutCount > 0 ? "warning" : "neutral"} />
        <SummaryTile icon={<Wrench className="h-5 w-5" />} label={t("detailOpenMaintenance")} value={summary.openMaintenanceCount} detail={t("detailOpenMaintenanceHelp")} tone={summary.openMaintenanceCount > 0 ? "warning" : "neutral"} />
        <SummaryTile icon={<ClipboardCheck className="h-5 w-5" />} label={t("detailPendingAudit")} value={summary.pendingAuditFindingCount} detail={t("detailPendingAuditHelp")} tone={summary.pendingAuditFindingCount > 0 ? "warning" : "neutral"} />
        <SummaryTile icon={<AlertTriangle className="h-5 w-5" />} label={t("detailAttention")} value={summary.attentionCount} detail={t("detailAttentionHelp")} tone={summary.attentionCount > 0 ? "warning" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading icon={<UserRound className="h-5 w-5 text-primary" />} title={t("detailProfileTitle")} subtitle={t("detailProfileHelp")} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("company")} value={`${employee.company.code} - ${employee.company.nameTh}`} />
              <Info label={t("branch")} value={`${employee.branch.code} - ${employee.branch.name}`} />
              <Info label={t("department")} value={`${employee.department.code} - ${employee.department.name}`} />
              <Info label={t("position")} value={employee.position} />
              <Info label={t("email")} value={employee.email} />
              <Info label={t("manager")} value={employee.manager ? `${employee.manager.code} - ${employee.manager.fullNameTh}` : null} />
              <div>
                <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{t("employmentStatus")}</div>
                <div className="mt-1">
                  <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employee.employmentStatus === "active" ? "success" : "warning"} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading icon={<Boxes className="h-5 w-5 text-primary" />} title={t("detailCurrentAssets")} subtitle={t("detailCurrentAssetsSectionHelp", { shown: currentAssets.length, total: currentAssetCount })} />
            {currentAssets.length === 0 ? (
              <ActionEmptyState icon={<Boxes className="h-6 w-6" />} title={t("emptyCurrentAssetsTitle")} description={t("emptyCurrentAssetsHelp")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <ColumnHeader>{t("assetTag")}</ColumnHeader>
                      <ColumnHeader>{t("assetName")}</ColumnHeader>
                      <ColumnHeader>{t("assetCategory")}</ColumnHeader>
                      <ColumnHeader>{t("assetLocation")}</ColumnHeader>
                      <ColumnHeader>{t("assetStatus")}</ColumnHeader>
                      <ColumnHeader>{t("assetCondition")}</ColumnHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {currentAssets.map((asset) => (
                      <tr key={asset.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                          <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                            {asset.assetTag}
                          </Link>
                        </td>
                        <td className="min-w-56 px-4 py-3 text-foreground">{asset.name}</td>
                        <td className="min-w-44 px-4 py-3 text-muted-foreground">{asset.category.code} - {asset.category.name}</td>
                        <td className="min-w-44 px-4 py-3 text-muted-foreground">{asset.currentLocation.code} - {asset.currentLocation.name}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge label={asset.status.nameTh} tone="info" size="xs" /></td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge label={asset.condition.nameTh} tone="muted" size="xs" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {currentAssetCount > 0 ? (
              <div className="mt-4">
                <Link href={hrefs.assets} className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent">
                  {t("viewAllAssets")}
                </Link>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading icon={<History className="h-5 w-5 text-primary" />} title={t("handoverHistoryTitle")} subtitle={t("handoverHistoryHelp")} />
            {checkoutHistory.length === 0 ? (
              <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("emptyHandoverTitle")} description={t("emptyHandoverHelp")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <ColumnHeader>{t("documentNo")}</ColumnHeader>
                      <ColumnHeader>{t("asset")}</ColumnHeader>
                      <ColumnHeader>{t("checkoutDate")}</ColumnHeader>
                      <ColumnHeader>{t("expectedReturnDate")}</ColumnHeader>
                      <ColumnHeader>{t("returnDate")}</ColumnHeader>
                      <ColumnHeader>{t("handoverBy")}</ColumnHeader>
                      <ColumnHeader>{t("receiveBy")}</ColumnHeader>
                      <ColumnHeader>{tCommon("status")}</ColumnHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {checkoutHistory.map((checkout) => (
                      <tr key={checkout.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{checkout.documentNo || "-"}</td>
                        <td className="min-w-56 px-4 py-3">
                          <Link href={`/${locale}/assets/${checkout.asset.id}`} className="text-primary hover:underline">
                            {checkout.asset.assetTag} - {checkout.asset.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(checkout.checkoutDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(checkout.expectedReturnDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(checkout.checkin?.returnDate)}</td>
                        <td className="min-w-36 px-4 py-3 text-muted-foreground">{checkout.checkedOutBy || "-"}</td>
                        <td className="min-w-36 px-4 py-3 text-muted-foreground">{checkout.checkin?.receiveBy || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge label={checkout.isReturned ? t("handoverReturned") : t("handoverOpen")} tone={checkout.isReturned ? "success" : "warning"} size="xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading icon={<Wrench className="h-5 w-5 text-primary" />} title={t("maintenanceRelatedTitle")} subtitle={t("maintenanceRelatedHelp")} />
            {maintenanceTickets.length === 0 ? (
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyMaintenanceTitle")} description={t("emptyMaintenanceHelp")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <ColumnHeader>{tMaintenance("repairNo")}</ColumnHeader>
                      <ColumnHeader>{tMaintenance("asset")}</ColumnHeader>
                      <ColumnHeader>{t("employeeRole")}</ColumnHeader>
                      <ColumnHeader>{tMaintenance("reportedDate")}</ColumnHeader>
                      <ColumnHeader>{tMaintenance("dueDate")}</ColumnHeader>
                      <ColumnHeader>{tCommon("status")}</ColumnHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {maintenanceTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                          <Link href={`/${locale}/maintenance/${ticket.id}`} className="text-primary hover:underline">
                            {ticket.repairNo}
                          </Link>
                        </td>
                        <td className="min-w-56 px-4 py-3">
                          <Link href={`/${locale}/assets/${ticket.asset.id}`} className="text-primary hover:underline">
                            {ticket.asset.assetTag} - {ticket.asset.name}
                          </Link>
                        </td>
                        <td className="min-w-44 px-4 py-3 text-muted-foreground">{formatRoleLabels(maintenanceRoleMap.get(ticket.id) ?? [], t)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(ticket.reportedDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(ticket.dueDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} size="xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading icon={<AlertTriangle className="h-5 w-5 text-primary" />} title={t("followUpTitle")} subtitle={t("followUpHelp")} />
            {followUpItems.length === 0 ? (
              <ActionEmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t("followUpEmptyTitle")} description={t("followUpEmptyHelp")} />
            ) : (
              <div className="space-y-3">
                {followUpItems.map((item) => (
                  <div key={item} className="rounded-md border border-warning/40 bg-warning/5 p-3">
                    <div className="text-sm font-semibold text-foreground">{t(`followUp.${item}.title`)}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t(`followUp.${item}.help`)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading icon={<Users className="h-5 w-5 text-primary" />} title={t("subordinatesTitle")} />
            {employee.subordinates.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("noSubordinates")}</div>
            ) : (
              <div className="space-y-3">
                {employee.subordinates.map((subordinate) => (
                  <Link key={subordinate.id} href={`/${locale}/master-data/employees/${subordinate.id}`} className="block rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                    <div className="text-sm font-semibold text-foreground">{subordinate.code} - {subordinate.fullNameTh}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{subordinate.position || "-"}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading icon={<ClipboardCheck className="h-5 w-5 text-primary" />} title={t("auditRelatedTitle")} subtitle={t("auditRelatedHelp")} />
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
                  meta: `${item.auditRound.auditNo} / ${item.auditResult || item.auditStatus}`,
                  badge: item.findingRequired ? t("auditItemHasFinding") : item.auditStatus,
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
                  badge: getAuditRoundStatusLabel(round.status, t),
                  tone: round.status === "closed" ? "success" : "info",
                }))}
              />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading icon={<Trash2 className="h-5 w-5 text-primary" />} title={t("disposalRelatedTitle")} subtitle={t("disposalRelatedHelp")} />
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
          </section>
        </aside>
      </div>
    </div>
  )
}

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
}

function SummaryTile({
  icon,
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  icon: React.ReactNode
  label: string
  value: number
  detail: string
  href?: string
  tone?: "neutral" | "warning"
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className={tone === "warning" ? "text-warning" : "text-primary"}>{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </>
  )
  const className = `rounded-lg border bg-surface p-4 shadow-sm ${
    tone === "warning" ? "border-warning/40" : "border-border"
  } ${href ? "transition-colors hover:border-primary/40 hover:bg-primary/5" : ""}`

  if (href) return <Link href={href} className={className}>{content}</Link>
  return <div className={className}>{content}</div>
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || "-"}</div>
    </div>
  )
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}

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
      {title ? <div className="mb-2 text-sm font-semibold text-foreground">{title}</div> : null}
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="block rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.meta}</div>
                </div>
                {item.badge ? <StatusBadge label={item.badge} tone={item.tone} size="xs" /> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function formatRoleLabels(roles: string[], t: (key: string) => string) {
  if (roles.length === 0) return "-"
  return roles.map((role) => t(`maintenanceRole_${role}`)).join(" / ")
}

function getAuditRoundStatusLabel(status: string, t: (key: string) => string) {
  if (status === "draft") return t("auditRoundStatusDraft")
  if (status === "open") return t("auditRoundStatusOpen")
  if (status === "closed") return t("auditRoundStatusClosed")
  return status
}
