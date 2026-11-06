// The per-asset return write (รับคืน), run inside a caller's transaction: the single return
// (src/app/api/assets/[id]/checkin/route.ts) and the multi-return batch (group 7 plan 4) write one machine's return with it.
// It throws the route's refusals as errors; the caller maps them to responses and logs the audit after commit.
import type { Asset, Prisma } from "@prisma/client"
import { requirePermission, type SessionUser } from "@/lib/auth-utils"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { AssetOperationConflictError } from "@/lib/asset-operation-claim"
import { COMPONENT_LINK_OUTSTANDING } from "@/lib/asset-component-outstanding"
import { getCheckinNextDepartmentId, getOutstandingComponentCustody } from "@/lib/asset-department-rule"
import { buildAssetOperationComponentLinkWhere } from "@/lib/asset-operation-search-rules"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { readCheckinDepartment } from "@/lib/checkin-department"
import { getCheckinHandoverStatusError } from "@/lib/asset-lifecycle-policy"
import { generateCheckinDocumentNo } from "@/lib/operation-document-number"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import { generateRepairNo, toMovementReason } from "@/lib/repair-record-service"
import {
  createAssetTransactionSnapshot,
  createComponentLinkTransactionSnapshot,
  serializeAssetComponentTransactionSnapshots,
  serializeAssetTransactionSnapshot,
  type AssetComponentTransactionSnapshotChangeV1,
  type CheckinRepairLink,
} from "@/lib/asset-transaction-snapshot"
import type { SavedOperationEvidence } from "@/lib/asset-operation-evidence"
import type { AssetCheckinInput } from "@/lib/validations/asset-operations"

export type CheckinEvidenceWithLabel = {
  file: SavedOperationEvidence
  label: string | null
}

// Files already saved by the caller. The batch passes the same two signature files for every machine (G7P4-R5): each
// return record gets its own Attachment row pointing at the one stored file.
export type CheckinWriteEvidence = {
  photosAfter: CheckinEvidenceWithLabel[]
  returnSignature: SavedOperationEvidence | null
  receiveSignature: SavedOperationEvidence | null
}

export type CheckinWriteInput = {
  // The asset as read before the transaction: the checkin movement's from-room and the ownership rule read it.
  asset: Pick<Asset, "id" | "currentLocationId" | "ownershipType">
  checkin: AssetCheckinInput
  // The handover's holder as read before the transaction (checkout.custodianId); the missing-components plan reads it.
  holderEmployeeId: string | null
  // The next status is Under Maintenance ("ส่งซ่อม").
  sendsToRepair: boolean
  repairReporterId: string | null
  evidence: CheckinWriteEvidence
  // A pre-generated RT- number (the batch takes one for the whole document, G7P4-R1); omitted, one is generated here.
  documentNo?: string
}

export type CheckinWriteContext = {
  user: SessionUser
}

export type CheckinWriteResult = {
  record: Prisma.AssetCheckinGetPayload<object>
  componentSync: { updated: number; skipped: number; movements: number }
  departmentId: string | null
  previousDepartmentId: string | null
  missingComponents: { assetTag: string; name: string }[]
  repair: CheckinRepairLink | null
}

// The refusals of the missing-components list (group 3 spec §8.5, P2-R1, P2-R18), keyed by their catalogued codes; each
// lands under its field.
export const MISSING_COMPONENT_REFUSALS = {
  CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED: { field: "returnBy", key: "checkinMissingComponentReturnerRequired" },
  ASSET_CHECKIN_MISSING_COMPONENT_INVALID: { field: "missingComponentIds", key: "checkinMissingComponentInvalid" },
} as const
export type MissingComponentRefusalCode = keyof typeof MISSING_COMPONENT_REFUSALS

