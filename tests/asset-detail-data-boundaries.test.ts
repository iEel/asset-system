import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { assetDetailComponentLinkWhere, assetDetailFileWhere, assetRepairRecordWhere, getAssetDetailLoadPolicy } from "../src/lib/asset-detail-data.ts"

// Group 1 asset detail task 7 (spec §7.3): each tab loads the rows today's sections need there and no more; the
// overview never loads a whole history. This policy is interim: Tasks 9-12 each replace their tab's load with their
// own loader (R24). Task 9 replaced the history limits: the history tab reads getAssetHistory under
// asset-detail.history-tab, so its view loads the preview, and the movement, audit item, finding and disposal
// relations left the main read with their limits.
test("asset detail load policy: one row per relation on the overview and the files tab, more only where a tab lists them", () => {
  const preview = { checkoutLimit: 1, assignedLicenseLimit: 1 }
  assert.deepEqual(getAssetDetailLoadPolicy("overview"), preview)
  assert.deepEqual(getAssetDetailLoadPolicy("files"), preview)
  assert.deepEqual(getAssetDetailLoadPolicy("history"), preview)
  assert.deepEqual(getAssetDetailLoadPolicy("components"), { ...preview, checkoutLimit: 10, assignedLicenseLimit: 50 })
  assert.deepEqual(getAssetDetailLoadPolicy("maintenance"), preview)
})

test("a tab's count and the records the tab lists share one where: the asset's files, its current component links both ways, its repair records (spec §7.3)", () => {
  assert.deepEqual(assetDetailFileWhere("a1"), { assetId: "a1", isActive: true, module: { in: ["asset", "asset_purchase"] } })
  assert.deepEqual(assetDetailComponentLinkWhere("a1"), { status: "installed", removedAt: null, OR: [{ parentAssetId: "a1" }, { componentAssetId: "a1" }] })
  assert.deepEqual(assetRepairRecordWhere("a1"), { assetId: "a1", isActive: true })
})

test("asset detail page applies the active-view load policy to bounded relations", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

  assert.match(source, /const loadPolicy = getAssetDetailLoadPolicy\(assetDetailView\)/)
  assert.match(source, /take: loadPolicy\.checkoutLimit/)
  assert.match(source, /take: loadPolicy\.assignedLicenseLimit/)
})

test("the files loader keeps the complete checkout and check-in index; the page reads no evidence references (group 1 asset detail task 11)", () => {
  const loader = readFileSync("src/lib/asset-files-data.ts", "utf8")
  const page = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  assert.match(loader, /prisma\.assetCheckout\.findMany\(\{\s*where: \{ assetId: asset\.id \},\s*select: \{ id: true, documentNo: true, checkins: \{ select: \{ id: true, documentNo: true \} \} \}/)
  assert.match(loader, /checkouts\.flatMap\(\(checkout\) => checkout\.checkins\.map/)
  assert.doesNotMatch(page, /asset-detail\.evidence-references|evidenceCheckoutReferences/)
})
