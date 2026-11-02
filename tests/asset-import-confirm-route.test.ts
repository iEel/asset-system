import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import ExcelJS from "exceljs"

// Group 4 plan 5 Task 2 (P5-R2, P5-R3, P5-R6, P5-R7): the confirm route imports what the preview promised, all or
// nothing, and the template lists only importable statuses and conditions. Route modules import next/server and "@/…",
// which node --test cannot load, so a resolve hook serves stand-ins (as tests/v-track-s.test.ts does). The prisma
// stand-in calls globalThis.__importConfirm.prisma[model][method]; a call with no handler throws, so a test names every
// query its route makes. $transaction is recorded, and runs its work with the same stand-in.
type Handler = (...args: never[]) => unknown
type Db = Record<string, Record<string, Handler>>
type State = { prisma: Db; transactions: unknown[]; inTransaction: boolean }
const state: State = { prisma: {}, transactions: [], inTransaction: false }
;(globalThis as unknown as { __importConfirm: State }).__importConfirm = state

const stubs = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "actor-1", roles: ["system_admin"], permissions: [], employeeId: null } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/db", `
    const state = () => globalThis.__importConfirm
    const call = (model, method) => (...args) => {
      const handler = state().prisma?.[model]?.[method]
      if (!handler) throw new Error("no stand-in for prisma." + model + "." + method)
      return handler(...args)
    }
    export const prisma = new Proxy({}, {
      get: (_, model) => model === "$transaction"
        ? async (work, options) => {
            state().transactions.push(options ?? null)
            state().inTransaction = true
            try { return await work(prisma) } finally { state().inTransaction = false }
          }
        : new Proxy({}, { get: (_, method) => call(model, method) }),
    })
  `],
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

type Route = { POST(request: Request): Promise<Response> }
const loadConfirm = () => import(pathToFileURL("src/app/api/assets/import-confirm/route.ts").href) as Promise<Route>

const batchId = "IMPORT-20261102083015-ASSETS-1A2B"
const headers = [
  "Asset Tag", "Asset Name", "Category Code", "Company Code", "Branch Code", "Current Location Code", "Status", "Condition",
  "Serial Number", "Ownership Type", "Department Code", "Custodian Code",
]
// Row 2: a held บุคคล asset whose holder sits in another department and branch. Row 3: a ส่วนกลาง asset with no tag (the
// server generates it). Row 4: an unknown category (skipped).
const fileRows = [
  ["IMP-1", "Notebook A", "NB", "GL", "HQ", "STORE", "พร้อมใช้งาน", "ดี", "SN-1", "personal", "IT", "E001"],
  ["", "Printer B", "NB", "GL", "HQ", "STORE", "พร้อมใช้งาน", "ดี", "SN-2", "shared", "IT", ""],
  ["IMP-3", "Bad row", "XX", "GL", "HQ", "STORE", "พร้อมใช้งาน", "ดี", "", "shared", "", ""],
]

async function workbookFile(rows: string[][] = fileRows) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Asset Import")
  sheet.addRow(headers)
  for (const row of rows) sheet.addRow(row)
  return new File([await workbook.xlsx.writeBuffer()], "assets.xlsx")
}

async function confirmRequest(fields: Record<string, string | File | undefined>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, value)
  return new Request("http://localhost/api/assets/import-confirm", { method: "POST", body: form })
}

type Writes = {
  assets: Array<Record<string, unknown>>
  movements: Array<Record<string, unknown>>
  logs: Array<Record<string, unknown>>
  batchLogs: Array<Record<string, unknown>>
  outsideTransaction: string[]
  employeeScopeReads: number
}

// The references the parse reads, the batch-used lookup, the tag generator's reads and the writes. `overrides` replaces
// a model's handlers.
function stubDb(overrides: Db = {}): Writes {
  const writes: Writes = { assets: [], movements: [], logs: [], batchLogs: [], outsideTransaction: [], employeeScopeReads: 0 }
  const list = <T>(items: T[]) => ({ findMany: () => items })
  const track = (name: string) => {
    if (!state.inTransaction) writes.outsideTransaction.push(name)
  }
  state.transactions = []
  state.prisma = {
    asset: {
      findMany: ((args: { where?: { assetTag?: unknown } }) => (args?.where?.assetTag ? [] : [])) as Handler,
      createMany: ((args: { data: Array<Record<string, unknown>> }) => {
        track("asset.createMany")
        writes.assets.push(...args.data)
        return { count: args.data.length }
      }) as Handler,
    },
    assetCategory: { findMany: () => [{ id: "cat-1", code: "NB" }], findUnique: () => ({ code: "NB" }) },
    company: { findMany: () => [{ id: "c1", code: "GL" }], findUnique: () => ({ code: "GL", assetTagCode: null }) },
    branch: { findMany: () => [{ id: "b1", code: "HQ", companyId: "c1" }], findUnique: () => ({ code: "HQ" }) },
    department: list([{ id: "d-file", code: "IT", companyId: "c1" }, { id: "d-holder", code: "HR", companyId: "c1" }]),
    location: list([{ id: "l1", code: "STORE", branchId: "b1" }]),
    assetStatus: list([{ id: "s-ready", name: "Ready", nameTh: "พร้อมใช้งาน" }]),
    assetCondition: list([{ id: "k-good", name: "Good", nameTh: "ดี" }]),
    assetBrand: list([]),
    assetModel: list([]),
    supplier: list([]),
    employee: {
      findMany: ((args: { select?: Record<string, unknown> }) => {
        if (args?.select?.companyId) {
          writes.employeeScopeReads += 1
          return [{ id: "e1", companyId: "c1", branchId: "b2", company: { code: "GL", nameTh: "จีลิงค์" }, branch: { code: "CNX", name: "Chiang Mai" } }]
        }
        return [{ id: "e1", code: "E001", departmentId: "d-holder" }]
      }) as Handler,
    },
    systemSetting: { findUnique: () => null },
    systemLog: {
      findFirst: () => null,
      createMany: ((args: { data: Array<Record<string, unknown>> }) => {
        track("systemLog.createMany")
        writes.logs.push(...args.data)
        return { count: args.data.length }
      }) as Handler,
      create: ((args: { data: Record<string, unknown> }) => {
        track("systemLog.create")
        writes.batchLogs.push(args.data)
        return { id: "log-batch" }
      }) as Handler,
    },
    assetMovement: {
      createMany: ((args: { data: Array<Record<string, unknown>> }) => {
        track("assetMovement.createMany")
        writes.movements.push(...args.data)
        return { count: args.data.length }
      }) as Handler,
    },
  }
  for (const [model, handlers] of Object.entries(overrides)) state.prisma[model] = { ...state.prisma[model], ...handlers }
  return writes
}

test("an expected count the file no longer gives is refused with the fresh preview, and nothing is written (Review Focus 2)", async (t) => {
  t.mock.method(console, "error", () => {})
  const { POST } = await loadConfirm()
  stubDb()
  const response = await POST(await confirmRequest({ file: await workbookFile(), batchId, expectedReadyRows: "3" }))
  assert.equal(response.status, 409)
  const body = await response.json() as {
    error: string
    code: string
    preview: { summary: unknown; rows: Array<Record<string, unknown>>; mapping: unknown[]; batch: { batchId: string; readyRows: number } }
  }
  assert.equal(body.code, "previewChanged")
  assert.equal(typeof body.error, "string")
  assert.deepEqual(body.preview.summary, { totalRows: 3, readyRows: 2, errorRows: 1 })
  assert.equal(body.preview.rows.length, 3)
  assert.equal(body.preview.rows.some((row) => "resolved" in row), false)
  assert.equal(body.preview.mapping.length > 0, true)
  assert.equal(body.preview.batch.readyRows, 2)
  assert.match(body.preview.batch.batchId, /^IMPORT-\d{14}-[A-Z0-9-]{1,24}-[0-9A-Z]{4}$/)
  assert.equal(state.transactions.length, 0)
})

test("a batch id that already has a batch log is refused before anything is written", async (t) => {
  t.mock.method(console, "error", () => {})
  const { POST } = await loadConfirm()
  const lookups: unknown[] = []
  stubDb({ systemLog: { findFirst: ((args: unknown) => { lookups.push(args); return { id: "log-earlier" } }) as Handler } })
  const response = await POST(await confirmRequest({ file: await workbookFile(), batchId, expectedReadyRows: "2" }))
  assert.equal(response.status, 409)
  const body = await response.json() as { error: string; code: string }
  assert.equal(body.code, "batchUsed")
  assert.equal(typeof body.error, "string")
  assert.deepEqual(lookups[0], { where: { module: "asset", action: "import_batch", recordId: batchId }, select: { id: true } })
  assert.equal(state.transactions.length, 0)
})

test("a malformed batch id or expected count is refused with 400 before the file is read", async (t) => {
  t.mock.method(console, "error", () => {})
  const { POST } = await loadConfirm()
  const invalid = { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { _form: "invalid" } }
  for (const fields of [
    { batchId: "IMPORT-1", expectedReadyRows: "2" },
    { batchId: `${batchId}' OR 1=1`, expectedReadyRows: "2" },
    { expectedReadyRows: "2" },
    { batchId },
    { batchId, expectedReadyRows: "two" },
    { batchId, expectedReadyRows: "-1" },
  ]) {
    state.prisma = {}
    const response = await POST(await confirmRequest({ file: await workbookFile(), ...fields }))
    assert.equal(response.status, 400, JSON.stringify(fields))
    assert.deepEqual(await response.json(), invalid)
  }
})

