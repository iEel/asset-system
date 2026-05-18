import { cn } from "@/lib/utils"

type StatusTone = "neutral" | "muted" | "primary" | "info" | "success" | "warning" | "danger"

const statusToneMap: Record<string, StatusTone> = {
  active: "success",
  approved: "primary",
  closed: "success",
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

export function StatusBadge({
  label,
  status,
  tone,
  size = "sm",
}: {
  label: string
  status?: string | null
  tone?: StatusTone | string
  size?: "xs" | "sm"
}) {
  const resolvedTone = (tone as StatusTone | undefined) ?? getStatusTone(status)
  const toneClass =
    resolvedTone === "danger"
      ? "bg-danger/10 text-danger"
      : resolvedTone === "warning"
        ? "bg-warning/10 text-warning"
        : resolvedTone === "success"
          ? "bg-success/10 text-success"
          : resolvedTone === "info"
            ? "bg-info/10 text-info"
            : resolvedTone === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full font-medium",
        size === "xs" ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm",
        toneClass,
      )}
    >
      {label}
    </span>
  )
}
