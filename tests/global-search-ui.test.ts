import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("global search results are a Radix popover listbox anchored to the field", () => {
  const source = readFileSync("src/components/layout/global-search.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<PopoverAnchor asChild>/)
  assert.match(source, /<PopoverContent[\s\S]*?id=\{panelId\}/)
  assert.match(source, /onOpenAutoFocus=\{\(event\) => event\.preventDefault\(\)\}/)
  assert.match(source, /role="listbox"/)
  assert.match(source, /role="option"/)
  assert.match(source, /aria-activedescendant=/)
  assert.match(source, /<StatusBadge/)
  assert.doesNotMatch(source, /document\.addEventListener|style=\{\{/)
})

test("global search rows highlight like menu items and the footer shows the keys", () => {
  const source = readFileSync("src/components/layout/global-search.tsx", "utf8").replace(/\r\n/g, "\n")
  // onMouseEnter moves the selection, so a separate hover fill would light up two rows.
  assert.doesNotMatch(source, /bg-accent\/60|hover:bg-row-hover/)
  assert.match(source, /"flex w-full min-w-0 cursor-pointer items-start gap-2\.5 rounded-control px-2\.5 py-1\.5 text-left",\s*selected && "bg-primary-soft",/)
  assert.match(source, /"grid max-h-100 gap-px overflow-y-auto p-1\.5"/) // the bar's list (task 8 fix 1 pins the variants)
  assert.match(source, /<Kbd>↑↓<\/Kbd>\s*\{t\("keyboardSelect"\)\}/)
  assert.match(source, /<Kbd>Enter<\/Kbd>\s*\{t\("keyboardOpen"\)\}/)
  assert.match(source, /<Kbd>Esc<\/Kbd>\s*\{t\("keyboardClose"\)\}/)
  assert.doesNotMatch(source, /keyboardHint/)
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).globalSearch
    for (const key of ["keyboardSelect", "keyboardOpen", "keyboardClose"]) {
      assert.equal(typeof messages[key], "string", `${locale} globalSearch.${key}`)
    }
    assert.equal(messages.keyboardHint, undefined, locale)
  }
})

test("one search component: grouped options, highlight, / shortcut, recents, the 220 ms debounce (menu B shell task 8)", () => {
  const source = read("src/components/layout/global-search.tsx")
  assert.match(source, /const panelId = useId\(\)/); assert.doesNotMatch(source, /id="global-search-results"/)
  assert.match(source, /window\.addEventListener\("keydown", handleShortcut\)/); assert.match(source, /window\.removeEventListener\("keydown", handleShortcut\)/)
  assert.match(source, /isGlobalSearchShortcut\(event, event\.target instanceof Element \? event\.target : null\)/); assert.match(source, /aria-keyshortcuts="\/"/)
  assert.match(source, /<mark className="rounded-sm bg-warning-soft px-0\.5 text-foreground">/)
  assert.match(source, /role="group"/); assert.match(source, /aria-labelledby=\{`\$\{panelId\}-group-\$\{section\.id\}`\}/)
  assert.match(source, /t\("viewAllInRegister", \{ count: formatCount\(option\.count\) \}\)/)
  assert.match(source, /readRecentSearches\(\(\) => window\.localStorage, locale\)/); assert.match(source, /writeRecentSearches\(\(\) => window\.localStorage, locale,/)
  assert.match(source, /getGlobalSearchPanelState\(\{/); assert.match(source, /\}, 220\)/)
  assert.equal(source.match(/<input\b/g)?.length, 1); assert.equal(source.match(/<Loader2\b/g)?.length, 2)
})
test("one clear button in the field; the phone sheet's list fills the sheet and shows no keyboard hints (menu B shell task 8 fix 1)", () => {
  const source = read("src/components/layout/global-search.tsx")
  // type="search" draws a native cancel X beside our own clear button; hide it as SearchField does.
  assert.match(source, /className=\{cn\("h-9 w-full min-w-0 rounded-md [^"]*\[&::-webkit-search-cancel-button\]:appearance-none[^"]*", variant === "sheet" && "h-11 text-base"\)\}/)
  // The bar keeps its capped list; the sheet's list has no cap and scrolls in the sheet body.
  assert.match(source, /className=\{variant === "bar" \? "grid max-h-100 gap-px overflow-y-auto p-1\.5" : "grid gap-px p-1\.5"\}/)
  assert.match(source, /<div className="min-h-0 flex-1 overflow-y-auto">\{panel\}<\/div>/)
  assert.equal(source.match(/max-h-100/g)?.length, 1)
  // The Kbd footer is for a keyboard: the bar only.
  assert.match(source, /\{variant === "bar" && options\.length > 0 \? \(\s*<div className="flex flex-wrap items-center gap-x-3 [^"]*border-t/)
})
test("the phone opens the same search in a full-height sheet from the top bar (menu B shell task 8)", () => {
  const sheet = read("src/components/layout/mobile-search-sheet.tsx")
  assert.match(sheet, /<Button variant="ghost" size="icon" className="lg:hidden" aria-label=\{t\("label"\)\} title=\{t\("label"\)\}>/)
  assert.match(sheet, /<SheetContent side="top" className="h-dvh gap-0" aria-describedby=\{undefined\}>/); assert.match(sheet, /<SheetTitle>\{t\("label"\)\}<\/SheetTitle>/)
  assert.match(sheet, /<GlobalSearch\s+variant="sheet"[\s\S]*?onNavigate=\{\(\) => setOpen\(false\)\}/)
  const topbar = read("src/components/layout/topbar.tsx")
  assert.match(topbar, /const canViewAssets = hasNavigationPermission\(user, \{ module: "asset", action: "view" \}\)/)
  assert.match(topbar, /const canCreateAssets = hasNavigationPermission\(user, \{ module: "asset", action: "create" \}\)/)
  assert.match(topbar, /<GlobalSearch canViewAssets=\{canViewAssets\} canCreateAssets=\{canCreateAssets\} \/>/)
  assert.match(topbar, /<MobileSearchSheet canViewAssets=\{canViewAssets\} canCreateAssets=\{canCreateAssets\} \/>/)
  assert.ok(topbar.indexOf("<MobileSearchSheet") < topbar.indexOf("asset-management/scan"), "first in the right group")
})
test("search messages (menu B shell task 8)", () => {
  const SET = {
    "th": { "globalSearch.group_asset": "ทรัพย์สิน", "globalSearch.group_maintenance": "งานซ่อม", "globalSearch.group_audit": "รอบตรวจนับ", "globalSearch.group_disposal": "ตัดจำหน่าย", "globalSearch.group_employee": "พนักงาน", "globalSearch.group_location": "ที่ตั้ง", "globalSearch.group_supplier": "ผู้ขาย", "globalSearch.group_company": "บริษัท", "globalSearch.group_branch": "สาขา", "globalSearch.viewAllInRegister": "ดูทั้งหมดในทะเบียน ({count})", "globalSearch.emptyHint": "ค้นหาด้วยรหัสทรัพย์สิน Serial ชื่อ เลขที่เอกสาร หรือชื่อพนักงาน", "globalSearch.keyboardFocus": "ค้นหาจากทุกหน้า", "globalSearch.recentTitle": "เปิดล่าสุด", "globalSearch.recentClear": "ล้าง", "globalSearch.recentClearLabel": "ล้างรายการที่เปิดล่าสุด", "globalSearch.notFound": "ไม่พบ \"{query}\"", "globalSearch.notFoundHint": "ลองพิมพ์ให้สั้นลง หรือตรวจตัวสะกด", "globalSearch.actionScan": "สแกน / ค้นหาทรัพย์สิน", "globalSearch.actionRegister": "หาในทะเบียนด้วยตัวกรอง", "globalSearch.actionCreateAsset": "เพิ่มทรัพย์สิน", "globalSearch.failed": "ค้นหาไม่สำเร็จ ลองอีกครั้ง", "asset.searchPlaceholder": "ค้นหา รหัส · ชื่อ · Serial · ยี่ห้อ/รุ่น · ผู้ถือครอง · ที่ตั้ง" },
    "en": { "globalSearch.group_asset": "Assets", "globalSearch.group_maintenance": "Repairs", "globalSearch.group_audit": "Audit rounds", "globalSearch.group_disposal": "Disposals", "globalSearch.group_employee": "Employees", "globalSearch.group_location": "Locations", "globalSearch.group_supplier": "Suppliers", "globalSearch.group_company": "Companies", "globalSearch.group_branch": "Branches", "globalSearch.viewAllInRegister": "View all in the register ({count})", "globalSearch.emptyHint": "Search by asset tag, serial, name, document number or employee name", "globalSearch.keyboardFocus": "search from any page", "globalSearch.recentTitle": "Recently opened", "globalSearch.recentClear": "Clear", "globalSearch.recentClearLabel": "Clear recently opened", "globalSearch.notFound": "No results for \"{query}\"", "globalSearch.notFoundHint": "Try a shorter term or check the spelling", "globalSearch.actionScan": "Scan or look up an asset", "globalSearch.actionRegister": "Find it in the register with filters", "globalSearch.actionCreateAsset": "Add an asset", "globalSearch.failed": "Search failed. Try again.", "asset.searchPlaceholder": "Search tag, name, serial, brand or model, custodian or location" },
  }
  const kept = { th: { label: "ค้นหาทั่วระบบ", minChars: "พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา", noResults: "ไม่พบข้อมูลที่ตรงกับคำค้น" }, en: { label: "Search globally", minChars: "Type at least 2 characters to search", noResults: "No matching records found" } }
  for (const locale of ["th", "en"] as const) {
    const all = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    const m = all.globalSearch
    // Each key is read in its own namespace, so asset.searchPlaceholder is checked under asset.
    for (const [key, value] of Object.entries(SET[locale])) assert.equal(key.split(".").reduce((node, part) => node?.[part], all), value, `${locale} ${key}`)
    for (const [key, value] of Object.entries(kept[locale])) assert.equal(m[key], value, `${locale} ${key} unchanged`)
  }
})
