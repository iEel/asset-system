import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationScope,
} from "@/lib/integration-auth"
import { toIntegrationStatusDto } from "@/lib/integration-reference"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationScope(request, "reference:read")
    requestId = context.requestId
    const statuses = await prisma.assetStatus.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true, colorCode: true, sortOrder: true, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_reference_statuses",
      route: "/api/integrations/v1/reference/statuses",
      status: 200,
      resultCount: statuses.length,
    })

    return NextResponse.json({
      data: statuses.map(toIntegrationStatusDto),
      meta: { requestId: context.requestId },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}
