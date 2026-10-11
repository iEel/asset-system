> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2a-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** โดยเฉพาะ I15 (มุมโค้งตามต้นแบบจริง: ปุ่ม md/lg และช่องกรอก 8px · ปุ่ม sm, segmented, chip และป้ายสถานะ 6px · เมนู popover toast 12px) และ I14 (สีจางบน primary-soft อนุญาต)

## 4. ปุ่ม

เจ้าของไฟล์: `src/components/ui/button-variants.ts` · `button.tsx` · `action-button.tsx` · `src/lib/design-system.ts` (`getActionButtonClasses` / `getSafeActionLinkClasses` / `getTouchIconButtonClasses`)

2A เปลี่ยนเฉพาะ primitive กลาง ส่วนปุ่มที่เขียน class เองย้ายใน 2B/2C ตามพื้นที่ และที่เหลือย้ายใน 2D ค่าตั้งต้น 40px คงไว้จนถึง 2D (D4) เพื่อไม่ให้หน้าเดียวกันมีปุ่มสองความสูงระหว่างทาง

### 4.1 สภาพตอนนี้ (ตรวจกับโค้ด `081d538` วันที่ 2026-10-11)

| primitive | ที่อยู่ | จุดเรียก |
|---|---|---|
| `buttonVariants` (cva) | `button-variants.ts:3-29` | เรียกตรง 1 จุด (`ui/attachment-preview-dialog.tsx:56`) และใช้ภายใน `design-system.ts:90` |
| `Button` | `button.tsx:6-26` | 17 จุดใน 11 ไฟล์ (รวม `action-button.tsx:14`) |
| `ActionButton` | `action-button.tsx:13-15` | 9 ปุ่ม 8 บรรทัด 4 ไฟล์ |
| `getActionButtonClasses` | `design-system.ts:89-91` | 1 จุด (`reports/report-filter-panel.tsx:80`) |
| `getSafeActionLinkClasses` | `design-system.ts:93-101` | 4 จุด ทุกจุดส่ง `"secondary"` · เป็น string ของตัวเอง ไม่ได้ใช้ cva |
| `getTouchIconButtonClasses` | `design-system.ts:111-113` | **0** ทั้งใน `src` และ `tests` |

ค่า cva ตอนนี้:
- base: `gap-2 rounded-md … disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50` ทำให้ cursor not-allowed ไม่เคยแสดง เพราะ `pointer-events-none` ปิดเมาส์ไว้ก่อน
- variant: `default` · `destructive` (แดงทึบ) · `warning` · `outline` (`border border-border bg-surface … hover:bg-accent`) · `secondary` (`bg-secondary`) · `ghost` (`text-foreground hover:bg-accent`) · `link` · มีขอบเฉพาะ `outline` และไม่มีสถานะกด
- size: `default` `min-h-11 px-4 text-sm sm:h-10 sm:min-h-0` · `sm` `min-h-11 px-3 text-xs sm:h-8 sm:min-h-0` · `lg` `min-h-11 px-6 text-sm sm:h-11` (44px ทุกความกว้าง) · `icon` `sm:size-10` · `icon-sm` `sm:size-8`
- ไม่มีผู้ใช้: variant `secondary` และ `link` · size `lg` และ `icon-sm`

ตัวเลขประกอบ:
- ปุ่มที่เขียน class เอง 413 จุดใน 126 ไฟล์ (รัน `scratchpad/scan-buttons.mjs … buttonlike` ซ้ำแล้ว ±5%) แยกตามความสูงบนจอใหญ่ได้ 40px 133 · 44px ทุกความกว้าง 131 · 32px 78 · 36px 52
- `disabled:opacity-*` 147 บรรทัดใน 62 ไฟล์
- `Loader2` 149 บรรทัดใน 58 ไฟล์ · `animate-spin` 94 บรรทัด มี `motion-reduce` แค่ 2 บรรทัด

### 4.2 สิ่งที่ต้องมีก่อน (จากข้อ 3 token)

งานปุ่มต้องลงหลังหรือพร้อมข้อ 3

| ใช้ที่ | ต้องมี (ข้อ 3) | ค่า |
|---|---|---|
| ขอบปุ่มรอง | `--control-border` → `border-control-border` | #C3CDDA (1.61:1 บนขาว เป็นเส้นตกแต่ง ไม่ต้องถึง 3:1 เพราะตัวหนังสือหรือไอคอนบอกอยู่แล้วว่าเป็นปุ่ม ตามข้อ 3.9) |
| ตัวหนังสือของปุ่มที่กดไม่ได้ | `--faint-foreground` → `text-faint-foreground` | #56677F (5.42:1 บน `background` · 5.77:1 บนขาว) |
| มุมโค้ง | `--radius-control: 6px` ในบล็อก `@theme` → `rounded-control` | 6px |
| ตัวหนังสือปุ่ม `sm` | `--text-meta` → `text-meta` | 13/20 (1.54 เท่า เกินเกณฑ์ไทย 1.44 จึงไม่ต้องเพิ่มกฎ `html:lang(th)`) |
| `cn()` | `extendTailwindMerge` ใน `src/lib/utils.ts` (ข้อ 3.5) | — |

ข้อสุดท้ายห้ามข้าม ทดสอบกับ tailwind-merge 3.5.0 ของ repo แล้ว:
- `twMerge("text-meta text-danger")` ได้ `"text-danger"` เพราะ tailwind-merge เข้าใจว่า `text-meta` เป็นสีและตัดทิ้ง
- `rounded-control` กับ `rounded-md` อยู่คู่กันได้โดยไม่ถูกตัดตัวซ้ำ
- หลัง extend ได้ `"text-meta text-danger"` และตัวหลังทับ radius ได้ถูก
- ถ้าไม่ทำ ปุ่ม `sm` ที่ผู้เรียกใส่สีตัวหนังสือมาเองจะกลับไปใช้ขนาดตัวหนังสือที่สืบทอดมา

### 4.3 `buttonVariants` ใหม่ (`button-variants.ts`)

ยังเป็นไฟล์ `.ts` ไม่มี directive (test ที่รันด้วย `node --test` import ได้)

