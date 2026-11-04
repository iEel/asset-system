import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// Group 6 plan 2 Task 1: the approvals page's right-panel loaders, on a fake db. The modules that read the shared
// Prisma client (the batch-schema check, the round-close checklist) are stubbed to the same fake.

type Args = { where?: Record<string, unknown>; select?: unknown; orderBy?: unknown }
type Call = { call: string; args: Args }
type Attachment = { id: string; module: string; referenceId: string; originalName: string; fileType: string; uploadedAt: Date; isActive: boolean }

const state: {
  calls: Call[]
  batchReady: boolean
  requests: Array<Record<string, unknown>>
  attachments: Attachment[]
  rounds: Array<Record<string, unknown>>
  users: Array<{ id: string; displayName: string }>
  counts: Record<string, number>
} = { calls: [], batchReady: true, requests: [], attachments: [], rounds: [], users: [], counts: {} }
Object.assign(globalThis, { __inboxPanels: state })

// A small where evaluator: equality, { in }, { startsWith }, { not }, OR and NOT.
function matches(row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
  if (!where) return true
  return Object.entries(where).every(([field, condition]) => {
    if (field === "OR") return (condition as Record<string, unknown>[]).some((part) => matches(row, part))
    if (field === "AND") return (condition as Record<string, unknown>[]).every((part) => matches(row, part))
    if (field === "NOT") return !matches(row, condition as Record<string, unknown>)
    const value = row[field]
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      const test = condition as { in?: unknown[]; startsWith?: string; not?: unknown }
      if (test.in) return test.in.includes(value)
      if (test.startsWith !== undefined) return typeof value === "string" && value.startsWith(test.startsWith)
      if ("not" in test) return value !== test.not
      return true
    }
    return value === condition
  })
}

function record(call: string, args: Args) {
  state.calls.push({ call, args: args ?? {} })
}

const fakeDb = {
  disposalRequest: {
    async findFirst(args: Args) {
      record("disposalRequest.findFirst", args)
      return state.requests.find((request) => matches(request, args.where)) ?? null
    },
    async findMany(args: Args) {
      record("disposalRequest.findMany", args)
      return state.requests.filter((request) => matches(request, args.where))
    },
  },
  attachment: {
    async findMany(args: Args) {
      record("attachment.findMany", args)
      return state.attachments.filter((row) => matches(row as unknown as Record<string, unknown>, args.where))
    },
  },
  maintenanceTicket: {
    async findMany(args: Args) {
      record("maintenanceTicket.findMany", args)
      return [{ id: "mt-1", repairNo: "MT-2026-0042" }]
    },
  },
  auditFinding: {
    async findMany(args: Args) {
      record("auditFinding.findMany", args)
      return []
    },
    async count(args: Args) {
      record("auditFinding.count", args)
      return (args.where as { reviewStatus?: string }).reviewStatus ? (state.counts.pendingFindings ?? 0) : (state.counts.openActions ?? 0)
    },
  },
  auditItem: {
    async count(args: Args) {
      record("auditItem.count", args)
      return state.counts.pendingItems ?? 0
    },
  },
  auditRound: {
    async findFirst(args: Args) {
      record("auditRound.findFirst", args)
      return state.rounds.find((round) => matches(round, args.where)) ?? null
    },
  },
  user: {
    async findUnique(args: Args) {
      record("user.findUnique", args)
      return state.users.find((user) => user.id === (args.where as { id: string }).id) ?? null
    },
  },
}
Object.assign(globalThis, { __inboxPanelsDb: fakeDb })

