import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth, requirePermission } from "@/lib/auth-utils"
import { canApplyAuditScanCorrections } from "@/lib/audit-segregation"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getAuditRoundReadOnlyError } from "@/lib/audit-round-status"
import { normalizeAssetOwnershipType, requiresCustodian } from "@/lib/asset-ownership"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import {
  buildComponentConfirmationFindingActions,
  isRetryableComponentConfirmationTransactionError,
} from "@/lib/audit-component-confirmation"
import { auditScanSchema } from "@/lib/validations/audit"
import { isAuditRoundOwnItem } from "@/lib/audit-round-counts-rules"
import { auditOutOfScopeRescanEvidenceFields, planAuditOutOfScopeRescanFindings } from "@/lib/audit-out-of-scope-rescan"

type AuditScanContext = {
  params: Promise<{ id: string }>
}

type Mismatch = {
  type: string
  expectedValue: string | null
  actualValue: string | null
}

type ActualValues = {
  departmentId: string | null
  locationId: string
  custodianId: string | null
  conditionId: string | null
}

const resultByFindingType: Record<string, string> = {
  wrong_location: "wrong_location",
  wrong_custodian: "wrong_custodian",
  wrong_department: "wrong_department",
  wrong_condition: "wrong_condition",
}

const immediateCorrectionTypes = new Set(["wrong_location", "wrong_custodian"])
const auditCorrectableFindingTypes = ["wrong_location", "wrong_custodian", "wrong_department", "wrong_condition"] as const
const staleFindingReviewRemark = "ยกเลิกเพราะแก้ผลตรวจ"

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
    const readOnlyError = getAuditRoundReadOnlyError(round.status)
    if (readOnlyError) {
      return NextResponse.json({ error: readOnlyError }, { status: 400 })
    }

    const item = await prisma.auditItem.findUnique({
      where: { auditRoundId_assetId: { auditRoundId: id, assetId: input.assetId } },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            ownershipType: true,
            currentLocationId: true,
            custodianId: true,
          },
        },
      },
    })
    const componentConfirmationRemark = input.componentConfirmationReason ?? input.remark
    if (input.confirmedWithParentAssetId && !componentConfirmationRemark) {
      return NextResponse.json({ error: "Component confirmation reason is required" }, { status: 400 })
    }

    if (!item) {
      if (input.confirmedWithParentAssetId) {
        return NextResponse.json({ error: "Component is not included in this audit round" }, { status: 400 })
      }
      const asset = await prisma.asset.findFirst({
        where: { id: input.assetId, isActive: true },
        select: {
          id: true,
          assetTag: true,
          name: true,
          companyId: true,
          branchId: true,
          departmentId: true,
          ownershipType: true,
          currentLocationId: true,
          custodianId: true,
          conditionId: true,
        },
      })
      if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

      const actual = {
        departmentId: optionalActualValue(input.actualDepartmentId, asset.departmentId),
        locationId: input.actualLocationId ?? asset.currentLocationId,
        custodianId: optionalActualValue(input.actualCustodianId, asset.custodianId),
        conditionId: optionalActualValue(input.actualConditionId, asset.conditionId),
      }
      const fieldFindings = buildOutOfScopeFieldFindings(asset, actual)
      const fieldFindingTypes = fieldFindings.map((finding) => finding.type)
      const evidenceAttachmentIds = Array.from(new Set(input.evidenceAttachmentIds))
      if (fieldFindings.length > 0 && evidenceAttachmentIds.length === 0) {
        return NextResponse.json({ error: "Evidence attachment is required for changed out-of-scope actual fields" }, { status: 400 })
      }
      const evidenceAttachments =
        evidenceAttachmentIds.length > 0
          ? await prisma.attachment.findMany({
              where: {
                id: { in: evidenceAttachmentIds },
                assetId: asset.id,
                module: "asset",
                isActive: true,
                uploadedBy: user.id,
              },
              select: {
                fileName: true,
                originalName: true,
                fileType: true,
                fileSize: true,
                filePath: true,
              },
            })
          : []
      if (evidenceAttachments.length !== evidenceAttachmentIds.length) {
        return NextResponse.json({ error: "Evidence attachment is invalid for this asset" }, { status: 400 })
      }
      const scannedAt = new Date()
      const outOfScopeItem = await prisma.$transaction(async (tx) => {
        const createdItem = await tx.auditItem.create({
          data: {
            auditRoundId: id,
            assetId: asset.id,
            expectedCompanyId: asset.companyId,
            expectedBranchId: asset.branchId,
            expectedDepartmentId: asset.departmentId,
            expectedLocationId: asset.currentLocationId,
            expectedCustodianId: asset.custodianId,
            expectedConditionId: asset.conditionId,
            actualDepartmentId: actual.departmentId,
            actualLocationId: actual.locationId,
            actualCustodianId: actual.custodianId,
            actualConditionId: actual.conditionId,
            auditStatus: "reviewed",
            auditResult: "out_of_scope",
            findingRequired: true,
            reconcileStatus: "pending",
            scannedAt,
            scannedBy: user.id,
            lastScanAt: scannedAt,
            scanCount: 1,
            remark: input.remark,
          },
        })

        await tx.auditScanHistory.create({
          data: {
            auditRoundId: id,
            auditItemId: null,
            assetId: asset.id,
            scannedBy: user.id,
            scannedAt,
            scanLocationId: actual.locationId,
            scanSource: input.scanSource,
            rawPayload: JSON.stringify({ ...input, actual, outOfScope: true }),
            remark: input.remark,
          },
        })

        const outOfScopeFinding = await tx.auditFinding.create({
          data: {
            auditRoundId: id,
            auditItemId: createdItem.id,
            assetId: asset.id,
            findingType: "out_of_scope",
            expectedValue: null,
            actualValue: JSON.stringify({
              assetTag: asset.assetTag,
              assetName: asset.name,
              locationId: actual.locationId,
              custodianId: actual.custodianId,
              departmentId: actual.departmentId,
              conditionId: actual.conditionId,
            }),
            remark: input.remark,
            reportedBy: user.id,
            reviewStatus: "pending",
            actionTaken: "out_of_scope_detected_by_audit_scan",
          },
        })

        const evidenceFindingIds = [outOfScopeFinding.id]
        for (const fieldFinding of fieldFindings) {
          const createdFieldFinding = await tx.auditFinding.create({
            data: {
              auditRoundId: id,
              auditItemId: createdItem.id,
              assetId: asset.id,
              findingType: fieldFinding.type,
              expectedValue: fieldFinding.expectedValue,
              actualValue: fieldFinding.actualValue,
              reportedBy: user.id,
              reviewStatus: "pending",
              remark: input.remark,
              actionTaken: "out_of_scope_actual_field_reported",
            },
          })
          evidenceFindingIds.push(createdFieldFinding.id)
        }

        if (evidenceAttachments.length > 0) {
          await tx.attachment.createMany({
            data: evidenceFindingIds.flatMap((findingId) =>
              evidenceAttachments.map((attachment) => ({
                assetId: asset.id,
                module: "audit_finding",
                referenceId: findingId,
                fileName: attachment.fileName,
                originalName: attachment.originalName,
                fileType: attachment.fileType,
                fileSize: attachment.fileSize,
                filePath: attachment.filePath,
                uploadedBy: user.id,
              }))
            ),
          })
        }

        return createdItem
      })

      await logAudit({
        userId: user.id,
        action: "scan_out_of_scope",
        module: "audit",
        recordId: outOfScopeItem.id,
        newValue: { auditRoundId: id, assetId: asset.id, auditResult: "out_of_scope", fieldFindingTypes },
        remark: input.remark ?? undefined,
      })

      return NextResponse.json(
        {
          status: "out_of_scope",
          auditResult: "out_of_scope",
          message: "Asset is not in this audit scope",
          asset,
          item: outOfScopeItem,
        },
        { status: 202 }
      )
    }

    // A re-scan of a recorded out-of-scope find (group 2 plan 3, P3-R3). The find stays out of scope: its result and
    // status stay, the found values are compared with the snapshot its first scan took (expected*), a differing field
    // whose found value changes in this save needs the scanner's own photo as evidence (P3-R18: a remark-only edit needs
    // none), and the master asset never changes here, whoever saves. Without this branch the in-round path below would
    // overwrite the result and make the find an own item.
    if (!isAuditRoundOwnItem(item)) {
      if (input.confirmedWithParentAssetId) {
        return NextResponse.json({ error: "Component is not included in this audit round" }, { status: 400 })
      }
      // A value the request leaves out stays as the last scan found it.
      const actual: ActualValues = {
        departmentId: optionalActualValue(input.actualDepartmentId, item.actualDepartmentId),
        locationId: input.actualLocationId ?? item.actualLocationId ?? item.expectedLocationId,
        custodianId: optionalActualValue(input.actualCustodianId, item.actualCustodianId),
        conditionId: optionalActualValue(input.actualConditionId, item.actualConditionId),
      }
      const snapshot = {
        departmentId: item.expectedDepartmentId,
        currentLocationId: item.expectedLocationId,
        custodianId: item.expectedCustodianId,
        conditionId: item.expectedConditionId,
        ownershipType: item.asset.ownershipType,
      }
      const fieldFindings = buildOutOfScopeFieldFindings(snapshot, actual)
      const fieldFindingTypes = fieldFindings.map((finding) => finding.type)
      // P3-R18: evidence only for a differing field whose found value this save changes from the recorded one.
      const recordedByType: Record<string, string | null> = {
        wrong_location: item.actualLocationId ?? item.expectedLocationId,
        wrong_custodian: item.actualCustodianId,
        wrong_department: item.actualDepartmentId,
        wrong_condition: item.actualConditionId,
      }
      const savingByType = Object.fromEntries(fieldFindings.map((finding) => [finding.type, finding.actualValue]))
      const evidenceFieldTypes = auditOutOfScopeRescanEvidenceFields(fieldFindingTypes, savingByType, recordedByType)
      const evidenceAttachmentIds = Array.from(new Set(input.evidenceAttachmentIds))
      if (evidenceFieldTypes.length > 0 && evidenceAttachmentIds.length === 0) {
        return NextResponse.json({ error: "Evidence attachment is required for changed out-of-scope actual fields" }, { status: 400 })
      }
      const evidenceAttachments = await findOutOfScopeEvidence(item.assetId, user.id, evidenceAttachmentIds)
      if (evidenceAttachments.length !== evidenceAttachmentIds.length) {
        return NextResponse.json({ error: "Evidence attachment is invalid for this asset" }, { status: 400 })
      }
      const scannedAt = new Date()
      const rescan = await prisma.$transaction(async (tx) => {
        await tx.auditScanHistory.create({
          data: {
            auditRoundId: id,
            auditItemId: item.id,
            assetId: item.assetId,
            scannedBy: user.id,
            scannedAt,
            scanLocationId: actual.locationId,
            scanSource: input.scanSource,
            rawPayload: JSON.stringify({ ...input, actual, outOfScope: true, rescan: true }),
            remark: input.remark,
          },
        })

        const knownFindings = await tx.auditFinding.findMany({
          where: { auditItemId: item.id, findingType: { in: [...auditCorrectableFindingTypes] }, reviewStatus: { in: ["pending", "approved"] } },
          select: { id: true, findingType: true, actualValue: true, reviewStatus: true },
        })
        const plan = planAuditOutOfScopeRescanFindings(knownFindings, fieldFindings, evidenceFieldTypes)
        const evidenceFindingIds: string[] = []

        // The pending out_of_scope finding shows what was found; a decided one is left as the reviewer left it.
        const outOfScopeFinding = await tx.auditFinding.findFirst({
          where: { auditItemId: item.id, findingType: "out_of_scope", reviewStatus: "pending" },
          select: { id: true },
        })
        if (outOfScopeFinding) {
          await tx.auditFinding.update({
            where: { id: outOfScopeFinding.id },
            data: {
              actualValue: JSON.stringify({
                assetTag: item.asset.assetTag,
                assetName: item.asset.name,
                locationId: actual.locationId,
                custodianId: actual.custodianId,
                departmentId: actual.departmentId,
                conditionId: actual.conditionId,
              }),
              remark: input.remark,
            },
          })
          evidenceFindingIds.push(outOfScopeFinding.id)
        }

        for (const fieldFinding of plan.create) {
          const created = await tx.auditFinding.create({
            data: {
              auditRoundId: id,
              auditItemId: item.id,
              assetId: item.assetId,
              findingType: fieldFinding.type,
              expectedValue: fieldFinding.expectedValue,
              actualValue: fieldFinding.actualValue,
              reportedBy: user.id,
              reviewStatus: "pending",
              remark: input.remark,
              actionTaken: "out_of_scope_actual_field_reported",
            },
          })
          evidenceFindingIds.push(created.id)
        }
        for (const { findingId, finding } of plan.update) {
          await tx.auditFinding.update({ where: { id: findingId }, data: { actualValue: finding.actualValue, remark: input.remark } })
          evidenceFindingIds.push(findingId)
        }
        if (plan.reject.length > 0) {
          await tx.auditFinding.updateMany({
            where: { id: { in: plan.reject }, reviewStatus: "pending" },
            data: { reviewStatus: "rejected", reviewRemark: staleFindingReviewRemark, reviewedBy: user.id, reviewedAt: scannedAt },
          })
        }

        if (evidenceAttachments.length > 0 && evidenceFindingIds.length > 0) {
          await tx.attachment.createMany({
            data: evidenceFindingIds.flatMap((findingId) =>
              evidenceAttachments.map((attachment) => ({
                assetId: item.assetId,
                module: "audit_finding",
                referenceId: findingId,
                fileName: attachment.fileName,
                originalName: attachment.originalName,
                fileType: attachment.fileType,
                fileSize: attachment.fileSize,
                filePath: attachment.filePath,
                uploadedBy: user.id,
              }))
            ),
          })
        }

        const pendingFindingCount = await tx.auditFinding.count({ where: { auditItemId: item.id, reviewStatus: "pending" } })
        return tx.auditItem.update({
          where: { id: item.id },
          data: {
            actualDepartmentId: actual.departmentId,
            actualLocationId: actual.locationId,
            actualCustodianId: actual.custodianId,
            actualConditionId: actual.conditionId,
            lastScanAt: scannedAt,
            scanCount: { increment: 1 },
            remark: input.remark,
            ...(pendingFindingCount > 0 ? { findingRequired: true, reconcileStatus: "pending" } : {}),
          },
        })
      })

      await logAudit({
        userId: user.id,
        action: "scan_result_corrected",
        module: "audit",
        recordId: item.id,
        oldValue: {
          auditStatus: item.auditStatus,
          auditResult: item.auditResult,
          scanCount: item.scanCount,
          actualDepartmentId: item.actualDepartmentId,
          actualLocationId: item.actualLocationId,
          actualCustodianId: item.actualCustodianId,
          actualConditionId: item.actualConditionId,
          remark: item.remark,
        },
        newValue: {
          auditRoundId: id,
          auditItemId: item.id,
          assetId: item.assetId,
          auditStatus: rescan.auditStatus,
          auditResult: rescan.auditResult,
          scanCount: rescan.scanCount,
          actualDepartmentId: rescan.actualDepartmentId,
          actualLocationId: rescan.actualLocationId,
          actualCustodianId: rescan.actualCustodianId,
          actualConditionId: rescan.actualConditionId,
          remark: rescan.remark,
          outOfScope: true,
          fieldFindingTypes,
        },
        remark: input.remark ?? undefined,
      })

      const rescannedBy = rescan.scannedBy
        ? await prisma.user.findUnique({ where: { id: rescan.scannedBy }, select: { displayName: true } })
        : null

      return NextResponse.json({
        status: "out_of_scope",
        auditResult: "out_of_scope",
        item: rescan,
        scannedByName: rescannedBy?.displayName ?? null,
      })
    }

    if (input.confirmedWithParentAssetId) {
      const parentAssetId = input.confirmedWithParentAssetId
      const confirmationRemark = componentConfirmationRemark as string
      const actual = {
        departmentId: optionalActualValue(input.actualDepartmentId, item.expectedDepartmentId),
        locationId: input.actualLocationId ?? item.expectedLocationId,
        custodianId: optionalActualValue(input.actualCustodianId, item.expectedCustodianId),
        conditionId: optionalActualValue(input.actualConditionId, item.expectedConditionId),
      }
      const mismatches = getMismatches(item, actual, item.asset.ownershipType)
      const scannedAt = new Date()

      const result = await runComponentConfirmationTransaction(async (tx) => {
        const componentLink = await assertComponentInstalledUnderParent(tx, id, parentAssetId, item.assetId)

        await tx.auditScanHistory.create({
          data: {
            auditRoundId: id,
            auditItemId: item.id,
            assetId: item.assetId,
            scannedBy: user.id,
            scannedAt,
            scanLocationId: actual.locationId,
            scanSource: input.scanSource,
            rawPayload: JSON.stringify({
              ...input,
              actual,
              confirmedWithParent: true,
              parentAssetId: componentLink.parentAssetId,
              parentAssetTag: componentLink.parentAsset.assetTag,
            }),
            remark: confirmationRemark,
          },
        })

        const currentMismatchTypes = mismatches.map((mismatch) => mismatch.type)
        const existingPendingFindings = await tx.auditFinding.findMany({
          where: {
            auditItemId: item.id,
            reviewStatus: "pending",
            ...(currentMismatchTypes.length > 0
              ? { OR: [{ findingType: { in: currentMismatchTypes } }, { actionTaken: "component_confirmed_with_parent_mismatch" }] }
              : { actionTaken: "component_confirmed_with_parent_mismatch" }),
          },
          select: { id: true, findingType: true },
        })
        const findingActions = buildComponentConfirmationFindingActions(existingPendingFindings, mismatches)

        for (const action of findingActions.update) {
          await tx.auditFinding.update({
            where: { id: action.findingId },
            data: {
              expectedValue: action.mismatch.expectedValue,
              actualValue: action.mismatch.actualValue,
              remark: confirmationRemark,
              reportedBy: user.id,
              actionTaken: "component_confirmed_with_parent_mismatch",
            },
          })
        }

        for (const mismatch of findingActions.create) {
          await tx.auditFinding.create({
            data: {
              auditRoundId: id,
              auditItemId: item.id,
              assetId: item.assetId,
              findingType: mismatch.type,
              expectedValue: mismatch.expectedValue,
              actualValue: mismatch.actualValue,
              remark: confirmationRemark,
              reportedBy: user.id,
              reviewStatus: "pending",
              actionTaken: "component_confirmed_with_parent_mismatch",
            },
          })
        }

        for (const action of findingActions.reject) {
          await tx.auditFinding.update({
            where: { id: action.findingId },
            data: {
              reviewStatus: "rejected",
              reviewedBy: user.id,
              reviewedAt: scannedAt,
              reviewRemark: confirmationRemark,
              actionTaken: "component_confirmed_with_parent_mismatch_resolved",
            },
          })
        }

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
            reviewRemark: confirmationRemark ?? "Component confirmed with parent by later audit scan",
            actionTaken: "found_later_by_component_confirmation",
          },
        })

        const pendingFindingCount = await tx.auditFinding.count({
          where: { auditItemId: item.id, reviewStatus: "pending" },
        })
        const updatedItem = await tx.auditItem.update({
          where: { id: item.id },
          data: {
            actualDepartmentId: actual.departmentId,
            actualLocationId: actual.locationId,
            actualCustodianId: actual.custodianId,
            actualConditionId: actual.conditionId,
            auditStatus: "scanned",
            auditResult: "confirmed_with_parent",
            findingRequired: pendingFindingCount > 0,
            reconcileStatus: pendingFindingCount > 0 ? "pending" : null,
            scannedAt: item.scannedAt ?? scannedAt,
            scannedBy: item.scannedBy ?? user.id,
            lastScanAt: scannedAt,
            scanCount: { increment: 1 },
            remark: confirmationRemark,
          },
        })

        return { item: updatedItem, componentLink, resolvedNotFoundFinding: resolvedNotFound.count > 0 }
      })

      await logAudit({
        userId: user.id,
        action: "component_confirmed_with_parent",
        module: "audit",
        recordId: item.id,
        newValue: {
          auditRoundId: id,
          assetId: item.assetId,
          parentAssetId: result.componentLink.parentAssetId,
          parentAssetTag: result.componentLink.parentAsset.assetTag,
          mismatches,
        },
        remark: confirmationRemark,
      })

      return NextResponse.json({
        item: result.item,
        auditResult: "confirmed_with_parent",
        mismatches,
        appliedCorrections: [],
        resolvedNotFoundFinding: result.resolvedNotFoundFinding,
      })
    }

    const actual = {
      departmentId: optionalActualValue(input.actualDepartmentId, item.expectedDepartmentId),
      locationId: input.actualLocationId ?? item.expectedLocationId,
      custodianId: optionalActualValue(input.actualCustodianId, item.expectedCustodianId),
      conditionId: optionalActualValue(input.actualConditionId, item.expectedConditionId),
    }
    const mismatches = getMismatches(item, actual, item.asset.ownershipType)
    const auditResult = mismatches.length === 0 ? "found" : mismatches.length === 1 ? resultByFindingType[mismatches[0].type] : "need_review"
    const scannedAt = new Date()
    const correctionsAllowed = input.applyCorrections && canApplyAuditScanCorrections({
      canApprove: hasPermission(user, "audit", "approve"),
      segregationRequired: parseWorkflowApprovalPolicy(await prisma.systemSetting.findMany({
        where: { key: { in: [...workflowApprovalSettingKeys] } },
        select: { key: true, value: true },
      })).segregationRequired,
    })
    const correctionMismatches = correctionsAllowed
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
          select: { id: true, findingType: true, actualValue: true },
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
            } else if ((existingFinding.actualValue ?? null) !== (mismatch.actualValue ?? null)) {
              await tx.auditFinding.update({
                where: { id: existingFinding.id },
                data: { actualValue: mismatch.actualValue, remark: input.remark },
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

          const confirmedComponentIds = await getConfirmedComponentAssetIds(tx, id, item.assetId)
          if (confirmedComponentIds.length > 0) {
            await syncInstalledComponentsWithParent(tx, {
              parentAssetId: item.assetId,
              changes: {
                currentLocationId: assetUpdateData.currentLocationId,
                custodianId: assetUpdateData.custodianId,
              },
              movementType: "parent_audit_confirmation_sync",
              referenceType: "audit_scan",
              referenceId: item.id,
              performedBy: user.id,
              reason: "Parent audit scan correction",
              remark: input.remark,
              restrictToAssetIds: confirmedComponentIds,
            })
          }
        }
      }

      const staleFindingTypes = auditCorrectableFindingTypes.filter((type) => !mismatches.some((mismatch) => mismatch.type === type))
      if (staleFindingTypes.length > 0) {
        await tx.auditFinding.updateMany({
          where: {
            auditItemId: item.id,
            reviewStatus: "pending",
            findingType: { in: [...staleFindingTypes] },
            OR: [{ actionTaken: null }, { actionTaken: { not: "component_confirmed_with_parent_mismatch" } }],
          },
          data: {
            reviewStatus: "rejected",
            reviewRemark: staleFindingReviewRemark,
            reviewedBy: user.id,
            reviewedAt: scannedAt,
          },
        })
      }

      return updatedItem
    })

    await logAudit({
      userId: user.id,
      action: input.resultCorrection ? "scan_result_corrected" : "scan",
      module: "audit",
      recordId: item.id,
      oldValue: {
        auditStatus: item.auditStatus,
        auditResult: item.auditResult,
        scanCount: item.scanCount,
        actualDepartmentId: item.actualDepartmentId,
        actualLocationId: item.actualLocationId,
        actualCustodianId: item.actualCustodianId,
        actualConditionId: item.actualConditionId,
        remark: item.remark,
      },
      newValue: {
        auditRoundId: id,
        auditItemId: item.id,
        assetId: item.assetId,
        auditStatus: result.auditStatus,
        auditResult: result.auditResult,
        scanCount: result.scanCount,
        actualDepartmentId: result.actualDepartmentId,
        actualLocationId: result.actualLocationId,
        actualCustodianId: result.actualCustodianId,
        actualConditionId: result.actualConditionId,
        remark: result.remark,
        mismatches,
        appliedCorrections: correctionMismatches,
        resolvedNotFoundFinding,
        resultCorrection: input.resultCorrection,
      },
      remark: input.remark ?? undefined,
    })

    const scannedByUser = result.scannedBy
      ? await prisma.user.findUnique({ where: { id: result.scannedBy }, select: { displayName: true } })
      : null

    return NextResponse.json({
      item: result,
      auditResult,
      mismatches,
      appliedCorrections: correctionMismatches,
      correctionsDeferred: input.applyCorrections && !correctionsAllowed,
      resolvedNotFoundFinding,
      scannedByName: scannedByUser?.displayName ?? null,
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
  },
  ownershipType?: string | null
) {
  const mismatches: Mismatch[] = []
  const normalizedOwnershipType = normalizeAssetOwnershipType(ownershipType)

  if (normalizedOwnershipType !== "software_license") {
    addMismatch(mismatches, "wrong_location", item.expectedLocationId, actual.locationId)
  }
  if (requiresCustodian(normalizedOwnershipType)) {
    addMismatch(mismatches, "wrong_custodian", item.expectedCustodianId, actual.custodianId)
  }
  addMismatch(mismatches, "wrong_department", item.expectedDepartmentId, actual.departmentId)
  addMismatch(mismatches, "wrong_condition", item.expectedConditionId, actual.conditionId)

  return mismatches
}