**base**
```
inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-control border font-medium whitespace-nowrap transition-colors outline-none
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-faint-foreground
aria-disabled:pointer-events-none aria-disabled:border-border aria-disabled:bg-background aria-disabled:text-faint-foreground
[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4
```
- ทุก variant มีขอบ 1px (สีตาม variant) ปุ่มทุกแบบจึงกว้างและสูงเท่ากัน · ทั้งไฟล์ไม่มี `opacity`
- หน้าตาตอนกดไม่ได้ชนะทุก variant และทุกสถานะ เพราะ Tailwind 4.2.4 เรียง CSS เป็น `hover:` → `active:` → `disabled:` → `aria-disabled:` (คอมไพล์ทดสอบแล้ว) specificity เท่ากัน ตัวที่มาหลังจึงชนะ โดยไม่ต้องใช้ `pointer-events-none`

**variant**

| variant | ปกติ | ชี้ | กด | ที่มา |
|---|---|---|---|---|
| `default` | `bg-primary text-primary-foreground border-primary` | `hover:bg-primary-hover hover:border-primary-hover` | `active:bg-brand-navy active:border-brand-navy` | `.btn.primary` |
| `outline` | `border-control-border bg-surface text-foreground` | `hover:border-input hover:bg-background` | `active:border-input active:bg-accent` | `.btn` · D5 |
| `ghost` | `border-transparent bg-transparent text-muted-foreground` | `hover:bg-background hover:text-foreground` | `active:bg-accent` | `.btn.ghost` |
| `danger` **ใหม่** | `border-danger-border bg-surface text-danger` | `hover:bg-danger-soft` | `active:border-danger` | `.btn.danger` · D6 ใช้กับปุ่มอันตรายที่วางในหน้า |
| `destructive` | `bg-destructive text-destructive-foreground border-destructive` | `hover:bg-danger-hover hover:border-danger-hover` | — | คงไว้ใช้กับปุ่มยืนยันใน dialog (D6) |
| `warning` | `bg-warning text-warning-foreground border-warning` | `hover:bg-warning-hover hover:border-warning-hover` | — | คงไว้ ใช้กับปุ่มบันทึกผลตรวจที่ไม่ตรง และ `ConfirmTextDialog` tone warning |

- ต้องเรียงลำดับ class ให้ `bg-primary text-primary-foreground`, `bg-destructive text-destructive-foreground hover:bg-danger-hover` และ `bg-warning text-warning-foreground hover:bg-warning-hover` อยู่ติดกัน test `design-system.test.ts:88,89,92,93` จึงผ่านโดยไม่ต้องแก้
- ชื่อ `default`, `destructive` และ `warning` ห้ามเปลี่ยน เพราะ `audit-scan-check-ui.test.ts:23` และ `confirm-dialog-ui.test.ts:13` ยึดชื่อเหล่านี้ไว้
- เอาออก 2 variant:
  - `secondary` ไม่มีผู้ใช้ และชื่อชนกับ `secondary` ของ ActionButton ซึ่งหมายถึง outline
  - `link` ไม่มีผู้ใช้ ย้ายไปเป็น `linkVariants` (ข้อ 4.4)
- contrast (คำนวณแล้ว):
  - ขาวบน `brand-navy` 12.94:1
  - `danger` บนขาว 6.54:1 และบน `danger-soft` 5.83:1
  - `muted-foreground` บน `background` 7.82:1
  - `faint-foreground` บน `background` 5.42:1
  - ring บนขาว 4.41:1

**size** (เปลี่ยน breakpoint จาก `sm` เป็น `md` ตาม D4 · ต่ำกว่า `md` ทุกขนาดสูงอย่างน้อย 44px)

| size | ต่ำกว่า md | md ขึ้นไป | padding | ตัวหนังสือ |
|---|---|---|---|---|
| `sm` | `min-h-11` | `md:h-8 md:min-h-0` (32) | `px-2.5` (10) | `text-meta` |
| `md` **ใหม่** | `min-h-11` | `md:h-9 md:min-h-0` (36) | `px-3.5` (14) | `text-sm` |
| `lg` (ใช้แถวเดียวกับช่องกรอก) | `min-h-11` | `md:h-10 md:min-h-0` (40) | `px-4` (16) | `text-sm` |
| `default` | ใน 2A ใช้ค่าเดียวกับ `lg` · พลิกให้เท่า `md` ใน 2D | | | |
| `icon-sm` | `min-h-11 min-w-11` | `md:size-8 md:min-h-0 md:min-w-0` | — | — |
| `icon` | `min-h-11 min-w-11` | `md:size-10 md:min-h-0 md:min-w-0` ใน 2A · เปลี่ยนเป็น `md:size-9` ใน 2D | — | — |

- เขียนค่าแต่ละขนาดเป็นค่าคงที่ในไฟล์ (`const sizeMd = "…"`, `const sizeLg = "…"`, `default: sizeLg`) เพื่อให้ 2D แก้แค่บรรทัดเดียว
- ไฟล์นี้ต้องไม่มี `sm:` เหลืออยู่เลย

### 4.4 `linkVariants` (ใหม่ ในไฟล์เดียวกัน)

ใช้แทน variant `link` เดิม และทำตาม `.link` ของต้นแบบ (`base.css:232-233`)
```ts
export const linkVariants = cva(
  "inline font-medium text-primary underline decoration-transparent decoration-1 underline-offset-3 transition-colors hover:decoration-current focus-visible:decoration-current",
  { variants: { size: { meta: "text-meta whitespace-nowrap", inherit: "" } }, defaultVariants: { size: "meta" } },
)
```
- `meta` ใช้กับลิงก์คำสั่งที่วางเดี่ยว เช่น "ล้างทั้งหมด" "ดูทั้งหมด" "คืนค่าเริ่มต้น"
- `inherit` ใช้กับลิงก์ในประโยค ขนาดตัวหนังสือตามประโยค
- contrast: `primary` บนพื้นกลางทุกแบบไม่ต่ำกว่า 6.92:1 (ผลของเฟส 1)
- ใน 2A ยังไม่มีผู้ใช้ ผู้ใช้แรกคือ `FilterChipList` ใน 2B · ลิงก์ในเนื้อหาที่ใช้ `text-primary … hover:underline` (44 บรรทัดใน 28 ไฟล์) และ `hover:text-primary` (34 บรรทัดใน 27 ไฟล์) กวาดใน 2D
- ไม่มีเป้ากด 44px ในตัว เพราะลิงก์ในประโยคได้รับยกเว้นตาม WCAG 2.5.8 ถ้าเป็นลิงก์เดี่ยวบนมือถือ ผู้เรียกต้องใส่ `inline-flex min-h-11 items-center md:min-h-0` เอง

