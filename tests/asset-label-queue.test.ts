import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, describe, test } from "node:test"
import { pathToFileURL } from "node:url"

import {
  LABEL_REPRINT_CANDIDATE_CAP,
  listLabelPrintQueue,
  lookupLabelPrintRows,
  parseLabelQueueRequest,
  type LabelQueueDb,
  type LabelQueueParams,
} from "../src/lib/asset-label-queue.ts"

// The labels queue (group 4 plan 6 Task 1, P6-R6, P6-R7, P6-R11). The db is an in-memory fake that reads the where,
// orderBy, skip, take and select the lib sends, so the answers come from the same Prisma shapes the route sends.

type FakePrint = { id: string; assetTag: string; printedAt: Date }
type FakeAsset = {
  id: string
  assetTag: string
  name: string
  ownershipType: string
  isActive: boolean
  createdAt: Date
  companyId: string
  branchId: string
  categoryId: string
  currentLocationId: string
  custodian: { code: string; fullNameTh: string; fullNameEn: string | null } | null
  currentLocation: { code: string; name: string }
  company: { code: string; nameTh: string; nameEn: string | null }
  branch: { code: string; name: string }
  category: { code: string; name: string }
  labelPrints: FakePrint[]
  movements: Array<{ movementType: string }>
}

function fakeAsset(id: string, overrides: Partial<FakeAsset> = {}): FakeAsset {
  return {
    id,
    assetTag: `TAG-${id}`,
    name: `โน้ตบุ๊ก ${id}`,
    ownershipType: "personal",
    isActive: true,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    companyId: "company-1",
    branchId: "branch-1",
    categoryId: "category-1",
    currentLocationId: "location-1",
    custodian: { code: "E001", fullNameTh: "สมชาย ใจดี", fullNameEn: "Somchai Jaidee" },
    currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" },
    company: { code: "GRL", nameTh: "จีแอลอาร์", nameEn: "GLR" },
    branch: { code: "HQ", name: "สำนักงานใหญ่" },
    category: { code: "COM", name: "คอมพิวเตอร์" },
    labelPrints: [],
    movements: [],
    ...overrides,
  }
}

function printed(id: string, assetTag: string, printedAt: string): FakePrint {
  return { id, assetTag, printedAt: new Date(printedAt) }
}
const tagChange = { movementType: "asset_tag_change" }

type Where = Record<string, unknown>
type Args = { where?: Where; orderBy?: Array<Record<string, unknown>>; skip?: number; take?: number; select?: Record<string, unknown> }

function matches(asset: FakeAsset, where: Where): boolean {
  for (const [key, value] of Object.entries(where)) {
    const condition = value as Record<string, unknown>
    if (key === "isActive") { if (asset.isActive !== value) return false; continue }
    if (key === "id") { if (!(condition.in as string[]).includes(asset.id)) return false; continue }
    if (key === "companyId" || key === "branchId" || key === "categoryId" || key === "currentLocationId") {
      if (asset[key] !== value) return false
      continue
    }
    if (key === "labelPrints") {
      if ("none" in condition && asset.labelPrints.length > 0) return false
      if ("some" in condition && asset.labelPrints.length === 0) return false
      continue
    }
    if (key === "movements") {
      const some = condition.some as { movementType: string }
      if (!asset.movements.some((movement) => movement.movementType === some.movementType)) return false
      continue
    }
    if (key === "createdAt") {
      const range = condition as { gte?: Date; lte?: Date }
      if (range.gte && asset.createdAt < range.gte) return false
      if (range.lte && asset.createdAt > range.lte) return false
      continue
    }
    throw new Error(`fake db: unknown where key ${key}`)
  }
  return true
}

