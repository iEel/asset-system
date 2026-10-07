export type StatusTone = "neutral" | "muted" | "primary" | "info" | "success" | "warning" | "danger"

const statusToneMap: Record<string, StatusTone> = {
  active: "success",
  approved: "primary",
  closed: "success",
  cancelled: "danger",
  completed: "success",
  disposed: "success",
  done: "primary",
  exception: "warning",
  in_progress: "warning",
  open: "info",
  pending: "warning",
  planned: "info",
  rejected: "danger",
  reported: "info",
  accepted: "primary",
  waiting_parts: "warning",
  waiting_vendor: "warning",
  danger: "danger",
  warning: "warning",
  success: "success",
  info: "info",
  primary: "primary",
}

export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return "muted"
  return statusToneMap[status] ?? "muted"
}

export function getStatusDotColor(color: string | null | undefined) {
  if (typeof color !== "string") return undefined
  const value = color.trim()
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : undefined
}
