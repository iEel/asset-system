import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, FileText, History, Printer, Trash2, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { toLocalDateInputValue } from "@/lib/local-date"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { RepairRecordActions } from "@/components/maintenance/repair-record-actions"
import { getMaintenanceMovementLabel, getMovementDisplayLabels } from "@/lib/movement-labels"
import { canAttachToRepairRecord, getRepairRecordStatusTone, isOpenRepairStatus, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"

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
    { label: t("legacyFields.laborCost"), value: ticket.laborCost == null ? null : formatCurrency(Number(ticket.laborCost)) },
    { label: t("legacyFields.partsCost"), value: ticket.partsCost == null ? null : formatCurrency(Number(ticket.partsCost)) },
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
  const disposalReason = `${ticket.asset.assetTag} / ${ticket.repairNo}: ${t("disposalReviewCount", { count: totalRepairCount })}, ${t("disposalReviewCost", { cost: formatCurrency(totalRepairCost) })}`
  const disposalRequestHref = appendOperationalReturnTo(
    `/${locale}/disposal/new?assetId=${ticket.asset.id}&reason=${encodeURIComponent(disposalReason)}&sourceType=maintenance&sourceId=${ticket.id}`,
    returnToHref,
  )

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs items={[{ label: t("title"), href: returnToHref }, { label: ticket.repairNo }]} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{ticket.repairNo}</h1>
            <StatusBadge label={t(`status.${recordStatus}`)} tone={getRepairRecordStatusTone(ticket.repairStatus)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.asset.assetTag} - {ticket.asset.name}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
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
          <Link href={printHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
            <Printer className="h-4 w-4" />{t("print")}
          </Link>
          <Link href={returnToHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
            <Wrench className="h-4 w-4" />{tCommon("back")}
          </Link>
        </div>
      </div>
      <MobileActionBar
        actions={[
          { href: `/${locale}/assets/${ticket.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" />, primary: true },
          { href: printHref, label: t("print"), icon: <Printer className="h-4 w-4" /> },
          { href: "#history", label: t("history"), icon: <History className="h-4 w-4" /> },
          { href: returnToHref, label: tCommon("back"), icon: <Wrench className="h-4 w-4" /> },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-foreground">{t("detailTitle")}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("date")} value={formatDate(ticket.reportedDate)} />
              <Info label={t("outcomeQuestion")} value={outcomeLabel} tone={ticket.outcome === "usable" ? "success" : ticket.outcome === "beyond_repair" ? "warning" : undefined} />
              <Info label={t("returnDate")} value={ticket.returnDate ? formatDate(ticket.returnDate) : null} />
              <Info label={t("vendor")} value={ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : t("internal")} />
              <Info label={t("cost")} value={ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost))} />
              <Info label={t("invoiceNo")} value={ticket.invoiceNo} />
              <Info label={t("reporter")} value={`${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`} />
              {ticket.maintenancePlan ? <Info label={t("planLabel")} value={`${ticket.maintenancePlan.planNo} - ${ticket.maintenancePlan.title}`} /> : null}
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <TextBlock label={t("problem")} value={ticket.problem} />
              <TextBlock label={t("remarkTitle")} value={ticket.resolution} />
            </div>
          </section>

          {hasLegacyDetails ? (
            <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">{t("legacyTitle")}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {legacyFields.map((field) => <Info key={field.label} label={field.label} value={field.value} />)}
              </div>
            </section>
          ) : null}

          <section id="history" className="scroll-mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <History className="h-5 w-5 text-primary" />{t("history")}
            </h2>
            {movements.length === 0 ? (
              <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("historyEmpty")} />
            ) : (
              <ol className="space-y-4">
                {movements.map((movement) => (
                  <li key={movement.id} className="relative border-l border-border pl-4">
                    <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
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
                        <div className="text-xs text-muted-foreground">{formatDateTime(movement.performedAt)}</div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                        <Info label={t("fromValue")} value={movementLabels.get(movement.id)?.from} />
                        <Info label={t("toValue")} value={movementLabels.get(movement.id)?.to} />
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
            <h2 className="mb-5 text-lg font-semibold text-foreground">{t("assetSection")}</h2>
            <div className="space-y-4">
              <Info label={t("asset")} value={`${ticket.asset.assetTag} - ${ticket.asset.name}`} />
              <Info label={t("currentStatus")} value={ticket.asset.status.nameTh} />
              <Info label={t("location")} value={`${ticket.asset.currentLocation.code} - ${ticket.asset.currentLocation.name}`} />
              <Info label={t("custodian")} value={ticket.asset.custodian ? `${ticket.asset.custodian.code} - ${ticket.asset.custodian.fullNameTh}` : null} />
              <Link href={`/${locale}/assets/${ticket.asset.id}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
                {t("openAsset")}
              </Link>
            </div>
          </section>

          {shouldReviewDisposal && canCreateDisposal ? (
            <section className="rounded-lg border border-warning/40 bg-warning-soft p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-warning" />{t("disposalReviewTitle")}
              </h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>{t("disposalReviewCount", { count: totalRepairCount })}</div>
                <div>{t("disposalReviewCost", { cost: formatCurrency(totalRepairCost) })}</div>
                {purchasePrice > 0 ? <div>{t("disposalReviewRatio", { percent: Math.round(repairCostRatio * 100) })}</div> : null}
              </div>
              <Link href={disposalRequestHref} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-warning/40 bg-surface px-3 text-sm font-medium text-warning hover:bg-warning-soft">
                <Trash2 className="h-4 w-4" />{t("openDisposalRequest")}
              </Link>
            </section>
          ) : null}

          <div id="attachments" className="scroll-mt-6">
            <MaintenanceAttachments ticketId={ticket.id} attachments={attachments} canEdit={canAttach} canDelete={canEdit} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Info({ label, value, tone }: { label: string; value?: string | number | null; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground"
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-medium ${toneClass}`}>{value || "-"}</div>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-20 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : "-"}
      </div>
    </div>
  )
}
