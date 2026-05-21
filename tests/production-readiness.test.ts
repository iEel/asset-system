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
    deployment: {
      nodeEnv: "production",
      authUrl: "https://asset.company.com",
      nextAuthUrl: "https://asset.company.com",
      authSecret: "abcdefghijklmnopqrstuvwxyz1234567890",
      nextAuthSecret: "abcdefghijklmnopqrstuvwxyz1234567890",
      uploadDir: "/var/www/asset-system/uploads",
      databaseUrl: "sqlserver://192.168.1.10;database=asset_management;user=asset_app;password=secret",
      dbServer: "192.168.1.10",
      dbUser: "asset_app",
      dbPassword: "secret",
      maintenancePmGenerationToken: "pm-token",
      ldapSyncToken: "ldap-token",
      notificationDigestToken: "digest-token",
      schedulerLastRunStatuses: ["success", "success"],
      backupStatus: "success",
      backupLastRunAt: "2026-05-20T01:00:00.000Z",
      pwaAssets: {
        available: 8,
        total: 8,
      },
    },
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

  assert.deepEqual(checks.map((check) => check.status), ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass"])
  assert.equal(checks.find((check) => check.key === "pwaAssets")?.value, "8/8 assets")
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
    deployment: {
      nodeEnv: "development",
      authUrl: "https://asset.company.com:3000",
      nextAuthUrl: "https://asset.company.com",
      authSecret: "replace-with-openssl-rand-base64-32",
      nextAuthSecret: "replace-with-same-value-as-auth-secret",
      uploadDir: "",
      databaseUrl: "sqlserver://server;database=asset_management;user=asset_app;password=replace-with-db-password",
      dbServer: "",
      dbUser: "asset_app",
      dbPassword: "",
      maintenancePmGenerationToken: "",
      ldapSyncToken: "",
      notificationDigestToken: "",
      schedulerLastRunStatuses: ["failed", "success"],
      backupStatus: "missing",
      backupLastRunAt: "",
      pwaAssets: {
        available: 3,
        total: 8,
      },
    },
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
  assert.equal(checks.find((check) => check.key === "appBaseUrl")?.status, "warning")
  assert.equal(checks.find((check) => check.key === "authSecret")?.status, "fail")
  assert.equal(checks.find((check) => check.key === "uploadDir")?.status, "fail")
  assert.equal(checks.find((check) => check.key === "databaseConfig")?.status, "fail")
  assert.equal(checks.find((check) => check.key === "schedulerTokens")?.status, "fail")
  assert.equal(checks.find((check) => check.key === "schedulerRuns")?.status, "fail")
  assert.equal(checks.find((check) => check.key === "backupStatus")?.status, "fail")
  assert.equal(checks.find((check) => check.key === "pwaAssets")?.status, "warning")
})
