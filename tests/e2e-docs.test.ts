import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The E2E workflow suite in the docs (plan docs/superpowers/plans/2026-10-20-e2e-suite.md, Task 53): the handoff
// section, the Thai changelog entry and the UAT checklist's pointer, each in its place, every marker filled, and the
// names they give checked against the files that hold them. Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")

test("the handoff, the changelog and the UAT checklist record the E2E workflow suite in place, with every marker filled (e2e suite task 53)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## E2E Workflow Suite (")
  assert.ok(section > handoff.indexOf("\n## V Track Final Plan ("), "the suite's section follows the V track's final plan")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  for (const name of ["`npm run test:e2e`", "`asset_management_dev`", "`e2e-results/summary.json`", "`tests/e2e-fixes.test.ts`", "`node scripts/e2e-scan-secrets.mjs`"]) assert.ok(record.includes(name), name)
  assert.match(record, /\n- Whole run: \(Task 51\) \S/, "the green run's bullet")
  assert.equal(JSON.parse(read("package.json")).scripts["test:e2e"], "playwright test")

  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ชุดทดสอบ E2E ตามขั้นตอนงานจริง (งาน E2E)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the suite's entry")
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the suite's entry is the first one under the newest date")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ผลรอบสุดท้าย:\*\* \(Task 51\) \S/, "the green run's bullet")

  const uat = read("docs/07_UAT_CHECKLIST.md")
  const pointer = uat.indexOf("\n## E2E Suite Follow-up (")
  assert.ok(pointer !== -1 && pointer < uat.indexOf("\n## Sign-Off"), "the UAT pointer comes before Sign-Off")
  const items = uat.slice(pointer, uat.indexOf("\n## Sign-Off"))
  for (const item of ["VoiceOver", "TalkBack", "NVDA", "iOS Safari", "Android Chrome", "QR", "docs/superpowers/plans/2026-10-20-e2e-suite.md"]) assert.ok(items.includes(item), item)

  // Every marker of the templates is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-51-findings>|<จาก task-51-findings>|<from the report>|<จากรายงาน>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog], ["docs/07_UAT_CHECKLIST.md", uat]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