### 4.5 `Button` (`button.tsx`) และ prop `busy`

```ts
type ButtonProps = React.ComponentProps<"button"> & ButtonVariantProps &
  ({ asChild?: false; busy?: boolean } | { asChild: true; busy?: never })
```
- `busy` หมายถึงกำลังทำงานอยู่ ปุ่มจะได้ `aria-busy="true"`, `aria-disabled="true"` และ `data-busy` · ไม่ใช้ `disabled` เพราะปุ่มที่ถูก disabled ตอนที่มีโฟกัสอยู่จะทำให้โฟกัสหลุดไปที่ body
- ระหว่าง busy ปุ่มถูกใส่ `onClick` ที่เรียก `event.preventDefault()` และไม่เรียก `onClick` ของผู้เรียก วิธีนี้กันการคลิกเมาส์ การกด Enter/Space และการกด Enter ในช่องกรอกของฟอร์ม (implicit submission จะยิง click ที่ปุ่ม submit) ส่วน `aria-disabled:pointer-events-none` กันเมาส์ได้อีกชั้น
- ไอคอนหมุนคือ `<Loader2 data-slot="button-spinner" aria-hidden="true" className="animate-spin motion-reduce:animate-none" />`
  - ถ้า child ตัวแรกเป็น element (ไอคอนนำหน้า) ไอคอนหมุนจะแทนที่ตัวนั้น ความกว้างของปุ่มจึงคงเดิม
  - ถ้า child ตัวแรกเป็นข้อความ ไอคอนหมุนจะถูกใส่ไว้หน้าข้อความ ปุ่มกว้างขึ้น 22px
- ระหว่าง busy ปุ่มใช้หน้าตาเดียวกับตอนกดไม่ได้ (ผ่าน class `aria-disabled:`)
- ใช้ `busy` คู่กับ `asChild` ไม่ได้ (type บังคับไว้) เพราะ Slot แทรกไอคอนหมุนเข้าไปไม่ได้
- ข้อความอย่าง "กำลังบันทึก…" ยังเป็นหน้าที่ของผู้เรียก เพราะ Button ไม่มีคำแปลของตัวเอง
- ไม่มี hook และไม่มี `"use client"` จึงยังใช้ใน server component ได้ (handler ถูกใส่เฉพาะตอน `busy` ซึ่งมาจาก state ฝั่ง client เท่านั้น)
- คงค่าตั้งต้น `type="button"` และ attribute `data-slot` / `data-variant` / `data-size` ไว้เหมือนเดิม
- 2A เพิ่มแค่ prop ไม่แก้ผู้เรียก ส่วน `Loader2` 149 บรรทัดย้ายมาใช้ `busy` ใน 2C/2D ตอนย้ายต้องเอา `disabled={busy}` ของปุ่มเดียวกันออกด้วย

### 4.6 `ActionButton` และ helper ใน `design-system.ts`

| ของ | ทำใน 2A | เหตุผล |
|---|---|---|
| `ActionButton` | คงไว้ ใส่ JSDoc `@deprecated` · mapping เดิม (`primary→default` `secondary→outline` `danger→destructive` `ghost→ghost` · `md→default` `sm→sm`) | `danger` ของ ActionButton (แดงทึบ) มีผู้ใช้ที่เดียวคือปุ่มยืนยันใน dialog `asset-state-review-dialog.tsx:101` ซึ่ง D6 ให้คงแบบทึบ · `md→default` ทำให้ปุ่มเปลี่ยนตามการพลิกใน 2D เอง (ไม่ได้ชี้ไป size `md` ใหม่ที่สูง 36) · ลบใน 2D พร้อมย้าย 9 ปุ่มไปใช้ `Button` |
| `getActionButtonClasses` | คงไว้ ใส่ `@deprecated` ไม่แก้โค้ด | มีผู้ใช้ 1 จุด · test `:100-105` ยืนยันว่าได้ค่าเท่ากับ `buttonVariants` |
| `getSafeActionLinkClasses` | สร้างจาก `buttonVariants` ตามข้างล่าง | ให้ลิงก์ 4 จุดหน้าตาเหมือน Button |
| `getTouchIconButtonClasses` | **ลบ** | ผู้ใช้ 0 จุดใน src และ tests (ที่เหลืออยู่ใน `.next/standalone` กับแผนเก่า `docs/superpowers/plans/2026-05-27-mobile-responsive-qa.md:168` ไม่ต้องแก้) |
| `uiButtonVariants` / `uiButtonSizes` และ type | คงไว้ | ActionButton ยังใช้ |

`getSafeActionLinkClasses(variant = "secondary")`:
```ts
cn(buttonVariants({ variant: legacyButtonVariant[variant] }),
   "h-auto w-full min-w-0 max-w-full whitespace-normal py-2 text-center sm:w-fit md:h-auto md:min-h-10")
```
- `design-system.ts` import `cn` จาก `./utils.ts` · ต้องผ่าน twMerge เพราะ Tailwind เรียง `whitespace-normal` ไว้ก่อน `whitespace-nowrap` ถ้าต่อ string ธรรมดา `nowrap` ของ base จะชนะ (คอมไพล์ทดสอบแล้ว)
- ผลหลัง merge (ตรวจกับ tailwind-merge 3.5.0): `whitespace-nowrap`, `md:h-10` และ `md:min-h-0` ถูกตัดออก เหลือ `min-h-11 … md:min-h-10` ข้อความยาวจึงขึ้นบรรทัดใหม่ได้ และปุ่มสูงขึ้นตามข้อความ
- เอา `leading-snug` (1.375 เท่า) ออก เพราะต่ำกว่าเกณฑ์ภาษาไทย 1.44 เท่า ใช้ line-height ของ `text-sm` (22/14) แทน
- บนจอใหญ่สูงลดจาก 44px เป็น 40px ตามปุ่มค่าตั้งต้น · ใน 2D เปลี่ยน `md:min-h-10` เป็น `md:min-h-9` พร้อมกับการพลิกค่าตั้งต้น

