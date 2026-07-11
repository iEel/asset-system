import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getAssetDetailLoadPolicy } from "../src/lib/asset-detail-data.ts"

test("asset detail load policy expands only the history owned by the active view", () => {
  const overview = getAssetDetailLoadPolicy("overview")
  const custody = getAssetDetailLoadPolicy("custody")
  const operations = getAssetDetailLoadPolicy("operations")
  const audit = getAssetDetailLoadPolicy("audit")

  assert.deepEqual(overview, {
    movementLimit: 1,
    checkoutLimit: 1,
    maintenanceLimit: 1,
    auditItemLimit: 1,
    auditFindingLimit: 1,
    disposalLimit: 1,
    assignedLicenseLimit: 1,
  })
  assert.equal(custody.checkoutLimit, 10)
  assert.equal(custody.assignedLicenseLimit, 50)
  assert.equal(operations.movementLimit, 20)
  assert.equal(operations.checkoutLimit, 10)
  assert.equal(operations.maintenanceLimit, 10)
  assert.equal(operations.disposalLimit, 20)
  assert.equal(audit.auditItemLimit, 10)
  assert.equal(audit.auditFindingLimit, 20)
})

test("asset detail page applies the active-view load policy to bounded relations", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

  assert.match(source, /const loadPolicy = getAssetDetailLoadPolicy\(assetDetailView\)/)
  assert.match(source, /take: loadPolicy\.movementLimit/)
  assert.match(source, /take: loadPolicy\.checkoutLimit/)
  assert.match(source, /take: loadPolicy\.maintenanceLimit/)
  assert.match(source, /take: loadPolicy\.auditItemLimit/)
  assert.match(source, /take: loadPolicy\.auditFindingLimit/)
  assert.match(source, /take: loadPolicy\.disposalLimit/)
  assert.match(source, /take: loadPolicy\.assignedLicenseLimit/)
})

test("view-aware history limits keep the complete evidence reference index", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

  assert.match(source, /asset-detail\.evidence-references/)
  assert.match(source, /prisma\.assetCheckout\.findMany\([\s\S]*?select: \{ id: true, checkin: \{ select: \{ id: true \} \} \}/)
  assert.match(source, /prisma\.maintenanceTicket\.findMany\([\s\S]*?select: \{ id: true \}/)
  assert.match(source, /prisma\.auditFinding\.findMany\([\s\S]*?select: \{ id: true \}/)
  assert.match(source, /prisma\.disposalRequest\.findMany\([\s\S]*?select: \{ id: true \}/)
  assert.match(source, /evidenceCheckoutIds/)
  assert.match(source, /evidenceMaintenanceTicketIds/)
  assert.match(source, /evidenceAuditFindingIds/)
  assert.match(source, /evidenceDisposalRequestIds/)
})
