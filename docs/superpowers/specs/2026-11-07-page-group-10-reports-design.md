# Page group 10: reports (รายงาน)

Boards: `RP-Overview`, `RP-Ops`, `RP-Library`, `RP-Phone` in the canvas
(https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p). Assumptions: `.impeccable/critique/2026-10-20-canvas-assumptions.md`
§ รายงาน. Recon of the current page: 2026-11-07 (inventory summarised in §9). User decisions 2026-11-07: the reports
are used both ways — Excel to accounting and managers reading the numbers by group — and "เอาตามที่ออกแบบได้เลย"
(follow the boards). Group ข (my assets) is deferred (employees do not use the system yet). Calls marked **(my call)**
are mine. Every feature the current page has is kept (§8).

## 1. Why

The page shows six group tables in database order with no cap (one with 100+ departments), drops assets without a
department so the groups do not add up to the total, puts codes before names, keeps seven filter fields open, exports
without saying what the file will hold, shows only the last 8 data issues, and lists reports by module instead of by
who uses them. The boards fix each of these.

## 2. Goals, non-goals, anti-goals

- **Goals:** every group table sorted, capped at 8 with "อื่น ๆ" and "ยังไม่ระบุ" rows, a total that equals the strip,
  percentage bars and rows that open the register filtered; a collapsible filter bar with chips and an explicit "ใช้ตัวกรอง";
  each export says how many rows and which filters it uses; the operations tab as a real queue (issue-type cells as
  filters, paging, export of the chosen issue); the catalog grouped by who uses it, with scope badges and the last export
  time; a short phone page.
- **Non-goals:** new report types; scheduled sending (the "รายเดือน / รายสัปดาห์" cadence stays a label); changing the
  accounting tab's numbers (no board; it is restyled only where shared parts change); changing export file contents
  except the department fix (§4.4).
- **Anti-goals:** a group table whose rows do not add up to the total; an export button that does not say what it
  exports; losing a filter, an export, a preset, the permission list or a drill-down link that works today.

## 3. Shared: header, tabs, filters, exports

- Header: รายงาน + "สรุปข้อมูลทรัพย์สินและรายงานพื้นฐาน"; the two header exports stay (ส่งออกทะเบียนทรัพย์สิน with
  `asset:view`, ส่งออกรายงานภาพรวม with `report:export`) with a caption under them: "ส่งออก {n} รายการ · ตัวกรอง: {chips
  as text}" (or "ไม่มีตัวกรอง").
- Tabs as today (`view=overview|accounting|operations|catalog`, the TabNav "มุมมองรายงาน"); every link keeps the filters.
- **Filter bar** (overview and accounting; operations and catalog show the chips line only, with "แก้ตัวกรองที่แท็บภาพรวม"):
  a panel "ตัวกรองรายงาน" ("มีผลกับตัวเลขภาพรวม ตารางแยกกลุ่ม และไฟล์ส่งออกทะเบียนหรือภาพรวมทรัพย์สิน") with
  ค้นหา, บริษัท, สาขา, สถานะ visible and **ตัวกรองเพิ่มเติม** (a disclosure) holding หมวดหมู่, สภาพ, ประเภทการถือครอง; the
  form submits with **ใช้ตัวกรอง** (GET, as today); **ซ่อนตัวกรอง** folds the panel (`<details>`, open while any field
  filter is set or on first visit **(my call)**). The URL-only filters and their hidden inputs stay exactly as today.
- Chips "ตัวกรองที่ใช้อยู่" with remove links and ล้างตัวกรอง, as today (company clears branch).

## 4. Overview (`RP-Overview`)

