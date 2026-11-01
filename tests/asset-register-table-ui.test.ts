import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const rowActions = () => read("src/components/assets/asset-register-row-actions.tsx")
const table = () => read("src/components/assets/asset-register-table.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("row actions show the shared rule's primary as the next step and its other transactions in ⋯ (group 1 spec §7.1)", () => {
  const source = rowActions()
  // Plan 2B-3 Task 2 (spec 2B I5): the menu, the phone sheet and the delete confirm moved into the shared RowActions,
  // so their pins read ui/row-actions.tsx. The wrapper keeps the register's rules: next step, order, permissions, reasons.
  const shared = read("src/components/ui/row-actions.tsx")

  assert.match(source, /const transactionItems: RowActionItem\[\] = \[\.\.\.\(variant === "mobile" && actions\.primary \? \[actions\.primary\] : \[\]\), \.\.\.actions\.transactions\]\.map\(toItem\)/, "a phone row has no next-step slot, so the primary leads its sheet")
  assert.doesNotMatch(source, /getRowNextAction|asset-operation-policy|transactionLabelKeys|reasonLabelKeys/, "the words and the reasons come from the rule")
  assert.match(source, /const tAll = useTranslations\(\)/, "the rule's keys are full keys, read through the root translator")
  assert.match(source, /<RowActions\b/)
  assert.match(shared, /<DropdownMenuTrigger asChild>/)
  assert.match(shared, /<DropdownMenuContent data-no-row-click/)
  assert.match(shared, /<SheetTrigger asChild>/)
  assert.match(shared, /<SheetContent\s+side="bottom"/)
  assert.match(source, /deleteAction=\{permissions\.canDelete \? \{ endpoint: `\/api\/assets\/\$\{assetId\}` \} : undefined\}/)
  assert.match(shared, /useDeleteAction\([\s\S]*?\{ returnFocusRef: triggerRef \}\)/)
  assert.match(shared, /variant="destructive"/)
  assert.match(source, /permissions\.canEdit \?/)
  assert.match(source, /permissions\.canCreate \?/)
  assert.match(source, /permissions\.canDelete \?/)
  assert.match(source, /reason: action\.reasonKey \? tAll\(action\.reasonKey\) : ""/)
  assert.match(shared, /size="icon-sm"/, "⋯ is 32px from md and 44px below")
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener/)
})

test("the desktop table uses the row actions instead of four icon buttons", () => {
  const source = table()

  assert.match(source, /<AssetRegisterRowActions\s+variant="desktop"/)
  assert.match(source, /permissions=\{permissions\}/)
  assert.doesNotMatch(source, /<AssetRegisterTransactionMenu actions=\{asset\.transactions\} labels=\{transactionLabels\} \/>/)
  assert.doesNotMatch(source, /title=\{labels\.detail\}/)
})

test("row action copy exists in Thai and English", () => {
  assert.equal(messages("th").rowActionCheckout, "ส่งมอบ")
  assert.equal(messages("th").rowActionCheckin, "รับคืน")
  assert.equal(messages("th").rowActionTransfer, "โอนย้าย")
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).rowActionsMenu, "string", locale)
  }
})

const sortMenu = () => read("src/components/assets/asset-register-sort-menu.tsx")
const columnPicker = () => read("src/components/assets/asset-register-column-picker.tsx")
const exportMenu = () => read("src/components/assets/asset-register-export-menu.tsx")

test("sorting is a radio menu that applies through the shared navigation", () => {
  const source = sortMenu()

  assert.match(source, /<DropdownMenuRadioGroup value=\{activeKey \?\? ""\}/)
  assert.match(source, /navigate\(\{ sort: option\.sort, direction: option\.direction \}\)/)
  // Spec 2B §7.8.6, I26: ghost below md (no frame in the 44px summary bar), the outline variant's colors from md.
  assert.match(source, /<Button\b[\s\S]*?variant="ghost"[\s\S]*?size="md"[\s\S]*?md:border-control-border/)
  assert.match(source, /className="md:border-control-border md:bg-surface md:text-foreground md:hover:border-input md:hover:bg-background md:active:border-input md:active:bg-muted"/)
  assert.match(source, /aria-label=\{`\$\{t\("sortMenu"\)\}: \$\{activeLabel\}`\}/)
  assert.match(source, /<span className="hidden text-muted-foreground md:inline">\{t\("sortMenu"\)\}:<\/span>/)
  assert.doesNotMatch(source, /<button\b|min-h-11|hover:bg-accent/, "the trigger is the shared Button, not a hand-written button (N5)")
})

test("the column picker keeps presets and at least one column, and stays open while toggling", () => {
  const source = columnPicker()

  assert.match(source, /<DropdownMenuRadioGroup value=\{activePreset\}/)
  assert.match(source, /<DropdownMenuCheckboxItem/)
  assert.match(source, /disabled=\{checked && visibleColumns\.size === 1\}/)
  assert.match(source, /onSelect=\{\(event\) => event\.preventDefault\(\)\}/)
  for (const key of ["columnPresetAll", "columnPresetOperations", "columnPresetAccounting", "columnPresetAudit"]) {
    assert.match(source, new RegExp(key))
  }
})

test("export choices are plain download links in a menu", () => {
  const source = exportMenu()

  assert.match(source, /<a href=\{exportHref\}/)
  assert.match(source, /<a href=\{templateHref\}/)
})

