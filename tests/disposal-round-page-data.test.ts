import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDisposalRoundTitle,
  readDisposalRound,
  readDisposalRoundList,
  type DisposalRoundPageDb,
} from "../src/lib/disposal-round-page-data.ts"

// Group 6 plan 4 Task 4 (spec §11.3–11.4): the round list and the round page read through a fake db.

type FakeRequest = {
  id: string
  roundId: string
  disposalNo: string
  isActive: boolean
  batchId: string | null
  asset: { assetTag: string; name: string; serialNumber: string | null }
  approver: { code: string; fullNameTh: string } | null
}

type FakeRound = {
  id: string
  roundNo: string
  disposalType: string
  executionDate: Date
  recipientName: string | null
  documentNo: string
  saleValue: number | null
  remark: string | null
  createdBy: string
  createdAt: Date
  isActive: boolean
  executedBy: { code: string; fullNameTh: string }
}

type FakeAttachment = { id: string; module: string; referenceId: string; originalName: string; fileType: string; uploadedAt: Date; isActive: boolean }

const day = (value: number) => new Date(Date.UTC(2026, 10, value))

function fakeDb(rounds: FakeRound[], requests: FakeRequest[], attachments: FakeAttachment[] = []) {
  const calls = { roundFindMany: [] as unknown[], roundCount: [] as unknown[] }
  const requestsOf = (roundId: string) => requests
    .filter((request) => request.roundId === roundId && request.isActive)
    .sort((a, b) => a.disposalNo.localeCompare(b.disposalNo))
  const db: DisposalRoundPageDb = {
    disposalRound: {
      async findMany(args: { skip?: number; take?: number }) {
        calls.roundFindMany.push(args)
        const active = rounds.filter((round) => round.isActive).sort((a, b) => b.executionDate.getTime() - a.executionDate.getTime())
        return active.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? active.length)).map((round) => ({
          ...round,
          disposalRequests: requestsOf(round.id).map((request) => ({ asset: { name: request.asset.name } })),
        }))
      },
      async count(args: unknown) {
        calls.roundCount.push(args)
        return rounds.filter((round) => round.isActive).length
      },
      async findFirst(args: { where: { id: string } }) {
        const round = rounds.find((candidate) => candidate.id === args.where.id && candidate.isActive)
        if (!round) return null
        return {
          ...round,
          disposalRequests: requestsOf(round.id).map((request) => ({
            id: request.id,
            disposalNo: request.disposalNo,
            batchId: request.batchId,
            asset: request.asset,
            approver: request.approver,
          })),
        }
      },
    },
    user: {
      async findUnique() {
        return { displayName: "ผู้บันทึก", username: "recorder" }
      },
    },
    attachment: {
      async findMany(args: { where: { module: string; referenceId: { in: string[] }; isActive: boolean } }) {
        return attachments
          .filter((row) => row.isActive && row.module === args.where.module && args.where.referenceId.in.includes(row.referenceId))
          .map(({ id, referenceId, originalName, fileType, uploadedAt }) => ({ id, referenceId, originalName, fileType, uploadedAt }))
      },
    },
    disposalRequest: {
      async findFirst() {
        return null
      },
      async findMany() {
        return []
      },
    },
  }
  return { db, calls }
}

const round = (id: string, overrides: Partial<FakeRound> = {}): FakeRound => ({
  id,
  roundNo: `DPR-20261105-000${id}`,
  disposalType: "sell",
  executionDate: day(5),
  recipientName: "บริษัทรับซื้อ",
  documentNo: "DOC-1",
  saleValue: 1500,
  remark: null,
  createdBy: "user-1",
  createdAt: day(5),
  isActive: true,
  executedBy: { code: "E001", fullNameTh: "ผู้ดำเนินการ" },
  ...overrides,
})

const request = (id: string, roundId: string, disposalNo: string, name: string, overrides: Partial<FakeRequest> = {}): FakeRequest => ({
  id,
  roundId,
  disposalNo,
  isActive: true,
  batchId: null,
  asset: { assetTag: `TAG-${id}`, name, serialNumber: `SN-${id}` },
  approver: { code: "A001", fullNameTh: "ผู้อนุมัติ" },
  ...overrides,
})

test("the title reads '{name} {n} เครื่อง' when every name is the same", () => {
  assert.equal(buildDisposalRoundTitle(["Monitor LG", "Monitor LG"]), "Monitor LG 2 เครื่อง")
  assert.equal(buildDisposalRoundTitle(["Monitor LG"]), "Monitor LG 1 เครื่อง")
})

test("the title reads '{first name} และอีก {n-1} รายการ' for mixed names", () => {
  assert.equal(buildDisposalRoundTitle(["Monitor LG", "Printer Epson", "Monitor LG"]), "Monitor LG และอีก 2 รายการ")
})

