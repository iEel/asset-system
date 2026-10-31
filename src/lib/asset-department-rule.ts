// The department a transaction save writes (group 3 spec §6, decisions 1, 2, 10).
// Pure and client-safe: the checkout route and the checkout summary call getCheckoutNextDepartmentId; the checkin
// route (and, from Task 8, the รับคืน summary) call getCheckinNextDepartmentId.
// Plans 2-3 add the late component return and transfer rules here.
import type { AssetOwnershipType } from "./asset-ownership.ts"

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
