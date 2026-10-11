> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2a-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** โดยเฉพาะ I15 (มุมโค้งตามต้นแบบจริง: ปุ่ม md/lg และช่องกรอก 8px · ปุ่ม sm, segmented, chip และป้ายสถานะ 6px · เมนู popover toast 12px) และ I14 (สีจางบน primary-soft อนุญาต)

## 3. token และตัวอักษร (`src/app/globals.css`)

ส่วนนี้วาง token สี ขนาดตัวอักษร มุมโค้ง เงาของช่องกรอก และ utility ที่ทุกส่วนของเฟส 2 ใช้ ทำใน 2A ทั้งหมด รวม token ที่ 2B และ 2C ต้องใช้ด้วย เพราะ 2B กับ 2C ทำคู่กัน ถ้าแต่ละฝั่งเพิ่ม token เองจะแก้บล็อก `:root` และ `tests/design-tokens-contrast.test.ts` ชนกัน หลัง 2A จบ 2B/2C/2D ไม่เพิ่ม token ใน `:root` ถ้าจำเป็นต้องทำเป็นงานแยกที่ลงก่อนแตกสาย

ไฟล์ที่แก้: `src/app/globals.css` · `src/lib/utils.ts` · `tests/design-tokens-contrast.test.ts` · `tests/visual-foundation-guards.test.ts` · test ใหม่ `tests/class-merge.test.ts` · ลบ class placeholder 13 บรรทัดใน 10 ไฟล์ (ข้อ 3.6) · `DESIGN.md` · `.impeccable/design.json`

ค่าทุกค่าในส่วนนี้ตรวจกับโค้ดที่ `081d538` แล้ว contrast คำนวณด้วยสูตรเดียวกับ `src/lib/color-contrast.ts` ส่วนลำดับ CSS และการรวม class ทดลองด้วย `compile()` ของ `node_modules/tailwindcss` (4.2.4) และ `tailwind-merge` (3.5.0) ของ repo (สคริปต์อยู่นอก repo ที่ `scratchpad/p2a-probe-tokens/`)

### 3.1 token สีใหม่ใน `:root`

ใช้ hex 6 หลักเท่านั้น ค่า `color-mix` ของต้นแบบคำนวณเป็น hex ไว้แล้ว ทุกตัวต้องมี `--color-X: var(--X);` ใน `@theme inline` ซึ่ง `tests/design-tokens-contrast.test.ts:103-108` ตรวจเองอยู่แล้ว

| token | ค่า | ชื่อในต้นแบบ | class | ใช้ที่ | ผู้ใช้แรก |
|---|---|---|---|---|---|
| `--faint-foreground` | #56677F | ink-3 | `text-faint-foreground` · `placeholder:text-faint-foreground` | ตัวหนังสือระดับจาง (ข้อ 3.2) | 2A: placeholder เมนู ปุ่ม disabled |
| `--control-border` | #C3CDDA | btn-line | `border-control-border` | ขอบปุ่มรอง (outline) | 2A: ปุ่ม |
| `--border-soft` | #E7EBF1 | line-soft = `color-mix(line 60%, surface)` | `border-border-soft` · `divide-border-soft` · `bg-border-soft` | เส้นคั่นแถวตาราง แถวใน panel เส้นคั่นเมนู | 2A: เส้นคั่นเมนู (`dropdown-menu.tsx:172` `bg-border`) · 2B: ตาราง และ `PanelRows` |
| `--row-hover` | #F3F6FB | row-hover = `color-mix(primary-soft 55%, surface)` | `bg-row-hover` · `[--row-bg:var(--color-row-hover)]` | พื้นแถวตารางตอน hover หรือ focus-within เป็นสีทึบ จึงใช้กับ sticky cell ได้ | 2A: codemod R7 ข้อ row hover · 2B: DataTable, `ClickableTableRow` |
| `--neutral-ink` | #2A4468 | neutral-ink | `bg-neutral-ink` | ขีดของป้ายสถานะ neutral และ muted | 2A: StatusBadge (`badge-variants.ts:54-55` เปลี่ยน `bg-muted-foreground` เป็น `bg-neutral-ink`) |

ตำแหน่งใน `:root` (:7-63):
- `--faint-foreground` และ `--neutral-ink` ต่อจาก `--muted-foreground` (:26)
- `--row-hover` ต่อจาก `--accent-foreground` (:28)
- `--border-soft` และ `--control-border` ต่อจาก `--border` (:29)

mapping 5 บรรทัดวางคู่กับตัวเดิมใน `@theme inline` (:65-125)

ไม่เพิ่ม:

