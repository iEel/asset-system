// The department a transaction save writes (group 3 spec §6, decisions 1, 2, 10).
// Pure and client-safe: the checkout route and the checkout summary call getCheckoutNextDepartmentId; the checkin
// route (and, from Task 8, the รับคืน summary) call getCheckinNextDepartmentId; the late component return route and
// Task 9's late-return summary call getLateReturnDepartmentId.
// Plan 3 adds the transfer rule here.
import type { AssetOwnershipType } from "./asset-ownership.ts"
import type { ComponentLateReturnOutcome } from "./component-late-return.ts"

export function getCheckoutNextDepartmentId(input: {
  ownership: AssetOwnershipType
  checkoutType: "user" | "department" | "location"
  currentDepartmentId: string | null
  employeeDepartmentId: string | null
  chosenDepartmentId: string | null
}): string | null {
  // ส่วนกลาง keeps its responsible department (decision 10, P1-R2); ส่วนควบ and License never reach a checkout.
  if (keepsOwnDepartment(input.ownership)) return input.currentDepartmentId
  // บุคคล and Stock follow the receiver (decision 1); a room changes nothing.
  if (input.checkoutType === "user") return input.employeeDepartmentId ?? input.currentDepartmentId
  if (input.checkoutType === "department") return input.chosenDepartmentId ?? input.currentDepartmentId
  return input.currentDepartmentId
}

// รับคืน (spec §6, §12, decisions 2 and 10, P2-R7): บุคคล and Stock go to the return department; ส่วนกลาง keeps its
// responsible department, and ส่วนควบ and License keep theirs.
export function getCheckinNextDepartmentId(input: {
  ownership: AssetOwnershipType
  returnDepartmentId: string
  currentDepartmentId: string | null
}): string | null {
  if (keepsOwnDepartment(input.ownership)) return input.currentDepartmentId
  return input.returnDepartmentId
}

// The late return of an outstanding component (spec §6, §8.6, P2-R7). Re-attached, a component follows its parent
// (spec §6 "A component follows its parent"). Standing alone, it sits in IT stock and takes the return department,
// except a ส่วนกลาง one: ส่วนกลาง keeps its responsible department "on checkout, return and transfer" (spec §6), and a
// late return is a return. ส่วนควบ and License standing alone take the return department, so this rule does not use
// keepsOwnDepartment.
export function getLateReturnDepartmentId(input: {
  outcome: ComponentLateReturnOutcome
  ownership: AssetOwnershipType
  parentDepartmentId: string | null
  returnDepartmentId: string
  currentDepartmentId: string | null
}): string | null {
  if (input.outcome === "reattached") return input.parentDepartmentId
  if (input.ownership === "shared") return input.currentDepartmentId
  return input.returnDepartmentId
}

function keepsOwnDepartment(ownership: AssetOwnershipType): boolean {
  return ownership === "shared" || ownership === "component" || ownership === "software_license"
}

// A component that did not come back stays with ผู้คืน (spec §8.5, decision 11, call 13): ผู้คืน's department, except a
// ส่วนกลาง one, which keeps its department (decision 10). ผู้คืน who already holds it changes nothing (D23). The room
// never changes.
export function getOutstandingComponentCustody(input: {
  ownership: AssetOwnershipType
  custodianId: string | null
  departmentId: string | null
  returner: { id: string; departmentId: string }
}): { custodianId: string; departmentId: string | null } {
  if (input.custodianId === input.returner.id) return { custodianId: input.custodianId, departmentId: input.departmentId }
  return {
    custodianId: input.returner.id,
    departmentId: input.ownership === "shared" ? input.departmentId : input.returner.departmentId,
  }
}
