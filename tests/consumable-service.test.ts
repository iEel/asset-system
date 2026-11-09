import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

// ของใช้สิ้นเปลือง (consumables plan 1 task 3): the service against an in-memory Prisma double, and source pins on the
// service and the routes. @/lib/db and @/lib/audit-log are replaced by modules that read globalThis, so no database loads.
const mockedModuleSources = new Map<string, string>([
  ["@/lib/db", "export const prisma = new Proxy({}, { get: (_, key) => globalThis.__consumablePrisma[key] })"],
  ["@/lib/audit-log", "export async function logAudit(params) { globalThis.__consumableAudits.push(params) }"],
])

;(nodeModule as unknown as {
  registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void
}).registerHooks({
  resolve(specifier, context, next) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})

type Item = { id: string; name: string; unit: string; minQuantity: number; onHand: number; isActive: boolean; createdBy: string; updatedBy: string | null }
type Movement = Record<string, unknown>
type Asset = { id: string; isActive: boolean; status: { name: string }; assetTag?: string; name?: string; custodian?: { fullNameTh: string } | null }
type User = { id: string; username: string; displayName: string; email: string | null; employee: { code: string; fullNameTh: string } | null }

const globals = globalThis as unknown as { __consumablePrisma: unknown; __consumableAudits: Array<Record<string, unknown>> }

function fakeDb(seed: { items?: Item[]; assets?: Asset[]; deadlocks?: number; movements?: Movement[]; users?: User[] }) {
  const items = new Map((seed.items ?? []).map((item) => [item.id, { ...item }]))
  const assets = new Map((seed.assets ?? []).map((asset) => [asset.id, asset]))
  const movements: Movement[] = [...(seed.movements ?? [])]
  const groupBys: unknown[] = []
  const transactions: unknown[] = []
  const calls: string[] = []
  const reads: Array<{ op: string; args: Record<string, unknown> }> = []
  let deadlocks = seed.deadlocks ?? 0
  let nextId = 1
  const matches = (item: Item, where: Record<string, unknown>) => {
    if (where.id !== undefined && where.id !== item.id) return false
    if (where.isActive !== undefined && where.isActive !== item.isActive) return false
    const onHand = where.onHand as { gte?: number } | number | undefined
    if (typeof onHand === "number" && item.onHand !== onHand) return false
    if (onHand && typeof onHand === "object" && onHand.gte !== undefined && item.onHand < onHand.gte) return false
    return true
  }
  const applyData = (item: Item, data: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && "decrement" in value) (item as Record<string, unknown>)[key] = (item as unknown as Record<string, number>)[key] - (value as { decrement: number }).decrement
      else if (value && typeof value === "object" && "increment" in value) (item as Record<string, unknown>)[key] = (item as unknown as Record<string, number>)[key] + (value as { increment: number }).increment
      else (item as Record<string, unknown>)[key] = value
    }
  }
  const client = {
    consumableItem: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        calls.push("item.findUnique")
        return items.has(where.id) ? { ...items.get(where.id)! } : null
      },
      findMany: async ({ where = {}, orderBy }: { where?: Record<string, unknown>; orderBy?: unknown } = {}) => {
        const found = [...items.values()].filter((item) => {
          if (where.isActive !== undefined && item.isActive !== where.isActive) return false
          const id = where.id as { not?: string } | undefined
          if (id?.not !== undefined && item.id === id.not) return false
          return true
        }).map((item) => ({ ...item }))
        // Only the name order is read (listConsumablesWithUsage).
        if (JSON.stringify(orderBy)?.includes('"name":"asc"')) found.sort((a, b) => a.name.localeCompare(b.name))
        return found
      },
      create: async ({ data }: { data: Partial<Item> }) => {
        const item: Item = { id: `item-${nextId++}`, unit: "ชิ้น", minQuantity: 0, onHand: 0, isActive: true, updatedBy: null, createdBy: "", name: "", ...data } as Item
        items.set(item.id, item)
        return { ...item }
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const item = items.get(where.id)!
        applyData(item, data)
        return { ...item }
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        calls.push("item.updateMany")
        let count = 0
        for (const item of items.values()) if (matches(item, where)) { applyData(item, data); count += 1 }
        return { count }
      },
    },
    consumableMovement: {
      create: async ({ data }: { data: Movement }) => {
        const movement = { id: `move-${nextId++}`, ...data }
        movements.push(movement)
        return movement
      },
      // Grouped by one key; where as movementMatches; _sum / _count / _max; orderBy _count then _max (desc); take.
      groupBy: async (args: {
        by: string[]
        where: Record<string, unknown>
        _sum?: Record<string, boolean>
        _count?: Record<string, boolean>
        _max?: Record<string, boolean>
        orderBy?: Array<Record<string, Record<string, string>>>
        take?: number
      }) => {
        groupBys.push(args)
        const key = args.by[0]
        const groups = new Map<string, Movement[]>()
        for (const movement of movements) {
          if (!movementMatches(movement, args.where)) continue
          const value = movement[key] as string
          groups.set(value, [...(groups.get(value) ?? []), movement])
        }
        let rows = [...groups].map(([value, members]) => ({
          [key]: value,
          ...(args._sum ? { _sum: { quantityChange: members.reduce((sum, member) => sum + (member.quantityChange as number), 0) } } : {}),
          ...(args._count ? { _count: { id: members.length } } : {}),
          ...(args._max ? { _max: { performedAt: new Date(Math.max(...members.map((member) => (member.performedAt as Date).getTime()))) } } : {}),
        })) as Array<Record<string, unknown> & { _count?: { id: number }; _max?: { performedAt: Date } }>
        if (args.orderBy) {
          rows = rows.sort((a, b) => {
            for (const order of args.orderBy!) {
              if (order._count) { const diff = b._count!.id - a._count!.id; if (diff) return diff }
              if (order._max) { const diff = b._max!.performedAt.getTime() - a._max!.performedAt.getTime(); if (diff) return diff }
            }
            return 0
          })
        }
        return args.take === undefined ? rows : rows.slice(0, args.take)
      },
      count: async ({ where }: { where: Record<string, unknown> }) => {
        reads.push({ op: "movement.count", args: { where } })
        return movements.filter((movement) => movementMatches(movement, where)).length
      },
      // Newest first (performedAt desc, id desc); each row carries its kind as `item`.
      findMany: async (args: { where: Record<string, unknown>; take?: number }) => {
        reads.push({ op: "movement.findMany", args })
        const found = movements
          .filter((movement) => movementMatches(movement, args.where))
          .sort((a, b) => (b.performedAt as Date).getTime() - (a.performedAt as Date).getTime() || String(b.id).localeCompare(String(a.id)))
          .map((movement) => ({ ...movement, item: items.get(movement.itemId as string) }))
        return args.take === undefined ? found : found.slice(0, args.take)
      },
    },
    asset: {
      findUnique: async ({ where }: { where: { id: string } }) => assets.get(where.id) ?? null,
      findMany: async (args: { where: { id: { in: string[] } } }) => {
        reads.push({ op: "asset.findMany", args })
        return [...assets.values()].filter((asset) => args.where.id.in.includes(asset.id)).map((asset) => ({ custodian: null, ...asset }))
      },
    },
    user: {
      findMany: async (args: { where: { id: { in: string[] } } }) => {
        reads.push({ op: "user.findMany", args })
        return (seed.users ?? []).filter((user) => args.where.id.in.includes(user.id))
      },
    },
  }
  const prisma = {
    ...client,
    $transaction: async (run: (tx: typeof client) => Promise<unknown>, options: unknown) => {
      transactions.push(options)
      // A deadlock victim: SQL Server rolled it back whole, so nothing ran (Prisma P2034).
      if (deadlocks > 0) {
        deadlocks -= 1
        throw Object.assign(new Error("Transaction failed due to a write conflict or a deadlock"), { code: "P2034" })
      }
      return run(client)
    },
  }
  globals.__consumablePrisma = prisma
  globals.__consumableAudits = []
  return { prisma, items, movements, transactions, calls, groupBys, reads, audits: () => globals.__consumableAudits }
}

