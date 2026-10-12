> ร่างส่วนนี้ของสเปก 2B · ข้อตัดสินของผู้ใช้ B1–B10 (`2026-10-12-ui-phase2b/00-decisions.md`) และ R-a…R-s (`2026-10-12-ui-phase2b/00-synthesis.md` ข้อ 1.1) ใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน · ข้อตัดสิน I1–I33 (ข้อ 10.2) ใช้แทนข้อความในส่วนนี้เช่นกัน และแก้ลงในไฟล์นี้แล้วตามข้อ 10.9 · ตัวเลขและบรรทัดอ้างที่ `master` `d38a0ee`

## 9. guard และ test

ส่วนนี้ถือ 5 เรื่อง:
- guard เดิมใน `tests/visual-foundation-guards.test.ts` (VFG) ที่มี budget ของ 2B: R1 · R7 (รวมตัวกรองบรรทัด `<th`) · R2 และ pin อื่นของ VFG ที่ 2B แตะ
- ไฟล์ guard ใหม่ของ 2B ไฟล์เดียว `tests/list-frame-guards.test.ts` (guard ชื่อ L…) ที่รวม guard ซึ่งข้อ 4, 5, 6 เสนอไว้
- ค่าตั้งต้นรายไฟล์ของทุก budget ที่ HEAD และค่าที่เหลือหลัง 2B-5
- ตาราง A: test เดิมที่พังโดยตั้งใจ ตาม plan · ตาราง D: test ที่ต้องผ่านต่อโดยไม่แก้ (รวม test ที่อ่านไฟล์ CRLF ดิบ)
- test ใหม่ต่อ primitive: อยู่ไฟล์ไหน ใครถือเนื้อ assert

ส่วนนี้ไม่ได้ถือ (ชี้ไปเจ้าของ แล้วหยุด):
- string ของ class และ API ของ primitive → ข้อ 3 (ตาราง C ข้อ 3.21) ที่ปรับด้วย I1–I9 · ส่วนนี้กำหนดแค่ไฟล์ (ข้อ 9.7)
- assert รายหน้าแบบ "มี" (`<DataTable`, `parseListPage`, `RowActions`, `<TabNav`) → ข้อ 5 (`list-pages-ui`) · ข้อ 6 (`list-filters-ui`) · ข้อ 7 (ทะเบียน)
- โครงเมนูข้าง (รายการแรก ลึก ≤2 ไอคอนไม่ซ้ำ) → ข้อ 4.11 `tests/sidebar-menu-structure.test.ts`
- ข้อความใหม่ และ `thai-glossary` / `messages-parity` → ส่วนที่เพิ่ม key
- ตรวจบนแอป dev → ข้อ 8 และส่วนของหน้า

path ย่อ: `D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/` · VFG = `tests/visual-foundation-guards.test.ts` · FMG = `tests/form-migration-guards.test.ts` · LFG = `tests/list-frame-guards.test.ts` (ใหม่)

สคริปต์นับ (อ่านอย่างเดียว ไม่เขียนลง repo) อยู่ที่ `scratchpad/p2b-spec/work/09/`:
- `count09.mjs` · ใช้ตัวอ่าน JSX ของ repo (`tests/helpers/source-files.ts`) ผ่าน type stripping ของ Node 24 · regex เดียวกับที่เสนอในข้อ 9.3 · ผล `out09.txt` (รายไฟล์พร้อมบรรทัด) และ `counts09.json`
- `tables09.mjs` · สร้างตารางข้อ 9.4 จาก `counts09.json` · ผล `tables09.txt`
- `crlf09.mjs` · หา test ที่อ่านไฟล์โดยไม่แปลง CRLF · ผล `crlf09.txt`
- รายชื่อไฟล์ต่อ plan ใช้ชุดเดียวกับข้อ 8 (`work/s8-plans.mjs`) · ถ้าข้อ 8 ย้ายไฟล์ ตัวเลขต่อ plan เลื่อน แต่ค่าท้าย 2B เท่าเดิม

### 9.1 ตัวเลขฐานที่ `d38a0ee` (นับซ้ำ)

ขอบเขตนับของ L… = `src/app` (ไม่รวม `src/app/api`) + `src/components` · ไฟล์อ่านแบบ LF (`readSourceFiles`)

| เรื่อง | ที่ HEAD | วิธีนับ | เทียบ |
|---|---|---|---|
| R1 สี tone มี `/NN` | 1 ใน 1 ไฟล์ (`D/audit/rounds/page.tsx:597`) | `TONE_OPACITY` VFG:223-224 | = budget VFG:229 |
| R7 พื้นกลาง `/NN` | **44 ใน 31 ไฟล์** · นอกบรรทัด `<th`/`<thead` **0** · ทั้ง 44 จุดอยู่บน 41 บรรทัดที่มี `<thead` (3 บรรทัดมี 2 จุด · ข้อ 10.8) | `NEUTRAL_FILL_OPACITY` VFG:233 | = M04 ข้อ 5.2 · = ข้อ 8.4 |
| R2 เงาพื้นผิว | 10 ใน 9 ไฟล์ | `SURFACE_SHADOW` VFG:258 | = budget VFG:261-271 |
| LH1 `<h1>` | 60 ใน 60 ไฟล์ | `findJsxTags(…, ["h1"])` | = ข้อ 4.4.1 |
| LH2 คำ `MasterDataHeader` / `ReportHeader` / `function PageHeader` | 27 ใน 15 ไฟล์ (ผู้เรียก MDH 11 × import + tag · ตัวประกาศ 2 · `PageHeader` ประจำไฟล์ 1 · หน้ารายงาน 2) | regex คำ | ข้อ 4.11 G4 |
| LB1 `<ArrowLeft` | 27 ใน 27 ไฟล์ (หัวฟอร์ม O16 15 · หน้า 7 · อื่น 5) | regex | ข้อ 4.11 G3 |
| LP1 `pb-24` / `pb-36` ใน `D/` | 8 ใน 8 ไฟล์ (O11 4 · ซ้อน 4) | regex | ข้อ 4.6.3 · ข้อ 4.11 G1 |
| LF1 ตัวกรอง select ประจำไฟล์ | 10 ใน 10 (`FilterSelect` 7 · `Filter` 1 · `LabeledSelect` 1 · `ReportSelect` 1) | `function` ตามชื่อ | ข้อ 6.1 |
| LT1 `<thead>`/`<th>` ที่มีพื้น `bg-muted`/`bg-accent` ทึบ หรือ `uppercase` | 43 ใน 17 ไฟล์ (รวมพื้น `/NN` ด้วยได้ 87 ใน 33) | ตัวอ่าน JSX ดู text ของ tag | ใหม่ (เติมส่วนที่ R7 ไม่เห็น) |
| LT2 หัวเรียงลำดับเขียนเอง | 8 ใน 8 · มี `aria-sort` แค่ `c/master-data/supplier-list-view.tsx` | `function …Sort…Header` | M04 ข้อ 2.4 |
| LT3 `<td colSpan>` | 16 ใน 15 (ทุกตัวเป็นแถวว่าง) | ตัวอ่าน JSX + `hasJsxAttr` | = 2A `TableEmptyRow` 16 |
| LT4 ตัวแบ่งหน้าเขียนเอง | 11 ใน 11 | `function …Pagination` ที่ไม่ render `<Pagination>` | = synthesis ข้อ 1 แถว 6 |
| LT5 ปิดใช้ด้วยความจาง | 23 บรรทัดใน 12 ไฟล์ | บรรทัดที่มี `opacity-N` และ `pointer-events-none`/`cursor-not-allowed` (ไม่มี prefix `disabled:` ฯลฯ) | 2A A/09:339 เขียน 20 · ข้อ 5.1 เขียน 22 · ต่าง: `supplier-list-view.tsx:232-233` (`cursor-not-allowed`) และ `D/assets/[id]/page.tsx:1797` |
| LV1 `toLocaleString()` ไม่ระบุ locale | 44 ใน 17 | regex | = 2A A/08:162 · = ข้อ 8.4 |
| LV2 `"-"` เป็นค่าว่าง (`\|\| "-"` · `?? "-"` · `: "-"`) | 128 ใน 43 | `RAW_DASH` (ข้อ 9.3.1) | 2A A/08:160 นับ 121/40 บนจอที่ `081d538` · ที่นี่นับหน้าพิมพ์ ป้าย ประโยคแปลด้วย แล้วคงไว้ใน KEEP |
| LV3 `formatCurrency(` | 42 ใน 13 (ไม่นับตัวประกาศใน `src/lib/utils.ts`) | regex | = A/08 |
| LS1 กล่องตัวเลขประจำไฟล์ | 30 ใน 27 | `function` ตามชื่อ 12 ชื่อ | M02 ข้อ 6.6 (25 + 5) |
| LS2 `<MetricCard` | 20 ใน 6 (กลาง 14 · ประจำไฟล์ 6) | regex | M04 ข้อ 1 |
| LK1 ตัวช่วย key-value ประจำไฟล์ | 11 ใน 11 | `function Info\|InfoRow\|DetailItem\|BatchInfo\|MobileAuditDetailField` | M03 §F เขียน 10 (ไม่นับ `asset-movement-timeline.tsx:133`) |
| LN1 `aria-current` ที่มีค่า `"page"` นอก nav primitive | 13 ใน 11 | ตัวอ่าน JSX ทุก tag + `jsxAttrValue` | ใหม่ |
| LN2 ฟังก์ชันประจำไฟล์ที่ชื่อชนของกลาง | 7 ใน 7 (ไม่นับ `FilterSelect` ที่ LF1 นับ) | `function` ตามชื่อ | synthesis ข้อ 5.5 |
| LR1 `<…DeleteButton id=` | 10 ใน 8 | regex | ข้อ 5.14 |
| test ที่อ่านไฟล์ | 195 · ไม่แปลง CRLF **136** | `crlf09.mjs` | บนเครื่องนี้ `core.autocrlf=true` (`git ls-files --eol`: `i/lf w/crlf`) |

ไม่ได้รัน `npm test` (ส่วนนี้อ่านอย่างเดียว) · ทุก guard ในข้อ 9.3 ลองด้วย `count09.mjs` ที่ใช้ตัวอ่านเดียวกันแล้ว ได้ค่าตามตาราง

### 9.2 guard เดิมใน VFG

กติกาหัวไฟล์ VFG:201-202 ("Lower a number in the task that removes a site; never raise one. Phase 2D sets every budget to {}.") · ตัวช่วย `assertWithinBudget` VFG:203-210 · VFG เป็นไฟล์เดียวที่ 2B และ 2C แก้คู่กันได้ (B7) · rebase แล้วใช้ค่าที่ต่ำกว่าของแต่ละแถว

#### 9.2.1 ตัวเลขต่อ plan

| guard | บรรทัด | HEAD | หลัง 2B-1 | 2B-2 | 2B-3 | 2B-4 | 2B-5 | งาน |
|---|---|---|---|---|---|---|---|---|
| R1 `TONE_OPACITY` | :222-231 | 1/1 | 1/1 | **`{}`** | `{}` | `{}` | `{}` | 2B-2 commit ของ `D/audit/rounds/page.tsx` (`QuickFilterBar` เป็นตัวห่อบางของ `TabNav` I20) |
| R7 test interim | :249-254 (`total <= 44` ยอดรวม) | 44/31 | **29/20 รายไฟล์** | 17/11 | 17/11 | 11/8 | **ลบ test นี้** | 2B-1 งาน 1 · 2B-5 งานล็อก |
| R7 test นอกหัวตาราง | :236-247 (ตัวกรอง `TABLE_HEADER_LINE` :234, :242-246) | 0 | 0 | 0 | 0 | 0 | **ไม่มีตัวกรอง · budget 3 แถว** | 2B-5 งานล็อก |
| R2 `SURFACE_SHADOW` | :256-272 | 10/9 | 10/9 | 10/9 | 10/9 (comment :270) | 10/9 | 10/9 | — (R-q · ข้อ 8.4) |

**R7 ลดที่ไหน** (44 = 15 + 12 + 0 + 6 + 8 + เหลือ 3):

| plan | ไฟล์:บรรทัด | จุด |
|---|---|---|
| 2B-1 | `D/admin/users/page.tsx:91` · `D/master-data/{branches:193, brands:432, categories:248, companies:171, departments:76, employees:206, locations:248}/page.tsx` · `c/master-data/supplier-list-view.tsx:95` · 2C ย้ายแล้ว (R-e): `c/admin/system-settings-form.tsx:1269`, `:1973`, `:2006` · `c/assets/asset-batch-form.tsx:886`, `:979`, `:1037` | 15 |
| 2B-2 | `D/disposal/page.tsx:363` ×2 · `D/disposal/batches/page.tsx:50` ×2 · `D/disposal/batches/[id]/page.tsx:95` ×2 · `D/audit/findings/page.tsx:381` · `D/audit/rounds/page.tsx:419` · `D/audit/rounds/[id]/page.tsx:697` · `D/audit/rounds/[id]/pending/page.tsx:188` · `D/maintenance/page.tsx:244` · `c/admin/asset-state-review-workspace.tsx:174` | 12 |
| 2B-3 | — (หัวทะเบียน `asset-register-table.tsx:541` เป็น `bg-muted` ทึบ · LT1 นับแทน) | 0 |
| 2B-4 | `D/assets/[id]/page.tsx:1439`, `:1507` · `D/master-data/employees/[id]/page.tsx:323`, `:368`, `:412` · `c/master-data/supplier-purchase-documents.tsx:45` | 6 |
| 2B-5 | `D/admin/logs/page.tsx:100` · `D/admin/roles/page.tsx:127`, `:195` · `D/admin/storage/page.tsx:99`, `:155`, `:250` · `D/my-assets/page.tsx:119` · `c/reports/responsive-report-list.tsx:31` | 8 |
| เหลือ (R-e) | `c/admin/role-permission-form.tsx:213` · `c/assets/asset-import-preview-panel.tsx:338` · `c/admin/IntegrationClientManager.tsx:547` → 2C plan 4 หรือ 2D | 3 |

ข้อ 8.4 ใช้ตัวเลขชุดเดียวกัน (29/20 → 17/11 → 17/11 → 11/8 → 3/3) · synthesis ข้อ 3 เขียน 2B-2 = 18 เพราะวาง `asset-state-review-workspace.tsx` ไว้ 2B-5 · ข้อ 8 ย้ายมา 2B-2 ส่วนนี้ใช้ตามข้อ 8

