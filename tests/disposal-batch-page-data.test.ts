import assert from "node:assert/strict"
import test from "node:test"

import {
  disposalBatchListWhere,
  readDisposalBatch,
  readDisposalBatchList,
} from "../src/lib/disposal-batch-page-data.ts"
import type { DisposalRoundActor } from "../src/lib/disposal-round-service.ts"

// Request batches Task 1 (spec §5–6): the batch page and the batch list read through a fake db. The batch page's round
// candidates go through the real round service's tick blocks.

type FakeRequest = {
  id: string
  batchId: string
  disposalNo: string
  requestStatus: string
  roundId: string | null
  isActive: boolean
  approverId: string | null
  asset: { assetTag: string; name: string; serialNumber: string | null }
}

type FakeBatch = {
  id: string
  batchNo: string
  disposalType: string
  reason: string
  requestDate: Date
  isActive: boolean
  requestedBy: { code: string; fullNameTh: string }
  approver: { code: string; fullNameTh: string } | null
}

type FakeAttachment = { id: string; module: string; referenceId: string; fileType: string; uploadedAt: Date; isActive?: boolean }

const day = (value: number) => new Date(Date.UTC(2026, 10, value))
const at = (minute: number) => new Date(Date.UTC(2026, 10, 5, 8, minute))

const rounds = new Map([["round-1", { id: "round-1", roundNo: "DPR-20261105-0001", executionDate: day(5), isActive: true }]])

function fakeDb(batches: FakeBatch[], requests: FakeRequest[], attachments: FakeAttachment[] = []) {
  const calls = { batchFindMany: [] as Array<{ skip?: number; take?: number; orderBy?: unknown }>, requestCount: [] as unknown[] }
  const requestsOf = (batchId: string) => requests
    .filter((request) => request.batchId === batchId && request.isActive)
    .sort((a, b) => a.disposalNo.localeCompare(b.disposalNo))
  const activeAttachments = (module: string, ids: string[]) =>
    attachments.filter((row) => row.isActive !== false && row.module === module && ids.includes(row.referenceId))
  const db = {
    disposalBatch: {
      async findMany(args: { skip?: number; take?: number; orderBy?: unknown }) {
        calls.batchFindMany.push(args)
        const active = batches
          .filter((batch) => batch.isActive)
          .sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime() || b.batchNo.localeCompare(a.batchNo))
        return active.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? active.length)).map((batch) => ({
          ...batch,
          disposalRequests: requestsOf(batch.id).map((request) => ({ requestStatus: request.requestStatus, asset: { name: request.asset.name } })),
        }))
      },
      async count() {
        return batches.filter((batch) => batch.isActive).length
      },
      async findFirst(args: { where: { id: string } }) {
        const batch = batches.find((candidate) => candidate.id === args.where.id && candidate.isActive)
        if (!batch) return null
        return {
          ...batch,
          disposalRequests: requestsOf(batch.id).map((request) => ({
            id: request.id,
            disposalNo: request.disposalNo,
            batchId: request.batchId,
            requestStatus: request.requestStatus,
            roundId: request.roundId,
            asset: request.asset,
            round: request.roundId ? rounds.get(request.roundId) ?? null : null,
          })),
        }
      },
    },
    disposalRequest: {
      async count(args: { where: { requestStatus?: string } }) {
        calls.requestCount.push(args)
        const activeBatchIds = new Set(batches.filter((batch) => batch.isActive).map((batch) => batch.id))
        return requests.filter((request) =>
          request.isActive && activeBatchIds.has(request.batchId) && (!args.where.requestStatus || request.requestStatus === args.where.requestStatus),
        ).length
      },
      async findFirst() {
        return null
      },
      // The round service's candidate read (getDisposalRoundTickBlocks).
      async findMany(args: { where: { id: { in: string[] } } }) {
        return requests.filter((request) => args.where.id.in.includes(request.id)).map((request) => ({
          id: request.id,
          disposalNo: request.disposalNo,
          disposalType: "sell",
          isActive: request.isActive,
          requestStatus: request.requestStatus,
          requestedById: "emp-requester",
          createdBy: "user-requester",
          approverId: request.approverId,
          assetId: `asset-${request.id}`,
          batchId: request.batchId,
          reason: "เครื่องเสียซ่อมไม่ได้",
          completedAt: null,
          asset: { assetTag: request.asset.assetTag, name: request.asset.name, statusId: "s1", status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" } },
          approver: request.approverId ? { code: request.approverId, fullNameTh: "ผู้อนุมัติ" } : null,
        }))
      },
    },
    attachment: {
      async findMany(args: { where: { module: string; referenceId: { in: string[] } } }) {
        return activeAttachments(args.where.module, args.where.referenceId.in)
          .map(({ id, referenceId, fileType, uploadedAt }) => ({ id, referenceId, originalName: `${id}.file`, fileType, uploadedAt }))
      },
      async groupBy(args: { where: { module: string; referenceId: { in: string[] } } }) {
        const rows = activeAttachments(args.where.module, args.where.referenceId.in)
        const ids = [...new Set(rows.map((row) => row.referenceId))]
        return ids.map((referenceId) => ({ referenceId, _count: { _all: rows.filter((row) => row.referenceId === referenceId).length } }))
      },
    },
    systemSetting: {
      // No saved settings: segregation of duties is on by default.
      async findMany() {
        return []
      },
    },
  }
  return { db: db as unknown as Parameters<typeof readDisposalBatch>[0], calls }
}

