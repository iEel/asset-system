import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import { authenticateLdapUser, getLdapConfig, type LdapConfigInput } from "@/lib/ldap-auth"
import {
  buildLdapEmployeeLookup,
  buildLdapUserLookup,
  shouldCreateLdapUser,
  type LdapProvisionProfile,
} from "@/lib/ldap-user-provisioning"
import { ldapSettingKeys } from "@/lib/system-setting-defaults"
import { buildAccessSnapshot, refreshSessionToken } from "@/lib/session-access"
import { getUserAccessSnapshot } from "@/lib/session-access-cache"
import { createLoginRateLimiter, getClientIp, guardLoginAttempt } from "@/lib/login-rate-limit"
import bcrypt from "bcryptjs"
import { randomUUID } from "node:crypto"

const userWithAccess = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
  employee: true,
}

class LoginRateLimitedError extends CredentialsSignin {
  code = "rate_limited"
}

// One Node process serves production (systemd `node server.js`), so an in-memory limiter
// is shared by every login. It also caps how many failed LDAP binds reach Active Directory.
const globalForLoginRateLimit = globalThis as unknown as {
  loginRateLimiter?: ReturnType<typeof createLoginRateLimiter>
}
const loginRateLimiter =
  globalForLoginRateLimit.loginRateLimiter ??
  createLoginRateLimiter({
    username: { maxFailures: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 },
    ip: { maxFailures: 20, windowMs: 15 * 60_000, lockMs: 15 * 60_000 },
  })
globalForLoginRateLimit.loginRateLimiter = loginRateLimiter

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const username = String(credentials.username).trim()
        const password = String(credentials.password)

        const result = await guardLoginAttempt({
          limiter: loginRateLimiter,
          username,
          ip: request ? getClientIp(request.headers) : null,
          attempt: () => authenticateCredentials(username, password),
        })
        if (result.status === "rate_limited") throw new LoginRateLimitedError()

        return result.status === "ok" ? result.user : null
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = user.roles
        token.permissions = user.permissions
        token.employeeId = user.employeeId
        return token
      }
      return refreshSessionToken(token, getUserAccessSnapshot)
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.roles = token.roles as string[]
        session.user.permissions = token.permissions as string[]
        session.user.employeeId = token.employeeId as string | null | undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})

async function authenticateCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: userWithAccess,
  })

  if (user?.isActive) {
    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (isValid) {
      return toSessionUser(user)
    }
  }

  const ldapSettings = await getLdapSettings()
  const ldapProfile = await authenticateLdapUser(username, password, ldapSettings)
  if (!ldapProfile) return null

  const ldapUser = await resolveLdapAppUser(ldapProfile, ldapSettings)
  if (!ldapUser?.isActive) return null

  return toSessionUser(ldapUser)
}

async function getLdapSettings(): Promise<LdapConfigInput> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [...ldapSettingKeys] } },
    select: { key: true, value: true },
  })

  return Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) as LdapConfigInput
}

async function resolveLdapAppUser(profile: LdapProvisionProfile, settings: LdapConfigInput) {
  const linkedEmployee = await resolveLdapEmployee(profile)
  const existing = await prisma.user.findFirst({
    where: buildLdapUserLookup({ profile, employeeId: linkedEmployee?.id }),
    include: userWithAccess,
  })

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        lastLoginAt: new Date(),
        displayName: profile.displayName,
        ...(profile.email ? { email: profile.email } : {}),
      },
    })
    return prisma.user.findUnique({
      where: { id: existing.id },
      include: userWithAccess,
    })
  }

  const ldapConfig = getLdapConfig(settings)
  if (!ldapConfig.autoProvision) {
    return null
  }
  if (!shouldCreateLdapUser(linkedEmployee?.id)) {
    console.warn(`LDAP auto-provision skipped for ${profile.username}: no active Employee match`)
    return null
  }

  const defaultRole = await prisma.role.findUnique({
    where: { name: ldapConfig.defaultRole },
    select: { id: true },
  })
  if (!defaultRole) {
    console.warn(`LDAP auto-provision skipped for ${profile.username}: default role ${ldapConfig.defaultRole} not found`)
    return null
  }

  const passwordHash = await bcrypt.hash(randomUUID(), 12)
  const created = await prisma.user.create({
    data: {
      username: profile.username,
      passwordHash,
      employeeId: linkedEmployee?.id,
      displayName: profile.displayName,
      email: profile.email,
      lastLoginAt: new Date(),
      userRoles: {
        create: { roleId: defaultRole.id },
      },
    },
    include: userWithAccess,
  })

  return created
}

async function resolveLdapEmployee(profile: LdapProvisionProfile) {
  const where = buildLdapEmployeeLookup(profile)
  if (!where) return null

  return prisma.employee.findFirst({
    where,
    select: { id: true },
  })
}

async function toSessionUser(user: NonNullable<Awaited<ReturnType<typeof resolveLdapAppUser>>>) {
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  const { roles, permissions } = buildAccessSnapshot(user)

  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    roles,
    permissions,
    employeeId: user.employeeId,
  }
}
