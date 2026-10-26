import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The rounds list and round form steps of the E2E suite (plan docs/superpowers/plans/2026-10-26-group2-audit-rounds.md,
// Task 7; spec docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md §6, §7, §14, §16): the words are the
// app's, the helpers stand on the form's and the list's markup, and the rounds list spec opens its own round and
// always cancels it. Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => (typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : [])
// A words-file template and a th.json value are the same text whatever their placeholders are named.
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")

test("the rounds list and round form steps read the app's own words, and ร่าง is gone from the audit words (group 2 plan 1 task 7)", async () => {
  const { ROUNDS_WORDS } = await import("../e2e/audit/rounds-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(ROUNDS_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  // The keys the skeleton names (Tasks 1, 4 and 6).
  const round = th.auditRound as Record<string, string>
  assert.equal(ROUNDS_WORDS.tabOpen, round.viewOpen)
  assert.equal(ROUNDS_WORDS.tabClosed, round.viewClosed)
  assert.equal(ROUNDS_WORDS.tabCancelled, round.viewCancelled)
  assert.equal(ROUNDS_WORDS.tabAll, round.viewAll)
  assert.equal(ROUNDS_WORDS.statusOpen, round.statusOpen)
  assert.equal(ROUNDS_WORDS.statusClosed, round.statusClosed)
  assert.equal(ROUNDS_WORDS.statusCancelled, round.statusCancelled)
  assert.equal(ROUNDS_WORDS.continueScan, round.actionContinueScan)
  assert.equal(ROUNDS_WORDS.viewPending, round.viewPending)
  assert.equal(ROUNDS_WORDS.activeFilters, round.activeFilters)
  assert.equal(ROUNDS_WORDS.clearFilter, round.clearFilter)
  assert.equal(ROUNDS_WORDS.createTitle, round.createTitle)
  assert.equal(ROUNDS_WORDS.listTitle, round.title)
  assert.equal(ROUNDS_WORDS.clearSearch, th.auditPending.clearSearch)
  for (const key of ["scopeDepartment", "scopeLocation", "scopeStatus"] as const) assert.equal(ROUNDS_WORDS[key], round[key])
  // Spec §14: the word ร่าง leaves the audit UI (systemLogPage keeps the stored value's name for the history).
  assert.deepEqual(values(round).filter((text) => text.includes("ร่าง")), [])
})

test("the steps stand on the form's pickers, the list's tabs and chips, and the IT head's saved session (group 2 plan 1 task 7)", () => {
  const steps = read("e2e/audit/round-steps.ts")
  for (const name of ["addCondition", "waitForFirstCount", "createButton", "willCreate", "readWillCreate", "showSample", "cancelAsItHead", "roundEntry", "tab", "expectTabs", "workViewChip", "expectWhole"]) {
    assert.match(steps, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  assert.ok(steps.includes(`storageState: fromRoot(authStateFile(readRunState().runId, "itHead"))`), "the IT head cancels, from the run's saved session")
  assert.ok(steps.includes(`{ data: { action: "cancel", reason } }`), "a cancel through the round route, never a DELETE")
  assert.ok(steps.includes(`new URL(response.url()).pathname === "/api/audit-rounds/preview"`), "each condition waits for its own live count, so the next change never aborts one in flight")
  // The form (Tasks 3-4): the condition pickers' ids, and no status field.
  const form = read("src/components/audit/audit-round-form.tsx")
  assert.ok(form.includes("audit-round-scope-"), "the condition pickers' ids")
  assert.ok(!form.includes("audit-round-status"), "no status field")
  // The list (Task 6): the status tabs, and the work view as a FilterChipList chip with the app's words.
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/page.tsx")
  assert.match(page, /<TabNav\b/)
  assert.match(page, /<FilterChipList\b[\s\S]*?label=\{t\("activeFilters"\)\}[\s\S]*?removeLabel=\{t\("clearFilter"\)\}/)
  assert.match(read("src/components/ui/tab-nav.tsx"), /data-slot="tab-nav"/)
  assert.match(read("src/components/ui/page-header.tsx"), /data-slot="page-header-meta"/)
})

test("the rounds list spec opens its own round, finds it by its number, checks the next step by role and cancels the round whatever happens (group 2 plan 1 task 7)", () => {
  const spec = read("e2e/audit/rounds-list.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  assert.ok(spec.includes(`asUser("itStaff")`) && spec.includes(`await actAs(page, "viewer", e2eTheme)`))
  // Its own room and round, found by its number (spec §16: no step relies on a first page or a global count).
  assert.ok(spec.includes("const roomId = await createRoom(`${prefix}-R`, "))
  assert.ok(spec.includes("const list = `/th/audit/rounds?search=${encodeURIComponent(round.auditNo)}`"))
  // The body the form sends: no status (spec §7).
  assert.doesNotMatch(spec, /\bstatus: "/)
  // The next step by role, shown whole (spec §13 bug 1).
  assert.ok(spec.includes("const scanHref = new RegExp(`^/th/audit/rounds/${round.id}/scan(?:[?#]|$)`)"))
  assert.ok(spec.includes("const pendingHref = new RegExp(`^/th/audit/rounds/${round.id}/pending(?:[?#]|$)`)"))
  assert.equal((spec.match(/await rounds\.expectWhole\(/g) ?? []).length, 2)
  assert.ok(spec.includes(`await expect(page.locator('main a[href*="/scan"]').filter({ visible: true })).toHaveCount(0)`))
  // The work view from the strip cell, with its chip; the tabs with their counts, before and after the cancel.
  assert.ok(spec.includes("const chip = rounds.workViewChip(page, W.viewPending)"))
  assert.equal((spec.match(/await rounds\.expectTabs\(page, /g) ?? []).length, 2)
  // Cancelled whatever happens.
  assert.match(spec, /\} finally \{\n\s+if \(!cancelled\) await rounds\.cancelAsItHead\(playwright\.request, baseURL, round\.id, /)
})