const batch = (id: string, overrides: Partial<FakeBatch> = {}): FakeBatch => ({
  id,
  batchNo: `DPB-2026110${id}-0001`,
  disposalType: "sell",
  reason: "เครื่องเก่าเสียซ่อมไม่คุ้ม",
  requestDate: day(5),
  isActive: true,
  requestedBy: { code: "E001", fullNameTh: "ผู้ขอ" },
  approver: { code: "A001", fullNameTh: "ผู้อนุมัติ" },
  ...overrides,
})

const request = (id: string, batchId: string, disposalNo: string, overrides: Partial<FakeRequest> = {}): FakeRequest => ({
  id,
  batchId,
  disposalNo,
  requestStatus: "pending",
  roundId: null,
  isActive: true,
  approverId: "emp-approver",
  asset: { assetTag: `TAG-${id}`, name: "Monitor", serialNumber: `SN-${id}` },
  ...overrides,
})

const actor: DisposalRoundActor = { userId: "user-officer", employeeId: "emp-officer", roles: ["asset_officer"], permissions: ["disposal:edit"] }

test("readDisposalBatch: a batch with only the lot photo gives every machine ownPhotoId null", async () => {
  const { db } = fakeDb(
    [batch("1")],
    [request("a", "1", "DP-1"), request("b", "1", "DP-2")],
    [{ id: "lot", module: "disposal_batch", referenceId: "1", fileType: "image/jpeg", uploadedAt: at(1) }],
  )
  const detail = await readDisposalBatch(db, "1", null)
  assert.ok(detail)
  assert.deepEqual(detail.machines.map((machine) => machine.ownPhotoId), [null, null])
  assert.equal(detail.lotPhotos.length, 1)
  assert.equal(detail.lotPhotos[0].id, "lot")
})

test("readDisposalBatch: a machine's own JPEG is its ownPhotoId, a HEIC is skipped", async () => {
  const { db } = fakeDb(
    [batch("1")],
    [request("a", "1", "DP-1"), request("b", "1", "DP-2")],
    [
      { id: "heic", module: "disposal", referenceId: "a", fileType: "image/heic", uploadedAt: at(1) },
      { id: "jpeg", module: "disposal", referenceId: "a", fileType: "image/jpeg", uploadedAt: at(2) },
      { id: "lot", module: "disposal_batch", referenceId: "1", fileType: "image/jpeg", uploadedAt: at(0) },
    ],
  )
  const detail = await readDisposalBatch(db, "1", null)
  assert.ok(detail)
  assert.equal(detail.machines[0].ownPhotoId, "jpeg")
  assert.equal(detail.machines[1].ownPhotoId, null)
  assert.deepEqual(detail.lotPhotos.map((photo) => photo.id), ["lot"])
})

test("readDisposalBatch: counts by stage and a disposed machine carries its round", async () => {
  const { db } = fakeDb(
    [batch("1")],
    [
      request("a", "1", "DP-1"),
      request("b", "1", "DP-2", { requestStatus: "approved" }),
      request("c", "1", "DP-3", { requestStatus: "disposed", roundId: "round-1" }),
      request("d", "1", "DP-4", { requestStatus: "rejected" }),
    ],
  )
  const detail = await readDisposalBatch(db, "1", null)
  assert.ok(detail)
  assert.deepEqual(detail.counts, { pending: 1, approved: 1, disposed: 1, rejected: 1, total: 4 })
  const disposed = detail.machines.find((machine) => machine.requestStatus === "disposed")
  assert.equal(disposed?.round?.roundNo, "DPR-20261105-0001")
  assert.deepEqual(disposed?.round, { id: "round-1", roundNo: "DPR-20261105-0001", executionDate: day(5) })
  assert.equal(detail.machines.find((machine) => machine.requestId === "a")?.round, null)
})

test("readDisposalBatch: roundCandidates splits joinable and blocked", async () => {
  const { db } = fakeDb(
    [batch("1")],
    [
      request("a", "1", "DP-1", { requestStatus: "approved" }),
      // The viewer approved b: segregation of duties keeps them from recording it.
      request("b", "1", "DP-2", { requestStatus: "approved", approverId: "emp-officer" }),
      request("c", "1", "DP-3", { requestStatus: "approved", roundId: "round-1" }),
      request("d", "1", "DP-4"),
    ],
    [{ id: "lot", module: "disposal_batch", referenceId: "1", fileType: "image/jpeg", uploadedAt: at(1) }],
  )
  const detail = await readDisposalBatch(db, "1", actor)
  assert.ok(detail)
  assert.deepEqual(detail.roundCandidates, { joinableIds: ["a"], blocked: [{ requestId: "b", code: "DISPOSAL_SOD_CONFLICT" }] })
})

