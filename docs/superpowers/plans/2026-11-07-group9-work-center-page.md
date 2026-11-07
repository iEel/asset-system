# Page group 9, plan 2: the work center page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/work-center` rebuilt to boards `WC` (desktop) and `WC-Phone`, on plan 1's data and rules, keeping every
working feature.

**Architecture:** One server loader (`src/lib/work-center-page-data.ts`) gathers everything the page shows; the page
renders it with small server components in `src/components/work-center/`. URLs stay `?view=all|mine&panel=…`, plus
`show`. Opening the page with `view=all` records the day's counts (§6.1).

**Tech Stack:** Next.js 16 (App Router, server components), next-intl, Tailwind, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-07-page-group-9-work-center-notifications-design.md` §4, §6.1, §7, §8.
Boards: `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g9-boards\project\WC.dc.html`
and `WC-Phone.dc.html` (open them in a browser or read their text). Plan 1:
`docs/superpowers/plans/2026-11-07-group9-data-rules.md`.

## Global Constraints

- Thai first; words from spec §7 ("ศูนย์งานค้าง" everywhere, "ภาพรวม" first tab); glossary `docs/19_THAI_GLOSSARY.md`;
  messages only via `node scripts/messages-edit.mjs` (dotted keys), English ICU plurals.
- Every number is a database count; the table says "แสดง n จาก m".
- Permissions as plan 1 (row readers gate by module view; ข้อมูลไม่ครบ needs `asset:view`; tracking panel's round needs `audit:view`).
- Reuse UI parts: `PageHeader`, `Segmented`, `StatStrip`, `TabNav`, `DataTable`, `RowActions` (its `next` link + groups = ขั้นถัดไป + ⋯),
  `ContentPanel`, `EmptyNote`/`ActionEmptyState`, `Notice`, `PaceBar`; no new design tokens.
- Touch targets 44px below `md`; both themes; no horizontal page scroll at 390.
- Source-pin tests CRLF-safe. No Playwright inside tasks (controller runs E2E and the look step).

## Review Focus

1. A user with only `dashboard:view` (no approve, no module views): the page shows the header, an empty backlog (0),
   no queue tabs except ภาพรวม, and the empty state — no error — Task 1 test `a user with no queue sees an empty page`.
2. `view=mine` for a user with no employee and no department: today's notice, counts 0, no "เมื่อวาน", and nothing is
   recorded — Task 1 test `mine never records and never compares`.
3. `show=999` or junk: the table shows at most 200 rows and the "แสดงเพิ่ม" link disappears when all rows are shown —
   Task 2 test `the more link stops at the total`.
4. Recording fails (database error): the page still renders — Task 1 test `a failed recording does not break the page`.
5. Two open audit rounds: the tracking panel shows the one with the most items left; none open → the panel's round
   line is absent but data issues and advance warnings stay — Task 1 test `tracking picks the round with most left`.

---

### Task 1: The page loader

**Files:**
- Create: `src/lib/work-center-page-data.ts`, `tests/work-center-page-data.test.ts`
- Modify: `src/lib/work-center-view.ts` (`WorkCenterParams` gains `show: number`, parsed with `parseWorkShow`;
  `buildWorkCenterHref` writes `show` only when it is not 8)

**Interfaces:**
- Consumes (plan 1): `getWaitingWork`, `buildWorkQueueSummary`, `WorkQueue`, `queueKeysFor`; `getWorkCenterRows(user, work, { today, scope, queue, show, locale, returnTo, slaDays })`
  → `{ rows: WorkRow[]; total }`; `WorkCenterUserScope` and the scope helpers in `work-center-scope.ts`;
  `countDataIssueAssets`; `recordDailyCounts`, `readPreviousDayCounts`, `compareWithPrevious`;
  `getNotificationSummary(user, locale).total` (unread topics); `getApprovalInboxSlaDays`.
- Produces:
  - `type WorkCenterPageData = {
      params: WorkCenterParams;
      mineUnavailable: boolean;
      summary: WorkQueueSummary;                     // counts of the current view (mine scoped except approvals)
      previous: { dayLabelDate: Date; isYesterday: boolean; backlogTotal: number; backlogChange: DailyCountComparison } | null; // null under mine or when unknown
      unreadTopics: number;
      tracking: { round: { id: string; auditNo: string; name: string; checked: number; total: number; pending: number } | null; dataIssues: number | null; advanceTotal: number };
      table: { rows: WorkRow[]; total: number; show: number } | null; // null on panel=assets
      assets: <today's assets-panel data: the three fix-card counts and the asset list> | null; // only on panel=assets
    }`.
  - `getWorkCenterPageData(user: SessionUser, input: { searchParams: WorkCenterParamInput; locale: string; now?: Date; returnTo: string }): Promise<WorkCenterPageData>`.
  - Mine counts: move today's `mineCounters` logic from the page into this loader (same wheres, same scope helpers),
    producing `WaitingWorkCounts` for `buildWorkQueueSummary` with the approvals part unchanged (always the user's own).
  - Recording: when `view=all`, after the counts, `recordDailyCounts(user.id, { ...every visible key's count, dataIssues })`
    inside try/catch (log `[work-center] recording daily counts failed` with no data; the page continues). Never under mine.
  - Previous: `readPreviousDayCounts`; `backlogTotal` = the sum of the previous day's counts over today's backlog
    keys (keys absent that day count 0); `backlogChange = compareWithPrevious(summary.backlogTotal, previousBacklog, true)`.
  - Tracking round: the operational round (same `auditRoundOperationalWhere` as today's `pendingAuditItems`, mine scope
    applied) with the most pending items; `checked = total - pending`; null without `audit:view` or none open.
  - `panel=assets`: today's assets data (fix-card counts with their `dataQuality=` links, the asset list, 24 rows) —
    move it from the page unchanged.
  - Queue tab: `queue` = the panel's queue (`approvals|maintenance|audit|disposal`), null on overview.

- [ ] **Step 1: Write failing tests** (inject the readers through an optional `deps` parameter, as plan 1's
  `readWorkRowLites` does): `a user with no queue sees an empty page`; `mine never records and never compares`;
  `a failed recording does not break the page`; `tracking picks the round with most left`; `previous backlog sums
  yesterday's backlog keys only` (advance keys excluded); `show is parsed and passed to the rows`;
  `assets panel loads no table`.
- [ ] **Step 2: Run** `node --test tests/work-center-page-data.test.ts` — FAIL.
- [ ] **Step 3: Implement** (the page itself is not changed in this task except to keep compiling if a moved helper
  is imported from the new module).
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit -p .` — PASS.
- [ ] **Step 5: Commit** `feat(work-center): the page loader for boards WC/WC-Phone: view-scoped queue summary, previous day, unread topics, tracking, ranked rows with show, recording on view=all (group 9 plan 2 task 1)`.

### Task 2: The desktop page (`WC`)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/work-center/page.tsx` (rewritten on `getWorkCenterPageData`)
- Create: `src/components/work-center/work-center-strip.tsx`, `work-center-tracking.tsx`, `work-center-tabs.tsx`,
  `work-rows-table.tsx`, `work-center-assets-panel.tsx` (today's fix cards and list, moved)
- Modify: messages (`workCenter.*`), the source-pin tests that pin the old page (`tests/list-pages-ui.test.ts`
  work-center block, `tests/work-center-view.test.ts`, `tests/work-center-metrics.test.ts`, `tests/permission-aware-navigation.test.ts`,
  and any other test grep finds); delete `src/lib/work-center-metrics.ts` and its test if nothing imports it any more.
- Create: `tests/work-center-page-board.test.ts`

**Interfaces:**
- Consumes: Task 1 `getWorkCenterPageData`, `WorkCenterPageData`; plan 1 `WorkRow` (with `urgency`, `nextStep`, `menu`, `context`).

**Layout (board `WC`, desktop from `md`):**
- `PageHeader` title ศูนย์งานค้าง, the board's sentence; beside the title a `Segmented` link pair งานทั้งหมด / งานของฉัน
  (links to `view=all|mine`, keeping `panel`); right: a button-link **การแจ้งเตือน** with the unread-topic count
  badge to `/notifications`. Today's `myWorkUnavailable` notice stays.
- Strip (`work-center-strip.tsx`): first card **ต้องทำวันนี้ n** with "รออนุมัติ a + อนุมัติแล้วรอบันทึกตัดจำหน่าย b" and
  two links (พิจารณา a งาน → `/admin/approvals`, shown with approvals; บันทึกตัดจำหน่าย b → `/disposal?status=approved`,
  shown when b > 0); second card **งานค้างทั้งหมด n** with "เมื่อวาน m · เพิ่ม k / ลด k / เท่าเดิม" (or "เมื่อ {date} m"
  when the previous day is not yesterday; nothing when `previous` is null); then one cell per visible queue (count,
  link to its tab); under the strip the sum line "19 + 10 + 6 + 3 = 38 · นับจากฐานข้อมูลทั้งหมด ไม่ใช่เฉพาะรายการที่แสดง"
  (the visible queues' counts joined with " + ").
- **ติดตามแยก ไม่นับเป็นงานค้าง** (`work-center-tracking.tsx`), beside the strip from `xl`, under it below: the round
  (name, `PaceBar` checked/total, AUD- no, "ยังไม่ตรวจ n", link **เดินตรวจต่อ** → `/audit/rounds/{id}/scan`), ข้อมูลทะเบียนไม่ครบ
  n ชิ้น (→ `panel=assets`, with `asset:view`), เตือนล่วงหน้า (คืน · ประกัน · License) n (→ `/notifications#advance`). Hidden
  entirely when all three are absent.
- Tabs (`work-center-tabs.tsx`, `TabNav`): ภาพรวม (backlog), each visible queue (count), ข้อมูลไม่ครบ (n ชิ้น, with
  `asset:view`); links keep `view`, drop `show`.
- Table (`work-rows-table.tsx`, `DataTable`): header "เรียง: เร่งด่วนก่อน"; columns ความเร่งด่วน (dot + sr-only word),
  งาน (title bold; `assetTag · documentNo` mono meta; context line meta), คิว · ประเภท (queue label; kind label),
  ค้าง (age line + deadline line: "รอ n วัน / ค้าง n วัน / ครบกำหนด {date}" and "เกิน SLA n วัน / เลยกำหนด n วัน / อีก n วัน / ตั้งแต่ {date}"),
  ขั้นถัดไป + ⋯ via `RowActions` (`next` = nextStep, groups = menu items with their labels
  `workCenter.menu.openRecord|openAsset|printRequest`). Under the table: the legend (เกินกำหนด / ต้องทำ / พร้อมดำเนินการ
  dots), "แสดง n จาก m · เกินกำหนดก่อน แล้วค้างนานสุด", and **แสดงเพิ่ม k รายการ** (`show + 8`, k = min(8, m − n)) only
  while n < m and n < 200.
- Queue tab: above the table the queue's parts line (approvals: `approvalParts`; maintenance/audit/disposal: their keys'
  labels and counts joined with " · ") and one link to the source page named by destination
  (`workCenter.goTo.approvals` "ไปหน้างานรออนุมัติ", `.maintenance` "ไปหน้าซ่อมบำรุง", `.audit` "ไปหน้ารายการไม่ตรง", `.disposal`
  "ไปหน้าตัดจำหน่าย").
- Assets tab: today's fix cards and asset list (moved component), unchanged behaviour.
- Empty states: per queue, today's words (`noApprovalInboxIssues`, `noMaintenanceIssues`, `noAuditIssues`,
  `noDisposalIssues`); overview with 0 rows: "ไม่มีงานค้าง" (`workCenter.noBacklog`).

- [ ] **Step 1: Write failing source pins** (`tests/work-center-page-board.test.ts`): the page calls
  `getWorkCenterPageData`; header has the Segmented view switch and the notifications link with the unread count;
  strip renders ต้องทำวันนี้ and งานค้างทั้งหมด with the previous-day line; the tracking panel links
  `/audit/rounds/${round.id}/scan`; tabs come from the visible queues; the table uses `RowActions` with `next`; the
  more link appears only while `rows.length < total` and `< 200` (`the more link stops at the total`); queue parts and
  the goTo link; the assets panel component; messages exist in th and en.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; update or remove the old page's source pins (keep pins for kept features: `view=mine`
  notice, `panel=` deep links, data-quality cards, empty states).
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit -p .`, `npx eslint` on changed files — PASS.
- [ ] **Step 5: Commit** `feat(work-center): the page to board WC: view switch and notifications link, ต้องทำวันนี้ and งานค้างทั้งหมด with yesterday, ติดตามแยก, queue tabs, one ranked table with urgency, next step and ⋯, แสดงเพิ่ม (group 9 plan 2 task 2)`.

### Task 3: The phone (`WC-Phone`)

**Files:**
- Modify: the Task 2 components (phone layout below `md`); `tests/work-center-page-board.test.ts`

**Layout (below `md`, board `WC-Phone`):** the view switch full width under the title; the ต้องทำวันนี้ card (number,
"รออนุมัติ a" / "+ อนุมัติแล้วรอบันทึกตัดจำหน่าย b"), then one line "งานค้างทั้งหมด n = a + b + c + d · เมื่อวาน m"; the tabs
as a 3 × 2 grid (`grid grid-cols-3`, each cell label + count, the current one pressed; ข้อมูลไม่ครบ fills the sixth cell);
queue tab header (name, count, parts line, goTo link); rows as cards: title (2-line clamp), `assetTag · documentNo`,
kind + context line, age line (+ overdue line in danger), the next-step button full width (44px), ⋯ in the card's
corner (RowActions `menu="sheet"`); "แสดง n จาก m" + แสดงเพิ่ม; ติดตามแยก after the list (round: name, ตรวจแล้ว x / y,
ยังไม่ตรวจ n, เดินตรวจต่อ ›). The page never scrolls sideways at 390. The bottom nav keeps เพิ่มเติม active (unchanged).

- [ ] **Step 1: Write failing pins:** the tabs container is `grid-cols-3` below `md`; cards render below `md` and the
  table from `md`; the card's next-step link is full width with `min-h-11`; the title clamps at 2 lines; tracking
  renders after the list on phones.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit -p .` — PASS.
- [ ] **Step 5: Commit** `feat(work-center): the phone layout to board WC-Phone: 3 × 2 queue grid, row cards with a full-width next step, tracking after the list (group 9 plan 2 task 3)`.

### Task 4 (controller)

- [ ] Build; look step at 1440 (light, dark), 1024 and 390 (light, dark) with a run IT head session; fix what the look
  shows through an implementer; E2E `e2e/shell`, `e2e/dashboard` (the work-center links); whole-branch review Workflow
  3×2 with one fix pass; docs, wiki, memory.

## Plan rulings

- **G9P2-R1** The work center records the day's counts only on `view=all` (spec §6.1); the notifications page records in plan 3.
- **G9P2-R2** "เตือนล่วงหน้า" in the tracking panel links to the notifications page's advance section (`#advance`), which plan 3 builds.
- **G9P2-R3** `work-center-metrics.ts` is removed if the rewrite leaves it unused (its urgent count is replaced by `summary.today`).
