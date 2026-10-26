export const attachmentThumbnailSize = 96
export const attachmentCardThumbnailSize = 480

/** The ?size= query of the thumbnail route: exactly "card" is the photo card's 480px rendition, anything else the 96px list size. */
export function attachmentThumbnailSizeFor(raw: string | null): number {
  return raw === "card" ? attachmentCardThumbnailSize : attachmentThumbnailSize
}

const thumbnailableImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])
const thumbnailCacheControl = "private, max-age=604800, immutable"

export function isThumbnailable(fileType: string | null | undefined) {
  return thumbnailableImageTypes.has((fileType ?? "").toLowerCase())
}

/** Attachments are never edited in place (a new upload gets a new id), so the tag depends only on the id and the size. */
export function buildThumbnailETag(attachmentId: string, size: number = attachmentThumbnailSize): string {
  return `"${attachmentId}-${size}"`
}

export function thumbnailCacheHeaders(etag: string): Record<string, string> {
  return {
    "Content-Type": "image/webp",
    "Cache-Control": thumbnailCacheControl,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  }
}

export function thumbnailNotModifiedHeaders(etag: string): Record<string, string> {
  return { "Cache-Control": thumbnailCacheControl, ETag: etag }
}

export function matchesIfNoneMatch(header: string | null, etag: string) {
  if (!header) return false
  const target = etag.replace(/^W\//, "")
  return header
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === "*" || value.replace(/^W\//, "") === target)
}

export function thumbnailUrl(attachmentId: string, size?: "card"): string {
  const url = `/api/attachments/${encodeURIComponent(attachmentId)}/thumbnail`
  return size === "card" ? `${url}?size=card` : url
}
