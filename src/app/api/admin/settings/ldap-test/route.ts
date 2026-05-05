import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { testLdapConnection, type LdapConfigInput } from "@/lib/ldap-auth"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    const payload = (await request.json()) as { settings?: Array<{ key: string; value: string }> }
    const settings = Object.fromEntries(
      (payload.settings ?? []).map((setting) => [setting.key, setting.value])
    ) as LdapConfigInput
    const result = await testLdapConnection(settings)

    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
