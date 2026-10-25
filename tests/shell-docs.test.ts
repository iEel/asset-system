import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The menu B app shell in the docs (plan docs/superpowers/plans/2026-10-21-menu-b-shell.md, Task 13C): the handoff
// section, the Thai changelog entry, the UAT list, the auth, architecture and design-system docs and the deployment
// env, each in its place and every marker filled. Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")

test("the handoff, the changelog, the UAT list and the docs record the menu B shell in place, with every marker filled (menu B shell task 13C)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## Menu B App Shell (")
  assert.ok(section > handoff.indexOf("\n## E2E Workflow Suite (") && section < handoff.indexOf("\n## Open Go-Live Decisions"))
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  for (const name of ["`SESSION_IDLE_SECONDS`", "`SESSION_CEILING_SECONDS`", "`POST /api/session/keep-alive`", "`GET /api/session/status`", "`read_all`", "`sidebar`", "`shell-requests-cancelled-by-navigation`", "`e2e/shell/`", "`SESSION_IDLE_SECONDS: \"10800\"`"]) assert.ok(record.includes(name), name)
  assert.match(record, /\n- Whole run: \(Task 13B\) \S/)
  assert.doesNotMatch(handoff, /^> Last updated: 2026-10-19$/m)
  assert.doesNotMatch(handoff, /change the eight-hour session policy/)
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### เมนู B และกรอบหน้าใหม่ (งาน shell)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the shell's entry")
  assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-25\n"), "the entry sits under 2026-10-25 (the group 1 login entry went above it later)")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ผลรอบสุดท้าย:\*\* \(Task 13B\) \S/)
  const uat = read("docs/07_UAT_CHECKLIST.md")
  const shellUat = uat.indexOf("\n## Menu B Shell UAT (")
  assert.ok(shellUat > uat.indexOf("\n## E2E Suite Follow-up (") && shellUat < uat.indexOf("\n## Sign-Off"))
  for (const item of ["NVDA", "VoiceOver", "TalkBack", "60 minutes", "12 hours", "dashboard:view", "IndexedDB"]) assert.ok(uat.slice(shellUat, uat.indexOf("\n## Sign-Off")).includes(item), item)
  const authDoc = read("docs/04_AUTH_RBAC.md")
  assert.doesNotMatch(authDoc, /JWT sessions last 8 hours/)
  assert.match(authDoc, /60 minutes without use[\s\S]*12 hours after sign-in/)
  assert.ok(read("docs/02_ARCHITECTURE.md").includes("`SessionKeeper`"))
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  assert.ok(index.includes("\n| App shell, menu B | [`2026-10-21-menu-b-shell-design.md`]"))
  assert.ok(read("DEPLOYMENT_UBUNTU_CLOUDFLARE.md").includes("# SESSION_IDLE_SECONDS=3600\n# SESSION_CEILING_SECONDS=43200"))
  const markers = /<today>|<N>|<run id>|<commit>|<plan file>|<from task-13-findings>|<จาก task-13-findings>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog], ["docs/07_UAT_CHECKLIST.md", uat], ["docs/14_UI_UX_DESIGN_SYSTEM.md", index]]) assert.deepEqual([path, text.match(markers) ?? []], [path, []])
})
