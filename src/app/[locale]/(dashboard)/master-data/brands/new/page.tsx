import { requirePagePermission } from "@/lib/page-auth"
import { BrandForm } from "@/components/master-data/brand-form"
import { hasPermission } from "@/lib/auth-utils"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type NewBrandPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewBrandPage({ params, searchParams }: NewBrandPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "brands", rawSearchParams.returnTo)
  const user = await requirePagePermission(locale, "brand", "create")

  return <BrandForm backHref={returnToHref} canReactivate={hasPermission(user, "brand", "edit")} />
}
