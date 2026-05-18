import assert from "node:assert/strict"
import test from "node:test"

import {
  parseWorkflowApprovalPolicy,
  workflowApprovalAuditCloseRequiredKey,
  workflowApprovalDefaults,
  workflowApprovalDisposalRequiredKey,
  workflowApprovalMaintenanceCloseRequiredKey,
  workflowApprovalMinApproversKey,
  workflowApprovalSegregationRequiredKey,
} from "../src/lib/workflow-approval.ts"

test("uses safe workflow approval defaults when settings are missing", () => {
  assert.deepEqual(parseWorkflowApprovalPolicy([]), workflowApprovalDefaults)
})

test("parses workflow approval booleans and minimum approver count", () => {
  const policy = parseWorkflowApprovalPolicy(
    new Map([
      [workflowApprovalDisposalRequiredKey, "false"],
      [workflowApprovalAuditCloseRequiredKey, "true"],
      [workflowApprovalMaintenanceCloseRequiredKey, "true"],
      [workflowApprovalMinApproversKey, "3"],
      [workflowApprovalSegregationRequiredKey, "false"],
    ])
  )

  assert.deepEqual(policy, {
    disposalRequired: false,
    auditCloseRequired: true,
    maintenanceCloseRequired: true,
    minApprovers: 3,
    segregationRequired: false,
  })
})
