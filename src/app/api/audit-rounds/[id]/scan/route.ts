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

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.auditItem.update({
        where: { id: item.id },
        data: {
          actualDepartmentId: actual.departmentId,
          actualLocationId: actual.locationId,
          actualCustodianId: actual.custodianId,
          actualConditionId: actual.conditionId,
          auditStatus: "scanned",
          auditResult,
          findingRequired: mismatches.length > 0,
          reconcileStatus: mismatches.length > 0 ? "pending" : null,
          scannedAt: item.scannedAt ?? scannedAt,
          scannedBy: item.scannedBy ?? user.id,
          lastScanAt: scannedAt,
          scanCount: { increment: 1 },
          remark: input.remark,
        },
      })

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
          select: { findingType: true },
        })
        const existingTypes = new Set(existingFindings.map((finding) => finding.findingType))
        const newFindings = mismatches.filter((mismatch) => !existingTypes.has(mismatch.type))

        if (newFindings.length > 0) {
          await tx.auditFinding.createMany({
            data: newFindings.map((mismatch) => ({
              auditRoundId: id,
              auditItemId: item.id,
              assetId: item.assetId,
              findingType: mismatch.type,
              expectedValue: mismatch.expectedValue,
              actualValue: mismatch.actualValue,
              remark: input.remark,
              reportedBy: user.id,
              reviewStatus: "pending",
            })),
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
      },
      remark: input.remark ?? undefined,
    })

    return NextResponse.json({ item: result, auditResult, mismatches })
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
