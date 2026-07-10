import assert from "node:assert/strict"
import test from "node:test"

import { buildReportPreset, buildReportPresetHref, normalizeReportPresetQuery } from "../src/lib/report-presets.ts"

test("normalizes a report preset query without a leading question mark", () => {
  assert.equal(normalizeReportPresetQuery("?companyId=co-1&statusId=ready"), "companyId=co-1&statusId=ready")
  assert.equal(normalizeReportPresetQuery(""), "")
})

test("builds a concise named preset for the current report filters", () => {
  assert.deepEqual(
    buildReportPreset({ id: "preset-1", name: "  Ready assets at HQ  ", query: "statusId=ready&branchId=hq", createdAt: "2026-07-10T00:00:00.000Z" }),
    {
      id: "preset-1",
      name: "Ready assets at HQ",
      query: "statusId=ready&branchId=hq",
      createdAt: "2026-07-10T00:00:00.000Z",
    },
  )
  assert.equal(buildReportPreset({ name: "", query: "statusId=ready" }), null)
  assert.equal(buildReportPreset({ name: "All active assets", query: "" })?.query, "")
})

test("builds report links from saved filter queries", () => {
  assert.equal(buildReportPresetHref("th", "statusId=ready&branchId=hq"), "/th/reports?statusId=ready&branchId=hq")
  assert.equal(buildReportPresetHref("en", ""), "/en/reports")
})
