> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2c-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** (I1–I36) · ตัวเลขและบรรทัดอ้างที่ `master` `5ffee76`

## 8. ชุดงาน ขอบเขตกับ 2B/2D และการ deploy

ส่วนนี้บอกว่าแต่ละงานลงตอนไหน ใครเป็นเจ้าของไฟล์ไหน และอะไรต้อง deploy พร้อมกัน API ของ primitive แต่ละตัวอยู่ในส่วนที่ถือ K ของมัน ส่วนนี้ระบุ API เองเฉพาะของ 3 อย่างใน P0 (ข้อ 8.3) และการแก้บั๊ก ZodError (ข้อ 8.5)

ฐาน: `master` `5ffee76` (2A merge แล้ว ยังไม่ deploy) · working tree ไม่มีไฟล์ใน `src/` หรือ `tests/` ที่แก้ค้าง

ตัวเลขนับใหม่ที่ `5ffee76` ด้วย `scratchpad/p2c-spec/scripts-08/b1-perfile.mjs` (อ่าน `p2c-map/critic-ast.json` ที่สแกนจาก HEAD เดียวกัน · ผลอยู่ที่ `scripts-08/b1-perfile.txt`) และตรวจซ้ำด้วย grep: `<Loader2`, `<AccessibleDialog`, `function Field`, `toast.error(`, `<FormContextBanner` ต่อไฟล์ตรงกับสแกนทุกไฟล์ · ทุก file:line ในส่วนนี้เปิดดูแล้วที่ HEAD

ความหมายของคอลัมน์ (เหมือน `p2c-map/critic.md` §0):
- **ช่อง** = `<input>` ที่ไม่ใช่ checkbox/radio/hidden/file + `<select>` + `<textarea>` ที่เขียนเอง
- **ปุ่ม** = แถวใน Appendix A ของ `p2c-map/actions.md` (152 ปุ่ม) · **L1** = ปุ่มในนั้นที่มี `Loader2` (จะเป็น `busy`)
- **trigger** = ปุ่มเปิด dialog ในไฟล์เดียวกัน (ไม่อยู่ใน 152) ซึ่ง K1 ให้ 2C แปลงพร้อม dialog ของมัน (actions A5)

### 8.1 ลำดับใหญ่

| ลำดับ | งาน | ที่ไหน | deploy |
|---|---|---|---|
| 1 | **P0**: `ui/segmented.tsx` · `Field labelAction` · `open()`/`hideTrigger` ของ trigger 3 ไฟล์ (K2) | branch สั้น แล้ว merge เข้า `master` | ไม่ deploy เอง |
| 2 | **plan 1**: 2C-0 primitive → แก้บั๊ก ZodError → ชุด 1 (1a→1b→1c→1d→1g→1e→1f) | `feat/ui-phase2c` แตกจาก `master` หลัง P0 | **ประตู deploy** (ข้อ 8.8) |
| 3 | plan 2 · plan 3 · plan 4 (ชุด 2, 3, 4) | branch ละ plan | ชุดละครั้ง |
| 4 | 2B (สเปกและ plan ของตัวเอง) | เริ่มได้หลัง plan 1 merge · ทำคู่กับ plan 2–4 ได้ภายใต้รั้วข้อ 8.2 | ของ 2B |
| 5 | plan 5 (ชุด 5) | หลัง 2B merge | ครั้งเดียว |
| 6 | **V track** (validation) | สเปกและ plan ของตัวเอง หลังชุด 1 อยู่บน Production | ของ V |
| 7 | 2D | หลัง 2B และ 2C | ของ 2D |

ผู้ใช้เลือก "2C ก่อน 2B" ส่วนนี้จึงให้ 2B เริ่มหลัง plan 1 merge ไม่ใช่พร้อมกันตั้งแต่ต้น (ข้อตัดสินย่อย 1)

### 8.2 รั้วเจ้าของ (K1 = O1–O21)

กฎ:
1. **เจ้าของต่อหน้าที่ ไม่ใช่ต่อไฟล์** · ไฟล์เดียวมีเจ้าของได้ 2 ฝ่าย ถ้าแบ่งตามหน้าที่ชัด
2. **ของที่อยู่ใน overlay (dialog, sheet, popover) เป็นของ 2C** · ของที่ใช้เลือกแถวในรายการเป็นของ 2B
3. **primitive ใน `ui/` มีเจ้าของคนเดียว** · dialog, sheet, alert-dialog, field, file-dropzone เป็นของ 2C · 2B แก้ได้แค่เนื้อใน sheet ของตัวเอง
4. **ของที่ทั้งสองฝ่ายใช้ลงใน P0 บน `master` ก่อน** (Segmented, `labelAction`, handle ของ trigger)
5. **ไฟล์ที่ทั้งสองฝ่ายแก้: ฝ่ายที่ merge ทีหลัง rebase** · 2C วางงานในไฟล์เหล่านี้ไว้ในชุด 3 และ 4
6. **guard ใหม่ของ 2C อยู่ไฟล์ใหม่** (`tests/form-migration-guards.test.ts` ข้อ 8.4) ไม่เพิ่มใน `visual-foundation-guards.test.ts` ที่ 2B ก็แก้ budget

| # | เรื่อง (file:line ที่ `5ffee76`) | เจ้าของ | หมายเหตุ |
|---|---|---|---|
| O1 | ตัวกรองฝั่ง client ของทะเบียน: `asset-register-toolbar.tsx:41, :53, :65` · `LabeledSelect` `asset-register-filter-sheet.tsx:194` · `asset-register-search-field.tsx:77` · checkbox เลือกแถว `asset-register-table.tsx:544, :615`, `asset-register-mobile-list.tsx:93` | 2B | 2C ทำแค่ dialog แก้ไขหลายรายการ `asset-register-table.tsx:697-774` (ชุด 4) · pin `asset-register-table-ui.test.ts:158, :161` ไปกับ 2B |
| O2 | `FilterSelect` ×7 + `ReportSelect` (30 จุด) ในไฟล์ server ของ 2B | 2B | — |
| O3 | `Filter` `admin/asset-state-review-workspace.tsx:238` | 2B | `asset-state-review-dialog.tsx` เป็นของ 2C (ชุด 4) |
| O4 | `disposal-bulk-approval.tsx` · `disposal-bulk-execution.tsx` | แยก | 2B: `DisposalBulkSelectionToggle :391`, `…ApprovalToolbar :412`, `…SelectPageControl :434`, `…Checkbox :461` (checkbox :448, :493) · execution `…SelectionToggle :594` + checkbox :681, :732 · 2C: `DisposalBulkApprovalDialog :505-565` · dialog ของ execution **`:812-986`** (critic เขียน :993 ซึ่งเป็น `Loader2` ใน `BusyLabel` :990 · dialog ปิดที่ :986) · `SharedValueFields :999` · pin `disposal-bulk-approval.test.ts:92`, `disposal-bulk-execution-ui.test.ts:33` เป็นของ 2B |
| O5 | checkbox `audit-findings-batch-actions.tsx:109` | 2B | `ConfirmTextDialog` ที่ไฟล์นี้เปิดเป็นของ 2C |
| O6 | trigger ที่ ⋯ ของ 2B ต้องเรียก: `disposal-decision-button.tsx:96`, `disposal-execution-button.tsx:155`, `audit-mark-not-found-button.tsx:67, :77` | 2C | handle ลง P0 (ข้อ 8.3.3) · หน้าตา trigger แปลงในชุด 1c/1d |
| O7 | แถวแท็บ 11 แท็บ `system-settings-form.tsx:937-956` | 2C ห้ามแก้ในชุด 1f | เปลี่ยนเป็น `TabNav` ของ 2B ในชุด 5 หลัง 2B merge (ข้อตัดสินย่อย 15) · `settings-tab-persistence-ui.test.ts:8-13` ผ่านต่อ |
| O8 | `Segmented` | P0 | ข้อ 8.3.1 |
| O9 | `Field labelAction` | P0 | ข้อ 8.3.2 |
| O10 | `ui/sheet.tsx`, `ui/dialog.tsx`, `ui/accessible-dialog.tsx`, `ui/alert-dialog.tsx` | 2C | 2B แก้แค่เนื้อใน `asset-register-row-actions.tsx:175` และ `asset-register-filter-sheet.tsx:90-180` |
| O11 | `ui/mobile-action-bar.tsx` + `disposal/disposal-mobile-action-bar.tsx` และ padding `pb-24 md:pb-0` (`assets/[id]/page.tsx:882`, `audit/rounds/[id]/page.tsx:408`, `maintenance/[id]/page.tsx:105`) · `pb-36 md:pb-0` (`disposal/[id]/page.tsx:170`) | 2C ชุด 5 | หลัง 2B merge · แถบกับระยะที่มันต้องการเปลี่ยนใน commit เดียวกัน |
| O12 | `DisposalWorkflowStepper` ที่ `disposal/[id]/page.tsx:205-215` | 2C (component) | 2B แค่วางตำแหน่ง · ชุด 5 |
| O13 | `asset-import-preview-panel.tsx` ทั้งไฟล์ | 2C ชุด 4 | ปุ่ม :112, :209, :387 · stepper (S5) · กล่อง error :297 |
| O14 | กล่องว่างใน overlay `asset-evidence-drawer.tsx:102`, `ui/activity-drawer.tsx:72` | 2C ชุด 4 | commit เดียวกับ chrome ของ sheet |
| O15 | แผงและการ์ดหัวข้อในฟอร์ม (84 กล่องใน 29 ไฟล์) | 2D (K28) | 2C แก้เฉพาะที่ `FormSection` แทนหัวข้อมีเลข |
| O16 | ลิงก์กลับที่หัวหน้าฟอร์ม (14) | 2B | ลิงก์ "ยกเลิก" ที่ท้ายฟอร์มเป็นของ 2C |
| O17 | `notification-center-actions.tsx:119` | 2C ชุด 4 | `NativeSelect fieldSize="md"` |
| O18 | ลิงก์ข้อความในฟอร์ม `asset-form.tsx:1070`, `repair-record-form.tsx:122`, `system-settings-form.tsx:2076` (ปุ่มหน้าตาลิงก์) | 2C | commit เดียวกับไฟล์ของมัน · ลิงก์ที่เหลือเป็นของ 2D |
| O19 | `asset-label-batch-tool.tsx`, `asset-label-print.tsx`, `asset-scan-search-tool.tsx` | 2C ชุด 4 | ช่องและปุ่มทั้งไฟล์ |
| O20 | `audit-scan-search.tsx:51`, `audit-scan-room-picker.tsx:75` | ไม่แตะ | ใช้หน้าตา 2A แล้ว · ชุด 3 ทำแค่ `NativeSelect` ที่ `audit-scan-room-picker.tsx:86` · `global-search.tsx:133` → เฟส 3 · `master-data/master-data-layout.tsx:63` → 2B |
| O21 | dialog อนุมัติ/ปฏิเสธใน `audit-finding-review-actions.tsx` (:202, :345, :461) | 2C ชุด 1d | ถ้าจะรวม dialog ทำใน 1d · 2B เปลี่ยนแค่ trigger ที่แถว |

