import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("the audit reads installed links only, so an outstanding component is audited as an asset on its own, in the room where it is (group 3 spec §8.5)", () => {
  const round = readFileSync("src/lib/audit-round.ts", "utf8")
  const scanData = readFileSync("src/lib/audit-scan-data.ts", "utf8")
  const scan = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")
  // The round's component candidates, the scan list's component counts, the scan's "still installed under this parent" check and its confirmed components.
  assert.match(round, /prisma\.assetComponent\.findMany\(\{\s*where: \{\s*parentAsset: buildAuditAssetWhere\(input\),\s*status: "installed",\s*removedAt: null,/)
  assert.match(scanData, /prisma\.assetComponent\.groupBy\(\{\s*by: \["parentAssetId"\],\s*where: \{\s*status: "installed",\s*removedAt: null,/)
  assert.match(scan, /tx\.assetComponent\.findFirst\(\{\s*where: \{\s*parentAssetId,\s*componentAssetId,\s*status: "installed",\s*removedAt: null,\s*\}/)
  assert.match(scan, /tx\.assetComponent\.findMany\(\{\s*where: \{ parentAssetId, status: "installed", removedAt: null \}/)
  for (const [name, source] of [["audit-round", round], ["audit-scan-data", scanData], ["scan route", scan]]) {
    assert.doesNotMatch(source, /outstandingLinkWhere|"outstanding"/, name)
  }
})
