import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { normalizeAssetDataQualityFilter } from "../src/lib/asset-data-quality-filter.ts"
import { buildExactAssetRegisterHref } from "../src/lib/asset-register-view-memory.ts"

const checkinFormSource = () => readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
const checkinPageSource = () => readFileSync("src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx", "utf8")
const legacyCheckoutRoutePath = "src/app/api/assets/[id]/legacy-checkout/route.ts"
const checkinMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).checkin

test("check-in page loads the master lists, the preselect and the legacy count, never the register; the count is the header's link to the register's noHandover list (group 3 spec §8.1, P2-R12)", () => {
  const source = checkinPageSource()

  assert.match(source, /getAssetOperationMasterOptions\(\{ conditionsFor: "checkin" \}\)/)
  assert.match(source, /readConditionLabels\(\)/)
  assert.match(source, /readCheckinDepartment\(prisma\)\.catch\(\(\) => null\)/)
  assert.match(source, /getCheckinPreselect\(\{ checkoutId: filters\.checkoutId, assetId: filters\.assetId \}\)/)
  assert.match(source, /countLegacyReturns\(\)/)
  assert.match(source, /initialRow=\{preselect\.row\}/)
  assert.match(source, /initialQuery=\{preselect\.query\}/)
  assert.match(source, /legacyLink=\{legacyLink\}/)
  assert.doesNotMatch(source, /legacyReturnCount=/)
  assert.match(source, /const t = await getTranslations\("checkin"\)/)
  assert.match(source, /const legacyLink = legacyReturnCount > 0 \? \(/)
  assert.match(source, /<Link href=\{buildExactAssetRegisterHref\(locale, \{ dataQuality: "noHandover" \}\)\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-meta md:min-h-0"\)\}>/)
  assert.match(source, /\{t\("legacyReturnLink", \{ count: formatCount\(legacyReturnCount\) \}\)\}/)
  assert.match(source, /\) : null/)
  const href = buildExactAssetRegisterHref("th", { dataQuality: "noHandover" })
  assert.equal(href, "/th/assets?dataQuality=noHandover&exact=1")
  assert.equal(normalizeAssetDataQualityFilter(new URL(href, "http://localhost").searchParams.get("dataQuality")), "noHandover", "the link's value is one the register reads")
  assert.doesNotMatch(source, /getAssetOperationOptions|getAssetOperationAssetLists|legacyReturnCandidates|activeCheckouts/)
})

test("a legacy row asks once, then backfills the handover and continues the normal return with no condition or room filled in; with no return department the confirm is refused (spec 6.3, group 3 spec §8.3, P2-R8)", () => {
  const source = checkinFormSource()

  for (const snippet of [
    'if (row?.legacy) {',
    'title: t("legacyReturnConfirmTitle")',
    'confirmLabel: t("legacyReturnConfirm")',
    'buildAssetOperationSearchHref({ mode: "checkin", id: assetId, detail: true })',
    'fieldErrors.clear("checkoutId", "returnBy")',
    'if (!returnDepartment) {',
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
    "legacyReturnLink",
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
    "legacyReturnCount",
  ]

  for (const locale of ["th", "en"] as const) {
    const messages = checkinMessages(locale)
    const missing = keys.filter((key) => !(key in messages))
    assert.deepEqual(missing, [], `${locale} checkin messages are missing keys`)
    const kept = removed.filter((key) => key in messages)
    assert.deepEqual(kept, [], `${locale} checkin messages that have no reader and are removed`)
  }
  assert.equal(checkinMessages("th").legacyReturnConfirmTitle, "สร้างใบส่งมอบย้อนหลังแล้วรับคืน")
  assert.equal(checkinMessages("th").legacyReturnLink, "ข้อมูลเก่าที่ยังไม่มีใบส่งมอบ {count} รายการ · ดูรายการ")
  assert.equal(checkinMessages("en").legacyReturnLink, "{count} legacy records without a handover document · View list")
})
