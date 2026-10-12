# 2B สังเคราะห์: หน้ารายการและโครงหน้า (ข้อมูลตั้งต้นของสเปก)

ฐาน `master` `d38a0ee` · อ่านอย่างเดียว ไม่แก้ repo ไม่รัน test ไม่เปิดแอป · รวมแผนที่ 5 ส่วนในโฟลเดอร์นี้ (**M01** `01-obligations.md` · **M02** `02-list-pages.md` · **M03** `03-frames-nav.md` · **M04** `04-primitives-guards.md` · **M05** `05-mockup-targets.md`) · เลขบรรทัดเป็นของ HEAD เว้นแต่เขียนว่าเป็นของ `5ffee76` (ฐานของ 2C ห่าง 51 commit, M01:3)

ตัวย่อ (ตาม M01:5-11): **A** = `docs/superpowers/specs/2026-10-11-ui-phase2a-design.md` · **A/0N** = `…/2026-10-11-ui-phase2a/0N-*.md` · **C**, **C/0N** = ของ 2C ชื่อแบบเดียวกัน · **F** = `docs/superpowers/specs/2026-10-10-ui-foundation-design.md` · **MK** = `docs/superpowers/specs/2026-10-10-ui-foundation/` (ต้นแบบที่อนุมัติ) · **DS** = `DESIGN.md` · **DH** = `DEVELOPER_HANDOFF.md` · **VFG** = `tests/visual-foundation-guards.test.ts` · **FMG** = `tests/form-migration-guards.test.ts` · **WIKI** = `D:/Obsidian/Eltross/AssetSystem/ams-open-questions.md` · **D/** = `src/app/[locale]/(dashboard)/` · **c/** = `src/components/`

ตรวจซ้ำที่ HEAD ระหว่างสังเคราะห์ (นอกจากที่แผนที่ตรวจแล้ว): `<Button` ใน `src/app` 0 ไฟล์ · `<MasterDataHeader` 11 จุด · `toLocaleString()` 44 · `font-mono` 44 บรรทัด · VFG:226-231 (R1), :249-254 (R7 ≤44), :266-271 (R2) · `tests/breadcrumbs-ui.test.ts:41-42` · `c/layout/dashboard-shell.tsx:124-130` · `c/layout/sidebar.tsx:115-166` · `messages/th.json:127-129` · `D/audit/findings/page.tsx:82` (`take: 200`) กับ `:90-93` (นับยอดเต็ม) · ปุ่มกลับพา `returnTo` (`D/assets/[id]/page.tsx:884-926`, `tests/asset-return-navigation.test.ts:46`, `tests/master-data-return-navigation.test.ts:33-66`) · FMG:26-37 (`admin-user-form`, `role-permission-form` อยู่ชุด 4 ที่ FMG:36) · `c/admin/system-settings-form.tsx:754-756`, `:948-967` · `tests/settings-tab-persistence-ui.test.ts:5-13` · DS:258, :284, :573 · `MK/base.css:142`, `:309-317` · `src/lib/utils.ts:2-7` · C:207-209 · DH:441-447, :454, :470-475

---

## 0. ใจความ

1. **2B อยู่บน critical path และไม่ deploy เอง:** 2C plan 3–5 เริ่มหลัง 2B merge (C:148 I28, DH:442-445) · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมด (DH:454, WIKI:51) ทับ "2B ∥ 2C" (A:15) และ I22 (A:121) · ข้อเสนอข้อ 3 แบ่ง 2B เป็น 5 plan ที่ปลด 2C ทีละชุด ทำให้เฟส 2 สั้นลงราว 3 plan (ต้องให้ผู้ใช้ยืนยัน Q7)
2. **ยังไม่มี primitive ของ 2B สักตัว** (M04:9) และหน้ารายการยังไม่ใช้ของ 2A เลยนอกจากทะเบียน (M02:11-17): ตัวเลขฐานของ 2A เท่าเดิมทุกตัว (`toLocaleString()` 44 · พื้นหัวตาราง 44 · แถวว่างใน td 16 · ช่องกรอง server 33) · ของซ้ำที่รวมได้: `FilterSelect` 7 ตัว · แบ่งหน้า 12 แบบ · หัวเรียงลำดับ 8 แบบ · กล่องตัวเลข 25 ฟังก์ชัน · หัวหน้า 4 แบบ
3. **ไม่ต้องเพิ่ม token** (I21 A:120 ยังอยู่): สีของต้นแบบทุกตัวมี token แล้วผ่าน palette ที่เลือก (M05:14, M05 §1) · 3 ค่าที่ไม่มี token มีทางแทน (M05 §3)
4. **R7 ลงถึง 0 ด้วย 2B คนเดียวไม่ได้:** 9 ใน 44 จุดอยู่ในไฟล์ของ 2C (M04:11, M04 §5.2) · ทางออก R-e: 2B แปลง 6 จุดในไฟล์ที่ 2C ย้ายเสร็จแล้ว แล้วเหลือ budget รายไฟล์ 3 จุดให้ 2C plan 4 หรือ 2D
5. **ผู้ใช้ต้องตัดสิน 7 เรื่อง** (ข้อ 4) · D10 (ปุ่มกลับ) และ D13 (แก้ไข/ลบในแถว) ถูกอ้างถึงแต่ไม่มีนิยามใน repo (M01:251) จึงต้องตัดสินใหม่ใน Q2 และ Q5

---

## 1. ขอบเขต 2B

| # | เรื่อง | เปลี่ยนอะไร | ไฟล์ / หน้า | ขนาดที่ HEAD | ข้อผูกพันต้นทาง |
|---|---|---|---|---|---|
| 1 | เมนูข้าง | "ทะเบียนทรัพย์สิน" (`/assets`) เป็นรายการแรกของหมวดทรัพย์สิน · ตัดชั้น "ทะเบียน" · ลึกไม่เกิน 2 ชั้น · ไอคอนไม่ซ้ำ | `c/layout/sidebar.tsx:115-144` · `messages/{th,en}.json:128` · DS:489 | 1 ไฟล์ · 9 รายการย้าย · key 1 ตัว · ไม่มี test ยึดโครงกลุ่ม (M01:157) | WIKI:52 (ข้อ 28) |
| 2 | `PageHeader` + จังหวะหน้า | หัวหน้าตัวเดียว `{ breadcrumbs?, title, meta?, actions?, back? }` · ระยะ crumbs→h1 `mb-1` · ป้ายสถานะเข้า meta (`flex flex-wrap gap-x-3 gap-y-1`) · h1 เป็นชื่อเมื่อ crumb สุดท้ายเป็นรหัส · ตัวห่อหน้าแบบเดียว | `MasterDataHeader` (`c/master-data/master-data-layout.tsx:5-40`) 11 จุด · h1 เขียนเอง 12 หน้ารายการ + 5 หน้าสรุป + 8 หน้า `[id]` · `PageHeader` ประจำไฟล์ `D/my-assets/page.tsx:163` · `ReportHeader` (`c/reports/report-header.tsx:16-43`) | ~45 หัวหน้า (58 `<h1` ที่ `text-2xl`, M03:7) · ระยะ crumbs 3 แบบใน 11 จุด (M03 §C) · ตัวห่อ 4 แบบ (M03 §E1) · h1 ซ้ำรหัส 8 หน้า (A/08:138-145) | F:42 · F:303 · A:66-67 · A/08:125 · A/08:286 · A/08:331 · C/08:469 |
| 3 | ปุ่มกลับ | แบบเดียวตาม Q2 · แก้ไอคอนผิด 3 จุด · `disposal/[id]` ไม่มีปุ่มกลับบนมือถือ | ฟอร์ม 12 ไฟล์ + `c/assets/asset-component-manager.tsx:267` + `D/disposal/new/page.tsx:54` + `D/disposal/batch/new/page.tsx:26` (M03 §D1) · "ยกเลิก" ที่หัว 3 หน้า maintenance · หน้ารายละเอียด/รายการ 11 จุด (M03 §D2) | 15 + 3 + 11 · O16 เขียน "14" แต่ไม่มีรายการ (M01:252) | C/08:57 (O16) · A:67 · A/08:322 (D10) |
| 4 | `DataTable` | shell / head / th (เรียงลำดับ + `aria-sort`) / row (`group/row`, `focus-within`) / td / foot · เส้นแถว `border-soft` · ตัวเลขชิดขวา `num` | ทุกตารางในหน้ารายการและรายละเอียด · `ColumnHeader` (`master-data-layout.tsx:82-99`) · `ClickableTableRow` (`c/ui/clickable-table-row.tsx:56`) | พื้นหัวตาราง 44 จุด/31 ไฟล์ · `ColumnHeader` 92 จุด/16 ไฟล์ · หัวเรียงลำดับ 45 จุด 8 แบบ (`aria-sort` 1) · `<table` 45/33 ไฟล์ (M04 §2.4, §4) | F:42 · A:70 · A:117 (I18) · A/03:19 · A/09:266 · VFG:249-254 · DS:498 |
| 5 | แถวว่าง | `TableEmptyRow` · บรรทัดเดียว = `EmptyNote padded` · มีปุ่ม = `ActionEmptyState` ใน `td.p-0` · ล้างตัวกรอง `actionVariant="secondary"` · เติมให้ตารางที่ไม่มี | `noData` 9 แถว + storage 2 + `ActionEmptyState` ใน td 5 (M04 §4) · ไม่มีเลย: logs, roles ×2 · ปุ่มล้าง 4 จุด (M02 §6.5) | 16 + 3 + 4 | A:69 · A/07:23 · A/07:115 · A/07:316 |
| 6 | แบ่งหน้า | ขยาย `c/ui/pagination.tsx` (ช่วงแถว · จำนวนต่อหน้า · `aria-live` · `outline sm` · 44 บนมือถือ) แทนตัวเขียนเอง | 12 แบบ (M04 §2.3) | 11 ตัวที่ต้องแทน · ลิงก์ปิดใช้ `opacity-50` 20 ลิงก์ | A/09:339 |
| 7 | ตัวกรอง | `FilterSelect` กลางบน `Field` + `NativeSelect` · ป้ายแบบเดียว 13/20 500 · ช่อง 40 จอใหญ่ / 44 มือถือ · `SearchField` · ชิปตัวกรอง (ผู้ใช้แรกของ `linkVariants`) | server 12 ไฟล์ · `MasterDataSearch` (`master-data-layout.tsx:42-80`, ช่องดิบ `:63`) · `c/admin/asset-state-review-workspace.tsx:238` · ทะเบียน: `asset-register-toolbar.tsx:41,:53,:65` · `LabeledSelect` `asset-register-filter-sheet.tsx:194` · `asset-register-search-field.tsx:77` | 33 element/12 ไฟล์ (แสดง 55 ช่อง) · `FilterSelect` 7 ตัวเรียก 24 · `ReportSelect` 6 · MDS 6 · `LabeledSelect` 7 · select ทะเบียน 3 | A:65 · A/06:10 · A/06:186 · A/06:234 · C/08:42-44 (O1–O3) · C/08:61 (O20) · C/03:150 · A/04:113 |
| 8 | `RowActions` ช1 | ปุ่มถัดไป 120×32 ช่องตายตัว + ⋯ `ghost icon-sm` · `unavailable` + คำอธิบาย · sheet บนมือถือ · กันคลิกทะลุแถว · เปิด dialog ของ 2C ผ่าน handle | ทะเบียน (`c/assets/asset-register-row-actions.tsx:50-268`) · `D/disposal/page.tsx:419-429` · `D/audit/rounds/[id]/pending/page.tsx:230`, `:275-291` · แถวข้อมูลหลัก 8 หน้า (Q5) · ลิงก์ในแถวของ users, roles, categories, rounds, findings | ⋯ มีที่เดียว (M02 §6.10) · แก้ไข 32px ข้างลบ 44px ใน 7 หน้า | F:34 · A:63-64 · A/04:248 · A/04:324-325 · A/05:200 · C/03:175 · C/08:47 (O6) |
| 9 | ปุ่มในรายการและหัวหน้า | → `Button` / `buttonVariants` ตามตาราง A/04:201-227 · `min-h-11` อย่างเดียว 44→40 บนจอใหญ่ (K7) · `Loader2` → `busy` | ปุ่มระดับหน้า 0 จุดที่ใช้ `Button` (M02 §6.10) · ไฟล์ร่วม 7 ปุ่ม (C/06:301) · spinner `c/audit/audit-findings-batch-actions.tsx:88`, `:97` · `c/disposal/disposal-bulk-approval.tsx:424` · trigger `c/audit/audit-finding-review-actions.tsx:113`, `:123` | ทุกหัวหน้าและ toolbar · spinner 3 · trigger 2 | A:63 · A/04:201-227 · C:55 (K7) · C:147 (I27) · DS:375 |
| 10 | `TabNav` | ลิงก์ + `aria-current` · ตัวนับไม่ใช้พื้นโปร่ง · เส้นใต้ · โหมด client ให้ O7 | แถวที่มีตัวนับ 7 + ไม่มีตัวนับ 4 (M02 §6.8) · สลับมุมมอง work-center → `Segmented` (`D/work-center/page.tsx:372-385`) | R1 1 จุด (`D/audit/rounds/page.tsx:597`) · `c/assets/asset-detail-tabs.tsx:76` `bg-white/20` | C:69 · A/09:105 · A/09:313 · A/09:335 · VFG:226-231 · VFG:143-148 |
| 11 | `StatStrip` | แถบเดียว เส้นคั่นบาง · ตัวเลข `text-metric num` ไม่มีสี · เซลล์ที่เป็นตัวกรองคง `aria-current` | 25 ฟังก์ชันใน D/ + 5 ใน c/ (M02 §6.6) · `MetricCard` กลาง 14 จุดใน 4 ไฟล์รายงาน | ~30 ตัว | F:42 · A:68 · A/07:199 · A/03:297 · A/09:318 · DS:258 |
| 12 | `KeyValueList` | `dl` แบบ `120px \| 1fr` · ซ้อนบนมือถือ · ค่าว่าง `Nil` | ตัวช่วยประจำไฟล์ 10 ตัว (`Info` ×6, `InfoRow`, `DetailItem`, `BatchInfo`, `MobileAuditDetailField`; M03 §F) | 10 | A:68 · A/08:214-226 |
| 13 | รหัส → `tag` | ห่อรหัสที่แสดงบนจอ · `font-mono font-semibold` 7 จุด (ปลดให้ 2D ตัด Mono 600) · ความกว้างคอลัมน์ `assetTag` | `font-mono` 44 บรรทัด/15 ไฟล์ · รหัสในหน้ารายการ ~42 หลัก + ~27 ผสม (M02 §2) | 79 (A:66 นับที่ `081d538`) | A:66 · A/03:211-213 · DS:301 |
| 14 | ค่าว่างและตัวเลข | `Nil`/`orNil` · `formatCount`/`formatMoney` + `num` · หน่วยที่หัวคอลัมน์ · แก้ 0.00 ของ supplier | `"-"` บนจอ 121/40 ไฟล์ (A/08:160) · `toLocaleString()` 44 (35 ในไฟล์ 2B, 9 ในไฟล์ 2C; M04 §3) · `formatCurrency` บนจอ · `D/master-data/suppliers/[id]/page.tsx:240`, `:289` | 121 + 44 + ~30 | A:68 · A/08:154 · A/08:211-226 · A/08:305 · DS:514-516 |
| 15 | checkbox เลือกแถว | `checkboxVariants` · เป้ากด 44 (K16) ให้ 3 จุดที่เล็ก | `c/assets/asset-register-table.tsx:544`, `:615` · `asset-register-mobile-list.tsx:93` · `disposal-bulk-approval.tsx:448`, `:493` · `disposal-bulk-execution.tsx:681`, `:732` · `audit-findings-batch-actions.tsx:109` | 8 | C/08:42 (O1) · C/08:45-46 (O4, O5) · C/04:377 · C:156 (I36) |
| 16 | โครงหน้าและ skeleton | ลบ `pb-24` ซ้อน 4 หน้า · รายการ/รายละเอียดเต็มกว้าง · skeleton ตรงหน้าจริง · เนื้อใน sheet ทะเบียน (ลบ `closeLabel`, `pr-14`, `pb-[…]` ที่ซ้ำกับ primitive) | `D/master-data/employees/[id]/page.tsx:254` · `D/master-data/suppliers/[id]/page.tsx:150` · `D/my-assets/[id]/page.tsx:56` · `D/disposal/batches/[id]/page.tsx:52` · `c/ui/page-skeleton.tsx:16-26`, `:84`, `:111`, `:146`, `:168`, `:208` · `asset-register-filter-sheet.tsx:92`, `:96` · `asset-register-row-actions.tsx:177`, `:181` | 4 + 6 + 2 | C/06:545 · C/08:469 · F:42 (skeleton ไม่มีเจ้าของ, M01:253) · C:130 · C/05:228-229 |
| 17 | บั๊กที่เจอระหว่างนับ | ชนิดแจ้งเตือนดิบ · ไอคอน `+` บนลิงก์กลับ · ทั้งแถวเป็นลิงก์ที่มี div หน้าตาปุ่ม · "ล้างตัวกรอง" ตอนไม่มีตัวกรอง · ฟอร์มกรองซ้ำ 2 ชุด · ตาราง storage เลื่อนไม่ได้ · โทนป้ายตายตัว · ปุ่มหัวหน้าต่ำกว่า 44 บนมือถือ | `D/notifications/page.tsx:127` · `D/audit/findings/page.tsx:195-200` + `master-data-layout.tsx:33` · `D/admin/approvals/page.tsx:229-251` · `D/maintenance/page.tsx:218-221` · `D/disposal/page.tsx:281-316` กับ `:389-402` · `D/admin/storage/page.tsx:97`, `:153`, `:248` · `D/master-data/employees/[id]/page.tsx:344-345` · 9 จุดใน M03 §B3 | 8 เรื่อง | M02 §8 · M03 §B3 · `docs/19_THAI_GLOSSARY.md:50` · DS:572 |
| 18 | guard และเอกสาร | R1 → `{}` · R7 เป็น budget รายไฟล์ แล้วเอาตัวกรองบรรทัด `<th` ออก · DS · `docs/14_UI_UX_DESIGN_SYSTEM.md` · `docs/99_CHANGELOG.md` · DH · `.impeccable/design.json` · wiki (ปิดข้อ 28) | VFG:226-254 · DS:284 (ถ้า Q3.1), :301, :335, :375, :459, :489, :493, :498, :500-510, :516, :534, :573 (M01 §14) | — | A:71 · VFG:201-202 · A:118 (I19) · AGENTS.md |

ขนาดรวมโดยประมาณ ~95 ไฟล์ (หน้า ~42 · component ~45 · primitive ใหม่ ~9) · ไม่มี schema, migration, API หรือ dependency ใหม่ · ข้อความใหม่ผ่าน `node scripts/messages-edit.mjs` (C:158)

### 1.1 ข้อที่สเปกตัดสินได้เองจากเอกสารที่มี (ไม่ต้องถามผู้ใช้)

- **R-a** `Segmented` ใช้ตัวที่ P0 ทำแล้ว ตาม API ของ I3 (C:57 K2, C:123) ไม่สร้างใหม่ตาม A/09:179 (M01 X4)
- **R-b** ความสูงปุ่ม: แปลงตาม A/04:201-227 · ปุ่มที่มีแค่ `min-h-11` → default 40 บนจอใหญ่ (K7, DS:375) · `h-8`/`h-9`/`h-10` คงความสูง · มือถือ ≥44 (DS:572) · คำว่า "ห้ามเปลี่ยนความสูงบนจอใหญ่" ใน A:63 ถูก K7 ทับแล้ว (M01 X3)
- **R-c** ปุ่ม "อนุมัติที่เลือก" (`audit-findings-batch-actions.tsx:86` `bg-success`) เป็น `default` · ปุ่มปฏิเสธเป็น `danger` · ไม่เพิ่ม variant `success` เพราะสีเขียวอยู่ได้แค่ในป้ายสถานะ (DS:258)
- **R-d** `StatStrip` ไม่มีพื้นสี (DS:258 "Do not use these colors as decorative fill", `MK/DIRECTION.md:18-19`) · pin `MetricCard` ที่ VFG:64, :90 แก้ตอนย้ายรายงาน
- **R-e** R7: plan 1 เปลี่ยน VFG:249-254 จากยอดรวม 44 เป็น budget รายไฟล์ (ตอนนี้ fill ใหม่ที่ไหนก็ผ่านถ้ายอดรวมยัง ≤44, M04 §5.2) · 2B แปลงหัวตาราง 6 จุดในไฟล์ที่ 2C ย้ายเสร็จแล้ว (`c/admin/system-settings-form.tsx:1269`, `:1973`, `:2006` · `c/assets/asset-batch-form.tsx:886`, `:979`, `:1037`) ระหว่างที่ยังไม่มี plan ของ 2C ทำงาน · 3 จุดในไฟล์ชุด 4 (`c/admin/role-permission-form.tsx:213`, `c/assets/asset-import-preview-panel.tsx:338`, `c/admin/IntegrationClientManager.tsx:547`) ค้างเป็น budget รายไฟล์ให้ 2C plan 4 หรือ 2D · ท้าย 2B เอาตัวกรอง `<th` (VFG:234, :242-246) ออก (M01 X6: เป็นงานของ 2B)
- **R-f** `toLocaleString()` 9 จุดในไฟล์ 2C: `c/admin/depreciation-policy-builder.tsx` 1 (ย้ายเสร็จแล้ว → 2B แก้พร้อมลบ `formatMoney` ประจำไฟล์ `:437`, A/08:167) · `IntegrationClientManager` 3 · `asset-import-preview-panel` 4 · `asset-label-batch-tool` 1 → ส่งต่อ 2C plan 4 (commit เดียวกับไฟล์) ถ้าไม่ทันให้ 2D
- **R-g** `TabNav` = `<nav>` + ลิงก์ `aria-current="page"` (ไม่ใช้ `role="tablist"`, M05 P3) · ตัวนับ `text-meta num` · ส่ง `scroll` ต่อได้ (`tests/audit-rounds-ux.test.ts:39`) · รับ `onSelect` ฝั่ง client ที่ `preventDefault` ได้ เพื่อให้ 2C ชุด 5 ย้ายแถวตั้งค่าที่ใช้ `replaceState` (`system-settings-form.tsx:754-756`, ตอนนี้เป็น `<button aria-pressed>` `:960`) โดย `tests/settings-tab-persistence-ui.test.ts:5-13` ยังผ่าน · สถานะในหน้าที่ไม่เปลี่ยน URL ใช้ `Segmented` (M03 §G) · ต้องดูต่างจาก `Steps` (C/07:119)
- **R-h** `PageHeader` เป็น server component · ปุ่มในหัว `Button size="md"` · ⋯ ก่อน ปุ่มหลักท้ายสุด (K8, DS:376) · `MasterDataHeader` เหลือเป็นตัวห่อบาง ๆ จนผู้เรียกตัวสุดท้ายย้าย (2B-3) แล้วลบใน 2B-5 · เปลี่ยนชื่อ `PageHeader` ประจำไฟล์ของ my-assets (M01:256)
- **R-i** แก้ `tests/breadcrumbs-ui.test.ts:41-42` ครั้งเดียวใน plan 1 ให้นับทั้ง `<Breadcrumbs` และ prop `breadcrumbs=` (คง 11 / 8) · ไม่ต้องแก้ทุก plan
- **R-j** `DataTable` ไม่มี hook (หน้ารายการเป็น server component) · แถวใช้ `group/row` + `focus-within` (A:117 I18 · พื้น ช1 ต้องตามโฟกัสไปถึง ⋯, M05 P6, P8) · เงาขอบคอลัมน์คำสั่ง `rgb(15_23_42/0.25)` (`asset-register-table.tsx:152`) ตัดออก เพราะต้นแบบไม่มี (M05 §3)
- **R-k** `Pagination` ตัวเดียว คง pin `tests/asset-register-building-blocks-ui.test.ts:8-17` (server · `<nav>` · `aria-disabled` · ไม่มี opacity) · เพิ่ม `aria-live` แบบ `c/maintenance/maintenance-pagination.tsx:26-27` · จำนวนต่อหน้า 25/50/100 · ทะเบียนคง 10/25/50/100 ใน sheet (DS:504)
- **R-l** ตัวกรอง server ทุกตัวเป็น `Field` + `NativeSelect`/`Input` `fieldSize="lg"` · `LabeledSelect` → `Field labelAction` + `fieldLabelClasses` (C/03:150, C:122 I2) · ช่องค้นหาทะเบียน → `SearchField onClear` โดยคง debounce 400ms, IME และ Enter (DS:502)
- **R-m** `RowActions` เป็น client component · ใส่ `data-no-row-click` (`clickable-table-row.tsx:27`) และกันคลิกของรายการที่กดไม่ได้ไม่ให้ทะลุแถว (A/04:248) · เปิด dialog ของ 2C ด้วย `ref.current?.open()` + `hideTrigger` + `returnFocusRef` ตามแบบ `c/assets/asset-detail-action-menu.tsx:43-49` (C/03:175) · ห้ามทำให้ `tests/dialog-trigger-handles.test.ts` พัง
- **R-n** ขอบเขต `Nil` ตาม A/08:214-226 (หน้าพิมพ์ ป้าย ประโยคแปล `src/lib` และ API คง `"-"`) · `formatCurrency` บนจอ → `formatMoney` · ตัว helper อยู่ถึง 2D (DS:516)
- **R-o** หน้ารายการและรายละเอียดเต็มกว้าง ไม่มี `max-w` · skeleton เลิก `max-w-7xl` ตาม (M03:12) · ไม่แตะ padding ของ `<main>` (`dashboard-shell.tsx:124`) เพราะแถบ `-mx-4 sm:-mx-6` 3 ตัวผูกอยู่ (VFG:109-115) · skeleton เป็นของ 2B (F:42)
- **R-p** `tag` อยู่บน `<span>` ด้านใน ห้ามตัวหนาหรือตั้งขนาดบน element เดียวกัน (VFG:187-193) · รหัสหลักของแถวใช้ `tag font-medium text-foreground` (DS:301)
- **R-q** ปุ่มสร้างแบบลอยของ users/roles เป็นของ 2D (VFG:268-269, C/08 ข้อ 8.10) → หัวหน้าสองหน้านี้ยังไม่มีปุ่มสร้างจนถึง 2D · แถบคำสั่งกลุ่มมือถือของทะเบียน (`asset-register-table.tsx:455`) อยู่ที่เดิม (เฟส 3 พร้อมงานพิมพ์ QR, F:45) และห้ามย้ายไปไฟล์ใหม่ (R2 budget 0 ของไฟล์ใหม่, M04 §6.3)
- **R-r** สีแถบความคืบหน้า (M05 C7) ไม่มีหน้าใดของ 2B ใช้ → ไม่ตัดสินใน 2B
- **R-s** เพิ่ม table, tabs, page-header, stat-strip, pagination, key-value, row-action ลง `.impeccable/design.json` (M05:27)

---

## 2. รั้ว: สิ่งที่ 2B ห้ามแตะ

| ห้ามแตะ | เจ้าของ | ที่มา | 2B ทำได้แค่ |
|---|---|---|---|
| chrome ของ `c/ui/sheet.tsx`, `dialog.tsx`, `accessible-dialog.tsx`, `alert-dialog.tsx`, `field.tsx`, `file-dropzone.tsx` | 2C | C/08:35 (กฎ 3) · C/08:51 (O10) | เนื้อใน `asset-register-row-actions.tsx:175-241` และ `asset-register-filter-sheet.tsx:90-180` |
| API ของ P0: `c/ui/segmented.tsx` · `Field labelAction` · handle เปิด dialog | ใช้ร่วม | C:57 (K2) · C:123 (I3) · C/08:49-50 | ใช้ตามที่มี · pin VFG:274-289 และ `tests/dialog-trigger-handles.test.ts` |
| dialog ในไฟล์ร่วม: `asset-register-table.tsx:697-774` · `disposal-bulk-approval.tsx:505-565` · `disposal-bulk-execution.tsx:812-986` + `SharedValueFields :999` · `ConfirmTextDialog` ที่ `audit-findings-batch-actions.tsx` เปิด · dialog อนุมัติ/ปฏิเสธ `audit-finding-review-actions.tsx` (:202, :345, :461) | 2C ชุด 4, 3, 3, 3, 1d | C/08:42, :45-46, :62 (O21) · เลขบรรทัดของ `5ffee76` | ส่วนรายการ: checkbox · ปุ่มใน toolbar · trigger ในแถว |
| แถวแท็บตั้งค่า `system-settings-form.tsx:948-967` (รั้วเขียน `:937-956`) | 2C ชุด 5 | C/08:48 (O7) | ส่ง `TabNav` ที่รองรับ (R-g) |
| `c/ui/mobile-action-bar.tsx` · `c/disposal/disposal-mobile-action-bar.tsx` · padding `D/assets/[id]/page.tsx:882`, `D/audit/rounds/[id]/page.tsx:408`, `D/maintenance/[id]/page.tsx:105`, `D/disposal/[id]/page.tsx:170` | 2C ชุด 5 | C/08:52 (O11) · C:143 (I23) | หัวหน้า และไอคอนของปุ่มกลับใน array `actions` (`D/audit/rounds/[id]/page.tsx:479`, `D/maintenance/[id]/page.tsx:147`; M03 §H) |
| component `DisposalWorkflowStepper` | 2C ชุด 5 | C/08:53 (O12) | วางตำแหน่ง `D/disposal/[id]/page.tsx:205-215` |
| `asset-import-preview-panel.tsx` ทั้งไฟล์ · `asset-evidence-drawer.tsx:102` · `ui/activity-drawer.tsx:72` · `notification-center-actions.tsx:119` · `asset-label-batch-tool.tsx`, `asset-label-print.tsx`, `asset-scan-search-tool.tsx` · `admin/IntegrationClientManager.tsx` · `admin/data-quality-rule-form.tsx` · `admin/asset-state-review-dialog.tsx` | 2C ชุด 4 | C/08:54-60 (O13, O14, O17, O19) · FMG:36 | ไม่แตะ · ยกเว้นลิงก์กลับที่หัว (O16) ของ `admin-user-form.tsx:115-121` และ `role-permission-form.tsx:128-134` ซึ่งต้องทำก่อน 2C plan 4 เริ่ม |
| `audit-scan-search.tsx:51` · `audit-scan-room-picker.tsx:75` · `global-search.tsx:133` | ไม่แตะ / เฟส 3 | C/08:61 (O20) | `master-data-layout.tsx:63` เป็นของ 2B |
| `tests/form-migration-guards.test.ts` | 2C | DH:384 · C:146 (I26) | ไม่แก้ไฟล์ · ไม่เปลี่ยนชื่อหรือย้ายไฟล์ใน `BATCH_FILES` (FMG:413-437) · ไม่มี `flex-col-reverse` ใน `ui/` ใหม่ (GD4 FMG:589-603) · dialog ใหม่ต้องมี footer (GD2 FMG:559-572) · `busy` อยู่ในไฟล์ `"use client"` และไม่ซ้ำกับ `disabled` (GB4 FMG:532-548) |
| formatter บนไฟล์ 2C (รวมฟอร์ม 12 ไฟล์ที่ O16 แก้) · regex ที่มี `\n` | — | DH:385 · C:302 | แก้ด้วยมือ |
| token `:root` / `@theme inline` / `@theme` · `tests/design-tokens-contrast.test.ts` | ไม่มีใคร | A:103 (I4) · A:120 (I21) | เขียนข้อนี้ลงทุก plan ของ 2B |
| deploy | ครั้งเดียวหลังเฟส 2 | DH:454 · WIKI:51 | `npm run verify` + production build + ตรวจบนแอป dev ทุก plan · จุดย้อนกลับ `ab1b873` |
| ฐานข้อมูลและ server | — | AGENTS.md | ห้ามคำสั่งที่ไม่ใช่ SELECT · ไม่มี migration, schema, API (Q4 ข้อ ก เพิ่มแค่ query นับแบบอ่านอย่างเดียวใน `page.tsx`) |
| ของ 2D: pill เขียนเอง ~35 จุด รวม `ActiveBadge` (`master-data-layout.tsx:195-201`) · ปุ่มลอย 2 จุด · ค่าตั้งต้นปุ่ม 36 · ลบ `ActionButton`, `getActionButtonClasses`, `getEmptyStateClasses` · กล่องแจ้ง ~80 / กล่องว่าง ~55 นอกรายการ · แผงฟอร์ม (K28, O15) · `linkVariants` ที่เหลือ · `formatCurrency` ในหน้าพิมพ์ · ตัด Plex Mono 600 · budget `{}` | 2D | A:60-70 (คอลัมน์ 2D) · C/08 ข้อ 8.10 · A/03:211 | เลิกใช้ `ActionButton` ในพื้นที่ของตัวเอง (`report-filter-panel.tsx:75`, `asset-state-review-workspace.tsx`) แต่ไม่ลบตัว component |
| เฟส 3: จัดหน้าใหม่ 7 หน้าจอของต้นแบบ · ชุดคอลัมน์ทะเบียน · แถบข้อเท็จจริงและปุ่มคัดลอก · ค้นหาบนมือถือและ Ctrl K · แยกป้าย "พร้อมใช้งาน" · ส่วนท้ายเมนูข้าง · เลือกหลายแถว/แถบคำสั่งกลุ่ม/หัวตารางติดบน (ไปกับงานพิมพ์ QR) · ไอเดียเมนูที่ยังไม่เลือก (จำกลุ่มที่เปิด, Enter ไปทะเบียน, หน้าแรกตามบทบาท, เมนูโปรด) | เฟส 3 / งาน QR | F:43 · F:45 · F:304 · C/08 ข้อ 8.10 · WIKI:52 | 2B สร้าง primitive ตามสูตรต้นแบบ แล้ววางในหน้าเดิม ไม่จัดหน้าใหม่ (M05:23) |

---

## 3. แบ่งเป็น plan

หลักเดียวกับ 2C: plan 1 = primitive + ชุดแรก · งานย้ายไฟล์ ไฟล์ละ 1 commit · ทุก plan เริ่มด้วยงาน 0 นับใหม่ที่ HEAD (A:130, C:181; สคริปต์ `p2b-map/count01.mjs`, `02-work/`, `scripts04/`) และจบด้วย `npm run verify` + production build + ตรวจบนแอป dev + เอกสารและ wiki · ไม่ deploy

ลำดับที่เสนอ (สายท่อ · ต้องให้ผู้ใช้ยืนยัน Q7):

```
2B-1 ──▶ 2B-2 ──▶ 2B-3 ──▶ 2B-4 ──▶ 2B-5
            │        │        │
            └▶ 2C-3 ─┴▶ 2C-4 ─┴▶ 2C-5 ──▶ 2D (หลัง 2B-5 และ 2C-5)
```

- 2C plan N เริ่มเมื่อ (ก) plan ของ 2B ที่ทำไฟล์ร่วมของมันเสร็จ merge แล้ว และ (ข) 2C plan ก่อนหน้า merge แล้ว
- คู่ที่ทำพร้อมกัน (2B-3 ∥ 2C-3, 2B-4 ∥ 2C-4, 2B-5 ∥ 2C-4/2C-5) ไม่มีไฟล์ร่วม ยกเว้น `DESIGN.md` และ VFG (ตรวจรายไฟล์แล้ว: 2B-5 แตะ `asset-state-review-workspace.tsx`, `report-filter-panel.tsx`, `D/notifications/page.tsx`, `D/admin/integrations/page.tsx` ส่วน 2C-4 แตะ `asset-state-review-dialog.tsx`, `report-preset-controls.tsx`, `notification-center-actions.tsx`, `IntegrationClientManager.tsx`)
- ถ้าผู้ใช้ไม่เลือกสายท่อ: 5 plan เดิม merge ตามลำดับ แล้ว 2C plan 3 → 4 → 5 ตาม I28 ตรงตัวอักษร

| plan | เนื้องาน | ไฟล์ | ขนาด | รอ / ปลดล็อก | R7 |
|---|---|---|---|---|---|
| **2B-1** primitive + ข้อมูลหลัก + เมนูข้าง | (0) นับใหม่ · (1) เมนูข้างตาม Q1 + test ใหม่ + DS:489 · (2–10) `ui/page-header.tsx` · `ui/data-table.tsx` (+ `TableEmptyRow`, หัวเรียงลำดับ `aria-sort`) · ขยาย `ui/pagination.tsx` · `ui/filter-select.tsx` + ชิปตัวกรอง · `ui/row-actions.tsx` · `ui/tab-nav.tsx` · `ui/stat-strip.tsx` · `ui/key-value-list.tsx` · หัวแผงและแถวคั่นของ `ContentPanel` · `ClickableTableRow` `group/row` · (11) ไส้ใน `MasterDataSearch` → `SearchField` (O20, ผู้เรียก 6 จุด) · (12–20) branches, brands, categories, companies, departments, employees, locations, suppliers (+ `supplier-list-view.tsx`), admin/users · (21) ปุ่มกลับที่หัว 15 จุด + "ยกเลิก" 3 จุด (O16 · ทำตอนนี้เพราะ 2 ไฟล์อยู่ชุด 4 และฟอร์มข้อมูลหลักรับ `returnTo` จากหน้ารายการชุดนี้) · (22) หัวตาราง 6 จุดในไฟล์ 2C ที่ย้ายแล้ว + R7 รายไฟล์ + test breadcrumbs (R-i) · (23) verify + ตรวจบนแอป · (24) เอกสาร | primitive ใหม่ ~9 · หน้า 10 · ฟอร์มและหน้า new 15 · sidebar | `MasterDataHeader` 8 · `FilterSelect` 24 · หัวเรียงลำดับ 42 · แบ่งหน้า 8 ตัว · `SummaryTile` ~28 · แถวว่าง 8 · `toLocaleString()` 23 · แก้ไข/ลบในแถว 8 หน้า · ปุ่มกลับ 18 | ไม่รอ (2C plan 2 merge แล้ว, DH:475) | 44 → 29 |
| **2B-2** รายการงาน: ตัดจำหน่าย ตรวจนับ ซ่อมบำรุง | `D/disposal/page.tsx` (แท็บขั้น → `TabNav`, ฟอร์มกรองซ้ำ → ชุดเดียว, `RowActions` + handle `:426-427`) · `disposal-pagination.tsx` · ส่วนรายการของ `disposal-bulk-approval.tsx` / `disposal-bulk-execution.tsx` (checkbox 4, ปุ่ม toolbar `:423`, `:644`, `busy` `:424`) · `D/disposal/batches` · `D/disposal/batches/[id]` (หัว, `BatchMetric`, `BatchInfo`, `pb-24`) · `D/audit/findings` (หัวแทน `MasterDataHeader`, `ResolutionMetric` → `StatStrip`, ลิงก์ → `TabNav`, ตาราง 13 คอลัมน์) · `audit-findings-batch-actions.tsx` (checkbox `:109`, ปุ่ม `:86`, `:95`, spinner `:88`, `:97`) · trigger `audit-finding-review-actions.tsx:113`, `:123` · `D/audit/rounds` (`QuickFilterBar` → `TabNav`, R1 → 0) · `D/audit/rounds/[id]` (หัวและส่วนรายการ ไม่แตะแถบล่าง) · `D/audit/rounds/[id]/pending` (`RowActions` + handle) · `D/maintenance` + `maintenance-pagination.tsx` · `D/maintenance/pm` | ~15 | หน้า 9 · checkbox 5 · แบ่งหน้า 3 ตัว · แถวว่าง 5 · R1 1 · spinner 3 · trigger 2 | รอ 2B-1 · **ปลด 2C plan 3** (bulk ×2, `audit-findings-batch-actions.tsx`, ฟอร์มรอบตรวจนับ; C:207, DH:443) | 29 → 18 |
| **2B-3** ทะเบียนทรัพย์สิน | `D/assets/page.tsx` (หัว `compactOnMobile`, ตัวนับ → `formatCount`) · `asset-register-table.tsx` (DataTable โดยคงสัญญา DS:500-510, checkbox 2, แถวว่าง, `Nil` `:644`, `formatMoney` `:660`, `tag` `:625`, `Pagination` `:683`, เงา `:152`) · `asset-register-row-actions.tsx` → `RowActions` + เนื้อใน sheet · `asset-register-mobile-list.tsx` · toolbar · search field · filter sheet (`LabeledSelect` ×7, `busy` `:176`) · status tabs → `TabNav` · filter chips · trigger ของ sort, column, export · หัวหน้า `D/asset-management/import-export/page.tsx:32-35` | ~13 | O1 ทั้งหมด · checkbox 3 · pin ~40 บรรทัด (ข้อ 5.1) · หัวทะเบียนเป็น `bg-muted` ทึบ จึงไม่นับใน R7 | รอ 2B-2 · **ปลด 2C plan 4** (`asset-register-table.tsx:697-774`, `assets/page.tsx:451`, `import-export/page.tsx:82`; C:208, C/07:516, C/07:588) | 18 |
| **2B-4** หน้ารายละเอียดและ skeleton | `D/assets/[id]` (หัว, ป้ายใน meta, ปุ่มกลับ, `asset-detail-tabs.tsx` → `TabNav`, 2 ตาราง, `Info` → `KeyValueList`) · `D/maintenance/[id]` (ไอคอน Wrench `:138`, `:147`) · `D/disposal/[id]` (ปุ่มกลับบนมือถือ `:186`, วางตำแหน่ง stepper) · `D/master-data/employees/[id]` · `D/master-data/suppliers/[id]` (+ `supplier-purchase-documents.tsx`, 0.00 `:240`, `:289`) · `D/my-assets/[id]` · `pb-24` ซ้อน 3 หน้า · `page-skeleton.tsx` + `loading.tsx` | ~10 | หน้า 6 · `KeyValueList` 8 ตัว · `pb-24` 3 · skeleton 5 ตัว | รอ 2B-3 · **ปลด 2C plan 5** (4 หน้า O11 ต้องมีหัวหน้าใหม่ก่อน · O7 ใช้ `TabNav` จาก 2B-1; C:209, DH:445) | 18 → 12 |
| **2B-5** หน้าที่เหลือ + ล็อก | admin: roles, logs, storage, approvals, approvals/history, integrations (หัว), data-quality (+ `asset-state-review-workspace.tsx` O3), readiness · `D/notifications` · `D/my-assets` · รายงาน (`report-header`, `report-filter-panel` + `ReportSelect` ×6, `report-active-filters`, `report-view-tabs`, `responsive-report-list`, `MetricCard` 14 จุด) · `D/dashboard` · `D/work-center` (สลับมุมมอง → `Segmented`) · `depreciation-policy-builder.tsx` (R-f) · ลบ `MasterDataHeader`, `MasterDataPagination`, `SortableColumnHeader` · ล็อก R7 (R-e) · เอกสารรวม | ~22 | หน้า 13 · `toLocaleString()` 9 · `StatStrip` ~20 | รอ 2B-4 · ทำคู่กับ 2C plan 4/5 (ห้ามแตะ 4 หน้า O11 และ `system-settings-form.tsx`) | 12 → 3 (budget รายไฟล์ของชุด 4) |

ยอด R7: 15 + 11 + 0 + 6 + 9 = 41 · เหลือ 3 → 44 (ตรงกับ M04 §5.2)

**เมนูข้างอยู่ที่ 2B-1 งานที่ 1:** ไฟล์เดียว ไม่พึ่ง primitive ไม่ชนใคร และเป็นเรื่องที่พนักงานขอ (WIKI:52) · test ที่อ่าน `sidebar.tsx` ยึด class, `myAssets`, integrations และ Sheet ไม่ยึดโครงกลุ่ม (M01:157) · ต้องเพิ่ม test ยึด "รายการแรกของ `sectionAssets` คือ `/assets`" และ "ลึกไม่เกิน 2 ชั้น"

**ทำไม 2B-1 เป็นข้อมูลหลัก ไม่ใช่หน้าที่ปลด 2C:** 7 หน้าใช้แม่แบบเดียวกัน (M02 §3.2–3.8) จึงลอง API ของ primitive ได้ครบ (หัว ตัวกรอง ตาราง เรียงลำดับ แบ่งหน้า กล่องตัวเลข แถวว่าง ปุ่มในแถว) โดยไม่ชนไฟล์ของ 2C เลย · ช่วง 2B-1 ไม่มี plan ของ 2C ทำงาน จึงเป็นช่วงเดียวที่แตะ `system-settings-form.tsx` และ `asset-batch-form.tsx` (R-e) ได้โดยไม่ต้อง rebase

---

## 4. เรื่องที่ผู้ใช้ต้องตัดสิน (เรียงตามผลกระทบ)

### Q1 เมนูข้าง: รายการที่เหลือของ "ทะเบียน" และกลุ่ม "ธุรกรรม" อยู่ที่ไหน

ตอนนี้: ทรัพย์สิน › จัดการทรัพย์สิน › {ทะเบียน › 5 รายการ, ธุรกรรม › 4 รายการ} (`sidebar.tsx:118-144`) · ผู้ใช้เลือกแล้วว่า "ทะเบียนทรัพย์สิน" เป็นรายการแรกและเมนูลึกไม่เกิน 2 ชั้น (WIKI:52) แต่ยังไม่ได้บอกที่อยู่ของอีก 8 รายการ

- **ก.** ทะเบียนทรัพย์สิน · จัดการทรัพย์สิน ▸ (เพิ่มทรัพย์สิน, สแกนค้นหา, พิมพ์ป้าย QR, นำเข้า/ส่งออก) · ธุรกรรม ▸ (ส่งมอบ, รับคืน, โอนย้าย, ย้ายหลายรายการ) · ตรวจนับ ▸ · ซ่อมบำรุง · ตัดจำหน่าย — พนักงาน: ทะเบียน 1 คลิก · ส่งมอบ/รับคืน 2 คลิก (จากเดิม 3) · กลุ่มละ 4 รายการ
- **ข.** ทะเบียนทรัพย์สิน · จัดการทรัพย์สิน ▸ (8 รายการรวมธุรกรรม) · … — กลุ่มเดียวยาว 8 รายการ ต้องไล่หา
- **ค.** คง "ธุรกรรม" ซ้อนใต้ "จัดการทรัพย์สิน" — เปลี่ยนน้อยสุด แต่ขัดกับ "ไม่เกิน 2 ชั้น" ที่ผู้ใช้เลือกไว้
- **แนะนำ ก** · ลบ key `nav.assetRegistryGroup` (`messages/th.json:128`) · ใช้ไอคอนที่ไม่ซ้ำกัน (ตอนนี้ `Package` ซ้ำ 3 ที่ `sidebar.tsx:120`, `:124`, `:126` และแถบย่อแสดงแค่ไอคอน, M03:11) · รายการที่ active ยังถูกต้อง เพราะเลือก href ที่ยาวที่สุด (M01:157)

### Q2 ปุ่มกลับบนหน้าที่มีเส้นทางนำทาง (D10)

D10 ไม่มีนิยามใน repo (M01:251) · DS:573 ยอมให้ลิงก์เส้นทางนำทางสูง 20px บนมือถือ เพราะ "the page keeps its back button" · ปุ่มกลับพา `returnTo` (ตัวกรองและหน้าที่ดูอยู่) กลับไปด้วย (`D/assets/[id]/page.tsx:919-926`, `tests/asset-return-navigation.test.ts:46`, `tests/master-data-return-navigation.test.ts:33-66`) · ต้นแบบมีปุ่มกลับเฉพาะแถบบนของมือถือ (`MK/screens/mobile.html:155`) จอใหญ่ใช้เส้นทางนำทางอย่างเดียว (`MK/screens/asset-detail.html:65`)

- **ก.** คงปุ่มกลับทุกหน้าที่มีอยู่และทำเป็นแบบเดียว: `outline` + ลูกศรซ้าย · บนมือถือเป็นปุ่มไอคอน 44px (แบบ `assets/[id]`) · แก้ไอคอนผิด 3 จุด (Wrench `D/maintenance/[id]/page.tsx:138`, Download `D/audit/rounds/[id]/page.tsx:479`, FileCheck2 `D/admin/approvals/history/page.tsx:83`) · เพิ่มปุ่มกลับบนมือถือของ `D/disposal/[id]/page.tsx:186` · "ยกเลิก" ที่หัว 3 หน้า maintenance เป็นปุ่มกลับแบบเดียวกัน — พนักงาน: ปุ่มอยู่ที่เดิม หน้าตาเหมือนกันทุกหน้า
- **ข.** ตามต้นแบบ: ปุ่มกลับเฉพาะจอเล็กกว่า md · จอใหญ่ใช้เส้นทางนำทาง — พนักงานบนคอมเสียปุ่มที่ใช้อยู่ · เส้นทางนำทางทุกหน้าต้องพา `returnTo` (ตอนนี้ทำแค่ asset detail `:888`) · ฟอร์ม `[id]/edit` ไม่มีเส้นทางนำทาง (M03 §C) จึงยังต้องมีปุ่มกลับ
- **ค.** เอาปุ่มกลับออกทุกขนาดจอบนหน้าที่มีเส้นทางนำทาง — ข้อยกเว้นของ DS:573 ใช้ไม่ได้ ต้องขยายลิงก์เป็น 44px บนมือถือ
- **แนะนำ ก** (ข เป็นการจัดหน้าใหม่ ไปเฟส 3 ได้) · ฟอร์ม 6 ตัวที่ไม่มีปุ่มกลับ (M03:139) คงเดิม

### Q3 หน้าตาหน้ารายการ: ตามต้นแบบที่อนุมัติ หรือคงค่าปัจจุบัน

เลือกแยกได้ทีละข้อ:

1. **น้ำหนักหัวเรื่อง:** ต้นแบบ 600 (`MK/base.css:142`) · ตอนนี้ 700 (DS:284 และ h1 `font-bold` 39 จุด, M05:25) — 600 ดูเบาลง · **แนะนำ 600** และแก้ DS:284
2. **หัวตาราง:** ต้นแบบพื้นขาว ตัว 13px น้ำหนัก 500 สีจาง ไม่ใช้ตัวพิมพ์ใหญ่ มุม 12px (`MK/base.css:309-311`) · ตอนนี้พื้นเทาโปร่ง `bg-muted/40` 34 ตาราง ตัว 12px หนา uppercase มุม 8px (`asset-register-table.tsx:154`, `src/lib/design-system.ts:55-57`, DS:432) — ตารางดูโล่งขึ้น หัวตารางเด่นน้อยลง · **แนะนำตามต้นแบบ**
3. **ความสูงแถว:** ต้นแบบประมาณ 46px (`p-3` + บรรทัด 22px, `MK/base.css:312`) · ทะเบียนตอนนี้ประมาณ 36px (`px-3 py-2`, `asset-register-table.tsx:153`) — ทะเบียนจะเห็นแถวต่อจอน้อยลงราว 1 ใน 5 · **แนะนำ** ตามต้นแบบทุกตาราง ยกเว้นทะเบียนที่คงความแน่นเดิมจนจัดหน้าใหม่ในเฟส 3
4. **แถบเครื่องมือ:** ต้นแบบไม่มีกรอบ ช่องและปุ่มสูง 36 (`MK/base.css:250-251`) · ทะเบียนตอนนี้เป็นการ์ดตั้งแต่ md และช่องสูง 40 (`asset-register-toolbar.tsx:31`, `:36`; DS:502) — **แนะนำตามต้นแบบ** บนจอใหญ่ · มือถือคงแถบติดบนและ 44
5. **แท็บบนมือถือ:** ต้นแบบเป็นเส้นใต้ทุกขนาดจอ (`MK/base.css:236-243`) · ทะเบียนตอนนี้เป็น pill ต่ำกว่า md (`asset-register-status-tabs.tsx:23-26`) — **แนะนำเส้นใต้ + เป้ากด 44** (TabNav ตัวเดียว) · ถ้าไม่อยากให้หน้าที่ใช้ตรวจนับในพื้นที่เปลี่ยน ให้คง pill

ตัดสินแล้วตามกฎเดิม แต่พนักงานจะเห็น (แจ้งผู้ใช้ ไม่ต้องเลือก):
- กล่องตัวเลขสรุปไม่มีพื้นสี และรวมเป็นแถบเดียว (DS:258 · `MK/DIRECTION.md:18-19`)
- ปุ่ม "อนุมัติที่เลือก" เปลี่ยนจากเขียวเป็นสีหลัก (DS:258 · `audit-findings-batch-actions.tsx:86`)
- เงินในตาราง "฿1,234.00" เป็น "1,234.00" และหัวคอลัมน์เป็น "มูลค่า (บาท)" (A/08:211 · DS:515)
- ค่าว่างเป็น "—" และเลข 0 ที่ `|| "-"` เคยซ่อนจะแสดงเป็น 0 (DS:514)
- ปุ่มที่สูง 44 บนคอมเหลือ 40 · มือถือยัง 44 (K7, DS:375)
- ชนิดของแจ้งเตือนแสดงเป็นคำไทยแทน `warning` (`D/notifications/page.tsx:127` · `docs/19_THAI_GLOSSARY.md:50`)
- รหัสเป็นตัว monospace และคลิกครั้งเดียวเลือกทั้งรหัส (DS:301)

### Q4 รายการที่ตัดจำนวนโดยไม่บอก และรายการที่ไม่แบ่งหน้า

ตัดเงียบ: บันทึกระบบ 100 (`D/admin/logs/page.tsx:42`) · ประวัติการอนุมัติ 150 (`D/admin/approvals/history/page.tsx:52`) · รายการไม่ตรง 200 (`D/audit/findings/page.tsx:82`) · รายการค้างของรอบ 200 (`D/audit/rounds/[id]/pending/page.tsx:81`) · ชุดตัดจำหน่าย 100 (`D/disposal/batches/page.tsx:24`) · PM 500 (`D/maintenance/pm/page.tsx:34`) · หน้ารายการไม่ตรงนับยอดเต็มในกล่องตัวเลข (`:90-93`) แต่ตารางแสดงสูงสุด 200 แถวโดยไม่บอก · ไม่จำกัดและไม่แบ่งหน้า: `D/audit/rounds/page.tsx:88-110`, `D/master-data/departments/page.tsx:31-55`, `D/my-assets/page.tsx:62-67` (M02 §8 ข้อ 2–3)

- **ก.** บอกความจริง: เมื่อถึงเพดาน ท้ายตารางเขียน "แสดง 200 รายการล่าสุดจาก N รายการ · ใช้ตัวกรองเพื่อหารายการที่เหลือ" (เพิ่ม query นับแบบอ่านอย่างเดียวใน 6 หน้า) · รายการที่ไม่จำกัดคงเดิม เพราะจำนวนน้อย
- **ข.** แบ่งหน้าจริงทั้ง 9 รายการด้วย `Pagination` (แก้ query ของหน้า และ `returnTo` ต้องพาเลขหน้า) — งานใหญ่ขึ้น
- **ค.** คงเดิม ไปเฟส 3
- **แนะนำ ก** — ผู้ตรวจนับจะไม่เข้าใจผิดว่ารายการไม่ตรงมีแค่ 200 · ไม่เปลี่ยน schema · ถ้าเลือก ก หรือ ข ต้องบันทึกในสเปกว่า 2B แก้ query ฝั่ง server ของหน้า

### Q5 ปุ่มแก้ไขและลบในแถวข้อมูลหลัก (D13)

D13 ไม่มีนิยามใน repo (M01:251) · ตอนนี้ไอคอนแก้ไข 32px อยู่ข้างปุ่มลบ 44px ใน 7 หน้า (`D/master-data/branches/page.tsx:259-269`, `c/master-data/master-data-delete-button.tsx:18`) และคลิกทั้งแถวก็ไปหน้าแก้ไขอยู่แล้ว (M02 §3.2–3.8)

- **ก.** คงสองปุ่มในแถว ขนาดเท่ากัน (32 บนคอม · 44 บนมือถือ) · ปุ่มลบสีกลาง `outline` (K22, DS:377) — เปลี่ยนน้อยที่สุด
- **ข.** แบบ ช1 เหมือนทะเบียน: ปุ่ม "แก้ไข" 120×32 + ⋯ ที่มี "ลบ" (และลิงก์อื่นในแถว เช่นของ categories `:314-338`) — ลบต้องกด 2 ครั้ง ลดการลบพลาด · ทุกรายการใช้แบบเดียว (DS:507)
- **ค.** เอาปุ่มลบออกจากรายการ ลบได้ที่หน้าแก้ไขเท่านั้น — ต้องย้าย `MasterDataDeleteButton` ไปหน้าแก้ไข 8 หน้า
- **แนะนำ ข**

### Q6 ตารางบนมือถือของหน้าที่ยังเลื่อนแนวนอน

10 หน้าไม่มีรายการแบบมือถือ: ข้อมูลหลัก 7 หน้า, users, roles, logs (M02:110)

- **ก.** คงเลื่อนแนวนอน + ตัวบอกว่าเลื่อนได้ (2B แค่เปลี่ยน primitive) — ผู้ดูแลระบบส่วนใหญ่ใช้คอม
- **ข.** เพิ่มรายการแบบแถวบนมือถือ (DS:509) ใน 2B — ขอบเขตโตขึ้นราว 10 หน้า
- **แนะนำ ก** · ทำ ข ในเฟส 3 หรือเมื่อมีคนขอ

### Q7 ลำดับงาน: ให้ 2C plan 3–5 เริ่มทีละชุดเมื่อ plan ของ 2B ที่เกี่ยวข้อง merge

I28 (C:148) ให้ plan 3–5 เริ่ม "หลัง 2B merge" เพราะชุด 3–4 แก้ไฟล์ที่ 2B ปรับโครง · เมื่อ 2B แบ่งเป็น 5 plan เหตุผลนี้จบเป็นช่วง ๆ

- **ก.** สายท่อตามข้อ 3: 2B-2 → 2C-3 · 2B-3 → 2C-4 · 2B-4 → 2C-5 · ทำคู่กันใน worktree แยก — เฟส 2 เสร็จเร็วขึ้นราว 3 plan · session หลักต้องรีวิวสองสายพร้อมกัน
- **ข.** ตามตัวอักษร: 2B ครบ 5 plan ก่อน แล้วจึง 2C 3 → 4 → 5
- พนักงานไม่เห็นความต่าง เพราะ deploy ครั้งเดียว (DH:454) · **แนะนำ ก**

---

## 5. ความเสี่ยง

### 5.1 test ที่จะพังโดยตั้งใจ (แก้ใน commit ที่ทำให้พัง)

| plan | test:บรรทัด | ยึดอะไร |
|---|---|---|
| 2B-1 | `tests/breadcrumbs-ui.test.ts:41-42` | 11 จุด / `code: true` 8 จุด (R-i) |
| 2B-1 | `tests/supplier-adaptive-ui.test.ts:12-24`, `:46-54`, `:58` | ตารางและรายการมือถือของ supplier · ลิงก์สร้าง `min-h-11` ใน `master-data-layout.tsx` |
| 2B-1 | `tests/master-data-brand-supplier-ui.test.ts:9`, `:22`, `:40`, `:44` · `tests/master-data-workspace.test.ts:13-23` | ลิงก์ส่งออกใน `actions` · grid ยี่ห้อ · class ลิงก์ · ไม่มี workspace strip |
| 2B-1 | `tests/operational-return-navigation.test.ts:69`, `:83` | prop `hiddenInputs` ของ `MasterDataSearch` (คง API) |
| 2B-1 | `tests/master-data-return-navigation.test.ts:33-66` · `tests/asset-return-navigation.test.ts:46` | `returnTo` และ `backHref={returnToHref}` (ต้องผ่านต่อ) |
| 2B-1 | `tests/disposal-route-structure.test.ts:33` · `tests/supplier-form-ui.test.ts:34` | ปุ่มกลับ (`ArrowLeft`) |
| 2B-1 | `tests/asset-register-building-blocks-ui.test.ts:8-17`, `:42-47` · `tests/clickable-table-row-navigation.test.ts:12-17` | `Pagination` แบบ server · `onNavigate` และตัวกันยกเลิก |
| 2B-1 | VFG:249-254 | R7 เป็นรายไฟล์ |
| 2B-2 | `tests/audit-rounds-ux.test.ts:10-12`, `:27`, `:38-39` · VFG:226-231 | `QuickFilterBar` ตามชื่อ + `scroll={false}` · R1 → `{}` |
| 2B-2 | `tests/disposal-bulk-approval.test.ts:92` · `tests/disposal-bulk-execution-ui.test.ts:33` | `min-h-11 min-w-11` (O4) · `:31` เป็นของ 2C plan 3 และ `:120` ต้องผ่านต่อ |
| 2B-2 | `tests/disposal-queue-ux.test.ts:17-23`, `:37`, `:52` · `tests/disposal-route-structure.test.ts:18-21`, `:107` | `<details`, `sticky right-0`, `data-no-row-click`, `DisposalPagination` |
| 2B-2 | `tests/audit-pending-mobile-ux.test.ts:19-20`, `:23`, `:30-31` · `tests/audit-round-result-drilldown.test.ts:138` · `tests/maintenance-pagination-ui.test.ts:7-18` | class ตาราง/มือถือ · ชื่อตัวแบ่งหน้าเฉพาะ · `[25, 50, 100]` |
| 2B-2 | `tests/repair-record-list-ui.test.ts:27` · `tests/maintenance-contrast.test.ts:15-17` · `tests/html-lang-and-years.test.ts:15` | ลิงก์ `min-h-11` · สีตัวอักษร · ข้อความหัวข้อ |
| 2B-3 | `tests/asset-register-table-ui.test.ts:16-25`, `:32`, `:56`, `:81-86`, `:100`, `:112-116`, `:148-161`, `:171-173`, `:190-200` | row actions · ตาราง · checkbox `size-5` (O1) · แถบคำสั่งกลุ่ม |
| 2B-3 | `tests/asset-register-ux.test.ts:79-81`, `:99`, `:106-110`, `:123`, `:161`, `:172`, `:174` | `group-focus` → `focus-within` · `focus-visible:ring-inset` |
| 2B-3 | `tests/asset-register-filter-ui.test.ts:36-83`, `:107-119` | toolbar · sheet · แท็บ · ชิป · `MasterDataHeader compactOnMobile` |
| 2B-3 | `tests/asset-register-search-ui.test.ts:23-25` · `tests/dropdown-menus-ui.test.ts:29-38` · `tests/asset-status-help-ui.test.ts:37-51` · `tests/modern-enterprise-theme.test.ts:64-67` · `tests/asset-register-view-model.test.ts:162-166` · `tests/sheet-drawers-ui.test.ts:28` · VFG:109-115, :143-148 | ค้นหา · เมนู ⋯ `unavailable` · popover ช่วยเหลือ · ป้าย · ความกว้างคอลัมน์ · `SheetFooter` · แถบเต็มขอบ · แท็บสถานะ |
| 2B-4 | `tests/asset-detail-ux.test.ts:27`, `:32`, `:39`, `:95`, `:102-111`, `:150-152` · `tests/asset-detail-tabs.test.ts:14-20` | ปุ่มกลับ · `\|\| "-"` (A:219) · แท็บ |
| 2B-4 | `tests/disposal-detail-workspace.test.ts:30-37`, `:44` | ปุ่มกลับ (`:35`, `:42-48` เป็นของ 2C ชุด 5) |
| 2B-4 | `tests/page-loading-skeleton.test.ts:16-32` · `tests/loading-boundaries.test.ts:9-31` | export และลำดับของ skeleton |
| 2B-5 | `tests/report-controls-ui.test.ts:9-10`, `:16` · `tests/reports-adaptive-ui.test.ts:24-26`, `:84-99`, `:143` | แท็บรายงาน · `ResponsiveReportList` |
| 2B-5 | VFG:64, :90 · `tests/design-system.test.ts:44-45` | class ของ `MetricCard` · `getTableShellClasses` / `getEmptyStateClasses` |
| 2B-5 | `tests/storage-archive-ui.test.ts:16-28` · `tests/visual-consistency-ui.test.ts:23-42` · `tests/my-assets-route-ui.test.ts:27-33` | หัวคอลัมน์ storage · ป้ายของ my-assets · ลิงก์รายละเอียด |
| ทุก plan | `tests/feedback-states-ui.test.ts:105-124` · `tests/status-badge.test.ts:26-89` · `tests/display-format.test.ts:48-58` · `tests/field-primitives.test.ts:99`, `:144-146` | ถ้าปรับ API ของ 2A (ปรับได้ถึง 2D, A:362) |

### 5.2 ไฟล์ร่วมกับ 2C และกับดักของ guard

- ไฟล์ที่ทั้งสองฝ่ายแก้: `asset-register-table.tsx`, `disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx`, `audit-findings-batch-actions.tsx`, VFG, `DESIGN.md` (C/08:64) · ในสายท่อ 2B ทำส่วนของตัวเองในไฟล์เหล่านี้เสร็จก่อนปลด 2C · เหลือแค่ `DESIGN.md` และ VFG ที่ต้อง rebase
- budget ใน FMG ที่ยังมีส่วนของ 2B (GF7 FMG:282, :283, :285, :293 · GB1 :307, :314, :318 · GL1 :351) เป็นค่าสูงสุด 2B ลดได้โดยไม่แก้ไฟล์ · comment ของ GB1 :307 ยังอ้าง `:102, :112` ซึ่งตอนนี้คือ `:113`, `:123` (M04 §6.2)
- กับดัก: เปลี่ยนชื่อหรือย้ายไฟล์ชุด 2C (FMG:413-437) · ย้ายแถบคำสั่งกลุ่มไปไฟล์ใหม่ (หลบ GL1 แต่ชน R2 budget 0) · `flex-col-reverse` ใน `ui/` ใหม่ (GD4) · `busy` นอกไฟล์ `"use client"` หรือซ้ำกับ `disabled` (GB4) · route รายการใหม่ต้องเป็นโหมด navigation (GL2 FMG:660-672)
- O16: 12 ใน 15 ไฟล์เป็นฟอร์มที่ 2C ย้ายแล้ว ห้ามรัน formatter (DH:385) · `c/master-data/supplier-form.tsx:155-162` ต้องคง `onClick={confirmNavigation}`
- เลขบรรทัดในรั้วของ 2C เป็นของ `5ffee76` และบางจุดเลื่อนแล้ว (O7 → `:948-967`, M03:10) · งาน 0 ทุก plan ต้องนับใหม่

### 5.3 หน้าที่ข้อมูลเยอะ

- ทะเบียน: สัญญา DS:508 (พอดี 1440 ไม่เลื่อน) · preset operations 1094 ≤ 1117 (`tests/asset-register-view-model.test.ts:162-166`) · ขอบซ้ายขวา 20px ของต้นแบบเพิ่ม 16px → 1110 เกือบชนเพดาน · `tag` แบบ `nowrap` อาจดันคอลัมน์รหัส 172px (`src/lib/asset-register-columns.ts:59`) · คอลัมน์สถานะ 132 / สภาพ 96 อาจตัดคำ (A:239) → ตรวจที่ 1440 และ 1366 ทุก preset
- ความสูงแถวตามต้นแบบ (Q3.3) ลดจำนวนแถวต่อจอในหน้าที่คนดูทีละมาก
- findings ตาราง 13 คอลัมน์ × 200 แถว · rounds ไม่จำกัด · storage 3 ตารางอยู่ใน `overflow-hidden` จึงเลื่อนไม่ได้ (`D/admin/storage/page.tsx:97`) — shell ของ DataTable ต้อง `overflow-x-auto` · logs มีตารางซ้อนใน `<details>` (`D/admin/logs/page.tsx:137-154`)
- DataTable ต้องใช้ได้ใน server component · ถ้ามี hook หน้ารายการทั้งหมดต้องกลายเป็น client · `RowActions` และโหมดเลือกหลายแถวเป็น client
- `StatStrip` ตามต้นแบบใช้ `grid-rows-subgrid` (M05 P13) ซึ่งต้องการ Chrome 117+ / Safari 16+ · เครื่องเก่าต้องได้ grid ธรรมดาที่ยังอ่านได้ (2C ยอมเรื่อง `:has()` แบบเดียวกัน, C/07:590)
- ถ้าเลือก Q4 ก หรือ ข: มี query นับเพิ่มต่อหน้า · ตรวจบน `asset_management_dev` เท่านั้น

### 5.4 มือถือ

- แถบเต็มขอบ 3 ตัวใช้ `-mx-4 sm:-mx-6` ซึ่งผูกกับ padding ของ `<main>` (`asset-register-toolbar.tsx:36`, `asset-register-status-tabs.tsx:15`, `asset-detail-tabs.tsx:55`; VFG:109-115)
- ลบ `pb-24` ซ้อน 4 หน้า โดยคงโหมด navigation (`tests/mobile-field-navigation.test.ts:24`, `:31`, `:32`) · shell เผื่อ 5.25rem ไว้แล้ว (`dashboard-shell.tsx:128`)
- breakpoint ไม่ตรงกัน: เมนูข้าง แถบล่าง และ padding ของ shell สลับที่ lg · แถบปุ่มล่างสลับที่ md (M03 §E3) · ช่วง 768–1023px ต้องตรวจทุกหน้าที่แก้ · 2C ชุด 5 จะใช้ค่าที่ 2B เลือก
- เป้ากด: ลิงก์แบ่งหน้าของข้อมูลหลักสูง 32 บนมือถือ (M04 §2.3) · ปุ่มหัวหน้าต่ำกว่า 44 มี 9 จุด (M03 §B3) · ลิงก์เส้นทางนำทาง 20px พึ่งปุ่มกลับ (DS:573, Q2)
- ปุ่มลอยของ users/roles ทับแถบล่าง (`D/admin/users/page.tsx:177`, `D/admin/roles/page.tsx:245`) เป็นของ 2D (R-q)
- sheet ⋯ บนมือถือ: chrome เป็นของ 2C · รายการต้องสูง 44 (DS:414-415)
- 10 หน้าเลื่อนตารางแนวนอน (Q6)

### 5.5 อื่น ๆ

- ชื่อซ้ำ: `PageHeader` (`D/my-assets/page.tsx:163`) · `StatusBadge` (`D/notifications/page.tsx:156`; `IntegrationClientManager.tsx:797` เป็นไฟล์ 2C) · `MetricCard` (`D/master-data/suppliers/[id]/page.tsx:306`, `D/work-center/page.tsx:597`) · `ColumnHeader` (`D/master-data/employees/[id]/page.tsx:607`) · guard ของ `StatusBadge` นับตัวประจำไฟล์ด้วยและต้องมากกว่า 40 (VFG:117-122)
- class arbitrary ใหม่ (`w-30`, `gap-5.5`, `grid-cols-[120px_minmax(0,1fr)]`) ต้องผ่าน `cn()` ที่ตั้ง `extendTailwindMerge` แล้ว (`src/lib/utils.ts:2-7`) · class ของ token ที่ไม่ได้ประกาศจะหายเงียบ (A:41)
- ข้อความใหม่ (ช่วงแถว · หัวคอลัมน์คำสั่งแบบ sr-only · ชื่อของ ⋯ · ข้อความเพดานของ Q4 · ชนิดแจ้งเตือน) ต้องผ่าน `messages-edit.mjs`, `thai-glossary`, `messages-parity` (C:158) · ยังไม่มีเอกสารไหนกำหนด key (M01:261)
- การคัดลอกตารางที่มี `Nil` (ข้อความ sr-only ติดไปใน Excel) ต้องตรวจ (A/08:324)
- งานตรวจด้วยคนที่ค้าง (NVDA, iPhone, iPad, การบันทึกที่สำเร็จ) ของเฟส 1, 2A และ 2C plan 1–2 ยังไม่เสร็จ (DH:470-474) · 2B เพิ่มรายการตรวจของตัวเอง · deploy ครั้งเดียวจึงเป็นชุดใหญ่
