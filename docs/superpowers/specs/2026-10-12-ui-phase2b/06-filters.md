> ร่างส่วนนี้ของสเปก 2B · ข้อตัดสินของผู้ใช้ B1–B10 (`2026-10-12-ui-phase2b/00-decisions.md`) และ R-a…R-s (`2026-10-12-ui-phase2b/00-synthesis.md` ข้อ 1.1) ใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน · ตัวเลขและบรรทัดอ้างที่ `master` `d38a0ee`

## 6. ตัวกรองและการค้นหา

ส่วนนี้ย้ายช่องกรองของหน้ารายการไปใช้ช่องกรอกกลางของ 2A (`Field`, `NativeSelect`, `Input`, `SearchField`) และสร้างของกลาง 3 ชิ้นที่หลายหน้าใช้ซ้ำ:

- `FilterSelect` แทน `FilterSelect` ประจำไฟล์ 7 ตัว · `ReportSelect` · `Filter` ของ data-quality (O3) · `LabeledSelect` และ select ของทะเบียน (ข้อ 7)
- `FilterFormActions` ปุ่ม "กรอง" กับ "ล้างตัวกรอง" ของฟอร์มกรอง
- `FilterChipList` ชิปตัวกรองที่ใช้อยู่ (ผู้ใช้แรกของ `linkVariants`, A/04:113)

และกำหนด 3 เรื่องที่ใช้ทุกหน้า: แบบแถบเครื่องมือตาม B3(4) · กติกาฟอร์มกรองแบบ GET · กติกาค้นหาฝั่ง client (IME, debounce)

**ไม่อยู่ในส่วนนี้ (อ้างถึงเท่านั้น):**

| เรื่อง | เจ้าของ |
|---|---|
| ตัวกรองของทะเบียน: toolbar, ช่องค้นหา, sheet, แท็บสถานะ, ชิป | ข้อ 7 (2B-3) · ใช้ของกลางของข้อนี้ (ข้อ 6.6) |
| ลิงก์ตัวกรองด่วนและแท็บที่มีตัวนับ: logs `D/admin/logs/page.tsx:64-80` · findings `D/audit/findings/page.tsx:270-284` · rounds `QuickFilterBar` `D/audit/rounds/page.tsx:565-606` · approvals `FilterChip` `D/admin/approvals/page.tsx:185` · history `D/admin/approvals/history/page.tsx:182` · disposal แท็บขั้น `D/disposal/page.tsx:332-341` | ส่วน `TabNav` |
| แผงเลือกยี่ห้อ `D/master-data/brands/page.tsx:232-315` | ข้อ 5.3 · คงรายการลิงก์แนวตั้ง `aria-current="page"` ไม่ใช่ `TabNav` (I11) |
| กล่องตัวเลขที่เป็นลิงก์ตัวกรอง (`SummaryTile` ข้อมูลหลัก, `ResolutionMetric` findings, `DashboardCard` rounds/[id]) | ส่วน `StatStrip` |
| ปุ่ม "ล้างตัวกรอง" ในแถวว่าง (`ActionEmptyState actionVariant="secondary"`) | ส่วนแถวว่าง · ใช้ `hasActiveFilters` ที่ข้อนี้กำหนด (ข้อ 6.4) |
| hidden `pageSize` ของหน้าที่ B4 เพิ่มการแบ่งหน้า | ส่วนแบ่งหน้า · กติกาอยู่ที่ข้อ 6.4 |
| ปุ่มในหัวแผงรายการ (ส่งออก · โหมดเลือก): disposal `:321-330` · findings `:247-268` · maintenance `:207-216` · rounds/[id] `:607-628` | ส่วนปุ่ม · ใช้ขนาดแถบเครื่องมือของข้อ 6.3.4 |
| `FilterPanelSkeleton` (`c/ui/page-skeleton.tsx:63-80`) | ส่วน skeleton (2B-4) ต้องตามความสูงใหม่ของข้อ 6.9 |
| `ActionButton` ที่เหลือใน `c/admin/asset-state-review-workspace.tsx` (`:141`, `:187`, `:189`, `:235`) | ส่วนปุ่ม / ส่วนแบ่งหน้า (2B-2, I12) |
| รั้ว: `audit-scan-search.tsx:51` · `audit-scan-room-picker.tsx:75` · `global-search.tsx:133` (O20) · `QueueSelect` ของ `asset-label-batch-tool.tsx:401-436` (O19) · `report-preset-controls.tsx` · `asset-state-review-dialog.tsx` (2C ชุด 4) | ไม่แตะ |

path ย่อ: `D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/` · ตัวย่อเอกสาร (A, A/0N, C, C/0N, DS, DH, VFG, FMG, MK, M01–M05) ตาม `00-synthesis.md` บรรทัด 5

**ตรวจแล้ว (read-only):**
- อ่านโค้ดทุกบรรทัดที่อ้างที่ `d38a0ee`
- นับด้วย `p2b-spec/work/s06-count.mjs`: tag `<input`, `<select`, `<textarea` ต่อบรรทัดใน 17 ไฟล์ ไม่นับ `type="hidden"` · นับจุดเรียกด้วย `<FilterSelect\b`, `<ReportSelect\b`, `<LabeledSelect\b`, `<Filter\b` · บรรทัดของฟอร์มด้วย `p2b-spec/work/s06-lines.mjs`
- นับ class ของป้ายด้วย grep ทั้ง `src`
- ไม่ได้คอมไพล์ Tailwind: class ใหม่ทุกตัวเป็น utility มาตรฐานบน token ที่มีแล้ว (`primary-soft`, `primary-border`, `primary-hover`, `text-meta`, `rounded-control`) ไม่มี token ใหม่ (A:120 I21) · ไม่มี `/NN` (R1) · ไม่มี `shadow-*` (R2) · ไม่มี `flex-col-reverse` (GD4)

### 6.1 สภาพตอนนี้

| เรื่อง | ที่ HEAD | นับอย่างไร |
|---|---|---|
| ช่องกรองฝั่ง server | **33 element ใน 12 ไฟล์** เท่ากับตัวเลขของ 2A ที่ `081d538` (A:65) · แสดง **55 ช่อง** (ตัดจำหน่ายมี 2 ชุดสลับตามขนาดจอ นับชุดเดียว · ใน DOM มี 60) | `s06-count.mjs` · ช่องที่แสดง = ช่องค้นหา + จุดเรียก `FilterSelect` / `ReportSelect` + `MasterDataSearch` 6 จุด |
| `FilterSelect` ประจำไฟล์ | 7 ตัว · 3 แบบ (options · options + `allLabel` · children) · เรียก 24 จุด | `^function FilterSelect` · `<FilterSelect\b` |
| `ReportSelect` | `c/reports/report-filter-panel.tsx:90-116` · เรียก 6 จุด `:68-73` · ไม่มี `select-chevron` | grep |
| `MasterDataSearch` | `c/master-data/master-data-layout.tsx:42-80` · การ์ด `:56` · ช่องดิบ `:63-69` (ไม่มีชื่อนอกจาก placeholder) · ปุ่ม `:71-76` · เรียก 6 จุด: `D/admin/users/page.tsx:80` · `D/audit/findings/page.tsx:239` · `D/audit/rounds/page.tsx:327` · `D/audit/rounds/[id]/page.tsx:632` · `D/audit/rounds/[id]/pending/page.tsx:148` · `D/master-data/departments/page.tsx:66` | `<MasterDataSearch` |
| `Filter` (O3) | `c/admin/asset-state-review-workspace.tsx:238-240` · เรียก 3 จุด `:149`, `:152`, `:155` · `h-11` ทุกขนาดจอ · ฝั่ง client | grep |
| ทะเบียน (ข้อ 7) | select 3 `c/assets/asset-register-toolbar.tsx:41`, `:53`, `:65` · ช่องค้นหา `c/assets/asset-register-search-field.tsx:77` · `LabeledSelect` `c/assets/asset-register-filter-sheet.tsx:194-225` เรียก 7 จุด | `s06-count.mjs` |
| ป้ายช่องกรอง | **2 แบบ:** `space-y-1 text-sm font-medium text-foreground` 14 บรรทัดใน 7 หน้าข้อมูลหลัก · `mb-1.5 block text-xs font-medium text-muted-foreground` 18 บรรทัดใน 4 ไฟล์ (logs 2 · disposal 10 · maintenance 4 · report 2) และอีก 1 ใน `audit-scan-room-picker.tsx` (O20 ไม่แตะ) · O3 ใช้ `text-sm font-medium text-foreground` + `mt-1` | grep class string |
| ความสูงช่อง | `h-10` ทุกจอ (ข้อมูลหลัก 6 หน้า · logs · `MasterDataSearch` · disposal จอใหญ่) → บนมือถือ 40 ต่ำกว่า 44 · `h-11` / `min-h-11` ทุกจอ (maintenance · suppliers · disposal มือถือ · O3) → บนจอใหญ่ 44 · `getFieldControlClasses()` (reports) | อ่านโค้ด |
| ลูกศรของ select | ไม่มี `select-chevron` เลยในช่องกรอง (มีแค่ `c/ui/native-select.tsx` และ `globals.css`) | grep |
| "ล้างตัวกรอง" ในฟอร์มกรอง | **แสดงเสมอ** แม้ไม่มีตัวกรอง: ข้อมูลหลัก 7 · disposal 2 · maintenance 1 · reports 1 · logs ไม่มีปุ่มล้าง (ใช้ลิงก์ "ทั้งหมด" ของตัวกรองด่วน) | อ่านโค้ด |
| ป้ายที่กดไม่ได้ | `D/disposal/page.tsx:273` ป้าย "ล้างตัวกรอง" ใน `<summary>` กดแล้วแค่พับ/กาง | อ่านโค้ด |
| ชิปตัวกรอง | ทะเบียน `c/assets/asset-register-filter-chips.tsx:6-47` (`rounded-full`) · รายงาน `c/reports/report-active-filters.tsx:12-36` (แถบพื้น `bg-primary-soft` `:16` และ "ล้างตัวกรอง" ซ้ำกับปุ่มในแผง) · maintenance ใช้บรรทัดข้อความ `D/maintenance/page.tsx:200` ลิงก์เล็กไม่มีเป้ากด 44 | อ่านโค้ด |
| แถบติดบน (sticky) | หน้ารายการที่มี: **`/assets` หน้าเดียว** (`asset-register-toolbar.tsx:36`, VFG:111) · `audit-scan-search.tsx:47` เป็นหน้าสแกน (O20) | grep `sticky top-` |
| ค้นหาขณะพิมพ์ | **ทะเบียนที่เดียว** (`asset-register-search-field.tsx:49-56`, `:90-103`) | grep `isComposing` / `onComposition` ได้ 2 ไฟล์ (อีกไฟล์คือ `audit-scan-search.tsx`, O20) |
| ฟอร์มที่ทิ้งขนาดหน้า | maintenance: ฟอร์ม `D/maintenance/page.tsx:174-199` ไม่มี hidden `pageSize` ทั้งที่หน้ามี `MaintenancePagination` 25/50/100 → กด "กรอง" แล้วกลับเป็น 25 | อ่านโค้ด |
| ตัวกรองที่มองไม่เห็นบนจอ | findings `roundId` / `findingType` (`D/audit/findings/page.tsx:63-64`, ส่งต่อที่ `:244`) ไม่มีอะไรบอกบนจอ | อ่านโค้ด · ข้อ 6.2 ข้อ 6-ฉ |
| ช่องดิบใน `src/app` | ทุกช่องดิบที่ไม่ใช่ hidden ใน `src/app/**/*.tsx` คือช่องกรอง 10 ไฟล์ของตารางนี้ (`<select` 12 · `<input` 18 = 30 tag) | grep `<select\b` / `<input\b` ที่ไม่มี `type="hidden"` |

