import assert from "node:assert/strict"
import test from "node:test"

import {
  IntegrationApiError,
  type IntegrationClient,
  authenticateIntegrationRequest,
  hashIntegrationToken,
} from "../src/lib/integration-auth.ts"

function integrationClient(overrides: Partial<IntegrationClient> = {}): IntegrationClient {
  return {
    clientId: "test-client",
    name: "Test Client",
    tokenHash: hashIntegrationToken("test-token"),
    scopes: ["asset:read"],
    enabled: true,
    ...overrides,
  }
}

test("authenticates a bearer token from an explicit in-memory client list when the required scope is granted", async () => {
  const clients = [
    integrationClient({
      clientId: "wms",
      name: "Warehouse Management",
      tokenHash: hashIntegrationToken("warehouse-token"),
    }),
  ]
  const request = new Request("http://localhost/api/integrations/v1/assets", {
    headers: { authorization: "Bearer warehouse-token" },
  })

  const context = await authenticateIntegrationRequest(request, "asset:read", clients)

  assert.equal(context.client.clientId, "wms")
  assert.equal(context.requestId.length > 10, true)
})

test("rejects a missing integration bearer token against an explicit in-memory client list", async () => {
  const clients = [integrationClient({ clientId: "erp", tokenHash: hashIntegrationToken("erp-token") })]

  await assert.rejects(
    () => authenticateIntegrationRequest(new Request("http://localhost/api/integrations/v1/assets"), "asset:read", clients),
    (error) =>
      error instanceof IntegrationApiError &&
      error.status === 401 &&
      error.code === "INTEGRATION_UNAUTHORIZED"
  )
})

test("rejects an unknown integration bearer token against an explicit in-memory client list", async () => {
  const clients = [integrationClient({ clientId: "erp", tokenHash: hashIntegrationToken("erp-token") })]

  await assert.rejects(
    () =>
      authenticateIntegrationRequest(
        new Request("http://localhost/api/integrations/v1/assets", { headers: { authorization: "Bearer nope" } }),
        "asset:read",
        clients
      ),
    (error) =>
      error instanceof IntegrationApiError &&
      error.status === 401 &&
      error.code === "INTEGRATION_UNAUTHORIZED"
  )
})

test("rejects disabled integration clients from the explicit in-memory auth seam", async () => {
  const clients = [
    integrationClient({
      clientId: "disabled-system",
      tokenHash: hashIntegrationToken("disabled-token"),
      enabled: false,
    }),
  ]
  const request = new Request("http://localhost/api/integrations/v1/assets", {
    headers: { authorization: "Bearer disabled-token" },
  })

  await assert.rejects(
    () => authenticateIntegrationRequest(request, "asset:read", clients),
    (error) =>
      error instanceof IntegrationApiError &&
      error.status === 401 &&
      error.code === "INTEGRATION_UNAUTHORIZED"
  )
})

test("rejects integration clients without the required scope", async () => {
  const clients = [
    integrationClient({
      clientId: "reporting",
      tokenHash: hashIntegrationToken("report-token"),
      scopes: ["reference:read"],
    }),
  ]
  const request = new Request("http://localhost/api/integrations/v1/assets", {
    headers: { authorization: "Bearer report-token" },
  })

  await assert.rejects(
    () => authenticateIntegrationRequest(request, "asset:read", clients),
    (error) =>
      error instanceof IntegrationApiError &&
      error.status === 403 &&
      error.code === "INTEGRATION_FORBIDDEN"
  )
})

test("preserves wildcard and module wildcard integration scope behavior", async () => {
  const wildcardRequest = new Request("http://localhost/api/integrations/v1/reference/locations", {
    headers: { authorization: "Bearer wildcard-token" },
  })
  const moduleWildcardRequest = new Request("http://localhost/api/integrations/v1/assets", {
    headers: { authorization: "Bearer asset-admin-token" },
  })

  await assert.doesNotReject(() =>
    authenticateIntegrationRequest(
      wildcardRequest,
      "reference:read",
      [integrationClient({ clientId: "wildcard", tokenHash: hashIntegrationToken("wildcard-token"), scopes: ["*"] })]
    )
  )
  await assert.doesNotReject(() =>
    authenticateIntegrationRequest(
      moduleWildcardRequest,
      "asset:read",
      [integrationClient({ clientId: "asset-admin", tokenHash: hashIntegrationToken("asset-admin-token"), scopes: ["asset:*"] })]
    )
  )
})
