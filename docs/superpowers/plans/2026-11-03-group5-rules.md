# Page group 5, plan 1: the maintenance rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set the rules the five maintenance pages read before any page is rebuilt:
- one PM due rule on Bangkok days with one scope, its counts and its badge;
- one overdue word, "เกินกำหนด", across the app, and "PM ครบกำหนดใน 7 วัน" for the reminder;
- a PM plan moves only when its visit is done;
- the server checks of the repair record and the PM plan;
- the forms' way back to the asset page and the PM list.

**Architecture:**
- **The due rule** lives in `src/lib/preventive-maintenance.ts` (client-safe, pure). A small server reader `src/lib/pm-due-counts.ts` counts the four buckets with their earliest dates; plans 4 and 5 read it.
- **The repair rules** stay in `repair-record-policy.ts` and `repair-record-service.ts`. **The PM plan rules** stay in `maintenance-plan-service.ts` and the two plan routes.
- **The way back** is one helper in `operational-return-navigation.ts` used by the four maintenance form and detail pages.
- Little UI changes: the asset tab's PM badge, the PM form's option type and its stale-edit field, the record page's replacement panel count.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, `node --test` (`npx tsx --test`), Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-03-page-group-5-maintenance-design.md`: §5 (rules), §10 "Server", §12, §13 (only the keys named below), §15.1, §17 row 1; decisions 3, 4, 5, 8, 10.4 and 11.

**Recon with file:line:** session scratchpad `g5/recon/` (`r-model.md`, `r-pm.md`, `r-debt.md`, `critic.md`). The scratchpad is `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/`.

## Global Constraints

- **Branch and repo:**
  - Branch `feat/group5-rules` from `master` `fead50f5`. No push.
  - No schema change, no migration and no database command.
  - Implementer tasks run no build, no dev server and no E2E. `npx playwright test --list` is fine.
- **Files to leave alone:**
  - Never read `.env*`.
  - Do not touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- **Bangkok days:** every day comparison goes through `getBangkokDateKey`, `startOfBangkokDay`, `endOfBangkokDay` or `bangkokDayDiff`. Never `setHours`, `getDate()` or a local-midnight `new Date("YYYY-MM-DDT00:00:00")`. Tests that pin a boundary use `now = 2026-11-02T17:30:00Z` (00:30 on 3 Nov in Bangkok), so they fail on a UTC server if the code reads the server's zone.
- **Words:**
  - Add the glossary rows of spec §15.1 to `docs/19_THAI_GLOSSARY.md` before a word is used (Task 2).
  - Change messages only through `node scripts/messages-edit.mjs <change file>`. Change files go in `<scratchpad>/g5/msg/p1-*.json`.
  - Give every message in Thai and English. English follows the existing style of its namespace.
- **Error codes:** a new `MaintenanceErrorCode` gets an entry in `src/lib/api-error-catalog.ts`, an `apiErrors.*` message and a `maintenancePage.errors.*` message, in the same task.
- **Guards:** a source-reading test that pins a changed file moves in the same task.
- **Commits:**
  - CRLF files keep CRLF.
  - Before each commit, run the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors).
  - Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Stable hooks:** unchanged (spec §5): `#repair-record-*`, `#maintenance-plan-*`, `section#stuck`, `section#pm-due`.

## Rulings made while planning

