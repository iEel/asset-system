import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildDisposalQueryString,
  buildDisposalWhere,
  getDisposalDateRangeError,
  parseDisposalListParams,
  loadAuditRoundDisposalFindingIds,
} from "../src/lib/disposal-query.ts"

test("parses disposal pagination with the supported page sizes", () => {
  assert.deepEqual(
    parseDisposalListParams({ page: "3", pageSize: "50" }),
    {
      search: "",
      status: "",
      disposalType: "",
      dateFrom: "",
      dateTo: "",
      auditRound: "",
      page: 3,
      pageSize: 50,
    },
  )

  assert.equal(parseDisposalListParams({ page: "0", pageSize: "10" }).page, 1)
  assert.equal(parseDisposalListParams({ page: "0", pageSize: "10" }).pageSize, 25)
  assert.equal(parseDisposalListParams({}).pageSize, 25)
  assert.equal(parseDisposalListParams({ page: "2.5" }).page, 1)
})

test("builds stable disposal query strings including pagination and filters", () => {
  const query = buildDisposalQueryString(
    parseDisposalListParams({
      search: "  laptop  ",
      status: "pending",
      disposalType: "sell",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-13",
      page: "2",
      pageSize: "100",
    }),
  )

  assert.equal(
    query,
    "search=laptop&status=pending&disposalType=sell&dateFrom=2026-07-01&dateTo=2026-07-13&page=2&pageSize=100",
  )
})

test("overrides disposal pagination without dropping active filters", () => {
  const filters = parseDisposalListParams({
    search: "monitor",
    status: "approved",
    page: "4",
    pageSize: "25",
  })

  assert.equal(
    buildDisposalQueryString(filters, { page: 1, pageSize: 100 }),
    "search=monitor&status=approved&page=1&pageSize=100",
  )
})

test("flags a disposal date range whose start is after its end", () => {
  assert.equal(
    getDisposalDateRangeError(
      parseDisposalListParams({ dateFrom: "2026-07-14", dateTo: "2026-07-13" }),
    ),
    "invalid_order",
  )
  assert.equal(
    getDisposalDateRangeError(
      parseDisposalListParams({ dateFrom: "2026-07-13", dateTo: "2026-07-13" }),
    ),
    null,
  )
  assert.equal(getDisposalDateRangeError(parseDisposalListParams({ dateFrom: "2026-07-13" })), null)
})

// ยืนยันผลตรวจ plan 4 task 2: the queue filtered to one audit round's requests.
const ROUND_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"

test("parse keeps a valid uuid auditRound and drops anything else", () => {
  assert.equal(parseDisposalListParams({ auditRound: ROUND_ID }).auditRound, ROUND_ID)
  assert.equal(parseDisposalListParams({ auditRound: ` ${ROUND_ID.toUpperCase()} ` }).auditRound, ROUND_ID.toUpperCase())
  assert.equal(parseDisposalListParams(new URLSearchParams({ auditRound: ROUND_ID })).auditRound, ROUND_ID)
  for (const bad of ["", "abc", "AUD-2026-0003", `${ROUND_ID}x`, "6f1c2a3b4d5e4f608a7b9c0d1e2f3a4b"]) {
    assert.equal(parseDisposalListParams({ auditRound: bad }).auditRound, "", bad)
  }
  assert.equal(parseDisposalListParams({}).auditRound, "")
})

test("the where matches the round's own requests or its findings' requests", () => {
  const where = buildDisposalWhere(parseDisposalListParams({ auditRound: ROUND_ID }), { auditRoundFindingIds: ["f-1", "f-2"] })
  assert.deepEqual(where.AND, [
    {
      OR: [
        { sourceType: "audit_round", sourceId: ROUND_ID },
        { sourceType: "audit_finding", sourceId: { in: ["f-1", "f-2"] } },
      ],
    },
  ])
  assert.equal(where.isActive, true)
})

test("the round filter keeps the search's OR and the other filters", () => {
  const where = buildDisposalWhere(
    parseDisposalListParams({ auditRound: ROUND_ID, search: "laptop", status: "approved" }),
    { auditRoundFindingIds: [] },
  )
  assert.ok(Array.isArray(where.OR) && where.OR.length > 0, "the search's OR stays")
  assert.equal(where.requestStatus, "approved")
  assert.deepEqual(where.AND, [
    {
      OR: [
        { sourceType: "audit_round", sourceId: ROUND_ID },
        { sourceType: "audit_finding", sourceId: { in: [] } },
      ],
    },
  ])
})

