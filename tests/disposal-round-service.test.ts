import assert from "node:assert/strict"
import test from "node:test"

import {
  createDisposalRound,
  DisposalRoundServiceError,
  getDisposalRoundTickBlocks,
  previewDisposalRound,
  type DisposalRoundActor,
  type DisposalRoundDatabase,
} from "../src/lib/disposal-round-service.ts"
import type { DisposalRoundCommitInput } from "../src/lib/validations/disposal-round.ts"

// A fake transactional database in the style of tests/disposal-reject-service.test.ts: every $transaction works on a
// copy of the state that is kept only when the callback resolves, so a refusal leaves the state as it was.

type FakeRequest = {
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
  completedAt: Date | null
  batchId: string | null
  roundId: string | null
  [key: string]: unknown
}

type FakeAsset = { id: string; assetTag: string; name: string; statusId: string; isActive: boolean; updatedBy?: string }

type FakeState = {
  requests: FakeRequest[]
  assets: FakeAsset[]
  evidence: Record<string, number>
  rounds: Array<Record<string, unknown>>
  movements: Array<Record<string, unknown>>
  logs: Array<Record<string, unknown>>
  planEnds: Array<Record<string, unknown>>
}

const statuses = [
  { id: "status-pending", name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" },
  { id: "status-disposed", name: "Disposed", nameTh: "ตัดจำหน่ายแล้ว" },
  { id: "status-ready", name: "Ready", nameTh: "พร้อมใช้งาน" },
]

const employees = [
  { id: "employee-actor", code: "E001", fullNameTh: "ผู้บันทึก", isActive: true },
  { id: "employee-executor", code: "E002", fullNameTh: "ผู้ดำเนินการ", isActive: true },
  { id: "employee-approver-1", code: "E003", fullNameTh: "ผู้อนุมัติหนึ่ง", isActive: true },
  { id: "employee-approver-2", code: "E004", fullNameTh: "ผู้อนุมัติสอง", isActive: true },
  { id: "employee-left", code: "E005", fullNameTh: "ลาออกแล้ว", isActive: false },
]

const actor: DisposalRoundActor = {
  userId: "user-actor",
  employeeId: "employee-actor",
  roles: ["asset_admin"],
  permissions: ["disposal:edit"],
}
const admin: DisposalRoundActor = { ...actor, roles: ["system_admin"] }
const now = new Date("2026-11-05T03:00:00.000Z") // 5 Nov, Bangkok
const exceptionReason = "ทรัพย์สินถูกตัดจำหน่ายจริงในอดีตและไม่มีหลักฐานหลงเหลือ"

function uuid(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
}

function makeRequest(index: number, overrides: Partial<FakeRequest> = {}): FakeRequest {
  return {
    id: uuid(index),
    disposalNo: `DP-20261101-${String(index).padStart(4, "0")}`,
    disposalType: "donate",
    isActive: true,
    requestStatus: "approved",
    requestedById: "employee-requester",
    createdBy: "user-requester",
    approverId: index % 2 === 0 ? "employee-approver-2" : "employee-approver-1",
    assetId: `asset-${index}`,
    reason: "เครื่องเสื่อมสภาพ",
    recipientName: null,
    documentNo: null,
    saleValue: null,
    salvageValue: null,
    executionRemark: null,
    completedAt: null,
    batchId: null,
    roundId: null,
    ...overrides,
  }
}

function makeState(count: number, overrides: Record<number, Partial<FakeRequest>> = {}): FakeState {
  const requests = Array.from({ length: count }, (_, index) => makeRequest(index + 1, overrides[index + 1]))
  return {
    requests,
    assets: requests.map((request, index) => ({
      id: request.assetId,
      assetTag: `IT-${String(index + 1).padStart(4, "0")}`,
      name: `Monitor ${index + 1}`,
      statusId: "status-pending",
      isActive: true,
    })),
    evidence: Object.fromEntries(requests.map((request) => [request.id, 1])),
    rounds: [],
    movements: [],
    logs: [],
    planEnds: [],
  }
}

function matchesIn(value: unknown, condition: unknown) {
  if (condition && typeof condition === "object" && "in" in condition) return (condition as { in: unknown[] }).in.includes(value)
  return value === condition
}

function makeDatabase(state: FakeState, options: { roundNoConflicts?: number } = {}) {
  const calls: Record<string, number> = {}
  const count = (name: string) => { calls[name] = (calls[name] ?? 0) + 1 }
  let roundNoConflicts = options.roundNoConflicts ?? 0

  function client(target: FakeState) {
    const joinRequest = (request: FakeRequest) => {
      const asset = target.assets.find((candidate) => candidate.id === request.assetId)!
      const status = statuses.find((candidate) => candidate.id === asset.statusId)!
      const approver = employees.find((candidate) => candidate.id === request.approverId)
      return {
        ...structuredClone(request),
        asset: { assetTag: asset.assetTag, name: asset.name, statusId: asset.statusId, status: { name: status.name, nameTh: status.nameTh } },
        approver: approver ? { code: approver.code, fullNameTh: approver.fullNameTh } : null,
      }
    }
    return {
      disposalRequest: {
        async findMany({ where }: { where: Record<string, unknown> }) {
          count("disposalRequest.findMany")
          return target.requests
            .filter((request) => Object.entries(where).every(([key, condition]) => matchesIn(request[key], condition)))
            .map(joinRequest)
        },
        async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
          count("disposalRequest.updateMany")
          const matched = target.requests.filter((request) => Object.entries(where).every(([key, condition]) => matchesIn(request[key], condition)))
          for (const request of matched) Object.assign(request, data)
          return { count: matched.length }
        },
      },
      asset: {
        async updateMany({ where, data }: { where: Record<string, unknown>; data: Partial<FakeAsset> }) {
          count("asset.updateMany")
          const matched = target.assets.filter((asset) => Object.entries(where).every(([key, condition]) => matchesIn(asset[key as keyof FakeAsset], condition)))
          for (const asset of matched) Object.assign(asset, data)
          return { count: matched.length }
        },
      },
      assetStatus: {
        async findFirst({ where }: { where: { OR: Array<{ name?: string; nameTh?: string }> } }) {
          count("assetStatus.findFirst")
          return statuses.find((status) => where.OR.some((condition) => condition.name === status.name || condition.nameTh === status.nameTh)) ?? null
        },
      },
      employee: {
        async findFirst({ where }: { where: { id: string; isActive: boolean } }) {
          count("employee.findFirst")
          const employee = employees.find((candidate) => candidate.id === where.id && candidate.isActive === where.isActive)
          return employee ? { id: employee.id } : null
        },
        async findMany() {
          count("employee.findMany")
          return employees.filter((employee) => employee.isActive).map(({ id, code, fullNameTh }) => ({ id, code, fullNameTh }))
        },
      },
      attachment: {
        async groupBy({ where }: { where: { module: string; referenceId: { in: string[] } } }) {
          count("attachment.groupBy")
          if (where.module !== "disposal") return []
          return where.referenceId.in
            .filter((id) => (target.evidence[id] ?? 0) > 0)
            .map((id) => ({ referenceId: id, _count: { _all: target.evidence[id] } }))
        },
      },
      systemSetting: {
        async findMany() {
          count("systemSetting.findMany")
          return []
        },
      },
      disposalRound: {
        async count({ where }: { where: { roundNo: { startsWith: string } } }) {
          count("disposalRound.count")
          return target.rounds.filter((round) => String(round.roundNo).startsWith(where.roundNo.startsWith)).length
        },
        async create({ data }: { data: Record<string, unknown> }) {
          count("disposalRound.create")
          if (roundNoConflicts > 0) {
            roundNoConflicts -= 1
            // Another round took this number and committed first.
            state.rounds.push({ id: `competitor-${roundNoConflicts}`, ...data })
            throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
          }
          const round = { id: `round-${target.rounds.length + 1}`, ...data }
          target.rounds.push(round)
          return round
        },
      },
      assetMovement: {
        async create({ data }: { data: Record<string, unknown> }) {
          count("assetMovement.create")
          target.movements.push(data)
          return data
        },
        async createMany({ data }: { data: Array<Record<string, unknown>> }) {
          count("assetMovement.createMany")
          target.movements.push(...data)
          return { count: data.length }
        },
      },
      maintenancePlan: {
        async updateMany(args: Record<string, unknown>) {
          count("maintenancePlan.updateMany")
          target.planEnds.push(args)
          return { count: 0 }
        },
      },
      disposalBatch: {
        async update() {
          count("disposalBatch.update")
          return null
        },
      },
      systemLog: {
        async create({ data }: { data: Record<string, unknown> }) {
          count("systemLog.create")
          target.logs.push(data)
          return data
        },
        async createMany({ data }: { data: Array<Record<string, unknown>> }) {
          count("systemLog.createMany")
          target.logs.push(...data)
          return { count: data.length }
        },
      },
    }
  }

  const database = {
    calls,
    transactionOptions: [] as unknown[],
    async $transaction<T>(callback: (tx: unknown) => Promise<T>, transactionOptions?: unknown) {
      database.transactionOptions.push(transactionOptions)
      const draft = structuredClone(state)
      const result = await callback(client(draft))
      Object.assign(state, draft)
      return result
    },
    ...client(state),
  }
  return database
}

