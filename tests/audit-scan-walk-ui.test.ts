import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 3 Task 3 (spec §11, bugs 20 and 21, P3-R1, P3-R2, P3-R5 to P3-R7, P3-R13, P3-R14, P3-R25): the phone walk on
// Task 2's rules. The rules are tested by value in tests/audit-scan-session-walk.test.ts; these pin the wiring and the
// markup Task 6's E2E reads. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const A = "src/components/audit/"
const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the page passes the round's name and every category of its items, closed ones included, read through the relation (spec §11, P3-R6)", () => {
  const page = read(PAGE)
  assert.match(page, /^import \{ loadAuditScanCategories, loadAuditScanRows \} from "@\/lib\/audit-scan-data"$/m)
  assert.match(page, /const \[round, options, rows, categories\] = await withPerformanceTiming\(/)
  assert.match(page, /loadAuditScanRows\(id\),\n\s+loadAuditScanCategories\(id\),\n\s+\]\),/)
  assert.match(page, /roundName=\{round\.name\}/)
  assert.match(page, /roundCode=\{round\.auditNo\}/)
  assert.match(page, /categories=\{categories\}/)
  assert.doesNotMatch(page, /roundName=\{`/, "line 2 is the name alone; line 1 is the code")
  const data = read("src/lib/audit-scan-data.ts")
  const loader = data.slice(data.indexOf("export async function loadAuditScanCategories"))
  assert.match(loader, /^export async function loadAuditScanCategories\(roundId: string\): Promise<AuditScanCategory\[\]> \{/)
  assert.match(loader, /where: \{ assets: \{ some: \{ auditItems: \{ some: \{ auditRoundId: roundId \} \} \} \} \},/)
  assert.match(loader, /select: \{ id: true, code: true, name: true \},/)
  assert.match(loader, /orderBy: \[\{ name: "asc" \}, \{ id: "asc" \}\],/)
  assert.doesNotMatch(loader, /isActive|\bin: /, "no active filter (a closed category keeps its name) and no id list (SQL Server's 2,100 parameters)")
  assert.match(read("src/lib/audit-scan-session.ts"), /^export type AuditScanCategory = \{ id: string; code: string; name: string \}$/m)
})

test("the header: back named กลับไปหน้ารอบ, the code over the name, x / y over ไม่ตรง N, then the round's PaceBar (spec §11, DESIGN.md Data Bars)", () => {
  const source = read(`${A}audit-scan-header.tsx`)
  assert.match(source, /<Link href=\{backHref\} aria-label=\{t\("backToRound"\)\} className=\{buttonVariants\(\{ variant: "ghost", size: "icon" \}\)\}>\s*<ArrowLeft className="size-5" aria-hidden="true" \/>/)
  const h1 = source.slice(source.indexOf("<h1"), source.indexOf("</h1>"))
  assert.match(h1, /<h1 className="min-w-0 flex-1 text-foreground">/)
  assert.match(h1, /<span className="block truncate text-base font-semibold md:text-xl">\{roundCode\}<\/span>\s*<span className="block truncate text-meta text-muted-foreground">\{roundName\}<\/span>/)
  assert.match(source, /<\/h1>\s*<p data-audit-scan-progress className="shrink-0 pr-1 text-right text-meta num text-muted-foreground">\s*<span className="block font-medium text-foreground">\{t\("progressCount", \{ checked, total \}\)\}<\/span>\s*<span className=\{cn\("block", progress\.mismatched > 0 && "font-medium text-warning"\)\}>\{t\("progressMismatch", \{ count: formatCount\(progress\.mismatched\) \}\)\}<\/span>\s*<\/p>/)
  assert.match(source, /const checked = formatCount\(progress\.checked\)\n\s+const total = formatCount\(progress\.total\)/)
  assert.match(source, /<PaceBar value=\{progress\.total === 0 \? 0 : progress\.checked \/ progress\.total\} pace=\{null\} label=\{t\("progressChecked", \{ checked, total \}\)\} behind=\{false\} \/>/)
  assert.doesNotMatch(source, /role="progressbar"|bg-success|md:hidden|sr-only|tCommon|useLocale/)
})

test("the room button reads ห้องนี้ตรวจแล้ว x / y · เหลือ z within the chosen department; the rows and the department options count the same way (bug 21, P3-R13)", () => {
  const source = read(`${A}audit-scan-room-picker.tsx`)
  assert.match(source, /const progress = selectAuditRoomProgress\(rooms, room\)/)
  const trigger = source.slice(source.indexOf("<SheetTrigger"), source.indexOf("</SheetTrigger>"))
  assert.match(trigger, /\{selected && progress \? \(/)
  assert.match(trigger, /<span className="block text-meta font-normal num">\s*\{t\("roomCheckedOfTotal", \{ checked: formatCount\(progress\.checked\), total: formatCount\(progress\.total\), pending: formatCount\(progress\.pending\) \}\)\}/)
  assert.match(trigger, /t\("roomChange"\)/)
  assert.match(trigger, /t\("roomPick"\)/)
  assert.match(source, /<span className="shrink-0 text-meta num text-muted-foreground">\s*\{t\("roomOptionCounts", \{ checked: formatCount\(option\.total - option\.pending\), total: formatCount\(option\.total\), pending: formatCount\(option\.pending\) \}\)\}/)
  assert.match(source, /\{t\("roomDepartmentOption", \{ department: department\.label, pending: formatCount\(department\.pending\), total: formatCount\(department\.total\) \}\)\}/)
  assert.doesNotMatch(source, /roomPendingOfTotal|\(\{department\.total\}\)/)
})

test("the switch names its scope, the chips are a shared Segmented in their own sideways row, and searching keeps only the switch (spec §11, decision 3, P3-R6, P3-R7)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /room: \{ pending: "tabPending", checked: "tabChecked", all: "tabAllRoom" \},\n\s+round: \{ pending: "tabPending", checked: "tabChecked", all: "tabAllRound" \},/)
  assert.match(source, /room: \{ pending: "emptyPending", checked: "emptyChecked", all: "emptyAll" \},\n\s+round: \{ pending: "emptyPending", checked: "emptyChecked", all: "emptyAllRound" \},/)
  assert.match(source, /\{t\(tabLabelKey\[scope\]\[key\]\)\}\n\s+<span className="num">\{formatCount\(counts\[key\]\)\}<\/span>/)
  // While a search runs, the switch stays above the results and nothing else of the list renders.
  const afterSwitch = source.slice(source.indexOf("{searching ? null : ("))
  assert.ok(source.indexOf('aria-label={t("roomListTabs")}') < source.indexOf("{searching ? null : ("), "the switch comes first")
  for (const part of ["data-audit-scan-categories", "data-audit-scan-row", 't("showMore")', "href={pendingHref}"]) assert.ok(afterSwitch.includes(part), part)
  // The chips: state, not a URL, so Segmented (TabNav is for links); not fill, so it scrolls inside its own row.
  assert.match(source, /<div data-audit-scan-categories className="mt-2 overflow-x-auto overscroll-x-contain">\s*<Segmented\s+aria-label=\{t\("categoryChipsLabel"\)\}\s+value=\{categoryId \?\? ""\}\s+onValueChange=\{\(next\) => onCategoryChange\(next \|\| null\)\}\s+size="md"\s+options=\{\[/)
  assert.match(source, /\{ value: "", label: <>\{t\("categoryAll"\)\}<span className="num">\{formatCount\(categories\.all\)\}<\/span><\/> \},/)
  assert.match(source, /\.\.\.categories\.chips\.map\(\(chip\) => \(\{ value: chip\.id, label: <>\{chip\.label\}<span className="num">\{formatCount\(chip\.count\)\}<\/span><\/> \}\)\),/)
  assert.equal(source.match(/<Segmented\b/g)?.length, 2, "the switch and the chips")
  assert.doesNotMatch(source, /aria-pressed|<TabNav|<ChoiceChip|<Chip\b/)
})

test("rows: the name in bold, the code under it, then the custodian and ส่วนควบ N, the checker's line and the badge kept (spec §11)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /<span className="block break-words text-sm font-semibold text-foreground">\{item\.name\}<\/span>\n\s+<span className="block text-meta text-muted-foreground"><span className="tag whitespace-normal break-all">\{item\.assetTag\}<\/span><\/span>/)
  assert.match(source, /const custodian = item\.expectedCustodianId \? custodianLabels\.get\(item\.expectedCustodianId\) \?\? null : null/)
  assert.match(source, /const components = item\.componentCount > 0 \? t\("rowComponents", \{ count: formatCount\(item\.componentCount\) \}\) : null/)
  assert.match(source, /return \[custodian, components\]\.filter\(Boolean\)\.join\(" · "\) \|\| null/)
  assert.match(source, /\{detail \? <span className="block truncate text-meta text-muted-foreground">\{detail\}<\/span> : null\}\n\s+\{checked \? <span className="block truncate text-meta text-muted-foreground">\{checked\}<\/span> : null\}/)
  assert.match(source, /<StatusBadge label=\{t\(badgeLabelKey\[badge\]\)\} tone=\{badgeTone\[badge\]\} className="shrink-0" \/>/)
})

test("the footer link counts the room's pending own items by place and names the room or the round (P3-R14)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /const pendingLinkKey = \{ room: "pendingLinkRoom", round: "pendingLinkRound" \} as const/)
  assert.match(source, /\{tab === "pending" && pendingHref && pendingCount > 0 \? \(\s*<Link\s+href=\{pendingHref\}\s+className=\{cn\(linkVariants\(\), "mt-3 inline-flex min-h-11 items-center md:min-h-0"\)\}\s*>\s*\{t\(pendingLinkKey\[scope\], \{ count: formatCount\(pendingCount\) \}\)\}/)
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const pendingLinkCount = useMemo\(\(\) => countAuditScanPendingForLink\(items, room\), \[items, room\]\)/)
  assert.match(workspace, /pendingHref=\{roomPendingHref\}\n\s+pendingCount=\{pendingLinkCount\}/)
})

test("the ตรวจแล้ว tab lists the recorded out-of-scope finds apart, with their badge, and a tap opens one through the lookup (P3-R25)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /\{tab === "checked" && recordedOutOfScope\.length > 0 \? \(\s*<section data-audit-scan-recorded-out-of-scope /)
  assert.match(source, /t\("recordedOutOfScopeTitle", \{ count: formatCount\(recordedOutOfScope\.length\) \}\)/)
  assert.match(source, /data-audit-scan-recorded-row\n\s+onClick=\{\(\) => onOpenRecorded\(item\)\}/)
  assert.match(source, /<StatusBadge label=\{t\(badgeLabelKey\.out_of_scope\)\} tone=\{badgeTone\.out_of_scope\} className="shrink-0" \/>/)
  const afterSwitch = source.slice(source.indexOf("{searching ? null : ("))
  assert.ok(afterSwitch.includes("data-audit-scan-recorded-out-of-scope"), "not while searching")
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const recordedOutOfScope = useMemo\(\(\) => listAuditScanRecordedOutOfScope\(items, \{ roomId: room\.locationId \}\), \[items, room\.locationId\]\)/)
  assert.match(workspace, /function openRecordedOutOfScope\(item: AuditScanItemRow\) \{\n\s+setDraft\(item\.assetTag\)\n\s+changeTerm\(item\.assetTag\)\n\s+void searchRegister\(item\.assetTag\)\n\s+\}/)
  assert.match(workspace, /recordedOutOfScope=\{recordedOutOfScope\}\n\s+onOpenRecorded=\{openRecordedOutOfScope\}/)
  // Counted apart: the tabs and the chips read buildRoomList and foldAuditScanCategoryChips, which take own items only.
  assert.doesNotMatch(workspace, /recordedOutOfScope\.length \+|\+ recordedOutOfScope\.length/)
})

test("search: the true total split by room, 10 at a time with แสดงเพิ่ม, the other-room line from the rule, and the lookup under the matches after the out-of-scope box (bug 20, P3-R5)", () => {
  const source = read(`${A}audit-scan-search.tsx`)
  assert.match(source, /const resultLine = scope === "room"\n\s+\? t\("searchResultInRoom", \{ term: term\.trim\(\), inRoom: formatCount\(search\.inRoom\), otherRooms: formatCount\(search\.otherRooms\) \}\)\n\s+: t\("searchResultInRound", \{ term: term\.trim\(\), count: formatCount\(search\.total\) \}\)/)
  assert.match(source, /const shown = matches\.slice\(0, limit\)/)
  assert.match(source, /\{shown\.map\(\(match\) => \{/)
  assert.match(source, /\{matches\.length > shown\.length \? \(\s*<Button variant="outline" onClick=\{onShowMore\} className="mt-2 w-full">\s*\{t\("showMore"\)\}/)
  assert.match(source, /const elsewhere = match\.elsewhere/)
  assert.match(source, /\{lookupAfterMatches \? <div className="mt-2">\{lookup\}<\/div> : null\}/)
  assert.match(source, /<section data-audit-scan-results className="mt-2">/)
  assert.doesNotMatch(source, /searchResultCount|room\.locationId|room: AuditScanRoom/)
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const \[searchLimit, setSearchLimit\] = useState\(auditScanSearchPageSize\)/)
  assert.match(workspace, /function changeTerm\(next: string\) \{\n\s+setTerm\(next\)\n\s+setSearchLimit\(auditScanSearchPageSize\)\n\s+setLookup\(\{ status: "idle" \}\)\n\s+\}/)
  assert.match(workspace, /onShowMore=\{\(\) => setSearchLimit\(\(current\) => current \+ auditScanSearchPageSize\)\}/)
  assert.match(workspace, /if \(search\.matches\.length > 0\) \{\n\s+openItem\(search\.matches\[0\]\.item, true\)/, "Enter opens the first match: an exact code wherever its room is, else the chosen room's first (P3-R17)")
  assert.doesNotMatch(workspace, /const matches = useMemo/)
  // The switch stays above the results: the list renders in search mode, the results under it.
  assert.match(workspace, /searching=\{searching\}\n\s+onTabChange=\{changeTab\}/)
  assert.match(workspace, /function changeTab\(next: AuditScanListTab\) \{\n\s+setTab\(next\)\n\s+setLimit\(auditScanListPageSize\)\n(?:\s+\/\/[^\n]*\n)*\s+if \(isAuditSearchReady\(term\)\) \{\n\s+setDraft\(""\)\n\s+changeTerm\(""\)\n\s+\}\n\s+\}/)
  assert.ok(workspace.indexOf("<AuditScanRoomList") < workspace.indexOf("<AuditScanSearchResults"), "the switch, then the results")
  assert.match(workspace, /title=\{search\.total > 0 \? t\("lookupNotListed"\) : undefined\}/)
  assert.match(read(`${A}audit-scan-lookup-card.tsx`), /<p className="text-sm font-medium text-foreground">\{title \?\? t\("searchNoResult"\)\}<\/p>/)
})

test("category chips: named from the categories prop, cleared on any room change, dropped when they leave the row (decision 3, P3-R6)", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const categoryNames = useMemo\(\(\) => new Map\(categories\.map\(\(category\) => \[category\.id, \{ code: category\.code, name: category\.name \}\]\)\), \[categories\]\)/)
  assert.match(workspace, /const categoryChips = useMemo\(\(\) => foldAuditScanCategoryChips\(items, \{ room, tab, names: categoryNames \}\), \[items, room, tab, categoryNames\]\)/)
  assert.match(workspace, /const roomKey = `\$\{room\.locationId\}\|\$\{room\.departmentId\}`/)
  assert.match(workspace, /if \(categoryChoice\.roomKey !== roomKey && categoryChoice\.categoryId !== null\) setCategoryChoice\(\{ roomKey, categoryId: null \}\)/, "a room change from another tab clears the choice, so a return to the first room starts at ทุกหมวดหมู่ (P3-R6)")
  assert.match(workspace, /const categoryId = resolveAuditScanCategory\(categoryChips, categoryChoice\.roomKey === roomKey \? categoryChoice\.categoryId : null\)/)
  assert.match(workspace, /const list = useMemo\(\(\) => buildRoomList\(\{ items, room, tab, limit, locationLabels, categoryId \}\), \[items, room, tab, limit, locationLabels, categoryId\]\)/)
  assert.match(workspace, /label: categoryNames\.get\(chip\.id\)\?\.name \?\? t\("categoryUnknown"\)/)
  assert.match(workspace, /\? \{ all: list\.counts\[tab\], chips: categoryChips\.map\(/, "ทุกหมวดหมู่ is the tab's count, which the chips add up to")
  const changeRoom = workspace.slice(workspace.indexOf("function changeRoom("), workspace.indexOf("function changeTab("))
  assert.match(changeRoom, /setCategoryChoice\(\{ roomKey: "", categoryId: null \}\)/)
  assert.match(workspace, /function changeCategory\(next: string \| null\) \{\n\s+setCategoryChoice\(\{ roomKey, categoryId: next \}\)\n\s+setLimit\(auditScanListPageSize\)\n\s+\}/)
  assert.match(workspace, /categories=\{categoryRow\}\n\s+categoryId=\{categoryId\}\n\s+onCategoryChange=\{changeCategory\}/)
})

test("the out-of-scope box is always shown and starts at the search with its hint (spec §11)", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /<ContentPanel>\s*<div data-audit-scan-out-of-scope className="flex flex-wrap items-center justify-between gap-2">\s*<p className="text-sm text-foreground">\{t\("outOfScopeBoxTitle"\)\}<\/p>\s*<Button variant="outline" size="md" onClick=\{startOutOfScopeFind\}>\s*\{t\("outOfScopeBoxAction"\)\}/)
  assert.ok(workspace.indexOf("data-audit-scan-out-of-scope") > workspace.indexOf("<div ref={listAreaRef}>"), "under the list and the results")
  assert.match(workspace, /function startOutOfScopeFind\(\) \{\n\s+setOutOfScopeHint\(true\)\n\s+inputRef\.current\?\.focus\(\)\n\s+\}/)
  assert.match(workspace, /hint=\{outOfScopeHint \? t\("outOfScopeHint"\) : null\}/)
  assert.match(workspace, /lookupAfterMatches=\{outOfScopeHint\}/)
  for (const name of ["function clearSearch", "function finishSave"]) {
    const start = workspace.indexOf(name)
    assert.match(workspace.slice(start, workspace.indexOf("\n  }\n", start)), /setOutOfScopeHint\(false\)/, name)
  }
  const search = read(`${A}audit-scan-search.tsx`)
  assert.match(search, /aria-describedby=\{hint \? hintId : undefined\}/)
  assert.match(search, /\{hint \? <p id=\{hintId\} className="mt-1 px-1 text-meta text-muted-foreground">\{hint\}<\/p> : null\}/)
})

test("the walk's words, Thai and English (glossary: ห้อง, หมวดหมู่, ส่วนควบ, นอกขอบเขต, พบตรง, Serial)", () => {
  const expected: Record<string, [string, string]> = {
    backToRound: ["กลับไปหน้ารอบ", "Back to the round"],
    progressCount: ["{checked} / {total}", "{checked} / {total}"],
    progressChecked: ["ตรวจแล้ว {checked} / {total}", "Checked {checked} / {total}"],
    roomCheckedOfTotal: ["ห้องนี้ตรวจแล้ว {checked} / {total} · เหลือ {pending}", "This room: {checked} / {total} checked · {pending} left"],
    roomOptionCounts: ["ตรวจแล้ว {checked} / {total} · เหลือ {pending}", "{checked} / {total} checked · {pending} left"],
    roomDepartmentOption: ["{department} · เหลือ {pending} / {total}", "{department} · {pending} of {total} left"],
    roomChange: ["เปลี่ยนห้อง", "Change room"],
    searchResultInRoom: ["ผลค้นหา \"{term}\": ในห้องนี้ {inRoom} · ห้องอื่น {otherRooms}", "Results for \"{term}\": {inRoom} in this room · {otherRooms} in other rooms"],
    searchResultInRound: ["ผลค้นหา \"{term}\": {count} รายการ", "Results for \"{term}\": {count}"],
    lookupNotListed: ["ไม่ใช่รายการข้างบน", "Not one of the above"],
    tabAllRoom: ["ทั้งห้อง", "Whole room"],
    tabAllRound: ["ทั้งรอบ", "Whole round"],
    emptyAllRound: ["ไม่มีรายการในรอบนี้", "No items in this round"],
    categoryChipsLabel: ["หมวดหมู่", "Category"],
    // P3-R16: the round page's word for the same filter (auditRound.categoryAll).
    categoryAll: ["ทุกหมวดหมู่", "All categories"],
    // P3-R19: spec §5's one word for the result, as the round page's chip (auditRound.found reads "Matched" in en).
    badgeFound: ["พบตรง", "Matched"],
    categoryUnknown: ["หมวดหมู่อื่น", "Other category"],
    rowComponents: ["ส่วนควบ {count}", "{count} components"],
    outOfScopeBoxTitle: ["เจอของที่ไม่อยู่ในรายการ?", "Found something that is not on the list?"],
    outOfScopeBoxAction: ["บันทึกนอกขอบเขต", "Record out of scope"],
    outOfScopeHint: ["พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน", "Type the tag or serial of what you found, then search the register"],
    // P3-R25: the ตรวจแล้ว tab's section of recorded out-of-scope finds, counted apart.
    recordedOutOfScopeTitle: ["บันทึกนอกขอบเขตแล้ว {count}", "Recorded out of scope {count}"],
    pendingLinkRoom: ["ของในห้องนี้ที่ยังหาไม่เจอ {count} รายการ →", "{count} items in this room not found yet →"],
    pendingLinkRound: ["ของในรอบนี้ที่ยังหาไม่เจอ {count} รายการ →", "{count} items in this round not found yet →"],
  }
  const th = messages("th")
  const en = messages("en")
  for (const [key, [thText, enText]] of Object.entries(expected)) {
    assert.equal(th[key], thText, `th ${key}`)
    assert.equal(en[key], enText, `en ${key}`)
  }
  for (const key of ["progress", "roomPendingOfTotal", "searchResultCount", "tabAll", "pendingLink"]) {
    assert.equal(th[key], undefined, `th ${key} is gone`)
    assert.equal(en[key], undefined, `en ${key} is gone`)
  }
})
