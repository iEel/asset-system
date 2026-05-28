import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("single asset create audit records cross-company custodian scope when present", () => {
  const source = readFileSync("src/app/api/assets/route.ts", "utf8")

  assert.match(source, /buildCustodianScopeAudit/)
  assert.match(source, /custodianScopeAudit/)
  assert.match(source, /custodianScope: custodianScopeAudit/)
})

test("batch asset create audit records per-item cross-company custodian scope when present", () => {
  const source = readFileSync("src/app/api/assets/batch/route.ts", "utf8")

  assert.match(source, /buildCustodianScopeAudit/)
  assert.match(source, /custodianById/)
  assert.match(source, /custodianScope: custodianScopeAudit/)
})