test("a unique clash inside the transaction rolls the whole batch back and answers 409", async (t) => {
  t.mock.method(console, "error", () => {})
  const { POST } = await loadConfirm()
  stubDb({ asset: { createMany: (() => { throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" }) }) as Handler } })
  const response = await POST(await confirmRequest({ file: await workbookFile(), batchId, expectedReadyRows: "2" }))
  assert.equal(response.status, 409)
  const body = await response.json() as { error: string; code: string }
  assert.equal(body.code, "changedDuringImport")
  assert.equal(typeof body.error, "string")
  assert.equal(state.transactions.length, 1)
})

test("a confirm writes every asset, movement and log and the batch log in one transaction, with the skipped rows and the holder's department", async (t) => {
  t.mock.method(console, "error", () => {})
  const { POST } = await loadConfirm()
  const batchLookups: unknown[] = []
  const writes = stubDb({ systemLog: { findFirst: ((args: unknown) => { batchLookups.push(args); return null }) as Handler } })
  const response = await POST(await confirmRequest({ file: await workbookFile(), batchId, expectedReadyRows: "2" }))
  assert.equal(response.status, 200)
  const body = await response.json() as { batchId: string; imported: number; skipped: number; assets: Array<{ id: string; assetTag: string }> }
  assert.equal(body.batchId, batchId)
  assert.equal(body.imported, 2)
  assert.equal(body.skipped, 1)
  assert.deepEqual(Object.keys(body).sort(), ["assets", "batchId", "imported", "skipped"])
  assert.equal(body.assets.length, 2)
  assert.equal(body.assets[0].assetTag, "IMP-1")
  // The blank tag was generated before the transaction, and is not the file's tag.
  assert.equal(typeof body.assets[1].assetTag, "string")
  assert.ok(body.assets[1].assetTag.length > 0)
  assert.notEqual(body.assets[1].assetTag, "IMP-1")

  // One transaction with the plan's options; the used-batch check runs again inside it (a double confirm in flight).
  assert.deepEqual(state.transactions, [{ maxWait: 10_000, timeout: 120_000 }])
  assert.equal(batchLookups.length, 2)
  assert.deepEqual(writes.outsideTransaction, [])

  // The assets carry the ids the answer names; the held บุคคล row takes the holder's department, the ส่วนกลาง row keeps
  // the file's (P5-R6).
  assert.deepEqual(writes.assets.map((asset) => asset.id), body.assets.map((asset) => asset.id))
  assert.deepEqual(writes.assets.map((asset) => asset.assetTag), body.assets.map((asset) => asset.assetTag))
  assert.equal(writes.assets[0].departmentId, "d-holder")
  assert.equal(writes.assets[0].custodianId, "e1")
  assert.equal(writes.assets[1].departmentId, "d-file")
  for (const asset of writes.assets) {
    assert.equal(asset.isActive, true)
    assert.equal(asset.createdBy, "actor-1")
    assert.equal(asset.updatedBy, "actor-1")
    assert.match(String(asset.id), /^[0-9a-f-]{36}$/)
  }

  assert.deepEqual(writes.movements.map((movement) => [movement.assetId, movement.movementType, movement.referenceType, movement.toValue]), [
    [body.assets[0].id, "import", "asset_import", "l1"],
    [body.assets[1].id, "import", "asset_import", "l1"],
  ])

  // The per-asset logs: the department the asset got, and the holder's scope as create writes it (X10).
  assert.equal(writes.logs.length, 2)
  const firstLog = JSON.parse(String(writes.logs[0].newValue)) as Record<string, unknown>
  assert.equal(writes.logs[0].action, "import")
  assert.equal(writes.logs[0].recordId, body.assets[0].id)
  assert.equal(firstLog.departmentId, "d-holder")
  assert.equal(firstLog.batchId, batchId)
  assert.equal(firstLog.sourceRow, 2)
  assert.equal(firstLog.sourceFile, "assets.xlsx")
  assert.deepEqual(firstLog.custodianScope, {
    crossCompanyCustodian: false, crossBranchCustodian: true, assetCompanyId: "c1", assetBranchId: "b1", custodianId: "e1",
    custodianCompanyId: "c1", custodianBranchId: "b2", custodianCompanyLabel: "GL - จีลิงค์", custodianBranchLabel: "CNX - Chiang Mai",
  })
  assert.equal(JSON.parse(String(writes.logs[1].newValue)).custodianScope, null)
  assert.equal(writes.employeeScopeReads, 1)

  // The batch log, inside the same transaction: counts, the rollback plan (kept for the later undo) and the skipped row.
  assert.equal(writes.batchLogs.length, 1)
  assert.equal(writes.batchLogs[0].action, "import_batch")
  assert.equal(writes.batchLogs[0].recordId, batchId)
  const batchValue = JSON.parse(String(writes.batchLogs[0].newValue)) as Record<string, unknown> & {
    rollbackPlan: { assetCount: number }
    skippedRows: Array<{ row: number; name: string | null; assetTag: string | null; issues: Array<{ code: string; field: string }> }>
  }
  assert.equal(batchValue.batchId, batchId)
  assert.equal(batchValue.imported, 2)
  assert.equal(batchValue.skipped, 1)
  assert.equal(batchValue.approvedBy, "actor-1")
  assert.equal(batchValue.rollbackPlan.assetCount, 2)
  assert.equal(batchValue.skippedRowsHidden, 0)
  assert.deepEqual(batchValue.skippedRows.map((row) => [row.row, row.name, row.assetTag]), [[4, "Bad row", "IMP-3"]])
  assert.deepEqual(batchValue.skippedRows[0].issues.map((issue) => [issue.code, issue.field]), [["notFound", "categoryCode"]])
})

// Group 4 plan 5 final review: "Shared" passes the check without case, so it is written as shared (not personal) and
// keeps the file's department although the row names a holder (the ส่วนกลาง rule, P5-R6).
test("a capitalised ownership type is written as the checked lower-case value, with its department rule", async (t) => {
  t.mock.method(console, "error", () => {})
  const { POST } = await loadConfirm()
  const writes = stubDb()
  const rows = [["IMP-9", "Shared printer", "NB", "GL", "HQ", "STORE", "พร้อมใช้งาน", "ดี", "SN-9", "Shared", "IT", "E001"]]
  const response = await POST(await confirmRequest({ file: await workbookFile(rows), batchId, expectedReadyRows: "1" }))
  assert.equal(response.status, 200)
  assert.equal(writes.assets.length, 1)
  assert.equal(writes.assets[0].ownershipType, "shared")
  assert.equal(writes.assets[0].departmentId, "d-file")
  assert.equal(writes.assets[0].custodianId, "e1")
})

test("the template lists only importable statuses and conditions, and its example row uses them (P5-R5)", async (t) => {
  t.mock.method(console, "error", () => {})
  const { GET } = await (import(pathToFileURL("src/app/api/assets/import-template/route.ts").href) as Promise<{ GET(): Promise<Response> }>)
  const list = <T>(items: T[]) => ({ findMany: () => items })
  state.prisma = {
    company: list([{ code: "GL", nameTh: "จีลิงค์" }]),
    branch: list([{ code: "HQ", name: "Head office", company: { code: "GL" } }]),
    department: list([]),
    location: list([{ code: "STORE", name: "Store", branch: { code: "HQ", company: { code: "GL" } } }]),
    assetCategory: list([{ code: "NB", name: "Notebook" }]),
    assetBrand: list([]),
    assetModel: list([]),
    assetStatus: list([
      { nameTh: "ใช้งานอยู่", name: "In Use" },
      { nameTh: "ร่าง", name: "Draft" },
      { nameTh: "พร้อมใช้งาน", name: "Ready" },
      { nameTh: "จำหน่ายแล้ว", name: "Disposed" },
    ]),
    assetCondition: list([
      { nameTh: "สูญหาย", name: "Lost" },
      { nameTh: "ใหม่", name: "New" },
      { nameTh: "ดี", name: "Good" },
    ]),
    employee: list([]),
    supplier: list([]),
  }
  const response = await GET()
  assert.equal(response.status, 200)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await response.arrayBuffer())
  const sheetValues = (name: string) => {
    const sheet = workbook.getWorksheet(name)!
    const rows: unknown[][] = []
    sheet.eachRow((row, rowNumber) => { if (rowNumber > 1) rows.push((row.values as unknown[]).slice(1)) })
    return rows
  }
  assert.deepEqual(sheetValues("Statuses"), [["ร่าง", "Draft"], ["พร้อมใช้งาน", "Ready"]])
  assert.deepEqual(sheetValues("Conditions"), [["ใหม่", "New"], ["ดี", "Good"]])
  const template = workbook.getWorksheet("Asset Import")!
  const header = (template.getRow(1).values as unknown[]).slice(1)
  const example = template.getRow(2)
  assert.equal(example.getCell(header.indexOf("Status") + 1).value, "พร้อมใช้งาน")
  assert.equal(example.getCell(header.indexOf("Condition") + 1).value, "ดี")
})
