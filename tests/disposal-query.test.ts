import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDisposalQueryString,
  buildDisposalWhere,
  getDisposalDateRangeError,
  parseDisposalListParams,
  readAuditRoundFindingIds,
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

test("readAuditRoundFindingIds reads the round's finding ids", async () => {
  const calls: unknown[] = []
  const db = {
    auditFinding: {
      async findMany(args: { where: { auditRoundId: string }; select: { id: true } }) {
        calls.push(args)
        return [{ id: "f-1" }, { id: "f-2" }]
      },
    },
  }
  assert.deepEqual(await readAuditRoundFindingIds(db, ROUND_ID), ["f-1", "f-2"])
  assert.deepEqual(calls, [{ where: { auditRoundId: ROUND_ID }, select: { id: true } }])
  assert.deepEqual(await readAuditRoundFindingIds(db, ""), [])
  assert.equal(calls.length, 1, "no round, no read")
})
