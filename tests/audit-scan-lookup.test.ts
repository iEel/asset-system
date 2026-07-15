import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const lookupRoutePath = "src/app/api/audit-rounds/[id]/scan-lookup/route.ts"

test("audit scan uses a dedicated lookup route instead of global search for out-of-scope assets", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const types = readFileSync("src/components/audit/audit-scan-types.ts", "utf8")

  assert.match(form, /\/api\/audit-rounds\/\$\{roundId\}\/scan-lookup/)
  assert.doesNotMatch(form, /fetch\(`\/api\/search\?q=/)
  assert.match(types, /export type AuditScanLookupResponse/)
  assert.doesNotMatch(form, /^type AuditScanLookupResponse =/m)
})

test("audit scan lookup resolves QR asset ids under audit permissions", () => {
  assert.equal(existsSync(lookupRoutePath), true, "missing audit scan lookup route")

  const route = readFileSync(lookupRoutePath, "utf8")

  assert.match(route, /requirePermission\(user,\s*"audit",\s*"edit"\)/)
  assert.doesNotMatch(route, /requirePermission\(user,\s*"asset",\s*"view"\)/)
  assert.match(route, /extractAssetLookupCandidatesFromScanValue\(input\.rawValue\)/)
  assert.match(route, /id:\s*\{\s*in:\s*candidates/)
  assert.match(route, /assetTag:\s*\{\s*in:\s*candidates/)
  assert.match(route, /serialNumber:\s*\{\s*in:\s*candidates/)
  assert.match(route, /fixedAssetCode:\s*\{\s*in:\s*candidates/)
  assert.match(route, /auditRoundId_assetId/)
  assert.match(route, /status:\s*"out_of_scope"/)
  assert.match(route, /status:\s*"unknown_asset"/)
})