**`FilterSelect` ประจำไฟล์ 7 ตัว**

| ไฟล์ `D/master-data/…/page.tsx` | def | แบบ | เรียก |
|---|---|---|---|
| `branches` | `:417-444` | options | `:141`, `:153`, `:163` |
| `brands` | `:567-597` | options + `allLabel` | `:354`, `:364`, `:374` |
| `categories` | `:486-513` | options | `:178`, `:188`, `:198`, `:208`, `:218` |
| `companies` | `:395-422` | options | `:131`, `:141` |
| `employees` | `:338-361` | children | `:151`, `:159`, `:167`, `:175`, `:181` |
| `locations` | `:472-499` | options | `:186`, `:198`, `:207`, `:217` |
| `suppliers` | `:187-189` | children + `className` จากผู้เรียก | `:169`, `:174` |

ทุกตัว: `<label className="space-y-1 text-sm font-medium text-foreground">` + `<select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring">` (suppliers ส่ง `min-h-11 … focus:ring-ring/30` เข้ามา `:158`)

### 6.2 ข้อตัดสินของส่วนนี้

| # | เรื่อง | ตัดสิน | ที่มา |
|---|---|---|---|
| 6-ก | ขนาดช่อง | **แผงตัวกรอง** (ช่องมีป้ายที่มองเห็น) = `fieldSize="lg"` 40 ตาม R-l และปุ่มในแผง `size="lg"` 40 ตาม A/04:232 (B11) · **แถบเครื่องมือ** (ช่องไม่มีป้ายที่มองเห็น) = `fieldSize="md"` + `Button size="md"` 36 ตาม B3(4) · ต่ำกว่า `md` ทุกตัว 44 จาก primitive | R-l เขียนก่อนผู้ใช้ตอบ Q3.4 · B3(4) เป็นคำตอบของผู้ใช้ จึงใช้กับแถบเครื่องมือ · R-l คงไว้กับแผงที่มีป้าย · M05 C4 |
| 6-ข | กรอบ | แถบเครื่องมือไม่มีกรอบ (B3(4), `MK/base.css:250`) · แผงตัวกรองที่มีป้ายคงกรอบ แต่ใช้ `FilterPanel` ตัวเดียว (`c/ui/filter-panel.tsx:12-24`) แทน `rounded-lg border border-border bg-surface p-4` ที่เขียนเอง | ต้นแบบไม่มีแผงตัวกรองแบบมีป้าย "No new visual is needed" (M05 P5) · B3(4) พูดถึงแถบเครื่องมือของทะเบียน (Q3.4) |
| 6-ค | sticky | แถบติดบนบนมือถือมีที่ `/assets` ที่เดียวเหมือนเดิม (B3(4) "คงแถบติดบน") · 2B ไม่เพิ่ม sticky ให้หน้าอื่น | แถบอื่นมีแค่ช่องค้นหาเหนือรายการสั้น · sticky ผูกกับ padding ของ `<main>` (R-o, VFG:109-115) |
| 6-ง | การส่งฟอร์ม | ฟอร์ม GET คงเดิม: ส่งด้วยปุ่ม "กรอง" / "ค้นหา" หรือ Enter · select ไม่ส่งเอง · ไม่มี debounce · ทำงานได้โดยไม่มี JavaScript | งานนี้ย้ายหน้าตา ไม่เปลี่ยนพฤติกรรม |
| 6-จ | "ล้างตัวกรอง" | แสดง**เฉพาะเมื่อมีตัวกรอง** (ข้อ 6.4) · เป็นปุ่ม `outline` ("secondary" ของ DS:425) · ปลายทางของลิงก์เท่าเดิมทุกหน้า | A/07:316 · DS:425 · M02 §8 ข้อ 10 |
| 6-ฉ | ชิป | ชิปมีเฉพาะตัวกรองที่**มองไม่เห็นบนจอ** (DS:505): ทะเบียน (ข้อ 7) · รายงาน (ตัวกรองใน URL 7 ตัว) · maintenance `assetId` · ตัวกรองที่อยู่ในแผงอยู่แล้วไม่มีชิป · findings `roundId` / `findingType` มีชิปใน 2B-2 (ตัดสินแล้ว I24 · ข้อ 6.13 ท้าย) | DS:505 · I24 |
| 6-ช | landmark | ทุกฟอร์มกรองมี `role="search"` · หน้าที่ render ฟอร์ม 2 ชุด (suppliers, disposal) ซ่อนชุดหนึ่งด้วย `display: none` จึงเหลือ landmark เดียวต่อหน้าเสมอ ไม่ต้องตั้งชื่อ | ทะเบียนใช้อยู่แล้ว (`asset-register-search-field.tsx:63`) |
| 6-ซ | รายงาน | ชิปของรายงานไม่มีลิงก์ "ล้างตัวกรอง" ของตัวเอง เพราะปุ่มในแผงอยู่เหนือขึ้นไปและไปที่ URL เดียวกัน (`report-filter-panel.tsx:79` = `D/reports/page.tsx:756`) | ไม่ให้มีคำสั่งชื่อเดียวกัน 2 ตัวติดกัน |
| 6-ฌ | ตัดจำหน่าย | ฟอร์มกรองเหลือ markup ชุดเดียว (`DisposalFilterForm`) render 2 ครั้งแบบ suppliers · ลบป้ายที่กดไม่ได้ `:273` | 00-synthesis ข้อ 1 แถว 17 |
| 6-ญ | ซ่อมบำรุง | เพิ่ม hidden `pageSize` · บรรทัด "เฉพาะทรัพย์สินนี้" `:200` เป็นชิปที่ลบแค่ `assetId` และคงตัวกรองอื่น (เดิมลิงก์ล้างทุกอย่าง) | ข้อ 6.1 แถว "ฟอร์มที่ทิ้งขนาดหน้า" · DS:505 |

### 6.3 ของกลาง

กติการ่วม (เหมือน C/03 ข้อ 3.1): อยู่ใน `c/ui/` · ไม่มี `"use client"` และไม่มี hook นอกจาก `useId` ที่ `Field` ใช้ · token เดิมเท่านั้น · ไม่มี `shadow-*`, `opacity`, `rounded-[…]`, `leading-tight`, `flex-col-reverse` · ต่ำกว่า `md` สูงอย่างน้อย 44 · ห้ามแก้ `c/ui/field.tsx`, `c/ui/sheet.tsx` (รั้ว 2C) ใช้ API ที่มีอยู่เท่านั้น

#### 6.3.1 `FilterSelect` (`c/ui/filter-select.tsx` ไฟล์ใหม่)

```ts
import type { FieldSize } from "@/components/ui/field-variants"
export type FilterSelectOption = { value: string; label: string }
type FilterSelectProps = Omit<React.ComponentProps<"select">, "size" | "multiple" | "className"> & {
  label: string                              // ป้ายที่มองเห็น 13/20 500 (fieldLabelClasses) หรือ sr-only เมื่อ hideLabel
  options?: readonly FilterSelectOption[]    // แบบ options
  allLabel?: string                          // ใส่ <option value=""> ไว้หน้าสุด
  fieldSize?: FieldSize                      // ค่าตั้งต้น "lg" (R-l) · แถบเครื่องมือส่ง "md" (6-ก)
  hideLabel?: boolean                        // แถบเครื่องมือ: ป้ายเป็น sr-only ตัวเลือกแรกบอกชื่อแทน
  labelAction?: React.ReactNode              // ปุ่มช่วยเหลือ 1 ปุ่มข้างป้าย (LabeledSelect ของทะเบียน)
  className?: string                         // ลงที่ตัวห่อของ Field: ใช้จัดวางเท่านั้น (col-span, ความกว้าง)
}
export function FilterSelect(props: FilterSelectProps): React.JSX.Element
```

