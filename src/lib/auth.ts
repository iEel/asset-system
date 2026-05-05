import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import { authenticateLdapUser, getLdapConfig, type LdapConfigInput } from "@/lib/ldap-auth"
import { ldapSettingKeys } from "@/lib/system-setting-defaults"
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const username = String(credentials.username).trim()
        const password = String(credentials.password)

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
      }
      return token
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

async function getLdapSettings(): Promise<LdapConfigInput> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [...ldapSettingKeys] } },
    select: { key: true, value: true },
  })

  return Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) as LdapConfigInput
}

async function resolveLdapAppUser(profile: { username: string; displayName: string; email: string | null }, settings: LdapConfigInput) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: profile.username },
        ...(profile.email ? [{ email: profile.email }] : []),
      ],
    },
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

  const defaultRole = await prisma.role.findUnique({
    where: { name: ldapConfig.defaultRole },
    select: { id: true },
  })
  if (!defaultRole) {
    return null
  }

  const passwordHash = await bcrypt.hash(randomUUID(), 12)
  const created = await prisma.user.create({
    data: {
      username: profile.username,
      passwordHash,
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

async function toSessionUser(user: NonNullable<Awaited<ReturnType<typeof resolveLdapAppUser>>>) {
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  const roles = user.userRoles.map((ur) => ur.role.name)
  const permissions = user.userRoles.flatMap((ur) =>
    ur.role.rolePermissions.map(
      (rp) => `${rp.permission.module}:${rp.permission.action}`
    )
  )

  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    roles,
    permissions,
    employeeId: user.employeeId,
  }
}
