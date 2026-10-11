> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2a-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** โดยเฉพาะ I15 (มุมโค้งตามต้นแบบจริง: ปุ่ม md/lg และช่องกรอก 8px · ปุ่ม sm, segmented, chip และป้ายสถานะ 6px · เมนู popover toast 12px) และ I14 (สีจางบน primary-soft อนุญาต)

## 8. ป้ายสถานะ เส้นทางนำทาง และตัวช่วยค่าว่าง/ตัวเลข

ส่วนนี้มี 3 เรื่อง: (ก) `StatusBadge` เหลือขนาดเดียวสูง 22px ตาม D8 (ข) `Breadcrumbs` แต่งใหม่ตาม `.crumbs` ของต้นแบบ (ค) สร้าง `Nil`, `formatCount` และ `formatMoney` ไว้ให้ 2B ใช้

ทั้ง 3 เรื่องไม่จัดหน้าใหม่และไม่แตะฐานข้อมูล ตัวเลขทุกตัวนับใหม่จากโค้ดที่ `081d538` ด้วยสแกนแบบอ่านอย่างเดียว

### 8.0 ต้องมีก่อน (มาจากส่วนอื่นของ 2A)

| ใช้ | มาจาก | หมายเหตุ |
|---|---|---|
| `text-meta` 13/20 | D1 | หน้าไทยไม่ต้องตั้งค่าเพิ่ม เพราะ 20/13 = 1.54 ซึ่งเกินเกณฑ์ 1.44 แล้ว |
| `text-faint-foreground` #56677F | D2 | contrast: card 5.77 · background 5.42 · row-hover 5.32 · canvas 5.09 · accent 5.04 · muted 4.95 |
| `rounded-control` 6px | D7 | |
| `cn()` ต้องรู้จัก `text-meta` และ `rounded-control` | ส่วน token (`extendTailwindMerge` ใน `src/lib/utils.ts`) | ทดสอบกับ tailwind-merge 3.5.0 แล้ว: `cn("… text-meta … text-muted-foreground")` ลบ `text-meta` ทิ้ง และ `cn("rounded-control", "rounded-md")` เก็บไว้ทั้งสองตัว · ถ้าส่วน token ไม่ได้ทำ ให้ส่วนนี้ใส่ `extendTailwindMerge({ extend: { theme: { text: ["meta", "metric", "count"], radius: ["control"] } } })` เอง ไม่งั้นป้ายกับ crumbs จะได้ขนาดตัวอักษรที่สืบทอดมาแทน |

### 8.1 ป้ายสถานะ (`StatusBadge`) ขนาดเดียว 22px

#### 8.1.1 ค่าใหม่ (`src/components/ui/badge-variants.ts`)

| เรื่อง | ตอนนี้ | ใหม่ |
|---|---|---|
| ความสูง | `xs` 22px บนหน้าอังกฤษ และ 24px บนหน้าไทย (เพราะ `text-xs` ไทยสูง 18 + `py-0.5`) · `sm` (ค่าเริ่มต้น) 32px | 22px ทุกภาษา: `h-5.5` (1.375rem) = ขอบ 1 + บรรทัด 20 + ขอบ 1 |
| ตัวอักษร | 12 หรือ 14 · น้ำหนัก 500 | `text-meta` 13/20 · 500 |
| มุม | `rounded-md` 8px | `rounded-control` 6px |
| padding แนวตั้ง | `py-0.5` / `py-1` | ไม่มี |
| padding ข้าง (ป้ายต้องจัดการ) | `px-2` (xs) / `px-2.5` (sm) | `px-2` อย่างเดียว · ป้ายสงบยังเป็น 0 |
| เครื่องหมาย neutral / muted | `bg-muted-foreground` #3C4F6B | `bg-neutral-ink` #2A4468 (token ใหม่ ข้อ 8.1.4) |
| tone ระดับ รูปทรง และการจับคู่สถานะ | ตามเฟส 1 §7 | ไม่เปลี่ยน |

```ts
statusBadgeVariants = cva(
  "inline-flex h-5.5 w-fit max-w-full shrink-0 items-center gap-1.5 rounded-control border text-meta font-medium whitespace-nowrap",
  { variants: { tone: {
      success | info | primary | neutral | muted: "border-transparent text-muted-foreground",
      warning: "border-warning-border bg-warning-soft px-2 text-warning",
      danger:  "border-danger-border bg-danger-soft px-2 text-danger",
    } },
    defaultVariants: { tone: "muted" } })   // ไม่มี size และ compoundVariants แล้ว
// statusMarkerVariants: neutral และ muted = "h-0.5 w-[7px] rounded-[1px] bg-neutral-ink forced-colors:bg-[CanvasText]" (tone อื่นคงเดิม)
```

API ใหม่ (`src/components/ui/status-badge.tsx`) เอา `size` ออก:

```ts
export function StatusBadge({ label, status, tone, className }: { label: string; status?: string | null; tone?: StatusTone | string; className?: string })
```

#### 8.1.2 จุดเรียกใช้

