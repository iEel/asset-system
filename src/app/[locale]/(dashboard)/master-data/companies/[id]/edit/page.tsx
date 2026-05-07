import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { CompanyForm } from "@/components/master-data/company-form"
import { requirePagePermission } from "@/lib/page-auth"

type EditCompanyPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { id, locale } = await params
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
    />
  )
}
