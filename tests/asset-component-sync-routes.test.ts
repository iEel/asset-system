import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const routePaths = [
  "src/app/api/assets/[id]/route.ts",
  "src/app/api/assets/[id]/transfer/route.ts",
  "src/app/api/assets/[id]/checkout/route.ts",
  "src/app/api/assets/[id]/checkin/route.ts",
  "src/app/api/assets/bulk-move/route.ts",
  "src/app/api/assets/bulk-update/route.ts",
]

const singleOperationRoutePaths = routePaths.slice(0, 4)
const bulkOperationRoutePaths = [
  "src/app/api/assets/bulk-move/route.ts",
  "src/app/api/assets/bulk-update/route.ts",
]

test("parent asset operation routes import installed component sync helper", () => {
  for (const path of routePaths) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /syncInstalledComponentsWithParent/, `${path} should sync installed components`)
  }
})

test("parent asset routes use workflow-specific component movement types", () => {
  assert.match(readFileSync("src/app/api/assets/[id]/route.ts", "utf8"), /parent_register_update_sync/)
  assert.match(readFileSync("src/app/api/assets/[id]/transfer/route.ts", "utf8"), /parent_transfer_sync/)
  assert.match(readFileSync("src/app/api/assets/[id]/checkout/route.ts", "utf8"), /parent_checkout_sync/)
  assert.match(readFileSync("src/app/api/assets/[id]/checkin/route.ts", "utf8"), /parent_checkin_sync/)
  assert.match(readFileSync("src/app/api/assets/bulk-move/route.ts", "utf8"), /parent_bulk_move_sync/)
  assert.match(readFileSync("src/app/api/assets/bulk-update/route.ts", "utf8"), /parent_bulk_update_sync/)
})

test("single parent asset sync routes include component sync result in audit logs", () => {
  for (const path of singleOperationRoutePaths) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /newValue:\s*\{[^\n]*componentSync[^\n]*\}/, `${path} should log component sync result`)
  }
})

test("bulk parent asset sync routes aggregate and return component sync counts", () => {
  for (const path of bulkOperationRoutePaths) {
    const source = readFileSync(path, "utf8")
    for (const field of ["updated", "skipped", "movements"]) {
      assert.match(
        source,
        new RegExp(`componentSync\\.${field}\\s*\\+=\\s*result\\.${field}`),
        `${path} should aggregate component sync ${field} count`
      )
    }
    assert.match(source, /return\s+\{[^\n]*componentSync[^\n]*\}/, `${path} should return component sync counts`)
  }
})

test("bulk update component sync only includes changed optional fields", () => {
  const source = readFileSync("src/app/api/assets/bulk-update/route.ts", "utf8")

  assert.doesNotMatch(
    source,
    /changes:\s*\{[\s\S]*?custodianId:\s*input\.toCustodianId[\s\S]*?\}/,
    "bulk update should not pass custodianId to component sync unconditionally"
  )
  assert.match(source, /\.\.\.\(input\.toLocationId\s*\?\s*\{\s*currentLocationId:\s*input\.toLocationId\s*\}\s*:\s*\{\}\)/)
  assert.match(source, /\.\.\.\(input\.toCustodianId\s*\?\s*\{\s*custodianId:\s*input\.toCustodianId\s*\}\s*:\s*\{\}\)/)
  assert.match(source, /changes:\s*componentSyncChanges/)
})

test("register update component sync preserves omitted nullable fields", () => {
  const source = readFileSync("src/app/api/assets/[id]/route.ts", "utf8")

  assert.doesNotMatch(
    source,
    /departmentId:\s*input\.departmentId\s*\?\?\s*null/,
    "register update should not coerce omitted departmentId to null for component sync"
  )
  assert.doesNotMatch(
    source,
    /custodianId:\s*input\.custodianId\s*\?\?\s*null/,
    "register update should not coerce omitted custodianId to null for component sync"
  )
  assert.match(source, /changes:\s*buildRegisterComponentSyncChanges\(input\)/)
  assert.match(source, /hasOwnNullableField\(input,\s*"departmentId"\)/)
  assert.match(source, /hasOwnNullableField\(input,\s*"custodianId"\)/)
})

test("register update movement rows ignore omitted nullable fields", () => {
  const source = readFileSync("src/app/api/assets/[id]/route.ts", "utf8")

  assert.doesNotMatch(source, /\["department_change",\s*existing\.departmentId,\s*input\.departmentId\s*\?\?\s*null\]/)
  assert.doesNotMatch(source, /\["custodian_change",\s*existing\.custodianId,\s*input\.custodianId\s*\?\?\s*null\]/)
  assert.match(source, /buildNullableMovementCandidate\("department_change",\s*existing\.departmentId,\s*input,\s*"departmentId"\)/)
  assert.match(source, /buildNullableMovementCandidate\("custodian_change",\s*existing\.custodianId,\s*input,\s*"custodianId"\)/)
})

test("checkin component sync excludes status and condition fields", () => {
  const source = readFileSync("src/app/api/assets/[id]/checkin/route.ts", "utf8")
  const syncCall = source.match(/syncInstalledComponentsWithParent\(tx, \{[\s\S]*?movementType:\s*"parent_checkin_sync"[\s\S]*?\}\)/)?.[0]

  assert.ok(syncCall, "checkin route should call component sync")
  assert.doesNotMatch(syncCall, /statusId|nextStatusId/)
  assert.doesNotMatch(syncCall, /conditionId|conditionAfter/)
})
