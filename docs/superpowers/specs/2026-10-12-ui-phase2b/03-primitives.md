> ร่างส่วนนี้ของสเปก UI เฟส 2B "หน้ารายการและโครงหน้า" · ข้อตัดสิน B1–B10 (`2026-10-12-ui-phase2b/00-decisions.md`) และ R-a…R-s (`2026-10-12-ui-phase2b/00-synthesis.md` ข้อ 1.1) ใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน · ตัวเลขและบรรทัดอ้างที่ `master` `d38a0ee`

## 3. ของกลางใหม่ของ 2B

ส่วนนี้กำหนด primitive ที่ 2B-1 สร้างใน `src/components/ui/` (งาน 3–12 ของ plan 2B-1 ในตารางข้อ 10.3) ก่อนย้ายหน้าใด ๆ งานย้ายหน้าเป็นของส่วนกลุ่มหน้า ตาราง "จุดเรียก" ในแต่ละข้อบอกแค่ว่าใครจะใช้และอยู่ plan ไหน

path ในส่วนนี้นับจาก `src/components/` ยกเว้นที่ขึ้นต้นด้วย `src/`, `tests/`, `docs/`, `messages/` · **D/** = `src/app/[locale]/(dashboard)/` · **MK/** = `docs/superpowers/specs/2026-10-10-ui-foundation/` · **DS** = `DESIGN.md` · **VFG** = `tests/visual-foundation-guards.test.ts` · **FMG** = `tests/form-migration-guards.test.ts`

**ผลที่พนักงานเห็นทันทีตอน primitive ลง** (ก่อนย้ายหน้า เพราะแก้ของที่มีผู้เรียกอยู่แล้ว)
- `ClickableTableRow` 19 จุดใน 18 ไฟล์: แถวค้างสีตอนโฟกัสอยู่ในแถว หรือตอนเมนูในแถวเปิด · สีจางออกใน 150ms
- `Pagination` ของทะเบียน (`assets/asset-register-table.tsx:683`): ปุ่มไม่มีลูกศร สูง 32 บนคอม · "หน้า x จาก y" ย้ายไปทางซ้ายของปุ่ม
- `MasterDataHeader` 3 จุดที่ยังไม่ย้าย (`D/assets/page.tsx:327`, `D/audit/findings/page.tsx:195`, `D/audit/rounds/page.tsx:254`): หัวเรื่องน้ำหนัก 600 · ปุ่มสร้าง 36 บนคอม (เดิม 44)
- `MasterDataSearch` 6 จุด: ไม่มีกรอบ ช่องและปุ่มสูง 36 บนคอม (B3(4))

**ตรวจแล้ว (read-only)**
- อ่านโค้ดทุกบรรทัดที่อ้างที่ `d38a0ee` · working tree ไม่มีไฟล์ใน `src/` หรือ `tests/` ที่แก้ค้าง
- คอมไพล์ class ทุกตัวในส่วนนี้ด้วย Tailwind ของ repo กับ `src/app/globals.css` ในหน่วยความจำ (`scratchpad/p2b-spec/work/s3-tw-probe.mjs` · รายการ `s3-classes.txt`, `s3-sel.txt`, `s3-sel2.txt`, `s3-doc-classes.txt`) ทุก class สร้าง CSS ได้ ไม่มี token ใหม่ (2A I21)
- นับด้วย `scratchpad/p2b-spec/work/s3-count.mjs` (regex บน `src/**/*.{ts,tsx}` แปลง CRLF แล้ว · ผลที่ `s3-count.txt`)
- specificity ที่ต้องจำ (อ่านจาก CSS ที่คอมไพล์):
  - `first:pl-4` / `last:pr-4` ของเซลล์ primitive ชนะ class ธรรมดา (0,1,0) ผู้เรียกจึงเปลี่ยน padding ของคอลัมน์แรกและสุดท้ายด้วย class ธรรมดาไม่ได้ (I3)
  - `[&>tr:last-child>td]:border-b-0` = (0,2,2) ชนะ `border-b` บน td
  - `group-hover/row:` อยู่ใน `@media (hover: hover)` จอสัมผัสจึงไม่ค้างสี
- Next 16.4.0: `Link` มี `onNavigate` ที่เรียก `preventDefault()` ได้ และทำงานเฉพาะการเปลี่ยนหน้าฝั่ง client · Ctrl+คลิกยังเปิดแท็บใหม่ (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:453-503`)
- ของ 2C ที่ต้องใช้มีครบใน master แล้ว: `ui/segmented.tsx` · `Field labelAction` (`ui/field.tsx:24`, `:58-62`) · handle `open()`/`hideTrigger`/`returnFocusRef` (`tests/dialog-trigger-handles.test.ts:14-52`)

### 3.1 งานและลำดับ

| งาน | ของ | ไฟล์ | test ที่แก้ | test ใหม่ | ต้องรอ |
|---|---|---|---|---|---|
| 3 | `PageHeader` · `PageBackLink` · `MasterDataHeader` เป็นตัวห่อบาง (R-h · I1 · I2) | ใหม่ `ui/page-header.tsx` · `master-data/master-data-layout.tsx:5-40` | `tests/breadcrumbs-ui.test.ts:37-42` (R-i) · `tests/asset-register-filter-ui.test.ts:112-119` · `tests/supplier-adaptive-ui.test.ts:58` (I2) | `tests/list-primitives-ui.test.ts` (หัวหน้า) | 1 |
| 4 | `DataTable` ทั้งชุด · `TableEmptyRow` · `DataTableScrollArea` · `ClickableTableRow` `group/row` | ใหม่ `ui/data-table.tsx` · ใหม่ `ui/data-table-scroll.tsx` · `ui/clickable-table-row.tsx:56` · `messages/*.json` | — | เดียวกัน (ตาราง) | 1 |
| 5 | ขยาย `Pagination` · `src/lib/list-pagination.ts` (ข้อ 5.9.1) | `ui/pagination.tsx:1-71` · `messages/*.json` | — (`tests/asset-register-building-blocks-ui.test.ts:8-17` ผ่านต่อ) | เดียวกัน (แบ่งหน้า) · `tests/list-pagination.test.ts` | 4 |
| 6 | `FilterSelect` · `FilterChipList` · `FilterFormActions` (ข้อ 6.3.2) | ใหม่ `ui/filter-select.tsx` · ใหม่ `ui/filter-chips.tsx` · `ui/filter-panel.tsx` (เพิ่ม `FilterFormActions`) | — | เดียวกัน · `tests/list-filters-ui.test.ts` ข้อ 2 (I16) | 1 |
| 7 | `RowActions` ช1 | ใหม่ `ui/row-actions.tsx` · `ui/dropdown-menu.tsx:16`, `:22` (เพิ่ม `export`) · `messages/*.json` | — (`tests/menu-primitives-ui.test.ts:60-103` ผ่านต่อ) | ใหม่ `tests/row-actions-ui.test.ts` | 4 |
| 8 | `TabNav` | ใหม่ `ui/tab-nav.tsx` | — | `tests/list-primitives-ui.test.ts` | 1 |
| 9 | `StatStrip` | ใหม่ `ui/stat-strip.tsx` | — | เดียวกัน | 1 |
| 10 | `KeyValueList` | ใหม่ `ui/key-value-list.tsx` | — | เดียวกัน | 1 |
| 11 | `ContentPanel` หัวมีเส้นคั่น · `flush` · `ContentPanelRows` | `ui/content-panel.tsx:5-28` | — | เดียวกัน | 1 |
| 12 | ไส้ใน `MasterDataSearch` → `SearchField` + `Button` (O20) | `master-data/master-data-layout.tsx:42-80` | — | เดียวกัน | 3 (ไฟล์เดียวกัน) |

- เลขงานตามตารางข้อ 10.3 (งาน 1 = guard · งาน 2 = เมนูข้าง) · 1 งาน = 1 commit · แต่ละงานจบด้วย `npm test` และ `npx tsc --noEmit` · ไม่ deploy (B9)
- งาน 3 ก่อน 12 เพราะแก้ไฟล์เดียวกัน · งาน 4 ก่อน 5 และ 7 · ทุกงานรองาน 1 · งานอื่นสลับได้
- ข้อความใหม่ลงในงานแรกที่ใช้ ผ่าน `node scripts/messages-edit.mjs` (ข้อ 3.17)

### 3.2 กติการ่วมของ primitive ใหม่

| เรื่อง | กติกา |
|---|---|
| ที่อยู่ | `src/components/ui/` · ทุกตัวมี `data-slot` ตามชื่อ |
| server/client | ไม่มี `"use client"` และไม่มี hook นอกจาก `useId` (ผ่าน `Field`) และ `useTranslations` ของ next-intl (แบบ `ui/breadcrumbs.tsx:15`, `ui/nil.tsx:9`) · `PageHeader` / `PageBackLink` ไม่มี hook เลย ใช้ในฟอร์ม client ได้ (I1) · ยกเว้น 2 ไฟล์ client: `ui/row-actions.tsx` และ `ui/data-table-scroll.tsx` · prop ที่เป็นฟังก์ชัน (`onSelect`, `onNavigate`, `onClick`) ส่งได้จากคอมโพเนนต์ client เท่านั้น หน้า server ส่งแค่ข้อมูล (R-j) |
| class | token เดิมเท่านั้น (2A I21) · ห้าม `shadow-(sm\|md\|lg\|xl\|2xl)` (R2 budget 0 ของไฟล์ใหม่, VFG:260-272) · `shadow-[inset_…]` ใช้ได้ (ไม่อยู่ใน regex R2) · ห้าม `opacity-` · ห้าม `rounded-[…]` · ห้าม `leading-tight` / `leading-4` · ห้าม `flex-col-reverse` (GD4 budget 0 ทุกไฟล์ใน `ui/`, FMG:589-603) · ห้าม `bg-muted/NN`, `bg-accent/NN`, `border-border/NN` (R7) และสี tone ที่มี `/NN` (R1) · วงโฟกัสใช้ `ring-ring` เท่านั้น (VFG:10-13) |
| ขนาด | ต่ำกว่า `md` สูงอย่างน้อย 44px (`min-h-11`) · สลับที่ `md` เหมือนปุ่มและช่อง (DS:572) |
| ระยะขอบแนวนอน | 16px บนมือถือ 20px ตั้งแต่ `md` (`px-4 md:px-5`, ต้นแบบ `--gutter` `MK/base.css:79`, `:480`) |
| การรวม class | ผ่าน `cn()` (`src/lib/utils.ts:7-19` รู้จัก `text-meta` และ `rounded-control`) · class string ที่ test ต้องอ่านเขียนเป็นค่าคงที่ในบรรทัดเดียว (แบบ `ui/segmented.tsx:24-30`) |
| สี | สีสถานะอยู่ได้แค่ในป้ายสถานะ ข้อความเตือน และปุ่มลบ (DS:258) · การเลือกใช้ `primary-soft` |
| ไม่แตะ | chrome ของ `ui/sheet.tsx`, `ui/dialog.tsx`, `ui/accessible-dialog.tsx`, `ui/alert-dialog.tsx`, `ui/field.tsx`, `ui/file-dropzone.tsx` (2C) · FMG · token และ `tests/design-tokens-contrast.test.ts` |

### 3.3 `PageHeader` และ `PageBackLink` (`ui/page-header.tsx`, server-safe)

**ตอนนี้**
- หัวหน้ากลางมีตัวเดียวคือ `MasterDataHeader` (`master-data/master-data-layout.tsx:5-40`) 11 จุด · บังคับ `createHref`/`createLabel` (`:15-16`) จึงใช้กับหน้าอ่านอย่างเดียวไม่ได้ · h1 `text-2xl font-bold` (`:24`) · ปุ่มสร้างเขียนเอง `min-h-11` ทุกขนาดจอ (`:31`)
- `<h1` ที่มี `text-2xl` 58 จุด (grep `<h1` แล้วกรอง `text-2xl`) · `PageHeader` ประจำไฟล์ `D/my-assets/page.tsx:163-170`
- ระยะ crumbs → h1 มี 3 แบบ: `mb-2` 6 จุด · `mt-3` 1 จุด · `space-y-5` 4 จุด (A/08:297) · `Breadcrumbs` ไม่มี margin เอง (`ui/breadcrumbs.tsx:13`, DS:493)
- ปุ่มกลับ 4 แบบ ไอคอนผิด 3 จุด (`p2b-map/03-frames-nav.md` §D)

**API**

```ts
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs"

export type PageHeaderProps = {
  title: React.ReactNode            // เนื้อของ h1 · ข้อความ หรือรหัส <span className="tag font-medium"> · หน้าที่ crumb สุดท้ายเป็นรหัส ให้ title เป็นชื่อ ไม่ใช่รหัสซ้ำ (A/08:331)
  meta?: React.ReactNode            // แถวใต้หัวเรื่อง: รหัส <span className="tag"> · <StatusBadge> · ข้อเท็จจริง (จำนวน เวลาข้อมูล) · คำอธิบายหน้าเป็นตัวท้าย (subtitle เดิม, A/08:286)
  actions?: React.ReactNode         // Button / buttonVariants size="md" · ⋯ ก่อน ปุ่มหลักท้ายสุด (K8, DS:376)
  back?: React.ReactNode            // <PageBackLink …/> เท่านั้น · วางหน้า actions
  breadcrumbs?: BreadcrumbItem[]    // ส่งต่อให้ <Breadcrumbs> ตัวเดียวในไฟล์นี้ · ส่งเป็น array literal ในหน้าเสมอ (test อ่านจาก source)
  compactOnMobile?: boolean         // ทะเบียนเท่านั้น: หัวเรื่องกับปุ่มแถวเดียวต่ำกว่า md · ซ่อน meta
  className?: string                // ระยะรอบนอกและจัดวางเท่านั้น · ตัวหัวไม่มี margin ของตัวเอง
}
export function PageHeader(props: PageHeaderProps): React.JSX.Element

export type PageBackLinkProps = {
  href: string                                          // พา returnTo ที่หน้ารับมา (B2) · ไม่สร้าง URL เอง
  label: string                                         // บังคับ · ข้อความของหน้านั้น: t("back") ของ common, backToQueue, backToList, backToInbox, backToScan
  onClick?: React.MouseEventHandler<HTMLAnchorElement>  // ผู้เรียก client เท่านั้น เช่น confirmNavigation (master-data/supplier-form.tsx:157)
  className?: string                                    // จัดวางเท่านั้น
}
export function PageBackLink(props: PageBackLinkProps): React.JSX.Element
```

ทั้งสองตัวไม่มี `"use client"` และไม่มี hook (แบบ `Button`) ใช้ได้ทั้งในหน้า server และฟอร์ม client (I1) · `back` เป็น node ทำให้ literal `href={returnToHref}` อยู่ในหน้าต่อ (pin 6 จุดผ่านโดยไม่แก้ ข้อ 9.9 ข้อ 2) · ผู้เรียกเขียน `back={<PageBackLink href={…} label={tCommon("back")} />}`

**markup**

```tsx
<header data-slot="page-header" className={cn("min-w-0", className)}>
  {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-1" /> : null}
  <div className={compactOnMobile ? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"}>
    <div className="min-w-0">
      <h1 className={cn("text-2xl font-semibold text-balance break-words text-foreground", compactOnMobile && "max-md:text-xl")}>{title}</h1>
      {meta ? <div data-slot="page-header-meta" className={cn("mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground", compactOnMobile && "max-md:hidden")}>{meta}</div> : null}
    </div>
    {back || actions ? (
      <div data-slot="page-header-actions" className={cn("flex flex-wrap items-center gap-2 md:justify-end", compactOnMobile && "shrink-0")}>
        {back}
        {actions}
      </div>
    ) : null}
  </div>
</header>
```

```tsx
export function PageBackLink({ href, label, onClick, className }: PageBackLinkProps) {
  return (
    <Link href={href} onClick={onClick} data-slot="page-back-link" className={cn(buttonVariants({ variant: "outline", size: "md" }), "min-w-11 max-md:px-0", className)}>
      <ArrowLeft aria-hidden="true" />
      <span className="max-md:sr-only">{label}</span>
    </Link>
  )
}
```

**ค่าเทียบต้นแบบ**

