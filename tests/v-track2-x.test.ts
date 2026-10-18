import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { resolveValidationMessage, type MessageLookup } from "../src/lib/field-error-client.ts"

// V track plan 2, the addendum (the user's answers of 2026-10-18 to the plan's open issues, Tasks 31a–31e). One test per
// task. Sources are read with LF line endings, so the regexes may contain \n.
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
const lookup = (table: Record<string, string>): MessageLookup => ({
  has: (key) => typeof table[key] === "string",
  get: (key, params) => table[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name])),
})
// The form's message for a code, as useValidationMessage resolves it (common.validation, then the api-error catalog).
const say = (locale: "th" | "en", code: string) => {
  const table = messages(locale)
  return resolveValidationMessage(code, undefined, { validation: lookup(table.common.validation), apiErrors: lookup(table.apiErrors) })
}

// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/v-track-s.test.ts). The prisma stand-in calls globalThis.__vTrack2X.prisma[model][method]; a call with no handler
// throws, so a test names every query its route makes.
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
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__vTrack2X?.prisma?.[model]?.[method]
      if (!handler) throw new Error("no stand-in for prisma." + model + "." + method)
      return handler(...args)
    }
    export const prisma = new Proxy({}, {
      get: (_, model) => model === "$transaction"
        ? async (work) => (typeof work === "function" ? work(prisma) : Promise.all(work))
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
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const stubDb = (prisma: Record<string, Record<string, (...args: never[]) => unknown>>) => Object.assign(globalThis, { __vTrack2X: { prisma } })

test("checkin's refusals of the return condition and the return status name their field, which the form already shows (v-track plan 2 task 31a, O7)", async () => {
  type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>
  const { POST } = await load<{ POST: Handler }>("src/app/api/assets/[id]/checkin/route.ts")
  const params = { params: Promise.resolve({ id: "asset-1" }) }
  const checkin = () => new Request("http://localhost/api/assets/asset-1/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      checkoutId: "checkout-1", returnDate: "2026-10-18", returnBy: "Somchai", receiveBy: "Somsri", conditionAfter: "condition-1",
      nextStatusId: "status-1", nextLocationId: "location-1",
    }),
  })
  const refusal = async (response: Response) => [response.status, await response.json()]
  const prisma = (condition: unknown, returnStatus: unknown) => ({
    asset: { findFirst: () => ({ id: "asset-1" }) },
    assetCheckout: { findFirst: () => ({ id: "checkout-1" }) },
    assetCondition: { findUnique: () => condition },
    assetStatus: { findFirst: () => returnStatus },
  })

  // A condition that is gone, inactive or not offered for a return: the condition select, plan 1 S10's shape (S-R7).
  stubDb(prisma(null, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    code: "ASSET_STATE_MASTER_NOT_FOUND", error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" },
  }])
  stubDb(prisma({ name: "Excellent", isActive: true }, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    code: "ASSET_CONDITION_NOT_SELECTABLE", error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" },
  }])
  // A status that is not a return status: the status select. Status codes and messages are unchanged.
  stubDb(prisma({ name: "Good", isActive: true }, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    error: "Invalid return status for check-in", fieldErrors: { nextStatusId: "invalidReturnStatus" },
  }])

  // Both codes are api-error catalog keys, so the field reads the sentence the toast showed, not the generic one.
  for (const locale of ["th", "en"] as const) {
    const table = messages(locale)
    assert.equal(say(locale, "invalidReturnCondition"), table.apiErrors.invalidReturnCondition, locale)
    assert.equal(say(locale, "invalidReturnStatus"), table.apiErrors.invalidReturnStatus, locale)
    assert.notEqual(say(locale, "invalidReturnStatus"), table.common.validation.invalid, locale)
  }
  assert.equal(say("th", "invalidReturnCondition"), "สภาพตอนรับคืนไม่ถูกต้อง")

  // The checkin form (Task 10, O3) already holds both keys, shows each under its select and hands a refusal back from
  // its review dialog (O-R1): no form change.
  const form = read(`${C}asset-operations/checkin-form.tsx`)
  assert.match(form, /\n  conditionAfter: "checkin-condition-after",\n  nextStatusId: "checkin-next-status",\n/)
  assert.ok(form.includes('error={fieldErrors.message("conditionAfter")}'))
  assert.ok(form.includes('error={fieldErrors.message("nextStatusId")}'))
  assert.ok(form.includes("const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  assert.ok(form.includes("if (fieldErrors.applyServer(payload) && focusFirstError()) return"))
})