| ต้นแบบ | ใช้แทน | เหตุผล |
|---|---|---|
| subtle #F6F8FB | `--background` | ค่าเดียวกัน (สเปกเฟส 1 §3.1) |
| line-strong #8796AA | `--input` #7C8BA0 | สเปกเฟส 1 §3.4 · ตัวคั่น crumb ก็ใช้ `--input` ได้ ไม่ต้องมี token ใหม่ (critic §3 #1) |
| focus | `--ring` | มีแล้ว |
| neutral-line #C9D3E0 | — (เฟส 3) | ผู้ใช้มีแค่ avatar กับ `.cbox.lock` ในตัวเลือกคอลัมน์ ทั้งคู่อยู่เฟส 3 |

### 3.2 ตัวหนังสือ 3 ระดับ (D2)

| ระดับ | token | ค่า | ใช้กับ |
|---|---|---|---|
| เนื้อหา | `foreground` | #0B1D35 | ค่าข้อมูล ชื่อ หัวข้อ ข้อความปุ่ม label ของช่องกรอก |
| รอง | `muted-foreground` | #3C4F6B | บรรทัด meta ใต้หัวหน้า ป้ายของตัวเลข ข้อความป้ายสถานะแบบสงบ ปุ่ม ghost |
| จาง | `faint-foreground` | #56677F | placeholder · hint ใต้ช่อง · หัวตาราง · เส้นทางนำทาง · บรรทัดย่อยในตาราง · บรรทัดท้ายของตัวเลข · ตัวนับในแท็บ · trail และบรรทัดเหตุผลในเมนู · รายการเมนูที่ใช้ไม่ได้ · ข้อความของปุ่มและช่องที่ disabled · หน่วย (บาท) · ขีดค่าว่าง (`Nil`) · หน้าว่างแบบบรรทัด · ไอคอนในช่องกรอก · ลูกศร select |

**ห้ามใช้ faint กับ:**
- พื้น `success-soft` / `warning-soft` / `danger-soft` / `info-soft` ให้ใช้ tone ink หรือ `muted-foreground` แทน ค่าจริงผ่าน (5.10-5.28) แต่บนพื้นสีต้องให้ tone เป็นตัวนำ
- ค่าข้อมูลหลัก
- ข้อความเดียวที่บอกว่า control นั้นคืออะไร
- พื้น `bg-border-soft` ซึ่งเป็นสีของเส้น ไม่ใช่พื้น

พื้น `primary-soft` ใช้กับ faint ได้เฉพาะตอนเป็นสถานะ hover หรือเลือกของแถวหรือรายการเมนู เพราะต้นแบบวาง trail และบรรทัดเหตุผลบนรายการเมนูที่ hover

contrast (คำนวณจากค่าใน `globals.css`):

| ตัวหนังสือ | card / popover | background | canvas | muted / secondary | accent | row-hover | primary-soft |
|---|---|---|---|---|---|---|---|
| `faint-foreground` | 5.77 | 5.42 | 5.09 | **4.95** | 5.04 | 5.32 | 4.99 |
| `muted-foreground` | 8.32 | 7.82 | 7.35 | 7.14 | 7.27 | 7.68 | 7.20 |

placeholder เดิมใช้ `color-mix(in oklab, currentcolor 50%, transparent)` ของ preflight (`node_modules/tailwindcss/preflight.css:291-296`) ได้ประมาณ #858E9A คือ 3.32 บนขาวและ 3.25 บน background ซึ่งไม่ผ่าน AA

### 3.3 ขนาดตัวอักษรใหม่ (D1, D3) ในบล็อก `@theme` ธรรมดา (:128-133)

| class | ขนาด | line-height ทุกภาษา (หน้าไทยเท่ากัน) | อัตราส่วน | น้ำหนักตั้งต้น | letter-spacing | ใช้กับ |
|---|---|---|---|---|---|---|
| `text-meta` | 13 (0.8125rem) | 20 | 1.54 | สืบทอด | — | crumbs · meta ใต้หัวหน้า · หัวตาราง · บรรทัดย่อย · hint/error · ข้อความป้ายสถานะ · ปุ่ม sm · ปุ่มในแถว · chip · ตัวนับแท็บ · ท้ายตาราง · trail เมนู · ป้ายและบรรทัดท้ายของ Stat · หน้าว่างแบบบรรทัด (label ของฟอร์มให้ส่วนช่องกรอกตัดสิน) |
| `text-metric` | 28 (1.75rem) | 32 | 1.14 | 500 | -0.02em | ค่าใน Stat |
| `text-count` | 20 (1.25rem) | 24 | 1.20 | 600 | -0.01em | ตัวเลขนับในแถว และ Stat แบบแน่น |

```css
@theme {
  --text-meta: 0.8125rem;
  --text-meta--line-height: calc(20 / 13);
  --text-metric: 1.75rem;
  --text-metric--line-height: calc(32 / 28);
  --text-metric--font-weight: 500;
  --text-metric--letter-spacing: -0.02em;
  --text-count: 1.25rem;
  --text-count--line-height: calc(24 / 20);
  --text-count--font-weight: 600;
  --text-count--letter-spacing: -0.01em;
}
```

