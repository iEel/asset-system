> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2c-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** (I1–I36) · ตัวเลขและบรรทัดอ้างที่ `master` `5ffee76`

## 4. ย้ายช่องกรอกในฟอร์มและ dialog

ส่วนนี้ย้ายช่องกรอกที่เขียน class เองในฟอร์มและ dialog ของ 2C ไปใช้ primitive ของ 2A ได้แก่ `Input`, `NativeSelect`, `Textarea`, `Field` (กับ `FieldLabel`, `FieldHint`), `SearchField` และ `checkboxVariants` ทุกชุด (1a–1g, 2, 3, 4) ใช้กติกาเดียวกันในข้อนี้ ชุดที่ 5 ไม่มีช่องกรอก

ส่วนนี้เปลี่ยนแค่หน้าตา ป้ายชื่อ และการผูก id กับ aria ไม่เปลี่ยนการตรวจข้อมูล (K4) และไม่เพิ่ม token (I21)

เรื่องที่ไม่อยู่ในส่วนนี้ และส่วนที่เป็นเจ้าของ:

- **ส่วน P0:** slot `labelAction` ของ `Field`, `ui/segmented.tsx` และ handle `open()`/`hideTrigger`
- **ส่วน primitive ของ 2C-0:** แก้ `file-dropzone.tsx` (K19), `scanner-text-input.tsx`, `form-context-banner.tsx` และสร้าง `StickyFormFooter`, `FormSection`, `ChoiceCard`/`ChoiceChip`, `FileQueueList` · ค่าคงที่ `fieldLabelClasses` (K27) ลงใน commit ของ 2C-0 แต่ชื่อและค่ากำหนดไว้ในข้อ 4.12 นี้
- **ส่วนปุ่ม:** ทุกปุ่มในไฟล์เหล่านี้ รวมปุ่ม "ใช้ชื่อที่แนะนำ" ใน `Field` ชื่อทรัพย์สิน ปุ่มแสดงรหัสผ่าน และปุ่มลบแถวของ repeater · `Loader2` → `busy`
- **ส่วน dialog:** โครง body/footer, ปุ่มปิด X, `description`
- **ส่วนตัวเลือกและขั้นตอน:** radio แบบการ์ด R1–R3 (`ChoiceCard`), chip T4–T6, `FormStep`/`WizardStep` → `FormSection`, `Steps`
- **ส่วน V track:** `noValidate` + `validate()`, error ใต้ช่องที่ยังไม่มีวันนี้, `min={start}` ของช่องวันที่ 4 คู่, รูปแบบ error ของ ZodError
- **2B:** ช่องกรองฝั่ง server 33 ช่องใน 12 ไฟล์, `FilterSelect`/`ReportSelect` (O2), ช่องและ checkbox ใน `asset-register-*` ยกเว้น dialog แก้หลายรายการ (O1), `Filter` ของ `asset-state-review-workspace.tsx` (O3), checkbox เลือกแถวของ disposal bulk และ audit findings (O4, O5)
- **ไม่แตะเลย:** `audit-scan-search.tsx:51` และ `audit-scan-room-picker.tsx:75` (O20) · `layout/global-search.tsx:133` (เฟส 3)

path ในส่วนนี้นับจาก `src/components/` ถ้าไม่ได้ขึ้นต้นด้วย `src/`, `tests/` หรือ `messages/`

### 4.1 สภาพตอนนี้ (นับซ้ำที่ `5ffee76`)

นับด้วย TypeScript AST ของ repo (`typescript` 5.9.3) และ grep สคริปต์อยู่ที่ `scratchpad/p2c-spec/s04/` (`scan.mjs`, `report.mjs`, `inv2.mjs`) ได้ 269 ไฟล์ 8798 element เท่ากับที่ critic นับ

| เรื่อง | ค่าที่ `5ffee76` | หมายเหตุ |
|---|---|---|
| ช่องของ 2C ในไฟล์ของชุด 1–4 | **272 ช่องใน 51 ไฟล์** (`input` 179 · `select` 48 · `textarea` 45) | 281 ของแผนที่ = 272 + `audit-scan-room-picker.tsx:75` (ไม่แตะ) + 8 ช่องของ 2B และเฟส 3 |
| ชุด 1 | 179 ช่องใน 24 ไฟล์ที่มีช่อง (รวม `signature-pad.tsx` และ `ui/operation-review-dialog.tsx` ที่ไม่มีช่อง = 26 ไฟล์) | ตรงกับ K3 |
| `function Field` ของไฟล์ | 25 ตัว เรียก 197 ครั้ง · 71 ครั้งส่ง `required` | ตรง |
| ของที่ `Field` ของไฟล์ห่อ | `input` ไม่มี type หรือ text 78 · number 35 · date 16 · email 3 · password 2 · tel 1 · `select` 29 · `textarea` 28 · `ScannerTextInput` 2 · `FileDropzone` 1 · `input[file]` 2 | ตรง |
| `Field` ที่มีของอื่นนอกจากช่องอยู่ใน `<label>` | 16 ครั้ง (ข้อ 4.4) | ตรง |
| select wrapper ของ 2C | 7 ตัว เรียก 48 ครั้ง (ข้อ 4.5) | ตรงกับ O2 |
| ช่องที่ไม่มีชื่อ | 19 ช่อง + `ScannerTextInput` 2 จุด + ช่องที่ `aria-label` เป็นข้อความช่วย 2 ช่อง (ข้อ 4.8) | ตรง |
| ช่องที่สูง 44px บนจอ ≥`md` | **35** | K7 เขียน 36 · ช่องที่ 36 คือ `admin/asset-state-review-workspace.tsx:239` ซึ่งเป็นของ 2B (O3) |
| ความสูงช่องบรรทัดเดียว (227 ช่อง) | `h-10` 150 · `min-h-11 sm:h-10` 31 · `min-h-11` 17 · `h-11` 15 · `h-10 min-h-11` 3 · `h-11 sm:h-10` 2 · `h-9` 2 · `h-7` 2 · ไม่มีความสูง 4 · helper 1 | |
| disabled | 37 ช่อง: ไม่มีหน้าตา **22** · `disabled:opacity-60` 9 · `disabled:opacity-50` 1 · ผ่าน `<fieldset disabled>` 4 · `disabled:bg-muted` 1 | ตรง |
| ช่องวันที่ | 23 ช่องใน 14 ไฟล์ (date 22 + datetime-local 1) · มี `min` ช่องเดียว (`asset-operations/checkout-form.tsx:290`) | ตรง |
| ช่องเงิน (`step="0.01"`) | 14 ช่อง · มีหน่วยในป้าย 3 · มี `inputMode="decimal"` 3 · ใช้ป้าย 6 key | ช่อง `step={0.01}` อีก 2 ช่องใน `depreciation-policy-builder.tsx:186, :241` เป็นร้อยละ ไม่ใช่เงิน |
| checkbox และ radio | 49 tag: ของ 2C **41** (checkbox 38 + radio 3) · ของ 2B 8 | |
| เป้ากดเล็กกว่า 44px | 12: ของ 2C **9** · ของ 2B 3 (`assets/asset-register-table.tsx:544, :615`, `disposal/disposal-bulk-approval.tsx:448`) | K16 เขียน 12 ซึ่งรวมของ 2B ไว้ด้วย |
| `required` บนช่อง | 87 ใน 32 ไฟล์ · `maxLength` 97 (ช่อง 94 + `ScannerTextInput` 3) · `minLength` 7 | ตรง |
| ดอกจันแดงของไฟล์ (`ml-1 text-danger">*`) | 32 จุดใน 25 ไฟล์ ไม่มีจุดไหน `aria-hidden` | ตรง |
| ช่องที่มี `required` แต่ไม่มีดอกจัน | **12** (ไม่นับ login 2 ช่อง) | แผนที่นับ 1 เพราะนับเฉพาะใน `Field` ของไฟล์ |
| ดอกจันที่ช่องไม่มี `required` | 3: `asset-operations/checkin-form.tsx:401`, `assets/asset-form.tsx:988`, `:1116` | แผนที่อ้างบรรทัดของ `Field` (:400, :987, :1115) |
| error ใต้ช่องที่มีอยู่แล้ว | 8: `master-data/supplier-form.tsx` 6 + `assets/asset-form.tsx:849, :918` | ตรง |
| คำอธิบายใต้ช่องแบบ `text-xs text-muted-foreground` | 53 บรรทัดในไฟล์ของ 2C (regex ใน F6) | แผนที่นับ 54 ทั้ง 58 ไฟล์ |
| `<legend>` / `<fieldset>` | 6 / 7 | ตรง |
| ค่าคงที่ class ช่องของไฟล์ | 8 ตัว (F3) | |
| `readOnly` · `<select multiple>` · prop `size` · spread props บนช่อง | 0 ทุกอย่าง | ไม่มีอะไรชนกับ `Omit<…, "size" \| "multiple">` |
| ชื่อชนกับ primitive (`Input`, `Textarea`, `FieldLabel` ฯลฯ ที่ประกาศเองนอก `ui/`) | 0 | มีแค่ `Field` 25 ไฟล์ และ `Select` 4 ไฟล์ |

### 4.2 สิ่งที่ต้องมีก่อน

| ต้องมี | มาจาก | ใช้ที่ |
|---|---|---|
| `Field` prop `labelAction?: React.ReactNode` วางข้าง `FieldLabel` นอก `<label>` | ส่วน P0 (K2) · ถ้า P0 ตั้งชื่ออื่น ให้ใช้ชื่อของ P0 | `assets/asset-form.tsx:1051`, `:1080` (ชุด 1e) |
| `fieldLabelClasses` ใน `ui/field-variants.ts` | 2C-0 (K27, ค่าในข้อ 4.12) | legend 6 จุด |
| `ScannerTextInput` ส่ง `disabled` ให้ `Input` ด้วย (ข้อตัดสินย่อย 5) | 2C-0 | `assets/asset-form.tsx:897` |
| `FileDropzone` รับ `id`/`aria-describedby` (K19) | 2C-0 | `Field` 3 ครั้งที่ห่อไฟล์ (ข้อ 4.4) |
| `ChoiceCard` | ส่วนตัวเลือกและขั้นตอน | radio 3 ตัว (ข้อ 4.12) |

`Input`, `NativeSelect`, `Textarea`, `Field`, `SearchField` และ `checkboxVariants` ใช้ตามที่ 2A ส่งมอบ ส่วนนี้ไม่แก้ API ของมัน

### 4.3 กติกาการย้าย (ใช้กับทุกไฟล์)

**F1. แปลง tag**

| เดิม | ใหม่ | import |
|---|---|---|
| `<input>` ไม่มี type หรือ type `text`, `email`, `tel`, `password`, `number`, `date`, `datetime-local` | `<Input>` | `@/components/ui/input` |
| `<select>` | `<NativeSelect>` | `@/components/ui/native-select` |
| `<textarea>` | `<Textarea>` | `@/components/ui/textarea` |
| ช่องค้นหาที่มีไอคอนนำ 6 ช่อง | `<SearchField>` (ข้อ 4.9) | `@/components/ui/search-field` |
| `<input type="checkbox">`, `<input type="radio">` | คง tag เดิม + `className={checkboxVariants()}` (ข้อ 4.12) | `@/components/ui/field-variants` |

- props อื่นส่งต่อเหมือนเดิมทุกตัว: `value`, `onChange`, `ref`, `required`, `maxLength`, `minLength`, `min`, `max`, `step`, `pattern`, `inputMode`, `autoComplete`, `name`, `list`, `placeholder`, `disabled`, `autoFocus`, `aria-*`
- `ref` เป็น prop ธรรมดาใน React 19 จึงใช้กับ `initialFocusRef` ได้ทันที (7 ช่องของ 2C มี `ref`: `admin/asset-state-review-dialog.tsx:85`, `asset-operations/transaction-cancel-dialog.tsx:148`, `assets/asset-component-manager.tsx:572`, `auth/login-form.tsx:93`, `disposal/disposal-decision-button.tsx:170`, `disposal/disposal-execution-button.tsx:225`, `ui/confirm-text-dialog.tsx:73`)
- type ที่คำนวณได้ 2 จุดเข้ากับ `InputType` โดยไม่ต้อง cast: `assets/asset-form.tsx:1758` และ `auth/login-form.tsx:93`
- `<datalist>` ที่ `assets/asset-component-manager.tsx:331` คงไว้ ช่อง `:324` ส่ง `list=` ผ่าน `Input` ได้

**F2. class: ลบชุดหน้าตา คงชุดจัดวาง**

