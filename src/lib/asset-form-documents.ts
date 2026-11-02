// The asset form's เอกสารจัดซื้อ at the save (group 4 plan 3 Task 5, spec §9.3, P3-R5, P3-R6), as plain data: the drafts
// the save uploads, where the pre-check's duplicates show, which chosen documents to link and which stored ones to
// unlink, the multipart body of one draft, and the failure hand-off to the edit page. Pure and client-safe, with
// relative imports only.
import { purchaseDocumentTypes, type PurchaseDocumentDraft, type PurchaseDocumentType } from "./asset-form-rules.ts"

/** The pre-check (Task 3): { documents: [{ documentType, documentNo }] } → { duplicates: [{ index, id, reason }] }. */
export const purchaseDocumentCheckPath = "/api/purchase-documents/check-duplicates"

/** A multipart body creates and links one new document; a JSON { purchaseDocumentIds } links chosen ones (Task 3). */
export function assetPurchaseDocumentsPath(assetId: string): string {
  return `/api/assets/${encodeURIComponent(assetId)}/purchase-documents`
}

/** DELETE unlinks one document from the asset; the document and its files stay (Task 3). */
export function assetPurchaseDocumentPath(assetId: string, documentId: string): string {
  return `${assetPurchaseDocumentsPath(assetId)}/${encodeURIComponent(documentId)}`
}

/** The id the active fields take in the upload list (the queued drafts have client ids). */
export const ACTIVE_PURCHASE_DOCUMENT_DRAFT = "active"

export type ActivePurchaseDocumentFields = Omit<PurchaseDocumentDraft, "id" | "file"> & { file: File | null }

/** The drafts the save uploads: the queued ones, then the active fields when they hold a file and a number. */
export function listPurchaseDocumentUploads(queued: PurchaseDocumentDraft[], active: ActivePurchaseDocumentFields): PurchaseDocumentDraft[] {
  const documentNo = active.documentNo.trim()
  if (!active.file || !documentNo) return queued
  return [...queued, { ...active, id: ACTIVE_PURCHASE_DOCUMENT_DRAFT, documentNo, file: active.file }]
}

export type PurchaseDocumentDuplicateAnswer = { index: number; id: string | null; reason: "exists" | "repeated" }
export type PurchaseDocumentDraftErrorCode = "purchaseDocumentExists" | "purchaseDocumentRepeated"

/**
 * Where each duplicate shows (Review Focus 1): the active draft's under #asset-purchase-document-no, a queued draft's on
 * its row. "exists" is a stored document, active or not (P3-R3); "repeated" an earlier draft of the same save.
 */
export function mapPurchaseDocumentDuplicates(
  uploads: readonly Pick<PurchaseDocumentDraft, "id">[],
  duplicates: readonly PurchaseDocumentDuplicateAnswer[],
): { active: PurchaseDocumentDraftErrorCode | null; rows: Record<string, PurchaseDocumentDraftErrorCode> } {
  let active: PurchaseDocumentDraftErrorCode | null = null
  const rows: Record<string, PurchaseDocumentDraftErrorCode> = {}
  for (const duplicate of duplicates) {
    const upload = uploads[duplicate.index]
    if (!upload) continue
    const code: PurchaseDocumentDraftErrorCode = duplicate.reason === "exists" ? "purchaseDocumentExists" : "purchaseDocumentRepeated"
    if (upload.id === ACTIVE_PURCHASE_DOCUMENT_DRAFT) active = code
    else rows[upload.id] = code
  }
  return { active, rows }
}

/**
 * The links after the save (P3-R5): every chosen document not stored and not marked for removal is linked in one
 * request; on edit each stored document marked for removal is unlinked. Nothing changed, nothing is sent.
 */
export function planPurchaseDocumentLinks(input: {
  originalIds: readonly string[]
  chosen: readonly { id: string }[]
  removedIds: ReadonlySet<string>
}): { linkIds: string[]; unlinkIds: string[] } {
  const stored = new Set(input.originalIds)
  return {
    linkIds: input.chosen.map((document) => document.id).filter((id) => !stored.has(id) && !input.removedIds.has(id)),
    unlinkIds: input.originalIds.filter((id) => input.removedIds.has(id)),
  }
}

/**
 * One draft's multipart body (parseMultipartPurchaseDocument): the PO or invoice number copies the document number as
 * before; a draft that follows the asset's supplier (null) sends no supplierId part, so the server takes the asset's
 * while it is active; "ไม่ระบุผู้ขาย" ("") sends the part empty, so the server stores none.
 */
