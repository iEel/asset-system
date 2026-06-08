import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BrandForm } from "@/components/master-data/brand-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type EditBrandPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditBrandPage({ params, searchParams }: EditBrandPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "brands", rawSearchParams.returnTo)
  await requirePagePermission(locale, "brand", "edit")

  const brand = await prisma.assetBrand.findFirst({ where: { id, isActive: true } })

  if (!brand) notFound()

  return <BrandForm brand={{ id: brand.id, name: brand.name, isActive: brand.isActive }} backHref={returnToHref} />
}
