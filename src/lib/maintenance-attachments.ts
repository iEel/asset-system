export const maintenanceAttachmentTypes = [
  "before_repair",
  "after_repair",
  "quotation",
  "invoice",
  "warranty",
  "other",
] as const

export type MaintenanceAttachmentType = (typeof maintenanceAttachmentTypes)[number]

/** The photo types: the upload opens the phone camera only for these (group 5 spec §8.5). */
export function isMaintenancePhotoType(type: MaintenanceAttachmentType) {
  return type === "before_repair" || type === "after_repair"
}

export const maintenanceAttachmentTypePrefixes = new Set<string>(maintenanceAttachmentTypes)

export function normalizeMaintenanceAttachmentType(value: FormDataEntryValue | string | null | undefined): MaintenanceAttachmentType {
  const text = typeof value === "string" ? value : ""
  return maintenanceAttachmentTypes.includes(text as MaintenanceAttachmentType) ? (text as MaintenanceAttachmentType) : "other"
}

export function buildMaintenanceAttachmentName(type: MaintenanceAttachmentType, fileName: string) {
  return `${type} - ${fileName}`
}

export function getMaintenanceAttachmentType(originalName: string): MaintenanceAttachmentType {
  const [prefix] = originalName.split(" - ")
  return maintenanceAttachmentTypePrefixes.has(prefix) ? (prefix as MaintenanceAttachmentType) : "other"
}

export function getMaintenanceAttachmentDisplayName(originalName: string) {
  const type = getMaintenanceAttachmentType(originalName)
  const prefix = `${type} - `
  return originalName.startsWith(prefix) ? originalName.slice(prefix.length) : originalName
}
