export const adminUserSecretOmit = { passwordHash: true } as const

export function toAdminUserResponse<T extends object>(user: T): Omit<T, "passwordHash"> {
  const safeUser: Record<string, unknown> = { ...user }
  delete safeUser.passwordHash
  return safeUser as Omit<T, "passwordHash">
}
