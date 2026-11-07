import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

type Messages = {
  reportsPage: Record<string, string>
}

const thai = JSON.parse(readFileSync("messages/th.json", "utf8")) as Messages
const english = JSON.parse(readFileSync("messages/en.json", "utf8")) as Messages

test("Thai and English reports pages expose identical complete key sets", () => {
  assert.deepEqual(Object.keys(thai.reportsPage).sort(), Object.keys(english.reportsPage).sort())

  for (const key of [
    "viewOverview",
    "viewAccounting",
    "viewOperations",
    "viewCatalog",
    "activeFilters",
    "clearActiveFilter",
    "assetPresetScopeHelp",
    "catalogScopeLegendTitle",
    "catalogScopeLegendSystem",
  ]) {
    assert.ok(key in thai.reportsPage, `missing reportsPage.${key}`)
  }
})

test("every reports page runtime message has both locale values", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
  const runtimeKeys = [...source.matchAll(/\bt\("([^"]+)"/g)].map((match) => match[1])

  for (const key of runtimeKeys) {
    assert.equal(typeof thai.reportsPage[key], "string", `missing Thai reportsPage.${key}`)
    assert.equal(typeof english.reportsPage[key], "string", `missing English reportsPage.${key}`)
  }
})

test("Thai reports copy replaces the remaining English placeholders", () => {
  for (const legacyValue of ["Cost Insight", "Reports Ready", "Finding PDF", "System Settings"]) {
    assert.ok(!Object.values(thai.reportsPage).includes(legacyValue), `Thai reportsPage still contains ${legacyValue}`)
  }
})

// Group 10 plan 2 Task 2 (board RP-Library): the scope legend says which files follow the filters and which use each
// module's own (the old "รายงานประจำแยกตามโมดูล" help), then the device-local presets.
test("catalog separates device-local asset presets from module-owned exports", () => {
  const source = readFileSync("src/components/reports/reports-catalog-view.tsx", "utf8")
  const legendFilters = source.indexOf('t("catalogScopeLegendFilters"')
  const legendSystem = source.indexOf('t("catalogScopeLegendSystem")')
  const presetHeading = source.indexOf('t("assetPresetScopeTitle")')
  const presetHelp = source.indexOf('t("assetPresetScopeHelp")')

  assert.ok([legendFilters, legendSystem, presetHeading, presetHelp].every((index) => index >= 0))
  assert.ok(legendFilters < legendSystem && legendSystem < presetHeading && presetHeading < presetHelp)
})
