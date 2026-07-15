import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/supplier-form.tsx", "utf8")

test("supplier form exposes mobile-friendly field metadata", () => {
  assert.match(source, /type="tel"/)
  assert.match(source, /inputMode="tel"/)
  assert.match(source, /autoComplete="tel"/)
  assert.match(source, /autoComplete="email"/)
  assert.match(source, /autoComplete="street-address"/)
  assert.match(source, /min-h-11/)
})

test("supplier form presents associated inline errors", () => {
  assert.match(source, /parseSupplierFormError/)
  assert.match(source, /aria-invalid=/)
  assert.match(source, /aria-describedby=/)
  assert.match(source, /role="alert"/)
  assert.match(source, /fieldErrors/)
})

test("supplier form warns before abandoning unsaved changes", () => {
  assert.match(source, /addEventListener\("beforeunload"/)
  assert.match(source, /removeEventListener\("beforeunload"/)
  assert.match(source, /unsavedChangesConfirm/)
  assert.match(source, /confirmNavigation/)
})

test("supplier form localization keys stay aligned", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  const keys = ["unsavedChangesConfirm", "duplicateCode", "invalidEmail", "fieldTooLong"]

  for (const key of keys) {
    assert.equal(typeof th.supplier[key], "string", `missing Thai supplier.${key}`)
    assert.equal(typeof en.supplier[key], "string", `missing English supplier.${key}`)
  }
})