const stubs = new Map<string, string>([
  ["@/lib/db", `export const prisma = globalThis.__inboxPanelsDb`],
  ["@/lib/disposal-schema-readiness", `export async function isDisposalBatchSchemaReady() { return globalThis.__inboxPanels.batchReady }`],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const { loadDisposalInboxPanel, loadAuditRoundClosePanel } = await import(pathToFileURL("src/lib/approval-inbox-panels.ts").href) as typeof import("../src/lib/approval-inbox-panels.ts")

const now = new Date("2026-11-04T05:00:00Z")
const viewer = { userId: "user-head", employeeId: "emp-head" }

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: "dsp-1",
    disposalNo: "DP-20261101-0001",
    disposalType: "sale",
    reason: "จอเสีย ซ่อมไม่คุ้ม",
    requestStatus: "pending",
    requestDate: new Date("2026-10-30T03:00:00Z"),
    approvalRemark: null,
    isActive: true,
    requestedById: "emp-req",
    createdBy: "user-req",
    sourceType: "maintenance",
    sourceId: "mt-1",
    batchId: "batch-1",
    asset: {
      id: "asset-1",
      name: "ThinkPad T14",
      assetTag: "GRL-NB-24-0001",
      serialNumber: "SN-001",
      purchasePrice: { toString: () => "32000" },
      purchaseDate: new Date("2021-12-31T18:00:00Z"),
      currentLocation: { name: "ห้อง IT" },
      branch: { name: "สำนักงานใหญ่" },
      custodian: { code: "E001", fullNameTh: "สมชาย ใจดี" },
      condition: { name: "Broken", nameTh: "ชำรุด" },
      status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย", isActive: true },
    },
    requestedBy: { code: "E009", fullNameTh: "สมศรี ขยัน" },
    previousAssetStatus: { name: "In Use", nameTh: "ใช้งานอยู่" },
    ...overrides,
  }
}

function attachment(id: string, module: string, referenceId: string, fileType: string, isActive = true): Attachment {
  return { id, module, referenceId, originalName: `${id}.file`, fileType, uploadedAt: new Date("2026-10-30T04:00:00Z"), isActive }
}

const load = (requestId: string, options: { viewer?: typeof viewer } = {}) =>
  loadDisposalInboxPanel(fakeDb, { requestId, locale: "th", viewer: options.viewer ?? viewer, segregationRequired: true, slaDays: 3, now })

beforeEach(() => {
  state.calls = []
  state.batchReady = true
  state.requests = [request()]
  state.attachments = [
    attachment("img-1", "disposal", "dsp-1", "image/jpeg"),
    attachment("img-2", "disposal_batch", "batch-1", "image/png"),
    attachment("pdf-1", "disposal", "dsp-1", "application/pdf"),
    attachment("pdf-old", "disposal", "dsp-1", "application/pdf", false),
    attachment("pdf-other", "disposal", "dsp-9", "application/pdf"),
  ]
  state.rounds = []
  state.users = []
  state.counts = {}
})

test("(a) a pending request: its photos and its batch's, one document, the previous status, no block", async () => {
  const panel = await load("dsp-1")
  assert.ok(panel)
  assert.equal(panel.photos.length, 2)
  assert.deepEqual(panel.photos.map((photo) => [photo.id, photo.source]), [["img-1", "request"], ["img-2", "batch"]])
  assert.deepEqual(panel.documents, [{ id: "pdf-1", originalName: "pdf-1.file", fileType: "application/pdf" }])
  assert.equal(panel.previousStatusName, "ใช้งานอยู่")
  assert.equal(panel.block, null)
  assert.equal(panel.isPending, true)
  assert.equal(panel.requesterName, "สมศรี ขยัน")
  assert.deepEqual(panel.request, {
    id: "dsp-1",
    disposalNo: "DP-20261101-0001",
    disposalType: "sale",
    reason: "จอเสีย ซ่อมไม่คุ้ม",
    requestStatus: "pending",
    requestDate: new Date("2026-10-30T03:00:00Z"),
    approvalRemark: null,
  })
  assert.deepEqual(panel.asset, {
    id: "asset-1",
    name: "ThinkPad T14",
    assetTag: "GRL-NB-24-0001",
    serialNumber: "SN-001",
    purchasePrice: "32000",
    purchaseYear: 2022,
    locationName: "ห้อง IT",
    branchName: "สำนักงานใหญ่",
    custodianName: "สมชาย ใจดี",
    conditionName: "ชำรุด",
  })
  assert.deepEqual(panel.source, { kind: "maintenance", number: "MT-2026-0042", href: "/th/maintenance/mt-1" })
  assert.equal(panel.age.ageDays, 5)
  assert.equal(panel.age.isOverdue, true)
  // One read of the request, by select, and one attachment read for the documents beside the photos' two.
  const reads = state.calls.filter((entry) => entry.call === "disposalRequest.findFirst")
  assert.equal(reads.length, 1)
  assert.ok(reads[0].args.select, "the request is read with select")
  assert.equal((reads[0].args.select as Record<string, unknown>).batchId, true)
  assert.equal(state.calls.filter((entry) => entry.call === "attachment.findMany").length, 3)
})

