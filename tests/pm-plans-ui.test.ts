import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("the PM plan page lists plans with edit, state and record-done actions", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/maintenance/pm/page.tsx", "utf8")
  assert.match(source, /MaintenancePlanStateActions/)
  assert.match(source, /\/maintenance\/pm\/\$\{plan\.id\}\/edit/)
  assert.match(source, /\/maintenance\/new\?planId=\$\{plan\.id\}/)
})

test("PM plans no longer ask for an internal assignee", () => {
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8")
  const route = readFileSync("src/app/api/maintenance-plans/route.ts", "utf8")
  const service = readFileSync("src/lib/maintenance-plan-service.ts", "utf8")
  for (const source of [form, route, service]) assert.doesNotMatch(source, /assignedToId|assignedTo:/)
  assert.match(form, /router\.push\(`\/\$\{locale\}\/maintenance\/pm`\)/)
})
