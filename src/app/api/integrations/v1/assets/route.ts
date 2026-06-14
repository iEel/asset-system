import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationScope,
} from "@/lib/integration-auth"
import {
  buildIntegrationAssetOrderBy,
  buildIntegrationAssetWhere,
  integrationAssetSelect,
  parseIntegrationAssetListParams,
  toIntegrationAssetDto,
} from "@/lib/integration-assets"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationScope(request, "asset:read")
    requestId = context.requestId
    const filters = parseIntegrationAssetListParams(request.nextUrl.searchParams)
    const where = buildIntegrationAssetWhere(filters)
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        select: integrationAssetSelect,
        orderBy: buildIntegrationAssetOrderBy(filters),
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.asset.count({ where }),
    ])

    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_asset_list",
      route: "/api/integrations/v1/assets",
      status: 200,
      resultCount: assets.length,
    })

    return NextResponse.json({
      data: assets.map(toIntegrationAssetDto),
      meta: {
        requestId: context.requestId,
        total,
        page: filters.page,
        limit: filters.limit,
      },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}
