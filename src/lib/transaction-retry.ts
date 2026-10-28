// Runs a transaction again when SQL Server picks it as a deadlock victim (error 1205; final review I-1 of group 2
// plan 4). Prisma 7's mssql adapter maps 1205 to kind "TransactionWriteConflict", which the client reports as P2034;
// a kind the client does not map is rethrown as a DriverAdapterError carrying it, and the raw driver error carries
// `number: 1205`. Only a deadlock is retried: the victim was rolled back whole, so running it again is safe. Any other
// error, a refusal the transaction throws on purpose included, goes straight to the caller. Pure, no imports.

const DEADLOCK_NUMBER = 1205

function hasDeadlockMark(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  if (record.code === "P2034") return true
  if (record.kind === "TransactionWriteConflict") return true
  return record.number === DEADLOCK_NUMBER
}

export function isDeadlockError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  return hasDeadlockMark(error) || hasDeadlockMark((error as { cause?: unknown }).cause)
}

export type DeadlockRetryOptions = {
  /** Runs in all, the first included (default 3). */
  attempts?: number
  /** The wait before the second run; doubled for each later one (default 40 ms). */
  backoffMs?: number
  sleep?: (ms: number) => Promise<void>
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function withDeadlockRetry<T>(run: () => Promise<T>, options: DeadlockRetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3)
  const backoffMs = options.backoffMs ?? 40
  const sleep = options.sleep ?? wait

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      if (!isDeadlockError(error) || attempt >= attempts) throw error
      await sleep(backoffMs * 2 ** (attempt - 1))
    }
  }
}