ไฟล์ที่ทั้งสองฝ่ายแก้แม้มีรั้ว: `asset-register-table.tsx`, `disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx`, `audit-findings-batch-actions.tsx`, `tests/visual-foundation-guards.test.ts` (budget) และ `DESIGN.md`

### 8.3 P0 บน master

งานเดียว 2 commit แต่ละ commit ผ่าน `npm test` และ tsc · ทำบน branch สั้นแล้ว merge เข้า `master` ก่อนแตก `feat/ui-phase2c` · P0 ไม่ deploy เอง (I22)

#### 8.3.1 `Segmented` (`src/components/ui/segmented.tsx` ไฟล์ใหม่)

ไม่มี `"use client"` และไม่มี hook (แบบเดียวกับ `Button`) · ผู้เรียกเป็น client component ที่ส่ง `onValueChange` มา

```tsx
export type SegmentedOption<T extends string | boolean> = {
  value: T
  label: React.ReactNode
  trailing?: React.ReactNode // ตัวนับหลังชื่อ (รายการห้อง)
}
export type SegmentedProps<T extends string | boolean> = {
  value: T
  options: readonly SegmentedOption<T>[]
  onValueChange: (value: T) => void
  "aria-label": string
  fill?: boolean      // .m-seg: เต็มความกว้าง ปุ่มกว้างเท่ากัน
  showCheck?: boolean // เครื่องหมายถูกหน้าตัวที่เลือก
  className?: string  // ใส่ที่กรอบเท่านั้น
}
```

| ส่วน | class |
|---|---|
| กรอบ (`role="group"` + `aria-label`) | `cn(fill ? "flex" : "inline-flex", "gap-0.5 rounded-md border border-border bg-surface p-0.5", className)` |
| ปุ่ม (`type="button"`, `aria-pressed`, key = `String(value)`) | `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0` |
| ความกว้าง | `fill` → `min-w-0 flex-1 px-2` · ไม่ `fill` → `px-3` |
| เลือกอยู่ | `bg-primary-soft font-semibold text-primary-hover` |
| ไม่ได้เลือก | `font-medium text-muted-foreground hover:bg-background hover:text-foreground` |
| เครื่องหมายถูก | `showCheck && selected` → `<Check className="size-3.5" aria-hidden="true" />` ก่อน `label` |

ต่อ class ของปุ่มด้วย template string ไม่ใช้ `cn()` และ `font-medium` กับ `font-semibold` ต้องไม่อยู่ใน string เดียวกัน (ตามคำอธิบายใน guard `visual-foundation-guards.test.ts:287`)

จุดเรียกใน P0:
- `system-settings-form.tsx:2543-2563` (`LabelAssetNameModeField`) → `<Segmented aria-label={label} value={compactEnabled} options={options} onValueChange={onChange} showCheck />`
- `audit-scan-room-list.tsx:81-95` → `<Segmented fill aria-label={t("roomListTabs")} value={tab} onValueChange={onTabChange} options={(["pending", "checked", "all"] as const).map(…)} />` โดย `trailing` = `<span className="tabular-nums">{counts[key]}</span>` เดิม

test ที่แก้ใน commit นี้:

| test:บรรทัด | เดิม | ใหม่ |
|---|---|---|
| `visual-foundation-guards.test.ts:275-290` | class string ของ segmented ทั้ง 2 จุด | อ่าน `ui/segmented.tsx`: มี class กรอบ ปุ่ม เลือกอยู่ และไม่ได้เลือกตามตารางบน · ไม่มี string ไหนมีทั้ง `font-medium` และ `font-semibold` · `globals.css` ยังมี `--radius-control: 6px;` · ทั้ง 2 ไฟล์ใช้ `<Segmented` |
| `asset-label-print-ui.test.ts:51-55` | `aria-pressed={isActive}` · `"bg-primary-soft font-semibold text-primary-hover"` · `focus-visible:ring-2 focus-visible:ring-ring` ในฟอร์ม | ฟอร์มมี `/<Segmented[\s\S]*showCheck/` และยังไม่มี `role="switch"` · `segmented.tsx` มี `aria-pressed={selected}`, string เลือกอยู่ และ `focus-visible:ring-2 focus-visible:ring-ring` |
| `audit-scan-room-ui.test.ts:37` | `aria-pressed={tab === key}` | `/<Segmented[\s\S]*value=\{tab\}/` (`:36` `(["pending", "checked", "all"] as const)` ยังผ่าน) |
| `audit-scan-room-ui.test.ts:83` | `role="group" aria-label={t("roomListTabs")}` | `/<Segmented[\s\S]*aria-label=\{t\("roomListTabs"\)\}/` |

#### 8.3.2 `Field labelAction` (`src/components/ui/field.tsx`)

```ts
type FieldProps = { /* เดิม */ labelAction?: React.ReactNode }
```

- ไม่มี `labelAction` → render เหมือนเดิม (`field.tsx:45-47`)
- มี `labelAction` → `<div className="flex min-w-0 items-center gap-1.5">{labelNode}{labelAction}</div>` โดย `labelNode` คือ `<FieldLabel …>` ตัวเดิม · ปุ่มใน `labelAction` จึงอยู่นอก `<label>`
- `hideLabel` ยังใช้ได้: ป้ายเป็น `sr-only` ปุ่มยังเห็น
- `Field` ยัง server-safe (ไม่มี hook เพิ่ม ไม่มี context)

ใน P0 ยังไม่มีที่ใช้ · 2C ใช้ครั้งแรกที่ `asset-form.tsx:1052` และ `:1081` (ชุด 1e แทน `AssetStateFieldLabel` `:1544-1561`) · 2B ใช้ใน `LabeledSelect`

test: เพิ่มใน `tests/field-primitives.test.ts` (ไม่มีบรรทัดเดิมพัง) · type มี `labelAction?: React.ReactNode` · source มี `{labelNode}{labelAction}` และ `labelAction` ไม่อยู่ใน children ของ `<FieldLabel` · `:92` (ไม่ใส่ `required`) ผ่านต่อ

#### 8.3.3 handle ของ trigger 3 ไฟล์ (O6)

ทำตามแบบ `TransactionCancelDialog` (`transaction-cancel-dialog.tsx:43-161`)

| ไฟล์ | type ที่ export | trigger ที่ซ่อนได้ | `open()` |
|---|---|---|---|
| `disposal/disposal-decision-button.tsx` | `DisposalDecisionButtonHandle = { open: () => void }` | `:96` | `setOpen(true)` |
| `disposal/disposal-execution-button.tsx` | `DisposalExecutionButtonHandle = { open: () => void }` | `:155` | `setOpen(true)` |
| `audit/audit-mark-not-found-button.tsx` | `AuditMarkNotFoundButtonHandle = { open: () => void }` | `trigger` `:65-87` (ปุ่ม :67 และ :77) | `openDialog()` (:25) |

prop ที่เพิ่มทั้ง 3 ไฟล์: `ref?: Ref<…Handle>` · `hideTrigger?: boolean` (ค่าตั้งต้น `false`) · `returnFocusRef?: RefObject<HTMLElement | null>`
- `useImperativeHandle(ref, () => ({ open: … }))`
- `{hideTrigger ? null : (…trigger…)}`
- โฟกัสกลับ: `returnFocusRef ?? triggerRef` · prop `triggerRef` ของ dialog ข้างใน (`disposal-decision-button.tsx:139`, `disposal-execution-button.tsx:186`) ขยาย type เป็น `RefObject<HTMLElement | null>` · `audit-mark-not-found-button.tsx` ส่ง `returnFocusRef` ให้ `AccessibleDialog` (:92) ซึ่งวันนี้ยังไม่ส่ง
- P0 ไม่แก้หน้าตา trigger

test ใหม่ `tests/dialog-trigger-handles.test.ts`: ทั้ง 3 ไฟล์มี `export type …Handle = { open: () => void }`, `useImperativeHandle(ref,`, `hideTrigger ? null` และ `returnFocusRef` · test เดิมที่อ่าน 3 ไฟล์นี้ (`audit-not-found-dialog.test.ts`, `disposal-detail-workspace.test.ts:73-82`, `disposal-evidence-exception.test.ts`) ไม่มีบรรทัดที่พัง

### 8.4 2C-0: primitive ก่อนชุด 1

commit แรกของ `feat/ui-phase2c` · ทำ primitive ทุกตัวที่ชุด 1 ใช้ให้เสร็จก่อนย้ายไฟล์แรก ส่วนนี้ระบุแค่ลำดับ เจ้าของ และ test · API อยู่ในส่วนที่ถือ K นั้น

