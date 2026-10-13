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
  // After a save the form goes to returnHref: the PM list page the edit page came from, else the PM list (2B-2 Task 14).
  assert.match(form, /returnHref = `\/\$\{locale\}\/maintenance\/pm`,/)
  assert.match(form, /router\.push\(returnHref\)/)
})

test("the PM plan form uses the shared field primitives and a busy save button (2C batch 1a)", () => {
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(form, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(form, /function Field\(|<input|<select|<textarea|Loader2|ml-1 text-danger/)
  assert.equal(form.match(/<Field label=\{t\("pm\w+"\)\} required>/g)?.length, 4)
  assert.equal(form.match(/^\s+required$/gm)?.length, 4, "each starred field keeps the browser's own required check")
  assert.match(form, /<Textarea\n\s+value=\{values\.notes\}[\s\S]*?maxLength=\{4000\}[\s\S]*?className="min-h-20"/)
  assert.match(form, /<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">\n\s+<Save \/>/)
})