### 4.1 Strip
ทรัพย์สินทั้งหมด n (ตามตัวกรอง) = **นอกขั้นตัดจำหน่าย** a ("{k} สถานะ เช่น …") + **รอตัดจำหน่าย** b (ดูรายการ → register
filtered) + **ตัดจำหน่ายแล้ว** c (ดูรายการ); then **ราคาซื้อรวม** (today's total value, renamed) "ผลรวมราคาซื้อของ n รายการ
ไม่ใช่มูลค่าตามบัญชี · ดูแท็บบัญชี". **(my call, after the builder check)** The parts are by status: รอตัดจำหน่าย =
status `Pending Disposal`; ตัดจำหน่ายแล้ว = `Disposed` + `Retired` (both off the books elsewhere in the system), with
the foot "รวมปลดระวาง n" when Retired > 0; นอกขั้นตัดจำหน่าย = every other status. "ดูรายการ" links the register by
`statusId` (Pending Disposal; Disposed), and the "รวมปลดระวาง n" foot links `statusId` Retired — no new register
filter.

### 4.2 Group tables
Six tables as today (status, category, company, branch, department, ownership), each:
- sorted by count desc (ties by name), the first **8** rows, then "อื่น ๆ อีก {k} {unit}" (sum; for status the
  names inline when k ≤ 3), then the "ยังไม่ระบุ…" row where the dimension can be null (department; category/branch
  cannot), then "รวม n" — with the department equation "= 8 แผนกแรก x + อื่น ๆ y + ยังไม่ระบุ z" when both exist;
- columns ชื่อ (name, code under it as mono meta where the record has a code), จำนวน, สัดส่วน (% with one decimal and a
  bar);
- each named row links to the register with the same filters plus that group's filter (`statusId`, `categoryId`,
  `companyId`, `branchId`, `departmentId`, `ownershipType`); the "ยังไม่ระบุแผนก" row links only if the register has a
  "no department" filter (otherwise plain) **(my call)**; "อื่น ๆ" is not a link;
- **ดูทั้งหมด {n} {unit}** opens the same report with `breakdown=<dimension>`: a page section listing every group with a
  search field (GET `bq=`), same columns and links, and a back link to the overview **(my call: a server page, not a dialog)**.
Branch rows read "name" with "company code · branch code" under it.

### 4.3 Preview
"ตัวอย่างก่อนส่งออก" keeps 10 rows (3 on phones), 5 columns: ทรัพย์สิน (name, 2-line clamp with the full name as `title`,
tag mono under it), หมวดหมู่, สาขา/แผนก, ผู้ถือครอง/ประเภทการถือครอง, สถานะ (badge); a link "ดูทั้งหมดในทะเบียนทรัพย์สิน" with
the filters.

