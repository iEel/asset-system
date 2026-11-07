# Page group 9, plan 3: the notifications page and E2E for both pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/notifications` rebuilt to board `NT` as an inbox of topics with status tabs, snooze choices, read times,
yesterday's change and the structured daily digest; E2E for the work center and the notifications page.

**Architecture:** A server loader (`src/lib/notifications-page-data.ts`) on plan 1's data (center items with state,
daily counts, digest days); the page renders sections of topic rows; the existing client actions component grows the
snooze choices and cancel-snooze. Opening the page records the day's counts (§6.1).

**Tech Stack:** Next.js 16, next-intl, Tailwind, `node --test`, Playwright (controller).

**Spec:** `docs/superpowers/specs/2026-11-07-page-group-9-work-center-notifications-design.md` §5, §6.1–6.2, §7, §8.
Board: `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g9-boards\project\NT.dc.html`.
Plans 1–2: `docs/superpowers/plans/2026-11-07-group9-data-rules.md`, `…-group9-work-center-page.md`.

## Global Constraints

- Thai first; words from spec §7 (การแจ้งเตือน; ทำเป็นอ่านแล้ว command vs อ่านแล้ว state; สรุปรายวันที่ส่งแล้ว); glossary;
  messages only via `node scripts/messages-edit.mjs`; English ICU plurals.
- The bell, the work center and this page show the same unread-topic number (plan 1 Task 6).
- Read/snooze rules unchanged (§5.3); snooze choices 24 / 72 / 168 hours; cancel snooze = the existing `unread` action.
- Assignment stays a personal note (§5.4).
- Reuse UI parts (`PageHeader`, `Segmented`/`TabNav`, `ContentPanel`, `RowActions`/`DropdownMenu`, `StatusBadge`,
  `EmptyNote`, `Notice`); tokens only; both themes; 44px targets below `md`; no horizontal page scroll at 390.
- E2E on `asset_management_dev` only; run users change only their own notification states; never call
  `/api/notifications/digest`; no DELETE; no settings save.
- Source-pin tests CRLF-safe.

## Review Focus

1. A topic read at 09:12 whose count then rises: it moves to ยังไม่อ่าน, the pill disappears and the bell counts it —
   Task 1 test `a risen topic is unread again without its read time`.
2. `status=snoozed` while nothing is snoozed: the tab shows 0 and the empty state of that tab, not the unread list —
   Task 2 test `an empty status tab shows its own empty state`.
3. Digest history before the migration: only legacy `notification_digest` rows (text), no crash, no rows of another
   module — Task 1 test `legacy digest rows are filtered by module`.
4. A user with no visible keys (e.g. only `dashboard:view`): header, tabs at 0, the empty state, no recording — Task 1
   test `nothing visible records nothing`.
5. Snooze for one week from a phone: the ⋯ sheet offers 1 วัน / 3 วัน / 1 สัปดาห์ and sends 168 — Task 2 test
   `snooze choices send 24, 72 and 168 hours`.

---

### Task 1: The page loader

**Files:**
- Create: `src/lib/notifications-page-data.ts`, `tests/notifications-page-data.test.ts`
- Modify: `src/lib/notification-summary.ts` / `src/lib/notification-center.ts` (the center's state select and
  `NotificationCenterItem` gain `readAt: Date | null`, shown only while the item counts as read; a risen topic has
  `readAt: null` in the item)

**Interfaces:**
- Consumes: `getNotificationCenter(user, locale)` (records drops; items with `isRead`, `isSnoozed`, `isSuppressed`,
  `snoozedUntil`, `assignedToUserId`, now `readAt`), `getWaitingWork`, `buildWorkQueueSummary` (approval parts),
  `getWaitingWorkAges` (oldest age / nearest due per key), `ADVANCE_WARNING_KEYS`, `recordDailyCounts`,
  `readPreviousDayCounts`, `compareWithPrevious`, `readDigestDays`.
