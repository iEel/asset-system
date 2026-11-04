# Page Group 5, Plan 5: The Repair List (MT-List) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/maintenance` as spec §11 sets it: the "ต้องจัดการ" strip with four link cells, the stuck card and the PM card that always render, and the records section with status tabs, search, a date chip, six columns, the cost total and phone cards.

**Architecture:**
- **Reads:** one server reader, `readRepairListPage`, does every count and row in a single `Promise.all`. It reuses plan 1's `readPmDueCounts`, `buildDuePmPlanWhere`, `stuckRepairsWhere` and `openRepairRecordWhere`.
- **Pure helpers:** the row view, the strip and the card links. They live in a client-safe view file.
- **Page:** a server component built from the shared parts.
- **Client part:** only the date chip. Its inputs join the toolbar's GET form through the `form` attribute.

**Tech Stack:** Next.js 16 (App Router, server components), next-intl, Prisma 7 on SQL Server, `node --test` with `npx tsx --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-page-group-5-maintenance-design.md`, chiefly:
- §11 (the list), §5 (rules), §6 (the MT-List rows), §13 ("repairRecord (list)"), §16 and §17 row 5;
- decisions 6 and 7;
- calls 23–27 and 32;
- Appendix A "List" and Appendix B.

**Dry run:** none. There is no migration and no Production data. The page and its specs run on the dev DB (spec §17).

## Global Constraints

- **Parts and styling:**
  - Use the shared parts and tokens only (spec §5). No hex or rgba in tsx, no `dark:`, no `/NN` tints, no dashed borders.
  - State colour goes only in badges. A cell that needs action takes `attention`.
- **Words:**
  - Thai first; use the words in `docs/19_THAI_GLOSSARY.md`.
  - Change messages only through `node scripts/messages-edit.mjs <file>`, in Thai and English.
  - Use the §13 values verbatim. "บันทึก" (not "ใบงาน") names a record.
- **Stable hooks:**
  - `section#stuck` and `section#pm-due` always render.
  - URL contracts stay: `?status=in_progress|closed|cancelled`, `?assetId=` with the chip "เฉพาะทรัพย์สินนี้", `search`, `dateFrom`, `dateTo`, `page`, `pageSize`.
  - The export link carries the same query.
- **Permissions (spec §6):**
  - view: the page, the strip, both cards, the table and "ดูทั้งหมด".
  - create: the header's "บันทึกซ่อม", the stuck row's "บันทึกซ่อม" and the PM row's "บันทึกว่าทำแล้ว".
  - view: "จัดการแผน PM".
  - export: "ส่งออก Excel".
- **Links:** every outbound link from the page carries `returnTo` (`appendOperationalReturnTo`), as today.
- **Bangkok days:** day counts compare Bangkok days only (`bangkokDayDiff`, `getBangkokDateKey`); the date filter is already Bangkok.
- **Paging:**
  - Sizes 25/50/100; a page past the end redirects to the last page.
  - Sort `reportedDate desc, createdAt desc`.
  - The pager's range line keeps `common.showingRange` ("<from>–<to> จาก <total> รายการ"); the dashboard E2E reads it (`e2e/dashboard/dashboard-steps.ts` `LIST_TOTAL`).
- **Old statuses:** old workflow statuses fold into ยังซ่อมไม่เสร็จ (`toRepairRecordStatus`).
- **Guard tests:** each source-reading test that pins a changed file is rewritten in the same task: `tests/repair-record-list-ui.test.ts`, `tests/maintenance-sweep-ui.test.ts`, `tests/maintenance-pagination-ui.test.ts` and `tests/waiting-work-links.test.ts`.

## Rulings (the controller's, before execution)

- **G5P5-R1:** the strip cells count globally, like the bell: open records, stuck assets, PM overdue and PM within 7 days.
  - They do not follow the search. Spec §11.1 names the bell's wheres.
  - A cell links to its plain target: `/{locale}/maintenance?status=in_progress`, `#stuck`, `/{locale}/maintenance/pm?due=overdue` and `?due=week`.
  - The open-repairs cell is `current` when `status=in_progress`.
