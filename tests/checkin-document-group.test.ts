import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  buildCheckinDocumentMachineRows,
  checkinDocumentGroupQuery,
  readCheckinDocumentGroup,
  type CheckinDocumentGroupQuery,
  type CheckinDocumentGroupRow,
} from "../src/lib/checkin-document-group.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx"

type Row = CheckinDocumentGroupRow & { transactionStatus: string }
const day = new Date("2026-11-06T00:00:00.000Z")
const row = (id: string, overrides: Partial<Row> = {}): Row => ({
  id,
  documentNo: "RT-2611-0001",
  returnDate: day,
  returnBy: "สมชาย ใจดี",
  receiveBy: "ไอที หนึ่ง",
  createdAt: new Date(`2026-11-06T03:00:0${id.slice(-1)}.000Z`),
  transactionStatus: "active",
  ...overrides,
})

// A fake db that answers like SQL Server: text compared without case and trailing spaces.
function fakeFindMany(rows: Row[]) {
  const calls: CheckinDocumentGroupQuery[] = []
  const loose = (value: string) => value.trimEnd().toLowerCase()
  const findMany = async (query: CheckinDocumentGroupQuery) => {
    calls.push(query)
    return rows.filter((candidate) => candidate.documentNo !== null
      && loose(candidate.documentNo) === loose(query.where.documentNo)
      && candidate.returnDate.getTime() === query.where.returnDate.getTime()
      && loose(candidate.returnBy) === loose(query.where.returnBy)
      && loose(candidate.receiveBy) === loose(query.where.receiveBy))
  }
  return { calls, findMany }
}

