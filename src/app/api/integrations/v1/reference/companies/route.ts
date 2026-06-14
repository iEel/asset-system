import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationScope,
} from "@/lib/integration-auth"
import { toIntegrationCompanyDto } from "@/lib/integration-reference"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationScope(request, "reference:read")
    requestId = context.requestId
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true, nameEn: true, isActive: true },
      orderBy: { code: "asc" },
    })

    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_reference_companies",
      route: "/api/integrations/v1/reference/companies",
      status: 200,
      resultCount: companies.length,
    })

    return NextResponse.json({
      data: companies.map(toIntegrationCompanyDto),
      meta: { requestId: context.requestId },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}
