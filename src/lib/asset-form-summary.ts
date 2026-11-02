// The one-line summary and the count of each folded section of the asset form (group 4 plan 2 Task 6a, spec §8,
// P2-R11). Pure and client-safe, with relative imports only: the section words each part through asset.sectionSummary,
// and shows "กรอกแล้ว {filled} จาก {total} ช่อง" when the section has fields to count (total > 0).
import type { AssetFormSection, AssetFormValues, CustomFieldDefinition } from "./asset-form-rules.ts"

export type AssetFormFoldedSection = Exclude<AssetFormSection, "main" | "license">

export type AssetFormSummaryPart =
  | { key: "purchaseDate" | "warrantyEnd"; date: string }
  | { key: "purchasePrice"; amount: number }
  | { key: "installParent"; label: string }
  | { key: "documentsSelected" | "documentsQueued" | "photosExisting" | "photosQueued" | "customRequiredMissing" | "customExtraRows"; count: number }
  | { key: "remarkSet" }

export type AssetFormSummaryInput = {
  values: AssetFormValues
  install: { parentAssetId: string; componentRole: string; slotNo: string; reason: string }
  // The chosen parent's picker label ("code - name"), when one is chosen.
  installParentLabel?: string | null
  // Documents already in the system that are ticked, and new ones waiting for the save.
  documents: { selected: number; queued: number }
  // The category's photo list, how many of its items are kept or queued, and the photo counts.
  photos: { checklistTotal: number; checklistCovered: number; existing: number; queued: number }
  customFields: { definitions: readonly CustomFieldDefinition[]; valueOf: (fieldName: string) => string; extraRows: number }
}

export type AssetFormSectionSummary = { filled: number; total: number; parts: AssetFormSummaryPart[] }

const PURCHASE_FIELDS = ["purchaseDate", "purchasePrice", "supplierId", "warrantyStartDate", "warrantyEndDate", "fixedAssetCode", "poNumber", "invoiceNumber"] as const

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== ""
}

function countFilled(values: readonly unknown[]): number {
  return values.filter(hasValue).length
}

export function summarizeAssetFormSection(section: AssetFormFoldedSection, input: AssetFormSummaryInput): AssetFormSectionSummary {
  const { values } = input
  const parts: AssetFormSummaryPart[] = []

  if (section === "install") {
    const { parentAssetId, componentRole, slotNo, reason } = input.install
    if (hasValue(parentAssetId) && hasValue(input.installParentLabel)) parts.push({ key: "installParent", label: String(input.installParentLabel) })
    return { filled: countFilled([parentAssetId, componentRole, slotNo, reason]), total: 4, parts }
  }

  if (section === "purchase") {
    if (hasValue(values.purchaseDate)) parts.push({ key: "purchaseDate", date: String(values.purchaseDate) })
    const price = hasValue(values.purchasePrice) ? Number(values.purchasePrice) : Number.NaN
    if (Number.isFinite(price)) parts.push({ key: "purchasePrice", amount: price })
    if (hasValue(values.warrantyEndDate)) parts.push({ key: "warrantyEnd", date: String(values.warrantyEndDate) })
    return { filled: countFilled(PURCHASE_FIELDS.map((field) => values[field])), total: PURCHASE_FIELDS.length, parts }
  }

  if (section === "documents") {
    if (input.documents.selected > 0) parts.push({ key: "documentsSelected", count: input.documents.selected })
    if (input.documents.queued > 0) parts.push({ key: "documentsQueued", count: input.documents.queued })
    return { filled: 0, total: 0, parts }
  }

  if (section === "photos") {
    const { checklistTotal, checklistCovered, existing, queued } = input.photos
    if (existing > 0) parts.push({ key: "photosExisting", count: existing })
    if (queued > 0) parts.push({ key: "photosQueued", count: queued })
    return { filled: Math.min(checklistCovered, checklistTotal), total: checklistTotal, parts }
  }

  if (section === "customFields") {
    const { definitions, valueOf, extraRows } = input.customFields
    const filled = definitions.filter((definition) => hasValue(valueOf(definition.fieldName))).length
    const requiredMissing = definitions.filter((definition) => definition.isRequired && !hasValue(valueOf(definition.fieldName))).length
    if (requiredMissing > 0) parts.push({ key: "customRequiredMissing", count: requiredMissing })
    if (extraRows > 0) parts.push({ key: "customExtraRows", count: extraRows })
    return { filled, total: definitions.length, parts }
  }

  // other (หมายเหตุ): the remark, its only field since the raw JSON editor left the form (2026-11-02).
  if (hasValue(values.remark)) parts.push({ key: "remarkSet" })
  return { filled: hasValue(values.remark) ? 1 : 0, total: 1, parts }
}
