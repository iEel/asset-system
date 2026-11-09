// ยืนยันผลตรวจ plan 5 (agreed 2026-10-28): releases one asset stuck "Under Inspection" that is in no audit round (an
// asset in a round is confirmed on that round's confirm page). Status, holder and location in one step, with the register
// department rule the asset edit uses (getRegisterDepartment, src/app/api/assets/[id]/route.ts). The route
// (src/app/api/assets/[id]/confirm-inspection/route.ts) checks the permission and maps the errors; this module re-reads
// the asset inside one serializable transaction, as the round's confirm-results service does
// (inspection-confirm-service.ts), and writes one history row per changed field.
import type { Prisma } from "@prisma/client"
import { logAudit } from "@/lib/audit-log"
import { prisma } from "@/lib/db"
import { departmentFollowsHolder, getRegisterDepartment } from "./asset-department-rule.ts"
import { getAssetLifecycleTransitionError } from "./asset-lifecycle-policy.ts"
import { normalizeAssetOwnershipType } from "./asset-ownership.ts"
import { FieldRefusalError, type FieldErrors } from "./field-errors.ts"
import { findAssetInspectionRound, loadOpenHandoverCounts } from "./inspection-confirm-data.ts"
import {
  INSPECTION_STATUS_NAME,
  inspectionTargetStatusName,
  type InspectionHandoverCounts,
  type InspectionTargetStatusName,
} from "./inspection-confirm-rules.ts"
import type { AssetConfirmInspectionInput } from "./validations/asset-confirm-inspection.ts"

// One asset: the confirm-results options with a shorter timeout.
export const assetConfirmInspectionTransactionOptions = {
  isolationLevel: "Serializable",
  maxWait: 10_000,
  timeout: 30_000,
} as const satisfies { isolationLevel: Prisma.TransactionIsolationLevel; maxWait: number; timeout: number }

export const ASSET_CONFIRM_INSPECTION_CHANGED_MESSAGE = "This asset changed before its inspection was confirmed"

// The asset left Under Inspection between the read and the conditional update: a 409, reload and try again.
export class AssetConfirmInspectionChangedError extends Error {
  readonly assetId: string

  constructor(assetId: string) {
    super(ASSET_CONFIRM_INSPECTION_CHANGED_MESSAGE)
    this.name = "AssetConfirmInspectionChangedError"
    this.assetId = assetId
  }
}

export type AssetConfirmInspectionContext = {
  /** The asset's current status (English name). */
  statusName: string
  /** The asset has an item in an active, non-cancelled audit round (findAssetInspectionRound). */
  inRound: boolean
  handovers: InspectionHandoverCounts
  ownershipType: string | null
  currentCustodianId: string | null
  /** An open handover locks the location as the holder (as the asset edit's custody lock does). */
  currentLocationId: string
  /** The chosen holder is active; true when none is chosen or the holder is unchanged. */
  employeeActive: boolean
  /** The chosen location is active; true when it is unchanged. */
  locationActive: boolean
}

// The English line each refusal answers with; the field codes are apiErrors keys (api-error-catalog.ts).
const refusalMessages: Readonly<Record<string, string>> = {
  assetInspectionNotUnderInspection: "Asset is not under inspection",
  assetInspectionInRound: "Confirm this asset in its audit round",
  assetInspectionHandoverUnclear: "The open handover of this asset is unclear",
  assetInspectionHandoverStatus: "An open handover sets this asset's status",
  assetInspectionHandoverLocked: "An open handover locks the holder and location",
  assetInspectionHolderRequired: "In Use needs a holder",
  checkoutReceiverInactive: "ASSET_TRANSFER_DESTINATION_INACTIVE",
  checkinLocationInactive: "ASSET_CHECKIN_LOCATION_INACTIVE",
}

function hasOpenHandover(handovers: InspectionHandoverCounts): boolean {
  return handovers.permanent + handovers.temporary + handovers.unknown > 0
}

/**
 * The status the confirm writes: with an open clear handover the rule's target (In Use or Checked Out), whatever the body
 * sent; otherwise the body's choice. null = an unclear handover (refused by assetConfirmInspectionErrors).
 */
