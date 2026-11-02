import {
  buildPurchaseDocumentSearchRow,
  buildPurchaseDocumentSearchWheres,
  mergePurchaseDocumentRecent,
  purchaseDocumentRecentLimit,
  purchaseDocumentSearchLimit,
  purchaseDocumentSearchOrderBy,
  purchaseDocumentSearchSelect,
  rankPurchaseDocumentMatches,
  type PurchaseDocumentSearchAnswer,
  type PurchaseDocumentSearchInput,
  type PurchaseDocumentSearchRecord,
  type PurchaseDocumentSearchRow,
} from "./purchase-document-search-rules.ts"

// The reads of the asset form's purchase-document search (group 4 plan 3 Task 2, spec §9.2). Bounded: with q, 3 document
// reads of at most 20 and 2 counts; with q "", 1 or 2 reads of at most 10 and 1 count; each read names the active linked
// assets itself (no read per row). The db is injected, as searchAssetOperationOptions, so the pages call it for the
// empty-query list (P3-R4) and the tests fake it.

// Method syntax, so fakes may narrow args; the route passes `prisma as unknown as PurchaseDocumentSearchDb`.
export type PurchaseDocumentSearchDb = {
  purchaseDocument: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
}

const activeDocumentWhere = { isActive: true }

export async function searchPurchaseDocuments(
  db: PurchaseDocumentSearchDb,
  input: PurchaseDocumentSearchInput,
): Promise<PurchaseDocumentSearchAnswer> {
  const list = (where: object, take: number) => db.purchaseDocument.findMany({
    where,
    select: purchaseDocumentSearchSelect,
    orderBy: purchaseDocumentSearchOrderBy,
    take,
  }) as Promise<PurchaseDocumentSearchRecord[]>

  if (input.q === "") {
    // The newest, the form's supplier first (P3-R4); the count is every active document.
    const [supplierFirst, newest, activeTotal] = await Promise.all([
      input.supplierId ? list({ ...activeDocumentWhere, supplierId: input.supplierId }, purchaseDocumentRecentLimit) : Promise.resolve([]),
      list(activeDocumentWhere, purchaseDocumentRecentLimit),
      db.purchaseDocument.count({ where: activeDocumentWhere }),
    ])
    const rows = mergePurchaseDocumentRecent(supplierFirst, newest).map(buildPurchaseDocumentSearchRow)
    return { total: rows.length, activeTotal, rows }
  }

  const wheres = buildPurchaseDocumentSearchWheres(input)
  // The match count is the text tier's: exact and prefix hits are text hits too (critic §3).
  const [exact, prefix, contains, total, activeTotal] = await Promise.all([
    list(wheres.exact, purchaseDocumentSearchLimit),
    list(wheres.prefix, purchaseDocumentSearchLimit),
    list(wheres.text, purchaseDocumentSearchLimit),
    db.purchaseDocument.count({ where: wheres.text }),
    db.purchaseDocument.count({ where: activeDocumentWhere }),
  ])
  return { total, activeTotal, rows: rankPurchaseDocumentMatches({ exact, prefix, contains }).map(buildPurchaseDocumentSearchRow) }
}

/**
 * The documents a form has chosen, by id, in the order given, inactive ones too (P3-R7: a linked document that was
 * closed still shows as a chip, marked by isActive false). An id that is not found is left out.
 */
export async function readPurchaseDocumentChoices(db: PurchaseDocumentSearchDb, ids: string[]): Promise<PurchaseDocumentSearchRow[]> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return []
  const records = await db.purchaseDocument.findMany({
    where: { id: { in: unique } },
    select: purchaseDocumentSearchSelect,
  }) as PurchaseDocumentSearchRecord[]
  const byId = new Map(records.map((record) => [record.id, record]))
  return unique.flatMap((id) => {
    const record = byId.get(id)
    return record ? [buildPurchaseDocumentSearchRow(record)] : []
  })
}