function sortValue(asset: FakeAsset, order: Record<string, unknown>): [string | number, "asc" | "desc"] {
  const [key, direction] = Object.entries(order)[0]
  if (key === "assetTag") return [asset.assetTag, direction as "asc" | "desc"]
  if (key === "createdAt") return [asset.createdAt.getTime(), direction as "asc" | "desc"]
  if (key === "currentLocation") return [asset.currentLocation.code, (direction as { code: "asc" }).code]
  if (key === "category") return [asset.category.code, (direction as { code: "asc" }).code]
  throw new Error(`fake db: unknown orderBy ${key}`)
}

function latestPrints(asset: FakeAsset, args: { orderBy?: unknown; take?: number }) {
  assert.deepEqual(args.orderBy, [{ printedAt: "desc" }, { id: "desc" }])
  const sorted = [...asset.labelPrints].sort((left, right) => right.printedAt.getTime() - left.printedAt.getTime() || right.id.localeCompare(left.id))
  return sorted.slice(0, args.take ?? sorted.length)
}

function project(asset: FakeAsset, select: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(select)) {
    if (value === true) { out[key] = asset[key as keyof FakeAsset]; continue }
    const nested = value as { select: Record<string, true>; orderBy?: unknown; take?: number }
    if (key === "labelPrints") {
      out[key] = latestPrints(asset, nested).map((print) => pick(print, nested.select))
      continue
    }
    const related = asset[key as keyof FakeAsset] as Record<string, unknown> | null
    out[key] = related === null ? null : pick(related, nested.select)
  }
  return out
}

function pick(source: object, select: Record<string, true>) {
  return Object.fromEntries(Object.keys(select).map((key) => [key, (source as Record<string, unknown>)[key]]))
}

function fakeDb(assets: FakeAsset[]) {
  const calls: Array<{ call: "findMany" | "count"; args: Args }> = []
  const filter = (args: Args) => assets.filter((asset) => matches(asset, args.where ?? {}))
  const db: LabelQueueDb = {
    asset: {
      async findMany(raw: object) {
        const args = raw as Args
        calls.push({ call: "findMany", args })
        const rows = filter(args).sort((left, right) => {
          for (const order of args.orderBy ?? []) {
            const [a, direction] = sortValue(left, order)
            const [b] = sortValue(right, order)
            if (a < b) return direction === "asc" ? -1 : 1
            if (a > b) return direction === "asc" ? 1 : -1
          }
          return 0
        })
        const skip = args.skip ?? 0
        const page = rows.slice(skip, args.take === undefined ? undefined : skip + args.take)
        return page.map((asset) => (args.select ? project(asset, args.select) : asset))
      },
      async count(raw: object) {
        const args = raw as Args
        calls.push({ call: "count", args })
        return filter(args).length
      },
    },
  }
  return { db, calls }
}

const viewer = { roles: ["viewer"], permissions: ["asset:view"] }

function params(overrides: Partial<LabelQueueParams> = {}): LabelQueueParams {
  return { mode: "recent", filters: {}, sort: "asset_tag", pageSize: 20, skip: 0, locale: "th", ...overrides }
}

function numbered(count: number, overrides: (index: number) => Partial<FakeAsset> = () => ({})) {
  return Array.from({ length: count }, (_, index) => {
    const id = String(index + 1).padStart(4, "0")
    return fakeAsset(id, overrides(index))
  })
}

