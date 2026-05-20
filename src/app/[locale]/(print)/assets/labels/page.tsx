import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { assetLabelSettingKeys, parseAssetLabelTemplates } from "@/lib/asset-label-template"
import { assetQrPublicBaseUrlKey, buildAssetQrValue } from "@/lib/asset-qr"
import { AssetLabelPrint } from "@/components/assets/asset-label-print"

type AssetLabelsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ id?: string | string[]; ids?: string }>
}

export default async function AssetLabelsPage({ params, searchParams }: AssetLabelsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "asset", "view")

  const ids = normalizeIds(rawSearchParams)
  if (ids.length === 0) notFound()

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const [assets, labelSettings] = await Promise.all([
    prisma.asset.findMany({
      where: { id: { in: ids }, isActive: true },
      include: {
        category: { select: { code: true, name: true } },
        company: { select: { code: true, nameTh: true } },
        branch: { select: { code: true, name: true } },
        currentLocation: { select: { code: true, name: true } },
      },
    }),
    prisma.systemSetting.findMany({
      where: { key: { in: [...assetLabelSettingKeys, assetQrPublicBaseUrlKey] } },
      select: { key: true, value: true },
    }),
  ])

  if (assets.length === 0) notFound()

  const assetMap = new Map(assets.map((asset) => [asset.id, asset]))
  const orderedAssets = ids.map((id) => assetMap.get(id)).filter((asset) => asset != null)
  const settingValues = Object.fromEntries(labelSettings.map((setting) => [setting.key, setting.value]))

  return (
    <AssetLabelPrint
      assets={orderedAssets.map((asset) => {
        return {
          id: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          serialNumber: asset.serialNumber,
          category: `${asset.category.code} - ${asset.category.name}`,
          company: asset.company.code,
          branch: asset.branch.code,
          location: `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
          qrValue: buildAssetQrValue({
            assetId: asset.id,
            publicBaseUrl: settingValues[assetQrPublicBaseUrlKey],
            fallbackBaseUrl: process.env.AUTH_URL,
          }),
        }
      })}
      backHref={`/${locale}/assets`}
      labelTemplates={parseAssetLabelTemplates(settingValues)}
      translations={{
        title: t("printLabelsTitle"),
        preview: t("printLabelsPreview"),
        print: t("printLabel"),
        back: tCommon("back"),
        tapeSize: t("labelTapeSize"),
        tape12mm: t("labelTape12mm"),
        tape18mm: t("labelTape18mm"),
        tape24mm: t("labelTape24mm"),
        tapeCustom: t("labelTapeCustom"),
        printReason: t("labelPrintReason"),
        printReasonPlaceholder: t("labelPrintReasonPlaceholder"),
        recordingPrint: t("recordingLabelPrint"),
        printRecorded: t("labelPrintRecorded"),
        printRecordFailed: t("labelPrintRecordFailed"),
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

function normalizeIds(searchParams: { id?: string | string[]; ids?: string }) {
  const repeatedIds = Array.isArray(searchParams.id)
    ? searchParams.id
    : searchParams.id
      ? [searchParams.id]
      : []
  const commaIds = searchParams.ids?.split(",") ?? []

  return Array.from(
    new Set(
      [...repeatedIds, ...commaIds]
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )
}
