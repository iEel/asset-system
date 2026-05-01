import { requirePagePermission } from "@/lib/page-auth"
import { SupplierForm } from "@/components/master-data/supplier-form"

type NewSupplierPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewSupplierPage({ params }: NewSupplierPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "supplier", "create")

  return <SupplierForm />
}
