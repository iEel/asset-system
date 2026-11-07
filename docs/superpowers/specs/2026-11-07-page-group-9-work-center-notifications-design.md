# Page group 9: the work center (ศูนย์งานค้าง) and notifications (การแจ้งเตือน)

Boards: `WC`, `WC-Phone`, `NT` in the canvas (https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p). Assumptions:
`.impeccable/critique/2026-10-20-canvas-assumptions.md` § ศูนย์งานค้างและแจ้งเตือน. Recon of the current code: 2026-11-07
(inventory in §9). User decisions 2026-11-07: build the three items that need a migration (yesterday's counts, the
read time, the structured daily digest); "โอเค เขียน spec ได้เลย" on the playback. Calls marked **(my call)** are mine.

## 1. Why

People open the work center every morning to see what is waiting and whether it is getting worse. Today the page
shows panels per queue with no ages, a headline number that changes with the tab, no "since yesterday", and lists
whose rows lead with codes. The notifications page shows cards with three equal buttons, the bell shows a sum of
items (99+), and the digest list repeats ten text cards. The boards answer each of these (assumptions file,
"แก้ปัญหาจากการตรวจ").

## 2. Goals, non-goals, anti-goals

- **Goals:** one set of numbers on the work center (desktop, phone), the notifications page, the bell and the
  dashboard's งานที่รอคุณ (user 2026-11-07: "ให้แดชบอร์ดตรงกับศูนย์งานค้างได้เลย"); one
  overview table across queues, overdue first, each row with its next step; yesterday's counts; the bell counts
  unread topics; notifications as an inbox with status tabs, read-all, snooze choices and the read time; the daily
  digest as one line a day.
- **Non-goals:** new workflow actions inside these pages (every next step opens the page where that step is done);
  delegation of a notification to another person (assignment stays a personal note, §5.4); changing how queues are
  counted or which permission sees which queue.
- **Anti-goals:** a number on one page that disagrees with another page; a headline that changes with the tab; a
  "since yesterday" arrow shown without real data for yesterday; losing any working feature (§8).

## 3. The queues and their numbers (shared by both pages and the bell)

The keys stay `WAITING_WORK_KEYS` with their permissions and counts (`waiting-work.ts`, `waiting-work-rules.ts`). The
pages group them:

| Board queue | Keys (shown only where the user may see them today) |
|---|---|
| รออนุมัติ | `approvalInbox` (parts: ตัดจำหน่าย n · รายการไม่ตรง n · ปิดรอบตรวจนับ n, from the inbox counts) |
| ซ่อมบำรุง | `openRepairs` (ยังซ่อมไม่เสร็จ), `stuckRepairs`, `duePm` (PM ถึงกำหนด) |
| ตรวจนับ | `openAuditActions`, `auditActionsDueSoon`, and `pendingAuditFindings` when the inbox does not hold findings |
| ตัดจำหน่าย | `approvedDisposals`, and `pendingDisposals` when the inbox does not hold disposals |
| ข้อมูลไม่ครบ | distinct active assets missing a custodian, a serial or a photo (one asset counted once) — **not** in งานค้างทั้งหมด |
| เตือนล่วงหน้า | `returnsDueSoon`, `warrantyExpiringSoon`, `licenseExpiringSoon` — **not** in งานค้างทั้งหมด |

- **งานค้างทั้งหมด** = รออนุมัติ + ซ่อมบำรุง + ตรวจนับ + ตัดจำหน่าย, with the sum written out ("19 + 10 + 6 + 3 = 38").
  It never changes with the tab or the scroll.
- **ต้องทำวันนี้** = รออนุมัติ + `approvedDisposals` ("รออนุมัติ 19 + อนุมัติแล้วรอบันทึกตัดจำหน่าย 3"), with the
  two action links (พิจารณา n งาน → the approvals page; บันทึกตัดจำหน่าย n → the disposal list filtered to approved).