// Group 4 plan 1 Task 4 (spec §6.3): the menu is "ส่งออก / นำเข้า" in the page header. Export with the register's count;
// the template and นำเข้าจาก Excel (a link to the import-export page) only when the page gives them (asset:create).
test("the export menu is ส่งออก / นำเข้า: the filtered export with its count, the template and the import link (group 4 spec §6.3)", () => {
  const source = exportMenu()

  assert.match(source, /^export function AssetRegisterExportMenu\(\{ exportHref, exportCount, templateHref, importHref \}: \{ exportHref: string; exportCount: number; templateHref\?: string; importHref\?: string \}\) \{$/m)
  assert.match(source, /<a href=\{exportHref\} download>\n\s+<FileDown aria-hidden="true" \/>\n\s+\{t\("exportFilteredCount", \{ count: formatCount\(exportCount\) \}\)\}/)
  assert.match(source, /\{templateHref \? \(\n\s+<DropdownMenuItem asChild>\n\s+<a href=\{templateHref\} download>/)
  assert.match(source, /\{importHref \? \(\n\s+<DropdownMenuItem asChild>\n\s+<Link href=\{importHref\}>\n\s+<Upload aria-hidden="true" \/>\n\s+\{t\("importFromExcel"\)\}/)
  assert.doesNotMatch(source, /t\("exportMenu"\)|t\("exportFiltered"\)/)
  for (const [locale, words] of [["th", ["ส่งออก / นำเข้า", "ส่งออกตามตัวกรอง ({count} รายการ)", "นำเข้าจาก Excel"]], ["en", ["Export / import", "Export filtered ({count} items)", "Import from Excel"]]] as const) {
    assert.deepEqual([messages(locale).exportImportMenu, messages(locale).exportFilteredCount, messages(locale).importFromExcel], words, locale)
  }
})

test("the register header holds ส่งออก / นำเข้า (from md) and เพิ่มทรัพย์สิน; the table bar no longer has the export menu (group 4 spec §6.3)", () => {
  const page = read("src/app/[locale]/(dashboard)/assets/page.tsx")

  assert.match(page, /actions=\{\(\n\s+<>\n\s+\{\/\* [^\n]* \*\/\}\n\s+<div className="hidden md:flex">\n\s+<AssetRegisterExportMenu\n\s+exportHref=\{`\/api\/assets\/export\?\$\{buildAssetQueryString\(filters\)\}`\}\n\s+exportCount=\{total\}\n\s+templateHref=\{canCreateAssets \? "\/api\/assets\/import-template" : undefined\}\n\s+importHref=\{canCreateAssets \? `\/\$\{locale\}\/asset-management\/import-export` : undefined\}\n\s+\/>\n\s+<\/div>\n\s+\{canCreateAssets \? \(\n\s+<Link href=\{`\/\$\{locale\}\/assets\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{t\("createTitle"\)\}/)
  assert.doesNotMatch(page, /tCommon\("create"\)/)
  assert.equal(messages("th").createTitle, "เพิ่มทรัพย์สิน")
  assert.doesNotMatch(table(), /AssetRegisterExportMenu/)
})

test("the footer offers 10, 25, 50 and 100 rows per page; the filter sheet keeps its page size (group 4 spec §6.3)", () => {
  const source = table()

  assert.match(source, /<Pagination\n\s+page=\{filters\.page\}\n\s+totalPages=\{totalPages\}\n\s+pageSize=\{filters\.pageSize\}\n\s+pageSizes=\{\[10, 25, 50, 100\]\.map\(\(pageSize\) => \(\{ value: pageSize, href: `\/\$\{locale\}\/assets\?\$\{buildAssetQueryString\(filters, \{ pageSize, page: 1 \}\)\}` \}\)\)\}/)
  assert.match(source, /pageSizeGroup: tCommon\("pageSizeLabel"\),\n\s+rowsPerPage: tCommon\("rowsPerPage"\),/)
  assert.match(read("src/components/assets/asset-register-filter-sheet.tsx"), /\{\[10, 25, 50, 100\]\.map\(\(pageSize\) => \(/)
})

test("the table summary uses the new menus, the shared pagination and announces loading", () => {
  const source = table()

  assert.match(source, /data-asset-register-summary/)
  assert.match(source, /<AssetRegisterSortMenu \/>/)
  assert.match(source, /<div className="hidden items-center gap-2 md:flex">\n\s+<AssetRegisterColumnPicker[^\n]*\/>\n\s+<\/div>/)
  assert.match(source, /<Pagination\b/)
  assert.match(source, /aria-busy=\{isPending\}/)
  assert.doesNotMatch(source, /function PaginationLink|downloadFile/)
})

test("summary and sort copy exists in Thai and English", () => {
  const keys = ["registerRange", "sortMenu", "sortNewest", "sortOldest", "sortTagAsc", "sortTagDesc", "sortNameAsc", "sortPurchaseDateDesc", "sortPriceDesc", "exportImportMenu"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
  assert.equal(messages("th").registerRange, "{from}–{to} จาก {total} รายการ")
})

test("the desktop table has fixed column widths that fit the default columns", () => {
  const source = table()

  assert.match(source, /className="w-full table-fixed/)
  assert.match(source, /style=\{\{ minWidth: getAssetRegisterTableMinWidth\(visibleColumnList\) \}\}/)
  assert.match(source, /<colgroup>/)
  assert.match(source, /assetRegisterColumnWidths\.select/)
  assert.match(source, /assetRegisterColumnWidths\.actions/)
  // Group 4 plan 1 Task 2 (P1-R3): the merged asset column is the flexible one.
  assert.match(source, /column === "asset" \? undefined : \{ width: assetRegisterColumnWidths\[column\] \}/)
})

// Group 4 plan 1 Task 2 (spec §6.1): one "ทรัพย์สิน" column (photo, the full name on up to two lines, the tag under it),
// the room with its branch, the holder with the department and the due date, the condition a badge only when it needs
// attention.
test("desktop rows: one asset column, the room with the branch, the holder with the department and the due date (group 4 §6.1)", () => {
  const source = table()

  assert.match(source, /<DataTableHead sort=\{sortOf\("name"\)\}>\{labels\.asset\}<\/DataTableHead>/)
  assert.doesNotMatch(source, /\{labels\.assetTag\}<\/DataTableHead>|\{labels\.assetName\}<\/DataTableHead>/)
  assert.doesNotMatch(source, /assetRegisterStickyFirstColumnClasses/, "the tag is no longer a sticky first column")
  assert.match(source, /<AssetThumbnail photo=\{asset\.photo\} assetTag=\{asset\.assetTag\} assetName=\{asset\.name\} size=\{40\}/)
  assert.match(source, /<div className="line-clamp-2 font-medium" title=\{asset\.name\}>\{asset\.name\}<\/div>\n\s+<div className="text-meta text-muted-foreground"><span className="tag">\{asset\.assetTag\}<\/span><\/div>/)
  assert.match(source, /title=\{asset\.location\.name\}>\{asset\.location\.name\}<\/div>/)
  assert.match(source, /title=\{asset\.location\.branchName\}>\{asset\.location\.branchName\}<\/div>/)
  assert.match(source, /asset\.holder\.kind === "holder"/)
  assert.match(source, /title=\{asset\.holder\.name\}>\{asset\.holder\.name\}<\/div>/)
  assert.match(source, /title=\{asset\.holder\.department\}>\{asset\.holder\.department\}<\/div>/)
  assert.match(source, /asset\.holder\.kind === "shared" \? t\("holderShared"\) : t\("noCustodian"\)/)
  assert.match(source, /asset\.dueDate \? \([\s\S]*?t\("registerDueDate", \{ date: asset\.dueDate \}\)/)
  assert.match(source, /<StatusBadge label=\{asset\.status\.label\} tone=\{getAssetStateTone\(asset\.status\.value\)\}/)
  assert.match(source, /needsConditionAttention\(asset\.condition\.value\) \? \(\n\s+<StatusBadge label=\{asset\.condition\.label\} tone=\{getAssetStateTone\(asset\.condition\.value\)\} \/>\n\s+\) : \(\n\s+asset\.condition\.label\n\s+\)/)
  assert.doesNotMatch(source, /function StatusPill/)
  assert.equal(messages("th").assetColumn, "ทรัพย์สิน")
  assert.equal(messages("th").holderShared, "ส่วนกลาง · ไม่มีผู้ถือครอง")
  assert.equal(messages("th").registerDueDate, "คืน {date}")
  for (const key of ["assetColumn", "holderShared", "registerDueDate"]) assert.equal(typeof messages("en")[key], "string", key)
})

test("the scroll hint follows real overflow and the pinned actions column has no edge shadow", () => {
  const source = table()

  assert.match(source, /new ResizeObserver\(/)
  assert.match(source, /\{isOverflowing \? \(/)
  // Spec 2B R-j: the mockup draws no shadow on the pinned column; its left line separates it.
  assert.doesNotMatch(source, /hasMoreRight|hasRemainingHorizontalContent|shadow-\[|rgb\(/)
})

const mobileList = () => read("src/components/assets/asset-register-mobile-list.tsx")

function functionBody(source: string, name: string) {
  const start = source.indexOf(`function ${name}`)
  assert.ok(start > -1, `${name} is missing`)
  const next = source.indexOf("\nfunction ", start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

// Group 4 plan 1 Task 3 (spec §6.7): the card leads with the name (the link), then the tag, the status and the
// condition when it needs attention, then "<holder or ส่วนกลาง> · <room>".
test("mobile rows are compact links with name, tag, status and the holder with the room (group 4 §6.7)", () => {
  const row = functionBody(mobileList(), "MobileAssetRow")
  const order = ["asset.name", "asset.assetTag", "asset.status", "asset.condition", "asset.holder", "asset.location.name"]

  // From the link on: the thumbnail above it also reads the tag and the name.
  const card = row.slice(row.indexOf("<Link"))
  let previous = -1
  for (const value of order) {
    const index = card.indexOf(value)
    assert.ok(index > previous, `${value} must follow the previous value`)
    previous = index
  }
  assert.match(row, /min-h-20/)
  assert.match(row, /before:absolute before:inset-0/)
  assert.match(row, /<AssetThumbnail[\s\S]*?size=\{44\}[\s\S]*?className="relative z-10"/)
  assert.match(row, /<AssetRegisterRowActions\s+variant="mobile"/)
  assert.doesNotMatch(row, /companyBranch|purchasePrice|asset\.currentLocation/)
})

test("the phone card: the name is the link, the tag line carries the badges, the holder line names the room (group 4 §6.7)", () => {
  const source = mobileList()
  const row = functionBody(source, "MobileAssetRow")
  const selectable = functionBody(source, "MobileSelectableRow")

  assert.match(row, /focus-visible:before:ring-ring"\n\s+>\n\s+\{asset\.name\}\n\s+<\/Link>/)
  assert.match(row, /className="block truncate text-sm font-semibold text-foreground before:absolute/)
  assert.match(row, /<span className="tag">\{asset\.assetTag\}<\/span>\n\s+<StatusBadge label=\{asset\.status\.label\} tone=\{getAssetStateTone\(asset\.status\.value\)\} className="shrink-0" \/>\n\s+\{needsConditionAttention\(asset\.condition\.value\) \? \(\n\s+<StatusBadge label=\{asset\.condition\.label\} tone=\{getAssetStateTone\(asset\.condition\.value\)\} className="shrink-0" \/>\n\s+\) : null\}/)
  assert.match(row, /<p className="mt-0\.5 truncate text-xs text-muted-foreground">\n\s+\{\[\n\s+asset\.holder\.kind === "holder" \? asset\.holder\.name : asset\.holder\.kind === "shared" \? t\("holderSharedShort"\) : t\("noCustodian"\),\n\s+asset\.location\.name,\n\s+\]\.join\(" · "\)\}\n\s+<\/p>/)
  assert.doesNotMatch(source, /needsFieldAttention|<Chip\b|ownershipType/, "the holder line says ส่วนกลาง, so the chip went")
  const selectableText = selectable.slice(selectable.indexOf('<span className="min-w-0 flex-1">'))
  assert.ok(selectableText.indexOf("asset.name") < selectableText.indexOf("asset.assetTag"), "select mode shows the name first too")
  assert.equal(messages("th").holderSharedShort, "ส่วนกลาง")
  assert.equal(typeof messages("en").holderSharedShort, "string")
})

test("the phone list says the tab and its count above and the end of the list on the last page (group 4 §6.7)", () => {
  const source = mobileList()
  const tableSource = table()
  const page = read("src/app/[locale]/(dashboard)/assets/page.tsx")

  assert.match(source, /\{summary \? <p data-asset-mobile-summary className="num px-3 py-2 text-meta text-muted-foreground">\{t\("registerMobileSummary", \{ tab: summary\.tab, count: formatCount\(summary\.count\) \}\)\}<\/p> : null\}/)
  assert.match(source, /\{isLastPage \? <p data-asset-mobile-end className="num px-3 py-3 text-center text-meta text-muted-foreground">\{t\("registerMobileEnd", \{ shown: formatCount\(total\), total: formatCount\(total\) \}\)\}<\/p> : null\}/)
  assert.ok(source.indexOf("data-asset-mobile-summary") < source.indexOf("<ul data-asset-mobile-list"), "the summary sits above the list")
  assert.ok(source.indexOf("data-asset-mobile-end") > source.indexOf("</ul>"), "the end line follows the last card")
  assert.match(tableSource, /summary=\{currentTab\}\n\s+isLastPage=\{filters\.page >= totalPages\}\n\s+total=\{total\}/)
  assert.match(page, /currentTab=\{currentStatusTab \? \{ tab: t\(statusTabLabelKeys\[currentStatusTab\.key\]\), count: currentStatusTab\.count \} : null\}/)
  assert.match(page, /const currentStatusTab = statusTabs\.tabs\.find\(\(tab\) => tab\.active\)/)
  assert.equal(messages("th").registerMobileSummary, "{tab} {count} รายการ")
  assert.equal(messages("th").registerMobileEnd, "แสดงครบ {shown} จาก {total} รายการ")
  for (const key of ["registerMobileSummary", "registerMobileEnd"]) assert.equal(typeof messages("en")[key], "string", key)
})

test("select mode rows only toggle the checkbox and never navigate", () => {
  const row = functionBody(mobileList(), "MobileSelectableRow")

  assert.match(row, /<label className="flex min-h-20 cursor-pointer/)
  assert.match(row, /type="checkbox"/)
  assert.match(row, /aria-label=\{asset\.assetTag\}/)
  assert.match(row, /className=\{checkboxVariants\(\{ size: "lg" \}\)\}/)
  assert.match(row, /preview=\{false\}/)
  assert.doesNotMatch(row, /<Link|href=|AssetRegisterRowActions/)
})

test("leaving select mode clears the selection and the bulk bar floats above the phone navigation", () => {
  const source = table()

  assert.match(source, /const \[selectMode, setSelectMode\] = useState\(false\)/)
  assert.match(source, /function toggleSelectMode\(\) \{\s*if \(selectMode\) clearSelection\(\)\s*setSelectMode\(!selectMode\)/)
  assert.match(source, /aria-pressed=\{selectMode\}/)
  assert.match(source, /data-asset-bulk-bar/)
  // Group 4 plan 1 Task 5 (spec §6.5): the floating bar is the phone's alone; from md the sticky DesktopSelectionBar.
  assert.match(source, /data-asset-bulk-bar\n\s+className="fixed inset-x-3 bottom-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\] z-30 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-lg md:hidden"/)
  assert.doesNotMatch(source, /md:static|md:bg-primary-soft|md:shadow-none/)
  assert.match(source, /reserveBulkBarSpace=\{selectedAssets\.length > 0\}/)
  assert.doesNotMatch(source, /AssetRegisterTransactionMenu|AssetRegisterMoreMenu|AssetDeleteButton|<details/)
  // Group 4 plan 1 Task 2 (spec §6.1): the desktop name now wraps to two lines (line-clamp-2), so that pin moved out.
  assert.doesNotMatch(source, /next\/image|\?inline=1/)
})

// Group 4 plan 1 Task 5 (spec §6.5): from md the selection is the shared sticky bar, after the panel (the panel clips,
// so a bar inside it would not stick): the count on this page, ล้างรายการที่เลือก, "อื่น ๆ" and the primary พิมพ์ป้าย.
test("the desktop selection bar: the count on this page, ล้าง, อื่น ๆ and พิมพ์ป้าย <N> รายการ last (group 4 §6.5)", () => {
  const source = table()
  const bar = source.slice(source.indexOf("<DesktopSelectionBar"), source.indexOf("printLabelsCount") + 120)

  assert.match(source, /import \{ DesktopSelectionBar \} from "@\/components\/ui\/desktop-selection-bar"/)
  assert.match(source, /import \{ DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger \} from "@\/components\/ui\/dropdown-menu"/)
  assert.match(source, /\{selectedAssets\.length > 0 \? \(\n\s+<div data-asset-selection-bar className="contents">\n\s+<DesktopSelectionBar\n\s+label=\{labels\.bulkActions\}\n\s+countLabel=\{t\("selectedOnPage", \{ count: formatCount\(selectedAssets\.length\) \}\)\}\n\s+clearLabel=\{labels\.clearSelection\}\n\s+onClear=\{clearSelection\}/)
  assert.ok(source.indexOf("data-asset-selection-bar") > source.indexOf("</DataTableFoot>"), "the bar follows the table and its pager")
  assert.ok(source.indexOf("data-asset-selection-bar") > source.lastIndexOf("</AccessibleDialog>"), "outside the clipping panel")
  assert.match(source, /^  return \(\n    <>\n/m, "the panel and the bar are siblings")
  assert.match(bar, /<DropdownMenu modal=\{false\}>\n\s+<DropdownMenuTrigger asChild>\n\s+<Button ref=\{moreTriggerRef\} variant="outline" size="md">\n\s+\{t\("moreActions"\)\}\n\s+<ChevronDown aria-hidden="true" \/>/)
  assert.match(bar, /\{permissions\.canEdit \? \(\n\s+<DropdownMenuItem onSelect=\{\(\) => \{\n\s+openingDialogRef\.current = true\n\s+openBulkUpdate\(moreTriggerRef\.current\)\n\s+\}\}>\n\s+<Edit aria-hidden="true" \/>\n\s+\{labels\.bulkUpdate\}/)
  assert.match(bar, /<DropdownMenuItem onSelect=\{exportSelected\}>\n\s+<Download aria-hidden="true" \/>\n\s+\{labels\.exportSelected\}/)
  assert.ok(bar.indexOf("labels.bulkUpdate") < bar.indexOf("labels.exportSelected"), "อัปเดต first, then ส่งออก")
  assert.match(bar, /<\/DropdownMenu>\n\s+<Button size="md" onClick=\{printSelectedLabels\}>\n\s+<Printer aria-hidden="true" \/>\n\s+\{t\("printLabelsCount", \{ count: formatCount\(selectedAssets\.length\) \}\)\}/)
  // Focus goes back to "อื่น ๆ" when the dialog opened from the menu closes; the menu does not take it first.
  assert.match(source, /returnFocusRef=\{bulkReturnFocusRef\}/)
  assert.match(source, /function openBulkUpdate\(opener: HTMLElement \| null = null\) \{\n\s+bulkReturnFocusRef\.current = opener/)
  assert.match(bar, /onCloseAutoFocus=\{\(event\) => \{\n\s+if \(!openingDialogRef\.current\) return\n\s+openingDialogRef\.current = false\n\s+event\.preventDefault\(\)/)
  // The phone bar keeps its buttons, the bulk update among them.
  const phone = source.slice(source.indexOf("data-asset-bulk-bar"), source.indexOf("data-asset-selection-bar"))
  for (const handler of ["printSelectedLabels", "() => openBulkUpdate()", "exportSelected", "clearSelection"]) assert.ok(phone.includes(`onClick={${handler}}`), handler)

  assert.equal(messages("th").selectedOnPage, "{count} รายการที่เลือกในหน้านี้")
  assert.equal(messages("th").moreActions, "อื่น ๆ")
  assert.equal(messages("th").printLabelsCount, "พิมพ์ป้าย {count} รายการ")
  for (const key of ["selectedOnPage", "moreActions", "printLabelsCount"]) {
    assert.equal(typeof messages("en")[key], "string", key)
    assert.doesNotMatch(messages("en")[key], /plural/, key)
  }
})

test("select mode copy exists in Thai and English", () => {
  assert.equal(messages("th").selectMode, "เลือก")
  assert.equal(messages("th").selectModeDone, "เสร็จ")
  assert.equal(typeof messages("en").selectMode, "string")
  assert.equal(typeof messages("en").selectModeDone, "string")
})

test("mobile rows keep the tag line on one line and the summary bar adds no vertical padding on phones", () => {
  const row = functionBody(mobileList(), "MobileAssetRow")
  const source = table()

  assert.match(row, /className="mt-0\.5 flex min-w-0 flex-nowrap items-center gap-2 text-xs leading-5"/)
  assert.doesNotMatch(row, /flex-wrap/)
  assert.match(row, /className="relative flex min-h-20 items-center gap-3 px-3 py-2 /)
  assert.equal(row.match(/<StatusBadge [^>]*className="shrink-0"/g)?.length, 2)
  // Group 4 plan 1 Task 3 (spec §6.7): the holder line says ส่วนกลาง, so the ownership Chip of plan 2D-3 went.
  assert.doesNotMatch(row, /<Chip\b/)
  assert.match(source, /data-asset-register-summary className="[^"]*py-0 md:py-2/)
})

test("the floating bulk bar has no heading on phones and the list reserves at least its height", () => {
  const source = table()

  // Group 4 plan 1 Task 5: the bar is md:hidden now, so its md-only heading went; the desktop bar's group label names it.
  assert.doesNotMatch(source, /md:block">\{labels\.bulkActions\}/)
  assert.match(source, /data-asset-bulk-bar\n[^\n]*\n\s+>\n\s+<div className="text-sm text-muted-foreground">\n\s+\{formatCount\(selectedAssets\.length\)\} \{labels\.selectedCount\}/)
  assert.match(mobileList(), /reserveBulkBarSpace && "pb-44"/)
})

// Plan 2B-3 Task 2 (spec 2B I5, §7.9, N1): the register's row actions are the shared RowActions, pattern ช1. The wrapper
// passes data only: the next step on desktop rows (phones get none), the transaction group, edit and clone, and delete
// only for users who may delete.
test("the register row actions are a thin wrapper of RowActions: next step on desktop only, dropdown or sheet, delete by permission (spec 2B I5)", () => {
  const source = rowActions()
  assert.match(source, /<RowActions\b[\s\S]*?menuLabel=\{t\("rowActionsMenu", \{ assetTag \}\)\}[\s\S]*?menu=\{variant === "desktop" \? "dropdown" : "sheet"\}/)
  assert.match(source, /next=\{variant === "desktop" \? \(primary \? \{ label: tAll\(primary\.labelKey\), href: primary\.href, icon: icon\(primary\.key\), onNavigate \} : null\) : undefined\}/,"a desktop row without a next step keeps the empty 120px slot, so ⋯ lines up")
  assert.match(source, /groups=\{\[/)
  assert.match(source, /label: t\("transactionMenu"\)/)
  assert.match(source, /code=\{assetTag\}\n\s+name=\{assetName\}/, "the phone sheet is headed by the tag and the name")
  assert.doesNotMatch(source, /function NextActionLink|sheetItemClasses|<DropdownMenu|<Sheet|triggerRef|contentClassName|size-8|closeLabel=|pr-14|pb-\[env/)
})

// Plan 2B-3 Task 3 (spec 2B §7.8, I3, I4, R-j, R-n, R-p, O1, N2–N5): the desktop table on the DataTable parts. The
// dense rows stay in this file (headerClasses, cellClasses) until phase 3; the scroller, the pinned columns and the
// scroll hint stay the register's own (I4).
test("the register table builds on the DataTable parts and keeps its dense rows in its own classes (spec 2B I3)", () => {
  const source = table()
  assert.match(source, /const headerClasses = "border-b border-border bg-surface px-3 py-2\.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"/)
  assert.match(source, /const cellClasses = "border-b border-border-soft px-3 py-2 align-top"/)
  assert.match(source, /const assetRegisterStickyHeaderColumnClasses = "z-30 bg-surface"/)
  assert.match(source, /group-has-\[\[aria-expanded=true\]\]\/row:bg-row-hover/, "the pinned cells stay lit with the row while its ⋯ menu is open")
  assert.match(source, /cn\(headerClasses, "pl-1\.5 pr-2 text-right", /, "the actions column: 172 − 6 − 8 − 0.5 leaves 157.5px for the 156px RowActions pair")
  assert.match(source, /cn\(cellClasses, "pl-1\.5 pr-2", /)
  assert.equal(source.match(/<DataTableHead\b[^>]*\bsort=\{sortOf\("(?:name|purchasePrice)"\)\}/g)?.length, 2, "the asset (by name) and price heads sort through DataTableHead (aria-sort and an arrow icon); group 4 plan 1 Task 2 merged the code and name heads")
  assert.match(source, /const current = filters\.sort === field \? \(filters\.direction === "asc" \? "asc" : "desc"\) : null/)
  assert.match(source, /<DataTableBody>/)
  assert.match(source, /<TableEmptyRow colSpan=\{visibleColumnCount \+ 2\} emptyState=\{emptyState\} \/>/)
  assert.match(source, /actionVariant: "secondary"/)
  assert.match(source, /<DataTableFoot>\n\s+<Pagination\b/)
  assert.match(source, /range: rangeLabel,/)
  assert.match(source, /<span className="sr-only">\{labels\.actions\}<\/span>/)
  assert.doesNotMatch(source, /<thead className="bg-muted"|uppercase|function SortableHeader|className="group"|density=|data-density/)
})

test("register cells: codes in monospace, money through formatMoney, empty values through Nil (spec 2B R-n, R-p, §7.8.2)", () => {
  const source = table()
  // Group 4 plan 1 Task 2 (spec §6.1): the tag sits small under the name, the serial left the row (it stays in the
  // CSV of the selected rows), and an empty holder is said in words, not a dash. The tag sizes itself under its
  // wrapper (visual-foundation-guards: a tag sets no size of its own).
  assert.match(source, /<div className="text-meta text-muted-foreground"><span className="tag">\{asset\.assetTag\}<\/span><\/div>/)
  assert.match(source, /asset\.serialNumber \?\? ""/)
  assert.match(source, /formatMoney\(asset\.purchasePrice\) \?\? <Nil \/>/)
  assert.match(source, /t\("purchasePriceBaht"\)/, "the unit sits in the head, so the cells drop the ฿")
  assert.match(source, /from: formatCount\(fromRow\),/)
  assert.doesNotMatch(source, /formatCurrency|\|\| "-"|toLocaleString\(|useLocale/)
  assert.equal(messages("th").noCustodian, "ไม่มีผู้ถือครอง")
  assert.equal(typeof messages("en").noCustodian, "string")
})

test("register checkboxes are the shared checkbox in a 44px label, and a click beside the box never opens the row (spec 2B O1)", () => {
  const source = table()
  assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2)
  assert.match(source, /<th scope="col" className=\{cn\(headerClasses, "p-0"\)\}>\n\s+<label className="flex min-h-11 w-11 cursor-pointer items-center justify-center">/)
  assert.match(source, /<label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center">/)
  assert.doesNotMatch(source, /h-4 w-4 rounded border-border/)
})

test("the bulk bar keeps its place and frame, with its buttons on Button (spec 2B R-q, §7.8.7)", () => {
  const source = table()
  const bar = source.slice(source.indexOf("data-asset-bulk-bar"), source.indexOf("{assets.length === 0 ? ("))
  assert.match(bar, /"fixed inset-x-3 [^"]*shadow-lg[^"]*"/, "phase 3 moves the bar (R-q)")
  assert.equal(bar.match(/<Button\b/g)?.length, 4)
  assert.match(bar, /\{formatCount\(selectedAssets\.length\)\} \{labels\.selectedCount\}/)
  assert.match(source, /<Button variant="ghost" size="md" aria-pressed=\{selectMode\} onClick=\{toggleSelectMode\} className="md:hidden">/)
})

// Plan 2B-3 Task 4 (spec 2B §7.10, R-p, O1): phone rows show the asset tag in mono on the soft row line of DataTable,
// and the select-mode box is the shared 20px checkbox.
test("phone rows show the asset tag as a mono tag on the soft row line, and select mode uses the shared checkbox (2B §7.10)", () => {
  const source = mobileList()
  const row = functionBody(source, "MobileAssetRow")
  const selectable = functionBody(source, "MobileSelectableRow")

  assert.match(source, /^import \{ checkboxVariants \} from "@\/components\/ui\/field-variants"$/m)
  // Group 4 plan 1 Task 3 (spec §6.7): a wrapper holds the summary, the list and the end line, so md:hidden and the
  // bulk bar space moved to it; the link is the name and the tag sits on the line under it.
  assert.match(source, /<div className=\{cn\("md:hidden", reserveBulkBarSpace && "pb-44"\)\}>/)
  assert.match(source, /<ul data-asset-mobile-list className="divide-y divide-border-soft">/)
  assert.match(row, /<span className="tag">\{asset\.assetTag\}<\/span>/)
  assert.match(selectable, /<span className="block truncate text-sm font-semibold text-foreground">\{asset\.name\}<\/span>\n\s+<span className="block truncate text-xs text-muted-foreground"><span className="tag">\{asset\.assetTag\}<\/span><\/span>/)
  assert.doesNotMatch(source, /rounded border-border|text-primary|font-semibold text-foreground">\{asset\.assetTag\}/)
})

// Plan 2B-3 Task 11 (spec 2B §7.8.6, N5): the column picker opens from the shared outline Button, 36px from md. The
// table shows it from md only, so its 44px phone height never shows.
test("the column picker opens from the shared outline Button (spec 2B §7.8.6)", () => {
  const source = columnPicker()

  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s+<Button variant="outline" size="md">\n\s+<Columns3 aria-hidden="true" \/>\n\s+\{t\("columnSetLabel", \{ preset: activePreset \? t\(presetLabelKeys\[activePreset\]\) : t\("columnSetCustom"\) \}\)\}\n\s+<\/Button>\n\s+<\/DropdownMenuTrigger>/)
  // Group 4 plan 1 Task 4 (spec §6.3): the trigger names the column set, "กำหนดเอง" when no preset matches.
  assert.deepEqual([messages("th").columnSetLabel, messages("th").columnSetCustom], ["ชุดคอลัมน์: {preset}", "กำหนดเอง"])
  assert.deepEqual([messages("en").columnSetLabel, messages("en").columnSetCustom], ["Column set: {preset}", "Custom"])
  assert.doesNotMatch(source, /<button\b|hover:bg-accent|focus-visible:ring/, "no hand-written trigger (N5)")
})

// Plan 2B-3 Task 12 (spec 2B §7.8.6, N5): the export menu opens from the shared outline Button, 36px from md, beside
// the column picker; its two items stay plain download links.
test("the export menu opens from the shared outline Button (spec 2B §7.8.6)", () => {
  const source = exportMenu()

  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s+<Button variant="outline" size="md">\n\s+<Download aria-hidden="true" \/>\n\s+\{t\("exportImportMenu"\)\}\n\s+<\/Button>\n\s+<\/DropdownMenuTrigger>/)
  assert.doesNotMatch(source, /<button\b|hover:bg-accent|focus-visible:ring/, "no hand-written trigger (N5)")
})

// Phase 2C batch 4 (spec 2C §5.5 row 6, §5.3, §6.3 #71-#72, §4.3 F1-F5, O1): the bulk update dialog only; the list part
// above is 2B's. Layout A: the form wraps the body and footer parts. The four fields are shared fields, and the reason
// keeps required and maxLength and now shows the star. Cancel is off while saving (it was not), the submit button is
// busy in place, and the X reads "ปิด" from the dialog itself.
test("the bulk update dialog uses the dialog parts, shared fields and a busy submit (2C batch 4, O1)", () => {
  const source = table()
  const dialog = source.slice(source.indexOf("<AccessibleDialog\n"), source.indexOf("</AccessibleDialog>"))
  assert.doesNotMatch(dialog, /closeLabel=/)
  // v-track plan 2 A3: noValidate, each checked field with its id and error, and apply no longer gated by its rule.
  assert.match(dialog, /<form onSubmit=\{submitBulkUpdate\} noValidate className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-4">/)
  assert.equal(dialog.match(/<Field label=\{labels\.(?:currentLocation|custodian)\} id="asset-bulk-[\w-]+" error=\{bulkErrors\.message\("\w+"\)\}>/g)?.length, 2)
  assert.equal(dialog.match(/<Field label=\{labels\.remark\}>/g)?.length, 1)
  assert.match(dialog, /<Field label=\{labels\.reason\} id="asset-bulk-reason" required error=\{bulkErrors\.message\("reason"\)\}>\n\s+<Input\n[\s\S]*?\n\s+required\n\s+maxLength=\{500\}\n\s+\/>/)
  assert.equal(dialog.match(/<NativeSelect\n/g)?.length, 2)
  assert.match(dialog, /<Textarea\n[\s\S]*?rows=\{3\}\n\s+className="min-h-24"/)
  assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{bulkSaving\}>\n\s+\{labels\.applyBulkUpdate\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>\n\s+<\/form>/)
  assert.doesNotMatch(dialog, /<button\b|<select\b|<input\b|<textarea\b|<label\b|h-10|disabled:opacity/)
  assert.doesNotMatch(source, /\bLoader2\b/, "the spinner comes from Button busy")
})

// Group 4 plan 1 Task 7 (spec §6.6, decisions 3 and 11, P1-R1): the bulk update is a data correction. Its dialog names
// every refused asset under the form with a way to untick them, says when the department follows the holder, and the
// phone bar offers it only with asset:edit, as the desktop menu does.
test("the bulk correction dialog: refused assets named with their reason and unticked on request, the department line, and asset:edit on the phone bar", () => {
  const source = table()
  const page = read("src/app/[locale]/(dashboard)/assets/page.tsx")
  const dialog = source.slice(source.indexOf("<AccessibleDialog\n"), source.indexOf("</AccessibleDialog>"))
  assert.match(page, /bulkUpdateTitle: t\("bulkCorrectionTitle"\)/)
  assert.match(page, /reason: t\("correctionReason"\)/)
  assert.match(page, /departmentId: employee\.departmentId,\n\s+departmentName: employee\.department\.name,/)
  assert.match(page, /departmentId: asset\.departmentId,\n\s+holderDepartmentId: asset\.custodian\?\.departmentId \?\? null,/)
  assert.match(page, /custodian: \{ select: \{ code: true, fullNameTh: true, departmentId: true, department: \{ select: \{ name: true \} \} \} \}/)
  assert.equal(messages("th").bulkCorrectionTitle, "แก้ไขข้อมูลหลายรายการ")
  assert.equal(messages("th").correctionReason, "เหตุผลที่แก้")
  assert.equal(messages("th").bulkDepartmentFollows, "แผนกจะเปลี่ยนตามผู้ถือครอง: {department} ({count, number} รายการ)")
  assert.equal(messages("th").bulkDepartmentFollowsHolder, "แผนกจะปรับตามผู้ถือครองปัจจุบัน ({count, number} รายการ)")
  assert.equal(messages("en").bulkDepartmentFollowsHolder, "Department follows the current holder ({count, number})")
  // The correction's words (final review B2): the menu item is the title, and the save says it is a correction.
  assert.equal(messages("th").bulkUpdate, "แก้ไขข้อมูลหลายรายการ")
  assert.equal(messages("th").bulkUpdateDescription, "แก้ที่ตั้งหรือผู้ถือครองที่บันทึกผิด ระบบบันทึกเป็นการแก้ไขข้อมูลในประวัติของแต่ละรายการ")
  assert.equal(messages("th").applyBulkUpdate, "บันทึกการแก้ไข")
  assert.equal(messages("en").bulkUpdate, messages("en").bulkCorrectionTitle)
  assert.equal(messages("th").bulkCorrectionRemoveBlocked, "นำรายการเหล่านี้ออกจากที่เลือก")

  // The 409's blocked list comes first, then a field refusal, then the toast.
  assert.match(source, /const refused = readBulkMoveBlocked\(payload\)\n\s+if \(refused\.length > 0\) \{\n\s+setBulkBlocked\(\{ assets: refused, changesCustodian: Boolean\(bulkForm\.toCustodianId\) \}\)/)
  assert.match(source, /const key = bulkUpdateBlockedReasonKey\(code, bulkBlocked\.changesCustodian\)\n\s+return key \? tAll\(key\) : apiError\.describe\(code\)\.message/)
  assert.match(dialog, /<FieldError id="asset-bulk-blocked-error" role="alert">\n\s+\{t\("bulkCorrectionBlocked", \{ count: formatCount\(bulkBlocked\.assets\.length\), list: bulkMoveBlockedList\(bulkBlocked\.assets, bulkBlockedReason\) \}\)\}/)
  assert.match(dialog, /<Button id="asset-bulk-blocked-remove" type="button" variant="outline" size="md" aria-describedby="asset-bulk-blocked-error" onClick=\{removeBulkBlocked\}>\n\s+\{t\("bulkCorrectionRemoveBlocked"\)\}/)
  assert.match(source, /setSelectedIds\(\(current\) => new Set\(\[\.\.\.current\]\.filter\(\(id\) => !refused\.has\(id\)\)\)\)/)

  // The department line (final review B1): countBulkDepartmentChanges with the chosen holder, else on a room-only save
  // with each row's current holder; the raw count; in a status region that is always rendered.
  assert.match(source, /const departmentFollowsCount = bulkForm\.toCustodianId\n\s+\? countBulkDepartmentChanges\(selectedAssets, \{ departmentId: chosenHolder\?\.departmentId \?\? null \}\)\n\s+: bulkForm\.toLocationId\n\s+\? countBulkDepartmentChanges\(selectedAssets, null\)\n\s+: 0/)
  assert.match(source, /\? chosenHolder\?\.departmentName \? t\("bulkDepartmentFollows", \{ department: chosenHolder\.departmentName, count: departmentFollowsCount \}\) : null\n\s+: t\("bulkDepartmentFollowsHolder", \{ count: departmentFollowsCount \}\)/)
  assert.match(dialog, /<div role="status" data-asset-bulk-department-status className="mt-4 empty:mt-0">\n\s+\{departmentNotice \? \(\n\s+<Notice tone="info" data-asset-bulk-department>\n\s+\{departmentNotice\}/)

  // Focus (final review B3): after a save it returns to the range line (tabIndex -1), also as the dialog's fallback;
  // after นำรายการเหล่านี้ออกจากที่เลือก with assets left it goes to the first field.
  assert.match(source, /<p ref=\{rangeRef\} tabIndex=\{-1\} className="[^"]*">\{rangeLabel\}<\/p>/)
  assert.match(source, /bulkReturnFocusRef\.current = rangeRef\.current\n\s+setBulkUpdateOpen\(false\)/)
  assert.match(source, /returnFocusRef=\{bulkReturnFocusRef\}\n\s+fallbackFocusRef=\{rangeRef\}/)
  assert.match(source, /if \(remaining\.length === 0\) setBulkUpdateOpen\(false\)\n[^\n]*\n\s+else requestAnimationFrame\(\(\) => document\.getElementById\(BULK_FIELD_IDS\.toLocationId\)\?\.focus\(\)\)/)

  const phone = source.slice(source.indexOf("data-asset-bulk-bar"), source.indexOf("data-asset-selection-bar"))
  assert.match(phone, /\{permissions\.canEdit \? \(\n\s+<Button variant="outline" size="md" onClick=\{\(\) => openBulkUpdate\(\)\}/)
})
