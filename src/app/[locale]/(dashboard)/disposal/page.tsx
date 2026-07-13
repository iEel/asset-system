import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ChevronRight, Download, ListChecks, PackagePlus, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { buildDisposalQueryString, buildDisposalWhere, getDisposalDateRangeError, parseDisposalListParams, type DisposalListParams } from "@/lib/disposal-query"
import { paginationRange } from "@/lib/master-data-query"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalPagination } from "@/components/disposal/disposal-pagination"
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
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
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
    toolbarLabel: t("bulkExecutionToolbarLabel"), selectionMode: t("bulkExecutionSelectionMode"), cancelSelectionMode: t("bulkExecutionCancelSelectionMode"), selectedCount: t.raw("bulkExecutionSelectedCount"), selectionLimit: t("bulkExecutionSelectionLimit"), mixedType: t("bulkExecutionMixedType"), selectPage: t("bulkExecutionSelectPage"), clearSelection: t("bulkExecutionClearSelection"), review: t("bulkExecutionReview"), selectItem: t.raw("bulkExecutionSelectItem"), incompatibleType: t("bulkExecutionIncompatibleType"), previewTitle: t("bulkExecutionPreviewTitle"), previewLoading: t("bulkExecutionPreviewLoading"), preflightHelp: t("bulkExecutionPreflightHelp"), executionDate: t("bulkExecutionDate"), executor: t("bulkExecutionExecutor"), finalStatus: t("bulkExecutionFinalStatus"), selectEmployee: t("selectEmployee"), selectStatus: t("bulkExecutionSelectStatus"), historicalException: t("bulkExecutionHistoricalException"), historicalReason: t("bulkExecutionHistoricalReason"), historicalReasonHelp: t.raw("bulkExecutionHistoricalReasonHelp"), historicalAcknowledgement: t("bulkExecutionHistoricalAcknowledgement"), historicalWarning: t("bulkExecutionHistoricalWarning"), permanentConfirmation: t("bulkExecutionPermanentConfirmation"), confirm: t.raw("bulkExecutionConfirm"), committing: t("bulkExecutionCommitting"), resultTitle: t("bulkExecutionResultTitle"), selected: t("bulkExecutionSelected"), eligible: t("bulkExecutionEligible"), executed: t("bulkExecutionExecuted"), blocked: t("bulkExecutionBlocked"), failed: t("bulkExecutionFailed"), retry: t("bulkExecutionRetry"), close: t("bulkExecutionClose"), cancel: t("bulkExecutionCancel"), cancelPreview: t("bulkExecutionCancelPreview"), zeroEligible: t("bulkExecutionZeroEligible"), requestFailed: t("bulkExecutionRequestFailed"), commitFailed: t("bulkExecutionCommitFailed"), discardSelection: t("bulkExecutionDiscardSelection"), sharedValues: t("bulkExecutionSharedValues"), reviewedValues: t("bulkExecutionReviewedValues"), recipient: t("bulkExecutionRecipient"), documentNo: t("bulkExecutionDocumentNo"), saleValue: t("bulkExecutionSaleValue"), salvageValue: t("bulkExecutionSalvageValue"), remark: t("bulkExecutionRemark"), notProvided: t("bulkExecutionNotProvided"),
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
  const dateRangeError = getDisposalDateRangeError(filters)
  const resultRange = paginationRange(filters.page, filters.pageSize, total)
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.disposalType || filters.dateFrom || filters.dateTo)

  return (
    <div>
      <DisposalBulkApprovalProvider items={bulkItems} selectionKey={`${filters.page}:${filters.pageSize}:${query}`} copy={bulkApprovalCopy}>
      <DisposalBulkExecutionProvider items={bulkExecutionItems} selectionKey={`${filters.page}:${filters.pageSize}:${query}`} copy={bulkExecutionCopy} executionStatuses={executionStatuses} employees={employeeOptions} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link href={`/${locale}/disposal/batches`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0">
            <ListChecks className="h-4 w-4" />{t("batchHistory")}
          </Link>
          {canCreate ? <>
            <Link href={`/${locale}/disposal/batch/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0">
              <PackagePlus className="h-4 w-4" />{t("batchCreateTitle")}
            </Link>
            <Link href={`/${locale}/disposal/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-10 sm:min-h-0">
              <Plus className="h-4 w-4" />{tCommon("create")}
            </Link>
          </> : null}
        </div>
      </div>

      <details className="group rounded-lg border border-border bg-surface shadow-sm md:hidden" open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" />{t("filter")}</span>
          {hasActiveFilters ? <span className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{t("clearFilters")}</span> : null}
        </summary>
        <div className="border-t border-border p-4">
          <DisposalFilterForm locale={locale} filters={filters} t={t} tCommon={tCommon} />
        </div>
      </details>

      <section className="hidden rounded-lg border border-border bg-surface p-4 shadow-sm md:block">
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px_auto]" action={`/${locale}/disposal`}>
          <input type="hidden" name="pageSize" value={filters.pageSize} />
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input type="search" name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("status")}</span>
            <select name="status" defaultValue={filters.status} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">{tCommon("all")}</option>
              <option value="pending">{t("statuses.pending")}</option>
              <option value="approved">{t("statuses.approved")}</option>
              <option value="disposed">{t("statuses.disposed")}</option>
              <option value="rejected">{t("statuses.rejected")}</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("disposalType")}</span>
            <select name="disposalType" defaultValue={filters.disposalType} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">{tCommon("all")}</option>
              {["sell", "donate", "destroy", "lost", "dispose"].map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span>
            <input type="date" name="dateFrom" defaultValue={filters.dateFrom} max={filters.dateTo || undefined} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span>
            <input type="date" name="dateTo" defaultValue={filters.dateTo} min={filters.dateFrom || undefined} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <div className="flex flex-col gap-2 self-end sm:flex-row">
            <button type="submit" className="min-h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-10 sm:min-h-0 sm:w-auto">{t("filter")}</button>
            <Link href={`/${locale}/disposal`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto">{t("clearFilters")}</Link>
          </div>
        </form>
        {dateRangeError ? <p role="alert" className="mt-3 text-sm font-medium text-danger">{t("invalidDateRange")}</p> : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("requestList")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("resultRange", { start: resultRange.start, end: resultRange.end, total })}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {bulkApprovalEnabled ? <DisposalBulkSelectionToggle /> : bulkExecutionEnabled ? <DisposalBulkExecutionSelectionToggle /> : null}
            {canExport ? <a href={`/api/disposal-requests/export${query ? `?${query}` : ""}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"><Download className="h-4 w-4" />{t("exportRequests")}</a> : null}
          </div>
        </div>
        {bulkApprovalEnabled ? <DisposalBulkApprovalToolbar /> : bulkExecutionEnabled ? <DisposalBulkExecutionToolbar /> : null}
        <div className="border-b border-border">
          <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2" aria-label={t("stageFilterLabel")}>
            {stageTabs.map((stage) => (
              <Link key={stage.status || "all"} href={`/${locale}/disposal?${buildDisposalQueryString(filters, { status: stage.status, page: 1 })}`} aria-current={filters.status === stage.status ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors sm:h-8 sm:min-h-0 ${filters.status === stage.status ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:bg-accent"}`}>
                <span>{stage.label}</span><span className="rounded-sm bg-muted px-1.5 py-0.5 text-foreground">{stage.count}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1 px-4 pb-2 text-[11px] text-muted-foreground sm:hidden">{t("stageScrollHint")}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></div>
        </div>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {requestsWithEvidence.length === 0 ? <DisposalEmptyState locale={locale} t={t} hasActiveFilters={hasActiveFilters} canCreate={canCreate} /> : requestsWithEvidence.map((request) => {
            const stage = getDisposalStage(request.requestStatus)
            const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
            return (
              <article key={request.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2"><Link href={detailHref} className="break-words text-sm font-semibold text-foreground hover:text-primary">{request.disposalNo}</Link>{request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className="text-xs font-medium text-primary hover:underline">{request.batch.batchNo}</Link> : null}</div>
                  <div><div className="break-words text-sm font-medium text-foreground">{request.asset.assetTag}</div><div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.asset.name}</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /><StatusBadge label={t(`types.${request.disposalType}`)} tone="muted" size="xs" /></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><MobileDisposalField label={t("requestedBy")} value={request.requestedBy.fullNameTh} /><MobileDisposalField label={t("requestDate")} value={formatDateTime(request.requestDate)} /></div>
                <details className="mt-3 rounded-md border border-border bg-surface px-3 py-2"><summary className="min-h-9 cursor-pointer text-sm font-medium text-primary">{t("moreDetails")}</summary><dl className="grid gap-3 border-t border-border pt-3 text-sm"><MobileDisposalField label={t("reason")} value={request.reason} /><MobileDisposalField label={t("approver")} value={request.approver ? `${request.approver.code} - ${request.approver.fullNameTh}` : "-"} /><MobileDisposalField label={t("value")} value={getRequestValue(request)} /></dl></details>
                {bulkApprovalEnabled ? <div className="flex min-h-11 items-center justify-end" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="mobile" /></div> : bulkExecutionEnabled ? <div className="flex min-h-11 items-center justify-end" data-no-row-click><DisposalBulkExecutionCheckbox requestId={request.id} variant="mobile" /></div> : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><DisposalNextAction request={request} href={detailHref} canApprove={canApprove} canExecute={canEdit} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} executionStatuses={executionStatuses} employees={employeeOptions} viewLabel={tCommon("view")} /></div>
              </article>
            )
          })}
        </div>
        <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40"><tr>{bulkApprovalEnabled ? <th className="w-12 px-4 py-3"><span className="sr-only">{t("bulkSelection")}</span><DisposalBulkApprovalSelectPageControl /></th> : bulkExecutionEnabled ? <th className="w-12 px-4 py-3"><span className="sr-only">{t("bulkExecutionSelection")}</span><DisposalBulkExecutionSelectPageControl /></th> : null}<ColumnHeader>{t("disposalNo")}</ColumnHeader><ColumnHeader>{t("asset")}</ColumnHeader><ColumnHeader>{t("disposalType")}</ColumnHeader><ColumnHeader>{t("requestedBy")}</ColumnHeader><ColumnHeader>{tCommon("status")}</ColumnHeader><ColumnHeader>{t("requestDate")}</ColumnHeader>{canApprove || canEdit ? <th className="sticky right-0 z-10 whitespace-nowrap bg-muted/95 px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{tCommon("actions")}</th> : null}</tr></thead>
            <tbody className="divide-y divide-border">
              {requestsWithEvidence.length === 0 ? <tr><td colSpan={((bulkApprovalEnabled || bulkExecutionEnabled) ? 1 : 0) + (canApprove || canEdit ? 7 : 6)} className="px-4 py-6"><DisposalEmptyState locale={locale} t={t} hasActiveFilters={hasActiveFilters} canCreate={canCreate} /></td></tr> : requestsWithEvidence.map((request) => {
                const stage = getDisposalStage(request.requestStatus)
                const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
                return <ClickableTableRow key={request.id} href={detailHref} label={`${tCommon("view")}: ${request.disposalNo}`}>
                  {bulkApprovalEnabled ? <td className="w-12 px-4 py-3" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="desktop" /></td> : bulkExecutionEnabled ? <td className="w-12 px-4 py-3" data-no-row-click><DisposalBulkExecutionCheckbox requestId={request.id} variant="desktop" /></td> : null}
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground"><Link href={detailHref} className="hover:text-primary">{request.disposalNo}</Link>{request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className="mt-1 block text-xs text-primary hover:underline">{request.batch.batchNo}</Link> : null}</td>
                  <td className="min-w-56 px-4 py-3"><div className="font-medium text-foreground">{request.asset.assetTag}</div><div className="mt-1 text-xs text-muted-foreground">{request.asset.name}</div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground"><div>{t(`types.${request.disposalType}`)}</div><div className="mt-1 text-xs">{getRequestValue(request)}</div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{request.requestedBy.code} - {request.requestedBy.fullNameTh}</td>
                  <td className="whitespace-nowrap px-4 py-3"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /></td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(request.requestDate)}</td>
                  {canApprove || canEdit ? <td className="sticky right-0 z-10 whitespace-nowrap border-l border-border bg-surface px-4 py-3"><DisposalNextAction request={request} href={detailHref} canApprove={canApprove} canExecute={canEdit} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} executionStatuses={executionStatuses} employees={employeeOptions} viewLabel={tCommon("view")} /></td> : null}
                </ClickableTableRow>
              })}
            </tbody>
          </table>
        </div>
        <DisposalPagination filters={filters} total={total} basePath={`/${locale}/disposal`} labels={{ rowsPerPage: tCommon("rowsPerPage"), page: tCommon("page"), of: tCommon("of"), previous: tCommon("previous"), next: tCommon("next") }} />
      </section>
      </DisposalBulkExecutionProvider>
      </DisposalBulkApprovalProvider>
    </div>
  )
}

