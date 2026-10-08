import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getApiErrorKey } from "../src/lib/api-error-catalog.ts"
import { isExposableError, unexpectedErrorText } from "../src/lib/api-error-exposure.ts"

class AppConflictError extends Error {}

test("errors the code throws on purpose may be shown", () => {
  assert.equal(isExposableError(new Error("Asset not found")), true)
  assert.equal(isExposableError(new AppConflictError("ASSET_ACTIVE_CHECKOUT_EXISTS")), true)
})

test("database, filesystem, programming errors and non-errors are hidden", () => {
  const prisma = Object.assign(new Error("Invalid `prisma.asset.update()` invocation: Unique constraint failed on the fields: (`assetTag`)"), { name: "PrismaClientKnownRequestError", code: "P2002", clientVersion: "7.10.0" })
  const fsError = Object.assign(new Error("ENOENT: no such file or directory, open 'D:\\uploads\\x.jpg'"), { code: "ENOENT", errno: -4058, syscall: "open" })
  assert.equal(isExposableError(prisma), false)
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

test("errorResponse hides what must not be shown and logs it with the same reference", () => {
  const source = readFileSync("src/lib/api-response.ts", "utf8")
  assert.match(source, /if \(!isExposableError\(error\)\)/)
  assert.match(source, /randomUUID\(\)\.replaceAll\("-", ""\)\.slice\(0, 8\)/)
  assert.match(source, /console\.error\(`\[api error\] ref \$\{reference\}`, error\)/)
  assert.match(source, /\{ error: unexpectedErrorText\(reference\) \}, \{ status: 500 \}/)
})

test("routes that answered with error.message now go through the same rule", () => {
  for (const file of ["src/app/api/companies/route.ts", "src/app/api/companies/[id]/route.ts", "src/app/api/admin/settings/ldap-sync/route.ts", "src/app/api/notifications/digest/route.ts"]) {
    const source = readFileSync(file, "utf8")
    assert.doesNotMatch(source, /error instanceof Error \? error\.message :/, file)
  }
})