- Every number is a database count (they already are). Rows on screen are a bounded slice (§4.2) and say so.
- **ข้อมูลไม่ครบ** needs `asset:view` (**my call**: today its cells have no gate, a gap).
- `openRepairs`' link goes to the repair list with the same "not closed" meaning as its count (today it opens
  `in_progress` only) **(my call)**.

### 3.1 The dashboard follows (user decision)

The dashboard's งานที่รอคุณ (`buildDashboardWaiting`, `src/lib/dashboard-page.ts`; the KPI cell `waiting` and its
section) uses the same total as งานค้างทั้งหมด: รออนุมัติ + ซ่อมบำรุง + ตรวจนับ + ตัดจำหน่าย, from the shared
grouping (§3). The advance warnings (`returnsDueSoon`, `warrantyExpiringSoon`, `licenseExpiringSoon`) stay listed in
its section under their own heading เตือนล่วงหน้า and are not added to the number. The oldest-wait foot keeps its rule
(an expiry is never a wait). Its rows, links and the rest of the dashboard (group 1) are unchanged. Its source-pin
tests and `e2e/dashboard` follow.

## 4. The work center (`/work-center`, boards `WC`, `WC-Phone`)

### 4.1 Header and strip

- Title ศูนย์งานค้าง, the line from the board, the switch **งานทั้งหมด / งานของฉัน** (`view=all|mine`, as today) as a
  small segmented control beside the title, and the button **การแจ้งเตือน n** (n = unread topics, §5.1).
- The strip: ต้องทำวันนี้ (with its two action links), งานค้างทั้งหมด (with "เมื่อวาน n · เพิ่ม/ลด n" when yesterday
  is known, §6), the four queue cells, and the sum line "นับจากฐานข้อมูลทั้งหมด ไม่ใช่เฉพาะรายการที่แสดง".