| งาน | ไฟล์ | เปลี่ยน | K (ส่วนที่ถือ API) | test ที่แก้ |
|---|---|---|---|---|
| 0a dialog | `ui/accessible-dialog.tsx` | `AccessibleDialogBody` / `AccessibleDialogFooter` (opt-in) · `description?: ReactNode` | K9, K11 | test ใหม่ของส่วนที่ถือ K9 |
| | `ui/dialog.tsx:54, :80, :120` · `ui/sheet.tsx:51` | ปุ่มปิดเป็น `Button variant="ghost" size="icon"` ชื่อจาก `tCommon("close")` | K10 | `accessible-dialog.test.ts:28, :31` · `sheet-drawers-ui.test.ts:9, :11` |
| | `ui/alert-dialog.tsx:94` | แก้ class เดียว `flex-col-reverse` → `flex-col` (ปุ่มหลักอยู่ล่างบนมือถือ) | K8 (ข้อตัดสินย่อย 8) | ไม่มี · `confirm-dialog-ui.test.ts:13` ผ่านต่อ |
| 0b ไฟล์ | `ui/file-dropzone.tsx` | `description` ที่เห็นเสมอ · รับ `id` / `aria-describedby` / `aria-invalid` | K19 | `field-primitives.test.ts:131` |
| | `ui/file-queue-list.tsx` (ใหม่) | รายการไฟล์ที่รอส่ง | K19 | test ใหม่ |
| | `ui/scanner-text-input.tsx` | ส่ง `aria-label` ต่อให้ `Input` | K20 | ห้ามเพิ่ม `aria-label={labels.stop}` (`scanner-text-input.test.ts:200`) |
| 0c ช่อง | `ui/field-variants.ts` + `ui/field.tsx` | export class ของ `FieldLabel` ให้ `<legend>` ใช้ | K27 | เพิ่มใน `field-primitives.test.ts` |
| | `ui/form-context-banner.tsx` | แถว `dl` เงียบ | K24 | ไม่มี test เดิม |
| | `ui/choice-card.tsx` (ใหม่) | `ChoiceCard` · `ChoiceChip` บน input จริง + `has-checked:` | K16 | test ใหม่ |
| 0d โครงฟอร์ม | `ui/sticky-form-footer.tsx` (ใหม่) | `sticky bottom-0` ใน `<form>` ไม่มีเงา | K14 | guard R2: ไฟล์ที่ไม่อยู่ใน budget ได้ 0 (`visual-foundation-guards.test.ts:262-271`) |
| | `ui/form-section.tsx` (ใหม่) | หัวข้อมีเลขแบบกลาง | K18 | test ใหม่ |
| | `ui/steps.tsx` (ใหม่) | marker rail Look A | K17 (ข้อตัดสินย่อย 9) | test ใหม่ |
| | `tests/form-migration-guards.test.ts` (ใหม่) | ดูด้านล่าง | ส่วนนี้ | — |

`tests/form-migration-guards.test.ts` (ไฟล์ของส่วนนี้):
- `migratedFiles` เริ่มว่าง · commit สุดท้ายของแต่ละชุดย่อยเพิ่มไฟล์ของตัวเอง ลดลงไม่ได้
- G1 ไม่มี `function Field(` เหลือในไฟล์ที่ย้ายแล้ว
- G2 ไม่มี tag ไหนมีทั้ง `busy=` และ `disabled=` ที่อ้างตัวแปรเดียวกัน (ส่วนที่ถือ K13 เขียนเงื่อนไข)
- G3 ใน `<form>` ของไฟล์ที่ย้ายแล้ว ช่องใต้ `Field required` ยังมี `required` ของตัวเอง หรือ `<form>` มี `noValidate` + `validate(` (ส่วนที่ถือ K4 เขียนเงื่อนไข)
- G4 budget ต่อไฟล์ของช่องที่เขียนเอง ตั้งต้นจาก `p2c-map/critic-2c-fields-perfile.json` (เฉพาะไฟล์ 2C) · ไฟล์ของชุดที่เสร็จต้องเป็น 0 ยกเว้นที่ระบุในชุดนั้น · นับด้วยตัวอ่าน tag ที่ข้าม `{…}` (เพิ่ม helper ใน `tests/helpers/source-files.ts`) เพราะ `=>` ใน `onChange` ทำให้ regex `[^>]*` หยุดก่อนถึง `type=`

### 8.5 แก้บั๊ก ZodError ใน plan 1

#### 8.5.1 ตอนนี้

- `errorResponse` ส่ง `{ error: error.message }` (`src/lib/api-response.ts:4-16`) · `ZodError` ผ่าน `isExposableError` (`src/lib/api-error-exposure.ts:7-15`) · zod 4.4.1 ให้ `message` เป็น JSON ของทุก issue
- `getApiErrorKey` หาแบบตรงทั้งข้อความ (`src/lib/api-error-catalog.ts:261-263`) JSON จึงไม่เคยตรง key · ผู้ใช้เห็น toast "เกิดข้อผิดพลาด" + JSON เป็นบรรทัดที่สอง (`use-api-error.ts:21`) · changelog รอบคำไทยเลื่อนเรื่องนี้ไว้ ("รายละเอียด Zod เป็นบรรทัดที่สองของ error")
- route ที่ parse zod: **61 ไฟล์ 71 จุด** (`\w+Schema\.(safe)?[pP]arse\(` ใน `src/app/api`) แบ่งเป็น:

| ทางออกของ ZodError | ไฟล์ |
|---|---|
| `errorResponse(error, 400)` ตรง ๆ | 54 (ในนั้น `suppliers/route.ts` และ `suppliers/[id]/route.ts` เรียก `getSupplierApiError` ก่อน จึงได้ `{ error: "Invalid supplier data", fieldErrors }` และไม่ถึง `errorResponse`) |
| จับ `ZodError` เองแล้วส่งต่อ | 4: `assets/[id]/checkout/route.ts:225-228` (ยก `HANDOVER_*` เป็น `{ code, error }` ที่เหลือไป `errorResponse`) · `disposal-requests/[id]/route.ts:209-215` (ยก `evidenceExceptionReason` ที่เหลือไป `errorResponse`) · `bulk-decision/route.ts:75` · `bulk-execution/route.ts:43` |
| `assetTransactionCancellationErrorResponse` (`src/lib/asset-transaction-cancellation-route.ts:5-15`, `:10` = `{ error: error.message }`) | 3: `asset-{checkins,checkouts,transfers}/[id]/cancel/route.ts` |

ที่อื่นที่ส่ง `error.message` ออกไปแต่ ZodError ไปไม่ถึง: `ldap-sync/route.ts:96` และ `notifications/digest/route.ts:66` (เขียนลงสถานะ scheduler ไม่มี parse zod) · `integration-auth.ts:129` (Integration v1 ไม่ใช้ `errorResponse` และไม่มี parse zod) · ไม่แก้ทั้ง 3 จุด

#### 8.5.2 แก้ (commit ของตัวเอง ไม่มี `fieldErrors`)

`src/lib/api-error-exposure.ts` เพิ่ม:

```ts
import { ZodError } from "zod"

/** A ZodError's message is the JSON of every issue (zod 4). Send one fixed text instead; the V track adds fieldErrors. */
export function validationFailedBody(error: unknown) {
  if (!(error instanceof ZodError)) return null
  return { error: "Invalid request data", code: "VALIDATION_FAILED" } as const
}
```

เขียน `error: "Invalid request data"` ตรง ๆ ในไฟล์ เพื่อให้ test `api-error-catalog.test.ts:48-58` (ทุกข้อความ `error: "…"` ฝั่ง server ต้องมีคำแปล) เห็นข้อความนี้

`src/lib/api-response.ts` (import เพิ่ม `validationFailedBody`):

```ts
export function errorResponse(error: unknown, fallbackStatus = 500) {
  const validation = validationFailedBody(error)
  if (validation) return NextResponse.json(validation, { status: 400 })
  if (!isExposableError(error)) {
    return NextResponse.json({ error: hideUnexpectedError(error).text }, { status: 500 })
  }
  // ที่เหลือเหมือนเดิม
}
```

`src/lib/asset-transaction-cancellation-route.ts` ใส่ 2 บรรทัดเดียวกันเป็นบรรทัดแรกใน `if (!(error instanceof AssetTransactionCancellationServiceError))` ก่อน `if (!isExposableError(error))` · `:10` คงไว้

`src/lib/api-error-catalog.ts` เพิ่ม 2 แถว (เรียงตามตัวอักษรเหมือนเดิม):
- `"Invalid request data": "validationFailed",`
- `"VALIDATION_FAILED": "validationFailed",` (เพราะ checkout ส่ง `payload?.code ?? payload?.error` ให้ `getCheckoutErrorMessage` `checkout-form.tsx:166, :357-366` ซึ่งคืนรหัสดิบ)

ข้อความใหม่ (ผ่าน `node scripts/messages-edit.mjs` · ไม่มีคำเลิกใช้ใน `docs/19_THAI_GLOSSARY.md`):

| key | th | en |
|---|---|---|
| `apiErrors.validationFailed` | ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง ตรวจสอบแล้วลองอีกครั้ง | Invalid request data |

en ตรงกับข้อความ server ตามแบบของ key อื่นใน `apiErrors` (เช่น `assetNotFound` = "Asset not found") หน้าภาษาอังกฤษจึงไม่มีบรรทัดซ้ำ (`api-error-catalog.test.ts:26-29`)

สถานะยังเป็น 400 ทุก route (วันนี้ทุกทางส่ง 400 อยู่แล้ว) · Integration v1 ไม่เปลี่ยน

#### 8.5.3 ผลที่ผู้ใช้เห็น

| ทางที่ client อ่าน error | ไฟล์ตัวอย่าง | ก่อน | หลัง |
|---|---|---|---|
| `throw new Error(payload?.error …)` → `apiError.toast` | ฟอร์มข้อมูลหลัก · admin users/roles · asset form · audit | "เกิดข้อผิดพลาด" + JSON | "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง ตรวจสอบแล้วลองอีกครั้ง" + บรรทัดเล็ก "Invalid request data" |
| รหัสก่อนแล้วข้อความ: `getDisposalApiErrorMessage` (`src/lib/disposal-error-message.ts:37-44`) · checkin `:267-272` | disposal request/batch/decision/execution · checkin | JSON | ข้อความไทยเดียวกัน (รหัส `VALIDATION_FAILED` ไม่อยู่ในชุดที่แปลเอง จึงตกไปที่ `payload.error`) |
| checkout `getCheckoutErrorMessage` | `checkout-form.tsx:166` | JSON | ข้อความไทยเดียวกัน + บรรทัดเล็ก "VALIDATION_FAILED" |
| `ApiErrorText` (6 จุด เช่น `asset-batch-form.tsx:844`) | | JSON ใต้ช่อง | ข้อความไทย + บรรทัดเล็ก |
| ข้อความกลางที่ไม่อ่าน `error` (`getMaintenanceErrorMessage` `maintenance-api-errors.ts:42-48` · bulk disposal `copy.errors[code] ?? …`) | ฟอร์มซ่อม · PM · bulk disposal | "เกิดข้อผิดพลาด" | ไม่เปลี่ยน (V track) |
| supplier | `supplier-form.tsx` | error ใต้ช่อง | ไม่เปลี่ยน |

ยังไม่ทำในชุดนี้ (V track): `fieldErrors` · ข้อความ zod ที่ตั้งเอง 32 ข้อความซึ่งมี key อยู่แล้วแต่ไปไม่ถึง (เช่น `"End date must be after start date"` `api-error-catalog.ts:104`) · ข้อความกลางของทาง maintenance

