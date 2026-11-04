import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FileText, History, Printer } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { formatMoney, isBlankValue } from "@/lib/display-format"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalNextStepCard, type DisposalNextStepState } from "@/components/disposal/disposal-next-step-card"
import { DisposalPhotoGallery } from "@/components/disposal/disposal-photo-gallery"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList, type KeyValueItem } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { RowActions } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { filterDisposalExecutorOptions, getDisposalApprovalSodReason, getDisposalExecutionStatusOptions, getDisposalSegregationError } from "@/lib/disposal-policy"
import { getDisposalNextAction } from "@/lib/disposal-stage"
import { listDisposalPhotos, isDisposalPhotoFile } from "@/lib/disposal-photo"
import { formatMovementType } from "@/lib/asset-detail-format"
import { getAssetStateTone, getPanelClasses } from "@/lib/design-system"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"
import { readDisposalSourceLinks } from "@/lib/disposal-source"

type DisposalDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; uploadErrors?: string | string[] }>
}

// Labels above values, in one column, long codes and names wrap anywhere (board DP-Request).
const stackedKeyValues = "grid-cols-1 gap-y-0.5 [&>dd+dt]:mt-3 [overflow-wrap:anywhere]"

// The disposal request page, board DP-Request (group 6 spec §9.1–9.3, §9.5): the header with print and ⋯, the next-step
// card, the request details with the source link and the reason, the decision, execution and history panels, and a
// 380px aside with the asset's photos and facts and the evidence.
// Below lg (board DP-Request-Phone, §9.6) the two columns dissolve (contents) and the panels take one order: the
// next-step card, the asset status card with the effect lines, the request details, the evidence, then the rest. The
// header's print and history go into a ⋯, and the ActionBar shows only with a next step: ปฏิเสธ and อนุมัติ to decide,
// or บันทึกตัดจำหน่าย when approved with disposal:edit (P3-R1). It never offers the old open-asset primary.
export default async function DisposalDetailPage({ params, searchParams }: DisposalDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canApprove = hasPermission(user, "disposal", "approve")
  const canEdit = hasPermission(user, "disposal", "edit")
  const canCreate = hasPermission(user, "disposal", "create")
  const t = await getTranslations("disposalPage")
  const tInbox = await getTranslations("approvalInboxPage")
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
          status: { select: { name: true, nameTh: true, colorCode: true } },
          condition: { select: { nameTh: true, colorCode: true } },
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
        },
      },
      previousAssetStatus: { select: { name: true, nameTh: true } },
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

  const [movements, attachments, batchAttachments, options, savedSettings, sourceLinks, photoLists] = await Promise.all([
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
    canEdit ? getDisposalOptions() : Promise.resolve(null),
    prisma.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    }),
    readDisposalSourceLinks(prisma, locale, [disposalRequest]),
    listDisposalPhotos(prisma, [{ id: disposalRequest.id, batchId: disposalRequest.batch?.id ?? null }]),
  ])
  const photos = photoLists.get(disposalRequest.id) ?? []
  const sourceLink = sourceLinks.get(disposalRequest.id) ?? null
  const sourceValue = !sourceLink
    ? null
    : sourceLink.kind === "other"
      ? sourceLink.text
      : (
          <Link href={sourceLink.href} className={linkVariants({ size: "inherit" })}>
            {sourceLink.kind === "maintenance"
              ? t("sourceMaintenance", { number: sourceLink.number })
              : t("sourceAuditFinding", { number: sourceLink.number })}
          </Link>
        )
  const movementLabels = await getMovementDisplayLabels(movements)
  const workflowPolicy = parseWorkflowApprovalPolicy(savedSettings)
  const sodReason = getDisposalApprovalSodReason({
    segregationRequired: workflowPolicy.segregationRequired,
    actorEmployeeId: user.employeeId,
    actorUserId: user.id,
    requestedById: disposalRequest.requestedById,
    createdByUserId: disposalRequest.createdBy,
  })
  const canExecuteDisposal = canEdit && getDisposalSegregationError({
    action: "execute",
    segregationRequired: workflowPolicy.segregationRequired,
    actorEmployeeId: user.employeeId,
    actorUserId: user.id,
    requestedById: disposalRequest.requestedById,
    createdByUserId: disposalRequest.createdBy,
    approverId: disposalRequest.approverId,
  }) === null
  const executionStatuses = getDisposalExecutionStatusOptions(options?.statuses ?? [])
  const executorOptions = filterDisposalExecutorOptions(options?.employees ?? [], disposalRequest.approverId, workflowPolicy.segregationRequired)

  const statusLabels = {
    pending: t("statuses.pending"),
    approved: t("statuses.approved"),
    disposed: t("statuses.disposed"),
    rejected: t("statuses.rejected"),
  }
  const status = disposalRequest.requestStatus
  const nextAction = getDisposalNextAction(status, {
    canApprove: canApprove && sodReason === null,
    canExecute: canExecuteDisposal,
  })
  const nextStepState: DisposalNextStepState =
    status === "pending" ? (!canApprove ? "waiting" : sodReason ? "own" : "decide")
      : status === "approved" ? "approved"
        : status === "disposed" ? "disposed"
          : "rejected"
  const previousStatusName = disposalRequest.previousAssetStatus
    ? disposalRequest.previousAssetStatus.nameTh || disposalRequest.previousAssetStatus.name
    : null
  const returnToHref = normalizeOperationalReturnTo(locale, "disposal", rawSearchParams.returnTo)
  const printHref = appendOperationalReturnTo(`/${locale}/disposal/${disposalRequest.id}/print`, returnToHref)
  const printLabel = disposalRequest.requestStatus === "disposed" ? t("printFinalDocument") : t("printRequest")
  const assetHref = `/${locale}/assets/${disposalRequest.asset.id}`
  const method = t.has(`types.${disposalRequest.disposalType}`) ? t(`types.${disposalRequest.disposalType}`) : disposalRequest.disposalType
  const disposalMovementLabels: Record<string, string> = {
    disposal_request: t("requestDetail"),
    disposal_approve: t("approve"),
    disposal_reject: t("reject"),
    disposal_execute: t("executionDetail"),
  }

  // Files the request keeps: the no-photo notice, from /disposal/new's ?uploadErrors=<n> when its uploads failed.
  const rawUploadErrors = Array.isArray(rawSearchParams.uploadErrors) ? rawSearchParams.uploadErrors[0] : rawSearchParams.uploadErrors
  const parsedUploadErrors = Number.parseInt(rawUploadErrors ?? "", 10)
  const failedUploads = Number.isFinite(parsedUploadErrors) && parsedUploadErrors > 0 ? parsedUploadErrors : 0
  const isLost = disposalRequest.disposalType === "lost"
  const showNoPhoto = photos.length === 0 && !isLost
  const inheritedQualifying = batchAttachments.filter((file) => isLost || isDisposalPhotoFile(file.fileType)).length

  const executionControl = nextAction === "execute" && options && executionStatuses.length > 0 ? (
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
  const decisionActions = nextAction === "review" ? (
    <>
      <DisposalDecisionButton
        requestId={disposalRequest.id}
        disposalNo={disposalRequest.disposalNo}
        initialDecision="approve"
        triggerLabel={t("approve")}
      />
      <DisposalDecisionButton
        requestId={disposalRequest.id}
        disposalNo={disposalRequest.disposalNo}
        initialDecision="reject"
        triggerLabel={t("reject")}
      />
    </>
  ) : null
  // The phone's next step, or nothing: then the page has no ActionBar (§9.6).
  const phoneAction =
    nextStepState === "decide" ? (
      <div className="grid grid-cols-2 gap-2 [&_button]:w-full">
        <DisposalDecisionButton
          requestId={disposalRequest.id}
          disposalNo={disposalRequest.disposalNo}
          initialDecision="reject"
          triggerLabel={t("reject")}
        />
        <DisposalDecisionButton
          requestId={disposalRequest.id}
          disposalNo={disposalRequest.disposalNo}
          initialDecision="approve"
          triggerLabel={t("approve")}
        />
      </div>
    ) : nextStepState === "approved" && canEdit && executionControl ? executionControl
      : null
  const effectItems: KeyValueItem[] = [
    { key: "approve", label: tInbox("effectIfApprove"), value: tInbox("effectApprove") },
    {
      key: "reject",
      label: tInbox("effectIfReject"),
      value: previousStatusName ? tInbox("effectReject", { status: previousStatusName }) : tInbox("effectRejectUnknown"),
    },
  ]

  const money = (value: unknown) => (value == null ? null : <span className="num">{formatMoney(Number(value), { unit: tCommon("baht") })}</span>)
  const person = (row: { code: string; fullNameTh: string } | null) => (row ? <>{row.fullNameTh} <span className="tag">{row.code}</span></> : null)
  // The estimates show only on an old request that has one: a request asks for no price (the user, 2026-11-04).
  const requestItems: KeyValueItem[] = [
    { key: "disposalType", label: t("requestPage.method"), value: method },
    { key: "saleValue", label: t("saleValue"), value: money(disposalRequest.saleValue) },
    { key: "salvageValue", label: t("salvageValue"), value: money(disposalRequest.salvageValue) },
    { key: "requestedBy", label: t("requestedBy"), value: person(disposalRequest.requestedBy) },
    { key: "approver", label: t("requestPage.reviewer"), value: disposalRequest.approver ? person(disposalRequest.approver) : t("centralApprovalQueue") },
    { key: "requestDate", label: t("requestDate"), value: formatDateTime(disposalRequest.requestDate) },
    { key: "source", label: t("source"), value: sourceValue },
    {
      key: "batch",
      label: t("sourceBatch"),
      value: disposalRequest.batch ? (
        <Link href={`/${locale}/disposal/batches/${disposalRequest.batch.id}`} className={linkVariants({ size: "inherit" })}>
          <span className="tag">{disposalRequest.batch.batchNo}</span>
        </Link>
      ) : null,
    },
    { key: "reason", label: t("reason"), value: <span className="whitespace-pre-wrap">{disposalRequest.reason}</span> },
  ].filter((item) => !isBlankValue(item.value))
  // Empty rows are hidden (board DP-Request).
  const assetItems: KeyValueItem[] = [
    { key: "assetTag", label: tAsset("assetTag"), value: <span className="tag">{disposalRequest.asset.assetTag}</span> },
    { key: "serialNumber", label: tAsset("serialNumber"), value: disposalRequest.asset.serialNumber },
    { key: "fixedAssetCode", label: tAsset("fixedAssetCode"), value: disposalRequest.asset.fixedAssetCode },
    { key: "category", label: tAsset("category"), value: disposalRequest.asset.category.name },
    { key: "brand", label: tAsset("brand"), value: [disposalRequest.asset.brand?.name, disposalRequest.asset.model?.name].filter(Boolean).join(" · ") || null },
    { key: "branch", label: tAsset("branch"), value: `${disposalRequest.asset.company.nameTh} · ${disposalRequest.asset.branch.name}` },
    { key: "currentLocation", label: t("currentLocation"), value: disposalRequest.asset.currentLocation.name },
    { key: "custodian", label: t("custodian"), value: disposalRequest.asset.custodian?.fullNameTh },
    { key: "currentStatus", label: t("currentStatus"), value: disposalRequest.asset.status.nameTh },
    { key: "currentCondition", label: t("currentCondition"), value: disposalRequest.asset.condition.nameTh },
    { key: "purchasePrice", label: tAsset("purchasePrice"), value: money(disposalRequest.asset.purchasePrice) },
  ].filter((item) => !isBlankValue(item.value))

  return (
    <div className={`space-y-6 ${phoneAction ? actionBarPagePadding.withPrimary : ""}`}>
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: disposalRequest.disposalNo, code: true },
        ]}
        title={disposalRequest.asset.name}
        meta={
          <>
            <span className="text-meta text-muted-foreground">
              <span className="tag">{disposalRequest.asset.assetTag}</span>
              {" · "}
              {t("requestPage.metaRequest", { number: disposalRequest.disposalNo })}
            </span>
            <StatusBadge label={statusLabels[status as keyof typeof statusLabels] ?? status} status={status} />
            <Chip>{method}</Chip>
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <>
            <div className="md:hidden">
              <RowActions
                code={disposalRequest.disposalNo}
                menuLabel={tCommon("moreActionsFor", { code: disposalRequest.disposalNo })}
                groups={[
                  {
                    key: "more",
                    items: [
                      { kind: "link", key: "print", label: printLabel, href: printHref, icon: <Printer aria-hidden="true" /> },
                      { kind: "link", key: "history", label: t("requestPage.history"), href: "#history", icon: <History aria-hidden="true" /> },
                      { kind: "link", key: "asset", label: t("requestPage.openAssetPage"), href: assetHref, icon: <FileText aria-hidden="true" /> },
                    ],
                  },
                ]}
                menu="sheet"
                triggerVariant="outline"
              />
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Link href={printHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                <Printer aria-hidden="true" />
                {printLabel}
              </Link>
              <RowActions
                code={disposalRequest.disposalNo}
                menuLabel={tCommon("moreActionsFor", { code: disposalRequest.disposalNo })}
                groups={[
                  {
                    key: "more",
                    items: [
                      { kind: "link", key: "history", label: t("requestPage.history"), href: "#history", icon: <History aria-hidden="true" /> },
                      { kind: "link", key: "asset", label: t("requestPage.openAssetPage"), href: assetHref, icon: <FileText aria-hidden="true" /> },
                    ],
                  },
                ]}
                menu="dropdown"
                triggerVariant="outline"
              />
            </div>
          </>
        }
      />
      <DisposalNextStepCard
        state={nextStepState}
        sodReason={sodReason}
        approverLabel={disposalRequest.approver?.fullNameTh ?? null}
        waitingSince={formatDateTime(disposalRequest.requestDate)}
        effect={{
          approve: tInbox("effectApprove"),
          reject: previousStatusName ? tInbox("effectReject", { status: previousStatusName }) : tInbox("effectRejectUnknown"),
        }}
        actions={decisionActions}
        executionAction={executionControl}
        rejectRemark={disposalRequest.approvalRemark}
        segregationRequired={workflowPolicy.segregationRequired}
        approvedByViewer={workflowPolicy.segregationRequired && Boolean(disposalRequest.approverId) && disposalRequest.approverId === user.employeeId}
        previousStatus={previousStatusName}
        // The execution date is a day (stored at midnight), not a time.
        doneAt={disposalRequest.executionDate ? formatDate(disposalRequest.executionDate) : null}
      />
      {/* Below lg: what the asset is now and what each decision does to it (board DP-Request-Phone). */}
      <section data-disposal-asset-status className={cn(getPanelClasses(), "p-4 sm:p-5 lg:hidden")}>
        <h2 className="mb-3 break-words text-base font-semibold text-foreground">{t("requestPage.assetStatusTitle")}</h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
          {t("requestPage.assetStatusNow")}
          <StatusBadge label={disposalRequest.asset.status.nameTh} tone={getAssetStateTone(disposalRequest.asset.status.name)} />
        </p>
        {status === "pending" ? <KeyValueList className="mt-3" items={effectItems} /> : null}
      </section>
      {phoneAction ? <ActionBar label={tCommon("actions")} primaryAction={phoneAction} actions={[]} /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="contents lg:block lg:min-w-0 lg:space-y-6">
          <div data-disposal-panel="details" className="min-w-0 max-lg:order-1">
            <ContentPanel title={t("requestDetail")}>
              <KeyValueList className={stackedKeyValues} items={requestItems} />
            </ContentPanel>
          </div>

          {disposalRequest.requestStatus !== "pending" ? (
            <div data-disposal-panel="decision" className="min-w-0 max-lg:order-5">
              <ContentPanel title={t("decisionDetail")}>
                <KeyValueList
                  items={[
                    { key: "approvedAt", label: t("approvedAt"), value: disposalRequest.approvedAt ? formatDateTime(disposalRequest.approvedAt) : null },
                    {
                      key: "approvalRemark",
                      label: t("approvalRemark"),
                      value: disposalRequest.approvalRemark ? <span className="whitespace-pre-wrap">{disposalRequest.approvalRemark}</span> : null,
                    },
                  ]}
                />
              </ContentPanel>
            </div>
          ) : null}

          {disposalRequest.requestStatus === "disposed" ? (
            <div data-disposal-panel="execution" className="min-w-0 max-lg:order-6">
              <ContentPanel title={t("executionDetail")}>
                <KeyValueList
                  items={[
                    { key: "executionDate", label: t("executionDate"), value: disposalRequest.executionDate ? formatDate(disposalRequest.executionDate) : null },
                    {
                      key: "executedBy",
                      label: t("executedBy"),
                      value: disposalRequest.executedBy ? <><span className="tag">{disposalRequest.executedBy.code}</span> - {disposalRequest.executedBy.fullNameTh}</> : null,
                    },
                    { key: "recipientName", label: t("recipientName"), value: disposalRequest.recipientName },
                    { key: "documentNo", label: t("documentNo"), value: disposalRequest.documentNo },
                    { key: "actualSaleValue", label: t("actualSaleValue"), value: money(disposalRequest.actualSaleValue) },
                    { key: "actualSalvageValue", label: t("actualSalvageValue"), value: money(disposalRequest.actualSalvageValue) },
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
            </div>
          ) : null}

          {/* The ⋯'s #history link scrolls here: the panel classes keep the history's own layout (2D-2 R4). */}
          <section id="history" className={cn(getPanelClasses(), "p-4 sm:p-5 max-lg:order-7")}>
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

        <aside className="contents lg:block lg:min-w-0 lg:space-y-6">
          {/* The photo notice (spec §5, §8.6): no photo warns; a lost machine, which cannot be photographed, gets the muted
              note; a failed upload is named whenever the form reported one (final review). */}
          {showNoPhoto ? (
            <Notice tone="warning" className="max-lg:order-2" data-disposal-no-photo={failedUploads > 0 ? "upload-failed" : "none"}>
              {failedUploads > 0 ? t("requestPage.uploadFailedNoPhoto", { count: failedUploads }) : t("requestPage.noPhoto")}
            </Notice>
          ) : isLost && photos.length === 0 ? (
            <Notice tone="neutral" className="max-lg:order-2" data-disposal-no-photo="lost">
              {t("requestPage.noPhotoLost")}
              {failedUploads > 0 ? <span className="block">{t("requestPage.uploadFailed", { count: failedUploads })}</span> : null}
            </Notice>
          ) : failedUploads > 0 ? (
            <Notice tone="warning" className="max-lg:order-2" data-disposal-no-photo="upload-failed-some">
              {t("requestPage.uploadFailed", { count: failedUploads })}
            </Notice>
          ) : null}
          <div data-disposal-panel="asset" className="min-w-0 max-lg:order-4">
            <ContentPanel title={t("asset")}>
              <div className="space-y-4">
                {photos.length > 0 ? (
                  <DisposalPhotoGallery
                    photos={photos.map((photo) => ({ id: photo.id, originalName: photo.originalName }))}
                    documents={[]}
                    assetName={disposalRequest.asset.name}
                    isLost={isLost}
                  />
                ) : null}
                <KeyValueList className={stackedKeyValues} items={assetItems} />
                <Link href={assetHref} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  {t("openAsset")}
                </Link>
              </div>
            </ContentPanel>
          </div>

          <div data-disposal-panel="evidence" className="min-w-0 space-y-6 max-lg:order-3">
            <DisposalAttachments
              requestId={disposalRequest.id}
              attachments={attachments}
              canManage={canCreate || canApprove || canEdit}
              canDelete={canEdit}
              lastFileLock={{ requestStatus: status, disposalType: disposalRequest.disposalType, inheritedCount: inheritedQualifying }}
              hint={status === "pending" ? t("requestPage.evidenceHint") : undefined}
            />
            {disposalRequest.batch ? <DisposalAttachments requestId={disposalRequest.batch.id} attachments={batchAttachments} canManage={false} title={t("batchSharedEvidence")} /> : null}
          </div>
        </aside>
      </div>
    </div>
  )
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
  "register_location_correction",
  "register_custodian_correction",
  "register_department_correction",
  "register_field_correction",
  "asset_tag_change",
  "component_install",
  "component_remove",
  "installed_in_parent",
  "removed_from_parent",
  "component_outstanding",
  "component_late_return",
  "maintenance_create",
  "maintenance_pm_create",
  "audit_correction",
])
