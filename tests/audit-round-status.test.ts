import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { auditRoundStatusLabelKey, effectiveAuditRoundStatus, isAuditRoundOperationalStatus } from "../src/lib/audit-round-status.ts"
import { getStatusTone } from "../src/lib/status-tone.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)) as Record<string, Record<string, string>>
const D = "src/app/[locale]/(dashboard)/"

test("an old draft round reads as open: its status, its word and its tone (group 2 spec §14)", () => {
  assert.equal(effectiveAuditRoundStatus("draft"), "open")
  for (const status of ["open", "closed", "cancelled", "bogus", ""]) assert.equal(effectiveAuditRoundStatus(status), status, status)
  assert.equal(auditRoundStatusLabelKey("draft"), "statusOpen")
  assert.equal(auditRoundStatusLabelKey("open"), "statusOpen")
  assert.equal(auditRoundStatusLabelKey("closed"), "statusClosed")
  assert.equal(auditRoundStatusLabelKey("cancelled"), "statusCancelled")
  for (const raw of ["", "bogus", "constructor", "toString", "Draft"]) assert.equal(auditRoundStatusLabelKey(raw), null, raw)
  assert.equal(getStatusTone(effectiveAuditRoundStatus("draft")), "info", "the open tone, not muted")
  assert.equal(isAuditRoundOperationalStatus("draft"), true, "a draft was always scannable, closable and cancellable")
})

test("the round badge reads เปิดตรวจ / ปิดรอบแล้ว / ยกเลิก, and ร่าง leaves the audit UI (group 2 spec §6, §14)", () => {
  const th = messages("th")
  const en = messages("en")
  assert.equal(th.auditRound.statusOpen, "เปิดตรวจ")
  assert.equal(th.auditRound.statusClosed, "ปิดรอบแล้ว")
  assert.equal(th.auditRound.statusCancelled, "ยกเลิก")
  assert.equal(en.auditRound.statusClosed, "Closed")
  for (const key of ["auditRoundStatusDraft", "auditRoundStatusOpen", "auditRoundStatusClosed"]) {
    assert.equal(key in th.employee, false, key)
    assert.equal(key in en.employee, false, key)
  }
  // The system log renders old create logs: history keeps its word.
  assert.equal(th.systemLogPage.value_auditRound_status_draft, "ร่าง")
})

test("every round badge goes through the one label rule and the effective status; none prints the code (group 2 spec §5, R12)", () => {
  const list = read(`${D}audit/rounds/page.tsx`)
  const round = read(`${D}audit/rounds/[id]/page.tsx`)
  for (const [name, source] of [["list", list], ["round", round]] as const) {
    assert.match(source, /function getAuditRoundStatusLabel\(status: string, t: [^)]+\) \{\s+return t\(auditRoundStatusLabelKey\(status\) \?\? "statusOpen"\)\s+\}/, name)
    assert.doesNotMatch(source, /statusDraft|status === "draft"/, name)
  }
  // The list's two badges are pinned by tests/audit-pages-sweep-ui.test.ts:107 (Task 1 Step 3), which Task 6 rewrites
  // when the list moves them into RoundStatusBadges. This test counts only the round page's header badge.
  const badge = /<StatusBadge label=\{getAuditRoundStatusLabel\(round\.status, t\)\} status=\{effectiveAuditRoundStatus\(round\.status\)\} \/>/g
  assert.equal(round.match(badge)?.length, 1, "the round page header")

  const employee = read(`${D}master-data/employees/[id]/page.tsx`)
  assert.match(employee, /badge: getAuditRoundStatusLabel\(round\.status, tAuditRound\),\n\s+tone: getStatusTone\(effectiveAuditRoundStatus\(round\.status\)\),/)
  assert.match(employee, /function getAuditRoundStatusLabel\(status: string, tAuditRound: \(key: string\) => string\) \{\s+return tAuditRound\(auditRoundStatusLabelKey\(status\) \?\? "statusOpen"\)\s+\}/)
  assert.doesNotMatch(employee, /auditRoundStatus(?:Draft|Open|Closed)|round\.status === "closed" \? "success" : "info"/)

  const search = read("src/app/api/search/route.ts")
  const rounds = search.slice(search.indexOf("async function searchAuditRounds("), search.indexOf("async function searchDisposalRequests("))
  assert.match(rounds, /const t = await getTranslations\(\{ locale, namespace: "auditRound" \}\)/)
  assert.match(rounds, /badge: \{ label: t\(auditRoundStatusLabelKey\(round\.status\) \?\? "statusOpen"\), colorCode: null \},/)
  assert.doesNotMatch(rounds, /label: round\.status\b/)
})

test("the dashboard reads a draft as open: the current-round pick and the item counts (group 2 spec §14)", () => {
  const rules = read("src/lib/dashboard-overview-rules.ts")
  assert.match(rules, /const candidates = rounds\.filter\(\(round\) => isAuditRoundOperationalStatus\(round\.status\) && \(eligible \? eligible\(round\) : true\)\)/)
  assert.doesNotMatch(rules, /round\.status === "open"/)
  assert.doesNotMatch(read("src/lib/dashboard-overview.ts"), /status: "open"/)
})
