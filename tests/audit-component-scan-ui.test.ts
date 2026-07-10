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
  assert.match(form, /openComponentMissingDialog/)
  assert.match(form, /submitComponentMissing/)
  assert.doesNotMatch(form, /window\.prompt/)
  assert.match(form, /confirmedWithParentAssetId/)
  assert.match(form, /componentConfirmationReason/)
  assert.match(form, /mark-not-found/)
  assert.match(form, /componentStatusConfirmedWithParent/)
})

test("audit scan form preserves and renders component context for out-of-scope assets", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /type AuditLookupComponent/)
  assert.match(form, /components:\s*AuditLookupComponent\[\]/)
  assert.match(form, /installedIn:\s*AuditLookupInstalledInParent\[\]/)
  assert.match(form, /function normalizeOutOfScopeAuditAsset/)
  assert.match(form, /components:\s*normalizeAuditLookupComponents\(asset\.components/)
  assert.match(form, /installedIn:\s*normalizeAuditLookupInstalledIn\(asset\.installedIn/)
  assert.match(form, /outOfScopeAsset\.installedIn\.length > 0/)
  assert.match(form, /outOfScopeAsset\.components\.length > 0/)
  assert.match(form, /components=\{outOfScopeAsset\.components\}/)
})

test("audit scan renders component work in the supporting region", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const supportingRegion = form.indexOf("data-audit-scan-supporting")
  const selectedComponents = form.indexOf("components={selectedItem.components}", supportingRegion)
  const outOfScopeComponents = form.indexOf("outOfScopeAsset.components.length > 0", supportingRegion)

  assert.ok(supportingRegion > -1)
  assert.ok(selectedComponents > supportingRegion)
  assert.ok(outOfScopeComponents > supportingRegion)
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
