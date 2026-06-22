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
  parentComponents: Array<{
    componentRole: string
    slotNo: string | null
    componentAsset: { id: string; assetTag: string; name: string }
  }>
  installedInLinks: Array<{
    componentRole: string
    slotNo: string | null
    parentAsset: { id: string; assetTag: string; name: string }
  }>
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
        parentComponents: {
          where: { status: "installed", removedAt: null },
          select: {
            componentRole: true,
            slotNo: true,
            componentAsset: { select: { id: true, assetTag: true, name: true } },
          },
        },
        installedInLinks: {
          where: { status: "installed", removedAt: null },
          select: {
            componentRole: true,
            slotNo: true,
            parentAsset: { select: { id: true, assetTag: true, name: true } },
          },
        },
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

    const relatedAssetIds = [
      ...asset.parentComponents.map((component) => component.componentAsset.id),
      ...asset.installedInLinks.map((link) => link.parentAsset.id),
    ]
    const relatedAuditItems = relatedAssetIds.length
      ? await prisma.auditItem.findMany({
          where: { auditRoundId: id, assetId: { in: relatedAssetIds } },
          select: { id: true, assetId: true, auditStatus: true, auditResult: true },
        })
      : []

    const payload = {
      candidates,
      asset: buildAuditScanLookupAsset(asset, relatedAuditItems),
    }

    if (!item) {
      return NextResponse.json({ status: "out_of_scope", ...payload })
    }

    return NextResponse.json({ status: "in_round", ...payload, item })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function buildAuditScanLookupAsset(
  asset: AuditScanLookupAsset,
  relatedAuditItems: Array<{ id: string; assetId: string; auditStatus: string; auditResult: string | null }>
) {
  const location = `${asset.currentLocation.code} - ${asset.currentLocation.name}`
  const category = `${asset.category.code} - ${asset.category.name}`
  const custodian = asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null
  const auditItemByAssetId = new Map(relatedAuditItems.map((item) => [item.assetId, item]))

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
    components: buildAuditComponentLookupContext(asset.parentComponents, auditItemByAssetId),
    installedIn: asset.installedInLinks.map((link) => ({
      parentAssetId: link.parentAsset.id,
      assetTag: link.parentAsset.assetTag,
      name: link.parentAsset.name,
      componentRole: link.componentRole,
      slotNo: link.slotNo,
      auditItem: auditItemByAssetId.get(link.parentAsset.id) ?? null,
    })),
  }
}

function buildAuditComponentLookupContext(
  components: AuditScanLookupAsset["parentComponents"],
  auditItemByAssetId: Map<string, { id: string; assetId: string; auditStatus: string; auditResult: string | null }>
) {
  return components.map((component) => ({
    assetId: component.componentAsset.id,
    assetTag: component.componentAsset.assetTag,
    name: component.componentAsset.name,
    componentRole: component.componentRole,
    slotNo: component.slotNo,
    auditItem: auditItemByAssetId.get(component.componentAsset.id) ?? null,
  }))
}