| ส่วน | ต้นแบบ | class |
|---|---|---|
| crumbs | `.crumbs` `margin-bottom: 4px` (`MK/base.css:208`) | `mb-1` |
| แถวหัว | `.page-head` grid `minmax(0,1fr) auto`, gap 12/24, align start (`:212`) · คอลัมน์เดียวที่ ≤640 (`:487-489`) | `flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6` · ใช้ flex ไม่ใช้ grid: grid บีบหัวเรื่องเหลือ 0 เมื่อมี 5 ปุ่ม (`audit/rounds/[id]`) · สลับที่ `md` ตามปุ่มและช่อง (DS:572) ไม่ใช่ 640 (I1) |
| แถวหัว `compactOnMobile` | — | `flex items-center justify-between gap-3 md:items-start md:gap-x-6` · h1 เพิ่ม `max-md:text-xl` · meta เพิ่ม `max-md:hidden` · ปุ่มเพิ่ม `shrink-0` |
| หัวเรื่อง | `.t-page` 24/36 **600** balance (`:142`) | `text-2xl font-semibold text-balance break-words text-foreground` (B3(1)) |
| meta | `mt 4`, wrap, 13/20 `ink-2` (`:213`) · ช่องไฟตามข้อตัดสิน A/08:286 #6 · คำอธิบายเป็นตัวท้าย | `mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground` |
| ปุ่ม | `.actions` gap 8 wrap · `.btn` md 36 (`:214`, `:217`) | `flex flex-wrap items-center gap-2 md:justify-end` + `size="md"` (R-h) |
| ปุ่มกลับ | — (ต้นแบบมีแค่ไอคอน 44 บนแถบมือถือ `MK/screens/mobile.html:155`) | `cn(buttonVariants({ variant: "outline", size: "md" }), "min-w-11 max-md:px-0", className)` + `ArrowLeft` · ต่ำกว่า `md` เป็นไอคอน 44×44 คำอยู่ใน `max-md:sr-only` (B2, I1) |

ความสูง: ปุ่มกลับ 44 ต่ำกว่า `md` · 36 ตั้งแต่ `md` (ปุ่มกลับที่หัวฟอร์มเดิม `h-10` จึงเตี้ยลง 4px ตาม R-h)

**ตัวห่อบาง `MasterDataHeader`** (R-h · ใช้ถึงผู้เรียกตัวสุดท้ายย้ายใน 2B-3 · ลบใน 2B-5)

```tsx
export function MasterDataHeader({ title, subtitle, createHref, createLabel, actions, compactOnMobile = false }: /* props เดิม :5-19 */) {
  return (
    <PageHeader
      title={title}
      meta={subtitle}
      compactOnMobile={compactOnMobile}
      className={compactOnMobile ? "mb-4 md:mb-6" : "mb-6"}
      actions={<>{actions}<Link href={createHref} className={buttonVariants({ size: "md" })}><Plus aria-hidden="true" />{createLabel}</Link></>}
    />
  )
}
```

ระยะใต้หัวเท่าเดิม (`:21`) · `space-y-4` ที่ห่อแถวหัว (`:21`) หายไปเพราะมีลูกตัวเดียว

**a11y**
- หน้าเดียวมี h1 เดียว · ระดับหัวข้อในหน้าเริ่มที่ h2
- ชื่อปุ่มกลับมาจากข้อความใน `<span>` ทุกขนาดจอ (ซ่อนด้วย `max-md:sr-only` ต่ำกว่า `md`) จึงไม่ต้องมี `aria-label` ชื่อที่อ่านเท่ากับคำที่เห็น (I1)
- ลิงก์ crumb สูง 20px ยังใช้ข้อยกเว้น DS:573 ได้ เพราะหน้ายังมีปุ่มกลับ (B2)
- meta เป็นข้อความธรรมดา ไม่มี live region · ป้ายสถานะใน meta มีคำเสมอ
- ลำดับ DOM = ลำดับ Tab: กลับ · ⋯ · ปุ่มรอง · ปุ่มหลัก

**แทนของเดิม**

| ของเดิม | ที่ | ไปเป็น | plan |
|---|---|---|---|
| `MasterDataHeader` | `master-data-layout.tsx:5-40` · 11 จุด (นับ `<MasterDataHeader\b`) | master-data 8 จุดเรียก `PageHeader` ตรง · findings, rounds ใช้ตัวห่อจนถึง 2B-2 · assets จนถึง 2B-3 | 2B-1 → 2B-3 · ลบ 2B-5 |
| h1 เขียนเอง | 58 จุด | ทีละหน้าตาม plan ของหน้า | 2B-1 … 2B-5 |
| `PageHeader` ประจำไฟล์ | `D/my-assets/page.tsx:163-170` (เรียกที่ `:50`, `:89`) | `PageHeader` กลาง · ลบตัวในไฟล์ในงานเดียวกัน (ชื่อชน) | 2B-5 |
| `ReportHeader` | `reports/report-header.tsx:16-43` | `PageHeader` + `actions` | 2B-5 |
| ปุ่มกลับที่หัวฟอร์ม 15 จุด + "ยกเลิก" ที่หัว 3 หน้า maintenance | `p2b-map/03-frames-nav.md` §D1 | `PageBackLink` (เดี่ยว หรือใน `PageHeader back={<PageBackLink … />}`) · คง `onClick={confirmNavigation}` ของ supplier | 2B-1 งาน 22 |
| ปุ่มกลับหน้ารายละเอียดและรายการ 11 จุด | §D2 | `PageHeader back={<PageBackLink … />}` | 2B-2, 2B-4, 2B-5 |

### 3.4 `DataTable` (`ui/data-table.tsx`, server-safe)

**ตอนนี้**
- `<table` 45 จุดใน 33 ไฟล์ · หัวตารางที่มีพื้นโปร่ง 44 จุดใน 31 ไฟล์ (regex `NEUTRAL_FILL_OPACITY` ของ VFG:233) · ไม่มีตารางกลาง
- หัวคอลัมน์กลาง `ColumnHeader` (`master-data-layout.tsx:82-99`) เป็นตัวพิมพ์ใหญ่ `text-xs font-semibold uppercase` · ใช้ 92 จุดใน 16 ไฟล์ (+20 จุดของตัวชื่อเดียวกันใน `D/master-data/employees/[id]/page.tsx:607`)
- หัวที่เรียงได้มี 8 ตัว (นับ `function \w*Sortable(?:Column)?Header`) · `aria-sort` มีจุดเดียว (`master-data/supplier-list-view.tsx:211`)
- กรอบ `getTableShellClasses()` เป็นมุม 8px (`src/lib/design-system.ts:55-57`) · ทะเบียน: หัว `bg-muted` ทึบ (`asset-register-table.tsx:541`) · เซลล์ `px-3 py-2` (`:153`) · เงาขอบคอลัมน์ `rgb(15_23_42/0.25)` (`:152`)

**API**

```ts
type DataTableProps = Omit<React.ComponentProps<"div">, "children"> & {  // ...props ไปที่กรอบ (data-*, aria-busy)
  children: React.ReactNode       // <colgroup>, <DataTableHeader>, <DataTableBody>
  caption?: string                // <caption className="sr-only"> ชื่อของตาราง (และการเรียง ถ้ามี)
  framed?: boolean                // ค่าตั้งต้น true · false = ตารางใน ContentPanel flush (ไม่มีกรอบซ้อนกรอบ)
  layout?: "auto" | "fixed"       // fixed = table-fixed + <colgroup> (DS:508)
  minWidth?: number               // px → style={{ minWidth }} ของ <table>
  scrollHint?: string             // ข้อความบอกว่าเลื่อนได้ (B6) · แสดงเมื่อล้นจริงเท่านั้น (ข้อ 3.6)
  footer?: React.ReactNode        // เนื้อใน DataTableFoot: <Pagination> หรือบรรทัดช่วงแถว
}
export function DataTable(props: DataTableProps): React.JSX.Element
export function DataTableHeader(props: React.ComponentProps<"thead">): React.JSX.Element
export function DataTableBody(props: React.ComponentProps<"tbody">): React.JSX.Element

type DataTableHeadProps = Omit<React.ComponentProps<"th">, "scope"> & {
  align?: "left" | "right"
  sort?: { href: string; direction: "asc" | "desc" | null; scroll?: boolean }  // null = เรียงได้ แต่ตอนนี้ไม่ได้เรียงคอลัมน์นี้
  sticky?: "left" | "right"
  hideLabel?: boolean             // ชื่อคอลัมน์อ่านได้แต่ไม่เห็น เช่น t("actions") ของ common
}
export function DataTableHead(props: DataTableHeadProps): React.JSX.Element
export function DataTableRow(props: React.ComponentProps<"tr">): React.JSX.Element
type DataTableCellProps = React.ComponentProps<"td"> & { align?: "left" | "right"; numeric?: boolean; sticky?: "left" | "right" }
export function DataTableCell(props: DataTableCellProps): React.JSX.Element
export function DataTableFoot(props: React.ComponentProps<"div">): React.JSX.Element

// ใช้กับตารางที่ยังย้ายทั้งตารางไม่ได้ (R-e: 6 หัวตารางในไฟล์ 2C · ResponsiveReportList)
export const dataTableHeadClasses: string
export const dataTableCellClasses: string
export const dataTableRowClasses: string
```

ไม่มี context และไม่มี hook (R-j) · **ไม่มี `density`** (I3): แถวแน่นเป็นข้อยกเว้นของทะเบียนคนเดียว (B3(3)) จึงเป็น class ประจำไฟล์ `asset-register-table.tsx` จนเฟส 3

**class**

| ส่วน | class | ต้นแบบ (`MK/base.css`) |
|---|---|---|
| กรอบ (`framed`) | `min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface` | `.table-wrap` `:309` (พื้นขาว เส้น `line` มุม 12) |
| กรอบ (`framed={false}`) | `min-w-0 max-w-full` | — |
| ที่เลื่อน (ไม่มี `scrollHint`) | `<div data-slot="data-table-scroll" className="overflow-x-auto overscroll-x-contain">` | `.table-wrap` overflow-x |
| ตาราง | `w-full text-sm` + `table-fixed` เมื่อ `layout="fixed"` · ไม่มี `group/table` และ `data-density` (I3) | `table` `:310` |
| `caption` | `sr-only` | `MK/screens/audit-round.html:125` |
| `DataTableHeader` | ไม่มีพื้น (R7 ของตารางนี้เป็น 0) | `thead th` พื้นขาว `:311` |
| `dataTableHeadClasses` | `border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5` | `:311`, `:313-314` (13/20 500 จาง ไม่มีตัวพิมพ์ใหญ่) |
| หัว `align="right"` | `text-right` | `th.col-num` `:155` |
| ลิงก์เรียง | `inline-flex min-h-11 min-w-0 max-w-full items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:-my-2.5 md:min-h-0` · คอลัมน์ที่เรียงอยู่เพิ่ม `text-foreground` · คำอยู่ใน `<span className="truncate">` | ต้นแบบไม่มี (เรียงจากเมนู) |
| ลูกศร | `ArrowUp` (asc) / `ArrowDown` (desc) `className="size-3.5 shrink-0" aria-hidden="true"` · คอลัมน์ที่ไม่ได้เรียงไม่มีลูกศร | — |
| `DataTableBody` | `[&>tr:last-child>td]:border-b-0` | `:315` |
| `dataTableRowClasses` | `group/row transition-colors hover:bg-row-hover hover:duration-0 focus-within:bg-row-hover focus-within:duration-0 has-[[aria-expanded=true]]:bg-row-hover` | `:316` · "instant on, soft off" `:497-498` |
| `dataTableCellClasses` | `border-b border-border-soft p-3 align-top first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5` | `tbody td` `:312-314` |
| เซลล์ `numeric` | `text-right whitespace-nowrap num` | `td.col-num` `:155` |
| `sticky` หัว | `left`: `sticky left-0 z-30 border-r border-border` · `right`: `sticky right-0 z-30 border-l border-border` | `asset-register-table.tsx:148-150` |
| `sticky` เซลล์ | `left`/`right` เหมือนหัวแต่ `z-20` + `bg-surface transition-colors group-hover/row:bg-row-hover group-hover/row:duration-0 group-focus-within/row:bg-row-hover group-focus-within/row:duration-0 group-has-[[aria-expanded=true]]/row:bg-row-hover` | `:151` |
| `DataTableFoot` | `border-t border-border bg-surface px-4 py-2.5 text-meta text-muted-foreground num md:px-5` | `.table-foot` `:332` |

- ความสูง: หัว 10 + 20 + 10 = 40 · แถว 12 + 22 + 12 = 46 (B3(3)) · มีความแน่นแบบเดียว
- ขอบ 16/20 ของคอลัมน์แรกและสุดท้าย (`first:` / `last:`) ผู้เรียกเปลี่ยนด้วย class ธรรมดาไม่ได้ ตารางอื่นทุกตัวจึงไม่ต้องตั้งขอบซ้ายขวาเอง (เขียนลง DS, I3)
- ทะเบียนไม่ใช้ `dataTableHeadClasses` / `dataTableCellClasses` (I3): เก็บ `headerClasses = "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"` · `cellClasses = "border-b border-border-soft px-3 py-2 align-top"` · ช่องคำสั่ง `cn(cellClasses, "pl-1.5 pr-2")` ใน `asset-register-table.tsx` · ใช้ `DataTableBody`, `ClickableTableRow`, `TableEmptyRow`, `DataTableFoot` และ `DataTableHead sort` เฉพาะคอลัมน์กลาง · ช่องคำสั่ง 172 − 6 − 8 − 0.5 = 157.5 ≥ 156 · ความกว้างของทะเบียนที่ 1440 (DS:508, `tests/asset-register-view-model.test.ts:162-166`) ไม่ขึ้นกับ primitive
- ขอบคอลัมน์ที่ค้างใช้เส้น `border-border` ไม่มีเงา (R-j ตัด `rgb(15_23_42/0.25)`)
- `z-20` / `z-30` ตามทะเบียน เพราะรูปย่อในเซลล์ใช้ `relative z-10`
- แถวค้างสีตอนเมนูหรือ popover ในแถวเปิด (`has-[[aria-expanded=true]]`) เพราะโฟกัสย้ายไปอยู่ใน portal นอกแถว

**ตัวอย่างหน้ารายการข้อมูลหลัก** (งานย้ายเป็นของส่วนกลุ่มหน้า)

```tsx
<DataTable caption={t("title")} scrollHint={tCommon("tableScrollHint")} footer={<Pagination … />}>
  <DataTableHeader>
    <tr>
      <DataTableHead sort={{ href: sortHref("code"), direction: sortDirection("code") }}>{t("code")}</DataTableHead>
      <DataTableHead align="right">{t("assets")}</DataTableHead>
      <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
    </tr>
  </DataTableHeader>
  <DataTableBody>
    {rows.length === 0 ? <TableEmptyRow colSpan={3}>{tCommon("noData")}</TableEmptyRow> : rows.map((row) => (
      <ClickableTableRow key={row.id} href={row.editHref} label={`${tCommon("edit")}: ${row.code}`}>
        <DataTableCell><span className="tag font-medium text-foreground">{row.code}</span></DataTableCell>
        <DataTableCell numeric>{formatCount(row.assetCount)}</DataTableCell>
        <DataTableCell align="right"><RowActions … /></DataTableCell>
      </ClickableTableRow>
    ))}
  </DataTableBody>
</DataTable>
```

`tag` อยู่บน `<span>` ด้านใน ไม่ตั้งขนาดบนตัวเดียวกัน (VFG:187-193, R-p)

**a11y**
- `<table>` จริง · `<th scope="col">` ทุกหัว · ชื่อตารางจาก `caption`
- `aria-sort="ascending"` / `"descending"` เฉพาะคอลัมน์ที่เรียงอยู่ คอลัมน์อื่นไม่ใส่ · ลิงก์เรียงมีวงโฟกัสของตัวเองและสูง 44 บนมือถือ (`-my-2.5` ดูดระยะของหัว หัวจึงสูง 44 ไม่ใช่ 64)
- `hideLabel` ห่อชื่อด้วย `sr-only` หัวคอลัมน์ปุ่มจึงยังมีชื่อ (ต้นแบบ `MK/screens/register.html:86`)
- ตัวเลขเรียงหลักด้วย `tabular-nums` จาก base rule (`globals.css`) และ `num`

**แทนของเดิม**