// The where shapes the service reads with: type, itemId, assetId (a value, { not: null } or { in }), performedAt { gte }
// or an exact Date, and OR of { assetId, performedAt } pairs (the latest-movement read).
function movementMatches(movement: Movement, where: Record<string, unknown>): boolean {
  if (where.type !== undefined && movement.type !== where.type) return false
  if (where.itemId !== undefined && movement.itemId !== where.itemId) return false
  const assetId = where.assetId as string | { not?: null; in?: string[] } | undefined
  if (typeof assetId === "string" && movement.assetId !== assetId) return false
  if (assetId && typeof assetId === "object") {
    if ("not" in assetId && (movement.assetId ?? null) === null) return false
    if (assetId.in && !assetId.in.includes(movement.assetId as string)) return false
  }
  const performedAt = where.performedAt as { gte?: Date } | Date | undefined
  if (performedAt instanceof Date && (movement.performedAt as Date).getTime() !== performedAt.getTime()) return false
  if (performedAt && !(performedAt instanceof Date) && performedAt.gte && (movement.performedAt as Date).getTime() < performedAt.gte.getTime()) return false
  if (Array.isArray(where.OR) && !where.OR.some((branch) => movementMatches(movement, branch as Record<string, unknown>))) return false
  return true
}

const service = await import(pathToFileURL("src/lib/consumable-service.ts").href) as typeof import("../src/lib/consumable-service.ts")

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const toner = (over: Partial<Item> = {}): Item => ({ id: "toner", name: "Toner 85A", unit: "ตลับ", minQuantity: 2, onHand: 5, isActive: true, createdBy: "u0", updatedBy: null, ...over })
const pc = (over: Partial<Asset> = {}): Asset => ({ id: "pc1", isActive: true, status: { name: "In Use" }, ...over })
const serializable = { isolationLevel: "Serializable", maxWait: 10_000, timeout: 30_000 }

test("issue: one Serializable transaction, a conditional decrement, a movement of -quantity with onHandAfter, then the audit", async () => {
  const db = fakeDb({ items: [toner()], assets: [pc()] })
  const result = await service.issueConsumable({ itemId: "toner", quantity: 2, assetId: "pc1", note: "" }, "u1")
  assert.deepEqual(db.transactions, [serializable])
  assert.equal(db.items.get("toner")!.onHand, 3)
  assert.equal(db.movements.length, 1)
  const movement = db.movements[0]
  assert.equal(movement.type, "issue")
  assert.equal(movement.quantityChange, -2)
  assert.equal(movement.onHandAfter, 3)
  assert.equal(movement.assetId, "pc1")
  assert.equal(movement.note, null, "an empty note is stored as null")
  assert.equal(movement.performedBy, "u1")
  assert.equal(result.onHand, 3)
  assert.deepEqual(db.audits().map((audit) => [audit.module, audit.action, audit.recordId, audit.userId]), [["consumable", "issue", "toner", "u1"]])
})

test("issue: a shortage answers ConsumableShortError with the current onHand and unit, and writes nothing", async () => {
  const db = fakeDb({ items: [toner({ onHand: 1 })], assets: [pc()] })
  await assert.rejects(
    service.issueConsumable({ itemId: "toner", quantity: 2, assetId: "pc1" }, "u1"),
    (error: unknown) => error instanceof service.ConsumableShortError && error.onHand === 1 && error.unit === "ตลับ" && error.message === "Not enough in stock",
  )
  assert.equal(db.items.get("toner")!.onHand, 1)
  assert.equal(db.movements.length, 0)
  assert.equal(db.audits().length, 0)
})

