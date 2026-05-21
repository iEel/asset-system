import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit scan offline banner exposes connection and failed sync state", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /navigator\.onLine/)
  assert.match(form, /addEventListener\("online"/)
  assert.match(form, /addEventListener\("offline"/)
  assert.match(form, /failedOfflineQueueCount/)
  assert.match(form, /lastOfflineQueueError/)
  assert.match(form, /disabled=\{saving \|\| !online\}/)
})

test("audit scan offline UX copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.networkOnline, "string")
    assert.equal(typeof messages.auditScan.networkOffline, "string")
    assert.equal(typeof messages.auditScan.offlineQueueOfflineHelp, "string")
    assert.equal(typeof messages.auditScan.offlineQueueFailedHelp, "string")
    assert.equal(typeof messages.auditScan.offlineQueueDetails, "string")
    assert.equal(typeof messages.auditScan.offlineQueueLastError, "string")
  }
})
