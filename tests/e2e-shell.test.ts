import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The menu B shell's own E2E checks (plan docs/superpowers/plans/2026-10-21-menu-b-shell.md, Task 13A): the bell, the
// desktop menu, search, the phone sheet, the skip link and the session. The workflows run with `npm run test:e2e`;
// these pin what they stand on: the suite's fixtures and users, the app's own words, the run's session limits, and
// the session stand-in that answers as the server does. Reads strip \r (the working tree may be CRLF).
const read = (f: string) => readFileSync(f, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []

test("the shell specs use the suite's fixtures and users, run the phone on Chromium, and read the app's own words (menu B shell task 13A)", async () => {
  const { SHELL_WORDS, SEARCH_GROUP_ORDER, fillTemplate } = await import("../e2e/shell/shell-words.ts")
  const th = new Set(values(JSON.parse(read("messages/th.json"))))
  for (const [name, text] of Object.entries(SHELL_WORDS)) assert.ok(th.has(text), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(fillTemplate(SHELL_WORDS.increase, { title: SHELL_WORDS.approvalInbox, count: 1 }), "งานรออนุมัติ เพิ่ม 1 รายการ")
  assert.deepEqual(SEARCH_GROUP_ORDER, ["ทรัพย์สิน", "งานซ่อม", "รอบตรวจนับ", "ตัดจำหน่าย", "พนักงาน", "ที่ตั้ง", "ผู้ขาย", "บริษัท", "สาขา"])
  for (const label of SEARCH_GROUP_ORDER) assert.ok(read("src/app/api/search/route.ts").includes(`"${label}"`) || th.has(label), label)
  for (const file of ["e2e/shell/shell.spec.ts", "e2e/shell/session.spec.ts"]) {
    const spec = read(file)
    assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), file)
    assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), `${file}: the phone on Chromium`)
  }
  const shell = read("e2e/shell/shell.spec.ts")
  assert.ok(shell.includes(`asUser("itHead")`) && shell.includes(`asUser("itStaff")`))
  // Overlays fade in: each one is measured once no finite animation runs (e2e/audit/settle.ts; 13B loop 3).
  assert.ok(shell.includes(`import { recordSettled } from "../audit/settle.ts"`))
  for (const label of ["IT head: the bell box", "IT staff: the rail with a row's name", "IT staff: the account menu", "IT staff: search results", "IT staff: the phone's เพิ่มเติม sheet"]) {
    assert.ok(shell.includes(`await recordSettled(page, measure, "${label}")`), label)
    assert.ok(!shell.includes(`measure.recordPage("${label}")`), label)
  }
})

test("the run's saved sessions outlive the run: the app under test idles after more than the run's 90 minutes, the ceiling keeps its default (menu B shell task 13A)", () => {
  const config = read("playwright.config.ts")
  const idle = Number(config.match(/SESSION_IDLE_SECONDS: "(\d+)"/)?.[1])
  assert.equal(idle, 10800)
  assert.match(config, /globalTimeout: 90 \* 60 \* 1000,/)
  assert.ok(idle * 1000 > 90 * 60 * 1000)
  assert.doesNotMatch(config, /SESSION_CEILING_SECONDS/, "the 12-hour ceiling is the app's default")
  assert.match(read("e2e/shell/session.spec.ts"), /10_800_000/)
})

test("the session checks stand in for the status read only, answer 401 after the deadline as the server does, go offline through the measurement, and never sign in (menu B shell task 13A)", () => {
  const session = read("e2e/shell/session.spec.ts") + read("e2e/shell/shell-steps.ts")
  assert.match(session, /page\.route\("\*\*\/api\/session\/status", /)
  assert.match(session, /status: 401, json: \{ error: "Unauthorized" \}/)
  assert.ok(session.includes("measure.expectRefusal({") && session.includes(`page.unroute("**/api/session/status")`))
  assert.doesNotMatch(session, /route\([^)]*keep-alive/, "the keep-alive is the app's own")
  assert.doesNotMatch(session, /\btimes:/, "the stand-in answers every status request")
  assert.ok(session.includes("measure.whileOffline(") && !session.includes("setOffline("))
  assert.ok(session.includes(`name: "authjs.session-token"`) && session.includes("session-expired"))
})

test("the bell check makes its own waiting work as IT staff and reads the box as the IT head (menu B shell task 13A)", () => {
  const steps = read("e2e/shell/shell-steps.ts")
  assert.match(steps, /authStateFile\(readRunState\(\)\.runId, "itStaff"\)/)
  assert.match(steps, /\.post\("\/api\/disposal-requests", \{\s*data: \{[^}]*disposalType: "dispose"/)
  assert.ok(read("e2e/shell/shell.spec.ts").includes(`"asset-system:notification-summary-changed"`))
})
