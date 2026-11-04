# Page group 5, plan 4: the PM page and the PM form (MT-PM, MT-PM-Form) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[locale]/maintenance/pm` and its create and edit forms to boards MT-PM and MT-PM-Form.
- **The PM page:** tabs by plan state, search, and the due cells on Bangkok days. A table names each plan and asset first and shows the day count. Each row offers "บันทึกว่าทำแล้ว", or, when the asset already has an open repair record, a link to that record. The state actions sit in ⋯.
- **The form:** three sections, a four-round preview, a summary of what the save changes on the PM page, and a sticky footer.

**Architecture:**
- **Two pure modules:** `src/lib/pm-plan-list.ts` (query parsing, where builders, row view model) and `src/lib/pm-plan-form-rules.ts` (validation, the preview, the summary, the impact on the PM page).
- **The PM page** stays a server page. Its ⋯ dialogs go through a client row wrapper with an `open()` handle (`DESIGN.md:651`).
- **The form** moves onto `OperationFormFrame`, as plan 2 did.
- **Reuse:** the plan-1 rules (`buildPmDueBucketWhere`, `readPmDueCounts`, `getPmDueBadge`, `expectedUpdatedAt`, `pmAsset`) and the plan-2 facts read (`loadRepairAssetFacts`).

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, `node --test` (`npx tsx --test`), Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-03-page-group-5-maintenance-design.md`, these parts:
- §9 and §10, in full;
- §5;
- §6, the MT-PM and MT-PM-Form rows;
- §13, the "maintenancePage" PM page and PM form words;
- §16, the PM specs;
- §17, row 4;
- decisions 10.1, 10.2 and 10.4, and calls 18–22 and 31;
- Appendix A, "PM page" and "PM form";
- Appendix B.

**Boards:** session scratchpad `artifact-files/182f6683-…/project/MT-PM.dc.html` and `MT-PM-Form.dc.html` (PNG `g5/boards/MT-PM.png`, `MT-PM-Form.png`). **Recon:** `g5/recon/r-pm.md`. Its gaps S2 and S5–S8 were closed by plan 1. Scratchpad: `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/`.

## Global Constraints

- **Branch and repo:**
  - Branch `feat/group5-pm-page` from `master` `c1cb0b9a`. No push.
  - No schema change, no migration and no database command.
  - Implementer tasks run no build, no dev server and no E2E. `npx playwright test --list` is fine.
- **Files to leave alone:**
  - Never read `.env*`.
  - Do not touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md` and `.claude/worktrees/`.
- **Parts and tokens:**
  - Use the shared parts only (spec §5): `PageHeader`, `TabNav`, `SearchField`, `StatStrip` (`href`, `current`, `attention`, `filterNote`), `FilterChipList`, `DataTable`, `ClickableTableRow`, `DataTableFoot`, `Pagination`, `RowActions`, `StatusBadge`, `Chip`, `Nil`, `ActionEmptyState`, `OperationFormFrame`, `FormSection`, `Segmented`, `OperationSummaryCard`, `AssetThumbnail`, `MaintenanceOptionSelect`.
  - No hex or rgba, no `dark:`, no `/NN` tints, no dashed borders, no tinted cells. The board's red and amber tiles become `attention` foot lines (Appendix B).
- **Words:**
  - Change messages only through `node scripts/messages-edit.mjs <file>`. Change files go in `<scratchpad>/g5/msg/p4-*.json`, Thai and English.
  - Use the spec §13 "maintenancePage" values verbatim.
  - English counts use ICU plurals. Thai counts use `{count, number}` where the plural guard asks for it.
  - The glossary test stays green.
- **Pickers:** they keep "code - name". Rows and cards show the name first and the code under it.
- **Bangkok days:** every due count, badge and day count goes through the plan-1 helpers.
- **Stable hooks:**
  - These ids stay: `#maintenance-plan-title`, `#maintenance-plan-title-error`, `#maintenance-plan-frequency` (now on the `Segmented` group), `#maintenance-plan-next-due-date` and `#maintenance-plan-asset`.
  - These are new: `data-pm-plan-row="<planId>"` on each table row and `data-pm-due-cell="overdue|soon|later"` on each due cell.