test("issue: the asset must exist, be active and not be in a blocked status", async () => {
  for (const asset of [pc({ status: { name: "Disposed" } }), pc({ status: { name: "Pending Disposal" } }), pc({ isActive: false })]) {
    const db = fakeDb({ items: [toner()], assets: [asset] })
    await assert.rejects(service.issueConsumable({ itemId: "toner", quantity: 1, assetId: "pc1" }, "u1"), (error: unknown) =>
      error instanceof Error && error.message === "This asset cannot take consumables" && (error as unknown as { fieldErrors?: unknown }).fieldErrors !== undefined
      && JSON.stringify((error as unknown as { fieldErrors: unknown }).fieldErrors) === JSON.stringify({ assetId: "consumableAssetStatus" }))
    assert.equal(db.items.get("toner")!.onHand, 5)
  }
  fakeDb({ items: [toner()], assets: [] })
  await assert.rejects(service.issueConsumable({ itemId: "toner", quantity: 1, assetId: "pc1" }, "u1"), /Asset not found/)
})

test("receive: +quantity with the received date as a day, then the audit", async () => {
  const db = fakeDb({ items: [toner()] })
  await service.receiveConsumable({ itemId: "toner", quantity: 10, receivedDate: "2026-11-08", note: " box " }, "u1")
  assert.deepEqual(db.transactions, [serializable])
  assert.equal(db.items.get("toner")!.onHand, 15)
  const movement = db.movements[0]
  assert.equal(movement.type, "receive")
  assert.equal(movement.quantityChange, 10)
  assert.equal(movement.onHandAfter, 15)
  assert.equal((movement.receivedDate as Date).toISOString(), "2026-11-08T00:00:00.000Z")
  assert.equal(movement.assetId ?? null, null)
  assert.deepEqual(db.audits().map((audit) => [audit.module, audit.action, audit.recordId]), [["consumable", "receive", "toner"]])
})

test("receive and issue refuse an inactive kind", async () => {
  const db = fakeDb({ items: [toner({ isActive: false })], assets: [pc()] })
  await assert.rejects(service.receiveConsumable({ itemId: "toner", quantity: 1, receivedDate: "2026-11-08" }, "u1"), /Consumable kind is inactive/)
  await assert.rejects(service.issueConsumable({ itemId: "toner", quantity: 1, assetId: "pc1" }, "u1"), /Consumable kind is inactive/)
  assert.equal(db.items.get("toner")!.onHand, 5)
  assert.equal(db.movements.length, 0)
  fakeDb({ items: [] })
  await assert.rejects(service.receiveConsumable({ itemId: "nope", quantity: 1, receivedDate: "2026-11-08" }, "u1"), service.ConsumableNotFoundError)
})

test("adjust: the change is counted - onHand with the reason; the same count is refused as noChange on counted", async () => {
  const db = fakeDb({ items: [toner()] })
  await service.adjustConsumable({ itemId: "toner", counted: 3, reason: "นับจริง" }, "u1")
  assert.deepEqual(db.transactions, [serializable])
  assert.equal(db.items.get("toner")!.onHand, 3)
  assert.equal(db.movements[0].type, "adjust")
  assert.equal(db.movements[0].quantityChange, -2)
  assert.equal(db.movements[0].onHandAfter, 3)
  assert.equal(db.movements[0].reason, "นับจริง")
  assert.deepEqual(db.audits().map((audit) => [audit.module, audit.action]), [["consumable", "adjust"]])

  await assert.rejects(service.adjustConsumable({ itemId: "toner", counted: 3, reason: "again" }, "u1"), (error: unknown) =>
    error instanceof Error && error.message === "No change to the count"
    && JSON.stringify((error as unknown as { fieldErrors: unknown }).fieldErrors) === JSON.stringify({ counted: "consumableNoChange" }))
  assert.equal(db.movements.length, 1)
})

test("create checks the name case-insensitively among active kinds only", async () => {
  const db = fakeDb({ items: [toner(), toner({ id: "old", name: "Mouse USB", isActive: false })] })
  await assert.rejects(service.createConsumableItem({ name: "  TONER 85a ", unit: "ตลับ", minQuantity: 0 }, "u1"), (error: unknown) =>
    error instanceof Error && error.message === "Consumable name already exists"
    && JSON.stringify((error as unknown as { fieldErrors: unknown }).fieldErrors) === JSON.stringify({ name: "consumableNameExists" }))
  const created = await service.createConsumableItem({ name: "mouse usb", unit: "ชิ้น", minQuantity: 1 }, "u1")
  assert.equal(created.name, "mouse usb")
  assert.equal(created.onHand, 0)
  assert.equal(created.createdBy, "u1")
  assert.deepEqual(db.transactions, [serializable, serializable])
  assert.deepEqual(db.audits().map((audit) => [audit.module, audit.action, audit.recordId]), [["consumable", "create", created.id]])
  assert.equal(service.consumableNameTaken([{ id: "a", name: "Toner 85A" }], "toner 85a"), true)
  assert.equal(service.consumableNameTaken([{ id: "a", name: "Toner 85A" }], "toner 85a", "a"), false, "an edit keeps its own name")
})

test("deactivate sets isActive false only and keeps onHand; editing an inactive kind is refused", async () => {
  const db = fakeDb({ items: [toner()] })
  await service.deactivateConsumableItem("toner", "u1")
  const item = db.items.get("toner")!
  assert.equal(item.isActive, false)
  assert.equal(item.onHand, 5)
  assert.equal(item.name, "Toner 85A")
  assert.deepEqual(db.audits().map((audit) => [audit.module, audit.action]), [["consumable", "deactivate"]])
  await assert.rejects(service.updateConsumableItem("toner", { name: "X", unit: "ชิ้น", minQuantity: 0 }, "u1"), /Consumable kind is inactive/)
})

