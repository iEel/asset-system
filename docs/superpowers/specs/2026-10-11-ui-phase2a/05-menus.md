> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2a-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** โดยเฉพาะ I15 (มุมโค้งตามต้นแบบจริง: ปุ่ม md/lg และช่องกรอก 8px · ปุ่ม sm, segmented, chip และป้ายสถานะ 6px · เมนู popover toast 12px) และ I14 (สีจางบน primary-soft อนุญาต)

## 5. เมนู popover และ command

หัวข้อนี้เป็นเจ้าของ `src/components/ui/dropdown-menu.tsx` · `popover.tsx` · `command.tsx` · `kbd.tsx` (ไฟล์ใหม่) และส่วนรายการของ `layout/global-search.tsx` กับ `ui/searchable-select.tsx` (critic §4) รวมถึงเมนูภาษาและเมนูผู้ใช้ใน `layout/topbar.tsx` (ตัดธงอีโมจิ และเปลี่ยน aria-label ภาษาอังกฤษไปใช้ messages)

หน้าตาตาม `base.css:420-456` (`.menu` `.menu-item` `.menu-search` `.cbox` `.cmdk-foot`) และ `:202` (`.kbd`) · ค่าสีใช้ token จริงใน `globals.css` ไม่ใช้ `:root` ของ base.css

