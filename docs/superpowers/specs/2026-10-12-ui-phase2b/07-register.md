> ร่างส่วนนี้ของสเปก 2B (หน้ารายการและโครงหน้า) · ข้อตัดสินของผู้ใช้ B1–B10 (`2026-10-12-ui-phase2b/00-decisions.md`) และ R-a…R-s (`2026-10-12-ui-phase2b/00-synthesis.md` ข้อ 1.1) ใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน · ตัวเลขและบรรทัดอ้างที่ `master` `d38a0ee`

## 7. ทะเบียนทรัพย์สิน (2B-3)

2B-3 ย้ายหน้า `/assets` ไปบนของกลางของ 2B-1 และคงสัญญาของทะเบียนใน `DESIGN.md:500-510` ไว้ครบ ไม่จัดหน้าใหม่: ชุดคอลัมน์ ลำดับแถบ และแถบคำสั่งกลุ่มบนมือถือเป็นของเฟส 3 (F:43, F:45, R-q)

- **รอ:** 2B-2 merge แล้ว (B7) · ของกลางของ 2B-1 อยู่บน `master` แล้ว
- **ปลด:** 2C plan 4 เริ่มได้เมื่อ 2B-3 merge และ 2C plan 3 merge แล้ว (B7) · 2C plan 4 แก้ dialog แก้ไขหลายรายการ `table.tsx:697-774`, ป้ายของแผงนำเข้า `D/assets/page.tsx:451` และ `D/asset-management/import-export/page.tsx:82` (C/07:516, C/07:588)
- **ไม่ deploy เอง** (B9) · ไม่มี schema, migration, API หรือ dependency ใหม่ · ไม่เพิ่ม token (2A I21)

ย่อ path: `D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/` · ไฟล์ของทะเบียนเขียนชื่อสั้น เช่น `table.tsx` = `c/assets/asset-register-table.tsx` (13 ไฟล์ขึ้นต้นด้วย `asset-register-`) · **DS** = `DESIGN.md` · **VFG** = `tests/visual-foundation-guards.test.ts` · **FMG** = `tests/form-migration-guards.test.ts`

**ตรวจแล้ว (read-only):**
- อ่านทุกบรรทัดที่อ้างที่ `d38a0ee`: `D/assets/page.tsx` (474 บรรทัด) · ไฟล์ของทะเบียน 13 ไฟล์ (2,103 บรรทัด) · `D/asset-management/import-export/page.tsx` · `c/ui/{pagination,search-field,field,field-variants,native-select,button,button-variants,sheet,dropdown-menu,clickable-table-row,nil,action-empty-state}.tsx` · `src/lib/{asset-register-columns,display-format}.ts` · test 20 ไฟล์ที่อ่านไฟล์ของทะเบียน
- ความกว้างคอลัมน์คิดด้วย `p2b-spec/work/07/widths.mjs` (อ่าน `src/lib/asset-register-columns.ts` อย่างเดียว)
- ไฟล์ทะเบียนทุกไฟล์เป็น LF · test ที่ไม่แปลง CRLF: `tests/asset-register-ux.test.ts`, `tests/asset-status-help-ui.test.ts` (regex ใหม่ในสองไฟล์นี้ห้ามมี `\n`)

**ตัวเลขฐานที่ HEAD** (งาน 3.0 นับซ้ำที่ HEAD ของ branch):

| เรื่อง | จำนวน | ที่ |
|---|---|---|
| `toLocaleString(` (ระบุ locale ทุกตัว จึงไม่อยู่ใน 44 ของ 2A) | 5 | `table.tsx:174-176` · `D/assets/page.tsx:348` · `filter-sheet.tsx:85` |
| `formatCurrency` · `"-"` | 1 · 1 | `table.tsx:660` (null ได้ `"-"` จาก `src/lib/utils.ts:44`) · `table.tsx:644` |
| รหัสหลักที่ยังไม่ห่อ `tag` | 4 | `table.tsx:625` (รหัส) · `:635` (Serial) · `mobile-list.tsx:57`, `:102` |
| checkbox เลือกแถว (O1) | 3 | `table.tsx:544`, `:615` (`h-4 w-4` 16px ไม่มีเป้า 44) · `mobile-list.tsx:93` (`size-5` ในแถว 80px) |
| `LabeledSelect` | 7 ครั้ง | `filter-sheet.tsx:103`, `:113`, `:119`, `:128`, `:134`, `:140`, `:164` (นิยาม `:194-225`) |
| `<select>` / `<input>` ที่เขียนเอง (ไม่นับ dialog ของ 2C) | 3 / 1 | `toolbar.tsx:41`, `:53`, `:65` · `search-field.tsx:77` |
| ปุ่มและลิงก์หน้าตาปุ่มที่เขียน class เอง ที่ข้อนี้แปลง | 13 (+1 ที่ 2B-1 แปลง) | `table.tsx:438`, `:464`, `:472`, `:480`, `:488` · `toolbar.tsx:83` · `sort-menu.tsx:35` · `column-picker.tsx:58` · `export-menu.tsx:13` · `row-actions.tsx:93`, `:163`, `:259` (ลบไปกับตัวห่อ `RowActions`, I5) · `search-field.tsx:107` · ลิงก์สร้างของ `MasterDataHeader` (`c/master-data/master-data-layout.tsx:29-35`) แปลงเป็น `buttonVariants({ size: "md" })` ใน 2B-1 งาน 3 (I2) |
| เงา | 2 | `table.tsx:152` สีดิบ `rgb(15_23_42/0.25)` (ตัดออก R-j) · `:455` `shadow-lg` แถบคำสั่งกลุ่ม (คงไว้ R-q, R2 budget 1 ที่ VFG:270) |
| ความกว้างตารางขั้นต่ำ (ช่องว่างจริง 1,117 = 1440 − เมนูข้าง 256 − padding 48 − แถบเลื่อน 17 − ขอบ 2, `docs/superpowers/plans/2026-10-07-asset-register-redesign.md:45`) | ชุด operations 1,094 · accounting 1,098 · audit 1,254 · all 1,614 | `src/lib/asset-register-columns.ts:57-70` |

**ความสูงแถวจริง:** B3(3) และ Q3.3 เขียน "ประมาณ 36px" ซึ่งเป็นบรรทัดข้อความ 20 + `py-2` แต่ทุกชุดคอลัมน์มีคอลัมน์ชื่อที่มีรูปย่อ 40px (`table.tsx:631`) แถวจริงจึงสูง 56px · ถ้าซ่อนคอลัมน์ชื่อ แถวสูง 48 (ปุ่ม 32 + `py-2`) · "คงแถวแน่นเดิม" ในข้อนี้แปลว่าคง `px-3 py-2` ไม่ใช้ `p-3` ของ DataTable ตั้งต้น · แถวแน่นเป็น class ประจำไฟล์ `headerClasses` / `cellClasses` ใน `table.tsx` (I3) · `DataTable` ไม่มี `density`

### 7.1 งานและลำดับ

ไฟล์ละ 1 commit · ทุก commit ผ่าน `npm test` และ tsc · test ที่พังโดยตั้งใจแก้ใน commit ที่ทำให้พัง (ข้อ 7.17)

| งาน | ไฟล์ | เนื้องาน | test ที่แก้ใน commit นี้ |
|---|---|---|---|
| 3.0 | — | นับตัวเลขฐานซ้ำที่ HEAD ของ branch · เทียบกับตารางข้างบน | — |
| 3.1 | `D/assets/page.tsx` · `D/asset-management/import-export/page.tsx` | หัวหน้า (7.4) · ตัวนับแท็บ `formatCount` | `asset-register-filter-ui.test.ts:108` (`:112-119` แก้แล้วใน 2B-1 งาน 3, I2) |
| 3.2 | `toolbar.tsx` · `search-field.tsx` · `filter-chips.tsx` | แถบเครื่องมือ (7.5) · select เป็น `FilterSelect` (I6) · ชิปเป็นตัวห่อ `FilterChipList` (I7) | `asset-register-search-ui.test.ts:26`, `:28` · `asset-register-filter-ui.test.ts:79-82` |
| 3.3 | `filter-sheet.tsx` | เนื้อใน sheet ตัวกรอง (7.6) · `FilterSelect labelAction` แทน `LabeledSelect` (I6) | `asset-register-filter-ui.test.ts:58-59` · `asset-status-help-ui.test.ts:49-51` |
| 3.4 | `status-tabs.tsx` | แท็บสถานะบน `TabNav` (7.7) | `asset-register-filter-ui.test.ts:69-72` · VFG:143-148 |
| 3.5 | `row-actions.tsx` · `src/lib/asset-register-columns.ts` | ตัวห่อ `RowActions` ช1 (I5) · ลบ sheet ⋯ ประจำไฟล์ · ความกว้างคอลัมน์ (7.9, 7.8.4) | `asset-register-table-ui.test.ts:15-20`, `:25` · `dropdown-menus-ui.test.ts:28`, `:31-32`, `:36-37` (I5: ตรวจพฤติกรรมเดิมที่ `c/ui/row-actions.tsx`) · `asset-register-view-model.test.ts:164` |
| 3.6 | `table.tsx` · `sort-menu.tsx` · `column-picker.tsx` · `export-menu.tsx` · `D/assets/page.tsx` (label `purchasePriceBaht`) · `messages/*.json` (`asset.noCustodian`) | ตาราง หัวตาราง เซลล์ checkbox แถวว่าง ส่วนท้าย ปุ่มของแถบสรุปและแถบคำสั่งกลุ่ม (7.8) · label ใหม่ต้องอยู่ commit เดียวกับ type ของ `labels` ใน `table.tsx:93-145` | `asset-register-table-ui.test.ts:56`, `:125-126` · `asset-register-ux.test.ts:99` |
| 3.7 | `mobile-list.tsx` | รายการมือถือ (7.10) | `asset-register-table-ui.test.ts:161` |
| 3.8 | — | `npm run verify` + production build (`next build` + `next start`) + ตรวจบนแอป dev (7.15) | — |
| 3.9 | เอกสารและ wiki (7.16) | | |

3.5 ต้องมาก่อน 3.6 เพราะคอลัมน์คำสั่งกว้างขึ้นพร้อมปุ่ม ช1 · 3.2 ถึง 3.4 ไม่พึ่งกัน

### 7.2 ของกลางที่ใช้ และสิ่งที่ทะเบียนต้องการจากของกลาง

ทะเบียนใช้ของกลางของ 2B-1 ตามตารางนี้ · **API ของกลางตามข้อตัดสิน I1, I3, I5, I6, I7, I9 (ข้อ 10.2) · ทะเบียนไม่ขอ prop เพิ่ม** · ข้อยกเว้นเดียวที่อยู่ในไฟล์ของทะเบียนคือ class แถวแน่น (I3)