#### 8.5.4 test

- ใหม่ใน `tests/api-error-exposure.test.ts` (ต่อจาก `:68`):
  - `z.object({ name: z.string().min(1) }).safeParse({ name: "" }).error` ผ่าน `validationFailedBody` ได้ `{ error: "Invalid request data", code: "VALIDATION_FAILED" }` และ `JSON.stringify` ของผลไม่มี `too_small`
  - `validationFailedBody(new Error("Asset not found"))` ได้ `null`
  - source ของ `api-response.ts` และ `asset-transaction-cancellation-route.ts` มี `validationFailedBody(error)` ก่อน `if (!isExposableError(error))` (เทียบ `indexOf`) และมี `NextResponse.json(validation, { status: 400 })`
- ใหม่ใน `tests/api-error-catalog.test.ts`: `getApiErrorKey("Invalid request data")` และ `getApiErrorKey("VALIDATION_FAILED")` ได้ `"validationFailed"` · `describeApiError("Invalid request data", thai)` ได้ `{ message: "TH:validationFailed", detail: "Invalid request data" }`
- ผ่านต่อโดยไม่แก้ (route ไม่ถูกแตะ): `disposal-route-structure.test.ts:152-156` (`if (error instanceof ZodError) return errorResponse(error, 400)`), `:227-238` (`error instanceof ZodError`, `issue.path[0] === "evidenceExceptionReason"`, ไม่มี `catch (error) { return errorResponse(error, 400)`) · `disposal-bulk-execution-route.test.ts:133-134` (mock `errorResponse` ของตัวเองที่ `:36-41`) · `api-error-exposure.test.ts:53-60`, `:62-68` (literal เดิมยังอยู่ครบ) · `api-error-catalog.test.ts:48-67`

ตรวจบนแอป dev: บันทึกสาขาด้วยรหัส `"   "` (ผ่าน `required` ของเบราว์เซอร์แต่ไม่ผ่าน zod) แล้วเห็น toast ไทยไม่มี JSON

### 8.6 ชุด 1 (26 ไฟล์ · 179 ช่อง)

ลำดับ 1a → 1b → 1c → 1d → 1g → 1e → 1f (เล็กก่อน ให้ primitive ได้ลองก่อนไฟล์ใหญ่)

| ชุดย่อย | ไฟล์ | ช่อง | chk/radio | `Field` เดิม (call) | dialog | ปุ่ม (L1) | trigger | `Loader2` ทั้งไฟล์ | test ที่อ่านไฟล์ |
|---|---|---|---|---|---|---|---|---|---|
| 1a maintenance | 4 | 21 | 2 | 22 | 4 (ทำ 3) | 8 (ทำ 6) (4) | 3 | 5 | 7 |
| 1b asset-operations | 6 | 16 | 1 | 15 | 1 | 8 (5) | 0 | 5 | 5 |
| 1c disposal | 5 | 22 | 2 | 21 | 2 | 10 (4) | 2 | 5 | 5 |
| 1d audit | 4 | 9 | 1 | 0 | 5 | 13 (6) | 6 | 10 | 10 |
| 1g master-data | 1 | 6 | 1 | 4 | 0 | 6 (2) | 0 | 2 | 2 |
| 1e assets | 4 | 46 | 8 | 30 | 1 | 29 (5) | 1 | 8 | 13 |
| 1f admin | 2 | 59 | 4 | 46 | 1 | 21 (4) | 0 | 4 | 8 |
| **รวม** | **26** | **179** (64% ของ 281) | **19** | **138** (70% ของ 197) | **14 (ทำ 13)** | **95 (ทำ 93)** (**30**) | **12** | **39** | **45 ไฟล์ไม่ซ้ำ** |

"ทำ 3" และ "ทำ 6": dialog ลบไฟล์แนบ `maintenance-attachments.tsx:239` และปุ่ม `:241`, `:248` ไปชุด 5 ตาม K12 (ข้อตัดสินย่อย 7)

รายไฟล์ ("เรื่องเฉพาะ" บอกแค่จุดที่ต้องระวังและ K ที่เกี่ยว · วิธีทำอยู่ในส่วนที่ถือ K นั้น):

| # | ไฟล์ (`src/components/`) | ช่อง | chk | `Field` เดิม | dialog | ปุ่ม (L1) | trigger | `Loader2` | test | เรื่องเฉพาะ |
|---|---|---|---|---|---|---|---|---|---|---|
| **1a** | | | | | | | | | | |
| 1 | `maintenance/maintenance-plan-form.tsx` | 5 | 0 | `:159` ×5 | – | 1 (1) | – | 1 | 3 | `MaintenanceOptionSelect` ×2 (2A แล้ว) · `assetId` มีแค่ดอกจัน `:87` → V |
| 2 | `maintenance/repair-record-form.tsx` | 5 | 1 | `:249` ×6 | – | 1 (1) | – | 1 | 3 | `inputClass` `:20` สูง 44 ที่ md+ (K7) · `Choice` `:261` → `ChoiceCard` (K16) · legend `:147`, `:157` (K27) · input ไฟล์ดิบ `:217` → `FileDropzone multiple` + `FileQueueList` (K19) · `FormContextBanner` `:104` (K24) · ลิงก์ `:122` (O18) · ปุ่มเปิดปิด `:188` · คง `uploadRepairFiles(payload.id, files` (`repair-record-ui.test.ts:38`) |
| 3 | `maintenance/repair-record-actions.tsx` | 10 | 1 | `:220` ×11 | `:107`, `:157`, `:178` (มี `<form>` ใน dialog → parts K9) | 4 (2) | `:95`, `:98`, `:103` | 2 | 2 | `inputClass` `:19` · radio card `:127-137` → `ChoiceCard` · legend `:128` · input ไฟล์ดิบ `:148` → `FileDropzone multiple` |
| 4 | `maintenance/maintenance-attachments.tsx` | 1 | 0 | – | `:239` → ชุด 5 | 2 → ชุด 5 | – | 1 | 3 | `<select>` `:108` · `FileDropzone` `:120` (K19 description) · การ์ดไฟล์แนบ `:146`, `:185`, `:202` เป็นของ 2D |
| **1b** | | | | | | | | | | |
| 5 | `asset-operations/checkin-form.tsx` | 7 | 0 | `:588` ×6 + `Select` `:600` ×3 | – | 4 (2) | – | 2 | 4 | `<form>` `:291` เป็น `noValidate` · `SearchableSelect` ×3 · ช่องค้นหา `:353` → `SearchField` (K21) · `FormContextBanner` `:294` · `SignaturePad` `:531`, `:538` · toast guard 4 ตัวคงไว้ (K4) |
| 6 | `asset-operations/checkout-form.tsx` | 4 | 1 | `:406` ×5 + `Select` `:418` ×2 | – | 1 (1) | – | 1 | 2 | radio card `:230-268` → `ChoiceCard` · legend `:231` · `FormContextBanner` `:183` และ `:272` (`:272` เป็นข้อความธรรมดา K24) · `Field` ห่อ `FileDropzone` `:306` (ป้ายซ้อน K19) · `SignaturePad` `:320` |
| 7 | `asset-operations/transfer-form.tsx` | 2 | 0 | `:168` ×2 | – | 1 (1) | – | 1 | 1 | `SearchableSelect` ×4 · `FormContextBanner` `:127` |
| 8 | `asset-operations/bulk-move-form.tsx` | 3 | 0 | `:141` ×2 | – | 1 (1) | – | 1 | 0 | ช่องค้นหา `:90` → `SearchField` · แถวเลือก `:104` ต้องบอกสถานะเลือก (K16) · `toLocationId` มีแค่ดอกจัน → V |
| 9 | `asset-operations/signature-pad.tsx` | 0 | 0 | – | – | 1 (0) | – | 0 | 0 | ปุ่มล้าง `:115` → `Button variant="ghost" size="sm"` ใต้ canvas (K25) |
| 10 | `ui/operation-review-dialog.tsx` | 0 | 0 | – | `:36` | 0 + `Button` `:55-56` | – | 0 | 1 | `disabled={busy}` → `busy` (โฟกัสหลุดเพราะ `initialFocusRef` อยู่ที่ปุ่มยืนยัน) |
| **1c** | | | | | | | | | | |
| 11 | `disposal/disposal-request-form.tsx` | 4 | 0 | `:227` ×4 + `Select` `:239` ×1 | – | 2 (1) | – | 1 | 2 | `FormStep` `:223` → `FormSection` (K18 · `disposal-forms-ux.test.ts:11`) · เงิน `:145`, `:155` (K26) · `requestedById` มีแค่ดอกจัน `:129` → V |
| 12 | `disposal/disposal-batch-form.tsx` | 4 | 0 | `:130` ×4 | – | 4 (1) | – | 1 | 3 | `FormStep` `:129` (`disposal-forms-ux.test.ts:12`) · `min-h-11` ไม่มีโฟกัส `:113`, `:116`, `:117` · เงิน `:116-117` · ท้ายฟอร์ม `:84` |
| 13 | `disposal/disposal-execution-button.tsx` | 8 | 2 | `:245` ×8 | `:212` (`<form>` `:222`) | 2 (1) | `:155` | 1 | 2 | เงิน `:230-231` · คง `aria-describedby` และ `maxLength={2000}` (`disposal-evidence-exception.test.ts:157-162`) |
| 14 | `disposal/disposal-asset-picker.tsx` | 1 | 0 | – | – | 0 | – | 1 | 1 | `:58` → `Input` + `role="combobox"` (K21) · listbox `:60` · ปุ่มในช่อง `:57`, `:62` |
| 15 | `disposal/disposal-decision-button.tsx` | 5 | 0 | `:210` ×5 | `:157` (`<form>` `:167`) | 2 (1) | `:96` | 1 | 1 | เงิน `:186`, `:189` |
| **1d** | | | | | | | | | | |
| 16 | `audit/audit-scan-check-form.tsx` | 2 | 1 | – (`AuditScanCheckField`) | – | 3 (1) | – | 2 | 6 | `Button` `:342` แยก `busy={saving}` กับ `disabled={disabled \|\| missingPhoto}` · ปุ่มเปิดปิด `:235`, `:261` · คง `multiple` ไว้บรรทัดของตัวเอง (`audit-scan-search-ui.test.ts:147`) · checkbox แก้ข้อมูลอยู่ใต้ `{saveLabel}` (`audit-scan-check-ui.test.ts:41-42`) |
| 17 | `audit/audit-finding-review-actions.tsx` | 5 | 0 | – | `:202`, `:345`, `:461` | 6 (3) | `:95`, `:105`, `:118`, `:127` | 5 | 2 | ปุ่มยกเลิกไม่มี hover `:245` และอีก 2 จุด · ปุ่มยืนยันสีตาม action `:248` · O21 |
| 18 | `audit/audit-mark-not-found-button.tsx` | 1 | 0 | – | `:92` | 2 (1) | `:67`, `:77` | 2 | 1 | `<textarea` → `Textarea` (`audit-not-found-dialog.test.ts:14`) · ปุ่มยืนยัน `:138` → `warning` (K22) · ท้าย dialog `:129` |
| 19 | `audit/audit-scan-component-missing-dialog.tsx` | 1 | 0 | – | `:34` | 2 (1) | – | 1 | 2 | ปุ่มยืนยัน `:77` → `warning` (K22) |
| **1g** | | | | | | | | | | |
| 20 | `master-data/asset-model-form.tsx` | 6 | 1 | `:455` ×4 | – | 6 (2) | – | 2 | 2 | แถวสเปก (repeater) `:309-334` · `FileDropzone` · `useConfirm` ×1 (ชุด 5 ปรับหน้าตา) |
| **1e** | | | | | | | | | | |
| 21 | `assets/asset-form.tsx` | 27 | 5 | `:1532` ×18 + `SelectField` `:1564` ×6 | – | 10 (1) | – | 1 | 8 | แถบ `fixed` `:1501-1516` → `StickyFormFooter` (K14) · `AssetStateFieldLabel` `:1544-1561` → `Field labelAction` ที่ `:1052`, `:1081` · error ซ้ำ `:849`, `:918` → `Field error` · `ScannerTextInput` ใน `Field` ที่เป็น `<label>` `:896` · เงิน `:1152`, `:1240` · วันที่ `:1159`/`:1162` (`min` → V) · ชิปรูป `:1318-1340` → `ChoiceChip` · ฟิลด์เพิ่มเติม `:1607` · ลิงก์ `:1070` (O18) · `Section` `:1523` ไม่มีเลข จึงคงไว้ (K28) |
| 22 | `assets/asset-batch-form.tsx` | 13 | 3 | `:1138` ×12 + `SelectField` `:1150` ×8 | – | 11 (2) | – | 2 | 3 | ชิปคอลัมน์ `:1106-1135` → `ChoiceChip` · ลบ `aria-label` ที่เป็นคำอธิบาย `:866`, `:917` (K20) · `Field` ที่เป็น `<label>` ห่อ scanner `:869` · เงิน `:738` · วันที่ `:745`/`:748` · `ApiErrorText` `:844` · คงชื่อ `<BatchOptionalColumnToggle` และ `Field label=` เป็น prop แรก (`asset-batch-form-layout.test.ts:13, :22-23`) |
| 23 | `assets/asset-component-manager.tsx` | 5 | 0 | – | `:557` | 8 (2) | `:526` | 3 | 3 | `Steps` สำหรับติดตั้ง 3 ขั้น (K17 · คง `type InstallStep` `:35`) · `<datalist>` `:324`/`:331` · `datetime-local` `:346` · ท้ายฟอร์ม `:373`, `:399` · แถวผู้สมัคร `:483-495` (K16) · เลิกสลับคำ `:580` (K13) · คง `FileDropzone file={removeEvidence}` `:574` (`confirm-text-dialog-ui.test.ts:21`) |
| 24 | `assets/asset-attachments.tsx` | 1 | 0 | – | – | 0 | – | 2 | 2 | `<select>` ไม่มีชื่อ `:263` (K20) · `FileDropzone` `:233`, `:274` |
| **1f** | | | | | | | | | | |
| 25 | `admin/system-settings-form.tsx` | 50 | 3 | `:2328` ×46 | `:1347` (อยู่ใน `<form>` `:936`) | 17 (4) | – | 4 | 8 | **ห้ามแก้ `:937-956`** (O7) · แถบบันทึก `:2099` → `StickyFormFooter` · dialog คำนำหน้ารหัส: ใช้ footer part **ไม่ใส่ `<form>` ซ้อน** และแทน `sticky bottom-0` `:1464` · `closeLabel={labels.cancel}` `:1352` (K10) · ค้นหา `:963`, `:2279` → `SearchField` · `WizardStep` `:2347` ×7 → `FormSection` และเลิกการ์ดชั้นที่ 3 (K18) · `SectionHeader` `:2789` · `ToggleField` `:2361` · `ValidationMessage` ×13 คงไว้ (V) · ปุ่มหน้าตาลิงก์ `:2076` (O18) · คงการ์ด LDAP `:1703` (`settings-ldap-role-ui.test.ts:20-21`) |
| 26 | `admin/depreciation-policy-builder.tsx` | 9 | 1 | – | – | 4 (0) | – | 0 | 1 | ตัวเลือกกลุ่ม `:211-225` → `ChoiceChip` · `<details>` `:316` คงไว้ · ค้นหา `:392` → `SearchField` · `<textarea` → `Textarea` (`settings-depreciation-policy-ui.test.ts:53`) |
| 1f | `src/lib/mobile-field-navigation.ts:16-24` | | | | | | | | | K15: `/admin/settings` + `new`/`[id]/edit` 24 route เป็น focus · ตรวจ G11b ที่ 375 และ 768 ก่อน commit นี้ (ข้อตัดสินย่อย 16) |

