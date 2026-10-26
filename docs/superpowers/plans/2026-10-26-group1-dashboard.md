# Page group 1: the dashboard (canvas B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[locale]/dashboard` as canvas B. Waiting work comes first, from one source shared with the bell and the work center. Every number opens a list that shows the same count. Parts follow a role order. The page gains a company switcher for the overview, a status data bar, the audit pace by branch, and a feed of recent asset events.

**Architecture:**
- **Shared rules (Tasks 1-3):** one client-safe module of where builders, `src/lib/waiting-work-rules.ts`, serves every count and every list. The bell, the work center, the register, the findings page and the dashboard all call it, so a count equals its list by construction.
- **Shared parts (Tasks 4-7):** the work center and the audit round detail are aligned, StatStrip learns a filter note and a meter slot, and two data-bar parts arrive under a new DESIGN.md rule.
- **Overview data (Task 8):** read-only server functions, with a pure rules file that has behaviour tests.
- **The page (Tasks 9-11):** the page is rewritten in two tasks, then the E2E steps and the docs.

**Tech Stack:** Next.js 16.4 App Router (server page), React 19, next-intl, Prisma 7 on SQL Server (read-only here; no schema change, no migration), Tailwind 4 tokens, `node --test` source and behaviour tests, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md`, mainly §6 (the dashboard). It also draws on §5 (rules for all three pages), §9 (the work outside the page this needs), §10 (dashboard E2E) and §11 (build order). This is the second of three plans: the login (done on `feat/group1-login`), this one, then the asset detail.

**Branch:** `feat/group1-dashboard`, from `master` after the login branch merges.

**Dry run:** a full rehearsal is not needed.
- The change is read-only against the database.
- Every count/list equality is a unit test.
- The one browser-specific technique, CSS `anchor()` placement of the filter note, was tried in Chrome 152 while planning.
- Instead, run the smoke and shell E2E (`npx playwright test e2e/smoke e2e/shell`) once after Task 4, before the page work starts. The bell and the work center change in Tasks 1-4, and the shell specs read the bell.

## Task order and what each needs

| Task | Needs | Touches |
|---|---|---|
| 1 One waiting-work source + the two repair kinds | — | bell, digest, notifications page, maintenance page (moved where) |
| 2 How old each waiting kind is | 1 | waiting-work source, approval inbox query |
| 3A Register lists equal the bell; custodian state; company chip | 1 | register query, chips, register page |
| 3B Other warranty counts follow the bell's rule | 3A | data-quality rule, reports card, overview export |
| 3C Findings page lists the bell's two action kinds | 1 | findings filters and page |
| 3D Every waiting kind links to a list with its count | 3A, 3C | waiting-work hrefs |
| 4 Work center reads the same source | 1, 3D | work center page and metrics |
| 5 Audit round detail filters by company and branch | — | round detail page, its filters and exports |
| 6 StatStrip filter note and meter slot | — | `stat-strip.tsx` |
| 7 Data bars rule + DistributionBar + PaceBar | — | DESIGN.md, docs/14, design.json, `ui/` |
| 8 Overview data, recent events, movement labels | 1, 3A, 5 | new libs; movement messages |
| 9 Page: header, switcher, KPIs, waiting work, status | 1, 2, 3D, 6, 7, 8 | dashboard page, skeleton, messages, pins |
| 10 Page: branches and recent | 5, 7, 8, 9 | dashboard page, skeleton |
| 11 E2E steps and docs | 9, 10 | `e2e/dashboard/`, docs |

## Global Constraints

- **Words:**
  - Thai wording follows `docs/19_THAI_GLOSSARY.md`, and `tests/thai-glossary.test.ts` must pass: "ตรวจทาน" is banned (use พิจารณา or ตรวจสอบ), the place is "ที่ตั้ง" (never "อยู่ที่"), and a repair is "บันทึกซ่อม" (never "แจ้งซ่อม").
  - Edit messages only through `node scripts/messages-edit.mjs`, with th and en together.
- **Colour:**
  - DESIGN.md "Where Color Lives" applies.
  - No `bg-*-soft` card fills, no hex or rgba in tsx, no `dark:` and no `/NN` tints.
  - A status colour fills an area only under the "Data bars" rule (Task 7).
- **Shared parts first:** PageHeader, TabNav, StatStrip, ContentPanel, DataTable, EmptyNote, Notice and FilterChipList. A new part lives in `src/components/ui/`, gets a DESIGN.md section, and has a name that passes LS1, LK1 and LN2.
- **Same commit:**
  - Skeletons change in the same commit as their page.
  - Source-pin tests change in the same commit as the code they pin.
  - EXEMPT rows keep exact counts, each with its reason.
- **Dates:** days are Bangkok days through `startOfBangkokDay` / `bangkokDayDiff` (Task 1). Years are Buddhist-era in Thai.
- **The database:**
  - No schema change and no migration. The dashboard never writes: it reads the read-only `getWaitingWork`, never `getNotificationCenter`, which records count drops.
  - `src/lib/waiting-work-rules.ts` stays client-safe: relative `.ts` imports only, Prisma for types only, no `prisma` client and no `@/`.
- **Access:**
  - The page stays open to everyone it is open to today, and the employee redirect stays.
  - `dashboard:view` still gates only the work-center link.
  - Each part needs the view permission of the lists it opens: `asset:view` for the asset parts, `audit:view` for the round parts.
- **Counts:**
  - Every dashboard number opens a list that shows the same count, with `exact=1` on register links.
  - A count and its list share one where builder.
  - The page keeps its `withPerformanceTiming` labels, or renames them together with `tests/performance-route-instrumentation.test.ts`.
- **E2E:**
  - Dashboard steps compare two surfaces, never absolute numbers.
  - No failed sign-in, delete, LDAP sync, settings save or Excel import.
  - Any context that signs a user in starts with an empty storage state, because the login sends a signed-in visitor on.
- **Commits:** every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **An approver whose inbox holds the pending findings.** No "รายการไม่ตรงรอพิจารณา" row, and the zero line does not call them "none". The approvals row holds them. *Pinned in Task 1, "a kind is visible by its page's permission, and the inbox hides the queues it already holds".*
2. **00:30 in Bangkok, while the server clock says the day before.** It is already the new day for every cutoff, every age and the "ข้อมูล ณ" line. *Pinned in Tasks 1, 2 and 8: `startOfBangkokDay`, `waitingWorkAgeFrom` and `formatAsOf`.*
3. **A repair-status asset with no movement into its current status.** Its "ค้างนานสุด" dates from its last edit, never from an older, unrelated movement. *Pinned in Task 2, "the earliest of several dates, and a stuck asset dates from its move into its current status".*
4. **A `?companyId=` that is not an active company** (an old link, or typed by hand). The page shows all companies, never a page of zeros. *Pinned in Task 9, `normalizeDashboardCompanyId`.*
5. **A round due today, two rounds tied on the due date, or a one-day round.**
   - The current round is picked by the stated tie-break: nearest due date, then the latest start, then the code.
   - A one-day round's pace is 1 from its start.
   - *Pinned in Task 8: `pickCurrentAuditRound` and `auditPace`.*

## Decisions taken while planning (the user did not make these; check them)

- **The returns row counts assets:** "ใกล้/เลยกำหนดคืน" counts assets with an open loan due back, not loan rows, so the register list equals it (the same number unless an asset holds two open loans). Its gate becomes `asset:view` instead of `checkout:view || asset:view`, so a person with `checkout:view` alone stops seeing a row whose list they cannot open. This is the one place the bell changes to fit its list; the spec's §6.3 records it as an exception.
- **Lists that follow the bell's warranty rule:** the data-quality page's warranty rule, the reports operations card and the overview export follow it too (settings days, licences excluded), so every number that opens `dataQuality=warranty` matches (Task 3B).
- **Findings page:** two link-only statuses that equal the bell's two action kinds. The existing tabs are unchanged.
- **The work center:**
  - It shows 9 shared kinds, adding "รอซ่อมแต่ยังไม่มีบันทึกซ่อม" and the due-soon audit actions.
  - Its cells take the bell's titles, for example "ซ่อมยังไม่เสร็จ" instead of "ยังซ่อมไม่เสร็จ".
- **The audit round page:** it filters by company and branch, with chips, and its exports follow.
- **"ดูรอบที่กำลังตรวจทั้งหมด":** a link with no number, because the rounds list it opens also holds the current round.
- **No current round:** the round KPI and section read "ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้" when rounds are in progress, else "ไม่มีรอบตรวจนับที่กำลังตรวจ" (R15). This replaces spec §6.4's single line "ไม่มีรอบตรวจนับที่เปิดอยู่" with these two states.
- **Branch names:** shown as "<รหัสบริษัท> / <สาขา>" under ทุกบริษัท, because two companies each have a "สำนักงานใหญ่".
- **The status bar:** the bar's segments and the table rows both link to each status's list. The bar is hidden from screen readers because the table says the same (R17; the segments' links are for the mouse and out of the tab order). This replaces spec §6.6's "the bar itself is `role="img"` with a sentence" for the distribution bar; the pace bar keeps it.
- **The waiting-work KPI:** it links to the table on the page, the only place that shows its sum.
- **Permissions per part:** a person without `asset:view` or `audit:view` does not see the parts that open those lists.
- **The "ทุกบริษัท" note** on งานที่รอคุณ and ล่าสุด shows only while a company is chosen.
- **One repair word:** the movement label "เปิดใบซ่อม" becomes "บันทึกซ่อม" everywhere it shows.
- **The digest** still lists 8 rows. With 12 kinds, more people see "และอีก N หัวข้อ".

---

### Task 1: One waiting-work source, with the two repair kinds (bell, digest, notifications page)

**Files:**
- Create: `src/lib/waiting-work-rules.ts` (pure and client-safe: relative `.ts` imports only, no `@/`, no `prisma`, `@prisma/client` imported for types only. The register's client bundles will import it through `asset-list-query.ts` from Task 3, and a Step 1 test pins this.)
- Create: `src/lib/waiting-work.ts` (server)
- Modify: `src/lib/notification-summary.ts`:
  - :1-27 (the imports of the counting, `openAuditActionStatuses` and `defaultNotificationRuleDays` go)
  - :44-139 (the counting becomes one `getWaitingWork` call)
  - :141-171 (the state read and the drops list the 12 keys)
  - :182-211 (`startOfToday`, `addDays`, `getNotificationRuleSettings`, `parseNotificationDays` move or go)
- Modify: `src/lib/notification-summary-items.ts:1-91` (the items come from the shared keys and links)
- Modify: `src/lib/notification-digest-format.ts:30-55` (two labels per language)
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`: :18 (`openRepairRecordWhere` leaves the import), :46-50 (the local `stuckAssetWhere` goes), :96 and :101 (they read `stuckRepairsWhere`)
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Test:
  - `tests/waiting-work-rules.test.ts` (new)
  - `tests/waiting-work-source.test.ts` (new)
  - `tests/notification-summary.test.ts` (rewritten)
  - `tests/notification-groups.test.ts:6-14`
  - `tests/notification-read-rules-route.test.ts:25-27,35,98,118,144`
  - `tests/notification-maintenance-query.test.ts:5-9`
  - `tests/notification-digest.test.ts` (one test after :24)
  - `tests/repair-record-list-ui.test.ts:21`
  - `tests/asset-register-ux.test.ts:84`
  - `tests/asset-transaction-cancellation-routes.test.ts:29`
  - `tests/audit-round-cancellation.test.ts:129`
- No EXEMPT row moves. No page layout changes, so no skeleton changes. The dashboard and the work center are not touched here (Tasks 4 and 9).

**Interfaces:**
- Consumes:
  - `openRepairRecordWhere` (`src/lib/repair-record-policy.ts:12`).
  - `buildDuePmPlanWhere(now)` and `getBangkokDateKey(date)` (`src/lib/preventive-maintenance.ts:50-63`).
  - `auditRoundOperationalWhere` (`src/lib/audit-round-status.ts:4`).
  - `buildExactAssetRegisterHref` (`src/lib/asset-register-view-memory.ts:28`).
  - `getApprovalInboxAccess(user)`, `getApprovalInboxCounts(user)` and `type ApprovalInboxCounts` (`src/lib/approval-inbox-query.ts:13-17,83-117`).
  - The four `notification*DaysKey` settings keys (`src/lib/system-setting-defaults.ts:35-44`).
- Produces in `src/lib/waiting-work-rules.ts` (for Tasks 2, 3, 4, 8, 9 and 10):
  - `WAITING_WORK_KEYS = ["approvalInbox", "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"] as const`.
  - `type WaitingWorkKey = (typeof WAITING_WORK_KEYS)[number]` and `type WaitingWorkCounts = Record<WaitingWorkKey, number>`.
  - `type WaitingWorkRules = { returnDueSoonDays: number; auditActionDueSoonDays: number; warrantyExpiryDays: number; licenseExpiryDays: number }` and `DEFAULT_WAITING_WORK_RULES: WaitingWorkRules` = 3, 7, 30, 30.
  - `startOfBangkokDay(now: Date): Date`. This is the `today` every builder takes, and the one Bangkok day helper of Tasks 2, 3, 8 and 10.
  - `bangkokDayDiff(from: Date, to: Date): number`: whole Bangkok days from `from` to `to`, negative when `to` is the earlier day (for Tasks 2, 8 and 10).
  - `type WaitingWorkAccess = { approval: boolean; maintenance: boolean; audit: boolean; disposal: boolean; asset: boolean }`.
  - `waitingWorkVisibleKeys(access: WaitingWorkAccess, inbox: { audit: number; disposal: number }): WaitingWorkKey[]`.
  - The where builders, each typed with `import type { Prisma } from "@prisma/client"`:
    - `openRepairsWhere: Prisma.MaintenanceTicketWhereInput`, the same object as `openRepairRecordWhere`;
    - `stuckRepairsWhere: Prisma.AssetWhereInput`;
    - `duePmWhere(day: Date): Prisma.MaintenancePlanWhereInput`. Any instant of the Bangkok day gives the same where, so `now` and `startOfBangkokDay(now)` are interchangeable here;
    - `pendingAuditFindingsWhere: Prisma.AuditFindingWhereInput`;
    - `openAuditActionsWhere(today: Date, rules: WaitingWorkRules): Prisma.AuditFindingWhereInput`;
    - `auditActionsDueSoonWhere(today: Date, rules: WaitingWorkRules): Prisma.AuditFindingWhereInput`;
    - `pendingDisposalsWhere: Prisma.DisposalRequestWhereInput` and `approvedDisposalsWhere: Prisma.DisposalRequestWhereInput`;
    - `returnsDueSoonLoanWhere(today: Date, rules: WaitingWorkRules): Prisma.AssetCheckoutWhereInput`: an open temporary loan due by the cut (today's loan where, unchanged). Task 2's age reads it;
    - `returnsDueSoonAssetWhere(today: Date, rules: WaitingWorkRules): Prisma.AssetWhereInput` = `{ isActive: true, checkouts: { some: returnsDueSoonLoanWhere(today, rules) } }`. The bell counts assets with it, so Task 3's register list equals the count;
    - `warrantyExpiringSoonWhere(today: Date, rules: WaitingWorkRules): Prisma.AssetWhereInput` and `licenseExpiringSoonWhere(today: Date, rules: WaitingWorkRules): Prisma.AssetWhereInput`.
  - `buildWaitingWorkHref(locale: string, key: WaitingWorkKey): string`.
- Produces in `src/lib/waiting-work.ts`:
  - `getWaitingWorkRules(): Promise<WaitingWorkRules>`.
  - `type WaitingWork = { counts: WaitingWorkCounts; visibleKeys: WaitingWorkKey[]; rules: WaitingWorkRules; approvalInbox: ApprovalInboxCounts }`.
  - `getWaitingWork(user: SessionUser, now?: Date): Promise<WaitingWork>`. It never writes. The dashboard (Task 9) calls this, never `getNotificationCenter`.
- Changes:
  - `buildNotificationSummaryItems(locale: string, counts: WaitingWorkCounts): NotificationSummaryItem[]`.
  - `export type NotificationSummaryCounts = WaitingWorkCounts` stays as an alias.
  - `getNotificationCenter(user, locale, options?)` keeps its signature and its return shape `{ total, activeTotal, items, generatedAt }`.

- [ ] **Step 1: Write the failing tests**

Create `tests/waiting-work-rules.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { auditRoundOperationalWhere } from "../src/lib/audit-round-status.ts"
import { buildDuePmPlanWhere } from "../src/lib/preventive-maintenance.ts"
import { openRepairRecordWhere } from "../src/lib/repair-record-policy.ts"
import {
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  bangkokDayDiff,
  buildWaitingWorkHref,
  DEFAULT_WAITING_WORK_RULES,
  duePmWhere,
  licenseExpiringSoonWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  returnsDueSoonAssetWhere,
  returnsDueSoonLoanWhere,
  startOfBangkokDay,
  stuckRepairsWhere,
  WAITING_WORK_KEYS,
  waitingWorkVisibleKeys,
  warrantyExpiringSoonWhere,
  type WaitingWorkAccess,
} from "../src/lib/waiting-work-rules.ts"

const at = (iso: string) => new Date(iso)
const now = at("2026-10-26T05:00:00Z") // 12:00 on 26 Oct in Bangkok
const today = startOfBangkokDay(now)

test("one order for every surface: approvals, the two repair kinds, then the bell's order; today's default days (group 1 dashboard task 1)", () => {
  assert.deepEqual([...WAITING_WORK_KEYS], [
    "approvalInbox", "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "openAuditActions",
    "auditActionsDueSoon", "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon",
  ])
  assert.deepEqual(DEFAULT_WAITING_WORK_RULES, { returnDueSoonDays: 3, auditActionDueSoonDays: 7, warrantyExpiryDays: 30, licenseExpiryDays: 30 })
})

test("today is the start of the Bangkok day, whatever the hour, and days are counted between Bangkok days (group 1 dashboard task 1)", () => {
  assert.equal(today.toISOString(), "2026-10-25T17:00:00.000Z")
  assert.equal(startOfBangkokDay(at("2026-10-25T17:30:00Z")).toISOString(), "2026-10-25T17:00:00.000Z") // 00:30 on 26 Oct
  assert.equal(startOfBangkokDay(at("2026-10-25T16:59:00Z")).toISOString(), "2026-10-24T17:00:00.000Z") // 23:59 on 25 Oct
  assert.equal(bangkokDayDiff(at("2026-10-25T16:30:00Z"), now), 1) // 23:30 on 25 Oct to noon on 26 Oct
  assert.equal(bangkokDayDiff(at("2026-10-25T17:30:00Z"), now), 0) // 00:30 to noon on the same day
  assert.equal(bangkokDayDiff(now, at("2026-10-23T00:00:00Z")), -3)
  assert.equal(bangkokDayDiff(today, at("2026-11-12T00:00:00Z")), 17)
})

test("the rules module is client-safe: relative imports, Prisma for types only, no database (group 1 dashboard task 1)", () => {
  const seen = new Set<string>()
  const visit = (path: string) => {
    if (seen.has(path)) return
    seen.add(path)
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /from "@\//, `${path} imports through "@/"`)
    assert.doesNotMatch(source, /^import (?!type\b)[^\n]*from "@prisma\/client"/m, `${path} imports Prisma values`)
    assert.doesNotMatch(source, /\bprisma\./, `${path} reads the database`)
    for (const [, relative] of source.matchAll(/from "\.\/([^"]+\.ts)"/g)) visit(`src/lib/${relative}`)
  }
  visit("src/lib/waiting-work-rules.ts")
  assert.ok(seen.has("src/lib/preventive-maintenance.ts") && seen.has("src/lib/repair-record-policy.ts"), "the walk follows the relative imports")
})

test("the two repair kinds: open records as the maintenance list counts them, and repair statuses without an open record (spec §6.3)", () => {
  assert.equal(openRepairsWhere, openRepairRecordWhere)
  assert.deepEqual(stuckRepairsWhere, {
    isActive: true,
    status: { name: { in: ["Pending Repair", "Under Maintenance"] } },
    maintenanceTickets: { none: openRepairRecordWhere },
  })
})

test("the bell's ten kinds keep today's rules, cut at Bangkok midnight with the settings' days; returns count active assets with such a loan (group 1 dashboard task 1)", () => {
  const rules = DEFAULT_WAITING_WORK_RULES
  const openAction = { actionStatus: { in: ["planned", "in_progress"] }, auditRound: { isActive: true, status: auditRoundOperationalWhere } }
  assert.deepEqual(duePmWhere(today), buildDuePmPlanWhere(now))
  assert.deepEqual(duePmWhere(now), buildDuePmPlanWhere(now))
  assert.deepEqual(pendingAuditFindingsWhere, { reviewStatus: "pending", auditRound: { isActive: true, status: auditRoundOperationalWhere } })
  assert.deepEqual(openAuditActionsWhere(today, rules), {
    ...openAction,
    OR: [{ actionDueDate: null }, { actionDueDate: { gt: at("2026-11-01T17:00:00.000Z") } }],
  })
  assert.deepEqual(auditActionsDueSoonWhere(today, rules), { ...openAction, actionDueDate: { lte: at("2026-11-01T17:00:00.000Z") } })
  assert.deepEqual(pendingDisposalsWhere, { isActive: true, requestStatus: "pending" })
  assert.deepEqual(approvedDisposalsWhere, { isActive: true, requestStatus: "approved" })
  const dueLoan = {
    isReturned: false,
    transactionStatus: "active",
    handoverMode: "temporary_loan",
    expectedReturnDate: { lte: at("2026-10-28T17:00:00.000Z") },
  }
  assert.deepEqual(returnsDueSoonLoanWhere(today, rules), dueLoan)
  assert.deepEqual(returnsDueSoonAssetWhere(today, rules), { isActive: true, checkouts: { some: dueLoan } })
  assert.deepEqual(warrantyExpiringSoonWhere(today, rules), {
    isActive: true,
    ownershipType: { not: "software_license" },
    warrantyEndDate: { gte: today, lte: at("2026-11-24T17:00:00.000Z") },
  })
  assert.deepEqual(licenseExpiringSoonWhere(today, { ...rules, licenseExpiryDays: 60 }), {
    isActive: true,
    ownershipType: "software_license",
    warrantyEndDate: { gte: today, lte: at("2026-12-24T17:00:00.000Z") },
  })
})

test("a kind is visible by its page's permission, and the inbox hides the queues it already holds (group 1 dashboard task 1)", () => {
  const none: WaitingWorkAccess = { approval: false, maintenance: false, audit: false, disposal: false, asset: false }
  const all: WaitingWorkAccess = { approval: true, maintenance: true, audit: true, disposal: true, asset: true }
  const emptyInbox = { audit: 0, disposal: 0 }
  assert.deepEqual(waitingWorkVisibleKeys(all, emptyInbox), [...WAITING_WORK_KEYS])
  assert.deepEqual(waitingWorkVisibleKeys(none, emptyInbox), [])
  assert.deepEqual(waitingWorkVisibleKeys({ ...none, maintenance: true }, emptyInbox), ["openRepairs", "stuckRepairs", "duePm"])
  assert.deepEqual(waitingWorkVisibleKeys({ ...none, audit: true }, emptyInbox), ["pendingAuditFindings", "openAuditActions", "auditActionsDueSoon"])
  assert.deepEqual(
    waitingWorkVisibleKeys({ ...none, approval: true, audit: true, disposal: true }, { audit: 2, disposal: 1 }),
    ["approvalInbox", "openAuditActions", "auditActionsDueSoon", "approvedDisposals"],
  )
  // Returns count assets and link to the register, so asset:view gates them like warranty and licence.
  assert.deepEqual(waitingWorkVisibleKeys({ ...none, asset: true }, emptyInbox), ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"])
})

// Task 3 rewrites the five rows whose lists do not show the same count yet.
test("one link per kind: today's bell links, plus the two repair lists (spec §6.3)", () => {
  assert.deepEqual(Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, buildWaitingWorkHref("th", key)])), {
    approvalInbox: "/th/admin/approvals",
    openRepairs: "/th/maintenance?status=in_progress",
    stuckRepairs: "/th/maintenance#stuck",
    duePm: "/th/maintenance#pm-due",
    pendingAuditFindings: "/th/audit/findings?status=pending",
    openAuditActions: "/th/audit/findings?status=all",
    auditActionsDueSoon: "/th/audit/findings?status=all",
    pendingDisposals: "/th/disposal?status=pending",
    approvedDisposals: "/th/disposal?status=approved",
    returnsDueSoon: "/th/asset-management/checkin",
    warrantyExpiringSoon: "/th/assets?dataQuality=warranty&exact=1",
    licenseExpiringSoon: "/th/assets?ownershipType=software_license",
  })
  assert.equal(buildWaitingWorkHref("en", "stuckRepairs"), "/en/maintenance#stuck")
})
```

Create `tests/waiting-work-source.test.ts`:

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import {
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  DEFAULT_WAITING_WORK_RULES,
  duePmWhere,
  licenseExpiringSoonWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  returnsDueSoonAssetWhere,
  startOfBangkokDay,
  stuckRepairsWhere,
  WAITING_WORK_KEYS,
  warrantyExpiringSoonWhere,
} from "../src/lib/waiting-work-rules.ts"

// src/lib/waiting-work.ts imports "@/…" and the database, which node --test cannot load, so a resolve hook serves
// stand-ins (as in tests/notification-read-rules-route.test.ts). The database is a stub that records every call.
type Call = { call: string; args: Record<string, unknown> }
const state = {
  inbox: { total: 0, audit: 0, disposal: 0 },
  settings: [] as Array<{ key: string; value: string }>,
  counts: {} as Record<string, number>,
  calls: [] as Call[],
}
Object.assign(globalThis, { __waitingWork: state })

const mockedModuleSources = new Map<string, string>([
  ["@/lib/auth-utils", `
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
  `],
  ["@/lib/approval-inbox-query", `
    export function getApprovalInboxAccess(user) {
      const can = (permission) => user.roles.includes("system_admin") || user.permissions.includes(permission)
      const canApproveDisposal = can("disposal:approve")
      const canApproveAudit = can("audit:approve")
      return { canApproveDisposal, canApproveAudit, canAnyApproval: canApproveDisposal || canApproveAudit }
    }
    export async function getApprovalInboxCounts() { return globalThis.__waitingWork.inbox }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__waitingWork
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args })
            if (method === "count") return state().counts[name] ?? 0
            if (name === "systemSetting" && method === "findMany") return state().settings
            return null
          }
        },
      })
    }
    export const prisma = new Proxy({}, { get(_target, key) { return model(String(key)) } })
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const source = (await import(pathToFileURL("src/lib/waiting-work.ts").href)) as typeof import("../src/lib/waiting-work.ts")
const user = (permissions: string[], roles: string[] = []) => ({ id: "user-1", name: "ทดสอบ", roles, permissions, employeeId: null })
const now = new Date("2026-10-26T05:00:00Z")
const today = startOfBangkokDay(now)
const wheres = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args.where)

beforeEach(() => {
  state.inbox = { total: 0, audit: 0, disposal: 0 }
  state.settings = []
  state.counts = {}
  state.calls = []
})

test("every count uses its kind's where, with the days the settings hold, and nothing is written (group 1 dashboard task 1)", async () => {
  state.settings = [
    { key: "notification_return_due_soon_days", value: "5" },
    { key: "notification_audit_action_due_soon_days", value: "abc" },
    { key: "notification_warranty_expiry_days", value: "45" },
    { key: "notification_license_expiry_days", value: "400" },
  ]
  state.counts = { maintenanceTicket: 4, maintenancePlan: 2, asset: 1 }
  state.inbox = { total: 6, audit: 0, disposal: 0 }
  const rules = { returnDueSoonDays: 5, auditActionDueSoonDays: 7, warrantyExpiryDays: 45, licenseExpiryDays: 30 }
  const work = await source.getWaitingWork(user([], ["system_admin"]), now)
  assert.deepEqual(work.rules, rules)
  assert.deepEqual(await source.getWaitingWorkRules(), rules)
  assert.deepEqual(work.visibleKeys, [...WAITING_WORK_KEYS])
  assert.deepEqual(wheres("maintenanceTicket.count"), [openRepairsWhere])
  assert.deepEqual(wheres("maintenancePlan.count"), [duePmWhere(today)])
  assert.deepEqual(wheres("auditFinding.count"), [pendingAuditFindingsWhere, openAuditActionsWhere(today, rules), auditActionsDueSoonWhere(today, rules)])
  assert.deepEqual(wheres("disposalRequest.count"), [pendingDisposalsWhere, approvedDisposalsWhere])
  assert.deepEqual(wheres("assetCheckout.count"), [], "returns count assets, not loans")
  assert.deepEqual(wheres("asset.count"), [
    stuckRepairsWhere,
    returnsDueSoonAssetWhere(today, rules),
    warrantyExpiringSoonWhere(today, rules),
    licenseExpiringSoonWhere(today, rules),
  ])
  assert.deepEqual(Object.keys(work.counts), [...WAITING_WORK_KEYS])
  assert.deepEqual([work.counts.approvalInbox, work.counts.openRepairs, work.counts.duePm, work.counts.returnsDueSoon], [6, 4, 2, 1])
  assert.equal(state.calls.some((entry) => /\.(?:update|upsert|create|delete)/.test(entry.call)), false, "the source never writes")
})

test("permissions decide what a person sees, and the inbox hides the queues it already holds (group 1 dashboard task 1)", async () => {
  state.inbox = { total: 3, audit: 2, disposal: 1 }
  let work = await source.getWaitingWork(user(["disposal:approve", "audit:approve", "audit:view", "disposal:view"]), now)
  assert.deepEqual(work.visibleKeys, ["approvalInbox", "openAuditActions", "auditActionsDueSoon", "approvedDisposals"])
  assert.deepEqual(work.approvalInbox, { total: 3, audit: 2, disposal: 1 })
  assert.deepEqual([work.counts.approvalInbox, work.counts.pendingAuditFindings, work.counts.pendingDisposals], [3, 0, 0])
  assert.deepEqual(wheres("auditFinding.count"), [
    openAuditActionsWhere(today, DEFAULT_WAITING_WORK_RULES),
    auditActionsDueSoonWhere(today, DEFAULT_WAITING_WORK_RULES),
  ])
  assert.deepEqual(wheres("disposalRequest.count"), [approvedDisposalsWhere])

  state.calls = []
  state.inbox = { total: 0, audit: 0, disposal: 0 }
  state.counts = { maintenanceTicket: 2, asset: 1 }
  work = await source.getWaitingWork(user(["maintenance:view"]), now)
  assert.deepEqual(work.visibleKeys, ["openRepairs", "stuckRepairs", "duePm"])
  assert.deepEqual(
    state.calls.map((entry) => entry.call).filter((call) => !call.startsWith("systemSetting.")),
    ["maintenanceTicket.count", "asset.count", "maintenancePlan.count"],
  )
  assert.deepEqual([work.counts.openRepairs, work.counts.stuckRepairs, work.counts.warrantyExpiringSoon], [2, 1, 0])

  work = await source.getWaitingWork(user(["asset:view"]), now)
  assert.deepEqual(work.visibleKeys, ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"])
  work = await source.getWaitingWork(user(["checkout:view"]), now)
  assert.deepEqual(work.visibleKeys, [], "checkout:view alone no longer sees returns: they count assets")
  work = await source.getWaitingWork(user([]), now)
  assert.deepEqual(work.visibleKeys, [])
  assert.ok(Object.values(work.counts).every((count) => count === 0))
})
```

Replace `tests/notification-summary.test.ts` with:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

import { buildDailyDigestMessage } from "../src/lib/notification-digest-format.ts"
import { buildNotificationSummaryItems } from "../src/lib/notification-summary-items.ts"
import { buildWaitingWorkHref, WAITING_WORK_KEYS, type WaitingWorkCounts, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"

function emptyCounts(): WaitingWorkCounts {
  return Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, 0])) as WaitingWorkCounts
}

test("adds approval inbox notification when approval detail counts are already suppressed", () => {
  const items = buildNotificationSummaryItems("th", { ...emptyCounts(), approvalInbox: 4, duePm: 1 })
  assert.deepEqual(items.map((item) => item.key), ["approvalInbox", "duePm"])
  assert.equal(items[0].href, "/th/admin/approvals")
  assert.equal(items[0].tone, "danger")
})

test("keeps direct pending approval notifications when approval inbox has no actionable items", () => {
  const items = buildNotificationSummaryItems("en", { ...emptyCounts(), pendingAuditFindings: 1, pendingDisposals: 2 })
  assert.deepEqual(items.map((item) => [item.key, item.href]), [
    ["pendingAuditFindings", "/en/audit/findings?status=pending"],
    ["pendingDisposals", "/en/disposal?status=pending"],
  ])
})

test("PM due within the reminder window links to the maintenance page", () => {
  const items = buildNotificationSummaryItems("th", { ...emptyCounts(), duePm: 2 })
  assert.deepEqual(items.map((item) => [item.key, item.href, item.tone]), [["duePm", "/th/maintenance#pm-due", "warning"]])
})

test("the two repair kinds follow approvals, and every row links where the shared source says (group 1 dashboard task 1, spec §6.3)", () => {
  const every = Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, 1])) as WaitingWorkCounts
  const items = buildNotificationSummaryItems("th", every)
  assert.deepEqual(items.map((item) => item.key), [...WAITING_WORK_KEYS])
  assert.deepEqual(items.slice(0, 3).map((item) => [item.key, item.href, item.tone]), [
    ["approvalInbox", "/th/admin/approvals", "danger"],
    ["openRepairs", "/th/maintenance?status=in_progress", "warning"],
    ["stuckRepairs", "/th/maintenance#stuck", "warning"],
  ])
  for (const item of items) assert.equal(item.href, buildWaitingWorkHref("th", item.key as WaitingWorkKey), item.key)
  assert.deepEqual(buildNotificationSummaryItems("th", emptyCounts()), [])
})

test("return reminders count temporary loans only", () => {
  const source = readFileSync("src/lib/waiting-work-rules.ts", "utf8")
  assert.match(source, /handoverMode:\s*"temporary_loan"/)
})

test("the bell counts nothing itself: getNotificationCenter reads the waiting-work source (group 1 dashboard task 1)", () => {
  const source = readFileSync("src/lib/notification-summary.ts", "utf8")
  assert.match(source, /const \{ counts \} = await getWaitingWork\(user\)/)
  assert.match(source, /key: \{ in: \[\.\.\.WAITING_WORK_KEYS\] \}/)
  assert.doesNotMatch(source, /\.count\(|systemSetting|startOfToday|addDays/)
})

test("every waiting kind has its title and detail in both languages, and the digest names it (group 1 dashboard task 1)", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { notifications: Record<string, unknown> }
    for (const key of WAITING_WORK_KEYS) {
      assert.equal(typeof messages.notifications[key], "string", `${locale}: notifications.${key}`)
      assert.equal(typeof messages.notifications[`${key}Detail`], "string", `${locale}: notifications.${key}Detail`)
      const line = buildDailyDigestMessage(locale, [{ key, count: 1, href: "/", tone: "warning" }]).split("\n")[1]
      assert.notEqual(line, `- ${key}: 1`, `${locale}: the digest has a label for ${key}`)
    }
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as { notifications: Record<string, string> }
  assert.equal(th.notifications.openRepairs, "ซ่อมยังไม่เสร็จ")
  assert.equal(th.notifications.stuckRepairs, "รอซ่อมแต่ยังไม่มีบันทึกซ่อม")
})
```

In `tests/notification-groups.test.ts`:
- Add `import { WAITING_WORK_KEYS } from "../src/lib/waiting-work-rules.ts"`.
- Replace the first test (:6-14) with:

```ts
test("the decide group holds the approval inbox only; the two repair kinds lead the follow group (menu B shell task 2, group 1 dashboard task 1)", () => {
  assert.deepEqual([...DECIDE_NOTIFICATION_KEYS], ["approvalInbox"])
  const items = WAITING_WORK_KEYS.map((key) => ({ key }))
  const groups = groupNotificationItems(items)
  assert.deepEqual(groups.decide.map((item) => item.key), ["approvalInbox"])
  assert.deepEqual(groups.follow.map((item) => item.key), [
    "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon",
    "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon",
  ])
  assert.equal(groups.decide[0], items[0]) // the same objects, not copies
  assert.deepEqual(groupNotificationItems([]), { decide: [], follow: [] })
})
```

In `tests/notification-read-rules-route.test.ts`:
- The `@/lib/approval-inbox-query` stand-in (:25-27) gains `export function getApprovalInboxAccess() { return { canApproveDisposal: true, canApproveAudit: true, canAnyApproval: true } }`. `waiting-work.ts` imports it, and an ES module that names a missing export fails to link.
- :98 becomes `const WAITING_KEYS = ["approvalInbox", "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"]`.
- :118 reads `{ userId: "user-1", key: { in: WAITING_KEYS } }`.
- The `@/lib/db` stub's count (:35) answers per where, because the returns row now counts `asset` rows and the read_all test still needs that row at 1 while the other three asset kinds stay at 0:

  ```js
  if (method === "count") return name === "asset" && args?.where?.checkouts ? state().counts.assetReturns ?? 0 : state().counts[name] ?? 0
  ```

  Only `returnsDueSoonAssetWhere` has a top-level `checkouts` (`stuckRepairsWhere`, `warrantyExpiringSoonWhere` and `licenseExpiringSoonWhere` do not), so `assetReturns` feeds the returns row alone.
- The read_all test's seed (:144) becomes `state.counts = { maintenancePlan: 1, assetReturns: 1 }`. The returns row is listed at 1, so its expected upsert (`returnsDueSoon` with `lastCount: 1`, :159-163) and the `approvalInbox` upsert before it hold unchanged; `duePm` is already read at 1, so it is not upserted. Seeding `asset: 1` instead would also make `stuckRepairs`, `warrantyExpiringSoon` and `licenseExpiringSoon` 1 and add three upserts.
- The other two tests seed no counts (`state.counts = {}` in `beforeEach`), so every count, the returns row's included, stays 0 under the new stub: their item list, drops and `updateMany` calls stay as pinned. The stub counts 0 for `maintenanceTicket` and for `asset` without `checkouts`, so the two repair kinds list nothing in any of the three tests.

Replace `tests/notification-maintenance-query.test.ts:5-9` with:

```ts
test("maintenance notifications remind about due PM instead of SLA or closure", () => {
  const source = ["src/lib/waiting-work-rules.ts", "src/lib/waiting-work.ts"].map((path) => readFileSync(path, "utf8")).join("\n")
  assert.match(source, /buildDuePmPlanWhere\(/)
  assert.doesNotMatch(source, /dueDate|completedMaintenanceAwaitingClose|overdueMaintenance/)
})
```

In `tests/notification-digest.test.ts`, after the test that ends at :24:

```ts
test("the digest names the two repair kinds (group 1 dashboard task 1)", () => {
  const items = [
    { key: "openRepairs", count: 2, href: "/th/maintenance?status=in_progress", tone: "warning" as const },
    { key: "stuckRepairs", count: 1, href: "/th/maintenance#stuck", tone: "warning" as const },
  ]
  assert.match(buildDailyDigestMessage("th", items), /- ซ่อมยังไม่เสร็จ: 2\n- รอซ่อมแต่ยังไม่มีบันทึกซ่อม: 1/)
  assert.match(buildDailyDigestMessage("en", items), /- Repairs in progress: 2\n- Awaiting repair without a repair record: 1/)
})
```

In `tests/repair-record-list-ui.test.ts`, the pin at :21 becomes three:

```ts
  assert.match(source, /^import \{[^}]*\bstuckRepairsWhere\b[^}]*\} from "@\/lib\/waiting-work-rules"$/m)
  assert.equal(source.match(/where: stuckRepairsWhere/g)?.length, 2, "the stuck list and its count use the bell's where (group 1 dashboard task 1)")
  assert.match(readFileSync("src/lib/waiting-work-rules.ts", "utf8"), /maintenanceTickets: \{ none: openRepairRecordWhere \}/)
```

The links and wheres now live in `src/lib/waiting-work-rules.ts`, so three path pins change. Their assertions stay as they are:
- `tests/asset-register-ux.test.ts:84`: `const notifications = read("src/lib/waiting-work-rules.ts")`. Its three checks at :91-93 still hold, because `buildWaitingWorkHref` writes `buildExactAssetRegisterHref(locale, { dataQuality: "warranty" })` in that exact form.
- `tests/asset-transaction-cancellation-routes.test.ts:29`: `"src/lib/waiting-work-rules.ts"` (the open-loan where: `isReturned: false` and `transactionStatus: "active"` within 180 characters).
- `tests/audit-round-cancellation.test.ts:129`: `"src/lib/waiting-work-rules.ts"` (`auditRoundOperationalWhere`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/waiting-work-rules.test.ts tests/waiting-work-source.test.ts tests/notification-summary.test.ts tests/notification-groups.test.ts tests/notification-read-rules-route.test.ts tests/notification-maintenance-query.test.ts tests/notification-digest.test.ts tests/repair-record-list-ui.test.ts tests/asset-register-ux.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/audit-round-cancellation.test.ts`
Expected: FAIL.
- The first four files cannot find `../src/lib/waiting-work-rules.ts`.
- The path pins fail with ENOENT on `src/lib/waiting-work-rules.ts`.
- The route test fails on the 12 keys.
- The digest test fails on "ซ่อมยังไม่เสร็จ".

- [ ] **Step 3: Add the messages**

Through `node scripts/messages-edit.mjs <changes.json>`, set in `notifications`. The two details of `openRepairs` repeat today's `dashboard.openRepairsDetail` and `workCenter.openRepairsDetail` word for word, so Task 4 can point the work center at these keys without new words.

| Key | th | en |
|---|---|---|
| `openRepairs` | ซ่อมยังไม่เสร็จ | Repairs in progress |
| `openRepairsDetail` | บันทึกซ่อมที่รอกด "ซ่อมเสร็จ" | Repair records waiting to be marked finished |
| `stuckRepairs` | รอซ่อมแต่ยังไม่มีบันทึกซ่อม | Awaiting repair without a repair record |
| `stuckRepairsDetail` | สถานะรอซ่อมหรืออยู่ระหว่างซ่อม แต่ไม่มีบันทึกซ่อมที่เปิดอยู่ บันทึกซ่อมให้สถานะกับประวัติตรงกัน | In Pending Repair or Under Maintenance with no open repair record. Record the repair so status and history match |

Glossary check: บันทึกซ่อม (not แจ้งซ่อม), no ตรวจทาน, no bare English. The status words are the seed's `nameTh` ("รอซ่อม", "อยู่ระหว่างซ่อม", `prisma/seed.ts:23-24`).

- [ ] **Step 4: Implement**

**`src/lib/waiting-work-rules.ts`**
- Imports, relative only. All four modules, and `repair-record-policy.ts`'s own chain (`asset-lifecycle-policy.ts`, `asset-handover-mode.ts`), import nothing through `@/` and Prisma for types only, so the client-safe test passes:
  - `./repair-record-policy.ts`;
  - `./preventive-maintenance.ts` (`buildDuePmPlanWhere`, `getBangkokDateKey`);
  - `./audit-round-status.ts`;
  - `./asset-register-view-memory.ts`;
  - `import type { Prisma } from "@prisma/client"`.
- `startOfBangkokDay(now)`: `new Date(`${getBangkokDateKey(now)}T00:00:00.000+07:00`)`.
- `bangkokDayDiff(from, to)`: `(Date.parse(getBangkokDateKey(to)) − Date.parse(getBangkokDateKey(from))) / 86 400 000`. Both keys parse as UTC midnights, so the result is a whole number.
- A private `addDays(date, days)` adds `days × 86 400 000` ms. Bangkok has no daylight saving, so on the Bangkok server this equals today's `setDate` (`notification-summary.ts:186-190`).
- The wheres are today's objects moved verbatim, with the values the Step 1 test pins:
  - `openRepairsWhere = openRepairRecordWhere`;
  - `stuckRepairsWhere`: from `maintenance/page.tsx:46-50`;
  - `duePmWhere(day) = buildDuePmPlanWhere(day)`;
  - `pendingAuditFindingsWhere`: `notification-summary.ts:71`;
  - `openAuditActionsWhere` and `auditActionsDueSoonWhere`: `:74-92`. They share one open-action base and split it at `today + auditActionDueSoonDays`. An action that has no due date, or is due after the cut, is open; an action due on or before the cut is due soon;
  - `pendingDisposalsWhere` and `approvedDisposalsWhere`: `:95,97`;
  - `returnsDueSoonLoanWhere`: the loan where of `:100-105`, written as one object literal so `isReturned: false` and `transactionStatus: "active"` stay within the 180 characters `tests/asset-transaction-cancellation-routes.test.ts:36` reads;
  - `returnsDueSoonAssetWhere`: new. `{ isActive: true, checkouts: { some: returnsDueSoonLoanWhere(today, rules) } }` (`checkouts` is the `Asset` → `AssetCheckout` relation, `prisma/schema.prisma:302`). It counts each active asset once, however many open loans it has, and leaves out loans of inactive assets;
  - `warrantyExpiringSoonWhere` and `licenseExpiringSoonWhere`: `:110-123`.
- `waitingWorkVisibleKeys` keeps `WAITING_WORK_KEYS` order and lists a key when:

  | Key | Visible when |
  |---|---|
  | `approvalInbox` | `access.approval` |
  | `openRepairs`, `stuckRepairs`, `duePm` | `access.maintenance` |
  | `pendingAuditFindings` | `access.audit && inbox.audit === 0` |
  | `openAuditActions`, `auditActionsDueSoon` | `access.audit` |
  | `pendingDisposals` | `access.disposal && inbox.disposal === 0` |
  | `approvedDisposals` | `access.disposal` |
  | `returnsDueSoon`, `warrantyExpiringSoon`, `licenseExpiringSoon` | `access.asset` |

- `buildWaitingWorkHref`: one `Record<WaitingWorkKey, (locale) => string>` table holding the hrefs the Step 1 test pins. The 10 bell rows come from `notification-summary-items.ts:31-85` as they are, written as `` `/${locale}/…` `` template strings, and warranty as `buildExactAssetRegisterHref(locale, { dataQuality: "warranty" })` (`tests/asset-register-ux.test.ts:93` reads that form).

**`src/lib/waiting-work.ts`**
- Imports:
  - `prisma` from `@/lib/db`;
  - `hasPermission` and `type SessionUser` from `@/lib/auth-utils`;
  - `getApprovalInboxAccess`, `getApprovalInboxCounts` and `type ApprovalInboxCounts` from `@/lib/approval-inbox-query`;
  - the four `notification*DaysKey` and `notificationRuleSettingKeys` from `@/lib/system-setting-defaults`;
  - the rules module from `@/lib/waiting-work-rules`.
- `getWaitingWorkRules()`: the read of `notification-summary.ts:192-211`, moved:
  - one `systemSetting.findMany({ where: { key: { in: [...notificationRuleSettingKeys] } }, select: { key: true, value: true } })`;
  - each value an integer 0–365, else the default from `DEFAULT_WAITING_WORK_RULES`;
  - mapped `notificationReturnDueSoonDaysKey` → `returnDueSoonDays`, `notificationAuditActionDueSoonDaysKey` → `auditActionDueSoonDays`, `notificationWarrantyExpiryDaysKey` → `warrantyExpiryDays`, `notificationLicenseExpiryDaysKey` → `licenseExpiryDays`.
- `getWaitingWork(user, now = new Date())`:
  1. `today = startOfBangkokDay(now)`.
  2. `[rules, approvalInbox] = await Promise.all([getWaitingWorkRules(), getApprovalInboxCounts(user)])`.
  3. `access`, from today's gates (`notification-summary.ts:50-54`) less `canCheckout`:
     - `approval: getApprovalInboxAccess(user).canAnyApproval`;
     - `maintenance`, `audit`, `disposal`, `asset`: `hasPermission(user, <module>, "view")`.
     - Returns now count assets and Task 3 links them to the register, so they follow `asset:view`. Today's `checkout:view || asset:view` gate (`:53`) goes, and a person with `checkout:view` alone stops seeing the row.
  4. `visibleKeys = waitingWorkVisibleKeys(access, approvalInbox)`.
  5. One `prisma.<model>.count({ where: <builder> })` for each visible key except `approvalInbox`, all started in `WAITING_WORK_KEYS` order inside one `Promise.all`. The test reads the calls in that order. `returnsDueSoon` is `prisma.asset.count({ where: returnsDueSoonAssetWhere(today, rules) })`; nothing counts `assetCheckout` any more.
  6. `counts` holds all 12 keys in `WAITING_WORK_KEYS` order. A hidden key is 0. `approvalInbox` is `approvalInbox.total` when visible.
- No `update`, `upsert`, `create` or `delete` anywhere in the file. No identifier spelled `dueDate` (`tests/notification-maintenance-query.test.ts` bans it: the repair SLA is not waiting work).

**`src/lib/notification-summary.ts`**
- `getNotificationCenter`: `const { counts } = await getWaitingWork(user)`, then `buildNotificationSummaryItems(locale, counts)`.
- The state read uses `key: { in: [...WAITING_WORK_KEYS] }`.
- The drops read `WAITING_WORK_KEYS.map((key) => ({ key, count: counts[key] }))`.
- The rest of the function stays as it is: the `recordCountDrops` guard, the guarded `updateMany`, the merge and the return.
- Delete `openAuditActionStatuses`, `defaultNotificationRuleDays`, `startOfToday`, `addDays`, `getNotificationRuleSettings` and `parseNotificationDays`, and the imports only they used.

**`src/lib/notification-summary-items.ts`**
- Import from `./waiting-work-rules.ts` only.
- Add `export type NotificationSummaryCounts = WaitingWorkCounts`.
- A private `Record<WaitingWorkKey, NotificationSummaryItem["tone"]>`: today's tones (:32-86), plus `openRepairs: "warning"` and `stuckRepairs: "warning"`.
- `buildNotificationSummaryItems` maps `WAITING_WORK_KEYS` to `{ key, count: counts[key], href: buildWaitingWorkHref(locale, key), tone }` and keeps `count > 0`.

**`src/lib/notification-digest-format.ts:30-55`**
- Add to `th`: `openRepairs: "ซ่อมยังไม่เสร็จ"` and `stuckRepairs: "รอซ่อมแต่ยังไม่มีบันทึกซ่อม"`.
- Add to `en`: `openRepairs: "Repairs in progress"` and `stuckRepairs: "Awaiting repair without a repair record"`.
- Write them after `approvalInbox`, in the shared order.
- `tests/disposal-sweep-ui.test.ts:204-209` still finds its four disposal lines.

**`src/app/[locale]/(dashboard)/maintenance/page.tsx`**
- Delete the local `stuckAssetWhere` (:46-50).
- Add `import { stuckRepairsWhere } from "@/lib/waiting-work-rules"`.
- :96 and :101 read `where: stuckRepairsWhere`.
- Remove `openRepairRecordWhere` from the :18 import (it has no other use in the page).
- Nothing else in the page moves, so the stuck section's pins (`tests/maintenance-sweep-ui.test.ts:52-80`) hold.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/waiting-work-rules.test.ts tests/waiting-work-source.test.ts tests/notification-summary.test.ts tests/notification-groups.test.ts tests/notification-read-rules-route.test.ts tests/notification-maintenance-query.test.ts tests/notification-digest.test.ts tests/repair-record-list-ui.test.ts tests/asset-register-ux.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/audit-round-cancellation.test.ts tests/disposal-sweep-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, the whole unit suite. tsc is clean (the tests are type-checked too, so every counts literal uses `emptyCounts()`). Lint has no errors, and no import is left unused in the maintenance page or the summary.

- [ ] **Step 6: Commit**

```bash
git add src/lib/waiting-work-rules.ts src/lib/waiting-work.ts src/lib/notification-summary.ts src/lib/notification-summary-items.ts src/lib/notification-digest-format.ts "src/app/[locale]/(dashboard)/maintenance/page.tsx" messages/th.json messages/en.json tests/waiting-work-rules.test.ts tests/waiting-work-source.test.ts tests/notification-summary.test.ts tests/notification-groups.test.ts tests/notification-read-rules-route.test.ts tests/notification-maintenance-query.test.ts tests/notification-digest.test.ts tests/repair-record-list-ui.test.ts tests/asset-register-ux.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/audit-round-cancellation.test.ts
git commit -m "feat(notifications): one waiting-work source for the bell, with open and stuck repairs (group 1 dashboard task 1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: How old each waiting kind is

**Files:**
- Modify: `src/lib/waiting-work-rules.ts` (adds the age type and three pure helpers)
- Modify: `src/lib/waiting-work.ts` (adds `getWaitingWorkAges`)
- Modify: `src/lib/approval-inbox-query.ts`:
  - :24-26 and :36-38 (the snapshot reads the two shared wheres)
  - a new `getApprovalInboxOldest` after `getApprovalInboxCounts` (:83-89)
  - :92-106 (the count reads the shared wheres and the ready rounds' list)
  - :139-146 (`getReadyAuditRoundCloseCount` becomes `getReadyAuditRoundsForClose`, which keeps each round's `updatedAt`)
- Test:
  - `tests/waiting-work-rules.test.ts` (three tests added)
  - `tests/waiting-work-source.test.ts` (stand-ins extended, two tests added)
  - `tests/approval-inbox.test.ts` (one test after :115)
  - `tests/notification-read-rules-route.test.ts:25-27` (the stand-in gains `getApprovalInboxOldest`)

**Interfaces:**
- Consumes:
  - Task 1's `WAITING_WORK_KEYS`, `startOfBangkokDay`, `bangkokDayDiff` and every where builder (`returnsDueSoonLoanWhere` for the returns age).
  - `workflowApprovalDefaults` (`src/lib/workflow-approval.ts:23`).
- Produces in `src/lib/waiting-work-rules.ts` (for Task 9):
  - `type WaitingWorkAge = { kind: "age"; days: number; overdue: boolean } | { kind: "due"; days: number; overdue: boolean } | { kind: "expires"; date: Date; days: number }`.
  - `waitingWorkAgeFrom(key: WaitingWorkKey, oldest: Date | null, today: Date, slaDays: number): WaitingWorkAge | null`.
  - `earliestDate(dates: readonly (Date | null | undefined)[]): Date | null`.
  - `stuckRepairsOldestSince(assets: readonly { id: string; statusId: string; updatedAt: Date }[], movements: readonly { assetId: string; toValue: string | null; _max: { performedAt: Date | null } }[]): Date | null`.
- Produces in `src/lib/waiting-work.ts`:
  - `getWaitingWorkAges(user: SessionUser, visibleKeys: readonly WaitingWorkKey[], rules: WaitingWorkRules, now?: Date): Promise<Partial<Record<WaitingWorkKey, WaitingWorkAge>>>`.
  - It reads every key it is given. The caller (Task 9) asks only for the kinds with a count above 0: `visibleKeys.filter((key) => counts[key] > 0)`.
- Produces in `src/lib/approval-inbox-query.ts`:
  - `getApprovalInboxOldest(user: SessionUser): Promise<{ oldest: Date | null; slaDays: number }>`.

- [ ] **Step 1: Write the failing tests**

In `tests/waiting-work-rules.test.ts`:
- Add to the imports: `earliestDate`, `stuckRepairsOldestSince` and `waitingWorkAgeFrom` from the rules module, and `import { getApprovalAgeStatus } from "../src/lib/approval-aging.ts"`.
- Append:

```ts
test("each kind's age: days since its oldest record, days to its earliest due date, or its earliest expiry (spec §6.3)", () => {
  const kinds = Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, waitingWorkAgeFrom(key, at("2026-10-20T05:00:00Z"), today, 3)?.kind]))
  assert.deepEqual(kinds, {
    approvalInbox: "age", openRepairs: "age", stuckRepairs: "age", duePm: "due",
    pendingAuditFindings: "age", openAuditActions: "due", auditActionsDueSoon: "due",
    pendingDisposals: "age", approvedDisposals: "age", returnsDueSoon: "due",
    warrantyExpiringSoon: "expires", licenseExpiringSoon: "expires",
  })
  assert.equal(waitingWorkAgeFrom("duePm", null, today, 3), null)
  // Bangkok days: 23:30 on 25 Oct is one day old today, 00:30 on 26 Oct is none.
  assert.deepEqual(waitingWorkAgeFrom("openRepairs", at("2026-10-25T16:30:00Z"), today, 3), { kind: "age", days: 1, overdue: false })
  assert.deepEqual(waitingWorkAgeFrom("openRepairs", at("2026-10-25T17:30:00Z"), today, 3), { kind: "age", days: 0, overdue: false })
  // Only approvals carry the SLA: a pending disposal 12 days old is old, not overdue.
  assert.deepEqual(waitingWorkAgeFrom("pendingDisposals", at("2026-10-14T05:00:00Z"), today, 3), { kind: "age", days: 12, overdue: false })
  assert.deepEqual(waitingWorkAgeFrom("duePm", at("2026-10-23T00:00:00Z"), today, 3), { kind: "due", days: -3, overdue: true })
  assert.deepEqual(waitingWorkAgeFrom("auditActionsDueSoon", at("2026-10-26T10:00:00Z"), today, 3), { kind: "due", days: 0, overdue: false })
  assert.deepEqual(waitingWorkAgeFrom("returnsDueSoon", at("2026-10-28T03:00:00Z"), today, 3), { kind: "due", days: 2, overdue: false })
  assert.deepEqual(waitingWorkAgeFrom("licenseExpiringSoon", at("2026-11-12T00:00:00Z"), today, 3), { kind: "expires", date: at("2026-11-12T00:00:00Z"), days: 17 })
})

// Counted on Bangkok days directly; at Bangkok noon getApprovalAgeStatus (server-local days) gives the same answer.
test("approvals are overdue once their Bangkok age passes the SLA, as getApprovalAgeStatus says at Bangkok noon (spec §6.3)", () => {
  for (const [requested, days, overdue] of [["2026-10-14T05:00:00Z", 12, true], ["2026-10-23T05:00:00Z", 3, false], ["2026-10-22T05:00:00Z", 4, true]] as const) {
    assert.deepEqual(waitingWorkAgeFrom("approvalInbox", at(requested), today, 3), { kind: "age", days, overdue })
    assert.equal(getApprovalAgeStatus(at(requested), now, 3).isOverdue, overdue, requested)
  }
})

test("the earliest of several dates, and a stuck asset dates from its move into its current status (spec §6.3)", () => {
  assert.equal(earliestDate([]), null)
  assert.deepEqual(earliestDate([null, at("2026-10-20T00:00:00Z"), undefined, at("2026-10-18T00:00:00Z")]), at("2026-10-18T00:00:00Z"))
  const assets = [
    { id: "a1", statusId: "s-pending", updatedAt: at("2026-10-20T05:00:00Z") },
    { id: "a2", statusId: "s-under", updatedAt: at("2026-10-24T05:00:00Z") },
  ]
  // a2 once moved into s-pending, but it sits in s-under now with no movement into it, so its last edit counts.
  const movements = [
    { assetId: "a1", toValue: "s-pending", _max: { performedAt: at("2026-10-16T05:00:00Z") } },
    { assetId: "a2", toValue: "s-pending", _max: { performedAt: at("2026-10-10T05:00:00Z") } },
  ]
  assert.deepEqual(stuckRepairsOldestSince(assets, movements), at("2026-10-16T05:00:00Z"))
  assert.deepEqual(stuckRepairsOldestSince([assets[1]], movements), at("2026-10-24T05:00:00Z"))
  assert.equal(stuckRepairsOldestSince([], movements), null)
})
```

Extend `tests/waiting-work-source.test.ts`:
- `state` gains:
  - `oldestApproval: { oldest: null as Date | null, slaDays: 3 }`;
  - `mins: {} as Record<string, Date | null>`, keyed `"<model>.<field>"`;
  - `rows: {} as Record<string, unknown[]>`, keyed by model, or `"<model>.groupBy"`.
- `beforeEach` resets the three.
- The `@/lib/approval-inbox-query` stand-in gains `export async function getApprovalInboxOldest() { return globalThis.__waitingWork.oldestApproval }`.
- In the `@/lib/db` stand-in, before `return null`:

  ```js
  if (method === "aggregate") return { _min: Object.fromEntries(Object.keys(args._min).map((field) => [field, state().mins[name + "." + field] ?? null])) }
  if (method === "groupBy") return state().rows[name + ".groupBy"] ?? []
  if (method === "findMany") return state().rows[name] ?? []
  ```

- Add `returnsDueSoonLoanWhere` to the rules import. The age values come from the pure rule above.
- Add these tests:

```ts
test("each kind's age is one _min aggregate over its count's own where; returns read only loans of active assets (group 1 dashboard task 2)", async () => {
  const rules = DEFAULT_WAITING_WORK_RULES
  state.mins = {
    "maintenanceTicket.reportedDate": new Date("2026-10-14T05:00:00Z"),
    "maintenancePlan.nextDueDate": new Date("2026-10-23T00:00:00Z"),
    "assetCheckout.expectedReturnDate": new Date("2026-10-28T03:00:00Z"),
    "asset.warrantyEndDate": new Date("2026-11-12T00:00:00Z"),
  }
  const keys = ["openRepairs", "duePm", "returnsDueSoon", "warrantyExpiringSoon"] as const
  const ages = await source.getWaitingWorkAges(user(["maintenance:view", "asset:view"]), keys, rules, now)
  assert.deepEqual(state.calls.map((entry) => entry.call), [
    "maintenanceTicket.aggregate", "maintenancePlan.aggregate", "assetCheckout.aggregate", "asset.aggregate",
  ])
  assert.deepEqual(state.calls.map((entry) => entry.args), [
    { where: openRepairsWhere, _min: { reportedDate: true } },
    { where: duePmWhere(today), _min: { nextDueDate: true } },
    { where: { ...returnsDueSoonLoanWhere(today, rules), asset: { isActive: true } }, _min: { expectedReturnDate: true } },
    { where: warrantyExpiringSoonWhere(today, rules), _min: { warrantyEndDate: true } },
  ])
  assert.deepEqual(ages, {
    openRepairs: { kind: "age", days: 12, overdue: false },
    duePm: { kind: "due", days: -3, overdue: true },
    returnsDueSoon: { kind: "due", days: 2, overdue: false },
    warrantyExpiringSoon: { kind: "expires", date: new Date("2026-11-12T00:00:00Z"), days: 17 },
  })
})

test("approvals take the inbox's oldest and its SLA, stuck repairs date from the move into their status, and an empty aggregate gives no age (group 1 dashboard task 2)", async () => {
  state.oldestApproval = { oldest: new Date("2026-10-22T05:00:00Z"), slaDays: 3 }
  state.rows = {
    asset: [
      { id: "a1", statusId: "s-pending", updatedAt: new Date("2026-10-20T05:00:00Z") },
      { id: "a2", statusId: "s-under", updatedAt: new Date("2026-10-24T05:00:00Z") },
    ],
    "assetMovement.groupBy": [{ assetId: "a1", toValue: "s-pending", _max: { performedAt: new Date("2026-10-16T05:00:00Z") } }],
  }
  const ages = await source.getWaitingWorkAges(user([]), ["approvalInbox", "stuckRepairs", "pendingDisposals", "approvedDisposals"], DEFAULT_WAITING_WORK_RULES, now)
  const argsOf = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
  assert.deepEqual(argsOf("asset.findMany"), [{ where: stuckRepairsWhere, select: { id: true, statusId: true, updatedAt: true } }])
  assert.deepEqual(argsOf("assetMovement.groupBy"), [{
    by: ["assetId", "toValue"],
    where: { assetId: { in: ["a1", "a2"] }, toValue: { in: ["s-pending", "s-under"] } },
    _max: { performedAt: true },
  }])
  assert.deepEqual(argsOf("disposalRequest.aggregate"), [
    { where: pendingDisposalsWhere, _min: { requestDate: true } },
    { where: approvedDisposalsWhere, _min: { approvedAt: true } },
  ])
  assert.deepEqual(ages, {
    approvalInbox: { kind: "age", days: 4, overdue: true },
    stuckRepairs: { kind: "age", days: 10, overdue: false },
  })

  state.calls = []
  state.rows = {}
  assert.deepEqual(await source.getWaitingWorkAges(user([]), ["stuckRepairs"], DEFAULT_WAITING_WORK_RULES, now), {})
  assert.deepEqual(state.calls.map((entry) => entry.call), ["asset.findMany"], "no stuck asset, so no movement read")
})
```

In `tests/approval-inbox.test.ts`, after the test that ends at :115:

```ts
test("the inbox's oldest request reads the same queues, gates and wheres as its count (group 1 dashboard task 2)", () => {
  const src = readFileSync("src/lib/approval-inbox-query.ts", "utf8").replace(/\r/g, "")
  assert.match(src, /export async function getApprovalInboxOldest\(user: SessionUser\): Promise<\{ oldest: Date \| null; slaDays: number \}>/)
  assert.equal(src.match(/where: pendingDisposalApprovalWhere\b/g)?.length, 3, "the snapshot list, the count and the oldest")
  assert.equal(src.match(/where: pendingFindingApprovalWhere\(user\.id\)/g)?.length, 3, "the snapshot list, the count and the oldest")
  assert.equal(src.match(/getReadyAuditRoundsForClose\(user\.id\)/g)?.length, 2, "the count and the oldest")
  assert.equal(src.match(/access\.canApproveDisposal && policy\.disposalRequired/g)?.length, 3)
  assert.equal(src.match(/access\.canApproveAudit && policy\.auditCloseRequired/g)?.length, 3)
  assert.match(src, /_min: \{ requestDate: true \}/)
  assert.match(src, /_min: \{ reportedAt: true \}/)
  assert.doesNotMatch(src, /getReadyAuditRoundCloseCount/)
})
```

In `tests/notification-read-rules-route.test.ts`, the `@/lib/approval-inbox-query` stand-in (:25-27) gains `export async function getApprovalInboxOldest() { return { oldest: null, slaDays: 3 } }`. `waiting-work.ts` now imports it.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/waiting-work-rules.test.ts tests/waiting-work-source.test.ts tests/approval-inbox.test.ts`
Expected: FAIL.
- `waitingWorkAgeFrom`, `earliestDate`, `stuckRepairsOldestSince` and `source.getWaitingWorkAges` are not exported (a SyntaxError on the import, or "is not a function").
- The approval-inbox pin finds no `getApprovalInboxOldest`.

- [ ] **Step 3: Implement**

**`src/lib/waiting-work-rules.ts`**
- Every day count below is Task 1's `bangkokDayDiff`.
- A private `Record<WaitingWorkKey, WaitingWorkAge["kind"]>`:
  - `age`: `approvalInbox`, `openRepairs`, `stuckRepairs`, `pendingAuditFindings`, `pendingDisposals`, `approvedDisposals`;
  - `due`: `duePm`, `openAuditActions`, `auditActionsDueSoon`, `returnsDueSoon`;
  - `expires`: `warrantyExpiringSoon`, `licenseExpiringSoon`.
- `waitingWorkAgeFrom` returns `null` when `oldest` is `null`. Otherwise:
  - **age:** `days = Math.max(0, bangkokDayDiff(oldest, today))`. `overdue` is `days > slaDays` for `approvalInbox`, and `false` for every other age kind. It is computed here on Bangkok days, not by calling `getApprovalAgeStatus`: that helper has the same rule (`approval-aging.ts:11-26`: `ageDays − slaDays > 0`) but counts server-local days. The Step 1 test checks the two agree at Bangkok-noon instants.
  - **due:** `days = bangkokDayDiff(today, oldest)`, negative when past, and `overdue = days < 0`. Only a past due date makes a due kind overdue.
  - **expires:** `{ kind: "expires", date: oldest, days: bangkokDayDiff(today, oldest) }`.
- `earliestDate` drops `null` and `undefined` and returns the earliest, or `null`.
- `stuckRepairsOldestSince`: for each asset, the `_max.performedAt` of the movement row with its `assetId` and `toValue === asset.statusId`, else the asset's `updatedAt`. It returns the earliest of those through `earliestDate`. "Status movement" means exactly this: status corrections, repair records, state reviews and disposals write the new status id into `toValue`.

**`src/lib/approval-inbox-query.ts`**
- Module constants:
  - `pendingDisposalApprovalWhere = { isActive: true, requestStatus: "pending" }`;
  - `pendingFindingApprovalWhere(userId: string)` returns `{ reviewStatus: "pending", reportedBy: { not: userId }, auditRound: { isActive: true, status: auditRoundOperationalWhere } }`.
- The snapshot (:26, :38) and `countApprovalInbox` (:95, :98) use them as `where: pendingDisposalApprovalWhere` and `where: pendingFindingApprovalWhere(user.id)`.
- `getReadyAuditRoundCloseCount` (:139-146) becomes `getReadyAuditRoundsForClose(currentUserId): Promise<{ id: string; updatedAt: Date }[]>`:
  - the same `findMany` where, selecting `id` and `updatedAt`, with no `take`;
  - filtered by `getReadyAuditRoundIds`.
  - `countApprovalInbox` counts its `.length`: the third `Promise.all` entry (:100-102) becomes `access.canApproveAudit && policy.auditCloseRequired ? getReadyAuditRoundsForClose(user.id).then((rounds) => rounds.length) : Promise.resolve(0)`. The destructured name stays `auditRoundsReady`, so the return line `return buildApprovalInboxCounts({ disposal, auditFindings, auditRoundsReady })` (:105) is unchanged; `tests/approval-inbox.test.ts:114` pins it, in the test "the snapshot's summary and the counts share one database count (critique C1)". Do not rename the third result to the rounds list.
- `getApprovalInboxOldest(user)`:
  - Without `canAnyApproval` it returns `{ oldest: null, slaDays: workflowApprovalDefaults.slaDays }` and reads nothing, as `getApprovalInboxCounts` does.
  - Otherwise it reads the policy and, in one `Promise.all` behind the same three gates as the count:
    - `disposalRequest.aggregate({ where: pendingDisposalApprovalWhere, _min: { requestDate: true } })`;
    - `auditFinding.aggregate({ where: pendingFindingApprovalWhere(user.id), _min: { reportedAt: true } })`;
    - `getReadyAuditRoundsForClose(user.id)`.
  - It returns `{ oldest: earliestDate([requestDate, reportedAt, ...rounds.map((round) => round.updatedAt)]), slaDays: policy.slaDays }`, with `earliestDate` from `@/lib/waiting-work-rules`.
- `countApprovalInbox(user, access, policy)` still appears exactly twice (`tests/approval-inbox.test.ts:113`).

**`src/lib/waiting-work.ts`**
- `getWaitingWorkAges(user, visibleKeys, rules, now = new Date())`:
  - `today = startOfBangkokDay(now)`.
  - One read per key of `visibleKeys`, started in that order inside one `Promise.all`. Each read resolves to the kind's oldest date:

    | Key | Read |
    |---|---|
    | `approvalInbox` | `getApprovalInboxOldest(user)`; its `slaDays` goes to `waitingWorkAgeFrom` |
    | `openRepairs` | `maintenanceTicket.aggregate({ where: openRepairsWhere, _min: { reportedDate: true } })` |
    | `stuckRepairs` | `asset.findMany({ where: stuckRepairsWhere, select: { id: true, statusId: true, updatedAt: true } })`; with no asset the date is `null` and nothing more is read; else one `assetMovement.groupBy({ by: ["assetId", "toValue"], where: { assetId: { in: <ids in row order> }, toValue: { in: <distinct statusIds, first-seen order> } }, _max: { performedAt: true } })`, then `stuckRepairsOldestSince` |
    | `duePm` | `maintenancePlan.aggregate({ where: duePmWhere(today), _min: { nextDueDate: true } })` |
    | `pendingAuditFindings` | `auditFinding.aggregate({ where: pendingAuditFindingsWhere, _min: { reportedAt: true } })` |
    | `openAuditActions` | `auditFinding.aggregate({ where: openAuditActionsWhere(today, rules), _min: { actionDueDate: true } })` |
    | `auditActionsDueSoon` | `auditFinding.aggregate({ where: auditActionsDueSoonWhere(today, rules), _min: { actionDueDate: true } })` |
    | `pendingDisposals` | `disposalRequest.aggregate({ where: pendingDisposalsWhere, _min: { requestDate: true } })` |
    | `approvedDisposals` | `disposalRequest.aggregate({ where: approvedDisposalsWhere, _min: { approvedAt: true } })` |
    | `returnsDueSoon` | `assetCheckout.aggregate({ where: { ...returnsDueSoonLoanWhere(today, rules), asset: { isActive: true } }, _min: { expectedReturnDate: true } })`: the loans of the active assets `returnsDueSoonAssetWhere` counts |
    | `warrantyExpiringSoon` | `asset.aggregate({ where: warrantyExpiringSoonWhere(today, rules), _min: { warrantyEndDate: true } })` |
    | `licenseExpiringSoon` | `asset.aggregate({ where: licenseExpiringSoonWhere(today, rules), _min: { warrantyEndDate: true } })` |

  - The result holds each key whose `waitingWorkAgeFrom(key, oldest, today, slaDays)` is not `null`. The kinds other than approvals ignore `slaDays`; pass `workflowApprovalDefaults.slaDays`.
- No identifier spelled `dueDate`, and still no write.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/waiting-work-rules.test.ts tests/waiting-work-source.test.ts tests/approval-inbox.test.ts tests/approval-aging.test.ts tests/notification-read-rules-route.test.ts tests/notification-maintenance-query.test.ts tests/audit-round-cancellation.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS. tsc is clean, and lint has no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/waiting-work-rules.ts src/lib/waiting-work.ts src/lib/approval-inbox-query.ts tests/waiting-work-rules.test.ts tests/waiting-work-source.test.ts tests/approval-inbox.test.ts tests/notification-read-rules-route.test.ts
git commit -m "feat(waiting-work): how long each waiting kind has waited, from existing columns (group 1 dashboard task 2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

---

Task 3 is split into four parts that a reviewer can accept one at a time (the "13C" style of the menu B plan): 3A the register, 3B the other counts that open the register's warranty filter, 3C the findings page, 3D the links and the per-kind proof. 3A, 3B and 3C only add lists; 3D points the shared links at them. All four build on Task 1 (`src/lib/waiting-work-rules.ts`, `src/lib/waiting-work.ts`), which already counts the returns row on assets with `returnsDueSoonAssetWhere` behind `asset:view`; Task 2 already reads the returns age from loans of active assets. Task 3 changes neither count.

---

### Task 3A: The register shows the bell's warranty, licence and return lists, the custodian state, and the company chip at every width

**Files:**
- Create: `src/lib/asset-custodian-state-filter.ts` (pure, relative imports only)
- Create: `src/lib/asset-list-where-options.ts` (server: reads the settings)
- Modify: `src/lib/asset-data-quality-filter.ts:1`
- Modify: `src/lib/asset-list-query.ts:1-5` (imports), `:7-26` (`custodianState`), `:30-64` (parse), `:66-97` (`buildAssetWhere` options and the custodian-state rule), `:134-137` (`buildAssetStatusCountWhere`), `:150` (query keys), `:159-189` (the three windowed values)
- Modify: `src/lib/asset-register-chips.ts:14-30` (labels type), `:40` (company chip), after `:57` (custodian-state chip), `:64-83` (clear all)
- Modify: `src/components/assets/asset-register-table.tsx:105-123` (filters type), `:474-491` (`hasActiveFilters`)
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx:7-15` (imports), `:60` (where options), `:262-276` (chip labels)
- Modify: `src/app/api/assets/route.ts:9,33`, `src/app/api/assets/export/route.ts:5,18`
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Test:
  - `tests/asset-list-query.test.ts:111-124` (the 30-day warranty test is replaced) and new tests
  - `tests/asset-data-quality-filter.test.ts` (new test)
  - `tests/asset-register-view-model.test.ts:47-63` (`chipLabels`), `:80-93` (the mobile-only assertion), new test
  - `tests/asset-register-filter-ui.test.ts:16` (pin rewritten), `:26-34` (two pins added), new test

**Interfaces:**
- Consumes (Task 1, `src/lib/waiting-work-rules.ts`, client-safe: a type-only Prisma import and relative `.ts` imports, pinned by Task 1): `type WaitingWorkRules`, `DEFAULT_WAITING_WORK_RULES`, `startOfBangkokDay(now: Date): Date`, `warrantyExpiringSoonWhere(today, rules)`, `licenseExpiringSoonWhere(today, rules)` and `returnsDueSoonAssetWhere(today, rules)` (active assets with an open temporary loan due within the window; the bell counts its returns row with it). Task 1, `src/lib/waiting-work.ts`: `getWaitingWorkRules(): Promise<WaitingWorkRules>`.
- Produces:
  - `assetDataQualityFilters` gains `"licenseExpiry"` and `"returnDue"` (URL `dataQuality=licenseExpiry`, `dataQuality=returnDue`).
  - `src/lib/asset-custodian-state-filter.ts`: `type AssetCustodianStateFilter = "" | "assigned"`, `normalizeAssetCustodianStateFilter(value: unknown): AssetCustodianStateFilter`, `assetNotClosedStatusWhere: Prisma.AssetWhereInput` (`{ status: { name: { notIn: ["Disposed", "Retired"] } } }`: the status `name` not in `CLOSED_AUDIT_STATUS_NAMES`; Task 8 imports this same fragment), `assetCustodianAssignedWhere: Prisma.AssetWhereInput` (`{ custodianId: { not: null }, ...assetNotClosedStatusWhere }`), `getAssetCustodianStateWhere(state: AssetCustodianStateFilter): Prisma.AssetWhereInput | null`.
  - `src/lib/asset-list-query.ts`: `AssetListFilters.custodianState`; `type AssetWhereOptions = { today: Date; rules: WaitingWorkRules }`; `buildAssetWhere(filters: AssetListFilters, options?: AssetWhereOptions): Prisma.AssetWhereInput` (options default to `{ today: startOfBangkokDay(new Date()), rules: DEFAULT_WAITING_WORK_RULES }`); `buildAssetStatusCountWhere(filters: AssetListFilters, options?: AssetWhereOptions)`; `assetFiltersUseWaitingWorkRules(filters: Pick<AssetListFilters, "dataQuality">): boolean`.
  - `src/lib/asset-list-where-options.ts`: `getAssetWhereOptions(filters: AssetListFilters, now?: Date): Promise<AssetWhereOptions>`.
  - For Tasks 8 and 9: the มีผู้ถือครอง KPI counts `buildAssetWhere(parseAssetListParams({ custodianState: "assigned", companyId }))` (Task 8 writes those params once, in `dashboardRegisterParams("custodianAssigned", companyId)`), Task 9 links `buildExactAssetRegisterHref(locale, <the same params>)`, and the share's denominator uses `assetNotClosedStatusWhere` with the same company.

- [ ] **Step 1: Add the register's messages**

Through `node scripts/messages-edit.mjs`, set in the `asset` namespace. The licence and return words are the bell rows' own (`notifications.licenseExpiringSoon`, `notifications.returnsDueSoon`), and "มีผู้ถือครอง" is the spec's chip (§6.4). Glossary: ผู้ถือครอง, License as written in §2.3.

| Key | th | en |
|---|---|---|
| `dataQualityLicenseExpiry` | License ใกล้หมดอายุ | License expiring soon |
| `dataQualityReturnDue` | ใกล้/เลยกำหนดคืน | Returns due soon |
| `custodianStateAssigned` | มีผู้ถือครอง | Has a custodian |

- [ ] **Step 2: Write the failing tests**

`tests/asset-list-query.test.ts`: add `assetFiltersUseWaitingWorkRules` to the existing import from `../src/lib/asset-list-query.ts`, and import `assetCustodianAssignedWhere, assetNotClosedStatusWhere` from `../src/lib/asset-custodian-state-filter.ts` and `DEFAULT_WAITING_WORK_RULES, licenseExpiringSoonWhere, returnsDueSoonAssetWhere, startOfBangkokDay, warrantyExpiringSoonWhere, type WaitingWorkRules` from `../src/lib/waiting-work-rules.ts`. Replace the test "builds warranty data quality drilldown for assets expiring within 30 days" (:111-124) with:

```ts
// 26 Oct 2026, 00:00 in Bangkok. The days are not today's defaults, so a filter that ignored them would fail.
const today = new Date("2026-10-25T17:00:00.000Z")
const waitingRules: WaitingWorkRules = { returnDueSoonDays: 5, auditActionDueSoonDays: 14, warrantyExpiryDays: 45, licenseExpiryDays: 60 }

test("the register's warranty, licence and return filters are the bell's own rules with the days they are given (group 1 spec §6.3)", () => {
  const where = (dataQuality: string) => buildAssetWhere(parseAssetListParams({ dataQuality }), { today, rules: waitingRules })
  const warranty = warrantyExpiringSoonWhere(today, waitingRules)
  const licence = licenseExpiringSoonWhere(today, waitingRules)
  const returns = returnsDueSoonAssetWhere(today, waitingRules)
  // Each rule holds isActive: true, so the register's { isActive: true, AND: [rule] } lists exactly the rule's assets.
  for (const rule of [warranty, licence, returns]) assert.equal(rule.isActive, true)
  assert.deepEqual(where("warranty"), { isActive: true, AND: [warranty] })
  assert.deepEqual(where("licenseExpiry"), { isActive: true, AND: [licence] })
  assert.deepEqual(where("returnDue"), { isActive: true, AND: [returns] })
  assert.deepEqual(where("serial"), buildAssetWhere(parseAssetListParams({ dataQuality: "serial" })), "a value without a window reads no rules")
  // Without options: the Bangkok day of the call and today's default days.
  assert.deepEqual(
    buildAssetWhere(parseAssetListParams({ dataQuality: "warranty" })),
    { isActive: true, AND: [warrantyExpiringSoonWhere(startOfBangkokDay(new Date()), DEFAULT_WAITING_WORK_RULES)] },
  )
})

test("only the three waiting-work values make the register read the notification rules", () => {
  for (const value of ["warranty", "licenseExpiry", "returnDue"]) {
    assert.equal(assetFiltersUseWaitingWorkRules(parseAssetListParams({ dataQuality: value })), true, value)
  }
  for (const value of ["", "serial", "photo", "responsibility", "department", "purchase"]) {
    assert.equal(assetFiltersUseWaitingWorkRules(parseAssetListParams({ dataQuality: value })), false, value)
  }
})

test("custodianState=assigned lists assets with a custodian that are not Disposed or Retired (group 1 spec §6.4)", () => {
  assert.deepEqual(assetNotClosedStatusWhere, { status: { name: { notIn: ["Disposed", "Retired"] } } })
  assert.deepEqual(assetCustodianAssignedWhere, { custodianId: { not: null }, status: { name: { notIn: ["Disposed", "Retired"] } } })
  assert.equal(parseAssetListParams({ custodianState: "nobody" }).custodianState, "")
  const filters = parseAssetListParams({ custodianState: "assigned", dataQuality: "serial", activity: "idle_180d" })
  assert.equal(filters.custodianState, "assigned")
  const parts = buildAssetWhere(filters).AND as object[]
  assert.deepEqual(parts.slice(0, 2), [{ OR: [{ serialNumber: null }, { serialNumber: "" }] }, assetCustodianAssignedWhere])
  assert.ok("movements" in parts[2], "the activity rule stays last")
  assert.match(buildAssetQueryString(filters), /custodianState=assigned/)
  assert.doesNotMatch(buildAssetQueryString(parseAssetListParams({})), /custodianState/)
})
```

`tests/asset-data-quality-filter.test.ts`: import `assetDataQualityFilters` too, and add:

```ts
test("the bell's licence and return kinds are register filters too (group 1 spec §6.3)", () => {
  assert.equal(normalizeAssetDataQualityFilter("licenseExpiry"), "licenseExpiry")
  assert.equal(normalizeAssetDataQualityFilter("returnDue"), "returnDue")
  assert.deepEqual([...assetDataQualityFilters], ["responsibility", "serial", "photo", "department", "purchase", "warranty", "licenseExpiry", "returnDue"])
})
```

`tests/asset-register-view-model.test.ts`:
- `chipLabels` (:47-63): `dataQuality` becomes `{ serial: "ไม่มี Serial", department: "แผนกไม่ครบ", licenseExpiry: "License ใกล้หมดอายุ", returnDue: "ใกล้/เลยกำหนดคืน" }`, and add `custodianState: { assigned: "มีผู้ถือครอง" }`.
- The test at :80 is renamed "chips show hidden filters and hide tab statuses and search; the company chip shows at every width (group 1 spec §6.5)". Its last line (:92) becomes `assert.deepEqual(chips.filter((chip) => chip.mobileOnly).map((chip) => chip.key), [])`.
- Add:

```ts
test("the waiting-work values and the custodian state get chips; branch and category stay phone-only (group 1 spec §6.5)", () => {
  const chips = chipsFor("companyId=c-1&branchId=b-1&categoryId=cat-1&dataQuality=returnDue&custodianState=assigned")
  assert.deepEqual(chips.map((chip) => [chip.key, chip.label, chip.mobileOnly]), [
    ["company", "บริษัท: SNI - สยาม", false],
    ["branch", "สาขา: b-1", true],
    ["category", "หมวดหมู่: cat-1", true],
    ["dataQuality", "ใกล้/เลยกำหนดคืน", false],
    ["custodianState", "มีผู้ถือครอง", false],
  ])
  const withoutCustodianState = paramsOf(chips.find((chip) => chip.key === "custodianState")!.href)
  assert.equal(withoutCustodianState.get("custodianState"), null)
  assert.equal(withoutCustodianState.get("dataQuality"), "returnDue")
  assert.equal(chipsFor("dataQuality=licenseExpiry")[0].label, "License ใกล้หมดอายุ")
  assert.equal(paramsOf(buildAssetRegisterClearAllHref("/th/assets", filters("custodianState=assigned&dataQuality=returnDue"))).get("custodianState"), null)
})
```

`tests/asset-register-filter-ui.test.ts`:
- :16 becomes `assert.match(source, /const whereOptions = await getAssetWhereOptions\(filters\)\n\s+const statusCountWhere = await applyAssetCrossScopeFilter\(buildAssetStatusCountWhere\(filters, whereOptions\), filters\.crossScope\)/)`.
- In the test at :26 add `assert.match(source, /warranty: t\("dataQualityWarranty"\),\n\s+licenseExpiry: t\("dataQualityLicenseExpiry"\),\n\s+returnDue: t\("dataQualityReturnDue"\),/)` and `assert.match(source, /custodianState: \{ assigned: t\("custodianStateAssigned"\) \}/)`.
- Add:

```ts
test("the register's routes build the same where as the page, and only the windowed values read the settings (group 1 spec §6.3)", () => {
  for (const path of ["src/app/api/assets/route.ts", "src/app/api/assets/export/route.ts"]) {
    assert.match(read(path), /buildAssetWhere\(filters, await getAssetWhereOptions\(filters\)\)/, path)
  }
  const options = read("src/lib/asset-list-where-options.ts")
  assert.match(options, /today: startOfBangkokDay\(now\)/)
  assert.match(options, /rules: assetFiltersUseWaitingWorkRules\(filters\) \? await getWaitingWorkRules\(\) : DEFAULT_WAITING_WORK_RULES/)
  assert.doesNotMatch(sheet(), /licenseExpiry|returnDue|custodianState/, "link-only values: the filter sheet offers no chip for them")
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/asset-list-query.test.ts tests/asset-data-quality-filter.test.ts tests/asset-register-view-model.test.ts tests/asset-register-filter-ui.test.ts`
Expected: FAIL. `assetFiltersUseWaitingWorkRules` is not exported and `asset-custodian-state-filter.ts` does not exist (import errors), `licenseExpiry` and `returnDue` normalize to `""`, the company chip is still mobile-only, and the page and route pins miss `getAssetWhereOptions`.

- [ ] **Step 4: Implement**

- **Client safety:** `asset-list-query.ts` now imports `./waiting-work-rules.ts` and `./asset-custodian-state-filter.ts`, and four `"use client"` components import `asset-list-query.ts` (`asset-register-navigation.tsx`, `asset-register-search-field.tsx`, `asset-register-table.tsx`, `report-view-tabs.tsx`). Both stay client-safe: Task 1 pins `waiting-work-rules.ts` (a type-only Prisma import, relative `.ts` imports, no `prisma`), and `audit-round-scope.ts` holds only a type-only Prisma import and a type-only import of `./validations/audit.ts`.
- **`src/lib/asset-data-quality-filter.ts:1`:** append `"licenseExpiry", "returnDue"`. The filter sheet's own chip list (`asset-register-filter-sheet.tsx:26-33`) is not changed: the two values come only from links.
- **`src/lib/asset-custodian-state-filter.ts`:** the four exports in Interfaces, shaped like `asset-activity-filter.ts`. Import `CLOSED_AUDIT_STATUS_NAMES` from `./audit-round-scope.ts`. The normalizer takes the first value of an array, as `normalizeAssetDataQualityFilter` does.
- **`src/lib/asset-list-query.ts`:**
  - `AssetListParams` gains `custodianState?: string`; the parse adds `custodianState: normalizeAssetCustodianStateFilter(getValue("custodianState"))` after `custodianId`.
  - Import `DEFAULT_WAITING_WORK_RULES, licenseExpiringSoonWhere, returnsDueSoonAssetWhere, startOfBangkokDay, warrantyExpiringSoonWhere, type WaitingWorkRules` from `./waiting-work-rules.ts`, and the custodian-state names from `./asset-custodian-state-filter.ts`.
  - `buildAssetWhere(filters, options = { today: startOfBangkokDay(new Date()), rules: DEFAULT_WAITING_WORK_RULES })`. The `AND` list is, in order: the data-quality rule, `getAssetCustodianStateWhere(filters.custodianState)`, the activity rule, each only when present.
  - `buildAssetDataQualityWhere(dataQuality, options)`: `warranty` returns `warrantyExpiringSoonWhere(options.today, options.rules)`, `licenseExpiry` returns `licenseExpiringSoonWhere(...)`, `returnDue` returns `returnsDueSoonAssetWhere(...)`. The hard-coded 30 days (:182-187) goes.
  - `buildAssetStatusCountWhere(filters, options?)` passes `options` on.
  - The query-string key list (:150) gains `"custodianState"` right after `"custodianId"`.
  - `assetFiltersUseWaitingWorkRules` is true for exactly `warranty`, `licenseExpiry` and `returnDue`.
  - Options are optional so the reports' calls that clear `dataQuality` (pinned in `tests/reports-adaptive-ui.test.ts:148,155`, `tests/report-idle-activity.test.ts:10`, `tests/report-table-key.test.ts:28`) stay as they are. Every caller whose filters can carry a windowed value passes `await getAssetWhereOptions(filters)`: the register page and its two routes here, the reports page and its overview export in 3B.
- **`src/lib/asset-list-where-options.ts`** (server). It imports `getWaitingWorkRules` from `@/lib/waiting-work`, `DEFAULT_WAITING_WORK_RULES` and `startOfBangkokDay` from `@/lib/waiting-work-rules`, and `assetFiltersUseWaitingWorkRules` with the two types from `@/lib/asset-list-query`. The lines the pin reads:

  ```ts
  export async function getAssetWhereOptions(filters: AssetListFilters, now = new Date()): Promise<AssetWhereOptions> {
    return {
      today: startOfBangkokDay(now),
      rules: assetFiltersUseWaitingWorkRules(filters) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES,
    }
  }
  ```

  A register load without a windowed value reads no setting, so the page gains no query.
- **`src/lib/asset-register-chips.ts`:**
  - `labels` gains `custodianState: Record<string, string>`.
  - The company chip (:40) drops its `true`. A comment above it says the company chip shows at every width because a dashboard link that carries `companyId` names its company there (group 1 spec §6.5). Branch and category stay mobile-only.
  - After the custodian chip (:57): `if (filters.custodianState) add("custodianState", labels.custodianState[filters.custodianState] ?? filters.custodianState, { custodianState: "" })`.
  - `buildAssetRegisterClearAllHref` clears `custodianState: ""` too.
- **`src/components/assets/asset-register-table.tsx`:** the `filters` prop type gains `custodianState: AssetCustodianStateFilter`, and `hasActiveFilters` (:474) gains `filters.custodianState ||`, so an empty custodian-state list says "no results", not "no assets".
- **`src/app/[locale]/(dashboard)/assets/page.tsx`:**
  - Import `getAssetWhereOptions` from `@/lib/asset-list-where-options`.
  - :60 becomes two lines: `const whereOptions = await getAssetWhereOptions(filters)`, then `const statusCountWhere = await applyAssetCrossScopeFilter(buildAssetStatusCountWhere(filters, whereOptions), filters.crossScope)`.
  - The chip labels: after `warranty` (:266) add `licenseExpiry: t("dataQualityLicenseExpiry"),` and `returnDue: t("dataQualityReturnDue"),`. After `activity` (:276) add `custodianState: { assigned: t("custodianStateAssigned") },`.
- **`src/app/api/assets/route.ts:33`, `src/app/api/assets/export/route.ts:18`:** `buildAssetWhere(filters)` becomes `buildAssetWhere(filters, await getAssetWhereOptions(filters))`, after the permission check as today.
- `custodianState` is not added to the saved view's keys (`asset-register-view-memory.ts:1-16`), like `activity`: it only arrives on exact links.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/asset-list-query.test.ts tests/asset-data-quality-filter.test.ts tests/asset-register-view-model.test.ts tests/asset-register-filter-ui.test.ts tests/asset-register-filters.test.ts tests/asset-register-ux.test.ts tests/asset-register-view-memory.test.ts tests/reports-adaptive-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS. `asset-register-filters.test.ts:30-37` still holds (both sides use the default options), and tsc is clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/asset-custodian-state-filter.ts src/lib/asset-list-where-options.ts src/lib/asset-data-quality-filter.ts src/lib/asset-list-query.ts src/lib/asset-register-chips.ts src/components/assets/asset-register-table.tsx "src/app/[locale]/(dashboard)/assets/page.tsx" src/app/api/assets/route.ts src/app/api/assets/export/route.ts messages/th.json messages/en.json tests/asset-list-query.test.ts tests/asset-data-quality-filter.test.ts tests/asset-register-view-model.test.ts tests/asset-register-filter-ui.test.ts
git commit -m "feat(register): the bell's warranty, licence and return lists, custodianState=assigned and the company chip at every width (group 1 dashboard task 3A)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3B: Every other count that opens the warranty filter uses its rule

The data-quality page's "ใกล้หมดประกัน" rule, the reports operations card and the overview export count warranty at 30 days with licences in, and the first two link to `dataQuality=warranty`. After 3A that list follows the bell, so these counts follow it too.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx:29-30` (removed), `:34` (`getRuleCounts()`), `:169-197` (`getRuleCounts` reads the rule)
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx:8` (imports), `:64` (where options), `:142-149` (two labels), `:407-408,436,452` (the warranty where), `:518,788-815` (`getDataQualityIssues`'s window)
- Modify: `src/app/api/reports/assets-overview/export/route.ts:6` (imports), `:16` (where options), `:96` (metric name), `:159-176` (the warranty where)
- Modify: `messages/th.json`, `messages/en.json` (`dataQualityPage.rules.warrantyExpiring.description`)
- Test: Create `tests/warranty-filter-counts.test.ts`

**Interfaces:**
- Consumes: `warrantyExpiringSoonWhere`, `startOfBangkokDay`, `DEFAULT_WAITING_WORK_RULES` (Task 1, pure); `getWaitingWorkRules()` (Task 1, server); `getAssetWhereOptions(filters)` (3A).
- Produces: nothing new.

- [ ] **Step 1: Change the rule's description**

Through `node scripts/messages-edit.mjs` (the key path `dataQualityPage.rules.warrantyExpiring.description`). The words follow the bell's detail line `notifications.warrantyExpiringSoonDetail`.

| Key | th | en |
|---|---|---|
| `dataQualityPage.rules.warrantyExpiring.description` | ตรวจทรัพย์สินที่ประกันจะหมดตามเงื่อนไขแจ้งเตือน ไม่รวม License | Find assets whose warranty ends within the notification rule, licenses excluded. |

- [ ] **Step 2: Write the failing test** `tests/warranty-filter-counts.test.ts`

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { DEFAULT_WAITING_WORK_RULES, warrantyExpiringSoonWhere } from "../src/lib/waiting-work-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const dataQualityPage = () => read("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx")
const reportsPage = () => read("src/app/[locale]/(dashboard)/reports/page.tsx")
const overviewExport = () => read("src/app/api/reports/assets-overview/export/route.ts")

test("every count that opens dataQuality=warranty uses the register's warranty rule (group 1 spec §6.3)", () => {
  for (const source of [dataQualityPage(), reportsPage(), overviewExport()]) {
    assert.match(source, /const warrantyWhere = warrantyExpiringSoonWhere\(startOfBangkokDay\(new Date\(\)\), await getWaitingWorkRules\(\)\)/)
    assert.doesNotMatch(source, /warrantyThreshold|getDate\(\) \+ 30/)
  }
  assert.match(dataQualityPage(), /prisma\.asset\.count\(\{ where: warrantyWhere \}\)/)
  assert.match(reportsPage(), /prisma\.asset\.count\(\{ where: \{ AND: \[operationsQualityWhere, warrantyWhere\] \} \}\)/)
  assert.match(reportsPage(), /assetMissingResponsibilityWhere,\n(?:.*\n)*?\s+warrantyWhere,\n/, "the data-quality rows use the same rule")
  assert.match(overviewExport(), /prisma\.asset\.count\(\{ where: \{ AND: \[assetWhere, warrantyWhere\] \} \}\)/)
  assert.match(overviewExport(), /\{ metric: "Warranty Expiring Soon", value: dataQuality\.warrantyExpiring \}/)
})

test("the reports read the register's where options and name the two new values", () => {
  for (const source of [reportsPage(), overviewExport()]) {
    assert.match(source, /buildAssetWhere\(filters, await getAssetWhereOptions\(filters\)\)/)
  }
  assert.match(reportsPage(), /licenseExpiry: tAsset\("dataQualityLicenseExpiry"\),\n\s+returnDue: tAsset\("dataQualityReturnDue"\),/)
})

test("a report row's warranty label reads the rule's own window, licences out", () => {
  assert.match(reportsPage(), /const warrantyWindow = warrantyWhere\.warrantyEndDate as \{ gte: Date; lte: Date \}/)
  assert.match(reportsPage(), /getDataQualityIssues\(asset, warrantyWindow, t, locale\)/)
  assert.match(reportsPage(), /asset\.ownershipType !== "software_license" && asset\.warrantyEndDate && asset\.warrantyEndDate >= warrantyWindow\.gte && asset\.warrantyEndDate <= warrantyWindow\.lte/)
  // The shape the reports page reads back from Task 1's rule.
  const today = new Date("2026-10-25T17:00:00.000Z")
  const window = warrantyExpiringSoonWhere(today, { ...DEFAULT_WAITING_WORK_RULES, warrantyExpiryDays: 45 }).warrantyEndDate as { gte: Date; lte: Date }
  assert.equal(window.gte.getTime(), today.getTime())
  assert.ok(window.lte instanceof Date && window.lte > window.gte)
})

test("the data-quality rule no longer promises 30 days", () => {
  const th = JSON.parse(read("messages/th.json")).dataQualityPage.rules.warrantyExpiring.description
  const en = JSON.parse(read("messages/en.json")).dataQualityPage.rules.warrantyExpiring.description
  assert.equal(th, "ตรวจทรัพย์สินที่ประกันจะหมดตามเงื่อนไขแจ้งเตือน ไม่รวม License")
  assert.equal(en, "Find assets whose warranty ends within the notification rule, licenses excluded.")
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test tests/warranty-filter-counts.test.ts`
Expected: FAIL. All three files still build `warrantyThreshold` from `getDate() + 30`, and the metric is "Warranty Expiring in 30 Days".

- [ ] **Step 4: Implement**

- **`admin/data-quality/page.tsx`:** delete :29-30 and call `getRuleCounts()` with no argument (:34). `getRuleCounts` first sets `const warrantyWhere = warrantyExpiringSoonWhere(startOfBangkokDay(new Date()), await getWaitingWorkRules())`, then runs its `Promise.all`; the last count (:195) is `prisma.asset.count({ where: warrantyWhere })`. The page's own `rules` (the data-quality rules, :37) keeps its name.
- **`reports/page.tsx`:**
  - :64 `const baseAssetWhere = buildAssetWhere(filters, await getAssetWhereOptions(filters))`.
  - :142-149 `dataQualityFilterLabels` gains `licenseExpiry: tAsset("dataQualityLicenseExpiry"),` and `returnDue: tAsset("dataQualityReturnDue"),` after `warranty`.
  - In `loadOperationsView`, :407-408 become `const warrantyWhere = warrantyExpiringSoonWhere(startOfBangkokDay(new Date()), await getWaitingWorkRules())` and `const warrantyWindow = warrantyWhere.warrantyEndDate as { gte: Date; lte: Date }`. :436 counts `{ AND: [operationsQualityWhere, warrantyWhere] }`. :452's `{ warrantyEndDate: … }` becomes `warrantyWhere`. :518 passes `warrantyWindow`.
  - `getDataQualityIssues` (:788-815) takes `warrantyWindow: { gte: Date; lte: Date }` in place of `warrantyThreshold: Date`, and labels warranty only when the pinned condition holds.
- **`assets-overview/export/route.ts`:** :16 uses `getAssetWhereOptions` as in the pin. In `getAssetDataQualityCounts` (:159-176), `warrantyWhere` replaces `warrantyThreshold` and the count is `{ AND: [assetWhere, warrantyWhere] }`. :96's metric becomes "Warranty Expiring Soon", because the days are a setting now. Both reads come after `requirePermission(user, "report", "export")`, so `tests/e2e-cross-cutting.test.ts`'s "permission before any read" holds.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/warranty-filter-counts.test.ts tests/reports-adaptive-ui.test.ts tests/report-idle-activity.test.ts tests/report-table-key.test.ts tests/e2e-cross-cutting.test.ts tests/data-quality-drilldown.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS. `reports-adaptive-ui.test.ts:149` still finds `operationsQualityWhere` at least 6 times, and tsc is clean.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" "src/app/[locale]/(dashboard)/reports/page.tsx" src/app/api/reports/assets-overview/export/route.ts messages/th.json messages/en.json tests/warranty-filter-counts.test.ts
git commit -m "fix(reports): the data-quality page and the reports count warranty with the register's rule (group 1 dashboard task 3B)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3C: The findings page lists the bell's two action kinds exactly

**Files:**
- Modify: `src/lib/audit-finding-filters.ts:1-2` (imports), `:4-15` (statuses and type), `:21-23` (resolve), `:39-87` (`buildAuditFindingWhere`)
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx:29-36` (imports), `:69` (`tNotifications`), `:82-83` (`waitingRules`), `:96,117-120` (`now: pageLoadedAt`, `rules`), `:179-188` (two labels), `:234-237` (the status chip)
- Modify: `src/app/api/audit-findings/export/route.ts:7,17-19`, `src/app/api/audit-findings/export-pdf/route.ts:6,20-22`
- Test: `tests/audit-finding-resolution.test.ts:120-135` (pin :133 rewritten) and three new tests

**Interfaces:**
- Consumes: `openAuditActionsWhere(today, rules)`, `auditActionsDueSoonWhere(today, rules)`, `startOfBangkokDay`, `DEFAULT_WAITING_WORK_RULES`, `type WaitingWorkRules` (Task 1, pure); `getWaitingWorkRules()` (Task 1, server).
- Produces (3D links to them):
  - `auditFindingWaitingStatuses = ["action_not_due", "action_due_soon"] as const`, link-only. `auditFindingResolutionStatuses` (the 8 tabs) is unchanged.
  - `type AuditFindingResolutionStatus = (typeof auditFindingResolutionStatuses)[number] | (typeof auditFindingWaitingStatuses)[number]`.
  - `isAuditFindingWaitingStatus(status: string): boolean`.
  - `buildAuditFindingWhere({ status, search, roundId, findingType, now, rules }: { status?: string | null; search?: string | null; roundId?: string | null; findingType?: string | null; now?: Date; rules?: WaitingWorkRules }): Prisma.AuditFindingWhereInput`. `rules` defaults to `DEFAULT_WAITING_WORK_RULES`, and only the two waiting statuses read it.
  - URLs `/${locale}/audit/findings?status=action_not_due` and `?status=action_due_soon`.

No new messages: the chip says the bell row's own words, read from `notifications.openAuditActions` ("แผนแก้ไขยังเปิด" / "Open action plans") and `notifications.auditActionsDueSoon` ("แผนแก้ไขใกล้ครบกำหนด" / "Action plans due soon").

- [ ] **Step 1: Write the failing tests** in `tests/audit-finding-resolution.test.ts`

Import `auditFindingResolutionStatuses, isAuditFindingWaitingStatus, resolveAuditFindingStatus` next to `buildAuditFindingWhere`, and `DEFAULT_WAITING_WORK_RULES, auditActionsDueSoonWhere, openAuditActionsWhere, startOfBangkokDay, type WaitingWorkRules` from `../src/lib/waiting-work-rules.ts`. In the test at :120, :133 becomes:

```ts
    assert.match(route, /const rules = isAuditFindingWaitingStatus\(status\) \? await getWaitingWorkRules\(\) : DEFAULT_WAITING_WORK_RULES/)
    assert.match(route, /buildAuditFindingWhere\(\{ status, search, roundId, findingType, rules \}\)/)
```

Add:

```ts
const now = new Date("2026-10-26T03:00:00.000Z") // 10:00 in Bangkok
const waitingRules: WaitingWorkRules = { ...DEFAULT_WAITING_WORK_RULES, auditActionDueSoonDays: 14 }

test("the two action filters are the bell's two kinds, with the rules they are given (group 1 spec §6.3)", () => {
  const today = startOfBangkokDay(now)
  assert.deepEqual(buildAuditFindingWhere({ status: "action_not_due", now, rules: waitingRules }), openAuditActionsWhere(today, waitingRules))
  assert.deepEqual(buildAuditFindingWhere({ status: "action_due_soon", now, rules: waitingRules }), auditActionsDueSoonWhere(today, waitingRules))
  assert.deepEqual(buildAuditFindingWhere({ status: "action_due_soon", now }), auditActionsDueSoonWhere(today, DEFAULT_WAITING_WORK_RULES), "no rules: today's defaults")
  for (const status of ["action_not_due", "action_due_soon"]) {
    assert.equal(resolveAuditFindingStatus(status), status)
    assert.equal(isAuditFindingWaitingStatus(status), true)
  }
  assert.equal(isAuditFindingWaitingStatus("action_open"), false)
  assert.deepEqual([...auditFindingResolutionStatuses], ["pending", "action_open", "overdue", "closed", "approved", "rejected", "exception", "all"], "the tabs stay as they are")
})

test("a search, round or type narrows an action filter without replacing its own conditions", () => {
  const base = openAuditActionsWhere(startOfBangkokDay(now), DEFAULT_WAITING_WORK_RULES)
  assert.deepEqual(buildAuditFindingWhere({ status: "action_not_due", search: " SNI ", roundId: "round-1", findingType: "wrong_location", now }), {
    AND: [
      base,
      { auditRoundId: "round-1" },
      { findingType: "wrong_location" },
      {
        OR: [
          { findingType: { contains: "SNI" } },
          { auditRound: { auditNo: { contains: "SNI" } } },
          { auditRound: { name: { contains: "SNI" } } },
          { asset: { assetTag: { contains: "SNI" } } },
          { asset: { name: { contains: "SNI" } } },
        ],
      },
    ],
  })
})

test("the findings page reads the bell's rules for the action filters and shows the filter as a chip (group 1 spec §6.5)", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(page, /const waitingRules = isAuditFindingWaitingStatus\(status\) \? await getWaitingWorkRules\(\) : DEFAULT_WAITING_WORK_RULES/)
  assert.match(page, /const where = buildAuditFindingWhere\(\{ status, search: searchText, roundId, findingType, now: pageLoadedAt, rules: waitingRules \}\)/)
  assert.doesNotMatch(page, /now: today/)
  assert.match(page, /const tNotifications = await getTranslations\("notifications"\)/)
  assert.match(page, /action_not_due: tNotifications\("openAuditActions"\),\n\s+action_due_soon: tNotifications\("auditActionsDueSoon"\),/)
  assert.match(page, /\.\.\.\(isAuditFindingWaitingStatus\(status\) \? \[\{ key: "status", label: resolutionFilterLabels\[status\], href: filterHref\("all"\) \}\] : \[\]\),/)
  assert.match(page, /const resolutionFilters = auditFindingResolutionStatuses\.map\(/, "the tabs come from the 8 tab statuses only")
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/audit-finding-resolution.test.ts`
Expected: FAIL. `isAuditFindingWaitingStatus` is not exported, `action_not_due` resolves to `pending`, and the page and route pins miss `waitingRules` / `rules`.

- [ ] **Step 3: Implement**

- **`src/lib/audit-finding-filters.ts`:**
  - Import the Task 1 names above from `./waiting-work-rules.ts` (relative, so the test can import the file).
  - Add `auditFindingWaitingStatuses`, widen the type, and add `isAuditFindingWaitingStatus`. `resolveAuditFindingStatus` accepts both lists and still falls back to `"pending"`.
  - Move the five search conditions into a local `auditFindingSearchConditions(searchText)`, used by both paths.
  - In `buildAuditFindingWhere`, a waiting status returns early. `base` is `openAuditActionsWhere(startOfBangkokDay(now), rules)` for `action_not_due`, or `auditActionsDueSoonWhere(...)` for `action_due_soon`. With no round, type or search it returns `base` itself. Otherwise it returns `{ AND: [base, { auditRoundId }, { findingType }, { OR: search }] }`, keeping only the parts present and in that order. So a search can never overwrite an `OR` the bell's rule holds.
  - Every other status builds exactly what it builds today.
- **`audit/findings/page.tsx`:**
  - Import `getWaitingWorkRules` from `@/lib/waiting-work`, `DEFAULT_WAITING_WORK_RULES` from `@/lib/waiting-work-rules`, and `isAuditFindingWaitingStatus`. Add `const tNotifications = await getTranslations("notifications")` after `tAsset` (:69).
  - After `status` (:82): `const waitingRules = isAuditFindingWaitingStatus(status) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES`. Other statuses read no setting.
  - The five `buildAuditFindingWhere` calls (:96, :117-120) pass `now: pageLoadedAt` instead of `now: today`. The main call (:96) also passes `rules: waitingRules`. `overdue` still truncates through `getAuditFindingToday(now)`, so its count does not move. The Bangkok `today` of the two new statuses must come from the real time, not from the server's local midnight.
  - `today` (:83) stays for `resolveFindingState`.
  - `resolutionFilterLabels` (:179-188) gains the two pinned lines.
  - `filterChips` (:234) starts with the pinned status chip. Removing it goes to `status=all` and keeps the round and type.
  - While a waiting status is on, no tab is current. The list total comes from `otherStatusTotal`, a count of the same `where` (the status is not in `SUMMARY_STATUSES`), so the total equals the list.
  - The search form's hidden `status` and `exportParams` already carry the new value.
- **Both export routes:** after `status`, `const rules = isAuditFindingWaitingStatus(status) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES`, and `buildAuditFindingWhere({ status, search, roundId, findingType, rules })`. Both come after `requirePermission(user, "audit", "export")`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/audit-finding-resolution.test.ts tests/list-pages-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-round-cancellation.test.ts tests/audit-item-status-labels.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-fixes.test.ts && npx tsc --noEmit`
Expected: PASS. `list-pages-ui.test.ts:299` still finds the `TabNav … items={resolutionFilters} current={status}` line, and tsc is clean (`resolutionFilterLabels` covers the widened type).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit-finding-filters.ts "src/app/[locale]/(dashboard)/audit/findings/page.tsx" src/app/api/audit-findings/export/route.ts src/app/api/audit-findings/export-pdf/route.ts tests/audit-finding-resolution.test.ts
git commit -m "feat(audit): the findings page lists the bell's two action kinds exactly (group 1 dashboard task 3C)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3D: Every waiting kind links to a list that shows its count

**Files:**
- Modify: `src/lib/waiting-work-rules.ts` (`buildWaitingWorkHref`: four targets change). `src/lib/waiting-work.ts` does not change: Task 1 already counts every kind with the builders below, the returns row on assets behind `asset:view`, and Task 2 already reads the returns age from loans of active assets.
- Test:
  - Create `tests/waiting-work-links.test.ts`
  - `tests/waiting-work-rules.test.ts`: Task 1's test "one link per kind: today's bell links, plus the two repair lists (spec §6.3)" is deleted; the new file holds the full map, and its `en` check moves there
  - `tests/asset-register-ux.test.ts:91-93` (the register-link pins, on the path Task 1 gave :84)

**Interfaces:**
- Consumes (Task 1, `src/lib/waiting-work-rules.ts`): `WAITING_WORK_KEYS`, `type WaitingWorkKey`, `type WaitingWorkRules`, `startOfBangkokDay(now)`, `buildWaitingWorkHref`, and the where builders the bell counts with: `openRepairsWhere`, `duePmWhere(day: Date)`, `pendingAuditFindingsWhere`, `openAuditActionsWhere(today, rules)`, `auditActionsDueSoonWhere(today, rules)`, `pendingDisposalsWhere`, `approvedDisposalsWhere`, `returnsDueSoonAssetWhere(today, rules)`, `warrantyExpiringSoonWhere(today, rules)`, `licenseExpiringSoonWhere(today, rules)`. The register filters `returnDue` and `licenseExpiry` (3A) and the finding statuses `action_not_due` and `action_due_soon` (3C).
- Produces: `buildWaitingWorkHref(locale, key)` with these targets. The dashboard (Tasks 9 and 10), the bell, the digest, the notifications page and the work center (Task 4) all read it.

| Kind | Before (Task 1) | After | Why the list shows the same count |
|---|---|---|---|
| approvalInbox | `/${locale}/admin/approvals` | kept | the page's total cell is `summary.total` from `countApprovalInbox`, the function `getApprovalInboxCounts` returns |
| openRepairs | `/${locale}/maintenance?status=in_progress` | kept | `buildMaintenanceWhere({ status: "in_progress" })` equals `openRepairsWhere`; the list header shows `total` |
| stuckRepairs | `/${locale}/maintenance#stuck` | kept | the `#stuck` heading shows `count(stuckRepairsWhere)` |
| duePm | `/${locale}/maintenance#pm-due` | kept | the `#pm-due` heading shows `count(buildDuePmPlanWhere(now))` |
| pendingAuditFindings | `/${locale}/audit/findings?status=pending` | kept | `buildAuditFindingWhere({ status: "pending" })` equals `pendingAuditFindingsWhere` |
| openAuditActions | `…/audit/findings?status=all` | `/${locale}/audit/findings?status=action_not_due` | 3C |
| auditActionsDueSoon | `…/audit/findings?status=all` | `/${locale}/audit/findings?status=action_due_soon` | 3C |
| pendingDisposals | `/${locale}/disposal?status=pending` | kept | `buildDisposalWhere({ status: "pending" })` equals `pendingDisposalsWhere` |
| approvedDisposals | `/${locale}/disposal?status=approved` | kept | the same for `approved` |
| returnsDueSoon | `/${locale}/asset-management/checkin` | `buildExactAssetRegisterHref(locale, { dataQuality: "returnDue" })` | 3A's `returnDue` lists `returnsDueSoonAssetWhere`, the asset-level where Task 1 counts with |
| warrantyExpiringSoon | `buildExactAssetRegisterHref(locale, { dataQuality: "warranty" })` | kept | 3A made the list follow the bell |
| licenseExpiringSoon | `/${locale}/assets?ownershipType=software_license` | `buildExactAssetRegisterHref(locale, { dataQuality: "licenseExpiry" })` | 3A |

- [ ] **Step 1: Write the failing test** `tests/waiting-work-links.test.ts`

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  WAITING_WORK_KEYS,
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  buildWaitingWorkHref,
  duePmWhere,
  licenseExpiringSoonWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  returnsDueSoonAssetWhere,
  startOfBangkokDay,
  warrantyExpiringSoonWhere,
  type WaitingWorkKey,
  type WaitingWorkRules,
} from "../src/lib/waiting-work-rules.ts"
import { buildAssetWhere, parseAssetListParams } from "../src/lib/asset-list-query.ts"
import { buildAuditFindingWhere } from "../src/lib/audit-finding-filters.ts"
import { buildDisposalWhere, parseDisposalListParams } from "../src/lib/disposal-query.ts"
import { buildMaintenanceWhere, parseMaintenanceListParams } from "../src/lib/maintenance-query.ts"
import { buildDuePmPlanWhere } from "../src/lib/preventive-maintenance.ts"

// The count side is Task 1's tests/waiting-work-source.test.ts, which records the where of every count the source
// makes. This file proves that each kind's link opens a list built from that same where, with the same rules.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
const now = new Date("2026-10-26T03:00:00.000Z") // 10:00 in Bangkok
const today = startOfBangkokDay(now)
// Not today's defaults, so a list that ignored the rules would fail.
const rules: WaitingWorkRules = { returnDueSoonDays: 5, auditActionDueSoonDays: 14, warrantyExpiryDays: 45, licenseExpiryDays: 60 }
const query = (key: WaitingWorkKey) => new URLSearchParams(buildWaitingWorkHref("th", key).split("#")[0].split("?")[1] ?? "")

test("each waiting kind has one link, to a list (group 1 spec §6.3)", () => {
  assert.deepEqual(Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, buildWaitingWorkHref("th", key)])), {
    approvalInbox: "/th/admin/approvals",
    openRepairs: "/th/maintenance?status=in_progress",
    stuckRepairs: "/th/maintenance#stuck",
    duePm: "/th/maintenance#pm-due",
    pendingAuditFindings: "/th/audit/findings?status=pending",
    openAuditActions: "/th/audit/findings?status=action_not_due",
    auditActionsDueSoon: "/th/audit/findings?status=action_due_soon",
    pendingDisposals: "/th/disposal?status=pending",
    approvedDisposals: "/th/disposal?status=approved",
    returnsDueSoon: "/th/assets?dataQuality=returnDue&exact=1",
    warrantyExpiringSoon: "/th/assets?dataQuality=warranty&exact=1",
    licenseExpiringSoon: "/th/assets?dataQuality=licenseExpiry&exact=1",
  })
  assert.equal(buildWaitingWorkHref("en", "stuckRepairs"), "/en/maintenance#stuck")
  assert.equal(buildWaitingWorkHref("en", "returnsDueSoon"), "/en/assets?dataQuality=returnDue&exact=1")
})

test("the register's three kinds: the link's own filter builds the count's where", () => {
  // Each count's where holds isActive: true, so the register's { isActive: true, AND: [where] } lists exactly its rows.
  const listWhere = (key: WaitingWorkKey) => buildAssetWhere(parseAssetListParams(query(key)), { today, rules })
  assert.deepEqual(listWhere("returnsDueSoon"), { isActive: true, AND: [returnsDueSoonAssetWhere(today, rules)] })
  assert.deepEqual(listWhere("warrantyExpiringSoon"), { isActive: true, AND: [warrantyExpiringSoonWhere(today, rules)] })
  assert.deepEqual(listWhere("licenseExpiringSoon"), { isActive: true, AND: [licenseExpiringSoonWhere(today, rules)] })
})

test("the findings, maintenance and disposal kinds: the link's own filter builds the count's where", () => {
  const findings = (key: WaitingWorkKey) => buildAuditFindingWhere({ status: query(key).get("status"), now, rules })
  assert.deepEqual(findings("pendingAuditFindings"), pendingAuditFindingsWhere)
  assert.deepEqual(findings("openAuditActions"), openAuditActionsWhere(today, rules))
  assert.deepEqual(findings("auditActionsDueSoon"), auditActionsDueSoonWhere(today, rules))
  assert.deepEqual(buildMaintenanceWhere(parseMaintenanceListParams(query("openRepairs"))), openRepairsWhere)
  assert.deepEqual(buildDisposalWhere(parseDisposalListParams(query("pendingDisposals"))), pendingDisposalsWhere)
  assert.deepEqual(buildDisposalWhere(parseDisposalListParams(query("approvedDisposals"))), approvedDisposalsWhere)
  assert.deepEqual(duePmWhere(now), buildDuePmPlanWhere(now))
})

test("the maintenance boxes and the approvals total count with the source's own rule", () => {
  const maintenance = read(`${D}maintenance/page.tsx`)
  assert.match(maintenance, /const duePmWhere = buildDuePmPlanWhere\(now\)/)
  assert.match(maintenance, /prisma\.maintenancePlan\.count\(\{ where: duePmWhere \}\)/)
  assert.match(maintenance, /<section id="pm-due"[\s\S]*?\{t\("pmDueTitle"\)\} \(\{formatCount\(dueTotal\)\}\)/)
  assert.match(maintenance, /prisma\.asset\.count\(\{ where: stuckRepairsWhere \}\)/)
  assert.match(maintenance, /<section id="stuck"[\s\S]*?\{t\("stuckTitle"\)\} \(\{formatCount\(stuckTotal\)\}\)/)
  assert.match(read(`${D}admin/approvals/page.tsx`), /\{ key: "total", label: t\("total"\), value: formatCount\(summary\.total\) \}/)
  assert.equal(read("src/lib/approval-inbox-query.ts").match(/countApprovalInbox\(user, access, policy\)/g)?.length, 2, "the page's total and the source's count are one function")
})
```

In `tests/waiting-work-rules.test.ts`, delete Task 1's test "one link per kind: today's bell links, plus the two repair lists (spec §6.3)" and the comment above it, and drop `buildWaitingWorkHref` from that file's import if nothing else there uses it. The new file holds the full map. `tests/notification-summary.test.ts` needs no change: its two literal hrefs (pendingAuditFindings, pendingDisposals) keep their targets, and its other link check compares each row with `buildWaitingWorkHref`.

`tests/asset-register-ux.test.ts:91-93` (`notifications` reads `src/lib/waiting-work-rules.ts` since Task 1) becomes:

```ts
  assert.doesNotMatch(notifications, /`\/\$\{locale\}\/assets(\?|`)|\/assets\?dataQuality=|asset-management\/checkin|ownershipType=software_license/)
  for (const value of ["warranty", "licenseExpiry", "returnDue"]) {
    assert.match(notifications, new RegExp(`buildExactAssetRegisterHref\\(locale, \\{ dataQuality: "${value}" \\}\\)`), value)
  }
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/waiting-work-links.test.ts tests/asset-register-ux.test.ts`
Expected: FAIL on the full map (the returns, licence and two audit-action links are still Task 1's) and on the `asset-register-ux` pins (`ownershipType=software_license` is still there; no `licenseExpiry` or `returnDue` link). The other three tests already pass: 3A and 3C built the lists and Task 1 the counts, so they stand as the per-kind proof.

- [ ] **Step 3: Implement**

- **`buildWaitingWorkHref`:** the four targets in the table. Nothing else in `src/lib/waiting-work-rules.ts` or `src/lib/waiting-work.ts` moves. The bell, the digest and the notifications page take the new links through `buildNotificationSummaryItems`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/waiting-work-links.test.ts tests/waiting-work-rules.test.ts tests/asset-register-ux.test.ts tests/notification-summary.test.ts tests/notification-groups.test.ts tests/notification-center.test.ts tests/notification-digest.test.ts tests/notification-read-rules-route.test.ts && npx tsc --noEmit && npm test`
Expected: PASS, and the whole suite passes once more because 3D closes Task 3. The fixture hrefs in `notification-center.test.ts:13,75` and `notification-digest.test.ts:18` are input data, not pins, so they stay.

- [ ] **Step 5: Commit**

```bash
git add src/lib/waiting-work-rules.ts tests/waiting-work-links.test.ts tests/waiting-work-rules.test.ts tests/asset-register-ux.test.ts
git commit -m "feat(notifications): every waiting kind links to a list that shows its count (group 1 dashboard task 3D)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The work center's shared kinds read the same source

**Files:**
- Modify: `src/lib/work-center-metrics.ts` (the key type :1-12 and `buildWorkCenterMetricKeys` :31-62; `calculateWorkCenterUrgentCount` :64-70 stays)
- Modify: `src/lib/work-center-view.ts:68-84` (`metricKeysByFocusPanel` gains the two new shared kinds)
- Modify: `src/app/[locale]/(dashboard)/work-center/page.tsx`: imports :21-22 and :36-38, the first data round :57-69, the shared wheres :115-151, the `Promise.all` :153-223, the inbox counts :225-232, `metricMap` :234-323, the keys and the urgent count :324-339
- Modify: `messages/th.json`, `messages/en.json` (deletions only, through `scripts/messages-edit.mjs`)
- Test:
  - `tests/work-center-metrics.test.ts` (rewritten)
  - `tests/work-center-view.test.ts:46-68`
  - `tests/approval-inbox.test.ts`, the test "the approval inbox sentence names only the queues it counts (critique C3)" (:117-123 counted before Task 2, which inserts a test above it)
  - `tests/disposal-sweep-ui.test.ts:193-200`
  - re-run unchanged: `tests/list-pages-ui.test.ts:852-871`, `tests/reports-dashboard-sweep-ui.test.ts:90-97`, `tests/asset-register-ux.test.ts:80-96`, `tests/audit-round-cancellation.test.ts:124-140` (they still hold: the page keeps two `<StatStrip`, five `EmptyNote`s, `buildExactAssetRegisterHref(` for the data-quality cells and `status: auditRoundOperationalWhere` in `pendingAuditItemsWhere`)
- No EXEMPT row moves. The work center has no `loading.tsx` of its own, so no skeleton changes.

**Interfaces:**
- Consumes (Task 1, with Tasks 3A-3D's link targets already in place):
  - `getWaitingWork(user: SessionUser, now?: Date): Promise<{ counts: WaitingWorkCounts; visibleKeys: WaitingWorkKey[]; rules: WaitingWorkRules; approvalInbox: ApprovalInboxCounts }>` from `@/lib/waiting-work`. It never writes (R10). `visibleKeys` already leaves out `pendingAuditFindings` / `pendingDisposals` while the person's inbox holds that kind (R8).
  - From `@/lib/waiting-work-rules` (`./waiting-work-rules.ts` in pure modules; the module is client-safe, R3): `WAITING_WORK_KEYS`, `type WaitingWorkKey`, `buildWaitingWorkHref(locale, key)`, `startOfBangkokDay(now: Date): Date` (R1), and the where builders of R2: `openRepairsWhere`, `stuckRepairsWhere`, `duePmWhere(day: Date)`, `pendingAuditFindingsWhere`, `openAuditActionsWhere(today, rules)`, `auditActionsDueSoonWhere(today, rules)`, `pendingDisposalsWhere`, `approvedDisposalsWhere`.
  - Messages `notifications.<key>` and `notifications.<key>Detail` for every shared kind (Task 1 adds `openRepairs`, `openRepairsDetail`, `stuckRepairs`, `stuckRepairsDetail`, R4; the bell already renders `${key}Detail`, `src/components/layout/notification-bell.tsx:136`).
- Produces (in `src/lib/work-center-metrics.ts`):
  - `WORK_CENTER_SHARED_KEYS = ["approvalInbox", "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals"] as const satisfies readonly WaitingWorkKey[]` and `type WorkCenterSharedKey` (the 9 shared kinds of R12).
  - `WORK_CENTER_OWN_KEYS = ["missingCustodian", "missingSerial", "missingPhoto", "pendingAuditItems"] as const`.
  - `type WorkCenterMetricKey = WorkCenterSharedKey | (typeof WORK_CENTER_OWN_KEYS)[number]`.
  - `isWorkCenterSharedKey(key: WorkCenterMetricKey): key is WorkCenterSharedKey`.
  - `buildWorkCenterMetricKeys(selection: { visibleKeys: readonly WaitingWorkKey[] }): WorkCenterMetricKey[]`. The inbox rule lives only in the source (R8), so the work center no longer repeats it.
  - `calculateWorkCenterUrgentCount`, `WorkCenterUrgentCountInput`, `WorkCenterMetricSelection` and `WorkCenterApprovalInboxCounts` unchanged (the urgent count still reads the inbox).

- [ ] **Step 1: Write the failing tests**

Replace `tests/work-center-metrics.test.ts` with:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { WAITING_WORK_KEYS, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"
import {
  buildWorkCenterMetricKeys,
  calculateWorkCenterUrgentCount,
  isWorkCenterSharedKey,
  WORK_CENTER_SHARED_KEYS,
} from "../src/lib/work-center-metrics.ts"

const everyKind: readonly WaitingWorkKey[] = WAITING_WORK_KEYS
const page = () => readFileSync("src/app/[locale]/(dashboard)/work-center/page.tsx", "utf8").replace(/\r\n/g, "\n")

test("the work center shares nine waiting-work kinds, in the source's order (spec §6.3)", () => {
  assert.deepEqual(WORK_CENTER_SHARED_KEYS, [
    "approvalInbox", "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings",
    "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals",
  ])
  assert.deepEqual(
    WAITING_WORK_KEYS.filter((key) => (WORK_CENTER_SHARED_KEYS as readonly string[]).includes(key)),
    [...WORK_CENTER_SHARED_KEYS],
  )
  assert.equal(isWorkCenterSharedKey("stuckRepairs"), true)
  assert.equal(isWorkCenterSharedKey("missingPhoto"), false)
})

test("every kind the source shows gets its cell, the own kinds keep their places, and a queue the inbox holds stays hidden (R8)", () => {
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: everyKind }), [
    "approvalInbox", "missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "stuckRepairs", "duePm",
    "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingAuditItems", "pendingDisposals", "approvedDisposals",
  ])
  // The source leaves the two covered queues out of an approver's visibleKeys; the work center adds nothing back.
  const approverWithBothKinds = everyKind.filter((key) => key !== "pendingAuditFindings" && key !== "pendingDisposals")
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: approverWithBothKinds }), [
    "approvalInbox", "missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "stuckRepairs", "duePm",
    "openAuditActions", "auditActionsDueSoon", "pendingAuditItems", "approvedDisposals",
  ])
})

test("a kind the person may not see has no cell, and returns, warranty and licence expiry stay off the work center (spec §6.3, R12)", () => {
  const withoutMaintenance = everyKind.filter((key) => !["approvalInbox", "openRepairs", "stuckRepairs", "duePm"].includes(key))
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: withoutMaintenance }), [
    "missingCustodian", "missingSerial", "missingPhoto", "pendingAuditFindings", "openAuditActions",
    "auditActionsDueSoon", "pendingAuditItems", "pendingDisposals", "approvedDisposals",
  ])
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"] }), [
    "missingCustodian", "missingSerial", "missingPhoto", "pendingAuditItems",
  ])
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: [] }), [
    "missingCustodian", "missingSerial", "missingPhoto", "pendingAuditItems",
  ])
})

test("work center urgent count uses approval inbox instead of covered detail counts", () => {
  const count = calculateWorkCenterUrgentCount({
    approvalInbox: { visible: true, total: 7, disposal: 2, audit: 4 },
    pendingAuditFindings: 4,
    pendingDisposals: 2,
    approvedDisposals: 5,
  })
  assert.equal(count, 12)
})

test("the page takes each shared kind's count, title, link and gate from the waiting-work source (spec §6.3)", () => {
  const source = page()
  assert.match(source, /getWaitingWork\(user, now\)/)
  assert.match(source, /const today = startOfBangkokDay\(now\)/)
  assert.match(source, /buildWorkCenterMetricKeys\(\{ visibleKeys: waitingWork\.visibleKeys \}\)/, "the source decides which shared kinds show (R8)")
  assert.match(source, /label: tNotifications\(key\),/)
  assert.match(source, /detail: tNotifications\(`\$\{key\}Detail`\),/)
  assert.match(source, /href: buildWaitingWorkHref\(locale, key\),/)
  assert.match(source, /waitingWork\.counts\[key\]/, "งานทั้งหมด shows the source's number")
  assert.match(source, /openAuditActionsWhere\(today, waitingWork\.rules\)/, "งานของฉัน counts open actions without the due-soon ones")
  assert.match(source, /auditActionsDueSoonWhere\(today, waitingWork\.rules\)/)
  assert.match(source, /applyPlanWorkCenterScope\(duePmWhere\(today\), true, userScope\)/)
  assert.match(source, /applyAssetWorkCenterScope\(stuckRepairsWhere, true, userScope\)/)
  assert.match(source, /applyMaintenanceWorkCenterScope\(\{ \.\.\.openRepairsWhere \}, isMineView, userScope\)/, "the repair panel lists the same kind it counts")
  assert.match(source, /approvalInboxAccess\.canAnyApproval && isPanelFocused\("approvals"\) \? getApprovalInboxSnapshot\(user, locale\) : Promise\.resolve\(null\)/)
  assert.doesNotMatch(source, /openRepairRecordWhere|buildDuePmPlanWhere|getNotificationCenter|recordCountDrops/)
  assert.doesNotMatch(source, /t\("(?:approvalInboxDetail|(?:openRepairs|duePm|pendingAuditFindings|openAuditActions|pendingDisposals|approvedDisposals)(?:Detail)?)"\)/)
})

test("the work center's copies of the source's titles are gone; its own words stay (spec §6.3)", () => {
  for (const locale of ["th", "en"]) {
    const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const key of ["openRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "pendingDisposals", "approvedDisposals"]) {
      assert.equal(m.workCenter[key], undefined, `${locale}: workCenter.${key}`)
      assert.equal(m.workCenter[`${key}Detail`], undefined, `${locale}: workCenter.${key}Detail`)
    }
    assert.equal(m.workCenter.approvalInboxDetail, undefined, `${locale}: workCenter.approvalInboxDetail`)
    assert.equal(typeof m.workCenter.approvalInbox, "string", "the approvals tab keeps its name")
    for (const key of WORK_CENTER_SHARED_KEYS) {
      assert.equal(typeof m.notifications[key], "string", `${locale}: notifications.${key}`)
      assert.equal(typeof m.notifications[`${key}Detail`], "string", `${locale}: notifications.${key}Detail`)
    }
  }
})
```

`tests/work-center-view.test.ts:46-68`, the test "shows only metrics that support the selected work center focus", becomes:

```ts
test("shows only metrics that support the selected work center focus", () => {
  const metricKeys = [
    "approvalInbox", "missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "stuckRepairs", "duePm",
    "openAuditActions", "auditActionsDueSoon", "pendingAuditItems", "approvedDisposals",
  ] as const

  assert.deepEqual(filterWorkCenterMetricKeys(metricKeys, "overview"), [
    "approvalInbox", "openRepairs", "stuckRepairs", "duePm", "openAuditActions", "auditActionsDueSoon", "pendingAuditItems", "approvedDisposals",
  ])
  assert.deepEqual(filterWorkCenterMetricKeys(metricKeys, "assets"), ["missingCustodian", "missingSerial", "missingPhoto"])
  assert.deepEqual(filterWorkCenterMetricKeys(metricKeys, "maintenance"), ["openRepairs", "stuckRepairs", "duePm"])
  assert.deepEqual(filterWorkCenterMetricKeys(metricKeys, "audit"), ["openAuditActions", "auditActionsDueSoon", "pendingAuditItems"])
})
```

In `tests/approval-inbox.test.ts`, the test "the approval inbox sentence names only the queues it counts (critique C3)" (at :117-123 before Task 2; Task 2's new test sits above it now, so find it by its name): replace the `assert.equal(m.notifications.approvalInboxDetail, m.workCenter.approvalInboxDetail)` line with `assert.equal(m.workCenter.approvalInboxDetail, undefined, "the work center reads notifications.approvalInboxDetail (group 1 dashboard task 4)")`. Keep the `doesNotMatch` on `m.notifications.approvalInboxDetail`.

`tests/disposal-sweep-ui.test.ts:195`: the loop runs over `["dashboard", "notifications"]`. After the loop add:

```ts
  for (const m of [th, en]) {
    for (const key of ["pendingDisposals", "approvedDisposals"]) {
      assert.equal(m.workCenter[key], undefined, `workCenter.${key}: the work center reads notifications.${key} (group 1 dashboard task 4)`)
    }
  }
```

The two `workCenter.disposalSubtitle` lines stay.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/work-center-metrics.test.ts tests/work-center-view.test.ts tests/approval-inbox.test.ts tests/disposal-sweep-ui.test.ts`
Expected: FAIL. `work-center-metrics.ts` does not provide an export named `WORK_CENTER_SHARED_KEYS`; the view test fails on `stuckRepairs`; the two message tests fail on the keys that still exist.

- [ ] **Step 3: Delete the work center's copies of the source's words**

Through `node scripts/messages-edit.mjs` with:

```json
{ "delete": [
  "workCenter.approvalInboxDetail",
  "workCenter.openRepairs", "workCenter.openRepairsDetail",
  "workCenter.duePm", "workCenter.duePmDetail",
  "workCenter.pendingAuditFindings", "workCenter.pendingAuditFindingsDetail",
  "workCenter.openAuditActions", "workCenter.openAuditActionsDetail",
  "workCenter.pendingDisposals", "workCenter.pendingDisposalsDetail",
  "workCenter.approvedDisposals", "workCenter.approvedDisposalsDetail"
] }
```

These are the 13 superseded keys of R12. `workCenter.approvalInbox` stays (the approvals tab, `page.tsx:394`). No new string: the cells read `notifications.<key>` and `notifications.<key>Detail`, so the work center's "ยังซ่อมไม่เสร็จ" becomes the source's "ซ่อมยังไม่เสร็จ" and every foot line is the bell's sentence.

- [ ] **Step 4: Implement**

- **`src/lib/work-center-metrics.ts`:**
  - `import type { WaitingWorkKey } from "./waiting-work-rules.ts"` (type only, so `node --test` loads nothing else).
  - The constants, the union and `isWorkCenterSharedKey` from the Interfaces.
  - `buildWorkCenterMetricKeys` walks this fixed order and returns the keys it keeps:

    | Order | Key | Kept when |
    |---|---|---|
    | 1 | `approvalInbox` | `visibleKeys` has it |
    | 2-4 | `missingCustodian`, `missingSerial`, `missingPhoto` | always (the work center's own) |
    | 5-10 | `openRepairs`, `stuckRepairs`, `duePm`, `pendingAuditFindings`, `openAuditActions`, `auditActionsDueSoon` | `visibleKeys` has it |
    | 11 | `pendingAuditItems` | always |
    | 12-13 | `pendingDisposals`, `approvedDisposals` | `visibleKeys` has it |

    The shared kinds keep the source's order; the own kinds keep today's places. `returnsDueSoon`, `warrantyExpiringSoon` and `licenseExpiringSoon` are never kept (R12). Today's two inbox checks (:49 and :55) go: the source already leaves a covered queue out of `visibleKeys` (R8), and its rule (`inbox.audit === 0`, `inbox.disposal === 0`, with the inbox all zeros for a person who cannot approve, `approval-inbox-query.ts:85`) is the work center's rule today.
- **`src/lib/work-center-view.ts:68-84`:** `stuckRepairs` goes right after `openRepairs` in `overview` and `maintenance`; `auditActionsDueSoon` right after `openAuditActions` in `overview` and `audit`.
- **The page:**
  - Imports: drop `openRepairRecordWhere` (:37) and `buildDuePmPlanWhere` (:38). Add `getWaitingWork` from `@/lib/waiting-work`; `buildWaitingWorkHref`, `startOfBangkokDay` and the eight where builders of R2 this page uses (`openRepairsWhere`, `stuckRepairsWhere`, `duePmWhere`, `pendingAuditFindingsWhere`, `openAuditActionsWhere`, `auditActionsDueSoonWhere`, `pendingDisposalsWhere`, `approvedDisposalsWhere`) from `@/lib/waiting-work-rules`; `isWorkCenterSharedKey` and `type WorkCenterSharedKey` from `@/lib/work-center-metrics`. Add `const tNotifications = await getTranslations("notifications")`.
  - First round (:63-65): `const now = new Date()`, then the employee lookup and `getWaitingWork(user, now)` in one `Promise.all` (`[employeeProfile, waitingWork]`). The page never calls `getNotificationCenter`; `getWaitingWork` does not write (R10).
  - `const today = startOfBangkokDay(now)` (R1, the day `getWaitingWork` used).
  - `metricKeys = buildWorkCenterMetricKeys({ visibleKeys: waitingWork.visibleKeys })` moves above the second round: it needs no count.
  - The wheres (:115-151): the local `duePmWhere` (:116, whose name the imported builder now takes), `pendingAuditFindingWhere`, `openAuditActionWhere`, `pendingDisposalWhere` and `approvedDisposalWhere` go. `openRepairWhere` becomes `applyMaintenanceWorkCenterScope({ ...openRepairsWhere }, isMineView, userScope)` (the repair panel's list). The data-quality wheres, `auditItemWhere`, `pendingAuditItemsWhere` and `disposalItemWhere` stay as they are.
  - Second round (:153-223), one `Promise.all`:
    - the four own counts (`missingCustodian`, `missingSerial`, `missingPhoto`, `pendingAuditItems`) as today;
    - in the "ของฉัน" view only, one count per shared kind in `metricKeys` other than `approvalInbox`, narrowed with today's scope helpers (in "ทั้งหมด", none):

      | Kind | Count on | Where | Scope helper |
      |---|---|---|---|
      | `openRepairs` | `maintenanceTicket` | `{ ...openRepairsWhere }` | `applyMaintenanceWorkCenterScope` |
      | `stuckRepairs` | `asset` | `stuckRepairsWhere` | `applyAssetWorkCenterScope` |
      | `duePm` | `maintenancePlan` | `duePmWhere(today)` | `applyPlanWorkCenterScope` |
      | `pendingAuditFindings` | `auditFinding` | `pendingAuditFindingsWhere` | `applyAuditFindingWorkCenterScope` |
      | `openAuditActions` | `auditFinding` | `openAuditActionsWhere(today, waitingWork.rules)` | `applyAuditFindingWorkCenterScope` |
      | `auditActionsDueSoon` | `auditFinding` | `auditActionsDueSoonWhere(today, waitingWork.rules)` | `applyAuditFindingWorkCenterScope` |
      | `pendingDisposals` | `disposalRequest` | `pendingDisposalsWhere` | `applyDisposalWorkCenterScope` |
      | `approvedDisposals` | `disposalRequest` | `approvedDisposalsWhere` | `applyDisposalWorkCenterScope` |

      Each call passes `true` as `active`, for example `applyAssetWorkCenterScope(stuckRepairsWhere, true, userScope)`. The result is `mineCounts: Partial<Record<WorkCenterSharedKey, number>>`.
    - the approval snapshot, now only for its list: `approvalInboxAccess.canAnyApproval && isPanelFocused("approvals") ? getApprovalInboxSnapshot(user, locale) : Promise.resolve(null)`;
    - the four panel lists as today.
  - `const sharedCount = (key: WorkCenterSharedKey) => …`: `waitingWork.counts[key]` for `approvalInbox` (the person's own inbox, unscoped in both views, as today) and for every kind in "ทั้งหมด"; `mineCounts[key] ?? 0` in "ของฉัน".
  - `approvalInboxCounts` (:225) is `waitingWork.approvalInbox`. `visibleAuditItems` and `visibleDisposalItems` (:227-232) keep their rule on it.
  - `metricMap` (:234-323) becomes `metricFor(key: WorkCenterMetricKey): WorkCenterMetric`:
    - a shared kind: `{ key, label: tNotifications(key), value: sharedCount(key), detail: tNotifications(`${key}Detail`), href: buildWaitingWorkHref(locale, key), tone: SHARED_TONES[key] }`, written exactly so (the test pins each property line);
    - an own kind: today's four objects (:243-266 and :299-306), unchanged.
    - `SHARED_TONES: Record<WorkCenterSharedKey, "danger" | "warning">` in the page: `danger` for `approvalInbox`, `pendingAuditFindings`, `auditActionsDueSoon`, `pendingDisposals`; `warning` for the rest. The `attention` rule (:358) is unchanged, so a cell above 0 gets the warning foot as today.
  - `metrics = filterWorkCenterMetricKeys(metricKeys, workCenterParams.panel).map(metricFor)`. `calculateWorkCenterUrgentCount` takes `sharedCount("pendingAuditFindings")`, `sharedCount("pendingDisposals")` and `sharedCount("approvedDisposals")`.
  - Nothing else on the page changes: the header, the two TabNavs, the panels, `FollowUpItem` and the scope helpers.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/work-center-metrics.test.ts tests/work-center-view.test.ts tests/approval-inbox.test.ts tests/disposal-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/reports-dashboard-sweep-ui.test.ts tests/asset-register-ux.test.ts tests/audit-round-cancellation.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npm test && npx tsc --noEmit`
Expected: PASS, every test, and tsc is clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/work-center-metrics.ts src/lib/work-center-view.ts "src/app/[locale]/(dashboard)/work-center/page.tsx" messages/th.json messages/en.json tests/work-center-metrics.test.ts tests/work-center-view.test.ts tests/approval-inbox.test.ts tests/disposal-sweep-ui.test.ts
git commit -m "feat(work-center): the shared kinds take their count, title, link and gate from the waiting-work source (group 1 dashboard task 4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The audit round detail filters by company and branch

**Files:**
- Modify: `src/lib/audit-round-result-filters.ts`: `AuditRoundResultListState` :17-22, `AuditRoundResultListParams` :24-29, `parseAuditRoundResultListParams` :99-108, `buildAuditRoundItemWhere` :110-137, `buildAuditExportFilterLabel` :163-175, `buildAuditExportFilename` :186-205, `buildAuditRoundResultListHref` :212-236; new `buildAuditRoundItemsHref` and `auditRoundBranchFilterName` after it
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`: imports :18-20 and :38-50, the `searchParams` type :55, `resultItemWhere` :70, the `Promise.all` :73-236, the filter redirect after `returnToHref` :289, `resultListReturnHref` :293-301, the last-page redirect :318, the export hrefs :378-379, the result-list head and search :583-614, the pagination :780-783, `buildAuditRoundExportHref` :850-864
- Modify: `src/app/api/audit-rounds/[id]/export/route.ts:45-61,104,110-112` and `src/app/api/audit-rounds/[id]/export-pdf/route.ts:41-57,85,91-93` (the exports follow both chips, R13)
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Test: `tests/audit-round-result-drilldown.test.ts` (new tests, and the route test :155-170 gains three pins)
- Pins that still hold, re-run: `tests/list-pages-ui.test.ts:357-370` (the `pageSizes` pin's `[^}]*` takes the new `...itemFilters,` before `page: 1`), `tests/operational-return-navigation.test.ts:61` (the type regex takes `; companyId?: string | string[]; branchId?: string | string[]` after `pageSize`), `tests/audit-round-result-drilldown.test.ts:190-210` (`filterLabel`, `result !== "all"` and `search.trim()` stay), `tests/phase2d-final-ui.test.ts`, `tests/e2e-fixes.test.ts:64-68`, `tests/audit-pages-sweep-ui.test.ts`, `tests/audit-item-status-labels.test.ts:69-74`, `tests/audit-round-cancellation.test.ts:88-110`, `tests/breadcrumbs-ui.test.ts`, `tests/mobile-action-bar.test.ts`.
- No EXEMPT row moves (no new `ArrowLeft`, `<button>`, heading or colour). The round page has no `loading.tsx` of its own.

**Interfaces:**
- Consumes: nothing from Tasks 1-4. This task can run in parallel with them.
- Produces (in `src/lib/audit-round-result-filters.ts`, for Tasks 8, 9 and 10):
  - `buildAuditRoundItemsHref(locale: string, roundId: string, filters: { branchId?: string; companyId?: string }): string` (R13), which returns `buildAuditRoundResultListHref({ locale, roundId, result: "all", companyId: filters.companyId, branchId: filters.branchId })`, for example `/th/audit/rounds/<roundId>?companyId=<companyId>&branchId=<branchId>&page=1&pageSize=25#audit-result-list`. No `returnTo` (R14). Callers holding `companyId: string | null` pass `companyId ?? undefined`.
  - `buildAuditRoundItemWhere({ roundId, result, search, companyId, branchId }: { roundId: string; result: AuditRoundResultFilter; search?: string | null; companyId?: string | null; branchId?: string | null }): Prisma.AuditItemWhereInput`. The narrowed list is `{ auditRoundId, expectedCompanyId?, expectedBranchId? }`, so Task 8's numbers equal their lists by construction: the round KPI's "expected" with a company chosen is the count of `buildAuditRoundItemWhere({ roundId, result: "all", companyId })`, and a branch row's is the count of `buildAuditRoundItemWhere({ roundId, result: "all", companyId, branchId })` (`companyId` null with "ทุกบริษัท").
  - `AuditRoundResultListState` gains `companyId: string | null` and `branchId: string | null`; `buildAuditRoundResultListHref` gains `companyId?: string | null` and `branchId?: string | null` (URL order: `result`, `search`, `companyId`, `branchId`, `page`, `pageSize`, `returnTo`).
  - `auditRoundBranchFilterName(branch: { name: string; companyCode: string }, companyChosen: boolean): string`: R16's rule, `"<company code> / <branch name>"` without a company, the branch name alone with one. The argument has the shape of Task 8's branch map values (`{ name, companyCode }`), so `buildDashboardAudit` can call it as `auditRoundBranchFilterName(branch, narrowedToCompany)`.
  - `buildAuditExportFilterLabel({ result, search, company, branch }: { result: AuditRoundResultFilter; search?: string | null; company?: { code: string } | null; branch?: { code: string; company: { code: string } } | null }): string`, and `buildAuditExportFilename` gains the same `company` and `branch`.
- The round's StatStrip, progress bar, result buckets and evidence stay round-wide (R13); only the item list, its search, its pages and its exports narrow.

- [ ] **Step 1: Add the chips' words**

Through `node scripts/messages-edit.mjs`, set in `auditRound` (new keys; checked against `docs/19_THAI_GLOSSARY.md`, "ตัวกรอง" is its word for Filter):

| Key | th | en |
|---|---|---|
| `companyFilterChip` | บริษัท: {company} | Company: {company} |
| `branchFilterChip` | สาขา: {branch} | Branch: {branch} |
| `activeFilters` | ตัวกรองที่ใช้อยู่ | Active filters |
| `clearFilter` | ล้างตัวกรองนี้ | Clear this filter |

The last two repeat `auditFinding.activeFilters` and `asset.clearDrilldownFilter`, so the round page reads its own namespace only. The first two follow the register's chips ("บริษัท: …", "สาขา: …", `asset-register-chips.ts:41-42`).

- [ ] **Step 2: Write the failing tests**

In `tests/audit-round-result-drilldown.test.ts`, add `auditRoundBranchFilterName`, `buildAuditExportFilename`, `buildAuditExportFilterLabel`, `buildAuditRoundItemsHref` and `parseAuditRoundResultListParams` to the import, and add:

```ts
const roundPage = () => readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8").replace(/\r\n/g, "\n")

test("the round's item list narrows to the expected company and branch, alone or with a bucket and a search (spec §6.7, R13)", () => {
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", branchId: "branch-1" }), {
    auditRoundId: "round-1",
    expectedBranchId: "branch-1",
  })
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", companyId: "company-1" }), {
    auditRoundId: "round-1",
    expectedCompanyId: "company-1",
  })
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "not_found", search: "SNI", companyId: "company-1", branchId: "branch-1" }), {
    auditRoundId: "round-1",
    expectedCompanyId: "company-1",
    expectedBranchId: "branch-1",
    auditResult: "not_found",
    OR: [
      { asset: { assetTag: { contains: "SNI" } } },
      { asset: { name: { contains: "SNI" } } },
    ],
  })
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", companyId: null, branchId: null }), { auditRoundId: "round-1" })
})

test("the company and branch params are read once and trimmed, and an empty one is no filter", () => {
  const state = parseAuditRoundResultListParams({ companyId: [" company-1 ", "company-2"], branchId: " branch-1 " })
  assert.equal(state.companyId, "company-1")
  assert.equal(state.branchId, "branch-1")
  assert.equal(parseAuditRoundResultListParams({ companyId: "   " }).companyId, null)
  assert.equal(parseAuditRoundResultListParams({ branchId: "   " }).branchId, null)
  assert.deepEqual(parseAuditRoundResultListParams({}), { result: "all", search: "", companyId: null, branchId: null, page: 1, pageSize: 25 })
})

test("the dashboard's links open the round's whole item list for a company, a branch or both, and the list's own links keep them (spec §6.7, R13)", () => {
  assert.equal(buildAuditRoundItemsHref("th", "round-1", { branchId: "branch-1" }), "/th/audit/rounds/round-1?branchId=branch-1&page=1&pageSize=25#audit-result-list")
  assert.equal(buildAuditRoundItemsHref("th", "round-1", { companyId: "company-1" }), "/th/audit/rounds/round-1?companyId=company-1&page=1&pageSize=25#audit-result-list")
  assert.equal(
    buildAuditRoundItemsHref("th", "round-1", { companyId: "company-1", branchId: "branch-1" }),
    "/th/audit/rounds/round-1?companyId=company-1&branchId=branch-1&page=1&pageSize=25#audit-result-list",
  )
  assert.equal(buildAuditRoundItemsHref("th", "round-1", {}), "/th/audit/rounds/round-1?page=1&pageSize=25#audit-result-list")
  assert.equal(
    buildAuditRoundResultListHref({ locale: "th", roundId: "round-1", result: "found", search: "SNI", companyId: "company-1", branchId: "branch-1", page: 2, pageSize: 50, returnTo: "/th/audit/rounds" }),
    "/th/audit/rounds/round-1?result=found&search=SNI&companyId=company-1&branchId=branch-1&page=2&pageSize=50&returnTo=%2Fth%2Faudit%2Frounds#audit-result-list",
  )
})

test("a branch is named with its company's code until a company is chosen (R16)", () => {
  const headOffice = { name: "สำนักงานใหญ่", companyCode: "SNI" }
  assert.equal(auditRoundBranchFilterName(headOffice, false), "SNI / สำนักงานใหญ่")
  assert.equal(auditRoundBranchFilterName(headOffice, true), "สำนักงานใหญ่")
})

test("an export of a narrowed list says so in its label and file name, naming the branch as the chip does (R13, R16)", () => {
  const sni = { code: "SNI" }
  const hq = { code: "HQ", company: sni }
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "", branch: hq }), "branch-SNI-HQ")
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "", company: sni }), "company-SNI")
  assert.equal(buildAuditExportFilterLabel({ result: "found", search: "PC", company: sni, branch: hq }), "found-company-SNI-branch-HQ-search-PC")
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "" }), "all")
  assert.equal(
    buildAuditExportFilename({ prefix: "audit-result", auditNo: "AUD-2026-0003", result: "all", search: "", company: sni, branch: hq, extension: "xlsx", date: new Date("2026-10-26T03:00:00Z") }),
    "audit-result-AUD-2026-0003-company-SNI-branch-HQ-2026-10-26.xlsx",
  )
})

test("the round page narrows its item list by company and branch, names each in a removable chip, and counts the filtered list (spec §6.7, R13)", () => {
  const page = roundPage()
  assert.match(page, /searchParams: Promise<\{[^}]*pageSize\?: string \| string\[\]; companyId\?: string \| string\[\]; branchId\?: string \| string\[\] \}>/)
  assert.match(page, /const itemFilters = \{ companyId: resultListState\.companyId, branchId: resultListState\.branchId \}/)
  assert.match(page, /const resultItemWhere = buildAuditRoundItemWhere\(\{ roundId: id, result: resultListState\.result, search: resultListState\.search, \.\.\.itemFilters \}\)/)
  assert.match(page, /prisma\.auditItem\.count\(\{ where: resultItemWhere \}\)/, "the number above the list counts the filtered list")
  assert.match(page, /prisma\.company\.findUnique\(\{ where: \{ id: resultListState\.companyId \}, select: \{ code: true, nameTh: true \} \}\)/)
  assert.match(page, /prisma\.branch\.findUnique\(\{ where: \{ id: resultListState\.branchId \}, select: \{ name: true, company: \{ select: \{ code: true \} \} \} \}\)/)
  assert.match(page, /if \(\(resultListState\.companyId && !filterCompany\) \|\| \(resultListState\.branchId && !filterBranch\)\) \{\n\s+redirect\(buildAuditRoundResultListHref\(/, "an unknown company or branch drops its filter")
  assert.match(page, /label: t\("companyFilterChip", \{ company: `\$\{filterCompany\.code\} - \$\{filterCompany\.nameTh\}` \}\)/)
  assert.match(page, /label: t\("branchFilterChip", \{ branch: auditRoundBranchFilterName\(\{ name: filterBranch\.name, companyCode: filterBranch\.company\.code \}, Boolean\(filterCompany\)\) \}\)/, "R16")
  assert.match(page, /<FilterChipList className="mb-3" chips=\{resultFilterChips\} label=\{t\("activeFilters"\)\} removeLabel=\{t\("clearFilter"\)\} \/>/)
  assert.match(page, /\.\.\.\(resultListState\.companyId \? \{ companyId: resultListState\.companyId \} : \{\}\)/, "the search keeps the company")
  assert.match(page, /\.\.\.\(resultListState\.branchId \? \{ branchId: resultListState\.branchId \} : \{\}\)/, "the search keeps the branch")
  assert.match(page, /previousHref=\{buildAuditRoundResultListHref\(\{ [^}]*\.\.\.itemFilters, page: resultListState\.page - 1/)
  assert.match(page, /state: Pick<AuditRoundResultListState, "result" \| "search" \| "companyId" \| "branchId">/)
  assert.doesNotMatch(page, /const \w+ResultHref = buildAuditRoundResultListHref\(\{[^}]*(?:itemFilters|companyId|branchId)/, "the round-wide buckets open round-wide lists")
})

test("the company and branch chips' words (spec §6.7)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.auditRound.companyFilterChip, "บริษัท: {company}")
  assert.equal(en.auditRound.companyFilterChip, "Company: {company}")
  assert.equal(th.auditRound.branchFilterChip, "สาขา: {branch}")
  assert.equal(en.auditRound.branchFilterChip, "Branch: {branch}")
  assert.equal(th.auditRound.activeFilters, "ตัวกรองที่ใช้อยู่")
  assert.equal(en.auditRound.activeFilters, "Active filters")
  assert.equal(th.auditRound.clearFilter, "ล้างตัวกรองนี้")
  assert.equal(en.auditRound.clearFilter, "Clear this filter")
})
```

In the existing test "audit round result exports use the same filters as the on-screen result list" (:155-170), add inside the `for (const route of …)` loop:

```ts
    assert.match(route, /request\.nextUrl\.searchParams\.get\("companyId"\)/)
    assert.match(route, /request\.nextUrl\.searchParams\.get\("branchId"\)/)
    assert.match(route, /buildAuditRoundItemWhere\(\{ roundId, result, search, \.\.\.filters \}\)/)
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/audit-round-result-drilldown.test.ts`
Expected: FAIL. The module does not provide the new exports (Node names one of `auditRoundBranchFilterName` and `buildAuditRoundItemsHref`). After stubs, the where, parse, href, name, label and page pins fail.

- [ ] **Step 4: Implement**

- **`src/lib/audit-round-result-filters.ts`:**
  - The params type gains `companyId?: string | string[]` and `branchId?: string | string[]`. `parseAuditRoundResultListParams` sets each to its first value trimmed, or `null` when empty.
  - `buildAuditRoundItemWhere` sets `where.expectedCompanyId = companyId` and `where.expectedBranchId = branchId`, each only when set. They AND with the bucket and the search.
  - `buildAuditRoundScanHistoryWhere` is unchanged. Out-of-scope rows are scan history, which has no expected company or branch, so the out-of-scope list ignores both.
  - `buildAuditRoundResultListHref` sets `companyId` then `branchId` after `search` and before `page`, each only when set. The existing href test (:57-70) keeps its exact string.
  - `buildAuditRoundItemsHref` and `auditRoundBranchFilterName` as in the Interfaces.
  - `buildAuditExportFilterLabel` pushes, after the result and before the search: `company-${company.code}` when `company` is set, then `branch-${branch.code}` when a company is set too, else `branch-${branch.company.code}-${branch.code}` (R16's rule, so a branch code shared by two companies stays unambiguous). `buildAuditExportFilename` passes `company` and `branch` through.
- **The page:**
  - `:55` appends `; companyId?: string | string[]; branchId?: string | string[]` to the `searchParams` type, after `pageSize`.
  - Above `:70`: `const itemFilters = { companyId: resultListState.companyId, branchId: resultListState.branchId }`. `:70`: `const resultItemWhere = buildAuditRoundItemWhere({ roundId: id, result: resultListState.result, search: resultListState.search, ...itemFilters })`. The list (:165-198) and its count (:199) already read `resultItemWhere`, so the number above the list (:592) is the filtered count.
  - The `Promise.all` (:73-236) gains two last entries. `AuditItem.expectedCompanyId` and `expectedBranchId` have no relation (`prisma/schema.prisma:669-670`), so the names need their own reads:
    - `filterCompany`: `resultListState.companyId ? prisma.company.findUnique({ where: { id: resultListState.companyId }, select: { code: true, nameTh: true } }) : Promise.resolve(null)`;
    - `filterBranch`: `resultListState.branchId ? prisma.branch.findUnique({ where: { id: resultListState.branchId }, select: { name: true, company: { select: { code: true } } } }) : Promise.resolve(null)`.
  - Right after `returnToHref` (:289): `if ((resultListState.companyId && !filterCompany) || (resultListState.branchId && !filterBranch)) {` then `redirect(buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, companyId: filterCompany ? resultListState.companyId : null, branchId: filterBranch ? resultListState.branchId : null, pageSize: resultListState.pageSize }))` and `}`. An unknown or stale id drops only its own filter, so the page never shows a list under a chip it cannot name.
  - `...itemFilters` joins these calls of `buildAuditRoundResultListHref`, right before `page`:
    - `resultListReturnHref` (:293), so the scan-edit return keeps both;
    - the last-page redirect (:318);
    - `previousHref`, `nextHref` and `pageSizes` (:780-783).
  - The bucket links (:353-360) stay without them (R13). The bucket numbers, the StatStrip, the progress bar and the evidence count the whole round. The out-of-scope bucket cannot follow a company or branch, so the buckets stay round-wide and each number still opens a list of the same count.
  - `resultFilterChips: FilterChipItem[]`, empty on the out-of-scope list, else in this order:
    - when `filterCompany`: ``{ key: "companyId", label: t("companyFilterChip", { company: `${filterCompany.code} - ${filterCompany.nameTh}` }), href }``, the register's company name (`assets/page.tsx:239`);
    - when `filterBranch`: `{ key: "branchId", label: t("branchFilterChip", { branch: auditRoundBranchFilterName({ name: filterBranch.name, companyCode: filterBranch.company.code }, Boolean(filterCompany)) }), href }` (R16).
    - Each `href` is the same list without that one filter: `buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, ...itemFilters, companyId: null, pageSize: resultListState.pageSize })` for the company chip, and the same with `branchId: null` for the branch chip. Removing the company keeps the branch, whose chip then names its company code.
  - Under the list head (:584-606), before `MasterDataSearch`: `<FilterChipList className="mb-3" chips={resultFilterChips} label={t("activeFilters")} removeLabel={t("clearFilter")} />`. It renders nothing without a chip. Import `FilterChipList` and `type FilterChipItem` from `@/components/ui/filter-chips`, and `auditRoundBranchFilterName` with the other filter helpers (:38-50).
  - `MasterDataSearch` `hiddenInputs` (:613) gains `...(resultListState.companyId ? { companyId: resultListState.companyId } : {})` and `...(resultListState.branchId ? { branchId: resultListState.branchId } : {})` (the prop takes `string | number` values only).
  - `buildAuditRoundExportHref` (:850-864): `state: Pick<AuditRoundResultListState, "result" | "search" | "companyId" | "branchId">`. It sets `companyId` then `branchId` when set, so both export buttons carry them.
  - The "ดูทั้งหมด" link (:600-604) keeps its condition. Each chip removes its own filter, and "ดูทั้งหมด" (`allResultHref`) clears everything.
- **The two export routes:**
  - Read `const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || null` and `branchId` the same way.
  - One `Promise.all` holds the round's `findFirst` (unchanged), `companyId ? prisma.company.findUnique({ where: { id: companyId }, select: { code: true } }) : Promise.resolve(null)` and `branchId ? prisma.branch.findUnique({ where: { id: branchId }, select: { code: true, company: { select: { code: true } } } }) : Promise.resolve(null)`.
  - `const exportCompany = isOutOfScopeExport ? null : company` and `const exportBranch = isOutOfScopeExport ? null : branch`. The out-of-scope export ignores both, as the page does. An unknown id exports as if absent, as the page's redirect shows.
  - `const filters = { companyId: exportCompany ? companyId : null, branchId: exportBranch ? branchId : null }`.
  - `const filterLabel = buildAuditExportFilterLabel({ result, search, company: exportCompany, branch: exportBranch })` moves below the lookup and the round's 404/400 checks; the PDF subtitle (:65) is unchanged.
  - `buildAuditItemExportRows(id, result, search, filters)` takes `filters: { companyId: string | null; branchId: string | null }` and builds its where with `buildAuditRoundItemWhere({ roundId, result, search, ...filters })`.
  - `buildAuditExportFilename` gets `company: exportCompany, branch: exportBranch`.
- **Pending page:** unchanged. The dashboard links to the item list (spec §6.7), and `[id]/pending` keeps its room filter.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-round-result-drilldown.test.ts tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/phase2d-final-ui.test.ts tests/e2e-fixes.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-item-status-labels.test.ts tests/audit-round-cancellation.test.ts tests/breadcrumbs-ui.test.ts tests/mobile-action-bar.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npm test && npx tsc --noEmit`
Expected: PASS, every test, and tsc is clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/audit-round-result-filters.ts "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" "src/app/api/audit-rounds/[id]/export/route.ts" "src/app/api/audit-rounds/[id]/export-pdf/route.ts" messages/th.json messages/en.json tests/audit-round-result-drilldown.test.ts
git commit -m "feat(audit): the round's item list filters by company and branch with removable chips, and its exports follow (group 1 dashboard task 5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

---

### Task 6: StatStrip says which filter a number uses, and takes a bar under a value

**Files:**
- Modify: `src/components/ui/stat-strip.tsx`: the React import :1, `StatStripItem` :8-25, the class constants :27-32, `StatStrip` :37-71, including the value `dd` :52-55 (master 97699c61; the login work did not touch it)
- Modify: `DESIGN.md:476` (the `StatStrip` paragraph; line on `feat/group1-login` 182ef903, which is master once the login merges)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md:82` (the StatStrip row of the Need / Use table)
- Modify: `.impeccable/design.json:485` (the Stat Strip `description`)
- Create: `tests/stat-strip-note-meter.test.ts`
- Re-run unchanged (they still hold, because no pinned string changes; the value `dd`'s class at :52 is not pinned anywhere in `tests/`): `tests/list-primitives-ui.test.ts:247-271`, `tests/phase2d-final-ui.test.ts:34-45`, `tests/page-loading-skeleton.test.ts:41`, `tests/visual-foundation-guards.test.ts:72,96-105`, `tests/phase2d-docs.test.ts:40,53,78`.
- No EXEMPT or OWNERS row moves. The note and the meter add no `<button>`, no raw color, no `shadow-sm|md|lg|xl|2xl` (the note uses `shadow-overlay`, the floating-layer shadow that R2 does not match), no `opacity-` (so the meter's `pointer-events-none` is not LT5's faded-disabled look) and no `aria-current`.

**Interfaces:**
- Produces (for Task 9):
  - `StatStripItem.filterNote?: string`, one short sentence that names the filter the cell's number uses. It needs `href`: the note describes the cell's link, and a cell with `filterNote` and no `href` shows none (R19).
  - `StatStripItem.meter?: React.ReactNode` (R18): a server-safe bar drawn full width under the value, inside the value `dd`. The audit KPI passes Task 7's `<PaceBar …/>`, whose root is a block `span`. It holds no link of its own: the cell's stretched link still covers it (`pointer-events-none`).
  - `StatStrip({ items, className }: { items: readonly StatStripItem[]; className?: string })` is unchanged.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing test** `tests/stat-strip-note-meter.test.ts`

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 dashboard task 6 (spec 2026-10-25 §6.5): a StatStrip cell can name the filter its number uses. The note is a
// small panel in the tooltip look under the cell, shown by CSS alone while the cell is hovered or its own link has
// keyboard focus, and the link names it with aria-describedby. The strip's frame clips its cells (overflow-hidden for
// the rounded corners), so the panel is position: fixed and placed under its cell with CSS anchor positioning.
// A cell can also carry a meter (R18): a bar full width under its value, inside the value dd, for the audit KPI's
// PaceBar. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const STRIP = "src/components/ui/stat-strip.tsx"

test("StatStrip: an optional filter note under the cell, on hover and on focus-visible of the cell's link, tied by aria-describedby (spec §6.5)", () => {
  const source = read(STRIP)
  assert.match(source, /\n  filterNote\?: string\n/)
  assert.match(source, /^import \* as React from "react"$/m)
  assert.match(source, /const noteIdBase = React\.useId\(\)/)
  assert.match(source, /const noteId = item\.href && item\.filterNote \? `\$\{noteIdBase\}-note-\$\{index\}` : undefined/)
  assert.equal(
    source.match(/const statNoteClasses = "([^"]+)"/)?.[1],
    "pointer-events-none invisible fixed top-[anchor(bottom)] left-[anchor(left)] z-50 mt-1 max-w-72 rounded-md border border-border bg-popover px-2.5 py-1.5 text-meta text-popover-foreground shadow-overlay group-hover:visible group-has-[dt_a:focus-visible]:visible",
  )
  assert.match(source, /style=\{noteId \? \{ anchorName: `--\$\{noteId\}` \} : undefined\}/, "the cell is the note's anchor")
  assert.match(
    source,
    /<Link href=\{item\.href\} scroll=\{item\.scroll\} aria-describedby=\{noteId\} aria-current=\{item\.current \? "page" : undefined\} className="after:absolute after:inset-0 focus-visible:outline-none">/,
  )
  assert.match(
    source,
    /\{noteId \? \(\n\s+<dd id=\{noteId\} className=\{statNoteClasses\} style=\{\{ positionAnchor: `--\$\{noteId\}` \}\}>\n\s+\{item\.filterNote\}\n\s+<\/dd>\n\s+\) : null\}/,
  )
  assert.ok(source.indexOf("<dd id={noteId}") > source.indexOf("title={item.footTitle}"), "the note is the cell's last child, after the foot: out of flow, so the three subgrid rows stay")
  assert.doesNotMatch(source, /title=\{item\.filterNote\}|"use client"|\buseState\b|\buseEffect\b|opacity-|\bshadow-(?:sm|md|lg|xl|2xl)\b/)
})

test("StatStrip: an optional meter, full width under the value inside the value dd, which the cell's link still covers (R18)", () => {
  const source = read(STRIP)
  assert.match(source, /\n  meter\?: React\.ReactNode\n/)
  assert.match(source, /<dd className="flex min-w-0 flex-wrap items-baseline gap-1">/, "the value row wraps, so the meter takes a line of its own")
  assert.match(
    source,
    /\{item\.unit \? <span className="text-base font-medium text-faint-foreground">\{item\.unit\}<\/span> : null\}\n\s+\{item\.meter \? <span className="pointer-events-none basis-full pt-1">\{item\.meter\}<\/span> : null\}\n\s+<\/dd>/,
    "after the unit, the last child of the value dd; a click on the bar opens the cell's link",
  )
})

test("DESIGN.md, docs/14 and design.json describe the filter note and the meter (group 1 dashboard task 6)", () => {
  const design = read("DESIGN.md")
  const strip = design.slice(design.indexOf("\n- **`StatStrip`**"), design.indexOf("\n- **Detail pages**"))
  assert.ok(strip.includes("an optional faint foot of at most two lines"), "the plan 2D-5 wording stays")
  for (const phrase of [
    "A cell with `href` may carry `filterNote`, one short sentence that names the filter its number uses",
    "while the cell is hovered or its link has keyboard focus (`:focus-visible`)",
    "the link names it with `aria-describedby`, never through `title` alone",
    "`useId` is the strip's only hook",
    "A cell may carry `meter`, a bar drawn full width under its value inside the value `dd`",
  ]) assert.ok(strip.includes(phrase), phrase)
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  assert.match(index, /\n\| Counts above a list, a report or a work queue \| `StatStrip` [^\n]*a foot wraps to two lines at most[^\n]*; `filterNote` names the filter a number uses [^\n]*; `meter` draws a bar full width under the value /)
  const json = JSON.parse(read(".impeccable/design.json")) as { components: Array<{ name: string; description: string }> }
  const description = json.components.find((entry) => entry.name === "Stat Strip")?.description ?? ""
  assert.match(description, /foot of at most two lines/)
  assert.match(description, /A linked cell may carry a filter note: one short sentence naming the filter its number uses/)
  assert.match(description, /A cell may carry a meter, a bar full width under its value/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/stat-strip-note-meter.test.ts`
Expected: FAIL. `filterNote?: string` and `meter?: React.ReactNode` are not in the source, and the docs name neither.

- [ ] **Step 3: Implement the note and the meter**

- **`src/components/ui/stat-strip.tsx`:**
  - :1 becomes `import * as React from "react"` (the namespace import `field.tsx` uses). `useId` is the only hook, so the strip stays server-safe as `Field` does; the existing `React.ReactNode` type keeps working.
  - In `StatStripItem`, after `attention?: boolean` (:24), add the comment `// The filter the number uses, in one short sentence ("สถานะ = ใช้งานอยู่ · ไม่รวมตัดจำหน่าย"). Needs href: a panel under the cell on hover and keyboard focus, which the link names with aria-describedby.` and the field `filterNote?: string`; then the comment `// A bar full width under the value (PaceBar for a round's progress), server-safe and phrasing content. It holds no link or word: the value and the foot say what it shows, and the cell's link covers it.` and the field `meter?: React.ReactNode`.
  - The value `dd` (:52) becomes `<dd className="flex min-w-0 flex-wrap items-baseline gap-1">`, and after the unit (:54), as its last child: `{item.meter ? <span className="pointer-events-none basis-full pt-1">{item.meter}</span> : null}` (a line of its own, 8px under the number; `pointer-events-none` so a click on the bar reaches the stretched link, which the bar's `relative` root would otherwise sit above). In one row from `lg` the subgrid gives every cell the taller value row, so the labels, values and feet stay in line.
  - After `statCurrentClasses` (:31), add `statNoteClasses` with exactly the string the test pins, under this comment: `// The filter note in the tooltip look (tooltip.tsx), hidden until the cell is hovered or the dt's own link (not a link in the foot) has keyboard focus. The frame clips its cells, so the panel is fixed and placed under its cell by CSS anchor positioning (the cell's anchor-name); a browser without it shows the note at the cell's top-left corner. visibility, not display, so aria-describedby still reads it.`
  - In `StatStrip`: `const noteIdBase = React.useId()` before `return`. The map becomes `items.map((item, index) => { … return (…) })` with `const noteId = item.href && item.filterNote ? \`${noteIdBase}-note-${index}\` : undefined` first.
  - The cell `<div>` gains `style={noteId ? { anchorName: \`--${noteId}\` } : undefined}` after its unchanged `className`.
  - The `Link` gains `aria-describedby={noteId}` between `scroll={item.scroll}` and `aria-current=…`.
  - After the foot block, as the cell's last child:

    ```tsx
              {noteId ? (
                <dd id={noteId} className={statNoteClasses} style={{ positionAnchor: `--${noteId}` }}>
                  {item.filterNote}
                </dd>
              ) : null}
    ```

  - Nothing else changes: the dl, `statClasses`, `statLinkClasses`, `statCurrentClasses`, the dt, the value and unit spans and the foot keep the strings `tests/list-primitives-ui.test.ts:252-268` and `tests/phase2d-final-ui.test.ts:36-44` pin.
- **`DESIGN.md:476`:** after "a cell that needs action has a warning foot line with its icon (guards LS1, LS2)." insert:

  > A cell with `href` may carry `filterNote`, one short sentence that names the filter its number uses ("สถานะ = ใช้งานอยู่ · ไม่รวมตัดจำหน่าย"; group 1 dashboard, spec 2026-10-25 §6.5): a small panel in the tooltip look shows it under the cell while the cell is hovered or its link has keyboard focus (`:focus-visible`), through CSS alone, and the link names it with `aria-describedby`, never through `title` alone. The frame clips its cells, so the panel is `fixed` and placed under its cell with CSS anchor positioning (`anchor-name` on the cell, `top: anchor(bottom)`); `useId` is the strip's only hook, so the strip stays server-safe. A cell may carry `meter`, a bar drawn full width under its value inside the value `dd` (a line of its own; the dashboard's round KPI): it holds no link, number or word of its own, the value and the foot say what it shows, and the cell's link still covers it (`pointer-events-none`).

- **`docs/14_UI_UX_DESIGN_SYSTEM.md:82`:** before the row's closing ` |`, append `; \`filterNote\` names the filter a number uses (a panel under the cell on hover and keyboard focus, which the link names with \`aria-describedby\`); \`meter\` draws a bar full width under the value (the dashboard's round progress), and the value and the foot still say what it shows`.
- **`.impeccable/design.json:485`:** append to the Stat Strip `description`: ` A linked cell may carry a filter note: one short sentence naming the filter its number uses, shown in a small panel in the tooltip look under the cell on hover and on keyboard focus of its link, which names it with aria-describedby (never a title alone). A cell may carry a meter, a bar full width under its value that holds no link or word of its own.`
- No caller sets `filterNote` or `meter` yet; the first visual check is the controller's look step after Task 11's E2E (R32).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/stat-strip-note-meter.test.ts tests/list-primitives-ui.test.ts tests/phase2d-final-ui.test.ts tests/page-loading-skeleton.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/ui-overlay-guards.test.ts tests/phase2d-docs.test.ts tests/dark-mode-docs.test.ts tests/v-track-final.test.ts && npx tsc --noEmit && npx eslint src/components/ui/stat-strip.tsx`
Expected: PASS. tsc is clean: `anchorName` and `positionAnchor` are in `React.CSSProperties` (csstype 3.2.3).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/stat-strip.tsx DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json tests/stat-strip-note-meter.test.ts
git commit -m "feat(ui): a StatStrip cell can say which filter its number uses and carry a bar under its value (group 1 dashboard task 6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Data bars (the DESIGN rule and two shared parts)

**Files:**
- Create: `src/lib/data-bars.ts`
- Create: `src/components/ui/distribution-bar.tsx`
- Create: `src/components/ui/pace-bar.tsx`
- Create: `tests/data-bars.test.ts`
- Modify: `src/components/ui/badge-variants.ts` (append `statusFillVariants` after :40; the head that `tests/dead-code-cleanup.test.ts:39` pins stays)
- Modify: `tests/design-tokens-contrast.test.ts` (an import in :4-12, two constants after :19, one test inside `contrastRules` after :135; lines on `feat/group1-login`)
- Modify: `DESIGN.md` (lines on `feat/group1-login`): :290 (The Where Color Lives Rule), a new paragraph after :292, :298 (The Token Contrast Rule's test sentence), a new `### Data Bars` before :437, :469 (Corner Style), :668 (a Don't)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md`: :49 (the reminders paragraph), two rows after :69
- Modify: `.impeccable/design.json`: :527 (the Where Color Lives body), a new rule after the object at :525-529, :590 (the third Don't)
- Re-run unchanged: `tests/status-badge.test.ts`, `tests/dead-code-cleanup.test.ts:35-42`, `tests/modern-enterprise-theme.test.ts:59-72`, `tests/dark-mode-docs.test.ts` (its D1 reads only `### Dark Theme`; no hex token is written elsewhere, and no surface is called white), `tests/phase2d-docs.test.ts:56-85` (the Where Color Lives body keeps "no screen uses the info tokens"), `tests/v-track-final.test.ts:121-160` (rule sections stay colors, elevation, typography).
- No guard row moves, and no guard needs the two files in an owner list:
  - N1: `forced-colors:bg-[CanvasText]` is a system color, as on the badge markers, and the inline styles hold widths only.
  - R1 and R7: no `/NN`. R2: no shadow. N3: no `<button>`.
  - LS1, LK1 and LN2: neither `DistributionBar` nor `PaceBar` is on their lists.
  - ui-overlay (`tests/ui-overlay-guards.test.ts`): no status `-foreground` ink, no `fixed inset-0`, no `dark:`. It has no rule on `aria-hidden`, `tabIndex` or links, so the linked segments move nothing there.
  - axe (the E2E suite's `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa` tags, `e2e/support/measure-core.ts:165`): `aria-hidden` content must hold nothing focusable in the tab order (`aria-hidden-focus`). Each segment link has `tabIndex={-1}`, so it is clickable but never tabbable, and the rule passes. The hidden links are left out of `link-name`, and with no `role="img"` there is no interactive content inside an image (`nested-interactive`).

**Interfaces:**
- Produces (for Tasks 9 and 10):
  - `statusFillVariants(props?: { tone?: StatusTone | null }): string` in `src/components/ui/badge-variants.ts`, a cva. Task 9's status table draws each row's swatch with it, so a swatch equals its segment.
  - `DistributionBar({ segments }: { segments: { key: string; count: number; tone: StatusTone; href?: string; title?: string }[] })` in `src/components/ui/distribution-bar.tsx`: the stacked bar only. The whole bar is `aria-hidden="true"` with no `role` and no name (R17): the table beside it is its accessible form, with every number and the same links. A segment with `href` is `<a href={href} tabIndex={-1} title={title} data-status-segment={key}>`, a link for pointer users whose `title` gives the status, its count and the filter note on hover; keyboard and screen-reader users take the table's links. A segment without `href` stays a `span`. There is no `label` prop: a bar hidden from assistive technology has no name to carry.
  - `PaceBar({ value, pace, label, behind }: { value: number; pace: number | null; label: string; behind: boolean })` in `src/components/ui/pace-bar.tsx`: `value` and `pace` from 0 to 1, `pace` `null` draws no mark, `behind` gives the warning fill. Its root is a block `span` with `role="img"` and every part inside is a `span` (R18), so it is valid anywhere text goes: Task 9 passes it as the audit KPI's `StatStripItem.meter` (Task 6), Task 10 in the branch rows.
  - `barPercent(value: number): number` in `src/lib/data-bars.ts` (pure, no imports).
- Consumes: `type StatusTone` (`src/lib/status-tone.ts:1`), `cn` (`src/lib/utils.ts`).

- [ ] **Step 1: Write the failing tests**

`tests/data-bars.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { statusFillVariants } from "../src/components/ui/badge-variants.ts"
import { barPercent } from "../src/lib/data-bars.ts"

// Group 1 dashboard task 7 (spec 2026-10-25 §6.6, §6.7): The Data Bars Rule and its two shared parts. A status color
// fills an area only in DistributionBar and PaceBar: each segment in its status's badge tone, 2px apart, 3:1 on the
// panel in both themes (tests/design-tokens-contrast.test.ts). The distribution bar is hidden from screen readers beside
// the table that says the same (its segments may link for a pointer); the pace bar is role="img" with the caller's
// sentence. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const TONES = ["success", "info", "primary", "neutral", "muted", "warning", "danger"] as const

// What both parts keep: server-safe, fills only through statusFillVariants, no fade, shadow or pill corners.
function assertDataBarRules(path: string, source: string) {
  for (const pattern of [/"use client"/, /\buse(?:State|Effect|Context)\b/, /opacity-/, /\bshadow-(?:sm|md|lg|xl|2xl)\b/, /rounded-full|rounded-\[/, /\bdark:/]) {
    assert.doesNotMatch(source, pattern, path)
  }
  assert.doesNotMatch(source, /(?<![\w:-])bg-(?:success|warning|danger|info|primary|neutral-ink)\b/, `${path}: fills come only from statusFillVariants`)
}

test("a status tone fills an area with its badge marker's color: info solid, neutral and muted neutral-ink (The Data Bars Rule)", () => {
  const fills = Object.fromEntries(TONES.map((tone) => [tone, statusFillVariants({ tone }).split(" ").filter((name) => name.startsWith("bg-"))]))
  assert.deepEqual(fills, {
    success: ["bg-success"],
    info: ["bg-info"],
    primary: ["bg-primary"],
    neutral: ["bg-neutral-ink"],
    muted: ["bg-neutral-ink"],
    warning: ["bg-warning"],
    danger: ["bg-danger"],
  })
  for (const tone of TONES) {
    const classes = statusFillVariants({ tone }).split(" ")
    assert.ok(classes.includes("forced-color-adjust-none") && classes.includes("forced-colors:bg-[CanvasText]"), `${tone}: the text color in a Windows contrast theme`)
  }
  assert.equal(statusFillVariants(), statusFillVariants({ tone: "muted" }))
})

test("barPercent turns a 0..1 share into a width: clamped, two decimals, 0 for anything that is not a finite number", () => {
  assert.equal(barPercent(0.68), 68)
  assert.equal(barPercent(1 / 3), 33.33)
  assert.equal(barPercent(0), 0)
  assert.equal(barPercent(1), 100)
  assert.equal(barPercent(1.4), 100)
  assert.equal(barPercent(-0.2), 0)
  assert.equal(barPercent(Number.NaN), 0)
  assert.equal(barPercent(Number.POSITIVE_INFINITY), 0)
})

test("DistributionBar: one bar hidden from screen readers, of the parts above zero, sized by count, 2px apart, in their tone; a part with a list is a pointer-only link (spec §2, §6.6; R17)", () => {
  const path = "src/components/ui/distribution-bar.tsx"
  const source = read(path)
  assert.match(source, /export function DistributionBar\(\{ segments \}: \{ segments: \{ key: string; count: number; tone: StatusTone; href\?: string; title\?: string \}\[\] \}\)/)
  assert.match(source, /import type \{ StatusTone \} from "@\/lib\/status-tone"/)
  assert.match(source, /const shown = segments\.filter\(\(segment\) => segment\.count > 0\)/)
  assert.match(source, /if \(shown\.length === 0\) return null/)
  assert.match(source, /<div aria-hidden="true" data-slot="distribution-bar" className="flex h-3 w-full gap-0\.5">/)
  assert.doesNotMatch(source, /\brole=|aria-label|aria-describedby/, "no role and no name: the table beside the bar is its accessible form")
  assert.equal(source.match(/const distributionSegmentClasses = "([^"]+)"/)?.[1], "h-full min-w-1 basis-0 rounded-xs")
  // A segment with a list: a link for a pointer, out of the tab order (aria-hidden-focus), its title the status, count and note.
  assert.match(source, /<a key=\{segment\.key\} href=\{segment\.href\} tabIndex=\{-1\} title=\{segment\.title\} data-status-segment=\{segment\.key\} className=\{cn\(distributionSegmentClasses, statusFillVariants\(\{ tone: segment\.tone \}\)\)\} style=\{\{ flexGrow: segment\.count \}\} \/>/)
  assert.match(source, /<span key=\{segment\.key\} className=\{cn\(distributionSegmentClasses, statusFillVariants\(\{ tone: segment\.tone \}\)\)\} style=\{\{ flexGrow: segment\.count \}\} \/>/)
  assert.equal(source.match(/\btabIndex=/g)?.length, 1, "the one link, never tabbable")
  assert.equal(source.match(/\btitle=/g)?.length, 1, "only a linked segment carries a title")
  assertDataBarRules(path, source)
})

test("PaceBar: a role=img bar from 0 to 1, primary or warning when behind, with an optional pace mark in a 2px panel gap (spec §6.7)", () => {
  const path = "src/components/ui/pace-bar.tsx"
  const source = read(path)
  assert.match(source, /export function PaceBar\(\{ value, pace, label, behind \}: \{ value: number; pace: number \| null; label: string; behind: boolean \}\)/)
  assert.match(source, /<span role="img" aria-label=\{label\} data-slot="pace-bar" className=\{paceTrackClasses\}>/)
  assert.equal(source.match(/const paceTrackClasses = "([^"]+)"/)?.[1], "relative block h-2 w-full rounded-xs bg-muted forced-colors:border forced-colors:border-[CanvasText]")
  assert.match(source, /<span className=\{cn\("block h-full rounded-xs", statusFillVariants\(\{ tone: behind \? "warning" : "primary" \}\)\)\} style=\{\{ width: `\$\{barPercent\(value\)\}%` \}\} \/>/)
  assert.doesNotMatch(source, /<div\b/, "spans only (R18): valid in a StatStrip meter, a dd or a link's text")
  assert.doesNotMatch(source, /\btitle=|<a\b/, "the sentence is its label; the words beside it say the rest")
  assert.match(source, /\{pace === null \? null : <span className=\{paceMarkClasses\} style=\{\{ left: `\$\{barPercent\(pace\)\}%` \}\} \/>\}/)
  assert.equal(source.match(/const paceMarkClasses = "([^"]+)"/)?.[1], "absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-foreground ring-2 ring-surface forced-color-adjust-none forced-colors:bg-[CanvasText]")
  assertDataBarRules(path, source)
})

test("DESIGN.md, docs/14 and design.json state The Data Bars Rule and the two parts (group 1 dashboard task 7)", () => {
  const design = read("DESIGN.md")
  const colorRule = design.indexOf("\n**The Where Color Lives Rule.** ")
  const barsRule = design.indexOf("\n**The Data Bars Rule.** A distribution bar (`DistributionBar`) and a progress bar (`PaceBar`) are the only places outside the list above where a status color fills an area")
  assert.ok(colorRule !== -1 && barsRule > colorRule && barsRule < design.indexOf("\n**The Status With Evidence Rule.** "), "§2: the rule follows The Where Color Lives Rule")
  assert.ok(design.slice(colorRule, barsRule).includes("and as the segments of a data bar (The Data Bars Rule)."), "The Where Color Lives Rule names the data bars")
  const rule = design.slice(barsRule, design.indexOf("\n\n", barsRule + 1))
  for (const phrase of ["`statusFillVariants`", "2px apart", "3:1", "`tests/design-tokens-contrast.test.ts`", "never the only carrier of its meaning", "`aria-hidden=\"true\"`", "always paired with a table", "`role=\"img\"`", "`AuditProgressBar`"]) {
    assert.ok(rule.includes(phrase), phrase)
  }
  assert.ok(design.includes("the ring, input, menu and data bar pairs"), "The Token Contrast Rule names the data bar pairs")
  const parts = design.indexOf("\n### Data Bars\n")
  assert.ok(parts > design.indexOf("\n### Status Badges\n") && parts < design.indexOf("\n### Dialogs, Menus and Confirmation\n"), "§5 Data Bars follows Status Badges")
  const section = design.slice(parts, design.indexOf("\n### Dialogs, Menus and Confirmation\n"))
  for (const phrase of ["**`DistributionBar`** (`src/components/ui/distribution-bar.tsx`, server-safe)", "holds no word of its own", "its segments may link to their lists for pointer users", "the table carries the same links for everyone", "**`PaceBar`** (`src/components/ui/pace-bar.tsx`, server-safe)", "\"ควรถึงวันนี้\"", "\"ช้ากว่าที่ควร\"", "in a `StatStrip` cell it is the `meter`"]) {
    assert.ok(section.includes(phrase), phrase)
  }
  assert.ok(design.includes("`rounded-xs` is 2px, only for the data bars and their segments"), "Corner Style")
  assert.match(design, /\n- \*\*Don't\*\* bring back the old slate sidebar [^\n]*no green, orange or red outside status badges, the bell's count, the menu's work dot and the data bars\.\n/)
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const status = index.indexOf("\n| A status | `StatusBadge` |")
  const distribution = index.indexOf("\n| A share of a whole by status (a stacked bar) | `DistributionBar` |")
  const pace = index.indexOf("\n| Progress toward a total, with the pace it should have | `PaceBar` |")
  assert.ok(status !== -1 && distribution > status && pace > distribution, "docs/14: the two rows follow the status row")
  assert.ok(index.slice(pace, index.indexOf("\n", pace + 1)).includes("a `StatStrip` cell takes it as `meter`"), "docs/14: the PaceBar row names the meter")
  assert.ok(index.slice(distribution, pace).includes("its segments may link to their lists for pointer users"), "docs/14: the DistributionBar row names the pointer-only links")
  assert.ok(index.includes("A status color fills an area only in a data bar (The Data Bars Rule"), "docs/14: the reminders")
  type Design = { narrative: { rules: Array<{ name: string; body: string; section: string }>; donts: string[] } }
  const json = JSON.parse(read(".impeccable/design.json")) as Design
  const names = json.narrative.rules.map((entry) => entry.name)
  assert.equal(names.indexOf("The Data Bars Rule"), names.indexOf("The Where Color Lives Rule") + 1)
  const bars = json.narrative.rules.find((entry) => entry.name === "The Data Bars Rule")
  assert.equal(bars?.section, "colors")
  assert.match(bars?.body ?? "", /^A distribution bar \(DistributionBar\) and a progress bar \(PaceBar\) are the only places /)
  assert.ok((bars?.body ?? "").includes("A distribution bar holds no word of its own and is hidden from assistive technology (aria-hidden), always paired with a table"), "design.json: the distribution bar is decorative to assistive technology")
  const where = json.narrative.rules.find((entry) => entry.name === "The Where Color Lives Rule")?.body ?? ""
  assert.ok(where.includes("and as the segments of a data bar (The Data Bars Rule);"))
  assert.ok(where.includes("(the info status ring, the info Notice icon and a data bar's info segment) no screen uses the info tokens"))
  assert.ok(json.narrative.donts.some((entry) => entry.endsWith("no green, orange or red outside status badges, the bell's count, the menu's work dot and the data bars.")))
})
```

`tests/design-tokens-contrast.test.ts`:
- After the `color-contrast.ts` import block (:4-12), add `import { statusFillVariants } from "../src/components/ui/badge-variants.ts"`.
- After `const NON_TEXT = 3` (:19), add:

  ```ts
  // The Data Bars Rule (group 1 dashboard task 7): the fills of the data bars, read from statusFillVariants, so a new tone fill cannot skip the check.
  const DATA_BAR_TONES = ["success", "info", "primary", "neutral", "muted", "warning", "danger"] as const
  const DATA_BAR_FILLS = [...new Set(DATA_BAR_TONES.map((tone) => statusFillVariants({ tone }).match(/(?:^| )bg-([a-z-]+)(?= |$)/)?.[1] ?? `none for ${tone}`))]
  ```

- Inside `contrastRules`, after the chrome test (:132-135):

  ```ts
    test(`${prefix}data bar fills reach 3:1 on the panel, the page background, the muted track and a hovered row; the pace mark on the panel (The Data Bars Rule)`, () => {
      assert.deepEqual([...DATA_BAR_FILLS].sort(), ["danger", "info", "neutral-ink", "primary", "success", "warning"])
      for (const fill of DATA_BAR_FILLS) {
        for (const surface of ["card", "background", "muted", "row-hover"]) assertContrast(fill, surface, NON_TEXT, `${fill} on ${surface}`)
      }
      for (const surface of ["card", "background"]) assertContrast("foreground", surface, NON_TEXT, `the pace mark (foreground) on ${surface}`)
    })
  ```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/data-bars.test.ts tests/design-tokens-contrast.test.ts`
Expected: FAIL. Both files stop at the import: `badge-variants.ts` does not provide an export named `statusFillVariants`, and `src/lib/data-bars.ts` does not exist.

- [ ] **Step 3: Implement the rule and the parts**

- **`src/lib/data-bars.ts`:** `export function barPercent(value: number): number`. A 0..1 share becomes a CSS width in percent: clamped to 0..100, rounded to two decimals, and 0 for anything that is not a finite number. No imports.
- **`src/components/ui/badge-variants.ts`:** append after :40:

  ```ts
  // The Data Bars Rule (DESIGN.md §2): a status tone as an area, the segment of a DistributionBar or the fill of a PaceBar.
  // The marker's color of the same tone; the info ring becomes a solid info fill. Windows contrast themes draw it in the
  // text color, and the 2px gaps between segments still part them.
  export const statusFillVariants = cva("forced-color-adjust-none forced-colors:bg-[CanvasText]", {
    variants: {
      tone: {
        success: "bg-success",
        info: "bg-info",
        primary: "bg-primary",
        neutral: "bg-neutral-ink",
        muted: "bg-neutral-ink",
        warning: "bg-warning",
        danger: "bg-danger",
      },
    },
    defaultVariants: { tone: "muted" },
  })
  ```

- **`src/components/ui/distribution-bar.tsx`** (no `"use client"`; imports `cn`, `statusFillVariants`, `type StatusTone` from `@/lib/status-tone`):
  - `const distributionSegmentClasses = "h-full min-w-1 basis-0 rounded-xs"`.
  - `const shown = segments.filter((segment) => segment.count > 0)` and `if (shown.length === 0) return null`.
  - The root is `<div aria-hidden="true" data-slot="distribution-bar" className="flex h-3 w-full gap-0.5">`: no `role`, no `aria-label` and no `label` prop (R17). The status table beside the bar is its accessible form, with every number and the same links.
  - Each shown segment grows by its count, is at least 4px wide, sits 2px from its neighbours and takes its tone's fill. `shown.map((segment) => segment.href ? <a …/> : <span …/>)`, each element on one line as the test pins it:
    - with `href`: `<a key={segment.key} href={segment.href} tabIndex={-1} title={segment.title} data-status-segment={segment.key} className={cn(distributionSegmentClasses, statusFillVariants({ tone: segment.tone }))} style={{ flexGrow: segment.count }} />`. A pointer user clicks it to open the status's list, and the browser shows its `title` (the status, its count and the filter note) on hover. `tabIndex={-1}` keeps it out of the tab order, so the `aria-hidden` bar holds nothing tabbable: axe's `aria-hidden-focus` passes, and `tests/ui-overlay-guards.test.ts` has no rule this touches (see **Files**). Keyboard and screen-reader users take the table's row links, which open the same lists;
    - without `href`: the `<span key={segment.key} …>` the test pins, as before.
  - A comment says that the bar holds no number or word of its own, that the page writes the table beside it with the same links, and that a linked segment is for a pointer only. The comment spells none of `role=`, `title=` or `tabIndex=`: the test counts those.
- **`src/components/ui/pace-bar.tsx`** (no `"use client"`; imports `cn`, `statusFillVariants`, `barPercent` from `@/lib/data-bars`):
  - Every element is a `span` (R18): the root is the pinned `<span role="img">`, `display: block` through `paceTrackClasses`, so the bar is valid inside a StatStrip `meter`, a `dd` or a row's text.
  - `paceTrackClasses` and `paceMarkClasses` are exactly the strings the test pins. The track is a block 8px of `muted` with 2px corners and a `CanvasText` border in forced colors.
  - The fill is the pinned block `<span>`: `primary`, or `warning` when `behind`, as wide as `barPercent(value)`.
  - The mark is the pinned `<span>` at `barPercent(pace)`: a 2px `foreground` line, 4px past the bar at each end, centred on its position, with a 2px `ring-surface` gap. It is drawn only when `pace !== null`.
  - Nothing animates. There is no `transition-[width]`.
- **`DESIGN.md`:**
  - :290: "as the bell's count (danger) and as the menu's work dot (`--sidebar-dot`, orange)." becomes "as the bell's count (danger), as the menu's work dot (`--sidebar-dot`, orange) and as the segments of a data bar (The Data Bars Rule)."
  - After :292 (the "Known exception" paragraph), a new paragraph:

    > **The Data Bars Rule.** A distribution bar (`DistributionBar`) and a progress bar (`PaceBar`) are the only places outside the list above where a status color fills an area (group 1 dashboard, spec `docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md` §6.6). Each segment takes the fill of its status's own badge tone through `statusFillVariants` (`src/components/ui/badge-variants.ts`): the marker's color, with info as a solid fill and neutral and muted as `neutral-ink`; never a database color, a soft fill or a `/NN` tint. Segments are 2px apart, so the panel shows between them, and have 2px corners. Every fill reaches 3:1 against the panel, the page background, the `muted` track and a hovered row in both themes (`tests/design-tokens-contrast.test.ts` reads the fills from `statusFillVariants`). A bar is never the only carrier of its meaning: the table or the words beside it say the same thing. The distribution bar is decorative to assistive technology (`aria-hidden="true"`) and always paired with a table, which carries every number and the same links; the pace bar is `role="img"` named by the sentence beside it. In a Windows contrast theme every fill takes the text color, and the gaps still part the segments. The two parts are in §5 Data Bars. `AuditProgressBar` and the audit scan header's bar are older progress bars; they keep their own markup until their page group moves them onto `PaceBar`.

  - :298: "and the ring, input and menu pairs (the open row's icon, `--sidebar-ring`, the open row's bar and `--sidebar-dot` on the navy) at 3:1;" becomes "and the ring, input, menu and data bar pairs (the open row's icon, `--sidebar-ring`, the open row's bar and `--sidebar-dot` on the navy; every data bar fill, The Data Bars Rule) at 3:1;".
  - Before :437 (`### Dialogs, Menus and Confirmation`), a new section:

    > ### Data Bars
    >
    > Two server-safe parts draw a count as a bar, under The Data Bars Rule (§2). Neither holds a number of its own: the page writes the table or the line beside the bar. A `PaceBar` is `role="img"`, named by the sentence the page passes as `label`. A `DistributionBar` holds no word of its own and is hidden from assistive technology (`aria-hidden="true"`); its segments may link to their lists for pointer users, and the table carries the same links for everyone.
    >
    > - **`DistributionBar`** (`src/components/ui/distribution-bar.tsx`, server-safe): the parts of one whole in one 12px row, such as the dashboard's assets by status. One segment per part with a count above zero (no part above zero: no bar), as wide as its count (`flex-grow`, at least 4px so a part of one still shows), 2px apart, in its status's tone (`getAssetStateTone` for an asset state). The table beside it holds each part's swatch (`statusFillVariants`, the same fill), its name as a link to the part's list, the count and the share. A segment given `href` is a link to that same list for a pointer, with `tabIndex={-1}` (nothing in the hidden bar is in the tab order) and a `title` naming the part, its count and the filter; keyboard and screen-reader users take the table's links.
    > - **`PaceBar`** (`src/components/ui/pace-bar.tsx`, server-safe): progress from 0 to 1 on an 8px `muted` track; the fill is `primary`, or `warning` when the caller marks it `behind`. An optional pace mark is a 2px ink line, 4px taller than the bar at each end, with a 2px panel gap around it (`ring-2 ring-surface`); its legend beside the bars reads "ควรถึงวันนี้". A bar behind its pace takes the warning fill, and the words beside it say "ช้ากว่าที่ควร" with the warning icon: the fill never says it alone. Its root is a block `span` and so is everything inside, so it fits wherever text goes; in a `StatStrip` cell it is the `meter` (the dashboard's round KPI), a data bar inside the cell and not a fill of the cell, with the value and the foot saying the same.

  - :469: between "`rounded-sm` stays 4px (checkbox boxes, `Kbd`)." and "Never write `rounded-[6px]` (guard).", insert "`rounded-xs` is 2px, only for the data bars and their segments (§5 Data Bars)."
  - :668: "no green, orange or red outside status badges, the bell's count and the menu's work dot." becomes "no green, orange or red outside status badges, the bell's count, the menu's work dot and the data bars."
- **`docs/14_UI_UX_DESIGN_SYSTEM.md`:**
  - :49: after "Use semantic statuses with readable text plus icons, shapes, or clear workflow context where useful.", insert " A status color fills an area only in a data bar (The Data Bars Rule in [`DESIGN.md` §2](../DESIGN.md#2-colors))."
  - After :69 (the `A status` row), two rows:

    ```
    | A share of a whole by status (a stacked bar) | `DistributionBar` | hidden from assistive technology (`aria-hidden`) and holds no word of its own; one segment per part above zero, in its status tone (`getAssetStateTone` for an asset state); its segments may link to their lists for pointer users (`href`, a `title` with the filter, `tabIndex={-1}`); the table beside it carries the counts, the shares and the same links for everyone, with a `statusFillVariants` swatch per row |
    | Progress toward a total, with the pace it should have | `PaceBar` | `value` and `pace` from 0 to 1 (`pace` `null` draws no mark); `behind` gives the warning fill, and the words beside it say so too; `label` is the sentence; a block `span`, so a `StatStrip` cell takes it as `meter` |
    ```

- **`.impeccable/design.json`** (two-space JSON, edited in place):
  - :527, in the Where Color Lives `body`: "as the bell's count (red) and as the menu's work dot (orange);" becomes "as the bell's count (red), as the menu's work dot (orange) and as the segments of a data bar (The Data Bars Rule);". "(the info status ring and the info Notice icon)" becomes "(the info status ring, the info Notice icon and a data bar's info segment)".
  - After that rule's object (:525-529), insert:

    ```json
          {
            "name": "The Data Bars Rule",
            "body": "A distribution bar (DistributionBar) and a progress bar (PaceBar) are the only places outside The Where Color Lives Rule's list where a status color fills an area. Each segment takes the fill of its status's own badge tone through statusFillVariants (the marker's color; info as a solid fill, neutral and muted as neutral-ink), never a database color, a soft fill or a /NN tint. Segments are 2px apart with 2px corners. Every fill reaches 3:1 against the panel, the page background, the muted track and a hovered row in both themes. A bar never carries its meaning alone: the table or the words beside it say the same. A distribution bar holds no word of its own and is hidden from assistive technology (aria-hidden), always paired with a table that carries every number; its segments may link to their lists for pointer users (out of the tab order, the filter as a title), and the table carries the same links for everyone. A PaceBar is role=img named by the sentence beside it. A PaceBar's pace mark is a 2px ink line with a 2px panel gap; a bar behind its pace takes the warning fill and the words \"ช้ากว่าที่ควร\".",
            "section": "colors"
          },
    ```

  - :590: the third Don't ends "no green, orange or red outside status badges, the bell's count, the menu's work dot and the data bars." Its start, which `tests/dark-mode-docs.test.ts:96` pins, stays.
- Neither part has a caller until Tasks 9 and 10. The first visual check is the controller's look step after Task 11's E2E (R32): both themes, 1440 and 390.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/data-bars.test.ts tests/design-tokens-contrast.test.ts tests/status-badge.test.ts tests/dead-code-cleanup.test.ts tests/modern-enterprise-theme.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/ui-overlay-guards.test.ts tests/dark-mode-docs.test.ts tests/phase2d-docs.test.ts tests/v-track-final.test.ts && npx tsc --noEmit && npx eslint src/lib/data-bars.ts src/components/ui/badge-variants.ts src/components/ui/distribution-bar.tsx src/components/ui/pace-bar.tsx`
Expected: PASS, with no token change. The lowest data-bar pair is success on `muted`, 4.63:1 in light; in dark it is primary on `muted`, 5.50:1.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-bars.ts src/components/ui/badge-variants.ts src/components/ui/distribution-bar.tsx src/components/ui/pace-bar.tsx DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json tests/data-bars.test.ts tests/design-tokens-contrast.test.ts
git commit -m "feat(ui): the Data Bars rule, with DistributionBar and PaceBar (group 1 dashboard task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

---

### Task 8: The dashboard's overview data, the recent asset events and the movement labels

**Files:**
- Create: `src/lib/dashboard-overview-rules.ts` (pure; tests import it, so only relative `.ts` imports)
- Create: `src/lib/dashboard-overview.ts` (server, prisma)
- Create: `src/lib/asset-movement-labels.ts` (pure; the asset-detail plan reuses it)
- Create: `src/lib/dashboard-recent.ts` (server, prisma)
- Modify: `src/lib/asset-cross-scope.ts:174` (one new count function after `buildDashboardAssetCrossScopeSummary` (:114-174); nothing else in the file changes)
- Modify: `messages/th.json`, `messages/en.json` (the `asset.movementTypes` block, only through `node scripts/messages-edit.mjs`)
- Test (all new):
  - `tests/dashboard-overview-rules.test.ts`
  - `tests/asset-movement-labels.test.ts`
  - `tests/dashboard-overview.test.ts` (source pins on the two server files, the SQL count and the rules file's imports)

The dashboard page does not change in this task. Task 9 switches the page to these functions.

No existing pin breaks. Checked by grep:
- No file in `tests/` or `e2e/` reads `asset.movementTypes.maintenance_create` or the text "เปิดใบซ่อม". `tests/e2e-fixes.test.ts:183-195` pins only the three cancel labels, and they stay.
- `tests/disposal-detail-workspace.test.ts:67` and `tests/dashboard-cross-scope.test.ts:8-44` read pages this task does not touch.
- `tests/list-frame-guards.test.ts:174`: the LV2 row of `src/lib/asset-cross-scope.ts` stays at `count: 5`, because the new function writes no `"-"`. The three new lib files write none either.

**Interfaces:**
- Consumes:
  - From Task 1 (`src/lib/waiting-work-rules.ts`, client-safe: relative `.ts` imports, a type-only Prisma import): `startOfBangkokDay(now: Date): Date` and `bangkokDayDiff(from: Date, to: Date): number` (whole Bangkok days from `from` to `to`, negative when `to` is earlier).
  - From Task 3:
    - `parseAssetListParams` reads `custodianState` (the value `"assigned"`), and `buildAssetWhere(filters, options?)` applies it through `assetCustodianAssignedWhere` (`custodianId` not null and `assetNotClosedStatusWhere`). The `options` (today and rules) are optional and only the windowed data-quality values read them, so Task 8 never passes them.
    - `assetNotClosedStatusWhere: Prisma.AssetWhereInput` (`src/lib/asset-custodian-state-filter.ts`: the status `name` not in `CLOSED_AUDIT_STATUS_NAMES`), the share's denominator.
  - From Task 5: `auditRoundBranchFilterName(branch: { name: string; companyCode: string }, companyChosen: boolean): string` (`src/lib/audit-round-result-filters.ts`, pure, relative `.ts` imports).
  - Existing:
    - `parseAssetListParams` (`src/lib/asset-list-query.ts:30`) and `buildAssetWhere` (`:66`).
    - `buildExactAssetRegisterHref` (`src/lib/asset-register-view-memory.ts:28`).
    - `auditRoundOperationalWhere` and `isAuditRoundOperationalStatus` (`src/lib/audit-round-status.ts:4,11`).
    - `type SessionUser` (`src/lib/auth-utils.ts:4-11`), as a type-only import.
- Produces (for Tasks 9 and 10, the E2E of Task 11 and the asset-detail plan):
  - In `src/lib/dashboard-overview-rules.ts`:
    - `type DashboardProfile = "work" | "overview"`.
    - `getDashboardProfile(user: Pick<SessionUser, "permissions" | "roles">, canAnyApproval: boolean): DashboardProfile`.
    - `type DashboardKpiKey = "waiting" | "audit" | "total" | "custodian"` and `DASHBOARD_KPI_ORDER: Record<DashboardProfile, readonly DashboardKpiKey[]>`.
    - `type DashboardSectionKey = "waiting" | "branches" | "status" | "recent"` and `DASHBOARD_SECTION_ORDER: Record<DashboardProfile, readonly DashboardSectionKey[]>`.
    - `type DashboardRegisterCount = "total" | "idle180" | "custodianAssigned" | "responsibilityMissing" | "crossScope" | { statusId: string }`.
    - `dashboardRegisterParams(count: DashboardRegisterCount, companyId: string | null): Record<string, string>`. This is the one place a dashboard number's filter is written. The server counts with `buildAssetWhere(parseAssetListParams(params))`, and Task 9 links with `buildExactAssetRegisterHref(locale, params)`.
    - `auditPace(start: Date, due: Date, today: Date): number`.
    - `auditPercent(processed: number, expected: number): number`.
    - `isBehindPace(processed: number, expected: number, pace: number | null): boolean`.
    - `pickCurrentAuditRound<T extends { status: string; auditNo: string; startDate: Date; endDate: Date }>(rounds: T[], today: Date, eligible?: (round: T) => boolean): { current: T | null; otherOpen: number }`. The constraint carries `auditNo` because the last tie-break is the round's code.
    - `sortBranchesByGap<T extends { name: string; processed: number; expected: number }>(branches: readonly T[]): T[]`.
    - `type DashboardAuditRoundRow = { id: string; auditNo: string; name: string; status: string; startDate: Date; endDate: Date }`.
    - `type DashboardAuditItemCount = { auditRoundId: string; expectedBranchId: string; auditStatus: string; count: number }`.
    - `buildDashboardAudit(input: { rounds: DashboardAuditRoundRow[]; itemCounts: DashboardAuditItemCount[]; branches: ReadonlyMap<string, { name: string; companyCode: string }>; today: Date; narrowedToCompany: boolean }): DashboardOverview["audit"]`.
    - `buildDashboardStatusRows(groups: { statusId: string; count: number }[], statuses: { id: string; name: string; nameTh: string; sortOrder: number }[]): DashboardOverview["statusRows"]`.
    - `formatAsOf(date: Date, locale: string): string`.
    - `type DashboardOverview = { total: number; idle180: number; custodianAssigned: number; custodianShare: number | null; responsibilityMissing: number; statusRows: { statusId: string; name: string; nameTh: string; count: number }[]; crossScopeTotal: number; audit: { round: { id: string; code: string; name: string; startDate: Date; endDate: Date } | null; otherOpen: number; processed: number; expected: number; pace: number | null; branches: { branchId: string; name: string; processed: number; expected: number; behind: boolean }[] } }`.
  - In `src/lib/dashboard-overview.ts`: `getDashboardOverview({ companyId, now }: { companyId: string | null; now: Date }): Promise<DashboardOverview>`. It also re-exports `type DashboardOverview`.
  - In `src/lib/asset-cross-scope.ts`: `countDashboardAssetCrossScope(companyId: string | null): Promise<number>`.
  - In `src/lib/asset-movement-labels.ts`:
    - `ASSET_MOVEMENT_LABELLED_TYPES`: 49 types. These are the 47 types `src` writes plus `maintenance_status_update` and `maintenance_pm_create`.
    - `ASSET_MOVEMENT_MIRROR_TYPES`: 10 types.
    - `assetMovementLabelKey(movementType: string): string`. It returns `"asset.movementTypes.<type>"`, or `"asset.movementTypes.other"` for a type it does not know.
    - `type AssetMovementDocumentKind = "checkout" | "checkin" | "transfer" | "repair" | "disposal" | "auditRound"`.
    - `type AssetMovementDocument = { kind: AssetMovementDocumentKind; id: string; code: string }`.
    - `type AssetMovementReferenceLookup = "checkout" | "checkin" | "transfer" | "repair" | "disposal" | "auditFinding" | "auditItem"`.
    - `assetMovementReferenceLookup(referenceType: string | null): AssetMovementReferenceLookup | null`.
    - `buildAssetMovementDocumentHref(locale: string, document: AssetMovementDocument): string`.
    - `ASSET_MOVEMENT_DOCUMENT_PERMISSION: Record<AssetMovementDocumentKind, { module: string; action: "view" }>`.
  - In `src/lib/dashboard-recent.ts`:
    - `type RecentAssetEvent = { id: string; movementType: string; performedAt: Date; asset: { id: string; assetTag: string; name: string }; document: AssetMovementDocument | null }`.
    - `getRecentAssetEvents(take: number): Promise<RecentAssetEvent[]>`.

- [ ] **Step 1: Write the failing tests**

`tests/dashboard-overview-rules.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"
import { buildExactAssetRegisterHref } from "../src/lib/asset-register-view-memory.ts"
import {
  auditPace,
  auditPercent,
  buildDashboardAudit,
  buildDashboardStatusRows,
  DASHBOARD_KPI_ORDER,
  DASHBOARD_SECTION_ORDER,
  dashboardRegisterParams,
  formatAsOf,
  getDashboardProfile,
  isBehindPace,
  pickCurrentAuditRound,
  sortBranchesByGap,
} from "../src/lib/dashboard-overview-rules.ts"

// How the round form stores a date: z.coerce.date("YYYY-MM-DD") is UTC midnight, the same calendar day in Bangkok.
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

test("the profile comes from permissions, never from role names (spec §6.1)", () => {
  const viewer = { roles: ["e2e_viewer_1"], permissions: ["asset:view", "audit:view", "maintenance:view", "disposal:view", "report:view"] }
  assert.equal(getDashboardProfile(viewer, false), "overview")
  assert.equal(getDashboardProfile(viewer, true), "work", "an approver works")
  assert.equal(getDashboardProfile({ roles: ["system_admin"], permissions: [] }, false), "work")
  for (const permission of ["asset:create", "asset:edit", "maintenance:create", "maintenance:edit", "audit:create", "audit:edit", "disposal:create", "disposal:edit"]) {
    assert.equal(getDashboardProfile({ roles: [], permissions: [permission] }, false), "work", permission)
  }
  for (const permission of ["asset:delete", "report:export", "dashboard:view", "setting:edit"]) {
    assert.equal(getDashboardProfile({ roles: [], permissions: [permission] }, false), "overview", permission)
  }
  assert.equal(getDashboardProfile({ roles: ["executive"], permissions: ["report:view"] }, false), "overview")
})

test("the same parts in a role-based order (spec §6.1)", () => {
  assert.deepEqual(DASHBOARD_KPI_ORDER, {
    work: ["waiting", "audit", "total", "custodian"],
    overview: ["total", "custodian", "audit", "waiting"],
  })
  assert.deepEqual(DASHBOARD_SECTION_ORDER, {
    work: ["waiting", "branches", "status", "recent"],
    overview: ["status", "branches", "waiting", "recent"],
  })
})

test("each overview number's list is the register parsed from the same filters (spec §6.5)", () => {
  assert.deepEqual(dashboardRegisterParams("total", null), {})
  assert.deepEqual(dashboardRegisterParams("idle180", null), { activity: "idle_180d" })
  assert.deepEqual(dashboardRegisterParams("custodianAssigned", "c1"), { companyId: "c1", custodianState: "assigned" })
  assert.deepEqual(dashboardRegisterParams("responsibilityMissing", null), { dataQuality: "responsibility" })
  assert.deepEqual(dashboardRegisterParams("crossScope", "c1"), { companyId: "c1", crossScope: "all" })
  assert.deepEqual(dashboardRegisterParams({ statusId: "s/1" }, null), { statusId: "s/1" })
  const counts = ["total", "idle180", "custodianAssigned", "responsibilityMissing", "crossScope", { statusId: "s/1" }] as const
  for (const count of counts) {
    for (const companyId of [null, "company 1"]) {
      const params = dashboardRegisterParams(count, companyId)
      const query = new URL(buildExactAssetRegisterHref("th", params), "http://localhost").searchParams
      assert.equal(query.get("exact"), "1")
      assert.deepEqual(parseAssetListParams(query), parseAssetListParams(params), JSON.stringify(params))
    }
  }
  // Every value is one the register knows: a typo would parse to "" and count every asset.
  assert.equal(parseAssetListParams(dashboardRegisterParams("idle180", null)).activity, "idle_180d")
  assert.equal(parseAssetListParams(dashboardRegisterParams("custodianAssigned", null)).custodianState, "assigned")
  assert.equal(parseAssetListParams(dashboardRegisterParams("responsibilityMissing", null)).dataQuality, "responsibility")
  assert.equal(parseAssetListParams(dashboardRegisterParams("crossScope", null)).crossScope, "all")
})

test("the pace runs from the round's start to its due date in Bangkok days (spec §6.7)", () => {
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-10-16T03:00:00Z")), 0.5)
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-10-01T03:00:00Z")), 0)
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-09-20T03:00:00Z")), 0)
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-10-31T16:59:00Z")), 1)
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-11-20T03:00:00Z")), 1)
  // 18:00Z on the 5th is already the 6th in Bangkok: 5 of 10 days, not 4.
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-11"), new Date("2026-10-05T18:00:00Z")), 0.5)
  // A one-day round is 1 from its start.
  assert.equal(auditPace(day("2026-10-25"), day("2026-10-25"), new Date("2026-10-25T01:00:00Z")), 1)
  assert.equal(auditPace(day("2026-10-25"), day("2026-10-25"), new Date("2026-10-24T10:00:00Z")), 0)
})

test("progress is a whole percent, as the round page shows it; behind means below the pace (spec §6.7)", () => {
  assert.equal(auditPercent(1177, 1731), 68)
  assert.equal(auditPercent(0, 0), 0)
  assert.equal(isBehindPace(41, 100, 0.75), true)
  assert.equal(isBehindPace(75, 100, 0.75), false)
  assert.equal(isBehindPace(746, 1000, 0.75), false, "75% on screen is not behind a 75% pace")
  assert.equal(isBehindPace(744, 1000, 0.75), true)
  assert.equal(isBehindPace(0, 10, null), false)
  assert.equal(isBehindPace(0, 0, 0.5), false)
})

test("the current round: in its dates with the nearest due date, else the one past due most recently (spec §6.4)", () => {
  const round = (auditNo: string, status: string, start: string, end: string) => ({ auditNo, status, startDate: day(start), endDate: day(end) })
  const today = new Date("2026-10-25T03:00:00Z")
  const a = round("A", "open", "2026-10-01", "2026-10-31")
  const b = round("B", "open", "2026-10-20", "2026-10-27")
  const future = round("C", "open", "2026-11-01", "2026-11-30")
  const draft = round("D", "draft", "2026-10-01", "2026-10-26")
  const late = round("E", "open", "2026-09-01", "2026-09-30")
  const later = round("F", "open", "2026-08-01", "2026-10-10")
  assert.deepEqual(pickCurrentAuditRound([a, b, future, draft, late, later], today), { current: b, otherOpen: 5 })
  assert.deepEqual(pickCurrentAuditRound([future, draft, late, later], today), { current: later, otherOpen: 3 })
  assert.deepEqual(pickCurrentAuditRound([future, draft], today), { current: null, otherOpen: 2 })
  assert.deepEqual(pickCurrentAuditRound([], today), { current: null, otherOpen: 0 })
  const closed = [round("X", "closed", "2026-10-01", "2026-10-31"), round("Y", "cancelled", "2026-10-01", "2026-10-31")]
  assert.deepEqual(pickCurrentAuditRound(closed, today), { current: null, otherOpen: 0 })
  // A round due today stays current until Bangkok midnight.
  const dueToday = round("G", "open", "2026-10-01", "2026-10-25")
  assert.equal(pickCurrentAuditRound([dueToday], new Date("2026-10-25T16:30:00Z")).current, dueToday)
  assert.equal(pickCurrentAuditRound([dueToday, a], new Date("2026-10-25T17:30:00Z")).current, a)
  // With a company chosen only an eligible round can be current; every operational round still counts as another one.
  assert.deepEqual(pickCurrentAuditRound([a, b, draft], today, (r) => r.auditNo === "A"), { current: a, otherOpen: 2 })
})

test("the current round's ties: the nearest due date, then the latest start, then the code, whatever the input order", () => {
  const round = (auditNo: string, start: string, end: string) => ({ auditNo, status: "open", startDate: day(start), endDate: day(end) })
  const today = new Date("2026-10-25T03:00:00Z")
  const b = round("AUD-2026-0002", "2026-10-20", "2026-10-27")
  const laterStart = round("AUD-2026-0009", "2026-10-22", "2026-10-27")
  const twin = round("AUD-2026-0001", "2026-10-20", "2026-10-27")
  assert.equal(pickCurrentAuditRound([b, laterStart], today).current, laterStart)
  assert.equal(pickCurrentAuditRound([laterStart, b], today).current, laterStart)
  assert.equal(pickCurrentAuditRound([b, twin], today).current, twin)
  assert.equal(pickCurrentAuditRound([twin, b], today).current, twin)
  // Past due: the most recent due date is the nearest one; then the same two tie-breaks.
  const late = round("AUD-2026-0003", "2026-09-01", "2026-09-30")
  const lateLaterStart = round("AUD-2026-0008", "2026-09-05", "2026-09-30")
  const lateTwin = round("AUD-2026-0004", "2026-09-05", "2026-09-30")
  assert.equal(pickCurrentAuditRound([late, lateLaterStart], today).current, lateLaterStart)
  assert.equal(pickCurrentAuditRound([lateLaterStart, lateTwin, late], today).current, lateTwin)
})

test("branches: the most behind first (spec §6.7)", () => {
  const rows = [
    { name: "สำนักงานใหญ่", processed: 640, expected: 780 },
    { name: "สาขา ก", processed: 41, expected: 100 },
    { name: "สาขา ข", processed: 247, expected: 281 },
    { name: "สาขาบางนา", processed: 290, expected: 410 },
    { name: "สาขา ค", processed: 1, expected: 2 },
    { name: "สาขา ง", processed: 2, expected: 4 },
  ]
  assert.deepEqual(sortBranchesByGap(rows).map((row) => row.name), ["สาขา ก", "สาขา ง", "สาขา ค", "สาขาบางนา", "สำนักงานใหญ่", "สาขา ข"])
  assert.equal(rows[0].name, "สำนักงานใหญ่", "the input is not reordered")
})

test("the round's progress, pace and branches from one count of items (spec §6.2, §6.4, §6.7)", () => {
  const rounds = [
    { id: "r1", auditNo: "AUD-2026-0001", name: "รอบหนึ่ง", status: "open", startDate: day("2026-10-01"), endDate: day("2026-10-31") },
    { id: "r2", auditNo: "AUD-2026-0002", name: "รอบสอง", status: "open", startDate: day("2026-10-20"), endDate: day("2026-10-27") },
    { id: "r3", auditNo: "AUD-2026-0003", name: "รอบสาม", status: "draft", startDate: day("2026-10-01"), endDate: day("2026-10-31") },
  ]
  const branches = new Map([
    ["b1", { name: "สำนักงานใหญ่", companyCode: "SNI" }],
    ["b2", { name: "สาขาบางนา", companyCode: "SNI" }],
  ])
  const today = new Date("2026-10-24T03:00:00Z")
  const allCompanies = buildDashboardAudit({
    rounds,
    itemCounts: [
      { auditRoundId: "r2", expectedBranchId: "b1", auditStatus: "pending", count: 3 },
      { auditRoundId: "r2", expectedBranchId: "b1", auditStatus: "scanned", count: 7 },
      { auditRoundId: "r2", expectedBranchId: "b2", auditStatus: "pending", count: 5 },
      { auditRoundId: "r2", expectedBranchId: "b2", auditStatus: "reviewed", count: 5 },
      { auditRoundId: "r1", expectedBranchId: "b1", auditStatus: "pending", count: 10 },
    ],
    branches,
    today,
    narrowedToCompany: false,
  })
  assert.deepEqual(allCompanies, {
    round: { id: "r2", code: "AUD-2026-0002", name: "รอบสอง", startDate: day("2026-10-20"), endDate: day("2026-10-27") },
    otherOpen: 2,
    processed: 12,
    expected: 20,
    pace: 4 / 7,
    branches: [
      { branchId: "b2", name: "SNI / สาขาบางนา", processed: 5, expected: 10, behind: true },
      { branchId: "b1", name: "SNI / สำนักงานใหญ่", processed: 7, expected: 10, behind: false },
    ],
  })
  // One company: only rounds holding its items can be current, and the branch names drop the company code.
  const oneCompany = buildDashboardAudit({
    rounds,
    itemCounts: [{ auditRoundId: "r1", expectedBranchId: "b1", auditStatus: "pending", count: 10 }],
    branches,
    today,
    narrowedToCompany: true,
  })
  assert.equal(oneCompany.round?.id, "r1")
  assert.equal(oneCompany.otherOpen, 2)
  assert.equal(oneCompany.pace, 23 / 30)
  assert.deepEqual(oneCompany.branches, [{ branchId: "b1", name: "สำนักงานใหญ่", processed: 0, expected: 10, behind: true }])
  assert.deepEqual(buildDashboardAudit({ rounds: [], itemCounts: [], branches, today, narrowedToCompany: false }), {
    round: null, otherOpen: 0, processed: 0, expected: 0, pace: null, branches: [],
  })
})

test("the status rows: every status with assets, in the status order, none merged (spec §6.6)", () => {
  const statuses = [
    { id: "s-disposed", name: "Disposed", nameTh: "ตัดจำหน่ายแล้ว", sortOrder: 9 },
    { id: "s-ready", name: "Ready", nameTh: "พร้อมใช้งาน", sortOrder: 1 },
    { id: "s-lost", name: "Lost", nameTh: "สูญหาย", sortOrder: 5 },
    { id: "s-use", name: "In Use", nameTh: "ใช้งานอยู่", sortOrder: 2 },
    { id: "s-maint", name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม", sortOrder: 4 },
    { id: "s-repair", name: "Pending Repair", nameTh: "รอซ่อม", sortOrder: 4 },
  ]
  const groups = [
    { statusId: "s-use", count: 1380 },
    { statusId: "s-disposed", count: 35 },
    { statusId: "s-ready", count: 127 },
    { statusId: "s-maint", count: 4 },
    { statusId: "s-repair", count: 6 },
  ]
  const rows = buildDashboardStatusRows(groups, statuses)
  assert.deepEqual(rows.map((row) => [row.name, row.count]), [["Ready", 127], ["In Use", 1380], ["Pending Repair", 6], ["Under Maintenance", 4], ["Disposed", 35]])
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 1552, "the rows add up to the total")
  assert.deepEqual(rows[0], { statusId: "s-ready", name: "Ready", nameTh: "พร้อมใช้งาน", count: 127 })
})

test("the as-of time is Bangkok's, with the Thai short month and the Buddhist year (spec §6.2)", () => {
  assert.equal(formatAsOf(new Date("2026-10-25T07:05:00Z"), "th"), "25 ต.ค. 2569 14:05")
  assert.equal(formatAsOf(new Date("2026-10-25T07:05:00Z"), "en"), "25 Oct 2026 14:05")
  assert.equal(formatAsOf(new Date("2026-12-31T17:30:00Z"), "th"), "1 ม.ค. 2570 00:30")
  assert.equal(formatAsOf(new Date("2026-12-31T17:30:00Z"), "en"), "1 Jan 2027 00:30")
})
```

`tests/asset-movement-labels.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  ASSET_MOVEMENT_DOCUMENT_PERMISSION,
  ASSET_MOVEMENT_LABELLED_TYPES,
  ASSET_MOVEMENT_MIRROR_TYPES,
  assetMovementLabelKey,
  assetMovementReferenceLookup,
  buildAssetMovementDocumentHref,
} from "../src/lib/asset-movement-labels.ts"

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(path.replaceAll("\\", "/"))
  }
  return out
}

const sources = walk("src").map((path) => ({ path, source: readFileSync(path, "utf8") }))
const movementTypes = (locale: "th" | "en") =>
  JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset.movementTypes as Record<string, string>

// Every file that writes AssetMovement rows. A new writer joins this list once its movement types have labels.
const WRITERS = [
  "src/app/api/assets/[id]/checkin/route.ts",
  "src/app/api/assets/[id]/checkout/route.ts",
  "src/app/api/assets/[id]/components/[componentId]/route.ts",
  "src/app/api/assets/[id]/components/route.ts",
  "src/app/api/assets/[id]/legacy-checkout/route.ts",
  "src/app/api/assets/[id]/route.ts",
  "src/app/api/assets/[id]/status-correction/route.ts",
  "src/app/api/assets/[id]/transfer/route.ts",
  "src/app/api/assets/batch/route.ts",
  "src/app/api/assets/bulk-move/route.ts",
  "src/app/api/assets/bulk-update/route.ts",
  "src/app/api/assets/import-confirm/route.ts",
  "src/app/api/assets/route.ts",
  "src/app/api/audit-findings/[id]/review/route.ts",
  "src/app/api/audit-rounds/[id]/scan/route.ts",
  "src/app/api/disposal-batches/route.ts",
  "src/app/api/disposal-requests/[id]/route.ts",
  "src/app/api/disposal-requests/route.ts",
  "src/lib/asset-component-sync.ts",
  "src/lib/asset-state-review-service.ts",
  "src/lib/asset-transaction-cancellation-prisma.ts",
  "src/lib/disposal-approval-service.ts",
  "src/lib/disposal-execution-service.ts",
  "src/lib/repair-record-service.ts",
]

// The types src can write: literals at a write or a component-sync call, the union types of the repair and cancel
// services, the audit corrections' map and its fallback, and the register edit's candidates.
function writtenMovementTypes(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  const add = (type: string, path: string) => found.set(type, [...(found.get(type) ?? []), path])
  for (const { path, source } of sources) {
    for (const match of source.matchAll(/movementType:\s*"([a-z_]+)"/g)) add(match[1], path)
    for (const match of source.matchAll(/movementType:\s*((?:"[a-z_]+"\s*\|\s*)+"[a-z_]+")/g)) {
      for (const type of match[1].match(/[a-z_]+/g) ?? []) add(type, path)
    }
    for (const match of source.matchAll(/movementTypeByFindingType\[[^\]]+\]\s*\?\?\s*"([a-z_]+)"/g)) add(match[1], path)
    const map = source.match(/const movementTypeByFindingType[^=]*=\s*\{([^}]*)\}/)
    for (const match of map?.[1].matchAll(/:\s*"([a-z_]+)"/g) ?? []) add(match[1], path)
    for (const match of source.matchAll(/\[\s*"([a-z_]+_change)",/g)) add(match[1], path)
    for (const match of source.matchAll(/buildNullableMovementCandidate\("([a-z_]+)"/g)) add(match[1], path)
  }
  return found
}

test("the AssetMovement writers are the known ones, so a new writer is labelled before it ships (spec §7.6)", () => {
  const writers = sources.filter(({ source }) => /assetMovement\.create(?:Many)?\(/.test(source)).map(({ path }) => path)
  assert.deepEqual(writers.sort(), [...WRITERS].sort())
})

test("every movement type src writes has a Thai and an English label (spec §4: no English type on screen)", () => {
  const written = writtenMovementTypes()
  assert.equal(written.size, 47, [...written.keys()].sort().join(", "))
  const th = movementTypes("th")
  const en = movementTypes("en")
  for (const [type, paths] of written) {
    assert.equal(assetMovementLabelKey(type), `asset.movementTypes.${type}`, `${type} (${paths.join(", ")}) has no label`)
    assert.ok(th[type] && en[type], `${type} has no message`)
  }
  assert.deepEqual(
    [...ASSET_MOVEMENT_LABELLED_TYPES].sort(),
    [...written.keys(), "maintenance_pm_create", "maintenance_status_update"].sort(),
    "the labels are the written types plus the two older ones",
  )
  assert.deepEqual(Object.keys(th).sort(), [...ASSET_MOVEMENT_LABELLED_TYPES, "other"].sort())
})

test("an unknown type reads as other activity, and the labels use the glossary's words (spec §5)", () => {
  assert.equal(assetMovementLabelKey("something_new"), "asset.movementTypes.other")
  assert.equal(assetMovementLabelKey(""), "asset.movementTypes.other")
  assert.equal(assetMovementLabelKey("maintenance_status_update"), "asset.movementTypes.maintenance_status_update")
  const th = movementTypes("th")
  assert.equal(th.other, "ความเคลื่อนไหวอื่น")
  assert.equal(th.maintenance_create, "บันทึกซ่อม")
  assert.equal(th.maintenance_close, "ซ่อมเสร็จ")
  assert.equal(th.disposal_request, "ขอตัดจำหน่าย")
  assert.equal(th.status_correction, "แก้ไขสถานะ")
  assert.equal(th.checkout, "ส่งมอบทรัพย์สิน")
  assert.equal(movementTypes("en").maintenance_create, "Repair recorded")
})

test("the mirror rows are a component's copy of its parent's event, left out of the dashboard feed (spec §6.8)", () => {
  assert.deepEqual([...ASSET_MOVEMENT_MIRROR_TYPES].sort(), [
    "installed_in_parent",
    "parent_audit_confirmation_sync",
    "parent_audit_finding_sync",
    "parent_bulk_move_sync",
    "parent_bulk_update_sync",
    "parent_checkin_sync",
    "parent_checkout_sync",
    "parent_register_update_sync",
    "parent_transfer_sync",
    "removed_from_parent",
  ])
  const written = writtenMovementTypes()
  for (const type of ASSET_MOVEMENT_MIRROR_TYPES) assert.ok(written.has(type), type)
})

test("a movement's document: the reference type picks the record, which links to its page under its permission (spec §6.8, §7.6)", () => {
  assert.equal(assetMovementReferenceLookup("checkout"), "checkout")
  assert.equal(assetMovementReferenceLookup("checkin"), "checkin")
  assert.equal(assetMovementReferenceLookup("transfer"), "transfer")
  assert.equal(assetMovementReferenceLookup("maintenance"), "repair")
  assert.equal(assetMovementReferenceLookup("disposal"), "disposal")
  assert.equal(assetMovementReferenceLookup("audit_finding"), "auditFinding")
  assert.equal(assetMovementReferenceLookup("audit_scan"), "auditItem")
  for (const none of ["asset", "asset_component", "asset_batch_create", "asset_import", "bulk_move", "bulk_update", "asset_state_review", "", null]) {
    assert.equal(assetMovementReferenceLookup(none), null, String(none))
  }
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "checkout", id: "c1", code: "HO-2026-0001" }), "/th/asset-management/checkouts/c1")
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "checkin", id: "c2", code: "RT-2026-0001" }), "/th/asset-management/checkins/c2")
  assert.equal(buildAssetMovementDocumentHref("en", { kind: "transfer", id: "t1", code: "TR-2026-0001" }), "/en/asset-management/transfers/t1")
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "repair", id: "m1", code: "MT-20261025-0001" }), "/th/maintenance/m1")
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "disposal", id: "d1", code: "DSP-2026-0009" }), "/th/disposal/d1")
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "auditRound", id: "r1", code: "AUD-2026-0003" }), "/th/audit/rounds/r1")
  assert.deepEqual(ASSET_MOVEMENT_DOCUMENT_PERMISSION, {
    checkout: { module: "asset", action: "view" },
    checkin: { module: "asset", action: "view" },
    transfer: { module: "asset", action: "view" },
    repair: { module: "maintenance", action: "view" },
    disposal: { module: "disposal", action: "view" },
    auditRound: { module: "audit", action: "view" },
  })
})
```

`tests/dashboard-overview.test.ts` (the server files read prisma, so these are source pins, as `tests/login-page.test.ts` does for `login-company-name.ts`):

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the overview counts with the register's own filters, in one round of reads, and never writes (spec §6.4-6.6)", () => {
  const source = read("src/lib/dashboard-overview.ts")
  assert.match(source, /export async function getDashboardOverview\(\{ companyId, now \}: \{ companyId: string \| null; now: Date \}\): Promise<DashboardOverview>/)
  for (const count of ["total", "idle180", "custodianAssigned", "responsibilityMissing"]) {
    assert.match(source, new RegExp(`buildAssetWhere\\(parseAssetListParams\\(dashboardRegisterParams\\("${count}", companyId\\)\\)\\)`), count)
  }
  assert.match(source, /prisma\.asset\.groupBy\(\{\s*by: \["statusId"\],\s*where: totalWhere,/)
  // The share's denominator is the very fragment custodianState=assigned uses (Task 3), with the same company.
  assert.match(source, /import \{ assetNotClosedStatusWhere \} from "@\/lib\/asset-custodian-state-filter"/)
  assert.match(source, /\{ AND: \[totalWhere, assetNotClosedStatusWhere\] \}/)
  assert.doesNotMatch(source, /CLOSED_AUDIT_STATUS_NAMES/)
  assert.match(source, /countDashboardAssetCrossScope\(companyId\)/)
  assert.match(source, /status: auditRoundOperationalWhere/)
  assert.match(source, /by: \["auditRoundId", "expectedBranchId", "auditStatus"\]/)
  assert.match(source, /auditRound: \{ isActive: true, status: "open" \}, \.\.\.\(companyId \? \{ expectedCompanyId: companyId \} : \{\}\)/)
  assert.match(source, /buildDashboardAudit\(\{/)
  assert.match(source, /today: startOfBangkokDay\(now\)/)
  assert.match(source, /narrowedToCompany: companyId !== null/)
  assert.match(source, /buildDashboardStatusRows\(/)
  assert.equal(source.match(/await Promise\.all\(\[/g)?.length, 1, "one round of parallel reads")
  assert.doesNotMatch(source, /await prisma\.|\.(create|update|upsert|delete)(Many)?\(|systemLog|getNotificationCenter/)
})

test("the overview rules are pure and count days with the waiting work's Bangkok helper, as every dashboard part does", () => {
  const source = read("src/lib/dashboard-overview-rules.ts")
  assert.doesNotMatch(source, /from "@\//, "node --test imports this file")
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.match(source, /import \{[^}]*\bbangkokDayDiff\b[^}]*\} from "\.\/waiting-work-rules\.ts"/)
  assert.doesNotMatch(source, /toLocalDateInputValue|86_?400_?000/, "no private day helper")
})

test("the cross-scope count is the register's crossScope=all rule in SQL, narrowed by company (spec §6.6)", () => {
  const source = read("src/lib/asset-cross-scope.ts")
  const count = source.slice(source.indexOf("export async function countDashboardAssetCrossScope("))
  assert.match(count, /^export async function countDashboardAssetCrossScope\(companyId: string \| null\): Promise<number>/)
  assert.match(count, /WHERE a\.\[isActive\] = 1/)
  assert.match(count, /\$\{companyId \? Prisma\.sql`AND a\.\[companyId\] = \$\{companyId\}` : Prisma\.empty\}/)
  assert.match(count, /\(e\.\[id\] IS NOT NULL AND \(e\.\[companyId\] <> a\.\[companyId\] OR e\.\[branchId\] <> a\.\[branchId\]\)\)/)
  assert.match(count, /\(hl\.\[id\] IS NOT NULL AND hl\.\[branchId\] <> a\.\[branchId\]\)/)
  assert.match(count, /OR cl\.\[branchId\] <> a\.\[branchId\]/)
})

test("the recent feed reads asset movements only, without the mirror rows (spec §6.8)", () => {
  const source = read("src/lib/dashboard-recent.ts")
  assert.match(source, /export async function getRecentAssetEvents\(take: number\): Promise<RecentAssetEvent\[\]>/)
  assert.match(source, /prisma\.assetMovement\.findMany\(\{/)
  assert.match(source, /movementType: \{ notIn: \[\.\.\.ASSET_MOVEMENT_MIRROR_TYPES\] \}/)
  assert.match(source, /asset: \{ isActive: true \}/)
  assert.match(source, /orderBy: \[\{ performedAt: "desc" \}, \{ id: "desc" \}\]/)
  assert.match(source, /assetMovementReferenceLookup\(/)
  for (const model of ["assetCheckout", "assetCheckin", "assetTransfer", "maintenanceTicket", "disposalRequest", "auditFinding", "auditItem"]) {
    assert.equal(source.match(new RegExp(`prisma\\.${model}\\.findMany\\(`, "g"))?.length, 1, model)
  }
  assert.doesNotMatch(source, /systemLog|\.(create|update|upsert|delete)(Many)?\(/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/dashboard-overview-rules.test.ts tests/asset-movement-labels.test.ts tests/dashboard-overview.test.ts`
Expected: FAIL.
- The first two files cannot find `../src/lib/dashboard-overview-rules.ts` and `../src/lib/asset-movement-labels.ts`.
- The third fails with `ENOENT` on `src/lib/dashboard-overview.ts`, `src/lib/dashboard-overview-rules.ts` and `src/lib/dashboard-recent.ts`, and on the missing `countDashboardAssetCrossScope`.

- [ ] **Step 3: Add the movement labels**

Write this change file outside the repo, in the session scratchpad. Then run `node scripts/messages-edit.mjs <file>`. The run sets 24 keys in th and 24 in en.

The words follow `docs/19_THAI_GLOSSARY.md`:
- "บันทึกซ่อม" replaces "เปิดใบซ่อม" (spec §5, and `repairRecord.movement.create` already uses it).
- "ปฏิเสธ" is the disposal page's word for reject.
- "แผนก" is the word the finding types use.
- "ทรัพย์สินหลัก" is the word `removed_from_parent` already uses.

| Key `asset.movementTypes.*` | th | en |
|---|---|---|
| `maintenance_create` (changed) | บันทึกซ่อม | Repair recorded |
| `maintenance_close` | ซ่อมเสร็จ | Repair finished |
| `maintenance_cancel` | ยกเลิกบันทึกซ่อม | Repair record cancelled |
| `maintenance_status_update` | เปลี่ยนสถานะงานซ่อม (ขั้นตอนเดิม) | Repair status changed (previous workflow) |
| `batch_create` | ลงทะเบียนทรัพย์สินแบบชุด | Batch asset registration |
| `status_correction` | แก้ไขสถานะ | Status corrected |
| `state_review_resolution` | ปรับตามการตรวจสอบสถานะและสภาพ | Fixed after the status and condition check |
| `audit_location_correction` | แก้ที่ตั้งตามผลตรวจนับ | Location corrected from the audit |
| `audit_custodian_correction` | แก้ผู้ถือครองตามผลตรวจนับ | Custodian corrected from the audit |
| `audit_department_correction` | แก้แผนกตามผลตรวจนับ | Department corrected from the audit |
| `audit_condition_correction` | แก้สภาพตามผลตรวจนับ | Condition corrected from the audit |
| `disposal_request` | ขอตัดจำหน่าย | Disposal requested |
| `disposal_approve` | อนุมัติตัดจำหน่าย | Disposal approved |
| `disposal_reject` | ปฏิเสธคำขอตัดจำหน่าย | Disposal request rejected |
| `disposal_execute` | ตัดจำหน่ายแล้ว | Disposed |
| `parent_checkout_sync` | ปรับตามการส่งมอบทรัพย์สินหลัก | Followed its parent's handover |
| `parent_checkin_sync` | ปรับตามการรับคืนทรัพย์สินหลัก | Followed its parent's return |
| `parent_transfer_sync` | ปรับตามการโอนย้ายทรัพย์สินหลัก | Followed its parent's transfer |
| `parent_register_update_sync` | ปรับตามการแก้ไขทรัพย์สินหลัก | Followed its parent's record edit |
| `parent_bulk_move_sync` | ปรับตามการย้ายหลายรายการของทรัพย์สินหลัก | Followed its parent's bulk move |
| `parent_bulk_update_sync` | ปรับตามการอัปเดตหลายรายการของทรัพย์สินหลัก | Followed its parent's bulk update |
| `parent_audit_finding_sync` | ปรับตามรายการไม่ตรงของทรัพย์สินหลัก | Followed its parent's approved discrepancy |
| `parent_audit_confirmation_sync` | ปรับตามผลตรวจนับของทรัพย์สินหลัก | Followed its parent's audit result |
| `other` | ความเคลื่อนไหวอื่น | Other activity |

The other 26 keys of `asset.movementTypes` stay as they are, so the namespace holds 50 keys: 49 types plus `other`.

- [ ] **Step 4: Implement the pure helpers**

`src/lib/dashboard-overview-rules.ts` imports only `{ bangkokDayDiff } from "./waiting-work-rules.ts"`, `./audit-round-status.ts`, `{ auditRoundBranchFilterName } from "./audit-round-result-filters.ts"` (Task 5; `buildDashboardAudit` names branches with it) and `type { SessionUser } from "./auth-utils.ts"`. Task 1's file is client-safe, and Task 5's file is pure too (a type-only `@prisma/client` import and `./audit-result-summary.ts`, which imports nothing), so this one stays pure and the Step 1 test "the overview rules are pure …" (no `from "@/`, no value import of `@prisma/client`, no `prisma.`) still holds.

- **Bangkok days:** every day comparison below is Task 1's `bangkokDayDiff(from, to)`; there is no private day helper. `today` may be any instant of the day.
- **`getDashboardProfile`:**
  - Returns `"work"` when any of these holds:
    - `roles` includes `"system_admin"`;
    - `canAnyApproval`;
    - `permissions` holds any of `asset|maintenance|audit|disposal` × `create|edit`.
  - Otherwise returns `"overview"`.
  - It never reads a role name other than `system_admin`. Like `hasPermission`, it takes no import from `auth-utils.ts` beyond the type.
- **The orders:** `DASHBOARD_KPI_ORDER` and `DASHBOARD_SECTION_ORDER` are the values the test pins, as `readonly` arrays.
- **`dashboardRegisterParams`:**
  - `companyId` comes first when it is not null.
  - Then: `total` → nothing; `idle180` → `activity: "idle_180d"`; `custodianAssigned` → `custodianState: "assigned"`; `responsibilityMissing` → `dataQuality: "responsibility"`; `crossScope` → `crossScope: "all"`; `{ statusId }` → `statusId`.
  - Today's cross-scope link also carries `page: "1"`. It is dropped, because the register starts at page 1 anyway.
- **`auditPace`:**
  - Let `span = bangkokDayDiff(start, due)` and `elapsed = bangkokDayDiff(start, today)`.
  - When `span <= 0`, return `elapsed >= 0 ? 1 : 0`.
  - Otherwise return `clamp(elapsed / span, 0, 1)`.
- **`auditPercent`:** `expected > 0 ? Math.round(processed / expected * 100) : 0`. This is the round page's own rule (`src/components/audit/audit-progress-bar.tsx:31`), so the KPI and the round page show the same number.
- **`isBehindPace`:** `pace !== null && expected > 0 && auditPercent(processed, expected) < Math.round(pace * 100)`. The two whole percents a person reads are compared, never the raw fractions.
- **`pickCurrentAuditRound`:**
  - The candidates are the rounds with `status === "open"` for which `eligible(round)` holds (by default every round).
  - First choice: the candidates in their dates, `bangkokDayDiff(start, today) >= 0 && bangkokDayDiff(today, end) >= 0`. The nearest due date wins: the smallest `endDate`.
  - Otherwise: the candidates past due, `bangkokDayDiff(end, today) > 0`. The nearest due date wins: the largest `endDate`.
  - Ties, in both: the latest `startDate`, then `auditNo` ascending. The input order never decides.
  - `otherOpen` = the number of input rounds with `isAuditRoundOperationalStatus(status)` (draft or open), minus 1 when there is a current round. It ignores `eligible`, so it equals what the rounds list's "กำลังตรวจ" tab (`?view=open`, `audit/rounds/page.tsx:864`) holds, less the current round.
  - The page never prints `otherOpen`. Tasks 9 and 10 read only `otherOpen > 0`: it shows the "ดูรอบที่กำลังตรวจทั้งหมด" link to `?view=open`, and with no current round it picks the no-round copy (any operational round, else none).
- **`sortBranchesByGap`:**
  - Returns a new array.
  - The order is the share `processed / expected`, ascending. The pace is one value for the whole round, so ordering by the gap to the pace is the same as ordering by the share.
  - Ties: more items left (`expected − processed`) first, then `name` by `localeCompare(…, "th")`.
- **`buildDashboardAudit`:**
  - First find the rounds that have rows in `itemCounts`. These are the ones holding items, or holding the chosen company's items, because the server narrows the count.
  - `pickCurrentAuditRound(rounds, today, narrowedToCompany ? (round) => roundsWithItems.has(round.id) : undefined)`.
  - No current round: return `{ round: null, otherOpen, processed: 0, expected: 0, pace: null, branches: [] }`.
  - With a current round:
    - Sum its rows. `expected` is every row; `processed` is the rows whose `auditStatus !== "pending"` (the round pages' rule, `audit/rounds/[id]/page.tsx:270-271`). With a company chosen, `expected` is the item count of the round page narrowed by that `companyId` (Task 5), and each branch row's `expected` is the count narrowed by its `branchId`, so every link shows its number.
    - `pace = auditPace(startDate, endDate, today)`.
    - Make one branch row per `expectedBranchId`:
      - `name` is `auditRoundBranchFilterName({ name, companyCode }, narrowedToCompany)` (Task 5, `src/lib/audit-round-result-filters.ts`): `"<companyCode> / <name>"` with all companies, the name alone with one, because "สำนักงานใหญ่" and "ปิ่นทอง" each name a branch in two companies on the dev data (SELECT, 2026-10-26). The round page's branch chip calls the same helper, so the two cannot drift. A branch missing from the map shows its id.
      - `behind = isBehindPace(processed, expected, pace)`.
    - Sort the rows with `sortBranchesByGap`.
    - `round` is `{ id, code: auditNo, name, startDate, endDate }`.
- **`buildDashboardStatusRows`:**
  - One row per group with `count > 0` whose status is in `statuses`, whether that status is active or not.
  - Sorted by `sortOrder`, then `name`.
  - The shape is `{ statusId, name, nameTh, count }`.
- **`formatAsOf`:**
  - Use `Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts`.
  - Assemble `` `${day} ${month} ${year} ${hour}:${minute}` `` from the parts, which drops en-GB's comma.
- **`type DashboardOverview`:** the shape in the Interfaces block. `custodianShare` is a fraction from 0 to 1, or `null` when no asset is open; Task 9 renders the percent.

`src/lib/asset-movement-labels.ts` imports nothing.

- **`ASSET_MOVEMENT_LABELLED_TYPES`:** the 49 types of the test. The two older types have no writer but keep labels: `maintenance_status_update` has 12 rows on dev (the latest 2026-09-28), and `maintenance_pm_create` already has a message (SELECT on `asset_management_dev`, 2026-10-26).
- **`ASSET_MOVEMENT_MIRROR_TYPES`:** the 10 types of the test.
- **`assetMovementLabelKey`:** a `Set` lookup. It returns `` `asset.movementTypes.${type}` ``, or `"asset.movementTypes.other"`. The detail page's and the disposal page's own `knownMovementTypeKeys` (`assets/[id]/page.tsx:2730`, `disposal/[id]/page.tsx:438`) stay; the asset-detail plan switches the detail page to this function.
- **`assetMovementReferenceLookup`:**
  - `checkout`, `checkin` and `transfer` map to themselves.
  - `maintenance` → `repair`; `disposal` → `disposal`; `audit_finding` → `auditFinding`; `audit_scan` → `auditItem`.
  - Anything else, `""` or `null` → `null`.
- **`buildAssetMovementDocumentHref`:** the pages the detail page already links (`assets/[id]/page.tsx:612,638,651`, `:2656`, `:2689`):
  - checkout → `/${locale}/asset-management/checkouts/${id}`;
  - checkin → `/${locale}/asset-management/checkins/${id}`;
  - transfer → `/${locale}/asset-management/transfers/${id}`;
  - repair → `/${locale}/maintenance/${id}`;
  - disposal → `/${locale}/disposal/${id}`;
  - auditRound → `/${locale}/audit/rounds/${id}`.
- **`ASSET_MOVEMENT_DOCUMENT_PERMISSION`:** each page's own `requirePagePermission`, as the test pins.

- [ ] **Step 5: Implement the server reads**

**`countDashboardAssetCrossScope`** in `src/lib/asset-cross-scope.ts`, after `buildDashboardAssetCrossScopeSummary`.
- It is the `all` sum of today's query (:117-134) as a `COUNT(*)`, narrowed by company.
- It stays SQL. Commit `45a60b17` moved the dashboard off the per-asset scan that `applyAssetCrossScopeFilter` runs.
- Every joined column is `NOT NULL` (`schema.prisma` Employee, Location and Asset), so SQL `<>` here is the same test as `getAssetCrossScopeFlags`' `!==`. The register's `crossScope=all&companyId=` list (`assets/page.tsx:60`) therefore holds the same assets.

```ts
export async function countDashboardAssetCrossScope(companyId: string | null): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ all: number | bigint | null }>>`
    SELECT COUNT(*) AS [all]
    FROM [assets] a
    LEFT JOIN [employees] e ON e.[id] = a.[custodianId]
    LEFT JOIN [locations] hl ON hl.[id] = a.[homeLocationId]
    INNER JOIN [locations] cl ON cl.[id] = a.[currentLocationId]
    WHERE a.[isActive] = 1
      ${companyId ? Prisma.sql`AND a.[companyId] = ${companyId}` : Prisma.empty}
      AND (
        (e.[id] IS NOT NULL AND (e.[companyId] <> a.[companyId] OR e.[branchId] <> a.[branchId]))
        OR (hl.[id] IS NOT NULL AND hl.[branchId] <> a.[branchId])
        OR cl.[branchId] <> a.[branchId]
      )
  `
  return normalizeCrossScopeCount(rows[0]?.all)
}
```

**`getDashboardOverview`** in `src/lib/dashboard-overview.ts`:
- Imports through `@/lib/...`. It re-exports `type DashboardOverview`.
- Start with `const totalWhere = buildAssetWhere(parseAssetListParams(dashboardRegisterParams("total", companyId)))`.
- Then one `await Promise.all([...])` of exactly these reads:
  1. `prisma.asset.count({ where: totalWhere })`.
  2. Three `prisma.asset.count`s on `buildAssetWhere(parseAssetListParams(dashboardRegisterParams(<key>, companyId)))`, for `"idle180"`, `"custodianAssigned"` and `"responsibilityMissing"`.
  3. The share's denominator: `prisma.asset.count({ where: { AND: [totalWhere, assetNotClosedStatusWhere] } })`, with `assetNotClosedStatusWhere` imported from `@/lib/asset-custodian-state-filter` (Task 3). It is the very fragment inside `custodianState=assigned`, so the KPI's count is always part of its denominator.
  4. `prisma.asset.groupBy({ by: ["statusId"], where: totalWhere, _count: { _all: true } })`. This is the register's own `groupBy` (`assets/page.tsx:144-148`). It has the same base where, so every status link `{ statusId, companyId? }` lists its row's count.
  5. `prisma.assetStatus.findMany({ select: { id, name, nameTh, sortOrder } })`, with no `isActive` filter.
  6. `countDashboardAssetCrossScope(companyId)`.
  7. `prisma.auditRound.findMany({ where: { isActive: true, status: auditRoundOperationalWhere }, select: { id, auditNo, name, status, startDate, endDate } })`. It is not narrowed by company, so `otherOpen > 0` exactly when the rounds list's `?view=open` holds another round. No `orderBy`: `pickCurrentAuditRound` breaks every tie itself.
  8. `prisma.auditItem.groupBy({ by: ["auditRoundId", "expectedBranchId", "auditStatus"], where: { auditRound: { isActive: true, status: "open" }, ...(companyId ? { expectedCompanyId: companyId } : {}) }, _count: { _all: true } })`. This covers every open round at once. The dev database has 30 open rounds with 257 items (SELECT, 2026-10-26), so there is no second round of reads.
  9. `prisma.branch.findMany({ select: { id: true, name: true, company: { select: { code: true } } } })`. It reads every branch, because `expectedBranchId` is not a relation.
- Return:
  - `{ total, idle180, custodianAssigned, responsibilityMissing, crossScopeTotal }`;
  - `custodianShare: open > 0 ? custodianAssigned / open : null`;
  - `statusRows: buildDashboardStatusRows(...)`, mapping `_count._all` to `count`;
  - `audit: buildDashboardAudit({ rounds, itemCounts, branches: new Map(...), today: startOfBangkokDay(now), narrowedToCompany: companyId !== null })`, with `startOfBangkokDay` imported from `@/lib/waiting-work-rules` (Task 1).
- No `withPerformanceTiming` inside the lib. Task 9 wraps the call in the page's labels.

**`getRecentAssetEvents`** in `src/lib/dashboard-recent.ts`:
1. Read the movements:

   ```ts
   prisma.assetMovement.findMany({
     where: { movementType: { notIn: [...ASSET_MOVEMENT_MIRROR_TYPES] }, asset: { isActive: true } },
     orderBy: [{ performedAt: "desc" }, { id: "desc" }],
     take,
     select: { id, movementType, referenceType, referenceId, performedAt, asset: { select: { id, assetTag, name } } },
   })
   ```

   An inactive asset's detail page answers 404 (`assets/[id]/page.tsx:144,275`), so those rows stay out. The mirror rows stay out because the parent's own row records the same event: one handover of a PC with three parts would otherwise fill the feed.
2. Group the `referenceId`s by `assetMovementReferenceLookup(referenceType)`.
3. In one `Promise.all`, read only the kinds present, each with `findMany({ where: { id: { in: ids } }, select })`:
   - `assetCheckout` → `documentNo`;
   - `assetCheckin` → `documentNo`;
   - `assetTransfer` → `documentNo`;
   - `maintenanceTicket` → `repairNo`;
   - `disposalRequest` → `disposalNo`;
   - `auditFinding` → `auditRound { id, auditNo }`;
   - `auditItem` → `auditRound { id, auditNo }`.
4. Map each movement to a `RecentAssetEvent`:
   - `auditFinding` and `auditItem` become the round's document: `{ kind: "auditRound", id: round.id, code: auditNo }`.
   - The others keep their own id and number, with `maintenanceTicket` as `kind: "repair"`.
   - A record that is missing, or a checkout or check-in without a `documentNo` (legacy backfills), gives `document: null`.
5. Keep the movements' order.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/dashboard-overview-rules.test.ts tests/asset-movement-labels.test.ts tests/dashboard-overview.test.ts tests/asset-cross-scope.test.ts tests/dashboard-cross-scope.test.ts tests/list-frame-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/e2e-fixes.test.ts tests/disposal-detail-workspace.test.ts && npx tsc --noEmit`
Expected: PASS, every test.
- 47 written types and 24 writers.
- LV2 for `src/lib/asset-cross-scope.ts` is still 5.
- tsc is clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dashboard-overview-rules.ts src/lib/dashboard-overview.ts src/lib/asset-movement-labels.ts src/lib/dashboard-recent.ts src/lib/asset-cross-scope.ts messages/th.json messages/en.json tests/dashboard-overview-rules.test.ts tests/asset-movement-labels.test.ts tests/dashboard-overview.test.ts
git commit -m "feat(dashboard): the overview data, the recent asset events and a label for every movement type (group 1 dashboard task 8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

---

### Task 9: The dashboard page — header, company switcher, KPIs, งานที่รอคุณ, ตามสถานะ

**Files:**
- Modify: `src/app/[locale]/(dashboard)/dashboard/page.tsx` (whole file, master 1-517)
- Create: `src/lib/dashboard-page.ts` (pure helpers; relative `.ts` imports only)
- Modify: `src/lib/display-format.ts` (add `formatPercent`)
- Modify: `src/components/ui/page-skeleton.tsx:127-191` (`DividedPanelSkeleton` replaces `PanelSkeleton`; `DashboardPageSkeleton`)
- Delete: `src/lib/dashboard-action-cards.ts` and `tests/dashboard-action-cards.test.ts` (no caller left; the rule they held is `getWaitingWork`'s, Task 1)
- Modify: `src/lib/asset-cross-scope.ts:60-65,114-174`: delete `buildDashboardAssetCrossScopeSummary` and its `DashboardAssetCrossScopeCountsRow` type. The page was their only caller, and Task 8's `countDashboardAssetCrossScope` replaces them. `normalizeCrossScopeCount`, `assetCrossScopeRowSelect` (:102) and `toAssetCrossScopeSummaryRow` stay, because Task 8 and the reports use them. The five `"-"` sit in `toAssetCrossScopeSummaryRow` (:212-216), so the LV2 row of `asset-cross-scope.ts` (`tests/list-frame-guards.test.ts:174`) stays at 5.
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Modify: `DESIGN.md`, two phrases found by their text, not by line (Tasks 6 and 7 insert text above them; before those tasks they sit at :476 and :702): in the components list's StatStrip bullet (`src/components/ui/stat-strip.tsx`, server-safe), "the work center and the dashboard's 4 + 3 KPIs" becomes "the work center"; in the `**Loading skeletons**` bullet, "a title alone on the dashboard" becomes "the title and its as-of line on the dashboard"
- Test (new): `tests/dashboard-page.test.ts`
- Test (rewritten pins):
  - `tests/dashboard-asset-status.test.ts` (whole file)
  - `tests/dashboard-cross-scope.test.ts` (whole file)
  - `tests/list-pages-ui.test.ts:834-846`
  - `tests/reports-dashboard-sweep-ui.test.ts:77-89`
  - `tests/asset-register-ux.test.ts:80-96` (the dashboard lines only)
  - `tests/audit-round-cancellation.test.ts:124-141` (Task 8's `src/lib/dashboard-overview.ts` replaces the dashboard page in the list)
  - `tests/performance-route-instrumentation.test.ts:7-16`
  - `tests/page-loading-skeleton.test.ts:51`
  - `tests/phase2d-final-ui.test.ts:46-60`
  - `tests/disposal-sweep-ui.test.ts:195-201`
  - `tests/display-format.test.ts:44-50`
  - Unchanged and still passing: `tests/permission-aware-navigation.test.ts:89-99,104-125` (the page keeps `shouldUseEmployeeHome(user)`, the `my-assets` redirect, exactly one `/work-center` and its guarded `Link`), `tests/loading-boundaries.test.ts:41`.

**Interfaces:**
- Consumes:
  - Task 1: `getWaitingWork(user, now)` (read-only; the page never calls `getNotificationCenter`, R10), `buildWaitingWorkHref(locale, key)`, `WAITING_WORK_KEYS`, `type WaitingWorkKey`, `type WaitingWorkCounts`; the 12 kinds' titles `notifications.<WaitingWorkKey>` and their `notifications.<WaitingWorkKey>Detail` sentences (R4: Task 1 adds `openRepairsDetail` and `stuckRepairsDetail`). `visibleKeys` already leaves out `pendingAuditFindings` / `pendingDisposals` while the inbox holds that kind (R8).
  - Task 2: `getWaitingWorkAges(user, keys, rules, now)`, called only with the keys whose count is above 0 (R11), `type WaitingWorkAge`.
  - Task 3A: the register reads `custodianState=assigned` (chip "มีผู้ถือครอง", link-only, R7) and shows the company chip at every width.
  - Task 5: `buildAuditRoundItemsHref(locale: string, roundId: string, filters: { branchId?: string; companyId?: string }): string` in `src/lib/audit-round-result-filters.ts` (R13); the round KPI passes the chosen company.
  - Task 6: `StatStripItem.filterNote?: string` (shown only on a cell with `href`, R19) and `StatStripItem.meter?: React.ReactNode` (R18).
  - Task 7: `DistributionBar({ segments })` (each segment `{ key, count, tone, href?, title? }`; the bar is `aria-hidden`, a segment with `href` is a pointer-only link, R17), `PaceBar({ value, pace, label, behind })`, `statusFillVariants({ tone })` (`src/components/ui/badge-variants.ts`, R20: the status table's swatch is the segment's fill).
  - Task 8 (R21): `getDashboardProfile`, `DASHBOARD_KPI_ORDER`, `DASHBOARD_SECTION_ORDER`, `type DashboardKpiKey`, `type DashboardSectionKey`, `formatAsOf`, `getDashboardOverview({ companyId, now })`, `type DashboardOverview` (defined in `src/lib/dashboard-overview-rules.ts`, re-exported by `dashboard-overview.ts`), `type DashboardRegisterCount`, `dashboardRegisterParams(count, companyId)`, `auditPercent(processed, expected)`, `isBehindPace(processed, expected, pace)`. `overview.statusRows` comes from Task 8's `buildDashboardStatusRows` (counts above 0, in `sortOrder`).
  - Existing: `getApprovalInboxAccess`, `hasPermission`, `shouldUseEmployeeHome`, `buildExactAssetRegisterHref`, `getAssetStateTone`, `toneIcons`, `TabNav`, `FilterChipList`, `FilterSelect`, `FilterFormActions`, `ContentPanel`, `ContentPanelRows`, `DataTable*`, `EmptyNote`, `StatStrip`, `PageHeader`.
- Produces (for Tasks 10 and 11), in `src/lib/dashboard-page.ts`:
  - `DASHBOARD_COMPANY_TAB_LIMIT = 4`
  - `normalizeDashboardCompanyId(raw: string | string[] | undefined, companies: readonly { id: string }[]): string | null`
  - `buildDashboardHref(locale: string, companyId: string | null): string`
  - `buildDashboardRegisterHref(locale: string, count: DashboardRegisterCount, companyId: string | null): string` = `buildExactAssetRegisterHref(locale, dashboardRegisterParams(count, companyId))`, so every overview link carries the very params Task 8 counts with (R21)
  - `type DashboardWaiting = { rows: { key: WaitingWorkKey; count: number; age: WaitingWorkAge | null }[]; zeroKeys: WaitingWorkKey[]; total: number; oldest: { days: number; overdue: boolean } | null }`
  - `buildDashboardWaiting(work: { counts: WaitingWorkCounts; visibleKeys: readonly WaitingWorkKey[] }, ages: Partial<Record<WaitingWorkKey, WaitingWorkAge>>): DashboardWaiting`
  - `type DashboardAgeKey = "waitingAgeDays" | "waitingAgeUnderDay" | "waitingOverdue" | "waitingDueToday" | "waitingDueIn" | "waitingExpires"`
  - `describeWaitingAge(age: WaitingWorkAge, locale: string, now: Date): { key: DashboardAgeKey; values: Record<string, string>; overdue: boolean }`
  - `formatDayMonth(date: Date, locale: string, now: Date): string`
  - `type DashboardStatusRow = { key: string; name: string; count: number; share: number; href: string; tone: UiTone }`
  - `buildDashboardStatusTable(rows: DashboardOverview["statusRows"], locale: string, companyId: string | null): DashboardStatusRow[]` (the table and the bar of ตามสถานะ; not `buildDashboardStatusRows`, which is Task 8's name for the overview's own rows, R21)
  - In `src/lib/display-format.ts`, overloaded like `formatCount`: `formatPercent(value: number, fractionDigits?: 0 | 1): string` and `formatPercent(value: number | null | undefined, fractionDigits?: 0 | 1): string | null`.
  - Page markup Task 11 reads: each section in a wrapper `<div id={\`dashboard-${key}\`} data-dashboard-section={key}>`; each waiting row (desktop `<tr>`, phone `<a>`) carries `data-waiting-key={row.key}` and its count in a `.num` element; each linked status segment carries `data-status-segment={statusId}` and the same `href` as its table row's link (Task 7, R17); the KPI strip is the page's only `StatStrip`.

- [ ] **Step 1: Add the page's messages**

Write a change file outside the repo and run `node scripts/messages-edit.mjs <file>`. In `dashboard` (`title` "แดชบอร์ด", `totalAssets` "ทรัพย์สินทั้งหมด" and `openWorkCenter` "เปิดศูนย์งานค้าง" stay as they are):

| Key | th | en |
|---|---|---|
| `asOf` | ข้อมูล ณ {time} | As of {time} |
| `scopeNavigation` | ขอบเขตข้อมูล | Data scope |
| `allCompanies` | ทุกบริษัท | All companies |
| `companyChip` | บริษัท: {name} | Company: {name} |
| `removeFilter` | ล้างตัวกรองนี้ | Clear this filter |
| `showScope` | แสดง | Show |
| `custodianAssigned` | มีผู้ถือครอง | With a custodian |
| `waitingTitle` | งานที่รอคุณ | Waiting for you |
| `auditRoundKpi` | รอบตรวจนับ {code} | Audit round {code} |
| `auditRoundNone` | รอบตรวจนับ | Audit round |
| `noDueRound` | ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้ | No audit round is due now |
| `noRound` | ไม่มีรอบตรวจนับที่กำลังตรวจ | No audit round in progress |
| `unitItems` | รายการ | items |
| `idleFoot` | ไม่มีความเคลื่อนไหวเกิน 180 วัน {count} | No movement for over 180 days: {count} |
| `responsibilityFoot` | ยังไม่มีผู้รับผิดชอบ {count} | No one responsible: {count} |
| `oldestFoot` | ค้างนานสุด {days} วัน | Oldest waiting {days} days |
| `auditFoot` | ตรวจแล้ว {processed} / {expected} · ควรถึง {pace} | Counted {processed} / {expected} · expected {pace} |
| `auditBarLabel` | ตรวจแล้ว {percent} ควรถึงวันนี้ {pace} | Counted {percent}, expected by today {pace} |
| `noteTotal` | ทุกสถานะ รวมตัดจำหน่ายแล้วและปลดระวาง | Every status, disposed and retired included |
| `noteCustodian` | มีผู้ถือครอง ไม่รวมตัดจำหน่ายแล้วและปลดระวาง | Has a custodian, disposed and retired left out |
| `noteWaiting` | ผลรวมของตารางงานที่รอคุณ ทุกบริษัท | The sum of the waiting table, all companies |
| `noteAudit` | ตรวจแล้ว = มีผลตรวจ · ควรถึงวันนี้ = นับจากวันเริ่มถึงวันครบกำหนดของรอบ | Counted = has a result · Expected by today = from the round's start to its due date |
| `noteCompany` | บริษัท {company} · {note} | Company {company} · {note} |
| `noteStatus` | สถานะ = {status} | Status = {status} |
| `waitingColumnKind` | เรื่อง | Work |
| `columnCount` | จำนวน | Count |
| `waitingColumnAge` | ค้างนานสุด | Oldest |
| `waitingColumnNext` | ทำต่อ | Next step |
| `waitingAgeDays` | {days} วัน | {days} days |
| `waitingAgeUnderDay` | ไม่ถึง 1 วัน | Under a day |
| `waitingAgeRow` | ค้าง {age} | Waiting {age} |
| `waitingOverdue` | เลยกำหนด {days} วัน | {days} days overdue |
| `waitingDueToday` | ครบกำหนดวันนี้ | Due today |
| `waitingDueIn` | ครบกำหนดใน {days} วัน | Due in {days} days |
| `waitingExpires` | ถึง {date} | Until {date} |
| `waitingZero` | ไม่มีงานค้าง: {kinds} | Nothing waiting: {kinds} |
| `waitingNext.approvalInbox` | พิจารณา | Decide |
| `waitingNext.openRepairs` | ดูงานซ่อม | View repairs |
| `waitingNext.stuckRepairs` | บันทึกซ่อม | Record repair |
| `waitingNext.duePm` | ดูแผน PM | View PM plans |
| `waitingNext.pendingAuditFindings` | ดูรายการไม่ตรง | View discrepancies |
| `waitingNext.openAuditActions` | ดูแผนแก้ไข | View action plans |
| `waitingNext.auditActionsDueSoon` | ดูแผนแก้ไข | View action plans |
| `waitingNext.pendingDisposals` | ดูคำขอ | View requests |
| `waitingNext.approvedDisposals` | ตัดจำหน่าย | Dispose |
| `waitingNext.returnsDueSoon` | รับคืน | Check in |
| `waitingNext.warrantyExpiringSoon` | ดูทรัพย์สิน | View assets |
| `waitingNext.licenseExpiringSoon` | ดู License | View licenses |
| `statusTitle` | ตามสถานะ | By status |
| `statusColumn` | สถานะ | Status |
| `shareColumn` | สัดส่วน | Share |
| `statusSegmentTitle` | {status} {count} รายการ · {note} | {status}: {count} · {note} |
| `statusEmpty` | ยังไม่มีทรัพย์สิน | No assets yet |
| `crossScopeLine` | นอกขอบเขตเจ้าของรหัส {count} รายการ | {count} outside the owner's scope |

Delete in both locales (the page no longer reads them; the waiting rows take the bell's `notifications.*` titles): `dashboard.inUse`, `readyToDeploy`, `pendingRepair`, `underMaintenance`, `warrantyExpiring`, `crossScopeAssets`, `recentActivity`, `actionableTitle`, `actionableSubtitle`, `approvalInbox`, `approvalInboxDetail`, `openRepairs`, `openRepairsDetail`, `pendingAuditFindings`, `pendingAuditFindingsDetail`, `pendingDisposals`, `pendingDisposalsDetail`, `approvedDisposals`, `approvedDisposalsDetail`, `crossScopeActionTitle`, `crossScopeActionDetail`, `crossScopePanelTitle`, `crossScopePanelSubtitle`, `crossScopeAll`, `crossScopeCustodianCompany`, `crossScopeCustodianBranch`, `crossScopeLocationBranch`, `crossScopePreviewTitle`, `crossScopePreviewEmpty`, `crossScopeViewAll`, `statusOverview`, `monthlyTrendTitle`, `monthlyTrendSubtitle`, `thisMonth`, `previousMonth`, `trendAssetsCreated`, `trendMaintenanceOpened`, `trendAuditFindings`, `trendDisposalsRequested`, `noRecentActivity`, `systemUser`, `activityTitle`, `activityTitleWithRecord`, `activityDetail` (all `dashboard.`-prefixed in the change file).

Glossary (`docs/19_THAI_GLOSSARY.md`): no "ตรวจทาน", no "อยู่ที่", "บันทึกซ่อม" (not "แจ้งซ่อม"), "ควรถึง" (not "เป้า"), "ขอบเขต", "ผู้ถือครอง", PM and License as kept terms; no English word in a th value. R15's two no-round lines ("ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้", "ไม่มีรอบตรวจนับที่กำลังตรวจ") were checked against the glossary and every rule of `tests/thai-glossary.test.ts`: "รอบตรวจนับ" is the glossary's word for a round (row "รอบตรวจ"), and neither line holds a banned term.

- [ ] **Step 2: Write the failing tests**

`tests/dashboard-page.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  buildDashboardHref,
  buildDashboardRegisterHref,
  buildDashboardWaiting,
  DASHBOARD_COMPANY_TAB_LIMIT,
  describeWaitingAge,
  formatDayMonth,
  normalizeDashboardCompanyId,
} from "../src/lib/dashboard-page.ts"
import { buildExactAssetRegisterHref } from "../src/lib/asset-register-view-memory.ts"
import { dashboardRegisterParams, type DashboardRegisterCount } from "../src/lib/dashboard-overview-rules.ts"
import { WAITING_WORK_KEYS, type WaitingWorkAge, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/dashboard/page.tsx")

test("the company in the URL counts only when it is an active company (spec §6.2)", () => {
  const companies = [{ id: "c1" }, { id: "c2" }]
  assert.equal(normalizeDashboardCompanyId("c2", companies), "c2")
  assert.equal(normalizeDashboardCompanyId(" c1 ", companies), "c1")
  assert.equal(normalizeDashboardCompanyId(["c1", "c2"], companies), "c1")
  assert.equal(normalizeDashboardCompanyId("gone", companies), null)
  assert.equal(normalizeDashboardCompanyId("", companies), null)
  assert.equal(normalizeDashboardCompanyId(undefined, companies), null)
  assert.equal(DASHBOARD_COMPANY_TAB_LIMIT, 4)
  assert.equal(buildDashboardHref("th", null), "/th/dashboard")
  assert.equal(buildDashboardHref("en", "c 1"), "/en/dashboard?companyId=c+1")
})

test("every register link carries the overview's own filter, exact, with the chosen company (spec §6.2, §6.5; R21)", () => {
  assert.equal(buildDashboardRegisterHref("th", "total", null), "/th/assets?exact=1")
  assert.equal(buildDashboardRegisterHref("th", "total", "c1"), "/th/assets?companyId=c1&exact=1")
  assert.equal(buildDashboardRegisterHref("th", "custodianAssigned", null), "/th/assets?custodianState=assigned&exact=1")
  assert.equal(buildDashboardRegisterHref("en", "idle180", "c1"), "/en/assets?companyId=c1&activity=idle_180d&exact=1")
  const counts: DashboardRegisterCount[] = ["total", "idle180", "custodianAssigned", "responsibilityMissing", "crossScope", { statusId: "s 1" }]
  for (const count of counts) {
    for (const companyId of [null, "c1"]) {
      assert.equal(buildDashboardRegisterHref("th", count, companyId), buildExactAssetRegisterHref("th", dashboardRegisterParams(count, companyId)), JSON.stringify(count))
    }
  }
})

test("งานที่รอคุณ: the visible kinds with a count in the shared order, the kinds at zero, the sum and the oldest (spec §6.3)", () => {
  const counts = {
    approvalInbox: 9, openRepairs: 4, stuckRepairs: 2, duePm: 0, pendingAuditFindings: 3, openAuditActions: 0,
    auditActionsDueSoon: 0, pendingDisposals: 1, approvedDisposals: 0, returnsDueSoon: 5, warrantyExpiringSoon: 7, licenseExpiringSoon: 0,
  }
  const visibleKeys: WaitingWorkKey[] = ["openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon"]
  const ages: Partial<Record<WaitingWorkKey, WaitingWorkAge>> = {
    openRepairs: { kind: "age", days: 12, overdue: false },
    stuckRepairs: { kind: "age", days: 5, overdue: false },
    pendingAuditFindings: { kind: "age", days: 2, overdue: false },
    pendingDisposals: { kind: "age", days: 0, overdue: false },
    returnsDueSoon: { kind: "due", days: -3, overdue: true },
    warrantyExpiringSoon: { kind: "expires", date: new Date("2027-01-12T00:00:00Z"), days: 78 },
  }
  const waiting = buildDashboardWaiting({ counts, visibleKeys }, ages)
  assert.deepEqual(waiting.rows.map((row) => [row.key, row.count]), [
    ["openRepairs", 4], ["stuckRepairs", 2], ["pendingAuditFindings", 3], ["pendingDisposals", 1], ["returnsDueSoon", 5], ["warrantyExpiringSoon", 7],
  ])
  assert.deepEqual(waiting.rows[0].age, ages.openRepairs)
  assert.deepEqual(waiting.zeroKeys, ["duePm", "approvedDisposals"])
  assert.equal(waiting.total, 22, "approvals are not visible here, so their 9 never count")
  assert.deepEqual(waiting.oldest, { days: 12, overdue: true }, "the oldest age, overdue because a return is past due")
  assert.equal(buildDashboardWaiting({ counts, visibleKeys: ["pendingDisposals", "warrantyExpiringSoon"] }, ages).oldest, null, "nothing older than today, nothing overdue")
  assert.equal(buildDashboardWaiting({ counts, visibleKeys: ["openRepairs"] }, {}).rows[0].age, null)
})

test("ค้างนานสุด reads an age, a due date or an expiry, in Bangkok days (spec §6.3)", () => {
  const now = new Date("2026-10-26T03:00:00Z")
  assert.deepEqual(describeWaitingAge({ kind: "age", days: 12, overdue: false }, "th", now), { key: "waitingAgeDays", values: { days: "12" }, overdue: false })
  // An approval past its SLA: only approvals are overdue by age; the flag is Task 2's, read as it is (R9).
  assert.deepEqual(describeWaitingAge({ kind: "age", days: 4, overdue: true }, "th", now), { key: "waitingAgeDays", values: { days: "4" }, overdue: true })
  assert.deepEqual(describeWaitingAge({ kind: "age", days: 0, overdue: false }, "th", now), { key: "waitingAgeUnderDay", values: {}, overdue: false })
  assert.deepEqual(describeWaitingAge({ kind: "due", days: -3, overdue: true }, "th", now), { key: "waitingOverdue", values: { days: "3" }, overdue: true })
  assert.deepEqual(describeWaitingAge({ kind: "due", days: 0, overdue: false }, "th", now), { key: "waitingDueToday", values: {}, overdue: false })
  assert.deepEqual(describeWaitingAge({ kind: "due", days: 2, overdue: false }, "th", now), { key: "waitingDueIn", values: { days: "2" }, overdue: false })
  assert.deepEqual(describeWaitingAge({ kind: "expires", date: new Date("2026-11-20T00:00:00Z"), days: 25 }, "th", now), { key: "waitingExpires", values: { date: "20 พ.ย." }, overdue: false })
  assert.deepEqual(describeWaitingAge({ kind: "expires", date: new Date("2027-01-12T00:00:00Z"), days: 78 }, "en", now), { key: "waitingExpires", values: { date: "12 Jan 2027" }, overdue: false })
})

test("a day and month in Bangkok, with the year only when it is not this year, Buddhist in Thai", () => {
  const now = new Date("2026-10-26T03:00:00Z")
  assert.equal(formatDayMonth(new Date("2026-11-20T00:00:00Z"), "th", now), "20 พ.ย.")
  assert.equal(formatDayMonth(new Date("2027-01-12T00:00:00Z"), "th", now), "12 ม.ค. 2570")
  assert.equal(formatDayMonth(new Date("2026-12-31T17:30:00Z"), "th", now), "1 ม.ค. 2570", "already the new year in Bangkok")
  assert.equal(formatDayMonth(new Date("2026-11-20T00:00:00Z"), "en", now), "20 Nov")
})

test("the page reads the shared sources in two rounds and never writes: getWaitingWork, never getNotificationCenter (spec §6.3, §5 Performance; R10, R11)", () => {
  const source = page()
  assert.match(source, /getWaitingWork\(user, now\)/)
  assert.match(source, /getWaitingWorkAges\(user, waitingKeysWithCount, waitingWork\.rules, now\)/)
  assert.match(source, /getDashboardOverview\(\{ companyId, now \}\)/)
  assert.match(source, /getDashboardProfile\(user, getApprovalInboxAccess\(user\)\.canAnyApproval\)/)
  assert.doesNotMatch(source, /getNotificationCenter|getApprovalInboxCounts|getMessages|systemLog|prisma\.(?!company\.findMany\b)/)
})

test("the KPIs and the sections follow the profile's order, and each KPI names its filter (spec §6.1, §6.4, §6.5)", () => {
  const source = page()
  const kpis = source.slice(source.indexOf("const kpiCells"), source.indexOf("const kpiItems"))
  assert.equal(kpis.match(/\bfilterNote: /g)?.length, 4)
  for (const value of kpis.matchAll(/\bvalue: ([^\n]+)/g)) assert.match(value[1], /formatCount\(|formatPercent\(/, value[0])
  assert.match(source, /const kpiItems = DASHBOARD_KPI_ORDER\[profile\]/)
  assert.match(source, /<StatStrip items=\{kpiItems\} \/>/)
  assert.match(source, /href: "#dashboard-waiting"/)
  assert.match(source, /attention: Boolean\(waiting\.oldest\?\.overdue\)/)
  for (const count of ["total", "idle180", "custodianAssigned", "responsibilityMissing"]) {
    assert.match(kpis, new RegExp(`buildDashboardRegisterHref\\(locale, "${count}", companyId\\)`), count)
  }
  // The round KPI (R13, R15, R18, R21): the round page's own percent and behind rule, the bar in the meter slot,
  // the round's item list narrowed to the chosen company, and no number for the other rounds.
  assert.match(source, /const auditValue = round && overview\.audit\.expected > 0 \? auditPercent\(overview\.audit\.processed, overview\.audit\.expected\) \/ 100 : null/)
  assert.match(kpis, /meter: round \? <PaceBar /)
  assert.match(kpis, /behind=\{isBehindPace\(overview\.audit\.processed, overview\.audit\.expected, overview\.audit\.pace\)\}/)
  assert.match(kpis, /href: round \? buildAuditRoundItemsHref\(locale, round\.id, \{ companyId: companyId \?\? undefined \}\)/)
  assert.match(kpis, /overview\.audit\.otherOpen > 0 \? "\?view=open" : ""/)
  assert.match(kpis, /t\(overview\.audit\.otherOpen > 0 \? "noDueRound" : "noRound"\)/)
  assert.doesNotMatch(source, /formatCount\(overview\.audit\.otherOpen\)/, "the other rounds are never a number")
  assert.match(source, /DASHBOARD_SECTION_ORDER\[profile\]/)
  assert.match(source, /id=\{`dashboard-\$\{key\}`\}/)
  assert.match(source, /data-dashboard-section=\{key\}/)
  assert.match(source, /<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">/)
  assert.match(source, /index % 2 === 0 \? "lg:col-span-7" : "lg:col-span-5"/)
})

test("the company switcher: links that change the URL from md, a select past four companies, a removable chip on the phone (spec §6.2)", () => {
  const source = page()
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("scopeNavigation"\)\}\n\s+current=\{companyId \?\? "all"\}/)
  assert.match(source, /className="hidden md:block"/)
  assert.match(source, /companies\.length > DASHBOARD_COMPANY_TAB_LIMIT/)
  assert.match(source, /<form role="search" action=\{`\/\$\{locale\}\/dashboard`\}/)
  assert.match(source, /<FilterSelect[\s\S]*?name="companyId"/)
  assert.match(source, /href: buildDashboardHref\(locale, null\), mobileOnly: true/)
})

test("งานที่รอคุณ: the bell's titles, links and order, one row per kind on both widths, the zero line, the work center by permission (spec §6.3)", () => {
  const source = page()
  assert.equal(source.match(/data-waiting-key=\{row\.key\}/g)?.length, 2, "the desktop row and the phone link")
  assert.match(source, /buildWaitingWorkHref\(locale, row\.key\)/)
  assert.match(source, /tNotifications\(row\.key\)/)
  assert.match(source, /title=\{tNotifications\(`\$\{row\.key\}Detail`\)\}/)
  assert.match(source, /t\(`waitingNext\.\$\{row\.key\}`\)/)
  assert.match(source, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("waitingTitle"\)\}>/)
  assert.match(source, /<ContentPanelRows className="md:hidden">/)
  assert.match(source, /min-h-14/)
  assert.match(source, /const zeroLineClassName = waiting\.rows\.length > 0/)
  assert.match(source, /<EmptyNote tone="clear" padded[^>]*>\{t\("waitingZero", /)
  assert.equal(source.match(/description=\{companyId \? t\("allCompanies"\) : undefined\}/g)?.length, 1, "งานที่รอคุณ says ทุกบริษัท when a company is chosen")
})

test("the dashboard's words (spec §6, docs/19_THAI_GLOSSARY.md)", () => {
  const th = JSON.parse(read("messages/th.json")).dashboard, en = JSON.parse(read("messages/en.json")).dashboard
  const thai: Record<string, string> = {
    asOf: "ข้อมูล ณ {time}", allCompanies: "ทุกบริษัท", custodianAssigned: "มีผู้ถือครอง", waitingTitle: "งานที่รอคุณ",
    noDueRound: "ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้", noRound: "ไม่มีรอบตรวจนับที่กำลังตรวจ", idleFoot: "ไม่มีความเคลื่อนไหวเกิน 180 วัน {count}", responsibilityFoot: "ยังไม่มีผู้รับผิดชอบ {count}",
    oldestFoot: "ค้างนานสุด {days} วัน", auditFoot: "ตรวจแล้ว {processed} / {expected} · ควรถึง {pace}", waitingZero: "ไม่มีงานค้าง: {kinds}",
    statusTitle: "ตามสถานะ", statusSegmentTitle: "{status} {count} รายการ · {note}", crossScopeLine: "นอกขอบเขตเจ้าของรหัส {count} รายการ",
  }
  for (const [key, value] of Object.entries(thai)) assert.equal(th[key], value, `th dashboard.${key}`)
  for (const key of Object.keys(thai)) assert.equal(typeof en[key], "string", `en dashboard.${key}`)
  for (const key of WAITING_WORK_KEYS) {
    assert.equal(typeof th.waitingNext[key], "string", `th dashboard.waitingNext.${key}`)
    assert.equal(typeof en.waitingNext[key], "string", `en dashboard.waitingNext.${key}`)
  }
  assert.equal(th.waitingNext.stuckRepairs, "บันทึกซ่อม")
  for (const key of ["inUse", "warrantyExpiring", "monthlyTrendTitle", "actionableTitle", "recentActivity", "pendingDisposals"]) assert.equal(th[key], undefined, `dashboard.${key} is gone`)
})
```

`tests/dashboard-asset-status.test.ts`, whole file (the intent stays: Pending Repair apart from Under Maintenance, In Use is In Use only, exact links, no `contains`):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildDashboardStatusTable } from "../src/lib/dashboard-page.ts"

// The shape of Task 8's overview.statusRows (buildDashboardStatusRows): one row per status, in sortOrder.
const rows = [
  { statusId: "ready", name: "Ready", nameTh: "พร้อมใช้งาน", count: 120 },
  { statusId: "in-use", name: "In Use", nameTh: "ใช้งานอยู่", count: 760 },
  { statusId: "draft", name: "Draft", nameTh: "ร่าง", count: 0 },
  { statusId: "maint id", name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม", count: 80 },
  { statusId: "pending/repair", name: "Pending Repair", nameTh: "รอซ่อม", count: 40 },
]

test("ตามสถานะ: every status with a count, in the overview's order, Pending Repair apart from Under Maintenance, each opening its own status exactly (spec §6.6)", () => {
  assert.deepEqual(buildDashboardStatusTable(rows, "th", null).map((row) => [row.key, row.name, row.count, row.share, row.href, row.tone]), [
    ["ready", "พร้อมใช้งาน", 120, 0.12, "/th/assets?statusId=ready&exact=1", "success"],
    ["in-use", "ใช้งานอยู่", 760, 0.76, "/th/assets?statusId=in-use&exact=1", "success"],
    ["maint id", "อยู่ระหว่างซ่อม", 80, 0.08, "/th/assets?statusId=maint+id&exact=1", "warning"],
    ["pending/repair", "รอซ่อม", 40, 0.04, "/th/assets?statusId=pending%2Frepair&exact=1", "warning"],
  ])
})

test("In Use is In Use only: Ready never leaks in, and a company rides on every link", () => {
  const [inUse] = buildDashboardStatusTable([{ statusId: "in-use", name: "In Use", nameTh: "ใช้งานอยู่", count: 5 }], "en", "c1")
  assert.deepEqual([inUse.name, inUse.count, inUse.share, inUse.href], ["In Use", 5, 1, "/en/assets?companyId=c1&statusId=in-use&exact=1"])
  assert.deepEqual(buildDashboardStatusTable([], "th", null), [])
})

test("the dashboard counts statuses by id from the overview, never by a name that contains", () => {
  const src = readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8").replace(/\r/g, "")
  assert.doesNotMatch(src, /contains: "(In Use|Ready|ใช้งาน|พร้อม)"/)
  assert.match(src, /buildDashboardStatusTable\(overview\.statusRows, locale, companyId\)/)
})
```

`tests/dashboard-cross-scope.test.ts`, whole file:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const dashboardPage = () => readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8").replace(/\r/g, "")
const dashboardMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).dashboard

test("the dashboard shows the cross-scope number once: one line under the status table (spec 2026-10-25 §6.6, addition 5)", () => {
  const source = dashboardPage()
  assert.equal(source.match(/buildDashboardRegisterHref\(locale, "crossScope", companyId\)/g)?.length, 1)
  assert.doesNotMatch(source, /crossScope: "/, "the filter is written once, in dashboardRegisterParams (R21)")
  assert.match(source, /t\("crossScopeLine", \{ count: formatCount\(overview\.crossScopeTotal\) \}\)/)
  assert.doesNotMatch(source, /crossScopeActionCard|crossScopeCards|crossScopePreviewRows|buildDashboardAssetCrossScopeSummary|getAssetCrossScopeFlagLabels|custodian_company|custodian_branch|location_branch/)
})

test("the cross-scope words: one line in Thai and English, the old panel's keys gone", () => {
  assert.equal(dashboardMessages("th").crossScopeLine, "นอกขอบเขตเจ้าของรหัส {count} รายการ")
  assert.match(dashboardMessages("en").crossScopeLine, /\{count\}/)
  const gone = ["crossScopeAssets", "crossScopeActionTitle", "crossScopeActionDetail", "crossScopePanelTitle", "crossScopePanelSubtitle", "crossScopeAll", "crossScopeCustodianCompany", "crossScopeCustodianBranch", "crossScopeLocationBranch", "crossScopePreviewTitle", "crossScopePreviewEmpty", "crossScopeViewAll"]
  for (const locale of ["th", "en"] as const) {
    const messages = dashboardMessages(locale)
    assert.deepEqual(gone.filter((key) => key in messages), [], `${locale}: the four-cell panel's keys`)
  }
})
```

Rewrite the other pins:

- `tests/list-pages-ui.test.ts:834-846` (comment and test), the new test named `"the dashboard: PageHeader with the as-of line, blocks 24px apart, numbers through the formatters (spec 2026-10-25 §6.2)"`:
  ```ts
  const source = read(`${D}dashboard/page.tsx`)
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader title=\{t\("title"\)\} meta=\{t\("asOf", \{ time: formatAsOf\(now, locale\) \}\)\} \/>\n/)
  assert.doesNotMatch(source, /<h1\b|toLocaleString\(|Intl\.NumberFormat|className="mb-[68] /)
  assert.match(source, /if \(user && shouldUseEmployeeHome\(user\)\) \{\n\s+redirect\(`\/\$\{locale\}\/my-assets`\)/)
  ```
  The `formatCount(` count of 12, the `formatDateTime(log.createdAt)` pin and the `auditRoundOperationalWhere` pin go: the counts moved to the shared sources (the round rule is pinned on `src/lib/dashboard-overview.ts` in `tests/audit-round-cancellation.test.ts`, below), and `tests/dashboard-page.test.ts` pins that every KPI value goes through a formatter.
- `tests/reports-dashboard-sweep-ui.test.ts:77-89`, the new test named `"the dashboard: one KPI StatStrip at the top level, divided ContentPanels on a 7 + 5 grid, the data bar and no tone fills (spec 2026-10-25 §6.1, §6.6; 2B R-d)"`:
  ```ts
  const source = read(`${D}dashboard/page.tsx`)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 1)
  assert.match(source, /<StatStrip items=\{kpiItems\} \/>/)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 2, "งานที่รอคุณ and ตามสถานะ")
  assert.equal(source.match(/<ContentPanel\n?\s*divided\n?\s*flush\b/g)?.length, 2)
  // Each segment links to its status's list with the row's own exact href and names it on hover (spec §2 decision 3, R17).
  assert.match(source, /<DistributionBar segments=\{statusRows\.map\(\(row\) => \(\{ key: row\.key, count: row\.count, tone: row\.tone, href: row\.href, title: t\("statusSegmentTitle", \{ status: row\.name, count: formatCount\(row\.count\), note: withCompany\(t\("noteStatus", \{ status: row\.name \}\)\) \}\) \}\)\)\} \/>/)
  assert.match(source, /<Link href=\{row\.href\} title=\{withCompany\(t\("noteStatus", \{ status: row\.name \}\)\)\}/, "the table row opens the same list, for everyone")
  assert.doesNotMatch(source, /<DistributionBar label=/, "the bar is aria-hidden: no name")
  assert.match(source, /className=\{cn\("size-2\.5 shrink-0 rounded-xs", statusFillVariants\(\{ tone: row\.tone \}\)\)\}/, "the row's swatch is its segment's fill (Task 7, R20)")
  assert.doesNotMatch(source, /splitStatRows|formatTrendDelta|StatusBadge|statusMarkerVariants|DashboardCrossScopePreview|style=\{/)
  assert.doesNotMatch(source, /bg-(?:primary|success|warning|danger|info)-soft|rounded-full|rounded-lg border|text-3xl|text-2xl|hover:underline|dark:/)
  ```
- `tests/asset-register-ux.test.ts:80-96`: `dashboard` reads `src/lib/dashboard-page.ts` (where the register links are built) instead of the page; the `dashboardCards` read (its file is deleted) and the two dashboard pins (`dataQuality: "warranty"`, `sort: "createdAt"`) go, so the loop runs over `[dashboard, workCenter]`. Add for the page itself (`const page = read("src/app/[locale]/(dashboard)/dashboard/page.tsx")`): `assert.doesNotMatch(page, /`\/\$\{locale\}\/assets(\?|`)|buildExactAssetRegisterHref\(/)` and `assert.match(page, /buildDashboardRegisterHref\(locale, "total", companyId\)/)`. The `notifications` lines stay as Tasks 1 and 3D left them (Task 1 points `notifications` at `src/lib/waiting-work-rules.ts`).
- `tests/audit-round-cancellation.test.ts:124-141`: replace `"src/app/[locale]/(dashboard)/dashboard/page.tsx"` in `files` with `"src/lib/dashboard-overview.ts"`: the page counts no round of its own, and Task 8's overview reads the rounds through `auditRoundOperationalWhere`. Task 1 already put `src/lib/waiting-work-rules.ts` in that list.
- `tests/performance-route-instrumentation.test.ts:7-16`: the dashboard labels become `["dashboard.initial-data", "dashboard.overview", "dashboard.waiting-work", "dashboard.waiting-ages"]`.
- `tests/page-loading-skeleton.test.ts:51`: `assert.match(source, /<PageHeaderSkeleton actions=\{false\} \/>/, "the dashboard: the title and its as-of line")`.
- `tests/phase2d-final-ui.test.ts:46-60`, the new test named `"the dashboard skeleton has the page's shape: the title and its as-of line, the company links from md, four KPIs with feet, then the sections at 7 + 5 (group 1 dashboard task 9)"`:
  ```ts
  const source = read(`${C}ui/page-skeleton.tsx`)
  const dashboard = source.slice(source.indexOf("export function DashboardPageSkeleton()"), source.indexOf("export function AssetRegisterPageSkeleton()"))
  const strips = [...dashboard.matchAll(/<MetricGridSkeleton count=\{(\d+)\}( foot)? \/>/g)].map((match) => `${match[1]}${match[2] ?? ""}`)
  assert.deepEqual(strips, ["4 foot"])
  assert.match(dashboard, /<PageHeaderSkeleton actions=\{false\} \/>/)
  assert.match(dashboard, /<div className="hidden md:block">\s*<TabNavSkeleton count=\{4\} \/>\s*<\/div>/)
  assert.match(dashboard, /<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">/)
  assert.deepEqual([...dashboard.matchAll(/<DividedPanelSkeleton rows=\{(\d+)\} className="([^"]+)" \/>/g)].map((match) => `${match[1]} ${match[2]}`), ["4 lg:col-span-7", "5 lg:col-span-5"])
  assert.match(source, /function DividedPanelSkeleton\(\{ rows, className \}: \{ rows: number; className\?: string \}\)/)
  assert.match(source, /<div className="flex min-h-14 items-center border-b border-border px-4 md:px-5">/, "the divided ContentPanel head")
  assert.match(source, /\{foot \? <SkeletonBlock className="h-4 w-32 max-w-full" \/> : null\}/, "a StatStrip foot line")
  assert.doesNotMatch(source, /function PanelSkeleton\b|<PanelSkeleton\b/, "the undivided panel skeleton went with the old dashboard")
  ```
- `tests/disposal-sweep-ui.test.ts:195-201`, as Task 4 left it (R12: the loop over `["dashboard", "notifications"]`, then a `for (const m of [th, en])` loop asserting `m.workCenter[key]` is undefined for `pendingDisposals` and `approvedDisposals`): the first loop runs over `["notifications"]` only, and Task 4's second loop gains, beside its `workCenter` line, `assert.equal(m.dashboard[key], undefined, \`dashboard.${key}: the dashboard reads notifications.${key} (group 1 dashboard task 9)\`)`.
- `tests/display-format.test.ts:44-50`: the formatter count becomes 4 (count, money, two percent); add a test `"formatPercent: a share in Thai digits, whole or with one decimal"` asserting `formatPercent(0.788) === "79%"`, `formatPercent(0.788, 1) === "78.8%"`, `formatPercent(0.006, 1) === "0.6%"`, `formatPercent(1) === "100%"`, `formatPercent(null) === null` and `formatPercent(undefined) === null`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/dashboard-page.test.ts tests/dashboard-asset-status.test.ts tests/dashboard-cross-scope.test.ts tests/display-format.test.ts tests/list-pages-ui.test.ts tests/reports-dashboard-sweep-ui.test.ts tests/phase2d-final-ui.test.ts tests/page-loading-skeleton.test.ts tests/performance-route-instrumentation.test.ts tests/asset-register-ux.test.ts tests/audit-round-cancellation.test.ts tests/disposal-sweep-ui.test.ts`
Expected: FAIL. `../src/lib/dashboard-page.ts` is not found, `formatPercent` is not exported, the dashboard's old messages still exist, and the page and skeleton pins do not match. (`tests/audit-round-cancellation.test.ts` already passes: Task 8's `dashboard-overview.ts` holds `auditRoundOperationalWhere`.)

- [ ] **Step 4: Implement the helpers**

`src/lib/display-format.ts`: two more fixed formatters, `new Intl.NumberFormat("th-TH", { style: "percent", maximumFractionDigits: 0 })` and the same with `maximumFractionDigits: 1`, both with `signDisplay: "negative"`; `formatPercent(value, fractionDigits = 0)` with the two overloads of **Produces**, returning `null` for `null`/`undefined`. No import.

`src/lib/dashboard-page.ts` (relative imports only: `./asset-register-view-memory.ts`, `./dashboard-overview-rules.ts` (`dashboardRegisterParams`, and `import type` of `DashboardOverview` and `DashboardRegisterCount`), `./design-system.ts`, `./display-format.ts`, and `import type` from `./waiting-work-rules.ts`; Task 10 adds a value import of `bangkokDayDiff` from it, which R3 allows):
- `normalizeDashboardCompanyId`: the first value of an array, trimmed; returns it when an entry of `companies` has that id, else `null` (R23: an unknown id means all companies, never zeros).
- `buildDashboardHref`: `/${locale}/dashboard`, plus `?${new URLSearchParams({ companyId })}` when a company is given.
- `buildDashboardRegisterHref`: `buildExactAssetRegisterHref(locale, dashboardRegisterParams(count, companyId))`. The page writes no register filter of its own (R21).
- `buildDashboardWaiting`:
  - `rows`: `visibleKeys` with `counts[key] > 0`, in `visibleKeys` order (which is `WAITING_WORK_KEYS` order, Task 1), each with `age: ages[key] ?? null`.
  - `zeroKeys`: `visibleKeys` with `counts[key] === 0`.
  - `total`: the rows' sum.
  - `oldest`: over the rows' ages, the candidate days are `days` of an `"age"` and `-days` of a `"due"` with `days < 0`; `"expires"` never counts. `days` = the largest candidate; `overdue` = any row age with `overdue: true`. `null` when no candidate is above 0.
- `describeWaitingAge`, in this order:
  - `"age"`: `days > 0` → `waitingAgeDays` `{ days: formatCount(days) }`; else `waitingAgeUnderDay` `{}`.
  - `"due"`: `days < 0` → `waitingOverdue` `{ days: formatCount(-days) }`; `0` → `waitingDueToday`; else `waitingDueIn` `{ days: formatCount(days) }`.
  - `"expires"`: `waitingExpires` `{ date: formatDayMonth(age.date, locale, now) }`.
  - `overdue` is the age's own flag (`false` for `"expires"`).
- `formatDayMonth`: `Intl.DateTimeFormat` in `Asia/Bangkok`, `th-TH-u-ca-buddhist` for `th` and `en-GB` otherwise, `day: "numeric", month: "short"`, plus `year: "numeric"` when the Bangkok year of `date` differs from that of `now` (compare the `year` part of `formatToParts`).
- `buildDashboardStatusTable`: rows with `count > 0` in the given order (Task 8 already drops zeros and sorts by `sortOrder`); `key` is `statusId`; `name` is `nameTh` for `th`, else `name`; `share` = `count / total` of the kept rows (`0` when the total is 0); `href` = `buildDashboardRegisterHref(locale, { statusId }, companyId)`; `tone` = `getAssetStateTone(name)` (the English name, as the register's badge does; a `UiTone` is a `StatusTone`, so it feeds `DistributionBar` and `statusFillVariants` as it is).

- [ ] **Step 5: Implement the page**

Read `node_modules/next/dist/docs/` for the page props of this Next version first (`params` and `searchParams` are Promises). Props: `{ params: Promise<{ locale: string }>; searchParams: Promise<{ companyId?: string | string[] }> }`.

1. **Who and when.** `const now = new Date()`. `getSessionUser()`; the employee redirect exactly as today (`if (user && shouldUseEmployeeHome(user)) {` … `redirect(\`/${locale}/my-assets\`)`). Keep `const canOpenWorkCenter = user ? hasPermission(user, "dashboard", "view") : false` as it is. `canViewAssets` = `asset:view`, `canViewAudit` = `audit:view` (same form). `profile = user ? getDashboardProfile(user, getApprovalInboxAccess(user).canAnyApproval) : "overview"`.
2. **Two rounds of reads, no query per row:**
   - Round 1 under `withPerformanceTiming("dashboard.initial-data", …)`: `Promise.all` of `prisma.company.findMany({ where: { isActive: true }, select: { id: true, code: true, nameTh: true }, orderBy: { code: "asc" } })` (the register's own list, `assets/page.tsx:96-100`), translations (`getTranslations("dashboard")`, `getTranslations("notifications")`), and `user ? withPerformanceTiming("dashboard.waiting-work", () => getWaitingWork(user, now), meta) : null`.
   - Then `companyId = normalizeDashboardCompanyId((await searchParams).companyId, companies)`, `companyName` from the list, and `waitingKeysWithCount = waitingWork ? waitingWork.visibleKeys.filter((key) => waitingWork.counts[key] > 0) : []`.
   - Round 2, `Promise.all`: `withPerformanceTiming("dashboard.overview", () => getDashboardOverview({ companyId, now }), meta)` and `withPerformanceTiming("dashboard.waiting-ages", () => user && waitingWork && waitingKeysWithCount.length > 0 ? getWaitingWorkAges(user, waitingKeysWithCount, waitingWork.rules, now) : Promise.resolve({}), meta)`. The page never calls `getNotificationCenter`, so nothing it renders writes.
   - `waiting = buildDashboardWaiting(waitingWork ?? { counts: {} as WaitingWorkCounts, visibleKeys: [] }, ages)` (with no visible key nothing reads a count); `showWaiting = (waitingWork?.visibleKeys.length ?? 0) > 0`; `statusRows = buildDashboardStatusTable(overview.statusRows, locale, companyId)`; `round = overview.audit.round`; `const auditValue = round && overview.audit.expected > 0 ? auditPercent(overview.audit.processed, overview.audit.expected) / 100 : null` (pinned on one line: the round page's own whole percent, `auditPercent`, R21).
3. **Header:** the root `<div className="space-y-6">`, then `<PageHeader title={t("title")} meta={t("asOf", { time: formatAsOf(now, locale) })} />` on one line (pinned).
4. **Company switcher** (right under the header, in its own row, as the work center's view switch):
   - `companies.length > DASHBOARD_COMPANY_TAB_LIMIT`: `<form role="search" action={\`/${locale}/dashboard\`} className="hidden items-end gap-2 md:flex">` with `<FilterSelect label={t("scopeNavigation")} hideLabel fieldSize="md" name="companyId" defaultValue={companyId ?? ""} allLabel={t("allCompanies")} options={…company.nameTh…} className="w-64" />` and `<FilterFormActions submitLabel={t("showScope")} />`. It works before hydration (a GET).
   - Otherwise a `TabNav` written over three lines as pinned (`aria-label={t("scopeNavigation")}`, `current={companyId ?? "all"}`), items `{ key: "all", label: t("allCompanies"), href: buildDashboardHref(locale, null) }` then one per company (`key` = id, `label` = `nameTh`, `href` = `buildDashboardHref(locale, company.id)`), `className="hidden md:block"`. No `aria-pressed`, no hand-written `aria-current`.
   - When `companyName`: `<FilterChipList label={t("scopeNavigation")} removeLabel={t("removeFilter")} chips={[{ key: "company", label: t("companyChip", { name: companyName }), href: buildDashboardHref(locale, null), mobileOnly: true }]} />` (the chip removes the company on the phone; it is hidden from md).
5. **KPIs:** `const kpiCells: Record<DashboardKpiKey, StatStripItem | null>`, then `const kpiItems = DASHBOARD_KPI_ORDER[profile].map((key) => kpiCells[key]).filter(…)` and `<StatStrip items={kpiItems} />` at the top level, never in a panel. `withCompany(note)` = `companyName ? t("noteCompany", { company: companyName, note }) : note`. A foot link is `cn(linkVariants({ size: "inherit" }), "relative z-10")`, so it sits above the cell's stretched link; its `footTitle` is the same text.
   - `total` (`canViewAssets`, R25): `label: t("totalAssets")`, `value: formatCount(overview.total)`, `href: buildDashboardRegisterHref(locale, "total", companyId)`, `filterNote: withCompany(t("noteTotal"))`, `foot`: a link to `buildDashboardRegisterHref(locale, "idle180", companyId)` reading `t("idleFoot", { count: formatCount(overview.idle180) })`.
   - `custodian` (`canViewAssets`): `label: t("custodianAssigned")`, `value: formatCount(overview.custodianAssigned)`, `unit: overview.custodianShare === null ? undefined : formatPercent(overview.custodianShare)`, `href: buildDashboardRegisterHref(locale, "custodianAssigned", companyId)`, `filterNote: withCompany(t("noteCustodian"))`, `foot`: a link to `buildDashboardRegisterHref(locale, "responsibilityMissing", companyId)` reading `t("responsibilityFoot", { count: formatCount(overview.responsibilityMissing) })`.
   - `waiting` (`showWaiting`): `label: t("waitingTitle")`, `value: formatCount(waiting.total)`, `unit: t("unitItems")`, `href: "#dashboard-waiting"` (R24), `filterNote: t("noteWaiting")` (no company: the source has none), `foot: waiting.oldest ? t("oldestFoot", { days: formatCount(waiting.oldest.days) }) : undefined`, `attention: Boolean(waiting.oldest?.overdue)`. No fill: the attention foot carries it.
   - `audit` (`canViewAudit`, R25), one item, built from Task 8's own rules (R21) so the KPI shows what the round page shows:
     - `label: round ? t("auditRoundKpi", { code: round.code }) : t("auditRoundNone")`, `value: auditValue === null ? null : formatPercent(auditValue)`, `filterNote: withCompany(t("noteAudit"))`.
     - `href: round ? buildAuditRoundItemsHref(locale, round.id, { companyId: companyId ?? undefined }) : \`/${locale}/audit/rounds${overview.audit.otherOpen > 0 ? "?view=open" : ""}\``. With a company chosen, the round's item list opens narrowed to that company (R13), and its count is the foot's `expected`.
     - `meter: round ? <PaceBar value={auditValue ?? 0} pace={overview.audit.pace} label={t("auditBarLabel", { percent: formatPercent(auditValue ?? 0), pace: formatPercent(overview.audit.pace ?? 0) })} behind={isBehindPace(overview.audit.processed, overview.audit.expected, overview.audit.pace)} /> : undefined` (R18: the bar sits full width under the value, inside the value `dd`, never in the clamped foot).
     - `foot: round ? t("auditFoot", { processed: formatCount(overview.audit.processed), expected: formatCount(overview.audit.expected), pace: formatPercent(overview.audit.pace ?? 0) }) : t(overview.audit.otherOpen > 0 ? "noDueRound" : "noRound")` (R15: no round is due now while others are open, or there is no round at all; `otherOpen` is never shown as a number).
6. **Sections:** `const sections: Partial<Record<DashboardSectionKey, React.ReactNode>>` with `waiting` (when `showWaiting`) and `status` (when `canViewAssets`); Task 10 adds `branches` and `recent`. Render `<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">` and, for `DASHBOARD_SECTION_ORDER[profile].filter((key) => sections[key])`, `<div key={key} id={\`dashboard-${key}\`} data-dashboard-section={key} className={cn("min-w-0", index % 2 === 0 ? "lg:col-span-7" : "lg:col-span-5")}>`. The DOM order is the reading order on both widths.
7. **งานที่รอคุณ:** `<ContentPanel divided flush title={t("waitingTitle")} description={companyId ? t("allCompanies") : undefined} actions={…}>`. `actions` is today's work-center link, character for character (`canOpenWorkCenter ? (` then `<Link href={\`/${locale}/work-center?panel=overview\`} …>{t("openWorkCenter")}<ArrowRight … /></Link>`): `tests/permission-aware-navigation.test.ts:115-121` counts exactly one `/work-center` in the file, so no comment may name it.
   - Desktop, when there are rows: `<DataTable framed={false} className="hidden md:block" caption={t("waitingTitle")}>`, heads `waitingColumnKind` | `columnCount` (right) | `waitingColumnAge` | `waitingColumnNext` (`hideLabel`). Each `<DataTableRow key={row.key} data-waiting-key={row.key}>`: the title `tNotifications(row.key)`; `<DataTableCell numeric>` holding `<Link href={buildWaitingWorkHref(locale, row.key)} title={tNotifications(\`${row.key}Detail\`)}>` with `formatCount(row.count)` (the bell's sentence is the filter note); the age from `describeWaitingAge`, in `text-warning` with `toneIcons.warning` (`aria-hidden`, `size-3.5`) when `overdue`, else muted, empty when `row.age` is null; the next step `<Link href={same href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>{t(\`waitingNext.${row.key}\`)}<span className="sr-only"> {tNotifications(row.key)}</span></Link>`.
   - Phone: `<ContentPanelRows className="md:hidden">`, each `<li>` holding one `<Link … data-waiting-key={row.key}>` that fills the row (`-mx-4 -my-3 flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none`): `<span className="num min-w-12 text-xl font-semibold text-foreground">` count, the title, and under it the age (`t("waitingAgeRow", { age })` for an `"age"`, the plain text otherwise; warning ink and icon when overdue). The count is the only `.num` in the row.
   - The zero line, when `waiting.zeroKeys` is not empty. Compute its class before the JSX, on its own line (pinned): `const zeroLineClassName = waiting.rows.length > 0 ? "border-t border-border-soft" : undefined`. Then write `<EmptyNote tone="clear" padded className={zeroLineClassName}>{t("waitingZero", { kinds: waiting.zeroKeys.map((key) => tNotifications(key)).join(" · ") })}</EmptyNote>`. The condition stays out of the tag because the pin's `[^>]*` stops at the first `>`, and `waiting.rows.length > 0` holds one.
8. **ตามสถานะ** (`canViewAssets`, R25): `<ContentPanel divided flush title={t("statusTitle")}>` (no total in the header). With rows: `<div className="px-4 pt-4 md:px-5"><DistributionBar segments={statusRows.map((row) => ({ key: row.key, count: row.count, tone: row.tone, href: row.href, title: t("statusSegmentTitle", { status: row.name, count: formatCount(row.count), note: withCompany(t("noteStatus", { status: row.name })) }) }))} /></div>`, the `DistributionBar` element on one line as pinned. Each segment links to its status's list (spec §2 decision 3, R17): `href` is the row's exact register link (`row.href`, built by `buildDashboardRegisterHref` from `dashboardRegisterParams`, so the segment, the row and the count share one filter), and `title` names the status, its count and the status filter note with the company when one is chosen, e.g. "ใช้งานอยู่ 760 รายการ · บริษัท SNI · สถานะ = ใช้งานอยู่". The bar is `aria-hidden` and its links are out of the tab order (Task 7), so the table below is what keyboard and screen-reader users read. Then `<DataTable framed={false} caption={t("statusTitle")}>`, heads `statusColumn` | `columnCount` (right) | `shareColumn` (right, `className="hidden md:table-cell"`). Rows: a `<Link href={row.href} title={withCompany(t("noteStatus", { status: row.name }))} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-2 md:min-h-0")}>` holding the swatch `<span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-xs", statusFillVariants({ tone: row.tone }))} />` (the segment's own fill, R20) and the name: each row's name links to the same list as its segment, for everyone (spec decision 3, R17); `formatCount(row.count)`; `formatPercent(row.share, 1)` (`hidden md:table-cell`). Without rows: `<EmptyNote padded>{t("statusEmpty")}</EmptyNote>`. Under the table, once on the page: `<p className="border-t border-border-soft px-4 py-3 md:px-5">` with `<Link href={buildDashboardRegisterHref(locale, "crossScope", companyId)} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>{t("crossScopeLine", { count: formatCount(overview.crossScopeTotal) })}</Link>`.
9. **Gone:** the seven-cell KPI rows and `splitStatRows`, the actions panel, the cross-scope KPI, action card, panel and preview (`DashboardCrossScopePreview`, `buildDashboardCrossScopeHref`), the monthly trends (`getMonthRange`, `formatTrendDelta`), the warranty KPI, the old system-log activity panel (`formatDashboardLog`, `ActivityLogContent`; Task 10 brings "ล่าสุด", R29), and the imports only they used. Delete `src/lib/dashboard-action-cards.ts` and `tests/dashboard-action-cards.test.ts`, and `buildDashboardAssetCrossScopeSummary` with `DashboardAssetCrossScopeCountsRow` as in **Files**.

- [ ] **Step 6: Reshape the skeleton**

In `src/components/ui/page-skeleton.tsx`, `PanelSkeleton` (:127-137) becomes:

```tsx
// ContentPanel divided flush: the 56px head with its line, then rows split by soft lines (the dashboard's sections).
function DividedPanelSkeleton({ rows, className }: { rows: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface", className)}>
      <div className="flex min-h-14 items-center border-b border-border px-4 md:px-5">
        <SkeletonBlock className="h-5 w-40" />
      </div>
      <div className="divide-y divide-border-soft">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="px-4 py-3 md:px-5">
            <SkeletonBlock className="h-5" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

`DashboardPageSkeleton` (:149-191) becomes, with its comment rewritten to "the title and its as-of line, the company links from md, the four KPIs with their feet, then the sections on 12 columns from lg (7 + 5)":

```tsx
<div aria-busy="true" className="flex w-full flex-col gap-6">
  <PageHeaderSkeleton actions={false} />
  <div className="hidden md:block">
    <TabNavSkeleton count={4} />
  </div>
  <MetricGridSkeleton count={4} foot />
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
    <DividedPanelSkeleton rows={4} className="lg:col-span-7" />
    <DividedPanelSkeleton rows={5} className="lg:col-span-5" />
  </div>
</div>
```

DESIGN.md: the two phrase edits named in **Files**.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: every unit test passes (the guards read all of `src`: N1 no raw colour, R3 no text under 12px, LN1 no hand-written `aria-current`, LS1/LK1/LN2 no local tile or label names, LV1 no bare `toLocaleString`, the filter-form guard sees `role="search"`), tsc is clean, lint has no errors.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/dashboard/page.tsx" src/lib/dashboard-page.ts src/lib/display-format.ts src/lib/asset-cross-scope.ts src/components/ui/page-skeleton.tsx messages/th.json messages/en.json DESIGN.md tests/dashboard-page.test.ts tests/dashboard-asset-status.test.ts tests/dashboard-cross-scope.test.ts tests/list-pages-ui.test.ts tests/reports-dashboard-sweep-ui.test.ts tests/asset-register-ux.test.ts tests/audit-round-cancellation.test.ts tests/performance-route-instrumentation.test.ts tests/page-loading-skeleton.test.ts tests/phase2d-final-ui.test.ts tests/disposal-sweep-ui.test.ts tests/display-format.test.ts
git rm src/lib/dashboard-action-cards.ts tests/dashboard-action-cards.test.ts
git commit -m "feat(dashboard): canvas B header, company links, four KPIs with filter notes, งานที่รอคุณ from the shared source and ตามสถานะ with its data bar (group 1 dashboard task 9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9 (the controller, after Task 11's E2E run; not the implementer): look at the page**

R32. With the build of the E2E run still in place, start `next start` on a free port with `AUTH_URL`/`NEXTAUTH_URL` set to it and `SESSION_IDLE_SECONDS=10800` (as the E2E app runs, so the run's session still opens), and sign in through the run's IT head state (`authStateFile(<runId>, "itHead")`, `e2e/support/paths.ts:34`). Screenshot `/th/dashboard`, `/th/dashboard?companyId=<the run's company>` and `/en/dashboard` at 1440×900 and 390×844, in light and dark (the `theme` cookie). Compare the header, the company links and chip, the KPI strip (the filter note on hover, the round's bar in its cell), งานที่รอคุณ and ตามสถานะ (a bar segment's title on hover) with `B-Dashboard.dc.html` and `B-Dashboard-Phone.dc.html`. Also look at: the filter note under the rightmost KPI cell at 1024×768 and under a top-row cell at 390 (it is placed by CSS `anchor()`, which no unit test sees); the round bar's 4px pace-mark overhang against the foot row; and the bars and the note in Windows high contrast (`forcedColors: "active"` emulation: every fill turns to the system colour and the 2px gaps must still part the segments). What differs goes to the implementer as one fix round (`fix(dashboard): … (group 1 dashboard task 9 fix 1)`), reviewed like any other. Delete the screenshots after the report; never commit them.

---

### Task 10: The dashboard page — ตรวจนับแยกสาขา and ล่าสุด

**Files:**
- Modify: `src/app/[locale]/(dashboard)/dashboard/page.tsx` (the `branches` and `recent` sections, the round 1 read of the recent events)
- Modify: `src/lib/dashboard-page.ts` (`DASHBOARD_BRANCH_ROW_LIMIT`, `pickDashboardBranchRows`, `formatRecentTime`; a value import of `bangkokDayDiff` from `./waiting-work-rules.ts`, client-safe under R3)
- Modify: `src/components/ui/page-skeleton.tsx` (`DashboardPageSkeleton`: four panels)
- Modify: `messages/th.json`, `messages/en.json`
- Test:
  - `tests/dashboard-page.test.ts` (new tests appended; the Task 9 line that counts the "ทุกบริษัท" description once is deleted)
  - `tests/reports-dashboard-sweep-ui.test.ts` (the Task 9 test: 2 → 4 ContentPanels)
  - `tests/performance-route-instrumentation.test.ts` (adds `dashboard.recent-activity`)
  - `tests/phase2d-final-ui.test.ts` (the Task 9 test: four panels)

**Interfaces:**
- Consumes:
  - Task 1: `bangkokDayDiff(from: Date, to: Date): number` (whole Bangkok days, counted from `startOfBangkokDay`, R1).
  - Task 5: `buildAuditRoundItemsHref(locale: string, roundId: string, filters: { branchId?: string; companyId?: string }): string` (R13), in `src/lib/audit-round-result-filters.ts`.
  - Task 7: `PaceBar({ value, pace, label, behind })`.
  - Task 8 (R21): `overview.audit` (`round`, `otherOpen` = the operational rounds other than the current one, company-blind; `pace`; `branches`, already sorted by `sortBranchesByGap`, each `{ branchId, name, processed, expected, behind }` with `name` already `"<company code> / <branch name>"` under ทุกบริษัท and the branch name alone with a company chosen, R16; `behind` from `isBehindPace`), `auditPercent(processed, expected)`, `getRecentAssetEvents(take)`, `type RecentAssetEvent = { id; movementType; performedAt; asset: { id; assetTag; name }; document: AssetMovementDocument | null }`, `assetMovementLabelKey(movementType)` (a full key, `asset.movementTypes.<type>`), `buildAssetMovementDocumentHref(locale, document)`, `ASSET_MOVEMENT_DOCUMENT_PERMISSION`.
  - Task 9: the `sections` map, `formatDayMonth`, `formatPercent`, `user`, `canViewAssets`, `canViewAudit`, `companyId`, `now`, `round`, and the messages `noDueRound` / `noRound`.
- Produces, in `src/lib/dashboard-page.ts`:
  - `DASHBOARD_BRANCH_ROW_LIMIT = { desktop: 8, phone: 3 } as const`
  - `pickDashboardBranchRows<T>(branches: readonly T[]): { rows: T[]; moreOnPhone: boolean; moreOnDesktop: boolean }`
  - `formatRecentTime(at: Date, now: Date, locale: string): { kind: "time"; text: string } | { kind: "yesterday" } | { kind: "date"; text: string }`
  - Markup for Task 11: the branch rows' `PaceBar` label `t("branchBarLabel", …)`, the text "ช้ากว่าที่ควร".

- [ ] **Step 1: Add the messages**

In `dashboard`:

| Key | th | en |
|---|---|---|
| `branchesTitle` | ตรวจนับแยกสาขา | Audit by branch |
| `branchesRound` | รอบ {code} | Round {code} |
| `legendCounted` | ตรวจแล้ว | Counted |
| `legendPace` | ควรถึงวันนี้ | Expected by today |
| `branchBehind` | ช้ากว่าที่ควร | Behind |
| `branchNumbers` | {percent} · {processed}/{expected} | {percent} · {processed}/{expected} |
| `branchBarLabel` | {branch} ตรวจแล้ว {percent} ควรถึงวันนี้ {pace} | {branch}: counted {percent}, expected by today {pace} |
| `allBranches` | ดูทุกสาขา | All branches |
| `allOpenRounds` | ดูรอบที่กำลังตรวจทั้งหมด | All rounds in progress |
| `recentTitle` | ล่าสุด | Recent |
| `recentYesterday` | เมื่อวาน | Yesterday |
| `recentEmpty` | ยังไม่มีความเคลื่อนไหวของทรัพย์สิน | No asset activity yet |

`allOpenRounds` names the rounds list's tab "กำลังตรวจ" (`auditRound.viewOpen`, `?view=open`) and carries no number (R15); it passes the glossary and every rule of `tests/thai-glossary.test.ts`. The no-round lines are Task 9's `noDueRound` and `noRound`. No `otherOpenRounds` or `viewRounds` key is added.

- [ ] **Step 2: Write the failing tests**

Append to `tests/dashboard-page.test.ts` (import `DASHBOARD_BRANCH_ROW_LIMIT`, `pickDashboardBranchRows`, `formatRecentTime` too):

```ts
test("ตรวจนับแยกสาขา: eight rows on the desktop, three on the phone, and ดูทุกสาขา while more are left (spec §6.7)", () => {
  const branches = (count: number) => Array.from({ length: count }, (_, index) => ({ branchId: `b${index}`, name: `สาขา ${index}`, processed: 0, expected: 10, behind: true }))
  assert.deepEqual(DASHBOARD_BRANCH_ROW_LIMIT, { desktop: 8, phone: 3 })
  assert.deepEqual(pickDashboardBranchRows(branches(2)), { rows: branches(2), moreOnPhone: false, moreOnDesktop: false })
  assert.deepEqual(pickDashboardBranchRows(branches(5)), { rows: branches(5), moreOnPhone: true, moreOnDesktop: false })
  const nine = pickDashboardBranchRows(branches(9))
  assert.deepEqual([nine.rows.length, nine.moreOnPhone, nine.moreOnDesktop], [8, true, true])
})

test("ล่าสุด: the time today, เมื่อวาน, else the date, in Bangkok days (spec §6.8; bangkokDayDiff, R1)", () => {
  const now = new Date("2026-10-25T15:00:00Z") // 22:00 in Bangkok
  assert.deepEqual(formatRecentTime(new Date("2026-10-25T14:40:00Z"), now, "th"), { kind: "time", text: "21:40" })
  assert.deepEqual(formatRecentTime(new Date("2026-10-24T20:00:00Z"), now, "th"), { kind: "time", text: "03:00" }, "03:00 on the 25th in Bangkok")
  assert.deepEqual(formatRecentTime(new Date("2026-10-24T16:59:00Z"), now, "en"), { kind: "yesterday" }, "23:59 on the 24th in Bangkok")
  assert.deepEqual(formatRecentTime(new Date("2026-10-24T10:00:00Z"), now, "th"), { kind: "yesterday" })
  assert.deepEqual(formatRecentTime(new Date("2026-10-23T10:00:00Z"), now, "th"), { kind: "date", text: "23 ต.ค." })
  assert.deepEqual(formatRecentTime(new Date("2025-12-30T10:00:00Z"), now, "en"), { kind: "date", text: "30 Dec 2025" })
})

test("ตรวจนับแยกสาขา: a pace bar per branch, the legend, the behind text with its icon, the branch links narrowed to the chosen company, the rounds in progress as a link without a number, and the no-round state (spec §6.7; R13, R15, R16)", () => {
  const source = page()
  assert.match(source, /pickDashboardBranchRows\(overview\.audit\.branches\)/)
  assert.match(source, /buildAuditRoundItemsHref\(locale, round\.id, \{ branchId: branch\.branchId, companyId: companyId \?\? undefined \}\)/)
  assert.match(source, /const branchValue = auditPercent\(branch\.processed, branch\.expected\) \/ 100/)
  assert.match(source, /pace=\{overview\.audit\.pace\}/)
  assert.match(source, /behind=\{branch\.behind\}/)
  assert.match(source, /t\("branchBarLabel", \{ branch: branch\.name, /, "the overview names the branch (company code / branch under ทุกบริษัท)")
  assert.match(source, /\{t\("legendPace"\)\}/)
  assert.match(source, /\{t\("branchBehind"\)\}/)
  assert.match(source, /toneIcons\.warning/)
  assert.match(source, /index >= DASHBOARD_BRANCH_ROW_LIMIT\.phone && "max-md:hidden"/)
  assert.match(source, /overview\.audit\.otherOpen > 0 \? \(\s*<Link href=\{`\/\$\{locale\}\/audit\/rounds\?view=open`\}/)
  assert.match(source, /\{t\("allOpenRounds"\)\}/)
  assert.doesNotMatch(source, /formatCount\(overview\.audit\.otherOpen\)|otherOpenRounds|viewRounds/, "the other rounds are never a number")
  assert.equal(source.match(/t\(overview\.audit\.otherOpen > 0 \? "noDueRound" : "noRound"\)/g)?.length, 2, "the KPI and the section")
})

test("ล่าสุด: five asset events for asset:view, on the desktop only, the document linked only for those who may open it, with no link to every movement (spec §6.8)", () => {
  const source = page()
  assert.match(source, /canViewAssets \? getRecentAssetEvents\(5\) : Promise\.resolve\(\[\]\)/)
  assert.match(source, /tAll\(assetMovementLabelKey\(event\.movementType\)\)/)
  assert.match(source, /formatRecentTime\(event\.performedAt, now, locale\)/)
  assert.match(source, /<time dateTime=\{event\.performedAt\.toISOString\(\)\}/)
  assert.match(source, /hasPermission\(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION\[event\.document\.kind\]\.module, "view"\)/)
  assert.match(source, /buildAssetMovementDocumentHref\(locale, event\.document\)/)
  assert.match(source, /key === "recent" && "max-md:hidden"/)
  assert.doesNotMatch(source, /\/admin\/logs|systemLog|crossScopeViewAll/)
  assert.equal(source.match(/description=\{companyId \? t\("allCompanies"\) : undefined\}/g)?.length, 2, "งานที่รอคุณ and ล่าสุด say ทุกบริษัท while a company is chosen (R26)")
})
```

Delete the Task 9 line in `tests/dashboard-page.test.ts` that counts that `description` once (in the งานที่รอคุณ test); the line above counts both.

- `tests/reports-dashboard-sweep-ui.test.ts` (the Task 9 test): `<ContentPanel\b` count 4 ("งานที่รอคุณ, ตรวจนับแยกสาขา, ตามสถานะ, ล่าสุด"), divided flush count 4.
- `tests/performance-route-instrumentation.test.ts`: append `"dashboard.recent-activity"`.
- `tests/phase2d-final-ui.test.ts` (the Task 9 test): the panels become `["4 lg:col-span-7", "4 lg:col-span-5", "5 lg:col-span-7", "5 hidden md:block lg:col-span-5"]`, the skeleton of the work order (waiting, branches, status, recent).

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/dashboard-page.test.ts tests/reports-dashboard-sweep-ui.test.ts tests/phase2d-final-ui.test.ts tests/performance-route-instrumentation.test.ts`
Expected: FAIL. `pickDashboardBranchRows` and `formatRecentTime` are not exported, and the page has no branch or recent section.

- [ ] **Step 4: Implement**

- **Helpers** (`src/lib/dashboard-page.ts`):
  - `pickDashboardBranchRows`: `rows` = the first 8, `moreOnPhone` = more than 3, `moreOnDesktop` = more than 8.
  - `formatRecentTime`: `const days = bangkokDayDiff(at, now)` (Task 1, R1). `days <= 0` (today in Bangkok) gives `"time"` with `HH:mm` (`en-GB`, `hourCycle: "h23"`, `Asia/Bangkok`); `days === 1` gives `"yesterday"`; otherwise `"date"` with `formatDayMonth(at, locale, now)`.
- **Round 1** gains `withPerformanceTiming("dashboard.recent-activity", () => canViewAssets ? getRecentAssetEvents(5) : Promise.resolve([]), meta)` and `getTranslations()` with no namespace (`tAll`, for the movement keys, as the login page reads keys of other namespaces).
- **`sections.branches`** (`canViewAudit`, R25): `<ContentPanel divided flush title={t("branchesTitle")} description={round ? t("branchesRound", { code: round.code }) : undefined} actions={…}>`.
  - `actions` (R15): `overview.audit.otherOpen > 0 ? (` then `<Link href={\`/${locale}/audit/rounds?view=open\`} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>{t("allOpenRounds")}</Link>` `) : undefined`. No count: the "กำลังตรวจ" tab lists the current round too, so no number here could match it. The same link serves the no-round state whenever an operational round exists.
  - Without a round: `<EmptyNote padded>{t(overview.audit.otherOpen > 0 ? "noDueRound" : "noRound")}</EmptyNote>`, the same words as the KPI's foot.
  - With a round:
    - A legend line (`text-meta text-muted-foreground`): a swatch and `t("legendCounted")`, a 2px mark and `t("legendPace")`, both `aria-hidden` and drawn with the same tokens as `PaceBar`'s fill and pace mark (Task 7: `statusFillVariants({ tone: "primary" })` for the swatch, the `foreground` 2px line for the mark).
    - `ContentPanelRows` of `pickDashboardBranchRows(overview.audit.branches).rows`. Each `<li className={cn(index >= DASHBOARD_BRANCH_ROW_LIMIT.phone && "max-md:hidden")}>`: from md a grid `md:grid md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] md:items-center md:gap-4`.
      - `const branchValue = auditPercent(branch.processed, branch.expected) / 100` (pinned on one line: the round page's whole percent, R21).
      - The branch name `branch.name` (Task 8 already writes `"<company code> / <branch name>"` under ทุกบริษัท and the name alone with a company chosen, R16) is a `linkVariants({ size: "inherit" })` link to `buildAuditRoundItemsHref(locale, round.id, { branchId: branch.branchId, companyId: companyId ?? undefined })` (`min-h-11 md:min-h-0`; R13: the round's item list narrowed to this branch, and to the chosen company, so its count is the row's `expected`).
      - Next comes `<PaceBar value={branchValue} pace={overview.audit.pace} label={t("branchBarLabel", { branch: branch.name, percent: formatPercent(branchValue), pace: formatPercent(overview.audit.pace ?? 0) })} behind={branch.behind} />`.
      - Then `t("branchNumbers", { percent: formatPercent(branchValue), processed: formatCount(branch.processed), expected: formatCount(branch.expected) })` in `num`. When `branch.behind`, `toneIcons.warning` (`aria-hidden`, `size-3.5`) and `{t("branchBehind")}` in `text-warning`: the text carries the meaning. On the phone the name and the numbers sit on one line above the bar.
    - Under the rows, when `moreOnDesktop` or `moreOnPhone`: a link `t("allBranches")` to `buildAuditRoundItemsHref(locale, round.id, { companyId: companyId ?? undefined })`, with `md:hidden` when only `moreOnPhone`.
- **`sections.recent`** (`canViewAssets`, R25): `<ContentPanel divided flush title={t("recentTitle")} description={companyId ? t("allCompanies") : undefined}>` (R26), no header link.
  - Empty: `<EmptyNote padded>{t("recentEmpty")}</EmptyNote>`.
  - Otherwise `ContentPanelRows`, one `<li className="flex items-baseline gap-3">` per event:
    - `<time dateTime={event.performedAt.toISOString()} className="num w-16 shrink-0 text-meta text-muted-foreground">`: the time text, or `t("recentYesterday")`.
    - `<p className="min-w-0 text-sm text-foreground">`: `tAll(assetMovementLabelKey(event.movementType))`, then a `linkVariants({ size: "inherit" })` link with `className` adding `tag` to `/${locale}/assets/${event.asset.id}` showing `event.asset.assetTag`, then, when `event.document && user && hasPermission(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION[event.document.kind].module, "view")`, ` · ` and the same kind of link to `buildAssetMovementDocumentHref(locale, event.document)` showing `event.document.code`. A person who may not open that document's page sees no document at all (the repair, disposal and round pages each require their own view permission).
- **The section wrapper** gains `key === "recent" && "max-md:hidden"` (no ล่าสุด on the phone).
- **Skeleton:** the grid holds `<DividedPanelSkeleton rows={4} className="lg:col-span-7" />`, `<DividedPanelSkeleton rows={4} className="lg:col-span-5" />`, `<DividedPanelSkeleton rows={5} className="lg:col-span-7" />` and `<DividedPanelSkeleton rows={5} className="hidden md:block lg:col-span-5" />`. Its comment names the four sections.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, tsc clean, lint 0 errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(dashboard)/dashboard/page.tsx" src/lib/dashboard-page.ts src/components/ui/page-skeleton.tsx messages/th.json messages/en.json tests/dashboard-page.test.ts tests/reports-dashboard-sweep-ui.test.ts tests/performance-route-instrumentation.test.ts tests/phase2d-final-ui.test.ts
git commit -m "feat(dashboard): ตรวจนับแยกสาขา with the pace mark and ล่าสุด from asset movements (group 1 dashboard task 10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7 (the controller, after Task 11's E2E run; not the implementer): look at the two sections**

R32. In the same session as Task 9's look (the run's build, `next start`, the IT head's state from `authStateFile(<runId>, "itHead")`), screenshot `/th/dashboard` and `/th/dashboard?companyId=<the run's company>` at 1440×900 and 390×844, in light and dark. Compare ตรวจนับแยกสาขา (the legend, the pace mark on every bar, "ช้ากว่าที่ควร" with its icon, 8 rows on the desktop and 3 on the phone, "ดูรอบที่กำลังตรวจทั้งหมด") and ล่าสุด (desktop only) with `B-Dashboard.dc.html` and `B-Dashboard-Phone.dc.html`, and the section order of both profiles. What differs goes to the implementer as one fix round (`fix(dashboard): … (group 1 dashboard task 10 fix 1)`), reviewed like any other. Delete the screenshots after the report; never commit them.

---

### Task 11: E2E steps and the round's docs

**Files:**
- Create:
  - `e2e/dashboard/dashboard-words.ts`
  - `e2e/dashboard/dashboard-steps.ts`
  - `e2e/dashboard/dashboard.spec.ts`
  - `tests/e2e-dashboard.test.ts`
- Modify:
  - `docs/99_CHANGELOG.md`
  - `docs/07_UAT_CHECKLIST.md:62` (rewrite) and a new "Dashboard B UAT" section before `## Sign-Off`
  - `DEVELOPER_HANDOFF.md` (one bullet after the login's, in "Menu B App Shell (2026-10-25)")
  - `docs/14_UI_UX_DESIGN_SYSTEM.md` (a Dashboard row in the Current-Surface Registry, after Login)
  - `docs/08_PRODUCTION_READINESS.md:66` (the dashboard's timing labels: the six it names are gone after Tasks 9 and 10)
- Unchanged and still passing:
  - `e2e/smoke/*`: the landing smoke keeps its `h1` check (`e2e/support/landing.ts:18`), and the page keeps `PageHeader`'s `h1` on both widths.
  - The suite guards over all of `e2e/`: `tests/e2e-suite.test.ts:313-332` (fixtures, four smoke specs) and `tests/e2e-review.test.ts:20-108` (no hazard, no `DELETE`, no settings page).
  - The docs pins `tests/shell-docs.test.ts`, `tests/e2e-docs.test.ts`, `tests/v-track-docs.test.ts`, `tests/dark-mode-docs.test.ts` and `tests/phase2d-docs.test.ts`.

**Interfaces:**
- Consumes:
  - `WAITING_WORK_KEYS` (Task 1).
  - `DASHBOARD_SECTION_ORDER` (Task 8).
  - The markup of Tasks 9 and 10: `data-dashboard-section`, `data-waiting-key` with the row's `.num` and its count link (the desktop row holds an `<a>`, the phone row is one), the one KPI `StatStrip`, the KPI link's `aria-describedby` filter note (Task 6, shown on hover and on `:focus-visible`), the status bar's `data-status-segment` links (Task 7, R17: `aria-hidden`, out of the tab order, so the steps find them by that attribute), the branch `PaceBar` label.
  - The lists the waiting counts open (Task 3D): `/admin/approvals` shows its total in a `StatStrip` cell labelled "ทั้งหมด" (`summary.total`, `src/app/[locale]/(dashboard)/admin/approvals/page.tsx:76-82`); the disposal list, the findings list, the repair list by status and the register show "<from>–<to> จาก <total> รายการ" (`common.showingRange` in the table foot, `registerRange` on the register) when the list is not empty.
  - Task 3A's register chip "มีผู้ถือครอง" (link-only, R7) and the company chip at every width.
  - Task 5's round link (`buildAuditRoundItemsHref`, R13): the round KPI's href is `/<locale>/audit/rounds/<id>?…#audit-result-list`, so the spec reads the round id from the URL's path.
  - Task 8's current-round pick with R15's tie-break: in progress first, then the nearest due date, then the latest start, then the code.
  - Shell helpers: `bell`, `bellBox`, `createPendingDisposal`, `itStaffApi` (`e2e/shell/shell-steps.ts`); `templatePattern` (`e2e/shell/shell-words.ts`).
  - Disposal helpers: `createRoom`, `createAssets`, `readAssetChoices`, `recordPrefix`, `escapeRegExp` (`e2e/disposal/disposal-support.ts`).
  - Repair helper: `saveRepairForm(page, measure, label)` (`e2e/repair/repair-data.ts:131-142`), the repair form's save as `e2e/repair/repair-record.spec.ts` (ER3, :156-159) uses it: `/th/maintenance/new?assetId=<id>`, the problem, the "ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)" radio, save.
  - `bangkokDate` (`e2e/transactions/tx-plan.ts`) and `recordSettled` (`e2e/audit/settle.ts`).

- [ ] **Step 1: Write the guard test so it fails**

`tests/e2e-dashboard.test.ts`:

```ts
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
```

Run: `node --test tests/e2e-dashboard.test.ts`
Expected: FAIL. `../e2e/dashboard/dashboard-words.ts` is not found.

- [ ] **Step 2: Write the words and the steps**

`e2e/dashboard/dashboard-words.ts` (plain data, no imports, so the node test loads it):

```ts
// The words the dashboard checks read on screen, as the app writes them in messages/th.json (tests/e2e-dashboard.test.ts
// checks every value is one of th.json's). Plain data, no imports, so the node test can load it.
export const DASHBOARD_WORDS = {
  waitingTitle: "งานที่รอคุณ", totalAssets: "ทรัพย์สินทั้งหมด", custodianAssigned: "มีผู้ถือครอง",
  noteCustodian: "มีผู้ถือครอง ไม่รวมตัดจำหน่ายแล้วและปลดระวาง", openWorkCenter: "เปิดศูนย์งานค้าง",
  scopeNavigation: "ขอบเขตข้อมูล", activeFilters: "ตัวกรองที่ใช้อยู่",
  auditRoundKpi: "รอบตรวจนับ {code}", auditFoot: "ตรวจแล้ว {processed} / {expected} · ควรถึง {pace}",
  branchBarLabel: "{branch} ตรวจแล้ว {percent} ควรถึงวันนี้ {pace}", branchBehind: "ช้ากว่าที่ควร",
  // The approvals page's total cell (approvalInboxPage.total) and the repair form's "not finished" choice (doneNo).
  approvalsTotal: "ทั้งหมด", repairNotDone: "ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)",
} as const

// The kinds of งานที่รอคุณ in the shared order (src/lib/waiting-work-rules.ts WAITING_WORK_KEYS), each with the title
// the dashboard row and the bell row both read (messages/th.json notifications.<key>).
export const WAITING_TITLES = {
  approvalInbox: "งานรออนุมัติ",
  openRepairs: "ซ่อมยังไม่เสร็จ",
  stuckRepairs: "รอซ่อมแต่ยังไม่มีบันทึกซ่อม",
  duePm: "PM ถึงกำหนด",
  pendingAuditFindings: "รายการไม่ตรงรอพิจารณา",
  openAuditActions: "แผนแก้ไขยังเปิด",
  auditActionsDueSoon: "แผนแก้ไขใกล้ครบกำหนด",
  pendingDisposals: "ตัดจำหน่ายรอพิจารณา",
  approvedDisposals: "อนุมัติแล้ว รอตัดจำหน่าย",
  returnsDueSoon: "ใกล้/เลยกำหนดคืน",
  warrantyExpiringSoon: "ประกันใกล้หมดอายุ",
  licenseExpiringSoon: "License ใกล้หมดอายุ",
} as const
export type WaitingKey = keyof typeof WAITING_TITLES
export const WAITING_ORDER = Object.keys(WAITING_TITLES) as WaitingKey[]

// The sections of each profile (src/lib/dashboard-overview-rules.ts DASHBOARD_SECTION_ORDER).
export const SECTION_ORDER = {
  work: ["waiting", "branches", "status", "recent"],
  overview: ["status", "branches", "waiting", "recent"],
} as const
```

`e2e/dashboard/dashboard-steps.ts`:

```ts
// The dashboard as a person reads it (src/app/[locale]/(dashboard)/dashboard/page.tsx, page group 1): the KPI strip,
// the sections in their order, the rows of งานที่รอคุณ, and the bell's rows of the same kinds. The page marks each
// section with data-dashboard-section and each waiting row with data-waiting-key; a row's count is its .num, as the
// bell writes its own.
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import { bell, bellBox } from "../shell/shell-steps.ts"
import { WAITING_ORDER, WAITING_TITLES, type WaitingKey } from "./dashboard-words.ts"

// The spec file takes the browser types from here: it imports nothing from @playwright/test.
export type { Locator, Page }
export type WaitingRow = { key: WaitingKey; count: string }

export const kpiStrip = (page: Page): Locator => page.getByRole("main").locator('[data-slot="stat-strip"]').first()
export const kpiCell = (page: Page, label: string | RegExp): Locator =>
  kpiStrip(page).locator('[data-slot="stat"]').filter({ has: page.locator("dt", { hasText: label }) })
export async function kpiLabels(page: Page): Promise<string[]> {
  return (await kpiStrip(page).locator("dt").allInnerTexts()).map((text) => text.trim())
}
export const section = (page: Page, key: string): Locator => page.locator(`[data-dashboard-section="${key}"]`)
export async function sectionOrder(page: Page): Promise<string[]> {
  return page.locator("[data-dashboard-section]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-dashboard-section") ?? ""))
}
export const byWaitingOrder = (left: WaitingKey, right: WaitingKey) => WAITING_ORDER.indexOf(left) - WAITING_ORDER.indexOf(right)

// The first number of a text as the page formats it: "1,380" of "1,380 79%".
export async function countIn(locator: Locator): Promise<string> {
  const match = /[\d,]+/.exec(await locator.innerText())
  if (!match) throw new Error("no number in the text")
  return match[0]
}

// The rows of งานที่รอคุณ on screen: the desktop table's rows or the phone's row links.
export async function waitingRows(page: Page): Promise<WaitingRow[]> {
  const rows: WaitingRow[] = []
  for (const row of await section(page, "waiting").locator("[data-waiting-key]").filter({ visible: true }).all()) {
    rows.push({ key: (await row.getAttribute("data-waiting-key")) as WaitingKey, count: (await row.locator(".num").first().innerText()).trim() })
  }
  return rows
}

// The list a waiting row's count opens: the desktop row holds the count link, the phone row is the link.
export async function waitingHref(page: Page, key: WaitingKey): Promise<string> {
  const row = section(page, "waiting").locator(`[data-waiting-key="${key}"]`).filter({ visible: true }).first()
  const href = await row.evaluate((node) => (node instanceof HTMLAnchorElement ? node : node.querySelector("a"))?.getAttribute("href") ?? "")
  if (!href) throw new Error(`the ${key} row has no link`)
  return href
}

// How the list a kind opens shows its total on screen (Task 3D): the approvals page's "ทั้งหมด" cell, or the
// "<from>–<to> จาก <total> รายการ" line of a list (disposal, findings, the repair list by status, the register). The
// stuck repairs and due PM open a section of the repair page, whose list foot counts the repair records, not the
// section, so they have none here.
export const LIST_TOTAL: Partial<Record<WaitingKey, "approvals" | "range">> = {
  approvalInbox: "approvals",
  openRepairs: "range",
  pendingAuditFindings: "range",
  openAuditActions: "range",
  auditActionsDueSoon: "range",
  pendingDisposals: "range",
  approvedDisposals: "range",
  returnsDueSoon: "range",
  warrantyExpiringSoon: "range",
  licenseExpiringSoon: "range",
}

// The bell's rows (src/components/layout/notification-bell.tsx): each group is a region, each row a link whose first
// line is the kind's title and whose .num is its count; read once the summary has loaded, in the shared order.
export async function bellRows(page: Page): Promise<WaitingRow[]> {
  const box = bellBox(page)
  if (!(await box.isVisible())) await bell(page).click()
  await expect(box.getByRole("region").first()).toBeVisible()
  const keyByTitle = new Map(Object.entries(WAITING_TITLES).map(([key, title]) => [title as string, key as WaitingKey]))
  const rows: WaitingRow[] = []
  for (const link of await box.getByRole("region").getByRole("link").all()) {
    const title = (await link.locator("p").first().innerText()).trim()
    const key = keyByTitle.get(title)
    if (!key) throw new Error(`the bell lists a kind the dashboard does not know: ${title}`)
    rows.push({ key, count: (await link.locator(".num").innerText()).trim() })
  }
  return rows.sort((left, right) => byWaitingOrder(left.key, right.key))
}

// The pace a round's own dates give on a Bangkok day, as the page writes it ("75%"): clamp((today − start) /
// (due − start), 0, 1); a round that starts and ends on one day is 100% from its start.
export function expectedPace(start: string, end: string, today: string): string {
  const day = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`) / 86_400_000
  const span = day(end) - day(start)
  const pace = span <= 0 ? (day(today) >= day(start) ? 1 : 0) : Math.min(1, Math.max(0, (day(today) - day(start)) / span))
  return `${Math.round(pace * 100)}%`
}
```

- [ ] **Step 3: Write the spec**

`e2e/dashboard/dashboard.spec.ts`:

```ts
// The dashboard of page group 1 (spec docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md
// §10): (a) every งานที่รอคุณ row equals the bell's row of the same kind, and each count opens a list with the same
// total, (b) the order follows the person's work, (c) a KPI, a status row and (on the desktop) a status segment open the
// register with the same count and its chip, and a cell's filter note is its description and shows on keyboard focus,
// (d) a round the test opens shows its pace from its own dates, (e) the cross-scope number appears once.
// The dev database is a copy of Production whose counts move, so every step compares two surfaces, never a number.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import { createAssets, createRoom, escapeRegExp, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { saveRepairForm } from "../repair/repair-data.ts"
import { createPendingDisposal, itStaffApi } from "../shell/shell-steps.ts"
import { templatePattern } from "../shell/shell-words.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { recordSettled } from "../audit/settle.ts"
import { DASHBOARD_WORDS, SECTION_ORDER } from "./dashboard-words.ts"
import { bellRows, byWaitingOrder, countIn, expectedPace, kpiCell, kpiLabels, LIST_TOTAL, section, sectionOrder, waitingHref, waitingRows } from "./dashboard-steps.ts"

test.describe("the IT head", () => {
  asUser("itHead")

  test("each waiting row equals the bell's row of the same kind and opens a list with the same total, approvals come first, and the work order leads (spec §10 a, b)", async ({ page, measure }, testInfo) => {
    test.setTimeout(180_000)
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "DASH")
    const roomId = await createRoom(`${prefix}-ROOM`, `${prefix} ห้องทดสอบแดชบอร์ด`)
    const staff = await itStaffApi()
    try {
      // IT staff ask for a disposal: the IT head has approval work, as in the bell test.
      await createPendingDisposal(staff, choices, roomId, `${prefix}-1`)
    } finally {
      await staff.dispose()
    }

    await measure.visit("/th/dashboard", "IT head: dashboard")
    const rows = await waitingRows(page)
    expect(rows[0]?.key, "an approver's first row").toBe("approvalInbox")
    expect(rows.map((row) => row.key), "the shared order").toEqual(rows.map((row) => row.key).sort(byWaitingOrder))
    // (a) The bell lists the same kinds with the same counts.
    expect(await bellRows(page)).toEqual(rows)
    await recordSettled(page, measure, "IT head: the bell box over the dashboard")
    await page.keyboard.press("Escape")
    // The KPI is the rows' sum.
    const sum = rows.reduce((total, row) => total + Number(row.count.replaceAll(",", "")), 0)
    expect(Number((await countIn(kpiCell(page, DASHBOARD_WORDS.waitingTitle).locator("dd").first())).replaceAll(",", ""))).toBe(sum)

    // (b) The work order: งานที่รอคุณ, the round, then the totals; the sections the same way.
    const labels = await kpiLabels(page)
    expect(labels[0]).toBe(DASHBOARD_WORDS.waitingTitle)
    expect(labels[1]).toMatch(/^รอบตรวจนับ/)
    expect(labels.slice(2)).toEqual([DASHBOARD_WORDS.totalAssets, DASHBOARD_WORDS.custodianAssigned])
    expect(await sectionOrder(page)).toEqual(SECTION_ORDER.work)
    // The IT head holds dashboard:view: the section offers the work center.
    await expect(section(page, "waiting").getByRole("link", { name: DASHBOARD_WORDS.openWorkCenter }).filter({ visible: true })).toHaveCount(1)

    // (a) Each count opens a list that shows the same total (spec §6.3): the approvals row always (the test's pending
    // disposal is in it), then every other visible row whose list shows its total on screen (LIST_TOTAL). The links are
    // read on the dashboard first, then followed one by one.
    const lists: { key: string; count: string; total: "approvals" | "range"; href: string }[] = []
    for (const row of rows) {
      const total = LIST_TOTAL[row.key]
      if (total) lists.push({ key: row.key, count: row.count, total, href: await waitingHref(page, row.key) })
    }
    const followed: string[] = []
    for (const list of lists) {
      await measure.visit(list.href, `IT head: the list of ${list.key}`)
      if (list.total === "approvals") {
        expect(await countIn(kpiCell(page, new RegExp(`^${DASHBOARD_WORDS.approvalsTotal}$`)).locator("dd").first()), list.key).toBe(list.count)
      } else {
        await expect(page.getByRole("main"), list.key).toContainText(`จาก ${list.count} รายการ`)
      }
      followed.push(list.key)
    }
    expect(followed, "the approvals row is always followed").toContain("approvalInbox")
  })

  test("a round the IT head opens shows its pace mark from its own dates (spec §10 d)", async ({ page, measure }, testInfo) => {
    test.setTimeout(180_000)
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "DASHR")
    const roomId = await createRoom(`${prefix}-ROOM`, `${prefix} ห้องทดสอบรอบแดชบอร์ด`)
    await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])
    // A one-day round, today in Bangkok: its pace is 100% from its start, and nothing is counted yet. In its dates and
    // due today, no round in progress is due earlier and none started later, so the pick (R15) shows it. A tie on both
    // dates goes to the lower code: only an open round left with the same two dates can win it, such as the one-day
    // round of e2e/disposal/open-audit-block.spec.ts when that test fails before its cancel.
    const opened = await page.request.post("/api/audit-rounds", {
      data: {
        name: `${prefix} รอบทดสอบแดชบอร์ด`,
        auditYear: Number(bangkokDate().slice(0, 4)),
        scopeCompanyId: null,
        scopeBranchId: null,
        scopeDepartmentId: null,
        scopeLocationId: roomId,
        scopeCategoryId: null,
        scopeCustodianId: null,
        scopeStatusId: null,
        scopeConditionId: null,
        includeClosedAssets: false,
        riskPreset: "all",
        sampleRate: 100,
        startDate: bangkokDate(),
        endDate: bangkokDate(),
        status: "open",
      },
    })
    expect(opened.status(), await opened.text()).toBe(201)
    const round = (await opened.json()) as { id: string; auditNo: string }
    try {
      await measure.visit("/th/dashboard", "IT head: dashboard with an open round")
      const roundCell = kpiCell(page, /^รอบตรวจนับ /)
      const href = (await roundCell.getByRole("link").first().getAttribute("href")) ?? ""
      // The KPI opens the round's item list (/th/audit/rounds/<id>?…#audit-result-list): the id is the path's last part.
      const shownId = new URL(href, page.url()).pathname.split("/").pop() ?? ""
      const shown = (await (await page.request.get(`/api/audit-rounds/${shownId}`)).json()) as { auditNo: string; startDate: string; endDate: string }
      // The pick (spec §6.4, R15) shows the test's own round. If not, the test fails and names the round that won.
      expect(
        shown.auditNo,
        `the dashboard shows ${shown.auditNo} (${shown.startDate.slice(0, 10)} to ${shown.endDate.slice(0, 10)}), not the test's ${round.auditNo}: an open round due today that started today has a lower code, so it wins the tie (R15)`,
      ).toBe(round.auditNo)
      // The round's own dates give the pace the cell shows: one day, so 100%.
      const pace = expectedPace(shown.startDate, shown.endDate, bangkokDate())
      expect(pace).toBe("100%")
      await expect(roundCell).toContainText(`ควรถึง ${pace}`)
      // Its one branch has counted nothing, so it is behind the pace, with the words, not the colour alone.
      const branches = section(page, "branches")
      await expect(branches.getByRole("img", { name: templatePattern(DASHBOARD_WORDS.branchBarLabel, { branch: ".+", percent: "0%", pace: "100%" }) })).toHaveCount(1)
      await expect(branches.getByText(DASHBOARD_WORDS.branchBehind, { exact: true })).toBeVisible()
    } finally {
      const cancelled = await page.request.patch(`/api/audit-rounds/${round.id}`, { data: { action: "cancel", reason: `${prefix} ปิดรอบทดสอบแดชบอร์ด` } })
      expect(cancelled.ok(), await cancelled.text()).toBe(true)
    }
  })
})

test.describe("IT staff", () => {
  asUser("itStaff")

  test("IT staff see their work first: a repair row leads, no approvals row, the shared order, no work-center link (spec §10 b)", async ({ page, measure }, testInfo) => {
    test.setTimeout(180_000)
    // IT staff record an unfinished repair of one of the test's own assets (maintenance:create; not a hazard), through
    // the repair form as the repair spec's ER3 does, so they have a repair row whatever the dev data holds.
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "DASHS")
    const roomId = await createRoom(`${prefix}-ROOM`, `${prefix} ห้องทดสอบงานซ่อมแดชบอร์ด`)
    const [asset] = await createAssets(page, choices, roomId, [`${prefix}-A1`])
    await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "IT staff: repair form for the test's asset")
    await page.locator("#repair-record-problem").fill(`${prefix} ทดสอบแถวงานซ่อมบนแดชบอร์ด`)
    await page.getByRole("radio", { name: DASHBOARD_WORDS.repairNotDone }).check()
    const record = await saveRepairForm(page, measure, "IT staff: save an unfinished repair")
    expect(record.repairStatus).toBe("in_progress")

    await measure.visit("/th/dashboard", "IT staff: dashboard")
    const keys = (await waitingRows(page)).map((row) => row.key)
    // IT staff hold no approval, and openRepairs is the first kind after approvalInbox in the shared order: with the
    // record above it counts at least 1, so it is the first row whatever else the dev data holds.
    expect(keys[0], "IT staff's first row: the repair they just recorded").toBe("openRepairs")
    expect(keys).not.toContain("approvalInbox")
    expect(keys).toEqual([...keys].sort(byWaitingOrder))
    expect((await kpiLabels(page))[0]).toBe(DASHBOARD_WORDS.waitingTitle)
    expect(await sectionOrder(page)).toEqual(SECTION_ORDER.work)
    // No dashboard:view: no link to the work center (spec §6.3).
    await expect(page.getByRole("main").getByRole("link", { name: DASHBOARD_WORDS.openWorkCenter })).toHaveCount(0)
  })
})

test.describe("the viewer", () => {
  asUser("viewer")

  test("the viewer reads the totals first; a KPI, a status row and a status segment open the register with the same count and chip; the cross-scope number appears once (spec §10 b, c, e)", async ({ page, measure, e2eDevice }) => {
    await measure.visit("/th/dashboard", "viewer: dashboard")
    // (b) The overview order.
    const labels = await kpiLabels(page)
    expect(labels.slice(0, 2)).toEqual([DASHBOARD_WORDS.totalAssets, DASHBOARD_WORDS.custodianAssigned])
    expect(labels[2]).toMatch(/^รอบตรวจนับ/)
    expect((await sectionOrder(page)).slice(0, 2)).toEqual(SECTION_ORDER.overview.slice(0, 2))
    // ล่าสุด is on the desktop only.
    if (e2eDevice === "desktop") await expect(section(page, "recent")).toBeVisible()
    else await expect(section(page, "recent")).toBeHidden()

    // (e) The cross-scope number appears once, as an exact register link.
    const crossScope = page.getByRole("main").locator('a[href*="crossScope="]')
    await expect(crossScope).toHaveCount(1)
    await expect(crossScope).toHaveAttribute("href", /crossScope=all&exact=1$/)

    // (c) The custodian KPI names its filter, and opens the register with the same count and its chip.
    const custodian = kpiCell(page, DASHBOARD_WORDS.custodianAssigned)
    const custodianLink = custodian.getByRole("link", { name: DASHBOARD_WORDS.custodianAssigned, exact: true })
    await expect(custodianLink).toHaveAccessibleDescription(DASHBOARD_WORDS.noteCustodian)
    // On keyboard focus the note shows (Task 6's :focus-visible), on every project, before any mouse move: the link is
    // focused, then Shift+Tab and Tab come back to it, so the browser treats the focus as the keyboard's.
    const custodianNote = custodian.getByText(DASHBOARD_WORDS.noteCustodian, { exact: true })
    await custodianLink.focus()
    await page.keyboard.press("Shift+Tab")
    await page.keyboard.press("Tab")
    await expect(custodianLink).toBeFocused()
    await expect(custodianNote).toBeVisible()
    await custodianLink.blur()
    await expect(custodianNote).toBeHidden()
    // On the desktop the note also shows on hover.
    if (e2eDevice === "desktop") {
      await custodian.hover()
      await expect(custodianNote).toBeVisible()
    }
    const custodianCount = await countIn(custodian.locator("dd").first())
    await custodianLink.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("custodianState") === "assigned" && url.searchParams.get("exact") === "1")
    await measure.recordPage("viewer: the register from the custodian KPI")
    await expect(page.getByRole("main")).toContainText(`จาก ${custodianCount} รายการ`)
    await expect(page.getByRole("group", { name: DASHBOARD_WORDS.activeFilters }).getByRole("link", { name: new RegExp(DASHBOARD_WORDS.custodianAssigned) })).toBeVisible()

    // The register opened for one status: the same count, its tab current or its chip.
    const expectStatusList = async (statusName: string, statusCount: string) => {
      await expect(page.getByRole("main")).toContainText(`จาก ${statusCount} รายการ`)
      const statusChip = page.getByRole("group", { name: DASHBOARD_WORDS.activeFilters }).getByRole("link", { name: new RegExp(escapeRegExp(statusName)) })
      const statusTab = page.getByRole("main").locator('a[aria-current="page"]').filter({ hasText: statusName })
      await expect(statusChip.or(statusTab).filter({ visible: true }).first()).toBeVisible()
    }

    // A status row opens its status exactly, on both widths (the phone's way to a status's list).
    await measure.visit("/th/dashboard", "viewer: dashboard, for a status row")
    const statusRow = section(page, "status").getByRole("row").last()
    const statusLink = statusRow.getByRole("link")
    const statusName = (await statusLink.innerText()).trim()
    const statusCount = (await statusRow.getByRole("cell").nth(1).innerText()).trim()
    await statusLink.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && Boolean(url.searchParams.get("statusId")) && url.searchParams.get("exact") === "1")
    await measure.recordPage("viewer: the register from a status row")
    await expectStatusList(statusName, statusCount)

    // On the desktop a segment of the status bar opens its status exactly too (spec §2 decision 3, R17): the count of
    // the table row with the same link, and its chip or tab. The bar is aria-hidden and its links are out of the tab
    // order, so the step finds the segment by its data attribute, as a pointer user clicks it.
    if (e2eDevice === "desktop") {
      await measure.visit("/th/dashboard", "viewer: dashboard, for a status segment")
      const segment = section(page, "status").locator("[data-status-segment]").first()
      const segmentStatusId = (await segment.getAttribute("data-status-segment")) ?? ""
      const segmentHref = (await segment.getAttribute("href")) ?? ""
      const segmentRow = section(page, "status").getByRole("row").filter({ has: page.locator(`a[href="${segmentHref}"]`) })
      const segmentName = (await segmentRow.getByRole("link").innerText()).trim()
      const segmentCount = (await segmentRow.getByRole("cell").nth(1).innerText()).trim()
      await segment.click()
      await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("statusId") === segmentStatusId && url.searchParams.get("exact") === "1")
      await measure.recordPage("viewer: the register from a status segment")
      await expectStatusList(segmentName, segmentCount)
    }

    // One company: the links on the desktop, a removable chip on the phone; the total opens the register for it.
    const { companyId } = readRunData()
    if (e2eDevice === "desktop") {
      // The switcher is on the dashboard; the steps above left the page on the register.
      await measure.visit("/th/dashboard", "viewer: dashboard, for one company")
      const switcher = page.getByRole("navigation", { name: DASHBOARD_WORDS.scopeNavigation })
      await switcher.locator(`a[href$="companyId=${companyId}"]`).click()
      await page.waitForURL((url) => url.searchParams.get("companyId") === companyId)
      await expect(switcher.locator(`a[href$="companyId=${companyId}"]`)).toHaveAttribute("aria-current", "page")
      await measure.recordPage("viewer: the dashboard for one company")
    } else {
      await measure.visit(`/th/dashboard?companyId=${companyId}`, "viewer: the dashboard for one company")
      await expect(page.getByRole("group", { name: DASHBOARD_WORDS.scopeNavigation }).getByRole("link")).toHaveAttribute("href", "/th/dashboard")
    }
    const total = kpiCell(page, DASHBOARD_WORDS.totalAssets)
    const totalLink = total.getByRole("link", { name: DASHBOARD_WORDS.totalAssets, exact: true })
    await expect(totalLink).toHaveAttribute("href", new RegExp(`companyId=${companyId}`))
    const companyTotal = await countIn(total.locator("dd").first())
    await totalLink.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("companyId") === companyId)
    await measure.recordPage("viewer: the register for one company")
    await expect(page.getByRole("main")).toContainText(`จาก ${companyTotal} รายการ`)
    // The company chip shows on both widths (spec §6.5).
    await expect(page.getByRole("group", { name: DASHBOARD_WORDS.activeFilters }).filter({ visible: true }).getByRole("link")).not.toHaveCount(0)
  })
})
```

Notes on the spec:
- **(a) The lists.** The approvals row is always there: the test's own pending disposal is in the IT head's inbox. For every other visible row the spec follows its count link when `LIST_TOTAL` names how its list shows a total. Stuck repairs and due PM open a section of the repair page (`#stuck`, `#pm-due`). That page's list foot counts the repair records, not the section, so it does not show their total; Task 3D's unit test ties each section heading's count to the bell's where.
- **(b) IT staff's first row.** `WAITING_WORK_KEYS` puts `openRepairs` right after `approvalInbox`. IT staff have no approval permission and do have `maintenance:view`. Their own unfinished record makes the count at least 1, so `openRepairs` is the first row on every project whatever the dev data holds. `stuckRepairs` and `pendingAuditFindings` can only come after it.
- **(c) Focus.** `locator.focus()` alone may not count as keyboard focus for `:focus-visible`. The Shift+Tab and Tab round trip makes it keyboard focus on every project before any mouse move. The hover check stays on the desktop, after a blur.
- **(d) Other rounds due today.** Two other specs open rounds:
  - `e2e/audit/field-audit.spec.ts` runs its main round from today to today + 30 (:77, :82) and the IT head's own round from today to today + 7 (:408-409). Neither is due today in the same run. An own round left open by a failed run 7 days earlier is due today but started 7 days ago, so the test's round, which started today, wins on the later start.
  - `e2e/disposal/open-audit-block.spec.ts` opens a one-day round on its UTC date (:26, :42-43) and cancels it in the same test (:75). `playwright.config.ts:19` runs one worker, so that round is already cancelled before any dashboard test runs. An open round with the test's two dates is left only when that test fails before its cancel, on a run between 07:00 and 24:00 Bangkok time, when its UTC date is the Bangkok date. Such a round has a lower code and wins the tie.
  - The two ways to make the test's round win anyway do not work with Task 8's pick. The pick takes the lower code (`auditNo` ascending), and a new round always gets the highest code of its year (`generateAuditNo`, `src/lib/audit-round.ts:51-60`). A later start time needs a later end time, because the round API refuses an end before its start (`src/lib/validations/audit.ts:34`), and the pick orders by the stored `endDate` first, so the round would lose on its due date.
  - So in that one case the test fails with a message that names the round which won. The main session looks at that round. A leftover E2E round of the DSP3 test is cancelled by the IT head, as that test does itself. Any other round is reported and not touched.

- [ ] **Step 4: Update the docs**

- `docs/99_CHANGELOG.md`: a `### แดชบอร์ดแบบ B (กลุ่มหน้าแรก งานที่ 2)` entry at the top, newest first. It goes under a new `## <date of the commit>` heading, or as the first `###` under `## 2026-10-26` when the commit is on that date (above the login entry). It holds:
  - the branch, spec and plan line (as the login entry has);
  - **ที่เปลี่ยน:** "ข้อมูล ณ …"; the company links (desktop) and the removable chip (phone), for the overview parts only; the four KPIs and the four sections in an order taken from permissions, not role names; งานที่รอคุณ from the one source the bell and the work center read, 12 kinds with "ซ่อมยังไม่เสร็จ" and "รอซ่อมแต่ยังไม่มีบันทึกซ่อม", with ค้างนานสุด; ตามสถานะ as a data bar and a table of every status with a count, each bar segment and each row name linking to that status's list (the bar is hidden from screen readers, the table says the same); the cross-scope number once; ตรวจนับแยกสาขา with the "ควรถึงวันนี้" mark, branch names with the company code under ทุกบริษัท, and "ดูรอบที่กำลังตรวจทั้งหมด" with no number; when no round is due, "ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้" (or "ไม่มีรอบตรวจนับที่กำลังตรวจ" when no round is in progress at all); ล่าสุด, five asset movements, desktop only, with `asset:view`, a document linked only for people who may open it; the parts each need their own view permission (`asset:view`, `audit:view`); the monthly trends, the old system-log feed, the cross-scope card and panel and the warranty KPI removed;
  - **ตัวเลขตรงกับรายการ:** every number opens a list with the same count (`exact=1`); hover or focus shows the filter; the register's new link-only filters (`custodianState=assigned`, licence expiry, returns due counted by asset, the warranty rule of the bell); the findings' two link-only action filters; the round's item list filtered by `branchId` and `companyId`;
  - **ส่วนกลาง:** StatStrip's filter note and meter slot; the "Data bars" rule; `DistributionBar` and `PaceBar`;
  - **E2E:** `e2e/dashboard/dashboard.spec.ts`, (a)–(e) as in this task, two surfaces and never a number; the run's result is written later, not in this commit;
  - **deploy:** not deployed, no migration.
- `docs/07_UAT_CHECKLIST.md`:
  - **Rewrite line 62** (it asks for the cross-scope KPI, urgent-work card and review panel, which are gone): "On Dashboard, confirm the number of assets outside the owner's scope appears once, under the status table ("นอกขอบเขตเจ้าของรหัส N รายการ"), and opens Asset Register with `crossScope=all` and the same count; the four cross-scope quick filters stay on Asset Register."
  - **Add `## Dashboard B UAT (2026-10-26)`** after "Menu B Shell UAT" and before "Sign-Off", with the line "The automated suite covers the dashboard in all four projects (`e2e/dashboard/`). A person still checks:" and these lines:
    - an approver sees "งานรออนุมัติ" first, IT staff their repair, PM and discrepancy rows first, and a view-only person ทรัพย์สินทั้งหมด and ตามสถานะ first;
    - each row of งานที่รอคุณ equals the bell's row and opens a list with the same count; ค้างนานสุด turns warning ink with an icon when overdue; the zero line names the kinds at zero; "เปิดศูนย์งานค้าง" only with `dashboard:view`;
    - NVDA reads each KPI's filter note as its description, and skips the status bar: the table under it reads every status, count and link (the bar's segments are links for the mouse only);
    - on the desktop, a click on a status bar segment opens the register for that status with the same count as its table row, and hovering it names the status, its count and the filter;
    - choosing a company changes the totals, ตามสถานะ, the cross-scope line and the round; งานที่รอคุณ and ล่าสุด say "ทุกบริษัท"; the register opened from a number shows the company chip on desktop and the same count;
    - the "ควรถึงวันนี้" mark sits at the share of the round's days gone; a branch behind it says "ช้ากว่าที่ควร"; a branch row opens the round's item list filtered to that branch with the same count; with a company chosen, the round KPI opens the round's item list filtered to that company, its count equal to the KPI's "ตรวจแล้ว … / N"; with no round due, the KPI and the section say "ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้" and "ดูรอบที่กำลังตรวจทั้งหมด" opens the rounds list's "กำลังตรวจ" tab;
    - ล่าสุด shows a document number only to a person who may open that document (a repair, disposal or round page needs its own view permission);
    - the bar fills and swatches are told apart in both themes on a real monitor;
    - on the phone: the KPIs in 2×2, rows of งานที่รอคุณ at least 56px tall, no ล่าสุด;
    - an English pass of the new messages.
  - Do not add `<N>` or any other template marker.
- `DEVELOPER_HANDOFF.md`: after the "Page group 1, the login" bullet, one bullet: "Page group 1, the dashboard (<the commit date>, branch `feat/group1-dashboard`, not deployed, no migration; plan `docs/superpowers/plans/2026-10-26-group1-dashboard.md`): canvas B; งานที่รอคุณ reads the shared waiting-work source (`src/lib/waiting-work.ts`), which the bell and the work center also read, with the two repair kinds; every number opens a list with the same count (register `custodianState=assigned`, `dataQuality=licenseExpiry` and `returnDue`; findings `action_not_due` and `action_due_soon`; the round's item list by `branchId` and `companyId`); the page reads `getWaitingWork`, never `getNotificationCenter`, so it writes nothing; StatStrip's filter note and meter; the Data bars rule with `DistributionBar` and `PaceBar`; ล่าสุด from `AssetMovement`. UAT: `docs/07_UAT_CHECKLIST.md` "Dashboard B UAT"." Write the real date, not a marker. Move `> Last updated:` to that date when it is later.
- `docs/08_PRODUCTION_READINESS.md:66`: the dashboard sentence names the labels the page emits after Tasks 9 and 10. "Dashboard emits both the full `dashboard.initial-data` duration and subgroup labels (`dashboard.kpi-counts`, `dashboard.recent-activity`, `dashboard.urgent-work`, `dashboard.approval-inbox`, `dashboard.cross-scope`, `dashboard.monthly-trends`)" becomes "Dashboard emits both the full `dashboard.initial-data` duration and subgroup labels (`dashboard.waiting-work`, `dashboard.recent-activity`, `dashboard.overview`, `dashboard.waiting-ages`)". These are the labels `tests/performance-route-instrumentation.test.ts` lists after Task 10, minus `dashboard.initial-data`. The rest of the line, "so the slow Dashboard query group can be isolated before optimizing.", stays.
- `docs/14_UI_UX_DESIGN_SYSTEM.md`, after the Login row: `| Dashboard | [\`2026-10-25-page-group-1-dashboard-detail-login-design.md\`](superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md) §6 (canvas B: the as-of line, the company links, four KPIs with filter notes, งานที่รอคุณ from the shared waiting-work source, ตามสถานะ with its data bar, ตรวจนับแยกสาขา with the pace mark, ล่าสุด), on the list primitives of [\`2026-10-12-ui-phase2b-design.md\`](superpowers/specs/2026-10-12-ui-phase2b-design.md) §4.4.6 | [\`2026-10-26-group1-dashboard.md\`](superpowers/plans/2026-10-26-group1-dashboard.md) builds it (page group 1). |`

- [ ] **Step 5: Run the source tests**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, the whole unit suite, including `tests/e2e-dashboard.test.ts` and the docs pins (the shell, E2E, V-track, dark-mode and 2D entries keep their dates; the new entry sits above them).

- [ ] **Step 6: Commit**

```bash
git add e2e/dashboard/dashboard-words.ts e2e/dashboard/dashboard-steps.ts e2e/dashboard/dashboard.spec.ts tests/e2e-dashboard.test.ts docs/99_CHANGELOG.md docs/07_UAT_CHECKLIST.md DEVELOPER_HANDOFF.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/08_PRODUCTION_READINESS.md
git commit -m "test(e2e): the dashboard steps compare its numbers with the bell, the register and a round's own dates, and the docs record the round (group 1 dashboard task 11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7 (the main session, not the implementer): run the affected E2E specs**

These need the VPN, `scratchpad/stay-awake.ps1` and a clean build. The main session probes the database first (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`), runs `rm -rf .next && npm run build`, then:

Run: `npx playwright test e2e/dashboard e2e/smoke e2e/shell`
Expected: every test passes in all four projects. The whole suite runs once after the asset-detail plan (spec §11). On that build the controller then runs the look steps of Tasks 9 and 10 (R32). The E2E result and the AssetSystem wiki are written by the main session afterwards, on `feat/group1-dashboard` (R34).

---

## Appendix: planning rulings R1–R34

The tasks cite these as "R<n>". They were settled while the plan was drafted (2026-10-26) and bind every task.


### Names and shared helpers

- **R1** The Bangkok day helper is `startOfBangkokDay(now: Date): Date`, exported from `src/lib/waiting-work-rules.ts` (Task 1). Every task that needs a Bangkok day uses it (Task 3 drops `waitingWorkToday`; Task 8 drops its private helper and imports it; Task 10's "เมื่อวาน" uses it). Task 1 also exports `bangkokDayDiff(from: Date, to: Date): number` (whole Bangkok days from `from` to `to`) for Tasks 2, 8 and 10.
- **R2** Task 1's where builders are named `duePmWhere(day: Date)`, `pendingAuditFindingsWhere`, `pendingDisposalsWhere`, `approvedDisposalsWhere`, `openRepairsWhere`, `stuckRepairsWhere`, `openAuditActionsWhere(today, rules)`, `auditActionsDueSoonWhere(today, rules)`, `returnsDueSoonAssetWhere(today, rules)` (asset-level, R5), `warrantyExpiringSoonWhere(today, rules)`, `licenseExpiringSoonWhere(today, rules)`. Tasks 3 and 4 use exactly these.
- **R3** `src/lib/waiting-work-rules.ts` is client-safe: a type-only Prisma import, relative `.ts` imports only, no `prisma`, no `@/` (the register's client bundles import `asset-list-query.ts`, which imports it). Task 1 states this in its Files block and a test pins it (no `from "@/` and no value import of `@prisma/client`).
- **R4** Task 1 adds `notifications.openRepairsDetail` and `notifications.stuckRepairsDetail` beside the two titles (the bell renders `${key}Detail`). Titles are exactly `notifications.<WaitingWorkKey>`.

### Counting and lists

- **R5** The bell's `returnsDueSoon` counts ASSETS (`returnsDueSoonAssetWhere`: active assets with an open temporary loan due within the window), so the register list equals it; its gate becomes `asset:view`. Task 2's returns age reads only loans of active assets.
- **R6** Task 3 stays split as 3A–3D (commit suffixes "task 3A" … "task 3D"), including 3B (the data-quality rule, the reports operations card and the overview export follow the bell's warranty rule). `buildAssetWhere`'s rules/today options are optional, defaulting to today and `DEFAULT_WAITING_WORK_RULES`; settings are read only when a windowed value is in the URL.
- **R7** The new register values and the two findings statuses are link-only (chips, no new filter-sheet chips or tabs). `custodianState=assigned` uses `assetNotClosedStatusWhere` (exported by Task 3, status `name` not in `CLOSED_AUDIT_STATUS_NAMES`); Task 8 imports that same fragment for the share denominator and counts the KPI through `buildAssetWhere(parseAssetListParams({ custodianState: "assigned", companyId }))`.
- **R8** `visibleKeys` leaves out `pendingAuditFindings` / `pendingDisposals` while the person's inbox holds that kind (so the zero line never says "none" for work the approvals row holds).
- **R9** Approvals are overdue when Bangkok `days > slaDays`, computed directly (not through `getApprovalAgeStatus`, which uses server-local days); the test checks both agree at Bangkok-noon instants. Only approvals are overdue by age; due-date kinds are overdue when the date is past.
- **R10** The dashboard calls `getWaitingWork` (read-only) and never `getNotificationCenter`; a test pins that the page does not import `getNotificationCenter`. 
- **R11** Stuck repairs' age: the latest movement whose `toValue` is the asset's current `statusId`, else the asset's `updatedAt` (two reads). Ages are requested only for keys with a count above 0 (the caller filters).

### Work center and audit rounds

- **R12** The work center shows 9 shared kinds (its 7 today + `stuckRepairs` + `auditActionsDueSoon`); `returnsDueSoon`, warranty and licence stay off it. Its cells take the bell's titles and details; the 13 superseded `workCenter.*` keys are deleted (`workCenter.approvalInbox` stays).
- **R13** Task 5's filter takes both `branchId` and `companyId` (items by `expectedBranchId` / `expectedCompanyId`), each with its removable chip, and the exports follow both. The helper is `buildAuditRoundItemsHref(locale: string, roundId: string, filters: { branchId?: string; companyId?: string }): string` (replaces `buildAuditRoundBranchHref`). The round's StatStrip, bar and buckets stay round-wide; only the item list narrows. The dashboard's round KPI link and branch rows pass the chosen `companyId` (Tasks 9 and 10).
- **R14** No `returnTo` on that link (as drafted).

### Dashboard data and page

- **R15** Current round tie-break: nearest due date first, then the latest start, then the code. `otherOpen` is not shown as a number: the branch section's header links "ดูรอบที่กำลังตรวจทั้งหมด" to `/${locale}/audit/rounds?view=open` when other operational rounds exist (no count, so nothing to mismatch). The no-round state reads "ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้" (KPI and section) with the same link when any operational round exists, else "ไม่มีรอบตรวจนับที่กำลังตรวจ" (Task 9's `dashboard.noDueRound` and `dashboard.noRound`). These two states replace spec §6.4's single line "ไม่มีรอบตรวจนับที่เปิดอยู่". (Glossary-check both.)
- **R16** Branch rows are named `"<company code> / <branch name>"` with "ทุกบริษัท", the branch name alone with a company chosen; the round page's branch chip uses the same rule.
- **R17** The status bar's segments ARE links (spec §2 decision 3, §6.5, §10 c: the user's decision; the earlier ruling that they are not is withdrawn). `DistributionBar({ segments })` takes `{ key, count, tone, href?, title? }[]` (Task 7). The whole bar is `aria-hidden="true"`, with no `role="img"` and no name. The status table beside it is its accessible form, with every number and the same links. A segment with `href` renders as `<a href tabIndex={-1} title data-status-segment={key}>`: pointer users click it, and its `title` gives "<status> <count> · <filter note>" on hover. Keyboard and screen-reader users use the table's links. `tabIndex={-1}` keeps the hidden bar free of anything tabbable, which axe's `aria-hidden-focus` requires. A segment without `href` stays a `span`. Task 9 passes each row's exact register link (`row.href`, from `dashboardRegisterParams`) and `t("statusSegmentTitle", …)` with the status filter note (and the company when one is chosen). Task 11 (c) clicks a segment on the desktop and checks the register's count and chip; both widths keep the row-link check. `PaceBar` stays `role="img"` with its sentence.
- **R18** StatStrip gains `meter?: React.ReactNode` (Task 6), rendered full width under the value inside the value `dd`; the audit KPI passes `<PaceBar …/>` there (Task 9). `PaceBar`'s root is a `span` with `role="img"` and `display:block` so it is valid anywhere.
- **R19** Task 6's filter note uses the CSS anchor approach as drafted (`position: fixed`, `anchor()` insets, `useId` names, shown on hover and on the dt link's `:focus-visible`, `visibility:hidden` otherwise, `aria-describedby`); a cell with `filterNote` and no `href` shows none.
- **R20** Task 7 as drafted: `statusFillVariants` appended to `badge-variants.ts`, `barPercent` in a pure `src/lib/data-bars.ts`, segments at least 4px, the old progress bars named in the rule as keeping their markup until their page group.
- **R21** Task 8's extra exports stand (`auditPercent`, `isBehindPace`, `buildDashboardAudit`, `buildDashboardStatusRows`, `dashboardRegisterParams`, `DashboardOverview` in the rules file and re-exported). Task 9 builds every overview register link with `dashboardRegisterParams`. `pickCurrentAuditRound` keeps its optional `eligible` argument.
- **R22** `asset.movementTypes.maintenance_create` becomes "บันทึกซ่อม" (one word, spec §5).
- **R23** Task 9 checks `?companyId=` against the active companies; an unknown id is ignored (all companies) rather than showing zeros.
- **R24** The waiting KPI links in-page to `#dashboard-waiting`.
- **R25** The page gates its parts: total/custodian KPIs, ตามสถานะ, the cross-scope line and ล่าสุด need `asset:view`; the audit KPI and ตรวจนับแยกสาขา need `audit:view`; a part the person cannot open is left out (the page itself stays open as today).
- **R26** The "ทุกบริษัท" note shows on งานที่รอคุณ and ล่าสุด only while a company is chosen.
- **R27** The switcher is its own row under the header (links; a GET `role="search"` form with `FilterSelect` when more than four companies).
- **R28** Section spans alternate 7/5 by position in `DASHBOARD_SECTION_ORDER`.
- **R29** The old system-log feed leaves in Task 9; Task 10 adds ล่าสุด; the timing label follows.
- **R30** `formatPercent` joins `src/lib/display-format.ts` (`tests/display-format.test.ts` count follows).
- **R31** Next-step verbs as drafted: only `approvalInbox` says "พิจารณา"; view-only kinds say "ดู…"; keep "เปิดศูนย์งานค้าง".
- **R32** Tasks 9 and 10 end with a look step run by the controller after Task 11's E2E (screenshots at 1440 and 390, both themes, signed in through the run's IT head state); the drafts need no visual step for the implementer.
- **R33** The digest keeps 8 rows; more people see "และอีก N หัวข้อ" (accepted).
- **R34** The wiki and the E2E result are the main session's after the run (as for the login). The branch is `feat/group1-dashboard`.