- **G5P5-R2:** "ต้องจัดการ {count} เรื่อง" is the sum of the four cell counts. Its parts line "a + b + c + d" sits under the heading in the `filterNote` text style (`text-meta text-muted-foreground`). It is a visible line, as on the PM page, not a cell `filterNote` prop. At 0 the heading reads "ไม่มีงานที่ต้องจัดการ" and the strip still shows.
- **G5P5-R3:** `stuck=all` is part of the list query (`parseMaintenanceListParams` reads `stuck: "all" | ""`). The search form keeps it in a hidden input, and the tabs and the pager keep it. `buildMaintenanceWhere` and the export ignore it.
  - "ดูทั้งหมด {count} ชิ้น" links to the query with `stuck=all` and the hash `#stuck`.
  - "แสดงน้อยลง" links to it without `stuck` and the hash `#stuck`.
  - The card shows 3 rows, or every row with `stuck=all`. Production has about 10 stuck assets, so there is no cap.
- **G5P5-R4:** the cost total sums `repairCost` over the filtered where (status, search, date range and asset; decision 7) AND `repairStatus` not `cancelled`.
  - N is the count of those rows; a row without a cost adds 0.
  - "ไม่นับ {count} รายการที่ยกเลิก" shows when the filtered where (status included) holds cancelled rows.
  - On the ยกเลิก tab the foot line is empty.
  - Tab counts use one `groupBy` on `repairStatus` over the filtered where without its status, folded by `toRepairRecordStatus`. ทั้งหมด is their sum.
- **G5P5-R5:** the อาการ / สิ่งที่ซ่อม cell shows the problem and the resolution:
  - with a resolution: the problem on one line (`line-clamp-1`), then the resolution on one muted line (`line-clamp-1`);
  - without one: the problem with `line-clamp-2`.
- **G5P5-R6:** the status cell is the status badge, then one plain secondary line:
  - **closed:** `outcome.usable` "ใช้งานได้", `outcome.beyond_repair` "ซ่อมไม่ได้ เสนอจำหน่าย" or `outcome.unknown` "ไม่ระบุ";
  - **open:** `repairDurationLine` (plan 3) with the words "ส่งซ่อมมา {days} วัน", "ซ่อมมา {days} วัน", "ส่งซ่อมวันนี้" and "ซ่อมวันนี้". Reuse the existing `repairRecord.detail.*` keys if their values match §13; else add list keys;
  - **cancelled:** the latest `maintenance_cancel` movement's `reason`, read once for the page's cancelled rows (`assetMovement.findMany` where `referenceType: "maintenance"`, `referenceId in ids`, `movementType: "maintenance_cancel"`). Nothing shows when the reason is empty.
- **G5P5-R7:** the PM card rows:
  - **Which rows:** the reminder set (`buildDuePmPlanWhere(now)`), `orderBy nextDueDate asc`, 3 rows. Each reads its asset's open record (`asset.maintenanceTickets` where `openRepairRecordWhere`, take 1, `id` and `repairNo`).
  - **Badge:** `pmOverdue` "เกินกำหนด {days} วัน" (danger) for an overdue row, else `pmDueOn` "ครบกำหนด {date}" (warning).
  - **Count badge:** "{count} แผน" = overdue + week.
  - **Foot link (decision 6, call 26):** "ดูแผนที่เกินกำหนด {count} แผน" to `/maintenance/pm?due=overdue` when overdue ≥ 1, else "ดูแผนที่ครบกำหนดใน 7 วัน {count} แผน" to `?due=week`. It is hidden when both are 0.
  - The rows link nowhere except their action.
- **G5P5-R8:** the date chip is a client component, `RepairDateRangeChip`.
  - It uses `FilterMenuChip`'s popover form (`valueText` and `children`).
  - Its two date inputs carry `form="repair-list-filter"`, so the toolbar's GET form submits them. A submit button inside, "ใช้ตัวกรอง" (an existing common key if one fits), sends the form.
  - `valueText` reads "ช่วงวันที่: {from} – {to}" when either date is set (an empty side reads "–"), else "ช่วงวันที่".
  - The invalid-range danger `Notice` stays under the toolbar.

## Review Focus

