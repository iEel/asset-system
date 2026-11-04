import assert from "node:assert/strict"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { ZodError } from "zod"

// Group 6 plan 4 (P4-R1): POST /api/disposal-rounds is the one way to record an actual disposal; the per-row PATCH
// action:"execute" and the bulk execution answer 410 DISPOSAL_USE_ROUND. The routes run with their imports mocked, in the
// style of the bulk-execution route test this replaces.

type RouteState = {
  permissions: Array<[string, string]>
  previews: unknown[]
  commits: unknown[]
  serviceError: { code: string; items: unknown[] } | null
}

const state: RouteState = { permissions: [], previews: [], commits: [], serviceError: null }
// The mocked schema throws the route's own ZodError class, so the route's instanceof check holds.
Object.assign(globalThis, { __disposalRoundRouteState: state, __DisposalRoundZodError: ZodError })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/api-response", `
    export function errorResponse(error, fallbackStatus = 500) {
      if (error && error.name === "ZodError") return Response.json({ error: "Invalid request data", fieldErrors: { requestIds: "required" } }, { status: 400 })
      const message = error instanceof Error ? error.message : "Unexpected error"
      const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : fallbackStatus
      return Response.json({ error: message }, { status })
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() {
      return { id: "user-1", employeeId: "employee-1", roles: [], permissions: ["disposal:edit"] }
    }
    export function requirePermission(user, module, action) {
      globalThis.__disposalRoundRouteState.permissions.push([module, action])
    }
  `],
  ["@/lib/db", "export const prisma = {}"],
  ["@/lib/disposal-api-errors", `
    export function disposalApiError(code, error, status = 400) {
      return Response.json({ code, error }, { status })
    }
  `],
  ["@/lib/field-errors", "export function issuesToFieldErrors() { return {} }"],
  ["@/lib/disposal-policy", "export function getDisposalStatusTargetError() { return null }"],
  ["@/lib/validations/disposal", "export const disposalDecisionSchema = { parse(input) { return input } }"],
  ["@/lib/workflow-approval", "export const workflowApprovalSettingKeys = []; export function parseWorkflowApprovalPolicy() { return { segregationRequired: true } }"],
  ["@/lib/disposal-approval-service", `
    export class DisposalApprovalServiceError extends Error {}
    export async function approveDisposalRequest() { throw new Error("not under test") }
    export async function rejectDisposalRequest() { throw new Error("not under test") }
  `],
  ["@/lib/validations/disposal-round", `
    export const disposalRoundInputSchema = {
      parse(input) {
        if (!Array.isArray(input?.requestIds) || input.requestIds.length === 0) throw new globalThis.__DisposalRoundZodError([])
        return input
      },
    }
  `],
  ["@/lib/disposal-round-service", `
    export class DisposalRoundServiceError extends Error {
      constructor(code, items = []) { super(code); this.code = code; this.items = items }
    }
    function fail() {
      const error = globalThis.__disposalRoundRouteState.serviceError
      if (error) throw new DisposalRoundServiceError(error.code, error.items)
    }
    export async function previewDisposalRound(db, input, actor) {
      fail()
      globalThis.__disposalRoundRouteState.previews.push({ input, actor })
      return { items: [], executorOptions: [] }
    }
    export async function createDisposalRound(db, input, actor) {
      fail()
      globalThis.__disposalRoundRouteState.commits.push({ input, actor })
      return { id: "round-1", roundNo: "DPR-20261105-0001" }
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
    return nextResolve(specifier, context)
  },
})

const rounds = await import(pathToFileURL("src/app/api/disposal-rounds/route.ts").href) as { POST(request: Request): Promise<Response> }
const bulk = await import(pathToFileURL("src/app/api/disposal-requests/bulk-execution/route.ts").href) as { POST(request: Request): Promise<Response> }
const single = await import(pathToFileURL("src/app/api/disposal-requests/[id]/route.ts").href) as {
  PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

const post = (body: unknown) => new Request("http://localhost/api/disposal-rounds", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: typeof body === "string" ? body : JSON.stringify(body),
})

beforeEach(() => {
  Object.assign(state, { permissions: [], previews: [], commits: [], serviceError: null })
})

test("the PATCH execute action answers 410 DISPOSAL_USE_ROUND after the disposal:edit check", async () => {
  const response = await single.PATCH(
    new Request("http://localhost/api/disposal-requests/r1", { method: "PATCH", body: JSON.stringify({ action: "execute" }) }),
    { params: Promise.resolve({ id: "r1" }) },
  )
  assert.equal(response.status, 410)
  assert.deepEqual(await response.json(), { code: "DISPOSAL_USE_ROUND", error: "DISPOSAL_USE_ROUND" })
  assert.deepEqual(state.permissions, [["disposal", "edit"]])
})

test("the bulk execution answers 410 DISPOSAL_USE_ROUND after the disposal:edit check", async () => {
  const response = await bulk.POST(post({ mode: "commit", requestIds: ["r1"] }))
  assert.equal(response.status, 410)
  assert.deepEqual(await response.json(), { code: "DISPOSAL_USE_ROUND", error: "DISPOSAL_USE_ROUND" })
  assert.deepEqual(state.permissions, [["disposal", "edit"]])
})

test("a round preview answers 200 with the items and the executor options", async () => {
  const response = await rounds.POST(post({ mode: "preview", requestIds: ["r1"] }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { items: [], executorOptions: [] })
  assert.deepEqual(state.permissions, [["disposal", "edit"]])
  assert.equal(state.previews.length, 1)
  assert.deepEqual((state.previews[0] as { actor: unknown }).actor, { userId: "user-1", employeeId: "employee-1", roles: [], permissions: ["disposal:edit"] })
})

test("a round commit answers 201 with the new round", async () => {
  const response = await rounds.POST(post({ mode: "commit", requestIds: ["r1"] }))
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { id: "round-1", roundNo: "DPR-20261105-0001" })
  assert.equal(state.commits.length, 1)
})

test("a blocked round answers 409 DISPOSAL_ROUND_BLOCKED with every item", async () => {
  const items = [{ requestId: "r1", outcome: "blocked", code: "DISPOSAL_INVALID_STAGE" }]
  state.serviceError = { code: "DISPOSAL_ROUND_BLOCKED", items }
  const response = await rounds.POST(post({ mode: "commit", requestIds: ["r1"] }))
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { code: "DISPOSAL_ROUND_BLOCKED", error: "DISPOSAL_ROUND_BLOCKED", items })
})

test("the round's other refusals keep their status", async () => {
  for (const [code, status] of [
    ["DISPOSAL_CONCURRENT_UPDATE", 409],
    ["DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN", 403],
    ["DISPOSAL_EMPLOYEE_NOT_FOUND", 404],
    ["DISPOSAL_DOCUMENT_REQUIRED", 400],
  ] as const) {
    state.serviceError = { code, items: [] }
    const response = await rounds.POST(post({ mode: "commit", requestIds: ["r1"] }))
    assert.equal(response.status, status, code)
    assert.equal((await response.json()).code, code)
  }
})

test("an invalid body answers 400 before any service runs", async () => {
  const malformed = await rounds.POST(post("{"))
  assert.equal(malformed.status, 400)
  assert.deepEqual(await malformed.json(), { error: "Invalid JSON body" })
  const invalid = await rounds.POST(post({ mode: "commit", requestIds: [] }))
  assert.equal(invalid.status, 400)
  assert.equal(state.previews.length + state.commits.length, 0)
})
