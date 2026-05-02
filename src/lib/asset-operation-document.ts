import { prisma } from "@/lib/db"

export async function buildReferenceLabelMap(ids: Array<string | null | undefined>) {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  const [locations, departments, assets, conditions, statuses] = await Promise.all([
    prisma.location.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, code: true, name: true },
    }),
    prisma.department.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, code: true, name: true },
    }),
    prisma.asset.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, assetTag: true, name: true },
    }),
    prisma.assetCondition.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, nameTh: true },
    }),
    prisma.assetStatus.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, nameTh: true },
    }),
  ])

  const labels = new Map<string, string>()
  for (const location of locations) labels.set(location.id, `${location.code} - ${location.name}`)
  for (const department of departments) labels.set(department.id, `${department.code} - ${department.name}`)
  for (const asset of assets) labels.set(asset.id, `${asset.assetTag} - ${asset.name}`)
  for (const condition of conditions) labels.set(condition.id, condition.nameTh || condition.name)
  for (const status of statuses) labels.set(status.id, status.nameTh || status.name)
  return labels
}

export function labelOrDash(labels: Map<string, string>, id?: string | null) {
  if (!id) return "-"
  return labels.get(id) ?? id
}
