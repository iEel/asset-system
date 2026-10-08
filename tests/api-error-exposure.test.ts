import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getApiErrorKey } from "../src/lib/api-error-catalog.ts"
import { hideUnexpectedError, isExposableError, unexpectedErrorText } from "../src/lib/api-error-exposure.ts"
import {
  createComponentTransactionSnapshot,
  maxAssetTransactionSnapshotComponents,
  serializeAssetComponentTransactionSnapshots,
  serializeAssetTransactionSnapshot,
  type AssetComponentTransactionSnapshotChangeV1,
  type AssetTransactionSnapshotV1,
} from "../src/lib/asset-transaction-snapshot.ts"

class AppConflictError extends Error {}

test("errors the code throws on purpose may be shown", () => {
  assert.equal(isExposableError(new Error("Asset not found")), true)
  assert.equal(isExposableError(new AppConflictError("ASSET_ACTIVE_CHECKOUT_EXISTS")), true)
})

test("database, filesystem, programming errors and non-errors are hidden", () => {
  const prisma = Object.assign(new Error("Invalid `prisma.asset.update()` invocation: Unique constraint failed on the fields: (`assetTag`)"), { name: "PrismaClientKnownRequestError", code: "P2002", clientVersion: "7.10.0" })
  const fsError = Object.assign(new Error("ENOENT: no such file or directory, open 'D:\\uploads\\x.jpg'"), { code: "ENOENT", errno: -4058, syscall: "open" })
  const adapter = Object.assign(new Error("Login failed for user 'asset_dev'"), { name: "DriverAdapterError" })
  assert.equal(isExposableError(prisma), false)
  assert.equal(isExposableError(adapter), false)
  assert.equal(isExposableError(fsError), false)
  assert.equal(isExposableError(new TypeError("Cannot read properties of undefined (reading 'id')")), false)
  assert.equal(isExposableError(new RangeError("Invalid time value")), false)
  assert.equal(isExposableError("boom"), false)
  assert.equal(isExposableError(null), false)
})

test("the unexpected-error text carries a reference the client still recognises", () => {
  const text = unexpectedErrorText("3f2a9c1d")
  assert.equal(text, "Unexpected error · ref 3f2a9c1d")
  assert.equal(getApiErrorKey(text), getApiErrorKey("Unexpected error"))
  assert.ok(getApiErrorKey("Unexpected error"))
})

test("hideUnexpectedError logs the error with the same reference it returns", (t) => {
  const logged: unknown[][] = []
  t.mock.method(console, "error", (...args: unknown[]) => { logged.push(args) })
  const original = new TypeError("Cannot read properties of undefined (reading 'id')")
  const { reference, text } = hideUnexpectedError(original)
  assert.match(reference, /^[0-9a-f]{8}$/)
  assert.equal(text, unexpectedErrorText(reference))
  assert.deepEqual(logged, [[`[api error] ref ${reference}`, original]])
})

test("errorResponse hides what must not be shown and logs it with the same reference", () => {
  const source = readFileSync("src/lib/api-response.ts", "utf8")
  assert.match(source, /if \(!isExposableError\(error\)\)/)
  assert.match(source, /\{ error: hideUnexpectedError\(error\)\.text \}, \{ status: 500 \}/)
  const helper = readFileSync("src/lib/api-error-exposure.ts", "utf8")
  assert.match(helper, /randomUUID\(\)\.replaceAll\("-", ""\)\.slice\(0, 8\)/)
  assert.match(helper, /console\.error\(`\[api error\] ref \$\{reference\}`, error\)/)
})

test("the cancellation error response hides unexpected errors the same way", () => {
  const source = readFileSync("src/lib/asset-transaction-cancellation-route.ts", "utf8")
  assert.doesNotMatch(source, /error instanceof Error \? error\.message :/)
  assert.match(source, /if \(!isExposableError\(error\)\)/)
  assert.match(source, /\{ error: hideUnexpectedError\(error\)\.text \}, \{ status: 500 \}/)
  assert.match(source, /\{ error: error\.message \}, \{ status: 400 \}/)
})

test("asset transaction snapshot errors are deliberate and stay exposable", () => {
  const caught: unknown[] = []
  const capture = (run: () => unknown) => {
    try {
      run()
    } catch (error) {
      caught.push(error)
    }
  }
  const component = {
    componentLinkId: "link-1",
    componentAssetId: "child-1",
    parentAssetId: "parent-1",
    relationshipStatus: "active",
    relationshipUpdatedAt: "not a date",
    assetUpdatedAt: "2026-10-08T00:00:00.000Z",
    statusId: "status-1",
    conditionId: "condition-1",
    branchId: "branch-1",
    currentLocationId: "location-1",
    custodianId: null,
    departmentId: null,
  }
  capture(() => createComponentTransactionSnapshot(component))
  capture(() => serializeAssetTransactionSnapshot({} as AssetTransactionSnapshotV1))
  capture(() => serializeAssetComponentTransactionSnapshots(
    Array.from({ length: maxAssetTransactionSnapshotComponents + 1 }, () => ({}) as AssetComponentTransactionSnapshotChangeV1),
  ))
  assert.deepEqual(caught.map((error) => (error as Error).message), [
    "Invalid transaction snapshot date",
    "Invalid asset transaction snapshot",
    "Too many component transaction snapshots",
  ])
  for (const error of caught) assert.equal(isExposableError(error), true, (error as Error).message)
})

test("routes that answered with error.message now go through the same rule", () => {
  for (const file of ["src/app/api/companies/route.ts", "src/app/api/companies/[id]/route.ts", "src/app/api/admin/settings/ldap-sync/route.ts", "src/app/api/notifications/digest/route.ts"]) {
    const source = readFileSync(file, "utf8")
    assert.doesNotMatch(source, /error instanceof Error \? error\.message :/, file)
  }
})
