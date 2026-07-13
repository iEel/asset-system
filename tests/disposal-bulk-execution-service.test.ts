import assert from "node:assert/strict"
import test from "node:test"

import {
  commitDisposalBulkExecution,
  inspectDisposalBulkExecution,
  type DisposalBulkExecutionCommand,
  type DisposalBulkExecutionDatabase,
} from "../src/lib/disposal-bulk-execution-service.ts"
import { DisposalExecutionServiceError, type DisposalExecutionCommand } from "../src/lib/disposal-execution-service.ts"

type FakeRequest = ReturnType<typeof makeRequest>

type FakeState = {
  requests: FakeRequest[]
  itemEvidenceCounts: Map<string, number>
  batchEvidenceCounts: Map<string, number>
}

const baseCommand: DisposalBulkExecutionCommand = {
  actor: {
    userId: "user-executor",
    employeeId: "employee-actor",
    roles: ["asset_admin"],
    permissions: ["disposal:edit"],
  },
  input: {
    mode: "preview",
    requestIds: ["request-1"],
    executionDate: new Date("2026-07-13T00:00:00.000Z"),
    executedById: "employee-executor",
    nextStatusId: "status-disposed",
    useHistoricalEvidenceException: false,
    evidenceExceptionReason: null,
    evidenceExceptionAcknowledged: false,
  },
}

test("preview preserves input order and blocks mixed types and missing per-item fields", async () => {
  const state = makeState({
    requests: [
      makeRequest({ id: "request-1", disposalType: "sell", recipientName: "Buyer One", saleValue: 1200 }),
      makeRequest({ id: "request-2", disposalType: "destroy", executionRemark: "Destroyed by contractor" }),
      makeRequest({ id: "request-3", disposalType: "destroy", executionRemark: null }),
    ],
  })

  const response = await inspectDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, requestIds: ["request-2", "request-1", "request-3"] },
  }, { database: makeDatabase(state), batchSchemaReadiness: "ready" })

  assert.deepEqual(response.items.map((item) => item.requestId), ["request-2", "request-1", "request-3"])
  assert.deepEqual(response.items.map((item) => item.outcome), ["eligible", "blocked", "blocked"])
  assert.deepEqual(response.items.map((item) => item.code), [null, "DISPOSAL_BULK_MIXED_TYPES", "DISPOSAL_BULK_INVALID_SELECTION"])
  assert.equal(response.eligibleCount, 1)
  assert.equal(response.blockedCount, 2)
})

test("commit executes each eligible item independently with shared date executor and status", async () => {
  const state = makeState({
    requests: [
      makeRequest({ id: "request-1", executionRemark: "Destroyed under approved process" }),
      makeRequest({ id: "request-2", executionRemark: "Destroyed by contractor" }),
    ],
  })
  const database = makeDatabase(state)
  const executions: DisposalExecutionCommand[] = []

  const response = await commitDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit", requestIds: ["request-2", "request-1"] },
  }, {
    database,
    batchSchemaReadiness: "ready",
    executeDisposalRequest: async (command) => {
      executions.push(command)
    },
  })

  assert.deepEqual(response.items.map((item) => item.outcome), ["executed", "executed"])
  assert.equal(executions.length, 2)
  assert.equal(database.transactionCalls, 0)
  assert.deepEqual(executions.map((command) => command.requestId), ["request-2", "request-1"])
  assert.deepEqual(executions.map((command) => command.input.executionDate.toISOString()), [
    "2026-07-13T00:00:00.000Z",
    "2026-07-13T00:00:00.000Z",
  ])
  assert.deepEqual(executions.map((command) => command.input.executedById), ["employee-executor", "employee-executor"])
  assert.deepEqual(executions.map((command) => command.input.nextStatusId), ["status-disposed", "status-disposed"])
})