| ลบ (primitive มีให้แล้ว) | คงไว้ใน `className` |
|---|---|
| ความสูง `h-7`, `h-9`, `h-10`, `h-11`, `min-h-11`, `sm:h-10`, `sm:min-h-0` · `w-full` · `rounded`, `rounded-md` · `border`, `border-border`, `border-input` · `bg-background`, `bg-surface`, `bg-transparent` · `px-3`, `py-2` · `text-sm`, `text-base`, `text-foreground` · `font-normal` · `outline-none`, `focus:outline-none`, `transition-colors` · ทุก `focus:*` และ `focus-visible:*` · ทุก `disabled:*` · `resize-y`, `resize-none` · `mt-1`, `mt-2` ที่ใช้เว้นระหว่างป้ายกับช่อง | `font-mono` · `uppercase` · `text-right` · ความกว้าง (`w-*`, `min-w-*`, `sm:w-auto`) · `flex-1`, `sm:flex-1` · ตำแหน่งใน grid · `min-h-16`, `min-h-20`, `min-h-28`, `min-h-32` ของ textarea · `pl-9 pr-10` ของ `disposal-asset-picker` · `pr-12` ของช่องรหัสผ่าน |

ความสูงเปลี่ยนผ่าน `fieldSize` เท่านั้น (ข้อ 4.6) เพราะ `className="h-12"` ชนะ `md:h-10` ไม่ได้

**F3. ค่าคงที่ class ของไฟล์** ลบในงานเดียวกับไฟล์นั้น:

| ไฟล์:บรรทัด | ชื่อ |
|---|---|
| `maintenance/repair-record-actions.tsx:19`, `:20` | `inputClass`, `textareaClass` |
| `maintenance/repair-record-form.tsx:20`, `:21` | `inputClass`, `textareaClass` |
| `assets/asset-batch-form.tsx:1172` | `inputClassName` (ใช้ 13 ที่ รวม `<select>` ของ `SelectField`) |
| `admin/depreciation-policy-builder.tsx:330`, `:331` | `inputClassName`, `previewInputClassName` |
| `master-data/supplier-form.tsx:40` | `controlClassName` |

`compactButtonClassName` (`depreciation-policy-builder.tsx:332`) เป็นของส่วนปุ่ม

**F4. ป้ายชื่อ: ทุกคู่ "ป้าย + ช่อง" ใช้ `Field` ของ 2A**

- `<label className="…"><span className="mb-1.5 block text-sm font-medium text-foreground">X</span><input …/></label>` → `<Field label={X}><Input …/></Field>`
- `<label htmlFor="k">X</label><input id="k" …/>` → `<Field label={X}><Input id="k" …/></Field>` (`Field` ใช้ id ของลูก จึงคง id เดิมได้)
- class จัดวางของ `<label>` เดิม (`md:col-span-2`, `sm:col-span-3`, `lg:col-span-2`, `min-w-0 flex-1`, `mb-3`) ย้ายไปที่ `Field className` · `<div className="md:col-span-2">` ที่ห่อ `Field` อยู่แล้ว คงไว้
- เขียน `label=` เป็น prop แรกของ `Field` เสมอ (`tests/asset-batch-form-layout.test.ts:22-23` ค้นข้อความ `Field label={t("batchAssetTag")}`)
- ห้ามมี `Field` อยู่ใน `<label>` · `Field` ห้ามห่อ `SearchableSelect`
- ข้อยกเว้นที่ใช้ `FieldLabel` + ช่องแทน `Field`:
  - `auth/login-form.tsx` (ข้อตัดสินย่อย 10)
  - ช่องค้นหาของรายการที่ต้องเลือก: `asset-operations/bulk-move-form.tsx:90` และ `disposal/disposal-asset-picker.tsx:58` เพราะดอกจันเป็นของรายการที่เลือก ไม่ใช่ของช่องค้นหา (`FieldLabel required` วาดแค่ดอกจัน ไม่ใส่ `aria-required`)
- ข้อยกเว้นที่คง `<label>` ห่อแบบบรรทัดเดียว (ป้าย + ช่องในแถวเดียว ถูกต้องตาม HTML): `notifications/notification-center-actions.tsx:119` และแถบเครื่องมือ `assets/asset-label-print.tsx:225`, `:236` (ข้อ 4.9)
- ตัวอักษรในช่องไม่สืบทอดน้ำหนักจาก `<label className="… font-medium">` อีก เพราะ `Field` ไม่ห่อช่อง (preflight ตั้ง `font: inherit` ให้ช่อง)

**F5. ดอกจัน: `Field required` เมื่อช่องมี `required` และกลับกัน**

- ดอกจันแดง 32 จุดหายทั้งหมด แทนด้วยดอกจันของ `FieldLabel` (`text-warning` + `aria-hidden`) และ `aria-required` บนช่อง
- ช่องที่มี `required` ทั้งแบบค่าคงที่และแบบ expression ได้ `Field required={expression เดียวกัน}` ช่องที่วันนี้ไม่มีดอกจัน 12 ช่องจะได้ดอกจัน: `admin/asset-state-review-dialog.tsx:85` · `admin/IntegrationClientManager.tsx:403`, `:462`, `:475` · `assets/asset-register-table.tsx:739` · `audit/audit-finding-review-actions.tsx:350` · `audit/audit-round-cancel-button.tsx:101` · `disposal/disposal-batch-form.tsx:118` · `disposal/disposal-bulk-execution.tsx:880`, `:1032`, `:1042`, `:1056`
- ดอกจัน 3 จุดที่ช่องไม่มี `required` (ข้อ 4.1) คงดอกจัน และไม่เพิ่ม `required` เพราะจะเริ่มบล็อกการ submit (K4) ให้ V track เป็นคนเพิ่ม · guard ข้อ 4.16 มีรายการยกเว้น 3 จุดนี้
- legend ของกลุ่มที่บังคับเลือก ใส่ `<span aria-hidden="true" className="ml-1 text-warning">*</span>` แบบเดียวกับ `FieldLabel`

**F6. คำอธิบายใต้ช่อง → `hint`**

- `<p>` หรือ `<span>` ที่ตรงกับ `/className="(?:mt-1|mt-1\.5|mt-2) (?:block )?(?:text-right )?text-xs text-muted-foreground"/` และอยู่ติดใต้ช่องที่มันอธิบาย → `Field hint={…}` (ได้ `text-meta text-faint-foreground` และ `aria-describedby`) · 53 บรรทัด จำนวนต่อไฟล์อยู่ในคอลัมน์ "hint" ข้อ 4.14
- ข้อความที่อธิบายทั้งส่วน หรือไม่ได้อยู่ติดช่อง ไม่แตะ (2D)
- คำอธิบายที่มีเงื่อนไข → `hint={เงื่อนไข ? ข้อความ : undefined}`
- คำอธิบายหลายบรรทัด → `hint={<><span className="block">…</span><span className="block">…</span></>}` (เช่น `disposal/disposal-bulk-approval.tsx:552`)
- ตัวนับตัวอักษรที่ชิดขวา → `hint={<span className="block text-right">…</span>}` (`disposal-request-form.tsx:175`, `disposal-batch-form.tsx:118`)
- ถ้า test ยึด `aria-describedby={xId}` ไว้: คง attribute นั้นบนช่อง แล้ววาง `<FieldHint id={xId} className="mt-1.5">…</FieldHint>` ต่อจาก `</Field>` (`Field` ใส่ id เดิมของลูกไว้หน้าสุดเอง) · ใช้ที่ `disposal/disposal-execution-button.tsx:234` · ที่ `disposal-bulk-execution.tsx:880` ข้อความช่วย (`historicalHelpId`) อยู่นอก `<label>` อยู่แล้ว ให้เปลี่ยนเป็น `FieldHint` ที่ตำแหน่งเดิม

**F7. ช่องที่ไม่มีป้ายที่มองเห็น** ใช้ `Field hideLabel` เสมอ รวมช่องใน `<td>` และแถวของ repeater (ได้ id, hint และ error ครบ และ `useId` ทำงานได้ในแต่ละแถว) · ใช้ `aria-label` เฉพาะกับ `SearchField` ที่ไม่มี hint (ข้อ 4.8, 4.9)

**F8. ลำดับงานในไฟล์** (ไฟล์ละ 1 commit ห้ามมีไฟล์ที่ย้ายครึ่งเดียว):

1. ลบ `function Field` ของไฟล์ก่อน แล้วจึง import ตัวกลาง (ชื่อซ้ำ TypeScript จะ error)
2. แปลงทุกช่อง ป้าย ดอกจัน hint checkbox และ legend ในไฟล์
3. ลบค่าคงที่ class (F3)
4. แก้ test ที่พังจากไฟล์นั้น (ข้อ 4.16)
5. ลดตัวเลข budget ของไฟล์ใน `tests/form-field-guards.test.ts` ห้ามเพิ่ม

### 4.4 `Field` ของไฟล์ 25 ตัว (197 ครั้ง)

| แบบ | ไฟล์:บรรทัดของนิยาม (จำนวนครั้งที่เรียก) | ชุด |
|---|---|---|
| L1 ห่อด้วย `<label>` (22 ตัว 141 ครั้ง) | `maintenance/maintenance-plan-form.tsx:159` (5) · `maintenance/repair-record-actions.tsx:220` (11) · `maintenance/repair-record-form.tsx:249` (6) | 1a |
| | `asset-operations/checkin-form.tsx:588` (6) · `checkout-form.tsx:406` (5) · `transfer-form.tsx:168` (2) · `bulk-move-form.tsx:141` (2) | 1b |
| | `disposal/disposal-request-form.tsx:227` (4) · `disposal-execution-button.tsx:245` (8) · `disposal-decision-button.tsx:210` (5) | 1c |
| | `assets/asset-form.tsx:1532` (18) · `assets/asset-batch-form.tsx:1138` (12) | 1e |
| | `master-data/asset-model-form.tsx:455` (4) | 1g |
| | `master-data/branch-form.tsx:197` (5) · `category-form.tsx:252` (8) · `company-form.tsx:196` (6) · `department-form.tsx:171` (3) · `employee-form.tsx:323` (10) · `location-form.tsx:235` (6) | 2 |
| | `audit/audit-round-form.tsx:313` (6) | 3 |
| | `admin/admin-user-form.tsx:230` (5) · `admin/role-permission-form.tsx:287` (4) | 4 |
| L1 ไม่มี prop `required` | `disposal/disposal-batch-form.tsx:130` (4) | 1c |
| L1 + error | `master-data/supplier-form.tsx:277` (6) | 2 |
| L1' `<div>` + `htmlFor` | `admin/system-settings-form.tsx:2328` (46) | 1f |

วิธีแปลง:

- **L1:** ข้อความที่เรียกเหมือนเดิม (`<Field label={…} required={…}>`) เปลี่ยนแค่ import ลูกเป็น primitive ตาม F1
- **`disposal-batch-form`:** textarea `:118` มี `required minLength={12}` อยู่แล้ว จึงเขียน `<Field label={t("reason")} required hint={…}>` (F5)
- **supplier:** `<Field label={t("code")} required error={…} errorId="supplier-code-error">` → `<Field label={t("code")} id="supplier-code" required error={…}>` แล้วลบ `aria-invalid` และ `aria-describedby` ออกจาก `Input` (`Field` ใส่ให้เอง) · id ของ error ยังเป็นค่าเดิมเพราะ `Field` ตั้งเป็น `${id}-error`:

| ช่อง (บรรทัด) | `Field id` | id ของ error (เท่าเดิม) |
|---|---|---|
| code (`:165`) | `supplier-code` | `supplier-code-error` |
| name (`:178`) | `supplier-name` | `supplier-name-error` |
| contactPerson (`:191`) | `supplier-contact` | `supplier-contact-error` |
| phone (`:203`) | `supplier-phone` | `supplier-phone-error` |
| email (`:217`) | `supplier-email` | `supplier-email-error` |
| address (`:241`) | `supplier-address` | `supplier-address-error` |

- **L1' (settings):** `<Field label={X} htmlFor="k"><input id="k" …/></Field>` → `<Field label={X}><Input id="k" …/></Field>` ลบ prop `htmlFor`
- ช่องเดี่ยว `admin/system-settings-form.tsx:1015` (ป้าย `htmlFor="asset-tag-template"` ที่ `:1012`) แปลงแบบ F4 เช่นกัน

**16 ครั้งที่มีของอื่นอยู่ใน `<label>`:**