- `StatusBadge` กลางมี 59 จุดใน 22 ไฟล์ แยกเป็น `size="xs"` 50 จุด · `size="sm"` 2 จุด · ไม่ระบุ size 7 จุด
- อีก 5 จุดเป็น component ชื่อซ้ำที่ประกาศในไฟล์ตัวเอง ได้แก่ `notifications/page.tsx` 3 จุด และ `IntegrationClientManager.tsx` 2 จุด จุดเหล่านี้ไม่เปลี่ยนในข้อนี้ (ย้ายใน 2D ตาม critic G1)
- `className` ที่ส่งมามีแค่ `shrink-0` 7 จุด ไม่มีจุดไหนแก้ขนาดหรือสี
- ป้าย `xs` 50 จุด: บนหน้าไทยเตี้ยลงจาก 24 เป็น 22px และตัวอักษรใหญ่ขึ้นจาก 12 เป็น 13px ทุกภาษา
- ป้ายสูง 32px ที่จะเหลือ 22px มี 9 จุด (critic ประมาณไว้ราว 10):

| จุด | size เดิม | อยู่ตรงไหน |
|---|---|---|
| `audit/findings/page.tsx:221` | `sm` | หัวแผงผลการพิจารณา ข้างชื่อแผง |
| `audit/rounds/[id]/page.tsx:614` | `sm` | หัวรายการผล ข้างกล่องนับ `px-3 py-1 text-sm` (สูง 32px) |
| `audit/rounds/[id]/page.tsx:425` | ไม่ระบุ | มุมขวาบนของหัวหน้า เหนือแถวปุ่ม |
| `disposal/batches/[id]/page.tsx:61` | ไม่ระบุ | ข้างปุ่มกลับ `min-h-11` |
| `disposal/[id]/page.tsx:202` | ไม่ระบุ | ท้ายแถวปุ่มของหัวหน้า |
| `maintenance/[id]/page.tsx:113` | ไม่ระบุ | ข้าง h1 |
| `master-data/employees/[id]/page.tsx:310` | ไม่ระบุ | ค่าของ "สถานะการจ้าง" |
| `master-data/suppliers/[id]/page.tsx:239` | ไม่ระบุ | แถวทรัพย์สินของผู้ขาย ข้างราคา |
| `master-data/suppliers/[id]/page.tsx:288` | ไม่ระบุ | แถวงานซ่อม เหนือค่าซ่อม |

- **การลบ `size`:** ลบ attribute 52 ตัว (`xs` 50 + `sm` 2) ใน 19 ไฟล์ เป็น commit เชิงกลแยกต่างหาก
  - ต้องลบเฉพาะในแท็ก `<StatusBadge …>` เท่านั้น ห้ามใช้ sed ทั้งไฟล์ เพราะ `size="xs|sm"` มีทั้งหมด 62 จุดใน 25 ไฟล์ อีก 10 จุดเป็นของ component อื่น
  - ถ้าลบตกไป `next build` ใน `npm run verify` จะไม่ผ่าน เพราะ prop นี้ไม่อยู่ใน type แล้ว
  - 19 ไฟล์:
    - หน้าใต้ `src/app/[locale]/(dashboard)/`: `admin/storage/page.tsx` · `assets/[id]/page.tsx` · `audit/findings/page.tsx` · `audit/rounds/[id]/page.tsx` · `disposal/page.tsx` · `disposal/batches/page.tsx` · `disposal/batches/[id]/page.tsx` · `maintenance/page.tsx` · `maintenance/pm/page.tsx` · `master-data/employees/[id]/page.tsx` · `my-assets/page.tsx` · `my-assets/[id]/page.tsx`
    - component ใต้ `src/components/`: `admin/asset-state-review-workspace.tsx` · `assets/asset-register-mobile-list.tsx` · `assets/asset-register-table.tsx` · `audit/audit-scan-lookup-card.tsx` · `audit/audit-scan-room-list.tsx` · `audit/audit-scan-search.tsx` · `layout/global-search.tsx`

#### 8.1.3 `tag` (D8 ครึ่งหลัง · ส่วนนี้เป็นเจ้าของ)

```css
@utility tag {
  font-family: var(--font-mono);
  font-size: calc(1em - 1px);
  font-weight: 400;          /* ใหม่ · Plex Mono โหลดแค่ 400/500/600 ห้ามทำตัวหนา */
  white-space: nowrap;
  user-select: all;          /* ใหม่ · คลิกครั้งเดียวเลือกทั้งรหัส */
  :where(a, button) & { user-select: auto; }   /* ใหม่ · ในลิงก์และปุ่มให้คลิกตามปกติ (ต้นแบบ base.css:140) */
}
```

- ตอนนี้ยังไม่มีที่ไหนใช้ `tag` จุดแรกที่ใช้คือ crumbs ในข้อ 8.2
- compile ด้วย Tailwind ของ repo แล้ว ได้กฎ nested ออกมาถูก และ `.tag` อยู่ก่อน `.font-medium` ดังนั้น `tag font-medium` ได้น้ำหนัก 500

#### 8.1.4 token `--neutral-ink`

