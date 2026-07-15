import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { supplierSchema } from "../src/lib/validations/supplier.ts"
import { getSupplierApiError } from "../src/lib/supplier-api-error.ts"

test("maps supplier validation issues to form field codes", () => {
  const result = supplierSchema.safeParse({
    code: "",
    name: "Vendor",
    email: "not-an-email",
    phone: "x".repeat(51),
    isActive: true,
  })
  assert.equal(result.success, false)
  if (result.success) return

  assert.deepEqual(getSupplierApiError(result.error), {
    status: 400,
    payload: {
      error: "Invalid supplier data",
      fieldErrors: {
        code: "required",
        email: "invalid_email",
        phone: "too_long",
      },
    },
  })
})

test("maps a duplicate supplier code to a code field conflict", () => {
  assert.deepEqual(getSupplierApiError({ code: "P2002" }), {
    status: 409,
    payload: {
      error: "Supplier code already exists",
      fieldErrors: { code: "duplicate_code" },
    },
  })
})

test("ignores unrelated errors", () => {
  assert.equal(getSupplierApiError(new Error("boom")), null)
})

test("supplier create and update routes return structured form errors", () => {
  for (const path of ["src/app/api/suppliers/route.ts", "src/app/api/suppliers/[id]/route.ts"]) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /getSupplierApiError/)
    assert.match(source, /NextResponse\.json\(supplierError\.payload, \{ status: supplierError\.status \}\)/)
  }
})
