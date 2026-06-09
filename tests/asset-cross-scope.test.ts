import assert from "node:assert/strict"
import test from "node:test"

import {
  assetMatchesCrossScopeFilter,
  getAssetCrossScopeFlags,
  normalizeAssetCrossScopeFilter,
  summarizeAssetCrossScope,
} from "../src/lib/asset-cross-scope-filter.ts"

const baseAsset = {
  companyId: "company-sonic",
  branchId: "branch-sathu",
  custodian: { companyId: "company-sonic", branchId: "branch-sathu" },
  homeLocation: { branchId: "branch-sathu" },
  currentLocation: { branchId: "branch-sathu" },
}

test("normalizes asset cross-scope filter values", () => {
  assert.equal(normalizeAssetCrossScopeFilter("all"), "all")
  assert.equal(normalizeAssetCrossScopeFilter("custodian_company"), "custodian_company")
  assert.equal(normalizeAssetCrossScopeFilter("custodian_branch"), "custodian_branch")
  assert.equal(normalizeAssetCrossScopeFilter("location_branch"), "location_branch")
  assert.equal(normalizeAssetCrossScopeFilter("unknown"), "")
  assert.equal(normalizeAssetCrossScopeFilter(undefined), "")
})

test("detects custodian and location scope differences from the owner scope", () => {
  assert.deepEqual(getAssetCrossScopeFlags(baseAsset), {
    custodianCompany: false,
    custodianBranch: false,
    locationBranch: false,
    any: false,
  })

  assert.deepEqual(
    getAssetCrossScopeFlags({
      ...baseAsset,
      custodian: { companyId: "company-grandlink", branchId: "branch-grandlink" },
    }),
    {
      custodianCompany: true,
      custodianBranch: true,
      locationBranch: false,
      any: true,
    }
  )

  assert.deepEqual(
    getAssetCrossScopeFlags({
      ...baseAsset,
      homeLocation: { branchId: "branch-warehouse" },
    }),
    {
      custodianCompany: false,
      custodianBranch: false,
      locationBranch: true,
      any: true,
    }
  )
})

test("matches and summarizes cross-scope assets without double-counting all", () => {
  const assets = [
    { ...baseAsset, id: "normal" },
    { ...baseAsset, id: "custodian-company", custodian: { companyId: "company-grandlink", branchId: "branch-grandlink" } },
    { ...baseAsset, id: "custodian-branch", custodian: { companyId: "company-sonic", branchId: "branch-pinthong" } },
    { ...baseAsset, id: "location", currentLocation: { branchId: "branch-pinthong" } },
  ]

  assert.equal(assetMatchesCrossScopeFilter(assets[0], "all"), false)
  assert.equal(assetMatchesCrossScopeFilter(assets[1], "custodian_company"), true)
  assert.equal(assetMatchesCrossScopeFilter(assets[2], "custodian_branch"), true)
  assert.equal(assetMatchesCrossScopeFilter(assets[3], "location_branch"), true)

  assert.deepEqual(summarizeAssetCrossScope(assets), {
    all: 3,
    custodianCompany: 1,
    custodianBranch: 2,
    locationBranch: 1,
  })
})
