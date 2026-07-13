import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { getDisposalAssetEligibilityError } from "@/lib/disposal-policy"
import {
  disposalReadinessAssetSelect,
  getDisposalReadinessBlockersForAsset,
} from "@/lib/disposal-readiness"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "create")
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
    const id = (request.nextUrl.searchParams.get("id") ?? "").trim()
    if (!id && query.length < 2) return NextResponse.json({ data: [] })

    const assets = await prisma.asset.findMany({
      where: {
        isActive: true,
        ...(id
          ? { id }
          : {
              OR: [
                { assetTag: { contains: query } },
                { name: { contains: query } },
                { serialNumber: { contains: query } },
                { fixedAssetCode: { contains: query } },
              ],
            }),
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        status: { select: { name: true, nameTh: true } },
        company: { select: { code: true } },
        branch: { select: { code: true } },
        currentLocation: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        ...disposalReadinessAssetSelect,
      },
      orderBy: { assetTag: "asc" },
      take: id ? 1 : 100,
    })

    return NextResponse.json({
      data: assets.slice(0, 50).map((asset) => {
        const readinessBlockers = getDisposalReadinessBlockersForAsset(asset)
        const lifecycleBlocked = getDisposalAssetEligibilityError(asset.status) !== null
        const blockers = lifecycleBlocked ? ["lifecycle_status", ...readinessBlockers] : readinessBlockers
        return {
          id: asset.id,
          label: `${asset.assetTag} - ${asset.name}`,
          metadata: [
            asset.status.nameTh,
            `${asset.company.code}/${asset.branch.code}`,
            asset.currentLocation.name,
            asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null,
          ].filter(Boolean).join(" · "),
          eligible: blockers.length === 0,
          blockers,
        }
      }),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
