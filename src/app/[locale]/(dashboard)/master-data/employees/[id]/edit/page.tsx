import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { EmployeeForm } from "@/components/master-data/employee-form"

type EditEmployeePageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "employee", "edit")

  const [employee, companies, branches, departments, managers] = await Promise.all([
    prisma.employee.findFirst({
      where: { id, isActive: true },
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
    />
  )
}