describe("listLabelPrintQueue", () => {
  test("the permission comes before any read: no asset:view is refused with nothing read; system_admin passes", async () => {
    const { db, calls } = fakeDb(numbered(3))
    await assert.rejects(listLabelPrintQueue(db, { roles: ["user"], permissions: ["maintenance:view"] }, params()), /^Error: Forbidden/)
    assert.deepEqual(calls, [])
    const answer = await listLabelPrintQueue(db, { roles: ["system_admin"], permissions: [] }, params())
    assert.equal(answer.total, 3)
  })

  test("total counts every match, ids holds the first 100 in queue order, and the rows are one page", async () => {
    const { db } = fakeDb([...numbered(120), fakeAsset("gone", { isActive: false })])
    const answer = await listLabelPrintQueue(db, viewer, params({ pageSize: 20 }))
    assert.equal(answer.total, 120)
    assert.equal(answer.ids.length, 100)
    assert.deepEqual(answer.ids, numbered(100).map((asset) => asset.id))
    assert.deepEqual(answer.rows.map((row) => row.id), numbered(20).map((asset) => asset.id))
    assert.equal("reprintCapped" in answer, false)
  })

  test("ids follow the sort, the same order as the rows (newest first, then the tag)", async () => {
    const assets = [
      fakeAsset("a", { assetTag: "B-1", createdAt: new Date("2026-10-01T00:00:00.000Z") }),
      fakeAsset("b", { assetTag: "A-1", createdAt: new Date("2026-10-03T00:00:00.000Z") }),
      fakeAsset("c", { assetTag: "A-2", createdAt: new Date("2026-10-01T00:00:00.000Z") }),
    ]
    const { db } = fakeDb(assets)
    const answer = await listLabelPrintQueue(db, viewer, params({ sort: "created_desc" }))
    assert.deepEqual(answer.ids, ["b", "c", "a"])
    assert.deepEqual(answer.rows.map((row) => row.id), ["b", "c", "a"])
  })

  test("skip 10 returns rows 11 to 20, and total and ids do not move with the page", async () => {
    const { db, calls } = fakeDb(numbered(35))
    const answer = await listLabelPrintQueue(db, viewer, params({ pageSize: 10, skip: 10 }))
    assert.deepEqual(answer.rows.map((row) => row.id), numbered(20).slice(10).map((asset) => asset.id))
    assert.equal(answer.total, 35)
    assert.deepEqual(answer.ids, numbered(35).map((asset) => asset.id))
    const rowRead = calls.find((call) => call.call === "findMany" && call.args.skip === 10)
    assert.equal(rowRead?.args.take, 10)
  })

  test("a row carries the plan's shape: names first-class, the holder, the room, the codes and the latest print", async () => {
    const asset = fakeAsset("x", {
      assetTag: "GRL-COM-26-0007",
      ownershipType: "shared",
      labelPrints: [printed("p1", "GRL-COM-26-0007", "2026-10-05T03:00:00.000Z"), printed("p2", "OLD-1", "2026-10-01T03:00:00.000Z")],
    })
    const { db } = fakeDb([asset, fakeAsset("y", { custodian: null, ownershipType: "odd" })])
    const th = await listLabelPrintQueue(db, viewer, params())
    assert.deepEqual(th.rows[0], {
      id: "x",
      assetTag: "GRL-COM-26-0007",
      name: "โน้ตบุ๊ก x",
      ownershipType: "shared",
      holder: { code: "E001", name: "สมชาย ใจดี" },
      location: { code: "IT-2", name: "ห้อง IT ชั้น 2" },
      company: { code: "GRL", name: "จีแอลอาร์" },
      branch: { code: "HQ", name: "สำนักงานใหญ่" },
      category: { code: "COM", name: "คอมพิวเตอร์" },
      lastPrint: { printedAt: "2026-10-05T03:00:00.000Z", assetTag: "GRL-COM-26-0007" },
    })
    assert.equal(th.rows[1].holder, null)
    assert.equal(th.rows[1].lastPrint, null)
    assert.equal(th.rows[1].ownershipType, "personal")
    const en = await listLabelPrintQueue(db, viewer, params({ locale: "en" }))
    assert.deepEqual([en.rows[0].company.name, en.rows[0].holder?.name], ["GLR", "Somchai Jaidee"])
  })

  test("ต้องพิมพ์ใหม่: a re-tag after the last print is listed with the printed tag; case counts; twice is once; never printed is not", async () => {
    const assets = [
      // Printed as A-1, now A-2.
      fakeAsset("retagged", { assetTag: "A-2", labelPrints: [printed("p1", "A-1", "2026-10-01T00:00:00.000Z")], movements: [tagChange] }),
      // Printed as b-1, now B-1: the label shows the old case.
      fakeAsset("case", { assetTag: "B-1", labelPrints: [printed("p2", "b-1", "2026-10-01T00:00:00.000Z")], movements: [tagChange] }),
      // Printed as C-1, then C-2, then C-3 (Review Focus 1).
      fakeAsset("twice", { assetTag: "C-3", labelPrints: [printed("p3", "C-1", "2026-10-01T00:00:00.000Z")], movements: [tagChange, tagChange] }),
      // Re-tagged, never printed: it belongs to ยังไม่เคยพิมพ์.
      fakeAsset("never", { assetTag: "D-2", movements: [tagChange] }),
      // Printed again after the re-tag: the latest print is today's tag.
      fakeAsset("reprinted", {
        assetTag: "E-2",
        labelPrints: [printed("p4", "E-1", "2026-10-01T00:00:00.000Z"), printed("p5", "E-2", "2026-10-02T00:00:00.000Z")],
        movements: [tagChange],
      }),
      // Printed, never re-tagged.
      fakeAsset("same", { assetTag: "F-1", labelPrints: [printed("p6", "F-1", "2026-10-01T00:00:00.000Z")] }),
      // Re-tagged after its print, but inactive.
      fakeAsset("inactive", { assetTag: "G-2", isActive: false, labelPrints: [printed("p7", "G-1", "2026-10-01T00:00:00.000Z")], movements: [tagChange] }),
    ]
    const { db, calls } = fakeDb(assets)
    const answer = await listLabelPrintQueue(db, viewer, params({ mode: "reprint" }))
    assert.deepEqual(answer.rows.map((row) => [row.id, row.assetTag, row.lastPrint?.assetTag]), [
      ["retagged", "A-2", "A-1"],
      ["case", "B-1", "b-1"],
      ["twice", "C-3", "C-1"],
    ])
    assert.equal(answer.total, 3)
    assert.deepEqual(answer.ids, ["retagged", "case", "twice"])
    assert.equal(answer.reprintCapped, false)
    // The candidates are read with Prisma: printed, with an asset_tag_change movement, inside the same filters.
    const candidateRead = calls[0]
    assert.deepEqual(candidateRead.args.where, { isActive: true, labelPrints: { some: {} }, movements: { some: { movementType: "asset_tag_change" } } })
  })

  test("ต้องพิมพ์ใหม่ keeps the filters on the candidates and on the queue", async () => {
    const assets = [
      fakeAsset("in", { assetTag: "A-2", labelPrints: [printed("p1", "A-1", "2026-10-01T00:00:00.000Z")], movements: [tagChange] }),
      fakeAsset("out", { assetTag: "B-2", companyId: "company-2", labelPrints: [printed("p2", "B-1", "2026-10-01T00:00:00.000Z")], movements: [tagChange] }),
    ]
    const { db, calls } = fakeDb(assets)
    const answer = await listLabelPrintQueue(db, viewer, params({ mode: "reprint", filters: { companyId: "company-1" } }))
    assert.deepEqual(answer.ids, ["in"])
    assert.equal((calls[0].args.where as Where).companyId, "company-1")
  })

  test("ต้องพิมพ์ใหม่ with no match reads only the candidates", async () => {
    const { db, calls } = fakeDb([fakeAsset("same", { labelPrints: [printed("p1", "TAG-same", "2026-10-01T00:00:00.000Z")], movements: [tagChange] })])
    const answer = await listLabelPrintQueue(db, viewer, params({ mode: "reprint" }))
    assert.deepEqual(answer, { rows: [], total: 0, ids: [], reprintCapped: false })
    assert.equal(calls.length, 1)
  })

  test(`ต้องพิมพ์ใหม่ caps the matched ids at ${LABEL_REPRINT_CANDIDATE_CAP} (SQL Server's 2,100 parameters) and says so`, async () => {
    assert.equal(LABEL_REPRINT_CANDIDATE_CAP, 2000)
    const assets = numbered(2001, () => ({ labelPrints: [printed("p", "OLD", "2026-10-01T00:00:00.000Z")], movements: [tagChange] }))
    const { db, calls } = fakeDb(assets)
    const answer = await listLabelPrintQueue(db, viewer, params({ mode: "reprint" }))
    assert.equal(answer.reprintCapped, true)
    assert.equal(answer.total, 2000)
    for (const call of calls.slice(1)) assert.equal(((call.args.where as Where).id as { in: string[] }).in.length, 2000)
  })

  test("2,000 matches exactly is not capped", async () => {
    const assets = numbered(2000, () => ({ labelPrints: [printed("p", "OLD", "2026-10-01T00:00:00.000Z")], movements: [tagChange] }))
    const { db } = fakeDb(assets)
    const answer = await listLabelPrintQueue(db, viewer, params({ mode: "reprint" }))
    assert.equal(answer.reprintCapped, false)
    assert.equal(answer.total, 2000)
  })
})

