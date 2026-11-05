import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { getDisposalAssetEligibilityError } from "@/lib/disposal-policy"
import {
  disposalReadinessAssetSelect,
  getDisposalOutstandingComponentTags,
  getDisposalReadinessBlockersForAsset,
} from "@/lib/disposal-readiness"
import { isThumbnailable } from "@/lib/attachment-thumbnail"

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
        serialNumber: true,
        status: { select: { name: true, nameTh: true } },
        company: { select: { code: true } },
        branch: { select: { code: true, name: true } },
        currentLocation: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        ...disposalReadinessAssetSelect,
      },
      orderBy: { assetTag: "asc" },
      take: id ? 1 : 100,
    })

    // ?id= (the request form's asset card) also returns the card: the asset's register photo is read the way the asset
    // page reads it, the newest active image of module "asset" that has a thumbnail. The q= branch is unchanged.
    const cardPhotoId = id && assets.length > 0 ? await readAssetRegisterPhotoId(assets[0].id) : null

    return NextResponse.json({
      data: assets.slice(0, 50).map((asset) => {
        const readinessBlockers = getDisposalReadinessBlockersForAsset(asset)
        const lifecycleBlocked = getDisposalAssetEligibilityError(asset.status) !== null
        const blockers = lifecycleBlocked ? ["lifecycle_status", ...readinessBlockers] : readinessBlockers
        return {
          id: asset.id,
          label: `${asset.assetTag} - ${asset.name}`,
          // The batch form's row shows the tag, the name and the register's Serial apart (request batches spec §4).
          assetTag: asset.assetTag,
          name: asset.name,
          serialNumber: asset.serialNumber ?? null,
          metadata: [
            asset.status.nameTh,
            `${asset.company.code}/${asset.branch.code}`,
            asset.currentLocation.name,
            asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null,
          ].filter(Boolean).join(" · "),
          eligible: blockers.length === 0,
          blockers,
          outstandingComponentTags: getDisposalOutstandingComponentTags(asset),
          ...(id
            ? {
                card: {
                  name: asset.name,
                  assetTag: asset.assetTag,
                  statusName: asset.status.name,
                  statusNameTh: asset.status.nameTh,
                  locationName: asset.currentLocation.name,
                  branchName: asset.branch.name,
                  custodianName: asset.custodian?.fullNameTh ?? null,
                  photoAttachmentId: cardPhotoId,
                },
              }
            : {}),
        }
      }),
    })
  } catch (error) {
    return errorResponse(error)
  }
}

async function readAssetRegisterPhotoId(assetId: string): Promise<string | null> {
  const images = await prisma.attachment.findMany({
    where: { module: "asset", assetId, isActive: true, fileType: { startsWith: "image/" } },
    select: { id: true, fileType: true },
    orderBy: { uploadedAt: "desc" },
    take: 20,
  })
  return images.find((attachment) => isThumbnailable(attachment.fileType))?.id ?? null
}
