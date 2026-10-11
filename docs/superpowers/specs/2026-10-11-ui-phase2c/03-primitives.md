> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2c-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** (I1–I36) · ตัวเลขและบรรทัดอ้างที่ `master` `5ffee76`

## 3. ของกลางที่ต้องมีก่อน (P0) และ primitive ใหม่ของ 2C

ส่วนนี้กำหนดของกลางที่ 2C ต้องมีก่อนจะย้ายจุดเรียกในชุดงาน (batch) ใด ๆ แบ่งเป็น 3 กลุ่ม:

- **P0 (K2):** `Segmented` · ช่อง `labelAction` ของ `Field` · handle `open()` / `hideTrigger` ของปุ่มเปิด dialog 3 ไฟล์ (O6) · K27 (class ของป้ายชื่อสำหรับ `<legend>`) รวมไว้ในงานเดียวกับ `Field`
- **2C-0:** primitive ที่ชุด 1 ต้องใช้ ได้แก่ ส่วนประกอบของ `AccessibleDialog` (K8, K9, K11) · ปุ่มปิด X ที่แปลแล้ว (K10) · `FileDropzone` (K19) · `FileQueueList` (K19) · `ScannerTextInput` (K20) · `FormContextBanner` (K24) · `StickyFormFooter` (K14) · `FormSection` (K18) · `ChoiceCard` / `ChoiceChip` (K16) · `Steps` (K17)
- **`ActionBar` (K23):** กำหนด API ไว้ที่นี่ ลงจริงในชุด 5

ส่วนนี้ไม่ย้ายจุดเรียก ยกเว้น 2 segmented และ 3 ไฟล์ปุ่มเปิดใน P0 ตารางจุดเรียกของแต่ละ primitive บอกแค่ว่าใครจะใช้และอยู่ชุดไหน งานย้ายจริงเป็นของส่วนชุดงาน ส่วน dialog ส่วนช่องกรอก และส่วนปุ่ม

ฐาน `master` `5ffee76` · path ในส่วนนี้นับจาก `src/components/` ยกเว้นที่ขึ้นต้นด้วย `src/`, `tests/`, `docs/` หรือ `messages/`

**ลำดับกับ 2B:** เจ้าของเลือกทำ 2C ก่อน 2B จึงไม่ต้องมี commit P0 แยกบน `master` ก่อนแตกสาย P0 เป็น 3 งานแรกของ branch 2C (`feat/ui-phase2c`) แล้วตามด้วย 2C-0 อีก 4 งาน 2B แตกสายจาก `master` หลัง 2C merge จึงได้ P0 ไปด้วย ถ้า 2B ต้องเริ่มก่อน 2C merge ให้ merge 3 commit ของ P0 ลง `master` ก่อน (เป็นงานต้นสายจึง fast-forward ได้) ตามเจตนาของ K2

**ตรวจแล้ว (read-only):**
- อ่านโค้ดทุกบรรทัดที่อ้างที่ `5ffee76`
- คอมไพล์ class ทุกตัวในส่วนนี้ด้วย Tailwind 4.2.4 ของ repo กับ `src/app/globals.css` ในหน่วยความจำ (`scratchpad/p2c-spec/work-03/tw-probe.mjs` ไม่เขียนไฟล์ใน repo) ทุก class สร้าง CSS ได้ ไม่มี token ใหม่ (I21)
- ลำดับที่ Tailwind ปล่อย variant ที่ใช้ในส่วนนี้ (ตัวหลังชนะ): base → `group-has-*` → `hover:` → `has-checked:` → `has-focus-visible:` → `has-disabled:` → `has-[…]:` → `aria-disabled:` → breakpoint
- ผลที่ต้องจำ: `group-has-checked:` แพ้ `hover:` บน element เดียวกัน และ `sm:px-5` (padding-inline) ทับ `pr-16`

### 3.1 งานและลำดับ

| งาน | ของ | K | ไฟล์ | test ที่แก้ | ต้องรอ |
|---|---|---|---|---|---|
| P0.1 | `Segmented` + ย้าย 2 จุด | K2, O8 | ใหม่ `ui/segmented.tsx` · `admin/system-settings-form.tsx:2543-2563` · `audit/audit-scan-room-list.tsx:72-88` | `tests/visual-foundation-guards.test.ts:275-290` · `tests/asset-label-print-ui.test.ts:51`, `:53` · `tests/audit-scan-room-ui.test.ts:37`, `:83` | — |
| P0.2 | `Field labelAction` · `fieldLabelClasses` · `FieldRequiredMark` | K2, O9, K27 | `ui/field.tsx` · `ui/field-variants.ts` | — (เพิ่มข้อตรวจ) | — |
| P0.3 | handle `open()` / `hideTrigger` / `returnFocusRef` | K2, O6 | `disposal/disposal-decision-button.tsx` · `disposal/disposal-execution-button.tsx` · `audit/audit-mark-not-found-button.tsx` | — (`tests/disposal-detail-workspace.test.ts:78` ผ่านต่อ ดูข้อ 3.4) | — |
| 2C-0.1 | `AccessibleDialogBody` / `Footer` / `Cancel` · X แปลแล้ว · safe area · `description` เป็น ReactNode | K8, K9, K10, K11 | `ui/accessible-dialog.tsx` · `ui/dialog.tsx` · `ui/sheet.tsx` · `ui/confirm-text-dialog.tsx` · `ui/operation-review-dialog.tsx` (type เท่านั้น) | `tests/accessible-dialog.test.ts:28`, `:31` · `tests/sheet-drawers-ui.test.ts:9`, `:11` | P0 |
| 2C-0.2 | `FileDropzone` · `FileQueueList` · `ScannerTextInput` · `FormContextBanner` | K19, K20, K24 | `ui/file-dropzone.tsx` · ใหม่ `ui/file-queue-list.tsx` · `ui/scanner-text-input.tsx` · `ui/form-context-banner.tsx` | — | P0.2 (`FieldHint`) |
| 2C-0.3 | `StickyFormFooter` · `FormSection` | K14, K18 | ใหม่ `ui/sticky-form-footer.tsx` · `ui/form-section.tsx` | — | — |
| 2C-0.4 | `ChoiceCard` / `ChoiceChip` · `Steps` · ข้อความใหม่ | K16, K17 | ใหม่ `ui/choice-card.tsx` · `ui/steps.tsx` · `src/lib/step-states.ts` · `messages/*.json` | — | — |
| ชุด 5 | `ActionBar` | K23 | ใหม่ `ui/action-bar.tsx` · ลบ `ui/mobile-action-bar.tsx` และ `disposal/disposal-mobile-action-bar.tsx` | ดูข้อ 3.15 | 2B merge แล้ว (K23, O11) |

แต่ละงานจบด้วย `npm test` (1 งาน = 1 commit แบบเฟส 1) งาน 2C-0 ทั้ง 4 ลง Production พร้อมชุด 1 และ 2A (I22)

**กติการ่วมของ primitive ใหม่ทุกตัว**

| เรื่อง | กติกา |
|---|---|
| ที่อยู่ | `src/components/ui/` · ทุกตัวมี `data-slot` ตามชื่อ |
| server/client | ไม่มี `"use client"` และไม่มี hook นอกจาก `useId` (แบบ `Button` และ `Field`) ยกเว้นส่วนประกอบของ `AccessibleDialog` ที่อยู่ในไฟล์ client เดิมและใช้ context · ตัวที่รับฟังก์ชัน (`onValueChange`, `onRemove`) ใช้ได้เฉพาะในคอมโพเนนต์ client แต่ตัวมันเองไม่ต้องมี directive |
| class | token เดิมเท่านั้น (I21) · ห้าม `shadow-*` (ไฟล์ที่ไม่อยู่ใน budget R2 ได้ 0 `tests/visual-foundation-guards.test.ts:260-273`) · ห้าม `opacity` · ห้าม `rounded-[…]` (`:174`) · ห้าม `leading-tight` / `leading-4` · มุมตาม I15: control เล็ก (segmented, chip) 6px `rounded-control` · การ์ดและกล่อง 8px `rounded-md` |
| ขนาด | ต่ำกว่า `md` สูงอย่างน้อย 44px (`min-h-11`) · สลับที่ `md` เหมือนปุ่มและช่องกรอก |
| ชื่อ prop | ห้ามใช้ `size` บนตัวที่ส่ง props ต่อให้ `<input>` (`ChoiceCard`, `ChoiceChip`, `FileDropzone`) |

### 3.2 P0.1 `Segmented` (`ui/segmented.tsx`)

**ตอนนี้** มี segmented 2 จุดที่ 2A แต่งตาม `.seg` ของต้นแบบไว้แล้ว (I11) และ guard ยึด class ไว้ (`tests/visual-foundation-guards.test.ts:281-283`, `:286-289`)

| จุด | กรอบ | ปุ่ม | สูง | ความหมาย |
|---|---|---|---|---|
| `audit/audit-scan-room-list.tsx:72-88` (3 แท็บพร้อมตัวนับ) | `flex gap-0.5 rounded-md border border-border bg-surface p-0.5` | `cn("flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9", …)` (`:80-81`) | 44 / 36 จาก `md` | `role="group" aria-label={t("roomListTabs")}` + `aria-pressed` |
| `admin/system-settings-form.tsx:2543-2563` ใน `LabelAssetNameModeField` (`:2520-2567`) | `inline-flex gap-0.5 rounded-md border border-border bg-surface p-0.5` | template string `inline-flex h-8 … rounded-control px-3 text-sm … focus-visible:ring-offset-2` + `Check` เมื่อเลือก (`:2552-2558`) | **32 ทุกความกว้าง** (ต่ำกว่า 44 บนมือถือ) | `role="group" aria-label={label}` + `aria-pressed` |

**API**

```ts
export type SegmentedOption<T extends string> = { value: T; label: React.ReactNode }
type SegmentedProps<T extends string> = {
  "aria-label": string                  // บังคับ: ชื่อของกลุ่ม
  value: T
  options: readonly SegmentedOption<T>[]
  onValueChange: (value: T) => void
  size?: "sm" | "md"                    // จาก md: sm 32 (ค่าตั้งต้น) · md 36 · ต่ำกว่า md 44 ทั้งคู่
  fill?: boolean                        // แบบ .m-seg: กว้างเต็มแถว ปุ่มแบ่งเท่ากัน
  showCheck?: boolean                   // ใส่ Check หน้าคำของตัวที่เลือก
  className?: string                    // กรอบ ใช้จัดวางเท่านั้น
}
export function Segmented<T extends string>(props: SegmentedProps<T>): React.JSX.Element
```

**class**