| # | ที่เรียก (ป้าย) | ของที่อยู่ข้างใน | แปลงเป็น |
|---|---|---|---|
| 1 | `assets/asset-batch-form.tsx:607` (`assetName`) | hint `:618` + กล่องชื่อที่แนะนำ `:620` + ปุ่ม `:625` | `hint={t("assetNameHelp")}` · กล่องชื่อที่แนะนำย้ายออกไปต่อจาก `</Field>` ในตัวห่อ `<div className="grid min-w-0 gap-2">` (ปุ่มเป็นของส่วนปุ่ม) |
| 2 | `assets/asset-batch-form.tsx:865` (`batchAssetTag`) | hint `:867` | `hint={t("batchAssetTagHelp")}` และลบ `aria-label` ของ `:866` (K20) |
| 3 | `assets/asset-batch-form.tsx:869` (`batchSerialNumber`) | `ScannerTextInput` + hint `:871` | `hint={t("batchPasteSerialHint")}` |
| 4 | `assets/asset-form.tsx:840` (`assetTag`) | error `:849` | `error={duplicateState.assetTagExists ? t("duplicateAssetTag") : undefined}` |
| 5 | `assets/asset-form.tsx:852` (`assetName`) | hint `:863` + กล่อง `:865` + ปุ่ม `:870` | เหมือนข้อ 1 |
| 6 | `assets/asset-form.tsx:896` (serial หรือ license key) | `ScannerTextInput` + error `:918` | `error={duplicateState.serialNumberExists ? t("duplicateSerialNumber") : undefined}` |
| 7 | `assets/asset-form.tsx:1483` (`customFieldsJson`) | hint `:1490` | `hint=` |
| 8 | `audit/audit-round-form.tsx:168` (`sampleRate`) | hint `:178` | `hint=` |
| 9 | `disposal/disposal-batch-form.tsx:118` (`reason`) | ตัวนับชิดขวา `:118` | `hint={<span className="block text-right">…</span>}` |
| 10 | `disposal/disposal-decision-button.tsx:175` (`nextStatus`) | hint `:179` | `hint=` |
| 11 | `disposal/disposal-decision-button.tsx:192` (`approvalRemark`) | hint มีเงื่อนไข `:194` | `hint={rejectionReasonRequired ? t("rejectionReasonRequired") : undefined}` |
| 12 | `disposal/disposal-execution-button.tsx:234` (`historicalEvidenceReason`) | `<p id={evidenceExceptionReasonHelpId}>` `:234` | คง `aria-describedby={evidenceExceptionReasonHelpId}` บน `Textarea` + `FieldHint` ต่อจาก `</Field>` (F6) |
| 13 | `disposal/disposal-request-form.tsx:165` (`reason`) | ตัวนับชิดขวา `:175` | เหมือนข้อ 9 |
| 14 | `maintenance/repair-record-form.tsx:216` (`files`) | `input[file]` `:217` + hint `:224` | รูปแบบตามส่วน primitive (K19: `FileDropzone multiple` + `FileQueueList`) |
| 15 | `master-data/company-form.tsx:102` (`code`) | hint `:110` | `hint=` |
| 16 | `master-data/company-form.tsx:113` (`assetTagCode`) | hint `:121` | `hint=` |

**ลูกที่ไม่ใช่ช่องกรอก 5 ครั้ง:**

- `ScannerTextInput` 2 ครั้ง (`asset-batch-form.tsx:869`, `asset-form.tsx:896`): `Field` ใส่ `id`, `aria-describedby`, `aria-invalid`, `aria-required` ให้ได้เลย (2A รองรับแล้ว) ป้ายซ้อนกับช่องเลือกกล้องหายไปเอง เพราะ `Field` ใหม่เป็น `<div>`
- `FileDropzone` 1 ครั้ง (`asset-operations/checkout-form.tsx:306`) และ `input[file]` 2 ครั้ง (`maintenance/repair-record-actions.tsx:147`, `repair-record-form.tsx:216`): ส่วน primitive (K19) กำหนดว่าจะห่อด้วย `Field` แบบไหน ส่วนนี้ต้องการแค่ว่าไม่มี `Field` ของไฟล์เหลือ

### 4.5 select wrapper 7 ตัว (48 ครั้ง)

| wrapper | ไฟล์:บรรทัด (`<select>`) | เรียก | ชุด | หมายเหตุ |
|---|---|---|---|---|
| `Select` | `asset-operations/checkin-form.tsx:600` (`:603`) | 4 | 1b | มี prop `disabled` · ลบ `disabled:bg-muted disabled:text-muted-foreground` |
| `Select` | `asset-operations/checkout-form.tsx:418` (`:433`) | 2 | 1b | |
| `SelectField` | `assets/asset-batch-form.tsx:1150` (`:1165`) | 12 | 1e | ใช้ค่าคงที่ `inputClassName` |
| `SelectField` | `assets/asset-form.tsx:1564` (`:1579`) | 12 | 1e | |
| `Select` | `disposal/disposal-request-form.tsx:239` (`:254`) | 1 | 1c | |
| `Select` | `audit/audit-round-form.tsx:325` (`:328`) | 10 | 3 | |
| `QueueSelect` | `assets/asset-label-batch-tool.tsx:725` (`:746`) | 7 | 4 | ป้ายมีไอคอน (เรียกด้วย `icon=` ที่ `:520` ครั้งเดียว) |

คงชื่อ wrapper และ props เดิม ที่เรียกทั้ง 48 ครั้งไม่ต้องแก้ เนื้อในเปลี่ยนเป็น:

```tsx
function SelectField({ label, value, required, onChange, children }: { label: string; value: string; required?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Field label={label} required={required}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
```

- `checkin-form` ส่ง `disabled={disabled}` ต่อให้ `NativeSelect` ด้วย
- `QueueSelect`: `<Field label={icon ? <span className="inline-flex items-center gap-1">{icon}{label}</span> : label}>` ป้ายเดิม `text-sm` เปลี่ยนเป็น 13px ตาม `FieldLabel` · ไอคอนที่ `:520` เติม `aria-hidden="true"`
- `NativeSelect` เติม `select-chevron pr-9` ช่องเลือกที่แคบจะตัดคำเร็วขึ้น 24px (ความเสี่ยงข้อ 6)

### 4.6 ความสูง (K7)

- ช่องบรรทัดเดียวทุกช่องใช้ค่าตั้งต้น `lg` (ไม่ต้องเขียน `fieldSize`): ใต้ `md` สูง 44 ตัวอักษร 16px · ตั้งแต่ `md` สูง 40 ตัวอักษร 14px
- ช่องที่วันนี้สูง 44 บนจอใหญ่ 35 ช่อง เตี้ยลงเหลือ 40:
  - `maintenance/repair-record-actions.tsx:125`, `:141`, `:144`, `:196`, `:204`, `:207` · `maintenance/repair-record-form.tsx:132`, `:211`, `:214`
  - `asset-operations/checkin-form.tsx:353` · `disposal/disposal-batch-form.tsx:113`, `:116`, `:117` · `disposal/disposal-asset-picker.tsx:58`
  - `assets/asset-component-manager.tsx:324`, `:337`, `:346` · `master-data/supplier-form.tsx:165`, `:178`, `:191`, `:203`, `:217`
  - `disposal/disposal-bulk-execution.tsx:1032`, `:1042`, `:1056`, `:1071` · `admin/asset-state-review-dialog.tsx:60`, `:73` · `admin/IntegrationClientManager.tsx:403`, `:462`, `:475` · `assets/asset-label-batch-tool.tsx:304`, `:447`, `:456`, `:746`
- `fieldSize="md"` (36 ตั้งแต่ `md`) 4 ช่อง: `admin/depreciation-policy-builder.tsx:392` (`SearchField` ในแผงเลือกหมวดหมู่) · `:292`, `:295` (ช่องตัวอย่าง) · `notifications/notification-center-actions.tsx:119`
- ไม่มีช่อง `xl` ใน 2C
- ผลบนมือถือ: 150 ช่อง `h-10` สูงขึ้น 4px และตัวอักษรเป็น 16px · ช่วง 640–767px ช่อง `min-h-11 sm:h-10` 31 ช่องสูงขึ้นจาก 40 เป็น 44
- textarea: `Textarea` มี `min-h-24` ในตัว · คง `min-h-28` (18 · `fields.md` §6.2 นับ 17), `min-h-32` (1), `min-h-20` (1), `min-h-16` (1) ของเดิม · ลบ `min-h-24` ที่ซ้ำ · textarea ที่มีแค่ `rows={2}` 3 ช่องใส่ `className="min-h-16"` ให้เตี้ยเท่าเดิม: `maintenance/repair-record-actions.tsx:151`, `:211`, `maintenance/repair-record-form.tsx:228` · ช่อง `rows={3}` ที่ไม่มี min-h 3 ช่อง (`assets/asset-component-manager.tsx:355`, `maintenance/repair-record-actions.tsx:167`, `:199`) สูงขึ้นประมาณ 12px ยอมรับ

### 4.7 ช่องจำเป็น ความยาว และ error ที่มีอยู่แล้ว (K4)

- คง `required`, `maxLength`, `minLength`, `min`, `max`, `step`, `pattern` ไว้บนตัวช่องทุกตัว `Field` ไม่ใส่ `required` จริงให้ (2A) จึงต้องคงไว้ที่ลูกเอง
- 18 ไฟล์ตรวจข้อมูลด้วย attribute เหล่านี้อย่างเดียว ถ้าหายไปจะส่งค่าว่างไปเซิร์ฟเวอร์โดยไม่มีอะไรเตือน guard ในข้อ 4.16 ตรวจ 3 เรื่อง:
  - `Field required` กับ `required` ของลูกต้องมาคู่กัน ยกเว้น 3 จุดใน F5
  - จำนวน `required`, `maxLength`, `minLength` บนช่องของแต่ละไฟล์ต้องไม่น้อยกว่าค่าที่ `5ffee76` (คอลัมน์ในข้อ 4.14)
  - wrapper ทั้ง 7 ตัวส่ง `required={required}` ให้ `NativeSelect`
- `noValidate` ของ `asset-operations/checkin-form.tsx:291` คงไว้ (`required` ใน `Select` จึงยังไม่มีผลเหมือนเดิม)
- toast ที่ตรวจข้อมูลอยู่ทุกตัวคงไว้ รวม `master-data/supplier-form.tsx:127`
- **error ที่มีอยู่แล้ว 8 จุด ย้ายเข้า `Field error`:**
  - supplier 6 ช่อง (ข้อ 4.4) ช่องจะได้ขอบแดงจาก `aria-invalid` ของ 2A
  - `assets/asset-form.tsx:840` และ `:896` (ข้อ 4.4 ข้อ 4 และ 6) error เป็น `role="alert"` และช่องได้ `aria-invalid`
- error ใต้ช่องที่ยังไม่ได้ผูกกับช่องอีก 2 จุด คงไว้ตามเดิมให้ V track: `asset-operations/transaction-cancel-dialog.tsx:150` (`aria-live="polite"`) และ `assets/asset-status-correction-button.tsx:78`

### 4.8 ช่องที่ไม่มีชื่อ (K20)