1. **A search that spans every status:** ทั้งหมด equals the sum of the three tabs. The cost total leaves out cancelled rows and counts open rows with their typed cost. The ยกเลิก tab's foot is empty. *(Task 1 unit test; Task 4 E2E.)*
2. **Records in old workflow statuses** (`reported`, `waiting_vendor`, …): they count in ยังซ่อมไม่เสร็จ, show its badge and get a duration line. *(Task 1 unit test.)*
3. **`stuck=all` with a search and a page in the URL:**
   - the expanded card keeps them;
   - "แสดงน้อยลง" returns to 3 rows;
   - the anchor lands;
   - at 0 stuck assets the card renders its empty line. *(Task 2 pins; Task 4 E2E.)*
4. **A PM card row whose asset has an open record:** it shows "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}" linking to the record with `returnTo`, never "บันทึกว่าทำแล้ว". *(Task 1 unit test of the row view; Task 4 E2E.)*
5. **An invalid date range** (from > to): the notice shows, the where ignores the dates, and the tab counts and the cost total follow that same where. *(Task 1 unit test.)*

---

### Task 1: The list's reads and views

**Files:**
- Modify: `src/lib/maintenance-query.ts`:
  - `stuck` in `MaintenanceListParams` and `parseMaintenanceListParams` (`"all" | ""`);
  - `buildMaintenanceQueryString` writes `stuck=all` when set;
  - new `buildMaintenanceWhereWithoutStatus(filters)`.
- Create:
  - `src/lib/repair-list-view.ts`: pure and client-safe, relative `.ts` imports;
  - `src/lib/repair-list-page-data.ts`: the server reader, with the db injected as in `pm-plan-page-data.ts`.
- Test: `tests/maintenance-query.test.ts`, new `tests/repair-list-view.test.ts`, new `tests/repair-list-page-data.test.ts` (fake db).

**Interfaces:**
- Consumes:
  - `readPmDueCounts(db, now)` (`src/lib/pm-due-counts.ts`, buckets `overdue`, `week`, `soon` and `later`, each with `{ count, earliest }`);
  - `buildDuePmPlanWhere(now)`, `bangkokDayDiff` and `getBangkokDateKey` (`preventive-maintenance.ts`);
  - `stuckRepairsWhere` (`waiting-work-rules.ts`);
  - `openRepairRecordWhere`, `toRepairRecordStatus` and `repairRecordStatuses` (`repair-record-policy.ts`);
  - `repairDurationLine(record, now)` (`repair-record-detail-rules.ts`).
- Produces:
  - **`RepairStatusCounts`:** `type RepairStatusCounts = { all: number; in_progress: number; closed: number; cancelled: number }`.
  - **`foldRepairStatusCounts`:** `foldRepairStatusCounts(groups: { repairStatus: string; _count: { _all: number } }[]): RepairStatusCounts`.
  - **`RepairListRowView`** has:
    - `id`, `repairNo`, `reportedDate` and `asset: { name, assetTag }`;
    - `problem` and `resolution: string | null`;
    - `status: RepairRecordStatus` and `vendorName: string | null`;
    - `reporterName` and `cost: number | null`;
    - `line: { kind: "outcome"; key: "usable" | "beyond_repair" | "unknown" } | { kind: "duration"; key: RepairDurationKey; days: number } | { kind: "cancelReason"; text: string } | null`.
  - **`toRepairListRowView`:** `toRepairListRowView(record, cancelReason: string | null, now: Date): RepairListRowView`.
  - **`PmCardRowView`:** `{ id; title; assetName; assetTag; badge: { kind: "overdue"; days: number } | { kind: "due"; date: Date }; openRecord: { id: string; repairNo: string } | null }`.
  - **`toPmCardRowView`:** `toPmCardRowView(plan, now): PmCardRowView`.
  - **`pmCardFootLink`:** `pmCardFootLink(overdue: number, week: number): { due: "overdue" | "week"; count: number } | null` (G5P5-R7).
  - **`RepairStrip`:** `{ open: { count: number; earliest: Date | null }; stuck: number; pmOverdue: PmDueCount; pmWeek: PmDueCount; total: number }`.
  - **`readRepairListPage`:** `readRepairListPage(db, filters: ParsedMaintenanceListParams, now: Date)` returns:
    - `rows: RepairListRowView[]` and `total` (the filtered count);
    - `statusCounts: RepairStatusCounts`;
    - `cost: { count: number; sum: number; cancelled: number }`;
    - `strip: RepairStrip`;
    - `stuck: { rows: { id; name; assetTag; roomName: string | null }[]; total: number }`;
    - `pm: { rows: PmCardRowView[]; overdue: number; week: number }`.

