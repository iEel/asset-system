# Page Group 2 (Audit) Plan 1: Rounds List, Create a Round, No Drafts, One Round Count — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the rounds list (AU-Rounds) and the create form (AU-New) to the approved group 2 design, stop making draft rounds, and give every count of a round one shared rule: out-of-scope items leave every total.

**Architecture:** Pure rules files (`*-rules.ts`, node --test imports them) hold the decisions: the effective round status, the own-item count, the preview folds, the list's views, readiness and next step. Thin server readers (`audit-round-counts.ts`, `audit-round.ts`) run chunked Prisma queries. The pages and the form use the shared parts only (PageHeader, FormSection, StickyFormFooter, TabNav, FilterChipList, StatStrip, PaceBar, RowActions, Notice). No schema change and no migration: old drafts read as open where they are shown.

**Tech Stack:** Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next code), React 19, next-intl (Thai first), Prisma 7 on SQL Server, Tailwind 4 tokens, shadcn/Radix parts, `node --test` source and rule tests, Playwright E2E (4 projects: desktop/phone × light/dark).

**Spec:** `docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md` (approved, committed `28abba7b`). This plan covers §5 (what a round counts), §6, §7, §13 bugs 1 and 3-8, §14, the §16 steps for these pages, and Appendix A for §6/§7. Plans 2-4 cover the round page, pending, findings, the phone walk and the record sheet.

**Base:** master `28abba7b`. **Branch:** `feat/group2-audit-rounds`. **Dry run:** none (the user agreed, 2026-10-26).

**Execution:** subagent-driven. Implementers are the `opus-medium-implementer` agent type; the main session reviews each task itself (no reviewer subagent). Tasks run in order 1 → 7; each later task assumes the earlier ones are committed.

**E2E (the user's cadence):** after Task 7, one targeted run of `e2e/audit e2e/smoke e2e/dashboard e2e/asset-detail e2e/cross-cutting/field-errors.spec.ts e2e/cross-cutting/roles.spec.ts e2e/disposal/open-audit-block.spec.ts` on the dev DB, from a clean build (`rm -rf .next && npm run build`). The whole suite runs once after plan 4 of this group, and again before the deploy.

## Global Constraints

- Words follow `docs/19_THAI_GLOSSARY.md` ("หมวดหมู่", never "หมวด" alone). Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together; change files live in the session scratchpad, never in the repo. No raw code (`draft`, `cancelled`, `need_review` …) reaches the screen.
- Shared parts and tokens only: no hex or rgba in tsx, no `dark:`, no `/NN` tints. A new shared part needs its DESIGN.md section. Both themes must read correctly.
- Permissions: `audit:view` reads; `audit:edit` scans and records (nobody else gets a scan href); `audit:approve` cancels and closes; create keeps today's create permission.
- **Counts equal lists.** A number that links somewhere equals the rows behind the link. The strip "งานที่ต้องทำต่อ" is round-wide; the tab counts and the table follow the search (R1).
- **Own items:** a round's items are its items whose result is not `out_of_scope`. Prisma's `{ not: "out_of_scope" }` drops NULL (pending) rows, so the where is always `{ OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] }`, joined with AND.
- SQL Server takes about 2,100 parameters: any id list that can grow with the register is chunked at 2,000 (`chunkAuditIds`, Task 2).
- No schema change and no migration. No `.strict()` on the create schema (old clients and E2E API callers still send `status`).
- Pure files (`*-rules.ts`) use relative `.ts` imports and `import type` only.
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` before its commit. A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Secrets: never read or print `.env`, `.env.prod-admin` or `.env.e2e`. Nothing in this plan writes to Production; E2E runs on the dev DB only and never runs LDAP sync, the settings save, Excel import, a failed login or a delete.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A scope as large as the whole register** (the create form's first live count, an "all assets" round, more than 2,100 assets): the preview, the overlap check and the create must not fail on SQL Server's parameter limit. Task 3 loads components by relation, not by an id list, and chunks the overlap; its tests pin both.
2. **Pending items have a NULL result:** every own-item count and list (dashboard, round page "ทั้งหมด", rounds list, coverage, overlap) must keep them. Task 2's tests pin the null-safe where and the fold.
3. **Old drafts** (Production `AUD-2026-0002 "Test"`, the dev DB's leftovers): they read "เปิดตรวจ" on the list, the round page, the dashboard, the employee page and the global search, with no data change and no "ร่าง" on audit screens. Task 1's tests pin each reader.
4. **Fast typing in the create form:** a half-typed name or date never fails the live count, a slower old answer never overwrites a newer one, and a failed count never moves focus. Task 3 (scope-only schema) and Task 4 (450 ms debounce, AbortController) pin it.
5. **A viewer** (`audit:view` only) never gets a scan href from the strip, a row, or a phone card; "เดินตรวจต่อ (N)" opens the pending list for them. Task 5's rules tests and Task 7's E2E pin it.

---

### Task 1: Round status: drafts read as open, no raw status word

An old `draft` round reads as open everywhere (spec §14): the badge "เปิดตรวจ" with the open tone, the dashboard's current round and its item counts. The closed badge reads "ปิดรอบแล้ว" (spec §6). The employee page and the global search show the round's status word, never the code (spec §5 "No raw code ever reaches the screen", R12). Nothing writes a round's status here; the form and the create API are Task 3 and Task 4.

**Files:**
- Modify: `src/lib/audit-round-status.ts` (after `:13`: two pure helpers)
- Modify: `src/lib/dashboard-overview-rules.ts:94-97` (doc comment), `:103` (the candidates filter)
- Modify: `src/lib/dashboard-overview.ts:54` (the item groupBy's round status)
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/page.tsx:29` (import), `:406`, `:512` (the two badges), `:875-881` (label function)
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx:36` (import), `:485` (badge), `:865-871` (label function)
- Modify: `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx:13-14` (imports), `:491-492` (badge and tone), `:569-574` (label function)
- Modify: `src/app/api/search/route.ts:1-15` (import), `:347-374` (`searchAuditRounds`)
- Modify: `e2e/audit/field-audit.spec.ts:385` (the closed badge's word)
- Modify: `messages/th.json`, `messages/en.json` (only through `node scripts/messages-edit.mjs`)
- Test:
  - `tests/audit-round-status.test.ts` (new)
  - `tests/dashboard-overview-rules.test.ts:95-116` (rewritten)
  - `tests/dashboard-overview.test.ts:21` (rewritten)
  - `tests/audit-pages-sweep-ui.test.ts:107` (rewritten)
  - `tests/e2e-audit.test.ts:168-187` (one assertion added to EA4)

**Interfaces:**
- Consumes: `isAuditRoundOperationalStatus`, `auditRoundOperationalWhere` (`src/lib/audit-round-status.ts`, unchanged); `getStatusTone` (`src/lib/status-tone.ts`, unchanged: `open` → `"info"`, `closed` → `"success"`, `cancelled` → `"danger"`, `draft` → `"muted"`); next-intl `getTranslations({ locale, namespace })` (the search route's own pattern, `route.ts:275`).
- Produces (`src/lib/audit-round-status.ts`, pure, no imports):
  - `effectiveAuditRoundStatus(status: string): string`: `"draft"` → `"open"`, every other value unchanged.
  - `type AuditRoundStatusLabelKey = "statusOpen" | "statusClosed" | "statusCancelled"`
  - `auditRoundStatusLabelKey(status: string): AuditRoundStatusLabelKey | null`: works on the effective status; `null` for an unknown value. Every caller writes `auditRoundStatusLabelKey(status) ?? "statusOpen"`: an unknown status is operational for `isAuditRoundOperationalStatus`, so it reads as open, never as its code.
  - Task 5 and Task 6 (rounds list) use both helpers for the one computed badge; plan 2 uses them on the round page.

- [ ] **Step 1: Change the words**

Write this change file outside the repo, in the session scratchpad, then run `node scripts/messages-edit.mjs <file>`. The run sets 2 keys in th and 1 in en and deletes 3. "ปิดรอบแล้ว" is the spec's closed badge (§6) and passes `tests/thai-glossary.test.ts`.

```json
{
  "set": {
    "th": { "auditRound.statusClosed": "ปิดรอบแล้ว", "systemLogPage.value_auditRound_status_closed": "ปิดรอบแล้ว" },
    "en": { "auditRound.statusClosed": "Closed" }
  },
  "delete": ["employee.auditRoundStatusDraft", "employee.auditRoundStatusOpen", "employee.auditRoundStatusClosed"]
}
```

| Key | th | en |
|---|---|---|
| `auditRound.statusClosed` (changed) | ปิดรอบแล้ว | Closed |
| `systemLogPage.value_auditRound_status_closed` (changed, R19) | ปิดรอบแล้ว | Closed (unchanged) |

Deleted keys: `employee.auditRoundStatusDraft`, `employee.auditRoundStatusOpen`, `employee.auditRoundStatusClosed` (the employee page now reads the `auditRound` words).

Kept:
- `auditRound.statusDraft`: `src/components/audit/audit-round-form.tsx:219` still reads it until Task 4 removes the status select. Task 4 deletes it.
- `systemLogPage.value_auditRound_status_draft` ("ร่าง"): it renders old create logs; history keeps its word.

- [ ] **Step 2: Write the failing tests**

`tests/audit-round-status.test.ts` (new):

```ts
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
```

- [ ] **Step 3: Rewrite these pins**

- `tests/dashboard-overview-rules.test.ts:95` (test name) becomes `"the current round: an open round (an old draft reads as open) in its dates with the nearest due date, else the one past due most recently (spec §6.4, group 2 spec §14)"`.
- `:104-106` (today 2026-10-25; D is draft 10-01..10-26, in its dates, and due before B's 10-27). Recomputed from `pickCurrentAuditRound` with drafts as candidates:

  | Line | Old | New |
  |---|---|---|
  | `:104` `[a, b, future, draft, late, later]` | `{ current: b, otherOpen: 5 }` | `{ current: draft, otherOpen: 5 }` |
  | `:105` `[future, draft, late, later]` | `{ current: later, otherOpen: 3 }` | `{ current: draft, otherOpen: 3 }` |
  | `:106` `[future, draft]` | `{ current: null, otherOpen: 2 }` | `{ current: draft, otherOpen: 1 }` |

  After `:106` add:

  ```ts
  // A draft ties as an open round with the same dates would (group 2 spec §14).
  const openTwin = { ...draft, status: "open" }
  assert.equal(pickCurrentAuditRound([a, b, draft], today).current, draft)
  assert.equal(pickCurrentAuditRound([a, b, openTwin], today).current, openTwin)
  ```
- `:115` stays `{ current: a, otherOpen: 2 }` (only A is eligible). `:114`'s comment stays.
- `:149-199` stay. Re-checked: r3 is a draft (10-01..10-31) with no items, today 10-24. All companies: in dates r1 (10-31), r2 (10-27), r3 (10-31), so r2 (nearest due) is current and `otherOpen` is 2. One company: only r1 is eligible, `otherOpen` 2.
- `tests/dashboard-overview.test.ts:21`, old → new:

  ```ts
  assert.match(source, /auditRound: \{ isActive: true, status: "open" \}, \.\.\.\(companyId \? \{ expectedCompanyId: companyId \} : \{\}\)/)
  ```
  →
  ```ts
  assert.match(source, /auditRound: \{ isActive: true, status: auditRoundOperationalWhere \}, \.\.\.\(companyId \? \{ expectedCompanyId: companyId \} : \{\}\)/)
  ```
  (`:19` `/status: auditRoundOperationalWhere/` and `:20` stay. Task 2 rewrites `:21` once more.)
- `tests/audit-pages-sweep-ui.test.ts:107`, old → new:

  ```ts
  assert.equal(source.match(/<StatusBadge label=\{getAuditRoundStatusLabel\(round\.status, t\)\} status=\{round\.status\} \/>/g)?.length, 2, "the phone card and the table")
  ```
  →
  ```ts
  assert.equal(source.match(/<StatusBadge label=\{getAuditRoundStatusLabel\(round\.status, t\)\} status=\{effectiveAuditRoundStatus\(round\.status\)\} \/>/g)?.length, 2, "the phone card and the table")
  ```
- `tests/e2e-audit.test.ts`, in the EA4 test after `:186` (`closeConfirm` / `closeSuccess`), add the E2E-word guard for the closed badge:

  ```ts
  assert.ok(head.includes(`getByRole("main").getByText("${thai("auditRound").statusClosed}", { exact: true })`), "the closed badge, in the app's own word")
  ```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `node --test tests/audit-round-status.test.ts tests/dashboard-overview-rules.test.ts tests/dashboard-overview.test.ts tests/audit-pages-sweep-ui.test.ts tests/e2e-audit.test.ts`
Expected: FAIL.
- `audit-round-status.test.ts`: `effectiveAuditRoundStatus` and `auditRoundStatusLabelKey` are not exported (import error).
- `dashboard-overview-rules.test.ts`: the pick still skips drafts (`:104-106` and the twin line).
- `dashboard-overview.test.ts:21`: the groupBy still reads `status: "open"`.
- `audit-pages-sweep-ui.test.ts:107`: the badges still pass `status={round.status}`.
- `e2e-audit.test.ts` EA4: the spec still reads "ปิดรอบ".

The message assertions already pass after Step 1.

- [ ] **Step 5: Implement**

- **`src/lib/audit-round-status.ts`**, after `isAuditRoundOperationalStatus` (`:13`):

  ```ts
  // An old draft round is an open round (group 2 spec §14): the draft step is gone, and the enum value stays in the
  // schema. Its badge, its tone and the dashboard read it as open. Nothing writes "draft" any more.
  export function effectiveAuditRoundStatus(status: string): string {
    return status === "draft" ? "open" : status
  }

  const auditRoundStatusLabelKeys = { open: "statusOpen", closed: "statusClosed", cancelled: "statusCancelled" } as const
  export type AuditRoundStatusLabelKey = (typeof auditRoundStatusLabelKeys)[keyof typeof auditRoundStatusLabelKeys]

  /** The auditRound message key of a round's status word, or null for an unknown value; never the code itself. */
  export function auditRoundStatusLabelKey(status: string): AuditRoundStatusLabelKey | null
  ```
  The body: `const effective = effectiveAuditRoundStatus(status)`, then `Object.hasOwn(auditRoundStatusLabelKeys, effective) ? auditRoundStatusLabelKeys[effective as keyof typeof auditRoundStatusLabelKeys] : null` (`hasOwn`, so `"constructor"` is `null`).
- **`src/lib/dashboard-overview-rules.ts`:**
  - `:103` becomes `const candidates = rounds.filter((round) => isAuditRoundOperationalStatus(round.status) && (eligible ? eligible(round) : true))` (the import is already at `:3`).
  - The doc comment `:94-97` says: "The current round (spec §6.4, R15): an operational round (open, or an old draft read as open, group 2 spec §14) in its dates with the nearest due date, else the one past due most recently; ties go to the latest start, then the code. `otherOpen` counts every other operational round."
- **`src/lib/dashboard-overview.ts:54`** becomes `where: { auditRound: { isActive: true, status: auditRoundOperationalWhere }, ...(companyId ? { expectedCompanyId: companyId } : {}) },`. A draft that becomes the current round then has its item rows. The comment at `:47` stays true (operational = open + draft).
- **Rounds list `audit/rounds/page.tsx`:**
  - `:29` imports `auditRoundStatusLabelKey` and `effectiveAuditRoundStatus` too.
  - `:406` and `:512` become `<StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={effectiveAuditRoundStatus(round.status)} />`.
  - `:875-881` become:

    ```ts
    function getAuditRoundStatusLabel(status: string, t: Awaited<ReturnType<typeof getTranslations>>) {
      return t(auditRoundStatusLabelKey(status) ?? "statusOpen")
    }
    ```
  - `ReadyToCloseBadge` (`:407-408`, `:513-514`) keeps `status={round.status}`: it tests `isAuditRoundOperationalStatus`, which already holds for a draft.
- **Round page `audit/rounds/[id]/page.tsx`:**
  - `:36` imports `auditRoundStatusLabelKey, effectiveAuditRoundStatus, isAuditRoundReadOnlyStatus`.
  - `:485` becomes the same badge line as the list.
  - `:865-871` become the same one-line body with `t: AuditRoundTranslator`. This is the only round-page change in plan 1's Task 1. §14 says the badge reads "เปิดตรวจ"; the page itself is plan 2's.
- **Employee page `master-data/employees/[id]/page.tsx`:**
  - Imports: `import { auditRoundStatusLabelKey, effectiveAuditRoundStatus } from "@/lib/audit-round-status"` and `import { getStatusTone } from "@/lib/status-tone"`.
  - `:491-492` become:

    ```tsx
                  badge: getAuditRoundStatusLabel(round.status, tAuditRound),
                  tone: getStatusTone(effectiveAuditRoundStatus(round.status)),
    ```
    (`tAuditRound` is already loaded at `:43`.) A cancelled round now reads "ยกเลิก" in the danger tone. Today it shows the raw "cancelled" in the info tone.
  - `:569-574` become:

    ```ts
    function getAuditRoundStatusLabel(status: string, tAuditRound: (key: string) => string) {
      return tAuditRound(auditRoundStatusLabelKey(status) ?? "statusOpen")
    }
    ```
- **Global search `src/app/api/search/route.ts`:**
  - Import `auditRoundStatusLabelKey` from `@/lib/audit-round-status`.
  - `searchAuditRounds` (`:347`) starts with `const t = await getTranslations({ locale, namespace: "auditRound" })`, as `searchLocations` does at `:275`.
  - `:372` becomes `badge: { label: t(auditRoundStatusLabelKey(round.status) ?? "statusOpen"), colorCode: null },`.

  The round words come from the same messages as the audit pages, so the search and the pages read one word (see Drafter's notes, item 3).
- **`e2e/audit/field-audit.spec.ts:385`** becomes:

  ```ts
      await expect(page.getByRole("main").getByText("ปิดรอบแล้ว", { exact: true }).first()).toBeVisible()
  ```
  The round page's closed badge now reads "ปิดรอบแล้ว". The old exact "ปิดรอบ" would match nothing. The controller runs this step in Task 7's targeted run.
- **No change** (they already treat a draft as open, recon-draft-counts §1):
  - `approval-inbox-query.ts`, `waiting-work-rules.ts` (the bell and the notification digest), `work-center/page.tsx`;
  - `audit-finding-filters.ts`, `asset-detail-frame.ts`, `disposal-readiness.ts`;
  - the scan page guard and the scan / close / cancel / review / export routes;
  - the rounds list's `open` view (`:864`).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/audit-round-status.test.ts tests/dashboard-overview-rules.test.ts tests/dashboard-overview.test.ts tests/audit-pages-sweep-ui.test.ts tests/e2e-audit.test.ts tests/audit-round-cancellation.test.ts tests/audit-rounds-ux.test.ts tests/dashboard-page.test.ts tests/global-search.test.ts tests/audit-item-status-labels.test.ts tests/master-data-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/status-badge.test.ts tests/system-log-presenter.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS.
- `audit-round-cancellation.test.ts:12-21` still holds (draft stays operational) and `:26` still holds (the schema is Task 3's).
- `audit-rounds-ux.test.ts:42-66` still finds every `auditRound` key it pins.
- tsc is clean: the label key union is a string for next-intl's `t`, and the employee page's translator type is unchanged.

Then run: `npm test && npm run lint`
Expected: PASS. A pin that fails outside this list is rewritten in this commit and named in the report.

- [ ] **Step 7: Commit**

```bash
git add src/lib/audit-round-status.ts src/lib/dashboard-overview-rules.ts src/lib/dashboard-overview.ts "src/app/[locale]/(dashboard)/audit/rounds/page.tsx" "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" "src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx" src/app/api/search/route.ts e2e/audit/field-audit.spec.ts messages/th.json messages/en.json tests/audit-round-status.test.ts tests/dashboard-overview-rules.test.ts tests/dashboard-overview.test.ts tests/audit-pages-sweep-ui.test.ts tests/e2e-audit.test.ts
git commit -m "fix(audit): an old draft round reads as open, in the badge, its tone and the dashboard's current round and counts; the closed badge reads ปิดรอบแล้ว; the employee page and the global search show the round's status word, never its code (group 2 plan 1 task 1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: One round count (§5 "What a round counts")

A round's own items are its items without the out-of-scope result (spec §5). An out-of-scope scan creates an `AuditItem` in the round with `auditResult: "out_of_scope"` and `auditStatus: "reviewed"` (`api/audit-rounds/[id]/scan/route.ts:145-168`). Today that item counts as total and as checked everywhere.

This task adds:
- one pure rule file and one server reader;
- the dashboard's item count on own items only, and the round page's result lists (all but out-of-scope and pending-review) on the same rule, so the KPI equals the list it opens (R5);
- the round page's "ทั้งหมด" number and its progress total from the own count. This is plan 2's page, so the edit is minimal.

What stays in plan 1:
- The rounds list moves onto the reader in Task 5. Its out-of-scope count stays from the scan history (R4, pin `tests/audit-rounds-ux.test.ts:24` stays).
- The round page's out-of-scope list and its "นอกขอบเขต N" stay on the scan history until plan 2.

**Files:**
- Create: `src/lib/audit-round-counts-rules.ts` (pure, client-safe: `import type` from `@prisma/client` only, no other imports)
- Create: `src/lib/audit-round-counts.ts` (server)
- Modify: `src/lib/dashboard-overview.ts:7-14` (import), `:52-56` (the groupBy's where)
- Modify: `src/lib/audit-round-result-filters.ts:1-2` (import), `:150-155` (the return of `buildAuditRoundItemWhere`)
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`:
  - `:35-36` (imports);
  - `:78` (the destructured name);
  - `:134` (`_count` leaves the include);
  - `:137-141` (the auditStatus groupBy becomes the reader);
  - `:282-295` (the counts);
  - `:404-405` (cancel impact);
  - `:555-558` (StatStrip);
  - `:564-566` (AuditProgressBar).
- Test:
  - `tests/audit-round-counts.test.ts` (new)
  - `tests/dashboard-overview.test.ts:21` (rewritten again)
  - `tests/audit-round-result-drilldown.test.ts:20-39`, `:41-50`, `:296-316` (rewritten)

**Interfaces:**
- Consumes:
  - `auditRoundOperationalWhere` (`src/lib/audit-round-status.ts`);
  - `buildAuditRoundItemWhere` (`src/lib/audit-round-result-filters.ts`, signature unchanged);
  - `prisma` (`@/lib/db`).
- Produces, in `src/lib/audit-round-counts-rules.ts`:
  - `AUDIT_OUT_OF_SCOPE_RESULT = "out_of_scope"`
  - `isAuditRoundOwnItem(item: { auditResult: string | null }): boolean`
  - `auditRoundOwnItemWhere: Prisma.AuditItemWhereInput`, equal to `{ OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] }`
  - `auditRoundOutOfScopeItemWhere: Prisma.AuditItemWhereInput`, equal to `{ auditResult: "out_of_scope" }`
  - `withAuditRoundOwnItems(where: Prisma.AuditItemWhereInput): Prisma.AuditItemWhereInput`, which returns `{ AND: [where, auditRoundOwnItemWhere] }`
  - `type AuditRoundCountRow = { auditRoundId: string; auditStatus: string; auditResult: string | null; count: number }`
  - `type AuditRoundCounts = { total: number; pending: number; checked: number; outOfScope: number }`
  - `emptyAuditRoundCounts: Readonly<AuditRoundCounts>` (frozen zeros)
  - `foldAuditRoundCounts(rows: readonly AuditRoundCountRow[]): Map<string, AuditRoundCounts>`: out-of-scope rows go to `outOfScope` only; a round with no row is absent.
  - `AUDIT_ID_CHUNK_SIZE = 2000` and `chunkAuditIds<T>(ids: readonly T[], size?: number): T[][]` (added beyond the skeleton; Task 3's overlap query chunks its asset ids with it, R11).
- Produces, in `src/lib/audit-round-counts.ts`:
  - `getAuditRoundCounts(roundIds: readonly string[], where?: Prisma.AuditItemWhereInput): Promise<Map<string, AuditRoundCounts>>`. It runs one `auditItem.groupBy` per 2,000 ids. Every requested id is in the map, with zeros when the round has no items.
- For later tasks:
  - Task 3 adds `foldTopCategories` to the rules file and uses `chunkAuditIds` with `auditRoundOwnItemWhere` for the overlap.
  - Task 5 calls `getAuditRoundCounts(roundIds)` inside the rounds list's `withPerformanceTiming("audit-rounds.progress-data", …)`, and `withAuditRoundOwnItems` for the coverage.
  - Plan 2 passes `where` for company / branch / category / search.

- [ ] **Step 1: Write the failing tests**

`tests/audit-round-counts.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_ID_CHUNK_SIZE,
  AUDIT_OUT_OF_SCOPE_RESULT,
  auditRoundOutOfScopeItemWhere,
  auditRoundOwnItemWhere,
  chunkAuditIds,
  emptyAuditRoundCounts,
  foldAuditRoundCounts,
  isAuditRoundOwnItem,
  withAuditRoundOwnItems,
} from "../src/lib/audit-round-counts-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("a round's own items are its items without the out-of-scope result; a pending item's null result is its own (group 2 spec §5)", () => {
  assert.equal(AUDIT_OUT_OF_SCOPE_RESULT, "out_of_scope")
  assert.equal(isAuditRoundOwnItem({ auditResult: null }), true, "a pending item")
  for (const result of ["found", "confirmed_with_parent", "not_found", "wrong_location", "need_review"]) {
    assert.equal(isAuditRoundOwnItem({ auditResult: result }), true, result)
  }
  assert.equal(isAuditRoundOwnItem({ auditResult: "out_of_scope" }), false)
  // Prisma's `not` compiles to [auditResult] <> @p, which drops NULL rows: every pending item would vanish.
  assert.deepEqual(auditRoundOwnItemWhere, { OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] })
  assert.deepEqual(auditRoundOutOfScopeItemWhere, { auditResult: "out_of_scope" })
})

test("the own-items where is AND-combined, so a caller's own OR (a search) survives", () => {
  const searched = { auditRoundId: "r1", OR: [{ asset: { assetTag: { contains: "PC" } } }, { asset: { name: { contains: "PC" } } }] }
  assert.deepEqual(withAuditRoundOwnItems(searched), { AND: [searched, auditRoundOwnItemWhere] })
  assert.deepEqual(withAuditRoundOwnItems({}), { AND: [{}, auditRoundOwnItemWhere] })
})

test("one fold gives each round its own total, pending and checked, and its out-of-scope finds apart (group 2 spec §5)", () => {
  const counts = foldAuditRoundCounts([
    { auditRoundId: "r1", auditStatus: "pending", auditResult: null, count: 5 },
    { auditRoundId: "r1", auditStatus: "scanned", auditResult: "found", count: 7 },
    { auditRoundId: "r1", auditStatus: "reviewed", auditResult: "wrong_location", count: 2 },
    // The review route sets the status only, so a checked item can have no result.
    { auditRoundId: "r1", auditStatus: "reviewed", auditResult: null, count: 1 },
    { auditRoundId: "r1", auditStatus: "reviewed", auditResult: "out_of_scope", count: 3 },
    { auditRoundId: "r2", auditStatus: "reviewed", auditResult: "out_of_scope", count: 1 },
  ])
  assert.deepEqual(counts.get("r1"), { total: 15, pending: 5, checked: 10, outOfScope: 3 })
  assert.deepEqual(counts.get("r2"), { total: 0, pending: 0, checked: 0, outOfScope: 1 })
  assert.equal(counts.has("r3"), false)
  assert.equal(foldAuditRoundCounts([]).size, 0)
  assert.deepEqual(emptyAuditRoundCounts, { total: 0, pending: 0, checked: 0, outOfScope: 0 })
  assert.equal(Object.isFrozen(emptyAuditRoundCounts), true)
})

test("ids reach SQL Server in chunks of 2,000, under its 2,100-parameter limit", () => {
  assert.equal(AUDIT_ID_CHUNK_SIZE, 2000)
  const ids = Array.from({ length: 4001 }, (_, index) => `r${index}`)
  assert.deepEqual(chunkAuditIds(ids).map((chunk) => chunk.length), [2000, 2000, 1])
  assert.deepEqual(chunkAuditIds(ids).flat(), ids)
  assert.deepEqual(chunkAuditIds([]), [])
  assert.deepEqual(chunkAuditIds(["a", "b", "c"], 2), [["a", "b"], ["c"]])
})

