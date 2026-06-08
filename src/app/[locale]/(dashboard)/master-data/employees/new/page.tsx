import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { EmployeeForm } from "@/components/master-data/employee-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type NewEmployeePageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewEmployeePage({ params, searchParams }: NewEmployeePageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "employees", rawSearchParams.returnTo)
  await requirePagePermission(locale, "employee", "create")

  const [companies, branches, departments, managers] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true },
      orderBy: { code: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true },
      orderBy: { code: "asc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true, employmentStatus: "active" },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
  ])

  return (
    <EmployeeForm
      companies={companies}
      branches={branches}
      departments={departments}
      managers={managers}
      backHref={returnToHref}
    />
  )
}
