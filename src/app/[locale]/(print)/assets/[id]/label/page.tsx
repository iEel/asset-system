import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { loadAssetLabelPrintSettings } from "@/lib/asset-label-print-settings"
import { toAssetLabelData } from "@/lib/asset-label-data"
import { AssetLabelPrint } from "@/components/assets/asset-label-print"

type AssetLabelPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function AssetLabelPage({ params }: AssetLabelPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const [asset, labelSettings] = await Promise.all([
    prisma.asset.findFirst({
      where: { id, isActive: true },
      include: {
        category: { select: { code: true, name: true } },
        company: { select: { code: true, nameTh: true } },
        branch: { select: { code: true, name: true } },
        currentLocation: { select: { code: true, name: true } },
      },
    }),
    loadAssetLabelPrintSettings(),
  ])

  if (!asset) notFound()

  const detailPath = `/${locale}/assets/${asset.id}`

  return (
    <AssetLabelPrint
      assets={[toAssetLabelData({ ...asset, location: asset.currentLocation }, labelSettings.qrBaseUrl)]}
      backHref={detailPath}
      labelTemplates={labelSettings.templates}
      translations={{
        title: t("printLabelTitle"),
        preview: t("printLabelPreview"),
        print: t("printLabel"),
        back: tCommon("back"),
        tapeSize: t("labelTapeSize"),
        tape12mm: t("labelTape12mm"),
        tape18mm: t("labelTape18mm"),
        tape24mm: t("labelTape24mm"),
        tapeCustom: t("labelTapeCustom"),
        printReason: t("labelPrintReason"),
        printReasonPlaceholder: t("labelPrintReasonPlaceholder"),
        printRecorded: t("labelPrintRecorded"),
        printRecordFailed: t("labelPrintRecordFailed"),
        printerTapeGuidance: t("labelPrinterTapeGuidance", { tapeSize: "{tapeSize}" }),
        qrPrintTarget: t("labelQrPrintTarget"),
        qrLocalWarning: t("labelQrLocalWarning"),
        scanHint: t("scanToOpenDetail"),
        assetTag: t("assetTag"),
        assetName: t("assetName"),
        serialNumber: t("serialNumber"),
        category: t("category"),
        branch: t("branch"),
        currentLocation: t("currentLocation"),
      }}
    />
  )
}