const missingComponentLinkSelect = {
  id: true, parentAssetId: true, componentAssetId: true, status: true, updatedAt: true, referenceType: true, referenceId: true,
  componentAsset: {
    select: {
      assetTag: true, name: true, ownershipType: true, updatedAt: true, statusId: true, conditionId: true,
      branchId: true, currentLocationId: true, custodianId: true, departmentId: true,
    },
  },
} satisfies Prisma.AssetComponentSelect
type MissingComponentLink = Prisma.AssetComponentGetPayload<{ select: typeof missingComponentLinkSelect }>
export type MissingComponentPlan = { returner: { id: string; departmentId: string } | null; links: MissingComponentLink[] }

export class CheckinMissingComponentRefusalError extends Error {
  readonly code: MissingComponentRefusalCode

  constructor(code: MissingComponentRefusalCode) {
    super(code)
    this.name = "CheckinMissingComponentRefusalError"
    this.code = code
  }
}

export class CheckinLocationInactiveError extends Error {
  constructor() {
    super("ASSET_CHECKIN_LOCATION_INACTIVE")
    this.name = "CheckinLocationInactiveError"
  }
}

export async function readActiveCheckinLocation(db: Pick<Prisma.TransactionClient, "location">, locationId: string) {
  return db.location.findFirst({ where: { id: locationId, isActive: true }, select: { id: true } })
}

