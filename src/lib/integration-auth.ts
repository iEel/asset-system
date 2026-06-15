import { createHash, randomUUID, timingSafeEqual } from "node:crypto"

export type IntegrationScope =
  | "asset:read"
  | "reference:read"
  | "integration:read"
  | "*"
  | `${string}:${string}`

export type IntegrationClient = {
  clientId: string
  name: string
  tokenHash: string
  scopes: IntegrationScope[]
  enabled: boolean
}

export type IntegrationAuthContext = {
  client: IntegrationClient
  requestId: string
}

type IntegrationAuditPrimitive = string | number | boolean

export type IntegrationApiAuditValueParams = {
  clientId: string
  route: string
  method: string
  status: number
  requestId: string
  query?: Record<string, unknown>
  target?: Record<string, unknown>
  response?: Record<string, unknown>
}

export class IntegrationApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "IntegrationApiError"
    this.status = status
    this.code = code
  }
}

export function hashIntegrationToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function parseIntegrationClients(raw = process.env.INTEGRATION_API_CLIENTS): IntegrationClient[] {
  if (!raw?.trim()) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item) => normalizeIntegrationClient(item))
    .filter((client): client is IntegrationClient => client !== null && client.enabled)
}

export async function requireIntegrationClient(
  request: Request,
  clients?: IntegrationClient[]
): Promise<IntegrationAuthContext> {
  return authenticateIntegrationRequest(request, undefined, clients)
}

export async function requireIntegrationScope(
  request: Request,
  requiredScope: IntegrationScope,
  clients?: IntegrationClient[]
): Promise<IntegrationAuthContext> {
  return authenticateIntegrationRequest(request, requiredScope, clients)
}

export async function authenticateIntegrationRequest(
  request: Request,
  requiredScope?: IntegrationScope,
  clients?: IntegrationClient[]
): Promise<IntegrationAuthContext> {
  const requestId = getRequestId(request)
  const token = extractBearerToken(request.headers)
  if (!token) {
    throw new IntegrationApiError(401, "INTEGRATION_UNAUTHORIZED", "Missing integration bearer token")
  }

  const client = clients
    ? findIntegrationClientByToken(token, clients.filter((candidate) => candidate.enabled))
    : await findDbIntegrationClientByToken(token, request)
  if (!client) {
    throw new IntegrationApiError(401, "INTEGRATION_UNAUTHORIZED", "Invalid integration bearer token")
  }

  if (requiredScope && !hasIntegrationScope(client, requiredScope)) {
    throw new IntegrationApiError(403, "INTEGRATION_FORBIDDEN", `Integration client lacks ${requiredScope} scope`)
  }

  return { client, requestId }
}

export function integrationErrorResponse(error: unknown, requestId?: string) {
  const apiError =
    error instanceof IntegrationApiError
      ? error
      : new IntegrationApiError(500, "INTEGRATION_ERROR", error instanceof Error ? error.message : "Unexpected integration API error")

  return Response.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId,
      },
    },
    { status: apiError.status }
  )
}

export async function logIntegrationApiAccess(params: {
  request: Request
  context: IntegrationAuthContext
  action: string
  route: string
  status: number
  query?: Record<string, unknown>
  target?: Record<string, unknown>
  response?: Record<string, unknown>
  resultCount?: number
}) {
  const { logAudit } = await import("./audit-log.ts")
  const response = { ...(params.response ?? {}) }
  if (params.resultCount !== undefined) response.resultCount = params.resultCount

  await logAudit({
    action: params.action,
    module: "integration_api",
    recordId: params.context.client.clientId,
    newValue: buildIntegrationApiAuditValue({
      clientId: params.context.client.clientId,
      route: params.route,
      method: params.request.method,
      status: params.status,
      requestId: params.context.requestId,
      query: params.query,
      target: params.target,
      response,
    }),
    ipAddress: getForwardedFor(params.request),
    userAgent: params.request.headers.get("user-agent") ?? undefined,
    remark: "read-only integration api",
  })
}

export function buildIntegrationApiAuditValue(params: IntegrationApiAuditValueParams): Record<string, IntegrationAuditPrimitive> {
  const auditValue: Record<string, IntegrationAuditPrimitive> = {
    clientId: params.clientId,
    operation: "read",
    route: params.route,
    method: params.method,
    status: params.status,
    requestId: params.requestId,
  }

  appendAuditValues(auditValue, "target", params.target)
  appendAuditValues(auditValue, "query", params.query)
  appendAuditValues(auditValue, "response", params.response)

  return auditValue
}

function normalizeIntegrationClient(item: unknown): IntegrationClient | null {
  if (!item || typeof item !== "object") return null
  const record = item as Record<string, unknown>
  const clientId = typeof record.clientId === "string" ? record.clientId.trim() : ""
  const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : clientId
  const tokenHash = normalizeTokenHash(record.tokenHash)
  const scopes = normalizeScopes(record.scopes)
  if (!clientId || !tokenHash || scopes.length === 0) return null

  return {
    clientId,
    name,
    tokenHash,
    scopes,
    enabled: record.enabled !== false,
  }
}

function normalizeTokenHash(value: unknown) {
  if (typeof value !== "string") return ""
  const tokenHash = value.trim().replace(/^sha256:/i, "")
  return /^[a-f0-9]{64}$/i.test(tokenHash) ? tokenHash.toLowerCase() : ""
}

function normalizeScopes(value: unknown): IntegrationScope[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((scope): scope is IntegrationScope => typeof scope === "string" && scope.trim().length > 0))]
}

function extractBearerToken(headers: Headers) {
  const header = headers.get("authorization") ?? ""
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ""
}

function findIntegrationClientByToken(token: string, clients: IntegrationClient[]) {
  const tokenHash = hashIntegrationToken(token)
  return clients.find((client) => safeHashEquals(tokenHash, client.tokenHash)) ?? null
}

async function findDbIntegrationClientByToken(token: string, request: Request) {
  const { findEnabledIntegrationClientByToken } = await import("./integration-client-store.ts")
  return findEnabledIntegrationClientByToken(token, request)
}

function safeHashEquals(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false
  const leftBuffer = Buffer.from(left, "hex")
  const rightBuffer = Buffer.from(right, "hex")
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function hasIntegrationScope(client: IntegrationClient, requiredScope: IntegrationScope) {
  if (client.scopes.includes("*")) return true
  if (client.scopes.includes(requiredScope)) return true
  const [moduleName] = requiredScope.split(":")
  return client.scopes.includes(`${moduleName}:*`)
}

function getRequestId(request: Request) {
  return request.headers.get("x-request-id")?.trim() || randomUUID()
}

function getForwardedFor(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
}

function appendAuditValues(
  auditValue: Record<string, IntegrationAuditPrimitive>,
  prefix: string,
  values?: Record<string, unknown>
) {
  if (!values) return
  for (const [key, value] of Object.entries(values)) {
    const normalized = normalizeAuditValue(value)
    if (normalized === null) continue
    auditValue[`${prefix}.${key}`] = normalized
  }
}

function normalizeAuditValue(value: unknown): IntegrationAuditPrimitive | null {
  if (value === null || value === undefined || value === "") return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "boolean") return value
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") return value.length > 200 ? `${value.slice(0, 197)}...` : value
  return null
}
