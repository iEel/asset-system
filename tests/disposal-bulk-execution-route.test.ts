import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

const routePath = "src/app/api/disposal-requests/bulk-execution/route.ts"

type RouteTestState = {
  authCalls: number
  permissionCalls: number
  schemaParseCalls: number
  readinessCalls: number
  previewCalls: number
  commitCalls: number
}

const routeTestState: RouteTestState = {
  authCalls: 0,
  permissionCalls: 0,
  schemaParseCalls: 0,
  readinessCalls: 0,
  previewCalls: 0,
  commitCalls: 0,
}

Object.assign(globalThis, { __disposalBulkExecutionRouteTestState: routeTestState })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/api-response", `
    export function errorResponse(error, fallbackStatus = 500) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : fallbackStatus
      return Response.json({ error: message }, { status })
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() {
      globalThis.__disposalBulkExecutionRouteTestState.authCalls += 1
      return { id: "user-1", employeeId: "employee-1", roles: [], permissions: ["disposal:edit"] }
    }
    export function requirePermission() {
      globalThis.__disposalBulkExecutionRouteTestState.permissionCalls += 1
    }
  `],
  ["@/lib/db", "export const prisma = {}"],
  ["@/lib/disposal-bulk-execution-service", `
    export async function inspectDisposalBulkExecution() {
      globalThis.__disposalBulkExecutionRouteTestState.previewCalls += 1
      return { mode: "preview", items: [] }
    }
    export async function commitDisposalBulkExecution() {
      globalThis.__disposalBulkExecutionRouteTestState.commitCalls += 1
      return { mode: "commit", items: [] }
    }
  `],
  ["@/lib/disposal-schema-readiness", `
    export async function getDisposalBatchSchemaReadiness() {
      globalThis.__disposalBulkExecutionRouteTestState.readinessCalls += 1
      return "ready"
    }
  `],
  ["@/lib/validations/disposal", `
    export const disposalBulkExecutionSchema = {
      parse(input) {
        globalThis.__disposalBulkExecutionRouteTestState.schemaParseCalls += 1
        return input
      },
    }
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(
      specifier: string,
      context: unknown,
      nextResolve: (specifier: string, context: unknown) => unknown,
    ): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return {
        url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`,
        shortCircuit: true,
      }
    }
    return nextResolve(specifier, context)
  },
})

const { POST } = await import(pathToFileURL(routePath).href) as {
  POST(request: Request): Promise<Response>
}

beforeEach(() => {
  Object.assign(routeTestState, {
    authCalls: 0,
    permissionCalls: 0,
    schemaParseCalls: 0,
    readinessCalls: 0,
    previewCalls: 0,
    commitCalls: 0,
  })
})

test("bulk execution route authenticates and authorizes disposal edits", () => {
  const source = readFileSync(routePath, "utf8")

  assert.match(source, /requireAuth\(\)/)
  assert.match(source, /requirePermission\(user, "disposal", "edit"\)/)
  assert.match(source, /userId:\s*user\.id/)
  assert.match(source, /employeeId:\s*user\.employeeId/)
  assert.match(source, /roles:\s*user\.roles/)
  assert.match(source, /permissions:\s*user\.permissions/)
})

test("bulk execution route parses one request body with the bulk execution schema", () => {
  const source = readFileSync(routePath, "utf8")

  assert.match(source, /disposalBulkExecutionSchema\.parse\(body\)/)
  assert.equal((source.match(/request\.json\(\)/g) ?? []).length, 1)
  assert.match(source, /error instanceof ZodError/)
  assert.match(source, /errorResponse\(error, 400\)/)
})

for (const malformedBody of ["{", ""] as const) {
  test(`bulk execution route rejects ${malformedBody ? "malformed" : "empty"} JSON before schema or services`, async () => {
    const response = await POST(new Request("http://localhost/api/disposal-requests/bulk-execution", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: malformedBody || undefined,
    }))

    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: "Invalid JSON body" })
    assert.equal(routeTestState.authCalls, 1)
    assert.equal(routeTestState.permissionCalls, 1)
    assert.equal(routeTestState.schemaParseCalls, 0)
    assert.equal(routeTestState.readinessCalls, 0)
    assert.equal(routeTestState.previewCalls, 0)
    assert.equal(routeTestState.commitCalls, 0)
  })
}

test("bulk execution route dispatches preview and commit to Task 2 services", () => {
  const source = readFileSync(routePath, "utf8")

  assert.match(source, /if \(input\.mode === "preview"\) \{[\s\S]*?inspectDisposalBulkExecution\(/)
  assert.match(source, /return NextResponse\.json\(await commitDisposalBulkExecution\(/)
})

test("bulk execution route resolves tri-state batch readiness once for both service modes", () => {
  const source = readFileSync(routePath, "utf8")

  assert.match(source, /const batchSchemaReadiness = await getDisposalBatchSchemaReadiness\(\)/)
  assert.equal((source.match(/getDisposalBatchSchemaReadiness\(/g) ?? []).length, 1)
  assert.match(source, /batchSchemaReadiness/)
  assert.doesNotMatch(source, /isDisposalBatchSchemaReady/)
})

test("bulk execution route sanitizes unexpected errors", () => {
  const source = readFileSync(routePath, "utf8")

  assert.match(source, /console\.error\("Disposal bulk execution failed", error\)/)
  assert.match(source, /code:\s*"DISPOSAL_BULK_EXECUTION_FAILED"/)
  assert.match(source, /error:\s*"DISPOSAL_BULK_EXECUTION_FAILED"/)
  assert.match(source, /status:\s*500/)
  assert.doesNotMatch(source, /error\.stack|DATABASE_URL/)
})
