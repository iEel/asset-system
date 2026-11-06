import assert from "node:assert/strict"
import test from "node:test"

import { readSupplierDetail, supplierOpenRepairWhere, type SupplierDetailReader } from "../src/lib/supplier-detail.ts"

// Group 8 plan 3 Task 2: the supplier page's one read model (board MD-Supplier, spec §7, rulings G8P3-R1..R3).

type Call = { model: string; method: string; args: Record<string, unknown> }

function fakeDb(overrides: Partial<Record<string, unknown>> = {}) {
  const calls: Call[] = []
  const answer = (model: string, method: string, args: object) => {
    calls.push({ model, method, args: args as Record<string, unknown> })
    const key = `${model}.${method}`
    const value = overrides[key]
    if (typeof value === "function") return Promise.resolve((value as (args: object) => unknown)(args))
    if (value !== undefined) return Promise.resolve(value)
    if (method === "count") return Promise.resolve(0)
    if (method === "aggregate") return Promise.resolve({ _sum: { repairCost: null } })
    return Promise.resolve([])
  }
  const db: SupplierDetailReader = {
    asset: { count: (args) => answer("asset", "count", args), findMany: (args) => answer("asset", "findMany", args) },
    purchaseDocument: { findMany: (args) => answer("purchaseDocument", "findMany", args) },
    maintenanceTicket: {
      count: (args) => answer("maintenanceTicket", "count", args),
      findMany: (args) => answer("maintenanceTicket", "findMany", args),
      aggregate: (args) => answer("maintenanceTicket", "aggregate", args),
    },
    maintenancePlan: { count: (args) => answer("maintenancePlan", "count", args) },
  }
  return { db, calls }
}

const where = (call: Call) => call.args.where as Record<string, unknown>

test("ทรัพย์สิน counts the active assets and, of them, those with no active purchase document (G8P3-R3)", async () => {
  const { db, calls } = fakeDb({
    "asset.count": (args: object) => ("purchaseDocumentLinks" in ((args as { where: object }).where) ? 3 : 12),
  })
  const detail = await readSupplierDetail(db, "s-1", new Date("2026-11-07T03:00:00Z"))
  assert.equal(detail.figures.assets, 12)
  assert.equal(detail.figures.assetsWithoutDocument, 3)
  const counts = calls.filter((call) => call.model === "asset" && call.method === "count").map(where)
  assert.deepEqual(counts, [
    { supplierId: "s-1", isActive: true },
    { supplierId: "s-1", isActive: true, purchaseDocumentLinks: { none: { purchaseDocument: { is: { isActive: true } } } } },
  ])
})

test("documents: all active, newest first, linked active assets, the total with null amounts as 0 (G8P3-R2)", async () => {
  const { db, calls } = fakeDb({
    "purchaseDocument.findMany": [
      { id: "d1", documentType: "purchase_order", documentNo: "PO-1", poNumber: "PO-1", invoiceNumber: "INV-1", documentDate: new Date("2026-08-28"), totalAmount: "394800.00", currency: "THB", _count: { assetLinks: 12 } },
      { id: "d2", documentType: "contract", documentNo: "CT-1", poNumber: null, invoiceNumber: null, documentDate: null, totalAmount: null, currency: null, _count: { assetLinks: 0 } },
      { id: "d3", documentType: "purchase_order", documentNo: "PO-2", poNumber: null, invoiceNumber: null, documentDate: new Date("2025-01-01"), totalAmount: 1000.5, currency: "THB", _count: { assetLinks: 2 } },
    ],
  })
  const detail = await readSupplierDetail(db, "s-1", new Date())
  const call = calls.find((item) => item.model === "purchaseDocument")!
  assert.deepEqual(where(call), { supplierId: "s-1", isActive: true })
  assert.deepEqual(call.args.orderBy, [{ documentDate: "desc" }, { updatedAt: "desc" }, { id: "asc" }])
  assert.equal(call.args.take, undefined, "every document, not the first 10")
  assert.deepEqual((call.args.select as { _count: unknown })._count, { select: { assetLinks: { where: { asset: { is: { isActive: true } } } } } })
  assert.deepEqual(detail.documents.map((document) => [document.id, document.totalAmount, document.linkedAssets]), [["d1", 394800, 12], ["d2", null, 0], ["d3", 1000.5, 2]])
  assert.deepEqual(detail.documentTotals, { count: 3, linkedAssets: 14, amount: 395800.5 })
  assert.equal(detail.figures.purchaseDocuments, 3)
  assert.equal(detail.figures.purchaseAmount, 395800.5)
})

