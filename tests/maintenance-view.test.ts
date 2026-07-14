import assert from "node:assert/strict"
import test from "node:test"

import {
  buildMaintenancePageHref,
  buildMaintenanceTicketLayoutHref,
  buildMaintenanceViewHref,
  normalizeMaintenancePageView,
  normalizeMaintenanceTicketLayout,
} from "../src/lib/maintenance-view.ts"

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

test("normalizes ticket layouts and preserves list filters when switching layouts", () => {
  assert.equal(normalizeMaintenanceTicketLayout(undefined), "table")
  assert.equal(normalizeMaintenanceTicketLayout("board"), "board")
  assert.equal(normalizeMaintenanceTicketLayout("cards"), "table")
  assert.equal(
    buildMaintenanceTicketLayoutHref(
      "th",
      "search=UPS&status=in_progress&view=tickets&page=4&pageSize=50",
      "board",
    ),
    "/th/maintenance?search=UPS&status=in_progress&view=tickets&page=1&pageSize=50&layout=board",
  )
})

test("builds paginated workspace links while preserving compatible query state", () => {
  assert.equal(
    buildMaintenancePageHref("th", "search=UPS&view=tickets&page=4&pageSize=50", { page: 2 }),
    "/th/maintenance?search=UPS&view=tickets&page=2&pageSize=50",
  )
  assert.equal(
    buildMaintenancePageHref("th", "view=pm&page=4&pageSize=100", { pageSize: 25, page: 1 }),
    "/th/maintenance?view=pm&page=1&pageSize=25",
  )
})