test("update renames with the name check excluding itself, and audits update", async () => {
  const db = fakeDb({ items: [toner(), toner({ id: "drum", name: "Drum 12A" })] })
  await assert.rejects(service.updateConsumableItem("toner", { name: "drum 12a", unit: "ตลับ", minQuantity: 2 }, "u1"), /Consumable name already exists/)
  await service.updateConsumableItem("toner", { name: "TONER 85A", unit: "กล่อง", minQuantity: 4 }, "u1")
  const item = db.items.get("toner")!
  assert.deepEqual([item.name, item.unit, item.minQuantity, item.onHand, item.updatedBy], ["TONER 85A", "กล่อง", 4, 5, "u1"])
  assert.deepEqual(db.audits().map((audit) => [audit.module, audit.action]), [["consumable", "update"]])
})

test("issue: the conditional decrement runs before any read of the kind; the kind is read only on a count of 0", async () => {
  const db = fakeDb({ items: [toner()], assets: [pc()] })
  await service.issueConsumable({ itemId: "toner", quantity: 2, assetId: "pc1" }, "u1")
  assert.deepEqual(db.calls, ["item.updateMany", "item.findUnique"], "the read after the decrement only takes onHandAfter")
  const short = fakeDb({ items: [toner({ onHand: 1 })], assets: [pc()] })
  await assert.rejects(service.issueConsumable({ itemId: "toner", quantity: 2, assetId: "pc1" }, "u1"), service.ConsumableShortError)
  assert.deepEqual(short.calls, ["item.updateMany", "item.findUnique"])
  fakeDb({ items: [], assets: [pc()] })
  await assert.rejects(service.issueConsumable({ itemId: "nope", quantity: 1, assetId: "pc1" }, "u1"), service.ConsumableNotFoundError)
})

test("a deadlock victim runs again: issue succeeds on the retry or answers the shortage, and every write retries", async () => {
  const db = fakeDb({ items: [toner()], assets: [pc()], deadlocks: 1 })
  const result = await service.issueConsumable({ itemId: "toner", quantity: 2, assetId: "pc1" }, "u1")
  assert.equal(db.transactions.length, 2)
  assert.equal(result.onHand, 3)
  assert.equal(db.movements.length, 1)
  assert.equal(db.audits().length, 1)

  const short = fakeDb({ items: [toner({ onHand: 1 })], assets: [pc()], deadlocks: 1 })
  await assert.rejects(service.issueConsumable({ itemId: "toner", quantity: 2, assetId: "pc1" }, "u1"),
    (error: unknown) => error instanceof service.ConsumableShortError && error.onHand === 1 && error.unit === "ตลับ")
  assert.equal(short.transactions.length, 2)

  const writes: Array<() => Promise<unknown>> = [
    () => service.receiveConsumable({ itemId: "toner", quantity: 1, receivedDate: "2026-11-08" }, "u1"),
    () => service.adjustConsumable({ itemId: "toner", counted: 9, reason: "นับจริง" }, "u1"),
    () => service.createConsumableItem({ name: "Mouse", unit: "ชิ้น", minQuantity: 0 }, "u1"),
    () => service.updateConsumableItem("toner", { name: "Toner", unit: "ตลับ", minQuantity: 1 }, "u1"),
    () => service.deactivateConsumableItem("toner", "u1"),
  ]
  for (const write of writes) {
    const retried = fakeDb({ items: [toner()], deadlocks: 1 })
    await write()
    assert.equal(retried.transactions.length, 2)
  }
  fakeDb({ items: [toner()], assets: [pc()], deadlocks: 3 })
  await assert.rejects(service.issueConsumable({ itemId: "toner", quantity: 1, assetId: "pc1" }, "u1"),
    (error: unknown) => (error as { code?: string }).code === "P2034", "three runs in all, then the deadlock goes to the route")
})

test("source: each write transaction is wrapped in withDeadlockRetry; the route mapping uses isDeadlockError", () => {
  const source = read("src/lib/consumable-service.ts")
  assert.match(source, /import \{ withDeadlockRetry \} from "\.\/transaction-retry\.ts"/)
  const transactions = [...source.matchAll(/prisma\.\$transaction\(/g)].map((match) => match.index!)
  assert.equal(transactions.length, 6)
  const wrapper = "withDeadlockRetry(() => "
  for (const at of transactions) assert.equal(source.slice(at - wrapper.length, at), wrapper)
  assert.equal([...source.matchAll(/\}, consumableTransactionOptions\)\)/g)].length, 6)
  assert.doesNotMatch(source, /P2034/)
  const issue = source.slice(source.indexOf("export async function issueConsumable("), source.indexOf("export async function adjustConsumable("))
  assert.ok(!issue.includes("activeItemOrThrow"), "issue does not read the kind before the decrement")
  assert.ok(issue.indexOf("updateMany(") < issue.indexOf("consumableItem.findUnique("), "the decrement comes before any read of the kind")

  const routeErrors = read("src/lib/consumable-route-errors.ts")
  assert.match(routeErrors, /import \{ isDeadlockError \} from "@\/lib\/transaction-retry"/)
  assert.match(routeErrors, /if \(isDeadlockError\(error\)\) \{\n\s+return NextResponse\.json\(\{ error: CONSUMABLE_CHANGED_MESSAGE, code: "CONSUMABLE_CHANGED" \}, \{ status: 409 \}\)/)
  assert.doesNotMatch(routeErrors, /"P2034"/)
})

