// The asset page's history tab (group 1 spec §7.6): the rows the server builds and the rules the client panel filters,
// counts, groups and pages them with. Client-safe and imported by node --test: relative imports only, no database.
import {
  ASSET_HISTORY_CATEGORIES,
  type AssetHistoryCategory,
  type AssetHistoryCounts,
  type AssetHistoryEvent,
} from "./asset-history-rules.ts"
import { ASSET_MOVEMENT_DOCUMENT_PERMISSION, type AssetMovementDocumentKind } from "./asset-movement-labels.ts"
import { getBangkokDateKey } from "./preventive-maintenance.ts"
import { formatAssetDetailDate } from "./asset-detail-frame-rules.ts"

/** "แสดงเพิ่ม" shows this many more rows at a time. */
export const ASSET_HISTORY_PAGE_SIZE = 50

export type AssetHistoryPeriod = "all" | "year"

export type AssetHistoryRow = {
  id: string
  category: AssetHistoryCategory
  label: string
  atIso: string
  when: string
  monthKey: string
  monthLabel: string
  recent: boolean
  detail: string | null
  actor: string | null
  document: { code: string; href: string } | null
}

const historyCategories: ReadonlySet<string> = new Set(ASSET_HISTORY_CATEGORIES)

/** ?type= chooses a chip only when it names a known category (R17). */
export function parseAssetHistoryType(raw: string | string[] | undefined): AssetHistoryCategory | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && historyCategories.has(value) ? (value as AssetHistoryCategory) : null
}

/** Which documents a person may open: each document page's own permission, the dashboard's rule (R12). */
export function assetDocumentAccess(can: (module: string, action: "view") => boolean): Record<AssetMovementDocumentKind, boolean> {
  const entries = Object.entries(ASSET_MOVEMENT_DOCUMENT_PERMISSION) as [AssetMovementDocumentKind, { module: string }][]
  return Object.fromEntries(entries.map(([kind, permission]) => [kind, can(permission.module, "view")])) as Record<AssetMovementDocumentKind, boolean>
}

/** The start of "12 เดือนล่าสุด": midnight in Bangkok on the same Bangkok date a year back (29 Feb counts from 28 Feb). */
export function assetHistoryPeriodStart(now: Date): Date {
  const [year, month, day] = getBangkokDateKey(now).split("-").map(Number)
  const lastYear = year - 1
  const isLeap = (lastYear % 4 === 0 && lastYear % 100 !== 0) || lastYear % 400 === 0
  const startDay = month === 2 && day === 29 && !isLeap ? 28 : day
  const date = `${lastYear}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`
  return new Date(`${date}T00:00:00.000+07:00`)
}

const historyTimeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })

/** "17:05": the Bangkok time, 24-hour, the same digits in both languages (the date beside it is formatAssetDetailDate, R37). */
export function formatHistoryTime(at: Date): string {
  return historyTimeFormat.format(at)
}

/** "ตุลาคม 2569": the month group's heading, in Bangkok, with the Buddhist year in Thai. */
export function formatHistoryMonth(at: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: "Asia/Bangkok",
    month: "long",
    year: "numeric",
  }).format(at)
}

/** One row per event, in the events' order. A document shows only to a person who may open its page (R12). */
export function buildAssetHistoryRows(
  events: readonly AssetHistoryEvent[],
  options: { locale: string; now: Date; access: Record<AssetMovementDocumentKind, boolean>; label: (key: string) => string },
): AssetHistoryRow[] {
  const periodStart = assetHistoryPeriodStart(options.now)
  return events.map((event) => ({
    id: event.id,
    category: event.category,
    label: options.label(event.labelKey),
    atIso: event.at.toISOString(),
    when: `${formatAssetDetailDate(event.at, options.locale)} · ${formatHistoryTime(event.at)}`,
    monthKey: getBangkokDateKey(event.at).slice(0, 7),
    monthLabel: formatHistoryMonth(event.at, options.locale),
    recent: event.at >= periodStart,
    detail: event.detail,
    actor: event.actor,
    document: event.document && options.access[event.document.kind] ? { code: event.document.code, href: event.document.href } : null,
  }))
}

/** A chip and the period filter in place: a new array, the input unchanged. */
export function filterAssetHistoryRows<T extends Pick<AssetHistoryRow, "category" | "recent">>(
  rows: readonly T[],
  type: AssetHistoryCategory | "all",
  period: AssetHistoryPeriod,
): T[] {
  return rows.filter((row) => (type === "all" || row.category === type) && (period === "all" || row.recent))
}

/** The chips' counts: the server's over every event for ทั้งหมด (the page holds at most 500), else the recent rows. */
export function assetHistoryChipCounts(
  rows: readonly Pick<AssetHistoryRow, "category" | "recent">[],
  period: AssetHistoryPeriod,
  server: AssetHistoryCounts,
): AssetHistoryCounts {
  if (period === "all") return server
  const counts = Object.fromEntries(ASSET_HISTORY_CATEGORIES.map((category) => [category, 0])) as Record<AssetHistoryCategory, number>
  let total = 0
  for (const row of rows) {
    if (!row.recent) continue
    counts[row.category] += 1
    total += 1
  }
  return { total, counts }
}

/** The chips after ทั้งหมด: the categories with events, plus the one ?type= chose (R17). */
export function visibleAssetHistoryChips(counts: Record<AssetHistoryCategory, number>, initialType: AssetHistoryCategory | null): AssetHistoryCategory[] {
  return ASSET_HISTORY_CATEGORIES.filter((category) => counts[category] > 0 || category === initialType)
}

/** Runs of the same Bangkok month, in order. */
export function groupAssetHistoryByMonth<T extends Pick<AssetHistoryRow, "monthKey" | "monthLabel">>(
  rows: readonly T[],
): { monthKey: string; monthLabel: string; rows: T[] }[] {
  const groups: { monthKey: string; monthLabel: string; rows: T[] }[] = []
  for (const row of rows) {
    const last = groups.at(-1)
    if (last && last.monthKey === row.monthKey) last.rows.push(row)
    else groups.push({ monthKey: row.monthKey, monthLabel: row.monthLabel, rows: [row] })
  }
  return groups
}

/** The rows shown so far and how many "แสดงเพิ่ม" has left. */
export function pageAssetHistoryRows<T>(rows: readonly T[], visible: number): { shown: T[]; remaining: number } {
  return { shown: rows.slice(0, visible), remaining: Math.max(rows.length - visible, 0) }
}

/** Task 3's export route, in the page's language (R15): every event, unfiltered. */
export function buildAssetHistoryExportHref(locale: string, assetId: string): string {
  return `/api/assets/${encodeURIComponent(assetId)}/history/export?locale=${encodeURIComponent(locale)}`
}