function DisposalFilterForm({ locale, filters, t, tCommon }: { locale: string; filters: ReturnType<typeof parseDisposalListParams>; t: Awaited<ReturnType<typeof getTranslations>>; tCommon: Awaited<ReturnType<typeof getTranslations>> }) {
  return <form className="grid grid-cols-1 gap-3" action={`/${locale}/disposal`}>
    <input type="hidden" name="pageSize" value={filters.pageSize} />
    <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span><input type="search" name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("status")}</span><select name="status" defaultValue={filters.status} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">{tCommon("all")}</option><option value="pending">{t("statuses.pending")}</option><option value="approved">{t("statuses.approved")}</option><option value="disposed">{t("statuses.disposed")}</option><option value="rejected">{t("statuses.rejected")}</option></select></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("disposalType")}</span><select name="disposalType" defaultValue={filters.disposalType} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">{tCommon("all")}</option>{["sell", "donate", "destroy", "lost", "dispose"].map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3">
      <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span><input type="date" name="dateFrom" defaultValue={filters.dateFrom} max={filters.dateTo || undefined} className="min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm" /></label>
      <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span><input type="date" name="dateTo" defaultValue={filters.dateTo} min={filters.dateFrom || undefined} className="min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm" /></label>
    </div>
    {getDisposalDateRangeError(filters) ? <p role="alert" className="text-sm font-medium text-danger">{t("invalidDateRange")}</p> : null}
    <div className="grid grid-cols-2 gap-2"><button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-white">{t("filter")}</button><Link href={`/${locale}/disposal`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium">{t("clearFilters")}</Link></div>
  </form>
}

