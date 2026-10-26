import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { assetDetailComponentLinkWhere, assetDetailFileWhere, assetRepairRecordWhere, getAssetDetailLoadPolicy } from "../src/lib/asset-detail-data.ts"

// Group 1 asset detail task 7 (spec §7.3): each tab loads the rows today's sections need there and no more; the
// overview never loads a whole history. This policy is interim: the history and maintenance limits are the old
// operations and audit views', and Tasks 9-12 each replace their tab's load with their own loader (R24); nothing
// renders the disposal requests or the findings, so they stay at one row.
test("asset detail load policy: one row per relation on the overview and the files tab, more only where a tab lists them", () => {
  const preview = { movementLimit: 1, checkoutLimit: 1, maintenanceLimit: 1, auditItemLimit: 1, auditFindingLimit: 1, disposalLimit: 1, assignedLicenseLimit: 1 }
  assert.deepEqual(getAssetDetailLoadPolicy("overview"), preview)
  assert.deepEqual(getAssetDetailLoadPolicy("files"), preview)
  assert.deepEqual(getAssetDetailLoadPolicy("history"), { ...preview, movementLimit: 20, checkoutLimit: 10, maintenanceLimit: 10, auditItemLimit: 10 })
  assert.deepEqual(getAssetDetailLoadPolicy("components"), { ...preview, checkoutLimit: 10, assignedLicenseLimit: 50 })
  assert.deepEqual(getAssetDetailLoadPolicy("maintenance"), { ...preview, maintenanceLimit: 10 })
})

test("a tab's count and the records the tab lists share one where: the asset's files, its current component links both ways, its repair records (spec §7.3)", () => {
  assert.deepEqual(assetDetailFileWhere("a1"), { assetId: "a1", isActive: true, module: { in: ["asset", "asset_purchase"] } })
  assert.deepEqual(assetDetailComponentLinkWhere("a1"), { status: "installed", removedAt: null, OR: [{ parentAssetId: "a1" }, { componentAssetId: "a1" }] })
  assert.deepEqual(assetRepairRecordWhere("a1"), { assetId: "a1", isActive: true })
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

test("the handover evidence keeps its complete checkout index; the drawer's repair, finding and disposal evidence queries are gone (group 1 asset detail task 8)", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

  assert.match(source, /asset-detail\.evidence-references/)
  assert.match(source, /prisma\.assetCheckout\.findMany\([\s\S]*?select: \{ id: true, checkins: \{ select: \{ id: true \} \} \}/)
  assert.match(source, /evidenceCheckoutReferences\.flatMap\(\(checkout\) => checkout\.checkins\.map/)
  assert.doesNotMatch(source, /evidenceMaintenanceTicketIds|evidenceAuditFindingIds|evidenceDisposalRequestIds|module: "maintenance"|module: "audit_finding"|module: "disposal"/)
})
