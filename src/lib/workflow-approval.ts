export const workflowApprovalDisposalRequiredKey = "workflow_approval_disposal_required"
export const workflowApprovalAuditCloseRequiredKey = "workflow_approval_audit_close_required"
export const workflowApprovalMaintenanceCloseRequiredKey = "workflow_approval_maintenance_close_required"
export const workflowApprovalMinApproversKey = "workflow_approval_min_approvers"
export const workflowApprovalSegregationRequiredKey = "workflow_approval_segregation_required"
export const workflowApprovalSlaDaysKey = "workflow_approval_sla_days"

export const workflowApprovalSettingKeys = [
  workflowApprovalDisposalRequiredKey,
  workflowApprovalAuditCloseRequiredKey,
  workflowApprovalMaintenanceCloseRequiredKey,
  workflowApprovalMinApproversKey,
  workflowApprovalSegregationRequiredKey,
  workflowApprovalSlaDaysKey,
] as const

export type WorkflowApprovalPolicy = {
  disposalRequired: boolean
  auditCloseRequired: boolean
  maintenanceCloseRequired: boolean
  minApprovers: number
  segregationRequired: boolean
  slaDays: number
}

export const workflowApprovalDefaults: WorkflowApprovalPolicy = {
  disposalRequired: true,
  auditCloseRequired: true,
  maintenanceCloseRequired: false,
  minApprovers: 1,
  segregationRequired: true,
  slaDays: 3,
}

type WorkflowApprovalSetting = { key: string; value: string } | readonly [string, string]

function settingsToMap(settings: Iterable<WorkflowApprovalSetting>) {
  const values = new Map<string, string>()
  for (const setting of settings) {
    if ("key" in setting) {
      values.set(setting.key, setting.value)
    } else {
      values.set(setting[0], setting[1])
    }
  }
  return values
}

function readBoolean(values: Map<string, string>, key: string, fallback: boolean) {
  const value = values.get(key)
  if (value === "true") return true
  if (value === "false") return false
  return fallback
}

function readMinApprovers(values: Map<string, string>) {
  const count = Number(values.get(workflowApprovalMinApproversKey))
  if (!Number.isInteger(count) || count < 1 || count > 5) return workflowApprovalDefaults.minApprovers
  return count
}

function readSlaDays(values: Map<string, string>) {
  const days = Number(values.get(workflowApprovalSlaDaysKey))
  if (!Number.isInteger(days) || days < 1 || days > 90) return workflowApprovalDefaults.slaDays
  return days
}

export function parseWorkflowApprovalPolicy(settings: Iterable<WorkflowApprovalSetting>): WorkflowApprovalPolicy {
  const values = settingsToMap(settings)
  return {
    disposalRequired: readBoolean(
      values,
      workflowApprovalDisposalRequiredKey,
      workflowApprovalDefaults.disposalRequired
    ),
    auditCloseRequired: readBoolean(
      values,
      workflowApprovalAuditCloseRequiredKey,
      workflowApprovalDefaults.auditCloseRequired
    ),
    maintenanceCloseRequired: readBoolean(
      values,
      workflowApprovalMaintenanceCloseRequiredKey,
      workflowApprovalDefaults.maintenanceCloseRequired
    ),
    minApprovers: readMinApprovers(values),
    segregationRequired: readBoolean(
      values,
      workflowApprovalSegregationRequiredKey,
      workflowApprovalDefaults.segregationRequired
    ),
    slaDays: readSlaDays(values),
  }
}