test("งานซ่อม: all active, ค้าง by the shared open-repair where, ซ่อมเสร็จแล้ว = closed, ยกเลิก = cancelled", async () => {
  const { db, calls } = fakeDb({
    "maintenanceTicket.count": (args: object) => {
      const w = (args as { where: { repairStatus?: unknown; repairCost?: unknown } }).where
      if (w.repairCost) return 4
      if (w.repairStatus === "closed") return 4
      if (w.repairStatus === "cancelled") return 1
      if (w.repairStatus) return 1
      return 6
    },
  })
  const detail = await readSupplierDetail(db, "s-1", new Date())
  assert.deepEqual(detail.figures.repairs, { total: 6, open: 1, closed: 4, cancelled: 1 })
  const counts = calls.filter((call) => call.model === "maintenanceTicket" && call.method === "count").map(where)
  assert.deepEqual(counts.slice(0, 4), [
    { vendorId: "s-1", isActive: true },
    { vendorId: "s-1", ...supplierOpenRepairWhere },
    { vendorId: "s-1", isActive: true, repairStatus: "closed" },
    { vendorId: "s-1", isActive: true, repairStatus: "cancelled" },
  ])
})

test("ค่าซ่อมสะสม sums repairCost over the non-cancelled records; the foot counts those with a cost > 0 (G8P3-R1)", async () => {
  const { db, calls } = fakeDb({
    "maintenanceTicket.aggregate": { _sum: { repairCost: "15950.00" } },
    "maintenanceTicket.count": (args: object) => ((args as { where: { repairCost?: unknown } }).where.repairCost ? 4 : 0),
  })
  const detail = await readSupplierDetail(db, "s-1", new Date())
  assert.equal(detail.figures.repairCost, 15950)
  assert.equal(detail.figures.repairsWithCost, 4)
  const costWhere = { vendorId: "s-1", isActive: true, repairStatus: { not: "cancelled" } }
  assert.deepEqual(where(calls.find((call) => call.method === "aggregate")!), costWhere)
  assert.deepEqual(calls.find((call) => call.method === "aggregate")!.args._sum, { repairCost: true })
  assert.ok(calls.some((call) => call.model === "maintenanceTicket" && call.method === "count" && JSON.stringify(where(call)) === JSON.stringify({ ...costWhere, repairCost: { gt: 0 } })))
})

test("no cost at all reads as 0", async () => {
  const { db } = fakeDb()
  const detail = await readSupplierDetail(db, "s-1", new Date())
  assert.equal(detail.figures.repairCost, 0)
  assert.equal(detail.figures.purchaseAmount, 0)
  assert.deepEqual(detail.documentTotals, { count: 0, linkedAssets: 0, amount: 0 })
})

test("the latest 5 active assets with category, location · branch, status, active documents and the price", async () => {
  const { db, calls } = fakeDb({
    "asset.findMany": [
      {
        id: "a1",
        assetTag: "GRL-1",
        name: "Notebook",
        purchasePrice: "32900.00",
        category: { name: "โน้ตบุ๊ก" },
        currentLocation: { name: "คลัง IT", branch: { name: "สำนักงานใหญ่" } },
        status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
        purchaseDocumentLinks: [{ purchaseDocument: { documentType: "purchase_order", documentNo: "PO-1" } }],
      },
      {
        id: "a2",
        assetTag: "GRL-2",
        name: "Desk",
        purchasePrice: null,
        category: { name: "โต๊ะ" },
        currentLocation: { name: "ห้อง 301", branch: { name: "สาขา 2" } },
        status: { name: "In Use", nameTh: "ใช้งานอยู่" },
        purchaseDocumentLinks: [],
      },
    ],
  })
  const detail = await readSupplierDetail(db, "s-1", new Date())
  const call = calls.find((item) => item.model === "asset" && item.method === "findMany")!
  assert.deepEqual(where(call), { supplierId: "s-1", isActive: true })
  assert.equal(call.args.take, 5)
  assert.deepEqual(call.args.orderBy, [{ purchaseDate: "desc" }, { assetTag: "asc" }, { id: "asc" }])
  const links = (call.args.select as { purchaseDocumentLinks: { where: unknown; orderBy: unknown } }).purchaseDocumentLinks
  assert.deepEqual(links.where, { purchaseDocument: { is: { isActive: true } } })
  assert.deepEqual(detail.latestAssets, [
    { id: "a1", assetTag: "GRL-1", name: "Notebook", categoryName: "โน้ตบุ๊ก", locationName: "คลัง IT", branchName: "สำนักงานใหญ่", status: { name: "Ready", nameTh: "พร้อมใช้งาน" }, purchasePrice: 32900, documents: [{ documentType: "purchase_order", documentNo: "PO-1" }] },
    { id: "a2", assetTag: "GRL-2", name: "Desk", categoryName: "โต๊ะ", locationName: "ห้อง 301", branchName: "สาขา 2", status: { name: "In Use", nameTh: "ใช้งานอยู่" }, purchasePrice: null, documents: [] },
  ])
})