// One machine's return, inside the caller's transaction: re-reads the handover, the open repair, the return department
// and the room; claims the handover (count === 1, else ASSET_CHANGED_DURING_OPERATION); claims and re-reads the missing
// components; writes the AssetCheckin, its attachments, the asset, its movements, the outstanding components, the
// component sync, the repair record if one is opened, and the final snapshots.
export async function writeCheckinInTransaction(
  tx: Prisma.TransactionClient,
  input: CheckinWriteInput,
  ctx: CheckinWriteContext,
): Promise<CheckinWriteResult> {
  const { asset, checkin, holderEmployeeId, sendsToRepair, repairReporterId } = input
  const { photosAfter, returnSignature, receiveSignature } = input.evidence
  const { user } = ctx
  const id = asset.id

  const activeCheckout = await tx.assetCheckout.findFirst({
    where: {
      id: checkin.checkoutId,
      assetId: id,
      isReturned: false,
      transactionStatus: "active",
    },
    select: {
      id: true,
      handoverMode: true,
      asset: {
        select: {
          status: { select: { name: true } },
        },
      },
    },
  })
  if (!activeCheckout) throw new Error("Active checkout not found")
  const hasOpenRepair = await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } }) > 0
  if (!sendsToRepair && hasOpenRepair) {
    throw new Error("ASSET_CHECKIN_REPAIR_STATUS_REQUIRED")
  }
  // A repair that closed since the pre-check turns the join into a new record: ask again (group 3 spec §5, P2-R14).
  const createsRepair = sendsToRepair && !hasOpenRepair
  if (createsRepair) {
    requirePermission(user, "maintenance", "create")
    if (!repairReporterId) throw new Error("MAINTENANCE_REPORTER_REQUIRED")
  }
  // S-R48: a permanent handover whose asset went into repair (Under Maintenance or Pending Repair) fits while that
  // repair is open; the checkin clears the holder, so finishing the repair later restores Ready.
  const handoverStatusError = getCheckinHandoverStatusError(
    activeCheckout.handoverMode,
    activeCheckout.asset.status.name,
    { hasOpenRepair },
  )
  if (handoverStatusError) throw new Error(handoverStatusError)
  const returnDepartment = await readCheckinDepartment(tx)
  // P2-R15: the room again, then the claim on the handover, before the RT- number is taken. A second save of the
  // same HO- loses the claim and answers 409 instead of the unique index's 500 (GP W1).
  if (!(await readActiveCheckinLocation(tx, checkin.nextLocationId))) throw new CheckinLocationInactiveError()
  const claimed = await tx.assetCheckout.updateMany({
    where: { id: activeCheckout.id, assetId: id, isReturned: false, transactionStatus: "active" },
    data: { isReturned: true },
  })
  if (claimed.count !== 1) {
    throw new AssetOperationConflictError(
      "ASSET_CHANGED_DURING_OPERATION",
      "Asset status changed while this request was being saved. Reload the asset and try again.",
    )
  }
  // Claim the missing components' rows before reading their links and open handovers, in the order checkout and
  // transfer take them (they claim the component, then read its links). A ส่งมอบ of the component that wins the lock
  // leaves an open HO- that the plan below refuses; one that loses sees the outstanding link and refuses.
  if (checkin.missingComponentIds.length > 0) {
    await tx.asset.updateMany({ where: { id: { in: checkin.missingComponentIds }, isActive: true }, data: { updatedBy: user.id } })
  }
  // A component taken since the pre-check is refused before the RT- number is taken (P2-R15). The claimed row is the
  // pre-read handover, so its holder has not changed.
  const missingPlan = await readMissingComponentPlan(tx, id, checkin, holderEmployeeId)

  const beforeAsset = await tx.asset.findUnique({
    where: { id },
    select: {
      id: true,
      updatedAt: true,
      statusId: true,
      conditionId: true,
      branchId: true,
      currentLocationId: true,
      custodianId: true,
      departmentId: true,
    },
  })
  if (!beforeAsset) throw new Error("Asset not found")
  // บุคคล and Stock go to the return department; ส่วนกลาง, ส่วนควบ and License keep theirs (P2-R7).
  const nextDepartmentId = getCheckinNextDepartmentId({
    ownership: normalizeAssetOwnershipType(asset.ownershipType),
    returnDepartmentId: returnDepartment.id,
    currentDepartmentId: beforeAsset.departmentId,
  })

  const documentNo = input.documentNo ?? await generateCheckinDocumentNo(tx, checkin.returnDate)
  const record = await tx.assetCheckin.create({
    data: {
      documentNo,
      assetId: id,
      checkoutId: activeCheckout.id,
      returnDate: checkin.returnDate,
      returnByEmployeeId: checkin.returnByEmployeeId,
      returnBy: checkin.returnBy,
      receiveByEmployeeId: checkin.receiveByEmployeeId,
      receiveBy: checkin.receiveBy,
      conditionAfter: checkin.conditionAfter,
      missingAccessories: checkin.missingAccessories,
      damageNote: checkin.damageNote,
      photoAfter: photosAfter[0]?.file.filePath,
      nextStatus: checkin.nextStatusId,
      nextLocationId: checkin.nextLocationId,
      remark: checkin.remark,
      beforeSnapshotJson: serializeAssetTransactionSnapshot(createAssetTransactionSnapshot({
        asset: beforeAsset,
        checkout: { id: activeCheckout.id, isReturned: false },
        components: [],
      })),
    },
  })

  for (const evidence of [
    ...photosAfter.map((photo) => ({ module: "checkin_photo_after", file: photo.file, label: photo.label })),
    { module: "checkin_return_signature", file: returnSignature, label: null },
    { module: "checkin_receive_signature", file: receiveSignature, label: null },
  ]) {
    if (!evidence.file) continue
    await tx.attachment.create({
      data: {
        assetId: asset.id,
        module: evidence.module,
        referenceId: record.id,
        fileName: evidence.file.fileName,
        originalName: evidence.label ? `${evidence.label} - ${evidence.file.originalName}` : evidence.file.originalName,
        fileType: evidence.file.fileType,
        fileSize: evidence.file.fileSize,
        filePath: evidence.file.filePath,
        uploadedBy: user.id,
      },
    })
  }

  // Closed by the claim above.
  const returnedCheckout = { id: activeCheckout.id, isReturned: true }

  const afterAsset = await tx.asset.update({
    where: { id },
    data: {
      statusId: checkin.nextStatusId,
      conditionId: checkin.conditionAfter,
      currentLocationId: checkin.nextLocationId,
      custodianId: null,
      departmentId: nextDepartmentId,
      updatedBy: user.id,
    },
    select: {
      id: true,
      updatedAt: true,
      statusId: true,
      conditionId: true,
      branchId: true,
      currentLocationId: true,
      custodianId: true,
      departmentId: true,
    },
  })

  await tx.assetMovement.create({
    data: {
      assetId: id,
      movementType: "checkin",
      fromValue: asset.currentLocationId,
      toValue: checkin.nextLocationId,
      reason: "Asset checkin",
      referenceType: "checkin",
      referenceId: record.id,
      performedBy: user.id,
      remark: checkin.remark,
    },
  })
  if (nextDepartmentId !== beforeAsset.departmentId) {
    await tx.assetMovement.create({
      data: {
        assetId: id,
        movementType: "department_change",
        fromValue: beforeAsset.departmentId,
        toValue: nextDepartmentId,
        reason: "Asset checkin",
        referenceType: "checkin",
        referenceId: record.id,
        performedBy: user.id,
      },
    })
  }

  // Before the sync: the sync reads installed links only, so the components that did not come back stay where they
  // are and only the returned ones follow the parent (spec §8.5 "Save").
  const outstanding = await markComponentsOutstanding(tx, { plan: missingPlan, checkinId: record.id, userId: user.id, remark: checkin.remark ?? null })

  // The travelling components take the parent's department (its kept one for a ส่วนกลาง parent), as checkout does.
  const componentSync = await syncInstalledComponentsWithParent(tx, {
    parentAssetId: id,
    changes: {
      currentLocationId: checkin.nextLocationId,
      custodianId: null,
      departmentId: nextDepartmentId,
    },
    movementType: "parent_checkin_sync",
    referenceType: "checkin",
    referenceId: record.id,
    performedBy: user.id,
    reason: "Parent asset checkin",
    remark: checkin.remark,
    captureSnapshots: true,
  })

  let repair: CheckinRepairLink | null = null
  if (createsRepair && repairReporterId) {
    const openRecords = await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } })
    if (openRecords === 0) {
      const problem = checkin.maintenanceProblem ?? buildMaintenanceProblem(checkin, outstanding.missingComponents)
      const ticket = await tx.maintenanceTicket.create({
        data: {
          repairNo: await generateRepairNo(tx, new Date()),
          assetId: id,
          problem,
          reportedById: repairReporterId,
          reportedDate: checkin.returnDate,
          repairType: "internal",
          repairStatus: "in_progress",
          createdBy: user.id,
          updatedBy: user.id,
        },
        select: { id: true, repairNo: true },
      })

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: "maintenance_create",
          fromValue: beforeAsset.statusId,
          toValue: checkin.nextStatusId,
          reason: toMovementReason(problem),
          referenceType: "maintenance",
          referenceId: ticket.id,
          performedBy: user.id,
          remark: "created_from_checkin",
        },
      })
      repair = { id: ticket.id, repairNo: ticket.repairNo, joined: false }
    }
  }
  if (sendsToRepair && !repair) {
    const openRecord = await tx.maintenanceTicket.findFirst({
      where: { ...openRepairRecordWhere, assetId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, repairNo: true },
    })
    if (openRecord) repair = { id: openRecord.id, repairNo: openRecord.repairNo, joined: true }
  }

  const componentChanges = [...componentSync.componentSnapshots, ...outstanding.changes]
  const beforeSnapshot = createAssetTransactionSnapshot({
    asset: beforeAsset,
    checkout: { id: activeCheckout.id, isReturned: false },
    components: componentChanges.map((change) => change.before),
  })
  const afterSnapshot = createAssetTransactionSnapshot({
    asset: afterAsset,
    checkout: returnedCheckout,
    components: componentChanges.map((change) => change.after),
    repair,
  })
  const finalizedRecord = await tx.assetCheckin.update({
    where: { id: record.id },
    data: {
      beforeSnapshotJson: serializeAssetTransactionSnapshot(beforeSnapshot),
      afterSnapshotJson: serializeAssetTransactionSnapshot(afterSnapshot),
      componentSnapshotJson: serializeAssetComponentTransactionSnapshots(componentChanges),
    },
  })
  const componentSyncSummary = {
    updated: componentSync.updated,
    skipped: componentSync.skipped,
    movements: componentSync.movements,
  }

  return {
    record: finalizedRecord,
    componentSync: componentSyncSummary,
    departmentId: nextDepartmentId,
    previousDepartmentId: beforeAsset.departmentId,
    missingComponents: outstanding.missingComponents,
    repair,
  }
}