**2C ย้ายแล้ว 2 ไฟล์ (R-e) แก้แค่ class ของหัวตาราง (+ หัวหน้าของ `asset-batch-form` I13):**
- `c/assets/asset-batch-form.tsx` · h1 `:610` เป็น `PageHeader` (I13 · 2B-1 งาน 24) · เปลี่ยน class ของ `<thead` 3 บรรทัด (`:886`, `:979`, `:1037`) เป็นหัวตารางพื้นขาวตามข้อ 3.4 (`bg-surface`, ตัว `text-meta font-medium text-faint-foreground`) · ไม่ใช้ part ของ `DataTable` · `<table className=…>` และ `<th className="w-56 px-3 py-2">…` คงตัวอักษรเดิม เพราะ `tests/asset-batch-form-layout.test.ts:33-59` ยึดลำดับ string (2C ข้อ 9.8)
- `c/admin/system-settings-form.tsx` · `<thead className="bg-muted/40">` 3 บรรทัด + ตัวช่วย `Head` `:2669-2671` (th `uppercase` ของทั้ง 3 ตาราง · LT1 นับ 1) เปลี่ยนใน commit เดียวกัน ให้หัวตารางไม่ครึ่ง ๆ กลาง ๆ · ไม่แตะแถวแท็บ `:948-967` (O7)
- ทั้งสองไฟล์ห้ามรัน formatter (DH:385) · ทำใน 2B-1 เพราะไม่มี plan ของ 2C ทำงานคู่ (R-e)

#### 9.2.2 โค้ดที่เปลี่ยน

**2B-1 งาน 1:** VFG:249-254 → `assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)` · object 31 แถวตามข้อ 8.4 (ชื่อเดียวกัน ค่าที่ HEAD) · test VFG:236-247 คงตัวกรอง `<th` ไว้จนถึง 2B-5 · ทุก commit ที่ย้ายตารางลบแถวของตัวเอง

```ts
test("R7 interim: table-header fills wait for DataTable (2B), file by file", () => {
  // A file missing from TABLE_HEADER_FILLS may have none. The commit that moves a table onto DataTable deletes its row.
  assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)
})
```

**2B-2 (commit ของ `D/audit/rounds/page.tsx`):** VFG:227-230 → `assertWithinBudget(TONE_OPACITY, {})` และลบ comment `:228`

**2B-3:** VFG:270 comment `(2B / phase 3)` → `(phase 3, R-q)` · เลขคง 1 (ข้อ 7.12)

**2B-5 งานล็อก:** ลบ `TABLE_HEADER_LINE` (:234) และ test interim · test เดียวตรวจทุกบรรทัด

```ts
test("R7 neutral fills are opaque tokens, table headers included", () => {
  const css = globals()
  assert.match(css, /--row-hover: #[0-9A-F]{6};/)
  assert.match(css, /--border-soft: #[0-9A-F]{6};/)
  assert.match(css, /--color-row-hover: var\(--row-hover\);/, "without this line Tailwind drops bg-row-hover without an error")
  assert.match(css, /--color-border-soft: var\(--border-soft\);/, "without this line Tailwind drops border-border-soft without an error")
  // 2C plan 4 or 2D moves these three tables of 2C batch 4 files; then the budget is {}.
  assertWithinBudget(NEUTRAL_FILL_OPACITY, {
    "src/components/admin/role-permission-form.tsx": 1,
    "src/components/assets/asset-import-preview-panel.tsx": 1,
    "src/components/admin/IntegrationClientManager.tsx": 1,
  })
})
```

ถ้า 2C-4 merge ก่อน 2B-5 และลดแถวแล้ว ใช้แถวที่เหลือ (ข้อ 8.15)

#### 9.2.3 pin อื่นใน VFG ที่ 2B แตะ

| บรรทัด | ยึด | 2B ทำ |
|---|---|---|
| :10-13 | วงโฟกัส `ring-ring` เท่านั้น ไม่มี `/NN` | ทุก class ใหม่ผ่าน (ข้อ 3.2) · ไม่แก้ |
| :26-28 | `tabIndex={-1}` คู่ class ใน `audit-scan-check-panel.tsx`, `disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx` | 2B-2 แตะส่วนรายการของ bulk 2 ไฟล์ · ห้ามแตะ 2 บรรทัดนี้ · ไม่แก้ |
| :64 | `metric-card.tsx` มี `cn("num mt-2 font-bold"` | **2B-5** (R-d): `MetricCard` กลาง 14 จุดเป็น `StatStrip` แล้วลบ `c/ui/metric-card.tsx` (ไม่มีผู้เรียก) · เปลี่ยนเป็น `assert.match(read("src/components/ui/stat-strip.tsx"), /"text-metric num text-foreground"/)` |
| :90 | `metric-card.tsx` มี `cn("rounded-lg border p-5", toneClasses.container, className)` | **2B-5**: `assert.equal(existsSync("src/components/ui/metric-card.tsx"), false)` + `assert.doesNotMatch(read("src/components/ui/stat-strip.tsx"), /\bbg-(?:success\|warning\|danger\|info)-soft\b\|\bshadow-/)` · เพิ่ม `existsSync` ใน import :2 · `getMetricCardToneClasses` ใน `src/lib/design-system.ts` คงไว้ให้ 2D ลบ (`tests/design-system.test.ts:25-31` ผ่านต่อ) |
| :109-115 | แถบเต็มขอบ 3 ตัว · :114 `asset-detail-tabs.tsx` `border-r border-border bg-canvas/95 ` | ไม่แก้ · 2B-4 คงตัวบอกเลื่อน (`:91-98`) ไว้ในไฟล์ห่อ `asset-detail-tabs.tsx` ที่ยังเป็น client (ข้อ 9.9 ข้อ 11) |
| :117-122 | `<StatusBadge …/>` มากกว่า 40 · ไม่มี `color=` | ไม่แก้ · ตอนนี้ 62 (รวมตัวประจำไฟล์ 3) · หลังเลิก `StatusBadge` ประจำไฟล์ของ `D/notifications/page.tsx:156` ยังเกิน 40 |
| :143-148 | แท็บสถานะทะเบียน | **2B-3** ตามข้อ 7.17 (อ่าน `ui/tab-nav.tsx` · `asset-register-status-tabs.tsx` ยังมี `data-asset-status-tabs` ที่ส่งผ่าน `...navProps` I9) |
| :168-199 | ไม่มี `text-[13px]`/`rounded-[6px]` · `text-metric` คู่ `num` · `tag` ไม่หนาไม่ตั้งขนาด · faint ไม่อยู่บนพื้นสถานะ | ทุก plan ผ่านโดยไม่แก้ · `StatStrip` ต้องมี `num` ใน string เดียวกับ `text-metric` |
| :274-289 | `Segmented` | ไม่แก้ (R-a) |
| :291-307 | R3 ไม่มีตัวต่ำกว่า 12px · ไม่มี emoji | ไม่แก้ |

#### 9.2.4 FMG: แถวที่ยังมีส่วนของ 2B (ไม่แก้ไฟล์)

FMG เป็นของ 2C (I26 · DH:384) · budget เป็นค่าสูงสุด · 2B ลบจุดของตัวเองแล้วนับได้ต่ำกว่า budget · commit ถัดไปของ 2C ลดเลข

| FMG:บรรทัด | ไฟล์ | budget | จุดของ 2B | หลัง 2B นับได้ |
|---|---|---|---|---|
| :282 GF7 | `c/disposal/disposal-bulk-approval.tsx` | 3 | checkbox `:456`, `:499` (2B-2) | 1 |
| :283 GF7 | `c/disposal/disposal-bulk-execution.tsx` | 5 | `:689`, `:738` (2B-2) | 3 |
| :285 GF7 | `c/audit/audit-findings-batch-actions.tsx` | 1 | `:113` (2B-2) | 0 |
| :293 GF7 | `c/assets/asset-register-table.tsx` | 6 | `:549`, `:620` (2B-3) | 4 (ข้อ 7.12) |
| :307 GB1 | `c/audit/audit-finding-review-actions.tsx` | 2 | trigger `:113`, `:123` (comment ยังเขียน `:102, :112`) (2B-2) | 0 |
| :314 GB1 | `c/disposal/disposal-bulk-approval.tsx` | 4 | `:424` (2B-2) | 3 |
| :318 GB1 | `c/audit/audit-findings-batch-actions.tsx` | 2 | `:88`, `:97` (2B-2) | 0 |
| :351 GL1 | `c/assets/asset-register-table.tsx` | 1 | แถบ `:455` (R-q คงที่เดิม) | 1 |

ห้ามเปลี่ยนชื่อหรือย้ายไฟล์ใน `BATCH_FILES` (FMG:26-37, test :413) · ไม่มี `flex-col-reverse` ใน `c/ui/` ใหม่ (GD4 :589-603) · `busy` อยู่ในไฟล์ `"use client"` และไม่ซ้ำ `disabled` (GB4 :532-548) · route รายการใหม่เป็นโหมด navigation (GL2 :660-672) · จำนวนที่ต่ำลงจด DH ให้ 2C plan ถัดไป

### 9.3 ไฟล์ guard ใหม่ `tests/list-frame-guards.test.ts`

**ไฟล์เดียว ชื่อนี้** (แบบ FMG ของ 2C) · สร้างใน **2B-1 งาน 1** (commit เดียวกับ R7 รายไฟล์ หรือถัดไปทันที) ก่อนของกลางชิ้นแรก · budget ทุกตัวเป็นค่าที่ HEAD ตั้งแต่วันแรก แล้วลดใน commit ที่ย้ายไฟล์ · 2C ไม่ต้องแก้ไฟล์นี้ (budget เป็นค่าสูงสุด) · ถ้าแก้ได้แค่ลด · 2D ตั้ง budget ทุกตัวเป็น `{}`

**รวม guard ที่ส่วนอื่นเสนอไว้** (ส่วนนั้นไม่ต้องเขียนข้อ "ไม่มี" ซ้ำในไฟล์ของตัวเอง · ข้อ "มี" อยู่ที่เดิม):

