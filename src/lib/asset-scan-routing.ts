import { extractAssetLookupCandidatesFromScanValue } from "./asset-qr.ts"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function buildDirectAssetHrefFromScanValue(value: string, locale: string) {
  const candidates = extractAssetLookupCandidatesFromScanValue(value)
  const assetId = candidates.find((candidate) => uuidPattern.test(candidate))

  return assetId ? `/${locale}/assets/${assetId}` : ""
}