### 4.7 จุดที่หน้าตาเปลี่ยนใน 2A (31 จุด)

ทุกจุดได้การเปลี่ยนแปลงชุดเดียวกัน:
- มุมโค้ง 6px และขอบ 1px ทุก variant
- ระยะระหว่างไอคอนกับข้อความ 6px
- มีสถานะกด และ cursor เป็น pointer
- ปุ่มที่กดไม่ได้เป็นพื้นเทาอ่อนกับตัวหนังสือสี faint (เดิมจางลง 50%)
- ที่ความกว้าง 640–767px ปุ่มสูง 44px (เดิม 40px เพราะเดิมใช้ breakpoint `sm:`)

| # | ที่ (`src/…`) | ตอนนี้ | เปลี่ยนเพิ่มจากรายการข้างบน | ขนาดหลังพลิกใน 2D |
|---|---|---|---|---|
| 1 | `components/assets/asset-detail-action-menu.tsx:55` | outline `icon` ⋯ ที่หัวหน้ารายละเอียด | ขอบ #C3CDDA | `icon` (36) |
| 2 | `components/assets/asset-evidence-drawer.tsx:64` | outline (ปุ่มเปิดลิ้นชัก) | ไม่มีใครเห็น เพราะผู้ใช้รายเดียวส่ง `hideTrigger` | — |
| 3 | `components/ui/activity-drawer.tsx:49` | เหมือนข้อ 2 | ไม่มีใครเห็น (เหตุผลเดียวกับข้อ 2) | — |
| 4 | `components/assets/asset-register-filter-sheet.tsx:172` | outline "ล้าง" กดไม่ได้เมื่อไม่มีตัวกรอง | ตอนกดไม่ได้เป็นพื้นเทา | default |
| 5 | `…/asset-register-filter-sheet.tsx:175` | default "ดูผล" มี `Loader2` ตอน pending | — | default |
| 6 | `components/audit/audit-scan-check-form.tsx:342` | default/warning + `min-h-12 w-full text-base` | ตอนกดไม่ได้ (กำลังบันทึก หรือขาดรูป) เป็นเทาแทนสีจาง · ที่ 640–767px สูงจาก 40 เป็น 48 | คง className เดิม |
| 7 | `…/audit-scan-check-form.tsx:361` | ghost เต็มความกว้าง "ไม่ใช่รายการนี้" | ตัวหนังสือเป็น `muted-foreground` (เดิม `foreground`) · hover เป็นพื้น `background` | default |
| 8 | `components/audit/audit-scan-lookup-card.tsx:38` | outline เต็มความกว้าง | — | default |
| 9 | `…/audit-scan-lookup-card.tsx:53` | outline ในกล่อง `warning-soft` | — | default |
| 10 | `components/ui/alert-dialog.tsx:155` `AlertDialogAction` | default/destructive (ค่าจาก `confirm-dialog.tsx:98-99`) | ใช้ผ่าน `useConfirm()` 11 จุดใน 11 ไฟล์ (รวม `use-delete-action.ts` ที่ปุ่มลบ master data และเมนูแถวทะเบียนใช้) | ตาม D17 (2C) |
| 11 | `components/ui/alert-dialog.tsx:173` `AlertDialogCancel` | outline | เหมือนข้อ 10 | ตาม D17 |
| 12 | `components/ui/confirm-text-dialog.tsx:85` | outline "ยกเลิก" | ผู้ใช้ 1 จุด (`audit-findings-batch-actions.tsx:124`) | ตาม D17 |
| 13 | `…/confirm-text-dialog.tsx:86` | ปุ่มยืนยัน default/destructive/warning | ตอน busy เป็นพื้นเทา | ตาม D17 |
| 14 | `components/ui/operation-review-dialog.tsx:55` | outline "ยกเลิก" | ผู้ใช้ 3 จุด (ฟอร์มรับคืน ส่งมอบ โอนย้าย) | ตาม D17 |
| 15 | `…/operation-review-dialog.tsx:56` | default ยืนยัน | ตอน busy เป็นพื้นเทา | ตาม D17 |
| 16 | `components/ui/dialog.tsx:120` | outline "Close" ใน `DialogFooter` | ไม่มีใครเห็น เพราะ `DialogFooter` มีผู้ใช้ 0 จุด (คำว่า "Close" เป็นภาษาอังกฤษตายตัว ส่งต่อให้ 2C) | — |
| 17 | `app/[locale]/(dashboard)/error.tsx:30` | ActionButton primary "ลองอีกครั้ง" | — | default |
| 18 | `components/admin/asset-state-review-dialog.tsx:100` | ActionButton secondary "ยกเลิก" | — | ตาม D17 |
| 19 | `…/asset-state-review-dialog.tsx:101` | ActionButton primary/danger (= default/destructive) | กดไม่ได้จนกว่าเหตุผลจะครบ 10 ตัวอักษร ตอนนั้นเป็นพื้นเทา | ตาม D17 |
| 20 | `components/admin/asset-state-review-workspace.tsx:141` | ActionButton primary "สแกน" | — | default |
| 21 | `…/asset-state-review-workspace.tsx:187` | ActionButton sm "ก่อนหน้า" | ตัวหนังสือ 12 → 13px · padding 12 → 10px · กดไม่ได้ที่หน้าแรก | sm |
| 22 | `…/asset-state-review-workspace.tsx:189` | ActionButton sm "ถัดไป" | เหมือนข้อ 21 | sm |
| 23 | `…/asset-state-review-workspace.tsx:235` | ActionButton sm primary (resolve) | เหมือนข้อ 21 | sm |
| 24 | `…/asset-state-review-workspace.tsx:235` | ActionButton sm (dismiss เป็น outline) | เหมือนข้อ 21 | sm |
| 25 | `components/reports/report-filter-panel.tsx:75` | ActionButton primary + `min-h-11 w-full md:h-10 md:min-h-0 md:w-auto` | class ที่ส่งเข้ามาซ้ำกับ cva แล้ว (ลบได้ แต่ไม่บังคับ) | **lg** (อยู่ในกริดของช่องกรอก) |
| 26 | `…/report-filter-panel.tsx:80` | Link ที่ใช้ `getActionButtonClasses("secondary")` + class ชุดเดียวกับข้อ 25 | — | **lg** |
| 27 | `components/ui/attachment-preview-dialog.tsx:56` | `<a>` outline sm "ดาวน์โหลด" | ผู้ใช้ 3 จุด · ตัวหนังสือ 12 → 13px | sm |
| 28 | `app/[locale]/(dashboard)/admin/readiness/page.tsx:191` | safe link | บนจอใหญ่สูงจาก 44 เป็น 40 · ข้อความยาวยังขึ้นบรรทัดใหม่ได้ | ตาม helper |
| 29 | `app/[locale]/(dashboard)/asset-management/import-export/page.tsx:123` | safe link | เหมือนข้อ 28 | ตาม helper |
| 30 | `app/[locale]/(dashboard)/my-assets/page.tsx:90` | safe link | เหมือนข้อ 28 | ตาม helper |
| 31 | `app/[locale]/(dashboard)/my-assets/[id]/page.tsx:62` | safe link | เหมือนข้อ 28 | ตาม helper |