- Tailwind 4.2.4 สร้าง `font-weight: var(--tw-font-weight, 500)` และ `letter-spacing: var(--tw-tracking, -0.02em)` จาก sub-prop (ตรวจด้วย `compile()` แล้ว) ใส่ `font-semibold` หรือ `tracking-normal` ทับได้ และ `font-bold` ของ element แม่จะไม่ไหลลงมา เพราะ `--tw-font-weight` ลงทะเบียนเป็น `inherits: false`
- line-height เป็นอัตราส่วนตามกฎเฟส 1 ซึ่ง guard ที่ `visual-foundation-guards.test.ts:48` ตรวจอยู่
- **หน้าไทยไม่ต้อง override:**
  - meta 20/13 = 1.54 ≥ 1.44
  - metric 1.14 และ count 1.20 ต่ำกว่าเกณฑ์ แต่ใช้กับตัวเลขเท่านั้น ต้นแบบก็ใช้ค่าเดียวกันบนหน้าไทย
  - บังคับด้วย guard: class string ที่มี `text-metric` หรือ `text-count` ต้องมี `num` ด้วย (ข้อ 3.9)
  - หน่วยภาษาไทยในบรรทัดตัวเลขเป็น `<span>` `text-base` อยู่ข้างใน กล่องบรรทัด 32px มีที่พอสำหรับสระซ้อน ห้ามให้หน่วยขึ้นบรรทัดของตัวเองด้วย `text-metric`
- `num` ต้องใส่เองที่ค่า เพราะ sub-prop ใส่ `font-variant-numeric` ไม่ได้
- ไม่แตะบล็อก `html:lang(th)` (:189-195) ดังนั้น test :44-47 ยังผ่าน
- comment ที่ :131 ("Only text-sm differs…") แก้ให้บอกว่ามี 3 ขนาดของต้นแบบเพิ่ม และทุกค่าเป็นอัตราส่วน

### 3.4 มุมโค้งและเงาของช่องกรอก (D7) ในบล็อก `@theme` ธรรมดา

| ค่า | class | หมายเหตุ |
|---|---|---|
| `--radius-control: 6px` | `rounded-control` | ต้องอยู่ใน `@theme` ไม่ใช่ `:root` เพราะ test จะหา `--color-radius-control` (มีข้อยกเว้นแค่ `radius`, :106) · ไม่ repoint `--radius-sm` 4px (`rounded-sm` 11 บรรทัดใน 8 ไฟล์) และ `--radius-md` 8px |
| `--shadow-field-focus: 0 0 0 4px rgb(16 133 141 / 0.16)` | `focus:shadow-field-focus` | halo ของช่องกรอก = ring #10858D ที่ 16% ตามต้นแบบ · ใช้คู่ `ring-1` ได้ เพราะ Tailwind รวม `--tw-ring-shadow` กับ `--tw-shadow` ไว้ใน `box-shadow` เดียว (ตรวจแล้ว) |
| `--shadow-field-error: 0 0 0 4px rgb(179 38 30 / 0.14)` | `aria-invalid:shadow-field-error` | danger #B3261E ที่ 14% · ไม่ใช้ prefix `focus:` จึงไม่ชน guard สีโฟกัสที่ `visual-foundation-guards.test.ts:11` |

**ขอบเขตของ `rounded-control`** ยึดหน้าเปรียบเทียบที่ผู้ใช้อนุมัติ ข้อ 7 "มุมโค้งของปุ่มและช่องกรอก 6px" ซึ่งแสดงปุ่ม 36/40 และช่องกรอกที่ 6px

| ใช้ `rounded-control` 6px | คง |
|---|---|
| ปุ่มทุกขนาด · ช่องกรอก select textarea SearchField และตัวเปิด SearchableSelect · ป้ายสถานะ · รายการเมนู · ช่องค้นหาในเมนู · ปุ่มในแถว (ช1) · ปุ่มใน Segmented | panel ตาราง เมนู dialog ใช้ `rounded-lg` 12px ตามต้นแบบ · chip ในแถบเครื่องมือ 8px |

ดูความเสี่ยง R3 ด้วย

### 3.5 รวม class ด้วย tailwind-merge (`src/lib/utils.ts`) ต้องลงพร้อม token

`cn()` ใช้ `twMerge` ตรง ๆ (`src/lib/utils.ts:2,5`) tailwind-merge 3.5.0 ไม่รู้จักชื่อขนาดใหม่ ทดลองกับ package ของ repo ได้ผลดังนี้:

