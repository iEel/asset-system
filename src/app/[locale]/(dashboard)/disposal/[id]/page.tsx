import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, ClipboardCheck, FileText, History, Printer, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"

type DisposalDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function DisposalDetailPage({ params }: DisposalDetailPageProps) {
  const { locale, id } = await params
  const user = await requirePagePermission(locale, "disposal", "view")
  const canApprove = hasPermission(user, "disposal", "approve")
  const canEdit = hasPermission(user, "disposal", "edit")
  const t = await getTranslations("disposalPage")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const disposalRequest = await prisma.disposalRequest.findFirst({
    where: { id, isActive: true },
    include: {
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

  const [movements, attachments, options] = await Promise.all([
    prisma.assetMovement.findMany({
      where: { referenceType: "disposal", referenceId: disposalRequest.id },
      orderBy: { performedAt: "desc" },
    }),
    prisma.attachment.findMany({
      where: { module: "disposal", referenceId: disposalRequest.id, isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    canApprove || canEdit ? getDisposalOptions() : Promise.resolve(null),
  ])
  const movementLabels = await getMovementDisplayLabels(movements)

  const statusLabels = {
    pending: t("statuses.pending"),
    approved: t("statuses.approved"),
    disposed: t("statuses.disposed"),
    rejected: t("statuses.rejected"),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/${locale}/disposal`} className="inline-flex items-center gap-1 hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              {tCommon("back")}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{disposalRequest.disposalNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {disposalRequest.asset.assetTag} - {disposalRequest.asset.name}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={`/${locale}/disposal/${disposalRequest.id}/print`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Printer className="h-4 w-4" />
            {t("printDisposal")}
          </Link>
          {disposalRequest.requestStatus === "approved" && options ? (
            <DisposalExecutionButton
              requestId={disposalRequest.id}
              disposalNo={disposalRequest.disposalNo}
              disposalType={disposalRequest.disposalType}
              statuses={options.statuses}
              employees={options.employees}
              defaultActualSaleValue={disposalRequest.actualSaleValue?.toString() ?? disposalRequest.saleValue?.toString()}
              defaultActualSalvageValue={disposalRequest.actualSalvageValue?.toString() ?? disposalRequest.salvageValue?.toString()}
            />
          ) : null}
          <StatusBadge status={disposalRequest.requestStatus} labels={statusLabels} />
        </div>
      </div>

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

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              {t("decisionDetail")}
            </h2>
            <TextBlock label={t("approvalRemark")} value={disposalRequest.approvalRemark} />
          </section>

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

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <History className="h-5 w-5 text-primary" />
              {t("disposalHistory")}
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
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Trash2 className="h-5 w-5 text-primary" />
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
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                {t("openAsset")}
              </Link>
            </div>
          </section>

          <DisposalAttachments requestId={disposalRequest.id} attachments={attachments} />
        </aside>
      </div>
    </div>
  )
}

function formatSource(sourceType?: string | null, sourceId?: string | null) {
  if (!sourceType && !sourceId) return "-"
  return [sourceType, sourceId].filter(Boolean).join(" / ")
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

function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  const label = labels[status] ?? status
  const className =
    status === "approved"
      ? "bg-primary/10 text-primary"
      : status === "disposed"
        ? "bg-success/10 text-success"
      : status === "rejected"
        ? "bg-danger/10 text-danger"
        : status === "pending"
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground"

  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${className}`}>{label}</span>
}
