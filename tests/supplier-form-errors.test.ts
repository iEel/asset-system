import assert from "node:assert/strict"
import test from "node:test"

import { parseSupplierFormError } from "../src/lib/supplier-form-errors.ts"

test("parses only supported supplier field error codes", () => {
  assert.deepEqual(
    parseSupplierFormError({
      error: "Invalid request data",
      fieldErrors: {
        code: "duplicate",
        email: "invalidEmail",
        unknown: "tooLong",
        phone: 123,
      },
    }),
    {
      message: "Invalid request data",
      fieldErrors: {
        code: "duplicate",
        email: "invalidEmail",
      },
    }
  )
})

test("falls back safely for non-object responses", () => {
  assert.deepEqual(parseSupplierFormError(null), { fieldErrors: {} })
})
