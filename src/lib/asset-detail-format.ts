export type AssetDetailTone = "neutral" | "success" | "info" | "warning" | "danger"

export type MovementDetailLike = {
  label: string
  value?: string | null
}

export function createHealthItem(done: boolean, label: string, href: string, actionLabel: string, fixHref: string) {
  return { done, label, href, actionLabel, fixHref }
}

export function maskLicenseKey(value?: string | null) {
  if (!value) return null
  const compact = value.replace(/\s+/g, "")
  if (compact.length <= 8) return "••••"
  return `${compact.slice(0, 4)}••••${compact.slice(-4)}`
}

export function getWarrantyState(warrantyEndDate: Date | null, now = new Date()) {
  if (!warrantyEndDate) return { tone: "neutral" as const, daysLeft: null }
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const warrantyEnd = new Date(warrantyEndDate)
  warrantyEnd.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((warrantyEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return { tone: "danger" as const, daysLeft }
  if (daysLeft <= 30) return { tone: "warning" as const, daysLeft }
  return { tone: "success" as const, daysLeft }
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

export function getWarrantyIconClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "text-success"
  if (tone === "warning") return "text-warning"
  if (tone === "danger") return "text-danger"
  return "text-muted-foreground"
}

export function getWarrantyPanelClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "border-success/20 bg-success/5"
  if (tone === "warning") return "border-warning/30 bg-warning/10"
  if (tone === "danger") return "border-danger/30 bg-danger/10"
  return "border-border bg-background"
}

export function getHealthPanelClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "border-success/20 bg-success/5"
  if (tone === "warning") return "border-warning/30 bg-warning/10"
  return "border-danger/30 bg-danger/10"
}

export function getHealthBadgeClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "bg-success/10 text-success"
  if (tone === "warning") return "bg-warning/10 text-warning"
  return "bg-danger/10 text-danger"
}

export function getActivityToneClass(tone: AssetDetailTone) {
  if (tone === "success") return "border-success/20 bg-success/5"
  if (tone === "info") return "border-info/20 bg-info/5"
  if (tone === "warning") return "border-warning/30 bg-warning/10"
  if (tone === "danger") return "border-danger/30 bg-danger/10"
  return "border-border bg-background"
}

export function getSummaryToneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "border-success/20 bg-success/5"
  if (tone === "warning") return "border-warning/30 bg-warning/10"
  if (tone === "danger") return "border-danger/30 bg-danger/10"
  return "border-border bg-background"
}

export function formatMovementType(movementType: string) {
  return movementType
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function compactMovementDetails<T extends MovementDetailLike>(details: T[]) {
  const seen = new Set<string>()

  return details.filter((detail) => {
    const value = detail.value?.trim()
    if (!value) return false

    const key = `${detail.label}:${value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
