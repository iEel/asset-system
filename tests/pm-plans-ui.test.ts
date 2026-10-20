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
  // Each starred Field names its control and shows its error (v-track plan 2 M3); the days Field says its range.
  assert.equal(form.match(/<Field label=\{t\("pm\w+"\)\} id="maintenance-plan-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 3)
  assert.match(form, /<Field\n\s+label=\{t\("pmIntervalDays"\)\}\n\s+id="maintenance-plan-interval-days"\n\s+required\n/)
  // Four controls keep the browser's own required; the asset select and the days Field write theirs on a line too.
  assert.equal(form.match(/^\s+required$/gm)?.length, 6, "each starred field keeps the browser's own required check")
  assert.match(form, /<Textarea\n\s+value=\{values\.notes\}[\s\S]*?maxLength=\{4000\}[\s\S]*?className="min-h-20"/)
  assert.match(form, /<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">\n\s+<Save \/>/)
})

test("PM plan state buttons are Button sm, and their dialog keeps a busy verb confirm in a fixed footer (2C batch 3, K12)", () => {
  const source = readFileSync("src/components/maintenance/maintenance-plan-state-actions.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Button key=\{action\} variant=\{action === "end" \? "danger" : "outline"\} size="sm" onClick=\{\(\) => setPendingAction\(action\)\}>/)
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel \/>\n\s+<Button variant=\{pendingAction === "end" \? "destructive" : "default"\} busy=\{saving\} onClick=\{submitAction\}>\n\s+\{pendingAction \? t\(`pmActions\.\$\{pendingAction\}`\) : null\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.match(source, /<AccessibleDialog\n/, "the dialog stays: it waits with busy while the plan saves, which useConfirm cannot (K12)")
  assert.doesNotMatch(source, /<button\b|Loader2|flex-col-reverse|tCommon\("confirm"\)|useConfirm/)
})

test("an edited PM plan says it was saved, not created (critique 2026-10-20 D1)", () => {
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8")
  assert.ok(form.includes('toast.success(t(planId ? "pmUpdateSuccess" : "pmCreateSuccess"))'))
  assert.doesNotMatch(form, /toast\.success\(t\("pmCreateSuccess"\)\)/)
  for (const l of ["th", "en"]) assert.equal(typeof JSON.parse(readFileSync(`messages/${l}.json`, "utf8")).maintenancePage.pmUpdateSuccess, "string")
})
