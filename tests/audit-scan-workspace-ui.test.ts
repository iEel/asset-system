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

test("workspace copy exists in Thai and English", () => {
  const keys = ["savedAllMatch", "savedMismatch", "savedOutOfScope", "savedQueued", "editAgain", "photoRetryMessage", "retryPhotos", "offlineBarOffline", "offlineBarPending", "sendNow", "removeFromQueue", "queueFailed", "roundClosedError", "backToRound"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
})
