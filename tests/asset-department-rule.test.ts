import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getCheckinNextDepartmentId, getCheckoutNextDepartmentId } from "../src/lib/asset-department-rule.ts"
import type { AssetOwnershipType } from "../src/lib/asset-ownership.ts"

type Input = Parameters<typeof getCheckoutNextDepartmentId>[0]
const types: Input["checkoutType"][] = ["user", "department", "location"]
const next = (ownership: AssetOwnershipType, checkoutType: Input["checkoutType"], overrides: Partial<Input> = {}) =>
  getCheckoutNextDepartmentId({ ownership, checkoutType, currentDepartmentId: "dept-now", employeeDepartmentId: "dept-employee", chosenDepartmentId: "dept-chosen", ...overrides })

test("บุคคล and Stock: the employee's department, the chosen department, or unchanged for a room (group 3 spec §6, decision 1)", () => {
  for (const ownership of ["personal", "stock"] as const) {
    assert.deepEqual(types.map((type) => next(ownership, type)), ["dept-employee", "dept-chosen", "dept-now"], ownership)
    assert.deepEqual(types.map((type) => next(ownership, type, { currentDepartmentId: null })), ["dept-employee", "dept-chosen", null], `${ownership}, no department yet`)
  }
})

test("ส่วนกลาง keeps its responsible department on every checkout, a department one included (spec §6, decision 10, P1-R2)", () => {
  assert.deepEqual(types.map((type) => next("shared", type)), ["dept-now", "dept-now", "dept-now"])
  assert.deepEqual(types.map((type) => next("shared", type, { currentDepartmentId: null })), [null, null, null])
})

test("ส่วนควบ and License never reach it (the route refuses them first); they keep the current department", () => {
  for (const ownership of ["component", "software_license"] as const) assert.deepEqual(types.map((type) => next(ownership, type)), ["dept-now", "dept-now", "dept-now"], ownership)
})

test("no receiver or department chosen yet keeps the current one (the page's summary before a pick)", () => {
  assert.equal(next("personal", "user", { employeeDepartmentId: null }), "dept-now")
  assert.equal(next("stock", "department", { chosenDepartmentId: null }), "dept-now")
})

test("the rule stays pure: import type only, relative .ts paths, no database", () => {
  const source = readFileSync("src/lib/asset-department-rule.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\./)
  for (const line of source.split(/\r?\n/).filter((line) => line.startsWith("import "))) assert.match(line, /^import type \{[^}]+\} from "\.\/[\w-]+\.ts"$/, line)
})

const ownerships: AssetOwnershipType[] = ["personal", "stock", "shared", "component", "software_license"]
const back = (ownership: AssetOwnershipType, currentDepartmentId: string | null = "dept-now") =>
  getCheckinNextDepartmentId({ ownership, returnDepartmentId: "dept-it", currentDepartmentId })

test("รับคืน: บุคคล and Stock go to the return department; ส่วนกลาง, ส่วนควบ and License keep theirs (group 3 spec §6, §12, decisions 2 and 10, P2-R7)", () => {
  assert.deepEqual(ownerships.map((ownership) => back(ownership)), ["dept-it", "dept-it", "dept-now", "dept-now", "dept-now"])
  assert.deepEqual(ownerships.map((ownership) => back(ownership, null)), ["dept-it", "dept-it", null, null, null], "no department yet")
  assert.deepEqual(ownerships.map((ownership) => back(ownership, "dept-it")), ["dept-it", "dept-it", "dept-it", "dept-it", "dept-it"], "already there")
})
