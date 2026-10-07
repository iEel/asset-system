export const adminUserSecretOmit = { passwordHash: true } as const

export function toAdminUserResponse<T extends object>(user: T): Omit<T, "passwordHash"> {
  const safeUser = { ...user } as Record<string, unknown>
  delete safeUser.passwordHash
  return safeUser as Omit<T, "passwordHash">
}
