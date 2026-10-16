import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const operationOptionsSource = () => readFileSync("src/lib/asset-operation-options.ts", "utf8")
const checkinFormSource = () => readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
const checkinPageSource = () => readFileSync("src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx", "utf8")
const legacyCheckoutRoutePath = "src/app/api/assets/[id]/legacy-checkout/route.ts"
const checkinMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).checkin

test("check-in options expose legacy return candidates from current custodians without active checkouts", () => {
  const source = operationOptionsSource()

  assert.match(source, /custodian: \{ select: \{ code: true, fullNameTh: true \} \}/)
  assert.match(source, /conditionId: true/)
  assert.match(source, /legacyReturnCandidates/)
  assert.match(source, /asset is LegacyReturnAsset/)
  assert.match(source, /filterLegacyReturnEligibleAssets/)
  assert.match(source, /hasActiveMaintenance:\s*activeMaintenanceAssetIds\.has\(asset\.id\)/)
})

test("check-in page passes legacy return candidates to the form", () => {
  const source = checkinPageSource()

  assert.match(source, /legacyReturnCandidates=\{options\.legacyReturnCandidates\}/)
})

test("check-in form can backfill a legacy checkout and continue through the normal return form", () => {
  const source = checkinFormSource()

  assert.match(source, /legacyReturnCandidates/)
  assert.match(source, /legacyReturnSearch/)
  assert.match(source, /filteredLegacyReturnCandidates/)
  assert.match(source, /handleCreateLegacyCheckout/)
  assert.match(source, /\/api\/assets\/\$\{assetId\}\/legacy-checkout/)
  assert.match(source, /asset-management\/checkin\?checkoutId=/)
  assert.match(source, /filteredLegacyReturnCandidates\.map/)
  assert.match(source, /legacyReturnFilteredCount/)
  assert.match(source, /legacyReturnNoResults/)
})

test("legacy checkout API creates an auditable backfilled handover instead of changing check-in rules", () => {
  assert.equal(existsSync(legacyCheckoutRoutePath), true)
  const source = readFileSync(legacyCheckoutRoutePath, "utf8")

  assert.match(source, /legacy_return_backfill/)
  assert.match(source, /getAssetLifecycleTransitionError\("legacy_return_backfill", asset\.status\.name\)/)
  assert.match(source, /handoverMode:\s*"permanent_assignment"/)
  assert.match(source, /getRequiredAssetStatusId\("In Use"\)/)
  assert.match(source, /ASSET_LEGACY_RETURN_MAINTENANCE_ACTIVE/)
  assert.match(source, /const custodianId = asset\.custodianId/)
  assert.match(source, /custodianId,/)
  assert.match(source, /conditionBefore: asset\.conditionId/)
  assert.match(source, /generateCheckoutDocumentNo/)
  assert.match(source, /Asset already has an active checkout/)
})

test("legacy check-in messages exist in Thai and English", () => {
  const keys = [
    "legacyReturnTitle",
    "legacyReturnDescription",
    "legacyReturnAction",
    "legacyReturnCreated",
    "legacyReturnFailed",
    "legacyReturnCurrentHolder",
    "legacyReturnCurrentLocation",
    "legacyReturnBadge",
    "legacyReturnSearch",
    "legacyReturnFilteredCount",
    "legacyReturnNoResults",
  ]

  for (const locale of ["th", "en"] as const) {
    const messages = checkinMessages(locale)
    const missing = keys.filter((key) => !(key in messages))
    assert.deepEqual(missing, [], `${locale} checkin messages are missing keys`)
  }
})

test("the legacy return row keeps its label while it works, and its search box is a SearchField (2C batch 1b)", () => {
  const source = checkinFormSource().replace(/\r\n/g, "\n")
  assert.match(source, /<Button\n\s+variant="outline"\n\s+busy=\{legacyBackfillSavingId === asset\.id\}\n\s+disabled=\{saving\}/)
  assert.match(source, /<PackageCheck \/>\n\s+\{t\("legacyReturnAction"\)\}/)
  assert.doesNotMatch(source, /t\("legacyReturnCreating"\)/)
  assert.match(source, /<SearchField\n\s+aria-label=\{t\("legacyReturnSearch"\)\}/)
})