| ส่วน | class |
|---|---|
| กรอบ | `cn(fill ? "flex" : "inline-flex", "gap-0.5 rounded-md border border-border bg-surface p-0.5", className)` |
| ปุ่ม ส่วนร่วม | `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| `size="sm"` / `"md"` | `md:min-h-8` / `md:min-h-9` |
| ไม่ `fill` / `fill` | `whitespace-nowrap px-3` / `min-w-0 flex-1 px-2` |
| ตัวที่เลือก | `bg-primary-soft font-semibold text-primary-hover` |
| ตัวอื่น | `font-medium text-muted-foreground hover:bg-background hover:text-foreground` |
| `Check` | `<Check className="size-3.5" aria-hidden="true" />` |

ส่วนร่วมไม่มีน้ำหนักตัวอักษร จึงไม่มี `font-medium` กับ `font-semibold` อยู่ใน class list เดียวกัน (เหตุผลเดียวกับ comment ที่ `tests/visual-foundation-guards.test.ts:287`)

**markup:** `<div role="group" aria-label={…} data-slot="segmented" className={กรอบ}>` แล้วปุ่ม `<button type="button" aria-pressed={pressed} onClick={() => onValueChange(option.value)}>` ต่อ 1 ตัวเลือก (`key={option.value}`)

**a11y**
- คงความหมายเดิมของทั้ง 2 จุด: กลุ่มมีชื่อ ปุ่มเป็น toggle (`aria-pressed`) และกด Tab ได้ทีละปุ่ม
- ไม่ทำ roving tabindex เพราะต้นแบบ (`screens/components.html:173`, `screens/mobile.html:266`) และ test เดิมใช้แบบนี้
- ตัวที่เลือกได้ทั้งพื้น น้ำหนักตัวอักษร และ `Check` (เมื่อ `showCheck`) จึงไม่ได้บอกด้วยสีอย่างเดียว
- วง `ring` ไม่มี offset เพราะช่องว่างระหว่างปุ่มมีแค่ 2px ในโหมดสีตัดกันสูง outline นอก layer ของเฟส 1 ยังทำงาน (`tests/visual-foundation-guards.test.ts:15-23`)

**จุดเรียก**

| จุด | งาน | เปลี่ยนเป็น |
|---|---|---|
| `admin/system-settings-form.tsx:2543-2563` | P0.1 | `<Segmented aria-label={label} value={compactEnabled ? "compact" : "full"} options={[{ value: "compact", label: compactLabel }, { value: "full", label: fullLabel }]} onValueChange={(next) => onChange(next === "compact")} showCheck />` · คงชื่อ `LabelAssetNameModeField` (`tests/asset-label-print-ui.test.ts:48`) · ป้ายชื่อ `:2542` และคำอธิบาย `:2564` เป็นงานชุด 1f |
| `audit/audit-scan-room-list.tsx:72-88` | P0.1 | `<Segmented aria-label={t("roomListTabs")} value={tab} onValueChange={onTabChange} size="md" fill options={(["pending", "checked", "all"] as const).map((key) => ({ value: key, label: <>{t(tabLabelKey[key])}<span className="num">{counts[key]}</span></> }))} />` · คง literal `(["pending", "checked", "all"] as const)` (`tests/audit-scan-room-ui.test.ts:36`) |
| `assets/asset-create-workspace.tsx:20-39` (T3 ไม่มี `aria-pressed` และไม่มีชื่อกลุ่ม) | ชุด 4 | `<Segmented aria-label={t("createModeLabel")} …>` (key ใหม่ ข้อ 3.16) |

ผลที่เห็น: ตั้งค่าบนมือถือสูงขึ้นจาก 32 เป็น 44 · รายการห้องไม่เปลี่ยน (44 / 36)

**test:** ตาราง A ข้อ 3.17 แถว 1–3 และ test ใหม่ตาราง B

### 3.3 P0.2 `Field labelAction` และ class ป้ายชื่อสำหรับ `<legend>` (K27)

**ตอนนี้** `Field` ใส่ `label` ไว้ใน `<FieldLabel>` ซึ่งเป็น `<label>` (`ui/field.tsx:45-47`) ป้ายที่มีปุ่มช่วยเหลือจึงใช้ `Field` ไม่ได้ เพราะปุ่มจะไปอยู่ใน `<label>`:
- `AssetStateFieldLabel` (`assets/asset-form.tsx:1544-1561`) ใช้ที่ `:1051` และ `:1080` กับ select จำเป็น 2 ช่อง `:1052`, `:1081`
- `LabeledSelect` ของ 2B (`assets/asset-register-filter-sheet.tsx:194-212`, ปุ่มที่ `:211`)

**API ที่เพิ่ม** (`ui/field.tsx`)

```ts
type FieldProps = { /* เดิม */ labelAction?: React.ReactNode }   // ปุ่มไอคอน 1 ปุ่มข้างป้าย เช่น AssetStateHelpPopover
export function FieldRequiredMark(): React.JSX.Element            // <span aria-hidden="true" className="ml-1 text-warning">*</span>
```

`ui/field-variants.ts` เพิ่ม `export const fieldLabelClasses = "text-meta font-medium text-foreground"` และ `FieldLabel` เปลี่ยนเป็น `cn(fieldLabelClasses, visuallyHidden && "sr-only", className)` · ดอกจันของ `FieldLabel` เรียก `<FieldRequiredMark />` (literal เดิมยังอยู่ใน `field.tsx` ที่เดียว `tests/field-primitives.test.ts:85` ผ่านต่อ)

**markup เมื่อมี `labelAction`**

```tsx
<div data-slot="field-label-row" className="flex min-w-0 items-center gap-1.5">
  <FieldLabel htmlFor={controlId} required={required} visuallyHidden={hideLabel}>{label}</FieldLabel>
  <span data-slot="field-label-action" className="-my-0.5 inline-flex shrink-0">{labelAction}</span>
</div>
```

- ปุ่มอยู่นอก `<label>` คลิกที่ปุ่มจึงไม่โฟกัสช่อง
- `-my-0.5` ทำให้ปุ่ม 24px (`AssetStateHelpPopover` ขนาด default, `assets/asset-state-help-popover.tsx:21`) ไม่ดันแถวป้ายเกิน 20px ช่องในคอลัมน์ข้างเคียงจึงยังตรงแนวกัน
- ไม่มี `labelAction` ให้ render แบบเดิมทุกอย่าง
- `labelAction` ห้ามเป็น `<label>` และห้ามมีช่องกรอก ต้องมีชื่อของตัวเอง (`AssetStateHelpPopover` ใช้ `aria-label={srLabel ?? title}` อยู่แล้ว)
- ยังเป็น server-safe (ไม่เพิ่ม hook)

**`<legend>` (K27):** 6 จุดใช้ `mb-2 text-sm font-medium text-foreground` อยู่ ให้เปลี่ยนเป็น:

```tsx
<fieldset className="min-w-0">
  <legend className={cn(fieldLabelClasses, "mb-1.5")}>{label}{required ? <FieldRequiredMark /> : null}</legend>
```

`min-w-0` จำเป็นเพราะ `<fieldset>` มีค่าตั้งต้น `min-inline-size: min-content` ซึ่งดันให้หน้าล้นแนวนอนบนมือถือได้ preflight ไม่ได้ล้างค่านี้

| จุด | ชุด |
|---|---|
| `assets/asset-form.tsx:1051`, `:1080` → `Field label labelAction={<AssetStateHelpPopover {...help} />} required` + `NativeSelect` · ลบ `AssetStateFieldLabel` | 1e |
| `assets/asset-register-filter-sheet.tsx:209-212` (`LabeledSelect`) | 2B |
| legend `maintenance/repair-record-actions.tsx:128` · `maintenance/repair-record-form.tsx:147`, `:157` | 1a |
| legend `asset-operations/checkout-form.tsx:231` | 1b |
| legend `admin/IntegrationClientManager.tsx:412`, `:485` | 4 |

### 3.4 P0.3 handle `open()` / `hideTrigger` ของปุ่มเปิด dialog (O6)

แบบที่ใช้คือ `TransactionCancelDialog` (`asset-operations/transaction-cancel-dialog.tsx:43`, `:54-60`, `:89`, `:122`) ซึ่ง `assets/asset-detail-action-menu.tsx:43-49`, `:62-66`, `:97` เรียกจากเมนู ⋯ อยู่แล้ว ทั้ง 3 ไฟล์ได้ props และ type ชุดเดียวกัน:

```ts
export type DisposalDecisionButtonHandle = { open: () => void }   // DisposalExecutionButtonHandle, AuditMarkNotFoundButtonHandle เหมือนกัน
// props ที่เพิ่ม
ref?: Ref<DisposalDecisionButtonHandle>
hideTrigger?: boolean                         // ค่าตั้งต้น false
returnFocusRef?: RefObject<HTMLElement | null>  // ปุ่ม ⋯ ของเจ้าของ เมื่อซ่อนปุ่มของตัวเอง
```

| ไฟล์ | เปลี่ยน |
|---|---|
| `disposal/disposal-decision-button.tsx` | `:3` import `useImperativeHandle`, `type Ref`, `type RefObject` · props `:23-37` · หลัง state `:44` ใส่ `useImperativeHandle(ref, () => ({ open: () => setOpen(true) }))` · `:96-104` ห่อด้วย `{hideTrigger ? null : (…)}` · `:113` `triggerRef={returnFocusRef ?? triggerRef}` · type ของ prop `:139` เป็น `React.RefObject<HTMLElement \| null>` |
| `disposal/disposal-execution-button.tsx` | props `:45-65` · `useImperativeHandle(ref, () => ({ open: () => setOpen(true) }))` หลัง `:72` · `:155-158` ห่อด้วย `hideTrigger` · `:159` `triggerRef={returnFocusRef ?? triggerRef}` · type `:186` เป็น `HTMLElement` |
| `audit/audit-mark-not-found-button.tsx` | ลายเซ็น `:14` รับ `ref`, `hideTrigger`, `returnFocusRef` · `useImperativeHandle(ref, () => ({ open: openDialog }))` (`openDialog` `:25-27` กันการเปิดตอนกำลังบันทึกอยู่แล้ว) · `:91` `{hideTrigger ? null : trigger}` · `AccessibleDialog` `:92-99` เพิ่ม `returnFocusRef={returnFocusRef}` |

- ส่งค่า `returnFocusRef ?? triggerRef` เข้า prop ชื่อ `triggerRef` ของ dialog ย่อย ทำให้ JSX ใน dialog ยังเขียน `returnFocusRef={triggerRef}` (`disposal-decision-button.tsx:164`, `disposal-execution-button.tsx:219`) และ `tests/disposal-detail-workspace.test.ts:78` ผ่านต่อโดยไม่ต้องแก้
- P0 ไม่แตะ class ของปุ่มเปิด ปุ่มเหล่านี้เปลี่ยนเป็น `Button` ในชุด 1c / 1d
- ตัวที่จะใช้คือ `RowActions` ของ 2B ใน `src/app/[locale]/(dashboard)/disposal/page.tsx:426-427` และ `src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx:230`, `:290` เจ้าของ render คอมโพเนนต์ไว้นอกเมนูพร้อม `hideTrigger` แล้วเรียก `ref.current?.open()` ตามแบบ `openFromMenu` (`assets/asset-detail-action-menu.tsx:46-49`) ส่วน dialog คืนโฟกัสให้ปุ่ม ⋯

### 3.5 2C-0.1 ส่วนประกอบของ `AccessibleDialog` (K8, K9, K11, safe area)

**ตอนนี้** (`ui/accessible-dialog.tsx:17-91`)
- `children` ทั้งหมดอยู่ใน div ที่เลื่อนได้ (`:87` `min-h-0 flex-1 overflow-y-auto`) ส่วนท้าย 18 dialog จึงเลื่อนหายไปพร้อมเนื้อหา
- มี 3 dialog ที่เดาความสูงเอง และ 2 dialog ที่ใช้ `sticky`
- ส่วนท้ายมี 7 แบบ (`dialogs.md` §4)
- ปุ่มยกเลิก 5 ปุ่มไม่สนใจ `busy`
- บนมือถือ dialog ยึดที่ `bottom-3` โดยไม่เผื่อ safe area ทั้งที่ `viewportFit: "cover"`

**API** (ไฟล์เดิม เป็น client อยู่แล้ว)

```ts
export function AccessibleDialog(props: { /* เดิม */ description?: React.ReactNode; closeLabel?: string })
export function AccessibleDialogBody(props: React.ComponentProps<"div">)
export function AccessibleDialogFooter(props: React.ComponentProps<"div">)
export function AccessibleDialogCancel(props: Omit<React.ComponentProps<"button">, "type"> & { size?: ButtonVariantProps["size"] })
export const accessibleDialogFormClasses = "flex min-h-0 flex-1 flex-col"
```

- `description` เปลี่ยนจาก `string` เป็น `ReactNode` (K11) แต่ต้องเป็น phrasing content เพราะ `DialogDescription` render เป็น `<p>` · รหัสห่อด้วย `<span className="tag">` · เงื่อนไข `aria-describedby` (`:56`) ใช้ได้เหมือนเดิม
- `closeLabel` คงไว้สำหรับชื่อที่มีความหมายจริงเท่านั้น (`disposal/disposal-bulk-execution.tsx:818`) ค่าตั้งต้นย้ายไปอยู่ใน `DialogContent` (ข้อ 3.6) จึงลบ `closeLabel ?? tCommon("close")` (`:53`) และ `useTranslations` ออกจาก `AccessibleDialog`
- context ภายใน: `AccessibleDialogContext = createContext<{ busy: boolean; onClose: () => void } | null>(null)` ครอบ `children`
- `AccessibleDialogCancel` อ่าน context: `<Button type="button" variant="outline" disabled={dialog.busy || disabled} onClick={onClick ?? dialog.onClose}>{children ?? tCommon("cancel")}</Button>` · ถ้าอยู่นอก `AccessibleDialog` ให้ throw (แบบ `useConfirm`, `ui/confirm-dialog.tsx:117`)

**class**

| ส่วน | เดิม | ใหม่ |
|---|---|---|
| content `:77` | `top-auto bottom-3 …` | เปลี่ยนเฉพาะ `bottom-3` เป็น `bottom-[max(0.75rem,env(safe-area-inset-bottom))]` ส่วนที่เหลือคงเดิม (`sm:bottom-auto` มีอยู่แล้ว) |
| header `:81` | `shrink-0 border-b border-border px-5 py-4 pr-16 text-left` | `shrink-0 border-b border-border px-4 py-4 pr-16 text-left sm:pl-5` (ห้ามใช้ `sm:px-5` เพราะจะทับ `pr-16` แล้วหัวเรื่องไปลอดใต้ X) |
| ที่ห่อ children `:87` | `min-h-0 flex-1 overflow-y-auto` | `<div data-slot="accessible-dialog-content" className="flex min-h-0 flex-1 flex-col overflow-y-auto">` |
| `AccessibleDialogBody` | — | `min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5` |
| `AccessibleDialogFooter` | — | `flex shrink-0 flex-col gap-2 border-t border-border-soft bg-background px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5` |
| `<form>` ที่ห่อทั้งสองส่วน | — | `className={accessibleDialogFormClasses}` |

ทำไม dialog เดิม 23 ตัวไม่พัง: ที่ห่อเป็น flex column ที่ยังเลื่อนได้ ลูกแบบ block เดิมไม่หดต่ำกว่าความสูงของตัวเอง (`min-height: auto`) ที่ห่อจึงเลื่อนเหมือนเดิม เมื่อใช้ส่วนประกอบ `Body` (`min-h-0 flex-1`) จะหดและเลื่อนเอง ส่วน `Footer` (`shrink-0`) อยู่ติดล่างเสมอ ถ้าผู้เรียกลืม `accessibleDialogFormClasses` บน `<form>` ที่ห่อจะเลื่อนทั้งฟอร์มแบบเดิม จึงไม่พัง แค่ footer ไม่ติดล่าง

**ลำดับปุ่ม (K8):** DOM = ปุ่มยกเลิก แล้วปุ่มหลัก บนมือถือเรียงเป็นคอลัมน์เต็มความกว้าง (ปุ่มใน flex column ยืดเต็มเอง) ยกเลิกอยู่บน ปุ่มหลักอยู่ล่าง ตั้งแต่ `sm` เป็นแถวชิดขวา ปุ่มหลักอยู่ท้าย ปุ่มยาวขึ้นแถวใหม่ได้ (`sm:flex-wrap`) ลำดับที่เห็น ลำดับ DOM และลำดับ Tab จึงตรงกัน ใช้ได้กับส่วนท้ายที่มี 3 ปุ่ม (`disposal/disposal-bulk-approval.tsx:556-559`) และส่วนท้ายที่สลับปุ่มตามสถานะ (`disposal/disposal-bulk-execution.tsx:939-982`) เพราะ `Footer` รับ children อะไรก็ได้

**safe area:** ยก dialog ทั้งใบขึ้นพ้นแถบ home indicator ที่ content (ใช้กับ dialog ทั้ง 23 ตัวทันที รวมตัวที่ยังไม่ได้ย้าย) แล้ว `Footer` จึงไม่ต้องเผื่อ padding เอง ถ้าเผื่อทั้งสองที่ ช่องว่างจะซ้อนกัน 2 ชั้น

**ตัวอย่างการย้าย** (ใช้ในส่วน dialog และชุดงาน)

```tsx
<AccessibleDialog open title={t("decisionTitle")} description={<span className="tag">{disposalNo}</span>} busy={saving} onClose={closeDialog}>
  <form onSubmit={onSubmit} className={accessibleDialogFormClasses}>
    <AccessibleDialogBody className="grid grid-cols-1 gap-5 md:grid-cols-2">…</AccessibleDialogBody>
    <AccessibleDialogFooter>
      <AccessibleDialogCancel />
      <Button type="submit" busy={saving} disabled={submitDisabled}>…</Button>
    </AccessibleDialogFooter>
  </form>
