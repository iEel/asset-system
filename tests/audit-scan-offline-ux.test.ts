import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("audit scan tracks the connection and queues offline saves per asset", () => {
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")

  assert.match(workspace, /navigator\.onLine/)
  assert.match(workspace, /addEventListener\("online"/)
  assert.match(workspace, /addEventListener\("offline"/)
  assert.match(workspace, /upsertQueuedAuditScanAsync\(getStorage\(\), roundId, payload/)
  assert.match(workspace, /markQueuedAuditScanSyncFailed\(/)
  assert.match(workspace, /<AuditScanOfflineBar[\s\S]*?sending=\{sendingQueue\}/)
})

test("the offline bar shows failed entries with their last error and disables send while sending", () => {
  const bar = read("src/components/audit/audit-scan-offline-bar.tsx")

  assert.match(bar, /entry\.syncStatus === "failed"/)
  assert.match(bar, /entry\.lastSyncError/)
  assert.match(bar, /onClick=\{onSendNow\} disabled=\{sending\}/)
  assert.match(bar, /online && queue\.length > 0/)
})

test("audit scan offline UX copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    for (const key of ["offlineBarOffline", "offlineBarPending", "sendNow", "removeFromQueue", "queueFailed", "offlineQueued", "offlineQueuedWithPhotos"]) {
      assert.equal(typeof messages.auditScan[key], "string", key)
    }
  }
})
