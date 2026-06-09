type AssetLabelDisplaySource = {
  name?: string | null
  brand?: { name?: string | null } | null
  model?: { name?: string | null } | null
}

export function buildAssetLabelSubtitle(asset: AssetLabelDisplaySource, fallback = "-") {
  const parts: string[] = []
  appendLabelPart(parts, asset.name)
  appendLabelPart(parts, asset.model?.name)
  appendLabelPart(parts, asset.brand?.name)

  return parts.join(" / ") || fallback
}

function appendLabelPart(parts: string[], value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || isRedundantLabelPart(trimmed, parts)) return
  parts.push(trimmed)
}

export function isRedundantLabelPart(candidate: string, existingParts: string[]) {
  const normalizedCandidate = normalizeLabelText(candidate)
  if (!normalizedCandidate) return true

  return existingParts
    .map(normalizeLabelText)
    .some((part) => part === normalizedCandidate || part.includes(normalizedCandidate))
}

function normalizeLabelText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
}
