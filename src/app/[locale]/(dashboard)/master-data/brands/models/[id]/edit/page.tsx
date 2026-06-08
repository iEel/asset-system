import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetModelForm } from "@/components/master-data/asset-model-form"
import { normalizeBrandModelReturnTo } from "@/lib/brand-model-query"

type EditAssetModelPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditAssetModelPage({ params, searchParams }: EditAssetModelPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeBrandModelReturnTo(locale, rawSearchParams.returnTo)
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

  const modelPhotos = await prisma.attachment.findMany({
    where: { module: "asset_model", referenceId: model.id, isActive: true },
    orderBy: { uploadedAt: "desc" },
  })

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
      modelPhotos={modelPhotos}
      backHref={returnToHref}
    />
  )
}
