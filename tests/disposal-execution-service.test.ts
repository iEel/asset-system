import assert from "node:assert/strict"
import test from "node:test"
import type { Prisma } from "@prisma/client"

import {
  DisposalExecutionServiceError,
  executeDisposalRequest,
  type DisposalExecutionCommand,
} from "../src/lib/disposal-execution-service.ts"

type FakeState = {
  request: ReturnType<typeof makeCandidate>
  itemEvidenceCount: number
  batchEvidenceCount: number
  assetStatusId: string
  movements: Array<Record<string, unknown>>
  logs: Array<Record<string, unknown>>
}

const baseCommand: DisposalExecutionCommand = {
  requestId: "request-1",
  actor: {
    userId: "user-executor",
    employeeId: "employee-actor",
    roles: ["asset_admin"],
    permissions: ["disposal:edit"],
  },
  input: {
    disposalType: "destroy",
    executionDate: new Date("2026-07-13T00:00:00.000Z"),
    executedById: "employee-executor",
    nextStatusId: "status-disposed",
    recipientName: null,
    documentNo: "DOC-001",
    useHistoricalEvidenceException: false,
    evidenceExceptionReason: null,
    evidenceExceptionAcknowledged: false,
    actualSaleValue: null,
    actualSalvageValue: null,
    executionRemark: "Destroyed under approved process",
  },
}

test("revalidates the approved stage inside the serializable transaction", async () => {
  const state = makeState()
  state.request.requestStatus = "disposed"
  const database = makeDatabase(state)

  await assert.rejects(
    executeDisposalRequest(baseCommand, { database, batchSchemaReadiness: "absent" }),
    hasServiceCode("DISPOSAL_INVALID_STAGE"),
  )
  assert.equal(state.movements.length, 0)
  assert.equal(state.logs.length, 0)
})

test("revalidates active evidence before granting the historical exception", async () => {
  const state = makeState({ itemEvidenceCount: 1 })
  const database = makeDatabase(state)

  await assert.rejects(
    executeDisposalRequest(historicalCommand(), { database, batchSchemaReadiness: "absent" }),
    hasServiceCode("DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE"),
  )
  assert.equal(state.request.requestStatus, "approved")
})

test("returns a stable concurrency conflict when the guarded request update loses the race", async () => {
  const state = makeState()
  const database = makeDatabase(state, { forceRequestConflict: true })

  await assert.rejects(
    executeDisposalRequest(baseCommand, { database, batchSchemaReadiness: "absent" }),
    hasServiceCode("DISPOSAL_CONCURRENT_UPDATE"),
  )
  assert.equal(state.request.requestStatus, "approved")
  assert.equal(state.movements.length, 0)
  assert.equal(state.logs.length, 0)
})

test("persists exception metadata and one historical audit action atomically", async () => {
  const state = makeState({ itemEvidenceCount: 0 })
  const database = makeDatabase(state)

  const result = await executeDisposalRequest(historicalCommand(), {
    database,
    batchSchemaReadiness: "absent",
    now: () => new Date("2026-07-13T08:30:00.000Z"),
  })

  assert.equal(result.request.requestStatus, "disposed")
  assert.equal(state.request.evidenceExceptionGrantedBy, "user-executor")
  assert.equal(state.request.evidenceExceptionGrantedAt?.toISOString(), "2026-07-13T08:30:00.000Z")
  assert.match(state.request.evidenceExceptionReason ?? "", /ไม่มีหลักฐาน/)
  assert.equal(state.movements.length, 1)
  assert.equal(state.logs.length, 1)
  assert.equal(state.logs[0].action, "execute_historical_without_evidence")
  assert.equal(database.isolationLevel, "Serializable")
})

test("rolls back request, asset, movement, and metadata when audit persistence fails", async () => {
  const state = makeState({ itemEvidenceCount: 0 })
  const database = makeDatabase(state, { failAudit: true })

  await assert.rejects(
    executeDisposalRequest(historicalCommand(), { database, batchSchemaReadiness: "absent" }),
    /audit unavailable/,
  )
  assert.equal(state.request.requestStatus, "approved")
  assert.equal(state.request.evidenceExceptionReason, null)
  assert.equal(state.assetStatusId, "status-pending")
  assert.equal(state.movements.length, 0)
  assert.equal(state.logs.length, 0)
})

test("fails closed without opening a transaction when batch schema readiness is unknown", async () => {
  const state = makeState({ itemEvidenceCount: 0 })
  const database = makeDatabase(state)

  await assert.rejects(
    executeDisposalRequest(historicalCommand(), { database, batchSchemaReadiness: "unknown" }),
    hasServiceCode("DISPOSAL_BATCH_SCHEMA_CHECK_FAILED"),
  )
  assert.equal(database.transactionCalls, 0)
})

