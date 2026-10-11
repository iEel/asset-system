# ฟอร์มและ dialog (UI รอบ 4 เฟส 2C) — Design

วันที่ 2026-10-11 · ฐาน `master` `5ffee76` (2A merge และ push แล้ว ยังไม่ deploy) · branch ที่จะใช้ `feat/ui-phase2c` (P0 แยก branch สั้นตาม I1)

เฟส 2 แบ่งเป็น 4 งานย่อย: **2A รากฐาน → 2C ฟอร์มและ dialog → 2B หน้ารายการและโครงหน้า → 2D กวาดที่เหลือและล็อก guard** · ผู้ใช้เลือกให้ทำ 2C ก่อน 2B (2026-10-11) เพราะ 2A ต้อง deploy พร้อม 2C ชุดแรก (สเปก 2A ข้อ 10 I22) · เอกสารนี้คือ 2C

ข้อมูลที่ใช้ร่าง:
- แผนที่โค้ดที่ `5ffee76` 5 ส่วน (ช่องกรอก · การตรวจกรอก · dialog · ปุ่มและแถบบันทึก · ขั้นตอน) + การตรวจความครบ
- ร่าง 7 ส่วน (ข้อ 3–9) + การตรวจรวม (ข้อ 10) ที่นับตัวเลขใหม่ทุกตัว

## 1. เป้าหมายและหลักฐาน

2C ย้ายฟอร์มและ dialog ไปใช้ของกลางของ 2A:
- ช่องกรอก · ปุ่ม · `busy`
- ส่วนท้าย dialog แบบเดียว
- แถบบันทึกที่ไม่เยื้อง
- ตัวบอกขั้นตอน · ตัวเลือกแบบการ์ด · ช่องแนบไฟล์

2C ไม่เปลี่ยน workflow ไม่เพิ่มหน้า ไม่แตะฐานข้อมูล และไม่เพิ่ม token (I21) · server แก้จุดเดียว คือหยุดส่ง JSON ดิบของ ZodError ให้ผู้ใช้เห็น (ข้อ 8.5)

สิ่งที่พบในโค้ด (`5ffee76`):

| เรื่อง | หลักฐาน |
|---|---|
| ช่องกรอกที่เขียนเอง | 273 ช่องใน 51 ไฟล์ของ 2C (ไม่นับช่องกรองของหน้ารายการที่เป็นของ 2B) · ยังไม่มีไฟล์ไหนนอก `ui/` ใช้ `Input`, `NativeSelect`, `Textarea`, `Field`, `SearchField` ของ 2A |
| `Field` ที่แต่ละไฟล์เขียนเอง | 25 ตัว เรียก 197 จุด · 16 จุดใส่คำอธิบาย ปุ่ม หรือ error ไว้ใน `<label>` |
| ฟอร์มที่ช่องใหม่กับช่องเดิมปนกัน | 16 ฟอร์มตามสเปก 2A · รวมส่วนย่อยบนหน้าเดียวกันและฟอร์มที่มี `FileDropzone` เป็น 26 ไฟล์ 179 ช่อง (ชุด 1) |
| การเข้าถึง | ช่องไม่มีชื่อ 19 + 2 ช่อง · ดอกจันแดง 32 จุดที่ screen reader อ่านออกเสียง · checkbox 49 ตัว เป้ากดเล็กกว่า 44px 12 ตัว · ตัวเลือก 5 กลุ่มไม่บอกว่าเลือกอันไหน |
| ปุ่มในฟอร์มและ dialog | 152 ปุ่มใน 46 ไฟล์ เขียน class เอง 148 · `Loader2` 50 จุด (มี `motion-reduce` 1 จุด) · 18 จุดปิดปุ่มด้วย `disabled` ตอนทำงาน โฟกัสจึงหลุด · ปุ่ม 55 ปุ่มและช่อง 35 ช่องสูง 44px บนจอใหญ่ข้างช่องกลาง 40px |
| dialog | `AccessibleDialog` 23 ตัว · ส่วนท้าย 7 แบบ (11 class string) · ลำดับปุ่มบนมือถือ 3 แบบ · 18 ตัวปุ่มเลื่อนหายเมื่อเนื้อหายาว · ปุ่ม X อ่านว่า "Close" หรือ "ยกเลิก" · ไม่มีต้นแบบ dialog |
| แถบบันทึก | แถบของฟอร์มทรัพย์สินเป็น `fixed` เยื้อง 192px เมื่อย่อเมนูข้าง (G11) · หน้าตั้งค่าบนมือถืออาจถูกแถบเมนูล่างบัง (G11b, อ่านจากโค้ด รอตรวจบนแอป) · 29 จาก 39 หน้าฟอร์มยังแสดงแถบเมนูล่าง |
| ขั้นตอน | 5 แบบ 15 จุด · มีแค่ 2 ที่บอกความคืบหน้าจริง · อีก 3 เป็นหัวข้อมีเลขที่ดูเหมือน "ขั้นปัจจุบัน" ทุกหัวข้อ · มี `aria-current` จุดเดียว |
| error ตรวจกรอก | ไม่มีฟอร์มไหนตรวจด้วย zod ฝั่ง client · 39 จุดเตือนด้วย toast · server 61 route ส่ง `ZodError.message` (JSON ทุก issue) กลับไป ผู้ใช้เห็น toast "เกิดข้อผิดพลาด" ตามด้วย JSON ดิบใน 28 จาก 36 ไฟล์ฟอร์ม |

ผู้ใช้ตัดสิน (2026-10-11):
- 4 ข้อแรกตอบผ่านคำถาม
- ที่เหลือดูหน้าเปรียบเทียบ https://claude.ai/artifact/AWrHhcaCaJWtgJ52XAznEg แล้วเลือก "ใช้ตามแนะนำทั้งหมด"
- ตัวเลือกทุกข้อมาจากการตรวจความครบของแผนที่ (K1–K28)

| # | เรื่อง | เลือก |
|---|---|---|
| ลำดับ | 2B หรือ 2C ก่อน | 2C ก่อน |
| K4 | การตรวจกรอก | ชุด 1–5 เปลี่ยนแค่หน้าตา: คง `required` / `maxLength` บนตัวช่องและ toast เดิม (มี guard กันหาย) · error ใต้ช่องเป็นงาน V แยกหลังชุด 1 ขึ้น Production |
| K6 | JSON ดิบของ ZodError | ชุด 1 หยุด JSON ดิบ (bug fix: ข้อความที่อ่านได้) · งาน V ส่ง `{error, code: "VALIDATION_FAILED", fieldErrors}` |
| K3 | ขอบเขตชุด 1 (ประตู deploy) | 26 ไฟล์ 179 ช่อง |
| K15 | แถบเมนูล่างบนมือถือ | ซ่อนที่หน้าตั้งค่าและหน้า new / `[id]/edit` ทุกหน้า (25 route) · หน้ารายการและเครื่องมือยังมี |
| K8 | ลำดับปุ่ม | ปุ่มหลักท้ายเสมอ · มือถือเรียงลง ยกเลิกบน ปุ่มหลักล่าง · ตั้งแต่ `sm` แถวชิดขวา |
| K9 | ส่วนท้าย dialog | `AccessibleDialogBody` / `AccessibleDialogFooter` แบบเลือกใช้ · ส่วนท้ายอยู่นอกส่วนที่เลื่อน เห็นตลอด · `<form>` ครอบทั้งสองส่วนได้ |
| K14 | แถบบันทึกฟอร์มยาว | `StickyFormFooter` ติดล่างภายในฟอร์ม ไม่มีเงา |
| K17 | ตัวบอกขั้นตอน | วงกลม 22px เรียงต่อกัน · มือถือแสดง "ขั้นที่ x จาก y" |
| K18 | หัวข้อส่วนที่มีเลข | `FormSection` เรียบ เลขในวงกลมเส้น |
| K16 | checkbox และตัวเลือกแบบการ์ด | `checkboxVariants` ทุกที่ · `ChoiceCard` / `ChoiceChip` บน input จริงด้วย `has-checked:` |
| K25 | ปุ่มล้างลายเซ็น | `ghost` `sm` ใต้ช่องเซ็น |
| K24 | `FormContextBanner` | แถวข้อมูลเรียบ ไม่มีพื้นสี |
| K7 | ช่องและปุ่ม 44px บนจอใหญ่ | ช่อง `lg` 40 · ปุ่ม `default` 40 (36 หลัง 2D) · มือถือยัง ≥44 |
| K1 | เจ้าของไฟล์ที่ใช้ร่วมกับ 2B | หนึ่งหน้าที่ หนึ่งเจ้าของ (รั้ว O1–O21 ข้อ 8) |
| K2 | ของกลางที่ 2B ใช้ด้วย | P0 ลง `master` ก่อนแตกสาย: `Segmented` · ช่องปุ่มข้างป้าย `Field` · handle เปิด dialog |
| K5 | งาน V | `validate()` ต่อฟอร์ม · โฟกัสช่องแรกที่ผิด · เลิก toast ตรวจกรอก · `common.validation.*` · `min` ของช่องวันที่คู่ |
| K10–K13 | X ของ dialog · รหัสในคำอธิบาย · dialog ยืนยัน · ป้ายตอน busy | X อ่านว่า "ปิด" · รหัสเป็น `tag` · `AlertDialog` หน้าตาเดียวกัน + ปุ่มเป็นคำกริยา (ชุด 5) · คงป้ายเดิม |
| K19–K23 | ช่องแนบไฟล์ · ช่องไม่มีชื่อ · ช่องค้นหา · variant ขอบ · แถบปุ่มมือถือ | คำอธิบายแสดงตลอด + `Field` ตั้งชื่อได้ · เติมชื่อจาก key เดิม · `SearchField` · ไอคอนลบคง `outline`, ยืนยัน "ไม่พบ" ใช้ `warning` · `ActionBar` เดียว (ชุด 5) |
| K26–K28 | ช่องเงิน · legend · กรอบแผง | หน่วย "(บาท)" ในชื่อช่อง + `inputMode="decimal"` · ใช้ class ป้ายของ `Field` · กรอบแผงยกไป 2D |

ข้อที่ 2A ตัดสินแล้วและ 2C ไม่เปิดใหม่: พื้นช่องสีขาว · ดอกจันสีส้มผ่าน `FieldLabel` · ลูกศรของ `<select>` · ตัวอักษร 16px ใต้ `md` · ขนาดและ variant ของปุ่ม · `danger` กับ `destructive` · มุมโค้ง I15 · ห้ามเพิ่ม token (I21)

## 2. ขอบเขต 2C เทียบกับ 2B / 2D / งาน V

| เรื่อง | 2C (เอกสารนี้) | 2B | 2D | งาน V |
|---|---|---|---|---|
| ของกลาง | P0 (`Segmented`, `Field labelAction`, handle เปิด dialog) · 2C-0 (ส่วนประกอบ dialog, X, sheet, `FileDropzone`, `FileQueueList`, `ScannerTextInput`, `ChoiceCard`, `Steps`, `FormSection`, `FormContextBanner`, `StickyFormFooter`) | ใช้ `Segmented` และ handle · `TabNav` | ลบ `ActionButton` · `getEmptyStateClasses` | hook ตรวจกรอกกลาง |
| ช่องกรอก | ช่องในฟอร์มและ dialog 272 ช่อง · `Field` 25 ตัว · wrapper 7 ตัว · checkbox 41 ตัว | ช่องกรองหน้ารายการ · `FilterSelect` ×7 · `ReportSelect` · ตัวเลือกแถวในรายการ | — | error ใต้ช่องทุกฟอร์ม |
| ปุ่ม | ปุ่มในฟอร์มและ dialog 152 ปุ่ม · `Loader2` → `busy` | ปุ่มหน้ารายการ · `RowActions` | ปุ่มที่เหลือ · ค่าตั้งต้น 36 | — |
| dialog | ทุก dialog และ sheet chrome · `AlertDialog` (ชุด 5) | เนื้อใน sheet ตัวกรองและ sheet ⋯ | — | — |
| กล่องแจ้ง | เฉพาะจุดที่มีสเปก (I35) | `TableEmptyRow` | กล่องแจ้งและกล่องว่างที่เหลือ | — |
| server | หยุด JSON ดิบของ ZodError | — | — | `fieldErrors` |

ลำดับการทำและการ deploy: ข้อ 8 และข้อ 10.3
- **plan 1** = P0 + 2C-0 + แก้ ZodError + ชุด 1 · deploy พร้อม 2A และ 56 commit ที่ยังไม่ deploy
- **plan 2–5** ทำทีละชุด
- **งาน V** มีสเปกของตัวเอง

## 3–9. รายละเอียดแต่ละส่วน (ไฟล์แยก)

รายละเอียดของข้อ 3–9 อยู่ในโฟลเดอร์ `docs/superpowers/specs/2026-10-11-ui-phase2c/` (ร่างโดย agent แยกส่วน ตรวจตัวเลขกับโค้ดที่ `5ffee76` แล้ว) **ข้อ 10 ของเอกสารนี้ใช้แทนข้อความในไฟล์เหล่านั้นทุกที่ที่ขัดกัน** (I1–I36)