| เรียก | ผลแบบเดิม (`twMerge`) | ผลหลังแก้ |
|---|---|---|
| `cn("text-muted-foreground", "text-meta")` | `text-meta` **(สีหาย)** | `text-muted-foreground text-meta` |
| `cn("text-metric", "text-foreground")` | `text-foreground` **(ขนาดหาย)** | `text-metric text-foreground` |
| `cn("text-sm", "text-meta")` | `text-sm text-meta` (ไม่รวม ขนาดที่ได้ขึ้นกับลำดับ CSS) | `text-meta` |
| `cn("rounded-md", "rounded-control")` | `rounded-md rounded-control` (CSS ออก control ก่อน md จึงได้ 8px) | `rounded-control` |
| `cn("shadow-sm", "shadow-field-focus")` | เก็บทั้งคู่ | `shadow-field-focus` |

ถ้าไม่แก้ ตัวอย่างเช่น `cn(buttonVariants({ size: "sm" }), "text-muted-foreground")` จะทำให้ปุ่ม sm หลุดจาก 13px

แก้เป็น:

```ts
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["meta", "metric", "count"], radius: ["control"], shadow: ["overlay", "field-focus", "field-error"] } },
})
```

ใส่ `overlay` ด้วย เพราะ `shadow-overlay` ของเฟส 1 ตอนนี้ถูกจัดเป็นสีเงา `shadow-overlay` มี 7 จุดใน `src/components/ui/` และไม่มีผู้เรียกที่ส่ง `shadow-*` อื่นเข้าไปใน className ของ overlay (grep แล้ว) ผลข้างเคียงจึงเป็นศูนย์

`text-faint-foreground`, `border-control-border`, `bg-row-hover`, `border-border-soft` และ `bg-neutral-ink` ถูกจัดเป็นกลุ่มสีอยู่แล้ว ไม่ต้องเพิ่ม

### 3.6 base rule `::placeholder`

```css
/* ใน @layer base ช่วง "Base surface rules" (:219-236) ต่อจาก ::selection */
::placeholder {
  color: var(--faint-foreground);
}
```

- กฎนี้ชนะ preflight เพราะอยู่ layer เดียวกัน (`@layer base`) มาทีหลัง และ specificity เท่ากัน ส่วน `@supports` ที่ครอบ preflight ไม่มีผลต่อลำดับ · `opacity: 1` มีใน preflight แล้ว
- ผลทันที: `placeholder=` 108 บรรทัดใน 56 ไฟล์ (รวม prop ของ SearchableSelect ที่ไม่ได้เป็นช่อง native) · ช่องที่ไม่ได้ตั้งสีเองประมาณ 300 จาก 316 (fields.md §1.5) เปลี่ยนจาก 3.32:1 เป็น 5.77:1
- `placeholder:text-muted-foreground` 13 บรรทัดใน 10 ไฟล์ชนะ base rule (utilities อยู่เหนือ base) และยังเป็น ink-2 ให้ลบ class นี้ใน 2A:
  - `IntegrationClientManager.tsx:408, 470, 481`
  - `system-settings-form.tsx:2283`
  - `bulk-move-form.tsx:94`
  - `transaction-cancel-dialog.tsx:148`
  - `asset-label-print.tsx:231`
  - `audit-mark-not-found-button.tsx:113`
  - `audit-round-cancel-button.tsx:109`
  - `login-form.tsx:82, 104`
  - `ui/command.tsx:76` (ถ้าส่วนเมนูแก้ไฟล์นี้ในงานเดียวกัน ให้ลบในงานนั้น)
  - `ui/confirm-text-dialog.tsx:81`
- ไม่มี test ยึด class เหล่านี้ (grep `placeholder:text` ใน `tests/` ได้ 0)

### 3.7 utility `select-chevron` (ลูกศรของ `<select>`)

```css
@utility select-chevron {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2356677F' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px 16px;
  @media (forced-colors: active) {
    appearance: auto;
    background-image: none;
  }
}
```

- ไอคอน chevron-down ขนาด 16px สี faint เส้นหนา 2.25 ตามกฎไอคอนของต้นแบบ วางห่างขอบขวา 10px ตาม `.select` ของต้นแบบ (padding 0 10px 0 12px)
- primitive `Select` ของส่วนช่องกรอกใส่ `pr-9` เอง (10 + 16 + 10) utility นี้ไม่มี padding
- ในโหมด forced-colors คืนลูกศรของเบราว์เซอร์ (`@media` ซ้อนใน `@utility` ใช้ได้ ตรวจด้วย `compile()` แล้ว)
- ใช้กับ `<select>` เท่านั้น (มี 67 แท็กใน 44 ไฟล์) **ห้ามใส่ใน `getFieldControlClasses()`** เพราะ helper นี้ใช้กับ input และตัวเปิด SearchableSelect ด้วย
- สีเขียนตรงใน data URI จึงต้องมี test กันค่าไม่ตรง token (ข้อ 3.9)

