import type { Prisma } from "@prisma/client"
import { chunkListIds } from "./master-data-list-ui.ts"
import { bangkokDayDiff } from "./preventive-maintenance.ts"

// One definition of an open repair with a supplier (vendorId), for the suppliers list's "ค้าง {n}" and summary line and
// for the supplier page (group 8 plan 3): an active repair record that is not closed or cancelled.
export const supplierOpenRepairWhere = {
  isActive: true,
  repairStatus: { notIn: ["closed", "cancelled"] },
} satisfies Prisma.MaintenanceTicketWhereInput

export type SupplierOpenRepairReader = { maintenanceTicket: { groupBy(args: object): PromiseLike<unknown[]> } }

// The open repairs of each supplier, one grouped query per 2,000 ids; a supplier with none is left out of the map.
export async function readSupplierOpenRepairCounts(db: SupplierOpenRepairReader, supplierIds: readonly string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (supplierIds.length === 0) return result
  const parts = await Promise.all(
    chunkListIds(supplierIds).map((chunk) =>
      db.maintenanceTicket.groupBy({
        by: ["vendorId"],
        where: { ...supplierOpenRepairWhere, vendorId: { in: chunk } },
        _count: { _all: true },
      })
    )
  )
  for (const row of parts.flat() as { vendorId: string | null; _count: { _all: number } }[]) {
    if (row.vendorId) result.set(row.vendorId, (result.get(row.vendorId) ?? 0) + row._count._all)
  }
  return result
}

export type SupplierFollowUpKey =
  | "missing_contact"
  | "assets_without_purchase_documents"
  | "open_vendor_maintenance"

export function buildSupplierDetailHrefs({ locale, supplierId }: { locale: string; supplierId: string }) {
  const basePath = `/${locale}/master-data/suppliers`
  const encodedSupplierId = encodeURIComponent(supplierId)
  return {
    list: basePath,
    edit: `${basePath}/${encodedSupplierId}/edit`,
    assets: `/${locale}/assets?supplierId=${encodedSupplierId}&page=1`,
  }
}


// assetsWithoutDocument is figures.assetsWithoutDocument (G8P3-R3), the count the strip's ทรัพย์สิน foot shows, so the
// item and the strip never disagree.
export function buildSupplierFollowUpItems({
  hasContact,
  assetsWithoutDocument,
  openMaintenanceTicketCount,
}: {
  hasContact: boolean
  assetsWithoutDocument: number
  openMaintenanceTicketCount: number
}) {
  const items: SupplierFollowUpKey[] = []
  if (!hasContact) items.push("missing_contact")
  if (assetsWithoutDocument > 0) items.push("assets_without_purchase_documents")
  if (openMaintenanceTicketCount > 0) items.push("open_vendor_maintenance")
  return items
}

// ---------------------------------------------------------------------------------------------------------------------
// The supplier page's one read model (board MD-Supplier, group 8 plan 3 Task 2, spec §7, rulings G8P3-R1..R3).
// Everything is read by the supplier's id, so there is no IN list; the counts are of active records, as the board says.

type Reader = (args: object) => PromiseLike<unknown>
export type SupplierDetailReader = {
  asset: { count: Reader; findMany: Reader }
  purchaseDocument: { findMany: Reader }
  maintenanceTicket: { count: Reader; findMany: Reader; aggregate: Reader }
  maintenancePlan: { count: Reader }
}

type Money = { toString(): string } | number | string | null
const toMoney = (value: Money) => (value == null ? null : Number(value))

export type SupplierDetailAsset = {
  id: string
  assetTag: string
  name: string
  categoryName: string
  locationName: string
  branchName: string
  status: { name: string; nameTh: string }
  purchasePrice: number | null
  // The asset's active purchase documents, first linked first (column เอกสาร).
  documents: { documentType: string; documentNo: string }[]
}

export type SupplierDetailDocument = {
  id: string
  documentType: string
  documentNo: string
  poNumber: string | null
  invoiceNumber: string | null
  documentDate: Date | null
  // null when the document has no total: the page shows "ยังไม่ระบุ", never 0.00 (spec 2D M32 a); the total reads it as 0.
  totalAmount: number | null
  currency: string | null
  // The document's links to active assets.
  linkedAssets: number
}

type RepairAsset = { id: string; assetTag: string; name: string }

