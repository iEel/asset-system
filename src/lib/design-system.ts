export const uiTones = ["neutral", "info", "success", "warning", "danger", "muted"] as const

export type UiTone = (typeof uiTones)[number]

const metricToneClasses: Record<UiTone, { container: string; value: string }> = {
  neutral: { container: "border-border bg-surface", value: "text-foreground" },
  info: { container: "border-info/30 bg-info/5", value: "text-info" },
  success: { container: "border-success/30 bg-success/5", value: "text-success" },
  warning: { container: "border-warning/30 bg-warning/5", value: "text-warning" },
  danger: { container: "border-danger/30 bg-danger/5", value: "text-danger" },
  muted: { container: "border-border bg-muted/40", value: "text-foreground" },
}

export function normalizeUiTone(value: unknown): UiTone {
  return typeof value === "string" && uiTones.includes(value as UiTone) ? (value as UiTone) : "neutral"
}

export function getMetricCardToneClasses(tone: UiTone = "neutral") {
  return metricToneClasses[tone]
}