| ของกลาง | ทะเบียนใช้ที่ | ต้องมี |
|---|---|---|
| `PageHeader` (`c/ui/page-header.tsx`, server) | `D/assets/page.tsx` · import-export | ตาม I1 · `compactOnMobile`: แถว `"flex items-center justify-between gap-3 md:items-start md:gap-x-6"` · h1 `"text-2xl font-semibold text-balance break-words text-foreground"` + `"max-md:text-xl"` (น้ำหนัก 600 B3(1)) · meta `"mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground"` + `"max-md:hidden"` · ปุ่ม `"flex flex-wrap items-center gap-2 md:justify-end"` + `"shrink-0"` · `meta` · `actions` · `className` (จัดวาง `mb-4 md:mb-6`, I32) |
| ส่วนของ `DataTable` (server-safe) | `table.tsx` ตารางจอใหญ่ | **ไม่มี `density`** (I3) · ใช้ `DataTableBody`, `ClickableTableRow`, `TableEmptyRow`, `DataTableFoot` และ `DataTableHead sort` เฉพาะคอลัมน์กลาง · th และ td อื่นใช้ class ประจำไฟล์ `headerClasses` = `"border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"` · `cellClasses` = `"border-b border-border-soft px-3 py-2 align-top"` · ช่องคำสั่ง `cn(cellClasses, "pl-1.5 pr-2")` · ไม่มี gutter 20px ที่คอลัมน์แรกและสุดท้าย (ความกว้างในข้อ 7.8.4 คิดแบบไม่มี gutter) · หัวตาราง B3(2) · ผู้เรียกเขียน `<table>` และ `<colgroup>` เอง |
| `ClickableTableRow` (2B-1 งาน `group/row`) | แถวตาราง | `group/row` และ `focus-within:bg-row-hover` บน `<tr>` · คง `data-no-row-click`, `onNavigate`, `focus-visible:ring-inset` |
| `RowActions` (`c/ui/row-actions.tsx`, client) | `row-actions.tsx` ทั้งจอใหญ่และมือถือ | API ข้อ 3.11 ตัวเดียว (I5): `code`, `name`, `menuLabel`, `next`, `groups`, `deleteAction`, `menu` · ไม่มี children, `triggerRef`, `contentClassName` · `next` ส่งเฉพาะจอใหญ่ (`null` = ช่องว่าง 120 แล้ว ⋯ อยู่ช่องเดิม) · ลบและคืนโฟกัสอยู่ใน primitive (`useDeleteAction` `returnFocusRef: triggerRef`) · แผงเมนูกว้างตามค่าตั้งต้น `min-w-60` · หัว sheet `<span className="tag font-medium">{code}</span>` (R-p) · กว้างรวม 156 (`120 + 4 + 32`, สูตร `MK/base.css:325-331`) |
| `TabNav` (`c/ui/tab-nav.tsx`, server) | `status-tabs.tsx` | API ข้อ 3.12 ไม่มี `fullBleed` (I9) · `aria-label` · `items: TabNavItem[]` (`key`, `label`, `href`, `count` เป็น string ที่จัดรูปแล้ว) · `current` · `className` และ `...navProps` ที่ `<nav>` (`data-asset-status-tabs`) · เส้นใต้ทุกขนาดจอและเป้า 44 ต่ำกว่า `md` (B3(5)) · `overflow-x-auto` ทุกขนาดจอ · เส้นฐานเป็น inset shadow บน list และเส้นของแท็บที่เลือกอยู่ใน list (DS:503) |
| `FilterSelect` (`c/ui/filter-select.tsx`, server-safe) | `toolbar.tsx` · `filter-sheet.tsx` | API ข้อ 6.3.1 (I6) · `hideLabel` + `fieldSize="md"` ในแถบเครื่องมือ · `labelAction` ใน sheet · controlled ผ่าน `key` / `defaultValue` / `onChange` เดิม |
| `FilterChipList` (`c/ui/filter-chips.tsx`, server-safe) | `filter-chips.tsx` | props และ markup ข้อ 6.3.3 (I7): `chips` (`mobileOnly`), `label`, `removeLabel`, `clearAll`, `className` · ชื่อที่อ่าน `` `${removeLabel}: ${chip.label}` `` |
| `Pagination` (`c/ui/pagination.tsx`) | ส่วนท้ายตาราง | API เดิม `page`, `totalPages`, `previousHref`, `nextHref`, `labels` (R-k) · ไม่มีตัวเลือกจำนวนต่อหน้าในตัว (ทะเบียนเลือก 10/25/50/100 ใน sheet, DS:504) |
| ของ 2A / 2C ที่มีแล้ว | ทุกไฟล์ | `Button` / `buttonVariants` · `SearchField` (`onClear` + `clearLabel`, `loading`, `fieldSize`) · `Field labelAction` · `NativeSelect` · `checkboxVariants` · `Nil` / `orNil` · `formatCount` / `formatMoney` · `linkVariants` · `ActionEmptyState actionVariant` |

**ไม่ใช้:** `StatStrip` · `KeyValueList` · `DataTableScrollArea` (I4: ทะเบียนคง `isOverflowing` + ข้อความ `asset.tableScrollHint` `table.tsx:202-213`, `:519-526` เพราะตัวเลื่อนถือ `ref`, `data-asset-desktop-table` และคอลัมน์ค้าง) · `DataTable` ตัวห่อ (ทะเบียนเขียนกรอบ ตัวเลื่อน และ `<table>` เอง ข้อ 7.8.1)

### 7.3 สัญญาของทะเบียน (`DESIGN.md:500-510`)

ข้อความเดิมที่ HEAD:

> **List page pattern (asset register, 2026-10-07).** New list pages follow the register (`/[locale]/assets`):
>
> - **Search bar card:** a search field that searches while typing (400ms pause, 2+ characters, not during IME composition, Enter searches at once, × clears) plus the two or three scope selects a person uses most. Below `md` the bar holds only search and ⚙, and it sticks to the top while the list scrolls.
> - **Status tabs with live counts** for the handful of states people switch between; any other state lives in the filter sheet. The tab nav keeps `overflow-x-auto` at every width, so the row scrolls when the tabs do not fit. From `md` up the baseline is an inset shadow on the list (`md:min-w-full md:shadow-[inset_0_-1px_0_var(--border)]`), and the active tab's `md:border-b-2 md:border-primary` sits inside the list over it, so the underline scrolls with the tabs and is never clipped. Do not use `md:overflow-visible` or a `-mb-px` overlap on a scrolling tab row.
> - **⚙ filter Sheet** (right on desktop, bottom on phones) for everything else. Changes apply at once, the sheet stays open, and its footer reads "ล้าง" and "แสดง N รายการ" with the real result count.
> - **Removable chips** for every active filter that is not visible on screen, plus "ล้างทั้งหมด".
> - **Filters live in the URL.** Changes go through `router.replace` with an optimistic state (`AssetRegisterNavigationProvider`), so the back button leaves the page in one step and controls never bounce back.
> - **Rows:** one next-step button chosen by status (for example "ส่งมอบ" / "รับคืน") plus a ⋯ menu that holds every action, with disabled items explaining why. The ⋯ menu is a `DropdownMenu` on desktop and a bottom `Sheet` on phones. Clicking a row opens the detail page.
> - **Desktop table:** `table-fixed` with a `<colgroup>`, only the key column and the actions column pinned, one-line truncated cells with a `title`. The default column set must fit 1440px without horizontal scroll, and the scroll hint appears only when the table really overflows.
> - **Phone rows:** about 80px each — 44px thumbnail, tag, name, then location and a status badge on one line, and ⋯. A "เลือก" mode turns rows into checkboxes, and its bulk bar floats above the bottom navigation.
> - **Thumbnails:** list images come from `/api/attachments/{id}/thumbnail` (96px WebP, cached); never load original files in a list.

| ข้อ | 2B-3 | ข้อความ DS หลัง 2B-3 |
|---|---|---|
| Search bar card | **แก้ตาม B3(4):** ไม่มีกรอบการ์ดตั้งแต่ `md` · ช่องและปุ่มสูง 36 · พฤติกรรมค้นหาเดิมทุกข้อ · มือถือคงแถบติดบนและ 44 | "**Search bar:** … From `md` up the bar has no frame; the search field, the scope selects and the ⚙ button are 36px (`fieldSize="md"`, `Button size="md"`). Below `md` …" (ส่วนอื่นคงเดิม) |
| Status tabs | **แก้ตาม B3(5):** `TabNav` เส้นใต้ทุกขนาดจอ เป้ากด 44 ต่ำกว่า `md` · ตัวนับเป็นตัวเลข `text-meta num` ไม่มีพื้น · กติกา `overflow-x-auto` และ inset shadow ยังอยู่ แต่ใช้ทุกขนาดจอ | ลบ `md:` ออกจาก class ที่ยกมา · ชี้ไปที่ `TabNav` (`src/components/ui/tab-nav.tsx`) · ประโยค "Do not use `md:overflow-visible` or a `-mb-px` …" คงไว้ (เขียนเป็น `overflow-visible`) |
| ⚙ filter Sheet | คง · เนื้อในใช้ `FilterSelect` (`Field` + `NativeSelect`, I6) · ปุ่ม "แสดง N รายการ" เป็น `busy` ระหว่างโหลด | เติม "fields are `FilterSelect` (`Field` + `NativeSelect`); status and condition carry their help button in `labelAction`" |
| Removable chips | คง · ชิปเป็น `FilterChipList` (I7) สูง 36 จาก `md` · "ล้างทั้งหมด" เป็น `linkVariants` | คงเดิม |
| Filters live in the URL | คง (ไม่แตะ `c/assets/asset-register-navigation.tsx`) | คงเดิม |
| Rows | **แก้ตาม ช1 (F:34):** ปุ่มถัดไปกว้างตายตัว 120 ไม่มีพื้น ได้ `primary-soft` เมื่อชี้หรือโฟกัสอยู่ในแถว · ⋯ `ghost icon-sm` ในช่องตายตัว (แถวที่ไม่มีงานถัดไปมีช่องว่าง) · รายการที่กดไม่ได้ใช้ `unavailable` + เหตุผล (2A) | "**Rows:** `RowActions` (owner choice ช1): a fixed 120px next-step button chosen by status, or an empty slot, then ⋯ in a fixed slot …" |
| Desktop table | คงทั้งหมด · คอลัมน์คำสั่ง 172 · ไม่มีเงาที่คอลัมน์คำสั่ง (เส้น `border-l` คั่นแทน, R-j) · หัวตาราง B3(2) · แถวแน่น `px-3 py-2` จนเฟส 3 (B3(3)) เป็น class ประจำไฟล์ `headerClasses` / `cellClasses` ของ `table.tsx` ไม่ใช่ prop ของ `DataTable` (I3) | เติม "rows stay dense (`px-3 py-2`) until phase 3; the actions column is 172px; operations and accounting presets are 1,116px" |
| Phone rows | คง · checkbox โหมด "เลือก" ใช้ `checkboxVariants({ size: "lg" })` | คงเดิม |
| Thumbnails | คง | คงเดิม |

**ประโยคที่ยกไปใช้กับทุกหน้ารายการไม่ได้แล้ว:** หัวข้อ "New list pages follow the register" ยังจริงสำหรับโครง (ค้นหา · แท็บ · sheet · ชิป · URL · แถว ช1) แต่ความแน่นของแถวเป็นข้อยกเว้นของทะเบียน (B3(3)) · เติมประโยคนี้ใต้หัวข้อ

### 7.4 หัวหน้า (`D/assets/page.tsx`)

| เดิม | ใหม่ |
|---|---|
| `<MasterDataHeader compactOnMobile title subtitle createHref createLabel />` (`:327-333`) · หลัง 2B-1 เป็นตัวห่อบางของ `PageHeader` (I2) | `<PageHeader compactOnMobile className="mb-4 md:mb-6" title={t("title")} meta={t("subtitle")} actions={…} />` (ข้อ 4.4.4) |
| ลิงก์สร้างใน `MasterDataHeader` (`master-data-layout.tsx:29-35` · 2B-1 เปลี่ยนเป็น `buttonVariants({ size: "md" })` + `<Plus aria-hidden="true" />` แล้ว, I2) | ย้ายมาอยู่ใน `actions` ของหน้า: `<Link href={`/${locale}/assets/new`} className={buttonVariants({ size: "md" })}><Plus aria-hidden="true" />{tCommon("create")}</Link>` · 36 บนจอใหญ่ 44 บนมือถือ (R-h) · ใช้ `buttonVariants` บน `Link` แบบ `D/assets/[id]/page.tsx:922` เพราะหน้าเป็น server |
| `import { MasterDataHeader }` (`:21`) | `import { PageHeader }` · `import { buttonVariants }` · `import Link` · `import { Plus }` |
| ตัวห่อ `<div>` เปล่า (`:326`) · ระยะหัวถึงแถบเครื่องมือ `mb-4 md:mb-6` มาจาก `className` ที่ `MasterDataHeader` ส่งให้ `PageHeader` (I2) | รากคง `<div>` เปล่า (I32 · ข้อ 4.6.1 ข้อ 3) · `mb-4 md:mb-6` เป็น `className` ของ `PageHeader` · ระยะที่เห็นยังเป็น 16 บนมือถือ / 24 บนจอใหญ่ |
| `count: tab.count.toLocaleString(numberLocale)` (`:348`) · `numberLocale` (`:210`) | `count: formatCount(tab.count)` · ลบ `:210` |
| `labels.purchasePrice` ส่งให้ตาราง (`:406`) | คงไว้ (ใช้ในไฟล์ CSV `table.tsx:314`) · งาน 3.6 เพิ่ม `purchasePriceBaht: t("purchasePriceBaht")` สำหรับหัวคอลัมน์ (key มีแล้ว "ราคาซื้อ (บาท)" / "Purchase Price (THB)", ใช้ที่ `c/assets/asset-form.tsx:1134`) |

