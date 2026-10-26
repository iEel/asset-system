import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The dashboard's E2E steps (plan docs/superpowers/plans/2026-10-26-group1-dashboard.md, Task 11; spec 2026-10-25 §10):
// what they stand on — the suite's fixtures and users, the app's own words, the shared order of the waiting kinds and
// of the sections, and the test's own round cancelled after. Reads strip \r (the working tree may be CRLF).
const read = (f: string) => readFileSync(f, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []

test("the dashboard spec reads the app's own words and the shared orders (group 1 dashboard task 11)", async () => {
  const { DASHBOARD_WORDS, WAITING_TITLES, SECTION_ORDER } = await import("../e2e/dashboard/dashboard-words.ts")
  const { WAITING_WORK_KEYS } = await import("../src/lib/waiting-work-rules.ts")
  const { DASHBOARD_SECTION_ORDER } = await import("../src/lib/dashboard-overview-rules.ts")
  const th = JSON.parse(read("messages/th.json"))
  const thValues = new Set(values(th))
  for (const [name, text] of Object.entries(DASHBOARD_WORDS)) assert.ok(thValues.has(text), `${name}: "${text}" is a value of messages/th.json`)
  assert.deepEqual(Object.keys(WAITING_TITLES), [...WAITING_WORK_KEYS], "the kinds in the shared order")
  for (const key of WAITING_WORK_KEYS) assert.equal(WAITING_TITLES[key], th.notifications[key], `notifications.${key}`)
  assert.deepEqual(SECTION_ORDER, DASHBOARD_SECTION_ORDER)
})

test("the dashboard spec runs as three users through the suite's fixtures, compares two surfaces, and cancels its round (group 1 dashboard task 11)", () => {
  const spec = read("e2e/dashboard/dashboard.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  for (const user of ["itHead", "itStaff", "viewer"]) assert.ok(spec.split("\n").some((line) => line.trim() === `asUser("${user}")`), user)
  assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), "the phone on Chromium")
  assert.ok(spec.includes("await createPendingDisposal(staff, choices, roomId, "), "(a) reuses the bell test's pending disposal")
  assert.ok(spec.includes("expect(await bellRows(page)).toEqual(rows)"), "(a) the dashboard's rows against the bell's")
  assert.ok(spec.includes(`expect(followed, "the approvals row is always followed").toContain("approvalInbox")`), "(a) each count against its list's total, approvals always")
  assert.ok(spec.includes("await saveRepairForm(page, measure, "), "(b) IT staff record a repair of their own asset first")
  assert.ok(spec.includes(`expect(keys[0], "IT staff's first row: the repair they just recorded").toBe("openRepairs")`), "(b) IT staff see a repair row first")
  assert.ok(spec.includes("toContainText(`จาก ${custodianCount} รายการ`)"), "(c) the KPI against the register")
  assert.ok(spec.includes("await custodianLink.focus()"), "(c) the filter note on keyboard focus, on every project")
  assert.ok(spec.includes(`locator("[data-status-segment]")`), "(c) a status segment opens the register on the desktop")
  assert.match(spec, /startDate: bangkokDate\(\),\n\s+endDate: bangkokDate\(\),/, "(d) a one-day round, today: pace 100%")
  assert.ok(spec.includes("toBe(round.auditNo)") && !spec.includes("testInfo.annotations.push"), "(d) the test's own round is shown, or the test fails")
  assert.match(spec, /\} finally \{\n\s+const cancelled = await page\.request\.patch\(`\/api\/audit-rounds\/\$\{round\.id\}`, \{ data: \{ action: "cancel"/, "(d) the round is cancelled whatever happens")
  assert.ok(spec.includes(`locator('a[href*="crossScope="]')`), "(e) the cross-scope number once")
})
