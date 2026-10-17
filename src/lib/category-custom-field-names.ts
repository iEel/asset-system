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
