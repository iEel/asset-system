# หน้ารายการและโครงหน้า (UI รอบ 4 เฟส 2B) — Design

วันที่ 2026-10-12 · ฐาน `master` `d38a0ee` (เฟส 1, 2A, 2C plan 1 และ plan 2 merge และ push แล้ว ยังไม่ deploy) · branch ของสเปกและ plan 2B-1: `feat/ui-phase2b`

เฟส 2 แบ่งเป็น 4 งานย่อย: **2A รากฐาน → 2C ฟอร์มและ dialog (plan 1–2 เสร็จแล้ว) → 2B หน้ารายการและโครงหน้า (เอกสารนี้ · 5 plan ทำคู่กับ 2C plan 3–5 แบบสายท่อ) → 2D กวาดที่เหลือและล็อก guard** · deploy ครั้งเดียวหลังเฟส 2 เสร็จทั้งหมด (ผู้ใช้ตัดสิน 2026-10-12)

ข้อมูลที่ใช้ร่าง:
- แผนที่โค้ดที่ `d38a0ee` 5 ส่วน (ข้อผูกพันจากสเปกก่อนหน้า · หน้ารายการ · โครงหน้าและเมนู · ของกลางและ guard · ต้นแบบ) + การสังเคราะห์
- ร่าง 7 ส่วน (ข้อ 3–9) + การรวม (ข้อ 10) ที่นับตัวเลขใหม่ทุกตัว
- ต้นแบบที่อนุมัติ `docs/superpowers/specs/2026-10-10-ui-foundation/` (`base.css`)

## 1. เป้าหมายและหลักฐาน

2B ย้ายหน้ารายการและโครงหน้าไปใช้ของกลางชุดเดียว:
- หัวหน้า `PageHeader` และปุ่มกลับ `PageBackLink` แบบเดียว
- ตาราง `DataTable` + แถวว่าง `TableEmptyRow` + ตัวแบ่งหน้า `Pagination`
- ตัวกรอง `FilterSelect` + ชิปตัวกรอง `FilterChipList` · ช่องค้นหาเป็น `SearchField`
- ปุ่มในแถวแบบ ช1 `RowActions` · แท็บ `TabNav` · แถบตัวเลข `StatStrip` · รายการค่า `KeyValueList`
- เมนูข้าง: "ทะเบียนทรัพย์สิน" เป็นรายการแรกของหมวดทรัพย์สิน คลิกครั้งเดียวถึง

2B ไม่เปลี่ยน workflow ไม่เพิ่มหน้า ไม่แตะ schema และไม่เพิ่ม token (2A I21) · server แก้แค่ query อ่านอย่างเดียวในหน้า เพื่อแบ่งหน้าจริง 9 รายการที่วันนี้ตัดจำนวนโดยไม่บอกหรือไม่แบ่งหน้า (B4)

สิ่งที่พบในโค้ด (`d38a0ee` · วิธีนับในข้อ 10.8):

| เรื่อง | หลักฐาน |
|---|---|
| ของกลางของ 2B | ยังไม่มีสักตัว (`DataTable`, `PageHeader`, `TableEmptyRow`, `RowActions`, `TabNav`, `StatStrip`, `KeyValueList`, `FilterSelect` กลาง) · หน้ารายการนอกทะเบียนไม่ใช้ของ 2A เลย (`Button`, `Field`, `SearchField`, `Nil`, `formatCount`, `EmptyNote`, `tag` = 0 ใน `src/app`) |
| หัวหน้า | `<h1>` 60 จุดใน 60 ไฟล์ (`font-bold` 57) · `MasterDataHeader` 11 จุด · `PageHeader` ประจำไฟล์ 1 · `ReportHeader` · หัวสลับที่ `sm`/`md`/`lg` · เส้นทางนำทางห่างหัวเรื่อง 3 แบบ |
| ปุ่มกลับ | `<ArrowLeft` 27 จุด · ไอคอนผิด 3 จุด (Wrench, Download, FileCheck2) · `disposal/[id]` ไม่มีปุ่มกลับบนมือถือ · "ยกเลิก" ที่หัว 3 หน้าซ่อมบำรุง |
| ตาราง | `<table` 45 ใน 33 ไฟล์ · หัวตารางพื้นโปร่ง `bg-muted/NN` 44 จุดใน 31 ไฟล์ (guard R7 เต็มเพดาน 44) · `ColumnHeader` 112 จุดใน 17 ไฟล์ · หัวเรียงลำดับเขียนเอง 8 แบบ มี `aria-sort` 1 จุด · แถวว่างใน `<td colSpan>` 16 จุด |
| แบ่งหน้า | 13 ฟังก์ชัน (เขียนเอง 11) · ลิงก์ที่ปิดใช้ด้วยความจาง 23 จุด · ตัดจำนวนเงียบ 6 รายการ (100–500 แถว) · ไม่แบ่งหน้า 3 รายการ |
| ตัวกรอง | ช่องกรองฝั่ง server 33 element ใน 12 ไฟล์ · `FilterSelect` ประจำไฟล์ 7 ตัว เรียก 24 จุด · `ReportSelect` 6 · `MasterDataSearch` 6 หน้า (ช่องดิบ) · select ประจำไฟล์ของทะเบียน 10 |
| ปุ่มในแถว | ⋯ มีที่ทะเบียนที่เดียว · ไอคอนแก้ไข 32px ข้างปุ่มลบ 44px ใน 7 หน้าข้อมูลหลัก |
| ตัวเลขและค่าว่าง | `.toLocaleString()` ไม่ระบุภาษา 44 จุด · `"-"` บนจอ 128 จุดใน 43 ไฟล์ · `formatCurrency(` 42 จุด · กล่องตัวเลขประจำไฟล์ 30 ตัว · `MetricCard` 20 จุด |
| แท็บ | แถวแท็บที่มีตัวนับ 7 แถว 4 หน้าตา · แถวตั้งค่าใช้ `aria-pressed` อีก 9 แถวใช้ `aria-current` |
| เมนูข้าง | ทะเบียนลึก 3 ชั้น (ทรัพย์สิน › จัดการทรัพย์สิน › ทะเบียน › ทะเบียนทรัพย์สิน) · 40 ตำแหน่ง 29 ไอคอน ซ้ำ 8 ชื่อใน 19 ตำแหน่ง (`Package` ×3) · แถบย่อแสดงแค่ไอคอน |
| อื่น ๆ | `pb-24` ซ้อนกับระยะล่างของ shell 4 หน้า · รหัส `font-mono` 44 บรรทัดใน 15 ไฟล์ · ชนิดแจ้งเตือนแสดงคำอังกฤษดิบ · ลิงก์กลับของ findings มีไอคอน `+` |

### ข้อตัดสินของผู้ใช้ (B1–B10)

| # | เรื่อง | เลือก |
|---|---|---|
| B1 | เมนูข้าง | "ทะเบียนทรัพย์สิน" รายการแรกของหมวดทรัพย์สิน · ตัดชั้น "ทะเบียน" · 2 กลุ่ม: **จัดการทรัพย์สิน ▸** (เพิ่ม · สแกนค้นหา · พิมพ์ป้าย QR · นำเข้า/ส่งออก) และ **ธุรกรรม ▸** (ส่งมอบ · รับคืน · โอนย้าย · ย้ายหลายรายการ) · ลึกไม่เกิน 2 ชั้น · ไอคอนไม่ซ้ำทั้งเมนู · ไอเดียเมนูอื่น → เฟส 3 |
| B2 | ปุ่มกลับ (ตัดสิน D10) | คงทุกหน้าที่มี ทำเป็นแบบเดียว `outline` + ลูกศรซ้าย · มือถือเป็นไอคอน 44px · แก้ไอคอนผิด 3 จุด · เพิ่มบนมือถือของ `disposal/[id]` · "ยกเลิก" ที่หัว 3 หน้าซ่อมบำรุงเป็นปุ่มกลับ · ยังพา `returnTo` |
| B3 | หน้าตาหน้ารายการ | ตามต้นแบบ: h1 600 · หัวตารางพื้นขาว 13/500 สีจาง ไม่ใช้ตัวพิมพ์ใหญ่ กรอบ 12px · แถวราว 46px (`p-3`) ยกเว้นทะเบียนที่คงแถวแน่นถึงเฟส 3 · แถบเครื่องมือไม่มีกรอบ สูง 36 บนจอใหญ่ (มือถือแถบติดบน 44) · `TabNav` เส้นใต้ทุกขนาดจอ เป้ากด 44 บนมือถือ |
| B4 | รายการที่ตัดจำนวน | แบ่งหน้าจริงทั้ง 9 รายการ (logs 100 · ประวัติการอนุมัติ 150 · รายการไม่ตรง 200 · รายการค้างของรอบ 200 · ชุดตัดจำหน่าย 100 · PM 500 · รอบตรวจนับ · แผนก · ทรัพย์สินของฉัน) · query อ่านอย่างเดียว ไม่เพิ่ม index · `returnTo` พาเลขหน้าและขนาดหน้า |
| B5 | ปุ่มในแถวข้อมูลหลัก (ตัดสิน D13) | แบบ ช1: ปุ่ม "แก้ไข" + ⋯ ที่มี "ลบ" · ลบต้องเปิด ⋯ แล้วยืนยันเดิม · คลิกทั้งแถวยังไปหน้าแก้ไข |
| B6 | ตารางบนมือถือของ 10 หน้า | คงเลื่อนแนวนอน + ตัวบอกเมื่อล้นจริง · มุมมองมือถือ → เฟส 3 |
| B7 | ลำดับงาน | สายท่อ: 2B-1 → 2B-2 → 2B-3 → 2B-4 → 2B-5 · 2C-3 เริ่มเมื่อ 2B-2 merge · 2C-4 เมื่อ 2B-3 และ 2C-3 merge · 2C-5 เมื่อ 2B-4 และ 2C-4 merge · 2D หลัง 2B-5 และ 2C-5 |
| B8 | แนวทาง | ของกลางก่อน (2B-1 พร้อมข้อมูลหลัก 8 หน้า ผู้ใช้ เมนูข้าง และหัวฟอร์ม) แล้วย้ายทีละกลุ่มหน้า |
| B9 | deploy | ไม่มี plan ใดของ 2B deploy เอง · ครั้งเดียวหลังเฟส 2 ทั้งหมด หลังผู้ใช้ตรวจเครื่องจริง · ถอยกลับ `ab1b873` |
| B10 | คนทำ | เลือกต่อ plan ตอนส่ง plan · ผมตรวจทุกงานเอง |

**สิ่งที่พนักงานจะเห็น** (ตัดสินตามกฎเดิม): หัวเรื่องบางลง · กล่องตัวเลขไม่มีพื้นสีและรวมเป็นแถบเดียว · ปุ่ม "อนุมัติที่เลือก" เป็นสีหลักแทนเขียว · เงินในตารางไม่มี "฿" และหัวคอลัมน์มี "(บาท)" · ค่าว่างเป็น "—" และเลข 0 ที่เคยถูกซ่อนแสดงเป็น 0 · ปุ่มสูง 44 บนคอมเหลือ 40 (มือถือยัง 44) · ชนิดแจ้งเตือนเป็นคำไทย · รหัสเป็นตัว monospace · ลบในข้อมูลหลักต้องผ่าน ⋯ · แผงตัวกรองที่มีป้ายยังมีกรอบ (I23) · หน้า PM มีปุ่มกลับ (I25) · รายการไม่ตรงมีชิปบอกรอบและประเภทที่กรอง (I24) · หน้าสร้างบทบาทเขียน "เพิ่มบทบาท" (I32) · สลับ "งานทั้งหมด/งานของฉัน" เป็นแท็บเส้นใต้ (I10)

## 2. ขอบเขต 2B เทียบกับ 2C / 2D / เฟส 3

| เรื่อง | 2B (เอกสารนี้) | 2C plan 3–5 | 2D | เฟส 3 |
|---|---|---|---|---|
| ของกลาง | `PageHeader` `PageBackLink` `DataTable` `TableEmptyRow` `DataTableScrollArea` `Pagination` `FilterSelect` `FilterChipList` `FilterFormActions` `RowActions` `TabNav` `StatStrip` `KeyValueList` `ContentPanel divided` | chrome ของ dialog และ sheet · `ActionBar` (ชุด 5) · `AlertDialog` (ชุด 5) | ลบ `ActionButton` · ค่าตั้งต้นปุ่ม 36 · ลบ `MasterDataDeleteButton` | — |
| หน้า | หน้ารายการ 34 route + หน้ารายละเอียด 6 หน้า + skeleton · หัวฟอร์ม (ปุ่มกลับ) | ฟอร์มและ dialog ชุด 3–5 · แถบล่างของ 4 หน้า (O11) | แผงฟอร์ม (K28) · กล่องแจ้งและกล่องว่างที่เหลือ · pill ที่เขียนเอง | จัดหน้าใหม่ 7 หน้าจอของต้นแบบ · มุมมองมือถือของ 10 ตาราง · ชุดคอลัมน์ทะเบียน |
| เมนูและนำทาง | เมนูข้าง B1 · ปุ่มกลับ B2 | — | — | จำกลุ่มเมนู · Enter ในช่องค้นหาไปทะเบียน · หน้าแรกตามบทบาท · เมนูโปรด · Ctrl K · `returnTo` ปลายทางที่ทิ้ง (I22) |
| ตัวกรองและตาราง | ช่องกรอง server 33 · ทะเบียน (O1) · `FilterSelect` ×7 · `ReportSelect` · checkbox เลือกแถว 8 · แบ่งหน้าจริง 9 รายการ | dialog ในไฟล์ร่วม (แก้ไขหลายรายการ · อนุมัติ/ดำเนินการหลายรายการ · `ConfirmTextDialog`) | budget ทุกตัวเป็น `{}` | เลือกหลายแถว/แถบคำสั่งกลุ่มของทะเบียน (ไปกับงานพิมพ์ QR) |
| guard | VFG R1 → `{}` · R7 เป็นรายไฟล์ 44 → 3 · `tests/list-frame-guards.test.ts` ใหม่ (19 ตัว) | `tests/form-migration-guards.test.ts` (2B ไม่แก้) | รวมและล็อกทุก budget | — |
| server | query อ่านอย่างเดียวของ B4 ใน `page.tsx` | — | — | — |

