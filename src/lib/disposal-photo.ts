// Disposal photo rules (group 6 spec §5, §9.5). Server-safe and client-safe: no runtime import; the db is injected
// (routes pass Prisma, the tests fake it).
//
// - Uploads on the disposal and disposal-batch routes accept JPG, PNG and WEBP photos; any other image type (HEIC,
//   HEIF, GIF, AVIF) is refused with DISPOSAL_PHOTO_TYPE. Non-image types keep the general upload rules.
// - "Has a photo" = an active attachment whose fileType starts with image/, on the request (module "disposal") or on
//   its batch (module "disposal_batch").
// - A request that is still pending or approved keeps at least one qualifying file: an image, or for a lost request
//   any file. A batch file counts for every child, and is needed by a child only when it has none of its own.

export const disposalPhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const
export const disposalPhotoAccept = "image/jpeg,image/png,image/webp"
export const disposalEvidenceAccept = "image/jpeg,image/png,image/webp,application/pdf"

export type DisposalPhotoTypeError = "DISPOSAL_PHOTO_TYPE"
export type DisposalLastFileBlock = "DISPOSAL_LAST_PHOTO"

export type DisposalPhotoOwner = { id: string; batchId: string | null }
export type DisposalPhotoRef = {
  id: string
  originalName: string
  fileType: string
  uploadedAt: Date
  source: "request" | "batch"
}

// Method syntax, so fakes may narrow args; Prisma's client fits as is.
export type DisposalPhotoDb = {
  attachment: { findMany(args: object): Promise<unknown[]> }
  disposalRequest: {
    findFirst(args: object): Promise<unknown>
    findMany(args: object): Promise<unknown[]>
  }
}

type AttachmentRow = { id: string; referenceId: string; originalName: string; fileType: string; uploadedAt: Date }
type RequestRow = { id: string; batchId: string | null; requestStatus: string; disposalType: string }

const blockingRequestStatuses = ["pending", "approved"]
const attachmentSelect = { id: true, referenceId: true, originalName: true, fileType: true, uploadedAt: true } as const
const requestSelect = { id: true, batchId: true, requestStatus: true, disposalType: true } as const

/** True for any image type: the "has a photo" count, which also keeps photos uploaded before the type rule. */
export function isDisposalPhotoFile(fileType: string | null | undefined): boolean {
  return typeof fileType === "string" && fileType.toLowerCase().startsWith("image/")
}

/** Non-null for an image type outside JPG, PNG and WEBP; other types are left to the general upload rules. */
export function getDisposalUploadTypeError(fileType: string): DisposalPhotoTypeError | null {
  if (!isDisposalPhotoFile(fileType)) return null
  return (disposalPhotoMimeTypes as readonly string[]).includes(fileType.toLowerCase()) ? null : "DISPOSAL_PHOTO_TYPE"
}

function toRef(row: AttachmentRow, source: DisposalPhotoRef["source"]): DisposalPhotoRef {
  return { id: row.id, originalName: row.originalName, fileType: row.fileType, uploadedAt: row.uploadedAt, source }
}

function byUploadedAt(a: AttachmentRow, b: AttachmentRow) {
  return a.uploadedAt.getTime() - b.uploadedAt.getTime()
}

async function readActiveFiles(db: DisposalPhotoDb, module: "disposal" | "disposal_batch", referenceIds: string[], imagesOnly: boolean) {
  if (referenceIds.length === 0) return [] as AttachmentRow[]
  const rows = (await db.attachment.findMany({
    where: {
      module,
      referenceId: { in: referenceIds },
      isActive: true,
      ...(imagesOnly ? { fileType: { startsWith: "image/" } } : {}),
    },
    select: attachmentSelect,
    orderBy: { uploadedAt: "asc" },
  })) as AttachmentRow[]
  return (imagesOnly ? rows.filter((row) => isDisposalPhotoFile(row.fileType)) : rows).slice().sort(byUploadedAt)
}