- **G5P1-R1 (scope):** the client-safe "what will happen" helper and the asset facts read (spec §17 row 1) move to plan 2. Plan 2's MT-New is their first reader, and their shape follows that form; plan 3 reuses them after plan 2. Cost if wrong: none for plan 1; plan 2 grows by one task.
- **G5P1-R2 (bucket bounds):** a bucket compares the stored `nextDueDate` instant with Bangkok day edges: overdue `lt startOfBangkokDay(now)`; week `gte` that and `lte endOfBangkokDay(now, 7)`; soon `gte` that and `lte endOfBangkokDay(now, 14)`; later `gt endOfBangkokDay(now, 14)`. The reminder where (`buildDuePmPlanWhere`) keeps its shape: scope and `lte endOfBangkokDay(now, 7)`, overdue included.
- **G5P1-R3 (badge):** the due badge is a pure function `getPmDueBadge` (Task 1). The asset tab uses it now; plan 4's PM page uses it later. Until plan 4, the PM page keeps its `pmDueState.*` words, now on Bangkok days.
- **G5P1-R4 (interim list words):** `เลยกำหนด` leaves every message now, because the glossary test forbids it. The list keys plan 5 rewrites get interim values: `repairRecord.pmOverdue` "เกินกำหนด", `repairRecord.pmDueHelp` "แผน PM ที่เกินกำหนดหรือครบกำหนดใน 7 วัน เรียงจากที่เกินกำหนดนานที่สุด", and `repairRecord.pmDueTitle` takes its spec value "บำรุงรักษาตามรอบ (PM) ครบกำหนดใน 7 วัน" now, so the box and the bell share one name. `pmActions.pauseHelp` and `resumeHelp` take their spec values now, for the same reason.
- **G5P1-R5 (bell detail):** `notifications.duePmDetail` reads "แผน PM ที่เกินกำหนดหรือครบกำหนดใน 7 วัน กดบันทึกว่าทำแล้วที่หน้าซ่อมบำรุง".
- **G5P1-R6 (date rule):** a date after Bangkok today is refused with the new code `MAINTENANCE_DATE_IN_FUTURE` (400) and a field error `repairDateInFuture` under the field. It covers the record date on create, the completion date, and the record date in the edit dialog. The spec names the first two; the edit dialog changes the same date. Cost if wrong: an edit to a future date is refused.
- **G5P1-R7 (outcome):** a done create without `outcome` is refused under the field, code `repairOutcomeRequired`. A not-done create ignores any `outcome` sent and stores none, as today (`e2e/transactions/return.spec.ts:191-206` sends one).
- **G5P1-R8 (plan check):** a create with `maintenancePlanId` checks the plan (active, `isActive`, same asset) after the asset claim and before any write, done or not, still 409 `MAINTENANCE_PLAN_INVALID_TRANSITION`.
- **G5P1-R9 (completion and the plan):** ซ่อมเสร็จ moves the record's plan from `returnDate` only when that plan is active, `isActive` and of the same asset. Otherwise the plan is left alone with no error and no log line.
- **G5P1-R10 (decision 11's movement):** a not-done create on อยู่ระหว่างซ่อม changes no status. Its `maintenance_create` movement is still written with from = to, as a done create on a Ready asset writes today.
- **G5P1-R11 (PM create):** POST keeps its 404 for a missing or inactive asset and its vendor field error. A Disposed or Retired asset is refused with 400 `MAINTENANCE_PLAN_ASSET_WRITTEN_OFF`. The planNo counts the Bangkok day, and the create retries on a duplicate planNo (`withPrismaUniqueRetry`, 3 attempts).
- **G5P1-R12 (stale PM edit):** only the `update` action carries `expectedUpdatedAt`. Pause, resume and end keep their state machine and need none.
- **G5P1-R13 (PM asset options):** a new option type `pmAsset` disables only Disposed and Retired assets, with reason `MAINTENANCE_PLAN_ASSET_WRITTEN_OFF`. The PM form uses it, so an asset with an open repair can get a plan (decision 10.4).
- **G5P1-R14 (crumbs):** the first breadcrumb of the four pages names its own list. It links to `returnTo` only when `returnTo` is that list (with its query); otherwise it links to the bare list. The back link and the save go to `returnTo`.
- **G5P1-R15 (asset links):** the asset detail page sends `returnTo=/{locale}/assets/<id>` with its บันทึกซ่อม action, through a new optional `repairReturnTo` on `AssetActionInput`. The register list and the scan page leave it unset (spec §15.2: scan stays out). The tab's "ตั้งรอบ PM" sends `/{locale}/assets/<id>?view=maintenance`.
- **G5P1-R16 (replacement rule):** the record page's disposal-review panel reads `summarizeAssetRepairs` over the asset's active records. Its count and its cost, and the disposal reason built from them, leave out PM visits and cancelled records, as the asset tab does.

## Review Focus

1. **A UTC server at 00:30 Bangkok time** (`now = 2026-11-02T17:30:00Z`). A plan due on 3 Nov is "today", not overdue, and counts in the 7-day reminder. A repair dated 3 Nov is accepted; one dated 4 Nov is refused (Task 1, Task 3).
2. **A PM record saved not done, its plan paused, then ซ่อมเสร็จ.** The record closes and the plan's date stays (Task 3).
3. **Two PM plans created at once on the same Bangkok day.** The second gets a duplicate planNo once, retries and gets the next number (Task 4).
4. **An open PM edit page after "บันทึกว่าทำแล้ว" moved the plan's date.** Its save is refused with 409 `MAINTENANCE_PLAN_CONFLICT` and the reload message (Task 4).
5. **A crafted `returnTo`:** `//evil.example/x`, `/th/assets/a-1/edit`, `/th/assets/`, `/en/assets/a-1` on a Thai page, `/th/maintenance/../admin`. Each falls back to the list (Task 5).

---

### Task 1: The PM due rule on Bangkok days

**Files:**
- Modify:
  - `src/lib/preventive-maintenance.ts`: the day helpers, the scope, the buckets, the badge, `getMaintenancePlanDueState` on Bangkok days, `buildDuePmPlanWhere` on the shared scope.
  - `src/lib/waiting-work-rules.ts`: `startOfBangkokDay` and `bangkokDayDiff` move out; re-export them (`export { startOfBangkokDay, bangkokDayDiff } from "./preventive-maintenance.ts"`), so importers stay.
- Create: `src/lib/pm-due-counts.ts`.
- Test: `tests/preventive-maintenance.test.ts`, `tests/pm-due-dates.test.ts`, new `tests/pm-due-counts.test.ts`, and `tests/waiting-work-rules.test.ts` if it pins the moved code.

**Interfaces:**
- Produces, in `preventive-maintenance.ts`:
  - `startOfBangkokDay(now: Date): Date` and `bangkokDayDiff(from: Date, to: Date): number`, moved unchanged.
  - `endOfBangkokDay(now: Date, offsetDays = 0): Date`: 23:59:59.999 Bangkok of the day `offsetDays` after `now`'s Bangkok day.
  - `pmDueSoonWindowDays = 14` (next to `pmReminderWindowDays = 7`).
  - `pmDueScopeWhere: Prisma.MaintenancePlanWhereInput` = `{ isActive: true, planState: "active", asset: { isActive: true, status: { name: { notIn: ["Disposed", "Retired"] } } } }`.
  - `type PmDueBucket = "overdue" | "week" | "soon" | "later"` and `buildPmDueBucketWhere(bucket: PmDueBucket, now: Date): Prisma.MaintenancePlanWhereInput`: the scope plus the bound of G5P1-R2.
  - `buildDuePmPlanWhere(now)`: `{ ...pmDueScopeWhere, nextDueDate: { lte: endOfBangkokDay(now, 7) } }` (same value as today).
  - `getMaintenancePlanDueState(nextDueDate, now = new Date())`: overdue when the due Bangkok day is before today; due_soon up to today + 14; else upcoming.
  - `getPmDueBadge(nextDueDate: Date | string, now: Date): { key: "overdue" | "today" | "soon" | "later"; days: number; tone: "danger" | "warning" | "primary" }`. `days` is never negative: the days late for overdue, 0 for today, the days left otherwise. Tones: overdue danger, today and soon warning, later primary.
- Produces, in `pm-due-counts.ts` (server reader, db injected, no `db` import):
  - `type PmDueCount = { count: number; earliest: Date | null }`.
  - `type PmDueCounts = { overdue: PmDueCount; week: PmDueCount; soon: PmDueCount; later: PmDueCount; total: number; outOfScope: number }`. `total` = overdue + soon + later. `outOfScope` counts active plans (`isActive`, `planState: "active"`) whose asset is inactive, Disposed or Retired (spec §9 scope note).
  - `readPmDueCounts(db: PmDueCountsDb, now: Date): Promise<PmDueCounts>`, where `PmDueCountsDb = { maintenancePlan: { aggregate(args): Promise<{ _count: { _all: number }; _min: { nextDueDate: Date | null } }>; count(args): Promise<number> } }`. Four `aggregate` calls (one per bucket, `_count._all` and `_min.nextDueDate`) and one `count`, in parallel.

- [ ] **Step 1: Write the failing tests.** With `now = new Date("2026-11-02T17:30:00Z")`:
  - `getMaintenancePlanDueState`: due `2026-11-02T10:00:00Z` → `overdue`; `2026-11-03T00:00:00Z` → `due_soon`; `2026-11-17T00:00:00Z` → `due_soon`; `2026-11-18T00:00:00Z` → `upcoming`.
  - `getPmDueBadge`: `2026-11-01T00:00:00Z` → `{ key: "overdue", days: 2, tone: "danger" }`; `2026-11-03T00:00:00Z` → `{ key: "today", days: 0, tone: "warning" }`; `2026-11-05T00:00:00Z` → `{ key: "soon", days: 2, tone: "warning" }`; `2026-11-18T00:00:00Z` → `{ key: "later", days: 15, tone: "primary" }`.
  - `endOfBangkokDay(now)` → `2026-11-03T16:59:59.999Z`; `endOfBangkokDay(now, 7)` → `2026-11-10T16:59:59.999Z`.
  - `buildPmDueBucketWhere`: overdue `nextDueDate: { lt: 2026-11-02T17:00:00.000Z }`; week `{ gte: 2026-11-02T17:00:00.000Z, lte: 2026-11-10T16:59:59.999Z }`; soon `{ gte: 2026-11-02T17:00:00.000Z, lte: 2026-11-17T16:59:59.999Z }`; later `{ gt: 2026-11-17T16:59:59.999Z }`; each with the scope keys.
  - The existing `buildDuePmPlanWhere` deepEqual in `pm-due-dates.test.ts` still passes unchanged.
  - `readPmDueCounts` with a fake db: it passes each bucket's where, maps `_count._all` and `_min.nextDueDate`, sums `total`, and the `count` where is `{ isActive: true, planState: "active", OR: [{ asset: { isActive: false } }, { asset: { status: { name: { in: ["Disposed", "Retired"] } } } }] }`.
- [ ] **Step 2: Run** `npx tsx --test tests/preventive-maintenance.test.ts tests/pm-due-dates.test.ts tests/pm-due-counts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** as the Interfaces say. Remove the local `startOfDay` of `preventive-maintenance.ts`.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5: Commit** `feat(maintenance): one PM due rule on Bangkok days, its four buckets with counts and its badge (group 5 plan 1)`

### Task 2: One overdue word, the reminder's name, the glossary and the asset tab's badge

**Files:**
- Modify:
  - `messages/th.json`, `messages/en.json` through `<scratchpad>/g5/msg/p1-words.json`.
  - `src/lib/notification-digest-format.ts:35`: th `duePm` "PM ครบกำหนดใน 7 วัน"; en "PM due within 7 days".
  - `src/components/assets/detail/asset-maintenance-tab.tsx:205-228`: active plans show `getPmDueBadge` with `maintenancePage.pmDue.<key>`; paused and ended plans show no due badge, as today.
  - `docs/19_THAI_GLOSSARY.md`: the five rows of spec §15.1.
  - `tests/thai-glossary.test.ts`: the rule `{ term: "เลยกำหนด", pattern: /เลยกำหนด/, use: "เกินกำหนด" }`.
  - Comments that say เลยกำหนด: `src/lib/audit-rounds-list-rules.ts:212`, `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx:116`.
  - Tests and E2E words: `tests/notification-digest.test.ts:22`, `tests/notification-announcement.test.ts:7-17`, `tests/asset-register-view-model.test.ts:195`, `tests/asset-maintenance-tab-ui.test.ts`, `e2e/dashboard/dashboard-words.ts:21,27`, `e2e/repair/pm-plan.spec.ts:2,44,49` (the row now reads "เกินกำหนด"; the comments name the box "PM ครบกำหนดใน 7 วัน").
- **Message changes (th; en in the same meaning):**
  - `notifications.duePm` "PM ครบกำหนดใน 7 วัน" (en "PM due within 7 days"); `notifications.duePmDetail` per G5P1-R5.
  - `dashboard.waitingOverdue` and `auditRound.daysOverdue` "เกินกำหนด {days} วัน".
  - `notifications.returnsDueSoon` and `asset.dataQualityReturnDue` "ใกล้/เกินกำหนดคืน".
  - `systemSettingsPage.notificationDaysHelp` "ใส่ 0 เพื่อแจ้งเฉพาะรายการที่ถึงกำหนดวันนี้หรือเกินกำหนดแล้ว ค่าสูงสุดคือ 365 วัน".
  - `repairRecord.pmOverdue`, `repairRecord.pmDueHelp`, `repairRecord.pmDueTitle`, `maintenancePage.pmActions.pauseHelp`, `maintenancePage.pmActions.resumeHelp` per G5P1-R4 and spec §13.
  - New `maintenancePage.pmDue.overdue` "เกินกำหนด {days} วัน", `pmDue.today` "ใกล้ถึงกำหนด · วันนี้", `pmDue.soon` "ใกล้ถึงกำหนด · อีก {days} วัน", `pmDue.later` "รอบถัดไป · อีก {days} วัน" (en "{days} days overdue", "Due soon · today", "Due soon · in {days} days", "Next round · in {days} days").

**Interfaces:**
- Consumes: `getPmDueBadge` (Task 1).

- [ ] **Step 1: Write the failing tests.**
  - The glossary test finds no `เลยกำหนด` in `messages/th.json`. It fails now on the seven keys that hold it.
  - `asset-maintenance-tab-ui.test.ts`: the tab source calls `getPmDueBadge(` and `tMaintenance(\`pmDue.${`; th `maintenancePage.pmDue.overdue` is "เกินกำหนด {days} วัน".
  - The digest and announcement tests expect "PM ครบกำหนดใน 7 วัน".
- [ ] **Step 2: Run** `npx tsx --test tests/thai-glossary.test.ts tests/asset-maintenance-tab-ui.test.ts tests/notification-digest.test.ts tests/notification-announcement.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npx playwright test --list e2e/dashboard e2e/repair`.
- [ ] **Step 5: Commit** `feat(words): เกินกำหนด across the app, PM ครบกำหนดใน 7 วัน for the reminder, and the asset tab's PM badge with its day count (group 5 plan 1)`

### Task 3: The repair record rules

**Files:**
- Modify:
  - `src/lib/repair-record-policy.ts`: `unfinishedRepairSources` gains `"under maintenance"`; `getRepairRecordCreateEffect` takes `outcome: RepairOutcome | null`; new `isRepairDateAfterToday(date: Date, now: Date): boolean` (Bangkok keys).
  - `src/lib/validations/maintenance.ts`: create `outcome` becomes `z.enum(repairOutcomes).nullable().optional().transform((value) => value ?? null)`; `superRefine` adds `done && !outcome` → issue on `["outcome"]` with message `repairOutcomeRequired`. The condition check stays.
  - `src/lib/repair-record-service.ts`:
    - `createRepairRecord(db, input, user, now = new Date())`: the date rule (G5P1-R6) before the transaction; the plan check (G5P1-R8) after the claim; `advancePlan` only when `input.done`, from `reportedDate`; `outcome` stored only when done.
    - `completeRepairRecord(db, id, input, user, now = new Date())`: the date rule on `returnDate`; `getTicket` also selects `maintenancePlanId`; after closing, the plan moves from `returnDate` per G5P1-R9.
    - `updateRepairRecordDetails(db, id, input, user, now = new Date())`: the date rule on `reportedDate`.
    - Split today's `advancePlan` into `findActivePlan(tx, planId, assetId)` (returns the plan or null) and the date write. The create throws 409 when it is null; the completion skips.
  - `src/lib/maintenance-api-errors.ts`: code `MAINTENANCE_DATE_IN_FUTURE`.
  - `src/lib/api-error-catalog.ts`: `"MAINTENANCE_DATE_IN_FUTURE": "repairDateInFuture"`, `"repairDateInFuture": "repairDateInFuture"`, `"repairOutcomeRequired": "repairOutcomeRequired"`.
  - Messages through `<scratchpad>/g5/msg/p1-repair.json`:
    - `maintenancePage.errors.MAINTENANCE_ASSET_ON_LOAN` and `apiErrors.maintenanceAssetOnLoan`: "ทรัพย์สินนี้มีใบส่งมอบที่ยังไม่รับคืน ต้องรับคืนก่อน" (en "This asset has a handover that is not returned yet. Record the return first.").
    - `maintenancePage.errors.MAINTENANCE_DATE_IN_FUTURE` and `apiErrors.repairDateInFuture`: "วันที่ต้องไม่หลังวันนี้" (en "The date cannot be after today").
    - `apiErrors.repairOutcomeRequired`: "เลือกผลการซ่อม" (en "Choose the repair result").
- Test: `tests/repair-record-policy.test.ts`, `tests/repair-record-validation.test.ts`, `tests/repair-record-service.test.ts`, `tests/maintenance-api-errors.test.ts`, `tests/api-error-catalog.test.ts`.

**Interfaces:**
- Produces: `RepairRecordCreateInput["outcome"]: RepairOutcome | null`; `isRepairDateAfterToday(date, now)`; the optional `now` parameters above. The routes call the services without `now`.
- The refusal: `new MaintenanceApiError("MAINTENANCE_DATE_IN_FUTURE", "The date cannot be after today", 400, { <field>: "repairDateInFuture" })`, field `reportedDate` or `returnDate`.

- [ ] **Step 1: Write the failing tests.**
  - Policy: Under Maintenance, not done → `{ error: null, nextStatusName: "Under Maintenance" }`; Under Inspection, not done → `MAINTENANCE_ASSET_INELIGIBLE`; Checked Out, not done → `MAINTENANCE_ASSET_ON_LOAN` (unchanged).
  - Validation: `{ done: true }` without outcome → a `repairOutcomeRequired` issue on `outcome`; `{ done: false, outcome: "usable" }` parses, `outcome` kept for the service to drop.
  - Service, with `now = 2026-11-02T17:30:00Z` (Review Focus 1):
    - A create dated `2026-11-03` is accepted; one dated `2026-11-04` throws `MAINTENANCE_DATE_IN_FUTURE` with `{ reportedDate: "repairDateInFuture" }` and writes nothing.
    - A completion dated `2026-11-04` throws with `{ returnDate: "repairDateInFuture" }`; an edit dated `2026-11-04` throws with `{ reportedDate: … }`.
    - A not-done create on Under Maintenance writes no status claim to a new status, creates an `in_progress` record and a `maintenance_create` movement with from = to.
    - A not-done PM create leaves the plan (no `maintenancePlan.update`) and stores `outcome: null`. A not-done PM create on a paused plan throws 409 `MAINTENANCE_PLAN_INVALID_TRANSITION`.
    - A done PM create moves the plan from `reportedDate` (today's test at `:182` stays).
    - A completion of a PM record with an active plan moves it from `returnDate`. With a paused or ended plan (`findFirst` returns null), it closes the record and calls no `maintenancePlan.update` (Review Focus 2).
- [ ] **Step 2: Run** `npx tsx --test tests/repair-record-policy.test.ts tests/repair-record-validation.test.ts tests/repair-record-service.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5: Commit** `feat(maintenance): a PM plan moves only when its visit is done, ยังซ่อมไม่เสร็จ on อยู่ระหว่างซ่อม, no date after today, and a done record names its result (group 5 plan 1)`

### Task 4: The PM plan's server checks and its asset options

**Files:**
- Modify:
  - `src/lib/maintenance-plan-service.ts`:
    - `generateMaintenancePlanNo(db, now: Date): Promise<string>`: `PM-<Bangkok YYYYMMDD>-<NNNN>`, counting plans whose `createdAt` falls in that Bangkok day (`gte startOfBangkokDay(now)`, `lt` the next day's start).
    - `createMaintenancePlanRecord(db, data, now: Date, include)`: wraps "number, then create" in `withPrismaUniqueRetry` (G5P1-R11).
    - `mutateMaintenancePlan`: the `update` action writes with `updateMany({ where: { id, updatedAt: input.expectedUpdatedAt }, data })`. A count of 0 throws `new MaintenanceApiError("MAINTENANCE_PLAN_CONFLICT", "The PM plan changed just now; reload and edit again", 409)`. Then it reads the plan back.
  - `src/lib/validations/maintenance.ts`: the `update` action gains `expectedUpdatedAt: z.coerce.date()`.
  - `src/app/api/maintenance-plans/route.ts`: the asset read selects `status.name`. A Disposed or Retired asset → `MAINTENANCE_PLAN_ASSET_WRITTEN_OFF` (400, "This asset is disposed or retired; a PM plan cannot be set up") through `getMaintenanceErrorPayload`. The create uses `createMaintenancePlanRecord`. The route's own `generateMaintenancePlanNo` goes.
  - `src/lib/maintenance-api-errors.ts`: codes `MAINTENANCE_PLAN_ASSET_WRITTEN_OFF`, `MAINTENANCE_PLAN_CONFLICT`.
  - `src/lib/api-error-catalog.ts`: `maintenancePlanAssetWrittenOff`, `maintenancePlanConflict`.
  - Messages through `<scratchpad>/g5/msg/p1-pm.json`: `maintenancePage.errors.MAINTENANCE_PLAN_ASSET_WRITTEN_OFF` and `apiErrors.maintenancePlanAssetWrittenOff` "ทรัพย์สินนี้ตัดจำหน่ายหรือปลดระวางแล้ว ตั้งแผน PM ไม่ได้"; `maintenancePage.errors.MAINTENANCE_PLAN_CONFLICT` and `apiErrors.maintenancePlanConflict` "แผนนี้ถูกแก้ไขหรือบันทึกว่าทำแล้วระหว่างที่เปิดหน้านี้ โหลดหน้าใหม่แล้วแก้อีกครั้ง".
  - `src/lib/maintenance-options.ts`: type `pmAsset` (G5P1-R13). `src/app/api/maintenance-options/route.ts` accepts it.
  - `src/components/maintenance/maintenance-plan-form.tsx`: the asset select uses `type="pmAsset"`; new prop `expectedUpdatedAt?: string`, sent with the `update` body.
  - `src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx`: passes `expectedUpdatedAt={plan.updatedAt.toISOString()}`.
- Test: `tests/maintenance-plan-service.test.ts`, `tests/maintenance-plan-routes.test.ts`, `tests/maintenance-options.test.ts` (the plan schema tests are in `maintenance-plan-routes.test.ts`), `tests/pm-plans-ui.test.ts`, `tests/maintenance-api-errors.test.ts`, `tests/api-error-catalog.test.ts`.

**Interfaces:**
- Produces: `generateMaintenancePlanNo`, `createMaintenancePlanRecord`; the option type `"pmAsset"`; the form prop `expectedUpdatedAt`.

- [ ] **Step 1: Write the failing tests.**
  - `generateMaintenancePlanNo` at `now = 2026-11-02T17:30:00Z` with a fake count of 2 → `"PM-20261103-0003"`, and the count's where is `createdAt: { gte: 2026-11-02T17:00:00.000Z, lt: 2026-11-03T17:00:00.000Z }`.
  - `createMaintenancePlanRecord`: the first `create` throws `{ code: "P2002" }` and the second succeeds. The number is read twice and the plan is returned (Review Focus 3).
  - `mutateMaintenancePlan` update with an `updateMany` count of 0 → `MAINTENANCE_PLAN_CONFLICT` 409 (Review Focus 4). Pause, resume and end are unchanged.
  - The schema: an `update` without `expectedUpdatedAt` fails to parse; pause does not need it.
  - Options: `pmAsset` leaves an asset with an open record enabled, and disables a Disposed one with reason `MAINTENANCE_PLAN_ASSET_WRITTEN_OFF`. `asset` is unchanged.
  - Route source: POST reads `status: { select: { name: true } }`, refuses written-off assets through `getMaintenanceErrorPayload`, and calls `createMaintenancePlanRecord(`.
- [ ] **Step 2: Run** `npx tsx --test tests/maintenance-plan-service.test.ts tests/maintenance-plan-routes.test.ts tests/maintenance-options.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5: Commit** `feat(pm): a PM plan refuses a written-off asset, numbers by the Bangkok day with a retry, refuses a stale edit, and may be set up for an asset under repair (group 5 plan 1)`

### Task 5: The way back, one replacement rule, and the list's dates on Bangkok days

**Files:**
- Modify:
  - `src/lib/operational-return-navigation.ts`:
    - `normalizeMaintenanceReturnTo(locale: string, value: ReturnToParam, list: "maintenance" | "maintenance-pm"): string`. It accepts `/{locale}/maintenance` (query and hash), `/{locale}/maintenance/pm` (query) and `/{locale}/assets/<id>` (exactly one non-empty segment, query). Anything else falls back to the list's path.
    - `maintenanceListCrumbHref(returnTo: string, listPath: string): string` (G5P1-R14).
  - Pages, each with `returnTo` from the helper:
    - `maintenance/new/page.tsx` (list `maintenance`; crumb `/{locale}/maintenance`).
    - `maintenance/[id]/page.tsx` (list `maintenance`; crumb as new; the print and disposal links keep `appendOperationalReturnTo(…, returnToHref)`).
    - `maintenance/pm/new/page.tsx`: reads `returnTo` (list `maintenance-pm`) and passes `returnHref` to the form; the crumb is `/{locale}/maintenance/pm`.
    - `maintenance/pm/[id]/edit/page.tsx` (list `maintenance-pm`).
  - `src/lib/asset-actions.ts`: `AssetActionInput.repairReturnTo?: string`. The `recordRepair` href appends it when set (`appendOperationalReturnTo`). Update the comment "No returnTo: the repair form goes back only to the repair list."
  - `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`: `repairReturnTo: \`/${locale}/assets/${id}\``.
  - `src/components/assets/detail/asset-maintenance-tab.tsx:195`: "ตั้งรอบ PM" appends `returnTo=/{locale}/assets/<id>?view=maintenance`.
  - `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx:77-81, 108-112`: the panel reads `summarizeAssetRepairs` (G5P1-R16). Load `maintenanceTicket.findMany({ where: { assetId, isActive: true }, select: { id, repairStatus, maintenancePlanId, reportedDate, returnDate, repairCost } })` in place of the aggregate. Use `replacementWarning`, `repairCount` and `totalCost`; the ratio line stays for a purchase price.
  - `src/lib/maintenance-query.ts:97-130`: `normalizeDate` checks the value through `T00:00:00.000Z` and `toISOString`; `startOfDay(value)` is `new Date(\`${value}T00:00:00.000+07:00\`)`; `nextDay` adds 24 hours.
- Test: `tests/operational-return-navigation.test.ts` (the source pins of `:20-35` move to the new helper), `tests/asset-actions.test.ts`, `tests/asset-maintenance-tab-ui.test.ts`, `tests/maintenance-query.test.ts`, `tests/repair-record-detail-ui.test.ts`, `tests/pm-plans-ui.test.ts`.

**Interfaces:**
- Consumes: `summarizeAssetRepairs` (`src/lib/asset-repair-rules.ts:49`).
- Produces: `normalizeMaintenanceReturnTo`, `maintenanceListCrumbHref`, `AssetActionInput.repairReturnTo`.

- [ ] **Step 1: Write the failing tests.**
  - `normalizeMaintenanceReturnTo("th", v, "maintenance")`:
    - `/th/maintenance?status=in_progress#stuck` → itself.
    - `/th/maintenance/pm?due=overdue` → itself.
    - `/th/assets/a-1?view=maintenance` → itself.
    - Review Focus 5: `//evil.example/x`, `/th/assets/a-1/edit`, `/th/assets/`, `/en/assets/a-1` and `/th/maintenance/../admin` → `/th/maintenance`.
    - Undefined → `/th/maintenance`.
    - With list `maintenance-pm`, undefined → `/th/maintenance/pm`.
  - `maintenanceListCrumbHref("/th/maintenance?page=2", "/th/maintenance")` → `"/th/maintenance?page=2"`; `("/th/assets/a-1", "/th/maintenance")` → `"/th/maintenance"`.
  - `getAssetRecordRepairAction({ ...base, repairReturnTo: "/th/assets/a-1" }).href` → `"/th/maintenance/new?assetId=a-1&returnTo=%2Fth%2Fassets%2Fa-1"`; without it, unchanged.
  - The maintenance query: `from=2026-11-03` → `gte 2026-11-02T17:00:00.000Z`; `to=2026-11-03` → `lt 2026-11-03T17:00:00.000Z`; `from=2026-02-30` is dropped.
  - Source pins: the record page calls `summarizeAssetRepairs(` and no longer aggregates `_count`; the PM new page reads `returnTo`; the tab's PM link carries `returnTo`.
- [ ] **Step 2: Run** `npx tsx --test tests/operational-return-navigation.test.ts tests/asset-actions.test.ts tests/maintenance-query.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5: Commit** `feat(maintenance): the repair and PM forms come back to the asset page or the PM list, the record page counts repairs as the asset tab does, and the list's dates are Bangkok days (group 5 plan 1)`

### Task 6: Docs and the targeted E2E (controller)

**Docs:**
- `docs/06_WORKFLOWS.md` and `docs/17_REPAIR_RECORD_GUIDE_TH.md`:
  - the PM advance rule;
  - ยังซ่อมไม่เสร็จ on อยู่ระหว่างซ่อม;
  - no date after today;
  - the done result is required;
  - a PM plan for an asset under repair.
- The overdue word in `docs/02_ARCHITECTURE.md`, `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md` and `docs/12_HANDOUT.md` where they describe today's screens. Past plans and the changelog's history stay.
- `docs/99_CHANGELOG.md` and `DEVELOPER_HANDOFF.md`.
- The wiki: `ams-status`, `ams-open-questions` (the plan 1 rulings and G5P1-R1), `ams-log`, then lint.

**E2E on the dev DB** (VPN probe, keep-awake), 4 projects: `e2e/repair`, `e2e/dashboard` and `e2e/asset-detail`. The spec asks for the dashboard specs before merge (§17); the others hold the words and links this plan changes.

**Dry run:** none. No migration and no Production data. Every change is code, and the E2E runs on the dev DB.