- **ติดตามแยก ไม่นับเป็นงานค้าง** panel: the open audit round's progress (ตรวจแล้ว x / y · ยังไม่ตรวจ n, its AUD-
  number, เดินตรวจต่อ to the scan page of that round; the round with most items left when several are open; hidden
  without `audit:view` or with no open round), ข้อมูลทะเบียนไม่ครบ n ชิ้น (to the assets tab), เตือนล่วงหน้า n (to
  the notifications page's เตือนล่วงหน้า section).
- งานของฉัน: as today (the approval inbox is always the user's own; other queues scoped to the user's employee or
  department; the existing notice when the user has neither). Yesterday's numbers are not shown under งานของฉัน
  **(my call: the snapshot is of the user's full view)**.

### 4.2 Tabs and the overview table

- One row of tabs with counts: ภาพรวม (งานค้างทั้งหมด), รออนุมัติ, ซ่อมบำรุง, ตรวจนับ, ตัดจำหน่าย, ข้อมูลไม่ครบ
  (n ชิ้น). The URL keeps `panel=overview|approvals|maintenance|audit|disposal|assets`. A tab the user may not see is
  not shown. On phones the tabs are a 3 × 2 grid.
- **ภาพรวม** is one table across รออนุมัติ, ซ่อมบำรุง, ตรวจนับ and ตัดจำหน่าย, sorted: overdue first (by days
  overdue, most first), then the rest by age (oldest first). Columns: ความเร่งด่วน (a dot: เกินกำหนด / ต้องทำ /
  พร้อมดำเนินการ, with a legend), งาน (asset name first; then tag · document number; then the context line from the
  board — requester, location or holder change "A → B", plan, reporter), คิว · ประเภท, ค้าง (รอ n วัน / ค้าง n วัน /
  ครบกำหนด date, and เกิน SLA n วัน / เลยกำหนด n วัน / อีก n วัน), ขั้นถัดไป (one button naming the step), ⋯.
- **Next step per row** (each opens the page where it is done; no new action):

| Row | Button | Opens |
|---|---|---|
| disposal request awaiting approval | พิจารณาคำขอ | the approvals page with `?item=` (as the inbox links today) |
| audit finding awaiting approval | พิจารณารายการไม่ตรง | the approvals page with `?item=` |
| round ready to close | อนุมัติปิดรอบ | the approvals page with `?item=` |
| approved disposal not executed | บันทึกตัดจำหน่าย | the disposal request page at its execute step |
| PM due | บันทึกว่าทำแล้ว | the PM plan's page where a run is recorded |
| open repair | บันทึกว่าซ่อมเสร็จ | the repair page |
| stuck repair (repair status, no open record) | เปิดงานซ่อม | the new-repair form for that asset |
| corrective action open / due soon | อัปเดตแผนแก้ไข | the finding's corrective-action place |
| pending finding / disposal outside the inbox | the same wording as the inbox rows | their pages |

- ⋯ per row: เปิดคำขอ / เปิดงาน (the record), เปิดรายละเอียดทรัพย์สิน, พิมพ์คำขอตัดจำหน่าย (disposal rows), each only
  with the permission its page needs.
- Ages and SLA: approval rows use `getApprovalAgeStatus` with `workflow_approval_sla_days` (the policy, default 3),
  not the board's 7 **(my call)**; other rows use their own due dates (PM due date, action due date) or days since
  reported (repairs) / approved (disposals), Bangkok days.
- **Urgency and order (my call, after the builder check):** every row has a *since* date (requested, reported,
  approved, created; the round's ready-to-close date) and, where one exists, a *deadline* (approval: since + SLA; PM:
  next due date; corrective action: due date). **เกินกำหนด** = a deadline before today. **ต้องทำ** = a deadline
  today or within 7 days, or no deadline at all (repairs, stuck repairs, approved disposals, actions with no due date).
  **พร้อมดำเนินการ** = a deadline more than 7 days away. Order: เกินกำหนด rows by days overdue (most first), then all
  other rows by days since (oldest first); ties by the record's number. Each source's rows are read as light records
  (id, since, deadline), ranked in memory, and only the rows on screen are loaded in full (id lists chunked by
  2,000), so the merged order is exact without matching each source's SQL order.
- **Paging:** the table shows 8 rows, then "แสดง 8 จาก 38 · เกินกำหนดก่อน แล้วค้างนานสุด" and **แสดงเพิ่ม 8 รายการ**
  (`show=16`, `24`, …, a link, no client state). The server takes the first `show` rows of each source in the same
  order and merges them, so the merged first `show` rows are exact.
- **Queue tabs** show the same table filtered to that queue, with the queue's parts line (e.g. "ตัดจำหน่าย 4 ·
  รายการไม่ตรง 14 · ปิดรอบ 1") and one link to the source page named by its destination ("ไปหน้างานรออนุมัติ"). The
  **ข้อมูลไม่ครบ** tab keeps today's three fix cards (no custodian / no serial / no photo, each to the register's
  `dataQuality=` filter) and its asset list.
- **Phone (`WC-Phone`):** the same content stacked: switch, ต้องทำวันนี้ card, the sum line, the 3 × 2 tab grid, rows
  as cards (name, tag · document, type line, age, next-step button full width), แสดง n จาก m + แสดงเพิ่ม, then
  ติดตามแยก. Titles clamp at two lines. The bottom nav keeps เพิ่มเติม active (as today).
- **Permissions (fix, my call):** each queue's rows load only with that module's view permission
  (`maintenance:view`, `audit:view`, `disposal:view`); today the panels skip this check.

## 5. Notifications (`/notifications`, board `NT`) and the bell

### 5.1 The bell

- The badge shows **unread topics** (keys with count > 0 that are neither read nor snoozed, §5.3) instead of the sum
  of items; never "99+" in practice (still capped visually at 99+). The popover keeps its rows with each queue's
  count, its groups, read-all, the dim read/snoozed rows, its footer links, polling, the live region (announces when
  the unread-topic number rises) and the optimistic read.
- The work center's การแจ้งเตือน button and the notifications page header use the same number.

### 5.2 Page layout

- Header: การแจ้งเตือน, the line "กระดิ่งแถบบน = หัวข้อที่ยังไม่อ่าน n", เปิดศูนย์งานค้าง (with `dashboard:view`, as
  today).
- A help strip: ทำเป็นอ่านแล้ว = stop counting on the bell until the queue's number changes (the work stays in the
  work center); เลื่อนเตือน = hide until the chosen time, then unread again.