export type SupplierDetailOpenRepair = {
  id: string
  repairNo: string
  reportedDate: Date
  // Whole Bangkok days since it was reported, "เปิดงานเมื่อ {date} ({n} วัน)" (spec §9: "รอผู้ขายมา N วัน" needs the
  // time the status changed, a migration).
  daysOpen: number
  problem: string
  asset: RepairAsset
}

export type SupplierDetailRepair = {
  id: string
  repairNo: string
  repairStatus: string
  reportedDate: Date
  repairCost: number | null
  problem: string
  asset: RepairAsset
}

export type SupplierDetail = {
  figures: {
    assets: number
    // G8P3-R3: the active assets with no active purchase document.
    assetsWithoutDocument: number
    purchaseDocuments: number
    // G8P3-R2: the documents' amounts, null as 0 (the documents table's total row).
    purchaseAmount: number
    // ค้าง by supplierOpenRepairWhere; ซ่อมเสร็จแล้ว = closed and ยกเลิก = cancelled (toRepairRecordStatus, as the page
    // labels them). An old-workflow status (completed, waiting_vendor …) is ค้าง, as everywhere.
    repairs: { total: number; open: number; closed: number; cancelled: number }
    // G8P3-R1: MaintenanceTicket.repairCost summed over the active, non-cancelled records; the foot counts those with a
    // cost > 0.
    repairCost: number
    repairsWithCost: number
  }
  latestAssets: SupplierDetailAsset[]
  documents: SupplierDetailDocument[]
  documentTotals: { count: number; linkedAssets: number; amount: number }
  openRepairs: SupplierDetailOpenRepair[]
  repairHistory: SupplierDetailRepair[]
  // The DELETE route's guard counts (shouldBlockSupplierLifecycleChange), for ⋯ ปิดใช้งาน's reason.
  deactivateCounts: { assets: number; maintenanceTickets: number; maintenancePlans: number; purchaseDocuments: number }
}

export const supplierDetailLatestAssets = 5
export const supplierDetailRepairHistory = 10
export const supplierDetailOpenRepairs = 20

const activeDocumentWhere = { purchaseDocument: { is: { isActive: true } } } satisfies Prisma.PurchaseDocumentAssetWhereInput

