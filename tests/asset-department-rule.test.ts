import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  departmentFollowsHolder, getCheckinNextDepartmentId, getCheckoutNextDepartmentId, getLateReturnDepartmentId, getOutstandingComponentCustody,
  getRegisterDepartment, getTransferDepartmentSource, getTransferNextDepartmentId,
} from "../src/lib/asset-department-rule.ts"
import { assetOwnershipTypes, type AssetOwnershipType } from "../src/lib/asset-ownership.ts"

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

test("a component that did not come back: ผู้คืน becomes its holder with ผู้คืน's department, a ส่วนกลาง one keeps its department, and ผู้คืน who already holds it changes nothing (group 3 spec §8.5, call 13, P2-R7)", () => {
  const returner = { id: "emp-returner", departmentId: "dept-returner" }
  const custody = (ownership: AssetOwnershipType, custodianId: string | null) =>
    getOutstandingComponentCustody({ ownership, custodianId, departmentId: "dept-now", returner })
  for (const ownership of ["personal", "stock", "component", "software_license"] as const) {
    assert.deepEqual(custody(ownership, "emp-holder"), { custodianId: "emp-returner", departmentId: "dept-returner" }, ownership)
    assert.deepEqual(custody(ownership, null), { custodianId: "emp-returner", departmentId: "dept-returner" }, `${ownership}, handed to a department or a room`)
  }
  assert.deepEqual(custody("shared", "emp-holder"), { custodianId: "emp-returner", departmentId: "dept-now" })
  assert.deepEqual(custody("shared", null), { custodianId: "emp-returner", departmentId: "dept-now" })
  for (const ownership of assetOwnershipTypes) {
    assert.deepEqual(custody(ownership, "emp-returner"), { custodianId: "emp-returner", departmentId: "dept-now" }, `${ownership}, ผู้คืน already holds it`)
  }
})

test("a late return re-attached follows its parent's department; one standing alone takes the return department, a ส่วนกลาง one keeps its own (P2-R7, spec §6)", () => {
  const late = (outcome: "reattached" | "standalone", ownership: AssetOwnershipType, overrides: { parentDepartmentId?: string | null; currentDepartmentId?: string | null } = {}) =>
    getLateReturnDepartmentId({ outcome, ownership, parentDepartmentId: "dept-parent", returnDepartmentId: "dept-it", currentDepartmentId: "dept-returner", ...overrides })
  for (const ownership of ["personal", "stock", "shared", "component", "software_license"] as const) {
    assert.equal(late("reattached", ownership), "dept-parent", ownership)
    assert.equal(late("reattached", ownership, { parentDepartmentId: null }), null, `${ownership}, a parent without a department`)
  }
  for (const ownership of ["personal", "stock", "component", "software_license"] as const) assert.equal(late("standalone", ownership), "dept-it", ownership)
  assert.deepEqual([late("standalone", "shared"), late("standalone", "shared", { currentDepartmentId: null })], ["dept-returner", null])
})

// โอนย้าย (group 3 spec §6, §9.2, call 4; group 3 plan 3, P3-R2, P3-R3). The holder ids are already normalized: a holder
// equal to the current one reaches these rules as no new holder (tests/transfer-rules.test.ts).
type TransferInput = Parameters<typeof getTransferNextDepartmentId>[0]
const transferDepartment = (ownership: AssetOwnershipType, holders: { current: string | null; next: string | null }, overrides: Partial<TransferInput> = {}) =>
  getTransferNextDepartmentId({
    ownership, currentCustodianId: holders.current, newCustodianId: holders.next, currentDepartmentId: "dept-now",
    currentHolderDepartmentId: "dept-holder", newHolderDepartmentId: "dept-new", chosenDepartmentId: "dept-chosen", ...overrides,
  })
// Held + a new holder, no holder + a new holder, held + no new holder, no holder + no new holder.
const holderCases = [
  { current: "emp-old", next: "emp-new" }, { current: null, next: "emp-new" }, { current: "emp-old", next: null }, { current: null, next: null },
] as const

