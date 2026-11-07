import type { AuditLogParams } from "./audit-log-writer.ts"
import { normalizeAssetCrossScopeFilter } from "./asset-cross-scope-filter.ts"
import { resolveAuditFindingStatus } from "./audit-finding-filters.ts"

// Group 10 spec §6.1: "ส่งออกล่าสุด" on the report catalog, with no migration. Each export route writes one SystemLog
// entry (module report, action export, recordId the report key, the user) when it serves a file; the catalog reads the
// latest entry per key (any user). The database and the audit writer load on first use, so node --test imports this.

export const REPORT_EXPORT_KEYS = [
  "assets-overview",
  "assets-register",
  "cross-scope",
  "maintenance",
  "disposal",
  "audit-findings",
  "audit-findings-pending",
  "audit-findings-pdf",
  "role-audit",
] as const

export type ReportExportKey = (typeof REPORT_EXPORT_KEYS)[number]

export type ReportExportRoute =
  | "assets-overview"
  | "assets"
  | "maintenance"
  | "disposal"
  | "audit-findings"
  | "audit-findings-pdf"
  | "role-audit"

// The key comes from the route and its parameters, so an export from any page counts (it is the same file). The
// register's crossScope and the findings' status are read the way the routes read them: an unknown crossScope filters
// nothing (the register), and a missing or unknown status serves the pending file.
export function reportExportKeyFor(route: ReportExportRoute, params: URLSearchParams): ReportExportKey {
  switch (route) {
    case "assets":
      return normalizeAssetCrossScopeFilter(params.get("crossScope")) ? "cross-scope" : "assets-register"
    case "audit-findings":
      return resolveAuditFindingStatus(params.get("status")?.trim()) === "pending" ? "audit-findings-pending" : "audit-findings"
    default:
      return route
  }
}

type AuditLogWrite = (params: AuditLogParams) => Promise<unknown>

async function writeThroughAuditLog(params: AuditLogParams) {
  const audit = await import("./audit-log.ts")
  return audit.logAudit(params)
}

// Called after the file is built, right before the file response. Logging never blocks the file: a failed write is
// only reported to the server console.
export async function logReportExport(userId: string, key: ReportExportKey, write: AuditLogWrite = writeThroughAuditLog): Promise<void> {
  try {
    await write({ userId, module: "report", action: "export", recordId: key })
  } catch (error) {
    console.error("Failed to log report export:", error)
  }
}

export type ReportExportReader = { systemLog: { groupBy(args: object): PromiseLike<unknown[]> } }

async function getPrisma(): Promise<ReportExportReader> {
  const { prisma } = await import("./db.ts")
  return prisma as unknown as ReportExportReader
}

const reportExportKeySet = new Set<string>(REPORT_EXPORT_KEYS)

// The latest export time per report key; a key never exported (or exported before this change) is left out.
export async function readLastReportExports(db?: ReportExportReader): Promise<Partial<Record<ReportExportKey, Date>>> {
  const reader = db ?? (await getPrisma())
  const rows = (await reader.systemLog.groupBy({
    by: ["recordId"],
    where: { module: "report", action: "export", recordId: { in: [...REPORT_EXPORT_KEYS] } },
    _max: { createdAt: true },
  })) as { recordId: string | null; _max: { createdAt: Date | null } }[]
  const result: Partial<Record<ReportExportKey, Date>> = {}
  for (const row of rows) {
    const at = row._max.createdAt
    if (!row.recordId || !at || !reportExportKeySet.has(row.recordId)) continue
    const key = row.recordId as ReportExportKey
    const existing = result[key]
    if (!existing || existing < at) result[key] = at
  }
  return result
}
