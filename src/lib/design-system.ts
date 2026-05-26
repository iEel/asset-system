export const uiTones = ["neutral", "info", "success", "warning", "danger", "muted"] as const
export const uiButtonVariants = ["primary", "secondary", "danger", "ghost"] as const
export const uiButtonSizes = ["sm", "md"] as const

export type UiTone = (typeof uiTones)[number]
export type UiButtonVariant = (typeof uiButtonVariants)[number]
export type UiButtonSize = (typeof uiButtonSizes)[number]

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

export function getPanelClasses() {
  return "min-w-0 max-w-full rounded-lg border border-border bg-surface shadow-sm"
}

export function getTableShellClasses() {
  return "overflow-hidden rounded-md border border-border"
}

export function getResponsiveTableScrollClasses() {
  return "w-full max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-border"
}

export function getMobileCardListClasses() {
  return "grid gap-3 md:hidden"
}

export function getDesktopTableOnlyClasses() {
  return "hidden md:block"
}

export function getEmptyStateClasses() {
  return "rounded-md border border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground"
}

export function getFieldControlClasses() {
  return "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
}

export function getActionButtonClasses(variant: UiButtonVariant = "secondary", size: UiButtonSize = "md") {
  const sizeClass = size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
  const variantClass = {
    primary: "bg-primary text-white hover:bg-primary/90",
    secondary: "border border-border bg-surface text-foreground hover:bg-accent",
    danger: "bg-danger text-white hover:bg-danger/90",
    ghost: "text-foreground hover:bg-accent",
  }[variant]
  return `inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass} ${variantClass}`
}

export function getSafeActionLinkClasses(variant: Extract<UiButtonVariant, "primary" | "secondary" | "ghost"> = "secondary") {
  const variantClass = {
    primary: "bg-primary text-white hover:bg-primary/90",
    secondary: "border border-border bg-surface text-foreground hover:bg-accent",
    ghost: "text-foreground hover:bg-accent",
  }[variant]

  return `inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-center text-sm font-medium leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-fit ${variantClass}`
}

export function getResponsiveActionRowClasses() {
  return "flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
}

export function getMobileSafeBottomPaddingClasses() {
  return "pb-24 sm:pb-0"
}

export function getTouchIconButtonClasses() {
  return "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
}
