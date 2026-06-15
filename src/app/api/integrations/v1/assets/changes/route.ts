import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  IntegrationApiError,
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationScope,
} from "@/lib/integration-auth"
import {
  buildIntegrationAssetChangeOrderBy,
  buildIntegrationAssetChangeWhere,
  encodeIntegrationChangeCursor,
  integrationAssetSelect,
  parseIntegrationAssetChangeParams,
  toIntegrationAssetDto,
} from "@/lib/integration-assets"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationScope(request, "asset:read")
    requestId = context.requestId
    const filters = parseIntegrationAssetChangeParams(request.nextUrl.searchParams)
    if (!filters.updatedSince) {
      throw new IntegrationApiError(400, "INTEGRATION_UPDATED_SINCE_REQUIRED", "updatedSince is required")
    }

    const rows = await prisma.asset.findMany({
      where: buildIntegrationAssetChangeWhere(filters),
      select: integrationAssetSelect,
      orderBy: buildIntegrationAssetChangeOrderBy(),
      take: filters.limit + 1,
    })
    const hasMore = rows.length > filters.limit
    const assets = rows.slice(0, filters.limit)
    const lastAsset = assets.at(-1)
    const nextCursor = hasMore && lastAsset
      ? encodeIntegrationChangeCursor({ updatedAt: lastAsset.updatedAt.toISOString(), id: lastAsset.id })
      : null

    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_asset_changes",
      route: "/api/integrations/v1/assets/changes",
      status: 200,
      query: {
        updatedSince: filters.updatedSince,
        cursor: filters.cursor?.id,
        includeInactive: filters.includeInactive,
        limit: filters.limit,
      },
      response: {
        hasMore,
        highWaterMark: lastAsset?.updatedAt ?? filters.updatedSince,
        nextCursor,
      },
      resultCount: assets.length,
    })

    return NextResponse.json({
      data: assets.map(toIntegrationAssetDto),
      meta: {
        requestId: context.requestId,
        updatedSince: filters.updatedSince.toISOString(),
        highWaterMark: lastAsset?.updatedAt.toISOString() ?? filters.updatedSince.toISOString(),
        limit: filters.limit,
        hasMore,
        nextCursor,
      },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}
