import { requirePagePermission } from "@/lib/page-auth"
import { SupplierForm } from "@/components/master-data/supplier-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type NewSupplierPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewSupplierPage({ params, searchParams }: NewSupplierPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "suppliers", rawSearchParams.returnTo)
  await requirePagePermission(locale, "supplier", "create")

  return <SupplierForm backHref={returnToHref} />
}
