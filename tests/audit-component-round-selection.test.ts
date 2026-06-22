import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAuditComponentCandidateGroups,
  selectAuditComponentCandidates,
  type AuditComponentCandidateAsset,
  type AuditComponentLink,
} from "../src/lib/audit-component-round.ts"

function asset(id: string, assetTag = id): AuditComponentCandidateAsset {
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

test("component candidate groups keep installed components with their parent", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const groups = buildAuditComponentCandidateGroups([parent], [
    { parentAssetId: parent.id, componentAsset: component },
  ])

  assert.equal(groups.length, 1)
  assert.equal(groups[0].rootAsset.id, parent.id)
  assert.deepEqual(groups[0].assets.map((item) => item.id), [parent.id, component.id])
  assert.deepEqual(Array.from(groups[0].componentAssetIds), [component.id])
})

test("component candidate groups deduplicate and sort component links by asset tag", () => {
  const parent = asset("parent-1", "PARENT-1")
  const componentKho = asset("component-kho", "ข-2")
  const duplicateKho = asset("component-kho", "ข-2")
  const componentKo = asset("component-ko", "ก-1")
  const groups = buildAuditComponentCandidateGroups([parent], [
    { parentAssetId: parent.id, componentAsset: componentKho },
    { parentAssetId: parent.id, componentAsset: duplicateKho },
    { parentAssetId: parent.id, componentAsset: componentKo },
  ])

  assert.deepEqual(groups[0].assets.map((item) => item.id), [parent.id, componentKo.id, componentKho.id])
  assert.deepEqual(Array.from(groups[0].componentAssetIds), [componentKo.id, componentKho.id])
})

test("component candidate selection deduplicates direct and parent-expanded components", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const directOnly = asset("direct-1", "DIRECT-1")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: component },
  ]

  const selection = selectAuditComponentCandidates([parent, component, directOnly], links, 100)

  assert.equal(selection.matchedAssets, 3)
  assert.equal(selection.componentItems, 0)
  assert.deepEqual(selection.selectedAssets.map((item) => item.id), [parent.id, component.id, directOnly.id])
  assert.equal(selection.selectedItems.find((item) => item.asset.id === component.id)?.includedVia, "direct")
})

test("component candidate selection keeps the direct candidate object over a stale component copy", () => {
  const parent = asset("parent-1", "PARENT-1")
  const directComponent = asset("component-1", "COMP-DIRECT")
  const staleComponent = asset("component-1", "COMP-STALE")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: staleComponent },
  ]

  const selection = selectAuditComponentCandidates([parent, directComponent], links, 100)
  const selectedComponent = selection.selectedItems.find((item) => item.asset.id === directComponent.id)

  assert.ok(selectedComponent)
  assert.equal(selectedComponent.includedVia, "direct")
  assert.strictEqual(selectedComponent.asset, directComponent)
  assert.deepEqual(selection.selectedAssets.map((item) => item.assetTag), [parent.assetTag, directComponent.assetTag])
})

test("component candidate selection keeps parent-expanded components as components when their root group is not selected", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: component },
  ]

  const selection = selectAuditComponentCandidates([parent, component], links, 50, (groups) => [groups[0]])
  const selectedComponent = selection.selectedItems.find((item) => item.asset.id === component.id)

  assert.equal(selection.componentItems, 1)
  assert.ok(selectedComponent)
  assert.equal(selectedComponent.includedVia, "component")
  assert.equal(selectedComponent.parentAssetId, parent.id)
  assert.deepEqual(selection.selectedItems.map((item) => item.includedVia), ["direct", "component"])
})

test("component candidate selection uses the direct candidate object for unselected root components", () => {
  const parent = asset("parent-1", "PARENT-1")
  const directComponent = asset("component-1", "COMP-DIRECT")
  const staleComponent = asset("component-1", "COMP-STALE")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: staleComponent },
  ]

  const selection = selectAuditComponentCandidates([parent, directComponent], links, 50, (groups) => [groups[0]])
  const selectedComponent = selection.selectedItems.find((item) => item.asset.id === directComponent.id)

  assert.equal(selection.componentItems, 1)
  assert.ok(selectedComponent)
  assert.equal(selectedComponent.includedVia, "component")
  assert.strictEqual(selectedComponent.asset, directComponent)
  assert.equal(selectedComponent.parentAssetId, parent.id)
})

test("component candidate selection counts components added only through selected parents", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: component },
  ]

  const selection = selectAuditComponentCandidates([parent], links, 100)

  assert.equal(selection.matchedAssets, 1)
  assert.equal(selection.componentItems, 1)
  assert.deepEqual(selection.selectedAssets.map((item) => item.id), [parent.id, component.id])
  assert.deepEqual(
    selection.selectedItems.map((item) => ({
      id: item.asset.id,
      includedVia: item.includedVia,
      parentAssetId: item.parentAssetId ?? null,
    })),
    [
      { id: parent.id, includedVia: "direct", parentAssetId: null },
      { id: component.id, includedVia: "component", parentAssetId: parent.id },
    ]
  )
})

test("component candidate sampling samples parent groups before flattening components", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const directOnly = asset("direct-1", "DIRECT-1")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: component },
  ]

  const selection = selectAuditComponentCandidates([parent, directOnly], links, 50, (groups) => [groups[0]])

  assert.equal(selection.matchedAssets, 2)
  assert.equal(selection.componentItems, 1)
  assert.deepEqual(selection.selectedAssets.map((item) => item.id), [parent.id, component.id])
})
