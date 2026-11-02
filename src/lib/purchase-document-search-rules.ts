import type { Prisma } from "@prisma/client"

import type { PurchaseDocumentType } from "./asset-form-rules.ts"
import {
  isAssetOperationSearchReady,
  isAssetOperationSearchTooLong,
  splitAssetOperationSearchWords,
} from "./asset-operation-search-rules.ts"

// The rules of the asset form's purchase-document search (group 4 plan 3 Task 2, spec §9.2): the query, the where
// clauses, the ranking, the row and the answer. Client-safe (a type-only Prisma import, relative imports): the picker
// imports the constants, the href and the types. The 2-100 code-point rules and the word split are the transaction
// pages' (asset-operation-search-rules.ts), so both searches read text the same way.

export const purchaseDocumentSearchLimit = 20
/** The empty-query list: the newest active documents, the form's supplier first (P3-R4). */
export const purchaseDocumentRecentLimit = 10
/** A row names at most this many of its active linked assets ("ผูกกับ n เครื่อง: <ชื่อ 3 รายการแรก>", P3-R1). */
export const purchaseDocumentLinkedNamesShown = 3
export const purchaseDocumentSearchPath = "/api/purchase-documents/search"

export type PurchaseDocumentSearchInput = {
  /** "" is the newest list. */
  q: string
  /** The form's supplier: its newest documents come first when q is empty. */
  supplierId: string | null
}

const invalidSearch = { error: "Invalid search" } as const

/** q is trimmed; "" is allowed, 1 character or more than 100 (code points) is refused. */
export function parsePurchaseDocumentSearch(params: URLSearchParams): PurchaseDocumentSearchInput | { error: "Invalid search" } {
  const q = params.get("q")?.trim() ?? ""
  if (q !== "" && !isAssetOperationSearchReady(q)) return { ...invalidSearch }
  if (isAssetOperationSearchTooLong(q)) return { ...invalidSearch }
  return { q, supplierId: params.get("supplierId")?.trim() || null }
}

/** Every client search URL is built here, with the names the route's parse reads. */
export function buildPurchaseDocumentSearchHref(input: { q?: string; supplierId?: string | null }): string {
  const params = new URLSearchParams()
  if (input.q) params.append("q", input.q)
  if (input.supplierId) params.append("supplierId", input.supplierId)
  const query = params.toString()
  return query ? `${purchaseDocumentSearchPath}?${query}` : purchaseDocumentSearchPath
}

/** A linked asset counts and is named only while it is active (Review Focus 2). */
const activeLinkWhere = { asset: { isActive: true } } satisfies Prisma.PurchaseDocumentAssetWhereInput

/** One word's clause: a number, the supplier, or an active linked asset's tag, name or model. */
function wordClause(word: string): Prisma.PurchaseDocumentWhereInput {
  return {
    OR: [
      { documentNo: { contains: word } },
      { poNumber: { contains: word } },
      { invoiceNumber: { contains: word } },
      { supplier: { code: { contains: word } } },
      { supplier: { name: { contains: word } } },
      {
        assetLinks: {
          some: {
            asset: {
              isActive: true,
              OR: [{ assetTag: { contains: word } }, { name: { contains: word } }, { model: { name: { contains: word } } }],
            },
          },
        },
      },
    ],
  }
}

export function buildPurchaseDocumentSearchWheres(input: PurchaseDocumentSearchInput): {
  text: Prisma.PurchaseDocumentWhereInput
  exact: Prisma.PurchaseDocumentWhereInput
  prefix: Prisma.PurchaseDocumentWhereInput
} {
  const { q } = input
  const base = { isActive: true }
  // Every word must match a field (AND over words, OR over fields); the number tiers keep the whole text. Each word is
  // a part of q, so an exact or prefix hit is always a text hit and the text count is the match count (critic §3).
  const clauses = splitAssetOperationSearchWords(q).map(wordClause)
  const text: Prisma.PurchaseDocumentWhereInput =
    clauses.length === 0 ? base : clauses.length === 1 ? { ...base, ...clauses[0] } : { ...base, AND: clauses }
  return {
    text,
    exact: { ...base, OR: [{ documentNo: q }, { poNumber: q }, { invoiceNumber: q }] },
    prefix: { ...base, OR: [{ documentNo: { startsWith: q } }, { poNumber: { startsWith: q } }, { invoiceNumber: { startsWith: q } }] },
  }
}