จุดข้างเคียงที่แก้ในงานเดียวกัน (ข้อตัดสินย่อย ย27): ลิงก์ที่เขียน class เอง 2 ลิงก์ข้างปุ่ม ⋯ ในหัวหน้ารายละเอียดทรัพย์สิน
- `app/[locale]/(dashboard)/assets/[id]/page.tsx:921` ลิงก์กลับ → `cn(buttonVariants({ variant: "outline" }), "min-w-11 px-3")`
- `app/[locale]/(dashboard)/assets/[id]/page.tsx:929` ลิงก์แก้ไข → `cn(buttonVariants(), "hidden md:inline-flex")`

### 4.8 กติกาแปลงปุ่มที่เขียน class เอง (ใช้ใน 2B, 2C และ 2D)

ใช้ `<Button>` กับ `<button>` ส่วน `<Link>` / `<a>` ใช้ `className={cn(buttonVariants({ variant, size }), layoutExtras)}` (ใช้ได้ทั้งใน server component และ client component) หรือ `<Button asChild>` ใน client component · ใน `className` เก็บไว้แค่ class จัดวาง (`w-full sm:w-auto`, `flex-1`, `self-end`, `justify-start`, `min-w-0`) · การแปลงห้ามเปลี่ยนความสูงบนจอใหญ่ ความสูงจะรวมเป็นแบบเดียวกันตอนพลิกใน 2D

| เดิม (บนจอใหญ่) | size ใหม่ |
|---|---|
| `h-8` | `sm` |
| `h-9` | `md` |
| `h-10` อยู่แถวเดียวกับช่องกรอก 40px | `lg` |
| `h-10` ที่อื่น (แถบเครื่องมือ หัวหน้า) | ไม่ระบุ (`default`) |
| `min-h-11` อย่างเดียว (44px ทุกความกว้าง) | ไม่ระบุ · ถ้าเป็นส่วนท้าย dialog ใช้ตาม D17 |
| ไอคอน `size-8` / `h-8 w-8` | `icon-sm` |
| ไอคอน `size-9` / `size-10` / 44px | `icon` |

| แบบเดิม (ตามการจัดกลุ่มใน actions.md) | variant |
|---|---|
| primary-solid | `default` |
| outline | `outline` |
| ghost | `ghost` |
| danger-outline | `danger` |
| danger-solid ที่อยู่ในหน้า | `danger` · ถ้าเป็นปุ่มยืนยันใน dialog ใช้ `destructive` |
| warning-solid | `warning` |
| success-solid (`audit-findings-batch-actions.tsx:82`) | `default` (ย16) |
| ลิงก์ข้อความ | `linkVariants` |
| ปุ่มเลือก/สลับที่มีพื้น `primary-soft` | ไม่ใช่ Button ไปใช้ `Segmented` / `TabNav` ใน 2B (ย17) |
| ปุ่มลบแบบไอคอนสีแดง | `danger` + `icon-sm` (ย15) |
| ปุ่มเตือนพื้น `warning-soft` | `outline` + ไอคอนเตือน (ย17) |

### 4.9 งานของ 2D ตอนพลิกค่าตั้งต้น (บันทึกไว้ให้ plan ของ 2D)

- `default: sizeMd` และ `icon` เป็น `md:size-9` · ใน safe link เปลี่ยน `md:min-h-10` เป็น `md:min-h-9`
- ก่อนพลิก ปุ่มที่อยู่แถวเดียวกับช่องกรอก 40px ต้องใส่ `size="lg"` ให้ครบ อย่างน้อยคือ `report-filter-panel.tsx:75,80` รวมกับที่ 2B/2C ย้ายมา
- ย้าย 9 ปุ่มของ ActionButton และ 1 จุดของ `getActionButtonClasses` ไปใช้ Button แล้วลบ `ActionButton`, `getActionButtonClasses` และ `uiButton*`
- แก้ test ข้อ "`default` = `lg`" ให้เป็น "`default` = `md`" · แก้ DESIGN.md (YAML height 40 → 36)