**markup**

```tsx
<Field label={label} hideLabel={hideLabel} labelAction={labelAction} className={className}>
  <NativeSelect fieldSize={fieldSize} {...selectProps}>
    {allLabel ? <option value="">{allLabel}</option> : null}
    {options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    {children}
  </NativeSelect>
</Field>
```

- ใช้ได้ทั้งแบบ uncontrolled (`name` + `defaultValue`, ฟอร์ม GET · ทะเบียนใช้ `key` + `defaultValue` + `onChange` เดิม, I6) และ controlled (`value` + `onChange`, O3) · ผู้เรียกส่งอย่างใดอย่างหนึ่ง
- `children` ใช้กับรายการที่ต้องจัดเอง (employees, suppliers) · ใช้คู่กับ `options` ได้ ลำดับคือ `allLabel` → `options` → `children`
- ไม่มี `data-slot` ของตัวเอง: เป็นแค่ `Field` (`data-slot="field"`) + `NativeSelect` (`data-slot="native-select"`)
- id มาจาก `useId` ของ `Field` · หน้าที่ render ฟอร์ม 2 ชุดจึงไม่มี id ซ้ำ
- เปลี่ยนความสูงด้วย `fieldSize` เท่านั้น (`h-*` ใน `className` แพ้ `md:h-10`, `field-variants.ts:22`)
- เขียน `label=` เป็น prop แรก (DS:447)
- ห้ามใช้แทน `SearchableSelect` (มีป้ายของตัวเอง, DS:447)

**ผลที่เห็น:** ป้าย 13/20 500 สีเข้มทุกหน้า · ช่องขอบ `border-input` พื้นขาว ลูกศร `select-chevron` · จอใหญ่ 40 · มือถือ 44 ตัวอักษร 16px (iOS ไม่ซูม)

#### 6.3.2 `FilterFormActions` (เพิ่มใน `c/ui/filter-panel.tsx`)

```ts
export function FilterFormActions(props: {
  submitLabel: string                         // "กรอง" / "ใช้ตัวกรอง"
  clear?: { href: string; label: string }     // ส่งเฉพาะเมื่อ hasActiveFilters (6-จ)
  className?: string                          // จัดวางในกริด (col-span)
}): React.JSX.Element
```

```tsx
<div data-slot="filter-form-actions" className={cn("flex items-end gap-2", className)}>
  <Button type="submit" size="lg" className="flex-1 md:flex-none">{submitLabel}</Button>
  {clear ? (
    <Link href={clear.href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1 md:flex-none")}>{clear.label}</Link>
  ) : null}
</div>
```

- `size="lg"` เขียนตรง ๆ เพราะ 2D จะเปลี่ยนค่าตั้งต้นเป็น 36 แต่ปุ่มนี้อยู่แถวเดียวกับช่อง 40 (A/04:232)
- `items-end` ทำให้ปุ่มตรงแนวล่างของช่องในเซลล์กริดที่มีป้ายอยู่ด้านบน
- มือถือ: ปุ่มเดียวเต็มแถว · 2 ปุ่มแบ่งครึ่ง · จาก `md` กว้างตามข้อความ
- `Button` ไม่มี hook (`button.tsx:13-15`) ใช้ในหน้า server ได้ · ลิงก์ใช้ `buttonVariants` แบบ `D/assets/[id]/page.tsx:922`
- ไม่มี `busy`: ฟอร์ม GET เปลี่ยนหน้าเอง

`FilterPanel` (`:12-24`) คง API เดิม · ใช้เป็นกรอบเดียวของแผงตัวกรองที่มีป้าย (6-ข) · `<section>` ไม่มีชื่อ ยกเว้นรายงานที่มี `title`

#### 6.3.3 `FilterChipList` (`c/ui/filter-chips.tsx` ไฟล์ใหม่ · I7)

```ts
export type FilterChipItem = { key: string; label: string; href: string; mobileOnly?: boolean }
export function FilterChipList(props: {
  chips: readonly FilterChipItem[]
  label: string                               // ชื่อกลุ่ม เช่น "ตัวกรองที่ใช้อยู่"
  removeLabel: string                         // คำนำหน้าชื่อของชิป: `${removeLabel}: ${chip.label}`
  clearAll?: { href: string; label: string }  // ลิงก์ "ล้างทั้งหมด" ท้ายกลุ่ม (ทะเบียน)
  className?: string
}): React.JSX.Element | null                  // ไม่มีชิป = null
```

ชื่อ type เป็น `FilterChipItem` เพราะ `FilterChip` เป็นชื่อฟังก์ชันประจำไฟล์ใน `D/admin/approvals/page.tsx:185` และ `D/admin/approvals/history/page.tsx:182` อยู่แล้ว

| ส่วน | markup / class |
|---|---|
| กลุ่ม | `<div role="group" aria-label={label} data-slot="filter-chips" className={cn("flex min-w-0 flex-wrap items-center gap-2", chips.every((chip) => chip.mobileOnly) && "md:hidden", className)}>` |
| ชิป (ทั้งชิปคือลิงก์ลบ) | `<Link href={chip.href} aria-label={`${removeLabel}: ${chip.label}`} className={cn("group/chip inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-primary-border bg-primary-soft pl-3 pr-1 text-meta text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:min-h-0", chip.mobileOnly && "md:hidden")}>` |
| ข้อความ | `<span className="min-w-0 truncate">{chip.label}</span>` |
| กล่อง ✕ | `<span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors motion-reduce:transition-none group-hover/chip:bg-primary-border"><X className="size-3" /></span>` |
| "ล้างทั้งหมด" | `<Link href={clearAll.href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>` (A/04:114) |

- ตามต้นแบบ `.toolbar .chip` (`MK/base.css:255-260`): สูงเท่าเพื่อนในแถบ 36 · มุม 8px · พื้น `primary-soft` ขอบ `primary-border` ตัวอักษร `primary-hover` 13px · ✕ 24×24 มุม 4px ไอคอน 12px
- hover ของ ✕ ใช้ `bg-primary-border` แทน `color-mix(primary 12%)` ซึ่งเป็นสีโปร่งที่ R1 ห้าม (M05 §3)
- **ต่างจากต้นแบบ:** ต้นแบบให้ ✕ เป็นปุ่มของตัวเอง · ที่นี่ทั้งชิปเป็นลิงก์ลบ เพราะหน้า server ส่งฟังก์ชันไม่ได้ และ ✕ 24px อย่างเดียวเล็กเกินบนจอสัมผัส (M05:123) · ชื่อที่อ่านได้เท่าเดิม: รายงาน "ล้างตัวกรอง: บริษัท: GRL" (`report-active-filters.tsx:21` · `reportsPage.clearActiveFilter`) · ทะเบียน "ล้างตัวกรองนี้: บริษัท: GRL" (`asset-register-filter-chips.tsx:29` · `asset.clearDrilldownFilter`)
- วงโฟกัส `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` เว้นระยะแบบปุ่ม (I7)
- `named group` (`group/chip`) กันไม่ให้ไปชนกับ `group/row` ของตาราง (A:117 I18)
- มุม 8px ไม่ใช่ 6px: ชิปในแถบเครื่องมือสูงเท่าปุ่ม `md` จึงใช้มุมของปุ่ม `md` (A:114 I15) · `ChoiceChip` 6px ยังเป็นของอีกอย่าง (DS:432)
- `mobileOnly` มีไว้ให้ทะเบียน (ชิปขอบเขตที่บนจอใหญ่แสดงใน select อยู่แล้ว, `asset-register-filter-chips.tsx:16`, `:32`)

#### 6.3.4 แบบแถบเครื่องมือ (B3(4))

แถบเครื่องมือ = แถวเหนือรายการที่มีช่องค้นหา select ด่วน ปุ่ม และชิป **โดยไม่มีป้ายที่มองเห็น** ไม่ใช่ component ใหม่ เป็นสูตรที่ผู้ใช้เขียน:

| ส่วน | class / prop |
|---|---|
| แถว | `flex min-w-0 flex-wrap items-center gap-2` (`MK/base.css:250`) · ไม่มีกรอบ พื้น หรือ padding จาก `md` |
| ช่องค้นหา | `SearchField fieldSize="md"` + `aria-label` · `className="min-w-0 flex-[1_1_320px]"` (`MK/base.css:251`) |
| select ด่วน | `FilterSelect hideLabel fieldSize="md"` + ตัวเลือกแรก "{ชื่อ}: ทั้งหมด" ให้มองเห็นชื่อ |
| ปุ่ม | `Button variant="outline" size="md"` |
| ชิป | `FilterChipList` (36 จาก `md`) |
| มือถือ | ทุกตัว 44 จาก primitive · ช่องค้นหาเต็มแถว |
| sticky | **`/assets` เท่านั้น** (6-ค): คง `sticky top-0 z-20 -mx-4 mb-3 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 md:static` ใน `asset-register-toolbar.tsx:36` (VFG:111, `tests/asset-register-filter-ui.test.ts:43`) · จาก `md` ตัด `md:rounded-lg md:border md:border-border md:bg-surface md:p-3` ออก (ข้อ 7) |

**หน้าที่มีแถบเครื่องมือหลัง 2B:** `/assets` (ข้อ 7, sticky บนมือถือ) · 6 หน้าที่ใช้ `MasterDataSearch` (users, departments, findings, rounds, rounds/[id], pending — ไม่ sticky)

