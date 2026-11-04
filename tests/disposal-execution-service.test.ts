import assert from "node:assert/strict"
import test from "node:test"
import type { Prisma } from "@prisma/client"

import {
  DisposalExecutionServiceError,
  executeDisposalRequestInTransaction,
  hasDisposalExecutionPermission,
  isPrismaWriteConflict,
  type DisposalExecutionCandidate,
  type DisposalRoundExecution,
  type DisposalRoundExecutionTarget,
} from "../src/lib/disposal-execution-service.ts"

// The single-request execution is retired (group 6 plan 4, P4-R1): only a disposal round executes requests, through
// executeDisposalRequestInTransaction inside the round's transaction. These tests drive the helper with a recording tx.

const actor = { userId: "user-executor", employeeId: "employee-actor", roles: ["asset_admin"], permissions: ["disposal:edit"] }
const now = new Date("2026-11-05T03:00:00.000Z")

const round: DisposalRoundExecutionTarget = {
  id: "round-1",
  roundNo: "DPR-20261105-0001",
  disposalType: "destroy",
  executionDate: new Date("2026-11-04T00:00:00.000Z"),
  executedById: "employee-executor",
  recipientName: null,
  documentNo: "DOC-001",
  remark: "ทุบทำลายตามขั้นตอน",
  disposedStatusId: "status-disposed",
}