test ที่อ่านไฟล์ของแต่ละชุดย่อย (ไม่ใช่จำนวนที่ต้องแก้ · ใช้เป็นรายการที่ต้องรันซ้ำ):
- 1a: `attachment-preview-dialog-ui` `maintenance-attachments-ui` `maintenance-i18n` `maintenance-option-select` `pm-plans-ui` `repair-record-detail-ui` `repair-record-ui`
- 1b: `asset-handover-checkin` `asset-handover-checkout` `asset-operation-confirmation-ui` `checkin-send-to-repair-ui` `legacy-checkin-flow`
- 1c: `disposal-batch` `disposal-detail-workspace` `disposal-evidence-exception` `disposal-forms-ux` `disposal-route-structure`
- 1d: `audit-component-scan-ui` `audit-finding-resolution` `audit-mobile-flow-completion` `audit-not-found-dialog` `audit-out-of-scope-actual-field` `audit-scan-check-ui` `audit-scan-result-semantics` `audit-scan-search-ui` `ui-overlay-guards` `visual-foundation-guards`
- 1g: `confirm-dialog-ui` `master-data-brand-supplier-ui`
- 1e: `asset-batch-form-layout` `asset-clone-ui` `asset-component-manager` `asset-custodian-scope-ui` `asset-form-sticky-actions` `asset-model-selection` `asset-operation-status-policy` `asset-return-navigation` `asset-status-help-ui` `attachment-preview-dialog-ui` `confirm-dialog-ui` `confirm-text-dialog-ui` `visual-foundation-guards`
- 1f: `asset-label-print-ui` `attachment-preview-dialog-ui` `pm-generation-removed` `settings-depreciation-policy-ui` `settings-ldap-role-ui` `settings-tab-persistence-ui` `system-log-history` `visual-foundation-guards`

### 8.7 test ของ plan 1

**ตาราง A: test เดิมที่ต้องแก้** (แก้ใน commit เดียวกับที่ทำให้พัง)

| test:บรรทัด | ตอนนี้ยึด | แก้เป็น | งาน |
|---|---|---|---|
| `visual-foundation-guards.test.ts:275-290` | class ของ segmented 2 จุด | ข้อ 8.3.1 | P0 |
| `asset-label-print-ui.test.ts:51-55` | segmented ในฟอร์มตั้งค่า | ข้อ 8.3.1 | P0 |
| `audit-scan-room-ui.test.ts:37`, `:83` | `aria-pressed={tab === key}` · `role="group" aria-label={t("roomListTabs")}` | ข้อ 8.3.1 | P0 |
| `accessible-dialog.test.ts:28`, `:31` | `closeLabel = "Close"` · `min-h-11 min-w-11` | ตามส่วนที่ถือ K10 | 0a |
| `sheet-drawers-ui.test.ts:9`, `:11` | เหมือนกันใน `sheet.tsx` | ตามส่วนที่ถือ K10 | 0a |
| `field-primitives.test.ts:131` | `"mt-1 block text-meta text-faint-foreground"` 2 ครั้ง | ตามส่วนที่ถือ K19 | 0b |
| `audit-scan-check-ui.test.ts:22` | `disabled={saving \|\| disabled \|\| missingPhoto}` | `busy={saving}` + `disabled={disabled \|\| missingPhoto}` | 1d |
| `audit-not-found-dialog.test.ts:14` | `/<textarea/` | `/<Textarea/` | 1d |
| `asset-form-sticky-actions.test.ts:10-16` | `pb-36 sm:pb-24` · `fixed bottom-3` · `lg:left-[calc(16rem+1.5rem)]` · `bg-surface/95` · `backdrop-blur` · `sm:flex-row sm:items-center sm:justify-end` · `<Save className="h-4 w-4" />` | ใช้ `<StickyFormFooter` และไม่มี `fixed bottom-3` / `lg:left-[calc(` ตามส่วนที่ถือ K14 | 1e |
| `asset-form-sticky-actions.test.ts:22-25` | `disabled={saving \|\| isProtectedStatusChange \|\| duplicateState.checking \|\| …}` | `busy={saving}` + เงื่อนไขที่เหลือใน `disabled` | 1e |
| `visual-foundation-guards.test.ts:267` | budget `asset-form.tsx: 1` | ลบแถว (0) | 1e |
| `visual-foundation-guards.test.ts:266` | budget `system-settings-form.tsx: 2` | 1 (เหลือตัวอย่างป้าย) | 1f |
| `settings-depreciation-policy-ui.test.ts:53` | `/<textarea[\s\S]*onPolicyJsonChange/` | `/<Textarea[\s\S]*onPolicyJsonChange/` | 1f |
| `mobile-field-navigation.test.ts:13-26`, `:28-46` | รายการ navigation และ focus route | focus เพิ่ม `/th/admin/settings` · `new` และ `x/edit` ของ master-data 9 ชนิด (รวม `brands/models`), `admin/users`, `admin/roles`, `maintenance/pm` · navigation เพิ่ม `/th/maintenance/pm` (ข้อตัดสินย่อย 16) | 1f |

