import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { extractAssetLookupCandidatesFromScanValue } from "@/lib/asset-qr"
import { auditScanLookupSchema } from "@/lib/validations/audit"

type AuditScanLookupContext = {
  params: Promise<{ id: string }>
}

type AuditScanLookupAsset = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  fixedAssetCode: string | null
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  conditionId: string | null
  ownershipType: string | null
  category: { code: string; name: string }
  custodian: { code: string; fullNameTh: string } | null
  currentLocation: { code: string; name: string }
  status: { name: string; nameTh: string; colorCode: string | null }
}

export async function POST(request: NextRequest, context: AuditScanLookupContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "edit")

    const { id } = await context.params
    const input = auditScanLookupSchema.parse(await request.json())
    const candidates = extractAssetLookupCandidatesFromScanValue(input.rawValue)

    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      select: { id: true, status: true },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })

    if (candidates.length === 0) {
      return NextResponse.json({ status: "unknown_asset", candidates })
    }

    const asset = await prisma.asset.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: { in: candidates } },
          { assetTag: { in: candidates } },
          { serialNumber: { in: candidates } },
          { fixedAssetCode: { in: candidates } },
        ],
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        serialNumber: true,
        fixedAssetCode: true,
        currentLocationId: true,
        custodianId: true,
        departmentId: true,
        conditionId: true,
        ownershipType: true,
        category: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        currentLocation: { select: { code: true, name: true } },
        status: { select: { name: true, nameTh: true, colorCode: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { assetTag: "asc" }],
    })

    if (!asset) {
      return NextResponse.json({ status: "unknown_asset", candidates })
    }

    const item = await prisma.auditItem.findUnique({
      where: { auditRoundId_assetId: { auditRoundId: id, assetId: asset.id } },
      select: {
        id: true,
        assetId: true,
        auditStatus: true,
        auditResult: true,
      },
    })

    const payload = {
      candidates,
      asset: buildAuditScanLookupAsset(asset),
    }

    if (!item) {
      return NextResponse.json({ status: "out_of_scope", ...payload })
    }

    return NextResponse.json({ status: "in_round", ...payload, item })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function buildAuditScanLookupAsset(asset: AuditScanLookupAsset) {
  const location = `${asset.currentLocation.code} - ${asset.currentLocation.name}`
  const category = `${asset.category.code} - ${asset.category.name}`
  const custodian = asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null

  return {
    id: asset.id,
    assetTag: asset.assetTag,
    title: asset.assetTag,
    subtitle: asset.name,
    serialNumber: asset.serialNumber,
    fixedAssetCode: asset.fixedAssetCode,
    currentLocationId: asset.currentLocationId,
    custodianId: asset.custodianId,
    departmentId: asset.departmentId,
    conditionId: asset.conditionId,
    ownershipType: asset.ownershipType,
    status: {
      label: asset.status.nameTh,
      colorCode: asset.status.colorCode,
    },
    meta: { custodian, location, category },
  }
}
