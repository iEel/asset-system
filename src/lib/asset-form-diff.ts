// What the edit page changed (group 4 plan 2 Task 8, spec §7.1, §7.3, §4 anti-goal "a summary of changes that misses a
// field the save writes"). The diff covers every field the PUT writes: the room, the holder and แผนก, the 14 fields of
// register_field_correction, the tag, the status, the condition and the License fields, which write history rows, and the
// home room, the supplier, the fixed-asset code, the remark and the custom fields, which the save writes without one.
// Values compare in their normal form (empty text and null alike, a price or a seat count as its number, a date as
// YYYY-MM-DD), so a field changed back leaves the list. Pure and client-safe, with relative imports only.
import { fieldId, sectionOfField, type AssetField, type AssetFormSection, type AssetFormValues, type CustomFieldDefinition } from "./asset-form-rules.ts"
import { normalizeRegisterFieldValue, registerEditNeedsReason } from "./asset-register-edit.ts"

// The form's value fields in visual order; the custom fields follow the purchase section, then the remark.
const VALUE_FIELDS = [
  "assetTag",
  "name",
  "categoryId",
  "brandId",
  "modelId",
  "serialNumber",
  "ownershipType",
  "companyId",
  "branchId",
  "departmentId",
  "custodianId",
  "homeLocationId",
  "currentLocationId",
  "statusId",
  "conditionId",
  "licenseTotalSeats",
  "licenseUsedSeats",
  "licenseAssignedAssetId",
  "purchaseDate",
  "purchasePrice",
  "supplierId",
  "warrantyStartDate",
  "warrantyEndDate",
  "fixedAssetCode",
  "poNumber",
  "invoiceNumber",
] as const satisfies readonly (keyof AssetFormValues)[]

type AssetValueField = (typeof VALUE_FIELDS)[number]
// Brand, model, supplier, the License's asset, the remark and the custom fields' stored JSON have no FIELD_IDS row (no
// error of their own), so a change names a wider set than AssetField.
export type AssetDiffField = AssetValueField | AssetField | "remark" | "customFieldsJson"
export type AssetFormChange = { field: AssetDiffField; from: string; to: string; automatic: boolean }

const SEAT_FIELDS = new Set<string>(["licenseTotalSeats", "licenseUsedSeats"])

function normal(field: string, value: unknown): string {
  if (SEAT_FIELDS.has(field)) {
    const text = value === null || value === undefined ? "" : String(value).trim()
    const number = Number(text)
    return text && Number.isFinite(number) ? String(number) : text
  }
  return normalizeRegisterFieldValue(field, value) ?? ""
}

// The custom fields as key → trimmed value, or null when the JSON does not parse into an object.
function customFieldValues(json: string | null | undefined): Map<string, string> | null {
  if (!json?.trim()) return new Map()
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null
    return new Map(Object.entries(parsed).map(([key, value]) => [key, (typeof value === "string" ? value : JSON.stringify(value)).trim()]))
  } catch {
    return null
  }
}

// A stored JSON the rows cannot read stays as it is until the person edits the rows (the raw JSON editor left the form,
// 2026-11-02); then the save writes the rows' JSON over it, and the list shows that one row, old text to new.
function customFieldChanges(original: AssetFormValues, values: AssetFormValues): AssetFormChange[] {
  const before = customFieldValues(original.customFieldsJson)
  const after = customFieldValues(values.customFieldsJson)
  if (!before || !after) {
    const from = original.customFieldsJson?.trim() ?? ""
    const to = values.customFieldsJson?.trim() ?? ""
    return from === to ? [] : [{ field: "customFieldsJson", from, to, automatic: false }]
  }
  const keys = [...new Set([...before.keys(), ...after.keys()])]
  return keys
    .filter((key) => (before.get(key) ?? "") !== (after.get(key) ?? ""))
    .map((key) => ({ field: `customFields.${key}` as const, from: before.get(key) ?? "", to: after.get(key) ?? "", automatic: false }))
}

/** Every field the save writes that differs from the stored asset, in the form's order. The department the save sets to
 * the holder's (the holder unchanged) is marked automatic. isActive is never compared: the edit does not send it (P2-R7). */
export function diffAssetFormValues(original: AssetFormValues, values: AssetFormValues, context: { departmentAutomatic: boolean }): AssetFormChange[] {
  const changes: AssetFormChange[] = []
  for (const field of VALUE_FIELDS) {
    const from = normal(field, original[field])
    const to = normal(field, values[field])
    if (from !== to) changes.push({ field, from, to, automatic: field === "departmentId" && context.departmentAutomatic })
  }
  changes.push(...customFieldChanges(original, values))
  const fromRemark = normal("remark", original.remark)
  const toRemark = normal("remark", values.remark)
  if (fromRemark !== toRemark) changes.push({ field: "remark", from: fromRemark, to: toRemark, automatic: false })
  return changes
}

/** The automatic fix (P2-R1: the holder unchanged on บุคคล or Stock, แผนก set to the holder's; departmentLocked is the
 * form's lock, off under an open handover) and whether the save needs the reason (registerEditNeedsReason, as PUT). */
export function getAssetEditCorrection(input: { original: AssetFormValues; values: AssetFormValues; departmentLocked: boolean }): { departmentAutomatic: boolean; reasonNeeded: boolean } {
  const changed = (field: "currentLocationId" | "custodianId" | "departmentId") => normal(field, input.original[field]) !== normal(field, input.values[field])
  const custodianChanged = changed("custodianId")
  const departmentChanged = changed("departmentId")
  const departmentAutomatic = input.departmentLocked && !custodianChanged && departmentChanged
  return {
    departmentAutomatic,
    reasonNeeded: registerEditNeedsReason({ locationChanged: changed("currentLocationId"), custodianChanged, departmentChanged, departmentAutomatic }),
  }
}

const CHANGE_SECTIONS: Partial<Record<AssetDiffField, AssetFormSection>> = {
  brandId: "main",
  modelId: "main",
  licenseAssignedAssetId: "license",
  supplierId: "purchase",
  remark: "other",
  customFieldsJson: "customFields",
}

// The ids ไปที่ช่อง focuses for the fields with no FIELD_IDS row.
const CHANGE_FIELD_IDS: Partial<Record<AssetDiffField, string>> = {
  brandId: "asset-brand",
  modelId: "asset-model",
  licenseAssignedAssetId: "asset-license-assigned-asset",
  supplierId: "asset-supplier",
  remark: "asset-remark",
}

/** The section that holds a changed field: a section with a change has the changed frame and opens. */
export function sectionOfChange(field: AssetDiffField): AssetFormSection {
  return CHANGE_SECTIONS[field] ?? sectionOfField(field as AssetField)
}

/** The id ไปที่ช่อง focuses; an extra custom-field row and the stored JSON have none (the section opens). */
export function changeFieldId(field: AssetDiffField, definitions: CustomFieldDefinition[]): string {
  return CHANGE_FIELD_IDS[field] ?? fieldId(field as AssetField, definitions)
}
