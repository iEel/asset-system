> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2a-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** โดยเฉพาะ I15 (มุมโค้งตามต้นแบบจริง: ปุ่ม md/lg และช่องกรอก 8px · ปุ่ม sm, segmented, chip และป้ายสถานะ 6px · เมนู popover toast 12px) และ I14 (สีจางบน primary-soft อนุญาต)

## 6. ช่องกรอก (คอมโพเนนต์กลาง)

ขอบเขตของ 2A คือสร้าง primitive ของช่องกรอกครบชุด แล้วต่อเข้ากับของกลางเพียง 4 จุด ได้แก่ `getFieldControlClasses()` (`src/lib/design-system.ts:73`), `SearchableSelect`, `ScannerTextInput` และ `FileDropzone`

สิ่งที่ไม่อยู่ใน 2A:

- การย้ายช่องที่เขียน class เองไปอยู่ 2C
- ช่องกรอกในหน้ารายการฝั่ง server (12 ไฟล์ 33 ช่อง) ไปอยู่ 2B
- รายการในป๊อปโอเวอร์ของ `SearchableSelect` (`CommandInput`, `CommandItem`, เครื่องหมายถูก) เป็นของส่วนเมนู ส่วนนี้แก้เฉพาะตัว trigger ป้ายชื่อ hint และ error ของมัน

ค่าทุกตัวในส่วนนี้นับซ้ำที่ `081d538` แล้ว เครื่องมือที่ใช้มี 3 อย่าง: grep, ไฟล์ `scratchpad/p2-map/fields.json` (สแกนที่ HEAD เดียวกัน) และการคอมไพล์ Tailwind 4.2.4 กับ tailwind-merge 3.5.0 ของ repo ในหน่วยความจำ

### 6.1 สภาพตอนนี้

| เรื่อง | ค่า | ที่มา |
|---|---|---|
| ช่องข้อความ, ช่องเลือก, กล่องข้อความหลายบรรทัด | 316 ช่องใน 70 ไฟล์ (`<input>` 299 · `<select>` 67 · `<textarea>` 45 · ไม่นับ checkbox/radio/hidden/file 95 ช่อง) | grep + `fields.json` |
| ช่องที่ใช้ `getFieldControlClasses()` | 10 ช่องใน 6 ไฟล์: `asset-register-toolbar.tsx:31` (3) · `asset-register-filter-sheet.tsx:219` · `asset-register-search-field.tsx:104` · `audit-scan-room-picker.tsx:81, :89` · `audit-scan-search.tsx:73` · `report-filter-panel.tsx:65, :106` | grep |
| ช่องที่ยังเป็น `border-border` | 282 ช่อง | `fields.json` |
| `SearchableSelect` | 29 จุดใน 13 ไฟล์ | grep |
| `ScannerTextInput` | 5 จุดใน 4 ไฟล์ | grep |
| `FileDropzone` | 17 จุดใน 14 ไฟล์ | grep |
| ช่องที่มี `disabled` | 37 ช่อง จัดหน้าตาตอน disabled ไว้ 15 ช่อง อีก **22 ช่องดูเหมือนกดได้** (preflight ใส่ `opacity: 1; color: inherit` และ class ใส่ `bg-background`) | `fields.json` |
| `aria-invalid` | 6 ช่อง (มีแค่ใน supplier-form) · ไม่มีกรอบสีของ error ที่ไหนเลย | `fields.json` |
| `readOnly` บนช่องกรอก | 0 | grep |
| สี placeholder | ค่าตั้งต้นของ preflight (`currentcolor` 50%) ได้ #858E9A: **3.32:1 บนขาว และ 3.25:1 บน `--background` ไม่ผ่าน AA** · มีที่ตั้ง `placeholder:text-muted-foreground` เอง 13 บรรทัด (ช่องกรอก 12 + `command.tsx:76`) | คำนวณ + grep |
| ดอกจันบอกช่องจำเป็น `ml-1 text-danger">*` | 33 จุดใน 26 ไฟล์ · ไม่มีจุดไหนใส่ `aria-hidden` | grep |
| checkbox / radio | 49 tag · `accent-primary` 3 จุด (ซ้ำกับ `accent-color` ของ `:root` ที่เฟส 1 ใส่ไว้แล้ว) | grep |
| iOS ซูมตอนแตะช่อง | `src/app/layout.tsx:43-48` ไม่มี `maximumScale` · ช่องที่ตัวอักษรเล็กกว่า 16px จะถูกซูม | อ่านโค้ด |
| `FileDropzone` โฟกัสด้วยคีย์บอร์ดแล้วมองไม่เห็น | ช่องไฟล์เป็น `sr-only` ซึ่ง Tailwind 4.2.4 เขียนเป็น `clip-path: inset(50%)` จึงตัด outline ทิ้งด้วย · ตัว `<label>` เองไม่มีสไตล์โฟกัส | `node_modules/tailwindcss/dist/lib.js` + `file-dropzone.tsx:98-111` |
| `react` | 19.2.4 · ฝั่ง server ใช้ `useId`, `cloneElement`, `isValidElement`, `Children` ได้ แต่ใช้ `createContext`/`useContext` ไม่ได้ | `node_modules/react/cjs/react.react-server.development.js` |

### 6.2 สิ่งที่ต้องมีก่อน (มาจากส่วน token และส่วนปุ่มของ 2A)

| ต้องมี | ใช้ทำอะไรในส่วนนี้ |
|---|---|
| `--faint-foreground` #56677F → `text-faint-foreground` (D2) | placeholder, hint, ไอคอนในช่อง, ลูกศรช่องเลือก, ตัวหนังสือตอน disabled · ค่า contrast: 5.77 บน card · 5.42 บน background · 5.09 บน canvas · 4.95 บน muted |
| `text-meta` 13 / `calc(20 / 13)` (D1) | ป้ายชื่อ hint และข้อความ error · อัตรา 1.54 เกิน 1.44 แล้ว จึงไม่ต้องเพิ่มค่าใต้ `html:lang(th)` |
| `--radius-control` 6px → `rounded-control` (D7) | มุมของช่องกรอกทุกแบบ |
| tailwind-merge ที่รู้จักชื่อใหม่ (ข้อ 3.5) | ถ้าไม่ตั้ง `cn("text-meta text-faint-foreground")` จะทิ้ง `text-meta` ไป (ทดสอบกับ 3.5.0 ของ repo แล้ว) |
| `--shadow-field-focus` / `--shadow-field-error` (ข้อ 3.4) | halo ของโฟกัสและ error · เป็น `rgb(… / 0.16)` และ `rgb(… / 0.14)` ไม่ใช่ `color-mix` จึงไม่มีปัญหาค่าสำรองในเบราว์เซอร์เก่า |
| base rule `::placeholder` (ข้อ 3.6) | สี placeholder ของทุกช่อง · ข้อ 3.6 ลบ `placeholder:text-muted-foreground` 13 บรรทัดใน 2A ด้วย |
| `@utility select-chevron` (ข้อ 3.7) | ลูกศรของ `NativeSelect` (ข้อ 3.7 เรียก primitive นี้ว่า `Select` ให้อ่านเป็น `NativeSelect` ตามข้อ 6.8 ข้อ 16) |
| `Button size="lg"` = 40px และ 44px ใต้ `md` (ข้อ 4.3) | ปุ่มกล้องใน `ScannerTextInput` ต้องสูงเท่าช่องกรอก |

