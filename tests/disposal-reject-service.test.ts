import assert from "node:assert/strict"
import test from "node:test"
import type { Prisma } from "@prisma/client"

import {
  DisposalApprovalServiceError,
  rejectDisposalRequest,
  type DisposalRejectCommand,
} from "../src/lib/disposal-approval-service.ts"

type FakeRequest = ReturnType<typeof makeRequest>
type FakeState = {
  request: FakeRequest
  assetStatusId: string
  requestWhere: Array<Record<string, unknown>>
  assetUpdates: Array<Record<string, unknown>>
  movements: Array<Record<string, unknown>>
  batchUpdates: Array<Record<string, unknown>>
  audits: Array<Record<string, unknown>>
}

const baseCommand: DisposalRejectCommand = {
  requestId: "request-1",
  actor: {
    userId: "user-approver",
    employeeId: "employee-approver",
    roles: ["asset_admin"],
    permissions: ["disposal:approve"],
  },
  segregationRequired: true,
  approvalRemark: "เครื่องยังใช้งานได้ดี",
}

test("a pending request is rejected through the guarded update and the asset returns to its previous status", async () => {
  const state = makeState()
  const database = makeDatabase(state)

  const result = await rejectDisposalRequest(baseCommand, dependencies(database, state))

  assert.equal(result.request.requestStatus, "rejected")
  assert.equal(database.isolationLevel, "Serializable")
  assert.deepEqual(state.requestWhere, [{ id: "request-1", isActive: true, requestStatus: "pending" }])
  assert.equal(state.request.requestStatus, "rejected")
  assert.equal(state.request.approvalRemark, "เครื่องยังใช้งานได้ดี")
  assert.equal(state.request.approverId, "employee-approver")
  assert.equal(state.request.updatedBy, "user-approver")
  assert.equal(state.assetStatusId, "status-in-use")
  assert.deepEqual(state.assetUpdates, [{ where: { id: "asset-1" }, data: { statusId: "status-in-use", updatedBy: "user-approver" } }])
  assert.equal(state.movements.length, 1)
  assert.equal(state.movements[0].movementType, "disposal_reject")
  assert.equal(state.movements[0].fromValue, "status-pending")
  assert.equal(state.movements[0].toValue, "status-in-use")
  assert.equal(state.movements[0].referenceId, "request-1")
  assert.equal(state.audits.length, 1)
  assert.equal(state.audits[0].action, "reject")
  assert.deepEqual(state.audits[0].newValue, {
    requestStatus: "rejected",
    assetStatusId: "status-in-use",
    saleValue: undefined,
    salvageValue: undefined,
    approvalRemark: "เครื่องยังใช้งานได้ดี",
  })
})

test("a reject re-derives the batch status when the request belongs to a batch", async () => {
  const state = makeState({ batchId: "batch-1" })
  const database = makeDatabase(state)

  await rejectDisposalRequest(baseCommand, dependencies(database, state, true))

  assert.equal(state.batchUpdates.length, 1)
  assert.equal((state.batchUpdates[0].where as { id: string }).id, "batch-1")
  assert.equal((state.batchUpdates[0].data as { batchStatus: string }).batchStatus, "rejected")
})

test("a reject that loses the race to another decision answers a concurrent update and writes nothing else", async () => {
  const state = makeState()
  const database = makeDatabase(state, { forceRequestConflict: true })

  await assert.rejects(
    rejectDisposalRequest(baseCommand, dependencies(database, state)),
    hasServiceCode("DISPOSAL_CONCURRENT_UPDATE"),
  )
  assert.equal(state.request.requestStatus, "pending")
  assert.equal(state.assetStatusId, "status-pending")
  assert.equal(state.assetUpdates.length, 0)
  assert.equal(state.movements.length, 0)
  assert.equal(state.audits.length, 0)
})

test("a request already approved at the read cannot be rejected", async () => {
  const state = makeState()
  state.request.requestStatus = "approved"
  const database = makeDatabase(state)

  await assert.rejects(
    rejectDisposalRequest(baseCommand, dependencies(database, state)),
    hasServiceCode("DISPOSAL_INVALID_STAGE"),
  )
  assert.equal(state.requestWhere.length, 0)
  assert.equal(state.assetUpdates.length, 0)
  assert.equal(state.movements.length, 0)
})

test("the requester cannot reject their own request and the error names the reason", async () => {
  const state = makeState()
  const database = makeDatabase(state)

  await assert.rejects(
    rejectDisposalRequest(
      { ...baseCommand, actor: { ...baseCommand.actor, employeeId: "employee-requester" } },
      dependencies(database, state),
    ),
    (error: unknown) =>
      error instanceof DisposalApprovalServiceError
      && error.code === "DISPOSAL_SOD_CONFLICT"
      && error.sodReason === "requester",
  )
  assert.equal(state.request.requestStatus, "pending")
  assert.equal(state.movements.length, 0)
})