test("batchId is not read when the batch schema is absent; the batch's files are left out", async () => {
  state.batchReady = false
  const panel = await load("dsp-1")
  assert.ok(panel)
  const [read] = state.calls.filter((entry) => entry.call === "disposalRequest.findFirst")
  assert.equal((read.args.select as Record<string, unknown>).batchId, undefined)
  assert.deepEqual(panel.photos.map((photo) => photo.id), ["img-1"])
  assert.equal(panel.documents.length, 1)
})

test("(b) the viewer's own request carries the separation-of-duties block", async () => {
  const panel = await load("dsp-1", { viewer: { userId: "user-x", employeeId: "emp-req" } })
  assert.ok(panel)
  assert.equal(panel.block?.code, "DISPOSAL_SOD_CONFLICT")
  assert.equal(panel.block?.sodReason, "requester")
  assert.equal(panel.isPending, true)
})

test("(c) a request already approved is not pending and says why", async () => {
  state.requests = [request({ requestStatus: "approved", approvalRemark: "ok" })]
  const panel = await load("dsp-1")
  assert.ok(panel)
  assert.equal(panel.isPending, false)
  assert.equal(panel.block?.code, "DISPOSAL_INVALID_STAGE")
  assert.equal(panel.request.approvalRemark, "ok")
})

test("(d) a missing or inactive request is null; no previous status and no source read as null", async () => {
  assert.equal(await load("dsp-gone"), null)
  state.requests = [request({ isActive: false })]
  assert.equal(await load("dsp-1"), null)

  state.requests = [request({ previousAssetStatus: null, sourceType: null, sourceId: null, asset: { ...request().asset, custodian: null, purchasePrice: null, purchaseDate: null } })]
  const panel = await load("dsp-1")
  assert.ok(panel)
  assert.equal(panel.previousStatusName, null)
  assert.equal(panel.source, null)
  assert.equal(panel.asset.custodianName, null)
  assert.equal(panel.asset.purchasePrice, null)
  assert.equal(panel.asset.purchaseYear, null)
})

test("loadAuditRoundClosePanel: nothing pending is ready; the opener's name, else the id; a missing round is null", async () => {
  state.rounds = [{ id: "rnd-1", auditNo: "AUD-2026-0009", name: "HQ count", startDate: new Date("2026-10-01T00:00:00Z"), endDate: new Date("2026-10-31T00:00:00Z"), createdBy: "user-a", isActive: true, status: "open" }]
  state.users = [{ id: "user-a", displayName: "Narin A." }]
  const panel = await loadAuditRoundClosePanel(fakeDb, "rnd-1")
  assert.ok(panel)
  assert.equal(panel.ready, true)
  assert.deepEqual(panel.checklist, { pendingItems: 0, pendingFindings: 0, openActions: 0, canClose: true })
  assert.equal(panel.createdByName, "Narin A.")
  assert.equal(panel.auditNo, "AUD-2026-0009")
  assert.equal(panel.operational, true)

  state.users = []
  state.counts = { pendingFindings: 2 }
  const blocked = await loadAuditRoundClosePanel(fakeDb, "rnd-1")
  assert.equal(blocked?.ready, false)
  assert.equal(blocked?.createdByName, "user-a")

  assert.equal(await loadAuditRoundClosePanel(fakeDb, "rnd-gone"), null)
})

test("loadAuditRoundClosePanel: a closed or cancelled round with a clear checklist is not operational (the page's stale notice)", async () => {
  state.counts = {}
  state.users = []
  for (const status of ["closed", "cancelled"]) {
    state.rounds = [{ id: "rnd-2", auditNo: "AUD-2026-0010", name: "Done", startDate: new Date("2026-10-01T00:00:00Z"), endDate: null, createdBy: "user-a", isActive: true, status }]
    const panel = await loadAuditRoundClosePanel(fakeDb, "rnd-2")
    assert.ok(panel)
    assert.equal(panel.ready, true)
    assert.equal(panel.operational, false, status)
  }
  const select = state.calls.filter((entry) => entry.call === "auditRound.findFirst").at(-1)?.args.select as Record<string, unknown>
  assert.equal(select.status, true)
  assert.equal(select.isActive, true)
})
