import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { LocationForm } from "@/components/master-data/location-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { locationRuleSelect } from "@/lib/location-tree"
import { resolveLocationFormPreset } from "@/lib/location-parent-options"

type NewLocationPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[]; branchId?: string | string[]; parentId?: string | string[] }>
}

export default async function NewLocationPage({ params, searchParams }: NewLocationPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "locations", rawSearchParams.returnTo)
  await requirePagePermission(locale, "location", "create")

  // Every location once, inactive ones too: the form builds the branch's parent list with its paths in memory (spec §6.2).
  const [branches, locationRows] = await Promise.all([
    prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        company: {
          select: {
            code: true,
            nameTh: true,
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      select: locationRuleSelect,
      orderBy: { code: "asc" },
    }),
  ])

  // "เพิ่มที่ตั้งในนี้" (Review Focus 5): ?branchId=&parentId= choose both; an invalid one is ignored.
  const preset = resolveLocationFormPreset({ branchId: rawSearchParams.branchId, parentId: rawSearchParams.parentId }, {
    branchIds: branches.map((branch) => branch.id),
    rows: locationRows,
  })

  return <LocationForm branches={branches} locationRows={locationRows} preset={preset} backHref={returnToHref} />
}