รั้วโดยละเอียด (สิ่งที่ 2B ห้ามแตะ) อยู่ข้อ 8 · ลำดับและการ deploy ข้อ 8 และข้อ 10.3

## 3–9. รายละเอียดแต่ละส่วน (ไฟล์แยก)

รายละเอียดของข้อ 3–9 อยู่ในโฟลเดอร์ `docs/superpowers/specs/2026-10-12-ui-phase2b/` (ร่างโดย agent แยกส่วน ตรวจตัวเลขกับโค้ดที่ `d38a0ee` แล้ว) · **ข้อ 10 ของเอกสารนี้ใช้แทนข้อความในไฟล์เหล่านั้นทุกที่ที่ขัดกัน** โดยเฉพาะ I1–I34

ข้อมูลตั้งต้นที่ทุกส่วนอ้างอยู่ในโฟลเดอร์เดียวกัน: `00-decisions.md` (B1–B10 และกฎที่ใช้ทุก plan) และ `00-synthesis.md` (ขอบเขต · ข้อตัดสินจากเอกสารเดิม R-a…R-s · รั้ว · การแบ่ง plan) · การอ้าง M01–M05, `p2b-map/…` และ `p2b-spec/work/…` คือแผนที่และสคริปต์นับระหว่างร่างที่เก็บใน scratchpad ของ session ไม่อยู่ใน repo · ตัวเลขที่ใช้ตัดสินตรวจซ้ำที่ `d38a0ee` ในข้อ 10.8 และ plan แต่ละตัวนับใหม่ในงาน 0

| ข้อ | ไฟล์ | สรุป |
|---|---|---|
| 3. ของกลางใหม่ | `2026-10-12-ui-phase2b/03-primitives.md` | API, class และ a11y ของของกลางทุกตัว · `MasterDataSearch` → `SearchField` · `ClickableTableRow` |
| 4. เมนูข้างและโครงหน้า | `2026-10-12-ui-phase2b/04-navigation-frames.md` | โครงเมนูใหม่ (B1) · แผนที่หัวหน้าทุกหน้า · ปุ่มกลับทุกจุด (B2) · ตัวห่อหน้า · `pb-24` ซ้อน · skeleton |
| 5. หน้ารายการ (ยกเว้นทะเบียน) | `2026-10-12-ui-phase2b/05-lists.md` | ตารางย้ายรายหน้า 34 route · แบ่งหน้าจริง 9 รายการ (B4) · ปุ่มในแถว (B5) · มือถือ (B6) · บั๊กที่พบ |
| 6. ตัวกรองและการค้นหา | `2026-10-12-ui-phase2b/06-filters.md` | ช่องกรอง 33 element · `FilterSelect` กลาง · `ReportSelect` · ชิปตัวกรอง · แถบเครื่องมือ (B3(4)) |
| 7. ทะเบียนทรัพย์สิน | `2026-10-12-ui-phase2b/07-register.md` | ทะเบียนบนของกลาง โดยคงสัญญา DESIGN.md:500-510 · แถวแน่น · ความกว้างคอลัมน์ · pin ที่ต้องแก้ |
| 8. แบ่ง plan ลำดับงาน รั้ว และการ deploy | `2026-10-12-ui-phase2b/08-plans.md` | 5 plan รายไฟล์ · สายท่อกับ 2C (B7) · รั้ว · deploy (B9) |
| 9. guard และ test | `2026-10-12-ui-phase2b/09-guards-tests.md` | VFG R1/R7/R2 · `tests/list-frame-guards.test.ts` · test ที่ต้องแก้และต้องผ่านต่อ · test ใหม่ |

## 10. ข้อตัดสินจากการรวมส่วน ลำดับงาน test และการตรวจ (ใช้แทนข้อความในข้อ 3–9 ที่ขัดกัน)

อ่านร่างข้อ 3–9 เทียบกันเอง เทียบกับ B1–B10, R-a…R-s และรั้วข้อ 2 และเทียบกับโค้ดที่ `d38a0ee` · ไม่แก้ repo ไม่รัน test ไม่เปิดแอป · สคริปต์ตรวจซ้ำของส่วนนี้อยู่ใน scratchpad ไม่อยู่ใน repo: `p2b-spec/work/10/recount10.mjs` (รันที่ราก repo · `--files` ให้ค่ารายไฟล์ · ใช้ตัวอ่าน JSX ของ `tests/helpers/source-files.ts` และดึง regex R1/R7/R2 ตรงจาก `tests/visual-foundation-guards.test.ts`) · สคริปต์ของร่างที่ใช้ซ้ำ: `work/09/count09.mjs`, `work/s8-plans.mjs`, `work/07/widths.mjs`

ย่อ: `D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/` · **DS** `DESIGN.md` · **DH** `DEVELOPER_HANDOFF.md` · **VFG** `tests/visual-foundation-guards.test.ts` · **FMG** `tests/form-migration-guards.test.ts` · **LFG** `tests/list-frame-guards.test.ts` (ใหม่) · "ข้อ N" = ร่างส่วน N (3 ของกลาง · 4 เมนูและโครงหน้า · 5 หน้ารายการ · 6 ตัวกรอง · 7 ทะเบียน · 8 plan · 9 guard และ test)

### 10.1 ข้อที่ทุกส่วนตรงกันแล้ว

- **ไม่มี token ใหม่ (2A I21):** class ทุกตัวใช้ token เดิม · ไม่แก้ `tests/design-tokens-contrast.test.ts`
- **ไม่มี schema, migration, API, dependency, index:** query ของ B4 เป็น `findMany`/`count`/`groupBy` อ่านอย่างเดียวใน `page.tsx` · ตรวจบน `asset_management_dev` เท่านั้น
- **ไม่ deploy ราย plan (B9):** deploy ครั้งเดียวหลังเฟส 2 · จุดถอยกลับ `ab1b873` · `ab1b873..d38a0ee` 107 commit ไม่มี merge commit
- **สายท่อ (B7):** 2B อยู่ checkout หลัก 2C อยู่ worktree · merge แบบ fast-forward · คู่ที่เกิดได้จริง 6 คู่ (ข้อ 8.3) · ไฟล์โค้ดร่วมกันไม่มี
- **ของกลางใหม่ใน `c/ui/`** ไม่มี `"use client"` ยกเว้น `row-actions.tsx` และ `data-table-scroll.tsx` · `DataTable` ไม่มี hook (R-j) · ทุกตัวต่ำกว่า `md` สูงอย่างน้อย 44
- **หน้าตาตาม B3:** h1 600 · หัวตารางพื้นขาว 13/500 สีจาง ไม่มีตัวพิมพ์ใหญ่ กรอบ 12px · แถว `p-3` ราว 46px ยกเว้นทะเบียน · แถบเครื่องมือไม่มีกรอบ สูง 36 จาก `md` 44 บนมือถือ · `TabNav` เส้นใต้ทุกขนาดจอ เป้ากด 44 บนมือถือ
- **เมนูข้าง (B1):** โครงตามตารางข้อ 4.2.2 · ลบ key `nav.assetRegistryGroup` · ไม่มี key ใหม่ · ลบ `depth` ของ `SidebarGroup`
- **ปุ่มกลับ (B2):** แบบเดียว `outline` + ลูกศรซ้าย · ไอคอน 44 ต่ำกว่า `md` · `href` เป็นนิพจน์เดิมของหน้า · แก้ไอคอนผิด 3 จุด · `disposal/[id]` มีปุ่มกลับบนมือถือ · "ยกเลิก" ที่หัว 3 หน้าซ่อมบำรุงเป็นปุ่มกลับ
- **B4:** `page` + `pageSize` (25/50/100) · `count` อยู่ใน `Promise.all` เดียวกับ `findMany` · `orderBy` เดิม + `{ id: "asc" }` · กล่องตัวเลขนับยอดเต็ม · ห้ามเพิ่ม index
- **B5:** แถวข้อมูลหลักเป็น ช1 · ลบต้องเปิด ⋯ แล้วยืนยันเดิม · คลิกทั้งแถวยังไปหน้าแก้ไข · **B6:** เลื่อนแนวนอน + ตัวบอกเฉพาะเมื่อล้นจริง
- **guard ของ VFG:** R7 เป็น budget รายไฟล์ตั้งแต่ 2B-1 งาน 1 (44 → 29 → 17 → 17 → 11 → 3) · R1 เป็น `{}` ใน 2B-2 · R2 10 ใน 9 ไฟล์ไม่ขยับ
- **รั้ว 2C:** ไม่แตะ chrome ของ sheet/dialog/field/file-dropzone · ไม่แก้ FMG · ไม่รัน formatter บนไฟล์ 2C · regex ใหม่ในไฟล์ test ที่อ่าน CRLF ดิบห้ามมี `\n`
- **ข้อความใหม่** ผ่าน `node scripts/messages-edit.mjs` · คำตาม `docs/19_THAI_GLOSSARY.md`

### 10.2 ข้อตัดสิน (ใช้แทนข้อความในข้อ 3–9)

