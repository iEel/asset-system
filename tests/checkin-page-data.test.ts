import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import { getCheckinVerdict } from "../src/lib/asset-operation-eligibility.ts"
import { assetOwnershipTypes, type AssetOwnershipType } from "../src/lib/asset-ownership.ts"

type Call = { call: string; args: Record<string, unknown> }
const state: { checkout: Record<string, unknown> | null; answer: Record<string, unknown>; calls: Call[] } = {
  checkout: null,
  answer: { mode: "checkin", total: 0, rows: [] },
  calls: [],
}
Object.assign(globalThis, { __checkinPageDataState: state })

const mockedModuleSources = new Map<string, string>([
  ["@/lib/db", `
    const state = () => globalThis.__checkinPageDataState
    export const prisma = {
      assetCheckout: {
        async findFirst(args) {
          state().calls.push({ call: "assetCheckout.findFirst", args })
          return state().checkout
        },
      },
      asset: {
        async count(args) {
          state().calls.push({ call: "asset.count", args })
          return 42
        },
      },
    }
  `],
  ["@/lib/asset-operation-search", `
    const state = () => globalThis.__checkinPageDataState
    export async function searchAssetOperationOptions(db, input) {
      state().calls.push({ call: "search", args: { input } })
      return state().answer
    }
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

const data = await import(pathToFileURL("src/lib/checkin-page-data.ts").href) as typeof import("../src/lib/checkin-page-data.ts")

const handoverRow = { id: "asset-1", assetTag: "NB-0228", eligible: true, reasonKey: null, checkout: { id: "co-1" } }

beforeEach(() => {
  state.calls.length = 0
})

test("?checkoutId= starts with that open handover's row, read by id; it wins over ?assetId= (spec 6.4)", async () => {
  state.checkout = { assetId: "asset-1" }; state.answer = { mode: "checkin", total: 1, rows: [handoverRow] }
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: "co-1", assetId: "asset-9" }), { row: handoverRow, query: "" })
  assert.deepEqual(state.calls[0], { call: "assetCheckout.findFirst", args: { where: { id: "co-1", isReturned: false, transactionStatus: "active" }, select: { assetId: true } } })
  assert.deepEqual(state.calls[1], { call: "search", args: { input: { mode: "checkin", q: "", id: "asset-1", assignCustodian: false, handedOverAssetId: null } } })
  state.calls.length = 0
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: ["co-1", "co-2"] }), { row: handoverRow, query: "" }, "a repeated ?checkoutId= takes the first")
  assert.deepEqual(state.calls[0], { call: "assetCheckout.findFirst", args: { where: { id: "co-1", isReturned: false, transactionStatus: "active" }, select: { assetId: true } } })
})

test("a blocked handover arrives chosen-but-blocked; a returned or unknown one, or another handover of the asset, gives nothing", async () => {
  const blocked = { ...handoverRow, eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" }
  state.checkout = { assetId: "asset-1" }; state.answer = { mode: "checkin", total: 1, rows: [blocked] }
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: "co-1" }), { row: blocked, query: "" })
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: "co-2" }), { row: null, query: "" })
  state.checkout = null; state.calls.length = 0
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: "co-gone" }), { row: null, query: "" })
  assert.equal(state.calls.some((call) => call.call === "search"), false)
})

test("?assetId= fills the search with the asset's tag and chooses nothing; an unknown asset or no parameter leaves it empty", async () => {
  state.answer = { mode: "checkin", total: 1, rows: [{ ...handoverRow, legacy: true, checkout: undefined }] }
  assert.deepEqual(await data.getCheckinPreselect({ assetId: "asset-2" }), { row: null, query: "NB-0228" })
  assert.deepEqual(state.calls.at(-1), { call: "search", args: { input: { mode: "checkin", q: "", id: "asset-2", assignCustodian: false, handedOverAssetId: null } } })
  assert.equal(state.calls.some((call) => call.call === "assetCheckout.findFirst"), false)
  assert.deepEqual(await data.getCheckinPreselect({ assetId: ["asset-2", "asset-3"] }), { row: null, query: "NB-0228" }, "a repeated ?assetId= takes the first")
  assert.deepEqual(state.calls.at(-1), { call: "search", args: { input: { mode: "checkin", q: "", id: "asset-2", assignCustodian: false, handedOverAssetId: null } } })
  state.answer = { mode: "checkin", total: 0, rows: [] }
  assert.deepEqual(await data.getCheckinPreselect({ assetId: "gone" }), { row: null, query: "" })
  state.calls.length = 0
  assert.deepEqual(await data.getCheckinPreselect({}), { row: null, query: "" })
  assert.deepEqual(state.calls, [])
})

test("the legacy count is one count over the legacy rule", async () => {
  assert.deepEqual(data.legacyReturnCountWhere, {
    isActive: true,
    custodianId: { not: null },
    ownershipType: { in: ["personal", "shared", "stock"] },
    status: { name: { in: ["Ready", "In Use"] } },
    checkouts: { none: { isReturned: false, transactionStatus: "active" } },
    maintenanceTickets: { none: { isActive: true, repairStatus: { notIn: ["closed", "cancelled"] } } },
  })
  assert.equal(await data.countLegacyReturns(), 42)
  assert.deepEqual(state.calls.at(-1), { call: "asset.count", args: { where: data.legacyReturnCountWhere } })
})

test("the count's ownership types and statuses are exactly those getCheckinVerdict takes on the legacy path (one rule)", () => {
  const facts = (ownership: AssetOwnershipType, statusName: string) => ({ statusName, ownership, custodianId: "emp-1", openCheckout: null, hasOpenRepair: false })
  assert.deepEqual([...data.legacyReturnOwnershipTypes], assetOwnershipTypes.filter((ownership) => getCheckinVerdict(facts(ownership, "Ready")).eligible))
  const statuses = ["Draft", "Ready", "In Use", "Reserved", "Checked Out", "In Transit", "Under Maintenance", "Pending Repair", "Under Inspection", "Lost", "Missing", "Pending Disposal", "Disposed", "Retired"] // prisma/seed.ts:17-30
  assert.deepEqual([...data.legacyReturnStatusNames], statuses.filter((status) => getCheckinVerdict(facts("personal", status)).eligible))
})
