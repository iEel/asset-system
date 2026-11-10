// The photo on the audit scan page (audit photos spec §3): the asset's own newest photo, else its model's newest photo
// (marked fromModel, drawn with "รูปประจำรุ่น"), else none. Only the thumbnail route's image types count, id lists go in
// chunks of 2,000 (SQL Server's 2,100-parameter limit; a round can hold every active asset), and a photo the viewer may
// not see is never read. The db is injected (the scan loaders pass prisma, the tests fake it). This order is the scan
// page's own; the register's model-first rule in asset-photo-preview.ts is unchanged.

import { hasAttachmentPermission } from "@/lib/attachment-access"
import type { AssetPhotoPreviewDb } from "@/lib/asset-photo-preview"
import { THUMBNAILABLE_IMAGE_TYPES } from "@/lib/attachment-thumbnail"
import { chunkAuditIds } from "@/lib/audit-round-counts-rules"

export type AuditScanPhoto = { attachmentId: string; fromModel: boolean }
export type AuditScanPhotoAccess = { assetPhotos: boolean; modelPhotos: boolean }

export function auditScanPhotoAccess(user: Parameters<typeof hasAttachmentPermission>[0]): AuditScanPhotoAccess {
  return {
    assetPhotos: hasAttachmentPermission(user, "asset", "view"),
    modelPhotos: hasAttachmentPermission(user, "asset_model", "view"),
  }
}

/** The own photo when the viewer may see asset photos, else the model photo when they may see model photos, else null. */
export function chooseAuditScanPhoto(
  own: string | null | undefined,
  model: string | null | undefined,
  access: AuditScanPhotoAccess,
): AuditScanPhoto | null {
  if (own && access.assetPhotos) return { attachmentId: own, fromModel: false }
  if (model && access.modelPhotos) return { attachmentId: model, fromModel: true }
  return null
}

const photoWhere = { isActive: true, fileType: { in: [...THUMBNAILABLE_IMAGE_TYPES] } }
// Newest first; the id breaks a tie in uploadedAt so the same photo wins on every read.
const newestFirst = [{ uploadedAt: "desc" }, { id: "desc" }] as const

async function newestPerKey(
  db: AssetPhotoPreviewDb,
  ids: readonly string[],
  module: "asset" | "asset_model",
): Promise<Map<string, string>> {
  const key = module === "asset" ? "assetId" : "referenceId"
  const newest = new Map<string, string>()
  for (const chunk of chunkAuditIds(ids)) {
    const rows = (await db.attachment.findMany({
      where: { module, [key]: { in: chunk }, ...photoWhere },
      select: { id: true, [key]: true },
      orderBy: newestFirst,
    })) as Array<{ id: string; assetId?: string | null; referenceId?: string | null }>
    for (const row of rows) {
      const value = row[key]
      if (value && !newest.has(value)) newest.set(value, row.id)
    }
  }
  return newest
}

/**
 * At most two reads (each in chunks): the assets' own photos when the viewer may see them, then the models' photos only
 * for the assets left without one. An asset with no photo the viewer may see is absent from the map.
 */
export async function readAuditScanPhotos(
  db: AssetPhotoPreviewDb,
  assets: readonly { id: string; modelId: string | null }[],
  access: AuditScanPhotoAccess,
): Promise<Map<string, AuditScanPhoto>> {
  const photos = new Map<string, AuditScanPhoto>()
  if (assets.length === 0) return photos
  const own = access.assetPhotos ? await newestPerKey(db, [...new Set(assets.map((asset) => asset.id))], "asset") : new Map<string, string>()
  const withoutOwn = assets.filter((asset) => !own.has(asset.id))
  const modelIds = access.modelPhotos
    ? [...new Set(withoutOwn.map((asset) => asset.modelId).filter((id): id is string => Boolean(id)))]
    : []
  const byModel = modelIds.length ? await newestPerKey(db, modelIds, "asset_model") : new Map<string, string>()
  for (const asset of assets) {
    const photo = chooseAuditScanPhoto(own.get(asset.id), asset.modelId ? byModel.get(asset.modelId) : undefined, access)
    if (photo) photos.set(asset.id, photo)
  }
  return photos
}