ไม่แตะ: query ทั้งหมด (`:56-206`) · `buildAssetRegisterChips` (`:229-273`) · row model (`:274-323`) · แผงนำเข้า `:427-471` (รั้ว 2C plan 4 · `:451`)

ไม่มีเส้นทางนำทางและไม่มีปุ่มกลับ (หน้าแรกของหมวด) · ทะเบียนจึงไม่อยู่ใน 11 จุดของ `tests/breadcrumbs-ui.test.ts:41-42`

### 7.5 แถบเครื่องมือ (`toolbar.tsx`, `search-field.tsx`, `filter-chips.tsx`)

**กรอบ** (`toolbar.tsx:34-37`)

| | class |
|---|---|
| เดิม | `sticky top-0 z-20 -mx-4 mb-3 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:rounded-lg md:border md:border-border md:bg-surface md:p-3` |
| ใหม่ | `sticky top-0 z-20 -mx-4 mb-3 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:px-0 md:py-0` |

- ส่วนต้น `sticky top-0 z-20 -mx-4 mb-3 bg-canvas ` คงตัวอักษรเดิม (VFG:111 · R-o ไม่แตะ padding ของ `<main>`) · ไม่มี `md:shadow-sm` (VFG:112)
- ลำดับในแถบคงเดิม: ค้นหา → 3 select (ตั้งแต่ `md`) → ⚙ · ต้นแบบวางแท็บเหนือแถบเครื่องมือ (`MK/screens/register.html:63-76`) แต่การสลับลำดับเป็นการจัดหน้าใหม่ จึงไว้เฟส 3

**ช่องและปุ่ม**

| จุด | เดิม | ใหม่ |
|---|---|---|
| select ×3 (`toolbar.tsx:41`, `:53`, `:65`) · class `:31` | `<select className={cn(getFieldControlClasses(), "w-44 shrink-0 truncate lg:w-48")}>` (ไม่มีลูกศร) | `<FilterSelect label={t("company")} hideLabel fieldSize="md" className="w-44 shrink-0 lg:w-48" key=… defaultValue=… onChange=…>` (I6 · ข้อ 6.3.4, 6.6) · ป้ายเป็น sr-only ตัวเลือกแรก "{ชื่อ}: ทั้งหมด" เดิมบอกชื่อที่เห็น · `className` ลงที่ตัวห่อของ `Field` (จัดวางเท่านั้น ข้อ 6.3.1) · 36 บนจอใหญ่ (B3(4)) · ได้ `select-chevron` · คง `key`, `defaultValue`, `onChange` และตัวเลือกเดิม (children) ทั้งสามช่อง (`asset-register-filter-ui.test.ts:39-42`) · ลบ `aria-label` (DS:448: ช่องไม่มีป้ายที่เห็นใช้ `hideLabel` · `:39-45` ไม่ยึด `aria-label`) · ลบ `selectClassName` และ import `getFieldControlClasses` (`cn` ยังใช้ใน `FilterCount` `:102`) |
| ปุ่ม ⚙ (`toolbar.tsx:83-91`) | `<button className="inline-flex min-h-11 min-w-11 … md:h-10 md:min-h-0">` | `<Button variant="outline" size="md">` · คง `SlidersHorizontal className="size-4"`, ป้าย `sr-only md:not-sr-only`, `FilterCount` ทั้งสอง (`FilterCount` เป็น pill ของ 2D ไม่แตะ) · ต่ำกว่า `md` กว้าง 44 (`px-3.5` + ไอคอน 16) |
| ช่องค้นหา (`search-field.tsx:62-120`) | `<form role="search" … className={cn("relative min-w-0", className)}>` + ไอคอน `:74-76` + `<input>` `:77-105` + ปุ่ม × `:106-119` | `<form role="search" action={`/${locale}/assets`} onSubmit={…} className={cn("min-w-0", className)}>` + hidden inputs `:71-73` เดิม + `<SearchField ref={inputRef} name="search" type="text" inputMode="search" enterKeyHint="search" autoComplete="off" spellCheck={false} fieldSize="md" loading={isPending} aria-label={tCommon("search")} placeholder={t("searchPlaceholder")} value={draft} onClear={clearSearch} clearLabel={t("searchClear")} onFocus onBlur onCompositionStart onCompositionEnd onChange />` |

- `clearSearch` = ตัวจัดการเดิม `:110-114` (`setDraft("")` · `search("")` · `inputRef.current?.focus()`)
- คง debounce 400ms, IME, Enter และ "URL ชนะเฉพาะตอนไม่มีคนพิมพ์" ตามเดิมทุกบรรทัด (`:23-56`, R-l, DS:502)
- `SearchField` ส่ง `ref` ต่อให้ `<input>` ได้เพราะ React 19.2.4 ส่ง `ref` เป็น prop (`package.json:47`, `c/ui/search-field.tsx:18`, `c/ui/input.tsx:13-24`)
- ไอคอนหมุนได้ `motion-reduce:animate-none` จาก `SearchField` (`search-field.tsx:25`) · ไอคอนเปลี่ยนจาก `text-muted-foreground` เป็น `text-faint-foreground`
- ลบ import `Loader2`, `Search`, `X`, `getFieldControlClasses`

**ชิปตัวกรอง** (`filter-chips.tsx`) คงไฟล์และชื่อ export `AssetRegisterFilterChips` (`D/assets/page.tsx:353` และ `asset-register-filter-ui.test.ts:20` เรียกตามชื่อ) เป็นตัวห่อ server ของ `FilterChipList` (`c/ui/filter-chips.tsx`, I7)

```tsx
import { FilterChipList } from "@/components/ui/filter-chips"

export function AssetRegisterFilterChips({ chips, clearAllHref, labels }: { … เดิม }) {
  return (
    <FilterChipList
      chips={chips}
      label={labels.activeFilters}
      removeLabel={labels.remove}
      clearAll={{ href: clearAllHref, label: labels.clearAll }}
      className="mb-3"
    />
  )
}
```

- `AssetRegisterChip` (`src/lib/asset-register-chips.ts:4`) มี `key`, `label`, `href`, `mobileOnly` ตรงกับ `FilterChipItem` · กติกา `mobileOnly` (ชิปขอบเขตซ่อนจาก `md`, กลุ่มซ่อนเมื่อทุกชิปเป็น `mobileOnly`) อยู่ใน `FilterChipList` แล้ว (ข้อ 6.3.3)
- ชื่อที่อ่านเท่าเดิม "ล้างตัวกรองนี้: บริษัท: GRL" (`:29` · `removeLabel` = `asset.clearDrilldownFilter` ที่ `D/assets/page.tsx:356` ส่งมาเดิม) · หน้าตาตามข้อ 6.3.3: สูง 36 จาก `md` (เดิม 32) มุม 8px ตัวอักษร `text-primary-hover` 13px · ✕ 24px · "ล้างทั้งหมด" เป็น `linkVariants()` · วงโฟกัส `focus-visible:ring-offset-2`
- `mb-3` เดิม (`:23`) ส่งเป็น `className` · `data-asset-active-filters` (`:22`) หายไป (ไม่มี test หรือโค้ดอ่าน) · ลบ import `Link`, `X`, `cn`

### 7.6 sheet ตัวกรอง (`filter-sheet.tsx`, เนื้อในเท่านั้น)

chrome ของ `c/ui/sheet.tsx` เป็นของ 2C (O10) · 2B แก้ได้แค่ `:90-180` (C/08:51)

| จุด | เดิม | ใหม่ |
|---|---|---|
| `SheetContent` `:92` | `closeLabel={tCommon("close")}` | ลบ (ค่าตั้งต้นของ primitive เป็น `tCommon("close")` อยู่แล้ว `sheet.tsx:62`) |
| `SheetHeader` `:96` | `className="border-b border-border pr-14"` | ไม่ส่ง className (primitive มี `border-b border-border px-4 py-4 pr-16` แล้ว `sheet.tsx:100` · `pr-14` เดิมทับ `pr-16` ใหม่ C/05:228) |
| `LabeledSelect` ×7 (`:103-164`) นิยาม `:194-225` | ป้าย `<div className="mb-1.5 flex … text-xs font-medium text-muted-foreground">` + popover `size="compact"` (16px) + `<select aria-label className={getFieldControlClasses()}>` | เรียก `FilterSelect` ตรง 7 จุด (I6) · ดูโค้ดใต้ตาราง · ลบ `function LabeledSelect` (LFG LF1 KEEP 0) · ป้ายเป็น `FieldLabel` (`fieldLabelClasses` = `text-meta font-medium text-foreground`, `field-variants.ts:44`) · ปุ่มช่วยเหลือของสถานะและสภาพอยู่นอก `<label>` ใน `labelAction` · ช่อง `lg` ค่าตั้งต้น (40 / 44) |
| ปุ่ม "แสดง N รายการ" `:175-178` | `{isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}` | `<Button onClick={() => setOpen(false)} aria-live="polite" busy={isPending}>{resultLabel}</Button>` · ลบ import `Loader2` |
| ข้อความผล `:81-85` | `total.toLocaleString(locale === "th" ? "th-TH" : "en-US")` | `formatCount(total)` · ลบ `const locale = useLocale()` `:55` และ import `useLocale` |
| `getFieldControlClasses` `:15` | import | ลบ |

```tsx
{/* Uncontrolled + key: remounts on the optimistic value, so it never bounces back. */}
<FilterSelect
  label={t("status")}
  labelAction={<AssetStateHelpPopover {...statusHelp} />}
  key={filters.statusId}
  defaultValue={filters.statusId}
  onChange={(event) => navigate({ statusId: event.target.value })}
>
  {/* ตัวเลือกเดิม :129-132 */}
</FilterSelect>
```

- อีก 6 จุดแบบเดียวกัน: สภาพ `labelAction={<AssetStateHelpPopover {...conditionHelp} />}` · บริษัท สาขา หมวดหมู่ ประเภทการถือครอง และจำนวนต่อหน้าไม่มี `labelAction` · `value` ของแต่ละจุดเป็น `key` + `defaultValue` · ตัวจัดการเดิม (`getCompanyChangeOverrides`, `navigate({ pageSize: Number(…) })`) รับ `event.target.value` · ลำดับ `label={t("status")}` ก่อน `label={t("condition")}` คงไว้ (`asset-status-help-ui.test.ts:44-48`)
- `FilterSelect` = `Field` + `NativeSelect` (ข้อ 6.3.1) · `key` อยู่ที่ `FilterSelect` ทั้งก้อนจึง remount พร้อม id ใหม่ของ `useId` · ช่องได้ชื่อจาก `<label for>` จึงไม่มี `aria-label`
- ปุ่มช่วยเหลือเปลี่ยนจาก `size="compact"` (16px, `c/assets/asset-state-help-popover.tsx:20`) เป็นค่าตั้งต้น 24px ซึ่ง `labelAction` ออกแบบไว้ (`-my-0.5`, C/03:133) · เป้ากดบนมือถือผ่าน 24px
- `busy` อยู่ในไฟล์ `"use client"` และปุ่มนี้ไม่มี `disabled` (FMG GB4 · `:172` ปุ่ม "ล้าง" ใช้ `disabled` คนละปุ่ม)
- ป้ายของปุ่มยังเปลี่ยนเป็น "กำลังโหลด…" ระหว่างโหลด เพราะป้ายคือผลลัพธ์ ไม่ใช่ชื่อคำสั่ง · K13 (ป้ายคงเดิมเมื่อ busy) ใช้กับไฟล์ของ 2C (`BUSY_LABEL_SWAPS`, FMG:121) ไม่ใช้กับไฟล์นี้
- คงไว้: `FilterSection` · `ChipGroup` (`aria-pressed`, `min-h-11 md:min-h-9`, `asset-register-filter-ui.test.ts:60-61`) · `SheetFooter className="grid grid-cols-2 gap-2 border-t border-border"` (ผู้เรียกคนเดียวของ `SheetFooter`, `tests/sheet-drawers-ui.test.ts:28-29`) · ลำดับปุ่ม "ล้าง" ก่อน "แสดง N" (K8) · `side`, ความกว้าง และความสูงของ sheet