function asDb(database: ReturnType<typeof makeDatabase>) {
  return database as unknown as DisposalRoundDatabase
}

function commitInput(state: FakeState, overrides: Partial<DisposalRoundCommitInput> = {}): DisposalRoundCommitInput {
  return {
    mode: "commit",
    requestIds: state.requests.map((request) => request.id),
    disposalType: "sell",
    executionDate: new Date("2026-11-04T00:00:00.000Z"),
    executedById: "employee-executor",
    recipientName: "ร้านรับซื้อของเก่า",
    documentNo: "INV-2026-001",
    saleValue: 3000,
    remark: "ขายเหมาทั้งล็อต",
    useHistoricalEvidenceException: false,
    evidenceExceptionReason: null,
    ...overrides,
  }
}

function roundError(code: string) {
  return (error: unknown) => error instanceof DisposalRoundServiceError && error.code === code
}

test("(a) a round of three requests asked under other methods records one sale and executes every machine", async () => {
  const state = makeState(3, { 2: { disposalType: "dispose" } })
  const database = makeDatabase(state)

  const result = await createDisposalRound(asDb(database), commitInput(state), actor, now)

  assert.equal(result.roundNo, "DPR-20261105-0001")
  assert.equal(state.rounds.length, 1)
  assert.deepEqual(
    { ...state.rounds[0], id: undefined },
    {
      id: undefined,
      roundNo: "DPR-20261105-0001",
      disposalType: "sell",
      executionDate: new Date("2026-11-04T00:00:00.000Z"),
      executedById: "employee-executor",
      recipientName: "ร้านรับซื้อของเก่า",
      documentNo: "INV-2026-001",
      saleValue: 3000,
      remark: "ขายเหมาทั้งล็อต",
      createdBy: "user-actor",
      updatedBy: "user-actor",
    },
  )
  assert.equal(result.id, state.rounds[0].id)
  assert.deepEqual(database.transactionOptions, [{ isolationLevel: "Serializable", timeout: 120_000, maxWait: 10_000 }])

  for (const request of state.requests) {
    assert.equal(request.requestStatus, "disposed")
    assert.equal(request.disposalType, "sell")
    assert.equal(request.roundId, result.id)
    assert.deepEqual(request.executionDate, new Date("2026-11-04T00:00:00.000Z"))
    assert.equal(request.executedById, "employee-executor")
    assert.equal(request.recipientName, "ร้านรับซื้อของเก่า")
    assert.equal(request.documentNo, "INV-2026-001")
    assert.equal(request.executionRemark, "ขายเหมาทั้งล็อต")
    assert.equal(request.actualSaleValue, null)
    assert.deepEqual(request.completedAt, now)
    assert.equal(request.evidenceExceptionReason, null)
  }
  for (const asset of state.assets) assert.equal(asset.statusId, "status-disposed")

  assert.deepEqual(state.planEnds, [{
    where: { assetId: { in: ["asset-1", "asset-2", "asset-3"] }, planState: { not: "ended" } },
    data: { planState: "ended", isActive: false, updatedBy: "user-actor" },
  }])

  assert.equal(state.movements.length, 3)
  for (const [index, movement] of state.movements.entries()) {
    assert.equal(movement.movementType, "disposal_execute")
    assert.equal(movement.assetId, `asset-${index + 1}`)
    assert.equal(movement.fromValue, "status-pending")
    assert.equal(movement.toValue, "status-disposed")
    assert.equal(movement.referenceType, "disposal")
    assert.equal(movement.referenceId, uuid(index + 1))
    assert.equal(movement.remark, "round=DPR-20261105-0001")
    assert.deepEqual(movement.performedAt, new Date("2026-11-04T00:00:00.000Z"))
  }

  const createRound = state.logs.filter((log) => log.action === "create_round")
  assert.equal(createRound.length, 1)
  assert.equal(createRound[0].recordId, result.id)
  const executes = state.logs.filter((log) => log.action === "execute")
  assert.equal(executes.length, 3)
  const fromTypes = executes.map((log) => JSON.parse(String(log.newValue)).fromDisposalType)
  assert.deepEqual(fromTypes, ["donate", "dispose", "donate"])
  for (const log of executes) {
    const newValue = JSON.parse(String(log.newValue))
    assert.equal(newValue.disposalType, "sell")
    assert.equal(newValue.roundNo, "DPR-20261105-0001")
    assert.equal(log.module, "disposal")
  }
})

