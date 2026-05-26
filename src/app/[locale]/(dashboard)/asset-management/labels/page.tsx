import { getTranslations } from "next-intl/server"
import { requirePagePermission } from "@/lib/page-auth"
import { prisma } from "@/lib/db"
import { AssetLabelBatchTool } from "@/components/assets/asset-label-batch-tool"

type AssetLabelsToolPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetIds?: string }>
}

export default async function AssetLabelsToolPage({ params, searchParams }: AssetLabelsToolPageProps) {
  const { locale } = await params
  const { assetIds } = await searchParams
  await requirePagePermission(locale, "asset", "view")
  const t = await getTranslations("assetTools")
  const tGlobalSearch = await getTranslations("globalSearch")
  const tAsset = await getTranslations("asset")
  const preselectedIds = (assetIds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100)
  const preselectedAssets =
    preselectedIds.length > 0
      ? await prisma.asset.findMany({
          where: { id: { in: preselectedIds }, isActive: true },
          select: {
            id: true,
            assetTag: true,
            name: true,
            serialNumber: true,
            category: { select: { code: true, name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
            currentLocation: { select: { code: true, name: true } },
            custodian: { select: { fullNameTh: true } },
            status: { select: { name: true, nameTh: true, colorCode: true } },
          },
          orderBy: { assetTag: "asc" },
        })
      : []

  return (
    <AssetLabelBatchTool
      locale={locale}
      preselectedAssets={preselectedAssets.map((asset) => {
        const category = asset.category ? `${asset.category.code} - ${asset.category.name}` : "-"
        const subtitleParts = [asset.name, asset.brand?.name, asset.model?.name].filter(Boolean)

        return {
          id: asset.id,
          title: asset.assetTag,
          subtitle: subtitleParts.join(" / ") || category,
          href: `/${locale}/assets/${asset.id}`,
          serialNumber: asset.serialNumber,
          status: {
            label: locale === "th" ? asset.status?.nameTh ?? asset.status?.name ?? "-" : asset.status?.name ?? asset.status?.nameTh ?? "-",
            colorCode: asset.status?.colorCode ?? null,
          },
          meta: {
            custodian: asset.custodian?.fullNameTh ?? null,
            location: asset.currentLocation ? `${asset.currentLocation.code} - ${asset.currentLocation.name}` : "-",
            category,
          },
        }
      })}
      labels={{
        title: t("labelsTitle"),
        subtitle: t("labelsSubtitle"),
        searchLabel: t("labelSearchLabel"),
        searchPlaceholder: tGlobalSearch("placeholder"),
        selectedTitle: t("selectedLabelsTitle"),
        selectedCount: tAsset("selectedCount"),
        print: tAsset("printSelectedLabels"),
        remove: t("removeSelectedAsset"),
        noSelected: t("noSelectedLabels"),
        noResults: tGlobalSearch("noResults"),
        minChars: tGlobalSearch("minChars"),
        loading: tGlobalSearch("loading"),
        serial: tGlobalSearch("serial"),
        recentQueueTitle: t("recentLabelQueueTitle"),
        recentQueueHelp: t("recentLabelQueueHelp"),
        addAllRecent: t("addAllRecentLabels"),
        recentQueueEmpty: t("recentLabelQueueEmpty"),
      }}
    />
  )
}
