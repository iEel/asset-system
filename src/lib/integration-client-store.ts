import { randomBytes } from "node:crypto"
import type { IntegrationApiClient as PrismaIntegrationApiClient } from "@prisma/client"
import { hashIntegrationToken, type IntegrationClient, type IntegrationScope } from "./integration-auth.ts"
import {
  buildIntegrationClientOperationSummaries,
  emptyIntegrationOperationSummary,
  type IntegrationClientOperationSummary,
} from "./integration-client-operations.ts"

export const INTEGRATION_SCOPES = ["asset:read", "reference:read", "integration:read"] as const

const allowedScopes = new Set<string>([...INTEGRATION_SCOPES, "*", "asset:*"])

export type IntegrationClientDto = {
  id: string
  clientId: string
  displayName: string
  tokenPreview: string
  scopes: IntegrationScope[]
  enabled: boolean
  createdBy: string | null
  createdAt: Date
  updatedBy: string | null
  updatedAt: Date
  lastUsedAt: Date | null
  lastUsedIp: string | null
  lastRotatedAt: Date | null
  operations: IntegrationClientOperationSummary
}

export type CreateIntegrationClientInput = {
  clientId: unknown
  displayName: unknown
  scopes: unknown
  enabled?: unknown
}

export type UpdateIntegrationClientInput = {
  displayName: unknown
  scopes: unknown
}

type IntegrationApiClientRecord = Pick<
  PrismaIntegrationApiClient,
  | "id"
  | "clientId"
  | "displayName"
  | "tokenHash"
  | "tokenPreview"
  | "scopesJson"
  | "enabled"
  | "createdBy"
  | "createdAt"
  | "updatedBy"
  | "updatedAt"
  | "lastUsedAt"
  | "lastUsedIp"
  | "lastRotatedAt"
>

export function generateIntegrationPlainToken(): string {
  return `ams_${randomBytes(33).toString("base64url")}`
}

export function buildTokenPreview(token: string): string {
  const prefix = token.startsWith("ams_") ? "ams_" : ""
  const body = prefix ? token.slice(prefix.length) : token
  const start = body.slice(0, 4)
  const end = body.slice(-4)
  return `${prefix}${start}...${end}`.slice(0, 20)
}

export function normalizeIntegrationScopes(value: unknown): IntegrationScope[] {
  if (!Array.isArray(value)) {
    throw new Error("Integration scopes must be an array")
  }

  const trimmedScopes = value.map((scope) => {
    if (typeof scope !== "string" || !scope.trim()) {
      throw new Error("Integration scopes must contain only non-blank strings")
    }
    return scope.trim()
  })

  const scopes = [...new Set(trimmedScopes)]

  if (scopes.length === 0) {
    throw new Error("At least one integration scope is required")
  }

  const invalidScope = scopes.find((scope) => !allowedScopes.has(scope))
  if (invalidScope) {
    throw new Error(`Invalid integration scope: ${invalidScope}`)
  }

  return scopes as IntegrationScope[]
}

export function serializeIntegrationScopes(scopes: unknown): string {
  return JSON.stringify(normalizeIntegrationScopes(scopes))
}

export function parseIntegrationScopesJson(value: unknown): IntegrationScope[] {
  if (typeof value !== "string") {
    throw new Error("Integration scopes JSON must be a string")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error("Integration scopes JSON is malformed")
  }

  return normalizeIntegrationScopes(parsed)
}

export function toIntegrationClientDto(
  record: IntegrationApiClientRecord,
  operations: IntegrationClientOperationSummary = emptyIntegrationOperationSummary()
): IntegrationClientDto {
  return {
    id: record.id,
    clientId: record.clientId,
    displayName: record.displayName,
    tokenPreview: record.tokenPreview,
    scopes: parseIntegrationScopesJson(record.scopesJson),
    enabled: record.enabled,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedBy: record.updatedBy,
    updatedAt: record.updatedAt,
    lastUsedAt: record.lastUsedAt,
    lastUsedIp: record.lastUsedIp,
    lastRotatedAt: record.lastRotatedAt,
    operations,
  }
}

export function toRuntimeIntegrationClient(
  record: Pick<IntegrationApiClientRecord, "clientId" | "displayName" | "tokenHash" | "scopesJson" | "enabled">
): IntegrationClient | null {
  try {
    return {
      clientId: record.clientId,
      name: record.displayName,
      tokenHash: record.tokenHash,
      scopes: parseIntegrationScopesJson(record.scopesJson),
      enabled: record.enabled,
    }
  } catch {
    return null
  }
}

