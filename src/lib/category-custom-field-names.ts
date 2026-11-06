import type { FieldErrors } from "./field-errors.ts"

// A category's custom fields have a unique index on (categoryId, fieldName) (prisma/schema.prisma), and a save writes
// every row of the template again, so two rows with one name are refused before the write, under each row that holds
// the name (V track spec §6.2). Names compare trimmed and case-folded, as SQL Server's default collations compare them.
export function duplicateCustomFieldNameErrors(customFieldDefs: readonly { fieldName: string }[]): FieldErrors | null {
  const rowsByName = new Map<string, number[]>()
  customFieldDefs.forEach((field, index) => {
    const name = field.fieldName.trim().toLowerCase()
    if (name) rowsByName.set(name, [...(rowsByName.get(name) ?? []), index])
  })
  const fieldErrors: FieldErrors = {}
  for (const rows of rowsByName.values()) {
    if (rows.length > 1) for (const index of rows) fieldErrors[`customFieldDefs.${index}.fieldName`] = "duplicate"
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null
}

// The option chips of a รายการเลือก row (board MD-Category-Edit): the text split as the categories API stores it
// (normalizeFieldOptions: lines or commas, trimmed, empties dropped).
export function splitCustomFieldOptions(options?: string | null): string[] {
  if (!options?.trim()) return []
  return options
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)
}

// G8P2-R2: "ใหม่" marks a row that is not in the saved definition by its saved identity (the custom field row's id the
// edit page loaded), not by its name. An added or a duplicated row carries no id (duplicateCategoryCustomField).
export function isNewCustomField(field: { id?: string }, savedIds: ReadonlySet<string>): boolean {
  return !field.id || !savedIds.has(field.id)
}

// G8P2-R1: the values an asset holds stay under the saved field name (customFieldsJson is keyed by fieldName), so a
// renamed field with values loses them on the asset forms. Null unless the row is saved, its name changed and the saved
// name holds values in the category's active assets.
export function customFieldRenameWarning(
  field: { id?: string; fieldName: string },
  savedNameById: ReadonlyMap<string, string>,
  valueCounts: Readonly<Record<string, number>>
): { savedName: string; count: number } | null {
  const savedName = field.id ? savedNameById.get(field.id) : undefined
  if (savedName === undefined || field.fieldName.trim() === savedName.trim()) return null
  const count = valueCounts[savedName] ?? 0
  return count > 0 ? { savedName, count } : null
}

// "ช่องเดิม {n} ช่องมีค่ากรอกไว้ในทรัพย์สินแล้ว" under the table.
export function countSavedFieldsWithValues(savedNames: readonly string[], valueCounts: Readonly<Record<string, number>>): number {
  return savedNames.filter((name) => (valueCounts[name] ?? 0) > 0).length
}

// Adds one asset's customFieldsJson to the per-name counts: a name counts when its value is not null and not blank (a
// false of a ใช่/ไม่ใช่ field and a 0 are values). A JSON that is not an object adds nothing.
export function addCustomFieldValueCounts(counts: Map<string, number>, json: string | null | undefined): void {
  if (!json?.trim()) return
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return
  for (const [name, value] of Object.entries(parsed)) {
    if (value === null || value === undefined) continue
    if (typeof value === "string" && !value.trim()) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
}

// The options editor of a รายการเลือก row (template-table.tsx): open while the row is in `open` (by row key), or by
// itself while the row has no option yet. Typing an option or choosing รายการเลือก puts the row in `open`, so the
// editor stays mounted once the first character makes an option (final review fix 4); เสร็จ closes it.
export function isOptionsEditorOpen(
  open: ReadonlySet<string>,
  key: string,
  field: { fieldType: string; options?: string | null }
): boolean {
  return open.has(key) || (field.fieldType === "select" && splitCustomFieldOptions(field.options).length === 0)
}

export function keepsOptionsEditorOpen(edited: string, value: string | boolean): boolean {
  return edited === "options" || (edited === "fieldType" && value === "select")
}