test("commit preserves each request recipient values and money fields", async () => {
  const state = makeState({
    requests: [
      makeRequest({
        id: "request-1",
        disposalType: "sell",
        recipientName: "Buyer One",
        documentNo: "SALE-001",
        saleValue: 1200.5,
        salvageValue: 100,
        executionRemark: "First sale detail",
      }),
      makeRequest({
        id: "request-2",
        disposalType: "sell",
        recipientName: "Buyer Two",
        documentNo: "SALE-002",
        saleValue: 2400,
        salvageValue: 250.75,
        executionRemark: "Second sale detail",
      }),
    ],
  })
  const executions: DisposalExecutionCommand[] = []

  await commitDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit", requestIds: ["request-1", "request-2"] },
  }, {
    database: makeDatabase(state),
    batchSchemaReadiness: "ready",
    executeDisposalRequest: async (command) => {
      executions.push(command)
    },
  })

  assert.deepEqual(executions.map((command) => command.input.recipientName), ["Buyer One", "Buyer Two"])
  assert.deepEqual(executions.map((command) => command.input.documentNo), ["SALE-001", "SALE-002"])
  assert.deepEqual(executions.map((command) => command.input.actualSaleValue), [1200.5, 2400])
  assert.deepEqual(executions.map((command) => command.input.actualSalvageValue), [100, 250.75])
  assert.deepEqual(executions.map((command) => command.input.executionRemark), ["First sale detail", "Second sale detail"])
})

test("historical mode blocks evidence rows and requires exact system_admin", async () => {
  const state = makeState({
    requests: [makeRequest({ id: "request-1" }), makeRequest({ id: "request-2" })],
    itemEvidenceCounts: new Map([["request-2", 1]]),
  })
  const historicalInput = {
    ...baseCommand.input,
    requestIds: ["request-1", "request-2"],
    useHistoricalEvidenceException: true,
    evidenceExceptionReason: "Recorded historical disposal with no surviving evidence in the legacy archive",
    evidenceExceptionAcknowledged: true,
  }

  const adminResponse = await inspectDisposalBulkExecution({
    actor: { ...baseCommand.actor, roles: ["system_admin"] },
    input: historicalInput,
  }, { database: makeDatabase(state), batchSchemaReadiness: "ready" })
  const nonAdminResponse = await inspectDisposalBulkExecution({
    actor: { ...baseCommand.actor, roles: ["system_admin_assistant"] },
    input: { ...historicalInput, requestIds: ["request-1"] },
  }, { database: makeDatabase(state), batchSchemaReadiness: "ready" })

  assert.deepEqual(adminResponse.items.map((item) => item.code), [null, "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE"])
  assert.equal(nonAdminResponse.items[0].code, "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN")
})

test("normal mode blocks rows without evidence", async () => {
  const state = makeState({ itemEvidenceCounts: new Map() })

  const response = await inspectDisposalBulkExecution(baseCommand, {
    database: makeDatabase(state),
    batchSchemaReadiness: "ready",
  })

  assert.equal(response.items[0].outcome, "blocked")
  assert.equal(response.items[0].code, "DISPOSAL_EVIDENCE_REQUIRED")
})

test("one executor failure produces partial success and retryable unresolved rows", async () => {
  const state = makeState({
    requests: [
      makeRequest({ id: "request-1", executionRemark: "Destroyed under approved process" }),
      makeRequest({ id: "request-2", executionRemark: "Destroyed by contractor" }),
    ],
  })
  const calls: string[] = []
  const errors: string[] = []
  const command: DisposalBulkExecutionCommand = {
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit", requestIds: ["request-1", "request-2"] },
  }

  const response = await commitDisposalBulkExecution(command, {
    database: makeDatabase(state),
    batchSchemaReadiness: "ready",
    logger: (message) => errors.push(message),
    executeDisposalRequest: async (execution) => {
      calls.push(execution.requestId)
      if (execution.requestId === "request-2") throw new Error("connection details must not reach the client")
    },
  })
  const retry = await commitDisposalBulkExecution({
    ...command,
    input: { ...command.input, requestIds: ["request-2"] },
  }, {
    database: makeDatabase(state),
    batchSchemaReadiness: "ready",
    executeDisposalRequest: async (execution) => {
      calls.push(`retry:${execution.requestId}`)
    },
  })

  assert.deepEqual(response.items.map((item) => item.outcome), ["executed", "failed"])
  assert.equal(response.items[1].code, "DISPOSAL_BULK_EXECUTION_FAILED")
  assert.deepEqual(calls, ["request-1", "request-2", "retry:request-2"])
  assert.equal(errors.length, 1)
  assert.deepEqual(retry.items.map((item) => item.outcome), ["executed"])
})