test("(b) a request rejected between the preview and the save refuses the whole round and names it", async () => {
  const state = makeState(3)
  const database = makeDatabase(state)
  const input = commitInput(state)

  const preview = await previewDisposalRound(asDb(database), { ...input, mode: "preview" }, actor)
  assert.deepEqual(preview.items.map((item) => item.outcome), ["eligible", "eligible", "eligible"])

  state.requests[1].requestStatus = "rejected"
  const before = structuredClone(state)

  await assert.rejects(createDisposalRound(asDb(database), input, actor, now), (error: unknown) => {
    assert.ok(error instanceof DisposalRoundServiceError)
    assert.equal(error.code, "DISPOSAL_ROUND_BLOCKED")
    assert.deepEqual(
      error.items.filter((item) => item.outcome === "blocked").map((item) => [item.requestId, item.disposalNo, item.code]),
      [[uuid(2), "DP-20261101-0002", "DISPOSAL_INVALID_STAGE"]],
    )
    return true
  })
  assert.deepEqual(state, before)
  assert.equal(state.rounds.length, 0)
  assert.equal(state.movements.length, 0)
  assert.equal(state.logs.length, 0)
  assert.deepEqual(state.requests.map((request) => request.requestStatus), ["approved", "rejected", "approved"])
  assert.deepEqual(state.assets.map((asset) => asset.statusId), ["status-pending", "status-pending", "status-pending"])
})