// Who keeps what stays out, and every travelling link of each missing component, duplicates included (GP X1).
// Reads nothing for an empty list, so a caller that sends no ids makes no new query.
export async function readMissingComponentPlan(
  db: Pick<Prisma.TransactionClient, "employee" | "assetComponent" | "assetCheckout">,
  parentAssetId: string,
  input: { missingComponentIds: string[]; returnByEmployeeId?: string | null },
  holderEmployeeId: string | null,
): Promise<MissingComponentPlan> {
  if (input.missingComponentIds.length === 0) return { returner: null, links: [] }

  // What stays out stays with ผู้คืน, so ผู้คืน must be an employee who can hold it; the handover's holder who has left
  // is the one inactive employee the form offers, and may return (spec §8.3, S-R46).
  const employee = input.returnByEmployeeId
    ? await db.employee.findUnique({
        where: { id: input.returnByEmployeeId },
        select: { id: true, departmentId: true, isActive: true },
      })
    : null
  if (!employee || (!employee.isActive && employee.id !== holderEmployeeId)) {
    throw new CheckinMissingComponentRefusalError("CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED")
  }

  const found = await db.assetComponent.findMany({
    where: { ...buildAssetOperationComponentLinkWhere(parentAssetId), componentAssetId: { in: input.missingComponentIds } },
    select: missingComponentLinkSelect,
    orderBy: { id: "asc" },
  })
  // A component with its own open handover does not travel with the parent (the sync's skip, asset-component-sync.ts).
  const handedOver = found.length > 0
    ? await db.assetCheckout.findMany({
        where: {
          assetId: { in: Array.from(new Set(found.map((link) => link.componentAssetId))) },
          isReturned: false,
          transactionStatus: "active",
        },
        select: { assetId: true },
      })
    : []
  const handedOverIds = new Set(handedOver.map((checkout) => checkout.assetId))
  const links = found.filter((link) => !handedOverIds.has(link.componentAssetId))
  const linkedIds = new Set(links.map((link) => link.componentAssetId))
  if (!input.missingComponentIds.every((componentId) => linkedIds.has(componentId))) {
    throw new CheckinMissingComponentRefusalError("ASSET_CHECKIN_MISSING_COMPONENT_INVALID")
  }

  return { returner: { id: employee.id, departmentId: employee.departmentId }, links }
}

