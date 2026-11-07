# Page group 9, plan 1: data and rules for the work center and notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything plans 2 and 3 render: the migration, the queue grouping and totals (with the dashboard following),
the overview rows with urgency and next steps, yesterday's counts, the bell's unread-topic number and the digest's
structured days.

**Architecture:** Pure rules in small `src/lib/` modules with unit tests; Prisma readers beside them. The pages
change only where this plan says (the dashboard's งานที่รอคุณ total; the work-center and notifications pages call the
recorder). No UI redesign here (plans 2 and 3).

**Tech Stack:** Next.js 16, Prisma 7 on SQL Server, `node --test` (`npm test`), next-intl.

**Spec:** `docs/superpowers/specs/2026-11-07-page-group-9-work-center-notifications-design.md` (§3, §3.1, §4.2, §5.1,
§5.3, §6). Branch `feat/group9-work-center` (spec `0baf48e7`).

## Global Constraints

- Bangkok days everywhere (`startOfBangkokDay` and the existing day helpers); never the UTC date for a "day".
- Every number is a database count; rows are a bounded slice. ID lists passed to `IN` are chunked by 2,000.
- Permissions stay as `waitingWorkVisibleKeys` decides; row readers add each module's view permission (§4.2 fix).
- Messages only through `node scripts/messages-edit.mjs` (dotted keys); glossary `docs/19_THAI_GLOSSARY.md`; English ICU plurals.
- Source-pin tests are CRLF-safe (`.replace(/\r\n/g, "\n")` or `\r?\n`).
- The migration is a manual SQL file under `prisma/manual-migrations/`, idempotent (`sys.*` / `COL_LENGTH` guards),
  applied to `asset_management_dev` only by the controller; Production only at deploy with the user's approval.
- E2E is not run inside tasks (the controller runs it).

## Review Focus

1. A user with no approve permission: รออนุมัติ is absent, and pending findings/disposals land in ตรวจนับ/ตัดจำหน่าย
   (counted once, not twice) — Task 2 test `queues move pending items when the inbox is hidden`.
2. A user who never opened the pages before today: no "เมื่อวาน", no arrows, every key reads as unknown, not "ใหม่" —
   Task 5 test `no earlier day means no comparison`.
3. Two visits on the same day after the digest: `count` follows the later visit, `digestCount` keeps the 07:30 number —
   Task 5 test `a later visit never overwrites digestCount`.
4. A row whose deadline is today vs one 8 days away vs none: ต้องทำ / พร้อมดำเนินการ / ต้องทำ — Task 3 test
   `urgency at the seven-day edge`.
5. `show` in the URL as junk, 0, negative, 7, or huge: falls to 8 / the next multiple of 8 / at most 200 — Task 3 test
   `parseWorkShow clamps`.

---

### Task 1: Migration and the read time

