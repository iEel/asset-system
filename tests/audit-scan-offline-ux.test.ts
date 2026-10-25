import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("audit scan tracks the connection and queues offline saves per asset", () => {
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")

  assert.match(workspace, /navigator\.onLine/)
  assert.match(workspace, /addEventListener\("online"/)
  assert.match(workspace, /const online = useOnlineStatus\(\)/)
  assert.match(workspace, /upsertQueuedAuditScanAsync\(getStorage\(\), roundId, payload/)
  assert.match(workspace, /markQueuedAuditScanSyncFailed\(/)
  assert.match(workspace, /<AuditScanOfflineBar[\s\S]*?sending=\{sendingQueue\}/)
})

test("the offline bar shows failed entries with their last error and keeps send busy while sending", () => {
  const bar = read("src/components/audit/audit-scan-offline-bar.tsx")

  assert.match(bar, /entry\.syncStatus === "failed"/)
  assert.match(bar, /entry\.lastSyncError/)
  assert.match(bar, /busy=\{sending\} onClick=\{onSendNow\}/)
  assert.match(bar, /online && queue\.length > 0/)
})

test("audit scan offline UX copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    for (const key of ["bannerQueued", "offlineBarPending", "sendNow", "removeFromQueue", "queueFailed", "offlineQueued", "offlineQueuedWithPhotos"]) {
      assert.equal(typeof messages.auditScan[key], "string", key)
    }
  }
})

test("the queue sends only the signed-in person's checks; a 401 keeps the item and signs out once the send stops", () => {
  const w = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(w, /if \(!canSendQueuedAuditScan\(queued, currentUser\.id\)\) continue/)
  assert.match(w, /if \(response\.status === 401\) \{\n\s+sessionLost = true\n\s+break\n\s+\}\n\s+const result = await response\.json\(\)/)
  assert.match(w, /const releaseRedirect = holdSessionExpiryRedirect\(\)/)
  assert.match(w, /releaseRedirect\(\)\n\s+if \(sessionLost\) redirectToSessionExpiredLogin\(locale\)/)
  assert.match(w, /upsertQueuedAuditScanAsync\(getStorage\(\), roundId, payload, \{ photos: photos\.map\(toAuditOfflinePhoto\), queuedBy: currentUser \}\)/)
  assert.match(w, /if \(response\.status === 401\) \{\n\s+await queueOffline\(payload, submission\.photos\)\n\s+finishSave\(\{ \.\.\.notice, queued: true \}, false\)\n\s+setSaving\(false\)\n\s+redirectToSessionExpiredLogin\(locale\)\n\s+return\n\s+\}/)
  assert.match(w, /queue=\{sendableQueue\}/); assert.match(w, /held=\{heldQueue\}/)
  assert.match(read("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx"), /currentUser=\{\{ id: user\.id, name: user\.name \}\}/)
  const bar = read("src/components/audit/audit-scan-offline-bar.tsx")
  assert.match(bar, /t\("queueHeldForUser", \{ name: entry\.name, count: entry\.count \}\)/)
  assert.doesNotMatch(bar, /onRemove\(entry\.userId\)/)
  for (const [locale, text] of [["th", "ผลตรวจของ {name} {count} รายการ จะส่งเมื่อ {name} เข้าสู่ระบบในเครื่องนี้"], ["en", "{count, plural, one {# check} other {# checks}} by {name} will be sent when {name} signs in on this device"]])
    assert.equal(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan.queueHeldForUser, text, locale)
})
