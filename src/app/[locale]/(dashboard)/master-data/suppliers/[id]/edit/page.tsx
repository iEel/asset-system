import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { SupplierForm } from "@/components/master-data/supplier-form"

type EditSupplierPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  const { id, locale } = await params
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
    />
  )
}
