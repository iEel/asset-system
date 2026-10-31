// The RT- document's extra lines (group 3 spec §8.5, §8.6, §8.7; P2-R5). It lists the components the return left out
// (the after snapshot's outstanding entries), each followed by its late returns, and the repair record the return
// opened or joined. Pure: relative imports, so `node --test` loads it. The RT- page reads the rows.
import { COMPONENT_LINK_OUTSTANDING } from "./asset-component-outstanding.ts"
import { buildAssetMovementDocumentHref } from "./asset-movement-labels.ts"
import type { AssetComponentTransactionSnapshotV1, AssetTransactionSnapshotV1 } from "./asset-transaction-snapshot.ts"
import { formatCheckoutDay } from "./checkout-phone-steps.ts"

export type CheckinDocumentLateReturnRow = { assetId: string; toValue: string | null }
export type CheckinDocumentComponentLine =
  | { kind: "missing"; componentAssetId: string; component: string; holder: string | null; location: string }
  | { kind: "returned"; componentAssetId: string; tag: string; day: string; receivedBy: string }
export type CheckinDocumentRepairLine = { key: "documentRepairOpened" | "documentRepairJoined"; repairNo: string; href: string | null }
export type CheckinDocumentLines = { components: CheckinDocumentComponentLine[]; repair: CheckinDocumentRepairLine | null }

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000

// A snapshot entry is not a link row (it has relationshipStatus, no status or removedAt), so it is compared with the
// constant rather than through isOutstandingLink.
function outstandingEntries(afterSnapshot: AssetTransactionSnapshotV1 | null): AssetComponentTransactionSnapshotV1[] {
  if (!afterSnapshot) return []
  return afterSnapshot.components.filter((entry) => entry.relationshipStatus === COMPONENT_LINK_OUTSTANDING)
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

export function checkinDocumentReadIds(
  afterSnapshot: AssetTransactionSnapshotV1 | null,
  lateReturns: readonly CheckinDocumentLateReturnRow[],
): { componentIds: string[]; labelIds: string[] } {
  const entries = outstandingEntries(afterSnapshot)
  return {
    componentIds: unique([...entries.map((entry) => entry.componentAssetId), ...lateReturns.map((row) => row.assetId)]),
    labelIds: unique(entries.flatMap((entry) => (entry.custodianId === null ? [entry.currentLocationId] : [entry.custodianId, entry.currentLocationId]))),
  }
}

// A late return's toValue (P2-R2): { receivedByName, returnDate, outcome }. Anything else reads as null.
function readLateReturn(toValue: string | null, locale: string): { day: string; receivedBy: string } | null {
  if (toValue === null) return null
  let value: unknown
  try {
    value = JSON.parse(toValue)
  } catch {
    return null
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null
  const { receivedByName, returnDate } = value as Record<string, unknown>
  if (typeof receivedByName !== "string" || receivedByName.length === 0 || typeof returnDate !== "string") return null
  const dayKey = bangkokDayKey(returnDate)
  if (dayKey === null) return null
  const day = formatCheckoutDay(dayKey, locale)
  return day ? { day, receivedBy: receivedByName } : null
}

// "YYYY-MM-DD" is the day itself; any other value is a time, read as its Bangkok day.
function bangkokDayKey(returnDate: string): string | null {
  if (DAY_KEY.test(returnDate)) return returnDate
  const time = Date.parse(returnDate)
  if (!Number.isFinite(time)) return null
  return new Date(time + BANGKOK_OFFSET_MS).toISOString().slice(0, 10)
}

export function buildCheckinDocumentLines(input: {
  afterSnapshot: AssetTransactionSnapshotV1 | null
  lateReturns: readonly CheckinDocumentLateReturnRow[]
  components: ReadonlyMap<string, { assetTag: string; name: string }>
  labels: ReadonlyMap<string, string>
  locale: string
  canViewRepair: boolean
}): CheckinDocumentLines {
  const entries = outstandingEntries(input.afterSnapshot)
  const lateLines = input.lateReturns.flatMap((row): Array<Extract<CheckinDocumentComponentLine, { kind: "returned" }>> => {
    const late = readLateReturn(row.toValue, input.locale)
    if (!late) return []
    const tag = input.components.get(row.assetId)?.assetTag ?? row.assetId
    return [{ kind: "returned", componentAssetId: row.assetId, tag, day: late.day, receivedBy: late.receivedBy }]
  })

  const listed = new Set(entries.map((entry) => entry.componentAssetId))
  const components: CheckinDocumentComponentLine[] = []
  for (const entry of entries) {
    const component = input.components.get(entry.componentAssetId)
    components.push({
      kind: "missing",
      componentAssetId: entry.componentAssetId,
      component: component ? `${component.assetTag} - ${component.name}` : entry.componentAssetId,
      holder: entry.custodianId === null ? null : (input.labels.get(entry.custodianId) ?? entry.custodianId),
      location: input.labels.get(entry.currentLocationId) ?? entry.currentLocationId,
    })
    components.push(...lateLines.filter((line) => line.componentAssetId === entry.componentAssetId))
  }
  components.push(...lateLines.filter((line) => !listed.has(line.componentAssetId)))

  const repair = input.afterSnapshot?.repair
  return {
    components,
    repair: repair
      ? {
          key: repair.joined ? "documentRepairJoined" : "documentRepairOpened",
          repairNo: repair.repairNo,
          href: input.canViewRepair ? buildAssetMovementDocumentHref(input.locale, { kind: "repair", id: repair.id, code: repair.repairNo }) : null,
        }
      : null,
  }
}
