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
