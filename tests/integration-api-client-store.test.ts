import assert from "node:assert/strict"
import test from "node:test"

import {
  INTEGRATION_SCOPES,
  buildTokenPreview,
  generateIntegrationPlainToken,
  normalizeIntegrationScopes,
  parseIntegrationScopesJson,
  serializeIntegrationScopes,
  toIntegrationClientDto,
  toRuntimeIntegrationClient,
} from "../src/lib/integration-client-store.ts"
import { hashIntegrationToken } from "../src/lib/integration-auth.ts"

test("normalizes integration scopes by trimming and de-duplicating allowed values", () => {
  assert.deepEqual(INTEGRATION_SCOPES, ["asset:read", "reference:read", "integration:read"])
  assert.deepEqual(normalizeIntegrationScopes([" asset:read ", "reference:read", "asset:read"]), [
    "asset:read",
    "reference:read",
  ])
})

test("rejects empty or invalid integration scope payloads", () => {
  assert.throws(() => normalizeIntegrationScopes([]), /scope/i)
  assert.throws(() => normalizeIntegrationScopes(["asset:read", 123]), /scope/i)
  assert.throws(() => normalizeIntegrationScopes(["asset:write"]), /scope/i)
  assert.throws(() => normalizeIntegrationScopes(["asset:read", "   "]), /scope/i)
  assert.throws(() => normalizeIntegrationScopes(["   "]), /scope/i)
  assert.throws(() => parseIntegrationScopesJson("not-json"), /scope|json/i)
  assert.throws(() => parseIntegrationScopesJson("[]"), /scope/i)
  assert.throws(() => parseIntegrationScopesJson(JSON.stringify(["asset:read", 123])), /scope/i)
  assert.throws(() => parseIntegrationScopesJson(JSON.stringify(["asset:write"])), /scope/i)
  assert.throws(() => parseIntegrationScopesJson("{}"), /scope|array/i)
})

test("serializes and parses integration scopes as a stable JSON roundtrip", () => {
  const scopes = normalizeIntegrationScopes(["integration:read", "asset:read", "integration:read"])
  const serialized = serializeIntegrationScopes(scopes)

  assert.equal(serialized, JSON.stringify(["integration:read", "asset:read"]))
  assert.deepEqual(parseIntegrationScopesJson(serialized), ["integration:read", "asset:read"])
})

test("generates prefixed integration tokens and non-secret short previews", () => {
  const token = generateIntegrationPlainToken()
  const preview = buildTokenPreview(token)

  assert.match(token, /^ams_[A-Za-z0-9_-]{32,}$/)
  assert.equal(token.length >= 48, true)
  assert.equal(preview.includes(token), false)
  assert.equal(preview.startsWith("ams_"), true)
  assert.equal(preview.length <= 20, true)
})

test("converts database records to API DTOs without exposing tokenHash", () => {
  const dto = toIntegrationClientDto({
    id: "client-row-id",
    clientId: "wms",
    displayName: "Warehouse Management",
    tokenHash: hashIntegrationToken("warehouse-token"),
    tokenPreview: "ams_abcd...wxyz",
    scopesJson: JSON.stringify(["asset:read"]),
    enabled: true,
    lastUsedAt: null,
    lastUsedIp: null,
    createdBy: "admin",
    updatedBy: "admin",
    lastRotatedAt: null,
    createdAt: new Date("2026-06-14T00:00:00.000Z"),
    updatedAt: new Date("2026-06-14T00:00:00.000Z"),
  })

  assert.equal(dto.clientId, "wms")
  assert.equal(dto.displayName, "Warehouse Management")
  assert.deepEqual(dto.scopes, ["asset:read"])
  assert.equal("tokenPreview" in dto, true)
  assert.equal("tokenHash" in dto, false)
})

test("sanitizes malformed persisted scopes for runtime DB authentication", () => {
  const pastedSecret = "ams_accidentally-pasted-secret"

  assert.doesNotThrow(() =>
    toRuntimeIntegrationClient({
      clientId: "wms",
      displayName: "Warehouse Management",
      tokenHash: hashIntegrationToken("warehouse-token"),
      scopesJson: JSON.stringify(["asset:read", pastedSecret]),
      enabled: true,
    })
  )
  assert.equal(
    toRuntimeIntegrationClient({
      clientId: "wms",
      displayName: "Warehouse Management",
      tokenHash: hashIntegrationToken("warehouse-token"),
      scopesJson: JSON.stringify(["asset:read", pastedSecret]),
      enabled: true,
    }),
    null
  )
})
