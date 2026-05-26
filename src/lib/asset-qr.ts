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

export function buildAssetQrRedirectUrl({
  targetPath,
  publicBaseUrl,
  requestUrl,
  forwardedHost,
  forwardedProto,
  host,
  fallbackBaseUrl,
}: {
  targetPath: string
  publicBaseUrl?: string | null
  requestUrl: string
  forwardedHost?: string | null
  forwardedProto?: string | null
  host?: string | null
  fallbackBaseUrl?: string | null
}) {
  const requestOrigin = normalizePublicQrBaseUrl(new URL(requestUrl).origin)
  const candidateOrigins = [
    normalizePublicQrBaseUrl(publicBaseUrl),
    buildForwardedOrigin({ forwardedHost, forwardedProto, host, requestUrl }),
    normalizePublicQrBaseUrl(fallbackBaseUrl),
    requestOrigin,
  ].filter(Boolean)
  const publicOrigin = candidateOrigins.find((origin) => !isLikelyLocalAssetQrValue(origin)) ?? requestOrigin

  return new URL(targetPath, `${publicOrigin}/`).toString()
}

export function isLikelyLocalAssetQrValue(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return true
  if (trimmed.startsWith("/")) return true

  try {
    const hostname = new URL(trimmed).hostname.toLowerCase()
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local") ||
      isPrivateIpv4(hostname)
    )
  } catch {
    return true
  }
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

function buildForwardedOrigin({
  forwardedHost,
  forwardedProto,
  host,
  requestUrl,
}: {
  forwardedHost?: string | null
  forwardedProto?: string | null
  host?: string | null
  requestUrl: string
}) {
  const headerHost = firstHeaderValue(forwardedHost) || firstHeaderValue(host)
  if (!headerHost) return ""

  const protocol = firstHeaderValue(forwardedProto) || new URL(requestUrl).protocol.replace(/:$/, "")
  const cleanHost = headerHost.replace(/^https?:\/\//i, "").split("/")[0]?.trim()
  if (!cleanHost) return ""

  return normalizePublicQrBaseUrl(`${protocol}://${cleanHost}`)
}

function firstHeaderValue(value?: string | null) {
  return value?.split(",")[0]?.trim() ?? ""
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false

  const [first, second] = parts
  return first === 10 || first === 127 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31)
}
