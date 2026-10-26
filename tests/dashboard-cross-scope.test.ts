import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const dashboardPage = () => readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8").replace(/\r/g, "")
const dashboardMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).dashboard

test("the dashboard shows the cross-scope number once: one line under the status table (spec 2026-10-25 §6.6, addition 5)", () => {
  const source = dashboardPage()
  assert.equal(source.match(/buildDashboardRegisterHref\(locale, "crossScope", companyId\)/g)?.length, 1)
  assert.doesNotMatch(source, /crossScope: "/, "the filter is written once, in dashboardRegisterParams (R21)")
  assert.match(source, /t\("crossScopeLine", \{ count: formatCount\(overview\.crossScopeTotal\) \}\)/)
  assert.doesNotMatch(source, /crossScopeActionCard|crossScopeCards|crossScopePreviewRows|buildDashboardAssetCrossScopeSummary|getAssetCrossScopeFlagLabels|custodian_company|custodian_branch|location_branch/)
})

test("the cross-scope words: one line in Thai and English, the old panel's keys gone", () => {
  assert.equal(dashboardMessages("th").crossScopeLine, "นอกขอบเขตเจ้าของรหัส {count} รายการ")
  assert.match(dashboardMessages("en").crossScopeLine, /\{count\}/)
  const gone = ["crossScopeAssets", "crossScopeActionTitle", "crossScopeActionDetail", "crossScopePanelTitle", "crossScopePanelSubtitle", "crossScopeAll", "crossScopeCustodianCompany", "crossScopeCustodianBranch", "crossScopeLocationBranch", "crossScopePreviewTitle", "crossScopePreviewEmpty", "crossScopeViewAll"]
  for (const locale of ["th", "en"] as const) {
    const messages = dashboardMessages(locale)
    assert.deepEqual(gone.filter((key) => key in messages), [], `${locale}: the four-cell panel's keys`)
  }
})
