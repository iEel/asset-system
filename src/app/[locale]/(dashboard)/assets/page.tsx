import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit, Eye } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency } from "@/lib/utils"
import { AssetDeleteButton } from "@/components/master-data/asset-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"

type AssetsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function AssetsPage({ params, searchParams }: AssetsPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()

  const assets = await prisma.asset.findMany({
    where: {
      isActive: true,
      ...(searchText
        ? {
            OR: [
              { assetTag: { contains: searchText } },
              { name: { contains: searchText } },
              { serialNumber: { contains: searchText } },
              { fixedAssetCode: { contains: searchText } },
              { category: { code: { contains: searchText } } },
              { company: { code: { contains: searchText } } },
              { branch: { code: { contains: searchText } } },
              { custodian: { fullNameTh: { contains: searchText } } },
              { currentLocation: { code: { contains: searchText } } },
            ],
          }
        : {}),
    },
    include: {
      category: { select: { code: true, name: true } },
      company: { select: { code: true, nameTh: true } },
      branch: { select: { code: true, name: true } },
      custodian: { select: { code: true, fullNameTh: true } },
      currentLocation: { select: { code: true, name: true } },
      status: { select: { nameTh: true, colorCode: true } },
      condition: { select: { nameTh: true, colorCode: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/assets/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/assets`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("assetTag")}</ColumnHeader>
                <ColumnHeader>{t("assetName")}</ColumnHeader>
                <ColumnHeader>{t("category")}</ColumnHeader>
                <ColumnHeader>{t("company")}</ColumnHeader>
                <ColumnHeader>{t("currentLocation")}</ColumnHeader>
                <ColumnHeader>{t("custodian")}</ColumnHeader>
                <ColumnHeader>{t("status")}</ColumnHeader>
                <ColumnHeader>{t("condition")}</ColumnHeader>
                <ColumnHeader>{t("purchasePrice")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{asset.assetTag}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">
                      <div className="font-medium">{asset.name}</div>
                      {asset.serialNumber && <div className="text-xs text-muted-foreground">{asset.serialNumber}</div>}
                    </td>
                    <td className="min-w-40 px-4 py-3 text-muted-foreground">
                      {asset.category.code} - {asset.category.name}
                    </td>
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">
                      {asset.company.code} / {asset.branch.code}
                    </td>
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">
                      {asset.currentLocation.code} - {asset.currentLocation.name}
                    </td>
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">
                      {asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatCurrency(asset.purchasePrice ? Number(asset.purchasePrice) : null)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/assets/${asset.id}`}
                          title={t("detailTitle")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/${locale}/assets/${asset.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <AssetDeleteButton id={asset.id} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ label, color }: { label: string; color?: string | null }) {
  if (!color) return <ActiveBadge label={label} />

  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {label}
    </span>
  )
}