**ตาราง B: test ใหม่ใน plan 1**

| ไฟล์ | ตรวจ | งาน |
|---|---|---|
| `tests/dialog-trigger-handles.test.ts` | ข้อ 8.3.3 | P0 |
| เพิ่มใน `tests/field-primitives.test.ts` | `labelAction` (8.3.2) · class ของ legend (K27) | P0, 0c |
| `tests/form-migration-guards.test.ts` | G1–G4 (ข้อ 8.4) | 0d แล้วขยายทุกชุดย่อย |
| test ของ primitive ใหม่ (`choice-card`, `sticky-form-footer`, `form-section`, `steps`, `file-queue-list`, parts ของ dialog) | ตามส่วนที่ถือ K | 0a–0d |
| เพิ่มใน `api-error-exposure.test.ts` และ `api-error-catalog.test.ts` | ข้อ 8.5.4 | ZodError |

**ตาราง C: ผ่านได้ถ้าคงชื่อ ลำดับ หรือ prop (เขียนลงข้อจำกัดของแต่ละงานใน plan)**

| test:บรรทัด | ต้องคง |
|---|---|
| `asset-batch-form-layout.test.ts:13`, `:22-23` | `<BatchOptionalColumnToggle` · `Field label={t("batchAssetTag")}` / `Field label={t("batchSerialNumber")}` โดย `label=` เป็น prop แรก |
| `confirm-text-dialog-ui.test.ts:21` | `FileDropzone file={removeEvidence}` (`file=` ต่อจากชื่อ tag) |
| `audit-scan-search-ui.test.ts:147`, `:153` | `multiple` อยู่บรรทัดของตัวเองใน `audit-scan-check-form.tsx` · prop `multiple?: boolean` |
| `asset-component-manager.test.ts:27` | `type InstallStep = "identify" \| "details" \| "review"` |
| `audit-scan-check-ui.test.ts:41-42`, `:50` | checkbox แก้ข้อมูลอยู่หลัง `{saveLabel}` · `border-warning-border bg-warning-soft` ใน `audit-scan-check-field.tsx` |
| `repair-record-ui.test.ts:38` | `uploadRepairFiles(payload.id, files` |
| `disposal-evidence-exception.test.ts:157-162` | `aria-describedby={evidenceExceptionReasonHelpId}` · `maxLength={2000}` |
| `disposal-forms-ux.test.ts:11-12` | identifier `FormStep` ในทั้ง 2 ฟอร์ม หรือแก้ regex ใน commit เดียวกัน (K18) |
| `settings-ldap-role-ui.test.ts:20-21` | การ์ด LDAP `:1703` `overflow-visible rounded-lg border border-border bg-surface"` |
| `settings-tab-persistence-ui.test.ts:8-13` | ไม่แตะ `:937-956` |
| `scanner-text-input.test.ts:194-200` | ไม่เพิ่ม `aria-label={labels.stop}` |
| `confirm-dialog-ui.test.ts:13` | ไม่แก้ `confirm-dialog.tsx` ใน plan 1 |
| `field-primitives.test.ts:92` | `Field` ไม่ใส่ `required` เอง |

### 8.8 ประตู deploy (I22)

**สิ่งที่ขึ้น Production พร้อมกัน:** Production รัน `ab1b873` (deploy 2026-10-08 · wiki `ams-status.md:58`) · ยังไม่ deploy 56 commit `ab1b873..5ffee76` (คำไทยรอบ B3 + S9 · `--db-env` · เฟส 1 · 2A) + P0 + plan 1 ทั้งหมด · ห้าม deploy ส่วนใดส่วนหนึ่งก่อน: ไม่ deploy 2A เดี่ยว (I22) ไม่ deploy หลังชุดย่อยใดชุดย่อยหนึ่ง และไม่ deploy `master` ที่มี P0 แต่ยังไม่มี plan 1

**ฐานข้อมูลและ env:** ไฟล์ migration ในช่วงนี้มีไฟล์เดียว `prisma/manual-migrations/2026-10-08-thai-status-wording.sql` ซึ่ง apply บน Production แล้ว 2026-10-08 (`ams-status.md:48`) · plan 1 ไม่มี migration และไม่มีตัวแปร env ใหม่ · ไม่มีคำสั่ง SQL ไหนต้องขออนุมัติ

**ก่อน deploy (เรียงตามลำดับ):**
1. `npm run verify` ผ่านบน commit ที่ merge แล้ว
2. ดูซ้ำบน production build (`next build` + `next start`) แบบเดียวกับ 2A ข้อ 13
3. G11b ที่ 375 และ 768 บนแอป dev **ก่อน** commit K15 ในชุด 1f · หลัง commit ดูว่าแถบล่างหายใน 25 route และยังอยู่ในหน้ารายการ
4. ทุกหน้าของชุด 1 ที่ 375 · 700 · 768 · 1440 ภาษาไทยเป็นหลัก ภาษาอังกฤษ 1 รอบ · คีย์บอร์ด · forced colors · เทียบภาพก่อนและหลัง:

| หน้า | ไฟล์ | ดูอะไรเป็นพิเศษ |
|---|---|---|
| แผน PM ใหม่/แก้ · บันทึกซ่อมใหม่ · รายละเอียดงานซ่อม (3 dialog + ไฟล์แนบ) | 1a | radio card · คิวไฟล์ · footer ไม่เลื่อนหาย |
| ส่งมอบ · รับคืน · โอน · ย้ายหลายรายการ + dialog ตรวจทาน + ลายเซ็น | 1b | ปุ่มล้างลายเซ็นไม่ขึ้นหลายบรรทัดที่ 375 · ปุ่มยืนยัน `busy` โฟกัสไม่หลุด |
| ขอตัดจำหน่าย · ขอเป็นชุด · รายละเอียด (dialog พิจารณาและดำเนินการ) | 1c | หัวข้อ `FormSection` · ช่องเงินมีหน่วย |
| สแกนตรวจนับ (แผ่นตรวจ) · รายการไม่ตรง (3 dialog) · ไม่พบทรัพย์สิน · ชิ้นส่วนหาย | 1d | ปุ่ม `warning` · `busy` ของปุ่มบันทึก |
| รุ่นใหม่/แก้ | 1g | |
| เพิ่ม/แก้ทรัพย์สิน · เพิ่มเป็นชุด · ติดตั้งชิ้นส่วน · ไฟล์แนบ | 1e | `StickyFormFooter` ตอนเมนูข้างพับและกาง (G11) · `Steps` บนมือถือ "ขั้นที่ x จาก y" |
| ตั้งค่าระบบ ครบ 11 แท็บ + ตัวสร้างนโยบายค่าเสื่อม | 1f | กด Enter ในช่องของ dialog คำนำหน้ารหัสแล้วฟอร์มตั้งค่าทั้งหน้า**ไม่**บันทึก (critic R4) · แถบบันทึกไม่ทับแถบล่าง |
| หน้าที่ไม่อยู่ในชุด 1 แต่ใช้ primitive ที่ 2C-0 แก้ | sheet กรองและ ⋯ ของทะเบียน · ลิ้นชักหลักฐาน · ลิ้นชักกิจกรรม · ตัวเลือกห้องและแผ่นตรวจตอนสแกน · ลบผ่าน `useConfirm` · `ConfirmTextDialog` ของรายการไม่ตรง | ปุ่มปิดภาษาไทย · ลำดับปุ่มบนมือถือ (K8) |

5. ส่งข้อมูลผิดหนึ่งครั้ง (ข้อ 8.5.4) แล้วเห็น toast ไทยไม่มี JSON
6. งานค้างจากเฟส 1 และ 2A ที่ผู้ใช้ต้องทำเอง: พิมพ์ทดสอบป้ายความร้อน (เฟส 1 · `ams-open-questions`) · NVDA · iPhone/iPad จริง
7. ผู้ใช้อนุมัติการ deploy

**deploy:** ตาม `DEPLOYMENT_UBUNTU_CLOUDFLARE.md` หัวข้อ 19 · หลัง deploy ลอง login, ทะเบียน, ส่งมอบ 1 รายการพร้อม dialog ตรวจทาน, รายละเอียดตัดจำหน่าย, หน้าสแกน และบันทึกตั้งค่า 1 ค่า · cache PWA เปลี่ยนเป็น `asset-system-pwa-v2` แล้วตั้งแต่เฟส 1 เครื่องผู้ใช้จึงได้ไฟล์ใหม่

**ถอยกลับ:** deploy `ab1b873` อีกครั้ง · ทำได้เพราะในช่วงนี้ไม่มี schema เปลี่ยน และ migration ชื่อสถานะทำงานกับ `ab1b873` อยู่แล้ว

**ทางสำรอง K3 (c):** ถ้าเวลาไม่พอ ตัดชุด 1f ออกจากประตู (−59 ช่อง หน้าตั้งค่ายังปนกันบน Production) แล้วให้ 1f ไปกับชุด 2 · ใช้ได้เมื่อผู้ใช้อนุมัติตอนนั้นเท่านั้น · ถ้าตัด K15 ไปด้วย ให้ย้าย commit route ไปกับ 1f

### 8.9 ชุด 2–5

ตัวเลขจาก `scripts-08/b1-perfile.txt` · ทุกชุด deploy เอง หลัง `npm run verify` และตรวจบนแอป dev ของหน้าที่แก้

**ชุด 2 ข้อมูลหลัก (8 ไฟล์ · 46 ช่อง · 9 chk · `Field` 44 call · ปุ่ม 26 (L1 8) · `Loader2` 8 · test 3)**

| ไฟล์ (`master-data/`) | ช่อง | chk | `Field` | ปุ่ม | หมายเหตุ |
|---|---|---|---|---|---|
| `branch-form.tsx` | 5 | 1 | ×5 | 2 | |
| `brand-form.tsx` | 1 | 1 | – | 2 | |
| `category-form.tsx` | 9 | 2 | ×8 | 12 | รายการรูปเลื่อนขึ้นลง `:509-545` · `CustomFieldTemplateEditor` |
| `company-form.tsx` | 6 | 1 | ×6 | 2 | |
| `department-form.tsx` | 3 | 1 | ×3 | 2 | |
| `employee-form.tsx` | 10 | 1 | ×10 | 2 | |
| `location-form.tsx` | 6 | 1 | ×6 | 2 | |
| `supplier-form.tsx` | 6 | 1 | ×6 | 2 | error ใต้ช่องที่มีอยู่ 6 ช่องย้ายเข้า `Field error=` (K4) · error ตอนนี้อยู่ใน `<label>` `:297` · แก้ `supplier-form-ui.test.ts:18-20` |

