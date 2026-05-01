import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, Edit, History, Printer, QrCode } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { AssetQrCode } from "@/components/assets/asset-qr-code"
import { AssetAttachments } from "@/components/assets/asset-attachments"

type AssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  const asset = await prisma.asset.findFirst({
    where: { id, isActive: true },
    include: {
      category: { select: { code: true, name: true } },
      brand: { select: { name: true } },
      model: { select: { name: true, specs: true } },
      company: { select: { code: true, nameTh: true } },
      branch: { select: { code: true, name: true } },
      department: { select: { code: true, name: true } },
      custodian: { select: { code: true, fullNameTh: true, email: true } },
      homeLocation: { select: { code: true, name: true } },
      currentLocation: { select: { code: true, name: true } },
      status: { select: { name: true, nameTh: true, colorCode: true } },
      condition: { select: { name: true, nameTh: true, colorCode: true } },
      supplier: { select: { code: true, name: true } },
      movements: {
        orderBy: { performedAt: "desc" },
        take: 20,
      },
      attachments: {
        where: { isActive: true },
        orderBy: { uploadedAt: "desc" },
      },
    },
  })

  if (!asset) notFound()

  const detailPath = `/${locale}/assets/${asset.id}`
  const qrValue = `${process.env.AUTH_URL ?? ""}${detailPath}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/${locale}/assets`} className="inline-flex items-center gap-1 hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              {tCommon("back")}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{asset.assetTag}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{asset.name}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/${locale}/assets/${asset.id}/label`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Printer className="h-4 w-4" />
            {t("printLabel")}
          </Link>
          <Link
            href={`/${locale}/assets/${asset.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Edit className="h-4 w-4" />
            {tCommon("edit")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
              <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("category")} value={`${asset.category.code} - ${asset.category.name}`} />
              <Info label={t("brand")} value={asset.brand?.name} />
              <Info label={t("model")} value={asset.model?.name} />
              <Info label={t("serialNumber")} value={asset.serialNumber} />
              <Info label={t("fixedAssetCode")} value={asset.fixedAssetCode} />
              <Info label={t("purchasePrice")} value={formatCurrency(asset.purchasePrice ? Number(asset.purchasePrice) : null)} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-foreground">{t("ownership")}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("company")} value={`${asset.company.code} - ${asset.company.nameTh}`} />
              <Info label={t("branch")} value={`${asset.branch.code} - ${asset.branch.name}`} />
              <Info label={t("department")} value={asset.department ? `${asset.department.code} - ${asset.department.name}` : null} />
              <Info label={t("custodian")} value={asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null} />
              <Info label={t("homeLocation")} value={asset.homeLocation ? `${asset.homeLocation.code} - ${asset.homeLocation.name}` : null} />
              <Info label={t("currentLocation")} value={`${asset.currentLocation.code} - ${asset.currentLocation.name}`} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-foreground">{t("purchaseWarranty")}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("supplier")} value={asset.supplier ? `${asset.supplier.code} - ${asset.supplier.name}` : null} />
              <Info label={t("purchaseDate")} value={formatDate(asset.purchaseDate)} />
              <Info label={t("warrantyStart")} value={formatDate(asset.warrantyStartDate)} />
              <Info label={t("warrantyEnd")} value={formatDate(asset.warrantyEndDate)} />
              <Info label={t("poNumber")} value={asset.poNumber} />
              <Info label={t("invoiceNumber")} value={asset.invoiceNumber} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <History className="h-5 w-5 text-primary" />
              {t("movementHistory")}
            </h2>
            {asset.movements.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tCommon("noData")}
              </div>
            ) : (
              <ol className="space-y-4">
                {asset.movements.map((movement) => (
                  <li key={movement.id} className="relative border-l border-border pl-4">
                    <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="rounded-md bg-background p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="font-medium text-foreground">{movement.movementType.replaceAll("_", " ")}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(movement.performedAt)}</div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <Info label={t("fromValue")} value={movement.fromValue} compact />
                        <Info label={t("toValue")} value={movement.toValue} compact />
                      </div>
                      {movement.reason && <p className="mt-2 text-sm text-muted-foreground">{movement.reason}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 text-center shadow-sm">
            <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
              <QrCode className="h-5 w-5 text-primary" />
              {t("qrCode")}
            </h2>
            <AssetQrCode value={qrValue} label={asset.assetTag} />
          </section>

          <AssetAttachments assetId={asset.id} attachments={asset.attachments} />

          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">{t("remark")}</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{asset.remark || "-"}</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
  compact,
}: {
  label: string
  value?: string | number | null
  compact?: boolean
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className={compact ? "mt-0.5 text-sm text-foreground" : "mt-1 text-sm font-medium text-foreground"}>
        {value || "-"}
      </div>
    </div>
  )
}

function StatusPill({ label, color }: { label: string; color?: string | null }) {
  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
      style={color ? { backgroundColor: `${color}1A`, color } : undefined}
    >
      {label}
    </span>
  )
}