test("the count rules are pure and client-safe, and say that a re-scan turns an out-of-scope find into an own item", () => {
  const source = read("src/lib/audit-round-counts-rules.ts")
  assert.doesNotMatch(source, /from "@\//, "node --test and the phone walk import this file")
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.match(source, /A re-scan of an out-of-scope find/)
})

test("one groupBy counts any set of rounds, in chunks of ids, folded by the rules; every requested round is in the map", () => {
  const source = read("src/lib/audit-round-counts.ts")
  assert.match(source, /export async function getAuditRoundCounts\(roundIds: readonly string\[\], where\?: Prisma\.AuditItemWhereInput\): Promise<Map<string, AuditRoundCounts>>/)
  assert.match(source, /const ids = \[\.\.\.new Set\(roundIds\)\]/)
  assert.match(source, /chunkAuditIds\(ids\)\.map\(\(chunk\) =>/)
  assert.match(source, /prisma\.auditItem\.groupBy\(\{\s*by: \["auditRoundId", "auditStatus", "auditResult"\],\s*where: where \? \{ AND: \[\{ auditRoundId: \{ in: chunk \} \}, where\] \} : \{ auditRoundId: \{ in: chunk \} \},\s*_count: \{ _all: true \},?\s*\}\)/)
  assert.match(source, /foldAuditRoundCounts\(/)
  assert.match(source, /for \(const id of ids\) if \(!counts\.has\(id\)\) counts\.set\(id, \{ \.\.\.emptyAuditRoundCounts \}\)/)
  assert.equal(source.match(/prisma\.\w+\.\w+\(/g)?.length, 1, "one query shape")
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(/)
})

test("the dashboard counts the round's own items, so its KPI equals the round page's list it opens (group 2 spec §5, R5)", () => {
  const source = read("src/lib/dashboard-overview.ts")
  assert.match(source, /import \{ withAuditRoundOwnItems \} from "@\/lib\/audit-round-counts-rules"/)
  assert.match(source, /where: withAuditRoundOwnItems\(\{ auditRound: \{ isActive: true, status: auditRoundOperationalWhere \}, \.\.\.\(companyId \? \{ expectedCompanyId: companyId \} : \{\}\) \}\),/)
  const filters = read("src/lib/audit-round-result-filters.ts")
  assert.match(filters, /import \{ withAuditRoundOwnItems \} from "\.\/audit-round-counts-rules\.ts"/)
  assert.match(filters, /return result === "out_of_scope" \|\| result === "pending_review" \? where : withAuditRoundOwnItems\(where\)/)
})

test("the round page's total, checked and progress count the round's own items (group 2 spec §5; plan 1's minimal edit)", () => {
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
  assert.match(page, /getAuditRoundCounts\(\[id\]\),/)
  assert.match(page, /const roundCounts = roundCountsById\.get\(round\.id\) \?\? emptyAuditRoundCounts/)
  assert.match(page, /const pendingCount = roundCounts\.pending\n\s+const processedCount = roundCounts\.checked/)
  assert.match(page, /const progress = roundCounts\.total > 0 \? Math\.round\(\(roundCounts\.checked \/ roundCounts\.total\) \* 100\) : 0/)
  assert.match(page, /\{ key: "totalExpected", label: t\("totalExpected"\), value: formatCount\(roundCounts\.total\) \}/)
  assert.match(page, /\{ key: "scanned", label: t\("scanned"\), value: formatCount\(processedCount\) \}/)
  assert.match(page, /<AuditProgressBar\s+total=\{roundCounts\.total\}\s+processed=\{processedCount\}\s+pending=\{pendingCount\}/)
  // The cancel dialog's "work done" stays the API's count (route.ts getCancellationImpact): every non-pending item.
  assert.match(page, /processedItems: roundCounts\.checked \+ roundCounts\.outOfScope,/)
  assert.doesNotMatch(page, /_count\.items|_count: \{ select: \{ items: true|by: \["auditStatus"\]|scannedCount/)
  assert.doesNotMatch(page, /statusCounts|round\._count/, "the old pendingCount / processedCount lines are gone")
})
```

- [ ] **Step 2: Rewrite these pins**

- `tests/dashboard-overview.test.ts:21` (Task 1's line), old → new:

  ```ts
  assert.match(source, /auditRound: \{ isActive: true, status: auditRoundOperationalWhere \}, \.\.\.\(companyId \? \{ expectedCompanyId: companyId \} : \{\}\)/)
  ```
  →
  ```ts
  assert.match(source, /where: withAuditRoundOwnItems\(\{ auditRound: \{ isActive: true, status: auditRoundOperationalWhere \}, \.\.\.\(companyId \? \{ expectedCompanyId: companyId \} : \{\}\) \}\),/)
  ```
  `:19`, `:20` (`by: ["auditRoundId", "expectedBranchId", "auditStatus"]`), `:26` (one `await Promise.all([`) and `:27` (no `await prisma.`) stay.
- `tests/audit-round-result-drilldown.test.ts`, after the imports (`:18`), add:

  ```ts
  // The round's own items (group 2 spec §5): every list but the out-of-scope and pending-review ones leaves the out-of-scope finds out,
  // null-safe because a pending item has no result.
  const own = (where: object) => ({ AND: [where, { OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] }] })
  ```
  Then wrap each expected where in `own(…)`:

  | Line | Call | Old expected | New expected |
  |---|---|---|---|
  | `:24-27` | `result: "found"` | `{ auditRoundId: "round-1", auditResult: { in: ["found", "confirmed_with_parent"] } }` | `own({ auditRoundId: "round-1", auditResult: { in: ["found", "confirmed_with_parent"] } })` |
  | `:28-31` | `result: "not_found"` | `{ auditRoundId: "round-1", auditResult: "not_found" }` | `own({ … the same … })` |
  | `:32-35` | `result: "wrong_location"` | `{ auditRoundId: "round-1", findings: { some: { findingType: "wrong_location" } } }` | `own({ … the same … })` |
  | `:43-50` | `wrong_custodian` + search `SNI-EQU` | `{ auditRoundId, findings…, OR: [assetTag, name] }` | `own({ … the same … })` |
  | `:297-300` | `all` + `branchId` | `{ auditRoundId: "round-1", expectedBranchId: "branch-1" }` | `own({ … the same … })` |
  | `:301-304` | `all` + `companyId` | `{ auditRoundId: "round-1", expectedCompanyId: "company-1" }` | `own({ … the same … })` |
  | `:305-314` | `not_found` + search + both | `{ auditRoundId, expectedCompanyId, expectedBranchId, auditResult: "not_found", OR: […] }` | `own({ … the same … })` |
  | `:315` | `all`, `companyId: null, branchId: null` | `{ auditRoundId: "round-1" }` | `own({ auditRoundId: "round-1" })` |

  At the end of the first test (after `:39`) add:

  ```ts
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "" }), own({ auditRoundId: "round-1" }))
  // The out-of-scope list still reads the scan history (buildAuditRoundScanHistoryWhere); plan 2 moves it onto items.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "out_of_scope", search: "" }), { auditRoundId: "round-1" })
  // The pending-review list follows the pending findings, out-of-scope finds included, as its count does (R3, the close checklist).
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "pending_review", search: "" }), { auditRoundId: "round-1", findings: { some: { reviewStatus: "pending" } } })
  ```
  These stay: `:36-39` (`pending_review`: its old expected where stays unwrapped), `:52-59` (`buildAuditRoundScanHistoryWhere`), `:160-178` (the exports call `buildAuditRoundItemWhere({ roundId, result, search, ...filters })`) and `:364` (the round page's `resultItemWhere` line).

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/audit-round-counts.test.ts tests/dashboard-overview.test.ts tests/audit-round-result-drilldown.test.ts`
Expected: FAIL.
- `audit-round-counts.test.ts`: `src/lib/audit-round-counts-rules.ts` does not exist (import error).
- `dashboard-overview.test.ts:21`: the groupBy has no `withAuditRoundOwnItems`.
- `audit-round-result-drilldown.test.ts`: `buildAuditRoundItemWhere` returns the bare where.

- [ ] **Step 4: Implement**

- **`src/lib/audit-round-counts-rules.ts`** (new). Header comment, then the exports in the Interfaces order:

  ```ts
  // What a round counts (group 2 spec §5). An out-of-scope scan creates an AuditItem in the round with
  // auditResult "out_of_scope" (api/audit-rounds/[id]/scan/route.ts). The round's own items are its items without that
  // result: only they count in a total, a progress bar, "ตรวจแล้ว x / y" and the dashboard's round numbers. The
  // out-of-scope finds are counted apart, from the same rows. A re-scan of an out-of-scope find goes through the in-round
  // path and overwrites its result (found / wrong_* / need_review), so it becomes an own item; the phone walk's register
  // lookup fixes that in plan 3. Pure and client-safe: `import type` only, so node --test and the phone walk import it.
  import type { Prisma } from "@prisma/client"
  ```
  - `isAuditRoundOwnItem` returns `item.auditResult !== AUDIT_OUT_OF_SCOPE_RESULT`.
  - `auditRoundOwnItemWhere` carries the comment: "auditResult is nullable, and a pending item's is null. Prisma's `not` compiles to `[auditResult] <> @p`, which drops NULL rows, so the null branch is spelled out."
  - `withAuditRoundOwnItems` returns `{ AND: [where, auditRoundOwnItemWhere] }`: `AND`, so a caller's `OR` (the search in `buildAuditRoundItemWhere`) survives.
  - `emptyAuditRoundCounts = Object.freeze({ total: 0, pending: 0, checked: 0, outOfScope: 0 })`.
  - `foldAuditRoundCounts`: for each row, take the round's counts (or a copy of the empty ones). If the row is not own, add its count to `outOfScope` only. Else add it to `total`, and to `pending` when `auditStatus === "pending"`, else to `checked`. `checked` comes from the status, not the result, because a reviewed item can have a null result.
  - `AUDIT_ID_CHUNK_SIZE = 2000` (SQL Server takes at most 2,100 parameters); `chunkAuditIds(ids, size = AUDIT_ID_CHUNK_SIZE)` slices `ids` in order.
- **`src/lib/audit-round-counts.ts`** (new, server):

  ```ts
  import type { Prisma } from "@prisma/client"
  import { prisma } from "@/lib/db"
  import { chunkAuditIds, emptyAuditRoundCounts, foldAuditRoundCounts, type AuditRoundCounts } from "@/lib/audit-round-counts-rules"

  // One count for any set of rounds (group 2 spec §5): the round's own total, pending and checked, and the out-of-scope
  // finds apart, from one groupBy per 2,000 rounds. `where` narrows the items (plan 2: company, branch, category,
  // search). Every requested round is in the map, with zeros when it has no items. It never writes.
  export async function getAuditRoundCounts(roundIds: readonly string[], where?: Prisma.AuditItemWhereInput): Promise<Map<string, AuditRoundCounts>> {
    const ids = [...new Set(roundIds)]
    const groups = await Promise.all(
      chunkAuditIds(ids).map((chunk) =>
        prisma.auditItem.groupBy({
          by: ["auditRoundId", "auditStatus", "auditResult"],
          where: where ? { AND: [{ auditRoundId: { in: chunk } }, where] } : { auditRoundId: { in: chunk } },
          _count: { _all: true },
        }),
      ),
    )
    const counts = foldAuditRoundCounts(
      groups.flat().map((group) => ({ auditRoundId: group.auditRoundId, auditStatus: group.auditStatus, auditResult: group.auditResult, count: group._count._all })),
    )
    for (const id of ids) if (!counts.has(id)) counts.set(id, { ...emptyAuditRoundCounts })
    return counts
  }
  ```
  No ids, no query (`chunkAuditIds([])` is `[]`). `AND`, not a spread, so a caller's `auditRoundId` can never widen the chunk.
- **`src/lib/dashboard-overview.ts`:**
  - Add the import `import { withAuditRoundOwnItems } from "@/lib/audit-round-counts-rules"` after `:7`.
  - `:54` becomes:

    ```ts
          where: withAuditRoundOwnItems({ auditRound: { isActive: true, status: auditRoundOperationalWhere }, ...(companyId ? { expectedCompanyId: companyId } : {}) }),
    ```
    with the comment above the groupBy: "The round's own items (group 2 spec §5): an out-of-scope find is counted apart, so the KPI and each branch row equal the round page's list they open." The `by` and the fold (`buildDashboardAudit`) do not change. An out-of-scope find of another branch no longer adds a stray branch row. A company whose only items in a round are out-of-scope finds no longer makes that round current (`roundsWithItems`).
- **`src/lib/audit-round-result-filters.ts`:**
  - `:2` gains `import { withAuditRoundOwnItems } from "./audit-round-counts-rules.ts"` (the file stays pure; `dashboard-overview-rules.ts` imports it).
  - `buildAuditRoundItemWhere`'s `return where` (`:155`) becomes:

    ```ts
    // The round's own items (group 2 spec §5): every result list leaves the out-of-scope finds out, so the dashboard's KPI
    // equals the list it opens. Two lists keep them: the out-of-scope list (it reads the scan history; plan 2 moves it onto
    // items with auditRoundOutOfScopeItemWhere) and the pending-review list, which follows the pending findings as its
    // count does (page.tsx pendingReviewCount, the close checklist, R3); an out-of-scope find waits for review too.
    return result === "out_of_scope" || result === "pending_review" ? where : withAuditRoundOwnItems(where)
    ```
  - The signature stays. The round page's list and count (`[id]/page.tsx:73`, `:204`), the Excel export (`export/route.ts:128`) and the PDF export (`export-pdf/route.ts:109`) follow with no edit of their own (see Drafter's notes, item 7).
- **Round page `audit/rounds/[id]/page.tsx`** (minimal: plan 2 rebuilds the page):
  - Imports: `import { getAuditRoundCounts } from "@/lib/audit-round-counts"` and `import { emptyAuditRoundCounts } from "@/lib/audit-round-counts-rules"`.
  - The destructured `statusCounts` (`:78`) becomes `roundCountsById`. The groupBy at `:137-141` becomes `getAuditRoundCounts([id]),` in the same place. `resultCounts` (`:142-146`, by `auditResult`), `findingTypeCounts` and the scan-history counts stay.
  - `_count: { select: { items: true, findings: true } },` (`:134`) goes. After this edit nothing reads `round._count`.
  - `:282-283` (`pendingCount` from `statusCounts`, `processedCount` from `round._count.items`) are replaced, in the same place after `if (!round) notFound()` (`:249`), by:

    ```ts
    const roundCounts = roundCountsById.get(round.id) ?? emptyAuditRoundCounts
    const pendingCount = roundCounts.pending
    const processedCount = roundCounts.checked
    ```
    `scannedCount` (`:284-286`) goes: it equalled every non-pending item, out-of-scope finds included, and could pass the total. `:295` becomes `const progress = roundCounts.total > 0 ? Math.round((roundCounts.checked / roundCounts.total) * 100) : 0`.
  - The cancel impact (`:405`) becomes `processedItems: roundCounts.checked + roundCounts.outOfScope,`. It stays the API's `getCancellationImpact` count (`api/audit-rounds/[id]/route.ts:188`, every non-pending item): it is the work done, and the dialog and the API must agree.
  - StatStrip (`:555`, `:557`): `value: formatCount(roundCounts.total)` and `value: formatCount(processedCount)`.
  - `<AuditProgressBar` (`:564`): `total={roundCounts.total}`; `processed={processedCount}` and `pending={pendingCount}` keep their names. The breakdown (`foundCount`, `mismatchCount`, `notFoundCount`) already leaves `out_of_scope` out (`audit-result-summary.ts:3-9`).
  - The page has no `withPerformanceTiming`. The skeleton's "label kept" concerns the rounds list's two labels, which Task 5 keeps.
- **E2E:** no step changes.
  - No step reads a round's total, progress or "all" list after an out-of-scope scan (recon-tests-e2e (c)).
  - The dashboard's step (d) (`e2e/dashboard/dashboard.spec.ts:108-127`) proves the where is null-safe: its round's items are all pending, so their results are null. If the own-items where dropped NULL rows, the round would have no item rows and its branch row would be missing.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-round-counts.test.ts tests/dashboard-overview.test.ts tests/dashboard-overview-rules.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-status.test.ts tests/audit-round-cancellation.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-rounds-ux.test.ts tests/dashboard-page.test.ts tests/audit-item-status-labels.test.ts && npx tsc --noEmit`
Expected: PASS.
- `audit-round-cancellation.test.ts:110` still finds `impact.processedItems`.
- `audit-pages-sweep-ui.test.ts:125` still finds `<ContentPanel className="mb-6">\s*<AuditProgressBar`.
- tsc accepts the groupBy inside `.map`. If Prisma's groupBy generics fail to infer there, hoist the args into a `const args = { … } satisfies Prisma.AuditItemGroupByArgs` per chunk; the pinned text does not change.

Then run: `npm test && npm run lint`
Expected: PASS. A pin that fails outside this list is rewritten in this commit and named in the report.

- [ ] **Step 6: Commit**

```bash
git add src/lib/audit-round-counts-rules.ts src/lib/audit-round-counts.ts src/lib/dashboard-overview.ts src/lib/audit-round-result-filters.ts "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" tests/audit-round-counts.test.ts tests/dashboard-overview.test.ts tests/audit-round-result-drilldown.test.ts
git commit -m "feat(audit): one round count, where a round's own items leave its out-of-scope finds out of the dashboard's round numbers, the round page's total and progress, and the result lists and exports (group 2 plan 1 task 2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Create API: always open, a scope-only preview with categories and overlap

The create API stops taking a status from the client and always opens the round (spec §7, §14, bug §13.6). The live count of Task 4 gets its own schema, which holds only the scope, so a half-typed name or date never fails a count (R10). The preview also returns the selected assets by category, the directly sampled count (R9) and the overlap with other rounds in progress (R11). `foldTopCategories` joins Task 2's count rules, because plan 2 folds its category chips the same way.

Two changes the skeleton did not name sit in the preview's path. Both run on every live count, and the first count of the page is the whole register:
- The parents' components are loaded by relation, not by an id list. Today `parentAssetId: { in: candidateAssets.map(...) }` sends one parameter per asset in scope, and a scope of more than about 2,100 assets passes SQL Server's parameter limit.
- `selectAuditSample` puts the sample back in the scope's order with an index map instead of `findIndex` inside the sort, so the cost drops from O(n² log n) to O(n log n).

**Files:**
- Create: `src/lib/audit-round-preview-rules.ts` (pure: no `@/` import, no prisma)
- Modify: `src/lib/validations/audit.ts:2` (import from `./shared.ts`), `:4` (`auditStatuses` goes), `:14-41` (preview schema, create schema), `:93` (types)
- Modify: `src/lib/audit-round-scope.ts:2`, `:21`, `:40`, `:61` (input type), `:51-59` (`selectAuditSample` order)
- Modify: `src/lib/audit-round.ts:5` (type import), `:9-19` (`categoryId`), `:23-49` (candidates and components in parallel, components by relation), after `:49` (`getAuditRoundOverlap`)
- Modify: `src/lib/audit-round-counts-rules.ts` (Task 2's file: append `foldTopCategories`)
- Modify: `src/app/api/audit-rounds/route.ts:82` (`status: "open"`), `:106-118` (the log's `status`)
- Modify: `src/app/api/audit-rounds/preview/route.ts:1-36`
- Test:
  - `tests/audit-round-preview.test.ts` (new)
  - `tests/audit-round-cancellation.test.ts:26`
  - `tests/audit-round.test.ts:23`
  - `tests/audit-component-round-routes.test.ts:16`

**Interfaces:**
- Consumes:
  - `withAuditRoundOwnItems(where: Prisma.AuditItemWhereInput): Prisma.AuditItemWhereInput` (Task 2, `src/lib/audit-round-counts-rules.ts`);
  - `auditRoundOperationalWhere` (`src/lib/audit-round-status.ts:4`, `{ notIn: ["closed", "cancelled"] }`, drafts included);
  - `selectAuditComponentCandidates` (`src/lib/audit-component-round.ts:64`, unchanged; its generic `TAsset` carries `categoryId` through);
  - `optionalText` (`src/lib/validations/shared.ts`).
- Produces:
  - `src/lib/validations/audit.ts`:
    - `auditRoundPreviewSchema`: a `z.object` of the 8 `scope*Id: optionalText`, `includeClosedAssets`, `riskPreset` and `sampleRate`, with today's rules and defaults;
    - `auditRoundSchema = auditRoundPreviewSchema.extend({ name, auditYear, startDate, endDate }).superRefine(<the endDate rule as today>)`, with no `status` and no `.strict()`;
    - `type AuditRoundScopeInput = z.infer<typeof auditRoundPreviewSchema>`;
    - `type AuditRoundInput = z.infer<typeof auditRoundSchema>` (unchanged name, no `status`).
  - `src/lib/audit-round-scope.ts`: `buildAuditAssetWhere(input: AuditRoundScopeInput): Prisma.AssetWhereInput` (the body is unchanged).
  - `src/lib/audit-round.ts`:
    - `auditRoundAssetSelect` gains `categoryId: true`;
    - `getAuditRoundCandidateAssets(input: AuditRoundScopeInput)`;
    - `getAuditRoundSelection(input: AuditRoundScopeInput)`;
    - `getAuditRoundOverlap(assetIds: readonly string[]): Promise<AuditRoundOverlap>`.
  - `src/lib/audit-round-preview-rules.ts`:
    - `type AuditPreviewCategoryCount = { id: string; count: number }`;
    - `countAuditPreviewCategories(assets: readonly { categoryId: string }[]): AuditPreviewCategoryCount[]` (count desc, then id asc);
    - `type AuditRoundOverlapRow = { assetId: string; auditRound: { id: string; auditNo: string } }`;
    - `type AuditRoundOverlap = { count: number; rounds: { id: string; auditNo: string }[] }`;
    - `foldAuditRoundOverlap(rows: readonly AuditRoundOverlapRow[]): AuditRoundOverlap` (distinct assets; rounds distinct, by `auditNo` asc).
  - `src/lib/audit-round-counts-rules.ts`: `foldTopCategories<T extends { count: number }>(rows: readonly T[], top = 6): { top: T[]; other: { categories: number; count: number } }`. It sorts a copy by count desc; equal counts keep their input order.
  - `POST /api/audit-rounds/preview` answers `{ matchedAssets, sampledAssets, directSampled, componentItems, sampleRate, riskPreset, categories: AuditPreviewCategoryCount[], overlap: AuditRoundOverlap, previewAssets }`. `previewAssets` is unchanged (8 rows). A refusal is today's 400 with `fieldErrors`. Task 4 reads it.
  - `POST /api/audit-rounds` creates `status: "open"` whatever the body says. A body with `status` still gets 201: the key is dropped (the four E2E API callers and Task 7's `status: "draft"` check rely on this).

- [ ] **Step 1: Write the failing tests**

`tests/audit-round-preview.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { foldTopCategories } from "../src/lib/audit-round-counts-rules.ts"
import { countAuditPreviewCategories, foldAuditRoundOverlap } from "../src/lib/audit-round-preview-rules.ts"
import { selectAuditSample } from "../src/lib/audit-round-scope.ts"
import { auditRoundPreviewSchema, auditRoundSchema } from "../src/lib/validations/audit.ts"

// Group 2 plan 1, tasks 3 and 4: the create API and the live count of the create form (spec §7, §14).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("a new round has no status to choose: the create schema drops a client status and never refuses it (group 2 spec §7, §14, bug §13.6)", () => {
  const body = { name: "รอบทดสอบ", auditYear: 2026, startDate: "2026-11-01", endDate: "2026-12-01" }
  for (const status of ["open", "draft", "closed", "cancelled", "bogus"]) {
    const input = auditRoundSchema.parse({ ...body, status })
    assert.equal("status" in input, false, status)
    assert.equal(input.name, "รอบทดสอบ")
  }
  const reversed = auditRoundSchema.safeParse({ ...body, endDate: "2026-10-31" })
  assert.equal(reversed.success, false)
  assert.deepEqual(reversed.error?.issues.map((issue) => [issue.path.join("."), issue.message]), [["endDate", "End date must be after start date"]])
  assert.doesNotMatch(read("src/lib/validations/audit.ts"), /auditStatuses|status: z\.enum|\.strict\(\)/)
})

test("the live count's schema is the scope alone: a half-typed name, year or date never fails a count (group 2 spec §7, R10)", () => {
  const scope = auditRoundPreviewSchema.parse({ name: "", auditYear: null, startDate: "2026-1", endDate: "", status: "draft", scopeDepartmentId: " dept-1 ", scopeBranchId: "", sampleRate: "20" })
  assert.equal(scope.scopeDepartmentId, "dept-1")
  assert.equal(scope.scopeBranchId, null)
  assert.equal(scope.sampleRate, 20)
  assert.equal(scope.riskPreset, "all")
  assert.equal(scope.includeClosedAssets, false)
  for (const key of ["name", "auditYear", "startDate", "endDate", "status"]) assert.equal(key in scope, false, key)
  const refused = auditRoundPreviewSchema.safeParse({ sampleRate: 0 })
  assert.equal(refused.success, false)
  assert.deepEqual(refused.error?.issues.map((issue) => issue.path.join(".")), ["sampleRate"])
})

test("the create route always opens the round and logs it open; the preview reads the scope schema and adds categories, the direct sample and the overlap (group 2 spec §7, §14, R9, R10)", () => {
  const create = read("src/app/api/audit-rounds/route.ts")
  assert.match(create, /endDate: input\.endDate,\n\s+status: "open",\n\s+createdBy: user\.id,/)
  assert.doesNotMatch(create, /input\.status/)
  assert.match(create, /newValue: \{\n\s+\.\.\.input,\n\s+status: "open",\n\s+auditNo: round\.auditNo,/)

  const preview = read("src/app/api/audit-rounds/preview/route.ts")
  assert.match(preview, /const input = auditRoundPreviewSchema\.parse\(await request\.json\(\)\)/)
  assert.ok(preview.indexOf('requirePermission(user, "audit", "create")') < preview.indexOf("auditRoundPreviewSchema.parse("), "the permission before the body")
  assert.doesNotMatch(preview, /auditRoundSchema\b|"Audit preview"/)
  assert.match(preview, /const overlap = await getAuditRoundOverlap\(selection\.selectedAssets\.map\(\(asset\) => asset\.id\)\)/)
  assert.match(preview, /directSampled: selection\.selectedAssets\.length - selection\.componentItems,/)
  assert.match(preview, /categories: countAuditPreviewCategories\(selection\.selectedAssets\),\n\s+overlap,/)
})

test("the selection reads the category, loads components by relation and counts the overlap in chunks over own items of rounds in progress (group 2 spec §5, §7, §14, R11)", () => {
  const selection = read("src/lib/audit-round.ts")
  assert.match(selection, /export const auditRoundAssetSelect = \{[^}]*\n\s+categoryId: true,\n[^}]*\} satisfies Prisma\.AssetSelect/)
  assert.match(selection, /export async function getAuditRoundSelection\(input: AuditRoundScopeInput\)/)
  assert.match(selection, /parentAsset: buildAuditAssetWhere\(input\),/)
  assert.doesNotMatch(selection, /parentAssetId: \{ in:/, "no id list as long as the scope")
  assert.match(selection, /export async function getAuditRoundOverlap\(assetIds: readonly string\[\]\): Promise<AuditRoundOverlap>/)
  assert.match(selection, /for \(const chunk of chunkAuditIds\(assetIds\)\)/)
  assert.match(selection, /where: withAuditRoundOwnItems\(\{ assetId: \{ in: chunk \}, auditRound: \{ isActive: true, status: auditRoundOperationalWhere \} \}\),/)
  assert.match(selection, /select: \{ assetId: true, auditRound: \{ select: \{ id: true, auditNo: true \} \} \},/)
  assert.match(selection, /return foldAuditRoundOverlap\(rows\)/)

  const scope = read("src/lib/audit-round-scope.ts")
  assert.match(scope, /^import type \{ AuditRoundScopeInput \} from "\.\/validations\/audit\.ts"$/m)
  assert.match(scope, /export function buildAuditAssetWhere\(input: AuditRoundScopeInput\): Prisma\.AssetWhereInput/)
  assert.doesNotMatch(scope, /findIndex/, "the sample keeps the scope's order through an index map")
  assert.doesNotMatch(read("src/lib/audit-round-preview-rules.ts"), /from "@\/|from "@prisma|\bprisma\./, "the preview rules stay pure")
})

test("the preview counts the selected assets by category, largest first, each component under its own category (group 2 spec §7)", () => {
  const assets = ["desk", "comp", "desk", "mon", "comp", "desk"].map((categoryId) => ({ categoryId }))
  assert.deepEqual(countAuditPreviewCategories(assets), [
    { id: "desk", count: 3 },
    { id: "comp", count: 2 },
    { id: "mon", count: 1 },
  ])
  // A tie keeps the id order, so two counts of the same scope list the categories the same way.
  assert.deepEqual(countAuditPreviewCategories([{ categoryId: "b" }, { categoryId: "a" }]), [{ id: "a", count: 1 }, { id: "b", count: 1 }])
  assert.deepEqual(countAuditPreviewCategories([]), [])
})

test("the six largest categories, then อื่น ๆ with how many categories and items it holds (group 2 spec §2 decision 2, §7; shared with plan 2)", () => {
  const rows = [8, 7, 6, 5, 4, 3, 2, 1].map((count, index) => ({ id: `c${index}`, count }))
  assert.deepEqual(foldTopCategories(rows), { top: rows.slice(0, 6), other: { categories: 2, count: 3 } })
  assert.deepEqual(foldTopCategories(rows, 2), { top: rows.slice(0, 2), other: { categories: 6, count: 21 } })
  assert.deepEqual(foldTopCategories(rows.slice(0, 3)), { top: rows.slice(0, 3), other: { categories: 0, count: 0 } })
  assert.deepEqual(foldTopCategories([]), { top: [], other: { categories: 0, count: 0 } })
  // Unsorted rows are sorted by count, equal counts keep their order, and the input is not changed.
  const unsorted = [{ id: "x", count: 1 }, { id: "y", count: 5 }, { id: "z", count: 5 }]
  assert.deepEqual(foldTopCategories(unsorted, 1), { top: [{ id: "y", count: 5 }], other: { categories: 2, count: 6 } })
  assert.deepEqual(unsorted.map((row) => row.id), ["x", "y", "z"])
})

test("the overlap counts each selected asset once and names every other round it is in, by number (group 2 spec §7)", () => {
  const later = { id: "r1", auditNo: "AUD-2026-0003" }
  const earlier = { id: "r2", auditNo: "AUD-2026-0001" }
  assert.deepEqual(
    foldAuditRoundOverlap([
      { assetId: "a1", auditRound: later },
      { assetId: "a2", auditRound: later },
      { assetId: "a1", auditRound: earlier },
    ]),
    { count: 2, rounds: [earlier, later] },
  )
  assert.deepEqual(foldAuditRoundOverlap([]), { count: 0, rounds: [] })
})

test("the sample keeps the scope's order and is the same on every call (group 2 spec §7: the live count samples on every change)", () => {
  const assets = Array.from({ length: 5000 }, (_, index) => ({ id: `asset-${String(index).padStart(5, "0")}` }))
  const sample = selectAuditSample(assets, 20)
  assert.equal(sample.length, 1000)
  assert.deepEqual(selectAuditSample(assets, 20), sample)
  const positions = sample.map((asset) => assets.indexOf(asset))
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right))
  assert.equal(selectAuditSample(assets, 100), assets)
  assert.equal(selectAuditSample(assets.slice(0, 3), 1).length, 1)
})
```

- [ ] **Step 2: Rewrite these pins**

- `tests/audit-round-cancellation.test.ts:23-26`: the test is renamed and its first assertion changes.
  - The title becomes `"audit validation takes no round status at create and requires a cancel reason (group 2 spec §14)"`.
  - `:26` `assert.match(source, /const auditStatuses = \["draft", "open", "closed", "cancelled"\] as const/)` becomes:

    ```ts
      assert.doesNotMatch(source, /auditStatuses|status: z\.enum/, "a new round always opens: the create input has no status (group 2 spec §14)")
    ```

  - `:27-29` stay.
- `tests/audit-round.test.ts:23`: delete the line `  status: "draft",`. `AuditRoundInput` has no `status`, so the literal would be an excess property under `tsc`.
- `tests/audit-component-round-routes.test.ts:16`: `assert.match(source, /parentAssetId:\s*\{\s*in:\s*candidateAssets\.map/)` becomes `assert.match(source, /parentAsset:\s*buildAuditAssetWhere\(input\)/)`. `:13-15` and `:17-19` stay true.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/audit-round-preview.test.ts tests/audit-round-cancellation.test.ts tests/audit-component-round-routes.test.ts`
Expected: FAIL.
- `src/lib/audit-round-preview-rules.ts` does not exist, so `tests/audit-round-preview.test.ts` stops at the import.
- `validations/audit.ts` imports `@/lib/validations/shared`, which node cannot resolve.
- `auditStatuses` is still there.
- `audit-round.ts` still sends `parentAssetId: { in: … }`.

- [ ] **Step 4: Implement**

- **`src/lib/validations/audit.ts`:**
  - `:2` becomes `import { optionalText } from "./shared.ts"`, as in `validations/disposal.ts:2`, so node --test can load the schema.
  - `:4` (`auditStatuses`) goes.
  - `:14-41` become the two schemas below. The scope fields keep today's rules and defaults, word for word.

    ```ts
    // The scope of a round: what it audits and how it samples. The create form's live count parses this alone, so a
    // half-typed name, year or date never fails a count (group 2 spec §7, R10).
    export const auditRoundPreviewSchema = z.object({
      scopeCompanyId: optionalText,
      // … the other seven scope ids, includeClosedAssets, riskPreset and sampleRate as today (:18-28)
    })

    // A new round has no status: it opens at once (group 2 spec §14, bug §13.6). The object is not strict, so a client
    // that still sends status has it dropped, never refused.
    export const auditRoundSchema = auditRoundPreviewSchema
      .extend({
        name: z.string().trim().min(1).max(200),
        auditYear: z.coerce.number().int().min(2000).max(2100),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
      .superRefine(/* today's endDate rule, :33-41, unchanged */)
    ```

  - `:93`: `AuditRoundInput` stays, and `export type AuditRoundScopeInput = z.infer<typeof auditRoundPreviewSchema>` is added above it.
  - The other schemas of the file stay untouched (their pins: `tests/audit-component-scan-api.test.ts:8-9`, `tests/audit-out-of-scope-actual-field.test.ts:69`, `tests/audit-scan-search-ui.test.ts:187`, `tests/audit-round-cancellation.test.ts:27-29`).
- **`src/lib/audit-round-scope.ts`:**
  - `:2` becomes `import type { AuditRoundScopeInput } from "./validations/audit.ts"`.
  - `:21`, `:40` and `:61` take `AuditRoundScopeInput` (`:61`: `AuditRoundScopeInput["riskPreset"]`). The bodies stay, so the two lines pinned at `tests/e2e-cross-cutting.test.ts:258-259` stay.
  - `selectAuditSample` (`:51-59`) keeps its sort by `stableHash` and its `slice`. The second sort reads an index map: `const position = new Map(assets.map((asset, index) => [asset.id, index] as const))`, then `.sort((left, right) => (position.get(left.id) ?? 0) - (position.get(right.id) ?? 0))`. Add the comment: "an index map, not findIndex: the live count samples on every change (group 2 spec §7)".
- **`src/lib/audit-round.ts`:**
  - `:5` becomes `import type { AuditRoundScopeInput } from "@/lib/validations/audit"`. Add the imports `auditRoundOperationalWhere` from `@/lib/audit-round-status`, `withAuditRoundOwnItems` and `chunkAuditIds` from `@/lib/audit-round-counts-rules` (Task 2), and `foldAuditRoundOverlap`, `type AuditRoundOverlap` and `type AuditRoundOverlapRow` from `@/lib/audit-round-preview-rules`.
  - `auditRoundAssetSelect` gains `categoryId: true,` after `name: true,` (on its own line). `AuditComponentCandidateAsset` does not change: the test fixtures (`tests/audit-component-round-routes.test.ts:108-120`, `tests/audit-component-round-selection.test.ts`) would fail `tsc` if it gained a required field.
  - `getAuditRoundCandidateAssets(input: AuditRoundScopeInput)` keeps its body.
  - `getAuditRoundSelection` loads the candidates and their components at once, the components by relation:

    ```ts
    export async function getAuditRoundSelection(input: AuditRoundScopeInput) {
      // The components of the scope's parents by relation, never an id list: the live count's first scope is the whole
      // register, past SQL Server's 2,100-parameter limit (group 2 spec §7).
      const [candidateAssets, componentLinks] = await Promise.all([
        getAuditRoundCandidateAssets(input),
        prisma.assetComponent.findMany({
          where: {
            parentAsset: buildAuditAssetWhere(input),
            status: "installed",
            removedAt: null,
            componentAsset: { isActive: true },
          },
          select: {
            parentAssetId: true,
            componentAsset: { select: auditRoundAssetSelect },
          },
        }),
      ])

      return selectAuditComponentCandidates(candidateAssets, componentLinks, input.sampleRate)
    }
    ```

  - After it, add `getAuditRoundOverlap`:

    ```ts
    // The selected assets that are already own items of another round in progress, drafts included (group 2 spec §7,
    // §14). Chunked under SQL Server's 2,100-parameter limit (R11). A warning only: create never checks it.
    export async function getAuditRoundOverlap(assetIds: readonly string[]): Promise<AuditRoundOverlap> {
      const rows: AuditRoundOverlapRow[] = []
      for (const chunk of chunkAuditIds(assetIds)) {
        rows.push(
          ...(await prisma.auditItem.findMany({
            where: withAuditRoundOwnItems({ assetId: { in: chunk }, auditRound: { isActive: true, status: auditRoundOperationalWhere } }),
            select: { assetId: true, auditRound: { select: { id: true, auditNo: true } } },
          })),
        )
      }
      return foldAuditRoundOverlap(rows)
    }
    ```

    Index use: `IX_audit_items_assetId` and `IX_audit_rounds_isActive_status`. The chunks run one after another, on one connection.
- **`src/lib/audit-round-preview-rules.ts`** (new, pure). Its header comment says: "The create form's live count (group 2 spec §7): pure, so the form and node --test import it." It holds the Interfaces above.
  - `countAuditPreviewCategories`: counts in a `Map`, then sorts by count desc, then `id.localeCompare`.
  - `foldAuditRoundOverlap`: a `Set` of asset ids for `count`, and a `Map` of rounds by id, sorted by `auditNo.localeCompare`.
- **`src/lib/audit-round-counts-rules.ts`** (Task 2's file) gains, at its end:

  ```ts
  // The largest rows first, then the rest folded into one "อื่น ๆ" (group 2 spec §2 decision 2: six). The create form's
  // categories (plan 1) and the round page's category chips (plan 2) fold the same way. Equal counts keep their order.
  export function foldTopCategories<T extends { count: number }>(rows: readonly T[], top = 6): { top: T[]; other: { categories: number; count: number } }
  ```

  The body sorts a copy (`[...rows].sort((left, right) => right.count - left.count)`; the sort is stable), slices `top`, and sums the rest.
- **`src/app/api/audit-rounds/route.ts`:**
  - `:82` `status: input.status,` becomes `status: "open",`, with nothing else on that line. Put the comment `// A new round is always open (group 2 spec §14): the schema takes no status.` on its own line directly above `const record = await tx.auditRound.create({` (`:67`), not inside the `data` object. The Task 3 test pins `endDate: input.endDate,` / `status: "open",` / `createdBy: user.id,` as three consecutive lines with no comment between or after them.
  - The log's `newValue` (`:111-117`) becomes `{ ...input, status: "open", auditNo: round.auditNo, matchedAssets: …, generatedItems: …, componentItems: … }`, so the system log still shows the round's status.
  - The permission check stays before the parse (`:52-55`; the viewer's refusal with body `{}` at `e2e/cross-cutting/support/refusals.ts:56` still gets 403).
- **`src/app/api/audit-rounds/preview/route.ts`:**
  - It imports `auditRoundPreviewSchema` instead of `auditRoundSchema`, `getAuditRoundOverlap` with `getAuditRoundSelection`, and `countAuditPreviewCategories`.
  - The body:

    ```ts
        const user = await requireAuth()
        requirePermission(user, "audit", "create")

        // The scope alone (group 2 spec §7, R10): the name and the dates are not read, so the live count never fails on them.
        const input = auditRoundPreviewSchema.parse(await request.json())
        const selection = await getAuditRoundSelection(input)
        const overlap = await getAuditRoundOverlap(selection.selectedAssets.map((asset) => asset.id))

        return NextResponse.json({
          matchedAssets: selection.matchedAssets,
          sampledAssets: selection.selectedAssets.length,
          // "สุ่มได้": the directly sampled assets, without the components they pull in (R9).
          directSampled: selection.selectedAssets.length - selection.componentItems,
          componentItems: selection.componentItems,
          sampleRate: input.sampleRate,
          riskPreset: input.riskPreset,
          categories: countAuditPreviewCategories(selection.selectedAssets),
          overlap,
          previewAssets: /* :25-31 unchanged */,
        })
    ```

  - The `"Audit preview"` name fallback (`:13-16`) goes. The catch stays `errorResponse(error, 400)`.
- **E2E:** no step changes here. The API callers that send `status: "open"` (`field-audit.spec.ts:410`, `dashboard.spec.ts:103`, `asset-detail.spec.ts:292`, `open-audit-block.spec.ts:44`) still get 201, because the key is dropped. Task 7 checks that a round posted with `status: "draft"` opens.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-round-preview.test.ts tests/audit-round.test.ts tests/audit-round-cancellation.test.ts tests/audit-component-round-routes.test.ts tests/audit-component-round-selection.test.ts tests/audit-round-counts.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-fixes.test.ts && npx tsc --noEmit`
Expected: PASS.
- `tests/audit-component-round-routes.test.ts:22-34` still holds: the preview keeps `getAuditRoundSelection`, `selection.matchedAssets`, `selection.componentItems` and `sampledAssets: selection.selectedAssets.length`, and the create keeps `generatedItems: assets.length` and `data: assets.map`.
- `tsc` is clean. The form still sends `status` in its body until Task 4; the schema drops it.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. A pin that fails outside this task's list is rewritten in this commit and named in the report.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validations/audit.ts src/lib/audit-round-scope.ts src/lib/audit-round.ts src/lib/audit-round-preview-rules.ts src/lib/audit-round-counts-rules.ts src/app/api/audit-rounds/route.ts src/app/api/audit-rounds/preview/route.ts tests/audit-round-preview.test.ts tests/audit-round-cancellation.test.ts tests/audit-round.test.ts tests/audit-component-round-routes.test.ts
git commit -m "feat(audit): a new round always opens, and the preview reads the scope alone and adds categories, the direct sample and the overlap with rounds in progress (group 2 plan 1 task 3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Create form (§7)

The create form is rebuilt to spec §7:
- a trail "รอบตรวจนับ › สร้างรอบ";
- three numbered sections;
- the end date a month after the start (bug §13.7);
- the eight scope selects as removable condition chips, added from "+ เพิ่มเงื่อนไข" with a searchable value picker;
- the risk group and sample rate folded under "ตัวเลือกขั้นสูง", with a line that says what is in use;
- a summary panel "ขอบเขตนี้ได้" that counts by itself (Task 3's preview) instead of the "ดูตัวอย่าง" button;
- a save bar "จะสร้างรอบ N รายการ" with ยกเลิก / สร้างรอบ;
- no status field.

The E2E master-id reader moves from the round form's selects to the asset form, opened in a page of its own. That keeps the audit chain starting.

**Decision: the E2E master reader.** `readAuditMasters` (`e2e/audit/audit-data.ts:47-58`) read the category, status and condition ids off the round form's native selects. The chips leave no select to read.
- **Master-data APIs:** not possible. IT staff (the reader's user) have no status or condition API: the only one is the integration API (`src/app/api/integrations/v1/reference/statuses/route.ts`, client keys). `GET /api/categories` needs `category:view` (`src/app/api/categories/route.ts:14`).
- **Hidden accessible selects:** they would put lists in the form for the test alone.
- **Chosen:** the reader opens `/th/assets/new` in a second page of the same context, which IT staff can open (they register the walk's assets). It reads `#asset-category`, `#asset-status` and `#asset-condition` and closes the page.
  - The precedent is `readAssetMasters` (`e2e/repair/repair-data.ts:33-50`).
  - The labels match: categories are `${code} - ${name}` (`src/lib/asset-form-options.ts:171-174`), statuses and conditions are `nameTh` (`:196-197`). พร้อมใช้งาน is a create status (`readAssetChoices` checks it), and ดี and พอใช้ are selectable conditions (`src/lib/asset-lifecycle-policy.ts:44-52`).
  - The round form stays on screen. `readAuditMasters(page): Promise<AuditMasterIds>` keeps its signature, so `field-audit.spec.ts:64` and Task 7 call it unchanged.

**Files:**
- Modify: `src/components/audit/audit-round-form.tsx:1-390` (rebuilt)
- Modify: `src/lib/audit-round-preview-rules.ts` (Task 3's: adds `addMonthsToDateKey`, `auditRoundDailyLoad`)
- Modify: `e2e/audit/audit-data.ts:8` (header comment), `:30-58` (the reader)
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Test:
  - `tests/audit-round-form-ui.test.ts:10-26` (rewritten) and a new test after it
  - `tests/audit-round-preview.test.ts` (two tests appended)
  - `tests/v-track2-u.test.ts:55-97`
  - `tests/audit-pages-sweep-ui.test.ts:47-60`
  - `tests/audit-component-round-routes.test.ts:89-106`
  - `tests/form-frames-ui.test.ts:118-123`
  - `tests/breadcrumbs-ui.test.ts:45`, `:65-69`
  - `tests/form-migration-guards.test.ts:56-59`, `:109`
  - `tests/e2e-audit.test.ts:63-64`

**Interfaces:**
- Consumes:
  - Task 3: `POST /api/audit-rounds/preview` (scope body; `{ matchedAssets, sampledAssets, directSampled, componentItems, sampleRate, riskPreset, categories, overlap, previewAssets }`); `foldTopCategories` (`src/lib/audit-round-counts-rules.ts`); `POST /api/audit-rounds` without `status`.
  - Shared parts:
    - `PageHeader` with `breadcrumbs`;
    - `FormSection` (`src/components/ui/form-section.tsx:22`);
    - `SearchableSelect` (`src/components/ui/searchable-select.tsx:31`);
    - `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` (`src/components/ui/dropdown-menu.tsx`);
    - `StickyFormFooter` (`src/components/ui/sticky-form-footer.tsx:18`, the last child of the form);
    - `Notice`, `EmptyNote`, `ChoiceCard`, `Button`, `buttonVariants`, `linkVariants`;
    - `useFieldErrors` with its `reveal` option (`src/components/ui/use-field-errors.ts:28-31`).
  - Existing helpers: `filterAuditStatusOptions` (`src/lib/audit-round-scope.ts:17`); `toLocalDateInputValue` (`src/lib/local-date.ts:1`); `formatCount`; `displayYearRange` / `fromDisplayYear` / `toDisplayYear`.
- Produces:
  - `src/lib/audit-round-preview-rules.ts`:
    - `addMonthsToDateKey(dateKey: string, months: number): string`. It works on a `yyyy-mm-dd` key in UTC, clamps to the month's last day, and returns `""` for anything else.
    - `auditRoundDailyLoad(items: number, startDate: string, endDate: string): number | null`. It is `ceil(items / days)` with both ends counted, and `null` for 0 items, a bad key or an end before the start.
  - The form contract that Task 7's `e2e/audit/round-steps.ts` stands on:
    - the h1 is `auditRound.createTitle` "สร้างรอบตรวจนับ";
    - no element has the id `audit-round-status`;
    - the add button is a `Button` named "เพิ่มเงื่อนไข" (the "+" is a `Plus` icon, `aria-hidden`). Its menu items are named by the `scope*` words (บริษัท, สาขา, แผนก, ที่ตั้ง, หมวดหมู่ทรัพย์สิน, ผู้ถือครอง, สถานะทรัพย์สิน, สภาพทรัพย์สิน). A condition already chosen is not offered again;
    - after a menu item, a `SearchableSelect` with the id `audit-round-scope-<company|branch|department|location|category|custodian|status|condition>` takes focus without opening (`aria-expanded="false"`). A click opens it, and its option list holds the labels with their codes (`audit-options.ts:49-60`);
    - a chosen condition is a chip `Button` with `aria-label` "นำเงื่อนไขออก: <condition word>: <option label>". A click removes the condition;
    - the footer's status `<span role="status">` reads "จะสร้างรอบ {count} รายการ" (`formatCount`) once the count has settled with at least one item. While it counts it reads "กำลังนับรายการ…", with 0 items "ขอบเขตนี้ไม่มีทรัพย์สิน ยังสร้างรอบไม่ได้", and on a refusal "ยังนับรายการไม่ได้ ตรวจเงื่อนไขและสุ่มตรวจ (%) อีกครั้ง". The submit `Button` is named "สร้างรอบ";
    - "ดูตัวอย่างรายการ" is the `<summary>` of a `<details>` in the summary panel, inside `<form>` and `<main>`. It opens the eight-row sample inline;
    - the save still toasts `createSuccess` and goes to `` `/${locale}/audit/rounds/${payload.id}` ``;
    - the ids `audit-round-name`, `audit-round-year`, `audit-round-start-date`, `audit-round-end-date`, `audit-round-risk-preset` and `audit-round-sample-rate` stay, each with its error `#<id>-error`;
    - `readAuditMasters(page): Promise<AuditMasterIds>` keeps its signature (`e2e/audit/audit-data.ts`).

- [ ] **Step 1: Change the words**

Through `node scripts/messages-edit.mjs`, in the `auditRound` namespace (glossary: หมวดหมู่, never หมวด; ตัวอย่าง, never preview):

| Key | th | en |
|---|---|---|
| `createRound` | สร้างรอบ | Create round |
| `sectionNameDates` | ชื่อและช่วงวันที่ | Name and dates |
| `sectionScope` | ตรวจอะไรบ้าง | What to audit |
| `sectionAdvanced` | ตัวเลือกขั้นสูง | Advanced options |
| `endDateHint` | ค่าเริ่มต้น 1 เดือนหลังวันที่เริ่ม แก้ได้ | One month after the start by default; you can change it |
| `addCondition` | เพิ่มเงื่อนไข | Add condition |
| `removeCondition` | นำเงื่อนไขออก: {condition} | Remove condition: {condition} |
| `conditionChoose` | เลือก{condition} | Choose {condition} |
| `noConditions` | ยังไม่มีเงื่อนไข รอบนี้จะตรวจทรัพย์สินทั้งหมด | No conditions yet: the round audits all assets |
| `advancedNow` | ตอนนี้: {risk} · สุ่มตรวจ {rate}% | Now: {risk} · sampling {rate}% |
| `riskSamplingHelp` (changed) | ใช้ร่วมกับเงื่อนไขในส่วนที่ 2 เพื่อตรวจทรัพย์สินที่ควรติดตามก่อน และลดจำนวนรายการเมื่อขอบเขตใหญ่มาก | Combine with the conditions in section 2 to audit the assets that need attention first, and to cut the items when the scope is large. |
| `summaryTitle` | ขอบเขตนี้ได้ | This scope gives |
| `summaryItems` | รายการตรวจ | audit items |
| `counting` | กำลังนับรายการ… | Counting items… |
| `summaryUnavailable` | ยังนับรายการไม่ได้ ตรวจเงื่อนไขและสุ่มตรวจ (%) อีกครั้ง | The items cannot be counted yet. Check the conditions and Sampling (%). |
| `summaryMatchedSampled` | ตรงเงื่อนไข {matched} · สุ่มได้ {sampled} | Matched {matched} · sampled {sampled} |
| `summaryByCategory` | แยกตามหมวดหมู่ | By category |
| `summaryOtherCategories` | อื่น ๆ {count} หมวดหมู่ | Other {count} categories |
| `summaryCategoryInactive` | หมวดหมู่ที่ไม่ใช้งานแล้ว | Inactive category |
| `overlapWarning` | {count} รายการอยู่ในรอบอื่นที่เปิดอยู่แล้ว | {count} items are already in another open round |
| `dailyLoad` | ต้องตรวจเฉลี่ยวันละ {count} รายการ ตามช่วงวันที่ตั้งไว้ | About {count} items a day over the dates set |
| `showSample` | ดูตัวอย่างรายการ | Show sample items |
| `willCreate` | จะสร้างรอบ {count} รายการ | Will create a round of {count} items |
| `willCreateNone` | ขอบเขตนี้ไม่มีทรัพย์สิน ยังสร้างรอบไม่ได้ | This scope has no assets, so the round cannot be created yet |

Delete (the form was their only reader; `auditRound.status` stays for the list columns, `previewComponentHelp`, `previewComponentFromParent` and `previewEmpty` stay):
- `auditRound.preview`, `auditRound.previewTitle`, `auditRound.previewHelp`;
- `auditRound.previewMatched`, `auditRound.previewSampled`, `auditRound.previewSampleRate`, `auditRound.previewRisk`, `auditRound.previewAssets`, `auditRound.previewComponentItems`;
- `auditRound.riskSampling`;
- `auditRound.statusDraft`, only if Task 1 left it: the form's draft option was its last reader.

- [ ] **Step 2: Write the failing tests**

`tests/audit-round-form-ui.test.ts`, the second test, after `:26`:

```ts
test("the round form: a trail, three numbered sections, conditions as chips with a searchable picker, the advanced options folded, a live summary and a save bar that says what it creates (group 2 spec §7, R10)", () => {
  // The trail ends on the page's word, not a code.
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/audit\/rounds` \}, \{ label: t\("createRound"\) \}\]\}/)
  for (const [number, key] of [[1, "sectionNameDates"], [2, "sectionScope"], [3, "sectionAdvanced"]] as const) {
    assert.match(source, new RegExp(`<FormSection number=\\{${number}\\} title=\\{t\\("${key}"\\)\\}>`), key)
  }
  // The end date a month after the start (bug §13.7), with its hint.
  assert.match(source, /const startDate = toLocalDateInputValue\(\)\n[\s\S]*?endDate: addMonthsToDateKey\(startDate, 1\),/)
  // Each scope condition: an entry with its picker id, the add menu, the picker, and the chip that removes it.
  for (const picker of ["company", "branch", "department", "location", "category", "custodian", "status", "condition"]) {
    assert.ok(source.includes(`id: "audit-round-scope-${picker}"`), picker)
  }
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s+<Button type="button" variant="outline" size="sm" disabled=\{availableScopes\.length === 0\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{t\("addCondition"\)\}/)
  assert.match(source, /<DropdownMenuItem key=\{field\.key\} onSelect=\{\(\) => openScopePicker\(field\.key\)\}>/)
  assert.match(source, /<SearchableSelect\n\s+id=\{pendingField\.id\}\n\s+label=\{t\(pendingField\.label\)\}\n\s+value=""/)
  assert.match(source, /aria-label=\{t\("removeCondition", \{ condition: `\$\{t\(field\.label\)\}: \$\{label\}` \}\)\}/)
  // Disposed and retired statuses only while "รวม…" is ticked; unticking clears them (Appendix A §7).
  assert.match(source, /const statusOptions = filterAuditStatusOptions\(options\.statuses, values\.includeClosedAssets\)/)
  assert.match(source, /scopeStatusId: checked \|\| !isClosedStatusId\(options\.statuses, current\.scopeStatusId\) \? current\.scopeStatusId : "",/)
  // Section 3 folded, its line saying what is in use; an error inside opens it before focus moves.
  assert.match(source, /<details ref=\{advancedRef\}>/)
  assert.match(source, /\{t\("advancedNow", \{ risk: t\(`riskPreset_\$\{values\.riskPreset\}`\), rate: values\.sampleRate \}\)\}/)
  assert.match(source, /reveal: \(key\) => \{\n\s+if \(ADVANCED_FIELDS\.has\(key\) && advancedRef\.current\) advancedRef\.current\.open = true/)
  // The live count: the scope alone, 450ms after the last change, the earlier request aborted, and a refusal never
  // moves focus or shows under a field (R10). Only the save applies the server's fieldErrors.
  assert.match(source, /const scopeRequest = JSON\.stringify\(scopeBody\(values\)\)/)
  assert.match(source, /fetch\("\/api\/audit-rounds\/preview", \{[\s\S]*?body: scopeRequest,\n\s+signal: controller\.signal,/)
  assert.match(source, /\}, 450\)\n[\s\S]*?controller\.abort\(\)[\s\S]*?\}, \[scopeRequest\]\)/)
  assert.equal(source.match(/fieldErrors\.applyServer\(/g)?.length, 1)
  // The summary: the count, matched and sampled below 100%, the components note, the largest categories, the overlap,
  // the daily load and the sample behind "ดูตัวอย่างรายการ".
  assert.match(source, /\{t\("summaryTitle"\)\}/)
  assert.match(source, /preview\.sampleRate < 100 \?/)
  assert.match(source, /t\("summaryMatchedSampled", \{ matched: formatCount\(preview\.matchedAssets\), sampled: formatCount\(preview\.directSampled\) \}\)/)
  assert.match(source, /const categories = foldTopCategories\(preview\?\.categories \?\? \[\]\)/)
  assert.match(source, /<Notice tone="warning" title=\{t\("overlapWarning", \{ count: formatCount\(preview\.overlap\.count\) \}\)\}>/)
  assert.match(source, /href=\{`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`\}/)
  assert.match(source, /const dailyLoad = preview \? auditRoundDailyLoad\(preview\.sampledAssets, values\.startDate, values\.endDate\) : null/)
  assert.match(source, /<summary className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "list-item cursor-pointer text-sm"\)\}>\{t\("showSample"\)\}<\/summary>/)
  // The save bar: what it creates, then ยกเลิก and สร้างรอบ.
  assert.match(source, /<StickyFormFooter className="lg:col-span-2" status=\{<span role="status">\{footerStatus\}<\/span>\}>\n\s+<Link href=\{`\/\$\{locale\}\/audit\/rounds`\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /t\("willCreate", \{ count: formatCount\(preview\.sampledAssets\) \}\)/)
  assert.match(source, /t\("willCreateNone"\)/)
  assert.match(source, /<\/StickyFormFooter>\n\s*<\/form>/, "the save bar is the form's last child")
})