- เพิ่ม `--neutral-ink: #2A4468;` ในบล็อก `:root` แรกของ `globals.css` ต่อจาก `--muted-foreground` และเพิ่ม `--color-neutral-ink: var(--neutral-ink);` ใน `@theme inline` ตามที่ `design-tokens-contrast.test.ts:103-108` บังคับ
- contrast: card 9.88 · background 9.29 · row-hover 9.12 · canvas 8.73 · accent 8.63 · muted 8.48 ผ่าน AA ทุกพื้น จึงใช้เป็นสีตัวหนังสือได้ด้วย (ชิปกลางใน 2D และ avatar ในเฟส 3)
- ไม่เพิ่ม `--neutral-border` #C9D3E0 ในข้อนี้ เพราะยังไม่มีอะไรใน 8.x ใช้

### 8.2 เส้นทางนำทาง (`Breadcrumbs`)

#### 8.2.1 ตอนนี้ (`src/components/ui/breadcrumbs.tsx`, 30 บรรทัด, ไม่มี directive)

- `aria-label="Breadcrumb"` เป็นภาษาอังกฤษ และยังไม่มี key `common.breadcrumb`
- ตัวสุดท้ายไม่มี `aria-current`
- ทุกตัวมี `truncate`
- ใช้ `text-sm text-muted-foreground` และ hover เป็นสี primary
- ตัวคั่นเป็น chevron 14px
- ไม่รับ `className` และไม่ export type

#### 8.2.2 ใหม่

```ts
export type BreadcrumbItem = { label: string; href?: string; code?: boolean }   // code → แสดงด้วย tag
export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string })
```

| ส่วน | class / markup |
|---|---|
| กรอบ | `<nav aria-label={t("breadcrumb")} className={cn("min-w-0 text-meta text-faint-foreground", className)}>` · `t = useTranslations("common")` |
| รายการ | `<ol className="flex flex-wrap items-center gap-1">` · แต่ละ `<li className="flex min-w-0 items-center gap-1">` · ไม่มี `truncate` ข้อความยาวขึ้นบรรทัดใหม่ |
| ลิงก์ | `<Link className={cn("hover:text-foreground hover:underline underline-offset-3", code && "tag")}>` · ไม่มีขีดเส้นใต้ตอนปกติ สีตามกรอบ (faint) |
| ตัวสุดท้าย | `<span aria-current="page" className={cn("font-medium text-foreground", code && "tag")}>` (ต้นแบบ `.crumbs .tag[aria-current]`: 500, ink) |
| ตัวคั่น | `<ChevronRight className="size-3 shrink-0 text-input" strokeWidth={3} />` ได้ 12px เส้นหนาจริง 1.5px · lucide 1.14.0 ใส่ `aria-hidden` เองเมื่อไม่มี prop a11y (`Icon.mjs:36`) |

- **ไม่มี margin รอบนอก:** ระยะถึงหัวเรื่องเป็นหน้าที่ของ `PageHeader` ใน 2B (`mb-1` ตามต้นแบบ 4px)
- **คงเป็น server component:** `useTranslations` ของ next-intl 4.11.0 มี export สำหรับ react-server ใช้ได้ใน component แบบไม่ async (ทั้ง 11 จุดเรียกจาก server page)
- **ข้อความใหม่:** เพิ่มผ่าน `node scripts/messages-edit.mjs`
  - `common.breadcrumb` = "เส้นทางหน้า" / "Breadcrumb"
  - ไฟล์เปลี่ยนแปลงเดียวกันเพิ่ม `common.noValue` และ `common.baht` ด้วย (ดูข้อ 8.3)
- **contrast:** ข้อความ faint บน canvas 5.09 · ตัวสุดท้าย foreground บน canvas 14.94 · ตัวคั่น `--input` บน canvas 3.06 (ตกแต่งและซ่อนจาก screen reader)

#### 8.2.3 จุดเรียกใช้ 11 จุดใน 11 ไฟล์ (เป็น server page ทั้งหมด และทุกจุดมี 2 รายการ)

ตัวแรกเป็นลิงก์กลับเสมอ ตัวที่สองเป็นตัวสุดท้าย 2A เพิ่ม `code: true` ที่ตัวสุดท้าย 8 จุดที่เป็นรหัส แต่ละจุดแก้บรรทัดเดียวและไม่เปลี่ยน layout

| จุด (`src/app/[locale]/(dashboard)/…`) | ตัวสุดท้าย | `code: true` | ระยะถึง h1 ตอนนี้ |
|---|---|---|---|
| `assets/[id]/page.tsx:885` | `asset.assetTag` | ✓ | ตัวห่อ `mb-2` |
| `audit/rounds/[id]/page.tsx:412` | `round.auditNo` | ✓ | `mb-2` |
| `disposal/[id]/page.tsx:174` | `disposalRequest.disposalNo` | ✓ | `mb-2` |
| `disposal/batches/[id]/page.tsx:55` | `batch.batchNo` | ✓ | h1 `mt-3` |
| `maintenance/[id]/page.tsx:109` | `ticket.repairNo` | ✓ | `mb-2` |
| `maintenance/pm/[id]/edit/page.tsx:28` | `plan.planNo` | ✓ | อยู่ใน `space-y-5` |
| `master-data/employees/[id]/page.tsx:258` | `employee.code` | ✓ | `mb-2` |
| `master-data/suppliers/[id]/page.tsx:154` | `supplier.code` | ✓ | `mb-2` |
| `maintenance/new/page.tsx:46` | `t("createTitle")` (ข้อความเดียวกับ h1) | — | `space-y-5` |
| `maintenance/pm/new/page.tsx:32` | `t("pmCreateTitle")` (เดียวกับ h1) | — | `space-y-5` |
| `maintenance/pm/page.tsx:39` | `t("pmTitle")` (เดียวกับ h1) | — | `space-y-5` |

