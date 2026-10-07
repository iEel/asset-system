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
  assert.match(source, /aria-pressed=\{tab === key\}/)
  assert.match(source, /data-audit-scan-row/)
  assert.match(source, /min-h-14/)
  assert.match(source, /queuedAssetIds\.has\(item\.assetId\)/)
  assert.match(source, /t\("showMore"\)/)
  assert.match(source, /href=\{pendingHref\}/)
})

test("room and list copy exists in Thai and English", () => {
  const keys = ["progressChecked", "progressMismatch", "roomPick", "roomChange", "roomSheetTitle", "roomSheetHelp", "roomSheetSearch", "roomPendingOfTotal", "roomDepartment", "roomAllDepartments", "roomClear", "roomListLabel", "tabPending", "tabChecked", "tabAll", "showMore", "checkedBy", "badgeFound", "badgeMismatch", "badgeNotFound", "badgeOutOfScope", "badgeQueued", "emptyPending", "emptyChecked", "emptyAll", "pendingLink"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
  assert.equal(messages("th").roomPick, "เลือกห้องที่กำลังตรวจ")
})