test("โอนย้าย: where the department comes from, per ownership and holder; a ส่วนควบ moved on its own stays free like ส่วนกลาง (group 3 spec §6, §9.2; P3-R2, P3-R3)", () => {
  const source = (ownership: AssetOwnershipType) =>
    holderCases.map(({ current, next }) => getTransferDepartmentSource({ ownership, currentCustodianId: current, newCustodianId: next }))
  for (const ownership of ["personal", "stock"] as const) assert.deepEqual(source(ownership), ["newHolder", "newHolder", "currentHolder", "free"], ownership)
  for (const ownership of ["shared", "component", "software_license"] as const) assert.deepEqual(source(ownership), ["free", "free", "free", "free"], ownership)
})

test("โอนย้าย: บุคคล and Stock follow the new holder, else the current holder, else the chosen department; ส่วนกลาง and ส่วนควบ take the chosen one or keep theirs (spec §6, decision 10, P3-R2, P3-R3)", () => {
  for (const ownership of ["personal", "stock"] as const) {
    assert.deepEqual(holderCases.map((holders) => transferDepartment(ownership, holders)), ["dept-new", "dept-new", "dept-holder", "dept-chosen"], ownership)
  }
  for (const ownership of ["shared", "component", "software_license"] as const) {
    assert.deepEqual(holderCases.map((holders) => transferDepartment(ownership, holders)), ["dept-chosen", "dept-chosen", "dept-chosen", "dept-chosen"], ownership)
    assert.deepEqual(holderCases.map((holders) => transferDepartment(ownership, holders, { chosenDepartmentId: null })), ["dept-now", "dept-now", "dept-now", "dept-now"], `${ownership}, none chosen`)
  }
})

test("โอนย้าย: a held asset moved only to another room takes its holder's department, which corrects a stored mismatch; a locked row ignores a chosen department (spec §6 call 4, P3-R3, Review Focus 1)", () => {
  const roomOnly = { current: "emp-old", next: null }
  assert.equal(transferDepartment("personal", roomOnly, { currentDepartmentId: "dept-stale" }), "dept-holder")
  assert.equal(transferDepartment("stock", roomOnly, { currentDepartmentId: "dept-holder" }), "dept-holder", "already the holder's: no change")
  assert.equal(transferDepartment("personal", { current: "emp-old", next: "emp-new" }, { chosenDepartmentId: "dept-other" }), "dept-new")
  assert.equal(transferDepartment("personal", roomOnly, { chosenDepartmentId: "dept-other" }), "dept-holder")
})

test("โอนย้าย: an unread holder department falls back to the current one, and an asset with no department stays with none (P3-R3)", () => {
  assert.equal(transferDepartment("personal", { current: null, next: "emp-new" }, { newHolderDepartmentId: null }), "dept-now", "the new holder's department unread")
  assert.equal(transferDepartment("stock", { current: "emp-old", next: null }, { currentHolderDepartmentId: null }), "dept-now", "the current holder's row missing")
  assert.equal(transferDepartment("personal", { current: null, next: null }, { chosenDepartmentId: null }), "dept-now", "nothing chosen")
  const none = { currentDepartmentId: null, currentHolderDepartmentId: null, newHolderDepartmentId: null, chosenDepartmentId: null }
  for (const ownership of ["personal", "stock", "shared", "component"] as const) {
    assert.deepEqual(holderCases.map((holders) => transferDepartment(ownership, holders, none)), [null, null, null, null], ownership)
  }
})

// The edit page, the create form and the form's department lock (group 4 plan 2, P2-R1, P2-R2). Unlike โอนย้าย, a null
// next holder means the holder was cleared, which frees the department.
type RegisterInput = Parameters<typeof getRegisterDepartment>[0]
const register = (ownership: AssetOwnershipType, overrides: Partial<RegisterInput> = {}) =>
  getRegisterDepartment({
    ownership, currentCustodianId: "e1", nextCustodianId: "e1", currentDepartmentId: "d2", chosenDepartmentId: "d2",
    nextHolderDepartmentId: "d1", openHandover: false, ...overrides,
  })

test("register: บุคคล and Stock with the holder unchanged take the holder's department as the automatic fix, skipped while a handover is open (P2-R1)", () => {
  for (const ownership of ["personal", "stock"] as const) {
    assert.deepEqual(register(ownership), { departmentId: "d1", source: "holder", automatic: true }, ownership)
    assert.deepEqual(register(ownership, { openHandover: true }), { departmentId: "d2", source: "kept", automatic: false }, `${ownership}, handover open`)
    assert.deepEqual(register(ownership, { currentDepartmentId: "d1" }), { departmentId: "d1", source: "holder", automatic: false }, `${ownership}, already the holder's`)
    assert.deepEqual(register(ownership, { nextHolderDepartmentId: null }), { departmentId: "d2", source: "holder", automatic: false }, `${ownership}, the holder's department unread`)
    assert.deepEqual(register(ownership, { chosenDepartmentId: "d7" }), { departmentId: "d1", source: "holder", automatic: true }, `${ownership}, a chosen department is ignored`)
  }
})

