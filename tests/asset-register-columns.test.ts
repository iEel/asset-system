import assert from "node:assert/strict"
import test from "node:test"

import {
  assetRegisterColumnOrder,
  assetRegisterColumnPresets,
  assetRegisterColumnsMatchPreset,
  assetRegisterColumnWidths,
  getAssetRegisterTableMinWidth,
  normalizeAssetRegisterColumns,
} from "../src/lib/asset-register-columns.ts"

// Group 4 plan 1 Task 2 (spec §6.1, §6.3, P1-R3, P1-R4): one "ทรัพย์สิน" column replaces the tag and the name.
test("the register's columns start with the merged asset column, and the presets use it", () => {
  assert.deepEqual([...assetRegisterColumnOrder], ["asset", "category", "companyBranch", "currentLocation", "custodian", "ownershipType", "status", "condition", "purchasePrice"])
  assert.deepEqual([...assetRegisterColumnPresets.operations], ["asset", "currentLocation", "custodian", "status", "condition"])
  assert.deepEqual([...assetRegisterColumnPresets.accounting], ["asset", "companyBranch", "category", "purchasePrice", "status"])
  assert.deepEqual([...assetRegisterColumnPresets.audit], ["asset", "category", "currentLocation", "custodian", "status", "condition"])
})

test("a column set stored before the merge opens as the operations preset, not as all (Review Focus 1, P1-R4)", () => {
  const columns = normalizeAssetRegisterColumns(["assetTag", "name", "currentLocation", "custodian", "status", "condition"])
  assert.deepEqual(columns, ["asset", "currentLocation", "custodian", "status", "condition"])
  assert.equal(assetRegisterColumnsMatchPreset(columns, assetRegisterColumnPresets.operations), true)
})

test("tag or name alone maps to the asset column once, in place of the first of them (P1-R4)", () => {
  assert.deepEqual(normalizeAssetRegisterColumns(["category", "name", "status", "assetTag"]), ["category", "asset", "status"])
  assert.deepEqual(normalizeAssetRegisterColumns(["assetTag", "purchasePrice"]), ["asset", "purchasePrice"])
  assert.deepEqual(normalizeAssetRegisterColumns(["asset", "assetTag", "status"]), ["asset", "status"])
  assert.deepEqual(normalizeAssetRegisterColumns(["bad-column"]), [...assetRegisterColumnPresets.all])
  assert.deepEqual(normalizeAssetRegisterColumns("not-an-array"), [...assetRegisterColumnPresets.all])
})

test("widths: the asset column 280, the room 180, the holder 200; operations is 1,104px (P1-R3)", () => {
  assert.equal(assetRegisterColumnWidths.asset, 280)
  assert.equal(assetRegisterColumnWidths.currentLocation, 180)
  assert.equal(assetRegisterColumnWidths.custodian, 200)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations), 1104)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations) <= 1117)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.accounting), 1024)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.audit), 1264)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.all), 1620)
})
