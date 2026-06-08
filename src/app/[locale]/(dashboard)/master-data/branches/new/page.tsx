import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BranchForm } from "@/components/master-data/branch-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type NewBranchPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewBranchPage({ params, searchParams }: NewBranchPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "branches", rawSearchParams.returnTo)
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

  return <BranchForm companies={companies} backHref={returnToHref} />
}
