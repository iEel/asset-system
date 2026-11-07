# Page group 10, plan 1: reports overview and shared parts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The reports page's shared parts (header export captions, the collapsible filter bar) and the overview tab
rebuilt to board `RP-Overview`, plus export logging for "ส่งออกล่าสุด".

**Architecture:** Pure rules for group tables in `src/lib/report-breakdown.ts`; the page's overview queries move into
`src/lib/reports-overview-data.ts`; export routes log through one helper `logReportExport`. No migration.

**Tech Stack:** Next.js 16, Prisma 7 on SQL Server, next-intl, Tailwind, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-07-page-group-10-reports-design.md` §3, §4, §6.1, §8. Board:
`C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g11-boards\project\RP-Overview.dc.html`.

## Global Constraints

- Keep every current feature (spec §8): filters incl. URL-only ones and hidden inputs, chips, presets, permission list,
  every export route/permission/file, empty states, the accounting tab, timing labels `reports.*`.
- Thai first; glossary; messages via `node scripts/messages-edit.mjs` (th + en, ICU plurals; `{x, number}` in Thai).
- Names first, codes under them (mono meta). Tokens only; both themes; 44px targets below `md`.
- Source pins CRLF-safe. No Playwright inside tasks.

## Review Focus

1. A filter that matches nothing: every table shows its empty state, the strip shows 0 = 0 + 0 + 0, the export caption
   says 0 รายการ — Task 2 test `an empty filter shows zeros everywhere`.
2. Exactly 8 groups: no "อื่น ๆ" row; 9 groups: "อื่น ๆ อีก 1" — Task 1 test `others appears only past eight`.
3. Assets with no department and departments past 8: the equation "8 แผนกแรก x + อื่น ๆ y + ยังไม่ระบุ z" adds up to the
   total — Task 1 test `department rows add up to the total`.
4. An export whose log write fails still returns the file — Task 3 test `a failed log never blocks the file`.
5. `breakdown=department&bq=บัญชี` lists only matching departments, links keep the filters — Task 2 test
   `the full list filters by bq`.

---

### Task 1: Group-table rules

**Files:** Create `src/lib/report-breakdown.ts`, `tests/report-breakdown.test.ts`.

**Interfaces — Produces:**
- `type BreakdownDimension = "status" | "category" | "company" | "branch" | "department" | "ownership"`.
- `type BreakdownGroup = { key: string | null; name: string; code: string | null; count: number }` (`key` null = unassigned).
- `type BreakdownTable = { dimension; total: number; groupCount: number /* named groups */; rows: { key: string; name: string; code: string | null; count: number; percent: number }[]; others: { groups: number; count: number; percent: number; names: string[] /* only when groups ≤ 3 */ } | null; unassigned: { count: number; percent: number } | null }`.
- `buildBreakdownTable(dimension, groups: BreakdownGroup[], total: number, limit = 8): BreakdownTable` — sort count desc,
  ties by name (Thai collation `localeCompare(…, "th")`); first `limit` named groups; the rest summed in `others`; the
  null-key group as `unassigned`; percent = count / total × 100 rounded to 1 decimal (0 when total is 0).
- `breakdownRowHref(locale, dimension, key, baseQuery: URLSearchParams): string` — the register `/assets?…` with the base
  filters plus `statusId|categoryId|companyId|branchId|departmentId|ownershipType=key`; for department unassigned:
  `dataQuality=department` (the register's existing "no department" filter).
- `filterBreakdownGroups(groups, query: string): BreakdownGroup[]` (name or code contains, case-insensitive).
- [ ] Step 1: tests `others appears only past eight`, `department rows add up to the total` (8 shown + others + unassigned
  = total), `ties sort by Thai name`, `percent rounds to one decimal and 0 for an empty total`, `row hrefs per
  dimension keep base filters`, `unassigned department links dataQuality=department`, `filterBreakdownGroups matches name or code`.
- [ ] Step 2: run `node --test tests/report-breakdown.test.ts` — FAIL. Step 3: implement. Step 4: PASS.
- [ ] Step 5: commit `feat(reports): group-table rules: sorted, eight rows, others, unassigned, percent and register links (group 10 plan 1 task 1)`.

### Task 2: Overview data and page (board `RP-Overview`), shared header and filter bar

**Files:**
- Create: `src/lib/reports-overview-data.ts` (moves the overview queries from `reports/page.tsx` ~225–317), `tests/reports-overview-data.test.ts`, `tests/reports-overview-board.test.ts`
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`, `src/components/reports/reports-overview-view.tsx`,
  `report-filter-panel.tsx`, messages; the overview workbook route `src/app/api/reports/assets-overview/export/route.ts`
  (By Department gains the "ยังไม่ระบุแผนก" row); tests that pin the old overview (grep `tests/` for
  `reports-overview-view`, `groupBy`, `report-filter-panel`).

