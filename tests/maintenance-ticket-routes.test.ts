import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("maintenance ticket routes delegate lifecycle mutations to the service", () => {
  const collectionRoute = readFileSync("src/app/api/maintenance-tickets/route.ts", "utf8")
  const itemRoute = readFileSync("src/app/api/maintenance-tickets/[id]/route.ts", "utf8")

  assert.match(collectionRoute, /createCorrectiveMaintenanceTicket/)
  assert.match(itemRoute, /transitionMaintenanceTicket/)
  assert.match(itemRoute, /updateMaintenanceTicketPlanning/)
  assert.match(itemRoute, /maintenanceTicketPlanningSchema/)
  assert.match(itemRoute, /action === "planning"/)
  assert.match(itemRoute, /closeMaintenanceTicket/)
  assert.doesNotMatch(collectionRoute, /prisma\.asset\.update/)
  assert.doesNotMatch(itemRoute, /prisma\.assetMovement\.create/)
})

test("maintenance ticket routes serialize stable domain errors", () => {
  const routes = [
    readFileSync("src/app/api/maintenance-tickets/route.ts", "utf8"),
    readFileSync("src/app/api/maintenance-tickets/[id]/route.ts", "utf8"),
  ].join("\n")

  assert.match(routes, /getMaintenanceErrorPayload/)
  assert.match(routes, /payload\.body/)
  assert.match(routes, /payload\.status/)
})
