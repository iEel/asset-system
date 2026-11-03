import assert from "node:assert/strict"
import test from "node:test"

import { loadRepairAssetFacts, type RepairAssetFactsDb } from "../src/lib/repair-asset-facts.ts"

// The one read of a repair's asset facts (G5P2-R1), the handover's holder named by its checkoutType (G5P2-R2).

type Where = Record<string, unknown>
type Args = { where: Where; select?: unknown; orderBy?: unknown }

const assetRow = {
  id: "a-1",
  assetTag: "NB-001",
  name: "Notebook",
  ownershipType: "personal",
  custodianId: "emp-1",
  conditionId: "condition-good",
  modelId: "model-1",
  status: { name: "In Use", nameTh: "ใช้งานอยู่" },
  condition: { nameTh: "ดี" },
  custodian: { fullNameTh: "สมชาย ใจดี" },
  department: { name: "IT" },
  currentLocation: { name: "ห้อง 101", branch: { name: "สำนักงานใหญ่" } },
}

type Checkout = {
  id: string
  documentNo: string | null
  checkoutType: string
  departmentId: string | null
  locationId: string | null
  parentAssetId: string | null
  custodian: { fullNameTh: string } | null
}

function fakeDb(config: { active?: boolean; openRecord?: { id: string; repairNo: string } | null; checkout?: Checkout | null } = {}) {
  const calls: Array<{ model: string; args: Args }> = []
  const db: RepairAssetFactsDb = {
    asset: {
      async findFirst(args: Args) {
        calls.push({ model: "asset", args })
        if (args.where.id === "a-1") return config.active === false && args.where.isActive === true ? null : assetRow
        if (args.where.id === "parent-1") return { name: "Docking Station" }
        return null
      },
    },
    maintenanceTicket: {
      async findFirst(args: Args) {
        calls.push({ model: "maintenanceTicket", args })
        return config.openRecord ?? null
      },
    },
    assetCheckout: {
      async findFirst(args: Args) {
        calls.push({ model: "assetCheckout", args })
        return config.checkout ?? null
      },
    },
    department: {
      async findFirst(args: Args) {
        calls.push({ model: "department", args })
        return args.where.id === "dep-9" ? { name: "บัญชี" } : null
      },
    },
    location: {
      async findFirst(args: Args) {
        calls.push({ model: "location", args })
        return args.where.id === "loc-9" ? { name: "ห้องประชุม" } : null
      },
    },
    attachment: {
      async findMany(args: Args) {
        calls.push({ model: "attachment", args })
        if (args.where.module === "asset_model") return [{ id: "att-1", referenceId: "model-1", originalName: "nb.jpg", fileType: "image/jpeg" }]
        return []
      },
    },
  }
  return { db, calls }
}

const checkout = (overrides: Partial<Checkout>): Checkout => ({
  id: "co-1",
  documentNo: "HO-1",
  checkoutType: "user",
  departmentId: null,
  locationId: null,
  parentAssetId: null,
  custodian: null,
  ...overrides,
})

test("loadRepairAssetFacts reads the asset, its photo, no open record and a department handover named by the department", async () => {
  const { db, calls } = fakeDb({ checkout: checkout({ checkoutType: "department", departmentId: "dep-9" }) })
  const facts = await loadRepairAssetFacts(db, "a-1")
  assert.deepEqual(facts, {
    id: "a-1",
    assetTag: "NB-001",
    name: "Notebook",
    statusName: "In Use",
    statusLabel: "ใช้งานอยู่",
    conditionId: "condition-good",
    conditionLabel: "ดี",
    ownershipType: "personal",
    custodianId: "emp-1",
    holderName: "สมชาย ใจดี",
    departmentName: "IT",
    roomName: "ห้อง 101",
    branchName: "สำนักงานใหญ่",
    photo: { id: "att-1", alt: "nb.jpg", fileType: "image/jpeg" },
    openRecord: null,
    activeCheckout: { id: "co-1", documentNo: "HO-1", holderName: "บัญชี" },
  })
  const assetRead = calls.find((call) => call.model === "asset")
  assert.deepEqual(assetRead?.args.where, { id: "a-1", isActive: true })
  const recordRead = calls.find((call) => call.model === "maintenanceTicket")
  assert.equal(recordRead?.args.where.assetId, "a-1")
  assert.equal(recordRead?.args.where.isActive, true)
  assert.deepEqual(recordRead?.args.where.repairStatus, { notIn: ["closed", "cancelled"] })
  const checkoutRead = calls.find((call) => call.model === "assetCheckout")
  assert.deepEqual(checkoutRead?.args.where, { assetId: "a-1", isReturned: false, transactionStatus: "active" })
  assert.deepEqual(checkoutRead?.args.orderBy, [{ checkoutDate: "desc" }, { createdAt: "desc" }])
})

test("loadRepairAssetFacts names an asset handover by the parent asset and a user handover by its custodian", async () => {
  const parent = await loadRepairAssetFacts(fakeDb({ checkout: checkout({ checkoutType: "asset", parentAssetId: "parent-1", documentNo: null }) }).db, "a-1")
  assert.deepEqual(parent?.activeCheckout, { id: "co-1", documentNo: null, holderName: "Docking Station" })

  const user = await loadRepairAssetFacts(fakeDb({ checkout: checkout({ custodian: { fullNameTh: "สมหญิง" } }) }).db, "a-1")
  assert.deepEqual(user?.activeCheckout, { id: "co-1", documentNo: "HO-1", holderName: "สมหญิง" })

  const room = await loadRepairAssetFacts(fakeDb({ checkout: checkout({ checkoutType: "location", locationId: "loc-9" }) }).db, "a-1")
  assert.equal(room?.activeCheckout?.holderName, "ห้องประชุม")
})

test("loadRepairAssetFacts carries the open record and no handover", async () => {
  const facts = await loadRepairAssetFacts(fakeDb({ openRecord: { id: "r-1", repairNo: "MT-2026-0001" } }).db, "a-1")
  assert.deepEqual(facts?.openRecord, { id: "r-1", repairNo: "MT-2026-0001" })
  assert.equal(facts?.activeCheckout, null)
})

test("loadRepairAssetFacts gives null for an inactive or unknown asset and reads nothing else", async () => {
  const inactive = fakeDb({ active: false })
  assert.equal(await loadRepairAssetFacts(inactive.db, "a-1"), null)
  assert.deepEqual(inactive.calls.map((call) => call.model), ["asset"])
  assert.equal(await loadRepairAssetFacts(fakeDb().db, "missing"), null)
})
