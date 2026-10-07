import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort()
}

test("Thai and English repair record copy has matching keys", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.ok(th.repairRecord, "messages/th.json needs a repairRecord namespace")
  assert.deepEqual(leafKeys(th.repairRecord), leafKeys(en.repairRecord))
})

test("the repair form sends one record with a done flag and a local default date", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(source, /fetch\("\/api\/maintenance-tickets"/)
  assert.match(source, /done: values\.done/)
  assert.match(source, /toLocalDateInputValue\(\)/)
  assert.doesNotMatch(source, /toISOString\(\)\.slice\(0, 10\)/)
  assert.doesNotMatch(source, /assignedToId|dueDate|laborCost|partsCost|warrantyClaim/)
})

test("the repair form localizes API error codes and links to an unfinished record", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(source, /getMaintenanceErrorMessage\(payload\?\.code, tMaintenance/)
  assert.match(source, /MAINTENANCE_OPEN_RECORD_EXISTS/)
  assert.match(source, /status=in_progress/)
})

test("files picked in the form upload after the record is saved", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  const upload = readFileSync("src/components/maintenance/repair-record-upload.ts", "utf8")
  assert.match(source, /uploadRepairFiles\(payload\.id, files/)
  assert.match(upload, /\/api\/maintenance-tickets\/\$\{recordId\}\/attachments/)
})

test("the reporter picker appears only for accounts without an employee", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/new/page.tsx", "utf8")
  const form = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(page, /needsReporter=\{!user\.employeeId\}/)
  assert.match(form, /needsReporter \?/)
})

test("recording PM from a plan pre-fills the plan and its asset", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/new/page.tsx", "utf8")
  assert.match(page, /planId/)
  assert.match(page, /planState: "active"/)
})