### 4.4 Department fix
Assets without a department are counted (page and the overview workbook's By Department sheet get a "ยังไม่ระบุแผนก" row),
so every table adds up to the total.

## 5. Operations (`RP-Ops`)

- The chips line + "ทุกตัวเลขในแท็บนี้นับตามตัวกรองนี้ · ทรัพย์สิน n รายการ".
- **คิวแก้ข้อมูลทะเบียน**: cells ทั้งหมดในคิว (distinct assets), ไม่มีผู้รับผิดชอบ, ไม่มีหมายเลขเครื่อง, ไม่มีรูปทรัพย์สิน,
  ใกล้หมดประกัน — each a filter of the queue (`issue=responsibility|serial|photo|warranty`, default all); the equation
  line ("ในคิว x ชิ้น = ข้อมูลไม่ครบ y + ใกล้หมดประกันอย่างเดียว z · 1 ชิ้นมีได้หลายปัญหา (… = k ปัญหา)"); a toggle
  "แสดงปัญหาอื่นของชิ้นเดียวกันด้วย" (`others=1`); links "เปิดในทะเบียนทรัพย์สิน" (the register's matching `dataQuality=`)
  and "ส่งออก n รายการ Excel" (the register export with that `dataQuality=`) — shown only when one issue is chosen;
  under "ทั้งหมดในคิว" the place reads "เลือกประเภทปัญหาเพื่อส่งออก" (the register has no "any issue" filter, and an
  export must say what it holds) **(my call, after the builder check)**; the table:
  ทรัพย์สิน (name, tag), ปัญหา (badges), หมวดหมู่ · สาขา, แก้ (one button "แก้ไขข้อมูล" to the first issue's place, with
  "หน้าแก้ไข · {field}" under it); paging 8 per page with ก่อนหน้า / ถัดไป (`qpage=`), ordered by last update desc
  (as today). The counts keep today's scope rule (they ignore the `dataQuality` and `activity` filters).
- **ทรัพย์สินต่างบริษัท/ต่างสาขา**: the four counts as today, the equation line, ส่งออกต่างขอบเขต Excel (today's link),
  the 8-row preview kept.
- **ไม่มีความเคลื่อนไหวล่าสุด**: the idle-180-days count and its register link (today's).
- **รายงานการปฏิบัติงาน**: top 5 by custodian, by location, by repair count (today's), names first.
- `/admin/data-quality` link stays ("เปิดกฎคุณภาพข้อมูล").

## 6. Catalog (`RP-Library`)

- The chips line + "มีผลเฉพาะรายงานที่ติดป้าย ใช้ตัวกรองปัจจุบัน · {k} จาก {n} รายงาน · แก้ตัวกรองที่แท็บภาพรวม".
- Groups by who uses them: **บัญชีและทะเบียนทรัพย์สิน** (overview monthly, register, depreciation — the overview workbook's
  depreciation sheet, opens the accounting tab —, cross-scope), **ช่างและซ่อมบำรุง** (repair follow-up weekly),
  **ผู้อนุมัติ** (disposal monthly), **ผู้ตรวจนับ** (findings all — Excel and PDF —, pending findings weekly; a note that per-round
  results export from each round's page with a link to the rounds list), **ผู้ดูแลระบบ** (role-permission audit, system
  logs screen-only, data quality → `/admin/data-quality`).
- Each card: name, description (with live counts where the board shows them: cross-scope n, findings by status), scope
  badge **ใช้ตัวกรองปัจจุบัน · {chips}** or **ทั้งระบบ · ไม่ใช้ตัวกรอง**, cadence label where today has one, format badges
  (Excel / PDF), **ส่งออกล่าสุด {date time}** (§6.1; "ยังไม่เคยส่งออก" when none), เปิดหน้าจอ, and the export buttons; without
  permission the button is replaced by "ไม่มีสิทธิ์ส่งออก" with the permission it needs in words.
- Kept: saved presets (this device, localStorage) and the collapsible "สิทธิ์รายงานของคุณ" list, at the end of the tab.

### 6.1 Last export time (no migration) **(my call)**
Each export route the catalog links to writes one `SystemLog` entry when it serves a file (module `report`, action
`export`, the report key, the user). The key comes from the route and its parameters, so an export from any page
counts (it is the same file): `/api/reports/assets-overview/export` → `assets-overview`; `/api/assets/export` →
`cross-scope` when `crossScope` is set, else `assets-register`; `/api/maintenance-tickets/export` → `maintenance`;
`/api/disposal-requests/export` → `disposal`; `/api/audit-findings/export` → `audit-findings-pending` when
`status=pending`, else `audit-findings`; `/api/audit-findings/export-pdf` → `audit-findings-pdf`;
`/api/admin/roles/export` → `role-audit`. The catalog reads the latest entry per key (any user). Exports before the
change have no entry. Logging never blocks the file: a failed log write is ignored **(my call, after the builder
check)**.

## 7. Phone (`RP-Phone`)

One column: tabs scroll; the chips line with a "ตัวกรอง (n)" button that opens the filter panel; the strip as 2 × 2 with
the equation; an **ส่งออก** card (n rows, the filters, the two exports with one-line descriptions); **แยกกลุ่ม** with a
row of group buttons (`group=status|category|branch|department|ownership|company`, default status) showing one table
at a time (same rows, 44px tall); the preview with 3 cards (name, tag, holder · ownership, status) and the register link.
Operations and catalog stack their cards; the queue table becomes cards with the fix button full width.

## 8. What the boards omit and we keep

All URL-only filters and hidden inputs; chip removal rules; the accounting tab as it is; the operations tab's cross-scope
preview and the top-5 lists; the 4 recurring "run now" cards (now inside the catalog groups as the cards with a cadence);
every export route, permission gate and file; saved presets; the permission list; empty states (`selectReportEmptyCopy`);
phone 44px targets; the tab snap on phones; timing labels (`reports.*`).

## 9. Recon notes (2026-11-07)

- Four views (overview, accounting, operations, catalog) by `?view=`; all need `report:view`; exports gated per route.
- Group tables: `groupBy` with no order or cap; department drops nulls (page and workbook).
- Operations issue list: `take: 8`, updatedAt desc, four issue kinds; its counts ignore `dataQuality`/`activity`.
- No "last exported" record exists anywhere; `SystemLog` gets no export rows today.
- E2E `e2e/cross-cutting/reports.spec.ts` and helpers depend on `[data-report-view-content]`, the tab labels, the
  "มุมมองรายงาน" nav label and the "สิทธิ์รายงานของคุณ" summary; many unit tests pin the page source.

## 10. Plans

1. **Overview and shared parts:** group-table rules (sort, cap, others, unassigned, total, links, `breakdown=` page),
   the department fix (page and workbook), status-group strip, filter bar, export captions, preview columns; export
   logging to `SystemLog` (§6.1).
2. **Operations, catalog and phone:** the issue queue (cells as filters, paging, per-issue export), the catalog by user
   with scope badges and last export, the phone layout, and E2E updates for all four tabs.
