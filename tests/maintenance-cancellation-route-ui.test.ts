import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const route = readFileSync("src/app/api/maintenance-tickets/[id]/route.ts", "utf8")
const detailPage = readFileSync("src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "utf8")
const thaiMessages = JSON.parse(readFileSync("messages/th.json", "utf8"))
const englishMessages = JSON.parse(readFileSync("messages/en.json", "utf8"))

test("maintenance route delegates cancellation and writes a cancellation audit", () => {
  assert.match(route, /action === "cancel"/)
  assert.match(route, /cancelMaintenanceTicket/)
  assert.match(route, /action:\s*"cancel"/)
})

test("maintenance detail exposes cancellation only for reported and accepted tickets", () => {
  assert.match(detailPage, /MaintenanceTicketCancelButton/)
  assert.match(detailPage, /\["reported",\s*"accepted"\]\.includes\(ticket\.repairStatus\)/)
})

test("maintenance cancellation copy exists in Thai and English", () => {
  for (const messages of [thaiMessages, englishMessages]) {
    assert.equal(typeof messages.maintenancePage.cancelAction, "string")
    assert.equal(typeof messages.maintenancePage.cancelReason, "string")
    assert.equal(typeof messages.maintenancePage.statuses.cancelled, "string")
  }
})