test("known executor rejections become blocked item results", async () => {
  const state = makeState()

  const response = await commitDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit" },
  }, {
    database: makeDatabase(state),
    batchSchemaReadiness: "ready",
    executeDisposalRequest: async () => {
      throw new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE")
    },
  })

  assert.equal(response.items[0].outcome, "blocked")
  assert.equal(response.items[0].code, "DISPOSAL_CONCURRENT_UPDATE")
})

test("already executed requests return blocked without a second executor call", async () => {
  const state = makeState({
    requests: [makeRequest({ id: "request-1", requestStatus: "disposed", completedAt: new Date("2026-07-13T01:00:00.000Z") })],
  })
  let executionCalls = 0

  const response = await commitDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit" },
  }, {
    database: makeDatabase(state),
    batchSchemaReadiness: "ready",
    executeDisposalRequest: async () => {
      executionCalls += 1
    },
  })

  assert.equal(response.items[0].outcome, "blocked")
  assert.equal(response.items[0].code, "DISPOSAL_INVALID_STAGE")
  assert.equal(executionCalls, 0)
})

test("unknown batch schema readiness fails closed for every selected row", async () => {
  const state = makeState({
    requests: [makeRequest({ id: "request-1" }), makeRequest({ id: "request-2" })],
  })
  const database = makeDatabase(state)

  const response = await commitDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit", requestIds: ["request-2", "request-1"] },
  }, { database, batchSchemaReadiness: "unknown" })

  assert.deepEqual(response.items.map((item) => item.outcome), ["blocked", "blocked"])
  assert.deepEqual(response.items.map((item) => item.code), [
    "DISPOSAL_BATCH_SCHEMA_CHECK_FAILED",
    "DISPOSAL_BATCH_SCHEMA_CHECK_FAILED",
  ])
  assert.equal(database.findManyCalls, 0)
  assert.equal(database.transactionCalls, 0)
})

function makeRequest(overrides: Partial<{
  id: string
  disposalNo: string
  disposalType: string
  isActive: boolean
  requestStatus: string
  requestedById: string
  createdBy: string
  approverId: string | null
  assetId: string
  reason: string
  recipientName: string | null
  documentNo: string | null
  saleValue: number | null
  salvageValue: number | null
  executionRemark: string | null
  batchId: string | null
  completedAt: Date | null
}> = {}) {
  return {
    id: "request-1",
    disposalNo: "DP-20260713-0001",
    disposalType: "destroy",
    isActive: true,
    requestStatus: "approved",
    requestedById: "employee-requester",
    createdBy: "user-requester",
    approverId: "employee-approver",
    assetId: "asset-1",
    reason: "Asset was approved for disposal",
    recipientName: null,
    documentNo: "DOC-001",
    saleValue: null,
    salvageValue: null,
    executionRemark: "Destroyed under approved process",
    batchId: null,
    completedAt: null,
    asset: {
      assetTag: "IT-001",
      statusId: "status-pending",
      status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" },
    },
    ...overrides,
  }
}

function makeState(overrides: Partial<FakeState> = {}): FakeState {
  const requests = overrides.requests ?? [makeRequest()]
  return {
    requests,
    itemEvidenceCounts: new Map(requests.map((request) => [request.id, 1])),
    batchEvidenceCounts: new Map(),
    ...overrides,
  }
}

function makeDatabase(state: FakeState): DisposalBulkExecutionDatabase & { findManyCalls: number; transactionCalls: number } {
  const database = {
    findManyCalls: 0,
    transactionCalls: 0,
    async $transaction() {
      database.transactionCalls += 1
      throw new Error("The bulk coordinator must not open a shared transaction")
    },
    disposalRequest: {
      async findMany({ where }: { where: { id: { in: string[] } } }) {
        database.findManyCalls += 1
        return state.requests
          .filter((request) => where.id.in.includes(request.id))
          .map((request) => structuredClone(request))
          .reverse()
      },
    },
    attachment: {
      async groupBy({ where }: { where: { module: string; referenceId: { in: string[] } } }) {
        const counts = where.module === "disposal" ? state.itemEvidenceCounts : state.batchEvidenceCounts
        return where.referenceId.in.flatMap((referenceId) => {
          const count = counts.get(referenceId) ?? 0
          return count > 0 ? [{ referenceId, _count: { _all: count } }] : []
        })
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
  }
  return database as unknown as DisposalBulkExecutionDatabase & { findManyCalls: number; transactionCalls: number }
}