- **Guards:**
  - Each source-reading test that pins a changed file moves in the same task (`tests/pm-plans-ui.test.ts`, `pm-due-dates`, `preventive-maintenance`, `v-track2-m` and others the run names).
  - `/th/maintenance/pm/new` and `/th/maintenance/pm/sample-1/edit` join `STICKY_FOOTER_ROUTES` under `operation-form-frame.tsx`.
- **Commits:**
  - CRLF files keep CRLF.
  - Before each commit, run the focused tests, `npm test`, `npx tsc --noEmit` and eslint on the changed files.
  - Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings made while planning

- **G5P4-R1 (counts follow the search):**
  - The tab counts and the due cells count the plans that match the page's `q`. A cell's link keeps `q`, so it opens a list of its own size (spec anti-goal).
  - `readPmDueCounts(db, now, where?)` gains an optional where that is ANDed in.
  - The tab counts come from one `groupBy({ by: ["planState"] })` on the search where.
- **G5P4-R2 (the due filter):**
  - `?due=overdue|soon|later|week` applies `buildPmDueBucketWhere`, and only on the active tab.
  - The cells are overdue, soon (14 days) and later. `week` is the chip of call 18.
  - A cell already in use links back to the list without `due`. An unknown value is ignored.
- **G5P4-R3 (the active tab's scope):** the active tab lists every plan with `planState = "active"`, including plans of a written-off or inactive asset. Such a row shows the asset's status badge in place of the due badge, and the cells do not count it (spec §9 scope note). The filter line then adds "· ไม่นับ {count} แผนของทรัพย์สินที่ตัดจำหน่ายหรือปลดระวางแล้ว" from `readPmDueCounts().outOfScope`.
- **G5P4-R4 (order):**
  - The active and paused tabs sort by `nextDueDate` ascending, then `id`.
  - The ended tab sorts by `updatedAt` descending, then `id` (call 20).
  - `planStatePageSlices` and its tests leave the codebase, since one state is shown per page. DESIGN.md's list rule is updated.
- **G5P4-R5 (the open-record link, call 31):**
  - The open records of the page's assets are read in one query (`openRepairRecordWhere`, `assetId in`, newest per asset).
  - Such a row has no "บันทึกว่าทำแล้ว". It shows the text link "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}" to `/{locale}/maintenance/<id>?returnTo=<this page>` in the actions cell, before ⋯, for anyone who can read the page.
  - The plan still counts by its due date.
- **G5P4-R6 (row actions):** `MaintenancePlanRowActions` (client) replaces `MaintenancePlanStateActions`.
  - It renders `RowActions` with:
    - the next step "บันทึกว่าทำแล้ว" (create, active, no open record) as a link to `/{locale}/maintenance/new?planId=<id>&returnTo=<this page>`;
    - ⋯ with แก้ไข (link, edit), พักแผน or เปิดใช้งานต่อ (action, edit), a separator, and จบแผน (destructive action, edit, with the hint "ถาวร · มีให้ยืนยัน").
  - The confirm dialog sits outside the menu, opened through a ref with `hideTrigger`, as in `src/components/disposal/disposal-row-actions.tsx`. Focus returns to ⋯.
  - The ended tab gets no actions.
- **G5P4-R7 (title link and row click, decision 10.2):** on the active and paused tabs, with edit, the title links to `/{locale}/maintenance/pm/<id>/edit?returnTo=<this page>` and the row opens the same page (`ClickableTableRow`). Otherwise the title is plain text and the row does not open.
- **G5P4-R8 (the shared changed-field part, call 22):**
  - `AssetFormChangedField` moves to `src/components/ui/form-changed-field.tsx` as `FormChangedField({ change, children })`.
  - Its words "แก้แล้ว", "เดิม: {value}" and "คืนค่าเดิม" move to `common.fieldChanged`, `common.fieldWas` and `common.restoreField`, with the same values.
  - The asset-only "ปรับตามผู้ถือครอง" comes in as `change.automaticLabel`.
  - `asset-form-changed-field.tsx` becomes a re-export, or its readers switch. The asset keys that no reader keeps go.
- **G5P4-R9 (the form's asset card):**
  - The card is `PmPlanAssetCard` with the photo, the name, the tag, the status badge, "<room> · <branch>" and, on edit, "แก้ไขไม่ได้" with a lock icon.
  - It reads `RepairAssetFacts`: the page uses `loadRepairAssetFacts`, and on create the form reads the facts of the picked asset through `GET /api/maintenance-options?type=pmAsset&id=<id>`, which now also attaches `facts`.
  - On create, the picker shows until an asset is picked. "เปลี่ยน" brings it back, as in plan 2.
- **G5P4-R10 (impact on the PM page, §10 summary):**
  - The page passes the three active counts (overdue, soon, later) from `readPmDueCounts(db, now)`. They are not search-filtered here.
  - `buildPmPlanImpact` moves this plan from its old bucket to its new one and says whether it falls in the 7-day reminder (`nextDueDate ≤ today + 7`).
  - A paused plan shows "แผนพักอยู่ ไม่นับในหน้าแผน PM" in place of the counts.

## Review Focus

1. **A search that matches two plans, one overdue.** The cells read 1, 1 and 0 for that search. The overdue cell opens a list of 1 that keeps the search (Task 1, Task 5).
2. **A plan whose asset has an open repair record.** It still counts as overdue. Its row shows the record link and no "บันทึกว่าทำแล้ว" (Task 1, Task 5).
3. **The edit form left open while someone records the PM done.** The save is refused with the reload message (`MAINTENANCE_PLAN_CONFLICT`) and the form keeps its values (Task 4, Task 5).
4. **A plan due on 31 Jan, monthly.** The preview reads 31 Jan, 28 Feb (or 29 in a leap year), 28 Mar and 28 Apr, the clamp the server applies, chained from each previous date (Task 2).
5. **An asset with an active plan that was retired by status correction.** It stays in the active tab with its status badge, outside the cells, and the filter line names it (Task 1).

---

### Task 1: The PM list rules and reads

**Files:**
- Create:
  - `src/lib/pm-plan-list.ts`, pure and client-safe;
  - `src/lib/pm-plan-page-data.ts`, the server reader with the db injected and no `./db` import.
- Modify:
  - `src/lib/pm-due-counts.ts`: `readPmDueCounts(db, now, where?)`;
  - `src/lib/preventive-maintenance.ts`: remove `planStatePageSlices` and its types (G5P4-R4).
- Test:
  - new `tests/pm-plan-list.test.ts`;
  - new `tests/pm-plan-page-data.test.ts`;
  - `tests/pm-due-counts.test.ts`;
  - `tests/preventive-maintenance.test.ts`, removing the slices tests.

**Interfaces:**
- Produces in `pm-plan-list.ts`:
  - `type PmPlanTab = "active" | "paused" | "ended"`
  - `type PmDueFilter = "overdue" | "soon" | "later" | "week"`
  - `parsePmPlanQuery(params: URLSearchParams | Record<string, string | string[] | undefined>): { tab: PmPlanTab; q: string; due: PmDueFilter | null; page: number; pageSize: number }` (q trimmed, 100 characters at most; `due` only on the active tab).
  - `buildPmPlanSearchWhere(q: string): Prisma.MaintenancePlanWhereInput`: an OR over `title`, `planNo`, `asset.name` and `asset.assetTag` with `contains`, or `{}` for an empty q.
  - `buildPmPlanListWhere(query, now): Prisma.MaintenancePlanWhereInput`, made of:
    - the tab: active is `planState: "active"`, paused is `"paused"`, ended is `"ended"`;
    - the search;
    - on active with `due`, `buildPmDueBucketWhere(due, now)`.
  - `pmPlanListOrder(tab)` (G5P4-R4).
  - `buildPmPlanHref(locale, query, change: Partial<query>): string`. A cell's or tab's href keeps `q` and the page size and drops `page`. Changing the tab drops `due`.
  - `type PmPlanRowView = { id; planNo; title; assetId; assetName; assetTag; frequency; intervalDays; nextDueDate: Date; planState: PmPlanTab; updatedAt: Date; vendor: { code; name } | null; due: { kind: "badge"; badge: PmDueBadge } | { kind: "assetStatus"; statusName: string; statusLabel: string } | { kind: "dateOnly" } | { kind: "endedAt"; at: Date }; openRecord: { id; repairNo } | null }`
  - `toPmPlanRowView(plan, openRecordByAsset: Map<string, { id; repairNo }>, now): PmPlanRowView`:
    - active in scope gives a badge;
    - active with a written-off or inactive asset gives `assetStatus`;
    - paused gives `dateOnly`;
    - ended gives `endedAt` = `updatedAt`.
- Produces in `pm-plan-page-data.ts`: `readPmPlanPage(db, query, now): Promise<{ rows: PmPlanRowView[]; total: number; tabCounts: Record<PmPlanTab, number>; due: PmDueCounts | null; allPlansCount: number }>`. `due` is filled only on the active tab and follows the search (G5P4-R1).

- [ ] **Step 1: Write the failing tests.**
  - `parsePmPlanQuery`:
    - `{}` gives `{ tab: "active", q: "", due: null, page: 1, pageSize: 25 }`;
    - `{ state: "ended", due: "overdue" }` gives `due: null`;
    - `{ due: "bogus" }` gives `due: null`.
  - `buildPmPlanListWhere`: active + `due: "overdue"` + `q: "UPS"` ANDs the tab, the search OR and the overdue bucket (`nextDueDate.lt` = the Bangkok start of today).
  - `buildPmPlanHref`:
    - from `{ q: "UPS", due: "overdue" }`, the overdue cell (in use) gives `?q=UPS`;
    - changing the tab to paused drops `due`.
  - `toPmPlanRowView` (Review Focus 5):
    - an active plan of a Retired asset gives `assetStatus`;
    - an ended plan gives `endedAt` = `updatedAt`;
    - a plan whose asset has an open record gives `openRecord` set while its `due` stays the badge (Review Focus 2).
  - `readPmPlanPage` with a fake db (Review Focus 1):
    - the `groupBy` where and every `aggregate` where carry the search;
    - the open records read uses `assetId: { in: [...] }`;
    - the ended tab orders by `updatedAt desc`.
  - `readPmDueCounts(db, now, { title: { contains: "UPS" } })` ANDs the where into each bucket.
- [ ] **Step 2: Run** `npx tsx --test tests/pm-plan-list.test.ts tests/pm-plan-page-data.test.ts tests/pm-due-counts.test.ts tests/preventive-maintenance.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and eslint. The PM page may stop compiling where it used `planStatePageSlices`. If so, switch the page to `readPmPlanPage` with today's markup in this task; Task 3 rebuilds it.
- [ ] **Step 5: Commit** `feat(pm): the PM list's query, wheres, row view and one page read, with counts that follow the search (group 5 plan 4)`

### Task 2: The shared changed-field part and the PM form's rules

**Files:**
- Create:
  - `src/components/ui/form-changed-field.tsx` (G5P4-R8);
  - `src/lib/pm-plan-form-rules.ts`, pure and client-safe.
- Modify:
  - `src/components/assets/asset-form-changed-field.tsx` and its readers;
  - messages through `<scratchpad>/g5/msg/p4-changed.json` (the three `common.*` keys; the asset keys that lose their readers go).
- Test:
  - new `tests/pm-plan-form-rules.test.ts`;
  - `tests/asset-form-*` pins of the changed field;
  - `tests/form-changed-field-ui.test.ts`, new or folded into an existing UI test.

**Interfaces:**
- Produces:
  - `FormChangedField({ change: { was: string; automaticLabel?: string; onRestore?: () => void } | null; children })`.
  - `type PmPlanFormValues = { assetId: string; title: string; frequency: MaintenancePlanFrequency; intervalDays: string; nextDueDate: string; vendorId: string; notes: string }`.
  - `validatePmPlanForm(values, isEdit: boolean)`. It keeps today's checks (`maintenance-plan-form.tsx` `validate`): title required and at most 200 characters, `intervalDays` 1–3,650 when custom, the date required, the asset required on create.
  - `pmPlanChangedFields(initial, values): Array<"title" | "frequency" | "intervalDays" | "nextDueDate" | "vendorId" | "notes">`.
  - `buildPmPreview(nextDueDate: string, frequency, intervalDays: number | null, now: Date): Array<{ date: string; step: "first" | "month1" | "month3" | "year1" | "days"; days?: number; badge?: PmDueBadge }>`. It gives four ISO days, each from `calculateNextMaintenanceDueDate` of the one before. The first carries `getPmDueBadge`.
  - `buildPmPlanImpact(input: { counts: { overdue: number; soon: number; later: number }; before: { nextDueDate: string; planState: PmPlanTab; inScope: boolean } | null; after: { nextDueDate: string }; now: Date }): { kind: "paused" } | { kind: "counts"; overdue: [number, number]; soon: [number, number]; later: [number, number]; total: number; inWeek: boolean }` (G5P4-R10).
  - `pmPlanFooterKey(isEdit)`.

- [ ] **Step 1: Write the failing tests.**
  - `buildPmPreview("2026-01-31", "monthly", null, now)` gives `["2026-01-31", "2026-02-28", "2026-03-28", "2026-04-28"]`, with steps first, month1, month1, month1 (Review Focus 4).
  - Quarterly gives month3 steps. Yearly gives year1. Custom with 45 gives `days` of 45.
  - `buildPmPlanImpact`, with `counts { 6, 1, 1 }`:
    - an overdue plan moved to a date 5 days ahead gives overdue [6, 5], soon [1, 2], later [1, 1] and `inWeek` true;
    - create (before null) of a date 20 days ahead gives later [1, 2];
    - a paused before gives `{ kind: "paused" }`.
  - `pmPlanChangedFields` counts only the fields that differ.
  - `validatePmPlanForm` with custom days of 0 returns the range error.
- [ ] **Step 2: Run** `npx tsx --test tests/pm-plan-form-rules.test.ts` and the asset changed-field pins. Expected: FAIL.
- [ ] **Step 3: Implement.** The asset form keeps its look and behaviour.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and eslint.
- [ ] **Step 5: Commit** `feat(pm): a shared changed-field part and the PM form's rules: the four-round preview and the impact on the PM page (group 5 plan 4)`

### Task 3: The PM page

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/pm/page.tsx`. It holds the spec §9 parts:
  - **Header:** the trail ซ่อมบำรุง › แผนบำรุงรักษาตามรอบ (PM), back, the subtitle with "· ทั้งหมด {count} แผน", and "เพิ่มแผน PM" (create).
  - **Tabs:** `TabNav` with the counts.
  - **Search:** `SearchField` (a GET form) "ค้นหาชื่อแผน ชื่อหรือรหัสทรัพย์สิน".
  - **Due cells:** a `StatStrip` on the active tab only (G5P4-R2), with:
    - feet "นานสุด {days} วัน" (from the earliest overdue date), "ภายใน 14 วัน · ครบ {date}" and "ไกลกว่า 14 วัน";
    - `attention` on overdue > 0;
    - `filterNote` "{overdue} + {soon} + {later} = {total} แผนที่ใช้งาน", with the out-of-scope tail.
  - **The `?due=week` chip:** a `FilterChipList` chip "ครบกำหนดใน 7 วัน".
  - **The table:** a `DataTable` with columns แผน · ทรัพย์สิน · ความถี่ · กำหนด PM ครั้งถัดไป · ผู้ให้บริการภายนอก · actions, plus phone cards.
  - **Foot:** "แสดง a–b จาก N · เรียงจากกำหนดที่ถึงก่อน" or "· เรียงจากที่จบแผนล่าสุด", and the "–" note. Paging 25/50/100, with the past-the-end redirect.
  - **Empty states:** no plans, an empty tab, no match.
- Create: `src/components/maintenance/maintenance-plan-row-actions.tsx` (G5P4-R6).
- Remove: `src/components/maintenance/maintenance-plan-state-actions.tsx`. Its dialog moves into the row actions.
- Messages through `<scratchpad>/g5/msg/p4-page.json`: the §13 PM page words, every value verbatim. The PM page now uses the `maintenancePage.pmDue.*` badge words (plan 1). Keys no reader keeps go (`pmDueState.*` if unused, `pmNoExternalProvider`, …).
- `DESIGN.md`: the list rule's sentence about the PM list's per-state windows (G5P4-R4).
- Test: `tests/pm-plans-ui.test.ts` (rewritten pins), `tests/maintenance-pagination-ui.test.ts`, `tests/v-track2-m.test.ts` and any pin of the inline state buttons.

**Interfaces:**
- Consumes:
  - Task 1 (`parsePmPlanQuery`, `readPmPlanPage`, `buildPmPlanHref`, `PmPlanRowView`);
  - plan 1 (`getPmDueBadge` words `maintenancePage.pmDue.*`);
  - `appendOperationalReturnTo`.
- Produces: `MaintenancePlanRowActions({ plan: { id; planNo; title; planState }, locale, returnTo, canCreate, canEdit, openRecord })`.

- [ ] **Step 1: Write the failing pins.**
  - The page uses `readPmPlanPage(` and renders `TabNav`, `SearchField`, `StatStrip` (active tab only), `DataTable` and `data-pm-plan-row`.
  - No `planStatePageSlices`.
  - The row actions use `RowActions` with `hideTrigger` dialogs outside the menu.
  - "บันทึกว่าทำแล้ว" carries `returnTo`.
  - The open record renders "มีบันทึกซ่อมที่ยังไม่เสร็จ" with a link to `/maintenance/`.
  - Ended rows render "จบแผนเมื่อ".
  - The th values match §13 (sample: `pmDueCellOverdueFoot` "นานสุด {days} วัน" — choose clear key names and list them in the report).
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, eslint and `npx playwright test --list e2e/repair`.
- [ ] **Step 5: Commit** `feat(pm): the PM page with tabs, search, due cells, a table with day counts, ⋯ actions and the open-record link (group 5 plan 4)`

### Task 4: The PM form

**Files:**
- Modify:
  - `src/components/maintenance/maintenance-plan-form.tsx`, rewritten on `OperationFormFrame` with `breadcrumbs` and `back`:
    - **Section 1 "ทรัพย์สินของแผน":** edit shows the locked `PmPlanAssetCard` and the hint "ถ้าจะใช้แผนนี้กับทรัพย์สินอื่น ให้จบแผนนี้แล้วเพิ่มแผนใหม่". Create shows the `pmAsset` picker, then the card (G5P4-R9).
    - **Section 2 "รายละเอียดแผน":** title, vendor and notes.
    - **Section 3 "รอบและกำหนด":** a `Segmented` frequency, custom days with the hint, the next due date, the preview (`buildPmPreview`) and the note.
    - **Changed fields:** `FormChangedField` on edit.
    - **The summary:** `OperationSummaryCard`. On edit, "สรุปก่อนบันทึก · แก้ {count} ช่อง" with ก่อนแก้ → หลังแก้ rows. On create, rows for asset, frequency and next due. Then the impact block (`buildPmPlanImpact`).
    - **The footer:**
      - edit: "แก้ไขแผน {title} {planNo} · แก้ {count} ช่อง", "ยกเลิกการแก้ไข" and "บันทึกการแก้ไข";
      - create: "เพิ่มแผน PM {title} · {asset}", "ยกเลิก" and "บันทึก".
    - **The save:** today's POST or PATCH (with `expectedUpdatedAt`), the toasts and `returnHref`. A 409 `MAINTENANCE_PLAN_CONFLICT` shows its message and keeps the values (Review Focus 3).
  - `src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx` and `…/pm/[id]/edit/page.tsx`. They pass:
    - the facts (`loadRepairAssetFacts`);
    - the edit header's meta, as spec §10 sets it: planNo, the state badge, "{frequency} · เดิมกำหนด {date}" and the ⋯ note;
    - the three counts (`readPmDueCounts(prisma, now)`);
    - `todayKey`.
  - `src/lib/maintenance-options.ts`: the `pmAsset` by-id read also attaches `facts`.
- Create: `src/components/maintenance/pm-plan-asset-card.tsx`.
- Messages through `<scratchpad>/g5/msg/p4-form.json`: the §13 PM form words, verbatim.
- `tests/form-migration-guards.test.ts`: add the two `STICKY_FOOTER_ROUTES` routes.
- Test: `tests/pm-plans-ui.test.ts` (form pins), `tests/maintenance-options.test.ts` (pmAsset facts) and `tests/v-track2-m.test.ts`.

**Interfaces:**
- Consumes: Task 2 (all of it), Task 1's `PmPlanTab`, plan 1's `readPmDueCounts`, plan 2's facts.
- Produces: `PmPlanAssetCard({ facts, locked: boolean, onChange?: () => void })`.

- [ ] **Step 1: Write the failing pins.**
  - The form renders `OperationFormFrame` with three `FormSection`s, a `Segmented` frequency with id `maintenance-plan-frequency`, the preview from `buildPmPreview(`, `FormChangedField` on edit and the summary with `buildPmPlanImpact(`.
  - Its footer submit reads "บันทึกการแก้ไข" on edit.
  - A 409 keeps the values: no reset in the catch path.
  - The routes guard lists both routes.
  - `pmAsset` with `id` returns `facts`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, eslint and `npx playwright test --list e2e/repair`.
- [ ] **Step 5: Commit** `feat(pm): the PM form on the operation frame with the locked asset card, a segmented frequency, the four-round preview and the impact on the PM page (group 5 plan 4)`

### Task 5: E2E

**Files:**
- Modify:
  - `e2e/repair/pm-plan.spec.ts`. It now:
    - finds its plan on the PM page by search (`?q=<planNo>`, then the overdue cell), not by `#pm-due li`;
    - reads "เกินกำหนด N วัน";
    - records the plan done from the row and sees the date advance from the record date, keeping the 31 Jan → 28 Feb clamp;
    - drives the `Segmented` frequency on create;
    - pauses, resumes and ends the plan through ⋯, then finds it in the ended tab with "จบแผนเมื่อ".
  - `e2e/repair/repair-data.ts`: `visitPlanRow` and `planAction` move to ⋯ and to the search.
  - `e2e/cross-cutting/support/refusals.ts`: the viewer check asserts no ⋯ and no "เพิ่มแผน PM" on the PM page (`:124-127`).
  - `e2e/repair/repair-record.spec.ts`: in plan 2's PM-not-done test, the PM page row now shows "มีบันทึกซ่อมที่ยังไม่เสร็จ <repairNo>" while the record is open (Review Focus 2).
- Create, in `e2e/repair/pm-plan.spec.ts`:
  - **"the PM page's tabs, search and cells"** (IT staff): a run-marked plan of an asset under repair can be created (decision 10.4). The search by its planNo gives one row. The cell counts equal the rows they open (Review Focus 1).
  - **"a stale PM edit is refused"**: open the edit page in two pages of one context. Save a change in the first. Save in the second and see "แผนนี้ถูกแก้ไขหรือบันทึกว่าทำแล้วระหว่างที่เปิดหน้านี้…" (Review Focus 3). The summary reads "แก้ 1 ช่อง" before the save. End the plan.
  - **"ตั้งรอบ PM from the asset tab comes back to the tab"** (decision 8).
- Pins: `tests/e2e-repair.test.ts`, `tests/e2e-cross-cutting.test.ts`.

- [ ] **Step 1: Write the failing pins.** **Step 2: Run** them. **Step 3: Implement.** **Step 4: Run** the pins, `npx playwright test --list e2e/repair e2e/cross-cutting`, `npm test`, `npx tsc --noEmit` and eslint. **Step 5: Commit** `test(e2e): the PM page's tabs, search and cells, its ⋯ actions, the stale edit refusal and the asset tab's way back (group 5 plan 4)`

### Task 6: Docs, the targeted E2E and the look step (controller)

**Docs:**
- `docs/06_WORKFLOWS.md`, `docs/17_REPAIR_RECORD_GUIDE_TH.md` (PM), `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `DESIGN.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md` (the shared changed-field part), `docs/99_CHANGELOG.md` and `DEVELOPER_HANDOFF.md`.
- The wiki: status, open questions and log, then lint.

**E2E on the dev DB** (VPN probe, keep-awake), 4 projects: `e2e/repair`, `e2e/cross-cutting/roles.spec.ts` (or the spec that runs `refusals.ts`), `e2e/assets` (the asset form's changed field), `e2e/asset-detail` and `e2e/smoke`.

**Look step:** the PM page and the form at 1440, 1024 and 390, both themes:
- the active tab with cells;
- the overdue filter;
- the week chip;
- the paused and ended tabs;
- a row with an open record;
- the ⋯ menu and the end confirm;
- the viewer;
- the form, create and edit, with changed fields and the impact block.

**Dry run:** none. There is no migration and no Production data; the pages and their specs run on the dev DB.
