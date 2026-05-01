import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BrandForm } from "@/components/master-data/brand-form"

type EditBrandPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditBrandPage({ params }: EditBrandPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "brand", "edit")

  const brand = await prisma.assetBrand.findFirst({ where: { id, isActive: true } })

  if (!brand) notFound()

  return <BrandForm brand={{ id: brand.id, name: brand.name, isActive: brand.isActive }} />
}
