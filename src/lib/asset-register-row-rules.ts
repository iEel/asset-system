// The register row's rules (group 4 plan 1 Task 2, spec §6.1): when the condition is shown as a badge, and what the
// holder cell says. Pure: relative imports only, so `node --test` loads it.
import type { AssetOwnershipType } from "./asset-ownership.ts"
import { normalizeAssetStateValue } from "./design-system.ts"

// The conditions that need someone to look (the phone list's rule, moved here so the desktop table shares it).
const attentionConditionValues = new Set(["fair", "poor", "damaged", "non functional", "salvage"])

export function needsConditionAttention(conditionValue: string): boolean {
  return attentionConditionValues.has(normalizeAssetStateValue(conditionValue))
}

export type RegisterHolderLine =
  | { kind: "holder"; name: string; department: string | null }
  | { kind: "shared" }
  | { kind: "none" }

// The holder with the department under it; with no holder, ส่วนกลาง says "ส่วนกลาง · ไม่มีผู้ถือครอง" and every other
// ownership "ไม่มีผู้ถือครอง".
export function getRegisterHolderLine(input: {
  ownership: AssetOwnershipType
  custodian: { name: string; departmentName: string | null } | null
}): RegisterHolderLine {
  if (input.custodian) return { kind: "holder", name: input.custodian.name, department: input.custodian.departmentName }
  return input.ownership === "shared" ? { kind: "shared" } : { kind: "none" }
}

// How many selected rows a bulk correction moves to another department (group 4 spec §6.6; final review B1). Only
// บุคคล and Stock follow the holder (getTransferNextDepartmentId): with a holder chosen, a row whose department is not
// the chosen holder's; with none chosen (a room-only save), a held row whose department is not its current holder's,
// which the server corrects too. ส่วนกลาง, ส่วนควบ and License keep their own department and are never counted.
export function countBulkDepartmentChanges(
  rows: readonly { ownershipType: { value: string }; departmentId: string | null; holderDepartmentId: string | null }[],
  chosen: { departmentId: string | null } | null,
): number {
  return rows.filter((row) => {
    if (row.ownershipType.value !== "personal" && row.ownershipType.value !== "stock") return false
    const target = chosen ? chosen.departmentId : row.holderDepartmentId
    return target !== null && target !== row.departmentId
  }).length
}
