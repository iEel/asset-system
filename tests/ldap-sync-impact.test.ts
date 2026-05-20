import assert from "node:assert/strict"
import test from "node:test"
import {
  buildLdapDeactivationImpacts,
  getActiveUserIdsForDeactivatedEmployees,
} from "../src/lib/ldap-sync-impact.ts"

const employees = [
  { id: "emp-1", code: "E001", fullNameTh: "Somchai Test", email: "somchai@example.com" },
  { id: "emp-2", code: "E002", fullNameTh: "Suda Test", email: null },
]

test("summarizes active assets and linked active users for employees missing from LDAP", () => {
  const impacts = buildLdapDeactivationImpacts({
    employees,
    assets: [
      { id: "asset-1", assetTag: "AST-001", name: "Notebook", custodianId: "emp-1" },
      { id: "asset-2", assetTag: "AST-002", name: "Monitor", custodianId: "emp-1" },
      { id: "asset-3", assetTag: "AST-003", name: "Printer", custodianId: "emp-2" },
    ],
    users: [
      { id: "user-1", employeeId: "emp-1", username: "somchai", isActive: true },
      { id: "user-2", employeeId: "emp-1", username: "somchai.old", isActive: false },
    ],
  })

  assert.deepEqual(impacts, [
    {
      employeeId: "emp-1",
      code: "E001",
      name: "Somchai Test",
      email: "somchai@example.com",
      activeAssetCount: 2,
      activeUserCount: 1,
      assets: [
        { id: "asset-1", assetTag: "AST-001", name: "Notebook" },
        { id: "asset-2", assetTag: "AST-002", name: "Monitor" },
      ],
    },
    {
      employeeId: "emp-2",
      code: "E002",
      name: "Suda Test",
      email: null,
      activeAssetCount: 1,
      activeUserCount: 0,
      assets: [
        { id: "asset-3", assetTag: "AST-003", name: "Printer" },
      ],
    },
  ])
})

test("collects active user ids linked to deactivated employees only", () => {
  const userIds = getActiveUserIdsForDeactivatedEmployees({
    employeeIds: ["emp-1", "emp-2"],
    users: [
      { id: "user-1", employeeId: "emp-1", username: "somchai", isActive: true },
      { id: "user-2", employeeId: "emp-1", username: "somchai.old", isActive: false },
      { id: "user-3", employeeId: "emp-3", username: "other", isActive: true },
    ],
  })

  assert.deepEqual(userIds, ["user-1"])
})
