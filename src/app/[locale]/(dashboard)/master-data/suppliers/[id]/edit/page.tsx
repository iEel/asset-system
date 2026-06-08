import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { SupplierForm } from "@/components/master-data/supplier-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type EditSupplierPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditSupplierPage({ params, searchParams }: EditSupplierPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "suppliers", rawSearchParams.returnTo)
  await requirePagePermission(locale, "supplier", "edit")

  const supplier = await prisma.supplier.findFirst({
    where: { id, isActive: true },
  })

  if (!supplier) notFound()

  return (
    <SupplierForm
      supplier={{
        id: supplier.id,
        code: supplier.code,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        isActive: supplier.isActive,
      }}
      backHref={returnToHref}
    />
  )
}