test("(b) an unknown id, an executed request and an asset no longer Pending Disposal are each named", async () => {
  const state = makeState(3, { 2: { requestStatus: "disposed", completedAt: new Date("2026-11-01") } })
  state.assets[2].statusId = "status-ready"
  const database = makeDatabase(state)

  const preview = await previewDisposalRound(asDb(database), { mode: "preview", requestIds: [uuid(1), uuid(2), uuid(3), uuid(99)] }, actor)
  assert.deepEqual(preview.items.map((item) => [item.requestId, item.outcome, item.code]), [
    [uuid(1), "eligible", null],
    [uuid(2), "blocked", "DISPOSAL_INVALID_STAGE"],
    [uuid(3), "blocked", "DISPOSAL_ASSET_INELIGIBLE"],
    [uuid(99), "blocked", "DISPOSAL_REQUEST_NOT_FOUND"],
  ])
  assert.deepEqual(preview.items[0], {
    requestId: uuid(1),
    disposalNo: "DP-20261101-0001",
    assetTag: "IT-0001",
    assetName: "Monitor 1",
    fromDisposalType: "donate",
    approverName: "ผู้อนุมัติหนึ่ง",
    outcome: "eligible",
    code: null,
  })
  assert.equal(preview.items[3].approverName, null)
})

test("each preview row names its approver by name, else by code, and none when no one approved it (spec §11.2)", async () => {
  const state = makeState(3, { 3: { approverId: null } })
  employees.push({ id: "employee-no-name", code: "E009", fullNameTh: "", isActive: true })
  try {
    state.requests[1].approverId = "employee-no-name"
    const preview = await previewDisposalRound(asDb(makeDatabase(state)), { mode: "preview", requestIds: state.requests.map((request) => request.id) }, actor)
    assert.deepEqual(preview.items.map((item) => item.approverName), ["ผู้อนุมัติหนึ่ง", "E009", null])
  } finally {
    employees.pop()
  }
})

