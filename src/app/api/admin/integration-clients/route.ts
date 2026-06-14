import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import {
  createIntegrationClient,
  listIntegrationClients,
  type IntegrationClientDto,
} from "@/lib/integration-client-store"
import { integrationClientCreateSchema } from "@/lib/validations/integration-client"

function toSafeAuditValue(client: IntegrationClientDto) {
  return {
    clientId: client.clientId,
    displayName: client.displayName,
    scopes: client.scopes,
    enabled: client.enabled,
    tokenPreview: client.tokenPreview,
  }
}

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "view")

    const data = await listIntegrationClients()

    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    const input = integrationClientCreateSchema.parse(await request.json())
    const { client, token } = await createIntegrationClient(input, user.id)

    await logAudit({
      userId: user.id,
      action: "create_client",
      module: "integration_api",
      recordId: client.clientId,
      newValue: toSafeAuditValue(client),
    })

    return NextResponse.json({ data: client, token }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