| # | เรื่อง | ขัดกันอย่างไร | ตัดสิน | เหตุผล |
|---|---|---|---|---|
| I1 | API และ class ของ `PageHeader` / ปุ่มกลับ | ข้อ 3.3: `back?: PageBackLinkProps` (object) · มี `description` และ `meta` · grid สลับที่ `sm` · `label?` ค่าตั้งต้นจาก `useTranslations` · `sr-only sm:not-sr-only` · ข้อ 4.3: `back?: ReactNode` + `BackLink` · ไม่มี `description` · flex สลับที่ `md` · `label` บังคับ · ข้อ 9.9 ข้อ 2 เลือกชื่อ `PageBackLink` | ไฟล์ `c/ui/page-header.tsx` export `PageHeader` และ **`PageBackLink`** · props ตามข้อ 4.3.1: `{ title, meta?, actions?, back?: ReactNode, breadcrumbs?, compactOnMobile?, className? }` · `PageBackLinkProps = { href: string; label: string; onClick?; className? }` ไม่มี hook · string: `<header data-slot="page-header" className={cn("min-w-0", className)}>` · `<Breadcrumbs items={breadcrumbs} className="mb-1" />` · แถว `"flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"` / compact `"flex items-center justify-between gap-3 md:items-start md:gap-x-6"` · h1 `"text-2xl font-semibold text-balance break-words text-foreground"` + compact `"max-md:text-xl"` · meta `"mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground"` + compact `"max-md:hidden"` · ปุ่ม `"flex flex-wrap items-center gap-2 md:justify-end"` + compact `"shrink-0"` · ปุ่มกลับ `cn(buttonVariants({ variant: "outline", size: "md" }), "min-w-11 max-md:px-0", className)` + `<ArrowLeft aria-hidden="true" />` + `<span className="max-md:sr-only">{label}</span>` · `data-slot="page-back-link"` | `back` เป็น node ทำให้ literal `href={returnToHref}` อยู่ในหน้าต่อ (pin 6 จุดผ่านโดยไม่แก้ ข้อ 9.9 ข้อ 2) · ไม่มี hook จึงใช้ในฟอร์ม client ได้ · ปุ่มและช่องสลับที่ `md` (DS:572) · flex ไม่บีบหัวเรื่องเหลือ 0 เมื่อมี 5 ปุ่ม (`audit/rounds/[id]`) · คำอธิบายเป็นตัวท้ายของ meta (A/08:286) · ชื่อที่อ่านเท่ากับคำที่เห็น ไม่ต้องมี `aria-label` |
| I2 | `MasterDataHeader` ระหว่างทาง | ข้อ 3.3 ส่ง `subtitle` เป็น `description` · ข้อ 4.4.2 เป็น `meta` · ข้อ 7.17 ให้ 2B-3 แก้ pin `:115-118` ถ้า 2B-1 ยังไม่แก้ | ตัวห่อบางในงาน 3 ของ 2B-1: `<PageHeader title={title} meta={subtitle} compactOnMobile={compactOnMobile} className={compactOnMobile ? "mb-4 md:mb-6" : "mb-6"} actions={<>{actions}<Link href={createHref} className={buttonVariants({ size: "md" })}><Plus aria-hidden="true" />{createLabel}</Link></>} />` · แก้ `tests/asset-register-filter-ui.test.ts:112-119` และ `tests/supplier-adaptive-ui.test.ts:58` ในงานนั้น · 2B-3 แก้แค่ `:108` | R-h · หัวหน้า 11 จุดหน้าตาเดียวกันตั้งแต่ 2B-1 · ไอคอน `Plus` บนปุ่มกลับของ findings (`master-data-layout.tsx:33`) ค้างจนถึง 2B-2 (ข้อ 3.19 ข้อ 1) |
| I3 | ความแน่นของแถว | ข้อ 3.4 ให้ `density="compact"` ผ่าน `data-density` + `group-data-[density=compact]/table:` (ความเจาะจง (0,3,0)) · ข้อ 7.8.4 ให้คอลัมน์คำสั่ง (คอลัมน์สุดท้าย) `pl-1.5 pr-2` และข้อ 7.8.3 ให้ช่อง checkbox `p-0` · class ธรรมดา (0,1,0) แพ้ `last:pr-*`, `first:pl-*` และ `…:py-2` ของ primitive · ช่องคำสั่งจึงได้ `pr-3` เหลือเนื้อ 153.5 < 156 (ปุ่ม 120 + 4 + ⋯ 32) | **`DataTable` ไม่มี `density`** · ตัด `group-data-[density=…]` ออกจาก `dataTableHeadClasses`/`dataTableCellClasses` · `<table>` เป็น `w-full text-sm` (+ `table-fixed`) ไม่มี `group/table` และ `data-density` · ทะเบียนเก็บ class ของตัวเองใน `asset-register-table.tsx`: `headerClasses = "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"` · `cellClasses = "border-b border-border-soft px-3 py-2 align-top"` · ช่องคำสั่ง `cn(cellClasses, "pl-1.5 pr-2")` · ใช้ `DataTableBody`, `ClickableTableRow`, `TableEmptyRow`, `DataTableFoot` และ `DataTableHead sort` เฉพาะคอลัมน์กลาง | แถวแน่นเป็นข้อยกเว้นของทะเบียนคนเดียว (B3(3)) จนเฟส 3 จึงอยู่ในไฟล์ทะเบียน · ช่องคำสั่ง 172 − 6 − 8 − 0.5 = 157.5 ≥ 156 (`recount10.mjs`) · ตารางอื่นทุกตัวไม่ต้องตั้งขอบซ้ายขวาเอง (คอลัมน์แรกและสุดท้ายเปลี่ยน padding ด้วย class ธรรมดาไม่ได้ เขียนลง DS) · ข้อ 3.18 ข้อ 6, 7 และความเสี่ยง specificity ของข้อ 3 หายไป |
| I4 | ตัวบอกว่าเลื่อนได้ของทะเบียน | ข้อ 3.6 ให้ `DataTableScrollArea` แทนของทะเบียนใน 2B-3 · ข้อ 7.2 คงของทะเบียน | ทะเบียนคง `isOverflowing` + ข้อความ `asset.tableScrollHint` (`asset-register-table.tsx:202-213`, `:519-526`) · ผู้ใช้แรกของ `DataTableScrollArea` คือ 10 หน้าของ B6 · ข้อ 5 เรียก "ScrollHint" ให้ใช้ชื่อ `DataTableScrollArea` | ตัวเลื่อนของทะเบียนถือ `ref`, `data-asset-desktop-table` และคอลัมน์ค้าง ซึ่ง API ของ `DataTable` ไม่มีช่องให้ · ตรรกะเดียวกันอยู่แล้ว |
| I5 | API ของ `RowActions` | ข้อ 3.11: ข้อมูลล้วน (`code`, `menuLabel`, `next`, `groups`, `deleteAction`, `openerRef`, `menu`) · ข้อ 7.2/7.9: `next` มี `"aria-label"` + `onClick` · รับ `triggerRef` จากนอก · children เป็นเนื้อเมนูของผู้เรียก · `contentClassName` (`w-64`) · ข้อ 5.3: ตัวห่อใหม่ `c/master-data/master-data-row-actions.tsx` | **ใช้ API ข้อ 3.11 ตัวเดียว** · ไม่มี children, `triggerRef`, `contentClassName` · แผงเมนูกว้างตามค่าตั้งต้น `min-w-60` · ทะเบียน: `AssetRegisterRowActions` คงไฟล์และชื่อ export เป็นตัวห่อ client ที่สร้าง `next` (`getRowNextAction`), `groups` (`t("transactionMenu")` + รายการธุรกรรม `link`/`unavailable` ตาม `reasonOf` · แก้ไข · คัดลอก), `` deleteAction={permissions.canDelete ? { endpoint: `/api/assets/${assetId}` } : undefined} `` (ซ่อน "ลบ" เมื่อไม่มีสิทธิ์ เหมือนวันนี้ `asset-register-row-actions.tsx:145`, `:224`), `menuLabel={t("rowActionsMenu", { assetTag })}`, `menu={variant === "desktop" ? "dropdown" : "sheet"}` · ส่ง `next` เฉพาะจอใหญ่ · หัว sheet เป็น `<span className="tag font-medium">{code}</span>` (R-p) · ข้อมูลหลัก: หน้า server เรียก `RowActions` ตรง (props เป็นข้อมูลล้วน) ไม่มีไฟล์ตัวห่อ · ตัวห่อ `*-delete-button.tsx` 9 ไฟล์ลบพร้อมผู้เรียกตัวสุดท้าย · `master-data-delete-button.tsx` คงไว้ไม่มีผู้เรียก (pin `tests/confirm-dialog-ui.test.ts:36` · ลบใน 2D) · แผงยี่ห้อที่เลือก (`D/master-data/brands/page.tsx:299-313`): `RowActions` `next` = แก้ไขยี่ห้อ + `deleteAction` | ผู้ใช้ 5 กลุ่มใช้ API เดียว · ลบและคืนโฟกัส (`useDeleteAction` `returnFocusRef: triggerRef`) อยู่ใน primitive · ทะเบียนเลิก sheet ⋯ ที่เขียนเอง (`asset-register-row-actions.tsx:160-243`) และ `sheetItemClasses` · pin ของทะเบียน (`tests/asset-register-table-ui.test.ts:13-25` · `tests/dropdown-menus-ui.test.ts:27-38`) เขียนใหม่ครั้งเดียวใน 2B-3 ให้ตรวจพฤติกรรมเดิมที่ `c/ui/row-actions.tsx` · ลบใน B5 ใช้ hook ตัวเดียวกับ `MasterDataDeleteButton` (ยืนยันเดิม) |
| I6 | `FilterSelect` และ select ของทะเบียน | ข้อ 3.9: `allOption`, `fieldClassName`, `label: ReactNode`, `hint` · ข้อ 6.3.1: `allLabel`, `className` ลงที่ `Field`, `fieldSize` ค่าตั้งต้น `lg` · ข้อ 7.2/7.5/7.6: ทะเบียน "ไม่ใช้ FilterSelect" ใช้ `NativeSelect` + `aria-label` และคง `LabeledSelect` ประจำไฟล์ | **API ข้อ 6.3.1** · ทะเบียน: select 3 ตัวในแถบเครื่องมือเป็น `FilterSelect hideLabel fieldSize="md"` (คง `key`, `defaultValue`, `onChange`) · sheet ตัวกรองเรียก `FilterSelect` 7 จุดด้วย `labelAction={<AssetStateHelpPopover … />}` (สถานะ สภาพ) + `key={value}` + `defaultValue` + `onChange` · ลบ `function LabeledSelect` (LFG LF1 KEEP 0) | DS:448 "Fields without a visible label use `Field hideLabel` … Only a `SearchField` or `ScannerTextInput` … takes `aria-label`" · ไม่มี select ประจำไฟล์เหลือ · `tests/asset-register-filter-ui.test.ts:39-45` ไม่ยึด `aria-label` จึงผ่าน · `:58-59` (`help={statusHelp}`) และ `tests/asset-status-help-ui.test.ts:49-51` แก้ใน 2B-3 |
| I7 | ชิปตัวกรอง | ข้อ 3.10: `ui/filter-chips.tsx`, type `FilterChip`, `labels {group, remove, clearAll}`, ชื่อ = คำที่เห็น + sr-only · ข้อ 6.3.3: `ui/filter-chip-list.tsx`, `FilterChipItem`, `aria-label` "ล้างตัวกรอง: …", `mobileOnly` · ข้อ 7.5: ทะเบียนคงไฟล์ตัวเอง | ไฟล์ **`c/ui/filter-chips.tsx`** (ข้อ 9.9 ข้อ 3) · export `FilterChipList` · type `FilterChipItem` · props และ markup ตามข้อ 6.3.3 (`label`, `removeLabel`, `clearAll?`, `mobileOnly`) · class ของชิปเพิ่ม `focus-visible:ring-offset-2` ต่อจาก `focus-visible:ring-ring` · `asset-register-filter-chips.tsx` เป็นตัวห่อ server ของ `FilterChipList` | ชื่อที่อ่านเท่าวันนี้ เพราะผู้เรียกส่ง `removeLabel` จาก key เดิม (ทะเบียน "ล้างตัวกรองนี้: บริษัท: GRL" `asset.clearDrilldownFilter` · รายงาน "ล้างตัวกรอง: …" `reportsPage.clearActiveFilter`) · `FilterChip` ชนชื่อฟังก์ชันใน `D/admin/approvals/page.tsx:185` · วงโฟกัสเว้นระยะแบบปุ่ม · pin ชิปของทะเบียน (`asset-register-filter-ui.test.ts:79-82`) ย้ายไปอ่าน `ui/filter-chips.tsx` ใน 2B-3 (ชิปสูง 36 ไม่ใช่ 32) |
| I8 | markup ของ `MasterDataSearch` | ข้อ 3.16: `aria-label={placeholder}` · `flex flex-wrap` · ข้อ 6.3.5: `aria-label={submitLabel}` · มือถือซ้อนเต็มแถว | **ข้อ 6.3.5** ทั้งก้อน · คง `mb-4` | ชื่อเดียวกับช่องค้นหาของทะเบียน (`tCommon("search")`) · placeholder ยังถูกอ่านเป็นคำอธิบาย · มือถือเหมือนวันนี้ (`flex-col` `master-data-layout.tsx:57`) · `mb-4` ชนะ `space-y-6` ของรากหน้า แถบค้นหาจึงชิดตารางของมัน 16px (ตั้งใจ) |
| I9 | API ของ `TabNav` | ข้อ 3.12 มี `fullBleed` ไม่รับ props อื่นของ `<nav>` · ข้อ 7.7 ต้องส่ง `data-asset-status-tabs` และ `className` · ข้อ 9.9 ข้อ 11 ให้ `asset-detail-tabs`/`report-view-tabs` คงตัวห่อ client ที่ถือการเลื่อน | API ข้อ 3.12 **ไม่มี `fullBleed`** · เพิ่ม `...navProps` (`Omit<React.ComponentProps<"nav">, "children" \| "aria-label" \| "onSelect">` รวม `ref`, `style`, `onScroll`, `data-*`) และ `linkClassName?: string` · แท็บสถานะทะเบียนส่ง `className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"` + `data-asset-status-tabs` (ข้อ 7.7) · ตัวห่อ client ส่ง `ref`/`onScroll`/`style` และ `linkClassName="snap-start"` | ผู้เรียกเต็มขอบมีคนเดียว · VFG:143-148 ต้องหา `data-asset-status-tabs` และ `tests/asset-register-filter-ui.test.ts:109` ต้องหา `mb-2 … md:mb-3` · การเลื่อนไปแท็บที่เลือกและตัวบอกเลื่อนของ 2 แถวคงอยู่ในไฟล์ห่อ (`tests/asset-detail-tabs.test.ts:15-20`, VFG:114, `tests/report-controls-ui.test.ts:19-27`) · ถ้า 2B-4 เปลี่ยนวิธีจับแท็บที่เลือก `asset-detail-tabs.test.ts:18` แก้ใน commit นั้น |
| I10 | สลับ "งานทั้งหมด/งานของฉัน" ของ work-center | สังเคราะห์ข้อ 1 แถว 10 · ข้อ 5.6 · ข้อ 8.9 ให้ `Segmented` (ข้อ 5 ห่อ client + `router.push`) · R-g ให้ `Segmented` เฉพาะสถานะที่ไม่เปลี่ยน URL | **`TabNav`** 2 รายการ (`aria-label={t("viewNavigation")}` key ใหม่) แทน `WorkCenterViewLink` (`D/work-center/page.tsx:371-386`) · คงข้อความอธิบาย `:387-391` | ตัวสลับเปลี่ยน URL (`buildWorkCenterHref`) จึงเป็นลิงก์ตาม R-g · ไม่ต้องมี client component · Ctrl+คลิกและไม่มี JS ยังใช้ได้ · R-a ไม่ถูกละเมิดเพราะไม่ใช้ `Segmented` |
| I11 | แผงเลือกยี่ห้อ | ข้อ 5.3: รายการลิงก์แนวตั้ง `aria-current` คงไว้ · ข้อ 9.5 แถว `master-data-brand-supplier-ui.test.ts:22`, `:40`, `:44` ว่า "แผงยี่ห้อ → TabNav · ลิงก์นับ → linkVariants" และ KEEP LN1 = 0 | **ข้อ 5.3** · LFG `KEEP.LN1` เพิ่ม `D/master-data/brands/page.tsx: 2` · ลิงก์นับในเซลล์คง class เดิม · pin `:22`, `:40`, `:44` ผ่านโดยไม่แก้ · แก้แค่ `:9-10` | `TabNav` เป็นแถวแนวนอน · `aria-current="page"` บนรายการเลือกแนวตั้งถูกความหมาย · ไม่มีส่วนไหนสเปกหน้าตาลิงก์นับใหม่ |
| I12 | หน้าไหนอยู่ plan ไหน | ข้อ 3.9, 4.4.6, 5.6, 6.5 วาง data-quality (+ O3) และ integrations ใน 2B-5 · builder (R-f) ใน 2B-5 (สังเคราะห์) · ข้อ 8.3 ย้าย | **ตามข้อ 8.3:** `D/admin/data-quality/page.tsx` + `c/admin/asset-state-review-workspace.tsx` + หัว `D/admin/integrations/page.tsx` → **2B-2** · `c/admin/depreciation-policy-builder.tsx` → **2B-1** · route ในตารางข้อ 5.2: 2B-1 9 · 2B-2 11 · 2B-4 3 · 2B-5 11 (ทะเบียนของ 2B-3 ไม่อยู่ในตารางนั้น) | 2C-4 แก้ `D/admin/data-quality/page.tsx:146` (C/04:262) · 2C-5 แก้ข้าง `D/admin/integrations/page.tsx:52` (C/05:264) · 2B-5 ทำพร้อม 2C-4/2C-5 จึงห้ามมีสองหน้านี้ · builder เป็นไฟล์ 2C ที่ย้ายแล้ว แตะได้ตอนไม่มี plan ของ 2C เปิด (R-e) |
| I13 | h1 ในไฟล์ของ 2C | ข้อ 8.5/8.13 ข้อ 3: 2B-1 เปลี่ยนแค่ class ใน 8 ไฟล์ รวมเครื่องมือชุด 4 สองไฟล์ · ข้อ 4.4.3/4.4.6: `audit-round-form` ใน 2B-2 · ฟอร์มงาน 5 ไฟล์ใน 2B-5 · ข้อ 9.9 ข้อ 7 | **6 ฟอร์มย้ายเป็น `PageHeader` ใน 2B-1** (`checkin`, `checkout` (หัวใน `OperationShell`), `transfer`, `bulk-move`, `audit-round-form`, `asset-batch-form`) ไฟล์ละ 1 commit · **`asset-scan-search-tool.tsx`, `asset-label-batch-tool.tsx` ไม่แตะ** → 2C plan 4 ใช้ `PageHeader` (เขียนลง DH) · login เฟส 3 · หน้าพิมพ์คง 700 | รั้วข้อ 2 ยอมให้แตะไฟล์ชุด 4 แค่หัว O16 ของ `admin-user-form`/`role-permission-form` · 2B-1 เป็นช่วงเดียวที่ไม่มี plan ของ 2C เปิด · แตะไฟล์ครั้งเดียว |
| I14 | `PageHeader` ประจำไฟล์ของ my-assets | ข้อ 4.4.2/4.8 ข้อ 24 ให้เปลี่ยนชื่อเป็น `MyAssetsHeader` ใน 2B-1 · ข้อ 9.4.1 ลด LH2/LN2 ใน 2B-1 | **ไม่แตะใน 2B-1** · 2B-5 แทนด้วย `PageHeader` กลางและลบ `function PageHeader` (`D/my-assets/page.tsx:163-170`) ใน commit เดียว | ฟังก์ชันประจำไฟล์ไม่ชนกับของกลางจนกว่าหน้าจะ import ของกลาง (2B-5) · R-h ได้ผลเมื่อตัวประจำไฟล์หาย · 2B-1 ไม่ต้องแตะไฟล์ของ 2B-5 · LH2/LN2 ต่อ plan ตามตาราง C ข้อ 10.4 |
| I15 | guard อยู่ที่ไหน | ข้อ 4.11: `tests/page-frame-guards.test.ts` G1–G4 ใน 2B-4/2B-5 · ข้อ 5.14: ข้อ "ไม่มี" ใน `list-pages-ui` · ข้อ 6.13 ข้อ 9 ใน `list-filters-ui` · ข้อ 9.3: ไฟล์เดียว | **LFG ไฟล์เดียว** ตามข้อ 9.3 สร้างในงาน 1 ของ 2B-1 · `BUDGETS` = ค่าที่ HEAD (ตาราง C ข้อ 10.4) + LB1 `0→1` 2 แถว · `KEEP` ตามข้อ 9.4.3 + I11 + I14 · ทุก commit ที่ย้ายไฟล์ลดแถวของตัวเอง · 2B-5 ล็อก `BUDGETS = KEEP` | budget ลดทีละ commit ดีกว่าล็อกท้าย plan · 2C ไม่ต้องแก้ไฟล์นี้ (ลดได้อย่างเดียว) · ค่าเริ่มนับซ้ำแล้ว (ข้อ 10.8) |
| I16 | test ของ primitive อยู่ไฟล์ไหน | ข้อ 4.11 `page-header-ui` · ข้อ 6.13 ข้อ 1, 3, 4 · ข้อ 3.21 `list-primitives-ui` | string ของ primitive ทุกตัว (รวม `PageHeader`, `PageBackLink`, `MasterDataSearch`) อยู่ `tests/list-primitives-ui.test.ts` · `RowActions` อยู่ `tests/row-actions-ui.test.ts` · `tests/list-filters-ui.test.ts` เก็บแค่การใช้ในหน้า (ข้อ 6.13 ตาราง B ข้อ 2, 5–8) · `tests/list-pages-ui.test.ts` เก็บแค่ข้อ "มี" และตรวจ `<RowActions` แทน `MasterDataRowActions` | string มีเจ้าของที่เดียว (ข้อ 9.9 ข้อ 4) · ข้อ "ไม่มี" เป็นของ LFG |
| I17 | pin `hiddenInputs` และ return href | ข้อ 3.16, 6.3.5, 8.15 ว่า `operational-return-navigation.test.ts:69`, `:83` ผ่านต่อ · ข้อ 5.14, 9.5 ว่าแก้ | ไม่ขัดกัน แค่คนละ plan: **2B-1 ผ่านโดยไม่แก้** (API ของ `MasterDataSearch` คงเดิม) · **2B-2 แก้** `tests/operational-return-navigation.test.ts:54`, `:66`, `:69`, `:81-83` และ `tests/audit-pending-mobile-ux.test.ts:8`, `:15` โดยต่อท้ายส่วน `pageSize`/`page` ไม่ลบส่วนเดิม | B4 ต้องพา `page`/`pageSize` ในฟอร์มค้นหาและ href ตัวเอง |
| I18 | `tests/reports-adaptive-ui.test.ts:24-26` | ข้อ 5.14 แก้ · ข้อ 6.13 คง | **คง** (ข้อ 6 ถือแผงตัวกรอง · กริดและ hidden เดิม) | ข้อ 9.9 ข้อ 9 |
| I19 | `tests/disposal-route-structure.test.ts:33` (`/ArrowLeft/`) | ข้อ 8.5 งาน 22 ว่าผ่านต่อ · ข้อ 4.11, 9.5 แก้ | **แก้ใน 2B-1** → `/<PageBackLink href=\{returnToHref\}/` | `ArrowLeft` ย้ายเข้า `ui/page-header.tsx` |
| I20 | `QuickFilterBar` ของ rounds | ข้อ 5.4: คงชื่อเป็นตัวห่อบาง · ข้อ 9.5: ลบฟังก์ชันและแก้ `audit-rounds-ux.test.ts:11`, `:38-39` | **คงตัวห่อบาง** (ข้อ 5) · แก้แค่ `tests/audit-rounds-ux.test.ts:39` → `/<TabNav\b[\s\S]*?scroll=\{false\}/` · `:11`, `:38` ผ่านต่อ | แก้ test น้อยที่สุด · `TabNav` ส่ง `scroll` ต่อให้ `Link` (R-g) |
| I21 | รายละเอียด B4 | ข้อ 5 ข้อเสนอ 1, 2, 3, 5, 6 ยังไม่มีใครรับ | รับทั้ง 5: ค่าตั้งต้น 25 ทุกรายการ ตัวเลือก 25/50/100 · ประวัติการอนุมัตินับยอดเต็มด้วย `groupBy` อ่านอย่างเดียว · `/audit/rounds` ตัดหน้าในหน่วยความจำ (query เดิม) · ปุ่มในแถวของ findings และ PM คงในเซลล์ (dialog ของ 2C ไม่มี handle) · หน้าเกินหน้าสุดท้าย `redirect()` ไปหน้าสุดท้ายทุกรายการที่ย้ายไป `Pagination` (rounds ใช้ clamp) | ตรง R-k · กล่องตัวเลขต้องตรงกับยอดของตัวแบ่งหน้า · ตัวกรองมุมมองของรอบอยู่ใน JS (`filterRoundsByView` `D/audit/rounds/page.tsx:857-875`) · R-m เปิด dialog ด้วย handle เท่านั้น · ข้อมูลหลักวันนี้แสดงตารางว่างกับ "หน้า N จาก N" |
| I22 | `returnTo` ที่ปลายทางทิ้ง (ข้อ 5.12 ข้อเสนอเปิด `allowedPaths`) | ข้อ 5 เสนอใน 2B-2 · ไม่มีส่วนอื่นรับ | **ไม่ทำใน 2B** · บันทึกใน wiki เป็นงานเฟส 3 | `normalizeOperationalReturnTo(locale, "disposal", rawSearchParams.returnTo)` ถูก pin ตรงตัว (`tests/disposal-route-structure.test.ts:32`, `tests/operational-return-navigation.test.ts:42`) · `normalizeInternalReturnTo` เทียบ pathname ตรงตัว (`src/lib/operational-return-navigation.ts:37-45`) จึงรับ `/maintenance/<id>` ไม่ได้โดยไม่เพิ่มตรรกะ · วันนี้สองหน้านี้ก็กลับไป `/disposal` อยู่แล้ว (B2 "เหมือนเดิม") |
| I23 | ขนาดและกรอบของตัวกรอง (ข้อ 6 ข้อเสนอ 1, 2) | R-l 40 กับ B3(4) 36 · B3(4) "ไม่มีกรอบ" ใช้กับแผงที่มีป้ายด้วยหรือไม่ | ตามข้อ 6.2 6-ก และ 6-ข: **แถบเครื่องมือ** (ไม่มีป้ายที่เห็น: `MasterDataSearch` 6 หน้า + ทะเบียน) `md` 36 ไม่มีกรอบ · **แผงตัวกรองที่มีป้าย** `lg` 40 อยู่ใน `FilterPanel` (มีกรอบ) | B3(4) ตอบ Q3.4 ซึ่งถามเรื่องแถบเครื่องมือของทะเบียน · ช่องที่มีป้ายอยู่แถวเดียวกับปุ่ม `lg` (A/04:232) · แจ้งผู้ใช้ (ข้อ "รับทราบ" ท้ายตาราง) |
| I24 | ชิปที่ข้อ 6 เสนอ | ข้อ 6 ข้อเสนอ 3–5 | รับ: findings มีชิปรอบ/ประเภทใน **2B-2** (หารอบด้วย `findUnique` อ่านอย่างเดียว · key `auditFinding.activeFilters`) · รายงานลบลิงก์ล้างของชิปและลบ `c/reports/report-active-filters.tsx` (2B-5) · ซ่อมบำรุง: ชิป "เฉพาะทรัพย์สินนี้" ลบแค่ `assetId` และฟอร์มส่ง `pageSize` (2B-2) | DS:505 ชิปทุกตัวกรองที่มองไม่เห็นบนจอ · ไม่มีคำสั่งชื่อเดียวกันสองตัวติดกัน · ตัวกรองอื่นไม่หาย |
| I25 | ปุ่มกลับของ `/maintenance/pm` (ข้อ 4.8 ข้อ 25) | B2 พูดถึงหน้าที่มีปุ่มกลับอยู่แล้ว | **เพิ่มใน 2B-2:** `` back={<PageBackLink href={`/${locale}/maintenance`} label={tCommon("back")} />} `` · ลบไอคอนใน h1 (`D/maintenance/pm/page.tsx:42-43`) | หน้านี้มีเส้นทางนำทาง (`:38`) แต่ไม่มีปุ่มกลับ จึงขัด DS:573 ("the page keeps its back button") อยู่แล้ว · ไม่อยู่ในเมนู · แจ้งผู้ใช้ |
| I26 | เรื่องย่อยของทะเบียน (ข้อ 7 ข้อเสนอ 1, 3, 4, 6) | ข้อ 8.7 เขียน "แถวคงราว 36" และ "ความกว้างคอลัมน์รหัส" | รับข้อ 7: `actions` 172 + `companyBranch` 116 (ชุด operations และ accounting 1,116 ≤ 1,117 · `tests/asset-register-view-model.test.ts:164` 1094 → 1116) · `busy` บนปุ่ม "แสดง N รายการ" · คอลัมน์ "CODE - ชื่อ" ไม่ห่อ `tag` (เฟส 3) · ปุ่มเรียง `ghost` + `md:` ทับ · ปุ่มช่วยเหลือ 24px · key `asset.noCustodian` · ข้อความ "แถวราว 36" ทุกที่เป็น "คง `px-3 py-2` (แถวจริง 56 เพราะรูปย่อ 40)" | ความกว้างตรวจซ้ำแล้ว (`recount10.mjs`) · ไม่มีส่วนอื่นค้าน |
| I27 | ไอคอนไม่ซ้ำ (B1) | ข้อ 4.8 ข้อ 1 และข้อ 8.13 ข้อ 10 ถามว่าทั้งเมนูหรือหมวดเดียว | **ทั้งเมนู** · เปลี่ยน 10 ตำแหน่งตามข้อ 4.2.2 · 39 ตำแหน่ง 39 ชื่อ · `KeyRound` คง (`tests/integration-api-client-admin.test.ts:120`) | แถบย่อแสดงแค่ไอคอน · ที่ HEAD ซ้ำ 8 ชื่อ 19 ตำแหน่ง |
| I28 | skeleton กล่องตัวเลข | ข้อ 4.7 `bg-border-soft` · `sm:grid-cols-2 xl:grid-cols-4` · ข้อ 3.13 `StatStrip` ใช้ `bg-border` · 2 คอลัมน์ต่ำกว่า `lg` | `MetricGridSkeleton`: `grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none` · เซลล์ `space-y-2 bg-surface px-4 py-3 md:px-5 md:py-4` | skeleton ต้องตรงหน้าจริง (F:42) |
| I29 | ไฟล์ที่ไม่ใช่โค้ดที่คู่สายท่อแก้ทั้งคู่ (ข้อ 8.13 ข้อ 1) | B7 ยกเว้นแค่ DS และ VFG | ยอม `messages/{th,en}.json`, DH, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `.impeccable/design.json` ภายใต้กฎ rebase ข้อ 8.2 · **ต้องให้ผู้ใช้ยืนยัน** · ถ้าไม่ยอม: งานข้อความและเอกสารของ plan ที่ทำพร้อมคู่เลื่อนไปหลังคู่ merge | ทุก plan ต้องเขียน DH และ changelog · 2C-4/2C-5 เพิ่มข้อความ |
| I30 | `.env` ของ worktree 2C (ข้อ 8.13 ข้อ 7) | — | controller คัดลอกไฟล์โดยไม่เปิดดู · ห้าม `.env.prod-admin` · **ต้องให้ผู้ใช้ยืนยันครั้งแรกใน plan 2C-3** | `.env` เป็นไฟล์ค่าลับ (AGENTS.md) · ไม่มีไฟล์ `next build` เก็บข้อมูล route ไม่ได้ |
| I31 | งาน V เริ่มเมื่อไร (ข้อ 8.13 ข้อ 9) | C:210 "หลังชุด 1 อยู่บน Production" ใช้ไม่ได้แล้วเพราะ B9 | เสนอ: หลัง 2D merge แล้ว deploy ครั้งเดียว · **ผู้ใช้ตัดสิน** | V แก้ฟอร์มที่ 2D กวาดแผงฟอร์ม (K28, O15) |
| I32 | เรื่องย่อยของโครงหน้า (ข้อ 4 ข้อเสนอ 2, 5) | ไม่มีส่วนค้าน | รับ: h1 ของใบซ่อมและคำขอตัดจำหน่ายเป็นชื่อทรัพย์สิน · ชุดตัดจำหน่ายเป็นรหัส `tag font-medium` · ราก `space-y-6` (ทะเบียนคง `mb-4 md:mb-6` · `audit/rounds/[id]` ใช้ `className="mb-6"`) · หัวจัดการส่วนควบไม่ sticky · `role-permission-form.tsx:125` ใช้ `isCreate ? t("createTitle") : t("editTitle")` (key มีแล้ว "เพิ่มบทบาท") | A/08:331 · หน้าสร้างบทบาทวันนี้เขียน "แก้ไขสิทธิ์บทบาท" |
| I33 | ข้อความของ `Pagination` และ ⋯ | ข้อ 3.17 "แสดง {from}–{to} จาก {total} รายการ" · "จำนวนรายการต่อหน้า" · "การดำเนินการอื่นของ {code}" · ข้อ 5.11 ข้อความตัวบอกเลื่อนอีกแบบ | ใช้คำเดียวกับของทะเบียนที่มีอยู่ (ตารางข้อความข้างล่าง): ช่วงแถว = `asset.registerRange` · จำนวนต่อหน้า = `asset.pageSizeLabel` · ⋯ = `asset.rowActionsMenu` · ตัวบอกเลื่อน = ประโยคแรกของ `asset.tableScrollHint` | ทะเบียนกับหน้ารายการอื่นอ่านเหมือนกัน · ท้ายตารางมี "หน้า x จาก y" และ "แสดง" (`common.rowsPerPage`) อยู่แล้ว คำว่า "แสดง" จึงไม่ซ้ำ |
| I34 | guard ช่องดิบในฟอร์มกรอง | ข้อ 6.13 ตาราง B ข้อ 9 (ไม่มีช่องดิบใน `src/app`) ย้ายเป็น LFG LF1 ตาม I15 · LF1 นับแค่ `function FilterSelect…` · ช่องดิบตรวจที่ `list-filters-ui` ข้อ 5 ตามรายชื่อ `MIGRATED_FILTER_FILES` เท่านั้น | **ยอมช่องว่างนี้ใน 2B** · `MIGRATED_FILTER_FILES` ครบ 10 ไฟล์ของ `src/app` ใน 2B-5 · ช่องดิบใหม่ในไฟล์นอกรายชื่อไม่มี guard จนถึง 2D · เขียนใน DH หัวข้อ guard | 2D ขยาย guard ทุกตัวไปทั้ง `src` และตั้ง budget เป็น `{}` อยู่แล้ว (2A ข้อ 2 คอลัมน์ 2D) · ไม่ต้องเพิ่มตัวนับใหม่ที่ซ้ำกับงานของ 2D |

