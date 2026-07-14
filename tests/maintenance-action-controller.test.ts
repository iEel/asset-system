import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import { isPreventiveMaintenanceTicket } from "../src/lib/maintenance-policy.ts"

test("maintenance list owns one shared action controller", () => {
  const controllerPath = "src/components/maintenance/maintenance-ticket-actions.tsx"
  assert.equal(existsSync(controllerPath), true)
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.equal((page.match(/<MaintenanceTicketActions/g) ?? []).length, 1)
  assert.match(page, /data-maintenance-action=/)
  assert.doesNotMatch(page, /tickets\.map[\s\S]*<MaintenanceTicketCloseButton/)
})

test("maintenance actions submit optimistic timestamp and ticket kind", () => {
  const sources = [
    readFileSync("src/components/maintenance/maintenance-ticket-status-button.tsx", "utf8"),
    readFileSync("src/components/maintenance/maintenance-ticket-close-button.tsx", "utf8"),
  ].join("\n")
  assert.match(sources, /expectedUpdatedAt/)
  assert.match(sources, /isPreventive/)
  assert.match(sources, /MaintenanceOptionSelect/)
})

test("detail ticket actions receive the current optimistic timestamp", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "utf8")
  assert.match(page, /expectedUpdatedAt=\{ticket\.updatedAt/)
})

test("maintenance actions separate planning from status transitions", () => {
  const controller = readFileSync("src/components/maintenance/maintenance-ticket-actions.tsx", "utf8")
  const statusDialog = readFileSync("src/components/maintenance/maintenance-ticket-status-button.tsx", "utf8")
  const planningDialogPath = "src/components/maintenance/maintenance-ticket-planning-button.tsx"

  assert.equal(existsSync(planningDialogPath), true)
  const planningDialog = readFileSync(planningDialogPath, "utf8")
  assert.match(controller, /action: "status" \| "planning" \| "close"/)
  assert.match(controller, /MaintenanceTicketPlanningButton/)
  assert.match(statusDialog, /getMaintenanceStatusUpdateTargets/)
  assert.match(statusDialog, /type="radio"/)
  assert.match(statusDialog, /repairStatus:\s*""/)
  assert.doesNotMatch(statusDialog, /assignedToId|dueDate/)
  assert.match(planningDialog, /action:\s*"planning"/)
  assert.doesNotMatch(planningDialog, /repairStatus:/)
})

test("maintenance list passes authoritative PM classification to status actions", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  const controller = readFileSync("src/components/maintenance/maintenance-ticket-actions.tsx", "utf8")

  assert.equal(isPreventiveMaintenanceTicket({ maintenancePlanId: null, problem: "[PM] PM-001 - ตรวจสอบ UPS" }), true)
  assert.match(page, /isPreventive:\s*isPreventiveMaintenanceTicket\(ticket\)/)
  assert.match(controller, /isPreventive:\s*boolean/)
  assert.match(controller, /isPreventive=\{ticket\.isPreventive\}/)
  assert.doesNotMatch(controller, /Boolean\(ticket\.maintenancePlanId\)/)
})
