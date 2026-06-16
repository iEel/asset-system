import assert from "node:assert/strict"
import test from "node:test"

import {
  buildIntegrationClientOperationSummaries,
  buildIntegrationPowerShellExamples,
} from "../src/lib/integration-client-operations.ts"

const now = new Date("2026-06-16T05:00:00.000Z")

function hoursAgo(hours: number) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000)
}

test("builds integration client operation summaries from audit logs", () => {
  const summaries = buildIntegrationClientOperationSummaries(
    [
      {
        module: "integration_api",
        recordId: "erp-readonly",
        createdAt: hoursAgo(2),
        newValue: JSON.stringify({
          route: "/api/integrations/v1/assets",
          method: "GET",
          status: 200,
          requestId: "req-ok",
        }),
      },
      {
        module: "integration_api",
        recordId: "erp-readonly",
        createdAt: hoursAgo(24 * 6),
        newValue: {
          route: "/api/integrations/v1/assets",
          method: "GET",
          status: 500,
          requestId: "req-error",
        },
      },
      {
        module: "integration_api",
        recordId: "erp-readonly",
        createdAt: hoursAgo(24 * 9),
        newValue: JSON.stringify({
          route: "/api/integrations/v1/reference/statuses",
          method: "GET",
          status: 200,
          requestId: "req-old",
        }),
      },
      {
        module: "integration_api",
        recordId: "hr-report",
        createdAt: hoursAgo(1),
        newValue: JSON.stringify({
          route: "/api/integrations/v1/reference/companies",
          method: "GET",
          status: 200,
          requestId: "req-hr",
        }),
      },
      {
        module: "asset",
        recordId: "erp-readonly",
        createdAt: hoursAgo(1),
        newValue: JSON.stringify({ route: "/api/integrations/v1/assets", status: 200 }),
      },
    ],
    { now }
  )

  assert.deepEqual(summaries["erp-readonly"], {
    requestCount24h: 1,
    requestCount7d: 2,
    requestCountTotal: 3,
    errorCount7d: 1,
    topEndpoint: { route: "/api/integrations/v1/assets", count: 2 },
    latestError: {
      route: "/api/integrations/v1/assets",
      status: 500,
      requestId: "req-error",
      at: hoursAgo(24 * 6).toISOString(),
    },
  })
  assert.equal(summaries["hr-report"]?.requestCount24h, 1)
})

test("builds scope-aware PowerShell examples without embedding token secrets", () => {
  const assetExamples = buildIntegrationPowerShellExamples(
    { clientId: "erp-readonly", scopes: ["asset:read"] },
    "https://asset.soniclogistic.org"
  )

  assert.deepEqual(
    assetExamples.map((example) => example.key),
    ["health", "assetsByEmployee"]
  )
  assert.match(assetExamples[0].command, /\$token = "<paste token for erp-readonly>"/)
  assert.match(assetExamples[1].command, /employeeCode=8171&limit=100/)
  assert.doesNotMatch(assetExamples.map((example) => example.command).join("\n"), /ams_[A-Za-z0-9_-]+/)

  const fullExamples = buildIntegrationPowerShellExamples(
    { clientId: "admin-sync", scopes: ["asset:read", "reference:read", "integration:read"] },
    "https://asset.soniclogistic.org"
  )

  assert.deepEqual(
    fullExamples.map((example) => example.key),
    ["health", "assetsByEmployee", "referenceStatuses", "referenceCompanies", "openApi"]
  )
})
