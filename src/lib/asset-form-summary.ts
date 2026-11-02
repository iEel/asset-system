// The one-line summary and the count of each folded section of the asset form (group 4 plan 2 Task 6a, spec §8,
// P2-R11). Pure and client-safe, with relative imports only: the section words each part through asset.sectionSummary,
// and shows "กรอกแล้ว {filled} จาก {total} ช่อง" when the section has fields to count (total > 0).
import type { AssetFormSection, AssetFormValues, CustomFieldDefinition, PurchaseDocumentType } from "./asset-form-rules.ts"
import { countPurchaseDocumentBadge } from "./purchase-document-picker-rules.ts"

export type AssetFormFoldedSection = Exclude<AssetFormSection, "main" | "license">

export type AssetFormSummaryPart =
  | { key: "purchaseDate" | "warrantyEnd"; date: string }
  | { key: "purchasePrice"; amount: number }
  | { key: "installParent"; label: string }
  | { key: "documentRefs"; refs: PurchaseDocumentRef[] }
  | { key: "documentsQueued" | "photosExisting" | "photosQueued" | "customRequiredMissing" | "customExtraRows"; count: number }
  | { key: "remarkSet" }

// A chosen purchase document as the summary names it ("ใบ PO PO-2569-0031").
export type PurchaseDocumentRef = { id: string; documentType: PurchaseDocumentType; documentNo: string }

export type AssetFormSummaryInput = {
  values: AssetFormValues
  install: { parentAssetId: string; componentRole: string; slotNo: string; reason: string }
  // The chosen parent's picker label ("code - name"), when one is chosen.
  installParentLabel?: string | null
  // The documents chosen in the picker (on edit the stored ones first; removedIds are marked for removal at the save,
  // group 4 plan 3 Task 5, P3-R5) and the new ones waiting for the save.
  documents: { mode: "create" | "edit"; chosen: readonly PurchaseDocumentRef[]; removedIds?: ReadonlySet<string>; queued: number }
  // The category's photo list, how many of its items are kept or queued, and the photo counts.
  photos: { checklistTotal: number; checklistCovered: number; existing: number; queued: number }
  customFields: { definitions: readonly CustomFieldDefinition[]; valueOf: (fieldName: string) => string; extraRows: number }
}

// badge: a count of its own in place of "กรอกแล้ว n จาก m ช่อง" (เอกสารจัดซื้อ: "เลือกแล้ว n ใบ", "ผูกไว้ n ใบ").
export type AssetFormSectionBadge = { key: "documentsSelected" | "documentsLinked"; count: number }
export type AssetFormSectionSummary = { filled: number; total: number; parts: AssetFormSummaryPart[]; badge?: AssetFormSectionBadge }

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
    // The refs of what stays linked after the save; the badge counts the chosen ones, create "เลือกแล้ว n ใบ" and edit
    // "ผูกไว้ n ใบ" (stored minus removed plus newly chosen). The drafts are their own part, "รอบันทึก n ใบ", so the
    // badge's rule is given none (P3-R1).
    const { mode, chosen, removedIds, queued } = input.documents
    const refs = chosen.filter((document) => !removedIds?.has(document.id))
    if (refs.length > 0) parts.push({ key: "documentRefs", refs })
    if (queued > 0) parts.push({ key: "documentsQueued", count: queued })
    const badge = countPurchaseDocumentBadge({ mode, chosen, removedIds, drafts: 0 })
    return badge ? { filled: 0, total: 0, parts, badge } : { filled: 0, total: 0, parts }
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
