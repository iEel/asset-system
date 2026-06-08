import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BranchForm } from "@/components/master-data/branch-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type EditBranchPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditBranchPage({ params, searchParams }: EditBranchPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "branches", rawSearchParams.returnTo)
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
      backHref={returnToHref}
    />
  )
}
