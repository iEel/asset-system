import { getCorrectiveAssetEligibilityError } from "./maintenance-policy.ts"

export const maintenanceOptionTypes = ["asset", "employee", "supplier"] as const
export type MaintenanceOptionType = (typeof maintenanceOptionTypes)[number]
export type MaintenanceOption = {
  id: string
  label: string
  disabled?: boolean
  reason?: string
}

type FindMany = (args: { where: object; select: object; orderBy: object; take: number }) => Promise<unknown[]>
export type MaintenanceOptionDb = {
  asset: { findMany: FindMany }
  employee: { findMany: FindMany }
  supplier: { findMany: FindMany }
  maintenanceTicket: { findMany: (args: { where: object; select: object }) => Promise<unknown[]> }
}

export async function searchMaintenanceOptions(
  db: MaintenanceOptionDb,
  input: { type: MaintenanceOptionType; q?: string; id?: string },
): Promise<MaintenanceOption[]> {
  const q = input.q?.trim() ?? ""
  const id = input.id?.trim() ?? ""
  if (!id && q.length < 2) return []

  if (input.type === "employee") {
    const rows = await db.employee.findMany({
      where: {
        isActive: true,
        ...(id ? { id } : { OR: [{ code: { contains: q } }, { fullNameTh: { contains: q } }, { fullNameEn: { contains: q } }] }),
      },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
      take: 50,
    }) as Array<{ id: string; code: string; fullNameTh: string }>
    return rows.map((row) => ({ id: row.id, label: `${row.code} - ${row.fullNameTh}` }))
  }

  if (input.type === "supplier") {
    const rows = await db.supplier.findMany({
      where: {
        isActive: true,
        ...(id ? { id } : { OR: [{ code: { contains: q } }, { name: { contains: q } }] }),
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
      take: 50,
    }) as Array<{ id: string; code: string; name: string }>
    return rows.map((row) => ({ id: row.id, label: `${row.code} - ${row.name}` }))
  }

  const assets = await db.asset.findMany({
    where: {
      isActive: true,
      ...(id ? { id } : { OR: [{ assetTag: { contains: q } }, { name: { contains: q } }, { serialNumber: { contains: q } }] }),
    },
    select: { id: true, assetTag: true, name: true, status: { select: { name: true, nameTh: true } } },
    orderBy: { assetTag: "asc" },
    take: 50,
  }) as Array<{ id: string; assetTag: string; name: string; status: { name: string; nameTh: string } }>
  const activeTickets = assets.length
    ? await db.maintenanceTicket.findMany({
        where: {
          assetId: { in: assets.map((asset) => asset.id) },
          isActive: true,
          repairStatus: { not: "closed" },
          maintenancePlanId: null,
          NOT: { problem: { startsWith: "[PM] " } },
        },
        select: { assetId: true },
      }) as Array<{ assetId: string }>
    : []
  const activeAssetIds = new Set(activeTickets.map((ticket) => ticket.assetId))

  return assets.map((asset) => {
    const reason = getCorrectiveAssetEligibilityError(asset.status.name, activeAssetIds.has(asset.id) ? 1 : 0)
    return {
      id: asset.id,
      label: `${asset.assetTag} - ${asset.name} (${asset.status.nameTh})`,
      ...(reason ? { disabled: true, reason } : {}),
    }
  })
}

export async function getMaintenanceOptions() {
  const { prisma } = await import("./db.ts")
  const [assetRows, employeeRows, supplierRows, statuses] = await Promise.all([
    prisma.asset.findMany({
      where: { isActive: true },
      select: { id: true, assetTag: true, name: true, status: { select: { nameTh: true } } },
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
    assets: assetRows.map((asset) => ({ id: asset.id, label: `${asset.assetTag} - ${asset.name} (${asset.status.nameTh})` })),
    employees: employeeRows.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` })),
    suppliers: supplierRows.map((supplier) => ({ id: supplier.id, label: `${supplier.code} - ${supplier.name}` })),
    statuses: statuses.map((status) => ({ id: status.id, label: status.nameTh, name: status.name })),
  }
}
