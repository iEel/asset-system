export function maskLicenseKey(value?: string | null) {
  if (!value) return null
  const compact = value.replace(/\s+/g, "")
  if (compact.length <= 8) return "••••"
  return `${compact.slice(0, 4)}••••${compact.slice(-4)}`
}

export function getMissingPhotoChecklistLabels(
  photoChecklist: string[],
  attachments: { id: string; originalName: string; fileType: string }[]
) {
  const imageAttachments = attachments.filter((attachment) => attachment.fileType.startsWith("image/"))
  const legacyLabelCounts = photoChecklist.reduce<Record<string, number>>((counts, item) => {
    const legacyLabel = legacySanitizedPhotoLabel(item)
    counts[legacyLabel] = (counts[legacyLabel] ?? 0) + 1
    return counts
  }, {})

  return photoChecklist.filter(
    (item) => !imageAttachments.some((attachment) => attachmentMatchesPhotoLabel(attachment, item, legacyLabelCounts))
  )
}

export function formatMovementType(movementType: string) {
  return movementType
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function attachmentMatchesPhotoLabel(
  attachment: { originalName: string },
  label: string,
  legacyLabelCounts: Record<string, number>
) {
  const normalizedLabel = normalizePhotoLabel(label)
  const legacyLabel = legacySanitizedPhotoLabel(label)
  const legacyLabelIsSafeFallback = Boolean(legacyLabel) && legacyLabelCounts[legacyLabel] === 1

  return [label, normalizedLabel, legacyLabelIsSafeFallback ? legacyLabel : ""]
    .filter(Boolean)
    .some((candidate) => attachment.originalName.startsWith(`${candidate} - `))
}

function normalizePhotoLabel(label: string) {
  return label.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim()
}

function legacySanitizedPhotoLabel(label: string) {
  const normalized = label.normalize("NFKD")
  return normalized.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim()
}
