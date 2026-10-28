import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const checkinFormSource = () => readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
const checkinPageSource = () => readFileSync("src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx", "utf8")
const legacyCheckoutRoutePath = "src/app/api/assets/[id]/legacy-checkout/route.ts"
const checkinMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).checkin

test("check-in page loads the master lists, the preselect and the legacy count, never the register", () => {
  const source = checkinPageSource()

  assert.match(source, /getAssetOperationMasterOptions\(\)/)
  assert.match(source, /getCheckinPreselect\(\{ checkoutId: filters\.checkoutId, assetId: filters\.assetId \}\)/)
  assert.match(source, /countLegacyReturns\(\)/)
  assert.match(source, /initialRow=\{preselect\.row\}/)
  assert.match(source, /initialQuery=\{preselect\.query\}/)
  assert.match(source, /legacyReturnCount=\{legacyReturnCount\}/)
  assert.doesNotMatch(source, /getAssetOperationOptions|getAssetOperationAssetLists|legacyReturnCandidates|activeCheckouts/)
})

test("a legacy row asks once, then backfills the handover and continues the normal return (spec 6.3)", () => {
  const source = checkinFormSource()

  for (const snippet of [
    'if (row?.legacy) {',
    'title: t("legacyReturnConfirmTitle")',
    'confirmLabel: t("legacyReturnConfirm")',
    'buildAssetOperationSearchHref({ mode: "checkin", id: assetId })',
    'fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")',
    'else if (prefilled && returnByEmployeeId === prefilled) setEmployeeField("returnBy", "")',
  ]) assert.ok(source.includes(snippet), snippet)
  assert.match(source, /\/api\/assets\/\$\{assetId\}\/legacy-checkout/)
  assert.match(source, /asset-management\/checkin\?checkoutId=/)
  assert.doesNotMatch(source, /legacyReturnCandidates|legacyReturnSearch|filteredLegacyReturnCandidates|legacyBackfillSavingId|hasActiveCheckouts|<SearchField\b|<Chip\b|<EmptyNote\b|<ActionEmptyState\b/)
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

test("legacy check-in messages exist in Thai and English, and the old list's words have no reader and are removed", () => {
  const keys = [
    "legacyReturnCreated",
    "legacyReturnFailed",
    "legacyReturnCount",
    "legacyReturnConfirmTitle",
    "legacyReturnConfirmDescription",
    "legacyReturnConfirm",
  ]
  const removed = [
    "selectCheckout",
    "noActiveCheckoutsOption",
    "noActiveCheckoutsTitle",
    "noActiveCheckoutsDescription",
    "goToCheckout",
    "handoverReviewRequired",
    "legacyReturnTitle",
    "legacyReturnDescription",
    "legacyReturnAction",
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
    const kept = removed.filter((key) => key in messages)
    assert.deepEqual(kept, [], `${locale} checkin messages that have no reader and are removed`)
  }
  assert.equal(checkinMessages("th").legacyReturnConfirmTitle, "สร้างใบส่งมอบย้อนหลังแล้วรับคืน")
})
