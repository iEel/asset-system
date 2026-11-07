# Page group 10, plan 2: reports operations, catalog and phone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The operations tab as a data-fix queue (board `RP-Ops`), the catalog by who uses it with scope and last export
(board `RP-Library`), their phone layouts (`RP-Phone`), the chips-only filter line on both tabs, and E2E updates.

**Architecture:** The operations queries move from `reports/page.tsx` into `src/lib/reports-operations-data.ts`; the
catalog's report list becomes data in `src/lib/report-catalog.ts`; views stay in `src/components/reports/`. No migration.

**Tech Stack:** Next.js 16, Prisma 7, next-intl, Tailwind, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-07-page-group-10-reports-design.md` §3, §5, §6, §7, §8. Boards:
`C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g11-boards\project\RP-Ops.dc.html`,
`RP-Library.dc.html`, `RP-Phone.dc.html`. Plan 1: `docs/superpowers/plans/2026-11-07-group10-reports-overview.md`.

## Global Constraints

- Keep every current feature (spec §8): the operations tab's cross-scope counts, preview and export, idle count, top-5
  lists, the data-quality rules link; the catalog's every report and export with its permission, the 4 "run now" cards
  (now cards with a cadence), saved presets (localStorage), the "สิทธิ์รายงานของคุณ" list; empty states; timing labels.
- The operations counts keep today's scope rule (they ignore the `dataQuality` and `activity` filters).
- Thai first; glossary; messages via `node scripts/messages-edit.mjs` (th + en, ICU plurals); names first, codes under.
- Tokens only; both themes; 44px targets below `md`; no horizontal page scroll at 390. Source pins CRLF-safe.
- E2E only by the controller; the E2E files edited by tasks keep their safety rules (dev DB, run data, no DELETE).

## Review Focus

1. `issue=serial` with 0 matching assets: the cell shows 0, the table its empty state, no export button — Task 1 test
   `an empty issue shows no export`.
2. `qpage=99` past the last page: clamps to the last page; `qpage=junk` → 1 — Task 1 test `qpage clamps`.
3. A report never exported: "ยังไม่เคยส่งออก", not a blank — Task 2 test `a card without a log says never exported`.
4. A user without `report:export` / `maintenance:export`: the card shows "ไม่มีสิทธิ์ส่งออก" with the permission in
   words, never a dead button — Task 2 test `cards without permission name what is missing`.
5. Phone at 390 with long Thai report names: cards wrap, buttons full width, no sideways scroll — Task 3 pins
   `catalog cards stack below md`.

---

### Task 1: The operations queue (`RP-Ops`)

**Files:** Create `src/lib/reports-operations-data.ts`, `tests/reports-operations-data.test.ts`,
`tests/reports-operations-board.test.ts`. Modify `src/app/[locale]/(dashboard)/reports/page.tsx` (operations queries
~400–610 and `getDataQualityIssues` ~807 move out), `src/components/reports/reports-operations-view.tsx`, messages, the
old operations pins (grep `tests/` for `reports-operations-view`, `take: 8`, `getDataQualityIssues`).

**Interfaces — Produces:**
- `REPORT_ISSUE_KINDS = ["responsibility", "serial", "photo", "warranty"] as const`; `type ReportIssueKind`.
- `parseOperationsParams(input: { issue?; qpage?; others? }): { issue: ReportIssueKind | "all"; qpage: number; others: boolean }` (junk → all / 1 / false).
- `getReportsOperationsData(where /* the operations scope where, as today */, input: { locale; issue; qpage; others; baseQuery: URLSearchParams; canEdit… }, db?): Promise<{ queue: { distinct: number; incompleteDistinct: number; warrantyOnly: number; counts: Record<ReportIssueKind, number>; issueTotal: number /* responsibility+serial+photo */; rows: OperationsQueueRow[]; total: number; page: number; pageCount: number }; crossScope: …today's…; idle: …; tops: …today's three top-5 lists… }>`
  — counts as today's four wheres (warranty = today's `warrantyExpiringSoonWhere`), distinct = `count` with `OR` of the
  four; rows: the chosen issue's assets (or the OR for all), `orderBy updatedAt desc`, 8 per page, `skip (qpage-1)*8`;
  `qpage` clamped to `1..pageCount`.
- `type OperationsQueueRow = { id; name; assetTag; categoryName; branchName; issues: ReportIssueKind[] /* only the chosen one unless others */; fix: { href: string; fieldKey: string } }` — fix = the first issue's place (today's links: `/assets/{id}/edit`, the photos section, the purchase section) and `fieldKey` its field name for "หน้าแก้ไข · {field}".

**Layout (board):** the chips line ("ทุกตัวเลขในแท็บนี้นับตามตัวกรองนี้ · ทรัพย์สิน n รายการ", ล้างตัวกรอง, "แก้ตัวกรองที่แท็บภาพรวม")
instead of the filter bar (spec §3); **คิวแก้ข้อมูลทะเบียน** with "เปิดกฎคุณภาพข้อมูล" (`/admin/data-quality`); a StatStrip of
five cells — ทั้งหมดในคิว (distinct, ชิ้น) and the four issues (each with its sub-line: ผู้ถือครอง/แผนก/ที่ตั้ง · Serial ว่าง ·
ยกเว้น License · ภายใน {days} วัน) — each a link setting `issue=` (current one `aria-current`); the equation line; the queue
header "{issue label} {n} ชิ้น", the toggle link "แสดงปัญหาอื่นของชิ้นเดียวกันด้วย" (`others=1`), "เปิดในทะเบียนทรัพย์สิน"
(register with `dataQuality=<issue>` and the filters), "ส่งออก {n} รายการ Excel" (`/api/assets/export?…&dataQuality=<issue>`,
`asset:view`; only when one issue is chosen and n > 0; under ทั้งหมดในคิว: "เลือกประเภทปัญหาเพื่อส่งออก"); the table
ทรัพย์สิน (name, tag) / ปัญหา (badges) / หมวดหมู่ · สาขา / แก้ ("แก้ไขข้อมูล" + "หน้าแก้ไข · {field}"); "แสดง a–b จาก n" with
ก่อนหน้า / ถัดไป (`qpage=`). Then **ทรัพย์สินต่างบริษัท/ต่างสาขา** (count 152-style big number, the three sub-counts, the equation
"1 ชิ้นเข้าได้หลายข้อ: … ข้อ ใน n ชิ้น", ส่งออกต่างขอบเขต Excel, the 8-row preview kept), **ไม่มีความเคลื่อนไหวล่าสุด**
(idle count, เปิดในทะเบียน), **รายงานการปฏิบัติงาน** (the three top-5 lists, names first). Phone: cells 2 per row, the table
as cards with the fix button full width, paging buttons 44px.

- [ ] Step 1: tests — `counts per issue and distinct`, `qpage clamps`, `issue filters rows; others shows all issues`,
  `an empty issue shows no export`, `fix link and field per first issue`; board pins for the chips line, cells as
  `issue=` links, export only with one issue, paging links, the kept blocks.
- [ ] Step 2–4: FAIL → implement → `npm test`, `npx tsc --noEmit -p .`, `npx eslint` PASS.
- [ ] Step 5: commit `feat(reports): operations tab to board RP-Ops: the data-fix queue with issue cells as filters, paging, per-issue export, chips line; cross-scope, idle and top lists kept (group 10 plan 2 task 1)`.

### Task 2: The catalog (`RP-Library`)

**Files:** Create `src/lib/report-catalog.ts`, `tests/report-catalog.test.ts`, `tests/reports-catalog-board.test.ts`.
Modify `reports/page.tsx` (catalog ~613–733 moves into the lib), `src/components/reports/reports-catalog-view.tsx`,
messages, old catalog pins (grep `tests/` and `e2e/cross-cutting/support/export-rights.ts` helpers for the catalog).

**Interfaces — Produces:**
- `type CatalogAudience = "accounting" | "maintenance" | "approver" | "auditor" | "admin"`.
- `type CatalogReport = { key: string; audience: CatalogAudience; titleKey; descriptionKey; descriptionValues?; scope: "filters" | "filtersNoStatus" | "system"; cadenceKey?: "monthly" | "weekly"; formats: ("excel" | "pdf")[]; exportKey: ReportExportKey | null; openHref: string | null; exports: { label; href; permission: { module; action }; format }[]; note? }`.
- `buildReportCatalog(input: { locale; filterQuery; crossScopeQuery; counts: { crossScope: number; findingsByStatus: { pending; approved; rejected } } }): CatalogReport[]` — the board's 11 reports in its order and groups (spec §6), every
  export of today kept with today's routes and permissions (incl. the 4 recurring cards → the reports with a cadence);
  per-round audit results as a note card with "ไปที่รอบตรวจนับ" (`/audit/rounds`); system logs screen-only; data quality →
  `/admin/data-quality`.
- The page reads `readLastReportExports()` (plan 1) and the counts, and passes `canExport(permission)`.

**Layout (board):** the chips line + "มีผลเฉพาะรายงานที่ติดป้าย ใช้ตัวกรองปัจจุบัน · {k} จาก {n} รายงาน · แก้ตัวกรองที่แท็บภาพรวม";
one section per audience (title, "สำหรับ …", "{n} รายงาน"); each card: title, description, scope badge (ใช้ตัวกรองปัจจุบัน ·
{chips text} / … · ไม่รวมตัวกรองสถานะ / ทั้งระบบ · ไม่ใช้ตัวกรอง), cadence badge, format badges, "ส่งออกล่าสุด {date time}" or
"ยังไม่เคยส่งออก", เปิดหน้าจอ, the export buttons; without permission "ไม่มีสิทธิ์ส่งออก" + "ต้องมีสิทธิ์{action}ของ{module}" in
words (reuse the role-page module/action words). After the sections: saved presets and "สิทธิ์รายงานของคุณ" (kept).

- [ ] Step 1: tests — `the catalog lists eleven reports in five audiences`, `every export of today is present with its
  permission` (list them), `scope per report`, `a card without a log says never exported`, `cards without permission
  name what is missing`; board pins.
- [ ] Step 2–4: FAIL → implement → PASS.
- [ ] Step 5: commit `feat(reports): catalog to board RP-Library: reports by who uses them, scope, cadence and format badges, last export, permission words; presets and the permission list kept (group 10 plan 2 task 2)`.

### Task 3: Phone (operations and catalog) and E2E

**Files:** the Task 1–2 views (below `md`), `tests/reports-operations-board.test.ts`, `tests/reports-catalog-board.test.ts`,
`e2e/cross-cutting/reports.spec.ts` and `e2e/cross-cutting/support/*` (catalog helpers, labels), their word pins.

- Phone: operations cells 2 per row, queue rows as cards (name, tag, issue badges, category · branch, the fix button
  full width), paging 44px; catalog cards stack (badges wrap, buttons full width), sections keep their headers.
- E2E: update the reports spec for the operations queue (the run's 3 assets have no serial: `issue=serial` shows them,
  the export link carries `dataQuality=serial`, paging text) and the catalog (cards by audience, an export downloads
  and then shows "ส่งออกล่าสุด" with today's date, permission words for the viewer) — keep every existing assertion's
  intent (downloads open with the right sheets, viewer refused overview export).
- [ ] Step 1: pins `catalog cards stack below md`, `queue cards below md`; the E2E edits.
- [ ] Step 2: `npm test`, `npx tsc --noEmit -p .`, `npx eslint` PASS (Playwright by the controller).
- [ ] Step 3: commit `feat(reports): operations and catalog on the phone (board RP-Phone) and E2E for the queue and the catalog (group 10 plan 2 task 3)`.

### Task 4 (controller)

- [ ] Build; E2E `e2e/cross-cutting/reports.spec.ts`; look step at 1440 (light, dark), 1024, 390 (light, dark) for
  `view=operations` (all, `issue=serial`, page 2) and `view=catalog`; whole-branch review Workflow 3×2 with one fix
  pass; docs, wiki, memory.

## Plan rulings

- **G10P2-R1** The 4 recurring "run now" cards become the catalog cards with a cadence badge (same routes and
  permissions); nothing is dropped.
- **G10P2-R2** The operations tab shows the chips line, not the filter bar (spec §3), with "แก้ตัวกรองที่แท็บภาพรวม"
  linking `view=overview` with the same filters.
- **G10P2-R3** "ส่งออกล่าสุด" shows date and time only (no user name), as the board.
