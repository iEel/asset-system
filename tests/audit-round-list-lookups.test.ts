import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import { buildAuditRoundItemWhere, parseAuditRoundListFilters } from "../src/lib/audit-round-result-filters.ts"

type Args = { where?: unknown; by?: readonly string[]; select?: unknown }
const state: { calls: Array<{ call: string; args: Args }>; respond: (call: string, args: Args) => unknown } = { calls: [], respond: () => undefined }
Object.assign(globalThis, { __roundListLookups: state })

const stubs = new Map<string, string>([
  ["@/lib/db", `
    const state = () => globalThis.__roundListLookups
    const model = (name) => new Proxy({}, {
      get: (_, method) => async (args) => {
        const call = name + "." + String(method)
        state().calls.push({ call, args: args ?? {} })
        const value = state().respond(call, args ?? {})
        if (value !== undefined) return value
        if (method === "count") return 0
        if (method === "findMany" || method === "groupBy") return []
        return null
      },
    })
    export const prisma = new Proxy({}, { get: (_, key) => model(String(key)) })
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
const { countAuditRoundItemCategories, findAuditRoundSearchLocationIds, resolveAuditRoundListWhereInput } = (await import(
  pathToFileURL("src/lib/audit-round-list-lookups.ts").href
)) as typeof import("../src/lib/audit-round-list-lookups.ts")

const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const ids = (args: Args | undefined) => (args?.where as { id: { in: string[] } }).id.in

beforeEach(() => {
  state.calls = []
  state.respond = () => undefined
})

test("the room search reads the round's own rooms, then matches them by code or name in chunks of 2,000 (bug 11, P2-R5, P2-R25)", async () => {
  const rooms = Array.from({ length: 2001 }, (_, index) => ({ expectedLocationId: `loc-${index}` }))
  state.respond = (call, args) => {
    if (call === "auditItem.groupBy") return rooms
    if (call === "location.findMany") return ids(args).includes("loc-7") ? [{ id: "loc-7" }] : []
    return undefined
  }
  assert.deepEqual(await findAuditRoundSearchLocationIds("round-1", " B-1 "), ["loc-7"])
  const groupBy = callsTo("auditItem.groupBy")
  assert.equal(groupBy.length, 1)
  assert.deepEqual(groupBy[0].by, ["expectedLocationId"])
  assert.deepEqual(groupBy[0].where, { auditRoundId: "round-1" }, "the round's own rooms, never the register's")
  const lookups = callsTo("location.findMany")
  assert.deepEqual(lookups.map((args) => ids(args).length), [2000, 1])
  assert.deepEqual(lookups[1], { where: { id: { in: ["loc-2000"] }, OR: [{ code: { contains: "B-1" } }, { name: { contains: "B-1" } }] }, select: { id: true } })
})

test("an empty search reads nothing; a search that names no room gives no ids", async () => {
  assert.deepEqual(await findAuditRoundSearchLocationIds("round-1", "   "), [])
  assert.equal(state.calls.length, 0)
  state.respond = (call) => (call === "auditItem.groupBy" ? [{ expectedLocationId: "loc-1" }] : undefined)
  assert.deepEqual(await findAuditRoundSearchLocationIds("round-1", "ZZZ"), [])
})

test("the category counts come back in id order, so อื่น ๆ leaves out the same six on the page and in the exports (P2-R11)", async () => {
  const sizes: Record<string, number> = { c1: 40, c2: 30, c3: 20, c4: 10, c5: 5, c6: 5, c7: 5, c8: 1 }
  state.respond = (call) => (call === "asset.groupBy" ? Object.entries(sizes).reverse().map(([categoryId, count]) => ({ categoryId, _count: { _all: count } })) : undefined)
  const where = buildAuditRoundItemWhere({ ...parseAuditRoundListFilters({}), roundId: "round-1" })
  assert.deepEqual((await countAuditRoundItemCategories(where)).map((row) => row.categoryId), ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"])
  assert.deepEqual(callsTo("asset.groupBy")[0].where, { auditItems: { some: where } })
  // Three categories tie at 5: the six shown take c5 and c6 by id, so c7 and c8 are "อื่น ๆ" (Task 3's chips fold the same way).
  const other = await resolveAuditRoundListWhereInput("round-1", parseAuditRoundListFilters({ categoryId: "other" }))
  assert.deepEqual(other.shownCategoryIds, ["c1", "c2", "c3", "c4", "c5", "c6"])
  // The six are ranked over every result, so a result tab under อื่น ๆ counts against the six its link opens (P2-R11).
  state.calls = []
  await resolveAuditRoundListWhereInput("round-1", parseAuditRoundListFilters({ categoryId: "other", result: "not_found" }))
  assert.deepEqual(callsTo("asset.groupBy")[0].where, { auditItems: { some: buildAuditRoundItemWhere({ ...parseAuditRoundListFilters({ result: "not_found" }), roundId: "round-1", expectedLocationIds: [], categoryId: null, result: "all" }) } }, "the six are ranked over every result")
  state.calls = []
  assert.equal((await resolveAuditRoundListWhereInput("round-1", parseAuditRoundListFilters({ categoryId: "cat-1" }))).shownCategoryIds, undefined)
  assert.equal(callsTo("asset.groupBy").length, 0, "only อื่น ๆ needs the six")
})
