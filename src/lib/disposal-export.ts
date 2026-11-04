// The disposal export's columns (group 6 spec §12): Thai headers through messages (disposalPage.export.*), with
// รหัสทรัพย์สิน for the tag and a เลขที่รอบ column for the round a request was recorded in.

export const disposalExportColumnKeys = [
  { key: "disposalNo", width: 20 },
  { key: "roundNo", width: 20 },
  { key: "assetTag", width: 22 },
  { key: "assetName", width: 32 },
  { key: "disposalType", width: 16 },
  { key: "reason", width: 40 },
  { key: "source", width: 28 },
  { key: "requestedBy", width: 28 },
  { key: "approver", width: 28 },
  { key: "status", width: 22 },
  { key: "requestDate", width: 16 },
  { key: "approvedAt", width: 16 },
  { key: "executionDate", width: 16 },
  { key: "executedBy", width: 28 },
  { key: "recipientName", width: 28 },
  { key: "documentNo", width: 24 },
  { key: "saleValue", width: 16 },
  { key: "salvageValue", width: 16 },
  { key: "actualSaleValue", width: 18 },
  { key: "actualSalvageValue", width: 18 },
  { key: "completedAt", width: 16 },
  { key: "approvalRemark", width: 40 },
  { key: "executionRemark", width: 40 },
] as const

export type DisposalExportColumnKey = (typeof disposalExportColumnKeys)[number]["key"]

/** `t` reads disposalPage.export.<key>: "columns.<key>" for each header. */
export function buildDisposalExportColumns(t: (key: string) => string) {
  return disposalExportColumnKeys.map(({ key, width }) => ({ header: t(`columns.${key}`), key, width }))
}