test ที่อ่าน: `master-data-return-navigation` `supplier-form-ui` `ui-overlay-guards`

**ชุด 3 disposal · audit · maintenance ที่เหลือ (9 ไฟล์ · 16 ช่อง · 9 chk · `Field` 6 · dialog 5 + sheet 2 · ปุ่ม 14 (L1 5) · `Loader2` 13 · test 10)**

| ไฟล์ | ทำ | หมายเหตุ |
|---|---|---|
| `disposal/disposal-bulk-approval.tsx` | dialog `:505-565` เท่านั้น | ไฟล์ร่วมกับ 2B (O4) |
| `disposal/disposal-bulk-execution.tsx` | dialog `:812-986` + `SharedValueFields` `:999` | footer `sticky bottom-0` `:939` → footer part · แก้ `disposal-bulk-execution-ui.test.ts:31` · `visual-foundation-guards.test.ts:26-28` ถ้าหัว dialog เปลี่ยน |
| `audit/audit-round-form.tsx` | 6 ช่อง · `Field` ×6 | วันที่ `:145`/`:148` (`min` → V) |
| `audit/audit-round-cancel-button.tsx` | dialog + trigger `:66` | |
| `audit/audit-findings-batch-actions.tsx` | ฝั่ง dialog | checkbox `:109` เป็นของ 2B (O5) · ไฟล์ร่วม |
| `audit/audit-scan-room-picker.tsx` | chrome ของ sheet + `NativeSelect` `:86` | ไม่แตะ `:75` (O20) |
| `audit/audit-scan-check-panel.tsx` | chrome ของ sheet | `visual-foundation-guards.test.ts:26` |
| `maintenance/maintenance-plan-state-actions.tsx` | dialog + trigger `:50` | dialog นี้คงไว้ ไม่เปลี่ยนเป็น `useConfirm` (K12) |
| `ui/confirm-text-dialog.tsx` | `disabled={busy}` `:85-86` → `busy` | |

**ชุด 4 admin · assets · อื่น ๆ ที่เหลือ (18 ไฟล์ · 32 ช่อง · 11 chk · `Field` 9 · dialog 4 + sheet 2 · ปุ่ม 17 (L1 7) + 3 ปุ่มของหน้านำเข้า · `Loader2` 14 · test 21)**

| ไฟล์ | หมายเหตุ |
|---|---|
| `admin/admin-user-form.tsx` · `admin/role-permission-form.tsx` | `Field` ×5 และ ×4 · ตาราง permission `:230`, `:247` |
| `admin/IntegrationClientManager.tsx` | `closeLabel={labels.cancel}` `:395` (K10) · กล่อง error `:384` อยู่หลัง dialog ที่เปิด · token แสดงครั้งเดียว + ปุ่มคัดลอก (`integration-api-client-admin.test.ts:141`) |
| `admin/asset-state-review-dialog.tsx` | เลิกสลับคำ `:102` (K13) |
| `admin/data-quality-rule-form.tsx` | ช่องไม่มีชื่อ `:81` (K20) |
| `assets/asset-label-batch-tool.tsx` · `asset-label-print.tsx` · `asset-scan-search-tool.tsx` | O19 · คำอธิบาย `:313` → `FieldHint` (`asset-label-print-ui.test.ts:155`) · แถบเครื่องมือของหน้าพิมพ์คงแบบเดิม + `focus-within:` (K21) |
| `assets/asset-status-correction-button.tsx` | trigger `:56` |
| `assets/asset-register-table.tsx` | dialog `:697-774` เท่านั้น (O1) · ไฟล์ร่วม |
| `assets/asset-import-preview-panel.tsx` | ทั้งไฟล์ (O13) · `Steps` (S5) · ปุ่ม `:112`, `:209`, `:387` (เลิกสลับคำ K13) · กล่อง error `:297` |
| `assets/asset-evidence-drawer.tsx` · `ui/activity-drawer.tsx` | chrome ของ sheet + กล่องว่าง `:102` / `:72` (O14) |
| `assets/asset-create-workspace.tsx` | ปุ่มสลับโหมด `:20-38` → `Segmented` |
| `asset-operations/transaction-cancel-dialog.tsx` | trigger `:123` + footer · `asset-transaction-cancellation-ui.test.ts:13` |
| `auth/login-form.tsx` | `Input` + `Field` · ปุ่มแสดงรหัสผ่านคงไว้ · `Button busy` · กล่อง `:58-66` และ `:129-133` เป็น `Notice` (คง `role="alert"` + `aria-live`) · แก้ `login-form-ui.test.ts:29-30` (K13) · โครงหน้า login → เฟส 3 |
| `reports/report-preset-controls.tsx` · `notifications/notification-center-actions.tsx` | 1 ช่องต่อไฟล์ · `:119` → `NativeSelect fieldSize="md"` (O17) |

**ชุด 5 ข้ามโดเมน (หลัง 2B merge · 5 ไฟล์ + 4 หน้า)**
- `ActionBar` เดียว แทน `ui/mobile-action-bar.tsx` + `disposal/disposal-mobile-action-bar.tsx` (K23) + padding 4 หน้า (O11) ใน commit เดียว · แก้ `mobile-action-bar.test.ts:16-20`, `visual-foundation-guards.test.ts:91-93`, `audit-scan-search-ui.test.ts:187-188`, `disposal-detail-workspace.test.ts:35, :44-48`
- `DisposalWorkflowStepper` → `Steps` (K17) · คงไฟล์และชื่อเป็นตัวแปลง (`disposal-detail-workspace.test.ts:9, :12`)
- `AlertDialog` / `useConfirm` ปรับหน้าตา (K12) · คำกริยาของ confirm "ยืนยัน" 4 จุด · `maintenance-attachments.tsx:239` → `useConfirm` · แก้ `confirm-dialog-ui.test.ts:13` ถ้านิพจน์ variant เปลี่ยน
- แถวแท็บตั้งค่า `system-settings-form.tsx:937-956` → `TabNav` ของ 2B (O7)
- guard: budget G4 ของไฟล์ 2C ทุกตัวเป็น 0 (ยกเว้นที่ชุด 4 ระบุ)

### 8.10 สิ่งที่ 2C ไม่ทำ

| ไปที่ | เรื่อง |
|---|---|
| 2B | O1–O5 (ตัวกรองและการเลือกแถว) · `FilterSelect`/`ReportSelect` 30 จุด · เนื้อใน sheet ของทะเบียน · ลิงก์กลับที่หัวหน้าฟอร์ม 14 จุด · `TabNav` · `master-data-layout.tsx:63` · รายการห้องในหน้าสแกน (หลัง P0) · โครงหน้า (PageHeader, padding ของหน้า ยกเว้น O11) |
| 2D | แผงและการ์ดหัวข้อ 84 กล่องใน 29 ไฟล์ (K28 · O15) · ปุ่มที่เขียนเองนอกฟอร์มและ dialog · ค่าตั้งต้นของปุ่มเป็น 36 · `linkVariants` ที่เหลือ (O18) · กล่องแจ้งและกล่องว่างนอก overlay · การ์ดไฟล์แนบ (`maintenance-attachments.tsx:146`, `:185`, `:202`) · ปุ่มลอย `shadow-lg` ของ admin users/roles · budget ทุกตัวเป็น 0 |
| เฟส 3 | `ActionBar` แบบ ⋯ ของต้นแบบ (K23) · โครงหน้า login · ช่องค้นหาบนแถบบน `global-search.tsx:133` (`.gsearch`, Ctrl K) |
| V track | ทุกอย่างในข้อ 8.11 |

### 8.11 V track (โครง · สเปกและ plan แยก)

เริ่มเขียนสเปกหลังชุด 1 อยู่บน Production (Q1 = K4 a) · ไม่อยู่ใน plan 1–5

| เรื่อง | ตามที่ผู้ใช้เลือก |
|---|---|
| commit แรก (K6 a) | `validationFailedBody` (ข้อ 8.5) เพิ่ม `fieldErrors: { [path[0]]: code }` ตามแบบ `getSupplierApiError` (`src/lib/supplier-api-error.ts:10-47`) ให้ใช้ได้ทุก route · Integration v1 ไม่เปลี่ยน · ขออนุมัติการแก้ server ครั้งนี้ |
| ฝั่ง client (K5 a) | `validate()` ต่อฟอร์ม + hook กลาง 1 ตัว (ไม่เพิ่ม dependency) · โฟกัสช่องแรกที่ผิด (ตั้งค่าเปลี่ยนแท็บก่อน) · ลบ toast ตรวจกรอก คง toast ของ `catch` · เงื่อนไขเนื้อหา → error ใต้ช่อง · เงื่อนไขที่ต้องมีก่อน → บรรทัดเหตุผลผูก `aria-describedby` · ข้อความกลาง `common.validation.*` · `min={start}` ให้วันที่ 4 คู่ (`asset-batch-form.tsx:745/:748`, `asset-form.tsx:1159/:1162`, `audit-round-form.tsx:145/:148`, `asset-label-batch-tool.tsx:447/:456`) · `SearchableSelect` ที่มีแค่ดอกจันได้ `error=` |
| ขนาดงาน | ตัวเลขของแผนที่ validation (§1, §4: guard toast 39 ตัว เป็น toast อย่างเดียว 24 · ของหน้าตั้งค่า 12 · ประตูปิดเงียบ 11) ส่วนนี้ไม่ได้นับใหม่ · สเปก V ต้องนับใหม่ที่ HEAD ตอนนั้น |
| ลำดับ | ทีละโดเมน หลังชุดภาพของโดเมนนั้น merge แล้ว · ไม่แก้ไฟล์ที่ branch ของชุดภาพที่เปิดอยู่กำลังแก้ |
| test ที่ V แก้ | `supplier-form-ui.test.ts:18-20` (ถ้าชุด 2 ยังไม่แก้) · `settings-depreciation-policy-ui.test.ts:69`, `:77` · test ใหม่ของข้อ 8.5.4 · G3 ใน `form-migration-guards` (`noValidate` + `validate(`) |

### 8.12 การแบ่ง plan

