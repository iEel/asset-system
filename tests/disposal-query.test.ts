import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDisposalQueryString,
  getDisposalDateRangeError,
  parseDisposalListParams,
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