### 3.8 utility `tag` (D8)

```css
/* Asset tags, document numbers and serials. Weight 400 only (500 for the row's own id); Plex Mono loads no 700. */
@utility tag {
  font-family: var(--font-mono);
  font-size: calc(1em - 1px);
  font-weight: 400;
  white-space: nowrap;
  font-variant-numeric: normal;
  -webkit-user-select: all;
  user-select: all;
  :where(a, button, label, summary) & {
    -webkit-user-select: auto;
    user-select: auto;
  }
}
```

- แทน :206-211 เดิม เพิ่ม `font-weight: 400`, `font-variant-numeric: normal` และ `user-select: all` ตามต้นแบบ `.tag` คลิกครั้งเดียวได้ทั้งรหัส
- ใน element ที่คลิกแล้วทำงาน ให้กลับเป็นเลือกปกติ ต้นแบบมีแค่ `a .tag` ส่วนนี้ขยายให้ครอบ button, label และ summary ด้วย · โค้ดมี `role="button"` หรือ `role="link"` 0 จุด
- ผล compile:
  - nesting ออกเป็น `:where(…) .tag` specificity เท่า `.tag` และมาทีหลังจึงชนะ
  - `.tag` ออกก่อน `.text-*` และ `.font-medium` จึงใช้ `tag font-medium text-foreground` แทน `.tag.id` ของต้นแบบได้ (500 โหลดไว้แล้ว)
  - ใส่ `text-sm` ใน element เดียวกันแล้ว −1px หาย ให้วาง `tag` ใน `<span>` ด้านใน
- น้ำหนักที่ใช้ได้มี 400 และ 500 · Plex Mono โหลด 400/500/600 (`layout.tsx:15-22`, test ยึดที่ `visual-foundation-guards.test.ts:37`) · 600 ยังจำเป็นจนกว่า R4 จะย้าย `font-mono font-semibold` 7 จุดเสร็จใน 2B · ลด 600 ออกได้ใน 2D
- ใส่ `-webkit-` เอง เพราะตอน dev ไม่มี Lightning CSS เติม prefix ให้ และ Safari บน iOS เป็นเครื่องหลักของงานภาคสนาม (utility `select-all` ของ Tailwind ก็ใส่ทั้งสองแบบ)
- ตอนนี้มีผู้ใช้ class `tag` 0 จุด · `font-mono` 44 บรรทัดใน 15 ไฟล์ · การห่อ 79 จุดเป็นงาน R4 ใน 2B

### 3.9 test

| ไฟล์:บรรทัด | เปลี่ยน |
|---|---|
| `tests/design-tokens-contrast.test.ts:46` | เพิ่ม `"row-hover"` ในรายการพื้นของ tone ink (ต่ำสุด success 4.99) |
| `:61` | primary บน row-hover (7.45) |
| `:68` | foreground และ muted-foreground บน row-hover |
| test ใหม่ต่อจาก :76 | `faint-foreground` ผ่าน AA บน background, card, popover, muted, accent, canvas, row-hover และ primary-soft (ต่ำสุดคือ muted 4.95) |
| `:87-94` | ring ≥ 3 บน row-hover (4.07) · input ≥ 3 บน row-hover (3.20) · neutral-ink ≥ 3 บน card, background, canvas, row-hover (ต่ำสุด 8.73) |
| `:96-101` | ลำดับบน card: border < control-border < input (1.35 < 1.61 < 3.47) · border-soft < border (1.20 < 1.35) · faint < muted-foreground < foreground (5.77 < 8.32 < 16.92) · row-hover ≠ card |
| test ใหม่ | ค่าสีที่เขียนตรงต้องตรง token: stroke ใน `@utility select-chevron` = `--faint-foreground` · rgb ของ `--shadow-field-focus` = `--ring` · rgb ของ `--shadow-field-error` = `--danger` |
| `:103-108` | ไม่ต้องแก้ ตรวจ mapping ของ 5 token ใหม่เอง |
| `tests/visual-foundation-guards.test.ts:41-53` | เพิ่ม regex line-height ของ meta, metric และ count พร้อมตรวจว่า 20/13 ≥ 1.44 · `:50` `@utility tag \{` เปลี่ยนเป็นตรวจเนื้อหาใหม่ (`font-weight: 400;`, `user-select: all;`, `:where(a, button, label, summary) &`) · ตรวจว่า `::placeholder` ใช้ `var(--faint-foreground)` และ `@utility select-chevron` มี `@media (forced-colors: active)` |
| `tests/class-merge.test.ts` (ใหม่) | ทั้ง 5 แถวในตารางข้อ 3.5 (import `../src/lib/utils.ts` ได้ เพราะไฟล์ import แค่ `clsx` และ `tailwind-merge`) |
| ไม่กระทบ (ตรวจแล้ว) | `modern-enterprise-theme.test.ts` (`token()` ต้องมี `:` ต่อจากชื่อ ชื่อใหม่ไม่ชน) · `visual-consistency-ui.test.ts`, `app-icon.test.ts` (อ่านแค่ card และ canvas) · `ui-overlay-guards.test.ts` |
| ส่วนอื่นต้องแก้เพราะ token นี้ | `status-badge.test.ts:43` regex ของ `shapeOf` ต้องเพิ่ม `neutral-ink` (ส่วน StatusBadge) |

