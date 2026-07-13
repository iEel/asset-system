import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const routePath = "src/app/api/disposal-requests/bulk-execution/route.ts"

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

  assert.match(source, /disposalBulkExecutionSchema\.parse\(await request\.json\(\)\)/)
  assert.equal((source.match(/request\.json\(\)/g) ?? []).length, 1)
  assert.match(source, /error instanceof ZodError/)
  assert.match(source, /errorResponse\(error, 400\)/)
})

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
