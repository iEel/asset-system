import assert from "node:assert/strict"
import test from "node:test"

import { buildMaintenancePagination } from "../src/lib/maintenance-list.ts"

test("clamps maintenance pagination and reports an exact visible range", () => {
  assert.deepEqual(buildMaintenancePagination(8, 25, 52), {
    page: 3,
    pageSize: 25,
    total: 52,
    totalPages: 3,
    start: 51,
    end: 52,
  })
  assert.deepEqual(buildMaintenancePagination(2, 25, 0), {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
    start: 0,
    end: 0,
  })
})
