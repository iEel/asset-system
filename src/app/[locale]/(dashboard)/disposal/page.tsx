import type { ComponentProps } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ChevronRight, Download, ListChecks, PackagePlus, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { buildDisposalQueryString, buildDisposalWhere, disposalStatusFilters, disposalTypeFilters, getDisposalDateRangeError, parseDisposalListParams, type DisposalListParams } from "@/lib/disposal-query"
import { formatCount, formatMoney } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { cn, formatDateTime } from "@/lib/utils"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalRowActions, type DisposalRowNext } from "@/components/disposal/disposal-row-actions"
import {
  DisposalBulkApprovalCheckbox,
  DisposalBulkApprovalProvider,
  DisposalBulkApprovalSelectPageControl,
  DisposalBulkApprovalToolbar,
  DisposalBulkSelectionToggle,
} from "@/components/disposal/disposal-bulk-approval"
import type { DisposalBulkApprovalCopy } from "@/components/disposal/disposal-bulk-approval"
import {
  DisposalBulkExecutionCheckbox,
  DisposalBulkExecutionProvider,
  DisposalBulkExecutionSelectPageControl,
  DisposalBulkExecutionSelectionToggle,
  DisposalBulkExecutionToolbar,
} from "@/components/disposal/disposal-bulk-execution"
import type { DisposalBulkExecutionCopy } from "@/components/disposal/disposal-bulk-execution"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getDisposalNextAction, getDisposalStage, type DisposalStage } from "@/lib/disposal-stage"
import {
  filterDisposalExecutorOptions,
  getDisposalDecisionStatusOptions,
  getDisposalExecutionStatusOptions,
  getDisposalSegregationError,
} from "@/lib/disposal-policy"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"
import { getDisposalBulkApprovalBlockCode } from "@/lib/disposal-bulk-approval"
import { disposalBulkExecutionErrorCodes } from "@/lib/disposal-bulk-execution"

type DisposalPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<DisposalListParams>
}