### 7.7 แท็บสถานะ (`status-tabs.tsx` → `TabNav`)

เดิม (`status-tabs.tsx:13-44`): `<nav>` + ลิงก์ `aria-current` · ต่ำกว่า `md` เป็น pill มีกรอบ · ตั้งแต่ `md` เส้นใต้ `md:border-b-2` · ตัวนับเป็น pill `rounded-full px-1.5 text-xs` ที่เลือกแล้วพื้น `bg-primary` (`:30-34`)

ใหม่: ไฟล์เหลือเป็นตัวห่อ server ของ `TabNav` (ชื่อไฟล์และชื่อ component คงไว้ เพราะ `D/assets/page.tsx:343` และ `asset-register-filter-ui.test.ts:20` เรียกตามชื่อ)

```tsx
import { TabNav, type TabNavItem } from "@/components/ui/tab-nav"

export type AssetRegisterStatusTabItem = TabNavItem & { active: boolean }

export function AssetRegisterStatusTabs({ label, items }: { label: string; items: AssetRegisterStatusTabItem[] }) {
  return (
    <TabNav
      aria-label={label}
      items={items}
      current={items.find((item) => item.active)?.key ?? ""}
      data-asset-status-tabs
      className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"
    />
  )
}
```

- API ตาม I9: ไม่มี `fullBleed` · `data-asset-status-tabs` ไปถึง `<nav>` ผ่าน `...navProps` · `current` เป็น prop บังคับของ `TabNav` (ข้อ 3.12) จึงคง `active` ใน type ของ item ให้ `D/assets/page.tsx:345-351` ไม่ต้องแก้
- class วางตำแหน่งเดิมของ `:15` ย้ายมาเป็น `className` (แถวเลื่อนได้ถึงขอบจอบนมือถือ · `mb-2 … md:mb-3` ยังอยู่ `asset-register-filter-ui.test.ts:109`)
- หน้าตา เส้นใต้ ตัวนับ และเป้ากดมาจาก `TabNav` ทั้งหมด (ข้อ 7.2) · ตัวนับไม่มีพื้น (R-g · `MK/base.css:241-243`) จึงไม่มี R1
- ผู้ตรวจนับที่ใช้มือถือจะเห็นแท็บเป็นเส้นใต้แทน pill (B3(5) เลือกแล้ว)

### 7.8 ตาราง (`table.tsx`, `sort-menu.tsx`, `column-picker.tsx`, `export-menu.tsx`)

#### 7.8.1 โครงและหัวตาราง

| จุด | เดิม | ใหม่ |
|---|---|---|
| กรอบนอก `:433` | `aria-busy min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface` | คงทุกอย่าง (มุม 12px ตาม B3(2) อยู่แล้ว · กรอบนี้ห่อแถบสรุป แถบคำสั่งกลุ่ม รายการมือถือ และตาราง ไม่ใช่ shell ของ DataTable) |
| ตัวเลื่อน `:528-532` | `data-asset-desktop-table … relative overflow-x-auto overscroll-x-contain` + `ref` + `onScroll` | คง ยกเว้นลบ `onScroll` (ใช้กับเงาอย่างเดียว ข้อ 7.8.7) |
| `<table>` `:533` | `w-full table-fixed divide-y divide-border text-sm` + `style={{ minWidth }}` | `w-full table-fixed text-sm` + `style` เดิม (ไม่มี `group/table` และ `data-density`, I3) · เส้นแถวมาจาก `cellClasses` (`border-b border-border-soft`) · คง `<colgroup>` `:534-540` ทุกบรรทัด |
| `<thead className="bg-muted">` `:541` | พื้นเทาทึบ | `<thead>` ไม่มี class · พื้น `bg-surface` และเส้นล่าง `border-border` อยู่ที่ th ผ่าน `headerClasses` (B3(2)) |
| `headerClasses` `:154` และ string ซ้ำใน `SortableHeader` `:799` | `px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground` | class ประจำไฟล์ (I3): `const headerClasses = "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"` (13/20 500 สีจาง ไม่เป็นตัวพิมพ์ใหญ่, `MK/base.css:311`) · ใช้กับ th ที่ไม่เรียง (checkbox, หมวดหมู่ บริษัท/สาขา ที่ตั้ง ผู้ถือครอง ประเภทการถือครอง สถานะ สภาพ คำสั่ง) · string ซ้ำ `:799` หายไปกับ `SortableHeader` |
| `SortableHeader` `:779-807` (ลูกศรเป็นข้อความ `" ↑"`/`" ↓"` `:795`, ไม่มี `aria-sort`) | ตัวประจำไฟล์ | `DataTableHead sort` (I3 · คอลัมน์กลาง: รหัส ชื่อ ราคาซื้อ): `sort={{ href: buildHref({ sort: field, direction, page: 1 }), direction: filters.sort === field ? filters.direction : null }}` · `aria-sort` · ไอคอนลูกศร และลิงก์ `<span className="truncate">` มาจาก primitive (ข้อ 3.4) · `className` ส่ง sticky ของคอลัมน์รหัสตามเดิม (`:558`) · ลบ function |
| `HeaderWithHelp` `:809-822` | ป้าย + `AssetStateHelpPopover` 24px | คง (ใส่ใน `<th scope="col" className={headerClasses}>`) |
| หัวคอลัมน์คำสั่ง `:590-595` | `{labels.actions}` เห็นบนจอ · `text-right` | `<span className="sr-only">{labels.actions}</span>` แบบต้นแบบ (`MK/screens/register.html:86`) · ไม่มี key ใหม่ |
| หัวราคาซื้อ `:587-589` | `labels.purchasePrice` ชิดซ้าย | `labels.purchasePriceBaht` · `DataTableHead sort align="right"` (หน่วยอยู่ที่หัวคอลัมน์ DS:515) |
| sticky หัว `:150` | `assetRegisterStickyHeaderColumnClasses = "z-30 bg-muted"` | `"z-30 bg-surface"` |
| sticky ตัว `:151` | `"z-20 bg-surface group-hover:bg-row-hover group-focus:bg-row-hover"` | `"z-20 bg-surface group-hover/row:bg-row-hover group-focus-within/row:bg-row-hover"` (R-j, 2A I18 · พื้นตามโฟกัสไปถึงปุ่ม ⋯) |
| แถว `:607-613` | `<ClickableTableRow … className="group">` | `ClickableTableRow` ที่มี `group/row` จาก 2B-1 · ลบ `className="group"` |
| tbody `:598` | `divide-y divide-border` | `DataTableBody` (`[&>tr:last-child>td]:border-b-0`) · เส้นแถวมาจาก `cellClasses` |
| `cellClasses` `:153` | `px-3 py-2` | class ประจำไฟล์ (I3): `const cellClasses = "border-b border-border-soft px-3 py-2 align-top"` (`px-3 py-2` เท่าเดิม B3(3)) · คง const · td ทุกช่องใช้ `cn(cellClasses, …)` |

#### 7.8.2 เซลล์

| คอลัมน์ | เดิม | ใหม่ |
|---|---|---|
| รหัส `:623-627` | `<td … truncate border-r border-border font-medium text-foreground" title={asset.assetTag}>{asset.assetTag}</td>` | td เดิม (ลบ `font-medium`) + `<span className="tag font-medium">{asset.assetTag}</span>` (R-p, DS:301) · คง `title` · ตาราง `table-fixed` ตัด mono ด้วย `truncate` ของ td จึงไม่ดันคอลัมน์ 172 |
| Serial `:634-636` | `<div className="truncate text-xs text-muted-foreground" title=…>{asset.serialNumber}</div>` | `<div className="truncate text-meta text-muted-foreground" title=…><span className="tag">{asset.serialNumber}</span></div>` · ห่อด้วย `text-meta` เพราะ `tag` เล็กกว่าตัวห่อ 1px (12px ไม่ต่ำกว่าพื้น R3) · สูง 20 + ชื่อ 20 = รูปย่อ 40 แถวจึงสูงเท่าเดิม |
| ผู้ถือครอง `:644` | `{asset.custodian \|\| "-"}` | `{orNil(asset.custodian, t("noCustodian"))}` · key ใหม่ `asset.noCustodian` "ไม่มีผู้ถือครอง" / "No custodian" (DS:514 · `docs/19_THAI_GLOSSARY.md:20` ใช้ "ผู้ถือครอง") · คง `title={asset.custodian ?? undefined}` |
| ราคาซื้อ `:660` | `{formatCurrency(asset.purchasePrice)}` ชิดซ้าย (`฿` นำหน้า · null เป็น `"-"`) | `<td className="… truncate text-right num">{formatMoney(asset.purchasePrice) ?? <Nil />}</td>` (DS:515) · ลบ `formatCurrency` จาก import `:9` |
| หมวดหมู่ · บริษัท/สาขา · ที่ตั้ง (`:641-643`) | สตริง "CODE - ชื่อ" | คงเดิม · ไม่แยกรหัสออกมาห่อ `tag` (ต้องเปลี่ยน row model, CSV `:316-328`, ชิป และ pin `asset-register-table-ui.test.ts:113`) · เฟส 3 เปลี่ยนเนื้อคอลัมน์เหล่านี้อยู่แล้ว (`MK/screens/register.html:92-93`) |
| ป้าย 3 คอลัมน์ `:645-659` | `StatusBadge` | คงเดิม |

`useLocale` (`:6`, `:171`) และ `numberLocale` ใช้กับช่วงแถวอย่างเดียว → ช่วงแถว `:173-177` เป็น `formatCount(fromRow)`, `formatCount(toRow)`, `formatCount(total)` แล้วลบ `useLocale` · จำนวนที่เลือกในแถบคำสั่งกลุ่ม `:460` เป็น `formatCount(selectedAssets.length)`

#### 7.8.3 checkbox เลือกแถว (O1, K16, เป้ากด 44)

| จุด | เดิม | ใหม่ |
|---|---|---|
| หัวตาราง `:543-551` | `<th className={headerClasses}><input type="checkbox" … className="h-4 w-4 rounded border-border text-primary" /></th>` | `<th scope="col" className={cn(headerClasses, "p-0")}><label className="flex min-h-11 w-11 cursor-pointer items-center justify-center"><input type="checkbox" … aria-label={labels.all} className={checkboxVariants()} /></label></th>` |
| แถว `:614-622` | `<td className={cellClasses}><input type="checkbox" … className="h-4 w-4 rounded border-border text-primary" /></td>` | `<td className={cn(cellClasses, "p-0")}><label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center"><input type="checkbox" … aria-label={asset.assetTag} className={checkboxVariants()} /></label></td>` |

- คอลัมน์เลือกกว้าง 44 (`asset-register-columns.ts:58`) = `w-11` · label เต็มเซลล์ จึงกดได้ 44×44 โดยไม่เพิ่มความกว้าง
- `p-0` ทับ `px-3 py-2(.5)` ของ class ประจำไฟล์ด้วย `cn` (twMerge) ได้ เพราะไม่มี `first:pl-*` ของ primitive (I3) · เส้นล่างและพื้นของหัวยังมาจาก `headerClasses` / `cellClasses`
- **`data-no-row-click` บน label ของแถวจำเป็น:** `ClickableTableRow` ข้ามคลิกจาก `a,button,input,select,textarea,[data-no-row-click]` เท่านั้น (`clickable-table-row.tsx:27`) ไม่ข้าม `<label>` · ถ้าไม่ใส่ คลิกที่ขอบ checkbox จะเปิดหน้ารายละเอียด
- `checkboxVariants()` = `size-4` สีจาก `accent-color` (`field-variants.ts:46-58`) · class `text-primary` เดิมไม่มีผลกับ checkbox ของเบราว์เซอร์อยู่แล้ว
- หัวตารางสูงขึ้นเป็น 44 (เดิม 40 หรือ 44 ตาม popover ช่วยเหลือ)
- FMG GF7 ของ `table.tsx` นับ 6 → เหลือ 4 (ป้าย 4 ช่องของ dialog `:708`, `:723`, `:738`, `:748`) · budget เป็นค่าสูงสุด จึงผ่านโดยไม่แก้ FMG (2C plan 4 ลดตัวเลข)

