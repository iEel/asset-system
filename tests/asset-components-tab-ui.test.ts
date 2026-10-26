import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const MAP = "src/components/assets/detail/asset-relationship-map.tsx"
const TAB = "src/components/assets/detail/asset-components-tab.tsx"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"

test("the relationship map moved as it was, with an actions slot (spec §7.7, plan 2D-2 R2/R3)", () => {
  const map = read(MAP)
  assert.doesNotMatch(map, /"use client"|getTranslations|useTranslations/, "server-safe; the labels come from the tab")
  assert.match(map, /export function AssetRelationshipMap\(/)
  assert.match(map, /export type RelationshipLink = \{ id: string; href: string; label: string; role: string \}/)
  assert.match(map, /<ContentPanel title=\{title\} description=\{subtitle\} actions=\{actions\}>/)
  assert.match(map, /<Notice tone="neutral" className="mt-4">\{noteLabel\}<\/Notice>/)
  assert.match(map, /<Chip>\{roleLabel\}<\/Chip>/)
  assert.match(map, /<div className="font-mono text-sm font-medium leading-5 text-foreground \[overflow-wrap:anywhere\]">\{relationshipAsset\.assetTag\}<\/div>/, "a tag that must wrap keeps font-mono at 500 (2D-2 R3)")
  assert.doesNotMatch(map, /getRelationship(?:Summary|Badge|Icon)Class|uppercase|border-dashed|hover:underline|primary-soft|\btext-xs\b|"-"/)
})

test("the components tab: the map with the custodian on the current card and the manager link for editors, then the install and remove history (spec §7.7)", () => {
  const tab = read(TAB)
  assert.doesNotMatch(tab, /"use client"/)
  assert.match(tab, /export async function AssetComponentsTab\(/)
  assert.match(tab, /<div id="components" className="scroll-mt-24 space-y-6">/)
  assert.match(tab, /currentMetaLabel=\{t\("custodian"\)\}/)
  assert.match(tab, /currentMetaValue=\{asset\.custodianName \?\? t\("noCustodian"\)\}/)
  assert.doesNotMatch(tab, /currentMetaLabel=\{t\("category"\)\}/)
  assert.match(tab, /manageHref \? \(\s*<Link href=\{manageHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\s*<PackagePlus aria-hidden="true" \/>\s*\{t\("manageComponents"\)\}/)
  assert.match(tab, /t\("componentsTab\.roleWithSlot", \{ role: \w+\.role, slot: \w+\.slotNo \}\)/)
  assert.equal(tab.match(/\?\? "-"/g)?.length, 2, "only the parent's tag in the two relationship summaries (LV2 row)")
  assert.match(tab, /<ContentPanel divided flush title=\{t\("componentsTab\.historyTitle"\)\}>/)
  assert.match(tab, /<EmptyNote padded>\{t\("componentsTab\.historyEmpty"\)\}<\/EmptyNote>/)
  assert.match(tab, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("componentsTab\.historyTitle"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(tab, /<ContentPanelRows className="md:hidden">/)
  assert.match(tab, /assetComponentHistoryColumn\(history\)/)
  assert.match(tab, /formatAssetDetailDate\(event\.at, locale\)/, "the detail page's one date formatter (R37)")
  assert.match(tab, /tAll\(assetMovementLabelKey\(event\.kind\)\)/)
  assert.match(tab, /event\.other\.isActive \?/)
  assert.match(tab, /event\.document && documentAccess\[event\.document\.kind\]/)
  assert.match(tab, /buildAssetMovementDocumentHref\(locale, event\.document\)/)
})

test("the history reads both sides of every link once, and its documents once per kind (spec §5 Performance)", () => {
  const history = read("src/lib/asset-component-history.ts")
  assert.match(history, /export async function getAssetComponentHistory\(assetId: string\): Promise<AssetComponentHistoryEvent\[\]>/)
  assert.match(history, /prisma\.assetComponent\.findMany\(\{\s*where: \{ OR: \[\{ parentAssetId: assetId \}, \{ componentAssetId: assetId \}\] \}/)
  assert.match(history, /const documentOf = await resolveAssetMovementDocuments\(rows\)/)
  assert.match(history, /return buildAssetComponentHistory\(rows, assetId, documentOf\)/)
  assert.doesNotMatch(history, /\.(create|update|upsert|delete)(Many)?\(/)
})

test("the page passes what it loaded, gates the manager link, and keeps no summary panel (spec §7.7, §7.9)", () => {
  const page = read(PAGE)
  assert.match(page, /<AssetComponentsTab\b/)
  assert.match(page, /manageHref=\{canEditAsset \? componentsManagerHref : null\}/)
  assert.match(page, /custodianName: asset\.custodian\?\.fullNameTh \?\? null/)
  assert.match(page, /withPerformanceTiming\("asset-detail\.components-tab", \(\) => getAssetComponentHistory\(asset\.id\)/)
  assert.doesNotMatch(page, /AssetComponentsSummary|function AssetRelationshipMap|function RelationshipAssetCard|formatLicenseRelationshipRole/)
  assert.equal(existsSync("src/components/assets/asset-components-summary.tsx"), false)
})

test("the components tab's words (spec §7.7; glossary)", () => {
  const th = JSON.parse(read("messages/th.json")).asset
  assert.equal(th.custodian, "ผู้ถือครอง")
  assert.deepEqual(th.componentsTab, {
    historyTitle: "ประวัติการติดตั้ง / ถอด",
    columnDate: "วันที่",
    columnEvent: "เหตุการณ์",
    columnComponent: "ส่วนควบ",
    columnParent: "ทรัพย์สินหลัก",
    columnRelated: "ทรัพย์สินที่เกี่ยวข้อง",
    columnNote: "หมายเหตุ",
    historyEmpty: "ยังไม่เคยติดตั้งหรือถอดส่วนควบ",
    roleWithSlot: "{role} · ช่อง {slot}",
  })
})
