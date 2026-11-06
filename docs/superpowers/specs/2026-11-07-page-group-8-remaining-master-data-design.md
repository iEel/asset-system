# Page group 8: the remaining master data — companies, branches, departments, categories, suppliers

Date: 2026-11-07 · Status: written overnight from the canvas boards, for the user's morning review (the user chose 2026-11-07: build this group from the boards, no Q&A, on branches, nothing merged before review; board items that need a migration are skipped and listed — "ทาง ก").

Boards (design data): `MD-Companies`, `MD-Branches`, `MD-Departments`, `MD-Categories`, `MD-Category-Edit`, `MD-Suppliers`, `MD-Supplier` (canvas https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p; copies in the plan workspaces). Notes: `.impeccable/critique/2026-10-20-canvas-assumptions.md` (## ข้อมูลหลักที่เหลือ; some notes are out of date, see §9).

## 1. Why

These five lists and two detail/edit pages are the last master-data screens on the old look. IT and admins use them to keep the reference data that every asset form, report and audit reads. The boards make each list answer "what is incomplete or unused here" at a glance, show what blocks a deactivation before anyone presses it, and link each count to the records behind it.

**Success:** each page matches its board; nothing that works today is lost (§8 lists what the boards omit and we keep); deactivating says why it cannot before anyone tries; an inactive record can be brought back from the list.

## 2. Goals, non-goals, anti-goals

**Goals** — the five lists, the category edit form and the supplier detail page rebuilt to their boards (§4–§7); one shared list pattern for all five (§3).

**Non-goals** — the create/edit forms of companies, branches, departments and suppliers (no boards: they keep today's fields and rules, restyled only where shared components change); any migration (§9); phone-specific layouts beyond what exists today (no phone boards).

**Anti-goals** — dropping a working filter, search field, sort, export/import, drilldown or validation because the board does not draw it; a disabled checkbox that stops reactivating a record; a "ปิดใช้งาน" that is refused only after the user confirms when the page already knows why.

## 3. The shared list pattern (all five)

- Name first, code in small mono under it; reference columns show names only (no "code - name").
- The record-status control is a segmented ใช้งาน {n} / ไม่ใช้งาน {n} / ทั้งหมด {n} with counts (replaces the select); the status column shows only under ทั้งหมด.
- The row opens the edit page (or the detail page for suppliers); the fixed "แก้ไข" column goes; ⋯ holds แก้ไข, the board's links, and **ปิดใช้งาน** (wording instead of ลบ). When the row's counts show what blocks it, ปิดใช้งาน is shown disabled with the reason (the "unavailable" menu item `row-actions.tsx` already supports); otherwise it opens a confirm with the checklist (the pattern of `location-deactivate-button.tsx`). Inactive rows show **เปิดใช้งาน** (PUT with `isActive: true`, the location reactivate pattern). *(my call: ปิดใช้งาน needs `<module>:delete`, เปิดใช้งาน `<module>:edit` — today ⋯ ลบ shows regardless and the API refuses; hiding what the user cannot do is new behaviour, safer.)*
- The server checks stay the backstop (409 with the reason).
- Default sort by name (boards); every sort that exists today stays available (code, company, etc.).
- Summary cards and footers per board; counts are active records only, as the board footers say.
- Kept as today: paging 25/50/100 with previous/next and a page past the end going to the last page; `returnTo` on new/edit links; empty states with clear-filters; the กรอง / ล้างตัวกรอง actions (departments and suppliers add the board's filter chip); every search field; phone: tables scroll sideways with the ⋯ bottom sheet, suppliers keep their phone cards.

## 4. Companies (`MD-Companies`)

Cards: บริษัททั้งหมด (ใช้งาน) with "รวมสาขา · พนักงาน · ทรัพย์สิน"; มีทรัพย์สิน; ยังไม่มีทรัพย์สิน with "a + b = n · ควรตรวจว่าเป็นบริษัทใหม่หรือข้อมูลเก่า"; ยังไม่มีสาขา with "ควรเพิ่มสาขาก่อนสร้างทะเบียนทรัพย์สินจริง ›". Filters: search, การใช้งานทรัพย์สิน, สถานะสาขา, status. Columns: ชื่อบริษัท (code · English name or "ยังไม่มีชื่อภาษาอังกฤษ"), รหัสในรหัสทรัพย์สิน (or "เว้นว่าง ใช้รหัสบริษัทแทน"), เลขประจำตัวผู้เสียภาษี ("ยังไม่ระบุ"), สาขา (or "ยังไม่มีสาขา"), พนักงาน, ทรัพย์สิน, (สถานะ), ⋯. ⋯: แก้ไข, **เพิ่มสาขาให้บริษัทนี้** (`/master-data/branches/new?companyId=` — the branch form gains the preset), ปิดใช้งาน (reason from branches/departments/employees/assets/audit rounds). Inactive row: "· ปิดใช้งานเมื่อ {date}" read from the system log's deactivate entry ("–" when none) *(my call: no column)*, and เปิดใช้งาน.

## 5. Branches and departments

**Branches (`MD-Branches`):** cards with the per-company breakdown; filters บริษัท (names), การใช้งานทรัพย์สิน, สถานะที่ตั้ง, status; columns ชื่อสาขา (code · company), ผู้ประสานงาน, ที่ตั้ง (or "ยังไม่มีที่ตั้ง" + **เพิ่มที่ตั้งในสาขานี้** → `/master-data/locations/new?branchId=`), พนักงาน (link to employees `?branchId=`), ทรัพย์สิน (link); footer totals over the filtered set; ⋯: แก้ไข, เพิ่มที่ตั้งในสาขานี้, ดูพนักงานในสาขานี้ ({n}), ปิดใช้งาน with the reason.

**Departments (`MD-Departments`):** cards แผนกทั้งหมด (per-company + แผนกกลาง), มีพนักงาน (total employees), ยังไม่มีพนักงาน; filters บริษัท, พนักงาน, ทรัพย์สิน, status; the filter chip and summary line; columns ชื่อแผนก (code), บริษัท, พนักงาน, ทรัพย์สิน (links: employees `?departmentId=` exists; **the asset register gains a `departmentId` filter**), "โอนย้ายก่อนปิดใช้งาน" on rows with assets; the confirm dialog with its checklist (ไม่มีพนักงาน / ไม่มีทรัพย์สินผูกอยู่ / ไม่อยู่ในขอบเขตรอบตรวจนับที่เปิดอยู่). **Server rule (new):** DELETE and PUT-deactivate of a department are refused while active employees, active assets or an open audit round scoped to it remain (today neither checks).

## 6. Categories (`MD-Categories`, `MD-Category-Edit`)

**List:** header "เพิ่มหมวดหมู่", export and template kept; cards per board (prefix card links the settings); the five health filters + status; columns ชื่อหมวดหมู่ (code), คำนำหน้ารหัส ("CAM", "ยังไม่ตั้ง · ใช้ {code} แทน", "{prefix} · ใช้ร่วมกับ {other}"), รุ่น, ทรัพย์สิน, ข้อมูลเพิ่ม ("{n} ช่อง" / "ยังไม่มี"), รูปที่ต้องถ่าย ("{n} รายการ" / "ยังไม่มี"); ⋯: แก้ไข, ดูรุ่น ({n}), ดูทรัพย์สิน ({n}), "คำนำหน้ารหัส {p} ในการตั้งค่า", ปิดใช้งาน with the reason. The description stays searchable (column dropped per board).

**Edit:** two columns; header "แก้ไขหมวดหมู่ · {name}" with "รหัส {code} · ใช้อยู่กับ {m} รุ่น และ {a} ทรัพย์สิน · …"; 1 ข้อมูลหมวดหมู่ with the hints and the read-only prefix box (prefix, shared-with, an example tag, "แก้ในการตั้งค่า"); 2 แม่แบบ as a compact table (ชื่อ field, ป้ายชื่อ, ป้ายชื่อภาษาไทย, ชนิดข้อมูล — **ข้อความ, ตัวเลข, รายการเลือก, วันที่, ใช่/ไม่ใช่ all kept** — จำเป็น, ⋯ move/ทำซ้ำ/ลบ), option chips with "แก้ตัวเลือก", "ใหม่" badges, the warning about renaming a field with existing values (the count of fields holding values is computed from the category's assets' `customFieldsJson`, chunked); 3 รูปที่ต้องถ่าย numbered; 4 สถานะ — the checkbox is disabled **only when unticking an active category that still has assets or models** (an inactive one can always be ticked back on); the side panel "ผลของการแก้ไข" (ตอนนี้ / หลังบันทึก from the form state); sticky footer with the change summary. Row-level errors under each field kept. The create page uses the same form without counts.

## 7. Suppliers (`MD-Suppliers`, `MD-Supplier`)

**List:** cards per board (the "มีทรัพย์สินผูกอยู่ {n} ราย" foot on ยังไม่มีเอกสารจัดซื้อ); filter chip; summary line "{n} ผู้ขาย · ทรัพย์สินรวม {a} รายการ · งานซ่อมค้าง {r} งาน · เรียงตาม…"; columns ชื่อผู้ขาย (SUP code; the address kept as a small line *(my call: keep)*), ผู้ติดต่อ (name / phone · email, or "ยังไม่มีข้อมูลติดต่อ" + "เพิ่มข้อมูลติดต่อ"), ทรัพย์สิน, เอกสารจัดซื้อ ("ยังไม่มี"), งานซ่อม with "ค้าง {n}" (open = not closed/cancelled, as the detail page counts), ⋯ แก้ไข / ปิดใช้งาน (reason incl. PM plans). Phone cards kept.

**Detail:** header with code, contact line, แก้ไข and ⋯ (ปิดใช้งาน with the reason); one strip of four (ทรัพย์สิน with "ผูกเอกสารจัดซื้อครบทุกรายการ" or "{n} รายการยังไม่ผูกเอกสาร", เอกสารจัดซื้อ with "มูลค่าจัดซื้อรวม", งานซ่อม "ค้าง · ซ่อมเสร็จแล้ว · ยกเลิก", ค่าซ่อมสะสม "รวมจากใบซ่อม {n} ใบที่มีค่าใช้จ่าย"); assets "5 รายการล่าสุด จาก {n}" with "ดูทรัพย์สินทั้งหมด ({n})" and columns ทรัพย์สิน, หมวดหมู่ · ที่ตั้ง, สถานะ, เอกสาร, ราคาซื้อ; purchase documents (all, newest first) with the type label, invoice, linked count, amount and the **total row**; side: สิ่งที่ควรติดตาม (open repairs: asset, tag, "เปิดงานเมื่อ {date} ({n} วัน)" *(my call: "รอผู้ขายมา N วัน" needs a status-change time, a migration — skipped)*, problem, link; plus today's follow-up items when they apply), ประวัติงานซ่อมกับผู้ขาย (asset name first, status, tag · MT-, problem, cost, reported date kept), ข้อมูลผู้ขาย. Empty states, phone document cards and the back link kept.

## 8. What the boards omit and we keep (from the recon, 2026-11-07)

Search fields beyond what is shown (addresses, tax IDs, descriptions, contacts); every existing sort; previous/next paging and the past-the-end redirect; `returnTo`; empty states; กรอง/ล้างตัวกรอง; phone table scroll and the ⋯ bottom sheet; suppliers' phone cards and filter disclosure; the API rules (unique codes under the field, validation, deactivation guards); the category form's วันที่ / ใช่/ไม่ใช่ field types, row-level errors, the duplicate-field refusal, reviving an inactive category by its code on create; the supplier form's leave-without-saving confirm; the branch form's "no company yet" gate; back links next to breadcrumbs; the forms of companies, branches, departments and suppliers as they are.

## 9. Skipped (would need a migration) and corrections

- **Skipped:** an exact "ปิดใช้งานเมื่อ" date (the system log is read instead); a supplier description line under the name; "รอผู้ขายมา N วัน" on a repair (shown as days since it was reported).
- **Canvas notes out of date:** all five lists already filter by record status and PUT reactivates; `locations/new` already takes `branchId`; categories already guard deactivation (departments do not — §5 adds it).

## 10. Plans

1. The shared list pattern + companies + branches + departments (incl. the department guard and the register's `departmentId` filter, `branches/new?companyId=`).
2. Categories list + edit.
3. Suppliers list + detail.
