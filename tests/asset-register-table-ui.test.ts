import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const rowActions = () => read("src/components/assets/asset-register-row-actions.tsx")
const table = () => read("src/components/assets/asset-register-table.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("row actions show one next-step button and keep every action in the ⋯ menu", () => {
  const source = rowActions()

  assert.match(source, /const nextAction = getRowNextAction\(transactions\)/)
  assert.match(source, /next \? \[next, \.\.\.transactions\.filter\(\(transaction\) => transaction !== next\)\] : transactions/)
  assert.match(source, /<DropdownMenuTrigger asChild>/)
  assert.match(source, /<DropdownMenuContent data-no-row-click/)
  assert.match(source, /<SheetTrigger asChild>/)
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, \{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /variant="destructive"/)
  assert.match(source, /permissions\.canEdit \?/)
  assert.match(source, /permissions\.canCreate \?/)
  assert.match(source, /permissions\.canDelete \?/)
  assert.match(source, /reasonLabelKeys\[transaction\.reason\]/)
  assert.match(source, /size-11/)
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
  assert.match(source, /min-h-11/)
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
  assert.match(source, /<StatusBadge size="xs" label=\{asset\.status\.label\} tone=\{getAssetStateTone\(asset\.status\.value\)\}/)
  assert.match(source, /<StatusBadge size="xs" label=\{asset\.condition\.label\} tone=\{getAssetStateTone\(asset\.condition\.value\)\}/)
  assert.doesNotMatch(source, /function StatusPill/)
})

test("the scroll hint and the actions shadow follow real overflow", () => {
  const source = table()

  assert.match(source, /new ResizeObserver\(/)
  assert.match(source, /\{isOverflowing \? \(/)
  assert.match(source, /hasRemainingHorizontalContent\(/)
  assert.match(source, /hasMoreRight && /)
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
  assert.match(row, /className="size-5 /)
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
