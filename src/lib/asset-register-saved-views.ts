import { buildAssetQueryString, parseAssetListParams, type AssetListFilters } from "./asset-list-query.ts"

// Saved views on the register (group 4 spec §6.4, call 4): a name plus the list query, kept in the browser
// (localStorage) per user and locale, at most 12. Pure and client-safe; the component does the storage access.
export type AssetRegisterSavedView = { id: string; name: string; query: string }

export type AssetRegisterSavedViewNameError = "nameRequired" | "nameTaken"
export type AssetRegisterSavedViewError = AssetRegisterSavedViewNameError | "full"

export const assetRegisterSavedViewsMax = 12
export const assetRegisterSavedViewNameMax = 40

export function assetRegisterSavedViewsKey(locale: string, userId: string): string {
  return `asset-register-saved-views:v1:${userId}:${locale}`
}

/** The page's view query: every parameter the list accepts (link-only ones included), never the page number. */
export function assetRegisterSavedViewQuery(filters: AssetListFilters): string {
  const params = new URLSearchParams(buildAssetQueryString(filters))
  params.delete("page")
  return params.toString()
}

/** A stored query through the same normalisation, so unknown keys drop and it compares with the page's as a string. */
export function normalizeSavedViewQuery(query: string): string {
  return assetRegisterSavedViewQuery(parseAssetListParams(new URLSearchParams(query)))
}

function nameKey(name: string) {
  return name.trim().toLocaleLowerCase()
}

function validName(name: unknown): string | null {
  if (typeof name !== "string") return null
  const trimmed = name.trim()
  return trimmed.length >= 1 && trimmed.length <= assetRegisterSavedViewNameMax ? trimmed : null
}

/** Reads the stored value; anything that is not a list of valid views reads as fewer views, never as an error. */
export function readSavedViews(raw: string | null): AssetRegisterSavedView[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const views: AssetRegisterSavedView[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const entry of parsed) {
    if (views.length >= assetRegisterSavedViewsMax) break
    if (!entry || typeof entry !== "object") continue
    const { id, name, query } = entry as Record<string, unknown>
    const trimmedName = validName(name)
    if (typeof id !== "string" || !id || !trimmedName || typeof query !== "string") continue
    if (ids.has(id) || names.has(nameKey(trimmedName))) continue
    ids.add(id)
    names.add(nameKey(trimmedName))
    views.push({ id, name: trimmedName, query: normalizeSavedViewQuery(query) })
  }
  return views
}

function nameError(views: AssetRegisterSavedView[], name: string, exceptId?: string): AssetRegisterSavedViewNameError | null {
  if (!name) return "nameRequired"
  const key = nameKey(name)
  return views.some((view) => view.id !== exceptId && nameKey(view.name) === key) ? "nameTaken" : null
}

function cleanName(name: string) {
  return name.trim().slice(0, assetRegisterSavedViewNameMax).trim()
}

export function addSavedView(
  views: AssetRegisterSavedView[],
  name: string,
  query: string,
): { views: AssetRegisterSavedView[]; error: AssetRegisterSavedViewError | null } {
  const trimmed = cleanName(name)
  // A taken or empty name is said first; a full list only once the name itself is fine.
  const error: AssetRegisterSavedViewError | null = nameError(views, trimmed) ?? (views.length >= assetRegisterSavedViewsMax ? "full" : null)
  if (error) return { views, error }
  return { views: [...views, { id: crypto.randomUUID(), name: trimmed, query: normalizeSavedViewQuery(query) }], error: null }
}

export function renameSavedView(
  views: AssetRegisterSavedView[],
  id: string,
  name: string,
): { views: AssetRegisterSavedView[]; error: AssetRegisterSavedViewNameError | null } {
  const trimmed = cleanName(name)
  const error = nameError(views, trimmed, id)
  if (error) return { views, error }
  return { views: views.map((view) => (view.id === id ? { ...view, name: trimmed } : view)), error: null }
}

export function deleteSavedView(views: AssetRegisterSavedView[], id: string): AssetRegisterSavedView[] {
  return views.filter((view) => view.id !== id)
}