describe("lookupLabelPrintRows", () => {
  test("drops unknown and inactive ids and keeps the given order, in the queue's row shape", async () => {
    const { db, calls } = fakeDb([
      fakeAsset("a"),
      fakeAsset("b", { labelPrints: [printed("p1", "OLD-b", "2026-10-01T00:00:00.000Z")] }),
      fakeAsset("c", { isActive: false }),
    ])
    const answer = await lookupLabelPrintRows(db, ["b", "missing", "c", "a"], "th")
    assert.deepEqual(answer.rows.map((row) => [row.id, row.lastPrint?.assetTag ?? null]), [["b", "OLD-b"], ["a", null]])
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].args.where, { id: { in: ["b", "missing", "c", "a"] }, isActive: true })
  })

  test("no id reads nothing", async () => {
    const { db, calls } = fakeDb([fakeAsset("a")])
    assert.deepEqual(await lookupLabelPrintRows(db, [], "th"), { rows: [] })
    assert.deepEqual(calls, [])
  })
})

describe("parseLabelQueueRequest", () => {
  test("reads the mode, the 6 filters, the sort, the page size and skip", () => {
    const parsed = parseLabelQueueRequest(new URLSearchParams(
      "mode=reprint&companyId=c1&branchId=all&categoryId=k1&locationId=l1&createdFrom=2026-10-01&createdTo=bad&sort=location&pageSize=500&skip=30&locale=en",
    ))
    assert.deepEqual(parsed, {
      kind: "queue",
      params: {
        mode: "reprint",
        filters: { companyId: "c1", categoryId: "k1", locationId: "l1", createdFrom: "2026-10-01" },
        sort: "location",
        pageSize: 100,
        skip: 30,
        locale: "en",
      },
    })
    assert.deepEqual(parseLabelQueueRequest(new URLSearchParams("")), {
      kind: "queue",
      params: { mode: "recent", filters: {}, sort: "created_desc", pageSize: 20, skip: 0, locale: "th" },
    })
  })

  test("ids switch to the lookup: trimmed, duplicates dropped in order, at most 100", () => {
    assert.deepEqual(parseLabelQueueRequest(new URLSearchParams("ids= b ,a,,b&locale=en")), { kind: "lookup", ids: ["b", "a"], locale: "en" })
    const hundred = Array.from({ length: 100 }, (_, index) => `id-${index}`)
    assert.deepEqual(parseLabelQueueRequest(new URLSearchParams(`ids=${[...hundred, "id-0"].join(",")}`)), { kind: "lookup", ids: hundred, locale: "th" })
    assert.deepEqual(parseLabelQueueRequest(new URLSearchParams(`ids=${[...hundred, "id-100"].join(",")}`)), { error: "Invalid request data" })
  })
})