#### 6.3.5 `MasterDataSearch` → `SearchField` (O20)

API เดิมทุกตัว (`action, defaultValue, placeholder, submitLabel, hiddenInputs`) เพราะ `tests/operational-return-navigation.test.ts:69`, `:83` ยึด `hiddenInputs={{ … }}` ที่จุดเรียก · ผู้เรียก 6 จุดไม่ต้องแก้ใน 2B-1 (pin ผ่านโดยไม่แก้ · 2B-2 ต่อท้าย `pageSize`/`page` ที่จุดเรียก, I17) · markup ข้างล่างใช้ทั้งก้อน (I8)

```tsx
<form role="search" action={action} className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
  {Object.entries(hiddenInputs).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ))}
  <SearchField name="search" defaultValue={defaultValue} placeholder={placeholder} aria-label={submitLabel} fieldSize="md" className="sm:flex-[1_1_320px]" />
  <Button type="submit" variant="outline" size="md">{submitLabel}</Button>
</form>
```

- ลบการ์ด `:56` (B3(4) ไม่มีกรอบ) · ช่องดิบ `:61-70` · ปุ่มเขียนเอง `:71-76` · import `Search` `:2` ถ้า `MasterDataHeader` ไม่ใช้ (ใช้แค่ `Plus`)
- ชื่อของช่อง = `aria-label={submitLabel}` ("ค้นหา" ทุกจุดเรียก, DS:449) · เดิมมีแค่ placeholder
- มือถือ: ช่องและปุ่มเต็มแถวซ้อนกัน 44 ทั้งคู่ (เดิม `flex-col` เหมือนกัน) · จาก `sm` อยู่แถวเดียว ช่องยืด ปุ่มกว้างตามข้อความ
- คง `mb-4` (I8): รากหน้าเป็น `space-y-6` (I32) และ `mb-4` ชนะ `space-y-6` แถบค้นหาจึงชิดตารางของมัน 16px (ตั้งใจ)
- `master-data-layout.tsx` ไม่มี `"use client"` · `Button` และ `SearchField` ใช้ในหน้า server ได้ · ไม่ส่ง `onClear` (หน้า server ส่งฟังก์ชันไม่ได้, A/06:185)
- คงไฟล์และชื่อ `MasterDataSearch` (2B-5 ลบแค่ `MasterDataHeader`, `MasterDataPagination`, `SortableColumnHeader`, `ColumnHeader` ตามข้อ 10.3, R-h)

### 6.4 กติกาฟอร์มกรอง (ใช้ทุกไฟล์ในข้อ 6.5)

**ส่งฟอร์ม (6-ง)**
- `<form role="search" action={path}>` แบบ GET (ไม่ใส่ `method`) · ไม่มี `onSubmit` ในไฟล์ server
- ส่งด้วยปุ่ม submit หรือ Enter ในช่องข้อความ · select และช่องวันที่ไม่ส่งเอง
- Enter ระหว่างพิมพ์ IME (ภาษาจีน ญี่ปุ่น) ยืนยันคำแทนการส่งฟอร์มตามพฤติกรรมของเบราว์เซอร์ จึงไม่ต้องเขียนอะไรเพิ่ม · แป้นไทยไม่ใช้ IME
- ช่องว่างถูกส่งเป็นค่าว่าง (`search=&companyId=`) เหมือนเดิม · parser ของแต่ละหน้ารองรับอยู่แล้ว

**hidden input: คงบริบทของรายการ**
- กลับไปหน้า 1 (`page=1` หรือไม่ส่ง `page`) · คง `pageSize`, `sort`, `direction` และตัวกรองที่อยู่ใน URL อย่างเดียว
- hidden อยู่ต้นฟอร์มก่อนช่องที่มองเห็น (เหมือนเดิม)

| หน้า | hidden ตอนนี้ | หลัง 2B |
|---|---|---|
| branches · categories · companies · employees · locations · suppliers | `page=1` · `pageSize` · `sort` · `direction` | เดิม |
| brands | `brandPage=1` · `brandPageSize` · `modelPage=1` · `modelPageSize` · `modelBrandId` (`:336-340`) | เดิม |
| disposal | `pageSize` | เดิม |
| maintenance | `assetId` (เมื่อมี, `:175`) | **+ `pageSize`** (6-ญ) |
| reports | `view` + URL-only 7 ตัว (`:50-57`, ยึดที่ `tests/reports-adaptive-ui.test.ts:29-33`) | เดิม |
| logs | — | + `pageSize` เมื่อส่วนแบ่งหน้าเพิ่มการแบ่งหน้า (B4) |
| `MasterDataSearch` | users `pageSize`, `sort`, `direction` · findings `status`, `roundId`, `findingType` · rounds `view` · rounds/[id] `result`, `page`, `pageSize`, `returnTo` · pending `returnTo`, `locationId` · departments — | findings, rounds, pending, departments + `pageSize` เมื่อส่วนแบ่งหน้าเพิ่มการแบ่งหน้า (B4) · 2B-2 แก้ pin `tests/operational-return-navigation.test.ts:54`, `:66`, `:69`, `:81-83` และ `tests/audit-pending-mobile-ux.test.ts:8`, `:15` โดยต่อท้ายส่วน `pageSize`/`page` ไม่ลบส่วนเดิม (I17) |

**"มีตัวกรองอยู่" (`hasActiveFilters`)**
- นับเฉพาะช่องที่มองเห็นในฟอร์ม: คำค้นที่ trim แล้วไม่ว่าง · select ที่ไม่ใช่ค่าตั้งต้น (`""` หรือ `"all"`) · วันที่ที่ไม่ว่าง
- ไม่นับ `page`, `pageSize`, `sort`, `direction`
- ไม่นับตัวกรองใน URL ที่ลิงก์ล้างคงไว้ (maintenance `assetId`, `:89`) ตัวนั้นมีชิปของตัวเอง
- เขียนเป็น `const hasActiveFilters = Boolean(…)` ในหน้า แบบที่ suppliers (`:59-61`) และ disposal (`:244`) ทำอยู่ · ไม่สร้าง helper กลาง

**"ล้างตัวกรอง" (6-จ)**
- `FilterFormActions clear={hasActiveFilters ? { href, label: t("clearFilters") } : undefined}`
- `href` เท่าเดิมทุกหน้า · ป้ายใช้ key `clearFilters` ของแต่ละ namespace ("ล้างตัวกรอง") ไม่มี key ใหม่
- ปุ่มล้างในแถวว่างใช้ `hasActiveFilters` ตัวเดียวกัน (ส่วนแถวว่าง)

**ป้ายและขนาด**
- ทุกช่องในแผงอยู่ใน `Field` (ป้าย 13/20 500 `fieldLabelClasses`, ห่าง 6px) · ไม่มีป้ายแบบย่อ (A/06:234 ข้อ 13)
- ช่องค้นหาในแผง: `Field label` + `SearchField` (ไอคอนแว่นขยาย) · ช่องข้อความอื่น `Input` · วันที่ `Input type="date"` (ได้ `num` เอง, `input.tsx:10`)
- แผงตัวกรอง `lg` · แถบเครื่องมือ `md` (6-ก)
- คงกริดของฟอร์มเดิมทุกหน้า (ไม่จัดหน้าใหม่, M05:23) ยกเว้น disposal (ข้อ 6.5 แถว 10)

### 6.5 รายไฟล์

**ตาราง: 12 ไฟล์ 33 element + O3**

| # | ไฟล์ | element ที่ HEAD | แสดง | plan |
|---|---|---|---|---|
| 1 | `D/master-data/branches/page.tsx` | ค้นหา `:133` · select ใน def `:431` | 4 | 2B-1 |
| 2 | `D/master-data/brands/page.tsx` | `:345` · `:583` | 4 | 2B-1 |
| 3 | `D/master-data/categories/page.tsx` | `:170` · `:500` | 6 | 2B-1 |
| 4 | `D/master-data/companies/page.tsx` | `:123` · `:409` | 3 | 2B-1 |
| 5 | `D/master-data/employees/page.tsx` | `:143` · `:352` | 6 | 2B-1 |
| 6 | `D/master-data/locations/page.tsx` | `:178` · `:486` | 5 | 2B-1 |
| 7 | `D/master-data/suppliers/page.tsx` | `:167` · `:188` (ฟอร์ม render 2 ชุด) | 3 | 2B-1 |
| 8 | `c/master-data/master-data-layout.tsx` | `:63` | 6 (ผู้เรียก 6) | 2B-1 |
| 9 | `D/admin/logs/page.tsx` | `:85` · `:89` | 2 | 2B-5 |
| 10 | `D/disposal/page.tsx` | จอใหญ่ `:285`, `:289`, `:299`, `:306`, `:310` · มือถือ `:392`, `:393`, `:394`, `:396`, `:397` | 5 (DOM 10) | 2B-2 |
| 11 | `D/maintenance/page.tsx` | `:178`, `:182`, `:189`, `:193` | 4 | 2B-2 |
| 12 | `c/reports/report-filter-panel.tsx` | `:60` · select ใน `ReportSelect` `:106` | 7 | 2B-5 |
| | **รวม** | **33** | **55** | |
| O3 | `c/admin/asset-state-review-workspace.tsx` | `:239` (client) | 3 | 2B-2 (I12) |
| ข้อ 7 | ทะเบียน 3 ไฟล์ | `toolbar.tsx:41`, `:53`, `:65` · `search-field.tsx:77` · `filter-sheet.tsx:214` | 11 | 2B-3 |

**แบบของหน้าข้อมูลหลัก (ตัวอย่าง `branches`)**