- [ ] **Step 1: Write the failing tests.**
  - **`foldRepairStatusCounts`:** `[{in_progress 2}, {waiting_vendor 1}, {reported 1}, {closed 3}, {cancelled 1}]` gives `{ all: 8, in_progress: 4, closed: 3, cancelled: 1 }` (Review Focus 2).
  - **`toRepairListRowView`, closed rows:** `outcome: "usable"` gives `line { kind: "outcome", key: "usable" }`; `null` gives key `"unknown"`.
  - **`toRepairListRowView`, open rows:** an open row with a vendor, reported 5 Bangkok days ago, gives `{ kind: "duration", key: "sentDays", days: 5 }`. A `waiting_vendor` row gives status `in_progress` and a duration.
  - **`toRepairListRowView`, cancelled rows:** "แจ้งซ้ำ" gives `{ kind: "cancelReason", text: "แจ้งซ้ำ" }`; an empty reason gives `line: null`.
  - **`toPmCardRowView`:** a plan due 3 Bangkok days ago gives `badge { kind: "overdue", days: 3 }`. A plan whose asset has an open ticket carries `openRecord` (Review Focus 4).
  - **`pmCardFootLink`:** `(2, 5)` → `{ due: "overdue", count: 2 }`; `(0, 5)` → `{ due: "week", count: 5 }`; `(0, 0)` → `null`.
  - **`parseMaintenanceListParams`:** `{ stuck: "all" }` → `stuck: "all"`; `"x"` → `""`. `buildMaintenanceQueryString` writes `stuck=all` only when set. `buildMaintenanceWhere` is unchanged by `stuck`.
  - **`buildMaintenanceWhereWithoutStatus`:** it equals `buildMaintenanceWhere` without its `repairStatus` key. With from > to it has no `reportedDate` (Review Focus 5).
  - **`readRepairListPage`** (fake db):
    - the cost `aggregate` where is `{ AND: [filteredWhere, { repairStatus: { not: "cancelled" } }] }`;
    - the cancelled count uses `{ AND: [filteredWhere, { repairStatus: "cancelled" }] }`;
    - on `status: "cancelled"` the cost is `{ count: 0, sum: 0, cancelled: <n> }` and the page does not show the line (Review Focus 1);
    - the stuck read takes 3, or no `take` with `stuck: "all"`;
    - the strip's `total` is the sum of the four counts.
- [ ] **Step 2: Run** `npx tsx --test tests/maintenance-query.test.ts tests/repair-list-view.test.ts tests/repair-list-page-data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Reads:** one `Promise.all` holding:
    - records: `include` the asset name and tag, the reporter `fullNameTh`, the vendor name;
    - `count`, the status `groupBy`, the cost `aggregate` with `_sum.repairCost` and `_count._all`, the cancelled `count`;
    - the open `aggregate` with `_count` and `_min.reportedDate` over `openRepairRecordWhere`;
    - the stuck `findMany`, with `currentLocation { name }` and `orderBy assetTag asc`, and the stuck `count`;
    - `readPmDueCounts`;
    - the PM `findMany` over `buildDuePmPlanWhere`, take 3, with the asset name, tag and open ticket;
    - then the cancel movements for the cancelled rows on the page.
  - **Decimal:** convert with `Number(...)`; a `null` sum is 0.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and eslint on changed files. Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat(maintenance): the repair list's reads: status counts that follow the filters, the cost total, the strip, the stuck and PM cards, and the row view (group 5 plan 5)`