#### 7.8.4 ความกว้างคอลัมน์ (`src/lib/asset-register-columns.ts:57-70`)

ช1 ต้องการ 156px (ปุ่มถัดไป 120 + ช่องว่าง 4 + ⋯ 32) แต่คอลัมน์คำสั่งกว้าง 150 รวม padding (`px-3` เหลือเนื้อ 125)

| ค่า | เดิม | ใหม่ | เหตุผล |
|---|---|---|---|
| `actions` | 150 | **172** | 172 − `pl-1.5` 6 − `pr-2` 8 − ครึ่งเส้น `border-l` 0.5 = 157.5 ≥ 156 |
| th/td คอลัมน์คำสั่ง | `px-3` | **`pl-1.5 pr-2`** (`cn(headerClasses, "pl-1.5 pr-2", …)` ที่ th `:590` · `cn(cellClasses, "pl-1.5 pr-2")` ที่ td `:661` · class ประจำไฟล์จึงไม่แพ้ `last:pr-*` ของ primitive, I3) | ถ้าใช้ `px-3` ต้อง 180 → ชุด operations 1,124 เกิน 1,117 |
| `companyBranch` | 120 | **116** | ให้ชุด accounting ไม่เลื่อนที่ 1440 (ดูตารางล่าง) · เนื้อจริงเป็นรหัสสั้น "CO / BR" (`D/assets/page.tsx:299`) |

| ชุดคอลัมน์ | เดิม | ใหม่ | เพดาน 1,117 |
|---|---|---|---|
| operations (ค่าตั้งต้น, DS:508) | 1,094 | 1,116 | ผ่าน (เหลือ 1) |
| accounting | 1,098 | 1,116 | ผ่าน (ถ้าไม่ลด `companyBranch` จะเป็น 1,120 และเลื่อนที่ 1440) |
| audit | 1,254 | 1,276 | เลื่อนเหมือนเดิม |
| all | 1,614 | 1,632 | เลื่อนเหมือนเดิม (`asset-register-view-model.test.ts:166`) |

- `name` คง 200 (`asset-register-view-model.test.ts:163`)
- เหลือที่ 1px เพราะ 1,117 หักแถบเลื่อน Windows 17 ไว้แล้ว · ตรวจจริงที่ 1440 บน Windows (ข้อ 7.15)

#### 7.8.5 แถวว่าง

| จุด | เดิม | ใหม่ |
|---|---|---|
| `emptyState` `:422-426` | มีตัวกรอง → ปุ่ม "ล้างตัวกรอง" สีหลัก | เพิ่ม `actionVariant: "secondary"` เมื่อมีตัวกรอง (A/07:316) · คง `title`, `description`, `actionHref` |
| ตาราง `:599-604` | `<tr><td colSpan={visibleColumnCount + 2} className="px-4 py-6"><ActionEmptyState {...emptyState} /></td></tr>` | `<TableEmptyRow colSpan={visibleColumnCount + 2} emptyState={emptyState} />` (td `p-0`, A:69 · แบบ `emptyState` ของข้อ 3.5 render `ActionEmptyState` เอง) |
| มือถือ `:500-503` | `<div className="p-3 md:hidden"><ActionEmptyState {...emptyState} /></div>` | คงเดิม (ได้ `actionVariant` จาก `emptyState`) |

#### 7.8.6 แถบสรุป ส่วนท้าย และการแบ่งหน้า

| จุด | เดิม | ใหม่ |
|---|---|---|
| แถบสรุป `:434` | `flex items-center justify-between gap-2 border-b border-border px-3 md:px-4 py-0 md:py-2` | คงเดิม (`asset-register-table-ui.test.ts:194`) |
| ช่วงแถวด้านบน `:435` | `text-sm text-muted-foreground` | `text-meta text-muted-foreground num` |
| ปุ่ม "เลือก/เสร็จ" `:438-445` (มือถือ) | `<button aria-pressed className="inline-flex min-h-11 … text-primary … md:hidden">` | `<Button variant="ghost" size="md" aria-pressed={selectMode} onClick={toggleSelectMode} className="md:hidden">` · ตัวอักษรเปลี่ยนจาก `text-primary` เป็นสี ghost |
| ปุ่มเรียง (`sort-menu.tsx:35-43`) | มือถือไม่มีกรอบ `min-h-11 px-2` · จอใหญ่กรอบ `md:h-9 md:border md:bg-surface md:px-3` | `<Button variant="ghost" size="md" aria-label=… className="md:border-control-border md:bg-surface md:text-foreground md:hover:border-input md:hover:bg-background">` · มือถือไม่มีกรอบ (แถบสรุปสูง 44 พอดีปุ่ม กรอบจะชนเส้นบนและล่าง) · จอใหญ่หน้าตาเท่า `outline` · คง `ArrowUpDown`, ป้าย `hidden md:inline` |
| ปุ่มคอลัมน์ (`column-picker.tsx:58-60`) · ส่งออก (`export-menu.tsx:13-15`) | `inline-flex h-9 … border border-border bg-surface px-3` | `<Button variant="outline" size="md">` (36 · แสดงเฉพาะ `md` ขึ้นไปใน `<div className="hidden items-center gap-2 md:flex">` `:446` ซึ่งคงตัวอักษรเดิม `asset-register-table-ui.test.ts:83`, `asset-register-ux.test.ts:123`) |
| ส่วนท้าย `:681-695` | `flex flex-col gap-3 border-t border-border px-4 py-3 md:flex-row …` + `<p className="text-sm text-muted-foreground">{rangeLabel}</p>` + `Pagination` | `DataTableFoot` (I3 · ต้นแบบ `.table-foot`: `border-t`, `text-meta`, `py-2.5`) + `<p className="num">{rangeLabel}</p>` + `<Pagination … />` props เดิมทุกตัว · ข้อความช่วงแถวยังเป็น `asset.registerRange` (`asset-register-table-ui.test.ts:94`) |

#### 7.8.7 เงาและแถบคำสั่งกลุ่ม

**เงาคอลัมน์คำสั่ง (ตัดออก R-j):** ลบ `assetRegisterActionsShadowClasses` `:152` · `hasMoreRight && …` ที่ `:592` และ `:661` · state `hasMoreRight` `:200` · `setHasMoreRight(…)` ใน `measure` `:207` · `onScroll` `:531` · import `hasRemainingHorizontalContent` `:10` (ตัว helper ยังใช้ที่ `c/assets/asset-detail-tabs.tsx:11` จึงไม่ลบ `src/lib/horizontal-scroll.ts`) · คอลัมน์คำสั่งยังมี `border-l border-border` คั่น · ตัวบอกว่าเลื่อนได้ `:519-526` และ `isOverflowing` ยังอยู่ (DS:508)

**แถบคำสั่งกลุ่ม `:452-498` (R-q):** container `:453-456` คง class เดิมทุกตัว รวม `fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))]` และ `shadow-lg` · ห้ามย้ายไปไฟล์ใหม่ (R2 budget 0 ของไฟล์ใหม่ · FMG GL1 `:351`) · VFG:270 คง 1 · ปุ่ม 4 ปุ่มเป็น `Button`:

| ปุ่ม | เดิม | ใหม่ |
|---|---|---|
| พิมพ์ป้าย `:464-471` | `min-h-11 … bg-primary … sm:h-9` | `<Button size="md" className="w-full sm:w-auto"><Printer />…</Button>` |
| แก้ไขหลายรายการ `:472-479` (trigger ของ dialog 2C · เป็นของ 2B ตาม C/06:301) | `border border-border bg-surface … sm:h-9` | `<Button variant="outline" size="md" className="w-full sm:w-auto" onClick={() => setBulkUpdateOpen(true)}><Edit />…</Button>` |
| ส่งออกที่เลือก `:480-487` · ล้างที่เลือก `:488-495` | เหมือนกัน | `variant="outline" size="md"` แบบเดียวกัน |

- ไอคอนลบ `className="h-4 w-4"` (`Button` ตั้ง 16px ให้ `button-variants.ts:16`)
- ความสูง: เดิม 36 ตั้งแต่ `sm` · ใหม่ 36 ตั้งแต่ `md` (ช่วง 640–767 สูง 44 ซึ่งแถบยังลอยอยู่)
- หัว "คำสั่งกลุ่ม" `:458` คงตัวอักษรเดิม (`asset-register-table-ui.test.ts:200`)

### 7.9 ปุ่มในแถว (`row-actions.tsx` → ตัวห่อ `RowActions` ช1, I5)

ไฟล์และ export `AssetRegisterRowActions` คงไว้ (`table.tsx:662`, `mobile-list.tsx:73` และ test 4 ไฟล์เรียกตามชื่อ) เป็นตัวห่อ client ที่แปลงข้อมูลของแถวเป็น props ข้อมูลล้วนของ `RowActions` (API ข้อ 3.11 ตัวเดียว · ไม่มี children, `triggerRef`, `contentClassName`) · ตรรกะเดิมคง: `getRowNextAction` และ `ordered` `:78-80` · `reasonOf` `:82-83` · สิทธิ์ `canEdit` / `canCreate` / `canDelete` (`asset-register-table-ui.test.ts:13-14`, `:21-24`) · ลบและคืนโฟกัส (`useDeleteAction(…, { returnFocusRef: triggerRef })` `:76-77`) ย้ายไปอยู่ใน `c/ui/row-actions.tsx`

```tsx
const icon = (action: AssetRegisterTransactionAction, className?: string) => {
  const Icon = transactionIcons[action]
  return <Icon className={className} aria-hidden="true" />
}
const transactionItems: RowActionItem[] = ordered.map((transaction) =>
  transaction.enabled
    ? { kind: "link", key: transaction.action, label: t(transactionLabelKeys[transaction.action]), href: transaction.href, icon: icon(transaction.action, "text-primary"), onNavigate }
    : { kind: "unavailable", key: transaction.action, label: t(transactionLabelKeys[transaction.action]), reason: reasonOf(transaction), icon: icon(transaction.action) },
)
const recordItems: RowActionItem[] = [
  ...(permissions.canEdit ? [{ kind: "link", key: "edit", label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" />, onNavigate }] : []),
  ...(permissions.canCreate ? [{ kind: "link", key: "clone", label: t("cloneAsset"), href: cloneHref, icon: <Copy aria-hidden="true" />, onNavigate }] : []),
]

return (
  <RowActions
    code={assetTag}
    name={assetName}
    menuLabel={t("rowActionsMenu", { assetTag })}
    menu={variant === "desktop" ? "dropdown" : "sheet"}
    next={variant === "desktop"
      ? next ? { label: t(transactionLabelKeys[next.action]), href: next.href, icon: icon(next.action), onNavigate } : null
      : undefined}
    groups={[
      { key: "transactions", label: t("transactionMenu"), items: transactionItems },
      ...(recordItems.length > 0 ? [{ key: "record", items: recordItems }] : []),
    ]}
    deleteAction={permissions.canDelete ? { endpoint: `/api/assets/${assetId}` } : undefined}
    className={className}
  />
)
```