export async function readSupplierDetail(db: SupplierDetailReader, supplierId: string, now: Date = new Date()): Promise<SupplierDetail> {
  const assetWhere = { supplierId, isActive: true }
  const repairWhere = { vendorId: supplierId, isActive: true }
  const costWhere = { ...repairWhere, repairStatus: { not: "cancelled" } }
  const repairAssetSelect = { select: { id: true, assetTag: true, name: true } }
  const [
    assets,
    assetsWithoutDocument,
    latestAssets,
    documents,
    repairsTotal,
    repairsOpen,
    repairsClosed,
    repairsCancelled,
    repairsWithCost,
    cost,
    openRepairs,
    repairHistory,
    maintenancePlans,
  ] = await Promise.all([
    db.asset.count({ where: assetWhere }),
    db.asset.count({ where: { ...assetWhere, purchaseDocumentLinks: { none: activeDocumentWhere } } satisfies Prisma.AssetWhereInput }),
    db.asset.findMany({
      where: assetWhere,
      select: {
        id: true,
        assetTag: true,
        name: true,
        purchasePrice: true,
        category: { select: { name: true } },
        currentLocation: { select: { name: true, branch: { select: { name: true } } } },
        status: { select: { name: true, nameTh: true } },
        purchaseDocumentLinks: {
          where: activeDocumentWhere,
          select: { purchaseDocument: { select: { documentType: true, documentNo: true } } },
          orderBy: [{ linkedAt: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ purchaseDate: "desc" }, { assetTag: "asc" }, { id: "asc" }],
      take: supplierDetailLatestAssets,
    } satisfies Prisma.AssetFindManyArgs),
    // Every document, newest first (the board lists all of them and ends with the total).
    db.purchaseDocument.findMany({
      where: { supplierId, isActive: true },
      select: {
        id: true,
        documentType: true,
        documentNo: true,
        poNumber: true,
        invoiceNumber: true,
        documentDate: true,
        totalAmount: true,
        currency: true,
        _count: { select: { assetLinks: { where: { asset: { is: { isActive: true } } } } } },
      },
      orderBy: [{ documentDate: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    } satisfies Prisma.PurchaseDocumentFindManyArgs),
    db.maintenanceTicket.count({ where: repairWhere }),
    db.maintenanceTicket.count({ where: { vendorId: supplierId, ...supplierOpenRepairWhere } }),
    db.maintenanceTicket.count({ where: { ...repairWhere, repairStatus: "closed" } }),
    db.maintenanceTicket.count({ where: { ...repairWhere, repairStatus: "cancelled" } }),
    db.maintenanceTicket.count({ where: { ...costWhere, repairCost: { gt: 0 } } satisfies Prisma.MaintenanceTicketWhereInput }),
    db.maintenanceTicket.aggregate({ where: costWhere, _sum: { repairCost: true } } satisfies Prisma.MaintenanceTicketAggregateArgs),
    // สิ่งที่ควรติดตาม: the open repairs, the longest open first.
    db.maintenanceTicket.findMany({
      where: { vendorId: supplierId, ...supplierOpenRepairWhere },
      select: { id: true, repairNo: true, reportedDate: true, problem: true, asset: repairAssetSelect },
      orderBy: [{ reportedDate: "asc" }, { repairNo: "asc" }],
      take: supplierDetailOpenRepairs,
    } satisfies Prisma.MaintenanceTicketFindManyArgs),
    db.maintenanceTicket.findMany({
      where: repairWhere,
      select: { id: true, repairNo: true, repairStatus: true, reportedDate: true, repairCost: true, problem: true, asset: repairAssetSelect },
      orderBy: [{ reportedDate: "desc" }, { repairNo: "asc" }],
      take: supplierDetailRepairHistory,
    } satisfies Prisma.MaintenanceTicketFindManyArgs),
    db.maintenancePlan.count({ where: repairWhere }),
  ])

  type AssetRow = {
    id: string
    assetTag: string
    name: string
    purchasePrice: Money
    category: { name: string }
    currentLocation: { name: string; branch: { name: string } }
    status: { name: string; nameTh: string }
    purchaseDocumentLinks: { purchaseDocument: { documentType: string; documentNo: string } }[]
  }
  type DocumentRow = Omit<SupplierDetailDocument, "totalAmount" | "linkedAssets"> & { totalAmount: Money; _count: { assetLinks: number } }
  type OpenRepairRow = Omit<SupplierDetailOpenRepair, "daysOpen">
  type RepairRow = Omit<SupplierDetailRepair, "repairCost"> & { repairCost: Money }

  const documentRows: SupplierDetailDocument[] = (documents as DocumentRow[]).map(({ _count, totalAmount, ...document }) => ({
    ...document,
    totalAmount: toMoney(totalAmount),
    linkedAssets: _count.assetLinks,
  }))
  const documentTotals = {
    count: documentRows.length,
    linkedAssets: documentRows.reduce((sum, document) => sum + document.linkedAssets, 0),
    amount: documentRows.reduce((sum, document) => sum + (document.totalAmount ?? 0), 0),
  }
  const repairs = {
    total: repairsTotal as number,
    open: repairsOpen as number,
    closed: repairsClosed as number,
    cancelled: repairsCancelled as number,
  }

  return {
    figures: {
      assets: assets as number,
      assetsWithoutDocument: assetsWithoutDocument as number,
      purchaseDocuments: documentTotals.count,
      purchaseAmount: documentTotals.amount,
      repairs,
      repairCost: toMoney((cost as { _sum: { repairCost: Money } })._sum.repairCost) ?? 0,
      repairsWithCost: repairsWithCost as number,
    },
    latestAssets: (latestAssets as AssetRow[]).map((asset) => ({
      id: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      categoryName: asset.category.name,
      locationName: asset.currentLocation.name,
      branchName: asset.currentLocation.branch.name,
      status: { name: asset.status.name, nameTh: asset.status.nameTh },
      purchasePrice: toMoney(asset.purchasePrice),
      documents: asset.purchaseDocumentLinks.map((link) => ({
        documentType: link.purchaseDocument.documentType,
        documentNo: link.purchaseDocument.documentNo,
      })),
    })),
    documents: documentRows,
    documentTotals,
    openRepairs: (openRepairs as OpenRepairRow[]).map((repair) => ({
      ...repair,
      daysOpen: Math.max(0, bangkokDayDiff(repair.reportedDate, now)),
    })),
    repairHistory: (repairHistory as RepairRow[]).map((repair) => ({ ...repair, repairCost: toMoney(repair.repairCost) })),
    deactivateCounts: {
      assets: assets as number,
      maintenanceTickets: repairs.total,
      maintenancePlans: maintenancePlans as number,
      purchaseDocuments: documentTotals.count,
    },
  }
}
