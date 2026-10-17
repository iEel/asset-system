import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { prisma } from "@/lib/db"
import { uniqueConflictResponse } from "@/lib/field-error-response"
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
    // The client id is unique: one that exists is refused under its field before the client and its token are made (V track spec §6.2).
    const existing = await prisma.integrationApiClient.findUnique({ where: { clientId: input.clientId }, select: { id: true } })
    if (existing) return uniqueConflictResponse("clientId", "Integration client ID already exists")
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
