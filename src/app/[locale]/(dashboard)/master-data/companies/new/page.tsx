import { CompanyForm } from "@/components/master-data/company-form"
import { requirePagePermission } from "@/lib/page-auth"

type NewCompanyPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewCompanyPage({ params }: NewCompanyPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "company", "create")

  return <CompanyForm />
}