test("(c) the executor who approved one request blocks it; the executor options leave out every approver", async () => {
  const state = makeState(3)
  const database = makeDatabase(state)

  const preview = await previewDisposalRound(
    asDb(database),
    { mode: "preview", requestIds: state.requests.map((request) => request.id), executedById: "employee-approver-2" },
    actor,
  )
  assert.deepEqual(preview.items.map((item) => item.code), [null, "DISPOSAL_SOD_CONFLICT", null])
  assert.deepEqual(preview.executorOptions, [
    { id: "employee-actor", label: "E001 - ผู้บันทึก" },
    { id: "employee-executor", label: "E002 - ผู้ดำเนินการ" },
  ])

  await assert.rejects(
    createDisposalRound(asDb(database), commitInput(state, { executedById: "employee-approver-2" }), actor, now),
    (error: unknown) => error instanceof DisposalRoundServiceError
      && error.code === "DISPOSAL_ROUND_BLOCKED"
      && error.items[1].code === "DISPOSAL_SOD_CONFLICT",
  )
  assert.equal(state.rounds.length, 0)
})

test("(c) the signed-in user who approved a request cannot record it either", async () => {
  const state = makeState(1)
  const database = makeDatabase(state)
  const preview = await previewDisposalRound(asDb(database), { mode: "preview", requestIds: [uuid(1)] }, { ...actor, employeeId: "employee-approver-1" })
  assert.equal(preview.items[0].code, "DISPOSAL_SOD_CONFLICT")
})

test("(d) a request without evidence needs the system admin's exception, logged per machine", async () => {
  const state = makeState(2)
  state.evidence[uuid(2)] = 0
  const database = makeDatabase(state)

  const preview = await previewDisposalRound(asDb(database), { mode: "preview", requestIds: [uuid(1), uuid(2)] }, actor)
  assert.deepEqual(preview.items.map((item) => item.code), [null, "DISPOSAL_EVIDENCE_REQUIRED"])
  await assert.rejects(createDisposalRound(asDb(database), commitInput(state), actor, now), roundError("DISPOSAL_ROUND_BLOCKED"))

  const withException = commitInput(state, { useHistoricalEvidenceException: true, evidenceExceptionReason: exceptionReason })
  await assert.rejects(createDisposalRound(asDb(database), withException, actor, now), roundError("DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN"))
  await assert.rejects(
    previewDisposalRound(asDb(database), { ...withException, mode: "preview" }, actor),
    roundError("DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN"),
  )
  assert.equal(state.rounds.length, 0)

  const adminPreview = await previewDisposalRound(asDb(database), { ...withException, mode: "preview" }, admin)
  assert.deepEqual(adminPreview.items.map((item) => item.outcome), ["eligible", "eligible"])

  await createDisposalRound(asDb(database), withException, admin, now)
  const executeLogs = state.logs.filter((log) => log.module === "disposal")
  assert.deepEqual(executeLogs.map((log) => [log.recordId, log.action]), [
    [uuid(1), "execute"],
    [uuid(2), "execute_historical_without_evidence"],
  ])
  assert.equal(state.requests[0].evidenceExceptionReason, null)
  assert.equal(state.requests[1].evidenceExceptionReason, exceptionReason)
  assert.equal(state.requests[1].evidenceExceptionGrantedBy, "user-actor")
  assert.deepEqual(state.requests[1].evidenceExceptionGrantedAt, now)
  assert.deepEqual(state.requests.map((request) => request.requestStatus), ["disposed", "disposed"])
})

// Task 3 (spec §10.2): the queue's ticks use the same checks, so a disabled tick says what the preview would.
test("the approved tab's ticks: the viewer's own approval and missing evidence block, except evidence for a system admin", async () => {
  const state = makeState(3)
  state.evidence[uuid(3)] = 0
  const database = makeDatabase(state)
  const ids = [uuid(1), uuid(2), uuid(3)]
  const approver = { ...actor, employeeId: "employee-approver-1" }
  assert.deepEqual([...(await getDisposalRoundTickBlocks(asDb(database), ids, approver)).values()], ["DISPOSAL_SOD_CONFLICT", null, "DISPOSAL_SOD_CONFLICT"])
  assert.deepEqual([...(await getDisposalRoundTickBlocks(asDb(database), ids, actor)).entries()], [[uuid(1), null], [uuid(2), null], [uuid(3), "DISPOSAL_EVIDENCE_REQUIRED"]])
  assert.deepEqual([...(await getDisposalRoundTickBlocks(asDb(database), ids, admin)).values()], [null, null, null])
  assert.equal((await getDisposalRoundTickBlocks(asDb(database), [], actor)).size, 0)
})

