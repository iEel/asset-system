export type CategoryCustomFieldDraft = {
  id?: string
  fieldName: string
  fieldLabel: string
  fieldLabelTh?: string | null
  fieldType: "text" | "number" | "date" | "select" | "boolean"
  options?: string | null
  isRequired: boolean
  sortOrder: number
  isActive: boolean
}

export function moveArrayItem<TItem>(items: TItem[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return [...items]
  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)
  return nextItems
}

export function duplicateCategoryCustomField(field: CategoryCustomFieldDraft): CategoryCustomFieldDraft {
  const { id: _id, ...fieldWithoutId } = field
  return {
    ...fieldWithoutId,
    fieldName: buildCopyFieldName(field.fieldName),
    fieldLabel: buildCopyLabel(field.fieldLabel),
    fieldLabelTh: field.fieldLabelTh ? buildCopyLabel(field.fieldLabelTh) : field.fieldLabelTh,
  }
}

function buildCopyFieldName(fieldName: string) {
  const normalized = fieldName.trim() || "field"
  return normalized.endsWith("_copy") ? `${normalized}2` : `${normalized}_copy`
}

function buildCopyLabel(label: string) {
  const normalized = label.trim() || "Field"
  return normalized.endsWith(" Copy") ? `${normalized} 2` : `${normalized} Copy`
}