```tsx
const hasActiveFilters = Boolean(listState.search || listState.companyId || listState.assetUsage !== "all" || listState.locationUsage !== "all")
…
<FilterPanel>
  <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]">
    <input type="hidden" name="page" value="1" />
    <input type="hidden" name="pageSize" value={listState.pageSize} />
    <input type="hidden" name="sort" value={listState.sort} />
    <input type="hidden" name="direction" value={listState.direction} />
    <Field label={tCommon("search")}>
      <SearchField name="search" defaultValue={listState.search} placeholder={t("searchPlaceholder")} />
    </Field>
    <FilterSelect label={t("company")} name="companyId" defaultValue={listState.companyId} options={[/* เดิม */]} />
    <FilterSelect label={t("assetUsageFilter")} name="assetUsage" defaultValue={listState.assetUsage} options={[/* เดิม */]} />
    <FilterSelect label={t("locationUsageFilter")} name="locationUsage" defaultValue={listState.locationUsage} options={[/* เดิม */]} />
    <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
  </form>
</FilterPanel>
```

- คง `options` เดิมทุกตัว รวมแถว `{ value: "", label: tCommon("all") }` หรือ `{ value: "all", … }` (ไม่แปลงเป็น `allLabel`)
- ลบ def ประจำไฟล์ · ลบปุ่มเขียนเอง · import `Field`, `SearchField`, `FilterSelect`, `FilterPanel`, `FilterFormActions`

**ส่วนต่างของแต่ละหน้า**

| # | ไฟล์ | ตัวห่อ | ช่อง | `hasActiveFilters` | ลบ |
|---|---|---|---|---|---|
| 1 | branches | div `:125` → `FilterPanel` | ค้นหา `:131-140` · FS `:141`, `:153`, `:163` | ตามตัวอย่าง | def `:417-444` · ปุ่ม `:173-186` |
| 2 | brands | **คง** div `:318` (แผงหัวของรุ่นที่มีหัวข้อ `modelWorkspaceTitle` อยู่แล้ว) | ค้นหา `:341-353` ป้าย `t("modelFiltersTitle")` · FS `:354` (`allLabel`), `:364`, `:374` | `search` · `modelCategoryId` · `modelPhoto !== "all"` · `modelUsage !== "all"` · ไม่นับ `modelBrandId` (เลือกจากแถบยี่ห้อ ซึ่งมี "ทุกยี่ห้อ" ล้างอยู่แล้ว `:238-247`) | def `:567-597` · ปุ่ม `:384-398` (รวมไอคอน `Filter` `:389`) · `Search` `:344` · ตัด `Filter`, `Search` ออกจาก import `:5` |
| 3 | categories | `:162` → `FilterPanel` | ค้นหา `:168-177` · FS ×5 `:178-227` | `search` + 5 ช่อง `!== "all"` | def `:486-513` · ปุ่ม `:228-241` |
| 4 | companies | `:115` → `FilterPanel` | ค้นหา `:121-130` · FS `:131`, `:141` | `search` · `assetUsage` · `branchUsage` (`!== "all"`) | def `:395-422` · ปุ่ม `:151-164` |
| 5 | employees | `:135` → `FilterPanel` | ค้นหา `:141-150` · FS ×5 แบบ children `:151-185` (คง `<option>` เดิม) | `search` · `companyId` · `branchId` · `departmentId` · `employmentStatus !== "all"` · `custodyUsage !== "all"` | def `:338-361` · ปุ่ม `:186-199` |
| 6 | locations | `:167` → `FilterPanel` | ค้นหา `:176-185` · FS ×4 `:186-227` | `search` · `branchId` · `locationType` · `assetUsage !== "all"` · `hierarchy !== "all"` | def `:472-499` · ปุ่ม `:228-241` |
| 7 | suppliers | จอใหญ่ div `:100-102` → `<FilterPanel className="hidden md:block">` · มือถือ `<details>` `:92-98` คงเดิม | `SupplierFilterForm` `:157-185`: ค้นหา `:165-168` · FS children `:169-178` | มีแล้ว `:59-61` → ส่งเข้า `SupplierFilterForm` เป็น prop ใหม่ `hasActiveFilters` | `controlClassName` `:158` · def `:187-189` · ปุ่ม `:179-182` |
| 8 | `master-data-layout.tsx` | การ์ด `:56` ออก | ข้อ 6.3.5 | — | `:56-79` เดิม |
| 9 | logs | section `:63-95` → `FilterPanel` (ตัวกรองด่วน `:64-80` อยู่ในแผงเดิม เปลี่ยนโดยส่วน `TabNav`) | `Field label={t("module")}` + `Input name="module"` · `Field label={t("action")}` + `Input name="action"` | — (ไม่มีปุ่มล้าง ใช้ตัวกรองด่วน "ทั้งหมด" `buildSystemLogFilterHref(locale, "all")`) | `:83-93` · ปุ่ม → `FilterFormActions submitLabel={t("filter")}` ไม่ส่ง `clear` |
| 10 | disposal | ข้อ 6-ฌ ด้านล่าง | 5 ช่องใน `DisposalFilterForm` | มีแล้ว `:244` | ฟอร์มจอใหญ่ `:281-316` + error `:317` · ป้าย `:273` · markup เดิมของ `:389-402` |
| 11 | maintenance | section `:173-204` → `FilterPanel` | `Field`+`SearchField` · `FilterSelect label={t("filterStatus")} allLabel={tCommon("all")} options={maintenanceStatusFilters.map((status) => ({ value: status, label: t(`status.${status}`) }))}` · `Field`+`Input type="date"` ×2 | ใหม่: `Boolean(filters.search \|\| filters.status \|\| filters.dateFrom \|\| filters.dateTo)` | `:176-198` · บรรทัด `:200` → ชิป (ด้านล่าง) · กล่อง error วันที่ `:201-203` คงเดิม (กล่องแจ้งเป็นของ 2D) |
| 12 | `report-filter-panel.tsx` | `FilterPanel` `:48` คงเดิม (มี `title`, `description`, `className="p-5"`) | ค้นหา `:58-67` → `Field`+`SearchField` · `ReportSelect` ×6 `:68-73` → `<FilterSelect label={labels.company} name="companyId" defaultValue={filters.companyId} allLabel={labels.all} options={options.companies} />` ฯลฯ | prop ใหม่ `hasActiveFilters` ใน `ReportFilterPanelProps` · หน้าส่ง `hasActiveFilters` (`D/reports/page.tsx:190`) ที่ `:730` | `ActionButton` `:75` · `getActionButtonClasses` `:80` · `getFieldControlClasses` · def `:90-116` · ปุ่ม → `FilterFormActions className="md:col-span-2 xl:col-span-3" submitLabel={labels.apply} clear={…}` · คงกริด `:49` และ hidden `:50-57` |
| O3 | `asset-state-review-workspace.tsx` | แถบ `:148` คงเดิม (`bg-background` ในแผง ใช้ได้, DS:441) | `<FilterSelect label={labels.reviewStatus} value={reviewStatus} onChange={(event) => { const value = event.target.value; setReviewStatus(value); void load(1, { reviewStatus: value, severity, issueType }) }} options={[{ value: "pending", label: labels.pending }, …]} />` · severity, issueType ใช้ `allLabel={labels.all}` | — | `Filter` `:238-240` · `onChange` เปลี่ยนจากรับค่าเป็นรับ event |

**ตัดจำหน่าย (6-ฌ)**

```tsx
function DisposalFilterForm({ locale, filters, hasActiveFilters, t, tCommon }: { /* เดิม */; hasActiveFilters: boolean }) {
  const dateRangeError = getDisposalDateRangeError(filters)
  return (
    <form role="search" action={`/${locale}/disposal`} className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px_auto]">
      <input type="hidden" name="pageSize" value={filters.pageSize} />
      <Field label={tCommon("search")} className="col-span-2 lg:col-span-1">
        <SearchField name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} />
      </Field>
      <FilterSelect label={tCommon("status")} name="status" defaultValue={filters.status} allLabel={tCommon("all")} options={/* pending approved disposed rejected */} className="col-span-2 lg:col-span-1" />
      <FilterSelect label={t("disposalType")} name="disposalType" defaultValue={filters.disposalType} allLabel={tCommon("all")} options={/* 5 ชนิด */} className="col-span-2 lg:col-span-1" />
      <Field label={t("dateFrom")}><Input type="date" name="dateFrom" defaultValue={filters.dateFrom} max={filters.dateTo || undefined} /></Field>
      <Field label={t("dateTo")}><Input type="date" name="dateTo" defaultValue={filters.dateTo} min={filters.dateFrom || undefined} /></Field>
      <FilterFormActions className="col-span-2 lg:col-span-1" submitLabel={t("filter")} clear={hasActiveFilters ? { href: `/${locale}/disposal`, label: t("clearFilters") } : undefined} />
      {dateRangeError ? <p role="alert" className="col-span-2 text-meta text-danger lg:col-span-6">{t("invalidDateRange")}</p> : null}
    </form>
  )
}
```

- หน้า: `<details>` `:270` เรียก `<DisposalFilterForm … hasActiveFilters={hasActiveFilters} />` ใน `div.border-t.p-4` เดิม · จอใหญ่ `<FilterPanel className="hidden md:block"><DisposalFilterForm … /></FilterPanel>` แทน `:280-318`
- ทั้ง 2 จุดเรียกอยู่ใน `<DisposalBulkApprovalProvider>` (`tests/disposal-queue-ux.test.ts:40-51`)
- `<summary>` `:271-274`: ลบ `:273` (ป้าย "ล้างตัวกรอง" ที่กดไม่ได้) · `<details open={hasActiveFilters}>` เปิดเองเมื่อมีตัวกรองอยู่แล้ว
- ช่วง 768–1023px เปลี่ยนจาก 1 คอลัมน์เป็น 2 คอลัมน์ (วันที่คู่กัน) · มือถือวันที่คู่กันเหมือนเดิม (`:395`)
- ช่องวันที่บนมือถือ `px-2` → `px-3` ของ primitive

