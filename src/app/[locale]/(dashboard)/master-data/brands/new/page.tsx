import { requirePagePermission } from "@/lib/page-auth"
import { BrandForm } from "@/components/master-data/brand-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type NewBrandPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewBrandPage({ params, searchParams }: NewBrandPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "brands", rawSearchParams.returnTo)
  await requirePagePermission(locale, "brand", "create")

  return <BrandForm backHref={returnToHref} />
}