| ข้อ | ไฟล์ | สรุป |
|---|---|---|
| 3. ของกลางที่ต้องมีก่อน (P0) และ primitive ใหม่ | `2026-10-11-ui-phase2c/03-primitives.md` | `Segmented` · `Field labelAction` · handle `open()`/`hideTrigger` · ส่วนประกอบ `AccessibleDialog` · X แปลไทย · `FileDropzone` · `FileQueueList` · `StickyFormFooter` · `FormSection` · `ChoiceCard` · `Steps` · `ActionBar` |
| 4. ย้ายช่องกรอก | `2026-10-11-ui-phase2c/04-fields.md` | กฎการย้าย · `Field` 25 ตัว · wrapper · checkbox · ช่องไม่มีชื่อ · 44→40 · ช่องเงิน · ช่องค้นหา · คง `required` |
| 5. dialog และ sheet | `2026-10-11-ui-phase2c/05-dialogs.md` | dialog 23 ตัวรายตัว · sheet 7 · `AlertDialog` · ปุ่มคำกริยา · dialog ซ้อนในฟอร์มตั้งค่า |
| 6. ปุ่ม แถบบันทึก และเมนูล่าง | `2026-10-11-ui-phase2c/06-actions.md` | ตาราง 152 ปุ่ม · `busy` 61 จุด · ป้ายสลับ 10 จุด · `StickyFormFooter` · route โหมดทำงาน 25 · `ActionBar` |
| 7. ขั้นตอน หัวข้อส่วน ตัวเลือก ไฟล์ ลายเซ็น | `2026-10-11-ui-phase2c/07-steps-choices-files.md` | `Steps` 3 จุด · `FormSection` · `ChoiceCard`/`ChoiceChip` · `FileDropzone` 17 จุด + ข้อความใหม่ · `SignaturePad` |
| 8. ชุดงาน ขอบเขต และการ deploy | `2026-10-11-ui-phase2c/08-batches.md` | รั้ว O1–O21 · P0 · ชุด 1 รายไฟล์ · ประตู deploy · ชุด 2–5 · แก้ ZodError · งาน V |
| 9. guard และ test | `2026-10-11-ui-phase2c/09-guards-tests.md` | `tests/form-migration-guards.test.ts` (GF/GB/GD/GL) · budget ที่ `5ffee76` · test ที่ต้องแก้รายชุด · pin ที่ formatter ทำพังได้ |

## 10. ข้อตัดสินจากการรวมส่วน ลำดับงาน test และการตรวจ (ใช้แทนข้อความในข้อ 3–9 ที่ขัดกัน)

อ่านร่างข้อ 3–9 เทียบกันเอง เทียบกับ `00-decisions.md` และเทียบกับโค้ดที่ `master` `5ffee76` · ไม่แก้ repo ไม่รัน test ไม่เปิดแอป · สคริปต์ตรวจซ้ำของส่วนนี้อยู่ใน scratchpad: `p2c-spec/10-recount.mjs` (นับซ้ำ ใช้ชุดไฟล์ของ `scripts-09b/base.mjs`) · `p2c-spec/10-routecheck.mjs` + `10-routes.txt` (ลอง regex ของ K15 กับ route จริง 79 route)

path ที่ไม่ขึ้นด้วย `src/`, `tests/`, `docs/` หรือ `messages/` อยู่ใต้ `src/components/` · "ข้อ N" คือร่างส่วนที่ N (3 primitive · 4 ช่องกรอก · 5 dialog · 6 ปุ่มและแถบ · 7 ขั้นตอน ตัวเลือก ไฟล์ · 8 ชุดงาน · 9 guard และ test)

### 10.1 ข้อที่ทุกส่วนตรงกันแล้ว

- **ไม่มี token ใหม่ (I21)** ทุก class ใช้ token เดิมและ primitive ของ 2A
- **ลำดับใหญ่:** P0 → 2C-0 → แก้ ZodError → 1a → 1b → 1c → 1d → 1g → 1e → 1f · ขึ้น Production ครั้งเดียวพร้อม 2A และ 56 commit ที่ยังไม่ deploy (`git rev-list --count ab1b873..5ffee76` = 56)
- **dialog:** หัว `shrink-0 border-b border-border px-4 py-4 pr-16 text-left sm:pl-5` · กล่อง `bottom-[max(0.75rem,env(safe-area-inset-bottom))]` · ช่องรับ children `flex min-h-0 flex-1 flex-col overflow-y-auto` · `AccessibleDialogBody` `min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5` · `description?: ReactNode` (รหัสใน `tag`) · Cancel เป็น `disabled` จริงตอน busy
- **ปุ่ม X:** `Button variant="ghost" size="icon"` ชื่อจาก `tCommon("close")` · `DialogFooter` เลิกปุ่ม "Close" · ไม่ส่ง `closeLabel={labels.cancel}` อีก
- **K8:** DOM = ปุ่มรองก่อน ปุ่มหลักท้าย · มือถือ `flex-col` เต็มความกว้าง · ตั้งแต่ `sm` แถวชิดขวา
- **dialog คำนำหน้ารหัส** (`admin/system-settings-form.tsx:1347` อยู่ใน `<form>` `:936`) ไม่มี `<form>` และไม่มี `type="submit"`
- **K13:** busy คงป้ายเดิม · `busy={x}` แล้วเอา x ออกจาก `disabled` · ไม่ลบ key
- **ช่องกรอก:** `Field label=` เป็น prop แรก · คง `required` / `maxLength` / `minLength` บนตัวช่อง · error ใต้ช่องมีแค่ supplier 6 ช่องและรหัสซ้ำ 2 ช่อง (K4 a) · legend `cn(fieldLabelClasses, "mb-1.5")` ใน `<fieldset className="min-w-0">` · `fieldLabelClasses = "text-meta font-medium text-foreground"`
- **K15:** 25 route เป็น focus ใน commit เดียวของ 1f
- **K12:** dialog `maintenance/maintenance-attachments.tsx:239` และปุ่ม `:241`, `:248` ไปชุด 5 · ชุด 1 ทำ dialog 13 จาก 14 ปุ่ม 93 จาก 95
- **O7:** ชุด 1f ไม่แตะแถบแท็บ `system-settings-form.tsx:937-956`
- **K6 ครึ่งแรก:** แก้ ZodError เป็น commit ของตัวเองใน plan 1 (ข้อ 8.5) · `fieldErrors` ไป V track
- **K2:** `Segmented` · `Field labelAction` · handle `open()`/`hideTrigger` ของ trigger 3 ไฟล์ อยู่ใน P0

### 10.2 ข้อตัดสิน (ใช้แทนข้อความในข้อ 3–9)