| # | ไฟล์:บรรทัด | ช่อง | วันนี้ | 2C |
|---|---|---|---|---|
| 1 | `admin/data-quality-rule-form.tsx:81` | ระดับของกฎ (select) | ไม่มี | `<Field label={labels.severity}>` มองเห็น + `NativeSelect aria-describedby={ruleLabelId}` ชี้ชื่อกฎ (`ruleLabelId` คือ "data-quality-rule-" ต่อด้วย `rule.key` ใส่เป็น `id` ของ span `:77`) · เพิ่ม `severity: string` ใน type ของ `labels` (`:10`) และ `severity: t("assetStateReviews.severity")` ใน `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx:146` (key เดิม ใช้แล้วที่ `:87`) |
| 2 | `admin/depreciation-policy-builder.tsx:319` | JSON ขั้นสูง | ไม่มี (มี `<summary>` `:317`) | `<Field label={labels.depreciationAdvancedJson} hideLabel hint={labels.depreciationAdvancedJsonDescription}>` และลบ `<p>` `:318` (คำอธิบายย้ายไปใต้ช่อง) |
| 3 | `admin/system-settings-form.tsx:2045` | ค่าในตาราง | ไม่มี | `<Field label={setting.key} hideLabel>` |
| 4 | `admin/system-settings-form.tsx:2279` | ค้นหาหมวดหมู่ | placeholder | `SearchField aria-label={searchPlaceholder}` (ข้อ 4.9) |
| 5 | `asset-operations/bulk-move-form.tsx:90` | ค้นหาทรัพย์สิน | placeholder | `FieldLabel htmlFor={assetSearchId} required` แทน span `:84-87` + `SearchField id={assetSearchId}` |
| 6 | `assets/asset-attachments.tsx:263` | ประเภทรูป | ไม่มี | `<Field label={t("photoType")} className="mb-3">` มองเห็น (key ใหม่ ข้อ 4.15) |
| 7 | `assets/asset-batch-form.tsx:946` | หมายเหตุในตาราง | placeholder | `<Field label={t("batchRemark")} hideLabel>` |
| 8 | `assets/asset-batch-form.tsx:921` | `ScannerTextInput` ในตาราง | ไม่มี | `<Field label={t("batchSerialNumber")} hideLabel hint={t("batchPasteSerialHint")}>` แทน `<p>` `:922` |
| 9 | `assets/asset-form.tsx:1052` | สถานะ (required) | `AssetStateFieldLabel` เป็น `<div>` | `<Field label={t("status")} required labelAction={<AssetStateHelpPopover {...assetStatusHelp} />} hint={selectedStatus?.description}>` + `NativeSelect required` · กล่องเตือนสถานะที่ป้องกันไว้คงอยู่ต่อจาก `</Field>` |
| 10 | `assets/asset-form.tsx:1081` | สภาพ (required) | เหมือนข้อ 9 | แบบเดียวกัน `hint` = คำอธิบายของสภาพที่เลือก · ลบ `AssetStateFieldLabel` (`:1544`) |
| 11–14 | `assets/asset-form.tsx:1218`, `:1227`, `:1234`, `:1240` | แถวสร้างเอกสารจัดซื้อ | หัวข้อเล็ก `:1216` + placeholder | ป้ายมองเห็นทั้ง 4 ช่อง (ข้อตัดสินย่อย 2): `t("documentType")` · `t("purchaseDocumentNo")` · `t("purchaseDocumentDate")` (ใหม่) · `t("purchaseDocumentAmountBaht")` (ใหม่) · ลบ placeholder ของ `:1227` และ `:1240` |
| 15–16 | `assets/asset-form.tsx:1640`, `:1646` | ชื่อข้อมูล / ค่า (repeater) | placeholder | `<Field label={labels.key} hideLabel>` / `<Field label={labels.value} hideLabel>` คง placeholder |
| 17 | `assets/asset-component-manager.tsx:292` | `ScannerTextInput` ค้นหาส่วนควบ | placeholder | `<Field label={labels.scanOrSearch} hideLabel>` |
| 18 | `disposal/disposal-asset-picker.tsx:58` | ค้นหาแบบ combobox | span `:56` | `FieldLabel htmlFor={inputId} required` + `Input id={inputId} role="combobox"` (ข้อ 4.9) |
| 19–20 | `master-data/asset-model-form.tsx:309`, `:315` | หัวข้อ / ค่าของ spec (repeater) | placeholder | `<Field label={t("specLabel")} hideLabel>` / `<Field label={t("specValue")} hideLabel>` |
| 21 | `master-data/category-form.tsx:509` | รายการรูป (repeater) | placeholder | `<Field label={labels.item} hideLabel>` |
| +1 | `assets/asset-batch-form.tsx:866` | รหัสทรัพย์สินในการ์ดมือถือ | `aria-label` = ข้อความช่วย | ลบ `aria-label` ป้ายของ `Field` เป็นชื่อแทน (ข้อ 4.4 ข้อ 2) |
| +2 | `assets/asset-batch-form.tsx:917` | รหัสทรัพย์สินในตาราง | `aria-label` = ข้อความช่วย | `<Field label={t("batchAssetTag")} hideLabel hint={t("batchAssetTagHelp")}>` ลบ `aria-label` และ `<p>` `:918` |

`ScannerTextInput` ทั้ง 2 จุดใช้ `Field hideLabel` ซึ่ง 2A รองรับแล้ว ส่วนนี้จึงไม่ต้องใช้ `aria-label` passthrough ของ `ScannerTextInput` (ถ้าส่วน primitive เพิ่มไว้ตาม K20 ก็ไม่ขัดกัน · ห้ามส่ง `aria-label={labels.stop}`, `tests/scanner-text-input.test.ts:194-200`)

### 4.9 ช่องค้นหาและช่องแบบกล่อง (K21)

| ไฟล์:บรรทัด | วันนี้ | 2C |
|---|---|---|
| `admin/system-settings-form.tsx:963` | `<label>` + span `:960` + กล่อง `:961` ที่วาดขอบเอง (`focus-within:`) + ช่อง `bg-transparent` | `<Field label={labels.searchSettings}><SearchField value={settingsSearch} onChange={…} placeholder={labels.searchSettingsHelp} /></Field>` |
| `admin/system-settings-form.tsx:2279` | กล่อง `:2277` + ไอคอน + ช่องโปร่ง โฟกัสแล้วมองไม่เห็น | `<SearchField aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={searchValue} onChange={…} />` แทนกล่อง |
| `asset-operations/bulk-move-form.tsx:90` | กล่อง `:88` + ช่องโปร่ง โฟกัสแล้วมองไม่เห็น | `<SearchField id={assetSearchId} className="mb-2" placeholder={tCommon("searchSelectPlaceholder")} …/>` + `FieldLabel` (ข้อ 4.8 ข้อ 5) |
| `asset-operations/checkin-form.tsx:353` | `<label>` `:350` + span `sr-only` + ไอคอน + ช่อง `min-h-11 pl-9` | `<SearchField aria-label={t("legacyReturnSearch")} placeholder={t("legacyReturnSearch")} className="w-full lg:max-w-sm" …/>` |
| `admin/depreciation-policy-builder.tsx:392` | `<label>` `:390` + ไอคอน + ช่อง `h-9 pl-9` disabled ไม่มีหน้าตา | `<div className="border-b border-border p-2"><SearchField fieldSize="md" aria-label={searchLabel} placeholder={searchLabel} disabled={disabled} …/></div>` |
| `assets/asset-label-batch-tool.tsx:304` | `<label>` `:300` + span `:301` + ไอคอน + ช่อง `h-11 pl-10` + hint `:313` | `<Field label={labels.searchLabel} hint={trimmedQuery.length < 2 ? labels.minChars : undefined}><SearchField value={query} onChange={…} placeholder={labels.searchPlaceholder} /></Field>` |
| `disposal/disposal-asset-picker.tsx:58` | ไอคอน `top-3.5` + ช่อง `role="combobox"` `min-h-11 pl-9 pr-10` + `Loader2` | `<div className="relative mt-2">` + `<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden="true" />` + `<Input id={inputId} role="combobox" aria-expanded={…} aria-controls={listboxId} className="pl-9 pr-10" …/>` + `Loader2` `absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin motion-reduce:animate-none text-primary` (`top-1/2` เพราะช่องสูง 44 บนมือถือและ 40 บนจอใหญ่) |
| `admin/depreciation-policy-builder.tsx:292`, `:295` | ช่องไม่มีขอบ `h-7` ใน `PreviewInputField` (`:352`) โฟกัสเห็นแค่สีตัวอักษร | `<Field label={labels.depreciationPreviewPurchasePrice}><Input fieldSize="md" type="text" inputMode="decimal" value={formatPurchasePriceInput(previewPurchasePrice)} …/></Field>` และช่องวันที่แบบเดียวกัน · ลบ `PreviewInputField` และ `previewInputClassName` · คงลำดับ `type` → `inputMode` → `value` (`tests/settings-depreciation-policy-ui.test.ts:50`) |
| `assets/asset-label-print.tsx:225`, `:236` | ป้ายในกล่อง `:223`, `:233` (แถบเครื่องมือของหน้าพิมพ์) | คงแบบกล่อง (ข้อตัดสินย่อย 9): กล่อง `:223` เปลี่ยน `border-border bg-background … text-sm sm:h-10` เป็น `border-input bg-surface … text-base md:h-10 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus` (class จัดวาง `sm:` อื่นคงไว้) · กล่อง `:233` แบบเดียวกัน · ช่องข้างในคง `min-w-0 flex-1 bg-transparent outline-none` |

`SearchField` ใช้ `type="search"` เป็นค่าตั้งต้น ช่องค้นหา 4 ช่องที่วันนี้เป็น text จึงกลายเป็น search ปุ่ม Enter ยัง submit ฟอร์มเหมือนเดิม ไม่ส่ง `onClear` (ไม่เพิ่มปุ่มล้าง)

### 4.10 ช่องวันที่ (23 ช่อง)

ทุกช่องเป็น `<Input type="date">` (หรือ `datetime-local`) `Input` เติม `num` ให้เอง ไม่เพิ่ม `min`/`max` ใน 2C

| ชุด | ไฟล์:บรรทัด |
|---|---|
| 1a | `maintenance/maintenance-plan-form.tsx:124` · `repair-record-form.tsx:132` · `repair-record-actions.tsx:125`, `:196` |
| 1b | `asset-operations/checkin-form.tsx:401` · `checkout-form.tsx:286`, `:290` (คง `min={values.checkoutDate}` เดิม) |
| 1c | `disposal/disposal-execution-button.tsx:225` |
| 1d | `audit/audit-finding-review-actions.tsx:371` |
| 1e | `assets/asset-form.tsx:1149`, `:1159`, `:1162`, `:1234` · `asset-batch-form.tsx:735`, `:745`, `:748` · `asset-component-manager.tsx:346` (datetime-local) |
| 1f | `admin/depreciation-policy-builder.tsx:295` (`fieldSize="md"`) |
| 3 | `audit/audit-round-form.tsx:145`, `:148` · `disposal/disposal-bulk-execution.tsx:1032` |
| 4 | `assets/asset-label-batch-tool.tsx:447`, `:456` |

`min={start}` ของ 4 คู่ (`asset-batch-form.tsx:745/:748`, `asset-form.tsx:1159/:1162`, `audit-round-form.tsx:145/:148`, `asset-label-batch-tool.tsx:447/:456`) เป็นงานของ V track เพราะเปลี่ยนพฤติกรรม

### 4.11 ช่องเงิน (K26)

ใส่ `inputMode="decimal"` ให้ครบ 14 ช่อง และใส่หน่วยในป้าย 11 ช่องที่ยังไม่มี

ป้าย 6 key เดิมใช้ร่วมกับป้ายแบบอ่านอย่างเดียวที่แสดงค่า `formatCurrency` (มี ฿ อยู่แล้ว) จึง**ไม่แก้ค่าของ key เดิม** แต่เพิ่ม key ใหม่สำหรับป้ายช่องกรอก:

- `asset.purchasePrice` ใช้ที่ `src/app/[locale]/(dashboard)/assets/[id]/page.tsx:1099`, `:2546`, `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx:361`, `src/app/[locale]/(print)/disposal/[id]/print/page.tsx:135` และหัวคอลัมน์ทะเบียน (`src/app/[locale]/(dashboard)/assets/page.tsx:406`)
- `disposalPage.saleValue`, `.salvageValue` ใช้ที่ `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx:245-246`, `src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx:82-83`, `src/app/[locale]/(print)/disposal/[id]/print/page.tsx:115-116` และสรุป `disposal/disposal-batch-form.tsx:77-78`
- `disposalPage.actualSaleValue`, `.actualSalvageValue` ใช้ที่ `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx:278-279` และ `src/app/[locale]/(print)/disposal/[id]/print/page.tsx:74-75`
- ถ้าแก้ค่าเดิม ป้ายเหล่านี้จะเป็น "ราคาซื้อ (บาท): ฿12,000.00"

| # | ไฟล์:บรรทัด | ป้ายวันนี้ | ป้ายใหม่ | `inputMode` | ชุด |
|---|---|---|---|---|---|
| 1 | `assets/asset-batch-form.tsx:738` | `asset.purchasePrice` | `asset.purchasePriceBaht` | เพิ่ม | 1e |
| 2 | `assets/asset-form.tsx:1152` | `asset.purchasePrice` | `asset.purchasePriceBaht` | เพิ่ม | 1e |
| 3 | `assets/asset-form.tsx:1240` | ไม่มี (placeholder `asset.purchaseDocumentAmount`) | `asset.purchaseDocumentAmountBaht` | เพิ่ม | 1e |
| 4–5 | `disposal/disposal-request-form.tsx:145`, `:155` | `disposalPage.saleValue` / `.salvageValue` | `…saleValueBaht` / `…salvageValueBaht` | เพิ่ม | 1c |
| 6–7 | `disposal/disposal-batch-form.tsx:116`, `:117` | เหมือนข้อ 4–5 | เหมือนข้อ 4–5 | เพิ่ม | 1c |
| 8–9 | `disposal/disposal-decision-button.tsx:186`, `:189` | เหมือนข้อ 4–5 | เหมือนข้อ 4–5 | เพิ่ม | 1c |
| 10–11 | `disposal/disposal-execution-button.tsx:230`, `:231` | `disposalPage.actualSaleValue` / `.actualSalvageValue` | `…actualSaleValueBaht` / `…actualSalvageValueBaht` | เพิ่ม | 1c |
| 12–14 | `maintenance/repair-record-actions.tsx:141`, `:204` · `repair-record-form.tsx:211` | `repairRecord.cost` "ค่าใช้จ่ายรวม (บาท)" | ไม่เปลี่ยน | มีแล้ว | 1a |