export function buildPurchaseDocumentUploadForm(draft: PurchaseDocumentDraft): FormData {
  const formData = new FormData()
  formData.append("file", draft.file)
  formData.append("documentType", draft.documentType)
  formData.append("documentNo", draft.documentNo)
  if (draft.documentType === "purchase_order") formData.append("poNumber", draft.documentNo)
  if (draft.documentType === "invoice") formData.append("invoiceNumber", draft.documentNo)
  if (draft.documentDate) formData.append("documentDate", draft.documentDate)
  if (draft.totalAmount) formData.append("totalAmount", draft.totalAmount)
  if (draft.supplierId !== null) formData.append("supplierId", draft.supplierId)
  formData.append("currency", "THB")
  return formData
}

/**
 * The batch POST's body (group 4 plan 3 Task 6, P3-R8): the JSON batch as before when there is no new document, so the
 * batch without one sends what bulk-move.spec waits for; with the one draft, multipart: `payload` (the same JSON),
 * `newDocument` (its fields, the PO or invoice number copied as the asset's upload does) and `file`. A draft that
 * follows the batch's supplier (null) sends no supplierId key, so the server takes the batch's while it is active;
 * "ไม่ระบุผู้ขาย" ("") sends it empty, so the server stores none.
 */
export function buildAssetBatchRequestBody(
  payload: unknown,
  draft: PurchaseDocumentDraft | null,
): { body: string | FormData; headers?: Record<string, string> } {
  if (!draft) return { body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } }
  const formData = new FormData()
  formData.append("payload", JSON.stringify(payload))
  formData.append(
    "newDocument",
    JSON.stringify({
      documentType: draft.documentType,
      documentNo: draft.documentNo,
      poNumber: draft.documentType === "purchase_order" ? draft.documentNo : "",
      invoiceNumber: draft.documentType === "invoice" ? draft.documentNo : "",
      documentDate: draft.documentDate,
      totalAmount: draft.totalAmount,
      ...(draft.supplierId === null ? {} : { supplierId: draft.supplierId }),
      currency: "THB",
    }),
  )
  formData.append("file", draft.file)
  return { body: formData }
}

/**
 * The upload's supplier select (final review): "ตามทรัพย์สิน" first, the default, is a draft that follows the asset's
 * (or the batch's) supplier (null); "ไม่ระบุผู้ขาย" ("") stores none; then the suppliers. The select holds strings, so
 * following the asset has its own value.
 */
export const FOLLOW_ASSET_SUPPLIER = "follow-asset"

export function purchaseDocumentSupplierSelectValue(supplierId: string | null): string {
  return supplierId ?? FOLLOW_ASSET_SUPPLIER
}

export function purchaseDocumentSupplierFromSelect(value: string): string | null {
  return value === FOLLOW_ASSET_SUPPLIER ? null : value
}

/** The supplier a draft will be stored with: its own, none for "", or the asset's (or the batch's) for null. */
export function effectivePurchaseDocumentSupplierId(draftSupplierId: string | null, assetSupplierId: string | null): string | null {
  return draftSupplierId === null ? assetSupplierId || null : draftSupplierId || null
}

/** What the edit page names after a failed upload (P3-R6): never the file itself. */
export type FailedPurchaseDocument = { documentType: PurchaseDocumentType; documentNo: string; fileName: string | null }

/**
 * The failure landing (P3-R6): the edit page with เอกสารจัดซื้อ open. `attempt` differs on every landing, so a second
 * failure on the landing page itself is a new URL: the edit page keys the form on it, the form mounts fresh and reads the
 * new list (final review). The returnTo the page was opened with goes along, so the fix-up save returns there.
 */
export function purchaseDocumentFailureHref(input: { locale: string; assetId: string; attempt: string; returnTo?: string }): string {
  const returnTo = input.returnTo ? `&returnTo=${encodeURIComponent(input.returnTo)}` : ""
  return `/${input.locale}/assets/${encodeURIComponent(input.assetId)}/edit?documents=failed&attempt=${encodeURIComponent(input.attempt)}${returnTo}#documents`
}

/** The sessionStorage key the save writes and the edit page reads once, per asset. */
export function failedPurchaseDocumentsKey(assetId: string): string {
  return `asset-form:documents-failed:${assetId}`
}

/** The stored list, or [] for nothing, text that does not parse, or entries of another shape. */
export function parseFailedPurchaseDocuments(raw: string | null): FailedPurchaseDocument[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((item): FailedPurchaseDocument[] => {
    if (!item || typeof item !== "object") return []
    const { documentType, documentNo, fileName } = item as Record<string, unknown>
    if (typeof documentNo !== "string" || !(purchaseDocumentTypes as readonly unknown[]).includes(documentType)) return []
    return [{ documentType: documentType as PurchaseDocumentType, documentNo, fileName: typeof fileName === "string" ? fileName : null }]
  })
}