test("(e) a round number taken at the same moment is retried with the next sequence", async () => {
  const state = makeState(2)
  const database = makeDatabase(state, { roundNoConflicts: 1 })

  const result = await createDisposalRound(asDb(database), commitInput(state), actor, now)

  assert.equal(result.roundNo, "DPR-20261105-0002")
  assert.deepEqual(state.rounds.map((round) => round.roundNo), ["DPR-20261105-0001", "DPR-20261105-0002"])
  assert.equal(database.transactionOptions.length, 2)
  assert.deepEqual(state.requests.map((request) => request.roundId), [result.id, result.id])
  assert.equal(state.movements.length, 2)
})

test("(f) 200 machines are written with a constant number of statements", async () => {
  const state = makeState(200)
  const database = makeDatabase(state)

  await createDisposalRound(asDb(database), commitInput(state), actor, now)

  assert.equal(database.calls["disposalRequest.findMany"], 1)
  assert.equal(database.calls["disposalRequest.updateMany"], 1)
  assert.equal(database.calls["asset.updateMany"], 1)
  assert.equal(database.calls["assetMovement.createMany"], 1)
  assert.equal(database.calls["assetMovement.create"], undefined)
  assert.equal(database.calls["maintenancePlan.updateMany"], 1)
  assert.equal(database.calls["systemLog.createMany"], 1)
  assert.ok((database.calls["systemLog.create"] ?? 0) <= 1)
  assert.equal(database.calls["attachment.groupBy"], 1)
  assert.equal(state.movements.length, 200)
  assert.equal(state.logs.filter((log) => log.action === "execute").length, 200)
  assert.ok(state.requests.every((request) => request.requestStatus === "disposed"))
  assert.ok(state.assets.every((asset) => asset.statusId === "status-disposed"))
})

test("a guarded update that matches fewer requests than were read answers DISPOSAL_CONCURRENT_UPDATE and writes nothing", async () => {
  const state = makeState(2)
  const database = makeDatabase(state)
  const originalTransaction = database.$transaction.bind(database)
  // Another session executes request 2 between this transaction's read and its update.
  database.$transaction = async (callback, options) => originalTransaction(async (tx) => {
    const client = tx as { disposalRequest: { updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }> } }
    const updateMany = client.disposalRequest.updateMany
    client.disposalRequest.updateMany = async (args) => {
      const result = await updateMany(args)
      return { count: result.count - 1 }
    }
    return callback(tx)
  }, options)

  await assert.rejects(createDisposalRound(asDb(database), commitInput(state), actor, now), roundError("DISPOSAL_CONCURRENT_UPDATE"))
  assert.equal(state.rounds.length, 0)
  assert.deepEqual(state.requests.map((request) => request.requestStatus), ["approved", "approved"])
})

test("a serialization deadlock (P2034) answers DISPOSAL_CONCURRENT_UPDATE", async () => {
  const state = makeState(1)
  const database = makeDatabase(state)
  database.$transaction = async () => { throw Object.assign(new Error("Transaction failed due to a write conflict or a deadlock"), { code: "P2034" }) }

  await assert.rejects(createDisposalRound(asDb(database), commitInput(state), actor, now), roundError("DISPOSAL_CONCURRENT_UPDATE"))
})

test("an inactive executor and a missing permission are refused for the whole round", async () => {
  const state = makeState(1)
  const database = makeDatabase(state)
  await assert.rejects(
    createDisposalRound(asDb(database), commitInput(state, { executedById: "employee-left" }), actor, now),
    roundError("DISPOSAL_EMPLOYEE_NOT_FOUND"),
  )
  await assert.rejects(
    previewDisposalRound(asDb(database), { mode: "preview", requestIds: [uuid(1)] }, { ...actor, permissions: ["disposal:view"] }),
    roundError("DISPOSAL_FORBIDDEN"),
  )
  assert.equal(state.rounds.length, 0)
})

test("the lump price is kept only for a sale", async () => {
  const state = makeState(1)
  const database = makeDatabase(state)
  await createDisposalRound(asDb(database), commitInput(state, { disposalType: "destroy", recipientName: null, saleValue: 500, remark: "ทุบทำลาย" }), actor, now)
  assert.equal(state.rounds[0].saleValue, null)
  assert.equal(state.requests[0].disposalType, "destroy")
})
