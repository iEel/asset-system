import type { Prisma } from "@prisma/client"
import { appendListPage } from "./list-pagination.ts"

// Page group 12 plan 2 (spec §4, §15 items 5, 6, 9): the /admin/logs filter rules. Pure, so tests and the page both
// load it. URL params: tag, userId, dateFrom, dateTo, module, action, recordId (plus page and pageSize).

/** userId option for logs written by the system (scheduled jobs): no user and not the integration API. */
export const LOG_USER_SYSTEM = "system"
/** userId option for logs written through the integration API. */
export const LOG_USER_INTEGRATION = "integration"
const INTEGRATION_MODULE = "integration_api"

/** The tag search looks up at most this many assets (exact or prefix match). */
export const TAG_MATCH_CAP = 50

export type LogDatePreset = "today" | "7d" | "30d"

export type SystemLogFilters = {
  tag: string
  userId: string | null
  /** yyyy-mm-dd, a Bangkok calendar day. */
  dateFrom: string | null
  /** yyyy-mm-dd, a Bangkok calendar day (inclusive). */
  dateTo: string | null
  module: string
  action: string
  recordId: string
}

// Thailand has no daylight saving time, so Asia/Bangkok is always UTC+07:00.
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function firstValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw ?? "").trim()
}

/** A real calendar date written as yyyy-mm-dd, else null. */
function parseDay(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return value
}

export function parseSystemLogFilters(input: Record<string, string | string[] | undefined>): SystemLogFilters {
  let dateFrom = parseDay(firstValue(input.dateFrom))
  let dateTo = parseDay(firstValue(input.dateTo))
  if (dateFrom && dateTo && dateFrom > dateTo) [dateFrom, dateTo] = [dateTo, dateFrom]
  return {
    tag: firstValue(input.tag),
    userId: firstValue(input.userId) || null,
    dateFrom,
    dateTo,
    module: firstValue(input.module),
    action: firstValue(input.action),
    recordId: firstValue(input.recordId),
  }
}

/** The Bangkok calendar day of an instant, as yyyy-mm-dd. */
function bangkokDay(instant: number): string {
  return new Date(instant + BANGKOK_OFFSET_MS).toISOString().slice(0, 10)
}

/** Bangkok calendar days ending today; 7d is today and the 6 days before, 30d today and the 29 before. */
export function presetRange(preset: LogDatePreset, now: Date): { dateFrom: string; dateTo: string } {
  const days = preset === "today" ? 1 : preset === "7d" ? 7 : 30
  const time = now.getTime()
  return { dateFrom: bangkokDay(time - (days - 1) * DAY_MS), dateTo: bangkokDay(time) }
}

/** Bangkok midnight at the start of a yyyy-mm-dd day, as a UTC instant. */
function bangkokMidnight(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - BANGKOK_OFFSET_MS)
}

/** [dateFrom 00:00, dateTo + 1 day 00:00) in Bangkok, as UTC Dates; a missing side is left open. */
export function bangkokDayBounds(dateFrom: string | null, dateTo: string | null): { gte?: Date; lt?: Date } {
  const bounds: { gte?: Date; lt?: Date } = {}
  if (dateFrom) bounds.gte = bangkokMidnight(dateFrom)
  if (dateTo) bounds.lt = new Date(bangkokMidnight(dateTo).getTime() + DAY_MS)
  return bounds
}

function userWhere(userId: string): Prisma.SystemLogWhereInput {
  if (userId === LOG_USER_SYSTEM) return { userId: null, module: { not: INTEGRATION_MODULE } }
  // Only the API's own calls: an admin's client changes (integration_api with a userId) name the admin in the ผู้ใช้
  // column, so this option mirrors the row label; those changes stay under the Integration API quick filter.
  if (userId === LOG_USER_INTEGRATION) return { userId: null, module: INTEGRATION_MODULE }
  return { userId }
}

/**
 * The tag search's asset where: an exact tag, or a tag that starts with the text. SQL Server LIKE reads % _ [ as
 * wildcards and Prisma does not escape them, so each is wrapped in [ ] for the prefix (a literal in a LIKE class).
 */
export function assetTagMatchWhere(tag: string): Prisma.AssetWhereInput {
  return { OR: [{ assetTag: tag }, { assetTag: { startsWith: tag.replace(/[[%_]/g, (c) => `[${c}]`) } }] }
}

/**
 * matchedAssetIds: null = no tag filter; [] = a tag was given but no asset matched, so the where matches nothing.
 * Every part is ANDed together.
 */
export function systemLogWhere(filters: SystemLogFilters, matchedAssetIds: string[] | null): Prisma.SystemLogWhereInput {
  const parts: Prisma.SystemLogWhereInput[] = []
  if (matchedAssetIds !== null) {
    parts.push(matchedAssetIds.length === 0 ? { id: { in: [] } } : { module: "asset", recordId: { in: matchedAssetIds } })
  }
  if (filters.userId) parts.push(userWhere(filters.userId))
  if (filters.dateFrom || filters.dateTo) parts.push({ createdAt: bangkokDayBounds(filters.dateFrom, filters.dateTo) })
  if (filters.module) parts.push({ module: filters.module })
  if (filters.action) parts.push({ action: filters.action })
  if (filters.recordId) parts.push({ recordId: filters.recordId })
  return { AND: parts }
}

/** The list query string: empty filters, page 1 and page size 25 stay out of it. */
export function buildSystemLogQuery(filters: SystemLogFilters, page: { page?: number; pageSize?: number }): string {
  const params = new URLSearchParams()
  if (filters.tag) params.set("tag", filters.tag)
  if (filters.userId) params.set("userId", filters.userId)
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  if (filters.module) params.set("module", filters.module)
  if (filters.action) params.set("action", filters.action)
  if (filters.recordId) params.set("recordId", filters.recordId)
  return appendListPage(params, page).toString()
}