**Interfaces — Produces:**
- `getReportsOverviewData(where: Prisma.AssetWhereInput, input: { locale; baseQuery: URLSearchParams; breakdown: BreakdownDimension | null; bq: string; phoneGroup: BreakdownDimension }): Promise<{ strip: { total: number; active: number; activeStatusCount: number; activeExamples: string[]; pendingDisposal: number; writtenOff: number; retired: number; purchaseTotal: number; statusIds: { pendingDisposal: string | null; disposed: string | null; retired: string | null } }; tables: Record<BreakdownDimension, BreakdownTable>; full: { dimension; groups: BreakdownGroup[] } | null; preview: PreviewRow[] }>`
  — six `groupBy`s as today but the department one includes nulls; names/codes looked up as today; status parts by
  status name (`Pending Disposal`; `Disposed` + `Retired`; the rest); `full` only when `breakdown=` is set (all groups,
  filtered by `bq`).
- Page params: `breakdown=` (a dimension), `bq=`, `group=` (phone, default status) parsed with defaults; all kept in
  the tab and chip links only while on overview.

**Layout:**
- Header: today's two exports, each with its permission; under them "ส่งออก {n} รายการ · ตัวกรอง: {chips as text}" /
  "ส่งออก {n} รายการ · ไม่มีตัวกรอง" (`reportsPage.exportCaption*`).
- Filter bar (overview and accounting): `<details>` "ตัวกรองรายงาน" with the board's line; open when no filter is set
  (first visit) or any field filter is set, closed after "ซ่อนตัวกรอง" only for that page view **(ruling G10P1-R1)**;
  ค้นหา, บริษัท, สาขา, สถานะ visible; a nested `<details>` **ตัวกรองเพิ่มเติม** with หมวดหมู่, สภาพ, ประเภทการถือครอง (open when
  one of them is set); submit **ใช้ตัวกรอง**; the line "เพิ่มเติม: … · แก้ค่าแล้วกด \"ใช้ตัวกรอง\" ตัวเลขและไฟล์จึงเปลี่ยน";
  hidden inputs and chips exactly as today.
- Strip (`StatStrip`): ทรัพย์สินทั้งหมด = นอกขั้นตัดจำหน่าย + รอตัดจำหน่าย (ดูรายการ → `statusId`) + ตัดจำหน่ายแล้ว (ดูรายการ →
  Disposed `statusId`; foot "รวมปลดระวาง n" linking Retired when > 0), with "=" and "+" between cells as the board; ราคาซื้อรวม
  with "ผลรวมราคาซื้อของ n รายการ ไม่ใช่มูลค่าตามบัญชี · ดูแท็บบัญชี" (link `view=accounting`).
- Line "แยกกลุ่ม 8 อันดับแรก เรียงจากมากไปน้อย · กดแถวเพื่อเปิดทะเบียนทรัพย์สินที่กรองตามกลุ่มนั้น พร้อมตัวกรองด้านบน", then
  the six tables (grid 1 → 2 at `lg` → 3 at `xl`): title + "{k} {unit}", columns ชื่อ (name, code under) / จำนวน /
  สัดส่วน (% + bar), rows as links (`breakdownRowHref`), อื่น ๆ (plain), ยังไม่ระบุ, the total row (department with its
  equation), "ดูทั้งหมด {n} {unit}" → `breakdown=<dimension>`. Empty: today's empty copy.
- `breakdown=` section (replaces the six tables while set): back link "กลับภาพรวม", search field `bq`, the full list
  with the same columns and links, the total.
