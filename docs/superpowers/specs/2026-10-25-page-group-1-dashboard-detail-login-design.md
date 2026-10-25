# Page group 1 (dashboard, asset detail, login): design

**Status:** draft for the user's approval (2026-10-25)
**Base:** `master` at `97699c61` (the menu B shell merged and pushed, E2E green 303/0; nothing deployed).
**Order of the remaining work:** this group → the other page groups of the canvas → E2E again → UAT → the one Production deploy (wiki `ams-open-questions` #27).
**Visual source:** the design canvas https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p, boards B-Dashboard(-Phone), B-AssetDetail(-Phone), B-Detail-history / -components / -files / -maintenance (and their -Phone boards), B-Login(-Phone). Where this document and a board differ, this document wins. The recon notes behind this document are in the session scratchpad (`group1-recon/{dashboard,detail,login,cross}.md`); every file and line named below was read on `97699c61`.

## 1. Intent

The 2026-10-19 critique asked for a redesign of these three pages before the deploy. The user then compared each canvas B board with the live page and chose B for all three, with additions of their own:

- **Dashboard.** What it is for, in the user's words: "ดูว่ามีงานค้างตรงไหน แล้วกดเข้าไปจัดการ หรือวางแผนการจัดการทรัพย์สิน". What hurt on Production: "ตัวเลขกดแล้วรายการไม่ตรงกัน" (fixed on master by `exact=1`, not yet deployed). B puts the waiting work first and makes every number traceable.
- **Asset detail.** What it is for: "ดูสถานะ ประวัติ แล้วทำธุรกรรมต่อ". B gives a fact strip, linkable tabs, empty states that say where to go, and one place for the next step.
- **Login.** B is one card on a navy page with a Caps Lock warning, without the IT Helpdesk buttons ("User รู้อยู่แล้วว่าต้องติดต่อใคร"). The team signs in with AD/LDAP accounts and has no login problems today.

## 2. Decisions the user made (2026-10-25)

| Page | Decision |
|---|---|
| Dashboard | Canvas B, plus: (1) "งานที่รอคุณ" uses the same source as the bell and the work center (one count rule); (2) the same parts in a role-based order; (3) every number traceable: hover or focus shows the filter used, the list it opens shows the same count with a matching chip, and each segment of the status bar links to its list; (4) audit by branch uses a computed "ควรถึงวันนี้" pace line from the round's start to its due date, not a stored target; (5) a number that is duplicated today (cross-scope four times, the status split twice) appears once. |
| Asset detail | Canvas B, plus: (1) the primary action and the "อื่น ๆ" items come from the same rule as the register; an action that cannot run now sits in "อื่น ๆ" with its reason; (2) one history timeline with type filter chips (ส่งมอบ / รับคืน / โอนย้าย / ตรวจนับ / ซ่อม / ตัดจำหน่าย); the overview shows the latest 3; (3) the fact strip's cells link onward, and "ถือมาแล้ว N วัน"; (4) "3 / 24" previous/next that keeps the search through `returnTo`, hidden when the page is opened directly; (5) on the phone, a sticky primary action at the bottom, and a placeholder for a photo that fails to load. Keep the components relationship map. |
| Login | Canvas B without the IT Helpdesk buttons and without their divider. Keep the line "ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับที่เข้าเครื่องคอมพิวเตอร์ของบริษัท". |

Two later answers (2026-10-25, "เอาตามที่แนะนำทั้งสองข้อ"): "งานที่รอคุณ" holds the bell's ten kinds plus two repair kinds, which the bell gains too (§6.3); the company switcher filters the overview parts only (§6.2).

## 3. Goals

1. The three pages match their B boards in both themes, on desktop and phone, inside the menu B shell.
2. On the dashboard, every number opens a list that shows the same count, and a person can tell from the number itself which filter it uses.
3. On the asset detail, the next step a person sees is the one the register offers for the same asset, with the same words, and an action that cannot run says why.
4. Nothing is lost from the detail page that someone uses today: each feature B drops from the overview has a named new place (§7.9).
5. The login shows no data and reads no setting other than the two named in §8 before sign-in; LDAP stays on the server.
6. DESIGN.md, `.impeccable/design.json`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, the tokens and the guard tests change together and agree.
7. The E2E suite passes on all four projects, with this group's UI steps updated and the new steps of §10 added.

## 4. Non-goals and anti-goals

- **Non-goals:** redesigning the register, the work center, the notifications page, the maintenance or audit pages (they only gain the filters and the shared action rule this group needs); a global company filter; daily snapshots or trend history; IT Helpdesk contacts anywhere on the login; a public lookup of an asset tag before sign-in; offline use of these pages.
- **Anti-goals (a failure even if it works):**
  - a dashboard number that opens a list with a different count;
  - the same number shown twice on the dashboard;
  - an action shown as available that the API then refuses;
  - a write control visible to a person without the permission (the viewer E2E checks this);
  - any data, setting value, database or server name shown on the login before sign-in;
  - an English movement type or raw key on the detail page;
  - text or a chart fill that fails contrast in either theme;
  - breaking the E2E hazard guards (no LDAP sync, settings save, Excel import, failed sign-in or delete during a run).

## 5. Rules that bind all three pages

- **Words:** `docs/19_THAI_GLOSSARY.md`. From the canvas, these change: "ตรวจทาน" → พิจารณา (or ตรวจสอบ where the data-quality page already says it); "ตัดจำหน่ายรออนุมัติ" → "ตัดจำหน่ายรอพิจารณา"; "เป้าวันนี้" → "ควรถึงวันนี้"; "อยู่ที่" → **ที่ตั้ง**; "แจ้งซ่อม" → **บันทึกซ่อม** (*my call*: the button opens the form titled "บันทึกซ่อม", and the maintenance pages say บันทึก; one word for one thing). Messages are edited only through `node scripts/messages-edit.mjs`.
- **Colour:** DESIGN.md "Where Color Lives" holds, with one new written rule for data bars (§6.6). No `bg-*-soft` card fills, no hex or rgba in classes, no `dark:`.
- **Shared parts first:** PageHeader, Breadcrumbs, PageBackLink, TabNav (`AssetDetailTabs`), StatStrip, KeyValueList, ContentPanel, DataTable, EmptyNote, ActionEmptyState, Notice, FileDropzone, RowActions, ActionBar. Two parts are extended (StatStrip §6.5, ActionBar §7.8) and one is new (the fact strip, §7.4). A new part gets a name that passes the LS1, LK1 and LN2 guards and a section in DESIGN.md.
- **Skeletons** change in the same commit as their page (`DashboardPageSkeleton`, `AssetDetailPageSkeleton`; DESIGN.md:693).
- **Source-pin tests** that read these pages are rewritten in the same commit as the change they pin, never deleted to make room. Each EXEMPT row that moves is edited, with its reason.
- **Dates and days** use Bangkok days (`src/lib/local-date.ts`) and Buddhist-era years in Thai.
- **Performance:** each page keeps its `withPerformanceTiming` labels or renames them together with `tests/performance-route-instrumentation.test.ts`. New counts run in one round of parallel queries; no query per row.

## 6. The dashboard

### 6.1 Layout

Desktop (canvas B-Dashboard): the page header, a row of four KPI cells, then a 12-column grid of four sections in two rows (7 + 5 columns). Phone (B-Dashboard-Phone): the four KPIs in a 2×2 grid, then the sections stacked; no "ล่าสุด" on the phone.

**Role order (addition 2), from permissions, never role names** (*my call*; role names are configurable and there is no executive role):
- **Work profile:** a person who holds any of `canAnyApproval`, `asset:create|edit`, `maintenance:create|edit`, `audit:create|edit`, `disposal:create|edit`. KPI order: งานที่รอคุณ, รอบตรวจนับ, ทรัพย์สินทั้งหมด, มีผู้ถือครอง. Section order: งานที่รอคุณ, ตรวจนับแยกสาขา, ตามสถานะ, ล่าสุด.
- **Overview profile:** everyone else who reaches the dashboard. KPI order: ทรัพย์สินทั้งหมด, มีผู้ถือครอง, รอบตรวจนับ, งานที่รอคุณ. Section order: ตามสถานะ, ตรวจนับแยกสาขา, งานที่รอคุณ, ล่าสุด.
- A person who can see no kind of waiting work at all gets neither the KPI cell nor the section.
- The page stays open to everyone it is open to today (the IT staff and viewer E2E users land on it without `dashboard:view`); the employee redirect stays.

### 6.2 Header and company switcher

- `PageHeader` title "แดชบอร์ด", meta "ข้อมูล ณ 25 ต.ค. 2569 14:05" (render time, Bangkok, Thai short month, Buddhist year). A small formatter for that shape is new.
- **Company switcher (the user's answer: overview parts only).** Links (they change the URL, so a TabNav-style group per DESIGN rule R-g, not `aria-pressed` buttons): "ทุกบริษัท" plus each active company, or a select when there are more than four. The choice is `?companyId=` on `/dashboard`. It filters the overview parts (ทรัพย์สินทั้งหมด, มีผู้ถือครอง, ตามสถานะ and its cross-scope line, the audit round and its branches), and every link from them carries `companyId` so the list shows the same count. "งานที่รอคุณ" and "ล่าสุด" stay for all companies, with the note "ทุกบริษัท" in their headers, because the bell has no company and the activity log has no company column. On the phone there is no switcher; a chosen company shows as a removable chip under the header. With a company chosen (*builder-check ruling, my call*), the current round is picked from the open rounds that hold at least one item expected for that company (rounds scoped to it and rounds for all companies, `scopeCompanyId` empty), and the round's percentage, its branches and its pace count only that company's items.

### 6.3 งานที่รอคุณ (addition 1)

**One source.** A shared server function returns the person's waiting work. The bell (`getNotificationCenter`), the work center and the dashboard all read it, so a kind has one count, one title and one link everywhere. The dashboard calls it with `{ recordCountDrops: false }` (a page render must not write). It lists every kind with a count, read or not ("อ่านแล้ว clears the badge, not the work"), so the dashboard can show more than the bell's unread badge. It also returns the kinds the person can see that are at zero, for the zero line.

**Which kinds (the user's answer).** The bell lists ten kinds today: approvalInbox, duePm, pendingAuditFindings, openAuditActions, auditActionsDueSoon, pendingDisposals, approvedDisposals, returnsDueSoon, warrantyExpiringSoon, licenseExpiringSoon. Canvas B's rows are partly different (repair status without a record, state reviews, cross-scope).
- The ten bell kinds, plus two repair kinds added to the shared source, so they also appear in the bell's "ควรติดตาม" group and in the work center: **"ซ่อมยังไม่เสร็จ"** (open repair records, `openRepairRecordWhere`, link `/maintenance?status=in_progress`) and **"รอซ่อมแต่ยังไม่มีบันทึกซ่อม"** (the maintenance page's `stuckAssetWhere`, link `/maintenance#stuck`), both gated by `maintenance:view`. This changes the bell, which the menu B spec kept as it was; the bell's tests, the notifications page and the digest follow. In the shared order the two repair kinds come right after approvalInbox (*builder-check ruling, my call*), so the bell, the dashboard and the work center list them before PM.
- **What "the work center reads it" means** (*builder-check ruling, my call*): every kind the work center shares with the source takes its count rule, title, link and permission gate from the source; the work center keeps its own extra kinds (missing custodian, serial, photo; pending audit items) and its "ของฉัน" view, which narrows by employee and department and is labelled as such. Its "ทั้งหมด" view shows the source's number for every shared kind. Its open audit actions stop including the due-soon ones the bell counts separately. Nothing else on the work center changes (§4).
- *My call:* state reviews stay on the data-quality page (they exist only after a scan and need `setting:view`); cross-scope is not work with an age and moves to the overview (§6.6).

**The table** (desktop, `ContentPanel divided flush` + `DataTable framed={false}` with a caption): เรื่อง | จำนวน | ค้างนานสุด | (next step).
- Rows in the bell's order, with "รอคุณตัดสิน" (approvalInbox) first, so an approver sees approvals first and IT staff see repairs and mismatches first.
- จำนวน is a link to the kind's list (the bell's href) and equals that list's count.
- ค้างนานสุด, computed from existing columns (no schema change): an age "12 วัน" for approvals (oldest pending request or finding), findings, repairs, pending and approved disposals; a due date for PM, audit actions and returns ("เลยกำหนด 3 วัน" / "ครบกำหนดใน 2 วัน"); "ถึง 12 ม.ค." for warranty and licence expiry. Warning ink plus an icon when overdue: approvals past `policy.slaDays` (`getApprovalAgeStatus`), a due date in the past.
- The next-step link per kind uses the kind's verb ("พิจารณา", "ดูงานซ่อม", "บันทึกซ่อม", "รับคืน", …) and points at the same list.
- The zero line under the table: "ไม่มีงานค้าง: …" listing the visible kinds at zero.
- Header link "ศูนย์งานค้าง" only with `dashboard:view` (today's rule).
- Phone: each row is one link of at least 56px: the count, the title, and "ค้าง N วัน" under it.

**The KPI cell:** "งานที่รอคุณ", value = the sum of the rows, unit "รายการ" (*my call*: the canvas's "4 เรื่อง" counts kinds, which no list can show), foot "ค้างนานสุด N วัน" with `attention` when any row is overdue. No amber card fill: the StatStrip attention foot carries it (DESIGN.md:285).

**Counts that do not match their lists today must match after this work** (*builder-check rulings, my calls*: the list follows the bell's definition, never the other way round):
- warranty: the register's `dataQuality=warranty` uses 30 days and includes licences, the bell uses the setting's days and excludes them → the register filter follows the bell;
- licence expiry: the bell's row links to `ownershipType=software_license` with no date and no `exact` → a licence-expiry filter value on the register;
- returns due soon: the row links to the check-in form, which needs `asset:edit` and is not a list → a register filter for open loans due back within the bell's window (chip "ใกล้/เลยกำหนดคืน"), readable with `asset:view`;
- open audit actions and audit actions due soon: both link to `/audit/findings?status=all`, whose open-actions filter also counts finished actions and whose overdue filter has no due-soon window → the findings page's action filters follow the bell's two definitions, one value each.

The builder checks every kind's link against its count in a unit test and in E2E.

### 6.4 The KPI row

Four StatStrip cells at the top level (never inside a panel):
1. **ทรัพย์สินทั้งหมด**: every active asset (today's count), link to the register with `exact=1`. Foot "ไม่มีความเคลื่อนไหวเกิน 180 วัน N" linking to the existing `activity=idle_180d` filter (*my call*: a planning number the register can already show; the canvas foot "ไม่รวมที่ตัดจำหน่ายแล้ว" has no list).
2. **มีผู้ถือครอง**: assets with a custodian that are not Disposed or Retired, with its share of all assets that are not Disposed or Retired as "79%". Link to a new register filter `custodianState=assigned` (chip "มีผู้ถือครอง"). Foot "ยังไม่มีผู้รับผิดชอบ N" linking to the existing `dataQuality=responsibility`. (*My call*: the canvas number equals the In Use count, which the status section already shows; addition 5.)
3. **งานที่รอคุณ** (§6.3).
4. **รอบตรวจนับ <code>**: the current round's progress "68%" with a progress bar, foot "ตรวจแล้ว 1,177 / 1,731 · ควรถึง 75%", link to the round. The current round (*my call*): an `open` round whose start ≤ today ≤ due date, nearest due date first; else the open round that passed its due date most recently; else the cell says "ไม่มีรอบตรวจนับที่เปิดอยู่" and links to the rounds list. When more than one round qualifies, the branch section's header links "รอบอื่นที่เปิดอยู่ N" to the rounds list.

The monthly trends panel and the "ใกล้หมดประกัน" KPI go (warranty is a waiting-work kind now; the trends have no list to trace to).

### 6.5 Traceability (addition 3)

- Every number is a link to a list with the same filter and `exact=1` where the list is the register.
- **The filter is readable on hover and on keyboard focus** (*my call*): StatStrip gains an optional filter note, a short sentence such as "สถานะ = ใช้งานอยู่ · ไม่รวมตัดจำหน่าย", shown in a small panel under the cell on hover and on `:focus-visible` (CSS only, so the cell stays a server-safe link) and tied to the link with `aria-describedby`. Status segments and the waiting-work counts carry the same note through their accessible names or a title.
- The list shows a chip for the filter it received (the register's existing chips; new chips for `custodianState`, `locationId` and the licence-expiry value). The company chip on the register shows on desktop too when the link carries `companyId` (today it is phone-only).

### 6.6 ตามสถานะ, the cross-scope line, and the data bar rule

- A stacked bar of every status with a count above zero (no merged "รอซ่อม / ระหว่างซ่อม" row, no missing statuses), from the register's own `groupBy(statusId)`, in `sortOrder`. Under it a table: marker, status name (link to the register with `statusId` and `exact=1`), count, share. Desktop shows the share; the phone shows counts only.
- No "รวม N" in the header: the total is the first KPI (addition 5).
- Under the table, once on the page: "นอกขอบเขตเจ้าของรหัส N รายการ" linking to `crossScope=all` with `exact=1`. The cross-scope KPI, the action card, the four-cell panel and the five preview rows go.
- **New DESIGN.md rule, "Data bars" (*my call*):** a distribution bar and a progress bar are the only places a status colour may fill an area outside the listed ones. Each segment uses the fill of the status's own badge tone, segments are separated by a 2px surface gap, every fill reaches 3:1 against the panel in both themes (pairs added to `tests/design-tokens-contrast.test.ts`), and the bar is never the only carrier of meaning: the table or the text beside it says the same thing. The bar itself is `role="img"` with a sentence.

### 6.7 ตรวจนับแยกสาขา (addition 4)

- One row per expected branch of the current round (`AuditItem.expectedBranchId`), bar = processed / expected for that branch.
- **The pace line:** `clamp((today − start) / (due − start), 0, 1)` in Bangkok days, drawn as a thin vertical mark on every bar, legend "ควรถึงวันนี้". A branch below the pace gets the text "ช้ากว่าที่ควร" with an icon and a warning fill on its bar (the data bar rule); the text carries the meaning.
- Rows sorted by the gap to the pace, the most behind first. Desktop shows up to eight and links "ดูทุกสาขา" to the round; the phone shows three.
- Each row links to the round's item list filtered by branch: the round detail page gains a `branchId` filter and its chip, so the list shows the same count.

### 6.8 ล่าสุด (desktop only)

- The latest five asset events from `AssetMovement` (*my call*: today the feed is the system log of every module, settings edits included, shown to anyone; `/admin/logs` itself needs `system:view`). Shown to people with `asset:view`.
- One line each: the time ("21:40" today, "เมื่อวาน", else the date), a sentence built from the movement's Thai label with the asset tag as a link (mono), and the document code as a link when there is one.
- No "ทั้งหมด" link (there is no list of all movements).

## 7. The asset detail

### 7.1 One action rule (addition 1)

A shared function replaces both `getAssetRegisterTransactionActions` + `getRowNextAction` on the register and `getOwnershipLifecycle` on the detail. Input: status, ownership type, the open checkout (if any), the open repair record (if any), the open disposal request (if any), and the person's permissions. Output: the primary action and the ordered transaction items, each `{ key, label, href, enabled, reason }`. Open checkout, repair and disposal come from dedicated queries (as the register does today), never from the detail's view-limited relations. Every href carries `returnTo` = the page the person is on.

**What the two pages share** (*builder-check ruling, my call*): the primary and the transaction items (labels, available or not, reasons, order). The register row's next button is that primary, and its ⋯ starts with those transaction items; the detail's primary and the top of its "อื่น ๆ" are the same. Each page keeps its own extras after them: the register its edit, clone and delete; the detail the items listed under "อื่น ๆ" below. The register reads the open repair and disposal ids for the rows of the page it shows (one query each, as it already does for open checkouts), so "ดูงานซ่อม" and "ดูคำขอตัดจำหน่าย" can link from the row.

**Labels follow the ownership type, on both pages** (*my call*):

| Operation | personal | stock | shared | component |
|---|---|---|---|---|
| checkout | ส่งมอบ | เบิกจากคลัง | ยืมใช้ชั่วคราว | — |
| checkin | รับคืน | รับคืน | รับคืน | — |
| transfer | โอนย้าย | ย้ายคลัง/ตำแหน่ง | ย้ายจุดติดตั้ง | ย้ายชิ้นส่วน |

A software licence has its own actions (ผูก License, ต่ออายุ License), which are edits.

**The primary action** (*my call*; the first that applies):
1. An open checkout, or a legacy custodian the return rule accepts → รับคืน.
2. A component → จัดการส่วนควบ. A licence → ผูก License.
3. Ready → the checkout label (personal, stock), or ย้ายจุดติดตั้ง (shared, today's first action).
4. Pending Repair or Under Maintenance with an open repair record → "ดูงานซ่อม" (the record).
5. Pending Repair without a record → บันทึกซ่อม.
6. Pending Disposal → "ดูคำขอตัดจำหน่าย".
7. Otherwise (In Use without a return the rule accepts, Lost, Missing, Under Inspection, Disposed, Retired) → no primary; the transactions stay in "อื่น ๆ" and the register's ⋯.

**Pinned beside the primary:** "พิมพ์ป้าย" (everyone who can open the page) and "บันทึกซ่อม" when the repair rule allows it (`repair-record-policy.ts`) and the person has `maintenance:create`.

**"อื่น ๆ"** (a text button on desktop, "การดำเนินการอื่น" icon on the phone), in this order: the other transactions of the ownership type (available first, then unavailable ones as `DropdownMenuItem unavailable` with the reason, using the existing `asset.transactionReason*` sentences); ขอตัดจำหน่าย (`disposal:create`, when the status allows); แก้ไขสถานะ (status correction, `asset:edit`, when `canCorrectAssetStatus`); ยกเลิกรายการล่าสุด (`asset:edit`, when the latest transaction is active); จัดการส่วนควบ (`asset:edit`); คัดลอกเป็นรายการใหม่ (`asset:create`); แก้ไข (phone only). An action the person has no permission for is left out, never shown as unavailable. The activity and evidence drawers go (the history and files tabs replace them).

**Transfers follow the API exactly** (*builder-check ruling, my call*): the rule never offers what the API refuses and never hides what it accepts. A transfer that sets a custodian (personal) needs Ready or In Use; a move without a custodian (stock, shared, component: a location or department move) is accepted in every status except Disposed and Retired; an open checkout makes either unavailable, with its reason (today's rule).

### 7.2 Header

- Breadcrumbs: "ทะเบียนทรัพย์สิน" (→ `returnTo`) › a middle crumb when `returnTo` holds a search or filters ("ผลค้นหา "notebook"", else "ผลการกรอง") › the asset tag.
- **Previous / next "3 / 24"** (addition 4): only when the raw `returnTo` is a register URL. The neighbours come from the register's own where and order applied to `returnTo`'s query; the register's sort gains `id` as the tie-break, on both pages, so the order is stable. The lookup selects ids only and never loads whole rows. Both links keep `returnTo`. The first item has no previous link and the last no next link. Opened directly, from the scan page, or from any other page: no counter and no links. "Opened directly" must be told apart from "returned to the plain register", so the raw `returnTo` is read before `normalizeAssetReturnTo` turns a missing one into `/th/assets`.
- `PageBackLink` stays on both widths (DESIGN.md:559 wins over the board): "กลับไปผลค้นหา" from the register, "กลับไปสแกน" from the scan page.
- Title = the asset name. Meta row in DESIGN order: the tag (mono), the status badge with its help, "S/N …". The condition badge moves to "ข้อมูลทรัพย์สิน". `data-testid="asset-identity-summary"` stays on the meta row.
- Actions in DESIGN order (DESIGN.md:555): back, "อื่น ๆ", the pinned buttons, the primary last.

### 7.3 Tabs

ภาพรวม · ประวัติ N · ส่วนควบ N · ไฟล์ N · ซ่อม / PM N, as TabNav links. The URL keeps `?view=` (*my call*) with the values `overview | history | components | files | maintenance`. Old values keep working: `custody` → components, `operations` → history, `audit` → history with the ตรวจนับ chip chosen. `#photos` and `#purchase` links from reports land on the files tab and on "ข้อมูลทรัพย์สิน". Counts: history events, components plus parent, asset files, repair records.

### 7.4 The fact strip (addition 3)

A new shared part: a `dl` of four cells, each a label, a value that may be a link, and a sub-line that may hold a link. Shown under the tabs on every desktop tab; on the phone on the overview only.
1. **First cell, by ownership type:**
   - personal "ผู้ถือครอง": the name (link to the employee page with `employee:view`, else to the register filtered by `custodianId`); sub-line: the department · "ถือมาแล้ว N วัน" from the open checkout's date (hidden when there is no dated checkout); "ยังไม่มีผู้ถือครอง" when none;
   - stock "หน่วยงานที่ดูแล", shared "หน่วยงานที่ใช้": the department;
   - component "เป็นส่วนควบของ": the parent's tag and name, linked (replaces the component context banner);
   - licence "ที่นั่ง": "ใช้แล้ว 2/5 คงเหลือ 3".
2. **ที่ตั้ง:** the location name, linked to the register filtered by the new `locationId` filter (chip "ที่ตั้ง: …"); sub-line: the branch and the parent location.
3. **ตรวจนับล่าสุด:** the latest result ("ตรง", "ไม่ตรง", …) in its tone ink; sub-line: the date and the round code linked to the round. Pending in an open round: "รอตรวจในรอบ AUD-…". Never audited: "ยังไม่เคยตรวจนับ".
4. **ประกัน:** "ถึง 12 ม.ค. 2570", "หมดแล้วเมื่อ …" or "ไม่ทราบ"; when unknown and the person has `asset:edit`, the sub-line links "บันทึกข้อมูลการซื้อ" to the edit form's purchase section (the form gains an anchor there).

### 7.5 Overview tab

- **ข้อมูลทรัพย์สิน** (`id="overview"`, 8 columns, "แก้ไข" for `asset:edit`): KeyValueList of หมวดหมู่ (path), บริษัทเจ้าของรหัส, สาขาเจ้าของรหัส, ยี่ห้อ / รุ่น, Serial number, สภาพ (badge and help), หน่วยงาน and ที่ตั้งประจำ when set, the specs when filled, ลงทะเบียน, ใบส่งมอบล่าสุด (HO- link), หมายเหตุ. Then the purchase rows when filled (ราคา, วันที่ซื้อ, ผู้ขาย, วันหมดประกัน, and "เอกสารซื้อ" listing each linked purchase document's number as a link to the files tab's "เอกสารการซื้อ" section); when empty, the prompt "ยังไม่มีข้อมูลการซื้อ: ราคา ผู้ขาย วันหมดประกัน" with "เพิ่มข้อมูล" for `asset:edit` (others see the empty values only).
- **รูป** (4 columns; first on the phone): the asset's main photo, else the model photo labelled "รูปรุ่น", else the empty state "ยังไม่มีรูป รูปช่วยให้หาเจอตอนเดินตรวจนับ" with "อัปโหลดรูป" (desktop) or "ถ่ายรูป" (phone, camera capture) for `asset:edit`. The photo loads a card-size WebP from the thumbnail route (which gains a larger size), never the original file; a click opens the original. A photo that fails to load shows a placeholder "โหลดรูปไม่ได้" with the upload action for editors (addition 5). The original-file route answers 404, not 500, for a missing file.
- **ความเคลื่อนไหวล่าสุด** (8 columns): the latest 3 events of the timeline (§7.6), link "ดูประวัติทั้งหมด N รายการ".
- **อุปกรณ์ส่วนควบ** (4 columns): the children (tag and name) or the parent line; "จัดการ" → the components tab; "ไม่มีส่วนควบ" when neither.

### 7.6 History tab (addition 2)

- **One timeline helper** builds every event of the asset: `AssetMovement` as the spine; audit items for scans that changed nothing (they write no movement); repair-record close details merged into the repair movements; component events from movements only. Today's duplicates (a repair as both a movement and a ticket, a component install as both a movement and a link) go. Every movement type has a Thai label; a test fails when a type has none.
- **Chips** (ChoiceChip radio, with counts): ทั้งหมด · ส่งมอบ · รับคืน · โอนย้าย · ตรวจนับ · ซ่อม · ตัดจำหน่าย · ส่วนควบ · แก้ไขข้อมูล (cancels count with their transaction's type). `?type=` sets the first chip; choosing a chip does not navigate.
- A period select: ทั้งหมด / 12 เดือนล่าสุด.
- Table: วันที่ เวลา | ประเภท | รายละเอียด | ผู้บันทึก | เอกสาร, with month group rows. The document column links HO-, RT-, TR-, repair records, disposal requests and audit rounds.
- 50 rows at a time with "แสดงเพิ่ม (เหลือ N รายการ)".
- "ส่งออก Excel" (`asset:view`, as the register export): all events with the type column, through the existing `asset-excel.ts` helpers.
- Phone: chips, month headings, one link card per event.

### 7.7 Components, files, repair / PM tabs

- **ส่วนควบ:** the relationship map as today (the current card's meta becomes "ผู้ถือครอง : …"), "จัดการส่วนควบ" for `asset:edit`, then "ประวัติการติดตั้ง / ถอด" (date, event, component, note with the reason and the reference link).
- **ไฟล์:** "รูปและไฟล์แนบ" of the asset (modules asset and asset_purchase): photos with their checklist labels, documents with size, date, download, and delete for `asset:edit` (through the destructive confirm). Upload for `asset:edit` only: FileDropzone with several files at once, and "ถ่ายรูป" on the phone. A section "เอกสารการซื้อ" holds today's linked purchase documents as they are (`asset-purchase-documents.tsx`: number, PO, invoice, supplier, amount, files, and the unlink for `asset:edit`) (*builder-check ruling, my call*). A read-only section "หลักฐานจากงานอื่น" lists the handover signatures and photos, the component install and remove photos, and the repair, finding and disposal evidence, each linked to its document (it replaces the evidence drawer and the handover evidence grid).
- **ซ่อม / PM:** a StatStrip "ซ่อมมาแล้ว N ครั้ง", "เวลาที่ไม่ได้ใช้งานเพราะซ่อม N วัน" (sum of report → return dates, today for open ones), "ค่าใช้จ่ายซ่อมรวม N บาท"; today's replacement Notice (3 repairs or more, or cost at least half the price); the repair table (เลขงาน, อาการ, สิ่งที่ทำ, เปิด – ปิด and days, ผู้ซ่อม, ค่าใช้จ่าย, สถานะ) with "บันทึกซ่อม" by the rule; "บำรุงรักษาตามรอบ (PM)" listing the asset's PM plans (loaded for the first time) with "ตั้งรอบ PM" for `maintenance:create`, or the empty state of the board.

### 7.8 The phone

- Header of the board: back, the tag with "3 / 24" and a next link, the status badge, the title, the tabs.
- **A sticky bottom bar** (addition 5) on every tab: the primary (wide), "บันทึกซ่อม" when pinned, and "การดำเนินการอื่น" opening a bottom sheet with the "อื่น ๆ" items. `ActionBar` gains this "more" slot (DESIGN.md:689 deferred it; this group builds it, through `RowActions`' sheet). The bar shows only when the person has at least one action. From the scan page the wide button is "สแกนรายการถัดไป" and the rule's primary takes the second place (*my call*, today's field flow).

### 7.9 What leaves the overview, and where it goes (*my calls*)

| Today | Goes to |
|---|---|
| QR panel | "พิมพ์ป้าย" (the label page holds the QR) |
| Model photo card | the รูป card's fallback |
| สิ่งที่ต้องติดตาม and data health | their own places: the primary action (an open handover), the ซ่อม / PM tab count and primary (an open repair), the ประกัน cell, the ตรวจนับล่าสุด cell, the empty photo and purchase prompts |
| The ownership notice | the action reasons |
| Status correction button | "อื่น ๆ" |
| Specs, department, home location, purchase rows | "ข้อมูลทรัพย์สิน" |
| Linked purchase documents | the files tab's "เอกสารการซื้อ", linked from "ข้อมูลทรัพย์สิน" |
| Handover cards with evidence | the history rows and their HO-/RT- links; the evidence in the files tab |
| Activity and evidence drawers | the history and files tabs |
| Audit view (scan count, finding required) | the ตรวจนับ chip and the fact strip |
| Licence seats | the fact strip's first cell |
| Component context banner | the fact strip's first cell |
| Clone, cancel latest | "อื่น ๆ" |

## 8. The login

- **Frame:** the page backdrop uses the navy menu tokens (`--sidebar*`, navy in both themes) with the canvas's gradient, glow and line art as token-based classes in `globals.css`; the card uses the surface tokens, so it is white in light and the dark panel in dark, with a border, the 4px accent line along its top and no shadow (*plan ruling, my call*: DESIGN.md's flat rule); the theme still follows the cookie or the OS. The 2026-07-11 rule against gradients and glass on the login is superseded by the user's choice of B.
- **Header:** the real app icon (`ring-app-icon-frame`, not the canvas cube), "ระบบบริหารทรัพย์สิน" (`nav.brandName`) over the company name, the environment pill, the language switch.
- **Company name:** the `company_name` setting, read alone with `findUnique` + `select` (never the whole table, which holds `ldap_bind_password`), hidden when empty or still the seed default, and the page renders without it when the read fails. The same Thai name on the English page.
- **Environment pill "ระบบทดสอบ"** (*my call*): shown when the database the app connects to is not `asset_management`, worked out on the server; only a boolean reaches the page. Footer note: "ระบบทดสอบ ใช้สำหรับทดลองเท่านั้น" (the canvas's "ข้อมูลในระบบนี้ไม่ใช่ข้อมูลจริง" is untrue: the dev database is a copy of Production).
- **Language switch:** "ไทย" / "English" as links (they work before hydration), each in its own language with `lang`; the other locale's link keeps `reason` and re-prefixes the normalized `callbackUrl` to that locale.
- **Hero** (desktop, from `lg`): the tagline "รู้ทุกทรัพย์สิน / ว่าอยู่ที่ไหน อยู่กับใคร", the body line, and the three glass cards **without numbers or codes** (*my call*: "1,751", "HO-2026-0412" and "AUD-2026-0003" would read as live data before sign-in), `aria-hidden`. The "IT Asset Management" pill goes (it fails the glossary test). Phone: the pill and the tagline only.
- **Card:** the only `<h1>` "เข้าสู่ระบบ"; the hint "ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับที่เข้าเครื่องคอมพิวเตอร์ของบริษัท" under it, on both widths, always shown (the ShieldCheck row goes); the session-expired notice (its text alone in its element); the destination line; the fields; the button.
- **Destination line** "เข้าแล้วจะไปที่ <page>" (*my call*): the page kind from a fixed table of routes (for example "รายละเอียดทรัพย์สิน", "ทะเบียนทรัพย์สิน"), from the normalized `callbackUrl` only; no asset tag (that would need a database read for a person who is not signed in); hidden when the callback is the home.
- **Fields:** `#login-username` (`autoCapitalize="none"`, `spellCheck={false}`) and `#login-password` keep their ids and autocomplete; the fields and the button keep the shared sizes they have today (*plan ruling, my call*: the shared parts have no 44px-desktop / 48px-phone pair, and a page-only height is what the size guards forbid); no leading icons (*my call*: the labels are visible). Show password becomes the text "แสดง" / "ซ่อน" with the accessible names "แสดงรหัสผ่าน" / "ซ่อนรหัสผ่าน" and no `aria-pressed` (the name already says the state).
- **Caps Lock:** on desktop, a `role="status"` line "Caps Lock เปิดอยู่" under the password, tied by `aria-describedby`, while the key is on and the field has focus.
- **Errors:** today's generic `loginFailed` / `loginRateLimited`, form-level, `role="alert"`, inside the form, never per field, never hinting which part failed. The phone board's "หรือติดต่อ IT ด้านล่าง" goes.
- **Footer:** "© 2569 <company>" (Buddhist year in Thai, Gregorian in English) and the environment note. No version (*my call*: `package.json` is never bumped; a wrong version is worse than none). 12px at least.
- **Two fixes in passing:** a submit before hydration must never put the password in the URL (the form has no method today; the builder proves the fix in a test); a visitor with a valid session is sent on to the normalized `callbackUrl`, unless the URL says `reason=session-expired` (*plan ruling, my call*: the client can end a session the server still accepts, as the E2E's stand-in does, and the login must then show its notice, not bounce back).
- **Unchanged:** the rate limit, the local-then-LDAP order, no `NEXT_PUBLIC_*`, no LDAP value on the client, the button name "เข้าสู่ระบบ" and no other button with that name.
- DESIGN.md's "phase 3 login frame" (the LH1 row, DESIGN.md:202 and :312, `tests/phase2d-docs.test.ts:30`) closes in the same commit.

## 9. Work outside the three pages that this group needs

- Register: `id` tie-break in the sort; filters `locationId`, `custodianState=assigned`, the licence-expiry value and loans due back, with chips; the warranty filter follows the bell's rule; the company chip on desktop; the row's next button and the start of its ⋯ from the shared rule (§7.1).
- Audit round detail: a `branchId` filter and chip. Audit findings: the two action filters follow the bell's definitions.
- Work center: its shared kinds read the shared source (§6.3).
- The shared waiting-work source (§6.3) and its two new bell kinds.
- Attachments: the thumbnail route's card size; 404 on the original route for a missing file.
- StatStrip filter note; the fact strip; ActionBar's more slot.
- DESIGN.md, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `.impeccable/design.json`: the data bar rule, the fact strip, ActionBar's more slot, the detail tabs, the login frame.

## 10. E2E

The dev database is a copy of Production whose counts move between runs, so dashboard steps compare two surfaces, never absolute numbers. Every visit runs axe in four projects.

- **Dashboard:** (a) as the IT head, each "งานที่รอคุณ" row equals the bell box row of the same kind (reusing the bell test's pending disposal); (b) role order: the IT head sees the approval row first, IT staff a repair or mismatch row first, the viewer the totals first; (c) a KPI and a status segment open the register with `exact=1`, whose count and chip match; on focus a cell's filter note is readable; (d) a round created by the test shows its pace mark from its own dates; (e) the cross-scope number appears once; the landing smoke keeps an `h1`.
- **Asset detail:** (1) for one asset, the detail's primary and the transaction items in "อื่น ๆ" match the register row's next button and the transaction items of its ⋯, reasons included; (2) chips filter the history, the overview shows 3, HO-/RT-/TR- links open; (3) the fact strip links open the employee, the register by location, the round; "ถือมาแล้ว N วัน" matches the handover date; (4) from a register search, "1 / N" and the next link keep `returnTo`; opened directly, no counter; (5) on the phone, the primary sits in the bottom bar.
- **Steps that change with the new markup:** transfer (the item moves into "อื่น ๆ"), handover (an unavailable item with its reason instead of a disabled button), cancel ("อื่น ๆ"; the history tab instead of `view=operations`), repair-record ("บันทึกซ่อม" stays), register-asset (the purchase document number in "ข้อมูลทรัพย์สิน"; the photo through the thumbnail route), licence (the seats in the fact strip), desk-delivery (the phone primary is a link "ส่งมอบ"), and `visitAssetPage`'s view names. The viewer still finds no write control.
- **Login:** the smoke reads an `h1` "เข้าสู่ระบบ", the hint line, no "IT Helpdesk"/"อีเมล IT" anything, the pill on dev, the destination line for `callbackUrl=/th/assets/<id>`, and `/en/login` in English, with no click, type or press (the e2e-review guard). The sign-in helper's contract stays (ids, hydration probe, button name, `form [role=alert]`, leaving `/login`).

## 11. Build order

Login, then the dashboard, then the asset detail: smallest first, each merged after its own unit tests and E2E specs pass, and the whole suite once after the third. Each page's plan says whether it needs a dry run.

## 12. Left to the builder

The exact Tailwind classes and token names within DESIGN.md; the SQL shape of each count; the name of the fact strip part (within the guards); the route table of the destination line; the timeline helper's internal shape; the query that finds previous and next; the thumbnail size; test names and file splits.
