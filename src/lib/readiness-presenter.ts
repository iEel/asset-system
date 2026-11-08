import type { ProductionReadinessCheck, ProductionReadinessCheckKey, ProductionReadinessStatus } from "./production-readiness.ts"

// Group 12 plan 1 Task 3 (spec §6, board AD-Readiness): the readiness page's four groups, its status filter and the
// "ขั้นถัดไป" list. Pure, no I/O.
export type ReadinessGroupKey = "access" | "backupJobs" | "workflowData" | "filesApp"

export const READINESS_GROUPS: readonly { key: ReadinessGroupKey; checks: readonly ProductionReadinessCheckKey[] }[] = [
  { key: "access", checks: ["adminCoverage", "authSecret", "appBaseUrl", "databaseConfig"] },
  { key: "backupJobs", checks: ["backupStatus", "backupRestoreDrill", "schedulerTokens", "schedulerRuns", "retentionPolicy"] },
  { key: "workflowData", checks: ["publicQrBaseUrl", "workflowApprovers", "notificationRules", "masterData"] },
  { key: "filesApp", checks: ["uploadDir", "uploadScanner", "pwaAssets"] },
]

export type ReadinessFilter = "all" | ProductionReadinessStatus
export type ReadinessCounts = Record<ProductionReadinessStatus, number>
export type ReadinessGroup = { key: ReadinessGroupKey; counts: ReadinessCounts; checks: ProductionReadinessCheck[] }

const filters: readonly ReadinessFilter[] = ["all", "fail", "warning", "pass"]
const statusRank: Record<ProductionReadinessStatus, number> = { fail: 0, warning: 1, pass: 2 }

// ?filter= from the URL: the first value when repeated, anything unknown is "all".
export function parseReadinessFilter(value: string | string[] | undefined): ReadinessFilter {
  const raw = Array.isArray(value) ? value[0] : value
  return filters.find((filter) => filter === raw) ?? "all"
}

export function countReadiness(checks: readonly ProductionReadinessCheck[]): ReadinessCounts {
  return {
    fail: checks.filter((check) => check.status === "fail").length,
    warning: checks.filter((check) => check.status === "warning").length,
    pass: checks.filter((check) => check.status === "pass").length,
  }
}

// Each group sorts fail → warning → pass and keeps the group's order inside a status. The counts are the group's own,
// whatever the filter; under a filter a group with no matching check is dropped.
export function groupReadiness(checks: readonly ProductionReadinessCheck[], filter: ReadinessFilter): ReadinessGroup[] {
  return READINESS_GROUPS.flatMap((group) => {
    const own = group.checks
      .map((key) => checks.find((check) => check.key === key))
      .filter((check): check is ProductionReadinessCheck => Boolean(check))
    const shown = own
      .map((check, index) => ({ check, index }))
      .filter(({ check }) => filter === "all" || check.status === filter)
      .sort((a, b) => statusRank[a.check.status] - statusRank[b.check.status] || a.index - b.index)
      .map(({ check }) => check)
    if (filter !== "all" && shown.length === 0) return []
    return [{ key: group.key, counts: countReadiness(own), checks: shown }]
  })
}

// The "ขั้นถัดไป" card lists the ต้องแก้ items only, in group order.
export function nextSteps(checks: readonly ProductionReadinessCheck[]): ProductionReadinessCheck[] {
  return groupReadiness(checks, "fail").flatMap((group) => group.checks)
}