**ซ่อมบำรุง: ชิป `assetId` (6-ญ)**

```tsx
{filters.assetId ? (
  <FilterChipList
    className="mt-3"
    label={t("activeFilters")}
    removeLabel={t("clearFilters")}
    chips={[{ key: "assetId", label: t("assetFilter"), href: `/${locale}/maintenance?${buildMaintenanceQueryString(filters, { assetId: "", page: 1 })}` }]}
  />
) : null}
```

- อยู่ใน `FilterPanel` ใต้ฟอร์ม แทน `:200` · ชื่อที่อ่านได้ "ล้างตัวกรอง: เฉพาะทรัพย์สินนี้"
- ลบแค่ `assetId` คงคำค้น สถานะ วันที่ และขนาดหน้า (`buildMaintenanceQueryString`, `src/lib/maintenance-query.ts:77-91`)
- key ใหม่ `repairRecord.activeFilters` (ข้อ 6.11)

**รายงาน: ชิป (6-ซ)**
- `D/reports/page.tsx:752-761`: `<ReportActiveFilters …>` → `<FilterChipList chips={activeFilters} label={t("activeFilters")} removeLabel={t("clearActiveFilter")} />` ในตัวห่อ `<div data-report-active-filters>` เดิม (ลำดับยึดที่ `tests/reports-adaptive-ui.test.ts:14`)
- `ReportActiveFilterDescriptor` (`src/lib/report-active-filters.ts:21-25`) มี `key`, `label`, `href` ตรงกับ `FilterChipItem`
- ลบ `c/reports/report-active-filters.tsx` (ไม่มีผู้ใช้อื่น) · `src/lib/report-active-filters.ts` คงเดิม
- แถบพื้น `bg-primary-soft` `:16` หายไป (ไม่มีกล่องซ้อนกล่อง)

### 6.6 ทะเบียน (อ้างอิงข้อ 7)

ข้อ 7 ใช้ของกลางของข้อนี้ดังนี้ · รายละเอียด pin และ markup อยู่ข้อ 7:

| ของทะเบียน | ใช้ |
|---|---|
| select 3 ตัวใน toolbar (`:41`, `:53`, `:65`) | `FilterSelect hideLabel fieldSize="md" className="w-44 shrink-0 lg:w-48"` + คง `key`/`defaultValue`/`onChange` เดิม (I6) |
| ช่องค้นหา (`search-field.tsx:77-105`) | `SearchField fieldSize="md" loading={isPending} onClear clearLabel={t("searchClear")}` · คงกติกาข้อ 6.7 ทั้งหมด |
| `LabeledSelect` ×7 (`filter-sheet.tsx:194-225`) | `FilterSelect` 7 จุด · `labelAction={<AssetStateHelpPopover … />}` เฉพาะสถานะ สภาพ + `key={value}` + `defaultValue` + `onChange` (I6) · ขนาด `lg` (แผงที่มีป้าย, 6-ก) (C/03:150) · ลบ `function LabeledSelect` (LFG LF1 KEEP 0) |
| ปุ่มเปิด sheet (`toolbar.tsx:83-91`) | `Button variant="outline" size="md"` |
| ชิป (`asset-register-filter-chips.tsx`) | ไฟล์คงไว้เป็นตัวห่อ server ของ `FilterChipList` + `mobileOnly` + `clearAll` ("ล้างทั้งหมด") (I7) |
| กรอบ toolbar (`toolbar.tsx:36`) | ไม่มีกรอบจาก `md` · คง sticky บนมือถือ (ข้อ 6.3.4) |

### 6.7 ค้นหาฝั่ง client: IME และ debounce

มีที่เดียวคือช่องค้นหาของทะเบียน · 2B ไม่เพิ่มการค้นหาขณะพิมพ์ให้หน้าอื่น (ฟอร์ม server ไม่มี JS, 6-ง)

| กติกา | ที่อยู่ตอนนี้ | ต้องคงหลังย้ายไป `SearchField` (ข้อ 7) |
|---|---|---|
| รอหยุดพิมพ์ 400ms | `assetRegisterSearchDebounceMs` (`src/lib/asset-register-filters.ts:3`) · `search-field.tsx:52-55` | `window.setTimeout(…, assetRegisterSearchDebounceMs)` |
| อย่างน้อย 2 ตัวอักษร (นับ code point) · ช่องว่าง = ค้นทันที | `shouldAutoSearch` (`asset-register-filters.ts:8-13`) | เรียก `shouldAutoSearch(value, filters.search)` |
| ไม่ค้นระหว่าง IME | `onCompositionStart` ยกเลิกตัวจับเวลา `:90-93` · `onCompositionEnd` ตั้งใหม่ `:94-97` · `composingRef.current \|\| isComposing` `:101` | ส่ง handler ผ่าน props ของ `SearchField` (ไปถึง `<input>` ด้วย `...props`) |
| Enter ค้นทันที | `onSubmit` + `preventDefault` + `search(draft)` `:65-68` | คง `<form role="search" action={…}>` ห่อ `SearchField` |
| ✕ ล้างแล้วโฟกัสกลับ | `:106-119` · `inputRef.current?.focus()` | `onClear` · `ref` ผ่าน `SearchField` → `Input` → `<input>` ได้ (React 19.2 ส่ง `ref` เป็น prop) |
| ผลที่มาช้าไม่ทับสิ่งที่กำลังพิมพ์ | `:24-27` | คงเดิม |
| ไม่มี JS ก็ยังส่ง GET ที่คงตัวกรองอื่น | hidden `:59`, `:71-73` | คงเดิม |
| ไอคอนหมุน | `:75` (ไม่มี `motion-reduce`) | `loading` ของ `SearchField` มี `motion-reduce:animate-none` แล้ว (`search-field.tsx:25`) |

pin: `tests/asset-register-search-ui.test.ts:10-35` ต้องผ่านต่อหรือแก้ใน commit ของข้อ 7 · กติกาเดียวกันเขียนอยู่ที่ DS:502

**O3 (data-quality):** select 3 ตัวโหลดใหม่ทันทีที่เปลี่ยน (ไม่มีช่องพิมพ์ ไม่ต้อง debounce) · ไม่แก้พฤติกรรม (ความเสี่ยงข้อ 6.10 ข้อ 6)

### 6.8 แบ่งตาม plan

| plan | งานของส่วนนี้ | ไฟล์ | element (แสดง) |
|---|---|---|---|
| **2B-1** | ของกลาง: `c/ui/filter-select.tsx` (ใหม่) · `c/ui/filter-chips.tsx` (ใหม่, I7) · `FilterFormActions` ใน `c/ui/filter-panel.tsx` + test (`tests/list-primitives-ui.test.ts` ตัวกรอง · `tests/list-filters-ui.test.ts` ข้อ 2, I16) (1 commit) · `MasterDataSearch` (1 commit, เปลี่ยนหน้าตา 6 หน้าทันที รวม 3 หน้าของ 2B-2) · 7 หน้าข้อมูลหลัก (อยู่ใน commit ของแต่ละหน้า) | 10 | 15 (37) |
| **2B-2** | disposal (ฟอร์มเดียว) · maintenance (+ `pageSize`, + ชิป, key ใหม่) · findings ชิปรอบ/ประเภท (I24, ข้อ 6.13 ท้าย) · O3 (I12) | 4 | 14 (9) + O3 1 (3) |
| **2B-3** | ทะเบียน (ข้อ 7) | 3–4 | 5 (11) นอก 33 |
| **2B-5** | logs · `report-filter-panel.tsx` + ชิปรายงาน (ลบ `report-active-filters.tsx`) · LFG LF1 ถึง 0 และล็อก `BUDGETS = KEEP` (I15) | 4 | 4 (9) |

ยอด: 15 + 14 + 4 = 33 element · 37 + 9 + 9 = 55 ช่อง · O3 1 (3) อยู่นอก 33 (2B-2)

- ไม่มีไฟล์ของส่วนนี้อยู่ใน `BATCH_FILES` ของ FMG · คู่ที่ทำพร้อมกันตาม B7 ไม่ชนกัน: 2B-5 แตะ `report-filter-panel.tsx`, `D/reports/page.tsx`, `D/admin/logs/page.tsx` · 2C-4 แตะ `report-preset-controls.tsx`, `asset-state-review-dialog.tsx`, `D/admin/data-quality/page.tsx:146` (00-synthesis ข้อ 3 · ข้อ 8.3) · `asset-state-review-workspace.tsx` (O3) อยู่ 2B-2 ซึ่งไม่มีคู่ทำพร้อม (I12)
- ไฟล์ใหม่ใน `c/ui/` ถูก GD4 ตรวจ (`FMG:602`, budget 0): ห้าม `flex-col-reverse`

### 6.9 สิ่งที่พนักงานจะเห็น

