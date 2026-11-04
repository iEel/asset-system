import { loadRepairAssetFacts, type RepairAssetFactsDb } from "./repair-asset-facts.ts"
import type { RepairAssetFacts } from "./repair-record-outlook.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

// pmAsset: the PM form's assets, which disables only written-off ones, so an asset under repair can get a plan (G5P1-R13).
export const maintenanceOptionTypes = ["asset", "pmAsset", "employee", "supplier"] as const
export type MaintenanceOptionType = (typeof maintenanceOptionTypes)[number]
export type MaintenanceOption = {
  id: string
  label: string
  disabled?: boolean
  reason?: string
  /** An asset's own condition, so the record form can pre-choose ดี or พอใช้ for a finished repair (final review M1). */
  conditionId?: string
  /** The asset's facts, only on a by-id read: the repair form's (`type: "asset"`, G5P2-R1) and the PM form's card (`type: "pmAsset"`, G5P4-R9). */
  facts?: RepairAssetFacts
}

const writtenOffStatusNames = new Set(["disposed", "retired"])

type FindMany = (args: { where: object; select: object; orderBy: object; take: number }) => Promise<unknown[]>
// The by-id asset read also loads the repair's asset facts with the same db (G5P2-R1).
export type MaintenanceOptionDb = RepairAssetFactsDb & {
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
    select: { id: true, assetTag: true, name: true, conditionId: true, status: { select: { name: true, nameTh: true } } },
    orderBy: { assetTag: "asc" },
    take: 50,
  }) as Array<{ id: string; assetTag: string; name: string; conditionId: string; status: { name: string; nameTh: string } }>
  const openRecords = assets.length && input.type === "asset"
    ? await db.maintenanceTicket.findMany({
        where: { ...openRepairRecordWhere, assetId: { in: assets.map((asset) => asset.id) } },
        select: { assetId: true },
      }) as Array<{ assetId: string }>
    : []
  const openRecordAssetIds = new Set(openRecords.map((record) => record.assetId))
  // Only a by-id read carries the facts (the repair form's and the PM form's card); a search never reads them.
  const factsById = new Map<string, RepairAssetFacts>()
  if (id) {
    for (const asset of assets) {
      const facts = await loadRepairAssetFacts(db, asset.id)
      if (facts) factsById.set(asset.id, facts)
    }
  }

  // Only block what can never succeed: written-off assets and assets that already have an
  // unfinished record. Loan and status rules depend on "done / not done" and are explained by the API.
  // A PM plan may be set up for an asset under repair, so pmAsset blocks only written-off assets (decision 10.4).
  return assets.map((asset) => {
    const writtenOff = writtenOffStatusNames.has(asset.status.name.trim().toLowerCase())
    const reason = input.type === "pmAsset"
      ? writtenOff ? "MAINTENANCE_PLAN_ASSET_WRITTEN_OFF" : null
      : writtenOff
        ? "MAINTENANCE_ASSET_WRITTEN_OFF"
        : openRecordAssetIds.has(asset.id)
          ? "MAINTENANCE_OPEN_RECORD_EXISTS"
          : null
    return {
      id: asset.id,
      label: `${asset.assetTag} - ${asset.name} (${asset.status.nameTh})`,
      conditionId: asset.conditionId,
      ...(reason ? { disabled: true, reason } : {}),
      ...(factsById.has(asset.id) ? { facts: factsById.get(asset.id) } : {}),
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
