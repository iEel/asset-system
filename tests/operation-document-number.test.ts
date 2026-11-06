import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

// The running number of RT- / HO- documents (group 7 plan 4 final review): a multi-asset return writes one row per
// machine under one RT- number, so the next RT- counts distinct numbers; HO- still counts rows.
;(nodeModule as unknown as {
  registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void
}).registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})

const documentNumber = await import(pathToFileURL("src/lib/operation-document-number.ts").href) as typeof import("../src/lib/operation-document-number.ts")

type Where = { documentNo: string | { startsWith: string } }
const matches = (documentNo: string, where: Where) =>
  typeof where.documentNo === "string" ? documentNo === where.documentNo : documentNo.startsWith(where.documentNo.startsWith)

// A fake tx: findMany honours `distinct: ["documentNo"]` the way Prisma does; count counts rows.
function fakeTx(table: "assetCheckin" | "assetCheckout", documentNos: string[]) {
  const rows = documentNos.map((documentNo, index) => ({ id: `row-${index}`, documentNo }))
  const model = {
    count: async ({ where }: { where: Where }) => rows.filter((row) => matches(row.documentNo, where)).length,
    findMany: async ({ where, distinct }: { where: Where; distinct?: string[] }) => {
      const found = rows.filter((row) => matches(row.documentNo, where))
      if (!distinct?.includes("documentNo")) return found
      return [...new Map(found.map((row) => [row.documentNo, row])).values()]
    },
    findFirst: async ({ where }: { where: Where }) => rows.find((row) => matches(row.documentNo, where)) ?? null,
  }
  return {
    systemSetting: { findMany: async () => [] },
    [table]: model,
  } as unknown as Parameters<typeof documentNumber.generateCheckinDocumentNo>[0]
}

const november = new Date(2026, 10, 7)

test("a multi-asset RT- counts once: 3 rows of RT-202611-0005 and four single returns give RT-202611-0006, not 0008", async () => {
  const tx = fakeTx("assetCheckin", [
    "RT-202611-0001", "RT-202611-0002", "RT-202611-0003", "RT-202611-0004",
    "RT-202611-0005", "RT-202611-0005", "RT-202611-0005",
  ])
  assert.equal(await documentNumber.generateCheckinDocumentNo(tx, november), "RT-202611-0006")
})

test("the probe still steps past a number already taken after the distinct count", async () => {
  // Two distinct numbers, but 0003 is taken (a gap at 0002): the count gives 0003, the probe moves on to 0004.
  const tx = fakeTx("assetCheckin", ["RT-202611-0001", "RT-202611-0001", "RT-202611-0003"])
  assert.equal(await documentNumber.generateCheckinDocumentNo(tx, november), "RT-202611-0004")
})

test("HO- numbers still count rows", async () => {
  const tx = fakeTx("assetCheckout", ["HO-202611-0001", "HO-202611-0002"])
  assert.equal(await documentNumber.generateCheckoutDocumentNo(tx, november), "HO-202611-0003")
})
