import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const rowActions = () => read("src/components/assets/asset-register-row-actions.tsx")
const table = () => read("src/components/assets/asset-register-table.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("row actions show one next-step button and keep every action in the ⋯ menu", () => {
  const source = rowActions()
  // Plan 2B-3 Task 2 (spec 2B I5): the menu, the phone sheet and the delete confirm moved into the shared RowActions,
  // so their pins read ui/row-actions.tsx. The wrapper keeps the register's rules: next step, order, permissions, reasons.
  const shared = read("src/components/ui/row-actions.tsx")

  assert.match(source, /const nextAction = getRowNextAction\(transactions\)/)
  assert.match(source, /next \? \[next, \.\.\.transactions\.filter\(\(transaction\) => transaction !== next\)\] : transactions/)
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
  assert.match(source, /reasonLabelKeys\[transaction\.reason\]/)
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

test("the table summary uses the new menus, the shared pagination and announces loading", () => {
  const source = table()

  assert.match(source, /data-asset-register-summary/)
  assert.match(source, /<AssetRegisterSortMenu \/>/)
  assert.match(source, /<div className="hidden items-center gap-2 md:flex">[\s\S]*?<AssetRegisterColumnPicker[\s\S]*?<AssetRegisterExportMenu/)
  assert.match(source, /<Pagination\b/)
  assert.match(source, /aria-busy=\{isPending\}/)
  assert.doesNotMatch(source, /function PaginationLink|downloadFile/)
})

test("summary and sort copy exists in Thai and English", () => {
  const keys = ["registerRange", "sortMenu", "sortNewest", "sortOldest", "sortTagAsc", "sortTagDesc", "sortNameAsc", "sortPurchaseDateDesc", "sortPriceDesc", "exportMenu"]
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
  assert.match(source, /column === "name" \? undefined : \{ width: assetRegisterColumnWidths\[column\] \}/)
})

test("desktop rows use small thumbnails, one-line cells and shared status badges", () => {
  const source = table()

  assert.match(source, /<AssetThumbnail photo=\{asset\.photo\} assetTag=\{asset\.assetTag\} assetName=\{asset\.name\} size=\{40\}/)
  assert.match(source, /<div className="truncate font-medium" title=\{asset\.name\}>/)
  assert.match(source, /title=\{asset\.currentLocation\}/)
  assert.match(source, /title=\{asset\.custodian \?\? undefined\}/)
  assert.match(source, /<StatusBadge label=\{asset\.status\.label\} tone=\{getAssetStateTone\(asset\.status\.value\)\}/)
  assert.match(source, /<StatusBadge label=\{asset\.condition\.label\} tone=\{getAssetStateTone\(asset\.condition\.value\)\}/)
  assert.doesNotMatch(source, /function StatusPill/)
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

test("mobile rows are compact links with tag, name, location and status", () => {
  const row = functionBody(mobileList(), "MobileAssetRow")
  const order = ["asset.assetTag", "asset.name", "asset.currentLocation", "asset.status"]

  let previous = -1
  for (const value of order) {
    const index = row.indexOf(value)
    assert.ok(index > previous, `${value} must follow the previous value`)
    previous = index
  }
  assert.match(row, /min-h-20/)
  assert.match(row, /before:absolute before:inset-0/)
  assert.match(row, /<AssetThumbnail[\s\S]*?size=\{44\}[\s\S]*?className="relative z-10"/)
  assert.match(row, /<AssetRegisterRowActions\s+variant="mobile"/)
  assert.doesNotMatch(row, /companyBranch|purchasePrice/)
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
  assert.match(source, /fixed inset-x-3 bottom-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\][^"]*md:static/)
  assert.match(source, /reserveBulkBarSpace=\{selectedAssets\.length > 0\}/)
  assert.doesNotMatch(source, /AssetRegisterTransactionMenu|AssetRegisterMoreMenu|AssetDeleteButton|<details/)
  assert.doesNotMatch(source, /next\/image|\?inline=1|line-clamp-2/)
})

test("select mode copy exists in Thai and English", () => {
  assert.equal(messages("th").selectMode, "เลือก")
  assert.equal(messages("th").selectModeDone, "เสร็จ")
  assert.equal(typeof messages("en").selectMode, "string")
  assert.equal(typeof messages("en").selectModeDone, "string")
})

test("mobile rows keep line 3 on one line and the summary bar adds no vertical padding on phones", () => {
  const row = functionBody(mobileList(), "MobileAssetRow")
  const source = table()

  assert.match(row, /className="mt-0\.5 flex min-w-0 flex-nowrap items-center gap-2 text-xs leading-5"/)
  assert.doesNotMatch(row, /flex-wrap/)
  assert.match(row, /className="relative flex min-h-20 items-center gap-3 px-3 py-2 /)
  assert.equal(row.match(/<StatusBadge [^>]*className="shrink-0"/g)?.length, 3)
  assert.match(source, /data-asset-register-summary className="[^"]*py-0 md:py-2/)
})

test("the floating bulk bar hides its heading on phones and the list reserves at least its height", () => {
  const source = table()

  assert.match(source, /<div className="hidden text-sm font-semibold text-foreground md:block">\{labels\.bulkActions\}<\/div>/)
  assert.match(mobileList(), /reserveBulkBarSpace && "pb-44"/)
})

// Plan 2B-3 Task 2 (spec 2B I5, §7.9, N1): the register's row actions are the shared RowActions, pattern ช1. The wrapper
// passes data only: the next step on desktop rows (phones get none), the transaction group, edit and clone, and delete
// only for users who may delete.
test("the register row actions are a thin wrapper of RowActions: next step on desktop only, dropdown or sheet, delete by permission (spec 2B I5)", () => {
  const source = rowActions()
  assert.match(source, /<RowActions\b[\s\S]*?menuLabel=\{t\("rowActionsMenu", \{ assetTag \}\)\}[\s\S]*?menu=\{variant === "desktop" \? "dropdown" : "sheet"\}/)
  assert.match(source, /next=\{variant === "desktop" \? \(next \? \{ label: t\(transactionLabelKeys\[next\.action\]\), href: next\.href, icon: icon\(next\.action\), onNavigate \} : null\) : undefined\}/, "a desktop row without a next step keeps the empty 120px slot, so ⋯ lines up")
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
  assert.equal(source.match(/<DataTableHead\b[^>]*\bsort=\{sortOf\("(?:assetTag|name|purchasePrice)"\)\}/g)?.length, 3, "the code, name and price heads sort through DataTableHead (aria-sort and an arrow icon)")
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
  assert.match(source, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.match(source, /<span className="tag">\{asset\.serialNumber\}<\/span>/)
  assert.match(source, /orNil\(asset\.custodian, t\("noCustodian"\)\)/)
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
  assert.match(source, /<ul data-asset-mobile-list className=\{cn\("divide-y divide-border-soft md:hidden", reserveBulkBarSpace && "pb-44"\)\}>/)
  assert.match(row, /focus-visible:before:ring-ring"\n\s+>\n\s+<span className="tag font-medium">\{asset\.assetTag\}<\/span>\n\s+<\/Link>/)
  assert.match(selectable, /<span className="block truncate text-sm text-foreground"><span className="tag font-medium">\{asset\.assetTag\}<\/span><\/span>/)
  assert.doesNotMatch(source, /rounded border-border|text-primary|font-semibold text-foreground">\{asset\.assetTag\}/)
})
