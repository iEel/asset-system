import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 1, the docs (task 31): the handoff section and the Thai changelog entry record the plan in place, with
// every marker filled. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the handoff and the changelog record V track plan 1 in place, with every marker filled (v-track plan 1 task 31)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## V Track Plan 1 (")
  assert.ok(section > handoff.indexOf("\n## Dark Mode ("), "the V track plan 1 section follows the Dark Mode one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  assert.match(record, /\n- Dev-app check: \S/, "the dev-app check bullet")
  // The body as validationFailedBody sends it, and the 2C note that promised fieldErrors points here.
  assert.ok(record.includes('`{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }`'), "the 400 body")
  assert.match(read("src/lib/api-error-exposure.ts"), /code: "VALIDATION_FAILED", fieldErrors: issuesToFieldErrors\(error\.issues, keyFor\)/)
  assert.ok(handoff.includes('\n  - Routes are unchanged. V track plan 1 added `fieldErrors` to this body (see "V Track Plan 1" below).\n'), "the 2C note")
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the V track plan 1 entry")
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the entry is the first one under the newest date")
  assert.ok(entry < changelog.indexOf("\n### โหมดมืด (Dark Mode)\n"), "above the Dark Mode entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
