import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildReportPreset, buildReportPresetHref, normalizeReportPresetQuery, persistReportPresets } from "../src/lib/report-presets.ts"

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

test("saved report links preserve a valid view and keep legacy queries compatible", () => {
  assert.equal(buildReportPresetHref("th", "view=operations&statusId=ready"), "/th/reports?view=operations&statusId=ready")
  assert.equal(buildReportPresetHref("th", "statusId=ready"), "/th/reports?statusId=ready")
})

test("new catalog presets receive the current report view and asset filters", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
  assert.match(source, /currentQuery=\{buildReportQueryString\(activeView, filters\)\}/)
})

test("preset writes return a safe failure instead of throwing when browser storage is blocked", () => {
  const blockedStorage = {
    setItem() {
      throw new Error("storage blocked")
    },
  }

  assert.equal(persistReportPresets(() => blockedStorage, []), false)
})

test("preset writes contain a SecurityError thrown while accessing browser storage", () => {
  let accessed = false
  assert.equal(
    persistReportPresets(() => {
      accessed = true
      throw new Error("localStorage getter blocked")
    }, []),
    false,
  )
  assert.equal(accessed, true)
})

test("preset writes serialize the normalized list and report success", () => {
  let storedKey = ""
  let storedValue = ""
  const storage = {
    setItem(key: string, value: string) {
      storedKey = key
      storedValue = value
    },
  }
  const presets = [buildReportPreset({ id: "preset-1", name: "Ready", query: "view=overview" })!]

  assert.equal(persistReportPresets(() => storage, presets), true)
  assert.equal(storedKey, "asset-system:report-presets:v1")
  assert.deepEqual(JSON.parse(storedValue), presets)
})