/** Newest document first; a document without a date after the dated ones (SQL Server sorts NULL last under DESC). */
export const purchaseDocumentSearchOrderBy = [
  { documentDate: "desc" },
  { createdAt: "desc" },
  { id: "asc" },
] satisfies Prisma.PurchaseDocumentOrderByWithRelationInput[]

/** One read per tier: the active linked assets are counted and the first 3 named in the same read. */
export const purchaseDocumentSearchSelect = {
  id: true,
  documentType: true,
  documentNo: true,
  poNumber: true,
  invoiceNumber: true,
  documentDate: true,
  totalAmount: true,
  isActive: true,
  supplier: { select: { id: true, code: true, name: true } },
  _count: { select: { assetLinks: { where: activeLinkWhere } } },
  assetLinks: {
    where: activeLinkWhere,
    orderBy: [{ linkedAt: "asc" }, { id: "asc" }],
    take: purchaseDocumentLinkedNamesShown,
    select: { asset: { select: { name: true } } },
  },
} satisfies Prisma.PurchaseDocumentSelect
export type PurchaseDocumentSearchRecord = Prisma.PurchaseDocumentGetPayload<{ select: typeof purchaseDocumentSearchSelect }>

export type PurchaseDocumentSearchRow = {
  id: string
  documentType: PurchaseDocumentType
  documentNo: string
  poNumber: string | null
  invoiceNumber: string | null
  /** Rows show the name first (spec §5). */
  supplier: { id: string; code: string; name: string } | null
  /** ISO. */
  documentDate: string | null
  /** Decimal(18,2) as a string. */
  totalAmount: string | null
  /** Active linked assets only. */
  linkedAssetCount: number
  /** The first 3 active linked assets' names, oldest link first. */
  linkedAssetNames: string[]
  /** false only on a chosen document read by id (P3-R7); the search never offers one. */
  isActive: boolean
}

export type PurchaseDocumentSearchAnswer = {
  /** With q: every text match; with q "": the rows shown. */
  total: number
  /** Every active document. */
  activeTotal: number
  rows: PurchaseDocumentSearchRow[]
}

export function buildPurchaseDocumentSearchRow(record: PurchaseDocumentSearchRecord): PurchaseDocumentSearchRow {
  return {
    id: record.id,
    documentType: record.documentType as PurchaseDocumentType,
    documentNo: record.documentNo,
    poNumber: record.poNumber,
    invoiceNumber: record.invoiceNumber,
    supplier: record.supplier ? { id: record.supplier.id, code: record.supplier.code, name: record.supplier.name } : null,
    documentDate: record.documentDate ? record.documentDate.toISOString() : null,
    totalAmount: record.totalAmount == null ? null : record.totalAmount.toString(),
    linkedAssetCount: record._count.assetLinks,
    linkedAssetNames: record.assetLinks.slice(0, purchaseDocumentLinkedNamesShown).map((link) => link.asset.name),
    isActive: record.isActive,
  }
}

/** Exact numbers first, then numbers that start with the text, then the rest; each document once, at most `limit`. */
export function rankPurchaseDocumentMatches<T extends { id: string }>(
  lists: { exact: readonly T[]; prefix: readonly T[]; contains: readonly T[] },
  limit: number = purchaseDocumentSearchLimit,
): T[] {
  return uniqueFirst([...lists.exact, ...lists.prefix, ...lists.contains], limit)
}

/** The empty-query list: the supplier's newest first, then the newest; each document once, at most 10. */
export function mergePurchaseDocumentRecent<T extends { id: string }>(supplierFirst: readonly T[], newest: readonly T[]): T[] {
  return uniqueFirst([...supplierFirst, ...newest], purchaseDocumentRecentLimit)
}

function uniqueFirst<T extends { id: string }>(rows: readonly T[], limit: number): T[] {
  const seen = new Set<string>()
  const ranked: T[] = []
  for (const row of rows) {
    if (ranked.length >= limit) break
    if (seen.has(row.id)) continue
    seen.add(row.id)
    ranked.push(row)
  }
  return ranked
}
