import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit scan page passes component relationships to the client form", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx", "utf8")

  assert.match(page, /parentComponents/)
  assert.match(page, /installedInLinks/)
  assert.match(page, /buildAuditScanComponentRows/)
  assert.match(page, /components:/)
  assert.match(page, /installedIn:/)
})

test("audit scan form renders installed component panel and confirmation actions", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /type AuditScanComponent/)
  assert.match(form, /function AuditComponentPanel/)
  assert.match(form, /confirmComponentWithParent/)
  assert.match(form, /markComponentMissing/)
  assert.match(form, /confirmedWithParentAssetId/)
  assert.match(form, /componentConfirmationReason/)
  assert.match(form, /mark-not-found/)
  assert.match(form, /componentStatusConfirmedWithParent/)
})

test("audit scan component UI copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.componentsPanelTitle, "string")
    assert.equal(typeof messages.auditScan.componentsPanelHelp, "string")
    assert.equal(typeof messages.auditScan.componentStatusPending, "string")
    assert.equal(typeof messages.auditScan.componentStatusScanned, "string")
    assert.equal(typeof messages.auditScan.componentStatusConfirmedWithParent, "string")
    assert.equal(typeof messages.auditScan.componentConfirmWithParent, "string")
    assert.equal(typeof messages.auditScan.componentScanQr, "string")
    assert.equal(typeof messages.auditScan.componentMissing, "string")
    assert.equal(typeof messages.auditScan.componentMissingRemark, "string")
    assert.equal(typeof messages.auditScan.componentMissingDefaultRemark, "string")
    assert.equal(typeof messages.auditScan.componentMissingSaved, "string")
    assert.equal(typeof messages.auditScan.installedInParentNotice, "string")
  }
})
