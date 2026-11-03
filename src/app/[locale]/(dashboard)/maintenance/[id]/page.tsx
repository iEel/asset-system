import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Trash2 } from "lucide-react"
import { getRepairConditionOptions, repairConditionDefault } from "@/lib/asset-lifecycle-policy"
import { summarizeAssetRepairs } from "@/lib/asset-repair-rules"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatMoney } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"
import { toLocalDateInputValue } from "@/lib/local-date"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { RepairRecordActionsProvider } from "@/components/maintenance/repair-record-actions"
import { RepairRecordHeaderActions } from "@/components/maintenance/repair-record-header-actions"
import { RepairNextStepCard } from "@/components/maintenance/repair-next-step-card"
import { RepairRecordDetails } from "@/components/maintenance/repair-record-details"
import { RepairRecordHistory } from "@/components/maintenance/repair-record-history"
import { RepairRecordPhoneBar } from "@/components/maintenance/repair-record-phone-bar"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { assetHistoryActorLabel } from "@/lib/asset-history-rules"
import { openDisposalRequestWhere } from "@/lib/asset-actions"
import { getMaintenanceAttachmentType } from "@/lib/maintenance-attachments"
import { loadRepairAssetFacts, type RepairAssetFactsDb } from "@/lib/repair-asset-facts"
import type { RepairAssetFacts } from "@/lib/repair-record-outlook"
import {
  buildRepairHistory,
  buildRepairNextStep,
  repairDurationLine,
  type RepairDetailRecord,
  type RepairHistoryValue,
} from "@/lib/repair-record-detail-rules"
import { RepairRecordAssetPanel } from "@/components/maintenance/repair-record-asset-panel"
import { canAttachToRepairRecord, getRepairRecordStatusTone, isOpenRepairStatus, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { actionBarPagePadding } from "@/components/ui/action-bar"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, maintenanceListCrumbHref, normalizeMaintenanceReturnTo } from "@/lib/operational-return-navigation"

type RepairRecordPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function RepairRecordPage({ params, searchParams }: RepairRecordPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canCreateDisposal = hasPermission(user, "disposal", "create")
  // รับคืน in the early refusal opens the check-in page, which needs asset:edit (group 5 spec §5).
  const canReturn = hasPermission(user, "asset", "edit")
  const t = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")

  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          purchasePrice: true,
          conditionId: true,
          ownershipType: true,
          custodianId: true,
          status: { select: { name: true, nameTh: true } },
          condition: { select: { nameTh: true } },
          department: { select: { name: true } },
          currentLocation: { select: { name: true, branch: { select: { name: true } } } },
          custodian: { select: { fullNameTh: true } },
        },
      },
      reportedBy: { select: { code: true, fullNameTh: true } },
      assignedTo: { select: { code: true, fullNameTh: true } },
      inspectedBy: { select: { code: true, fullNameTh: true } },
      vendor: { select: { id: true, code: true, name: true } },
      maintenancePlan: { select: { planNo: true, title: true } },
    },
  })
  if (!ticket) notFound()

  // One read of each (group 5 plan 3 Task 2): the attachments, the movements oldest first, the asset's active records,
  // the asset facts, the status names (Task 3: the card's predicted status and the history's badges) and, after
  // ซ่อมไม่ได้, the asset's open disposal request (G5P3-R7, newest).
  const [attachments, movements, assetRecords, conditions, statuses, loadedFacts, openDisposal] = await Promise.all([
    prisma.attachment.findMany({
      where: { module: "maintenance", referenceId: ticket.id, isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.assetMovement.findMany({
      where: { referenceType: "maintenance", referenceId: ticket.id },
      orderBy: { performedAt: "asc" },
    }),
    // The asset's active records, for the replacement rule the asset tab reads (G5P1-R16).
    prisma.maintenanceTicket.findMany({
      where: { assetId: ticket.asset.id, isActive: true },
      select: { id: true, repairStatus: true, maintenancePlanId: true, reportedDate: true, returnDate: true, repairCost: true },
    }),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.assetStatus.findMany({ where: { isActive: true }, select: { name: true, nameTh: true } }),
    loadRepairAssetFacts(prisma as unknown as RepairAssetFactsDb, ticket.asset.id),
    ticket.outcome === "beyond_repair"
      ? prisma.disposalRequest.findFirst({
          where: { ...openDisposalRequestWhere, assetId: ticket.asset.id },
          select: { id: true, disposalNo: true },
          orderBy: [{ requestDate: "desc" }, { createdAt: "desc" }],
        })
      : null,
  ])
  // A deleted asset keeps its records (the list still shows them), and loadRepairAssetFacts reads active assets only:
  // its card then reads the record's own asset row, with no photo, open record or handover.
  const facts: RepairAssetFacts = loadedFacts ?? {
    id: ticket.asset.id,
    assetTag: ticket.asset.assetTag,
    name: ticket.asset.name,
    statusName: ticket.asset.status.name,
    statusLabel: ticket.asset.status.nameTh,
    conditionId: ticket.asset.conditionId,
    conditionLabel: ticket.asset.condition.nameTh,
    ownershipType: ticket.asset.ownershipType,
    custodianId: ticket.asset.custodianId,
    holderName: ticket.asset.custodian?.fullNameTh ?? null,
    departmentName: ticket.asset.department?.name ?? null,
    roomName: ticket.asset.currentLocation.name,
    branchName: ticket.asset.currentLocation.branch?.name ?? null,
    photo: null,
    openRecord: null,
    activeCheckout: null,
  }
  const statusLabels = Object.fromEntries(statuses.map((status) => [status.name, status.nameTh]))
  // G5P3-R3: the people who recorded the movements and uploaded the files, in one read; an unknown id names no one.
  const actorIds = [...new Set([...movements.map((movement) => movement.performedBy), ...attachments.map((attachment) => attachment.uploadedBy)])]
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, username: true, displayName: true, email: true, employee: { select: { code: true, fullNameTh: true } } },
      })
    : []
  const actorById = new Map(actors.map((actor) => [actor.id, assetHistoryActorLabel(actor)]))
  // The condition after a usable repair (group 3 spec §19.4): ดี or พอใช้, starting at the asset's own when offered.
  const conditionOptions = getRepairConditionOptions(conditions).map((condition) => ({ id: condition.id, label: condition.nameTh }))
  const movementLabels = await getMovementDisplayLabels(movements)
  const record: RepairDetailRecord = {
    id: ticket.id,
    repairStatus: ticket.repairStatus,
    outcome: ticket.outcome,
    reportedDate: ticket.reportedDate,
    returnDate: ticket.returnDate,
    problem: ticket.problem,
    vendorName: ticket.vendor?.name ?? null,
    createdBy: ticket.createdBy,
    maintenancePlanId: ticket.maintenancePlanId,
  }
  // G5P3-R5: the record's cancel movement, the latest when there is more than one.
  const cancelMovement = movements.findLast((movement) => movement.movementType === "maintenance_cancel")
  const nextStep = buildRepairNextStep({
    record,
    facts,
    openDisposal,
    cancel: cancelMovement ? { at: cancelMovement.performedAt, reason: cancelMovement.reason } : null,
  })
  const history = buildRepairHistory({
    record,
    movements: movements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      performedAt: movement.performedAt,
      performedBy: movement.performedBy,
      fromLabel: toHistoryValue(movement.movementType, movementLabels.get(movement.id)?.from),
      toLabel: toHistoryValue(movement.movementType, movementLabels.get(movement.id)?.to),
      reason: movement.reason,
    })),
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      uploadedAt: attachment.uploadedAt,
      uploadedBy: attachment.uploadedBy,
      type: getMaintenanceAttachmentType(attachment.originalName),
    })),
    actorById,
  })
  const duration = repairDurationLine(record, new Date())
  const recordStatus = toRepairRecordStatus(ticket.repairStatus)
  const isOpen = isOpenRepairStatus(ticket.repairStatus)
  // ซ่อมเสร็จ (header, card, phone bar) needs maintenance:edit on an open record (spec §6).
  const canComplete = canEdit && isOpen
  const canAttach = canAttachToRepairRecord({ userId: user.id, canEdit, canCreate }, ticket)
  // The open handover that refuses ซ่อมไม่ได้, from the card's own row, so the dialog and the card say the same thing.
  const beyondRow = nextStep.kind === "open" ? nextStep.rows.find((row) => row.outcome === "beyond_repair") : undefined
  const held = beyondRow?.outlook.kind === "refused" ? beyondRow.outlook.held : null
  const outcomeLabel = ticket.outcome === "usable" || ticket.outcome === "beyond_repair"
    ? t(`outcome.${ticket.outcome}`)
    : recordStatus === "closed" ? t("outcome.unknown") : null
  // The header's meta line (spec §8.1): the reported day, then the day count while open, else the close or cancel day.
  const stateLine = duration
    ? t(`detail.${duration.key}`, { days: duration.days })
    : recordStatus === "closed" && ticket.returnDate
      ? t("detail.closedOn", { date: formatAssetDetailDate(ticket.returnDate, locale) })
      : recordStatus === "cancelled" && cancelMovement
        ? t("detail.cancelledOn", { date: formatAssetDetailDate(cancelMovement.performedAt, locale) })
        : null
  const legacyFields = [
    { label: t("legacyFields.assignedTo"), value: ticket.assignedTo ? `${ticket.assignedTo.code} - ${ticket.assignedTo.fullNameTh}` : null },
    { label: t("legacyFields.dueDate"), value: ticket.dueDate ? formatDate(ticket.dueDate) : null },
    { label: t("legacyFields.laborCost"), value: ticket.laborCost == null ? null : formatMoney(Number(ticket.laborCost), { unit: tCommon("baht") }) },
    { label: t("legacyFields.partsCost"), value: ticket.partsCost == null ? null : formatMoney(Number(ticket.partsCost), { unit: tCommon("baht") }) },
    { label: t("legacyFields.quotationNo"), value: ticket.quotationNo },
    { label: t("legacyFields.warrantyClaim"), value: ticket.warrantyClaim ? tCommon("yes") : null },
    { label: t("legacyFields.rootCause"), value: ticket.rootCause },
    { label: t("legacyFields.inspectedBy"), value: ticket.inspectedBy ? `${ticket.inspectedBy.code} - ${ticket.inspectedBy.fullNameTh}` : null },
  ].filter((field) => Boolean(field.value))
  const hasLegacyDetails = legacyFields.length > 0
  const purchasePrice = Number(ticket.asset.purchasePrice ?? 0)
  // One replacement rule with the asset tab (G5P1-R16, spec §8.3): the count and the cost leave out PM visits and
  // cancelled records.
  const assetRepairSummary = summarizeAssetRepairs(
    assetRecords.map((record) => ({ ...record, repairCost: record.repairCost == null ? null : Number(record.repairCost) })),
    purchasePrice,
    new Date(),
  )
  const repairCostRatio = purchasePrice > 0 ? assetRepairSummary.totalCost / purchasePrice : 0
  const shouldReviewDisposal = assetRepairSummary.replacementWarning
  // G5P3-R7: after ซ่อมไม่ได้ the card shows the disposal step (the request, the open request or the disposed asset), so
  // the disposal-review panel never offers the request again.
  const nextStepOffersDisposal = nextStep.kind === "closedBeyond"
  // The repair list, the PM list or the asset page the user came from (group 5 spec §5 "Way back").
  const returnToHref = normalizeMaintenanceReturnTo(locale, rawSearchParams.returnTo, "maintenance")
  const listCrumbHref = maintenanceListCrumbHref(returnToHref, `/${locale}/maintenance`)
  const printHref = appendOperationalReturnTo(`/${locale}/maintenance/${ticket.id}/print`, returnToHref)
  const assetHref = `/${locale}/assets/${ticket.asset.id}`
  const disposalReason = `${ticket.asset.assetTag} / ${ticket.repairNo}: ${t("disposalReviewCount", { count: assetRepairSummary.repairCount })}, ${t("disposalReviewCost", { cost: formatMoney(assetRepairSummary.totalCost, { unit: tCommon("baht") }) })}`
  const disposalRequestHref = appendOperationalReturnTo(
    `/${locale}/disposal/new?assetId=${ticket.asset.id}&reason=${encodeURIComponent(disposalReason)}&sourceType=maintenance&sourceId=${ticket.id}`,
    returnToHref,
  )

  return (
    <RepairRecordActionsProvider
      recordId={ticket.id}
      repairNo={ticket.repairNo}
      expectedUpdatedAt={ticket.updatedAt.toISOString()}
      isOpen={isOpen}
      details={{
        reportedDate: toLocalDateInputValue(ticket.reportedDate),
        problem: ticket.problem,
        vendor: ticket.vendor ? { id: ticket.vendor.id, label: `${ticket.vendor.code} - ${ticket.vendor.name}` } : null,
        repairCost: ticket.repairCost?.toString() ?? "",
        invoiceNo: ticket.invoiceNo ?? "",
        remark: ticket.resolution ?? "",
      }}
      conditionOptions={conditionOptions}
      initialConditionId={repairConditionDefault(ticket.asset.conditionId, conditionOptions)}
      held={held}
      assetId={ticket.asset.id}
      locale={locale}
      canReturn={canReturn}
      todayKey={getBangkokDateKey(new Date())}
    >
      <div className={`space-y-6 ${canComplete ? actionBarPagePadding.withPrimary : actionBarPagePadding.single}`}>
        <PageHeader
          breadcrumbs={[{ label: t("title"), href: listCrumbHref }, { label: ticket.repairNo, code: true }]}
          title={ticket.asset.name}
          meta={
            <>
              <span className="tag">{ticket.repairNo}</span>
              <StatusBadge label={t(`status.${recordStatus}`)} tone={getRepairRecordStatusTone(ticket.repairStatus)} />
              <span>
                {t("asset")} <span className="tag">{ticket.asset.assetTag}</span>
              </span>
              <span>
                {t("detail.reportedOn", { date: formatAssetDetailDate(ticket.reportedDate, locale) })}
                {stateLine ? ` · ${stateLine}` : null}
              </span>
            </>
          }
          back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
          actions={<RepairRecordHeaderActions printHref={printHref} canEdit={canEdit} isOpen={isOpen} />}
        />

        <RepairNextStepCard
          nextStep={nextStep}
          locale={locale}
          assetId={ticket.asset.id}
          assetHref={assetHref}
          currentStatus={{ name: facts.statusName, label: facts.statusLabel }}
          statusLabels={statusLabels}
          canEdit={canEdit}
          canCreate={canCreate}
          canAttach={canAttach}
          canReturn={canReturn}
          canCreateDisposal={canCreateDisposal}
          disposalRequestHref={disposalRequestHref}
        />

        {/* Two columns from xl: details beside the asset, then the history beside the attachments. Stacked, the order is
            the phone's (spec §8.6): details, asset, history, attachments. */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-6">
            <RepairRecordDetails
              ticket={{ ...ticket, repairCost: ticket.repairCost == null ? null : Number(ticket.repairCost) }}
              locale={locale}
              isOpen={isOpen}
              outcomeLabel={outcomeLabel}
            />

            {hasLegacyDetails ? (
              <ContentPanel title={t("legacyTitle")}>
                <KeyValueList items={legacyFields} />
              </ContentPanel>
            ) : null}
          </div>

          <div className="min-w-0 space-y-6">
            <RepairRecordAssetPanel facts={facts} locale={locale} recordCount={assetRecords.length} returnTo={returnToHref} />

            {shouldReviewDisposal && canCreateDisposal ? (
              <ContentPanel title={t("disposalReviewTitle")}>
                <Notice
                  tone="warning"
                  action={
                    nextStepOffersDisposal ? null : (
                      <Link href={disposalRequestHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                        <Trash2 aria-hidden="true" />
                        {t("openDisposalRequest")}
                      </Link>
                    )
                  }
                >
                  <p>{t("disposalReviewCount", { count: assetRepairSummary.repairCount })}</p>
                  <p>{t("disposalReviewCost", { cost: formatMoney(assetRepairSummary.totalCost, { unit: tCommon("baht") }) })}</p>
                  {purchasePrice > 0 ? <p>{t("disposalReviewRatio", { percent: Math.round(repairCostRatio * 100) })}</p> : null}
                </Notice>
              </ContentPanel>
            ) : null}
          </div>

          <div className="min-w-0">
            <RepairRecordHistory history={history} locale={locale} statusLabels={statusLabels} />
          </div>

          <div id="attachments" className="min-w-0 scroll-mt-6">
            <MaintenanceAttachments ticketId={ticket.id} repairStatus={ticket.repairStatus} attachments={attachments} canEdit={canAttach} canDelete={canEdit} />
          </div>
        </div>

        <RepairRecordPhoneBar
          repairNo={ticket.repairNo}
          assetName={ticket.asset.name}
          assetHref={assetHref}
          printHref={printHref}
          canEdit={canEdit}
          isOpen={isOpen}
        />
      </div>
    </RepairRecordActionsProvider>
  )
}

// A movement's from or to value for the history (spec §8.3): an asset status on the repair movements, a condition on
// condition_change, else plain text.
function toHistoryValue(movementType: string, label: string | null | undefined): RepairHistoryValue | null {
  if (!label) return null
  if (movementType === "condition_change") return { kind: "condition", value: label }
  if (movementType.startsWith("maintenance_")) return { kind: "status", value: label }
  return { kind: "text", value: label }
}
