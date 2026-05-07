import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, CheckCircle2, FileText, History, Printer } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { getMovementDisplayLabels } from "@/lib/movement-labels"

type MaintenanceDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function MaintenanceDetailPage({ params }: MaintenanceDetailPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "maintenance", "view")
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
        },
      },
      reportedBy: { select: { code: true, fullNameTh: true } },
      assignedTo: { select: { code: true, fullNameTh: true } },
      vendor: { select: { code: true, name: true } },
    },
  })
  if (!ticket) notFound()

  const [attachments, movements] = await Promise.all([
    prisma.attachment.findMany({
      where: { module: "maintenance", referenceId: ticket.id, isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.assetMovement.findMany({
      where: { referenceType: "maintenance", referenceId: ticket.id },
      orderBy: { performedAt: "desc" },
    }),
  ])
  const movementLabels = await getMovementDisplayLabels(movements)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/${locale}/maintenance`} className="inline-flex items-center gap-1 hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              {tCommon("back")}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{ticket.repairNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.asset.assetTag} - {ticket.asset.name}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={`/${locale}/maintenance/${ticket.id}/print`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Printer className="h-4 w-4" />
            {t("printRepair")}
          </Link>
          <StatusBadge status={ticket.repairStatus} openLabel={t("statuses.open")} closedLabel={t("statuses.closed")} />
        </div>
      </div>

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
              <Info label={t("assignedTo")} value={ticket.assignedTo ? `${ticket.assignedTo.code} - ${ticket.assignedTo.fullNameTh}` : null} />
              <Info label={t("repairType")} value={ticket.repairType === "vendor" ? t("vendorRepair") : t("internalRepair")} />
              <Info label={t("vendor")} value={ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : null} />
              <Info label={t("repairCost")} value={ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost))} />
              <Info label={t("warrantyClaim")} value={ticket.warrantyClaim ? tCommon("yes") : tCommon("no")} />
              <Info label={t("returnDate")} value={formatDateTime(ticket.returnDate)} />
            </div>
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
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <History className="h-5 w-5 text-primary" />
              {t("maintenanceHistory")}
            </h2>
            {movements.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tCommon("noData")}
              </div>
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
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                {t("openAsset")}
              </Link>
            </div>
          </section>

          <MaintenanceAttachments ticketId={ticket.id} attachments={attachments} />
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

function StatusBadge({
  status,
  openLabel,
  closedLabel,
}: {
  status: string
  openLabel: string
  closedLabel: string
}) {
  const label = status === "open" ? openLabel : status === "closed" ? closedLabel : status
  const className =
    status === "closed"
      ? "bg-info/10 text-info"
      : status === "open"
        ? "bg-success/10 text-success"
        : "bg-muted text-muted-foreground"

  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${className}`}>{label}</span>
}