- สกุลเงินของเอกสารจัดซื้อคือ THB เสมอ (`assets/asset-form.tsx:734` ส่ง `currency` = `"THB"`) ป้าย "(บาท)" ของข้อ 3 จึงถูกต้อง
- ช่อง `type="number"` อื่นอีก 26 ช่อง (จำนวนเต็ม ร้อยละ 2 ช่อง และมิลลิเมตร `step="0.5"` 2 ช่อง) ไม่เพิ่ม `inputMode` (K26 พูดถึงแค่ช่องเงิน)
- key ใหม่อยู่ในข้อ 4.15

### 4.12 checkbox radio และ legend (K16, K27)

**`fieldLabelClasses` (K27, commit ของ 2C-0):**

```ts
// ui/field-variants.ts
export const fieldLabelClasses = "text-meta font-medium text-foreground"
```

`FieldLabel` (`ui/field.tsx:64`) เปลี่ยนเป็น `cn(fieldLabelClasses, visuallyHidden && "sr-only", className)` หน้าตาไม่เปลี่ยน และยังผ่าน `tests/field-primitives.test.ts:91`

**legend 6 จุด** เปลี่ยน `mb-2 text-sm font-medium text-foreground` เป็น `className={cn(fieldLabelClasses, "mb-1.5")}` (เว้น 6px เท่า `Field`):

| ไฟล์:บรรทัด | ข้อความ | ดอกจัน |
|---|---|---|
| `asset-operations/checkout-form.tsx:231` | `handoverMode` | มี (F5) |
| `maintenance/repair-record-actions.tsx:128` | `outcomeQuestion` | มี |
| `maintenance/repair-record-form.tsx:147` | `doneQuestion` | มี |
| `maintenance/repair-record-form.tsx:157` | `outcomeQuestion` | มี |
| `admin/IntegrationClientManager.tsx:412` | `labels.scopes` (ใน dialog) | ไม่มี |
| `admin/IntegrationClientManager.tsx:485` | `labels.scopes` | ไม่มี |

`<fieldset>` ของ 4 จุดแรกเป็นกลุ่ม radio แบบการ์ด R1–R3 ส่วนตัวเลือกและขั้นตอนเปลี่ยนตัวการ์ดเป็น `ChoiceCard` ในงานเดียวกับไฟล์ ส่วนนี้แก้แค่ legend · `<fieldset disabled>` ที่ `disposal/disposal-bulk-execution.tsx:1029` ไม่มี legend

**checkbox 38 ตัวของ 2C:** ลบ class ที่ไม่มีผลกับ checkbox ของเบราว์เซอร์ (`rounded`, `border-border`, `text-primary`, `focus:ring-ring`, `focus-visible:ring-2 focus-visible:ring-ring`, `accent-primary`, `disabled:opacity-60`, `h-* w-*`) แล้วใช้ `checkboxVariants`:

| ขนาด | class ใหม่ | ไฟล์:บรรทัด |
|---|---|---|
| 16px (`h-4 w-4` 32 ตัว + `h-3.5 w-3.5` 1 + ไม่มีขนาด 1) | `checkboxVariants()` หรือ `cn(checkboxVariants(), "mt-0.5")` เมื่อเดิมมี `mt-0.5`/`mt-1` | `admin/admin-user-form.tsx:179`, `:194` · `admin/data-quality-rule-form.tsx:70` · `admin/depreciation-policy-builder.tsx:402` · `admin/IntegrationClientManager.tsx:363`, `:420`, `:489` · `admin/role-permission-form.tsx:180`, `:230`, `:247` · `admin/system-settings-form.tsx:1821`, `:2305`, `:2378` · `assets/asset-batch-form.tsx:683`, `:700`, `:768` · `assets/asset-form.tsx:962`, `:1027`, `:1195`, `:1496`, `:1725` · `audit/audit-round-form.tsx:258` · `disposal/disposal-execution-button.tsx:233`, `:234` · `master-data/asset-model-form.tsx:275` · `branch-form.tsx:166` · `brand-form.tsx:103` · `category-form.tsx:150`, `:391` · `company-form.tsx:165` · `department-form.tsx:140` · `employee-form.tsx:292` · `location-form.tsx:192` · `supplier-form.tsx:230` |
| 20px (`h-5 w-5`, `size-5` 4 ตัว) | `checkboxVariants({ size: "lg" })` (+ `"mt-0.5"` ถ้าเดิมมี) | `disposal/disposal-bulk-execution.tsx:867`, `:897`, `:928` · `audit/audit-scan-check-form.tsx:354` |

- **เป้ากดเล็กกว่า 44px ของ 2C 9 จุด:** เติม `min-h-11` ให้ `<label>` แถว · แถวที่เป็น `items-start` (ข้อความ 2 บรรทัด) เติม `py-2` ด้วย:
  - `admin/data-quality-rule-form.tsx:69` · `admin/IntegrationClientManager.tsx:362`
  - `admin/role-permission-form.tsx:179` (ลบ `pb-2` ใช้ `min-h-11 items-center`) · `:229` (`mt-3 inline-flex min-h-11 items-center …`)
  - `assets/asset-batch-form.tsx:682`, `:699` · `assets/asset-form.tsx:961`, `:1026` · `master-data/category-form.tsx:390`
- เป้าเล็ก 3 จุดของ 2B (ข้อ 4.1) อยู่ในงานของ 2B ตาม O1/O4 · spec ของ 2B ต้องใช้ K16 กับ 3 จุดนี้ด้วย
- แถวประมาณ 40px (กลุ่ม B2 14 จุด รวม `ToggleField` `admin/system-settings-form.tsx:2373` ที่แสดง 8 ครั้ง) คงความสูงเดิม เพราะไม่อยู่ใน 12 จุดของ K16
- checkbox ที่ disabled ได้ 6 ตัว (`depreciation-policy-builder.tsx:402`, `role-permission-form.tsx:180`, `:230`, `:247`, `disposal-execution-button.tsx:233`, `:234`): เติม `has-disabled:cursor-not-allowed has-disabled:text-faint-foreground` ที่ `<label>` แถว (ข้อตัดสินย่อย 13)
- คง `aria-describedby` ของ `disposal-bulk-execution.tsx:867`, `:897` และ `disposal-execution-button.tsx:233` ไว้
- `supplier-form.tsx:229` คง `min-h-11` (`tests/supplier-form-ui.test.ts:13` ผ่านด้วยบรรทัดนี้)

**radio 3 ตัว** (`asset-operations/checkout-form.tsx:248`, `maintenance/repair-record-actions.tsx:132`, `maintenance/repair-record-form.tsx:268`) ย้ายไปอยู่ใน `ChoiceCard` ของส่วนตัวเลือกและขั้นตอน ถ้า `ChoiceCard` ยังแสดงวงกลม radio ให้ใช้ `checkboxVariants()`

### 4.13 หน้าตาตอน disabled

ทุกช่องได้หน้าตา disabled ของ 2A (`bg-background border-border text-faint-foreground` เคอร์เซอร์ not-allowed ไม่ใช้ opacity) จาก primitive เอง ทั้งแบบ attribute และแบบ `<fieldset disabled>` (`:disabled` จับทั้งสองแบบ)

| กลุ่ม | ไฟล์:บรรทัด | งาน |
|---|---|---|
| ไม่มีหน้าตา 22 ช่อง | `admin/depreciation-policy-builder.tsx:174`, `:186`, `:233`, `:237`, `:241`, `:392` · `audit/audit-scan-check-form.tsx:274` · `disposal/disposal-bulk-approval.tsx:552` · `disposal/disposal-decision-button.tsx:170`, `:176`, `:186`, `:189`, `:193` · `disposal/disposal-execution-button.tsx:225`, `:227`, `:228`, `:229`, `:230`, `:231`, `:232`, `:234` · `notifications/notification-center-actions.tsx:119` | แค่เปลี่ยน tag ก็ได้หน้าตา |
| `disabled:opacity-60` 9 ช่อง | `admin/role-permission-form.tsx:153` · `asset-operations/transaction-cancel-dialog.tsx:148` · `assets/asset-form.tsx:1116`, `:1126`, `:1136` · `audit/audit-mark-not-found-button.tsx:106` · `audit/audit-round-cancel-button.tsx:101` · `audit/audit-scan-component-missing-dialog.tsx:48` · `ui/confirm-text-dialog.tsx:73` | ลบ `disabled:opacity-60` |
| ผ่าน `<fieldset disabled>` 4 ช่อง | `disposal/disposal-bulk-execution.tsx:1032`, `:1042`, `:1056`, `:1071` | ลบ `disabled:opacity-60` |
| แบบอื่น 2 ช่อง | `asset-operations/checkin-form.tsx:603` (`disabled:bg-muted …`) · `assets/asset-component-manager.tsx:572` (`disabled:opacity-50`) | ลบ class เหล่านั้น |
| `ScannerTextInput disabled` | `assets/asset-form.tsx:897` | ข้อตัดสินย่อย 5 |

ช่องที่ disabled ระหว่างบันทึก (`disabled={saving}`) คงไว้ทั้งหมด dialog ตัดสินและดำเนินการตัดจำหน่ายจะเป็นสีเทาทั้งกล่องตอนกดบันทึก (ความเสี่ยงข้อ 3)

### 4.14 รายการช่องทั้งหมดตามไฟล์ของแต่ละชุด

นับที่ `5ffee76` เฉพาะส่วนที่เป็นของ 2C (ไม่นับ checkbox ของ 2B และ `audit-scan-room-picker.tsx:75`) · "ช่อง" = `input`/`select`/`textarea` (in/sel/ta) · "ไม่มีชื่อ" รวม `ScannerTextInput` · "disabled" ในวงเล็บ = ไม่มีหน้าตา · "required", "maxLength", "minLength" เป็นค่าตั้งต้นของ guard floor ข้อ 4.16 · "hint" = บรรทัดที่ตรงกับ regex ของ F6 · "ดอกจัน" = ดอกจันแดงของไฟล์