test("the create form's words (group 2 spec §7)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).auditRound
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).auditRound
  const words: Record<string, string> = {
    createRound: "สร้างรอบ",
    sectionNameDates: "ชื่อและช่วงวันที่",
    sectionScope: "ตรวจอะไรบ้าง",
    sectionAdvanced: "ตัวเลือกขั้นสูง",
    addCondition: "เพิ่มเงื่อนไข",
    advancedNow: "ตอนนี้: {risk} · สุ่มตรวจ {rate}%",
    summaryTitle: "ขอบเขตนี้ได้",
    summaryMatchedSampled: "ตรงเงื่อนไข {matched} · สุ่มได้ {sampled}",
    overlapWarning: "{count} รายการอยู่ในรอบอื่นที่เปิดอยู่แล้ว",
    dailyLoad: "ต้องตรวจเฉลี่ยวันละ {count} รายการ ตามช่วงวันที่ตั้งไว้",
    showSample: "ดูตัวอย่างรายการ",
    willCreate: "จะสร้างรอบ {count} รายการ",
  }
  for (const [key, value] of Object.entries(words)) {
    assert.equal(th[key], value, key)
    assert.equal(typeof en[key], "string", key)
  }
  for (const key of ["preview", "previewTitle", "previewHelp", "previewMatched", "previewSampled", "previewSampleRate", "previewRisk", "previewAssets", "previewComponentItems", "riskSampling", "statusDraft"]) {
    assert.equal(key in th || key in en, false, `${key} is gone`)
  }
})
```

`tests/audit-round-preview.test.ts`: add `addMonthsToDateKey` and `auditRoundDailyLoad` to the import from `../src/lib/audit-round-preview-rules.ts`, and append:

```ts
test("the end date defaults to one month after the start, on the month's last day when the day is missing (group 2 spec §7, bug §13.7)", () => {
  assert.equal(addMonthsToDateKey("2026-10-26", 1), "2026-11-26")
  assert.equal(addMonthsToDateKey("2026-01-31", 1), "2026-02-28")
  assert.equal(addMonthsToDateKey("2028-01-31", 1), "2028-02-29")
  assert.equal(addMonthsToDateKey("2026-12-15", 1), "2027-01-15")
  assert.equal(addMonthsToDateKey("", 1), "")
  assert.equal(addMonthsToDateKey("26/10/2026", 1), "")
})

