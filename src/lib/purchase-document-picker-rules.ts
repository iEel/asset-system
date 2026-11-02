import type { PurchaseDocumentType } from "./asset-form-rules.ts"
import { isAssetOperationSearchReady, isAssetOperationSearchTooLong } from "./asset-operation-search-rules.ts"
import { formatCount } from "./display-format.ts"
import {
  buildPurchaseDocumentSearchHref,
  type PurchaseDocumentSearchAnswer,
  type PurchaseDocumentSearchRow,
} from "./purchase-document-search-rules.ts"

// What PurchaseDocumentPicker shows, as plain data (group 4 plan 3 Task 4, spec §9.1-§9.2). Client-safe and pure,
// relative imports only. The parameter names and the 2-100 rule stay in purchase-document-search-rules.ts and
// asset-operation-search-rules.ts; this file only reads them.

export const purchaseDocumentPickerDebounceMs = 300
/** The edit summary names this many documents, then "+n". */
export const purchaseDocumentSummaryShown = 3

/**
 * The URL to ask, or null while the recent list from the page shows (P3-R4: no request on load). Typed text of 2-100
 * characters asks the search (the supplier only orders the empty query, so it is left out); with no typed text, a
 * supplier changed since mount asks that supplier's newest list.
 */
export function buildPurchaseDocumentPickerUrl(input: { query: string; supplierId: string | null; initialSupplierId: string | null }): string | null {
  const q = input.query.trim()
  if (isAssetOperationSearchReady(q)) return isAssetOperationSearchTooLong(q) ? null : buildPurchaseDocumentSearchHref({ q })
  if (input.supplierId !== input.initialSupplierId) return buildPurchaseDocumentSearchHref({ supplierId: input.supplierId })
  return null
}

/** An answer keyed by the URL it answers; answer null = the request failed. */
export type PurchaseDocumentPickerResult = { key: string; answer: PurchaseDocumentSearchAnswer | null }
export type PurchaseDocumentPickerView =
  | { state: "loading" }
  | { state: "error" }
  /** searched: the rows answer typed text, so an empty list reads "no match" rather than "no documents yet". */
  | { state: "rows"; answer: PurchaseDocumentSearchAnswer; searched: boolean }

/** No request: the recent props. Else an answer counts only for the very URL being asked. */
export function getPurchaseDocumentPickerView(input: {
  requestKey: string | null
  result: PurchaseDocumentPickerResult | null
  recent: PurchaseDocumentSearchAnswer
}): PurchaseDocumentPickerView {
  const { requestKey, result, recent } = input
  if (requestKey === null) return { state: "rows", answer: recent, searched: false }
  if (!result || result.key !== requestKey) return { state: "loading" }
  if (result.answer === null) return { state: "error" }
  return { state: "rows", answer: result.answer, searched: new URL(requestKey, "http://local").searchParams.has("q") }
}

/** Chosen and not marked for removal (P3-R5): a document marked for removal can be chosen again. */
export function isPurchaseDocumentChosen(id: string, chosen: readonly Pick<PurchaseDocumentSearchRow, "id">[], removedIds?: ReadonlySet<string>): boolean {
  return chosen.some((document) => document.id === id) && !removedIds?.has(id)
}

/** "ผูกกับ n เครื่อง: <ชื่อ 3 รายการแรก>" (P3-R1); names null when none is named. */
export function getPurchaseDocumentLinkedLine(row: Pick<PurchaseDocumentSearchRow, "linkedAssetCount" | "linkedAssetNames">): {
  count: number
  names: string | null
} {
  return { count: row.linkedAssetCount, names: row.linkedAssetNames.length > 0 ? row.linkedAssetNames.join(", ") : null }
}

/** The route's Decimal string ("15000.5") as a number for formatMoney; null when there is none. */
export function parsePurchaseDocumentAmount(totalAmount: string | null): number | null {
  if (totalAmount === null || totalAmount.trim() === "") return null
  const amount = Number(totalAmount)
  return Number.isFinite(amount) ? amount : null
}

