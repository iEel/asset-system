// Decides whether an error's message may be sent to the browser (review finding S9).
// Messages the code throws on purpose are fine; database, filesystem and programming errors are not.

const builtInProgrammingErrors = [TypeError, RangeError, ReferenceError, SyntaxError, EvalError, URIError]

export function isExposableError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false
  if (builtInProgrammingErrors.some((type) => error instanceof type)) return false
  if (error.name.startsWith("PrismaClient")) return false
  if ("syscall" in error || "errno" in error) return false
  return true
}

export function unexpectedErrorText(reference: string) {
  return `Unexpected error · ref ${reference}`
}