ลิงก์ตัวแรกยังใช้ `returnToHref` / `returnTo` เดิม test ที่ยึด `backHref={returnToHref}` จึงไม่กระทบ

### 8.3 ค่าว่าง (`Nil`) และตัวเลข (`formatCount` / `formatMoney`)

2A สร้าง component และ helper เท่านั้น ยังไม่แก้จุดเรียกใช้เดิม การนำไปใช้อยู่ใน 2B

#### 8.3.1 ตัวเลขที่นับได้ (ฐานสำหรับ 2B)

| เรื่อง | จำนวน | แยกย่อย |
|---|---|---|
| ค่าว่างแบบ `\|\| "-"` / `?? "-"` / `: "-"` | 156 จุด · 150 บรรทัด · 56 ไฟล์ | หน้าจอ 121 จุด/40 ไฟล์ (74 จุดอยู่ใน 23 ไฟล์ที่มี `<table>` · 79 บรรทัดเป็นรูป `{x \|\| "-"}` / `{x ?? "-"}` ตรง ๆ) · หน้าพิมพ์และ PDF 8/4 · `src/lib` 26/11 · API 1/1 |
| `return "-"` | 23 จุดใน 18 ไฟล์ | รวม `formatDate`, `formatDateTime`, `formatCurrency` (`src/lib/utils.ts:9,19,31`) |
| em dash ที่ใช้เป็นค่าว่าง | 0 | em dash ใน `src` มี 4 จุด แต่ไม่มีจุดไหนเป็นค่าว่าง: 2 จุดเป็นตัวคั่นใน label ตัวเลือก (`checkin-form.tsx:119`, `maintenance-option-select.tsx:73`) อีก 2 จุดอยู่ใน `src/lib` (comment และ regex) |
| `toLocaleString()` ไม่ระบุ locale | 44 จุดใน 17 ไฟล์ (หน้าจอทั้งหมด) | ผลขึ้นกับ locale ของเครื่องที่รัน · มากสุด `admin/storage/page.tsx` 7 จุด |
| `toLocaleString("th-TH"…)` | 56 จุดใน 25 ไฟล์ | หน้าจอ 51/22 · lib 5/3 |
| `toLocaleString(<ตัวแปร locale>)` | 11 จุดใน 7 ไฟล์ | `numberLocale` เป็น th-TH หรือ en-US ซึ่งได้ผลเหมือนกัน |
| `formatCurrency(` (พิมพ์ `฿12,345.00`) | 42 จุดใน 13 ไฟล์ + ตัวประกาศ 1 | หน้าจอ 36/11 (`reports-accounting-view.tsx` 9) · หน้าพิมพ์ 6/2 |
| `formatMoney` ประจำไฟล์ | 1 (`depreciation-policy-builder.tsx:447`) | พิมพ์ `64,900.00` แบบ th-TH ไม่มี ฿ ผลเหมือน helper ใหม่ ชื่อซ้ำ จึงต้องลบตัวในไฟล์ตอนนำ helper ใหม่ไปใช้ |

#### 8.3.2 `Nil` (`src/components/ui/nil.tsx` ใหม่ · ไม่มี directive)

```ts
export function Nil({ label, className }: { label?: string; className?: string })
// <span data-slot="nil" className={cn("text-faint-foreground", className)}>
//   <span aria-hidden="true">—</span><span className="sr-only">{label ?? t("noValue")}</span>
// </span>
export function orNil(value: React.ReactNode, label?: string): React.ReactNode   // isBlankValue(value) ? <Nil label={label} /> : value
```

- ใช้ U+2014 em dash ตามต้นแบบ (`register.html:93` ใช้ `.nil` + `.vh`)
- ข้อความที่ screen reader อ่าน:
  - ค่าเริ่มต้นคือ `common.noValue` = "ไม่มีข้อมูล" / "None"
  - จุดที่รู้บริบทให้ส่ง `label` ของจุดนั้น เช่น "ไม่มีผู้ถือครอง"
- สี faint ใช้บนพื้นกลางเท่านั้น ห้ามใช้บนพื้นอ่อนสีของ notice หรือป้าย (กฎ D2)
- `orNil` นับเป็นค่าว่างเฉพาะ `null`, `undefined` และสตริงว่างหรือมีแต่ช่องว่าง
  - เลข `0` และ `false` เป็นค่า ไม่ใช่ค่าว่าง ต่างจาก `|| "-"` ที่ใช้อยู่ ซึ่งเปลี่ยน 0 เป็น "-"