### 4.10 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| ย1 | มุมโค้งของปุ่มขนาดกลางและใหญ่ | `rounded-control` 6px ทุกขนาด | `.btn` ขนาดกลางใน `base.css` ใช้ 8px แต่หน้าเปรียบเทียบที่ผู้ใช้อนุมัติ (ข้อ 7) แสดงปุ่ม 36/40px ที่ 6px และเขียนว่า "6px กับปุ่มและช่องกรอก" |
| ย2 | สีตอนกดปุ่มหลัก | `brand-navy` #083161 | ต้นแบบใช้ navy-3 ซึ่งไม่มีใน token จริง สีตอนกดต้องเข้มกว่า hover #173E76 · ขาวบนสีนี้ได้ 12.94:1 (actions.md §5.1) |
| ย3 | สีตอนกดของ outline และ ghost | `accent` #EBF0F7 | ใกล้ neutral-soft #EEF2F7 ของต้นแบบที่สุด (actions.md §2.5) |
| ย4 | hover ของ outline | `bg-background` + `border-input` | ต้นแบบใช้ subtle + line-strong และหน้าเปรียบเทียบที่อนุมัติก็ใช้ค่านี้ |
| ย5 | ghost | ตัวหนังสือ `muted-foreground` → hover เป็น `foreground` บนพื้น `background` · padding ตาม size (ไม่ใช้ 8px ตามต้นแบบ) | สีทำตามต้นแบบ · ถ้าจะใช้ padding 8px ต้องเพิ่ม compound class ซึ่งชนกับ padding ของ size เมื่อเรียก `buttonVariants()` ตรงโดยไม่ผ่าน twMerge (Tailwind เรียง `px-2` ไว้ก่อน `px-3.5` คอมไพล์ทดสอบแล้ว) · และ ghost ในต้นแบบเกือบทั้งหมดเป็นปุ่มไอคอน |
| ย6 | สีตอนกดของ danger | `active:border-danger` | ใน `base.css` กฎ `.btn:active` ทับสีขอบของ danger เป็นสีเทาเพราะ specificity ซึ่งไม่น่าจะตั้งใจ และแผนที่ไม่ได้ระบุไว้ |
| ย7 | สถานะกดของ destructive และ warning | ไม่มี | ไม่มี token ที่เข้มกว่าสี hover และต้นแบบไม่มีปุ่มทึบแบบนี้ |
| ย8 | หน้าตาตอนกดไม่ได้ | ใช้แบบเดียวกันทุก variant รวม ghost: `bg-background` `border-border` `text-faint-foreground` | ต้นแบบเขียนว่า "Disabled wins over every variant" · faint บน background ได้ 5.42:1 |
| ย9 | `pointer-events-none` | เอาออกจาก `disabled:` แต่คงไว้ที่ `aria-disabled:` | cursor not-allowed จะแสดงตามต้นแบบ และการคลิกปุ่มที่กดไม่ได้จะไม่ทะลุไปถึงแถวของ `ClickableTableRow` ที่อยู่ข้างล่าง (กันไว้ก่อน RowActions ใน 2B) · `aria-disabled` ใช้กับลิงก์ที่ผ่าน `asChild` ซึ่งใส่ disabled จริงไม่ได้ |
| ย10 | busy กันการกดอย่างไร | ใช้ `aria-disabled` + กัน click ไม่ใช้ `disabled` | โฟกัสไม่หลุดจากปุ่ม · critic G13 เขียนแค่ว่า "disables" ไม่ได้ระบุวิธี |
| ย11 | ไอคอนหมุนวางตรงไหน | แทน element ตัวแรก ถ้าไม่มีให้ใส่หน้าข้อความ | ความกว้างคงเดิมเมื่อมีไอคอนนำหน้า (G13 "keeps its width") และไม่ต้องเพิ่ม prop `icon` |
| ย12 | ใช้ `busy` คู่กับ `asChild` | ห้าม (บังคับด้วย type) | Slot แทรกไอคอนหมุนเข้าไปไม่ได้ |
| ย13 | cursor | ใส่ `cursor-pointer` ใน base | Tailwind 4 ให้ปุ่มเป็น cursor default · ต้นแบบเขียน `.btn { cursor: pointer }` |
| ย14 | โฟกัส | คง `ring-2 ring-ring ring-offset-2` | ต้นแบบใช้ outline 2px offset 2px สีเดียวกัน ตาเห็นเหมือนกัน (ต่างแค่ช่องว่างของ ring เป็นสีขาว) และเป็นสูตรเดียวกับช่องกรอก และ test `:41` |
| ย15 | ปุ่มลบแบบไอคอนที่ยังอยู่ในหน้า | ใช้ `danger` + `icon-sm` ไม่เพิ่ม variant `danger-ghost` | actions.md แนะนำ ghost + `text-danger` แต่ D6 กำหนดให้ปุ่มอันตรายในหน้าเป็นขอบแดง · ปุ่มลบในแถวตารางอาจย้ายเข้าเมนู ⋯ ตาม D13 (2B) |
| ย16 | variant `success` | ไม่เพิ่ม · ปุ่มทึบสีเขียว 1 จุดใช้ `default` | ทำตามข้อแนะนำแรกของ actions.md · เฟส 1 ข้อ 3.2 ให้ใช้เขียวเฉพาะในป้ายสถานะ |
| ย17 | ปุ่มพื้นสีอ่อน (`primary-soft`, `warning-soft`) | ไม่มี variant แบบนี้ · ปุ่มเลือก/สลับไปใช้ Segmented/TabNav (2B) · ปุ่มเตือนใช้ `outline` + ไอคอนเตือน | ตามข้อแนะนำของ actions.md §5.4 |
| ย18 | transition | `transition-colors` ของ Tailwind (150ms) | ต้นแบบก็ 150ms ต่างแค่ easing ซึ่งมองไม่เห็น จึงไม่เพิ่ม token · การเปลี่ยนสีไม่นับเป็นการเคลื่อนไหว จึงไม่ใส่ `motion-reduce` (`base.css:496`) |
| ย19 | ระยะระหว่างไอคอนกับข้อความ | `gap-1.5` (6px) | ตามต้นแบบ |
| ย20 | `sm` | `text-meta` `px-2.5` | ตาม `.btn.sm` ของต้นแบบ (13px, padding 10) |
| ย21 | padding ของ `md` และ `lg` | `md` ใช้ `px-3.5` (14) · `lg`/`default` ใช้ `px-4` (16 เท่าเดิม) | `md` ตามต้นแบบ · ต้นแบบไม่มี `lg` จึงใช้ค่าเดิม ปุ่มค่าตั้งต้นใน 2A จะได้ไม่เปลี่ยนขนาด |
| ย22 | ขนาดปุ่มไอคอน | มีแค่ `icon-sm` (32) และ `icon` (40 → 36 ใน 2D) · ไม่เพิ่ม `icon-md` / `icon-lg` | ไม่พบจุดที่ต้องใช้ · `icon` ตามการพลิกเหมือน `default` |
| ย23 | variant `secondary` และ `link` | ลบทั้งคู่ · ลิงก์ไปใช้ `linkVariants` | ไม่มีผู้ใช้ · `secondary` ชื่อชนกับของ ActionButton · class ขนาดของปุ่ม (`min-h-11 px-*`) ชนกับลิงก์ |
| ย24 | ActionButton และ `getActionButtonClasses` | คงไว้แบบ `@deprecated` แล้วลบใน 2D | ไม่ต้องเพิ่มไฟล์ใน 2A และ mapping เดิมยังถูกตาม D6 |
| ย25 | safe link | สร้างจาก cva + `cn` · เอา `leading-snug` ออก · ใช้ `md:min-h-10` | หน้าตาเหมือน Button · `leading-snug` (1.375) ต่ำกว่าเกณฑ์ไทย |
| ย26 | สถานะเปิดเมนู (`aria-expanded`) ของปุ่มที่เปิดเมนู | ไม่เพิ่ม | ต้นแบบและแผนที่ไม่ได้กำหนด |
| ย27 | หัวหน้ารายละเอียดทรัพย์สิน (เพิ่มเอง ไม่อยู่ในแผนที่) | แปลง 2 ลิงก์ข้างปุ่ม ⋯ เป็น `buttonVariants` ในงานเดียวกัน (ข้อ 4.7) | ถ้าไม่แปลง หน้าที่ใช้บ่อยที่สุดจะมีปุ่มมุม 6px กับ 8px และขอบ 2 สีติดกันไปจนถึงเฟส 3 · test ยึดแค่ `aria-label` / `href` (`asset-detail-ux.test.ts:27`, `asset-return-navigation.test.ts:46`) |

