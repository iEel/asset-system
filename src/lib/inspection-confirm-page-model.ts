// ยืนยันผลตรวจ, the round's confirm page (inspection-confirm plan 3): the rows the page renders, its tabs and its
// selection. Pure and client-safe: no Prisma import (InspectionRow is a type only), so node --test and the client import it.
import type { InspectionRow } from "./inspection-confirm-data.ts"
import {
  INSPECTION_CONFIRM_MAX_ASSETS,
  inspectionConfirmTabs,
  type InspectionConfirmTab,
  type InspectionTargetStatusName,
} from "./inspection-confirm-rules.ts"

/** One row as the server page hands it to the client: plain values only. */
export type InspectionPageRow = {
  assetId: string
  assetTag: string
  assetName: string
  auditStatus: string
  auditResult: string | null
  /** ISO string, so the row crosses the server/client boundary. */
  scannedAt: string | null
  conditionNameTh: string | null
  locationName: string | null
  custodianName: string | null
  tab: InspectionConfirmTab
  targetStatusName: InspectionTargetStatusName | null
  firstPendingFindingId: string | null
}

export function toInspectionPageRow(row: InspectionRow): InspectionPageRow {
  return {
    assetId: row.assetId,
    assetTag: row.assetTag,
    assetName: row.assetName,
    auditStatus: row.auditStatus,
    auditResult: row.auditResult,
    scannedAt: row.scannedAt ? row.scannedAt.toISOString() : null,
    conditionNameTh: row.conditionNameTh,
    locationName: row.locationName,
    custodianName: row.custodianName,
    tab: row.tab,
    targetStatusName: row.targetStatusName,
    firstPendingFindingId: row.pendingFindingIds[0] ?? null,
  }
}

export function inspectionTabCounts(rows: readonly InspectionPageRow[]): Record<InspectionConfirmTab, number> {
  const counts = Object.fromEntries(inspectionConfirmTabs.map((tab) => [tab, 0])) as Record<InspectionConfirmTab, number>
  for (const row of rows) counts[row.tab] += 1
  return counts
}

/** A valid ?tab= wins (even an empty tab); else the first non-empty tab in order; else "ready". */
export function parseInspectionTab(value: string | undefined, counts: Record<InspectionConfirmTab, number>): InspectionConfirmTab {
  if (value !== undefined && (inspectionConfirmTabs as readonly string[]).includes(value)) return value as InspectionConfirmTab
  return inspectionConfirmTabs.find((tab) => counts[tab] > 0) ?? "ready"
}

/** Only ready rows with a known target can be ticked; a null target is an unclear handover. */
export function isInspectionRowSelectable(row: InspectionPageRow): boolean {
  return row.tab === "ready" && row.targetStatusName !== null
}

/** The selectable rows of the list, in order, at most max; capped says more were left out. */
export function selectAllInspectionRows(
  rows: readonly InspectionPageRow[],
  max: number = INSPECTION_CONFIRM_MAX_ASSETS,
): { ids: string[]; capped: boolean } {
  const selectable = rows.filter(isInspectionRowSelectable)
  return { ids: selectable.slice(0, max).map((row) => row.assetId), capped: selectable.length > max }
}

/** The confirm dialog's lines: how many selected rows go to each status. */
export function inspectionSelectionSummary(
  rows: readonly InspectionPageRow[],
  selected: ReadonlySet<string>,
): Partial<Record<InspectionTargetStatusName, number>> {
  const summary: Partial<Record<InspectionTargetStatusName, number>> = {}
  for (const row of rows) {
    if (!selected.has(row.assetId) || row.targetStatusName === null) continue
    summary[row.targetStatusName] = (summary[row.targetStatusName] ?? 0) + 1
  }
  return summary
}

export type InspectionBlockedCode = "notInRound" | "notUnderInspection" | "notScanned" | "awaitingReview" | "wrongTab" | "handoverUnclear"

/** The route's 409 refusal codes → keys in the inspectionConfirmPage namespace. */
export const inspectionBlockedMessageKeys: Readonly<Record<InspectionBlockedCode, string>> = Object.freeze({
  notInRound: "blocked_notInRound",
  notUnderInspection: "blocked_notUnderInspection",
  notScanned: "blocked_notScanned",
  awaitingReview: "blocked_awaitingReview",
  wrongTab: "blocked_wrongTab",
  handoverUnclear: "blocked_handoverUnclear",
})