test("PATCH uses its own schema without defaults: { name } alone is refused with field errors, a full body writes exactly its fields", async () => {
  const validations = await import(pathToFileURL("src/lib/validations/consumables.ts").href) as typeof import("../src/lib/validations/consumables.ts")
  const partial = validations.consumableItemUpdateSchema.safeParse({ name: "หมึก HP 85A" })
  assert.equal(partial.success, false)
  assert.deepEqual(partial.error!.issues.map((issue) => issue.path.join(".")).sort(), ["minQuantity", "unit"])
  const { validationFailedBody } = await import(pathToFileURL("src/lib/api-error-exposure.ts").href) as typeof import("../src/lib/api-error-exposure.ts")
  const body = validationFailedBody(partial.error)
  assert.equal(body?.code, "VALIDATION_FAILED")
  assert.deepEqual(Object.keys(body!.fieldErrors).sort(), ["minQuantity", "unit"], "the 400 names the missing fields")
  assert.deepEqual(validations.consumableItemUpdateSchema.parse({ name: " Toner ", unit: " ตลับ ", minQuantity: 3 }), { name: "Toner", unit: "ตลับ", minQuantity: 3 })
  assert.deepEqual(validations.consumableItemSchema.parse({ name: "Mouse" }), { name: "Mouse", unit: "ชิ้น", minQuantity: 0 }, "POST create keeps the defaults")

  const route = read("src/app/api/consumables/[id]/route.ts")
  assert.match(route, /const input = consumableItemUpdateSchema\.parse\(body\)/)
  assert.doesNotMatch(route, /consumableItemSchema\b/)
  assert.match(read("src/app/api/consumables/route.ts"), /consumableItemSchema\.parse\(await request\.json\(\)\)/)

  const db = fakeDb({ items: [toner({ unit: "กล่อง", minQuantity: 7 })] })
  await service.updateConsumableItem("toner", validations.consumableItemUpdateSchema.parse({ name: "Toner 85A", unit: "ตลับ", minQuantity: 3 }), "u1")
  const item = db.items.get("toner")!
  assert.deepEqual([item.name, item.unit, item.minQuantity, item.onHand, item.isActive], ["Toner 85A", "ตลับ", 3, 5, true])
})

