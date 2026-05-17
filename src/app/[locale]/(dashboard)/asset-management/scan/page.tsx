import { getTranslations } from "next-intl/server"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetScanSearchTool } from "@/components/assets/asset-scan-search-tool"

type AssetScanPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AssetScanPage({ params }: AssetScanPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "view")
  const t = await getTranslations("assetTools")
  const tGlobalSearch = await getTranslations("globalSearch")
  const tAsset = await getTranslations("asset")

  return (
    <AssetScanSearchTool
      locale={locale}
      labels={{
        title: t("scanTitle"),
        subtitle: t("scanSubtitle"),
        queryLabel: t("scanQueryLabel"),
        placeholder: tGlobalSearch("placeholder"),
        openAsset: t("openAsset"),
        noResults: tGlobalSearch("noResults"),
        minChars: tGlobalSearch("minChars"),
        loading: tGlobalSearch("loading"),
        serial: tGlobalSearch("serial"),
        custodian: tAsset("custodian"),
        scanner: {
          start: t("scannerStart"),
          stop: t("scannerStop"),
          title: t("scannerTitle"),
          help: t("scannerHelp"),
          cameraUnsupported: t("cameraUnsupported"),
          cameraNotFound: t("cameraNotFound"),
          cameraError: t("cameraError"),
          cameraDevice: t("cameraDevice"),
          cameraDeviceFallback: t("cameraDeviceFallback"),
          scanning: t("scanning"),
          scanned: t("scanned"),
        },
      }}
    />
  )
}