| ของเดิม | ที่ | ไปเป็น | plan |
|---|---|---|---|
| `ColumnHeader` | `master-data-layout.tsx:82-99` · 92 จุด/16 ไฟล์ | `DataTableHead` | ทีละหน้า · ลบตอนผู้เรียกตัวสุดท้ายย้าย (2B-5) |
| `SortableColumnHeader` | `:101-128` · 4 จุด (`D/admin/users/page.tsx:93-99`) | `DataTableHead sort` | 2B-1 · ลบ 2B-5 (R-h) |
| หัวเรียงประจำไฟล์ 7 ตัว | `D/master-data/branches/page.tsx:322`, `categories/page.tsx:391`, `companies/page.tsx:300`, `employees/page.tsx:363`, `locations/page.tsx:372` · `master-data/supplier-list-view.tsx:206` · `assets/asset-register-table.tsx:779` | `DataTableHead sort` | 2B-1 (6) · 2B-3 (ทะเบียน) |
| `<thead className="bg-muted/NN">` | 44 จุด (R7) | `DataTableHeader` หรือ `dataTableHeadClasses` | ตาม R-e |
| `getTableShellClasses()` / `getResponsiveTableScrollClasses()` | `src/lib/design-system.ts:55-61` · 3 จุด `D/admin/storage` · 1 จุด `D/my-assets` | `DataTable` | 2B-5 (ฟังก์ชันคงไว้ให้ 2D ลบ · pin `tests/design-system.test.ts:44` ผ่านต่อ) |
| กรอบ หัว เซลล์ของทะเบียน | `asset-register-table.tsx:148-154`, `:433`, `:529-541` | class ประจำไฟล์ของทะเบียน (I3): `headerClasses` / `cellClasses` · ใช้ `DataTableBody`, `ClickableTableRow`, `TableEmptyRow`, `DataTableFoot`, `DataTableHead sort` (คอลัมน์กลาง) · ตัวเลื่อนและตัวบอกเลื่อนคงของตัวเอง (I4) | 2B-3 |
| ตารางจอใหญ่ของ `ResponsiveReportList` | `reports/responsive-report-list.tsx:31` | `dataTableHeadClasses` / `dataTableCellClasses` | 2B-5 |

### 3.5 `TableEmptyRow` (ใน `ui/data-table.tsx`)

**API**

```ts
type TableEmptyRowProps = { colSpan: number } & (
  | { children: React.ReactNode; tone?: "empty" | "clear"; emptyState?: never }                     // บรรทัดเดียว
  | { emptyState: React.ComponentProps<typeof ActionEmptyState>; children?: never; tone?: never }    // มีหัวข้อ คำอธิบาย หรือปุ่ม
)
export function TableEmptyRow(props: TableEmptyRowProps): React.JSX.Element
```

**markup** (A/07:311)

```tsx
<tr data-slot="table-empty-row">
  <td colSpan={colSpan} className="p-0">
    {emptyState ? <ActionEmptyState {...emptyState} /> : <EmptyNote padded tone={tone}>{children}</EmptyNote>}
  </td>
</tr>
```

- ไม่มีสีตอนชี้ (ไม่ใช้ `dataTableRowClasses`) · ไม่มี live region (หน้าโหลดใหม่ทั้งหน้า, DS:428)
- ตัวกรองที่ทำให้ว่างใช้ `emptyState={{ …, actionHref: clearHref, actionLabel: t("clearFilters"), actionVariant: "secondary" }}` (A/07:316)
- ไม่แก้ `ui/empty-note.tsx` และ `ui/action-empty-state.tsx` (`tests/feedback-states-ui.test.ts:100-125` ผ่านต่อ)

**แทนของเดิม 16 แถว** (A/07:23 · ตรวจที่ HEAD): `tCommon("noData")` 9 แถว (`D/admin/users/page.tsx:107`, `D/audit/rounds/page.tsx:435`, `D/master-data/branches/page.tsx:210`, `brands/page.tsx:447`, `categories/page.tsx:264`, `companies/page.tsx:189`, `departments/page.tsx:89`, `employees/page.tsx:224`, `locations/page.tsx:266`) · ข้อความ 2 แถว (`D/admin/storage/page.tsx:110`, `:261`) · `ActionEmptyState` ใน td 5 จุด (`D/audit/findings/page.tsx:401`, `D/audit/rounds/[id]/page.tsx:711`, `D/audit/rounds/[id]/pending/page.tsx:201`, `D/disposal/page.tsx:365`, `assets/asset-register-table.tsx:601`) · เพิ่มให้ตารางที่ยังไม่มี: logs, roles ×2 (2B-5)

### 3.6 `DataTableScrollArea` (`ui/data-table-scroll.tsx`, `"use client"`)

ตัวบอกว่าเลื่อนได้ (B6, A/09:318 "ScrollHint") ต้องวัดความกว้างจริง จึงเป็นใบ client แยกไฟล์ · `DataTable` ยังไม่มี hook (R-j) และ render ตัวนี้แทนที่เลื่อนธรรมดาเมื่อมี `scrollHint`

```ts
export function DataTableScrollArea({ hint, label, children }: { hint: string; label?: string; children: React.ReactNode }): React.JSX.Element
```

- วัดแบบทะเบียน (`asset-register-table.tsx:202-213`): `ResizeObserver` ที่ตัวเลื่อนและลูกตัวแรก · `overflowing = el.scrollWidth > el.clientWidth + 1`
- บรรทัดบอก (แสดงเมื่อ `overflowing` เท่านั้น, DS:508): `<p data-slot="data-table-scroll-hint" className="flex items-center gap-1.5 border-b border-border-soft px-4 py-1.5 text-meta text-faint-foreground md:px-5 [&>svg]:size-4 [&>svg]:shrink-0"><MoveHorizontal aria-hidden="true" />{hint}</p>`
- ตัวเลื่อน: `<div ref data-slot="data-table-scroll" className="overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">` · เมื่อล้นและมี `label` ใส่ `role="region"` `aria-label={label}` `tabIndex={0}` ให้คนใช้คีย์บอร์ดเลื่อนได้ · ไม่ล้นไม่ใส่ (ไม่เพิ่มจุด Tab ที่ไม่มีประโยชน์)
- `DataTable` ส่ง `label={caption}`
- ตารางที่ซ่อนด้วย `hidden md:block` วัดได้ 0 จึงไม่แสดงบรรทัดบอก
- ทะเบียนคงของตัวเอง (I4): `isOverflowing` + ข้อความ `asset.tableScrollHint` (`asset-register-table.tsx:202-213`, `:519-526`) เพราะตัวเลื่อนของทะเบียนถือ `ref`, `data-asset-desktop-table` และคอลัมน์ค้างซึ่ง API ของ `DataTable` ไม่มีช่องให้ · ผู้ใช้แรก 10 หน้าที่เลื่อนแนวนอนบนมือถือ (B6)

### 3.7 `ClickableTableRow` (`ui/clickable-table-row.tsx:56`)

API คงเดิม (`:10-22`, pin `tests/clickable-table-row-navigation.test.ts:12-17`) · เปลี่ยนแค่ class

| เดิม `:56` | ใหม่ |
|---|---|
| template string `` `cursor-pointer hover:bg-row-hover focus:bg-row-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${className}` `` | `cn(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", className)` · `className` ค่าตั้งต้นเป็น `undefined` |

- `focus-within` ครอบกรณีโฟกัสที่ตัวแถวเองด้วย จึงลบ `focus:bg-row-hover`
- คง `focus-visible:ring-2` และ `focus-visible:ring-inset` เป็นตัวอักษรในไฟล์ (`tests/asset-register-ux.test.ts:169-175`)
- ทะเบียนส่ง `className="group"` (`asset-register-table.tsx:611`) ต่อได้ · `group` กับ `group/row` เป็นคนละชื่อ · pin `tests/asset-register-ux.test.ts:99` อยู่ในไฟล์ทะเบียน ไม่กระทบ
- ตัวกันคลิกทะลุ `a,button,input,select,textarea,[data-no-row-click]` (`:27`) คงเดิม · `RowActions` ใส่ `data-no-row-click` เอง (ข้อ 3.11)

### 3.8 `Pagination` (ขยาย `ui/pagination.tsx`, server-safe)

**ตอนนี้** ผู้เรียก 1 จุด (`assets/asset-register-table.tsx:683`) · ปุ่ม `rounded-md border border-border px-3 … sm:h-9` เขียนเอง (`:13-14`) · ปิดใช้เป็นพื้น `bg-muted` (`:57`) · ลูกศรซ้ายขวา (`:51-53`) · "หน้า x จาก y" อยู่กลาง (`:34`) · ไม่มีจำนวนต่อหน้า · ตัวแบ่งหน้าอีก 11 ตัวเขียนเอง (นับ `function \w*Pagination\b` ได้ 13 ลบ `ui/pagination.tsx` และ `buildMaintenancePagination` ใน `src/lib/maintenance-list.ts:3`)

**API** (เพิ่มแบบไม่บังคับ ผู้เรียกเดิมไม่ต้องแก้)

```ts
type PaginationLabels = {
  navigation: string      // t("pagination") ของ common
  previous: string        // t("previous")
  next: string            // t("next")
  pageOf: string          // t("pageOf", { page, total }) จัดรูปแล้ว
  range?: string          // t("showingRange", { from, to, total }) ตัวเลขผ่าน formatCount แล้ว
  pageSizeGroup?: string  // t("pageSizeLabel") ชื่อกลุ่มจำนวนต่อหน้า · บังคับเมื่อมี pageSizes
  rowsPerPage?: string    // t("rowsPerPage") คำที่เห็นหน้ากลุ่ม ("แสดง")
}
export type PaginationPageSize = { value: number; href: string }
type PaginationProps = {
  page: number                                // หน้าที่แสดงจริง (ตัดให้อยู่ใน 1…totalPages แล้ว)
  totalPages: number
  previousHref: string
  nextHref: string
  labels: PaginationLabels
  pageSize?: number                           // ขนาดหน้าปัจจุบัน
  pageSizes?: readonly PaginationPageSize[]   // 25/50/100 (R-k) · ทะเบียนไม่ส่ง (เลือก 10/25/50/100 ใน sheet, DS:504)
  className?: string
}
```

**markup**

```tsx
<nav aria-label={labels.navigation} className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className)}>
  <p aria-live="polite" className="text-meta text-muted-foreground num">
    {labels.range ? <>{labels.range}<span aria-hidden="true"> · </span></> : null}{labels.pageOf}
  </p>
  <div className="flex flex-wrap items-center gap-2">
    {pageSizes?.length ? (
      <div role="group" aria-label={labels.pageSizeGroup} className="flex items-center gap-2">
        {labels.rowsPerPage ? <span aria-hidden="true" className="text-meta text-muted-foreground">{labels.rowsPerPage}</span> : null}
        <div className="inline-flex gap-0.5 rounded-md border border-border bg-surface p-0.5">
          {pageSizes.map((size) => (
            <Link key={size.value} href={size.href} aria-current={size.value === pageSize ? "true" : undefined}
              className={cn(pageSizeOptionClasses, size.value === pageSize ? pageSizeCurrentClasses : pageSizeIdleClasses)}>{size.value}</Link>
          ))}
        </div>
      </div>
    ) : null}
    <PaginationControl href={previousHref} enabled={page > 1} rel="prev" label={labels.previous} />
    <PaginationControl href={nextHref} enabled={page < totalPages} rel="next" label={labels.next} />
  </div>
</nav>
```

| ค่าคงที่ | class |
|---|---|
| `controlClasses` | `buttonVariants({ variant: "outline", size: "sm" })` (44 ต่ำกว่า `md` · 32 จาก `md` · `button-variants.ts:6`) |
| ปุ่มที่ใช้ได้ | `<Link href rel className={controlClasses}>{label}</Link>` |
| ปุ่มที่ปิด | `<span aria-disabled="true" className={controlClasses}>{label}</span>` (หน้าตาปิดของ `buttonVariants`, ไม่มี opacity) |
| `pageSizeOptionClasses` | `inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-6.5 md:min-w-8` (กรอบ 32 จาก `md`) |
| `pageSizeCurrentClasses` | `bg-primary-soft font-semibold text-primary-hover` (เท่า `ui/segmented.tsx:29`) |
| `pageSizeIdleClasses` | `font-medium text-muted-foreground hover:bg-background hover:text-foreground` (เท่า `:30`) |

- ตามต้นแบบ `.table-foot` (`MK/base.css:332`, `MK/screens/audit-round.html:194`): ปุ่ม `sm` คำอย่างเดียว ไม่มีลูกศร · ข้อความช่วงแถวอยู่ซ้าย · ปุ่มก่อนหน้าปิดในหน้าแรก
- `nav` ไม่ใส่ `w-full`: ใน `DataTableFoot` (block) กว้างเต็มเอง · ในแถว flex ของทะเบียน (`asset-register-table.tsx:681`) หดตามเนื้อ
- pin `tests/asset-register-building-blocks-ui.test.ts:8-17` ผ่านต่อโดยไม่แก้: ไม่มี `"use client"` · `<nav aria-label={labels.navigation}` · `aria-disabled="true"` · `min-h-11` (อยู่ใน `pageSizeOptionClasses`) · `<Link` · ไม่มี `opacity-`

**a11y**
- ชื่อ nav "การแบ่งหน้า" · ข้อความช่วงแถวและหน้าเป็น `aria-live="polite"` (แบบ `maintenance/maintenance-pagination.tsx:26-27`) ตอนเปลี่ยนหน้าฝั่ง client จึงอ่านผลใหม่
- ปุ่มที่ปิดเป็น `<span>` จึงไม่รับโฟกัส · `rel="prev"` / `rel="next"`
- กลุ่มจำนวนต่อหน้ามีชื่อ "จำนวนต่อหน้า" (I33) · ตัวที่เลือก `aria-current="true"` และหนา 600 (ไม่บอกด้วยสีอย่างเดียว)

**แทนของเดิม**

| ของเดิม | ที่ | plan | pin |
|---|---|---|---|
| `MasterDataPagination` | `master-data/master-data-layout.tsx:130-193` (ผู้เรียก `D/admin/users/page.tsx:161`) | 2B-1 · ลบ 2B-5 | — |
| ตัวประจำไฟล์ 7 ตัว | `D/master-data/branches/page.tsx:351`, `brands/page.tsx:627`, `categories/page.tsx:420`, `companies/page.tsx:329`, `employees/page.tsx:390`, `locations/page.tsx:406` · `master-data/supplier-list-view.tsx:220` | 2B-1 | — |
| `DisposalPagination` | `disposal/disposal-pagination.tsx:8` | 2B-2 | `tests/disposal-route-structure.test.ts:18-21` |
| `MaintenancePagination` | `maintenance/maintenance-pagination.tsx:6` | 2B-2 | `tests/maintenance-pagination-ui.test.ts:7-18` |
| `AuditRoundResultPagination` | `D/audit/rounds/[id]/page.tsx:861` | 2B-2 | `tests/audit-round-result-drilldown.test.ts:138` |
| บรรทัดช่วงแถวของทะเบียน (พิมพ์ 2 ที่) | `asset-register-table.tsx:434-435`, `:681-682` | 2B-3 (`labels.range`) | `tests/asset-register-table-ui.test.ts:81-86` |
| รายการใหม่ที่แบ่งหน้า (B4) | departments (2B-1) · findings, pending, batches, PM, rounds (2B-2) · logs, approvals history, my-assets (2B-5) | ตาม plan | — |

### 3.9 `FilterSelect` (`ui/filter-select.tsx`, server-safe)

**ตอนนี้** `FilterSelect` ประจำไฟล์ 7 ตัว เรียก 24 จุด (`D/master-data/branches/page.tsx:417`, `brands/page.tsx:567`, `categories/page.tsx:486`, `companies/page.tsx:395`, `employees/page.tsx:338`, `locations/page.tsx:472`, `suppliers/page.tsx:187`) · ป้าย `text-sm font-medium` ใน `<label>` ห่อ select ดิบ `h-10 … border-border bg-background … focus:ring-1` (`branches/page.tsx:429-434`) · ไม่มีลูกศร `select-chevron`

**API**

API ตามข้อ 6.3.1 (I6)

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

**markup** (`fieldSize = "lg"` เป็นค่าตั้งต้นใน parameter ของฟังก์ชัน)

```tsx
<Field label={label} hideLabel={hideLabel} labelAction={labelAction} className={className}>
  <NativeSelect fieldSize={fieldSize} {...selectProps}>
    {allLabel ? <option value="">{allLabel}</option> : null}
    {options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    {children}
  </NativeSelect>
</Field>
```

