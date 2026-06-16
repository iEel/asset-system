type IntegrationLogValue = {
  route?: unknown
  status?: unknown
  requestId?: unknown
}

export type IntegrationOperationLog = {
  module?: string | null
  recordId: string | null
  createdAt: Date | string
  newValue: unknown
}

export type IntegrationEndpointSummary = {
  route: string
  count: number
}

export type IntegrationLatestError = {
  route: string
  status: number
  requestId: string | null
  at: string
}

export type IntegrationClientOperationSummary = {
  requestCount24h: number
  requestCount7d: number
  requestCountTotal: number
  errorCount7d: number
  topEndpoint: IntegrationEndpointSummary | null
  latestError: IntegrationLatestError | null
}

export type IntegrationPowerShellExample = {
  key: string
  label: string
  uri: string
  command: string
}

export type IntegrationPowerShellClient = {
  clientId: string
  scopes: string[]
}

const oneHourMs = 60 * 60 * 1000
const oneDayMs = 24 * oneHourMs

export function emptyIntegrationOperationSummary(): IntegrationClientOperationSummary {
  return {
    requestCount24h: 0,
    requestCount7d: 0,
    requestCountTotal: 0,
    errorCount7d: 0,
    topEndpoint: null,
    latestError: null,
  }
}

export function buildIntegrationClientOperationSummaries(
  logs: IntegrationOperationLog[],
  options: { now?: Date } = {}
): Record<string, IntegrationClientOperationSummary> {
  const now = options.now ?? new Date()
  const nowMs = now.getTime()
  const summaries: Record<string, IntegrationClientOperationSummary> = {}
  const endpointCountsByClient = new Map<string, Map<string, number>>()

  for (const log of logs) {
    if (log.module && log.module !== "integration_api") continue
    const clientId = log.recordId?.trim()
    if (!clientId) continue

    const createdAt = normalizeDate(log.createdAt)
    const value = parseAuditValue(log.newValue)
    const route = normalizeString(value?.route)
    const status = normalizeStatus(value?.status)
    if (!createdAt || !route || status === null) continue

    const summary = summaries[clientId] ?? emptyIntegrationOperationSummary()
    summaries[clientId] = summary
    summary.requestCountTotal += 1

    const ageMs = nowMs - createdAt.getTime()
    const within24h = ageMs >= 0 && ageMs <= oneDayMs
    const within7d = ageMs >= 0 && ageMs <= 7 * oneDayMs

    if (within24h) summary.requestCount24h += 1
    if (!within7d) continue

    summary.requestCount7d += 1
    const endpointCounts = endpointCountsByClient.get(clientId) ?? new Map<string, number>()
    endpointCountsByClient.set(clientId, endpointCounts)
    endpointCounts.set(route, (endpointCounts.get(route) ?? 0) + 1)

    if (status >= 400) {
      summary.errorCount7d += 1
      const latestError = {
        route,
        status,
        requestId: normalizeString(value?.requestId) ?? null,
        at: createdAt.toISOString(),
      }
      if (!summary.latestError || new Date(summary.latestError.at).getTime() < createdAt.getTime()) {
        summary.latestError = latestError
      }
    }
  }

  for (const [clientId, endpointCounts] of endpointCountsByClient) {
    summaries[clientId].topEndpoint = [...endpointCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([route, count]) => ({ route, count }))[0] ?? null
  }

  return summaries
}

export function buildIntegrationPowerShellExamples(
  client: IntegrationPowerShellClient,
  baseUrl: string
): IntegrationPowerShellExample[] {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "")
  const examples: Array<{ key: string; label: string; path: string }> = [
    {
      key: "health",
      label: "Health check",
      path: "/api/integrations/v1/health",
    },
  ]

  if (hasScope(client.scopes, "asset:read")) {
    examples.push({
      key: "assetsByEmployee",
      label: "Assets by employee code",
      path: "/api/integrations/v1/assets?employeeCode=8171&limit=100",
    })
  }

  if (hasScope(client.scopes, "reference:read")) {
    examples.push(
      {
        key: "referenceStatuses",
        label: "Reference statuses",
        path: "/api/integrations/v1/reference/statuses",
      },
      {
        key: "referenceCompanies",
        label: "Reference companies",
        path: "/api/integrations/v1/reference/companies",
      }
    )
  }

  if (hasScope(client.scopes, "integration:read")) {
    examples.push({
      key: "openApi",
      label: "OpenAPI metadata",
      path: "/api/integrations/v1/openapi",
    })
  }

  return examples.map((example) => {
    const uri = `${normalizedBaseUrl}${example.path}`
    return {
      key: example.key,
      label: example.label,
      uri,
      command: buildPowerShellCommand(client.clientId, uri),
    }
  })
}

function parseAuditValue(value: unknown): IntegrationLogValue | null {
  if (!value) return null
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      return parsed && typeof parsed === "object" ? (parsed as IntegrationLogValue) : null
    } catch {
      return null
    }
  }
  return typeof value === "object" ? (value as IntegrationLogValue) : null
}

function normalizeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeStatus(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function hasScope(scopes: string[], requiredScope: string) {
  if (scopes.includes("*")) return true
  if (scopes.includes(requiredScope)) return true
  const [moduleName] = requiredScope.split(":")
  return scopes.includes(`${moduleName}:*`)
}

function buildPowerShellCommand(clientId: string, uri: string) {
  return [
    `$token = "<paste token for ${clientId}>"`,
    `Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "${uri}"`,
  ].join("\n")
}
