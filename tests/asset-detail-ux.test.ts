import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const assetDetailSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

test("asset detail uses one tab navigation and view guards for grouped content", () => {
  const source = assetDetailSource()

  assert.match(source, /AssetDetailTabs/)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "overview"\)/)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "components"\)/)
  assert.doesNotMatch(source, /sectionLinks\.map/)
})

test("asset detail keeps secondary actions in the More menu and caps mobile actions", () => {
  const source = assetDetailSource()

  assert.match(source, /AssetDetailActionMenu/)
  assert.match(source, /mobileActionCandidates\.slice\(0, 3\)/)
  assert.match(source, /hasPermission\(user, "asset", "edit"\)/)
})

test("asset detail keeps an accessible name on the icon-only mobile back link", () => {
  const source = assetDetailSource()

  assert.match(source, /aria-label=\{isAssetScanReturn \? t\("backToScan"\) : tCommon\("back"\)\}/)
})

test("asset detail answers identity and responsibility in one compact first-viewport summary", () => {
  const source = assetDetailSource()
  const identityIndex = source.indexOf('data-testid="asset-identity-summary"')
  const componentContextIndex = source.indexOf("<AssetComponentContextBanner")

  assert.notEqual(identityIndex, -1)
  assert.ok(identityIndex < componentContextIndex)
  assert.match(source, /<StatusPill label=\{asset\.status\.nameTh\}/)
  assert.match(source, /<StatusPill label=\{asset\.condition\.nameTh\}/)
  assert.match(source, /\{currentLocationLabel \|\| "-"\}/)
  assert.match(source, /\{lifecycle\.responsibilityValue \?\? currentCustodianLabel \?\? "-"\}/)
  assert.doesNotMatch(source, /<SummaryCard/)
})

test("asset detail keeps one actionable follow-up surface with expandable data quality", () => {
  const source = assetDetailSource()
  const thaiMessages = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const englishMessages = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(source, /activityFollowUpItems\.length > 0/)
  assert.match(source, /data-testid="asset-data-health-details"/)
  assert.doesNotMatch(source, /latestItem=\{latestActivityItem\}/)
  assert.doesNotMatch(source, /latestTitle=\{t\("activityLatest"\)\}/)
  assert.equal(thaiMessages.asset.activitySummaryTitle, "สิ่งที่ต้องติดตาม")
  assert.equal(englishMessages.asset.activitySummaryTitle, "Follow-up")
})

test("asset detail localizes audit activity and avoids duplicated activity titles", () => {
  const source = assetDetailSource()

  assert.match(source, /getAuditRoundItemStatusLabelKey/)
  assert.match(source, /getAuditRoundItemResultLabelKey/)
  assert.match(source, /getTranslations\("auditRound"\)/)
  assert.doesNotMatch(source, /getTranslations\("audit"\)/)
  assert.doesNotMatch(source, /`\$\{latestMovement\.title\}: \$\{latestMovement\.summary\}`/)
})

test("asset detail makes component management discoverable from custody and More", () => {
  const source = assetDetailSource()
  const thaiMessages = readFileSync("messages/th.json", "utf8")
  const englishMessages = readFileSync("messages/en.json", "utf8")

  assert.match(source, /href=\{componentsManagerHref\}/)
  assert.match(source, /\{t\("manageComponents"\)\}/)
  assert.match(thaiMessages, /"custody": "การถือครอง \/ ส่วนควบ"/)
  assert.match(englishMessages, /"custody": "Custody & Components"/)
})

test("asset detail exposes a read-only component summary and manager link", () => {
  const source = assetDetailSource()

  assert.match(source, /AssetComponentsSummary/)
  assert.match(source, /assets\/\$\{asset\.id\}\/components/)
  assert.doesNotMatch(source, /<AssetComponentsPanel/)
})

test("asset detail keeps a persistent context for assets installed under a parent", () => {
  const source = assetDetailSource()
  const contextBannerSource = readFileSync("src/components/assets/asset-component-context-banner.tsx", "utf8")

  assert.match(source, /AssetComponentContextBanner/)
  assert.match(source, /installedInLinks=\{installedInLinksForPanel\}/)
  assert.ok(source.indexOf("<AssetComponentContextBanner") < source.indexOf("<AssetDetailTabs"))
  assert.match(source, /title: t\("componentContextTitle"\)/)
  assert.match(source, /openParent: t\("componentContextOpenParent"\)/)
  assert.match(contextBannerSource, /if \(installedInLinks\.length === 0\) return null/)
  assert.match(contextBannerSource, /ArrowRight/)
})

test("asset detail marks the custody tab with component count and missing serial warning", () => {
  const source = assetDetailSource()
  const tabsSource = readFileSync("src/components/assets/asset-detail-tabs.tsx", "utf8")

  assert.match(source, /const componentRelationshipCount = currentComponentsForPanel\.length \+ installedInLinksForPanel\.length/)
  assert.match(source, /const componentMissingSerialCount = currentComponentsForPanel\.filter\(\(component\) => !component\.componentAsset\.serialNumber\)\.length/)
  assert.match(source, /indicators=\{\{ custody: \{ count: componentRelationshipCount, hasWarning: componentMissingSerialCount > 0 \} \}\}/)
  assert.match(tabsSource, /AlertTriangle/)
  assert.match(tabsSource, /indicator\?\.count/)
  assert.match(tabsSource, /warningLabel/)
})

test("asset component parent links preserve context and label role metadata", () => {
  const source = assetDetailSource()
  const bannerSource = readFileSync("src/components/assets/asset-component-context-banner.tsx", "utf8")
  const summarySource = readFileSync("src/components/assets/asset-components-summary.tsx", "utf8")

  assert.match(source, /const currentAssetDetailHref = buildAssetDetailViewHref\(locale, asset\.id, assetDetailView, returnToHref\)/)
  assert.match(source, /parentHref: appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{component\.parentAsset\.id\}`, currentAssetDetailHref\)/)
  assert.match(source, /href: link\.parentHref/)
  assert.match(bannerSource, /parentHref: string/)
  assert.match(bannerSource, /roleLabel: string/)
  assert.match(bannerSource, /slotLabel: string/)
  assert.match(summarySource, /parentHref: string/)
  assert.match(summarySource, /roleLabel: string/)
  assert.match(summarySource, /slotLabel: string/)
})

test("asset edit does not mount another component installation editor", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx", "utf8")

  assert.doesNotMatch(source, /AssetComponentsPanel/)
  assert.doesNotMatch(source, /availableComponentAssets/)
})

test("asset detail avoids eager component inventory and bounds preview relations", () => {
  const source = assetDetailSource()

  assert.doesNotMatch(source, /installedComponentAssetIds/)
  assert.doesNotMatch(source, /availableComponentAssets/)
  assert.doesNotMatch(source, /take: 300/)
  assert.match(source, /checkouts:\s*\{[\s\S]*?take: loadPolicy\.checkoutLimit/)
  assert.match(source, /attachments:\s*\{[\s\S]*?take: 20/)
})
