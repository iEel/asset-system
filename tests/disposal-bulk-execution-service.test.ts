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

type FakeDatabaseOptions = {
  beforeRequestRead?: (readNumber: number, state: FakeState) => void | Promise<void>
}

type FakeDatabase = DisposalBulkExecutionDatabase & {
  findManyCalls: number
  transactionCalls: number
  transactionIsolationLevels: string[]
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
  assert.deepEqual(response.items.map((item) => item.code), [null, "DISPOSAL_BULK_MIXED_TYPES", "DISPOSAL_EXECUTION_REMARK_REQUIRED"])
  assert.equal(response.eligibleCount, 1)
  assert.equal(response.blockedCount, 2)
})

test("preview identifies a missing donation recipient instead of reporting an invalid selection count", async () => {
  const state = makeState({
    requests: [makeRequest({
      id: "request-1",
      disposalType: "donate",
      recipientName: null,
      documentNo: null,
    })],
  })

  const response = await inspectDisposalBulkExecution({
    ...baseCommand,
    input: {
      ...baseCommand.input,
      requestIds: ["request-1"],
      useHistoricalEvidenceException: true,
      evidenceExceptionReason: "Historical disposal with no surviving evidence",
      evidenceExceptionAcknowledged: true,
    },
  }, { database: makeDatabase(state), batchSchemaReadiness: "ready" })

  assert.equal(response.items[0].outcome, "blocked")
  assert.equal(response.items[0].code, "DISPOSAL_RECIPIENT_REQUIRED")
})

test("preview fills a missing donation recipient from the shared fallback", async () => {
  const response = await inspectDisposalBulkExecution({
    ...baseCommand,
    input: {
      ...baseCommand.input,
      sharedRecipientName: "Receiving Foundation",
    },
  }, {
    database: makeDatabase(makeState({
      requests: [makeRequest({ disposalType: "donate", recipientName: null, documentNo: "DONATE-001" })],
    })),
    batchSchemaReadiness: "ready",
  })

  assert.equal(response.items[0].outcome, "eligible")
  assert.equal(response.items[0].recipientName, "Receiving Foundation")
  assert.equal(response.items[0].recipientSource, "shared")
})

test("preview preserves a nonblank request recipient over the shared fallback", async () => {
  const response = await inspectDisposalBulkExecution({
    ...baseCommand,
    input: {
      ...baseCommand.input,
      sharedRecipientName: "Fallback Destination",
    },
  }, {
    database: makeDatabase(makeState({
      requests: [makeRequest({ disposalType: "donate", recipientName: " Original Foundation ", documentNo: "DONATE-001" })],
    })),
    batchSchemaReadiness: "ready",
  })

  assert.equal(response.items[0].recipientName, " Original Foundation ")
  assert.equal(response.items[0].recipientSource, "request")
})

for (const disposalType of ["destroy", "lost"] as const) {
  test(`preview ignores the shared recipient for ${disposalType} requests`, async () => {
    const response = await inspectDisposalBulkExecution({
      ...baseCommand,
      input: {
        ...baseCommand.input,
        sharedRecipientName: "Fallback Destination",
      },
    }, {
      database: makeDatabase(makeState({
        requests: [makeRequest({
          disposalType,
          recipientName: null,
          executionRemark: "Recorded execution details",
        })],
      })),
      batchSchemaReadiness: "ready",
    })

    assert.equal(response.items[0].recipientName, null)
    assert.equal(response.items[0].recipientSource, null)
  })
}

for (const scenario of [
  {
    name: "reference document",
    request: makeRequest({ documentNo: null }),
    code: "DISPOSAL_DOCUMENT_REQUIRED",
  },
  {
    name: "sale value",
    request: makeRequest({ disposalType: "sell", recipientName: "Buyer", saleValue: null }),
    code: "DISPOSAL_SALE_VALUE_REQUIRED",
  },
  {
    name: "execution detail",
    request: makeRequest({ executionRemark: null }),
    code: "DISPOSAL_EXECUTION_REMARK_REQUIRED",
  },
] as const) {
  test(`preview identifies missing ${scenario.name}`, async () => {
    const state = makeState({ requests: [scenario.request] })
    const response = await inspectDisposalBulkExecution(baseCommand, {
      database: makeDatabase(state),
      batchSchemaReadiness: "ready",
    })

    assert.equal(response.items[0].outcome, "blocked")
    assert.equal(response.items[0].code, scenario.code)
  })
}

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
    executeDisposalRequest: async (command, executionDependencies) => {
      executions.push(command)
      await executionDependencies.database.$transaction(async () => undefined, {
        isolationLevel: "Serializable",
      })
    },
  })

  assert.deepEqual(response.items.map((item) => item.outcome), ["executed", "executed"])
  assert.equal(executions.length, 2)
  assert.equal(database.transactionCalls, 2)
  assert.deepEqual(database.transactionIsolationLevels, ["Serializable", "Serializable"])
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

