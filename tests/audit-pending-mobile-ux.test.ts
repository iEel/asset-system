import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit pending page exposes mobile-first searchable pending cards", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx", "utf8")

  assert.match(page, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; search\?: string \| string\[\] \}>/)
  assert.match(page, /const \{ search = "" \} = rawSearchParams/)
  assert.match(page, /const searchText = resolveFirstSearchParam\(search\)\.trim\(\)/)
  assert.match(page, /assetTag: \{ contains: searchText \}/)
  assert.match(page, /currentLocation: \{\s*OR: \[/)
  assert.match(page, /custodian: \{\s*OR: \[/)
  assert.match(page, /MasterDataSearch/)
  assert.match(page, /hiddenInputs=\{\{ returnTo: returnToHref \}\}/)
  assert.match(page, /const scanReturnToHref = resolveAuditPendingScanReturnTo/)
  assert.match(page, /scanReturnToHref=\{scanReturnToHref\}/)
  assert.match(page, /normalizeAuditRoundDetailReturnTo/)
  assert.match(page, /getMobileCardListClasses/)
  assert.match(page, /getDesktopTableOnlyClasses/)
  assert.match(page, /function AuditPendingMobileCard/)
  assert.match(page, /const scanHref = buildAuditPendingScanHref/)
  assert.match(page, /variant="button"/)
  assert.match(page, /t\("scanPendingAsset"\)/)
})

test("audit pending page keeps desktop table and empty states", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx", "utf8")

  assert.match(page, /<table className="min-w-full divide-y divide-border text-sm">/)
  assert.match(page, /ActionEmptyState/)
  assert.match(page, /emptyTitle/)
  assert.match(page, /emptySearchTitle/)
  assert.match(page, /clearSearchHref/)
})

test("audit pending mobile copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditPending.subtitle, "string")
    assert.equal(typeof messages.auditPending.searchPlaceholder, "string")
    assert.equal(typeof messages.auditPending.pendingCount, "string")
    assert.equal(typeof messages.auditPending.scanPendingAsset, "string")
    assert.equal(typeof messages.auditPending.viewAsset, "string")
    assert.equal(typeof messages.auditPending.emptyTitle, "string")
    assert.equal(typeof messages.auditPending.emptyHelp, "string")
    assert.equal(typeof messages.auditPending.emptySearchTitle, "string")
    assert.equal(typeof messages.auditPending.emptySearchHelp, "string")
    assert.equal(typeof messages.auditPending.clearSearch, "string")
  }
})