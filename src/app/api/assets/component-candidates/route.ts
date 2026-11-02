import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { installedOrOutstandingLinkWhere } from "@/lib/asset-component-outstanding"
import { lastRemovalByComponent } from "@/lib/asset-component-links"

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

    // When each was last removed from this parent (P4-R5): one read of at most 20 ids, the removal date only.
    const removals = candidates.length === 0
      ? []
      : await prisma.assetComponent.findMany({
          where: { parentAssetId, componentAssetId: { in: candidates.map((candidate) => candidate.id) }, status: "removed", removedAt: { not: null } },
          select: { componentAssetId: true, removedAt: true },
        })
    const lastRemoval = lastRemovalByComponent(removals)

    return NextResponse.json({
      data: candidates.map((candidate) => {
        const removedAt = lastRemoval.get(candidate.id)
        return { ...candidate, lastRemovalHere: removedAt ? { removedAt: removedAt.toISOString() } : null }
      }),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
