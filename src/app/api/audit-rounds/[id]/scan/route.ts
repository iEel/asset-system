import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { auditScanSchema } from "@/lib/validations/audit"

type AuditScanContext = {
  params: Promise<{ id: string }>
}

type Mismatch = {
  type: string
  expectedValue: string | null
  actualValue: string | null
}

const resultByFindingType: Record<string, string> = {
  wrong_location: "wrong_location",
  wrong_custodian: "wrong_custodian",
  wrong_department: "wrong_department",
  wrong_condition: "wrong_condition",
}

const immediateCorrectionTypes = new Set(["wrong_location", "wrong_custodian"])

const movementTypeByFindingType: Record<string, string> = {
  wrong_location: "audit_location_correction",
  wrong_custodian: "audit_custodian_correction",
}

export async function POST(request: NextRequest, context: AuditScanContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "edit")

    const { id } = await context.params
    const input = auditScanSchema.parse(await request.json())
    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      select: { id: true, status: true },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })
    if (round.status === "closed") {
      return NextResponse.json({ error: "Audit round is closed" }, { status: 400 })
    }

    const item = await prisma.auditItem.findUnique({
      where: { auditRoundId_assetId: { auditRoundId: id, assetId: input.assetId } },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            currentLocationId: true,
            custodianId: true,
          },
        },
      },
    })
    if (!item) {
      const asset = await prisma.asset.findFirst({
        where: { id: input.assetId, isActive: true },
        select: { id: true, assetTag: true, name: true },
      })
      if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

      await prisma.auditScanHistory.create({
        data: {
          auditRoundId: id,
          assetId: asset.id,
          scannedBy: user.id,
          scanSource: input.scanSource,
          rawPayload: JSON.stringify(input),
          remark: input.remark,
        },
      })

      return NextResponse.json(
        {
          status: "out_of_scope",
          auditResult: "out_of_scope",
          message: "Asset is not in this audit scope",
          asset,
        },
        { status: 202 }
      )
    }

    const actual = {
      departmentId: input.actualDepartmentId ?? item.expectedDepartmentId,
      locationId: input.actualLocationId ?? item.expectedLocationId,
      custodianId: input.actualCustodianId ?? item.expectedCustodianId,
      conditionId: input.actualConditionId ?? item.expectedConditionId,
    }
    const mismatches = getMismatches(item, actual)
    const auditResult = mismatches.length === 0 ? "found" : mismatches.length === 1 ? resultByFindingType[mismatches[0].type] : "need_review"
    const scannedAt = new Date()
    const correctionMismatches = input.applyCorrections
      ? mismatches.filter((mismatch) => immediateCorrectionTypes.has(mismatch.type))
      : []
    const correctionTypes = new Set(correctionMismatches.map((mismatch) => mismatch.type))
    const pendingMismatchCount = mismatches.filter((mismatch) => !correctionTypes.has(mismatch.type)).length
    let resolvedNotFoundFinding = false

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.auditItem.update({
        where: { id: item.id },
        data: {
          actualDepartmentId: actual.departmentId,
          actualLocationId: actual.locationId,
          actualCustodianId: actual.custodianId,
          actualConditionId: actual.conditionId,
          auditStatus: correctionMismatches.length > 0 && pendingMismatchCount === 0 ? "reconciled" : "scanned",
          auditResult,
          findingRequired: mismatches.length > 0,
          reconcileStatus: mismatches.length === 0 ? null : pendingMismatchCount > 0 ? "pending" : "approved",
          scannedAt: item.scannedAt ?? scannedAt,
          scannedBy: item.scannedBy ?? user.id,
          lastScanAt: scannedAt,
          scanCount: { increment: 1 },
          remark: input.remark,
        },
      })

      const resolvedNotFound = await tx.auditFinding.updateMany({
        where: {
          auditItemId: item.id,
          findingType: "not_found",
          reviewStatus: "pending",
        },
        data: {
          reviewStatus: "rejected",
          reviewedBy: user.id,
          reviewedAt: scannedAt,
          reviewRemark: input.remark ?? "Asset found by later audit scan",
          actionTaken: "found_later_by_audit_scan",
        },
      })
      resolvedNotFoundFinding = resolvedNotFound.count > 0

      await tx.auditScanHistory.create({
        data: {
          auditRoundId: id,
          auditItemId: item.id,
          assetId: item.assetId,
          scannedBy: user.id,
          scannedAt,
          scanLocationId: actual.locationId,
          scanSource: input.scanSource,
          rawPayload: JSON.stringify({ ...input, actual }),
          remark: input.remark,
        },
      })

      if (mismatches.length > 0) {
        const existingFindings = await tx.auditFinding.findMany({
          where: {
            auditItemId: item.id,
            reviewStatus: "pending",
            findingType: { in: mismatches.map((mismatch) => mismatch.type) },
          },
          select: { id: true, findingType: true },
        })
        const existingByType = new Map(existingFindings.map((finding) => [finding.findingType, finding]))
        const assetUpdateData: { currentLocationId?: string; custodianId?: string | null; updatedBy?: string } = {}

        for (const mismatch of mismatches) {
          const existingFinding = existingByType.get(mismatch.type)
          const shouldApplyCorrection = correctionTypes.has(mismatch.type)

          if (!shouldApplyCorrection) {
            if (!existingFinding) {
              await tx.auditFinding.create({
                data: {
                  auditRoundId: id,
                  auditItemId: item.id,
                  assetId: item.assetId,
                  findingType: mismatch.type,
                  expectedValue: mismatch.expectedValue,
                  actualValue: mismatch.actualValue,
                  remark: input.remark,
                  reportedBy: user.id,
                  reviewStatus: "pending",
                },
              })
            }
            continue
          }

          const reviewedFinding = existingFinding
            ? await tx.auditFinding.update({
                where: { id: existingFinding.id },
                data: {
                  expectedValue: mismatch.expectedValue,
                  actualValue: mismatch.actualValue,
                  remark: input.remark,
                  reviewStatus: "approved",
                  reviewedBy: user.id,
                  reviewedAt: scannedAt,
                  reviewRemark: input.remark,
                  actionTaken: "master_asset_updated_from_audit_scan",
                },
              })
            : await tx.auditFinding.create({
                data: {
                  auditRoundId: id,
                  auditItemId: item.id,
                  assetId: item.assetId,
                  findingType: mismatch.type,
                  expectedValue: mismatch.expectedValue,
                  actualValue: mismatch.actualValue,
                  remark: input.remark,
                  reportedBy: user.id,
                  reviewStatus: "approved",
                  reviewedBy: user.id,
                  reviewedAt: scannedAt,
                  reviewRemark: input.remark,
                  actionTaken: "master_asset_updated_from_audit_scan",
                },
              })

          const fromValue = getCurrentAssetValue(item.asset, mismatch.type)
          if ((fromValue ?? null) !== (mismatch.actualValue ?? null)) {
            if (mismatch.type === "wrong_location" && mismatch.actualValue) {
              assetUpdateData.currentLocationId = mismatch.actualValue
            }
            if (mismatch.type === "wrong_custodian") {
              assetUpdateData.custodianId = mismatch.actualValue
            }

            await tx.assetMovement.create({
              data: {
                assetId: item.assetId,
                movementType: movementTypeByFindingType[mismatch.type] ?? "audit_correction",
                fromValue,
                toValue: mismatch.actualValue,
                reason: "Audit scan correction",
                referenceType: "audit_finding",
                referenceId: reviewedFinding.id,
                performedBy: user.id,
                performedAt: scannedAt,
                remark: input.remark,
              },
            })
          }
        }

        if (Object.keys(assetUpdateData).length > 0) {
          await tx.asset.update({
            where: { id: item.assetId },
            data: {
              ...assetUpdateData,
              updatedBy: user.id,
            },
          })
        }
      }

      return updatedItem
    })

    await logAudit({
      userId: user.id,
      action: "scan",
      module: "audit",
      recordId: item.id,
      oldValue: {
        auditStatus: item.auditStatus,
        auditResult: item.auditResult,
        scanCount: item.scanCount,
      },
      newValue: {
        auditStatus: result.auditStatus,
        auditResult: result.auditResult,
        scanCount: result.scanCount,
        mismatches,
        appliedCorrections: correctionMismatches,
        resolvedNotFoundFinding,
      },
      remark: input.remark ?? undefined,
    })

    return NextResponse.json({
      item: result,
      auditResult,
      mismatches,
      appliedCorrections: correctionMismatches,
      resolvedNotFoundFinding,
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function getMismatches(
  item: {
    expectedDepartmentId: string | null
    expectedLocationId: string
    expectedCustodianId: string | null
    expectedConditionId: string | null
  },
  actual: {
    departmentId: string | null
    locationId: string
    custodianId: string | null
    conditionId: string | null
  }
) {
  const mismatches: Mismatch[] = []

  addMismatch(mismatches, "wrong_location", item.expectedLocationId, actual.locationId)
  addMismatch(mismatches, "wrong_custodian", item.expectedCustodianId, actual.custodianId)
  addMismatch(mismatches, "wrong_department", item.expectedDepartmentId, actual.departmentId)
  addMismatch(mismatches, "wrong_condition", item.expectedConditionId, actual.conditionId)

  return mismatches
}

function addMismatch(mismatches: Mismatch[], type: string, expectedValue: string | null, actualValue: string | null) {
  if ((expectedValue ?? null) !== (actualValue ?? null)) {
    mismatches.push({ type, expectedValue, actualValue })
  }
}

function getCurrentAssetValue(
  asset: { currentLocationId: string; custodianId: string | null },
  findingType: string
) {
  if (findingType === "wrong_location") return asset.currentLocationId
  if (findingType === "wrong_custodian") return asset.custodianId
  return null
}
