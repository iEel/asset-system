import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BranchForm } from "@/components/master-data/branch-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { resolveBranchFormCompanyPreset } from "@/lib/organization-master-query"

type NewBranchPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[]; companyId?: string | string[] }>
}

export default async function NewBranchPage({ params, searchParams }: NewBranchPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  // "เพิ่มสาขาให้บริษัทนี้" on the companies list opens this form and comes back to that list.
  const returnToHref = normalizeMasterDataReturnTo(locale, "branches", rawSearchParams.returnTo, ["companies"])
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

  // ?companyId= (เพิ่มสาขาให้บริษัทนี้) chooses the company when the picker offers it; any other value is ignored.
  const presetCompanyId = resolveBranchFormCompanyPreset(rawSearchParams.companyId, companies.map((company) => company.id))

  return <BranchForm companies={companies} presetCompanyId={presetCompanyId} backHref={returnToHref} />
}
