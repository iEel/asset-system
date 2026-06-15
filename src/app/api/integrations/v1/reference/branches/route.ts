import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationScope,
} from "@/lib/integration-auth"
import { toIntegrationBranchDto } from "@/lib/integration-reference"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationScope(request, "reference:read")
    requestId = context.requestId
    const companyCode = request.nextUrl.searchParams.get("companyCode")?.trim()
    const branches = await prisma.branch.findMany({
      where: {
        isActive: true,
        ...(companyCode ? { company: { code: { contains: companyCode } } } : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        company: { select: { code: true, nameTh: true } },
      },
      orderBy: [{ company: { code: "asc" } }, { code: "asc" }],
    })

    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_reference_branches",
      route: "/api/integrations/v1/reference/branches",
      status: 200,
      query: { companyCode },
      resultCount: branches.length,
    })

    return NextResponse.json({
      data: branches.map(toIntegrationBranchDto),
      meta: { requestId: context.requestId },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}