</AccessibleDialog>
```

- dialog ที่ render อยู่ใน React tree ของ `<form>` อื่น ห้ามมี `<form>` ของตัวเอง เพราะ submit event ไหลผ่าน portal ขึ้นไปถึง `onSubmit` ตัวนอก ตอนนี้มีจุดเดียวคือ `admin/system-settings-form.tsx:1347` ใน `<form>` `:936` (R4) ให้ใช้ `Body` / `Footer` โดยไม่มี `<form>` และปุ่มทั้งหมดเป็น `type="button"`
- ถ้า Enter ใน `<input>` ของ dialog นี้ยังไม่ submit ฟอร์มนอก ก็เพราะ portal ย้าย DOM ออกไปนอก `<form>` แล้ว
- `ui/confirm-text-dialog.tsx:12`, `:17` และ `ui/operation-review-dialog.tsx:11`, `:15` เปลี่ยน type ใน 2C-0.1 เท่านั้น: `description` เป็น `ReactNode` และ `closeLabel?` ไม่บังคับ ส่วนการย้ายไปใช้ `Body` / `Footer` เป็นงานชุด 3 และ 1b
- dialog 23 ตัวจะย้ายไปใช้ส่วนประกอบในชุดของไฟล์ตัวเอง (ชุด 1 = 14 ตัว) จำนวนและลำดับเป็นของส่วน dialog

### 3.6 2C-0.1 ปุ่มปิด X ที่แปลแล้ว (K10) และ safe area ของ sheet ด้านล่าง

**ตอนนี้**
- ค่าตั้งต้นเป็นภาษาอังกฤษ: `ui/dialog.tsx:54` และ `ui/sheet.tsx:51` `closeLabel = "Close"` · `ui/dialog.tsx:120` `<Button variant="outline">Close</Button>` ใน `DialogFooter` (มีผู้เรียก 0 จุด)
- ปุ่ม X เขียน class เอง (`ui/dialog.tsx:80`, `ui/sheet.tsx:82`): สลับขนาดที่ `sm` และ dialog ใช้ `disabled:opacity-50`
- มี 2 จุดที่ตั้งชื่อปุ่ม X ว่า "ยกเลิก": `admin/IntegrationClientManager.tsx:395`, `admin/system-settings-form.tsx:1352`

**`ui/dialog.tsx`** (ไฟล์ client อยู่แล้ว)

```tsx
function DialogContent({ className, children, showCloseButton = true, closeLabel: closeLabelProp, closeDisabled = false, ...props }) {
  const tCommon = useTranslations("common")
  const closeLabel = closeLabelProp ?? tCommon("close")
  …
  {showCloseButton && (
    <DialogPrimitive.Close data-slot="dialog-close" asChild>
      <Button variant="ghost" size="icon" disabled={closeDisabled} aria-label={closeLabel} title={closeLabel} className="absolute top-3 right-3 disabled:border-transparent disabled:bg-transparent">
        <XIcon aria-hidden="true" />
      </Button>
    </DialogPrimitive.Close>
  )}
```

- `Button size="icon"` สูง 44 ต่ำกว่า `md` และ 40 ตั้งแต่ `md` ไม่มี opacity
- `disabled:border-transparent disabled:bg-transparent` กันไม่ให้ X ที่ปิดใช้งานกลายเป็นกล่องเทามีขอบ ตัว X เป็นสีจาง
- `pr-16` ของ header (64px) ยังพ้นปุ่ม (12 + 44 = 56px)
- `DialogFooter` (`:100-125`): ลบ prop `showCloseButton` และคำ `Close` ออก (ผู้เรียก 0 จุด) และ class เป็น `flex flex-col gap-2 sm:flex-row sm:justify-end` ตาม K8 เพื่อไม่ให้มี primitive ไหนสอนลำดับปุ่มแบบกลับด้าน

**`ui/sheet.tsx`**
- X ใช้ markup เดียวกัน แต่ className เป็น `absolute top-3 right-3 hover:bg-muted` เพราะ sheet 4 ใน 7 ตัวยังเป็นพื้น `bg-background` (`:64`) ซึ่ง hover ของ ghost (`hover:bg-background`) มองไม่เห็น (`DESIGN.md:349`)
- sheet ไม่มี `closeDisabled` และส่วนนี้ไม่เพิ่ม
- `side === "bottom"` (`:71-72`) เติม `pb-[env(safe-area-inset-bottom)]` ต่อท้าย string เดิม ส่วนล่างของ bottom sheet 3 ตัวจึงพ้น home indicator (filter sheet, room picker, check sheet) ส่วน row sheet ของ 2B ใส่ class นี้เองอยู่แล้ว (`assets/asset-register-row-actions.tsx:179`) `cn()` รวมให้เหลือตัวเดียว

**จุดเรียก:** 2 จุดที่ส่ง `labels.cancel` เลิกส่ง `closeLabel` (ชุด 4 และ 1f) · อีก 12 จุดที่ส่ง `tCommon("close")` ซ้ำกับค่าตั้งต้น (นับด้วย grep ที่ `5ffee76`: sheet 6 จุด · host ของ `OperationReviewDialog` 3 · `ConfirmTextDialog` 1 · `AttachmentPreviewDialog` 2) ลบได้ในชุดที่แก้ไฟล์นั้นอยู่แล้ว ไม่ต้องเปิดไฟล์เพิ่มเพื่องานนี้

### 3.7 2C-0.2 `FileDropzone` (K19)

**ตอนนี้** (`ui/file-dropzone.tsx:8-124`)
- `hint` แสดงเฉพาะหลังเลือกไฟล์แล้ว (`:118` `optimizing ? … : file ? hint : browseLabel`) จุดที่ส่ง `file={null}` 5 จุดจึงไม่เคยแสดง `hint` เลย
- `id` ของช่องไฟล์มาจาก `useId` ข้างใน (`:33`) และไม่รับ `aria-*` `Field` จึงติดป้ายชื่อหรือแสดง error ใต้ช่องนี้ไม่ได้
- `checkout-form.tsx:306` ห่อด้วย `Field` ของไฟล์ที่เป็น `<label>` จึงมี label ซ้อน label

**API**

```ts
{
  /* เดิมทั้งหมด */
  hint?: string                       // ไม่บังคับแล้ว: แสดงในกล่องหลังเลือกไฟล์ ถ้าไม่ส่ง แสดง browseLabel
  description?: React.ReactNode       // ใหม่: แสดงเสมอ ใต้กล่อง
  id?: string                         // ใหม่: id ของ <input type="file">
  "aria-describedby"?: string
  "aria-invalid"?: React.AriaAttributes["aria-invalid"]
  "aria-required"?: React.AriaAttributes["aria-required"]
}
```

**markup**

```tsx
<div data-slot="file-dropzone" className="grid min-w-0 gap-1.5">
  <label htmlFor={inputId} … className={[เดิม :99-100]}>     // เติม has-aria-invalid:border-danger ใน string :99
    <input id={inputId} aria-describedby={describedBy} aria-invalid={ariaInvalid} aria-required={ariaRequired} … />
    … (:116-121 เดิม)
  </label>
  {description ? <FieldHint id={descriptionId}>{description}</FieldHint> : null}
</div>
```

- `inputId = id ?? useId()` · `descriptionId = ${inputId}-description` · `describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(" ") || undefined`
- กล่องที่ผิดใช้ `has-aria-invalid:border-danger` (ยังเป็นเส้นประ) โดย variant นี้ชนะ `border-input` และ `border-primary`
- `description` อยู่นอก `<label>` จึงไม่ไปรวมกับชื่อของช่อง แต่ยังถูกอ่านเป็นคำอธิบาย
- ใน `Field` ใช้ลูกแบบฟังก์ชัน `{(control) => <FileDropzone {...control} … />}` และใช้ `hint` ของ `Field` แทน `description` ไม่ใส่ทั้งสองอย่าง ชื่อที่อ่านได้คือป้ายของ `Field` ตามด้วยข้อความในกล่อง (input มี label 2 ตัว) ยอมรับได้
- `tests/field-primitives.test.ts:131` (นับ `"mt-1 block text-meta text-faint-foreground"` ได้ 2) **ผ่านต่อ** เพราะ `description` ใช้ `FieldHint` ไม่ใช่บรรทัดใหม่ในกล่อง (critic §5 A คาดว่าพัง เพราะคิดว่าจะเพิ่มบรรทัดในกล่อง)
- pin ของ `tests/audit-scan-search-ui.test.ts:153-155` (`multiple?: boolean`, `onFilesChange?`, `Array.from(event.target.files`) ไม่กระทบ

**ทบทวนข้อความของ 5 จุดที่ไม่เคยแสดง `hint`** (ทำในชุดของแต่ละไฟล์)

| จุด | `hint` ตอนนี้ | ทำอะไร |
|---|---|---|
| `disposal/disposal-batch-form.tsx:120` | `disposalPage.batchEvidenceHelp` "หลักฐานที่เลือกจะถูกเก็บครั้งเดียวและแสดงในคำขอทุกรายการของชุด" | ย้ายไปเป็น `description` (เป็นนโยบาย อ่านก่อนเลือกได้) และลบ `hint` |
| `asset-operations/checkin-form.tsx:499` | `checkin.photoQueued` "เพิ่มรูปเข้าคิวแล้ว" | ลบ `hint` (เป็นข้อความหลังเลือก คิวแสดงใน `FileQueueList` อยู่แล้ว) |
| `audit/audit-scan-check-form.tsx:297` | `auditScan.dropAuditPhotoSelected` | ลบ `hint` (รูปที่เลือกแสดงในตาราง preview `:310`) |
| `disposal/disposal-request-form.tsx:181` | `disposalPage.dropEvidenceSelected` "เลือกไฟล์แล้ว ระบบจะอัปโหลดให้อัตโนมัติ" | ลบ `hint` · ข้อความนี้ผิดกับจุดนี้ด้วย เพราะไฟล์รอจนกดส่ง ส่วน `disposal-attachments.tsx` ยังใช้ key นี้ จึงห้ามลบ key |
| `assets/asset-attachments.tsx:233` | `dropFileSelected` / `uploading` | ลบ `hint` · จุดนี้อัปโหลดทันที คำว่า "กำลังอัปโหลด..." ไม่เคยแสดงมาตั้งแต่ก่อน 2C การแสดงสถานะอัปโหลดเป็นเรื่องของชุด 1e (ความเสี่ยงข้อ 6) |

key `checkin.photoQueued` และ `auditScan.dropAuditPhotoSelected` จะไม่มีใครใช้ ลบผ่าน `node scripts/messages-edit.mjs` ใน commit เดียวกัน (grep แล้วมีที่ใช้ที่เดียว)

### 3.8 2C-0.2 `FileQueueList` (`ui/file-queue-list.tsx`, K19)

**ตอนนี้** แถวไฟล์ที่รอส่งมี 3 แบบ:
- `disposal/disposal-request-form.tsx:191-205`: ปุ่มข้อความ `text-xs font-medium text-danger` เป้ากดสูงประมาณ 18px
- `disposal/disposal-batch-form.tsx:121`: X `h-10 w-10 text-danger` + `aria-label={tCommon("delete")}`
- `asset-operations/checkin-form.tsx:510-527`: Trash2 ในกรอบ + `sr-only` และกล่องเส้นประเมื่อว่าง
- ช่องไฟล์ของงานซ่อม 2 จุด (`maintenance/repair-record-form.tsx:217-223`, `maintenance/repair-record-actions.tsx:148`) ไม่แสดงรายการไฟล์เลย

**API**

```ts
export type FileQueueItem = { id: string; title: string; detail?: React.ReactNode }
export function FileQueueList(props: {
  items: readonly FileQueueItem[]
  label: string                                  // ชื่อของ <ul>
  removeLabel: (item: FileQueueItem) => string   // เช่น (item) => tCommon("removeFile", { name: item.title })
  onRemove: (id: string) => void
  emptyLabel?: string                            // ไม่ส่ง = ไม่แสดงอะไรเมื่อว่าง
  disabled?: boolean
  className?: string
})
```

**markup และ class**
- ว่าง: `emptyLabel ? <EmptyNote className={className}>{emptyLabel}</EmptyNote> : null`
- รายการ: `<ul aria-label={label} data-slot="file-queue-list" className={cn("grid gap-2", className)}>`
- แถว `<li>`: `flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface py-1 pr-1 pl-3 text-sm`
- ข้อความ: `<span className="grid min-w-0 flex-1"><span className="truncate text-foreground">{title}</span>{detail ? <span className="truncate text-meta text-faint-foreground">{detail}</span> : null}</span>`
- ปุ่มนำออก: `<Button type="button" variant="outline" size="icon-sm" aria-label={removeLabel(item)} disabled={disabled} onClick={() => onRemove(item.id)}><X aria-hidden="true" /></Button>`
- ปุ่มเป็น `outline` เหมือนปุ่มนำออกแบบไอคอนอื่นที่สีกลางตอนปกติ (K22) ไอคอนเป็น X เพราะไฟล์ยังไม่ได้อัปโหลด เป็นการนำออกจากรายการ ไม่ใช่การลบ
- ชื่อปุ่มมีชื่อไฟล์ทุกแถว screen reader จึงแยกแถวได้

**จุดเรียก:** `disposal-request-form` และ `disposal-batch-form` (1c) · `checkin-form` (1b, `title` = ประเภทรูป, `detail` = ชื่อไฟล์, `emptyLabel={t("noQueuedPhotos")}`) · ช่องไฟล์ซ่อม 2 จุดเปลี่ยนเป็น `FileDropzone multiple` + `FileQueueList` (1a) ต้องคง `uploadRepairFiles(payload.id, files` ไว้ (`tests/repair-record-ui.test.ts:38`)

### 3.9 2C-0.2 `ScannerTextInput` รับ `aria-label` (K20)

- เพิ่ม `"aria-label"?: string` ใน `ScannerTextInputProps` (`ui/scanner-text-input.tsx:46-61`) รับค่าใน `:63-77` แล้วส่งให้ `<Input aria-label={ariaLabel} …>` (`:299-310`)
- ปุ่มกล้องไม่รับค่านี้ (`tests/scanner-text-input.test.ts:200` ห้าม `aria-label={labels.stop}`)
- ใช้กับช่องที่ไม่มีป้าย 2 จุด: `assets/asset-batch-form.tsx:921` (ช่องในตาราง ใช้ `aria-label={t("batchSerialNumber")}` ตามหัวคอลัมน์) และ `assets/asset-component-manager.tsx:292` (`aria-label={labels.scanOrSearch}`) ทั้งคู่อยู่ชุด 1e

### 3.10 2C-0.2 `FormContextBanner` (K24)

**ตอนนี้** (`ui/form-context-banner.tsx:6-15`) เป็นกล่อง `rounded-md border border-primary-border bg-primary-soft px-3 py-2` ป้ายเป็น `text-xs font-medium uppercase text-primary` ค่าเป็น `truncate` + `title` มี 5 จุดใน 4 ไฟล์ และไม่มี test

**API และ markup** (แก้ในไฟล์เดิม ยังเป็น server-safe)

```tsx
export function FormContextBanner({ label, value, code, className }: { label: string; value: React.ReactNode; code?: string; className?: string }) {
  return (
    <dl data-slot="form-context-banner" className={cn("flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5", className)}>
      <dt className="text-meta text-faint-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground">{code ? <><span className="tag">{code}</span>{" "}</> : null}{value}</dd>
    </dl>
  )
}
```

- ไม่มีพื้นสี ไม่มี uppercase และไม่ตัดคำ (`title` ใช้บนจอสัมผัสไม่ได้)
- `value: ReactNode` รับ string เดิมได้ จุดเรียกจึงไม่พัง
- ส่ง `code` เฉพาะเมื่อแถวข้อมูลมีรหัสแยกอยู่แล้ว ไม่ขอข้อมูลเพิ่มจาก server ตอนนี้ค่าที่ส่งเป็น label ที่ต่อรหัสไว้แล้ว (เช่น `` `${assetTag} - ${name} (${status})` `` จาก `src/app/[locale]/(dashboard)/maintenance/new/page.tsx:34`)

**จุดเรียก:** `asset-operations/checkout-form.tsx:183`, `asset-operations/checkin-form.tsx:294`, `asset-operations/transfer-form.tsx:127` (1b) · `maintenance/repair-record-form.tsx:104` (1a) · `asset-operations/checkout-form.tsx:272` เปลี่ยนเป็นข้อความธรรมดาตาม K24 (1b) ทั้ง 5 จุดเปลี่ยนหน้าตาทันทีที่ 2C-0.2 ลง เพราะแก้ในไฟล์เดิม

### 3.11 2C-0.3 `StickyFormFooter` (`ui/sticky-form-footer.tsx`, K14)

**ตอนนี้**
- แถบบันทึกลอยของฟอร์มทรัพย์สิน (`assets/asset-form.tsx:1501-1517`) เป็น `fixed` และเดาความกว้างของ sidebar (G11 เลื่อน 192px เมื่อพับ sidebar)
- ฟอร์มต้องเว้นที่ด้วย `pb-36 sm:pb-24` (`:838`)
- แถบของหน้าตั้งค่า (`admin/system-settings-form.tsx:2099-2116`) เป็น `sticky bottom-3`
- ทั้งสองแถบมี `shadow-lg`, `bg-surface/95` และ `backdrop-blur` (budget R2 `tests/visual-foundation-guards.test.ts:266-267`)

**API**

```ts
export function StickyFormFooter(props: {
  status?: React.ReactNode    // ข้อความสถานะด้านซ้าย เช่น "มีการแก้ไข 3 รายการ" (live region เป็นงานของผู้เรียก)
  children: React.ReactNode   // ปุ่มตามลำดับ DOM: ยกเลิก แล้วปุ่มหลัก
  className?: string
})
```

**class**

| ส่วน | class |
|---|---|
| แถบ | `sticky bottom-0 z-10 -mx-4 border-t border-border bg-canvas px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6` |
| ข้างใน | `flex flex-col gap-3 sm:flex-row sm:items-center` |
| สถานะ | `min-w-0 flex-1 text-meta text-muted-foreground` |
| ปุ่ม | `flex flex-col gap-2 sm:ml-auto sm:flex-row sm:flex-wrap sm:justify-end` |

- **แบน:** ไม่มีเงา ไม่โปร่ง ไม่ blur และไม่มีมุมโค้ง
- **เต็มขอบ:** ยื่นออกไปเท่าระยะขอบของ `main` (`px-4 sm:px-6`, `layout/dashboard-shell.tsx:124`) และใช้พื้น `bg-canvas` แบบแถบ sticky อื่นของแอป (`tests/visual-foundation-guards.test.ts:109-115`)
- **ลำดับปุ่ม (K8):** บนมือถือเรียงเป็นคอลัมน์เต็มความกว้าง ยกเลิกอยู่บน ตั้งแต่ `sm` เป็นแถวชิดขวา ปุ่มหลักอยู่ท้าย
- **ที่วาง:** ต้องเป็นลูกตัวสุดท้ายของ `<form>` และ `<form>` ต้องอยู่ในคอลัมน์ของหน้าโดยตรง ไม่อยู่ในการ์ดที่มี padding เพราะ `-mx-*` คิดจากระยะขอบของ `main` ปุ่ม `type="submit"` จึงยังอยู่ในฟอร์ม
- **เมื่อเลื่อนถึงท้ายฟอร์ม** แถบวางอยู่ในตำแหน่งปกติ ฟอร์มจึงไม่ต้องเว้น `pb-*` อีก
- **ใช้ได้เฉพาะ focus-task route** (ไม่มีแถบนำทางล่าง) เพราะแถบนำทางเป็น `fixed … z-20` (`layout/mobile-field-navigation.tsx:51`) และจะบังแถบนี้ (G11b) K15 เปลี่ยน route ของฟอร์มเป็น focus ในชุด 1f
- ไม่มี hook และเป็น server-safe

**จุดเรียก:** `assets/asset-form.tsx:1501-1517` + ลบ `pb-36 sm:pb-24` `:838` (1e) · `admin/system-settings-form.tsx:2099-2116` (1f) · budget R2 ลดเป็น `asset-form.tsx` 0 และ `system-settings-form.tsx` 1 ในชุดนั้น (`tests/asset-form-sticky-actions.test.ts:10-16`, `:22-25` เป็นของชุด 1e)

### 3.12 2C-0.3 `FormSection` (`ui/form-section.tsx`, K18)

**ตอนนี้** หัวข้อส่วนแบบมีเลขมี 3 แบบ ทุกตัววาดวงกลม primary ทึบ จึงดูเหมือนทุกส่วนเป็นขั้นปัจจุบัน:
- `FormStep` `disposal/disposal-request-form.tsx:223-225` (เรียก `:110`, `:128`, `:178`)
- `FormStep` `disposal/disposal-batch-form.tsx:129` (เรียก `:100`, `:112`, `:119`)
- `WizardStep` `admin/system-settings-form.tsx:2347-2359` (เรียก `:1706`, `:1773`, `:1815`, `:1859`, `:1905`, `:1938`, `:1986`) ซึ่งซ้อนการ์ดเป็นชั้นที่ 3

**API** (server-safe)

```ts
export function FormSectionHeader(props: { number?: number; title: React.ReactNode; as?: "h2" | "h3"; id?: string; className?: string })
export function FormSection(props: { number?: number; title: React.ReactNode; as?: "h2" | "h3"; className?: string; children: React.ReactNode })
```

- `FormSectionHeader` คือแถวหัวข้ออย่างเดียว ใช้ในฟอร์มที่ช่องกรอกเป็นพี่น้องกับหัวข้อใน grid (ฟอร์มตัดจำหน่ายใส่ `className="md:col-span-2"`)
- `FormSection` ห่อ `<section aria-labelledby={headingId} className={cn("min-w-0 space-y-4", className)}>` + `FormSectionHeader` + `children` (`headingId` ได้จาก `useId`)

**class**

| ส่วน | class |
|---|---|
| แถว | `flex items-center gap-2.5 border-b border-border-soft pb-2.5` |
| เลข (ถ้ามี `number`) | `<span aria-hidden="true" className="inline-flex size-5.5 shrink-0 items-center justify-center rounded-full border border-control-border text-xs font-semibold text-muted-foreground num">` |
| `h2` (ค่าตั้งต้น) | `text-base font-semibold text-foreground` (`t-section` 16/24 ของต้นแบบ) |
| `h3` | `text-sm font-semibold text-foreground` (หน้าตั้งค่า: อยู่ใต้ `SectionHeader` `h2` `text-base`, `:2789-2795`) |

- เลขเป็นการตกแต่ง (`aria-hidden`) และไม่มีหน้าตา "ขั้นปัจจุบัน"
- หน้าตั้งค่าเลิกใช้การ์ดชั้นที่ 3 (`rounded-md border border-border bg-background p-4`, `:2349`) และใช้ `FormSection as="h3"` แทน
- การ์ดอื่นของฟอร์มไม่แตะ (K28)

**จุดเรียก:** `FormStep` 2 ไฟล์ (1c) แก้ `tests/disposal-forms-ux.test.ts:11-12` จาก `/FormStep/` เป็น `/<FormSectionHeader number=\{1\}/` ในชุดนั้น · `WizardStep` ของหน้าตั้งค่า (1f) ดูความเสี่ยงที่ `tests/settings-ldap-role-ui.test.ts:20-21` ในส่วนชุดงาน

### 3.13 2C-0.4 `ChoiceCard` / `ChoiceChip` (`ui/choice-card.tsx`, K16)

ใช้ input ของเบราว์เซอร์ (`radio` / `checkbox`) อยู่ใน `<label>` และแต่งด้วย `has-checked:` ไม่ต้องมี ternary ของสถานะ จึงได้ชื่อ `required` ปุ่มลูกศร และสถานะเลือกให้ screen reader มาเอง แบบอย่างที่มีอยู่แล้วคือ `assets/asset-register-mobile-list.tsx:92`

**API** (server-safe ใช้ `useId` ได้)

```ts
type ChoiceInputProps = Omit<React.ComponentProps<"input">, "type" | "size" | "className" | "children">
export function ChoiceCard(props: ChoiceInputProps & { type: "radio" | "checkbox"; label: React.ReactNode; description?: React.ReactNode; className?: string })
export function ChoiceChip(props: ChoiceInputProps & { type: "radio" | "checkbox"; label: React.ReactNode; meta?: React.ReactNode; className?: string })
```

`className` ใส่ที่ `<label>` ส่วน props อื่น (`name`, `value`, `checked`, `onChange`, `required`, `disabled`, `id`) ส่งให้ `<input>`

**`ChoiceCard`** (กลุ่ม radio card R1–R3 และแถวเลือก P1/P3)

| ส่วน | class |
|---|---|
| `<label>` | `group flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-control-border bg-surface px-3 py-3 text-sm transition-colors motion-reduce:transition-none hover:border-input has-checked:border-primary has-checked:bg-primary-soft has-disabled:cursor-not-allowed has-[:disabled:not(:checked)]:border-border has-[:disabled:not(:checked)]:bg-background` |
| `<input>` | `cn(checkboxVariants(), "mt-0.5")` (16px อยู่กลางบรรทัดแรก 20px) |
| ชื่อ | `<span id={titleId} className="font-medium text-foreground group-has-disabled:text-faint-foreground">` |
| คำอธิบาย | `<span id={descriptionId} className="text-meta text-muted-foreground group-has-disabled:text-faint-foreground">` ใน `<span className="grid min-w-0 gap-0.5">` เดียวกับชื่อ |

- input ได้ `aria-labelledby={titleId}` และ `aria-describedby={descriptionId}` (เมื่อมีคำอธิบาย) ชื่อจึงสั้น คำอธิบายถูกอ่านแยก
- โฟกัสใช้ outline ของ input เอง (`:focus-visible` ใน base)
- `has-checked:` มาหลัง `hover:` การ์ดที่เลือกจึงคงขอบ primary ตอน hover
- การ์ดที่ disabled แต่ถูกเลือกยังคงพื้น `primary-soft` ไว้ (ตัวอักษรจางบน `primary-soft` ได้ 4.99:1 ตาม I14) ส่วนตัวที่ไม่ได้เลือกเป็นพื้น `background`
- มุม 8px (R1 เดิม `rounded-lg` ลดตาม I15)

**`ChoiceChip`** (T4 คอลัมน์เสริมของชุดทรัพย์สิน · T5 ประเภทรูป · T6 กลุ่มค่าเสื่อม)

| ส่วน | class |
|---|---|
| `<label>` | `group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-control border border-control-border bg-surface px-3 py-1.5 text-left text-sm font-medium text-foreground transition-colors motion-reduce:transition-none hover:border-input hover:bg-background md:min-h-8 has-checked:border-primary-border has-checked:bg-primary-soft has-checked:text-primary-hover has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:cursor-not-allowed has-disabled:text-faint-foreground has-[:disabled:not(:checked)]:border-border has-[:disabled:not(:checked)]:bg-background` |
| `<input>` | `sr-only` |
| เครื่องหมายเลือก | `<Check aria-hidden="true" className="hidden size-3.5 group-has-checked:inline-block" />` ก่อนชื่อ |
| `meta` | `<span className="num text-meta text-muted-foreground">` (ตัวนับของ T4 เลิกใช้ pill) |

- input ถูกซ่อนแบบ `sr-only` ซึ่งตัด outline ทิ้ง (เหตุผลเดียวกับ `FileDropzone`) จึงวาด outline ที่ `<label>` ด้วย `has-focus-visible:`
- ตัวที่เลือกมี `Check` จึงไม่ได้บอกด้วยสีอย่างเดียว
- 32px ตั้งแต่ `md` เท่า `Button size="sm"` และ `Segmented`
- T6 ที่มี 2 บรรทัด (ชื่อกลุ่ม + จำนวน) ใช้ `meta` ได้ เพราะ `py-1.5` ยอมให้แถวสูงเกิน 32px

**กลุ่ม:** radio และ checkbox ทุกกลุ่มห่อด้วย `<fieldset className="min-w-0">` + `<legend className={cn(fieldLabelClasses, "mb-1.5")}>` (ข้อ 3.3) ไม่มี primitive กลุ่มแยก

**จุดเรียก** (เจ้าของคือส่วนช่องกรอกและชุดงาน)

| กลุ่ม | จุด | ชุด |
|---|---|---|
| R1 | `asset-operations/checkout-form.tsx:230-268` (ลบ `accent-primary` `:254`) | 1b |
| R2 | `maintenance/repair-record-form.tsx:146-164` + `Choice` `:261-272` | 1a |
| R3 | `maintenance/repair-record-actions.tsx:127-137` | 1a |
| P1 | `asset-operations/bulk-move-form.tsx:101-115` → `ChoiceCard type="checkbox"` | 1b |
| P3 | `assets/asset-component-manager.tsx:483-495` `CandidateList` → `ChoiceCard type="radio"` | 1e |
| T4 | `assets/asset-batch-form.tsx:1106-1135` คงชื่อ `BatchOptionalColumnToggle` (`tests/asset-batch-form-layout.test.ts:13`) | 1e |
| T5 | `assets/asset-form.tsx:1318-1340` | 1e |
| T6 | `admin/depreciation-policy-builder.tsx:211-225` | 1f |

### 3.14 2C-0.4 `Steps` (`ui/steps.tsx` + `src/lib/step-states.ts`, K17)

**`src/lib/step-states.ts`** เป็น TS ล้วน ไม่ import ผ่าน `@/` เพื่อให้ test import ตรงได้แบบ `field-variants.ts`

```ts
export type StepState = "complete" | "current" | "upcoming" | "rejected"
// index < currentIndex → complete · index === currentIndex → current (หรือ rejected) · มากกว่า → upcoming
// currentIndex >= total → complete ทุกขั้น (ไม่มีขั้นปัจจุบัน)
export function getStepStates(total: number, currentIndex: number, options?: { rejected?: boolean }): StepState[]
```

**API ของ `Steps`** (server-safe ไม่มี hook)

```ts
export type StepItem = { id: string; label: string; state: StepState }
export function Steps(props: {
  label: string                                 // ชื่อของ <ol>
  steps: readonly StepItem[]
  stateLabels: Record<StepState, string>        // คำนำหน้าสำหรับ screen reader: t("stepState.complete") …
  progressLabel: string                         // t("stepOf", { current, total }) ผู้เรียกจัดรูปเอง
  className?: string
})
```

**markup และ class (Look A "marker rail")**
- `<div data-slot="steps" className={cn("min-w-0", className)}>` > `<ol aria-label={label} className="flex items-start gap-2">`
- `<li aria-current={state === "current" ? "step" : undefined} className="flex min-w-0 flex-1 items-start gap-2 last:flex-none">`
- เครื่องหมาย 22px: `<span aria-hidden="true" className={cn("inline-flex size-5.5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold num", marker[state])}>`

| state | เครื่องหมาย | ในเครื่องหมาย | ป้าย |
|---|---|---|---|
| `complete` | `border-success-border bg-success-soft text-success` | `<Check className="size-3.5" strokeWidth={2.75} />` | `text-muted-foreground` |
| `current` | `border-primary bg-primary-soft text-primary-hover` | เลขขั้น | `font-semibold text-foreground` |
| `upcoming` | `border-control-border bg-surface text-faint-foreground` | เลขขั้น | `text-faint-foreground` |
| `rejected` | `border-danger-border bg-danger-soft text-danger` | `<X className="size-3.5" strokeWidth={2.75} />` | `font-medium text-danger` |

- ป้าย: `<span className={cn("mt-px min-w-0 text-meta max-md:sr-only", label[state])}><span className="sr-only">{stateLabels[state]}: </span>{label}</span>` (`mt-px` ทำให้บรรทัดแรก 20px อยู่กลางเครื่องหมาย 22px)
- เส้นเชื่อม (ทุกขั้นยกเว้นขั้นสุดท้าย): `<span aria-hidden="true" className={cn("mt-2.75 h-px min-w-3 flex-1", state === "complete" ? "bg-success-border" : "bg-border")} />`
- ต่ำกว่า `md` ป้ายทุกขั้นเป็น `sr-only` เหลือเครื่องหมายกับเส้น แล้วต่อท้ายด้วย `<p aria-hidden="true" className="mt-2 text-meta text-faint-foreground md:hidden"><span className="num">{progressLabel}</span> · <span className="font-semibold text-foreground">{focus.label}</span></p>`
- `focus` = ขั้น `current` ถ้าไม่มีใช้ขั้น `rejected` ถ้าไม่มีอีกใช้ขั้นสุดท้าย
- 5 ขั้น × 22px + เส้น 4 × 12px = 158px ใส่ได้ในความกว้างด้านใน 283px ที่ 375

**a11y**
- เป็นรายการลำดับ (`<ol>`) และมีชื่อ
- มีขั้นที่มี `aria-current="step"` ได้ไม่เกิน 1 ขั้น เมื่อครบทุกขั้นจะไม่มีขั้นไหนเป็นขั้นปัจจุบัน
- สถานะบอกด้วยรูป (เลข / เครื่องหมายถูก / X) และคำนำหน้าที่ซ่อนไว้ ไม่ได้บอกด้วยสีอย่างเดียว
- บรรทัดบนมือถือ `aria-hidden` เพราะซ้ำกับรายการ
- ขั้นไม่ใช่ลิงก์หรือปุ่ม จึงต้องไม่ดูเหมือน `TabNav`

**จุดเรียก** (ส่วนชุดงานเป็นเจ้าของ)
- **S1:** `disposal/disposal-workflow-stepper.tsx` เป็น adapter ที่เรียก `getStepStates(3, …)` คงชื่อไฟล์และชื่อคอมโพเนนต์ (`tests/disposal-detail-workspace.test.ts:9`, `:12`) ทำในชุด 5
- **S5:** `assets/asset-import-preview-panel.tsx:220-231`, `:402-436` (ชุด 4) เมื่อขั้น `complete` ให้ส่ง `currentIndex = 5`
- **ติดตั้งส่วนควบ:** 3 ขั้น `assets/asset-component-manager.tsx:35` คง `type InstallStep` (`tests/asset-component-manager.test.ts:27`) ทำในชุด 1e ชื่อขั้นที่ต้องเพิ่มเป็นข้อความของชุดนั้น

### 3.15 ชุด 5 `ActionBar` (`ui/action-bar.tsx`, K23)

**ตอนนี้**
- `ui/mobile-action-bar.tsx:11-48` (B5, 3 หน้า) และ `disposal/disposal-mobile-action-bar.tsx:11-43` (B6) มีกรอบเหมือนกัน
- ปุ่มเป็น `text-xs … leading-tight` (`:34`, `:29`) ซึ่งผิดกฎบรรทัดไทย
- ปุ่มที่ใช้ไม่ได้เป็น `<span aria-disabled="true">` พื้น `bg-muted` (`:24`)
- หน้าเว้นที่ด้วยมือ: `pb-24 md:pb-0` ที่ `src/app/[locale]/(dashboard)/assets/[id]/page.tsx:882`, `audit/rounds/[id]/page.tsx:408`, `maintenance/[id]/page.tsx:105` และ `pb-36 md:pb-0` ที่ `disposal/[id]/page.tsx:170`

**API** (server-safe เพราะทั้ง 4 หน้าเป็น server page)

```ts
export type ActionBarLink = { label: string; href: string; icon?: React.ReactNode; primary?: boolean; disabled?: boolean }
export function ActionBar(props: {
  label: string                       // ชื่อกลุ่ม: tCommon("actions") "การดำเนินการ"
  actions: readonly ActionBarLink[]   // แสดงสูงสุด 4 ลิงก์ หรือ 3 ลิงก์เมื่อมี primaryAction
  primaryAction?: React.ReactNode     // ปุ่มของขั้นถัดไป เต็มความกว้าง อยู่บนแถวลิงก์ (เดิมของ B6)
})
export const actionBarPagePadding = { links: "pb-24 md:pb-0", withPrimary: "pb-36 md:pb-0" } as const
```

**class**

| ส่วน | class |
|---|---|
| แถบ | `<div role="group" aria-label={label} data-slot="action-bar" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">` (string นี้ต้องคงไว้ ดู `tests/audit-scan-search-ui.test.ts:187`) |
| ข้างใน | `mx-auto grid max-w-lg gap-2` |
| ช่อง `primaryAction` | `min-w-0 [&>button]:w-full` |
| แถวลิงก์ | `cn("grid min-w-0 gap-2", getMobileActionGridClass(visibleActions.length))` (`src/lib/mobile-action-layout.ts:9`) |
| ลิงก์ | `cn(buttonVariants({ variant: action.primary ? "default" : "outline", size: "lg" }), "min-w-0 gap-1 px-2 text-xs")` + `<span className="shrink-0">{icon}</span><span className="min-w-0 truncate">{label}</span>` |
| ใช้ไม่ได้ | `<span aria-disabled="true" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-0 gap-1 px-2 text-xs")}>` (หน้าตา `aria-disabled:` ของ 2A) |

- ไม่มี `leading-tight` บรรทัด `text-xs` ไทยจึงได้ 18/12 ตาม `html:lang(th)`
- ตัวที่เป็นปุ่มหลักต้องระบุ `primary` เอง ไม่ใช้กฎ "ตัวแรกเมื่อไม่มี primaryAction" ของ B6 (`:30`) หน้าตัดจำหน่ายส่ง `primary: nextActionControl === null` ที่ลิงก์แรก
- หน้าใช้ `actionBarPagePadding` แทนการเขียน `pb-24` / `pb-36` เอง (O11) ระยะกับแถบจึงอยู่ในไฟล์เดียวกัน
- เลย์เอาต์ปุ่ม ⋯ ของต้นแบบรอเฟส 3

**test ที่ต้องแก้ในชุด 5:** `tests/mobile-action-bar.test.ts:17` (path) · `tests/audit-scan-search-ui.test.ts:182` (path) · `tests/visual-foundation-guards.test.ts:91` (รายการ path เหลือ `src/components/ui/action-bar.tsx` และเพิ่ม `leading-tight` ใน regex `:92`) · `tests/disposal-detail-workspace.test.ts:35` (`<ActionBar`), `:42` (path), `:46-48`

**ลำดับ:** K23 ให้ทำหลัง 2B merge เพราะ 2B แก้หน้ารายละเอียดทั้ง 4 หน้า เมื่อทำ 2C ก่อน 2B ชุด 5 ส่วนนี้จึงต้องรอจนหลัง 2B merge หรือย้ายไปไว้ต้น 2D (ส่วนชุดงานตัดสิน)

### 3.16 ข้อความใหม่

แก้ผ่าน `node scripts/messages-edit.mjs` ทุกครั้ง ตรวจแล้วว่าไม่มี key ซ้ำ และไม่มีคำเลิกใช้ตาม `docs/19_THAI_GLOSSARY.md`

| key | th | en | ใช้ที่ | งาน |
|---|---|---|---|---|
| `common.stepOf` | ขั้นที่ {current} จาก {total} | Step {current} of {total} | `progressLabel` ของ `Steps` | 2C-0.4 |
| `common.stepState.complete` | เสร็จแล้ว | Done | คำนำหน้าที่ซ่อนไว้ | 2C-0.4 |
| `common.stepState.current` | ขั้นตอนปัจจุบัน | Current step | (คำเดียวกับ `asset.importWizardCurrentStep`) | 2C-0.4 |
| `common.stepState.upcoming` | ยังไม่ถึง | Not started | | 2C-0.4 |
| `common.stepState.rejected` | ปฏิเสธแล้ว | Rejected | (คำเดียวกับ `auditFinding.status_rejected`) | 2C-0.4 |
| `common.removeFile` | นำ {name} ออก | Remove {name} | `removeLabel` ของ `FileQueueList` | 2C-0.2 |
| `common.selectedFiles` | ไฟล์ที่เลือก | Selected files | `label` ของ `FileQueueList` ที่ไม่มีชื่อเฉพาะ | 2C-0.2 |
| `asset.createModeLabel` | วิธีเพิ่มทรัพย์สิน | How to add assets | `aria-label` ของ `Segmented` T3 | ชุด 4 |

ลบ: `checkin.photoQueued`, `auditScan.dropAuditPhotoSelected` (ข้อ 3.7) ในชุด 1b และ 1d · ชื่อขั้นของการติดตั้งส่วนควบและชื่อ `<ol>` ของ S1 เป็นงานของชุดที่ใช้

### 3.17 Test

**ตาราง A: test เดิมที่ต้องแก้ (งานเดียวกับที่ทำให้พัง)** อ่านเนื้อทุกบรรทัดที่ `5ffee76` แล้ว

| # | test:line | ตอนนี้ยึด | แก้เป็น | งาน |
|---|---|---|---|---|
| 1 | `tests/visual-foundation-guards.test.ts:275-290` | class ของ segmented 2 จุด | อ่าน `src/components/ui/segmented.tsx`: `role="group"`, `"gap-0.5 rounded-md border border-border bg-surface p-0.5"`, ส่วนร่วม (ข้อ 3.2), `"bg-primary-soft font-semibold text-primary-hover"`, `"font-medium text-muted-foreground hover:bg-background hover:text-foreground"`, `aria-pressed=\{pressed\}` · ส่วนร่วมต้องไม่มี `font-` · room list และหน้าตั้งค่าต้องมี `<Segmented` และ room list ไม่มี `aria-pressed` · คง `--radius-control: 6px;` `:278` | P0.1 |
| 2 | `tests/asset-label-print-ui.test.ts:51`, `:53` | `aria-pressed={isActive}` · `? "bg-primary-soft font-semibold text-primary-hover"` | `:53` **พัง** (string นี้อยู่ที่ `:2554` ที่เดียว) · `:51` ยังผ่าน แต่ผ่านโดยบังเอิญ เพราะแถบแท็บ `:949` มี `aria-pressed={isActive}` เหมือนกัน จึงแก้ทั้งคู่: `:51` → `/<Segmented aria-label=\{label\}[\s\S]*?showCheck/` ใน form · `:53` → อ่าน `src/components/ui/segmented.tsx` แล้วหา `"bg-primary-soft font-semibold text-primary-hover"` · `:52`, `:54`, `:55` ผ่านต่อ (`:54` ยังมีอีก 4 จุดในไฟล์) | P0.1 |
| 3 | `tests/audit-scan-room-ui.test.ts:37`, `:83` | `aria-pressed={tab === key}` · `role="group" aria-label={t("roomListTabs")}` | `:37` → `/<Segmented[\s\S]*?value=\{tab\}[\s\S]*?onValueChange=\{onTabChange\}/` · `:83` → `/<Segmented[\s\S]*?aria-label=\{t\("roomListTabs"\)\}/` · `:36` และ `:84-87` คงเดิม | P0.1 |
| 4 | `tests/accessible-dialog.test.ts:28`, `:31` | `closeLabel = "Close"` · `min-h-11 min-w-11` | `:28` → `/closeLabel: closeLabelProp/` + `/closeLabelProp \?\? tCommon\("close"\)/` + `doesNotMatch(/"Close"\|>Close</)` · `:31` → `/<DialogPrimitive\.Close data-slot="dialog-close" asChild>\s*<Button variant="ghost" size="icon"/` + `doesNotMatch(/opacity-/)` · `:29-30` ผ่านต่อ | 2C-0.1 |
| 5 | `tests/sheet-drawers-ui.test.ts:9`, `:11` | เหมือนแถว 4 | แบบเดียวกับแถว 4 + `/"absolute top-3 right-3 hover:bg-muted"/` + side bottom มี `pb-\[env\(safe-area-inset-bottom\)\]` · `:10` ผ่านต่อ | 2C-0.1 |

**ผ่านต่อโดยไม่แก้ (ตรวจแล้ว)**
- `tests/field-primitives.test.ts:84-92`, `:124-131` (ดูข้อ 3.3 และ 3.7)
- `tests/accessible-dialog.test.ts:7-24`
- `tests/visual-foundation-guards.test.ts:67-84` (scrim, `shadow-overlay`, string `duration-250` ของ sheet ยังอยู่), `:91-93` (จนถึงชุด 5)
- `tests/disposal-detail-workspace.test.ts:71-85` (ข้อ 3.4)
- `tests/audit-not-found-dialog.test.ts:5-32`
- `tests/dropdown-menus-ui.test.ts:20-25`
- `tests/scanner-text-input.test.ts:189-202`
- `tests/audit-scan-search-ui.test.ts:142-155`, `:181-189`
- `tests/confirm-text-dialog-ui.test.ts:5-24`
- `tests/asset-operation-confirmation-ui.test.ts:25-33`

**ตาราง B: test ใหม่**

| ไฟล์ | ตรวจ | งาน |
|---|---|---|
| `tests/field-primitives.test.ts` (เพิ่ม) | `labelAction?: React.ReactNode` · `data-slot="field-label-action"` อยู่หลัง `</FieldLabel>` และไม่อยู่ข้างใน · `-my-0.5` · `fieldLabelClasses === "text-meta font-medium text-foreground"` (import จาก `field-variants.ts`) · `FieldLabel` ใช้ `fieldLabelClasses` · export `FieldRequiredMark` | P0.2 |
| `tests/field-primitives.test.ts` (เพิ่ม) | `FileDropzone`: `description?: React.ReactNode`, `hint?: string`, `id?: string`, `"aria-describedby"?`, `"aria-invalid"?` · `<FieldHint id=\{descriptionId\}>` อยู่นอก `</label>` · `has-aria-invalid:border-danger` · `id ?? ` | 2C-0.2 |
| `tests/scanner-text-input.test.ts` (เพิ่ม) | `"aria-label"\?: string` · `<Input[\s\S]*?aria-label=\{ariaLabel\}` | 2C-0.2 |
| `tests/dropdown-menus-ui.test.ts` (เพิ่ม test) | ทั้ง 3 ไฟล์ของ P0.3: `useImperativeHandle\(ref, \(\) => \(\{ open:` · `hideTrigger \? null` · `hideTrigger\?: boolean` · `returnFocusRef\?: RefObject<HTMLElement \| null>` · ไฟล์ตัดจำหน่าย `triggerRef=\{returnFocusRef \?\? triggerRef\}` · ไฟล์ตรวจนับ `returnFocusRef=\{returnFocusRef\}` | P0.3 |
| `tests/form-dialog-primitives.test.ts` (ใหม่) | **server-safe:** `segmented.tsx`, `sticky-form-footer.tsx`, `form-section.tsx`, `choice-card.tsx`, `file-queue-list.tsx`, `steps.tsx`, `form-context-banner.tsx` ไม่มี `"use client"`, `useState`, `useEffect`, `createContext`, `useContext` · ไม่มี `shadow-`, `opacity-`, `leading-tight`, `rounded-\[` | P0.1, 2C-0.2–0.4 |
| เดียวกัน | **dialog:** export `AccessibleDialogBody`, `AccessibleDialogFooter`, `AccessibleDialogCancel`, `accessibleDialogFormClasses` · string ของ footer, body และ header ตามข้อ 3.5 (header มี `sm:pl-5` ไม่มี `sm:px-5`) · `bottom-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]` · ที่ห่อเป็น `flex min-h-0 flex-1 flex-col overflow-y-auto` · Cancel มี `disabled=\{dialog\.busy \|\| disabled\}` · `description\?: ReactNode` · `DialogFooter` ไม่มี `showCloseButton` · guard: ทุก `<form` ที่อยู่ในบล็อก `<AccessibleDialog …</AccessibleDialog>` ของไฟล์ที่ import `AccessibleDialogFooter` ต้องมี `className=\{accessibleDialogFormClasses\}` | 2C-0.1 |
| เดียวกัน | **ฟอร์ม:** string ของ `StickyFormFooter` (ข้อ 3.11, ไม่มี `fixed`), `FormSectionHeader` (ข้อ 3.12), `FormContextBanner` (`<dl`, `text-meta text-faint-foreground`, ไม่มี `uppercase`, `bg-primary-soft`, `truncate`) · `FileQueueList` ใช้ `<ul aria-label`, `variant="outline" size="icon-sm"`, `aria-label=\{removeLabel\(item\)\}` | 2C-0.2, 0.3 |
| เดียวกัน | **ตัวเลือก:** string ของ `ChoiceCard` / `ChoiceChip` (ข้อ 3.13) · input ใช้ `checkboxVariants` · chip มี `has-focus-visible:outline-ring` และ `sr-only` | 2C-0.4 |
| เดียวกัน | **ขั้น:** `getStepStates` (import จาก `src/lib/step-states.ts`): `(3, 0)` → current, upcoming, upcoming · `(3, 1, { rejected: true })` → complete, rejected, upcoming · `(3, 3)` → complete ×3 · `(5, 9)` → complete ×5 · `steps.tsx` มี `aria-current=\{[^}]*"step"`, `max-md:sr-only`, `size-5.5`, `md:hidden` · key `common.stepOf` และ `common.stepState.*` มีครบทั้ง th และ en | 2C-0.4 |

**ตาราง C: ข้อบังคับที่ส่งต่อให้ชุดงาน** (test ของจุดเรียก เจ้าของคือส่วนชุดงาน)
- `tests/disposal-forms-ux.test.ts:11-12` → `FormSectionHeader` (1c)
- `tests/asset-form-sticky-actions.test.ts:10-16`, `:22-25` → `StickyFormFooter` และการแยก `busy` (1e)
- `tests/visual-foundation-guards.test.ts:266-267` → budget R2 ลดลง (1e, 1f)
- `tests/disposal-bulk-execution-ui.test.ts:31` → `AccessibleDialogFooter` (3)
- `tests/visual-foundation-guards.test.ts:26-28` ถ้าหัว dialog หรือ sheet ของ 3 ไฟล์นั้นเปลี่ยน (3)
- `tests/mobile-field-navigation.test.ts:28-46` → K15 (1f)

### 3.18 เอกสาร (ส่วนเอกสารเป็นเจ้าของการแก้จริง)

| ที่ | เพิ่มหรือแก้ |
|---|---|
| `DESIGN.md:382-395` Dialogs | ส่วนประกอบ `Body` / `Footer` / `Cancel` · ลำดับปุ่ม K8 · ปุ่ม X เป็น ghost icon ที่แปลแล้ว · safe area · ห้ามมี `<form>` ซ้อนใน React tree ของ form อื่น · `description` ที่มีรหัสใช้ `tag` |
| `DESIGN.md:214` | footer ของ dialog เป็น `background` แต่ body เป็น `surface` (ตอนนี้เอกสารเขียนว่า body เป็น `background` ซึ่งไม่ตรงกับโค้ด) |
| `DESIGN.md:413-428` Inputs | `labelAction` · `fieldLabelClasses` + `FieldRequiredMark` สำหรับ `<legend>` และ `fieldset min-w-0` · `FileDropzone` `description` / `id` / `aria-*` · `FileQueueList` · `ChoiceCard` / `ChoiceChip` |
| `DESIGN.md:328-361` Buttons | `Segmented` (ย17 ชี้ไปที่ไฟล์นี้) |
| `DESIGN.md:407` Corner Style | `ChoiceChip` 6px · `ChoiceCard` 8px |
| `DESIGN.md:509-518` Adaptive | `StickyFormFooter` ใช้เฉพาะ focus-task route · `ActionBar` + `actionBarPagePadding` (ชุด 5) |
| `DESIGN.md:320` | budget R2 ของแถบบันทึก 2 แถบหายไปเมื่อชุด 1e/1f ลง |
| wiki `AssetSystem` | หน้า `ams-` ที่พูดถึงของกลาง UI + `ams-log.md` + `wiki-lint` |

### 3.19 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | P0 อยู่ที่ไหน | 3 งานแรกของ branch 2C ไม่มี commit แยกบน master ก่อน · ถ้า 2B จะเริ่มก่อน 2C merge ให้ merge 3 commit นี้ลง master ก่อน | เจ้าของเลือก 2C ก่อน 2B จึงได้ผลเดียวกับ K2 โดยไม่ต้องรอรอบ deploy |
| 2 | K27 อยู่งานไหน | รวมกับ `Field labelAction` ใน P0.2 | แก้ไฟล์เดียวกัน และ 2B ได้ class ของ legend ไปด้วย |
| 3 | ความสูงของ `Segmented` | `min-h-11` + `md:min-h-8` (`sm`) หรือ `md:min-h-9` (`md`) ใช้ min-height ไม่ใช่ `h-*` | ตัว `fill` ห่อบรรทัดได้ · หน้าตั้งค่าได้ 44 บนมือถือ (เดิม 32) · รายการห้องยังเป็น 36 ตาม 09-codemods.md:178 |
| 4 | ขนาดตัวอักษรของ `Segmented` | `text-sm` ตาม recipe ที่ guard ยึดไว้ ไม่ใช่ 13px ของ `.seg` | K2 ให้ใช้ recipe ที่ยึดไว้ และหน้าตาของ 2 จุดเดิมจะไม่เปลี่ยน |
| 5 | วงโฟกัสของ `Segmented` | `ring-2` ไม่มี offset (ตัด `ring-offset-2` ของหน้าตั้งค่า) | ช่องว่างระหว่างปุ่มมีแค่ 2px วงที่มี offset จะทับปุ่มข้างเคียง |
| 6 | ค่าใน `Segmented` | `T extends string` เท่านั้น หน้าตั้งค่าแปลง boolean เป็น `"compact"` / `"full"` | key และ `aria-pressed` ชัดเจน · generic แบบเดียว |
| 7 | การวาง `labelAction` | อยู่นอก `<label>` ในแถว `flex` และใช้ `-my-0.5` | ปุ่มใน `<label>` ทำให้คลิกแล้วไปโฟกัสช่อง · ปุ่ม 24px ไม่ทำให้ช่องในคอลัมน์ข้างเคียงเหลื่อมกัน |
| 8 | pin ของ dialog ตัดจำหน่าย | ส่ง `returnFocusRef ?? triggerRef` เข้า prop `triggerRef` | `tests/disposal-detail-workspace.test.ts:78` ผ่านต่อ ไม่ต้องแก้ test ใน P0 |
| 9 | safe area ของ dialog (K9) | ยกทั้ง content ขึ้นด้วย `bottom-[max(0.75rem,env(safe-area-inset-bottom))]` และ `Footer` ไม่เผื่อเอง | ได้ผลกับ dialog ทั้ง 23 ตัวทันที รวมตัวที่ยังไม่ย้าย · ไม่เกิดช่องว่าง 2 ชั้น · ข้อความ K9 "parts own the safe area" ยังได้ผลตามเจตนา |
| 10 | ส่วนประกอบเป็น opt-in โดยไม่มี prop | ที่ห่อเปลี่ยนเป็น flex column ที่ยังเลื่อนได้ | ลูกแบบเดิมเลื่อนเหมือนเดิม · ย้ายได้ทีละ dialog |
| 11 | padding ของหัว dialog | `px-4 … pr-16 sm:pl-5` | `sm:px-5` จะทับ `pr-16` (ตรวจลำดับที่ Tailwind ปล่อยแล้ว) |
| 12 | Cancel ตอน busy | `disabled` จริง (ไม่ใช่ `aria-disabled`) | ตอนกำลังบันทึก โฟกัสอยู่ที่ปุ่มหลัก ส่วน X และ Escape ก็ปิดอยู่แล้ว จึงสอดคล้องกัน |
| 13 | X ของ sheet | ghost + `hover:bg-muted` | sheet 4 ใน 7 ตัวเป็นพื้น `background` ซึ่ง hover ของ ghost มองไม่เห็น |
| 14 | `DialogFooter` (ผู้เรียก 0 จุด) | ลบ `showCloseButton` และเปลี่ยน class เป็นลำดับตาม K8 | ไม่เหลือคำอังกฤษ และไม่มี primitive ที่สอนลำดับปุ่มกลับด้าน · `AlertDialogFooter` (`ui/alert-dialog.tsx:94`) เป็นของงาน K12 ในชุด 5 |
| 15 | ที่วาง `description` ของ `FileDropzone` | ใต้กล่องด้วย `FieldHint` นอก `<label>` | ไม่รวมเข้าไปในชื่อของช่อง · ไม่ต้องแก้ `tests/field-primitives.test.ts:131` · กล่องไม่สูงขึ้น |
| 16 | `hint` ของ `FileDropzone` | ไม่บังคับ · 4 จุดในโหมดคิวลบ `hint` · 1 จุดย้ายเป็น `description` | ข้อความ 4 จุดเขียนไว้สำหรับหลังเลือกไฟล์ (`dropEvidenceSelected` ยังผิดกับจุดนั้นด้วย) จึงต้องทบทวน ไม่ใช่แค่ทำให้แสดง (K19) |
| 17 | ปุ่มนำออกใน `FileQueueList` | `outline` `icon-sm` + X | สอดคล้องกับ K22 (ปุ่มนำออกแบบไอคอนที่สีกลางใช้ outline) · ยังไม่ได้ลบไฟล์จริง |
| 18 | `FormContextBanner` | `code?` แยก · ไม่ตัดคำ · `value: ReactNode` | `tag` ตาม K24 โดยไม่ต้องขอข้อมูลเพิ่มจาก server · `title` ใช้บนจอสัมผัสไม่ได้ |
| 19 | หน้าตา `StickyFormFooter` | เต็มขอบ `-mx-4 sm:-mx-6` + `bg-canvas` + `border-t` + safe area | แบบเดียวกับแถบ sticky อื่น (guard `:109-115`) · ไม่ต้องรู้ความกว้างของ sidebar (G11) |
| 20 | หัวข้อ `h3` ของ `FormSection` | `text-sm` | อยู่ใต้ `h2` `text-base` ของหน้าตั้งค่า ระดับหัวข้อต้องเล็กลงตามลำดับ |
| 21 | `FormSection` มี 2 ตัว | `FormSectionHeader` (แถวอย่างเดียว) + `FormSection` (ห่อ) | ฟอร์มตัดจำหน่ายวางหัวข้อเป็นพี่น้องกับช่องใน grid · หน้าตั้งค่าห่อเนื้อหา |
| 22 | การ์ดที่ disabled แต่ถูกเลือก | คงพื้น `primary-soft` ไว้ ใช้ `has-[:disabled:not(:checked)]` กับตัวที่ไม่ได้เลือก | `has-disabled:` มาหลัง `has-checked:` จึงจะลบการเลือกออกให้มองไม่เห็น |
| 23 | input ของ `ChoiceChip` | `sr-only` + outline ที่ `<label>` + `Check` | chip ไม่ต้องมีวงกลมหรือกล่องซ้อน · ไม่บอกด้วยสีอย่างเดียว |
| 24 | กลุ่มตัวเลือก | `<fieldset className="min-w-0">` + `<legend>` ของ K27 ไม่มี primitive กลุ่ม | native ใช้ได้ทั้ง radio และ checkbox · เพิ่ม primitive ไม่ได้อะไรเพิ่ม |
| 25 | ป้ายของ `Steps` บนมือถือ | ซ่อนทุกขั้น (`max-md:sr-only`) แสดงแค่บรรทัด "ขั้นที่ x จาก y · ขั้นปัจจุบัน" | ตาม K17 · ถ้าไม่มีขั้นปัจจุบันใช้ขั้นที่ปฏิเสธ ถ้าไม่มีอีกใช้ขั้นสุดท้าย |
| 26 | คำนวณสถานะของขั้น | `getStepStates` ใน `src/lib/step-states.ts` ตัวเดียว | adapter ของ S1, S5 และงานติดตั้งได้กฎเดียวกัน · test เรียกได้ตรง |
| 27 | ไฟล์ของ `ActionBar` | ไฟล์ใหม่ `ui/action-bar.tsx` และลบ 2 ไฟล์เดิม | ชื่อตาม K23 · test ที่ต้องเปลี่ยน path มี 4 ไฟล์ ซึ่งชุด 5 แก้อยู่แล้ว |
| 28 | ระยะเว้นใต้หน้าของ `ActionBar` | export `actionBarPagePadding` ให้หน้าใช้ ไม่ใช้ spacer | หน้ารายละเอียดทรัพย์สินวางแถบไว้กลางหน้า (`page.tsx:989`) spacer จึงจะไปโผล่กลางหน้า |
| 29 | ชื่อกลุ่มของ `ActionBar` | บังคับ `label` ใช้ `tCommon("actions")` ที่มีอยู่แล้ว | screen reader รู้ว่าแถบนี้คืออะไร โดยไม่ต้องเพิ่มข้อความ |

### 3.20 ความเสี่ยง

1. **โครง dialog เปลี่ยนกับทั้ง 23 ตัวพร้อมกัน** (ที่ห่อเป็น flex · หัวเป็น `px-4` บนมือถือ · ยกพ้น safe area) dialog ที่ยังไม่ย้าย (9 ตัวนอกชุด 1) จะมีหัว 16px แต่ตัวเนื้อ 20px บนมือถือจนถึงชุด 3/4 ให้เปิดดู dialog ทั้ง 23 ตัวที่ 375 และ 1440 บนแอป dev หลัง 2C-0.1
2. **submit ไหลผ่าน portal (R4):** ถ้าชุด 1f ใส่ `<form>` ให้ dialog คำนำหน้ารหัส ฟอร์มตั้งค่าทั้งหน้าจะถูกบันทึก ข้อห้ามอยู่ในข้อ 3.5 แล้ว แต่ต้องลองด้วยคีย์บอร์ดจริง (Enter ในช่องคำนำหน้า)
3. **ลืม `accessibleDialogFormClasses`** แล้ว footer จะไม่ติดล่างแบบเงียบ ๆ guard ในตาราง B จับได้เฉพาะ `<form>` ที่อยู่ในบล็อก `<AccessibleDialog>` เดียวกัน ฟอร์มที่อยู่ในฟังก์ชันอื่น (`ConfirmTextForm`) ต้องตรวจตอน review
4. **`StickyFormFooter` บน route ที่ยังมีแถบนำทาง** จะโดนบัง (G11b) ทุกจุดที่ใช้ต้องเป็น focus route (K15) และ G11b ยังต้องยืนยันบนแอป dev ที่ 375 และ 768 · บน iOS เมื่อคีย์บอร์ดเปิด แถบ sticky อาจอยู่หลังคีย์บอร์ด (พฤติกรรมปกติของ Safari)
5. **ความกว้างเต็มขอบของ `StickyFormFooter`** ใช้ได้เฉพาะเมื่อ `<form>` อยู่ในคอลัมน์ของหน้าโดยตรง ถ้าวันหลังมีคนวางไว้ในการ์ดที่มี padding แถบจะยื่นเกินการ์ด แต่ไม่ล้นจอ เพราะ `main` เป็น `overflow-x-hidden`
6. **สถานะอัปโหลดของ `assets/asset-attachments.tsx:233` ไม่เคยแสดง** (เป็นมาก่อน 2C) การลบ `hint` ไม่ทำให้แย่ลง แต่ชุด 1e ควรตัดสินว่าจะแสดงอย่างไร (`FileDropzone` ยังไม่มีสถานะ busy)
7. **input มี label 2 ตัวเมื่อ `FileDropzone` อยู่ใน `Field`** ชื่อที่อ่านได้จึงยาว (ป้าย + ข้อความในกล่อง) ให้ลองกับ NVDA และ VoiceOver ที่ `checkout-form.tsx:306` ถ้ายาวเกินไป ทางแก้คือส่ง `aria-labelledby` ที่ชี้ป้ายของ `Field` แต่ต้องเพิ่ม API
8. **`has-*` และ `group-has-*`** ขึ้นกับ `:has()` (Safari 15.4+, Chrome 105+) ซึ่ง 2A ใช้อยู่แล้วใน `file-dropzone.tsx:99` และ `asset-register-mobile-list.tsx:92` · `group-has-checked:` แพ้ `hover:` บน element เดียวกัน ห้ามใส่สองอย่างนี้คู่กันบน element เดียว
9. **ตัวเลือกที่เปลี่ยนจาก `<button aria-pressed>` เป็น checkbox หรือ radio จริง** (T4, T5, T6, P1, P3) ทำให้สิ่งที่ screen reader อ่าน การกด Space และลูกศร และการส่งฟอร์มเปลี่ยนไป ปุ่มเดิมเป็น `type="button"` ส่วน input ที่ไม่มี `name` จะไม่ถูกส่งไปกับฟอร์ม ให้ตรวจว่าไม่มี handler ไหนอ่านค่าจาก `FormData`
10. **ลำดับกับ 2B:** ถ้า 2B เริ่มก่อน 2C merge แต่ไม่ได้รับ P0 ทั้งสองสายจะเขียน `Segmented` และ handle ของตัวเอง (critic risk 3) ข้อตัดสินย่อยข้อ 1 กันไว้แล้ว ต้องเขียนลง plan ของทั้งสองสาย
11. **`ActionBar` ต้องรอ 2B** (K23) ถ้า 2C ปิดสายก่อน งานนี้จะค้างอยู่นอก 2C ให้ส่วนชุดงานกำหนดว่าจะไปอยู่ท้าย 2B หรือต้น 2D
12. **ข้อความใหม่ 8 key และลบ 2 key** ต้องผ่าน `tests/thai-glossary.test.ts` และ `tests/messages-parity.test.ts` · `common.stepState` เป็น object ซ้อน ซึ่ง `scripts/lib/messages-edit-core.mjs:14-22` (`setPath`) สร้างให้จาก key ที่มีจุดได้ (อ่านโค้ดแล้ว ยังไม่ได้ลองรัน)
