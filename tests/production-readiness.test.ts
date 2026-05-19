import assert from "node:assert/strict"
import test from "node:test"

import { buildProductionReadinessChecks } from "../src/lib/production-readiness.ts"

const baseSettings = new Map([
  ["asset_qr_public_base_url", "https://asset.company.com"],
  ["notification_return_due_soon_days", "3"],
  ["notification_audit_action_due_soon_days", "7"],
  ["notification_warranty_expiry_days", "30"],
  ["notification_license_expiry_days", "30"],
])

const readyApprovers = [
  { key: "disposal", status: "ready", approverCount: 2 },
  { key: "maintenance", status: "ready", approverCount: 2 },
  { key: "audit", status: "ready", approverCount: 2 },
] as const

test("marks core production readiness checks as pass when settings and coverage are healthy", () => {
  const checks = buildProductionReadinessChecks({
    settings: baseSettings,
    approverMatrix: readyApprovers,
    activeAdminUsers: 2,
    activeUserCount: 8,
    masterDataCounts: {
      companies: 1,
      branches: 2,
      departments: 3,
      locations: 4,
      categories: 5,
      statuses: 3,
      conditions: 3,
    },
  })

  assert.deepEqual(checks.map((check) => check.status), ["pass", "pass", "pass", "pass", "pass"])
})

test("surfaces risky production readiness states", () => {
  const checks = buildProductionReadinessChecks({
    settings: new Map([
      ...baseSettings,
      ["asset_qr_public_base_url", "http://localhost:3000"],
      ["notification_license_expiry_days", "500"],
    ]),
    approverMatrix: [
      { key: "disposal", status: "missing", approverCount: 0 },
      { key: "maintenance", status: "thin", approverCount: 1 },
      { key: "audit", status: "ready", approverCount: 2 },
    ],
    activeAdminUsers: 1,
    activeUserCount: 3,
    masterDataCounts: {
      companies: 1,
      branches: 0,
      departments: 1,
      locations: 0,
      categories: 1,
      statuses: 2,
      conditions: 2,
    },
  })

  assert.equal(checks.find((check) => check.key === "publicQrBaseUrl")?.status, "warning")
  assert.equal(checks.find((check) => check.key === "workflowApprovers")?.status, "fail")
  assert.equal(checks.find((check) => check.key === "notificationRules")?.status, "fail")
  assert.equal(checks.find((check) => check.key === "adminCoverage")?.status, "warning")
  assert.equal(checks.find((check) => check.key === "masterData")?.status, "warning")
})
