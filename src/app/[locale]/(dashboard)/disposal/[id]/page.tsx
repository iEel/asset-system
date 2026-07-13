import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, ClipboardCheck, FileText, History, Package, Printer } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalMobileActionBar } from "@/components/disposal/disposal-mobile-action-bar"
import { DisposalWorkflowStepper } from "@/components/disposal/disposal-workflow-stepper"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { filterDisposalExecutorOptions, getDisposalDecisionStatusOptions, getDisposalExecutionStatusOptions, getDisposalSegregationError } from "@/lib/disposal-policy"
import { getDisposalNextAction, getDisposalStage } from "@/lib/disposal-stage"
import { formatMovementType } from "@/lib/asset-detail-format"
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
    />
  ) : null

  return (
    <div className="space-y-6 pb-36 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: disposalRequest.disposalNo },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{disposalRequest.disposalNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {disposalRequest.asset.assetTag} - {disposalRequest.asset.name}
          </p>
        </div>
        <div className="hidden min-w-0 flex-col gap-2 md:flex md:flex-row md:flex-wrap md:items-center md:justify-end">
          <Link
            href={returnToHref}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <Link
            href={printHref}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
          >
            <Printer className="h-4 w-4" />
            {printLabel}
          </Link>
          {nextActionControl}
          <StatusBadge label={statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus} status={disposalRequest.requestStatus} />
        </div>
      </div>
      <DisposalWorkflowStepper
        stage={workflowStage}
        currentStageLabel={statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus}
        ownerRoleLabel={ownerContext.roleLabel === "approver" ? t("approver") : t("executedBy")}
        ownerLabel={ownerContext.ownerLabel}
        labels={{
          request: t("requestDetail"),
          decision: t("decisionDetail"),
          execution: t("executionDetail"),
        }}
      />
      {disposalRequest.batch ? (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div><span className="font-medium text-foreground">{t("sourceBatch")}</span><span className="ml-2 text-muted-foreground">{disposalRequest.batch.batchNo}</span></div>
          <Link href={`/${locale}/disposal/batches/${disposalRequest.batch.id}`} className="inline-flex min-h-10 items-center justify-center rounded-md border border-primary/30 bg-surface px-3 font-medium text-primary hover:bg-primary/10">{t("openBatch")}</Link>
        </div>
      ) : null}
      <DisposalMobileActionBar
        primaryAction={nextActionControl}
        actions={[
          { href: `/${locale}/assets/${disposalRequest.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" /> },
          { href: printHref, label: printLabel, icon: <Printer className="h-4 w-4" /> },
          { href: "#history", label: t("disposalHistory"), icon: <History className="h-4 w-4" /> },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              {t("requestDetail")}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("disposalNo")} value={disposalRequest.disposalNo} />
              <Info label={t("disposalType")} value={t(`types.${disposalRequest.disposalType}`)} />
              <Info label={t("requestDate")} value={formatDateTime(disposalRequest.requestDate)} />
              <Info label={t("requestedBy")} value={`${disposalRequest.requestedBy.code} - ${disposalRequest.requestedBy.fullNameTh}`} />
              <Info label={t("approver")} value={disposalRequest.approver ? `${disposalRequest.approver.code} - ${disposalRequest.approver.fullNameTh}` : null} />
              <Info label={tCommon("status")} value={statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus} />
              <Info label={t("saleValue")} value={disposalRequest.saleValue == null ? null : formatCurrency(Number(disposalRequest.saleValue))} />
              <Info label={t("salvageValue")} value={disposalRequest.salvageValue == null ? null : formatCurrency(Number(disposalRequest.salvageValue))} />
              <Info label={t("approvedAt")} value={formatDateTime(disposalRequest.approvedAt)} />
              <Info label={t("source")} value={formatSource(disposalRequest.sourceType, disposalRequest.sourceId)} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">{t("reason")}</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{disposalRequest.reason}</p>
          </section>

          {disposalRequest.requestStatus !== "pending" ? (
            <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                {t("decisionDetail")}
              </h2>
              <TextBlock label={t("approvalRemark")} value={disposalRequest.approvalRemark} />
            </section>
          ) : null}

          {disposalRequest.requestStatus === "disposed" ? (
            <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                {t("executionDetail")}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Info label={t("executionDate")} value={formatDateTime(disposalRequest.executionDate)} />
                <Info label={t("executedBy")} value={disposalRequest.executedBy ? `${disposalRequest.executedBy.code} - ${disposalRequest.executedBy.fullNameTh}` : null} />
                <Info label={t("recipientName")} value={disposalRequest.recipientName} />
                <Info label={t("documentNo")} value={disposalRequest.documentNo} />
                <Info label={t("actualSaleValue")} value={disposalRequest.actualSaleValue == null ? null : formatCurrency(Number(disposalRequest.actualSaleValue))} />
                <Info label={t("actualSalvageValue")} value={disposalRequest.actualSalvageValue == null ? null : formatCurrency(Number(disposalRequest.actualSalvageValue))} />
                <Info label={t("completedAt")} value={formatDateTime(disposalRequest.completedAt)} />
              </div>
              <div className="mt-5">
                <TextBlock label={t("executionRemark")} value={disposalRequest.executionRemark} />
              </div>
            </section>
          ) : null}

          <section id="history" className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <History className="h-5 w-5 text-primary" />
              {t("disposalHistory")}
            </h2>
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
                    <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="rounded-md bg-background p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="font-medium text-foreground">
                          {disposalMovementLabels[movement.movementType]
                            ?? (knownMovementTypeKeys.has(movement.movementType)
                              ? tAsset(`movementTypes.${movement.movementType}`)
                              : formatMovementType(movement.movementType))}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(movement.performedAt)}</div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <Info label={tAsset("fromValue")} value={movementLabels.get(movement.id)?.from} />
                        <Info label={tAsset("toValue")} value={movementLabels.get(movement.id)?.to} />
                      </div>
                      {movement.reason ? <p className="mt-2 text-sm text-muted-foreground">{movement.reason}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Package className="h-5 w-5 text-primary" />
              {t("asset")}
            </h2>
            <div className="space-y-4">
              <Info label={t("asset")} value={`${disposalRequest.asset.assetTag} - ${disposalRequest.asset.name}`} />
              <Info label={tAsset("serialNumber")} value={disposalRequest.asset.serialNumber} />
              <Info label={tAsset("fixedAssetCode")} value={disposalRequest.asset.fixedAssetCode} />
              <Info label={tAsset("category")} value={`${disposalRequest.asset.category.code} - ${disposalRequest.asset.category.name}`} />
              <Info label={tAsset("brand")} value={disposalRequest.asset.brand?.name} />
              <Info label={tAsset("model")} value={disposalRequest.asset.model?.name} />
              <Info label={tAsset("company")} value={`${disposalRequest.asset.company.code} - ${disposalRequest.asset.company.nameTh}`} />
              <Info label={tAsset("branch")} value={`${disposalRequest.asset.branch.code} - ${disposalRequest.asset.branch.name}`} />
              <Info label={t("currentLocation")} value={`${disposalRequest.asset.currentLocation.code} - ${disposalRequest.asset.currentLocation.name}`} />
              <Info label={t("custodian")} value={disposalRequest.asset.custodian ? `${disposalRequest.asset.custodian.code} - ${disposalRequest.asset.custodian.fullNameTh}` : null} />
              <Info label={t("currentStatus")} value={disposalRequest.asset.status.nameTh} />
              <Info label={t("currentCondition")} value={disposalRequest.asset.condition.nameTh} />
              <Info label={tAsset("purchasePrice")} value={disposalRequest.asset.purchasePrice == null ? null : formatCurrency(Number(disposalRequest.asset.purchasePrice))} />
              <Link
                href={`/${locale}/assets/${disposalRequest.asset.id}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0"
              >
                {t("openAsset")}
              </Link>
            </div>
          </section>

          <DisposalAttachments requestId={disposalRequest.id} attachments={attachments} canManage={canCreate || canApprove || canEdit} />
          {disposalRequest.batch ? <DisposalAttachments requestId={disposalRequest.batch.id} attachments={batchAttachments} canManage={false} title={t("batchSharedEvidence")} /> : null}
        </aside>
      </div>
    </div>
  )
}

function formatSource(sourceType?: string | null, sourceId?: string | null) {
  if (!sourceType && !sourceId) return "-"
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

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || "-"}</div>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-24 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : "-"}
      </div>
    </div>
  )
}