| ชุด | ไฟล์ | ช่อง (in/sel/ta) | `Field` ของไฟล์ :นิยาม ×เรียก | wrapper ×เรียก | ไม่มีชื่อ | chk/radio | 44 บนจอใหญ่ | disabled | วันที่ | เงิน | required | maxLength | minLength | hint | ดอกจัน |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1a | `maintenance/maintenance-plan-form.tsx` | 5 (3/1/1) | :159 ×5 | – | – | – | – | – | 1 | – | 4 | 2 | – | – | 1 |
| 1a | `maintenance/repair-record-form.tsx` | 5 (3/0/2) | :249 ×6 | – | – | 1 | 3 | – | 1 | 1 | 2 | 3 | – | 2 | 3 |
| 1a | `maintenance/repair-record-actions.tsx` | 10 (6/0/4) | :220 ×11 | – | – | 1 | 6 | – | 2 | 2 | 3 | 6 | – | – | 2 |
| 1a | `maintenance/maintenance-attachments.tsx` | 1 (0/1/0) | – | – | – | – | – | – | – | – | – | – | – | 1 | – |
| **1a** | **4 ไฟล์** | **21** | 22 | 0 | 0 | 2 | 9 | 0 | 4 | 3 | 9 | 11 | 0 | 3 | 6 |
| 1b | `asset-operations/checkin-form.tsx` | 7 (3/1/3) | :588 ×6 | `Select` ×4 | – | – | 1 | 1 | 1 | – | 1 | – | – | 3 | 1 |
| 1b | `asset-operations/checkout-form.tsx` | 4 (2/1/1) | :406 ×5 | `Select` ×2 | – | 1 | – | – | 2 | – | 3 | – | – | – | 2 |
| 1b | `asset-operations/transfer-form.tsx` | 2 (1/0/1) | :168 ×2 | – | – | – | – | – | – | – | 1 | 1 | – | – | 1 |
| 1b | `asset-operations/bulk-move-form.tsx` | 3 (2/0/1) | :141 ×2 | – | 1 | – | – | – | – | – | 1 | 1 | – | – | 2 |
| **1b** | **4 ไฟล์ (+2 ไม่มีช่อง)** | **16** | 15 | 6 | 1 | 1 | 1 | 1 (0) | 3 | 0 | 6 | 2 | 0 | 3 | 6 |
| 1c | `disposal/disposal-request-form.tsx` | 4 (2/1/1) | :227 ×4 | `Select` ×1 | – | – | – | – | – | 2 | 2 | 1 | 1 | 1 | 1 |
| 1c | `disposal/disposal-batch-form.tsx` | 4 (2/1/1) | :130 ×4 | – | – | – | 3 | – | – | 2 | 1 | 1 | 1 | 1 | – |
| 1c | `disposal/disposal-execution-button.tsx` | 8 (5/1/2) | :245 ×8 | – | – | 2 | – | 8 (8) | 1 | 2 | 7 | 4 | 1 | 1 | 1 |
| 1c | `disposal/disposal-asset-picker.tsx` | 1 (1/0/0) | – | – | 1 | – | 1 | – | – | – | – | – | – | – | 1 |
| 1c | `disposal/disposal-decision-button.tsx` | 5 (2/2/1) | :210 ×5 | – | – | – | – | 5 (5) | – | 2 | 3 | 1 | – | 2 | 1 |
| **1c** | **5 ไฟล์** | **22** | 21 | 1 | 1 | 2 | 4 | 13 (13) | 1 | 8 | 13 | 7 | 3 | 5 | 4 |
| 1d | `audit/audit-scan-check-form.tsx` | 2 (0/1/1) | – | – | – | 1 | – | 1 (1) | – | – | – | – | – | – | – |
| 1d | `audit/audit-finding-review-actions.tsx` | 5 (1/1/3) | – | – | – | – | – | – | 1 | – | 1 | 3 | – | – | – |
| 1d | `audit/audit-mark-not-found-button.tsx` | 1 (0/0/1) | – | – | – | – | – | 1 | – | – | – | – | – | – | – |
| 1d | `audit/audit-scan-component-missing-dialog.tsx` | 1 (0/0/1) | – | – | – | – | – | 1 | – | – | – | – | – | – | – |
| **1d** | **4 ไฟล์** | **9** | 0 | 0 | 0 | 1 | 0 | 3 (1) | 1 | 0 | 1 | 3 | 0 | 0 | 0 |
| 1e | `assets/asset-form.tsx` | 27 (20/5/2) | :1532 ×18 | `SelectField` ×12 | 8 | 5 | – | 3 | 4 | 2 | 6 | 10 | – | 8 | 3 |
| 1e | `assets/asset-batch-form.tsx` | 13 (12/1/0) | :1138 ×12 | `SelectField` ×12 | 2 | 3 | – | – | 3 | 1 | 2 | 5 | – | 11 | 1 |
| 1e | `assets/asset-component-manager.tsx` | 5 (3/0/2) | – | – | 1 | – | 3 | 1 | 1 | – | – | 4 | – | 2 | – |
| 1e | `assets/asset-attachments.tsx` | 1 (0/1/0) | – | – | 1 | – | – | – | – | – | – | – | – | 2 | – |
| **1e** | **4 ไฟล์** | **46** | 30 | 24 | 12 | 8 | 3 | 4 (0) | 8 | 3 | 8 | 19 | 0 | 23 | 4 |
| 1f | `admin/system-settings-form.tsx` | 50 (46/4/0) | :2328 ×46 | – | 2 | 3 | – | – | – | – | – | 1 | – | 5 | – |
| 1f | `admin/depreciation-policy-builder.tsx` | 9 (8/0/1) | – | – | 1 | 1 | – | 6 (6) | 1 | – | – | – | – | – | – |
| **1f** | **2 ไฟล์** | **59** | 46 | 0 | 3 | 4 | 0 | 6 (6) | 1 | 0 | 0 | 1 | 0 | 5 | 0 |
| 1g | `master-data/asset-model-form.tsx` | 6 (3/2/1) | :455 ×4 | – | 2 | 1 | – | – | – | – | 3 | 1 | – | 1 | 1 |
| **ชุด 1** | **24 ไฟล์ (+2)** | **179** | **138** | **31** | **19** | **19** | **17** | **27 (20)** | **18** | **14** | **40** | **44** | **3** | **40** | **21** |
| 2 | `master-data/branch-form.tsx` | 5 (3/1/1) | :197 ×5 | – | – | 1 | – | – | – | – | 3 | 4 | – | – | 1 |
| 2 | `master-data/brand-form.tsx` | 1 (1/0/0) | – | – | – | 1 | – | – | – | – | 1 | 1 | – | – | 1 |
| 2 | `master-data/category-form.tsx` | 9 (6/1/2) | :252 ×8 | – | 1 | 2 | – | – | – | – | 4 | 7 | – | – | 1 |
| 2 | `master-data/company-form.tsx` | 6 (5/0/1) | :196 ×6 | – | – | 1 | – | – | – | – | 2 | 6 | – | 2 | 1 |
| 2 | `master-data/department-form.tsx` | 3 (2/1/0) | :171 ×3 | – | – | 1 | – | – | – | – | 2 | 2 | – | – | 1 |
| 2 | `master-data/employee-form.tsx` | 10 (5/5/0) | :323 ×10 | – | – | 1 | – | – | – | – | 6 | 5 | – | – | 1 |
| 2 | `master-data/location-form.tsx` | 6 (2/3/1) | :235 ×6 | – | – | 1 | – | – | – | – | 4 | 3 | – | – | 1 |
| 2 | `master-data/supplier-form.tsx` | 6 (5/0/1) | :277 ×6 | – | – | 1 | 5 | – | – | – | 2 | 6 | – | – | 1 |
| **ชุด 2** | **8 ไฟล์** | **46** | 44 | 0 | 1 | 9 | 5 | 0 | 0 | 0 | 24 | 34 | 0 | 2 | 8 |
| 3 | `disposal/disposal-bulk-approval.tsx` | 1 (0/0/1) | – | – | – | – (2B 2) | – | 1 (1) | – | – | – | 1 | – | 2 | – |
| 3 | `disposal/disposal-bulk-execution.tsx` | 5 (2/2/1) | – | – | – | 3 (2B 2) | 4 | 4 | 1 | – | 4 | 2 | 1 | 2 | – |
| 3 | `audit/audit-round-form.tsx` | 6 (5/1/0) | :313 ×6 | `Select` ×10 | – | 1 | – | – | 2 | – | 6 | 1 | – | 3 | 1 |
| 3 | `audit/audit-round-cancel-button.tsx` | 1 (0/0/1) | – | – | – | – | – | 1 | – | – | 1 | – | – | – | – |
| 3 | `audit/audit-scan-room-picker.tsx` | 1 (0/1/0) · `:75` ไม่แตะ | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 3 | `ui/confirm-text-dialog.tsx` | 1 (0/0/1) | – | – | – | – | – | 1 | – | – | – | – | – | – | – |
| **ชุด 3** | **6 ไฟล์** (+ `audit-findings-batch-actions.tsx` มีแค่ checkbox ของ 2B) | **15** | 6 | 10 | 0 | 4 | 4 | 7 (1) | 3 | 0 | 11 | 4 | 1 | 7 | 1 |
| 4 | `admin/admin-user-form.tsx` | 5 (4/1/0) | :230 ×5 | – | – | 2 | – | – | – | – | 3 | 4 | 1 | – | 1 |
| 4 | `admin/role-permission-form.tsx` | 4 (3/0/1) | :287 ×4 | – | – | 3 | – | 1 | – | – | 2 | 3 | – | – | 1 |
| 4 | `admin/IntegrationClientManager.tsx` | 3 (3/0/0) | – | – | – | 3 | 3 | – | – | – | 3 | 3 | 1 | – | – |
| 4 | `admin/asset-state-review-dialog.tsx` | 3 (0/2/1) | – | – | – | – | 2 | – | – | – | 1 | 1 | 1 | 1 | – |
| 4 | `admin/data-quality-rule-form.tsx` | 1 (0/1/0) | – | – | 1 | 1 | – | – | – | – | – | – | – | – | – |
| 4 | `assets/asset-label-batch-tool.tsx` | 4 (3/1/0) | – | `QueueSelect` ×7 | – | – | 4 | – | 2 | – | – | – | – | 2 | – |
| 4 | `assets/asset-label-print.tsx` | 2 (1/1/0) คงกล่อง | – | – | – | – | – | – | – | – | – | 1 | – | – | – |
| 4 | `assets/asset-status-correction-button.tsx` | 1 (0/0/1) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 4 | `assets/asset-register-table.tsx` (dialog `:697-774`) | 4 (1/2/1) | – | – | – | – (2B 2) | – | – | – | – | 1 | 1 | – | – | – |
| 4 | `asset-operations/transaction-cancel-dialog.tsx` | 1 (0/0/1) | – | – | – | – | – | 1 | – | – | – | 1 | – | – | – |
| 4 | `auth/login-form.tsx` | 2 (2/0/0) | – | – | – | – | – | – | – | – | 2 | – | – | – | – |
| 4 | `reports/report-preset-controls.tsx` | 1 (1/0/0) | – | – | – | – | – | – | – | – | – | 1 | – | 1 | – |
| 4 | `notifications/notification-center-actions.tsx` | 1 (0/1/0) | – | – | – | – | – | 1 (1) | – | – | – | – | – | – | – |
| **ชุด 4** | **13 ไฟล์** (+ `asset-scan-search-tool.tsx` แก้แค่ป้าย) | **32** | 9 | 7 | 1 | 9 | 9 | 3 (1) | 2 | 0 | 12 | 15 | 3 | 4 | 2 |
| **รวม** | **51 ไฟล์** | **272** | **197** | **48** | **21** | **41** | **35** | **37 (22)** | **23** | **14** | **87** | **97** | **7** | **53** | **32** |

จุดเฉพาะของแต่ละชุด (นอกจากกติกาทั่วไป):

- **1a:** ค่าคงที่ 4 ตัว (F3) · legend 3 จุดและ radio R2/R3 · ช่องไฟล์ 2 ช่องรอ K19 · textarea `rows={2}` 3 ช่อง (ข้อ 4.6) · แบบฟอร์มแผน PM อยู่บน `bg-primary-soft` (`maintenance-plan-form.tsx:81`) ขอบช่องได้ 3.00:1 ผ่านเพราะพื้นช่องเป็นสีขาว
- **1b:** `Select` 2 ตัว · `checkout-form.tsx:306` (`FileDropzone` ใน `Field`) · legend + radio R1 · ช่องค้นหา 2 ช่อง (ข้อ 4.9) · `checkin-form.tsx:353` และ `:556` อยู่บน `bg-warning-soft`
- **1c:** ช่องเงิน 8 ช่อง · ช่องใน dialog 13 ช่องที่ disabled ตอนบันทึก · `disposal-asset-picker` เป็น combobox · ตัวนับ 2 จุด (F6) · `disposal-execution-button.tsx:234` ใช้ `FieldHint` ต่อท้าย (F6)
- **1d:** textarea 6 ช่องใน dialog · `audit-finding-review-actions.tsx` ใช้ `<label>` ที่ไม่มี class 5 จุด · `audit-mark-not-found-button.tsx:106` และ `audit-scan-component-missing-dialog.tsx:48` เป็น `htmlFor`/`<label>` + `mt-2` (ลบ `mt-2`)
- **1e:** ใหญ่สุดของชุด 1 · ไม่มีชื่อ 12 จุด (ข้อ 4.8) · error เดิม 2 จุด · `labelAction` 2 จุด · `TemplateField` (`asset-form.tsx:1704`): `<Field label={label} required={definition.isRequired}>` + `NativeSelect`/`Input` ที่มี `required={definition.isRequired}` · แถวเอกสารจัดซื้อ 4 ช่อง · `inputClassName` ของ `asset-batch-form` ใช้ 13 ที่
- **1f:** L1' 46 ครั้ง · `font-mono` 12 ช่องและ `uppercase` 6 ช่องของ settings คงไว้ (`font-mono` อีก 1 ช่องที่ `depreciation-policy-builder.tsx:319`) · ช่องค้นหา 3 ช่อง ช่องตัวอย่าง 2 ช่อง JSON 1 ช่อง · ห้ามแก้ `system-settings-form.tsx:937-956` (O7)
- **1g:** repeater spec 2 ช่อง (ข้อ 4.8)
- **2:** แบบเดียวกันทั้ง 8 ไฟล์ · supplier error 6 จุด · textarea `resize-none` 3 จุด (`branch-form.tsx:160`, `company-form.tsx:159`, `location-form.tsx:208`) ลบ `resize-none`
- **3:** `SharedValueFields` (`disposal-bulk-execution.tsx:999`) ใช้ `Field` ใน `<fieldset disabled>` · `audit-scan-room-picker.tsx:86` → `<Field label={t("roomDepartment")}><NativeSelect …/></Field>` · `ui/confirm-text-dialog.tsx:73` คง `ref={inputRef}` และ `id={fieldId}`
- **4:** login (ข้อตัดสินย่อย 10) · `asset-scan-search-tool.tsx:115` ป้ายเป็น `<Field label={labels.queryLabel}>` ห่อ `ScannerTextInput id="asset-scan-query"` · `notification-center-actions.tsx:119` → `<NativeSelect fieldSize="md" className="min-w-44">` ใน `<label>` เดิม · `report-preset-controls.tsx:72` → `<Field label={labels.presetName} className="min-w-0 flex-1">`