- ป้ายช่องกรองเป็นตัวเข้ม 13px แบบเดียวทุกหน้า (เดิมบางหน้าเป็นตัวเทาเล็ก 12px)
- ช่องกรองบนคอมสูง 40 (maintenance และ data-quality เดิม 44) · บนมือถือ 44 (ข้อมูลหลักเดิม 40)
- ความสูงของแถวในแผงตัวกรอง (ป้าย + ระยะ + ช่อง): ข้อมูลหลัก 64 → 66 บนคอม (ระยะป้าย 4 → 6) · logs, disposal, รายงาน 62 → 66 (ป้าย 12/16 → 13/20) · maintenance 66 เท่าเดิม · data-quality 68 → 66 (ช่อง 44 → 40) · บนมือถือข้อมูลหลัก 64 → 70 ต่อช่อง หมวดหมู่และพนักงาน (6 ช่องซ้อนกัน) สูงขึ้นราว 36px
- ช่องค้นหามีไอคอนแว่นขยาย · ปุ่ม ✕ ของเบราว์เซอร์ในช่องค้นหาของหน้า server หายไป (`search-field.tsx:31`)
- ช่องเลือกมีลูกศรแบบเดียวกันทุกหน้า
- "ล้างตัวกรอง" ขึ้นเฉพาะตอนมีตัวกรอง และเป็นปุ่มขอบ
- ช่องค้นหาเหนือตาราง 6 หน้า (ผู้ใช้ แผนก รายการไม่ตรง รอบตรวจนับ ผลของรอบ รายการค้าง) ไม่มีกรอบการ์ด สูง 36 บนคอม
- ชิปตัวกรองเป็นมุม 8px สูง 36 บนคอม (ทะเบียนเดิมเป็นวงรี 32) · รายงานไม่มีแถบพื้นฟ้า และเหลือ "ล้างตัวกรอง" ปุ่มเดียวในแผง
- ซ่อมบำรุง: "เฉพาะทรัพย์สินนี้" เป็นชิปที่กดลบได้ และลบเฉพาะตัวกรองนี้ · จำนวนแถวต่อหน้าไม่กลับเป็น 25 หลังกด "กรอง"
- รายการไม่ตรง: มีชิปบอกรอบและประเภทที่กรองอยู่ (I24 · แจ้งผู้ใช้)
- ตัดจำหน่ายบนมือถือ: ป้าย "ล้างตัวกรอง" ที่กดไม่ได้ในหัวพับหายไป · จอ 768–1023 วันที่อยู่คู่กัน

### 6.10 ความเสี่ยง

1. **กริดกว้าง `xl`:** categories และ employees มี 6 ช่อง `minmax(150px,1fr)` + ปุ่ม · ที่ 1280px ข้างเมนูข้างอาจล้น (เป็นอยู่แล้ว) · ปุ่มล้างที่ซ่อนเปลี่ยนความกว้างคอลัมน์ `auto` · ตรวจที่ 1280, 1366, 1440 ทั้งตอนมีและไม่มีตัวกรอง
2. **ฟอร์ม 2 ชุด (suppliers, disposal):** id มาจาก `useId` จึงไม่ซ้ำ · `role="search"` 2 ตัวแต่ซ่อน 1 ตัวด้วย `display: none` · ตรวจด้วย accessibility tree ทั้ง 375 และ 1440
3. **controlled กับ uncontrolled:** `FilterSelect` ส่ง props ต่อ `<select>` ทั้งหมด · ผู้เรียกที่ส่งทั้ง `value` และ `defaultValue` จะได้คำเตือนของ React · ตรวจใน dev console
4. **ไม่มี ✕ ในช่องค้นหาของหน้า server:** ล้างคำค้นต้องลบเองหรือกด "ล้างตัวกรอง" (6 หน้าของ `MasterDataSearch` ไม่มีปุ่มล้าง ยกเว้นลิงก์ "ดูทั้งหมด" ของ rounds/[id] `:623-627`)
5. **ลิงก์ชิปของซ่อมบำรุงเปลี่ยนปลายทาง** (คงตัวกรองอื่น) · ปุ่ม "ล้างตัวกรอง" และแถวว่างยังใช้ `clearHref` `:89` เดิม
6. **O3 ผลมาสลับลำดับ:** เปลี่ยน select เร็ว ๆ แล้วคำขอที่มาทีหลังอาจทับคำขอใหม่ (`load` `:66-80` ไม่มีตัวกันลำดับ) · เป็นอยู่แล้ว ไม่แก้ใน 2B · บันทึกใน DH
7. **2 หน้ายังเป็นแผงที่มีกรอบ (6-ข)** ขณะที่ทะเบียนไม่มีกรอบ · ตัดสินแล้วตาม I23 (แผงที่มีป้ายคงกรอบ · แจ้งผู้ใช้) · ถ้าผู้ใช้ค้านตอนรับทราบ ต้องตัดกรอบอีก 10 แผง (ข้อมูลหลัก 5 ไม่นับ brands ที่อยู่ในแผงหัวรุ่น + suppliers + logs + disposal + maintenance + รายงาน)
8. **skeleton:** `FilterPanelSkeleton` ใช้ช่อง `h-11` และชิป `rounded-full` (`page-skeleton.tsx:70`, `:75`) จะไม่ตรงหน้าใหม่ จนกว่าส่วน skeleton (2B-4) แก้

### 6.11 ข้อความใหม่

| key | th | en | ใช้ที่ |
|---|---|---|---|
| `repairRecord.activeFilters` | ตัวกรองที่ใช้อยู่ | Active filters | ชื่อกลุ่มชิปของ maintenance (2B-2) |
| `auditFinding.activeFilters` | ตัวกรองที่ใช้อยู่ | Active filters | ชื่อกลุ่มชิปรอบ/ประเภทของ findings (2B-2, I24) |

- เพิ่มผ่าน `node scripts/messages-edit.mjs` · คำว่า "ตัวกรอง" ตาม `docs/19_THAI_GLOSSARY.md:31` · ใช้ข้อความเดียวกับ `asset.activeFilters` และ `reportsPage.activeFilters`
- ไม่มี key ใหม่อื่น: ป้ายทุกช่อง ปุ่ม "กรอง" และ "ล้างตัวกรอง" ใช้ key เดิม

### 6.12 เอกสาร

