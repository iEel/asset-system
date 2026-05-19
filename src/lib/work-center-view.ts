import type { AssetDataQualityFilter } from "./asset-data-quality-filter.ts"

export const workCenterViews = ["all", "mine"] as const
export const workCenterPanels = ["overview", "approvals", "assets", "maintenance", "audit", "disposal"] as const

export type WorkCenterView = (typeof workCenterViews)[number]
export type WorkCenterPanel = (typeof workCenterPanels)[number]

export type WorkCenterParams = {
  view: WorkCenterView
  panel: WorkCenterPanel
}

export type WorkCenterUserScope = {
  enabled: boolean
  employeeId: string | null
  departmentId: string | null
}

type WorkCenterParamInput = {
  view?: string | string[]
  panel?: string | string[]
}

export function parseWorkCenterParams(input: WorkCenterParamInput): WorkCenterParams {
  const rawView = firstValue(input.view)
  const rawPanel = firstValue(input.panel)
  return {
    view: workCenterViews.includes(rawView as WorkCenterView) ? (rawView as WorkCenterView) : "all",
    panel: workCenterPanels.includes(rawPanel as WorkCenterPanel) ? (rawPanel as WorkCenterPanel) : "overview",
  }
}

export function buildWorkCenterHref(
  locale: string,
  current: WorkCenterParams,
  overrides: Partial<WorkCenterParams> = {},
) {
  const next = { ...current, ...overrides }
  const params = new URLSearchParams()
  if (next.view !== "all") params.set("view", next.view)
  if (next.panel !== "overview") params.set("panel", next.panel)
  const query = params.toString()
  return `/${locale}/work-center${query ? `?${query}` : ""}`
}

export function getWorkCenterItemLimit(panel: WorkCenterPanel, activePanel: WorkCenterPanel) {
  return panel === activePanel ? 24 : 6
}

export function buildWorkCenterUserScope(input: {
  employeeId?: string | null
  departmentId?: string | null
}): WorkCenterUserScope {
  const employeeId = input.employeeId?.trim() || null
  const departmentId = input.departmentId?.trim() || null
  return {
    enabled: Boolean(employeeId || departmentId),
    employeeId,
    departmentId,
  }
}

export function buildDataQualityFixGroups(
  locale: string,
  current: WorkCenterParams,
  counts: {
    missingResponsibility: number
    missingSerial: number
    missingPhoto: number
  },
) {
  const definitions: { key: AssetDataQualityFilter; count: number }[] = [
    { key: "responsibility", count: counts.missingResponsibility },
    { key: "serial", count: counts.missingSerial },
    { key: "photo", count: counts.missingPhoto },
  ]

  return definitions
    .filter((group) => group.count > 0)
    .map((group) => ({
      key: group.key,
      count: group.count,
      workCenterHref: buildWorkCenterHref(locale, current, { panel: "assets" }),
      assetsHref: `/${locale}/assets?dataQuality=${group.key}`,
    }))
}

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}
