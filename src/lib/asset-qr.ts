export const assetQrPublicBaseUrlKey = "asset_qr_public_base_url"

export function normalizePublicQrBaseUrl(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return ""

  try {
    const url = new URL(trimmed)
    if (url.protocol !== "http:" && url.protocol !== "https:") return ""
    url.search = ""
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return ""
  }
}

export function buildAssetQrPath(assetId: string) {
  return `/q/a/${encodeURIComponent(assetId)}`
}

export function buildAssetQrValue({
  assetId,
  publicBaseUrl,
  fallbackBaseUrl,
}: {
  assetId: string
  publicBaseUrl?: string | null
  fallbackBaseUrl?: string | null
}) {
  const path = buildAssetQrPath(assetId)
  const baseUrl = normalizePublicQrBaseUrl(publicBaseUrl) || normalizePublicQrBaseUrl(fallbackBaseUrl)
  return baseUrl ? `${baseUrl}${path}` : path
}

export function extractAssetLookupCandidatesFromScanValue(value: string) {
  const trimmed = value.trim()
  const candidates = [trimmed]

  if (!trimmed) return []

  try {
    addCandidatesFromPath(new URL(trimmed).pathname, candidates)
  } catch {
    addCandidatesFromPath(trimmed.split(/[?#]/)[0] ?? "", candidates)
  }

  return Array.from(new Set(candidates.map((candidate) => candidate.trim().toLowerCase()).filter(Boolean)))
}

function addCandidatesFromPath(path: string, candidates: string[]) {
  const segments = path.split("/").filter(Boolean)
  const resolverIndex = segments.findIndex((segment, index) => segment === "q" && segments[index + 1] === "a")
  if (resolverIndex >= 0 && segments[resolverIndex + 2]) candidates.push(decodePathSegment(segments[resolverIndex + 2]))

  const assetIndex = segments.findIndex((segment) => segment === "assets")
  if (assetIndex >= 0 && segments[assetIndex + 1]) candidates.push(decodePathSegment(segments[assetIndex + 1]))

  if (segments.length > 0) candidates.push(decodePathSegment(segments[segments.length - 1]))
}

function decodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}