| เดิม | ใหม่ |
|---|---|
| `NextActionLink` `:246-269`: `h-8` กว้างตามข้อความ · `border-primary-border bg-primary-soft text-xs` · `aria-label` "{งาน}: {assetTag}" | ปุ่มถัดไปของ `RowActions`: 120×32 ไม่มีพื้น ตัว 13/500 สี primary · `primary-soft` เมื่อชี้ที่ปุ่ม ชี้ที่แถว หรือโฟกัสอยู่ในแถว (`MK/base.css:326-329`) · ชื่อที่อ่าน = คำที่เห็น + รหัส sr-only (ข้อ 3.11) · ส่งเฉพาะจอใหญ่ (`next` เป็น `undefined` ในรายการมือถือ) · ลบ function |
| ⋯ จอใหญ่ `:93-101` (`size-8`) · ⋯ มือถือ `:163-173` (`size-11`) | ⋯ ของ `RowActions`: `Button variant="ghost" size="icon-sm"` 32 จอใหญ่ 44 ต่ำกว่า `md` (A/04:324) · ชื่อและ `title` = `menuLabel` = `t("rowActionsMenu", { assetTag })` เดิม (I33) |
| ไม่มีงานถัดไป: ⋯ อยู่ชิดขวาแต่ตำแหน่งไม่ตรงกับแถวอื่น | `next={null}` → ช่องว่าง 120 แล้ว ⋯ ในช่องเดิม (`MK/screens/register.html:102`) |
| `<DropdownMenuContent data-no-row-click align="end" className="w-64">` `:103` + เนื้อเมนู `:104-153` | `menu="dropdown"` · กลุ่ม `t("transactionMenu")` (รายการ `link` / `unavailable` + เหตุผล) แล้วกลุ่มแก้ไข · คัดลอก คั่นด้วยเส้น · ลบท้ายสุดหลังเส้นคั่น (`deleteAction`) · แผงกว้างตามค่าตั้งต้น `min-w-60` (240, `dropdown-menu.tsx:10`, DS:413) ไม่มี `contentClassName` (I5) |
| sheet ⋯ ประจำไฟล์ `:160-243` · `sheetItemClasses` `:47-48` | ลบ (I5) · `menu="sheet"` ใช้ sheet ของ `RowActions`: หัว `<span className="tag font-medium">{code}</span>` (R-p) · คำอธิบาย `name` · รายการ 44 ใช้ `menuItemClasses` · ไม่ตั้ง `closeLabel`, `pr-14`, `pb-[env(…)]` (primitive ทำแล้ว) · ลบปิด sheet ก่อนยืนยันตามเดิม |
| `useState` `:75` · `triggerRef` `:76` · `useDeleteAction` `:77` | ย้ายเข้า primitive · ตัวห่อส่ง `deleteAction` เมื่อ `permissions.canDelete` |

- คลิกที่รายการที่กดไม่ได้ไม่ทะลุแถว เพราะ `RowActions` ใส่ `data-no-row-click` ที่ตัวห่อ `DropdownMenuContent` และ `SheetContent` และ `unavailable` กัน `onSelect` (`dropdown-menu.tsx:27-31`, A/04:248)
- ไม่มี dialog ในเมนู · ลบใช้ `useConfirm` ผ่าน `useDeleteAction` ใน primitive ที่คืนโฟกัสให้ ⋯ (DS:412) · ไม่ต้องใช้ handle ของ 2C (R-m เป็นของ disposal และ pending)
- ลบ import ที่ไม่ใช้แล้ว: `useRef`, `useState`, `Link`, `MoreHorizontal`, `Trash2`, ของ dropdown และ sheet ทั้งหมด, `useDeleteAction`, `cn` · เพิ่ม `RowActions` และ type `RowActionItem` · `tCommon` ยังใช้กับ "แก้ไข" (ป้าย "ลบ" มาจากค่าตั้งต้นของ primitive)

### 7.10 รายการมือถือ (`mobile-list.tsx`)

| จุด | เดิม | ใหม่ |
|---|---|---|
| `ul` `:35` | `divide-y divide-border md:hidden` | `divide-y divide-border-soft md:hidden` (เส้นแถวแบบ DataTable) · คง `reserveBulkBarSpace && "pb-44"` |
| รหัสในแถว `:52-58` | `<Link className="block truncate text-sm font-semibold text-foreground before:absolute …">{asset.assetTag}</Link>` | ลิงก์เดิม + `<span className="tag font-medium">{asset.assetTag}</span>` |
| checkbox โหมดเลือก `:93-99` | `className="size-5 shrink-0 rounded border-border text-primary"` | `className={checkboxVariants({ size: "lg" })}` (20px · `shrink-0` อยู่ใน variant แล้ว) · แถวทั้งแถวเป็น `<label>` สูง 80 อยู่แล้ว (`:92`) |
| รหัสในโหมดเลือก `:102` | `<span className="block truncate text-sm font-semibold text-foreground">{asset.assetTag}</span>` | `<span className="block truncate text-sm text-foreground"><span className="tag font-medium">{asset.assetTag}</span></span>` |

คงทุกอย่างที่เหลือ: ลำดับ รหัส → ชื่อ → ที่ตั้ง → สถานะ · `min-h-20` · ป้าย 3 ตัว `shrink-0` · บรรทัด 3 ไม่ตัดบรรทัด (`asset-register-table-ui.test.ts:138-153`, `:186-195`) · `tag` อยู่ใน `<a>` และ `<label>` จึงเลือกข้อความแบบปกติ (`globals.css:240-243`)

### 7.11 หน้า import-export (`D/asset-management/import-export/page.tsx`)

หน้ากลุ่ม C: เนื้อหาเป็นของ 2C ชุด 4 · 2B ดูแลแค่หัวหน้าและโครงหน้า (M02 §5)

| จุด | เดิม | ใหม่ |
|---|---|---|
| หัว `:32-35` | `<div><h1 className="text-2xl font-bold text-foreground">…</h1><p className="mt-1 text-sm text-muted-foreground">…</p></div>` | `<PageHeader title={tTools("importExportTitle")} meta={tTools("importExportSubtitle")} />` |
| ตัวห่อ `:31` | `mx-auto max-w-6xl space-y-5` | `mx-auto max-w-6xl space-y-6` (คงความกว้างสูงสุดของหน้าเครื่องมือ M03 §E2 · ราก `space-y-6` I32 · ข้อ 4.4.4) |

ไม่แตะใน 2B-3 (เจ้าของ): แผงนำเข้า `:58-102` (2C ชุด 4 · `:82`) · การ์ด `ActionLink` `:235-255` · สีดิบ `border-amber-200 bg-amber-50 text-amber-900` `:185` และ pill `:173` และกล่องเส้นประ `:164` (2D) · `Info` `:219` (รายการ KeyValueList ของ M03 §F) · `toLocaleString("th-TH")` `:191`, `:207` (ระบุ locale และ `asset-register-ux.test.ts:147` ยึดไว้) · ลิงก์ "กลับ" ท้ายหน้า `:122-126` (ไม่ใช่ปุ่มกลับที่หัว จึงไม่อยู่ใน B2)

### 7.12 รั้วและ budget

| รั้ว | 2B-3 ทำ |
|---|---|
| dialog แก้ไขหลายรายการ `table.tsx:697-774` (2C ชุด 4) | ไม่แตะบรรทัดใด · state ที่ dialog ใช้ (`bulkUpdateOpen`, `bulkSaving`, `bulkForm`, `submitBulkUpdate` `:183-190`, `:356-383`) คงเดิม · import `Loader2` และ `AccessibleDialog` คงไว้ |
| ป้ายแผงนำเข้า `D/assets/page.tsx:427-471` (`:451`) · `import-export/page.tsx:58-102` (`:82`) | ไม่แตะ · บรรทัดเลื่อนเพราะส่วนบนเปลี่ยน 2B-3 จดเลขบรรทัดใหม่ลง DH ให้ 2C plan 4 (C/07:588 "rebase ตามบรรทัดใหม่") |
| chrome `c/ui/sheet.tsx`, `dialog.tsx`, `field.tsx` (O10) | ใช้ตามที่มี · แก้เฉพาะเนื้อใน `filter-sheet.tsx:90-180` · `row-actions.tsx` ไม่มี sheet ของตัวเองแล้ว (sheet ⋯ อยู่ใน `RowActions`, I5) |
| FMG | ไม่แก้ไฟล์ · ไม่เปลี่ยนชื่อหรือย้าย `table.tsx` (`BATCH_FILES` ชุด 4 FMG:36) · ค่าหลัง 2B-3 ของ `table.tsx`: GF7 6 → 4 · GB1 1 (dialog `:769`) · GL1 1 (แถบ `:455`) · GF2 / GF3 4 · GF5 `[1,1,0]` · GD2 อยู่ในรายการเดิม · GB4 ผ่าน (`busy` ใน `filter-sheet.tsx` ไม่มี `disabled`) |
| VFG | R2 `table.tsx: 1` คงค่า · แก้แค่ comment ท้าย VFG:270 เป็น "mobile bulk-action bar shadow-lg (phase 3, R-q)" · ทะเบียนไม่มีพื้นหัวตาราง `/NN` จึงไม่เปลี่ยน R7 |
| LFG `tests/list-frame-guards.test.ts` (I15) | ทุก commit ลดแถว `BUDGETS` ของไฟล์ที่ตัวเองแก้ (เช่น LF1 เมื่อลบ `LabeledSelect`) · ค่าหลัง 2B-3 ตามตาราง C ข้อ 10.4 · ไม่เพิ่มแถว |
| token · `tests/design-tokens-contrast.test.ts` | ไม่แตะ (2A I21) · class ใหม่ทุกตัวเป็น token เดิม (`border-border-soft`, `text-faint-foreground`, `bg-row-hover`, `bg-primary-soft`, `border-control-border`) |
| formatter | ไม่รันบน `table.tsx` (ไฟล์ร่วมกับ 2C ชุด 4) · แก้ด้วยมือ |

### 7.13 สิ่งที่พนักงานจะเห็น

- (เห็นตั้งแต่ 2B-1 ผ่านตัวห่อ `MasterDataHeader`, I2 · 2B-3 ไม่เปลี่ยนหน้าตาหัวอีก) หัวเรื่อง "ทะเบียนทรัพย์สิน" บางลง (600) · ปุ่ม "เพิ่มใหม่" บนคอมเตี้ยลงจาก 44 เป็น 36
- แถบค้นหาบนคอมไม่มีกรอบการ์ด · ช่องค้นหาและ select เตี้ยลงจาก 40 เป็น 36 และ select มีลูกศร
- แท็บสถานะเป็นเส้นใต้ทุกขนาดจอ (มือถือเคยเป็นปุ่มมน) · ตัวเลขไม่มีพื้นสี
- หัวตารางพื้นขาว ตัวเล็กลง ไม่เป็นตัวพิมพ์ใหญ่ · หัวคอลัมน์ที่เรียงอยู่มีลูกศรเป็นไอคอน
- ปุ่มงานถัดไปในแถวกว้างเท่ากันทุกแถว ไม่มีพื้น · มีพื้นฟ้าอ่อนเมื่อชี้หรือกด Tab เข้าแถว · ⋯ ตรงแนวกันทุกแถว · คอลัมน์คำสั่งไม่มีเงา
- ราคาซื้อ "1,234.00" ชิดขวา หัวคอลัมน์ "ราคาซื้อ (บาท)" · ค่าว่างเป็น "—"
- รหัสและ Serial เป็นตัว monospace
- checkbox ในตารางกดง่ายขึ้น (44×44) · คลิกรอบ checkbox ไม่เปิดหน้ารายละเอียด
- sheet ตัวกรอง: ป้ายเข้มขึ้น 13px · ปุ่ม ? ใหญ่ขึ้นเป็น 24 · ปุ่ม "แสดง N รายการ" กดปิดไม่ได้ระหว่างโหลด (ปิดด้วย × Esc หรือแตะนอก sheet ได้)
- มือถือ: ปุ่ม "เลือก" และ "เรียง" เป็นปุ่มสีจาง · checkbox โหมดเลือกหน้าตาตามเบราว์เซอร์ (`accent-color`)

### 7.14 ความเสี่ยง

