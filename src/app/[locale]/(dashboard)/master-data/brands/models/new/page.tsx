import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetModelForm } from "@/components/master-data/asset-model-form"

type NewAssetModelPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewAssetModelPage({ params }: NewAssetModelPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "brand", "create")

  const [brands, categories] = await Promise.all([
    prisma.assetBrand.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ])

  return <AssetModelForm brands={brands} categories={categories} />
}