test("no round filter adds no AND", () => {
  assert.equal(buildDisposalWhere(parseDisposalListParams({}), { auditRoundFindingIds: ["f-1"] }).AND, undefined)
  assert.equal(buildDisposalWhere(parseDisposalListParams({})).AND, undefined)
})

test("the href builder keeps auditRound with status=approved", () => {
  const filters = parseDisposalListParams({ auditRound: ROUND_ID, status: "pending" })
  assert.equal(
    buildDisposalQueryString(filters, { status: "approved", page: 1 }),
    `status=approved&auditRound=${ROUND_ID}&page=1&pageSize=25`,
  )
  assert.equal(buildDisposalQueryString(filters, { auditRound: "" }), "status=pending&page=1&pageSize=25")
})

// Fix round 1: only the round's findings that have a disposal request, intersected in chunks (SQL Server's limit).
type SourceArgs = { where: Record<string, unknown>; select: Record<string, unknown>; distinct: string[] }
type FindingArgs = { where: { auditRoundId: string; id: { in: string[] } }; select: { id: true } }

function fakeFindingDb(sourceIds: Array<string | null>, roundFindingIds: Set<string>) {
  const sourceCalls: SourceArgs[] = []
  const findingCalls: FindingArgs[] = []
  const db = {
    disposalRequest: {
      async findMany(args: SourceArgs) {
        sourceCalls.push(args)
        return sourceIds.map((sourceId) => ({ sourceId }))
      },
    },
    auditFinding: {
      async findMany(args: FindingArgs) {
        findingCalls.push(args)
        return args.where.id.in.filter((id) => roundFindingIds.has(id)).map((id) => ({ id }))
      },
    },
  }
  return { db, sourceCalls, findingCalls }
}

test("loadAuditRoundDisposalFindingIds reads distinct audit_finding sources, then the round's in chunks", async () => {
  const sourceIds = Array.from({ length: 4500 }, (_, index) => `f-${index}`)
  const { db, sourceCalls, findingCalls } = fakeFindingDb([...sourceIds, null], new Set(["f-1", "f-2500", "f-4499"]))
  const ids = await loadAuditRoundDisposalFindingIds(db, ROUND_ID)

  assert.deepEqual(sourceCalls, [{
    where: { isActive: true, sourceType: "audit_finding", sourceId: { not: null } },
    select: { sourceId: true },
    distinct: ["sourceId"],
  }])
  assert.equal(findingCalls.length, 3, "4,500 sources in chunks of 2,000")
  for (const call of findingCalls) {
    assert.equal(call.where.auditRoundId, ROUND_ID)
    assert.ok(call.where.id.in.length <= 2000)
    assert.deepEqual(call.select, { id: true })
  }
  assert.deepEqual(findingCalls.flatMap((call) => call.where.id.in), sourceIds, "every source once, the null dropped")
  assert.deepEqual(ids.sort(), ["f-1", "f-2500", "f-4499"])
})

test("loadAuditRoundDisposalFindingIds reads nothing without a round, and no findings without sources", async () => {
  const none = fakeFindingDb(["f-1"], new Set(["f-1"]))
  assert.deepEqual(await loadAuditRoundDisposalFindingIds(none.db, ""), [])
  assert.equal(none.sourceCalls.length + none.findingCalls.length, 0)

  const empty = fakeFindingDb([], new Set())
  assert.deepEqual(await loadAuditRoundDisposalFindingIds(empty.db, ROUND_ID), [])
  assert.equal(empty.sourceCalls.length, 1)
  assert.equal(empty.findingCalls.length, 0)
})

test("the helper never reads all of a round's findings: every auditFinding read is bounded by an id chunk", () => {
  const source = readFileSync("src/lib/disposal-query.ts", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /distinct: \["sourceId"\]/)
  assert.match(source, /sourceType: "audit_finding"/)
  assert.match(source, /chunkAuditIds\(sourceIds, AUDIT_ID_CHUNK_SIZE\)/)
  const reads = source.match(/auditFinding\.findMany\(\{[^)]*\}\)/g) ?? []
  assert.equal(reads.length, 1)
  assert.match(reads[0], /where: \{ auditRoundId, id: \{ in: chunk \} \}/)
  assert.doesNotMatch(source, /readAuditRoundFindingIds/)
})