export function assetConfirmInspectionTargetStatus(
  input: Pick<AssetConfirmInspectionInput, "statusName">,
  context: Pick<AssetConfirmInspectionContext, "handovers" | "ownershipType" | "currentCustodianId">,
): InspectionTargetStatusName | null {
  if (!hasOpenHandover(context.handovers)) return input.statusName
  return inspectionTargetStatusName({ ownershipType: context.ownershipType, custodianId: context.currentCustodianId, handovers: context.handovers }, "confirm")
}

/**
 * The rule checks, pure: field → apiErrors key; {} = allowed. Not Under Inspection and in a round refuse the whole
 * request under statusName. An open handover: unclear refuses; clear takes the rule's target, so the body may not send
 * Ready (a handover means someone or somewhere holds it), and the holder and location stay as they are. Without one,
 * In Use needs a holder.
 */
export function assetConfirmInspectionErrors(
  input: Pick<AssetConfirmInspectionInput, "statusName" | "custodianId" | "locationId">,
  context: AssetConfirmInspectionContext,
): FieldErrors {
  if (context.statusName !== INSPECTION_STATUS_NAME) return { statusName: "assetInspectionNotUnderInspection" }
  if (context.inRound) return { statusName: "assetInspectionInRound" }

  const errors: FieldErrors = {}
  if (hasOpenHandover(context.handovers)) {
    if (assetConfirmInspectionTargetStatus(input, context) === null) errors.statusName = "assetInspectionHandoverUnclear"
    else if (input.statusName === "Ready") errors.statusName = "assetInspectionHandoverStatus"
    if (input.custodianId !== context.currentCustodianId) errors.custodianId = "assetInspectionHandoverLocked"
    if (input.locationId !== context.currentLocationId) errors.locationId = "assetInspectionHandoverLocked"
  } else if (input.statusName === "In Use" && !input.custodianId) {
    errors.custodianId = "assetInspectionHolderRequired"
  }
  if (!errors.custodianId && input.custodianId && !context.employeeActive) errors.custodianId = "checkoutReceiverInactive"
  if (!errors.locationId && !context.locationActive) errors.locationId = "checkinLocationInactive"
  return errors
}

export type AssetConfirmInspectionResult = {
  assetId: string
  statusName: InspectionTargetStatusName
  custodianId: string | null
  currentLocationId: string
  departmentId: string | null
}

