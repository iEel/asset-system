import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FileText, History, Printer, Trash2 } from "lucide-react"
import { getRepairConditionOptions, repairConditionDefault } from "@/lib/asset-lifecycle-policy"
import { summarizeAssetRepairs } from "@/lib/asset-repair-rules"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatMoney } from "@/lib/display-format"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { toLocalDateInputValue } from "@/lib/local-date"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { RepairRecordActions } from "@/components/maintenance/repair-record-actions"
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
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, maintenanceListCrumbHref, normalizeMaintenanceReturnTo } from "@/lib/operational-return-navigation"
import { getPanelClasses } from "@/lib/design-system"

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
  // the asset facts and, after ซ่อมไม่ได้, the asset's open disposal request (G5P3-R7, newest).
  const [attachments, movements, assetRecords, conditions, loadedFacts, openDisposal] = await Promise.all([
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
  const movementEvents = history.flatMap((event) => (event.kind === "movement" ? [event] : []))
  const recordStatus = toRepairRecordStatus(ticket.repairStatus)
  const isOpen = isOpenRepairStatus(ticket.repairStatus)
  const canAttach = canAttachToRepairRecord({ userId: user.id, canEdit, canCreate }, ticket)
  const outcomeLabel = ticket.outcome === "usable" || ticket.outcome === "beyond_repair"
    ? t(`outcome.${ticket.outcome}`)
    : recordStatus === "closed" ? t("outcome.unknown") : null
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
  // G5P3-R7: when the next step offers the request, the disposal-review panel does not offer it again.
  const nextStepOffersDisposal = nextStep.kind === "closedBeyond" && nextStep.disposal.kind === "canRequest"
  // The repair list, the PM list or the asset page the user came from (group 5 spec §5 "Way back").
  const returnToHref = normalizeMaintenanceReturnTo(locale, rawSearchParams.returnTo, "maintenance")
  const listCrumbHref = maintenanceListCrumbHref(returnToHref, `/${locale}/maintenance`)
  const printHref = appendOperationalReturnTo(`/${locale}/maintenance/${ticket.id}/print`, returnToHref)
  const disposalReason = `${ticket.asset.assetTag} / ${ticket.repairNo}: ${t("disposalReviewCount", { count: assetRepairSummary.repairCount })}, ${t("disposalReviewCost", { cost: formatMoney(assetRepairSummary.totalCost, { unit: tCommon("baht") }) })}`
  const disposalRequestHref = appendOperationalReturnTo(
    `/${locale}/disposal/new?assetId=${ticket.asset.id}&reason=${encodeURIComponent(disposalReason)}&sourceType=maintenance&sourceId=${ticket.id}`,
    returnToHref,
  )

  return (
    <div className={`space-y-6 ${actionBarPagePadding.single}`}>
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: listCrumbHref }, { label: ticket.repairNo, code: true }]}
        title={ticket.asset.name}
        meta={
          <>
            <span className="tag">{ticket.repairNo}</span>
            <StatusBadge label={t(`status.${recordStatus}`)} tone={getRepairRecordStatusTone(ticket.repairStatus)} />
            <span className="tag">{ticket.asset.assetTag}</span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <>
            <Link href={printHref} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Printer aria-hidden="true" />
              {t("print")}
            </Link>
            {canEdit ? (
              <RepairRecordActions
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
              />
            ) : null}
          </>
        }
      />
      <ActionBar
        label={tCommon("actions")}
        actions={[
          { href: `/${locale}/assets/${ticket.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" />, primary: true },
          { href: printHref, label: t("print"), icon: <Printer className="h-4 w-4" /> },
          { href: "#history", label: t("history"), icon: <History className="h-4 w-4" /> },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <ContentPanel title={t("detailTitle")}>
            <KeyValueList
              items={[
                { key: "date", label: t("date"), value: formatDate(ticket.reportedDate) },
                {
                  key: "outcome",
                  label: t("outcomeQuestion"),
                  value: outcomeLabel == null ? null : (
                    <StatusBadge label={outcomeLabel} tone={ticket.outcome === "usable" ? "success" : ticket.outcome === "beyond_repair" ? "warning" : "muted"} />
                  ),
                },
                { key: "returnDate", label: t("returnDate"), value: ticket.returnDate ? formatDate(ticket.returnDate) : null },
                { key: "vendor", label: t("vendor"), value: ticket.vendor ? <><span className="tag">{ticket.vendor.code}</span> - {ticket.vendor.name}</> : t("internal") },
                { key: "cost", label: t("cost"), value: ticket.repairCost == null ? null : <span className="num">{formatMoney(Number(ticket.repairCost))}</span> },
                { key: "invoiceNo", label: t("invoiceNo"), value: ticket.invoiceNo },
                { key: "reporter", label: t("reporter"), value: <><span className="tag">{ticket.reportedBy.code}</span> - {ticket.reportedBy.fullNameTh}</> },
                ...(ticket.maintenancePlan
                  ? [{ key: "plan", label: t("planLabel"), value: <><span className="tag">{ticket.maintenancePlan.planNo}</span> - {ticket.maintenancePlan.title}</> }]
                  : []),
              ]}
            />
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <TextBlock label={t("problem")} value={ticket.problem} />
              <TextBlock label={t("remarkTitle")} value={ticket.resolution} />
            </div>
          </ContentPanel>

          {hasLegacyDetails ? (
            <ContentPanel title={t("legacyTitle")}>
              <KeyValueList items={legacyFields} />
            </ContentPanel>
          ) : null}

          {/* The ActionBar's #history link scrolls here, and ContentPanel takes no id: the panel classes (2D-2 R4). */}
          <section id="history" className={cn(getPanelClasses(), "scroll-mt-6 p-4 sm:p-5")}>
            <h2 className="mb-4 text-base font-semibold text-foreground">{t("history")}</h2>
            {/* Until Task 3 rebuilds the header and the history (group 5 plan 3): the movement events, oldest first, with
                their actor; the day count rides on the list as a data attribute. */}
            {movementEvents.length === 0 ? (
              <EmptyNote>{t("historyEmpty")}</EmptyNote>
            ) : (
              <ol className="space-y-4" data-repair-duration={duration ? `${duration.key}:${duration.days}` : undefined}>
                {movementEvents.map((event) => (
                  <li key={event.id} className="relative border-l border-border pl-4">
                    <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: "primary" }), "absolute top-2 -left-1")} />
                    <div className="rounded-md bg-background p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="font-medium text-foreground">{t(`movement.${event.labelKey}`)}</div>
                        <div className="text-meta text-muted-foreground">
                          {formatDateTime(event.at)}
                          {event.actor ? ` · ${event.actor}` : null}
                        </div>
                      </div>
                      <KeyValueList
                        className="mt-2"
                        items={[
                          { key: "from", label: t("fromValue"), value: event.from?.value },
                          { key: "to", label: t("toValue"), value: event.to?.value },
                        ]}
                      />
                      {event.reason ? <p className="mt-2 text-sm text-muted-foreground">{event.reason}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
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

          <div id="attachments" className="scroll-mt-6">
            <MaintenanceAttachments ticketId={ticket.id} attachments={attachments} canEdit={canAttach} canDelete={canEdit} />
          </div>
        </aside>
      </div>
    </div>
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

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-20 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : <Nil />}
      </div>
    </div>
  )
}
