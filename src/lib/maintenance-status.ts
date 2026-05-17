export const maintenanceStatuses = [
  "open",
  "reported",
  "accepted",
  "in_progress",
  "waiting_parts",
  "waiting_vendor",
  "completed",
  "closed",
] as const

export type MaintenanceStatus = (typeof maintenanceStatuses)[number]

export const closeableMaintenanceStatuses = new Set<string>(["open", "completed"])

export function isMaintenanceClosed(status: string) {
  return status === "closed"
}

export function isMaintenanceOverdue(status: string, dueDate?: Date | string | null, now = new Date()) {
  if (!dueDate || isMaintenanceClosed(status)) return false
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false
  return due < startOfToday(now)
}

export function getMaintenanceStatusTone(status: string) {
  if (status === "closed") return "info"
  if (status === "completed") return "success"
  if (status === "waiting_parts" || status === "waiting_vendor") return "warning"
  if (status === "in_progress") return "primary"
  return "muted"
}

export function getMaintenanceStatusLabel(status: string, labels: Record<string, string>) {
  return labels[status] ?? status
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
