import { prisma } from "@/lib/db"

export async function getMaintenanceOptions() {
  const [assets, employees, suppliers, statuses] = await Promise.all([
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
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
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
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      label: `${supplier.code} - ${supplier.name}`,
    })),
    statuses: statuses.map((status) => ({
      id: status.id,
      label: status.nameTh,
      name: status.name,
    })),
  }
}
