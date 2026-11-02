// The department a transaction save writes (group 3 spec §6, decisions 1, 2, 10).
// Pure and client-safe: the checkout route and the checkout summary call getCheckoutNextDepartmentId; the checkin
// route and the รับคืน summary call getCheckinNextDepartmentId; the late component return route and the late-return
// summary call getLateReturnDepartmentId; the transfer route and the โอนย้าย form's rules call
// getTransferDepartmentSource and getTransferNextDepartmentId (group 3 plan 3, P3-R3).
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

// โอนย้าย (spec §6, §9.2, call 4; group 3 plan 3, P3-R2, P3-R3). The ids are normalized first
// (normalizeTransferDestinations): a holder equal to the current one is not a new holder. ส่วนกลาง, ส่วนควบ and License
// keep a free department; บุคคล and Stock follow the new holder, else the current holder (the caller reads it without
// isActive), else the chosen department. "newHolder" and "currentHolder" lock the แผนก row.
export type TransferDepartmentSource = "newHolder" | "currentHolder" | "free"

export function getTransferDepartmentSource(input: {
  ownership: AssetOwnershipType
  currentCustodianId: string | null
  newCustodianId: string | null
}): TransferDepartmentSource {
  if (keepsOwnDepartment(input.ownership)) return "free"
  if (input.newCustodianId) return "newHolder"
  if (input.currentCustodianId) return "currentHolder"
  return "free"
}

export function getTransferNextDepartmentId(input: {
  ownership: AssetOwnershipType
  currentCustodianId: string | null
  newCustodianId: string | null
  currentDepartmentId: string | null
  currentHolderDepartmentId: string | null
  newHolderDepartmentId: string | null
  chosenDepartmentId: string | null
}): string | null {
  switch (getTransferDepartmentSource(input)) {
    case "newHolder":
      return input.newHolderDepartmentId ?? input.currentDepartmentId
    case "currentHolder":
      return input.currentHolderDepartmentId ?? input.currentDepartmentId
    case "free":
      return input.chosenDepartmentId ?? input.currentDepartmentId
  }
}

function keepsOwnDepartment(ownership: AssetOwnershipType): boolean {
  return ownership === "shared" || ownership === "component" || ownership === "software_license"
}

// บุคคล and Stock take their holder's department (spec §6, decision 1); the others keep a free one.
export function departmentFollowsHolder(ownership: AssetOwnershipType): boolean {
  return !keepsOwnDepartment(ownership)
}

// The register's department: the asset edit page (PUT), the create form (POST) and the form's department lock (group 4
// plan 2, P2-R1, P2-R2). Unlike โอนย้าย, a null next holder means the holder was cleared, so the department is free.
// "holder" locks the แผนก row. With the holder unchanged, taking the holder's department is the automatic fix
// (automatic: true only when it changes the department; no reason needed), skipped while a handover is open ("kept").
// An unread holder department falls back to the current one, then (on create) to the chosen one.
export type RegisterDepartmentSource = "holder" | "kept" | "free"

export function getRegisterDepartment(input: {
  ownership: AssetOwnershipType
  currentCustodianId: string | null
  nextCustodianId: string | null
  currentDepartmentId: string | null
  chosenDepartmentId: string | null
  nextHolderDepartmentId: string | null
  openHandover: boolean
}): { departmentId: string | null; source: RegisterDepartmentSource; automatic: boolean } {
  if (!departmentFollowsHolder(input.ownership) || !input.nextCustodianId) {
    return { departmentId: input.chosenDepartmentId, source: "free", automatic: false }
  }
  const holderUnchanged = input.currentCustodianId === input.nextCustodianId
  if (holderUnchanged && input.openHandover) {
    return { departmentId: input.currentDepartmentId, source: "kept", automatic: false }
  }
  const departmentId = input.nextHolderDepartmentId ?? input.currentDepartmentId ?? input.chosenDepartmentId
  return { departmentId, source: "holder", automatic: holderUnchanged && departmentId !== input.currentDepartmentId }
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
