// The category form's saved-vs-current comparison (board MD-Category-Edit, group 8 plan 2 Task 3): the side panel
// ผลของการแก้ไข (G8P2-R3: fields, required fields, photo items, status, ตอนนี้ / หลังบันทึก), the sticky footer's change
// summary and the status rule of section 4. Pure: the form passes the saved category and its live values.

type CustomFieldSnapshot = {
  id?: string
  fieldName: string
  fieldLabel: string
  fieldLabelTh?: string | null
  fieldType: string
  options?: string | null
  isRequired: boolean
}

export type CategoryFormSnapshot = {
  code: string
  name: string
  description?: string | null
  isActive: boolean
  customFieldDefs: readonly CustomFieldSnapshot[]
  photoChecklist: readonly string[]
}

export type CategoryFormTotals = { fields: number; required: number; photos: number; isActive: boolean }

export type CategoryFormChanges = {
  fieldsAdded: number
  fieldsEdited: number
  fieldsRemoved: number
  fieldsReordered: boolean
  // The added rows' names as the asset forms show them (the Thai label, else the label, else the field name).
  addedFieldNames: string[]
  addedRequired: number
  photosAdded: number
  photosRemoved: number
  photosReordered: boolean
  infoChanged: boolean
  descriptionChanged: boolean
  status: "activated" | "deactivated" | null
}

export type CategoryChangePart =
  | { key: "fieldsAdded" | "fieldsEdited" | "fieldsRemoved" | "photosAdded" | "photosRemoved"; count: number }
  | { key: "fieldsReordered" | "photosReordered" | "info" | "description" | "activated" | "deactivated" }

// As serializePhotoChecklist saves it (category-photo-checklist.ts): trimmed, blanks dropped, first of each kept.
export function normalizePhotoChecklist(items: readonly string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

export function categoryFormTotals(snapshot: CategoryFormSnapshot): CategoryFormTotals {
  return {
    fields: snapshot.customFieldDefs.length,
    required: snapshot.customFieldDefs.filter((field) => field.isRequired).length,
    photos: normalizePhotoChecklist(snapshot.photoChecklist).length,
    isActive: snapshot.isActive,
  }
}

// The options as the categories API stores them (lines or commas, trimmed, empties dropped).
function storedOptions(options?: string | null): string {
  return (options ?? "")
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n")
}

function fieldEdited(saved: CustomFieldSnapshot, current: CustomFieldSnapshot): boolean {
  return (
    saved.fieldName.trim() !== current.fieldName.trim() ||
    saved.fieldLabel.trim() !== current.fieldLabel.trim() ||
    (saved.fieldLabelTh ?? "").trim() !== (current.fieldLabelTh ?? "").trim() ||
    saved.fieldType !== current.fieldType ||
    storedOptions(saved.options) !== storedOptions(current.options) ||
    saved.isRequired !== current.isRequired
  )
}

function displayName(field: CustomFieldSnapshot): string {
  return field.fieldLabelTh?.trim() || field.fieldLabel.trim() || field.fieldName.trim()
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

export function diffCategoryForm(saved: CategoryFormSnapshot, current: CategoryFormSnapshot): CategoryFormChanges {
  // Fields compare by the saved row's id (G8P2-R2): an added or duplicated row has none.
  const savedById = new Map(saved.customFieldDefs.flatMap((field) => (field.id ? [[field.id, field] as const] : [])))
  const added = current.customFieldDefs.filter((field) => !field.id || !savedById.has(field.id))
  const kept = current.customFieldDefs.filter((field) => field.id && savedById.has(field.id))
  const keptIds = new Set(kept.map((field) => field.id as string))
  const savedKeptOrder = saved.customFieldDefs.flatMap((field) => (field.id && keptIds.has(field.id) ? [field.id] : []))

  const savedPhotos = normalizePhotoChecklist(saved.photoChecklist)
  const currentPhotos = normalizePhotoChecklist(current.photoChecklist)
  const savedPhotoSet = new Set(savedPhotos)
  const currentPhotoSet = new Set(currentPhotos)

  return {
    fieldsAdded: added.length,
    fieldsEdited: kept.filter((field) => fieldEdited(savedById.get(field.id as string) as CustomFieldSnapshot, field)).length,
    fieldsRemoved: savedById.size - keptIds.size,
    fieldsReordered: !sameOrder(savedKeptOrder, kept.map((field) => field.id as string)),
    addedFieldNames: added.map(displayName).filter(Boolean),
    addedRequired: added.filter((field) => field.isRequired).length,
    photosAdded: currentPhotos.filter((item) => !savedPhotoSet.has(item)).length,
    photosRemoved: savedPhotos.filter((item) => !currentPhotoSet.has(item)).length,
    photosReordered: !sameOrder(
      savedPhotos.filter((item) => currentPhotoSet.has(item)),
      currentPhotos.filter((item) => savedPhotoSet.has(item))
    ),
    infoChanged: saved.code.trim() !== current.code.trim() || saved.name.trim() !== current.name.trim(),
    descriptionChanged: (saved.description ?? "").trim() !== (current.description ?? "").trim(),
    status: saved.isActive === current.isActive ? null : current.isActive ? "activated" : "deactivated",
  }
}

// The footer's parts in reading order: fields, photo items, the category's own data, the status.
export function categoryChangeParts(changes: CategoryFormChanges): CategoryChangePart[] {
  const parts: CategoryChangePart[] = []
  for (const key of ["fieldsAdded", "fieldsEdited", "fieldsRemoved"] as const) if (changes[key] > 0) parts.push({ key, count: changes[key] })
  if (changes.fieldsReordered) parts.push({ key: "fieldsReordered" })
  for (const key of ["photosAdded", "photosRemoved"] as const) if (changes[key] > 0) parts.push({ key, count: changes[key] })
  if (changes.photosReordered) parts.push({ key: "photosReordered" })
  if (changes.infoChanged) parts.push({ key: "info" })
  if (changes.descriptionChanged) parts.push({ key: "description" })
  if (changes.status) parts.push({ key: changes.status })
  return parts
}

// Section 4: ใช้งาน is disabled only while a category saved active, with any model or asset (the PUT guard counts all of
// them, getCategoryDeleteBlockReason), stays ticked; an inactive category can always be ticked back on (spec §6).
export function categoryStatusLocked({
  savedIsActive,
  isActive,
  blockReason,
}: {
  savedIsActive: boolean | undefined
  isActive: boolean
  blockReason: string | null
}): boolean {
  return savedIsActive === true && isActive && Boolean(blockReason)
}

// The create form's leave-without-saving guard (final review fix 7): anything filled in, a row added (even an empty
// one) or ใช้งาน unticked counts. The edit form counts the footer's change summary instead.
export function categoryCreateHasValues(values: CategoryFormSnapshot): boolean {
  return (
    Boolean(values.code.trim() || values.name.trim() || values.description?.trim()) ||
    values.customFieldDefs.length > 0 ||
    values.photoChecklist.length > 0 ||
    !values.isActive
  )
}