**plan 1 = P0 + 2C-0 + แก้ ZodError + ชุด 1** (ชื่อแนะนำ `docs/superpowers/plans/<วันที่>-ui-phase2c-1.md`) · ผู้ทำแต่ละงานเป็น subagent และ session หลักรีวิวทุกงาน · ทุก commit ผ่าน `npm test` และ tsc

| # | งาน | ต้องรอ |
|---|---|---|
| 0 | ตรวจฐาน: ถ้า `master` ไม่ใช่ `5ffee76` ให้รัน `scripts-08/b1-perfile.mjs` ใหม่ก่อนเชื่อตัวเลข | — |
| 1 | P0-a `Segmented` + 2 จุดเรียก + test 3 ไฟล์ | 0 |
| 2 | P0-b `Field labelAction` + handle 3 ไฟล์ + `dialog-trigger-handles.test.ts` → merge เข้า `master` แล้วแตก `feat/ui-phase2c` | 1 |
| 3–6 | 2C-0: 0a dialog · 0b ไฟล์ · 0c ช่อง · 0d โครงฟอร์ม + guard | 2 |
| 7 | แก้ ZodError (commit ของตัวเอง) | 2 |
| 8 | 1a | 3–7 |
| 9–10 | 1b (ฟอร์ม 4 ไฟล์ · ลายเซ็น + dialog ตรวจทาน) | 8 |
| 11 | 1c | 9–10 |
| 12 | 1d | 11 |
| 13 | 1g | 12 |
| 14–16 | 1e (asset-form · asset-batch-form · component-manager + attachments) | 13 |
| 17–19 | 1f (ช่องและหัวข้อ · dialog, แถบบันทึก, ค้นหา · builder + K15) | 14–16 |
| 20 | `npm run verify` + production build + ตรวจบนแอป dev (ข้อ 8.8 ข้อ 1–5) | 17–19 |
| 21 | เอกสาร (DESIGN.md · `docs/14_UI_UX_DESIGN_SYSTEM.md` · DEVELOPER_HANDOFF · changelog) + wiki `ams-status` / `ams-log` / `ams-open-questions` + `wiki-lint` | 20 |

**plan 2, 3, 4** = ชุด 2, 3, 4 ชุดละ plan · ทำได้หลัง plan 1 merge · ชุด 3 และ 4 มีไฟล์ร่วมกับ 2B จึง rebase ถ้า 2B merge ก่อน
**plan 5** = ชุด 5 หลัง 2B merge
**V track** = สเปกของตัวเองแล้วค่อย plan

### 8.13 ข้อความใหม่ของส่วนนี้

| key | th | en | ใช้ที่ |
|---|---|---|---|
| `apiErrors.validationFailed` | ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง ตรวจสอบแล้วลองอีกครั้ง | Invalid request data | catalog: `"Invalid request data"` และ `"VALIDATION_FAILED"` |

P0 ใช้ key ที่มีอยู่แล้ว (`roomListTabs` · `labels` ของฟอร์มตั้งค่า) · ข้อความใหม่ของ primitive และหน่วยเงินอยู่ในส่วนที่ถือ K17, K19, K26

### 8.14 ข้อตัดสินย่อย

1. **2B เริ่มหลัง plan 1 merge** · ตีความ "2C ก่อน 2B" ว่า 2C ได้ลง P0 และชุด 1 ก่อน · plan 2–4 ทำคู่กับ 2B ได้ · plan 5 รอ 2B
2. **แก้ ZodError เป็น commit ของตัวเองหลัง 2C-0 ก่อน 1a** การตรวจทุกหน้าของชุด 1 จึงเห็นข้อความไทยแล้ว
3. **helper อยู่ใน `api-error-exposure.ts`** (ไฟล์ที่ตัดสินว่าข้อความไหนส่งออกได้) · เขียน literal ในไฟล์ให้ test catalog เห็น · ZodError ได้ 400 เสมอ ไม่ขึ้นกับ `fallbackStatus`
4. **key ใหม่ `validationFailed` ไม่ใช้ `invalidRequest` ซ้ำ** เพราะ en ของ `invalidRequest` คือ "Invalid JSON body" ซึ่งความหมายผิด
5. **catalog มีแถวของรหัส `VALIDATION_FAILED` ด้วย** เพราะ checkout ส่งรหัสก่อนข้อความ
6. **ชุด 1 ส่งข้อความคงที่ข้อความเดียว** ข้อความ zod ที่ตั้งเอง 32 ข้อความยังไปไม่ถึงผู้ใช้จนถึง V
7. **`maintenance-attachments.tsx:239` กับปุ่ม `:241`, `:248` ไปชุด 5** ตาม K12 ("In batch 5") · 1a ไม่แตะ dialog นี้ จะได้ไม่ทำ 2 รอบ · ชุด 1 จึงทำ dialog 13 จาก 14 และปุ่ม 93 จาก 95
8. **`alert-dialog.tsx:94` แก้ class เดียวใน 2C-0** (`flex-col-reverse` → `flex-col`) ให้ทุก dialog บน Production เรียงปุ่มแบบ K8 ตั้งแต่ประตู deploy · การปรับหน้าตาทั้งหมดของ K12 ยังอยู่ชุด 5
9. **`ui/steps.tsx` สร้างใน 2C-0** ไม่ใช่ใน 1e · primitive ทุกตัวเสร็จก่อนย้ายไฟล์แรก
10. **`Segmented` สูงแบบเดียว** (44 ใต้ md · 32 ตั้งแต่ md) · รายการห้องที่ md+ เตี้ยลงจาก 36 เป็น 32 · ใส่ `focus-visible:ring-offset-2` ทั้ง 2 จุด (ต้นแบบมี outline-offset 2px)
11. **`Segmented` รับค่า `string | boolean`** เพราะฟอร์มตั้งค่าใช้ boolean (`compactEnabled`)
12. **P0 เป็นงานเดียว 2 commit บน branch สั้น** แล้ว merge เข้า `master` (ไม่ commit ตรงบน master)
13. **guard ของ 2C อยู่ไฟล์ใหม่ `tests/form-migration-guards.test.ts`** ไม่เพิ่มใน `visual-foundation-guards.test.ts` ที่ 2B แก้ด้วย
14. **O4 แก้ช่วงบรรทัด:** dialog ของ bulk execution คือ `:812-986`
15. **O7 สลับเป็น `TabNav` ในชุด 5** (หลัง 2B merge) ไม่ปล่อยไป 2D
16. **K15 ทั้ง 25 route ลงใน 1f commit เดียว** แม้ฟอร์มข้อมูลหลักจะปรับหน้าตาในชุด 2 · การซ่อนแถบล่างไม่ขึ้นกับหน้าตาฟอร์ม · ใน commit เดียวกันให้ `/maintenance/pm` (หน้ารายการ PM) กลับเป็น navigation เพราะวันนี้ `/^\/maintenance\/[^/]+$/` (`mobile-field-navigation.ts:22`) จับมันเป็น focus ซึ่งขัดกับ "หน้ารายการคงแถบล่าง" (Q4) · เพิ่ม test case `/th/maintenance/pm` → navigation
17. **K3 (c) ใช้ได้เมื่อผู้ใช้อนุมัติตอนนั้นเท่านั้น**
18. **ชื่อ handle** `DisposalDecisionButtonHandle` · `DisposalExecutionButtonHandle` · `AuditMarkNotFoundButtonHandle` และขยาย type ของ `triggerRef` ใน dialog ข้างในเป็น `RefObject<HTMLElement | null>`
19. **หนึ่งชุดหนึ่ง plan** · V track แยก

### 8.15 ความเสี่ยง

1. **ประตู deploy ใหญ่มาก:** Production กระโดดจาก `ab1b873` ข้าม 56 commit (คำไทย + S9 · เฟส 1 · 2A) และ plan 1 ประมาณ 21 งาน · ป้องกันด้วยตรวจบนแอป dev ครบตารางข้อ 8.8 และถอยกลับไป `ab1b873` ได้
2. **2C-0 แก้ `ui/` ที่หน้านอกชุด 1 ใช้** (ปุ่มปิด dialog/sheet · ลำดับปุ่ม `AlertDialog`) หน้าเหล่านั้นเปลี่ยนตั้งแต่ประตู deploy · อยู่ในตารางตรวจข้อ 8.8 แล้ว
3. **submit ทะลุ portal:** dialog คำนำหน้ารหัส (`system-settings-form.tsx:1347`) อยู่ใน `<form>` `:936` · ถ้าใส่ `<form>` ซ้อน Enter จะบันทึกทั้งหน้า · ต้องลองด้วยคีย์บอร์ด
4. **ข้อความ error เปลี่ยนสำหรับทุก route ที่ parse zod (59 จาก 61)** · checkout แสดงบรรทัดเล็ก "VALIDATION_FAILED" · ทาง maintenance และ bulk disposal ยังได้ข้อความกลางเหมือนเดิม
5. **P0 แตะหน้าสแกนตรวจนับ** (รายการห้อง) ซึ่งใช้งานจริงอยู่ · ความสูงที่ md+ เปลี่ยน · `audit-scan-room-ui.test.ts` ต้องแก้ 2 บรรทัด
6. **ไฟล์ร่วมกับ 2B 6 ไฟล์** · ฝ่ายที่ merge ทีหลัง rebase · ถ้า 2B เลื่อน plan 5 เลื่อนตาม (แถบมือถือของหน้ารายละเอียดยังเป็นแบบเดิม)
7. **ตัวเลขผูกกับ `5ffee76`** · ถ้า `master` ขยับก่อนเริ่ม ให้รันสคริปต์ใหม่ (งาน 0) · ตัวเลขของ V track มาจากแผนที่และยังไม่ได้นับใหม่
8. **pin ที่ขึ้นกับรูปแบบโค้ด** (ตาราง C) พังได้ถ้า formatter จัดบรรทัดใหม่ · เขียนลงข้อจำกัดของแต่ละงาน
9. **G11b ยังไม่ได้ดูบนเบราว์เซอร์** · ต้องดูก่อน commit K15
10. **งานค้างที่ต้องใช้คน** (พิมพ์ทดสอบป้าย · NVDA · iPhone/iPad) กั้นประตู deploy · ถ้าไม่ทำ ประตูเปิดไม่ได้
11. **dialog ลบไฟล์แนบของงานซ่อมยังเป็นแบบเดิมจนถึงชุด 5** (ข้อตัดสินย่อย 7) เห็นเป็นจุดเดียวที่ปนในหน้ารายละเอียดงานซ่อม
