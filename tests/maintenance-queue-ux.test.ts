import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pagePath = "src/app/[locale]/(dashboard)/maintenance/page.tsx"

test("ticket query uses exact count plus requested page", async () => {
  const source = await readFile(pagePath, "utf8")
  assert.match(source, /prisma\.maintenanceTicket\.count/)
  assert.match(source, /skip: \(listFilters\.page - 1\) \* listFilters\.pageSize/)
  assert.match(source, /take: listFilters\.pageSize/)
})

test("PM summary uses aggregates rather than a truncated preview", async () => {
  const source = await readFile(pagePath, "utf8")
  assert.match(source, /getMaintenancePlanSummary/)
  assert.doesNotMatch(source, /summarizeMaintenancePlans\(maintenancePlans/)
})

test("evidence IDs load only for evidence filters", async () => {
  const source = await readFile(pagePath, "utf8")
  assert.match(source, /listFilters\.evidence \? getMaintenanceAttachmentTicketIds\(\)/)
})

test("ticket and PM rows are loaded only for their active workspace", async () => {
  const source = await readFile(pagePath, "utf8")
  assert.match(source, /activeView === "tickets" \? getTicketWorkspaceData/)
  assert.match(source, /activeView === "pm" \? getPlanWorkspaceData/)
})