| ที่ | แก้ | plan |
|---|---|---|
| `DESIGN.md:459` (Inputs / Fields → Migration) | "List-page filters belong to 2B." → บอกสถานะต่อ plan: ฟอร์มกรองของหน้ารายการใช้ `FilterSelect`, `Field` + `SearchField` / `Input`, `FilterFormActions` · ช่องดิบที่เหลือ | ทุก plan |
| `DESIGN.md` Inputs / Fields (ต่อจาก `:459`) | bullet ใหม่ **List filters:** แผงตัวกรอง `lg` 40 + `FilterFormActions` `lg` · แถบเครื่องมือ `md` 36 ไม่มีป้ายที่มองเห็น · ฟอร์ม GET ส่งด้วยปุ่มหรือ Enter · hidden คง `pageSize`/`sort`/`direction` · `role="search"` · "ล้างตัวกรอง" เฉพาะเมื่อมีตัวกรอง | 2B-1 |
| `DESIGN.md:502` | "Search bar card" → "Search toolbar": ไม่มีกรอบจาก `md` · ช่องและปุ่ม 36 (`fieldSize="md"`, `Button size="md"`) · ต่ำกว่า `md` 44 และแถบของทะเบียนติดบน · หน้าอื่นไม่ติดบน | 2B-1 (ทะเบียนเปลี่ยนจริงใน 2B-3) |
| `DESIGN.md:505` | สูตร `FilterChipList`: 8px สูงเท่าเพื่อนในแถบ ทั้งชิปเป็นลิงก์ลบ 44 บนมือถือ · "ล้างทั้งหมด" เป็น `linkVariants` · ชิปมีเฉพาะตัวกรองที่มองไม่เห็นบนจอ | 2B-1 |
| `DESIGN.md:425` | `actionVariant="secondary"` สำหรับ "ล้างตัวกรอง" → เติม "(only while a filter is active)" | 2B-1 |
| `DESIGN.md:432` (Corner Style) | เติม filter chip ในรายการ 8px | 2B-1 |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:54-79` (Shared Components) | เพิ่ม 3 แถว: select ของตัวกรอง → `FilterSelect` · ปุ่มของฟอร์มกรอง → `FilterFormActions` · ตัวกรองที่ใช้อยู่ → `FilterChipList` | 2B-1 |
| `.impeccable/design.json` | component `filter-chip` (สูตรข้อ 6.3.3) ข้าง `field` (`:369`) · เพิ่มในรายการของ R-s | 2B-1 |
| `src/lib/design-system.ts:93` | comment ของ `getActionButtonClasses`: "Phase 2D moves its one caller" → ไม่มีผู้เรียกแล้วตั้งแต่ 2B-5 · 2D ลบ | 2B-5 |
| `DEVELOPER_HANDOFF.md` ส่วน 2B ของแต่ละ plan | ของกลางที่เพิ่ม · หน้าที่ย้าย · สิ่งที่พนักงานเห็น (ข้อ 6.9) · O3 ผลสลับลำดับ (ข้อ 6.10 ข้อ 6) · รายการตรวจด้วยคน | ทุก plan |
| `docs/99_CHANGELOG.md` | รายการของแต่ละ plan | ทุก plan |
| wiki `AssetSystem/` | บรรทัดใน `ams-log.md` · หน้า UI ที่พูดถึงตัวกรอง (ถ้ามี) ตาม schema · รัน `wiki-lint` | ทุก plan |

### 6.13 test

**ตาราง A: test เดิมที่ต้องแก้** (แก้ใน commit ที่ทำให้พัง)

| test:บรรทัด | ตอนนี้ยึด | แก้เป็น | plan |
|---|---|---|---|
| `tests/disposal-queue-ux.test.ts:43-51` | ตำแหน่งของ `'<form className="grid grid-cols-1 gap-3 lg:grid-cols-'` อยู่ใน provider | จุดเรียก `<DisposalFilterForm` ตัวที่ 2 (`page.indexOf("<DisposalFilterForm", mobileFilter + 1)`) อยู่ใน provider · คง `:52` | 2B-2 |
| `tests/report-controls-ui.test.ts:5`, `:8-11` | อ่าน `report-active-filters.tsx` ตอนโหลดไฟล์ · `md:min-h-9` | ลบตัวแปร `:5` และ test `:8-11` (ไฟล์ถูกลบ) · ข้อตรวจ 44px ย้ายไป test ใหม่ (ตาราง B ข้อ 3 ใน `tests/list-primitives-ui.test.ts`, I16) · คง `:13-27` | 2B-5 |
| `tests/asset-register-filter-ui.test.ts:36-46`, `:75-83` · `tests/asset-register-search-ui.test.ts:10-35` | toolbar · ชิป · ช่องค้นหาของทะเบียน | ข้อ 7 | 2B-3 |
| `tests/operational-return-navigation.test.ts:54`, `:66`, `:69`, `:81-83` · `tests/audit-pending-mobile-ux.test.ts:8`, `:15` | `hiddenInputs` และ href ตรงตัวของ pending, findings | ต่อท้ายส่วน `pageSize`/`page` ไม่ลบส่วนเดิม (I17) · ส่วนแบ่งหน้าแก้ · ส่วนนี้ไม่แตะ | 2B-2 |

**ตาราง B: test ใหม่** (อ่านไฟล์แล้ว `.replace(/\r\n/g, "\n")` · regex ไม่มี `\n`) · ข้อ 2, 5–8 อยู่ `tests/list-filters-ui.test.ts` (การใช้ในหน้า) · ข้อ 1, 3, 4 อยู่ `tests/list-primitives-ui.test.ts` (string ของ primitive, I16) · ข้อ 9 เป็น LFG LF1 (ข้อ "ไม่มี", I15)

| # | ไฟล์ test | ตรวจ | plan |
|---|---|---|---|
| 1 | `list-primitives-ui` | `c/ui/filter-select.tsx`: ไม่มี `"use client"` · import `Field` และ `NativeSelect` · `fieldSize = "lg"` · `allLabel ? <option value="">` | 2B-1 |
| 2 | `list-filters-ui` | `c/ui/filter-panel.tsx`: export `FilterFormActions` · `type="submit" size="lg"` · `variant: "outline", size: "lg"` | 2B-1 |
| 3 | `list-primitives-ui` | `c/ui/filter-chips.tsx` (I7): ไม่มี `"use client"` · `role="group"` · `data-slot="filter-chips"` · `` aria-label={`${removeLabel}: ${chip.label}`} `` · `min-h-11` และ `md:h-9 md:min-h-0` ใน class string เดียวกัน · `focus-visible:ring-offset-2` · `rounded-md` · ไม่มี `rounded-full` · `linkVariants(` · `group-hover/chip:bg-primary-border` | 2B-1 |
| 4 | `list-primitives-ui` | `MasterDataSearch`: `role="search"` · `<SearchField` กับ `fieldSize="md"` · `<Button type="submit" variant="outline" size="md"` · ไม่มี `<input type="search"` · ไม่มีกรอบ `rounded-lg border` ใน body ของฟังก์ชัน | 2B-1 |
| 5 | `list-filters-ui` | รายการ `MIGRATED_FILTER_FILES` (เพิ่มทุก plan): ไม่มี `<select`, `<textarea`, `<input` ที่ไม่มี `type="hidden"` (`/<input\b[^>]*>/g` แล้วกรอง) · ไม่มี `space-y-1 text-sm font-medium text-foreground` และ `mb-1.5 block text-xs font-medium text-muted-foreground` · ไม่มี `function FilterSelect` / `function ReportSelect` / `function Filter(` · ทุก `<form` มี `role="search"` | 2B-1 (8 ไฟล์) · 2B-2 (+3 รวม O3, I12) · 2B-3 (+3, ข้อ 7) · 2B-5 (+2) |
| 6 | `list-filters-ui` | "ล้างตัวกรอง" มีเงื่อนไข: ทุก `<FilterFormActions` ที่มี `clear=` ต้องเป็น `clear={hasActiveFilters ?` | 2B-1 ต่อทุก plan |
| 7 | `list-filters-ui` | maintenance: `name="pageSize"` อยู่ในฟอร์ม · `<FilterChipList` กับ `assetId: ""` | 2B-2 |
| 8 | `list-filters-ui` | disposal: `<DisposalFilterForm` 2 จุด · `<form` ใน page.tsx มีแค่ใน `function DisposalFilterForm` | 2B-2 |
| 9 | LFG LF1 | ไม่มีตัวกรอง select ประจำไฟล์นอก `c/ui/`: `/\bfunction (?:FilterSelect\|ReportSelect\|LabeledSelect)\b\|\bfunction Filter\(/g` · budget ลดทีละ commit 10 → 3 → 2 → 1 → 1 → 0 (ตาราง C ข้อ 10.4) · ส่วนช่องดิบ: ข้อ 5 ครอบเมื่อ `MIGRATED_FILTER_FILES` ครบใน 2B-5 (ช่องดิบ 30 tag ที่ HEAD อยู่ใน 10 ไฟล์ของ `src/app` ซึ่งอยู่ในรายการนั้นทั้งหมด) | 2B-1 → 2B-5 (ล็อก `BUDGETS = KEEP`) |

**ตาราง C: ต้องผ่านต่อโดยไม่แก้** (เขียนลงข้อจำกัดของงานใน plan)

| test:บรรทัด | ต้องคง |
|---|---|
| `tests/supplier-adaptive-ui.test.ts:50-55` | `<details` · `md:hidden` · `hidden … md:block` (`FilterPanel className="hidden md:block"`) · `min-h-11` (ของ `<summary>` `:93`) ใน suppliers page |
| `tests/reports-adaptive-ui.test.ts:14`, `:22-27`, `:29-33` | ลำดับ `data-report-*` · `name="view" value={activeView}` · `grid-cols-1` / `md:grid-cols-2` / `xl:grid-cols-3` · hidden URL-only 7 ตัว |
| `tests/disposal-queue-ux.test.ts:17-24`, `:52` | `getDisposalDateRangeError` · `resultRange` · `<details` · `hasActiveFilters={hasActiveFilters}` (ของ `DisposalEmptyState`) · provider `className="space-y-6"` |
| `tests/disposal-route-structure.test.ts:16-23` | `skip` / `take` · `buildDisposalQueryString` ของแท็บและตัวแบ่งหน้า |
| `tests/operational-return-navigation.test.ts:69`, `:83` | `hiddenInputs` ตรงตัว · ผ่านโดยไม่แก้ใน 2B-1 · 2B-2 ต่อท้าย (I17) |
| `tests/audit-pending-mobile-ux.test.ts:14` | `MasterDataSearch` ใน pending |
| `tests/asset-state-review-ui.test.ts:10-13` | `reviewStatus`, `severity` ใน workspace |
| `tests/system-log-history.test.ts:77` | `systemLogQuickFilters` ใน logs page |
| `tests/maintenance-contrast.test.ts:15-17` | ยังมี `text-warning` (กล่อง error วันที่ `:202`) |
| `tests/maintenance-pagination-ui.test.ts:17-18` | `<MaintenancePagination` |
| `tests/reports-localization.test.ts:30-37` | ทุก `t("…")` ในหน้ารายงานมีทั้ง th / en (`activeFilters`, `clearActiveFilter` มีแล้ว) |
| `tests/master-data-brand-supplier-ui.test.ts:80` | key `brandModel.modelFiltersTitle` |
| `tests/field-primitives.test.ts` | ไม่แก้ `Field`, `SearchField`, `NativeSelect` |
| `tests/form-migration-guards.test.ts` | ไม่แก้ไฟล์ · GD4 `:589-603` (ไม่มี `flex-col-reverse` ใน `c/ui/` ใหม่) · GB4 `:532-548` |
| VFG `:150-163`, `:165-167` · `:109-115` | ไม่มี `placeholder:text-*` · `select-chevron` · แถบ sticky ของทะเบียน (ข้อ 7) |
| `tests/design-system.test.ts:39-40`, `:187-190` | `getActionButtonClasses` ยังอยู่ (2D ลบ) |
| `tests/design-tokens-contrast.test.ts` | ไม่แก้ (A:120 I21) |
| `tests/thai-glossary.test.ts` · test ความครบของ messages | key ใหม่ `repairRecord.activeFilters` · `auditFinding.activeFilters` (I24) |

**ตรวจบนแอป dev ของแต่ละ plan:** ทุกหน้าที่แก้ที่ 1440, 1366, 1280, 768 และ 375px · กด "กรอง" ด้วยเมาส์และ Enter · ล้างตัวกรองแล้วปุ่มหาย · ขนาดหน้าคงเดิมหลังกรอง · keyboard: Tab ผ่านช่องตามลำดับ ป้ายอ่านได้ (NVDA ค้างไว้ตรวจด้วยคนก่อน deploy ตาม B9)

**ชิปของ findings (ตัดสินแล้ว I24 · ทำใน 2B-2 · แจ้งผู้ใช้):** findings มีตัวกรอง `roundId` / `findingType` ที่มองไม่เห็นบนจอ (ข้อ 6.1) · ทำชิป 2 ตัวใน 2B-2 (`FilterChipList`): ประเภทจาก `t(`type_${findingType}`)` · รอบจาก `prisma.auditRound.findUnique({ where: { id: roundId }, select: { auditNo: true } })` แบบอ่านอย่างเดียวใน `page.tsx` (แบบเดียวกับ `D/audit/rounds/[id]/pending/page.tsx:114-116`) · key ใหม่ `auditFinding.activeFilters` (ข้อ 6.11)