- ใช้ได้ทั้งแบบ uncontrolled (`name` + `defaultValue`, ฟอร์ม GET) และ controlled (`value` + `onChange`, O3 และทะเบียน) · `children` ใช้กับรายการที่ต้องจัดเอง (employees, suppliers) ใช้คู่กับ `options` ได้ ลำดับคือ `allLabel` → `options` → `children`
- ไม่มี `data-slot` ของตัวเอง: เป็นแค่ `Field` (`data-slot="field"`) + `NativeSelect` (`data-slot="native-select"`) · id มาจาก `useId` ของ `Field`
- เปลี่ยนความสูงด้วย `fieldSize` เท่านั้น (`h-*` ใน `className` แพ้ `md:h-10`, `field-variants.ts:22`) · เขียน `label=` เป็น prop แรก (DS:447) · ห้ามใช้แทน `SearchableSelect`
- ไม่มี class ของตัวเอง: ป้ายจาก `fieldLabelClasses` 13/20 500 ink (`ui/field-variants.ts:44`, A/06:234 #13 ป้ายแบบเดียว) · ช่องจาก `fieldControlVariants` + `select-chevron cursor-pointer pr-9` (`ui/native-select.tsx:13`)
- ค่าตั้งต้น `fieldSize="lg"` (40 จอใหญ่ · 44 มือถือ) สำหรับแผงตัวกรองที่มีป้าย (R-l) · แถบเครื่องมือส่ง `fieldSize="md"` (36, B3(4))
- `name`, `defaultValue`, `value`, `onChange`, `key` ส่งผ่านไป select · `onChange` จากคอมโพเนนต์ client เท่านั้น
- ผลที่เห็น: ป้ายเล็กลง 1px (14 → 13) · ขอบเข้มขึ้น (`border-input`) · พื้นขาว · มีลูกศร · วงโฟกัสมี halo
- **ปุ่ม "ล้างตัวกรอง" (secondary):** ในแผงตัวกรองเป็นลิงก์ `buttonVariants({ variant: "outline", size: "lg" })` ข้างปุ่ม "กรอง" `buttonVariants({ size: "lg" })` (ข้างช่อง 40 → `lg`, A/04:232) · ในแถวว่างเป็น `ActionEmptyState actionVariant="secondary"` (ข้อ 3.5) · แสดงเมื่อมีตัวกรองเท่านั้น (บั๊ก `D/maintenance/page.tsx:218-221`)

**แทนของเดิม**

| ของเดิม | ที่ | plan |
|---|---|---|
| `FilterSelect` ประจำไฟล์ ×7 (24 จุด) | ข้างบน | 2B-1 |
| `ReportSelect` (6 จุด) | `reports/report-filter-panel.tsx:90-116` (ใช้ `allLabel`) | 2B-5 |
| `Filter` (O3) | `admin/asset-state-review-workspace.tsx:238-240` (client, `value` + `onChange`) | 2B-2 (I12) |
| `LabeledSelect` (7 จุด, O1) | `assets/asset-register-filter-sheet.tsx:194-225` → `FilterSelect labelAction={<AssetStateHelpPopover … />}` (สถานะ สภาพ) + `key={value}` + `defaultValue` + `onChange` · ลบ `function LabeledSelect` (I6) | 2B-3 |
| select ในแถบเครื่องมือทะเบียน (O1) | `assets/asset-register-toolbar.tsx:41`, `:53`, `:65` → `FilterSelect hideLabel fieldSize="md"` (คง `key`, `defaultValue`, `onChange`, I6) | 2B-3 |

### 3.10 `FilterChipList` (`ui/filter-chips.tsx`, server-safe)

ผู้ใช้แรกของ `linkVariants` (A/04:113) · ตอนนี้มีตัวเดียว `assets/asset-register-filter-chips.tsx:6-47` (ชิปกลม `rounded-full` ทั้งชิปเป็นลิงก์ลบ `:30-36` · "ล้างทั้งหมด" เขียนเอง `:41`)

**API** (ตามข้อ 6.3.3 · ไฟล์ชื่อ `ui/filter-chips.tsx` · I7)

```ts
export type FilterChipItem = { key: string; label: string; href: string; mobileOnly?: boolean }  // href = URL ที่ไม่มีตัวกรองนี้ · mobileOnly = ซ่อนตั้งแต่ md (ทะเบียน)
export function FilterChipList(props: {
  chips: readonly FilterChipItem[]
  label: string                               // ชื่อกลุ่ม เช่น "ตัวกรองที่ใช้อยู่"
  removeLabel: string                         // คำนำหน้าชื่อของชิป: `${removeLabel}: ${chip.label}`
  clearAll?: { href: string; label: string }  // ลิงก์ "ล้างทั้งหมด" ท้ายกลุ่ม (ทะเบียน)
  className?: string
}): React.JSX.Element | null                  // ไม่มีชิป = null
```

ชื่อ type เป็น `FilterChipItem` เพราะ `FilterChip` เป็นชื่อฟังก์ชันประจำไฟล์ใน `D/admin/approvals/page.tsx:185` และ `D/admin/approvals/history/page.tsx:182` อยู่แล้ว

**markup**

```tsx
<div role="group" aria-label={label} data-slot="filter-chips" className={cn("flex min-w-0 flex-wrap items-center gap-2", chips.every((chip) => chip.mobileOnly) && "md:hidden", className)}>
  {chips.map((chip) => (
    <Link key={chip.key} href={chip.href} aria-label={`${removeLabel}: ${chip.label}`} className={cn("group/chip inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-primary-border bg-primary-soft pl-3 pr-1 text-meta text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:min-h-0", chip.mobileOnly && "md:hidden")}>
      <span className="min-w-0 truncate">{chip.label}</span>
      <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors motion-reduce:transition-none group-hover/chip:bg-primary-border"><X className="size-3" /></span>
    </Link>
  ))}
  {clearAll ? <Link href={clearAll.href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>{clearAll.label}</Link> : null}
</div>
```

| ส่วน | class | ต้นแบบ |
|---|---|---|
| ชิป | `group/chip inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-primary-border bg-primary-soft pl-3 pr-1 text-meta text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:min-h-0` · วงโฟกัสเว้นระยะแบบปุ่ม (`ring-offset-2`, I7) | `.toolbar .chip` h36 r8 `0 4 0 12` 13px (`MK/base.css:255-257`) |
| กล่อง ✕ | `inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors motion-reduce:transition-none group-hover/chip:bg-primary-border` · ไอคอน `size-3` | `.chip-x` 24×24 r4 12px (`:258-260`) · hover `color-mix 12%` → `primary-border` (M05 §3, R1) |
| ล้างทั้งหมด | `linkVariants()` + `inline-flex min-h-11 items-center md:min-h-0` | `.link` · DS:373 · A/04:114 |

**a11y**
- ทั้งชิปเป็นลิงก์เดียว สูง 44 บนมือถือ (✕ ขนาด 24 อย่างเดียวเล็กไปสำหรับนิ้ว, M05 P4) · ✕ เป็นภาพ (`aria-hidden`)
- ชื่อลิงก์ = `` aria-label={`${removeLabel}: ${chip.label}`} `` อ่านเท่าวันนี้ (รายงาน "ล้างตัวกรอง: บริษัท: GRL" `report-active-filters.tsx:21` · ทะเบียน "ล้างตัวกรองนี้: บริษัท: GRL" `asset-register-filter-chips.tsx:29` · ผู้เรียกส่ง `removeLabel` key เดิม, I7) · มีคำที่เห็นอยู่ในชื่อ
- กลุ่มมีชื่อ · ลิงก์ล้างทั้งหมดเป็นข้อความ

**จุดเรียก:** ทะเบียน (2B-3 · `asset-register-filter-chips.tsx` เป็นตัวห่อ server ของ `FilterChipList` · pin ชิป `tests/asset-register-filter-ui.test.ts:79-82` ย้ายไปอ่าน `ui/filter-chips.tsx` ชิปสูง 36 ไม่ใช่ 32, I7) · findings ชิปรอบ/ประเภท และซ่อมบำรุงชิป "เฉพาะทรัพย์สินนี้" (2B-2, I24) · รายงาน: แทน `reports/report-active-filters.tsx:12` แล้วลบไฟล์ (2B-5, I24) · ข้อมูลหลักไม่มีชิป

### 3.11 `RowActions` ช1 (`ui/row-actions.tsx`, `"use client"`)

**ตอนนี้**
- ⋯ มีที่เดียวคือทะเบียน (`assets/asset-register-row-actions.tsx:50-269`): ปุ่มถัดไปพื้น `primary-soft` ตลอด กว้างไม่เท่ากัน `text-xs` (`:259-263`, ใกล้ ช2) · ⋯ เขียนเอง `size-8` (`:93-101`) · ช่องว่างยุบเมื่อไม่มีปุ่มถัดไป (`:88-90`) · sheet ใช้ class ของตัวเอง (`:47-48`) และเหตุผล `text-xs` (`:201`)
- ข้อมูลหลัก 7 หน้า + `supplier-list-view.tsx`: ไอคอนแก้ไข 32px (`D/master-data/branches/page.tsx:260-266`) ข้างปุ่มลบ 44px (`master-data/master-data-delete-button.tsx:18`) · categories มีลิงก์ข้อความอีก 2 ลิงก์ (`categories/page.tsx:316-329`)

**API**

```ts
export type RowNextAction =
  | { label: string; href: string; icon?: React.ReactNode; onNavigate?: () => void }   // หน้า server ส่งได้ (ยกเว้น onNavigate)
  | { label: string; onSelect: () => void; icon?: React.ReactNode }                    // client เท่านั้น: เปิด dialog ของ 2C ผ่าน handle

export type RowActionItem =
  | { kind: "link"; key: string; label: string; href: string; icon?: React.ReactNode; onNavigate?: () => void }
  | { kind: "action"; key: string; label: string; onSelect: () => void; icon?: React.ReactNode; destructive?: boolean }  // client เท่านั้น
  | { kind: "unavailable"; key: string; label: string; reason: string; icon?: React.ReactNode }
export type RowActionGroup = { key: string; label?: string; items: readonly RowActionItem[] }

type RowActionsProps = {
  code: string                         // รหัสของแถว: อ่านต่อท้ายปุ่มถัดไป และเป็นหัวของ sheet
  name?: string                        // ชื่อของแถว: คำอธิบายของ sheet
  menuLabel: string                    // ชื่อปุ่ม ⋯: t("moreActionsFor", { code }) ของ common
  next?: RowNextAction | null          // undefined = ไม่มีช่อง (แถวมือถือ) · null = ช่องว่าง 120px (แถวตาราง ⋯ จึงอยู่ที่เดิม)
  groups: readonly RowActionGroup[]
  deleteAction?: { endpoint: string; label?: string }      // ท้ายสุดหลังเส้นคั่น · ยืนยันด้วย useDeleteAction
  openerRef?: React.RefObject<HTMLElement | null>          // RowActions ใส่ปุ่มที่เปิด (ถัดไป หรือ ⋯) ก่อนเรียก onSelect
  menu?: "auto" | "dropdown" | "sheet"                     // auto: DropdownMenu ตั้งแต่ md · Sheet ล่างต่ำกว่า md
  className?: string
}
export function RowActions(props: RowActionsProps): React.JSX.Element
```

API นี้ตัวเดียวสำหรับผู้ใช้ทุกกลุ่ม (I5): props เป็นข้อมูลล้วน · ไม่มี `children`, `triggerRef` จากนอก และ `contentClassName` · `triggerRef` ในตารางข้างล่างเป็น ref ภายในของปุ่ม ⋯

**markup และ class**

| ส่วน | markup / class | ต้นแบบ (`MK/base.css`) |
|---|---|---|
| ตัวห่อ | `<div data-slot="row-actions" data-no-row-click className={cn("flex items-center justify-end gap-1 [td>&]:-my-1.25", className)}>` | `.row-next` grid `120px 32px` gap 4 end (`:324-325`) · `td .row-next` `margin-block:-5px` (`:322`) |
| ปุ่มถัดไป (ลิงก์ หรือ `<button type="button">`) | `rowNextClasses` = `inline-flex min-h-11 w-30 shrink-0 items-center justify-start gap-1.5 rounded-control border border-transparent px-2.5 text-meta font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary-soft hover:text-primary-hover hover:duration-0 group-hover/row:bg-primary-soft group-hover/row:text-primary-hover group-focus-within/row:bg-primary-soft group-focus-within/row:text-primary-hover group-has-[[aria-expanded=true]]/row:bg-primary-soft active:border-primary-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0 [&_svg]:size-4 [&_svg]:shrink-0` · เนื้อ `{icon}<span className="truncate">{label}</span><span className="sr-only"> {code}</span>` | `.next-btn` 120×32 r6 13/500 primary ไอคอน 16 ชิดซ้าย (`:326-330`) |
| ช่องว่าง (`next === null`) | `<span aria-hidden="true" className="w-30 shrink-0" />` | `<span></span>` (`MK/screens/register.html:102`) |
| ⋯ | `<Button ref={triggerRef} variant="ghost" size="icon-sm" aria-label={menuLabel} title={menuLabel}><MoreHorizontal aria-hidden="true" /></Button>` ห่อด้วย `<DropdownMenuTrigger asChild>` (เมนู) หรือ `<SheetTrigger asChild>` (sheet) แบบทะเบียนวันนี้ (`tests/asset-register-table-ui.test.ts:15`, `:17` ย้ายมาอ่านไฟล์นี้ใน 2B-3, ข้อ 7.17) | `.btn.sm.ghost` 32 (`:331`) · A/04:324 |
| ไม่มีอะไรในเมนู | ไม่ render ⋯ · ใส่ `<span aria-hidden="true" className="w-11 shrink-0 md:w-8" />` แทน | — |
| เมนูจอใหญ่ | `<DropdownMenu modal={false}>` · `<DropdownMenuContent data-no-row-click align="end" onCloseAutoFocus={…}>` กว้างตามค่าตั้งต้น `min-w-60` (ไม่มี `contentClassName`, I5) · กลุ่มคั่นด้วย `DropdownMenuSeparator` · ชื่อกลุ่ม `DropdownMenuLabel` | `MK/screens/components.html:85-96` |
| รายการ `link` | `<DropdownMenuItem asChild><Link href={href} onClick={onNavigate}>{icon}{label}</Link></DropdownMenuItem>` | — |
| รายการ `action` | `<DropdownMenuItem variant={destructive ? "destructive" : "default"} onSelect={() => openFromMenu(item.onSelect)}>` | `assets/asset-detail-action-menu.tsx:46-49`, `:69` |
| รายการ `unavailable` | `<DropdownMenuItem unavailable>{icon}<DropdownMenuItemText>{label}<DropdownMenuItemDescription>{reason}</DropdownMenuItemDescription></DropdownMenuItemText></DropdownMenuItem>` | `ui/dropdown-menu.tsx:83-131` · A/05:282 |
| ลบ | `<DropdownMenuSeparator />` + `<DropdownMenuItem variant="destructive" disabled={deleting} onSelect={() => void runDelete()}><Trash2 aria-hidden="true" />{label ?? t("delete")}</DropdownMenuItem>` | แบบทะเบียน `asset-register-row-actions.tsx:145-153` |
| sheet มือถือ | `<SheetContent side="bottom" data-no-row-click className="max-h-[85dvh] gap-0 rounded-t-lg">` · `<SheetHeader><SheetTitle><span className="tag font-medium">{code}</span></SheetTitle>{name ? <SheetDescription className="truncate">{name}</SheetDescription> : null}</SheetHeader>` · ตัวเนื้อ `<div className="overflow-y-auto px-2 pt-1 pb-3">` | DS:507 · `MK/screens/components.html:57` |
| กลุ่มใน sheet | `<div role="group" aria-labelledby={id}>` · ชื่อ `<p id className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground">` · กลุ่มที่ 2 ขึ้นไป `mt-1 border-t border-border-soft pt-1` · รายการ `<ul className="grid gap-px">` | DS:414 (ชื่อกลุ่ม 12px medium, เส้นคั่น `border-soft`) |
| รายการใน sheet | `cn(menuItemClasses, menuItemDestructiveClasses, "w-full text-left")` บน `<Link>` / `<button type="button">` / `<div aria-disabled="true">` (unavailable) · ลบใส่ `data-variant="destructive"` | `ui/dropdown-menu.tsx:16-23` (เพิ่ม `export` ให้ 2 ค่าคงที่) |

**พฤติกรรม**
- `menu="auto"`: `useMediaQuery("(min-width: 48rem)")` (`ui/use-media-query.ts:6-15`, แบบ `assets/asset-register-filter-sheet.tsx:57`) · ตอน render แรกเป็น sheet แล้วสลับเป็นเมนูบนจอใหญ่ ปุ่ม ⋯ หน้าตาเดียวกันจึงไม่กระพริบ · ทะเบียนส่ง `"dropdown"` ในตาราง และ `"sheet"` ในรายการมือถือ
- `openFromMenu(fn)` ตามแบบ `asset-detail-action-menu.tsx:46-49`: `openingRef.current = true` · `openerRef.current = triggerRef.current` · `fn()` · `onCloseAutoFocus` เรียก `event.preventDefault()` เมื่อ `openingRef.current` แล้วตั้งกลับเป็น false (`:62-66`) dialog จึงได้โฟกัส
- ปุ่มถัดไปแบบ `onSelect`: `openerRef.current = event.currentTarget` แล้ว `onSelect()` · dialog คืนโฟกัสให้ปุ่มถัดไป
- ใน sheet: `action` และลบปิด sheet ก่อน (`setSheetOpen(false)`) แล้วจึงเรียก (แบบ `asset-register-row-actions.tsx:229-232`) · ลบใช้ `aria-disabled={deleting || undefined}` และกันคลิกซ้ำใน handler
- ลบ: `useDeleteAction(deleteAction.endpoint, { returnFocusRef: triggerRef })` (`master-data/use-delete-action.ts:10-43`) · ยืนยันเดิมทุกอย่าง (`confirm` tone destructive · toast "ลบแล้ว" · `router.refresh()`) · กด 2 ครั้ง: เปิด ⋯ เลือกลบ แล้วยืนยัน (B5) · hook เรียกเสมอ (กฎของ hook) ใช้ endpoint ว่างเมื่อไม่มี `deleteAction`
- **เปิด dialog ของ 2C (R-m):** เจ้าของเป็นคอมโพเนนต์ client ประจำแถว render dialog ไว้นอก RowActions พร้อม `hideTrigger` และ `returnFocusRef={openerRef}` แล้วส่ง `onSelect: () => dialogRef.current?.open()` (แบบ `asset-detail-action-menu.tsx:97`) · ไม่แก้ 3 ไฟล์ของ P0 (`tests/dialog-trigger-handles.test.ts` ผ่านต่อ)

```tsx
// ตัวอย่างใน 2B-2 (D/disposal/page.tsx:426) · ไฟล์ client ใหม่ของหน้า
const openerRef = useRef<HTMLElement | null>(null)
const decisionRef = useRef<DisposalDecisionButtonHandle | null>(null)
<RowActions code={request.disposalNo} menuLabel={tCommon("moreActionsFor", { code: request.disposalNo })} openerRef={openerRef}
  next={{ label: t("review"), onSelect: () => decisionRef.current?.open() }} groups={…} />
<DisposalDecisionButton ref={decisionRef} hideTrigger returnFocusRef={openerRef} {...decisionProps} />
```

**a11y**
- ชื่อปุ่มถัดไป = คำที่เห็น + รหัส sr-only ("แก้ไข BR-001", ต้นแบบ `MK/screens/register.html:95`) · ชื่อ ⋯ = "การดำเนินการของ {code}" (I33)
- รายการที่ทำไม่ได้ยังรับโฟกัส อ่านเหตุผล และกดแล้วไม่ทำอะไร (DS:415)
- `data-no-row-click` อยู่ 3 ที่: ตัวห่อ · `DropdownMenuContent` · `SheetContent` · เหตุผล: event ของ React ไหลผ่าน portal ขึ้นไปถึง `onClick` / `onKeyDown` ของแถว (`ui/clickable-table-row.tsx:46-55`) แต่ `closest()` อ่านจาก DOM จริง ของใน portal จึงต้องติดป้ายเอง (A/04:248)
- ปุ่ม 44 ต่ำกว่า `md` (`size="icon-sm"`, `button-variants.ts:9`) · รายการใน sheet 44
- แถวค้างสีตอนเมนูของแถวเปิด (`has-[[aria-expanded=true]]`) จึงรู้ว่าเมนูเป็นของแถวไหน
- ไม่ตั้ง `closeLabel`, `pr-14`, `pb-[env(…)]` บน sheet: primitive ทำแล้ว (C/05:228-229 · `ui/sheet.tsx:62`, `:78`, `:100`)

**แทนของเดิม**

| ของเดิม | ที่ | plan | pin |
|---|---|---|---|
| ปุ่มแก้ไข + ปุ่มลบในแถว | ข้อมูลหลัก 7 หน้า (`branches/page.tsx:260-268`, `brands/page.tsx:508-516`, `categories/page.tsx:315-337`, `companies/page.tsx:238-246`, `departments/page.tsx:112-120`, `employees/page.tsx:276-284`, `locations/page.tsx:310-318`) · `master-data/supplier-list-view.tsx:131-135`, `:178-180` | 2B-1 (B5: `next` = แก้ไข · ⋯ = ลิงก์อื่น + ลบ · หน้า server เรียก `RowActions` ตรง ไม่มีไฟล์ตัวห่อ, I5) | `tests/master-data-brand-supplier-ui.test.ts:40`, `:44` ผ่านต่อโดยไม่แก้ (ลิงก์นับในเซลล์คง class เดิม, I11) |
| ลิงก์แก้ไขในแถว users | `D/admin/users/page.tsx:147-153` | 2B-1 (`next` อย่างเดียว ไม่มี ⋯) | — |
| แผงยี่ห้อที่เลือก | `D/master-data/brands/page.tsx:299-313` | 2B-1 (`next` = แก้ไขยี่ห้อ + `deleteAction`, I5) | — |
| `AssetRegisterRowActions` | `assets/asset-register-row-actions.tsx:50-269` (2 จุด) · คงไฟล์และชื่อ export เป็นตัวห่อ client ที่สร้าง `next` (`getRowNextAction`, ส่งเฉพาะจอใหญ่), `groups` (`t("transactionMenu")` + รายการธุรกรรม `link`/`unavailable` ตาม `reasonOf` · แก้ไข · คัดลอก), `` deleteAction={permissions.canDelete ? { endpoint: `/api/assets/${assetId}` } : undefined} `` (คงเงื่อนไขสิทธิ์ลบเดิม `:145`, `:224` · pin `tests/asset-register-table-ui.test.ts:23` · ข้อ 7.9), `menuLabel={t("rowActionsMenu", { assetTag })}`, `menu={variant === "desktop" ? "dropdown" : "sheet"}` · เลิก sheet ⋯ ที่เขียนเอง (`:160-243`) และ `sheetItemClasses` (I5) | 2B-3 | `tests/asset-register-table-ui.test.ts:13-25` · `tests/dropdown-menus-ui.test.ts:27-38` เขียนใหม่ครั้งเดียวใน 2B-3 ให้ตรวจพฤติกรรมเดิมที่ `ui/row-actions.tsx` (I5) |
| `DisposalNextAction` | `D/disposal/page.tsx:419-429` (เรียก `:356`, `:375`) | 2B-2 | `tests/disposal-queue-ux.test.ts:37` |
| `AuditMarkNotFoundButton` ในแถว | `D/audit/rounds/[id]/pending/page.tsx:230`, `:290` | 2B-2 | — |

ตัวห่อ `*-delete-button.tsx` 9 ไฟล์ลบพร้อมผู้เรียกตัวสุดท้าย · `master-data/master-data-delete-button.tsx` คงไว้ไม่มีผู้เรียก (pin `tests/confirm-dialog-ui.test.ts:36` · ลบใน 2D) (I5)

### 3.12 `TabNav` (`ui/tab-nav.tsx`, server-safe)

**ตอนนี้** แถวแท็บ 10 แถว 5 แบบ (`p2b-map/03-frames-nav.md` §G) · `role="tablist"` ไม่มีในโค้ด (นับ 0) · ตัวนับบนแท็บที่เลือกใช้พื้นโปร่ง 2 จุด (`D/audit/rounds/page.tsx:597` = budget R1 ตัวเดียว VFG:226-231 · `assets/asset-detail-tabs.tsx:76` `bg-white/20`) · แท็บสถานะของทะเบียนเป็น pill ต่ำกว่า md (`assets/asset-register-status-tabs.tsx:23-26`) · แท็บตั้งค่าเป็น `<button aria-pressed>` (`admin/system-settings-form.tsx:953`, `:960`)

**API** (R-g)

```ts
export type TabNavItem = {
  key: string
  label: React.ReactNode
  href: string
  count?: string            // จัดรูปแล้ว (formatCount)
  icon?: React.ReactNode    // เช่นไอคอนเตือนของแท็บรายละเอียดทรัพย์สิน
}
type TabNavProps = Omit<React.ComponentProps<"nav">, "children" | "aria-label" | "onSelect"> & {  // ...navProps ไปที่ <nav>: ref, style, onScroll, data-* (I9)
  "aria-label": string
  items: readonly TabNavItem[]
  current: string           // key ของแท็บปัจจุบัน → aria-current="page"
  scroll?: boolean          // ส่งต่อให้ Link · false คงตำแหน่งเลื่อน (tests/audit-rounds-ux.test.ts:38-39)
  onSelect?: (key: string, event: { preventDefault: () => void }) => void  // client เท่านั้น ผ่าน Link onNavigate (2C ชุด 5, O7)
  linkClassName?: string    // ต่อท้าย class ของทุกลิงก์ เช่น "snap-start" ของตัวห่อ client (I9)
  className?: string        // จัดวาง เช่นเต็มขอบจอของแท็บสถานะทะเบียน
}
export function TabNav({ "aria-label": ariaLabel, items, current, scroll, onSelect, linkClassName, className, ...navProps }: TabNavProps): React.JSX.Element
```

- ไม่มี `fullBleed` (I9): ผู้เรียกเต็มขอบมีคนเดียว (แท็บสถานะทะเบียน) จึงส่งเองผ่าน `className`
- `Omit` ตัด `onSelect` ของ `<nav>` ด้วย เพราะชนชื่อกับ `onSelect` ของ `TabNav` (type ของ event ไม่ตรงกัน)

**markup**

```tsx
<nav aria-label={ariaLabel} data-slot="tab-nav" {...navProps} className={cn("overflow-x-auto overscroll-x-contain", className)}>
  <ul className="flex w-max min-w-full gap-5.5 shadow-[inset_0_-1px_0_var(--border)]">
    {items.map((item) => {
      const selected = item.key === current
      return (
        <li key={item.key} className="flex">
          <Link href={item.href} scroll={scroll} aria-current={selected ? "page" : undefined}
            onNavigate={onSelect ? (event) => onSelect(item.key, event) : undefined}
            className={cn(tabNavLinkClasses, selected ? tabNavSelectedClasses : tabNavIdleClasses, linkClassName)}>
            {item.icon}
            <span className="whitespace-nowrap">{item.label}{item.count !== undefined ? <span className={cn("ms-1.5 text-meta num", selected ? "font-semibold text-primary" : "text-faint-foreground")}>{item.count}</span> : null}</span>
          </Link>
        </li>
      )
    })}
  </ul>
</nav>
```

| ค่าคงที่ | class | ต้นแบบ (`MK/base.css`) |
|---|---|---|
| `tabNavLinkClasses` | `flex min-h-11 items-center gap-1.5 pt-2 pb-2.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-0` | `.tabs a` `8px 0 10px` 14px (`:238`) |
| `tabNavSelectedClasses` | `font-semibold text-foreground shadow-[inset_0_-2px_0_var(--primary)]` | `[aria-current="page"]` ink 600 inset primary (`:242`) |
| `tabNavIdleClasses` | `text-muted-foreground hover:text-foreground hover:shadow-[inset_0_-2px_0_var(--border)]` | `:238-240` |
| แถว | `flex w-max min-w-full gap-5.5 shadow-[inset_0_-1px_0_var(--border)]` | `.tabs` gap 22 เส้น 1px (`:236`) |
| ตัวนับ | `ms-1.5 text-meta num` + เลือก `font-semibold text-primary` / ไม่เลือก `text-faint-foreground` | `.c` 13px faint · เลือก primary 600 (`:241`, `:243`) |

- เส้นใต้ทุกขนาดจอ (B3(5)) · สูง 40 จอใหญ่ 44 มือถือ · ใช้กลไกของ DS:503: เส้นฐานเป็น inset shadow บน `ul` ที่ `min-w-full` และเส้นของแท็บที่เลือก (2px) อยู่ใน `li` ที่ยืดเต็มความสูง จึงทับเส้นฐานและเลื่อนไปกับแท็บ ไม่ถูกตัด · ไม่ใช้ `overflow-visible` หรือ `-mb-px`
- ใช้ shadow ไม่ใช้ `border-b-2` แท็บที่เลือกจึงไม่สูงกว่าแท็บอื่น
- คำและตัวนับอยู่ใน `<span>` เดียว จึงเรียง baseline แบบข้อความธรรมดา และทั้งก้อนอยู่กลางแนวตั้ง
- คง scrollbar ของระบบ (ไม่ใช้ `scrollbar-none` ของต้นแบบ `:237`): แถวตั้งค่ามี 11 แท็บ (`src/lib/settings-information-architecture.ts:3-15`) คนใช้เมาส์ต้องเลื่อนได้
- ดูต่างจาก `Steps` (ไม่มีวงกลมตัวเลขและเส้นเชื่อม, C/07:119)
- `onSelect` ใช้ `Link onNavigate` จึงทำงานเฉพาะการเปลี่ยนหน้าฝั่ง client · หน้าตั้งค่าเรียก `event.preventDefault()` แล้ว `selectTab(key)` (`system-settings-form.tsx:754-758`) URL เปลี่ยนด้วย `replaceState` เหมือนเดิม · `tests/settings-tab-persistence-ui.test.ts:5-13` ผ่านต่อ · Ctrl+คลิกเปิดแท็บนั้นในหน้าต่างใหม่ได้ · ปุ่มเดิมอยู่ใน `<form>` (`:947`) ลิงก์ไม่ submit ฟอร์ม
- สถานะในหน้าที่ไม่เปลี่ยน URL ใช้ `Segmented` ไม่ใช้ TabNav (R-a, R-g)

**a11y:** `<nav>` มีชื่อ + ลิงก์ `aria-current="page"` (ไม่ใช่ `role="tablist"`, R-g) · แท็บที่เลือกบอกด้วยเส้น น้ำหนัก และสี · ตัวนับอ่านต่อจากชื่อแท็บ · วงโฟกัสอยู่ด้านใน จึงไม่ถูกตัดโดยตัวเลื่อน

**จุดเรียก**

| แถว | ที่ | plan | pin |
|---|---|---|---|
| `QuickFilterBar` (R1 → `{}`) · คงชื่อเป็นตัวห่อบาง (I20) | `D/audit/rounds/page.tsx:565-603` | 2B-2 | `tests/audit-rounds-ux.test.ts:39` แก้เป็น `/<TabNav\b[\s\S]*?scroll=\{false\}/` · `:11`, `:38` ผ่านต่อ (I20) · VFG:226-231 |
| แท็บขั้นของคิวตัดจำหน่าย | `D/disposal/page.tsx:332-339` | 2B-2 | — |
| ตัวกรองสถานะรายการไม่ตรง | `D/audit/findings/page.tsx:270-283` | 2B-2 | — |
| `AssetRegisterStatusTabs` · ส่ง `className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"` + `data-asset-status-tabs` (I9) | `assets/asset-register-status-tabs.tsx:13-44` | 2B-3 | VFG:143-148 · `tests/asset-register-filter-ui.test.ts:65-73`, `:109` |
| `AssetDetailTabs` · คงตัวห่อ client ที่ถือการเลื่อน ส่ง `ref`/`onScroll`/`style` และ `linkClassName="snap-start"` (I9) | `assets/asset-detail-tabs.tsx:51-98` | 2B-4 | `tests/asset-detail-tabs.test.ts:15-20` ผ่านต่อ (`:18` แก้ใน commit นั้นถ้าเปลี่ยนวิธีจับแท็บที่เลือก, I9) · VFG:114 |
| `ReportViewTabs` (คงตัวห่อ client แบบเดียวกัน, I9) · ตัวกรองด่วนของ logs · `FilterChip` ของ approvals ×2 · แถวของ work-center · สลับ "งานทั้งหมด/งานของฉัน" แทน `WorkCenterViewLink` (2 รายการ `aria-label={t("viewNavigation")}` · คงข้อความอธิบาย `:387-391`, I10) | `reports/report-view-tabs.tsx:17-54` · `D/admin/logs/page.tsx:67-78` · `D/admin/approvals/page.tsx:185`, `D/admin/approvals/history/page.tsx:182` · `D/work-center/page.tsx:624-651` · `D/work-center/page.tsx:371-386` | 2B-5 | `tests/report-controls-ui.test.ts:16`, `:19-27` |
| แท็บตั้งค่า (O7, `onSelect`) | `admin/system-settings-form.tsx:948-967` | 2C ชุด 5 | `tests/settings-tab-persistence-ui.test.ts:5-13` |

### 3.13 `StatStrip` (`ui/stat-strip.tsx`, server-safe)

**ตอนนี้** กล่องตัวเลขประจำไฟล์: `SummaryTile` 8 ตัว เรียก 33 จุด · `SummaryCard` 7 ตัว เรียก 26 จุด · `MetricCard` กลาง (`ui/metric-card.tsx:13-23`) 14 จุดใน 4 ไฟล์รายงาน + ตัวชื่อซ้ำ 2 ตัว · `ResolutionMetric`, `CoverageMetric`, `BatchMetric`, `Metric` ×4 (นับ `function Summary(Tile|Card)` และ `<Summary…`) · หลายตัวมีพื้นสีสถานะ (`D/audit/findings/page.tsx:534-541`, `src/lib/design-system.ts:13-20`) ซึ่งขัด DS:258

**API**

```ts
export type StatStripItem = {
  key: string
  label: string
  value: string             // จัดรูปแล้ว (formatCount / formatMoney) · ห้ามตัวเลขดิบ
  unit?: string             // "บาท", "รายการ"
  foot?: React.ReactNode    // บรรทัดเดียว ตัดท้ายด้วย …
  footTitle?: string        // title ของบรรทัดท้ายที่ถูกตัด
  href?: string             // ทั้งช่องเป็นลิงก์ (ตัวกรอง หรือเจาะดูรายการ)
  current?: boolean         // ตัวกรองที่ใช้อยู่ → aria-current="page"
  scroll?: boolean
  attention?: boolean       // ต้องจัดการ: บรรทัดท้ายเป็นสีเตือน + ไอคอน
}
export function StatStrip({ items, className }: { items: readonly StatStripItem[]; className?: string }): React.JSX.Element
```

**markup**

```tsx
<dl data-slot="stat-strip" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:[&>:last-child:nth-child(odd)]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:grid-rows-[repeat(3,auto)]", className)}>
  {items.map((item) => (
    <div key={item.key} data-slot="stat" className={cn(statClasses, item.href && !item.current && "hover:bg-background", item.href && statLinkClasses, item.current && statCurrentClasses)}>
      <dt className="text-meta font-medium text-muted-foreground text-balance">
        {item.href ? (
          <Link href={item.href} scroll={item.scroll} aria-current={item.current ? "page" : undefined} className="after:absolute after:inset-0 focus-visible:outline-none">
            {item.label}
            <ChevronRight aria-hidden="true" className="pointer-events-none absolute top-4.5 right-4 size-3.5 text-faint-foreground invisible group-hover:visible group-focus-within:visible" />
          </Link>
        ) : item.label}
      </dt>
      <dd className="flex min-w-0 items-baseline gap-1"><span className="text-metric num text-foreground">{item.value}</span>{item.unit ? <span className="text-base font-medium text-faint-foreground">{item.unit}</span> : null}</dd>
      {item.foot ? (
        <dd className={cn("flex min-w-0 items-center gap-1 text-meta", item.attention ? "text-warning" : "text-faint-foreground")}>
          {item.attention ? <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          <span className="truncate" title={item.footTitle}>{item.foot}</span>
        </dd>
      ) : null}
    </div>
  ))}
</dl>
```

| ค่าคงที่ | class | ต้นแบบ (`MK/base.css`) |
|---|---|---|
| แถบ | ข้างบน | `.stats` กรอบเดียว r12 gap 1px บนพื้น `line` (`:288`) · 2 คอลัมน์ ≤1080 (`:477`) |
| `statClasses` | `group relative row-span-3 grid grid-rows-subgrid content-start gap-y-1 bg-surface px-4 py-3 transition-colors md:px-5 md:py-4` | `.stat` subgrid row-gap 4 `16px 20px` (`:289`) · มือถือ `12px 16px` (`MK/screens/mobile.html:40-41`) |
| `statLinkClasses` | `has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring` | `a.stat:hover` subtle + chevron (`:290-293`) |
| `statCurrentClasses` | `bg-primary-soft shadow-[inset_0_-2px_0_var(--primary)]` | — (ต้นแบบไม่มีช่องที่เป็นตัวกรอง) |
| ป้าย | `text-meta font-medium text-muted-foreground text-balance` | `.t-label` 13/20 500 `ink-2` (`:144`, `:294`) |
| ค่า | `text-metric num text-foreground` · หน่วย `text-base font-medium text-faint-foreground` | `.t-metric` 28/32 500 ไม่มีสี (`:147`, `:152`) · DS:291 |
| บรรทัดท้าย | `text-meta text-faint-foreground` + `truncate` | `.stat .foot` (`:296-297`) |

- ไม่มีพื้นสีสถานะ (R-d, DS:258, `MK/DIRECTION.md:18-19`) · สีอยู่ได้แค่บรรทัดท้ายที่ต้องจัดการ (`text-warning` + `TriangleAlert` จาก `toneIcons.warning`, A/07:199)
- ช่องที่เป็นตัวกรองที่ใช้อยู่: พื้น `primary-soft` (สีของการเลือก) + เส้นใต้ 2px (รูปร่าง ไม่ใช่สีอย่างเดียว) + `aria-current="page"`
- ต่ำกว่า `lg` เป็น 2 คอลัมน์ ช่องสุดท้ายที่เหลือเดี่ยวกินเต็มแถว (ไม่เหลือช่องเทา) · ตั้งแต่ `lg` แถวเดียวกว้างเท่ากัน
- `grid-rows-subgrid` ต้องการ Chrome 117+ / Safari 16+ · เครื่องเก่าได้ grid ธรรมดาที่ยังอ่านได้ แค่ป้ายของแต่ละช่องไม่ตรงแนวกัน
- ไม่มี `aria-label` บน `<dl>` (ARIA ไม่ให้ตั้งชื่อ element ที่ไม่มี role) · ถ้าต้องมีชื่อ ผู้เรียกห่อด้วย `<section aria-labelledby>`

**a11y:** `<dl>` คู่ `dt`/`dd` · ช่องที่เป็นลิงก์ใช้ลิงก์ยืดเต็มช่อง (`after:absolute after:inset-0`) ชื่อลิงก์ = ป้าย (สั้น) ค่าอ่านเป็น `dd` · วงโฟกัสวาดที่ช่อง (`has-[a:focus-visible]`) · chevron เป็นภาพ แสดงด้วย `invisible`/`visible` ไม่ใช้ opacity (DS:554) · ป้ายแยกจากตัวเลขเสมอ เพราะความสูงบรรทัดของ `text-metric` ไม่พอสำหรับภาษาไทย (A/03:297)

**แทนของเดิม**

| ของเดิม | ที่ | plan |
|---|---|---|
| `SummaryTile` ×7 | `D/master-data/branches/page.tsx:295`, `brands/page.tsx:547`, `categories/page.tsx:364`, `companies/page.tsx:273`, `employees/page.tsx:311`, `locations/page.tsx:345`, `suppliers/page.tsx:191` · `tone="warning"` → `attention` | 2B-1 (pin `tests/supplier-adaptive-ui.test.ts:46-54` `grid-flow-col` ของ suppliers) |
| `SummaryTile` ของ `employees/[id]` · `MetricCard` ประจำไฟล์ | `D/master-data/employees/[id]/page.tsx:565` · `D/master-data/suppliers/[id]/page.tsx:306` | 2B-4 |
| `ResolutionMetric` (ช่องตัวกรอง → `current`) · `CoverageMetric` · `Metric` · `BatchMetric` | `D/audit/findings/page.tsx:517` · `D/audit/rounds/page.tsx:663` · `D/audit/rounds/[id]/page.tsx:794` · `D/disposal/batches/[id]/page.tsx:108` | 2B-2 |
| `SummaryCard` ของ data-quality | `D/admin/data-quality/page.tsx:228` | 2B-2 (I12) |
| `SummaryCard` ×5 · `Metric` · `MetricCard` ประจำไฟล์ · `MetricCard` กลาง 14 จุด | `D/admin/approvals/history/page.tsx:287`, `approvals/page.tsx:256`, `readiness/page.tsx:132`, `storage/page.tsx:280`, `D/notifications/page.tsx:142` · `D/my-assets/page.tsx:172` · `D/work-center/page.tsx:597` · `reports/*` | 2B-5 (pin VFG:64, :90, R-d) |
| ไม่แตะ (ไฟล์ 2C) | `admin/IntegrationClientManager.tsx:782` · `admin/system-settings-form.tsx:2122`, `:2413` · `disposal/disposal-bulk-approval.tsx:572` | 2C / 2D |

### 3.14 `KeyValueList` (`ui/key-value-list.tsx`, server-safe)

**ตอนนี้** ตัวช่วยประจำไฟล์ 11 ตัว (นับ `function (Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField)`): `Info` ×7 (`D/assets/[id]/page.tsx:2436`, `D/audit/findings/page.tsx:671`, `D/asset-management/import-export/page.tsx:219`, `D/disposal/[id]/page.tsx:427`, `D/maintenance/[id]/page.tsx:255`, `D/master-data/employees/[id]/page.tsx:598`, `assets/asset-movement-timeline.tsx:133`) · `InfoRow` (`D/master-data/suppliers/[id]/page.tsx:358`) · `DetailItem` (`D/my-assets/[id]/page.tsx:109`) · `BatchInfo` (`D/disposal/batches/[id]/page.tsx:109`) · `MobileAuditDetailField` (`D/audit/rounds/[id]/page.tsx:803`) · บางตัวใช้ `<div>` แทน `dt`/`dd` และเขียน `"-"` เอง

**API**

```ts
export type KeyValueItem = { key?: string; label: React.ReactNode; value: React.ReactNode; nilLabel?: string }  // nilLabel เช่น "ไม่มีผู้ถือครอง"
export function KeyValueList({ items, className }: { items: readonly KeyValueItem[]; className?: string }): React.JSX.Element
```

**markup**

```tsx
<dl data-slot="key-value-list" className={cn("grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-2 max-sm:grid-cols-1 max-sm:gap-y-0.5 max-sm:[&>dd+dt]:mt-2", className)}>
  {items.map((item, index) => (
    <React.Fragment key={item.key ?? index}>
      <dt className="text-meta text-faint-foreground">{item.label}</dt>
      <dd className="m-0 min-w-0 break-words text-sm text-foreground">{orNil(item.value, item.nilLabel)}</dd>
    </React.Fragment>
  ))}
</dl>
```

- ต้นแบบ `dl.kv` `120px | 1fr` gap `8px 16px` · `dt` 13/20 faint · `dd` 14/22 ink (`MK/base.css:80`, `:382-384`) · ≤600 ซ้อนเป็นคอลัมน์เดียว gap 2 และ `dd + dt` ห่าง 8 (`MK/screens/asset-detail.html:21-23`) → ใช้ `max-sm` (640)
- 120px ไม่ใช่ token: เป็นค่า arbitrary ในคอมโพเนนต์ (M05 §3, 2A I21)
- ค่าว่างเป็น `Nil` ผ่าน `orNil` · 0 และ false แสดงเป็นค่า (DS:514, R-n)
- มีแบบเดียว: แถบข้อเท็จจริงของหัวระเบียน (`.facts`) และแถวซ้ายขวาของมือถือเป็นงานเฟส 3 (M05 P14, P15)
- **a11y:** `dt`/`dd` จริง · `Nil` มีคำ sr-only

**จุดเรียก:** findings, rounds/[id] (2B-2) · import-export (2B-3) · หน้ารายละเอียด 6 หน้า + timeline (2B-4) · 2B-1 ไม่มีผู้เรียก

### 3.15 `ContentPanel` หัวมีเส้นคั่น (`ui/content-panel.tsx`)

**ตอนนี้** หัวไม่มีเส้นคั่น `mb-4` และเนื้อ `p-4 sm:p-5` (`:15-23`) · ผู้เรียก 6 จุดใน 3 ไฟล์ (`D/my-assets/page.tsx:51`, `:102` · `D/my-assets/[id]/page.tsx:68`, `:96` · `reports/reports-accounting-view.tsx:61`, `:88`)

**API** (เพิ่มแบบไม่บังคับ ค่าตั้งต้นเหมือนเดิมทุกอย่าง)

```ts
type ContentPanelProps = { /* เดิม :5-11 */ divided?: boolean; flush?: boolean }
export function ContentPanelRows({ className, ...props }: React.ComponentProps<"ul">): React.JSX.Element
```

| ส่วน | class | ต้นแบบ (`MK/base.css`) |
|---|---|---|
| กรอบ (`divided`) | `cn(getPanelClasses(), className)` ไม่มี padding | `.panel` (`:274`) |
| หัว (`divided`) | `<div data-slot="content-panel-head" className="flex min-h-14 min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">` · `h2` `text-base font-semibold text-foreground text-balance` · คำอธิบาย `text-meta text-muted-foreground text-pretty` · ปุ่ม `flex flex-wrap items-center gap-2` | `.panel-head` min-h 56 `10px 20px` เส้นล่าง (`:275`) · `.t-small` |
| เนื้อ (`divided`) | `px-4 py-4 md:px-5` · `flush` ไม่มี padding | `.panel-body` `16px 20px` (`:277`) |
| `ContentPanelRows` | `<ul data-slot="content-panel-rows" className={cn("divide-y divide-border-soft [&>*]:px-4 [&>*]:py-3 md:[&>*]:px-5", className)}>` | `.rows > *` `12px 20px` เส้น `line-soft` (`:278-280`) |

- ใช้ `flush` คู่กับ `DataTable framed={false}`, `ContentPanelRows` หรือ `EmptyNote padded` (DS:426) · ห้ามกรอบซ้อนในแผง (`MK/DIRECTION.md:18`)
- `divided={false}` render เหมือนวันนี้ทุก class (6 จุดเดิมไม่เปลี่ยน)
- ผู้ใช้แรก 2B-4 / 2B-5 (my-assets, หน้ารายละเอียด, รายงาน)

### 3.16 ไส้ใน `MasterDataSearch` → `SearchField` (O20)

**ตอนนี้** (`master-data/master-data-layout.tsx:42-80`) กรอบ `mb-4 rounded-lg border border-border bg-surface p-4` (`:56`) · `<input type="search">` ดิบ `h-10 … bg-background … focus:ring-1` ไม่มีชื่อ มีแค่ placeholder (`:63-69`) · ปุ่มเขียนเอง `h-10 … hover:bg-accent` (`:71-76`) · ผู้เรียก 6 จุด (`D/admin/users/page.tsx:80`, `D/audit/findings/page.tsx:239`, `D/audit/rounds/page.tsx:327`, `D/audit/rounds/[id]/page.tsx:632`, `D/audit/rounds/[id]/pending/page.tsx:148`, `D/master-data/departments/page.tsx:66`)

**ใหม่** (markup ข้อ 6.3.5 ทั้งก้อน, I8 · props คงเดิมทั้ง 5 ตัว `:42-54` · pin `tests/operational-return-navigation.test.ts:69`, `:83` ผ่านโดยไม่แก้ใน 2B-1 · 2B-2 แก้ต่อท้ายส่วน `pageSize`/`page`, I17)

```tsx
<form role="search" action={action} className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
  {Object.entries(hiddenInputs).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ))}
  <SearchField name="search" defaultValue={defaultValue} placeholder={placeholder} aria-label={submitLabel} fieldSize="md" className="sm:flex-[1_1_320px]" />
  <Button type="submit" variant="outline" size="md">{submitLabel}</Button>
</form>
```

- แถบเครื่องมือไม่มีกรอบ ช่องและปุ่ม 36 บนคอม (B3(4), `.toolbar` / `.field-search` `MK/base.css:250-251`) · มือถือ: ช่องและปุ่มเต็มแถวซ้อนกัน 44 ทั้งคู่ (เดิม `flex-col` เหมือนกัน, `master-data-layout.tsx:57`) · จาก `sm` อยู่แถวเดียว ช่องยืด ปุ่มกว้างตามข้อความ
- คง `mb-4`: ชนะ `space-y-6` ของรากหน้า แถบค้นหาจึงชิดตารางของมัน 16px (ตั้งใจ, I8)
- `SearchField` ไม่ส่ง `onClear` (หน้า server, `ui/search-field.tsx:16-17`) · ชื่อ = `aria-label={submitLabel}` ("ค้นหา" ทุกจุดเรียก) เท่าช่องค้นหาของทะเบียน (`tCommon("search")`, DS:449, I8) · placeholder ยังถูกอ่านเป็นคำอธิบาย · `role="search"` แบบช่องค้นหาของทะเบียน (`assets/asset-register-search-field.tsx:63`)
- `Button` ไม่มี hook จึงใช้ในไฟล์นี้ได้ (ไฟล์ไม่มี `"use client"`)
- ไม่แตะ `audit/audit-scan-search.tsx:51`, `audit/audit-scan-room-picker.tsx:75`, `layout/global-search.tsx:133` (O20 → เฟส 3)

### 3.17 ข้อความใหม่

| key | th | en | งาน |
|---|---|---|---|
| `common.tableScrollHint` | เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม | Scroll left/right to see more columns. | 4 |
| `common.showingRange` | {from}–{to} จาก {total} รายการ | {from}–{to} of {total} | 5 |
| `common.pageSizeLabel` | จำนวนต่อหน้า | Rows per page | 5 |
| `common.moreActionsFor` | การดำเนินการของ {code} | Actions for {code} | 7 |

คำตามตารางข้อความของข้อ 10.2 (I33): ใช้คำเดียวกับของทะเบียนที่มีอยู่ (ช่วงแถว = `asset.registerRange` · จำนวนต่อหน้า = `asset.pageSizeLabel` · ⋯ = `asset.rowActionsMenu` · ตัวบอกเลื่อน = ประโยคแรกของ `asset.tableScrollHint`) · ช่วงแถวไม่ขึ้นต้นด้วย "แสดง" เพราะท้ายตารางมี "แสดง" (`common.rowsPerPage`) อยู่แล้ว

- ผ่าน `node scripts/messages-edit.mjs <changes.json>` (รูปแบบ `{ "set": { "th": {…}, "en": {…} } }`, `scripts/messages-edit.mjs:1-3`) · ผ่าน `tests/thai-glossary.test.ts` และ `tests/messages-parity.test.ts`
- ใช้ key เดิม: `common.back`, `common.actions`, `common.pagination`, `common.pageOf`, `common.previous`, `common.next`, `common.rowsPerPage`, `common.delete`, `common.noData`, `common.noValue` · ชิปของทะเบียนใช้ `asset.activeFilters` (`label`), `asset.clearDrilldownFilter` (`removeLabel`), `asset.clearAllFilters` (`clearAll.label`) ที่มีอยู่
- `{total}` ใส่ค่าที่ผ่าน `formatCount` แล้ว (สตริง) ไม่ใช้ ICU number

### 3.18 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | ระยะรอบ `PageHeader` | ไม่มี margin ของตัวเอง ระยะใต้หัวเป็นของตัวห่อหน้า · ตัวห่อบาง `MasterDataHeader` ส่ง `mb-6` / `mb-4 md:mb-6` ต่อ | หน้าใช้ `space-y-4/5/6` และตัวห่อเปล่าต่างกัน (`p2b-map/03-frames-nav.md` §E1) margin ของหัวจะยุบรวมกับ `space-y` จนคุมไม่ได้ |
| 2 | ที่ของปุ่มกลับ | ตัวแรกของกลุ่มปุ่ม ตามด้วย ⋯ ปุ่มรอง ปุ่มหลัก | คงที่เดิมของทุกหน้า (B2) · ปุ่มหลักท้ายสุดตาม K8 |
| 3 | คำบนปุ่มกลับบนมือถือ | `max-md:sr-only` ไม่มี `aria-label` · `label` บังคับ ไม่มีค่าตั้งต้นจาก `useTranslations` | I1: สลับที่ `md` ตามปุ่มและช่อง (DS:572) · ชื่อเดียวกันทุกขนาดจอ · ไม่มี hook จึงใช้ในฟอร์ม client ได้ |
| 4 | ความสูงปุ่มกลับ | `size="md"` 36 จอใหญ่ | R-h ปุ่มในหัวเป็น `md` · ปุ่มกลับที่หัวฟอร์ม `h-10` เตี้ยลง 4px |
| 5 | `MasterDataHeader` ระหว่างทาง | เป็นตัวห่อบางตั้งแต่งาน 3 | R-h · หัวหน้า 11 จุดหน้าตาเดียวกันตั้งแต่ 2B-1 · pin 2 จุดแก้ในงาน 3 |
| 8 | ขอบซ้ายขวาของตาราง | 16 มือถือ · 20 ตั้งแต่ `md` · ผู้เรียกเปลี่ยนด้วย class ธรรมดาไม่ได้ (I3) | ต้นแบบลด gutter เป็น 16 ที่ ≤860 (`MK/base.css:480`) · ตรงกับหัวแผงและท้ายตาราง |
| 9 | ขอบของคอลัมน์ที่ค้าง | เส้น `border-border` ไม่มีเงา | R-j · ต้นแบบไม่มีเงา และ rgb นั้นไม่ใช่ token |
| 10 | สีแถวตอนเมนูเปิด | `has-[[aria-expanded=true]]` บนแถว ช่องค้าง และปุ่มถัดไป | โฟกัสย้ายเข้า portal แถวจึงเสีย `focus-within` · ครอบ popover ช่วยเหลือในแถวด้วย |
| 11 | หัวที่เรียงได้ | `aria-sort` เฉพาะคอลัมน์ที่เรียงอยู่ · ลูกศรเฉพาะคอลัมน์นั้น · ลิงก์ 44 มือถือด้วย `max-md:-my-2.5` | แบบ `supplier-list-view.tsx:211` ซึ่งเป็นจุดเดียวที่ถูก · หัวไม่สูงขึ้นเป็น 64 |
| 12 | ตัวบอกว่าเลื่อนได้ | ใบ client แยกไฟล์ · `DataTable` ไม่มี hook | R-j และ B6 ต้องได้ทั้งคู่ · บอกเฉพาะเมื่อล้นจริง (DS:508) |
| 13 | หน้าตา `Pagination` | `outline sm` คำอย่างเดียว · ช่วงแถวกับหน้าอยู่ซ้าย `aria-live` · จำนวนต่อหน้าเป็นลิงก์หน้าตา `Segmented` `aria-current="true"` | ต้นแบบ `.table-foot` · R-k · ลิงก์ใช้ `aria-pressed` ไม่ได้ · "page" จะสับสนกับเลขหน้า |
| 14 | pin `min-h-11` ของ `ui/pagination.tsx` | อยู่ใน `pageSizeOptionClasses` · ไม่แก้ test | R-k ให้คง pin · ปุ่มก่อนหน้า/ถัดไปใช้ `buttonVariants` (B1) ซึ่งมี 44 ต่ำกว่า `md` อยู่แล้ว |
| 15 | ขนาดช่องของ `FilterSelect` | ค่าตั้งต้น `lg` · แถบเครื่องมือส่ง `md` | R-l (แผงตัวกรอง 40) · B3(4) (แถบเครื่องมือ 36) |
| 16 | ชิปตัวกรอง | ทั้งชิปเป็นลิงก์ลบลิงก์เดียว ✕ เป็นภาพ · ชื่อ `` aria-label={`${removeLabel}: ${chip.label}`} `` | เป้ากด 44 บนมือถือ (M05 P4) · ชื่อที่อ่านเท่าวันนี้ (I7) · ต้นแบบมี ✕ แยก แต่ชิปของแอปเป็นลิงก์ URL อยู่แล้ว |
| 17 | `next` ของ `RowActions` | `undefined` ไม่มีช่อง · `null` ช่องว่าง 120 | ⋯ อยู่ที่เดิมในตาราง (ต้นแบบ `register.html:102`) · แถวมือถือไม่เสียที่ |
| 18 | เมนูหรือ sheet | `menu="auto"` ด้วย `useMediaQuery(48rem)` · ทะเบียนเลือกเอง | DS:507 · ตารางข้อมูลหลักเลื่อนแนวนอนบนมือถือ (B6) จึงต้องได้ sheet |
| 19 | ลบในแถว | `deleteAction` ใช้ `useDeleteAction` ตัวเดียวกับ `MasterDataDeleteButton` | B5: ยืนยันแบบเดิม · โฟกัสกลับ ⋯ · ไม่ต้องย้ายปุ่มลบเป็น component ในเมนู |
| 20 | รายการใน sheet | ใช้ `menuItemClasses` ที่ export จาก `ui/dropdown-menu.tsx` | DS:414-415 · M05 P8 · pin `tests/menu-primitives-ui.test.ts:9-13` อ่าน `const menuItemClasses =` ซึ่งยังอยู่ใน `export const …` |
| 21 | เส้นใต้ของ `TabNav` | inset shadow ทุกขนาดจอ เส้นฐานบน `ul` | B3(5) · กลไกเดียวกับ DS:503 ที่ guard ยึด · แท็บที่เลือกไม่สูงกว่า |
| 22 | scrollbar ของ `TabNav` | คงของระบบ | แถวตั้งค่า 11 แท็บ (O7) คนใช้เมาส์ต้องเลื่อนได้ · ทะเบียนวันนี้ก็มี scrollbar |
| 23 | โหมด client ของ `TabNav` | `onSelect` ผ่าน `Link onNavigate` | Next 16.4 ยกเลิกได้ด้วย `preventDefault` · Ctrl+คลิกยังเปิดแท็บใหม่ · หน้า server ไม่ส่งฟังก์ชัน |
| 24 | ช่องตัวกรองที่ใช้อยู่ของ `StatStrip` | `primary-soft` + เส้นใต้ 2px + `aria-current="page"` | สีของการเลือก ไม่ใช่สีสถานะ (DS:258) · มีรูปร่างกำกับ |
| 25 | ความต้องการจัดการใน `StatStrip` | บรรทัดท้าย `text-warning` + ไอคอน · ไม่มีขอบหรือพื้นสี | `SummaryTile tone="warning"` เดิมใช้ขอบเตือน · DIRECTION: สีบอกแค่เรื่องที่ต้องจัดการ |
| 26 | `KeyValueList` | แบบเดียว (สองคอลัมน์ ซ้อนบนมือถือ) | ตัวช่วย 11 ตัวเป็นแบบนี้ทั้งหมด · แถบข้อเท็จจริงเป็นเฟส 3 |
| 27 | `ContentPanel` | เพิ่ม `divided` / `flush` / `ContentPanelRows` · ค่าตั้งต้นไม่เปลี่ยน | ผู้เรียกเดิม 6 จุดไม่ขยับ · ไม่ต้องมี `PanelHead` แยกไฟล์ |
| 28 | `MasterDataSearch` | ไม่มีกรอบ `md` 36 · `aria-label={submitLabel}` · markup ข้อ 6.3.5 (I8) | B3(4) · ช่องเดิมไม่มีชื่อเลย · ชื่อเดียวกับช่องค้นหาของทะเบียน |

### 3.19 ความเสี่ยง

1. **ตัวห่อบางเปลี่ยนหัวของ 3 หน้าที่อยู่ plan หลัง** (assets, findings, rounds) ตั้งแต่ 2B-1 · ตรวจ 3 หน้านี้ที่ 375 / 768 / 1440 บนแอป dev ในงาน 25 ของ 2B-1 (ข้อ 10.5) · findings ยังมีปุ่ม "กลับไปรอบตรวจนับ" ที่มีไอคอน `Plus` (`master-data-layout.tsx:33`) จน 2B-2
2. **`Pagination` ของทะเบียนเปลี่ยนหน้าตาใน 2B-1** (ไม่มีลูกศร 32 บนคอม ข้อความอยู่ซ้าย) · `tests/asset-register-table-ui.test.ts:81-86` ไม่ยึดหน้าตา จึงต้องตรวจด้วยตา
3. **`ClickableTableRow` เปลี่ยนกับ 18 ไฟล์พร้อมกัน** · แถวที่มีลิงก์ในเซลล์จะค้างสีตอนโฟกัสลิงก์ (ตั้งใจ) · ตรวจแถวที่มี `select` หรือ checkbox ในเซลล์ (disposal) ว่าสีไม่ค้างหลังคลิก
4. **`useMediaQuery` ต่อแถว:** ตาราง 100 แถวมี 100 listener และ render แรกบนจอใหญ่เป็น sheet แล้วสลับ · ปุ่มหน้าตาเดียวกัน แต่ถ้าวัดได้ว่าช้า ให้ย้าย query ขึ้นไปที่ตัวตารางแล้วส่ง `menu` ลงมา
5. **`has-[[aria-expanded=true]]`** จับ popover ช่วยเหลือ (`AssetStateHelpPopover`) และ select ที่เปิดอยู่ด้วย · เป็นผลที่ต้องการ แต่ถ้ามีปุ่มในแถวที่ตั้ง `aria-expanded` ค้าง แถวจะค้างสี
6. **น้ำหนักตัวอักษรของ `TabNav` เปลี่ยน 400 → 600 ตอนเลือก** แท็บถัดไปขยับ 1–3px (ต้นแบบยอมรับ) · ถ้าผู้ใช้เห็นว่ากระตุก ทางแก้คือ `font-medium` ทั้งสองสถานะ
7. **`StatStrip` subgrid** บน Safari ต่ำกว่า 16 ป้ายไม่ตรงแนว (อ่านได้) · ลิงก์ยืดเต็มช่องทำให้ลากเลือกตัวเลขเพื่อคัดลอกยากขึ้น
8. **ป้าย 120px ของ `KeyValueList`** คำไทยยาว (เช่น "เลขที่ใบแจ้งหนี้") ขึ้นบรรทัดใหม่ · ตรวจตอน 2B-4
9. **`[td>&]:-my-1.25`** ดึงขึ้นเฉพาะเมื่อ `RowActions` เป็นลูกตรงของ `<td>` · ถ้าห่อด้วย div อื่นในเซลล์ ปุ่มจะดันแถวสูงขึ้น 10px
10. **การคัดลอกตารางที่มี `Nil`** ข้อความ sr-only ติดไปใน Excel (A/08:324) · ตรวจตอนหน้าแรกที่ใช้ `KeyValueList` / `DataTable` กับ `Nil`

### 3.20 เอกสาร

checklist · ลงเอกสารจริงในงาน 26 ของ 2B-1 (ข้อ 10.3, 10.6) · คอลัมน์ขวาบอกงานของ primitive ที่เป็นที่มา

| ที่ | เพิ่มหรือแก้ | primitive จากงาน |
|---|---|---|
| `DESIGN.md:284` | Display 700 → **600** (B3(1)) · หัวเรื่องหน้ามาจาก `PageHeader` | 3 |
| `DESIGN.md:493` | "the page header owns the gap" → `PageHeader` วาง `Breadcrumbs` ด้วย `mb-1` | 3 |
| `DESIGN.md` §5 Navigation (หลัง `:493`) | หัวข้อใหม่ `PageHeader` (title, meta, ปุ่ม `md`, ลำดับ K8, `compactOnMobile`) · `PageBackLink` (B2: `outline` + `ArrowLeft`, ไอคอน 44 ต่ำกว่า `md`, `label` บังคับ, พา `returnTo`, ส่งผ่าน `back={<PageBackLink … />}`, I1) · `TabNav` (nav + `aria-current`, เส้นใต้ทุกขนาดจอ, 44 มือถือ, ตัวนับ `text-meta num`, `onSelect` client) · เมื่อไรใช้ `Segmented` แทน | 3, 8 |
| `DESIGN.md:496-498` Data Tables | โครง `DataTable`: กรอบ 12px · หัวขาว 13/500 จาง ไม่มีตัวพิมพ์ใหญ่ · เส้นแถว `border-soft` · แถว 46 ไม่มีความแน่นแบบอื่น (ทะเบียนเป็นข้อยกเว้นด้วย class ในไฟล์ของตัวเอง, I3) · ขอบ 16/20 ที่คอลัมน์แรกและสุดท้ายผู้เรียกเปลี่ยนด้วย class ธรรมดาไม่ได้ (I3) · `group/row` + `focus-within` + เมนูเปิด · คอลัมน์ค้างมีเส้นไม่มีเงา · `aria-sort` · `TableEmptyRow` · `DataTableFoot` + `Pagination` (ช่วงแถว 25/50/100 `aria-live`) · ตัวบอกว่าเลื่อนได้ · ประโยค "44 sites move in 2B" แก้ตามจำนวนที่เหลือ | 4, 5 |
| `DESIGN.md:500-510` | เพิ่มกติกากลาง: `FilterSelect` (`lg` ในแผง `md` ในแถบเครื่องมือ) · `FilterChipList` · `RowActions` ช1 (ช่อง 120 × 32 ตายตัว, ⋯ `ghost icon-sm`, รายการที่ทำไม่ได้, sheet ต่ำกว่า md, ลบ 2 ขั้น) · ข้อความเฉพาะทะเบียน (`:502`, `:503`, `:505`) แก้ใน 2B-3 | 6, 7 |
| `DESIGN.md:432` | ตารางเต็มหน้ามุม 12px · "8px for compact tables" ลบตอน `getTableShellClasses` เลิกใช้ (2B-5) | 4 |
| `DESIGN.md:258`, `:291`, `:300` | `StatStrip` ไม่มีพื้นสี · ตัวอย่างของ `num` จาก MetricCard เป็น StatStrip | 9 |
| `DESIGN.md:426` | `EmptyNote padded` ใช้ใน `TableEmptyRow` และ `ContentPanel flush` | 4, 11 |
| `DESIGN.md` §5 Cards / Containers (`:430-436`) | `ContentPanel divided` / `flush` / `ContentPanelRows` · `KeyValueList` | 10, 11 |
| `DESIGN.md:534` | Do: เพิ่ม primitive ใหม่ทั้งหมด | 3–12 |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:54-79` | แถวใหม่ในตาราง Shared Components: PageHeader / PageBackLink · DataTable + TableEmptyRow · Pagination · FilterSelect · FilterFormActions · FilterChipList · RowActions · TabNav · StatStrip · KeyValueList · ContentPanel divided | 3–12 |
| `.impeccable/design.json` | components ใหม่: table, tabs, page-header, stat-strip, pagination, key-value, row-action, filter-chip (R-s · รายการตามข้อ 10.6) | 26 |
| `docs/99_CHANGELOG.md` · `DEVELOPER_HANDOFF.md` | บันทึก primitive ของ 2B-1 และผลที่เห็นทันที (ข้อ 3 ต้นส่วน) | 26 · ตัวเลข verify งาน 27 |
| wiki `AssetSystem` | หน้า `ams-` ของ UI primitive + `ams-log.md` + `wiki-lint` | 27 |

### 3.21 test

ไฟล์ test ใหม่อ่านไฟล์ด้วย `readFileSync(path, "utf8").replace(/\r\n/g, "\n")` แบบไฟล์อื่น · regex ที่อ่านไฟล์โดยไม่แปลงห้ามมี `\n`

**ตาราง A: ต้องผ่านต่อโดยไม่แก้** (ตรวจบรรทัดแล้ว)
- `tests/asset-register-building-blocks-ui.test.ts:8-17`, `:42-47` (ข้อ 3.8)
- `tests/clickable-table-row-navigation.test.ts:6-18` · `tests/asset-register-ux.test.ts:95-100`, `:169-175` (ข้อ 3.7)
- `tests/menu-primitives-ui.test.ts:60-103` (export ไม่ทำให้ `classesOf` หาไม่เจอ)
- `tests/dropdown-menus-ui.test.ts` ทั้งไฟล์ (ตลอด 2B-1 · `:27-38` เขียนใหม่ใน 2B-3 ตาม I5) · `tests/dialog-trigger-handles.test.ts:14-52` (ไม่แตะไฟล์ของ P0 และ row actions ของทะเบียน)
- `tests/feedback-states-ui.test.ts:100-125` (ไม่แก้ `EmptyNote`, `ActionEmptyState`) · `tests/field-primitives.test.ts` (ไม่แก้ `Field`, `SearchField`)
- `tests/operational-return-navigation.test.ts:69`, `:83` · `tests/audit-pending-mobile-ux.test.ts:14-15` (ตลอด 2B-1 · 2B-2 แก้ต่อท้าย I17) · `tests/master-data-workspace.test.ts:13-23` · `tests/confirm-dialog-ui.test.ts:36` (I5)
- VFG:10-13 (วงโฟกัส) · VFG:177-199 (`text-metric` คู่ `num` · `tag` ไม่หนาไม่ตั้งขนาด · faint ไม่อยู่บนพื้นสถานะ) · VFG:220-254 (R1 · R7 · R7 interim ≤ 44: primitive ไม่เพิ่ม fill) · VFG:260-272 (R2: ไฟล์ใหม่ 0)
- FMG:532-548 (GB4) · FMG:550-557 (GD1: sheet ใช้ `closeLabel` ตั้งต้น) · FMG:589-603 (GD4 ใน `ui/` = 0)
- `tests/class-merge.test.ts` · `tests/thai-glossary.test.ts` · `tests/messages-parity.test.ts` · `tests/design-tokens-contrast.test.ts`

**ตาราง B: แก้ใน commit ที่ทำให้พัง**

| test:บรรทัด | เปลี่ยนเป็น | งาน |
|---|---|---|
| `tests/breadcrumbs-ui.test.ts:37-42` | นับ `/<Breadcrumbs\b[\s\S]*?\/>\|\bbreadcrumbs=\{\[[\s\S]*?\]\}/g` และข้าม `src/components/ui/page-header.tsx` · คง 11 จุด และ `code: true` 8 จุด · regex ท้าย trail (`:58`) ใช้ได้กับทั้งสองรูปเพราะจบด้วย `]}` (R-i) | 3 |
| `tests/asset-register-filter-ui.test.ts:112-119` | ยึด `page-header.tsx`: `compactOnMobile\?: boolean` · `compactOnMobile && "max-md:text-xl"` · `compactOnMobile && "max-md:hidden"` · แถว compact `"flex items-center justify-between gap-3 md:items-start md:gap-x-6"` (string ของ I1) · และ `master-data-layout.tsx`: `compactOnMobile \? "mb-4 md:mb-6" : "mb-6"` | 3 |
| `tests/supplier-adaptive-ui.test.ts:58` (I2) | `href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}` (`md` สูง 44 ต่ำกว่า md) · งานย้ายหน้า suppliers ย้าย pin ไปที่ `actions` ของ `PageHeader` | 3 |

**ตาราง C: test ใหม่**

| ไฟล์ | ตรวจ | งาน |
|---|---|---|
| `tests/list-primitives-ui.test.ts` (ใหม่) | **server-safe:** `page-header.tsx`, `data-table.tsx`, `pagination.tsx`, `filter-select.tsx`, `filter-chips.tsx`, `tab-nav.tsx`, `stat-strip.tsx`, `key-value-list.tsx`, `content-panel.tsx` ไม่มี `"use client"`, `useState`, `useEffect`, `createContext`, `useContext` · ทั้ง 9 ไฟล์และ `data-table-scroll.tsx`, `row-actions.tsx` ไม่มี `\bshadow-(?:sm\|md\|lg\|xl\|2xl)\b`, `opacity-`, `leading-tight`, `leading-4`, `rounded-\[`, `flex-col-reverse`, `uppercase`, `bg-muted/` | 3–11 |
| เดียวกัน | **หัวหน้า (string ของ I1):** `<header data-slot="page-header"` · `<Breadcrumbs items=\{breadcrumbs\} className="mb-1" \/>` (มีจุดเดียว) · `"flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"` · `"flex items-center justify-between gap-3 md:items-start md:gap-x-6"` · `"text-2xl font-semibold text-balance break-words text-foreground"` · `"mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground"` · `"flex flex-wrap items-center gap-2 md:justify-end"` · `buttonVariants\(\{ variant: "outline", size: "md" \}\), "min-w-11 max-md:px-0"` · `<span className="max-md:sr-only">\{label\}<\/span>` · `<ArrowLeft aria-hidden="true" \/>` · `data-slot="page-back-link"` · `page-header.tsx` ไม่มี `useTranslations` และ `description` · `master-data-layout.tsx` มี `<PageHeader`, `meta=\{subtitle\}` และ `buttonVariants\(\{ size: "md" \}\)` ไม่มี `font-bold` | 3 |
| เดียวกัน | **ตาราง:** ค่าคงที่ `dataTableHeadClasses`, `dataTableCellClasses`, `dataTableRowClasses` เท่ากับข้อ 3.4 ทุกตัวอักษร · ไม่มี `group-data-\[density`, `data-density` และ `group/table` (I3) · `<caption className="sr-only">` · `aria-sort=\{` คู่ `"ascending"` และ `"descending"` · `scope="col"` · `\[&>tr:last-child>td\]:border-b-0` · `TableEmptyRow` มี `className="p-0"` และ `<EmptyNote padded` · `clickable-table-row.tsx` ใช้ `cn\(dataTableRowClasses,` และไม่มี `focus:bg-row-hover` · `data-table-scroll.tsx` เริ่มด้วย `"use client"` มี `ResizeObserver` และ `role=\{[^}]*"region"` | 4 |
| เดียวกัน | **แบ่งหน้า:** `aria-live="polite"` · `buttonVariants\(\{ variant: "outline", size: "sm" \}\)` · `rel="prev"` และ `rel="next"` · `aria-current=\{[^}]*"true"` · ไม่มี `ChevronLeft`, `ChevronRight`, `bg-muted` · key `common.showingRange`, `common.pageSizeLabel` มีทั้ง th และ en | 5 |
| เดียวกัน | **ตัวกรอง:** `filter-select.tsx` มี `<Field` และ `<NativeSelect` และ `fieldSize = "lg"` · `allLabel \? <option value="">` · ไม่มี `<select` และ `<label` ดิบ · `filter-chips.tsx` มี `data-slot="filter-chips"` · `` aria-label=\{`\$\{removeLabel\}: \$\{chip\.label\}`\} `` · `focus-visible:ring-ring focus-visible:ring-offset-2` · `linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"` · `group-hover/chip:bg-primary-border` · `export type FilterChipItem` · ไม่มี `rounded-full` (I6, I7) | 6 |
| เดียวกัน | **แท็บ:** `<nav aria-label=\{ariaLabel\}` · `\{\.\.\.navProps\}` บน `<nav` · `linkClassName` อยู่ใน `cn\(` ของลิงก์ · ไม่มี `fullBleed` (I9) · `aria-current=\{selected \? "page" : undefined\}` · ไม่มี `role="tablist"`, `aria-pressed`, `scrollbar-none`, `border-b-2` · ค่าคงที่ 3 ตัวตามข้อ 3.12 · `shadow-\[inset_0_-1px_0_var\(--border\)\]` บน `ul` · `onNavigate=\{onSelect \?` | 8 |
| เดียวกัน | **ตัวเลข:** `"text-metric num text-foreground"` · `grid-rows-subgrid` · `aria-current=\{item\.current \? "page" : undefined\}` · ไม่มี `bg-(?:success\|warning\|danger\|info)-soft` และ `border-(?:success\|warning\|danger\|info)-border` · `invisible group-hover:visible` · ใช้ `<dl`, `<dt`, `<dd` | 9 |
| เดียวกัน | **ค่า:** `grid-cols-\[120px_minmax\(0,1fr\)\]` · `orNil\(item\.value, item\.nilLabel\)` · `<dt className="text-meta text-faint-foreground">` | 10 |
| เดียวกัน | **แผง:** `content-panel.tsx` ยังมี `"p-4 sm:p-5"` ในทางที่ไม่ `divided` · มี `min-h-14` และ `border-b border-border` ในหัวแบบ `divided` · export `ContentPanelRows` ที่มี `divide-border-soft` | 11 |
| เดียวกัน | **ค้นหา (I8):** `master-data-layout.tsx` มี `<SearchField`, `fieldSize="md"`, `aria-label=\{submitLabel\}`, `<Button type="submit" variant="outline" size="md">`, `role="search"`, `"mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"` · ไม่มี `<input\s+type="search"` และ `rounded-lg border border-border bg-surface p-4` | 12 |
| `tests/row-actions-ui.test.ts` (ใหม่) | เริ่มด้วย `"use client"` · `data-no-row-click` 3 จุด (ตัวห่อ · `<DropdownMenuContent data-no-row-click` · `<SheetContent side="bottom" data-no-row-click`) · `variant="ghost" size="icon-sm"` · `rowNextClasses` เท่ากับข้อ 3.11 ทุกตัวอักษร · `<span aria-hidden="true" className="w-30 shrink-0" \/>` · `<span className="sr-only"> \{code\}<\/span>` · หัว sheet `<span className="tag font-medium">\{code\}<\/span>` (I5) · `<DropdownMenuItem unavailable>` + `DropdownMenuItemDescription` · `useDeleteAction\(` + `returnFocusRef: triggerRef` · `modal=\{false\}` · `onCloseAutoFocus` · `openerRef\.current =` · `useMediaQuery\("\(min-width: 48rem\)"\)` · `menuItemClasses` import จาก `@/components/ui/dropdown-menu` · ไม่มี `closeLabel=`, `pr-14`, `pb-\[env`, `hover:bg-accent`, `opacity-` · key `common.moreActionsFor` มีทั้ง th และ en · `dropdown-menu.tsx` มี `export const menuItemClasses` และ `export const menuItemDestructiveClasses` | 7 |

**ตาราง D: ส่งต่อให้ส่วนกลุ่มหน้า** (pin ของจุดเรียก เจ้าของคือส่วนที่ย้ายหน้า)
- `tests/master-data-brand-supplier-ui.test.ts:9-10` → หัวของ brands (2B-1) · `:22`, `:40`, `:44` ผ่านโดยไม่แก้ (I11)
- `tests/supplier-adaptive-ui.test.ts:16`, `:24`, `:29`, `:37-38`, `:46` → `DataTable`, `RowActions`, `Pagination` และ `StatStrip` ของ suppliers (2B-1 งาน 20 · `:50-55` ผ่านต่อ · ตาราง A ข้อ 10.4)
- `tests/audit-rounds-ux.test.ts:39` → `/<TabNav\b[\s\S]*?scroll=\{false\}/` · `:11`, `:38` ผ่านต่อ (I20) · VFG:226-231 → `TabNav` (2B-2)
- `tests/maintenance-pagination-ui.test.ts:5-14`, `:16-19` · `tests/disposal-route-structure.test.ts:10`, `:18`, `:22-26` · `tests/audit-round-result-drilldown.test.ts:138` → `Pagination` (2B-2 · ตาราง A ข้อ 10.4)
- `tests/disposal-route-structure.test.ts:33` → `/<PageBackLink href=\{returnToHref\}/` (2B-1, I19)
- `tests/asset-register-table-ui.test.ts:13-25`, `:32`, `:81-86` · `tests/dropdown-menus-ui.test.ts:27-38` (I5) · `tests/asset-register-filter-ui.test.ts:58-59` (I6), `:65-83` (ชิป `:79-82` อ่าน `ui/filter-chips.tsx`, I7), `:107-110` · `tests/asset-status-help-ui.test.ts:49-51` (I6 · `:49-50` ยึด `help=` เหมือน `:51`) · VFG:143-148 → ทะเบียน (2B-3)
- `tests/asset-detail-tabs.test.ts:18` เฉพาะเมื่อเปลี่ยนวิธีจับแท็บที่เลือก (`:15-20` ที่เหลือผ่านต่อ, I9) · `tests/asset-detail-ux.test.ts:27` (`aria-label` ของปุ่มกลับ → ข้อความ `max-md:sr-only`), `:39-40`, `:151-152` → 2B-4 (ตาราง A ข้อ 10.4)
- VFG:64, :90 · `tests/report-controls-ui.test.ts:13-17` → 2B-5 (ตาราง A ข้อ 10.4) · `tests/design-system.test.ts:44-45` ผ่านต่อ (`getTableShellClasses` คงไว้ให้ 2D ลบ · ข้อ 9.6)
