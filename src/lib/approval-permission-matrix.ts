export type ApprovalWorkflowKey = "disposal" | "maintenance" | "audit"
export type ApprovalPermissionMatrixStatus = "ready" | "thin" | "missing"

export type ApprovalPermissionMatrixUser = {
  id: string
  label: string
  roleKeys: string[]
  roleLabels: string[]
  permissionKeys: string[]
}

export type ApprovalPermissionMatrixItem = {
  key: ApprovalWorkflowKey
  permissionKey: string
  approverCount: number
  approverLabels: string[]
  roleLabels: string[]
  status: ApprovalPermissionMatrixStatus
}

const workflows: Array<{ key: ApprovalWorkflowKey; module: string; action: string }> = [
  { key: "disposal", module: "disposal", action: "approve" },
  { key: "maintenance", module: "maintenance", action: "edit" },
  { key: "audit", module: "audit", action: "approve" },
]

export function buildApprovalPermissionMatrix(
  users: ApprovalPermissionMatrixUser[],
  minApprovers: number
): ApprovalPermissionMatrixItem[] {
  const requiredApprovers = Math.max(1, minApprovers)

  return workflows.map((workflow) => {
    const permissionKey = `${workflow.module}:${workflow.action}`
    const approvers = users
      .filter((user) => canApprove(user, permissionKey))
      .sort((left, right) => left.label.localeCompare(right.label))
    const roleLabels = Array.from(new Set(approvers.flatMap((user) => user.roleLabels))).sort((left, right) =>
      left.localeCompare(right)
    )

    return {
      key: workflow.key,
      permissionKey,
      approverCount: approvers.length,
      approverLabels: approvers.map((user) => user.label),
      roleLabels,
      status: getStatus(approvers.length, requiredApprovers),
    }
  })
}

function canApprove(user: ApprovalPermissionMatrixUser, permissionKey: string) {
  return user.roleKeys.includes("system_admin") || user.permissionKeys.includes(permissionKey)
}

function getStatus(approverCount: number, minApprovers: number): ApprovalPermissionMatrixStatus {
  if (approverCount === 0) return "missing"
  if (approverCount < minApprovers) return "thin"
  return "ready"
}
