import { requirePagePermission } from "@/lib/page-auth"
import { BrandForm } from "@/components/master-data/brand-form"

type NewBrandPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewBrandPage({ params }: NewBrandPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "brand", "create")

  return <BrandForm />
}
