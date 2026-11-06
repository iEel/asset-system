import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 8 plan 2 Task 1: the categories list on board MD-Categories (spec §3, §6) with plan 1's shared list pattern, and
// what spec §8 keeps. Sources are read with \r stripped, so a regex here may hold \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/master-data/categories/page.tsx")
type Messages = { category: Record<string, unknown> & { list: Record<string, string>; deactivate: Record<string, unknown>; reactivate: Record<string, string> } }
const th = JSON.parse(read("messages/th.json")) as Messages
const en = JSON.parse(read("messages/en.json")) as Messages

test("categories: the record-status segmented control with counts; the status column only under ทั้งหมด (spec §3)", () => {
  assert.match(page, /readRecordStatusCounts\(prisma\.assetCategory, recordStatusCountWheres\(listState, buildWhere\)\)/)
  assert.match(page, /<RecordStatusSegmented value=\{listState\.status\} counts=\{recordStatusCounts\} hrefFor=\{\(status\) => listHref\(\{ status, page: 1 \}\)\} \/>/)
  assert.match(page, /\{listState\.status !== "active" \? <input type="hidden" name="status" value=\{listState\.status\} \/> : null\}/, "a search keeps the status")
  assert.doesNotMatch(page, /<FilterSelect\s+label=\{tCommon\("status"\)\}/, "the status select is gone")
  assert.match(page, /const showRecordStatus = listState\.status === "all"/)
  assert.match(page, /\{showRecordStatus \? <DataTableHead>\{tCommon\("status"\)\}<\/DataTableHead> : null\}/)
  assert.match(page, /tCommon\("recordStatus\.footerCounts", \{ active: recordStatusCounts\.active, inactive: recordStatusCounts\.inactive \}\)/)
  assert.match(page, /t\("list\.totals", \{ models: footerTotals\.models, assets: footerTotals\.assets \}\)/, "the footer's รุ่นรวม · ทรัพย์สินรวม over the filtered set")
  assert.match(page, /categoryFooterTotalWheres\(where\)/)
  assert.match(page, /<p>\{t\("list\.countsNote"\)\}<\/p>/)
})

test("categories: the five health filters kept, with every sort in a เรียงตาม / ลำดับ select; the form keyed on the list's query (spec §6, §8)", () => {
  for (const name of ["assetUsage", "modelStatus", "customFieldStatus", "checklistStatus", "prefixStatus"]) {
    assert.match(page, new RegExp(`name="${name}"`), name)
  }
  assert.match(page, /options=\{categorySorts\.map\(\(sort\) => \(\{ value: sort, label: sortLabel\(sort\) \}\)\)\}/)
  assert.match(page, /name="direction"/)
  assert.match(page, /<form key=\{categoryReturnHref\} role="search" action=\{basePath\}/)
  assert.match(page, /placeholder=\{t\("searchPlaceholder"\)\}/, "the description stays searchable (the placeholder says so)")
  assert.doesNotMatch(page, /category\.description/, "the description column is gone")
  for (const sort of ["name", "models", "assets", "customFields"]) {
    assert.match(page, new RegExp(`sort=\\{sortBy\\("${sort}"\\)\\}`), sort)
  }
})

test("categories: the board's cards — total with the model and asset totals, and the prefix card's link to the settings (spec §6)", () => {
  assert.match(page, /foot: t\("list\.totals", \{ models: healthSummary\.modelTotal, assets: healthSummary\.assetTotal \}\)/)
  assert.match(page, /href: listHref\(\{ prefixStatus: "withoutPrefix", page: 1 \}\)/, "the card still filters")
  assert.match(page, /const canViewSettings = hasPermission\(user, "setting", "view"\)/)
  assert.match(page, /<Link href=\{prefixSettingsHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "relative z-10"\)\}>\s*\{t\("list\.prefixSettingsLink"\)\}/)
  assert.match(page, /const prefixSettingsHref = buildCategoryPrefixSettingsHref\(locale\)/)
  assert.equal(th.category.summaryTotal, "หมวดหมู่ทั้งหมด (ใช้งาน)")
  assert.equal(th.category.list.totals, "รุ่นรวม {models, number} · ทรัพย์สินรวม {assets, number}")
  assert.equal(th.category.summaryMissingPrefixHelp, "ระบบใช้รหัสหมวดหมู่แทน")
  assert.equal(th.category.list.prefixSettingsLink, "ตั้งในการตั้งค่า ›")
})

