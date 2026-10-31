// The return department (group 3 spec §6, §12, P2-R8): where a returned บุคคล or Stock asset goes.
// It is read at every return and late return and never cached. An absent row reads IT, as
// getOperationDocumentSettings defaults its keys (operation-document-number.ts), because Production has no row
// until someone saves one. The refusal is an AssetOperationConflictError, so every route answers it as
// 409 { code, error }. No database import: callers pass prisma or tx.
import type { Prisma } from "@prisma/client"
import { AssetOperationConflictError } from "./asset-operation-claim.ts"

export const CHECKIN_DEPARTMENT_SETTING_KEY = "checkin_department_code"
export const DEFAULT_CHECKIN_DEPARTMENT_CODE = "IT"

export function normalizeCheckinDepartmentCode(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase()
}

export class CheckinDepartmentUnavailableError extends AssetOperationConflictError {
  constructor() {
    super("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE", "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE")
    this.name = "CheckinDepartmentUnavailableError"
  }
}

export async function readCheckinDepartment(
  db: Pick<Prisma.TransactionClient, "systemSetting" | "department">,
): Promise<{ id: string; code: string; name: string }> {
  const row = await db.systemSetting.findUnique({ where: { key: CHECKIN_DEPARTMENT_SETTING_KEY }, select: { value: true } })
  const code = normalizeCheckinDepartmentCode(row?.value) || DEFAULT_CHECKIN_DEPARTMENT_CODE
  // A saved code that names no active department never falls back to IT: the return is refused.
  const department = await db.department.findFirst({
    where: { code, isActive: true },
    select: { id: true, code: true, name: true },
  })
  if (!department) throw new CheckinDepartmentUnavailableError()
  return department
}