- Produces:
  - `type NotificationStatusTab = "unread" | "read" | "snoozed" | "all"`; `parseNotificationsParams(input: { status?: string | string[]; assigned?: string | string[]; digest?: string | string[] }): { status: NotificationStatusTab; assigned: boolean; digestAll: boolean }` (default unread; junk → default).
  - `type NotificationTopicRow = { key: WaitingWorkKey; section: "backlog" | "advance"; count: number; href: string; tone: string; state: "unread" | "read" | "snoozed"; readAt: Date | null; snoozedUntil: Date | null; assigneeName: string | null; detail: { key: string; values: Record<string, string | number> }; change: DailyCountComparison }`.
  - `type NotificationsPageData = { params; counts: { unread: number; read: number; snoozed: number; all: number; assigned: number }; backlog: { rows: NotificationTopicRow[]; queues: number; items: number; previousItems: number | null }; advance: { rows: NotificationTopicRow[]; items: number; previousItems: number | null }; digest: { days: DigestDay[]; totalDays: number; legacy: { id: string; title: string; message: string; createdAt: Date }[] }; assignees: { id: string; label: string }[]; canOpenWorkCenter: boolean }`.
  - `getNotificationsPageData(user, input: { searchParams; locale; now? }, deps?): Promise<NotificationsPageData>` —
    topics = center items with count > 0 (as today); `state` from isSnoozed/isRead; counts per tab over those topics;
    rows filtered by the tab (`all` = every topic) and by `assigned`; sections by `ADVANCE_WARNING_KEYS`; detail per key:
    approvalInbox → parts (`notifications.detail.approvalParts` "ตัดจำหน่าย {disposal} · รายการไม่ตรง {mismatches} · ปิดรอบตรวจนับ {rounds}"),
    openRepairs → oldest age ("บันทึกซ่อมที่รอกด \"ซ่อมเสร็จ\" · นานสุด {days} วัน"), duePm / auditActionsDueSoon → nearest due
    ("ใกล้สุด {date}"), others → today's `<key>Detail` message; the assignee appended by the page. `change` per key from
    the previous day (unknown when none). Recording: `recordDailyCounts(user.id, every visible key's count)` in try/catch
    (log without data); none when no key is visible. Digest: `readDigestDays(user.id, { limit: digestAll ? 30 : 3 })`,
    `totalDays` = days with digest rows (count query), legacy = `Notification` rows with `module = "notification_digest"`
    created before the first digest day (newest first, 10, 30 with `digestAll`). Assignees as today.
- [ ] **Step 1: Write failing tests** (deps injected): `tabs count topics by state`; `a risen topic is unread again
  without its read time`; `assigned filter keeps assigned topics`; `sections split advance warnings`; `detail lines
  per key`; `nothing visible records nothing`; `a failed recording does not break the page`; `legacy digest rows are
  filtered by module`; `parseNotificationsParams defaults`.
- [ ] **Step 2: Run** `node --test tests/notifications-page-data.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit -p .` — PASS.
- [ ] **Step 5: Commit** `feat(notifications): the page loader for board NT: topics by state and section, tab counts, detail lines, change from the previous day, digest days and legacy digest rows, recording on visit (group 9 plan 3 task 1)`.

### Task 2: The page (`NT`, desktop and phone)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/notifications/page.tsx` (rewritten on the loader),
  `src/components/notifications/notification-center-actions.tsx` (⋯ menu: ทำเป็นอ่านแล้ว / ทำเป็นยังไม่อ่าน, เลื่อนเตือน →
  1 วัน / 3 วัน / 1 สัปดาห์, ยกเลิกการเลื่อนเตือน on a snoozed row, เปลี่ยนผู้รับผิดชอบ…; the whole row opens and marks read as today)
- Create: `src/components/notifications/notification-topic-row.tsx`, `notification-digest-panel.tsx`,
  `tests/notifications-page-board.test.ts`
- Modify: messages; the old page's source pins (grep tests for `notifications/page` and `notification-center-actions`).

