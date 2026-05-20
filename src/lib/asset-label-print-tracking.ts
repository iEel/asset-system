export const labelPrintQueueModes = ["unprinted", "printed", "recent"] as const
export type LabelPrintQueueMode = (typeof labelPrintQueueModes)[number]

const labelTapeSizes = ["12", "18", "24", "custom"] as const
export type NormalizedLabelTapeSize = (typeof labelTapeSizes)[number]

export function normalizeLabelPrintAssetIds(assetIds: unknown, maxItems = 100) {
  if (!Array.isArray(assetIds)) return []

  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of assetIds) {
    if (typeof value !== "string") continue
    const id = value.trim()
    if (!id || seen.has(id)) continue
    normalized.push(id)
    seen.add(id)
    if (normalized.length >= maxItems) break
  }

  return normalized
}

export function normalizeLabelTapeSize(
  value: unknown,
  fallback: NormalizedLabelTapeSize = "24"
): NormalizedLabelTapeSize {
  const safeFallback = labelTapeSizes.includes(fallback) ? fallback : "24"
  return labelTapeSizes.includes(value as NormalizedLabelTapeSize)
    ? value as NormalizedLabelTapeSize
    : safeFallback
}

export function normalizeLabelPrintQueueMode(value: unknown): LabelPrintQueueMode {
  return labelPrintQueueModes.includes(value as LabelPrintQueueMode)
    ? value as LabelPrintQueueMode
    : "recent"
}

export function buildAssetLabelPrintQueueWhere(modeValue: unknown) {
  const mode = normalizeLabelPrintQueueMode(modeValue)
  if (mode === "unprinted") {
    return {
      isActive: true,
      labelPrints: { none: {} },
    }
  }
  if (mode === "printed") {
    return {
      isActive: true,
      labelPrints: { some: {} },
    }
  }
  return { isActive: true }
}
