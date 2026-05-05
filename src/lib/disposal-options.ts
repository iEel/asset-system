import { prisma } from "@/lib/db"

export async function getDisposalOptions() {
  const [assets, employees, statuses] = await Promise.all([
    prisma.asset.findMany({
      where: { isActive: true },
      select: {
        id: true,
        assetTag: true,
        name: true,
        status: { select: { nameTh: true } },
      },
      orderBy: { assetTag: "asc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.assetStatus.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  return {
    assets: assets.map((asset) => ({
      id: asset.id,
      label: `${asset.assetTag} - ${asset.name} (${asset.status.nameTh})`,
    })),
    employees: employees.map((employee) => ({
      id: employee.id,
      label: `${employee.code} - ${employee.fullNameTh}`,
    })),
    statuses: statuses.map((status) => ({
      id: status.id,
      name: status.name,
      label: status.nameTh,
    })),
  }
}
