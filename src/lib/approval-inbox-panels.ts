// The approvals page's right panel (group 6 spec §7.4–7.6): what one chosen disposal request or audit round shows. The
// db is injected (the page passes Prisma, the tests fake it); the finding panel is loadAuditFindingPanel in
// audit-findings-page-data.ts, shared with the findings page. Nothing here writes.
import { getApprovalAgeStatus, type ApprovalAgeStatus } from "@/lib/approval-aging"
import { getAuditRoundCloseChecklist, type AuditRoundCloseChecklist } from "@/lib/audit-round-close"
import { bangkokYear } from "@/lib/audit-rounds-list-rules"
import { getDisposalApprovalBlock, type DisposalApprovalBlock } from "@/lib/disposal-bulk-approval"
import { isDisposalPhotoFile, listDisposalPhotos, type DisposalPhotoDb, type DisposalPhotoRef } from "@/lib/disposal-photo"
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import { readDisposalSourceLinks, type DisposalSourceDb, type DisposalSourceLink } from "@/lib/disposal-source"

export type DisposalInboxPanel = {
  request: {
    id: string
    disposalNo: string
    disposalType: string
    reason: string
    requestStatus: string
    requestDate: Date
    approvalRemark: string | null
  }
  asset: {
    id: string
    name: string
    assetTag: string
    serialNumber: string | null
    purchasePrice: string | null
    purchaseYear: number | null
    locationName: string | null
    branchName: string | null
    custodianName: string | null
    conditionName: string | null
  }
  requesterName: string
  photos: DisposalPhotoRef[]
  /** The request's and its batch's active files that are not images (the PDFs). */
  documents: Array<{ id: string; originalName: string; fileType: string }>
  source: DisposalSourceLink | null
  /** The status the asset returns to on a rejection: Thai name, else the name. */
  previousStatusName: string | null
  /** Why the viewer may not approve it; null when they may. */
  block: DisposalApprovalBlock | null
  age: ApprovalAgeStatus
  isPending: boolean
}

export type DisposalInboxPanelDb = DisposalPhotoDb & DisposalSourceDb

export type DisposalInboxPanelInput = {
  requestId: string
  locale: string
  viewer: { userId: string; employeeId?: string | null }
  segregationRequired: boolean
  slaDays: number
  now: Date
}

type NamedRow = { name: string; nameTh?: string | null } | null

type DisposalPanelRecord = {
  id: string
  disposalNo: string
  disposalType: string
  reason: string
  requestStatus: string
  requestDate: Date
  approvalRemark: string | null
  isActive: boolean
  requestedById: string
  createdBy: string
  sourceType: string | null
  sourceId: string | null
  batchId?: string | null
  asset: {
    id: string
    name: string
    assetTag: string
    serialNumber: string | null
    purchasePrice: { toString(): string } | null
    purchaseDate: Date | null
    currentLocation: { name: string } | null
    branch: { name: string } | null
    custodian: { code: string; fullNameTh: string } | null
    condition: NamedRow
    status: { name: string; nameTh: string | null; isActive: boolean } | null
  }
  requestedBy: { code: string; fullNameTh: string } | null
  previousAssetStatus: NamedRow
}

