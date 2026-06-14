import { NextRequest, NextResponse } from "next/server"
import {
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationClient,
} from "@/lib/integration-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationClient(request)
    requestId = context.requestId
    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_health_check",
      route: "/api/integrations/v1/health",
      status: 200,
      resultCount: 1,
    })

    return NextResponse.json({
      data: {
        ok: true,
        version: "v1",
        clientId: context.client.clientId,
        scopes: context.client.scopes,
      },
      meta: { requestId: context.requestId },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}
