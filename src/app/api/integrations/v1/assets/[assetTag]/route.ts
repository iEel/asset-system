import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  IntegrationApiError,
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationScope,
} from "@/lib/integration-auth"
import { integrationAssetSelect, toIntegrationAssetDto } from "@/lib/integration-assets"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetTag: string }> }
) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationScope(request, "asset:read")
    requestId = context.requestId
    const { assetTag } = await params
    const asset = await prisma.asset.findFirst({
      where: { assetTag: decodeURIComponent(assetTag), isActive: true },
      select: integrationAssetSelect,
    })

    if (!asset) {
      throw new IntegrationApiError(404, "INTEGRATION_ASSET_NOT_FOUND", "Asset was not found")
    }

    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_asset_detail",
      route: "/api/integrations/v1/assets/{assetTag}",
      status: 200,
      target: {
        assetTag: asset.assetTag,
      },
      resultCount: 1,
    })

    return NextResponse.json({
      data: toIntegrationAssetDto(asset),
      meta: { requestId: context.requestId },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}
