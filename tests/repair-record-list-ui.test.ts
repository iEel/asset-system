import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "../src/lib/maintenance-status.ts"

const pagePath = "src/app/[locale]/(dashboard)/maintenance/page.tsx"

test("history screens show old workflow tickets with the new three statuses", () => {
  const labels = { in_progress: "ยังซ่อมไม่เสร็จ", closed: "ซ่อมเสร็จแล้ว", cancelled: "ยกเลิก" }
  assert.deepEqual([...maintenanceStatuses], ["in_progress", "closed", "cancelled"])
  assert.equal(getMaintenanceStatusLabel("waiting_vendor", labels), "ยังซ่อมไม่เสร็จ")
  assert.equal(getMaintenanceStatusTone("reported"), "warning")
})

test("the maintenance page lists records with PM due and stuck assets", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /buildDuePmPlanWhere\(/)
  assert.match(source, /id="pm-due"/)
  assert.match(source, /id="stuck"/)
  assert.match(source, /maintenanceTickets: \{ none: openRepairRecordWhere \}/)
  assert.match(source, /planId=/)
})

test("the stuck-asset link has a 44px touch target", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}`\}\s+className="[^"]*min-h-11/)
})

test("the board view, SLA and evidence filters are gone", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.doesNotMatch(source, /Kanban|layout=board|overdue=yes|evidence|assignedTo/)
})

test("the export uses the repair record columns", () => {
  const source = readFileSync("src/app/api/maintenance-tickets/export/route.ts", "utf8")
  assert.match(source, /key: "outcome"/)
  assert.doesNotMatch(source, /assignedTo|dueDate|laborCost|partsCost|inspectedBy/)
})
