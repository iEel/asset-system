import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { DepartmentForm } from "@/components/master-data/department-form"

type EditDepartmentPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditDepartmentPage({ params }: EditDepartmentPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "department", "edit")

  const [department, companies] = await Promise.all([
    prisma.department.findFirst({
      where: { id, isActive: true },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        nameTh: true,
      },
      orderBy: { code: "asc" },
    }),
  ])

  if (!department) notFound()

  return (
    <DepartmentForm
      companies={companies}
      department={{
        id: department.id,
        code: department.code,
        name: department.name,
        companyId: department.companyId,
        isActive: department.isActive,
      }}
    />
  )
}