test("source: every write runs in the Serializable options and calls logAudit after its transaction", () => {
  const source = read("src/lib/consumable-service.ts")
  assert.match(source, /isolationLevel: "Serializable",\n\s+maxWait: 10_000,\n\s+timeout: 30_000/)
  assert.match(source, /onHand: \{ gte: input\.quantity \}/)
  assert.match(source, /data: \{ onHand: \{ decrement: input\.quantity \}/)
  assert.match(source, /quantityChange: -input\.quantity/)
  assert.match(source, /quantityChange: input\.counted - item\.onHand/)
  for (const action of ["receive", "issue", "adjust", "create", "update", "deactivate"]) {
    assert.match(source, new RegExp(`module: "consumable", action: "${action}"`), action)
  }
  // Each audit call follows the end of a $transaction(…, consumableTransactionOptions).
  const audits = [...source.matchAll(/logAudit\(/g)].map((match) => match.index!)
  assert.equal(audits.length, 6)
  for (const at of audits) assert.ok(source.lastIndexOf("}, consumableTransactionOptions)", at) > source.lastIndexOf("$transaction(", at), "logAudit after the transaction")
})

const routes: Array<[string, string, string, string]> = [
  ["src/app/api/consumables/route.ts", "GET", "consumable", "view"],
  // Adding a kind is catalog management: consumable:edit, as the + เพิ่มชนิดของ button (plan 2 final review ruling).
  ["src/app/api/consumables/route.ts", "POST", "consumable", "edit"],
  ["src/app/api/consumables/[id]/route.ts", "GET", "consumable", "view"],
  ["src/app/api/consumables/[id]/route.ts", "PATCH", "consumable", "edit"],
  ["src/app/api/consumables/receive/route.ts", "POST", "consumable", "create"],
  ["src/app/api/consumables/issue/route.ts", "POST", "consumable", "create"],
  ["src/app/api/consumables/adjust/route.ts", "POST", "consumable", "edit"],
  ["src/app/api/consumables/movements/route.ts", "GET", "consumable", "view"],
]

test("routes: each handler checks its permission per the plan's table", () => {
  for (const [file, method, module, action] of routes) {
    const source = read(file)
    const start = source.indexOf(`export async function ${method}(`)
    assert.ok(start >= 0, `${file} ${method}`)
    const next = source.indexOf("export async function ", start + 1)
    const body = source.slice(start, next < 0 ? undefined : next)
    assert.match(body, /await requireAuth\(\)/, `${file} ${method}`)
    assert.ok(body.includes(`requirePermission(user, "${module}", "${action}")`), `${file} ${method} needs ${module}:${action}`)
  }
  const exported = (file: string) => [...read(file).matchAll(/export async function (\w+)\(/g)].map((match) => match[1]).sort()
  assert.deepEqual(exported("src/app/api/consumables/receive/route.ts"), ["POST"])
  assert.deepEqual(exported("src/app/api/consumables/issue/route.ts"), ["POST"])
  assert.deepEqual(exported("src/app/api/consumables/adjust/route.ts"), ["POST"])
  assert.deepEqual(exported("src/app/api/consumables/movements/route.ts"), ["GET"])
  assert.match(read("src/app/api/consumables/[id]/route.ts"), /params: Promise<\{ id: string \}>/)
})

test("movements: the GET pages by 50, newest first, filtered by itemId or assetId", () => {
  assert.equal(service.CONSUMABLE_MOVEMENTS_PAGE_SIZE, 50)
  const source = read("src/lib/consumable-service.ts")
  assert.match(source, /export const CONSUMABLE_MOVEMENTS_PAGE_SIZE = 50/)
  assert.match(source, /take: CONSUMABLE_MOVEMENTS_PAGE_SIZE/)
  assert.match(source, /orderBy: \[\{ performedAt: "desc" \}, \{ id: "desc" \}\]/)
  assert.equal(service.consumableMovementsQuerySchema.safeParse({}).success, false, "one filter is required")
  assert.deepEqual(service.consumableMovementsQuerySchema.parse({ itemId: "toner" }), { itemId: "toner", page: 1 })
  assert.deepEqual(service.consumableMovementsQuerySchema.parse({ assetId: "pc1", page: "3" }), { assetId: "pc1", page: 3 })
})

test("the new refusals read Thai through the catalog", () => {
  const catalog = read("src/lib/api-error-catalog.ts")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).apiErrors as Record<string, string>
  const expected: Array<[string, string, string]> = [
    ["Not enough in stock", "consumableShort", "ของในตู้ไม่พอ"],
    ["No change to the count", "consumableNoChange", "จำนวนเท่าเดิม ไม่มีการเปลี่ยนแปลง"],
    ["This asset cannot take consumables", "consumableAssetStatus", "เครื่องนี้อยู่ในสถานะที่เบิกของให้ไม่ได้"],
    ["Consumable name already exists", "consumableNameExists", "มีชนิดนี้อยู่แล้ว"],
    ["Consumable kind is inactive", "consumableInactive", "ชนิดนี้ปิดใช้งานแล้ว"],
  ]
  for (const [english, key, thai] of expected) {
    assert.ok(catalog.includes(`"${english}": "${key}"`), english)
    assert.equal(th[key], thai, key)
  }
})

test("listConsumablesWithUsage: active kinds by name with state, and issued90 sums only issue movements inside 90 days, in one groupBy", async () => {
  const day = 86_400_000
  const now = Date.now()
  const at = (daysAgo: number) => new Date(now - daysAgo * day)
  const db = fakeDb({
    items: [
      toner(),
      toner({ id: "cable", name: "Cable HDMI", unit: "เส้น", minQuantity: 0, onHand: 0 }),
      toner({ id: "mouse", name: "Mouse", unit: "ชิ้น", minQuantity: 3, onHand: 3 }),
      toner({ id: "old", name: "Aaa old", isActive: false }),
    ],
    movements: [
      { itemId: "toner", type: "issue", quantityChange: -2, performedAt: at(1) },
      { itemId: "toner", type: "issue", quantityChange: -3, performedAt: at(89) },
      { itemId: "toner", type: "issue", quantityChange: -7, performedAt: at(91) },
      { itemId: "toner", type: "receive", quantityChange: 10, performedAt: at(1) },
      { itemId: "toner", type: "adjust", quantityChange: -4, performedAt: at(1) },
      { itemId: "mouse", type: "adjust", quantityChange: -1, performedAt: at(2) },
    ],
  })
  const rows = await service.listConsumablesWithUsage(db.prisma as never)
  assert.deepEqual(rows, [
    { id: "cable", name: "Cable HDMI", unit: "เส้น", minQuantity: 0, onHand: 0, state: "out", issued90: 0 },
    { id: "mouse", name: "Mouse", unit: "ชิ้น", minQuantity: 3, onHand: 3, state: "low", issued90: 0 },
    { id: "toner", name: "Toner 85A", unit: "ตลับ", minQuantity: 2, onHand: 5, state: "ok", issued90: 5 },
  ])
  assert.equal(db.groupBys.length, 1, "one groupBy, not a query per kind")
  const args = db.groupBys[0] as { by: string[]; where: { type: string; performedAt: { gte: Date } }; _sum: Record<string, boolean> }
  assert.deepEqual([args.by, args.where.type, args._sum], [["itemId"], "issue", { quantityChange: true }])
  const since = now - 90 * day
  assert.ok(Math.abs(args.where.performedAt.gte.getTime() - since) < 60_000, "the window is CONSUMABLE_OFTEN_DAYS days")
  assert.match(read("src/lib/consumable-service.ts"), /CONSUMABLE_OFTEN_DAYS/)
})

test("getConsumableHistory: the kind (inactive too), 50 movements a page newest first, the page clamped, performedBy as a name", async () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 10, 1, 0, minute))
  const movements = Array.from({ length: 53 }, (_, index) => ({
    id: `m${String(index).padStart(2, "0")}`,
    itemId: "toner",
    type: index === 0 ? "receive" : index === 1 ? "adjust" : "issue",
    quantityChange: index === 0 ? 10 : -1,
    onHandAfter: 5,
    assetId: index > 1 ? "pc1" : null,
    asset: index > 1 ? { id: "pc1", assetTag: "IT-001", name: "PC" } : null,
    receivedDate: index === 0 ? at(0) : null,
    reason: index === 1 ? "นับใหม่" : null,
    note: null,
    performedBy: index % 2 === 0 ? "u1" : "u-gone",
    performedAt: at(index),
  }))
  const calls: Array<{ op: string; args: Record<string, unknown> }> = []
  const db = {
    consumableItem: {
      findUnique: async (args: { where: { id: string } }) => {
        calls.push({ op: "item", args })
        return args.where.id === "toner" ? { id: "toner", name: "Toner 85A", unit: "ตลับ", minQuantity: 2, onHand: 1, isActive: false } : null
      },
    },
    consumableMovement: {
      count: async (args: Record<string, unknown>) => {
        calls.push({ op: "count", args })
        return movements.length
      },
      findMany: async (args: { skip: number; take: number }) => {
        calls.push({ op: "movements", args })
        const sorted = [...movements].sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
        return sorted.slice(args.skip, args.skip + args.take)
      },
    },
    user: {
      findMany: async (args: { where: { id: { in: string[] } } }) => {
        calls.push({ op: "users", args })
        return [{ id: "u1", username: "somchai", displayName: "Somchai", email: null, employee: { code: "E01", fullNameTh: "สมชาย ใจดี" } }]
          .filter((user) => args.where.id.in.includes(user.id))
      },
    },
  }

  assert.equal(await service.getConsumableHistory(db as never, "nope", 1), null)

  const first = await service.getConsumableHistory(db as never, "toner", 1)
  assert.ok(first)
  assert.deepEqual(first.item, { id: "toner", name: "Toner 85A", unit: "ตลับ", minQuantity: 2, onHand: 1, isActive: false, stockState: "low" })
  assert.deepEqual([first.total, first.page, first.pageSize, first.totalPages, first.rows.length], [53, 1, 50, 2, 50])
  assert.equal(first.rows[0].id, "m52", "newest first")
  assert.equal(first.rows[0].actor, "E01 - สมชาย ใจดี")
  assert.equal(first.rows[1].actor, "u-gone", "a user no longer there shows the id, as asset history does")
  const moveArgs = calls.find((call) => call.op === "movements")!.args as { where: unknown; orderBy: unknown; skip: number; take: number }
  assert.deepEqual([moveArgs.where, moveArgs.orderBy, moveArgs.skip, moveArgs.take], [{ itemId: "toner" }, [{ performedAt: "desc" }, { id: "desc" }], 0, 50])
  const userCalls = calls.filter((call) => call.op === "users")
  assert.equal(userCalls.length, 1, "one user read per page")
  assert.deepEqual([...(userCalls[0].args as { where: { id: { in: string[] } } }).where.id.in].sort(), ["u-gone", "u1"])

  const last = await service.getConsumableHistory(db as never, "toner", 9)
  assert.ok(last)
  assert.equal(last.page, 2, "a page past the end shows the last page")
  assert.deepEqual(last.rows.map((row) => row.id), ["m02", "m01", "m00"])
  assert.deepEqual(last.rows[1], {
    id: "m01", type: "adjust", quantityChange: -1, onHandAfter: 5, performedAt: at(1), receivedDate: null,
    reason: "นับใหม่", note: null, asset: null, actor: "u-gone",
  })
  assert.deepEqual(last.rows[0].asset, { id: "pc1", assetTag: "IT-001", name: "PC" })
})

