export const attachmentThumbnailSize = 96

const thumbnailableImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])
const thumbnailCacheControl = "private, max-age=604800, immutable"

export function isThumbnailable(fileType: string | null | undefined) {
  return thumbnailableImageTypes.has((fileType ?? "").toLowerCase())
}

/** Attachments are never edited in place (a new upload gets a new id), so the tag only depends on id and size. */
export function buildThumbnailETag(attachmentId: string) {
  return `"${attachmentId}-${attachmentThumbnailSize}"`
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

export function thumbnailUrl(attachmentId: string) {
  return `/api/attachments/${encodeURIComponent(attachmentId)}/thumbnail`
}