1. **ความกว้างเหลือ 1px** (1,116 / 1,117) · ถ้าเครื่องในบริษัทมีแถบเลื่อนกว้างกว่า 17 หรือ zoom ไม่ใช่ 100% ชุดค่าตั้งต้นจะเลื่อนแนวนอนที่ 1440 · ทางถอย: `custodian` 160 → 156 (เหลือ 5)
2. **ลืม `data-no-row-click` ที่ label ของ checkbox** แล้วคลิกขอบ checkbox เปิดหน้ารายละเอียด · มี test (ข้อ 7.17 ข้อ N3)
3. **`busy` กันการปิด sheet** ระหว่าง `isPending` · ถ้าเครือข่ายช้า ผู้ใช้ต้องรอหรือใช้ × · ถ้าผู้ใช้ไม่ชอบ ทางถอยคือคง `Loader2` เดิมแล้วไม่ใช้ `busy`
4. **`tag` ในแถวที่คลิกได้:** คลิกที่รหัสยังเปิดหน้ารายละเอียด (การเลือกทั้งรหัสด้วยคลิกเดียวใช้ไม่ได้ในแถวนี้) · ลากเลือกได้ทั้งรหัส · ไม่ใส่ `data-no-row-click` ที่รหัส เพราะจะทำให้คลิกรหัสไม่เปิดหน้า
5. **คัดลอกตารางที่มี `Nil`** ข้อความ sr-only "ไม่มีผู้ถือครอง" ติดไปใน Excel (A/08:324) · ตรวจตอนคัดลอกจากตาราง
6. **class ทับของปุ่มเรียง** (`ghost` + `md:border-control-border …`) พึ่งลำดับ CSS ที่ Tailwind ปล่อย `md:` หลัง base · twMerge เก็บทั้งสองเพราะ modifier ต่างกัน · ตรวจด้วยตาที่ 768 และ 1440
7. **พึ่ง API ของ 2B-1** (ข้อ 7.2 ตาม I1, I5, I6, I7, I9) · ทะเบียนไม่ขอ prop เพิ่ม (ไม่มี `density`, `triggerRef`, children, `contentClassName`, `fullBleed`) · แถวแน่นอยู่ใน `table.tsx` เอง (I3) · ถ้า primitive ที่ merge แล้วต่างจากข้อ 10.2 ให้แก้ที่ primitive ก่อนเริ่มงาน 3.2–3.6 ไม่ fork ในไฟล์ของทะเบียน
8. **2C plan 4 ต้อง rebase บนไฟล์ที่ 2B-3 แก้มาก** (`table.tsx` เปลี่ยนเกือบทั้งไฟล์นอก dialog) · 2B-3 ไม่แตะ `:697-774` จึงชนแค่ import และบรรทัดที่เลื่อน
9. **หน้าตาแท็บบนมือถือเปลี่ยน** สำหรับคนที่ใช้ทะเบียนตอนตรวจนับในพื้นที่ (B3(5) เลือกแล้ว) · แจ้งใน changelog

### 7.15 ตรวจบนแอป dev

DB `asset_management_dev` เท่านั้น · ภาพก่อนและหลังเก็บที่ `.superpowers/sdd/screenshots/ui-phase2b-plan3/` (git ignore)

| ความกว้าง | ตรวจ |
|---|---|
| 1440 (Windows · แถบเลื่อนจริง) | ชุด operations และ accounting: `[data-asset-desktop-table]` มี `scrollWidth <= clientWidth` และไม่มีตัวบอกเลื่อน · ชุด audit และ all: เลื่อนได้ ตัวบอกเลื่อนขึ้น คอลัมน์รหัสและคำสั่งติดขอบ ไม่มีเงา · ⋯ ตรงแนวกันทุกแถว รวมแถวที่ไม่มีงานถัดไป · หัวตาราง 13px พื้นขาว |
| 1366 · 1280 | ชุดค่าตั้งต้นเลื่อนได้ และตัวบอกเลื่อนขึ้น · คอลัมน์สถานะ 132 / สภาพ 96 ไม่ตัดคำผิด (A:239) |
| 768–1023 | ตารางแสดง (ตั้งแต่ `md`) เมนูข้างซ่อน · แถบเครื่องมือ 36 ไม่มีกรอบ · ปุ่มเรียงมีกรอบ |
| 700 | ช่วง 640–767: แถบคำสั่งกลุ่มลอย ปุ่มสูง 44 สองคอลัมน์ |
| 375 / 390 | แถบเครื่องมือติดบน 44 · แท็บเส้นใต้เลื่อนถึงขอบจอ เป้า 44 · แถวมือถือ ~80 · โหมดเลือก: checkbox 20 แถบคำสั่งกลุ่มลอยเหนือแถบล่าง · sheet ⋯: หัวเป็นรหัส mono · sheet ตัวกรอง: ป้าย 13 ปุ่ม ? 24 ไม่ทำให้ป้ายสูงเกิน 20 |

คีย์บอร์ดและโปรแกรมอ่านหน้าจอ:
- Tab เข้าแถว: พื้นแถวรวมเซลล์ติดขอบเป็น `row-hover` · Tab ต่อไปที่ปุ่มถัดไปและ ⋯: พื้นแถวยังอยู่ (`focus-within`) และปุ่มถัดไปเป็น `primary-soft`
- ⋯ → ลูกศรไปที่รายการที่กดไม่ได้ → ได้ยินเหตุผล · Enter แล้วเมนูไม่ปิดและไม่เปิดหน้ารายละเอียด
- ลบจากเมนู → ยืนยัน → โฟกัสกลับมาที่ ⋯ ของแถวถัดไปหรือที่ที่ `useDeleteAction` กำหนด (เหมือนเดิม)
- หัวคอลัมน์ที่เรียงอยู่อ่าน `aria-sort` · หัวคอลัมน์คำสั่งอ่าน "การดำเนินการ"
- คลิกขอบ checkbox ในแถว: ติ๊กอย่างเดียว ไม่เปลี่ยนหน้า
- ภาษาไทยเป็นหลัก ภาษาอังกฤษ 1 รอบ · zoom 200% ที่ 1440

### 7.16 เอกสาร

