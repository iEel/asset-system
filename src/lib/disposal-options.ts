import { prisma } from "@/lib/db"

// The disposal request page needs only the executors and the statuses an
// approver or executor can pick. It never shows the asset register, so this
// loader must not read every asset.
export async function getDisposalOptions() {
  const [employees, statuses] = await Promise.all([
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
