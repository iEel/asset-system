import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { LocationForm } from "@/components/master-data/location-form"
import type { locationTypes } from "@/lib/validations/location"

type EditLocationPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditLocationPage({ params }: EditLocationPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "location", "edit")

  const [location, branches, parentLocations] = await Promise.all([
    prisma.location.findFirst({
      where: { id, isActive: true },
    }),
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
      where: {
        isActive: true,
        id: { not: id },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { code: "asc" },
    }),
  ])

  if (!location) notFound()

  return (
    <LocationForm
      branches={branches}
      parentLocations={parentLocations}
      location={{
        id: location.id,
        code: location.code,
        name: location.name,
        branchId: location.branchId,
        parentId: location.parentId,
        locationType: location.locationType as (typeof locationTypes)[number],
        description: location.description,
        isActive: location.isActive,
      }}
    />
  )
}