- Status tabs with counts: **ยังไม่อ่าน / อ่านแล้ว / เลื่อนเตือน / ทั้งหมด** (`status=unread|read|snoozed|all`,
  default unread), a filter chip **มอบหมายแล้ว n** (`assigned=1`), and **ทำเป็นอ่านแล้วทั้งหมด** (the existing
  `read_all`).
- Two sections: **งานค้าง** ("n คิว ตรงกับศูนย์งานค้าง · m รายการ · เมื่อวาน k") and **เตือนล่วงหน้า** ("ยังไม่ถึงขั้น
  เป็นงานค้าง"). Each row = one key: title, its detail line (with the parts for the approval inbox, the oldest age for
  repairs, the nearest due date for actions, the assignee when set), the count, the change from yesterday (▲ n / ▼ n
  / เท่าเดิม / ใหม่; nothing when yesterday is unknown), and the state pill (อ่านแล้ว HH:mm or date / เลื่อนถึง
  date time). The whole row opens the key's page (marking it read, as today).
- ⋯ per row: ทำเป็นอ่านแล้ว / ทำเป็นยังไม่อ่าน, เลื่อนเตือน → 1 วัน / 3 วัน / 1 สัปดาห์ (24 / 72 / 168 hours; the API
  already takes 1–168), **ยกเลิกการเลื่อนเตือน** on a snoozed row (the existing `unread` action, which clears the
  snooze), เปลี่ยนผู้รับผิดชอบ… (the existing assign).
- Footer line: "n หัวข้อ = ยังไม่อ่าน a + อ่านแล้ว b + เลื่อนเตือน c · ข้อมูลทะเบียนไม่ครบและความคืบหน้าตรวจนับดูที่
  ศูนย์งานค้าง ไม่ส่งแจ้งเตือน".
- Side panel **สรุปรายวันที่ส่งแล้ว** (§6.2). On phones the side panel follows the list.

### 5.3 Read and snooze rules (unchanged, plus the read time)

- Read/snoozed hold only while the count is ≤ `lastCount`; a rise makes the topic unread again; drops are recorded
  (all as today, `notification-center.ts`, `notification-summary.ts`).
- **New `readAt`** on `NotificationUserState`: set when a topic is marked read (row open, ทำเป็นอ่านแล้ว, read-all);
  cleared on unread and snooze. The pill shows HH:mm today, the date otherwise.

### 5.4 Assignment (kept as it is) **(my call)**

Assignment stays a personal note on the user's own state row (today's behaviour): the assignee is not notified. The
row shows "มอบหมาย [name]" and the มอบหมายแล้ว filter uses it. Making it real delegation is out of scope (§2).

## 6. Yesterday and the daily digest (migration)

### 6.1 Daily counts

- New table **`NotificationDailyCount`**: `userId`, `day` (Bangkok calendar date), `key`, `count` (the last value
  recorded that day), `digestCount` (int, null until the digest includes the topic; then the count the digest sent,
  never overwritten), `createdAt`, `updatedAt`; unique (`userId`, `day`, `key`); index (`userId`, `day`). Keys are
  the visible `WAITING_WORK_KEYS` plus `dataIssues` (work center only); the totals are derived, not stored.
  **(my call, after the builder check: the digest history must show what was sent, not the day's last count.)**
- **Recorded** when the user opens the work center (view all) or the notifications page, and by every non-dry
  digest run for each user who has at least one visible key: upsert today's row per visible key with the current
  count (the last value of the day wins for `count`). Not on the bell's poll (too many writes) **(my call)**.
- **Kept 35 days (my call):** each non-dry digest run deletes rows older than 35 Bangkok days (the history shows 30;
  yesterday needs one). This is the app's own housekeeping of its own table, not a manual data change.
- **Yesterday** = the user's rows for the latest recorded day before today (Bangkok). If that day is not yesterday,
  the label says its date ("เมื่อ 5 พ.ย. n"). If nothing is recorded before today, no arrow and no "เมื่อวาน".
  A key with a count today and none recorded on that day reads **ใหม่**.

### 6.2 The digest

- A digest run (unchanged trigger and dedupe) also sets `digestCount` on the day's rows it included (the topics that
  were unread when sent), only if not already set. The existing `Notification` row and webhook stay as they are.
