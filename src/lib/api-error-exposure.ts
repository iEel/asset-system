// Decides whether an error's message may be sent to the browser (review finding S9).
// Messages the code throws on purpose are fine; database, filesystem and programming errors are not.
import { randomUUID } from "node:crypto"

const builtInProgrammingErrors = [TypeError, RangeError, ReferenceError, SyntaxError, EvalError, URIError]

export function isExposableError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false
  if (builtInProgrammingErrors.some((type) => error instanceof type)) return false
  if (error.name.startsWith("PrismaClient")) return false
  // Prisma 7 rethrows driver-adapter errors of unknown kind as-is (see Be() in @prisma/client/runtime/client.js).
  if (error.name === "DriverAdapterError") return false
  if ("syscall" in error || "errno" in error) return false
  return true
}

export function unexpectedErrorText(reference: string) {
  return `Unexpected error · ref ${reference}`
}

/** Logs an error that must not reach the browser and returns the reference and text to send instead. */
export function hideUnexpectedError(error: unknown) {
  const reference = randomUUID().replaceAll("-", "").slice(0, 8)
  console.error(`[api error] ref ${reference}`, error)
  return { reference, text: unexpectedErrorText(reference) }
}