export default async function DisposalPage({ params, searchParams }: DisposalPageProps) {
  const { locale } = await params
  const filters = parseDisposalListParams(await searchParams)
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const canApprove = hasPermission(user, "disposal", "approve")
  const canEdit = hasPermission(user, "disposal", "edit")
  const canExport = hasPermission(user, "disposal", "export")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const query = buildDisposalQueryString(filters)
  const disposalReturnHref = `/${locale}/disposal${query ? `?${query}` : ""}`
  const requestWhere = buildDisposalWhere(filters)
  const stageWhere = buildDisposalWhere({ ...filters, status: "" })

  const [requests, total, stageTotal, stageCounts, savedSettings, employees, statuses] = await Promise.all([
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
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, code: true, fullNameTh: true },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
    canApprove || canEdit
      ? prisma.assetStatus.findMany({
          where: { isActive: true },
          select: { id: true, name: true, nameTh: true },
          orderBy: { sortOrder: "asc" },
        })
      : Promise.resolve([]),
  ])
  // A page past the last one (an old link, or the last request of the last page decided elsewhere) shows the last
  // page, not an empty table that says "หน้า 4 จาก 3" (spec 2B I21, §5.9.1).
  const lastPage = lastListPage(total, filters.pageSize)
  if (requests.length === 0 && total > 0 && filters.page > lastPage) {
    redirect(`/${locale}/disposal?${buildDisposalQueryString(filters, { page: lastPage })}`)
  }
  const requestIds = requests.map((request) => request.id)
  const batchIds = [...new Set(requests.flatMap((request) => request.batchId ? [request.batchId] : []))]
  const [itemEvidence, batchEvidence] = await Promise.all([
    canEdit && requestIds.length > 0
      ? prisma.attachment.groupBy({
          by: ["referenceId"],
          where: { module: "disposal", referenceId: { in: requestIds }, isActive: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    canEdit && batchIds.length > 0
      ? prisma.attachment.groupBy({
          by: ["referenceId"],
          where: { module: "disposal_batch", referenceId: { in: batchIds }, isActive: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ])
  const itemEvidenceCounts = new Map(itemEvidence.map((attachment) => [attachment.referenceId, attachment._count._all]))
  const batchEvidenceCounts = new Map(batchEvidence.map((attachment) => [attachment.referenceId, attachment._count._all]))
  const requestsWithEvidence = requests.map((request) => ({
    ...request,
    effectiveEvidenceCount: (itemEvidenceCounts.get(request.id) ?? 0) + (batchEvidenceCounts.get(request.batchId ?? "") ?? 0),
  }))
  const workflowPolicy = parseWorkflowApprovalPolicy(savedSettings)
  const bulkApprovalEnabled = canApprove && filters.status === "pending"
  const bulkExecutionEnabled = canEdit && filters.status === "approved"
  const bulkItems = bulkApprovalEnabled ? requests.map((request) => {
    const blockedCode = getDisposalBulkApprovalBlockCode({
      id: request.id,
      disposalNo: request.disposalNo,
      isActive: request.isActive,
      requestStatus: request.requestStatus,
      requestedById: request.requestedById,
      createdBy: request.createdBy,
      asset: {
        assetTag: request.asset.assetTag,
        status: request.asset.status,
      },
    }, {
      userId: user.id,
      employeeId: user.employeeId,
    }, workflowPolicy.segregationRequired)

    return {
      requestId: request.id,
      disposalNo: request.disposalNo,
      assetTag: request.asset.assetTag,
      selectable: blockedCode === null,
      blockedCode,
    }
  }) : []
  const bulkExecutionItems = bulkExecutionEnabled ? requestsWithEvidence.map((request) => ({
    requestId: request.id,
    disposalNo: request.disposalNo,
    assetLabel: `${request.asset.assetTag} - ${request.asset.name}`,
    disposalType: request.disposalType,
    effectiveEvidenceCount: request.effectiveEvidenceCount,
    approverId: request.approverId,
    requestedById: request.requestedById,
    createdBy: request.createdBy,
    recipientName: request.recipientName,
    documentNo: request.documentNo,
    saleValue: request.saleValue?.toString() ?? null,
    salvageValue: request.salvageValue?.toString() ?? null,
    executionRemark: request.executionRemark,
  })) : []
  const employeeOptions = employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` }))
  const statusOptions = statuses.map((status) => ({ id: status.id, name: status.name, label: status.nameTh }))
  const decisionStatuses = getDisposalDecisionStatusOptions(statusOptions)
  const executionStatuses = getDisposalExecutionStatusOptions(statusOptions)
  const stageLabels = {
    pending_approval: t("stages.pending_approval"),
    awaiting_execution: t("stages.awaiting_execution"),
    complete: t("stages.complete"),
    rejected: t("stages.rejected"),
  }
  const bulkApprovalCopy: DisposalBulkApprovalCopy = {
    toolbarLabel: t("bulkToolbarLabel"),
    selectionLabel: t("bulkSelection"),
    selectionMode: t("bulkSelectionMode"),
    cancelSelectionMode: t("bulkCancelSelectionMode"),
    selectedCount: t.raw("bulkSelectedCount"),
    selectionLimit: t("bulkSelectionLimit"),
    selectPage: t("bulkSelectPage"),
    clearSelection: t("bulkClearSelection"),
    reviewAndApprove: t("bulkReviewAndApprove"),
    selectItem: t.raw("bulkSelectItem"),
    requestFailed: t("bulkRequestFailed"),
    approvalFailed: t("bulkApprovalFailed"),
    previewTitle: t("bulkPreviewTitle"),
    previewLoading: t("bulkPreviewLoading"),
    preflightHelp: t("bulkPreflightHelp"),
    sharedRemark: t("bulkSharedRemark"),
    sharedRemarkHelp: t("bulkSharedRemarkHelp"),
    remarkLimit: t.raw("bulkRemarkLimit"),
    confirmApproval: t.raw("bulkConfirmApproval"),
    committing: t("bulkCommitting"),
    resultTitle: t("bulkResultTitle"),
    selected: t("bulkSelected"),
    eligible: t("bulkEligible"),
    blocked: t("bulkBlocked"),
    approved: t("bulkApproved"),
    failed: t("bulkFailed"),
    retry: t("bulkRetry"),
    close: t("bulkClose"),
    cancel: t("bulkCancel"),
    zeroEligible: t("bulkZeroEligible"),
    discardSelection: t("bulkDiscardSelection"),
    discardSelectionAction: t("bulkDiscardSelectionAction"),
    errors: {
      DISPOSAL_REQUEST_NOT_FOUND: t("bulkErrors.DISPOSAL_REQUEST_NOT_FOUND"),
      DISPOSAL_INVALID_STAGE: t("bulkErrors.DISPOSAL_INVALID_STAGE"),
      DISPOSAL_SOD_CONFLICT: t("bulkErrors.DISPOSAL_SOD_CONFLICT"),
      DISPOSAL_ASSET_INELIGIBLE: t("bulkErrors.DISPOSAL_ASSET_INELIGIBLE"),
      DISPOSAL_CONCURRENT_UPDATE: t("bulkErrors.DISPOSAL_CONCURRENT_UPDATE"),
      DISPOSAL_FORBIDDEN: t("bulkErrors.DISPOSAL_FORBIDDEN"),
      DISPOSAL_APPROVAL_FAILED: t("bulkErrors.DISPOSAL_APPROVAL_FAILED"),
    },
  }
  const bulkExecutionErrors = Object.fromEntries(
    disposalBulkExecutionErrorCodes.map((code) => [code, t(`bulkExecutionErrors.${code}`)]),
  )
  const bulkExecutionCopy: DisposalBulkExecutionCopy = {
    toolbarLabel: t("bulkExecutionToolbarLabel"), selectionMode: t("bulkExecutionSelectionMode"), cancelSelectionMode: t("bulkExecutionCancelSelectionMode"), selectedCount: t.raw("bulkExecutionSelectedCount"), selectionLimit: t("bulkExecutionSelectionLimit"), mixedType: t("bulkExecutionMixedType"), selectPage: t("bulkExecutionSelectPage"), clearSelection: t("bulkExecutionClearSelection"), review: t("bulkExecutionReview"), selectItem: t.raw("bulkExecutionSelectItem"), incompatibleType: t("bulkExecutionIncompatibleType"), previewTitle: t("bulkExecutionPreviewTitle"), previewLoading: t("bulkExecutionPreviewLoading"), preflightHelp: t("bulkExecutionPreflightHelp"), executionDate: t("bulkExecutionDate"), executor: t("bulkExecutionExecutor"), finalStatus: t("bulkExecutionFinalStatus"), selectEmployee: t("selectEmployee"), selectStatus: t("bulkExecutionSelectStatus"), historicalException: t("bulkExecutionHistoricalException"), historicalReason: t("bulkExecutionHistoricalReason"), historicalReasonHelp: t.raw("bulkExecutionHistoricalReasonHelp"), historicalAcknowledgement: t("bulkExecutionHistoricalAcknowledgement"), historicalWarning: t("bulkExecutionHistoricalWarning"), permanentConfirmation: t("bulkExecutionPermanentConfirmation"), confirm: t.raw("bulkExecutionConfirm"), committing: t("bulkExecutionCommitting"), resultTitle: t("bulkExecutionResultTitle"), selected: t("bulkExecutionSelected"), eligible: t("bulkExecutionEligible"), executed: t("bulkExecutionExecuted"), blocked: t("bulkExecutionBlocked"), failed: t("bulkExecutionFailed"), retry: t("bulkExecutionRetry"), close: t("bulkExecutionClose"), cancel: t("bulkExecutionCancel"), cancelPreview: t("bulkExecutionCancelPreview"), zeroEligible: t("bulkExecutionZeroEligible"), requestFailed: t("bulkExecutionRequestFailed"), commitFailed: t("bulkExecutionCommitFailed"), discardSelection: t("bulkExecutionDiscardSelection"), sharedValues: t("bulkExecutionSharedValues"), sharedRecipient: t("bulkExecutionSharedRecipient"), sharedRecipientHelp: t("bulkExecutionSharedRecipientHelp"), reviewedValues: t("bulkExecutionReviewedValues"), recipient: t("bulkExecutionRecipient"), recipientSourceRequest: t("bulkExecutionRecipientSourceRequest"), recipientSourceShared: t("bulkExecutionRecipientSourceShared"), documentNo: t("bulkExecutionDocumentNo"), saleValue: t("bulkExecutionSaleValue"), salvageValue: t("bulkExecutionSalvageValue"), remark: t("bulkExecutionRemark"), notProvided: t("bulkExecutionNotProvided"),
    discardSelectionAction: t("bulkDiscardSelectionAction"),
    errors: bulkExecutionErrors,
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
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.disposalType || filters.dateFrom || filters.dateTo)
  // The phone filter summary says how many filters are on (spec 2B §5.10 #5). It used to read "ล้างตัวกรอง" but only folded the panel.
  const activeFilterCount = [filters.search, filters.status, filters.disposalType, filters.dateFrom, filters.dateTo].filter(Boolean).length
  const emptyState = disposalEmptyState({ locale, t, hasActiveFilters, canCreate })
  const nextActionLabels: DisposalNextActionLabels = {
    view: tCommon("view"),
    review: t("reviewRequest"),
    execute: t("executeDisposal"),
    executeShort: t("executeDisposalShort"),
    openRequest: t("openRequest"),
    openBatch: t("openBatch"),
  }

  return (
    <div className="space-y-6">
      <DisposalBulkApprovalProvider items={bulkItems} selectionKey={`${filters.page}:${filters.pageSize}:${query}`} copy={bulkApprovalCopy}>
      <DisposalBulkExecutionProvider items={bulkExecutionItems} selectionKey={`${filters.page}:${filters.pageSize}:${query}`} copy={bulkExecutionCopy} executionStatuses={executionStatuses} employees={employeeOptions} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href={`/${locale}/disposal/batches`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <ListChecks aria-hidden="true" />
              {t("batchHistory")}
            </Link>
            {canCreate ? (
              <>
                <Link href={`/${locale}/disposal/batch/new`} className={buttonVariants({ variant: "outline", size: "md" })}>
                  <PackagePlus aria-hidden="true" />
                  {t("batchCreateTitle")}
                </Link>
                <Link href={`/${locale}/disposal/new`} className={buttonVariants({ size: "md" })}>
                  <Plus aria-hidden="true" />
                  {tCommon("create")}
                </Link>
              </>
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
          <DisposalFilterForm locale={locale} filters={filters} hasActiveFilters={hasActiveFilters} t={t} tCommon={tCommon} />
        </div>
      </details>

      <FilterPanel className="hidden md:block">
        <DisposalFilterForm locale={locale} filters={filters} hasActiveFilters={hasActiveFilters} t={t} tCommon={tCommon} />
      </FilterPanel>

      <ContentPanel
        divided
        flush
        title={t("requestList")}
        description={t("resultRange", { start: formatCount(resultRange.start), end: formatCount(resultRange.end), total: formatCount(total) })}
        actions={
          bulkApprovalEnabled || bulkExecutionEnabled || canExport ? (
            <>
              {bulkApprovalEnabled ? <DisposalBulkSelectionToggle /> : bulkExecutionEnabled ? <DisposalBulkExecutionSelectionToggle /> : null}
              {canExport ? (
                <a href={`/api/disposal-requests/export${query ? `?${query}` : ""}`} download className={buttonVariants({ variant: "outline", size: "md" })}>
                  <Download aria-hidden="true" />
                  {t("exportRequests")}
                </a>
              ) : null}
            </>
          ) : undefined
        }
      >
        {bulkApprovalEnabled ? <DisposalBulkApprovalToolbar /> : bulkExecutionEnabled ? <DisposalBulkExecutionToolbar /> : null}
        <TabNav
          aria-label={t("stageFilterLabel")}
          items={stageTabs.map((stage) => ({
            key: stage.status || "all",
            label: stage.label,
            count: formatCount(stage.count),
            href: `/${locale}/disposal?${buildDisposalQueryString(filters, { status: stage.status, page: 1 })}`,
          }))}
          current={filters.status || "all"}
          className="px-4 md:px-5"
        />
        <div className="flex items-center justify-end gap-1 px-4 pt-2 text-meta text-muted-foreground sm:hidden">{t("stageScrollHint")}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></div>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {requestsWithEvidence.length === 0 ? <ActionEmptyState {...emptyState} /> : requestsWithEvidence.map((request) => {
            const stage = getDisposalStage(request.requestStatus)
            const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
            return (
              <article key={request.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2"><Link href={detailHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0")}><span className="tag font-medium">{request.disposalNo}</span></Link>{request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}><span className="tag">{request.batch.batchNo}</span></Link> : null}</div>
                  <div><div className="text-sm text-foreground"><span className="tag font-medium">{request.asset.assetTag}</span></div><div className="mt-1 line-clamp-2 text-meta text-muted-foreground">{request.asset.name}</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /><Chip>{t(`types.${request.disposalType}`)}</Chip></div>
                <KeyValueList className="mt-3" items={[{ key: "requestedBy", label: t("requestedBy"), value: request.requestedBy.fullNameTh }, { key: "requestDate", label: t("requestDate"), value: formatDateTime(request.requestDate) }]} />
                <details className="mt-3 border-t border-border-soft"><summary className="cursor-pointer py-3 text-sm font-medium text-primary">{t("moreDetails")}</summary><KeyValueList items={[{ key: "reason", label: t("reason"), value: request.reason }, { key: "approver", label: t("approver"), value: request.approver ? <><span className="tag">{request.approver.code}</span> - {request.approver.fullNameTh}</> : null }, { key: "value", label: t("value"), value: getRequestValue(request, tCommon("baht")) }]} /></details>
                {bulkApprovalEnabled ? <div className="flex min-h-11 items-center justify-end" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="mobile" /></div> : bulkExecutionEnabled ? <div className="flex min-h-11 items-center justify-end" data-no-row-click><DisposalBulkExecutionCheckbox requestId={request.id} variant="mobile" /></div> : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><DisposalNextAction request={request} href={detailHref} canApprove={canApprove} canExecute={canEdit} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} executionStatuses={executionStatuses} employees={employeeOptions} labels={nextActionLabels} /></div>
              </article>
            )
          })}
        </div>
        <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("requestList")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              {bulkApprovalEnabled ? (
                <DataTableHead className="w-12 py-0"><span className="sr-only">{t("bulkSelection")}</span><DisposalBulkApprovalSelectPageControl /></DataTableHead>
              ) : bulkExecutionEnabled ? (
                <DataTableHead className="w-12 py-0"><span className="sr-only">{t("bulkExecutionSelection")}</span><DisposalBulkExecutionSelectPageControl /></DataTableHead>
              ) : null}
              <DataTableHead>{t("disposalNo")}</DataTableHead>
              <DataTableHead>{t("asset")}</DataTableHead>
              <DataTableHead>{t("disposalType")}</DataTableHead>
              <DataTableHead>{t("requestedBy")}</DataTableHead>
              <DataTableHead>{tCommon("status")}</DataTableHead>
              <DataTableHead>{t("requestDate")}</DataTableHead>
              {canApprove || canEdit ? <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead> : null}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {requestsWithEvidence.length === 0 ? (
              <TableEmptyRow colSpan={((bulkApprovalEnabled || bulkExecutionEnabled) ? 1 : 0) + (canApprove || canEdit ? 7 : 6)} emptyState={emptyState} />
            ) : requestsWithEvidence.map((request) => {
              const stage = getDisposalStage(request.requestStatus)
              const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
              return (
                <ClickableTableRow key={request.id} href={detailHref} label={`${tCommon("view")}: ${request.disposalNo}`}>
                  {bulkApprovalEnabled ? (
                    <DataTableCell className="w-12 py-0" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="desktop" /></DataTableCell>
                  ) : bulkExecutionEnabled ? (
                    <DataTableCell className="w-12 py-0" data-no-row-click><DisposalBulkExecutionCheckbox requestId={request.id} variant="desktop" /></DataTableCell>
                  ) : null}
                  <DataTableCell className="whitespace-nowrap">
                    <Link href={detailHref} className={cn(linkVariants({ size: "inherit" }), "text-foreground")}><span className="tag font-medium">{request.disposalNo}</span></Link>
                    {request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className={cn(linkVariants(), "mt-1 block")}><span className="tag">{request.batch.batchNo}</span></Link> : null}
                  </DataTableCell>
                  <DataTableCell className="min-w-56">
                    <div className="text-foreground"><span className="tag font-medium">{request.asset.assetTag}</span></div>
                    <div className="mt-1 text-meta text-muted-foreground">{request.asset.name}</div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    <div>{t(`types.${request.disposalType}`)}</div>
                    <div className="mt-1 text-meta num">{orNil(getRequestValue(request, tCommon("baht")))}</div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground"><span className="tag">{request.requestedBy.code}</span> - {request.requestedBy.fullNameTh}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /></DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(request.requestDate)}</DataTableCell>
                  {canApprove || canEdit ? (
                    <DataTableCell align="right" sticky="right">
                      <DisposalNextAction request={request} href={detailHref} row={{ menuLabel: tCommon("moreActionsFor", { code: request.disposalNo }), batchHref: request.batch ? `/${locale}/disposal/batches/${request.batch.id}` : undefined }} canApprove={canApprove} canExecute={canEdit} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} executionStatuses={executionStatuses} employees={employeeOptions} labels={nextActionLabels} />
                    </DataTableCell>
                  ) : null}
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
      </DisposalBulkExecutionProvider>
      </DisposalBulkApprovalProvider>
    </div>
  )
}

// One form, rendered twice: in the phone <details> and in the desktop FilterPanel (spec 2B §5.10 #5, §6.5 6-ฌ). Field
// ids come from useId, so the two copies never share an id; the hidden copy is display:none, so one search landmark shows.
function DisposalFilterForm({ locale, filters, hasActiveFilters, t, tCommon }: { locale: string; filters: ReturnType<typeof parseDisposalListParams>; hasActiveFilters: boolean; t: Awaited<ReturnType<typeof getTranslations>>; tCommon: Awaited<ReturnType<typeof getTranslations>> }) {
  const dateRangeError = getDisposalDateRangeError(filters)
  return (
    <form role="search" action={`/${locale}/disposal`} className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px_auto]">
      <input type="hidden" name="pageSize" value={filters.pageSize} />
      <Field label={tCommon("search")} className="col-span-2 lg:col-span-1">
        <SearchField name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} />
      </Field>
      <FilterSelect label={tCommon("status")} name="status" defaultValue={filters.status} allLabel={tCommon("all")} options={disposalStatusFilters.map((status) => ({ value: status, label: t(`statuses.${status}`) }))} className="col-span-2 lg:col-span-1" />
      <FilterSelect label={t("disposalType")} name="disposalType" defaultValue={filters.disposalType} allLabel={tCommon("all")} options={disposalTypeFilters.map((type) => ({ value: type, label: t(`types.${type}`) }))} className="col-span-2 lg:col-span-1" />
      <Field label={t("dateFrom")}>
        <Input type="date" name="dateFrom" defaultValue={filters.dateFrom} max={filters.dateTo || undefined} />
      </Field>
      <Field label={t("dateTo")}>
        <Input type="date" name="dateTo" defaultValue={filters.dateTo} min={filters.dateFrom || undefined} />
      </Field>
      <FilterFormActions className="col-span-2 lg:col-span-1" submitLabel={t("filter")} clear={hasActiveFilters ? { href: `/${locale}/disposal`, label: t("clearFilters") } : undefined} />
      {dateRangeError ? <p role="alert" className="col-span-2 text-meta text-danger lg:col-span-6">{t("invalidDateRange")}</p> : null}
    </form>
  )
}

// One empty state for the phone list and the table: while a filter is on, clear filters as an outline button;
// otherwise the create link for users who may create (spec 2B §5.4).
function disposalEmptyState({ locale, t, hasActiveFilters, canCreate }: { locale: string; t: Awaited<ReturnType<typeof getTranslations>>; hasActiveFilters: boolean; canCreate: boolean }): ComponentProps<typeof ActionEmptyState> {
  return {
    icon: <Trash2 />,
    title: t(hasActiveFilters ? "emptyTitle" : "emptyUnfilteredTitle"),
    description: t(hasActiveFilters ? "emptyHelp" : "emptyUnfilteredHelp"),
    actionHref: hasActiveFilters ? `/${locale}/disposal` : canCreate ? `/${locale}/disposal/new` : undefined,
    actionLabel: hasActiveFilters ? t("clearFilters") : canCreate ? t("createTitle") : undefined,
    actionVariant: hasActiveFilters ? "secondary" : "primary",
  }
}

function DisposalStageBadge({ stage, label }: { stage: DisposalStage; label: string }) {
  const tone = stage === "complete" ? "success" : stage === "rejected" ? "danger" : stage === "awaiting_execution" ? "info" : "warning"
  return <StatusBadge label={label} tone={tone} />
}

type DisposalActionRequest = { id: string; disposalNo: string; disposalType: string; requestStatus: string; requestedById: string; approverId: string | null; batchId: string | null; createdBy: string; saleValue: { toString(): string } | number | null; salvageValue: { toString(): string } | number | null; effectiveEvidenceCount: number }
type DisposalStatusOption = { id: string; label: string; name: string }
type DisposalEmployeeOption = { id: string; label: string }
type DisposalNextActionLabels = { view: string; review: string; execute: string; executeShort: string; openRequest: string; openBatch: string }

// The request's next step for this user: review or execute when the user may (and segregation allows), otherwise view.
// A phone card shows the 2C buttons with their own triggers. A table row (row given) shows RowActions through
// DisposalRowActions, whose next step opens the same dialogs through their handles, with ⋯ for the request and its
// batch (spec 2B §5.4, R-m).
function DisposalNextAction({ request, href, row, canApprove, canExecute, canUseHistoricalEvidenceException, segregationRequired, actorEmployeeId, actorUserId, decisionStatuses, executionStatuses, employees, labels }: { request: DisposalActionRequest; href: string; row?: { menuLabel: string; batchHref?: string }; canApprove: boolean; canExecute: boolean; canUseHistoricalEvidenceException: boolean; segregationRequired: boolean; actorEmployeeId?: string | null; actorUserId: string; decisionStatuses: DisposalStatusOption[]; executionStatuses: DisposalStatusOption[]; employees: DisposalEmployeeOption[]; labels: DisposalNextActionLabels }) {
  const canReview = canApprove && getDisposalSegregationError({ action: "approve", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy }) === null
  const canExecuteAction = canExecute && getDisposalSegregationError({ action: "execute", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy, approverId: request.approverId }) === null
  const nextAction = getDisposalNextAction(request.requestStatus, { canApprove: canReview, canExecute: canExecuteAction })
  const defaultSaleValue = request.saleValue != null ? String(request.saleValue) : undefined
  const defaultSalvageValue = request.salvageValue != null ? String(request.salvageValue) : undefined
  const review = nextAction === "review" && decisionStatuses.length > 0
  const execute = nextAction === "execute" && executionStatuses.length > 0

  if (row) {
    const next: DisposalRowNext = review
      ? { kind: "review", label: labels.review, dialog: { requestId: request.id, disposalNo: request.disposalNo, disposalType: request.disposalType, statuses: decisionStatuses, defaultSaleValue, defaultSalvageValue } }
      : execute
        ? { kind: "execute", label: labels.executeShort, dialog: { requestId: request.id, disposalNo: request.disposalNo, disposalType: request.disposalType, statuses: executionStatuses, employees: filterDisposalExecutorOptions(employees, request.approverId, segregationRequired), defaultActualSaleValue: defaultSaleValue, defaultActualSalvageValue: defaultSalvageValue, effectiveEvidenceCount: request.effectiveEvidenceCount, canUseHistoricalEvidenceException } }
        : { kind: "view", label: labels.view }
    return <DisposalRowActions code={request.disposalNo} menuLabel={row.menuLabel} detail={{ label: labels.openRequest, href }} batch={row.batchHref ? { label: labels.openBatch, href: row.batchHref } : undefined} next={next} />
  }
  if (review) return <DisposalDecisionButton requestId={request.id} disposalNo={request.disposalNo} disposalType={request.disposalType} statuses={decisionStatuses} defaultSaleValue={defaultSaleValue} defaultSalvageValue={defaultSalvageValue} />
  if (execute) return <DisposalExecutionButton requestId={request.id} disposalNo={request.disposalNo} disposalType={request.disposalType} statuses={executionStatuses} employees={filterDisposalExecutorOptions(employees, request.approverId, segregationRequired)} defaultActualSaleValue={defaultSaleValue} defaultActualSalvageValue={defaultSalvageValue} effectiveEvidenceCount={request.effectiveEvidenceCount} canUseHistoricalEvidenceException={canUseHistoricalEvidenceException} />
  return <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>{labels.view}</Link>
}

// The money line under the type is a secondary line, not a money column, so it keeps its unit (spec 2B §5.7).
function getRequestValue(request: DisposalActionRequest, unit: string) {
  if (request.saleValue != null) return formatMoney(Number(request.saleValue), { unit })
  if (request.salvageValue != null) return formatMoney(Number(request.salvageValue), { unit })
  return null
}