ต้องรอหัวข้ออื่นก่อน: §1 token (`text-meta` 13/20 · `text-faint-foreground` #56677F · `rounded-control` 6px · `--border-soft` #E7EBF1) และ §ช่องกรอก (`shadow-field-focus`) · probe compile กับ Tailwind 4.2.4 ของ repo (2026-10-11) ยืนยันแล้วว่าตอนนี้ 4 class นี้ยังไม่สร้าง CSS ถ้าเมนูลงก่อน token จะไม่มีสีและไม่มีมุมโค้ง โดย build ไม่แจ้ง error

### 5.1 ของที่มีอยู่ตอนนี้ (grep ใหม่ 2026-10-11 ที่ `081d538`)

| ชิ้น | จำนวน |
|---|---|
| `<DropdownMenu` | 7 เมนูใน 6 ไฟล์ (ตรงกับ actions.md) |
| `<DropdownMenuItem` | 14 แท็ก (detail 4 · export 2 · row 5 · topbar 3) |
| `RadioItem` / `CheckboxItem` | 2 จุดใน 2 ไฟล์ (render 4 + 7 แถว) / 1 จุด (render 10 แถว) |
| `Label` / `Separator` | 5 จุดใน 4 ไฟล์ / 5 จุดใน 4 ไฟล์ |
| `Shortcut` `Sub*` `Group` `Portal` | 0 จุด |
| `<PopoverContent` | 4 จุดใน 4 ไฟล์ (help popover · global search · กระดิ่งแจ้งเตือน · SearchableSelect) · `AssetStateHelpPopover` ใช้ 5 จุดใน 4 ไฟล์ |
| `command.tsx` | มีผู้ใช้ไฟล์เดียวคือ `SearchableSelect` (29 จุดใน 13 ไฟล์) · `CommandDialog` `CommandGroup` `CommandSeparator` `CommandShortcut` ใช้ 0 จุด |

| เมนู | ไฟล์:บรรทัด | ความกว้างตอนนี้ | override ของ Label |
|---|---|---|---|
| ⋯ แถวทะเบียน | `assets/asset-register-row-actions.tsx:89-153` | `w-64` | `:102` |
| ⋯ หน้ารายละเอียด | `assets/asset-detail-action-menu.tsx:53-95` | `w-72` | — |
| เลือกคอลัมน์ | `assets/asset-register-column-picker.tsx:56-92` | `w-60` | `:67` `:76` |
| ส่งออก | `assets/asset-register-export-menu.tsx:11-35` | `w-56` | — |
| เรียงลำดับ | `assets/asset-register-sort-menu.tsx:33-58` | `w-56` | `:46` |
| ภาษา | `layout/topbar.tsx:234-252` | `w-40` | — |
| ผู้ใช้ | `layout/topbar.tsx:257-281` | `w-[calc(100vw-2rem)] max-w-[16rem]` | `:271` `font-normal` (คนละเรื่อง ใช้จัดหัวชื่อผู้ใช้) |

ปัญหาที่ต้องแก้ในหัวข้อนี้:
- รายการที่ปิดไว้ใช้ `data-[disabled]:opacity-50` (`dropdown-menu.tsx:76,94,130` และ `command.tsx:72,76,150`) ทำให้เหตุผลใต้ชื่อรายการในเมนูแถว (`row-actions:108-114`) เหลือ contrast 2.43:1 และชื่อรายการ 3.32:1 ซึ่งไม่ผ่าน AA
- ใช้คีย์บอร์ดไปถึงเหตุผลนี้ไม่ได้ เพราะ Radix ข้ามรายการที่ `disabled` (`node_modules/@radix-ui/react-menu/dist/index.mjs:470` `focusable: !disabled`, react-menu 2.1.25)
- tint `/NN` 2 จุด: `dropdown-menu.tsx:76` `focus:bg-destructive/10` · `global-search.tsx:202` `hover:bg-accent/60`
- แผงลอยใช้ `zoom-in-95` และยังขยับเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว (`dropdown-menu.tsx:44,232` · `popover.tsx:32`)
- เมนูภาษาใช้ธงอีโมจิ `🇹🇭` `🇺🇸` (`topbar.tsx:246,249`) ซึ่ง DIRECTION.md:23 ห้าม · บอกภาษาที่เลือกด้วยสีอย่างเดียว (`font-medium text-primary`) · aria-label เป็นภาษาอังกฤษ 4 จุด (`topbar.tsx:130,139-140,238,261`) และคู่ของมัน `sidebar.tsx:246` "Close menu"

### 5.2 แผงเมนู (`DropdownMenuContent`, `DropdownMenuSubContent`)

```
z-50 grid max-h-(--radix-dropdown-menu-content-available-height) min-w-60 origin-(--radix-dropdown-menu-content-transform-origin)
gap-px overflow-x-hidden overflow-y-auto rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-overlay outline-none
+ ชุดการเคลื่อนไหว (ข้อ 5.6)
```

| ค่า | เดิม | ใหม่ (ต้นแบบ `.menu`) |
|---|---|---|
| มุม | `rounded-md` 8 | `rounded-lg` 12 |
| padding | `p-1` 4 | `p-1.5` 6 |
| กว้างต่ำสุด | `min-w-[8rem]` | `min-w-60` 240 ทุกเมนู |
| ระยะระหว่างรายการ | 0 | `grid gap-px` |
| ขอบ / เงา | `border` (สีจาก base rule) · `shadow-overlay` | คงเดิม |

`min-width` ชนะ `width` จึงลบความกว้างที่แคบกว่าในผู้เรียกใช้ (ข้อ 5.10)

### 5.3 รายการ (`DropdownMenuItem`)

```
relative flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-control px-2.5 py-1.5 text-sm text-foreground transition-colors md:min-h-9
focus:bg-primary-soft focus:duration-0 focus-visible:-outline-offset-2 active:bg-muted
data-[disabled]:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:bg-transparent aria-disabled:text-faint-foreground aria-disabled:*:[svg]:text-faint-foreground!
data-[inset]:pl-9
data-[variant=destructive]:not-aria-disabled:text-danger data-[variant=destructive]:not-aria-disabled:focus:bg-danger-soft data-[variant=destructive]:not-aria-disabled:*:[svg]:text-danger!
[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground
```

| สถานะ | หน้าตา | contrast |
|---|---|---|
| ปกติ | ตัวอักษร `foreground` 14/22 · ไอคอน 16px `muted-foreground` | 16.92 · 8.32 |
| ชี้หรือเลือกด้วยปุ่มลูกศร (Radix ใส่ focus ให้รายการ) | `bg-primary-soft` สีขึ้นทันที และจางออกใน 150ms | ตัวอักษร 14.63 |
| กดค้าง | `bg-muted` (neutral-soft) | 14.51 |
| โฟกัสจากคีย์บอร์ด | เส้นโฟกัส 2px สี `ring` ขอบใน (base rule + `-outline-offset-2`) · ลบ `outline-hidden` ของเดิม | ring บน primary-soft 3.82 · บน danger-soft 3.93 |
| ใช้ไม่ได้ (`aria-disabled`) | `faint-foreground` · ไม่มีพื้น · cursor not-allowed · ไม่ใช้ opacity | 5.77 บนขาว |
| ลบหรือยกเลิก (`variant="destructive"`) | ตัวอักษรและไอคอน `danger` · ชี้แล้วพื้นเป็น `danger-soft` (แทน `destructive/10`) | 6.54 · 5.83 |

- ความสูง 36px บนจอ ≥ md และ 44px เมื่อจอแคบกว่า md (D4 ใช้ breakpoint `md` แทน `sm` เดิม)
- ลำดับ CSS ตรวจด้วย probe แล้ว: `aria-*` ออกหลัง `focus:`/`active:` แต่ก่อน `data-[…]` จึงต้องใส่ `not-aria-disabled:` ที่กฎสีของ destructive ไม่งั้นรายการลบที่ปิดอยู่ (`disabled={deleting}`) จะยังแดง
- เขียนกฎ destructive (บรรทัดที่ 5 ข้างบน) เป็น string แยก แล้วรวมด้วย `cn(base, destructive, className)` เพราะ guard "faint ไม่อยู่บนพื้นสี" ของ §1 ตรวจทีละ string และจะจับ `focus:bg-danger-soft` คู่กับ `aria-disabled:text-faint-foreground` แม้สองกฎนี้ไม่เคยทำงานพร้อมกัน

### 5.4 รายการที่ใช้ไม่ได้พร้อมเหตุผล

Radix ทำงานแบบนี้ (`react-menu/dist/index.mjs`):
- `:470` ข้ามรายการที่ `disabled` ทั้งตอนกดลูกศรและตอนพิมพ์ค้นหา
- `:475-477` ใส่ `aria-disabled` ก่อน แล้วค่อยกระจาย `...itemProps` ทับ ค่าที่ผู้เรียกส่งมาจึงชนะ
- `:421` ต่อ `onClick` ของผู้เรียกไว้ก่อน `handleSelect` ถ้า `onClick` เรียก `preventDefault()` ก็จะไม่เรียก `onSelect` และเมนูไม่ปิด ส่วน Enter, Space และ pointer-up ล้วนเรียก `click()` จึงผ่านทางเดียวกันนี้

API ใหม่:

```ts
type DropdownMenuItemProps = React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
} & ({ unavailable?: false } | { unavailable: true; asChild?: never; onSelect?: never })

function DropdownMenuItemText(props: React.ComponentProps<"span">)        // "grid min-w-0 flex-1" (.stack)
function DropdownMenuItemDescription(props: React.ComponentProps<"span">) // "text-meta text-faint-foreground"
```

- `unavailable` ใส่ `aria-disabled="true"` และ `data-unavailable` แต่ไม่ส่ง `disabled` ให้ Radix · มี `onClick` ที่เรียก `event.preventDefault()` · รายการจึงยังรับโฟกัส ลูกศรไปถึง พิมพ์ค้นหาเจอ และโปรแกรมอ่านหน้าจออ่านชื่อพร้อมเหตุผล ("ส่งมอบ ต้องรับคืนก่อน…, ใช้ไม่ได้")
- ห้ามใช้ `unavailable` คู่กับ `asChild` (บังคับด้วย type) เพราะ Slot เรียก `onClick` ของลูก (`<Link>`) ก่อน ลิงก์จะเปลี่ยนหน้าไปก่อนที่ `preventDefault` จะทำงาน
- `disabled` ของ Radix ยังใช้กับสถานะชั่วคราวที่เห็นเหตุผลอยู่แล้ว ได้แก่ ระหว่างลบ (`row-actions:146`) และคอลัมน์สุดท้ายที่ซ่อนไม่ได้ (`column-picker:83`) หน้าตาเหมือนรายการที่ใช้ไม่ได้ เพราะ Radix ก็ใส่ `aria-disabled` ให้เช่นกัน
- ไอคอนอยู่กึ่งกลางแนวตั้งตามต้นแบบ (`.menu-item` `align-items:center`) แทน `items-start` + `mt-0.5` เดิม

### 5.5 ส่วนประกอบอื่น

| ส่วน | class / พฤติกรรม |
|---|---|
| `DropdownMenuLabel` | `px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground data-[inset]:pl-9` (12/16 · หน้าไทย 12/18) · ลบ override ในผู้เรียกใช้ 4 จุด |
| `DropdownMenuSeparator` | `mx-1 my-[5px] h-px bg-border-soft` (line-soft #E7EBF1 · เดิม `-mx-1 my-1 bg-border`) |
| `DropdownMenuShortcut` (ใช้แทน `.trail`) | `ml-auto pl-3 whitespace-nowrap text-meta text-faint-foreground` · เลิกใช้ `tracking-widest` · ไม่ตั้งชื่อใหม่ |
| `DropdownMenuCheckboxItem` (`.cbox`) | ใช้ class พื้นฐานเดียวกับรายการ ไม่มี `pl-8` และไม่มีตัวบอกแบบ absolute · กล่อง 16px อยู่หน้าข้อความ `size-4 rounded-sm border-[1.5px] border-input bg-surface` · ติ๊กแล้วเป็น `border-primary bg-primary` มีเครื่องหมายถูก `size-3 strokeWidth={3} text-primary-foreground` · ติ๊กอยู่และปิดไว้เป็น `border-border bg-muted` เครื่องหมายถูกเป็น `text-muted-foreground` · `data-[state=checked]:font-medium` · สีกล่องอ่านจาก prop `checked`/`disabled` |
| `DropdownMenuRadioItem` (`.check`) | ไม่มีจุดนำหน้า · มี `CheckIcon size-4 text-primary` ต่อท้าย (`ml-auto`) ภายใน `ItemIndicator` · `data-[state=checked]:font-medium` |
| `DropdownMenuSubTrigger` / `SubContent` | ใช้ class ของรายการ/แผง + `data-[state=open]:bg-primary-soft` (ยังไม่มีผู้ใช้ แต่คงไว้ให้ไฟล์ยังเทียบกับ shadcn ได้) |

contrast: ขอบกล่อง `input` บนขาว 3.47 · เครื่องหมายถูกขาวบน `primary` 8.07 · เหตุผลสีจางบน `primary-soft` 4.99 (อยู่ในชุดพื้นกลาง ≥4.95 ของ D2)

### 5.6 การเคลื่อนไหว (แผงเมนู แผงย่อย popover ใช้ชุดเดียวกัน)

```
duration-160 ease-out data-[state=open]:animate-in data-[state=open]:fade-in-0
data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1
data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100 motion-reduce:animate-none!
```

- ตอนเปิด: จางเข้าพร้อมเลื่อน 4px ใน 160ms ด้วย `ease-out` (`cubic-bezier(0,0,.2,1)` ค่าเดียวกับ `--ease-out` ของต้นแบบ) · `duration-*` ตั้ง `--tw-duration` ให้ `animate-in` ของ tw-animate-css 1.4.0 ซึ่งค่าตั้งต้นคือ 150ms `ease`
- ตอนปิด: จางออก 100ms · ไม่มี zoom ทั้งตอนเปิดและปิด
- ลดการเคลื่อนไหว: `motion-reduce:animate-none!` แบบเดียวกับ dialog/sheet ในเฟส 1 (§15 #8)

### 5.7 Popover

`rounded-md` → `rounded-lg` · ใช้ชุดการเคลื่อนไหวข้อ 5.6 · `w-72 p-4` คงเดิม · ผู้ใช้ 4 จุดไม่ต้องแก้ เพราะเนื้อในของ notification และ global search เป็น `p-0` ไม่มีพื้นที่มุม ส่วน `Command` มุมเท่ากัน (ข้อ 5.8)

### 5.8 Command (`command.tsx`) และรายการของ SearchableSelect

| ส่วน | ใหม่ |
|---|---|
| `Command` | `rounded-md` → `rounded-lg` ให้เท่ากับ popover (ถ้ามุมไม่เท่า พื้นขาวของ Command จะโผล่เลยขอบโค้ง) |
| `CommandInput` wrapper (`.menu-search`) | `mx-1.5 mt-1.5 mb-1 flex h-11 items-center gap-2 rounded-control border border-border bg-background px-2.5 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus md:h-9` · เดิมเป็น `border-b` เต็มแถว |
| ไอคอนค้นหา / input | `size-4 text-faint-foreground` (เดิม `opacity-50`) / `h-full w-full min-w-0 bg-transparent text-sm outline-hidden placeholder:text-faint-foreground` (เดิม `h-10 py-3 rounded-md disabled:opacity-50`) |
| `CommandList` | `max-h-[300px] scroll-py-1.5 overflow-x-hidden overflow-y-auto px-1.5 pb-1.5` |
| `CommandItem` | class พื้นฐานเดียวกับรายการเมนู แต่ไฮไลต์ด้วย `data-[selected=true]:bg-primary-soft` · ปิดไว้ใช้ `data-[disabled=true]:text-faint-foreground` (ไม่ใช้ opacity) · cmdk ข้ามรายการที่ปิดอยู่เอง (selector `[cmdk-item=""]:not([aria-disabled="true"])`) |
| `CommandEmpty` | `px-2.5 py-4 text-center text-meta text-faint-foreground` |
| `CommandGroup` heading / `CommandSeparator` / `CommandShortcut` | หน้าตาเดียวกับ `DropdownMenuLabel` / `Separator` / `Shortcut` |
| `CommandDialog` | ลบ (0 ผู้ใช้ · ชื่อและคำอธิบายตั้งต้นเป็นอังกฤษ "Command Palette") |

`searchable-select.tsx:87-95` แก้เฉพาะส่วนรายการ: ย้าย `Check` ไปต่อท้าย (`ml-auto size-4 text-primary`) และแสดงเฉพาะตัวที่เลือกอยู่ (เลิก `text-transparent`) · ตัวที่เลือกเป็น `font-medium` · ปุ่มเปิดและ label ใช้ของหัวข้อช่องกรอก

### 5.9 `Kbd` และรายการของ global search

`src/components/ui/kbd.tsx` (ไม่มี `"use client"` ใช้ใน server component ได้):

```ts
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">)
// "inline-flex h-5 items-center rounded-sm border border-border bg-surface px-1.5 font-sans text-xs leading-4 font-medium whitespace-nowrap text-muted-foreground"
```

`font-sans` จำเป็น เพราะ preflight ให้ `kbd` ใช้ฟอนต์ mono

`global-search.tsx` แก้เฉพาะแผงผลลัพธ์ `:182-234` (ช่องค้นหา `:127-161` เป็นของหัวข้อช่องกรอก · กลุ่มผลลัพธ์และ Ctrl K อยู่เฟส 3):

| จุด | เดิม | ใหม่ |
|---|---|---|
| `ul` `:187` | `max-h-[26rem] py-1` | `grid max-h-100 gap-px overflow-y-auto p-1.5` (`.cmdk-list`) |
| `li` `:201-202` | `gap-3 px-4 py-3` · เลือก `bg-accent` · ชี้ `hover:bg-accent/60` | `items-start gap-2.5 rounded-control px-2.5 py-1.5` · เลือก `bg-primary-soft` · ลบ hover เพราะ `onMouseEnter` ตั้งตัวเลือกอยู่แล้ว |
| ไอคอน `:205` | กล่อง `h-9 w-9 bg-primary-soft text-primary` | ไอคอนเปล่า `mt-[3px] size-4 text-muted-foreground` (กล่องสีเดิมจะกลืนกับพื้นแถวที่เลือก) |
| ชนิดผลลัพธ์ `:211` | ป้ายกลม `rounded-full bg-muted` | ข้อความท้ายบรรทัด `ml-auto shrink-0 text-meta text-faint-foreground` · `StatusBadge` คงไว้ (test ตรึง) |
| บรรทัดรอง / metadata | `text-sm text-foreground` / `text-xs text-muted-foreground` | `text-meta text-muted-foreground` / `text-meta text-faint-foreground` |
| ท้ายแผง `:233` | `px-4 py-2 text-xs` + `keyboardHint` ข้อความเดียว | `.cmdk-foot`: `flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border bg-background px-3.5 py-2 text-meta text-muted-foreground` · 3 กลุ่ม `<Kbd>↑↓</Kbd> เลือก` · `<Kbd>Enter</Kbd> เปิด` · `<Kbd>Esc</Kbd> ปิด` (Radix popover ปิดด้วย Esc อยู่แล้ว) |

### 5.10 เมนูในแถบบน และผู้เรียกใช้ที่ต้องแก้

**เมนูภาษา (`topbar.tsx:234-252`)**
- เปลี่ยนเป็น `<DropdownMenuRadioGroup value={locale} onValueChange={…}>` ที่มี `RadioItem` 2 ตัว ถ้าเลือกภาษาเดิมให้ไม่ทำอะไร (Radix เรียก `onValueChange` ทุกครั้งที่เลือก)
- ชื่อภาษาเขียนเป็นภาษาของตัวเอง (endonym) และใส่ `lang`: `<span lang="th">ภาษาไทย</span>` · `<span lang="en">English</span>` เก็บเป็นค่าคงที่ในโค้ดตาม `routing.locales` ไม่ต้องผ่าน messages เพราะค่าเหมือนกันทั้ง th และ en
- ลบธงอีโมจิ และลบ `w-40`

**aria-label ภาษาอังกฤษ → messages** (แก้ผ่าน `node scripts/messages-edit.mjs`, namespace `nav`)

| key | th | en | ใช้ที่ |
|---|---|---|---|
| `nav.openMenu` | เปิดเมนู | Open menu | `topbar.tsx:130` |
| `nav.toggleSidebar` | ย่อหรือขยายเมนูข้าง | Toggle sidebar | `topbar.tsx:139-140` (`title` และ `aria-label`) |
| `nav.languageMenu` | เปลี่ยนภาษา ({code}) | Change language ({code}) | `topbar.tsx:238` · `code` = "TH"/"EN" ซึ่งแสดงบนปุ่ม (ทำให้ผ่าน WCAG 2.5.3 ชื่อที่อ่านมีคำที่เห็นบนปุ่ม) |
| `nav.userMenu` | เมนูผู้ใช้: {name} | User menu: {name} | `topbar.tsx:261` · `name` = `userDisplayLabel` |
| `nav.closeMenu` | ปิดเมนู | Close menu | `sidebar.tsx:246` (คู่ของ `openMenu`) |
| `globalSearch.keyboardSelect` / `keyboardOpen` / `keyboardClose` | เลือก / เปิด / ปิด | select / open / close | ท้ายแผง global search |
| ลบ `globalSearch.keyboardHint` | | | ถูกแทนด้วย 3 key ข้างบน |

placeholder `{code}` และ `{name}` ตรงกันทั้งสองภาษา (`messages-parity.test.ts`) · คำไทยทั้งหมดไม่ติดคำเลิกใช้ของ `thai-glossary.test.ts`

**หัวเมนูผู้ใช้ `topbar.tsx:271-274`** `DropdownMenuLabel className="py-1.5 text-sm font-normal text-foreground"` · ชื่อ `block truncate font-medium` · บรรทัดรอง `block truncate text-meta text-faint-foreground` · ปุ่มออกจากระบบยังเป็น `destructive`

**ผู้เรียกใช้อื่น**

| ไฟล์:บรรทัด | แก้ |
|---|---|
| `asset-register-row-actions.tsx:102` | ลบ `className` ของ Label |
| `asset-register-row-actions.tsx:106-115` | `disabled className="items-start"` + span ซ้อน → `unavailable` + `<DropdownMenuItemText>{title}<DropdownMenuItemDescription>{reasonOf(transaction)}</…></…>` · ส่วน sheet มือถือ `:194-200` ไม่แก้ (ไปกับ RowActions ใน P2-B) |
| `asset-register-column-picker.tsx:66-67,76` | ลบ `w-60` และ override ของ Label 2 จุด |
| `asset-register-sort-menu.tsx:45-46` | ลบ `w-56` และ override ของ Label |
| `asset-register-export-menu.tsx:21` | ลบ `w-56` |
| `asset-detail-action-menu.tsx` | ไม่แก้ (คง `w-72`) |

ปุ่มที่เปิดเมนูเหล่านี้ (`h-9` ที่เขียน class เอง และปุ่มแถบบน) ไม่อยู่ในหัวข้อนี้ จะย้ายไปใช้ Button ในรอบ P2-D

### 5.11 Test

ไม่มี test เดิมที่ต้องแก้ ข้อที่ต้องยังผ่านหลังแก้:
- `dropdown-menus-ui.test.ts:7-60` ได้แก่ `modal={false}` · `returnFocusRef` 3 ครั้ง · `ref={triggerRef}` 2 ครั้ง · `variant="destructive"` · `<DropdownMenu\b` ≥2 ใน topbar (`<DropdownMenuRadioGroup` ไม่ถูกนับ เพราะไม่มี word boundary) · `<Popover open={notificationOpen}`
- `asset-register-table-ui.test.ts:10-27, 51-76` ได้แก่ `reasonLabelKeys[transaction.reason]` · `min-h-11` ของปุ่มเรียงลำดับ · `disabled={checked && visibleColumns.size === 1}` · `onSelect={(event) => event.preventDefault()}`
- `global-search-ui.test.ts:5-15` ได้แก่ `role="listbox"` · `role="option"` · `aria-activedescendant=` · `<StatusBadge` · ห้าม `style={{`
- `searchable-select-accessibility.test.ts:5-13` · `asset-status-help-ui.test.ts:11-26` · `visual-foundation-guards.test.ts:63-67` (`shadow-overlay` ยังอยู่)

แก้หรือเพิ่ม:

| ไฟล์ | เพิ่ม |
|---|---|
| `tests/menu-primitives-ui.test.ts` (ใหม่) | `dropdown-menu.tsx` ต้องมี `rounded-lg` · `min-w-60` · `p-1.5` · `focus:bg-primary-soft` · `data-[variant=destructive]:not-aria-disabled:focus:bg-danger-soft` · `rounded-control` · `min-h-11` คู่กับ `md:min-h-9` · `focus-visible:-outline-offset-2` · export `DropdownMenuItemText`/`DropdownMenuItemDescription` · `unavailable` ตั้ง `aria-disabled` และเรียก `preventDefault` · ห้ามมี `opacity-50` · `zoom-(in\|out)` · `sm:min-h-9` · `(bg\|text\|border)-[a-z-]+/\d+` · `command.tsx`: `data-[selected=true]:bg-primary-soft` · ไม่มี `opacity-50` · ไม่มี `CommandDialog` · `kbd.tsx`: ไม่มี `"use client"` และมี `font-sans` · `globals.css` มี `--radius-control`, `--text-meta`, `--color-faint-foreground` และ `--color-border-soft` (กันกรณีเมนูลงก่อน token) |
| `dropdown-menus-ui.test.ts:27-35` | row-actions ใช้ `unavailable` + `DropdownMenuItemDescription` · ไม่มี `disabled className="items-start"` |
| `dropdown-menus-ui.test.ts:37-41` | `<DropdownMenuRadioGroup value={locale}` · `lang="th"` · `lang="en"` · ไม่มี `(aria-label\|title)="[A-Z]` ใน topbar · key `nav.*` ทั้ง 5 มีใน th/en |
| `global-search-ui.test.ts` | ไม่มี `bg-accent/60` · ตัวเลือกใช้ `bg-primary-soft` · ท้ายแผงใช้ `<Kbd>` |
| `visual-foundation-guards.test.ts:63-67` | `popover` และ `dropdown-menu` ต้องตรงกับ `/shadow-overlay[^"]*motion-reduce:animate-none!/` แบบเดียวกับ dialog |
| `visual-foundation-guards.test.ts` (test ใหม่) | ห้ามอีโมจิใน `src/**/*.{ts,tsx}` และ `messages/*.json` ด้วย `/\p{Emoji_Presentation}\|️/u` · ตอนนี้พบ 2 จุด (`topbar.tsx:246,249`) · ไม่จับ © ® ✓ ↑ ↓ · › ⋯ ที่ใช้อยู่ |
| `design-tokens-contrast.test.ts:87-94` | `ring` ≥3:1 บน `primary-soft` และ `danger-soft` (เส้นโฟกัสขอบใน) · `input` ≥3:1 บน `popover` (ขอบกล่อง) · `faint-foreground` AA บน `popover` และ `primary-soft` ถ้า §1 ยังไม่ได้ใส่ |

### 5.12 ตรวจบนแอป dev และเอกสาร

- กด Tab แล้วใช้ลูกศรเดินในเมนู ⋯ ของทะเบียน: ลูกศรต้องไปถึงรายการที่ใช้ไม่ได้ NVDA อ่านเหตุผลและบอกว่าใช้ไม่ได้ กด Enter แล้วเมนูไม่ปิด เมาส์ชี้แล้วไม่มีพื้นและไม่มีเส้นโฟกัส
- เมนูภาษา: NVDA อ่านว่าเลือกอยู่ (`menuitemradio`) และอ่านชื่อภาษาอังกฤษด้วยเสียงอังกฤษ · เปิด Windows ลดการเคลื่อนไหวแล้วต้องไม่เห็นการเลื่อน · forced colors ต้องเห็นเส้นโฟกัส
- ตรวจที่ 1440 และ 375 ว่าข้อความไทยในรายการไม่ถูกตัดหัวหรือหาง และที่ 700px รายการสูง 44
- `DESIGN.md` §Focus (`:279` เพิ่มบรรทัดเส้นโฟกัสขอบในของรายการเมนู) และ §Dialogs, Menus (`:291-296` เพิ่มหน้าตาแผง รายการที่ใช้ไม่ได้พร้อมเหตุผล ห้ามอีโมจิ) · `docs/99_CHANGELOG.md` · wiki `AssetSystem` + `ams-log.md`

### 5.13 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | พื้นของรายการที่ชี้หรือเลือก | `primary-soft` ไม่ใช้ `accent` | ต้นแบบ `.menu-item:hover` · contrast เท่ากัน (1.16 กับ 1.15 เทียบพื้นขาว) |
| 2 | line-height ของรายการ | `text-sm` 22 ไม่ใช้ 20 ตามต้นแบบ | ไทยต้อง ≥1.44 เท่า (14 × 1.44 = 20.2) · ใช้ `min-h-9` ล็อกความสูง 36 ไว้แล้ว |
| 3 | ความกว้างต่ำสุด 240 | ทุกเมนู (ตาม mockup.md §6) ไม่ใช่เฉพาะเมนูคำสั่ง (actions §5.2) | ต้นแบบ `.menu` กำหนดค่าเดียว · เมนูภาษา/ส่งออก/เรียงลำดับกว้างขึ้นเป็น 240 |
| 4 | รายการที่ใช้ไม่ได้ | prop `unavailable` (aria-disabled + preventDefault) · `disabled` ของ Radix ใช้เฉพาะสถานะชั่วคราว | ต้นแบบ `role="menuitem" aria-disabled="true"` ที่รับโฟกัสได้ · Radix ข้ามรายการ `disabled` |
| 5 | บรรทัดเหตุผล | ใช้ส่วนประกอบ `ItemText` + `ItemDescription` ไม่เพิ่ม prop `description` | `asChild` (Slot) รับลูกได้ตัวเดียว |
| 6 | เส้นโฟกัสของรายการ | ใช้ base rule + `-outline-offset-2` และลบ `outline-hidden` | ต้นแบบ `.menu-item:focus-visible{outline-offset:-2px}` · ตอนนี้เห็นแค่สีพื้น 1.15:1 |
| 7 | กดค้าง | `active:bg-muted` | ต้นแบบ neutral-soft = `--muted` |
| 8 | สีตอนชี้ | ขึ้นทันที จางออก 150ms (`transition-colors focus:duration-0`) | ต้นแบบ base.css:497-498 |
| 9 | cursor | `pointer` / ใช้ไม่ได้ `not-allowed` | ต้นแบบ (shadcn ใช้ `default`) |
| 10 | checkbox | กล่อง `.cbox` อยู่หน้า เครื่องหมายถูก 12px (`size-3`) แทน 11px | ไม่ต้องใช้ค่าแบบ arbitrary ต่างกัน 1px |
| 11 | `.cbox.lock` "แสดงเสมอ" | ยังไม่ทำ | ยังไม่มีคอลัมน์ที่ล็อกไว้ · ไปกับตัวเลือกคอลัมน์เฟส 3 |
| 12 | checkbox ติ๊กอยู่และปิดไว้ (คอลัมน์สุดท้าย) | กล่อง `border-border bg-muted` ยังเป็น Radix `disabled` | test ตรึง `disabled={checked && …}` · ต้นแบบไม่ได้แสดงสถานะนี้ |
| 13 | radio | เครื่องหมายถูกต่อท้าย สี `primary` + `font-medium` ไม่ใช้จุดนำหน้า | ต้นแบบ `.check` |
| 14 | เส้นคั่น | `bg-border-soft` (#E7EBF1) `mx-1 my-[5px]` | ต้นแบบ `.menu-sep` line-soft · ต้องรอ token จาก §1 |
| 15 | หัวกลุ่มในเมนู | 12px `font-medium` `muted-foreground` · ลบ override ในผู้เรียกใช้ 4 จุด | ต้นแบบ `.menu-label` |
| 16 | `.trail` | ปรับหน้าตา `DropdownMenuShortcut` ไม่ตั้งชื่อ `DropdownMenuTrail` ใหม่ | 0 ผู้ใช้ · ไม่เพิ่มชื่อซ้ำซ้อน |
| 17 | ลดการเคลื่อนไหว | `motion-reduce:animate-none!` ไม่ใช้จางเข้า 80ms ตามต้นแบบ | ให้ตรงกับ dialog/sheet ที่ส่งไปแล้วในเฟส 1 และ guard regex เดียวใช้กับทุกแผงลอย · ถ้าจะจางเข้า 80ms ต้องใส่ `!` ทับ `data-[side]` 4 ตัวต่อ primitive |
| 18 | ตอนปิด | จางออก 100ms ไม่ zoom | ต้นแบบไม่ได้กำหนด · ใช้หลักเดียวกับ sheet ว่าปิดเร็วกว่าเปิด (250/200) |
| 19 | `scrollbar-gutter: stable` | ไม่ใช้ | เครื่องในบริษัทเป็น Windows ซึ่งแถบเลื่อน 10px จองที่ตลอด ขอบขวาจะเป็น 16 ส่วนขอบซ้าย 6 แม้เมนูไม่ต้องเลื่อน |
| 20 | ขนาดสำหรับนิ้ว | รายการเมนู รายการ cmdk และช่องค้นหาในเมนูสูง 44 เมื่อจอแคบกว่า md | D4 |
| 21 | เมนูบนมือถือเป็น bottom sheet | ไม่ทำ `ResponsiveMenu` กลาง · sheet ของแถวทะเบียนไปกับ RowActions (P2-B) | มีผู้ใช้จุดเดียว |
| 22 | มุมของ popover | 12 (`rounded-lg`) เท่าเมนู · padding `p-4` คงเดิม | แผงลอยทุกแบบในต้นแบบใช้ 12 (`.menu`, `.cmdk`) |
| 23 | `CommandDialog` | ลบ | 0 ผู้ใช้ และข้อความตั้งต้นเป็นอังกฤษ · Ctrl K ในเฟส 3 ทำใหม่โดยบังคับให้ส่งชื่อเป็นข้อความไทย |
| 24 | ส่วน `Sub*` | คงไว้และปรับหน้าตาให้ตรงกัน | ไม่มีค่าใช้จ่าย · ไฟล์ยังเทียบกับ shadcn ได้ |
| 25 | `Kbd` | ทำตอนนี้ และใช้ที่ท้ายแผง global search เป็นที่แรก | ต้นแบบ `.cmdk-foot` · ไม่เป็นโค้ดที่ไม่มีใครใช้ · ใช้ 3 key ไม่ต้องใช้ `t.rich` (ยังไม่มีใน repo) |
| 26 | `.menu-foot` | ยังไม่ทำ (เก็บ class `flex items-center justify-between gap-2 border-t border-border mt-[5px] px-1.5 pt-2 pb-0.5` ไว้ให้เฟส 3) | mockup.md บอกว่าเป็นเฟส 3 · ยังไม่มีผู้ใช้ |
| 27 | รายการ global search | `primary-soft` · ไอคอนเปล่า · ชนิดผลลัพธ์เป็นข้อความท้ายบรรทัด | critic §4 ให้รายการเป็นของหัวข้อเมนู · กล่องไอคอนสี primary-soft จะกลืนกับพื้นแถวที่เลือก |
| 28 | เครื่องหมายถูกใน SearchableSelect | ย้ายไปท้าย + `font-medium` · ไม่มีบรรทัดรหัส | ต้นแบบ `.check` · `SearchableSelectOption` มีแค่ `id/label/disabled` |
| 29 | ชื่อภาษาในเมนู | endonym พร้อม `lang` เก็บในโค้ด | ค่าเหมือนกันทุกภาษา · ทำให้โปรแกรมอ่านหน้าจอใช้เสียงถูกภาษา |
| 30 | aria-label ภาษาอังกฤษ | แก้ทั้ง 4 จุดในแถบบน + `sidebar.tsx:246` · ชื่อที่อ่านต้องมีข้อความที่เห็นบนปุ่ม | อยู่ในไฟล์ที่แก้อยู่แล้ว · WCAG 2.5.3 |
| 31 | ปุ่มออกจากระบบ | ยังเป็น `destructive` | ไม่มี map ไหนยกเรื่องนี้ขึ้นมา · ไม่ขยายขอบเขต |
| 32 | เนื้อในของ popover แจ้งเตือน | ไม่แก้ในหัวข้อนี้ | ป้ายนับกลม (G1) และรายการอยู่ใน sweep P2-D |
| 33 | สีจางบนพื้น `primary-soft` ของแถวที่ชี้ | ใช้ได้ (4.99:1) | ต้นแบบวาง `.stack small` บนแถว `.is-active` · อ่านคำว่า "tinted soft fills" ใน D2 ว่าหมายถึงพื้นสีสถานะ (`warning`/`danger`/`success`/`info-soft`) · `primary-soft` อยู่ในชุดที่วัดแล้ว ≥4.95 |

### 5.14 ความเสี่ยง

- **token ต้องลงก่อน**: `rounded-control`, `text-meta`, `text-faint-foreground` และ `bg-border-soft` ยังไม่สร้าง CSS (ตรวจด้วย probe แล้ว) ถ้าเมนูลงก่อน §1 รายการจะเหลี่ยม เหตุผลไม่มีสี และเส้นคั่นหาย โดยไม่มี error · test ใหม่จึงต้องตรวจว่ามี token อยู่ใน `globals.css`
- **เมนูกว้างขึ้น**: ภาษา 160 → 240 · ส่งออกและเรียงลำดับ 224 → 240 · บนจอ 375 ยังพอ
- **จอ 640-767px**: รายการเมนูและ cmdk สูงขึ้นจาก 36 เป็น 44 ตาม D4
- **เส้นโฟกัสใหม่ของรายการ**: ใช้ heuristic ของ `:focus-visible` ใน Chrome ถ้าเปิดเมนูด้วยคีย์บอร์ดแล้วเปลี่ยนไปใช้เมาส์ เส้นจะตามเมาส์ไปจนกว่าจะคลิก ต้องดูบน Edge/Chrome ของเครื่องในบริษัท
- **`unavailable` + ลิงก์**: ถ้ามีคนใช้ `asChild` แม้ type จะกันไว้ (เช่น cast) ลิงก์ยังเปลี่ยนหน้าได้ · test ของ row-actions ช่วยกันจุดที่มีอยู่
- **SearchableSelect 29 จุด**: ข้อความตัวเลือกเลื่อนไปทางซ้าย 24px เพราะเลิกจองช่องเครื่องหมายถูกด้านหน้า และช่องค้นหากลายเป็นกล่องในแผงแทนเส้นคั่นเต็มแถว · หน้าตาเปลี่ยนทั้ง 13 ไฟล์ในครั้งเดียว
- **listbox ของ cmdk และ global search**: ตัวที่เลือกบอกด้วยพื้น `primary-soft` อย่างเดียว (1.16:1 เทียบขาว) เท่ากับตอนนี้ (`accent` 1.15) โฟกัสยังอยู่ที่ช่องค้นหาตามแบบ combobox · ไม่แย่ลงแต่ยังไม่ดีขึ้น · ถ้าจะทำให้ชัดขึ้นให้พิจารณาในเฟส 3 พร้อม Ctrl K
- **RowActions ใน P2-B**: จะเขียน `asset-register-row-actions.tsx` ใหม่ ต้องพา `unavailable` และ `ItemDescription` จากรอบนี้ไปด้วย (entry `type: "unavailable"` ใน actions §5.3)
- **ชนกับ codemod R1**: `dropdown-menu.tsx:76` `focus:bg-destructive/10` ถ้า R1 ลงก่อนเมนู ต้องข้ามบรรทัดนี้ (critic §4)
