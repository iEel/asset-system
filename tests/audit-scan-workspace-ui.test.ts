import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const workspace = () => read("src/components/audit/audit-scan-workspace.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("saving updates the rows in place, never reloads the round, vibrates and returns to the search box", () => {
  const source = workspace()
  assert.doesNotMatch(source, /router\.refresh\(/)
  assert.match(source, /setItems\(\(current\) => applyScanResult\(current, \{ item: result\.item, scannedByName: result\.scannedByName \}\)\)/)
  assert.match(source, /navigator\.vibrate\?\.\(30\)/)
  assert.match(source, /inputRef\.current\?\.focus\(\)/)
})

test("a save made after someone else checked the item is sent as a correction", () => {
  assert.match(workspace(), /const resultCorrection = getCheckMode\(row\) === "edit"/)
})

test("in-round photos upload after the result is saved; out-of-scope photos upload first as evidence", () => {
  const source = workspace()
  const inRound = source.slice(source.indexOf("async function submitCheck"), source.indexOf("async function submitOutOfScope"))
  assert.ok(inRound.indexOf("applyScanResult") > -1 && inRound.indexOf("applyScanResult") < inRound.indexOf("uploadPhotos("))
  const outOfScope = source.slice(source.indexOf("async function submitOutOfScope"))
  assert.ok(outOfScope.indexOf("evidenceAttachmentIds.push") < outOfScope.indexOf("/scan`"))
})

test("other auditors' changes are pulled every 30 seconds while visible, on return, and after saving", () => {
  const source = workspace()
  assert.match(source, /window\.setInterval\(tick, auditScanPollIntervalMs\)/)
  assert.match(source, /document\.visibilityState === "visible"/)
  assert.match(source, /scan-status\?since=\$\{encodeURIComponent\(serverTimeRef\.current\)\}/)
  assert.match(source, /mergeStatusUpdates\(current, payload\.items\)/)
})

test("offline saves queue one entry per asset and send themselves when the connection returns", () => {
  const source = workspace()
  assert.match(source, /upsertQueuedAuditScanAsync\(/)
  assert.match(source, /window\.addEventListener\("online", handleOnline\)/)
  assert.match(source, /void sendQueue\(\)/)
})

test("a closed round stops saving with a clear message instead of queueing", () => {
  const source = workspace()
  assert.match(source, /function isRoundClosedError\(/)
  assert.match(source, /setRoundClosed\(true\)/)
  assert.match(source, /t\("roundClosedError"\)/)
  assert.match(source, /t\("backToRound"\)/)
})

test("lookups use the scan-lookup endpoint and report offline separately from not found", () => {
  const source = workspace()
  assert.match(source, /\/scan-lookup`/)
  assert.doesNotMatch(source, /\/api\/search/)
  assert.match(source, /setLookup\(\{ status: "offline" \}\)/)
})

test("the saved banner names mismatched fields with the field-label words", () => {
  const source = read("src/components/audit/audit-scan-saved-banner.tsx")
  assert.match(source, /location: "expectedLocation"/)
  assert.match(source, /condition: "expectedCondition"/)
  assert.doesNotMatch(source, /wrongLocation|wrongCustodian|wrongDepartment|wrongCondition/)
})

test("returning to the tab pulls at most once per 5 seconds", () => {
  const source = workspace()
  assert.match(source, /^const visibilitySyncMinGapMs = 5_000$/m)
  assert.match(source, /lastSyncAtRef\.current = Date\.now\(\)/)
  assert.match(source, /document\.visibilityState === "visible" && Date\.now\(\) - lastSyncAtRef\.current >= visibilitySyncMinGapMs/)
})

test("focus lands on a list row after the sheet closes without a return target", () => {
  const source = workspace()
  assert.match(source, /<div ref=\{listAreaRef\}>/)
  assert.match(source, /returnRowIndexRef\.current = /)
  assert.match(source, /querySelectorAll<HTMLElement>\("\[data-audit-scan-row\]"\)/)
  assert.match(source, /function focusListAfterClose\(\)/)
  assert.match(source, /onReturnFocusMissing=\{focusListAfterClose\}/)
})

test("wide screens restore focus after dismissing or saving a list-opened item", () => {
  const source = workspace()
  const closeTarget = source.slice(source.indexOf("function closeTarget"), source.indexOf("function openOutOfScope"))
  assert.match(closeTarget, /setTarget\(null\)/)
  assert.match(closeTarget, /if \(isWide\)/)
  assert.match(closeTarget, /focusListAfterClose\(\)/)
  assert.match(source, /onDismiss=\{closeTarget\}/)
  assert.match(source, /if \(!open\) closeTarget\(\)/)
  const finishSave = source.slice(source.indexOf("function finishSave"), source.indexOf("async function uploadPhotos"))
  assert.match(finishSave, /else if \(isWide\) \{\s*\n\s*window\.setTimeout\(focusListAfterClose, 0\)/)
})

test("the open item is marked in the room list only on wide screens", () => {
  assert.match(workspace(), /activeItemId=\{isWide && target\?\.kind === "item" \? target\.item\.itemId : null\}/)
})

test("workspace copy exists in Thai and English", () => {
  const keys = ["savedAllMatch", "savedMismatch", "savedOutOfScope", "savedQueued", "editAgain", "photoRetryMessage", "retryPhotos", "offlineBarOffline", "offlineBarPending", "sendNow", "removeFromQueue", "queueFailed", "roundClosedError", "backToRound"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
})
