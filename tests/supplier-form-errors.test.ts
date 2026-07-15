import assert from "node:assert/strict"
import test from "node:test"

import { parseSupplierFormError } from "../src/lib/supplier-form-errors.ts"

test("parses only supported supplier field error codes", () => {
  assert.deepEqual(
    parseSupplierFormError({
      error: "Invalid supplier data",
      fieldErrors: {
        code: "duplicate_code",
        email: "invalid_email",
        unknown: "too_long",
        phone: 123,
      },
    }),
    {
      message: "Invalid supplier data",
      fieldErrors: {
        code: "duplicate_code",
        email: "invalid_email",
      },
    }
  )
})

test("falls back safely for non-object responses", () => {
  assert.deepEqual(parseSupplierFormError(null), { fieldErrors: {} })
})
