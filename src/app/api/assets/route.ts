import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetSchema } from "@/lib/validations/asset"
import { generateAssetTag } from "@/lib/asset-tag"

const assetInclude = {
  category: { select: { code: true, name: true } },
  brand: { select: { name: true } },
  model: { select: { name: true } },
  company: { select: { code: true, nameTh: true } },
  branch: { select: { code: true, name: true } },
  department: { select: { code: true, name: true } },
  custodian: { select: { code: true, fullNameTh: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const assets = await prisma.asset.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { assetTag: { contains: search } },
                { name: { contains: search } },
                { serialNumber: { contains: search } },
                { fixedAssetCode: { contains: search } },
                { category: { code: { contains: search } } },
                { company: { code: { contains: search } } },
                { branch: { code: { contains: search } } },
                { custodian: { fullNameTh: { contains: search } } },
                { currentLocation: { code: { contains: search } } },
              ],
            }
          : {}),
      },
      include: assetInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    return NextResponse.json(assets)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const input = assetSchema.parse(await request.json())
    const assetTag =
      input.assetTag ??
      (await generateAssetTag({
        companyId: input.companyId,
        branchId: input.branchId,
        categoryId: input.categoryId,
      }))

    const asset = await prisma.asset.create({
      data: {
        ...input,
        assetTag,
        createdBy: user.id,
        updatedBy: user.id,
      },
      include: assetInclude,
    })

    await prisma.assetMovement.create({
      data: {
        assetId: asset.id,
        movementType: "create",
        toValue: asset.currentLocationId,
        reason: "Initial asset registration",
        referenceType: "asset",
        referenceId: asset.id,
        performedBy: user.id,
        remark: input.remark,
      },
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "asset",
      recordId: asset.id,
      newValue: { ...input, assetTag },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
