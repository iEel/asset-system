import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PANEL = "src/components/assets/asset-history-panel.tsx"
const TAB = "src/components/assets/detail/asset-history-tab.tsx"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"
const assetWords = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).asset

test("the history panel: radio chips with counts that filter in place, the period select, a month-grouped table, phone cards and 50 rows at a time (spec §7.6)", () => {
  const source = read(PANEL)
  assert.ok(source.startsWith('"use client"'))
  assert.match(source, /const t = useTranslations\("asset"\)/)
  assert.match(source, /const tCommon = useTranslations\("common"\)/)
  assert.match(source, /<fieldset className="min-w-0">\n\s+<legend className="sr-only">\{t\("history\.typeLegend"\)\}<\/legend>/)
  assert.match(source, /<ChoiceChip\s[\s\S]*?type="radio"[\s\S]*?detail=\{formatCount\(/)
  assert.match(source, /label=\{t\("movementFilters\.all"\)\}/, "ทั้งหมด is the existing word (R14)")
  assert.match(source, /label=\{t\(`history\.types\.\$\{category\}`\)\}/)
  assert.match(source, /visibleAssetHistoryChips\(counts, initialType\)/)
  assert.match(source, /<FilterSelect\s[\s\S]*?label=\{t\("history\.period"\)\}[\s\S]*?fieldSize="md"/)
  assert.match(source, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("history\.title"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  for (const column of ["at", "event", "detail", "actor", "document"]) assert.ok(source.includes(`t("history.columns.${column}")`), column)
  assert.doesNotMatch(source, /t\("history\.columns\.type"\)/, "the event's own label is headed รายการ (R49); ประเภท is the chip word")
  assert.match(source, /<DataTableGroupRow colSpan=\{5\}>\{group\.monthLabel\}<\/DataTableGroupRow>/)
  assert.match(source, /<TableEmptyRow colSpan=\{5\}>\{t\("history\.emptyFiltered"\)\}<\/TableEmptyRow>/)
  assert.match(source, /<time dateTime=\{row\.atIso\}>/)
  assert.equal(source.match(/<Link href=\{row\.document\.href\}/g)?.length, 2, "the table's code and the phone card")
  assert.match(source, /<div className="md:hidden">/)
  assert.match(source, /pageAssetHistoryRows\(/)
  assert.match(source, /<Button variant="outline"[\s\S]*?\{t\("history\.showMore", \{ count: formatCount\(remaining\) \}\)\}/)
  assert.match(source, /aria-live="polite"/)
  assert.doesNotMatch(source, /historyTab|useRouter|router\.|window\.history|useSearchParams|<button\b|"-"|toLocaleString|formatDateTime|new Date\(/, "a chip never navigates, and dates come from the server")
})

test("the history tab: rows built on the server in Bangkok time, the panel inside a divided panel, the export for the desktop (spec §7.6)", () => {
  const source = read(TAB)
  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /export async function AssetHistoryTab\(/)
  assert.match(source, /buildAssetHistoryRows\(history\.events, \{ locale, now: new Date\(\), access: documentAccess, label: \(key\) => tAll\(key\) \}\)/)
  assert.match(source, /<ContentPanel\s+divided\s+flush\s+title=\{t\("history\.title"\)\}/)
  assert.match(source, /<a href=\{buildAssetHistoryExportHref\(locale, assetId\)\} download className=\{cn\(buttonVariants\(\{ variant: "outline", size: "md" \}\), "max-md:hidden"\)\}>/)
  assert.match(source, /<AssetHistoryPanel rows=\{rows\} total=\{history\.total\} counts=\{history\.counts\} capped=\{history\.capped\} initialType=\{initialType\} \/>/)
  assert.doesNotMatch(source, /\bid=/, "a tab link carries no anchor, and the history has no section id (R22)")
})

test("the page loads the whole history only on its tab, and the old timeline is gone (spec §7.6, §7.9)", () => {
  const source = read(PAGE)
  assert.match(source, /withPerformanceTiming\("asset-detail\.history-tab", \(\) => getAssetHistory\(asset\.id, locale, \{ filesHref: /)
  assert.match(source, /const documentAccess = assetDocumentAccess\(\(module, action\) => hasPermission\(user, module, action\)\)/)
  assert.doesNotMatch(source, /ASSET_MOVEMENT_DOCUMENT_PERMISSION/, "one access record for the overview and the tabs")
  assert.match(source, /parseAssetHistoryType\(rawSearchParams\.type\) \?\? historyType/, "an explicit ?type= wins over view=audit (R17)")
  assert.match(source, /<AssetHistoryTab\b/)
  assert.doesNotMatch(source, /AssetMovementTimeline|knownMovementTypeKeys|getMovement(?:Title|Summary|Tone|Category)\b|build(?:Purchase|Component|Maintenance|Audit)TimelineItems|unifiedTimelineItems|getMovementDisplayLabels|id="movement"|id="audit"|formatAuditState|latestAuditItem|loadPolicy\.(?:movement|auditItem)Limit/)
  assert.equal(existsSync("src/components/assets/asset-movement-timeline.tsx"), false)
})

test("a month group row is a rowgroup header with no fill and no capitals, and the docs say so (DESIGN.md Data Tables)", () => {
  const table = read("src/components/ui/data-table.tsx")
  assert.match(table, /export function DataTableGroupRow\(\{ colSpan, className, children \}: \{ colSpan: number; className\?: string; children: React\.ReactNode \}\)/)
  assert.match(table, /<tr data-slot="data-table-group-row">\n\s+<th scope="rowgroup" colSpan=\{colSpan\} className=\{cn\(dataTableGroupHeadClasses, className\)\}>/)
  const classes = table.match(/const dataTableGroupHeadClasses = "([^"]+)"/)?.[1] ?? ""
  assert.match(classes, /first:pl-4/)
  assert.doesNotMatch(classes, /\bbg-|uppercase/)
  assert.ok(read("DESIGN.md").includes("- **Group rows:** `DataTableGroupRow`"))
  assert.ok(read("docs/14_UI_UX_DESIGN_SYSTEM.md").includes("`DataTableGroupRow`"))
  assert.ok(read(".impeccable/design.json").includes("DataTableGroupRow"))
})

test("the history tab's words, in the one asset.history namespace (spec §7.6; R14; glossary)", () => {
  const th = assetWords("th")
  const en = assetWords("en")
  assert.equal("historyTab" in th, false)
  assert.equal(th.movementFilters.all, "ทั้งหมด")
  assert.deepEqual(th.history.types, { checkout: "ส่งมอบ", checkin: "รับคืน", transfer: "โอนย้าย", audit: "ตรวจนับ", repair: "ซ่อม", disposal: "ตัดจำหน่าย", component: "ส่วนควบ", edit: "แก้ไขข้อมูล" })
  assert.deepEqual(["at", "event", "detail", "actor", "document"].map((key) => th.history.columns[key]), ["วันที่ เวลา", "รายการ", "รายละเอียด", "ผู้บันทึก", "เอกสาร"])
  assert.equal(th.history.title, "ประวัติทั้งหมด")
  assert.equal(th.history.period, "ช่วงเวลา")
  assert.equal(th.history.periodYear, "12 เดือนล่าสุด")
  assert.equal(th.history.export, "ส่งออก Excel")
  assert.equal(th.history.showMore, "แสดงเพิ่ม (เหลือ {count} รายการ)")
  assert.equal(en.history.showMore, "Show more ({count} left)")
})

test("an audit row's ดูรูป: a link beside the round code on the desktop and below the phone card, named with the round (audit photos spec §6)", () => {
  const source = read(PANEL)
  const links = source.match(/<Link\s+href=\{row\.photosHref\}\s+aria-label=\{t\("history\.viewPhotosLabel", \{ auditNo: row\.photosAuditNo \?\? "" \}\)\}/g)
  assert.equal(links?.length, 2, "the table and the phone card")
  assert.equal(source.match(/\{t\("history\.viewPhotos"\)\}/g)?.length, 2)
  assert.equal(source.match(/\{row\.photosHref \? \(/g)?.length, 2, "rows without photos show no link")
  assert.ok(source.includes(") : row.photosHref ? null : (\n                      <Nil />"), "a row with only ดูรูป shows no dash beside it")
  // On the phone the card itself may be the round's link, so ดูรูป sits after it, never inside it.
  assert.match(source, /<\/Link>\n\s+\) : \(\n\s+<div className=\{row\.photosHref \? undefined : "min-h-14"\}>\{card\}<\/div>\n\s+\)\}\n\s+\{row\.photosHref \? \(/)
  const th = assetWords("th")
  const en = assetWords("en")
  assert.equal(th.history.viewPhotos, "ดูรูป")
  assert.equal(th.history.viewPhotosLabel, "ดูรูป {auditNo}")
  assert.equal(en.history.viewPhotos, "View photos")
  assert.equal(en.history.viewPhotosLabel, "View photos {auditNo}")
})

// Phone polish 2: on the phone ดูรูป reads as part of its row (about 6px under the meta line), not 30px below it. The
// card link above it stops at the meta line instead of reaching into the row's bottom padding, so the 44px ดูรูป target
// starts right under it without overlapping it; the text sits at the top of that target and the target takes the row's
// bottom padding (-mb-3). A row without a document gets the same: its plain card drops the min height when ดูรูป follows.
test("the phone ดูรูป sits just under the meta line with a 44px target that does not overlap the card link (phone polish 2)", () => {
  const source = read(PANEL)
  assert.match(source, /const phoneCardLinkClasses =\n\s+"-mx-4 -my-3 block min-h-14 px-4 py-3 /, "a row without ดูรูป keeps its card link as before")
  const abovePhotos = source.match(/const phoneCardLinkAbovePhotosClasses =\n\s+"([^"]+)"/)?.[1] ?? ""
  assert.match(abovePhotos, /^-mx-4 -mt-3 block px-4 pt-3 /)
  assert.doesNotMatch(abovePhotos, /-my-3|-mb-|pb-|py-|min-h-/)
  assert.match(source, /<Link href=\{row\.document\.href\} className=\{row\.photosHref \? phoneCardLinkAbovePhotosClasses : phoneCardLinkClasses\}>/)
  assert.match(source, /className=\{cn\(linkVariants\(\), "-mb-3 flex min-h-11 w-fit items-start pt-1\.5"\)\}/)
  assert.doesNotMatch(source, /row\.document && "mt-3"/)
})
