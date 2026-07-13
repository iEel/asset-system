export type DisposalLifecycleStatus = {
  name?: string | null
  nameTh?: string | null
}

export type DisposalAction = "approve" | "reject" | "execute"

type DisposalStatusOption = DisposalLifecycleStatus & { id: string }

type DisposalSegregationInput = {
  action: DisposalAction
  segregationRequired: boolean
  actorEmployeeId?: string | null
  actorUserId?: string | null
  requestedById: string
  createdByUserId: string
  approverId?: string | null
  executedById?: string | null
}

const blockedRequestSourceStatuses = new Set([
  "pending disposal",
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

export function getDisposalAssetEligibilityError(status: DisposalLifecycleStatus | null | undefined) {
  if (!blockedRequestSourceStatuses.has(normalizeStatus(status))) return null
  return "Asset status does not allow a new disposal request"
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

export function getDisposalActionPermission(action: DisposalAction) {
  return actionPermissions[action]
}

export function getDisposalDecisionStatusOptions<T extends DisposalStatusOption>(statuses: T[]) {
  return ["pending disposal", "ready"].flatMap((statusName) =>
    statuses.filter((status) => normalizeStatus(status) === statusName)
  )
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

  if (action === "approve") {
    if (actorEmployeeId && actorEmployeeId === requestedById) {
      return "The requester cannot approve their own disposal request"
    }
    if (actorUserId && actorUserId === createdByUserId) {
      return "The request creator cannot approve their own disposal request"
    }
    return null
  }

  if (action === "execute" && approverId) {
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