export async function listIntegrationClients(): Promise<IntegrationClientDto[]> {
  const { prisma } = await import("./db.ts")
  const records = await prisma.integrationApiClient.findMany({
    orderBy: [{ createdAt: "desc" }, { clientId: "asc" }],
  })

  if (records.length === 0) return []

  const logs = await prisma.systemLog.findMany({
    where: {
      module: "integration_api",
      recordId: { in: records.map((record) => record.clientId) },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      module: true,
      recordId: true,
      createdAt: true,
      newValue: true,
    },
  })
  const operationSummaries = buildIntegrationClientOperationSummaries(logs)

  return records.map((record) => toIntegrationClientDto(record, operationSummaries[record.clientId]))
}

export async function getIntegrationClientById(id: string): Promise<IntegrationClientDto | null> {
  const { prisma } = await import("./db.ts")
  const record = await prisma.integrationApiClient.findUnique({
    where: { id },
  })

  return record ? toIntegrationClientDto(record) : null
}

export async function createIntegrationClient(
  input: CreateIntegrationClientInput,
  actorId: string
): Promise<{ client: IntegrationClientDto; token: string }> {
  const clientId = normalizeText(input.clientId, "clientId")
  const displayName = normalizeText(input.displayName, "displayName")
  const scopesJson = serializeIntegrationScopes(input.scopes)
  const token = generateIntegrationPlainToken()
  const tokenPreview = buildTokenPreview(token)
  const tokenHash = hashIntegrationToken(token)
  const enabled = input.enabled === undefined ? true : input.enabled !== false

  const { prisma } = await import("./db.ts")
  const record = await prisma.integrationApiClient.create({
    data: {
      clientId,
      displayName,
      tokenHash,
      tokenPreview,
      scopesJson,
      enabled,
      createdBy: actorId,
      updatedBy: actorId,
    },
  })

  return { client: toIntegrationClientDto(record), token }
}

export async function updateIntegrationClient(
  id: string,
  input: UpdateIntegrationClientInput,
  actorId: string
): Promise<IntegrationClientDto> {
  const displayName = normalizeText(input.displayName, "displayName")
  const scopesJson = serializeIntegrationScopes(input.scopes)

  const { prisma } = await import("./db.ts")
  const record = await prisma.integrationApiClient.update({
    where: { id },
    data: {
      displayName,
      scopesJson,
      updatedBy: actorId,
    },
  })

  return toIntegrationClientDto(record)
}

export async function rotateIntegrationClient(
  id: string,
  actorId: string
): Promise<{ client: IntegrationClientDto; token: string }> {
  const token = generateIntegrationPlainToken()
  const tokenPreview = buildTokenPreview(token)
  const tokenHash = hashIntegrationToken(token)

  const { prisma } = await import("./db.ts")
  const record = await prisma.integrationApiClient.update({
    where: { id },
    data: {
      tokenHash,
      tokenPreview,
      updatedBy: actorId,
      lastRotatedAt: new Date(),
    },
  })

  return { client: toIntegrationClientDto(record), token }
}

export async function setIntegrationClientEnabled(
  id: string,
  enabled: boolean,
  actorId: string
): Promise<IntegrationClientDto> {
  const { prisma } = await import("./db.ts")
  const record = await prisma.integrationApiClient.update({
    where: { id },
    data: {
      enabled,
      updatedBy: actorId,
    },
  })

  return toIntegrationClientDto(record)
}

export async function findEnabledIntegrationClientByToken(token: string, request?: Request): Promise<IntegrationClient | null> {
  const tokenHash = hashIntegrationToken(token)
  const { prisma } = await import("./db.ts")
  const record = await prisma.integrationApiClient.findFirst({
    where: { tokenHash, enabled: true },
  })

  if (!record) return null

  const client = toRuntimeIntegrationClient(record)
  if (!client) return null

  void updateClientUsage(record.id, request)

  return client
}

async function updateClientUsage(id: string, request?: Request) {
  try {
    const { prisma } = await import("./db.ts")
    await prisma.integrationApiClient.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        ...(request ? { lastUsedIp: getForwardedFor(request) } : {}),
      },
    })
  } catch {
    // Usage metadata is helpful for administrators, but must not fail authentication.
  }
}

function normalizeText(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`)
  }
  return value.trim()
}

function getForwardedFor(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
}