- **สรุปรายวันที่ส่งแล้ว** lists the last 3 days that have rows with `digestCount` (topics = those rows, items = the
  sum of `digestCount`): "20 ต.ค. 2569 · 8 หัวข้อ · 41 รายการ",
  each expandable to its topics (name, count, link to the queue). **ดูย้อนหลังทั้งหมด (n วัน)** opens up to 30 days
  (`digest=all`). Days before the migration have no rows; older `Notification` digest rows still list in the history
  as text, filtered to `module = "notification_digest"` (today the list shows any module; there is no other module
  yet).
- The digest's reference day: today it uses the UTC date. It changes to the Bangkok day, the same day as the counts
  **(my call; at 07:30 Bangkok the two are the same date, so no duplicate)**.

### 6.3 Production

The migration (one table, one column) runs on `asset_management_dev` first. On Production it needs the user's
approval with the full SQL at deploy (AGENTS.md).

## 7. Words

- ศูนย์งานค้าง everywhere for `/work-center` (title, buttons "เปิดศูนย์งานค้าง"); การแจ้งเตือน for `/notifications`.
- ทำเป็นอ่านแล้ว (command) vs อ่านแล้ว (state); สรุปรายวันที่ส่งแล้ว; ภาพรวม for the first tab.
- Messages through `node scripts/messages-edit.mjs`; glossary `docs/19_THAI_GLOSSARY.md`; English with ICU plurals.

## 8. What the boards omit and we keep

- Work center: the `view=mine` scoping and its notice; `panel=` deep links used by the dashboard, my assets, the
  access-denied page, the PWA shortcut and the sidebar; the sidebar's unread-decision dot; `stuckRepairs`; the three
  data-quality fix cards with their register filters; empty states per queue.
- Notifications: open-row-marks-read; toasts and the summary-changed event; the assign list (all active users).
- Bell: everything in §5.1. The digest's webhook, scheduler auth and run record.

## 9. Recon notes (2026-11-07)

- No count is capped today; only the lists are (24 per focused panel, 6 in the overview).
- The headline "all follow-ups" today sums the cells of the current panel — replaced by งานค้างทั้งหมด (§3).
- The approval SLA is `workflow_approval_sla_days` (default 3, 1–90); the work center shows no ages today.
- The digest has its own hard-coded labels (`notification-digest-format.ts`); the schedule is a documented systemd
  timer at 07:30 (`DEPLOYMENT_UBUNTU_CLOUDFLARE.md`), not in the repo.
- Many source-pin tests match these pages (list in the inventory); they are updated with the pages. No E2E spec
  opens `/work-center` or `/notifications` today; the shell spec covers the bell.

## 10. Plans

1. **Data and rules:** the migration (`NotificationDailyCount`, `readAt`), the queue grouping and totals (§3) with
   the dashboard's งานที่รอคุณ following them (§3.1), the
   overview row model with next steps, ages and paging (§4.2), recording and reading yesterday (§6.1), the bell's
   unread-topic count (§5.1), the digest marking and Bangkok day (§6.2), the permission fixes.
2. **The work center page** (desktop and phone) to `WC` / `WC-Phone`.
3. **The notifications page** to `NT`, the bell popover number, and E2E for both pages (dev DB, run users' own
   notification states only; never the digest route).
