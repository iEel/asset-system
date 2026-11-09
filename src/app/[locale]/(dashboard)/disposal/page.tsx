import type { ComponentProps } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ChevronRight, Download, Layers, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { buildDisposalQueryString, buildDisposalWhere, disposalTypeFilters, getDisposalDateRangeError, parseDisposalListParams, loadAuditRoundDisposalFindingIds, type DisposalListParams } from "@/lib/disposal-query"
import { formatCount, formatMoney } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalBatchMenu, DisposalRowActions, type DisposalRowNext } from "@/components/disposal/disposal-row-actions"
import {
  DisposalRoundSelectAll,
  DisposalRoundSelectionBar,
  DisposalRoundSelectionProvider,
  DisposalRoundTick,
  type DisposalRoundSelectionCopy,
} from "@/components/disposal/disposal-round-selection"
import { RepairDateRangeChip } from "@/components/maintenance/repair-date-range-chip"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterSelect } from "@/components/ui/filter-select"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getDisposalNextAction, getDisposalStage, type DisposalStage } from "@/lib/disposal-stage"
import {
  getDisposalDecisionStatusOptions,
  getDisposalApprovalSodReason,
  getDisposalSegregationError,
} from "@/lib/disposal-policy"
import { getDisposalRoundTickBlocks, type DisposalRoundBlockCode } from "@/lib/disposal-round-service"
import { disposalRoundSelectionScope } from "@/lib/disposal-round-selection"
import { bangkokDayDiff } from "@/lib/preventive-maintenance"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"
import { approvalInboxItemHref } from "@/lib/approval-inbox"

type DisposalPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<DisposalListParams>
}

