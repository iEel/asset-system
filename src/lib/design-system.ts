import { buttonVariants } from "../components/ui/button-variants.ts"
import { fieldControlVariants, type FieldSize } from "../components/ui/field-variants.ts"
import { cn } from "./utils.ts"

export const uiTones = ["neutral", "info", "success", "warning", "danger", "muted"] as const
export const uiButtonVariants = ["primary", "secondary", "danger", "ghost"] as const
export const uiButtonSizes = ["sm", "md"] as const

export type UiTone = (typeof uiTones)[number]
export type UiButtonVariant = (typeof uiButtonVariants)[number]
export type UiButtonSize = (typeof uiButtonSizes)[number]

const metricToneClasses: Record<UiTone, { container: string; value: string }> = {
  neutral: { container: "border-border bg-surface", value: "text-foreground" },
  info: { container: "border-info-border bg-info-soft", value: "text-info" },
  success: { container: "border-success-border bg-success-soft", value: "text-success" },
  warning: { container: "border-warning-border bg-warning-soft", value: "text-warning" },
  danger: { container: "border-danger-border bg-danger-soft", value: "text-danger" },
  muted: { container: "border-border bg-background", value: "text-foreground" },
}

const successAssetStateValues = new Set(["ready", "in use", "new", "excellent", "good", "active"])
const warningAssetStateValues = new Set(["checked out", "under maintenance", "pending repair", "under inspection", "pending disposal", "fair"])
const dangerAssetStateValues = new Set(["lost", "missing", "damaged", "non functional", "poor"])
// Salvage describes a terminal inventory state, so it shares neutral inactive treatment.
const neutralAssetStateValues = new Set(["draft", "disposed", "retired", "salvage"])

export function normalizeUiTone(value: unknown): UiTone {
  return typeof value === "string" && uiTones.includes(value as UiTone) ? (value as UiTone) : "neutral"
}

export function getMetricCardToneClasses(tone: UiTone = "neutral") {
  return metricToneClasses[tone]
}

export function normalizeAssetStateValue(value?: string | null) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[_\s-]+/g, " ") : ""
}

export function getAssetStateTone(value?: string | null): UiTone {
  const normalizedValue = normalizeAssetStateValue(value)

  if (!normalizedValue) return "muted"
  if (successAssetStateValues.has(normalizedValue)) return "success"
  if (warningAssetStateValues.has(normalizedValue)) return "warning"
  if (dangerAssetStateValues.has(normalizedValue)) return "danger"
  if (neutralAssetStateValues.has(normalizedValue)) return "neutral"
  return "info"
}

export function getPanelClasses() {
  return "min-w-0 max-w-full rounded-lg border border-border bg-surface"
}

/** @deprecated No caller since phase 2B plan 5 (the storage tables are DataTable, which scrolls sideways). Phase 2D deletes it with its pin in tests/design-system.test.ts. */
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

// The field recipe as a class string, for elements that cannot use a primitive (a <button> trigger, a <select>
// that keeps its own markup). Change the height with fieldSize, not a className. <select> callers get no chevron here.
export function getFieldControlClasses(options?: { fieldSize?: FieldSize }) {
  return fieldControlVariants(options)
}

const legacyButtonVariant = {
  primary: "default",
  secondary: "outline",
  danger: "destructive",
  ghost: "ghost",
} as const

const legacyButtonSize = {
  md: "default",
  sm: "sm",
} as const

/** @deprecated Use `buttonVariants` from `components/ui/button-variants.ts`. No caller since phase 2B plan 5 (the report filter panel uses Button); phase 2D deletes it. */
export function getActionButtonClasses(variant: UiButtonVariant = "secondary", size: UiButtonSize = "md") {
  return buttonVariants({ variant: legacyButtonVariant[variant], size: legacyButtonSize[size] })
}

// A link that looks like a default-size Button but lets a long label wrap and grow taller. cn() is required:
// Tailwind emits whitespace-normal before whitespace-nowrap, so appending the string would keep the nowrap.
// Phase 2D changes md:min-h-10 to md:min-h-9 when the default button becomes 36px.
export function getSafeActionLinkClasses(variant: Extract<UiButtonVariant, "primary" | "secondary" | "ghost"> = "secondary") {
  return cn(
    buttonVariants({ variant: legacyButtonVariant[variant] }),
    "h-auto w-full min-w-0 max-w-full whitespace-normal py-2 text-center sm:w-fit md:h-auto md:min-h-10",
  )
}

export function getResponsiveActionRowClasses() {
  return "flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
}

export function getMobileSafeBottomPaddingClasses() {
  return "pb-[calc(6rem+max(0.75rem,env(safe-area-inset-bottom)))] sm:pb-0"
}