// The route: the gate, the two answers and the 400, through the real lib and a fake prisma.
const routeState: { permissions: string[] | null; calls: string[] } = { permissions: ["asset:view"], calls: [] }
Object.assign(globalThis, { __labelQueueRouteState: routeState })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__labelQueueRouteState
    export async function requireAuth() {
      if (state().permissions === null) throw new Error("Unauthorized")
      return { id: "user-1", name: "u", roles: [], permissions: state().permissions }
    }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__labelQueueRouteState
    const row = { id: "asset-1", assetTag: "GRL-COM-26-0007", name: "โน้ตบุ๊ก", ownershipType: "personal", custodian: null,
      currentLocation: { code: "IT-2", name: "ห้อง IT" }, company: { code: "GRL", nameTh: "จีแอลอาร์", nameEn: null },
      branch: { code: "HQ", name: "สำนักงานใหญ่" }, category: { code: "COM", name: "คอมพิวเตอร์" }, labelPrints: [] }
    export const prisma = { asset: {
      findMany: async (args) => { state().calls.push("asset.findMany"); return args.select.custodian ? [row] : [{ id: row.id }] },
      count: async () => { state().calls.push("asset.count"); return 1 },
    } }
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const routeFile = "src/app/api/assets/label-prints/route.ts"
const route = await import(pathToFileURL(routeFile).href) as { GET(request: Request): Promise<Response> }
const get = (query: string) => route.GET(new Request(`http://localhost/api/assets/label-prints${query}`))