test("the title takes other words (the page's locale)", () => {
  const words = { same: (name: string, count: number) => `${name} x${count}`, mixed: (name: string, rest: number) => `${name} +${rest}` }
  assert.equal(buildDisposalRoundTitle(["A", "A"], words), "A x2")
  assert.equal(buildDisposalRoundTitle(["A", "B"], words), "A +1")
})

test("readDisposalRoundList answers each round's title, machine count and facts, with the total", async () => {
  const { db, calls } = fakeDb(
    [round("1"), round("2", { disposalType: "donate", saleValue: null, executionDate: day(4) })],
    [
      request("a", "1", "DP-2", "Monitor LG"),
      request("b", "1", "DP-1", "Monitor LG"),
      request("c", "2", "DP-4", "Printer Epson"),
      request("d", "2", "DP-3", "Scanner Canon"),
      request("gone", "2", "DP-5", "Scanner Canon", { isActive: false }),
    ],
  )
  const result = await readDisposalRoundList(db, { search: "", page: 1, pageSize: 25 })
  assert.equal(result.total, 2)
  assert.deepEqual(result.rows.map((row) => [row.roundNo, row.title, row.machineCount, row.disposalType, row.saleValue]), [
    ["DPR-20261105-0001", "Monitor LG 2 เครื่อง", 2, "sell", 1500],
    ["DPR-20261105-0002", "Scanner Canon และอีก 1 รายการ", 2, "donate", null],
  ])
  assert.equal(result.rows[0].recipientName, "บริษัทรับซื้อ")
  assert.deepEqual(result.rows[0].executionDate, day(5))
  assert.deepEqual(calls.roundFindMany[0], { ...(calls.roundFindMany[0] as object), skip: 0, take: 25 })
})

test("readDisposalRoundList searches the number, document, buyer and asset", async () => {
  const { db, calls } = fakeDb([round("1")], [])
  await readDisposalRoundList(db, { search: "  LG  ", page: 2, pageSize: 50 })
  const args = calls.roundFindMany[0] as { where: { OR?: unknown[] }; skip: number; take: number }
  assert.equal(args.skip, 50)
  assert.equal(args.take, 50)
  const text = JSON.stringify(args.where)
  for (const field of ["roundNo", "documentNo", "recipientName", "assetTag", "name"]) assert.match(text, new RegExp(`"${field}":\\{"contains":"LG"\\}`), field)
  assert.deepEqual((calls.roundCount[0] as { where: unknown }).where, args.where)
})

test("readDisposalRound lists machines in disposalNo order with the first photo from listDisposalPhotos", async () => {
  const { db } = fakeDb(
    [round("1")],
    [
      request("b", "1", "DP-2", "Monitor LG", { batchId: "batch-1" }),
      request("a", "1", "DP-1", "Monitor LG", { approver: null }),
      request("c", "1", "DP-3", "Monitor LG"),
    ],
    [
      { id: "pdf", module: "disposal", referenceId: "a", originalName: "a.pdf", fileType: "application/pdf", uploadedAt: day(1), isActive: true },
      { id: "a-late", module: "disposal", referenceId: "a", originalName: "a2.jpg", fileType: "image/jpeg", uploadedAt: day(3), isActive: true },
      { id: "a-early", module: "disposal", referenceId: "a", originalName: "a1.png", fileType: "image/png", uploadedAt: day(2), isActive: true },
      { id: "batch-photo", module: "disposal_batch", referenceId: "batch-1", originalName: "b.webp", fileType: "image/webp", uploadedAt: day(2), isActive: true },
    ],
  )
  const result = await readDisposalRound(db, "1")
  assert.ok(result)
  assert.equal(result.round.roundNo, "DPR-20261105-0001")
  assert.equal(result.round.title, "Monitor LG 3 เครื่อง")
  assert.equal(result.round.recordedByName, "ผู้บันทึก")
  assert.deepEqual(result.machines.map((machine) => [machine.disposalNo, machine.firstPhotoId, machine.approverName]), [
    ["DP-1", "a-early", null],
    ["DP-2", "batch-photo", "A001 - ผู้อนุมัติ"],
    ["DP-3", null, "A001 - ผู้อนุมัติ"],
  ])
  assert.deepEqual(result.machines[0], {
    requestId: "a",
    disposalNo: "DP-1",
    assetTag: "TAG-a",
    assetName: "Monitor LG",
    serialNumber: "SN-a",
    approverName: null,
    firstPhotoId: "a-early",
  })
})

test("readDisposalRound answers null for a missing round", async () => {
  const { db } = fakeDb([], [])
  assert.equal(await readDisposalRound(db, "nope"), null)
})
