export type DisposalLifecycleStatus = {
  name?: string | null
  nameTh?: string | null
  isActive?: boolean
}

export type DisposalRestoreStatusError =
  | "DISPOSAL_PREVIOUS_STATUS_MISSING"
  | "DISPOSAL_PREVIOUS_STATUS_INACTIVE"
  | "DISPOSAL_ASSET_STATUS_CHANGED"

export type DisposalAction = "approve" | "reject" | "execute"

type DisposalStatusOption = DisposalLifecycleStatus & { id: string }

export type DisposalSodReason = "requester" | "creator" | "no_employee"

export type DisposalSegregationInput = {
  action: DisposalAction
  segregationRequired: boolean
  actorEmployeeId?: string | null
  actorUserId?: string | null
  requestedById: string
  createdByUserId: string
  approverId?: string | null
  executedById?: string | null
}

// Pending Disposal is a valid source when no request is open (the route checks that): a
// corrective repair can close an asset to Pending Disposal before anyone raises the request.
const blockedRequestSourceStatuses = new Set([
  "disposed",
  "retired",
  "lost",
  "missing",
  "under maintenance",
  "pending repair",
])

const actionTargetStatuses: Record<DisposalAction, ReadonlySet<string>> = {
  approve: new Set(["pending disposal"]),
  reject: new Set(["ready"]),
  execute: new Set(["disposed", "retired"]),
}

const actionPermissions: Record<DisposalAction, "disposal:approve" | "disposal:edit"> = {
  approve: "disposal:approve",
  reject: "disposal:approve",
  execute: "disposal:edit",
}

const thaiStatusAliases = new Map<string, string>([
  ["พร้อมใช้งาน", "ready"],
  ["รอตัดจำหน่าย", "pending disposal"],
  ["ตัดจำหน่ายแล้ว", "disposed"],
  ["เลิกใช้งาน", "retired"],
  ["สูญหาย", "lost"],
  ["ไม่พบ", "missing"],
  ["อยู่ระหว่างซ่อม", "under maintenance"],
  ["อยู่ระหว่างบำรุงรักษา", "under maintenance"],
  ["รอซ่อม", "pending repair"],
])

// The one server check for a new disposal request. หาไม่พบ (Missing) passes only for a สูญหาย (lost) request: a round's
// not-found asset is written off as lost (ยืนยันผลตรวจ plan 4). Callers with no type (asset detail) keep refusing it.
export function getDisposalAssetEligibilityError(
  status: DisposalLifecycleStatus | null | undefined,
  disposalType?: string | null,
) {
  const normalized = normalizeStatus(status)
  if (normalized === "missing" && disposalType?.trim().toLowerCase() === "lost") return null
  if (!blockedRequestSourceStatuses.has(normalized)) return null
  return "Asset status does not allow a new disposal request"
}

// A request raised from Pending Disposal has no meaningful "previous" status to restore on
// rejection, so it records the custody-derived operational status instead.
export function getDisposalRequestRestoreStatusName(
  status: DisposalLifecycleStatus | null | undefined,
  custodianId: string | null | undefined,
): "In Use" | "Ready" | null {
  if (normalizeStatus(status) !== "pending disposal") return null
  return custodianId ? "In Use" : "Ready"
}

export function getDisposalApprovalAssetStatusError(status: DisposalLifecycleStatus | null | undefined) {
  if (normalizeStatus(status) === "pending disposal") return null
  return "The asset must remain Pending Disposal before approval"
}

export function getDisposalStatusTargetError(
  action: DisposalAction,
  status: DisposalLifecycleStatus | null | undefined
) {
  if (actionTargetStatuses[action].has(normalizeStatus(status))) return null

  if (action === "approve") return "Disposal approval must keep the asset status Pending Disposal"
  if (action === "reject") return "Disposal rejection can only return the asset status to Ready"
  return "Disposal execution can only set asset status to Disposed or Retired"
}

export function getDisposalRestoreStatusError(
  currentStatus: DisposalLifecycleStatus | null | undefined,
  previousStatus: DisposalLifecycleStatus | null | undefined,
): DisposalRestoreStatusError | null {
  if (normalizeStatus(currentStatus) !== "pending disposal") return "DISPOSAL_ASSET_STATUS_CHANGED"
  if (!previousStatus) return "DISPOSAL_PREVIOUS_STATUS_MISSING"
  if (previousStatus.isActive === false) return "DISPOSAL_PREVIOUS_STATUS_INACTIVE"
  return null
}

export function getDisposalActionPermission(action: DisposalAction) {
  return actionPermissions[action]
}

export function getDisposalDecisionStatusOptions<T extends DisposalStatusOption>(statuses: T[]) {
  return statuses.filter((status) => normalizeStatus(status) === "pending disposal")
}

export function getDisposalExecutionStatusOptions<T extends DisposalStatusOption>(statuses: T[]) {
  return statuses.filter((status) => getDisposalStatusTargetError("execute", status) === null)
}

export function filterDisposalExecutorOptions<T extends { id: string }>(
  employees: T[],
  approverId: string | null | undefined,
  segregationRequired: boolean
) {
  if (!segregationRequired || !approverId) return employees
  return employees.filter((employee) => employee.id !== approverId)
}

const disposalApprovalSodMessages: Record<DisposalSodReason, string> = {
  no_employee: "Disposal approvers must be linked to an employee record while segregation of duties is required",
  requester: "The requester cannot approve their own disposal request",
  creator: "The request creator cannot approve their own disposal request",
}

// The one reason an approve or reject is refused under segregation of duties; the requester
// reason wins over the creator one when the viewer is both.
export function getDisposalApprovalSodReason({
  segregationRequired,
  actorEmployeeId,
  actorUserId,
  requestedById,
  createdByUserId,
}: Omit<DisposalSegregationInput, "action" | "approverId" | "executedById">): DisposalSodReason | null {
  if (!segregationRequired) return null
  // The decision is recorded against the approver's employee; without one, execution could not
  // tell whether the executor is the same person who decided.
  if (!actorEmployeeId) return "no_employee"
  if (actorEmployeeId === requestedById) return "requester"
  if (actorUserId && actorUserId === createdByUserId) return "creator"
  return null
}

export function getDisposalSegregationError({
  action,
  segregationRequired,
  actorEmployeeId,
  actorUserId,
  requestedById,
  createdByUserId,
  approverId,
  executedById,
}: DisposalSegregationInput) {
  if (!segregationRequired) return null

  if (action === "approve" || action === "reject") {
    const reason = getDisposalApprovalSodReason({
      segregationRequired,
      actorEmployeeId,
      actorUserId,
      requestedById,
      createdByUserId,
    })
    return reason ? disposalApprovalSodMessages[reason] : null
  }

  if (action === "execute") {
    if (!approverId) {
      return "This approval has no recorded approver, so segregation of duties cannot be verified before execution"
    }
    if (actorEmployeeId === approverId || executedById === approverId) {
      return "The approver cannot execute the disposal request"
    }
  }

  return null
}

function normalizeStatus(status: DisposalLifecycleStatus | null | undefined) {
  const name = normalizeStatusName(status?.name)
  if (name) return name
  const nameTh = normalizeStatusName(status?.nameTh)
  return thaiStatusAliases.get(nameTh) ?? nameTh
}

function normalizeStatusName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}
