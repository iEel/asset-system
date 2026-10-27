import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
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

test("the round page and pending list steps read the app's own words (group 2 plan 2 task 7)", async () => {
  const { ROUND_PAGE_WORDS } = await import("../e2e/audit/round-page-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(ROUND_PAGE_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  // The keys that stay from plan 1 and before.
  const round = th.auditRound as Record<string, string>
  assert.equal(ROUND_PAGE_WORDS.nextStep, round.nextStep)
  assert.equal(ROUND_PAGE_WORDS.continueScan, round.nextStepContinueScan)
  assert.equal(ROUND_PAGE_WORDS.closeRound, round.closeRound)
  assert.equal(ROUND_PAGE_WORDS.cancelRound, round.cancelRound)
  assert.equal(ROUND_PAGE_WORDS.activeFilters, round.activeFilters)
  assert.equal(ROUND_PAGE_WORDS.clearFilter, round.clearFilter)
  assert.equal(ROUND_PAGE_WORDS.scanThis, th.auditPending.scanPendingAsset)
  assert.equal(ROUND_PAGE_WORDS.viewAsset, th.auditPending.viewAsset)
  assert.equal(ROUND_PAGE_WORDS.markNotFound, th.auditPending.markNotFound)
  assert.equal(ROUND_PAGE_WORDS.noCustodian, th.asset.noCustodian)
  // The words Tasks 4-5 put on the page, by key.
  assert.equal(ROUND_PAGE_WORDS.reviewWaiting, round.stepReviewWaiting)
  assert.equal(ROUND_PAGE_WORDS.reviewItems, round.nextStepReviewItems)
  assert.equal(ROUND_PAGE_WORDS.componentsMissingChip, round.componentsMissingChip)
  assert.equal(ROUND_PAGE_WORDS.missingComponentPrefix, round.missingComponentPrefix)
  assert.equal(ROUND_PAGE_WORDS.fieldDepartment, th.auditFinding.type_wrong_department)
  assert.equal(ROUND_PAGE_WORDS.fieldCondition, th.auditFinding.type_wrong_condition)
  // Bug 12 and P2-R15: no English report name and no ผู้ตรวจสอบ left in the round and pending words.
  assert.deepEqual(values(round).filter((text) => text.includes("Variance")), [])
  assert.deepEqual([...values(round), ...values(th.auditPending)].filter((text) => text.includes("ผู้ตรวจสอบ")), [])
  // The result card's help is Task 4's round-wide sentence (P2-R15 applied there); Task 6 does not touch it.
  assert.match(round.resultDashboardHelp, /^นับทั้งรอบ ไม่ขึ้นกับตัวกรองของรายการด้านล่าง/)
})

test("the round page and pending steps stand on the result list's chips, the cards' headings and the rows (group 2 plan 2 task 7)", () => {
  const steps = read("e2e/audit/round-page-steps.ts")
  for (const name of ["resultRows", "resultChips", "categoryChips", "chipByLabel", "chipByHref", "chipCount", "chipLabel", "expectChips", "expectChip", "expectChipsMatchRows", "nextStepCard", "mismatchCard", "fieldBar", "componentsMissingLine", "filterChip", "expectInside"]) {
    assert.match(steps, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  const pending = read("e2e/audit/pending-steps.ts")
  for (const name of ["pendingRows", "pendingEntry", "roomChips", "expectRoomChips", "markNotFound"]) {
    assert.match(pending, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  // Spec §5: a chip row is checked against the rows each chip opens, never against a global count.
  assert.ok(steps.includes("await expect(rows, `${chip.text}: its count is its rows (spec §5)`).toHaveCount(Number(chip.count.replace(/,/g, \"\")))"))
  // E2E-1027B: the app registers its service worker on load, so each navigation away first lets that registration
  // settle (bounded); a goto right after a load cancels the sw.js fetch and the measurement records a failed request.
  assert.match(steps, /^export async function settleServiceWorker\(page: Page\)/m)
  assert.ok(steps.includes("navigator.serviceWorker?.ready"))
  assert.ok(steps.includes("setTimeout(resolve, 5000)"))
  const matchRows = steps.slice(steps.indexOf("export async function expectChipsMatchRows("))
  assert.match(matchRows, /for \(const chip of chips\) \{[\s\S]*?await settleServiceWorker\(page\)\s*await page\.goto\(chip\.href\)/)
  assert.match(matchRows, /await settleServiceWorker\(page\)\s*await page\.goto\(start\)/)
  assert.equal((steps.match(/page\.goto\(/g) ?? []).length, 2, "every goto of the steps is behind the wait")
  // The markup the steps read (Tasks 4-6): the result list's anchor, TabNav's count span, and the pending list's
  // TabNav room chips with the whole row still opening the asset (P2-R28).
  const audit = ["src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", ...readdirSync("src/components/audit").map((file) => `src/components/audit/${file}`)]
  assert.ok(audit.some((file) => read(file).includes('id="audit-result-list"')), "the result list's anchor")
  assert.match(read("src/components/ui/tab-nav.tsx"), /<span className=\{cn\("ms-1\.5 text-meta num"/)
  const pendingPage = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx")
  assert.match(pendingPage, /<TabNav\b/)
  assert.match(pendingPage, /<ClickableTableRow\b/)
})

test("the rounds list spec's viewer reads the pending list and the round page with no scan, not-found or menu (group 2 plan 2 task 7)", () => {
  const spec = read("e2e/audit/rounds-list.spec.ts")
  assert.ok(spec.includes("const assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])"))
  assert.ok(spec.includes(`await pending.expectRoomChips(page, 2, { [roomId]: 2 }, "all")`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("button", { name: P.markNotFound, exact: true })).toHaveCount(0)`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("link", { name: P.scanThis, exact: true })).toHaveCount(0)`))
  assert.ok(spec.includes(`await expect(roundPage.nextStepCard(page).getByRole("link", { name: nextName, exact: true })).toHaveAttribute("href", pendingHref)`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("button", { name: P.more, exact: true })).toHaveCount(0)`))
  // No visible scan link for the viewer: the rounds list, the pending list and the round page.
  assert.equal((spec.match(/await expect\(page\.locator\('main a\[href\*="\/scan"\]'\)\.filter\(\{ visible: true \}\)\)\.toHaveCount\(0\)/g) ?? []).length, 3)
})
