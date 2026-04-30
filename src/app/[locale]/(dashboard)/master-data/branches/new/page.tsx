import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BranchForm } from "@/components/master-data/branch-form"

type NewBranchPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewBranchPage({ params }: NewBranchPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "branch", "create")

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      nameTh: true,
    },
    orderBy: { code: "asc" },
  })

  return <BranchForm companies={companies} />
}