const dayMs = 86_400_000
const somchai: User = { id: "u1", username: "somchai", displayName: "Somchai", email: null, employee: { code: "E01", fullNameTh: "สมชาย ใจดี" } }
const mouse = (over: Partial<Item> = {}): Item => toner({ id: "mouse", name: "Mouse", unit: "ชิ้น", ...over })

test("getAssetConsumableIssues: the machine's issues newest first, limited, with the total; often counts one kind 2+ times in 90 days", async () => {
  const now = Date.now()
  const at = (daysAgo: number) => new Date(now - daysAgo * dayMs)
  const db = fakeDb({
    items: [toner(), mouse()],
    users: [somchai],
    movements: [
      { id: "i1", itemId: "mouse", type: "issue", quantityChange: -1, assetId: "pc1", performedAt: at(10), performedBy: "u1", note: "พัง" },
      { id: "i2", itemId: "mouse", type: "issue", quantityChange: -1, assetId: "pc1", performedAt: at(60), performedBy: "u-gone", note: null },
      { id: "i3", itemId: "toner", type: "issue", quantityChange: -3, assetId: "pc1", performedAt: at(5), performedBy: "u1", note: null },
      { id: "i4", itemId: "toner", type: "issue", quantityChange: -1, assetId: "pc1", performedAt: at(100), performedBy: "u1", note: null },
      { id: "i5", itemId: "toner", type: "issue", quantityChange: -1, assetId: "pc2", performedAt: at(3), performedBy: "u1", note: null },
      { id: "r1", itemId: "toner", type: "receive", quantityChange: 9, assetId: null, performedAt: at(1), performedBy: "u1", note: null },
    ],
  })
  const result = await service.getAssetConsumableIssues(db.prisma as never, "pc1", 2)
  assert.equal(result.total, 4)
  assert.deepEqual(result.issues, [
    { id: "i3", performedAt: at(5), itemId: "toner", itemName: "Toner 85A", unit: "ตลับ", quantity: 3, performedByName: "E01 - สมชาย ใจดี", note: null },
    { id: "i1", performedAt: at(10), itemId: "mouse", itemName: "Mouse", unit: "ชิ้น", quantity: 1, performedByName: "E01 - สมชาย ใจดี", note: "พัง" },
  ])
  assert.deepEqual(result.often, [{ itemId: "mouse", itemName: "Mouse", count: 2 }], "toner: one inside 90 days, the one at 100 days does not count")

  const all = await service.getAssetConsumableIssues(db.prisma as never, "pc1", 10)
  assert.deepEqual(all.issues.map((issue) => issue.id), ["i3", "i1", "i2", "i4"])
  assert.equal(all.issues[2].performedByName, "u-gone", "a user no longer there shows the id, as the kind history does")
  assert.equal(db.reads.filter((entry) => entry.op === "user.findMany").length, 2, "one user read per call")

  const empty = await service.getAssetConsumableIssues(db.prisma as never, "pc9", 10)
  assert.deepEqual(empty, { issues: [], total: 0, often: [] })
})

