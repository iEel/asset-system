import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { EmployeeForm } from "@/components/master-data/employee-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { isLdapSyncEnabled } from "@/lib/ldap-sync-enabled"

type EditEmployeePageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditEmployeePage({ params, searchParams }: EditEmployeePageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "employees", rawSearchParams.returnTo)
  await requirePagePermission(locale, "employee", "edit")

  const [employee, companies, branches, departments, managers, activeLockedBySync] = await Promise.all([
    prisma.employee.findFirst({
      where: { id },
    }),
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
      where: { id: { not: id }, isActive: true, employmentStatus: "active" },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
    isLdapSyncEnabled(),
  ])

  if (!employee) notFound()

  return (
    <EmployeeForm
      companies={companies}
      branches={branches}
      departments={departments}
      managers={managers}
      employee={{
        id: employee.id,
        code: employee.code,
        fullNameTh: employee.fullNameTh,
        fullNameEn: employee.fullNameEn,
        email: employee.email,
        companyId: employee.companyId,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        position: employee.position,
        employmentStatus: employee.employmentStatus as "active" | "resigned" | "suspended",
        managerId: employee.managerId,
        isActive: employee.isActive,
      }}
      backHref={returnToHref}
      activeLockedBySync={activeLockedBySync}
    />
  )
}
