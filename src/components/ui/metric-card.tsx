import { cn } from "@/lib/utils"
import { getMetricCardToneClasses, type UiTone } from "@/lib/design-system"

type MetricCardProps = {
  label: string
  value: string
  helper?: string
  compact?: boolean
  tone?: UiTone
  className?: string
}

export function MetricCard({ label, value, helper, compact = false, tone = "neutral", className }: MetricCardProps) {
  const toneClasses = getMetricCardToneClasses(tone)

  return (
    <div className={cn("rounded-lg border p-5 shadow-sm", toneClasses.container, className)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("mt-2 font-bold", compact ? "text-xl" : "text-2xl", toneClasses.value)}>{value}</div>
      {helper ? <div className="mt-1 text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  )
}
