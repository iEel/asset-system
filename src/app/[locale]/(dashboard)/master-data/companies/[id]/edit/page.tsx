import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { CompanyForm } from "@/components/master-data/company-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { requirePagePermission } from "@/lib/page-auth"

type EditCompanyPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditCompanyPage({ params, searchParams }: EditCompanyPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "companies", rawSearchParams.returnTo)
  await requirePagePermission(locale, "company", "edit")

  const company = await prisma.company.findFirst({
    where: { id, isActive: true },
  })

  if (!company) notFound()

  return (
    <CompanyForm
      company={{
        id: company.id,
        code: company.code,
        assetTagCode: company.assetTagCode,
        nameTh: company.nameTh,
        nameEn: company.nameEn,
        taxId: company.taxId,
        address: company.address,
        isActive: company.isActive,
      }}
      backHref={returnToHref}
    />
  )
}