function historicalCommand(): DisposalExecutionCommand {
  return {
    ...baseCommand,
    actor: { ...baseCommand.actor, roles: ["system_admin"] },
    input: {
      ...baseCommand.input,
      documentNo: null,
      useHistoricalEvidenceException: true,
      evidenceExceptionReason: "ทรัพย์สินถูกตัดจำหน่ายจริงในอดีตและไม่มีหลักฐานหลงเหลือ",
      evidenceExceptionAcknowledged: true,
    },
  }
}

function makeCandidate() {
  return {
    id: "request-1",
    disposalNo: "DP-20260713-0001",
    isActive: true,
    requestStatus: "approved",
    requestedById: "employee-requester",
    createdBy: "user-requester",
    approverId: "employee-approver",
    assetId: "asset-1",
    reason: "Asset was approved for disposal",
    disposalType: "destroy",
    batchId: null as string | null,
    executionDate: null as Date | null,
    executedById: null as string | null,
    recipientName: null as string | null,
    documentNo: null as string | null,
    actualSaleValue: null as number | null,
    actualSalvageValue: null as number | null,
    executionRemark: null as string | null,
    evidenceExceptionReason: null as string | null,
    evidenceExceptionGrantedBy: null as string | null,
    evidenceExceptionGrantedAt: null as Date | null,
    completedAt: null as Date | null,
    asset: {
      assetTag: "IT-001",
      statusId: "status-pending",
      status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" },
    },
  }
}

function makeState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    request: makeCandidate(),
    itemEvidenceCount: 1,
    batchEvidenceCount: 0,
    assetStatusId: "status-pending",
    movements: [],
    logs: [],
    ...overrides,
  }
}

function makeDatabase(
  state: FakeState,
  options: { forceRequestConflict?: boolean; failAudit?: boolean } = {},
) {
  const database = {
    transactionCalls: 0,
    isolationLevel: "",
    async $transaction<T>(
      callback: (transaction: Prisma.TransactionClient) => Promise<T>,
      transactionOptions?: { isolationLevel?: Prisma.TransactionIsolationLevel },
    ) {
      database.transactionCalls += 1
      database.isolationLevel = transactionOptions?.isolationLevel ?? ""
      const draft = structuredClone(state)
      const transaction = makeTransaction(draft, options)
      const result = await callback(transaction as unknown as Prisma.TransactionClient)
      Object.assign(state, draft)
      return result
    },
  }
  return database
}

function makeTransaction(state: FakeState, options: { forceRequestConflict?: boolean; failAudit?: boolean }) {
  return {
    disposalRequest: {
      async findUnique() {
        return structuredClone(state.request)
      },
      async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
        if (options.forceRequestConflict) return { count: 0 }
        if (where.id !== state.request.id || where.requestStatus !== state.request.requestStatus || !state.request.isActive) {
          return { count: 0 }
        }
        Object.assign(state.request, data)
        return { count: 1 }
      },
      async findUniqueOrThrow() {
        return structuredClone(state.request)
      },
      async findMany() {
        return [{ requestStatus: state.request.requestStatus }]
      },
    },
    systemSetting: {
      async findMany() {
        return []
      },
    },
    assetStatus: {
      async findFirst({ where }: { where: { id: string } }) {
        return where.id === "status-disposed"
          ? { id: "status-disposed", name: "Disposed", nameTh: "ตัดจำหน่ายแล้ว" }
          : null
      },
    },
    employee: {
      async findFirst({ where }: { where: { id: string } }) {
        return where.id === "employee-executor" ? { id: where.id } : null
      },
    },
    attachment: {
      async count({ where }: { where: { module: string } }) {
        return where.module === "disposal" ? state.itemEvidenceCount : state.batchEvidenceCount
      },
    },
    asset: {
      async updateMany({ where, data }: { where: { id: string; statusId: string }; data: { statusId: string } }) {
        if (where.id !== state.request.assetId || where.statusId !== state.assetStatusId) return { count: 0 }
        state.assetStatusId = data.statusId
        return { count: 1 }
      },
    },
    assetMovement: {
      async create({ data }: { data: Record<string, unknown> }) {
        state.movements.push(data)
        return data
      },
    },
    disposalBatch: {
      async update() {
        return null
      },
    },
    systemLog: {
      async create({ data }: { data: Record<string, unknown> }) {
        if (options.failAudit) throw new Error("audit unavailable")
        state.logs.push(data)
        return data
      },
    },
  }
}

function hasServiceCode(code: string) {
  return (error: unknown) => error instanceof DisposalExecutionServiceError && error.code === code
}