### 4.15 ข้อความใหม่

แก้ผ่าน `node scripts/messages-edit.mjs <changes.json>` ใน commit ของชุดที่ใช้ ทุกคำไม่ติดกฎของ `tests/thai-glossary.test.ts`

| key | th | en | ชุด |
|---|---|---|---|
| `asset.purchasePriceBaht` | ราคาซื้อ (บาท) | Purchase Price (THB) | 1e |
| `asset.purchaseDocumentAmountBaht` | ยอดรวม (บาท) | Total amount (THB) | 1e |
| `asset.purchaseDocumentDate` | วันที่เอกสาร | Document Date | 1e |
| `asset.photoType` | ประเภทรูป | Photo type | 1e |
| `disposalPage.saleValueBaht` | มูลค่าขาย (บาท) | Sale Value (THB) | 1c |
| `disposalPage.salvageValueBaht` | มูลค่าซาก (บาท) | Salvage Value (THB) | 1c |
| `disposalPage.actualSaleValueBaht` | มูลค่าขายจริง (บาท) | Actual Sale Value (THB) | 1c |
| `disposalPage.actualSalvageValueBaht` | มูลค่าซากจริง (บาท) | Actual Salvage Value (THB) | 1c |

- ภาษาอังกฤษใช้ตัวพิมพ์ตาม key เดิมที่อยู่ข้างกัน และใช้ "(THB)" ตาม `repairRecord.cost` ("Total cost (THB)")
- `asset.purchaseDocumentDate` ใช้คำเดียวกับ `supplier.documentDate` · `asset.photoType` ใช้คำเดียวกับ `checkin.photoType`/`auditScan.photoType`
- ไม่มี key ไหนถูกลบ key เดิมทั้ง 6 ตัวยังใช้ในหน้าแสดงผล
- ป้ายระดับของกฎใช้ `dataQualityPage.assetStateReviews.severity` ("ระดับความสำคัญ") ที่มีอยู่แล้ว ส่งผ่าน `labels.severity` (ข้อ 4.8 ข้อ 1)

### 4.16 Test

**แก้ test เดิม** (ในงานเดียวกับที่ทำให้พัง):

| test:บรรทัด | เดิม | ใหม่ | ชุด |
|---|---|---|---|
| `tests/field-primitives.test.ts` (เพิ่มใน test ที่เริ่ม `:82`) | — | `import { fieldLabelClasses }` แล้ว `assert.equal(fieldLabelClasses, "text-meta font-medium text-foreground")` · `field.tsx` ต้องมี `cn(fieldLabelClasses, visuallyHidden && "sr-only", className)` | 2C-0 |
| `tests/audit-not-found-dialog.test.ts:14` | `/<textarea/` | `/<Textarea/` | 1d |
| `tests/settings-depreciation-policy-ui.test.ts:53` | `/<textarea[\s\S]*onPolicyJsonChange/` | `/<Textarea[\s\S]*onPolicyJsonChange/` | 1f |
| `tests/supplier-form-ui.test.ts:18-20` | `/aria-invalid=/`, `/aria-describedby=/`, `/role="alert"/` | `/import \{ Field \} from "@\/components\/ui\/field"/` · วนตรวจ `id="supplier-(code\|name\|contact\|phone\|email\|address)"` ครบ 6 · `source.match(/error=\{fieldErrors\.\w+ \? getErrorMessage\(fieldErrors\.\w+\) : undefined\}/g)?.length === 6` · `assert.doesNotMatch(source, /errorId=\|function Field\(/)` (`role="alert"` ย้ายไปอยู่ใน `FieldError` ซึ่ง `field-primitives.test.ts:88` ตรวจแล้ว) | 2 |
| `tests/asset-label-print-ui.test.ts:155` | `<p className="mt-2 text-xs text-muted-foreground">{labels.minChars}</p>` | `/hint=\{trimmedQuery\.length < 2 \? labels\.minChars : undefined\}/` (`:156` ยังผ่าน) | 4 |
| `tests/asset-scan-search-tool.test.ts:43` | `/<label[^>]+htmlFor="asset-scan-query"/` | `/<Field label=\{labels\.queryLabel\}>\s*<ScannerTextInput\s+id="asset-scan-query"/` (`:44-46` ยังผ่าน) | 4 |

**test ที่ต้องผ่านต่อโดยไม่แก้** (ใส่เป็นข้อบังคับในงานของแต่ละไฟล์):

- `tests/asset-batch-form-layout.test.ts:22-23`: `Field label={t("batchAssetTag")}` และ `Field label={t("batchSerialNumber")}` เขียนตามนี้ (`label=` เป็น prop แรก) ในการ์ดมือถือก่อนตารางในหน้าจอใหญ่
- `tests/disposal-evidence-exception.test.ts:157-162`: `aria-describedby={evidenceExceptionReasonHelpId}`, `aria-describedby={historicalEvidenceWarningId}`, `minLength={20}`, `maxLength={2000}` อยู่บนช่อง
- `tests/disposal-bulk-execution-ui.test.ts:87`, `:105`: `aria-describedby=` และ `maxLength={200}`
- `tests/asset-state-review-ui.test.ts:15`: `minLength={10}`
- `tests/login-form-ui.test.ts:13-20`: `FieldLabel htmlFor="login-username"`/`"login-password"` และ `Input` ที่มี `id`, `name`, `autoComplete` เดิม · `:37-38` (`role="alert"`, `aria-live="polite"`) เป็นของส่วนที่เปลี่ยนกล่อง error เป็น `Notice`
- `tests/supplier-form-ui.test.ts:8-13`: `type="tel"`, `inputMode="tel"`, `autoComplete` ทั้ง 3 ค่า และ `min-h-11` (จาก `<label>` checkbox `:229`)
- `tests/settings-depreciation-policy-ui.test.ts:50`, `:55`, `:57`: ลำดับ attribute ของช่องตัวอย่าง (ข้อ 4.9) · `disabled={!isPolicyJsonValid}` และ `disabled={disabled || isConflict}` คง expression เดิม
- `tests/settings-ldap-role-ui.test.ts:15`: ห้ามเพิ่ม `id="ldap-default-role"`
- `tests/confirm-text-dialog-ui.test.ts:10`: `initialFocusRef={inputRef}` กับ `ref={inputRef}` บน `Textarea`
- `tests/asset-status-help-ui.test.ts:28-30`: `AssetStateHelpPopover`, `statusHelpTitle`, `conditionHelpTitle` ยังอยู่ใน `asset-form.tsx`
- `tests/audit-scan-search-ui.test.ts:15-16`: ไม่แตะ `audit-scan-search.tsx` (O20)
- `tests/asset-register-table-ui.test.ts:158`, `:161`, `tests/disposal-bulk-approval.test.ts:92`, `tests/disposal-bulk-execution-ui.test.ts:33`: checkbox ของ 2B ส่วนนี้ไม่แตะ

**test ไฟล์ใหม่ `tests/form-field-guards.test.ts`** (เป็นของ 2C · แยกจาก `visual-foundation-guards.test.ts` เพื่อไม่ชนกับ 2B · ตรวจเฉพาะ 51 ไฟล์ของข้อ 4.14 + `assets/asset-scan-search-tool.tsx` · อ่าน JSX ด้วย `import ts from "typescript"` เพราะ attribute มี `=>` ที่ regex แบบ `[^>]*` อ่านพลาด):

| # | ตรวจ | ค่าที่ `5ffee76` | ค่าหลัง 2C |
|---|---|---|---|
| G1 | ไม่มี `function Field(` นอก `src/components/ui/field.tsx` ยกเว้นไฟล์ใน set ที่ยังไม่ได้ย้าย | 25 ไฟล์ใน set | set ว่าง |
| G2 | budget ต่อไฟล์ของ `<input>` (ไม่นับ checkbox, radio, hidden, file), `<select>`, `<textarea>` ที่เขียนเอง | คอลัมน์ "ช่อง" ข้อ 4.14 (`audit-scan-room-picker.tsx` = 2) | `{ "src/components/assets/asset-label-print.tsx": 2, "src/components/audit/audit-scan-room-picker.tsx": 1 }` |
| G3 | `Field` ที่มี `required` → ลูกที่เป็น `Input`/`NativeSelect`/`Textarea` ต้องมี `required` · ลูกที่มี `required` → `Field` ต้องมี `required` · ลูกที่เป็นฟังก์ชันต้องมีคำว่า `required` ในตัวฟังก์ชันถ้า `Field` มี `required` | — | ยกเว้น 3 จุด: `asset-operations/checkin-form.tsx` `t("returnDate")` · `assets/asset-form.tsx` `t("licenseTotalSeats")` · `assets/asset-form.tsx` `t("componentRole")` |
| G4 | floor ต่อไฟล์: จำนวน attribute `required`, `maxLength`, `minLength` บนช่อง (`Input`, `NativeSelect`, `Textarea`, `SearchField`, `ScannerTextInput` และ tag เดิม) ต้องไม่น้อยกว่าค่าตั้งต้น | คอลัมน์ "required", "maxLength", "minLength" ข้อ 4.14 (รวม 87 / 97 / 7) | ไม่น้อยกว่าเดิม |
| G5 | ทุก `Input` ที่มี `step="0.01"` ต้องมี `inputMode="decimal"` และมี 14 ตัวใน 2C · key `*Baht` 6 ตัวมีใน th และ en, th มี "(บาท)", en มี "(THB)" | 3 ตัวมี | 14 ตัวมี |
| G6 | budget regex ต่อไฟล์ `/\b(?:h-4 w-4\|h-5 w-5\|h-3\.5 w-3\.5) rounded border-border\b\|\baccent-primary\b/g` | 46 ใน 25 ไฟล์ | `{ asset-register-table.tsx: 2, disposal-bulk-approval.tsx: 2, disposal-bulk-execution.tsx: 2, audit-findings-batch-actions.tsx: 1 }` (ของ 2B ให้ 2B ลด) |
| G7 | budget regex `/ml-1 text-danger">\*/g` | 32 ใน 25 ไฟล์ (คอลัมน์ "ดอกจัน") | `{}` |
| G8 | budget regex `/mb-1\.5 block text-sm font-medium text-foreground/g` | 48 ใน 35 ไฟล์ | `{}` |
| G9 | `/<legend className="mb-2 text-sm font-medium text-foreground"/g` | 6 ใน 4 ไฟล์ | `{}` · และ `<legend` ทุกตัวในไฟล์ของ 2C มี `fieldLabelClasses` |
| G10 | `asset-batch-form.tsx` ไม่มี `aria-label={t("batchAssetTagHelp")}` · `asset-form.tsx` ไม่มี `function AssetStateFieldLabel` | มีทั้งคู่ | ไม่มี |

- G1, G2, G6–G9 เป็น ratchet: งานของแต่ละไฟล์ลดตัวเลขของไฟล์นั้นใน commit เดียวกัน ห้ามเพิ่ม · 2D ตั้ง G2 เป็น `{}` ได้หลังเฟส 3 ตัดสินแถบเครื่องมือหน้าพิมพ์
- ค่าตั้งต้นของ G8 ต่อไฟล์: `audit-finding-review-actions.tsx` 5 · `asset-component-manager.tsx` 4 · `asset-register-table.tsx` 4 · `bulk-move-form.tsx` 2 · `asset-form.tsx` 2 · `login-form.tsx` 2 · ไฟล์อื่น 1 ได้แก่ `maintenance-plan-form`, `repair-record-form`, `repair-record-actions`, `maintenance-attachments`, `checkin-form`, `checkout-form`, `transfer-form`, `disposal-request-form`, `disposal-batch-form`, `disposal-execution-button`, `disposal-decision-button`, `asset-batch-form`, `system-settings-form`, `asset-model-form`, master-data 8 ไฟล์, `disposal-bulk-approval`, `audit-round-form`, `admin-user-form`, `role-permission-form`, `asset-label-batch-tool`, `asset-scan-search-tool`, `report-preset-controls`
- G3 อ่านชื่อ tag จาก AST: ลูกของ `Field` คือ element แรกที่ไม่ใช่ข้อความว่าง ถ้าเป็น wrapper (`Select`, `SelectField`, `QueueSelect`) ให้ตรวจที่นิยามของ wrapper แทน

### 4.17 เอกสาร

ทำในงานเอกสารท้าย 2C (แบบ I19 ของ 2A) ส่วนนี้ให้แค่รายการ:

