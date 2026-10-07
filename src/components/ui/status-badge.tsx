import { cn } from "@/lib/utils"
import { getStatusDotColor, getStatusTone, type StatusTone } from "@/lib/status-tone"
import { statusBadgeVariants, statusDotVariants } from "@/components/ui/badge-variants"

export { getStatusTone, type StatusTone } from "@/lib/status-tone"

const knownTones = new Set<StatusTone>(["neutral", "muted", "primary", "info", "success", "warning", "danger"])

export function StatusBadge({
  label,
  status,
  tone,
  size = "sm",
  color,
  className,
}: {
  label: string
  status?: string | null
  tone?: StatusTone | string
  size?: "xs" | "sm"
  color?: string | null
  className?: string
}) {
  const resolvedTone: StatusTone =
    tone && knownTones.has(tone as StatusTone) ? (tone as StatusTone) : getStatusTone(status)
  const dotColor = getStatusDotColor(color)

  return (
    <span data-slot="status-badge" className={cn(statusBadgeVariants({ tone: resolvedTone, size }), className)}>
      <span
        aria-hidden="true"
        className={statusDotVariants({ tone: resolvedTone })}
        style={dotColor ? { backgroundColor: dotColor } : undefined}
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}