function DisposalEmptyState({ locale, t, hasActiveFilters, canCreate }: { locale: string; t: Awaited<ReturnType<typeof getTranslations>>; hasActiveFilters: boolean; canCreate: boolean }) {
  const actionHref = hasActiveFilters ? `/${locale}/disposal` : canCreate ? `/${locale}/disposal/new` : undefined
  const actionLabel = hasActiveFilters ? t("clearFilters") : canCreate ? t("createTitle") : undefined
  return <ActionEmptyState icon={<Trash2 className="h-6 w-6" />} title={t(hasActiveFilters ? "emptyTitle" : "emptyUnfilteredTitle")} description={t(hasActiveFilters ? "emptyHelp" : "emptyUnfilteredHelp")} actionHref={actionHref} actionLabel={actionLabel} />
}

function DisposalStageBadge({ stage, label }: { stage: DisposalStage; label: string }) {
  const tone = stage === "complete" ? "success" : stage === "rejected" ? "danger" : stage === "awaiting_execution" ? "info" : "warning"
  return <StatusBadge label={label} tone={tone} size="xs" />
}

type DisposalActionRequest = { id: string; disposalNo: string; disposalType: string; requestStatus: string; requestedById: string; approverId: string | null; batchId: string | null; createdBy: string; saleValue: { toString(): string } | number | null; salvageValue: { toString(): string } | number | null; effectiveEvidenceCount: number }
type DisposalStatusOption = { id: string; label: string; name: string }
type DisposalEmployeeOption = { id: string; label: string }