- `DESIGN.md:426` (Migration): เปลี่ยนเป็นจำนวนที่เหลือหลัง 2C (ช่องเขียนเองเหลือ 2 ช่องในแถบเครื่องมือหน้าพิมพ์ + `audit-scan-room-picker.tsx:75` ที่ใช้ helper)
- `DESIGN.md:273`: ตัดประโยค "hand-written field labels move to it in phase 2C"
- `DESIGN.md` §Inputs เพิ่ม: legend ใช้ `fieldLabelClasses` · ช่องที่ไม่มีป้ายใช้ `Field hideLabel` · ช่องเงินมีหน่วยในป้ายและ `inputMode="decimal"` · `Field required` คู่กับ `required` ของช่อง
- `docs/14_UI_UX_DESIGN_SYSTEM.md` ให้ตรงกับ DESIGN.md · wiki `AssetSystem` + `ams-log.md` + `wiki-lint`

### 4.18 ข้อตัดสินย่อย

1. **ป้ายช่องเงินเป็น key ใหม่ 6 ตัว ไม่ใช่การแก้ key เดิม 11 ตัว** 11 ช่องใช้ป้ายแค่ 6 key และ key เดิมใช้กับป้ายแบบอ่านอย่างเดียวที่ค่ามี ฿ อยู่แล้ว (ข้อ 4.11) ใช้ `messages-edit.mjs` ตาม K26
2. **แถวสร้างเอกสารจัดซื้อ (`asset-form.tsx:1218-1240`) ใช้ป้ายที่มองเห็นทั้ง 4 ช่อง** ช่องวันที่ไม่มี key เลยจึงเข้าเงื่อนไข "ป้ายจริงเมื่อไม่มีป้าย" ของ K20 แถวเดียวกันไม่ควรมีทั้งป้ายที่มองเห็นและป้ายที่ซ่อน และ placeholder หายไปเมื่อพิมพ์ ถ้าเจ้าของต้องการความแน่นแบบเดิม เปลี่ยนเป็น `hideLabel` ได้โดยไม่ต้องแก้ key
3. **ช่องที่ไม่มีป้ายใช้ `Field hideLabel` ทุกที่ รวมใน `<td>` repeater และ `ScannerTextInput`** ได้ id, hint และ error ครบในรูปแบบเดียว `aria-label` ใช้กับ `SearchField` ที่ไม่มี hint เท่านั้น ส่วนนี้จึงไม่ต้องพึ่ง `aria-label` passthrough ของ `ScannerTextInput`
4. **`Field required` คู่กับ `required` ของช่องทั้งสองทาง** ช่อง 12 ช่องที่มี `required` แต่ไม่มีดอกจันจะได้ดอกจันสี warning และ `aria-required` (เปลี่ยนแค่หน้าตาและสิ่งที่ screen reader อ่าน) ดอกจัน 3 จุดที่ช่องไม่มี `required` คงไว้ เพราะเซิร์ฟเวอร์บังคับจริง และการเพิ่ม `required` เป็นงานของ V track
5. **`ScannerTextInput` ส่ง `disabled` ให้ช่องข้อความด้วย** (2A ข้อ 6.8 ข้อ 26 ฝากไว้) ช่องอื่นทุกช่องในฟอร์มเดียวกัน disabled ตอนบันทึกอยู่แล้ว · แก้ในงาน 2C-0
6. **textarea `rows={2}` ที่ไม่มี min-h ใส่ `min-h-16`** เพื่อไม่ให้สูงขึ้นเป็น 96px ตาม `textareaClasses` · `resize-none` 3 จุดลบออก ใช้ `resize-y` ของ 2A
7. **id ที่ test ยึดไว้** คง `aria-describedby={xId}` บนช่อง และย้ายข้อความเป็น `FieldHint id={xId}` ต่อจาก `</Field>` แทนการใช้ `hint` ของ `Field`
8. **คำอธิบายหลายบรรทัดหรือชิดขวา** ส่งเป็น ReactNode ใน `hint` (`<span className="block">`, `<span className="block text-right">`) ไม่เพิ่ม prop ใหม่ให้ `Field`
9. **แถบเครื่องมือหน้าพิมพ์ป้าย** คงแบบป้ายในกล่อง (K21) แต่ใช้ขอบ `border-input` พื้น `bg-surface` วงโฟกัสแบบช่องผ่าน `focus-within:` และตัวอักษร 16px ใต้ `md` (iOS ไม่ซูม) · สลับความสูงที่ `md` แทน `sm`
10. **login ใช้ `FieldLabel` + `Input`** ไม่ใช้ `Field` เพราะ test ยึดข้อความ `htmlFor="login-…"` และช่องรหัสผ่านมีปุ่มอยู่ในกรอบเดียวกัน · ไม่มีดอกจัน (หน้าเข้าสู่ระบบมี 2 ช่องที่ต้องกรอกทั้งคู่)
11. **ระดับของกฎคุณภาพข้อมูลมีป้ายที่มองเห็น** ใช้ key เดิม `dataQualityPage.assetStateReviews.severity` และ `aria-describedby` ชี้ชื่อกฎ เพื่อให้ screen reader รู้ว่าเป็นของกฎไหน
12. **JSON ขั้นสูงของนโยบายค่าเสื่อม** ใช้ข้อความ `<summary>` เป็นป้ายซ่อน และย้ายคำอธิบายจากบนช่องไปเป็น hint ใต้ช่อง
13. **แถว checkbox ที่ disabled ได้** ใช้ `has-disabled:cursor-not-allowed has-disabled:text-faint-foreground` ไม่ใช้ opacity ตามหน้าตา disabled ของ 2A
14. **เป้ากด 12 จุดของ K16 แบ่ง 2C 9 จุด 2B 3 จุด** ตาม O1/O4 · แถวประมาณ 40px 14 จุด (B2) คงความสูง
15. **ความสูง K7 ของช่องคือ 35 ช่องใน 2C** อีก 1 ช่องเป็นของ 2B (O3)
16. **select wrapper คงชื่อและ props** ที่เรียก 48 ครั้งไม่แก้ · ไอคอนในป้ายของ `QueueSelect` อยู่ใน `FieldLabel` ได้เพราะไม่ใช่ปุ่ม
17. **error ใต้ช่องที่ยังไม่ได้ผูกกับช่อง** (`transaction-cancel-dialog.tsx:150`, `asset-status-correction-button.tsx:78`) คงไว้ให้ V track เพราะ K4 ให้ย้ายแค่ supplier และรหัสซ้ำ
18. **error ของ supplier** ใช้ `Field id="supplier-…"` เพื่อให้ id ของ error เท่าเดิม
19. **`label=` เป็น prop แรกของ `Field` เสมอ** กัน test ที่ค้นข้อความพัง และอ่านง่าย
20. **ช่อง `type="number"` อื่น 26 ช่องไม่เพิ่ม `inputMode`** K26 พูดถึงแค่ช่องเงิน
21. **ช่องที่ disabled ระหว่างบันทึก** คง `disabled={saving}` ไว้ทุกช่อง ไม่เปลี่ยนเป็น `readOnly`
22. **ช่องค้นหา 4 ช่องเปลี่ยนจาก text เป็น search** ตามค่าตั้งต้นของ `SearchField` ไม่เพิ่มปุ่มล้าง
23. **guard ของส่วนนี้อยู่ไฟล์ใหม่ `tests/form-field-guards.test.ts`** เพื่อไม่แก้ไฟล์เดียวกับ 2B และอ่าน JSX ด้วย `typescript` แทน regex

### 4.19 ความเสี่ยง

1. **ความสูงเปลี่ยนทั้งจอ** ใต้ `md` 150 ช่องสูงขึ้น 4px และตัวอักษรเป็น 16px (`asset-form` ประมาณ +80px, settings มากกว่านั้น) · ตั้งแต่ `md` 35 ช่องเตี้ยลง 4px · ช่วง 640–767px 31 ช่องสูงขึ้น 4px ให้เทียบภาพก่อนและหลังบนแอป dev ที่ 375, 700, 768 และ 1440 ทุกจอของชุด 1
2. **ดอกจันเพิ่ม 12 ช่อง** ผู้ใช้จะเห็นดอกจันใหม่ในฟอร์ม Integration, dialog พิจารณาสถานะ, dialog แก้หลายรายการของทะเบียน, แผนแก้ไข, ยกเลิกรอบตรวจนับ, เหตุผลของชุดตัดจำหน่าย และค่าร่วมของการดำเนินการหลายรายการ ไม่มีพฤติกรรมเปลี่ยน
3. **ช่องเป็นสีเทาระหว่างบันทึก** dialog ตัดสิน (5 ช่อง) และดำเนินการตัดจำหน่าย (8 ช่อง) จะเทาทั้งกล่องตอนกดบันทึก และช่องนโยบายค่าเสื่อม 6 ช่องจะเทาเมื่อ JSON ไม่ถูกต้อง ตัวอักษร faint ได้ 5.42:1 บน background ผ่าน AA · ช่อง serial ของ `asset-form` จะเทาตอนบันทึกด้วย (ข้อตัดสินย่อย 5)
4. **ช่องของ supplier เป็นสีแดง** เมื่อมี error ช่องได้ขอบและ halo สีแดงจาก `aria-invalid` ซึ่งวันนี้ไม่มี
5. **`role="alert"` ของรหัสซ้ำ** error รหัสทรัพย์สินและ serial ที่ซ้ำจะถูกอ่านออกเสียงทันทีที่ผลตรวจซ้ำกลับมาระหว่างพิมพ์ ซึ่งวันนี้ไม่อ่าน
6. **ลูกศรของ `NativeSelect` กินที่ 24px** (`pr-9`) ช่องเลือกที่แคบจะตัดคำเร็วขึ้น ให้ดู `notification-center-actions.tsx:119` (`min-w-44`), ช่องระดับของกฎ และช่องเลือกในตารางของ settings
7. **ช่องวันที่บน iOS Safari** ไม่มีกฎ `::-webkit-date-*` ใน `globals.css` ช่องว่างอาจสูงไม่เท่าช่องอื่นหรือไม่แสดงอะไร ให้ลองที่ 375 บนแอป dev ทั้งตอนว่างและตอนมีค่า
8. **ห้ามมี `Field` ใน `<label>`** ตอนแปลง `<label>` ที่เขียนเองต้องลบ `<label>` ตัวนอกออก ไม่ใช่ใส่ `Field` เข้าไปข้างใน ไม่อย่างนั้นจะเป็นป้ายซ้อนกัน
9. **ชื่อ `Field` ซ้ำ** ถ้า import ตัวกลางก่อนลบตัวของไฟล์ TypeScript จะ error · ถ้าลืม import แต่ลบตัวของไฟล์ ก็ error เช่นกัน จึงไม่มีทางหลุดไป Production แต่ทำให้ย้ายทีละครึ่งไฟล์ไม่ได้
10. **ลำดับข้อความที่ test ค้น** formatter ที่จัด JSX ใหม่อาจย้าย `label=` หรือ attribute ของช่องตัวอย่างจนลำดับเปลี่ยน ให้ใส่ข้อบังคับในข้อ 4.16 ไว้ในงานของไฟล์นั้น
11. **key ของช่องเงิน** ถ้ามีคนแก้ค่าของ key เดิมแทนการเพิ่ม key ใหม่ หน้ารายละเอียด หน้าพิมพ์ และหัวคอลัมน์ทะเบียนจะมี "(บาท)" ซ้ำกับ ฿
12. **ช่องในตารางสูงขึ้น** `Field hideLabel` ใน `<td>` ของ `asset-batch-form` และ settings ไม่เพิ่มความสูง (ป้ายเป็น `sr-only`) แต่ hint ที่เป็น 13px จะสูงกว่าเดิมบรรทัดละ 4px
13. **floor ของ G4 แยกการลบโดยตั้งใจไม่ได้** G4 กันการลบ attribute โดยไม่ตั้งใจ ถ้าวันหลังตั้งใจลบช่องหรือข้อจำกัดจริง ต้องลด floor ใน commit เดียวกันและเขียนเหตุผลไว้ข้างตัวเลข
14. **ไฟล์ที่ 2B และ 2C แก้ทั้งคู่** `asset-register-table.tsx`, `disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx`, `audit-findings-batch-actions.tsx` ส่วนนี้แก้แค่ฝั่ง dialog แต่ G6 ยังนับ checkbox ของ 2B ในไฟล์เหล่านี้ ให้ 2B ลดตัวเลขของตัวเองใน `tests/form-field-guards.test.ts` หรือย้ายไปไฟล์ของตัวเองตอน merge
15. **ช่องบนพื้นสี** แผน PM บน `primary-soft` (ขอบ 3.00:1) และ 3 ช่องบน `warning-soft` (3.18:1) ผ่านเพราะพื้นช่องเป็นสีขาว ห้ามวางช่องบน `bg-muted`