**ข้อความใหม่หลังรวม** (ผ่าน `node scripts/messages-edit.mjs` · ตรวจกับ `messages/th.json`, `en.json` ที่ HEAD แล้ว ไม่มี key ไหนมีอยู่ · คำไทยตามกฎของ `tests/thai-glossary.test.ts` · ภาษาอังกฤษของข้อ 5 ร่างไม่ได้เขียน ส่วนนี้เสนอ · ยืนยันคำตอนรีวิวสเปก)

| plan · งาน | key | th | en |
|---|---|---|---|
| 2B-1 · 2 | ลบ `nav.assetRegistryGroup` | — | — |
| 2B-1 · 4 | `common.tableScrollHint` | เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม | Scroll left/right to see more columns. |
| 2B-1 · 5 | `common.showingRange` · `common.pageSizeLabel` | {from}–{to} จาก {total} รายการ · จำนวนต่อหน้า | {from}–{to} of {total} · Rows per page |
| 2B-1 · 7 | `common.moreActionsFor` | การดำเนินการของ {code} | Actions for {code} |
| 2B-2 | `repairRecord.activeFilters` · `.emptyFilteredTitle` · `.emptyFilteredHelp` · แก้ค่า `.emptyHelp` | ตัวกรองที่ใช้อยู่ · ไม่พบบันทึกการซ่อมที่ตรงกับตัวกรอง · ลองเปลี่ยนหรือล้างตัวกรอง · กด "บันทึกซ่อม" เพื่อเริ่มบันทึก | Active filters · No repair records match the filters · Change or clear the filters · Press "Record a repair" to add one |
| 2B-2 | `disposalPage.activeFilterCount` · `auditFinding.activeFilters` | ใช้ตัวกรอง {count} รายการ · ตัวกรองที่ใช้อยู่ | {count} filters on · Active filters |
| 2B-3 | `asset.noCustodian` | ไม่มีผู้ถือครอง | No custodian |
| 2B-5 | `notifications.type_info` · `type_warning` · `type_danger` · `type_success` | ทั่วไป · ควรติดตาม · เร่งด่วน · เรียบร้อย | General · Needs attention · Urgent · Done |
| 2B-5 | `systemLogPage.empty` · `systemLogPage.emptyFiltered` · `workCenter.viewNavigation` | ยังไม่มีบันทึกระบบ · ไม่พบบันทึกที่ตรงกับตัวกรอง · มุมมองงาน | No system log entries yet · No entries match the filters · Work view |

