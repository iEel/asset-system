import { CompanyForm } from "@/components/master-data/company-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { requirePagePermission } from "@/lib/page-auth"

type NewCompanyPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewCompanyPage({ params, searchParams }: NewCompanyPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "companies", rawSearchParams.returnTo)
  await requirePagePermission(locale, "company", "create")

  return <CompanyForm backHref={returnToHref} />
}
