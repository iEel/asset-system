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
    <div className={compact ? "min-w-44" : "rounded-lg border border-border bg-surface p-4 shadow-sm"}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className={compact ? "text-xs font-medium text-muted-foreground" : "text-sm font-medium text-foreground"}>
          {label}
        </div>
        <div className={compact ? "text-xs font-semibold text-foreground" : "text-sm font-semibold text-foreground"}>
          {percent}%
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${toneClass}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{processedLabel}: {processed}/{total}</span>
        <span>{pendingLabel}: {pending}</span>
      </div>
      {!compact && breakdown.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {breakdown.map((item) => (
            <div key={item.label} className={`rounded-md border px-3 py-2 text-xs ${getBreakdownClass(item.tone)}`}>
              <div className="font-medium">{item.label}</div>
              <div className="mt-1 text-lg font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function getBreakdownClass(tone: AuditProgressTone = "muted") {
  if (tone === "success") return "border-success/30 bg-success/10 text-success"
  if (tone === "warning") return "border-warning/30 bg-warning/10 text-warning"
  if (tone === "danger") return "border-danger/30 bg-danger/10 text-danger"
  if (tone === "info") return "border-info/30 bg-info/10 text-info"
  return "border-border bg-background text-muted-foreground"
}