test("the group query matches the number, the return date, the returner and the receiver (G7P4-R1)", () => {
  assert.deepEqual(checkinDocumentGroupQuery(row("c-1")), {
    where: { documentNo: "RT-2611-0001", returnDate: day, returnBy: "สมชาย ใจดี", receiveBy: "ไอที หนึ่ง" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  assert.equal(checkinDocumentGroupQuery(row("c-1", { documentNo: null })), null)
})

test("the same number with another returner, receiver or day is not the same document; a voided line stays (G7P4-R1)", async () => {
  const anchor = row("c-2")
  const db = fakeFindMany([
    row("c-3"),
    anchor,
    row("c-1", { transactionStatus: "void" }),
    row("c-4", { returnBy: "สมหญิง รักงาน" }),
    row("c-5", { receiveBy: "ไอที สอง" }),
    row("c-6", { returnDate: new Date("2026-11-05T00:00:00.000Z") }),
    row("c-7", { documentNo: "RT-2611-0002" }),
    row("c-8", { returnBy: "สมชาย ใจดี " }),
  ])
  const group = await readCheckinDocumentGroup(anchor, db.findMany)
  assert.deepEqual(group.map((record) => record.id), ["c-1", "c-2", "c-3"])
  assert.equal(group[0].transactionStatus, "void")
  assert.equal(db.calls.length, 1)
})

test("a record with no number, or one the query misses, is still its own document", async () => {
  const noNumber = row("c-1", { documentNo: null })
  const db = fakeFindMany([noNumber, row("c-2", { documentNo: null })])
  assert.deepEqual((await readCheckinDocumentGroup(noNumber, db.findMany)).map((record) => record.id), ["c-1"])
  assert.equal(db.calls.length, 0)
  const lone = row("c-3")
  assert.deepEqual((await readCheckinDocumentGroup(lone, async () => [])).map((record) => record.id), ["c-3"])
})

test("a machine row names the machine, its condition, next status and room, its HO- and whether it is voided", () => {
  const labels = new Map([["cond-good", "ปกติ"], ["status-ready", "พร้อมใช้งาน"], ["loc-store", "IT-STORE - คลัง IT"]])
  const base = { conditionAfter: "cond-good", nextStatus: "status-ready", nextLocationId: "loc-store" }
  assert.deepEqual(buildCheckinDocumentMachineRows([
    { id: "c-1", transactionStatus: "active", ...base, asset: { id: "a-1", assetTag: "NB-0001", name: "Notebook" }, checkout: { id: "co-1", documentNo: "HO-2610-0001" } },
    { id: "c-2", transactionStatus: "void", ...base, nextLocationId: "loc-gone", asset: { id: "a-2", assetTag: "MN-0002", name: "Monitor" }, checkout: { id: "co-2", documentNo: null } },
  ], labels), [
    { checkinId: "c-1", assetId: "a-1", assetTag: "NB-0001", assetName: "Notebook", condition: "ปกติ", nextStatus: "พร้อมใช้งาน", nextLocation: "IT-STORE - คลัง IT", handoverNo: "HO-2610-0001", voided: false },
    { checkinId: "c-2", assetId: "a-2", assetTag: "MN-0002", assetName: "Monitor", condition: "ปกติ", nextStatus: "พร้อมใช้งาน", nextLocation: null, handoverNo: "co-2", voided: true },
  ])
})

test("the group module is pure (no imports), so node --test loads it", () => {
  assert.doesNotMatch(read("src/lib/checkin-document-group.ts"), /^import /m)
})

test("the RT- page reads the document's records and keeps the one-machine layout for a one-machine document", () => {
  const page = read(PAGE)
  assert.match(page, /const documentRecords = await readCheckinDocumentGroup\(checkin, \(query\) => prisma\.assetCheckin\.findMany\(\{ \.\.\.query, include: checkinInclude \}\)\)/)
  assert.match(page, /if \(documentRecords\.length > 1\) \{/)
  const multi = page.indexOf("if (documentRecords.length > 1) {")
  const single = page.indexOf("const beforeSnapshot = parseAssetTransactionSnapshot(checkin.beforeSnapshotJson)")
  assert.ok(multi > 0 && single > multi, "the multi-machine branch returns before the one-machine document is built")
  // The one-machine document is unchanged: its title, print button and lines slot (the single return's E2E).
  assert.match(page, /title=\{t\("returnDocumentTitle"\)\}/)
  assert.match(page, /printLabel=\{t\("printReturn"\)\}/)
})

test("the multi-machine RT- lists one row per machine, strikes a voided row, signs once and cancels per row", () => {
  const page = read(PAGE)
  const start = page.indexOf("async function renderMultiMachineDocument(")
  assert.ok(start > 0)
  const multi = page.slice(start, page.indexOf("\nfunction ", start + 1))
  assert.match(multi, /buildCheckinDocumentMachineRows\(records, labels\)/)
  assert.match(multi, /data-document-machine=\{row\.checkinId\}/)
  assert.match(multi, /data-voided=\{row\.voided \? "true" : undefined\}/)
  assert.match(multi, /row\.voided \? "line-through" : undefined/)
  assert.match(multi, /t\("documentMachineVoided"\)/)
  // The two signature images are the anchor's (the same files are attached to every record, G7P4-R5).
  assert.match(multi, /module: "checkin_return_signature", referenceId: anchor\.id/)
  assert.match(multi, /module: "checkin_receive_signature", referenceId: anchor\.id/)
  // Each active row has its own cancel, for its own record; none on the toolbar.
  assert.match(multi, /record\.transactionStatus === "active" \? \(\n\s+<TransactionCancelDialog\n\s+type="checkin"\n\s+transactionId=\{record\.id\}\n\s+expectedUpdatedAt=\{record\.updatedAt\.toISOString\(\)\}/)
  assert.doesNotMatch(multi, /toolbarActions=/)
  assert.match(multi, /className="print:hidden/)
  assert.match(multi, /title=\{t\("returnDocumentTitle"\)\}/)
  assert.match(multi, /printLabel=\{t\("printReturn"\)\}/)
})

test("the multi-machine RT- copy exists in Thai and English", () => {
  for (const locale of ["th", "en"]) {
    const checkin = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).checkin
    for (const key of ["documentMachines", "documentMachineCount", "documentMachineColumn", "documentMachineVoided", "documentMachineActions"]) {
      assert.equal(typeof checkin?.[key], "string", `${locale}.checkin.${key}`)
    }
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).checkin
  assert.equal(th.documentMachineVoided, "ยกเลิกแล้ว")
})