function DisposalNextAction({ request, href, canApprove, canExecute, canUseHistoricalEvidenceException, segregationRequired, actorEmployeeId, actorUserId, decisionStatuses, executionStatuses, employees, viewLabel }: { request: DisposalActionRequest; href: string; canApprove: boolean; canExecute: boolean; canUseHistoricalEvidenceException: boolean; segregationRequired: boolean; actorEmployeeId?: string | null; actorUserId: string; decisionStatuses: DisposalStatusOption[]; executionStatuses: DisposalStatusOption[]; employees: DisposalEmployeeOption[]; viewLabel: string }) {
  const canReview = canApprove && getDisposalSegregationError({ action: "approve", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy }) === null
  const canExecuteAction = canExecute && getDisposalSegregationError({ action: "execute", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy, approverId: request.approverId }) === null
  const nextAction = getDisposalNextAction(request.requestStatus, { canApprove: canReview, canExecute: canExecuteAction })
  const defaultSaleValue = request.saleValue != null ? String(request.saleValue) : undefined
  const defaultSalvageValue = request.salvageValue != null ? String(request.salvageValue) : undefined

  if (nextAction === "review" && decisionStatuses.length > 0) return <DisposalDecisionButton requestId={request.id} disposalNo={request.disposalNo} disposalType={request.disposalType} statuses={decisionStatuses} defaultSaleValue={defaultSaleValue} defaultSalvageValue={defaultSalvageValue} />
  if (nextAction === "execute" && executionStatuses.length > 0) return <DisposalExecutionButton requestId={request.id} disposalNo={request.disposalNo} disposalType={request.disposalType} statuses={executionStatuses} employees={filterDisposalExecutorOptions(employees, request.approverId, segregationRequired)} defaultActualSaleValue={defaultSaleValue} defaultActualSalvageValue={defaultSalvageValue} effectiveEvidenceCount={request.effectiveEvidenceCount} canUseHistoricalEvidenceException={canUseHistoricalEvidenceException} />
  return <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">{viewLabel}</Link>
}

function getRequestValue(request: DisposalActionRequest) {
  if (request.saleValue != null) return formatCurrency(Number(request.saleValue))
  if (request.salvageValue != null) return formatCurrency(Number(request.salvageValue))
  return "-"
}

function MobileDisposalField({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 break-words text-sm text-foreground">{value}</div></div>
}