function buildOutOfScopeFieldFindings(
  asset: {
    departmentId: string | null
    currentLocationId: string
    custodianId: string | null
    conditionId: string | null
    ownershipType?: string | null
  },
  actual: ActualValues
) {
  const normalizedOwnershipType = normalizeAssetOwnershipType(asset.ownershipType)
  const candidates = [
    {
      findingType: "wrong_location",
      expectedValue: asset.currentLocationId,
      actualValue: actual.locationId,
      shouldCheck: normalizedOwnershipType !== "software_license",
    },
    {
      findingType: "wrong_custodian",
      expectedValue: asset.custodianId,
      actualValue: actual.custodianId,
      shouldCheck: requiresCustodian(normalizedOwnershipType),
    },
    {
      findingType: "wrong_department",
      expectedValue: asset.departmentId,
      actualValue: actual.departmentId,
      shouldCheck: true,
    },
    {
      findingType: "wrong_condition",
      expectedValue: asset.conditionId,
      actualValue: actual.conditionId,
      shouldCheck: true,
    },
  ]

  return candidates
    .filter((candidate) => candidate.shouldCheck && (candidate.expectedValue ?? null) !== (candidate.actualValue ?? null))
    .map((candidate) => ({
      type: candidate.findingType,
      expectedValue: candidate.expectedValue,
      actualValue: candidate.actualValue,
    }))
}