// Marks the links outstanding under the RT-, makes ผู้คืน each component's holder (never its room), and writes one
// component_outstanding line and one snapshot entry per component (spec §8.5, P2-R2, P2-R6, P2-R7).
async function markComponentsOutstanding(
  tx: Prisma.TransactionClient,
  input: { plan: MissingComponentPlan; checkinId: string; userId: string; remark: string | null },
): Promise<{ changes: AssetComponentTransactionSnapshotChangeV1[]; missingComponents: { assetTag: string; name: string }[] }> {
  const { returner, links } = input.plan
  if (!returner || links.length === 0) return { changes: [], missingComponents: [] }

  const linkIds = links.map((link) => link.id)
  const marked = await tx.assetComponent.updateMany({
    where: { id: { in: linkIds }, status: "installed", removedAt: null },
    data: { status: COMPONENT_LINK_OUTSTANDING, referenceType: "checkin", referenceId: input.checkinId, updatedBy: input.userId },
  })
  if (marked.count !== linkIds.length) {
    throw new AssetOperationConflictError(
      "ASSET_CHANGED_DURING_OPERATION",
      "Asset status changed while this request was being saved. Reload the asset and try again.",
    )
  }
  const reread = await tx.assetComponent.findMany({
    where: { id: { in: linkIds } },
    select: { id: true, status: true, updatedAt: true },
  })
  const rereadById = new Map(reread.map((link) => [link.id, link]))

  // Each component's first link (in plan order) is its snapshot link (GP X1).
  const snapshotLinks = new Map<string, MissingComponentLink>()
  for (const link of links) if (!snapshotLinks.has(link.componentAssetId)) snapshotLinks.set(link.componentAssetId, link)

  const changes: AssetComponentTransactionSnapshotChangeV1[] = []
  for (const link of snapshotLinks.values()) {
    const component = link.componentAsset
    const custody = getOutstandingComponentCustody({
      ownership: normalizeAssetOwnershipType(component.ownershipType),
      custodianId: component.custodianId,
      departmentId: component.departmentId,
      returner,
    })
    // Always written, even when nothing changes, so the after entry gets its assetUpdatedAt. The row was already claimed
    // before the plan read, which is what makes another save of the component wait. The room is not changed (spec §8.5).
    const updated = await tx.asset.update({
      where: { id: link.componentAssetId },
      data: { custodianId: custody.custodianId, departmentId: custody.departmentId, updatedBy: input.userId },
      select: { updatedAt: true, statusId: true, conditionId: true, branchId: true, currentLocationId: true, custodianId: true, departmentId: true },
    })
    await tx.assetMovement.create({
      data: {
        assetId: link.componentAssetId,
        movementType: "component_outstanding",
        fromValue: JSON.stringify({ custodianId: component.custodianId, departmentId: component.departmentId }),
        toValue: JSON.stringify({ custodianId: updated.custodianId, departmentId: updated.departmentId }),
        reason: "Not returned with its parent asset",
        referenceType: "checkin",
        referenceId: input.checkinId,
        performedBy: input.userId,
        remark: input.remark,
      },
    })
    const markedLink = rereadById.get(link.id)
    if (!markedLink) {
      throw new AssetOperationConflictError(
        "ASSET_CHANGED_DURING_OPERATION",
        "Asset status changed while this request was being saved. Reload the asset and try again.",
      )
    }
    changes.push({
      // `|| null`: an empty reference reads as none, which the snapshot validator accepts.
      before: createComponentLinkTransactionSnapshot(link, component, { referenceType: link.referenceType || null, referenceId: link.referenceId || null }),
      after: createComponentLinkTransactionSnapshot({ ...link, status: markedLink.status, updatedAt: markedLink.updatedAt }, updated),
    })
  }

  const missingComponents = Array.from(snapshotLinks.values(), (link) => ({ assetTag: link.componentAsset.assetTag, name: link.componentAsset.name }))
    .sort((left, right) => left.assetTag.localeCompare(right.assetTag))
  return { changes, missingComponents }
}

function buildMaintenanceProblem(
  input: {
    damageNote?: string | null
    missingAccessories?: string | null
    remark?: string | null
  },
  missingComponents: { assetTag: string; name: string }[],
) {
  return [
    input.damageNote ? `ความเสียหาย: ${input.damageNote}` : null,
    input.missingAccessories ? `อุปกรณ์ไม่ครบ: ${input.missingAccessories}` : null,
    missingComponents.length > 0
      ? `ส่วนควบที่ยังไม่ได้คืน: ${missingComponents.map((component) => `${component.assetTag} - ${component.name}`).join(", ")}`
      : null,
    input.remark ? `หมายเหตุตอนรับคืน: ${input.remark}` : null,
  ].filter(Boolean).join("\n") || "ส่งซ่อมตอนรับคืน"
}