test("the daily load is the items over the round's days, both ends counted, rounded up (group 2 spec §7)", () => {
  assert.equal(auditRoundDailyLoad(342, "2026-11-01", "2026-11-30"), 12)
  assert.equal(auditRoundDailyLoad(342, "2026-11-01", "2026-11-01"), 342)
  assert.equal(auditRoundDailyLoad(7, "2026-10-26", "2026-11-25"), 1)
  assert.equal(auditRoundDailyLoad(0, "2026-11-01", "2026-11-30"), null)
  assert.equal(auditRoundDailyLoad(10, "2026-11-30", "2026-11-01"), null)
  assert.equal(auditRoundDailyLoad(10, "", "2026-11-01"), null)
})
```

- [ ] **Step 3: Rewrite these pins**

- **`tests/audit-round-form-ui.test.ts`** (the first test, `:10-26`):
  - The title becomes `"the audit round form uses the shared fields, the sample-rate hint and a busy create button (2C batch 3; group 2 spec §7)"`.
  - `:11-17`, `:19-21` and `:23` stay. There are still five `<Input>`s, all `required` (name, year, start, end, sample rate); the local `Select` wrapper stays for the risk group.
  - `:18` becomes:

    ```ts
      assert.equal(source.match(/<Field label=\{t\("(?:name|startDate)"\)\} id="audit-round-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 2)
      assert.match(source, /<Field label=\{t\("endDate"\)\} id="audit-round-end-date" required hint=\{t\("endDateHint"\)\} error=\{fieldErrors\.message\("endDate"\)\}>/)
    ```

  - `:22` becomes `assert.doesNotMatch(source, /audit-round-status|values\.status|t\("status"\)|statusDraft|statusOpen/, "a new round always opens: no status field (group 2 spec §14)")`.
  - `:24` becomes `assert.doesNotMatch(source, /handlePreview|previewing|t\("preview"\)|<StatStrip\b/, "the live count replaces the preview button (group 2 spec §7)")`.
  - `:25` becomes `assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{t\("createRound"\)\}/)`.
- **`tests/v-track2-u.test.ts:55-97`:**
  - The title becomes `"audit round: the date pair limits its pickers, validate() restates every rule, and the save shows the server's refusal under the field (v-track U1; group 2 spec §7)"`.
  - `ids` (`:58-66`) loses `status: "audit-round-status",`, and `messages` (`:67`) becomes `["name", "startDate", "endDate", "riskPreset"]`.
  - `:69` becomes:

    ```ts
      assert.match(source, /^function validate\(\n\s+values: \{ name: string; auditYear: string; startDate: string; endDate: string; sampleRate: string \},\n\s+yearRange: \{ min: number; max: number \},\n\): Partial<Record<AuditRoundField, string>> \{$/m)
    ```

  - `:76` (`'check("status", required(values.status))',`) is deleted from the list, and after the loop add `assert.ok(!rules.includes('check("status"'), "no status rule")`.
  - `:91` (comment) becomes `  // The risk select passes its id and error through the form's Select (U-R4).`
  - `:93-94` become:

    ```ts
      // The save puts the server's fieldErrors under the fields (the server's endBeforeStart lands on endDate). The live
      // count never does: a refusal there leaves focus and the fields alone (group 2 spec §7, R10).
      assert.equal(source.match(/if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/g)?.length, 1)
    ```

  - `:95-96` become:

    ```ts
      // Nothing gates the save while the live count runs.
      assert.match(source, /<Button type="submit" busy=\{saving\}>/)
    ```

- **`tests/audit-pages-sweep-ui.test.ts:47-60`** become:

  ```ts
  test("audit round form: the sections in one panel and the summary in another, codes as tag, an EmptyNote, the components Notice and the include-closed choice a ChoiceCard (spec 2D D7, D9, D19, M22, M33; group 2 spec §7)", () => {
    const source = read(`${C}audit/audit-round-form.tsx`)
    assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-\[minmax\(0,1fr\)_20rem\]">/)
    assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "grid min-w-0 content-start gap-8 p-4 sm:p-5"\)\}>/)
    assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "grid content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start"\)\}>/)
    assert.match(source, /<p className="text-metric num text-foreground">\{formatCount\(preview\.sampledAssets\)\}<\/p>/)
    assert.match(source, /<Notice tone="info">\{t\("previewComponentHelp", \{ count: componentItems \}\)\}<\/Notice>/)
    assert.match(source, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
    assert.match(source, /<EmptyNote className="mt-2">\{t\("previewEmpty"\)\}<\/EmptyNote>/)
    assert.match(source, /<ChoiceCard\s+type="checkbox"\s+className="md:col-span-2"\s+label=\{t\("includeClosedAssets"\)\}\s+description=\{t\("includeClosedAssetsHelp"\)\}/)
    // The summary is a panel, not a landmark: an <aside> inside <main> fails axe's landmark-complementary-is-top-level.
    assert.doesNotMatch(source, /<StatStrip\b|<aside\b|<section\b|function PreviewMetric\b|uppercase|tracking-|primary-soft|primary-border|info-soft|info-border|text-info|warning-soft|warning-border|rounded-lg|\btext-xs\b|<input\b|checkboxVariants/)
  })
  ```

- **`tests/audit-component-round-routes.test.ts:89-106`:**
  - `:96` (`/previewComponentItems/`) and `:97` (`/formatCount\(componentItems\)/`) are deleted.
  - `:102` and `:104` (`previewComponentItems` is a string) are deleted.
  - `:94-95`, `:98-101`, `:103` and `:105` stay. The form keeps `componentItems?: number`, `const componentItems = preview?.componentItems ?? 0`, `componentItems > 0` and `t("previewComponentHelp", { count: componentItems })`.
- **`tests/form-frames-ui.test.ts:118-123`:**
  - The title becomes `"the new audit round form draws its title and trail with PageHeader (2B-1 task 23, I13; group 2 spec §7)"`.
  - `:121` becomes:

    ```ts
      assert.match(source, /<div className="mx-auto max-w-6xl">\n\s+<PageHeader\n\s+title=\{t\("createTitle"\)\}\n\s+breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/audit\/rounds` \}, \{ label: t\("createRound"\) \}\]\}\n\s+className="mb-6"\n\s+\/>\n/)
    ```

  - `:122` (no `<h1`, no `PageBackLink`) stays.
- **`tests/breadcrumbs-ui.test.ts`:**
  - `:45` becomes `assert.equal(sites.length, 12, "Breadcrumbs call sites")`. `:46` stays at 8.
  - After the create-page loop (`:65-69`) add:

    ```ts
      const roundForm = sites.find((candidate) => candidate.path === "src/components/audit/audit-round-form.tsx")
      assert.ok(roundForm, "no Breadcrumbs in the audit round form")
      assert.doesNotMatch(roundForm.element, /code:/, "the create round trail ends on a page title, not a code (group 2 spec §7)")
    ```

- **`tests/form-migration-guards.test.ts`:**
  - `STICKY_FOOTER_ROUTES` (`:56-59`) gains ``[`${C}audit/audit-round-form.tsx`]: ["/th/audit/rounds/new"],``. The route is a focus route (`src/lib/mobile-field-navigation.ts:20`, `tests/mobile-field-navigation.test.ts:50`).
  - `CONSTRAINT_FLOORS` `:109` becomes ``[`${C}audit/audit-round-form.tsx`]: [6, 1, 0],``. The status select's `required` goes with the field. What is left is 5 `Input`s plus the wrapper's `NativeSelect required={required}`. The scope pickers are `SearchableSelect`s, which are not in `CONSTRAINT_TAGS`, and none is required.
- **`tests/e2e-audit.test.ts:63-64`** become:

  ```ts
    // The master ids come from the asset form, on a page of its own beside the round form (group 2 plan 1 task 4: the
    // round form's conditions are chips with no select to read). Each select's options are waited for (13B loop 5).
    assert.match(data, /const form = await page\.context\(\)\.newPage\(\)\n\s*try \{\n\s*await form\.goto\("\/th\/assets\/new"\)/)
    assert.match(data, /const select = form\.locator\(`#\$\{id\}`\)\n(?:\s*\/\/[^\n]*\n)*\s*await expect\(select\.locator\('option:not\(\[value=""\]\)'\)\.first\(\)\)\.toBeAttached\(\)\n\s*return select\n\s*\.locator\("option"\)\n\s*\.evaluateAll\(/)
    assert.match(data, /\} finally \{\n\s*await form\.close\(\)\n\s*\}/)
  ```

- **Checked, no change needed:**
  - `tests/validation-guards.test.ts:31`, `:107`. V4 (`:213-222`) holds, because no scope `SearchableSelect` is `required`.
  - `tests/html-lang-and-years.test.ts:18-24`: the year stays as it is.
  - `tests/e2e-fixes.test.ts:233-238`: `toLocalDateInputValue()` stays.
  - `tests/e2e-cross-cutting.test.ts:225`, `:242`, `:249`: the end-date rule, the ids and the `router.push` stay.
  - `tests/v-track-final.test.ts:33-48`.
  - `tests/mobile-field-navigation.test.ts:50`.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `node --test tests/audit-round-form-ui.test.ts tests/audit-round-preview.test.ts tests/v-track2-u.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-component-round-routes.test.ts tests/form-frames-ui.test.ts tests/breadcrumbs-ui.test.ts tests/form-migration-guards.test.ts tests/e2e-audit.test.ts`
Expected: FAIL.
- The form still has its status select, its preview button and no trail, sections or chips.
- `addMonthsToDateKey` is not exported, so the preview test file stops at the import.
- The words test fails only if Step 1 has not run.
- `breadcrumbs-ui` counts 11 sites, and its new form check finds none.
- `audit-data.ts` still reads the round form's selects.
- `form-migration-guards` passes until the form changes; the floor row and the sticky row matter only after it does.

- [ ] **Step 5: Implement**

**`src/lib/audit-round-preview-rules.ts`** gains the two date helpers. They work on the date inputs' `yyyy-mm-dd` keys, which are already local days, so no Bangkok conversion is needed:

```ts
// One month after a yyyy-mm-dd key, on the month's last day when the day is missing (31 Jan → 28 or 29 Feb); "" for
// anything else (group 2 spec §7, bug §13.7: the end defaults to a month after the start).
export function addMonthsToDateKey(dateKey: string, months: number): string

// The items a day over the round's dates, both ends counted, rounded up; null for no items, a bad key or an end before
// the start (group 2 spec §7: "ต้องตรวจเฉลี่ยวันละ X รายการ").
export function auditRoundDailyLoad(items: number, startDate: string, endDate: string): number | null
```

Both parse with `/^(\d{4})-(\d{2})-(\d{2})$/` and `Date.UTC`.
- `addMonthsToDateKey` takes the first of the target month, `Math.min(day, last day of that month)`, and `toISOString().slice(0, 10)`.
- `auditRoundDailyLoad` uses `days = (end - start) / 86_400_000 + 1`.

**`src/components/audit/audit-round-form.tsx`** is rebuilt as below. Everything not named stays as it is: `requestBody`, `emptyToNull`, `isClosedStatusId`, `setIncludeClosedAssets` without `setPreview(null)`, the local `Select` wrapper (`:366-390`) and `handleSubmit`.

- **Imports:**
  - `useEffect, useRef, useState` from react; `Link` from `next/link`; `Plus, Save, X` from lucide-react (`ClipboardList` goes);
  - `foldTopCategories` from `@/lib/audit-round-counts-rules`; `addMonthsToDateKey, auditRoundDailyLoad` from `@/lib/audit-round-preview-rules`;
  - `Button, buttonVariants` from `@/components/ui/button`; `linkVariants` from `@/components/ui/button-variants`;
  - the four `DropdownMenu*` parts, `FormSection`, `SearchableSelect` and `StickyFormFooter`.
  - `KeyValueList` and `StatStrip` go.
- **The preview type:** `AuditRoundPreview` keeps `componentItems?: number` and gains `directSampled: number`, `categories: Array<{ id: string; count: number }>` and `overlap: { count: number; rounds: Array<{ id: string; auditNo: string }> }`.
- **`FIELD_IDS`:** `name`, `auditYear`, `startDate`, `endDate`, `riskPreset`, `sampleRate`, with today's ids, in that order (`status` goes). Its comment adds: "the scope conditions are chips (SCOPE_FIELDS); the server never refuses them".
- **The advanced fields:** `const ADVANCED_FIELDS: ReadonlySet<AuditRoundField> = new Set(["riskPreset", "sampleRate"])`, with the comment `// Section 3 is folded: an error there opens it before focus moves.`
- **`validate()`:** today's rules without `status`. The values type is `{ name: string; auditYear: string; startDate: string; endDate: string; sampleRate: string }`.
- **The scope fields:** one table, in the menu's order:

  ```ts
  // The eight scope conditions (group 2 spec §7): each a chip once chosen, offered in "+ เพิ่มเงื่อนไข" until then, with
  // its picker's id. Labels keep their codes ("BN01 - บางนา", audit-options.ts).
  const SCOPE_FIELDS = [
    { key: "scopeCompanyId", id: "audit-round-scope-company", label: "scopeCompany", options: "companies" },
    { key: "scopeBranchId", id: "audit-round-scope-branch", label: "scopeBranch", options: "branches" },
    { key: "scopeDepartmentId", id: "audit-round-scope-department", label: "scopeDepartment", options: "departments" },
    { key: "scopeLocationId", id: "audit-round-scope-location", label: "scopeLocation", options: "locations" },
    { key: "scopeCategoryId", id: "audit-round-scope-category", label: "scopeCategory", options: "categories" },
    { key: "scopeCustodianId", id: "audit-round-scope-custodian", label: "scopeCustodian", options: "employees" },
    { key: "scopeStatusId", id: "audit-round-scope-status", label: "scopeStatus", options: "statuses" },
    { key: "scopeConditionId", id: "audit-round-scope-condition", label: "scopeCondition", options: "conditions" },
  ] as const
  type ScopeField = (typeof SCOPE_FIELDS)[number]
  ```

- **The first values:** a module function `initialValues(locale: string)` with `type AuditRoundValues = ReturnType<typeof initialValues>`, and `useState(() => initialValues(locale))`:

  ```ts
  function initialValues(locale: string) {
    const startDate = toLocalDateInputValue()
    return {
      name: "",
      auditYear: String(toDisplayYear(new Date().getFullYear(), locale)),
      // … the eight scope ids "", includeClosedAssets: false, riskPreset: "all", sampleRate: "100" as today
      startDate,
      // Bug §13.7: the end is a month after the start, and the person can change it (group 2 spec §7).
      endDate: addMonthsToDateKey(startDate, 1),
    }
  }
  ```

- **`scopeBody(values: AuditRoundValues)`:** `emptyToNull` of the eight scope ids, `includeClosedAssets`, `riskPreset` and `sampleRate`, in that order. This is what the live count sends.
- **State:**
  - `lastPreview` / `setLastPreview` (`AuditRoundPreview | null`);
  - `previewState` (`"loading" | "ready" | "failed"`, first `"loading"`);
  - `previewKey` / `setPreviewKey` (`string | null`, first `null`): the `scopeRequest` that the last settled answer (ready or failed) was for;
  - `pendingScope` (`ScopeField["key"] | null`);
  - `advancedRef = useRef<HTMLDetailsElement>(null)` and `focusPickerRef = useRef(false)`.
  - `previewing` goes.
- **Derived values** (they read `scopeRequest`, so `const scopeRequest = JSON.stringify(scopeBody(values))` is declared before them, not at the live count below):
  - `const settled = previewKey === scopeRequest`;
  - `const preview = settled && previewState === "ready" ? lastPreview : null`;
  - `const previewFailed = settled && previewState === "failed"`;
  - `const componentItems = preview?.componentItems ?? 0`;
  - `const categories = foldTopCategories(preview?.categories ?? [])`;
  - `const dailyLoad = preview ? auditRoundDailyLoad(preview.sampledAssets, values.startDate, values.endDate) : null`;
  - `const statusOptions = filterAuditStatusOptions(options.statuses, values.includeClosedAssets)` (unchanged);
  - `chosenScopes = SCOPE_FIELDS.filter((field) => values[field.key])`, `availableScopes` (the rest), and `pendingField = SCOPE_FIELDS.find((field) => field.key === pendingScope)`;
  - `scopeOptions(field)` gives `statusOptions` for `scopeStatusId`, else `options[field.options]`. The chip's label reads the full list (`options[field.options]`), so a closed status still has its name.
  - `categoryLabel(id)` is the category's option label, or `t("summaryCategoryInactive")` for a category that is no longer active. A raw id never shows.
  - `footerStatus`:

    ```ts
    const footerStatus = preview
      ? preview.sampledAssets > 0
        ? t("willCreate", { count: formatCount(preview.sampledAssets) })
        : t("willCreateNone")
      : t(previewFailed ? "summaryUnavailable" : "counting")
    ```

- **Focus on errors:**

  ```ts
  const focusFirstError = () =>
    fieldErrors.focusFirst(FIELD_ORDER, {
      idFor: (key) => FIELD_IDS[key],
      reveal: (key) => {
        if (ADVANCED_FIELDS.has(key) && advancedRef.current) advancedRef.current.open = true
      },
    })
  ```

- **The live count (R10):** `scopeRequest` (declared above the derived values), then the asset form's pattern (`asset-form.tsx:556-585`). State is set only inside the timer, as React 19's lint wants:

  ```ts
  // The live count (group 2 spec §7, R10): the scope alone, 450ms after the last change, the earlier request aborted.
  // A refusal (a sample rate out of range) never moves focus or shows under a field: the panel says it cannot count.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setPreviewState("loading")
      try {
        const response = await fetch("/api/audit-rounds/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: scopeRequest,
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("preview refused")
        setLastPreview((await response.json()) as AuditRoundPreview)
        setPreviewKey(scopeRequest)
        setPreviewState("ready")
      } catch {
        if (!controller.signal.aborted) {
          setPreviewKey(scopeRequest)
          setPreviewState("failed")
        }
      }
    }, 450)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [scopeRequest])
  ```

  Typing the name or a date leaves `scopeRequest` the same, so no count runs. Until the answer for the current scope lands, the footer and the panel say กำลังนับรายการ…, never the last scope's count (the form contract above): `preview` and `previewFailed` hold only when `previewKey` equals the current `scopeRequest`.
- **The picker's focus:**
  - `openScopePicker(key)` sets `focusPickerRef.current = true` and `setPendingScope(key)`.
  - `DropdownMenuContent` gets `onCloseAutoFocus={(event) => { if (focusPickerRef.current) { focusPickerRef.current = false; event.preventDefault() } }}`.
  - An effect on `[pendingField]` focuses `document.getElementById(pendingField.id)` in a `requestAnimationFrame` (cancelled on cleanup). Focus goes to the new picker, not back to "+ เพิ่มเงื่อนไข".
  - `chooseCondition(key, value)` calls `setField(key, value)` and `setPendingScope(null)`.
- **`setField`:** the `setPreview(null)` line goes. The rest stays, including the pinned date-pair clear (`tests/v-track2-u.test.ts:87`).
- **Markup**, in this order:
  - `<div className="mx-auto max-w-6xl">`, then `PageHeader` (multi-line: `title={t("createTitle")}`, `breadcrumbs={[{ label: t("title"), href: `/${locale}/audit/rounds` }, { label: t("createRound") }]}`, `className="mb-6"`).
  - `<form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">`. On the phone the summary falls under the sections (Appendix A §7).
  - **Panel 1:** `<div className={cn(getPanelClasses(), "grid min-w-0 content-start gap-8 p-4 sm:p-5")}>`.
    - `<FormSection number={1} title={t("sectionNameDates")}>`: a `grid grid-cols-1 gap-5` holding:
      - the name `Field` (unchanged line);
      - a `grid grid-cols-1 gap-5 md:grid-cols-3` row with the year `Field` (unchanged), the start `Field` (unchanged) and the end `Field` with `hint={t("endDateHint")}` placed between `required` and `error` (pinned).
    - `<FormSection number={2} title={t("sectionScope")}>`: a `grid grid-cols-1 gap-4 md:grid-cols-2` holding three things.
      - **The chips row** (`flex flex-wrap items-center gap-2 md:col-span-2`):
        - with no condition, `<p className="text-sm text-muted-foreground">{t("noConditions")}</p>`;
        - otherwise one chip per chosen condition: `<Button key={field.key} type="button" variant="outline" size="sm" className="max-w-full" onClick={() => setField(field.key, "")} aria-label={t("removeCondition", { condition: `${t(field.label)}: ${label}` })}>`, with `<span className="min-w-0 truncate">{t(field.label)}: {label}</span>` and `<X aria-hidden="true" />`;
        - then the menu: `<DropdownMenu>`, `<DropdownMenuTrigger asChild>` around the add `Button` (pinned), and `<DropdownMenuContent align="start" onCloseAutoFocus={…}>` with one `DropdownMenuItem` per available condition, whose text is `{t(field.label)}`.
      - **The pending picker:** when `pendingField` is set, a `grid gap-2 md:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end` holding:
        - `<SearchableSelect id={pendingField.id} label={t(pendingField.label)} value="" options={scopeOptions(pendingField)} placeholder={t("conditionChoose", { condition: t(pendingField.label) })} searchPlaceholder={tCommon("search")} emptyLabel={tCommon("noData")} onChange={(value) => chooseCondition(pendingField.key, value)} />`, multi-line with `id`, `label` and `value` as the first three props (pinned);
        - `<Button type="button" variant="ghost" onClick={() => setPendingScope(null)}>{tCommon("cancel")}</Button>`.
      - **The include-closed choice:** the `ChoiceCard` as today (`className="md:col-span-2"`, pinned).
    - `<FormSection number={3} title={t("sectionAdvanced")}>`: `<details ref={advancedRef}>`, uncontrolled so React never fights `reveal`. It holds:
      - `<summary className={cn(linkVariants({ size: "inherit" }), "list-item cursor-pointer text-sm")}>{t("advancedNow", { risk: t(`riskPreset_${values.riskPreset}`), rate: values.sampleRate })}</summary>`, the app's folded pattern (`system-settings-form.tsx:2003-2004`);
      - `<p className="mt-3 text-meta text-muted-foreground">{t("riskSamplingHelp")}</p>`;
      - `<div className="mt-4 grid gap-4 md:grid-cols-2">` with the risk `Select` and the sample-rate `Field`, their lines unchanged.
  - **Panel 2, the summary:** `<div className={cn(getPanelClasses(), "grid content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start")}>`. It is not an `<aside>`: inside `<main>` that fails axe. It holds `<h2 className="text-base font-semibold text-foreground">{t("summaryTitle")}</h2>`, then one of three bodies.
    - **Not counted:** without `preview`, `<p className="text-sm text-muted-foreground">{t(previewFailed ? "summaryUnavailable" : "counting")}</p>`.
    - **Zero items:** with `preview.sampledAssets === 0`, `<EmptyNote className="mt-2">{t("previewEmpty")}</EmptyNote>` (pinned).
    - **Otherwise, in order:**
      - the count: `<p className="text-metric num text-foreground">{formatCount(preview.sampledAssets)}</p>` and `<p className="text-meta text-muted-foreground">{t("summaryItems")}</p>`;
      - when `preview.sampleRate < 100 ?`, `<p className="mt-1 text-sm text-muted-foreground">{t("summaryMatchedSampled", { matched: formatCount(preview.matchedAssets), sampled: formatCount(preview.directSampled) })}</p>` (R9);
      - `{componentItems > 0 ? <Notice tone="info">{t("previewComponentHelp", { count: componentItems })}</Notice> : null}`;
      - the categories:
        - `<h3 className="text-sm font-semibold text-foreground">{t("summaryByCategory")}</h3>`;
        - a `<ul className="mt-2 grid gap-1.5">` of `categories.top`, each `<li className="flex items-baseline justify-between gap-3 text-sm">` with `categoryLabel(row.id)` (`min-w-0 break-words`) and `formatCount(row.count)` (`num text-muted-foreground`);
        - when `categories.other.categories > 0`, one more row: `t("summaryOtherCategories", { count: formatCount(categories.other.categories) })` with `formatCount(categories.other.count)`;
      - when `preview.overlap.count > 0`, `<Notice tone="warning" title={t("overlapWarning", { count: formatCount(preview.overlap.count) })}>` (pinned). Its body is a `flex flex-wrap gap-x-3 gap-y-1` span of links. Each link has `key={round.id}`, `` href={`/${locale}/audit/rounds/${round.id}`} ``, `target="_blank"`, `rel="noreferrer"` and `className={linkVariants({ size: "inherit" })}`, and holds `<span className="tag">{round.auditNo}</span>`. A new tab keeps the half-filled form. It warns and never blocks (spec §7, R11);
      - `{dailyLoad !== null ? <p className="text-sm text-muted-foreground">{t("dailyLoad", { count: formatCount(dailyLoad) })}</p> : null}`;
      - `<details>` with the pinned `<summary …>{t("showSample")}</summary>` and today's sample list (`:280-292`: the `tag font-medium` code, the name, and the `previewComponentFromParent` line for a component), as `<ul className="mt-2 grid gap-y-3">`.
  - **The save bar,** the form's last child:

    ```tsx
          <StickyFormFooter className="lg:col-span-2" status={<span role="status">{footerStatus}</span>}>
            <Link href={`/${locale}/audit/rounds`} className={buttonVariants({ variant: "outline" })}>
              {tCommon("cancel")}
            </Link>
            <Button type="submit" busy={saving}>
              <Save aria-hidden="true" />
              {t("createRound")}
            </Button>
          </StickyFormFooter>
        </form>
    ```

    The status line is the page's one live region. A save with 0 items is not blocked: the API answers `auditScopeEmpty` ("ไม่พบทรัพย์สินในขอบเขตการตรวจนับนี้") through the catch's toast, and the panel and the bar already said 0.
- **Guards this markup keeps:**
  - no raw `<button>`, `<input>` or `<select>`;
  - no hex, no `dark:`, no `/NN` tint;
  - no `text-xs`, `rounded-lg`, `primary-soft` or `<section>`;
  - no local function named like a shared part or a stat tile (`list-frame-guards.test.ts:54`, `:66-67`). The summary stays inline in the form's JSX.

**`e2e/audit/audit-data.ts`:**
- `:8` becomes:

  ```ts
  // The category, status and condition ids come from the asset form (/th/assets/new), the lists IT staff pick from when
  // they register an asset. It is read on a page of its own, so the round form the person has open stays as it is: its
  // conditions are chips with a searchable picker and hold no select to read (group 2 plan 1 task 4).
  ```

- `:30-58` become:

  ```ts
  // The options of one select of the asset form, by its id.
  async function selectOptions(form: Page, id: string): Promise<{ value: string; label: string }[]> {
    const select = form.locator(`#${id}`)
    // The dashboard's loading.tsx streams the form, so its selects may still be empty here (13B loop 5).
    await expect(select.locator('option:not([value=""])').first()).toBeAttached()
    return select
      .locator("option")
      .evaluateAll((options) => options.map((option) => ({ value: (option as HTMLOptionElement).value, label: option.textContent?.trim() ?? "" })))
  }

  function optionId(options: { value: string; label: string }[], match: (label: string) => boolean, what: string): string {
    const option = options.find((candidate) => candidate.value && match(candidate.label))
    if (!option) throw new Error(`the asset form lists no ${what}`)
    return option.value
  }

  // Read on the asset form, in a page of its own beside the round form (as readAssetMasters in e2e/repair/repair-data.ts).
  export async function readAuditMasters(page: Page): Promise<AuditMasterIds> {
    const form = await page.context().newPage()
    try {
      await form.goto("/th/assets/new")
      const categories = await selectOptions(form, "asset-category")
      const statuses = await selectOptions(form, "asset-status")
      const conditions = await selectOptions(form, "asset-condition")
      return {
        // … the five optionId lines as today (:52-56)
      }
    } finally {
      await form.close()
    }
  }
  ```

- `field-audit.spec.ts` does not change here. Task 7 rewrites its open block on this form's contract. Until then the spec still holds the old steps (`#audit-round-status`, "ดูตัวอย่าง", "บันทึก"), and no E2E runs before Task 7.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/audit-round-form-ui.test.ts tests/audit-round-preview.test.ts tests/v-track2-u.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-component-round-routes.test.ts tests/form-frames-ui.test.ts tests/breadcrumbs-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/e2e-audit.test.ts tests/html-lang-and-years.test.ts tests/e2e-fixes.test.ts tests/e2e-cross-cutting.test.ts tests/v-track-final.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. React 19's hooks lint accepts the effect, because state is set only inside the timer and the frame. A pin that fails outside this task's list is rewritten in this commit and named in the report.

- [ ] **Step 8: Commit**

```bash
git add src/components/audit/audit-round-form.tsx src/lib/audit-round-preview-rules.ts e2e/audit/audit-data.ts messages/th.json messages/en.json tests/audit-round-form-ui.test.ts tests/audit-round-preview.test.ts tests/v-track2-u.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-component-round-routes.test.ts tests/form-frames-ui.test.ts tests/breadcrumbs-ui.test.ts tests/form-migration-guards.test.ts tests/e2e-audit.test.ts
git commit -m "feat(audit): the create form in three sections with condition chips, a live summary with categories, overlap and daily load, the end a month after the start and no status; the E2E master ids come from the asset form (group 2 plan 1 task 4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Rounds list data: views, a round-wide strip, close readiness, the one round count, scope, search and coverage

The rounds list gets its rules from one pure file, `src/lib/audit-rounds-list-rules.ts`, which node tests import. The rules cover:
- the four status tabs and the three work views;
- the list URL;
- the Bangkok year;
- the scope parts and the search where;
- each round's insight, built from Task 2's count, the finding work and the out-of-scope finds;
- close readiness, using the close API's three conditions;
- the next step and the dates line, which Task 6 draws.

The page reads every round once, unsearched, so the strip "งานที่ต้องทำต่อ" is round-wide (R1). The search narrows the tabs and the table only. Coverage counts own items only (R6). The coverage's open work comes from the same insights as the strip, so the two always agree. The out-of-scope count stays from scan history (R4). The JSX changes here only as far as the new data needs; Task 6 redraws the page.

Line numbers are master `28abba7b`. Task 1 has changed `page.tsx:29` (import), `:406`, `:512` (the badges) and `:875-881` (the label function), so re-check those lines before editing.

**Files:**
- Create: `src/lib/audit-rounds-list-rules.ts`. It is pure: relative `.ts` imports, plus `import type` from `@prisma/client`.
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/page.tsx`:
  - `:1-30` (imports);
  - `:55-72` (view values and the local types go);
  - `:80-86` (`ActionPanelItem.href` optional);
  - `:88-101` (the view);
  - `:102-209` (the data);
  - `:210-228` (view labels, status tabs);
  - `:229-251` (the strip, 4 cells);
  - `:252-258` (coverage numbers);
  - `:299-323` (coverage cells and breakdown);
  - `:357`, `:364` (tabs, hidden inputs);
  - `:372-381`, `:471-480` (row insight);
  - `:406-431`, `:506-534` (row counts, scope);
  - `:599-618` (`QuickFilterBar` props);
  - `:636-656` (`ReadyToCloseBadge` type);
  - `:745-769`, `:855-873`, `:883-891` (moved to the rules file);
  - `:771-818` (workflow links read the new insight);
  - `:893-910` (`formatScope`).
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Test:
  - `tests/audit-rounds-list-rules.test.ts` (new)
  - `tests/audit-rounds-ux.test.ts:57` (pin), plus a new data test at the end
  - `tests/list-pages-ui.test.ts:349`, `:351`
  - `tests/audit-pages-sweep-ui.test.ts:116`
  - `tests/audit-round-cancellation.test.ts:104`

