import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { LocationForm } from "@/components/master-data/location-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type NewLocationPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewLocationPage({ params, searchParams }: NewLocationPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "locations", rawSearchParams.returnTo)
  await requirePagePermission(locale, "location", "create")

  const [branches, parentLocations] = await Promise.all([
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
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { code: "asc" },
    }),
  ])

  return <LocationForm branches={branches} parentLocations={parentLocations} backHref={returnToHref} />
}
