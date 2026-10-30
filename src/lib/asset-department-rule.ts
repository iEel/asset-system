// The department a transaction save writes (group 3 spec §6, decisions 1, 2, 10).
// Pure and client-safe: the checkout route and the checkout page's summary both call it.
// Plans 2-3 add the checkin and transfer rules here.
import type { AssetOwnershipType } from "./asset-ownership.ts"

export function getCheckoutNextDepartmentId(input: {
  ownership: AssetOwnershipType
  checkoutType: "user" | "department" | "location"
  currentDepartmentId: string | null
  employeeDepartmentId: string | null
  chosenDepartmentId: string | null
}): string | null {
  // ส่วนกลาง keeps its responsible department (decision 10, P1-R2); ส่วนควบ and License never reach a checkout.
  if (input.ownership === "shared" || input.ownership === "component" || input.ownership === "software_license") {
    return input.currentDepartmentId
  }
  // บุคคล and Stock follow the receiver (decision 1); a room changes nothing.
  if (input.checkoutType === "user") return input.employeeDepartmentId ?? input.currentDepartmentId
  if (input.checkoutType === "department") return input.chosenDepartmentId ?? input.currentDepartmentId
  return input.currentDepartmentId
}
