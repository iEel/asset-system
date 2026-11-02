import { getTranslations } from "next-intl/server"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetScanSearchTool } from "@/components/assets/asset-scan-search-tool"

type AssetScanPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AssetScanPage({ params }: AssetScanPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "asset", "view")
  const t = await getTranslations("assetTools")
  const tGlobalSearch = await getTranslations("globalSearch")
  const tCommon = await getTranslations("common")

  return (
    <AssetScanSearchTool
      locale={locale}
      userId={user.id}
      labels={{
        title: t("scanTitle"),
        subtitle: t("scanSubtitle"),
        queryLabel: t("scanQueryLabel"),
        placeholder: t("scanPagePlaceholder"),
        hint: t("scanHint"),
        openAsset: t("openAsset"),
        noResults: tGlobalSearch("noResults"),
        minChars: tGlobalSearch("minChars"),
        loading: tGlobalSearch("loading"),
        searchFailed: tGlobalSearch("failed"),
        retry: tCommon("tryAgain"),
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
          cameraRear: t("cameraRear"),
          scanning: t("scanning"),
          scanned: t("scanned"),
          cameraOpening: t("cameraOpening"),
          torchOn: t("torchOn"),
          torchOff: t("torchOff"),
          torchUnsupported: t("torchUnsupported"),
          zoomCamera: t.raw("zoomCamera"),
          zoomUnsupported: t("zoomUnsupported"),
        },
      }}
    />
  )
}
