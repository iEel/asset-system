import { getTranslations } from "next-intl/server"
import { requirePagePermission } from "@/lib/page-auth"
import { prisma } from "@/lib/db"
import { buildAssetLabelSubtitle } from "@/lib/asset-label-display"
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
  const tCommon = await getTranslations("common")
  const preselectedIds = (assetIds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100)
  const [preselectedAssets, companies, branches, categories, locations] = await Promise.all([
    preselectedIds.length > 0
      ? prisma.asset.findMany({
          where: { id: { in: preselectedIds }, isActive: true },
          select: {
            id: true,
            assetTag: true,
            name: true,
            serialNumber: true,
            createdAt: true,
            company: { select: { code: true, nameTh: true, nameEn: true } },
            branch: { select: { code: true, name: true } },
            category: { select: { code: true, name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
            currentLocation: { select: { code: true, name: true } },
            custodian: { select: { fullNameTh: true } },
            status: { select: { name: true, nameTh: true, colorCode: true } },
            labelPrints: {
              orderBy: { printedAt: "desc" },
              take: 1,
              select: { batchId: true, tapeSize: true, printedAt: true, printedBy: true },
            },
            _count: { select: { labelPrints: true } },
          },
          orderBy: { assetTag: "asc" },
        })
      : Promise.resolve([]),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true, nameEn: true },
      orderBy: { code: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true, company: { select: { code: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        branchId: true,
        branch: { select: { code: true, name: true, companyId: true, company: { select: { code: true } } } },
      },
      orderBy: { code: "asc" },
    }),
  ])

  return (
    <AssetLabelBatchTool
      locale={locale}
      filterOptions={{
        companies: companies.map((company) => ({
          id: company.id,
          label: `${company.code} - ${locale === "th" ? company.nameTh : company.nameEn ?? company.nameTh}`,
        })),
        branches: branches.map((branch) => ({
          id: branch.id,
          label: `${branch.company.code} / ${branch.code} - ${branch.name}`,
          companyId: branch.companyId,
        })),
        categories: categories.map((category) => ({ id: category.id, label: `${category.code} - ${category.name}` })),
        locations: locations.map((location) => ({
          id: location.id,
          label: `${location.branch.company.code} / ${location.branch.code} / ${location.code} - ${location.name}`,
          branchId: location.branchId,
          companyId: location.branch.companyId,
          branchLabel: `${location.branch.code} - ${location.branch.name}`,
          shortLabel: `${location.code} - ${location.name}`,
        })),
      }}
      preselectedAssets={preselectedAssets.map((asset) => {
        const category = asset.category ? `${asset.category.code} - ${asset.category.name}` : "-"
        const latestPrint = asset.labelPrints[0] ?? null

        return {
          id: asset.id,
          title: asset.assetTag,
          subtitle: buildAssetLabelSubtitle(asset, category),
          href: `/${locale}/assets/${asset.id}`,
          serialNumber: asset.serialNumber,
          createdAt: asset.createdAt.toISOString(),
          labelPrint: latestPrint
            ? {
                ...latestPrint,
                printedAt: latestPrint.printedAt.toISOString(),
                count: asset._count.labelPrints,
              }
            : { count: 0, batchId: null, tapeSize: null, printedAt: null, printedBy: null },
          status: {
            label: locale === "th" ? asset.status?.nameTh ?? asset.status?.name ?? "-" : asset.status?.name ?? asset.status?.nameTh ?? "-",
            colorCode: asset.status?.colorCode ?? null,
          },
          meta: {
            custodian: asset.custodian?.fullNameTh ?? null,
            company: `${asset.company.code} - ${locale === "th" ? asset.company.nameTh : asset.company.nameEn ?? asset.company.nameTh}`,
            branch: `${asset.branch.code} - ${asset.branch.name}`,
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
        all: tCommon("all"),
        labelQueueFiltersTitle: t("labelQueueFiltersTitle"),
        queueModeLabel: t("queueModeLabel"),
        queueModeUnprinted: t("queueModeUnprinted"),
        queueModePrinted: t("queueModePrinted"),
        queueModeRecent: t("queueModeRecent"),
        queueFilterCompany: t("queueFilterCompany"),
        queueFilterBranch: t("queueFilterBranch"),
        queueFilterCategory: t("queueFilterCategory"),
        queueFilterLocation: t("queueFilterLocation"),
        queueFilterCreatedFrom: t("queueFilterCreatedFrom"),
        queueFilterCreatedTo: t("queueFilterCreatedTo"),
        queueSortLabel: t("queueSortLabel"),
        queueSortNewest: t("queueSortNewest"),
        queueSortAssetTag: t("queueSortAssetTag"),
        queueSortLocation: t("queueSortLocation"),
        queueSortCategory: t("queueSortCategory"),
        resetQueueFilters: t("resetQueueFilters"),
        loadMoreQueue: t("loadMoreQueue"),
        selectedSortLabel: t("selectedSortLabel"),
        selectedSortManual: t("selectedSortManual"),
        printFirstLabel: t("printFirstLabel"),
        labelPrintedBadge: t("labelPrintedBadge"),
        labelUnprintedBadge: t("labelUnprintedBadge"),
      }}
    />
  )
}
