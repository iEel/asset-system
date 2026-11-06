import assert from "node:assert/strict"
import test from "node:test"

import {
  chunkEmployeePageIds,
  employeeHeldPageSize,
  isEmployeeLoanOverdue,
  parseEmployeeHeldPage,
  readEmployeePage,
  readEmployeeReturnBatch,
  employeeReturnBatchReadLimit,
  type EmployeePageDb,
} from "../src/lib/employee-page-data.ts"

// Group 7 plan 2 Task 2: the employee page's read model through a fake db that evaluates the reader's own where,
// orderBy, skip and take (Review Focus 1, 2, 3, 5; G7P2-R1, R2, R4).

type Row = Record<string, unknown>

const operatorKeys = new Set(["in", "notIn", "lt", "lte", "gt", "not", "startsWith"])

function matchesCondition(value: unknown, condition: Row): boolean {
  for (const [op, expected] of Object.entries(condition)) {
    if (op === "in" && !(expected as unknown[]).includes(value)) return false
    if (op === "notIn" && (expected as unknown[]).includes(value)) return false
    if (op === "lt" && !(value instanceof Date && value.getTime() < (expected as Date).getTime())) return false
    if (op === "lte" && !(value instanceof Date && value.getTime() <= (expected as Date).getTime())) return false
    if (op === "not" && value === expected) return false
    if (op === "startsWith" && !(typeof value === "string" && value.startsWith(expected as string))) return false
  }
  return true
}

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true
  for (const [key, condition] of Object.entries(where)) {
    if (key === "OR") {
      if (!(condition as Row[]).some((part) => matches(row, part))) return false
      continue
    }
    const value = row[key]
    if (condition !== null && typeof condition === "object" && !(condition instanceof Date)) {
      const keys = Object.keys(condition)
      // A to-many relation filter: the fake attaches the related rows as an array.
      if (keys.length === 1 && (keys[0] === "some" || keys[0] === "none")) {
        const any = ((value as Row[] | undefined) ?? []).some((related) => matches(related, (condition as Row)[keys[0]] as Row))
        if (keys[0] === "some" ? !any : any) return false
        continue
      }
      if (keys.length > 0 && keys.every((k) => operatorKeys.has(k))) {
        if (!matchesCondition(value, condition as Row)) return false
      } else if (!value || !matches(value as Row, condition as Row)) return false
      continue
    }
    if (value !== condition) return false
  }
  return true
}

function pathValue(row: Row, order: Row): [unknown, string] {
  const [key, direction] = Object.entries(order)[0]
  if (direction && typeof direction === "object") return pathValue(row[key] as Row, direction as Row)
  return [row[key], direction as string]
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return String(a).localeCompare(String(b))
}

function query(rows: Row[], args: { where?: Row; orderBy?: Row | Row[]; skip?: number; take?: number }): Row[] {
  const orders = args.orderBy ? (Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]) : []
  const sorted = rows.filter((row) => matches(row, args.where)).sort((left, right) => {
    for (const order of orders) {
      const [a, direction] = pathValue(left, order)
      const [b] = pathValue(right, order)
      const result = compare(a, b)
      if (result !== 0) return direction === "desc" ? -result : result
    }
    return 0
  })
  const skip = args.skip ?? 0
  return sorted.slice(skip, args.take === undefined ? undefined : skip + args.take)
}

type FakeData = {
  employees: Row[]
  assets?: Row[]
  checkouts?: Row[]
  repairs?: Row[]
  components?: Row[]
  auditItems?: Row[]
  auditRounds?: Row[]
  users?: Row[]
}

