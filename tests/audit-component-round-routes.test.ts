import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  selectAuditComponentCandidates,
  type AuditComponentCandidateAsset,
} from "../src/lib/audit-component-round.ts"

test("audit round helper loads installed components and exposes component-aware selection", () => {
  const source = readFileSync("src/lib/audit-round.ts", "utf8")

  assert.match(source, /selectAuditComponentCandidates/)
  assert.match(source, /export async function getAuditRoundSelection/)
  assert.match(source, /prisma\.assetComponent\.findMany/)
  assert.match(source, /parentAssetId:\s*\{\s*in:\s*candidateAssets\.map/)
  assert.match(source, /status:\s*"installed"/)
  assert.match(source, /removedAt:\s*null/)
  assert.match(source, /componentAsset:\s*\{\s*isActive:\s*true/)
})

test("audit round preview and create routes use the same component selection helper", () => {
  const previewRoute = readFileSync("src/app/api/audit-rounds/preview/route.ts", "utf8")
  const createRoute = readFileSync("src/app/api/audit-rounds/route.ts", "utf8")

  for (const route of [previewRoute, createRoute]) {
    assert.match(route, /getAuditRoundSelection/)
    assert.match(route, /selection\.matchedAssets/)
    assert.match(route, /selection\.componentItems/)
  }
  assert.match(previewRoute, /sampledAssets:\s*selection\.selectedAssets\.length/)
  assert.match(createRoute, /generatedItems:\s*assets\.length/)
  assert.match(createRoute, /data:\s*assets\.map/)
})

test("audit round preview payload preserves component provenance", () => {
  const parent = auditAsset("parent-1", "PARENT-1")
  const component = auditAsset("component-1", "COMP-1")
  const direct = auditAsset("direct-1", "DIRECT-1")
  const selection = selectAuditComponentCandidates(
    [parent, direct],
    [{ parentAssetId: parent.id, componentAsset: component }],
    100
  )

  const previewPayload = {
    matchedAssets: selection.matchedAssets,
    sampledAssets: selection.selectedAssets.length,
    componentItems: selection.componentItems,
    previewAssets: selection.selectedItems.slice(0, 8).map((item) => ({
      id: item.asset.id,
      assetTag: item.asset.assetTag,
      name: item.asset.name,
      includedVia: item.includedVia,
      parentAssetTag: item.parentAssetTag ?? null,
    })),
  }

  assert.deepEqual(previewPayload, {
    matchedAssets: 2,
    sampledAssets: 3,
    componentItems: 1,
    previewAssets: [
      {
        id: parent.id,
        assetTag: parent.assetTag,
        name: parent.name,
        includedVia: "direct",
        parentAssetTag: null,
      },
      {
        id: component.id,
        assetTag: component.assetTag,
        name: component.name,
        includedVia: "component",
        parentAssetTag: parent.assetTag,
      },
      {
        id: direct.id,
        assetTag: direct.assetTag,
        name: direct.name,
        includedVia: "direct",
        parentAssetTag: null,
      },
    ],
  })
})

test("audit round form displays component expansion counts from preview", () => {
  const form = readFileSync("src/components/audit/audit-round-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /componentItems\?:\s*number/)
  assert.match(form, /const componentItems = preview\??\.componentItems \?\? 0/)
  assert.match(form, /previewComponentItems/)
  assert.match(form, /String\(componentItems\)/)
  assert.match(form, /componentItems > 0/)
  assert.match(form, /previewComponentHelp/)
  assert.match(form, /count:\s*componentItems/)

  assert.equal(typeof th.auditRound.previewComponentItems, "string")
  assert.equal(typeof th.auditRound.previewComponentHelp, "string")
  assert.equal(typeof en.auditRound.previewComponentItems, "string")
  assert.equal(typeof en.auditRound.previewComponentHelp, "string")
})

function auditAsset(id: string, assetTag: string): AuditComponentCandidateAsset {
  return {
    id,
    assetTag,
    name: `Asset ${assetTag}`,
    companyId: "company-1",
    branchId: "branch-1",
    departmentId: null,
    currentLocationId: "loc-1",
    custodianId: null,
    conditionId: "condition-1",
  }
}