test("getConsumableFrequentReport: one row per machine counting issues not quantity, by count then latest, filtered by window, kind and machine", async () => {
  const now = new Date(Date.UTC(2026, 10, 10, 12))
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * dayMs)
  const asset = (id: string, tag: string, custodian: { fullNameTh: string } | null): Asset => ({ id, isActive: true, status: { name: "In Use" }, assetTag: tag, name: `PC ${tag}`, custodian })
  const db = fakeDb({
    items: [toner(), mouse({ isActive: false })],
    assets: [asset("a1", "IT-001", { fullNameTh: "สมชาย ใจดี" }), asset("a2", "IT-002", null), asset("a3", "IT-003", null)],
    movements: [
      { id: "m1", itemId: "toner", type: "issue", quantityChange: -5, assetId: "a1", performedAt: at(80) },
      { id: "m2", itemId: "mouse", type: "issue", quantityChange: -1, assetId: "a1", performedAt: at(20) },
      { id: "m3", itemId: "toner", type: "issue", quantityChange: -1, assetId: "a1", performedAt: at(2) },
      { id: "m4", itemId: "toner", type: "issue", quantityChange: -1, assetId: "a1", performedAt: at(150) },
      { id: "m5", itemId: "mouse", type: "issue", quantityChange: -1, assetId: "a2", performedAt: at(30) },
      { id: "m6", itemId: "mouse", type: "issue", quantityChange: -1, assetId: "a2", performedAt: at(40) },
      { id: "m7", itemId: "toner", type: "issue", quantityChange: -1, assetId: "a3", performedAt: at(10) },
      { id: "m8", itemId: "mouse", type: "issue", quantityChange: -1, assetId: "a3", performedAt: at(5) },
      { id: "m9", itemId: "toner", type: "receive", quantityChange: 20, assetId: null, performedAt: at(1) },
      { id: "m10", itemId: "toner", type: "adjust", quantityChange: -2, assetId: null, performedAt: at(1) },
    ],
  })
  const report = await service.getConsumableFrequentReport(db.prisma as never, { days: 90, now })
  assert.equal(report.more, false)
  assert.deepEqual(report.rows, [
    { assetId: "a1", assetTag: "IT-001", assetName: "PC IT-001", holderName: "สมชาย ใจดี", count: 3, latestAt: at(2), latestItemName: "Toner 85A" },
    { assetId: "a3", assetTag: "IT-003", assetName: "PC IT-003", holderName: null, count: 2, latestAt: at(5), latestItemName: "Mouse" },
    { assetId: "a2", assetTag: "IT-002", assetName: "PC IT-002", holderName: null, count: 2, latestAt: at(30), latestItemName: "Mouse" },
  ], "a quantity of 5 is one time; a3 and a2 tie on count, a3's latest is newer")
  assert.equal(db.groupBys.length, 1)
  const group = db.groupBys[0] as { by: string[]; where: { type: string; performedAt: { gte: Date } } }
  assert.deepEqual([group.by, group.where.type, group.where.performedAt.gte.getTime()], [["assetId"], "issue", at(90).getTime()])
  assert.equal(db.reads.filter((entry) => entry.op === "asset.findMany").length, 1, "one asset read")
  assert.equal(db.reads.filter((entry) => entry.op === "movement.findMany").length, 1, "one latest-movement read")

  const wide = await service.getConsumableFrequentReport(db.prisma as never, { days: 180, now })
  assert.deepEqual(wide.rows.map((row) => [row.assetId, row.count]), [["a1", 4], ["a3", 2], ["a2", 2]])

  const mice = await service.getConsumableFrequentReport(db.prisma as never, { days: 90, itemId: "mouse", now })
  assert.deepEqual(mice.rows.map((row) => [row.assetId, row.count, row.latestItemName]), [["a2", 2, "Mouse"], ["a3", 1, "Mouse"], ["a1", 1, "Mouse"]])
  assert.equal(mice.rows[2].latestAt.getTime(), at(20).getTime(), "the latest is the latest of that kind")

  const one = await service.getConsumableFrequentReport(db.prisma as never, { days: 30, assetId: "a2", now })
  assert.deepEqual(one.rows.map((row) => [row.assetId, row.count]), [["a2", 1]])

  const none = await service.getConsumableFrequentReport(db.prisma as never, { days: 30, itemId: "nope", now })
  assert.deepEqual(none, { rows: [], more: false })
})

test("getConsumableFrequentReport: the top 100 machines, more is true when a 101st exists", async () => {
  const now = new Date(Date.UTC(2026, 10, 10, 12))
  const seed = (count: number) => fakeDb({
    items: [toner()],
    assets: Array.from({ length: count }, (_, index) => ({ id: `a${index}`, isActive: true, status: { name: "In Use" }, assetTag: `T${index}`, name: `PC ${index}` })),
    movements: Array.from({ length: count }, (_, index) => ({ id: `m${index}`, itemId: "toner", type: "issue", quantityChange: -1, assetId: `a${index}`, performedAt: new Date(now.getTime() - (index + 1) * 60_000) })),
  })
  const full = await service.getConsumableFrequentReport(seed(101).prisma as never, { days: 90, now })
  assert.equal(full.rows.length, 100)
  assert.equal(full.more, true)
  assert.equal(full.rows[99].assetId, "a99", "the 101st (oldest) is left out")
  const exact = await service.getConsumableFrequentReport(seed(100).prisma as never, { days: 90, now })
  assert.deepEqual([exact.rows.length, exact.more], [100, false])
})

test("source: the frequent report groups by assetId in the database, with no per-machine query", () => {
  const source = read("src/lib/consumable-service.ts")
  const start = source.indexOf("export async function getConsumableFrequentReport(")
  assert.ok(start >= 0)
  const end = source.indexOf("\nexport ", start + 1)
  const body = source.slice(start, end < 0 ? undefined : end)
  assert.match(body, /consumableMovement\.groupBy\(\{\s*by: \["assetId"\]/)
  assert.match(body, /take: CONSUMABLE_REPORT_ROWS \+ 1/)
  assert.doesNotMatch(body, /for \(|\.forEach\(|Promise\.all\(\s*\w+\.map/, "no loop of queries per machine")
  assert.ok([...body.matchAll(/await /g)].length <= 3, "groupBy, then one asset read and one latest-movement read")
})

test("parseConsumableReportDays: 30 / 90 / 180 / 365, anything else is 90", () => {
  assert.deepEqual([...service.consumableReportDays], [30, 90, 180, 365])
  assert.equal(service.parseConsumableReportDays(undefined), 90)
  assert.equal(service.parseConsumableReportDays("30"), 30)
  assert.equal(service.parseConsumableReportDays("365"), 365)
  assert.equal(service.parseConsumableReportDays("7"), 90)
  assert.equal(service.parseConsumableReportDays("90abc"), 90)
})
