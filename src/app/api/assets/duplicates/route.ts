import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const assetTag = request.nextUrl.searchParams.get("assetTag")?.trim()
    const serialNumber = request.nextUrl.searchParams.get("serialNumber")?.trim()
    const excludeId = request.nextUrl.searchParams.get("excludeId")?.trim()

    const [assetTagMatch, serialMatch] = await Promise.all([
      assetTag
        ? prisma.asset.findFirst({
            where: {
              isActive: true,
              assetTag,
              ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true, assetTag: true },
          })
        : null,
      serialNumber
        ? prisma.asset.findFirst({
            where: {
              isActive: true,
              serialNumber,
              ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true, assetTag: true, serialNumber: true },
          })
        : null,
    ])

    return NextResponse.json({
      assetTagExists: Boolean(assetTagMatch),
      serialNumberExists: Boolean(serialMatch),
      assetTagMatch,
      serialMatch,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