export type PurchaseDocumentResultView = {
  typeKey: PurchaseDocumentType
  documentNo: string
  /** The supplier's name, never "code - name" (spec §5). */
  supplierName: string | null
  documentDate: string | null
  amount: number | null
  linked: { count: number; names: string | null }
  chosen: boolean
  /** A chosen document is not offered twice. */
  selectable: boolean
}

export function getPurchaseDocumentResultView(
  row: PurchaseDocumentSearchRow,
  chosen: readonly Pick<PurchaseDocumentSearchRow, "id">[],
  removedIds?: ReadonlySet<string>,
): PurchaseDocumentResultView {
  const isChosen = isPurchaseDocumentChosen(row.id, chosen, removedIds)
  return {
    typeKey: row.documentType,
    documentNo: row.documentNo,
    supplierName: row.supplier?.name ?? null,
    documentDate: row.documentDate,
    amount: parsePurchaseDocumentAmount(row.totalAmount),
    linked: getPurchaseDocumentLinkedLine(row),
    chosen: isChosen,
    selectable: !isChosen,
  }
}

export type PurchaseDocumentChipView = {
  typeKey: PurchaseDocumentType
  documentNo: string
  supplierName: string | null
  linkedCount: number
  /** "ปิดใช้งาน": a linked document no longer active still shows and can be removed (P3-R7). */
  inactive: boolean
  /** Marked for removal at บันทึกการแก้ไข (P3-R5). */
  removed: boolean
}

/** "{type} · {number} · {supplier} · ผูกกับ {count} เครื่อง". */
export function getPurchaseDocumentChipView(row: PurchaseDocumentSearchRow, removedIds?: ReadonlySet<string>): PurchaseDocumentChipView {
  return {
    typeKey: row.documentType,
    documentNo: row.documentNo,
    supplierName: row.supplier?.name ?? null,
    linkedCount: row.linkedAssetCount,
    inactive: !row.isActive,
    removed: removedIds?.has(row.id) ?? false,
  }
}

/** The folded edit section's summary: "ใบ PO PO-2569-0031 · ใบกำกับ INV-6901-0107", the first 3, then "+n". */
export function buildPurchaseDocumentRefsSummary(
  documents: readonly Pick<PurchaseDocumentSearchRow, "documentType" | "documentNo">[],
  typeLabel: (type: PurchaseDocumentType) => string,
  shown: number = purchaseDocumentSummaryShown,
): string {
  const refs = documents.slice(0, shown).map((document) => `${typeLabel(document.documentType)} ${document.documentNo}`).join(" · ")
  const more = documents.length - shown
  return more > 0 ? `${refs} +${formatCount(more)}` : refs
}

/**
 * Where focus goes after a chip's × (final review). A stored document on edit stays as a chip marked for removal, so
 * focus stays on its button (now "เก็บไว้"); any other chip goes away, so focus moves to the next chip, else the search.
 */
export function focusAfterChipRemoval(input: {
  chipIds: readonly string[]
  removedId: string
  /** The edit page's stored links: their × marks them and the chip stays. Create and the batch have none. */
  storedIds?: ReadonlySet<string>
}): { to: "stay" } | { to: "chip"; id: string } | { to: "search" } {
  if (input.storedIds?.has(input.removedId)) return { to: "stay" }
  const index = input.chipIds.indexOf(input.removedId)
  const next = index >= 0 ? input.chipIds[index + 1] : undefined
  return next ? { to: "chip", id: next } : { to: "search" }
}

/**
 * The section badge: on create "เลือกแล้ว n ใบ" counts the chosen documents and the drafts (both are linked at the
 * save); on edit "ผูกไว้ n ใบ" counts the chosen documents not marked for removal, inactive ones too (P3-R7). null at 0.
 */
export function countPurchaseDocumentBadge(input: {
  mode: "create" | "edit"
  chosen: readonly Pick<PurchaseDocumentSearchRow, "id">[]
  removedIds?: ReadonlySet<string>
  drafts: number
}): { key: "documentsSelected" | "documentsLinked"; count: number } | null {
  if (input.mode === "create") {
    const count = input.chosen.length + input.drafts
    return count > 0 ? { key: "documentsSelected", count } : null
  }
  const count = input.chosen.filter((document) => !input.removedIds?.has(document.id)).length
  return count > 0 ? { key: "documentsLinked", count } : null
}