**Files:**
- Create: `prisma/manual-migrations/2026-11-07-add-notification-daily-counts.sql`
- Modify: `prisma/schema.prisma` (model `NotificationDailyCount`; `NotificationUserState.readAt DateTime?`)
- Modify: `src/lib/notification-center.ts` (`buildNotificationStateUpdate`), `src/app/api/notifications/route.ts` (`read_all`)
- Modify: `docs/03_DATABASE.md` (the file's paragraph, as the other manual migrations; add it to the deploy-day order as step 4)
- Test: `tests/notification-center.test.ts`, `tests/notification-daily-counts-migration.test.ts` (new)

**Interfaces:**
- Produces: Prisma model `NotificationDailyCount { id String @id @default(uuid()); userId String @db.NVarChar(100); day DateTime @db.Date; key String @db.NVarChar(50); count Int; digestCount Int?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; @@unique([userId, day, key], map: "UX_notification_daily_counts_user_day_key"); @@index([userId, day], map: "IX_notification_daily_counts_user_day"); @@index([day], map: "IX_notification_daily_counts_day"); @@map("notification_daily_counts") }`; `NotificationUserState.readAt DateTime?`.

- [ ] **Step 1: Write failing tests.** `tests/notification-daily-counts-migration.test.ts`: the SQL file creates
  `notification_daily_counts` with exactly the columns above (`day DATE NOT NULL`, `digestCount INT NULL`), the unique
  and both indexes by those names, adds `notification_user_states.readAt DATETIME2 NULL`, guards every object
  (`sys.tables`, `sys.indexes`, `COL_LENGTH`), has a rollback comment, and the schema's index `map` names equal the
  SQL's. In `tests/notification-center.test.ts`: `buildNotificationStateUpdate` with `read` sets `readAt` to `now`;
  `unread` and `snooze` set `readAt: null`; `assign` leaves `readAt` out of the update.
- [ ] **Step 2: Run** `node --test tests/notification-daily-counts-migration.test.ts tests/notification-center.test.ts` — FAIL.
- [ ] **Step 3: Implement** the SQL (style of `2026-11-05-add-disposal-rounds.sql`: header, run instructions,
  rollback comment, `PK_notification_daily_counts`, `DF_…` defaults with `SYSUTCDATETIME()`), the schema, and `readAt`
  in `buildNotificationStateUpdate`. `read_all` in the route sets `readAt: now` on every row it marks read (including
  rows it creates). The bell's row-open uses the `read` action already, so it gets `readAt` from the same function.
  Run `npm run prisma:generate`.
- [ ] **Step 4: Run** the two tests and `npx tsc --noEmit -p .` — PASS.
- [ ] **Step 5: Commit** `feat(notifications): migration notification_daily_counts and NotificationUserState.readAt (group 9 plan 1 task 1)`.

### Task 2: Queues, totals and the dashboard

**Files:**
- Create: `src/lib/work-queues.ts`, `tests/work-queues.test.ts`
- Modify: `src/lib/dashboard-page.ts` (`buildDashboardWaiting`), `src/app/[locale]/(dashboard)/dashboard/page.tsx` (the
  waiting section lists advance warnings under the heading เตือนล่วงหน้า), messages, the dashboard tests that pin the total
- Create or modify: `src/lib/work-center-data-issues.ts` (`countDataIssueAssets`)

**Interfaces:**
- Consumes: `WaitingWork` (`counts`, `visibleKeys`, `approvalInbox: { total, disposal, audit }`) from `getWaitingWork`.
- Produces:
  - `WORK_QUEUES = ["approvals", "maintenance", "audit", "disposal"] as const`; `type WorkQueue`.
  - `ADVANCE_WARNING_KEYS = ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"] as const`.
  - `queueKeysFor(queue: WorkQueue): readonly WaitingWorkKey[]` — approvals: `approvalInbox`; maintenance:
    `openRepairs`, `stuckRepairs`, `duePm`; audit: `openAuditActions`, `auditActionsDueSoon`, `pendingAuditFindings`;
    disposal: `approvedDisposals`, `pendingDisposals`. (`pendingAuditFindings` / `pendingDisposals` are only ever
    visible when the inbox does not hold them — `waitingWorkVisibleKeys` already decides it.)
  - `buildWorkQueueSummary(work: Pick<WaitingWork, "counts" | "visibleKeys" | "approvalInbox">): WorkQueueSummary` where
    `WorkQueueSummary = { queues: { queue: WorkQueue; count: number; keys: WaitingWorkKey[] }[] /* only queues with a visible key, in WORK_QUEUES order */; backlogTotal: number; today: { total: number; approvals: number; approvedDisposals: number }; approvalParts: { disposal: number; audit: number; round: number } | null; advance: { total: number; keys: WaitingWorkKey[] } }`.
    `round = approvalInbox.total - disposal - audit`. `today.approvals` = the approvals queue count (0 when absent).
  - `countDataIssueAssets(user: SessionUser): Promise<number | null>` — `null` without `asset:view`; else the number of
    active assets matching any of the register's `dataQuality` `responsibility`, `serial`, `photo` wheres (one asset once:
    `OR` of the three wheres in one `count`). Reuse the register's where builders.
  - `buildDashboardWaiting` returns `{ rows, advanceRows, zeroKeys, total, oldest }`: `rows` = visible queue keys with
    count > 0; `advanceRows` = the advance keys with count > 0; `total` = `buildWorkQueueSummary(...).backlogTotal`;
    `oldest` from `rows` only (as today, an expiry is never a wait).

