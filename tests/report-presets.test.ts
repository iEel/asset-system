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

// Phase 2C batch 4 (spec 2C §4.14 note 4, §8.9): the preset name is a shared Field + Input that keeps its 60-character
// limit; the device-only line stays under the row of the field and the save button. The file is CRLF in the working tree.
test("the preset name uses the shared Field and Input and keeps its 60-character limit (2C batch 4)", () => {
  const source = readFileSync("src/components/reports/report-preset-controls.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Field label=\{labels\.presetName\} className="min-w-0 flex-1">\n\s+<Input\n\s+value=\{name\}/)
  assert.match(source, /maxLength=\{60\}\n\s+\/>\n\s+<\/Field>/)
  assert.doesNotMatch(source, /<label\b|<input\b|mb-1\.5 block text-sm font-medium|focus:border-ring/)
  assert.match(source, /<\/div>\n\s+<p className="mt-2 text-xs text-muted-foreground">\{labels\.savedPresetsDeviceOnly\}<\/p>/)
})