test("a missing request answers not found", async () => {
  const state = makeState()
  state.request.isActive = false
  const database = makeDatabase(state)

  await assert.rejects(
    rejectDisposalRequest(baseCommand, dependencies(database, state)),
    hasServiceCode("DISPOSAL_REQUEST_NOT_FOUND"),
  )
})

test("an asset that left Pending Disposal is not restored", async () => {
  const state = makeState()
  state.request.asset.status = { name: "Ready", nameTh: "พร้อมใช้งาน", isActive: true }
  const database = makeDatabase(state)

  await assert.rejects(
    rejectDisposalRequest(baseCommand, dependencies(database, state)),
    hasServiceCode("DISPOSAL_ASSET_STATUS_CHANGED"),
  )
  assert.equal(state.assetUpdates.length, 0)
})

function dependencies(database: ReturnType<typeof makeDatabase>, state: FakeState, batchSchemaReady = false) {
  return {
    database,
    batchSchemaReady,
    logAudit: async (params: Record<string, unknown>) => {
      state.audits.push(params)
    },
  }
}

function makeRequest(batchId: string | null) {
  return {
    id: "request-1",
    disposalNo: "DP-20261104-0001",
    isActive: true,
    requestStatus: "pending",
    requestedById: "employee-requester",
    createdBy: "user-requester",
    approverId: null as string | null,
    approvalRemark: null as string | null,
    approvedAt: null as Date | null,
    updatedBy: null as string | null,
    assetId: "asset-1",
    reason: "เครื่องเสียซ่อมไม่คุ้ม",
    saleValue: null as number | null,
    salvageValue: null as number | null,
    batchId,
    asset: {
      assetTag: "IT-001",
      statusId: "status-pending",
      status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย", isActive: true },
    },
    previousAssetStatus: { id: "status-in-use", name: "In Use", nameTh: "ใช้งานอยู่", isActive: true },
  }
}

function makeState(options: { batchId?: string | null } = {}): FakeState {
  return {
    request: makeRequest(options.batchId ?? null),
    assetStatusId: "status-pending",
    requestWhere: [],
    assetUpdates: [],
    movements: [],
    batchUpdates: [],
    audits: [],
  }
}

function makeDatabase(state: FakeState, options: { forceRequestConflict?: boolean } = {}) {
  const database = {
    isolationLevel: "",
    async $transaction<T>(
      callback: (transaction: Prisma.TransactionClient) => Promise<T>,
      transactionOptions?: { isolationLevel?: Prisma.TransactionIsolationLevel },
    ) {
      database.isolationLevel = transactionOptions?.isolationLevel ?? ""
      const draft = structuredClone(state)
      const result = await callback(makeTransaction(draft, options) as unknown as Prisma.TransactionClient)
      Object.assign(state, draft)
      return result
    },
  }
  return database
}

function makeTransaction(state: FakeState, options: { forceRequestConflict?: boolean }) {
  return {
    disposalRequest: {
      async findFirst({ where }: { where: { id: string; isActive?: boolean } }) {
        if (where.id !== state.request.id) return null
        if (where.isActive === true && !state.request.isActive) return null
        return structuredClone(state.request)
      },
      async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
        state.requestWhere.push(where)
        if (options.forceRequestConflict) return { count: 0 }
        if (where.id !== state.request.id || where.requestStatus !== state.request.requestStatus || !state.request.isActive) {
          return { count: 0 }
        }
        Object.assign(state.request, data)
        return { count: 1 }
      },
      async findUniqueOrThrow() {
        const { asset: _asset, previousAssetStatus: _previous, batchId: _batchId, ...request } = structuredClone(state.request)
        return request
      },
      async findMany() {
        return [{ requestStatus: state.request.requestStatus }]
      },
    },
    asset: {
      async update(args: { where: { id: string }; data: { statusId: string; updatedBy: string } }) {
        state.assetUpdates.push(args)
        state.assetStatusId = args.data.statusId
        return null
      },
    },
    assetMovement: {
      async create({ data }: { data: Record<string, unknown> }) {
        state.movements.push(data)
        return data
      },
    },
    disposalBatch: {
      async update(args: Record<string, unknown>) {
        state.batchUpdates.push(args)
        return null
      },
    },
  }
}

function hasServiceCode(code: string) {
  return (error: unknown) => error instanceof DisposalApprovalServiceError && error.code === code
}

test("a reject chosen as SQL Server's deadlock victim (P2034) answers a concurrent update, not a server error", async () => {
  const state = makeState()
  const database = {
    async $transaction(): Promise<never> {
      throw Object.assign(new Error("Transaction failed due to a write conflict or a deadlock"), { code: "P2034" })
    },
  }

  await assert.rejects(
    rejectDisposalRequest(baseCommand, dependencies(database as unknown as ReturnType<typeof makeDatabase>, state)),
    hasServiceCode("DISPOSAL_CONCURRENT_UPDATE"),
  )
  assert.equal(state.audits.length, 0)
})