**Interfaces:**
- Consumes:
  - Task 1: `isAuditRoundOperationalStatus` (`src/lib/audit-round-status.ts`, unchanged), and `getAuditRoundStatusLabel` in the page, as Task 1 left it.
  - Task 2: from `src/lib/audit-round-counts-rules.ts`, `type AuditRoundCounts = { total: number; pending: number; checked: number; outOfScope: number }`, `emptyAuditRoundCounts` and `withAuditRoundOwnItems(where)`; from `src/lib/audit-round-counts.ts`, `getAuditRoundCounts(roundIds, where?)`.
  - Existing helpers:
    - `appendListPage` (`./list-pagination.ts`);
    - `appendOperationalReturnTo` (`./operational-return-navigation.ts`);
    - `bangkokDayDiff` and `startOfBangkokDay` (`./waiting-work-rules.ts`);
    - `getBangkokDateKey` (`./preventive-maintenance.ts`);
    - `openAuditFindingActionStatuses = ["planned", "in_progress", "done"]` (`./audit-finding-filters.ts`, the close API's open actions);
    - `auditPercent` (`./dashboard-overview-rules.ts`).
- Produces (`src/lib/audit-rounds-list-rules.ts`):
  - `auditRoundTabs = ["open", "closed", "cancelled", "all"] as const`, `type AuditRoundTab`.
  - `auditRoundWorkViews = ["pending", "review", "readyToClose"] as const`, `type AuditRoundWorkView`, `type AuditRoundView = AuditRoundTab | AuditRoundWorkView`.
  - `DEFAULT_AUDIT_ROUND_VIEW: AuditRoundTab = "open"`.
  - `parseAuditRoundView(raw: string | string[] | undefined): AuditRoundView`. It takes the first value. An unknown value, `"mismatch"` included, gives `"open"`.
  - `isAuditRoundWorkView(view: AuditRoundView): view is AuditRoundWorkView`.
  - `auditRoundTabOf(view: AuditRoundView): AuditRoundTab`. A work view gives `"open"`.
  - `buildAuditRoundsHref(locale: string, view: AuditRoundView, searchText: string, listPage: { page?: number; pageSize?: number } = {}): string`. It leaves out `view` when `"open"`, so `?view=all` is written out.
  - `bangkokYear(now: Date): number`.
  - `buildAuditRoundSearchWhere(searchText: string): Prisma.AuditRoundWhereInput`.
  - `type AuditRoundScopeKey = "company" | "branch" | "department" | "location" | "category" | "custodian" | "status" | "condition"`.
  - `type AuditRoundScopeSource`, which takes the eight scope relations as `include`d (below).
  - `type AuditRoundScopePart = { key: AuditRoundScopeKey; code: string | null; name: string }`.
  - `buildAuditRoundScopeParts(round: AuditRoundScopeSource): AuditRoundScopePart[]`.
  - `type AuditRoundFindingWorkRow = { auditRoundId: string; reviewStatus: string; actionStatus: string; count: number }`, `type AuditRoundFindingWork = { pendingReview: number; openActions: number }`.
  - `foldAuditRoundFindingWork(rows: readonly AuditRoundFindingWorkRow[]): Map<string, AuditRoundFindingWork>`.
  - `type AuditRoundListInsight = { operational: boolean; total: number; pending: number; checked: number; pendingReview: number; openActions: number; outOfScope: number; readyToClose: boolean }`, `emptyAuditRoundListInsight`.
  - `buildAuditRoundInsights(rounds: readonly { id: string; status: string }[], counts: ReadonlyMap<string, AuditRoundCounts>, findingWork: ReadonlyMap<string, AuditRoundFindingWork>, outOfScopeByRoundId: ReadonlyMap<string, number>): Map<string, AuditRoundListInsight>`.
  - `filterRoundsByView<T extends { id: string; status: string }>(rounds: readonly T[], insights: ReadonlyMap<string, AuditRoundListInsight>, view: AuditRoundView): T[]`.
  - `sumAuditRoundWork(insights: readonly AuditRoundListInsight[]): { pending: number; checked: number; pendingReview: number; openActions: number }`.
  - `isAuditRoundAwaitingDecision(insight: AuditRoundListInsight): boolean`. True for an operational round with no pending item and at least one pending decision. This is the computed "รอพิจารณา" badge that Task 6 draws.
  - `type AuditRoundProgress = { started: boolean; value: number; percent: number }`, `buildAuditRoundProgress(insight: Pick<AuditRoundListInsight, "total" | "checked">): AuditRoundProgress`.
  - `type AuditRoundDueLine = { kind: "left" | "overdue"; days: number } | null`, `buildAuditRoundDueLine(status: string, endDate: Date, today: Date): AuditRoundDueLine`.
  - `type AuditRoundStepKey = "walk" | "pendingList" | "review" | "actions" | "close" | "outOfScope"`, `type AuditRoundStepLink = { key: AuditRoundStepKey; count: number | null; href: string }`.
  - `type AuditRoundNextStep = { main: AuditRoundStepLink | null; second: { key: "review" | "actions"; count: number } | null; outOfScope: AuditRoundStepLink | null; more: AuditRoundStepLink[] }`.
  - `buildAuditRoundNextStep(input: { locale: string; roundId: string; insight: AuditRoundListInsight; canScan: boolean; canClose: boolean; returnTo: string }): AuditRoundNextStep`.
- Produces (page, for Task 6):
  - `allRounds` (every active round, unsearched) and `rounds` (narrowed by the search);
  - `insightsByRoundId`, `insightOf(round)`, `filteredRounds`, `activeView`, `activeTab`, `statusTabs`, `viewLabels: Record<AuditRoundView, string>`;
  - `operationalRounds`, `openWork`, `pendingRounds`, `readyRounds`, `now`, `currentYear`, `canScan`;
  - `scopeLabels: Record<AuditRoundScopeKey, string>`;
  - `formatScope(round, allLabel, labels)`.

- [ ] **Step 1: Add the words**

Write the change file outside the repo, in the session scratchpad (an absolute path, for example `<scratchpad>/g2p1-task5-messages.json`; never the repo or its parent folder), then run `node scripts/messages-edit.mjs <file>` and delete the file. Namespace `auditRound`:

| Key | th | en |
|---|---|---|
| `viewOpen` (changed) | กำลังดำเนินการ | In progress |
| `viewClosed` (new) | ปิดแล้ว | Closed |
| `actionReviewFindingsHelp` (changed) | รายการไม่ตรงที่ยังรอพิจารณา | Discrepancies still waiting for a decision |
| `actionOpenActions` (new) | แผนแก้ไขค้าง | Open action plans |
| `actionOpenActionsHelp` (new) | แผนแก้ไขที่ยังไม่ปิด รอบจะปิดได้เมื่อปิดครบ | Action plans not closed yet; the round closes only after them |
| `actionCloseReadyRoundsHelp` (changed) | ไม่มีรายการรอตรวจ รายการรอพิจารณา หรือแผนแก้ไขค้าง | No pending assets, pending decisions or open action plans |
| `coverageOpenPendingItems` (new) | รอตรวจในรอบที่เปิดอยู่ | Pending in open rounds |
| `coverageOpenPendingReview` (new) | รอพิจารณาในรอบที่เปิดอยู่ | Pending decisions in open rounds |

Delete: `auditRound.viewMismatch` and `auditRound.coverageOpenPending`. Nothing else reads them: `rg -n '"viewMismatch"|"coverageOpenPending"' src tests e2e` shows the page and `audit-rounds-ux.test.ts:57` only.

- [ ] **Step 2: Write the failing tests**

`tests/audit-rounds-list-rules.test.ts` (new):

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { emptyAuditRoundCounts } from "../src/lib/audit-round-counts-rules.ts"
import {
  auditRoundTabOf,
  bangkokYear,
  buildAuditRoundDueLine,
  buildAuditRoundInsights,
  buildAuditRoundNextStep,
  buildAuditRoundProgress,
  buildAuditRoundScopeParts,
  buildAuditRoundSearchWhere,
  buildAuditRoundsHref,
  emptyAuditRoundListInsight,
  filterRoundsByView,
  foldAuditRoundFindingWork,
  isAuditRoundAwaitingDecision,
  isAuditRoundWorkView,
  parseAuditRoundView,
  sumAuditRoundWork,
} from "../src/lib/audit-rounds-list-rules.ts"

// The rounds list's rules (plan docs/superpowers/plans/2026-10-26-group2-audit-rounds.md, Task 5; spec
// docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md §5, §6, §13 bugs 3-5, §14).

test("the list opens on กำลังดำเนินการ; old and unknown views fall back to it, and a work view keeps that tab (group 2 spec §6, R7)", () => {
  assert.equal(parseAuditRoundView(undefined), "open")
  for (const value of ["open", "closed", "cancelled", "all", "pending", "review", "readyToClose"]) assert.equal(parseAuditRoundView(value), value)
  assert.equal(parseAuditRoundView("mismatch"), "open", "มีรายการไม่ตรง is gone")
  assert.equal(parseAuditRoundView("bogus"), "open")
  assert.equal(parseAuditRoundView(["closed", "all"]), "closed")
  assert.deepEqual(
    ["pending", "review", "readyToClose", "open", "closed", "cancelled", "all"].map((value) => auditRoundTabOf(parseAuditRoundView(value))),
    ["open", "open", "open", "open", "closed", "cancelled", "all"],
  )
  assert.equal(isAuditRoundWorkView("review"), true)
  assert.equal(isAuditRoundWorkView("all"), false)
})

test("the list URL leaves out the default tab and writes every other view, the search and the page (group 2 spec §6, R7)", () => {
  assert.equal(buildAuditRoundsHref("th", "open", ""), "/th/audit/rounds")
  assert.equal(buildAuditRoundsHref("th", "open", "", { page: 1, pageSize: 25 }), "/th/audit/rounds")
  assert.equal(buildAuditRoundsHref("th", "all", ""), "/th/audit/rounds?view=all")
  assert.equal(buildAuditRoundsHref("en", "closed", ""), "/en/audit/rounds?view=closed")
  assert.equal(buildAuditRoundsHref("th", "pending", "AUD-2026", { page: 2, pageSize: 50 }), "/th/audit/rounds?search=AUD-2026&view=pending&page=2&pageSize=50")
})

test("the coverage year is the Bangkok year, whatever the server's time zone (group 2 spec §5 Dates)", () => {
  assert.equal(bangkokYear(new Date("2026-12-31T16:59:59.000Z")), 2026)
  assert.equal(bangkokYear(new Date("2026-12-31T17:30:00.000Z")), 2027, "00:30 on 1 January in Bangkok")
})

test("the scope names every condition the round has, in the form's order, with codes where the record has one (group 2 spec §6, §13 bug 3)", () => {
  const none = { scopeCompany: null, scopeBranch: null, scopeDepartment: null, scopeLocation: null, scopeCategory: null, scopeCustodian: null, scopeStatus: null, scopeCondition: null }
  assert.deepEqual(buildAuditRoundScopeParts(none), [])
  assert.deepEqual(buildAuditRoundScopeParts({ ...none, scopeCategory: { code: "NB", name: "โน้ตบุ๊ก" } }), [{ key: "category", code: "NB", name: "โน้ตบุ๊ก" }], "a category-only round no longer reads ทรัพย์สินทั้งหมด")
  const every = {
    scopeCompany: { code: "GL", nameTh: "จีลิงค์" },
    scopeBranch: { code: "HQ", name: "สำนักงานใหญ่" },
    scopeDepartment: { code: "IT", name: "เทคโนโลยีสารสนเทศ" },
    scopeLocation: { code: "L-01", name: "ห้อง IT" },
    scopeCategory: { code: "NB", name: "โน้ตบุ๊ก" },
    scopeCustodian: { code: "E001", fullNameTh: "สมชาย ใจดี" },
    scopeStatus: { name: "Available", nameTh: "พร้อมใช้งาน" },
    scopeCondition: { name: "Good", nameTh: "" },
  }
  assert.deepEqual(buildAuditRoundScopeParts(every).map((part) => [part.key, part.code, part.name]), [
    ["company", "GL", "จีลิงค์"],
    ["branch", "HQ", "สำนักงานใหญ่"],
    ["department", "IT", "เทคโนโลยีสารสนเทศ"],
    ["location", "L-01", "ห้อง IT"],
    ["category", "NB", "โน้ตบุ๊ก"],
    ["custodian", "E001", "สมชาย ใจดี"],
    ["status", null, "พร้อมใช้งาน"],
    ["condition", null, "Good"],
  ])
})

test("the search finds a round by its number, its name, and the code or name of each coded scope, category and department included (group 2 spec §6, §13 bug 4)", () => {
  const contains = { contains: "NB" }
  assert.deepEqual(buildAuditRoundSearchWhere("NB"), {
    OR: [
      { auditNo: contains },
      { name: contains },
      { scopeCompany: { code: contains } },
      { scopeCompany: { nameTh: contains } },
      { scopeBranch: { code: contains } },
      { scopeBranch: { name: contains } },
      { scopeDepartment: { code: contains } },
      { scopeDepartment: { name: contains } },
      { scopeLocation: { code: contains } },
      { scopeLocation: { name: contains } },
      { scopeCategory: { code: contains } },
      { scopeCategory: { name: contains } },
      { scopeCustodian: { code: contains } },
      { scopeCustodian: { fullNameTh: contains } },
    ],
  })
})

test("pending decisions and open action plans are counted apart, each the way its own list counts it (group 2 R3)", () => {
  const work = foldAuditRoundFindingWork([
    { auditRoundId: "r1", reviewStatus: "pending", actionStatus: "not_required", count: 2 },
    { auditRoundId: "r1", reviewStatus: "approved", actionStatus: "planned", count: 1 },
    { auditRoundId: "r1", reviewStatus: "approved", actionStatus: "in_progress", count: 1 },
    { auditRoundId: "r1", reviewStatus: "approved", actionStatus: "done", count: 1 },
    { auditRoundId: "r1", reviewStatus: "approved", actionStatus: "closed", count: 5 },
    { auditRoundId: "r2", reviewStatus: "pending", actionStatus: "planned", count: 1 },
  ])
  assert.deepEqual(work.get("r1"), { pendingReview: 2, openActions: 3 }, "done is still open: it waits for its closing evidence")
  assert.deepEqual(work.get("r2"), { pendingReview: 1, openActions: 1 }, "a pending finding with a plan is in both lists")
  assert.equal(work.get("r3"), undefined)
})

test("a round is ready to close only on the close API's three conditions: no pending item, no pending decision, no open action plan (done included) (group 2 R2)", () => {
  const rounds = [
    { id: "ready", status: "open" },
    { id: "draft", status: "draft" },
    { id: "done", status: "open" },
    { id: "review", status: "open" },
    { id: "pending", status: "open" },
    { id: "closed", status: "closed" },
    { id: "empty", status: "open" },
  ]
  const counts = new Map([
    ["ready", { ...emptyAuditRoundCounts, total: 3, checked: 3 }],
    ["draft", { ...emptyAuditRoundCounts, total: 2, checked: 2 }],
    ["done", { ...emptyAuditRoundCounts, total: 2, checked: 2 }],
    ["review", { ...emptyAuditRoundCounts, total: 2, checked: 2 }],
    ["pending", { ...emptyAuditRoundCounts, total: 2, pending: 1, checked: 1, outOfScope: 9 }],
    ["closed", { ...emptyAuditRoundCounts, total: 2, checked: 2 }],
  ])
  const work = foldAuditRoundFindingWork([
    { auditRoundId: "done", reviewStatus: "approved", actionStatus: "done", count: 1 },
    { auditRoundId: "review", reviewStatus: "pending", actionStatus: "not_required", count: 2 },
  ])
  const insights = buildAuditRoundInsights(rounds, counts, work, new Map([["pending", 4]]))
  assert.deepEqual(rounds.filter((round) => insights.get(round.id)?.readyToClose).map((round) => round.id), ["ready", "draft", "empty"])
  // The out-of-scope count is the scan history's (R4), never the items' count.
  assert.deepEqual(insights.get("pending"), { operational: true, total: 2, pending: 1, checked: 1, pendingReview: 0, openActions: 0, outOfScope: 4, readyToClose: false })
  assert.equal(insights.get("done")?.openActions, 1)
  assert.equal(insights.get("closed")?.operational, false)
  assert.equal(isAuditRoundAwaitingDecision(insights.get("review")!), true, "fully scanned, decisions pending: the badge reads รอพิจารณา")
  assert.equal(isAuditRoundAwaitingDecision(insights.get("pending")!), false)
  assert.equal(isAuditRoundAwaitingDecision({ ...insights.get("review")!, operational: false }), false)
})

test("the tabs split rounds by status, a draft under กำลังดำเนินการ; the work views take open rounds with that work (group 2 spec §6, §14)", () => {
  const rounds = [
    { id: "o1", status: "open" },
    { id: "d1", status: "draft" },
    { id: "o2", status: "open" },
    { id: "c1", status: "closed" },
    { id: "x1", status: "cancelled" },
  ]
  const insight = (patch: Partial<typeof emptyAuditRoundListInsight>) => ({ ...emptyAuditRoundListInsight, operational: true, ...patch })
  const insights = new Map([
    ["o1", insight({ total: 2, pending: 2 })],
    ["d1", insight({ total: 2, checked: 2, pendingReview: 1 })],
    ["o2", insight({ total: 1, checked: 1, readyToClose: true })],
    ["c1", insight({ operational: false, total: 3, pending: 1, pendingReview: 1 })],
    ["x1", insight({ operational: false })],
  ])
  const ids = (view: Parameters<typeof filterRoundsByView>[2]) => filterRoundsByView(rounds, insights, view).map((round) => round.id)
  assert.deepEqual(ids("open"), ["o1", "d1", "o2"])
  assert.deepEqual(ids("closed"), ["c1"])
  assert.deepEqual(ids("cancelled"), ["x1"])
  assert.deepEqual(ids("all"), ["o1", "d1", "o2", "c1", "x1"])
  assert.deepEqual(ids("pending"), ["o1"], "a closed round's leftover items are not work")
  assert.deepEqual(ids("review"), ["d1"])
  assert.deepEqual(ids("readyToClose"), ["o2"])
  assert.deepEqual(sumAuditRoundWork([insights.get("o1")!, insights.get("d1")!, insights.get("o2")!]), { pending: 2, checked: 3, pendingReview: 1, openActions: 0 })
})

test("progress: checked over the round's own items, or not started (group 2 spec §6)", () => {
  assert.deepEqual(buildAuditRoundProgress({ total: 342, checked: 330 }), { started: true, value: 330 / 342, percent: 96 })
  assert.deepEqual(buildAuditRoundProgress({ total: 2, checked: 0 }), { started: false, value: 0, percent: 0 })
  assert.deepEqual(buildAuditRoundProgress({ total: 0, checked: 0 }), { started: false, value: 0, percent: 0 })
})

test("the dates line: days left counting the end day, or days overdue, on open rounds only, in Bangkok days (group 2 spec §6)", () => {
  const today = new Date("2026-10-26T00:00:00+07:00")
  const day = (key: string) => new Date(`${key}T00:00:00+07:00`)
  assert.deepEqual(buildAuditRoundDueLine("open", day("2026-11-05"), today), { kind: "left", days: 11 })
  assert.deepEqual(buildAuditRoundDueLine("draft", day("2026-10-26"), today), { kind: "left", days: 1 }, "the last day still counts")
  assert.deepEqual(buildAuditRoundDueLine("open", day("2026-10-25"), today), { kind: "overdue", days: 1 })
  assert.deepEqual(buildAuditRoundDueLine("open", day("2026-10-16"), today), { kind: "overdue", days: 10 })
  assert.equal(buildAuditRoundDueLine("closed", day("2026-10-16"), today), null)
  assert.equal(buildAuditRoundDueLine("cancelled", day("2026-11-05"), today), null)
  // A date stored at UTC midnight is still its Bangkok day; late evening is still today.
  assert.deepEqual(buildAuditRoundDueLine("open", new Date("2026-10-27T00:00:00.000Z"), new Date("2026-10-26T23:30:00+07:00")), { kind: "left", days: 2 })
})

test("the next step: เดินตรวจต่อ goes to the scan page for audit:edit and to the pending list for anyone else; then the second task and the out-of-scope link; a viewer never gets a scan link (group 2 spec §6, §13 bug 1)", () => {
  const insight = { ...emptyAuditRoundListInsight, operational: true, total: 10, pending: 4, checked: 6, pendingReview: 5, openActions: 2, outOfScope: 3 }
  const base = { locale: "th", roundId: "r1", insight, canClose: true, returnTo: "/th/audit/rounds?view=all" }
  const back = "returnTo=%2Fth%2Faudit%2Frounds%3Fview%3Dall"
  const editor = buildAuditRoundNextStep({ ...base, canScan: true })
  assert.deepEqual(editor.main, { key: "walk", count: 4, href: `/th/audit/rounds/r1/scan?${back}` })
  assert.deepEqual(editor.second, { key: "review", count: 5 })
  assert.deepEqual(editor.outOfScope, { key: "outOfScope", count: 3, href: `/th/audit/rounds/r1?result=out_of_scope&${back}#audit-result-list` })
  assert.deepEqual(editor.more.map((link) => [link.key, link.count, link.href]), [
    ["pendingList", 4, `/th/audit/rounds/r1/pending?${back}`],
    ["review", 5, `/th/audit/findings?status=pending&roundId=r1&${back}`],
    ["actions", 2, `/th/audit/findings?status=action_open&roundId=r1&${back}`],
  ])
  const viewer = buildAuditRoundNextStep({ ...base, canScan: false, canClose: false })
  assert.deepEqual(viewer.main, { key: "walk", count: 4, href: `/th/audit/rounds/r1/pending?${back}` })
  assert.deepEqual(viewer.more.map((link) => link.key), ["review", "actions"])
  assert.ok(![viewer.main, viewer.outOfScope, ...viewer.more].some((link) => link?.href.includes("/scan")), "no scan href for a viewer (E2E M5)")
})

test("after the walk the next step is the decision, then the action plans, then the close; a closed round has none (group 2 spec §6, R2, R3)", () => {
  const base = { locale: "th", roundId: "r1", canScan: true, canClose: true, returnTo: "/th/audit/rounds" }
  const back = "returnTo=%2Fth%2Faudit%2Frounds"
  const scanned = { ...emptyAuditRoundListInsight, operational: true, total: 10, checked: 10, pendingReview: 5, openActions: 2 }
  const review = buildAuditRoundNextStep({ ...base, insight: scanned })
  assert.deepEqual(review.main, { key: "review", count: 5, href: `/th/audit/findings?status=pending&roundId=r1&${back}` })
  assert.deepEqual(review.second, { key: "actions", count: 2 })
  assert.deepEqual(review.more.map((link) => link.key), ["actions"])
  assert.equal(review.outOfScope, null)
  const actions = buildAuditRoundNextStep({ ...base, insight: { ...scanned, pendingReview: 0 } })
  assert.deepEqual(actions.main, { key: "actions", count: 2, href: `/th/audit/findings?status=action_open&roundId=r1&${back}` })
  assert.equal(actions.second, null)
  const ready = { ...emptyAuditRoundListInsight, operational: true, total: 3, checked: 3, readyToClose: true }
  assert.deepEqual(buildAuditRoundNextStep({ ...base, insight: ready }).main, { key: "close", count: null, href: `/th/audit/rounds/r1?${back}` })
  assert.equal(buildAuditRoundNextStep({ ...base, canClose: false, insight: ready }).main, null, "only audit:approve closes a round")
  assert.deepEqual(buildAuditRoundNextStep({ ...base, insight: { ...scanned, operational: false, outOfScope: 2 } }), { main: null, second: null, outOfScope: null, more: [] })
})
```

`tests/audit-rounds-ux.test.ts`: at the top, after the imports, add `const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/page.tsx"` and `const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")`. At the end, add:

```ts
test("the rounds list counts with the one round count: the strip round-wide, the search on the tabs and table only, coverage on own items (group 2 plan 1 task 5, R1, R4, R6)", () => {
  const page = read(PAGE)
  // Every round once, unsearched; the search gives ids only.
  assert.match(page, /prisma\.auditRound\.findMany\(\{\n\s+where: \{ isActive: true \},\n\s+include: auditRoundListInclude,\n\s+orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+\}\)/)
  assert.match(page, /searchText \? prisma\.auditRound\.findMany\(\{ where: \{ isActive: true, \.\.\.buildAuditRoundSearchWhere\(searchText\) \}, select: \{ id: true \} \}\) : null/)
  assert.match(page, /const rounds = matchedRounds \? allRounds\.filter\(\(round\) => matchedRoundIds\.has\(round\.id\)\) : allRounds/)
  // One round count for own items; decisions and action plans apart; out-of-scope finds from scan history (R4).
  assert.match(page, /getAuditRoundCounts\(roundIds\)/)
  assert.match(page, /by: \["auditRoundId", "reviewStatus", "actionStatus"\]/)
  assert.match(page, /OR: \[\{ reviewStatus: "pending" \}, \{ actionStatus: \{ in: \[\.\.\.openAuditFindingActionStatuses\] \} \}\]/)
  assert.match(page, /prisma\.auditScanHistory\.groupBy/)
  // Coverage: own items, the Bangkok year.
  assert.match(page, /where: withAuditRoundOwnItems\(\{ auditRound: \{ isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere \} \}\)/)
  assert.match(page, /const currentYear = bangkokYear\(now\)/)
  // The strip and the coverage's open work: every operational round, unsearched (R1).
  assert.match(page, /const operationalRounds = allRounds\.filter\(\(round\) => isAuditRoundOperationalStatus\(round\.status\)\)/)
  assert.match(page, /const openWork = sumAuditRoundWork\(operationalRounds\.map\(insightOf\)\)/)
  assert.match(page, /const pendingRounds = filterRoundsByView\(allRounds, insightsByRoundId, "pending"\)/)
  assert.match(page, /const readyRounds = filterRoundsByView\(allRounds, insightsByRoundId, "readyToClose"\)/)
  // The table and the tab counts follow the search.
  assert.match(page, /const filteredRounds = filterRoundsByView\(rounds, insightsByRoundId, activeView\)/)
  assert.match(page, /count: filterRoundsByView\(rounds, insightsByRoundId, value\)\.length/)
  // The strip's links: the work view without the search, the action plans apart, no link to a ready round at 0 (R3, R8).
  assert.match(page, /: buildAuditRoundsHref\(locale, "pending", "", \{ pageSize: listPage\.pageSize \}\)/)
  assert.match(page, /count: openWork\.pendingReview,/)
  assert.match(page, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/findings\?status=action_open`, auditRoundsReturnHref\)/)
  assert.match(page, /href: readyRounds\[0\] \? appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{readyRounds\[0\]\.id\}`, auditRoundsReturnHref\) : undefined/)
  assert.doesNotMatch(page, /_count: \{ select|round\._count|auditItem\.groupBy|openFollowUpCount|followUps|hasMismatch|"mismatch"|getFullYear\(\)/)
  assert.doesNotMatch(read("src/lib/audit-rounds-list-rules.ts"), /from "@\/|\bprisma\./, "the rules stay pure")
})
```

- [ ] **Step 3: Rewrite these pins**

- `tests/audit-rounds-ux.test.ts`: the `viewMismatch` assert in "audit rounds UX copy is translated" (master `:57`; Step 2's `PAGE` and `read` shift it down by 2) → `viewClosed`.
- `tests/list-pages-ui.test.ts:349`: the URL builder moved to the rules file:

  ```ts
  assert.match(read("src/lib/audit-rounds-list-rules.ts"), /const query = appendListPage\(params, listPage\)\.toString\(\)/, "default links stay as they were")
  ```
- `tests/list-pages-ui.test.ts:351`: `activeView === "all"` → `activeView === "open"`. The rest of the regex stays.
- `tests/audit-pages-sweep-ui.test.ts:116` → `assert.match(source, /formatScope\(round, t\("all"\), scopeLabels\)/)`.
- `tests/audit-round-cancellation.test.ts:104`. The page no longer holds the literal `"cancelled"`; the filter lives in the rules:

  ```ts
  assert.match(readFileSync("src/lib/audit-rounds-list-rules.ts", "utf8"), /if \(view === "cancelled"\) return round\.status === "cancelled"/)
  ```

  `:105` (`viewCancelled`) and `:106` (`isAuditRoundOperationalStatus`) still hold on the page.
- These stay unchanged and must still pass:
  - `tests/e2e-fixes.test.ts:92-95`;
  - `tests/operational-return-navigation.test.ts:56-59`;
  - `tests/list-pages-ui.test.ts:342-348`, `:350`, `:352`;
  - `tests/audit-rounds-ux.test.ts` master `:8-17`, `:24-33` (the first two source tests, now below `PAGE`/`read`; the page keeps `buildAuditRoundInsights`, `filterRoundsByView`, `outOfScopeByRoundId` and its workflow links until Task 6);
  - `tests/audit-round-cancellation.test.ts:124-140`;
  - `tests/html-lang-and-years.test.ts:15`;
  - `tests/performance-route-instrumentation.test.ts:35-38`.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `node --test tests/audit-rounds-list-rules.test.ts tests/audit-rounds-ux.test.ts tests/list-pages-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-round-cancellation.test.ts`
Expected: FAIL. `src/lib/audit-rounds-list-rules.ts` does not exist (import error), the page still searches in the round query and counts with `_count`, and `formatScope` takes two arguments.

- [ ] **Step 5: Implement the rules file**

`src/lib/audit-rounds-list-rules.ts`. Its header comment says it holds the rounds list's rules (group 2 spec §5, §6, §13 bugs 3-5) and that it is pure. It imports:
- `import type { Prisma } from "@prisma/client"`;
- `emptyAuditRoundCounts` and `type AuditRoundCounts` from `./audit-round-counts-rules.ts`;
- `isAuditRoundOperationalStatus` from `./audit-round-status.ts`;
- `appendListPage` from `./list-pagination.ts`;
- `appendOperationalReturnTo` from `./operational-return-navigation.ts`;
- `bangkokDayDiff` from `./waiting-work-rules.ts`;
- `getBangkokDateKey` from `./preventive-maintenance.ts`;
- `openAuditFindingActionStatuses` from `./audit-finding-filters.ts`;
- `auditPercent` from `./dashboard-overview-rules.ts`.

The bodies the tests do not fully decide:
- `parseAuditRoundView`: take the first value of an array; return it if it is in `auditRoundTabs` or `auditRoundWorkViews`, else `DEFAULT_AUDIT_ROUND_VIEW`.
- `buildAuditRoundsHref`: today's function (`page.tsx:883-891`), moved as it is, with `if (view !== DEFAULT_AUDIT_ROUND_VIEW) params.set("view", view)` and its line `const query = appendListPage(params, listPage).toString()`. Its comment says: "The default tab (กำลังดำเนินการ) is the bare URL, so the dashboard's `?view=open` still opens it, and `?view=all` is written out (group 2 R7)."
- `bangkokYear`: `Number(getBangkokDateKey(now).slice(0, 4))`.
- `buildAuditRoundSearchWhere`: exactly the `OR` of the test, with one shared `const contains = { contains: searchText }`. Its comment says it adds names and the department, category and custodian (§13 bug 4). Status and condition are left out: their short names ("ดี") would match most rounds.
- `type AuditRoundScopeSource`:

  ```ts
  export type AuditRoundScopeSource = {
    scopeCompany: { code: string; nameTh: string } | null
    scopeBranch: { code: string; name: string } | null
    scopeDepartment: { code: string; name: string } | null
    scopeLocation: { code: string; name: string } | null
    scopeCategory: { code: string; name: string } | null
    scopeCustodian: { code: string; fullNameTh: string } | null
    scopeStatus: { name: string; nameTh: string } | null
    scopeCondition: { name: string; nameTh: string } | null
  }
  ```

  `buildAuditRoundScopeParts` pushes, in this order: company (`nameTh`), branch, department, location, category (`name`), custodian (`fullNameTh`), status and condition (`code: null`, `name: nameTh || name`). These follow the option labels of `src/lib/audit-options.ts:49-60`.
- `foldAuditRoundFindingWork`: for each row, `pendingReview += count` when `reviewStatus === "pending"`, and `openActions += count` when `openAuditFindingActionStatuses` includes `actionStatus`. A round with no row has no entry.
- `buildAuditRoundInsights`: for each round:
  - `const counts = countsByRoundId.get(id) ?? emptyAuditRoundCounts`;
  - `const work = findingWork.get(id) ?? { pendingReview: 0, openActions: 0 }`;
  - `operational = isAuditRoundOperationalStatus(status)`;
  - `outOfScope = outOfScopeByRoundId.get(id) ?? 0` (scan history, R4: never `counts.outOfScope` in plan 1);
  - `readyToClose = operational && counts.pending === 0 && work.pendingReview === 0 && work.openActions === 0`. A comment says: "the close API's checklist (`api/audit-rounds/[id]/route.ts` `getCloseChecklist`, R2); the opener rule is the round page's (plan 2)."
- `filterRoundsByView`:

  ```ts
  export function filterRoundsByView<T extends { id: string; status: string }>(rounds: readonly T[], insights: ReadonlyMap<string, AuditRoundListInsight>, view: AuditRoundView): T[] {
    return rounds.filter((round) => {
      if (view === "all") return true
      if (view === "closed") return round.status === "closed"
      if (view === "cancelled") return round.status === "cancelled"
      // กำลังดำเนินการ and the work views: open rounds, a leftover draft included (spec §14).
      if (!isAuditRoundOperationalStatus(round.status)) return false
      const insight = insights.get(round.id) ?? emptyAuditRoundListInsight
      if (view === "pending") return insight.pending > 0
      if (view === "review") return insight.pendingReview > 0
      if (view === "readyToClose") return insight.readyToClose
      return true
    })
  }
  ```
- `sumAuditRoundWork`: the four sums.
- `isAuditRoundAwaitingDecision`: `insight.operational && insight.pending === 0 && insight.pendingReview > 0`.
- `buildAuditRoundProgress`: `started = checked > 0`; `value = total > 0 ? checked / total : 0`; `percent = auditPercent(checked, total)`.
- `buildAuditRoundDueLine`: `null` unless operational. Otherwise `const diff = bangkokDayDiff(today, endDate)`. Then `diff >= 0 ? { kind: "left", days: diff + 1 } : { kind: "overdue", days: -diff }`. The comment says: "the end day itself still counts, so the last day reads เหลือ 1 วัน and the next day เลยกำหนด 1 วัน; display only, never a scan block (spec §6)".
- `buildAuditRoundNextStep`:

  ```ts
  export function buildAuditRoundNextStep({ locale, roundId, insight, canScan, canClose, returnTo }: { locale: string; roundId: string; insight: AuditRoundListInsight; canScan: boolean; canClose: boolean; returnTo: string }): AuditRoundNextStep {
    if (!insight.operational) return { main: null, second: null, outOfScope: null, more: [] }
    const back = (href: string) => appendOperationalReturnTo(href, returnTo)
    const round = `/${locale}/audit/rounds/${roundId}`
    const pendingList: AuditRoundStepLink = { key: "pendingList", count: insight.pending, href: back(`${round}/pending`) }
    // The work in its order: the walk (the scan page needs audit:edit; anyone else gets the pending list), the
    // decisions, then the action plans (spec §6, R3). Each count is the rows its link opens.
    const tasks: AuditRoundStepLink[] = [
      ...(insight.pending > 0 ? [{ key: "walk" as const, count: insight.pending, href: canScan ? back(`${round}/scan`) : pendingList.href }] : []),
      ...(insight.pendingReview > 0 ? [{ key: "review" as const, count: insight.pendingReview, href: back(`/${locale}/audit/findings?status=pending&roundId=${roundId}`) }] : []),
      ...(insight.openActions > 0 ? [{ key: "actions" as const, count: insight.openActions, href: back(`/${locale}/audit/findings?status=action_open&roundId=${roundId}`) }] : []),
    ]
    const [first, ...rest] = tasks
    const second = rest[0]
    return {
      main: first ?? (insight.readyToClose && canClose ? { key: "close", count: null, href: back(round) } : null),
      second: second ? { key: second.key === "review" ? "review" : "actions", count: second.count ?? 0 } : null,
      outOfScope: insight.outOfScope > 0
        ? { key: "outOfScope", count: insight.outOfScope, href: `${round}?result=out_of_scope&returnTo=${encodeURIComponent(returnTo)}#audit-result-list` }
        : null,
      more: [...(canScan && insight.pending > 0 ? [pendingList] : []), ...rest],
    }
  }
  ```

- [ ] **Step 6: Wire the page to the rules**

`src/app/[locale]/(dashboard)/audit/rounds/page.tsx`:
- **Imports:**
  - Add `import type { Prisma } from "@prisma/client"`.
  - Add `getAuditRoundCounts` from `@/lib/audit-round-counts`; `type AuditRoundCounts` and `withAuditRoundOwnItems` from `@/lib/audit-round-counts-rules`.
  - Add `openAuditFindingActionStatuses` from `@/lib/audit-finding-filters`.
  - Add from `@/lib/audit-rounds-list-rules`: `auditRoundTabOf`, `auditRoundTabs`, `bangkokYear`, `buildAuditRoundInsights`, `buildAuditRoundScopeParts`, `buildAuditRoundSearchWhere`, `buildAuditRoundsHref`, `emptyAuditRoundListInsight`, `filterRoundsByView`, `foldAuditRoundFindingWork`, `parseAuditRoundView`, `sumAuditRoundWork`, and the types `AuditRoundListInsight`, `AuditRoundScopeKey`, `AuditRoundScopeSource`, `AuditRoundTab`, `AuditRoundView`.
  - Drop `auditRoundOperationalWhere` from the `@/lib/audit-round-status` import. `isAuditRoundOperationalStatus` stays.
- **Types:**
  - `:55-56` (`auditRoundViewValues`, `AuditRoundView`) go.
  - `:58-72` (`AuditRoundListItem`, `AuditRoundInsight`) go.
  - `ActionPanelItem.href` becomes `href?: string`.
  - After the props type, add:

  ```ts
  // Every scope condition of a round (group 2 spec §6, §13 bug 3), as AuditRoundScopeSource needs them.
  const auditRoundListInclude = {
    scopeCompany: { select: { code: true, nameTh: true } },
    scopeBranch: { select: { code: true, name: true } },
    scopeDepartment: { select: { code: true, name: true } },
    scopeLocation: { select: { code: true, name: true } },
    scopeCategory: { select: { code: true, name: true } },
    scopeCustodian: { select: { code: true, fullNameTh: true } },
    scopeStatus: { select: { name: true, nameTh: true } },
    scopeCondition: { select: { name: true, nameTh: true } },
  } satisfies Prisma.AuditRoundInclude
  ```
- **`:90`:** the default becomes `view` with no fallback (`const { search = "", view, page, pageSize } = await searchParams`). Then:
  - `:100` becomes `const activeView = parseAuditRoundView(view)`;
  - next line: `const activeTab = auditRoundTabOf(activeView)`.
- **`:102-209`** become the code below. The two `withPerformanceTiming` labels stay in the page (pins `performance-route-instrumentation.test.ts:35-38`).

  ```ts
  // The coverage year is the Bangkok year (spec §5 Dates), whatever the server's time zone.
  const now = new Date()
  const currentYear = bangkokYear(now)
  const [allRounds, matchedRounds, activeAssets, coveredItems, currentYearRoundCount] = await withPerformanceTiming(
    "audit-rounds.initial-data",
    () => Promise.all([
      // Every round, unsearched: the strip "งานที่ต้องทำต่อ" and the coverage's open work are round-wide (group 2 R1).
      prisma.auditRound.findMany({
        where: { isActive: true },
        include: auditRoundListInclude,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      // The search narrows the tabs and the table only, so it reads ids.
      searchText ? prisma.auditRound.findMany({ where: { isActive: true, ...buildAuditRoundSearchWhere(searchText) }, select: { id: true } }) : null,
      prisma.asset.findMany({ /* unchanged, :129-138 */ }),
      // Coverage counts own items only (group 2 R6): an out-of-scope find never covers an asset.
      prisma.auditItem.findMany({
        where: withAuditRoundOwnItems({ auditRound: { isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere } }),
        distinct: ["assetId"],
        select: { assetId: true },
      }),
      prisma.auditRound.count({ where: { isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere } }),
    ]),
    { route: "/audit/rounds", locale, view: activeView, hasSearch: Boolean(searchText) }
  )
  const matchedRoundIds = new Set(matchedRounds?.map((round) => round.id))
  const rounds = matchedRounds ? allRounds.filter((round) => matchedRoundIds.has(round.id)) : allRounds
  const roundIds = allRounds.map((round) => round.id)
  const [countsByRoundId, findingWorkRows, outOfScopeWorkCounts] = roundIds.length
    ? await withPerformanceTiming(
        "audit-rounds.progress-data",
        () => Promise.all([
          // The round's own items, out-of-scope finds apart (group 2 spec §5 "What a round counts").
          getAuditRoundCounts(roundIds),
          // Pending decisions and open action plans (done included), as the close API counts them (R2, R3).
          prisma.auditFinding.groupBy({
            by: ["auditRoundId", "reviewStatus", "actionStatus"],
            where: {
              auditRoundId: { in: roundIds },
              OR: [{ reviewStatus: "pending" }, { actionStatus: { in: [...openAuditFindingActionStatuses] } }],
            },
            _count: { _all: true },
          }),
          // Out-of-scope finds stay from scan history in plan 1, like the round page's list they open (R4).
          prisma.auditScanHistory.groupBy({
            by: ["auditRoundId"],
            where: { auditRoundId: { in: roundIds }, auditItemId: null },
            _count: { _all: true },
          }),
        ]),
        { route: "/audit/rounds", locale, roundCount: roundIds.length }
      )
    : ([new Map<string, AuditRoundCounts>(), [], []] as const)
  const findingWorkByRoundId = foldAuditRoundFindingWork(
    findingWorkRows.map((row) => ({ auditRoundId: row.auditRoundId, reviewStatus: row.reviewStatus, actionStatus: row.actionStatus, count: row._count._all })),
  )
  const outOfScopeByRoundId = new Map(outOfScopeWorkCounts.map((row) => [row.auditRoundId, row._count._all]))
  const insightsByRoundId = buildAuditRoundInsights(allRounds, countsByRoundId, findingWorkByRoundId, outOfScopeByRoundId)
  const insightOf = (round: { id: string }): AuditRoundListInsight => insightsByRoundId.get(round.id) ?? emptyAuditRoundListInsight
  const filteredRounds = filterRoundsByView(rounds, insightsByRoundId, activeView)
  // (the comment and the three paging lines :200-206 stay as they are)
  // The strip and the coverage's open work: every open round, unsearched (R1). Each strip count is the list it opens.
  const operationalRounds = allRounds.filter((round) => isAuditRoundOperationalStatus(round.status))
  const openWork = sumAuditRoundWork(operationalRounds.map(insightOf))
  const pendingRounds = filterRoundsByView(allRounds, insightsByRoundId, "pending")
  const readyRounds = filterRoundsByView(allRounds, insightsByRoundId, "readyToClose")
  ```

  If `tsc` will not narrow the empty branch through `as const`, give it an explicit tuple type instead. The destructured names must keep their element types.
- **View labels:** `viewLabels: Record<AuditRoundView, string>` holds `open` (`viewOpen`), `closed` (`viewClosed`), `cancelled`, `all`, `pending`, `review` and `readyToClose`. The `mismatch` line goes.
- **Status tabs:** `quickFilters` becomes `statusTabs`:

  ```ts
  // The status tabs (group 2 spec §6): their counts follow the search, like the table (R1).
  const statusTabs = auditRoundTabs.map((value) => ({
    value,
    label: viewLabels[value],
    count: filterRoundsByView(rounds, insightsByRoundId, value).length,
    href: buildAuditRoundsHref(locale, value, searchText, { pageSize: listPage.pageSize }),
  }))
  ```

  `:357` becomes `<QuickFilterBar title={t("quickFiltersTitle")} current={activeTab} filters={statusTabs} />`. `QuickFilterBar`'s props become `{ title: string; current: AuditRoundTab; filters: Array<{ value: AuditRoundTab; label: string; count: number; href: string }> }`, with `current={current}` on the `TabNav`. A work view keeps the กำลังดำเนินการ tab current. Task 6 adds its chip.
- **Strip (`:229-251`):** 4 cells, in this order:
  1. The `actionContinueScan` cell:
     - `count: openWork.pending`;
     - `href: canScan && pendingRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${pendingRounds[0].id}/scan`, auditRoundsReturnHref) : buildAuditRoundsHref(locale, "pending", "", { pageSize: listPage.pageSize })`. The work view carries no search, because the strip is round-wide;
     - `tone: "primary"`.
  2. The `actionReviewFindings` cell:
     - `count: openWork.pendingReview,`;
     - its href is unchanged (`findings?status=pending`, pin `operational-return-navigation:59`);
     - `tone: "warning"`.
  3. A new cell:
     - `label: t("actionOpenActions")`, `help: t("actionOpenActionsHelp")`;
     - `count: openWork.openActions`;
     - `href: appendOperationalReturnTo(`/${locale}/audit/findings?status=action_open`, auditRoundsReturnHref)`;
     - `tone: "primary"`.
  4. The `actionCloseReadyRounds` cell:
     - `count: readyRounds.length`;
     - `href: readyRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${readyRounds[0].id}`, auditRoundsReturnHref) : undefined` (R8);
     - `tone: "success"` (no visual effect; at 0 the cell is plain per R8).

  Each total equals its list:
  - `findings?status=pending` and `findings?status=action_open` without a round read the active operational rounds (`buildAuditFindingWhere`), as `openWork` does;
  - `?view=pending` lists `pendingRounds`.
- **Coverage (`:255-258`, `:299-323`):**
  - `openPendingItems` and `openProcessedItems` go;
  - the StatStrip's fourth cell becomes two cells: `{ key: "openPendingItems", label: t("coverageOpenPendingItems"), value: formatCount(openWork.pending) }` and `{ key: "openPendingReview", label: t("coverageOpenPendingReview"), value: formatCount(openWork.pendingReview) }` (§13 bug 5);
  - in the `AuditProgressBar` breakdown, `scanned` takes `openWork.checked` and `pendingReview` takes `openWork.pendingReview`. Task 6 replaces the bar.
- **Rows (both maps):**
  - the `progress` and `insight` fallbacks (`:373-381`, `:472-480`) become `const insight = insightOf(round)`;
  - `round._count.items` becomes `insight.total`, `progress.processed` becomes `insight.checked`, and `progress.pending` becomes `insight.pending`;
  - `ReadyToCloseBadge`'s review label takes `insight.pendingReview`, and its `insight` prop type becomes `AuditRoundListInsight`;
  - `buildAuditRoundWorkflowLinks` keeps its shape. It reads `insight.pendingReview` for the review link and returns `[]` when `!insight.operational`. Its `insight` type becomes `AuditRoundListInsight`. Task 6 replaces it.
- **Scope:** both `formatScope(round, t("all"))` calls become `formatScope(round, t("all"), scopeLabels)`, with:

  ```ts
  const scopeLabels: Record<AuditRoundScopeKey, string> = {
    company: t("scopeCompany"), branch: t("scopeBranch"), department: t("scopeDepartment"), location: t("scopeLocation"),
    category: t("scopeCategory"), custodian: t("scopeCustodian"), status: t("scopeStatus"), condition: t("scopeCondition"),
  }
  ```

  `formatScope` (`:893-910`) becomes:

  ```tsx
  // Every scope condition the round has (group 2 spec §6, §13 bug 3): "<condition>: <code> - <name>", codes as tags.
  function formatScope(round: AuditRoundScopeSource, allLabel: string, labels: Record<AuditRoundScopeKey, string>): ReactNode {
    const parts = buildAuditRoundScopeParts(round)
    if (parts.length === 0) return allLabel
    return parts.map((part, index) => (
      <Fragment key={part.key}>
        {index > 0 ? " / " : null}
        {labels[part.key]}: {part.code ? <><span className="tag">{part.code}</span> - </> : null}{part.name}
      </Fragment>
    ))
  }
  ```
- **Hidden inputs (`:364`):** `activeView === "all"` becomes `activeView === "open"`.
- **Moved out:** delete `buildAuditRoundInsights` (`:745-769`), `filterRoundsByView` (`:855-873`) and `buildAuditRoundsHref` (`:883-891`) from the page. They are imported now.
- **E2E:** none changes in this task. The viewer's visit in `e2e/cross-cutting/roles.spec.ts:36-51` still meets no scan href: the strip gives a scan link only for `canScan`, and the rows' links are unchanged until Task 6.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test tests/audit-rounds-list-rules.test.ts tests/audit-rounds-ux.test.ts tests/list-pages-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-round-cancellation.test.ts tests/operational-return-navigation.test.ts tests/e2e-fixes.test.ts tests/html-lang-and-years.test.ts tests/performance-route-instrumentation.test.ts tests/audit-round-counts.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/list-frame-guards.test.ts && npx tsc --noEmit`
Expected: PASS, and `tsc` is clean.

Then run `npm test` and `npm run lint`. Expected: both pass. If a pin outside this list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 8: Commit**

```bash
git add src/lib/audit-rounds-list-rules.ts "src/app/[locale]/(dashboard)/audit/rounds/page.tsx" messages/th.json messages/en.json tests/audit-rounds-list-rules.test.ts tests/audit-rounds-ux.test.ts tests/list-pages-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-round-cancellation.test.ts
git commit -m "feat(audit-rounds): the rounds list counts own items with one round count, the strip is round-wide, readiness takes the close API's conditions, the tabs are open / closed / cancelled / all, and the scope and search cover every condition (group 2 plan 1 task 5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Rounds list UI: the spec's order, status tabs with the work-view chip, the table's columns and its own next-step cell, the folded coverage

The page is redrawn in §6's order:
1. The strip "งานที่ต้องทำต่อ".
2. The status `TabNav`, with the work view as a removable chip.
3. The table frame, with "ค้นหารอบ" in its top bar.
4. The year's coverage, folded to one line in a `<details>`.

The table's columns are รอบ, ขอบเขต, ช่วงวันที่, ความคืบหน้า, สถานะ and ขั้นถัดไป, then ⋯:
- ขั้นถัดไป is the page's own wrapping cell (§13 bug 1).
- `RowActions` gets `next={undefined}` and keeps only ⋯. The part itself does not change.

The phone card stays. It now carries the same status badge, dates, progress and next step. The header reads "N รอบ". The strip words change. The list moves from `AuditProgressBar` to `PaceBar`, and DESIGN.md's Data Bars line says so.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/page.tsx` (after Task 5):
  - the imports;
  - the render (master `:277-575`);
  - `ActionPanel` (`:577-597`, unchanged except `href?`);
  - `RoundWorkflowLinks` (`:620-635`, its comment `:620` rewritten);
  - `ReadyToCloseBadge` (`:636-656`, replaced);
  - `buildAuditRoundWorkflowLinks`, `roundWorkflowIcons`, `buildRoundRowActions` (`:771-853`, replaced);
  - `getAuditRoundStatusLabel` (Task 1's) stays.
- Modify: `DESIGN.md:294` (the Data Bars Rule's last sentence)
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Test:
  - `tests/audit-rounds-ux.test.ts` (master numbers; Task 5 added `PAGE`/`read` after the imports and a data test at the end, so find these by title): the three source tests "audit rounds page exposes action-first workflow controls", "audit rounds list exposes per-round workflow shortcuts" and "audit rounds quick filters preserve scroll position" (master `:5-40`, rewritten); the key-list test "audit rounds UX copy is translated" (master `:42-66`); plus new tests at the end;
  - `tests/audit-pages-sweep-ui.test.ts:100-119` (`:102`, `:107-110` rewritten; the title);
  - `tests/list-pages-ui.test.ts:329` (two parts added).

**Interfaces:**
- Consumes:
  - Task 5's rules: `buildAuditRoundNextStep`, `buildAuditRoundDueLine`, `buildAuditRoundProgress`, `isAuditRoundAwaitingDecision`, `isAuditRoundWorkView`, and the types `AuditRoundStepKey`, `AuditRoundStepLink`, `AuditRoundDueLine`, `AuditRoundProgress`, `AuditRoundListInsight`.
  - Task 5's page names: `insightOf`, `filteredRounds`, `activeView`, `activeTab`, `statusTabs`, `viewLabels`, `openWork`, `pendingRounds`, `readyRounds`, `now`, `canScan`, `scopeLabels`.
  - Task 1: `effectiveAuditRoundStatus` (`@/lib/audit-round-status`), and `getAuditRoundStatusLabel` in the page.
  - Shared parts:
    - `FilterChipList` (`@/components/ui/filter-chips`);
    - `PaceBar({ value, pace, label, behind })` (`@/components/ui/pace-bar`);
    - `Nil` (`@/components/ui/nil`);
    - `toneIcons` (`@/components/ui/tone-icons`);
    - `formatPercent` (`@/lib/display-format`);
    - `MasterDataSearch` (unchanged props).
- Produces (the markup Task 7's E2E stands on):
  - The status tabs are the first `[data-slot="tab-nav"]` in `<main>`: กำลังดำเนินการ / ปิดแล้ว / ยกเลิก / ทั้งหมด, each with its count (0 shown). Under a work view the กำลังดำเนินการ tab is current.
  - The work view's chip:
    - `<FilterChipList chips={workViewChips} label={t("activeFilters")} removeLabel={t("clearFilter")} />`, so its link is named "ล้างตัวกรองนี้: รอตรวจ";
    - its href is `buildAuditRoundsHref(locale, "open", searchText, { pageSize })`. It drops `view` and keeps the search.
  - The header meta (`[data-slot="page-header-meta"]`) reads `t("roundCount", { count: formatCount(filteredRounds.length) })`, for example "1 รอบ".
  - The desktop row (`tbody tr`) and the phone card (`<article>`) each hold:
    - one status badge;
    - the next-step link, whose whole accessible name is "เดินตรวจต่อ ({count})";
    - "ยังไม่เริ่ม" when nothing is checked;
    - "เหลือ {days} วัน" (or "เลยกำหนด {days} วัน") on an open round, alone in its own element.
  - A viewer gets no `/scan` href anywhere on the page.
  - With a search and no rows, the desktop table shows the link "ล้างคำค้น".
  - The strip cell link is named exactly by its label: "เดินตรวจต่อ" (StatStrip's link holds the label only).

- [ ] **Step 1: Add and change the words**

Write the change file outside the repo, in the session scratchpad (an absolute path, for example `<scratchpad>/g2p1-task6-messages.json`), then run `node scripts/messages-edit.mjs <file>` and delete it. Namespace `auditRound`:

| Key | th | en |
|---|---|---|
| `actionContinueScan` (changed) | เดินตรวจต่อ | Continue the walk |
| `actionContinueScanHelp` (changed) | ใน {count} รอบที่เปิดอยู่ | In {count} open rounds |
| `actionCloseReadyRounds` (changed) | รอบที่ปิดได้แล้ว | Rounds ready to close |
| `round` (new) | รอบ | Round |
| `nextStep` (new) | ขั้นถัดไป | Next step |
| `searchRounds` (new) | ค้นหารอบ | Search rounds |
| `roundCount` (new) | {count} รอบ | {count} rounds |
| `itemCount` (new) | {count} รายการ | {count} items |
| `daysLeft` (new) | เหลือ {days} วัน | {days} days left |
| `daysOverdue` (new) | เลยกำหนด {days} วัน | {days} days overdue |
| `notStarted` (new) | ยังไม่เริ่ม | Not started |
| `progressLine` (new) | {checked} / {total} · {percent} | {checked} / {total} · {percent} |
| `progressBarLabel` (new) | ตรวจแล้ว {checked} จาก {total} รายการ | Checked {checked} of {total} items |
| `nextStepContinueScan` (new) | เดินตรวจต่อ ({count}) | Continue the walk ({count}) |
| `nextStepReview` (new) | พิจารณา ({count}) | Decide ({count}) |
| `nextStepActions` (new) | แผนแก้ไขค้าง ({count}) | Open action plans ({count}) |
| `openActionsCount` (new) | แผนแก้ไขค้าง {count} | {count} open action plans |
| `coverageLine` (new) | ครอบคลุม {covered} จาก {total} · ยังไม่อยู่ในรอบใด {missing} | Covered {covered} of {total} · in no round {missing} |
| `coverageBreakdown` (new) | ดูแยกตามหมวดหมู่และแผนก | By category and department |
| `coverageOpenChecked` (new) | ตรวจแล้ว {count} | {count} checked |

Kept and reused:
- `blockedPendingReview` "รอพิจารณา {count}" (the second task);
- `pendingReview` "รอพิจารณา" (the computed badge);
- `readyToClose`;
- `closeRound` "ปิดรอบตรวจ";
- `roundActionPending`, `roundActionOutOfScope`;
- `activeFilters`, `clearFilter`;
- `scope`, `dateRange`, `progress`, `status`;
- `coverage*` except the three below.

Glossary: "หมวดหมู่", not "หมวด" (`tests/thai-glossary.test.ts` rule `หมวด (ย่อ)`); "แผนแก้ไข" for action plan.

Delete these keys; after this task nothing reads them:
- `auditRound.blockedPendingItems`;
- `auditRound.roundActionReview` (the cut "ต้องพิจารณ…");
- `auditRound.coverageProgress`;
- `auditRound.coverageCoveredLabel`;
- `auditRound.coverageMissingLabel`;
- `auditRound.subtitle` (the meta is now "N รอบ"). Before deleting it, check `rg -n 'subtitle' "src/app/[locale]/(dashboard)/audit" src/components/audit`: no reader in the `auditRound` namespace may be left. If one is left, keep the key.

`auditRound.items` "รายการตรวจ" stays: the round page reads it.

- [ ] **Step 2: Write the failing tests**

`tests/audit-rounds-ux.test.ts`: replace the three source tests named in Files (master `:5-40`, now below Task 5's `PAGE` and `read`, which stay) with the tests below, then change the key list in "audit rounds UX copy is translated" (master `:42-66`). Put the `fn` helper after `read`.

```ts
const fn = (source: string, name: string) => {
  const start = source.indexOf(`\nfunction ${name}(`)
  assert.ok(start !== -1, `function ${name}`)
  const end = source.indexOf("\nfunction ", start + 1)
  return source.slice(start, end === -1 ? undefined : end)
}

test("the rounds list in the spec's order: strip, status tabs and the work view's chip, the table with its search, then the folded coverage (group 2 spec §6)", () => {
  const page = read(PAGE)
  assert.match(page, /view\?: string/)
  const at = (needle: string) => {
    const index = page.indexOf(needle)
    assert.ok(index !== -1, needle)
    return index
  }
  const order = [
    'meta={t("roundCount", { count: formatCount(filteredRounds.length) })}',
    '<ActionPanel title={t("nextActionsTitle")} help={t("nextActionsHelp")} actions={actionItems} />',
    '<QuickFilterBar title={t("quickFiltersTitle")} current={activeTab} filters={statusTabs} />',
    '<FilterChipList chips={workViewChips} label={t("activeFilters")} removeLabel={t("clearFilter")} />',
    '<div className={cn(getPanelClasses(), "overflow-hidden")}>',
    'placeholder={t("searchRounds")}',
    '<details className={cn(getPanelClasses(), "p-4 sm:p-5")}>',
  ].map(at)
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  // The work view (รอตรวจ / รอพิจารณา / ปิดรอบได้) is a chip under the กำลังดำเนินการ tab; removing it keeps the search.
  assert.match(page, /const workViewChips = isAuditRoundWorkView\(activeView\)\n\s+\? \[\{ key: activeView, label: viewLabels\[activeView\], href: buildAuditRoundsHref\(locale, "open", searchText, \{ pageSize: listPage\.pageSize \}\) \}\]\n\s+: \[\]/)
  assert.match(fn(page, "QuickFilterBar"), /<TabNav\b[\s\S]*?current=\{current\}[\s\S]*?scroll=\{false\}/)
  assert.doesNotMatch(page, /t\("subtitle"\)/)
})

test("the strip: เดินตรวจต่อ says how many open rounds it covers, รอบที่ปิดได้แล้ว has no link at 0 (group 2 spec §6, R8)", () => {
  const page = read(PAGE)
  assert.match(page, /help: t\("actionContinueScanHelp", \{ count: formatCount\(pendingRounds\.length\) \}\),/)
  assert.match(page, /href: readyRounds\[0\] \? appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{readyRounds\[0\]\.id\}`, auditRoundsReturnHref\) : undefined/)
  assert.match(page, /href\?: string/)
})

test("the table: รอบ with the name as the link and the number under it, ขอบเขต with its items, dates with days left, a PaceBar, one status badge, ขั้นถัดไป in its own wrapping cell, ⋯ only (group 2 spec §6, §13 bug 1)", () => {
  const page = read(PAGE)
  const heads = [...page.matchAll(/<DataTableHead(?: [^>]*)?>\{(?:t|tCommon)\("(\w+)"\)\}<\/DataTableHead>/g)].map((match) => match[1])
  assert.deepEqual(heads, ["round", "scope", "dateRange", "progress", "status", "nextStep", "actions"])
  assert.equal(page.match(/<TableEmptyRow\s+colSpan=\{7\}/g)?.length, 2)
  assert.match(page, /<Link href=\{row\.detailHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "font-semibold"\)\}>\{round\.name\}<\/Link>/)
  assert.equal(page.match(/t\("itemCount", \{ count: formatCount\(row\.insight\.total\) \}\)/g)?.length, 2, "the scope's items, card and table")
  assert.match(page, /<DataTableCell className="min-w-44">\s*<RoundNextStep \{\.\.\.row\.nextStep\} \/>/)
  assert.match(page, /<RowActions\s+code=\{round\.auditNo\}\s+name=\{round\.name\}\s+menuLabel=\{tCommon\("moreActionsFor", \{ code: round\.auditNo \}\)\}\s+next=\{undefined\}\s+groups=\{row\.groups\}\s*\/>/)
  for (const part of ["RoundStatusBadges", "RoundNextStep", "RoundDates", "RoundProgress"]) {
    assert.equal(page.match(new RegExp(`<${part}\\b`, "g"))?.length, 2, `${part}: the phone card and the table`)
  }
  // One place builds a row: the next step with canScan, so a viewer never gets a scan link (E2E M5).
  assert.equal(page.match(/buildAuditRoundNextStep\(\{ locale, roundId: round\.id, insight, canScan, canClose, returnTo: auditRoundsReturnHref \}\)/g)?.length, 1)
  assert.match(page, /const detailHref = appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`, auditRoundsReturnHref\)/)
  assert.doesNotMatch(page, /AuditProgressBar|buildRoundRowActions|buildAuditRoundWorkflowLinks|ReadyToCloseBadge|roundActionReview|blockedPendingItems|round\._count/)
})

test("ขั้นถัดไป wraps and is never cut: the main task on line 1, the second in warning text with its icon on line 2, the out-of-scope link beside it (group 2 spec §6, §13 bug 1)", () => {
  const nextStep = fn(read(PAGE), "RoundNextStep")
  assert.match(nextStep, /if \(!main && !second && !outOfScope\) return <Nil \/>/)
  assert.match(nextStep, /<Link href=\{main\.href\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-start font-medium md:min-h-0"\)\}>\{main\.label\}<\/Link>/)
  assert.match(nextStep, /<span className="inline-flex items-center gap-1 text-warning">\s*<WarningIcon aria-hidden="true" className="size-3\.5 shrink-0" \/>\s*\{second\}\s*<\/span>/)
  assert.match(nextStep, /<Link href=\{outOfScope\.href\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-meta md:min-h-0"\)\}>\{outOfScope\.label\}<\/Link>/)
  assert.doesNotMatch(nextStep, /truncate|whitespace-nowrap|line-clamp|w-30|max-w-/)
})

test("one status badge: the round's status, or รอพิจารณา when it is fully scanned with decisions pending; พร้อมปิดรอบ beside it; dates and progress by the rules (group 2 spec §6, §14)", () => {
  const page = read(PAGE)
  const badges = fn(page, "RoundStatusBadges")
  assert.match(badges, /isAuditRoundAwaitingDecision\(insight\) \? \(\s*<StatusBadge label=\{labels\.pendingReview\} tone="warning" \/>\s*\) : \(\s*<StatusBadge label=\{labels\.status\} status=\{effectiveAuditRoundStatus\(status\)\} \/>\s*\)/)
  assert.match(badges, /\{insight\.readyToClose \? <StatusBadge label=\{labels\.ready\} tone="success" \/> : null\}/)
  const dates = fn(page, "RoundDates")
  assert.match(dates, /due\.kind === "overdue" \? "text-danger" : "text-warning"/)
  const progress = fn(page, "RoundProgress")
  assert.match(progress, /if \(!progress\.started\) return <span className="text-muted-foreground">\{notStarted\}<\/span>/)
  assert.match(progress, /<PaceBar value=\{progress\.value\} pace=\{null\} label=\{barLabel\} behind=\{false\} \/>/)
  assert.match(page, /due: buildAuditRoundDueLine\(round\.status, round\.endDate, today\),/)
  assert.match(page, /progress: buildAuditRoundProgress\(insight\),/)
  assert.match(page, /const canClose = hasPermission\(user, "audit", "approve"\)/)
  assert.match(page, /const today = startOfBangkokDay\(now\)/)
})

test("the coverage folds to one line (bar, percent, sentence) and opens the five numbers and the gap lists (group 2 spec §6, §13 bug 5, R6)", () => {
  const page = read(PAGE)
  const details = page.slice(page.indexOf('<details className={cn(getPanelClasses(), "p-4 sm:p-5")}>'), page.indexOf("</details>"))
  const summary = details.slice(0, details.indexOf("</summary>"))
  assert.match(summary, /<h2 className="text-base font-semibold text-foreground">\{t\("coverageTitle", \{ year: toDisplayYear\(currentYear, locale\) \}\)\}<\/h2>/)
  assert.match(summary, /<PaceBar value=\{coverageShare\} pace=\{null\} label=\{coverageLine\} behind=\{false\} \/>/)
  assert.match(summary, /\{formatPercent\(coverageShare\)\}/)
  assert.match(summary, /\{coverageLine\}/)
  assert.match(summary, /\{t\("coverageBreakdown"\)\}/)
  assert.match(page, /const coverageLine = t\("coverageLine", \{ covered: formatCount\(coveredAssetCount\), total: formatCount\(activeAssets\.length\), missing: formatCount\(uncoveredAssetCount\) \}\)/)
  const open = details.slice(details.indexOf("</summary>"))
  for (const key of ["activeAssets", "covered", "uncovered", "openPendingItems", "openPendingReview"]) assert.match(open, new RegExp(`\\{ key: "${key}", label: t\\(`), key)
  assert.match(open, /value: formatCount\(openWork\.pending\), foot: t\("coverageOpenChecked", \{ count: formatCount\(openWork\.checked\) \}\)/)
  assert.match(open, /\{t\("coverageRoundCount"\)\}: <span className="num font-semibold text-foreground">\{formatCount\(currentYearRoundCount\)\}<\/span>/)
  assert.equal(open.match(/<CoverageGapList\b/g)?.length, 2)
})

test("DESIGN.md: the rounds list draws its bars with PaceBar; AuditProgressBar stays on the round page until plan 2 (group 2 plan 1 task 6)", () => {
  const design = read("DESIGN.md")
  const rule = design.slice(design.indexOf("\n**The Data Bars Rule.** "), design.indexOf("\n**The Status With Evidence Rule.** "))
  assert.ok(rule.includes("`AuditProgressBar` (the round page, until group 2 plan 2) and the audit scan header's bar are older progress bars"))
  assert.ok(rule.includes("The rounds list draws each round's progress and the year's coverage with `PaceBar` (group 2 plan 1)."))
})
```

Keep the data test that Task 5 added at the end of the file. Remove `/prisma\.auditScanHistory\.groupBy/` from the deleted `:24` test: Task 5's data test already holds it.

Key list (the `for` loop's asserts in "audit rounds UX copy is translated", master `:47-64`):
- remove `roundActionReview` and `blockedPendingItems`;
- add `viewClosed`, `actionOpenActions`, `round`, `nextStep`, `searchRounds`, `roundCount`, `itemCount`, `daysLeft`, `daysOverdue`, `notStarted`, `progressLine`, `progressBarLabel`, `nextStepContinueScan`, `nextStepReview`, `nextStepActions`, `openActionsCount`, `coverageLine`, `coverageBreakdown` and `coverageOpenChecked`;
- add one value check: `assert.equal(messages.auditRound.actionContinueScan, messages === th ? "เดินตรวจต่อ" : "Continue the walk")`.

`tests/list-pages-ui.test.ts:329`: the part list gains `"<FilterChipList"` and `"<PaceBar"`.

- [ ] **Step 3: Rewrite these pins**

`tests/audit-pages-sweep-ui.test.ts`:
- `:100` title: "audit rounds list: the coverage a folded `<details>` on the panel classes with frameless gap lists, the next actions a StatStrip, the list frame on the panel classes, one StatusBadge state, KeyValueList facts, outline sm workflow links, text links and tag scopes (spec 2D §3.4 …; group 2 spec §6)".
- `:102` becomes:

  ```ts
  assert.match(source, /\{\/\* A <details> cannot be ContentPanel: the panel classes \(2D-2 R4\)\.[^*]*\*\/\}\n\s+<details className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  ```
- `:107` (Task 1's two `<StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={effectiveAuditRoundStatus(round.status)} />`) becomes:

  ```ts
  assert.match(source, /<StatusBadge label=\{labels\.status\} status=\{effectiveAuditRoundStatus\(status\)\} \/>/)
  assert.equal(source.match(/<RoundStatusBadges\b/g)?.length, 2, "the phone card and the table")
  ```
- `:108-110` become `ready` / `success` and `pendingReview` / `warning`:

  ```ts
  for (const [label, tone] of [["ready", "success"], ["pendingReview", "warning"]]) {
    assert.match(source, new RegExp(`<StatusBadge label=\\{labels\\.${label}\\} tone="${tone}" \\/>`), label)
  }
  ```

These stay as they are:
- `:103` (now inside the `<details>`);
- `:104-106`, `:111`, `:112` (`RoundWorkflowLinks`' outline sm buttons, which keep the ⋯ links on the phone card);
- `:113`: still 3 (the phone card's number link and the two gap-list links; the next-step links carry other classes);
- `:114-118`.

The hrefs in "audit rounds list exposes per-round workflow shortcuts" (master `:31-33`) go with the old test. The hrefs are now asserted by value in `tests/audit-rounds-list-rules.test.ts`.

These stay unchanged and must still pass:
- `tests/list-pages-ui.test.ts:332-337` (`QuickFilterBar` still opens with `<TabNav\n aria-label={title}`; the sticky actions head and cell with `<RowActions`, and its `menuLabel`), `:342-352`, `:506-513` (the gap lists keep their tables);
- `tests/operational-return-navigation.test.ts:56-59`;
- `tests/e2e-fixes.test.ts:92-95`;
- `tests/html-lang-and-years.test.ts:15` (the summary holds the call);
- `tests/data-bars.test.ts:84-100` (the rule still names `` `AuditProgressBar` `` and stays one paragraph);
- `tests/row-actions-ui.test.ts:44-55` (the part does not change).

- [ ] **Step 4: Run the tests to verify they fail**

Run: `node --test tests/audit-rounds-ux.test.ts tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts`
Expected: FAIL. The coverage is still a ContentPanel at the top, there is no chip, no `RoundNextStep`, no "ขั้นถัดไป" head, and `RowActions` still takes `next={rowActions.next}`.

- [ ] **Step 5: Implement**

`src/app/[locale]/(dashboard)/audit/rounds/page.tsx`:
- **Imports:**
  - Add `FilterChipList`, `PaceBar`, `Nil` and `toneIcons`.
  - Add `formatPercent` to the `@/lib/display-format` import.
  - `effectiveAuditRoundStatus` is already in the `@/lib/audit-round-status` import (Task 1, kept by Task 5). Do not add it again. Keep it, because `RoundStatusBadges` now uses it in place of the two inline StatusBadge calls.
  - Add `buildAuditRoundDueLine`, `buildAuditRoundNextStep`, `buildAuditRoundProgress`, `isAuditRoundAwaitingDecision`, `isAuditRoundWorkView` and the types `AuditRoundDueLine`, `AuditRoundProgress`, `AuditRoundStepKey`, `AuditRoundStepLink` from the rules.
  - Drop `AuditProgressBar`, `ContentPanel` and any icon left unused (lint).
  - Add `const WarningIcon = toneIcons.warning` at module level.
- **Permissions and today** (new here, so no name is unused in Task 5's commit):
  - after `canScan` (`:94`), add `const canClose = hasPermission(user, "audit", "approve")`, commented "the close action's permission (`api/audit-rounds/[id]/route.ts`)";
  - after `const currentYear = bangkokYear(now)`, add `const today = startOfBangkokDay(now)` (import it from `@/lib/waiting-work-rules`).
- **Header:**

  ```tsx
  <PageHeader
    title={t("title")}
    meta={t("roundCount", { count: formatCount(filteredRounds.length) })}
    actions={/* unchanged: the create link for canCreateRound (pin e2e-fixes:95) */}
  />
  ```

  "N รอบ" is the rows the table pages through: the tab, the work view and the search (spec §6; counts equal lists).
- **Strip:**
  - The first cell's `help` becomes `t("actionContinueScanHelp", { count: formatCount(pendingRounds.length) })`.
  - `ActionPanel` and its pins stay. A cell without `href` is plain text, which is spec §6's "grey" at 0 (R8). StatStrip gets no new variant, and `tone` still drives only `attention`.
- **Row model:** one closure in the page body, used by both maps:

  ```ts
  // A row of the list, for the phone card and the table alike (group 2 spec §6).
  const describeRound = (round: (typeof rounds)[number]) => {
    const insight = insightOf(round)
    const detailHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, auditRoundsReturnHref)
    const step = buildAuditRoundNextStep({ locale, roundId: round.id, insight, canScan, canClose, returnTo: auditRoundsReturnHref })
    const more = step.more.map((link) => ({ key: link.key, label: stepLabel(link), href: link.href }))
    return {
      insight,
      detailHref,
      due: buildAuditRoundDueLine(round.status, round.endDate, today),
      progress: buildAuditRoundProgress(insight),
      nextStep: {
        main: step.main ? { label: stepLabel(step.main), href: step.main.href } : null,
        second: step.second ? (step.second.key === "review" ? t("blockedPendingReview", { count: formatCount(step.second.count) }) : t("openActionsCount", { count: formatCount(step.second.count) })) : null,
        outOfScope: step.outOfScope ? { label: stepLabel(step.outOfScope), href: step.outOfScope.href } : null,
      },
      more,
      groups: [{ key: "round", items: [
        ...more.map((link) => ({ kind: "link" as const, key: link.key, label: link.label, href: link.href, icon: roundStepIcons[link.key] })),
        { kind: "link" as const, key: "view", label: tCommon("view"), href: detailHref, icon: <Eye aria-hidden="true" /> },
      ] }] satisfies RowActionGroup[],
    }
  }
  ```

  `stepLabel(link: AuditRoundStepLink): string` is a closure. It puts the count in the label, so the link's name is whole. `const count = formatCount(link.count ?? 0)`, then:
  - `walk` → `t("nextStepContinueScan", { count })`;
  - `pendingList` → `` `${t("roundActionPending")} ${count}` ``;
  - `review` → `t("nextStepReview", { count })`;
  - `actions` → `t("nextStepActions", { count })`;
  - `close` → `t("closeRound")`;
  - `outOfScope` → `` `${t("roundActionOutOfScope")} ${count}` ``.

  `roundStepIcons: Record<AuditRoundStepKey, ReactNode>` replaces `roundWorkflowIcons`:
  - `walk` and `outOfScope`: `ScanLine`;
  - `pendingList`: `ListChecks`;
  - `review` and `actions`: `AlertTriangle`;
  - `close`: `Eye`.

  Both maps start with `const row = describeRound(round)`. `pageRounds.map(` stays exactly 2 (pin `list-pages-ui:345`).
- **Status tabs and chip:**

  ```tsx
  <div className="space-y-3">
    <QuickFilterBar title={t("quickFiltersTitle")} current={activeTab} filters={statusTabs} />
    <FilterChipList chips={workViewChips} label={t("activeFilters")} removeLabel={t("clearFilter")} />
  </div>
  ```

  with

  ```ts
  // A work view from a strip cell (รอตรวจ / รอพิจารณา / ปิดรอบได้) shows as a removable chip under the
  // กำลังดำเนินการ tab; removing it keeps the search (group 2 spec §6).
  const workViewChips = isAuditRoundWorkView(activeView)
    ? [{ key: activeView, label: viewLabels[activeView], href: buildAuditRoundsHref(locale, "open", searchText, { pageSize: listPage.pageSize }) }]
    : []
  ```
- **Table frame:** `<div className={cn(getPanelClasses(), "overflow-hidden")}>`. Its first child is the top bar:

  ```tsx
  {/* The table's top bar (group 2 spec §6): the search. MasterDataSearch's mb-4 is the bar's bottom space. */}
  <div className="border-b border-border-soft px-4 pt-4">
    <MasterDataSearch
      action={`/${locale}/audit/rounds`}
      defaultValue={searchText}
      placeholder={t("searchRounds")}
      submitLabel={tCommon("search")}
      hiddenInputs={{ ...(activeView === "open" ? {} : { view: activeView }), ...Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize })) }}
    />
  </div>
  ```

  After the top bar come the phone cards, the `DataTable` and the `DataTableFoot` with `Pagination`, all unchanged in place.
- **Phone card** (`<article key={round.id} className="min-w-0 rounded-md border border-border bg-background p-3">`, the same class):
  - The top row:
    - the number link stays (the `inline-flex min-h-11 items-center md:min-h-0` link, pin `:113`);
    - the name `<p>` stays;
    - on the right, `<RoundStatusBadges status={round.status} insight={row.insight} labels={badgeLabels(round.status)} />`.
  - `KeyValueList className="mt-3"` items:
    - `{ key: "scope", label: t("scope"), value: <>{formatScope(round, t("all"), scopeLabels)}{" · "}{t("itemCount", { count: formatCount(row.insight.total) })}</> }`;
    - `{ key: "dateRange", label: t("dateRange"), value: <RoundDates start={round.startDate} end={round.endDate} due={row.due} labels={dueLabels} /> }`;
    - `{ key: "progress", label: t("progress"), value: <RoundProgress progress={row.progress} text={progressText(row.insight, row.progress)} barLabel={progressBarText(row.insight)} notStarted={t("notStarted")} /> }`.
  - Then `<div className="mt-3"><RoundNextStep {...row.nextStep} /></div>`, `<RoundWorkflowLinks links={row.more} />` and the full-width "ดู" link (unchanged).
  - The phone card has no ⋯. Its extra links are the outline sm buttons, as today.
- **Desktop table:**
  - Heads, in order:
    - `<DataTableHead>{t("round")}</DataTableHead>`;
    - `{t("scope")}`, `{t("dateRange")}`, `{t("progress")}`, `{t("status")}`, `{t("nextStep")}`;
    - `<DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>`.
  - Both `TableEmptyRow`s take `colSpan={7}` (the search one keeps "ล้างคำค้น").
  - The row (`ClickableTableRow` unchanged, `href={row.detailHref}`):

  ```tsx
  <DataTableCell className="min-w-56">
    <Link href={row.detailHref} className={cn(linkVariants({ size: "inherit" }), "font-semibold")}>{round.name}</Link>
    <div className="mt-0.5 text-meta text-muted-foreground"><span className="tag">{round.auditNo}</span></div>
  </DataTableCell>
  <DataTableCell className="min-w-64 text-muted-foreground">
    {formatScope(round, t("all"), scopeLabels)}{" · "}{t("itemCount", { count: formatCount(row.insight.total) })}
  </DataTableCell>
  <DataTableCell className="text-muted-foreground"><RoundDates start={round.startDate} end={round.endDate} due={row.due} labels={dueLabels} /></DataTableCell>
  <DataTableCell className="min-w-44"><RoundProgress progress={row.progress} text={progressText(row.insight, row.progress)} barLabel={progressBarText(row.insight)} notStarted={t("notStarted")} /></DataTableCell>
  <DataTableCell className="whitespace-nowrap"><RoundStatusBadges status={round.status} insight={row.insight} labels={badgeLabels(round.status)} /></DataTableCell>
  <DataTableCell className="min-w-44">
    <RoundNextStep {...row.nextStep} />
  </DataTableCell>
  <DataTableCell align="right" sticky="right">
    <RowActions
      code={round.auditNo}
      name={round.name}
      menuLabel={tCommon("moreActionsFor", { code: round.auditNo })}
      next={undefined}
      groups={row.groups}
    />
  </DataTableCell>
  ```

  `next={undefined}` leaves no 120px slot. The row's work is in ขั้นถัดไป, and ⋯ keeps the rest and "ดู" (§13 bug 1). `RowActions` is not changed, so the register keeps its width.
- **Closures for the labels:**
  - `badgeLabels(status)` returns `{ status: getAuditRoundStatusLabel(status, t), pendingReview: t("pendingReview"), ready: t("readyToClose") }`.
  - `dueLabels` is `{ left: (days: number) => t("daysLeft", { days: formatCount(days) }), overdue: (days: number) => t("daysOverdue", { days: formatCount(days) }) }`.
  - `progressText(insight, progress)` returns `t("progressLine", { checked: formatCount(insight.checked), total: formatCount(insight.total), percent: formatPercent(progress.percent / 100) })`.
  - `progressBarText(insight)` returns `t("progressBarLabel", { checked: formatCount(insight.checked), total: formatCount(insight.total) })`.
- **Local parts** (module level, server-safe; the names avoid the LN2 guard's shared names):

  ```tsx
  // One status badge (group 2 spec §6, §14): a leftover draft reads เปิดตรวจ; a fully scanned round with decisions
  // pending reads รอพิจารณา (computed, never stored); พร้อมปิดรอบ stays as a second badge.
  function RoundStatusBadges({ status, insight, labels }: { status: string; insight: AuditRoundListInsight; labels: { status: string; pendingReview: string; ready: string } }) {
    return (
      <div className="flex flex-col items-start gap-1">
        {isAuditRoundAwaitingDecision(insight) ? (
          <StatusBadge label={labels.pendingReview} tone="warning" />
        ) : (
          <StatusBadge label={labels.status} status={effectiveAuditRoundStatus(status)} />
        )}
        {insight.readyToClose ? <StatusBadge label={labels.ready} tone="success" /> : null}
      </div>
    )
  }

  // The dates, then days left (warning) or overdue (danger) on an open round, drawn with the page (group 2 spec §6).
  function RoundDates({ start, end, due, labels }: { start: Date; end: Date; due: AuditRoundDueLine; labels: { left: (days: number) => string; overdue: (days: number) => string } }) {
    return (
      <>
        <span className="block whitespace-nowrap">{formatDate(start)} - {formatDate(end)}</span>
        {due ? <span className={cn("block text-meta", due.kind === "overdue" ? "text-danger" : "text-warning")}>{due.kind === "overdue" ? labels.overdue(due.days) : labels.left(due.days)}</span> : null}
      </>
    )
  }

  // Progress (group 2 spec §6): a PaceBar of the round's own items with "x / y · z%", or ยังไม่เริ่ม. No pace mark on
  // the list, so the bar is never "behind" without the words DESIGN.md asks for.
  function RoundProgress({ progress, text, barLabel, notStarted }: { progress: AuditRoundProgress; text: string; barLabel: string; notStarted: string }) {
    if (!progress.started) return <span className="text-muted-foreground">{notStarted}</span>
    return (
      <span className="block min-w-40 space-y-1">
        <PaceBar value={progress.value} pace={null} label={barLabel} behind={false} />
        <span className="block text-meta num text-muted-foreground">{text}</span>
      </span>
    )
  }

  // ขั้นถัดไป (group 2 spec §6, §13 bug 1): the main task as a link on line 1, wrapping, never cut; line 2 the second
  // task in warning text with its icon (its link is in ⋯) and the out-of-scope link. Nothing to do: Nil.
  function RoundNextStep({ main, second, outOfScope }: { main: { label: string; href: string } | null; second: string | null; outOfScope: { label: string; href: string } | null }) {
    if (!main && !second && !outOfScope) return <Nil />
    return (
      <div className="min-w-0 space-y-1">
        {main ? <Link href={main.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-start font-medium md:min-h-0")}>{main.label}</Link> : null}
        {second || outOfScope ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
            {second ? (
              <span className="inline-flex items-center gap-1 text-warning">
                <WarningIcon aria-hidden="true" className="size-3.5 shrink-0" />
                {second}
              </span>
            ) : null}
            {outOfScope ? <Link href={outOfScope.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")}>{outOfScope.label}</Link> : null}
          </p>
        ) : null}
      </div>
    )
  }
  ```

  The second task is text, as §6 says. Its link sits in ⋯ (desktop) or among the outline buttons (phone). Every count is its list's count (Task 5 rules).
- **`RoundWorkflowLinks`:**
  - It takes `links: Array<{ key: AuditRoundStepKey; label: string; href: string }>`.
  - Each button is `buttonVariants({ variant: "outline", size: "sm" })` (pin `:112`) with `{roundStepIcons[link.key]}` and `<span>{link.label}</span>`.
  - The label already holds the count.
  - Its comment (master `:620`) becomes `// The phone card's extra next-step links (row.more, outline sm buttons). On desktop the same links sit in the row's ⋯ (RowActions groups).` No deleted helper's name may stay in a comment: the Task 6 test (`assert.doesNotMatch(page, /AuditProgressBar|buildRoundRowActions|.../)`) reads comments too.
- **Deleted:** `ReadyToCloseBadge`, `buildAuditRoundWorkflowLinks`, `roundWorkflowIcons`, `buildRoundRowActions` and the `RoundWorkflowLink` type.
- **Coverage** (last on the page; the top `ContentPanel` goes):

  ```tsx
  {/* A <details> cannot be ContentPanel: the panel classes (2D-2 R4). Folded to one line (group 2 spec §6). */}
  <details className={cn(getPanelClasses(), "p-4 sm:p-5")}>
    <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 md:min-h-0">
      <h2 className="text-base font-semibold text-foreground">{t("coverageTitle", { year: toDisplayYear(currentYear, locale) })}</h2>
      <span className="block w-full sm:w-48"><PaceBar value={coverageShare} pace={null} label={coverageLine} behind={false} /></span>
      <span className="num text-sm font-semibold text-foreground">{formatPercent(coverageShare)}</span>
      <span className="num text-sm text-muted-foreground">{coverageLine}</span>
      <span className={cn(linkVariants({ size: "inherit" }), "text-sm sm:ms-auto")}>{t("coverageBreakdown")}</span>
    </summary>
    <div className="mt-4 space-y-4 border-t border-border-soft pt-4">
      <p className="text-sm text-muted-foreground">{t("coverageHelp")}</p>
      <p className="text-sm text-muted-foreground">
        {t("coverageRoundCount")}: <span className="num font-semibold text-foreground">{formatCount(currentYearRoundCount)}</span>
      </p>
      <StatStrip
        items={[
          { key: "activeAssets", label: t("coverageActiveAssets"), value: formatCount(activeAssets.length) },
          { key: "covered", label: t("coverageCoveredThisYear"), value: formatCount(coveredAssetCount) },
          { key: "uncovered", label: t("coverageUncoveredThisYear"), value: formatCount(uncoveredAssetCount) },
          { key: "openPendingItems", label: t("coverageOpenPendingItems"), value: formatCount(openWork.pending), foot: t("coverageOpenChecked", { count: formatCount(openWork.checked) }) },
          { key: "openPendingReview", label: t("coverageOpenPendingReview"), value: formatCount(openWork.pendingReview) },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">{/* the two CoverageGapList, unchanged */}</div>
    </div>
  </details>
  ```

  with

  ```ts
  const coverageShare = activeAssets.length > 0 ? coveredAssetCount / activeAssets.length : 0
  const coverageLine = t("coverageLine", { covered: formatCount(coveredAssetCount), total: formatCount(activeAssets.length), missing: formatCount(uncoveredAssetCount) })
  ```

  The summary holds only phrasing content and a heading: `PaceBar` is spans, and there is no link inside. The year shows on this line only (§6 Header). "ตรวจแล้ว" from the old breakdown survives as the foot of the รอตรวจ cell.
- **Order of the root `<div className="space-y-6">`:** `PageHeader`, `ActionPanel`, the tabs block, the table frame, the coverage `<details>`.

`DESIGN.md:294`: the rule's last sentence becomes the two sentences below, in the same paragraph (no blank line):

> `AuditProgressBar` (the round page, until group 2 plan 2) and the audit scan header's bar are older progress bars; they keep their own markup until their page group moves them onto `PaceBar`. The rounds list draws each round's progress and the year's coverage with `PaceBar` (group 2 plan 1).

E2E: nothing changes in this task. Task 7 writes the rounds-list steps against the markup in **Interfaces → Produces**. The viewer's visit in `roles.spec.ts:36-51` still meets no scan href (Task 5's builder takes `canScan`), and the `<details>` and the new links have names for axe.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/audit-rounds-ux.test.ts tests/audit-rounds-list-rules.test.ts tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/e2e-fixes.test.ts tests/html-lang-and-years.test.ts tests/performance-route-instrumentation.test.ts tests/audit-round-cancellation.test.ts tests/data-bars.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS, and `tsc` is clean.

Then run `npm test` and `npm run lint`. Expected: both pass. If a pin outside this list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/rounds/page.tsx" DESIGN.md messages/th.json messages/en.json tests/audit-rounds-ux.test.ts tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts
git commit -m "feat(audit-rounds): the rounds list in the spec's order, status tabs with the work view's chip, the search in the table's bar, รอบ / ขอบเขต / ช่วงวันที่ / ความคืบหน้า / สถานะ / ขั้นถัดไป with a wrapping next step and ⋯ only, and the coverage folded to one line (group 2 plan 1 task 6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: E2E steps and the plan's docs

The audit E2E steps move to the new form and list. The form has no status, a condition chip, a live count and "สร้างรอบ". The round reads "เปิดตรวจ" at once, and a closed round reads "ปิดรอบแล้ว". The rounds list gets its own spec (spec §16): the tabs follow the search, a work view shows as a chip from a strip cell, the next step is whole and goes to the right page for each role, and a cancelled round moves to ยกเลิก. The field errors test uses the new form and cancels its round, so a run no longer leaves a round behind. The docs record the plan, and the deploy-day note says to cancel `AUD-2026-0002 "Test"` in Production through the app.

**Files:**
- Create:
  - `e2e/audit/rounds-words.ts` (plain data, no imports: the words the steps read)
  - `e2e/audit/round-steps.ts` (helpers for the form and the list)
  - `e2e/audit/rounds-list.spec.ts`
  - `tests/e2e-audit-rounds.test.ts`
- Modify (line numbers are master `28abba7b`; Tasks 1-6 do not touch these files except where noted, so re-check before editing):
  - `e2e/audit/field-audit.spec.ts:4-5` (header item 1), `:23` (one import after it), `:62-111` (the open block from the visit to the describe's closing `})`), `:398-415` (the IT head's own round: a client status the route ignores, then a GET)
  - `e2e/cross-cutting/field-errors.spec.ts:4-10` (imports), `:296-321` (the audit round test)
  - `tests/e2e-audit.test.ts:76` (kept; new lines after it)
  - Not here: `e2e/audit/field-audit.spec.ts:385` ("ปิดรอบแล้ว") and its EA4 pin in `tests/e2e-audit.test.ts` (after `:186`) are Task 1's; this task leaves them.
  - `tests/e2e-cross-cutting.test.ts:259` (new lines after it, inside EM3)
  - `docs/99_CHANGELOG.md:7-9` (new entry, newest first)
  - `docs/07_UAT_CHECKLIST.md:109-110`, `:159` (rewritten) and a new `## Audit Rounds B UAT (…)` section between `:377` and `## Sign-Off` (`:379`)
  - `docs/06_WORKFLOWS.md:64-65`, `:68` (rewritten), one line after `:68`
  - `DEVELOPER_HANDOFF.md:57` (rewritten), one bullet after `:1199`
  - `docs/08_PRODUCTION_READINESS.md:102` (one line after it, under `## Deployment`)
  - `docs/11_FEATURE_LIST.md:181`, `:182`, `:184`
  - `docs/audits/2026-10-07-full-review.md:31` (finding E6's status cell)
- Unchanged and still passing:
  - `tests/e2e-audit.test.ts:76`: the open block still holds `createTitle` ("สร้างรอบตรวจนับ", the h1) and `statusOpen` ("เปิดตรวจ", now the badge check after the save).
  - `tests/e2e-audit.test.ts:64` (the `selectOptions` regex on `e2e/audit/audit-data.ts`) belongs to Task 4, which decides how `readAuditMasters` reads the master ids. This task calls `readAuditMasters(page)` as it is.
  - `tests/e2e-cross-cutting.test.ts:213-214` (`forms.ts` `save` still clicks "บันทึก" for the other forms), `:225`, `:242` (`audit-round-name`, `audit-round-start-date` stay in the form), `:249` (Task 4 keeps ``router.push(`/${locale}/audit/rounds/${payload.id}`)``), `:257-259` (scope where).
  - `tests/e2e-transactions.test.ts:128`: `field-errors.spec.ts` still holds 4 `toContainText(asset.assetTag, ${arrival})`; the audit test never used one.
  - `tests/e2e-fixes.test.ts:39, :63, :109, :111, :185-187, :350-356, :390-400` (other tests of `field-errors.spec.ts`), `:72, :243, :277-279, :360, :376-378` (other blocks of `field-audit.spec.ts`).
  - `tests/e2e-suite.test.ts:315-325` (no spec imports `@playwright/test`; the new spec is not under `e2e/smoke`), `tests/e2e-review.test.ts:20-128` (no hazard, no DELETE: the round is cancelled with a PATCH), the docs pins `tests/e2e-docs.test.ts`, `tests/shell-docs.test.ts`, `tests/v-track-docs.test.ts`, `tests/dark-mode-docs.test.ts`, `tests/phase2d-docs.test.ts`, `tests/audit-round-cancellation.test.ts:144-157` (each file still names the cancel and that prior work is preserved; no template marker such as `<N>` or `<today>` is written).
  - `e2e/cross-cutting/roles.spec.ts:36-51`: the viewer's visit to `/th/audit/rounds` (READ_ONLY_LISTS) now meets the new list; Task 5 gives a viewer no scan href, so it passes as it is.
  - The API creators `e2e/dashboard/dashboard.spec.ts:103`, `e2e/asset-detail/asset-detail.spec.ts:292`, `e2e/disposal/open-audit-block.spec.ts:44` still send `status: "open"`. The create schema strips it (Task 3, non-strict), so they pass unchanged.
- No message changes. Every word the steps read is a value Tasks 1-6 put in `messages/th.json`; the guard test checks each one.

**Interfaces:**
- Consumes (the markup and words of Tasks 1-6, as the skeleton names them):
  - Task 1: `auditRound.statusOpen` "เปิดตรวจ" on every open or draft round; `auditRound.statusClosed` "ปิดรอบแล้ว" on the round page's badge; `auditRound.statusDraft` deleted, so no `auditRound` value holds "ร่าง".
  - Task 3: `POST /api/audit-rounds` strips a client `status` (no `.strict()`, no `z.literal("open")`) and creates `open`; `GET /api/audit-rounds/[id]` returns the round's scalar `status`.
  - Task 4 (the form), the contract this task's helpers stand on:
    - the h1 stays `auditRound.createTitle` "สร้างรอบตรวจนับ";
    - no element with id `audit-round-status`;
    - the add button is a `Button` whose name contains "เพิ่มเงื่อนไข" (th value "เพิ่มเงื่อนไข", the "+" is a `Plus` icon with `aria-hidden`); it opens a `DropdownMenu` whose `menuitem`s are named by the `scope*` words ("แผนก", "ที่ตั้ง", "สถานะทรัพย์สิน", …);
    - after a menu item, the condition's value picker has the id `audit-round-scope-<field>` (`department`, `location`, `status`, …). It is a `SearchableSelect` (its popover holds a `combobox` and `option`s) or a native select. It may open by itself (`aria-expanded="true"`) or wait for a click; the helper handles both;
    - a chosen condition shows as a removable chip `Button` whose name contains "<condition word>: <option label>", option labels keep their codes ("<code> - <name>");
    - the footer status reads "จะสร้างรอบ {count} รายการ" (`formatCount`), and the submit `Button` is named "สร้างรอบ";
    - "ดูตัวอย่างรายการ" opens the eight-row sample inline in the summary panel inside `<main>` (a `<details>` summary or a toggle `Button`), not a dialog;
    - `readAuditMasters(page): Promise<AuditMasterIds>` keeps its signature (`e2e/audit/audit-data.ts`), whatever source Task 4 gives it;
    - the save still toasts `createSuccess` and goes to `/${locale}/audit/rounds/${id}`.
  - Task 5 (list data):
    - tab URL values `open` (default), `closed`, `cancelled`, `all` (`?view=all` written out);
    - tab counts and the header's "N รอบ" follow the search; the search matches `auditNo`;
    - the row's next step "เดินตรวจต่อ ({count})" links `/${locale}/audit/rounds/${id}/scan` (plus `returnTo`) for `audit:edit`, else `/${locale}/audit/rounds/${id}/pending` (plus `returnTo`);
    - the strip cell "เดินตรวจต่อ" links a scan page for `audit:edit`. For anyone else it links the work view `?view=pending`, as today (`page.tsx:234`; pins `tests/e2e-fixes.test.ts:94`, `tests/operational-return-navigation.test.ts:58`).
  - Task 6 (list UI):
    - the status tabs are the first `[data-slot="tab-nav"]` in `<main>`, in the order กำลังดำเนินการ / ปิดแล้ว / ยกเลิก / ทั้งหมด, each with its count (0 shown);
    - the work view's chip is a `FilterChipList` with `label={t("activeFilters")}` and `removeLabel={t("clearFilter")}`, so its link is named "ล้างตัวกรองนี้: รอตรวจ". Its href drops `view` and keeps `search`. Under a work view, the กำลังดำเนินการ tab is current;
    - the header meta (`[data-slot="page-header-meta"]`) reads "{count} รอบ";
    - the desktop row is a `tbody tr` and the phone card an `<article>`. **Both** carry the one status badge and the next-step link "เดินตรวจต่อ ({count})". The desktop row also has "ยังไม่เริ่ม" for a round with nothing checked and "เหลือ {days} วัน" for an open round;
    - with a search and no rows, the desktop table shows the link "ล้างคำค้น".
  - Existing helpers: `createRoom`, `createAssets`, `readAssetChoices`, `recordPrefix`, `actAs` (`e2e/disposal/disposal-support.ts`); `bangkokDate` (`e2e/transactions/tx-plan.ts`); `fillTemplate`, `templatePattern` (`e2e/shell/shell-words.ts`); `authStateFile`, `fromRoot` (`e2e/support/paths.ts`); `readRunState` (`e2e/support/state.ts`); `runRecords` (`e2e/support/run-plan.ts`); `createAsset`, `projectMarker`, `readAssetChoices` (`e2e/cross-cutting/support/records.ts`); `expectFieldError`, `expectNoFieldError` (`e2e/cross-cutting/support/ui.ts`); `recordSettled` (`e2e/audit/settle.ts`).
- Produces:
  - `e2e/audit/rounds-words.ts`: `ROUNDS_WORDS` (below).
  - `e2e/audit/round-steps.ts`:
    - `type ScopeCondition = "แผนก" | "ที่ตั้ง" | "สถานะทรัพย์สิน"`;
    - `addCondition(page: Page, condition: ScopeCondition, search: string, option: string): Promise<void>` (it waits for the live count its own change starts);
    - `waitForFirstCount(page: Page): Promise<void>`;
    - `createButton(page: Page): Locator`;
    - `willCreate(page: Page, count?: number): Locator`;
    - `readWillCreate(page: Page): Promise<number>`;
    - `showSample(page: Page): Promise<void>`;
    - `cancelAsItHead(api: APIRequest, baseURL: string | undefined, roundId: string, reason: string): Promise<void>`;
    - `roundEntry(page: Page, device: E2eDevice, auditNo: string): Locator`;
    - `tab(page: Page, label: string): Locator`;
    - `expectTabs(page: Page, current: string, counts: Record<string, number>): Promise<void>`;
    - `workViewChip(page: Page, view: string): Locator`;
    - `expectWhole(link: Locator): Promise<void>`.

- [ ] **Step 1: Write the words file, the guard test and the new pins, so they fail**

`e2e/audit/rounds-words.ts`:

```ts
// The words the rounds list and the round form steps read (group 2 spec §6, §7, §14), each a value of
// messages/th.json (tests/e2e-audit-rounds.test.ts checks them). Plain data, no imports, so the node test can load it.
export const ROUNDS_WORDS = {
  listTitle: "รอบตรวจนับ",
  createTitle: "สร้างรอบตรวจนับ",
  tabOpen: "กำลังดำเนินการ",
  tabClosed: "ปิดแล้ว",
  tabCancelled: "ยกเลิก",
  tabAll: "ทั้งหมด",
  roundCount: "{count} รอบ",
  statusOpen: "เปิดตรวจ",
  statusClosed: "ปิดรอบแล้ว",
  statusCancelled: "ยกเลิก",
  notStarted: "ยังไม่เริ่ม",
  daysLeft: "เหลือ {days} วัน",
  // The strip cell, then the row's next step.
  continueScan: "เดินตรวจต่อ",
  continueScanRow: "เดินตรวจต่อ ({count})",
  viewPending: "รอตรวจ",
  activeFilters: "ตัวกรองที่ใช้อยู่",
  clearFilter: "ล้างตัวกรองนี้",
  clearSearch: "ล้างคำค้น",
  // The form.
  counting: "กำลังนับรายการ…",
  addCondition: "เพิ่มเงื่อนไข",
  createRound: "สร้างรอบ",
  willCreate: "จะสร้างรอบ {count} รายการ",
  showSample: "ดูตัวอย่างรายการ",
  scopeDepartment: "แผนก",
  scopeLocation: "ที่ตั้ง",
  scopeStatus: "สถานะทรัพย์สิน",
} as const
```

`tests/e2e-audit-rounds.test.ts`:

```ts
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
```

`tests/e2e-audit.test.ts`, after `:76` (inside EA1):

```ts
  // Group 2 plan 1 (spec §7, §14, §16): no status choice, the department as a condition chip, the live count is the
  // round's items, and the round opens at once.
  assert.ok(open.includes(`await expect(page.locator("#audit-round-status")).toHaveCount(0)`))
  assert.ok(!open.includes(".selectOption(") && !open.includes(`{ name: "ดูตัวอย่าง" }`), "no status or scope select, no preview button")
  assert.ok(open.includes("const save = rounds.createButton(page)"))
  assert.ok(open.includes("await rounds.addCondition(page, \"แผนก\", records.department.code, `${records.department.code} - ${records.department.name}`)"))
  assert.ok(open.includes("await expect(rounds.willCreate(page, inRound.length)).toBeVisible()"))
  assert.ok(open.includes("const liveCount = await rounds.readWillCreate(page)"))
  assert.ok(open.includes(`expect(round.generatedItems, "the live count is the round's items (group 2 spec §16)").toBe(liveCount)`))
  assert.ok(open.includes(`expect(saved.status, "open at once, never a draft (group 2 spec §14)").toBe("open")`))
```

`tests/e2e-cross-cutting.test.ts`, after `:259` (inside EM3, before the fixtures check):

```ts
  // The audit round (group 2 plan 1 task 7): its conditions as chips, its own "สร้างรอบ", the live count instead of
  // "ดูตัวอย่าง", and the round cancelled by the IT head whatever happens (each run used to leave one behind).
  const auditRound = spec.slice(spec.indexOf(`test("audit round: `))
  assert.ok(auditRound.includes(`await addCondition(page, "ที่ตั้ง", location.code, `) && auditRound.includes(`await addCondition(page, "สถานะทรัพย์สิน", "ร่าง", "ร่าง")`))
  assert.ok(auditRound.includes("await createButton(page).click()") && !auditRound.includes("await save(page)"))
  assert.ok(auditRound.includes("await expect(willCreate(page)).toBeVisible()") && !auditRound.includes(`{ name: "ดูตัวอย่าง" }`))
  assert.match(auditRound, /\} finally \{\n\s+if \(saved\.id\) await cancelAsItHead\(playwright\.request, baseURL, saved\.id, /)
```

("ร่าง" here is the asset status Draft's Thai name, which is data, not the round's status.)

- [ ] **Step 2: Run the guard tests to see them fail**

Run: `node --test tests/e2e-audit.test.ts tests/e2e-audit-rounds.test.ts tests/e2e-cross-cutting.test.ts`
Expected: FAIL. `e2e/audit/round-steps.ts` and `e2e/audit/rounds-list.spec.ts` do not exist, the open block still selects a status, and the field errors test still clicks "ดูตัวอย่าง". The words test passes once Tasks 1-6 have landed.

- [ ] **Step 3: Write the helpers**

`e2e/audit/round-steps.ts`. The bodies are given where the tests do not decide them:

```ts
// The steps on the audit round form and the rounds list (group 2 spec §6, §7, §16), shared by the field audit walk,
// the rounds list spec and the cross-cutting field errors: a scope condition added as a chip, the live count, the
// sample, a round cancelled by the IT head, a round's row or card, the status tabs, the work view's chip, and a link
// shown whole.
import type { APIRequest, Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { authStateFile, fromRoot } from "../support/paths.ts"
import { readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { ROUNDS_WORDS } from "./rounds-words.ts"

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Each condition's value picker (Task 4): a SearchableSelect, or a native select, with this id.
const SCOPE_PICKER_IDS = {
  "แผนก": "audit-round-scope-department",
  "ที่ตั้ง": "audit-round-scope-location",
  "สถานะทรัพย์สิน": "audit-round-scope-status",
} as const
export type ScopeCondition = keyof typeof SCOPE_PICKER_IDS

// "+ เพิ่มเงื่อนไข", the condition's menu item, then its value. The picker may open by itself; the chip then names
// the condition and the option ("แผนก: <code> - <name>").
export async function addCondition(page: Page, condition: ScopeCondition, search: string, option: string) {
  await page.getByRole("button", { name: ROUNDS_WORDS.addCondition }).click()
  await page.getByRole("menuitem", { name: condition, exact: true }).click()
  const picker = page.locator(`#${SCOPE_PICKER_IDS[condition]}`)
  // Its own live count (Task 4: 450ms after the change). The next change would abort a count still running, and the measurement fails on a cancelled request.
  const counted = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/audit-rounds/preview")
  if (await picker.evaluate((node) => node instanceof HTMLSelectElement)) {
    await picker.selectOption({ label: option })
  } else {
    if ((await picker.getAttribute("aria-expanded")) !== "true") await picker.click()
    await page.getByRole("dialog").getByRole("combobox").fill(search)
    await page.getByRole("option", { name: option, exact: true }).click()
  }
  await expect(page.getByRole("button", { name: new RegExp(escape(`${condition}: ${option}`)) })).toBeVisible()
  expect((await counted).status(), `the live count with ${condition}`).toBe(200)
}

// The first count, over the whole register (Task 4), done before any condition changes the scope: the panel and the bar
// leave "กำลังนับรายการ…". Not a bare getByRole("status"): the shell renders role=status too (shell-banner, shell-notifications).
export async function waitForFirstCount(page: Page) {
  await expect(page.getByRole("main").getByText(ROUNDS_WORDS.counting, { exact: true })).toHaveCount(0)
}

// The footer's submit "สร้างรอบ" (spec §7).
export function createButton(page: Page): Locator {
  return page.getByRole("button", { name: ROUNDS_WORDS.createRound, exact: true })
}

// The footer's "จะสร้างรอบ N รายการ": that count, or any count of at least 1.
export function willCreate(page: Page, count?: number): Locator {
  const text = count === undefined
    ? new RegExp(`^${templatePattern(ROUNDS_WORDS.willCreate, { count: "[1-9][\\d,]*" }).source}$`)
    : fillTemplate(ROUNDS_WORDS.willCreate, { count: count.toLocaleString("en-US") })
  return page.getByText(text, { exact: true }).filter({ visible: true })
}

export async function readWillCreate(page: Page): Promise<number> {
  return Number(((await willCreate(page).first().textContent()) ?? "").replace(/\D/g, ""))
}

// "ดูตัวอย่างรายการ": the eight-row sample, inline in the summary panel.
export async function showSample(page: Page) {
  await page.getByText(ROUNDS_WORDS.showSample, { exact: true }).click()
}

// The test's own round, cancelled by the IT head (audit:approve) through the round route, from the run's saved session.
export async function cancelAsItHead(api: APIRequest, baseURL: string | undefined, roundId: string, reason: string) {
  const itHead = await api.newContext({ baseURL, storageState: fromRoot(authStateFile(readRunState().runId, "itHead")) })
  try {
    const cancelled = await itHead.patch(`/api/audit-rounds/${roundId}`, { data: { action: "cancel", reason } })
    expect(cancelled.status(), await cancelled.text()).toBe(200)
  } finally {
    await itHead.dispose()
  }
}

// The round's row in the desktop table, or its card in the phone list (the other one is hidden at that width).
export function roundEntry(page: Page, device: E2eDevice, auditNo: string): Locator {
  return page.getByRole("main").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: auditNo })
}

// One status tab: its label, then its count.
export function tab(page: Page, label: string): Locator {
  return page.getByRole("main").locator('[data-slot="tab-nav"]').first().getByRole("link", { name: new RegExp(`^${escape(label)}\\s*[\\d,]*$`) })
}

// Exactly these tabs in this order, each with its count, and the current one marked.
export async function expectTabs(page: Page, current: string, counts: Record<string, number>) {
  const links = page.getByRole("main").locator('[data-slot="tab-nav"]').first().getByRole("link")
  await expect(links).toHaveText(Object.entries(counts).map(([label, count]) => new RegExp(`^${escape(label)}\\s*${count}$`)))
  await expect(tab(page, current)).toHaveAttribute("aria-current", "page")
}

// A work view's removable chip ("ล้างตัวกรองนี้: รอตรวจ").
export function workViewChip(page: Page, view: string): Locator {
  return page.getByRole("group", { name: ROUNDS_WORDS.activeFilters }).getByRole("link", { name: `${ROUNDS_WORDS.clearFilter}: ${view}`, exact: true })
}

// Not cut (spec §13 bug 1): no box inside the link is narrower than its text.
export async function expectWhole(link: Locator) {
  await expect(link).toBeVisible()
  const clipped = await link.evaluate((node) =>
    [node, ...node.querySelectorAll("*")]
      .filter((element) => getComputedStyle(element).display !== "inline" && element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.outerHTML.slice(0, 120)),
  )
  expect(clipped, "the next step shows its whole text").toEqual([])
}
```

- [ ] **Step 4: Rewrite the field audit's open block and the IT head's own round**

`e2e/audit/field-audit.spec.ts`:
- `:4-5` becomes:

```ts
// 1. IT staff open the round of the project's department on the round form, after it shows its errors under the
//    fields (spec §6.2.1, §6.7): no status choice, the department as a condition chip, the live count equal to the
//    round's items, the round open at once (group 2 spec §7, §14, §16);
```

- After `:23` add `import * as rounds from "./round-steps.ts"`.
- `:62-111` become (from the visit to the end of the describe block, the test's `  })` at `:110` and the describe's `})` at `:111` included; `:53-61` stay):

```ts
    await measure.visit("/th/audit/rounds/new", "round form")
    await expect(page.getByRole("heading", { level: 1, name: "สร้างรอบตรวจนับ" })).toBeVisible()
    // Group 2 spec §7, §14: the form offers no status; every round opens at once.
    await expect(page.locator("#audit-round-status")).toHaveCount(0)
    const masters = await readAuditMasters(page)
    const walk = await measure.timed("the walk's assets and components (IT staff)", () => createAuditAssets(page, run, places, masters))

    const save = rounds.createButton(page)
    const name = page.locator("#audit-round-name")
    // Spec §6.7: an empty required field first; the error shows under it and focus goes there.
    await save.click()
    await expect(page.locator("#audit-round-name-error")).toHaveText("กรุณาระบุข้อมูลนี้")
    await expect(name).toBeFocused()
    await expect(name).toHaveAttribute("aria-invalid", "true")
    await name.fill(records.round.name)
    await expect(page.locator("#audit-round-name-error")).toHaveCount(0)
    // Then the date pair reversed.
    await page.locator("#audit-round-start-date").fill(bangkokDate())
    await page.locator("#audit-round-end-date").fill(bangkokDate(-1))
    await save.click()
    await expect(page.locator("#audit-round-end-date-error")).toHaveText("วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น")
    await expect(page.locator("#audit-round-end-date")).toBeFocused()
    await page.locator("#audit-round-end-date").fill(bangkokDate(30))
    await expect(page.locator("#audit-round-end-date-error")).toHaveCount(0)

    // Scoped to the project's department by its condition chip: the live count settles on the department's assets (no
    // "ดูตัวอย่าง" button), and the sample lists each of them and not the outsider.
    const inRound = records.assets.filter((asset) => asset.department === "round")
    await rounds.waitForFirstCount(page)
    await rounds.addCondition(page, "แผนก", records.department.code, `${records.department.code} - ${records.department.name}`)
    await expect(rounds.willCreate(page, inRound.length)).toBeVisible()
    const liveCount = await rounds.readWillCreate(page)
    await rounds.showSample(page)
    await recordSettled(page, measure, "round form with its live count and sample")
    for (const asset of inRound) await expect(page.getByRole("main").getByText(asset.tag, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole("main").getByText(walk.assets.outOfScope.tag, { exact: true })).toHaveCount(0)

    const created = page.waitForResponse((response) => response.url().endsWith("/api/audit-rounds") && response.request().method() === "POST")
    const round = await measure.timed("save the round", async () => {
      await save.click()
      const response = await created
      expect(response.status(), "the round is saved").toBe(201)
      await page.waitForURL(/\/th\/audit\/rounds\/[0-9a-f-]{36}$/)
      return (await response.json()) as { id: string; auditNo: string; generatedItems: number }
    })
    expect(round.generatedItems, "one item per asset of the department, the components included").toBe(inRound.length)
    expect(round.generatedItems, "the live count is the round's items (group 2 spec §16)").toBe(liveCount)
    await expect(page.getByText(`สร้างรอบตรวจนับสำเร็จ และสร้างรายการตรวจ ${inRound.length} รายการ`)).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/th/audit/rounds/${round.id}$`))
    await expect(page.getByRole("heading", { level: 1, name: records.round.name })).toBeVisible()
    // Open at once (group 2 spec §14): the badge reads เปิดตรวจ and the route says open.
    await expect(page.getByRole("main").getByText("เปิดตรวจ", { exact: true }).first()).toBeVisible()
    const saved = (await (await page.request.get(`/api/audit-rounds/${round.id}`)).json()) as { status: string }
    expect(saved.status, "open at once, never a draft (group 2 spec §14)").toBe("open")
    await recordSettled(page, measure, "round page after the save")
    saveChain(project, { ...walk, roundId: round.id, auditNo: round.auditNo })
    expect(readChain(project).roundId, "the chain's state is saved for the next blocks").toBe(round.id)
  })
})
```

- `:385` and its EA4 pin are Task 1's; leave them.
- `:398` (comment) becomes `    // A round of room B that the IT head opens themselves, through the round route with the body the form sends and a`, plus a new line `    // status the route ignores (group 2 spec §7: the create API always opens the round).`
- `:410` `status: "open",` becomes `status: "draft",`.
- After `:415` add:

```ts
    const ownSaved = (await (await page.request.get(`/api/audit-rounds/${own.id}`)).json()) as { status: string }
    expect(ownSaved.status, "a client's status is ignored: the round opens").toBe("open")
```

- [ ] **Step 5: Rewrite the field errors' audit round test**

`e2e/cross-cutting/field-errors.spec.ts`:
- Imports (`:4-10`): `readRunData` stays (other tests use it). Change `import { readRunData } from "../support/state.ts"` to `import { readRunData, readRunState } from "../support/state.ts"`, and add:

```ts
import { runRecords } from "../support/run-plan.ts"
// The round form's steps (group 2 spec §7): its conditions as chips, its own submit, the live count and the sample.
import { addCondition, cancelAsItHead, createButton, showSample, waitForFirstCount, willCreate } from "../audit/round-steps.ts"
```

- `:296-321` become:

```ts
test("audit round: an end date before the start shows its error, and the corrected round saves", async ({ page, measure, playwright, baseURL }, testInfo) => {
  const location = runRecords(readRunState().runId).location
  const choices = await readAssetChoices(page, measure)
  // The round's scope is the run's room and the Draft status: only this run's Draft assets, never another area's.
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-AUD", name: "ฟอร์มรอบตรวจนับ", status: "draft" })
  await measure.visit("/th/audit/rounds/new", "audit round form")
  const name = `${projectMarker(testInfo)} รอบตรวจฟอร์ม`
  await page.locator("#audit-round-name").fill(name)
  await waitForFirstCount(page)
  // The conditions as chips (group 2 spec §7): the room by its code, the asset status by its Thai name.
  await addCondition(page, "ที่ตั้ง", location.code, `${location.code} - ${location.name}`)
  await addCondition(page, "สถานะทรัพย์สิน", "ร่าง", "ร่าง")
  await page.locator("#audit-round-start-date").fill(isoDay(1))
  await page.locator("#audit-round-end-date").fill(isoDay(0))
  await createButton(page).click()
  await expectFieldError(page, "audit-round-end-date", END_BEFORE_START)

  await page.locator("#audit-round-end-date").fill(isoDay(11))
  await expectNoFieldError(page, "audit-round-end-date")
  // The live count settles on this run's Draft assets in the room (the test's own among them), and the sample lists it.
  await expect(willCreate(page)).toBeVisible()
  await showSample(page)
  await expect(page.getByText(asset.assetTag).first()).toBeVisible()
  // The round is the test's own: the IT head cancels it whatever happens, so no run leaves an open round behind.
  const created = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/audit-rounds")
  const saved: { id?: string } = {}
  try {
    await measure.timed("audit round save", async () => {
      await createButton(page).click()
      const response = await created
      expect(response.status(), "the round is saved").toBe(201)
      saved.id = ((await response.json()) as { id: string }).id
      await expect(page).toHaveURL(new RegExp(`/th/audit/rounds/${saved.id}(?:[?#]|$)`))
    })
    await measure.recordPage("after the audit round save")
    await expect(page.getByRole("main").getByText(name).first()).toBeVisible()
  } finally {
    if (saved.id) await cancelAsItHead(playwright.request, baseURL, saved.id, `${projectMarker(testInfo)} รอบของฟอร์มทดสอบ ยกเลิกหลังตรวจ`)
  }
})
```

- [ ] **Step 6: Write the rounds list spec**

`e2e/audit/rounds-list.spec.ts`:

```ts
// The rounds list (group 2 spec §6, §16): the status tabs and their counts follow the search; one status badge,
// never ร่าง; the next step whole, to the scan page for IT staff and to the pending list for a viewer; the viewer's
// strip cell opens a work view with its removable chip; a cancelled round moves to ยกเลิก. The test opens its own
// round on its own room, finds it by its number (spec §16: never on a first page), and the IT head cancels it
// whatever happens.
import { asUser, expect, test } from "../support/fixtures.ts"
import { actAs, createAssets, createRoom, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import * as rounds from "./round-steps.ts"
import { ROUNDS_WORDS as W } from "./rounds-words.ts"

asUser("itStaff")

test("the rounds list: status tabs that follow the search, the next step whole and by role, a work view's chip, a cancelled round under ยกเลิก", async ({ page, measure, e2eDevice, e2eTheme, playwright, baseURL }, testInfo) => {
  test.setTimeout(180_000)
  const prefix = recordPrefix(testInfo, "AUL")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบรายการรอบ`)
  const choices = await readAssetChoices(page, measure)
  await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])
  // The body the form sends (spec §7: no status).
  const opened = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบทดสอบรายการรอบ`,
      auditYear: Number(bangkokDate().slice(0, 4)),
      scopeLocationId: roomId,
      includeClosedAssets: false,
      riskPreset: "all",
      sampleRate: 100,
      startDate: bangkokDate(),
      endDate: bangkokDate(10),
    },
  })
  expect(opened.status(), await opened.text()).toBe(201)
  const round = (await opened.json()) as { id: string; auditNo: string; generatedItems: number }
  expect(round.generatedItems, "the room's two assets").toBe(2)
  const list = `/th/audit/rounds?search=${encodeURIComponent(round.auditNo)}`
  const scanHref = new RegExp(`^/th/audit/rounds/${round.id}/scan(?:[?#]|$)`)
  const pendingHref = new RegExp(`^/th/audit/rounds/${round.id}/pending(?:[?#]|$)`)
  const nextName = fillTemplate(W.continueScanRow, { count: 2 })
  const entry = rounds.roundEntry(page, e2eDevice, round.auditNo)
  let cancelled = false
  try {
    // IT staff: the open tab by default; the tab counts and the header's "1 รอบ" follow the search (R1).
    await measure.visit(list, "rounds list, the test's round (IT staff)")
    await expect(page.getByRole("heading", { level: 1, name: W.listTitle })).toBeVisible()
    await rounds.expectTabs(page, W.tabOpen, { [W.tabOpen]: 1, [W.tabClosed]: 0, [W.tabCancelled]: 0, [W.tabAll]: 1 })
    await expect(page.locator('main [data-slot="page-header-meta"]')).toHaveText(fillTemplate(W.roundCount, { count: 1 }))
    await expect(entry).toHaveCount(1)
    // One status badge (spec §6, §14), and nothing checked yet.
    await expect(entry.getByText(W.statusOpen, { exact: true })).toHaveCount(1)
    if (e2eDevice === "desktop") {
      await expect(entry.getByText(W.notStarted, { exact: true })).toBeVisible()
      await expect(entry.getByText(new RegExp(`^${W.daysLeft.replace("{days}", "\\d+")}$`))).toBeVisible()
    }
    // The next step: whole, to the scan page for a person with audit:edit.
    const next = entry.getByRole("link", { name: nextName, exact: true })
    await expect(next).toHaveAttribute("href", scanHref)
    await rounds.expectWhole(next)
    // The strip's cell is round-wide: a scan page, maybe of another run's round.
    await expect(page.getByRole("link", { name: W.continueScan, exact: true })).toHaveAttribute("href", /^\/th\/audit\/rounds\/[0-9a-f-]{36}\/scan(?:[?#]|$)/)
    // ปิดแล้ว holds nothing for this search; ทั้งหมด holds the round.
    await rounds.tab(page, W.tabClosed).click()
    await page.waitForURL(/[?&]view=closed(?:&|$)/)
    await expect(rounds.tab(page, W.tabClosed)).toHaveAttribute("aria-current", "page")
    await expect(entry).toHaveCount(0)
    if (e2eDevice === "desktop") await expect(page.getByRole("link", { name: W.clearSearch, exact: true })).toBeVisible()
    await rounds.tab(page, W.tabAll).click()
    await page.waitForURL(/[?&]view=all(?:&|$)/)
    await expect(entry).toHaveCount(1)
    await measure.recordPage("rounds list, ทั้งหมด (IT staff)")
    await next.click()
    await page.waitForURL(`**/th/audit/rounds/${round.id}/scan**`)

    // The viewer: the next step opens the pending list, and no scan page is offered (spec §5).
    await actAs(page, "viewer", e2eTheme)
    await measure.visit(list, "rounds list, the test's round (viewer)")
    const viewerNext = entry.getByRole("link", { name: nextName, exact: true })
    await expect(viewerNext).toHaveAttribute("href", pendingHref)
    await rounds.expectWhole(viewerNext)
    await expect(page.locator('main a[href*="/scan"]').filter({ visible: true })).toHaveCount(0)
    // The strip's cell opens the work view รอตรวจ: a removable chip under the กำลังดำเนินการ tab.
    const stripCell = page.getByRole("link", { name: W.continueScan, exact: true })
    await expect(stripCell).toHaveAttribute("href", /[?&]view=pending(?:&|$)/)
    await stripCell.click()
    await page.waitForURL(/[?&]view=pending(?:&|$)/)
    const chip = rounds.workViewChip(page, W.viewPending)
    await expect(chip).toBeVisible()
    await expect(rounds.tab(page, W.tabOpen)).toHaveAttribute("aria-current", "page")
    // The work view holds the round (it has items to check); its chip clears the view and keeps the search.
    await measure.visit(`/th/audit/rounds?view=pending&search=${encodeURIComponent(round.auditNo)}`, "rounds list, work view รอตรวจ (viewer)")
    await expect(entry).toHaveCount(1)
    await chip.click()
    await page.waitForURL((url) => url.searchParams.get("view") !== "pending" && url.searchParams.get("search") === round.auditNo)
    await expect(chip).toHaveCount(0)
    await expect(entry).toHaveCount(1)
    await viewerNext.click()
    await page.waitForURL(`**/th/audit/rounds/${round.id}/pending**`)

    // The IT head cancels the round: it leaves กำลังดำเนินการ for ยกเลิก, with its badge and no next step.
    await rounds.cancelAsItHead(playwright.request, baseURL, round.id, `${prefix} ยกเลิกรอบทดสอบรายการรอบ`)
    cancelled = true
    await measure.visit(list, "rounds list after the cancel (viewer)")
    await rounds.expectTabs(page, W.tabOpen, { [W.tabOpen]: 0, [W.tabClosed]: 0, [W.tabCancelled]: 1, [W.tabAll]: 1 })
    await expect(entry).toHaveCount(0)
    await rounds.tab(page, W.tabCancelled).click()
    await page.waitForURL(/[?&]view=cancelled(?:&|$)/)
    await expect(entry.getByText(W.statusCancelled, { exact: true })).toHaveCount(1)
    await expect(entry.getByRole("link", { name: nextName, exact: true })).toHaveCount(0)
  } finally {
    if (!cancelled) await rounds.cancelAsItHead(playwright.request, baseURL, round.id, `${prefix} ยกเลิกรอบทดสอบรายการรอบ`)
  }
})
```

- [ ] **Step 7: Run the guard tests to see them pass**

Run: `node --test tests/e2e-audit.test.ts tests/e2e-audit-rounds.test.ts tests/e2e-cross-cutting.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors (tsconfig `include` covers `e2e/` and `tests/`).

- [ ] **Step 8: Rewrite these pins**

Only additions; no existing assertion changes in this task:
- `tests/e2e-audit.test.ts:76`: unchanged. `open.includes(thai("auditRound").statusOpen)` now holds through the badge check after the save, not the status select.
- `tests/e2e-audit.test.ts`, after `:76`: the lines of Step 1. (The EA4 closed-badge pin after `:186` and `field-audit.spec.ts:385` are Task 1's.)
- `tests/e2e-cross-cutting.test.ts`, after `:259`: the lines of Step 1.
- `tests/e2e-audit.test.ts:64`: Task 4's. If Task 4 left it failing, it is fixed there, not here.

- [ ] **Step 9: Write the docs**

`docs/99_CHANGELOG.md`: under `## 2026-10-26` (`:7`), above `### รายละเอียดทรัพย์สินแบบ B` (`:9`). Use a new date heading above it if the commit date is later:

```md
### รอบตรวจนับ สร้างรอบ และเลิกขั้นร่าง (กลุ่มหน้า 2 แผน 1)

Branch `feat/group2-audit-rounds` (จาก `master` `28abba7b`) · spec `docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md` (§5, §6, §7, §13, §14) · plan `docs/superpowers/plans/2026-10-26-group2-audit-rounds.md`

- **รายการรอบตรวจนับ:** "งานที่ต้องทำต่อ" อยู่บนสุดและนับทั้งระบบ (ไม่ตามคำค้น) มี 4 ช่อง เดินตรวจต่อ / พิจารณารายการไม่ตรง / แผนแก้ไขค้าง (ใหม่ เปิดแผนแก้ไขที่ยังค้าง) / รอบที่ปิดได้แล้ว · แท็บ กำลังดำเนินการ / ปิดแล้ว / ยกเลิก / ทั้งหมด จำนวนตามคำค้น เริ่มที่กำลังดำเนินการ (`?view=open` ใช้ได้เหมือนเดิม) · ตัวกรองงาน รอตรวจ / รอพิจารณา / ปิดรอบได้ เป็นชิปที่ล้างได้ · "มีรายการไม่ตรง" เลิกใช้ · "ค้นหารอบ" อยู่บนตาราง · คอลัมน์ รอบ / ขอบเขต · N รายการ / ช่วงวันที่ กับ "เหลือ N วัน" หรือ "เลยกำหนด N วัน" / ความคืบหน้า (PaceBar หรือ "ยังไม่เริ่ม") / สถานะป้ายเดียวกับ "พร้อมปิดรอบ" / ขั้นถัดไป · ภาพรวมความครอบคลุมพับเป็นบรรทัดเดียว เปิดดูแยกตามหมวดหมู่และแผนก · ใต้หัวข้อบอก "N รอบ"
- **สร้างรอบ:** เส้นทาง "รอบตรวจนับ › สร้างรอบ" · ฟอร์ม 3 ส่วน · เงื่อนไขเป็นชิปจาก "+ เพิ่มเงื่อนไข" · ตัวเลือกขั้นสูงพับไว้ · แผง "ขอบเขตนี้ได้" นับจำนวนเองเมื่อเงื่อนไขเปลี่ยน แทนปุ่ม "ดูตัวอย่าง" พร้อม ตรงเงื่อนไข / สุ่มได้ ส่วนควบ หมวดหมู่ที่มากที่สุด คำเตือนทรัพย์สินที่อยู่ในรอบอื่นที่เปิดอยู่ (เตือน ไม่บล็อก) ภาระต่อวัน และ "ดูตัวอย่างรายการ" · ปุ่มล่าง "จะสร้างรอบ N รายการ" กับ "สร้างรอบ" · ไม่มีช่องสถานะ
- **ที่แก้:** ข้อความขั้นถัดไปถูกตัด ("ต้องพิจารณ…") · ขอบเขตไม่แสดงแผนก หมวดหมู่ ผู้ถือครอง สถานะ และสภาพ · ค้นหารอบจากหมวดหมู่หรือแผนกของขอบเขตไม่เจอ · "งานค้างในรอบเปิด" รวมรายการรอตรวจกับรายการไม่ตรง (แยกเป็นสองตัวเลขแล้ว) · API สร้างรอบรับสถานะ `closed` / `cancelled` (ตอนนี้สร้าง `open` เสมอ ไม่สนสถานะที่ส่งมา) · วันเริ่มกับวันสิ้นสุดเป็นวันนี้ทั้งคู่ (วันสิ้นสุดเป็นอีก 1 เดือน) · รอบร่างไม่ขึ้นแดชบอร์ดและเปิดตรวจไม่ได้ · "พร้อมปิดรอบ" ขึ้นกับรอบที่ระบบไม่ยอมปิด (แผนแก้ไขสถานะเสร็จแล้วยังค้าง) · "พิจารณา" นับแผนแก้ไขค้างรวมด้วย (แยกเป็น "แผนแก้ไขค้าง")
- **ร่าง:** สร้างรอบร่างไม่ได้อีก · รอบร่างเดิมอ่านเป็น "เปิดตรวจ" ทุกที่ (ป้าย แดชบอร์ด แท็บ หน้าพนักงาน การค้นหา) โดยไม่แก้ข้อมูล · คำว่า "ร่าง" ไม่อยู่ในหน้าตรวจนับ (ประวัติระบบยังแปลค่าเดิมได้)
- **จำนวนของรอบ:** รายการของรอบเองคือรายการที่ไม่ใช่ "นอกขอบเขต" (`src/lib/audit-round-counts-rules.ts`, `src/lib/audit-round-counts.ts`) ใช้กับรายการรอบ แดชบอร์ด และตัวเลข "ทั้งหมด" ของหน้ารอบ · "นอกขอบเขต N" บนรายการรอบยังนับจากประวัติสแกน (แผน 2 ย้ายพร้อมรายการของหน้ารอบ) · รายการผลตรวจของหน้ารอบและไฟล์ส่งออก Excel/PDF (ทั้งหมดและแต่ละผล) ใช้เฉพาะรายการของรอบเองตาม `buildAuditRoundItemWhere` (ไฟล์ส่งออกตามรายการ) ยกเว้นไฟล์ส่งออก "รอพิจารณา" ที่ยังรวมรายการนอกขอบเขตที่รอพิจารณา และไฟล์ส่งออก "นอกขอบเขต" ที่ยังอ่านจากประวัติสแกน
- **E2E:** `e2e/audit/field-audit.spec.ts` สร้างรอบด้วยชิปแผนก จำนวนสดเท่ากับรายการที่สร้าง ไม่มีช่องสถานะ รอบเปิดทันที (สถานะที่ส่งมากับ API ถูกข้าม) และป้าย "ปิดรอบแล้ว" · `e2e/audit/rounds-list.spec.ts` (ใหม่) แท็บและจำนวนตามคำค้น ชิปตัวกรองงานจากช่อง "เดินตรวจต่อ" ขั้นถัดไปเห็นครบทั้งข้อความ ไปหน้าสแกนสำหรับเจ้าหน้าที่ IT และรายการรอตรวจสำหรับผู้ดูอย่างเดียว รอบที่ยกเลิกย้ายไปแท็บยกเลิก · `e2e/cross-cutting/field-errors.spec.ts` ใช้ฟอร์มใหม่และให้หัวหน้า IT ยกเลิกรอบของตัวเองทุกครั้ง (เดิมทิ้งรอบร่างไว้ 4 รอบต่อการรัน)
- **deploy:** ไม่ deploy · ไม่มี migration · ก่อนหรือในวัน deploy หัวหน้า IT ยกเลิกรอบ `AUD-2026-0002 "Test"` (รอบร่าง 1,509 รายการ) ใน Production ผ่านหน้ารอบในแอป ("ยกเลิกรอบตรวจ" พร้อมเหตุผล; ผู้ใช้ตกลง 2026-10-26) เพราะหลัง deploy รอบร่างอ่านเป็นเปิดตรวจ ไม่รัน SQL
```

The "ผล E2E" bullet is added by the controller after the targeted run (Step 12), between "E2E" and "deploy". Do not write a placeholder.

`docs/07_UAT_CHECKLIST.md`, auditor section (each stays a `- [ ] ` item):
- `:109` becomes: "On `/th/audit/rounds/new`, add conditions as chips through "+ เพิ่มเงื่อนไข" and confirm the summary panel "ขอบเขตนี้ได้" counts by itself (no "ดูตัวอย่าง" button), with "ตรงเงื่อนไข X · สุ่มได้ Y" below 100%, the components note, the largest categories, the overlap warning and "ดูตัวอย่างรายการ", before "สร้างรอบ"."
- `:110`: "confirm preview shows the component count" becomes "confirm the summary panel shows the components pulled in"; the rest stays.
- `:159`: "apply a quick filter/search" becomes "choose a status tab or a work-view chip and search"; the rest stays.
- New section after Asset Detail B UAT (`:377`), before `## Sign-Off` (`:379`):

```md
## Audit Rounds B UAT (2026-10-26)

The automated suite covers the rounds list and the create form in all four projects (`e2e/audit/`, `e2e/cross-cutting/field-errors.spec.ts`). A person still checks:

- [ ] On a copy of Production data: the tab counts follow the search, "งานที่ต้องทำต่อ" stays round-wide while searching, the scope column names every condition, a search by a scope's category or department name finds the round, and "เหลือ / เลยกำหนด N วัน" shows on open rounds only.
- [ ] A fully scanned round with pending findings reads "รอพิจารณา"; "พร้อมปิดรอบ" shows only where the close goes through (no action plan planned, in progress or done); "พิจารณา" opens a list of the same count, and "แผนแก้ไขค้าง" opens the open action plans.
- [ ] The coverage line folded and open: bar, %, "ครอบคลุม X จาก Y · ยังไม่อยู่ในรอบใด Z", the four numbers, pending items and pending review apart, the breakdown by category and department, the year in Buddhist years.
- [ ] The create form: the end date a month after the start, every condition type through "+ เพิ่มเงื่อนไข", custodian search, a disposed status only with "รวมที่ตัดจำหน่ายแล้ว" ticked and gone when it is unticked, the advanced options' folded line, the live count while typing fast (no focus jump, no error under a half-typed date), the daily load, the overlap warning with its link, and 0 items said before "สร้างรอบ".
- [ ] An old draft round (on a copy of Production, `AUD-2026-0002` before it is cancelled) reads "เปิดตรวจ" on the list, the round page, the dashboard, the employee page and the global search, with no "ร่าง" anywhere.
- [ ] NVDA: the tabs read their counts, the chip reads "ล้างตัวกรองนี้: …", the next step reads in full.
- [ ] Both themes on a real monitor and phone; on the phone the summary panel sits under the form and the round cards show the next step.
- [ ] An English pass of the new messages.
```

`docs/06_WORKFLOWS.md`, "Audit Counting":
- `:64` becomes: "- Create audit rounds at `/audit/rounds/new` from scope conditions added as chips ("+ เพิ่มเงื่อนไข"). A round is created `open` at once: the create API ignores any client `status` (page group 2 spec §14)."
- `:65` becomes: "- The summary panel "ขอบเขตนี้ได้" counts the items by itself while the conditions change (a debounced, scope-only `POST /api/audit-rounds/preview`): the matched and sampled numbers, the components pulled in, the largest categories, a warning for assets already in another open round (it never blocks), the daily load, and "ดูตัวอย่างรายการ" for the eight-row sample."
- `:68` becomes: "- The audit rounds list leads with "งานที่ต้องทำต่อ" (round-wide: เดินตรวจต่อ, พิจารณารายการไม่ตรง, แผนแก้ไขค้าง → `findings?status=action_open`, รอบที่ปิดได้แล้ว), then status tabs กำลังดำเนินการ / ปิดแล้ว / ยกเลิก / ทั้งหมด (`view=open|closed|cancelled|all`, default `open`) whose counts follow the search. The work views `pending`, `review` and `readyToClose` stay URL views shown as a removable chip. Each row's ขั้นถัดไป wraps; "เดินตรวจต่อ (N)" opens the scan page for `audit:edit` and the pending list for everyone else. "พร้อมปิดรอบ" uses the close API's three conditions. The year's coverage folds to one line."
- After `:68` add: "- Every count of a round counts its own items only: an out-of-scope find is an `AuditItem` with `auditResult: "out_of_scope"` and is counted apart (`src/lib/audit-round-counts-rules.ts`, `getAuditRoundCounts`). The round page's Excel and PDF exports (all and each result) follow the same own-items rule; the pending-review export keeps the out-of-scope finds waiting for review, and the out-of-scope export still reads the scan history (R18). Old `draft` rounds read as open everywhere, with no data update."

`DEVELOPER_HANDOFF.md`:
- `:57` becomes: "- Audit Rounds list (page group 2 plan 1) leads with the round-wide "งานที่ต้องทำต่อ" strip (`เดินตรวจต่อ`, `พิจารณารายการไม่ตรง`, `แผนแก้ไขค้าง`, `รอบที่ปิดได้แล้ว`), then status tabs (`view=open|closed|cancelled|all`, default `open`) whose counts follow the search, and the work views `pending|review|readyToClose` as a removable chip (`mismatch` is gone). Each round shows one computed status badge, plus `พร้อมปิดรอบ` on the close API's conditions. Audit scan, finding review, SOD and the close-round guard are unchanged."
- After `:1199` (the asset detail bullet), one bullet. Write the commit date where it says so:

```md
- Page group 2, plan 1: the rounds list, create a round, no draft (the commit date, branch `feat/group2-audit-rounds`, not deployed, no migration; plan `docs/superpowers/plans/2026-10-26-group2-audit-rounds.md`): canvas B for `/audit/rounds` and `/audit/rounds/new` (spec §6, §7); the create API always creates `open` and ignores a client `status`; old `draft` rounds read as open everywhere (`effectiveAuditRoundStatus`, `src/lib/audit-round-status.ts`) with no data update; one round count (`src/lib/audit-round-counts-rules.ts`, `getAuditRoundCounts` in `src/lib/audit-round-counts.ts`) keeps out-of-scope items out of every total, for the rounds list, the dashboard and the round page's ทั้งหมด; the preview has a scope-only schema and returns `categories`, `directSampled` and `overlap`. E2E: `e2e/audit/rounds-list.spec.ts` (new) and the form steps in `e2e/audit/round-steps.ts`; the field errors test cancels its round. Deploy note: before or on deploy day an IT head cancels the old draft round `AUD-2026-0002 "Test"` (1,509 items) in Production through the round page (the user agreed 2026-10-26); after this release it would read as an open round. No SQL is run for it.
```

`docs/08_PRODUCTION_READINESS.md`, after `:102` (`## Deployment`):

```md
- [ ] Before or on deploy day, an IT head cancels the old draft audit round `AUD-2026-0002 "Test"` (1,509 items; finding E6 in `docs/audits/2026-10-07-full-review.md`) in Production through the round page ("ยกเลิกรอบตรวจ" with a reason). The user agreed on 2026-10-26. From page group 2 a draft round reads as open, so left alone it counts on the dashboard and in the rounds list. No SQL is run for it.
```

`docs/11_FEATURE_LIST.md`:
- `:181` second cell becomes "Create rounds from scope conditions added as chips; a round opens at once (no draft step)".
- `:182` second cell becomes "Round-wide next-action strip, status tabs (in progress / closed / cancelled / all) with counts that follow the search, work views as a removable chip, one computed status badge plus ready-to-close, a wrapping next-step column (scan for editors, the pending list for others); 25/50/100 rounds per page, cut in memory after the view filter so the tab counts still cover every round, and a page past the end shows the last page".
- `:184` second cell becomes "A live item count while the conditions change, with matched and sampled numbers, components, top categories, an overlap warning and an eight-row sample".

`docs/audits/2026-10-07-full-review.md:31`, the last cell `เปิด — รอผู้ใช้ยกเลิกผ่าน UI` becomes `เปิด — ผู้ใช้ตกลงให้ยกเลิก (2026-10-26): หัวหน้า IT ยกเลิกผ่านหน้ารอบในแอป ก่อนหรือในวัน deploy · ตั้งแต่กลุ่มหน้า 2 แผน 1 รอบร่างอ่านเป็นเปิดตรวจ`.

- [ ] **Step 10: Run the whole unit suite, the types and the lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. This includes the three guard files, the docs pins (each changelog entry keeps its date heading, no template marker), and `tests/audit-round-cancellation.test.ts:144-157`.

- [ ] **Step 11: Commit**

```bash
git add e2e/audit/rounds-words.ts e2e/audit/round-steps.ts e2e/audit/rounds-list.spec.ts e2e/audit/field-audit.spec.ts e2e/cross-cutting/field-errors.spec.ts tests/e2e-audit-rounds.test.ts tests/e2e-audit.test.ts tests/e2e-cross-cutting.test.ts docs/99_CHANGELOG.md docs/07_UAT_CHECKLIST.md docs/06_WORKFLOWS.md DEVELOPER_HANDOFF.md docs/08_PRODUCTION_READINESS.md docs/11_FEATURE_LIST.md docs/audits/2026-10-07-full-review.md
git commit -m "test(e2e): the audit steps open a round on the new form with its live count, the rounds list spec checks tabs, chips and the next step by role, the field errors round is cancelled, and the docs record the plan (group 2 plan 1 task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 12 (the controller, not the implementer): the plan's targeted E2E run**

It needs the VPN, `scratchpad/stay-awake.ps1` and a clean build. Before the run, the controller probes the database (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`) and runs `rm -rf .next && npm run build`.

Run: `npx playwright test e2e/audit e2e/smoke e2e/dashboard e2e/asset-detail e2e/cross-cutting/field-errors.spec.ts e2e/cross-cutting/roles.spec.ts e2e/disposal/open-audit-block.spec.ts`
Expected: every test passes in all four projects (the setup project runs first). Why each one is in the run:
- `e2e/audit`: the walk on the new form, and the new rounds list spec;
- `e2e/smoke`: the cadence;
- `e2e/dashboard`: drafts now count as open, and out-of-scope items leave the round numbers;
- `e2e/asset-detail` and `open-audit-block`: both create a round through the API;
- `field-errors`: the form;
- `roles`: the viewer's visit to the new list (axe, no scan link).

The whole suite runs once after plan 4 (spec §16, §17).

Afterwards the controller adds the "ผล E2E" bullet to the changelog entry (run id, passed / failed per project) and the run id to the handoff bullet, in one commit on `feat/group2-audit-rounds`. It then updates the AssetSystem wiki (`ams-status`, `ams-log`, and `ams-open-questions` item 5 on `AUD-2026-0002`).

---

## Appendix: Rulings

Rulings bind the tasks. Where a task and a ruling disagree, the ruling wins; where a ruling and the spec disagree, the spec wins and the controller rules again.

- **R1:** The strip "งานที่ต้องทำต่อ" is round-wide. The tab counts and the table follow the search.
- **R2:** Readiness ("พร้อมปิดรอบ", "รอบที่ปิดได้แล้ว") is the close API's three conditions: no pending items, no pending review, no action plan in planned / in_progress / **done**. The opener rule is not part of readiness; the round page says it (plan 2).
- **R3:** "พิจารณา" counts pending-review findings only and links to `findings?status=pending`. Open action plans are counted apart as "แผนแก้ไขค้าง" and link to `findings?status=action_open`.
- **R4:** The rounds list's out-of-scope count stays from scan history in plan 1. Plan 2 moves the count and the round page's out-of-scope list onto items together.
- **R5:** The dashboard and the round page's result lists use own items in plan 1, so the KPI equals its list, except the pending-review list, which keeps the out-of-scope finds because its count (every pending finding) does. The round page's "ทั้งหมด" number uses the own count.
- **R6:** Coverage counts own items only.
- **R7:** The default tab is `open` ("กำลังดำเนินการ"). `?view=open` keeps working, `?view=all` stays a value, and an old `?view=mismatch` falls back to `open`.
- **R8:** "รอบที่ปิดได้แล้ว" has no href at 0. Spec §6's "grey" is met by the plain, unlinked cell: no link, chevron, hover fill or focus ring. Its value stays `text-foreground` like every StatStrip value, because DESIGN.md allows no status fills and colour only marks what needs action. StatStrip gets no grey or muted variant. This reading of spec §6 is a ruled deviation: Task 5's report names it for the user, and it is not re-raised as a spec conflict under the precedence rule above.
- **R9:** "สุ่มได้ Y" is the directly sampled assets, without pulled-in components. The components note gives the rest.
- **R10:** The preview has its own scope-only schema, and a preview failure never moves focus.
- **R11:** The overlap query is chunked at 2,000 ids. It warns and never blocks the create.
- **R12:** The employee page and global search badges are fixed here (no raw "draft" or "cancelled").
- **R13:** `auditRound.statusDraft` stays until Task 4, because the old form reads it until then; Task 4 deletes it with the status select. Task 1 deletes only the three `employee.auditRoundStatus*` keys.
- **R14:** The dashboard's item groupBy moves to `auditRoundOperationalWhere` in Task 1 (so a draft that becomes the current round never shows 0 / 0 between commits). Task 2 wraps it in `withAuditRoundOwnItems`.
- **R15:** The global search badge reads its word through `getTranslations` (the route already loads next-intl), so it shares the audit pages' word and the glossary test guards it.
- **R16:** An unknown status reads as open: callers write `auditRoundStatusLabelKey(status) ?? "statusOpen"`, matching `isAuditRoundOperationalStatus`.
- **R17:** `getAuditRoundCounts` joins the caller's where with `AND: [{ auditRoundId: { in: chunk } }, where]` (a spread could replace the chunk), removes duplicate ids, and returns zeros for a round with no items. `AUDIT_ID_CHUNK_SIZE` and `chunkAuditIds` live in `audit-round-counts-rules.ts` (Task 2); Task 3's overlap uses them and defines no chunk helper of its own.
- **R18:** The Excel and PDF exports share `buildAuditRoundItemWhere`, so the "all" export and each result export now hold own items only, except the `pending_review` export, which keeps the out-of-scope finds waiting for review; the `out_of_scope` export keeps the scan history. "The export follows the list." The changelog says so; plan 2 names it in its export step.
- **R19:** `systemLogPage.value_auditRound_status_closed` becomes "ปิดรอบแล้ว" too (one word for one thing). `systemLogPage.value_auditRound_status_draft` keeps "ร่าง" (history).
- **R20:** Task 3 loads components by relation (`parentAsset: buildAuditAssetWhere(input)`), not by an id list, and `selectAuditSample` uses an index map instead of `findIndex`. Both serve Review Focus 1: the live count runs on every change, and its first scope is the whole register.
- **R21:** `src/lib/validations/audit.ts` imports `./shared.ts` (as `validations/disposal.ts` does) so node --test can load the schemas.
- **R22:** Two existing app words stay against the spec's draft words: the sample's component line "เข้ารอบเพราะติดตั้งอยู่กับ {assetTag}" (the app calls a parent "ทรัพย์สินหลัก") and the include-closed box "รวมทรัพย์สินที่ตัดจำหน่าย/ปลดระวางแล้ว" (it also covers retired assets). The trail's last crumb reuses "สร้างรอบ"; the h1 stays "สร้างรอบตรวจนับ".
- **R23:** `foldTopCategories` is strict to decision 2: the six largest, then everything else under "อื่น ๆ", even when only one category is left over.
- **R24:** The E2E master-id reader `readAuditMasters(page)` keeps its signature and reads the native selects of `/th/assets/new` in a second page of the same browser context (the pattern of `e2e/repair/repair-data.ts`). The master-data APIs are not open to IT staff for every list.
- **R25:** A viewer sees "เดินตรวจต่อ (N)" on the list, and it opens the pending list (spec §6, "as the strip cell does today"). Spec §5's "no เดินตรวจต่อ control without `audit:edit`" is about the scan and record controls on the pending and round pages (plan 2-3).
- **R26:** "เหลือ N วัน" counts the end day: on the end day it reads "เหลือ 1 วัน", the next day "เลยกำหนด 1 วัน". Bangkok days.
- **R27:** The list's progress bars carry no pace mark (`pace={null}`, `behind={false}`): the list has no room for "ช้ากว่าที่ควร". The dashboard keeps the pace.
- **R28:** The strip gains a cell "แผนแก้ไขค้าง" (→ `findings?status=action_open`, open rounds), so the reason a fully reviewed round cannot close is visible (R3). *(my call; reported to the user)*
- **R29:** A ready round's next step "ปิดรอบตรวจ" (to the round page) shows only with `audit:approve`; without it the cell is empty and the "พร้อมปิดรอบ" badge says the rest.
- **R30:** The phone card carries the same status badge, dates, progress and next step as the table row.
- **R31:** The work-view chip's href drops `view` and keeps `search`. Under a work view the กำลังดำเนินการ tab is `aria-current`. The strip cells drop the search (R1).
- **R32:** The rounds list's findings and scan-history groupBys pass every round id in one list (rounds number in the tens per year). A later plan chunks them if rounds reach the thousands.
- **R33:** The preview route gets no performance label in plan 1.
- **R34:** The dev DB's leftover draft rounds from old `field-errors` runs are not cleaned by this plan; they read as open after Task 1, and no step depends on their number. Cleaning them is the user's call, through the app.
- **R35:** The coverage panel is one `<details>` (house pattern of `brands/page.tsx:416-428`): its summary is the folded line, its open part holds the numbers and the gap lists. If axe or a screen-reader check objects to the heading inside `<summary>`, the `h2` moves above the `<details>`.
