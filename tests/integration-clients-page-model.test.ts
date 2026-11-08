import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  clientUsage,
  creatorLabel,
  filterClients,
  integrationSummary,
  statusCounts,
} from "../src/lib/integration-clients-page-model.ts"
import { toIntegrationClientDto, type IntegrationClientDto } from "../src/lib/integration-client-store.ts"
import { emptyIntegrationOperationSummary } from "../src/lib/integration-client-operations.ts"
import { hashIntegrationToken } from "../src/lib/integration-auth.ts"

function client(overrides: Partial<IntegrationClientDto> = {}): IntegrationClientDto {
  return {
    id: "row-1",
    clientId: "wms",
    displayName: "Warehouse",
    tokenPreview: "ams_abcd...wxyz",
    scopes: ["asset:read"],
    enabled: true,
    createdBy: "user-1",
    createdByName: "สมชาย ใจดี",
    createdAt: new Date("2026-11-01T00:00:00.000Z"),
    updatedBy: "user-1",
    updatedAt: new Date("2026-11-01T00:00:00.000Z"),
    lastUsedAt: null,
    lastUsedIp: null,
    lastRotatedAt: null,
    operations: emptyIntegrationOperationSummary(),
    ...overrides,
  }
}

function ops(requestCount7d: number, errorCount7d: number) {
  return { ...emptyIntegrationOperationSummary(), requestCount7d, errorCount7d, requestCountTotal: requestCount7d }
}

const clients = [
  client({ id: "a", enabled: true, lastUsedAt: new Date("2026-11-08T00:00:00.000Z"), operations: ops(10, 2) }),
  client({ id: "b", enabled: true, lastUsedAt: null, operations: ops(0, 0) }),
  client({ id: "c", enabled: false, lastUsedAt: new Date("2026-10-01T00:00:00.000Z"), operations: ops(5, 0) }),
]

test("summary counts active, disabled, used ever and 7-day totals", () => {
  assert.deepEqual(integrationSummary(clients), { active: 2, disabled: 1, usedEver: 2, calls7d: 15, errors7d: 2 })
  assert.deepEqual(integrationSummary([]), { active: 0, disabled: 0, usedEver: 0, calls7d: 0, errors7d: 0 })
})

test("status counts and filter", () => {
  assert.deepEqual(statusCounts(clients), { all: 3, active: 2, disabled: 1 })
  assert.deepEqual(filterClients(clients, "all").map((item) => item.id), ["a", "b", "c"])
  assert.deepEqual(filterClients(clients, "active").map((item) => item.id), ["a", "b"])
  assert.deepEqual(filterClients(clients, "disabled").map((item) => item.id), ["c"])
  assert.notEqual(filterClients(clients, "all"), clients, "filter returns a new array")
})

test("unused client shows never used and zero counts", () => {
  assert.deepEqual(clientUsage(clients[1]), { lastUsedAt: null, calls7d: 0, errors7d: 0, hasErrors: false, neverUsed: true })
  assert.deepEqual(clientUsage(clients[0]), {
    lastUsedAt: new Date("2026-11-08T00:00:00.000Z"),
    calls7d: 10,
    errors7d: 2,
    hasErrors: true,
    neverUsed: false,
  })
  // Over JSON the date arrives as a string.
  const fromJson = clientUsage({ ...clients[2], lastUsedAt: "2026-10-01T00:00:00.000Z" as unknown as Date })
  assert.equal(fromJson.lastUsedAt, "2026-10-01T00:00:00.000Z")
  assert.equal(fromJson.neverUsed, false)
  assert.equal(fromJson.hasErrors, false)
})

test("unknown creator falls back to a neutral label", () => {
  assert.deepEqual(creatorLabel({ createdByName: "สมชาย ใจดี" }), { kind: "name", name: "สมชาย ใจดี" })
  assert.deepEqual(creatorLabel({ createdByName: "  สมชาย  " }), { kind: "name", name: "สมชาย" })
  assert.deepEqual(creatorLabel({ createdByName: null }), { kind: "unknown" })
  assert.deepEqual(creatorLabel({ createdByName: "   " }), { kind: "unknown" })
})

test("the GET returns createdByName and never the token hash", () => {
  const dto = toIntegrationClientDto(
    {
      id: "row-1",
      clientId: "wms",
      displayName: "Warehouse",
      tokenHash: hashIntegrationToken("warehouse-token"),
      tokenPreview: "ams_abcd...wxyz",
      scopesJson: JSON.stringify(["asset:read"]),
      enabled: true,
      createdBy: "user-1",
      createdAt: new Date("2026-11-01T00:00:00.000Z"),
      updatedBy: "user-1",
      updatedAt: new Date("2026-11-01T00:00:00.000Z"),
      lastUsedAt: null,
      lastUsedIp: null,
      lastRotatedAt: null,
    },
    undefined,
    "สมชาย ใจดี"
  )
  assert.equal(dto.createdByName, "สมชาย ใจดี")
  const keys = Object.keys(dto)
  assert.ok(keys.includes("createdByName"))
  for (const key of keys) {
    assert.doesNotMatch(key, /hash|^token$|plain/i, `DTO must not expose ${key}`)
  }
  assert.equal(JSON.stringify(dto).includes(hashIntegrationToken("warehouse-token")), false)

  // Without a name the DTO still carries the field, as null.
  const bare = toIntegrationClientDto({
    id: "row-2",
    clientId: "erp",
    displayName: "ERP",
    tokenHash: "h",
    tokenPreview: "ams_x...y",
    scopesJson: JSON.stringify(["asset:read"]),
    enabled: true,
    createdBy: null,
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
    lastUsedAt: null,
    lastUsedIp: null,
    lastRotatedAt: null,
  })
  assert.equal(bare.createdByName, null)

  const source = readFileSync("src/app/api/admin/integration-clients/route.ts", "utf8")
  const getStart = source.indexOf("export async function GET")
  const getHandler = source.slice(getStart, source.indexOf("export async function POST"))
  assert.match(getHandler, /prisma\.user\.findMany\(/)
  assert.match(getHandler, /displayName:\s*true/)
  assert.match(getHandler, /createdByName/)
  assert.doesNotMatch(getHandler, /tokenHash/)
})
