import { fieldControlVariants, type FieldSize } from "../components/ui/field-variants.ts"

export type UiTone = "neutral" | "info" | "success" | "warning" | "danger" | "muted"

const successAssetStateValues = new Set(["ready", "in use", "new", "excellent", "good", "active"])
const warningAssetStateValues = new Set(["checked out", "under maintenance", "pending repair", "under inspection", "pending disposal", "fair"])
const dangerAssetStateValues = new Set(["lost", "missing", "damaged", "non functional", "poor"])
// Salvage describes a terminal inventory state, so it shares neutral inactive treatment.
const neutralAssetStateValues = new Set(["draft", "disposed", "retired", "salvage"])

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

export function getMobileCardListClasses() {
  return "grid gap-3 md:hidden"
}

export function getDesktopTableOnlyClasses() {
  return "hidden md:block"
}

// The field recipe as a class string, for elements that cannot use a primitive (a <button> trigger, a <select>
// that keeps its own markup). Change the height with fieldSize, not a className. <select> callers get no chevron here.
export function getFieldControlClasses(options?: { fieldSize?: FieldSize }) {
  return fieldControlVariants(options)
}
