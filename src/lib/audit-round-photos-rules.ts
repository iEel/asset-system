// Audit photos (spec 2026-11-10-audit-photos-design §2): which audit round a photo of an asset belongs to, and the
// format of the audit_items.photoEvidence link (a JSON array of attachment ids, at most 12, at most 500 characters).
// Server-safe and client-safe: no runtime import.

/** A photo uploaded within this many minutes after a scan of the same asset belongs to that scan's round. */
export const AUDIT_PHOTO_WINDOW_MINUTES = 30
/** The most attachment ids one audit item's photoEvidence holds. */
export const AUDIT_PHOTO_EVIDENCE_MAX_IDS = 12
/** The photoEvidence column's length. */
const AUDIT_PHOTO_EVIDENCE_MAX_CHARS = 500

/** The ids in a photoEvidence value: a JSON array's string entries; anything else reads as no ids. */
export function parsePhotoEvidence(value: string | null | undefined): string[] {
  if (!value) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter((entry): entry is string => typeof entry === "string")
}

/**
 * Adds attachment ids to a photoEvidence value: each id once, up to the cap and the column's length. `linked` is the
 * ids actually added; `value` is the new JSON, or the old value unchanged when nothing was added.
 */
export function appendPhotoEvidence(
  value: string | null | undefined,
  attachmentIds: readonly string[],
): { value: string | null; linked: string[] } {
  const ids = parsePhotoEvidence(value)
  const seen = new Set(ids)
  const linked: string[] = []
  for (const id of attachmentIds) {
    if (seen.has(id)) continue
    if (ids.length >= AUDIT_PHOTO_EVIDENCE_MAX_IDS) break
    if (JSON.stringify([...ids, id]).length > AUDIT_PHOTO_EVIDENCE_MAX_CHARS) continue
    ids.push(id)
    seen.add(id)
    linked.push(id)
  }
  if (linked.length === 0) return { value: value ?? null, linked }
  return { value: JSON.stringify(ids), linked }
}

export type AuditPhotoInput = { id: string; assetId: string; uploadedAt: Date }
export type AuditPhotoLinkInput = { auditRoundId: string; assetId: string; photoEvidence: string | null }
export type AuditPhotoScanInput = { auditRoundId: string; assetId: string; scannedAt: Date }

/**
 * Photo id → audit round id. A photo listed in an audit item's photoEvidence of the same asset belongs to that item's
 * round (the last such link wins); otherwise it belongs to the round of the latest scan of the same asset whose window
 * [scannedAt, scannedAt + 30 min) holds the upload. A photo with no round is absent.
 */
export function assignAuditRoundPhotos(input: {
  photos: readonly AuditPhotoInput[]
  links: readonly AuditPhotoLinkInput[]
  scans: readonly AuditPhotoScanInput[]
}): Map<string, string> {
  // assetId → (photo id → round id); later links overwrite earlier ones.
  const linksByAsset = new Map<string, Map<string, string>>()
  for (const link of input.links) {
    const ids = parsePhotoEvidence(link.photoEvidence)
    if (ids.length === 0) continue
    let byPhoto = linksByAsset.get(link.assetId)
    if (!byPhoto) linksByAsset.set(link.assetId, (byPhoto = new Map()))
    for (const id of ids) byPhoto.set(id, link.auditRoundId)
  }

  // assetId → that asset's scans.
  const scansByAsset = new Map<string, AuditPhotoScanInput[]>()
  for (const scan of input.scans) {
    const list = scansByAsset.get(scan.assetId)
    if (list) list.push(scan)
    else scansByAsset.set(scan.assetId, [scan])
  }

  const windowMs = AUDIT_PHOTO_WINDOW_MINUTES * 60_000
  const result = new Map<string, string>()
  for (const photo of input.photos) {
    const linked = linksByAsset.get(photo.assetId)?.get(photo.id)
    if (linked !== undefined) {
      result.set(photo.id, linked)
      continue
    }
    const uploaded = photo.uploadedAt.getTime()
    let best: AuditPhotoScanInput | null = null
    for (const scan of scansByAsset.get(photo.assetId) ?? []) {
      const scanned = scan.scannedAt.getTime()
      if (uploaded < scanned || uploaded >= scanned + windowMs) continue
      if (!best || scanned > best.scannedAt.getTime()) best = scan
    }
    if (best) result.set(photo.id, best.auditRoundId)
  }
  return result
}