test("open repairs for สิ่งที่ควรติดตาม: oldest first, days since reported in Bangkok days", async () => {
  const now = new Date("2026-11-07T01:00:00Z") // 08:00 Bangkok, 7 Nov
  const { db, calls } = fakeDb({
    "maintenanceTicket.findMany": (args: object) =>
      (args as { where: { repairStatus?: unknown } }).where.repairStatus
        ? [
            // 23:30 Bangkok on 3 Nov (16:30 UTC): 4 Bangkok days, though under 4 x 24 hours.
            { id: "t1", repairNo: "MT-1", reportedDate: new Date("2026-11-03T16:30:00Z"), problem: "แบตเตอรี่บวม", asset: { id: "a1", assetTag: "GRL-5", name: "Notebook" } },
            { id: "t2", repairNo: "MT-2", reportedDate: new Date("2026-11-07T02:00:00Z"), problem: "จอ", asset: { id: "a2", assetTag: "GRL-6", name: "Desk" } },
          ]
        : [],
  })
  const detail = await readSupplierDetail(db, "s-1", now)
  const call = calls.find((item) => item.model === "maintenanceTicket" && item.method === "findMany" && (where(item) as { repairStatus?: unknown }).repairStatus)!
  assert.deepEqual(where(call), { vendorId: "s-1", ...supplierOpenRepairWhere })
  assert.deepEqual(call.args.orderBy, [{ reportedDate: "asc" }, { repairNo: "asc" }])
  assert.deepEqual(detail.openRepairs.map((repair) => [repair.id, repair.daysOpen]), [["t1", 4], ["t2", 0]])
  assert.equal(detail.openRepairs[0].asset.name, "Notebook")
})

test("repair history: the 10 latest active records with asset, status, MT-, problem, cost and reported date", async () => {
  const reported = new Date("2026-09-11T03:00:00Z")
  const { db, calls } = fakeDb({
    "maintenanceTicket.findMany": (args: object) =>
      (args as { where: { repairStatus?: unknown } }).where.repairStatus
        ? []
        : [{ id: "t9", repairNo: "MT-9", repairStatus: "closed", reportedDate: reported, repairCost: "2400.00", problem: "คีย์บอร์ด", asset: { id: "a9", assetTag: "GRL-9", name: "Notebook" } }],
  })
  const detail = await readSupplierDetail(db, "s-1", new Date())
  const call = calls.find((item) => item.model === "maintenanceTicket" && item.method === "findMany" && !(where(item) as { repairStatus?: unknown }).repairStatus)!
  assert.deepEqual(where(call), { vendorId: "s-1", isActive: true })
  assert.equal(call.args.take, 10)
  assert.deepEqual(call.args.orderBy, [{ reportedDate: "desc" }, { repairNo: "asc" }])
  assert.deepEqual(detail.repairHistory, [
    { id: "t9", repairNo: "MT-9", repairStatus: "closed", reportedDate: reported, repairCost: 2400, problem: "คีย์บอร์ด", asset: { id: "a9", assetTag: "GRL-9", name: "Notebook" } },
  ])
})

test("the deactivate counts are the DELETE guard's: active assets, repairs, PM plans and documents", async () => {
  const { db, calls } = fakeDb({
    "asset.count": 2,
    "maintenancePlan.count": 1,
    "maintenanceTicket.count": (args: object) => (Object.keys((args as { where: object }).where).length === 2 ? 3 : 0),
    "purchaseDocument.findMany": [{ id: "d1", documentType: "other", documentNo: "X", poNumber: null, invoiceNumber: null, documentDate: null, totalAmount: null, currency: null, _count: { assetLinks: 0 } }],
  })
  const detail = await readSupplierDetail(db, "s-1", new Date())
  assert.deepEqual(where(calls.find((call) => call.model === "maintenancePlan")!), { vendorId: "s-1", isActive: true })
  assert.deepEqual(detail.deactivateCounts, { assets: 2, maintenanceTickets: 3, maintenancePlans: 1, purchaseDocuments: 1 })
})