### Task 2: The header, the strip and the two cards

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`. Switch it to `readRepairListPage` and replace the header, the strip and both sections. The records part keeps today's markup until Task 3.
- Create:
  - `src/components/maintenance/repair-stuck-card.tsx` and `src/components/maintenance/repair-pm-due-card.tsx`: server-safe, props only, `ContentPanel`-based, half width from `lg` (`lg:grid-cols-2` wrapper on the page);
  - `src/components/maintenance/repair-list-strip.tsx`.
- Messages through `<scratchpad>/g5/msg/p5-top.json` (§13 "repairRecord (list)", verbatim):
  - `subtitle`, the strip heading, the empty heading, the four cells and their feet;
  - `stuckCount`, "แสดง {shown} จาก {total}", "ดูทั้งหมด {count} ชิ้น", "แสดงน้อยลง" and the stuck empty line;
  - `pmDueTitle`, `pmDueCount`, `pmDueHelp`, `pmOverdue`, the two foot links and the PM empty line;
  - remove `stuckMore` and `pmDueMore`.
- Test: rewrite `tests/repair-record-list-ui.test.ts`, `tests/maintenance-sweep-ui.test.ts` and `tests/waiting-work-links.test.ts` where they pin the old boxes.

**Interfaces:**
- Consumes: Task 1 (`readRepairListPage`, `RepairStrip`, `PmCardRowView`, `pmCardFootLink`, `buildMaintenanceQueryString` with `stuck`).
- Produces:
  - `RepairListStrip({ strip, locale, current: boolean })`. Cells carry `data-repair-strip-cell="open|stuck|pmOverdue|pmWeek"` (via `StatStripItem.data`), and the parts line carries `data-repair-strip-sum`.
  - `RepairStuckCard({ rows, total, expanded, locale, returnTo, canCreate, moreHref, lessHref })`.
  - `RepairPmDueCard({ rows, overdue, week, locale, returnTo, canCreate })`. Rows carry `data-pm-due-row`.

- [ ] **Step 1: Write the failing pins.**
  - **Header:** H1 `title`, `meta={t("subtitle")}` "ประวัติการซ่อมของทรัพย์สินทุกชิ้น และงานที่ต้องจัดการต่อ". Actions: an outline link "จัดการแผน PM" to `/maintenance/pm`, shown to every viewer, then the primary "บันทึกซ่อม" behind `canCreate`.
  - **Strip:** `StatStrip` with four `href` cells; `attention` on stuck > 0 and pmOverdue > 0. Feet:
    - open: "นานสุด {days} วัน" from `strip.open.earliest`;
    - stuck: "สถานะกับประวัติยังไม่ตรงกัน";
    - PM overdue: "นานสุด {days} วัน";
    - PM week: "ครบกำหนด {date}" or "ไม่มีแผนที่ครบกำหนด".
  - **The strip heading** reads "ต้องจัดการ {count} เรื่อง" with the `a + b + c + d` line, or "ไม่มีงานที่ต้องจัดการ" (G5P5-R2).
  - **Both sections** render with no `stuckTotal > 0 ?` guard, and `id="stuck"` and `id="pm-due"` each appear once.
  - **Stuck rows:**
    - the name is a link to `/assets/<id>` (44px target kept);
    - under it, "tag · room" with the room `Nil` when absent;
    - the outline "บันทึกซ่อม" link to `/maintenance/new?assetId=` with `returnTo`.
  - **Stuck foot:** "แสดง {shown} จาก {total}" with the expand and collapse links (G5P5-R3).
  - **PM rows:**
    - a `StatusBadge` and the "<asset name> · <tag>" line;
    - "บันทึกว่าทำแล้ว" (`planId=`, `returnTo`, behind `canCreate`) or the `pmOpenRecord` link to `/maintenance/<id>` with `returnTo`;
    - the foot link from `pmCardFootLink`.
  - **Messages:** the th values match §13 (sample: `pmDueHelp` "เกินกำหนด {overdue} · ครบกำหนดใน 7 วัน {soon} · เรียงจากที่เกินกำหนดนานที่สุด"). `stuckMore` and `pmDueMore` are gone.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** The strip's PM cells link to the PM page (plan 4's `?due=`). Under `md` the strip shows two cells per row, as `StatStrip` does, and the cards stack.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, eslint, and `npx playwright test --list e2e/repair e2e/dashboard`.
- [ ] **Step 5: Commit** `feat(maintenance): the repair list's ต้องจัดการ strip with four link cells, and the stuck and PM cards that always render (group 5 plan 5)`

