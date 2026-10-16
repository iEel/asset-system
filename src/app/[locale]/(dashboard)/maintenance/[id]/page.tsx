import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FileText, History, Printer, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatMoney } from "@/lib/display-format"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { toLocalDateInputValue } from "@/lib/local-date"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { RepairRecordActions } from "@/components/maintenance/repair-record-actions"
import { getMaintenanceMovementLabel, getMovementDisplayLabels } from "@/lib/movement-labels"
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
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
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
          status: { select: { nameTh: true } },
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
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

  const [attachments, movements, assetRepairSummary] = await Promise.all([
    prisma.attachment.findMany({
      where: { module: "maintenance", referenceId: ticket.id, isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.assetMovement.findMany({
      where: { referenceType: "maintenance", referenceId: ticket.id },
      orderBy: { performedAt: "desc" },
    }),
    prisma.maintenanceTicket.aggregate({
      where: { assetId: ticket.asset.id, isActive: true, repairStatus: { not: "cancelled" } },
      _count: { _all: true },
      _sum: { repairCost: true },
    }),
  ])
  const movementLabels = await getMovementDisplayLabels(movements)
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
  const totalRepairCount = assetRepairSummary._count._all
  const totalRepairCost = Number(assetRepairSummary._sum.repairCost ?? 0)
  const purchasePrice = Number(ticket.asset.purchasePrice ?? 0)
  const repairCostRatio = purchasePrice > 0 ? totalRepairCost / purchasePrice : 0
  const shouldReviewDisposal = totalRepairCount >= 3 || repairCostRatio >= 0.5
  const returnToHref = normalizeOperationalReturnTo(locale, "maintenance", rawSearchParams.returnTo)
  const printHref = appendOperationalReturnTo(`/${locale}/maintenance/${ticket.id}/print`, returnToHref)
  const disposalReason = `${ticket.asset.assetTag} / ${ticket.repairNo}: ${t("disposalReviewCount", { count: totalRepairCount })}, ${t("disposalReviewCost", { cost: formatMoney(totalRepairCost, { unit: tCommon("baht") }) })}`
  const disposalRequestHref = appendOperationalReturnTo(
    `/${locale}/disposal/new?assetId=${ticket.asset.id}&reason=${encodeURIComponent(disposalReason)}&sourceType=maintenance&sourceId=${ticket.id}`,
    returnToHref,
  )

  return (
    <div className={`space-y-6 ${actionBarPagePadding.single}`}>
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: returnToHref }, { label: ticket.repairNo, code: true }]}
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
            {movements.length === 0 ? (
              <EmptyNote>{t("historyEmpty")}</EmptyNote>
            ) : (
              <ol className="space-y-4">
                {movements.map((movement) => (
                  <li key={movement.id} className="relative border-l border-border pl-4">
                    <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: "primary" }), "absolute top-2 -left-1")} />
                    <div className="rounded-md bg-background p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="font-medium text-foreground">{getMaintenanceMovementLabel(movement.movementType, {
                          create: t("movement.create"),
                          statusUpdate: t("movement.statusUpdate"),
                          close: t("movement.close"),
                          cancel: t("movement.cancel"),
                          pmCreate: t("movement.pmCreate"),
                          fallback: t("movement.fallback"),
                        })}</div>
                        <div className="text-meta text-muted-foreground">{formatDateTime(movement.performedAt)}</div>
                      </div>
                      <KeyValueList
                        className="mt-2"
                        items={[
                          { key: "from", label: t("fromValue"), value: movementLabels.get(movement.id)?.from },
                          { key: "to", label: t("toValue"), value: movementLabels.get(movement.id)?.to },
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
          <ContentPanel title={t("assetSection")}>
            <div className="space-y-4">
              <KeyValueList
                items={[
                  { key: "asset", label: t("asset"), value: <><span className="tag">{ticket.asset.assetTag}</span> - {ticket.asset.name}</> },
                  { key: "currentStatus", label: t("currentStatus"), value: ticket.asset.status.nameTh },
                  { key: "location", label: t("location"), value: <><span className="tag">{ticket.asset.currentLocation.code}</span> - {ticket.asset.currentLocation.name}</> },
                  {
                    key: "custodian",
                    label: t("custodian"),
                    value: ticket.asset.custodian ? <><span className="tag">{ticket.asset.custodian.code}</span> - {ticket.asset.custodian.fullNameTh}</> : null,
                  },
                ]}
              />
              <Link href={`/${locale}/assets/${ticket.asset.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                {t("openAsset")}
              </Link>
            </div>
          </ContentPanel>

          {shouldReviewDisposal && canCreateDisposal ? (
            <ContentPanel title={t("disposalReviewTitle")}>
              <Notice
                tone="warning"
                action={
                  <Link href={disposalRequestHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                    <Trash2 aria-hidden="true" />
                    {t("openDisposalRequest")}
                  </Link>
                }
              >
                <p>{t("disposalReviewCount", { count: totalRepairCount })}</p>
                <p>{t("disposalReviewCost", { cost: formatMoney(totalRepairCost, { unit: tCommon("baht") }) })}</p>
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
