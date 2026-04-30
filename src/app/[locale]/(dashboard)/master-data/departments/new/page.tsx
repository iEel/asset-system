import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { DepartmentForm } from "@/components/master-data/department-form"

type NewDepartmentPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewDepartmentPage({ params }: NewDepartmentPageProps) {
  const { locale } = await params
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

  return <DepartmentForm companies={companies} />
}
