type PerformanceTimingMetaValue = string | number | boolean | null | undefined
type PerformanceTimingMeta = Record<string, PerformanceTimingMetaValue>

export type PerformanceTimingEntry = {
  event: "performance_timing"
  label: string
  durationMs: number
  ok: boolean
  errorName?: string
  meta?: Record<string, string | number | boolean | null>
}

type PerformanceTimingOptions = {
  env?: NodeJS.ProcessEnv
  logger?: (entry: PerformanceTimingEntry) => void
  now?: () => number
}

const enabledValues = new Set(["1", "true", "yes", "on"])

export function isPerformanceTimingEnabled(env: NodeJS.ProcessEnv = process.env) {
  return enabledValues.has(String(env.PERFORMANCE_TIMING ?? env.PERFORMANCE_LOGGING ?? "").trim().toLowerCase())
}

export async function withPerformanceTiming<T>(
  label: string,
  operation: () => T | Promise<T>,
  meta: PerformanceTimingMeta = {},
  options: PerformanceTimingOptions = {}
): Promise<T> {
  const env = options.env ?? process.env

  if (!isPerformanceTimingEnabled(env)) {
    return operation()
  }

  const now = options.now ?? defaultNow
  const logger = options.logger ?? defaultLogger
  const startedAt = now()

  try {
    const result = await operation()
    logger(buildEntry({ label, startedAt, endedAt: now(), ok: true, meta }))
    return result
  } catch (error) {
    logger(buildEntry({
      label,
      startedAt,
      endedAt: now(),
      ok: false,
      errorName: getErrorName(error),
      meta,
    }))
    throw error
  }
}

function buildEntry({
  label,
  startedAt,
  endedAt,
  ok,
  errorName,
  meta,
}: {
  label: string
  startedAt: number
  endedAt: number
  ok: boolean
  errorName?: string
  meta: PerformanceTimingMeta
}): PerformanceTimingEntry {
  const sanitizedMeta = sanitizeMeta(meta)
  return {
    event: "performance_timing",
    label,
    durationMs: roundDuration(endedAt - startedAt),
    ok,
    ...(errorName ? { errorName } : {}),
    ...(Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {}),
  }
}

function sanitizeMeta(meta: PerformanceTimingMeta): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(meta).filter((entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined)
  )
}

function roundDuration(durationMs: number) {
  return Math.round(durationMs * 10) / 10
}

function defaultNow() {
  return performance.now()
}

function defaultLogger(entry: PerformanceTimingEntry) {
  console.info(`[performance] ${JSON.stringify(entry)}`)
}

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError"
}
