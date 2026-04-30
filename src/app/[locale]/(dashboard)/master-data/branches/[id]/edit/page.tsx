import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BranchForm } from "@/components/master-data/branch-form"

type EditBranchPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditBranchPage({ params }: EditBranchPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "branch", "edit")

  const [branch, companies] = await Promise.all([
    prisma.branch.findFirst({
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

  if (!branch) notFound()

  return (
    <BranchForm
      companies={companies}
      branch={{
        id: branch.id,
        code: branch.code,
        name: branch.name,
        companyId: branch.companyId,
        address: branch.address,
        contactPerson: branch.contactPerson,
        isActive: branch.isActive,
      }}
    />
  )
}