### 4.11 Test

แก้:

| test | บรรทัด | ตอนนี้ | ใหม่ |
|---|---|---|---|
| `tests/design-system.test.ts` | 91 | `/sm:h-10 sm:min-h-0/` | `/md:h-10 md:min-h-0/` |
| | 94 | outline `/border border-border bg-surface/` | `/border-control-border bg-surface/` และ base มี `\bborder\b` |
| | 95 | sm `/min-h-11 px-3 text-xs sm:h-8 sm:min-h-0/` | `/min-h-11 px-2.5 text-meta md:h-8 md:min-h-0/` |
| | 96 | icon `/min-h-11 min-w-11 sm:size-10 sm:min-h-0 sm:min-w-0/` | `/min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/` |
| | 87-90, 92-93, 97 | — | ผ่านโดยไม่ต้องแก้ (ถ้าเรียง class ตามข้อ 4.3) |
| | 38-41 | — | ผ่านโดยไม่ต้องแก้ (`/h-8/` เจอใน `md:h-8` · `/min-h-11/` · `/focus-visible:ring-2/`) |
| | 100-105 | — | ผ่านโดยไม่ต้องแก้ |

ไม่มี test อื่นยึด class ของปุ่มกลาง ตรวจ test ทุกไฟล์ที่อ่านไฟล์ของ 31 จุดแล้ว test เหล่านั้นยึดแค่ชื่อ variant (`audit-scan-check-ui.test.ts:23`, `confirm-dialog-ui.test.ts:13`), `<Button` (`asset-operation-confirmation-ui.test.ts:31`) และ attribute อื่น · ปุ่มปิด X ที่ test ยึด `min-h-11 min-w-11` (`accessible-dialog.test.ts:31`, `sheet-drawers-ui.test.ts:11`) เป็นปุ่มเขียนเอง ไม่ได้รับผลกระทบ

เพิ่มใน `tests/design-system.test.ts`:
1. ทุกคู่ variant × size (6 × 6) มี `min-h-11` และไม่มี `opacity`, `sm:h-`, `sm:min-h`, `sm:size-`, `dark:`
2. base มี `rounded-control`, `cursor-pointer`, `disabled:bg-background disabled:text-faint-foreground disabled:border-border` และชุดเดียวกันที่ขึ้นต้นด้วย `aria-disabled:` · ไม่มี `disabled:pointer-events-none`
3. `danger` match `/border-danger-border bg-surface text-danger/` และมี `hover:bg-danger-soft` · ไม่มี `bg-danger\b` หรือ `bg-destructive`
4. ขนาด: `md` มี `md:h-9` · `lg` มี `md:h-10` · `buttonVariants({ size: "default" }) === buttonVariants({ size: "lg" })` (2D แก้เป็น `md`) · `icon-sm` มี `md:size-8`
5. `linkVariants()` มี `text-meta`, `decoration-transparent`, `hover:decoration-current` และไม่มี `min-h-`
6. `getSafeActionLinkClasses("secondary")` มี `border-control-border`, `whitespace-normal`, `md:min-h-10` · ไม่มี `whitespace-nowrap`, `leading-snug`, `md:h-10`
7. `typeof designSystem.getTouchIconButtonClasses === "undefined"`

เพิ่ม test ใหม่ `tests/button-busy-ui.test.ts` ที่อ่าน source (`node --test` โหลด `.tsx` ไม่ได้):
- `button.tsx` ไม่มี `"use client"` และไม่มี `use(State|Effect|Ref|LayoutEffect)`
- มี `aria-busy`, `aria-disabled`, `data-slot="button-spinner"`, `animate-spin motion-reduce:animate-none`, `preventDefault()`
- มี type `asChild: true; busy?: never`

เพิ่มใน `tests/design-tokens-contrast.test.ts:57-65`: `primary-foreground` บน `brand-navy` (สีตอนกด) · คู่ของ `faint-foreground` และ `control-border` เป็นงานของข้อ 3.9

### 4.12 เอกสาร

