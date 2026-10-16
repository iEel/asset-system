import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetDetailSectionHref,
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

// Wiki open question 43 (plan 2D-4): an in-page link to a section is "#id" in the view that renders the section, and
// otherwise the URL of the view that does, with the same returnTo and the section as the anchor.
test("links a section in place when the view renders it, and otherwise opens the view that does", () => {
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "overview", "purchase", "/th/assets"), "#purchase")
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "custody", "components", "/th/assets"), "#components")
  assert.equal(
    buildAssetDetailSectionHref("th", "asset id/1", "overview", "ownership", "/th/assets?status=ready"),
    "/th/assets/asset%20id%2F1?view=custody&returnTo=%2Fth%2Fassets%3Fstatus%3Dready#ownership",
  )
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "audit"), "/th/assets/a1?view=audit#audit")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "maintenance", ""), "/th/assets/a1?view=operations#maintenance")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "audit", "purchase", "/th/assets"), "/th/assets/a1?view=overview&returnTo=%2Fth%2Fassets#purchase")
})
