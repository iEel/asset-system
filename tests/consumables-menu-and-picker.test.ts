import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import { assetOperationModes, getConsumableVerdict, type AssetOperationFacts } from "../src/lib/asset-operation-eligibility.ts"
import { getAssetOperationSearchVerdict, parseAssetOperationSearch } from "../src/lib/asset-operation-search-rules.ts"
import { rbacRoutePermissionMatrix } from "../src/lib/rbac-route-matrix.ts"

// ของใช้สิ้นเปลือง plan 2 task 1: the menu item, the words, the `consumable` picker mode and its search permission.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>

// ---------------------------------------------------------------- menu

test("menu: the consumables item sits in sectionAssets right after assetRegister, with consumable:view and the Cable icon", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  const menu = sidebar.slice(sidebar.indexOf("const menuSections"), sidebar.indexOf("const visibleSections"))
  const assets = menu.slice(menu.indexOf('labelKey: "sectionAssets"'), menu.indexOf('labelKey: "sectionSystem"'))
  const keys = [...assets.matchAll(/labelKey: "(\w+)"/g)].map((match) => match[1])
  assert.deepEqual(keys.slice(0, 3), ["sectionAssets", "assetRegister", "consumables"])
  assert.match(
    assets,
    /\{\s*labelKey: "consumables",\s*href: `\/\$\{locale\}\/consumables`,\s*permission: \{ module: "consumable", action: "view" \},\s*icon: <Cable size=\{20\} \/>,\s*\}/,
  )
  assert.match(sidebar, /^\s*Cable,$/m, "Cable is imported from lucide-react")
  assert.equal(menu.match(/labelKey: "consumables"/g)?.length, 1)
})

test("words: nav.consumables and consumablesPage.pickerBlocked in both catalogs", () => {
  const th = messages("th")
  const en = messages("en")
  assert.equal(th.nav.consumables, "ของใช้สิ้นเปลือง")
  assert.equal(en.nav.consumables, "Consumables")
  assert.equal(th.consumablesPage.pickerBlocked, "เครื่องนี้อยู่ในสถานะที่เบิกของให้ไม่ได้")
  assert.equal(en.consumablesPage.pickerBlocked, "This asset cannot take consumables")
})

test("glossary: rows for ของใช้สิ้นเปลือง, เบิกไปใช้, รับเข้า, ปรับยอด, ขั้นต่ำ and คงเหลือ", () => {
  const rows = read("docs/19_THAI_GLOSSARY.md").split("\n").filter((line) => line.startsWith("|"))
  for (const word of ["ของใช้สิ้นเปลือง", "เบิกไปใช้", "รับเข้า", "ปรับยอด", "ขั้นต่ำ", "คงเหลือ"]) {
    // The word is the used term (column 2, bold) of a row.
    assert.ok(rows.some((row) => row.split("|")[2]?.includes(`**${word}**`)), word)
  }
})

// ---------------------------------------------------------------- picker mode

const facts = (overrides: Partial<AssetOperationFacts>): AssetOperationFacts => ({
  statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null, ...overrides,
})
const yes = { eligible: true, reasonKey: null }
const blocked = { eligible: false, reasonKey: "consumablesPage.pickerBlocked" }

test("picker: consumable is a mode, parsed from the URL", () => {
  assert.ok((assetOperationModes as readonly string[]).includes("consumable"))
  const parsed = parseAssetOperationSearch(new URLSearchParams("mode=consumable&q=0228"))
  assert.deepEqual(parsed, { mode: "consumable", q: "0228", id: null, assignCustodian: false })
})

test("picker verdicts: Ready, In Use, Checked Out and Under Maintenance pass; the blocked statuses and an inactive asset block", () => {
  for (const statusName of ["Ready", "In Use", "Checked Out", "Under Maintenance"]) {
    assert.deepEqual(getConsumableVerdict({ statusName, isActive: true }), yes, statusName)
    assert.deepEqual(getAssetOperationSearchVerdict({ mode: "consumable", q: "x", id: null, assignCustodian: false }, facts({ statusName })), yes, statusName)
  }
  for (const statusName of ["Disposed", "Retired", "Lost", "Missing", "Pending Disposal"]) {
    assert.deepEqual(getConsumableVerdict({ statusName, isActive: true }), blocked, statusName)
    assert.deepEqual(getAssetOperationSearchVerdict({ mode: "consumable", q: "x", id: null, assignCustodian: false }, facts({ statusName })), blocked, statusName)
  }
  assert.deepEqual(getConsumableVerdict({ statusName: "Ready", isActive: false }), blocked, "inactive")
})

