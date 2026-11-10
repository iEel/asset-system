// Audit photos (spec 2026-11-10-audit-photos-design §2): the one loader that applies assignAuditRoundPhotos. Every
// photo of the given assets (module "asset", active, a type the thumbnail route draws), newest first, each with the
// audit round it belongs to, or null. The files tab, the round page and the history call it.
// The db is injected: this file never imports @/lib/db; callers pass `prisma as unknown as AuditRoundPhotoDb`.

import { THUMBNAILABLE_IMAGE_TYPES } from "./attachment-thumbnail.ts"
import { chunkAuditIds } from "./audit-round-counts-rules.ts"
import {
  AUDIT_PHOTO_WINDOW_MINUTES,
  assignAuditRoundPhotos,
  type AuditPhotoLinkInput,
  type AuditPhotoScanInput,
} from "./audit-round-photos-rules.ts"

// Method syntax, so fakes may narrow args.
export type AuditRoundPhotoDb = {
  attachment: { findMany(args: object): Promise<unknown[]> }
  auditItem: { findMany(args: object): Promise<unknown[]> }
  auditScanHistory: { findMany(args: object): Promise<unknown[]> }
}

export type AuditRoundPhoto = { id: string; assetId: string; originalName: string; uploadedAt: Date; auditRoundId: string | null }

type PhotoRow = { id: string; assetId: string; originalName: string; uploadedAt: Date }

function newestFirst(left: { id: string; uploadedAt: Date }, right: { id: string; uploadedAt: Date }) {
  const byTime = right.uploadedAt.getTime() - left.uploadedAt.getTime()
  if (byTime !== 0) return byTime
  return left.id < right.id ? 1 : left.id > right.id ? -1 : 0
}

export async function loadAuditRoundPhotos(
  db: AuditRoundPhotoDb,
  assetIds: readonly string[],
  options: { uploadedFrom?: Date } = {},
): Promise<AuditRoundPhoto[]> {
  if (assetIds.length === 0) return []
  const chunks = chunkAuditIds([...new Set(assetIds)])
  const { uploadedFrom } = options

  // 1. The photos.
  const photos: PhotoRow[] = []
  for (const chunk of chunks) {
    const rows = (await db.attachment.findMany({
      where: {
        assetId: { in: chunk },
        module: "asset",
        isActive: true,
        fileType: { in: [...THUMBNAILABLE_IMAGE_TYPES] },
        ...(uploadedFrom ? { uploadedAt: { gte: uploadedFrom } } : {}),
      },
      select: { id: true, assetId: true, originalName: true, uploadedAt: true },
      orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
    })) as PhotoRow[]
    photos.push(...rows)
  }

  // 2. The items that link photos.
  const links: AuditPhotoLinkInput[] = []
  for (const chunk of chunks) {
    const rows = (await db.auditItem.findMany({
      where: { assetId: { in: chunk }, photoEvidence: { not: null } },
      select: { auditRoundId: true, assetId: true, photoEvidence: true },
    })) as AuditPhotoLinkInput[]
    links.push(...rows)
  }

  // 3. The scans whose window can hold a photo; none to read when there are no photos.
  const scans: AuditPhotoScanInput[] = []
  if (photos.length > 0) {
    const fromMs = uploadedFrom
      ? uploadedFrom.getTime()
      : photos.reduce((oldest, photo) => Math.min(oldest, photo.uploadedAt.getTime()), Number.POSITIVE_INFINITY)
    const scannedFrom = new Date(fromMs - AUDIT_PHOTO_WINDOW_MINUTES * 60_000)
    for (const chunk of chunks) {
      const rows = (await db.auditScanHistory.findMany({
        where: { assetId: { in: chunk }, scannedAt: { gte: scannedFrom } },
        select: { auditRoundId: true, assetId: true, scannedAt: true },
      })) as AuditPhotoScanInput[]
      scans.push(...rows)
    }
  }

  const rounds = assignAuditRoundPhotos({ photos, links, scans })
  return photos
    .sort(newestFirst)
    .map((photo) => ({
      id: photo.id,
      assetId: photo.assetId,
      originalName: photo.originalName,
      uploadedAt: photo.uploadedAt,
      auditRoundId: rounds.get(photo.id) ?? null,
    }))
}
