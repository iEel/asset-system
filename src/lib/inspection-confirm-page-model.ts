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

/**
 * Ready rows with a known target can be ticked (a null target is an unclear handover); every not-found row can, since its
 * target is Missing whatever the handover (plan 4 task 3).
 */
export function isInspectionRowSelectable(row: InspectionPageRow): boolean {
  if (row.tab === "notFound") return true
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
    // A not-found row becomes Missing (its targetStatusName is the confirm target).
    const target = row.tab === "notFound" ? "Missing" : row.targetStatusName
    if (!selected.has(row.assetId) || target === null) continue
    summary[target] = (summary[target] ?? 0) + 1
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

// Plan 4 task 3: where the confirm page goes on from the damaged and not-found tabs. returnTo is the confirm page on the
// tab the link was on.

/** บันทึกซ่อม after a damaged confirm: the repair form for the asset, back to the confirm page. */
export function damagedRepairHref(locale: string, assetId: string, returnTo: string): string {
  return `/${locale}/maintenance/new?assetId=${encodeURIComponent(assetId)}&returnTo=${encodeURIComponent(returnTo)}`
}

/** ขอตัดจำหน่าย after a damaged confirm: the single request form from this round, the method left to choose. */
export function damagedDisposalHref(locale: string, roundId: string, assetId: string, returnTo: string): string {
  return `/${locale}/disposal/new?assetId=${encodeURIComponent(assetId)}&sourceType=audit_round&sourceId=${encodeURIComponent(roundId)}&returnTo=${encodeURIComponent(returnTo)}`
}

/**
 * ขอตัดจำหน่ายแบบสูญหาย for the round's หาไม่พบ assets with no open request: none is null; one is the single form with the
 * method สูญหาย; two or more (DISPOSAL_BATCH_MIN_ASSETS) is the batch form, which reads the round's assets itself.
 */
export function lostDisposalHref(locale: string, roundId: string, missing: readonly { assetId: string }[], returnTo: string): string | null {
  if (missing.length === 0) return null
  const back = encodeURIComponent(returnTo)
  const round = encodeURIComponent(roundId)
  if (missing.length === 1) {
    return `/${locale}/disposal/new?assetId=${encodeURIComponent(missing[0].assetId)}&sourceType=audit_round&sourceId=${round}&type=lost&returnTo=${back}`
  }
  return `/${locale}/disposal/batch/new?type=lost&fromAuditRound=${round}&returnTo=${back}`
}

// Plan 4 task 4b (user decision 2026-11-09 option A): disposal-readiness.ts refuses a disposal request for an asset with
// an item in an open round, so the confirm page offers disposal only once the round is closed. Repair and the status
// confirmation work while it is open.

/** Disposal from this round's page: only a closed round. */
export function roundAllowsDisposal(roundStatus: string): boolean {
  return roundStatus === "closed"
}

export type InspectionDamagedButton = "repair" | "confirmOnly" | "dispose"

/**
 * The damaged row's buttons, in order: บันทึกซ่อม with maintenance:create; ขอตัดจำหน่าย on a closed round with
 * disposal:create; otherwise ยืนยันผลอย่างเดียว, so the row can always be confirmed.
 */
export function inspectionDamagedButtons(input: { roundClosed: boolean; canRepair: boolean; canDispose: boolean }): InspectionDamagedButton[] {
  const buttons: InspectionDamagedButton[] = []
  if (input.canRepair) buttons.push("repair")
  buttons.push(input.roundClosed && input.canDispose ? "dispose" : "confirmOnly")
  return buttons
}
