import assert from "node:assert/strict"
import test from "node:test"

import { buildIntegrationApiAuditValue } from "../src/lib/integration-auth.ts"

test("integration API audit payload records read scope, filters, and response counts without secrets", () => {
  const auditValue = buildIntegrationApiAuditValue({
    clientId: "Ittirith-report",
    route: "/api/integrations/v1/assets",
    method: "GET",
    status: 200,
    requestId: "request-1",
    query: {
      employeeCode: "8171",
      includeInactive: false,
      page: 1,
      limit: 100,
    },
    response: {
      resultCount: 4,
      total: 4,
    },
  })

  assert.deepEqual(auditValue, {
    clientId: "Ittirith-report",
    operation: "read",
    route: "/api/integrations/v1/assets",
    method: "GET",
    status: 200,
    requestId: "request-1",
    "query.employeeCode": "8171",
    "query.includeInactive": false,
    "query.page": 1,
    "query.limit": 100,
    "response.resultCount": 4,
    "response.total": 4,
  })
  assert.doesNotMatch(JSON.stringify(auditValue), /authorization|bearer|token/i)
})

test("integration API audit payload includes asset detail target", () => {
  const auditValue = buildIntegrationApiAuditValue({
    clientId: "erp-readonly",
    route: "/api/integrations/v1/assets/{assetTag}",
    method: "GET",
    status: 200,
    requestId: "request-2",
    target: {
      assetTag: "SNI-EQU-25-0220",
    },
    response: {
      resultCount: 1,
    },
  })

  assert.equal(auditValue["target.assetTag"], "SNI-EQU-25-0220")
  assert.equal(auditValue["response.resultCount"], 1)
})
