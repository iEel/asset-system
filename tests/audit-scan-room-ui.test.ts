import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the room is remembered per round and survives private browsing", () => {
  const source = read("src/components/audit/use-audit-scan-room.ts")
  assert.match(source, /useSyncExternalStore\(/)
  assert.match(source, /buildAuditScanContextStorageKey\(roundId\)/)
  assert.match(source, /memoryStore/)
  assert.match(source, /\(\) => emptyAuditScanContext/)
})

test("the header is compact: one-line round name and a progress bar with counts", () => {
  const source = read("src/components/audit/audit-scan-header.tsx")
  assert.match(source, /truncate/)
  assert.match(source, /role="progressbar"/)
  assert.match(source, /t\("progressChecked", \{/)
  assert.doesNotMatch(source, /sticky/)
})

test("the header is one line: back, the round code (full name for screen readers) and the counts, then a thin bar (D5)", () => {
  const source = read("src/components/audit/audit-scan-header.tsx")
  assert.match(source, /roundCode: string/)
  const h1 = source.slice(source.indexOf("<h1"), source.indexOf("</h1>"))
  assert.match(h1, /title=\{roundName\}/)
  assert.match(h1, /<span aria-hidden="true" className="md:hidden">\{roundCode\}<\/span>/)
  assert.match(h1, /<span className="sr-only md:not-sr-only">\{roundName\}<\/span>/)
  // The counts sit on the same row as the back link and the h1, before the progress bar.
  const row = source.slice(source.indexOf("<Link"), source.indexOf('role="progressbar"'))
  assert.match(row, /<\/h1>\s*<p[^>]*shrink-0[^>]*>[\s\S]*t\("progressChecked", \{[\s\S]*t\("progressMismatch", \{/)
  assert.match(source, /className="h-1 overflow-hidden rounded-full bg-muted"/)
  assert.doesNotMatch(source, /h-1\.5/)
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /<AuditScanHeader roundName=\{roundName\} roundCode=\{roundCode\} backHref=\{backHref\} progress=\{progress\} \/>/)
  assert.match(read("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx"), /roundCode=\{round\.auditNo\}/)
})

test("the room button shows the chosen room with its pending count and a change cue (D5)", () => {
  const source = read("src/components/audit/audit-scan-room-picker.tsx")
  const trigger = source.slice(source.indexOf("<SheetTrigger"), source.indexOf("</SheetTrigger>"))
  assert.match(trigger, /t\("roomPendingOfTotal", \{ pending: selected\.pending, total: selected\.total \}\)/)
  assert.match(trigger, /t\("roomChange"\)/)
  assert.match(trigger, /t\("roomPick"\)/)
})

test("the room hook tells whether this round has a stored choice, and \"no room\" is stored too (D7)", () => {
  const source = read("src/components/audit/use-audit-scan-room.ts")
  // Server render assumes a choice exists so the picker never opens before hydration reads storage.
  assert.match(source, /const hasStoredRoom = useSyncExternalStore\(subscribe, \(\) => readRaw\(storageKey\) !== null, \(\) => true\)/)
  assert.match(source, /return \[room, setRoom, hasStoredRoom\] as const/)
  // setRoom writes every choice, the empty one included.
  const setRoom = source.slice(source.indexOf("const setRoom"))
  assert.match(setRoom, /const raw = JSON\.stringify\(normalizeAuditScanContext\(next\)\)/)
  assert.doesNotMatch(setRoom, /if \(!next\.locationId/)
})

test("the room picker opens once on the first visit of a round with several rooms and no stored choice (D7)", () => {
  const picker = read("src/components/audit/audit-scan-room-picker.tsx")
  assert.doesNotMatch(picker, /useState\(false\)/, "the workspace owns the open state")
  assert.match(picker, /<Sheet open=\{open\} onOpenChange=\{\(next\) => \{ onOpenChange\(next\); if \(!next\) setQuery\(""\) \}\}>/)
  assert.match(picker, /onRoomChange\(next\)\n\s+onOpenChange\(false\)/)
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /const \[room, setRoom, hasStoredRoom\] = useAuditScanRoom\(roundId\)/)
  // A visit that starts on an asset's check sheet does not stack the picker on top of it.
  assert.match(workspace, /const \[roomPickerDismissed, setRoomPickerDismissed\] = useState\(initialTarget !== null\)/)
  assert.match(workspace, /const roomPickerOpen = roomPickerRequested \|\| \(!roomPickerDismissed && !hasStoredRoom && roomOptions\.length > 1\)/)
  assert.match(workspace, /function changeRoomPickerOpen\(next: boolean\) \{\n\s+setRoomPickerRequested\(next\)\n\s+if \(!next\) setRoomPickerDismissed\(true\)\n\s+\}/)
  assert.match(workspace, /<AuditScanRoomPicker room=\{room\} rooms=\{roomOptions\} open=\{roomPickerOpen\} onOpenChange=\{changeRoomPickerOpen\} onRoomChange=\{changeRoom\} \/>/)
  assert.doesNotMatch(workspace, /useEffect\(\(\) => \{[^}]*setRoomPicker/, "derived, not set in an effect")
})

test("room list rows show tag, name and the full room on its own line (D6)", () => {
  const source = read("src/components/audit/audit-scan-room-list.tsx")
  assert.doesNotMatch(source, /function secondLine/)
  assert.match(source, /<span className="block truncate text-sm text-foreground"><span className="tag font-medium">\{item\.assetTag\}<\/span><\/span>/)
  assert.match(source, /<span className="block truncate text-meta text-foreground">\{item\.name\}<\/span>/)
  assert.match(source, /const place = showLocation \? locationLabels\.get\(item\.expectedLocationId\) \?\? item\.expectedLocationId : null/)
  assert.match(source, /\{place \? <span data-audit-scan-row-room className="block break-words text-meta text-muted-foreground">\{place\}<\/span> : null\}/)
  assert.doesNotMatch(source.slice(source.indexOf("data-audit-scan-row-room")).split("\n")[0], /truncate/)
})

test("the room picker is a sheet with search, pending counts, department and a clear option", () => {
  const source = read("src/components/audit/audit-scan-room-picker.tsx")
  assert.match(source, /<SheetTrigger asChild>/)
  assert.match(source, /side=\{isDesktop \? "right" : "bottom"\}/)
  assert.match(source, /t\("roomPendingOfTotal", \{ pending: option\.pending, total: option\.total \}\)/)
  assert.match(source, /t\("roomAllDepartments"\)/)
  assert.match(source, /choose\(\{ locationId: "", departmentId: "" \}\)/)
  assert.match(source, /min-h-11/)
})

test("the room list has three counted tabs, 44px rows, show-more and a link to the pending page", () => {
  const source = read("src/components/audit/audit-scan-room-list.tsx")
  assert.match(source, /\(\["pending", "checked", "all"\] as const\)/)
  assert.match(source, /<Segmented[\s\S]*?value=\{tab\}[\s\S]*?onValueChange=\{onTabChange\}/)
  assert.match(source, /data-audit-scan-row/)
  assert.match(source, /min-h-14/)
  assert.match(source, /queuedAssetIds\.has\(item\.assetId\)/)
  assert.match(source, /t\("showMore"\)/)
  assert.match(source, /href=\{pendingHref\}/)
})

test("opening the room picker focuses a room, not the search box, so the phone keyboard stays down", () => {
  const source = read("src/components/audit/audit-scan-room-picker.tsx")
  assert.match(source, /<ul ref=\{listRef\}/)
  assert.match(source, /onOpenAutoFocus=\{\(event\) => \{\s*(?:\/\/[^\n]*\n\s*)?event\.preventDefault\(\)/)
  assert.match(source, /querySelector<HTMLButtonElement>\('button\[aria-pressed="true"\]'\) \?\? list\?\.querySelector<HTMLButtonElement>\("button"\)\)\?\.focus\(\)/)
  assert.doesNotMatch(source, /autoFocus/)
})

test("the room list marks the row whose check panel is open", () => {
  const source = read("src/components/audit/audit-scan-room-list.tsx")
  assert.match(source, /activeItemId\?: string \| null/)
  assert.match(source, /const active = item\.itemId === activeItemId/)
  assert.match(source, /aria-current=\{active \? "true" : undefined\}/)
  assert.match(source, /active && "bg-accent"/)
  assert.match(source, /hover:bg-accent/)
})

test("room and list copy exists in Thai and English", () => {
  const keys = ["progressChecked", "progressMismatch", "roomPick", "roomChange", "roomSheetTitle", "roomSheetHelp", "roomSheetSearch", "roomPendingOfTotal", "roomDepartment", "roomAllDepartments", "roomClear", "roomListLabel", "roomListTabs", "tabPending", "tabChecked", "tabAll", "showMore", "checkedBy", "badgeFound", "badgeMismatch", "badgeNotFound", "badgeOutOfScope", "badgeQueued", "emptyPending", "emptyChecked", "emptyAll", "pendingLink"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
  assert.equal(messages("th").roomPick, "เลือกห้องที่กำลังตรวจ")
})

test("the room hook prefers the memory copy when storage is read-only and drops it after a real write", () => {
  const source = read("src/components/audit/use-audit-scan-room.ts")
  const readRaw = source.slice(source.indexOf("function readRaw"), source.indexOf("function readRoom"))
  const memoryAt = readRaw.search(/memoryStore\.has\(storageKey\)/)
  const storageAt = readRaw.search(/localStorage\.getItem/)
  assert.ok(memoryAt >= 0, "readRaw checks memoryStore")
  assert.ok(storageAt > memoryAt, "readRaw checks memoryStore before localStorage")
  const setRoom = source.slice(source.indexOf("const setRoom"))
  assert.match(setRoom, /localStorage\.setItem\(storageKey, raw\)\s*\n\s*memoryStore\.delete\(storageKey\)/)
})

test("the room list tab group has its own label", () => {
  const source = read("src/components/audit/audit-scan-room-list.tsx")
  assert.match(source, /<Segmented[\s\S]*?aria-label=\{t\("roomListTabs"\)\}/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).roomListTabs, "string", locale)
  }
  assert.equal(messages("th").roomListTabs, "สถานะรายการ")
})

test("the room sheet takes its X name and header from Sheet, the department is a shared field and clearing sits in a footer (2C batch 3)", () => {
  const source = read("src/components/audit/audit-scan-room-picker.tsx")
  assert.doesNotMatch(source, /closeLabel=|<SheetHeader className=|tCommon|<select\b|<label\b/)
  assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{t\("roomSheetTitle"\)\}<\/SheetTitle>/)
  assert.match(source, /<Field label=\{t\("roomDepartment"\)\}>\n\s+<NativeSelect\n\s+value=\{room\.departmentId\}/)
  assert.match(source, /<SheetFooter className="border-t border-border-soft bg-background px-4 py-3">\n\s+<Button variant="outline" onClick=\{\(\) => choose\(\{ locationId: "", departmentId: "" \}\)\} className="w-full">\n\s+\{t\("roomClear"\)\}\n\s+<\/Button>\n\s+<\/SheetFooter>/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "the room search stays as it is (spec O20)")
  assert.match(source, /<input\n\s+type="search"\n\s+value=\{query\}\n\s+onChange=\{\(event\) => setQuery\(event\.target\.value\)\}\n\s+placeholder=\{t\("roomSheetSearch"\)\}\n\s+aria-label=\{t\("roomSheetSearch"\)\}\n\s+className=\{getFieldControlClasses\(\)\}\n\s+\/>/)
})