test("readDisposalBatch: a viewer without disposal:edit gets no candidates", async () => {
  const { db } = fakeDb(
    [batch("1")],
    [request("a", "1", "DP-1", { requestStatus: "approved" }), request("b", "1", "DP-2", { requestStatus: "approved" })],
    [{ id: "lot", module: "disposal_batch", referenceId: "1", fileType: "image/jpeg", uploadedAt: at(1) }],
  )
  const detail = await readDisposalBatch(db, "1", null)
  assert.ok(detail)
  assert.deepEqual(detail.roundCandidates, { joinableIds: [], blocked: [] })
})

test("readDisposalBatch: serialNumber null stays null and the title follows buildDisposalRoundTitle", async () => {
  const { db } = fakeDb(
    [batch("1")],
    [request("a", "1", "DP-1", { asset: { assetTag: "TAG-a", name: "Monitor", serialNumber: null } }), request("b", "1", "DP-2")],
  )
  const detail = await readDisposalBatch(db, "1", null)
  assert.ok(detail)
  assert.equal(detail.machines[0].serialNumber, null)
  assert.equal(detail.machines[1].serialNumber, "SN-b")
  assert.equal(detail.batch.title, "Monitor 2 เครื่อง")
  assert.equal(detail.batch.requestedByName, "E001 - ผู้ขอ")
  assert.equal(detail.batch.approverName, "A001 - ผู้อนุมัติ")
})

test("readDisposalBatch: an unknown or inactive batch is null", async () => {
  const { db } = fakeDb([batch("1", { isActive: false })], [request("a", "1", "DP-1")])
  assert.equal(await readDisposalBatch(db, "1", null), null)
  assert.equal(await readDisposalBatch(db, "nope", null), null)
})

test("readDisposalBatchList: newest first, the strip sums every batch's requests", async () => {
  const { db, calls } = fakeDb(
    [batch("1", { requestDate: day(3) }), batch("2", { requestDate: day(5), batchNo: "DPB-20261105-0002" })],
    [
      request("a", "1", "DP-1", { requestStatus: "disposed", roundId: "round-1" }),
      request("b", "1", "DP-2", { requestStatus: "approved", asset: { assetTag: "TAG-b", name: "Printer", serialNumber: null } }),
      request("c", "2", "DP-3"),
      request("d", "2", "DP-4", { requestStatus: "rejected" }),
      request("e", "2", "DP-5", { isActive: false }),
    ],
  )
  const list = await readDisposalBatchList(db, { search: "", page: 1, pageSize: 25 })
  assert.equal(list.total, 2)
  assert.deepEqual(list.rows.map((row) => row.id), ["2", "1"])
  assert.deepEqual(calls.batchFindMany[0].orderBy, [{ requestDate: "desc" }, { batchNo: "desc" }])
  assert.deepEqual(list.rows[1], {
    id: "1",
    batchNo: "DPB-20261101-0001",
    title: "Monitor และอีก 1 รายการ",
    machineCount: 2,
    disposalType: "sell",
    requestedByName: "E001 - ผู้ขอ",
    requestDate: day(3),
    counts: { pending: 0, approved: 1, disposed: 1, rejected: 0, total: 2 },
  })
  assert.deepEqual(list.strip, { pending: 1, approved: 1, disposed: 1, rejected: 1, total: 4, batches: 2 })
})

test("readDisposalBatchList: page 2 of 25 skips 25", async () => {
  const { db, calls } = fakeDb([batch("1")], [])
  await readDisposalBatchList(db, { search: "", page: 2, pageSize: 25 })
  assert.equal(calls.batchFindMany[0].skip, 25)
  assert.equal(calls.batchFindMany[0].take, 25)
})

test("disposalBatchListWhere searches the batch number, the machines' tag or name and the requester", () => {
  assert.deepEqual(disposalBatchListWhere("  "), { isActive: true })
  const where = disposalBatchListWhere(" DPB-2026 ")
  assert.equal(where.isActive, true)
  assert.ok(where.OR?.some((entry) => JSON.stringify(entry) === JSON.stringify({ batchNo: { contains: "DPB-2026" } })))
  const text = JSON.stringify(where)
  assert.match(text, /"assetTag":\{"contains":"DPB-2026"\}/)
  assert.match(text, /"name":\{"contains":"DPB-2026"\}/)
  assert.match(text, /"requestedBy":\{"OR":\[\{"code":\{"contains":"DPB-2026"\}\},\{"fullNameTh":\{"contains":"DPB-2026"\}\}\]\}/)
})