### Task 3: The records section

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`, the records part:
  - **Toolbar:** a GET `form id="repair-list-filter" role="search"` with:
    - the status `TabNav` (links via `buildMaintenancePageHref` with `status` and `page: 1`, counts from `statusCounts`, ทั้งหมด first);
    - `SearchField name="search"` with the placeholder "ค้นหาเลขที่ ทรัพย์สิน อาการ เลขใบเสร็จ หรือร้าน";
    - `RepairDateRangeChip`;
    - hidden `assetId`, `status`, `stuck` and `pageSize`;
    - "ส่งออก Excel" (export) to `/api/maintenance-tickets/export?<listQuery>`;
    - the `assetId` `FilterChipList`;
    - the invalid-range `Notice`.
  - **Table:** six columns:
    - "วันที่ · เลขที่";
    - ทรัพย์สิน (plain text);
    - อาการ / สิ่งที่ซ่อม (G5P5-R5);
    - "สถานะ · ผลการซ่อม" (G5P5-R6);
    - ร้าน / ผู้ซ่อมภายนอก (the name or "ช่างภายใน", with "บันทึกโดย {name}" under it);
    - ค่าใช้จ่ายรวม (บาท) (`formatMoney` or `Nil`).

    Rows use `ClickableTableRow` to `/maintenance/<id>` with `returnTo`. Rows carry `data-repair-row`.
  - **Phone cards:** the name first, the tag (`break-all`), the badge (`shrink-0`), the status line, then "<date> · <vendor or ช่างภายใน> · <cost>".
  - **`DataTableFoot`:** "ค่าใช้จ่ายรวม {count} รายการ" with the sum (`data-repair-cost-total`), and "ไม่นับ {count} รายการที่ยกเลิก" (G5P5-R4). Then `Pagination` with `common.showingRange` kept.
  - **Empty states:** today's two.
  - **Removed:** the old `FilterPanel`, `FilterSelect` and the 9-column table.
- Create: `src/components/maintenance/repair-date-range-chip.tsx` (client, G5P5-R8).
- Messages through `<scratchpad>/g5/msg/p5-records.json`:
  - `searchPlaceholder`, "ช่วงวันที่" and "ช่วงวันที่: {from} – {to}";
  - the column heads "วันที่ · เลขที่" and "สถานะ · ผลการซ่อม", and "บันทึกโดย {name}";
  - the duration words if new (G5P5-R6), "ค่าใช้จ่ายรวม {count} รายการ" and "ไม่นับ {count} รายการที่ยกเลิก";
  - delete keys no reader keeps (`filterStatus`, `dateFrom`, `dateTo`, `filter`, `resultCount`, … only when unread).
- Test: `tests/repair-record-list-ui.test.ts`, `tests/maintenance-pagination-ui.test.ts` and `tests/maintenance-sweep-ui.test.ts` (pins), plus a new `tests/repair-date-range-chip-ui.test.ts`.

**Interfaces:**
- Consumes: Task 1 (`RepairListRowView`, `statusCounts`, `cost`) and Task 2 (the page frame).
- Produces: `RepairDateRangeChip({ formId: string; dateFrom: string; dateTo: string; labels: { chip; applied; apply; clear; from; to }; clearHref: string })`.

- [ ] **Step 1: Write the failing pins.**
  - **Toolbar and table:** the page renders `TabNav` with four items and `data-repair-row`, and six `DataTableHead`s (when `canExport` is false, the head count is still six).
  - **Gone:** no `FilterSelect`, no `<FilterPanel`.
  - **Date chip:** the inputs carry `form={formId}` and `name="dateFrom"` / `name="dateTo"`. `valueText` uses the applied words when a date is set.
  - **Foot:** the cost line hides on `status === "cancelled"`. The pager's `range` is `tCommon("showingRange", …)`.
  - **Messages:** the th values match §13.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, eslint, and `npx playwright test --list e2e/repair e2e/dashboard`.
- [ ] **Step 5: Commit** `feat(maintenance): the repair records with status tabs and counts, a search, a date chip, six columns, the cost total and phone cards (group 5 plan 5)`

### Task 4: E2E

**Files:**
- Create: `e2e/repair/repair-list.spec.ts`.
- Modify:
  - `e2e/repair/repair-data.ts` (list helpers: `stripCell(page, key)` and `listRows(page)`);
  - `e2e/repair/repair-record.spec.ts` (list visits: the header "บันทึกซ่อม" link, `?assetId=` rows);
  - `e2e/dashboard/*` only if a word or selector changed;
  - the pins in `tests/e2e-repair.test.ts`.

The new specs, IT staff, with run-marked data:
- **"the strip's cells open lists of their own size"** (Review Focus 1, spec §16):
  - the open cell's count equals the ยังซ่อมไม่เสร็จ tab count of an unfiltered list;
  - the PM cells open `/maintenance/pm?due=overdue|week` whose plan count equals the cell;
  - the stuck cell lands on `#stuck`.
- **"a search's status tabs and cost total":**
  - a run-marked search finds 3 records of one run: open with cost 1,000, closed with 500, cancelled with 200;
  - the tabs read ทั้งหมด 3 · ยังซ่อมไม่เสร็จ 1 · ซ่อมเสร็จแล้ว 1 · ยกเลิก 1;
  - the foot reads "ค่าใช้จ่ายรวม 2 รายการ" with 1,500.00 and "ไม่นับ 1 รายการที่ยกเลิก";
  - the ยกเลิก tab shows no cost line;
  - the cancelled row shows its reason; the open row shows "ซ่อมมา" or "ส่งซ่อมมา".
- **"the stuck card":**
  - a run-marked asset is set to อยู่ระหว่างซ่อม without a record. Use the status-correction path the asset specs already use (`e2e/assets/register-edit-correction.spec.ts`, or the asset API those helpers call);
  - `?stuck=all#stuck` lists it;
  - its "บันทึกซ่อม" opens the form with the asset and `returnTo`;
  - saving ยังซ่อมไม่เสร็จ keeps อยู่ระหว่างซ่อม (decision 11) and the asset leaves the card;
  - "แสดงน้อยลง" collapses the card (Review Focus 3).
- **"the PM card row with an open record"** (Review Focus 4):
  - a run-marked plan due yesterday on an asset with an open record shows "มีบันทึกซ่อมที่ยังไม่เสร็จ <repairNo>" in `#pm-due` when it is among the 3 rows;
  - if the dev DB's older overdue plans push it out, assert through the PM page row instead and record that in the report;
  - then close the record and end the plan.
- **axe:** run it on the list in both themes, as the other list specs do.

- [ ] **Step 1: Write the failing pins. Step 2: Run them. Step 3: Implement.**
- [ ] **Step 4: Run** the pins, `npx playwright test --list e2e/repair e2e/dashboard`, `npm test`, `npx tsc --noEmit` and eslint. No Playwright run: the controller runs it.
- [ ] **Step 5: Commit** `test(e2e): the repair list's strip, status tabs and cost total, the stuck card and the PM card (group 5 plan 5)`

### Task 5: Docs, the whole-suite E2E and the look step (controller)

- **Docs:** `docs/06_WORKFLOWS.md`, `docs/17_REPAIR_RECORD_GUIDE_TH.md` (the list), `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `DESIGN.md` (the list rules: strip with link cells, cards that always render, the cost foot), `docs/99_CHANGELOG.md` and `DEVELOPER_HANDOFF.md`. Then the wiki (status, open questions, log, lint) and memory.
- **E2E on the dev DB** (VPN probe, keep-awake): first `e2e/repair` and `e2e/dashboard`, then **the whole suite** in four projects, once (spec §16: after plan 5).
- **Look step:** the list at 1440, 1024 and 390, both themes, as IT staff and as the viewer:
  - the strip with attention cells;
  - both cards, including empty and expanded;
  - each status tab, and a search;
  - the date chip open and applied;
  - the invalid range;
  - `?assetId=`;
  - the cost foot.