function fakeDb(data: FakeData) {
  const calls = { assetFindMany: [] as Row[], userFindFirst: 0, inLists: [] as number[], auditGroupBy: 0 }
  const table = (rows: Row[] = []) => ({
    async findMany(args: Row) {
      const where = args.where as Row | undefined
      for (const value of Object.values(where ?? {})) {
        if (value && typeof value === "object" && "in" in (value as Row)) calls.inLists.push(((value as Row).in as unknown[]).length)
      }
      return query(rows, args)
    },
    async count(args: Row) {
      return query(rows, { where: args.where as Row }).length
    },
    async findFirst(args: Row) {
      return query(rows, { where: args.where as Row })[0] ?? null
    },
  })
  // Each asset carries its checkouts, so `checkouts: { some | none }` reads them.
  const assets = table((data.assets ?? []).map((row) => ({ ...row, checkouts: (data.checkouts ?? []).filter((co) => co.assetId === row.id) })))
  const auditItems = table(data.auditItems)
  const db: EmployeePageDb = {
    employee: table(data.employees),
    asset: {
      async findMany(args: object) {
        calls.assetFindMany.push(args as Row)
        return assets.findMany(args as Row)
      },
      count: (args: object) => assets.count(args as Row),
    },
    assetCheckout: table(data.checkouts),
    assetComponent: table(data.components),
    maintenanceTicket: table(data.repairs),
    auditFinding: table([]),
    auditItem: {
      findMany: (args: object) => auditItems.findMany(args as Row),
      async groupBy(args: object) {
        const { by, where } = args as { by: string[]; where?: Row }
        calls.auditGroupBy += 1
        const groups = new Map<string, Row>()
        for (const row of query(data.auditItems ?? [], { where })) {
          const key = JSON.stringify(by.map((field) => row[field] ?? null))
          const group = groups.get(key) ?? { ...Object.fromEntries(by.map((field) => [field, row[field] ?? null])), _count: { _all: 0 } }
          ;(group._count as { _all: number })._all += 1
          groups.set(key, group)
        }
        return [...groups.values()]
      },
    },
    auditRound: table(data.auditRounds),
    disposalRequest: table([]),
    user: {
      async findFirst(args: object) {
        calls.userFindFirst += 1
        return table(data.users).findFirst(args as Row)
      },
    },
    attachment: table([]),
  }
  return { db, calls }
}

const now = new Date("2026-11-06T03:00:00.000Z") // 10:00 Bangkok, 6 Nov 2026

function employee(overrides: Row = {}): Row {
  return {
    id: "emp-1",
    code: "EMP-00142",
    fullNameTh: "สมชาย ใจดี",
    employmentStatus: "active",
    isActive: true,
    subordinates: [],
    ...overrides,
  }
}

