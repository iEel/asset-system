import type { AssetDataQualityFilter } from "./asset-data-quality-filter.ts"
import { parseWorkShow, WORK_SHOW_STEP } from "./work-center-rows.ts"

export const workCenterViews = ["all", "mine"] as const
export const workCenterPanels = ["overview", "approvals", "assets", "maintenance", "audit", "disposal"] as const

export type WorkCenterView = (typeof workCenterViews)[number]
export type WorkCenterPanel = (typeof workCenterPanels)[number]

export type WorkCenterParams = {
  view: WorkCenterView
  panel: WorkCenterPanel
  /** The table's rows on screen (`show=`): a multiple of 8 from 8 to 200. */
  show: number
}

export type WorkCenterUserScope = {
  enabled: boolean
  employeeId: string | null
  departmentId: string | null
}

type WorkCenterDataQualityFixKey = Extract<AssetDataQualityFilter, "responsibility" | "serial" | "photo">

export type WorkCenterParamInput = {
  view?: string | string[]
  panel?: string | string[]
  show?: string | string[]
}

export function parseWorkCenterParams(input: WorkCenterParamInput): WorkCenterParams {
  const rawView = firstValue(input.view)
  const rawPanel = firstValue(input.panel)
  return {
    view: workCenterViews.includes(rawView as WorkCenterView) ? (rawView as WorkCenterView) : "all",
    panel: workCenterPanels.includes(rawPanel as WorkCenterPanel) ? (rawPanel as WorkCenterPanel) : "overview",
    show: parseWorkShow(input.show),
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
  if (next.show !== WORK_SHOW_STEP) params.set("show", String(next.show))
  const query = params.toString()
  return `/${locale}/work-center${query ? `?${query}` : ""}`
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
  const definitions: { key: WorkCenterDataQualityFixKey; count: number }[] = [
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
