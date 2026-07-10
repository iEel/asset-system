import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const assetDetailSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

test("asset detail uses one tab navigation and view guards for grouped content", () => {
  const source = assetDetailSource()

  assert.match(source, /AssetDetailTabs/)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "overview"\)/)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "components"\)/)
  assert.doesNotMatch(source, /sectionLinks\.map/)
})

test("asset detail keeps secondary actions in the More menu and caps mobile actions", () => {
  const source = assetDetailSource()

  assert.match(source, /AssetDetailActionMenu/)
  assert.match(source, /mobileActionCandidates\.slice\(0, 3\)/)
  assert.match(source, /hasPermission\(user, "asset", "edit"\)/)
})

test("asset detail exposes a read-only component summary and manager link", () => {
  const source = assetDetailSource()

  assert.match(source, /AssetComponentsSummary/)
  assert.match(source, /assets\/\$\{asset\.id\}\/components/)
  assert.doesNotMatch(source, /<AssetComponentsPanel/)
})

test("asset edit does not mount another component installation editor", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx", "utf8")

  assert.doesNotMatch(source, /AssetComponentsPanel/)
  assert.doesNotMatch(source, /availableComponentAssets/)
})