/**
 * Each request's own active images, oldest first, then its batch's. Every owner has a key (an empty array when there
 * are none). One attachment read per module.
 */
export async function listDisposalPhotos(db: DisposalPhotoDb, owners: DisposalPhotoOwner[]): Promise<Map<string, DisposalPhotoRef[]>> {
  const photos = new Map<string, DisposalPhotoRef[]>()
  if (owners.length === 0) return photos
  const requestIds = [...new Set(owners.map((owner) => owner.id))]
  const batchIds = [...new Set(owners.map((owner) => owner.batchId).filter((id): id is string => Boolean(id)))]
  const [requestRows, batchRows] = await Promise.all([
    readActiveFiles(db, "disposal", requestIds, true),
    readActiveFiles(db, "disposal_batch", batchIds, true),
  ])
  const group = (rows: AttachmentRow[]) => {
    const byReference = new Map<string, AttachmentRow[]>()
    for (const row of rows) byReference.set(row.referenceId, [...(byReference.get(row.referenceId) ?? []), row])
    return byReference
  }
  const ownImages = group(requestRows)
  const batchImages = group(batchRows)
  for (const owner of owners) {
    photos.set(owner.id, [
      ...(ownImages.get(owner.id) ?? []).map((row) => toRef(row, "request")),
      ...(owner.batchId ? (batchImages.get(owner.batchId) ?? []).map((row) => toRef(row, "batch")) : []),
    ])
  }
  return photos
}

function qualifies(request: Pick<RequestRow, "disposalType">, fileType: string) {
  return request.disposalType === "lost" || isDisposalPhotoFile(fileType)
}

/**
 * Refuses deleting the last qualifying file of a pending or approved request: its last image, or for a lost request
 * its last file of any type. A batch file is refused when a pending or approved child has no qualifying file of its own
 * and no other qualifying batch file.
 */
export async function getDisposalLastFileBlock(
  db: DisposalPhotoDb,
  attachment: { id: string; module: string; referenceId: string; fileType: string },
): Promise<DisposalLastFileBlock | null> {
  if (attachment.module === "disposal") {
    const request = (await db.disposalRequest.findFirst({
      where: { id: attachment.referenceId, isActive: true },
      select: requestSelect,
    })) as RequestRow | null
    if (!request || !blockingRequestStatuses.includes(request.requestStatus)) return null
    if (!qualifies(request, attachment.fileType)) return null
    const [ownFiles, batchFiles] = await Promise.all([
      readActiveFiles(db, "disposal", [request.id], false),
      readActiveFiles(db, "disposal_batch", request.batchId ? [request.batchId] : [], false),
    ])
    const remaining = [...ownFiles, ...batchFiles].filter((row) => row.id !== attachment.id && qualifies(request, row.fileType))
    return remaining.length === 0 ? "DISPOSAL_LAST_PHOTO" : null
  }

  if (attachment.module === "disposal_batch") {
    const children = (await db.disposalRequest.findMany({
      where: { batchId: attachment.referenceId, isActive: true, requestStatus: { in: blockingRequestStatuses } },
      select: requestSelect,
    })) as RequestRow[]
    const needing = children.filter((child) => qualifies(child, attachment.fileType))
    if (needing.length === 0) return null
    const [ownFiles, batchFiles] = await Promise.all([
      readActiveFiles(db, "disposal", needing.map((child) => child.id), false),
      readActiveFiles(db, "disposal_batch", [attachment.referenceId], false),
    ])
    const otherBatchFiles = batchFiles.filter((row) => row.id !== attachment.id)
    for (const child of needing) {
      const hasOther =
        ownFiles.some((row) => row.referenceId === child.id && qualifies(child, row.fileType)) ||
        otherBatchFiles.some((row) => qualifies(child, row.fileType))
      if (!hasOther) return "DISPOSAL_LAST_PHOTO"
    }
    return null
  }

  return null
}
