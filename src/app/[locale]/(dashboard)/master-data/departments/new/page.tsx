import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { DepartmentForm } from "@/components/master-data/department-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type NewDepartmentPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewDepartmentPage({ params, searchParams }: NewDepartmentPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "departments", rawSearchParams.returnTo)
  await requirePagePermission(locale, "department", "create")

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      nameTh: true,
    },
    orderBy: { code: "asc" },
  })

  return <DepartmentForm companies={companies} backHref={returnToHref} />
}