| ID | ตรวจ | เดิม |
|---|---|---|
| LH1 | `<h1>` อยู่ใน `PageHeader` เท่านั้น | ข้อ 4.11 `page-frame-guards` G2 (2B-5) |
| LH2 | `MasterDataHeader` / `ReportHeader` / `PageHeader` ประจำไฟล์หาย | ข้อ 4.11 G4 (2B-5) |
| LB1 | ปุ่มกลับผ่าน `PageBackLink` | ข้อ 4.11 G3 (2B-5) |
| LP1 | ไม่มี `pb-24` ซ้อนบนหน้าที่ไม่มีแถบล่าง | ข้อ 4.11 G1 (2B-4) |
| LF1 | ไม่มีตัวกรอง select ประจำไฟล์ | ข้อ 6.13 ตาราง B ข้อ 9 (ส่วน `function`) |
| LT1 | หัวตารางพื้นขาว ไม่ใช้ตัวพิมพ์ใหญ่ (B3(2)) | ข้อ 5.14 `list-pages-ui` "ไม่มี `<thead className="bg-muted`" |
| LT2 | หัวเรียงลำดับมาจาก `DataTable` (`aria-sort`) | ข้อ 5.14 "ไม่มี `function \w*SortableColumnHeader(`" |
| LT3 | แถวว่างผ่าน `TableEmptyRow` | ใหม่ (2A A:69) |
| LT4 | แบ่งหน้าผ่าน `Pagination` | ข้อ 5.14 "ไม่มี `function \w*Pagination(`" |
| LT5 | ไม่ปิดใช้ด้วยความจาง | ข้อ 5.14 "ไม่มี `opacity-50`" · 2A A/09:339 |
| LV1 | ตัวเลขผ่าน `formatCount` / `formatMoney` | ข้อ 5.14 "ไม่มี `toLocaleString()`" |
| LV2 | ค่าว่างผ่าน `Nil` / `orNil` (R-n) | ใหม่ |
| LV3 | เงินบนจอผ่าน `formatMoney` (R-n) | ใหม่ |
| LS1, LS2 | กล่องตัวเลขผ่าน `StatStrip` (R-d) | ใหม่ (ข้อ 3.13 รายการผู้เรียก) |
| LK1 | ค่าในหน้ารายละเอียดผ่าน `KeyValueList` | ใหม่ (ข้อ 3.14) |
| LN1 | แถวแท็บและลิงก์ที่เลือกอยู่ผ่าน `TabNav` / `StatStrip` / `Pagination` | ใหม่ (ข้อ 3.12) |
| LN2 | ไม่มีฟังก์ชันประจำไฟล์ชื่อชนของกลาง | ใหม่ (synthesis ข้อ 5.5) |
| LR1 | ลบในแถวผ่าน ⋯ ของ `RowActions` (B5) | ข้อ 5.14 "ไม่มี `\w+DeleteButton id=`" |
| L0 | ไฟล์ที่ย้ายแล้วเหลือแค่ที่ `KEEP` ยอม · แถว budget ชี้ไฟล์ที่มีจริง | แบบ `MIGRATED_FILES` ของ FMG |
| — | ตัวนับอ่าน JSX และบรรทัดถูก (test ตัวอย่าง) | แบบ FMG:378 |

เมนูข้าง (ลึก ≤2 · รายการแรก `/assets` · ไอคอนไม่ซ้ำ 39 ชื่อ) **ไม่ย้ายมา** เพราะเป็น test โครงสร้าง ไม่ใช่ budget · อยู่ที่ `tests/sidebar-menu-structure.test.ts` (ข้อ 4.11) · ไฟล์นี้เพิ่มแค่ LN1 ที่ข้าม `c/layout/sidebar.tsx`

#### 9.3.1 โครงไฟล์

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import { budgetOverruns, countByFile, countMatchesByFile, findJsxTags, hasJsxAttr, jsxAttrValue, readSourceFiles, type SourceFile } from "./helpers/source-files.ts"

// Phase 2B list-frame guards (spec 2B §9). A file missing from a budget may have none; a listed file at most its number.
// Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
const sources = readSourceFiles("src")
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
// Screen code: pages and components. src/lib and the API routes are out (R-n keeps "-" there).
const offScreen = (path: string) => !(path.startsWith("src/app/") || path.startsWith(C)) || path.startsWith("src/app/api/")
const skip = (...owners: string[]) => (path: string) => offScreen(path) || owners.includes(path)
const skipUi = (path: string) => offScreen(path) || path.startsWith(`${C}ui/`)
const NAV_PRIMITIVES = ["ui/tab-nav.tsx", "ui/breadcrumbs.tsx", "ui/pagination.tsx", "ui/steps.tsx", "ui/stat-strip.tsx", "layout/sidebar.tsx", "layout/mobile-field-navigation.tsx"].map((path) => C + path)
const tagsWhere = (names: string[], keep: (text: string) => boolean) => (file: SourceFile) => findJsxTags(file.source, names).filter((tag) => keep(tag.text)).length

// Files 2B is done with, in commit order. The commit that finishes a file adds its line and lowers its rows; never remove one.
const MIGRATED_LIST_FILES: string[] = []
```

ไม่แก้ `tests/helpers/source-files.ts` (FMG ใช้อยู่) · ตัวช่วยใหม่ 2 ตัวอยู่ในไฟล์นี้:

```ts
// A function named …Pagination that does not render <Pagination>: a thin wrapper that only builds hrefs is fine.
function handPaginations(file: SourceFile): number {
  let count = 0
  for (const match of file.source.matchAll(/\bfunction [A-Z]\w*Pagination\b/g)) {
    const rest = file.source.slice(match.index + "function ".length)
    const next = rest.search(/\n(?:export )?(?:async )?function |\nconst [A-Z]/)
    if (!/<Pagination(?=[\s/>])/.test(next === -1 ? rest : rest.slice(0, next))) count++
  }
  return count
}
// A disabled look made of opacity: the line has opacity-N and pointer-events-none or cursor-not-allowed, none behind a variant (disabled:, hover:).
const fadedDisabled = (line: string) => /(?<![\w:-])opacity-\d+\b/.test(line) && /(?<![\w:-])(?:pointer-events-none|cursor-not-allowed)\b/.test(line)
```

**ตัวนับ** (regex ตรงตัวที่ `count09.mjs` ใช้นับข้อ 9.1 และ 9.4):

```ts
const HEADER_OWNER = `${C}ui/page-header.tsx`
const OLD_HEADER = /\bMasterDataHeader\b|\bReportHeader\b|\bfunction PageHeader\b/g
const BACK_ICON = /<ArrowLeft\b/g
const DOUBLE_BOTTOM_PADDING = /\bpb-(?:24|36)\b/g
const LOCAL_FILTER_SELECT = /\bfunction (?:FilterSelect|ReportSelect|LabeledSelect)\b|\bfunction Filter\(/g
const HEADER_LOOK = /\bbg-(?:muted|accent)(?![\w/-])|\buppercase\b/ // the /NN fills belong to R7
const LOCAL_SORT_HEADER = /\bfunction (?:[A-Z]\w*)?Sort\w*Header\b/g
const BARE_LOCALE_STRING = /\.toLocaleString\(\)/g
const RAW_DASH = /(?:\|\||\?\?|:)\s*"-"/g
const FORMAT_CURRENCY = /(?<!function )\bformatCurrency\(/g
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")

const COUNTERS: Record<string, () => Record<string, number>> = {
  LH1: () => countByFile(sources, tagsWhere(["h1"], () => true), skip(HEADER_OWNER)),
  LH2: () => countMatchesByFile(sources, OLD_HEADER, skip(HEADER_OWNER)),
  LB1: () => countMatchesByFile(sources, BACK_ICON, skip(HEADER_OWNER)),
  LP1: () => countMatchesByFile(sources, DOUBLE_BOTTOM_PADDING, (path) => !path.startsWith(D)),
  LF1: () => countMatchesByFile(sources, LOCAL_FILTER_SELECT, skipUi),
  LT1: () => countByFile(sources, tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text)), offScreen),
  LT2: () => countMatchesByFile(sources, LOCAL_SORT_HEADER, skip(`${C}ui/data-table.tsx`)),
  LT3: () => countByFile(sources, (file) => findJsxTags(file.source, ["td"]).filter((tag) => hasJsxAttr(tag.text, "colSpan")).length, skip(`${C}ui/data-table.tsx`)),
  LT4: () => countByFile(sources, handPaginations, skip(`${C}ui/pagination.tsx`)),
  LT5: () => countByFile(sources, (file) => file.source.split("\n").filter(fadedDisabled).length, offScreen),
  LV1: () => countMatchesByFile(sources, BARE_LOCALE_STRING, offScreen),
  LV2: () => countMatchesByFile(sources, RAW_DASH, offScreen),
  LV3: () => countMatchesByFile(sources, FORMAT_CURRENCY, offScreen),
  LS1: () => countMatchesByFile(sources, LOCAL_STAT_TILE, skipUi),
  LS2: () => countMatchesByFile(sources, METRIC_CARD_TAG, offScreen),
  LK1: () => countMatchesByFile(sources, LOCAL_KEY_VALUE, skipUi),
  LN1: () => countByFile(sources, tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent), (path) => offScreen(path) || NAV_PRIMITIVES.includes(path)),
  LN2: () => countMatchesByFile(sources, UI_NAME, skipUi),
  LR1: () => countMatchesByFile(sources, ROW_DELETE_BUTTON, offScreen),
}

for (const [id, title] of Object.entries(TITLES)) { // TITLES: one English sentence per ID, as in FMG
  test(`${id} ${title}`, () => {
    const counts = COUNTERS[id]()
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    assert.deepEqual(budgetOverruns(counts, BUDGETS[id] ?? {}), [], `${id}: ${total} in ${Object.keys(counts).length} files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.`)
  })
}

test("L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file", () => {
  const problems: string[] = []
  for (const [id, count] of Object.entries(COUNTERS)) {
    const counts = count()
    for (const path of MIGRATED_LIST_FILES) if ((counts[path] ?? 0) > (KEEP[id]?.[path] ?? 0)) problems.push(`${id} ${path}: ${counts[path]} > ${KEEP[id]?.[path] ?? 0}`)
  }
  for (const table of [BUDGETS, KEEP]) for (const rows of Object.values(table)) for (const path of Object.keys(rows)) if (!existsSync(path)) problems.push(`${path}: no such file, delete the row`)
  assert.deepEqual(problems, [])
})
```

#### 9.3.2 guard ทีละข้อ

ทุกข้อ: `assert.deepEqual(budgetOverruns(COUNTERS[id](), BUDGETS[id]), [], …)` (ข้อความแบบ FMG:86-93) · ตัวเลข "หลัง 2B" = `KEEP` (ข้อ 9.4.3)

| ID | ตัวนับ (`COUNTERS[id]`) | ข้าม | HEAD | หลัง 2B | ลดใน |
|---|---|---|---|---|---|
| LH1 | `countByFile(sources, tagsWhere(["h1"], () => true), …)` | `offScreen` · `c/ui/page-header.tsx` | 60/60 | 6/6 | 1·2·3·4·5 |
| LH2 | `countMatchesByFile(sources, /\bMasterDataHeader\b\|\bReportHeader\b\|\bfunction PageHeader\b/g, …)` | `offScreen` · `page-header.tsx` | 27/15 | 0 | 1·2·3·5 |
| LB1 | `/<ArrowLeft\b/g` | `offScreen` · `page-header.tsx` | 27/27 | 7/7 | 1·2·4 |
| LP1 | `/\bpb-(?:24\|36)\b/g` | ทุกไฟล์นอก `D/` | 8/8 | 4/4 (O11 → 2C-5) | 2·4 |
| LF1 | `/\bfunction (?:FilterSelect\|ReportSelect\|LabeledSelect)\b\|\bfunction Filter\(/g` | `skipUi` | 10/10 | 0 | 1·2·3·5 |
| LT1 | `tagsWhere(["thead", "th"], (t) => /\bbg-(?:muted\|accent)(?![\w/-])\|\buppercase\b/.test(t))` · พื้น `/NN` เป็นของ R7 | `offScreen` | 43/17 | 7/2 | 1·3·4·5 |
| LT2 | `/\bfunction (?:[A-Z]\w*)?Sort\w*Header\b/g` | `offScreen` · `c/ui/data-table.tsx` | 8/8 | 0 | 1·3·5 |
| LT3 | `findJsxTags(source, ["td"]).filter((t) => hasJsxAttr(t.text, "colSpan"))` | `offScreen` · `c/ui/data-table.tsx` | 16/15 | 0 | 1·2·3·5 |
| LT4 | `handPaginations` | `offScreen` · `c/ui/pagination.tsx` | 11/11 | 0 | 1·2·5 |
| LT5 | `source.split("\n").filter(fadedDisabled).length` | `offScreen` | 23/12 | 0 | 1·2·4·5 |
| LV1 | `/\.toLocaleString\(\)/g` | `offScreen` | 44/17 | 8/3 (R-f) | 1·2·4·5 |
| LV2 | `RAW_DASH` (`\|\| "-"` · `?? "-"` · `: "-"`) | `offScreen` | 128/43 | 68/19 | 1·2·3·4·5 |
| LV3 | `/(?<!function )\bformatCurrency\(/g` | `offScreen` | 42/13 | 6/2 (หน้าพิมพ์ → 2D) | 2·3·4·5 |
| LS1 | `/\bfunction (?:SummaryTile\|SummaryCard\|SummaryPill\|SummaryStrip\|RoleAuditCard\|ResolutionMetric\|CoverageMetric\|Metric\|DashboardCard\|BatchMetric\|MetricCard\|OperationMetric)\b/g` | `skipUi` | 30/27 | 5/4 | 1·2·4·5 |
| LS2 | `/<MetricCard(?=[\s/>])/g` | `offScreen` | 20/6 | 0 | 4·5 |
| LK1 | `/\bfunction (?:Info\|InfoRow\|DetailItem\|BatchInfo\|MobileAuditDetailField)\b/g` | `skipUi` | 11/11 | 1/1 | 2·3·4 |
| LN1 | `tagsWhere(["[A-Za-z][\\w.]*"], (t) => /"page"/.test(jsxAttrValue(t, "aria-current") ?? ""))` | `offScreen` · `NAV_PRIMITIVES` | 13/11 | 2/1 (แผงยี่ห้อ I11) | 1·2·3·4·5 |
| LN2 | `/\bfunction (?:StatusBadge\|MetricCard\|ColumnHeader\|PageHeader\|Pagination\|DataTable\|TabNav\|StatStrip\|KeyValueList\|RowActions\|TableEmptyRow\|EmptyNote\|Nil)\b/g` | `skipUi` | 7/7 | 1/1 | 4·5 (I14) |
| LR1 | `/<[A-Z]\w*DeleteButton\s+id=/g` | `offScreen` | 10/8 | 0 | 1 |
| L0 | ทุกไฟล์ใน `MIGRATED_LIST_FILES`: ทุก `COUNTERS[id]()[path]` ≤ `KEEP[id]?.[path] ?? 0` · ทุก path ใน `BUDGETS` และ `KEEP` มี `existsSync` | — | ว่าง | ทุกไฟล์ของ 2B ที่มีค่าที่ HEAD | ทุก commit |
| ตัวอย่าง | ตัวนับข้างบนกับ source สั้น ๆ | — | — | — | 2B-1 งาน 1 |

**ทำไมแต่ละข้อนับแบบนี้:**
- **LH1 ใช้ตัวอ่าน JSX** · `<h1` ใน comment ไม่นับ (`findJsxTags` ข้ามบรรทัด `//`, `/*`, `*`)
- **LT1 ดู text ของ tag** (className บรรทัดถัดไปก็เห็น เช่น `D/master-data/locations/page.tsx:390-392`) · ไม่นับ string ที่เก็บในตัวแปร (`asset-register-table.tsx:150`, `:154`) ซึ่ง test ของทะเบียนจับแล้ว (ข้อ 7.17 N4 `doesNotMatch(/…uppercase…/)`)
- **LT4 ดูเนื้อฟังก์ชัน** · ตัวห่อที่สร้าง href แล้ว render `<Pagination>` ผ่าน · ข้อ 5 เลือกลบตัวห่อ ก็ผ่านเหมือนกัน
- **LT5 ข้าม variant** · `disabled:opacity-50` ของปุ่มที่ปิดใช้จริงไม่นับ (เป็นของ 2D) · `cursor-not-allowed opacity-50` บน `<span aria-disabled>` นับ
- **LV2 นับ `: "-"` ด้วย** (แบบ A/08:160) · บางจุดไม่ใช่ค่าว่าง (`system-settings-form.tsx:2161` ตัวคั่นค่าตั้งต้น) แต่อยู่ในไฟล์ที่ KEEP คงไว้ทั้งไฟล์
- **LN1 นับเฉพาะค่า `"page"`** · `aria-current="step"` ของ stepper (`c/disposal/disposal-workflow-stepper.tsx:46`, 2C) และ `"true"` ของรายการห้อง (`c/audit/audit-scan-room-list.tsx:102`) ไม่นับ · แผงยี่ห้อ `D/master-data/brands/page.tsx` 2 คงใน `KEEP` (รายการเลือกแนวตั้ง I11) · มองไม่เห็นแถวลิงก์ที่ไม่มี `aria-current` เลย (`D/admin/logs/page.tsx:67-78`, `FilterChip` ของ `D/admin/approvals/page.tsx:185` และ `history/page.tsx:182`) · ข้อ 5 ต้องมี assert `<TabNav` ของ 3 แถวนี้
- **LS1, LK1, LN2, LT2 นับตามชื่อ** · เปลี่ยนชื่อหลบได้ · reviewer ดู diff · LT1, LT5, LV1–LV3 จับ markup ที่ย้ายไปไฟล์ใหม่
- **ไฟล์ใหม่ทุกไฟล์ได้ 0** (ไม่อยู่ใน budget) · `c/ui/page-header.tsx`, `data-table.tsx`, `pagination.tsx`, `stat-strip.tsx`, `tab-nav.tsx` ข้ามเฉพาะ guard ของตัวเอง

**test ตัวอย่าง** (กันตัวนับถอย):

```ts
test("the list-frame counters read JSX and lines as intended", () => {
  const file = (source: string): SourceFile => ({ path: "src/components/x.tsx", source })
  assert.equal(tagsWhere(["h1"], () => true)(file('// <h1>old</h1>\n<h1 className="x">a</h1>')), 1)
  assert.equal(handPaginations(file("function APagination() {\n  return <Pagination page={1} />\n}\nfunction BPagination() {\n  return <nav />\n}")), 1)
  assert.equal(fadedDisabled('className="pointer-events-none opacity-50"'), true)
  assert.equal(fadedDisabled('className="disabled:pointer-events-none disabled:opacity-50"'), false)
  const current = tagsWhere(["[A-Za-z][\\w.]*"], (text) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? ""))
  assert.equal(current(file('<Link aria-current={active ? "page" : undefined} /><li aria-current={on ? "step" : undefined} />')), 1)
  assert.equal(tagsWhere(["thead", "th"], (text) => /\bbg-(?:muted|accent)(?![\w/-])|\buppercase\b/.test(text))(file('<thead className="bg-muted/40"><th className="uppercase">')), 1)
})
```

ตัวอย่างใช้ string บรรทัดเดียวที่มี `\n` ในค่าของ string (ไม่ได้อ่านไฟล์) จึงไม่เกี่ยวกับ CRLF

### 9.4 ค่าตั้งต้นรายไฟล์และค่าหลัง 2B

อ่านค่าในตาราง: `n` = ลงเป็น 0 ใน plan ของแถว · `n→r` = เหลือ r (ที่ `KEEP` ยอม) · `n=` = คงทั้งหมด (ไม่ใช่ของ 2B หรืออยู่ใน `KEEP`) · `n(2B-5)` = ลดใน plan ที่วงเล็บ ไม่ใช่ plan ของแถว · `0→1` = budget 1 ตั้งแต่วันแรก · `–` = 0 · คอลัมน์ plan = plan แรกที่แก้ไฟล์ตามข้อ 8 · ตัวเลขทั้งหมดจาก `tables09.txt`

#### 9.4.1 หัวหน้า ปุ่มกลับ แท็บ กล่องตัวเลข

| plan | ไฟล์ | LH1 | LH2 | LB1 | LP1 | LN1 | LN2 | LS1 | LS2 | LK1 |
|---|---|---|---|---|---|---|---|---|---|---|
| 2B-1 | `D/admin/users/page.tsx` | 1 | – | – | – | – | – | – | – | – |
| 2B-1 | `D/disposal/batch/new/page.tsx` · `D/disposal/new/page.tsx` | 1 · 1 | – | 1 · 1 | – | – | – | – | – | – |
| 2B-1 | `D/maintenance/new/page.tsx` · `pm/new` · `pm/[id]/edit` | 1 · 1 · 1 | – | – | – | – | – | – | – | – |
| 2B-1 | `D/master-data/{branches, categories, companies, employees, locations, suppliers}/page.tsx` | – | 2 ทุกไฟล์ | – | – | – | – | 1 ทุกไฟล์ | – | – |
| 2B-1 | `D/master-data/brands/page.tsx` | – | 2 | – | – | 2= (แผงยี่ห้อ I11) | – | 1 | – | – |
| 2B-1 | `D/master-data/departments/page.tsx` | – | 2 | – | – | – | – | – | – | – |
| 2B-1 | ฟอร์มข้อมูลหลัก 9 (`c/master-data/{asset-model, branch, brand, category, company, department, employee, location, supplier}-form.tsx`) · `c/admin/admin-user-form.tsx` · `c/admin/role-permission-form.tsx` · `c/assets/asset-form.tsx` · `c/assets/asset-component-manager.tsx` | 1 ทุกไฟล์ | – | 1 ทุกไฟล์ | – | – | – | – | – | – |
| 2B-1 | `c/asset-operations/{checkin, checkout, transfer, bulk-move}-form.tsx` · `c/assets/asset-batch-form.tsx` · `c/audit/audit-round-form.tsx` | 1 ทุกไฟล์ | – | – | – | – | – | – | – | – |
| 2B-1 | `c/assets/asset-scan-search-tool.tsx` · `c/assets/asset-label-batch-tool.tsx` | 1= · 1= (2C-4) | – | – | – | – | – | – | – | – |
| 2B-1 | `c/admin/system-settings-form.tsx` | – | – | 1= | – | – | – | 1= | – | – |
| 2B-1 | `c/master-data/master-data-layout.tsx` | 1 | 1(2B-5) | – | – | – | 1(2B-5) | – | – | – |
| 2B-1 | `c/master-data/supplier-list-view.tsx` | – | – | – | – | 1 | – | – | – | – |
| 2B-2 | `D/admin/data-quality/page.tsx` | 1 | – | – | – | – | – | 1 | – | – |
| 2B-2 | `D/admin/integrations/page.tsx` | 1 | – | – | – | – | – | – | – | – |
| 2B-2 | `D/audit/findings/page.tsx` | – | 2 | – | – | 2 | – | 1 | – | 1 |
| 2B-2 | `D/audit/rounds/page.tsx` | – | 2 | – | – | 1 | – | 1 | – | – |
| 2B-2 | `D/audit/rounds/[id]/page.tsx` | 1 | – | 0→1 | 1= | – | – | 2 | – | 1 |
| 2B-2 | `D/audit/rounds/[id]/pending/page.tsx` | 1 | – | – | – | – | – | – | – | – |
| 2B-2 | `D/disposal/page.tsx` | 1 | – | – | – | 1 | – | – | – | – |
| 2B-2 | `D/disposal/batches/page.tsx` | 1 | – | 1 | – | – | – | – | – | – |
| 2B-2 | `D/disposal/batches/[id]/page.tsx` | 1 | – | 1 | 1 | – | – | 1 | – | 1 |
| 2B-2 | `D/maintenance/page.tsx` · `D/maintenance/pm/page.tsx` | 1 · 1 | – | – | – | – | – | – | – | – |
| 2B-2 | `c/disposal/disposal-pagination.tsx` · `c/maintenance/maintenance-pagination.tsx` | – | – | – | – | 1 · 1 | – | – | – | – |
| 2B-2 | `c/disposal/disposal-bulk-approval.tsx` | – | – | – | – | – | – | 1= (dialog `:549`, 2C-3) | – | – |
| 2B-3 | `D/asset-management/import-export/page.tsx` | 1 | – | – | – | – | – | – | – | 1 |
| 2B-3 | `D/assets/page.tsx` | – | 2 | – | – | – | – | – | – | – |
| 2B-3 | `c/assets/asset-register-status-tabs.tsx` | – | – | – | – | 1 | – | – | – | – |
| 2B-4 | `D/assets/[id]/page.tsx` | 1 | – | 1 | 1= | – | – | 1 | – | 1 |
| 2B-4 | `D/disposal/[id]/page.tsx` | 1 | – | 1 | 1= | – | – | – | – | 1 |
| 2B-4 | `D/maintenance/[id]/page.tsx` | 1 | – | 0→1 | 1= | – | – | – | – | 1 |
| 2B-4 | `D/master-data/employees/[id]/page.tsx` | 1 | – | 1 | 1 | – | 1 | 1 | – | 1 |
| 2B-4 | `D/master-data/suppliers/[id]/page.tsx` | 1 | – | 1 | 1 | – | 1 | 1 | 5 | 1 |
| 2B-4 | `D/my-assets/[id]/page.tsx` | 1 | – | 1 | 1 | – | – | – | – | 1 |
| 2B-4 | `c/assets/asset-detail-tabs.tsx` | – | – | – | – | 1 | – | – | – | – |
| 2B-5 | `D/admin/{approvals, approvals/history, readiness, roles, storage}/page.tsx` | 1 ทุกไฟล์ | – | – | – | – | – | 1 ทุกไฟล์ | – | – |
| 2B-5 | `D/admin/{logs, settings}/page.tsx` · `D/dashboard/page.tsx` | 1 ทุกไฟล์ | – | – | – | – | – | – | – | – |
| 2B-5 | `D/my-assets/page.tsx` | 1 | 1 | – | – | – | 1 | 1 | – | – |
| 2B-5 | `D/notifications/page.tsx` | 1 | – | – | – | – | 1 | 1 | – | – |
| 2B-5 | `D/work-center/page.tsx` | 1 | – | – | – | 1 | 1 | 2 | 1 | – |
| 2B-5 | `D/reports/page.tsx` | – | 2 | – | – | – | – | – | 2 | – |
| 2B-5 | `c/reports/report-header.tsx` | 1 | 1 | – | – | – | – | – | – | – |
| 2B-5 | `c/reports/{reports-accounting, reports-catalog, reports-operations}-view.tsx` | – | – | – | – | – | – | – | 10 · 1 · 1 | – |
| 2B-5 | `c/reports/report-view-tabs.tsx` | – | – | – | – | 1 | – | – | – | – |
| — | `src/app/[locale]/(auth)/login/page.tsx` | 1= | – | – | – | – | – | – | – | – |
| — | `c/asset-operations/operation-document-print.tsx` · `c/assets/asset-label-print.tsx` · `c/audit/audit-scan-header.tsx` | 1= ทุกไฟล์ | – | 1= ทุกไฟล์ | – | – | – | – | – | – |
| — | `c/disposal/disposal-batch-form.tsx` | – | – | 1= | – | – | – | – | – | – |
| — | `c/admin/IntegrationClientManager.tsx` | – | – | – | – | – | 1= | 2= | – | – |
| — | `c/assets/asset-import-preview-panel.tsx` | – | – | – | – | – | – | 1= | – | – |
| — | `c/assets/asset-movement-timeline.tsx` | – | – | – | – | – | – | – | – | 1= |

หมายเหตุของตาราง:
- **LH1 ฟอร์ม 6 ไฟล์ที่ไม่มีปุ่มกลับ** (`checkin`, `checkout`, `transfer`, `bulk-move`, `asset-batch-form`, `audit-round-form`) ลดใน 2B-1 ตามรายการไฟล์ของข้อ 8 · ข้อ 4.4.3 / 4.4.6 วางไว้ 2B-2 และ 2B-5 (ข้อ 9.9 ข้อ 7)
- **LH1 เครื่องมือ 2 ไฟล์ชุด 4** (`asset-scan-search-tool`, `asset-label-batch-tool`) คงไว้ (รั้ว synthesis ข้อ 2 · ข้อ 4.4.7) · 2C plan 4 ลดเป็น 0 ใน commit ของไฟล์
- **LB1 `0→1` 2 แถว:** ปุ่มกลับของแถบล่างมือถือที่ B2 แก้ไอคอน (`D/audit/rounds/[id]/page.tsx:479` `Download` → `ArrowLeft` ใน 2B-2 · `D/maintenance/[id]/page.tsx:147` `Wrench` → `ArrowLeft` ใน 2B-4) อยู่ใน array `actions` ที่ส่งให้ `MobileActionBar` (รั้ว O11 ยอมแค่ไอคอน) จึงไม่ผ่าน `PageBackLink` · เป็น 2 แถวเดียวที่ budget สูงกว่า HEAD ตั้งแต่วันแรก
- **LB1 ที่คง:** `system-settings-form.tsx:1412` (ปุ่มย้ายหมวดออก ไม่ใช่ปุ่มกลับ) · `disposal-batch-form.tsx:93` (กลับไปแก้ในขั้นทวน 2C) · หน้าพิมพ์ 2 · หัวสแกน 1
- **LP1 ที่คง 4 หน้า O11** → 2C plan 5 (ข้อ 4.6.3)
- **LH2 และ LN2 `D/my-assets/page.tsx`** ไม่แตะใน 2B-1 · 2B-5 แทน `function PageHeader` ประจำไฟล์ (`:163-170`) ด้วย `PageHeader` กลางและลบฟังก์ชันใน commit เดียว จึงลดทั้งสองข้อใน 2B-5 (I14)
- **LN1 `D/master-data/brands/page.tsx` 2 คงไว้ใน `KEEP`:** แผงเลือกยี่ห้อเป็นรายการลิงก์แนวตั้งเดิม `aria-current="page"` ถูกความหมาย ไม่ใช่ `TabNav` (I11)
- **`master-data-layout.tsx`:** h1 หายใน 2B-1 เพราะ `MasterDataHeader` เป็นตัวห่อบาง (R-h) · ตัวประกาศ `MasterDataHeader`, `ColumnHeader`, `SortableColumnHeader`, `MasterDataPagination` ลบใน 2B-5 (ข้อ 8.13 ข้อ 6)
- **LS1 ที่คง:** `IntegrationClientManager.tsx:763`, `:782` · `asset-import-preview-panel.tsx:461` (2C-4) · `system-settings-form.tsx:2413` (2D) · `disposal-bulk-approval.tsx:572` (ใช้ใน dialog `:549`, 2C-3)

#### 9.4.2 ตาราง ตัวกรอง และค่า

| plan | ไฟล์ | LF1 | LT1 | LT2 | LT3 | LT4 | LT5 | LV1 | LV2 | LV3 | LR1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2B-1 | `D/admin/users/page.tsx` | – | – | – | 1 | – | – | – | 2 | – | – |
| 2B-1 | `D/master-data/branches/page.tsx` | 1 | 1 | 1 | 1 | 1 | 2 | 4 | 1 | – | 1 |
| 2B-1 | `D/master-data/brands/page.tsx` | 1 | – | – | 1 | 1 | 2 | 2 | 1 | – | 2 |
| 2B-1 | `D/master-data/categories/page.tsx` | 1 | 1 | 1 | 1 | 1 | 2 | 3 | 1 | – | 1 |
| 2B-1 | `D/master-data/companies/page.tsx` | 1 | 1 | 1 | 1 | 1 | 2 | 4 | 2 | – | 1 |
| 2B-1 | `D/master-data/departments/page.tsx` | – | – | – | 1 | – | – | – | – | – | 1 |
| 2B-1 | `D/master-data/employees/page.tsx` | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 2 | – | 1 |
| 2B-1 | `D/master-data/locations/page.tsx` | 1 | 1 | 1 | 1 | 1 | 2 | 3 | 1 | – | 1 |
| 2B-1 | `D/master-data/suppliers/page.tsx` | 1 | – | – | – | – | – | 1 | – | – | – |
| 2B-1 | `c/master-data/supplier-list-view.tsx` | – | 1 | 1 | – | 1 | 2 | 4 | 5 | – | 2 |
| 2B-1 | `c/master-data/master-data-layout.tsx` | – | 2(2B-5) | 1(2B-5) | – | 1(2B-5) | 2(2B-5) | – | – | – | – |
| 2B-1 | `c/admin/depreciation-policy-builder.tsx` | – | – | – | – | – | – | 1 (R-f) | – | – | – |
| 2B-1 | `c/admin/system-settings-form.tsx` | – | 1 (`Head` :2670) | – | – | – | – | – | 8= | – | – |
| 2B-1 | `c/admin/role-permission-form.tsx` | – | 2= (R-e) | – | – | – | – | – | – | – | – |
| 2B-1 | `c/asset-operations/checkin-form.tsx` · `c/assets/asset-batch-form.tsx` · `c/assets/asset-component-manager.tsx` · `c/assets/asset-form.tsx` | – | – | – | – | – | – | – | 9= · 8= · 3= · 1= | – | – |
| 2B-1 | `c/assets/asset-label-batch-tool.tsx` | – | – | – | – | – | – | 1= (R-f) | 6= (ป้าย) | – | – |
| 2B-2 | `D/audit/findings/page.tsx` | – | – | – | 1 | – | – | – | 7 | – | – |
| 2B-2 | `D/audit/rounds/page.tsx` | – | – | – | 1 | – | – | – | – | – | – |
| 2B-2 | `D/audit/rounds/[id]/page.tsx` | – | – | – | 1 | 1 | 2 | – | 5 | – | – |
| 2B-2 | `D/audit/rounds/[id]/pending/page.tsx` | – | – | – | 1 | – | – | – | 1 | – | – |
| 2B-2 | `D/disposal/page.tsx` | – | – | – | 1 | – | – | – | 1 | 2 | – |
| 2B-2 | `D/disposal/batches/[id]/page.tsx` | – | – | – | – | – | – | – | – | 2 | – |
| 2B-2 | `D/maintenance/page.tsx` | – | – | – | – | – | – | – | 1 | 2 | – |
| 2B-2 | `c/admin/asset-state-review-workspace.tsx` | 1 (O3) | – | – | – | – | – | 1 | – | – | – |
| 2B-2 | `c/disposal/disposal-pagination.tsx` · `c/maintenance/maintenance-pagination.tsx` | – | – | – | – | 1 · 1 | 2 · 2 | – | – | – | – |
| 2B-2 | `c/audit/audit-finding-review-actions.tsx` | – | – | – | – | – | – | – | 3= (dialog) | – | – |
| 2B-3 | `c/assets/asset-register-filter-sheet.tsx` | 1 | – | – | – | – | – | – | – | – | – |
| 2B-3 | `c/assets/asset-register-table.tsx` | – | 2 | 1 | 1 | – | – | – | 1 | 1 | – |
| 2B-4 | `D/assets/[id]/page.tsx` | – | 10 | – | – | – | 1 | – | 15→4 | 3 | – |
| 2B-4 | `D/disposal/[id]/page.tsx` · `D/maintenance/[id]/page.tsx` | – | – | – | – | – | – | – | 2 · 2 | 5 · 5 | – |
| 2B-4 | `D/master-data/employees/[id]/page.tsx` | – | 1 | – | – | – | – | 1 | 5 | – | – |
| 2B-4 | `D/master-data/suppliers/[id]/page.tsx` | – | – | – | – | – | – | 1 | 1 | 4 | – |
| 2B-4 | `D/my-assets/[id]/page.tsx` | – | – | – | – | – | – | – | 1 | – | – |
| 2B-4 | `c/master-data/supplier-purchase-documents.tsx` | – | – | – | – | – | – | 2 | 2 | 2 | – |
| 2B-5 | `D/admin/approvals/page.tsx` · `D/admin/roles/page.tsx` | – | – | – | – | – | – | – | 1 · 1 | – | – |
| 2B-5 | `D/admin/logs/page.tsx` | – | 1 | – | – | – | – | – | – | – | – |
| 2B-5 | `D/admin/storage/page.tsx` | – | 11 | – | 2 | – | – | 7 | 1 | – | – |
| 2B-5 | `D/my-assets/page.tsx` | – | 1 | – | – | – | – | – | 2 | – | – |
| 2B-5 | `D/reports/page.tsx` | – | – | – | – | – | – | – | – | 1 | – |
| 2B-5 | `c/reports/report-filter-panel.tsx` | 1 | – | – | – | – | – | – | – | – | – |
| 2B-5 | `c/reports/reports-accounting-view.tsx` | – | – | – | – | – | – | – | – | 9 | – |
| 2B-5 | `c/reports/responsive-report-list.tsx` | – | 1 | – | – | – | – | – | – | – | – |
| — | `c/admin/IntegrationClientManager.tsx` | – | – | – | – | – | – | 3= | – | – | – |
| — | `c/assets/asset-import-preview-panel.tsx` | – | 5= | – | – | – | – | 4= | 2= | – | – |
| — | หน้าพิมพ์ `src/app/[locale]/(print)/asset-management/{checkins,checkouts}/[id]/page.tsx` · `c/asset-operations/operation-document-print.tsx` | – | – | – | – | – | – | – | 2= · 4= · 1= | – | – |
| — | หน้าพิมพ์ `src/app/[locale]/(print)/{disposal,maintenance}/[id]/print/page.tsx` | – | – | – | – | – | – | – | – | 5= · 1= | – |
| — | `D/asset-management/labels/page.tsx` (ข้อมูลป้าย) | – | – | – | – | – | – | – | 4= | – | – |
| — | `c/asset-operations/void-document-banner.tsx` · `c/assets/asset-movement-timeline.tsx` · `c/assets/asset-purchase-documents.tsx` | – | – | – | – | – | – | – | 3= · 2= · 1= (2D) | – | – |
| — | `c/audit/audit-scan-check-form.tsx` · `c/audit/audit-scan-offline-bar.tsx` (ประโยคแปล) · `c/disposal/disposal-batch-form.tsx` (2C) | – | – | – | – | – | – | – | 3= · 1= · 3= | – | – |

หมายเหตุของตาราง:
- **LV2 `D/assets/[id]/page.tsx` เหลือ 4:** อาร์กิวเมนต์ของประโยคแปล `:1198`, `:1200` และสตริงประวัติ `:2462` ×2 (R-n) · อีก 11 จุดเป็น `orNil` / `Nil` (รวม `:2093` ×2, `:2201` ที่คืน `"-"` ให้การ์ดความสัมพันธ์ → คืน `null` แล้วหน้าเขียน `?? <Nil />` ตามข้อ 5.1)
- **LV2 ฟอร์ม 2C** (`system-settings-form` 8 · `checkin-form` 9 · `asset-batch-form` 8 · `asset-component-manager` 3 · `asset-form` 1) และ dialog ทวนของ `audit-finding-review-actions.tsx:218`, `:219`, `:261` คงไว้ · 2B-1 แตะแค่หัวและหัวตาราง (ข้อ 9.2.1) · 2D ทำ
- **LV2 ของ 2B ทุกจุดที่เหลือ** ต้องเป็นหนึ่งในกลุ่มที่ R-n ยอม (หน้าพิมพ์ ป้าย ประโยคแปล) · ถ้าผู้ย้ายเจอจุดที่ไม่ใช่ค่าว่าง (เช่น ตัวคั่น) ให้เพิ่มใน `KEEP` พร้อมเหตุผล ไม่เกินค่าที่ HEAD
- **LT1 `D/assets/[id]/page.tsx` 10** = th `uppercase` ของ 2 ตาราง `:1441-1445`, `:1509-1513` · `D/admin/storage/page.tsx` 11 = th ของ 3 ตาราง
- **LV1 ที่คง 8** = R-f (2C plan 4 commit เดียวกับไฟล์ ถ้าไม่ทันให้ 2D)

#### 9.4.3 ผลรวมหลังแต่ละ plan และ `KEEP`

| guard | HEAD | หลัง 2B-1 | 2B-2 | 2B-3 | 2B-4 | 2B-5 (= KEEP) |
|---|---|---|---|---|---|---|
| LH1 | 60 | 34 | 25 | 24 | 18 | 6 |
| LH2 | 27 | 11 | 7 | 5 | 5 | 0 |
| LB1 | 27 | 12 | 11 (−2 +1) | 11 | 7 (−5 +1) | 7 |
| LP1 | 8 | 8 | 7 | 7 | 4 | 4 |
| LF1 | 10 | 3 | 2 | 1 | 1 | 0 |
| LT1 | 43 | 36 | 36 | 34 | 23 | 7 |
| LT2 | 8 | 2 | 2 | 1 | 1 | 0 |
| LT3 | 16 | 8 | 3 | 2 | 2 | 0 |
| LT4 | 11 | 4 | 1 | 1 | 1 | 0 |
| LT5 | 23 | 9 | 3 | 3 | 2 | 0 |
| LV1 | 44 | 20 | 19 | 19 | 15 | 8 |
| LV2 | 128 | 113 | 98 | 97 | 73 | 68 |
| LV3 | 42 | 42 | 36 | 35 | 16 | 6 |
| LS1 | 30 | 23 | 17 | 17 | 14 | 5 |
| LS2 | 20 | 20 | 20 | 20 | 15 | 0 |
| LK1 | 11 | 11 | 8 | 7 | 1 | 1 |
| LN1 | 13 | 12 | 6 | 5 | 4 | 2 (แผงยี่ห้อ I11) |
| LN2 | 7 | 7 | 7 | 7 | 5 | 1 |
| LR1 | 10 | 0 | 0 | 0 | 0 | 0 |

LV1 ตรงกับข้อ 8.4 ทุก plan (20/8 · 19/7 · 19/7 · 15/4 · 8/3) · ทุกแถวเท่าตาราง C ข้อ 10.4 · LH2, LN1, LN2 ตาม I11 (แผงยี่ห้อคง LN1 2) และ I14 (my-assets ลดใน 2B-5)

```ts
// What may stay after phase 2B, with the reason. 2C plan 4 or 2D empties the rest; phase 2D sets every budget to {}.
const KEEP: Record<string, Record<string, number>> = {
  LH1: {
    "src/app/[locale]/(auth)/login/page.tsx": 1,                // no shell (phase 3 with the login frame)
    [`${C}asset-operations/operation-document-print.tsx`]: 1,   // print page
    [`${C}assets/asset-label-print.tsx`]: 1,                    // print page
    [`${C}audit/audit-scan-header.tsx`]: 1,                     // field scan header, its own variant
    [`${C}assets/asset-scan-search-tool.tsx`]: 1,               // 2C plan 4 moves it onto PageHeader
    [`${C}assets/asset-label-batch-tool.tsx`]: 1,               // 2C plan 4 moves it onto PageHeader
  },
  LB1: {
    [`${C}admin/system-settings-form.tsx`]: 1, [`${C}disposal/disposal-batch-form.tsx`]: 1, // move-out and back-to-edit buttons, not page back
    [`${C}asset-operations/operation-document-print.tsx`]: 1, [`${C}assets/asset-label-print.tsx`]: 1, [`${C}audit/audit-scan-header.tsx`]: 1,
    [`${D}audit/rounds/[id]/page.tsx`]: 1, [`${D}maintenance/[id]/page.tsx`]: 1, // back item of the mobile action bar (O11 owns the bar)
  },
  LP1: { [`${D}assets/[id]/page.tsx`]: 1, [`${D}audit/rounds/[id]/page.tsx`]: 1, [`${D}maintenance/[id]/page.tsx`]: 1, [`${D}disposal/[id]/page.tsx`]: 1 }, // O11, 2C plan 5
  LT1: { [`${C}admin/role-permission-form.tsx`]: 2, [`${C}assets/asset-import-preview-panel.tsx`]: 5 }, // 2C batch 4 (R-e)
  LV1: { [`${C}admin/IntegrationClientManager.tsx`]: 3, [`${C}assets/asset-import-preview-panel.tsx`]: 4, [`${C}assets/asset-label-batch-tool.tsx`]: 1 }, // R-f
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1198, :1200 and the history sentence :2462
    // 2C forms and dialogs (2D) · print pages, label data and translated sentences (R-n)
    [`${C}admin/system-settings-form.tsx`]: 8, [`${C}asset-operations/checkin-form.tsx`]: 9, [`${C}assets/asset-batch-form.tsx`]: 8,
    [`${C}assets/asset-component-manager.tsx`]: 3, [`${C}assets/asset-form.tsx`]: 1, [`${C}assets/asset-label-batch-tool.tsx`]: 6,
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, [`${C}assets/asset-import-preview-panel.tsx`]: 2, [`${C}disposal/disposal-batch-form.tsx`]: 3,
    [`${C}audit/audit-scan-check-form.tsx`]: 3, [`${C}audit/audit-scan-offline-bar.tsx`]: 1, [`${D}asset-management/labels/page.tsx`]: 4,
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4,
    [`${C}asset-operations/operation-document-print.tsx`]: 1, [`${C}asset-operations/void-document-banner.tsx`]: 3,
    [`${C}assets/asset-movement-timeline.tsx`]: 2, [`${C}assets/asset-purchase-documents.tsx`]: 1,
  },
  LV3: { "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1 }, // print, 2D (A/08:305)
  LS1: { [`${C}admin/IntegrationClientManager.tsx`]: 2, [`${C}assets/asset-import-preview-panel.tsx`]: 1, [`${C}admin/system-settings-form.tsx`]: 1, [`${C}disposal/disposal-bulk-approval.tsx`]: 1 },
  LK1: { [`${C}assets/asset-movement-timeline.tsx`]: 1 }, // not in a 2B plan (2D)
  LN1: { [`${D}master-data/brands/page.tsx`]: 2 }, // the brand picker is a vertical list, where aria-current="page" is right (I11)
  LN2: { [`${C}admin/IntegrationClientManager.tsx`]: 1 }, // local StatusBadge :797, 2C plan 4
}
```

`BUDGETS` ที่ 2B-1 งาน 1 เขียน = ค่า HEAD ของตาราง 9.4.1–9.4.2 ทุกแถว (ไฟล์ที่ไม่มีค่าไม่ต้องเขียน) + `LB1` 2 แถว `0→1` · ตัวอย่าง 2 ตัวที่สั้นที่สุด:

```ts
const BUDGETS: Record<string, Record<string, number>> = {
  LT4: { // hand paginations → Pagination
    [`${D}master-data/branches/page.tsx`]: 1, [`${D}master-data/brands/page.tsx`]: 1, [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1, [`${D}master-data/employees/page.tsx`]: 1, [`${D}master-data/locations/page.tsx`]: 1,
    [`${C}master-data/supplier-list-view.tsx`]: 1, // 2B-1
    [`${C}master-data/master-data-layout.tsx`]: 1, // MasterDataPagination, deleted in 2B-5 (R-h)
    [`${D}audit/rounds/[id]/page.tsx`]: 1, [`${C}disposal/disposal-pagination.tsx`]: 1, [`${C}maintenance/maintenance-pagination.tsx`]: 1, // 2B-2
  },
  LR1: { // delete buttons in rows → the ⋯ of RowActions (B5)
    [`${D}master-data/branches/page.tsx`]: 1, [`${D}master-data/brands/page.tsx`]: 2, [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1, [`${D}master-data/departments/page.tsx`]: 1, [`${D}master-data/employees/page.tsx`]: 1,
    [`${D}master-data/locations/page.tsx`]: 1, [`${C}master-data/supplier-list-view.tsx`]: 2,
  },
  // …LH1, LH2, LB1, LP1, LF1, LT1–LT3, LT5, LV1–LV3, LS1, LS2, LK1, LN1, LN2 from §9.4.1–9.4.2
}
```

`D/master-data/brands/page.tsx:311` (ปุ่มลบยี่ห้อในแผงยี่ห้อ ไม่ใช่แถว) ลงเป็น 0 ด้วย: แผงยี่ห้อที่เลือก (`:299-313`) ใช้ `RowActions` `next` = แก้ไขยี่ห้อ + `deleteAction` (I5) · `LR1` ไม่มีแถวใน `KEEP`

### 9.5 ตาราง A: test เดิมที่พังโดยตั้งใจ

แก้ใน commit ที่ทำให้พัง · "ดิบ" = test อ่านไฟล์โดยไม่แปลง CRLF (`crlf09.txt`) · regex ใหม่ในไฟล์ที่ดิบห้ามมี `\n` (ใช้ `\s*`, `[\s\S]*?`) · ชื่อ part ตามข้อ 3 (`DataTable`, `DataTableHead`, `TableEmptyRow`, `PageBackLink`, `TabNav`, `StatStrip`)

| plan | test:บรรทัด | ดิบ | ตอนนี้ยึด | แก้เป็น | เจ้าของ |
|---|---|---|---|---|---|
| 2B-1 | VFG:249-254 | – | ยอดรวม ≤44 | `assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)` (ข้อ 9.2.2) | ข้อ 9 |
| 2B-1 | `breadcrumbs-ui.test.ts:38-40` | – | `/<Breadcrumbs\b[\s\S]*?\/>/g` | `/<Breadcrumbs\b[\s\S]*?\/>\|\bbreadcrumbs=\{\[[\s\S]*?\]\}/g` บนไฟล์ที่ไม่ใช่ `src/components/ui/page-header.tsx` · `:41` 11 และ `:42` 8 คงเดิม · `:55-65` ผ่านต่อ (R-i) | ข้อ 3, 4 |
| 2B-1 | `asset-register-filter-ui.test.ts:112-119` | – | string `compactOnMobile` 3 ตัวใน `master-data-layout.tsx` | อ่าน `ui/page-header.tsx`: string ของ I1 (`compactOnMobile\?: boolean` · `"max-md:text-xl"` · `"max-md:hidden"` · แถว compact `"flex items-center justify-between gap-3 md:items-start md:gap-x-6"`) · `master-data-layout.tsx` ยึดแค่ `compactOnMobile \? "mb-4 md:mb-6" : "mb-6"` (I2 · งาน 3) | ข้อ 3 |
| 2B-1 | `supplier-adaptive-ui.test.ts:58` | ดิบ | `href=\{createHref\}\s+className="[^"]*min-h-11` | งาน primitive: `/href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}/` · งานหน้า suppliers: อ่าน `D/master-data/suppliers/page.tsx` regex เดียวกัน | ข้อ 3, 4 |
| 2B-1 | `supplier-adaptive-ui.test.ts:16`, `:24`, `:29`, `:37-38`, `:46` | ดิบ | `<table` · `min-h-11 min-w-11` · `aria-sort=` · `aria-disabled="true"` + `<span…labels.previous` · `grid-flow-col` | `/<DataTable\b/` · `/min-h-11 (?:min-)?w-11\|<RowActions\b/` · อ่าน `ui/data-table.tsx` `aria-sort=` · `/<Pagination\b/` (span ปิดใช้อยู่ใน `ui/pagination.tsx` ที่ `asset-register-building-blocks-ui:13` ยึดแล้ว) · `/<StatStrip\b/` · `:12-15`, `:17`, `:25`, `:30-31`, `:35-36`, `:42-45`, `:47`, `:51-54` ผ่านต่อ | ข้อ 5 |
| 2B-1 | `master-data-brand-supplier-ui.test.ts:9-10` | ดิบ | `<MasterDataHeader[\s\S]*createHref=\{createModelHref\}` · `createLabel=…` | `/<PageHeader[\s\S]*href=\{createModelHref\}/` · `/\{t\("createModel"\)\}/` · `:11` ผ่านต่อ · `:22`, `:40`, `:44` ผ่านต่อโดยไม่แก้ (แผงยี่ห้อคงรายการแนวตั้ง · ลิงก์นับคง class เดิม I11) | ข้อ 4 |
| 2B-1 | `disposal-route-structure.test.ts:33` | ดิบ | `/ArrowLeft/` ใน `disposal/new` | `/<PageBackLink href=\{returnToHref\}/` | ข้อ 4 |
| 2B-2 | VFG:227-230 | – | R1 `audit/rounds/page.tsx: 1` | `assertWithinBudget(TONE_OPACITY, {})` | ข้อ 9 |
| 2B-2 | `audit-rounds-ux.test.ts:39` | ดิบ | `href=\{filter\.href\}[\s\S]*scroll=\{false\}` | `/<TabNav\b[\s\S]*?scroll=\{false\}/` · `QuickFilterBar` คงเป็นตัวห่อบางของ `TabNav` (I20) จึง `:11`, `:38` ผ่านต่อ · `ui/tab-nav.tsx` ส่ง `scroll` ต่อให้ `Link` (R-g) · ชื่อ test คงความหมาย "preserve scroll position" | ข้อ 5 |
| 2B-2 | `audit-round-result-drilldown.test.ts:138` | ดิบ | `AuditRoundResultPagination` | `/<Pagination\b/` + `doesNotMatch(/function AuditRoundResultPagination/)` | ข้อ 5 |
| 2B-2 | `maintenance-pagination-ui.test.ts:5-14`, `:16-19` | ดิบ | อ่าน `maintenance-pagination.tsx` · `<MaintenancePagination` | อ่าน `D/maintenance/page.tsx`: `buildMaintenancePagination` · `/<Pagination\b/` · ช่วงแถวจาก `pagination.start`/`end`/`total` · `:21-30` (API) ผ่านต่อ | ข้อ 5 |
| 2B-2 | `disposal-route-structure.test.ts:10`, `:18`, `:22-26` | ดิบ | อ่าน `disposal-pagination.tsx` · `<DisposalPagination` · `[25, 50, 100]`, `ChevronLeft/Right`, `aria-current=` | ลบตัวแปร `:10` · `/<Pagination\b/` · `buildDisposalQueryString\(filters, \{ pageSize, page: 1 \}\)` ในหน้า · ไม่มี Chevron (ข้อ 3.21 ตาราง C แบ่งหน้า) · `:12-17`, `:19-21` ผ่านต่อ | ข้อ 5 |
| 2B-2 | `audit-pending-mobile-ux.test.ts:8`, `:15`, `:30` | ดิบ | ชนิด `searchParams` · `hiddenInputs` ตรงตัว · `<table className="min-w-full divide-y divide-border text-sm">` | ชนิดเพิ่ม `page`/`pageSize` · `hiddenInputs` เดิม + ส่วน `pageSize` ตามข้อ 5.9.1 ต่อท้าย (ไม่ลบส่วนเดิม) · `/<DataTable\b/` · `:14`, `:19-20`, `:23`, `:31-34` ผ่านต่อ | ข้อ 5 |
| 2B-2 | `operational-return-navigation.test.ts:54`, `:66`, `:69`, `:81-83` | ดิบ | return href และ `hiddenInputs` ตรงตัวของ rounds, pending, findings | ตามข้อ 5.9.1 (B4: href ตัวเองพา `page`/`pageSize` · ฟอร์มค้นหาส่ง `pageSize`) · regex เดิม + ส่วนใหม่ต่อท้าย ไม่ลบส่วนเดิม · ตลอด 2B-1 ผ่านโดยไม่แก้ (API ของ `MasterDataSearch` คงเดิม I17) | ข้อ 5 |
| 2B-2 | `pm-plans-ui.test.ts:17` | – | `router.push` ไป `/maintenance/pm` ตรงตัว | ตามข้อ 5.14 (`returnHref` + ค่าตั้งต้น) | ข้อ 5 |
| 2B-2 | `disposal-queue-ux.test.ts:43-51` | ดิบ | ตำแหน่ง `<form className="grid grid-cols-1 gap-3 lg:grid-cols-` | `<DisposalFilterForm` ตัวที่ 2 อยู่ใน provider · `:52` ผ่านต่อ | ข้อ 6 |
| 2B-2 | `disposal-bulk-approval.test.ts:92` · `disposal-bulk-execution-ui.test.ts:33` | – · ดิบ | `/min-h-11 min-w-11/` | `/min-h-11 (?:min-)?w-11/` (ผ่านทั้ง label 44 แบบเดิมและแบบทะเบียน `min-h-11 w-11` ข้อ 7.8.3) + `/checkboxVariants\(/` · `execution-ui:31` เป็นของ 2C-3 · `:120` ผ่านต่อ | ข้อ 5 |
| 2B-3 | `asset-register-table-ui.test.ts:13-25`, `:56`, `:125-126`, `:161` · `asset-register-ux.test.ts:99` · `asset-register-filter-ui.test.ts:58-59`, `:69-72`, `:79-82`, `:108` · `asset-register-search-ui.test.ts:26`, `:28` · `dropdown-menus-ui.test.ts:27-38` · `asset-status-help-ui.test.ts:49-51` · `asset-register-view-model.test.ts:164` · VFG:143-148 | ดิบ: `asset-register-ux`, `asset-status-help-ui` | ตามข้อ 7.17 | ตามข้อ 7.17 ที่ปรับด้วยข้อ 10.9 (+ N1–N8) · `asset-register-table-ui:13-25` และ `dropdown-menus-ui:27-38` เขียนใหม่ครั้งเดียว ตรวจพฤติกรรมเดิมที่ `ui/row-actions.tsx` (I5) · `:58-59` (`help={statusHelp}`) และ `asset-status-help-ui:49-51` ตาม `FilterSelect labelAction` (I6) · `:79-82` อ่าน `ui/filter-chips.tsx` (ชิปสูง 36 ไม่ใช่ 32 I7) · `:112-119` แก้แล้วใน 2B-1 งาน 3 (I2) · `asset-register-view-model:164` 1094 → 1116 (I26) | ข้อ 7 |
| 2B-3 | VFG:270 | – | comment `(2B / phase 3)` | `(phase 3, R-q)` · ค่า 1 | ข้อ 7, 8 |
| 2B-4 | `asset-detail-ux.test.ts:27` | ดิบ | `aria-label=\{isAssetScanReturn \? …\}` | `/label=\{isAssetScanReturn \? t\("backToScan"\) : tCommon\("back"\)\}/` | ข้อ 4 |
| 2B-4 | `asset-detail-ux.test.ts:39-40` | ดิบ | `\{currentLocationLabel \|\| "-"\}` · `\{lifecycle\.responsibilityValue \?\? currentCustodianLabel \?\? "-"\}` | `/orNil\(currentLocationLabel\)/` · `/orNil\(lifecycle\.responsibilityValue \?\? currentCustodianLabel\)/` (ค่าใน `meta` ของ `PageHeader` · LV2 ไฟล์นี้ลดตาม) | ข้อ 4, 5 |
| 2B-4 | `asset-detail-ux.test.ts:151-152` | ดิบ | ลิงก์กลับ `cn(buttonVariants({ variant: "outline" }), "min-w-11 px-3")` · `cn(buttonVariants(), "hidden md:inline-flex")` | `/<PageBackLink href=\{returnToHref\}/` · `/cn\(buttonVariants\(\{ size: "md" \}\), "hidden md:inline-flex"\)/` · `:150`, `:153-154` ผ่านต่อ | ข้อ 4 |
| 2B-4 | `disposal-detail-workspace.test.ts:33` | – | `/ArrowLeft/` | `/<PageBackLink href=\{returnToHref\}/` · `:34`, `:36-37`, `:45` ผ่านต่อ (`:35` ของ 2C-5) | ข้อ 4 |
| 2B-4 | `supplier-detail-ui.test.ts:21-23` · `:28-30` | ดิบ | `grid-flow-col` · `overflow-x-auto` · `md:grid-flow-row` · `min-h-11` · `focus-visible:ring-2` · `aria-hidden="true"` | `/<StatStrip\b/` แทน `:21-23` · `:24` ผ่านต่อ · `:28-30` แก้เฉพาะเมื่อ literal หาย: `/<PageBackLink href=\{returnToHref\}/` + `/buttonVariants\(\{ size: "md" \}\)/` | ข้อ 4, 5 |
| 2B-4 | `asset-detail-tabs.test.ts:18` | ดิบ | วิธีจับแท็บที่เลือกในตัวห่อ client | แก้เฉพาะเมื่อ 2B-4 เปลี่ยนวิธีจับแท็บที่เลือก ใน commit นั้น · `:7-17`, `:19-21` ผ่านต่อ (ตัวห่อคงการเลื่อน I9) | ข้อ 4 |
| 2B-5 | VFG:233-254 | – | ตัวกรอง `<th` + interim | test เดียว (ข้อ 9.2.2) | ข้อ 9 |
| 2B-5 | VFG:64, :90 | – | class ของ `MetricCard` | ข้อ 9.2.3 | ข้อ 9 |
| 2B-5 | `storage-archive-ui.test.ts:16` | ดิบ | `/<th[^>]*>\{t\("action"\)\}<\/th>/` | `/<DataTableHead\b[^>]*>\{t\("action"\)\}<\/DataTableHead>/` · `:17-28` ผ่านต่อ | ข้อ 5 |
| 2B-5 | `report-controls-ui.test.ts:5`, `:8-11` | ดิบ | อ่าน `report-active-filters.tsx` | ลบตัวแปรและ test (ไฟล์ถูกลบ) · 44px ไปอยู่ test ใหม่ของข้อ 6 | ข้อ 6 |
| 2B-5 | `report-controls-ui.test.ts:13-17` | ดิบ | ไอคอน `Check` · `aria-current={isActive ? "page" : undefined}` | `report-view-tabs.tsx` มี `/<TabNav\b/` · ตัวบอกที่ไม่ใช่สีคือเส้นใต้ของ `ui/tab-nav.tsx` (`shadow-\[inset_0_-2px_0_var\(--primary\)\]`) · `aria-current` อ่านใน `ui/tab-nav.tsx` · `:19-27` ผ่านต่อ (ข้อ 9.9 ข้อ 11) | ข้อ 5 |
| 2B-5 | `reports-adaptive-ui.test.ts:88` | ดิบ | `/<th/` ใน `responsive-report-list.tsx` | `/<DataTableHead\b/` · `:84-87`, `:89-99` ผ่านต่อ | ข้อ 5 |
| 2B-5 | `reports-adaptive-ui.test.ts:143` | ดิบ | `min-h-11` ใน operations view | แก้เฉพาะเมื่อปุ่มเปลี่ยนเป็น `buttonVariants` (ข้อ 5.6): `/buttonVariants\(\{[^}]*size: "md"/` | ข้อ 5 |

รวม **28 ไฟล์ test** (รวม `asset-detail-tabs` ที่แก้เฉพาะเมื่อจำเป็น I9) · ของส่วนนี้เอง 1 (VFG 6 จุด) · ที่เหลือส่วนเจ้าของเขียน regex ไว้แล้ว ส่วนนี้แค่รวมไว้ที่เดียว

### 9.6 ตาราง D: test ที่ต้องผ่านต่อโดยไม่แก้

เขียนเป็นข้อห้ามใน task ของ plan ที่แตะไฟล์นั้น

| plan | test:บรรทัด → ต้องคง |
|---|---|
| ทุก plan | FMG ทั้งไฟล์ (ข้อ 9.2.4) · `tests/design-tokens-contrast.test.ts` (2A I21) · `tests/dialog-trigger-handles.test.ts` (R-m) · VFG:274-289 · `tests/class-merge.test.ts` · `tests/thai-glossary.test.ts` · `tests/messages-parity.test.ts` · `tests/mobile-field-navigation.test.ts` (2B-4 เพิ่มกรณี ข้อ 4.11) · `tests/disposal-route-structure.test.ts:32` และ `operational-return-navigation.test.ts:42` (`normalizeOperationalReturnTo` ตรงตัว · `returnTo` ปลายทางไม่ทำใน 2B I22) · LFG ทุก commit |
| 2B-1 | `asset-register-building-blocks-ui.test.ts:8-17`, `:42-47` (`Pagination` server · `<nav aria-label` · `aria-disabled` · `min-h-11` · ไม่มี `opacity-`) · `clickable-table-row-navigation.test.ts:6-18` · `asset-batch-form-layout.test.ts:5-60` (ข้อ 9.2.1) · `menu-primitives-ui.test.ts:60-103` · `feedback-states-ui.test.ts:100-125` · `field-primitives.test.ts` · `master-data-return-navigation.test.ts:33-84` · `asset-return-navigation.test.ts:46`, `:56-59` · `master-data-workspace.test.ts:13-23` · `confirm-dialog-ui.test.ts:36` (`useDeleteAction(endpoint)` · `master-data-delete-button.tsx` คงไว้ไม่มีผู้เรียกจนถึง 2D I5) · `master-data-brand-supplier-ui.test.ts:11`, `:22`, `:40`, `:44`, `:80` (I11) · `operational-return-navigation.test.ts:69`, `:83` และ `audit-pending-mobile-ux.test.ts:14-15` (แก้ใน 2B-2 I17) · `supplier-form-ui.test.ts:30-35`, `:53` (`onClick={confirmNavigation}`) · ลิงก์ยกเลิกท้ายฟอร์ม `{branch,brand,category,company,department,employee,location}-form-ui.test.ts` · เมนูข้าง: `dashboard-shell-theme.test.ts:8-31` · `navigation-active.test.ts` (fixture `:44-49` คง) · `permission-aware-navigation.test.ts:18-53` · `settings-tab-persistence-ui.test.ts:5-13` (O7) · `settings-*-ui.test.ts` ของหน้าตั้งค่า |
| 2B-2 | VFG:26-28 · `audit-rounds-ux.test.ts:11`, `:38` (`QuickFilterBar` ตัวห่อบาง I20) · `disposal-bulk-execution-ui.test.ts:20-30`, `:120` · `disposal-bulk-approval.test.ts:78-86` (ลำดับฟังก์ชัน), `:144` · `disposal-queue-ux.test.ts:17-24` (`<details`, `sticky right-0` คงเป็น class ในหน้า), `:27-37`, `:52` · `disposal-route-structure.test.ts:12-17`, `:19-21`, `:107` · `audit-pending-mobile-ux.test.ts:14`, `:19-20` · `audit-round-result-drilldown.test.ts:63` (ลิงก์ค่าตั้งต้นไม่มี `page`) · `maintenance-contrast.test.ts:15-17` · `repair-record-list-ui.test.ts:27` · `html-lang-and-years.test.ts:15`, `:19-23` · `system-log-history.test.ts:21-24` · `audit-finding-resolution.test.ts:7-16`, `:117-131` · `audit-mobile-flow-completion.test.ts:42-48` · `mobile-field-navigation.test.ts:13-35` (route รายการเป็น navigation, GL2) |
| 2B-3 | ตามข้อ 7.17 "ต้องผ่านต่อ" · `sheet-drawers-ui.test.ts:20-30` · VFG:109-112 |
| 2B-4 | `asset-detail-ux.test.ts:32-36` (ย้าย `data-testid` ตามข้อ 4.4.5), `:95`, `:102-111`, `:150`, `:153-154` · `asset-detail-tabs.test.ts:7-17`, `:19-21` (`:18` ตาราง A ถ้าวิธีจับแท็บเปลี่ยน I9) · VFG:114 · `page-loading-skeleton.test.ts:10-33` · `loading-boundaries.test.ts:5-32` (ชื่อ skeleton คงเดิม · ถ้าข้อ 4.7 เปลี่ยน `MetricGridSkeleton` ให้แก้ `:25` ใน commit นั้น) · `operational-return-navigation.test.ts:28-30`, `:43-45` (`href={returnToHref}` ยังอยู่ใน `<PageBackLink href={returnToHref}`) · `disposal-detail-workspace.test.ts:36`, `:44-48` · `visual-consistency-ui.test.ts:23-34` |
| 2B-5 | `design-system.test.ts:25-46` (`getTableShellClasses`, `getEmptyStateClasses`, `getMetricCardToneClasses`, `getActionButtonClasses` คงไว้ให้ 2D ลบ) · `reports-adaptive-ui.test.ts:13-27` (ข้อ 6 ตาราง C · รวม `:24-26` I18), `:84-87`, `:89-99` · `report-controls-ui.test.ts:19-27` · `my-assets-route-ui.test.ts:27-45` · `system-log-history.test.ts:77` · `storage-archive-ui.test.ts:17-28` · `visual-consistency-ui.test.ts:36-42` |

**test ที่อ่านไฟล์ CRLF ดิบ (136 ไฟล์ · `crlf09.txt`):** working tree เป็น CRLF (`core.autocrlf=true`) · regex ที่มี `\n` ในไฟล์เหล่านี้จะไม่ตรง · ไฟล์ที่ 2B แก้หรือเพิ่ม assert และอ่านดิบ: `asset-detail-tabs` · `asset-detail-ux` · `asset-register-ux` · `asset-return-navigation` · `asset-status-help-ui` · `audit-pending-mobile-ux` · `audit-round-result-drilldown` · `audit-rounds-ux` · `dashboard-shell-theme` · `disposal-bulk-execution-ui` · `disposal-queue-ux` · `disposal-route-structure` · `loading-boundaries` · `maintenance-pagination-ui` · `master-data-brand-supplier-ui` · `master-data-return-navigation` · `operational-return-navigation` · `page-loading-skeleton` · `permission-aware-navigation` · `report-controls-ui` · `reports-adaptive-ui` · `storage-archive-ui` · `supplier-adaptive-ui` · `supplier-detail-ui` · `supplier-form-ui` (`tests/` ทุกไฟล์) · กติกา: assert ใหม่ในไฟล์เหล่านี้ไม่มี `\n` (ใช้ `\s*`, `\s+`, `[\s\S]*?`) · class negated `[^"\n]` เดิมใช้ได้ · ไฟล์ test ใหม่ทุกไฟล์อ่านผ่าน `readSourceFiles` หรือ `.replace(/\r\n/g, "\n")`

**pin ที่ formatter ทำพังได้** (repo ไม่มี prettier · เสี่ยงจาก format-on-save): `asset-batch-form-layout.test.ts:8-59` (ลำดับ string) · VFG:26-28 (2 attribute ติดกัน) · `disposal-bulk-approval.test.ts:84-86` (ตัดตามชื่อฟังก์ชัน) · `audit-rounds-ux.test.ts:39` (`href` ก่อน `scroll` จนถึง 2B-2 · หลังนั้น `<TabNav` ก่อน `scroll` I20) · `operational-return-navigation.test.ts:69`, `:83` (`hiddenInputs` ตรงตัว) · `asset-detail-ux.test.ts:151-152` (string ใน `cn(…)`) · ห้ามรัน formatter และดู `git diff --stat` ทุก commit (DH:385)

### 9.7 test ใหม่ต่อ primitive

| ของ / เรื่อง | ไฟล์ test | ตรวจ (ย่อ) | เจ้าของเนื้อ | plan |
|---|---|---|---|---|
| guard ทั้งหมดของ 2B | **`tests/list-frame-guards.test.ts`** (ใหม่) | L… ข้อ 9.3 · test ตัวอย่าง · L0 | ข้อ 9 | 2B-1 งาน 1 → ลดทุก commit → ล็อก 2B-5 |
| `PageHeader` · `PageBackLink` · `MasterDataHeader` ตัวห่อ | `tests/list-primitives-ui.test.ts` (ใหม่) "หัวหน้า" | server-safe · ไม่มี hook · string ของ I1 (h1 `"text-2xl font-semibold text-balance break-words text-foreground"` · crumbs `mb-1` จุดเดียว · `meta` · แถวสลับที่ `md`) · ปุ่มกลับ `cn(buttonVariants({ variant: "outline", size: "md" }), "min-w-11 max-md:px-0", className)` + `<span className="max-md:sr-only">` · `ArrowLeft aria-hidden` · `data-slot="page-back-link"` · `MasterDataHeader` ส่ง `meta={subtitle}` (I2) | ข้อ 3.21 (รวม `page-header-ui` ของข้อ 4.11 ไว้ที่นี่) | 2B-1 |
| `DataTable` ทุก part · `TableEmptyRow` · `DataTableScrollArea` · `ClickableTableRow` `group/row` | เดียวกัน "ตาราง" | ค่าคงที่ class 3 ตัว · ไม่มี `density`, `data-density`, `group-data-[density` (I3) · `aria-sort` · `scope="col"` · `<caption className="sr-only">` · `EmptyNote padded` ใน `td.p-0` · `ResizeObserver` | ข้อ 3.21 | 2B-1 |
| `Pagination` | เดียวกัน "แบ่งหน้า" + `asset-register-building-blocks-ui:8-17` คง | `aria-live="polite"` · `outline sm` · `rel` · ไม่มี Chevron, `bg-muted` · key ช่วงแถว | ข้อ 3.21 | 2B-1 |
| `FilterSelect` · `FilterChipList` | เดียวกัน "ตัวกรอง" | `FilterSelect` ตาม API ข้อ 6.3.1 (`Field` + `NativeSelect` · `fieldSize` ค่าตั้งต้น `lg` · `allLabel` I6) · ชิป `ui/filter-chips.tsx` (I7): `min-h-11` + `md:h-9 md:min-h-0` (36) · `` aria-label={`${removeLabel}: ${chip.label}`} `` · `focus-visible:ring-offset-2` · ข้อ 6.13 ตาราง B ข้อ 1, 3 (I16) | ข้อ 3.21 · ข้อ 6.13 | 2B-1 |
| `FilterFormActions` · การใช้ในหน้า | `tests/list-filters-ui.test.ts` (ใหม่) | ข้อ 6.13 ตาราง B ข้อ 2, 5–8 · ข้อ 1, 3, 4 อยู่ `list-primitives-ui` (I16) | ข้อ 6 | 2B-1 → 2B-5 |
| `RowActions` ช1 | `tests/row-actions-ui.test.ts` (ใหม่) | `"use client"` · `data-no-row-click` 3 จุด · `ghost icon-sm` · `rowNextClasses` · ช่องว่าง 120 · `unavailable` · `useDeleteAction` คืนโฟกัส · API ข้อ 3.11 ตัวเดียว ไม่มี children, `triggerRef`, `contentClassName` · หัว sheet `<span className="tag font-medium">{code}</span>` (I5) | ข้อ 3.21 | 2B-1 |
| `TabNav` · `StatStrip` · `KeyValueList` · `ContentPanel` · `MasterDataSearch` | `tests/list-primitives-ui.test.ts` | ตามข้อ 3.21 ตาราง C แถว แท็บ (มี `{...navProps}` บน `<nav` · `linkClassName` · ไม่มี `fullBleed` I9) · ตัวเลข · ค่า · แผง · ค้นหา (markup ข้อ 6.3.5 · `aria-label={submitLabel}` I8 · ข้อ 6.13 ตาราง B ข้อ 4) | ข้อ 3.21 | 2B-1 |
| เมนูข้าง (B1) | `tests/sidebar-menu-structure.test.ts` (ใหม่) | รายการแรก `/assets` · ลำดับหมวด · ลึก ≤2 · ไอคอน 39 ชื่อไม่ซ้ำ · ไม่มี `assetRegistryGroup` | ข้อ 4.11 | 2B-1 |
| ตัวช่วยแบ่งหน้า (B4) | `tests/list-pagination.test.ts` (ใหม่) | `parseListPage` · `listPageWindow` · `lastListPage` · `appendListPage` · `planStatePageSlices` | ข้อ 5.14 | 2B-1, 2B-2 |
| การใช้ในหน้ารายการ | `tests/list-pages-ui.test.ts` (ใหม่) | เฉพาะข้อ "มี": `<DataTable` · B4 `parseListPage` และไม่มี `take: \d+` · `<RowActions` ของข้อมูลหลัก (หน้าเรียกตรง ไม่มี `MasterDataRowActions` I5, I16) · `<TabNav` ของ logs, approvals, history (LN1 มองไม่เห็น) และ work-center (I10) · ข้อ "ไม่มี" ย้ายมาเป็น L… | ข้อ 5.14 | 2B-1 → 2B-5 |
| ประวัติการอนุมัติ (B4) | `tests/approval-decision-log.test.ts` | where ตามสิทธิ์ · ตัวนับเท่ากับของเดิม | ข้อ 5.14 | 2B-5 |
| ทะเบียน | ไฟล์ test เดิมของทะเบียน (N1–N8) | ข้อ 7.17 | ข้อ 7 | 2B-3 |

primitive ใหม่ทุกตัวต้องผ่าน LFG ด้วย 0 ตั้งแต่วันแรก ยกเว้นข้อที่ข้ามไฟล์ของตัวเอง (ข้อ 9.3.2) · server-safe และกติกา class ร่วม (ไม่มี `shadow-sm…`, `opacity-`, `uppercase`, `bg-muted/`) อยู่ใน `list-primitives-ui` ของข้อ 3 ไม่ซ้ำใน LFG

### 9.8 ลำดับใน commit และการรัน

- ทุก commit ผ่าน `npm test` และ tsc · งานท้ายของ plan รัน `npm run verify` + production build (กฎทุก plan ใน `00-decisions.md`)
- **2B-1 งาน 1:** VFG R7 รายไฟล์ (`TABLE_HEADER_FILLS` 31 แถว) · สร้าง LFG: `BUDGETS` = ค่า HEAD ของข้อ 9.4 + LB1 2 แถว `0→1` · `KEEP` ตามข้อ 9.4.3 · `MIGRATED_LIST_FILES = []` · test ตัวอย่าง · ถ้า `master` ไม่ใช่ `d38a0ee` ให้รัน `work/09/count09.mjs` ก่อนเชื่อตัวเลข
- **commit ที่ย้ายไฟล์:** ย้าย → แก้ test ของไฟล์ตามตาราง A → ลดแถวของไฟล์ในทุก budget ทั้ง VFG และ LFG (ลบแถวที่เป็น 0 · แถวที่เหลือ = `KEEP`) → ถ้า 2B ไม่แตะไฟล์นี้อีก เพิ่ม path ใน `MIGRATED_LIST_FILES` · ไฟล์ที่ plan หลังยังแตะ (`master-data-layout.tsx` ถึง 2B-5 · `D/audit/rounds/[id]/page.tsx` ส่วนรายการ) เพิ่มใน plan สุดท้ายที่แตะ
- **2B-2:** commit ของ `D/audit/rounds/page.tsx` ทำ R1 `{}`
- **2B-3:** comment VFG:270
- **2B-5 งานล็อก (งานท้ายก่อน verify):** VFG R7 test เดียว (ข้อ 9.2.2) · `BUDGETS` ทุกตัวเท่ากับ `KEEP` · เพิ่ม test "L9 every 2B budget equals KEEP, so phase 2D only empties KEEP" (`assert.deepEqual(BUDGETS, KEEP)` หลังตัดตัวที่ว่าง) · `MIGRATED_LIST_FILES` มีทุกไฟล์ของ 2B ที่มีค่าที่ HEAD (ตรวจด้วย L0) · ถ้า 2C-4 merge แล้วและลดค่าของไฟล์ชุด 4 ใช้ค่าที่ต่ำกว่าทั้งใน VFG และ `KEEP`
- **คู่ที่ทำพร้อมกัน (B7):** LFG เป็นของ 2B คนเดียว · 2C ไม่แก้ (ถ้าแก้ ลดได้อย่างเดียว) · VFG และ `DESIGN.md` rebase แล้วใช้ค่าต่ำกว่าของแต่ละแถว
- **review:** diff ของ LFG ลดเฉพาะแถวของไฟล์ใน commit นั้น · ค่าใหม่ตรงกับคอลัมน์ในข้อ 9.4 · `0→1` มีแค่ 2 แถว

### 9.9 ข้อที่ส่วนอื่นเขียนต่างกัน (ส่วนนี้เลือกให้ guard และ test)

| # | เรื่อง | ต่างกันอย่างไร | ส่วนนี้ใช้ |
|---|---|---|---|
| 1 | ที่อยู่ของ guard | ข้อ 4.11 `page-frame-guards.test.ts` G1–G4 (2B-4, 2B-5) · ข้อ 5.14 ข้อ "ไม่มี" ใน `list-pages-ui` · ข้อ 6.13 ข้อ 9 ใน `list-filters-ui` | ไฟล์เดียว LFG ตั้งแต่ 2B-1 · เป็น budget ที่ลดทีละ commit ไม่ใช่ล็อกท้าย plan · ข้อ "มี" อยู่ที่เดิม |
| 2 | ชื่อปุ่มกลับ | ข้อ 3.3 `PageBackLink` · ข้อ 4.3.1 และ regex ข้อ 4.11 `BackLink` | `PageBackLink` (I1: `back?: ReactNode` · `label` บังคับ ไม่มี hook) · regex ของข้อ 4 เปลี่ยนเป็น `<PageBackLink href=…` · ทั้งสองแบบยังเขียน `href={returnToHref}` ตรงตัว จึง pin `href=\{returnToHref\}` 6 จุดผ่านต่อ (`asset-return-navigation:46` · `master-data-return-navigation:81` · `operational-return-navigation:29`, `:44`, `:68` · `disposal-detail-workspace:36`) |
| 3 | ไฟล์ชิปตัวกรอง | ข้อ 3.10 `ui/filter-chips.tsx` · ข้อ 6.3.3 `ui/filter-chip-list.tsx` | ไฟล์ `ui/filter-chips.tsx` · export `FilterChipList` · type `FilterChipItem` · props และ markup ตามข้อ 6.3.3 + `focus-visible:ring-offset-2` (I7) · ไม่มี guard ขึ้นกับชื่อนี้ |
| 4 | test ของ `PageHeader`, `FilterSelect`, `MasterDataSearch` | ข้อ 3.21 ใน `list-primitives-ui` · ข้อ 4.11 `page-header-ui` · ข้อ 6.13 `list-filters-ui` ข้อ 1–4 | string ของ primitive อยู่ `list-primitives-ui` ที่เดียว · ข้อ 4 และ 6 เก็บแค่การใช้ในหน้า |
| 5 | data-quality, integrations | ข้อ 4.4.6 วาง 2B-5 · ข้อ 8 (`s8-plans.mjs`) วาง 2B-2 | 2B-2 ตามข้อ 8 (2C-4 แตะหน้า data-quality · 2C-5 แตะหน้า integrations · B7 ห้ามไฟล์ร่วมในคู่) |
| 6 | R7 หลัง 2B-2 | synthesis 18 · ข้อ 8 17 | 17 (ผลของข้อ 5) |
| 7 | h1 ของฟอร์ม 8 ไฟล์ที่ไม่มีปุ่มกลับ | ข้อ 8.13 ข้อ 3: เปลี่ยน class อย่างเดียวใน 2B-1 รวม `asset-scan-search-tool`, `asset-label-batch-tool` · ข้อ 4.4.3/4.4.6/4.4.7: `PageHeader` ใน 2B-2 (`audit-round-form`), 2B-5 (5 ไฟล์), 2C-4 (2 เครื่องมือ) | **6 ไฟล์ใช้ `PageHeader` ใน 2B-1** (แตะครั้งเดียว ไม่มี plan ของ 2C ทำคู่ ตรงกับรายการไฟล์ของข้อ 8) · **2 เครื่องมือชุด 4 ไม่แตะ** (รั้ว synthesis ข้อ 2 ยอมแค่ O16 ของ `admin-user-form`, `role-permission-form`) → 2C plan 4 |
| 8 | `operational-return-navigation:69`, `:83` | ข้อ 8.15 "ต้องผ่านต่อ" · ข้อ 5.14 "แก้" (B4 ส่ง `pageSize`) | ไม่ขัดกัน คนละ plan (I17): 2B-1 ผ่านโดยไม่แก้ · 2B-2 แก้ตามข้อ 5 · regex เดิม + ส่วนใหม่ต่อท้าย |
| 9 | `reports-adaptive-ui:24-26` | ข้อ 5.14 "แก้" · ข้อ 6.13 ตาราง C "ต้องคง" | คง (ข้อ 6 ถือแผงตัวกรอง) |
| 10 | checkbox 44 ของ bulk | synthesis 5.1 "พัง" (O4) | `/min-h-11 (?:min-)?w-11/` ผ่านทั้งสองแบบ |
| 11 | แท็บที่เลื่อนเองบนมือถือ (`asset-detail-tabs`, `report-view-tabs`) | ข้อ 3.12 `TabNav` server-safe · test ยึด `"use client"`, `scrollIntoView`, snap, ตัวบอกเลื่อน | ไฟล์ห่อคงเป็น client ถือการเลื่อนและตัวบอกเลื่อน แล้วส่ง items, `ref`/`onScroll`/`style` และ `linkClassName="snap-start"` ให้ `TabNav` (I9) · `asset-detail-tabs.test.ts:13-20`, VFG:114, `report-controls-ui.test.ts:19-27` ผ่านต่อ · ถ้า 2B-4 เปลี่ยนวิธีจับแท็บที่เลือก `asset-detail-tabs.test.ts:18` แก้ใน commit นั้น |
| 12 | `MetricCard` กลาง | ข้อ 3.13 / 5.6 "pin VFG:64, :90 แก้ตอนนั้น" ไม่บอกว่าแก้เป็นอะไร | ลบ `c/ui/metric-card.tsx` ใน 2B-5 · VFG ยึด `stat-strip.tsx` (ข้อ 9.2.3) |
| 13 | จำนวนลิงก์ปิดใช้แบบจาง | 2A 20 · ข้อ 5.1 22 | 23 (+ `D/assets/[id]/page.tsx:1797`) |

### 9.10 ความเสี่ยง

1. **ตัวอ่าน JSX ไม่ใช่ parser** · ใช้ตัวเดียวกับ FMG ที่ผ่าน test ตัวอย่างแล้ว · ถ้า guard แจ้งผิด แก้ตัวนับพร้อมเพิ่มกรณีใน test ตัวอย่าง ไม่เพิ่ม budget
2. **guard ตามชื่อหลบได้** (LS1, LK1, LN2, LT2, LT4) · ตัวช่วยประจำไฟล์ชื่อใหม่ผ่าน guard · reviewer ดู diff · LT1, LT5, LV1–LV3 จับ markup แม้ย้ายไฟล์
3. **LN1 ไม่เห็นแถวลิงก์ที่ไม่มี `aria-current`** (logs, approvals ×2) · ต้องมี assert `<TabNav` ใน `list-pages-ui` (ข้อ 9.7)
4. **LV2 นับ `: "-"` ที่ไม่ใช่ค่าว่างด้วย** · ผู้ย้ายต้องแยก · ใส่ `KEEP` พร้อมเหตุผลได้ แต่ไม่เกินค่าที่ HEAD
5. **ตัวเลขต่อ plan ผูกกับรายการไฟล์ของข้อ 8** · ถ้าข้อ 8 ย้ายไฟล์ ตัวเลขกลางทางเลื่อน แต่ `KEEP` เท่าเดิม · งาน 0 ทุก plan รัน `count09.mjs` ใหม่
6. **VFG แก้คู่กับ 2C** · rebase ชนใน object budget · ใช้ค่าต่ำกว่าของแต่ละแถว
7. **test 136 ไฟล์อ่าน CRLF ดิบ** · assert ใหม่ที่มี `\n` ผ่านบนเครื่อง LF แต่พังบนเครื่องนี้ · ใส่ในข้อจำกัดของ task ทุกตัว
8. **budget ลดด้วยมือ** · ลืมลดหรือลดผิดไฟล์ · L0 จับไฟล์ที่ประกาศว่าย้ายแล้ว · ไฟล์ที่ยังไม่ประกาศพึ่ง review จนงานล็อก 2B-5
9. **ไม่ได้รันใน `node --test`** · ลองด้วย `.mjs` เท่านั้น · type stripping ของ Node 24 ห้าม enum และ parameter property · ต้องรันจริงในงาน 1 ของ 2B-1
10. **2D ต้องตั้ง `KEEP` เป็น `{}`** และย้ายตัวนับที่ยังมีค่าไปทั้ง `src` · ถ้าไม่ทำ 68 จุดของ LV2 และของชุด 4 ค้างถาวร

### 9.11 เอกสาร

| ที่ | แก้ | plan |
|---|---|---|
| `DESIGN.md:498` | "Table-header fills (`bg-muted/NN`, 44 sites) move to the shared DataTable in phase 2B." → 2B-1: "…budget per file (`TABLE_HEADER_FILLS`); the commit that moves a table deletes its row" · 2B-5: "Table headers are white with no fill and no capitals (B3); 3 fills remain in 2C batch 4 files until 2C plan 4 or 2D." | 2B-1, 2B-5 |
| `DESIGN.md` Data Tables (ต่อจาก :498) | กติกาที่มี guard ใส่ "(guard)" แบบ DS:294, :419, :446: หัวตารางไม่มีพื้นและตัวพิมพ์ใหญ่ · หัวเรียงลำดับมี `aria-sort` · แถวว่างคือ `TableEmptyRow` · แบ่งหน้าคือ `Pagination` · ไม่ปิดใช้ด้วยความจาง · ค่าว่างคือ `Nil` · ตัวเลขคือ `formatCount`/`formatMoney` | 2B-1 |
| `DEVELOPER_HANDOFF.md:321` | R7 "table-header fills at most 44" → budget รายไฟล์ (2B-1) → 3 แถว (2B-5) · R2 "12 in 10 files" เป็นค่าเก่า → 10 ใน 9 · R1 → `{}` (2B-2) | 2B-1, 2B-2, 2B-5 |
| `DEVELOPER_HANDOFF.md` (ส่วน 2B ใหม่ แบบ DH:380-385) | bullet **Guard file `tests/list-frame-guards.test.ts`**: ID L… · commit ที่ย้ายไฟล์ลดแถวและเพิ่ม `MIGRATED_LIST_FILES` · `KEEP` คือของที่ยอมให้เหลือ · 2C ไม่ต้องแก้ · 2D ตั้ง `{}` · assert ใหม่ในไฟล์ที่อ่าน CRLF ดิบไม่มี `\n` · ตัวเลขที่ต่ำกว่า budget ของ FMG ให้ 2C ลด (ข้อ 9.2.4) | 2B-1 · ทุก plan อัปเดตตัวเลข |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:82` | เพิ่ม `tests/list-frame-guards.test.ts` (หน้ารายการและโครงหน้า) ต่อจาก FMG | 2B-1 |
| `docs/99_CHANGELOG.md` | บรรทัด **guard** ต่อ plan: ตัวเลขของ VFG และ L… หลัง plan (ตาราง 9.4.3) · 2B-1 "guard ใหม่ `tests/list-frame-guards.test.ts`" แบบ `docs/99_CHANGELOG.md:48` | ทุก plan |
| wiki `AssetSystem/` | `ams-log.md` 1 บรรทัดต่อ plan · ถ้ามีหน้าที่อธิบาย guard ของ UI ให้เพิ่ม LFG ตาม schema · รัน `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` ที่ `D:\Obsidian\Eltross` | ทุก plan |
| `.impeccable/design.json` | ไม่มี | — |

### 9.12 test

**ใหม่**
- `tests/list-frame-guards.test.ts` · L… 19 ข้อ + L0 + test ตัวอย่าง (ข้อ 9.3) · 2B-1 งาน 1 · ลดทุก commit · 2B-5 เพิ่ม L9 และล็อก
- ไฟล์ test ใหม่ของส่วนอื่นตามข้อ 9.7 (ส่วนนี้แค่วางที่อยู่)

**แก้ (ของส่วนนี้)**
- VFG:249-254 → budget รายไฟล์ (2B-1) · VFG:227-230 → `{}` (2B-2) · VFG:270 comment (2B-3) · VFG:233-254 รวมเป็น test เดียวไม่มีตัวกรอง `<th` (2B-5) · VFG:64, :90 → `stat-strip.tsx` (2B-5) · import `existsSync` ใน VFG:2 (2B-5)
- test เดิมของหน้าและ primitive ตามตาราง A (ข้อ 9.5) แก้ใน commit ที่ทำให้พัง

**ต้องผ่านต่อโดยไม่แก้**
- ตาราง D (ข้อ 9.6) · FMG ทั้งไฟล์ · `tests/design-tokens-contrast.test.ts`

**รันทุก plan:** `npm test` ทุก commit · `npm run verify` + production build ท้าย plan · ตัวเลขของ VFG และ L… หลัง plan ลง DH และ changelog
