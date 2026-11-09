import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { disposalAssetOptionSelect, toDisposalAssetOption } from "@/lib/disposal-asset-option"
import { isThumbnailable } from "@/lib/attachment-thumbnail"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "create")
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
    const id = (request.nextUrl.searchParams.get("id") ?? "").trim()
    // ?type=lost (the forms send it for a สูญหาย request) lets หาไม่พบ through; without it nothing changes.
    const disposalType = (request.nextUrl.searchParams.get("type") ?? "").trim() || null
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
      select: disposalAssetOptionSelect,
      orderBy: { assetTag: "asc" },
      take: id ? 1 : 100,
    })

    // ?id= (the request form's asset card) also returns the card: the asset's register photo is read the way the asset
    // page reads it, the newest active image of module "asset" that has a thumbnail. The q= branch is unchanged.
    const cardPhotoId = id && assets.length > 0 ? await readAssetRegisterPhotoId(assets[0].id) : null

    return NextResponse.json({
      data: assets.slice(0, 50).map((asset) => ({
        ...toDisposalAssetOption(asset, disposalType),
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
      })),
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