export async function confirmAssetInspection(
  input: AssetConfirmInspectionInput & { assetId: string; userId: string },
): Promise<AssetConfirmInspectionResult> {
  const { assetId, userId, reason } = input

  // The statuses a confirm can write, by English name, read once.
  const statuses = await prisma.assetStatus.findMany({
    where: { name: { in: ["Ready", "In Use", "Checked Out"] }, isActive: true },
    select: { id: true, name: true },
  })
  const statusIdByName = new Map(statuses.map((status) => [status.name, status.id]))

  const written = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findFirst({
      where: { id: assetId, isActive: true },
      select: {
        id: true,
        statusId: true,
        ownershipType: true,
        custodianId: true,
        currentLocationId: true,
        departmentId: true,
        status: { select: { name: true } },
      },
    })
    if (!asset) throw new Error("Asset not found")

    const round = await findAssetInspectionRound(tx, assetId)
    const handovers = (await loadOpenHandoverCounts(tx, [assetId])).get(assetId) ?? { permanent: 0, temporary: 0, unknown: 0 }

    // A new holder is read active; the current holder decides a department even after leaving, so that read has no
    // active filter (the asset edit's planRegisterDepartment).
    const ownership = normalizeAssetOwnershipType(asset.ownershipType)
    const holderChanged = input.custodianId !== asset.custodianId
    let employeeActive = true
    let nextHolderDepartmentId: string | null = null
    if (input.custodianId && holderChanged) {
      const holder = await tx.employee.findFirst({ where: { id: input.custodianId, isActive: true }, select: { departmentId: true } })
      employeeActive = holder !== null
      nextHolderDepartmentId = holder?.departmentId ?? null
    } else if (input.custodianId && departmentFollowsHolder(ownership)) {
      const holder = await tx.employee.findUnique({ where: { id: input.custodianId }, select: { departmentId: true } })
      nextHolderDepartmentId = holder?.departmentId ?? null
    }
    const locationChanged = input.locationId !== asset.currentLocationId
    const locationActive = !locationChanged || (await tx.location.findFirst({ where: { id: input.locationId, isActive: true }, select: { id: true } })) !== null

    const context: AssetConfirmInspectionContext = {
      statusName: asset.status.name,
      inRound: round !== null,
      handovers,
      ownershipType: asset.ownershipType,
      currentCustodianId: asset.custodianId,
      currentLocationId: asset.currentLocationId,
      employeeActive,
      locationActive,
    }
    const errors = assetConfirmInspectionErrors(input, context)
    const firstError = Object.values(errors)[0]
    if (firstError) throw new FieldRefusalError(refusalMessages[firstError] ?? "Inspection could not be confirmed", errors)

    const statusName = assetConfirmInspectionTargetStatus(input, context) as InspectionTargetStatusName
    const statusId = statusIdByName.get(statusName)
    if (!statusId) throw new Error("Asset status not found")

    // The inputs the asset edit passes: the department chosen is the stored one (the dialog has no department field).
    const department = getRegisterDepartment({
      ownership,
      currentCustodianId: asset.custodianId,
      nextCustodianId: input.custodianId,
      currentDepartmentId: asset.departmentId,
      chosenDepartmentId: asset.departmentId,
      nextHolderDepartmentId,
      openHandover: hasOpenHandover(handovers),
      custodyFrozen: getAssetLifecycleTransitionError("move_scope", asset.status.name) !== null,
    })
    const departmentId = department.departmentId

    // The where keeps the asset Under Inspection: a confirm, a correction or a round in between leaves 0 rows.
    const updated = await tx.asset.updateMany({
      where: { id: assetId, isActive: true, status: { name: INSPECTION_STATUS_NAME } },
      data: { statusId, custodianId: input.custodianId, currentLocationId: input.locationId, departmentId, updatedBy: userId },
    })
    if (updated.count !== 1) throw new AssetConfirmInspectionChangedError(assetId)

    const moved = { reason, referenceType: "asset", referenceId: assetId, performedBy: userId, remark: "Inspection confirmed" }
    const rows: Prisma.AssetMovementCreateManyInput[] = [
      { assetId, movementType: "status_correction", fromValue: asset.statusId, toValue: statusId, ...moved },
    ]
    if (locationChanged) {
      rows.push({ assetId, movementType: "location_change", fromValue: asset.currentLocationId, toValue: input.locationId, ...moved })
    }
    if (holderChanged) {
      rows.push({ assetId, movementType: "custodian_change", fromValue: asset.custodianId, toValue: input.custodianId, ...moved })
    }
    if (departmentId !== asset.departmentId) {
      rows.push({ assetId, movementType: "department_change", fromValue: asset.departmentId, toValue: departmentId, ...moved })
    }
    await tx.assetMovement.createMany({ data: rows })

    return { asset, statusId, statusName, departmentId }
  }, assetConfirmInspectionTransactionOptions)

  const { asset } = written
  await logAudit({
    userId,
    action: "correct_status",
    module: "asset",
    recordId: assetId,
    oldValue: {
      statusId: asset.statusId,
      statusName: INSPECTION_STATUS_NAME,
      custodianId: asset.custodianId,
      currentLocationId: asset.currentLocationId,
      departmentId: asset.departmentId,
    },
    newValue: {
      statusId: written.statusId,
      statusName: written.statusName,
      custodianId: input.custodianId,
      currentLocationId: input.locationId,
      departmentId: written.departmentId,
      reason,
    },
  })

  return {
    assetId,
    statusName: written.statusName,
    custodianId: input.custodianId,
    currentLocationId: input.locationId,
    departmentId: written.departmentId,
  }
}
