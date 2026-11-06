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
// The return's write runs in src/lib/checkin-write.ts (group 7 plan 4 task 1); its route keeps the audit.
const checkinWritePath = "src/lib/checkin-write.ts"
const readRouteWithWrite = (path: string) =>
  readFileSync(path, "utf8") + (path === "src/app/api/assets/[id]/checkin/route.ts" ? "\n" + readFileSync(checkinWritePath, "utf8") : "")
const bulkOperationRoutePaths = [
  "src/app/api/assets/bulk-move/route.ts",
  "src/app/api/assets/bulk-update/route.ts",
]

test("parent asset operation routes import installed component sync helper", () => {
  for (const path of routePaths) {
    const source = readRouteWithWrite(path)
    assert.match(source, /syncInstalledComponentsWithParent/, `${path} should sync installed components`)
  }
})

test("parent asset routes use workflow-specific component movement types", () => {
  assert.match(readFileSync("src/app/api/assets/[id]/route.ts", "utf8"), /parent_register_update_sync/)
  assert.match(readFileSync("src/app/api/assets/[id]/transfer/route.ts", "utf8"), /parent_transfer_sync/)
  assert.match(readFileSync("src/app/api/assets/[id]/checkout/route.ts", "utf8"), /parent_checkout_sync/)
  assert.match(readFileSync(checkinWritePath, "utf8"), /parent_checkin_sync/)
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

test("register update component sync takes the computed department and holder, never the client's department (group 4 plan 2, P2-R3)", () => {
  const source = readFileSync("src/app/api/assets/[id]/route.ts", "utf8")
  const syncCall = source.match(/syncInstalledComponentsWithParent\(tx, \{[\s\S]*?movementType:\s*"parent_register_update_sync"[\s\S]*?\}\)/)?.[0]

  assert.ok(syncCall, "the edit should sync installed components")
  assert.match(syncCall, /departmentId:\s*nextDepartmentId/)
  assert.match(syncCall, /custodianId:\s*nextCustodianId/)
  assert.doesNotMatch(syncCall, /input\.departmentId/)
  assert.match(syncCall, /referenceType:\s*"register_edit"/)
  assert.match(syncCall, /reason:\s*correctionReason \?\? "Parent asset register update"/)
})

test("register update writes the register corrections, never location_change, custodian_change or department_change (group 4 plan 2, P2-R5)", () => {
  const route = readFileSync("src/app/api/assets/[id]/route.ts", "utf8")
  const planner = readFileSync("src/lib/asset-register-edit.ts", "utf8")

  for (const type of ["location_change", "custodian_change", "department_change", "ownership_type_change"]) {
    assert.doesNotMatch(route, new RegExp(`"${type}"`), `PUT should not write ${type}`)
    assert.doesNotMatch(planner, new RegExp(`"${type}"`), `the planner should not write ${type}`)
  }
  for (const type of ["register_location_correction", "register_custodian_correction", "register_department_correction", "register_field_correction", "asset_tag_change"]) {
    assert.match(planner, new RegExp(`movementType: "${type}"`), type)
  }
  assert.match(route, /planRegisterEditMovements\(/)
})

test("checkin component sync excludes status and condition fields", () => {
  const source = readFileSync(checkinWritePath, "utf8")
  const syncCall = source.match(/syncInstalledComponentsWithParent\(tx, \{[\s\S]*?movementType:\s*"parent_checkin_sync"[\s\S]*?\}\)/)?.[0]

  assert.ok(syncCall, "the checkin write should call component sync")
  assert.doesNotMatch(syncCall, /statusId|nextStatusId/)
  assert.doesNotMatch(syncCall, /conditionId|conditionAfter/)
})
