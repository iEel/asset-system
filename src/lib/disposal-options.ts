import { prisma } from "@/lib/db"

export async function getDisposalOptions() {
  const [assets, employees] = await Promise.all([
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
  }
}
