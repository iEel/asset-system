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
  assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-18\n"), "the entry sits under 2026-10-18 (the V track plan 2 entry went above it later, v-track plan 2 task 33)")
  assert.ok(entry < changelog.indexOf("\n### โหมดมืด (Dark Mode)\n"), "above the Dark Mode entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})

// V track plan 2, the docs (task 33): the handoff section and the Thai changelog entry record plan 2 after plan 1's, with
// every marker filled; two names the section gives are checked against the code that holds them.
test("the handoff and the changelog record V track plan 2 in place, with every marker filled (v-track plan 2 task 33)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## V Track Plan 2 (")
  assert.ok(section > handoff.indexOf("\n## V Track Plan 1 ("), "the V track plan 2 section follows the plan 1 one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  assert.match(record, /\n- Dev-app check: checked \(Task 32\) on \S/, "the dev-app check bullet")
  assert.ok(record.includes("`waitForDialogToClose(frames = 60)`"), "the review dialog hand-back")
  assert.match(read("src/lib/field-focus.ts"), /\nexport function waitForDialogToClose\(frames = 60\): Promise<void> \{\n/)
  assert.ok(record.includes("(`SELECT_STAR_ONLY` 14 → 0)"), "the asterisk-only selects")
  assert.match(read("tests/validation-guards.test.ts"), /\nconst SELECT_STAR_ONLY: Readonly<Record<string, number>> = \{\n\}\n/)
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the V track plan 2 entry")
  assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-19\n"), "the entry sits under 2026-10-19 (the V track plan 3 entry went above it later, v-track plan 3 task 8)")
  assert.ok(entry < changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)\n"), "above the plan 1 entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \(Task 32\) ตรวจบน \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})

// V track plan 3, the docs (task 8): the handoff section and the Thai changelog entry record plan 3 after plan 2's, with
// every marker filled; two names the section gives are checked against the code that holds them.
test("the handoff and the changelog record V track plan 3 in place, with every marker filled (v-track plan 3 task 8)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## V Track Plan 3 (")
  assert.ok(section > handoff.indexOf("\n## V Track Plan 2 ("), "the V track plan 3 section follows the plan 2 one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  assert.match(record, /\n- Dev-app check: checked \(Task 7\) on \S/, "the dev-app check bullet")
  assert.ok(record.includes("`src/lib/system-settings-field-rules.ts`"), "the rules module")
  assert.match(read("src/lib/system-settings-field-rules.ts"), /\nexport function settingSaveErrors\(entries: readonly SettingEntry\[\], prefixRows: readonly CategoryPrefixRow\[\], changedKeys: ReadonlySet<string>\) \{\n/)
  assert.ok(record.includes("`V_FORMS` 43 → 44 (= `V_SCOPE`)"), "the V forms")
  assert.ok(read("tests/validation-guards.test.ts").includes("  `${C}admin/system-settings-form.tsx`,\n]\n"), "the settings form's V_FORMS row")
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the V track plan 3 entry")
  assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-19\n"), "the entry sits under 2026-10-19 (the final plan's entry went above it later, v-track final task 6)")
  assert.ok(entry < changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)\n"), "above the plan 2 entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \(Task 7\) ตรวจบน \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})

// V track, the final plan, the docs (task 6): the handoff section and the Thai changelog entry record the final plan
// after plan 3's, with every marker filled; two names the section gives are checked against the code that holds them.
test("the handoff and the changelog record the V track's final plan in place, with every marker filled (v-track final task 6)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## V Track Final Plan (")
  assert.ok(section > handoff.indexOf("\n## V Track Plan 3 ("), "the final plan's section follows the plan 3 one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  assert.match(record, /\n- Dev-app check: checked \(Task 5\) on \S/, "the dev-app check bullet")
  assert.ok(record.includes("`wholeNumber`") && record.includes("`common.validation.notWholeNumber`"), "the whole-number rule")
  assert.match(read("src/lib/validation-rules.ts"), /\nexport function wholeNumber\(value: number \| string \| null \| undefined\): RuleCode \| null \{\n/)
  assert.ok(record.includes("`Field liveError`"), "the live field")
  assert.ok(read("src/components/ui/field.tsx").includes("\n  liveError?: string | null\n"), "Field's liveError takes the live text")
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบสุดท้าย (งาน V plan สุดท้าย)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the final plan's entry")
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the final plan's entry is the first one under the newest date")
  assert.ok(entry < changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)\n"), "above the plan 3 entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \(Task 5\) ตรวจบน \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
