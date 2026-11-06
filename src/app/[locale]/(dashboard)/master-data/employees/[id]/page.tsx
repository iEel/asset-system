import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Boxes, Edit, History, LogIn, LogOut, ShieldCheck, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { buildEmployeeDetailHrefs, buildEmployeePageHref, dedupeEmployeeMaintenanceLinks, isFormerEmployee } from "@/lib/employee-detail"
import {
  isEmployeeLoanOverdue,
  parseEmployeeHeldPage,
  readEmployeePage,
  type EmployeeHeldAssetRow,
  type EmployeePageDb,
} from "@/lib/employee-page-data"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"
import { getAuditRoundItemResultLabelKey } from "@/lib/audit-round-result-filters"
import { auditRoundResultBadge } from "@/lib/audit-round-page-rules"
import { auditRoundStatusLabelKey, effectiveAuditRoundStatus } from "@/lib/audit-round-status"
import { getStatusTone } from "@/lib/status-tone"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { FactStrip } from "@/components/ui/fact-strip"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendMasterDataReturnTo, normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type EmployeeDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; heldPage?: string | string[] }>
}

type Translate = (key: string, values?: Record<string, string | number>) => string

// The employee page (group 7 plan 2 Task 3, spec §5.2, board MD-Employee): who the person is, a warning when a former
// employee still holds assets, every held asset (paged at 25) with its handover or ข้อมูลเก่า, its last audit and its
// รับคืน, the open handovers split into regular use and loans, then the history, repairs, audit, disposal and the
// user-account line. Every read is readEmployeePage (Task 2).
export default async function EmployeeDetailPage({ params, searchParams }: EmployeeDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "employees", rawSearchParams.returnTo)
  const user = await requirePagePermission(locale, "employee", "view")
  const canViewUsers = hasPermission(user, "user", "view")
  const canEditAssets = hasPermission(user, "asset", "edit")

  const data = await readEmployeePage(prisma as unknown as EmployeePageDb, id, { canViewUsers }, { heldPage: parseEmployeeHeldPage(rawSearchParams.heldPage) })
  if (!data) notFound()
  const { employee } = data

  const [t, tCommon, tMaintenance, tFinding, tAuditRound, tDisposal, tAll] = await Promise.all([
    getTranslations("employee"),
    getTranslations("common"),
    getTranslations("maintenancePage"),
    getTranslations("auditFinding"),
    getTranslations("auditRound"),
    getTranslations("disposalPage"),
    getTranslations(),
  ])
  const tDetail = (key: string, values?: Record<string, string | number>) => t(`detail.${key}`, values)
  const formatAuditItemStatus = (status: string) => {
    const key = getAuditItemStatusLabelKey(status)
    return key ? tFinding(key) : status
  }
  const formatAuditItemOutcome = (result: string | null, status: string) => {
    const resultKey = getAuditRoundItemResultLabelKey(result)
    if (resultKey) return tAuditRound(resultKey)
    return result || formatAuditItemStatus(status)
  }

  const now = new Date()
  const hrefs = buildEmployeeDetailHrefs({ locale, employeeId: id })
  const editHref = appendMasterDataReturnTo(hrefs.edit, returnToHref)
  // The page's own address, the list and the held page kept: the forms come back here (normalizeAssetReturnTo).
  const pageHref = buildEmployeePageHref(locale, employee.id, { returnTo: returnToHref, heldPage: data.held.page })
  const heldPageHref = (heldPage: number) => `${buildEmployeePageHref(locale, employee.id, { returnTo: returnToHref, heldPage })}#held`
  const canHandOver = canEditAssets && !isFormerEmployee(employee)
  const handOverHref = appendReturnTo(`/${locale}/asset-management/checkout?custodianId=${employee.id}`, pageHref)
  const heldTotalPages = Math.max(1, Math.ceil(data.held.total / data.held.pageSize))
  const openHandoverCount = data.openHandovers.regular + data.openHandovers.loans

  const maintenanceRoleLinks = dedupeEmployeeMaintenanceLinks(
    data.repairs.flatMap((ticket) => [
      ...(ticket.reportedById === id ? [{ id: ticket.id, role: "reported" as const }] : []),
      ...(ticket.assignedToId === id ? [{ id: ticket.id, role: "assigned" as const }] : []),
      ...(ticket.inspectedById === id ? [{ id: ticket.id, role: "inspected" as const }] : []),
    ])
  )
  const maintenanceRoleMap = new Map(maintenanceRoleLinks.map((link) => [link.id, link.roles]))
  const maintenanceStatusLabels = Object.fromEntries(maintenanceStatuses.map((status) => [status, tMaintenance(`statuses.${status}`)]))

  const heldLabels: HeldLabels = {
    tDetail,
    reason: (key) => tAll(key),
    auditResult: (key) => tAuditRound(key),
  }

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
            <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employee.employmentStatus === "active" ? "success" : "warning"} />
            {employee.isActive ? null : <StatusBadge label={tDetail("recordInactive")} tone="muted" />}
            {employee.position ? <span>{employee.position}</span> : null}
            {employee.email ? <span>{employee.email}</span> : null}
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <>
            <Link href={editHref} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Edit aria-hidden="true" />
              {tCommon("edit")}
            </Link>
            {/* Plan 4 (spec §5.3) puts "รับคืนหลายรายการ" here, before the primary action, for a viewer with asset:edit. */}
            {canHandOver ? (
              <Link href={handOverHref} className={buttonVariants({ size: "md" })}>
                <LogOut aria-hidden="true" />
                {tDetail("handOverToPerson")}
              </Link>
            ) : null}
          </>
        }
      />

      {data.warning ? (
        <Notice tone="warning" title={tDetail("formerHoldingTitle", { count: formatCount(data.warning.heldCount) })}>
          {tDetail("formerHoldingHelp")}
        </Notice>
      ) : null}

      <FactStrip
        label={tDetail("orgLabel")}
        items={[
          { key: "company", label: t("company"), value: employee.company.nameTh, sub: <span className="tag">{employee.company.code}</span> },
          { key: "branch", label: t("branch"), value: employee.branch.name, sub: <span className="tag">{employee.branch.code}</span> },
          { key: "department", label: t("department"), value: employee.department.name, sub: <span className="tag">{employee.department.code}</span> },
          {
            key: "manager",
            label: t("manager"),
            value: employee.manager ? (
              <Link href={`/${locale}/master-data/employees/${employee.manager.id}`} className={linkVariants({ size: "inherit" })}>{employee.manager.fullNameTh}</Link>
            ) : null,
            sub: employee.manager ? <span className="tag">{employee.manager.code}</span> : null,
          },
        ]}
      />

      <StatStrip
        items={[
          { key: "held", label: tDetail("heldStat"), value: formatCount(data.held.total), foot: tDetail("heldStatFoot"), href: hrefs.assets },
          {
            key: "openHandovers",
            label: tDetail("openHandovers"),
            value: formatCount(openHandoverCount),
            foot: tDetail("openHandoversFoot", {
              regular: formatCount(data.openHandovers.regular),
              loans: formatCount(data.openHandovers.loans),
              overdue: formatCount(data.openHandovers.overdueLoans),
            }),
            attention: data.openHandovers.overdueLoans > 0,
          },
          { key: "openMaintenance", label: t("detailOpenMaintenance"), value: formatCount(data.counts.openMaintenanceCount), foot: t("detailOpenMaintenanceHelp"), attention: data.counts.openMaintenanceCount > 0 },
          { key: "pendingAudit", label: t("detailPendingAudit"), value: formatCount(data.counts.pendingAuditFindingCount), foot: t("detailPendingAuditHelp"), attention: data.counts.pendingAuditFindingCount > 0 },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <ContentPanel
            id="held"
            divided
            flush
            title={tDetail("heldTitle")}
            description={tDetail("heldCount", { count: formatCount(data.held.total) })}
            actions={data.held.total > 0 ? <Link href={hrefs.assets} className={linkVariants({ size: "meta" })}>{tDetail("viewInRegister")}</Link> : null}
          >
            {data.held.rows.length === 0 ? (
              <div className="px-4 py-4 md:px-5">
                <ActionEmptyState icon={<Boxes className="h-6 w-6" />} title={tDetail("emptyHeldTitle")} description={tDetail("emptyHeldHelp")} />
              </div>
            ) : (
              <>
                <ContentPanelRows className="md:hidden">
                  {data.held.rows.map((row) => (
                    <li key={row.assetId}>
                      <HeldCard row={row} locale={locale} pageHref={pageHref} canEdit={canEditAssets} now={now} labels={heldLabels} />
                    </li>
                  ))}
                </ContentPanelRows>
                <DataTable framed={false} className="hidden md:block" caption={tDetail("heldTitle")} scrollHint={tCommon("tableScrollHint")}>
                  <DataTableHeader>
                    <tr>
                      <DataTableHead>{tDetail("colPhoto")}</DataTableHead>
                      <DataTableHead>{tDetail("colAsset")}</DataTableHead>
                      <DataTableHead>{tDetail("colStatusLocation")}</DataTableHead>
                      <DataTableHead>{tDetail("colHandover")}</DataTableHead>
                      <DataTableHead>{tDetail("colLastAudit")}</DataTableHead>
                      {/* รับคืน is the page's main action: pinned right so it stays in view beside the 340px aside (xl). */}
                      <DataTableHead align="right" sticky="right" hideLabel>{tDetail("colActions")}</DataTableHead>
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {data.held.rows.map((row) => (
                      <DataTableRow key={row.assetId} data-employee-held-row="">
                        <DataTableCell><AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} /></DataTableCell>
                        <DataTableCell className="min-w-48">
                          <HeldAssetName row={row} locale={locale} />
                        </DataTableCell>
                        <DataTableCell className="min-w-36">
                          <HeldStatusLocation row={row} />
                        </DataTableCell>
                        <DataTableCell className="min-w-40">
                          <HeldHandover row={row} locale={locale} pageHref={pageHref} canEdit={canEditAssets} now={now} labels={heldLabels} />
                        </DataTableCell>
                        <DataTableCell className="min-w-32">
                          <HeldLastAudit row={row} locale={locale} labels={heldLabels} />
                        </DataTableCell>
                        <DataTableCell align="right" sticky="right">
                          <HeldReturnAction row={row} pageHref={pageHref} locale={locale} canEdit={canEditAssets} labels={heldLabels} />
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
                {heldTotalPages > 1 ? (
                  <Pagination
                    page={data.held.page}
                    totalPages={heldTotalPages}
                    previousHref={heldPageHref(data.held.page - 1)}
                    nextHref={heldPageHref(data.held.page + 1)}
                    className="border-t border-border px-4 py-3 md:px-5"
                    labels={{
                      navigation: tCommon("pagination"),
                      previous: tCommon("previous"),
                      next: tCommon("next"),
                      pageOf: tCommon("pageOf", { page: data.held.page, total: heldTotalPages }),
                      range: tCommon("showingRange", {
                        from: formatCount((data.held.page - 1) * data.held.pageSize + 1),
                        to: formatCount(Math.min(data.held.page * data.held.pageSize, data.held.total)),
                        total: formatCount(data.held.total),
                      }),
                    }}
                  />
                ) : null}
              </>
            )}
          </ContentPanel>

          <ContentPanel divided flush title={t("handoverHistoryTitle")} description={tDetail("historyHelp")}>
            {data.handoverHistory.length === 0 ? (
              <div className="px-4 py-4 md:px-5">
                <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("emptyHandoverTitle")} description={t("emptyHandoverHelp")} />
              </div>
            ) : (
              <DataTable framed={false} caption={t("handoverHistoryTitle")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{tDetail("colAsset")}</DataTableHead>
                    <DataTableHead>{tDetail("colHandover")}</DataTableHead>
                    <DataTableHead>{tDetail("colHandoverDate")}</DataTableHead>
                    <DataTableHead>{tDetail("colReturn")}</DataTableHead>
                    <DataTableHead>{tDetail("colStatus")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {data.handoverHistory.map((checkout) => {
                    const loan = checkout.handoverMode === "temporary_loan"
                    const overdue = !checkout.isReturned && loan && isEmployeeLoanOverdue(checkout.expectedReturnDate, now)
                    const checkin = checkout.checkins[0]
                    return (
                      <DataTableRow key={checkout.id}>
                        <DataTableCell className="min-w-52">
                          <Link href={`/${locale}/assets/${checkout.asset.id}`} className={linkVariants({ size: "inherit" })}>{checkout.asset.name}</Link>
                          <div className="text-meta text-muted-foreground"><span className="tag">{checkout.asset.assetTag}</span></div>
                        </DataTableCell>
                        <DataTableCell className="min-w-40">
                          {checkout.documentNo ? <span className="tag">{checkout.documentNo}</span> : orNil(null)}
                          <div className="text-meta text-muted-foreground">
                            {loan ? tDetail("handoverLoan") : tDetail("handoverRegular")}
                            {loan && checkout.expectedReturnDate ? <> · {tDetail("loanDue", { date: formatDate(checkout.expectedReturnDate) })}</> : null}
                          </div>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(checkout.checkoutDate)}</DataTableCell>
                        <DataTableCell className="min-w-36 text-muted-foreground">
                          {checkin?.returnDate ? formatDate(checkin.returnDate) : orNil(null)}
                          {checkin?.receiveBy ? <div className="text-meta">{tDetail("returnedBy", { name: checkin.receiveBy })}</div> : null}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          {checkout.isReturned ? (
                            <StatusBadge label={tDetail("historyReturned")} tone="success" />
                          ) : overdue ? (
                            <StatusBadge label={tDetail("historyOverdue")} tone="warning" />
                          ) : (
                            <StatusBadge label={tDetail("historyHolding")} tone="info" />
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </DataTableBody>
              </DataTable>
            )}
          </ContentPanel>

          <ContentPanel divided flush title={t("maintenanceRelatedTitle")} description={t("maintenanceRelatedHelp")}>
            {data.repairs.length === 0 ? (
              <div className="px-4 py-4 md:px-5">
                <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyMaintenanceTitle")} description={t("emptyMaintenanceHelp")} />
              </div>
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
                  {data.repairs.map((ticket) => (
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

        <aside className="min-w-0 space-y-6">
          <ContentPanel title={t("followUpTitle")} description={t("followUpHelp")}>
            {data.followUpItems.length === 0 ? (
              <ActionEmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t("followUpEmptyTitle")} description={t("followUpEmptyHelp")} />
            ) : (
              <div className="space-y-3">
                {/* Each item is something to deal with now: a warning Notice, its help as the second line (spec 2D D7). */}
                {data.followUpItems.map((item) => (
                  <Notice key={item} tone="warning" title={t(`followUp.${item}.title`, { count: formatCount(data.openHandovers.overdueLoans) })}>
                    {t(`followUp.${item}.help`)}
                  </Notice>
                ))}
              </div>
            )}
          </ContentPanel>

          <ContentPanel title={t("auditRelatedTitle")} description={t("auditRelatedHelp")}>
            <div className="space-y-4">
              <MiniList
                title={t("auditFindingsTitle")}
                emptyLabel={t("emptyAuditFindings")}
                items={data.auditFindings.map((finding) => ({
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
                items={data.auditItems.map((item) => ({
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
                items={data.auditRounds.map((round) => ({
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
              items={data.disposalRequests.map((request) => ({
                id: request.id,
                title: request.disposalNo,
                href: `/${locale}/disposal/${request.id}`,
                meta: `${request.asset.assetTag} - ${request.asset.name} / ${formatDateTime(request.requestDate)}`,
                badge: tDisposal(`statuses.${request.requestStatus}`),
                tone: request.requestStatus === "rejected" ? "danger" : request.requestStatus === "disposed" ? "success" : "warning",
              }))}
            />
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

          {/* The user-account line only for user:view (Global Constraints); account is null both for no user and no permission. */}
          {canViewUsers ? (
            <ContentPanel title={tDetail("accountTitle")}>
              {data.account ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag">{data.account.username}</span>
                  <StatusBadge label={data.account.isActive ? tDetail("accountActive") : tDetail("accountInactive")} tone={data.account.isActive ? "success" : "muted"} />
                </div>
              ) : (
                <EmptyNote>{tDetail("noAccount")}</EmptyNote>
              )}
            </ContentPanel>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

type HeldLabels = {
  tDetail: Translate
  // The return form's own reason (HeldAssetReturnBlock.reasonKey is a full message key).
  reason: (key: string) => string
  auditResult: (key: string) => string
}

type HeldRowProps = { row: EmployeeHeldAssetRow; locale: string; pageHref: string; canEdit: boolean; now: Date; labels: HeldLabels }

function HeldAssetName({ row, locale }: { row: EmployeeHeldAssetRow; locale: string }) {
  return (
    <>
      <Link href={`/${locale}/assets/${row.assetId}`} className={cn(linkVariants({ size: "inherit" }), "[overflow-wrap:anywhere]")}>{row.name}</Link>
      <div className="text-meta text-muted-foreground"><span className="tag">{row.assetTag}</span></div>
    </>
  )
}

function HeldStatusLocation({ row }: { row: EmployeeHeldAssetRow }) {
  return (
    <>
      <StatusBadge label={row.status.nameTh} tone={getAssetStateTone(row.status.name)} />
      <div className="mt-1 text-meta text-muted-foreground">{row.location.name}</div>
    </>
  )
}

// The open handover: its HO- and kind, a loan's due date (warning once past, G7P2-R4); else ข้อมูลเก่า and the way to
// backfill it, the return form's legacy path (the only backfill there is: it creates the HO- and continues to รับคืน).
function HeldHandover({ row, locale, pageHref, canEdit, now, labels }: HeldRowProps) {
  const { tDetail } = labels
  if (row.handover) {
    const loan = row.handover.kind === "loan"
    const overdue = loan && isEmployeeLoanOverdue(row.handover.dueDate, now)
    return (
      <>
        {row.handover.documentNo ? <span className="tag">{row.handover.documentNo}</span> : orNil(null)}
        <div className={cn("text-meta", overdue ? "text-warning" : "text-muted-foreground")}>
          {loan ? tDetail("handoverLoan") : tDetail("handoverRegular")}
          {" · "}
          {loan && row.handover.dueDate
            ? tDetail(overdue ? "loanOverdue" : "loanDue", { date: formatDate(row.handover.dueDate) })
            : tDetail("handedOverOn", { date: formatDate(row.handover.checkoutDate) })}
        </div>
      </>
    )
  }
  if (!row.legacy) return orNil(null)
  return (
    <>
      <StatusBadge label={tDetail("legacy")} tone="warning" />
      {canEdit && !row.returnBlock ? (
        <div className="mt-1">
          <Link href={appendReturnTo(`/${locale}/asset-management/checkin?assetId=${row.assetId}`, pageHref)} className={linkVariants({ size: "meta" })}>
            {tDetail("createBackfill")}
          </Link>
        </div>
      ) : null}
    </>
  )
}

function HeldLastAudit({ row, locale, labels }: { row: EmployeeHeldAssetRow; locale: string; labels: HeldLabels }) {
  if (!row.lastAudit) return <span className="text-meta text-faint-foreground">{labels.tDetail("noAudit")}</span>
  const badge = auditRoundResultBadge(row.lastAudit.status, row.lastAudit.result)
  return (
    <>
      <StatusBadge label={labels.auditResult(badge.labelKey)} tone={badge.tone} />
      <div className="mt-1 text-meta text-muted-foreground">
        <Link href={`/${locale}/audit/rounds/${row.lastAudit.roundId}`} className={linkVariants({ size: "inherit" })}><span className="tag">{row.lastAudit.roundNo}</span></Link>
        {row.lastAudit.checkedAt ? <> · {formatDate(row.lastAudit.checkedAt)}</> : null}
      </div>
    </>
  )
}

// รับคืน (asset:edit, as the return form): the open handover by checkoutId, a held asset with no handover by assetId (the
// legacy path), back to this page. A machine the return form would refuse shows it disabled with the form's reason (G7P2-R3).
function HeldReturnAction({ row, locale, pageHref, canEdit, labels }: { row: EmployeeHeldAssetRow; locale: string; pageHref: string; canEdit: boolean; labels: HeldLabels }) {
  if (!canEdit) return null
  if (row.returnBlock) {
    return (
      <div className="grid justify-items-start gap-1">
        <span aria-disabled="true" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <LogIn aria-hidden="true" />
          {labels.tDetail("return")}
        </span>
        <span className="max-w-48 text-meta text-muted-foreground text-pretty">{labels.reason(row.returnBlock.reasonKey)}</span>
      </div>
    )
  }
  const checkinPath = row.handover
    ? `/${locale}/asset-management/checkin?checkoutId=${row.handover.id}`
    : `/${locale}/asset-management/checkin?assetId=${row.assetId}`
  return (
    <Link href={appendReturnTo(checkinPath, pageHref)} aria-label={labels.tDetail("returnAsset", { asset: `${row.assetTag} ${row.name}` })} className={buttonVariants({ variant: "outline", size: "sm" })}>
      <LogIn aria-hidden="true" />
      {labels.tDetail("return")}
    </Link>
  )
}

// The phone card: the same facts as a table row, stacked (the round page's MachineCard pattern).
function HeldCard(props: HeldRowProps) {
  const { row, locale, labels } = props
  return (
    <article className="flex items-start gap-3" data-employee-held-card="">
      <AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} />
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="text-sm font-medium">
          <HeldAssetName row={row} locale={locale} />
        </div>
        <div><HeldStatusLocation row={row} /></div>
        <div className="text-sm"><HeldHandover {...props} /></div>
        <div className="text-sm"><HeldLastAudit row={row} locale={locale} labels={labels} /></div>
        <HeldReturnAction row={row} locale={locale} pageHref={props.pageHref} canEdit={props.canEdit} labels={labels} />
      </div>
    </article>
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