function disposalPanelSelect(withBatch: boolean) {
  return {
    id: true,
    disposalNo: true,
    disposalType: true,
    reason: true,
    requestStatus: true,
    requestDate: true,
    approvalRemark: true,
    isActive: true,
    requestedById: true,
    createdBy: true,
    sourceType: true,
    sourceId: true,
    // The column exists only once the batch migration has run.
    ...(withBatch ? { batchId: true } : {}),
    asset: {
      select: {
        id: true,
        name: true,
        assetTag: true,
        serialNumber: true,
        purchasePrice: true,
        purchaseDate: true,
        currentLocation: { select: { name: true } },
        branch: { select: { name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        condition: { select: { name: true, nameTh: true } },
        status: { select: { name: true, nameTh: true, isActive: true } },
      },
    },
    requestedBy: { select: { code: true, fullNameTh: true } },
    previousAssetStatus: { select: { name: true, nameTh: true } },
  }
}

const thaiName = (row: NamedRow) => (row ? row.nameTh || row.name : null)

/** One disposal request for the panel; null when it is missing or inactive. */
export async function loadDisposalInboxPanel(db: DisposalInboxPanelDb, input: DisposalInboxPanelInput): Promise<DisposalInboxPanel | null> {
  const withBatch = await isDisposalBatchSchemaReady()
  const request = (await db.disposalRequest.findFirst({
    where: { id: input.requestId, isActive: true },
    select: disposalPanelSelect(withBatch),
  })) as DisposalPanelRecord | null
  if (!request || !request.isActive) return null

  const batchId = withBatch ? (request.batchId ?? null) : null
  const [photos, files, sources] = await Promise.all([
    listDisposalPhotos(db, [{ id: request.id, batchId }]),
    db.attachment.findMany({
      where: {
        isActive: true,
        NOT: { fileType: { startsWith: "image/" } },
        OR: [
          { module: "disposal", referenceId: request.id },
          ...(batchId ? [{ module: "disposal_batch", referenceId: batchId }] : []),
        ],
      },
      select: { id: true, originalName: true, fileType: true },
      orderBy: { uploadedAt: "asc" },
    }) as Promise<Array<{ id: string; originalName: string; fileType: string }>>,
    readDisposalSourceLinks(db, input.locale, [{ id: request.id, sourceType: request.sourceType, sourceId: request.sourceId }]),
  ])

  const { asset } = request
  return {
    request: {
      id: request.id,
      disposalNo: request.disposalNo,
      disposalType: request.disposalType,
      reason: request.reason,
      requestStatus: request.requestStatus,
      requestDate: request.requestDate,
      approvalRemark: request.approvalRemark ?? null,
    },
    asset: {
      id: asset.id,
      name: asset.name,
      assetTag: asset.assetTag,
      serialNumber: asset.serialNumber ?? null,
      purchasePrice: asset.purchasePrice != null ? asset.purchasePrice.toString() : null,
      purchaseYear: asset.purchaseDate ? bangkokYear(asset.purchaseDate) : null,
      locationName: asset.currentLocation?.name ?? null,
      branchName: asset.branch?.name ?? null,
      custodianName: asset.custodian ? asset.custodian.fullNameTh || asset.custodian.code : null,
      conditionName: thaiName(asset.condition),
    },
    requesterName: request.requestedBy ? request.requestedBy.fullNameTh || request.requestedBy.code : request.requestedById,
    photos: photos.get(request.id) ?? [],
    documents: files
      .filter((file) => !isDisposalPhotoFile(file.fileType))
      .map((file) => ({ id: file.id, originalName: file.originalName, fileType: file.fileType })),
    source: sources.get(request.id) ?? null,
    previousStatusName: thaiName(request.previousAssetStatus),
    block: getDisposalApprovalBlock(
      {
        id: request.id,
        disposalNo: request.disposalNo,
        isActive: request.isActive,
        requestStatus: request.requestStatus,
        requestedById: request.requestedById,
        createdBy: request.createdBy,
        asset: { assetTag: asset.assetTag, status: asset.status },
      },
      { userId: input.viewer.userId, employeeId: input.viewer.employeeId },
      input.segregationRequired,
    ),
    age: getApprovalAgeStatus(request.requestDate, input.now, input.slaDays),
    isPending: request.requestStatus === "pending",
  }
}

// Method syntax, so fakes may narrow args; Prisma's client fits as is.
export type AuditRoundClosePanelDb = {
  auditRound: { findFirst(args: { where: { id: string; isActive: boolean }; select: object }): Promise<unknown> }
  user: { findUnique(args: { where: { id: string }; select: object }): Promise<unknown> }
}

export type AuditRoundClosePanel = {
  id: string
  auditNo: string
  name: string
  startDate: Date
  endDate: Date | null
  /** User.displayName, else the raw id (a removed account). */
  createdByName: string
  checklist: AuditRoundCloseChecklist
  ready: boolean
}

/** One audit round for the close panel, with the close API's own checklist; null when it is missing or inactive. */
export async function loadAuditRoundClosePanel(db: AuditRoundClosePanelDb, roundId: string): Promise<AuditRoundClosePanel | null> {
  const round = (await db.auditRound.findFirst({
    where: { id: roundId, isActive: true },
    select: { id: true, auditNo: true, name: true, startDate: true, endDate: true, createdBy: true },
  })) as { id: string; auditNo: string; name: string; startDate: Date; endDate: Date | null; createdBy: string } | null
  if (!round) return null

  const [creator, checklist] = await Promise.all([
    db.user.findUnique({ where: { id: round.createdBy }, select: { displayName: true } }) as Promise<{ displayName: string | null } | null>,
    getAuditRoundCloseChecklist(round.id),
  ])

  return {
    id: round.id,
    auditNo: round.auditNo,
    name: round.name,
    startDate: round.startDate,
    endDate: round.endDate ?? null,
    createdByName: creator?.displayName || round.createdBy,
    checklist,
    ready: checklist.canClose,
  }
}
