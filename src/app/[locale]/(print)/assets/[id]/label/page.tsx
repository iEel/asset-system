import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { assetLabelSettingKeys, parseAssetLabelTemplates } from "@/lib/asset-label-template"
import { assetQrPublicBaseUrlKey, buildAssetQrValue } from "@/lib/asset-qr"
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
    prisma.systemSetting.findMany({
      where: { key: { in: [...assetLabelSettingKeys, assetQrPublicBaseUrlKey] } },
      select: { key: true, value: true },
    }),
  ])

  if (!asset) notFound()

  const detailPath = `/${locale}/assets/${asset.id}`
  const settingValues = Object.fromEntries(labelSettings.map((setting) => [setting.key, setting.value]))
  const qrValue = buildAssetQrValue({
    assetId: asset.id,
    publicBaseUrl: settingValues[assetQrPublicBaseUrlKey],
    fallbackBaseUrl: process.env.AUTH_URL,
  })

  return (
    <AssetLabelPrint
      assets={[
        {
          assetTag: asset.assetTag,
          name: asset.name,
          serialNumber: asset.serialNumber,
          category: `${asset.category.code} - ${asset.category.name}`,
          company: asset.company.code,
          branch: asset.branch.code,
          location: `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
          qrValue,
        },
      ]}
      backHref={detailPath}
      labelTemplates={parseAssetLabelTemplates(settingValues)}
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
