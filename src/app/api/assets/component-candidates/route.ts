import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { installedOrOutstandingLinkWhere } from "@/lib/asset-component-outstanding"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const parentAssetId = request.nextUrl.searchParams.get("parentAssetId")?.trim()
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? ""
    if (!parentAssetId) return NextResponse.json({ error: "parentAssetId is required" }, { status: 400 })
    if (search.length < 2) return NextResponse.json({ data: [] })

    const candidates = await prisma.asset.findMany({
      where: {
        isActive: true,
        id: { not: parentAssetId },
        // An outstanding component is still linked (group 3 spec §8.5): it is not a candidate.
        installedInLinks: { none: installedOrOutstandingLinkWhere },
        OR: [
          { assetTag: { contains: search } },
          { name: { contains: search } },
          { serialNumber: { contains: search } },
          { fixedAssetCode: { contains: search } },
        ],
      },
      select: { id: true, assetTag: true, name: true, serialNumber: true },
      orderBy: { assetTag: "asc" },
      take: 20,
    })

    return NextResponse.json({ data: candidates })
  } catch (error) {
    return errorResponse(error)
  }
}