function candidate(index: number, overrides: Partial<DisposalExecutionCandidate> = {}): DisposalExecutionCandidate {
  return {
    id: `request-${index}`,
    disposalNo: `DP-20261101-000${index}`,
    disposalType: "donate",
    isActive: true,
    requestStatus: "approved",
    requestedById: "employee-requester",
    createdBy: "user-requester",
    approverId: "employee-approver",
    assetId: `asset-${index}`,
    batchId: null,
    reason: "เครื่องเสื่อมสภาพ",
    completedAt: null,
    asset: { assetTag: `IT-00${index}`, name: `Monitor ${index}`, statusId: "status-pending", status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" } },
    ...overrides,
  }
}

function execution(index: number, effectiveEvidenceCount = 1, overrides: Partial<DisposalExecutionCandidate> = {}): DisposalRoundExecution {
  return { candidate: candidate(index, overrides), effectiveEvidenceCount }
}

function recordingTx(options: { requestCount?: (ids: string[]) => number; assetCount?: (ids: string[]) => number; children?: Array<{ batchId: string; requestStatus: string }> } = {}) {
  const calls: Array<{ call: string; args: Record<string, unknown> }> = []
  const record = (call: string) => async (args: Record<string, unknown>) => {
    calls.push({ call, args })
    if (call === "disposalRequest.updateMany") {
      const ids = ((args.where as { id: { in: string[] } }).id.in)
      return { count: options.requestCount ? options.requestCount(ids) : ids.length }
    }
    if (call === "asset.updateMany") {
      const ids = ((args.where as { id: { in: string[] } }).id.in)
      return { count: options.assetCount ? options.assetCount(ids) : ids.length }
    }
    if (call === "disposalRequest.findMany") return options.children ?? []
    if (call.endsWith("createMany")) return { count: (args.data as unknown[]).length }
    return { count: 0 }
  }
  const tx = {
    disposalRequest: { updateMany: record("disposalRequest.updateMany"), findMany: record("disposalRequest.findMany") },
    asset: { updateMany: record("asset.updateMany") },
    assetMovement: { createMany: record("assetMovement.createMany") },
    maintenancePlan: { updateMany: record("maintenancePlan.updateMany") },
    disposalBatch: { update: record("disposalBatch.update") },
    systemLog: { createMany: record("systemLog.createMany") },
  }
  return { tx: tx as unknown as Prisma.TransactionClient, calls }
}

test("executes every request of the round with one statement per table", async () => {
  const { tx, calls } = recordingTx()

  await executeDisposalRequestInTransaction(tx, [execution(1), execution(2)], round, actor, now)

  assert.deepEqual(calls.map((entry) => entry.call), [
    "disposalRequest.updateMany",
    "asset.updateMany",
    "assetMovement.createMany",
    "maintenancePlan.updateMany",
    "systemLog.createMany",
  ])
  const [requests, assets, movements, plans, audits] = calls.map((entry) => entry.args)
  assert.deepEqual(requests.where, { id: { in: ["request-1", "request-2"] }, requestStatus: "approved", isActive: true })
  assert.deepEqual(requests.data, {
    requestStatus: "disposed",
    disposalType: "destroy",
    roundId: "round-1",
    executionDate: new Date("2026-11-04T00:00:00.000Z"),
    executedById: "employee-executor",
    recipientName: null,
    documentNo: "DOC-001",
    actualSaleValue: null,
    executionRemark: "ทุบทำลายตามขั้นตอน",
    completedAt: now,
    updatedBy: "user-executor",
    evidenceExceptionReason: null,
    evidenceExceptionGrantedBy: null,
    evidenceExceptionGrantedAt: null,
  })
  assert.deepEqual(assets, {
    where: { id: { in: ["asset-1", "asset-2"] }, isActive: true, statusId: { in: ["status-pending"] } },
    data: { statusId: "status-disposed", updatedBy: "user-executor" },
  })
  assert.deepEqual((movements.data as Array<Record<string, unknown>>)[0], {
    assetId: "asset-1",
    movementType: "disposal_execute",
    fromValue: "status-pending",
    toValue: "status-disposed",
    reason: "ทุบทำลายตามขั้นตอน",
    referenceType: "disposal",
    referenceId: "request-1",
    performedBy: "user-executor",
    performedAt: new Date("2026-11-04T00:00:00.000Z"),
    remark: "round=DPR-20261105-0001",
  })
  // A disposed asset needs no more PM reminders.
  assert.deepEqual(plans, {
    where: { assetId: { in: ["asset-1", "asset-2"] }, planState: { not: "ended" } },
    data: { planState: "ended", isActive: false, updatedBy: "user-executor" },
  })
  const auditRows = audits.data as Array<Record<string, unknown>>
  assert.deepEqual(auditRows.map((row) => [row.action, row.module, row.recordId]), [
    ["execute", "disposal", "request-1"],
    ["execute", "disposal", "request-2"],
  ])
  const newValue = JSON.parse(String(auditRows[0].newValue))
  assert.equal(newValue.fromDisposalType, "donate")
  assert.equal(newValue.disposalType, "destroy")
  assert.equal(newValue.roundNo, "DPR-20261105-0001")
})

test("the evidence exception is granted only to the requests without evidence, and logged as such", async () => {
  const { tx, calls } = recordingTx()

  await executeDisposalRequestInTransaction(
    tx,
    [execution(1, 2), execution(2, 0)],
    { ...round, evidenceException: { reason: "ทรัพย์สินถูกตัดจำหน่ายจริงในอดีตและไม่มีหลักฐานหลงเหลือ" } },
    actor,
    now,
  )

  const updates = calls.filter((entry) => entry.call === "disposalRequest.updateMany").map((entry) => entry.args)
  assert.equal(updates.length, 2)
  assert.deepEqual((updates[0].where as { id: unknown }).id, { in: ["request-1"] })
  assert.equal((updates[0].data as Record<string, unknown>).evidenceExceptionReason, null)
  assert.deepEqual((updates[1].where as { id: unknown }).id, { in: ["request-2"] })
  assert.equal((updates[1].data as Record<string, unknown>).evidenceExceptionReason, "ทรัพย์สินถูกตัดจำหน่ายจริงในอดีตและไม่มีหลักฐานหลงเหลือ")
  assert.equal((updates[1].data as Record<string, unknown>).evidenceExceptionGrantedBy, "user-executor")
  assert.deepEqual((updates[1].data as Record<string, unknown>).evidenceExceptionGrantedAt, now)
  const audits = calls.find((entry) => entry.call === "systemLog.createMany")!.args.data as Array<Record<string, unknown>>
  assert.deepEqual(audits.map((row) => row.action), ["execute", "execute_historical_without_evidence"])
})

test("a guarded request update that matches fewer rows than were checked is a concurrent update", async () => {
  const { tx, calls } = recordingTx({ requestCount: (ids) => ids.length - 1 })

  await assert.rejects(
    executeDisposalRequestInTransaction(tx, [execution(1), execution(2)], round, actor, now),
    (error: unknown) => error instanceof DisposalExecutionServiceError && error.code === "DISPOSAL_CONCURRENT_UPDATE",
  )
  assert.deepEqual(calls.map((entry) => entry.call), ["disposalRequest.updateMany"])
})

test("an asset that left Pending Disposal meanwhile is a concurrent update", async () => {
  const { tx } = recordingTx({ assetCount: (ids) => ids.length - 1 })

  await assert.rejects(
    executeDisposalRequestInTransaction(tx, [execution(1), execution(2)], round, actor, now),
    (error: unknown) => error instanceof DisposalExecutionServiceError && error.code === "DISPOSAL_CONCURRENT_UPDATE",
  )
})

test("a request batch's status follows its executed children", async () => {
  const { tx, calls } = recordingTx({
    children: [
      { batchId: "batch-1", requestStatus: "disposed" },
      { batchId: "batch-1", requestStatus: "disposed" },
    ],
  })

  await executeDisposalRequestInTransaction(tx, [execution(1, 1, { batchId: "batch-1" }), execution(2, 1, { batchId: "batch-1" })], round, actor, now)

  const batchUpdates = calls.filter((entry) => entry.call === "disposalBatch.update")
  assert.equal(batchUpdates.length, 1)
  assert.deepEqual(batchUpdates[0].args.where, { id: "batch-1" })
})

test("a long request reason fits the movement's 500 characters", async () => {
  const { tx, calls } = recordingTx()

  await executeDisposalRequestInTransaction(tx, [execution(1, 1, { reason: "ก".repeat(900) })], { ...round, remark: null }, actor, now)

  const movement = (calls.find((entry) => entry.call === "assetMovement.createMany")!.args.data as Array<Record<string, unknown>>)[0]
  assert.equal(String(movement.reason).length, 500)
})

test("only disposal:edit or a system admin may execute; P2034 is a write conflict", () => {
  assert.equal(hasDisposalExecutionPermission(actor), true)
  assert.equal(hasDisposalExecutionPermission({ ...actor, permissions: ["disposal:view"] }), false)
  assert.equal(hasDisposalExecutionPermission({ ...actor, roles: ["system_admin"], permissions: [] }), true)
  assert.equal(isPrismaWriteConflict({ code: "P2034" }), true)
  assert.equal(isPrismaWriteConflict({ code: "P2002" }), false)
})
