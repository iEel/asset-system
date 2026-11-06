// The records of one RT- document (group 7 plan 4, G7P4-R1). A multi-asset return writes one AssetCheckin per machine
// that share the RT- number (no migration). documentNo is not unique and old duplicate numbers exist, so a record
// belongs to the document only when its number, return date, returner and receiver all match. Voided records stay in
// the group: the RT- page shows them struck through. Pure: no imports, so `node --test` loads it.

export type CheckinDocumentGroupKey = {
  id: string
  documentNo: string | null
  returnDate: Date
  returnBy: string
  receiveBy: string
}

export type CheckinDocumentGroupRow = CheckinDocumentGroupKey & { createdAt: Date }

export type CheckinDocumentGroupQuery = {
  where: { documentNo: string; returnDate: Date; returnBy: string; receiveBy: string }
  orderBy: Array<{ createdAt: "asc" } | { id: "asc" }>
}

// The database match. SQL Server compares text without case and trailing spaces, so the rows are matched again exactly
// by sameCheckinDocument.
export function checkinDocumentGroupQuery(anchor: CheckinDocumentGroupKey): CheckinDocumentGroupQuery | null {
  if (!anchor.documentNo) return null
  return {
    where: { documentNo: anchor.documentNo, returnDate: anchor.returnDate, returnBy: anchor.returnBy, receiveBy: anchor.receiveBy },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  }
}

export function sameCheckinDocument(anchor: CheckinDocumentGroupKey, row: CheckinDocumentGroupKey): boolean {
  return anchor.documentNo !== null
    && row.documentNo === anchor.documentNo
    && row.returnDate.getTime() === anchor.returnDate.getTime()
    && row.returnBy === anchor.returnBy
    && row.receiveBy === anchor.receiveBy
}

// The document's records in the order they were written, the anchor always among them. A record with no number is a
// document of its own.
export async function readCheckinDocumentGroup<Row extends CheckinDocumentGroupRow>(
  anchor: Row,
  findMany: (query: CheckinDocumentGroupQuery) => Promise<Row[]>,
): Promise<Row[]> {
  const query = checkinDocumentGroupQuery(anchor)
  if (!query) return [anchor]
  const rows = (await findMany(query)).filter((row) => sameCheckinDocument(anchor, row))
  if (!rows.some((row) => row.id === anchor.id)) rows.push(anchor)
  return rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export type CheckinDocumentMachineInput = {
  id: string
  transactionStatus: string
  conditionAfter: string
  nextStatus: string
  nextLocationId: string
  damageNote: string | null
  remark: string | null
  asset: { id: string; assetTag: string; name: string }
  checkout: { id: string; documentNo: string | null }
}

export type CheckinDocumentMachineRow = {
  checkinId: string
  assetId: string
  assetTag: string
  assetName: string
  condition: string | null
  nextStatus: string | null
  nextLocation: string | null
  handoverNo: string
  /** The machine's own damage note and remark (the batch form's per-row note), null when blank. */
  damageNote: string | null
  remark: string | null
  voided: boolean
}

// One line of the multi-machine RT-: the machine, how it came back, where it went, the HO- it closed and its own damage
// note and remark. A label that cannot be read is null (the page shows Nil).
export function buildCheckinDocumentMachineRows(
  records: readonly CheckinDocumentMachineInput[],
  labels: ReadonlyMap<string, string>,
): CheckinDocumentMachineRow[] {
  return records.map((record) => ({
    checkinId: record.id,
    assetId: record.asset.id,
    assetTag: record.asset.assetTag,
    assetName: record.asset.name,
    condition: labels.get(record.conditionAfter) ?? null,
    nextStatus: labels.get(record.nextStatus) ?? null,
    nextLocation: labels.get(record.nextLocationId) ?? null,
    handoverNo: record.checkout.documentNo ?? record.checkout.id,
    damageNote: record.damageNote?.trim() || null,
    remark: record.remark?.trim() || null,
    voided: record.transactionStatus === "void",
  }))
}