describe("GET /api/assets/label-prints", () => {
  beforeEach(() => {
    routeState.permissions = ["asset:view"]
    routeState.calls = []
  })

  test("no session is 401 and no asset:view is 403, before anything is read or parsed, for the queue and the lookup", async () => {
    const over = `?ids=${Array.from({ length: 101 }, (_, index) => `id-${index}`).join(",")}`
    routeState.permissions = null
    for (const query of ["?mode=reprint", "?ids=asset-1", over]) assert.equal((await get(query)).status, 401, query)
    routeState.permissions = ["maintenance:view"]
    for (const query of ["?mode=reprint", "?ids=asset-1", over]) assert.equal((await get(query)).status, 403, query)
    assert.deepEqual(routeState.calls, [])
  })

  test("the queue answers rows, total and ids", async () => {
    const response = await get("?mode=recent&pageSize=10&skip=0")
    assert.equal(response.status, 200)
    const body = await response.json() as Record<string, unknown>
    assert.deepEqual(Object.keys(body).sort(), ["ids", "rows", "total"])
    assert.deepEqual([body.total, body.ids], [1, ["asset-1"]])
    assert.deepEqual(routeState.calls.sort(), ["asset.count", "asset.findMany", "asset.findMany"])
  })

  test("ids answer only the rows; more than 100 is 400 with nothing read", async () => {
    const lookup = await (await get("?ids=asset-1,missing")).json() as Record<string, unknown>
    assert.deepEqual(Object.keys(lookup), ["rows"])
    routeState.calls = []
    const response = await get(`?ids=${Array.from({ length: 101 }, (_, index) => `id-${index}`).join(",")}`)
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: "Invalid request data" })
    assert.deepEqual(routeState.calls, [])
  })

  test("the GET gates before it parses, and the POST keeps asset:view and the shared 100 cap", () => {
    const source = readFileSync(routeFile, "utf8")
    const get = source.slice(source.indexOf("export async function GET"), source.indexOf("export async function POST"))
    assert.ok(get.indexOf('requirePermission(user, "asset", "view")') > 0)
    assert.ok(get.indexOf('requirePermission(user, "asset", "view")') < get.indexOf("parseLabelQueueRequest("))
    const post = source.slice(source.indexOf("export async function POST"))
    assert.ok(post.indexOf('requirePermission(user, "asset", "view")') < post.indexOf("request.json()"))
    assert.match(source, /\.max\(LABEL_PRINT_BATCH_MAX\)/)
    assert.match(post, /where: buildLabelPrintActiveAssetsWhere\(assetIds\)/)
  })
})
