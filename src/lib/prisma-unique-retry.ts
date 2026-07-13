export async function withPrismaUniqueRetry<T>(operation: () => Promise<T>, maxAttempts = 3) {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isPrismaUniqueConstraintError(error) || attempt === maxAttempts) throw error
    }
  }

  throw lastError
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002")
}
