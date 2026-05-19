import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDataQualityFixGroups,
  buildWorkCenterHref,
  getWorkCenterItemLimit,
  parseWorkCenterParams,
} from "../src/lib/work-center-view.ts"

test("parses work center view and panel safely", () => {
  assert.deepEqual(parseWorkCenterParams({ view: "mine", panel: "assets" }), {
    view: "mine",
    panel: "assets",
  })
  assert.deepEqual(parseWorkCenterParams({ view: "team", panel: "unknown" }), {
    view: "all",
    panel: "overview",
  })
})

test("builds work center hrefs while preserving selected view", () => {
  assert.equal(
    buildWorkCenterHref("th", { view: "mine", panel: "assets" }, { panel: "audit" }),
    "/th/work-center?view=mine&panel=audit",
  )
  assert.equal(
    buildWorkCenterHref("th", { view: "all", panel: "overview" }, { panel: "overview" }),
    "/th/work-center",
  )
})

test("expands only the active work center panel", () => {
  assert.equal(getWorkCenterItemLimit("assets", "assets"), 24)
  assert.equal(getWorkCenterItemLimit("maintenance", "assets"), 6)
})

test("builds data quality fix groups from issue counts", () => {
  const groups = buildDataQualityFixGroups("th", { view: "mine", panel: "assets" }, {
    missingResponsibility: 2,
    missingSerial: 0,
    missingPhoto: 5,
  })

  assert.deepEqual(groups, [
    {
      key: "responsibility",
      count: 2,
      workCenterHref: "/th/work-center?view=mine&panel=assets",
      assetsHref: "/th/assets?dataQuality=responsibility",
    },
    {
      key: "photo",
      count: 5,
      workCenterHref: "/th/work-center?view=mine&panel=assets",
      assetsHref: "/th/assets?dataQuality=photo",
    },
  ])
})