#### 8.3.3 `src/lib/display-format.ts` (ใหม่ · TS ล้วน ไม่มี import · test import ได้โดยตรง)

```ts
export function isBlankValue(value: unknown): boolean
export function formatCount(value: number): string
export function formatCount(value: number | null | undefined): string | null
export function formatMoney(value: number, options?: { unit?: string }): string
export function formatMoney(value: number | null | undefined, options?: { unit?: string }): string | null
```

- **locale:** ตายตัวที่ `th-TH` เสมอ ไม่ใช้ locale ของเครื่อง
  - ใช้ instance ระดับ module 2 ตัว: `new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 })` และ `new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
  - th-TH ใช้เลขอารบิก (`numberingSystem: "latn"`) และคั่นหลักแบบเดียวกับ en-US จึงไม่ต้องรับ locale
- **ผลที่ได้:** ตรวจกับ Node 24 แล้ว
  - `formatCount(1751)` → `1,751`
  - `formatMoney(64900)` → `64,900.00`
  - `formatMoney(-1500.5)` → `-1,500.50`
  - `formatMoney(64900, { unit: "บาท" })` → `64,900.00` + U+00A0 + `บาท`
- **ค่าว่าง:** `null` / `undefined` ได้ `null` กลับไป ผู้เรียกเขียน `formatMoney(x) ?? <Nil />`
- **ค่า Prisma `Decimal`:** ผู้เรียกแปลงด้วย `Number()` เอง
- **ไม่ใส่ CSS ใน helper:** ตัวเลขเรียงแนวด้วย class `num` ที่ตัวห่อ (`globals.css:202`) ส่วนในตาราง base rule ทำให้แล้ว
- **หน่วยเงิน:**
  - ใช้ "บาท" ต่อท้ายตัวเลข ไม่ใช้ ฿ นำหน้า (ต้นแบบ `asset-detail.html:85`, `DIRECTION.md:37` "64,900.00 บาท") ทศนิยม 2 ตำแหน่งเสมอ
  - คำหน่วยมาจาก `common.baht` = "บาท" / "THB" ส่งเข้ามาทาง `unit` lib จึงไม่ต้องใช้ i18n
  - ในตาราง หน่วยอยู่ที่หัวคอลัมน์ เช่น "มูลค่า (บาท)" (`components.html:111`) และในเซลล์มีแต่ตัวเลข
- **`formatCurrency` / `formatDate` / `formatDateTime`:** ไม่เปลี่ยนใน 2A เพราะใช้ใน `title`, หน้าพิมพ์ และข้อความแปล

#### 8.3.4 กฎการนำไปใช้ใน 2B (ไว้กำหนดขอบเขต)

- **เปลี่ยนเป็น `Nil` / `orNil`:**
  - ค่าว่างที่แสดงเป็นข้อความบนหน้าจอเอง (`{x || "-"}`) รวมถึง helper `Info` ประจำไฟล์และ KeyValueList / DataTable / StatStrip
  - วันที่เขียนแบบ `date ? formatDate(date) : <Nil />`
- **คงเป็น `"-"`:**
  - หน้าพิมพ์และ PDF (8 จุด)
  - ข้อมูลที่พิมพ์ลงป้าย (`asset-label-batch-tool.tsx:590-608`, `asset-management/labels/page.tsx:105,130`)
  - ค่าที่อยู่ในประโยคแปล เช่น `t("sheetStatusJustChecked", { name: x ?? "-" })` ที่ `audit-scan-check-form.tsx:178,186` ซึ่ง `audit-scan-check-ui.test.ts:30` ยึดไว้
  - สตริงใน `src/lib` และ API
- **ตัวเลขนอกตาราง:** ใช้ `formatCount` / `formatMoney` + `num` และแก้ 44 จุดที่ไม่ระบุ locale ในงานเดียวกัน
- **`formatCurrency(Number(x ?? 0))`:** มี 2 จุดใน `suppliers/[id]/page.tsx` ทำให้ค่าที่ไม่มีแสดงเป็น 0.00 ให้เปลี่ยนเป็น `x == null ? <Nil /> : …`
- **หน้าพิมพ์ 2 ไฟล์ที่ใช้ `formatCurrency` (6 จุด):** ตัดสินใน 2D

### 8.4 ไฟล์ที่เปลี่ยนใน 2A (ส่วนนี้)

| ไฟล์ | เปลี่ยน |
|---|---|
| `src/components/ui/badge-variants.ts` | `statusBadgeVariants` ขนาดเดียว · marker neutral/muted เป็น `bg-neutral-ink` · ไม่ยุ่งกับ `badgeVariants` |
| `src/components/ui/status-badge.tsx` | เอา `size` ออก |
| 19 ไฟล์ในข้อ 8.1.2 | ลบ `size="xs\|sm"` 52 จุด (commit เชิงกลแยก) |
| `src/app/globals.css` | `--neutral-ink` + `--color-neutral-ink` · `@utility tag` เพิ่ม 3 บรรทัด |
| `src/components/ui/breadcrumbs.tsx` | เขียนใหม่ตามข้อ 8.2.2 |
| 8 หน้าในข้อ 8.2.3 | เพิ่ม `code: true` |
| `messages/th.json`, `messages/en.json` | `common.breadcrumb`, `common.noValue`, `common.baht` ผ่าน `scripts/messages-edit.mjs` |
| `src/components/ui/nil.tsx` (ใหม่) | `Nil`, `orNil` |
| `src/lib/display-format.ts` (ใหม่) | `isBlankValue`, `formatCount`, `formatMoney` |
| `DESIGN.md` | Status Badges (22px, 13/20, 6px, neutral-ink, ไม่มี size) · บรรทัด `tag` (:229 น้ำหนัก 400, `user-select`) · Navigation เพิ่ม Breadcrumbs · ส่วนใหม่สั้น ๆ เรื่องค่าว่างและตัวเลข (`Nil`, บาท, th-TH) |

### 8.5 Test

แก้ test เดิม:

| ไฟล์:บรรทัด | ตอนนี้ยึด | แก้เป็น |
|---|---|---|
| `tests/status-badge.test.ts:20-29` | วนทั้ง `xs` และ `sm` | เรียก `statusBadgeVariants({ tone })` · ยัง assert `border-transparent`, `text-muted-foreground` และห้ามมี `bg-` / `px-` |
| `tests/status-badge.test.ts:31-38` | `px-2` (xs) และ `px-2.5` (sm) | ป้ายต้องจัดการมี `px-2` · ห้ามมี `px-2.5` |
| `tests/status-badge.test.ts:43` | regex ตัดสีออกก่อนเทียบรูปทรง | เพิ่ม `neutral-ink` ในรายการสีที่ตัด |
| `tests/status-badge.test.ts:50-51` | `h-0\.5 w-\[7px\]` | เพิ่ม assert `bg-neutral-ink` |
| `tests/status-badge.test.ts:60-64` | ไม่มี `color?:` | เพิ่ม: source ต้องไม่มี `size` |
| `tests/asset-detail-ux.test.ts:37-38` | `<StatusBadge size="xs" label=…` | `<StatusBadge label=…` |
| `tests/asset-register-table-ui.test.ts:115-116` | `<StatusBadge size="xs" label=…` | `<StatusBadge label=…` (บรรทัด :193 ไม่ต้องแก้) |
| `tests/visual-foundation-guards.test.ts:50` | มี `@utility tag \{` | `@utility tag \{[^}]*font-weight: 400;[^}]*user-select: all;` |

เพิ่ม test:

- **`tests/status-badge.test.ts`:**
  - base มี `h-5.5`, `text-meta`, `rounded-control`
  - ห้ามมี `\bpy-`, `\btext-(xs|sm)\b`, `\brounded-md\b`
  - `cn(statusBadgeVariants({ tone: "muted" }), "shrink-0")` ยังมี `text-meta` อยู่ (กันปัญหา tailwind-merge ในข้อ 8.0)
- **`tests/design-tokens-contrast.test.ts`:** `neutral-ink` ผ่าน AA บน card, background, canvas, muted, accent · test การ map เข้า `@theme` (:103-108) ครอบให้เอง
- **`tests/breadcrumbs-ui.test.ts` (ใหม่ อ่าน source):**
  - มี `useTranslations("common")` และ `aria-label={t("breadcrumb")}` · ห้ามมี `"Breadcrumb"` ตรง ๆ และ `"use client"`
  - มี `aria-current="page"` · มี `<ol` · ห้ามมี `truncate`
  - มี `text-meta text-faint-foreground`, `size-3` + `text-input` + `strokeWidth={3}` และ `code && "tag"`
  - `<Breadcrumbs` ทั้งหมดใน `src` มี 11 จุด และมี `code: true` 8 จุด
  - ข้อความ th/en ของ `common.breadcrumb`, `common.noValue`, `common.baht` ตรงตามข้อ 8.2-8.3
- **`tests/display-format.test.ts` (ใหม่):**
  - ค่าในข้อ 8.3.3 · `formatCount(0)` = `"0"` · `formatCount(null)` / `formatMoney(undefined)` = `null` · หน่วยคั่นด้วย U+00A0
  - `isBlankValue`: `""` และ `"  "` เป็นค่าว่าง · `0` และ `false` ไม่ใช่
  - source มี `new Intl.NumberFormat("th-TH"` และไม่มี `toLocaleString(`
  - source ของ `nil.tsx` มี `aria-hidden="true">—<`, `sr-only`, `t("noValue")` และไม่มี `"use client"`

### 8.6 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | ขนาดตัวอักษรของป้าย | 13/20 (`text-meta`) | ต้นแบบ `base.css:347` · หน้าเปรียบเทียบที่อนุมัติวาดตัวอย่าง 22px ด้วยตัว 12/16 แต่ต้นแบบคือ 13/20 และพอดี 22px กับขอบ 1px |
| 2 | วิธีได้ความสูง 22px | `h-5.5` ตายตัว | ต้นแบบ "Fixed 22px = the table line" · กันป้ายถูกยืดใน flex ที่ไม่ได้ใส่ `items-center` · หน่วย rem จึงขยายตามขนาดฟอนต์ของเบราว์เซอร์ |
| 3 | padding ข้างของป้ายต้องจัดการ | `px-2` อย่างเดียว | ต้นแบบ `padding: 0 8px` |
| 4 | prop `size` | ลบออกจาก type และจุดเรียก 52 จุดใน 2A | ถ้าลบตกไป build จะไม่ผ่าน · ไม่เหลือ prop ที่ไม่มีผลให้ 2B/2C ลอกต่อ · test ต้องแก้แค่ 4 regex |
| 5 | สีเครื่องหมาย neutral | token ใหม่ `--neutral-ink` #2A4468 | ต้นแบบและ `e-light-shell.json` ใช้ค่านี้ · AA ≥ 8.48 · มีที่จะใช้ต่อ (ชิปกลาง 2D, avatar เฟส 3) · ไม่เพิ่ม `--neutral-border` |
| 6 | helper `.badges` (กลุ่มป้าย) | ไม่สร้างใน 2A | ยังไม่มีที่ใช้ซ้ำ · 2B ใช้ `flex flex-wrap gap-x-3 gap-y-1` ใน PageHeader meta |
| 7 | `Badge` / `badgeVariants` ที่ไม่มีใครใช้ | ไม่ลบใน 2A | ตาม critic G15 ให้ลบใน 2D |
| 8 | tone `primary` และการจับคู่สถานะที่ไม่ตรงต้นแบบ | ไม่เปลี่ยน | เฟส 1 §7 กำหนดไว้ให้เฟส 3 |
| 9 | `tag` ในลิงก์และปุ่ม | `:where(a, button) & { user-select: auto }` | ต้นแบบ `base.css:140` (`a .tag`) · เพิ่ม button เพราะแอปใช้ปุ่มทั้งแถว |
| 10 | ข้อความ `aria-label` ของ crumbs | "เส้นทางหน้า" / "Breadcrumb" ใน `common.breadcrumb` | ต้นแบบ `asset-detail.html:65` |
| 11 | ที่มาของคำแปลใน Breadcrumbs | เรียก `useTranslations("common")` ใน component | ทำแบบเดียวกับ `tCommon` ใน `accessible-dialog.tsx:42` · จุดเรียก 11 จุดไม่ต้องส่ง prop |
| 12 | โครงรายการของ crumbs | ใช้ `ol > li` | ต้นแบบไม่ได้ใช้ list แต่ WAI-ARIA APG แนะนำ ol ให้ screen reader บอกจำนวน · หน้าตาเหมือนกัน |
| 13 | ตัวคั่น | `ChevronRight` 12px เส้น 3 สี `--input` | ต้นแบบใช้ `line-strong` ซึ่งในชุดสีที่เลือกออกมาเป็น `--input` แล้ว (critic §3 #1) ไม่ต้องเพิ่ม token |
| 14 | เส้นใต้ตอน hover | `underline-offset-3` | ต้นแบบไม่ระบุ offset แต่ `.link` (`base.css:232`) ใช้ 3 · ไม่ทับสระล่างภาษาไทย |
| 15 | ข้อความยาว | ขึ้นบรรทัดใหม่ ไม่ตัดท้าย | ต้นแบบ `.crumbs` ใช้ `flex-wrap` · รหัสห้ามถูกตัด |
| 16 | `code: true` ที่ 8 จุด | ทำใน 2A | แก้บรรทัดเดียวต่อจุด · ได้หน้าตาครบในงานเดียว |
| 17 | ระยะ crumbs ถึง h1 (`mb-2` 6 จุด · `mt-3` 1 จุด · `space-y-5` 4 จุด) | ไม่แก้ใน 2A | `PageHeader` ใน 2B ทำทีเดียว · 2A ไม่จัดหน้า |
| 18 | รูปแบบ `Nil` | em dash ที่ซ่อนจาก screen reader + ข้อความ `sr-only` | ต้นแบบ `register.html:93` · ตอนนี้ screen reader อ่าน "-" ว่า "ขีด" |
| 19 | ข้อความเริ่มต้นของ `Nil` | `common.noValue` "ไม่มีข้อมูล" / "None" · ส่ง `label` แทนได้ | ตาม critic G3 · ต้นแบบใช้ข้อความตามบริบท ("ไม่มีผู้ถือครอง") |
| 20 | อะไรนับเป็นค่าว่าง | `null`, `undefined`, สตริงว่างหรือมีแต่ช่องว่าง | `0` ต้องแสดงเป็น 0 · `\|\| "-"` ที่ใช้อยู่ซ่อนเลข 0 |
| 21 | หน่วยเงิน | ตัวเลข + NBSP + "บาท" · ทศนิยม 2 ตำแหน่ง · ตารางใส่หน่วยที่หัวคอลัมน์ | ต้นแบบ (`asset-detail.html:85`, `mobile.html:187`, `components.html:111`) และ DIRECTION "ledger precision" |
| 22 | คำหน่วยภาษาอังกฤษ | "THB" | รูปแบบปกติต่อท้ายตัวเลขในหน้าอังกฤษ |
| 23 | locale ของตัวเลข | th-TH ตายตัว ไม่รับพารามิเตอร์ | ได้ผลเหมือน en-US ทุกตัว · กันผลเปลี่ยนตามเครื่องที่รัน (44 จุด) |
| 24 | ค่าว่างใน helper | overload: รับ `number` คืน `string` · รับค่าที่อาจว่างคืน `string \| null` | ใช้ใน `t()` ได้โดยไม่ต้องใส่ `!` · คู่กับ `?? <Nil />` |
| 25 | `formatCurrency` | คงไว้ใน 2A | 42 จุดรวมหน้าพิมพ์ · 2B ย้ายจุดบนหน้าจอ · ตัดสินเรื่องหน้าพิมพ์ใน 2D |
| 26 | ที่อยู่ของ helper | `src/lib/display-format.ts` ไฟล์เดียว (`isBlankValue` อยู่ด้วย) | test import ได้โดยตรง (ไฟล์ `.tsx` import ไม่ได้) |

### 8.7 ความเสี่ยง

- **ป้าย 9 จุดเล็กลงจาก 32 เป็น 22px ก่อนที่ PageHeader จะมา (2B)**
  - ป้ายข้างปุ่มกลับ 44px (`disposal/batches/[id]:61`) และข้างกล่องนับ 32px (`audit/rounds/[id]:614`) จะดูไม่เท่ากันช่วงหนึ่ง
  - ยอมรับได้ เพราะ 2B ย้ายป้ายหัวหน้าไปไว้ใน meta
- **ป้าย 50 จุดกว้างขึ้นราว 8% (ตัวอักษร 12 → 13)**
  - คอลัมน์สถานะ 132px และสภาพ 96px ของทะเบียน (`asset-register-columns.ts:66-67`) อาจตัดคำเร็วขึ้น
  - รายการบนมือถือมีป้าย 3 ตัวต่อแถว (`asset-register-mobile-list.tsx:62-67`)
  - ต้องตรวจบนแอป dev ที่ 1440 และ 375 ด้วยข้อความไทย
- **`h-5.5` ตายตัว:** ถ้าผู้ใช้ตั้งขนาดฟอนต์ขั้นต่ำของเบราว์เซอร์เกิน 13px ข้อความจะล้นกรอบ แต่ไม่ถูกตัด เพราะกรอบนอกไม่มี `overflow-hidden`
- **`cn` ลบ `text-meta`:** ถ้าข้อ 8.0 ไม่เสร็จก่อน ป้ายและ crumbs จะไม่ได้ขนาด 13px และไม่มี error บอก มี test ในข้อ 8.5 กันไว้
- **`useTranslations` ใน server component แบบ sync:** ยังไม่เคยใช้ใน repo นี้ ต้องตรวจว่า HTML ที่ server ส่งมามี `aria-label="เส้นทางหน้า"`
- **crumbs สูง 20px บนมือถือ:**
  - ผ่าน WCAG 2.5.8 ด้วยข้อยกเว้นเรื่องระยะห่าง เพราะทุกจุดมีลิงก์เดียว
  - ปุ่มกลับยังอยู่จนกว่าจะตัดสิน D10 ใน 2B
- **`user-select: all` บนรหัสใน crumbs:** คลิกครั้งเดียวเลือกทั้งรหัส (ตั้งใจให้เป็นแบบนี้) แต่การลากเลือกข้ามหลาย crumb จะเลือกรหัสทั้งตัวเสมอ
- **ข้อความ `sr-only` ของ `Nil` ติดไปตอนคัดลอก:** ผู้ใช้ที่ลากคัดลอกตารางจะได้ "—ไม่มีข้อมูล" แทน "-" ต้องตรวจตอนนำไปใช้ใน 2B (เทียบกับการวางลง Excel)
- **การลบ `size` เชิงกล:** ไม่ใช้ sed ทั้งไฟล์ (ข้อ 8.1.2) · ตรวจผลด้วย `git diff --stat` ว่าได้ 19 ไฟล์ 52 บรรทัด และรัน `npm run verify`

### 8.8 ไม่อยู่ในส่วนนี้

| เรื่อง | ไปที่ |
|---|---|
| ใช้ `Nil` / `formatCount` / `formatMoney` / `num` จริง · แก้ `toLocaleString()` 44 จุด · ระยะ crumbs ถึง h1 และ `PageHeader` · ปุ่มกลับบนหน้าที่มี crumbs (D10) · หน้าที่รหัสใน crumb ซ้ำกับ h1 (ให้ h1 เป็นชื่อแทน) · ห่อรหัส 79 จุดด้วย `tag` | 2B |
| `StatusBadge` ชื่อซ้ำประจำไฟล์ (notifications, IntegrationClientManager) และ pill สถานะที่เขียนเอง (critic G1) · ลบ `Badge` / `badgeVariants` · `formatCurrency` ในหน้าพิมพ์ | 2D |
| แยก "พร้อมใช้งาน" กับ "ใช้งานอยู่" และปรับ tone ให้ตรงต้นแบบ · `.facts` ในหน้ารายละเอียดทรัพย์สิน | เฟส 3 |
