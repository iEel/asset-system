import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

export type StatusPillTone = "neutral" | "info" | "success" | "warning" | "danger"

type StatusPillProps = {
  label: string
  color?: string | null
  tone?: StatusPillTone
  className?: string
}

const toneClasses: Record<StatusPillTone, string> = {
  neutral: "border-border bg-muted text-foreground",
  info: "border-transparent bg-info/10 text-info-foreground",
  success: "border-transparent bg-success/10 text-success-foreground",
  warning: "border-transparent bg-warning/10 text-warning-foreground",
  danger: "border-transparent bg-danger/10 text-danger-foreground",
}

function getCustomColorStyle(color?: string | null): CSSProperties | undefined {
  if (!color) return undefined

  return {
    backgroundColor: `${color}1A`,
    borderColor: `${color}33`,
    color,
  }
}

export function StatusPill({ label, color, tone, className }: StatusPillProps) {
  const resolvedTone = tone ?? (color ? undefined : "neutral")

  return (
    <span
      className={cn("inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium", resolvedTone && toneClasses[resolvedTone], className)}
      style={resolvedTone ? undefined : getCustomColorStyle(color)}
    >
      {label}
    </span>
  )
}