test("register: a written-off asset (custody frozen) skips the automatic fix and keeps the department the save sends, so the custody lock refuses only a real change (final review)", () => {
  for (const ownership of ["personal", "stock"] as const) {
    assert.deepEqual(register(ownership, { custodyFrozen: true }), { departmentId: "d2", source: "kept", automatic: false }, ownership)
    assert.deepEqual(register(ownership, { custodyFrozen: true, chosenDepartmentId: "d7" }), { departmentId: "d7", source: "kept", automatic: false }, `${ownership}, a chosen department reaches the lock`)
    assert.deepEqual(register(ownership, { custodyFrozen: false }), { departmentId: "d1", source: "holder", automatic: true }, `${ownership}, not frozen`)
  }
  assert.deepEqual(register("shared", { custodyFrozen: true, chosenDepartmentId: "d5" }), { departmentId: "d5", source: "free", automatic: false }, "ส่วนกลาง stays free")
})

test("register: บุคคล and Stock with a new holder take the new holder's department (no automatic fix)", () => {
  for (const ownership of ["personal", "stock"] as const) {
    assert.deepEqual(register(ownership, { nextCustodianId: "e2", nextHolderDepartmentId: "d3" }), { departmentId: "d3", source: "holder", automatic: false }, ownership)
    assert.deepEqual(register(ownership, { currentCustodianId: null, nextCustodianId: "e2", nextHolderDepartmentId: "d3" }), { departmentId: "d3", source: "holder", automatic: false }, `${ownership}, no holder before`)
  }
})

test("register: a cleared holder frees the department, unlike โอนย้าย (P2-R1)", () => {
  for (const ownership of ["personal", "stock"] as const) {
    assert.deepEqual(register(ownership, { nextCustodianId: null, nextHolderDepartmentId: null, chosenDepartmentId: "d4" }), { departmentId: "d4", source: "free", automatic: false }, ownership)
    assert.deepEqual(register(ownership, { nextCustodianId: null, nextHolderDepartmentId: null, chosenDepartmentId: null }), { departmentId: null, source: "free", automatic: false }, `${ownership}, none chosen`)
  }
})

test("register: ส่วนกลาง, ส่วนควบ and License keep a free department even with a holder (P2-R2)", () => {
  for (const ownership of ["shared", "component", "software_license"] as const) {
    assert.deepEqual(register(ownership, { chosenDepartmentId: "d5" }), { departmentId: "d5", source: "free", automatic: false }, ownership)
    assert.deepEqual(register(ownership, { nextCustodianId: "e2", nextHolderDepartmentId: "d3", chosenDepartmentId: "d5" }), { departmentId: "d5", source: "free", automatic: false }, `${ownership}, new holder`)
    assert.deepEqual(register(ownership, { chosenDepartmentId: null }), { departmentId: null, source: "free", automatic: false }, `${ownership}, none chosen`)
  }
})

test("register: create (no current holder or department) takes the holder's department over the chosen one for บุคคล and Stock", () => {
  const create = { currentCustodianId: null, currentDepartmentId: null, nextCustodianId: "e1", nextHolderDepartmentId: "d1", chosenDepartmentId: "d9" }
  assert.deepEqual(register("personal", create), { departmentId: "d1", source: "holder", automatic: false })
  assert.deepEqual(register("stock", create), { departmentId: "d1", source: "holder", automatic: false })
  assert.deepEqual(register("shared", create), { departmentId: "d9", source: "free", automatic: false })
  assert.deepEqual(register("personal", { ...create, nextHolderDepartmentId: null }), { departmentId: "d9", source: "holder", automatic: false }, "the holder's department unread")
})

test("departmentFollowsHolder: true only for บุคคล and Stock", () => {
  assert.deepEqual(assetOwnershipTypes.map((ownership) => [ownership, departmentFollowsHolder(ownership)]), [
    ["personal", true], ["shared", false], ["stock", true], ["component", false], ["software_license", false],
  ])
})
