export type ScheduledJobDecisionReason =
  | "disabled"
  | "mode_not_scheduled"
  | "invalid_schedule"
  | "not_due_yet"
  | "due"

export type ScheduledJobDecision = {
  shouldRun: boolean
  reason: ScheduledJobDecisionReason
  dueRunAt: Date | null
  nextRunAt: Date | null
}

type ScheduledJobInput = {
  enabled: boolean
  mode?: string | null
  schedule?: string | null
  lastRunAt?: string | Date | null
  now?: Date
  timezoneOffsetMinutes?: number
}

type CronField = {
  min: number
  max: number
  value: (date: Date) => number
  normalize?: (value: number) => number
}

const cronFields: CronField[] = [
  { min: 0, max: 59, value: (date) => date.getUTCMinutes() },
  { min: 0, max: 23, value: (date) => date.getUTCHours() },
  { min: 1, max: 31, value: (date) => date.getUTCDate() },
  { min: 1, max: 12, value: (date) => date.getUTCMonth() + 1 },
  { min: 0, max: 7, value: (date) => date.getUTCDay(), normalize: (value) => (value === 7 ? 0 : value) },
]

export const schedulerTimezone = "Asia/Bangkok"
export const schedulerTimezoneOffsetMinutes = 7 * 60

export function getScheduledJobDecision({
  enabled,
  mode,
  schedule,
  lastRunAt,
  now = new Date(),
  timezoneOffsetMinutes = 0,
}: ScheduledJobInput): ScheduledJobDecision {
  const expression = schedule?.trim() ?? ""
  if (!enabled) return buildDecision(false, "disabled", null, findNextScheduledRunAt(expression, now, 366, timezoneOffsetMinutes))
  if (mode !== "scheduled") return buildDecision(false, "mode_not_scheduled", null, findNextScheduledRunAt(expression, now, 366, timezoneOffsetMinutes))
  if (!isSupportedCronExpression(expression)) return buildDecision(false, "invalid_schedule", null, null)

  const dueRunAt = findLastScheduledRunAt(expression, now, 366, timezoneOffsetMinutes)
  const previousRunAt = toDate(lastRunAt)
  if (dueRunAt && (!previousRunAt || dueRunAt.getTime() > previousRunAt.getTime())) {
    return buildDecision(true, "due", dueRunAt, findNextScheduledRunAt(expression, now, 366, timezoneOffsetMinutes))
  }

  return buildDecision(false, "not_due_yet", dueRunAt, findNextScheduledRunAt(expression, now, 366, timezoneOffsetMinutes))
}

export function isSupportedCronExpression(expression: string) {
  return parseCronExpression(expression) !== null
}

export function findLastScheduledRunAt(expression: string, now = new Date(), lookbackDays = 366, timezoneOffsetMinutes = 0) {
  if (!isSupportedCronExpression(expression)) return null
  const cursor = floorToMinute(now)
  const maxMinutes = Math.max(1, lookbackDays * 24 * 60)
  for (let offset = 0; offset <= maxMinutes; offset += 1) {
    const candidate = new Date(cursor.getTime() - offset * 60_000)
    if (cronMatchesDate(expression, candidate, timezoneOffsetMinutes)) return candidate
  }
  return null
}

export function findNextScheduledRunAt(expression: string, now = new Date(), lookaheadDays = 366, timezoneOffsetMinutes = 0) {
  if (!isSupportedCronExpression(expression)) return null
  const cursor = floorToMinute(new Date(now.getTime() + 60_000))
  const maxMinutes = Math.max(1, lookaheadDays * 24 * 60)
  for (let offset = 0; offset <= maxMinutes; offset += 1) {
    const candidate = new Date(cursor.getTime() + offset * 60_000)
    if (cronMatchesDate(expression, candidate, timezoneOffsetMinutes)) return candidate
  }
  return null
}

export function cronMatchesDate(expression: string, date: Date, timezoneOffsetMinutes = 0) {
  const parts = parseCronExpression(expression)
  if (!parts) return false
  const zonedDate = applyTimezoneOffset(date, timezoneOffsetMinutes)

  return parts.every((part, index) => {
    const field = cronFields[index]
    const actual = field.normalize ? field.normalize(field.value(zonedDate)) : field.value(zonedDate)
    return fieldMatches(part, actual, field)
  })
}

function parseCronExpression(expression: string) {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return null
  if (parts.some((part, index) => !isValidField(part, cronFields[index]))) return null
  return parts
}

function isValidField(part: string, field: CronField) {
  return part.split(",").every((segment) => parseFieldSegment(segment, field) !== null)
}

function fieldMatches(part: string, actual: number, field: CronField) {
  return part.split(",").some((segment) => {
    const parsed = parseFieldSegment(segment, field)
    if (!parsed) return false
    const normalizedActual = field.normalize ? field.normalize(actual) : actual
    for (let candidate = parsed.start; candidate <= parsed.end; candidate += parsed.step) {
      const normalizedCandidate = field.normalize ? field.normalize(candidate) : candidate
      if (normalizedCandidate === normalizedActual) return true
    }
    return false
  })
}

function parseFieldSegment(segment: string, field: CronField) {
  const [range, stepText] = segment.split("/")
  if (!range || segment.split("/").length > 2) return null
  const step = stepText ? Number(stepText) : 1
  if (!Number.isInteger(step) || step < 1) return null

  const bounds = parseRange(range, field)
  if (!bounds) return null
  if (bounds.start > bounds.end) return null

  return { ...bounds, step }
}

function parseRange(range: string, field: CronField) {
  if (range === "*") return { start: field.min, end: field.max }
  if (range.includes("-")) {
    const [startText, endText] = range.split("-")
    if (!startText || !endText || range.split("-").length > 2) return null
    const start = Number(startText)
    const end = Number(endText)
    if (!isInFieldRange(start, field) || !isInFieldRange(end, field)) return null
    return { start, end }
  }

  const value = Number(range)
  if (!isInFieldRange(value, field)) return null
  return { start: value, end: value }
}

function isInFieldRange(value: number, field: CronField) {
  return Number.isInteger(value) && value >= field.min && value <= field.max
}

function floorToMinute(date: Date) {
  const next = new Date(date)
  next.setUTCSeconds(0, 0)
  return next
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function applyTimezoneOffset(date: Date, timezoneOffsetMinutes: number) {
  if (!Number.isFinite(timezoneOffsetMinutes) || timezoneOffsetMinutes === 0) return date
  return new Date(date.getTime() + timezoneOffsetMinutes * 60_000)
}

function buildDecision(
  shouldRun: boolean,
  reason: ScheduledJobDecisionReason,
  dueRunAt: Date | null,
  nextRunAt: Date | null
): ScheduledJobDecision {
  return { shouldRun, reason, dueRunAt, nextRunAt }
}