test("categories: name first with the code under it; the prefix, ข้อมูลเพิ่ม and รูปที่ต้องถ่าย columns with the board's words (spec §6)", () => {
  assert.match(page, /<DataTableHead sort=\{sortBy\("name"\)\}>\{t\("name"\)\}<\/DataTableHead>/)
  assert.match(page, /\{deactivatedLine \? <> · \{deactivatedLine\}<\/> : null\}/, "· ปิดใช้งานเมื่อ {date} beside the code")
  assert.match(page, /<StatusBadge label=\{t\("list\.prefixMissing"\)\} tone="warning" \/>/)
  assert.match(page, /t\("list\.prefixFallback", \{ code: category\.code \}\)/)
  assert.match(page, /t\("list\.prefixSharedWith", \{ names: prefixCell\.sharedWith\.join\(", "\) \}\)/)
  assert.match(page, /buildCategoryPrefixCells\(prefixSetting\?\.value, categories\.map\(\(category\) => category\.id\), prefixNames\)/)
  assert.match(page, /t\("list\.customFieldCount", \{ count: category\._count\.customFieldDefs \}\)/)
  assert.match(page, /t\("list\.photoCount", \{ count: photoCount \}\)/)
  assert.equal(th.category.list.prefixMissing, "ยังไม่ตั้ง")
  assert.equal(th.category.list.prefixFallback, "ใช้ {code} แทน")
  assert.equal(th.category.list.prefixSharedWith, "ใช้ร่วมกับ {names}")
  assert.equal(th.category.list.customFieldCount, "{count, number} ช่อง")
  assert.equal(th.category.list.photoCount, "{count, number} รายการ")
  assert.equal(th.category.list.none, "ยังไม่มี")
  assert.match(en.category.list.customFieldCount, /^\{count, plural, one \{# field\} other \{# fields\}\}$/)
  assert.match(en.category.list.photoCount, /^\{count, plural, one \{# item\} other \{# items\}\}$/)
})

test("categories: an inactive row reads ปิดใช้งานเมื่อ {date} from the system log, or – (G8P1-R2)", () => {
  assert.match(page, /readDeactivatedAt\(\n\s+prisma,\n\s+"category",\n\s+categories\.filter\(\(category\) => !category\.isActive\)\.map\(\(category\) => category\.id\)\n\s+\)/)
  assert.match(page, /tCommon\("recordStatus\.deactivatedAt", \{ date: at \? formatDeactivatedAt\(at, locale\) : "–" \}\)/)
})

test("categories ⋯: แก้ไข, ดูรุ่น ({n}), ดูทรัพย์สิน ({n}), the prefix in the settings, ปิดใช้งาน with the reason / เปิดใช้งาน (spec §3, §6)", () => {
  assert.match(page, /const canDeactivate = hasPermission\(user, "category", "delete"\)/)
  assert.match(page, /const canEdit = hasPermission\(user, "category", "edit"\)/)
  assert.match(page, /const canCreate = hasPermission\(user, "category", "create"\)/)
  // The models drilldown opens the brands page (brand:view); the asset register needs asset:view.
  assert.match(page, /const canViewModels = hasPermission\(user, "brand", "view"\)/)
  assert.match(page, /const canViewAssets = hasPermission\(user, "asset", "view"\)/)
  assert.match(page, /links: \[\n\s+\.\.\.\(canEdit \? \[\{ key: "edit", label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\] : \[\]\),/)
  assert.match(page, /label: t\("list\.viewModels", \{ count: category\._count\.models \}\), href: drilldown\.models/)
  assert.match(page, /label: t\("list\.viewAssets", \{ count: category\._count\.assets \}\), href: drilldown\.assets/)
  assert.match(page, /prefixCell\.prefix \? t\("list\.prefixInSettings", \{ prefix: prefixCell\.prefix \}\) : t\("list\.setPrefixInSettings"\)/)
  // The reason is the DELETE route's: every model and asset of the category counts (getCategoryDeleteBlockReason).
  assert.match(page, /blocked: getCategoryDeleteBlockReason\(blockCounts\.get\(category\.id\) \?\? \{ assets: 0, models: 0 \}\)/)
  assert.match(page, /_count: \{ select: \{ assets: true, models: true \} \}/)
  assert.match(page, /chunkListIds\(sharedIds\)\.map\(/, "the shared-prefix names are read in id chunks of 2,000")
  assert.match(page, /canEdit && !category\.isActive\n\s+\? \{\n\s+endpoint,\n\s+labels: \{/)
  assert.match(page, /\{reactivate \? <MasterDataReactivateButton reactivate=\{reactivate\} \/> : null\}/)
  assert.match(page, /<MasterDataRowActions\n/)
  assert.doesNotMatch(page, /deleteAction=|next=/)
  assert.equal(th.category.list.viewModels, "ดูรุ่น ({count, number})")
  assert.equal(th.category.list.viewAssets, "ดูทรัพย์สิน ({count, number})")
  assert.equal(th.category.list.prefixInSettings, "คำนำหน้ารหัส {prefix} ในการตั้งค่า")
  assert.equal(th.category.deactivate.action, "ปิดใช้งาน")
  assert.equal(th.category.reactivate.action, "เปิดใช้งาน")
})

test("categories: without category:edit a plain row; counts link only with brand:view / asset:view; เพิ่มหมวดหมู่ only with category:create; export and template kept", () => {
  assert.match(page, /return canEdit \? \(\n\s+<ClickableTableRow key=\{category\.id\} href=\{editHref\} label=\{`\$\{tCommon\("edit"\)\}: \$\{category\.code\}`\}>\n\s+\{cells\}\n\s+<\/ClickableTableRow>\n\s+\) : \(\n\s+<DataTableRow key=\{category\.id\}>\{cells\}<\/DataTableRow>\n\s+\)/)
  assert.match(page, /\{canViewModels && category\._count\.models > 0 \? \(/)
  assert.match(page, /\{canViewAssets && category\._count\.assets > 0 \? \(/)
  assert.match(page, /\{canCreate \? \(\n\s+<Link href=\{appendMasterDataReturnTo\(`\/\$\{locale\}\/master-data\/categories\/new`, categoryReturnHref\)\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{t\("createTitle"\)\}/)
  assert.match(page, /<a href="\/api\/categories\/export" download/)
  assert.match(page, /<a href="\/api\/categories\/import-template" download/)
  assert.match(page, /previousHref=\{listHref\(\{ page: listState\.page - 1 \}\)\}/)
  assert.match(page, /actionHref: basePath, actionLabel: t\("clearFilters"\)/)
})
