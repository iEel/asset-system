import assert from "node:assert/strict"
import test from "node:test"

import {
  IntegrationApiError,
  authenticateIntegrationRequest,
  hashIntegrationToken,
  parseIntegrationClients,
} from "../src/lib/integration-auth.ts"

test("parses enabled integration clients with hashed bearer tokens", () => {
  const tokenHash = hashIntegrationToken("secret-token")
  const clients = parseIntegrationClients(
    JSON.stringify([
      {
        clientId: "hr-system",
        name: "HR System",
        tokenHash,
        scopes: ["asset:read", "reference:read"],
      },
      {
        clientId: "disabled-system",
        tokenHash: hashIntegrationToken("disabled-token"),
        scopes: ["asset:read"],
        enabled: false,
      },
    ])
  )

  assert.equal(clients.length, 1)
  assert.equal(clients[0].clientId, "hr-system")
  assert.deepEqual(clients[0].scopes, ["asset:read", "reference:read"])
})

test("authenticates a bearer token when the required scope is granted", async () => {
  const clients = parseIntegrationClients(
    JSON.stringify([
      {
        clientId: "wms",
        tokenHash: hashIntegrationToken("warehouse-token"),
        scopes: ["asset:read"],
      },
    ])
  )
  const request = new Request("http://localhost/api/integrations/v1/assets", {
    headers: { authorization: "Bearer warehouse-token" },
  })

  const context = await authenticateIntegrationRequest(request, "asset:read", clients)

  assert.equal(context.client.clientId, "wms")
  assert.equal(context.requestId.length > 10, true)
})

test("rejects missing or unknown integration bearer tokens", async () => {
  const clients = parseIntegrationClients(
    JSON.stringify([{ clientId: "erp", tokenHash: hashIntegrationToken("erp-token"), scopes: ["asset:read"] }])
  )

  await assert.rejects(
    () => authenticateIntegrationRequest(new Request("http://localhost/api/integrations/v1/assets"), "asset:read", clients),
    (error) =>
      error instanceof IntegrationApiError &&
      error.status === 401 &&
      error.code === "INTEGRATION_UNAUTHORIZED"
  )

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

test("rejects integration clients without the required scope", async () => {
  const clients = parseIntegrationClients(
    JSON.stringify([{ clientId: "reporting", tokenHash: hashIntegrationToken("report-token"), scopes: ["reference:read"] }])
  )
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
