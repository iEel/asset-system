# กวาดส่วนที่เหลือและล็อก guard (UI รอบ 4 เฟส 2D) — Design

วันที่ 2026-10-15 · ฐาน `master` `71597e5` (เฟส 1, 2A, 2B plan 1–5 และ 2C plan 1–5 merge และ push แล้ว ยังไม่ deploy) · branch ของสเปก: `feat/ui-phase2d`

เฟส 2 แบ่งเป็น 4 งานย่อย: **2A รากฐาน → 2B หน้ารายการและโครงหน้า ∥ 2C ฟอร์มและ dialog → 2D กวาดส่วนที่เหลือและล็อก guard (เอกสารนี้)** · หลัง 2D คืองาน V (error ใต้ช่อง · I31) แล้ว deploy Production ครั้งเดียว (wiki `ams-open-questions` ข้อ 27)

ข้อมูลที่ใช้ร่าง:
- แผนที่ขอบเขตที่ `71597e5` จากผู้อ่าน 6 ส่วน (hand-off ใน `DEVELOPER_HANDOFF.md` · สเปก 2A/2B/2C · guard 3 ไฟล์ · ปุ่มและลิงก์ที่เหลือ · พื้นผิวและสีที่เหลือ · เอกสารและ wiki) และการทวนเลขบรรทัดราว 40 จุดกับโค้ด
- คำตอบของผู้ใช้ 2026-10-15 ต่อคำถาม D1–D19 (ข้อ 2) และการอนุมัติดีไซน์ 3 ส่วน (ข้อ 3–5)

ตัวย่อ: `D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/` · DH = `DEVELOPER_HANDOFF.md` · VFG / FMG / LFG = `tests/visual-foundation-guards.test.ts` / `tests/form-migration-guards.test.ts` / `tests/list-frame-guards.test.ts` · เลขบรรทัดทุกตัวเป็นของ `71597e5` และ plan ต้องทวนใหม่ก่อนใช้

## 1. เป้าหมายและหลักฐาน

2D ทำให้ UI ทั้ง `src` ใช้ของกลางชุดเดียว แล้วล็อก guard ให้ของเขียนเองกลับมาไม่ได้

