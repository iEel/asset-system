import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, FileText, History, Printer, Trash2, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getMaintenanceOptions } from "@/lib/maintenance-options"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { MaintenanceTicketCloseButton } from "@/components/maintenance/maintenance-ticket-close-button"
import { MaintenanceTicketStatusButton } from "@/components/maintenance/maintenance-ticket-status-button"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { getMaintenanceAttachmentType } from "@/lib/maintenance-attachments"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, isMaintenanceClosed, isMaintenanceOverdue, maintenanceStatuses } from "@/lib/maintenance-status"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"

type MaintenanceDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function MaintenanceDetailPage({ params, searchParams }: MaintenanceDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const canCreateDisposal = hasPermission(user, "disposal", "create")
  const t = await getTranslations("maintenancePage")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          status: { select: { nameTh: true, colorCode: true } },
          condition: { select: { nameTh: true, colorCode: true } },
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
          purchasePrice: true,
        },
      },
      reportedBy: { select: { code: true, fullNameTh: true } },
      assignedTo: { select: { code: true, fullNameTh: true } },
      inspectedBy: { select: { code: true, fullNameTh: true } },
      vendor: { select: { code: true, name: true } },
    },
  })
  if (!ticket) notFound()

  const [attachments, movements, assetRepairSummary, options] = await Promise.all([
    prisma.attachment.findMany({
      where: { module: "maintenance", referenceId: ticket.id, isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.assetMovement.findMany({
      where: { referenceType: "maintenance", referenceId: ticket.id },
      orderBy: { performedAt: "desc" },
    }),
    prisma.maintenanceTicket.aggregate({
      where: { assetId: ticket.asset.id, isActive: true },
      _count: { _all: true },
      _sum: { repairCost: true },
    }),
    canEdit ? getMaintenanceOptions() : Promise.resolve(null),
  ])
  const movementLabels = await getMovementDisplayLabels(movements)
  const statuses = options?.statuses ?? []
  const totalRepairCount = assetRepairSummary._count._all
  const totalRepairCost = Number(assetRepairSummary._sum.repairCost ?? 0)
  const purchasePrice = Number(ticket.asset.purchasePrice ?? 0)
  const repairCostRatio = purchasePrice > 0 ? totalRepairCost / purchasePrice : 0
  const shouldReviewDisposal = totalRepairCount >= 3 || repairCostRatio >= 0.5
  const hasAfterRepairEvidence = attachments.some((attachment) => getMaintenanceAttachmentType(attachment.originalName) === "after_repair")
  const returnToHref = normalizeOperationalReturnTo(locale, "maintenance", rawSearchParams.returnTo)
  const printHref = appendOperationalReturnTo(`/${locale}/maintenance/${ticket.id}/print`, returnToHref)
  const disposalReason = `${t("disposalReasonPrefix")} ${ticket.asset.assetTag} / ${ticket.repairNo}: ${t("disposalReasonDetail", {
    count: totalRepairCount,
    cost: formatCurrency(totalRepairCost),
  })}`
  const disposalRequestHref = appendOperationalReturnTo(
    `/${locale}/disposal/new?assetId=${ticket.asset.id}&reason=${encodeURIComponent(disposalReason)}&sourceType=maintenance&sourceId=${ticket.id}`,
    returnToHref,
  )

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: ticket.repairNo },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{ticket.repairNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.asset.assetTag} - {ticket.asset.name}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Link
            href={returnToHref}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
          >
            <Wrench className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <Link
            href={printHref}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
          >
            <Printer className="h-4 w-4" />
            {t("printRepair")}
          </Link>
          {canEdit && !isMaintenanceClosed(ticket.repairStatus) && options ? (
            <>
              <MaintenanceTicketStatusButton
                ticketId={ticket.id}
                repairNo={ticket.repairNo}
                currentStatus={ticket.repairStatus}
                assignedToId={ticket.assignedToId}
                dueDate={ticket.dueDate}
                employees={options.employees}
              />
              <MaintenanceTicketCloseButton
                ticketId={ticket.id}
                repairNo={ticket.repairNo}
                statuses={statuses}
                defaultLaborCost={ticket.laborCost?.toString()}
                defaultPartsCost={ticket.partsCost?.toString()}
                defaultRepairCost={ticket.repairCost?.toString()}
                defaultQuotationNo={ticket.quotationNo}
                defaultInvoiceNo={ticket.invoiceNo}
                defaultWarrantyClaim={ticket.warrantyClaim}
                employees={options.employees}
              />
            </>
          ) : null}
          <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, getStatusLabels(t))} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
        </div>
      </div>
      <MobileActionBar
        actions={[
          { href: `/${locale}/assets/${ticket.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" />, primary: true },
          { href: printHref, label: t("printRepair"), icon: <Printer className="h-4 w-4" /> },
          { href: "#history", label: t("maintenanceHistory"), icon: <History className="h-4 w-4" /> },
          { href: returnToHref, label: tCommon("back"), icon: <Wrench className="h-4 w-4" /> },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              {t("ticketDetail")}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("reportedBy")} value={`${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`} />
              <Info label={t("reportedDate")} value={formatDateTime(ticket.reportedDate)} />
              <Info label={t("dueDate")} value={formatDateTime(ticket.dueDate)} />
              <Info label={t("assignedTo")} value={ticket.assignedTo ? `${ticket.assignedTo.code} - ${ticket.assignedTo.fullNameTh}` : null} />
              <Info label={t("repairType")} value={ticket.repairType === "vendor" ? t("vendorRepair") : t("internalRepair")} />
              <Info label={t("vendor")} value={ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : null} />
              <Info label={t("laborCost")} value={ticket.laborCost == null ? null : formatCurrency(Number(ticket.laborCost))} />
              <Info label={t("partsCost")} value={ticket.partsCost == null ? null : formatCurrency(Number(ticket.partsCost))} />
              <Info label={t("repairCost")} value={ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost))} />
              <Info label={t("quotationNo")} value={ticket.quotationNo} />
              <Info label={t("invoiceNo")} value={ticket.invoiceNo} />
              <Info label={t("warrantyClaim")} value={ticket.warrantyClaim ? tCommon("yes") : tCommon("no")} />
              <Info label={t("returnDate")} value={formatDateTime(ticket.returnDate)} />
              <Info label={t("inspectedBy")} value={ticket.inspectedBy ? `${ticket.inspectedBy.code} - ${ticket.inspectedBy.fullNameTh}` : null} />
            </div>
            {isMaintenanceOverdue(ticket.repairStatus, ticket.dueDate) ? (
              <div className="mt-5 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm font-medium text-danger">
                {t("overdueWarning")}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">{t("problem")}</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{ticket.problem}</p>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {t("closeDetail")}
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TextBlock label={t("rootCause")} value={ticket.rootCause} />
              <TextBlock label={t("resolution")} value={ticket.resolution} />
            </div>
            <div className="mt-5 rounded-md border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">{t("closeChecklistTitle")}</h3>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <ChecklistItem done={Boolean(ticket.rootCause)} label={t("closeChecklistRootCause")} />
                <ChecklistItem done={Boolean(ticket.resolution)} label={t("closeChecklistResolution")} />
                <ChecklistItem done={hasAfterRepairEvidence || attachments.length > 0} label={t("closeChecklistEvidence")} />
                <ChecklistItem done={Boolean(ticket.inspectedById)} label={t("closeChecklistInspector")} />
              </div>
            </div>
          </section>

          <section id="history" className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <History className="h-5 w-5 text-primary" />
              {t("maintenanceHistory")}
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
                        <div className="font-medium text-foreground">{movement.movementType.replaceAll("_", " ")}</div>
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
            <h2 className="mb-5 text-lg font-semibold text-foreground">{t("asset")}</h2>
            <div className="space-y-4">
              <Info label={t("asset")} value={`${ticket.asset.assetTag} - ${ticket.asset.name}`} />
              <Info label={t("currentStatus")} value={ticket.asset.status.nameTh} />
              <Info label={t("currentCondition")} value={ticket.asset.condition.nameTh} />
              <Info label={t("currentLocation")} value={`${ticket.asset.currentLocation.code} - ${ticket.asset.currentLocation.name}`} />
              <Info label={t("custodian")} value={ticket.asset.custodian ? `${ticket.asset.custodian.code} - ${ticket.asset.custodian.fullNameTh}` : null} />
              <Link
                href={`/${locale}/assets/${ticket.asset.id}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0"
              >
                {t("openAsset")}
              </Link>
            </div>
          </section>

          {shouldReviewDisposal && canCreateDisposal ? (
            <section className="rounded-lg border border-warning/40 bg-warning/5 p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {t("disposalReviewTitle")}
              </h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>{t("disposalReviewCount", { count: totalRepairCount })}</div>
                <div>{t("disposalReviewCost", { cost: formatCurrency(totalRepairCost) })}</div>
                {purchasePrice > 0 ? <div>{t("disposalReviewRatio", { percent: Math.round(repairCostRatio * 100) })}</div> : null}
              </div>
              <Link
                href={disposalRequestHref}
                className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-warning/40 bg-surface px-3 text-sm font-medium text-warning transition-colors hover:bg-warning/10"
              >
                <Trash2 className="h-4 w-4" />
                {t("openDisposalRequest")}
              </Link>
            </section>
          ) : null}

          <MaintenanceAttachments
            ticketId={ticket.id}
            attachments={attachments}
            canEdit={canEdit}
            canDelete={canEdit && ticket.repairStatus !== "closed"}
          />
        </aside>
      </div>
    </div>
  )
}

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

function getStatusLabels(t: (key: string) => string) {
  return Object.fromEntries(maintenanceStatuses.map((status) => [status, t(`statuses.${status}`)]))
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={done ? "text-success" : "text-muted-foreground"}>
      {done ? "[x]" : "[ ]"} {label}
    </div>
  )
}