- [ ] **Step 1: Write failing tests** (`tests/work-queues.test.ts`): `queues group the keys and sum the backlog` (the
  board's numbers: inbox 19 = disposal 4 + audit 14 + round 1; openRepairs 7, duePm 3; openAuditActions 4,
  auditActionsDueSoon 2; approvedDisposals 3; advance 2/5/1 → backlogTotal 38, today 22 (19 + 3), advance 8,
  approvalParts {4, 14, 1}); `queues move pending items when the inbox is hidden` (no approval access, pendingAuditFindings 5
  and pendingDisposals 2 visible → no approvals queue, audit and disposal include them, backlogTotal counts each once,
  approvalParts null); `a queue with no visible key is absent`. Dashboard: `buildDashboardWaiting total excludes advance
  warnings` and `advanceRows hold returns, warranty and licence`.
- [ ] **Step 2: Run** `node --test tests/work-queues.test.ts tests/dashboard*.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Dashboard page: the waiting section renders `rows` as today and, when `advanceRows` is
  not empty, a sub-heading `dashboard.advanceWarnings` "เตือนล่วงหน้า" (en "Coming up") with those rows; the KPI cell's
  number is `total`. `countDataIssueAssets` is not used by a page yet (plan 2).
- [ ] **Step 4: Run** `npm test` — PASS (update dashboard source pins that change; CRLF-safe).
- [ ] **Step 5: Commit** `feat(work-center): queue grouping, backlog and today totals, distinct data-issue count; the dashboard's งานที่รอคุณ counts the same backlog (group 9 plan 1 task 2)`.

### Task 3: Row rules — urgency, order, next steps, paging

**Files:**
- Create: `src/lib/work-center-rows.ts`, `tests/work-center-rows.test.ts`

**Interfaces:**
- Produces:
  - `type WorkRowKind = "disposalApproval" | "findingApproval" | "roundClose" | "approvedDisposal" | "duePm" | "openRepair" | "stuckRepair" | "auditAction" | "pendingFinding" | "pendingDisposal"`.
  - `workRowQueue(kind): WorkQueue` (the first three → approvals; approvedDisposal, pendingDisposal → disposal;
    duePm, openRepair, stuckRepair → maintenance; auditAction, pendingFinding → audit).
  - `type WorkRowLite = { kind: WorkRowKind; id: string; since: Date; deadline: Date | null; number: string }`.
  - `type WorkRowUrgency = "overdue" | "todo" | "ready"`; `workRowUrgency(row: WorkRowLite, today: Date): WorkRowUrgency`
    — overdue: deadline before `today`; todo: deadline within today..today+7 (inclusive) or no deadline; ready:
    deadline after today+7. `WORK_ROW_SOON_DAYS = 7`.
  - `rankWorkRows(rows: readonly WorkRowLite[], today: Date): WorkRowLite[]` — overdue rows by days overdue (most
    first), then the rest by `since` (oldest first); ties by `number` ascending (string compare).
  - `workRowNextStep(kind, ids: { id: string; assetId: string | null; planId?: string | null; findingId?: string }, locale: string): { labelKey: string; href: string }` —
    disposalApproval / findingApproval / roundClose → `approvalInboxItemHref(locale, "disposal"|"finding"|"round", id)`;
    approvedDisposal → `/${locale}/disposal/rounds/new`; duePm → `/${locale}/maintenance/new?planId=${planId}`;
    openRepair → `/${locale}/maintenance/${id}`; stuckRepair → `/${locale}/maintenance/new?assetId=${assetId}`;
    auditAction and pendingFinding → `/${locale}/audit/findings?finding=${id}`; pendingDisposal → `/${locale}/disposal/${id}`.
    Label keys under `workCenter.nextStep.*`: reviewRequest พิจารณาคำขอ, reviewFinding พิจารณารายการไม่ตรง, approveClose
    อนุมัติปิดรอบ, recordDisposal บันทึกตัดจำหน่าย, recordPmDone บันทึกว่าทำแล้ว, recordRepairDone บันทึกว่าซ่อมเสร็จ,
    openRepair เปิดงานซ่อม, updateAction อัปเดตแผนแก้ไข, openFinding เปิดรายการ, openRequest เปิดคำขอ.
    Every href goes through the app's `appendOperationalReturnTo` with the work center's own URL when the caller passes
    `returnTo` (add an optional 4th parameter `returnTo?: string`).
  - `WORK_SHOW_STEP = 8`, `WORK_SHOW_MAX = 200`; `parseWorkShow(raw: string | string[] | undefined): number` — the
    smallest multiple of 8 ≥ the number, between 8 and 200; junk/≤0 → 8.

