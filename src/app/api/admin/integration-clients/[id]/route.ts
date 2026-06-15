import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import {
  getIntegrationClientById,
  updateIntegrationClient,
  type IntegrationClientDto,
} from "@/lib/integration-client-store"
import { integrationClientUpdateSchema } from "@/lib/validations/integration-client"

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

export async function PATCH(request: NextRequest, context: IntegrationClientRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    const { id } = await context.params
    const existingClient = await getIntegrationClientById(id)
    if (!existingClient) {
      return NextResponse.json({ error: "Integration client not found" }, { status: 404 })
    }

    const input = integrationClientUpdateSchema.parse(await request.json())
    const client = await updateIntegrationClient(id, input, user.id)

    await logAudit({
      userId: user.id,
      action: "update_client_scopes",
      module: "integration_api",
      recordId: client.clientId,
      oldValue: toSafeAuditValue(existingClient),
      newValue: toSafeAuditValue(client),
    })

    return NextResponse.json({ data: client })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
