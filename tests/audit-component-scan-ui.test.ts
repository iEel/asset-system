import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the scan page no longer preloads component relationships; the workspace loads them per asset", () => {
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx")
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")

  assert.doesNotMatch(page, /parentComponents|installedInLinks|buildAuditScanComponentRows/)
  assert.match(workspace, /const loadComponents = useCallback\(async \(assetId: string\) =>/)
  assert.match(workspace, /fetch\(`\/api\/audit-rounds\/\$\{roundId\}\/scan-lookup`/)
  assert.match(workspace, /components: normalizeAuditLookupComponents\(payload\.asset\.components\)/)
  assert.match(workspace, /installedIn: normalizeAuditLookupInstalledIn\(payload\.asset\.installedIn\)/)
  assert.match(workspace, /void loadComponents\(item\.assetId\)/)
})

test("the check form renders the installed component panel with its confirmation actions wired", () => {
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  const panels = read("src/components/audit/audit-scan-panels.tsx")
  const types = read("src/components/audit/audit-scan-types.ts")

  assert.match(types, /export type AuditScanComponent/)
  assert.match(panels, /export function AuditComponentPanel/)
  assert.match(panels, /componentStatusConfirmedWithParent/)
  assert.match(form, /<AuditComponentPanel/)
  assert.match(form, /onScanComponent=\{onScanComponent\}/)
  assert.match(form, /onConfirmWithParent=\{\(component\) => onConfirmComponent\(component, \{ values, remark \}\)\}/)
  assert.match(form, /onMarkMissing=\{onMarkComponentMissing\}/)
  assert.match(workspace, /onConfirmComponent=\{\(component, context\) => void confirmComponent\(component, context\)\}/)
  assert.match(workspace, /onScanComponent=\{scanComponent\}/)
  assert.match(workspace, /setMissingComponent\(component\)/)
  assert.match(workspace, /submitComponentMissing/)
  assert.doesNotMatch(form, /window\.prompt/)
  assert.doesNotMatch(workspace, /window\.prompt/)
  assert.match(workspace, /confirmedWithParentAssetId/)
  assert.match(workspace, /componentConfirmationReason/)
  assert.match(workspace, /mark-not-found/)
})

test("out-of-scope assets keep their component context from the lookup", () => {
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  const types = read("src/components/audit/audit-scan-types.ts")

  assert.match(types, /export type AuditLookupComponent/)
  assert.match(types, /components:\s*AuditLookupComponent\[\]/)
  assert.match(types, /installedIn:\s*AuditLookupInstalledInParent\[\]/)
  assert.match(workspace, /function openOutOfScope\(asset: AuditLookupAsset\)[\s\S]*?components: normalizeAuditLookupComponents\(asset\.components\), installedIn: normalizeAuditLookupInstalledIn\(asset\.installedIn\)/)
  assert.match(form, /components\.installedIn\.length > 0/)
  assert.match(form, /components\.components\.length > 0/)
  assert.match(form, /components=\{components\.components\}/)
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
