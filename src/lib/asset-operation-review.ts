export type OperationReviewItem = {
  label: string
  value: string
}

export function buildOperationReviewSummary(input: {
  assetLabel: string
  sourceLabel?: string | null
  destinationLabels?: Array<string | null | undefined>
  nextStatusLabel?: string | null
  details?: OperationReviewItem[]
  evidenceLabel?: string | null
  labels: {
    asset: string
    source: string
    destination: string
    nextStatus: string
    evidence: string
  }
}): OperationReviewItem[] {
  const items: OperationReviewItem[] = [{ label: input.labels.asset, value: input.assetLabel }]
  const sourceLabel = normalizeReviewValue(input.sourceLabel)
  const destinationLabel = input.destinationLabels?.map(normalizeReviewValue).filter(Boolean).join(" · ")
  const nextStatusLabel = normalizeReviewValue(input.nextStatusLabel)
  const evidenceLabel = normalizeReviewValue(input.evidenceLabel)

  if (sourceLabel) items.push({ label: input.labels.source, value: sourceLabel })
  if (destinationLabel) items.push({ label: input.labels.destination, value: destinationLabel })
  if (nextStatusLabel) items.push({ label: input.labels.nextStatus, value: nextStatusLabel })
  for (const detail of input.details ?? []) {
    const label = normalizeReviewValue(detail.label)
    const value = normalizeReviewValue(detail.value)
    if (label && value) items.push({ label, value })
  }
  if (evidenceLabel) items.push({ label: input.labels.evidence, value: evidenceLabel })

  return items
}

function normalizeReviewValue(value?: string | null) {
  return value?.trim() ?? ""
}
