import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationScope,
} from "@/lib/integration-auth"
import { toIntegrationLocationDto } from "@/lib/integration-reference"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationScope(request, "reference:read")
    requestId = context.requestId
    const companyCode = request.nextUrl.searchParams.get("companyCode")?.trim()
    const branchCode = request.nextUrl.searchParams.get("branchCode")?.trim()
    const branchWhere = {
      ...(branchCode ? { code: { contains: branchCode } } : {}),
      ...(companyCode ? { company: { code: { contains: companyCode } } } : {}),
    }
    const locations = await prisma.location.findMany({
      where: {
        isActive: true,
        ...(Object.keys(branchWhere).length > 0 ? { branch: branchWhere } : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        locationType: true,
        isActive: true,
        branch: {
          select: {
            code: true,
            name: true,
            company: { select: { code: true, nameTh: true } },
          },
        },
      },
      orderBy: [{ branch: { code: "asc" } }, { code: "asc" }],
    })

    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_reference_locations",
      route: "/api/integrations/v1/reference/locations",
      status: 200,
      resultCount: locations.length,
    })

    return NextResponse.json({
      data: locations.map(toIntegrationLocationDto),
      meta: { requestId: context.requestId },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}
