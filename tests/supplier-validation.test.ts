import assert from "node:assert/strict"
import test from "node:test"

import { supplierSchema } from "../src/lib/validations/supplier.ts"

const baseSupplier = {
  code: "SUP-1",
  name: "Vendor",
  email: "",
  isActive: true,
}

test("normalizes optional supplier fields to null", () => {
  const result = supplierSchema.parse({
    ...baseSupplier,
    contactPerson: " ",
    phone: "",
    email: "",
    address: "",
  })

  assert.equal(result.contactPerson, null)
  assert.equal(result.phone, null)
  assert.equal(result.email, null)
  assert.equal(result.address, null)
})

test("enforces supplier database field lengths", () => {
  assert.equal(
    supplierSchema.safeParse({ ...baseSupplier, contactPerson: "x".repeat(201) }).success,
    false
  )
  assert.equal(
    supplierSchema.safeParse({ ...baseSupplier, phone: "x".repeat(51) }).success,
    false
  )
  assert.equal(
    supplierSchema.safeParse({ ...baseSupplier, address: "x".repeat(501) }).success,
    false
  )
})

test("accepts legacy supplier codes and valid 13 digit tax ids", () => {
  assert.equal(supplierSchema.safeParse({ ...baseSupplier, code: "LEGACY-SUPPLIER" }).success, true)
  assert.equal(supplierSchema.safeParse({ ...baseSupplier, code: "0105559065799" }).success, true)
})

test("allows optional email to be omitted", () => {
  assert.equal(
    supplierSchema.safeParse({ code: baseSupplier.code, name: baseSupplier.name, isActive: baseSupplier.isActive }).success,
    true
  )
})