guard ใหม่ใน `tests/visual-foundation-guards.test.ts` (ใช้ `findMatches` เดิม · "string เดียวกัน" หมายถึง `"[^"\n]*"`):

| guard | เงื่อนไข | ยกเว้น | วันนี้ |
|---|---|---|---|
| placeholder มีสีเดียว | `/placeholder:text-(?!faint-foreground\b)[\w-]+/g` | — | 13 → 0 หลังข้อ 3.6 |
| ไม่เขียนขนาด meta หรือ metric แบบ arbitrary | `/text-\[(?:13\|28)px\]/g` | `asset-label-print.tsx` | 1 (ป้ายพิมพ์) |
| ไม่เขียนมุม 6px แบบ arbitrary | `/rounded-\[6px\]/g` | — | 0 |
| ตัวเลขใหญ่ต้องเป็นตัวเลข | string ที่มี `\btext-(metric\|count)\b` ต้องมี `\bnum\b` | — | 0 |
| tag ไม่หนาและไม่ถูกตั้งขนาดทับ | string ที่มี `\btag\b` ต้องไม่มี `font-(semibold\|bold\|extrabold\|black)` และ `text-(xs\|sm\|base\|meta\|lg)` | — | 0 |
| faint ไม่อยู่บนพื้นสี | string เดียวกันต้องไม่มีทั้ง `bg-(success\|warning\|danger\|info)-soft` และ `text-faint-foreground` | — | 0 |

**ขอบปุ่มกับ WCAG 1.4.11:**
- `control-border` ได้ 1.61:1 บน card · `danger-border` ของปุ่มลบแบบเส้นขอบได้ 1.64 · `primary-border` ได้ 1.65
- ทั้งสามเป็นเส้นตกแต่ง ไม่ต้องผ่าน 3:1 เพราะเอกสาร Understanding ของ 1.4.11 ไม่บังคับให้ control มีขอบ ถ้าข้อความหรือไอคอนบอกได้ว่าเป็น control
- ปุ่มที่มีแต่ไอคอนใช้ไอคอนสี foreground / muted-foreground / faint ซึ่งได้ ≥ 5 · ปุ่ม disabled ได้รับยกเว้นอยู่แล้ว
- จึงไม่ test 3:1 แต่ test ลำดับแทน และห้ามใช้ `control-border` เป็นขอบเดียวของ control ที่ไม่มีข้อความ: ช่องกรอก checkbox toggle และกล่องวางไฟล์ ซึ่งยังต้องใช้ `input`
- guard `field-variants` ต้องมี `border-input` อยู่ในส่วนช่องกรอก

### 3.10 DESIGN.md และเอกสาร