test("picker verdicts: any category or ownership, and the transaction facts do not refuse", () => {
  const input = { mode: "consumable" as const, q: "x", id: null, assignCustodian: false }
  for (const ownership of ["personal", "shared", "stock", "component", "software_license"] as const) {
    assert.deepEqual(getAssetOperationSearchVerdict(input, facts({ ownership })), yes, ownership)
  }
  assert.deepEqual(
    getAssetOperationSearchVerdict(input, facts({
      statusName: "Checked Out", custodianId: "e1", openCheckout: { id: "co", handoverMode: "temporary_loan" }, hasOpenRepair: true,
      conditionName: "Damaged", outstanding: { linkId: "l", checkinId: null },
    })),
    yes,
  )
})

// ---------------------------------------------------------------- search route permission

const state: { permissions: string[]; checks: string[] } = { permissions: [], checks: [] }
Object.assign(globalThis, { __consumablePickerRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__consumablePickerRouteState
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: state().permissions } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      state().checks.push(module + ":" + action)
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/db", `
    const ready = { id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก", serialNumber: null, ownershipType: "personal", modelId: null, custodianId: null,
      currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "In Use", nameTh: "ใช้งานอยู่" },
      currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null }
    const model = (rows) => ({ findMany: async () => rows, count: async () => rows.length })
    export const prisma = { asset: model([ready]), assetCheckout: model([]), maintenanceTicket: model([]),
      department: model([]), location: model([]), attachment: model([]), assetComponent: model([]) }
  `],
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

const route = await import(pathToFileURL("src/app/api/asset-operations/search/route.ts").href) as { GET(request: Request): Promise<Response> }
const get = (query: string) => route.GET(new Request(`http://localhost/api/asset-operations/search${query}`))

beforeEach(() => {
  state.permissions = []
  state.checks = []
})

test("search route: mode=consumable checks consumable:create only", async () => {
  state.permissions = ["consumable:create"]
  const response = await get("?mode=consumable&q=0228")
  assert.equal(response.status, 200)
  assert.deepEqual(state.checks, ["consumable:create"])
  const { data } = await response.json() as { data: { mode: string; rows: Array<{ eligible: boolean; reasonKey: string | null }> } }
  assert.deepEqual([data.mode, data.rows.map((row) => [row.eligible, row.reasonKey])], ["consumable", [[true, null]]])

  state.permissions = ["asset:edit"]
  state.checks = []
  assert.equal((await get("?mode=consumable&q=0228")).status, 403, "asset:edit alone does not open the consumable picker")
  assert.deepEqual(state.checks, ["consumable:create"])
})

test("search route: the other modes keep asset:edit, and consumable:create does not open them", async () => {
  for (const mode of ["checkout", "checkin", "transfer", "bulkMove"]) {
    state.permissions = ["asset:edit"]
    state.checks = []
    assert.equal((await get(`?mode=${mode}&q=0228`)).status, 200, mode)
    assert.deepEqual(state.checks, ["asset:edit"], mode)

    state.permissions = ["consumable:create"]
    state.checks = []
    assert.equal((await get(`?mode=${mode}&q=0228`)).status, 403, mode)
    assert.deepEqual(state.checks, ["asset:edit"], mode)
  }
  // A missing or unknown mode keeps the asset:edit check before the 400.
  state.permissions = ["consumable:create"]
  assert.equal((await get("?mode=audit&q=0228")).status, 403)
})

test("search route source: both branches pinned, and the RBAC matrix lists both checks", () => {
  const source = read("src/app/api/asset-operations/search/route.ts")
  assert.match(source, /requirePermission\(user, "consumable", "create"\)/)
  assert.match(source, /requirePermission\(user, "asset", "edit"\)/)
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/asset-operations/search/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "edit" }, { module: "consumable", action: "create" }])
})