**2D เสร็จเมื่อ:**
1. ไม่เหลือของเขียนเองใน `src` ในหมวดที่มีของกลางรองรับ (ปุ่ม ลิงก์ทรงปุ่ม กล่องข้อความ pill หน้าว่าง กรอบ panel สีดิบ) ยกเว้นจุดในรายการ `EXEMPT` (ข้อ 5)
2. Guard 3 ไฟล์คลุมทั้ง `src` · ทุก budget เป็น `{}` · ทุกกฎมี `EXEMPT` ระบุจุด เหตุผล เลขข้อตัดสิน และป้าย `permanent` หรือ `phase 3` · ตรวจว่าตัวเลขเท่ากับที่นับได้จริง · guard ใหม่ 5 ตัว
3. ปุ่มค่าตั้งต้นและปุ่มไอคอน 36px ตั้งแต่ `md` (ต่ำกว่า `md` ยัง 44px) · ช่องกรอก 40px · size ใหม่ `icon-lg` 40px · ปุ่มบนหัวหน้า `md` ทุกหน้า
4. ไม่เหลือ export ที่ไม่มีผู้เรียกในรายการข้อ 4.1
5. `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `.impeccable/design.json`, DH, `docs/99_CHANGELOG.md` และ wiki ตรงกับโค้ด ไม่เหลือข้อความ "until 2D" หรือ "2D moves"

**2D ไม่ทำ:** งานเฟส 3 (ข้อ 2 D2) · feature หรือ logic ใหม่ · migration · token ใหม่ (2A I21) · deploy · ยกเว้นข้อเดียวที่ผู้ใช้อนุมัติ: เพิ่ม field อ่านอย่างเดียว `status.name` ใน API (D8)

**สิ่งที่พบในโค้ด (`71597e5`):**

| เรื่อง | หลักฐาน |
|---|---|
| งานที่ส่งต่อมา | 35 รายการ (M1–M35 ในข้อ 4) จาก DH ส่วน 2A, 2B plan 1–5, 2C plan 1–5 และสเปก 2A ข้อ 2 (`2026-10-11-ui-phase2a-design.md:62-71`) |
| ปุ่มค่าตั้งต้น | `c/ui/button-variants.ts:31` `default: sizeLg` · `:33` `icon: sizeIcon` · pin `tests/design-system.test.ts:148` ("phase 2D switches default to md") · Button ที่ไม่ระบุ size 115 ปุ่มใน 55 ไฟล์ |
| กรอบ panel เขียนเอง | ~165 กรอบใน 68 ไฟล์ (+160 กล่อง `rounded-md` ซ้อน) · `ContentPanel` ใช้ 13 จุด · การ์ด/panel ประจำไฟล์ 46 ตัว |
| `<button>` ดิบ | 80 ใน 43 ไฟล์ (11 ใน `c/ui/` เป็นของกลาง) · ลิงก์ทรงปุ่ม 53 ใน 29 ไฟล์ · ลิงก์ข้อความเขียนเอง 31 ใน 21 ไฟล์ |
| กล่องข้อความมีสีพื้น | ~66 กล่องใน ~45 ไฟล์ · `<Notice` 6 จุด · token info (teal) 67 จุดใน 23 ไฟล์ |
| pill / badge | `rounded-full` เขียนเอง 63 · badge ประจำไฟล์ 8 ตัว · `c/ui/badge.tsx` ไม่มีผู้ใช้ · `<StatusBadge` 65 |
| หน้าว่างเขียนเอง | ~48 จุด (`border-dashed` 47) · `EmptyNote` 12 · `ActionEmptyState` 30 · `TableEmptyRow` 27 |
| สีดิบนอก token | 72 จุดใน 7 ไฟล์ (`c/admin/system-settings-form.tsx` 25 · `c/asset-operations/operation-document-print.tsx` 17 · `D/assets/[id]/page.tsx` 16) |
| `Loader2` | 30 ใน 22 ไฟล์ทั้ง `src` · 18 จุดไม่มี `motion-reduce` · FMG GB2 จะ fail 6 จุดถ้าขยาย |
| `disabled:opacity-*` | 21 ใน 13 ไฟล์ |
| guard | VFG คลุมทั้ง `src` อยู่แล้ว · FMG คลุมเฉพาะไฟล์ของ 2C (meta-test `:368-392` ห้ามแถวนอก 2C) · LFG คลุม `src/app` + `src/components` (ไม่รวม `src/lib` และ API โดยตั้งใจ) · LFG มี 5 แถวที่นับได้ 0 แต่ budget ยัง 1 (LP1 ×4, LB1 `D/maintenance/[id]`) |
| ขนาดงาน | ไฟล์นอก `c/ui/` ที่มีสิ่งที่ต้องกวาดอย่างน้อย 124 ไฟล์ · คาด 130–150 ไฟล์ใน `src` + test ~25 ไฟล์ |

## 2. ข้อตัดสินของผู้ใช้ (2026-10-15)

| # | เรื่อง | เลือก |
|---|---|---|
| D0 | ขอบเขต | กวาดครบทุกหมวด แล้วล็อก guard ทั้ง `src` |
| D1 | ความหมายของ "ทุก budget `{}`" | budget `{}` + รายการ `EXEMPT` ต่อกฎ ทุกจุดมีเหตุผลและเลขข้อตัดสิน (แบบที่ VFG ยกเว้น `asset-label-print.tsx` อยู่แล้ว) |
| D2 | เส้นแบ่งเฟส 3 | 3 จุดที่สเปกระบุไว้: แถบเลือกหลายรายการของทะเบียน (`c/assets/asset-register-table.tsx:473`) · กรอบหน้าเข้าสู่ระบบ · ช่องค้นหาบน topbar (`c/layout/global-search.tsx`) · ปุ่มไอคอนของ topbar/sidebar และปุ่มคำสั่งของเครื่องสแกนตรวจนับ 2D กวาด |
| D3 | ปุ่ม 36px | เปลี่ยนทั้ง `default` และ `icon` · ใส่ `size="lg"` ให้ปุ่มที่อยู่แถวเดียวกับช่องกรอก 40px ก่อนเปลี่ยน |
| D4 | ช่องกรอก | คง 40px (2C K7) · แถบเครื่องมือที่ต้องการเตี้ยส่ง `md` ทั้งช่องและปุ่ม |
| D5 | ปุ่มไอคอนในแถวช่องกรอก | เพิ่ม size `icon-lg` 40px ใน cva (ไม่ใช่ token · ยกเว้นกฎข้อ 22 ของ 2A `2026-10-11-ui-phase2a/04-buttons.md:261` เฉพาะ size นี้) |
| D6 | ปุ่มหัวหน้า | `md` ทุกหน้า (2B R-h) · `lg` ใช้เฉพาะคู่กับช่องกรอก 40px |
| D7 | กล่องข้อความ | `Notice` ตามความหมาย: ข้อมูล `info` · คำแนะนำและเงื่อนไขก่อนทำ `neutral` · คำเตือน `warning` · ผิดพลาด `danger` · ชิปบทบาทเป็นชิปกลาง · แถบบนหน้าเข้าสู่ระบบรอเฟส 3 |
| D8 | ป้ายสถานะสีจาก DB | 2D เพิ่ม `status.name` (อ่านอย่างเดียว ไม่มี migration) ใน `src/app/api/search/route.ts` และข้อมูลของหน้าพิมพ์ป้าย แล้วใช้ `StatusBadge` |
| D9 | กรอบ panel | คงการ์ด ใช้ `ContentPanel` / `getPanelClasses` แบบเดียว ระยะชุดเดียว |
| D10 | เงินบนหน้าพิมพ์ | `formatMoney` เหมือนจอ แล้วลบ `formatCurrency` |
| D11 | ปุ่มสร้างแบบลอย | ย้ายเข้าปุ่มของ `PageHeader` (แสดงเมื่อมีสิทธิ์สร้าง) |
| D12 | ลบโค้ดตาย | ทุก export ที่ไม่มีผู้เรียก (ข้อ 4.1) |
| D13 | ไฟล์ guard | คง 3 ไฟล์ · `assertWithinBudget` ตัวเดียว · ลบรายชื่อไฟล์ที่ย้ายแล้ว · ตรวจว่าตัวเลขเท่ากับที่นับได้ |
| D14 | guard ใหม่ | 5 ตัว (ข้อ 5.4) · ไม่ทำ guard pill และ z-index |
| D15 | การแบ่ง plan | 5 plan ตามพื้นที่ ทำทีละ plan (ข้อ 3) |
| D16 | ลำดับงาน V | คงเดิม: V หลัง 2D (I31) |
| D17 | deploy | คงเดิม: ครั้งเดียวหลัง 2D และ V · ทวนจุด rollback `ab1b873` ก่อน deploy |
| D18 | งานเล็กที่ยังไม่มีเจ้าของ | รวมเฉพาะที่อยู่ในไฟล์ที่ 2D แก้: X ของ dialog มาสุดท้ายในลำดับ Tab · แท็บตั้งค่าล้นที่ 1440 · ช่วงเลขหน้าตัดบรรทัดที่ 375 · ช่องค้นหา topbar เลยไปใต้กระดิ่งที่ 200% · ความสูง `ActionBar` ที่ zoom 200% · ไม่รวมแก้ไขรอบตรวจนับ 404 และการโหลดซ้อนของ data-quality |
| D19 | ข้อตัดสินเล็ก | ปุ่มท้าย sheet ใช้แบบท้าย dialog (`c/audit/audit-scan-room-picker.tsx:124`) · ลิงก์ศูนย์งานค้างที่เปลี่ยนทรงที่ `sm:` (`D/work-center/page.tsx:598-607`, `:650-655`) ใช้ `linkVariants` และพื้นที่กด 44px บนมือถือ · helper ชื่อ/ค่า 10 จุดที่หน้าตาเหมือน LK1 เพิ่มชื่อเข้า LK1 แล้วย้าย |

## 3. Plan 5 ชุด

ทำต่อกันทีละ plan บน branch ของแต่ละ plan · ทุกไฟล์แก้ครั้งเดียวให้ครบทุกหมวดใน commit ของไฟล์นั้น และลดแถว guard ที่เกี่ยวข้องใน commit เดียวกัน (ห้ามเพิ่มตัวเลข) · `messages/*.json`, `DESIGN.md` และไฟล์ guard แก้ใน plan เดียวต่อครั้ง

### 3.1 2D-1 รากฐานและลบโค้ดตาย (~30 ไฟล์ใน src · ~15 test)
- ขนาดปุ่ม (M1, M2, D3–D6): ไล่ใส่ `size="lg"` ให้ปุ่มในแถวช่องกรอก 40px ก่อน → เปลี่ยน `default`/`icon` เป็น 36px และ `getSafeActionLinkClasses` `md:min-h-10` เป็น `md:min-h-9` (หรือลบตาม M5) → เพิ่ม `icon-lg` และใช้ในแถวช่องกรอก 7 แถว (2C `06-actions.md:81`) → ปุ่มหัวหน้า `md`
- ลบโค้ดตาย (ข้อ 4.1)
- แก้เล็ก: ลบแถว LFG ที่นับได้ 0 (M16) · ลิงก์ดาวน์โหลด `/api` 5 จุดเป็น `<a>` (M31) · `motion-reduce` 6 จุดที่ GB2 จะ fail · บั๊กที่ส่งต่อ (M32) · comment ใน guard ที่อ้างบรรทัดผิด (M34) · ฟอนต์ Plex Mono 600 (M11)
- API: `status.name` (D8, M23 ส่วน API)
- ตรวจภาพก่อน/หลังของหน้าหลักทุกหน้าที่ 1440 และ 375 เพราะปุ่ม 115 ปุ่มเตี้ยลง 4px

### 3.2 2D-2 admin รายงาน แดชบอร์ด และ shell (~35 ไฟล์)
`c/admin/system-settings-form.tsx` · `c/admin/IntegrationClientManager.tsx` (M27) · `c/admin/role-permission-form.tsx` · `D/admin/roles` และ `D/admin/users` (ปุ่มลอย M13) · readiness (M5) · คิวอนุมัติ · `c/admin/storage-archive-button.tsx` (M14) · data-quality · บันทึกระบบ · แจ้งเตือน (M29) · รายงาน (M29, M30) · แดชบอร์ด · ศูนย์งานค้าง (D19) · ปุ่มไอคอนของ topbar และ sidebar · D18: แท็บตั้งค่าล้นที่ 1440, ช่องค้นหาเลยไปใต้กระดิ่งที่ 200%

### 3.3 2D-3 ทรัพย์สินและข้อมูลหลัก (~45 ไฟล์)
`D/assets/[id]/page.tsx` (QuickAction M12, สีดิบ 16 จุด) · `c/assets/asset-import-preview-panel.tsx` (M15) · เครื่องมือพิมพ์ป้ายและเครื่องสแกนค้นหา (M23 ใช้ `status.name`) · ไฟล์แนบ · เอกสารจัดซื้อ · timeline · ฟอร์มทรัพย์สิน · ทรัพย์สินของฉัน · หน้าและฟอร์มของข้อมูลหลัก (`ActiveBadge` M7 · ลิงก์ drill-down 12 จุด)

### 3.4 2D-4 ตรวจนับ ตัดจำหน่าย ซ่อม และธุรกรรม (~45 ไฟล์)
เครื่องสแกนตรวจนับ (ปุ่มดิบ 17 ปุ่มใน 8 ไฟล์) · หน้ารอบตรวจนับ (token info 16 จุด) · ตัดจำหน่าย: dialog แบบหลายรายการ (M26) และ stepper (M28) · ไฟล์แนบงานซ่อม (M28) · ธุรกรรมทรัพย์สิน · หน้าพิมพ์ (D10, M24) · D18: ความสูง `ActionBar` ที่ zoom 200%

### 3.5 2D-5 ล็อก guard และเอกสาร (~10 test · เอกสาร)
ขยาย FMG, LFG และ `tests/list-filters-ui.test.ts` ให้คลุมทั้ง `src` (M18, M19) · รูปแบบ `EXEMPT` / `OWNERS` (ข้อ 5) · ลบรายชื่อไฟล์ที่ย้ายแล้ว · guard ใหม่ 5 ตัว · เอกสารรอบสุดท้าย (M35, ข้อ 6)

**ทุก plan ปิดท้ายด้วย:** `npm run verify` · production build · ตรวจบนแอปแบบไม่เขียนข้อมูล (axe, 1440/768/375, ภาษาอังกฤษ 1 รอบ, zoom 200%, forced colors) พร้อมภาพก่อน/หลัง · เอกสารของ plan · wiki · ไม่ deploy

## 4. งานที่ส่งต่อมา (M1–M35)

แต่ละรายการบอกไฟล์ที่ `71597e5` และ plan ที่ทำ · รายละเอียดและที่มาอยู่ใน DH ส่วนที่อ้าง

| # | งาน | ไฟล์ | plan |
|---|---|---|---|
| M1 | ปุ่ม `default`/`icon` 36px | `c/ui/button-variants.ts:31`, `:33` · `src/lib/design-system.ts:101-106` · pin `tests/design-system.test.ts:148`, `:176` | 2D-1 |
| M2 | `size="lg"` ให้ปุ่มในแถวช่องกรอก 40px ก่อนเปลี่ยน | 2A `04-buttons.md:232`, `:340` | 2D-1 |
| M3 | ลบ `ActionButton` (ผู้เรียกเดียว `D/error.tsx:30`) และ helper ปุ่มเก่า | `c/ui/action-button.tsx` · `src/lib/design-system.ts:5-7`, `:82-97` | 2D-1 |
| M4 | ลบ helper ที่ไม่มีผู้เรียก | `src/lib/design-system.ts:5`, `:28`, `:32`, `:56`, `:60`, `:72`, `:113-115` · pin `tests/audit-scan-search-ui.test.ts:188` | 2D-1 |
| M5 | ย้ายผู้เรียก `getSafeActionLinkClasses` / `getResponsiveActionRowClasses` แล้วลบ | `D/admin/readiness/page.tsx:165-173` · `D/asset-management/import-export/page.tsx:120-123` | 2D-1 (ลบ) · ย้ายใน plan ของหน้า |
| M6 | ลบ `MasterDataDeleteButton` และ `AssetDeleteButton` | `c/master-data/master-data-delete-button.tsx` · `c/master-data/asset-delete-button.tsx` · pin `tests/confirm-dialog-ui.test.ts:38` | 2D-1 |
| M7 | `ActiveBadge` เป็นชิปกลางหรือ `StatusBadge` | `c/master-data/master-data-layout.tsx:31` | 2D-3 |
| M8 | ลบ props/คีย์ busy ที่ไม่มีใครอ่าน 10 จุด | 2C `06-actions.md:600`, `:623` (รายการ 10 จุดตรงกับโค้ด) | 2D-1 |
| M9 | ลบ helper เก่าของหน้ารายละเอียดทรัพย์สิน | `src/lib/asset-detail-format.ts:62`, `:82` · คีย์ `asset.latestMaintenance` | 2D-1 |
| M10 | ลบ `size="compact"` ของ `AssetStateHelpPopover` | `c/assets/asset-state-help-popover.tsx:12`, `:18` | 2D-1 |
| M11 | เลิกโหลด Plex Mono 600 | `src/app/layout.tsx:17` · pin VFG `:37` | 2D-1 |
| M12 | QuickAction ที่ปิดใช้งานเป็น `Button disabled` (มีความหมายต่อโปรแกรมอ่านจอ) | `D/assets/[id]/page.tsx:1812-1838` | 2D-3 |
| M13 | ปุ่มสร้างแบบลอยเข้าหัวหน้า | `D/admin/roles/page.tsx:235-241` · `D/admin/users/page.tsx:206-212` | 2D-2 |
| M14 | `StorageArchiveButton` เป็น `Button variant="outline" size="sm" busy` | `c/admin/storage-archive-button.tsx:46-54` | 2D-2 |
| M15 | แผงนำเข้า: หัวตาราง ช่อง "-" `SummaryPill` `SummaryItem` กล่อง | `c/assets/asset-import-preview-panel.tsx:279-281`, `:326`, `:361-362`, `:394`, `:398`, `:408` | 2D-3 |
| M16 | ลบแถว LFG ที่นับได้ 0 (LP1 ×4, LB1 `D/maintenance/[id]`) จากทั้ง BUDGETS และ KEEP | LFG `:226`, `:233-240`, `:335`, `:337-342` | 2D-1 |
| M17 | ย้ายจุดในแถว LFG ที่ติด 2D (LV2 43 จุด · LV3 6 · LS1 · LK1) | 2B `09-guards-tests.md:465-533` · LFG `:255-304` | 2D-2 ถึง 2D-4 ตามไฟล์ |
| M18 | ขยาย FMG ทั้ง `src` และเขียน meta-test ใหม่ | FMG `:21`, `:110-113`, `:368-392` | 2D-5 |
| M19 | ขยายกฎตัวกรองเกิน 13 ไฟล์ (I34) | `tests/list-filters-ui.test.ts:21-37` | 2D-5 |
| M20 | กล่องข้อความเป็น `Notice` (D7) | ~66 กล่อง · token info 67 จุด | 2D-2 ถึง 2D-4 |
| M21 | หน้าว่างเป็น `EmptyNote` / `ActionEmptyState` · ลบ `EmptyState` / `EmptyTransferState` ประจำไฟล์ | ~48 จุด | 2D-2 ถึง 2D-4 |
| M22 | pill และ badge ประจำไฟล์เป็น `StatusBadge` หรือชิปกลาง | ~63 pill · badge 8 ตัว | 2D-2 ถึง 2D-4 |
| M23 | ป้ายสถานะสีจาก DB (D8) | `c/assets/asset-scan-search-tool.tsx:166` · `c/assets/asset-label-batch-tool.tsx:741` · `src/app/api/search/route.ts` · `D/asset-management/labels/page.tsx` | 2D-1 (API) · 2D-3 (ป้าย) |
| M24 | หน้าพิมพ์ใช้ `formatMoney` (D10) | `(print)/disposal/[id]/print` 5 · `(print)/maintenance/[id]/print` 1 | 2D-4 |
| M25 | กรอบ panel เป็น `ContentPanel` (D9) | ~165 กรอบใน 68 ไฟล์ | 2D-2 ถึง 2D-4 |
| M26 | ส่วนที่เหลือของ 2C-3 | `c/disposal/disposal-bulk-approval.tsx:565`, `:593`, `:598`, `:602` · `c/disposal/disposal-bulk-execution.tsx:864`, `:1052`, `:1080`, `:1141` · `c/audit/audit-round-cancel-button.tsx:98`, `:128` | 2D-4 |
| M27 | ส่วนที่เหลือของ 2C-4 | `c/admin/IntegrationClientManager.tsx:397`, `:524`, `:759`, `:778`, `:793`, `:848-874` · `c/admin/role-permission-form.tsx:144` · `c/assets/asset-label-batch-tool.tsx:731` · `c/assets/asset-status-correction-button.tsx:64` · `c/asset-operations/transaction-cancel-dialog.tsx:143` · กล่องขนาดเทปของหน้าพิมพ์ป้ายตัดที่ 1440 | 2D-2 / 2D-3 / 2D-4 ตามไฟล์ |
| M28 | ส่วนที่เหลือของ 2C-5 | `c/disposal/disposal-workflow-stepper.tsx:51` · `c/maintenance/maintenance-attachments.tsx:146`, `:185`, `:194`, `:202`, `:210` | 2D-4 |
| M29 | ปุ่มคำสั่ง ปุ่มไอคอน ลิงก์ทรงปุ่ม และลิงก์ข้อความที่เขียนเอง | 80 + 53 + 31 จุด · `c/notifications/notification-center-actions.tsx:97`, `:106` · `c/reports/report-preset-controls.tsx:82`, `:101` | 2D-2 ถึง 2D-4 |
| M30 | การ์ด pill และกล่องที่ 2B-5 เหลือบนหน้า admin รายงาน แดชบอร์ด | DH ส่วน 2B-5 | 2D-2 |
| M31 | ลิงก์ดาวน์โหลด `/api` ที่ใช้ `next/link` | `D/admin/roles/page.tsx:97` · `D/master-data/categories/page.tsx:140`, `:144` · `D/master-data/brands/page.tsx:213`, `:217` | 2D-1 |
| M32 | บั๊กเล็กที่ส่งต่อ | ยอดจัดซื้อว่างแสดง 0.00 (`D/master-data/suppliers/[id]/page.tsx:265`) · "-" ที่พิมพ์เอง (`D/assets/[id]/page.tsx:2425`, `:2480`) · ลิงก์กลับของทรัพย์สินของฉัน · `StatStrip` ไม่มีป้ายค่าว่าง · `ReportsPageSkeleton` ต่ำกว่า 640px · `buildSystemLogFilterHref` ไม่รับขนาดหน้า | 2D-1 (ส่วนที่อยู่ในไฟล์ของ 2D-1) · ที่เหลือตามไฟล์ |
| M33 | รหัสที่ยังใช้ `font-mono` ใช้ utility `tag` | DESIGN.md:301 | ตามไฟล์ |
| M34 | comment ใน guard และ test ที่อ้างบรรทัดหรือเจ้าของผิด | LFG/FMG ตามแผนที่ขอบเขต · `tests/asset-detail-ux.test.ts:159-160` | 2D-1 |
| M35 | เอกสารและ wiki | ข้อ 6 | ทุก plan · รอบสุดท้าย 2D-5 |

### 4.1 โค้ดตายที่ลบ (D12)
`ActionButton` และ helper ปุ่มเก่า (M3) · `uiTones`, `normalizeUiTone`, `getMetricCardToneClasses`, `getTableShellClasses`, `getResponsiveTableScrollClasses`, `getEmptyStateClasses`, `getMobileSafeBottomPaddingClasses` (M4) และ `getSafeActionLinkClasses`, `getResponsiveActionRowClasses` เมื่อย้ายผู้เรียกแล้ว (M5) · `MasterDataDeleteButton`, `AssetDeleteButton` (M6) · `c/ui/badge.tsx` · `getHealthPanelClass`, `getSummaryToneClass`, คีย์ `asset.latestMaintenance` (M9) · `size="compact"` (M10) · props/คีย์ busy 10 จุด (M8) · `formatCurrency` (D10) · pin ใน test ที่ล็อกของที่ลบ ลบพร้อมกันใน commit เดียว

ก่อนลบแต่ละตัว plan ต้อง grep ทั้ง `src` และ `tests` ยืนยันว่าไม่มีผู้เรียก (ไม่นับ pin)

## 5. รูปแบบ guard ที่ล็อก (2D-5)

### 5.1 รายการยกเว้น
ทุกกฎใช้รูปแบบเดียว:

```ts
const EXEMPT = {
  "src/components/audit/audit-scan-camera.tsx": { count: 2, kind: "permanent", why: "เงาบนภาพกล้อง", ruling: "R2-cam" },
  "src/components/assets/asset-register-table.tsx": { count: 1, kind: "phase 3", why: "แถบเลือกหลายรายการ", ruling: "D2" },
}
```

- นับแบบตรงตัว: ไฟล์ในรายการต้องนับได้เท่ากับ `count` (น้อยกว่าก็ fail เพื่อบังคับให้ลดหรือลบแถว) · ไฟล์ที่ไม่อยู่ในรายการต้องนับได้ 0
- `why` และ `ruling` ห้ามว่าง · `kind` เป็น `permanent` หรือ `phase 3` เท่านั้น
- มี test ที่รวมจำนวน `phase 3` ทุกกฎ ให้เฟส 3 รู้ว่าต้องเก็บกี่จุด

### 5.2 ไฟล์ของกลาง
ของกลางที่ต้องใช้ class ดิบเอง (เช่น `c/ui/button.tsx`, `c/ui/field.tsx`, `c/ui/field-variants.ts`, `c/ui/search-field.tsx`) อยู่ในรายการ `OWNERS` ต่อกฎ แยกจาก `EXEMPT` แบบ `HEADER_OWNER` และ `NAV_PRIMITIVES` ของ LFG

### 5.3 จุดที่คงไว้ (ตั้งต้นของ `EXEMPT` · plan ทวนตัวเลขก่อนใช้)

| กฎ | จุด | kind |
|---|---|---|
| VFG R2 เงา | กล้อง 2 · ภาพถ่าย 1 · กระดาษตัวอย่าง 3 · ปุ่มสแกน 1 | permanent |
| VFG R2 เงา | แถบเลือกหลายรายการของทะเบียน 1 | phase 3 |
| VFG R3 ตัวอักษรเล็ก | `asset-label-print.tsx` (มีอยู่แล้ว) | permanent |
| FMG RAW_FIELDS | แถบเครื่องมือพิมพ์ป้าย 2 (K21) · ช่องค้นหาห้อง 1 (O20) | permanent |
| FMG RAW_FIELDS / GF3 | `c/layout/global-search.tsx` | phase 3 |
| FMG LOADER2 | บรรทัดสถานะและไอคอนค้นหา 10 จุด (I27) | permanent |
| FMG FIXED_BOTTOM_BARS | `ActionBar` (K23) · `c/layout/mobile-field-navigation.tsx:51` | permanent |
| FMG FIXED_BOTTOM_BARS | แถบเลือกหลายรายการของทะเบียน | phase 3 |
| LFG | LH1 4 · LB1 ที่เหลือ · LN1 2 (I11) · LV1 1 (ข้อมูลป้าย) | permanent |
| LFG LV2 | "-" ที่เป็นค่าข้อมูล 25 จุด (R-n) | permanent |
| สีดิบ (ใหม่) | หน้าพิมพ์ · ภาพกล้อง | permanent |

### 5.4 Guard ใหม่ 5 ตัว (D14 · คลุมทั้ง `src`)
1. สีดิบนอก token (`text-gray-*`, `bg-blue-*`, `slate`, `zinc`, hex ใน class) · ยกเว้นหน้าพิมพ์และภาพกล้อง
2. `border-dashed` ใช้ได้เฉพาะในไฟล์ของกลาง (2A `07-feedback.md:330`)
3. นับ `<button` ดิบนอก `OWNERS`
4. ห้าม `disabled:opacity-*`
5. ห้ามกำหนดความสูงของปุ่มหรือลิงก์ทรงปุ่มที่ `sm:`

### 5.5 การจัดไฟล์ (D13)
- คง VFG, FMG, LFG · ย้าย `assertWithinBudget` เป็นตัวเดียวที่ทั้ง 3 ไฟล์ใช้
- ลบ `MIGRATED_FILES`, `BATCH_FILES`, `MIGRATED_LIST_FILES`, `KEEP`, `MIGRATED_FILTER_FILES` เมื่อกฎของมันคลุมทั้ง `src`
- คงชื่อ `TABLE_HEADER_FILLS` (สคริปต์ของ 2B อ่านชื่อนี้)
- เขียน meta-test ของ FMG ใหม่ ให้ตรวจรูปแบบ `EXEMPT` แทนการห้ามแถวนอก 2C
- FMG GF5 (constraint floors) เป็นเพดานล่างไม่ใช่ budget คงไว้ และเพิ่ม `c/ui/scanner-text-input.tsx`
- GB3 (ป้าย busy สลับ) เพิ่มกฎทั่วไปที่จับ `c/ui/data-freshness-banner.tsx:67-90` ได้ หรือย้ายจุดนั้นก่อนล็อก

### 5.6 ระหว่าง 2D-1 ถึง 2D-4
Guard เดิมลดตัวเลขทีละไฟล์ใน commit ของไฟล์นั้น · ห้ามเพิ่มตัวเลขหรือเพิ่มแถว · 2D-5 จึงเปลี่ยนเป็นรูปแบบข้อ 5.1 และขยายให้คลุมทั้ง `src`

## 6. เอกสาร

ทุก plan: DH ส่วนของ plan · `docs/99_CHANGELOG.md` · wiki (`ams-status`, `ams-log`, `ams-open-questions` ข้อใหม่ของการตรวจด้วยคน และข้อ 27) · `node tools/wiki-lint.mjs`

รอบสุดท้าย 2D-5 แก้ข้อความที่ล้าสมัย:
- `DESIGN.md:195` (ภาพรวมหยุดที่ 2C plan 1) · `:260` (เป้าหมาย info) · `:354`, `:356` (ความสูงปุ่ม) · `:374-375` · `:398` ("ไม่แสดงสีจาก DB" ไม่จริง 2 จุดจนกว่า M23 เสร็จ) · `:603` (`{}`)
- `docs/14_UI_UX_DESIGN_SYSTEM.md:98`
- `.impeccable/design.json` (info teal "until 2D" `:499` · table shell `:544` · ปุ่ม 40px `:355`, `:363`, `:403` · ของกลางของ 2B)
- เลขบรรทัดหรือจำนวนที่ล้าสมัยใน DH ที่ 2D อ้างถึง (เช่น `ActionButton` "9/7/3" → 1)
- wiki: ข้อ 20, 21, 25, 27, 31 ของ `ams-open-questions` และแถว 2A ใน `ams-status`

## 7. วิธีทำและตรวจ

- แต่ละ plan มีสเปกนี้เป็นฐาน · จำลองทำทั้ง plan ในสำเนาก่อน · subagent (Opus medium) ทำทีละงาน · ผู้ควบคุมตรวจเทียบผลจำลองและอ่าน diff เอง ไม่มี reviewer subagent
- ทุกไฟล์ที่ย้ายมี test หน้าตา (แบบ `*-ui.test.ts` เดิม) ที่ fail ก่อนแก้
- API (D8): test ของ route ยืนยันว่ามี `status.name` และ field เดิมไม่เปลี่ยน
- ไฟล์ CRLF แก้ด้วยการแทนข้อความตรงตัว · ห้ามรัน formatter · `messages/*.json` แก้ผ่าน `node scripts/messages-edit.mjs` · คำไทยตาม `docs/19_THAI_GLOSSARY.md`
- ตรวจบนแอปใช้ DB พัฒนา `asset_management_dev` เท่านั้น และไม่เขียนข้อมูล

**ความเสี่ยง**

| ความเสี่ยง | วิธีรับมือ |
|---|---|
| ปุ่มเตี้ยลงแล้วไม่ตรงกับช่องกรอก | M2 ก่อน M1 · ภาพก่อน/หลังของหน้าหลักทุกหน้า |
| ไฟล์ใหญ่ถูกแก้หลายหมวดพร้อมกัน | ไฟล์ละ commit · ตรวจภาพต่อไฟล์ |
| ไฟล์ใหญ่ที่ข้ามหลายพื้นที่ (`system-settings-form`, `D/assets/[id]`) | กำหนดเจ้าของ plan เดียวตามข้อ 3 |
| แก้ API | field อ่านอย่างเดียว · test ของ route |
| งาน V แก้ฟอร์มเดียวกัน | V เริ่มหลัง 2D merge ครบ (D16) |

## 8. ข้อขัดแย้งที่สเปกนี้ตัดสิน

1. "ทุก budget `{}`" ในเอกสารเดิม (VFG `:209`, FMG `:21`, LFG `:18-19`, DESIGN.md:603, docs/14:98) → budget `{}` + `EXEMPT` (D1)
2. จำนวนผู้เรียก `ActionButton` ไม่ตรงกัน (9 / 7 / 3) → โค้ดมี 1 (`D/error.tsx:30`)
3. เจ้าของ `getMobileSafeBottomPaddingClasses` (DH บอก 2C-5 และ 2D) และ `getTableShellClasses` (2B-5 หรือ 2D) → 2D-1 ลบทั้งคู่
4. เป้าหมายกล่อง info: DESIGN.md:260 "neutral" กับ wiki ข้อ 20 "Notice info" → D7
5. ขนาดปุ่มหัวหน้า: 2B R-h `md`, 2B `05-lists.md` `lg`, 2A `04-buttons.md:210` `default` → `md` (D6)
6. 2A ให้รวม guard เป็นไฟล์เดียว (2A design :71) → คง 3 ไฟล์ (D13)
7. รายการคีย์ busy: DH 5 จุด, 2C `06-actions.md` 10 จุด → 10 จุด (ตรงกับโค้ด)
8. กฎ deploy เก่า (2A I22, 2C deploy ทีละชุด) → deploy ครั้งเดียวหลัง 2D และ V (D17)