| ที่ | เปลี่ยน |
|---|---|
| `DESIGN.md:4-44` YAML `colors` | เพิ่ม `faint-foreground` #56677F · `control-border` #C3CDDA · `border-soft` #E7EBF1 · `row-hover` #F3F6FB · `neutral-ink` #2A4468 |
| `:45-75` YAML `typography` | เพิ่ม `meta` (0.8125rem, 400, lineHeight 1.5385) · `metric` (1.75rem, 500, 1.1429, -0.02em) · `count` (1.25rem, 600, 1.2, -0.01em) |
| `:76-80` YAML `rounded` | เพิ่ม `control: "6px"` |
| `:173-181` §2 Neutral | เพิ่ม Faint, Control Border, Border Soft, Row Hover และ Neutral Ink พร้อมที่ใช้และข้อห้าม (ข้อ 3.2) |
| `:187-189` Non-color values | เพิ่ม `--radius-control`, `--shadow-field-focus`, `--shadow-field-error` และขนาดตัวอักษร 3 ตัว |
| `:201` The Token Contrast Rule | faint ≥ 4.5 บนพื้นกลาง ห้ามใช้บนพื้น tone-soft · ขอบปุ่มเป็นเส้นตกแต่ง ส่วนช่องกรอกยังต้องใช้ `input` ที่ 3:1 |
| `:215-224` Hierarchy | ประโยค "Font sizes are Tailwind's defaults" (:217) เปลี่ยนเป็น Tailwind บวก 3 ขนาด · เพิ่ม Meta, Metric และ Count · ตัวหนังสือ 3 ระดับ |
| `:226-230` Utilities | `tag` แบบใหม่ (400, คลิกเลือกทั้งรหัส, ห้ามตัวหนา, วางใน span ด้านใน) · แก้ "119 asset-tag call sites" (:229) เป็น 79 จุดที่ห่อได้ (sweeps §4, critic §3 #10) · เพิ่ม `select-chevron` |
| `:236` The Thai Line-Height Rule | meta 20/13 ไม่ต้อง override · metric และ count ใช้กับตัวเลขเท่านั้น |
| `:308` Inputs | placeholder ใช้ faint · แก้ "384" เป็น 316 ช่องใน 70 ไฟล์ (ถ้าส่วนช่องกรอกยังไม่ได้แก้) |
| `.impeccable/design.json` `extensions.colorMeta` | เพิ่ม 5 สี role `neutral` |
| wiki `AssetSystem` | หน้า `ams-` ที่เกี่ยวกับหน้าตา + `ams-log.md` |

### 3.11 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| T1 | ชื่อ line-soft | `--border-soft` | แอปใช้ชื่อแบบ shadcn ("line" ของต้นแบบคือ `--border`) · รูปเดียวกับ `primary-soft` · tables.md, mockup.md และ critic ใช้ชื่อนี้ |
| T2 | เพิ่ม `row-hover` และ `border-soft` ตอนนี้ | เพิ่มใน 2A · ข้อ row hover ของ codemod R7 ให้ใช้ `hover:bg-row-hover` แทน `hover:bg-background` | 2A ใช้เอง (เส้นคั่นเมนู, R7) · 2B∥2C ห้ามแก้ `:root` พร้อมกัน · R7 จะได้ไม่ต้องแก้ซ้ำใน 2B |
| T3 | `neutral-ink` | เพิ่ม และใช้กับขีดของ neutral/muted | ต้นแบบใช้กับ `.b-neutral::before` · P2-A ของ critic §7 รวมไว้ |
| T4 | `neutral-line` | ไม่เพิ่ม (เฟส 3) | ไม่มีผู้ใช้ในเฟส 2 |
| T5 | faint บน `primary-soft` | อนุญาตเฉพาะสถานะ hover หรือเลือก | ต้นแบบวาง trail ของเมนูบนพื้นนี้ · ได้ 4.99 |
| T6 | `control-border` กับ 1.4.11 | ถือเป็นเส้นตกแต่ง · test ลำดับแทน 3:1 · ห้ามใช้เป็นขอบเดียวของช่องกรอก checkbox หรือ toggle | ข้อ 3.9 |
| T7 | override line-height ของ meta, metric และ count สำหรับหน้าไทย | ไม่มี · ใช้ guard `num` | meta 1.54 ผ่าน · ตัวเลขไม่มีสระซ้อน |
| T8 | ใส่น้ำหนักและระยะห่างไว้ใน token | metric 500 / -0.02em · count 600 / -0.01em | ตรงกับ `.t-metric` และ `.t-count` ของต้นแบบ · ใส่ class ทับได้ |
| T9 | `text-page` 24/36 | ไม่เพิ่ม ใช้ `text-2xl` | หน้าไทยได้ 24/36 ตรงต้นแบบอยู่แล้ว · หน้าอังกฤษ 24/32 ไม่มีสระซ้อน |
| T10 | token ความสูง gutter และ motion | ไม่เพิ่ม ใช้ `h-8`/`h-9`/`h-10`/`h-11`, `px-5` และ transition 150ms ของ Tailwind | Tailwind มีครบ · ease ของต้นแบบต่างจากของ Tailwind จนมองไม่ออก |
| T11 | ขอบเขต `rounded-control` | ปุ่มทุกขนาดและช่องกรอกใช้ 6px ด้วย | ผู้ใช้อนุมัติหน้าเปรียบเทียบข้อ 7 ซึ่งแสดง 6px ทั้งปุ่มและช่องกรอก (ต่างจาก base.css ดู R3) |
| T12 | รูปแบบค่า halo | ใช้ `rgb(… / α)` แทน `color-mix` | ถ้าใช้ `color-mix` Tailwind จะเติม fallback เป็นวง 4px สีทึบของ ring สำหรับเบราว์เซอร์ที่ไม่รองรับ · เขียนแบบเดียวกับ scrim และ overlay ของเฟส 1 · มี test กันค่าไม่ตรง |
| T13 | ลูกศรของ `<select>` | `appearance-none` + SVG ใน background สี faint · ในโหมด forced-colors คืนลูกศรเดิม | fields.md ข้อ 6 แนะนำ (ต้นแบบไม่มีภาพ select แบบ native) · เป็น element เดียว ใช้ใน server component ได้ · className ความกว้างเดิมยังใช้ได้ |
| T14 | รายละเอียด `tag` | 400, `font-variant-numeric: normal`, `-webkit-user-select`/`user-select: all` · ใน a, button, label และ summary กลับเป็น auto · `.id` = `tag font-medium text-foreground` | ตาม `.tag` และ `a .tag` ของต้นแบบ · ใส่ prefix ให้ Safari บน iOS · ขยายจาก `a` ไปทุก element ที่คลิกแล้วทำงาน |
| T15 | placeholder ที่ตั้งสีเอง 13 จุด | ลบใน 2A | ถ้าไม่ลบ utility จะชนะ base rule และยังเป็น ink-2 |
| T16 | tailwind-merge | ใช้ `extendTailwindMerge` (ข้อ 3.5) | ถ้าไม่แก้ สีหรือขนาดจะหายเงียบ ๆ |
| T17 | Plex Mono 600 | คงไว้จนจบ R4 แล้วลดใน 2D | test ยึดที่ `:37` · ยังมี `font-mono font-semibold` 7 จุด |

### 3.12 ความเสี่ยง

- **R1 tailwind-merge (สำคัญที่สุด):** ถ้าเพิ่มขนาดใหม่โดยไม่แก้ `utils.ts` สีหรือขนาดจะหายแบบไม่มี error เลย และ test ปัจจุบันจับไม่ได้ จึงต้องลงพร้อมกันในงานเดียว และมี `class-merge.test.ts` กันไว้
- **R2 placeholder เข้มขึ้นทันทีทั้งแอป:** ประมาณ 300 ช่อง คนอาจอ่านเป็นค่าที่กรอกแล้ว แต่ 5.77 ยังอ่อนกว่าค่าจริง (16.92) ชัดเจน · ให้เทียบบนแอป dev ที่ฟอร์มเพิ่มทรัพย์สินและฟอร์มตั้งค่า
- **R3 ขอบเขตมุม 6px ขัดกับ base.css:**
  - base.css ใช้ 8px กับ `.btn`, `.input`, `.select` และ `.field-search` ใช้ 6px เฉพาะ `.btn.sm`, `.badge`, `.menu-item`, `.next-btn`, `.seg button`, `.menu-search` และ `.copy-btn`
  - หน้าเปรียบเทียบที่ผู้ใช้อนุมัติแสดง 6px กับปุ่มทุกขนาดและช่องกรอก จึงตัดสินตามหน้านั้น (T11) **ส่วนปุ่มและส่วนช่องกรอกต้องใช้ตามนี้** · ควรให้ผู้ใช้ยืนยันอีกครั้งตอนรีวิวสเปก
  - ข้อความในหน้าเดียวกันที่ว่า "8px กับแผงและเมนู 12px กับหน้าต่าง" ไม่ตรงทั้ง base.css (panel และเมนู 12px) และแอป (panel `rounded-lg` 12px) · ไม่ถือเป็นข้อตัดสิน คงตามต้นแบบ
- **R4 ตัวเลขใหญ่กับภาษาไทย:** ถ้ามีข้อความไทยหลุดเข้าไปใน `text-metric` หรือ `text-count` สระบนอาจชิดหรือถูกตัดใน element ที่ `overflow-hidden` · guard `num` ช่วยได้บางส่วน · Stat ต้องแยกป้ายกับบรรทัดท้ายเป็น `text-meta` เสมอ
- **R5 `tag` ในแถวที่คลิกได้:** `ClickableTableRow` ใช้ `onClick` บน `<tr>` ไม่ใช่ `<a>` (`clickable-table-row.tsx:46`) · คลิกที่รหัสจะเลือกข้อความทั้งรหัสแล้วเปิดหน้ารายละเอียดต่อ ไม่เสียหาย · ปุ่มคัดลอกเป็นงานเฟส 3
- **R6 สีที่เขียนตรง:** ลูกศร select และ halo ทั้งสองจะไม่ตามถ้าเปลี่ยน token · test ในข้อ 3.9 จับได้
- **R7 สีใกล้กันแต่คนละหน้าที่:** `--sidebar-muted` #586A84 กับ faint #56677F ต่างกันแค่ 1.05:1 · ตัวแรกใช้กับเมนูข้าง ตัวหลังใช้กับเนื้อหา ห้ามใช้สลับกัน
- **R8 การแก้ token ระหว่าง 2B∥2C:** ถ้าสายใดเพิ่ม token เอง merge จะชนที่ `:root`, `@theme inline` และ test contrast · ข้อกำหนดที่หัวส่วนนี้ต้องอยู่ใน plan ของทั้งสองสาย
