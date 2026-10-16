import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FileText, History, Printer } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { formatMoney } from "@/lib/display-format"
import { cn, formatDateTime } from "@/lib/utils"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalWorkflowStepper } from "@/components/disposal/disposal-workflow-stepper"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { filterDisposalExecutorOptions, getDisposalDecisionStatusOptions, getDisposalExecutionStatusOptions, getDisposalSegregationError } from "@/lib/disposal-policy"
import { getDisposalNextAction, getDisposalStage } from "@/lib/disposal-stage"
import { formatMovementType } from "@/lib/asset-detail-format"
import { getPanelClasses } from "@/lib/design-system"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"

type DisposalDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function DisposalDetailPage({ params, searchParams }: DisposalDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canApprove = hasPermission(user, "disposal", "approve")
  const canEdit = hasPermission(user, "disposal", "edit")
  const canCreate = hasPermission(user, "disposal", "create")
  const t = await getTranslations("disposalPage")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const disposalRequest = await prisma.disposalRequest.findFirst({
    where: { id, isActive: true },
    include: {
      batch: { select: { id: true, batchNo: true } },
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          serialNumber: true,
          fixedAssetCode: true,
          purchasePrice: true,
          company: { select: { code: true, nameTh: true } },
          branch: { select: { code: true, name: true } },
          category: { select: { code: true, name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
          status: { select: { nameTh: true, colorCode: true } },
          condition: { select: { nameTh: true, colorCode: true } },
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
        },
      },
      requestedBy: { select: { code: true, fullNameTh: true } },
      approver: { select: { code: true, fullNameTh: true } },
      executedBy: { select: { code: true, fullNameTh: true } },
    },
  })
  if (!disposalRequest) notFound()

  const evidenceExceptionGrantor = disposalRequest.evidenceExceptionReason && disposalRequest.evidenceExceptionGrantedBy
    ? await prisma.user.findUnique({
        where: { id: disposalRequest.evidenceExceptionGrantedBy },
        select: { username: true, displayName: true },
      })
    : null
  const evidenceExceptionGrantorLabel = evidenceExceptionGrantor?.displayName || evidenceExceptionGrantor?.username || disposalRequest.evidenceExceptionGrantedBy

  const [movements, attachments, batchAttachments, options, savedSettings] = await Promise.all([
    prisma.assetMovement.findMany({
      where: { referenceType: "disposal", referenceId: disposalRequest.id },
      orderBy: { performedAt: "desc" },
    }),
    prisma.attachment.findMany({
      where: { module: "disposal", referenceId: disposalRequest.id, isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    disposalRequest.batch ? prisma.attachment.findMany({
      where: { module: "disposal_batch", referenceId: disposalRequest.batch.id, isActive: true },
      orderBy: { uploadedAt: "desc" },
    }) : Promise.resolve([]),
    canApprove || canEdit ? getDisposalOptions() : Promise.resolve(null),
    prisma.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    }),
  ])
  const movementLabels = await getMovementDisplayLabels(movements)
  const workflowPolicy = parseWorkflowApprovalPolicy(savedSettings)
  const canReviewDisposal = canApprove && getDisposalSegregationError({
    action: "approve",
    segregationRequired: workflowPolicy.segregationRequired,
    actorEmployeeId: user.employeeId,
    actorUserId: user.id,
    requestedById: disposalRequest.requestedById,
    createdByUserId: disposalRequest.createdBy,
    approverId: disposalRequest.approverId,
  }) === null
  const canExecuteDisposal = canEdit && getDisposalSegregationError({
    action: "execute",
    segregationRequired: workflowPolicy.segregationRequired,
    actorEmployeeId: user.employeeId,
    actorUserId: user.id,
    requestedById: disposalRequest.requestedById,
    createdByUserId: disposalRequest.createdBy,
    approverId: disposalRequest.approverId,
  }) === null
  const decisionStatuses = getDisposalDecisionStatusOptions(options?.statuses ?? [])
  const executionStatuses = getDisposalExecutionStatusOptions(options?.statuses ?? [])
  const executorOptions = filterDisposalExecutorOptions(options?.employees ?? [], disposalRequest.approverId, workflowPolicy.segregationRequired)

  const statusLabels = {
    pending: t("statuses.pending"),
    approved: t("statuses.approved"),
    disposed: t("statuses.disposed"),
    rejected: t("statuses.rejected"),
  }
  const workflowStage = getDisposalStage(disposalRequest.requestStatus)
  const nextAction = getDisposalNextAction(disposalRequest.requestStatus, {
    canApprove: canReviewDisposal,
    canExecute: canExecuteDisposal,
  })
  const ownerContext = getCurrentOwnerContext(disposalRequest, {
    centralApprovalQueue: t("centralApprovalQueue"),
    executionQueue: t("executionQueue"),
  })
  const returnToHref = normalizeOperationalReturnTo(locale, "disposal", rawSearchParams.returnTo)
  const printHref = appendOperationalReturnTo(`/${locale}/disposal/${disposalRequest.id}/print`, returnToHref)
  const printLabel = disposalRequest.requestStatus === "disposed" ? t("printFinalDocument") : t("printRequest")
  const disposalMovementLabels: Record<string, string> = {
    disposal_request: t("requestDetail"),
    disposal_approve: t("approve"),
    disposal_reject: t("reject"),
    disposal_execute: t("executionDetail"),
  }
  const nextActionControl = nextAction === "review" && options && decisionStatuses.length > 0 ? (
    <DisposalDecisionButton
      requestId={disposalRequest.id}
      disposalNo={disposalRequest.disposalNo}
      disposalType={disposalRequest.disposalType}
      statuses={decisionStatuses}
      defaultSaleValue={disposalRequest.saleValue?.toString()}
      defaultSalvageValue={disposalRequest.salvageValue?.toString()}
    />
  ) : nextAction === "execute" && options && executionStatuses.length > 0 ? (
    <DisposalExecutionButton
      requestId={disposalRequest.id}
      disposalNo={disposalRequest.disposalNo}
      disposalType={disposalRequest.disposalType}
      statuses={executionStatuses}
      employees={executorOptions}
      defaultActualSaleValue={disposalRequest.actualSaleValue?.toString() ?? disposalRequest.saleValue?.toString()}
      defaultActualSalvageValue={disposalRequest.actualSalvageValue?.toString() ?? disposalRequest.salvageValue?.toString()}
      effectiveEvidenceCount={attachments.length + batchAttachments.length}
      canUseHistoricalEvidenceException={user.roles.includes("system_admin")}
    />
  ) : null

  return (
    <div className={`space-y-6 ${actionBarPagePadding.withPrimary}`}>
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: disposalRequest.disposalNo, code: true },
        ]}
        title={disposalRequest.asset.name}
        meta={
          <>
            <span className="tag">{disposalRequest.disposalNo}</span>
            <StatusBadge label={statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus} status={disposalRequest.requestStatus} />
            <span className="tag">{disposalRequest.asset.assetTag}</span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <Link href={printHref} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Printer aria-hidden="true" />
              {printLabel}
            </Link>
            {nextActionControl}
          </div>
        }
      />
      <DisposalWorkflowStepper
        stage={workflowStage}
        currentStageLabel={statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus}
        ownerRoleLabel={ownerContext.roleLabel === "approver" ? t("approver") : t("executedBy")}
        ownerLabel={ownerContext.ownerLabel}
        stepsLabel={t("workflowStepsLabel")}
        labels={{
          request: t("workflowSteps.request"),
          decision: t("workflowSteps.decision"),
          execution: t("workflowSteps.execution"),
        }}
      />
      {disposalRequest.batch ? (
        <Notice
          tone="info"
          title={t("sourceBatch")}
          action={<Link href={`/${locale}/disposal/batches/${disposalRequest.batch.id}`} className={buttonVariants({ variant: "outline", size: "md" })}>{t("openBatch")}</Link>}
        >
          <span className="tag">{disposalRequest.batch.batchNo}</span>
        </Notice>
      ) : null}
      <ActionBar
        label={tCommon("actions")}
        primaryAction={nextActionControl}
        actions={[
          { href: `/${locale}/assets/${disposalRequest.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" />, primary: !nextActionControl },
          { href: printHref, label: printLabel, icon: <Printer className="h-4 w-4" /> },
          { href: "#history", label: t("disposalHistory"), icon: <History className="h-4 w-4" /> },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <ContentPanel title={t("requestDetail")}>
            <KeyValueList
              items={[
                { key: "disposalNo", label: t("disposalNo"), value: <span className="tag">{disposalRequest.disposalNo}</span> },
                { key: "disposalType", label: t("disposalType"), value: t(`types.${disposalRequest.disposalType}`) },
                { key: "requestDate", label: t("requestDate"), value: formatDateTime(disposalRequest.requestDate) },
                { key: "requestedBy", label: t("requestedBy"), value: <><span className="tag">{disposalRequest.requestedBy.code}</span> - {disposalRequest.requestedBy.fullNameTh}</> },
                {
                  key: "approver",
                  label: t("approver"),
                  value: disposalRequest.approver ? <><span className="tag">{disposalRequest.approver.code}</span> - {disposalRequest.approver.fullNameTh}</> : null,
                },
                { key: "status", label: tCommon("status"), value: statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus },
                {
                  key: "saleValue",
                  label: t("saleValue"),
                  value: disposalRequest.saleValue == null ? null : <span className="num">{formatMoney(Number(disposalRequest.saleValue), { unit: tCommon("baht") })}</span>,
                },
                {
                  key: "salvageValue",
                  label: t("salvageValue"),
                  value: disposalRequest.salvageValue == null ? null : <span className="num">{formatMoney(Number(disposalRequest.salvageValue), { unit: tCommon("baht") })}</span>,
                },
                { key: "approvedAt", label: t("approvedAt"), value: disposalRequest.approvedAt ? formatDateTime(disposalRequest.approvedAt) : null },
                { key: "source", label: t("source"), value: formatSource(disposalRequest.sourceType, disposalRequest.sourceId) },
              ]}
            />
          </ContentPanel>

          <ContentPanel title={t("reason")}>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{disposalRequest.reason}</p>
          </ContentPanel>

          {disposalRequest.requestStatus !== "pending" ? (
            <ContentPanel title={t("decisionDetail")}>
              <KeyValueList
                items={[
                  {
                    key: "approvalRemark",
                    label: t("approvalRemark"),
                    value: disposalRequest.approvalRemark ? <span className="whitespace-pre-wrap">{disposalRequest.approvalRemark}</span> : null,
                  },
                ]}
              />
            </ContentPanel>
          ) : null}

          {disposalRequest.requestStatus === "disposed" ? (
            <ContentPanel title={t("executionDetail")}>
              <KeyValueList
                items={[
                  { key: "executionDate", label: t("executionDate"), value: disposalRequest.executionDate ? formatDateTime(disposalRequest.executionDate) : null },
                  {
                    key: "executedBy",
                    label: t("executedBy"),
                    value: disposalRequest.executedBy ? <><span className="tag">{disposalRequest.executedBy.code}</span> - {disposalRequest.executedBy.fullNameTh}</> : null,
                  },
                  { key: "recipientName", label: t("recipientName"), value: disposalRequest.recipientName },
                  { key: "documentNo", label: t("documentNo"), value: disposalRequest.documentNo },
                  {
                    key: "actualSaleValue",
                    label: t("actualSaleValue"),
                    value: disposalRequest.actualSaleValue == null ? null : <span className="num">{formatMoney(Number(disposalRequest.actualSaleValue), { unit: tCommon("baht") })}</span>,
                  },
                  {
                    key: "actualSalvageValue",
                    label: t("actualSalvageValue"),
                    value: disposalRequest.actualSalvageValue == null ? null : <span className="num">{formatMoney(Number(disposalRequest.actualSalvageValue), { unit: tCommon("baht") })}</span>,
                  },
                  { key: "completedAt", label: t("completedAt"), value: disposalRequest.completedAt ? formatDateTime(disposalRequest.completedAt) : null },
                  {
                    key: "executionRemark",
                    label: t("executionRemark"),
                    value: disposalRequest.executionRemark ? <span className="whitespace-pre-wrap">{disposalRequest.executionRemark}</span> : null,
                  },
                ]}
              />
              {disposalRequest.evidenceExceptionReason ? (
                <section aria-label={t("historicalEvidenceSummary")} className="mt-5 space-y-4">
                  <Notice tone="warning" title={t("historicalEvidenceBadge")}><p className="whitespace-pre-wrap">{disposalRequest.evidenceExceptionReason}</p></Notice>
                  <KeyValueList
                    items={[
                      { key: "grantedBy", label: t("historicalEvidenceGrantedBy"), value: evidenceExceptionGrantorLabel },
                      {
                        key: "grantedAt",
                        label: t("historicalEvidenceGrantedAt"),
                        value: disposalRequest.evidenceExceptionGrantedAt ? formatDateTime(disposalRequest.evidenceExceptionGrantedAt) : null,
                      },
                    ]}
                  />
                </section>
              ) : null}
            </ContentPanel>
          ) : null}

          {/* The ActionBar's #history link scrolls here, and ContentPanel takes no id: the panel classes (2D-2 R4). */}
          <section id="history" className={cn(getPanelClasses(), "p-4 sm:p-5")}>
            <h2 className="mb-4 break-words text-base font-semibold text-foreground">{t("disposalHistory")}</h2>
            {movements.length === 0 ? (
              <ActionEmptyState
                icon={<History className="h-6 w-6" />}
                title={t("emptyHistoryTitle")}
                description={t("emptyHistoryHelp")}
              />
            ) : (
              <ol className="space-y-4">
                {movements.map((movement) => (
                  <li key={movement.id} className="relative border-l border-border pl-4">
                    <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: "primary" }), "absolute top-2 -left-1")} />
                    <div className="rounded-md bg-background p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="font-medium text-foreground">
                          {disposalMovementLabels[movement.movementType]
                            ?? (knownMovementTypeKeys.has(movement.movementType)
                              ? tAsset(`movementTypes.${movement.movementType}`)
                              : formatMovementType(movement.movementType))}
                        </div>
                        <div className="text-meta text-muted-foreground">{formatDateTime(movement.performedAt)}</div>
                      </div>
                      <KeyValueList
                        className="mt-2"
                        items={[
                          { key: "from", label: tAsset("fromValue"), value: movementLabels.get(movement.id)?.from },
                          { key: "to", label: tAsset("toValue"), value: movementLabels.get(movement.id)?.to },
                        ]}
                      />
                      {movement.reason ? <p className="mt-2 text-sm text-muted-foreground">{movement.reason}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <ContentPanel title={t("asset")}>
            <div className="space-y-4">
              <KeyValueList
                items={[
                  { key: "asset", label: t("asset"), value: <><span className="tag">{disposalRequest.asset.assetTag}</span> - {disposalRequest.asset.name}</> },
                  { key: "serialNumber", label: tAsset("serialNumber"), value: disposalRequest.asset.serialNumber },
                  { key: "fixedAssetCode", label: tAsset("fixedAssetCode"), value: disposalRequest.asset.fixedAssetCode },
                  { key: "category", label: tAsset("category"), value: <><span className="tag">{disposalRequest.asset.category.code}</span> - {disposalRequest.asset.category.name}</> },
                  { key: "brand", label: tAsset("brand"), value: disposalRequest.asset.brand?.name },
                  { key: "model", label: tAsset("model"), value: disposalRequest.asset.model?.name },
                  { key: "company", label: tAsset("company"), value: <><span className="tag">{disposalRequest.asset.company.code}</span> - {disposalRequest.asset.company.nameTh}</> },
                  { key: "branch", label: tAsset("branch"), value: <><span className="tag">{disposalRequest.asset.branch.code}</span> - {disposalRequest.asset.branch.name}</> },
                  {
                    key: "currentLocation",
                    label: t("currentLocation"),
                    value: <><span className="tag">{disposalRequest.asset.currentLocation.code}</span> - {disposalRequest.asset.currentLocation.name}</>,
                  },
                  {
                    key: "custodian",
                    label: t("custodian"),
                    value: disposalRequest.asset.custodian ? <><span className="tag">{disposalRequest.asset.custodian.code}</span> - {disposalRequest.asset.custodian.fullNameTh}</> : null,
                    nilLabel: tAsset("noCustodian"),
                  },
                  { key: "currentStatus", label: t("currentStatus"), value: disposalRequest.asset.status.nameTh },
                  { key: "currentCondition", label: t("currentCondition"), value: disposalRequest.asset.condition.nameTh },
                  {
                    key: "purchasePrice",
                    label: tAsset("purchasePrice"),
                    value: disposalRequest.asset.purchasePrice == null ? null : <span className="num">{formatMoney(Number(disposalRequest.asset.purchasePrice), { unit: tCommon("baht") })}</span>,
                  },
                ]}
              />
              <Link href={`/${locale}/assets/${disposalRequest.asset.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                {t("openAsset")}
              </Link>
            </div>
          </ContentPanel>

          <DisposalAttachments requestId={disposalRequest.id} attachments={attachments} canManage={canCreate || canApprove || canEdit} />
          {disposalRequest.batch ? <DisposalAttachments requestId={disposalRequest.batch.id} attachments={batchAttachments} canManage={false} title={t("batchSharedEvidence")} /> : null}
        </aside>
      </div>
    </div>
  )
}

function formatSource(sourceType?: string | null, sourceId?: string | null) {
  if (!sourceType && !sourceId) return null
  return [sourceType, sourceId].filter(Boolean).join(" / ")
}

function getCurrentOwnerContext(request: {
  requestStatus: string
  requestedBy: { code: string; fullNameTh: string }
  approver: { code: string; fullNameTh: string } | null
  executedBy: { code: string; fullNameTh: string } | null
}, labels: { centralApprovalQueue: string; executionQueue: string }) {
  if (request.requestStatus === "pending") {
    return { roleLabel: "approver" as const, ownerLabel: request.approver ? `${request.approver.code} - ${request.approver.fullNameTh}` : labels.centralApprovalQueue }
  }
  if (request.requestStatus === "approved") return { roleLabel: "executedBy" as const, ownerLabel: labels.executionQueue }
  if (request.requestStatus === "disposed") {
    return { roleLabel: "executedBy" as const, ownerLabel: request.executedBy ? `${request.executedBy.code} - ${request.executedBy.fullNameTh}` : labels.executionQueue }
  }
  return { roleLabel: "approver" as const, ownerLabel: request.approver ? `${request.approver.code} - ${request.approver.fullNameTh}` : labels.centralApprovalQueue }
}

const knownMovementTypeKeys = new Set([
  "create",
  "import",
  "checkout",
  "checkin",
  "transfer",
  "location_change",
  "custodian_change",
  "status_change",
  "condition_change",
  "department_change",
  "ownership_type_change",
  "license_total_seats_change",
  "license_used_seats_change",
  "license_assigned_asset_change",
  "bulk_location_move",
  "bulk_location_update",
  "bulk_custodian_update",
  "component_install",
  "component_remove",
  "installed_in_parent",
  "removed_from_parent",
  "maintenance_create",
  "maintenance_pm_create",
  "audit_correction",
])