รวม key ใหม่ 17 (2B-1 = 4) · แก้ค่า 1 · ลบ 1

**ต้องให้ผู้ใช้ยืนยันก่อนเริ่ม plan ที่เกี่ยว:** I29 (ไฟล์ข้อความและเอกสารที่คู่แก้ทั้งคู่ · ก่อน 2B-3 ∥ 2C-3) · I30 (คัดลอก `.env` ไป worktree · ก่อน 2C-3) · I31 (ตำแหน่งงาน V · ก่อน 2D) · คำไทยของ 17 key

**แจ้งผู้ใช้ (ตัดสินตามกฎเดิม ไม่ต้องเลือก):** แผงตัวกรองที่มีป้ายยังมีกรอบ (I23) · หน้า PM มีปุ่มกลับใหม่ (I25) · รายการไม่ตรงมีชิปบอกรอบและประเภทที่กรองอยู่ (I24) · หน้าสร้างบทบาทเขียน "เพิ่มบทบาท" (I32) · สลับงานทั้งหมด/งานของฉันเป็นแท็บเส้นใต้ (I10)

### 10.3 ลำดับงาน plan 2B-1 (ของกลาง + ข้อมูลหลัก + ผู้ใช้ + เมนูข้าง + หัวฟอร์ม)

branch `feat/ui-phase2b` (= `d38a0ee`) · รอ: ไม่มี · ทำพร้อม: ไม่มี · ทุกงานจบด้วย `npm test` และ `npx tsc --noEmit` · ห้ามรัน formatter (ไฟล์ 2C 21 ไฟล์ในงาน 22–24) · commit ที่ย้ายตารางลบแถว R7 ของตัวเองใน VFG และลดแถว LFG ของไฟล์นั้น แล้วเพิ่ม path ใน `MIGRATED_LIST_FILES` ถ้า 2B ไม่แตะไฟล์อีก · ผู้ทำเลือกตอนส่ง plan (B10) · controller รีวิวทุกงาน

| # | งาน | ส่วน | ต้องรอ | test ที่แก้ (A) หรือเพิ่ม (B) |
|---|---|---|---|---|
| 0 | (controller) ตรวจฐานตามข้อ 8.10 ข้อ 1–7 · รัน `p2b-spec/work/10/recount10.mjs` และ `work/09/count09.mjs` เทียบข้อ 10.8 · baseline `npm test` (DH:467: 1,812 · ผ่าน 1,811 · ข้าม 1) · ภาพก่อนแก้ `.superpowers/sdd/screenshots/ui-phase2b-plan1/before/` | 8.10 · 10.8 | — | — |
| 1 | guard: VFG R7 รายไฟล์ (`TABLE_HEADER_FILLS` 31 แถว ข้อ 8.4) · สร้าง LFG (`BUDGETS` ตาราง C ข้อ 10.4 + LB1 `0→1` 2 แถว · `KEEP` ข้อ 9.4.3 + I11 + I14 · `MIGRATED_LIST_FILES = []` · test ตัวอย่างของตัวนับ) | 8.4 · 9.2–9.4 · I15 | 0 | A: VFG:249-254 · B: LFG |
| 2 | เมนูข้าง B1 (`c/layout/sidebar.tsx:115-166`, import `:7-40`, `depth` `:340`, `:347`, `:373-378`, `:389`) · ลบ key | 4.2 · I27 | 0 | B: `tests/sidebar-menu-structure.test.ts` (ข้อ 4.11) · ผ่านต่อ: `dashboard-shell-theme`, `navigation-active` (fixture `:49`), `permission-aware-navigation`, `my-assets-route-ui:35-45`, `integration-api-client-admin:117-122`, `sheet-drawers-ui:47-60`, `mobile-field-navigation-ui:59-80` |
| 3 | `c/ui/page-header.tsx` (`PageHeader`, `PageBackLink`) · `MasterDataHeader` เป็นตัวห่อบาง | 3.3 · 4.3 · I1 · I2 | 1 | A: `breadcrumbs-ui.test.ts:38-40` (R-i: นับ `<Breadcrumbs` และ `breadcrumbs={[…]}` ข้าม `page-header.tsx` · คง 11/8) · `asset-register-filter-ui.test.ts:112-119` (string ของ I1 + `compactOnMobile \? "mb-4 md:mb-6" : "mb-6"`) · `supplier-adaptive-ui.test.ts:58` (`href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}`) · B: `list-primitives-ui` หัวหน้า |
| 4 | `c/ui/data-table.tsx` (ทุก part · `TableEmptyRow` · ไม่มี `density`) · `c/ui/data-table-scroll.tsx` · `c/ui/clickable-table-row.tsx:56` · key `common.tableScrollHint` | 3.4–3.7 · I3 · I4 | 1 | B: `list-primitives-ui` ตาราง (ไม่มี `group-data-[density` และ `data-density`) · ผ่านต่อ: `clickable-table-row-navigation:6-18`, `asset-register-ux:95-100`, `:169-175` |
| 5 | ขยาย `c/ui/pagination.tsx` · `src/lib/list-pagination.ts` (`LIST_PAGE_SIZES`, `parseListPage`, `listPageWindow`, `lastListPage`, `appendListPage`) · key 2 ตัว | 3.8 · 5.9.1 · I21 · I33 | 4 | B: `list-primitives-ui` แบ่งหน้า · `tests/list-pagination.test.ts` · ผ่านต่อ: `asset-register-building-blocks-ui:8-17` (ไม่แก้) |
| 6 | `c/ui/filter-select.tsx` · `c/ui/filter-chips.tsx` · `FilterFormActions` ใน `c/ui/filter-panel.tsx` | 3.9–3.10 · 6.3.1–6.3.3 · I6 · I7 | 1 | B: `list-primitives-ui` ตัวกรอง · `tests/list-filters-ui.test.ts` ข้อ 2 |
| 7 | `c/ui/row-actions.tsx` · `export` 2 ค่าคงที่ใน `c/ui/dropdown-menu.tsx:16`, `:22` · key `common.moreActionsFor` | 3.11 · I5 | 4 | B: `tests/row-actions-ui.test.ts` · ผ่านต่อ: `menu-primitives-ui:60-103`, `dialog-trigger-handles`, `dropdown-menus-ui` |
| 8 | `c/ui/tab-nav.tsx` | 3.12 · I9 | 1 | B: `list-primitives-ui` แท็บ (มี `{...navProps}` หรือ `...props` บน `<nav` · ไม่มี `fullBleed`) |
| 9 | `c/ui/stat-strip.tsx` | 3.13 | 1 | B: `list-primitives-ui` ตัวเลข |
| 10 | `c/ui/key-value-list.tsx` | 3.14 | 1 | B: `list-primitives-ui` ค่า |
| 11 | `c/ui/content-panel.tsx` (`divided`, `flush`, `ContentPanelRows`) | 3.15 | 1 | B: `list-primitives-ui` แผง |
| 12 | `MasterDataSearch` → `SearchField` + `Button` (หน้าตาเปลี่ยนทันที 6 หน้า) | 3.16 · 6.3.5 · I8 | 3 | B: `list-primitives-ui` ค้นหา · ผ่านต่อ: `operational-return-navigation:69`, `:83` · `audit-pending-mobile-ux:14-15` |
| 13 | `D/master-data/branches/page.tsx` (DataTable · `TableEmptyRow` · `Pagination` + redirect เกินหน้า · ตัวกรอง · `RowActions` + ลบ `branch-delete-button.tsx` · `StatStrip` · `PageHeader` · `formatCount`/`Nil`/`tag`) | 5.3 · 6.5 · I5 · I21 | 2–12 | B: สร้าง `tests/list-pages-ui.test.ts` · `list-filters-ui` ข้อ 5–6 เพิ่มไฟล์ |
| 14 | `D/master-data/brands/page.tsx` (+ ลบ `brand-delete-button.tsx`, `asset-model-delete-button.tsx`) | 5.3 · I11 | 13 | A: `master-data-brand-supplier-ui.test.ts:9-10` · ผ่านต่อ `:11`, `:22`, `:40`, `:44`, `:80` |
| 15 | `D/master-data/categories/page.tsx` (+ ลบ wrapper) | 5.3 | 13 | — |
| 16 | `D/master-data/companies/page.tsx` (+ ลบ wrapper) | 5.3 | 13 | — |
| 17 | `D/master-data/departments/page.tsx` (+ B4 · ลบ wrapper) | 5.3 · 5.9 | 13 | B: `list-pages-ui` (`parseListPage`, ไม่มี `take: \d+`) |
| 18 | `D/master-data/employees/page.tsx` (+ ลบ wrapper) | 5.3 | 13 | — |
| 19 | `D/master-data/locations/page.tsx` (+ ลบ wrapper) | 5.3 | 13 | — |
| 20 | `D/master-data/suppliers/page.tsx` + `c/master-data/supplier-list-view.tsx` (+ ลบ wrapper) · 1 commit | 5.3 · 6.5 | 13 | A: `supplier-adaptive-ui.test.ts:16`, `:24`, `:29`, `:37-38`, `:46` (ตามข้อ 9.5) และย้าย `:58` ไปอ่านหน้า suppliers · ผ่านต่อ `:50-55` |
| 21 | `D/admin/users/page.tsx` (`next` อย่างเดียว · ไม่มี ⋯ · ปุ่มลอยคงไว้ R-q) | 5.3 | 13 | — |
| 22 | ปุ่มกลับ 15 + "ยกเลิก" 3 + h1 600 ของไฟล์เดียวกัน · 5 commit (ฟอร์มข้อมูลหลัก 9 · `admin-user-form` + `role-permission-form` (แตะแค่ `:112-134`, I32) · `asset-form` + `asset-component-manager` · `D/disposal/new` + `D/disposal/batch/new` · `D/maintenance/new`, `pm/new`, `pm/[id]/edit`) · คง `onClick={confirmNavigation}` ของ supplier | 4.4.2 · 4.5 · I1 · I19 | 3 | A: `disposal-route-structure.test.ts:33` · ผ่านต่อ: ตารางข้อ 4.5.6 · `supplier-form-ui:30-35` · ลิงก์ยกเลิกท้ายฟอร์ม 8 ไฟล์ · `asset-component-manager.test.ts` |
| 23 | หัว 5 ฟอร์มงานเป็น `PageHeader` (`checkin`, `checkout`, `transfer`, `bulk-move`, `audit-round-form`) ไฟล์ละ 1 commit | 4.4.6 · I13 | 3 | LFG LH1 |
| 24 | ไฟล์ 2C ที่ย้ายแล้ว ไฟล์ละ 1 commit: `system-settings-form` (`<thead` `:1269`, `:1973`, `:2006` + `Head` `:2669-2671` · ไม่แตะ `:948-967`) · `asset-batch-form` (`<thead` `:886`, `:979`, `:1037` + h1 `:610` เป็น `PageHeader`) · `depreciation-policy-builder` (`formatCount` แทน `:302` · ลบ `formatMoney` ประจำไฟล์ `:437`) | 9.2.1 · R-e · R-f · I12 · I13 | 4 | VFG R7 6 จุด · ผ่านต่อ: `asset-batch-form-layout:5-60`, `settings-depreciation-policy-ui`, `settings-tab-persistence-ui:5-13`, `settings-ldap-role-ui` |
| 25 | (controller) `npm run verify` + production build (`next build` + `next start`) + ตรวจบนแอป dev (ข้อ 10.5) | 10.5 | 24 | — |
| 26 | เอกสาร repo (ข้อ 10.6 แถว 2B-1) | 10.6 | 25 | — |
| 27 | (controller) ตัวเลข verify และผลตรวจลง DH/changelog · wiki (ปิดข้อ 28) · memory | 10.6 | 26 | — |

