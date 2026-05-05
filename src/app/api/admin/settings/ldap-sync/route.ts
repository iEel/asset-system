import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { applyLdapSync, loadLdapSettings, previewLdapSync } from "@/lib/ldap-sync"

export async function POST(request: NextRequest) {
  try {
    const schedulerAuthorized = isSchedulerAuthorized(request)
    const user = schedulerAuthorized ? null : await requireAuth()
    if (user) {
      requirePermission(user, "setting", "edit")
    }

    const payload = (await request.json().catch(() => ({}))) as { action?: string }
    const settings = await loadLdapSettings()
    const action = payload.action ?? "preview"
    const result = action === "apply"
      ? await applyLdapSync(user?.id, settings)
      : await previewLdapSync(settings)

    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function isSchedulerAuthorized(request: NextRequest) {
  const token = process.env.LDAP_SYNC_TOKEN
  if (!token) return false

  const header = request.headers.get("authorization")
  return header === `Bearer ${token}`
}
