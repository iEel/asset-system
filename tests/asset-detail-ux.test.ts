import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"
const assetDetailSource = () => read(page)
const DETAIL = "src/components/assets/detail/"

test("asset detail renders one tab navigation; the overview tab is canvas B and the other tabs keep their sections until their tasks (group 1 asset detail task 8)", () => {
  const source = assetDetailSource()
  assert.match(source, /<AssetDetailTabs\b/)
  assert.match(source, /\{assetDetailView === "overview" \? \(\s*<AssetOverview\b/)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "components"\)/)
  assert.doesNotMatch(source, /isAssetDetailSectionVisible\(assetDetailView, "(?:overview|specs|ownership|purchase|notes)"\)|sectionLinks\.map/)
})

test("asset detail asks the shared action rule and builds อื่น ๆ from it (spec §7.1)", () => {
  const source = assetDetailSource()
  assert.match(source, /hasPermission\(user, "asset", "edit"\)/)
  assert.match(source, /const actionInput: AssetActionInput = \{/)
  assert.match(source, /returnTo: currentAssetDetailHref,/)
  assert.match(source, /const assetActions = getAssetActions\(actionInput\)/)
  assert.match(source, /const moreGroups = buildAssetDetailMoreGroups\(\{/)
  assert.match(source, /label: tAll\(action\.labelKey\)/, "full message keys through the root translator (R2)")
  assert.doesNotMatch(source, /mobileActionCandidates|getAssetRegisterTransactionActions/)
})

test("asset detail's back link says where it returns (spec §7.2)", () => {
  assert.match(assetDetailSource(), /backLabel=\{isAssetScanReturn \? t\("backToScan"\) : registerParams \? tDetail\("backToResults"\) : tCommon\("back"\)\}/)
})

test("asset detail's meta row is the code, the status badge with its help and the S/N, with the identity test id; location and custodian are facts of the strip (spec §7.2, §7.4)", () => {
  const header = read(`${DETAIL}asset-detail-header.tsx`)
  assert.match(header, /<span data-testid="asset-identity-summary" className="contents">\s*<span className="tag">\{asset\.assetTag\}<\/span>/)
  assert.match(header, /<StatusBadge label=\{asset\.status\.nameTh\} tone=\{getAssetStateTone\(asset\.status\.name\)\} \/>/)
  assert.match(header, /\{t\("serialPrefix"\)\} <span className="tag">\{asset\.serialNumber\}<\/span>/)
  assert.doesNotMatch(header, /condition|MapPin|PackageCheck|<SummaryCard/)
})

test("asset detail has no follow-up panel, data health, quick actions or QR panel: their places are the primary, the tab counts, the strip and the empty prompts (spec §7.9)", () => {
  const source = assetDetailSource()
  assert.doesNotMatch(source, /activityFollowUpItems|asset-data-health-details|dataHealthItems|t\("quickActions"\)|lifecycle\.|qrValue/)
})

test("asset detail reaches component management from the components tab and อื่น ๆ (spec §7.1, §7.7)", () => {
  const source = assetDetailSource()
  const thaiMessages = JSON.parse(read("messages/th.json"))
  const englishMessages = JSON.parse(read("messages/en.json"))
  assert.match(source, /manageHref=\{canEditAsset \? componentsManagerHref : null\}/)
  assert.match(source, /manageComponents: canEditAsset \? \{ label: t\("manageComponents"\), href: componentsManagerHref \} : null,/)
  // componentsManagerHref is Task 7's (the manager returns to ?view=components with the detail's own returnTo, R22), pinned in tests/asset-detail-view.test.ts.
  assert.deepEqual(thaiMessages.asset.detailViews, { label: "ส่วนของทรัพย์สิน", overview: "ภาพรวม", history: "ประวัติ", components: "ส่วนควบ", files: "ไฟล์", maintenance: "ซ่อม / PM" })
  assert.deepEqual(englishMessages.asset.detailViews, { label: "Asset sections", overview: "Overview", history: "History", components: "Components", files: "Files", maintenance: "Repair / PM" })
})

test("a component names its parent in the strip's first fact, not in a banner (spec §7.4, §7.9)", () => {
  const source = assetDetailSource()
  assert.doesNotMatch(source, /AssetComponentContextBanner/)
  assert.match(source, /parent: installedInLinksForPanel\[0\]\?\.parentAsset \?\? null,/)
  assert.match(source, /parentHref=\{installedInLinksForPanel\[0\]\?\.parentHref \?\? null\}/)
  assert.match(read(`${DETAIL}asset-detail-fact-strip.tsx`), /t\("componentOf"\)/)
})

test("asset component parent links preserve context", () => {
  const source = assetDetailSource()
  assert.match(source, /const currentAssetDetailHref = buildAssetDetailViewHref\(locale, asset\.id, assetDetailView, returnToHref\)/)
  assert.match(source, /parentHref: appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{component\.parentAsset\.id\}`, currentAssetDetailHref\)/)
  assert.match(source, /href: link\.parentHref/)
})

test("asset detail header is PageHeader with the trail, the name, the back link and the actions; the old sections keep their shared parts (spec §7.2; spec 2B §4.4.5)", () => {
  const source = assetDetailSource()
  const header = read(`${DETAIL}asset-detail-header.tsx`)
  assert.match(header, /import \{ PageBackLink, PageHeader \} from "@\/components\/ui\/page-header"/)
  assert.match(header, /breadcrumbs=\{\[\s*\{ label: tAsset\("title"\), href: returnToHref \},\s*\.\.\.\(crumbLabel \? \[\{ label: crumbLabel \}\] : \[\]\),\s*\{ label: asset\.assetTag, code: true \},\s*\]\}\s*title=\{asset\.name\}/)
  assert.match(header, /back=\{<PageBackLink href=\{returnToHref\} label=\{backLabel\} \/>\}/)
  assert.doesNotMatch(source + header, /<h1\b|<thead\b|<Breadcrumbs\b|<ArrowLeft\b|formatCurrency|function (?:Info|SummaryStrip)\b|opacity-70|hidden md:inline-flex/)
  assert.match(source, /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/, "room for the ActionBar (2C plan 5, O11)")
  assert.doesNotMatch(source, /<DataTable framed=\{false\} caption=/)
  assert.doesNotMatch(source, /<StatStrip\b/)
  assert.doesNotMatch(source, /<KeyValueList\b/)
})

test("asset detail localizes audit activity and avoids duplicated activity titles", () => {
  const source = assetDetailSource()

  // Group 1 asset detail task 9: the history's audit words are Task 3's (auditItemResultKey), and the last audit's are
  // the fact strip's; the page keeps no audit labels of its own.
  const historyRules = read("src/lib/asset-history-rules.ts")
  assert.match(historyRules, /getAuditRoundItemStatusLabelKey/)
  assert.match(historyRules, /getAuditRoundItemResultLabelKey/)
  assert.match(read(`${DETAIL}asset-detail-fact-strip.tsx`), /Translations\("auditRound"\)/)
  assert.doesNotMatch(source, /formatAuditState|tFinding\b/)
  assert.doesNotMatch(source, /getTranslations\("audit"\)/)
  assert.doesNotMatch(source, /`\$\{latestMovement\.title\}: \$\{latestMovement\.summary\}`/)
})

test("asset detail's components tab is the relationship map with the manager link, without the summary panel", () => {
  const source = assetDetailSource()

  assert.match(source, /<AssetComponentsTab\b/)
  assert.match(source, /assets\/\$\{asset\.id\}\/components/)
  assert.doesNotMatch(source, /AssetComponentsSummary|<AssetComponentsPanel/)
  assert.equal(existsSync("src/components/assets/asset-components-summary.tsx"), false)
})

test("asset detail tabs count history, components, files and repairs, and warn on a missing component serial", () => {
  const source = assetDetailSource()
  const tabsSource = read("src/components/assets/asset-detail-tabs.tsx")

  assert.match(source, /const componentMissingSerialCount = currentComponentsForPanel\.filter\(\(component\) => !component\.componentAsset\.serialNumber\)\.length/)
  assert.match(source, /indicators=\{\{\s*history: \{ count: detailCounts\.history \},\s*components: \{ count: detailCounts\.components, hasWarning: componentMissingSerialCount > 0 \},\s*files: \{ count: detailCounts\.files \},\s*maintenance: \{ count: detailCounts\.repairs \},?\s*\}\}/)
  assert.doesNotMatch(source, /componentRelationshipCount/)
  assert.match(tabsSource, /AlertTriangle/)
  assert.match(tabsSource, /indicator\?\.count/)
  assert.match(tabsSource, /warningLabel/)
})

test("asset edit does not mount another component installation editor", () => {
  const source = read("src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx")

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