test("commit passes the resolved shared recipient to the item executor", async () => {
  const executions: DisposalExecutionCommand[] = []

  await commitDisposalBulkExecution({
    ...baseCommand,
    input: {
      ...baseCommand.input,
      mode: "commit",
      sharedRecipientName: "Receiving Foundation",
    },
  }, {
    database: makeDatabase(makeState({
      requests: [makeRequest({ disposalType: "donate", recipientName: null, documentNo: "DONATE-001" })],
    })),
    batchSchemaReadiness: "ready",
    executeDisposalRequest: async (command) => {
      executions.push(command)
    },
  })

  assert.equal(executions.length, 1)
  assert.equal(executions[0].input.recipientName, "Receiving Foundation")
})

test("commit prefers a recipient from the authoritative reload over the shared fallback", async () => {
  const state = makeState({
    requests: [makeRequest({ disposalType: "donate", recipientName: null, documentNo: "DONATE-001" })],
  })
  const executions: DisposalExecutionCommand[] = []

  const response = await commitDisposalBulkExecution({
    ...baseCommand,
    input: {
      ...baseCommand.input,
      mode: "commit",
      sharedRecipientName: "Fallback Destination",
    },
  }, {
    database: makeDatabase(state, {
      beforeRequestRead(readNumber, currentState) {
        if (readNumber === 2) findRequest(currentState, "request-1").recipientName = "Fresh Foundation"
      },
    }),
    batchSchemaReadiness: "ready",
    executeDisposalRequest: async (command) => {
      executions.push(command)
    },
  })

  assert.equal(executions[0].input.recipientName, "Fresh Foundation")
  assert.equal(response.items[0].recipientName, "Fresh Foundation")
  assert.equal(response.items[0].recipientSource, "request")
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

test("middle failure persists sibling success and identical retry only executes the unresolved item", async () => {
  const state = makeState({
    requests: [
      makeRequest({ id: "request-1", executionRemark: "Initial first detail" }),
      makeRequest({ id: "request-2", executionRemark: "Initial middle detail" }),
      makeRequest({ id: "request-3", executionRemark: "Initial last detail" }),
    ],
  })
  const calls: Array<{ requestId: string; executionRemark: string | null }> = []
  const errors: string[] = []
  let failMiddle = true
  const command: DisposalBulkExecutionCommand = {
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit", requestIds: ["request-1", "request-2", "request-3"] },
  }
  const database = makeDatabase(state, {
    beforeRequestRead(readNumber, currentState) {
      const reloadedDetails = new Map<number, readonly [string, string]>([
        [2, ["request-1", "Reloaded first detail"]],
        [3, ["request-2", "Reloaded middle detail"]],
        [4, ["request-3", "Reloaded last detail"]],
        [6, ["request-2", "Reloaded middle detail for retry"]],
      ])
      const update = reloadedDetails.get(readNumber)
      if (update) findRequest(currentState, update[0]).executionRemark = update[1]
    },
  })
  const execute = async (
    execution: DisposalExecutionCommand,
    executionDependencies: Parameters<NonNullable<Parameters<typeof commitDisposalBulkExecution>[1]["executeDisposalRequest"]>>[1],
  ) => {
    calls.push({ requestId: execution.requestId, executionRemark: execution.input.executionRemark ?? null })
    await executionDependencies.database.$transaction(async () => {
      if (execution.requestId === "request-2" && failMiddle) {
        throw new Error("postgresql://admin:secret@internal-db.example/disposals")
      }
      const request = findRequest(state, execution.requestId)
      request.requestStatus = "disposed"
      request.completedAt = new Date("2026-07-13T01:00:00.000Z")
    }, { isolationLevel: "Serializable" })
  }

  const response = await commitDisposalBulkExecution(command, {
    database,
    batchSchemaReadiness: "ready",
    logger: (message) => errors.push(message),
    executeDisposalRequest: execute,
  })

  failMiddle = false
  const retry = await commitDisposalBulkExecution(command, {
    database,
    batchSchemaReadiness: "ready",
    executeDisposalRequest: execute,
  })

  assert.deepEqual(response.items.map((item) => item.outcome), ["executed", "failed", "executed"])
  assert.equal(response.items[1].code, "DISPOSAL_BULK_EXECUTION_FAILED")
  assert.deepEqual(state.requests.map((request) => request.requestStatus), ["disposed", "disposed", "disposed"])
  assert.deepEqual(retry.items.map((item) => item.outcome), ["blocked", "executed", "blocked"])
  assert.deepEqual(calls, [
    { requestId: "request-1", executionRemark: "Reloaded first detail" },
    { requestId: "request-2", executionRemark: "Reloaded middle detail" },
    { requestId: "request-3", executionRemark: "Reloaded last detail" },
    { requestId: "request-2", executionRemark: "Reloaded middle detail for retry" },
  ])
  assert.equal(calls.filter(({ requestId }) => requestId === "request-1").length, 1)
  assert.equal(calls.filter(({ requestId }) => requestId === "request-3").length, 1)
  assert.deepEqual(database.transactionIsolationLevels, ["Serializable", "Serializable", "Serializable", "Serializable"])
  assert.deepEqual(errors, ["Disposal bulk execution item failed"])
  assert.doesNotMatch(JSON.stringify(response), /admin|secret|internal-db|postgresql/i)
})

test("authoritative reload failure becomes failed and later items continue", async () => {
  const state = makeState({
    requests: [
      makeRequest({ id: "request-1" }),
      makeRequest({ id: "request-2" }),
      makeRequest({ id: "request-3" }),
    ],
  })
  const database = makeDatabase(state, {
    beforeRequestRead(readNumber) {
      if (readNumber === 3) throw new Error("Server=tcp:private-db;Password=do-not-serialize")
    },
  })
  const executions: string[] = []
  const errors: string[] = []

  const response = await commitDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit", requestIds: ["request-1", "request-2", "request-3"] },
  }, {
    database,
    batchSchemaReadiness: "ready",
    logger: (message) => errors.push(message),
    executeDisposalRequest: async (execution, executionDependencies) => {
      executions.push(execution.requestId)
      await executionDependencies.database.$transaction(async () => undefined, {
        isolationLevel: "Serializable",
      })
    },
  })

  assert.deepEqual(response.items.map((item) => item.outcome), ["executed", "failed", "executed"])
  assert.equal(response.items[1].code, "DISPOSAL_BULK_EXECUTION_FAILED")
  assert.deepEqual(executions, ["request-1", "request-3"])
  assert.deepEqual(errors, ["Disposal bulk execution item failed"])
  assert.doesNotMatch(JSON.stringify(response), /private-db|Password|do-not-serialize/i)
})