| ที่ | แก้ |
|---|---|
| `DESIGN.md:500-510` | ตามตารางข้อ 7.3 (Search bar · Status tabs · ⚙ sheet · Rows · Desktop table · ประโยคข้อยกเว้นความแน่นของแถว) |
| `DESIGN.md:335` | "the mobile bulk-action bar of the register (2B)" → "(phase 3, with QR label printing)" |
| `DESIGN.md:503` | ชี้ไปที่ `TabNav` และกติกาเส้นฐานใช้ทุกขนาดจอ (ข้อ 7.3) |
| `DEVELOPER_HANDOFF.md:252` | `status-tabs` เป็นตัวห่อของ `TabNav` · `row-actions` เป็นตัวห่อของ `RowActions` ช1 (I5) · `filter-chips` เป็นตัวห่อของ `FilterChipList` (I7) · select ใช้ `FilterSelect` (I6) · ตารางใช้ `DataTableBody`, `ClickableTableRow`, `TableEmptyRow`, `DataTableFoot`, `DataTableHead sort` + class แถวแน่นประจำไฟล์ `headerClasses` / `cellClasses` (I3) |
| `DEVELOPER_HANDOFF.md:256` | ทะเบียนเรียก `PageHeader compactOnMobile` ตรง (2B-1 ย้าย `compactOnMobile` เข้า `PageHeader` แล้ว I2) · ผู้ใช้คนเดียวยังเป็นทะเบียน |
| `DEVELOPER_HANDOFF.md:301` | เส้นฐานของแท็บเป็น inset shadow ทุกขนาดจอ (ไม่มี `md:`) |
| `DEVELOPER_HANDOFF.md` (ส่วน 2B) | 2B-3 เสร็จ · 2C plan 4 เริ่มได้เมื่อ 2C plan 3 merge · เลขบรรทัดใหม่ของ dialog ใน `table.tsx` และป้ายแผงนำเข้าใน 2 หน้า · FMG GF7 ของ `table.tsx` ตอนนี้นับได้ 4 (budget ยัง 6 ให้ 2C plan 4 ลด) |
| `docs/99_CHANGELOG.md` | หัวข้อ 2B-3 รูปแบบเดียวกับ 2C plan 2 · ข้อ 7.13 ทั้งหมด · `npm run verify` และผลตรวจบนแอป |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:93` | แถว "Asset Register" ยังชี้สเปก `2026-07-10-desktop-asset-register-workspace-design.md` ทั้งที่ทะเบียนทำตาม `2026-10-07-asset-register-redesign-design.md` แล้ว (DH:257) · เปลี่ยนเป็นสเปก 2026-10-07 + สเปก 2B (หน้าตา) และทำเครื่องหมาย `Superseded by …` ที่ของเดิมตามกติกา `:88` |
| `.impeccable/design.json` | ไม่มี (pattern ใหม่ลงใน 2B-1 ตาม R-s) |
| wiki `D:/Obsidian/Eltross/AssetSystem/` | `ams-status.md` (2B-3 merge · 2C plan 4 ปลดแล้ว) · บรรทัดใหม่ใน `ams-log.md` · รัน `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` ที่ `D:\Obsidian\Eltross` |
| ข้อความ | `asset.noCustodian` ผ่าน `node scripts/messages-edit.mjs` ไฟล์ change `{ "set": { "th": { "asset.noCustodian": "ไม่มีผู้ถือครอง" }, "en": { "asset.noCustodian": "No custodian" } } }` · ผ่าน `tests/thai-glossary.test.ts` และ messages parity |

### 7.17 test

**แก้ (พังโดยตั้งใจ · แก้ใน commit ที่ทำให้พัง)** · 40 บรรทัด (นับ VFG:143-148 เป็น 6 · `asset-register-filter-ui.test.ts:112-119` แก้แล้วใน 2B-1 งาน 3, I2)

| test:บรรทัด | เดิม | ใหม่ | งาน |
|---|---|---|---|
| `asset-register-table-ui.test.ts:15-18`, `:20` | `/<DropdownMenuTrigger asChild>/` · `/<DropdownMenuContent data-no-row-click/` · `/<SheetTrigger asChild>/` · `/<SheetContent\s+side="bottom"/` · `/variant="destructive"/` ใน `row-actions.tsx` | regex เดิม 5 ตัวอ่าน `src/components/ui/row-actions.tsx` (I5: พฤติกรรมเดิมย้ายเข้า primitive) · `row-actions.tsx` ต้อง `match(/<RowActions\b/)` | 3.5 |
| `asset-register-table-ui.test.ts:19` | `` /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, \{ returnFocusRef: triggerRef \}\)/ `` | `row-actions.tsx`: `` /deleteAction=\{permissions\.canDelete \? \{ endpoint: `\/api\/assets\/\$\{assetId\}` \} : undefined\}/ `` · `ui/row-actions.tsx`: `/useDeleteAction\([\s\S]*?\{ returnFocusRef: triggerRef \}\)/` | 3.5 |
| `asset-register-table-ui.test.ts:25` | `/size-11/` | อ่าน `src/components/ui/row-actions.tsx`: `/size="icon-sm"/` (⋯ 44 ต่ำกว่า `md`) | 3.5 |
| `asset-register-table-ui.test.ts:56` | `/min-h-11/` (sort-menu) | `/<Button\b[\s\S]*?variant="ghost"[\s\S]*?size="md"[\s\S]*?md:border-control-border/` | 3.6 |
| `asset-register-table-ui.test.ts:125-126` | `/hasRemainingHorizontalContent\(/` · `/hasMoreRight && /` | `assert.doesNotMatch(source, /hasMoreRight\|hasRemainingHorizontalContent\|shadow-\[\|rgb\(/)` · ชื่อ test เป็น "the scroll hint follows real overflow and the pinned actions column has no edge shadow" | 3.6 |
| `asset-register-table-ui.test.ts:161` | `/className="size-5 /` | `/className=\{checkboxVariants\(\{ size: "lg" \}\)\}/` | 3.7 |
| `asset-register-ux.test.ts:99` | `/group-hover:bg-row-hover group-focus:bg-row-hover/` | `/group-hover\/row:bg-row-hover group-focus-within\/row:bg-row-hover/` (ไม่มี `\n`) | 3.6 |
| `asset-register-filter-ui.test.ts:58-59` | `/help=\{statusHelp\}/` · `/help=\{conditionHelp\}/` | `/labelAction=\{<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>\}/` · `/labelAction=\{<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>\}/` (I6) | 3.3 |
| `asset-register-filter-ui.test.ts:69` | `/<nav aria-label=\{label\}/` | `/<TabNav\b[\s\S]*?aria-label=\{label\}[\s\S]*?data-asset-status-tabs/` | 3.4 |
| `asset-register-filter-ui.test.ts:70-72` | `aria-current` · `overflow-x-auto` · `min-h-11` ใน `status-tabs.tsx` | regex เดิม 3 ตัว (`:70` เป็น `/aria-current=/`) อ่าน `src/components/ui/tab-nav.tsx` · `:68` ไม่มี `"use client"` ยังอ่านไฟล์ของทะเบียน | 3.4 |
| `asset-register-filter-ui.test.ts:79-82` | `chips()` ของทะเบียน: `/min-h-11[^"]*md:min-h-8/` · `/chip\.mobileOnly && "md:hidden"/` · `/href=\{clearAllHref\}/` · `` /aria-label=\{`\$\{labels\.remove\}: \$\{chip\.label\}`\}/ `` | อ่าน `src/components/ui/filter-chips.tsx` (I7): `/min-h-11[^"]*md:h-9 md:min-h-0/` (ชิปสูง 36) · `/chip\.mobileOnly && "md:hidden"/` · `/href=\{clearAll\.href\}/` · `` /aria-label=\{`\$\{removeLabel\}: \$\{chip\.label\}`\}/ `` · ตัวห่อ: `/clearAll=\{\{ href: clearAllHref, label: labels\.clearAll \}\}/` · `/removeLabel=\{labels\.remove\}/` · `:78` (ไม่มี `"use client"`) ยังอ่านตัวห่อ | 3.2 |
| `asset-register-filter-ui.test.ts:108` | `/<MasterDataHeader\s+compactOnMobile/` | `/<PageHeader\s+compactOnMobile/` (`:112-119` แก้แล้วใน 2B-1 งาน 3, I2) | 3.1 |
| `asset-register-search-ui.test.ts:26` | `/aria-label=\{t\("searchClear"\)\}/` | `/clearLabel=\{t\("searchClear"\)\}/` | 3.2 |
| `asset-register-search-ui.test.ts:28` | `/isPending \? <Loader2/` | `/<SearchField\b[\s\S]*?loading=\{isPending\}/` | 3.2 |
| `dropdown-menus-ui.test.ts:28` | `source` = `asset-register-row-actions.tsx` | `source` = `src/components/ui/row-actions.tsx` (I5) · `:29-30`, `:33-34`, `:38` regex เดิมผ่านที่ primitive · เพิ่ม `assert.doesNotMatch(read("src/components/assets/asset-register-row-actions.tsx"), /<DropdownMenu\|<Sheet\|triggerRef\|AssetDeleteButton/)` | 3.5 |
| `dropdown-menus-ui.test.ts:31` | `` /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, …\)/ `` | `/useDeleteAction\([\s\S]*?\{ returnFocusRef: triggerRef \}\)/` | 3.5 |
| `dropdown-menus-ui.test.ts:32` | `ref={triggerRef}` 2 ครั้ง | `assert.match(source, /ref=\{triggerRef\}/)` (ปุ่ม ⋯ ของ primitive · ตัวห่อไม่มี `triggerRef`) | 3.5 |
| `dropdown-menus-ui.test.ts:36-37` | `/<DropdownMenuItem key=\{transaction\.action\} unavailable>/` · `/<DropdownMenuItemDescription>\{reasonOf\(transaction\)\}<\/DropdownMenuItemDescription>/` | `/<DropdownMenuItem\b[^>]*\bunavailable>/` · `/<DropdownMenuItemDescription>\{[\w.]*reason\}<\/DropdownMenuItemDescription>/` · ตัวห่อ: `/kind: "unavailable"[\s\S]*?reason: reasonOf\(transaction\)/` | 3.5 |
| `asset-status-help-ui.test.ts:49-51` | `/help=\{statusHelp\}/` · `/help=\{conditionHelp\}/` · `/<AssetStateHelpPopover \{\.\.\.help\} size="compact" \/>/` | `/labelAction=\{<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>\}/` · `/labelAction=\{<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>\}/` · `assert.doesNotMatch(source, /size="compact"\|function LabeledSelect/)` (I6 · ไม่มี `\n`) | 3.3 |
| `asset-register-view-model.test.ts:164` | `1094` | `1116` | 3.5 |
| VFG:143-148 | อ่าน `status-tabs.tsx`: ไม่มี `md:overflow-visible\|md:-mb-px` · `data-asset-status-tabs className="…overflow-x-auto…"` · `md:shadow-[inset_0_-1px_0_var(--border)]` | อ่าน `src/components/ui/tab-nav.tsx`: `doesNotMatch(/overflow-visible\|-mb-px/)` · `match(/overflow-x-auto/)` · `match(/shadow-\[inset_0_-1px_0_var\(--border\)\]/)` · `doesNotMatch(/md:shadow-\[inset/)` (เส้นฐานทุกขนาดจอ) · และ `status-tabs.tsx` มี `data-asset-status-tabs` · ชื่อ test เป็น "the register status tabs keep their underline at every width and the row still scrolls" | 3.4 |

**เพิ่ม** (เขียน regex ตรงตัวด้านล่าง · ทุกไฟล์แปลง CRLF แล้ว ยกเว้น N7)

- **N1** `asset-register-table-ui.test.ts` (งาน 3.5) · `row-actions.tsx` (ตัวห่อตาม I5):
  - `assert.match(source, /<RowActions\b[\s\S]*?menuLabel=\{t\("rowActionsMenu", \{ assetTag \}\)\}[\s\S]*?menu=\{variant === "desktop" \? "dropdown" : "sheet"\}/)` · `/groups=\{\[/` · `/label: t\("transactionMenu"\)/`
  - `assert.doesNotMatch(source, /function NextActionLink|sheetItemClasses|<DropdownMenu|<Sheet|triggerRef|contentClassName|size-8|closeLabel=|pr-14|pb-\[env/)`
  - หัว sheet `<span className="tag font-medium">{code}</span>` ตรวจใน `tests/row-actions-ui.test.ts` ของ 2B-1 (I5) ไม่ตรวจซ้ำที่นี่
- **N2** `asset-register-table-ui.test.ts` (งาน 3.6) · `table.tsx`:
  - `/orNil\(asset\.custodian, t\("noCustodian"\)\)/` · `/formatMoney\(asset\.purchasePrice\) \?\? <Nil \/>/` · `/labels\.purchasePriceBaht/`
  - `/<span className="tag font-medium">\{asset\.assetTag\}<\/span>/` · `/<span className="tag">\{asset\.serialNumber\}<\/span>/`
  - `assert.doesNotMatch(source, /formatCurrency|\|\| "-"|toLocaleString\(|useLocale/)`
- **N3** `asset-register-table-ui.test.ts` (งาน 3.6) · `table.tsx`:
  - `assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2)`
  - `/<label data-no-row-click className="flex min-h-11 w-11 /`
  - `assert.doesNotMatch(source, /h-4 w-4 rounded border-border/)`
- **N4** `asset-register-table-ui.test.ts` (งาน 3.6) · `table.tsx`:
  - `/const assetRegisterStickyHeaderColumnClasses = "z-30 bg-surface"/` · `/actionVariant: "secondary"/` · `/<TableEmptyRow\b/` · `/<span className="sr-only">\{labels\.actions\}<\/span>/`
  - `assert.doesNotMatch(source, /<thead className="bg-muted"|uppercase|function SortableHeader|className="group"|density=|data-density/)`
  - class ประจำไฟล์ (I3): `/const headerClasses = "border-b border-border bg-surface px-3 py-2\.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"/` · `/const cellClasses = "border-b border-border-soft px-3 py-2 align-top"/` · `/cn\(cellClasses, "pl-1\.5 pr-2"\)/` · `/<DataTableHead\b[^>]*\bsort=\{/` · `/<DataTableBody\b/` · `/<DataTableFoot\b/`
- **N5** `asset-register-table-ui.test.ts` (งาน 3.6) · แถบคำสั่งกลุ่มอยู่ที่เดิม:
  - `const bar = source.slice(source.indexOf("data-asset-bulk-bar"), source.indexOf("{assets.length === 0 ? ("))` · `assert.match(bar, /"fixed inset-x-3 [^"]*shadow-lg[^"]*"/)` · `assert.equal(bar.match(/<Button\b/g)?.length, 4)`
  - `sort-menu.tsx`, `column-picker.tsx`, `export-menu.tsx`: `/<Button\b/` และ `assert.doesNotMatch(menu, /<button\b/)`
- **N6** `asset-register-filter-ui.test.ts`:
  - toolbar (งาน 3.2 · I6): `assert.equal(source.match(/<FilterSelect\s+label=\{t\("(?:company|branch|category)"\)\}\s+hideLabel\s+fieldSize="md"/g)?.length, 3)` · `/<Button variant="outline" size="md">/` · `assert.doesNotMatch(source, /md:rounded-lg md:border|getFieldControlClasses|<select\b|<NativeSelect\b/)`
  - chips (งาน 3.2 · I7): `/<FilterChipList\b/` · `assert.doesNotMatch(source, /<Link\b|rounded-full/)`
  - sheet (งาน 3.3 · I6): `assert.equal(source.match(/<FilterSelect\b/g)?.length, 7)` · `/key=\{filters\.statusId\}/` · `/busy=\{isPending\}/` · `assert.doesNotMatch(source, /function LabeledSelect|<select\b|Loader2|closeLabel=|pr-14|getFieldControlClasses|toLocaleString\(/)`
  - page (งาน 3.1): `/count: formatCount\(tab\.count\)/` · `assert.doesNotMatch(source, /toLocaleString\(|MasterDataHeader/)`
  - messages (งาน 3.6): `assert.equal(messages("th").noCustodian, "ไม่มีผู้ถือครอง")` · `assert.equal(typeof messages("en").noCustodian, "string")`
- **N7** `asset-register-ux.test.ts` (งาน 3.1 · ไฟล์นี้ไม่แปลง CRLF แต่ regex ไม่มี `\n`): `assert.match(importExportPageSource(), /<PageHeader\b/)` · `assert.doesNotMatch(importExportPageSource(), /<h1\b/)`
- **N8** `asset-register-view-model.test.ts` (งาน 3.5): `assert.equal(assetRegisterColumnWidths.actions, 172)` · `assert.equal(assetRegisterColumnWidths.companyBranch, 116)` · `assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.accounting) <= 1117)`

**ต้องผ่านต่อโดยไม่แก้** (อ่านโค้ดใหม่ตามข้อ 7.4–7.11 แล้วยังตรง)

- `asset-register-table-ui.test.ts:13-14`, `:21-24` (ตรรกะที่ยังอยู่ในตัวห่อ, I5), `:26`, `:32-35`, `:54-55`, `:62-68`, `:74-75`, `:81-86`, `:90-94`, `:100-105`, `:111-117`, `:123-124`, `:139-152`, `:158-160`, `:162-163`, `:169-176`, `:180-183`, `:190-194`, `:200-201`
- `asset-register-ux.test.ts:44-47`, `:56-61`, `:79`, `:88-89`, `:95-98`, `:106-110`, `:116-119`, `:123`, `:138-139`, `:145-147`, `:153-155`, `:161-164`, `:171-174`
- `asset-register-filter-ui.test.ts:16-23`, `:29-33`, `:39-45` (ไม่ยึด `aria-label`, I6), `:51-57`, `:60-62`, `:68`, `:78`, `:103-104`, `:109`
- `asset-register-search-ui.test.ts:14-18`, `:24-25`, `:27`, `:34-36`, `:40`, `:44-50`
- `asset-status-help-ui.test.ts:37-39`, `:44-48` · `modern-enterprise-theme.test.ts:67` · `asset-register-view-model.test.ts:163`, `:165-166` · `sheet-drawers-ui.test.ts:28-29` · VFG:111-112, :270 (ค่า 1)
- `asset-return-navigation.test.ts:32-38` · `asset-clone-ui.test.ts:10-13` · `attachment-preview-dialog-ui.test.ts:29-33` · `asset-import-field-labels.test.ts:30-31` · `open-repair-filter.test.ts:8-16` · `performance-route-instrumentation.test.ts:19` · `asset-transaction-cancellation-routes.test.ts:25` · `asset-register-building-blocks-ui.test.ts:8-17`, `:42-47` · `asset-register-filters.test.ts` · `asset-register-view-memory.test.ts`
- FMG ทั้งไฟล์ (ไม่แก้) · `tests/design-tokens-contrast.test.ts` (ไม่แก้) · `tests/dialog-trigger-handles.test.ts` · `tests/thai-glossary.test.ts` · `tests/class-merge.test.ts` · VFG ทั้งไฟล์ (นอก :143-148 และ comment :270)
