import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetModelForm } from "@/components/master-data/asset-model-form"
import { normalizeBrandModelReturnTo } from "@/lib/brand-model-query"

type NewAssetModelPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewAssetModelPage({ params, searchParams }: NewAssetModelPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeBrandModelReturnTo(locale, rawSearchParams.returnTo)
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

  return <AssetModelForm brands={brands} categories={categories} backHref={returnToHref} />
}
