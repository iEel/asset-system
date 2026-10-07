import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const page = () => readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx", "utf8").replace(/\r\n/g, "\n")

test("the scan page loads slim rows and renders the workspace", () => {
  const source = page()
  assert.match(source, /loadAuditScanRows\(id\)/)
  assert.match(source, /<AuditScanWorkspace/)
  assert.match(source, /initialServerTime=\{serverTime\.toISOString\(\)\}/)
  assert.match(source, /initialAssetId=\{resolveFirstSearchParam\(rawSearchParams\.assetId\)\}/)
  assert.doesNotMatch(source, /parentComponents|installedInLinks|AuditScanForm|auditScanHistory/)
})

test("the scan page keeps its URL contract and timing labels", () => {
  const source = page()
  assert.match(source, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; assetId\?: string \| string\[\]; mode\?: string \| string\[\] \}>/)
  assert.match(source, /"audit-scan\.initial-data"/)
  assert.match(source, /"audit-scan\.checklist-data"/)
  assert.match(source, /normalizeAuditRoundDetailReturnTo\(locale, round\.id, rawSearchParams\.returnTo\)/)
})

test("the old 2,000-line form is gone and nothing imports it", () => {
  assert.equal(existsSync("src/components/audit/audit-scan-form.tsx"), false)
})

test("the pending list link returns to the scan page, which returns to the round", () => {
  const source = page()
  assert.match(source, /const scanHref = appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/scan`, returnToHref\)/)
  assert.match(source, /const pendingHref = appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/pending`, scanHref\)/)
  assert.match(source, /pendingHref=\{pendingHref\}/)
})