**Layout (board `NT`):** header การแจ้งเตือน + count badge (unread topics), the line "กระดิ่งแถบบน = หัวข้อที่ยังไม่อ่าน n",
เปิดศูนย์งานค้าง (with `dashboard:view`); the help strip (ทำเป็นอ่านแล้ว = … / เลื่อนเตือน = …); a row with the status tabs
(ยังไม่อ่าน n / อ่านแล้ว n / เลื่อนเตือน n / ทั้งหมด n; `status=`), the chip มอบหมายแล้ว n (`assigned=1`, toggles) and
**ทำเป็นอ่านแล้วทั้งหมด** (the existing `read_all`, shown while unread > 0). Section **งานค้าง** ("n คิว ตรงกับศูนย์งานค้าง ·
m รายการ · เมื่อวาน k") and section **เตือนล่วงหน้า** (`id="advance"`, "ยังไม่ถึงขั้นเป็นงานค้าง · m รายการ · เมื่อวาน k").
Each topic row: title, detail line (+ " · มอบหมาย {name}"), the count (right, tabular), the change (▲ n จากเมื่อวาน /
▼ n จากเมื่อวาน / เท่าเดิม / ใหม่; nothing when unknown), the state pill (อ่านแล้ว HH:mm today or the date / เลื่อนถึง
date time) and ⋯. Unread rows are emphasised (dot + bold title); read/snoozed rows muted. Footer line "n หัวข้อ = ยังไม่อ่าน a +
อ่านแล้ว b + เลื่อนเตือน c · ข้อมูลทะเบียนไม่ครบและความคืบหน้าตรวจนับดูที่ศูนย์งานค้าง ไม่ส่งแจ้งเตือน". Side panel
(`notification-digest-panel.tsx`, right column from `lg`, after the list below): สรุปรายวันที่ส่งแล้ว, "ส่งวันละครั้ง
นับเฉพาะหัวข้อที่ยังไม่อ่านตอนส่ง", one `<details>` per day ("20 พ.ย. 2569 · 8 หัวข้อ · 41 รายการ", the first open) listing
topics with their counts linking to their pages, **ดูย้อนหลังทั้งหมด (n วัน)** (`digest=all`), then legacy rows as text
(title, date, message) under "ก่อนเก็บแบบแยกหัวข้อ". Empty states: per status tab
(`notifications.empty.unread|read|snoozed|all`), digest "ยังไม่มีสรุปรายวันที่ส่ง".
Phone: tabs scroll-free (2 × 2 grid below `sm`), rows stack (title, detail, count + change on one line, pill), ⋯ as a sheet.

- [ ] **Step 1: Write failing pins:** the page uses `getNotificationsPageData`; the status tabs and the assigned chip
  build `status=` / `assigned=1` links; `ทำเป็นอ่านแล้วทั้งหมด` uses `read_all`; sections with `id="advance"`;
  `an empty status tab shows its own empty state`; `snooze choices send 24, 72 and 168 hours` (actions component);
  cancel snooze sends `unread`; the digest panel uses `<details>` and the `digest=all` link; the footer sum line.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** (keep toasts, the summary-changed event and `router.refresh()` after each action).
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit -p .`, `npx eslint` on changed files — PASS.
- [ ] **Step 5: Commit** `feat(notifications): the page to board NT: status tabs, assigned filter, read-all, backlog and advance sections with change from yesterday and read time, snooze 1 day / 3 days / 1 week and cancel, the daily digest by day (group 9 plan 3 task 2)`.

### Task 3: E2E for the work center and the notifications page

**Files:**
- Create: `e2e/work-center/work-center.spec.ts`, `e2e/work-center/work-center-words.ts`,
  `e2e/notifications/notifications.spec.ts`, `e2e/notifications/notifications-words.ts`
- Modify: `e2e/support/run-plan.ts` only if the run role lacks a permission these need (say which); words pinned in
  `tests/e2e-*.test.ts` as the other words files are.

**Scenarios (all four projects; IT head of the run; axe through `recordSettled`):**
- Work center: the strip's งานค้างทั้งหมด equals the sum of the visible queue cells and the overview tab's count; the
  การแจ้งเตือน badge equals the bell's number; a run-created open repair (create one through the repair API as the
  setup does elsewhere) appears in the ซ่อมบำรุง tab with its next step บันทึกว่าซ่อมเสร็จ opening `/maintenance/{id}`;
  "แสดงเพิ่ม" adds rows (`show=16`) while the total is above 8; `view=mine` shows the switch pressed and no "เมื่อวาน";
  a forbidden panel by URL (`panel=assets` for a user without `asset:view`, if the run has one; else skip with reason)
  falls back to ภาพรวม; phone: the 3 × 2 grid and a card's full-width next step; no horizontal scroll.
- Notifications: the header count equals the bell; ทำเป็นอ่านแล้ว on one topic moves it to อ่านแล้ว with a time pill and
  the bell drops by 1; เลื่อนเตือน 3 วัน moves it to เลื่อนเตือน with "เลื่อนถึง"; ยกเลิกการเลื่อนเตือน brings it back to
  ยังไม่อ่าน; the advance section has `id="advance"`; the digest panel renders (days or its empty state). The test
  restores the topic it touched to unread at the end (its own state row only).
- [ ] **Step 1: Write the specs and words; pin the words.**
- [ ] **Step 2: Run** `npm test`, `npx tsc --noEmit -p .`, `npx eslint e2e/work-center e2e/notifications` — PASS
  (Playwright is run by the controller).
- [ ] **Step 3: Commit** `test(e2e): the work center and notifications pages (group 9 plan 3 task 3)`.

### Task 4 (controller)

- [ ] Build; E2E `e2e/work-center e2e/notifications e2e/shell e2e/dashboard`; look step at 1440 (light, dark), 1024,
  390 (light, dark); whole-branch review Workflow 3×2 with one fix pass; docs, wiki, memory.

## Plan rulings

- **G9P3-R1** Legacy digest rows show only those created before the first structured digest day, so a day never shows
  twice (once as text, once by topic).
- **G9P3-R2** The notifications page records daily counts on every visit (all visible keys), like the work center's
  `view=all`; it has no "mine" view.
- **G9P3-R3** The E2E restores the topic state it changes (the run user's own row), so reruns start from unread.
