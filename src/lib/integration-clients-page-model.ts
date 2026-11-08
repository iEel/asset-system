import type { IntegrationClientDto } from "./integration-client-store.ts"

// Pure page model for the Integration API admin page (page group 12 spec §10).

export type IntegrationStatusFilter = "all" | "active" | "disabled"

export function integrationSummary(clients: readonly IntegrationClientDto[]): {
  active: number
  disabled: number
  usedEver: number
  calls7d: number
  errors7d: number
} {
  const summary = { active: 0, disabled: 0, usedEver: 0, calls7d: 0, errors7d: 0 }
  for (const client of clients) {
    if (client.enabled) summary.active += 1
    else summary.disabled += 1
    if (client.lastUsedAt) summary.usedEver += 1
    summary.calls7d += client.operations?.requestCount7d ?? 0
    summary.errors7d += client.operations?.errorCount7d ?? 0
  }
  return summary
}

export function filterClients(
  clients: readonly IntegrationClientDto[],
  filter: IntegrationStatusFilter
): IntegrationClientDto[] {
  if (filter === "active") return clients.filter((client) => client.enabled)
  if (filter === "disabled") return clients.filter((client) => !client.enabled)
  return [...clients]
}

export function statusCounts(clients: readonly IntegrationClientDto[]): Record<IntegrationStatusFilter, number> {
  const active = clients.filter((client) => client.enabled).length
  return { all: clients.length, active, disabled: clients.length - active }
}

export function creatorLabel(
  client: Pick<IntegrationClientDto, "createdByName">
): { kind: "name"; name: string } | { kind: "unknown" } {
  const name = client.createdByName?.trim()
  return name ? { kind: "name", name } : { kind: "unknown" }
}

export function clientUsage(client: IntegrationClientDto): {
  lastUsedAt: Date | string | null
  calls7d: number
  errors7d: number
  hasErrors: boolean
  neverUsed: boolean
} {
  const lastUsedAt = (client.lastUsedAt as Date | string | null) ?? null
  const calls7d = client.operations?.requestCount7d ?? 0
  const errors7d = client.operations?.errorCount7d ?? 0
  return { lastUsedAt, calls7d, errors7d, hasErrors: errors7d > 0, neverUsed: !lastUsedAt }
}
