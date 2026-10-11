import { cn } from "@/lib/utils"
import { getStatusTone, type StatusTone } from "@/lib/status-tone"
import { statusBadgeVariants, statusMarkerVariants } from "@/components/ui/badge-variants"

export { getStatusTone, type StatusTone } from "@/lib/status-tone"

const knownTones = new Set<StatusTone>(["neutral", "muted", "primary", "info", "success", "warning", "danger"])

export function StatusBadge({
  label,
  status,
  tone,
  className,
}: {
  label: string
  status?: string | null
  tone?: StatusTone | string
  /** @deprecated Has no effect: every StatusBadge is the same 22px size. The next commit removes it with its call-site attributes. */
  size?: "xs" | "sm"
  className?: string
}) {
  const resolvedTone: StatusTone =
    tone && knownTones.has(tone as StatusTone) ? (tone as StatusTone) : getStatusTone(status)

  return (
    <span data-slot="status-badge" data-tone={resolvedTone} className={cn(statusBadgeVariants({ tone: resolvedTone }), className)}>
      <span aria-hidden="true" className={statusMarkerVariants({ tone: resolvedTone })} />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}