- `DESIGN.md:76-80` (YAML `rounded`) เพิ่ม `control: "6px"` · `DESIGN.md:89-100` (`button-primary` / `button-secondary`) ใช้ `rounded: "{rounded.control}"` · `height: "40px"` คงไว้จนถึง 2D · secondary เพิ่มสีขอบ #C3CDDA
- `DESIGN.md:269-274` (§5 Buttons) เขียนใหม่ทั้งหัวข้อ ให้ครอบคลุม:
  - มุม 6px
  - ขนาด sm/md/lg/default/icon/icon-sm และ 44px ต่ำกว่า md
  - ตาราง variant
  - danger (ปุ่มในหน้า) เทียบกับ destructive (ปุ่มยืนยัน)
  - ปุ่มที่กดไม่ได้ไม่ใช้ opacity
  - `busy`
  - `linkVariants`
  - ActionButton เลิกใช้แล้ว
- `DESIGN.md:267`, `DESIGN.md:356` และ `.impeccable/design.json:351` เอาคำว่า "touch icon button" ออก (ใช้ `Button size="icon"` แทน)
- `.impeccable/design.json:245-259` (`ds-btn-primary` / `ds-btn-secondary`) แก้มุมเป็น 6px · ขอบ #C3CDDA · hover ตามข้อ 4.3 · ปุ่มที่กดไม่ได้ไม่ใช้ opacity และไม่ใช้ pointer-events none
- changelog และ wiki ตามหมวดเอกสาร

### 4.13 ไม่อยู่ใน 2A

| เรื่อง | ไปที่ |
|---|---|
| ย้ายปุ่มที่เขียน class เอง 413 จุดตามกติกาข้อ 4.8 | 2B / 2C ตามพื้นที่ ที่เหลือ 2D |
| `Loader2` → `busy` | 2C / 2D |
| ลิงก์ในเนื้อหา → `linkVariants` | 2D |
| ปุ่มปิด X ของ dialog/sheet · `DialogFooter` "Close" · ปุ่มในส่วนท้าย dialog (D17) | 2C |
| `RowActions` ช1 (ใช้ `ghost icon-sm`) · ปุ่มคู่แก้ไข/ลบใน master data (D13) | 2B |
| `.next-btn` (ไม่ใช่ variant ของ Button อยู่ใน RowActions) | 2B |
| พลิกค่าตั้งต้นเป็น 36px | 2D (ข้อ 4.9) |

### 4.14 ความเสี่ยง

1. **twMerge ไม่รู้จัก class ใหม่** (ข้อ 4.2) ถ้าข้อ 3.5 ลงช้ากว่างานปุ่ม ปุ่ม `sm` ที่ใส่สีตัวหนังสือจะเสีย `text-meta` ไปเงียบ ๆ test ของปุ่มจับไม่ได้ ต้องพึ่ง `tests/class-merge.test.ts` ของข้อ 3.5 จึงต้องลงข้อ 3.5 ก่อนหรือพร้อมกัน
2. **ช่วง 640–767px** ปุ่มกลางทุกปุ่มสูงขึ้นจาก 40 เป็น 44px แต่ `getFieldControlClasses` ยังใช้ `sm:h-10` ถ้าหมวดช่องกรอกไม่เปลี่ยนเป็น `md` ด้วย ปุ่ม `lg` กับช่องกรอกจะสูงไม่เท่ากันในช่วงความกว้างนี้
3. **หน้าตาสองชุดระหว่าง 2A ถึง 2D** ปุ่มกลาง 31 จุดมุม 6px ขอบ #C3CDDA ส่วนปุ่มเขียนเอง 413 จุดยังมุม 8px ขอบ #D7DEE8 (ความสูงเท่าเดิม) จุดที่เห็นชัดที่สุดแก้ไว้แล้วในข้อ ย27
4. **ปุ่มหลักที่กดไม่ได้เปลี่ยนเป็นสีเทา** ไม่ใช่น้ำเงินจางแบบเดิม (ตั้งใจตามต้นแบบ) ปุ่มบันทึกผลตรวจที่ขาดรูปจะดูต่างจากเดิมมาก เหตุผลข้างปุ่มต้องยังแสดงอยู่ (`audit-scan-check-ui.test.ts:17-24`)
5. **ghost hover มองไม่เห็นบนพื้น `bg-background`** (ส่วนท้าย dialog ที่ sweep เปลี่ยนจาก `bg-muted/20`) เพราะสี hover เท่ากับพื้น ปุ่ม ghost ในจุดแบบนี้ให้ใช้ outline แทน (2C ตรวจ)
6. **busy ใช้ aria-disabled**
   - ผู้เรียกที่ยังใส่ `disabled={busy}` ไว้คู่กันจะทำให้โฟกัสหลุด
   - ในโหมด forced-colors ปุ่ม aria-disabled ไม่ได้สี GrayText อัตโนมัติเหมือน `disabled` (มีแค่ไอคอนหมุนบอก) ต้องตรวจตอนตรวจบนแอป
7. **ชื่อ `danger` มีสองความหมาย** `ActionButton variant="danger"` เป็นแดงทึบ แต่ `Button variant="danger"` เป็นขอบแดง จึงใส่ `@deprecated` ไว้และลบใน 2D
8. **ลบ `secondary` และ `link` ออกจาก cva** ถ้าภายหลังรัน `npx shadcn add` แล้วได้ component ที่ใช้ `variant="secondary"` จะเกิด type error ซึ่ง tsc ใน `npm run verify` จับได้
9. **การพลิกค่าตั้งต้นใน 2D** จะเปลี่ยนทุกปุ่มที่ไม่ได้ระบุ size พร้อมกัน ต้องใส่ `lg` ให้ปุ่มข้างช่องกรอกก่อน (ข้อ 4.9)

ไฟล์ที่แก้ในหมวดนี้: `src/components/ui/button-variants.ts` · `src/components/ui/button.tsx` · `src/components/ui/action-button.tsx` (แค่ JSDoc) · `src/lib/design-system.ts` · `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (2 ลิงก์) · `tests/design-system.test.ts` · `tests/button-busy-ui.test.ts` (ใหม่) · `tests/design-tokens-contrast.test.ts` (1 คู่) · `DESIGN.md` · `.impeccable/design.json` · รอ `src/app/globals.css` และ `src/lib/utils.ts` จากข้อ 3
