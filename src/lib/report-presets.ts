export const reportPresetStorageKey = "asset-system:report-presets:v1"

export type ReportPreset = {
  id: string
  name: string
  query: string
  createdAt: string
}

type ReportPresetInput = Partial<ReportPreset> & Pick<ReportPreset, "name" | "query">

export function normalizeReportPresetQuery(query: string) {
  return query.trim().replace(/^\?+/, "")
}

export function buildReportPreset(input: ReportPresetInput): ReportPreset | null {
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 60)
  const query = normalizeReportPresetQuery(input.query)

  if (!name) return null

  return {
    id: input.id ?? `preset-${Date.now()}`,
    name,
    query,
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
}

export function buildReportPresetHref(locale: string, query: string) {
  const normalizedQuery = normalizeReportPresetQuery(query)
  return `/${locale}/reports${normalizedQuery ? `?${normalizedQuery}` : ""}`
}
