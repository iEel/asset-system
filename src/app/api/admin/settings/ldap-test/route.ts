import { NextRequest, NextResponse } from "next/server"
import { hasRole, requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { prisma } from "@/lib/db"
import { testLdapConnection, type LdapConfigInput } from "@/lib/ldap-auth"
import { resolveLdapTestSettings } from "@/lib/system-setting-secrets"

const storedLdapTargetKeys = ["ldap_url", "ldap_bind_dn", "ldap_bind_password"]

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")
    if (!hasRole(user, "system_admin")) {
      throw new Error("Forbidden: only system_admin can test LDAP connections")
    }

    const payload = (await request.json()) as { settings?: Array<{ key: string; value: string }> }
    const submitted = Object.fromEntries(
      (payload.settings ?? []).map((setting) => [setting.key, setting.value])
    )
    const storedSettings = await prisma.systemSetting.findMany({
      where: { key: { in: storedLdapTargetKeys } },
      select: { key: true, value: true },
    })
    const resolved = resolveLdapTestSettings(
      submitted,
      Object.fromEntries(storedSettings.map((setting) => [setting.key, setting.value])),
    )
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 })
    }

    const result = await testLdapConnection(resolved.settings as LdapConfigInput)

    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