- Preview "ตัวอย่างก่อนส่งออก · 10 ล่าสุด จาก n" with 5 columns (spec §4.3) and "ดูทั้งหมดในทะเบียนทรัพย์สิน".
- Phone (below `md`, board `RP-Phone` overview part): strip 2 × 2 with the equation line; an **ส่งออก** card (n, filters,
  the two exports with one-line descriptions); group buttons (`group=`, 44px, scroll-free wrap) and one table; the preview
  as 3 cards; the "ตัวกรอง (n)" button opens the filter `<details>`.
- [ ] Step 1: tests — data: `department groupBy includes unassigned`, `status parts split pending, disposed and retired`,
  `full list only with breakdown`, `the full list filters by bq`, `an empty filter shows zeros everywhere`; workbook: By
  Department has the unassigned row; board pins: header captions, filter bar details and ใช้ตัวกรอง, strip equation and
  links, six tables with row links and ดูทั้งหมด, breakdown section, preview columns, phone group buttons and cards.
- [ ] Step 2: run — FAIL. Step 3: implement (update old pins keeping kept features). Step 4: `npm test`, `npx tsc --noEmit -p .`, `npx eslint` — PASS.
- [ ] Step 5: commit `feat(reports): overview to board RP-Overview: export captions, collapsible filter bar, status strip that adds up, six sorted group tables with eight rows, others, unassigned, register links and a full list, five-column preview, phone layout (group 10 plan 1 task 2)`.

### Task 3: Export logging

**Files:** Create `src/lib/report-export-log.ts`, `tests/report-export-log.test.ts`. Modify the export routes
`src/app/api/reports/assets-overview/export/route.ts`, `src/app/api/assets/export/route.ts`,
`src/app/api/maintenance-tickets/export/route.ts`, `src/app/api/disposal-requests/export/route.ts`,
`src/app/api/audit-findings/export/route.ts`, `src/app/api/audit-findings/export-pdf/route.ts`,
`src/app/api/admin/roles/export/route.ts`.

**Interfaces — Produces:**
- `REPORT_EXPORT_KEYS = ["assets-overview","assets-register","cross-scope","maintenance","disposal","audit-findings","audit-findings-pending","audit-findings-pdf","role-audit"] as const`; `type ReportExportKey`.
- `reportExportKeyFor(route: "assets-overview" | "assets" | "maintenance" | "disposal" | "audit-findings" | "audit-findings-pdf" | "role-audit", params: URLSearchParams): ReportExportKey` (spec §6.1 mapping).
- `logReportExport(userId: string, key: ReportExportKey): Promise<void>` — `logAudit({ userId, module: "report", action: "export", recordId: key })` (the existing helper already swallows errors); called after the file is built, before returning.
- `readLastReportExports(): Promise<Partial<Record<ReportExportKey, Date>>>` — latest `createdAt` per key (`groupBy recordId` with `_max`), module report, action export.
- [ ] Step 1: tests `keys per route and params`, `a failed log never blocks the file` (route pin: the log call is awaited inside try/catch or uses the swallowing helper, and the response does not depend on it), `readLastReportExports takes the latest per key` (fake), source pins that each listed route calls `logReportExport` once.
- [ ] Step 2–4: FAIL → implement → `npm test`, `npx tsc --noEmit -p .` PASS.
- [ ] Step 5: commit `feat(reports): export routes log ส่งออกล่าสุด to the system log per report key, no migration (group 10 plan 1 task 3)`.

### Task 4 (controller)

- [ ] Build; look step at 1440 (light, dark), 1024, 390 (light, dark) of `view=overview`, `breakdown=department`, and the
  accounting tab's filter bar; E2E `e2e/cross-cutting/reports.spec.ts` (update helpers only if a kept feature moved — via
  an implementer); whole-branch review Workflow 3×2 with one fix pass; docs, wiki, memory.

## Plan rulings

- **G10P1-R1** The filter `<details>` is open on a first visit (no filter in the URL) and whenever a field filter is set;
  "ซ่อนตัวกรอง" closes it for that view only (no stored preference).
- **G10P1-R2** "ยังไม่ระบุแผนก" links the register with `dataQuality=department` (the register already filters
  assets with no department), so spec §4.2's "plain row" fallback is not needed.
- **G10P1-R3** The full list (`breakdown=`) is server-rendered with a GET search, not a dialog (spec §4.2).
