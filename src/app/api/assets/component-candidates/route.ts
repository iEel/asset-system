import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"

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
        installedInLinks: {
          none: {
            status: "installed",
            removedAt: null,
          },
        },
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
