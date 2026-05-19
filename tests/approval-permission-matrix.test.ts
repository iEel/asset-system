import assert from "node:assert/strict"
import test from "node:test"

import { buildApprovalPermissionMatrix } from "../src/lib/approval-permission-matrix.ts"

test("builds approver matrix by workflow permission", () => {
  const matrix = buildApprovalPermissionMatrix(
    [
      {
        id: "admin",
        label: "System Admin",
        roleKeys: ["system_admin"],
        roleLabels: ["System Administrator"],
        permissionKeys: [],
      },
      {
        id: "disposal-approver",
        label: "Disposal Approver",
        roleKeys: ["disposal_manager"],
        roleLabels: ["Disposal Manager"],
        permissionKeys: ["disposal:approve"],
      },
      {
        id: "maintenance-user",
        label: "Maintenance User",
        roleKeys: ["maintenance_user"],
        roleLabels: ["Maintenance"],
        permissionKeys: ["maintenance:edit"],
      },
    ],
    2
  )

  const disposal = matrix.find((item) => item.key === "disposal")
  const maintenance = matrix.find((item) => item.key === "maintenance")
  const audit = matrix.find((item) => item.key === "audit")

  assert.equal(disposal?.approverCount, 2)
  assert.equal(disposal?.status, "ready")
  assert.deepEqual(disposal?.roleLabels, ["Disposal Manager", "System Administrator"])
  assert.equal(maintenance?.approverCount, 2)
  assert.equal(maintenance?.status, "ready")
  assert.equal(audit?.approverCount, 1)
  assert.equal(audit?.status, "thin")
})

test("marks workflow with no active approvers as missing", () => {
  const matrix = buildApprovalPermissionMatrix(
    [
      {
        id: "viewer",
        label: "Viewer",
        roleKeys: ["viewer"],
        roleLabels: ["Viewer"],
        permissionKeys: ["asset:view"],
      },
    ],
    1
  )

  assert.equal(matrix.find((item) => item.key === "disposal")?.status, "missing")
  assert.equal(matrix.find((item) => item.key === "disposal")?.approverCount, 0)
})
