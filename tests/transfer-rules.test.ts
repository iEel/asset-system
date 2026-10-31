import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getTransferDepartmentSource, getTransferNextDepartmentId } from "../src/lib/asset-department-rule.ts"
import { getTransferTargetStatusName } from "../src/lib/asset-lifecycle-policy.ts"
import {
  hasTransferChange, normalizeTransferDestinations, sameTransferDestinations, type TransferCurrentValues, type TransferDestinations,
} from "../src/lib/transfer-rules.ts"

// The asset now: room loc-now, held by emp-now, department dept-now.
const current: TransferCurrentValues = { currentLocationId: "loc-now", custodianId: "emp-now", departmentId: "dept-now" }
const none: TransferDestinations = { toLocationId: null, toCustodianId: null, toDepartmentId: null }
const sent = (overrides: Partial<TransferDestinations>): TransferDestinations => ({ ...none, ...overrides })

test("a destination equal to the current value is dropped, field by field; a different one is kept (group 3 spec §9.2, call 17; P3-R4)", () => {
  assert.deepEqual(normalizeTransferDestinations(sent({ toLocationId: "loc-now" }), current), none)
  assert.deepEqual(normalizeTransferDestinations(sent({ toCustodianId: "emp-now" }), current), none)
  assert.deepEqual(normalizeTransferDestinations(sent({ toDepartmentId: "dept-now" }), current), none)
  assert.deepEqual(normalizeTransferDestinations(sent({ toLocationId: "loc-2" }), current), sent({ toLocationId: "loc-2" }))
  assert.deepEqual(normalizeTransferDestinations(sent({ toCustodianId: "emp-2" }), current), sent({ toCustodianId: "emp-2" }))
  assert.deepEqual(normalizeTransferDestinations(sent({ toDepartmentId: "dept-2" }), current), sent({ toDepartmentId: "dept-2" }))
  assert.deepEqual(
    normalizeTransferDestinations({ toLocationId: "loc-2", toCustodianId: "emp-now", toDepartmentId: "dept-now" }, current),
    sent({ toLocationId: "loc-2" }),
    "only the room changes",
  )
  assert.deepEqual(
    normalizeTransferDestinations({ toLocationId: "loc-2", toCustodianId: "emp-2", toDepartmentId: "dept-2" }, current),
    { toLocationId: "loc-2", toCustodianId: "emp-2", toDepartmentId: "dept-2" },
  )
})

test("an empty string or a missing field is no destination; an asset with no holder or department compares against null (P3-R4)", () => {
  assert.deepEqual(normalizeTransferDestinations({ toLocationId: "", toCustodianId: "", toDepartmentId: "" }, current), none, "the form's ไม่เปลี่ยนแปลง")
  assert.deepEqual(normalizeTransferDestinations({ toDepartmentId: "" }, current), none, "an API caller's toDepartmentId: \"\"")
  assert.deepEqual(normalizeTransferDestinations({}, current), none)
  const unheld: TransferCurrentValues = { currentLocationId: "loc-now", custodianId: null, departmentId: null }
  assert.deepEqual(normalizeTransferDestinations(sent({ toCustodianId: "emp-2", toDepartmentId: "dept-2" }), unheld), sent({ toCustodianId: "emp-2", toDepartmentId: "dept-2" }))
  assert.deepEqual(normalizeTransferDestinations({ toLocationId: "", toCustodianId: "", toDepartmentId: "" }, unheld), none)
})

test("a transfer needs at least one destination left after normalizing (P3-R4)", () => {
  assert.equal(hasTransferChange(none), false)
  for (const field of ["toLocationId", "toCustodianId", "toDepartmentId"] as const) assert.equal(hasTransferChange(sent({ [field]: "x-2" })), true, field)
  assert.equal(hasTransferChange(normalizeTransferDestinations({ toLocationId: "loc-now", toCustodianId: "emp-now", toDepartmentId: "dept-now" }, current)), false, "all equal: nothing left")
})

test("two normalized sets are the same only when every field is (the route's in-transaction re-check, P3-R4)", () => {
  const set = { toLocationId: "loc-2", toCustodianId: "emp-2", toDepartmentId: null }
  assert.equal(sameTransferDestinations(set, { ...set }), true)
  assert.equal(sameTransferDestinations(none, sent({})), true)
  assert.equal(sameTransferDestinations(set, { ...set, toLocationId: "loc-3" }), false)
  assert.equal(sameTransferDestinations(set, { ...set, toCustodianId: null }), false, "the chosen holder became the current one")
  assert.equal(sameTransferDestinations(set, { ...set, toDepartmentId: "dept-2" }), false)
})

test("re-picking the current holder is not a new holder: the status stays and the department follows the current holder (Review Focus 2, P3-R3, P3-R4)", () => {
  const destinations = normalizeTransferDestinations(sent({ toLocationId: "loc-2", toCustodianId: "emp-now" }), current)
  assert.deepEqual(destinations, sent({ toLocationId: "loc-2" }))
  assert.equal(getTransferTargetStatusName(destinations.toCustodianId), null, "no switch to ใช้งานอยู่")
  const holders = { ownership: "personal" as const, currentCustodianId: current.custodianId, newCustodianId: destinations.toCustodianId }
  assert.equal(getTransferDepartmentSource(holders), "currentHolder")
  assert.equal(getTransferNextDepartmentId({
    ...holders, currentDepartmentId: "dept-now", currentHolderDepartmentId: "dept-holder", newHolderDepartmentId: null, chosenDepartmentId: destinations.toDepartmentId,
  }), "dept-holder")
})

test("the rules stay pure and client-safe: import type only, relative .ts paths, no database", () => {
  const source = readFileSync("src/lib/transfer-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\.|server-only/)
  for (const line of source.split(/\r?\n/).filter((line) => line.startsWith("import "))) assert.match(line, /^import type \{[^}]+\} from "\.\/[\w-]+\.ts"$/, line)
})