function optionalActualValue(value: string | null | undefined, fallback: string | null) {
  return value === undefined ? fallback : value
}

// The evidence of an out-of-scope re-scan: the scanner's own active photos of this asset, read the way the first
// out-of-scope scan reads them (above, inline). No ids, no query.
async function findOutOfScopeEvidence(assetId: string, userId: string, attachmentIds: readonly string[]) {
  if (attachmentIds.length === 0) return []
  return prisma.attachment.findMany({
    where: { id: { in: [...attachmentIds] }, assetId, module: "asset", isActive: true, uploadedBy: userId },
    select: { fileName: true, originalName: true, fileType: true, fileSize: true, filePath: true },
  })
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

const componentConfirmationTransactionMaxAttempts = 3

async function runComponentConfirmationTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 1; attempt <= componentConfirmationTransactionMaxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (attempt >= componentConfirmationTransactionMaxAttempts || !isRetryableComponentConfirmationTransactionError(error)) {
        throw error
      }
    }
  }

  throw new Error("Component confirmation transaction retry failed")
}

async function assertComponentInstalledUnderParent(
  tx: { assetComponent: Prisma.TransactionClient["assetComponent"]; auditItem: Prisma.TransactionClient["auditItem"] },
  auditRoundId: string,
  parentAssetId: string,
  componentAssetId: string
) {
  const componentLink = await tx.assetComponent.findFirst({
    where: {
      parentAssetId,
      componentAssetId,
      status: "installed",
      removedAt: null,
    },
    select: {
      parentAssetId: true,
      parentAsset: { select: { assetTag: true, name: true } },
    },
  })
  if (!componentLink) {
    throw new Error("Component is no longer installed under the selected parent asset")
  }

  // An out-of-scope find is not in the round, so it cannot vouch for a component either (P3-R3).
  const parentAuditItem = await tx.auditItem.findUnique({
    where: { auditRoundId_assetId: { auditRoundId, assetId: parentAssetId } },
    select: { id: true, auditResult: true },
  })
  if (!parentAuditItem || !isAuditRoundOwnItem(parentAuditItem)) {
    throw new Error("Component parent is not included in this audit round")
  }

  return componentLink
}

async function getConfirmedComponentAssetIds(
  tx: { assetComponent: Prisma.TransactionClient["assetComponent"]; auditItem: Prisma.TransactionClient["auditItem"] },
  auditRoundId: string,
  parentAssetId: string
) {
  const links = await tx.assetComponent.findMany({
    where: { parentAssetId, status: "installed", removedAt: null },
    select: { componentAssetId: true },
  })
  const componentAssetIds = links.map((link) => link.componentAssetId)
  if (componentAssetIds.length === 0) return []

  const confirmedItems = await tx.auditItem.findMany({
    where: {
      auditRoundId,
      assetId: { in: componentAssetIds },
      auditStatus: { in: ["scanned", "reconciled"] },
      auditResult: { in: ["found", "confirmed_with_parent"] },
    },
    select: { assetId: true },
  })

  return confirmedItems.map((item) => item.assetId)
}