| # | เรื่อง | ขัดกันอย่างไร | ตัดสิน | เหตุผล |
|---|---|---|---|---|
| I1 | P0 อยู่ที่ไหน กี่ commit | ข้อ 3 ข้อตัดสินย่อย 1: 3 งานแรกของ branch 2C · ข้อ 8.3: branch สั้น "งานเดียว 2 commit" แล้ว merge เข้า `master` · ข้อ 7.5 เขียน "P0 บน master" | branch สั้น `feat/ui-phase2c-p0` · **3 งาน 3 commit** (P0.1 `Segmented` · P0.2 `Field` · P0.3 handle) · merge แบบ fast-forward เข้า `master` แล้วจึงแตก `feat/ui-phase2c` · `master` ที่มี P0 ห้าม deploy เดี่ยว (I22) | ตรงตัวอักษรของ K2 ("on master before 2B/2C branch") · 2B แตกสายเมื่อไรก็ได้ P0 · 1 commit ต่อ 1 primitive รีวิวง่าย |
| I2 | `fieldLabelClasses` (K27) ลงงานไหน · ดอกจันของ legend | ข้อ 3: P0.2 พร้อม `FieldRequiredMark` · ข้อ 4, 7, 8: 2C-0 · ข้อ 4 F5 และข้อ 7.4.3 เขียน `<span aria-hidden="true" className="ml-1 text-warning">*</span>` ตรง ๆ | P0.2 (ไฟล์เดียวกับ `labelAction`) · ค่าตามข้อ 3.3 · ดอกจันของ `<legend>` ทุกจุดใช้ `<FieldRequiredMark />` ที่ export จาก `ui/field.tsx` · literal เดิมยังอยู่ใน `field.tsx` ที่เดียว (`tests/field-primitives.test.ts:85` ผ่านต่อ) | 2B ได้ class ของ legend ไปด้วย · ดอกจันมีที่มาที่เดียว |
| I3 | API ของ `Segmented` | ข้อ 3.2: `T extends string` · `size` sm/md · `min-h-11 md:min-h-8`/`md:min-h-9` · ไม่มี ring offset · ตัวนับอยู่ใน `label` · ข้อ 8.3.1: `string \| boolean` · `md:h-8 md:min-h-0` ขนาดเดียว · `focus-visible:ring-offset-2` · option `trailing` | ใช้ข้อ 3.2 ทั้งหมด · หน้าตั้งค่าแปลง boolean เป็น `"compact"`/`"full"` · รายการห้องส่ง `size="md"` (36 ตั้งแต่ md เท่าวันนี้) · ตัวนับคง `<span className="tabular-nums">` เดิม · จุดเรียกรายการห้องคือ `audit/audit-scan-room-list.tsx:72-88` (ข้อ 8 เขียน `:81-95` ผิด) | ช่องว่างระหว่างปุ่ม 2px · วงที่มี offset ทับปุ่มข้าง ๆ · รายการห้องที่ใช้งานจริงไม่เตี้ยลง · key ของ option เป็น string ชัด |
| I4 | markup ของ `labelAction` | ข้อ 3.3: `<div data-slot="field-label-row" className="flex min-w-0 items-center gap-1.5">` + `<span data-slot="field-label-action" className="-my-0.5 inline-flex shrink-0">` · ข้อ 8.3.2: ไม่มี span ไม่มี `-my-0.5` | ใช้ข้อ 3.3 · test ตาม ข้อ 3.17 ตาราง B | ปุ่ม 24px ไม่ดันแถวป้าย ช่องในคอลัมน์ข้างเคียงยังตรงแนว |
| I5 | test ของ handle trigger | ข้อ 3.17 ใส่ใน `tests/dropdown-menus-ui.test.ts` · ข้อ 8.3.3 และ 9.6 ไฟล์ใหม่ | ไฟล์ใหม่ `tests/dialog-trigger-handles.test.ts` · เนื้อ assert ตามข้อ 3.17 ตาราง B (รวม `triggerRef=\{returnFocusRef \?\? triggerRef\}` และ `returnFocusRef=\{returnFocusRef\}`) | ไม่แก้ test เมนูของ 2A |
| I6 | ชื่อ class ของ `<form>` ใน dialog | ข้อ 3.5 `accessibleDialogFormClasses` · ข้อ 5.2 `accessibleDialogFormClassName` | `accessibleDialogFormClasses = "flex min-h-0 flex-1 flex-col"` · ข้อ 5 ทุกที่เปลี่ยนชื่อตาม · GD6 ตรวจชื่อนี้ | ตั้งชื่อแบบ `textareaClasses`, `fieldReadOnlyClasses` ของ 2A |
| I7 | class ของ `AccessibleDialogFooter` | ข้อ 3.5 มี `sm:flex-wrap` · ข้อ 5.2 มี `first:border-t-0` | `flex shrink-0 flex-col gap-2 border-t border-border-soft bg-background px-4 py-3 first:border-t-0 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5` · `data-slot="accessible-dialog-footer"` | 3 ปุ่มยาวขึ้นแถวใหม่ได้ · ผัง ค (แผน PM มีแต่ส่วนท้าย) ไม่มีเส้นซ้อนกับหัว |
| I8 | props ของ `AccessibleDialogCancel` | ข้อ 3.5 รับ `size` · ข้อ 5.2 ไม่รับ | `Omit<React.ComponentProps<"button">, "type" \| "children"> & { children?: ReactNode }` · ไม่มี `size` · ค่าตั้งต้น `tCommon("cancel")` · `onClick ?? dialog.onClose` · ใช้นอก `AccessibleDialog` แล้ว throw | K7 ให้ส่วนท้ายใช้ `default` · GD3 ห้าม `size=` ในส่วนท้าย |
| I9 | หน้าตา X ตอน busy | ข้อ 3.6: `disabled:border-transparent disabled:bg-transparent` (ไม่มีกล่อง) · ข้อ 5 ด9: หน้าตา disabled ของ 2A (กล่องเทามีขอบ) | `<DialogPrimitive.Close data-slot="dialog-close" asChild><Button variant="ghost" size="icon" disabled={closeDisabled} aria-label={closeLabel} title={closeLabel} className="absolute top-3 right-3 disabled:border-transparent disabled:bg-transparent"><XIcon aria-hidden="true" /></Button></DialogPrimitive.Close>` | ghost ไม่มีกล่องตอนปกติ จึงไม่ควรมีกล่องตอนกดไม่ได้ · X ยังเป็นสีจาง · คง `data-slot` เดิม (`ui/dialog.tsx:76`) |
| I10 | sheet: พื้น hover ของ X และหัว | ข้อ 3.6: พื้นคง `bg-background` และ X ใส่ `hover:bg-muted` · ข้อ 5 ด10–ด11: พื้น `bg-surface` และค่าตั้งต้นใหม่ของ `SheetHeader`/`SheetTitle` | ใช้ข้อ 5.8 ทั้งหมด: base `:64` `bg-background` → `bg-surface` · `side="bottom"` เติม `pb-[env(safe-area-inset-bottom)]` · `SheetHeader` `flex shrink-0 flex-col gap-1.5 border-b border-border px-4 py-4 pr-16` · `SheetTitle` `text-base font-semibold text-foreground` · X แบบ I9 แต่ className `absolute top-3 right-3` และไม่มี `disabled` · **แจ้ง 2B** ว่า sheet ตัวกรองและ sheet ⋯ ของทะเบียนเปลี่ยนตั้งแต่ประตู deploy | sheet กับ dialog พื้นเดียวกัน · hover ของ ghost (`bg-background`) มองเห็นบนพื้นขาวโดยไม่ต้องแก้ทีละ primitive · 2 drawer ส่ง `bg-surface` เองอยู่แล้ว |
| I11 | safe area ของ dialog (K9 เขียน "the parts own the iOS safe area") | ข้อ 3 และ 5 ใส่ที่ตำแหน่งกล่อง ไม่ใส่ใน `Footer` | ยอมรับ: `bottom-[max(0.75rem,env(safe-area-inset-bottom))]` ที่ `DialogContent` ของ `AccessibleDialog` (`:77`) · `Footer` ไม่เผื่อเอง · บันทึกเป็นการตีความ K9 ไม่ใช่การเปลี่ยนข้อตัดสิน | กล่องบนมือถือลอยเหนือขอบ 12px ถ้าเผื่อใน `Footer` จะได้แถบว่างในกล่อง · ได้ผลกับ dialog ทั้ง 23 ตัวทันที |
| I12 | `ui/alert-dialog.tsx:94` | ข้อ 8 ข้อตัดสินย่อย 8: แก้ class เดียวใน 2C-0 · ข้อ 5 ตาราง B ข้อ C: ชุด 5 | **2C-0 งาน 0a** แก้แค่ `flex-col-reverse` → `flex-col` · การปรับหน้าตาทั้งหมดของ K12 คงอยู่ชุด 5 · GD3/GD4 ตรวจ `alert-dialog.tsx` ตั้งแต่ 0a | K8 ระบุ `alert-dialog.tsx:94` ตรง ๆ และไม่ได้ผูกกับชุด 5 · ประตู deploy จึงมีลำดับปุ่มแบบเดียวทุก dialog · `confirm-dialog.tsx:89-107` เรียง Cancel ก่อน Action อยู่แล้ว |
| I13 | markup ของ `FileDropzone` (K19) | ข้อ 3.7: `description` เป็น `FieldHint` นอก `<label>` ใน `div.grid` · ข้อ 7.6.1: บรรทัดรอง 3 บรรทัดเป็น `aria-hidden` + `aria-describedby` (`subLineClasses`) | ใช้ข้อ 7.6.1 · กล่องผิดใช้สถานะ `"border-danger bg-surface hover:bg-background"` (ก่อนสถานะปกติ) เมื่อ `aria-invalid` เป็น `true`/`"true"` · รับ `aria-required` ใน type แต่ไม่ส่งต่อ · ใน `Field` ใช้ `description` ของกล่อง ไม่ใช้ `hint` ของ `Field` · `tests/field-primitives.test.ts:131` แก้ในงาน 0b ตามข้อ 7.9 | ชื่อของช่องเหลือ "ป้าย + ชื่อเรื่อง" แทนข้อความทั้งกล่อง (ปิดความเสี่ยงข้อ 7 ของข้อ 3) โดยไม่เพิ่ม API · ข้อความที่อ้างผ่าน `aria-describedby` ยังถูกอ่านแม้ซ่อน |
| I14 | ข้อความของ 5 จุดที่ `hint` ไม่เคยแสดง | ข้อ 3.7: ลบ `hint` 4 จุด ไม่เพิ่มคำอธิบาย · ข้อ 7.6.3 + 7.8: คำอธิบายใหม่ 4 key + `asset.checklistPhotoDescription` + สถานะอัปโหลด | ใช้ข้อ 7 · ลบ key: `checkin.photoQueued`, `checkin.removePhoto` (1b) · `auditScan.dropAuditPhotoSelected` (1d) · `asset.importWizardCurrentStep` (ชุด 4) · `disposalPage.dropEvidenceSelected` คงไว้ (`disposal/disposal-attachments.tsx:93` ใช้อยู่) | K19 ให้ "copy review" ไม่ใช่แค่ลบ · ข้อความเดิมเขียนไว้สำหรับหลังเลือกไฟล์ |
| I15 | API ของ `FileQueueList` | ข้อ 3.8: `{ id, title, detail }` · `label` บังคับ · `removeLabel(item)` · server-safe · ข้อ 7.6.2: `{ id, name, detail }` · `label?` · แปลในตัว · `"use client"` | ใช้ข้อ 7.6.2 · `label` ค่าตั้งต้น `t("selectedFiles")` แบบไม่มีจำนวน: th "ไฟล์ที่เลือก" en "Selected files" (ตามข้อ 3.16) · `aria-label` ของปุ่ม `t("removeFile", { name })` | ผู้เรียกไม่ต้องส่งฟังก์ชันจัดข้อความ · screen reader บอกจำนวนรายการของ `<ul>` เองอยู่แล้ว ไม่ต้องใช้ plural |
| I16 | ปุ่มนำไฟล์ออก 3 จุดในตารางปุ่ม | ข้อ 6.3 แถว #35 `checkin-form.tsx:520` (`outline icon`), #96 `disposal-batch-form.tsx:121` (`danger icon`), #109 `disposal-request-form.tsx:196` (`danger sm`) · ข้อ 7.6.3 แทนทั้ง 3 ด้วย `FileQueueList` | ตัด 3 แถวนี้ออกจากข้อ 6.3 · ปุ่มเป็นของ `FileQueueList` (`outline` `icon-sm`) · ข้อ 6 นับปุ่มที่แปลงเหลือ 149 + 3 ผ่าน `FileQueueList` | ปุ่มเดียวไม่ควรมีสองสเปก · การนำออกจากคิวยังไม่ลบอะไร (ตระกูล K22) |
| I17 | `ScannerTextInput` | ข้อ 3.9: เพิ่ม `aria-label` passthrough (K20) · ข้อ 4 ข้อตัดสินย่อย 3, 5: ไม่ต้องใช้ passthrough · ส่ง `disabled` ให้ช่องข้อความ (ยืนยันแล้ว: `<Input>` `ui/scanner-text-input.tsx:299-310` ไม่รับ `disabled` · มีแค่ปุ่มกล้อง `:313`) | งาน 0b ทำทั้งสองอย่าง: `"aria-label"?: string` และ `disabled={disabled}` บน `<Input>` · จุดเรียก: `assets/asset-batch-form.tsx:921` ใช้ `Field hideLabel hint=…` (ต้องมี hint) · `assets/asset-component-manager.tsx:292` ใช้ `aria-label={labels.scanOrSearch}` (ไม่มี hint) · F7 ของข้อ 4 ขยายเป็น "`aria-label` ใช้กับ `SearchField` และ `ScannerTextInput` ที่ไม่มี hint" | K20 อนุมัติ passthrough แล้ว จึงต้องมีและมีที่ใช้จริง · ช่องที่ไม่มี hint ไม่ต้องมี `Field` |
| I18 | API ของ `Steps` และ key ของสถานะ | ข้อ 3.14: `getStepStates(total, current, { rejected })` · ผู้เรียกส่ง `stateLabels`, `progressLabel` · key ซ้อน `common.stepState.*` · ข้อ 7.2: `getLinearStepStates(count, current, outcome)` + `getStepFocusIndex` · `Steps` เรียก `useTranslations("common")` เอง · key แบน `common.stepComplete` ฯลฯ | ใช้ข้อ 7.2 ทั้งหมด · key แบน 5 ตัว: `common.stepOf`, `common.stepComplete`, `common.stepCurrent`, `common.stepUpcoming`, `common.stepRejected` · `stepRejected` th **"ปฏิเสธแล้ว"** (ไม่ใช่ "ถูกปฏิเสธ") en "Rejected" · `stepOf` th "ขั้นที่ {current} จาก {total}" en "Step {current} of {total}" | ไม่มี directive และไม่มี state แบบ `Breadcrumbs` ของ 2A (`ui/breadcrumbs.tsx:3`) ใช้ได้ทั้ง S1 (หน้า server) และ S5 · `outcome` บอกเจตนาตรงกว่า "index เกินจำนวน" · "ปฏิเสธแล้ว" ตรงกับ `auditFinding.status_rejected` ที่มีอยู่ |
| I19 | หัวข้อมีเลข (K18) | ข้อ 3.12: `FormSectionHeader` + `FormSection` (`<section aria-labelledby>`) · ข้อ 7.3: `FormSection` ตัวเดียว ไม่มี `children` = แถวหัวข้อ · ใช้ `div` | ใช้ข้อ 7.3 · `tests/disposal-forms-ux.test.ts:11-12` → `/<FormSection number=\{1\} title=\{t\("formSteps\.asset"\)\}/` ทั้ง 2 ฟอร์ม + `doesNotMatch(/function FormStep/)` | หน้าตั้งค่าไม่มี landmark region 7 อัน · component เดียวพอทั้งสองแบบ |
| I20 | `ChoiceCard` / `ChoiceChip` (K16) | ข้อ 3.13: ไม่มี directive · chip ซ่อน input (`sr-only`) + `Check` + outline ที่ label · การ์ด `py-3` · ตัว disabled ที่เลือกแล้วคงพื้น · prop `meta` · ข้อ 7.4: `"use client"` + `preventEnterSubmit` · input เห็นเสมอทั้งสองแบบ · การ์ด `py-2.5` · `has-disabled:` ลบพื้นที่เลือก · prop `detail` | **ข้อ 7.4 เป็นหลัก** (input เห็นเสมอ · `"use client"` · `preventEnterSubmit` · `detail`) + **กฎ disabled ของข้อ 3.13** · การ์ด `<label>`: `group flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-control-border bg-surface px-3 py-2.5 text-sm text-foreground transition-colors motion-reduce:transition-none hover:border-input has-checked:border-primary has-checked:bg-primary-soft has-disabled:cursor-not-allowed has-disabled:text-faint-foreground has-[:disabled:not(:checked)]:border-border has-[:disabled:not(:checked)]:bg-background` · input `cn(checkboxVariants(), "mt-0.5")` · คำอธิบาย `text-meta text-muted-foreground group-has-disabled:text-faint-foreground` · chip `<label>`: `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-control-border bg-surface px-3 py-1 text-sm text-foreground transition-colors motion-reduce:transition-none hover:border-input md:min-h-8 has-checked:border-primary-border has-checked:bg-primary-soft has-checked:text-primary-hover has-disabled:cursor-not-allowed has-disabled:text-faint-foreground has-[:disabled:not(:checked)]:border-border has-[:disabled:not(:checked)]:bg-background` · input `checkboxVariants()` · `detail` `text-meta text-faint-foreground` | input ที่เห็นบอกสถานะได้แม้เบราว์เซอร์ไม่มี `:has()` และไม่บอกด้วยสีอย่างเดียว · วงโฟกัสมาจาก input เอง · Enter บน T5/T6 ต้องไม่บันทึกทั้งฟอร์ม · T6 ตอน JSON ผิดยังเห็นกลุ่มที่เลือก · `checkboxVariants()` = `size: "md"` 16px (`ui/field-variants.ts:43-53`) |
| I21 | P1 และ P3 | ข้อ 3.13: P1 → `ChoiceCard type="checkbox"` · P3 → `ChoiceCard type="radio"` · ข้อ 7.4.5: P1 เป็นแถว `<label>` + checkbox + `preventEnterSubmit` · P3 แค่ `aria-pressed` | ใช้ข้อ 7.4.5 | P1 เป็นรายการในกล่องเลื่อน ไม่ใช่การ์ด · แถวที่เลือกของ P3 แทบไม่เคยแสดง (เปลี่ยนขั้นทันที) |
| I22 | `StickyFormFooter` (K14) | ข้อ 3.11: `sticky bottom-0 … bg-canvas` · props `{status, children, className}` · ข้อ 6.8: `sticky -bottom-4 sm:-bottom-6 … bg-surface` · `ComponentProps<"div"> & { status? }` · test คนละไฟล์ | กล่อง `cn("sticky -bottom-4 z-10 -mx-4 border-t border-border bg-canvas px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-bottom-6 sm:-mx-6 sm:px-6", className)` · ข้างใน `flex flex-col gap-3 sm:flex-row sm:items-center` · สถานะ `min-w-0 flex-1 text-meta text-muted-foreground` · ปุ่ม `flex flex-col gap-2 sm:ml-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end` · props แบบข้อ 6.8 · `data-slot="sticky-form-footer"` · test ใน `tests/sticky-form-footer-ui.test.ts` (assert `bg-canvas` ไม่ใช่ `bg-surface`) · บันทึก `-bottom-4` เป็นการตีความ K14 "sticky bottom-0" | `main` คือกล่องเลื่อนและมี `py-4 sm:py-6` (`layout/dashboard-shell.tsx:124`) · ช่องค้นหาตรวจนับใช้ `-top-4 sm:-top-6` ด้วยเหตุนี้ (`audit/audit-scan-search.tsx:47`, `DESIGN.md:469`) · แถบเต็มขอบที่ sticky ใช้พื้น canvas (`DESIGN.md:213`, guard `visual-foundation-guards.test.ts:109-115`, ต้นแบบ `.mk-top` `base.css:165`) |
| I23 | `ActionBar` (K23, plan 5) | ข้อ 3.15: `label` + `role="group"` · ลิงก์ `size: "lg"` + `text-xs` · ใช้ไม่ได้ = `<span aria-disabled>` · padding `{ links: "pb-24 md:pb-0", withPrimary: "pb-36 md:pb-0" }` · ข้อ 6.10: ไม่มีชื่อกลุ่ม · `size: "sm"` · `<a role="link" aria-disabled="true">` · padding รวม home indicator | `label` บังคับ (`tCommon("actions")`) + `role="group"` (ข้อ 3) · ลิงก์ `cn(buttonVariants({ variant: action.primary ? "default" : "outline", size: "sm" }), "min-w-0 px-2")` ไม่มี `text-xs` (ข้อ 6) · ใช้ไม่ได้ `<a role="link" aria-disabled="true">` ไม่มี `href` (ข้อ 6) · `actionBarPagePadding = { single: "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0", withPrimary: "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0" }` (ข้อ 6) · หน้าตัดจำหน่าย `primary: !nextActionControl` · `visual-foundation-guards.test.ts:92` คง regex เดิม | ชื่อกลุ่มไม่ต้องเพิ่มข้อความ · `text-meta` 13/20 แก้ `leading-tight` และตรงกับขนาด `sm` · `<span>` ไม่ถูกอ่านเป็นลิงก์ · แถบเผื่อ home indicator แล้ว หน้าก็ต้องเผื่อ |
| I24 | `flex-col-reverse` นอก dialog | ข้อ 6 แก้แค่ `assets/asset-form.tsx:1503` · ข้อ 9.11 ข้อ 5 ขยาย K8 ไป 3 แถว | `disposal/disposal-batch-form.tsx:84` (1c) · `assets/asset-component-manager.tsx:373`, `:399` (1e) → `flex flex-col gap-2 sm:flex-row sm:justify-end` · เจ้าของคือข้อ 6 · แถวท้ายฟอร์ม F1 (`mt-6 flex justify-end gap-3 …`) คงเดิม (ข้อ 6 ข้อตัดสินย่อย 11) | K8 "primary action last everywhere" · ทั้ง 3 แถว DOM เป็นยกเลิกก่อนแล้ว |
| I25 | ส่วนท้าย dialog ดำเนินการหลายรายการ (`disposal/disposal-bulk-execution.tsx:939-982`) | ข้อ 6.3 #101 "ซ่อนตอน committing อยู่แล้ว" · #102/#103 "คง disabled" ไม่มี busy · ข้อ 5.5 แถว 14: ปุ่มที่เริ่มงานค้างพร้อม `busy` · ยกเลิกแสดงแบบกดไม่ได้ · ลบ div `:970` + `Loader2` `:971` · `zeroEligible` เป็น `Notice` | ใช้ข้อ 5.5 แถว 13–14 และข้อตัดสินย่อย ด13–ด14 · ข้อ 6.3 แถว #98–#104 ตามข้อ 5 | โฟกัสไม่หลุดไป body · GD3 ห้าม `Loader2` ในส่วนท้าย |
| I26 | ไฟล์ guard และ test ของ primitive | ข้อ 4 `tests/form-field-guards.test.ts` (G1–G10, อ่านด้วย compiler ของ `typescript`) · ข้อ 5 `tests/dialog-structure-ui.test.ts` (B–E) · ข้อ 6/8 `tests/form-migration-guards.test.ts` (G1–G6) · ข้อ 3 `tests/form-dialog-primitives.test.ts` รวมทุก primitive | ไฟล์ guard เดียว `tests/form-migration-guards.test.ts` ชื่อ GF/GB/GD/GL ตามข้อ 9.2–9.4 · ตัวอ่าน JSX ใน `tests/helpers/source-files.ts` (ข้อ 9) · test ของ primitive แยกตามเจ้าของ K (ข้อ 9.6) ไม่มี `form-dialog-primitives.test.ts` · ข้อ "server-safe" ใช้กับ `segmented`, `sticky-form-footer`, `form-section`, `steps` (อนุญาต `useTranslations`), `form-context-banner`, `field` · ไม่ใช้กับ `choice-card` และ `file-queue-list` (I15, I20) | เลข G ชนกัน · 2B ไม่ต้องแตะไฟล์ guard ของ 2C · ตัวอ่านเดียวกับ helper ของ 2A ได้ตัวเลขเท่า AST ของ critic |
| I27 | `Loader2` ที่เหลือหลัง 2C | ข้อ 6.5.3: 16 ใน 10 ไฟล์ · ข้อ 9.1: 18 ใน 12 ไฟล์ | 18 ใน 12 ไฟล์ (ข้อ 9.4) · spinner นอกปุ่มที่เหลือในไฟล์ที่ย้ายได้ `motion-reduce:animate-none` ทุกตัว รวม `disposal/disposal-asset-picker.tsx:58` (1c) · `assets/asset-label-batch-tool.tsx:321`, `:469` · `assets/asset-scan-search-tool.tsx:146` (ชุด 4) | ข้อ 6 ไม่นับ `disposal-asset-picker` และปุ่มของ 2B ใน `audit-findings-batch-actions.tsx:88`, `:97` · `:971` หายตาม I25 |
| I28 | plan 2–4 กับ 2B | ข้อ 8.1/8.12: plan 2–4 ทำคู่กับ 2B ได้ (rebase) · ข้อ 5.12, 7.10 และ critic §3: ชุด 3, 4 ต้องหลัง 2B merge | 2B เริ่มหลัง plan 1 merge (ข้อ 8 ข้อตัดสินย่อย 1) · **plan 2 ทำคู่กับ 2B ได้** · **plan 3 และ 4 เริ่มหลัง 2B merge** · plan 5 หลัง 2B merge | ชุด 3–4 แก้ไฟล์ที่ 2B ปรับโครง (`asset-register-table.tsx`, bulk ×2, `audit-findings-batch-actions.tsx`, `assets/page.tsx:451`, `asset-management/import-export/page.tsx:82`) · ทำทีหลังไม่ต้อง rebase งานใหญ่ |
| I29 | K15 ใน 1f | ข้อ 8 ข้อตัดสินย่อย 16 คืน `/maintenance/pm` เป็น navigation · ข้อ 6.9 คืน `/disposal/batches` ด้วย · ข้อ 9 ข้อตัดสินย่อย 13: K15 ก่อนแถบบันทึกหน้าตั้งค่า | regex ตามข้อ 6.9 · commit K15 เป็นงานแรกของ 1f ก่อนแก้หน้าตั้งค่า · ลองกับ 79 route แล้ว: เปลี่ยน 27 route (25 → focus · 2 → navigation) · GL2 ที่ HEAD ผิด 27 → 0 | หน้ารายการคงแถบล่าง (Q4) · GL1(b) ไม่ผ่านถ้า `/th/admin/settings` ยังเป็น navigation |
| I30 | `system-settings-form.tsx` แบ่งงาน | ข้อ 8.12 แบ่ง 1f เป็น 3 งานตามเรื่องในไฟล์ · ข้อ 4 F8 "ไฟล์ละ 1 commit ห้ามย้ายครึ่งไฟล์" | 1f = 3 งาน: K15 · `system-settings-form.tsx` ทั้งไฟล์ 1 commit (ช่อง หัวข้อ dialog แถบบันทึก ค้นหา) · `depreciation-policy-builder.tsx` | GF1/GF3 เป็น ratchet ต่อไฟล์ · ไฟล์ครึ่งเดียวทำให้ budget กลางทางไม่มีความหมาย |
| I31 | ปุ่มล้างลายเซ็น (#38) | ข้อ 7 ความเสี่ยง 2 และสรุปของข้อ 9 อ้างว่าข้อ 6 ให้ `outline sm` ในหัว | ไม่ขัดแล้ว: ข้อ 6.3 #38 ฉบับสุดท้ายเป็น `ghost` `sm` ใต้ canvas ตาม K25 · ตำแหน่งและ markup ตามข้อ 7.7 | ข้อความในข้อ 7 และ 9 อ้างร่างเก่า (`scripts-06/final-table.md`) |
| I32 | ป้ายปุ่มถอยในขั้นตรวจสอบติดตั้งส่วนควบ (#56) | ข้อ 6.3 #56 ไม่เปลี่ยนข้อความ · ข้อ 7 ข้อตัดสินย่อย 10 เปลี่ยน `labels.cancel` → `labels.back` | ใช้ข้อ 7 · `labels.back` มีอยู่แล้ว (`asset-component-manager.tsx` type `ManagerLabels`) | ปุ่มนี้ย้อนไปขั้น `details` ไม่ได้ยกเลิก |
| I33 | ป้ายช่องเงิน (K26 "11 money fields") | K26 พูดถึง 11 ช่อง · ข้อ 4.11 พบว่าใช้แค่ 6 key ที่หน้าแสดงผลใช้ร่วม (ค่ามี ฿ อยู่แล้ว) | ยอมรับข้อ 4.11: key ใหม่ 6 ตัว `*Baht` ไม่แก้ค่าของ key เดิม · บันทึกเป็นการทำ K26 ให้ได้ผลโดยไม่ทำหน้าแสดงผลพัง | ถ้าแก้ key เดิม หน้ารายละเอียดและหน้าพิมพ์จะเป็น "ราคาซื้อ (บาท): ฿12,000.00" |
| I34 | แถวสร้างเอกสารจัดซื้อ (`asset-form.tsx:1218-1240`) | K20: `hideLabel` หรือ `aria-label` จาก key เดิม "a real label where none exists" · ข้อ 4 ข้อตัดสินย่อย 2: ป้ายมองเห็น 4 ช่อง | ยอมรับข้อ 4 | ช่องวันที่ไม่มี key เลย จึงเข้าเงื่อนไข "real label" · แถวเดียวไม่ควรปนป้ายเห็นกับป้ายซ่อน |
| I35 | กล่องแจ้ง (`Notice`) ในเนื้อ dialog และฟอร์ม | ข้อ 5 ชี้ไป "ข้อกล่องแจ้ง" ซึ่ง**ไม่มีในร่าง 3–9** (ช่องโหว่) | 2C เปลี่ยนเป็น `Notice` เฉพาะจุดที่มีสเปก: `zeroEligible` (ชุด 3, ข้อ 5.7) · login `:58-66`, `:128-132` และแผงนำเข้า `:297` (ชุด 4, ข้อ 8.9) · กล่องว่างใน drawer 2 จุด → `EmptyNote` (O14, ชุด 4) · กล่องแจ้งอื่นในเนื้อ dialog และฟอร์ม (เช่น `transaction-cancel-dialog.tsx:140`, `audit-finding-review-actions.tsx:214`, `:220`) คงเดิมจนถึงงาน Notice ของ 2D | ไม่มีสเปก tone และ role ต่อจุด ผู้ทำจะเลือกเองทีละไฟล์ (critic risk 1) · 2A ส่งงานกวาด Notice ไป 2D แล้ว |
| I36 | ตัวเลขที่ข้อ 3–9 แก้จากแผนที่ | หลายจุด | ใช้ตัวเลขในข้อ 10.8 · K7 ช่อง 35 (ไม่ใช่ 36) · K16 เป้ากด 9 ของ 2C + 3 ของ 2B · K13 10 จุด (ไม่ใช่ 4) · ชุด 1 dialog 13/14 ปุ่ม 93/95 · dialog bulk execution `:812-986` · sidebar `:292` · แถบ `asset-form.tsx:1501-1517` · ช่อง 2C 273 (ย้าย 272 + `audit-scan-room-picker.tsx:75` ไม่แตะ) | นับซ้ำแล้ว (ข้อ 10.8) |

**ข้อความใหม่หลังรวม** (แก้ผ่าน `node scripts/messages-edit.mjs` เท่านั้น · ตรวจแล้วไม่มีชื่อชนกับ key เดิม · คำไทยไม่ติดกฎของ `tests/thai-glossary.test.ts`)

| งาน | key ใหม่ | ลบ |
|---|---|---|
| 0b | `common.removeFile` "นำ {name} ออก" / "Remove {name}" · `common.selectedFiles` "ไฟล์ที่เลือก" / "Selected files" | — |
| 0c | `common.stepOf` · `common.stepComplete` "เสร็จแล้ว" · `common.stepCurrent` "ขั้นตอนปัจจุบัน" · `common.stepUpcoming` "ยังไม่ถึง" · `common.stepRejected` "ปฏิเสธแล้ว" (en ตามข้อ 7.8) | — |
| ZodError | `apiErrors.validationFailed` (ข้อ 8.5.2) | — |
| 1a | `repairRecord.dropFilesTitle` · `repairRecord.dropFilesHint` (ข้อ 7.8) | — |
| 1b | `checkin.photoAfterDescription` | `checkin.photoQueued` · `checkin.removePhoto` |
| 1c | `disposalPage.saleValueBaht` · `.salvageValueBaht` · `.actualSaleValueBaht` · `.actualSalvageValueBaht` (ข้อ 4.15) · `disposalPage.requestEvidenceDescription` (ข้อ 7.8) | — |
| 1d | `auditScan.dropAuditPhotoDescription` | `auditScan.dropAuditPhotoSelected` |
| 1e | `asset.purchasePriceBaht` · `.purchaseDocumentAmountBaht` · `.purchaseDocumentDate` · `.photoType` (ข้อ 4.15) · `asset.checklistPhotoDescription` · `.componentInstallSteps` · `.componentStepIdentify` · `.componentStepDetails` · `.componentStepReview` (ข้อ 7.8) | — |
| ชุด 4 | `asset.createModeLabel` | `asset.importWizardCurrentStep` |
| ชุด 5 | `integrationApiPage.confirmScopeExpansionAction` · `disposalPage.bulkDiscardSelectionAction` · `supplier.unsavedChangesLeave` (ข้อ 5.10) · `disposalPage.workflowStepsLabel` · `disposalPage.workflowSteps.{request,decision,execution}` (ข้อ 7.8) | — |

รวม key ใหม่ 34 (plan 1 = 26) · ลบ 4 · K13 ไม่ลบ key (ข้อ 6.5.2)

### 10.3 ลำดับงาน plan 1 (P0 + 2C-0 + แก้ ZodError + ชุด 1)

ทุกงานจบด้วย `npm test` และ tsc · 1 ไฟล์ = 1 commit ในงานย้ายไฟล์ (ข้อ 4 F8) · ผู้ทำเป็น subagent session หลักรีวิวทุกงาน · งานย้ายไฟล์ทุกงานลด budget ของไฟล์ตัวเองใน `form-migration-guards.test.ts` และเพิ่มชื่อใน `MIGRATED_FILES` ใน commit เดียวกัน (ข้อ 9.9)

| # | งาน | ส่วน | ต้องรอ | test ที่แก้หรือเพิ่ม |
|---|---|---|---|---|
| 0 | ตรวจฐาน: ถ้าโค้ดใน `src` `tests` `messages` ต่างจาก `5ffee76` ให้นับใหม่ด้วยสคริปต์ที่ plan ใส่ไว้ (สคริปต์ร่างของ session นี้อยู่ใน scratchpad ไม่อยู่ใน repo: `scripts-08/b1-perfile.mjs`, `scripts-09b/table.mjs`, `10-recount.mjs`, `10-routecheck.mjs`) · จด `npm test` ฐาน (ยังไม่มีใครรันที่ HEAD นี้) | 8, 9 | — | — |
| 1 | P0.1 `ui/segmented.tsx` + `system-settings-form.tsx:2543-2563` + `audit-scan-room-list.tsx:72-88` | 3.2 · I3 | 0 | A: `visual-foundation-guards.test.ts:275-290` · `asset-label-print-ui.test.ts:51`, `:53` · `audit-scan-room-ui.test.ts:37`, `:83` · B: `field-primitives.test.ts` (server-safe ของ `segmented.tsx`) |
| 2 | P0.2 `Field labelAction` · `fieldLabelClasses` · `FieldRequiredMark` | 3.3 · I2, I4 | 1 | B: `field-primitives.test.ts` (ข้อ 3.17 ตาราง B แถว 1) |
| 3 | P0.3 handle `open()`/`hideTrigger`/`returnFocusRef` 3 ไฟล์ → fast-forward เข้า `master` → แตก `feat/ui-phase2c` | 3.4 · I1, I5 | 2 | B: `tests/dialog-trigger-handles.test.ts` (ใหม่) · D: `disposal-detail-workspace.test.ts:76-82` |
| 4 | 0a dialog: ส่วนประกอบ `AccessibleDialog` · X ใน `dialog.tsx`/`sheet.tsx` · `DialogFooter` · sheet พื้นขาว หัว และ safe area · `alert-dialog.tsx:94` · type ของ `confirm-text-dialog.tsx:12`, `:17` และ `operation-review-dialog.tsx:11`, `:15` | 3.5–3.6 · 5.2–5.3 · 5.8 · I6–I12 | 3 | A: `accessible-dialog.test.ts:28`, `:31` · `sheet-drawers-ui.test.ts:9`, `:11` · B: `accessible-dialog.test.ts` (ข้อ 5.11 B-A) · `sheet-drawers-ui.test.ts` (ข้อ 5.11 B-I ส่วน primitive) |
| 5 | 0b `FileDropzone` · `FileQueueList` (ใหม่) · `ScannerTextInput` (`aria-label` + `disabled`) · key 0b | 7.6.1–7.6.2 · 3.9 · I13–I17 | 3 | A: `field-primitives.test.ts:131` · B: `tests/file-evidence-ui.test.ts` (ส่วน primitive) · `scanner-text-input.test.ts` (เพิ่ม) |
| 6 | 0c `choice-card.tsx` · `src/lib/step-states.ts` · `steps.tsx` · `form-section.tsx` · `form-context-banner.tsx` · key 0c | 7.2–7.4 · 3.10 · I18–I21 | 3 | B: `tests/step-states.test.ts` · `tests/steps-ui.test.ts` · `tests/choice-controls-ui.test.ts` · `field-primitives.test.ts` (`FormContextBanner`) |
| 7 | 0d `sticky-form-footer.tsx` · helper ใน `tests/helpers/source-files.ts` · `tests/form-migration-guards.test.ts` (ทุก guard ยกเว้น GL2) | 6.8 · 9.2–9.4 · I22, I26 | 4, 5, 6 | B: `tests/sticky-form-footer-ui.test.ts` · `tests/form-migration-guards.test.ts` |
| 8 | แก้ ZodError (`validationFailedBody` · `api-response.ts` · `asset-transaction-cancellation-route.ts` · catalog 2 แถว) · key `apiErrors.validationFailed` | 8.5 | 3 | B: `api-error-exposure.test.ts`, `api-error-catalog.test.ts` (เพิ่ม) · D: `disposal-route-structure.test.ts:152-156`, `:227-238` |
| 9 | 1a `maintenance-plan-form` · `repair-record-form` · `repair-record-actions` · `maintenance-attachments` (แค่ `<select>` `:108` และ `FileDropzone` `:120`) · key 1a | 4 · 5 · 6 · 7 | 7, 8 | budget ของ 4 ไฟล์ · `file-evidence-ui`, `choice-controls-ui` (ขยาย) · D: `repair-record-ui.test.ts:38` |
| 10 | 1b ฟอร์ม 4 ไฟล์ (`checkin`, `checkout`, `transfer`, `bulk-move`) · key 1b | 4 · 6 · 7 · 3.10 | 9 | ขยาย `choice-controls-ui`, `file-evidence-ui` · D: แถว 1b ของตาราง D |
| 11 | 1b `signature-pad` · `ui/operation-review-dialog` + ลบ `closeLabel` ที่ host 3 จุด | 5.5 แถว 23 · 6.4.3 · 7.7 | 10 | D: `asset-operation-confirmation-ui.test.ts:29-32` |
| 12 | 1c 5 ไฟล์ · I24 `disposal-batch-form.tsx:84` · key 1c | 4 · 5 · 6 · 7 | 11 | A: `disposal-forms-ux.test.ts:11`, `:12` · D: แถว 1c |
| 13 | 1d 4 ไฟล์ · key 1d | 4 · 5 · 6 · 7 | 12 | A: `audit-scan-check-ui.test.ts:22` · `audit-not-found-dialog.test.ts:14` · D: แถว 1d |
| 14 | 1g `asset-model-form` | 4 · 6 | 13 | D: `confirm-dialog-ui.test.ts:27-34` |
| 15 | 1e `asset-form` (`StickyFormFooter` · `labelAction` · T5) · key ส่วนของไฟล์ | 4 · 6.8 · 7 | 14 | A: `asset-form-sticky-actions.test.ts:7-17`, `:19-26` · `visual-foundation-guards.test.ts:267` · ขยาย `sticky-form-footer-ui` |
| 16 | 1e `asset-batch-form` (T4 · ช่องในตาราง) | 4 · 6 · 7 | 15 | D: `asset-batch-form-layout.test.ts:8-59` |
| 17 | 1e `asset-component-manager` (`Steps` · I24 · I32) + `asset-attachments` + label ใน `src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx` · key ที่เหลือของ 1e | 5 · 6 · 7 | 16 | ขยาย `steps-ui` · D: `asset-component-manager.test.ts:26-30` · `confirm-text-dialog-ui.test.ts:20-21` |
| 18 | 1f K15: `src/lib/mobile-field-navigation.ts:16-24` · **ตรวจ G11b ที่ 375 และ 768 ก่อน commit** | 6.9 · I29 | 17 | A: `mobile-field-navigation.test.ts:13-26` + test ใหม่หลัง `:46` · B: GL2 |
| 19 | 1f `system-settings-form` ทั้งไฟล์ (ยกเว้น `:937-956`) | 4 · 5.6 · 6.8 · 7.3 · I30 | 18 | A: `visual-foundation-guards.test.ts:266` · D: แถว 1f |
| 20 | 1f `depreciation-policy-builder` (T6) | 4 · 6 · 7 | 19 | A: `settings-depreciation-policy-ui.test.ts:53` |
| 21 | `npm run verify` + production build (`next build` + `next start`) + ตรวจบนแอป dev (ข้อ 10.5) | 8.8 · 10.5 | 20 | — |
| 22 | เอกสารและ wiki (ข้อ 10.6) | 10.6 | 21 | — |

**plan ถัดไป** (plan ละชุด · deploy เองหลัง `npm run verify` และตรวจบนแอป dev ของหน้าที่แก้)
- **plan 2 ชุด 2** ข้อมูลหลัก 8 ไฟล์ · 46 ช่อง · 26 ปุ่ม · เริ่มหลัง plan 1 merge · ทำคู่กับ 2B ได้ · แก้ `supplier-form-ui.test.ts:18-20`
- **plan 3 ชุด 3** 9 ไฟล์ · dialog 5 + sheet 2 · เริ่มหลัง 2B merge (I28) · แก้ `disposal-bulk-execution-ui.test.ts:31` · I25
- **plan 4 ชุด 4** 18 ไฟล์ · login · แผงนำเข้า (S5) · T3 · drawer 2 ตัว · เริ่มหลัง 2B merge · แก้ `login-form-ui.test.ts:29`, `:30` · `asset-label-print-ui.test.ts:155` · `asset-transaction-cancellation-ui.test.ts:13` · `asset-scan-search-tool.test.ts:43` · GD1 budget เป็น `{}`
- **plan 5 ชุด 5** หลัง 2B merge · `ActionBar` + padding 4 หน้า (I23, O11) · S1 · K12 + คำกริยา 3 key + `maintenance-attachments` → `useConfirm` · O7 → `TabNav` · แก้ `mobile-action-bar.test.ts:17` · `visual-foundation-guards.test.ts:91` · `audit-scan-search-ui.test.ts:182` · `disposal-detail-workspace.test.ts:35`, `:42` · `confirm-dialog-ui.test.ts:25-31`
- **V track** สเปกและ plan ของตัวเอง หลังชุด 1 อยู่บน Production · commit แรก `fieldErrors` (K6 a, ขออนุมัติการแก้ server) · K5 · `min={start}` 4 คู่ · แก้ `settings-depreciation-policy-ui.test.ts:69`, `:77` · นับตัวเลข validation ใหม่ที่ HEAD ตอนนั้น

### 10.4 Test

**ตาราง A: test เดิมที่ต้องแก้** (แก้ใน commit ที่ทำให้พัง · อ่านเนื้อทุกบรรทัดที่ `5ffee76` แล้ว) · รวม 21 ไฟล์ · plan 1 แก้ 12 ไฟล์

| test:บรรทัด | ตอนนี้ยึด | แก้เป็น | งาน |
|---|---|---|---|
| `visual-foundation-guards.test.ts:275-290` | class ของ segmented 2 จุด | อ่าน `ui/segmented.tsx`: กรอบ `gap-0.5 rounded-md border border-border bg-surface p-0.5` · ส่วนร่วมไม่มี `font-` · `"bg-primary-soft font-semibold text-primary-hover"` · `"font-medium text-muted-foreground hover:bg-background hover:text-foreground"` · `aria-pressed=\{pressed\}` · 2 ไฟล์มี `<Segmented` · room list ไม่มี `aria-pressed` · คง `:278` | 1 |
| `asset-label-print-ui.test.ts:51`, `:53` | `aria-pressed={isActive}` · `? "bg-primary-soft …"` ในฟอร์ม | `:51` → `/<Segmented aria-label=\{label\}[\s\S]*?showCheck/` · `:53` → string เลือกอยู่ใน `ui/segmented.tsx` · `:52`, `:54-55` ผ่านต่อ | 1 |
| `audit-scan-room-ui.test.ts:37`, `:83` | `aria-pressed={tab === key}` · `role="group" aria-label={t("roomListTabs")}` | `/<Segmented[\s\S]*?value=\{tab\}[\s\S]*?onValueChange=\{onTabChange\}/` · `/<Segmented[\s\S]*?aria-label=\{t\("roomListTabs"\)\}/` | 1 |
| `accessible-dialog.test.ts:28`, `:31` | `closeLabel = "Close"` · `min-h-11 min-w-11` | `/closeLabelProp \?\? tCommon\("close"\)/` + `doesNotMatch(/"Close"\|>\s*Close\s*</)` · `/<DialogPrimitive\.Close[^>]*asChild>\s*<Button variant="ghost" size="icon"/` + `doesNotMatch(/opacity-/)` | 4 |
| `sheet-drawers-ui.test.ts:9`, `:11` | เหมือนแถวบนใน `sheet.tsx` | regex เดียวกันกับ `SheetPrimitive.Close` | 4 |
| `field-primitives.test.ts:131` | `"mt-1 block text-meta text-faint-foreground"` 2 ครั้ง | `/const subLineClasses = "mt-1 block text-meta text-faint-foreground"/` 1 ครั้ง + `className=\{subLineClasses\}` 3 ครั้ง (I13) | 5 |
| `disposal-forms-ux.test.ts:11`, `:12` | `/FormStep/` | I19 | 12 |
| `audit-scan-check-ui.test.ts:22` | `disabled={saving \|\| disabled \|\| missingPhoto}` | `/busy=\{saving\}/` + `/disabled=\{disabled \|\| missingPhoto\}/` | 13 |
| `audit-not-found-dialog.test.ts:14` | `/<textarea/` | `/<Textarea/` | 13 |
| `asset-form-sticky-actions.test.ts:7-17` | `pb-36 sm:pb-24` · `fixed bottom-3` · `lg:left-[calc(…)]` · `bg-surface/95` · `backdrop-blur` · `<Save className="h-4 w-4" />` | ชื่อ test "asset form keeps save actions in a sticky form footer" · `/<StickyFormFooter[\s>]/` · `doesNotMatch(/fixed bottom-3\|lg:left-\[calc\|bg-surface\/95\|backdrop-blur\|pb-36 sm:pb-24/)` | 15 |
| `asset-form-sticky-actions.test.ts:19-26` | `disabled={saving \|\| isProtectedStatusChange \|\| …}` | `/busy=\{saving\}/` + `disabled` ที่เหลือโดยใช้ `\s*` รอบ `\|\|` + `doesNotMatch(/disabled=\{saving/)` | 15 |
| `visual-foundation-guards.test.ts:267` | `asset-form.tsx: 1` | ลบแถว | 15 |
| `mobile-field-navigation.test.ts:13-26` + test ใหม่หลัง `:46` | รายการ navigation | navigation เพิ่ม `/th/maintenance/pm`, `/th/disposal/batches`, `/th/disposal/batches/batch-1`, `/th/admin/users`, `/th/admin/roles`, `/th/admin/data-quality`, `/th/admin/integrations`, `/th/master-data/brands`, `/th/master-data/employees/employee-1`, `/th/master-data/suppliers/supplier-1` · test ใหม่: 25 route เป็น `"focus"` + `/en/admin/settings` | 18 |
| `visual-foundation-guards.test.ts:266` | `system-settings-form.tsx: 2` | `1, // label preview` | 19 |
| `settings-depreciation-policy-ui.test.ts:53` | `/<textarea[\s\S]*onPolicyJsonChange/` | `/<Textarea[\s\S]*onPolicyJsonChange/` | 20 |
| `supplier-form-ui.test.ts:18-20` | `aria-invalid=` · `aria-describedby=` · `role="alert"` | ตามข้อ 4.16 | plan 2 |
| `disposal-bulk-execution-ui.test.ts:31` | `<footer className="…sticky bottom-0…"` | `/<AccessibleDialogFooter>/` + `doesNotMatch(/<footer\|sticky bottom-0/)` | plan 3 |
| `login-form-ui.test.ts:29`, `:30` | `aria-busy={loading}` · `loading ? t("loggingIn") : t("login")` | ตามข้อ 6.11 | plan 4 |
| `asset-label-print-ui.test.ts:155` | `<p className="mt-2 text-xs text-muted-foreground">{labels.minChars}</p>` | `/hint=\{trimmedQuery\.length < 2 \? labels\.minChars : undefined\}/` | plan 4 |
| `asset-transaction-cancellation-ui.test.ts:13` | `/min-h-11/` | `/<Button[\s\S]*?variant="danger"/` + `/<AccessibleDialogFooter>[\s\S]*?variant="destructive"[\s\S]*?busy=\{saving\}/` | plan 4 |
| `asset-scan-search-tool.test.ts:43` | `/<label[^>]+htmlFor="asset-scan-query"/` | `/<Field label=\{labels\.queryLabel\}>\s*<ScannerTextInput\s+id="asset-scan-query"/` | plan 4 |
| `mobile-action-bar.test.ts:17` · `visual-foundation-guards.test.ts:91` · `audit-scan-search-ui.test.ts:182` · `disposal-detail-workspace.test.ts:35`, `:42` · `confirm-dialog-ui.test.ts:25-31` | path ของแถบเก่า · `<DisposalMobileActionBar` · รายการไฟล์ลบ | ตามข้อ 6.11 และ 5.11 | plan 5 |

**ตาราง B: test ไฟล์ใหม่ และที่เพิ่มในไฟล์เดิม** (เจ้าของเนื้อ assert คือส่วนที่ถือ K นั้น)

| ไฟล์ | ตรวจ | เจ้าของ | งาน |
|---|---|---|---|
| `tests/dialog-trigger-handles.test.ts` (ใหม่) | handle 3 ไฟล์ (I5) | 3.4 | 3 |
| `tests/field-primitives.test.ts` (เพิ่ม) | `labelAction` · `fieldLabelClasses` · `FieldRequiredMark` · server-safe ของ `segmented`, `form-context-banner` · `FormContextBanner` เป็น `<dl` ไม่มี `uppercase`, `bg-primary-soft`, `truncate` | 3.3 · 3.10 | 1, 2, 6 |
| `tests/accessible-dialog.test.ts` (เพิ่ม test) | export 3 ส่วนประกอบ + `accessibleDialogFormClasses` · class ตามข้อ 10.1 และ I7 · `disabled=\{dialog\.busy \|\| disabled\}` · `description\?: ReactNode` · ไม่มี `flex-col-reverse`, `bottom-3` | 5.11 · I6–I8 | 4 |
| `tests/sheet-drawers-ui.test.ts` (เพิ่ม test) | `bg-surface` ใน base · `pb-[env(safe-area-inset-bottom)]` ในสาย bottom · `SheetHeader`/`SheetTitle` ใหม่ · ต่อมา drawer ใช้ `<EmptyNote` | 5.11 · I10 | 4, plan 4 |
| `tests/scanner-text-input.test.ts` (เพิ่ม) | `"aria-label"\?: string` · `<Input[\s\S]*?aria-label=\{ariaLabel\}` · `<Input[\s\S]*?disabled=\{disabled\}` · ยังไม่มี `aria-label={labels.stop}` | 3.9 · I17 | 5 |
| `tests/file-evidence-ui.test.ts` (ใหม่) | `FileDropzone` (I13) · `FileQueueList` (I15) · จุดเรียกตามข้อ 7.6.3 · repair ไม่มี `type="file"` · `SignaturePad` | 7.9 | 5 → 17 |
| `tests/step-states.test.ts` (ใหม่) | `getLinearStepStates` · `getStepFocusIndex` (import ตรง) | 7.9 · I18 | 6 |
| `tests/steps-ui.test.ts` (ใหม่) | `Steps` · `FormSection` · จุดเรียก (ติดตั้งส่วนควบ 1e · หน้าตั้งค่า 1f · S5 ชุด 4 · S1 ชุด 5) · key ครบ th/en | 7.9 · I18–I19 | 6 → plan 5 |
| `tests/choice-controls-ui.test.ts` (ใหม่) | class ของ I20 · `event.key === "Enter"` · ทั้ง `src` ไม่มี `accent-primary` (3 → 0 หลัง 1a, 1b) · จุดเรียก R1–R3, T4–T6, P1, P3, T3 | 7.9 · I20–I21 | 6 → plan 4 |
| `tests/sticky-form-footer-ui.test.ts` (ใหม่) | class ของ I22 · ไม่มี `"use client"`, hook, `shadow-`, `fixed`, `backdrop-blur`, `bg-surface/` · 2 ฟอร์มใช้ · อยู่ก่อน `</form>` ตัวแรกที่ตามมา | 6.11 · I22 | 7 → 15, 19 |
| `tests/form-migration-guards.test.ts` (ใหม่) + helper | ตาราง C | 9 | 7 · GL2 ในงาน 18 |
| `tests/api-error-exposure.test.ts`, `tests/api-error-catalog.test.ts` (เพิ่ม) | ข้อ 8.5.4 | 8.5 | 8 |
| `tests/confirm-dialog-ui.test.ts`, `tests/mobile-action-bar.test.ts` (เพิ่ม) | ข้อ 5.11 F–H · ข้อ 6.11 + I23 | 5, 6 | plan 5 |

**ตาราง C: guard ใหม่ใน `tests/form-migration-guards.test.ts`** (โค้ดเต็มในข้อ 9.3 · budget ต่อไฟล์ในข้อ 9.4 · "owned" = 66 ไฟล์ของ 2C · ไฟล์ใหม่ของ 2C ได้ 0 · ลดได้ เพิ่มไม่ได้)

| ID | ตรวจ (regex หรือวิธี) | ยกเว้น / budget หลัง 2C | ที่ `5ffee76` |
|---|---|---|---|
| GF1 | `/\bfunction Field\s*\(/g` ใน owned | `{}` | 25 ไฟล์ |
| GF2 | `<input>` (ไม่นับ checkbox/radio/hidden/file) `<select>` `<textarea>` ที่เขียนเอง (ตัวอ่าน JSX) | `{ asset-label-print.tsx: 2, audit-scan-room-picker.tsx: 1 }` | 273 ใน 51 ไฟล์ |
| GF3 | class string ของช่องที่เขียนเอง (`isFieldClassString` ข้อ 9.3) | `{}` | 232 ใน 49 ไฟล์ (ข้อ 9 · ไม่ได้นับซ้ำ) |
| GF4 | `Field required` ↔ `required` บนช่องตัวแรก · ไม่มี `SearchableSelect` ใน `Field` · ไฟล์ที่มี `noValidate` + `validate(` ยกเว้น | `STAR_ONLY` 3 จุด (`t("returnDate")`, `t("licenseTotalSeats")`, `t("componentRole")`) | 4 ไม่ตรง |
| GF5 | floor ของ `required`/`maxLength`/`minLength` ต่อไฟล์บน `CONTROL_TAGS` + `ChoiceCard`/`ChoiceChip` | ไม่น้อยกว่าเดิม | 111 / 97 / 7 (ข้อ 9 · ไม่ได้นับซ้ำ) |
| GF6 | `Input`/`input` ที่มี `step="0.01"` ต้องมี `inputMode="decimal"` | — | 3 จาก 14 |
| GF7 | `/ml-1 text-danger">\*\|mb-1\.5 block text-sm font-medium text-foreground\|<legend className="mb-2 text-sm font-medium text-foreground"\|\b(?:h-4 w-4\|h-5 w-5\|h-3\.5 w-3\.5) rounded border-border\b\|\baccent-primary\b/g` | checkbox ของ 2B 7 จุด | 132 ใน 40 ไฟล์ (0 นอก owned) |
| GF8 | `<label>` ในไฟล์ที่ย้ายไม่มี `<Field`, `<FileDropzone`, `<ScannerTextInput`, `<SearchableSelect`, `<label` ข้างใน | 0 | 0 lexical (ซ้อนผ่าน `Field` ของไฟล์ 3 จุด) |
| GB1 | `/<Loader2\b/g` ใน owned | 18 ใน 12 ไฟล์ (I27) | 74 ใน 46 ไฟล์ |
| GB2 | `<Loader2` นอก `<Button>`/`<button>` ในไฟล์ที่ย้ายต้องมี `motion-reduce:animate-none` | 0 | 12 ไม่มี |
| GB3 | ไฟล์ใน `BUSY_LABEL_SWAPS` ที่ย้ายแล้วไม่มีนิพจน์สลับป้าย | 0 | 10 จุดใน 8 ไฟล์ |
| GB4 | tag ที่มี `busy={A}` และ `disabled={B}`: B ไม่มี A แบบเต็มคำ (`(?<![\w.$])A(?![\w$])`) ทั้ง `src` | ตัวแปรเดียวกันคนละค่าผ่าน (`syncingLdap`) | 0 |
| GD1 | `ui/{dialog,sheet,alert-dialog,accessible-dialog}.tsx` ไม่มี `"Close"` · `LITERAL_CLOSE_LABEL` = `[]` · `/closeLabel=\{[^}]*\bcancel\b[^}]*\}/g` ≤ budget | `{ system-settings-form: 1, IntegrationClientManager: 1 }` → 1f ลบแถวแรก → plan 4 `{}` | "Close" 3 · cancel 2 |
| GD2 | ไฟล์ที่มี `<AccessibleDialog` ต้องมี `<AccessibleDialogFooter` ≥ จำนวน dialog · `PENDING_FOOTER_PARTS` ตรวจสองทาง | 19 → หลังชุด 1 เหลือ 10 → ชุด 5 `{}` | 23 dialog ใน 19 ไฟล์ |
| GD3 | ใน `<AccessibleDialogFooter>…</AccessibleDialogFooter>` ไม่มี `/<button(?=[\s/>])\|<Loader2\b\|className=\|size="\|flex-col-reverse\|\bsticky\b\|opacity-/` | 0 | ยังไม่มีส่วนประกอบ |
| GD4 | ใน `<AccessibleDialogFooter>` และ `<StickyFormFooter>` ปุ่มรองมาก่อน `type="submit"` · `/\bflex-col-reverse\b/g` ใน owned + `ui/` | หลัง 0a: 8 บรรทัดใน 7 ไฟล์ → `{}` หลังชุด 4 | 10 บรรทัดใน 9 ไฟล์ |
| GD5 | `<AccessibleDialog>` ที่อยู่ใน children ของ `<form>` ไม่มี `/<form(?=[\s/>])\|type="submit"/` ทั้ง `src` | 0 | 1 คู่ ผ่าน |
| GD6 | `<form>` ที่มี `<AccessibleDialogFooter` ข้างในต้องมี `className={accessibleDialogFormClasses}` ตรงตัว | 0 | ยังไม่มี |
| GL1 | (a) `sticky-form-footer.tsx` มี `\bsticky\b` ไม่มี `/\bfixed\b\|\bshadow-\|backdrop-blur\|\bbg-[\w-]+\/\d+/` · (b) ไฟล์ที่มี `<StickyFormFooter` อยู่ใน `STICKY_FOOTER_ROUTES` และทุก route ได้ `"focus"` · (c) class string ที่มี `fixed` และ `bottom-` ≤ budget | (c) หลัง plan 5: `asset-register-table.tsx` 1 + `ui/action-bar.tsx` 1 | (c) 4 |
| GL2 | ทุก `page.tsx` ใต้ `src/app/[locale]/(dashboard)`: ฟอร์ม (`new`, `[…]/edit`, `admin/settings`) = focus · route ที่ไม่มี `[` (ยกเว้น 4 หน้างาน `asset-management/*`) = navigation | 0 | ผิด 27 (นับซ้ำแล้ว) · ลงงาน 18 |
| GL3 | `/\bfunction (?:FormStep\|WizardStep\|Choice\|AssetStateFieldLabel)\b\|aria-label=\{t\("batchAssetTagHelp"\)\}/g` ใน owned | `{}` | 8 ใน 7 ไฟล์ |
| — | test ตัวอย่างของตัวอ่าน JSX (ข้อ 9.3) | — | — |

**ตาราง D: test ที่ยึดของที่ 2C แตะ และต้องผ่านต่อโดยไม่แก้** (เขียนเป็นข้อห้ามใน task · ห้ามรัน formatter และดู `git diff --stat` ทุก commit · ข้อ 9.8)

| งาน | test:บรรทัด → ต้องคง |
|---|---|
| P0 | `asset-label-print-ui.test.ts:48` (`<LabelAssetNameModeField … label={labels.compactLabelAssetName}`), `:52`, `:54-56` · `audit-scan-room-ui.test.ts:36` (`(["pending", "checked", "all"] as const)`), `:84-87` · `visual-foundation-guards.test.ts:278` · `disposal-detail-workspace.test.ts:76-82` (`busy={saving}`, `returnFocusRef={triggerRef}`, `initialFocusRef={executionDateRef}`) · `audit-not-found-dialog.test.ts:12-16` · `disposal-evidence-exception.test.ts:157-162` |
| 0a | `visual-foundation-guards.test.ts:67-84` (scrim · `shadow-overlay…motion-reduce:animate-none!` · duration ของ sheet) · `accessible-dialog.test.ts:7-24`, `:29-30` · `sheet-drawers-ui.test.ts:10`, `:15-28` · `ui-overlay-guards.test.ts:57-62` · `confirm-dialog-ui.test.ts:9-16` · `attachment-preview-dialog-ui.test.ts:24-34` |
| 0b–0d | `field-primitives.test.ts:82-93` (`:85` literal ดอกจัน · `:92` `Field` ไม่ใส่ `required`), `:124-130` · `scanner-text-input.test.ts:192-201` · `audit-scan-search-ui.test.ts:153-155` · `visual-foundation-guards.test.ts:174` (`rounded-[`), `:194-198` (สีจางบนพื้นสถานะ), `:260-273` (R2: ไฟล์ใหม่ 0 เงา), `:297-299` |
| 8 | `disposal-route-structure.test.ts:152-156`, `:227-238` · `disposal-bulk-execution-route.test.ts:133-134` · `api-error-exposure.test.ts:53-68` · `api-error-catalog.test.ts:48-67` |
| 1a | `repair-record-ui.test.ts:38` (`uploadRepairFiles(payload.id, files`) · `repair-record-detail-ui.test.ts:13`, `:16`, `:21-29` · `maintenance-attachments-ui.test.ts:7-11` (ไม่แตะ `:239-256`) |
| 1b | `asset-operation-confirmation-ui.test.ts:21`, `:29-32` · `legacy-checkin-flow.test.ts:63` · `asset-handover-checkout.test.ts:16-20` · `asset-handover-checkin.test.ts:24` |
| 1c | `disposal-detail-workspace.test.ts:76-83` · `disposal-evidence-exception.test.ts:157-162` (`aria-describedby` 2 ตัว · `minLength={20}` · `maxLength={2000}` บนช่อง) · `disposal-forms-ux.test.ts:13-14`, `:17-24` · `disposal-batch.test.ts:187-192` |
| 1d | `audit-scan-check-ui.test.ts:23`, `:41-42`, `:50` · `audit-scan-search-ui.test.ts:146-151` (`multiple` อยู่บรรทัดของตัวเอง) · `audit-mobile-flow-completion.test.ts:10-14` · `ui-overlay-guards.test.ts:51-55` |
| 1g, 1e | `confirm-dialog-ui.test.ts:27-34` · `confirm-text-dialog-ui.test.ts:20-21` (`FileDropzone file={removeEvidence}` ติดกัน) · `asset-batch-form-layout.test.ts:8-59` (ลำดับ `{t("batchOptionalColumns")}` → `batchOptionalColumnKeys` → `<BatchOptionalColumnToggle` · `Field label={t("batchAssetTag")}` · หัวตารางบรรทัดละ `<th>`) · `asset-component-manager.test.ts:26-30` · `asset-status-help-ui.test.ts:28-31` · `asset-clone-ui.test.ts:29-35` |
| 1f | `settings-depreciation-policy-ui.test.ts:50` (ลำดับ `type` → `inputMode` → `value`), `:55-57`, `:69`, `:77` · `settings-ldap-role-ui.test.ts:12-15`, `:20-21` (ไม่แตะการ์ด LDAP `:1703`) · `settings-tab-persistence-ui.test.ts:8-13` (ไม่แตะ `:937-956`) |
| plan 2–5 | ตามข้อ 9.7 แถว 2–5 · เพิ่ม `audit-scan-room-ui.test.ts:31` (`/min-h-11/` ใน `audit-scan-room-picker.tsx` ต้องยังมีหลังชุด 3) · `html-lang-and-years.test.ts:21` |

pin ที่อ่านไฟล์ด้วย `readFileSync` โดยไม่แปลง CRLF (`asset-form-sticky-actions`, `asset-batch-form-layout`, `confirm-text-dialog-ui`, `disposal-evidence-exception`) ห้ามมี `\n` ใน regex ใหม่ · working tree เป็น CRLF (ข้อ 9.8)

### 10.5 ตรวจบนแอป dev ก่อนประตู deploy (งาน 21)

**ก่อนเริ่ม:** รีสตาร์ต dev server · `npm run verify` ผ่าน · ดูซ้ำบน production build (`next build` + `next start`) · `.env` ชี้ DB dev `asset_management_dev` (AGENTS) · ไม่มี migration และไม่มี env ใหม่

**ความกว้าง:** 1440 · 768 (iPad) · 375 · เพิ่ม 700 (ช่วง 640–767 ที่ของกลางสูง 44) และ 1024 สำหรับ G11 · ภาษาไทยเป็นหลัก ภาษาอังกฤษ 1 รอบ · zoom 100% และ 200%

| หน้า | ดูอะไร | มาจาก |
|---|---|---|
| ตั้งค่าระบบ (`/th/admin/settings`) **ก่อน commit K15** | ที่ 375 และ 768 แถบล่างทับแถบบันทึกหรือไม่ (G11b) · จดผลลง plan | Q4 · 6.9 |
| ตั้งค่าระบบ หลัง 1f ครบ 11 แท็บ | แถบล่างหาย · `StickyFormFooter` ชิดขอบล่างพอดี ไม่มีช่อง 16/24px · สถานะ "มีการแก้ไข N รายการ" · ไม่มีการ์ดชั้นที่ 3 · `FormSection as="h3"` · segmented ป้ายย่อ 44 บนมือถือ · ช่องเป็นสีขาวทั้งหน้า | I22 · I29 · K18 |
| ตั้งค่า: dialog คำนำหน้ารหัส | กด Enter ในช่องคำนำหน้าและช่องค้นหาหมวดหมู่ → หน้าตั้งค่า**ไม่**ถูกบันทึก (ไม่มี request บันทึกตั้งค่าใน Network · ไม่มี toast · ตัวนับการแก้ไขไม่เปลี่ยน) · ปุ่ม "บันทึกกลุ่ม" ยังทำงานด้วยการคลิก · ส่วนท้ายไม่เลื่อนหาย · ปุ่ม X อ่านว่า "ปิด" | 5.6 · GD5 · R4 |
| ตั้งค่า: แท็บค่าเสื่อม | Enter บน chip กลุ่ม (T6) ไม่บันทึกหน้า · chip ตอน JSON ผิด (disabled ยังเห็นตัวที่เลือก) · ช่องค้นหาหมวดหมู่ `md` | I20 |
| เพิ่ม/แก้ทรัพย์สิน (`/th/assets/new`, `/th/assets/x/edit`) | **G11:** ที่ 1024 ตอน sidebar พับและกาง แถบกว้างเท่า `main` ไม่เลื่อน 192px · ไม่ล้นขวา · ที่ 640–1023 ไม่กว้างกว่าฟอร์ม · เลื่อนถึงท้ายแล้วแถบอยู่ท้ายฟอร์ม · มือถือ ยกเลิกบน บันทึกล่าง · `busy` ตอนตรวจรหัสซ้ำ (ปุ่มเทา โฟกัสคงอยู่) · `labelAction` สถานะ/สภาพ · chip ประเภทรูป Enter ไม่ส่งฟอร์ม · ป้าย "ราคาซื้อ (บาท)" · แป้นทศนิยมบนมือถือ | I22 · K14 · I20 · K26 |
| เพิ่มเป็นชุด · ติดตั้งส่วนควบ · ไฟล์แนบทรัพย์สิน | chip คอลัมน์รายแถว · ช่องในตารางมีชื่อ (NVDA) · `Steps` 3 ขั้น จอแคบเห็น "ขั้นที่ 2 จาก 3 · ระบุรายละเอียด" · ปุ่มถอย "กลับ" · คำอธิบาย/สถานะอัปโหลดของช่องรูปรายการ | 7.2 · I32 · I14 |
| ส่งมอบ · รับคืน · โอน · ย้ายหลายรายการ + dialog ตรวจทาน | การ์ด radio: Space เลือก Enter ไม่ส่ง · `FormContextBanner` เป็นแถว `dl` เงียบ · ช่องรูปก่อนส่งมอบไม่มีป้ายซ้อน (คลิกป้ายเปิดเลือกไฟล์ครั้งเดียว) · ลายเซ็น: ปุ่มล้างใต้ช่อง 1 บรรทัดที่ 375 · คิวรูปรับคืนมีปุ่ม X ขอบเทา · ปุ่มยืนยันใน dialog ตรวจทาน `busy` โฟกัสไม่หลุด | 1b · K24 · K25 |
| แผน PM ใหม่/แก้ · บันทึกซ่อม · รายละเอียดงานซ่อม (3 dialog) | radio card · เลือกหลายไฟล์ 2 รอบแล้วต่อท้าย เอาออกทีละไฟล์ · ส่วนท้าย dialog ไม่เลื่อนหาย · ลิงก์ในประโยคเตือนมีเส้นใต้ · dialog ลบไฟล์แนบยังเป็นแบบเดิม (ชุด 5) | 1a · I25 |
| ขอตัดจำหน่าย · ขอเป็นชุด · รายละเอียด (dialog พิจารณาและดำเนินการ) | หัวข้อมีเลขเป็นวงขอบเทา · ช่องเงินมีหน่วย · รายการไฟล์ `FileQueueList` · description ของ dialog เป็น `tag` · ปุ่มท้ายฟอร์มชุด มือถือ ยกเลิกบน (I24) | 1c |
| สแกนตรวจนับ (แผ่นตรวจ) · รายการไม่ตรง (3 dialog) · ไม่พบทรัพย์สิน · ชิ้นส่วนหาย | ปุ่ม `warning` · `busy` ปุ่มบันทึกแผ่นตรวจ · ยกเลิกกดไม่ได้ระหว่างบันทึก · segmented รายการห้อง (44 / 36) · คำอธิบายช่องรูป | 1d · P0 |
| หน้าที่ไม่อยู่ในชุด 1 แต่ใช้ primitive ที่ 2C-0 แก้ | sheet ตัวกรองและ ⋯ ของทะเบียน (พื้นขาว หัวมีเส้น) · ลิ้นชักหลักฐาน · ลิ้นชักกิจกรรม · ตัวเลือกห้องและแผ่นตรวจตอนสแกน · ลบผ่าน `useConfirm` (ยกเลิกบน ลบล่าง) · `ConfirmTextDialog` · dialog ที่ยังไม่ย้าย 9 ตัว (หัว 16px กับเนื้อ 20px บนมือถือ) | 0a · I10 · I12 |
| ส่งข้อมูลผิด 1 ครั้ง | บันทึกสาขาด้วยรหัส `"   "` → toast ไทย "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง…" ไม่มี JSON | 8.5 |
| แถบล่างบนมือถือ | หายใน 25 route · ยังอยู่ในหน้ารายการทุกหน้า รวม `/th/maintenance/pm` และ `/th/disposal/batches` | I29 |

**คีย์บอร์ด:** Tab ผ่านทุกปุ่มเห็นวงโฟกัส · ลำดับ Tab ในส่วนท้าย = ลำดับที่เห็น · Escape ปิด dialog ได้เมื่อไม่ busy และปิดไม่ได้ตอน busy · โฟกัสกลับไปที่ปุ่มเปิดหรือปุ่ม ⋯ (`returnFocusRef`) · ปุ่ม `busy` ยังมีโฟกัส · Enter ในช่อง `required` ที่ว่างของ dialog ที่มี `<form>` ยังเตือนแบบเบราว์เซอร์ (submit อยู่ใน `<form>`)

**NVDA:** X อ่าน "ปิด" (ไม่ใช่ "Close" หรือ "ยกเลิก") · ช่องที่มีดอกจันอ่าน "จำเป็น" (`aria-required`) และไม่อ่านดอกจัน · ช่องแนบไฟล์อ่าน "ป้าย + ชื่อเรื่อง" แล้วจึงคำอธิบาย (I13) · `Steps` อ่านชื่อ `<ol>` และ "เสร็จแล้ว: …" / "ขั้นตอนปัจจุบัน: …" · การ์ดและ chip อ่านชื่อ สถานะเลือก และคำอธิบาย · segmented อ่าน "กดอยู่" · error รหัสซ้ำอ่านทันที (`role="alert"`) · ป้ายปุ่มไม่เปลี่ยนตอน busy

**forced colors ของ Windows:** วงโฟกัสบนปุ่ม ช่อง การ์ด chip และช่องแนบไฟล์ · ตัวที่เลือกของ segmented ยังแยกได้ (รายการห้องไม่มี `Check` ต้องดูเป็นพิเศษ) · marker ของ `Steps` (เลข / ติ๊ก / X) · X ของ dialog ตอน busy · ปุ่ม `busy`

**ลดการเคลื่อนไหว:** spinner ในปุ่มและบรรทัดสถานะหยุด (GB2) · การ์ด chip segmented ไม่มี transition · sheet และ dialog ไม่เลื่อน

**axe:** color-contrast = 0 ที่ ตั้งค่าระบบ · เพิ่มทรัพย์สิน · ส่งมอบ (dialog ตรวจทานเปิด) · รายละเอียดคำขอตัดจำหน่าย (dialog พิจารณาเปิด) · แผ่นตรวจตอนสแกน · ไม่มี `label`/`aria-*` ผิดในหน้าเหล่านี้

**เครื่องจริง:** iPhone (Safari): dialog และ sheet ล่างพ้น home indicator · แถบบันทึกพ้น home indicator · ช่องวันที่ว่างสูงเท่าช่องอื่น · เลือก PDF ในช่องไฟล์งานซ่อมได้ · `has-checked:` ทำงาน · iPad (768): ช่อง 14px ซูมหรือไม่ · งานค้างของเฟส 1 และ 2A ที่ผู้ใช้ต้องทำเอง (พิมพ์ป้ายความร้อน · NVDA · iPhone/iPad) ต้องเสร็จก่อนผู้ใช้อนุมัติ deploy (ข้อ 8.8)

### 10.6 เอกสาร (งาน 22 งานเดียว · หัวข้อ "เอกสาร" ในข้อ 3–9 ใช้เป็น checklist)

| ไฟล์ | ตำแหน่งที่ `5ffee76` | แก้ | ที่มา |
|---|---|---|---|
| `DESIGN.md` | §2 Neutral `:213-214` | canvas ใช้กับแถบ sticky เต็มขอบ รวม `StickyFormFooter` · `--background` เป็นพื้น**ส่วนท้าย** dialog และ dialog ยืนยัน (เนื้อ dialog และ sheet เป็นขาว) | 3.18 · 5.12 · I10 · I22 |
| | §4 `:320` | เงาของแถบบันทึก 2 แถบหาย · budget R2 เหลือ 10 | 6.12 |
| | §5 Buttons `:328-361` (`:352`, `:356`, `:360`) | แถว `warning` เพิ่มยืนยัน "ไม่พบ" 2 จุด (K22) · Busy: ป้ายไม่เปลี่ยน · `disabled` เก็บได้แค่เงื่อนไขอื่น · ปุ่มที่ 44px บนจอใหญ่เหลือ 40 (K7) · `Segmented` · ลำดับปุ่ม K8 · ไอคอนลบแบบกลางเป็น `outline` | 6.12 · 3.18 |
| | Dialogs `:382-395` | ส่วนประกอบ `Body`/`Footer`/`Cancel` + `accessibleDialogFormClasses` · K8 · X ghost ที่แปลแล้ว · safe area · ห้าม `<form>` ใน dialog ที่อยู่ใน `<form>` อื่น · `description` ที่มีรหัสใช้ `tag` · ทุก `confirm()` ต้องมี `confirmLabel` เป็นคำกริยา (หลัง plan 5) | 3.18 · 5.12 |
| | Cards `:407` | `ChoiceChip` 6px · `ChoiceCard` 8px | 3.18 |
| | Inputs `:413-428` | `labelAction` · `fieldLabelClasses` + `FieldRequiredMark` + `fieldset min-w-0` · ช่องไม่มีป้ายใช้ `Field hideLabel` หรือ `aria-label` (I17) · ช่องเงินมีหน่วยในป้ายและ `inputMode="decimal"` · `Field required` คู่กับ `required` ของช่อง · `FileDropzone` (`description`, ห่อ `Field` ได้) · `FileQueueList` · `ChoiceCard`/`ChoiceChip` (input เห็นเสมอ Enter ไม่ส่ง) · `:426` จำนวนช่องที่เหลือ | 4.17 · 7.12 |
| | Components (เพิ่ม) | `Steps` · `FormSection` · `StickyFormFooter` (เฉพาะ focus route) · `SignaturePad` · `ActionBar` + `actionBarPagePadding` (หลัง plan 5) | 6.12 · 7.12 |
| | Adaptive `:509-518` | หน้าตั้งค่าและฟอร์ม new/edit ทุกหน้าเป็น focus-task route · หน้ารายการคงแถบล่าง | 6.12 |
| `docs/superpowers/specs/2026-10-11-ui-phase2a/04-buttons.md` | `:129`, `:203`, `:211` | ข้อความตามข้อ 6.12 (K7, K13) | 6.12 |
| `docs/14_UI_UX_DESIGN_SYSTEM.md` | ส่วนปุ่ม ช่อง dialog | ให้ตรงกับ DESIGN.md | ทุกส่วน |
| `DEVELOPER_HANDOFF.md` | ส่วน UI | primitive ใหม่ทุกตัวและกติกา: ห้าม `<form>` ซ้อน · `accessibleDialogFormClasses` · ไม่มี label swap · `StickyFormFooter` ใช้บน focus route เท่านั้น · guard file `form-migration-guards` ลด budget ห้ามเพิ่ม · ห้ามรัน formatter | — |
| `docs/99_CHANGELOG.md` | | 2C plan 1 + บั๊ก ZodError (ข้อความไทยแทน JSON) + แถบล่างหายในหน้าฟอร์ม | — |
| wiki `D:\Obsidian\Eltross\AssetSystem` | `ams-status.md` (`:36` บอกว่า Prod รัน `ab1b873`) · `ams-log.md` · `ams-open-questions.md` · `ams-index.md` ถ้ามีหน้าใหม่ | แถวสถานะ 2C plan 1 · ข้อค้าง: G11b ผลจริง · iPhone safe area · การ deploy รวม 56 commit · รัน `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` แล้ว commit vault ด้วย `ingest:` | AGENTS |

### 10.7 ความเสี่ยงหลัก

1. **ประตู deploy ใหญ่มาก:** Production กระโดดจาก `ab1b873` ข้าม 56 commit (คำไทย · เฟส 1 · 2A) + P0 + plan 1 ประมาณ 22 งาน · ป้องกันด้วยตารางข้อ 10.5 และถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
2. **2C-0 เปลี่ยนของที่หน้านอกชุด 1 ใช้ทันที:** หัว dialog 23 ตัว · X · พื้นและหัวของ sheet 7 ตัว (รวม 2 ตัวของ 2B) · ลำดับปุ่ม `useConfirm` · `FormContextBanner` 5 จุด · ต้องแจ้ง 2B (I10) และดู dialog ที่ยังไม่ย้ายที่ 375
3. **submit ทะลุ portal และ Enter บนตัวเลือก:** dialog คำนำหน้ารหัสอยู่ใน `<form>` ของหน้าตั้งค่า · T5/T6/P1/R1–R3 เปลี่ยนจากปุ่มเป็น input จริง · GD5 และ `preventEnterSubmit` กันไว้ แต่ต้องลองด้วยคีย์บอร์ด (ข้อ 10.5)
4. **การตรวจข้อมูลเพียงอย่างเดียวหายเงียบ:** 18 ไฟล์พึ่ง `required`/`maxLength` ของเบราว์เซอร์ · GF4 และ GF5 กันไว้ · ส่วนท้าย dialog ที่หลุดออกนอก `<form>` ทำให้ Enter และ `required` เลิกทำงาน (GD6 + ตรวจคีย์บอร์ด)
5. **โฟกัสหลุดถ้าแยก `busy`/`disabled` ผิด:** 61 ปุ่มได้ `busy` · 18 ปุ่มต้องแยกเงื่อนไข · GB4 จับได้ทั้ง `src`
6. **ตำแหน่ง sticky ขึ้นกับ padding ของ `main`** (`-bottom-4 sm:-bottom-6`) และ G11b ยังมาจากการอ่านโค้ด · ต้องดูที่ 375/768/1024/1440 และ iPhone จริง · แก้ที่ไฟล์เดียวถ้าลอยหรือถูกตัด
7. **ความสูงเปลี่ยนทั้งจอ:** มือถือ 150 ช่องสูงขึ้น 4px และตัวอักษร 16px · จอใหญ่ 35 ช่องและ 55 ปุ่มเตี้ยลงเป็น 40 · ช่วง 640–767 ช่องและปุ่มที่สลับที่ `sm:` สูงขึ้น · เทียบภาพก่อนและหลังทุกหน้าของชุด 1
8. **ปุ่มที่กดไม่ได้เป็นสีเทาแทนสีจาง** (93 ปุ่ม) และ 12 ช่องได้ดอกจันใหม่ · ปุ่มบันทึกทรัพย์สินตอนตรวจรหัสซ้ำดู "ปิด" · ผู้ใช้เห็นต่างจากเดิมทันที
9. **pin ตามรูปแบบโค้ดและ CRLF:** format-on-save หรือ regex ใหม่ที่มี `\n` ทำ test พังเงียบ ๆ บนเครื่องนี้ · ข้อห้ามในตาราง D และข้อ 9.8
10. **ไฟล์ร่วมกับ 2B:** `asset-register-table.tsx`, bulk ×2, `audit-findings-batch-actions.tsx`, หน้า `assets/page.tsx`, `visual-foundation-guards.test.ts`, `DESIGN.md` · I28 ให้ plan 3–5 รอ 2B · ถ้า 2B เลื่อน แถบมือถือของหน้ารายละเอียดและ S1 เลื่อนตาม
11. **ข้อความใหม่ 34 key ลบ 4 key:** ต้องผ่าน `thai-glossary` และ `messages-parity` · คำอธิบายช่องไฟล์เปลี่ยนจากข้อความ "หลังเลือก" เป็น "ก่อนเลือก" (I14) ต้องอ่านบนจอจริง
12. **ตัวเลขผูกกับ `5ffee76` และยังไม่มี test ฐาน:** ไม่มีใครรัน `npm test` ที่ HEAD นี้ · guard ลองด้วยสคริปต์ `.mjs` เท่านั้น · งาน 0 ต้องจดฐานและรันสคริปต์ใหม่ถ้า `master` ขยับ

### 10.8 ตัวเลขที่ตรวจซ้ำ (ที่ `5ffee76`)

| ข้อความ | ที่มา | นับใหม่ | ผล |
|---|---|---|---|
| `AccessibleDialog` 23 จุดใน 19 ไฟล์ · ชุด 1 14 จุดใน 10 ไฟล์ (ทำ 13) | critic · ข้อ 5.1 · 8.6 | 23 / 19 · 14 / 10 | ตรง · ทำ 13 ตาม K12 |
| `SheetContent` 7 | ข้อ 5.1 | 7 | ตรง |
| `<Loader2` 93 ใน 60 ไฟล์ · ไฟล์ 2C 74 ใน 46 · ชุด 1 39 | critic · ข้อ 9.1 · 8.6 | 93 / 60 · 74 / 46 · 39 ใน 23 ไฟล์ | ตรง |
| `Loader2` เหลือหลัง 2C | ข้อ 6.5.3 (16/10) · ข้อ 9.1 (18/12) | ไม่ได้นับรายจุดซ้ำ | ใช้ 18/12 (I27) |
| `function Field` 25 ไฟล์ · `<Field` 197 | critic · ข้อ 4.1 | 25 · 198 รวม `ui/scanner-text-input.tsx:331` = 197 ของไฟล์ + 1 ของ 2A | ตรง |
| `flex-col-reverse` 10 บรรทัดใน 9 ไฟล์ | ข้อ 9.1 | 10 / 9 | ตรง |
| `step="0.01"` 14 ใน 8 ไฟล์ · มี `inputMode="decimal"` 3 | ข้อ 4.1 · 9.1 | 14 / 8 · `inputMode="decimal"` 4 ใน 3 ไฟล์ (เงิน 3 + ช่องตัวอย่างของ builder 1) | ตรง |
| ดอกจันแดง 32 / 25 · legend 6 / 4 · span ป้าย 48 / 35 · checkbox เก่า 46 / 25 · GF7 รวม 132 / 40 | ข้อ 4.16 · 9.1 | 32/25 · 6/4 · 48/35 · 46/25 · 132/40 · นอกไฟล์ 2C = 0 | ตรง |
| ตัวช่วยเก่า 8 ใน 7 ไฟล์ | ข้อ 9.1 | 8 / 7 | ตรง |
| `closeLabel={labels.cancel}` 2 | K10 | 2 (`IntegrationClientManager.tsx:395`, `system-settings-form.tsx:1352`) | ตรง |
| `FileDropzone` 17 ใน 14 ไฟล์ · `file={null}` 5 | critic · ข้อ 7.1 | 17 / 14 · 5 | ตรง |
| `confirm(` 13 จุดใน 11 hook · ไม่มี `confirmLabel` 4 | ข้อ 5.1, 5.9 | 13 (1 จุดขึ้นบรรทัดใหม่ `IntegrationClientManager.tsx:254`) · ขาด 4: `:193`, bulk-approval `:316`, bulk-execution `:481`, supplier `:93` | ตรง |
| `accent-primary` 3 · radio 3 | ข้อ 7.1 | 3 · 3 | ตรง |
| `toast.error(` 58 | critic | 58 | ตรง |
| route ที่ parse zod 61 ไฟล์ 71 จุด · 58 ไฟล์เรียก `errorResponse` + cancel 3 | ข้อ 8.5.1 | 61 · 71 · 58 | ตรง |
| K15 25 route → focus · `/maintenance/pm`, `/disposal/batches` → navigation | ข้อ 6.9 · 8 | ลอง regex กับ 79 route: เปลี่ยน 27 (25 + 2) · GL2 ผิด 27 → 0 | ตรง |
| K13 สลับป้าย 10 จุด (K13 เขียน 4) | ข้อ 6.5.2 | 10 ตามบรรทัดที่อ้าง | ข้อ 6 ถูก · decision text นับขาด |
| undeployed 56 commit | ข้อ 8.8 | `git rev-list --count ab1b873..5ffee76` = 56 · wiki อยู่ที่ `ams-status.md:36` (ข้อ 8 เขียน `:58`) | ตัวเลขตรง · บรรทัด wiki ผิด |
| sidebar ตอนพับ `layout/sidebar.tsx:291` | critic | `:292` | critic ผิด (ข้อ 6 ถูก) |
| แถบ `asset-form.tsx:1501-1516` | ข้อ 8.6 | `:1501-1517` | ข้อ 8 ผิด |
| room list segmented `:81-95` | ข้อ 8.3.1 | `:72-88` | ข้อ 8 ผิด (ข้อ 3 ถูก) |
| dialog bulk execution `:812-993` | critic O4 | ปิดที่ `:986` | critic ผิด (ข้อ 8 ถูก) |
| `operation-review-dialog.tsx` description/closeLabel `:11`, `:15` · `confirm-text-dialog.tsx` `:12`, `:17` | ข้อ 3.5 | ตรงตามที่อ้าง | ตรง |
| `ui/dialog.tsx:54`, `:80`, `:112`, `:120` · `ui/sheet.tsx:51`, `:64`, `:82` · `ui/alert-dialog.tsx:94` | ข้อ 3, 5 | ตรงตามที่อ้าง | ตรง |
| `ScannerTextInput` ส่ง `disabled` ให้ช่องข้อความ | ข้อ 4 ข้อตัดสินย่อย 5 | ไม่ส่ง: `disabled` อยู่แค่ปุ่มกล้อง | ข้อ 4 ถูก (I17) |
| `main` เป็นกล่องเลื่อนที่มี `py-4 sm:py-6` | ข้อ 6.8 | `layout/dashboard-shell.tsx:124` `overflow-y-auto px-4 py-4 sm:px-6 sm:py-6` | ตรง (I22) |
| key ใหม่ 34 ตัวไม่ชนกับ key เดิม | ข้อ 3.16 · 4.15 · 5.10 · 7.8 · 8.13 | ตรวจทุกตัวกับ `messages/th.json` และ `en.json`: ไม่มีตัวไหนมีอยู่ | ตรง |
| ช่อง 2C 273 (ข้อ 9) กับ 272 (ข้อ 4) · 35 ช่อง 44px (K7 36) · 12 ช่อง `required` ไม่มีดอกจัน · GF3 232 · GF5 111/97/7 | ข้อ 4.1 · 9.1 | ไม่ได้นับซ้ำ (ใช้สแกน AST ของข้อ 4 และตัวอ่านของข้อ 9) · 273 − 272 = `audit-scan-room-picker.tsx:75` | ไม่ขัดกัน |