- [ ] **Step 1: Write failing tests:** `urgency at the seven-day edge` (deadline yesterday → overdue; today → todo;
  today+7 → todo; today+8 → ready; null → todo); `rankWorkRows puts overdue first by days overdue, then oldest since,
  then number`; `next step per kind` (each kind's href and labelKey, `returnTo` appended); `parseWorkShow clamps`
  (undefined→8, "abc"→8, "0"→8, "-3"→8, "7"→8, "9"→16, "16"→16, "999"→200, ["24","8"]→24).
- [ ] **Step 2: Run** `node --test tests/work-center-rows.test.ts` — FAIL.
- [ ] **Step 3: Implement** (pure; day arithmetic with the existing Bangkok day helpers; add the `workCenter.nextStep.*` messages).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(work-center): row urgency, order, next steps and paging rules (group 9 plan 1 task 3)`.

### Task 4: Row readers — light records, scope, hydration

**Files:**
- Create: `src/lib/work-center-scope.ts` (moved from `work-center/page.tsx` ~678–775: `WorkCenterUserScope`,
  `applyAssetWorkCenterScope`, `applyMaintenanceWorkCenterScope`, `applyPlanWorkCenterScope`, the audit and disposal
  ones, `getScopedWhere`, `applyWorkCenterScope`; the page imports them), `src/lib/work-center-row-data.ts`,
  `tests/work-center-row-data.test.ts`

**Interfaces:**
- Consumes: Task 2 `WorkQueue`, `buildWorkQueueSummary`; Task 3 `WorkRowLite`, `rankWorkRows`, `workRowNextStep`,
  `workRowUrgency`; `getApprovalInboxSnapshot` (or its loaders) for the approval rows and their `?item=` ids;
  `getApprovalAgeStatus` + `workflow_approval_sla_days` for approval deadlines.
- Produces:
  - `readWorkRowLites(user: SessionUser, work: WaitingWork, options: { today: Date; scope: WorkCenterUserScope | null; queue: WorkQueue | null; slaDays: number }): Promise<WorkRowLite[]>`
    — one light read per visible kind (select id, the since date, the deadline, the number), each gated by its
    key's visibility **and** its module view permission (`maintenance:view`, `audit:view`, `disposal:view`; approval
    rows by the inbox access). `scope` (งานของฉัน) applies the moved scope wheres to every kind except the approval
    rows (always the user's own). `queue` keeps only that queue's kinds.
    Since / deadline per kind: disposalApproval: requested date / since + SLA; findingApproval: reported date / since +
    SLA; roundClose: the date it became ready to close (latest finding resolution or the round's updatedAt — use what
    the inbox already uses for its age) / since + SLA; approvedDisposal: approved date / none; duePm: plan createdAt /
    `nextDueDate`; openRepair: `reportedDate` / none; stuckRepair: the asset's repair-status since date
    (`stuckRepairsOldestSince` logic) / none; auditAction: finding updatedAt / `actionDueDate` (null when none);
    pendingFinding: reported date / none; pendingDisposal: requested date / none. Number: the record's document
    number (DP-/MT-/PM-/AUD-/asset tag for stuck repairs).
  - `type WorkRow = WorkRowLite & { queue: WorkQueue; urgency: WorkRowUrgency; assetName: string | null; assetTag: string | null; title: string /* asset name, or the round's name for roundClose */; documentNo: string | null; context: { key: string; values: Record<string, string> } | null; ageDays: number; overdueDays: number; dueInDays: number | null; nextStep: { labelKey: string; href: string }; menu: { key: "openRecord" | "openAsset" | "printRequest"; href: string }[] }`.
  - `loadWorkRows(user: SessionUser, lites: readonly WorkRowLite[], options: { today: Date; locale: string; returnTo: string }): Promise<WorkRow[]>`
    — hydrates only the given lites (chunked id lists), in the given order. `context` keys under
    `workCenter.rowContext.*`: requestedBy (ขอโดย {name} {department}), locationChange (ที่ตั้ง {from} → {to}),
    holderChange (ผู้ถือครอง {from} → {to}), reportedBy (ตรวจโดย {name}), approvedBy (อนุมัติโดย {name} {date}),
    planTitle (แผน PM {title} · {location}), actionPlan (แผนแก้ไข: {plan} · ผู้รับผิดชอบ {owner}), repairProblem
    ({problem} · ผู้บันทึก {name}), roundProgress (ตรวจครบ {done} / {total}). Menu: openRecord (the record page),
    openAsset (`/assets/{assetId}` with `asset:view`), printRequest (the disposal request's print page, disposal rows,
    with `disposal:view`).
  - `getWorkCenterRows(user, work, options: { today; scope; queue; show; locale; returnTo; slaDays }): Promise<{ rows: WorkRow[]; total: number }>`
    = `readWorkRowLites` → `rankWorkRows` → first `show` → `loadWorkRows`; `total` = the lites' length.

- [ ] **Step 1: Write failing tests** (pure parts with fake readers injected — give `readWorkRowLites` an optional
  `readers` parameter defaulting to the Prisma ones): `a hidden key reads nothing`; `maintenance rows need
  maintenance:view even when the key is visible` (a key visible through another rule never leaks rows);
  `scope applies to every kind but approvals`; `queue keeps only its kinds`; `getWorkCenterRows hydrates only the
  first show rows in rank order`. Source pin: the work-center page imports the scope functions from
  `@/lib/work-center-scope` and no longer defines them.
- [ ] **Step 2: Run** `node --test tests/work-center-row-data.test.ts` — FAIL.
- [ ] **Step 3: Implement** (move the scope code unchanged first; then the readers; messages for `rowContext`).
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit -p .` — PASS (existing work-center tests still pass: the page's
  behaviour is unchanged in this plan).
- [ ] **Step 5: Commit** `feat(work-center): row readers with permission and scope, ranked and hydrated rows (group 9 plan 1 task 4)`.

### Task 5: Daily counts, yesterday and the digest

**Files:**
- Create: `src/lib/notification-daily-counts.ts`, `tests/notification-daily-counts.test.ts`
- Modify: `src/lib/notification-digest.ts`, `src/lib/notification-digest-format.ts` (`buildDailyDigestReferenceId` by
  Bangkok day), `tests/notification-digest.test.ts`

**Interfaces:**
- Consumes: Task 1 model; Task 2 `buildWorkQueueSummary`, `countDataIssueAssets`.
- Produces:
  - `type DailyCountKey = WaitingWorkKey | "dataIssues"`.
  - `recordDailyCounts(userId: string, counts: Partial<Record<DailyCountKey, number>>, now?: Date): Promise<void>` —
    upsert one row per given key for the Bangkok day of `now` (`count` = the value; never touches `digestCount`);
    keys with `undefined` are skipped; one `$transaction`.
  - `readPreviousDayCounts(userId: string, now?: Date): Promise<{ day: Date; isYesterday: boolean; counts: Partial<Record<DailyCountKey, number>> } | null>`
    — the latest day before today with any row; `null` when none.
  - `compareWithPrevious(today: number, previous: number | undefined, hasPrevious: boolean): { kind: "up" | "down" | "same" | "new" | "unknown"; delta: number }`
    — no previous day → unknown; a previous day without the key and today > 0 → new; else up/down/same with |delta|.
  - `markDigestCounts(userId: string, counts: Partial<Record<DailyCountKey, number>>, now?: Date): Promise<void>` — for
    each key, upsert today's row and set `digestCount` only where it is null.
  - `readDigestDays(userId: string, options: { limit: number }): Promise<{ day: Date; topics: { key: DailyCountKey; count: number }[]; items: number }[]>` — days with any `digestCount`, newest first.
  - `pruneDailyCounts(now?: Date): Promise<number>` — deletes rows with `day` older than 35 Bangkok days.
  - `DAILY_COUNT_KEEP_DAYS = 35`.
- Digest (`deliverDailyNotificationDigest`), non-dry only: for each user with ≥1 visible key, `recordDailyCounts` with
  every visible key's count, then `markDigestCounts` with the active (unread, not snoozed) items it sends; after the
  loop, `pruneDailyCounts` once. Dry runs write nothing. The reference id uses the Bangkok day.

- [ ] **Step 1: Write failing tests:** `a later visit never overwrites digestCount` (record 46 at 07:30 via digest, then
  record 50 at 16:00 → count 50, digestCount 46; uses an in-memory fake of the three Prisma calls injected via an
  optional `db` parameter); `no earlier day means no comparison` (compare → unknown); `previous day not yesterday is
  flagged` (isYesterday false); `compare up/down/same/new`; `prune keeps 35 days` (day 35 kept, 36 deleted);
  `digest reference id is the Bangkok day` (2026-11-06T18:30Z → `notification-digest:2026-11-07`); `a dry digest
  writes no daily counts`.
- [ ] **Step 2: Run** `node --test tests/notification-daily-counts.test.ts tests/notification-digest.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** `feat(notifications): daily counts per user, the previous day, digest counts and the 35-day keep; digest day by Bangkok date (group 9 plan 1 task 5)`.

### Task 6: The bell counts unread topics

**Files:**
- Modify: `src/lib/notification-summary.ts` (`getNotificationSummary`), `src/lib/notification-center.ts`
  (`buildActiveNotificationSummary` gains `topics`), the bell/shell components only if they read `total` as items
  (`src/components/**/notification-bell.tsx`, `shell-notifications.tsx`), `e2e/shell/shell.spec.ts` and its steps if they
  assert the badge as a sum of items, tests.

**Interfaces:**
- Produces: `NotificationClientSummary.total` = the number of active topics (items with count > 0, not read, not
  snoozed). A new field `items[].count` stays the per-queue number. `buildActiveNotificationSummary(items)` returns
  `{ total /* items' count sum, kept for callers that need it */, topics: number }`; `getNotificationCenter` returns
  `activeTopics` beside `activeTotal`.

- [ ] **Step 1: Write failing tests:** `the badge counts unread topics` (three active rows with counts 19, 7, 3 and one
  read row → total 3); `a rise above lastCount brings a topic back` (as today, now +1 topic); the live region announces
  when the topic number rises (adjust the existing shell-notifications test).
- [ ] **Step 2: Run** `node --test tests/notification-summary.test.ts tests/shell-notifications.test.ts tests/notification-bell.test.ts` — FAIL.
- [ ] **Step 3: Implement**; the bell's aria label words (e.g. "การแจ้งเตือน มี n หัวข้อที่ยังไม่อ่าน") follow in
  messages; update `e2e/shell/shell.spec.ts` assertions that read the badge as a sum (do not run it).
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** `feat(notifications): the bell counts unread topics, not items (group 9 plan 1 task 6)`.

### Task 7 (controller)

- [ ] Apply the migration to `asset_management_dev` (`npm run migration:apply -- 2026-11-07-add-notification-daily-counts.sql --backup-confirmed --reason "group 9 plan 1, dev"`), record its checksum prefix in `docs/03_DATABASE.md`.
- [ ] E2E `e2e/shell` and `e2e/dashboard` (the bell and the dashboard total changed); whole-branch review Workflow 3×2 with one fix pass; docs, wiki, memory.

## Plan rulings

- **G9P1-R1** The `openRepairs` link stays `?status=in_progress`: the repair list's `in_progress` already means every
  record not closed or cancelled (`toRepairRecordStatus`), so spec §3's link fix needs no change.
- **G9P1-R2** Round-close rows' "since" is whatever the approval inbox already uses for that row's age, so the
  approvals page and the work center agree.
- **G9P1-R3** `today.approvals` counts the whole approvals queue; when the user has no approve permission, ต้องทำวันนี้
  is `approvedDisposals` alone.
