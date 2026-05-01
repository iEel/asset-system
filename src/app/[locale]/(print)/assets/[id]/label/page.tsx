import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetLabelPrint } from "@/components/assets/asset-label-print"

type AssetLabelPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function AssetLabelPage({ params }: AssetLabelPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const asset = await prisma.asset.findFirst({
    where: { id, isActive: true },
    include: {
      category: { select: { code: true, name: true } },
      company: { select: { code: true, nameTh: true } },
      branch: { select: { code: true, name: true } },
      currentLocation: { select: { code: true, name: true } },
    },
  })

  if (!asset) notFound()

  const detailPath = `/${locale}/assets/${asset.id}`
  const qrValue = `${process.env.AUTH_URL ?? ""}${detailPath}`

  return (
    <AssetLabelPrint
      asset={{
        assetTag: asset.assetTag,
        name: asset.name,
        serialNumber: asset.serialNumber,
        category: `${asset.category.code} - ${asset.category.name}`,
        company: asset.company.code,
        branch: asset.branch.code,
        location: `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
      }}
      backHref={detailPath}
      qrValue={qrValue}
      translations={{
        title: t("printLabelTitle"),
        preview: t("printLabelPreview"),
        print: t("printLabel"),
        back: tCommon("back"),
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
