import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDataQualityFixGroups,
  buildWorkCenterHref,
  filterWorkCenterMetricKeys,
  getWorkCenterFocusPanels,
  getWorkCenterItemLimit,
  parseWorkCenterParams,
} from "../src/lib/work-center-view.ts"

test("parses work center view and panel safely", () => {
  assert.deepEqual(parseWorkCenterParams({ view: "mine", panel: "assets" }), {
    view: "mine",
    panel: "assets",
    show: 8,
  })
  assert.deepEqual(parseWorkCenterParams({ view: "team", panel: "unknown" }), {
    view: "all",
    panel: "overview",
    show: 8,
  })
})

test("builds work center hrefs while preserving selected view", () => {
  assert.equal(
    buildWorkCenterHref("th", { view: "mine", panel: "assets", show: 8 }, { panel: "audit" }),
    "/th/work-center?view=mine&panel=audit",
  )
  assert.equal(
    buildWorkCenterHref("th", { view: "all", panel: "overview", show: 8 }, { panel: "overview" }),
    "/th/work-center",
  )
})

test("parses show and writes it only when it is not 8", () => {
  assert.equal(parseWorkCenterParams({ show: "16" }).show, 16)
  assert.equal(parseWorkCenterParams({ show: "junk" }).show, 8)
  assert.equal(parseWorkCenterParams({ show: "999" }).show, 200)
  assert.equal(
    buildWorkCenterHref("th", { view: "all", panel: "overview", show: 8 }, { show: 24 }),
    "/th/work-center?show=24",
  )
  assert.equal(
    buildWorkCenterHref("th", { view: "mine", panel: "audit", show: 16 }, { show: 8 }),
    "/th/work-center?view=mine&panel=audit",
  )
})

test("expands only the active work center panel", () => {
  assert.equal(getWorkCenterItemLimit("assets", "assets"), 24)
  assert.equal(getWorkCenterItemLimit("maintenance", "assets"), 6)
})

test("keeps the overview focused on time-sensitive queues", () => {
  assert.deepEqual(getWorkCenterFocusPanels("overview", true), ["approvals", "maintenance", "audit", "disposal"])
  assert.deepEqual(getWorkCenterFocusPanels("assets", true), ["assets"])
  assert.deepEqual(getWorkCenterFocusPanels("overview", false), ["maintenance", "audit", "disposal"])
})

test("shows only metrics that support the selected work center focus", () => {
  const metricKeys = [
    "approvalInbox", "missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "stuckRepairs", "duePm",
    "openAuditActions", "auditActionsDueSoon", "pendingAuditItems", "approvedDisposals",
  ] as const

  assert.deepEqual(filterWorkCenterMetricKeys(metricKeys, "overview"), [
    "approvalInbox", "openRepairs", "stuckRepairs", "duePm", "openAuditActions", "auditActionsDueSoon", "pendingAuditItems", "approvedDisposals",
  ])
  assert.deepEqual(filterWorkCenterMetricKeys(metricKeys, "assets"), ["missingCustodian", "missingSerial", "missingPhoto"])
  assert.deepEqual(filterWorkCenterMetricKeys(metricKeys, "maintenance"), ["openRepairs", "stuckRepairs", "duePm"])
  assert.deepEqual(filterWorkCenterMetricKeys(metricKeys, "audit"), ["openAuditActions", "auditActionsDueSoon", "pendingAuditItems"])
})

test("builds data quality fix groups from issue counts", () => {
  const groups = buildDataQualityFixGroups("th", { view: "mine", panel: "assets", show: 8 }, {
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
