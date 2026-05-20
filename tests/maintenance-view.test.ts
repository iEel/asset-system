import assert from "node:assert/strict"
import test from "node:test"

import { buildMaintenanceViewHref, normalizeMaintenancePageView } from "../src/lib/maintenance-view.ts"

test("normalizes the maintenance page view with tickets as the default", () => {
  assert.equal(normalizeMaintenancePageView(undefined), "tickets")
  assert.equal(normalizeMaintenancePageView("tickets"), "tickets")
  assert.equal(normalizeMaintenancePageView("pm"), "pm")
  assert.equal(normalizeMaintenancePageView("unknown"), "tickets")
})

test("builds stable maintenance view hrefs", () => {
  assert.equal(buildMaintenanceViewHref("th", "tickets"), "/th/maintenance?view=tickets")
  assert.equal(buildMaintenanceViewHref("th", "pm"), "/th/maintenance?view=pm")
  assert.equal(
    buildMaintenanceViewHref("th", "pm", "asset id/1"),
    "/th/maintenance?view=pm&assetId=asset+id%2F1",
  )
})