test("known executor exceptions become blocked item results without generic logging", async () => {
  const state = makeState()
  const errors: string[] = []

  const response = await commitDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, mode: "commit" },
  }, {
    database: makeDatabase(state),
    batchSchemaReadiness: "ready",
    logger: (message) => errors.push(message),
    executeDisposalRequest: async () => {
      throw new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE")
    },
  })

  assert.equal(response.items[0].outcome, "blocked")
  assert.equal(response.items[0].code, "DISPOSAL_CONCURRENT_UPDATE")
  assert.deepEqual(errors, [])
})

for (const scenario of [
  {
    name: "known",
    error: new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE"),
    outcome: "blocked",
    code: "DISPOSAL_CONCURRENT_UPDATE",
  },
  {
    name: "unexpected",
    error: new Error("executor failed"),
    outcome: "failed",
    code: "DISPOSAL_BULK_EXECUTION_FAILED",
  },
] as const) {
  test(`${scenario.name} executor failure retains recipient metadata from authoritative reinspection`, async () => {
    const state = makeState({
      requests: [makeRequest({ disposalType: "donate", recipientName: null, documentNo: "DONATE-001" })],
    })

    const response = await commitDisposalBulkExecution({
      ...baseCommand,
      input: {
        ...baseCommand.input,
        mode: "commit",
        sharedRecipientName: "Fallback Destination",
      },
    }, {
      database: makeDatabase(state, {
        beforeRequestRead(readNumber, currentState) {
          if (readNumber === 2) findRequest(currentState, "request-1").recipientName = "Fresh Foundation"
        },
      }),
      batchSchemaReadiness: "ready",
      logger: () => undefined,
      executeDisposalRequest: async () => {
        throw scenario.error
      },
    })

    assert.equal(response.items[0].outcome, scenario.outcome)
    assert.equal(response.items[0].code, scenario.code)
    assert.equal(response.items[0].recipientName, "Fresh Foundation")
    assert.equal(response.items[0].recipientSource, "request")
  })
}

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

function findRequest(state: FakeState, requestId: string): FakeRequest {
  const request = state.requests.find(({ id }) => id === requestId)
  assert.ok(request)
  return request
}

function makeDatabase(state: FakeState, options: FakeDatabaseOptions = {}): FakeDatabase {
  const database = {
    findManyCalls: 0,
    transactionCalls: 0,
    transactionIsolationLevels: [] as string[],
    async $transaction(callback: (transaction: unknown) => Promise<unknown>, transactionOptions?: { isolationLevel?: string }) {
      database.transactionCalls += 1
      if (transactionOptions?.isolationLevel) {
        database.transactionIsolationLevels.push(transactionOptions.isolationLevel)
      }
      return callback(database)
    },
    disposalRequest: {
      async findMany({ where }: { where: { id: { in: string[] } } }) {
        database.findManyCalls += 1
        await options.beforeRequestRead?.(database.findManyCalls, state)
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
  return database as unknown as FakeDatabase
}
