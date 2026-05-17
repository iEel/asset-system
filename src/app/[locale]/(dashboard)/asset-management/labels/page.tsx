import { getTranslations } from "next-intl/server"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetLabelBatchTool } from "@/components/assets/asset-label-batch-tool"

type AssetLabelsToolPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AssetLabelsToolPage({ params }: AssetLabelsToolPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "view")
  const t = await getTranslations("assetTools")
  const tGlobalSearch = await getTranslations("globalSearch")
  const tAsset = await getTranslations("asset")

  return (
    <AssetLabelBatchTool
      locale={locale}
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
      }}
    />
  )
}
