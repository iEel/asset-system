// The create form's live count (group 2 spec §7): pure, so the form and node --test import it.

export type AuditPreviewCategoryCount = { id: string; count: number }

// The selected assets by category, largest first; a tie keeps the id order, so two counts of one scope list alike.
// A component counts under its own category.
export function countAuditPreviewCategories(assets: readonly { categoryId: string }[]): AuditPreviewCategoryCount[] {
  const counts = new Map<string, number>()
  for (const asset of assets) counts.set(asset.categoryId, (counts.get(asset.categoryId) ?? 0) + 1)
  return [...counts]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id))
}

export type AuditRoundOverlapRow = { assetId: string; auditRound: { id: string; auditNo: string } }

export type AuditRoundOverlap = { count: number; rounds: { id: string; auditNo: string }[] }

// Each selected asset counts once however many rounds hold it; every round is named once, by number.
export function foldAuditRoundOverlap(rows: readonly AuditRoundOverlapRow[]): AuditRoundOverlap {
  const assetIds = new Set<string>()
  const rounds = new Map<string, { id: string; auditNo: string }>()
  for (const row of rows) {
    assetIds.add(row.assetId)
    if (!rounds.has(row.auditRound.id)) rounds.set(row.auditRound.id, { id: row.auditRound.id, auditNo: row.auditRound.auditNo })
  }
  return {
    count: assetIds.size,
    rounds: [...rounds.values()].sort((left, right) => left.auditNo.localeCompare(right.auditNo)),
  }
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const match = DATE_KEY.exec(dateKey)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
}

// One month after a yyyy-mm-dd key, on the month's last day when the day is missing (31 Jan → 28 or 29 Feb); "" for
// anything else (group 2 spec §7, bug §13.7: the end defaults to a month after the start).
export function addMonthsToDateKey(dateKey: string, months: number): string {
  const parts = parseDateKey(dateKey)
  if (!parts) return ""
  const first = new Date(Date.UTC(parts.year, parts.month + months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  first.setUTCDate(Math.min(parts.day, lastDay))
  return first.toISOString().slice(0, 10)
}

// The items a day over the round's dates, both ends counted, rounded up; null for no items, a bad key or an end before
// the start (group 2 spec §7: "ต้องตรวจเฉลี่ยวันละ X รายการ").
export function auditRoundDailyLoad(items: number, startDate: string, endDate: string): number | null {
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate)
  if (items <= 0 || !start || !end) return null
  const days = (Date.UTC(end.year, end.month, end.day) - Date.UTC(start.year, start.month, start.day)) / DAY_MS + 1
  if (days < 1) return null
  return Math.ceil(items / days)
}

// A new start date's end: a month later while the person has not set the end themselves; once they have, the end stays
// (group 2 spec §7, bug §13.7). A start that is not a date key leaves the end as it was.
export function auditRoundEndAfterStartChange(startDate: string, endDate: string, endTouched: boolean): string {
  if (endTouched) return endDate
  return addMonthsToDateKey(startDate, 1) || endDate
}

// The sample rate the form can show: a whole number from 1 to 100, else null (the field is empty or half typed).
export function parseAuditSampleRate(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const rate = Number(raw.trim())
  return rate >= 1 && rate <= 100 ? rate : null
}