const statuses: Record<string, Row> = {
  "In Use": { name: "In Use", nameTh: "ใช้งานอยู่", colorCode: null },
  "Checked Out": { name: "Checked Out", nameTh: "ยืมออก", colorCode: null },
  "Under Maintenance": { name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม", colorCode: null },
  "Pending Disposal": { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย", colorCode: null },
}

function asset(id: string, tag: string, overrides: Row = {}): Row {
  return {
    id,
    assetTag: tag,
    name: `เครื่อง ${tag}`,
    modelId: null,
    ownershipType: "personal",
    custodianId: "emp-1",
    isActive: true,
    category: { code: "COM", name: "คอมพิวเตอร์" },
    currentLocation: { code: "L3", name: "ห้องบัญชี ชั้น 3" },
    status: statuses["In Use"],
    condition: { name: "Good", nameTh: "ดี", colorCode: null },
    ...overrides,
  }
}

function checkout(id: string, assetId: string, overrides: Row = {}): Row {
  return {
    id,
    assetId,
    documentNo: `HO-${id}`,
    checkoutType: "user",
    handoverMode: "permanent_assignment",
    custodianId: "emp-1",
    checkoutDate: new Date("2026-09-03T03:00:00.000Z"),
    expectedReturnDate: null,
    isReturned: false,
    transactionStatus: "active",
    ...overrides,
  }
}

test("Review Focus 1: an AD-deactivated employee holding two assets gets the warning with the count", async () => {
  const { db } = fakeDb({
    employees: [employee({ employmentStatus: "resigned", isActive: false })],
    assets: [asset("a-1", "GRL-COM-26-0017"), asset("a-2", "GRL-MON-25-0051")],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  assert.ok(page)
  assert.deepEqual(page.warning, { former: true, heldCount: 2 })
  assert.equal(page.held.total, 2)
  assert.equal(page.counts.currentAssetCount, 2)
})

test("G7P2-R1: a record deactivated by AD alone is former; an active one, or a former one holding nothing, has no warning", async () => {
  const deactivated = fakeDb({ employees: [employee({ isActive: false })], assets: [asset("a-1", "T-1")] })
  assert.deepEqual((await readEmployeePage(deactivated.db, "emp-1", { canViewUsers: false }, { now }))?.warning, { former: true, heldCount: 1 })

  const active = fakeDb({ employees: [employee()], assets: [asset("a-1", "T-1")] })
  assert.equal((await readEmployeePage(active.db, "emp-1", { canViewUsers: false }, { now }))?.warning, null)

  const emptyHanded = fakeDb({ employees: [employee({ employmentStatus: "resigned" })], assets: [asset("a-1", "T-1", { isActive: false })] })
  const page = await readEmployeePage(emptyHanded.db, "emp-1", { canViewUsers: false }, { now })
  assert.equal(page?.warning, null)
  assert.equal(page?.held.total, 0)
  assert.deepEqual(page?.held.rows, [])
})

test("an unknown employee reads as null", async () => {
  const { db } = fakeDb({ employees: [employee()] })
  assert.equal(await readEmployeePage(db, "nobody", { canViewUsers: true }, { now }), null)
})

test("Review Focus 2: a held asset with no handover is ข้อมูลเก่า and returnable; one with a handover carries its document", async () => {
  const { db } = fakeDb({
    employees: [employee()],
    assets: [asset("a-legacy", "GRL-PER-23-0019"), asset("a-ho", "GRL-MON-25-0051")],
    checkouts: [
      checkout("old", "a-ho", { isReturned: true, checkoutDate: new Date("2025-01-01T00:00:00.000Z") }),
      checkout("co-1", "a-ho"),
    ],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  assert.ok(page)
  const [handedOver, legacy] = page.held.rows
  assert.equal(handedOver.assetId, "a-ho")
  assert.equal(legacy.assetId, "a-legacy")

  assert.equal(legacy.legacy, true)
  assert.equal(legacy.handover, null)
  assert.equal(legacy.returnBlock, null)

  assert.equal(handedOver.legacy, false)
  assert.deepEqual(handedOver.handover, {
    id: "co-1",
    documentNo: "HO-co-1",
    kind: "regular",
    checkoutDate: new Date("2026-09-03T03:00:00.000Z"),
    dueDate: null,
  })
  assert.equal(handedOver.returnBlock, null)
})

test("Review Focus 3: under repair and pending disposal get the return form's own block", async () => {
  const { db } = fakeDb({
    employees: [employee()],
    assets: [
      asset("a-repair", "T-1"),
      asset("a-disposal", "T-2", { status: statuses["Pending Disposal"] }),
      asset("a-ok", "T-3"),
    ],
    repairs: [{ id: "mt-1", assetId: "a-repair", isActive: true, repairStatus: "in_progress" }],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  assert.ok(page)
  const byId = new Map(page.held.rows.map((row) => [row.assetId, row]))
  assert.deepEqual(byId.get("a-repair")?.returnBlock, { code: "underRepair", reasonKey: "asset.transactionReasonActiveMaintenance" })
  assert.deepEqual(byId.get("a-disposal")?.returnBlock, { code: "pendingDisposal", reasonKey: "asset.transactionReasonStatusNotReturnable" })
  assert.equal(byId.get("a-ok")?.returnBlock, null)
})

test("a closed repair blocks nothing; an outstanding component is neither ข้อมูลเก่า nor a handover", async () => {
  const { db } = fakeDb({
    employees: [employee()],
    assets: [asset("a-closed", "T-1"), asset("a-comp", "T-2")],
    repairs: [{ id: "mt-1", assetId: "a-closed", isActive: true, repairStatus: "closed" }],
    components: [{ id: "link-1", componentAssetId: "a-comp", referenceId: null, status: "outstanding", removedAt: null, updatedAt: now }],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  const byId = new Map(page!.held.rows.map((row) => [row.assetId, row]))
  assert.equal(byId.get("a-closed")?.returnBlock, null)
  assert.equal(byId.get("a-comp")?.legacy, false)
  assert.equal(byId.get("a-comp")?.handover, null)
  assert.notEqual(byId.get("a-comp")?.returnBlock, null)
})

test("Review Focus 5: more than 25 held assets page at 25 by tag; the total is every one; a page past the end is clamped", async () => {
  const assets = Array.from({ length: 27 }, (_, index) => asset(`a-${index}`, `T-${String(26 - index).padStart(2, "0")}`))
  const { db, calls } = fakeDb({ employees: [employee({ employmentStatus: "resigned" })], assets })

  const first = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  assert.equal(first?.held.total, 27)
  assert.equal(first?.held.page, 1)
  assert.equal(first?.held.pageSize, employeeHeldPageSize)
  assert.equal(first?.held.rows.length, 25)
  assert.equal(first?.held.rows[0].assetTag, "T-00")
  assert.equal(first?.held.rows[24].assetTag, "T-24")
  assert.deepEqual(first?.warning, { former: true, heldCount: 27 })

  const second = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { heldPage: 2, now })
  assert.deepEqual(second?.held.rows.map((row) => row.assetTag), ["T-25", "T-26"])
  assert.equal(second?.held.total, 27)

  const past = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { heldPage: 9, now })
  assert.equal(past?.held.page, 2)
  assert.deepEqual(past?.held.rows.map((row) => row.assetTag), ["T-25", "T-26"])
  // Never a skip past the end; the held reads take one page.
  for (const args of calls.assetFindMany) if ("skip" in args) assert.ok((args.skip as number) <= 25 && args.take === 25)
  // The fact reads' id lists hold the page's ids only.
  assert.ok(calls.inLists.every((length) => length <= 25))
})

test("G7P2-R4: open handovers split into regular and loans; only a loan past its Bangkok due day is overdue", async () => {
  const { db } = fakeDb({
    employees: [employee()],
    assets: [asset("a-1", "T-1"), asset("a-2", "T-2", { status: statuses["Checked Out"] }), asset("a-3", "T-3", { status: statuses["Checked Out"] })],
    checkouts: [
      checkout("perm", "a-1"),
      // Due 5 Nov 23:59 Bangkok: passed.
      checkout("late", "a-2", { handoverMode: "temporary_loan", expectedReturnDate: new Date("2026-11-05T16:59:00.000Z") }),
      // Due 6 Nov 00:00 Bangkok, today: not overdue.
      checkout("today", "a-3", { handoverMode: "temporary_loan", expectedReturnDate: new Date("2026-11-05T17:00:00.000Z") }),
      checkout("returned", "a-3", { handoverMode: "temporary_loan", isReturned: true, expectedReturnDate: new Date("2026-01-01T00:00:00.000Z") }),
      checkout("other", "a-9", { custodianId: "emp-2" }),
    ],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  assert.deepEqual(page?.openHandovers, { regular: 1, loans: 2, overdueLoans: 1 })
  assert.equal(page?.counts.openCheckoutCount, 3)
  const loan = page?.held.rows.find((row) => row.assetId === "a-2")
  assert.equal(loan?.handover?.kind, "loan")
  assert.deepEqual(loan?.handover?.dueDate, new Date("2026-11-05T16:59:00.000Z"))
})

test("isEmployeeLoanOverdue: Bangkok days; no due date is never overdue", () => {
  assert.equal(isEmployeeLoanOverdue(null, now), false)
  assert.equal(isEmployeeLoanOverdue(new Date("2026-11-05T16:59:59.999Z"), now), true)
  assert.equal(isEmployeeLoanOverdue(new Date("2026-11-05T17:00:00.000Z"), now), false)
})

test("the user-account line is read only for a viewer who may view users", async () => {
  const data: FakeData = {
    employees: [employee()],
    users: [{ id: "u-1", username: "somchai", isActive: false, employeeId: "emp-1" }],
  }
  const allowed = fakeDb(data)
  assert.deepEqual((await readEmployeePage(allowed.db, "emp-1", { canViewUsers: true }, { now }))?.account, { username: "somchai", isActive: false })

  const denied = fakeDb(data)
  assert.equal((await readEmployeePage(denied.db, "emp-1", { canViewUsers: false }, { now }))?.account, null)
  assert.equal(denied.calls.userFindFirst, 0)

  const none = fakeDb({ employees: [employee()] })
  assert.equal((await readEmployeePage(none.db, "emp-1", { canViewUsers: true }, { now }))?.account, null)
})

test("each held asset's last audit is its latest round's item, skipping a cancelled or deactivated round", async () => {
  const round = (id: string, auditNo: string, startDate: string, overrides: Row = {}) =>
    ({ id, auditNo, startDate: new Date(startDate), isActive: true, status: "open", ...overrides })
  const item = (assetId: string, auditRound: Row, overrides: Row = {}) =>
    ({ assetId, auditRound, auditStatus: "checked", auditResult: "matched", lastScanAt: new Date("2026-10-10T03:00:00.000Z"), createdAt: auditRound.startDate, ...overrides })
  const { db } = fakeDb({
    employees: [employee()],
    assets: [asset("a-1", "T-1"), asset("a-2", "T-2"), asset("a-3", "T-3")],
    auditItems: [
      item("a-1", round("r-old", "AUD-2025-0001", "2025-10-01T00:00:00.000Z"), { auditResult: "location_mismatch" }),
      item("a-1", round("r-new", "AUD-2026-0003", "2026-10-01T00:00:00.000Z")),
      item("a-1", round("r-cancel", "AUD-2026-0009", "2026-11-01T00:00:00.000Z", { status: "cancelled" })),
      item("a-2", round("r-new", "AUD-2026-0003", "2026-10-01T00:00:00.000Z"), { auditStatus: "pending", auditResult: null, lastScanAt: null }),
      item("a-3", round("r-gone", "AUD-2026-0010", "2026-11-02T00:00:00.000Z", { isActive: false })),
    ],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  const byId = new Map(page!.held.rows.map((row) => [row.assetId, row]))
  assert.deepEqual(byId.get("a-1")?.lastAudit, {
    roundId: "r-new",
    roundNo: "AUD-2026-0003",
    result: "matched",
    status: "checked",
    checkedAt: new Date("2026-10-10T03:00:00.000Z"),
  })
  assert.deepEqual(byId.get("a-2")?.lastAudit, { roundId: "r-new", roundNo: "AUD-2026-0003", result: null, status: "pending", checkedAt: null })
  assert.equal(byId.get("a-3")?.lastAudit, null)
})

test("parseEmployeeHeldPage: a positive whole number, else 1", () => {
  assert.equal(parseEmployeeHeldPage(undefined), 1)
  assert.equal(parseEmployeeHeldPage("3"), 3)
  assert.equal(parseEmployeeHeldPage(["2", "5"]), 2)
  for (const bad of ["0", "-1", "1.5", "abc", "", "99999999999999999999"]) assert.equal(parseEmployeeHeldPage(bad), 1, bad)
})

test("chunkEmployeePageIds: lists of 2,000 at most", () => {
  const ids = Array.from({ length: 4001 }, (_, index) => `id-${index}`)
  assert.deepEqual(chunkEmployeePageIds(ids).map((chunk) => chunk.length), [2000, 2000, 1])
  assert.deepEqual(chunkEmployeePageIds([]), [])
})

test("group 7 plan 4: the multi-return reads every held asset (not paged) with the outstanding-component and open-repair facts", async () => {
  const assets = Array.from({ length: 27 }, (_, index) => asset(`a-${index}`, `T-${String(index).padStart(2, "0")}`))
  const { db } = fakeDb({
    employees: [employee({ employmentStatus: "resigned", isActive: false })],
    assets,
    repairs: [{ id: "mt-1", assetId: "a-1", isActive: true, repairStatus: "in_progress" }],
    components: [{ id: "link-1", componentAssetId: "a-2", referenceId: "ci-1", status: "outstanding", removedAt: null, updatedAt: now }],
  })
  const batch = await readEmployeeReturnBatch(db, "emp-1")
  assert.ok(batch)
  assert.equal(batch.total, 27)
  assert.equal(batch.rows.length, 27)
  assert.deepEqual({ id: batch.employee.id, isActive: batch.employee.isActive }, { id: "emp-1", isActive: false })
  const byId = new Map(batch.rows.map((row) => [row.assetId, row]))
  assert.equal(byId.get("a-1")?.openRepair, true)
  assert.equal(byId.get("a-2")?.outstandingComponent, true)
  assert.equal(byId.get("a-3")?.openRepair, false)
  assert.equal(byId.get("a-3")?.outstandingComponent, false)
  assert.equal(employeeReturnBatchReadLimit, 200)
  assert.equal(await readEmployeeReturnBatch(db, "nobody"), null)
})

// Group 7 follow-ups Task 3 (G7F-R4): the board items of the employee page.

test("G7F-R4: held totals with and without a handover count every held asset, not the page", async () => {
  const assets = Array.from({ length: 30 }, (_, index) => asset(`a-${index}`, `T-${String(index).padStart(2, "0")}`))
  const { db } = fakeDb({
    employees: [employee()],
    assets: [...assets, asset("a-gone", "T-99", { isActive: false })],
    checkouts: [
      checkout("co-1", "a-1"),
      // Past the first page: still counted.
      checkout("co-28", "a-28"),
      checkout("co-29", "a-29", { handoverMode: "temporary_loan" }),
      // Returned or cancelled handovers are no handover.
      checkout("co-2", "a-2", { isReturned: true }),
      checkout("co-3", "a-3", { transactionStatus: "cancelled" }),
      checkout("co-gone", "a-gone"),
    ],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  assert.equal(page?.held.total, 30)
  assert.deepEqual(page?.heldHandoverSplit, { withHandover: 3, withoutHandover: 27 })
})

test("G7F-R4: ตรวจนับรอบปัจจุบัน counts the held assets' items in open rounds only, per round, with found / mismatch / not found / pending", async () => {
  const heldAsset = { custodianId: "emp-1", isActive: true }
  const round = (id: string, overrides: Row = {}) => ({ id, isActive: true, status: "open", ...overrides })
  const item = (auditRoundId: string, auditStatus: string, auditResult: string | null, overrides: Row = {}) =>
    ({ auditRoundId, auditStatus, auditResult, asset: heldAsset, auditRound: round(auditRoundId), ...overrides })
  const { db, calls } = fakeDb({
    employees: [employee()],
    auditItems: [
      item("r-open", "scanned", "found"),
      item("r-open", "scanned", "location_mismatch"),
      item("r-open", "reviewed", "not_found"),
      item("r-open", "pending", null),
      item("r-open", "pending", null),
      // Out of scope is not one of the round's own items.
      item("r-open", "scanned", "out_of_scope"),
      // Someone else's asset, a deactivated asset.
      item("r-open", "scanned", "found", { asset: { custodianId: "emp-2", isActive: true } }),
      item("r-open", "scanned", "found", { asset: { custodianId: "emp-1", isActive: false } }),
      // An old draft round is open too.
      item("r-draft", "pending", null, { auditRound: round("r-draft", { status: "draft" }) }),
      item("r-closed", "scanned", "found", { auditRound: round("r-closed", { status: "closed" }) }),
      item("r-cancel", "scanned", "found", { auditRound: round("r-cancel", { status: "cancelled" }) }),
      item("r-off", "scanned", "found", { auditRound: round("r-off", { isActive: false }) }),
    ],
    auditRounds: [
      { id: "r-open", auditNo: "AUD-2026-0003", name: "ตรวจนับประจำปี 2569", startDate: new Date("2026-10-01T00:00:00.000Z"), endDate: new Date("2026-10-31T00:00:00.000Z") },
      { id: "r-draft", auditNo: "AUD-2026-0001", name: "รอบเก่า", startDate: new Date("2026-01-01T00:00:00.000Z"), endDate: new Date("2026-01-31T00:00:00.000Z") },
      { id: "r-closed", auditNo: "AUD-2025-0001", name: "ปิดแล้ว", startDate: new Date("2025-01-01T00:00:00.000Z"), endDate: new Date("2025-01-31T00:00:00.000Z") },
    ],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  assert.equal(calls.auditGroupBy, 1, "one grouped count, no item rows loaded")
  assert.deepEqual(page?.currentAudits, [
    { roundId: "r-open", auditNo: "AUD-2026-0003", name: "ตรวจนับประจำปี 2569", endDate: new Date("2026-10-31T00:00:00.000Z"), total: 5, found: 1, mismatch: 1, notFound: 1, pending: 2 },
    { roundId: "r-draft", auditNo: "AUD-2026-0001", name: "รอบเก่า", endDate: new Date("2026-01-31T00:00:00.000Z"), total: 1, found: 0, mismatch: 0, notFound: 0, pending: 1 },
  ])

  const none = fakeDb({ employees: [employee()] })
  assert.deepEqual((await readEmployeePage(none.db, "emp-1", { canViewUsers: false }, { now }))?.currentAudits, [])
})

test("G7F-R4: a held row carries its open repair's number and id, the latest open one; a closed repair is none", async () => {
  const { db } = fakeDb({
    employees: [employee()],
    assets: [asset("a-1", "T-1"), asset("a-2", "T-2")],
    repairs: [
      { id: "mt-old", repairNo: "MT-20260901-0001", assetId: "a-1", isActive: true, repairStatus: "in_progress", reportedDate: new Date("2026-09-01T00:00:00.000Z") },
      { id: "mt-new", repairNo: "MT-20261014-0002", assetId: "a-1", isActive: true, repairStatus: "waiting_parts", reportedDate: new Date("2026-10-14T00:00:00.000Z") },
      { id: "mt-done", repairNo: "MT-20261001-0001", assetId: "a-2", isActive: true, repairStatus: "closed", reportedDate: new Date("2026-10-01T00:00:00.000Z") },
    ],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  const byId = new Map(page!.held.rows.map((row) => [row.assetId, row]))
  assert.deepEqual(byId.get("a-1")?.openRepairRecord, { id: "mt-new", repairNo: "MT-20261014-0002" })
  assert.equal(byId.get("a-1")?.openRepair, true)
  assert.equal(byId.get("a-2")?.openRepairRecord, null)
  assert.equal(byId.get("a-2")?.openRepair, false)
})

test("G7F-R4: โอนย้าย carries the transfer form's own refusal (an open handover is returned first); a legacy holding moves", async () => {
  const { db } = fakeDb({
    employees: [employee()],
    assets: [asset("a-ho", "T-1"), asset("a-legacy", "T-2"), asset("a-license", "T-3", { ownershipType: "software_license" })],
    checkouts: [checkout("co-1", "a-ho")],
  })
  const page = await readEmployeePage(db, "emp-1", { canViewUsers: false }, { now })
  const byId = new Map(page!.held.rows.map((row) => [row.assetId, row]))
  assert.equal(byId.get("a-ho")?.transferBlockReasonKey, "asset.transactionReasonOpenCheckout")
  assert.equal(byId.get("a-legacy")?.transferBlockReasonKey, null)
  assert.equal(byId.get("a-license")?.transferBlockReasonKey, "asset.transactionReasonLicenseMove")
})