// The disposal queue, board DP-Queue (group 6 spec §10): the header with ยื่นคำขอตัดจำหน่าย, รอบตัดจำหน่าย, ชุดคำขอ ▾ and
// ส่งออก; the five status tabs with counts as the only status filter; the search, the type and the request-date chip;
// six columns. The pending tab links each row to งานรออนุมัติ (plan 2). The approved tab (disposal:edit) takes ticks
// across pages, up to 200, for "สร้างรอบตัดจำหน่าย" (plan 4, P4-R2); the disposed tab names each request's round.
export default async function DisposalPage({ params, searchParams }: DisposalPageProps) {
  const { locale } = await params
  const filters = parseDisposalListParams(await searchParams)
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const canApprove = hasPermission(user, "disposal", "approve")
  const canEdit = hasPermission(user, "disposal", "edit")
  const canExport = hasPermission(user, "disposal", "export")
  const [t, tCommon, tAsset] = await Promise.all([getTranslations("disposalPage"), getTranslations("common"), getTranslations("asset")])
  const now = new Date()
  const query = buildDisposalQueryString(filters)
  const disposalReturnHref = `/${locale}/disposal${query ? `?${query}` : ""}`
  // "มาจากรอบตรวจนับ" (ยืนยันผลตรวจ plan 4): the round's number for the chip and its finding ids for the where.
  const [auditRoundFilter, auditRoundFindingIds] = filters.auditRound
    ? await Promise.all([
        prisma.auditRound.findUnique({ where: { id: filters.auditRound }, select: { auditNo: true } }),
        loadAuditRoundDisposalFindingIds(prisma, filters.auditRound),
      ])
    : [null, []]
  const requestWhere = buildDisposalWhere(filters, { auditRoundFindingIds })
  const stageWhere = buildDisposalWhere({ ...filters, status: "" }, { auditRoundFindingIds })
  // The approved tab's ticks (spec §10.2): only with disposal:edit, the permission a round needs.
  const roundSelectionEnabled = canEdit && filters.status === "approved"

  const [requests, total, stageTotal, stageCounts, savedSettings, statuses, approvedIds] = await Promise.all([
    prisma.disposalRequest.findMany({
      where: requestWhere,
      include: {
        asset: {
          select: {
            assetTag: true,
            name: true,
            status: { select: { name: true, nameTh: true } },
          },
        },
        batch: { select: { id: true, batchNo: true } },
        round: { select: { id: true, roundNo: true, executionDate: true } },
        requestedBy: { select: { code: true, fullNameTh: true } },
        approver: { select: { code: true, fullNameTh: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.disposalRequest.count({ where: requestWhere }),
    prisma.disposalRequest.count({ where: stageWhere }),
    prisma.disposalRequest.groupBy({ by: ["requestStatus"], where: stageWhere, _count: { _all: true } }),
    canApprove || canEdit
      ? prisma.systemSetting.findMany({
          where: { key: { in: [...workflowApprovalSettingKeys] } },
          select: { key: true, value: true },
        })
      : Promise.resolve([]),
    canApprove || canEdit
      ? prisma.assetStatus.findMany({
          where: { isActive: true },
          select: { id: true, name: true, nameTh: true },
          orderBy: { sortOrder: "asc" },
        })
      : Promise.resolve([]),
    // Every request of the filtered approved tab, all pages, in the list's order: "เลือกทั้ง" picks the first 200.
    roundSelectionEnabled
      ? prisma.disposalRequest.findMany({ where: requestWhere, select: { id: true }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ])
  // A page past the last one (an old link, or the last request of the last page decided elsewhere) shows the last
  // page, not an empty table that says "หน้า 4 จาก 3" (spec 2B I21, §5.9.1).
  const lastPage = lastListPage(total, filters.pageSize)
  if (requests.length === 0 && total > 0 && filters.page > lastPage) {
    redirect(`/${locale}/disposal?${buildDisposalQueryString(filters, { page: lastPage })}`)
  }
  const workflowPolicy = parseWorkflowApprovalPolicy(savedSettings)
  // The pending tab (group 6 spec §10.2, decision 3): no ticks here; each row links to its item in งานรออนุมัติ, where
  // bulk approval lives. A request the viewer asked for or created shows "ดู" with why they cannot decide it.
  const pendingInboxEnabled = canApprove && filters.status === "pending"
  const ownSodReason = (request: { requestedById: string; createdBy: string }) => {
    const reason = getDisposalApprovalSodReason({
      segregationRequired: workflowPolicy.segregationRequired,
      actorEmployeeId: user.employeeId,
      actorUserId: user.id,
      requestedById: request.requestedById,
      createdByUserId: request.createdBy,
    })
    return reason === "requester" || reason === "creator"
  }
  // "คุณพิจารณาได้ {a} จาก {b} รายการ": the filtered pending requests, less the viewer's own under segregation of duties.
  const ownPendingCount = pendingInboxEnabled && workflowPolicy.segregationRequired
    ? user.employeeId
      ? await prisma.disposalRequest.count({ where: { AND: [requestWhere, { OR: [{ requestedById: user.employeeId }, { createdBy: user.id }] }] } })
      : total
    : 0
  const pendingInboxNote = pendingInboxEnabled
    ? t("pendingInboxCount", { decidable: formatCount(Math.max(0, total - ownPendingCount)), total: formatCount(total) })
    : null
  // A tick is disabled with the reason the round's own preview would give (spec §10.2): the viewer approved it, or it
  // has no evidence (a system admin may record it with the round's evidence exception, so it stays tickable for them).
  const tickBlocks = roundSelectionEnabled
    ? await getDisposalRoundTickBlocks(prisma, approvedIds.map((request) => request.id), {
        userId: user.id,
        employeeId: user.employeeId,
        roles: user.roles,
        permissions: user.permissions,
      })
    : new Map<string, DisposalRoundBlockCode | null>()
  const tickReasons: Record<DisposalRoundBlockCode, string> = {
    DISPOSAL_SOD_CONFLICT: t("queue.roundTickApprover"),
    DISPOSAL_EVIDENCE_REQUIRED: t("queue.roundTickNoEvidence"),
    DISPOSAL_ASSET_INELIGIBLE: t("errors.DISPOSAL_ASSET_INELIGIBLE"),
    DISPOSAL_INVALID_STAGE: t("errors.DISPOSAL_INVALID_STAGE"),
    DISPOSAL_REQUEST_NOT_FOUND: t("errors.DISPOSAL_REQUEST_NOT_FOUND"),
    DISPOSAL_ROUND_LOST_METHOD: t("rounds.form.blocked.DISPOSAL_ROUND_LOST_METHOD"),
  }
  const tickableIds = approvedIds.map((request) => request.id).filter((id) => tickBlocks.get(id) === null)
  const roundSelectionCopy: DisposalRoundSelectionCopy = {
    barLabel: t("queue.roundBarLabel"),
    count: t.raw("queue.roundSelectedCount") as string,
    clear: t("queue.roundClear"),
    selectAll: t.raw("queue.roundSelectAll") as string,
    create: t.raw("queue.roundCreate") as string,
    limit: t("queue.roundLimit"),
    capped: t.raw("queue.roundCapped") as string,
  }
  const statusOptions = statuses.map((status) => ({ id: status.id, name: status.name, label: status.nameTh }))
  const decisionStatuses = getDisposalDecisionStatusOptions(statusOptions)
  const stageLabels = {
    pending_approval: t("statuses.pending"),
    awaiting_execution: t("statuses.approved"),
    complete: t("statuses.disposed"),
    rejected: t("statuses.rejected"),
  }
  const stageCountsByStatus = new Map(stageCounts.map((count) => [count.requestStatus, count._count._all]))
  const stageTabs: Array<{ status: "" | "pending" | "approved" | "disposed" | "rejected"; label: string; count: number }> = [
    { status: "", label: tCommon("all"), count: stageTotal },
    { status: "pending", label: stageLabels.pending_approval, count: stageCountsByStatus.get("pending") ?? 0 },
    { status: "approved", label: stageLabels.awaiting_execution, count: stageCountsByStatus.get("approved") ?? 0 },
    { status: "disposed", label: stageLabels.complete, count: stageCountsByStatus.get("disposed") ?? 0 },
    { status: "rejected", label: stageLabels.rejected, count: stageCountsByStatus.get("rejected") ?? 0 },
  ]
  const resultRange = paginationRange(filters.page, filters.pageSize, total)
  // The tabs are not a filter (spec §10.2): clearing the filters keeps the tab.
  const hasActiveFilters = Boolean(filters.search || filters.disposalType || filters.dateFrom || filters.dateTo || filters.auditRound)
  // The phone filter summary says how many filters are on (spec 2B §5.10 #5). It used to read "ล้างตัวกรอง" but only folded the panel.
  const activeFilterCount = [filters.search, filters.disposalType, filters.dateFrom, filters.dateTo, filters.auditRound].filter(Boolean).length
  // The round filter has no field: a removable chip says which round (— for an id that matches no round); removing it
  // keeps the tab and the other filters.
  const auditRoundChips = filters.auditRound
    ? [{
        key: "auditRound",
        label: t("filterAuditRound", { auditNo: auditRoundFilter?.auditNo ?? "—" }),
        href: `/${locale}/disposal?${buildDisposalQueryString(filters, { auditRound: "", page: 1 })}`,
      }]
    : []
  const clearHref = `/${locale}/disposal${filters.status ? `?status=${filters.status}` : ""}`
  const emptyState = disposalEmptyState({ locale, t, hasActiveFilters, canCreate, clearHref })
  const nextActionLabels: DisposalNextActionLabels = {
    view: tCommon("view"),
    review: t("reviewRequest"),
    openRequest: t("openRequest"),
    openBatch: t("openBatch"),
  }
  const inboxStepLabels: DisposalInboxStepLabels = { review: t("reviewInInbox"), view: tCommon("view"), ownNote: t("ownRequestNote") }
  const filterFormProps = { locale, filters, hasActiveFilters, clearHref, t, tCommon }
  // "{date} · {n} วัน" under the request number: whole Bangkok days since the request.
  const ageLabel = (date: Date) => {
    const days = Math.max(0, bangkokDayDiff(date, now))
    return days === 0 ? t("queue.ageToday") : t("queue.ageDays", { days: formatCount(days) })
  }
  const requesterName = (request: { requestedById: string; requestedBy: { fullNameTh: string } }) => (
    <>
      {request.requestedBy.fullNameTh}
      {user.employeeId && request.requestedById === user.employeeId ? <span className="text-muted-foreground"> {t("queue.you")}</span> : null}
    </>
  )
  const roundHref = (round: { id: string }) => `/${locale}/disposal/rounds/${round.id}`

  const list = (
    <ContentPanel
      divided
      flush
      title={t("requestList")}
      description={t("resultRange", { start: formatCount(resultRange.start), end: formatCount(resultRange.end), total: formatCount(total) })}
    >
      <div className="space-y-3 px-4 py-3 md:px-5">
        <TabNav
          aria-label={t("stageFilterLabel")}
          items={stageTabs.map((stage) => ({
            key: stage.status || "all",
            label: stage.label,
            count: formatCount(stage.count),
            href: `/${locale}/disposal?${buildDisposalQueryString(filters, { status: stage.status, page: 1 })}`,
          }))}
          current={filters.status || "all"}
        />
        <div className="flex items-center justify-end gap-1 text-meta text-muted-foreground sm:hidden">{t("stageScrollHint")}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></div>
        {/* The desktop filter sits under the tabs (board DP-Queue); the phone one folds above the panel. */}
        <div className="hidden md:block">
          <DisposalFilterForm formId="disposal-filter-desktop" {...filterFormProps} />
        </div>
        <FilterChipList chips={auditRoundChips} label={tAsset("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")} />
        {pendingInboxNote ? (
          <p data-disposal-inbox-note className="text-meta text-muted-foreground">
            {pendingInboxNote}
            {" · "}
            <Link href={`/${locale}/admin/approvals?tab=disposal`} className={linkVariants({ size: "inherit" })}>{t("pendingInboxLink")}</Link>
          </p>
        ) : null}
        {roundSelectionEnabled ? <p data-disposal-round-phone-note className="text-meta text-muted-foreground md:hidden">{t("queue.roundPhoneNote")}</p> : null}
        {/* Select all before any tick (spec §10.2): from md, while the tab has tickable rows. */}
        {roundSelectionEnabled ? <DisposalRoundSelectAll /> : null}
      </div>
      <div className={`${getMobileCardListClasses()} p-3`}>
        {requests.length === 0 ? <ActionEmptyState {...emptyState} /> : requests.map((request) => {
          const stage = getDisposalStage(request.requestStatus)
          const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
          return (
            <article key={request.id} className="min-w-0 rounded-md border border-border bg-background p-3">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2"><Link href={detailHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0")}><span className="tag font-medium">{request.disposalNo}</span></Link>{request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}><span className="tag">{request.batch.batchNo}</span></Link> : null}</div>
                <div><div className="text-sm font-medium text-foreground">{request.asset.name}</div><div className="mt-1 text-meta text-muted-foreground"><span className="tag">{request.asset.assetTag}</span></div></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /><Chip>{t(`types.${request.disposalType}`)}</Chip></div>
              <KeyValueList className="mt-3" items={[{ key: "requestedBy", label: t("requestedBy"), value: requesterName(request) }, { key: "requestDate", label: t("requestDate"), value: formatDateTime(request.requestDate) }]} />
              <details className="mt-3 border-t border-border-soft"><summary className="cursor-pointer py-3 text-sm font-medium text-primary">{t("moreDetails")}</summary><KeyValueList items={[{ key: "reason", label: t("reason"), value: request.reason }, { key: "approver", label: t("approver"), value: request.approver ? <><span className="tag">{request.approver.code}</span> - {request.approver.fullNameTh}</> : null }, { key: "value", label: t("value"), value: getRequestValue(request, tCommon("baht")) }]} /></details>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {pendingInboxEnabled ? <DisposalInboxStep own={ownSodReason(request)} inboxHref={approvalInboxItemHref(locale, "disposal", request.id)} detailHref={detailHref} labels={inboxStepLabels} />
                  : request.round ? <Link href={roundHref(request.round)} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1 text-sm")}><span className="tag">{request.round.roundNo}</span> · {formatDate(request.round.executionDate)}</Link>
                    : <DisposalNextAction request={request} href={detailHref} canApprove={canApprove} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} labels={nextActionLabels} />}
              </div>
            </article>
          )
        })}
      </div>
      <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("requestList")} scrollHint={tCommon("tableScrollHint")}>
        <DataTableHeader>
          <tr>
            {roundSelectionEnabled ? <DataTableHead hideLabel className="p-0 first:pl-0 md:first:pl-0">{t("queue.colSelect")}</DataTableHead> : null}
            <DataTableHead>{t("asset")}</DataTableHead>
            <DataTableHead>{t("queue.colNoStatus")}</DataTableHead>
            <DataTableHead>{t("queue.colType")}</DataTableHead>
            <DataTableHead>{t("requestedBy")}</DataTableHead>
            <DataTableHead align="right" sticky="right">{t("queue.colNext")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {requests.length === 0 ? (
            <TableEmptyRow colSpan={roundSelectionEnabled ? 6 : 5} emptyState={emptyState} />
          ) : requests.map((request) => {
            const stage = getDisposalStage(request.requestStatus)
            const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
            const tickBlock = tickBlocks.get(request.id)
            return (
              <ClickableTableRow key={request.id} href={detailHref} label={`${tCommon("view")}: ${request.disposalNo}`}>
                {roundSelectionEnabled ? (
                  <DataTableCell className="p-0 first:pl-0 md:first:pl-0">
                    <DisposalRoundTick
                      id={request.id}
                      label={t("queue.roundTickLabel", { name: `${request.asset.name} · ${request.disposalNo}` })}
                      disabled={tickBlock !== null}
                      reason={tickBlock ? tickReasons[tickBlock] : undefined}
                    />
                  </DataTableCell>
                ) : null}
                <DataTableCell className="min-w-48">
                  <div className="font-medium text-foreground">{request.asset.name}</div>
                  <div className="mt-1 text-meta text-muted-foreground"><span className="tag">{request.asset.assetTag}</span></div>
                </DataTableCell>
                <DataTableCell className="min-w-56">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={detailHref} className={cn(linkVariants({ size: "inherit" }), "text-foreground")}><span className="tag font-medium">{request.disposalNo}</span></Link>
                    <DisposalStageBadge stage={stage} label={stageLabels[stage]} />
                  </div>
                  <div className="mt-1 text-meta text-muted-foreground">{formatDateTime(request.requestDate)} · {ageLabel(request.requestDate)}</div>
                  {request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className={cn(linkVariants(), "mt-1 block")}><span className="tag">{request.batch.batchNo}</span></Link> : null}
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap">
                  <div className="text-foreground">{t(`types.${request.disposalType}`)}</div>
                  <div className="mt-1 text-meta text-muted-foreground num">{getRequestValue(request, tCommon("baht")) ?? t("queue.noValue")}</div>
                </DataTableCell>
                <DataTableCell className="min-w-36 text-foreground">{requesterName(request)}</DataTableCell>
                <DataTableCell align="right" sticky="right">
                  {pendingInboxEnabled ? <DisposalInboxStep own={ownSodReason(request)} inboxHref={approvalInboxItemHref(locale, "disposal", request.id)} detailHref={detailHref} labels={inboxStepLabels} row />
                    : request.round ? (
                      // The disposed tab's step is the round (spec §10.2): "DPR-… · {date}", linked.
                      <Link data-disposal-round-link href={`/${locale}/disposal/rounds/${request.round.id}`} className={cn(linkVariants({ size: "inherit" }), "whitespace-nowrap text-meta")}>
                        <span className="tag">{request.round.roundNo}</span> · {formatDate(request.round.executionDate)}
                      </Link>
                    )
                      : (
                        <>
                          <DisposalNextAction request={request} href={detailHref} row={{ menuLabel: tCommon("moreActionsFor", { code: request.disposalNo }), batchHref: request.batch ? `/${locale}/disposal/batches/${request.batch.id}` : undefined }} canApprove={canApprove} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} labels={nextActionLabels} />
                          {/* A disabled tick says why in words, not only in its tooltip (spec §10.2); ticks are md+ only. */}
                          {roundSelectionEnabled && tickBlock ? <p data-disposal-round-block className="mt-1 hidden max-w-48 text-meta text-muted-foreground md:block">{tickReasons[tickBlock]}</p> : null}
                        </>
                      )}
                </DataTableCell>
              </ClickableTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>
      {total > 0 ? (
        <DataTableFoot>
          <Pagination
            page={filters.page}
            totalPages={resultRange.totalPages}
            previousHref={`/${locale}/disposal?${buildDisposalQueryString(filters, { page: filters.page - 1 })}`}
            nextHref={`/${locale}/disposal?${buildDisposalQueryString(filters, { page: filters.page + 1 })}`}
            pageSize={filters.pageSize}
            pageSizes={LIST_PAGE_SIZES.map((pageSize) => ({ value: pageSize, href: `/${locale}/disposal?${buildDisposalQueryString(filters, { pageSize, page: 1 })}` }))}
            labels={{
              navigation: tCommon("pagination"),
              previous: tCommon("previous"),
              next: tCommon("next"),
              pageOf: tCommon("pageOf", { page: filters.page, total: resultRange.totalPages }),
              range: tCommon("showingRange", { from: formatCount(resultRange.start), to: formatCount(resultRange.end), total: formatCount(total) }),
              pageSizeGroup: tCommon("pageSizeLabel"),
              rowsPerPage: tCommon("rowsPerPage"),
            }}
          />
        </DataTableFoot>
      ) : null}
    </ContentPanel>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            {canCreate ? (
              <Link href={`/${locale}/disposal/new`} className={buttonVariants({ size: "md" })}>
                <Plus aria-hidden="true" />
                {t("createTitle")}
              </Link>
            ) : null}
            <Link href={`/${locale}/disposal/rounds`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Layers aria-hidden="true" />
              {t("queue.rounds")}
            </Link>
            <DisposalBatchMenu
              label={t("queue.batchMenu")}
              create={canCreate ? { label: t("queue.batchCreate"), href: `/${locale}/disposal/batch/new` } : null}
              history={{ label: t("batchHistory"), href: `/${locale}/disposal/batches` }}
            />
            {canExport ? (
              <a href={`/api/disposal-requests/export${query ? `?${query}` : ""}`} download className={buttonVariants({ variant: "outline", size: "md" })}>
                <Download aria-hidden="true" />
                {tCommon("export")}
              </a>
            ) : null}
          </>
        }
      />

      {/* A <details> cannot be ContentPanel: the panel classes (2D-2 R4). */}
      <details className={cn(getPanelClasses(), "group md:hidden")} open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" />{t("filter")}</span>
          {hasActiveFilters ? <span className="text-meta font-normal text-muted-foreground num">{t("activeFilterCount", { count: activeFilterCount })}</span> : null}
        </summary>
        <div className="border-t border-border p-4">
          <DisposalFilterForm formId="disposal-filter-phone" {...filterFormProps} />
        </div>
      </details>

      {roundSelectionEnabled ? (
        <DisposalRoundSelectionProvider
          scope={disposalRoundSelectionScope({ search: filters.search, disposalType: filters.disposalType, dateFrom: filters.dateFrom, dateTo: filters.dateTo, auditRound: filters.auditRound })}
          tickable={tickableIds}
          createHref={`/${locale}/disposal/rounds/new`}
          copy={roundSelectionCopy}
        >
          {list}
          {/* The last child of the list's column: it sticks to the bottom while something is ticked (from md). */}
          <DisposalRoundSelectionBar />
        </DisposalRoundSelectionProvider>
      ) : list}
    </div>
  )
}

// One form, rendered twice: in the phone <details> and under the tabs from md (spec 2B §5.10 #5, §6.5 6-ฌ). Each copy
// has its own form id, which the date chip's portaled fields join; the hidden copy is display:none, so one search
// landmark shows. The tab is not a filter (group 6 spec §10.2): a search keeps it in a hidden field.
function DisposalFilterForm({ formId, locale, filters, hasActiveFilters, clearHref, t, tCommon }: { formId: string; locale: string; filters: ReturnType<typeof parseDisposalListParams>; hasActiveFilters: boolean; clearHref: string; t: Awaited<ReturnType<typeof getTranslations>>; tCommon: Awaited<ReturnType<typeof getTranslations>> }) {
  const dateRangeError = getDisposalDateRangeError(filters)
  return (
    <form id={formId} role="search" action={`/${locale}/disposal`} className="flex flex-wrap items-center gap-2">
      {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
      {filters.auditRound ? <input type="hidden" name="auditRound" value={filters.auditRound} /> : null}
      <input type="hidden" name="pageSize" value={filters.pageSize} />
      <SearchField name="search" defaultValue={filters.search} fieldSize="md" aria-label={tCommon("search")} placeholder={t("searchPlaceholder")} className="w-full md:w-72" />
      <FilterSelect label={t("queue.colType")} hideLabel fieldSize="md" name="disposalType" defaultValue={filters.disposalType} allLabel={`${t("queue.colType")}: ${tCommon("all")}`} options={disposalTypeFilters.map((type) => ({ value: type, label: t(`types.${type}`) }))} className="w-full md:w-44" />
      <RepairDateRangeChip
        key={`${filters.dateFrom}|${filters.dateTo}`}
        formId={formId}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        labels={{
          chip: t("requestDate"),
          applied: t("queue.dateApplied", { from: filters.dateFrom ? formatDate(filters.dateFrom) : "–", to: filters.dateTo ? formatDate(filters.dateTo) : "–" }),
          apply: t("queue.dateApply"),
          clear: t("queue.dateClear"),
          from: t("dateFrom"),
          to: t("dateTo"),
        }}
        clearHref={`/${locale}/disposal?${buildDisposalQueryString(filters, { dateFrom: "", dateTo: "", page: 1 })}`}
      />
      <Button type="submit" variant="outline" size="md">{t("filter")}</Button>
      {hasActiveFilters ? <Link href={clearHref} className={buttonVariants({ variant: "ghost", size: "md" })}>{t("clearFilters")}</Link> : null}
      {dateRangeError ? <p role="alert" className="w-full text-meta text-danger">{t("invalidDateRange")}</p> : null}
    </form>
  )
}

// One empty state for the phone list and the table: while a filter is on, clear filters as an outline button;
// otherwise the create link for users who may create (spec 2B §5.4).
function disposalEmptyState({ locale, t, hasActiveFilters, canCreate, clearHref }: { locale: string; t: Awaited<ReturnType<typeof getTranslations>>; hasActiveFilters: boolean; canCreate: boolean; clearHref: string }): ComponentProps<typeof ActionEmptyState> {
  return {
    icon: <Trash2 />,
    title: t(hasActiveFilters ? "emptyTitle" : "emptyUnfilteredTitle"),
    description: t(hasActiveFilters ? "emptyHelp" : "emptyUnfilteredHelp"),
    actionHref: hasActiveFilters ? clearHref : canCreate ? `/${locale}/disposal/new` : undefined,
    actionLabel: hasActiveFilters ? t("clearFilters") : canCreate ? t("createTitle") : undefined,
    actionVariant: hasActiveFilters ? "secondary" : "primary",
  }
}

function DisposalStageBadge({ stage, label }: { stage: DisposalStage; label: string }) {
  const tone = stage === "complete" ? "success" : stage === "rejected" ? "danger" : stage === "awaiting_execution" ? "info" : "warning"
  return <StatusBadge label={label} tone={tone} />
}

type DisposalActionRequest = { id: string; disposalNo: string; disposalType: string; requestStatus: string; requestedById: string; approverId: string | null; batchId: string | null; createdBy: string; saleValue: { toString(): string } | number | null; salvageValue: { toString(): string } | number | null }
type DisposalStatusOption = { id: string; label: string; name: string }
type DisposalNextActionLabels = { view: string; review: string; openRequest: string; openBatch: string }

// The request's next step for this user: review when the user may (and segregation allows), otherwise view. An approved
// request is recorded only through a disposal round (group 6 spec §9.4), so it has no execute step here. A phone card
// shows the 2C decision button with its own trigger. A table row (row given) shows RowActions through
// DisposalRowActions, whose next step opens the same dialog through its handle, with ⋯ for the request and its batch
// (spec 2B §5.4, R-m).
function DisposalNextAction({ request, href, row, canApprove, segregationRequired, actorEmployeeId, actorUserId, decisionStatuses, labels }: { request: DisposalActionRequest; href: string; row?: { menuLabel: string; batchHref?: string }; canApprove: boolean; segregationRequired: boolean; actorEmployeeId?: string | null; actorUserId: string; decisionStatuses: DisposalStatusOption[]; labels: DisposalNextActionLabels }) {
  const canReview = canApprove && getDisposalSegregationError({ action: "approve", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy }) === null
  const nextAction = getDisposalNextAction(request.requestStatus, { canApprove: canReview, canExecute: false })
  const review = nextAction === "review" && decisionStatuses.length > 0

  if (row) {
    const next: DisposalRowNext = review
      ? { kind: "review", label: labels.review, dialog: { requestId: request.id, disposalNo: request.disposalNo } }
      : { kind: "view", label: labels.view }
    return <DisposalRowActions code={request.disposalNo} menuLabel={row.menuLabel} detail={{ label: labels.openRequest, href }} batch={row.batchHref ? { label: labels.openBatch, href: row.batchHref } : undefined} next={next} />
  }
  if (review) return <DisposalDecisionButton requestId={request.id} disposalNo={request.disposalNo} />
  return <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>{labels.view}</Link>
}

type DisposalInboxStepLabels = { review: string; view: string; ownNote: string }

// The pending tab's next step (group 6 spec §10.2): "พิจารณาในงานรออนุมัติ" to the item in the approvals page, or, for the
// viewer's own request, "ดู" with "คุณเป็นผู้ขอ พิจารณาเองไม่ได้" under it.
function DisposalInboxStep({ own, inboxHref, detailHref, labels, row = false }: { own: boolean; inboxHref: string; detailHref: string; labels: DisposalInboxStepLabels; row?: boolean }) {
  if (own) {
    return (
      <div data-disposal-inbox-step="own" className={row ? "flex flex-col items-end gap-0.5" : "flex flex-col items-start gap-1"}>
        <Link href={detailHref} className={buttonVariants({ variant: "outline", size: "sm" })}>{labels.view}</Link>
        <span className="text-meta text-muted-foreground">{labels.ownNote}</span>
      </div>
    )
  }
  return (
    <Link data-disposal-inbox-step="review" href={inboxHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
      {labels.review}
    </Link>
  )
}

// The money line under the type is a secondary line, not a money column, so it keeps its unit (spec 2B §5.7).
function getRequestValue(request: DisposalActionRequest, unit: string) {
  if (request.saleValue != null) return formatMoney(Number(request.saleValue), { unit })
  if (request.salvageValue != null) return formatMoney(Number(request.salvageValue), { unit })
  return null
}
