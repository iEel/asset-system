import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetDetailViewHref,
  getAssetDetailViewSectionIds,
  isAssetDetailSectionVisible,
  parseAssetDetailView,
} from "../src/lib/asset-detail-view.ts"

test("parses only supported asset detail views", () => {
  assert.equal(parseAssetDetailView(undefined), "overview")
  assert.equal(parseAssetDetailView("custody"), "custody")
  assert.equal(parseAssetDetailView(["audit", "overview"]), "audit")
  assert.equal(parseAssetDetailView("unknown"), "overview")
})

test("builds a shareable detail view href while preserving a return path", () => {
  assert.equal(
    buildAssetDetailViewHref("th", "asset id/1", "audit", "/th/assets?status=ready"),
    "/th/assets/asset%20id%2F1?view=audit&returnTo=%2Fth%2Fassets%3Fstatus%3Dready#audit",
  )
})

test("groups sections for the selected detail tab", () => {
  assert.deepEqual(getAssetDetailViewSectionIds("custody"), ["ownership", "components", "handover"])
  assert.deepEqual(getAssetDetailViewSectionIds("operations"), ["movement", "maintenance"])
  assert.deepEqual(getAssetDetailViewSectionIds("audit"), ["audit"])
})

test("identifies which sections belong to the selected asset detail view", () => {
  assert.equal(isAssetDetailSectionVisible("custody", "components"), true)
  assert.equal(isAssetDetailSectionVisible("custody", "overview"), false)
  assert.equal(isAssetDetailSectionVisible("operations", "maintenance"), true)
  assert.equal(isAssetDetailSectionVisible("audit", "movement"), false)
})
