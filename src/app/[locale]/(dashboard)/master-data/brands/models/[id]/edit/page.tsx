import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetModelForm } from "@/components/master-data/asset-model-form"

type EditAssetModelPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditAssetModelPage({ params }: EditAssetModelPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "brand", "edit")

  const [model, brands, categories] = await Promise.all([
    prisma.assetModel.findFirst({ where: { id, isActive: true } }),
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

  if (!model) notFound()

  return (
    <AssetModelForm
      brands={brands}
      categories={categories}
      model={{
        id: model.id,
        name: model.name,
        brandId: model.brandId,
        categoryId: model.categoryId,
        specs: model.specs,
        isActive: model.isActive,
      }}
    />
  )
}
