import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const dashboardPage = () => readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8")
const dashboardMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).dashboard

test("dashboard exposes cross-scope asset KPI, action card, and detail panel", () => {
  const source = dashboardPage()

  assert.match(source, /buildAssetCrossScopeSummary\(\{ isActive: true \}, 5\)/)
  assert.match(source, /crossScopeTotal/)
  assert.match(source, /crossScopeActionCard/)
  assert.match(source, /crossScopeCards/)
  assert.match(source, /crossScopePreviewRows/)
  assert.match(source, /crossScope: "all"/)
  assert.match(source, /crossScope: "custodian_company"/)
  assert.match(source, /crossScope: "custodian_branch"/)
  assert.match(source, /crossScope: "location_branch"/)
  assert.match(source, /getAssetCrossScopeFlagLabels\(row\.flags/)
})

test("dashboard cross-scope messages exist in Thai and English", () => {
  const keys = [
    "crossScopeAssets",
    "crossScopeAssetsDetail",
    "crossScopeActionTitle",
    "crossScopeActionDetail",
    "crossScopePanelTitle",
    "crossScopePanelSubtitle",
    "crossScopeAll",
    "crossScopeCustodianCompany",
    "crossScopeCustodianBranch",
    "crossScopeLocationBranch",
    "crossScopePreviewTitle",
    "crossScopePreviewEmpty",
    "crossScopeViewAll",
  ]

  for (const locale of ["th", "en"] as const) {
    const messages = dashboardMessages(locale)
    const missing = keys.filter((key) => typeof messages[key] !== "string")
    assert.deepEqual(missing, [], `${locale} dashboard messages are missing cross-scope keys`)
  }
})