ขอบช่องกรอกยังเป็น `border-input` (#7C8BA0 · 3.47 / 3.26 / 3.06 บน card / background / canvas) ส่วน `--control-border` #C3CDDA (D5) ใช้กับปุ่มเท่านั้น ห้ามใช้กับช่องกรอก

### 6.3 `globals.css`

ส่วนนี้ไม่เพิ่มอะไรใน `globals.css` เอง ค่าที่ช่องกรอกใช้อยู่ในส่วน token ทั้งหมด (ข้อ 3.4, 3.6 และ 3.7) ตรวจด้วยการคอมไพล์ Tailwind 4.2.4 แล้วได้ผล 3 ข้อ:

- `@media (forced-colors: active)` ที่ซ้อนใน `@utility select-chevron` แยกออกมาเป็น media query ถูกต้อง
- `::placeholder` ของเรามาหลังของ preflight ใน `@layer base` จึงชนะ
- `focus:ring-1` กับ `focus:shadow-field-focus` รวมกันอยู่ใน `box-shadow` เดียว (วง 1px อยู่บน halo)

### 6.4 `fieldControlVariants` (`src/components/ui/field-variants.ts` ไฟล์ใหม่)

ไฟล์นี้มีแต่ TS ไม่มี React และ import แค่ `cva` แบบเดียวกับ `button-variants.ts` ห้าม import ผ่าน alias `@/…` เพราะ `design-system.ts` import ไฟล์นี้ด้วย path ตรง (`../components/ui/….ts`) และ test ของ node ก็ import `design-system.ts` ตรง ๆ โดยไม่มี alias

```ts
export type FieldSize = "md" | "lg" | "xl"
export const fieldControlVariants = cva(BASE, {
  variants: { fieldSize: {
    md: "h-11 text-base md:h-9 md:text-sm",   // 36 ในแถบเครื่องมือ
    lg: "h-11 text-base md:h-10 md:text-sm",  // 40 ค่าตั้งต้น
    xl: "h-12 text-base",                      // 48 ช่องค้นหาตอนสแกน
  } },
  defaultVariants: { fieldSize: "lg" },
})
export const textareaClasses = `${BASE} min-h-24 py-2 text-base md:text-sm resize-y`
export const fieldReadOnlyClasses = "read-only:border-border read-only:bg-background"
export const checkboxVariants = cva("shrink-0 cursor-pointer disabled:cursor-not-allowed",
  { variants: { size: { md: "size-4", lg: "size-5" } }, defaultVariants: { size: "md" } })
```

`BASE` แยกเป็นส่วนตามตารางนี้:

| ส่วน | class |
|---|---|
| โครง | `w-full min-w-0 rounded-control border border-input bg-surface px-3 text-foreground outline-none` |
| การเปลี่ยนสถานะ | `transition-[color,background-color,border-color,box-shadow] motion-reduce:transition-none` |
| โฟกัส | `focus:border-ring focus:ring-1 focus:ring-ring focus:shadow-field-focus` |
| error | `aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger aria-invalid:shadow-field-error` |
| error ขณะโฟกัส | `aria-invalid:focus:border-ring aria-invalid:focus:ring-ring aria-invalid:focus:shadow-field-focus` |
| disabled | `disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-faint-foreground` |

สิ่งที่ตั้งใจไม่ใส่ใน `BASE`:

- **`read-only:`** เพราะ `:read-only` จับ `<select>` และ `<button>` ทุกตัวเสมอ ถ้าใส่ใน `BASE`, `NativeSelect` และ trigger ของ `SearchableSelect` จะได้หน้าตา read-only ตลอด จึงใส่ `fieldReadOnlyClasses` เฉพาะใน `Input` และ `Textarea`
- **สี placeholder** เพราะกฎ base ในข้อ 3.6 คุมไว้แล้ว
- **`hover:`** เพราะต้นแบบไม่มีสถานะ hover ของช่องกรอก

ลำดับ variant ใน Tailwind 4.2.4 (`lib.js`) เรียงจากก่อนไปหลังดังนี้ ตัวที่มาทีหลังชนะเมื่อ specificity เท่ากัน:

`read-only` → `focus-within` → `hover` → `focus` → `focus-visible` → `active` → `enabled` → `disabled` → `has` → `aria` → `data`

ผลที่ตามมา:

- `aria-invalid:` (0,2,0) ชนะ `focus:` ที่ specificity เท่ากัน ถ้าไม่มีแถว "error ขณะโฟกัส" ช่องที่ผิดจะมีวงโฟกัสสีแดง
- แถวนั้นได้ (0,3,0) จึงชนะ ช่องที่ผิดเลยกลับเป็นสี teal ตอนโฟกัส
- ทุก class ผ่าน guard `visual-foundation-guards.test.ts:11` เพราะไม่มี `focus:`/`focus-visible:`/`focus-within:` อยู่หน้า `(ring|border)-danger` เลย

**ห้ามเขียน** `focus:border-danger` หรือ `aria-invalid:focus:ring-danger`

`getFieldControlClasses(options?: { fieldSize?: FieldSize })` ใน `design-system.ts` เปลี่ยนให้คืนค่า `fieldControlVariants(options)` ชื่อ export คงเดิม จึงยังผ่าน `design-system.test.ts:35, :37` (`focus:border-ring`, `border-input`) และใช้ต่อได้กับ element ที่ใช้ primitive ไม่ได้ เช่น trigger ที่เป็น `<button>`

### 6.5 หน้าตาแต่ละสถานะ

| สถานะ | หน้าตา | ค่า |
|---|---|---|
| ปกติ | ขอบ `input` · พื้นขาว · มุม 6px | ขอบ 3.47:1 บนขาว |
| hover | ไม่เปลี่ยน | ต้นแบบไม่มี |
| โฟกัส | ขอบ `ring` + วง 1px `ring` + halo 4px สี ring 16% | ring 4.41:1 บนขาว · halo ทับขาวได้ประมาณ #D9EBED |
| error (ไม่ได้โฟกัส) | ขอบ `danger` + วง 1px + halo 4px สี danger 14% | danger 6.54:1 บนขาว |
| error + โฟกัส | เหมือนโฟกัสปกติ (teal) | ข้อความ error ใต้ช่องยังแสดงอยู่ |
| disabled | พื้น `background` · ขอบ `border` · ตัวหนังสือ `faint-foreground` · เคอร์เซอร์ not-allowed · ไม่ใช้ opacity | ตัวหนังสือ 5.42:1 บน background |
| read-only (เฉพาะ `Input`/`Textarea`) | พื้น `background` · ขอบ `border` · ตัวหนังสือสีปกติ · ยังโฟกัสและคัดลอกได้ | ใช้วงโฟกัสเดิม (`focus:` อยู่หลัง `read-only:`) |
| เปิดอยู่ (`SearchableSelect`, `aria-expanded="true"`) | เหมือนโฟกัส | ต้นแบบ `base.css:270` |
| placeholder / ค่าว่างของ `SearchableSelect` | `faint-foreground` | 5.77:1 บนขาว |
| ขนาด | ใต้ `md` สูง 44 ตัวอักษร 16px (iOS ไม่ซูม) · ตั้งแต่ `md` สูง 36 / 40 / 48 ตัวอักษร 14px (`xl` 48 และ 16px ทุกความกว้าง) | |

### 6.6 คอมโพเนนต์และ API

ทุกไฟล์อยู่ใน `src/components/ui/` ไม่มี `"use client"` ไม่ใช้ hook อื่นนอกจาก `useId` และไม่ใช้ context จึงใช้ได้ทั้งในหน้า server และ client (แบบเดียวกับ `button.tsx`) ทุกตัวใส่ `data-slot` ตามชื่อ

| ไฟล์ | API | หมายเหตุ |
|---|---|---|
| `input.tsx` | `Input({ className, fieldSize, type, ...props }: Omit<React.ComponentProps<"input">, "size" \| "type"> & { fieldSize?: FieldSize; type?: InputType })` | `InputType` คือ union ชัด ๆ: `"text" \| "search" \| "email" \| "password" \| "tel" \| "url" \| "number" \| "date" \| "datetime-local" \| "time" \| "month"` (ใช้ `Exclude<HTMLInputTypeAttribute, …>` ไม่ได้ เพราะมี `string & {}` อยู่ข้างใน) · class: `cn(fieldControlVariants({ fieldSize }), fieldReadOnlyClasses, numeric && "num", className)` โดย `numeric` คือ type เป็น number / date / datetime-local / time · `ref` เป็น prop ธรรมดา (React 19) |
| `textarea.tsx` | `Textarea({ className, ...props }: React.ComponentProps<"textarea">)` | `cn(textareaClasses, fieldReadOnlyClasses, className)` · ผู้เรียกใส่ `min-h-28` / `min-h-32` / `rows` ได้ |
| `native-select.tsx` | `NativeSelect({ className, fieldSize, ...props }: Omit<React.ComponentProps<"select">, "size" \| "multiple"> & { fieldSize?: FieldSize })` | `cn(fieldControlVariants({ fieldSize }), "select-chevron cursor-pointer pr-9", className)` (`disabled:cursor-not-allowed` ใน `BASE` ชนะ `cursor-pointer` เพราะ specificity สูงกว่า) |
| `field.tsx` | `Field`, `FieldLabel`, `FieldHint`, `FieldError` | ดูด้านล่าง |
| `search-field.tsx` | `SearchField` | ดูด้านล่าง |

**`Field`**

```ts
type FieldControlProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: true; "aria-required"?: true }
function Field(props: {
  label: React.ReactNode; hideLabel?: boolean; required?: boolean
  hint?: React.ReactNode; error?: React.ReactNode; id?: string; className?: string
  children: React.ReactElement | ((control: FieldControlProps) => React.ReactNode)
})
function FieldLabel(props: React.ComponentProps<"label"> & { required?: boolean; visuallyHidden?: boolean })
function FieldHint(props: React.ComponentProps<"p">)
function FieldError(props: React.ComponentProps<"p">)
```

- **โครง:** `div.grid.min-w-0.gap-1.5` (ต้นแบบเว้น 6px) → `FieldLabel[htmlFor]` → ช่องกรอก → `FieldHint` → `FieldError` ป้ายชื่อไม่ห่อช่องกรอก และ hint กับ error อยู่นอก `<label>`
- **id ของช่อง:** ใช้ `children.props.id` ถ้ามี ไม่มีจึงใช้ `props.id` ไม่มีทั้งคู่จึงสร้างจาก `useId()` ส่วน hint และ error ใช้ `${id}-hint` / `${id}-error`
- **ลูกเป็น element เดียว:** ใช้ `cloneElement` ใส่ props เพิ่ม 4 ตัว
  - `id`
  - `aria-describedby` = ค่าเดิมของลูก + error + hint (error มาก่อน)
  - `aria-invalid={true}` เมื่อ `error` มีค่า
  - `aria-required={true}` เมื่อ `required`
- **ลูกเป็นฟังก์ชัน:** ส่ง props ชุดเดียวกันไปให้ ใช้กับช่องที่มีหลายชิ้นประกอบกัน
- **`required` ไม่ใส่ `required` จริงให้ช่อง** ถ้าใส่ เบราว์เซอร์จะเริ่มตรวจฟอร์มเองและอาจบล็อกการ submit ที่ตอนนี้ตรวจด้วยโค้ดของเราเอง (มี 87 ช่องที่ใส่ `required` อยู่แล้ว ไม่แตะ) ใช้ `aria-required` แทน screen reader จึงยังรู้ว่าช่องนี้จำเป็น
- **ห้ามห่อ `SearchableSelect` ด้วย `Field`** เพราะมีป้ายชื่อในตัวอยู่แล้ว จะกลายเป็นป้ายซ้อน 2 ชั้น
- **class:**

| ส่วน | class |
|---|---|
| `FieldLabel` | `text-meta font-medium text-foreground` (`sr-only` เมื่อ `visuallyHidden` · ไม่ใช้ชื่อ `hidden` เพราะชนกับ attribute `hidden` ของ HTML แบบเดียวกับ `size`) |
| ดอกจัน | `<span aria-hidden="true" className="ml-1 text-warning">*</span>` |
| `FieldHint` | `text-meta text-faint-foreground` |
| `FieldError` | `role="alert"` · `text-meta text-danger` |

**`SearchField`**

```ts
function SearchField(props: Omit<React.ComponentProps<"input">, "size" | "type"> & {
  type?: "search" | "text"; fieldSize?: FieldSize; loading?: boolean
  trailing?: React.ReactNode            // ปุ่มไอคอนเพิ่มได้ 1 ปุ่ม กว้างไม่เกิน 44px เช่นปุ่มกล้องของหน้าตรวจนับ
} & ({ onClear?: undefined; clearLabel?: undefined } | { onClear: () => void; clearLabel: string }))
```

- `className` ใส่ที่ตัวห่อ `relative min-w-0` (ใช้จัดวาง) ส่วน props อื่นส่งต่อให้ `Input`
- **ไอคอนนำ:** `pointer-events-none absolute inset-y-0 left-3 flex items-center text-faint-foreground` ข้างในเป็น `Search` `size-4` ถ้า `loading` เปลี่ยนเป็น `Loader2 animate-spin motion-reduce:animate-none`
- **ช่อง:** `<Input type={type ?? "search"} fieldSize={fieldSize} className="pl-9 [&::-webkit-search-cancel-button]:appearance-none …">` ซ่อนปุ่ม × ของ WebKit ทุกครั้ง เพื่อให้หน้าตาเหมือนกันทุกเบราว์เซอร์
- **ปุ่มท้ายช่อง:**
  - อยู่ในตัวห่อ `absolute inset-y-0 right-0.5 flex items-center gap-0.5`
  - ปุ่มล้าง (`type="button"`, `aria-label={clearLabel}`) แสดงเมื่อมี `onClear` และ `value` ไม่ว่าง สูงเท่าช่อง กว้าง `w-11` · `rounded-control text-faint-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
  - ระยะขวาของช่อง: ปุ่ม 1 ปุ่ม `pr-12` · 2 ปุ่ม `pr-24`
- **ใช้ในหน้า server ได้** โดยไม่ส่ง `onClear` (หน้า server ส่งฟังก์ชันให้ component ไม่ได้)
- **2A ยังไม่มีที่ใช้ `SearchField`** ที่แรกที่จะใช้คือช่องค้นหาของทะเบียนและหน้าข้อมูลหลัก (2B) และหน้าตรวจนับ (2C)

**checkbox:** `checkboxVariants` ใช้กับ `<input type="checkbox|radio">` ของเบราว์เซอร์ สีมาจาก `accent-color` (เฟส 1) และวงโฟกัสมาจาก `:focus-visible` ใน base

- ไม่ใส่ `outline-none`
- class เดิมอย่าง `rounded`, `border-border`, `text-primary`, `focus:ring-ring` ไม่มีผลกับ checkbox ของเบราว์เซอร์ จะถูกลบใน 2C (49 tag)
- พื้นที่กดขนาด 44px เป็นหน้าที่ของ `<label>` แถวที่ห่อ checkbox ไม่ใช่ของตัว checkbox

### 6.7 ต่อเข้ากับของเดิมใน 2A

| ไฟล์ | เปลี่ยน |
|---|---|
| `src/lib/design-system.ts:73` | `getFieldControlClasses(options?)` → `fieldControlVariants(options)` ช่อง 10 ช่องใน 6 ไฟล์จะเปลี่ยนตาม: พื้นขาว · มุม 6px · halo · error/disabled · ใต้ `md` สูง 44 (เดิมสลับที่ `sm`) |
| `src/components/audit/audit-scan-search.tsx:73` | `cn(getFieldControlClasses(), "h-12 pl-9 pr-24 text-base sm:h-12")` → `cn(getFieldControlClasses({ fieldSize: "xl" }), "pl-9 pr-24")` · **ต้องแก้** ถ้าไม่แก้ twMerge จะเก็บ `md:h-10 md:text-sm` ของค่าใหม่ไว้ (ตรวจแล้ว) และ `md:h-10` ชนะ `sm:h-12` ช่องจะเหลือ 40px / 14px บนจอ ≥768 |
| `src/components/ui/searchable-select.tsx` | ป้ายชื่อเปลี่ยนจาก `<span>` เป็น `FieldLabel id={labelId} htmlFor={triggerId} required` · trigger: `cn(fieldControlVariants({ fieldSize }), "flex items-center justify-between gap-2 text-left cursor-pointer aria-expanded:border-ring aria-expanded:ring-1 aria-expanded:ring-ring aria-expanded:shadow-field-focus", showClear ? "pr-24 md:pr-20" : "pr-9")` · เอา `hover:bg-accent` และ `disabled:bg-muted disabled:text-muted-foreground` ออก · ข้อความค่าว่าง `text-faint-foreground` · `ChevronsUpDown` → `ChevronDown` (`absolute right-2.5 … size-4 text-faint-foreground`) · ปุ่มล้าง `sm:` → `md:` และ `rounded` → `rounded-control` · `aria-labelledby` ชี้ id ของป้ายชื่อและ id ของ span ค่าที่เลือก (ให้อ่านค่าที่เลือกด้วย) · prop ใหม่ที่ไม่บังคับ: `id`, `hint`, `error` (→ `aria-invalid` และ `aria-describedby`), `fieldSize` · โครงห่อ `grid min-w-0 max-w-full gap-1.5` · 29 จุดที่เรียกใช้ไม่ต้องแก้ |
| `src/components/ui/scanner-text-input.tsx:289-300` | `<input>` → `<Input id={id} … className="sm:flex-1">` · prop ใหม่ `aria-describedby`, `aria-invalid`, `aria-required` ส่งต่อให้ `Input` (เพื่อให้ `Field` ของ 2C ต่อสายได้) · ลบ prop `inputClassName` ออก |
| `scanner-text-input.tsx:301-310` | ปุ่มกล้อง → `cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")` เพื่อให้สูงเท่าช่องที่ทุกความกว้าง (44 / 40 สลับที่ `md`) · คง `<span>{… labels.stop : labels.start}</span>` ไว้ (test :195) |
| `scanner-text-input.tsx:320-336` | `<label>` ที่ห่อ `<select>` → `<Field label={labels.cameraDevice} className="mb-3"><NativeSelect fieldSize="md" …/></Field>` |
| `src/components/assets/asset-scan-search-tool.tsx:126` | ลบ `inputClassName="…"` (class ชุดเดียวกับค่าตั้งต้นเดิม แค่เรียงคนละลำดับ) ถ้าคงไว้ หน้าสแกนจะยังเป็นช่องหน้าตาเดิม |
| `src/components/ui/file-dropzone.tsx:98-124` | ดูรายละเอียดด้านล่าง |

รายละเอียด `file-dropzone.tsx`:

- **`<label>`:** `block cursor-pointer rounded-md border border-dashed border-input bg-surface p-4 text-center transition-colors motion-reduce:transition-none hover:bg-background has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring`
- **ตอนลากไฟล์มาวาง:** คง `border-primary bg-primary-soft`
- **ตอน disabled:** คง `pointer-events-none` และเปลี่ยน `opacity-60` → `border-border bg-background` ส่วนชื่อเรื่องเป็น `text-faint-foreground`
- **ไอคอน:** เลิกใช้ช่องพื้นสี `bg-primary-soft text-primary` (:117) เหลือ `<Upload className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />`
- **ข้อความรอง** (:121 และ :123 ซึ่งเดิมเป็น `text-[11px] leading-4`): `mt-1 block text-meta text-faint-foreground`
- ถ้า codemod R3 (`text-[11px]`) ลงไปก่อน ให้เขียนทับด้วยค่าในข้อนี้

### 6.8 ข้อตัดสินย่อย

ข้อในแผนที่ที่ยังไม่มีคนตัดสิน ตัดสินตามต้นแบบก่อน ถ้าต้นแบบไม่ได้บอกจึงใช้ข้อแนะนำของแผนที่ ผู้ใช้เปลี่ยนข้อไหนก็ได้

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | พื้นช่องกรอก | ขาว `bg-surface` | ต้นแบบ `.input`/`.select`/`.field-search` ใช้ surface · ช่องสีขาวเด่นขึ้นบน sheet ที่เป็น `bg-background` (`sheet.tsx:64`) |
| 2 | ชื่อขนาด | `md` 36 · `lg` 40 (ค่าตั้งต้น) · `xl` 48 ใช้ชื่อชุดเดียวกับปุ่ม (D4: sm 32 · md 36 · lg 40) | ชื่อเดียวกันได้ความสูงเท่ากัน วาง `Button size="md"` ข้าง `SearchField fieldSize="md"` แล้วสูงเท่ากันแน่นอน ไม่ใช้ชื่อ sm 36 / md 40 ตามที่ร่างไว้ เพราะ `md` จะสูงไม่เท่าปุ่ม `md` |
| 3 | จุดสลับขนาดสำหรับนิ้วกด | ใต้ `md` ทุกขนาดสูง 44 (`xl` 48) | ตาม D4 · ช่องกับปุ่มต้องสลับที่จุดเดียวกัน ไม่งั้นที่ความกว้าง 640-767 ช่องกับปุ่มจะสูงไม่เท่ากัน |
| 4 | ขนาดตัวอักษรบนมือถือ | `text-base` ใต้ `md` และ `md:text-sm` | iOS ไม่ซูม · ต้นแบบมือถือใช้ 16px (`mobile.html:69-73`) · ไทย 16/24 = 1.5 |
| 5 | มุม | `rounded-control` 6px | D7 ระบุ "6px กับปุ่มและช่องกรอก" แต่ `base.css:264` (`.input`) ยังใช้ 8px จึงยึด D7 ที่อนุมัติแล้ว · `FileDropzone` ใช้ 8px (`rounded-md`) เพราะเป็นพื้นที่ใหญ่แบบแผง |
| 6 | สูตรโฟกัส | `focus:` (ไม่ใช่ `focus-visible:`) + ขอบ ring + วง 1px + halo | ต้นแบบใช้ `.input:focus` · ช่องข้อความเข้าเงื่อนไข `:focus-visible` ทุกครั้งที่ได้โฟกัสอยู่แล้ว · ช่องเดิม 287 ช่องก็ใช้ `focus:` |
| 7 | error | ตอนไม่ได้โฟกัสใช้แบบ `.input.err` ของต้นแบบ (ขอบแดง + วง + halo 14%) · ตอนโฟกัสกลับเป็น teal | ใน `base.css` กฎ `.err` อยู่หลัง `:focus` ช่องที่ผิดจึงเป็นแดงแม้ตอนโฟกัส แต่เฟส 1 กำหนดให้วงโฟกัสมีสีเดียว (`visual-foundation-guards.test.ts:11`) ข้อนี้จึงต่างจากต้นแบบเฉพาะตอนโฟกัส |
| 8 | hover | ไม่มี · `SearchableSelect` เอา `hover:bg-accent` ออก | ต้นแบบไม่มี hover ของ `.input`/`.select` |
| 9 | disabled | พื้น background · ขอบ border · ตัวหนังสือ faint · ไม่ใช้ opacity | ต้นแบบ `base.css:265` · แก้ปัญหาช่องที่ดูเหมือนกดได้ 22 ช่องเมื่อย้ายใน 2C |
| 10 | read-only | กล่องเรียบ (พื้น background ขอบ border) ตัวหนังสือสีปกติ ใส่เฉพาะ `Input`/`Textarea` | ต้นแบบและแผนที่ไม่ได้พูดถึง (ตอนนี้ใช้อยู่ 0 ช่อง) · ค่าต้องอ่านและคัดลอกได้ จึงไม่ใช้สีจาง |
| 11 | placeholder | กฎ base `::placeholder` ทั้งแอปตั้งแต่ 2A (เป็นงานของข้อ 3.6) | แผนที่เสนอไว้ แก้ AA ได้ทั้ง 300 ช่องในบรรทัดเดียว โดยไม่ต้องรอ 2C |
| 12 | สีดอกจัน | `text-warning` · `aria-hidden` · `Field` ใส่ `aria-required` และไม่ใส่ `required` | ต้นแบบ `.req { color: var(--warn) }` · แผนที่เตือนเรื่องการตรวจฟอร์มของเบราว์เซอร์ (6.10 ข้อ 3) |
| 13 | ป้ายชื่อตัวกรองแบบย่อ (21 จุด `text-xs text-muted-foreground`) | ไม่มีแบบย่อ ใช้ป้ายแบบเดียวคือ 13/20 500 สีเนื้อหา | ต้นแบบมีป้ายช่องแบบเดียว (`.form-row label`) · หลัง D1 ต่างกันแค่ 1px · แผงตัวกรองจะสูงขึ้นแถวละประมาณ 2px (เห็นผลใน 2B/2C) |
| 14 | hint และ error | 13/20 ทั้งคู่ · error น้ำหนัก 400 · `role="alert"` · แสดงทั้งสองพร้อมกัน error อยู่ใต้ hint · `aria-describedby` อ่าน error ก่อน | ต้นแบบ `.hint`/`.error-text` ไม่ได้ใส่ตัวหนา · `role="alert"` ตามแบบของ supplier-form ที่แผนที่เสนอ |
| 15 | ลูกศรของช่องเลือก | ช่องเลือกของเบราว์เซอร์ใช้ `appearance: none` + รูปลูกศรเป็นพื้นหลัง (element เดียว) · `SearchableSelect` เปลี่ยนเป็น `ChevronDown` | แผนที่เสนอ เพราะใช้ในฟอร์มฝั่ง server ได้ และคง class ความกว้างของผู้เรียก (`w-44`) · ต้นแบบใช้ chevron-down |
| 16 | ชื่อช่องเลือก | `NativeSelect` | มี `function Select` อยู่แล้ว 4 ไฟล์ (checkin, checkout, audit-round, disposal-request) และวันหลังอาจเพิ่ม `Select` แบบ Radix ของ shadcn · ชื่อนี้ตาม mockup.md |
| 17 | วิธีสร้าง `SearchField` | ไอคอนวางทับ + `Input` ที่มี `pl-9` (ไม่ใช้กล่องห่อที่วาดขอบแทนช่อง) | ต้นแบบใช้กล่องห่อ + `:focus-within` แต่หน้าตาออกมาเหมือนกัน · ขอบ โฟกัส error และ disabled จึงอยู่ที่ element เดียว · แบบกล่องห่อคือแบบเดียวกับ 4 ช่องที่ตอนนี้โฟกัสแล้วมองไม่เห็น |
| 18 | ขนาดตั้งต้นของ `SearchField` | `lg` 40 ไม่ใช่ 36 | ถ้าค่าตั้งต้นเป็น 36 ช่องค้นหาจะเตี้ยกว่าปุ่ม 40 และช่องเลือก 40 ในแถวเดียวกันจนถึง 2D (D4: ไม่ให้ความสูงปนกัน) · แถบเครื่องมือเปลี่ยนเป็น `md` พร้อมปุ่มทั้งแถว (เป้าหมายตามต้นแบบคือ 36) |
| 19 | `type` ของ `SearchField` | ค่าตั้งต้น `"search"` และซ่อนปุ่ม × ของ WebKit เสมอ · ทะเบียนส่ง `type="text"` ต่อได้ | ต้นแบบใช้ `type="search"` · ปุ่ม × ของเบราว์เซอร์หน้าตาไม่เหมือนกันในแต่ละเบราว์เซอร์ |
| 20 | ชื่อที่ screen reader อ่านของ `SearchableSelect` | `aria-labelledby` = ป้ายชื่อ + ค่าที่เลือก | ตอนนี้อ่านแค่ป้าย (`aria-labelledby` ชี้ป้ายอย่างเดียว) จึงไม่รู้ค่าที่เลือก · `htmlFor` ตามต้นแบบ ทำให้กดที่ป้ายแล้วเปิดรายการได้ |
| 21 | ดอกจันของ `SearchableSelect` | `aria-hidden` เหมือนช่องอื่น ไม่มีคำว่า "จำเป็น" ให้ screen reader | trigger มี role button จึงใส่ `aria-required` ไม่ได้ · วันนี้ก็อ่านได้แค่ "ดอกจัน" · ถ้าต้องการให้อ่าน ต้องเปลี่ยน trigger เป็น role combobox (นอก 2A) |
| 22 | checkbox | ใช้ของเบราว์เซอร์ + `accent-color` + `checkboxVariants` · `.cbox` (กล่องวาดเอง) ใช้ในเมนูเท่านั้น (ส่วนเมนู) | ต้นแบบใช้ `.cbox` แค่ในเมนูเลือกคอลัมน์ · checkbox ของเบราว์เซอร์ได้คีย์บอร์ด การ submit ฟอร์ม และโหมดสีตัดกันสูงมาฟรี |
| 23 | โฟกัสของ `FileDropzone` | outline 2px สี ring เว้น 2px ที่ `<label>` ผ่าน `has-focus-visible:` ไม่ใช้ halo | ช่องไฟล์ถูกซ่อนแบบ `sr-only` จึงใช้กฎโฟกัสนอก layer ของโหมดสีตัดกันสูงไม่ได้ · outline ยังเห็นในโหมดนั้นแต่เงา (halo) หาย · หน้าตาเดียวกับโฟกัสพื้นฐานของเฟส 1 |
| 24 | `FileDropzone` | ขอบประ `border-input` · ไอคอนสีกลางไม่มีช่องพื้นสี · hover `bg-background` · disabled ไม่ใช้ opacity | critic G14 · ต้นแบบไม่ใช้ช่องไอคอนพื้นสีเป็นของตกแต่ง และ hover ของปุ่มเป็นสี subtle |
| 25 | `num` ใน `Input` | ใส่ให้เองเมื่อ type เป็น number / date / datetime-local / time | แผนที่เสนอ · ตัวเลขในช่องกว้างเท่ากัน |
| 26 | `disabled` ของ `ScannerTextInput` | ไม่เปลี่ยนพฤติกรรม ช่องยังไม่รับ `disabled` (วันนี้ส่งให้แค่ปุ่มกล้อง) | 2A เปลี่ยนแค่หน้าตา · `asset-form.tsx` ส่ง `disabled={saving}` มา ให้ 2C ตัดสินอีกครั้ง |
| 27 | หน้าตาปนกันระหว่าง 2A ถึง 2C | ยอมรับได้ · ใน 2C ทำ 16 ไฟล์ที่มี `SearchableSelect`/`ScannerTextInput` ปนอยู่กับช่องเขียนเองก่อน | ความสูงไม่ปน (40 ที่ `md` ขึ้นไปทั้งสองแบบ) · ขอบใหม่ผ่าน 3:1 ส่วนขอบเดิมได้แค่ 1.35:1 จึงเป็นการแก้ ไม่ใช่การถอยหลัง · ถ้าไม่อยากให้ผู้ใช้เห็นช่องปนกันบน Production ให้ deploy 2A พร้อม 2C ชุดแรก |
| 28 | ช่องค้นหาที่แถบบน (`.gsearch`) | ไม่อยู่ใน `SearchField` | หน้าตาเป็นแบบเงียบ (ขอบ line พื้น subtle 13px) ไปพร้อม Ctrl K ในเฟส 3 หรือ 2C จะเพิ่ม `appearance="quiet"` ก็ได้ |

16 ไฟล์ในข้อ 27 แบ่งเป็น 2 กลุ่ม:

- ไฟล์ที่มีช่องเขียนเองอยู่ในไฟล์เดียวกัน 12 ไฟล์: `system-settings-form` · `bulk-move-form` · `checkin-form` · `checkout-form` · `transfer-form` · `asset-batch-form` · `asset-component-manager` · `asset-form` · `audit-finding-review-actions` · `disposal-batch-form` · `disposal-execution-button` · `disposal-request-form`
- ฟอร์มที่เรียกผ่าน wrapper 4 ไฟล์:
  - `maintenance-plan-form`, `repair-record-actions` และ `repair-record-form` เรียกผ่าน `maintenance-option-select`
  - `audit-scan-check-form` เรียกผ่าน `audit-scan-check-field`

### 6.9 Test

แก้ test เดิม (เป็นงานเดียวกับที่ทำให้ test พัง):

| test | เดิม | ใหม่ |
|---|---|---|
| `tests/scanner-text-input.test.ts:193` | `/<input[\s\S]+id=\{id\}/` | `/<Input[\s\S]+id=\{id\}/` |
| `tests/scanner-text-input.test.ts:194` | `/min-h-11 min-w-0 w-full[^"]*sm:flex-1/` | `/<Input[\s\S]*?className="sm:flex-1"/` และเพิ่ม `/<NativeSelect fieldSize="md"/` |
| `tests/asset-scan-search-tool.test.ts:46` | `inputClassName="min-h-11 w-full min-w-0[^"]*sm:flex-1` | `assert.doesNotMatch(tool, /inputClassName=/)` |
| `tests/audit-scan-search-ui.test.ts:15` | `/text-base/` | `/getFieldControlClasses\(\{ fieldSize: "xl" \}\)/` (เงื่อนไขว่า iOS ต้องไม่ซูมย้ายไปตรวจใน test ใหม่: `xl` ต้องมี `text-base` และต้องไม่มี `md:text-sm`) |

test ที่ตรวจแล้วว่ายังผ่านโดยไม่ต้องแก้:

- `design-system.test.ts:35, :37`
- `searchable-select-accessibility.test.ts:5-13` (ตรวจแค่ Popover, Command, ตัวกรอง และความกว้างของ trigger)
- `audit-scan-search-ui.test.ts:144-155` (ตรวจแค่ props ของ `FileDropzone`)
- `audit-not-found-dialog.test.ts:15`, `confirm-text-dialog-ui.test.ts:21`, `disposal-detail-workspace.test.ts:56`, `audit-mobile-flow-completion.test.ts:11`, `audit-scan-check-ui.test.ts:47, :84` (ตรวจแค่ว่ามีการเรียก component)
- `design-tokens-contrast.test.ts:103` (ส่วนนี้ไม่เพิ่ม token ใน `:root`)
- `visual-foundation-guards.test.ts:11-12`

ไม่มี test ไหนอ้าง `h-12`, `pr-24`, `pl-9`, `ChevronsUpDown` หรือ class ของ trigger และ dropzone (grep `tests/` แล้ว)

test ใหม่ `tests/field-primitives.test.ts` (ใช้ `import` กับ `field-variants.ts` และ `utils.ts` ได้ ส่วนไฟล์ `.tsx` ตรวจด้วย regex เพราะ test ของ repo ไม่ได้ render):

- `fieldControlVariants()` มี `border-input`, `bg-surface`, `rounded-control`, `h-11`, `md:h-10`, `text-base`, `md:text-sm` และสูตร focus / error / error ขณะโฟกัส / disabled ครบ ต้องไม่มี `opacity` `hover:` และ `read-only:`
- `fieldSize: "md"` มี `md:h-9` · `"xl"` มี `h-12 text-base` และไม่มี `md:text-sm`
- `getFieldControlClasses()` ต้องเท่ากับ `fieldControlVariants()` และ `getFieldControlClasses({ fieldSize: "xl" })` ต้องเท่ากับ `fieldControlVariants({ fieldSize: "xl" })`
- ไฟล์ `field-variants.ts`, `input.tsx`, `textarea.tsx`, `native-select.tsx`, `field.tsx` และ `search-field.tsx` ต้องไม่มี `"use client"`, `useState`, `useEffect`, `createContext` และ `useContext`
- `input.tsx` และ `native-select.tsx` ต้อง `Omit<…, "size"…>` และใช้ `fieldSize`
- `field.tsx` ต้องมี `htmlFor=`, `aria-hidden="true"` ที่อยู่คู่กับ `text-warning`, `"aria-required"` และ `role="alert"` และต้องไม่มีการใส่ `required` ลงช่อง (`/\brequired(:|=)\s*(true|\{true\})/`)
- `searchable-select.tsx` ต้องมี `FieldLabel`, `ChevronDown`, `aria-expanded:border-ring` และไม่มี `hover:bg-accent` บน trigger
- `native-select.tsx` ต้องมี `select-chevron` และ `pr-9`
- `file-dropzone.tsx` ต้องมี `has-focus-visible:outline-ring` และ `border-input` และต้องไม่มี `opacity-`

test ของ globals ไม่อยู่ในส่วนนี้ ข้อ 3.9 เป็นคนเพิ่ม ได้แก่ `::placeholder`, forced-colors ของ `select-chevron`, สีลูกศรต้องตรงกับ `--faint-foreground`, rgb ของ halo ต้องตรงกับ `--ring`/`--danger` และ `tests/class-merge.test.ts` ของ tailwind-merge

### 6.10 ความเสี่ยงและกับดัก

1. **tailwind-merge ทิ้ง class ใหม่ (ทดสอบกับ 3.5.0 แล้ว)**
   - `twMerge("text-meta text-faint-foreground")` ได้ `text-faint-foreground` อย่างเดียว เพราะไลบรารีเข้าใจว่า `text-meta` เป็นสีตัวอักษร
   - ป้ายชื่อ hint และ error ของ `Field` ทุกตัวจะหดกลับเป็นขนาดที่สืบทอดมา
   - ข้อ 3.5 แก้ด้วย `extendTailwindMerge` ซึ่งต้องลงก่อนหรือพร้อมงานของส่วนนี้ (ทดสอบซ้ำแล้ว ใช้ได้)
2. **ห้ามตั้งชื่อ prop ว่า `size`** เพราะ `<input size>` และ `<select size>` เป็น attribute ตัวเลขของ HTML · primitive ใช้ `fieldSize` และ `Omit<…, "size">`
3. **ห้ามใส่ `required` ให้ช่องเอง** เพราะจะเปิดการตรวจฟอร์มของเบราว์เซอร์ `Field` ใส่แค่ดอกจันกับ `aria-required`
4. **ลำดับ variant กับ guard**
   - `aria-*` มาหลัง `focus` และ `disabled` ถ้าไม่มี `aria-invalid:focus:*` ช่องที่ผิดจะมีวงโฟกัสสีแดง
   - ถ้าเขียน error recipe โดยมี `focus:` นำหน้า `ring-danger` หรือ `border-danger` guard จะพัง (เป็นความตั้งใจ)
   - ช่องที่ disabled และ invalid พร้อมกันจะเห็นขอบแดง ยอมรับได้เพราะเป็นกรณีที่แทบไม่เกิด
5. **`:read-only` จับ `<select>` และ `<button>` เสมอ** ห้ามย้าย `fieldReadOnlyClasses` เข้าไปใน `BASE` หรือ `getFieldControlClasses()`
6. **override ที่สู้กับ breakpoint ไม่ได้**
   - `className="h-12"` ชนะได้แค่ `h-11` แต่ชนะ `md:h-10` ไม่ได้ ความสูงจึงต้องเปลี่ยนผ่าน `fieldSize` เท่านั้น
   - ตอนนี้มีจุดเดียวที่เจอปัญหานี้คือ `audit-scan-search.tsx:73` ซึ่งแก้ในข้อ 6.7 แล้ว
7. **`Field` ใช้ `cloneElement`**
   - ลูกต้องเป็น element เดียวที่รับ `id` และ `aria-*` ได้ ถ้าเป็น component ที่ประกอบหลายชิ้นให้ใช้ลูกแบบฟังก์ชัน
   - `ScannerTextInput` รองรับแล้วใน 2A
   - `SearchableSelect` ห้ามห่อด้วย `Field`
   - `Field` ห้ามอยู่ใน `<label>` (ตอนนี้ `asset-form.tsx:896` และ `asset-batch-form.tsx:869` ห่อ `ScannerTextInput` ด้วย `Field` ของไฟล์ที่เป็น `<label>` พอช่องเลือกกล้องใช้ `Field` จะยังเป็นป้ายซ้อนกันเหมือนวันนี้ 2C แก้ได้เมื่อ `Field` ของไฟล์เปลี่ยนเป็น `div`)
8. **ช่วง 640-767px สูงขึ้น** ช่อง 10 ช่องของ helper, `SearchableSelect` และ `ScannerTextInput` เปลี่ยนจาก 40 เป็น 44 เพราะจุดสลับย้ายจาก `sm` ไป `md` · ปุ่มของ `report-filter-panel.tsx:75, :80` ใช้ `md:h-10` อยู่แล้ว จึงสูงเท่ากันขึ้น
9. **iPad ที่กว้าง 768px ขึ้นไปได้ตัวอักษร 14px** ต้องลองบน iPad จริงว่าซูมตอนแตะช่องหรือไม่ ถ้าซูม ให้เลื่อนจุดสลับ `text-base` ไปที่ `lg`
10. **ห้ามเขียน halo เป็น `color-mix`** ถ้าวันหลังมีคนเปลี่ยน token ในข้อ 3.4 เป็น `color-mix` Tailwind 4.2.4 จะใส่ค่าสำรองเป็นสีทึบ (`var(--tw-shadow-color, var(--ring))`) ไว้นอก `@supports` เบราว์เซอร์ที่ไม่รองรับ (Chrome <111, Safari <16.2) จะเห็นขอบ teal ทึบหนา 4px (ทดสอบด้วยการคอมไพล์แล้ว) ค่า `rgb(… / α)` ในข้อ 3.4 ไม่มีปัญหานี้
11. **โหมดสีตัดกันสูงของ Windows**
    - วง (`ring`) และ halo หาย ช่องข้อความยังเห็น outline จากกฎนอก layer (`globals.css:181-186`)
    - `<select>` ที่คลิกด้วยเมาส์ไม่เข้าเงื่อนไข `:focus-visible` จึงไม่มี outline ส่วนตอนใช้คีย์บอร์ดเห็นปกติ
    - ลูกศรกลับเป็นของระบบ (ข้อ 3.7)
12. **ช่องบนพื้น `muted`** ขอบ `input` ได้แค่ 2.97:1 ไม่ถึงเกณฑ์ 3:1 ห้ามวางช่องกรอกบน `bg-muted` (แผงและ dialog ใช้ `surface` หรือ `background` ได้ทั้งคู่)
13. **ฟอร์มมีช่อง 2 แบบปนกันจนถึง 2C** (16 ไฟล์ ข้อ 6.8 ข้อ 27) จอที่มีช่องเยอะ (system-settings 50 ช่อง, asset-form 27 ช่อง) จะเห็นชัดที่สุด ให้เทียบภาพก่อนและหลังบนแอป dev
14. **`SearchableSelect` มีส่วนอื่นแก้ไฟล์เดียวกัน** ข้อ 5.8 แก้รายการในไฟล์นี้ (`searchable-select.tsx:87-95`) ส่วนนี้แก้ :59-79 และ :101-112 ต้องเรียงงานให้ไม่ชนกัน หรือทำในงานเดียวกัน
    - input ใน `CommandInput` ตามข้อ 5.8 ยังเป็น `text-sm` จึงโดน iOS ซูมตอนค้นหาในรายการบนมือถือ ควรเป็น `text-base md:text-sm` แบบเดียวกับช่องกรอก (ฝากให้ส่วนเมนูแก้)
15. **`npx shadcn add input|textarea|native-select|field` จะเขียนทับไฟล์ของเรา** เพราะชื่อไฟล์ตรงกับของ shadcn ต้องตรวจ diff ทุกครั้งตามคำเตือนใน `DESIGN.md`
16. **ชื่อ `Field` ชนกับ `function Field` ที่มีอยู่แล้ว 25 ไฟล์** ใน 2A ไม่มีปัญหาเพราะไฟล์เหล่านั้นไม่ได้ import ตัวใหม่ แต่ 2C ต้องลบฟังก์ชันของไฟล์ก่อน import · ช่องที่ type มาจากข้อมูล (custom field ใน `asset-form`) ต้องแปลงเป็น `InputType` ก่อน

### 6.11 เอกสาร

- `DESIGN.md:101-106` (YAML `components.input`): `backgroundColor` → `{colors.surface}` · `rounded` → `{rounded.control}` · `height: "40px"` คงไว้
- `DESIGN.md:176`: เลิกพูดว่า Soft System Background เป็นพื้นของช่องกรอก (ช่องเป็นสีขาวแล้ว ส่วน background ใช้กับช่องที่ disabled หรือ read-only) · บรรทัดนี้อยู่ในช่วง `:173-181` ที่ข้อ 3.10 แก้อยู่แล้ว ให้แก้ในงานเดียวกัน
- `DESIGN.md:306-311` (§Inputs / Fields) เป็นของส่วนนี้ (ข้อ 3.10 แตะแค่ :308) ให้เขียนใหม่ทั้ง 5 เรื่อง
  - มุม 6px พื้นขาว และขนาด `md`/`lg`/`xl`
  - สูตรโฟกัสและ error
  - หน้าตา disabled และ read-only
  - รายชื่อ primitive
  - แก้ "About 384 hand-written field class lists" เป็น "316 fields in 70 files, 282 still `border-border`"
- `docs/14_UI_UX_DESIGN_SYSTEM.md`: เพิ่มส่วนช่องกรอกให้ตรงกับ DESIGN.md
- wiki `AssetSystem` (หน้า `ams-` ที่พูดเรื่องหน้าตา) + `ams-log.md` และรัน `wiki-lint`