ราว 36 commit · ไฟล์โค้ด 53 (ใหม่ 10 · ของกลางเดิม 5 · เมนูและ layout 2 · หน้ารายการ 10 · หัวฟอร์มและหน้า new 18 · ฟอร์มงาน 6 · ไฟล์ 2C ที่ย้ายแล้ว 2) + ลบ 9 + `messages/{th,en}.json` · R7 44 → 29 · LFG ตามตาราง C

**plan ถัดไป** (plan ละ branch `feat/ui-phase2b-planN` จาก `master` หลัง plan ก่อน merge · งาน 0 นับใหม่ด้วย `recount10.mjs` · ไฟล์ละ 1 commit · จบด้วย verify + production build + ตรวจบนแอป dev + เอกสาร + wiki · ไม่ deploy)

- **2B-2 ตัดจำหน่าย ตรวจนับ ซ่อมบำรุง + data-quality, integrations** · 18 ไฟล์ตามข้อ 8.6 · B4 5 รายการ (findings, pending, batches, PM, rounds) · ส่วนรายการของไฟล์ร่วม 3 ไฟล์ (checkbox, ปุ่ม toolbar, `busy`) ไม่แตะ dialog · `RowActions` + handle ของ P0 ใน disposal และ pending · R1 `{}` ใน commit ของ `D/audit/rounds/page.tsx` (I20) · ชิป findings (I24) · ปุ่มกลับ PM (I25) · ไอคอนแถบล่าง `D/audit/rounds/[id]/page.tsx:479` · แก้ pin ตาราง A แถว 2B-2 · R7 29 → 17 · **ปลด 2C-3** (สถานะไฟล์ร่วมตามข้อ 8.6 ลง DH)
- **2B-3 ทะเบียน** · 14 ไฟล์ตามข้อ 8.7 + I3, I5, I6, I7, I9, I26 · ทำพร้อม 2C-3 · ไม่แตะ dialog `asset-register-table.tsx:697-774` และแถบคำสั่งกลุ่ม `:455` · แก้ pin ตามข้อ 7.17 ที่ปรับด้วยข้อ 10.9 · R7 คง 17 · **ปลด 2C-4** เมื่อ 2C-3 merge ด้วย (เลขบรรทัดใหม่ของ dialog และ `D/assets/page.tsx:451`, `import-export/page.tsx:82` ลง DH)
- **2B-4 หน้ารายละเอียดและ skeleton** · 14 ไฟล์ตามข้อ 8.8 · หัวและปุ่มกลับ 6 หน้า (`disposal/[id]` มีปุ่มกลับบนมือถือ) · `KeyValueList` · `pb-24` ซ้อน 3 หน้า · skeleton 5 ตัว (I28) · `asset-detail-tabs` ห่อ `TabNav` (I9) · ไม่แตะ padding O11 · R7 17 → 11 · **ปลด 2C-5** เมื่อ 2C-4 merge ด้วย
- **2B-5 admin รายงาน แดชบอร์ด แจ้งเตือน + ล็อก** · 25 ไฟล์ตามข้อ 8.9 ลบ data-quality/integrations (I12) · B4 3 รายการ (logs, history, my-assets) · `MetricCard` กลางเป็น `StatStrip` แล้วลบ `c/ui/metric-card.tsx` · work-center `TabNav` (I10) · `my-assets` ใช้ `PageHeader` กลาง (I14) · ลบ `MasterDataHeader`, `MasterDataPagination`, `SortableColumnHeader`, `ColumnHeader`, `ReportHeader` · ล็อก VFG R7 (test เดียว 3 แถว) และ LFG (`BUDGETS = KEEP` + test L9) · ทำพร้อม 2C-3/4/5 · **ปลด 2D** เมื่อ 2C-5 merge ด้วย

### 10.4 Test

**ตาราง A: test เดิมที่ต้องแก้** (แก้ใน commit ที่ทำให้พัง · regex ใหม่ในไฟล์ที่อ่าน CRLF ดิบห้ามมี `\n` · รายชื่อไฟล์ดิบในข้อ 9.6)

| plan | test:บรรทัด | แก้เป็น | งาน / ส่วน |
|---|---|---|---|
| 2B-1 | VFG:249-254 | `assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)` (ข้อ 9.2.2) | 1 |
| 2B-1 | `breadcrumbs-ui.test.ts:38-40` | R-i (ข้อ 9.5) · `:41` 11 และ `:42` 8 คงเดิม | 3 |
| 2B-1 | `asset-register-filter-ui.test.ts:112-119` | อ่าน `ui/page-header.tsx`: string ของ I1 (`compactOnMobile\?: boolean` · `"max-md:text-xl"` · `"max-md:hidden"` · แถว compact) + `master-data-layout.tsx` `compactOnMobile \? "mb-4 md:mb-6" : "mb-6"` | 3 |
| 2B-1 | `supplier-adaptive-ui.test.ts:58` (งาน 3) · `:16`, `:24`, `:29`, `:37-38`, `:46` และย้าย `:58` ไปอ่านหน้า suppliers (งาน 20) | ตามข้อ 9.5 แถว 2B-1 | 3, 20 |
| 2B-1 | `master-data-brand-supplier-ui.test.ts:9-10` | `/<PageHeader[\s\S]*href=\{createModelHref\}/` · `/\{t\("createModel"\)\}/` | 14 |
| 2B-1 | `disposal-route-structure.test.ts:33` | `/<PageBackLink href=\{returnToHref\}/` | 22 |
| 2B-2 | VFG:227-230 · `audit-rounds-ux.test.ts:39` · `audit-round-result-drilldown.test.ts:138` · `maintenance-pagination-ui.test.ts:5-14`, `:16-19` · `disposal-route-structure.test.ts:10`, `:18`, `:22-26` · `audit-pending-mobile-ux.test.ts:8`, `:15`, `:30` · `operational-return-navigation.test.ts:54`, `:66`, `:69`, `:81-83` · `pm-plans-ui.test.ts:17` · `disposal-queue-ux.test.ts:43-51` · `disposal-bulk-approval.test.ts:92` · `disposal-bulk-execution-ui.test.ts:33` | ตามข้อ 9.5 แถว 2B-2 · `:39` ของ rounds ตาม I20 · return-nav ต่อท้าย ไม่ลบส่วนเดิม (I17) · `repair-record-list-ui.test.ts:27` แก้เฉพาะถ้าลิงก์ทรัพย์สินค้างเปลี่ยนเป็น `buttonVariants` | 2B-2 |
| 2B-3 | ตามข้อ 7.17 ที่ปรับแล้ว (ข้อ 10.9) + `asset-register-filter-ui.test.ts:58-59`, `:79-82` (I6, I7) · `asset-register-table-ui.test.ts:13-25` และ `dropdown-menus-ui.test.ts:27-38` ตรวจพฤติกรรมเดิมที่ `ui/row-actions.tsx` (I5) · VFG:143-148 · VFG:270 comment | ข้อ 7.17 · I5–I7 | 2B-3 |
| 2B-4 | `asset-detail-ux.test.ts:27`, `:39-40`, `:151-152` · `disposal-detail-workspace.test.ts:33` · `supplier-detail-ui.test.ts:21-23` (+ `:28-30` ถ้า literal หาย) · `mobile-field-navigation.test.ts:14-33` เพิ่ม `"/th/my-assets/asset-1"` · `asset-detail-tabs.test.ts:18` ถ้าจำเป็น (I9) | ข้อ 9.5 แถว 2B-4 (`PageBackLink`) | 2B-4 |
| 2B-5 | VFG:233-254 (test เดียว 3 แถว) · VFG:64, :90 (+ `existsSync` ที่ `:2`) · `storage-archive-ui.test.ts:16` · `report-controls-ui.test.ts:5`, `:8-11`, `:13-17` · `reports-adaptive-ui.test.ts:88`, `:143` | ข้อ 9.2.2 · 9.2.3 · 9.5 แถว 2B-5 | 2B-5 |

**ตาราง B: test ไฟล์ใหม่**

| ไฟล์ | ตรวจ | เจ้าของ | plan · งาน |
|---|---|---|---|
| `tests/list-frame-guards.test.ts` | LH1–LR1 (19 ข้อ) · L0 · test ตัวอย่างของตัวนับ · 2B-5 เพิ่ม L9 (`BUDGETS` = `KEEP`) | ข้อ 9.3 · I15 | 2B-1 · 1 → ทุก commit → 2B-5 |
| `tests/sidebar-menu-structure.test.ts` | รายการแรก `/assets` · ลำดับ labelKey ของหมวด · ลึก ≤ 2 · ไอคอน 39 ชื่อไม่ซ้ำ · ไม่มี `assetRegistryGroup` | ข้อ 4.11 · I27 | 2B-1 · 2 |
| `tests/list-primitives-ui.test.ts` | server-safe · class ร่วมต้องห้าม · หัวหน้า (string ของ I1) · ตาราง (ไม่มี `density`, I3) · แบ่งหน้า · ตัวกรอง (I6, I7: `aria-label` ของชิปมี `${removeLabel}: ${chip.label}`) · แท็บ (I9) · ตัวเลข · ค่า · แผง · ค้นหา (I8) | ข้อ 3.21 ตาราง C + ข้อ 10.9 | 2B-1 · 3–12 |
| `tests/row-actions-ui.test.ts` | ข้อ 3.21 · หัว sheet `tag font-medium` (I5) | ข้อ 3.21 | 2B-1 · 7 |
| `tests/list-pagination.test.ts` | ตัวช่วย B4 · 2B-2 เพิ่ม `planStatePageSlices` | ข้อ 5.14 | 2B-1 · 5 · 2B-2 |
| `tests/list-filters-ui.test.ts` | ข้อ 6.13 ตาราง B ข้อ 2, 5–8 · ไฟล์ชิปชื่อ `filter-chips.tsx` | ข้อ 6.13 · I16 | 2B-1 · 6 → 2B-5 |
| `tests/list-pages-ui.test.ts` | ข้อ "มี" ต่อหน้า: `<DataTable`, `parseListPage`, `<RowActions`, `<TabNav` ของ logs, approvals ×2, work-center (I10) | ข้อ 5.14 · I16 | 2B-1 · 13 → 2B-5 |
| `tests/approval-decision-log.test.ts` (มีหรือสร้าง) | where ตามสิทธิ์ · ตัวนับเท่าของเดิม | ข้อ 5.14 | 2B-5 |

**ตาราง C: ค่าเริ่มของ guard ที่ HEAD และหลังแต่ละ plan** (นับซ้ำด้วย `p2b-spec/work/10/recount10.mjs` ซึ่งใช้ regex ข้อ 9.3 ตรงตัวและดึง regex R1/R7/R2 จาก VFG · ค่าต่อ plan ตามรายการไฟล์ข้อ 8 + I12 · ตัวที่ต่างจากข้อ 9.4.3 เป็นตัวหนา)

| guard | ที่ HEAD (จุด / ไฟล์) | หลัง 2B-1 | 2B-2 | 2B-3 | 2B-4 | 2B-5 = KEEP |
|---|---|---|---|---|---|---|
| R1 `TONE_OPACITY` | 1 / 1 | 1 | 0 (`{}`) | 0 | 0 | 0 |
| R7 `NEUTRAL_FILL_OPACITY` | 44 / 31 (ทุกจุดอยู่บน 41 บรรทัดที่มี `<thead`) | 29 / 20 | 17 / 11 | 17 / 11 | 11 / 8 | 3 / 3 (ชุด 4 ของ 2C) |
| R2 `SURFACE_SHADOW` | 10 / 9 | 10 | 10 | 10 | 10 | 10 |
| LH1 `<h1>` | 60 / 60 | 34 | 25 | 24 | 18 | 6 |
| LH2 หัวเก่า | 27 / 15 | **11** | **7** | **5** | **5** | 0 |
| LB1 `<ArrowLeft` | 27 / 27 | 12 | 11 | 11 | 7 | 7 |
| LP1 `pb-24`/`pb-36` | 8 / 8 | 8 | 7 | 7 | 4 | 4 |
| LF1 select ประจำไฟล์ | 10 / 10 | 3 | 2 | 1 | 1 | 0 |
| LT1 หัวตารางทึบ/ตัวพิมพ์ใหญ่ | 43 / 17 | 36 | 36 | 34 | 23 | 7 |
| LT2 หัวเรียงเขียนเอง | 8 / 8 | 2 | 2 | 1 | 1 | 0 |
| LT3 `<td colSpan>` | 16 / 15 | 8 | 3 | 2 | 2 | 0 |
| LT4 แบ่งหน้าเขียนเอง | 11 / 11 | 4 | 1 | 1 | 1 | 0 |
| LT5 ปิดใช้ด้วยความจาง | 23 / 12 | 9 | 3 | 3 | 2 | 0 |
| LV1 `.toLocaleString()` | 44 / 17 | 20 | 19 | 19 | 15 | 8 |
| LV2 `"-"` | 128 / 43 | 113 | 98 | 97 | 73 | 68 |
| LV3 `formatCurrency(` | 42 / 13 | 42 | 36 | 35 | 16 | 6 |
| LS1 กล่องตัวเลขประจำไฟล์ | 30 / 27 | 23 | 17 | 17 | 14 | 5 |
| LS2 `<MetricCard` | 20 / 6 | 20 | 20 | 20 | 15 | 0 |
| LK1 key-value ประจำไฟล์ | 11 / 11 | 11 | 8 | 7 | 1 | 1 |
| LN1 `aria-current="page"` นอก primitive | 13 / 11 | **12** | **6** | **5** | **4** | **2** (แผงยี่ห้อ I11) |
| LN2 ชื่อชนของกลาง | 7 / 7 | **7** | **7** | **7** | **5** | 1 |
| LR1 `<…DeleteButton id=` | 10 / 8 | 0 | 0 | 0 | 0 | 0 |

