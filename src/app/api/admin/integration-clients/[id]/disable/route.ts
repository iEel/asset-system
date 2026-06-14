import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { setIntegrationClientEnabled, type IntegrationClientDto } from "@/lib/integration-client-store"

type IntegrationClientRouteContext = {
  params: Promise<{ id: string }>
}

function toSafeAuditValue(client: IntegrationClientDto) {
  return {
    clientId: client.clientId,
    displayName: client.displayName,
    scopes: client.scopes,
    enabled: client.enabled,
    tokenPreview: client.tokenPreview,
  }
}

export async function POST(_request: Request, context: IntegrationClientRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    const { id } = await context.params
    const client = await setIntegrationClientEnabled(id, false, user.id)

    await logAudit({
      userId: user.id,
      action: "disable_client",
      module: "integration_api",
      recordId: client.clientId,
      newValue: toSafeAuditValue(client),
    })

    return NextResponse.json({ data: client })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
