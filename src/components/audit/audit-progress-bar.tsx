import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { formatCount } from "@/lib/display-format"

type AuditProgressTone = "success" | "warning" | "danger" | "info" | "muted"

type AuditProgressBarProps = {
  total: number
  processed: number
  pending: number
  label: string
  processedLabel: string
  pendingLabel: string
  compact?: boolean
  breakdown?: Array<{
    label: string
    value: number
    tone?: AuditProgressTone
  }>
}

export function AuditProgressBar({
  total,
  processed,
  pending,
  label,
  processedLabel,
  pendingLabel,
  compact = false,
  breakdown = [],
}: AuditProgressBarProps) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0
  const toneClass = percent >= 100 ? "bg-success" : percent >= 50 ? "bg-primary" : "bg-warning"

  return (
    <div className={compact ? "min-w-44" : undefined}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className={compact ? "text-meta font-medium text-muted-foreground" : "text-sm font-medium text-foreground"}>
          {label}
        </div>
        <div className={compact ? "text-meta font-semibold num text-foreground" : "text-sm font-semibold num text-foreground"}>
          {formatCount(percent)}%
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${toneClass}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-meta num text-muted-foreground">
        <span>{processedLabel}: {formatCount(processed)}/{formatCount(total)}</span>
        <span>{pendingLabel}: {formatCount(pending)}</span>
      </div>
      {!compact && breakdown.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {breakdown.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-meta text-muted-foreground">
                <span aria-hidden="true" className={statusMarkerVariants({ tone: item.tone ?? "muted" })} />
                {item.label}
              </dt>
              <dd className="text-count num text-foreground">{formatCount(item.value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