**ตาราง D: ต้องผ่านต่อโดยไม่แก้** ใช้ข้อ 9.6 ทั้งตาราง และเพิ่ม: `master-data-brand-supplier-ui.test.ts:22`, `:40`, `:44` (I11) · `audit-rounds-ux.test.ts:11`, `:38` (I20) · `reports-adaptive-ui.test.ts:13-27` (I18) · `operational-return-navigation.test.ts:69`, `:83` และ `audit-pending-mobile-ux.test.ts:14-15` ตลอด 2B-1 (I17) · `confirm-dialog-ui.test.ts:36` (I5) · `tests/disposal-route-structure.test.ts:32` และ `operational-return-navigation.test.ts:42` (I22) · FMG ทั้งไฟล์ · `tests/design-tokens-contrast.test.ts` · `tests/dialog-trigger-handles.test.ts`

### 10.5 ตรวจบนแอป dev ของ 2B-1 (งาน 25)

**ก่อนเริ่ม:** รีสตาร์ต dev server · `npm run verify` ผ่าน · ดูบน production build (`next build` + `next start` ที่ 3001) · `.env` ชี้ `asset_management_dev` / `asset_dev` (อ่านชื่อ key ไม่พิมพ์ค่า) · ไม่มี migration ไม่มี env ใหม่ · ภาษาไทยเป็นหลัก อังกฤษ 1 รอบ · zoom 100% และ 200%

**ไม่เขียนอะไรลง DB:** ลบผ่าน ⋯ เปิด dialog ยืนยันแล้วกด "ยกเลิก" ทุกครั้ง · ไม่กดบันทึกในฟอร์ม · ฟอร์มผู้ขายลองแค่คำถามก่อนทิ้งที่แก้ (ยกเลิก) · query นับของ departments อ่านอย่างเดียว

**ความกว้าง:** 1440 · 1366 และ 1280 (กริดตัวกรองของ categories, employees) · 1024 (แถบล่างกับหัวแบบแถว) · 768 · 700 (ช่วง 640–767) · 375

| หน้า | ดูอะไร | มาจาก |
|---|---|---|
| เมนูข้าง | 1440 กางและพับ · 1024 · 375 (drawer) · บัญชีที่มีแค่ `asset:view` และบัญชีผู้ดูแล: "ทะเบียนทรัพย์สิน" รายการแรก คลิกเดียวถึง `/th/assets` · ส่งมอบ/รับคืน 2 คลิก · ไม่มีชั้นที่ 3 · ไอคอนไม่ซ้ำตอนพับ · แถวที่เลือกถูกที่ `/th/assets/<id>`, `/th/assets/new`, `/th/asset-management/checkout` · drawer คืนโฟกัส · ข้อความ "สแกน/ค้นหาทรัพย์สิน" ไม่ล้นที่ 375 | 4.2 · I27 |
| ข้อมูลหลัก 8 หน้า · `/th/admin/users` | h1 600 · แผงตัวกรองมีป้าย 40 (มือถือ 44) "ล้างตัวกรอง" ขึ้นเฉพาะตอนมีตัวกรอง · หัวตารางพื้นขาว 13/500 สีจาง ไม่ uppercase มุม 12 · แถวราว 46 · ขอบซ้ายขวา 16/20 · "แก้ไข" 120 + ⋯ → "ลบ" → ยืนยัน (ยกเลิก) · คลิกแถวไปหน้าแก้ไข · คลิก ⋯ และรายการในเมนูไม่ทะลุแถว · แถวค้างสีตอนเมนูเปิด · มือถือ ⋯ เป็น sheet ล่าง รายการ 44 · เลื่อนแนวนอนมีตัวบอกเฉพาะตอนล้น · ท้ายตาราง "1–25 จาก N รายการ · หน้า 1 จาก M" + 25/50/100 + ก่อนหน้า/ถัดไป · หน้าเกินขอบพาไปหน้าสุดท้าย · `StatStrip` ไม่มีพื้นสี ช่องที่เป็นตัวกรองมีพื้น `primary-soft` + เส้นใต้ · รหัสเป็นตัว mono ลากเลือกได้ทั้งรหัส (คลิกที่รหัสยังเปิดหน้าแก้ไข ข้อ 7.14 ข้อ 4) · เลข th-TH | 5.3 · 6.5 · I3 · I5 |
| `/th/master-data/departments` | B4: ยอดรวมเท่าจำนวนแผนกก่อนแก้ · หน้า 2 → แก้ไข → "กลับ" ได้หน้า 2 ขนาดเดิม · ค้นหาแล้วขนาดหน้าคงเดิม | 5.9 · I21 |
| `/th/master-data/brands` | แผงยี่ห้อเป็นรายการแนวตั้งเดิม · ยี่ห้อที่เลือก: "แก้ไขยี่ห้อ" + ⋯ ลบ · ปุ่มหัว 4 ปุ่มขึ้นบรรทัดใหม่ที่ 768 | I5 · I11 |
| หน้าที่ของกลางเปลี่ยนก่อน plan ของหน้า | `/th/assets`: หัว (600, ปุ่มสร้าง 36) · ท้ายตารางไม่มีลูกศร ข้อความอยู่ซ้าย · แถวค้างสีตอนโฟกัส · `/th/audit/findings`, `/th/audit/rounds`: หัวจากตัวห่อบาง · ช่องค้นหาไม่มีกรอบ 36 ใน 6 หน้า (`users`, `departments`, `findings`, `rounds`, `rounds/<id>`, `rounds/<id>/pending`) · ตัวอย่างแถว `ClickableTableRow` ใน disposal และ maintenance (checkbox ในแถวไม่ทำให้สีค้าง) | 3.19 ข้อ 1–3 · I2 · I8 |
| หน้าแก้ไข/สร้าง 18 จุด | ปุ่มกลับ outline + ลูกศรซ้าย อยู่หน้าสุดของกลุ่มปุ่ม · ต่ำกว่า md เป็นไอคอน 44 · พา `returnTo` (เปิดจากรายการที่มีตัวกรองและหน้า 2) · ผู้ขายถามก่อนทิ้งที่แก้ · 3 หน้าซ่อมบำรุงเขียน "กลับ" แทน "ยกเลิก" · หน้าสร้างบทบาทเขียน "เพิ่มบทบาท" · หัวจัดการส่วนควบไม่ sticky | 4.5 · I1 · I32 |
| ส่งมอบ · รับคืน · โอน · ย้ายหลายรายการ · เพิ่มเป็นชุด · รอบตรวจนับใหม่ | หัวเป็น `PageHeader` h1 600 · ความกว้างฟอร์มเดิม · `OperationShell` ยังเป็นการ์ด | I13 |
| ตั้งค่า (3 ตาราง) · เพิ่มเป็นชุด (3 ตาราง) · ตัวสร้างนโยบายค่าเสื่อม | หัวตารางพื้นขาว 13/500 ไม่ uppercase · ตัวเลขตัวอย่าง th-TH · แถวแท็บตั้งค่าเหมือนเดิม (O7) | R-e · R-f |

**คีย์บอร์ด:** Tab ในหัว: กลับ → ⋯ → ปุ่มรอง → ปุ่มหลัก (R-h) · Tab เข้าแถว: พื้นแถวรวมเซลล์ค้าง แล้วปุ่ม "แก้ไข" เป็น `primary-soft` · ⋯ เปิดด้วย Enter ลูกศรเลื่อนรายการ Esc ปิดแล้วโฟกัสกลับ ⋯ · ยืนยันลบแล้วยกเลิก โฟกัสกลับ ⋯ · ลิงก์เรียงคอลัมน์รับ Tab และเห็นวงโฟกัส · ตารางที่ล้นรับ Tab ที่ตัวเลื่อน (`role="region"`) และเลื่อนด้วยลูกศรได้ · ชิปและ "ล้างทั้งหมด" รับ Tab

**NVDA (ค้างให้คนตรวจก่อน deploy ครั้งเดียว):** ปุ่มกลับแบบไอคอนอ่าน "กลับ" · ปุ่มถัดไปอ่าน "แก้ไข BR-001" · ⋯ อ่าน "การดำเนินการของ BR-001" · หัวคอลัมน์ที่เรียงอยู่อ่านลำดับ · หัวคอลัมน์คำสั่งอ่าน "การดำเนินการ" · ข้อความท้ายตารางอ่านเมื่อเปลี่ยนหน้า (`aria-live`) · ขนาดหน้าที่เลือกอ่านว่าเป็นรายการปัจจุบัน · ช่องค้นหาไม่มีป้ายอ่าน "ค้นหา" · ค่าว่างอ่าน "ไม่มีข้อมูล" · เมนูข้างตอนพับอ่านชื่อรายการ

**axe:** color-contrast = 0 และไม่มี `label`/`aria-*` ผิด ที่ `/th/master-data/branches` (มีตัวกรอง) · `/th/master-data/suppliers` (375 และ 1440) · `/th/master-data/brands` · `/th/admin/users` · `/th/master-data/branches/<id>/edit` · `/th/assets` (ของกลางที่เปลี่ยนก่อน)

**forced colors ของ Windows:** วงโฟกัสบนลิงก์เรียง ปุ่มถัดไป ⋯ ชิป และตัวเลื่อนตาราง · เส้นใต้ของช่อง `StatStrip` ที่เลือก · ตัวเลือกขนาดหน้าที่เลือกยังแยกได้ (หนา 600) · ปุ่มก่อนหน้าที่ปิดใช้

**ลดการเคลื่อนไหว:** สีแถวไม่มี transition ค้าง · ไอคอนหมุนของช่องค้นหาหยุด · sheet ⋯ ไม่เลื่อน

**ภาพ:** ก่อนและหลังที่ `.superpowers/sdd/screenshots/ui-phase2b-plan1/` (git ignore) · ทุกแถวของตารางบนที่ 1440 และ 375

### 10.6 เอกสาร (หัวข้อ "เอกสาร" ในข้อ 3–9 เป็น checklist · ตารางนี้บอกว่าลง plan ไหน)

| plan | `DESIGN.md` (บรรทัดที่ HEAD) | อื่น ๆ |
|---|---|---|
| 2B-1 | `:284` Display 600 สร้างโดย `PageHeader` (ทะเบียน `text-xl` ต่ำกว่า md) · `:489` โครงเมนู ลึก ≤ 2 ไอคอนไม่ซ้ำ (ข้อ 4.10) · `:493` crumbs `mb-1` ใน `PageHeader` + bullet ใหม่ **Page header**, **Back button**, **TabNav** (เมื่อไรใช้ `Segmented`) · `:496-498` กติกา `DataTable` (หัวพื้นขาว · `p-3` · ขอบ 16/20 ที่คอลัมน์แรกและสุดท้ายผู้เรียกเปลี่ยนไม่ได้ · `aria-sort` · `TableEmptyRow` · `DataTableFoot` + `Pagination` 25/50/100 · ตัวบอกเลื่อน · ไม่มีความแน่นแบบอื่น ทะเบียนเป็นข้อยกเว้น I3) และ R7 รายไฟล์ · `:500-510` กติกาทั่วไป: แถบเครื่องมือไม่มีกรอบ 36 · แผงตัวกรอง `lg` + `FilterFormActions` · ชิป · ช1 · แบ่งหน้าฝั่ง server · เลื่อนแนวนอน B6 (ข้อความเฉพาะทะเบียน `:502-508` รอ 2B-3) · `:425` "ล้างตัวกรอง" เฉพาะตอนมีตัวกรอง · `:426` `EmptyNote padded` ใน `TableEmptyRow` · `:432` ตาราง 12px · ชิปตัวกรอง 8px · Inputs ต่อจาก `:459` bullet **List filters** · `:459` สถานะ · `:258`, `:291`, `:300` `StatStrip` · `:534` primitive ใหม่ทั้งหมด | `docs/14_UI_UX_DESIGN_SYSTEM.md:54-79` แถวใหม่ (PageHeader/PageBackLink · DataTable/TableEmptyRow · Pagination · FilterSelect · FilterFormActions · FilterChipList · RowActions · TabNav · StatStrip · KeyValueList · ContentPanel divided) และ `:82` เพิ่ม LFG · DH: หัวข้อใหม่ "UI Round 4 Phase 2B Plan 1 …" ก่อน "Open Go-Live Decisions" (DH:477) · แทน DH:441-445 และ :475 ด้วยสายท่อข้อ 8.1 · DH:321 R7 รายไฟล์ · DH:343 · DH:256 (`compactOnMobile` อยู่ที่ `PageHeader`) · bullet **Guard file LFG** แบบ DH:380 · ส่งต่อ 2C-4: หัวของ 2 เครื่องมือใช้ `PageHeader` (I13) · `docs/99_CHANGELOG.md` หัวข้อไทยใต้วันที่ + บรรทัด guard · `.impeccable/design.json` component ใหม่ (page-header, table, pagination, tabs, stat-strip, key-value, row-action, filter-chip) ต่อจาก "Sidebar Navigation Item" (`:414`) · wiki: `ams-status.md` (2B-1 merge แล้ว ยังไม่ deploy) · `ams-log.md` · `ams-open-questions.md:52` ปิดข้อ 28 และเพิ่มข้อเฟส 3 (ไอเดียเมนูที่ยังไม่เลือก · `returnTo` ปลายทาง I22) และรายการตรวจด้วยคนของ 2B-1 · `ams-index.md` ถ้ามีหน้าใหม่ · รัน `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` ที่ `D:\Obsidian\Eltross` · commit vault ด้วย `ingest:` |
| 2B-2 | `:258` ปุ่มอนุมัติไม่ใช่สีเขียว · `:500-510` ช่อง `StatStrip` ที่เป็นตัวกรอง · ⋯ เปิด dialog ของ 2C ผ่าน handle · `:573` คงข้อความ (PM มีปุ่มกลับแล้ว I25) | `docs/11_FEATURE_LIST.md:183` และแถวรายการที่แบ่งหน้า · `docs/07_UAT_CHECKLIST.md` (หน้า 3 → รายละเอียด → กลับได้หน้า 3 · ลบแถวสุดท้ายของหน้าสุดท้าย) · DH (2C-3 เริ่มได้ · สถานะไฟล์ร่วมข้อ 8.6 · เวลาโหลดของ query นับ) · changelog · wiki (2C-3 ปลดแล้ว) |
| 2B-3 | `:335` แถบคำสั่งกลุ่ม → เฟส 3 · `:502-508` สัญญาทะเบียนตามข้อ 7.3 (แถวแน่น `px-3 py-2` · คอลัมน์คำสั่ง 172 · ชุดค่าตั้งต้น 1,116) | DH:252, :301 · `docs/14_UI_UX_DESIGN_SYSTEM.md:93` ชี้สเปก 2026-10-07 + สเปก 2B และทำเครื่องหมาย Superseded · DH (2C-4 เริ่มได้เมื่อ 2C-3 merge · เลขบรรทัดใหม่) · changelog · wiki |
| 2B-4 | `:571` ต่อท้าย bullet เจ้าของระยะล่าง (shell / 4 หน้า O11) · หัวสลับที่ md shell สลับที่ lg · หน้ารายการและรายละเอียดเต็มกว้าง · skeleton ตามหน้าจริง · `KeyValueList` | `docs/14_UI_UX_DESIGN_SYSTEM.md:37-42` · DH (2C-5 เริ่มได้เมื่อ 2C-4 merge · `ActionBar` สลับที่ md · รายการกลับในแถบล่าง · ลบ `getMobileSafeBottomPaddingClasses` พร้อม `actionBarPagePadding`) · changelog · wiki |
| 2B-5 | `:301` · `:375` · `:459` · `:498` R7 เหลือ 3 ในไฟล์ชุด 4 · `:516` ตัวเลขที่เหลือ · `:534` ฉบับสุดท้าย | `src/lib/design-system.ts:93` comment · `docs/03_DATABASE.md` (2B ไม่เพิ่ม index · เวลา `count` ของ `system_logs` บน dev) · DH "Deferred": 2D (ตั้ง `KEEP` และทุก budget เป็น `{}` · `MasterDataDeleteButton` · `getActionButtonClasses` …) · V · งานตรวจด้วยคนทุก plan · changelog · wiki (2B เสร็จ ยังไม่ deploy) |

### 10.7 ความเสี่ยงหลัก

1. **2B-1 เปลี่ยนหน้าของ plan หลังทันที:** ตัวห่อ `MasterDataHeader` (assets, findings, rounds) · `MasterDataSearch` 6 หน้า · `Pagination` ของทะเบียน · `ClickableTableRow` 19 จุดใน 18 ไฟล์ · ต้องอยู่ในตารางตรวจข้อ 10.5 · ไอคอน `+` บนปุ่มกลับของ findings ค้างจนถึง 2B-2
2. **สายท่อสองสาย:** VFG, DS และไฟล์ตาม I29 ชน rebase · ใช้ค่าที่ต่ำกว่าของแต่ละแถว · ถ้าไฟล์โค้ดชน = รั้วรั่ว หยุดแล้ว revert (ข้อ 8.2)
3. **query นับของ B4:** `system_logs` ไม่มีตัวกรอง `count` สแกน index ทั้งตาราง (ข้อ 5.9.2 แถว 1) · findings ไม่มี index `reportedAt` · วัดบน dev ด้วย `withPerformanceTiming` · ช้าให้บันทึก ห้ามเพิ่ม index
4. **ความกว้างทะเบียนเหลือ 1px** (1,116 / 1,117) · แถบเลื่อนกว้างกว่า 17 หรือ zoom ไม่ใช่ 100% ทำให้ชุดค่าตั้งต้นเลื่อนที่ 1440 · ทางถอย `custodian` 160 → 156
5. **ขอบคอลัมน์แรกและสุดท้ายของ `DataTable` เปลี่ยนด้วย class ธรรมดาไม่ได้** (I3) · checkbox คอลัมน์แรกของ disposal ได้ขอบ 16/20 · ถ้าต้องการช่องชิดขอบต้องเขียน variant เดียวกัน
6. **`RowActions` ทั้งตาราง:** `useMediaQuery` ต่อแถว (100 แถว 100 listener) และ render แรกบนจอใหญ่เป็น sheet แล้วสลับ · คลิกใน portal ทะลุถึงแถวถ้าลืม `data-no-row-click` · `has-[[aria-expanded=true]]` ทำแถวค้างสีถ้ามีปุ่มตั้งค่านี้ค้าง
7. **ช่วง 768–1023:** หัวแบบแถว (md) อยู่กับแถบล่าง (lg) · หัวที่มี 4–5 ปุ่มขึ้นบรรทัดใหม่ · ตรวจที่ 768 และ 1024 ทุกหน้าที่แก้
8. **pin ตามรูปแบบโค้ดและ CRLF:** test ราว 130 ไฟล์อ่านไฟล์โดยไม่แปลง CRLF (ข้อ 10.8) · regex ใหม่ที่มี `\n` พังเงียบบนเครื่องนี้ · format-on-save ทำ pin ลำดับ string พัง (ข้อ 9.6)
9. **budget ลดด้วยมือ:** ลืมลดหรือลดผิดไฟล์ · L0 จับไฟล์ที่ประกาศว่าย้ายแล้ว · ที่เหลือพึ่ง review จนงานล็อกของ 2B-5 · guard ตามชื่อหลบได้ด้วยการเปลี่ยนชื่อ
10. **เลขบรรทัดของ 2C** ในสเปก 2C เป็นของ `5ffee76` · plan 2C-3…2C-5 ต้องนับใหม่ในงาน 0
11. **ประตู deploy ใหญ่:** `ab1b873..` 107 commit + 2C plan 2–5 + 2B 5 plan + 2D + V · งานตรวจด้วยคนของทุกเฟสค้าง (WIKI ข้อ 19, 24, 26) · ถอยกลับ `ab1b873` ได้ตราบที่ไม่มี schema เปลี่ยน
12. **พนักงานเห็นต่างทันทีหลัง deploy:** หัวบางลง · กล่องตัวเลขไม่มีสี · ปุ่ม 44 → 40 บนคอม · ปุ่มอนุมัติไม่เขียว · เงินไม่มี ฿ · ค่าว่างเป็น "—" · แท็บทะเบียนบนมือถือเป็นเส้นใต้ · ลบต้องผ่าน ⋯ · ประวัติการอนุมัติมีตัวเลขมากขึ้น (ยอดเต็ม) · แจ้งใน changelog และคู่มือที่เกี่ยว

### 10.8 ตัวเลขที่ตรวจซ้ำ (ที่ `d38a0ee`)

| ข้อความ | ที่มา | นับใหม่ (วิธี) | ผล |
|---|---|---|---|
| R7 44 ใน 31 ไฟล์ · หลัง plan 29/20 · 17/11 · 17/11 · 11/8 · 3/3 | ข้อ 8.4 · 9.2.1 | 44/31 และค่าต่อ plan เท่ากัน (`recount10.mjs` regex จาก VFG:233 · รายการไฟล์ต่อ plan ในสคริปต์) | ตรง |
| R7 "บนบรรทัด `<thead` 23 ใน 20 ไฟล์ ที่เหลือบน `<th`" | ข้อ 9.1 | ทั้ง 44 จุดอยู่บน 41 บรรทัดที่มี `<thead` (3 บรรทัดมี 2 จุด) · บนบรรทัด `<th` 0 (`recount10.mjs` + `grep -rnE`) | ข้อ 9 ผิด · ไม่กระทบ budget |
| R1 1/1 · R2 10/9 | ข้อ 8.4 · 9.1 | 1/1 · 10/9 | ตรง |
| ค่าเริ่ม LH1–LR1 19 ตัว | ข้อ 9.1 | เท่ากันทุกตัว (`recount10.mjs` regex ข้อ 9.3 ตรงตัว) | ตรง · ค่าต่อ plan ของ LH2, LN1, LN2 เปลี่ยนตาม I11, I14 (ตาราง C) |
| `<h1>` 60 ใน 60 ไฟล์ · `font-bold` 57 · `font-semibold` 3 · ใต้ `D/` 33 ไฟล์ ใต้ `c/` 26 | ข้อ 4 | เท่ากัน (`findJsxTags`) | ตรง · สังเคราะห์ "58 ที่ `text-2xl`" นับอีกแบบ |
| `<MasterDataHeader` 11 · `<MasterDataSearch` 6 | ข้อ 3 · 6 | 11 · 6 | ตรง |
| `FilterSelect` ประจำไฟล์ 7 · เรียก 24 · `ReportSelect` 6 · `LabeledSelect` 7 | ข้อ 6.1 | 7 · 24 ใน 7 ไฟล์ · 6 · 7 | ตรง |
| `ClickableTableRow` 19 ใน 18 ไฟล์ · `<table` 45 ใน 33 ไฟล์ | ข้อ 3 | 19/18 · 45/33 | ตรง |
| `ColumnHeader` 92 ใน 16 + 20 ประจำไฟล์ · `aria-sort` 1 | ข้อ 3.4 · 5.1 | `<ColumnHeader` 112 ใน 17 ไฟล์ · `aria-sort=` 1 | ตรง |
| `function …Pagination` 13 (ตัวเขียนเอง 11) | ข้อ 3.8 | 13 · LT4 11 | ตรง |
| `<StatusBadge` มากกว่า 40 (VFG:117-122) | ข้อ 9.2.3 | 62 ใน 24 ไฟล์ | ตรง |
| `font-mono` 44 บรรทัดใน 15 ไฟล์ | สังเคราะห์ | 44/15 | ตรง |
| เมนูข้าง 40 ตำแหน่ง 29 ชื่อ ซ้ำ 8 ชื่อ 19 ตำแหน่ง | ข้อ 4.2.1 · 8.13 ข้อ 10 | 40 · 29 · 8 (`Package`×3 `Users`×3 `Settings`×3 อีก 5 ชื่อ×2) · 19 | ตรง · หลังแก้ 39 ตำแหน่ง 39 ชื่อ |
| B4 `take:` 100 · 150 · 200 · 200 · 100 · 500 · ไม่จำกัด 3 | B4 · ข้อ 5.9.2 | `logs:42` · `history:52` · `findings:82` · `pending:81` · `batches:24` · `pm:34` · rounds/departments ไม่มี `take` · my-assets มีแค่ `take: 1` ของไฟล์แนบ `:36` | ตรง |
| ทะเบียน operations 1,094 → 1,116 · accounting 1,098 → 1,116 · audit 1,254 → 1,276 · all 1,614 → 1,632 | ข้อ 7.8.4 | เท่ากัน (อ่าน `src/lib/asset-register-columns.ts:20-24`, `:57-70`) · เนื้อช่องคำสั่ง `pr-2` 157.5 · ถ้า `pr-3` 153.5 | ตรง · เป็นเหตุของ I3 |
| `ab1b873..d38a0ee` 107 commit ไม่มี merge | ข้อ 8.2 · 8.12 | `git rev-list --count` 107 · `git log --merges` 0 | ตรง |
| test ที่อ่านไฟล์ CRLF ดิบ 136 | ข้อ 9.1 | 129 จาก 188 ไฟล์ที่ใช้ `readFileSync` (เกณฑ์ของส่วนนี้: ไฟล์ไม่มี `replace(/\r\n/g` และไม่ใช้ `readSourceFiles`) · `core.autocrlf=true` | ต่างเพราะเกณฑ์ต่าง · ใช้รายชื่อ `work/09/crlf09.txt` ของข้อ 9 |
| key ใหม่ 17 ตัวไม่มีอยู่ · `asset.registerRange`, `asset.pageSizeLabel`, `asset.rowActionsMenu`, `asset.tableScrollHint` มีอยู่ | ข้อ 3.17 · 5.11 · 6.11 · 7.16 | ตรวจทุกตัวกับ `messages/th.json`, `en.json` | ตรง · คำของ I33 ยกจาก key ที่มีอยู่ |
| 2C-4 แตะ `D/admin/data-quality/page.tsx:146` · 2C-5 แตะ `D/admin/integrations/page.tsx:52` | ข้อ 8.3 | C/04:262 · C/05:264 · บรรทัดที่ HEAD ตรง | ตรง (เหตุของ I12) |
| `normalizeOperationalReturnTo(locale, "disposal", rawSearchParams.returnTo)` ถูก pin | ข้อ 5.12 | `tests/disposal-route-structure.test.ts:32` · `tests/operational-return-navigation.test.ts:42` · ฟังก์ชันไม่รับ `allowedPaths` (`src/lib/operational-return-navigation.ts:12-19`) | ข้อ 5 เขียนว่า "รับ allowedPaths อยู่แล้ว" ถูกเฉพาะ `normalizeInternalReturnTo` (เหตุของ I22) |
| `D/maintenance/pm` มีเส้นทางนำทางไม่มีปุ่มกลับ · ไอคอนใน h1 | ข้อ 4.8 ข้อ 25 | `D/maintenance/pm/page.tsx:38` crumbs · `:42-43` `CalendarClock` ใน h1 · ไม่มีลิงก์กลับ | ตรง |
| h1 หน้าสร้างบทบาท | ข้อ 4.8 ข้อ 21 | `c/admin/role-permission-form.tsx:125` `t("editTitle")` ทุกกรณี · `adminRolesPage.createTitle` = "เพิ่มบทบาท" | ตรง |
| baseline test 1,812 · ผ่าน 1,811 · ข้าม 1 | ข้อ 8.10 | DH:467 | ตรง (ไม่ได้รันใหม่) |
| คำถาม wiki ข้อ 28 | ข้อ 4.10 · 8.14 | `D:/Obsidian/Eltross/AssetSystem/ams-open-questions.md:52` | ตรง |

### 10.9 การแก้ร่าง

ข้อความในร่างข้อ 3–9 ที่ขัดกับ I1–I34 แก้ในไฟล์ส่วนแล้ว (ราว 60 จุดตามรายการแก้ของการรวม + การไล่คำค้างทั้ง 7 ไฟล์) · ถ้ายังพบข้อความในข้อ 3–9 ที่ขัดกับข้อ 10 ให้ยึดข้อ 10
