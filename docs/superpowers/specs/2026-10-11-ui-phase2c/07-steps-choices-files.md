> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2c-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** (I1–I36) · ตัวเลขและบรรทัดอ้างที่ `master` `5ffee76`

## 7. ขั้นตอน หัวข้อส่วน ตัวเลือกแบบการ์ด ช่องแนบไฟล์ และลายเซ็น

ส่วนนี้ทำ 6 เรื่องตามที่ผู้ใช้อนุมัติ (00-decisions):
- **K17** แถบขั้นตอน `Steps` แบบ "marker rail" ใช้ 3 ที่: นำเข้าทรัพย์สิน (S5), รายละเอียดคำขอตัดจำหน่าย (S1), ติดตั้งส่วนควบ 3 ขั้น
- **K18** หัวข้อส่วนแบบมีเลข `FormSection` แทน `FormStep` 2 ไฟล์ และ `WizardStep` ของหน้าตั้งค่า
- **K16 (ส่วนของตัวเลือก)** `ChoiceCard` สำหรับ R1–R3 · `ChoiceChip` สำหรับ T4–T6 · สถานะ "เลือกแล้ว" ของ P1 และ P3
- **Segmented ในฟอร์ม** T3 (T2 ทำใน P0) · แถบแท็บของหน้าตั้งค่า `system-settings-form.tsx:937-956` **ไม่แตะ** (O7)
- **K19** `FileDropzone` รับ `description` และ `id`/`aria-*` · `FileQueueList` ใหม่ · ช่องไฟล์ดิบของงานซ่อม 2 จุด
- **K25** ปุ่มล้างลายเซ็นของ `SignaturePad`

ทุกตัวเลขและ file:line ในส่วนนี้นับใหม่ที่ `master` `5ffee76` ด้วย grep และอ่านไฟล์จริง ไม่เพิ่ม token (I21) · class ทุกตัวใช้ token ที่มีอยู่แล้วใน `src/app/globals.css` (`border-soft`, `control-border`, `primary-soft`, `primary-hover`, `primary-border`, `success-soft`, `success-border`, `danger-soft`, `danger-border`, `faint-foreground`, `row-hover`, `input`) และ primitive ของ 2A

**ไม่อยู่ในส่วนนี้** (บอกเจ้าของแล้วหยุด):

| เรื่อง | เจ้าของ |
|---|---|
| `checkboxVariants` กับ checkbox อีก 46 ตัว และเป้ากด 12 จุดที่เล็กกว่า 44px (K16 ส่วนที่เหลือ) | ส่วนช่องกรอก |
| class ของ `FieldLabel` ที่ export ให้ `<legend>` (K27) และ legend 2 ตัวใน `IntegrationClientManager.tsx:412, :485` | ส่วนช่องกรอก · ส่วนนี้แค่ใช้ค่าที่ export (เรียกในเอกสารนี้ว่า `fieldLabelClasses`) |
| `function Field` ของแต่ละไฟล์ → `Field` ของ 2A (รวม checkout, checkin, repair, disposal) | ส่วนช่องกรอก · ส่วนนี้กำหนดแค่ว่าลูกของ `Field` ที่ห่อช่องไฟล์คืออะไร |
| ช่องค้นหา `bulk-move-form.tsx:88-95`, `disposal-asset-picker.tsx:58` (K21) · select ประเภทรูป `checkin-form.tsx:494`, `audit-scan-check-form.tsx:283-295`, `asset-attachments.tsx:263-271` (K20/K21) | ส่วนช่องกรอก |
| ปุ่มเดินหน้า/ถอยในขั้นติดตั้งส่วนควบ (`asset-component-manager.tsx:374, :377, :400, :403`) · 3 ปุ่มของแผงนำเข้า (`:112, :209, :387`) · ปุ่ม `batchReview` (`disposal-batch-form.tsx:122`) · K13 เลิกสลับป้าย | ส่วนปุ่ม |
| ส่วนท้าย dialog ของ `repair-record-actions.tsx` (K9) | ส่วน dialog |
| `ui/segmented.tsx` และการแปลง T2 (`system-settings-form.tsx:2543-2563`) | งาน P0 (K2) |
| `FormContextBanner` (`checkout-form.tsx:272`, K24) · หน่วยในป้ายของช่องเงิน (K26) | ส่วนช่องกรอก |
| คำเตือนรูปจำเป็นที่โชว์ตอนส่วนแนบรูปปิดอยู่ (`audit-scan-check-form.tsx:335-339`) · error ใต้ช่องไฟล์ | V track (K4, K5) |
| `ActionBar` ของหน้ารายละเอียดตัดจำหน่าย (batch 5) | ส่วนแถบล่าง (K23) |
| ขั้นตอนแบบ "กรอก → ยืนยัน" อีก 7 ที่ (ชุดตัดจำหน่าย, ชุดทรัพย์สิน, dialog ทบทวน 3 ตัว, dialog รวม 2 ตัว) | ไม่ใส่ `Steps` (K17 ระบุแค่ 3 ที่) |

### 7.1 สภาพที่ `5ffee76`

| เรื่อง | ค่า | ที่มา |
|---|---|---|
| ตัวแสดงขั้นตอน | 5 แบบใน 5 ไฟล์ · เรียก 15 จุด: `DisposalWorkflowStepper` 1 · `WizardStep` 8 (ตั้งค่า 7 + นำเข้า 1 ที่ map 5 ขั้น) · `FormStep` 6 | grep `<(FormStep\|WizardStep\|DisposalWorkflowStepper)\b` |
| `aria-current="step"` | 1 (`disposal-workflow-stepper.tsx:46`) | grep |
| หัวข้อแบบมีเลขที่ดูเหมือน "ขั้นปัจจุบัน" ทุกอัน | 13 จุด วงกลมพื้น `bg-primary` ตัวเลข `text-white` | `disposal-request-form.tsx:224` · `disposal-batch-form.tsx:129` · `system-settings-form.tsx:2350` |
| radio ในฟอร์ม | 3 tag (R1 `checkout-form.tsx:248` · R2 `repair-record-form.tsx:268` ใน `Choice` ที่เรียก 4 ครั้ง · R3 `repair-record-actions.tsx:132`) · ทั้ง 3 ใส่ `accent-primary` ซ้ำกับ `accent-color` ของ `:root` | grep `type="radio"` |
| ปุ่มสลับที่ไม่มีสถานะให้ screen reader | T3 `asset-create-workspace.tsx:21, :30` · T5 `asset-form.tsx:1325` · T6 `depreciation-policy-builder.tsx:212` · P1 `bulk-move-form.tsx:104` · P3 `asset-component-manager.tsx:484` | อ่านโค้ด |
| `FileDropzone` | 17 จุดใน 14 ไฟล์ · 5 จุด `file={null}` ซึ่ง `hint` ไม่เคยแสดง (`file-dropzone.tsx:118`) | grep |
| ป้ายซ้อนป้าย | 1 จุด: `checkout-form.tsx:306` (`Field` ของไฟล์คือ `<label>` ที่ `:406-416`) | อ่านโค้ด |
| ช่องไฟล์ดิบ | 2 จุด: `repair-record-form.tsx:217-223` · `repair-record-actions.tsx:148` (+ ช่อง `.xlsx` ที่ซ่อนของแผงนำเข้า `asset-import-preview-panel.tsx:202-208` คงไว้) | grep `type="file"` |
| รายการไฟล์ที่รอแนบ | 3 แบบ: ปุ่มข้อความ "ลบ" (`disposal-request-form.tsx:196-202`) · X สีแดง (`disposal-batch-form.tsx:121`) · Trash2 + sr-only (`checkin-form.tsx:510-527`) | อ่านโค้ด |
| `SignaturePad` | 3 จุด (`checkout-form.tsx:320` · `checkin-form.tsx:531, :538`) · ไม่มี test | grep |

แผนที่ที่ต้องแก้ตัวเลข:
- `steppers.md` ให้ช่องไฟล์ของ repair เป็น `:218-224` ที่จริงเปิด tag ที่ `:217` (critic K19 ถูก)
- `steppers.md` ให้ R1 เป็น `:230-268` ที่จริง `<fieldset>` ปิดที่ `:269`
- **สิ่งที่แผนที่ไม่ได้บอก:** แถวที่เลือกแล้วของ P3 (`selectedId === candidate.id ? "bg-primary-soft"`) ไม่เคยเห็นจริง เพราะ `selectComponent` (`:169-174`) เปลี่ยนไปขั้น `details` ทันที และ `CandidateList` แสดงเฉพาะขั้น `identify` (`:275`)
- **สิ่งที่แผนที่ไม่ได้บอก:** ลำดับขั้นของ S1 ตอนนี้ให้ "คำขอ" เป็นขั้นปัจจุบันตอนสถานะ `pending` แต่คำขอที่อยู่ในหน้ารายละเอียดยื่นแล้วเสมอ (สถานะมีแค่ `pending` / `approved` / `rejected` / `disposed` ค่าเริ่มคือ `pending` ที่ `prisma/schema.prisma:882`) ดูข้อ 7.2.4

### 7.2 `Steps` (K17)

#### 7.2.1 ไฟล์และ API

`src/lib/step-states.ts` (ใหม่) เป็น TS ล้วน ไม่มี React และไม่ import ผ่าน `@/` เพื่อให้ test ของ node import ได้ตรง (แบบ `asset-import-wizard.ts`)

```ts
export type StepState = "complete" | "current" | "upcoming" | "rejected"
export type StepOutcome = "in_progress" | "complete" | "rejected"
export function getLinearStepStates(count: number, currentIndex: number, outcome: StepOutcome = "in_progress"): StepState[]
export function getStepFocusIndex(states: readonly StepState[]): number
```

- `currentIndex` ถูกบีบให้อยู่ใน `0 … count - 1`
- `in_progress`: ก่อนหน้า `complete` · ตัวที่ `currentIndex` เป็น `current` · หลังจากนั้น `upcoming`
- `rejected`: ก่อนหน้า `complete` · ตัวที่ `currentIndex` เป็น `rejected` · หลังจากนั้น `upcoming`
- `complete`: ทุกขั้นเป็น `complete` และไม่มีขั้นปัจจุบัน
- `getStepFocusIndex`: ขั้นแรกที่เป็น `current` หรือ `rejected` · ถ้าเสร็จทุกขั้นคืนขั้นสุดท้าย · อย่างอื่นคืน 0

`src/components/ui/steps.tsx` (ใหม่) ไม่มี directive · hook ตัวเดียวคือ `useTranslations("common")` (แบบ `breadcrumbs.tsx` และ `nil.tsx` ของ 2A) จึงใช้ได้ทั้งหน้า server (S1) และ client (S5, ติดตั้งส่วนควบ)

```ts
export type StepItem = { id: string; label: string; state: StepState }
export function Steps(props: { label: string; steps: readonly StepItem[]; className?: string })
```

- `label` = ชื่อของ `<ol>` (`aria-label`)
- คำนำหน้าสถานะและบรรทัด "ขั้นที่ x จาก y" มาจาก `common.*` ในตัว ผู้เรียกไม่ต้องส่ง

#### 7.2.2 โครงและ class

```tsx
<div data-slot="steps" className={className}>
  <ol aria-label={label} className="flex items-start gap-2">
    <li aria-current={state === "current" ? "step" : undefined} className="flex min-w-0 flex-1 items-start gap-2 last:flex-none">
      <span aria-hidden="true" className={cn(markerBase, markerByState[state])}>{glyph}</span>
      <span className={cn("min-w-0 pt-px text-meta max-md:sr-only", labelByState[state])}>
        <span className="sr-only">{stateWord}: </span>{label}
      </span>
      {/* ทุก li ยกเว้นตัวสุดท้าย */}
      <span aria-hidden="true" className={cn("mt-2.75 h-px min-w-3 flex-1", state === "complete" ? "bg-success-border" : "bg-border")} />
    </li>
  </ol>
  <p aria-hidden="true" className="mt-2 text-meta text-faint-foreground md:hidden">
    <span className="num">{t("stepOf", { current: focus + 1, total })}</span> · <span className={labelByState[focusState]}>{focusLabel}</span>
  </p>
</div>
```

| ส่วน | class |
|---|---|
| `markerBase` (22px ตาม `.check .mark` ของต้นแบบ `base.css:405-409`) | `inline-flex size-5.5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold num` |
| marker `complete` | `border-success-border bg-success-soft text-success` + `<Check className="size-3.5" strokeWidth={2.75} />` |
| marker `current` | `border-primary bg-primary-soft text-primary-hover` + เลขขั้น (9.14:1) |
| marker `upcoming` | `border-control-border bg-surface text-faint-foreground` + เลขขั้น (5.77:1) |
| marker `rejected` | `border-danger-border bg-danger-soft text-danger` + `<X className="size-3.5" strokeWidth={2.75} />` |
| ป้าย `complete` | `text-muted-foreground` |
| ป้าย `current` | `font-semibold text-foreground` |
| ป้าย `upcoming` | `text-faint-foreground` |
| ป้าย `rejected` | `font-medium text-danger` (6.54:1) |
| คำนำหน้า (sr-only) | `common.stepComplete` / `stepCurrent` / `stepUpcoming` / `stepRejected` ตามด้วย ": " แบบ `.vh` ของต้นแบบ (`screens/audit-round.html:204`) |

- รูปบอกสถานะ ไม่ใช่สีอย่างเดียว: เลข = ยังไม่เสร็จ · ติ๊ก = เสร็จ · X = ถูกปฏิเสธ
- `aria-current="step"` มีได้ขั้นเดียว · เสร็จทุกขั้นหรือถูกปฏิเสธแล้ว = ไม่มีขั้นไหนเป็น current
- class ของแต่ละสถานะเป็น string แยกกัน ห้ามรวม `bg-*-soft` กับ `text-faint-foreground` ใน string เดียว (guard `visual-foundation-guards.test.ts:194-198`)
- `mt-2.75` (11px) ให้เส้นเชื่อมอยู่กลาง marker 22px · `pt-px` ให้บรรทัด 20px ของ `text-meta` อยู่กลาง marker · Tailwind 4.2.4 รับค่าที่หาร 0.25 ลงตัว (`Qr(e,.25)` ใน `dist/lib.js`)
- ไม่มีกรอบของตัวเอง วางในแผงหรือส่วนที่มีอยู่ด้วย `className="mt-4"`
- ขั้นไม่ใช่ลิงก์และไม่ใช่ปุ่ม ห้ามทำให้ดูเหมือน `TabNav`

#### 7.2.3 จอแคบกว่า `md`

- ป้ายทุกขั้นใน rail เป็น `max-md:sr-only` เหลือแค่ marker กับเส้นเชื่อม · 5 ขั้นกว้างอย่างน้อย 5 × 22 + 4 × (8 + 12) + 4 × 8 = 222px อยู่ในความกว้างด้านใน 283px ที่ 375 (ป้ายที่เป็น `sr-only` เป็น `absolute` จึงไม่กินที่ใน flex)
- บรรทัดใต้ rail (`md:hidden`) บอก "ขั้นที่ {x} จาก {y} · {ชื่อขั้น}" ของขั้นที่ `getStepFocusIndex` คืน (ขั้นปัจจุบัน ขั้นที่ถูกปฏิเสธ หรือขั้นสุดท้ายเมื่อเสร็จหมด)
- บรรทัดนี้เป็น `aria-hidden` เพราะ `<ol>` อ่านชื่อทุกขั้นพร้อมสถานะให้แล้ว

#### 7.2.4 ใช้ 3 ที่

**S5 นำเข้าทรัพย์สิน** (batch 4 · `assets/asset-import-preview-panel.tsx`)

| ที่ | เดิม | ใหม่ |
|---|---|---|
| `:220-231` | `<div className="mt-4 grid gap-2 md:grid-cols-5">` + `WizardStep` 5 ตัว | `<Steps className="mt-4" label={labels.wizardTitle} steps={importSteps} />` |
| ใน component | — | `const importStates = getLinearStepStates(assetImportWizardSteps.length, assetImportWizardSteps.indexOf(wizardStep), wizardStep === "complete" ? "complete" : "in_progress")` แล้ว map เป็น `{ id: step, label: wizardStepLabel(step, labels), state: importStates[index] }` |
| `:402-436` | `function WizardStep` | ลบ · `wizardStepLabel` (`:438`) คงไว้ · `CheckCircle2` ยังใช้ที่ `:306, :369` |
| `:58` (type) | `currentStep: string` | ลบ · ลบ `currentStep: t("importWizardCurrentStep")` ใน `asset-management/import-export/page.tsx:82` และ `assets/page.tsx:451` · ลบ key `asset.importWizardCurrentStep` |

ผลที่เห็น: จอแคบเดิมมีกล่อง 5 กล่องซ้อนกัน (ประมาณ 250px) เหลือ rail 1 แถว + 1 บรรทัด · ตอนนำเข้าเสร็จ ขั้น "เสร็จสิ้น" เป็นติ๊กสีเขียว ไม่ใช่สี primary แบบเดิม

**S1 รายละเอียดคำขอตัดจำหน่าย** (batch 5 หลัง 2B merge · O12: 2C เป็นเจ้าของ component, 2B แค่วาง)

`disposal/disposal-workflow-stepper.tsx` เหลือเป็นตัวแปลงบาง ๆ ชื่อไฟล์และชื่อ export คงเดิม (`disposal-detail-workspace.test.ts:9, :12`)

```ts
type DisposalWorkflowStepperProps = {
  stage: DisposalStage
  currentStageLabel: string
  ownerRoleLabel: string
  ownerLabel: string
  stepsLabel: string                                        // ใหม่: ชื่อของ <ol>
  labels: { request: string; decision: string; execution: string }
}
const currentStepByStage: Record<DisposalStage, number> = { pending_approval: 1, awaiting_execution: 2, complete: 2, rejected: 1 }
const outcomeByStage: Record<DisposalStage, StepOutcome> = { pending_approval: "in_progress", awaiting_execution: "in_progress", complete: "complete", rejected: "rejected" }
```

- กรอบ `section` (`:34`) และแถวสถานะ + ผู้รับผิดชอบ (`:35-38`) คงไว้ (K28)
- `:39-67` (`<ol className="mt-4 grid grid-cols-3 gap-2">` …) → `<Steps className="mt-4" label={stepsLabel} steps={…} />` · `Check`, `Circle`, `XCircle` และ `text-white` หายไปจากไฟล์
- **ลำดับขั้นเปลี่ยน:** เดิม `pending_approval: 0, awaiting_execution: 1` ใหม่ `1` และ `2` เพราะชื่อขั้นเปลี่ยนจาก "รายละเอียดคำขอ…" เป็นชื่อการกระทำ และคำขอที่เปิดดูได้ยื่นแล้วเสมอ

| สถานะคำขอ | ยื่นคำขอ | พิจารณา | ตัดจำหน่ายจริง |
|---|---|---|---|
| `pending` | complete | **current** | upcoming |
| `approved` | complete | complete | **current** |
| `disposed` | complete | complete | complete (ไม่มี current) |
| `rejected` | complete | **rejected** (ไม่มี current) | upcoming |

หน้า `disposal/[id]/page.tsx:205-215`: ส่ง `stepsLabel={t("workflowStepsLabel")}` และ `labels={{ request: t("workflowSteps.request"), decision: t("workflowSteps.decision"), execution: t("workflowSteps.execution") }}` · หัวการ์ด `:236, :261, :271` ยังใช้ `requestDetail` / `decisionDetail` / `executionDetail` ตามเดิม

**ติดตั้งส่วนควบ 3 ขั้น** (batch 1e · `assets/asset-component-manager.tsx`)

- `ManagerLabels` (`:58-100`) เพิ่ม `steps: { label: string; identify: string; details: string; review: string }` · หน้า `assets/[id]/components/page.tsx:91-152` ส่ง `steps: { label: t("componentInstallSteps"), identify: t("componentStepIdentify"), details: t("componentStepDetails"), review: t("componentStepReview") }`
- วาง `<Steps className="mb-4" label={labels.steps.label} steps={installSteps} />` ระหว่างหัวส่วน (`:267-273`) กับเนื้อหาของขั้น (`:275`)
- `installSteps` มาจาก `getLinearStepStates(3, installStepOrder.indexOf(installStep))` โดย `const installStepOrder: readonly InstallStep[] = ["identify", "details", "review"]`
- `type InstallStep = "identify" | "details" | "review"` (`:35`) คงตามตัวอักษร (`asset-component-manager.test.ts:27`)
- ปุ่มถอยในขั้นตรวจสอบ (`:400-402`) เปลี่ยนข้อความจาก `labels.cancel` เป็น `labels.back` (ปุ่มนั้นย้อนไปขั้น `details` ไม่ได้ยกเลิก) · การแปลงเป็น `Button` เป็นของส่วนปุ่ม

### 7.3 `FormSection` (K18)

`src/components/ui/form-section.tsx` (ใหม่) ไม่มี directive ไม่มี hook

```ts
export function FormSection(props: {
  number?: number
  title: React.ReactNode
  as?: "h2" | "h3"            // ค่าตั้งต้น "h2"
  className?: string
  children?: React.ReactNode
})
```

- **ไม่มี `children`:** คืนแถวหัวข้ออย่างเดียว (`data-slot="form-section-heading"`, `className` ต่อท้าย) ใช้ในฟอร์มที่วางหัวข้อเป็นแถวหนึ่งใน grid
- **มี `children`:** คืน `<div data-slot="form-section" className={className}>` → แถวหัวข้อ (เพิ่ม `mb-4`) → `children` · ใช้ `div` ไม่ใช้ `<section>` ที่มีชื่อ เพื่อไม่ให้หน้าตั้งค่ามี landmark "region" 7 อัน

| ส่วน | class |
|---|---|
| แถวหัวข้อ | `flex items-center gap-2.5 border-b border-border-soft pb-2.5` |
| marker (แสดงเมื่อมี `number` · `aria-hidden="true"`) | `inline-flex size-5.5 shrink-0 items-center justify-center rounded-full border border-control-border text-xs font-semibold text-muted-foreground num` |
| `h2` | `text-base font-semibold text-foreground` (= `t-section` 16/24 ของต้นแบบ) |
| `h3` | `text-sm font-semibold text-foreground` (หน้าตั้งค่า ซึ่งมี `h2` ของ `SectionHeader` `:2789-2796` อยู่เหนือ) |

ไม่มีหน้าตา "ขั้นปัจจุบัน" · marker ใช้หน้าตาของ upcoming ใน `Steps` แต่ตัวเลขเป็น `text-muted-foreground` (7.14:1)

จุดที่เปลี่ยน (13 จุด · ลบ helper 3 ตัว):

| ไฟล์ | เดิม | ใหม่ | batch |
|---|---|---|---|
| `disposal/disposal-request-form.tsx:110, :128, :178` | `<FormStep number={n} title={…} />` | `<FormSection number={n} title={…} className="md:col-span-2" />` | 1c |
| `disposal-request-form.tsx:223-225` | `function FormStep` | ลบ | 1c |
| `disposal/disposal-batch-form.tsx:100, :112, :119` | `<FormStep …/>` | `<FormSection number={n} title={…} />` | 1c |
| `disposal-batch-form.tsx:129` | `function FormStep` | ลบ | 1c |
| `admin/system-settings-form.tsx:1706, :1773, :1815, :1859, :1905, :1938, :1986` (ปิดที่ `:1771, :1813, :1847, :1903, :1936, :1984, :2013`) | `<WizardStep number={n} title={…}>…</WizardStep>` | `<FormSection as="h3" number={n} title={…}>…</FormSection>` | 1f |
| `system-settings-form.tsx:2347-2359` | `function WizardStep` (การ์ด `rounded-md border border-border bg-background p-4`) | ลบ · การ์ดชั้นที่ 3 หายไป | 1f |
| `system-settings-form.tsx:1705` · `:1855` | `space-y-5 px-4 py-4` · `space-y-4 px-4 py-4` | `space-y-6 px-4 py-4` ทั้งคู่ (ส่วนไม่มีกรอบแล้ว ระยะ 24px แยกส่วน) | 1f |

แผงนอก (`:1703` `overflow-visible rounded-lg border border-border bg-surface`) ไม่แตะ จึงผ่าน `settings-ldap-role-ui.test.ts:20-21` ต่อ (K28)

### 7.4 ตัวเลือกในฟอร์ม: `ChoiceCard` / `ChoiceChip` (K16)

#### 7.4.1 ไฟล์และ API

`src/components/ui/choice-card.tsx` (ใหม่) มี `"use client"` เพราะมีตัวจัดการปุ่ม Enter ในตัว (ข้อ 7.4.2) และ `useId`

```ts
type ChoiceInputProps = Omit<React.ComponentProps<"input">, "type" | "size" | "className" | "children">
export function ChoiceCard(props: ChoiceInputProps & { type: "radio" | "checkbox"; label: React.ReactNode; description?: React.ReactNode; className?: string })
export function ChoiceChip(props: ChoiceInputProps & { type: "radio" | "checkbox"; label: React.ReactNode; detail?: React.ReactNode; className?: string })
export function preventEnterSubmit(event: React.KeyboardEvent<HTMLInputElement>): void
```

- `<label>` ห่อ `<input>` ของเบราว์เซอร์ (`checked`, `name`, `value`, `required`, `disabled`, `onChange` ส่งต่อให้ input)
- input ใช้ `checkboxVariants({ size: "md" })` · สีมาจาก `accent-color` · วงโฟกัสมาจาก `:focus-visible` ใน base · **ไม่มี** `accent-primary` และ `focus-within:ring-*` ที่ label
- input **แสดงเสมอ** ทั้งการ์ดและ chip สถานะจึงไม่ได้บอกด้วยสีพื้นอย่างเดียว
- ชื่อที่ screen reader อ่าน = `label` (`aria-labelledby` ชี้ span ของ label) · `description` / `detail` อ่านเป็นคำอธิบาย (`aria-describedby` รวมกับค่าที่ผู้เรียกส่งมา)
- `className` ใส่ที่ `<label>` (ใช้จัดวางเท่านั้น)

| ส่วน | class |
|---|---|
| `ChoiceCard` `<label>` | `flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-control-border bg-surface px-3 py-2.5 text-sm text-foreground transition-colors motion-reduce:transition-none hover:border-input has-checked:border-primary has-checked:bg-primary-soft has-disabled:cursor-not-allowed has-disabled:border-border has-disabled:bg-background has-disabled:text-faint-foreground` |
| `ChoiceCard` input | `cn(checkboxVariants({ size: "md" }), "mt-0.5")` |
| `ChoiceCard` label / description | `<span className="grid min-w-0 gap-0.5">` → `<span className="font-medium">` / `<span className="text-meta text-muted-foreground">` (7.20:1 บน primary-soft) |
| `ChoiceChip` `<label>` | `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-control-border bg-surface px-3 py-1 text-sm text-foreground transition-colors motion-reduce:transition-none hover:border-input md:min-h-8 has-checked:border-primary-border has-checked:bg-primary-soft has-checked:text-primary-hover has-disabled:cursor-not-allowed has-disabled:border-border has-disabled:bg-background has-disabled:text-faint-foreground` |
| `ChoiceChip` input | `checkboxVariants({ size: "md" })` |
| `ChoiceChip` detail | `<span className="text-meta text-faint-foreground">` (4.99:1 บน primary-soft ตาม I14) |

- มุม: การ์ดเป็นพื้นที่ใหญ่ใช้ `rounded-md` 8px · chip ใช้ `rounded-control` 6px (I15)
- สูง: ใต้ `md` อย่างน้อย 44 ทั้งคู่ · ตั้งแต่ `md` chip 32 เท่าปุ่ม `sm` · การ์ดคง 44 ขึ้นไป
- ลำดับ variant ของ Tailwind 4.2.4: `hover` → `has` · `has-checked` ชนะ `hover:` · `has-disabled` มาหลัง `has-checked` จึงชนะเมื่อเป็นทั้งคู่
- ใช้ `has-checked:` แบบเดียวกับ `asset-register-mobile-list.tsx:92`

#### 7.4.2 Enter ห้าม submit ฟอร์ม

ใน Chromium กด Enter ที่ checkbox หรือ radio ในฟอร์มที่มีปุ่ม submit จะ submit ฟอร์ม (implicit submission) · T4, T5, T6 และ P1 ตอนนี้เป็นปุ่ม `type="button"` ที่ Enter แค่สลับค่า · ถ้าเปลี่ยนเป็น input เฉย ๆ Enter บน T6 จะบันทึกฟอร์มตั้งค่าทั้งหน้า (`system-settings-form.tsx:936`) และ Enter บน T5 จะบันทึกทรัพย์สิน (`asset-form.tsx:838`)

```ts
export function preventEnterSubmit(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") event.preventDefault()
}
```

- `ChoiceCard` และ `ChoiceChip` เรียกตัวนี้ทุกครั้ง หลังเรียก `onKeyDown` ของผู้เรียก
- แถว P1 ใส่ `onKeyDown={preventEnterSubmit}` เอง
- Space ยังสลับค่าได้ตามปกติ · R1–R3 (radio เดิม) จึงเปลี่ยนพฤติกรรมด้วย: Enter บน radio ไม่ submit อีกต่อไป

#### 7.4.3 การ์ด (R1–R3)

legend ของทั้ง 3 กลุ่ม: `<legend className={cn(fieldLabelClasses, "mb-1.5")}>{…}<span aria-hidden="true" className="ml-1 text-warning">*</span></legend>` · `<fieldset className="min-w-0">` (กัน fieldset ขยายตามเนื้อหา)

| # | ที่ | เปลี่ยน | batch |
|---|---|---|---|
| R1 | `asset-operations/checkout-form.tsx:230-269` | legend `:231-234` ตามด้านบน · `:235` `grid gap-3 sm:grid-cols-2` → `grid gap-2 sm:grid-cols-2` · `:242-265` `<label …>` + `<input type="radio" …>` → `<ChoiceCard type="radio" name="handoverModeChoice" value={mode} checked={values.handoverMode === mode} required label={label} description={help} onChange={…} />` (คง `required` ตาม K4 a และคง `onChange` เดิมที่ล้าง `expectedReturnDate`) · `rounded-lg`, `min-h-16`, `p-3`, `focus-within:ring-*` และ `accent-primary` หายไป | 1b |
| R2 | `maintenance/repair-record-form.tsx:146-154`, `:156-164` | legend `:147-149`, `:157-159` ตามด้านบน · `<Choice …/>` 4 จุด (`:151, :152, :161, :162`) → `<ChoiceCard type="radio" name="done"…/>` / `name="outcome"` · ลบ `function Choice` (`:261-272`) | 1a |
| R3 | `maintenance/repair-record-actions.tsx:127-137` | legend `:128` ตามด้านบน · `:131-134` → ``<ChoiceCard type="radio" name="outcome" checked={complete.outcome === outcome} label={t(`outcome.${outcome}`)} onChange={…} />`` | 1a |

R2 และ R3 มีค่าตั้งต้นเสมอ (`done: true`, `outcome: "usable"` ที่ `repair-record-form.tsx:49-50`, `repair-record-actions.tsx:46`) ดอกจันจึงเป็นแค่สัญลักษณ์บนจอ

#### 7.4.4 chip (T4–T6)

| # | ที่ | เปลี่ยน | batch |
|---|---|---|---|
| T4 | `assets/asset-batch-form.tsx:806-824` + `BatchOptionalColumnToggle` `:1106-1136` | กล่อง `:806` คงไว้ (K28) · `:807-813` → `<fieldset className="min-w-0" aria-describedby={optionalColumnsHelpId}>` + `<legend className={fieldLabelClasses}>{t("batchOptionalColumns")}</legend>` + `<p id={optionalColumnsHelpId} className="mt-1 text-meta text-faint-foreground">{t("batchOptionalColumnsHelp")}</p>` + `<div className="mt-3 flex flex-wrap gap-2">` · ชื่อ `BatchOptionalColumnToggle` และ props คงเดิม ข้างในเป็น `<ChoiceChip type="checkbox" checked={active} onChange={onClick} label={label} detail={count > 0 ? <span className="num">{count}</span> : undefined} />` · pill ตัวนับ (`rounded-full bg-background px-2 py-0.5`) หายไป | 1e |
| T5 | `assets/asset-form.tsx:1311-1344` | กล่อง `:1311` คงไว้ · หัว `:1312-1317` → `<fieldset className="min-w-0" aria-describedby={photoLabelHintId}>` + `<legend className={fieldLabelClasses}>{t("selectPhotoType")}</legend>` + `<p id={photoLabelHintId} className="mt-1 text-meta text-faint-foreground">{t("autoPhotoLabelHint", …)}</p>` · ปุ่ม `:1325-1340` → `<ChoiceChip type="radio" name={photoLabelRadioName} checked={isSelected} onChange={() => setPhotoLabel(item)} label={item} detail={<span className={alreadyExists \|\| isQueued ? "text-success" : undefined}>{…ครบแล้ว/อยู่ในคิวแล้ว/ยังไม่มีรูป…}</span>} />` (`text-success` บน primary-soft 4.67:1) · `photoLabelRadioName` จาก `useId()` | 1e |
| T6 | `admin/depreciation-policy-builder.tsx:199-226` | `h3` `:201` คงไว้ (เป็นหัวข้อ มีปุ่มเพิ่มกลุ่มข้าง ๆ) ใส่ `id={groupsHeadingId}` · `:207` `<div className="flex flex-wrap gap-2">` ได้ `role="radiogroup" aria-labelledby={groupsHeadingId}` เฉพาะเมื่อมีกลุ่ม (ข้อความ "ไม่มีกลุ่ม" `:209` อยู่นอก radiogroup) · ปุ่ม `:212-223` → `<ChoiceChip type="radio" name={groupRadioName} checked={activeGroup?.id === group.id} disabled={!isPolicyJsonValid} onChange={() => setActiveGroupId(group.id)} label={group.name} detail={<span className="num">{group.categoryIds.length} / {categories.length}</span>} />` | 1f |

T4 คงพฤติกรรมเดิม: chip เป็น checked เมื่อ `visibleRowColumns[key] || rowOverrideCounts[key] > 0` (`:818`) กดเอาออกตอนยังมีค่ารายแถวแล้ว chip ยัง checked อยู่ (ความเสี่ยงข้อ 9)

#### 7.4.5 รายการเลือก (P1–P3)

| # | ที่ | เปลี่ยน | batch |
|---|---|---|---|
| P1 | `asset-operations/bulk-move-form.tsx:97-118` | ป้าย `:84-87` ได้ `id={assetsLabelId}` · กล่อง `:97` → `max-h-72 overflow-y-auto rounded-md border border-border bg-surface` + `role="group" aria-labelledby={assetsLabelId}` · ปุ่ม `:104-114` → `<label key={asset.id} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border-soft px-3 text-sm last:border-b-0 hover:bg-row-hover has-checked:bg-primary-soft"><input type="checkbox" checked={checked} onChange={() => toggleAsset(asset.id)} onKeyDown={preventEnterSubmit} className={checkboxVariants()} /><span className="min-w-0 truncate">{asset.label}</span></label>` · กล่องติ๊กที่วาดเอง 20px (`:110-112`) และ import `Check` หายไป | 1b |
| P2 | `disposal/disposal-asset-picker.tsx:60` | ความหมายถูกแล้ว (`role="option"` + `aria-selected`) เปลี่ยนแค่กล่องที่วาด 20px เป็นแบบ `.cbox` ของเมนู (`ui/dropdown-menu.tsx:149-157`): `<span aria-hidden="true" className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border-[1.5px]", active ? "border-primary bg-primary" : option.eligible ? "border-input bg-surface" : "border-border bg-background")}>{active ? <Check strokeWidth={3} className="size-3 text-primary-foreground" /> : null}</span>` | 1c |
| P3 | `assets/asset-component-manager.tsx:484-495` | เพิ่ม `aria-pressed={selectedId === candidate.id}` ให้หน้าตา `bg-primary-soft` กับความหมายตรงกัน · ไม่เพิ่มพฤติกรรม (แถวที่เลือกแทบไม่เคยแสดง ดูข้อ 7.1) | 1e |

### 7.5 `Segmented` ในฟอร์ม (T2, T3)

`ui/segmented.tsx` สร้างในงาน P0 บน master (K2) จากสูตรที่ guard ยึดไว้ (`visual-foundation-guards.test.ts:280-289`) · ชื่อ prop ข้างล่างเขียนตามข้อเสนอของแผนที่ (`label` / `value` / `onValueChange` / `options` / `fill`) **ถ้า P0 ตั้งชื่อต่าง ให้ใช้ของ P0**

| # | ที่ | ทำใน | ผล |
|---|---|---|---|
| T2 | `admin/system-settings-form.tsx:2543-2563` (`LabelAssetNameModeField`) | P0 | ปุ่มสูง 44 ใต้ `md` (เดิม 32 ทุกความกว้าง) · ส่วนนี้ไม่แตะซ้ำ · P0 ต้องคง `<LabelAssetNameModeField … label={labels.compactLabelAssetName}` (`asset-label-print-ui.test.ts:48`) |
| T3 | `assets/asset-create-workspace.tsx:20-39` | batch 4 | ปุ่มเขียนเอง 2 ปุ่ม (`h-9 rounded` + `bg-primary text-white` ไม่มี `aria-pressed` ไม่มีชื่อกลุ่ม) → `<Segmented label={t("createModeLabel")} value={mode} onValueChange={setMode} options={[{ value: "single", label: t("createModeSingle") }, { value: "batch", label: t("createModeBatch") }]} />` · ไม่ใช้ `fill` (2 ตัวเลือกสั้นพอที่ 375) · คง `props.cloneSource` และ `<AssetForm {...props} />` (`asset-clone-ui.test.ts:33-34`) |

แถบแท็บ 11 ปุ่มของหน้าตั้งค่า (`system-settings-form.tsx:937-956`) **ไม่แตะในส่วนนี้** (O7) · เปลี่ยนเป็น `TabNav` ของ 2B ทีหลัง

### 7.6 ช่องแนบไฟล์ (K19)

#### 7.6.1 `FileDropzone` (`ui/file-dropzone.tsx`, 2C-0)

```ts
export function FileDropzone(props: {
  file: File | null
  onFileChange: (file: File | null) => void
  onFilesChange?: (files: File[]) => void        // คงตามตัวอักษร (audit-scan-search-ui.test.ts:154)
  disabled?: boolean
  accept?: string
  capture?: "user" | "environment"
  multiple?: boolean                             // คงตามตัวอักษร (:153)
  title: string
  hint?: string                                  // เดิมบังคับ · แสดงหลังเลือกไฟล์แล้ว (โหมดไฟล์เดียว) ถ้าไม่มีใช้ browseLabel
  description?: React.ReactNode                  // ใหม่ · แสดงเสมอ
  browseLabel: string
  optimizeImages?: boolean
  id?: string                                    // ใหม่ · Field ส่ง id มา
  "aria-describedby"?: string                    // ใหม่ · hint/error ของ Field
  "aria-invalid"?: boolean | "true" | "false"    // ใหม่ · V track ใช้
  "aria-required"?: boolean | "true" | "false"   // รับไว้ให้ type ของ Field ผ่าน แต่ไม่ส่งต่อ (ข้อตัดสินย่อย 22)
})
```

โครงใหม่:

```tsx
const generatedId = useId()
const inputId = id ?? generatedId
const statusId = `${inputId}-status`
const descriptionId = description ? `${inputId}-description` : undefined
const optimizeId = showImageOptimizationHint ? `${inputId}-optimize` : undefined
const describedBy = [ariaDescribedBy, statusId, descriptionId, optimizeId].filter(Boolean).join(" ")
const subLineClasses = "mt-1 block text-meta text-faint-foreground"
```

| ส่วน | เดิม | ใหม่ |
|---|---|---|
| `<label>` สถานะ (`:100`) | disabled / dragging / ปกติ | เพิ่มกรณี invalid ก่อนปกติ: `"border-danger bg-surface hover:bg-background"` · 3 string เดิมคงตามตัวอักษร (`field-primitives.test.ts:127-128`) |
| `<input>` (`:103-115`) | `id={inputId}` | `id={inputId}` + `aria-describedby={describedBy}` + `aria-invalid={invalid \|\| undefined}` |
| ชื่อเรื่อง (`:117`) | ชื่อเรื่องหรือชื่อไฟล์ | คงเดิม · เป็นข้อความเดียวที่เป็นชื่อของช่อง |
| บรรทัดสถานะ (`:118`) | `optimizing ? … : file ? hint : browseLabel` | `id={statusId} aria-hidden="true" className={subLineClasses}` · `file ? (hint ?? browseLabel) : browseLabel` |
| คำอธิบาย | — | `{description ? <span id={descriptionId} aria-hidden="true" className={subLineClasses}>{description}</span> : null}` อยู่ใต้บรรทัดสถานะ |
| บรรทัดบีบอัดรูป (`:120`) | แสดงเมื่อรับรูป | `id={optimizeId} aria-hidden="true" className={subLineClasses}` |

- บรรทัดรองทั้ง 3 เป็น `aria-hidden` แล้วอ่านผ่าน `aria-describedby` (ข้อความที่ถูกอ้างถึงยังอ่านได้แม้ซ่อน) ชื่อของช่องจึงเหลือชื่อเรื่อง ไม่ใช่ทั้งกล่อง
- ห่อด้วย `Field` ของ 2A ได้แล้ว: `Field` ส่ง `id`, `aria-describedby`, `aria-invalid` ผ่าน `cloneElement` · ป้ายของ `Field` อยู่นอกกล่อง ไม่ซ้อนกัน
- ไม่มีขนาดเล็กสำหรับ dialog (ไม่มีข้อตัดสินเรื่องนี้)

#### 7.6.2 `FileQueueList` (`ui/file-queue-list.tsx` ใหม่, 2C-0)

`"use client"` (ส่ง `onRemove` และใช้ `useTranslations("common")`)

```ts
export type FileQueueItem = { id: string; name: string; detail?: React.ReactNode }
export function FileQueueList(props: {
  items: readonly FileQueueItem[]
  onRemove: (id: string) => void
  label?: string            // ค่าตั้งต้น t("selectedFiles", { count: items.length })
  emptyLabel?: string       // ไม่มีรายการ: แสดง <EmptyNote> ถ้ามี ไม่มีก็ไม่ render อะไร
  disabled?: boolean
  className?: string
})
```

| ส่วน | class / markup |
|---|---|
| รายการ | `<ul aria-label={label} className={cn("grid gap-2", className)}>` |
| แถว | `<li className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface py-1 pl-3 pr-1 text-sm">` |
| ชื่อ | `<span className="grid min-w-0 flex-1"><span className="truncate text-foreground">{name}</span>{detail ? <span className="truncate text-meta text-faint-foreground">{detail}</span> : null}</span>` |
| ปุ่มเอาออก | `<Button variant="outline" size="icon-sm" disabled={disabled} aria-label={t("removeFile", { name })} onClick={() => onRemove(id)}><X aria-hidden="true" /></Button>` |

ปุ่มเป็นสีกลาง (`outline`) เพราะเอาไฟล์ออกจากคิวยังไม่ลบอะไรที่บันทึกแล้ว (ตระกูลเดียวกับ K22) · ชื่อปุ่มบอกชื่อไฟล์ทุกแถว

#### 7.6.3 จุดเรียก 17 จุด

| # | ที่ | batch | เปลี่ยน |
|---|---|---|---|
| 1 | `asset-operations/checkin-form.tsx:499` (`file={null}`) | 1b | ลบ `hint={t("photoQueued")}` · `description={t("photoAfterDescription")}` · รายการ `:510-527` → `<FileQueueList items={photosAfter.map((photo) => ({ id: photo.id, name: photo.label, detail: photo.file.name }))} emptyLabel={t("noQueuedPhotos")} disabled={saving} onRemove={(id) => setPhotosAfter((current) => current.filter((item) => item.id !== id))} />` · ลบช่องไอคอนพื้นสี `:485-487` (หัว `:484` เหลือ `<div className="mb-3">`) · ลบ import `FileImage`, `Trash2` ถ้าไม่มีที่ใช้แล้ว |
| 2 | `asset-operations/checkout-form.tsx:307` | 1b | เมื่อ `Field` ของไฟล์ (`:406-416`) เปลี่ยนเป็น `Field` ของ 2A (ส่วนช่องกรอก) ลูกของ `<Field label={t("photoBefore")}>` (`:306`) คือ `FileDropzone` ตัวเดิม ไม่มีอะไรห่อเพิ่ม · ป้ายซ้อนป้ายหาย |
| 3 | `assets/asset-attachments.tsx:233` (`file={null}`) | 1e | ห่อ `<Field label={item.label} hideLabel>` (ช่องของแต่ละรายการมีชื่อไม่ซ้ำกัน) · ลบ `hint=` · `description={uploadingPhotoLabel === item.label ? t("uploading") : t("checklistPhotoDescription")}` (เดิมสถานะ "กำลังอัปโหลด" ไม่เคยแสดง) |
| 4 | `assets/asset-attachments.tsx:274` | — | ไม่เปลี่ยน (select ไม่มีป้าย `:263` เป็นของส่วนช่องกรอก) |
| 5 | `assets/asset-component-manager.tsx:364` | — | ไม่เปลี่ยน |
| 6 | `assets/asset-component-manager.tsx:574` | — | ไม่แตะบรรทัดนี้ (`confirm-text-dialog-ui.test.ts:21` ยึด `FileDropzone file={removeEvidence}`) |
| 7 | `assets/asset-form.tsx:1250` | 1e | ไม่เปลี่ยนจุดเรียก · ลบช่องไอคอนพื้นสีของหัวกล่อง `:1176-1178` · ลบ import `FileText` |
| 8 | `assets/asset-form.tsx:1351` | 1e | ไม่เปลี่ยนจุดเรียก · ลบช่องไอคอน `:1301-1303` และหัวข้อซ้ำ `:1305` (ซ้ำกับ `Section` `:1298`) เหลือ `<p className="text-sm text-muted-foreground">{t("initialAssetPhotosHelp")}</p>` · ลบ import `Camera` |
| 9 | `audit/audit-finding-review-actions.tsx:464` | — | ไม่เปลี่ยน |
| 10 | `audit/audit-mark-not-found-button.tsx:117` | — | ไม่เปลี่ยน |
| 11 | `audit/audit-scan-check-form.tsx:297` (`file={null}`, `multiple`) | 1d | ลบ `hint={t("dropAuditPhotoSelected")}` · `description={t("dropAuditPhotoDescription")}` · คง `onFilesChange={addPhotos}` และ `multiple` อยู่บรรทัดของตัวเอง (`audit-scan-search-ui.test.ts:146-147`) · ตารางรูป `:309-330` คงไว้ |
| 12 | `audit/audit-scan-component-missing-dialog.tsx:57` | — | ไม่เปลี่ยน |
| 13 | `disposal/disposal-attachments.tsx:86` | — | ไม่เปลี่ยน |
| 14 | `disposal/disposal-batch-form.tsx:120` (`file={null}`) | 1c | `hint={t("batchEvidenceHelp")}` → `description={t("batchEvidenceHelp")}` (ข้อความเดิมเป็นกติกาที่ต้องเห็นก่อนเลือก ใช้ต่อได้) · `:121` → `<FileQueueList items={files.map((file, index) => ({ id: String(index), name: file.name }))} disabled={saving} onRemove={(id) => setFiles((current) => current.filter((_, index) => String(index) !== id))} />` · ลบ import `X` |
| 15 | `disposal/disposal-request-form.tsx:181` (`file={null}`) | 1c | กล่อง `:179` (`md:col-span-2 rounded-md border border-border bg-background p-4`) และหัว `:180` หาย → `<div className="grid gap-3 md:col-span-2"><Field label={t("requestEvidence")} hideLabel><FileDropzone … description={t("requestEvidenceDescription")} /></Field><FileQueueList items={…} disabled={saving} onRemove={…} /></div>` · ลบ `hint=` · รายการ `:191-206` (ปุ่มข้อความ "ลบ" 18px) หาย · หัวข้อ 3 ชั้นเหลือหัวส่วน "แนบหลักฐาน" + ชื่อเรื่องในกล่อง |
| 16 | `maintenance/maintenance-attachments.tsx:120` | — | ไม่เปลี่ยน |
| 17 | `master-data/asset-model-form.tsx:382` | — | ไม่เปลี่ยน |

รวม: จุดเรียกเปลี่ยน 6 จุด (1, 3, 11, 14, 15 + ห่อ `Field` ที่ 2) · ไม่เปลี่ยน 11 จุด · ช่องไอคอนพื้นสีของหัวกล่องหลักฐานหาย 3 จุด (`checkin-form.tsx:485`, `asset-form.tsx:1176`, `:1301`) ให้เข้ากับช่องแนบไฟล์สีกลางของ 2A (I22) · ช่องไอคอนอื่นที่ `checkin-form.tsx:313`, `asset-label-batch-tool.tsx:336`, `asset-scan-search-tool.tsx:163` ไม่ใช่หัวกล่องหลักฐาน ไม่แตะ

#### 7.6.4 ช่องไฟล์ดิบของงานซ่อม → `FileDropzone multiple` + `FileQueueList` (batch 1a)

| ที่ | ใหม่ |
|---|---|
| `maintenance/repair-record-form.tsx:216-225` | `<Field label={t("files")} className="md:col-span-2">{(control) => (<div className="grid gap-2"><FileDropzone {...control} file={null} onFileChange={(file) => file && addFiles([file])} onFilesChange={addFiles} disabled={saving} accept="image/*,application/pdf" multiple title={t("dropFilesTitle")} description={t("filesHelp")} browseLabel={t("dropFilesHint")} /><FileQueueList items={files.map((file, index) => ({ id: String(index), name: file.name }))} disabled={saving} onRemove={removeFile} /></div>)}</Field>` · `addFiles = (next: File[]) => setFiles((current) => [...current, ...next])` · บรรทัด `:224` (`filesHelp`) ย้ายเข้า `description` |
| `maintenance/repair-record-actions.tsx:147-149` | แบบเดียวกัน (ไม่มี `md:col-span-2` เพราะ dialog เป็นคอลัมน์เดียว) · `setFiles([])` ตอนปิด (`:65`, `:82`) คงไว้ |

- ชื่อ state `files` คงไว้ (`repair-record-ui.test.ts:38` ยึด `uploadRepairFiles(payload.id, files`)
- ไม่ใส่ `capture` เพราะต้องเลือก PDF ใบเสร็จได้ (มือถือที่มี `capture` จะเปิดกล้องตรง)
- พฤติกรรมเปลี่ยน: เดิมเลือกใหม่แล้ว**แทน**รายการเดิม ใหม่**ต่อท้าย**และเอาออกทีละไฟล์ได้ · รูปถูกบีบอัดแบบช่องอื่น · PDF ส่งตามเดิม

### 7.7 `SignaturePad` (K25 · `asset-operations/signature-pad.tsx`, batch 1b)

| ที่ | เดิม | ใหม่ |
|---|---|---|
| `:109` กรอบ | `rounded-md border border-border bg-background p-3` | คง class (K28) · เพิ่ม `role="group" aria-labelledby={labelId} aria-describedby={helperId}` |
| `:110-124` หัว | แถว `flex items-start justify-between` ที่มีข้อความกับปุ่ม (คอลัมน์ข้อความไม่มี `min-w-0` ปุ่มไม่มี `shrink-0` "ล้างลายเซ็น" ตัดเป็น 2 บรรทัดใน `h-8` ที่ 375) | `<div className="mb-3 min-w-0"><div id={labelId} className="text-sm font-medium text-foreground">{label}</div><p id={helperId} className="mt-1 text-meta text-faint-foreground">{helper}</p></div>` ข้อความเต็มความกว้าง |
| `:131` canvas | `border-dashed border-border bg-white` | `border-dashed border-input bg-white` (ขอบประแบบเดียวกับช่องแนบไฟล์ 3.47:1) · `bg-white` และสีเส้น `#0f172a` / พื้น `#ffffff` (`:42-43`, `:102`) คงไว้ เพราะเป็นหลักฐานที่พิมพ์ |
| ใต้ canvas | — | `<div className="mt-2 flex justify-end"><Button variant="ghost" size="sm" onClick={clearSignature} disabled={disabled \|\| !hasSignature}><RotateCcw aria-hidden="true" />{clearLabel}</Button></div>` |

- `Button` มี `shrink-0 whitespace-nowrap` อยู่แล้ว (`button-variants.ts:16`) · สูง 44 ใต้ `md` · 32 ตั้งแต่ `md` · ไม่ใช้ opacity
- 3 จุดเรียกไม่ต้องแก้ · ที่รับคืน 2 แผ่นวางคู่กันที่ `md:grid-cols-2` (`checkin-form.tsx:530`) แถวปุ่มอยู่ใต้ canvas จึงไม่บีบหัว
- canvas ยังไม่มีชื่อของตัวเอง (ลายเซ็นไม่บังคับ `checkout-form.tsx:155`, `checkin-form.tsx:257-258`) กลุ่มมีชื่อแล้ว

### 7.8 ข้อความใหม่และที่ลบ

แก้ด้วย `node scripts/messages-edit.mjs <changes.json>` เท่านั้น · ทุกคำผ่านกฎใน `tests/thai-glossary.test.ts` (ไม่มีคำอังกฤษในข้อความไทย) · placeholder ไทยกับอังกฤษตรงกัน (`messages-parity.test.ts`)

| key | th | en | ใช้ที่ | batch |
|---|---|---|---|---|
| `common.stepOf` | ขั้นที่ {current} จาก {total} | Step {current} of {total} | `Steps` | 2C-0 |
| `common.stepComplete` | เสร็จแล้ว | Done | `Steps` | 2C-0 |
| `common.stepCurrent` | ขั้นตอนปัจจุบัน | Current step | `Steps` | 2C-0 |
| `common.stepUpcoming` | ยังไม่ถึง | Not started | `Steps` | 2C-0 |
| `common.stepRejected` | ถูกปฏิเสธ | Rejected | `Steps` | 2C-0 |
| `common.removeFile` | นำ {name} ออก | Remove {name} | `FileQueueList` | 2C-0 |
| `common.selectedFiles` | ไฟล์ที่เลือก {count} ไฟล์ | {count, plural, one {# selected file} other {# selected files}} | `FileQueueList` | 2C-0 |
| `repairRecord.dropFilesTitle` | ถ่ายรูปหรือแนบใบเสร็จ | Take a photo or attach a receipt | repair ×2 | 1a |
| `repairRecord.dropFilesHint` | หรือคลิกเพื่อเลือกรูป/PDF ได้หลายไฟล์ | or click to choose images or PDFs | repair ×2 | 1a |
| `checkin.photoAfterDescription` | ถ่ายได้หลายรูป รูปจะบันทึกพร้อมรายการรับคืน | Add as many photos as you need. They are saved with the return. | จุด 1 | 1b |
| `disposalPage.requestEvidenceDescription` | แนบได้หลายไฟล์ ไฟล์จะอัปโหลดหลังบันทึกคำขอ | You can attach several files. They upload after the request is saved. | จุด 15 | 1c |
| `auditScan.dropAuditPhotoDescription` | รูปจะอัปโหลดหลังบันทึกผลตรวจ | Photos upload after the check is saved. | จุด 11 | 1d |
| `asset.checklistPhotoDescription` | รูปจะอัปโหลดทันทีที่เลือก | The photo uploads as soon as you choose it. | จุด 3 | 1e |
| `asset.componentInstallSteps` | ขั้นตอนติดตั้งส่วนควบ | Component installation steps | ติดตั้งส่วนควบ | 1e |
| `asset.componentStepIdentify` | เลือกส่วนควบ | Choose component | ติดตั้งส่วนควบ | 1e |
| `asset.componentStepDetails` | ระบุรายละเอียด | Enter details | ติดตั้งส่วนควบ | 1e |
| `asset.componentStepReview` | ตรวจสอบและยืนยัน | Check and confirm | ติดตั้งส่วนควบ | 1e |
| `asset.createModeLabel` | วิธีเพิ่มทรัพย์สิน | How to add assets | T3 | 4 |
| `disposalPage.workflowStepsLabel` | ขั้นตอนการตัดจำหน่าย | Disposal steps | S1 | 5 |
| `disposalPage.workflowSteps.request` | ยื่นคำขอ | Request | S1 | 5 |
| `disposalPage.workflowSteps.decision` | พิจารณา | Decision | S1 | 5 |
| `disposalPage.workflowSteps.execution` | ตัดจำหน่ายจริง | Execution | S1 | 5 |

ที่มาของคำอธิบาย 5 จุดที่เคยซ่อน (ข้อความเดิมเขียนไว้สำหรับ**หลัง**เลือกไฟล์ จึงต้องเขียนใหม่ ไม่ใช่แค่แสดง):

| จุด | ข้อความเดิมที่ไม่เคยแสดง | ปัญหาถ้าแสดงก่อนเลือก | ใหม่ | อ้างพฤติกรรมจริง |
|---|---|---|---|---|
| checkin `:506` | `checkin.photoQueued` "เพิ่มรูปเข้าคิวแล้ว" | บอกว่าเพิ่มแล้วทั้งที่ยังไม่ได้เพิ่ม | `checkin.photoAfterDescription` | รูปส่งไปกับคำขอรับคืน (`checkin-form.tsx:253-256`) |
| asset-attachments `:240` | `asset.dropFileSelected` "เลือกไฟล์แล้ว ระบบจะอัปโหลดให้อัตโนมัติ" | บอกว่าเลือกแล้ว · key นี้ยังใช้ที่อื่น 4 จุด | `asset.checklistPhotoDescription` (+ "กำลังอัปโหลด..." ตอนอัปโหลด) | อัปโหลดทันที (`handleChecklistUpload`) |
| audit `:306` | `auditScan.dropAuditPhotoSelected` "เพิ่มเข้าเป็นหลักฐานแล้ว สามารถเพิ่มรูปต่อได้" | บอกว่าเพิ่มแล้ว | `auditScan.dropAuditPhotoDescription` | อัปโหลดหลังบันทึก (`audit-scan-workspace.tsx:522`) หรือเข้าคิวออฟไลน์ (`:508`) |
| disposal request `:188` | `disposalPage.dropEvidenceSelected` "เลือกไฟล์แล้ว ระบบจะอัปโหลดให้อัตโนมัติ" | ผิดสำหรับฟอร์มนี้ (ไฟล์รอจนบันทึกคำขอ) · key ยังใช้ที่ `disposal-attachments.tsx:86` ซึ่งถูกต้อง | `disposalPage.requestEvidenceDescription` | อัปโหลดหลังสร้างคำขอ (`disposal-request-form.tsx:77-86`) |
| disposal batch `:120` | `disposalPage.batchEvidenceHelp` | ไม่มี เป็นกติกาที่ควรเห็นก่อนเลือก | ใช้ key เดิมเป็น `description` | `disposal-batch.test.ts:187-192` |

key ที่ลบ (ไม่มีที่ใช้หลังเปลี่ยน · ไม่มี test อ้าง): `checkin.photoQueued` · `checkin.removePhoto` · `auditScan.dropAuditPhotoSelected` · `asset.importWizardCurrentStep`

### 7.9 Test

**แก้ test เดิม** (ในงานเดียวกับที่ทำให้พัง)

| test:บรรทัด | เดิม | ใหม่ | batch |
|---|---|---|---|
| `tests/disposal-forms-ux.test.ts:11-12` | `/FormStep/` ทั้ง 2 ฟอร์ม | `/<FormSection number=\{1\} title=\{t\("formSteps\.asset"\)\}/` ทั้ง 2 ฟอร์ม + `assert.doesNotMatch(…, /function FormStep/)` · ชื่อ test "compact numbered sections" ยังถูก · `:19-22` (key `formSteps.*`) ไม่แก้ | 1c |
| `tests/field-primitives.test.ts:131` | `"mt-1 block text-meta text-faint-foreground"` ต้องมี 2 ครั้ง | `/const subLineClasses = "mt-1 block text-meta text-faint-foreground"/` มี 1 ครั้ง และ `className=\{subLineClasses\}` มี 3 ครั้ง · `:126-130` ไม่แก้ | 2C-0 |

**ต้องผ่านต่อโดยไม่แก้** (เขียนเป็นข้อห้ามใน task ของ plan)

- `disposal-detail-workspace.test.ts:9, :12` ไฟล์ `disposal-workflow-stepper.tsx` และชื่อ `DisposalWorkflowStepper`
- `asset-component-manager.test.ts:27` `type InstallStep = "identify" | "details" | "review"` · `:29-30` `installEvidence`, `removeEvidence`
- `confirm-text-dialog-ui.test.ts:21` `FileDropzone file={removeEvidence}` (ไม่แตะ `asset-component-manager.tsx:574`)
- `audit-scan-search-ui.test.ts:146-155` `onFilesChange={addPhotos}` · `multiple` อยู่บรรทัดเดียว · `multiple?: boolean` · `onFilesChange?: (files: File[]) => void` · `Array.from(event.target.files`
- `asset-batch-form-layout.test.ts:11-13` ลำดับ `{t("batchOptionalColumns")}` → `batchOptionalColumnKeys` → `<BatchOptionalColumnToggle` (legend ต้องมีนิพจน์ `{t("batchOptionalColumns")}` ตามตัวอักษร)
- `repair-record-ui.test.ts:38` `uploadRepairFiles(payload.id, files`
- `asset-import-wizard.test.ts:9-15` (`getAssetImportWizardStep` ไม่แก้) · `asset-import-field-labels.test.ts:24-32` · `asset-register-ux.test.ts:127-139`
- `asset-clone-ui.test.ts:29-35` · `asset-handover-checkout.test.ts:16-20` · `asset-operation-confirmation-ui.test.ts:21` (`t("handoverMode")` ยังอยู่ใน legend) · `asset-handover-checkin.test.ts:24`
- `settings-ldap-role-ui.test.ts:20-21` (ไม่แตะแผง `:1703`) · `settings-depreciation-policy-ui.test.ts:43-44, :85-86`
- `disposal-batch.test.ts:187-192` · `visual-foundation-guards.test.ts:11` (สีวงโฟกัส) · `:194-198` (สีจางบนพื้นสถานะ) · `:297-299` (ไม่มี `leading-4` ใน `file-dropzone.tsx`)
- `visual-foundation-guards.test.ts:280-289` และ `asset-label-print-ui.test.ts:51-55` เป็นของ P0 (T2)

**test ใหม่**

| ไฟล์ | ตรวจ | batch |
|---|---|---|
| `tests/step-states.test.ts` (import `../src/lib/step-states.ts`) | `getLinearStepStates(3, 0)` = current/upcoming/upcoming · `(3, 1)` = complete/current/upcoming · `(3, 1, "rejected")` = complete/rejected/upcoming · `(5, 4, "complete")` ทุกขั้น complete · index นอกช่วงถูกบีบ · `getStepFocusIndex` ของ 3 กรณี (current, rejected, เสร็จหมด = ตัวสุดท้าย) | 2C-0 |
| `tests/steps-ui.test.ts` | `ui/steps.tsx`: ไม่มี `"use client"` `useState` `useEffect` · มี `useTranslations("common")`, `aria-current=`, `"step"`, `size-5.5`, `max-md:sr-only`, `md:hidden`, `t("stepOf"`, `strokeWidth={2.75}` และ string marker 4 แบบตามตาราง 7.2.2 · ไม่มี `text-white` · `ui/form-section.tsx`: ไม่มี directive และ hook · มี `border-b border-border-soft`, marker `border-control-border … text-muted-foreground num` · `disposal-workflow-stepper.tsx` ใช้ `<Steps` และ `getLinearStepStates` ไม่มี `grid grid-cols-3` และ `text-white` · `pending_approval: 1` · หน้า `disposal/[id]/page.tsx` ส่ง `workflowSteps.request` · แผงนำเข้าใช้ `<Steps` ไม่มี `function WizardStep` และ `labels.currentStep` · 2 หน้าไม่มี `importWizardCurrentStep` · ติดตั้งส่วนควบมี `<Steps` และ `labels.steps.label` · ตั้งค่ามี `<FormSection as="h3"` 7 ครั้ง ไม่มี `function WizardStep` · key ใหม่ของข้อ 7.8 มีครบทั้ง th/en และ `common.stepOf` ภาษาไทยมี `{current}` กับ `{total}` | 2C-0 → 5 (เพิ่ม assert ตาม batch) |
| `tests/choice-controls-ui.test.ts` | `ui/choice-card.tsx`: มี `has-checked:border-primary`, `has-checked:bg-primary-soft`, `checkboxVariants(`, `event.key === "Enter"`, `rounded-control` (chip), `md:min-h-8` · ไม่มี `accent-primary` และ `focus-within:ring` · ทั้ง `src` ไม่มี `accent-primary` (3 → 0) · checkout มี `<ChoiceCard` + `name="handoverModeChoice"` + `required` · repair-record-form ไม่มี `function Choice(` · repair-record-actions มี `<ChoiceCard` · `BatchOptionalColumnToggle` ใช้ `<ChoiceChip type="checkbox"` · asset-form มี `<ChoiceChip type="radio"` · depreciation builder มี `role="radiogroup"` และ `<ChoiceChip type="radio"` · bulk-move มี `type="checkbox"` + `preventEnterSubmit` ไม่มี `rounded border ${checked` · CandidateList มี `aria-pressed={selectedId === candidate.id}` · disposal picker มี `size-4` + `rounded-sm border-[1.5px]` ไม่มี `h-5 w-5 shrink-0 items-center justify-center rounded border` · asset-create-workspace มี `<Segmented` + `t("createModeLabel")` ไม่มี `bg-primary text-white` | 2C-0 → 4 |
| `tests/file-evidence-ui.test.ts` | `file-dropzone.tsx`: `id?: string`, `description?: React.ReactNode`, `hint?: string`, `"aria-describedby"?: string`, `id ?? generatedId`, `aria-hidden="true"` 3 ครั้งบนบรรทัดรอง, `"border-danger bg-surface hover:bg-background"` · `file-queue-list.tsx`: `<ul`, `<Button`, `variant="outline"`, `size="icon-sm"`, `t("removeFile", { name`, `EmptyNote` · จุด 1, 3, 11, 15 ไม่มี `hint=` และมี `description=` · จุด 14 มี `description={t("batchEvidenceHelp")}` · checkout มี `<Field label={t("photoBefore")}>\s*<FileDropzone` · repair 2 ไฟล์ไม่มี `type="file"` มี `<FileDropzone`, `multiple`, `<FileQueueList` · นอก `ui/file-dropzone.tsx` และ `asset-import-preview-panel.tsx` ไม่มี `type="file"` ใน `src` · `checkin-form.tsx` มี `rounded-md bg-primary-soft text-primary` 1 ครั้ง (`:313`) · `asset-form.tsx` 0 ครั้ง · `signature-pad.tsx` มี `<Button`, `variant="ghost"`, `size="sm"`, `role="group"`, `aria-labelledby=`, `text-meta text-faint-foreground`, `bg-white`, `"#0f172a"` ไม่มี `disabled:opacity-50` และ `h-8` · key ที่ลบ 4 ตัวไม่มีใน th/en | 2C-0 → 1e |

guard แบบ ratchet ที่เพิ่ม (ใส่ใน `choice-controls-ui` / `steps-ui`): ไม่มี `function (FormStep|WizardStep|Choice)\b` ใน `src` หลัง batch ที่ลบ

### 7.10 ลำดับงานตาม batch

| batch | งานของส่วนนี้ | ต้องรอ |
|---|---|---|
| P0 | T2 → `Segmented` (ไม่ใช่งานของส่วนนี้) | — |
| 2C-0 | `lib/step-states.ts` · `ui/steps.tsx` · `ui/form-section.tsx` · `ui/choice-card.tsx` · `ui/file-queue-list.tsx` · `ui/file-dropzone.tsx` (description, id, aria-*) · key `common.*` 7 ตัว · test ใหม่ 4 ไฟล์ (ส่วน primitive) · แก้ `field-primitives.test.ts:131` | ส่วนช่องกรอก export `fieldLabelClasses` (K27) ก่อนหรือพร้อมกัน |
| 1a | R2, R3 · ช่องไฟล์ repair 2 จุด · key `repairRecord.*` 2 ตัว | 2C-0 · `Field` ของ 2A ใน 2 ไฟล์ (ส่วนช่องกรอก งานเดียวกัน) |
| 1b | R1 · P1 · checkout ห่อ `Field` · checkin คำอธิบาย + `FileQueueList` + ลบช่องไอคอน · `SignaturePad` | 2C-0 |
| 1c | `FormSection` 6 จุด · P2 · disposal request/batch ช่องไฟล์ · แก้ `disposal-forms-ux.test.ts:11-12` | 2C-0 |
| 1d | audit-scan-check คำอธิบาย | 2C-0 |
| 1e | ติดตั้งส่วนควบ `Steps` + P3 + ป้ายปุ่มถอย · T4 · T5 · ช่องไอคอน asset-form 2 จุด + หัวข้อซ้ำ · asset-attachments จุด 3 · หน้า `assets/[id]/components/page.tsx` | 2C-0 |
| 1f | `FormSection` 7 จุดในหน้าตั้งค่า + ระยะ `space-y-6` · T6 (ห้ามแตะ `:937-956`) | 2C-0 |
| 4 | S5 + 2 หน้า (`import-export/page.tsx:82`, `assets/page.tsx:451`) · T3 | 2B merge แล้ว (`assets/page.tsx` เป็นหน้าของ 2B) · P0 |
| 5 | S1 + `disposal/[id]/page.tsx:205-215` | 2B merge แล้ว |

### 7.11 ตรวจบนแอป dev

ที่ 375, 768 และ 1440 · ภาษาไทยเป็นหลัก ภาษาอังกฤษ 1 รอบ

| หน้า | ดูอะไร |
|---|---|
| ติดตั้งส่วนควบ (`/assets/[id]/components`) | rail 3 ขั้นเปลี่ยนตามขั้น · จอแคบเห็น "ขั้นที่ 2 จาก 3 · ระบุรายละเอียด" · ปุ่มถอยเขียนว่า "กลับ" |
| นำเข้าทรัพย์สิน (ทะเบียนและหน้านำเข้า/ส่งออก) | 5 ขั้นเป็นแถวเดียวที่ 375 · นำเข้าเสร็จแล้วติ๊กเขียวครบ ไม่มีขั้นสีน้ำเงิน |
| รายละเอียดคำขอตัดจำหน่าย 4 สถานะ | `pending` = พิจารณาเป็นขั้นปัจจุบัน · `approved` · `disposed` · `rejected` (X แดงที่พิจารณา) · NVDA อ่าน "ถูกปฏิเสธ: พิจารณา" |
| สร้างคำขอตัดจำหน่าย / ชุดตัดจำหน่าย | หัวข้อมีเลขเป็นวงขอบเทา ไม่ใช่วงน้ำเงินทึบ · ส่วนแนบหลักฐานเหลือหัวข้อเดียว · รายการไฟล์มีปุ่ม X ขอบเทา |
| ตั้งค่า แท็บ LDAP 2 แท็บ | ไม่มีการ์ดชั้นที่ 3 · ระยะระหว่างส่วน · กล่องที่เคยอยู่บนพื้นเทาดูชัดพอบนพื้นขาว |
| ส่งมอบ | การ์ด radio 2 ใบ · **กด Enter บน radio แล้วฟอร์มไม่ submit** · Space เลือกได้ · ช่องรูปก่อนส่งมอบไม่มีป้ายซ้อน (คลิกป้ายแล้วเปิดเลือกไฟล์ครั้งเดียว) · ลายเซ็น: ปุ่มล้างอยู่ใต้ช่อง 1 บรรทัด |
| รับคืน | ลายเซ็น 2 แผ่นที่ 768 · คำอธิบายช่องรูป · รายการรูปที่รอแนบ |
| บันทึกงานซ่อม / ปิดงานซ่อม (dialog) | เลือกหลายไฟล์ 2 รอบแล้วรายการต่อท้าย · เอาออกทีละไฟล์ · บน iPhone เลือก PDF ได้ |
| เพิ่มทรัพย์สินแบบชุด | chip คอลัมน์รายแถว · Enter บน chip ไม่ส่งฟอร์ม |
| เพิ่มทรัพย์สิน | chip ประเภทรูปพร้อมสถานะ · Segmented สลับโหมด (เพิ่มทีละรายการ / เพิ่มเป็นชุด) |
| ตั้งค่า แท็บค่าเสื่อม | chip กลุ่ม · **Enter บน chip ไม่บันทึกหน้าตั้งค่า** · chip ตอน JSON ผิด (disabled) |
| ย้ายหลายรายการ | แถว checkbox สูง 44 · Enter ไม่ส่งฟอร์ม |
| ตรวจนับ (แผงตรวจ) | คำอธิบายช่องรูป · ตารางรูปเดิม |
| Safari บน iOS | `has-checked:` ทำงาน (ต้องการ Safari 15.4+) |

### 7.12 เอกสาร (ใส่ใน checklist ของงานเอกสารท้าย 2C)

- `DESIGN.md` ส่วน Components: `Steps` (marker rail · สถานะ 4 แบบ · จอแคบ) · `FormSection` · `ChoiceCard` / `ChoiceChip` (input แสดงเสมอ · Enter ไม่ submit) · `FileQueueList` · `FileDropzone` (`description`, ห่อ `Field` ได้) · `SignaturePad`
- `docs/14_UI_UX_DESIGN_SYSTEM.md` ให้ตรงกับ `DESIGN.md`
- wiki `AssetSystem` (`ams-`) หน้าที่พูดเรื่องฟอร์ม + `ams-log.md` และรัน `wiki-lint`

### 7.13 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | คำของ `Steps` | `Steps` เรียก `useTranslations("common")` เอง ผู้เรียกส่งแค่ `label` กับ `steps` | ทำแบบ `Breadcrumbs`/`Nil` ของ 2A · ใช้ได้ทั้ง server และ client · ไม่ต้องส่งฟังก์ชันจัดรูปข้อความข้ามขอบ server |
| 2 | ตรรกะสถานะ | แยกไว้ใน `src/lib/step-states.ts` | test ของ node import ได้ตรงแบบ `asset-import-wizard.ts` |
| 3 | เสร็จทุกขั้น | ไม่มี `aria-current` · จอแคบแสดงขั้นสุดท้าย | steppers map กฎข้อ 3 · แก้ข้อบกพร่องที่ S1 และ S5 ทำขั้นสุดท้ายเป็นทั้ง complete และ current |
| 4 | ขั้นที่ถูกปฏิเสธ | ไม่มี `aria-current` · คำนำหน้า "ถูกปฏิเสธ" · ขั้นต่อจากนั้นเป็น upcoming | คำขอจบแล้ว ไม่ได้ "อยู่ที่" ขั้นไหน · ไม่เพิ่มสถานะที่ 5 |
| 5 | บรรทัด "ขั้นที่ x จาก y" | `aria-hidden` | `<ol>` อ่านทุกขั้นพร้อมสถานะอยู่แล้ว |
| 6 | ชื่อขั้นของ S1 | ใช้ key ใหม่ที่เป็นการกระทำ (ยื่นคำขอ · พิจารณา · ตัดจำหน่ายจริง) · หัวการ์ดในหน้าคงชื่อเดิม | ชื่อ "รายละเอียด…" เป็นชื่อการ์ด อ่านแล้วเหมือนสารบัญ · "พิจารณา" ตาม glossary |
| 7 | ลำดับขั้นของ S1 | `pending` → ขั้น 2 · `approved` → ขั้น 3 | คำขอที่เปิดดูได้ยื่นแล้วเสมอ (สถานะ 4 ค่า ค่าเริ่ม `pending`) |
| 8 | ชื่อ `<ol>` ของ S5 | ใช้ `labels.wizardTitle` ที่มีอยู่ ไม่เพิ่ม key | ไม่ต้องแก้หน้าของ 2B เพื่อเพิ่ม label |
| 9 | `labels.currentStep` ของ S5 | ลบจาก type, 2 หน้า และ `messages` | ซ้ำกับ `common.stepCurrent` · ทำใน batch 4 ซึ่งรอ 2B merge อยู่แล้ว |
| 10 | ปุ่มถอยในขั้นตรวจสอบติดตั้งส่วนควบ | ข้อความ `labels.cancel` → `labels.back` | เมื่อมีแถบขั้นตอน "ยกเลิก" ที่จริงย้อนกลับ 1 ขั้นทำให้เข้าใจผิด · เปลี่ยนแค่ข้อความ ไม่เปลี่ยนพฤติกรรม |
| 11 | โครงของ `FormSection` | component เดียว 2 แบบ (ไม่มี/มี `children`) · ใช้ `div` ไม่ใช้ `<section>` ที่มีชื่อ | ฟอร์มตัดจำหน่ายวางหัวข้อเป็นแถวใน grid · หน้าตั้งค่าห่อเนื้อหา · กัน landmark region 7 อัน |
| 12 | ระดับหัวข้อ | `h2` = `text-base` · `h3` = `text-sm` | หน้าตั้งค่ามี `h2` `text-base` อยู่เหนือแล้ว |
| 13 | `FormStep` ใน `disposal-forms-ux.test.ts:11-12` | ลบ helper และแก้ regex | ไม่ต้องตั้ง alias ชื่อเก่า · test ยังตรวจเจตนาเดิม (หัวข้อแบบมีเลข) |
| 14 | ระยะในหน้าตั้งค่า | `space-y-6` ที่ `:1705` และ `:1855` | การ์ดหายไป ต้องมีระยะแยกส่วน |
| 15 | ตัวเลือกมี `"use client"` | ใช่ | มีตัวจัดการ Enter ในตัว และทุกจุดใช้อยู่ใน client component |
| 16 | Enter บน checkbox/radio | `preventEnterSubmit` ใน `ChoiceCard`/`ChoiceChip` และแถว P1 | กันการ submit ฟอร์มตั้งค่าหรือฟอร์มทรัพย์สินจาก T4–T6/P1 ที่เคยเป็นปุ่ม (R4 แบบเดียวกับ dialog ในฟอร์มตั้งค่า) |
| 17 | input ใน chip | แสดงเสมอ ไม่ใช้ `sr-only` | สถานะไม่บอกด้วยสีอย่างเดียว · วงโฟกัสมาจาก input เอง (`sr-only` ตัด outline ตามที่ 2A พบ) |
| 18 | ชื่อของตัวเลือก | `aria-labelledby` = label · description/detail เป็นคำอธิบาย | ชื่อสั้น อ่านคำอธิบายทีหลัง |
| 19 | ความสูงของ chip | 44 ใต้ `md` · 32 ตั้งแต่ `md` | เท่าปุ่ม `sm` และ Segmented |
| 20 | T6 | คง `h3` และใช้ `role="radiogroup"` + `aria-labelledby` แทน legend | หัวข้อนี้มีปุ่มเพิ่มกลุ่มข้าง ๆ และเป็นหัวข้อของส่วน |
| 21 | P3 | ใส่ `aria-pressed` ให้ตรงกับหน้าตา · ไม่ลบหน้าตาที่เลือก | ทำตาม K16 ตรงตัว · ไม่เปลี่ยนพฤติกรรม |
| 22 | `aria-required` ของ `FileDropzone` | รับใน type แต่ไม่ส่งให้ `<input type="file">` | `aria-required` ไม่ใช่ attribute ส่วนกลางของ ARIA · input file ไม่มี role ที่รับค่านี้ · ดอกจันของ `Field` ยังแสดง |
| 23 | ชื่อของช่องแนบไฟล์ | ชื่อเรื่องอย่างเดียว · บรรทัดรองเป็น `aria-hidden` + `aria-describedby` | เดิมชื่อของช่องคือทั้งกล่อง (ยาวมาก) · พอห่อด้วย `Field` ชื่อจะเป็น ป้าย + ชื่อเรื่อง |
| 24 | ช่องแนบไฟล์ที่ผิด | ขอบประ `border-danger` ไม่มี halo | กล่องใหญ่ ใช้แค่สีขอบพอ · ให้ V track ใช้ |
| 25 | `hint` | ไม่บังคับ · จุด `file={null}` ไม่ส่งแล้ว | ส่งไปก็ไม่เคยแสดง |
| 26 | ปุ่มเอาไฟล์ออกจากคิว | `outline` `icon-sm` + X | ยังไม่มีอะไรถูกลบจริง (ตระกูล K22) · ใช้แทนเป้าหมายรายจุดของส่วนปุ่มที่ `checkin-form.tsx:520`, `disposal-batch-form.tsx:121`, `disposal-request-form.tsx:196` |
| 27 | ช่องไฟล์ของงานซ่อม | ไม่ใส่ `capture` · ต่อท้ายรายการ · กว้าง 2 คอลัมน์ในฟอร์ม | ต้องแนบ PDF ใบเสร็จได้ · แบบเดียวกับคิวรูปของตรวจนับ |
| 28 | กล่องหลักฐานของคำขอตัดจำหน่าย | เอากรอบ `:179` ออก · ป้าย `requestEvidence` เป็น `Field hideLabel` | K28 ให้เปลี่ยนแผงได้ตรงที่ `FormSection` แทนหัวข้อมีเลข · หัวข้อ 3 ชั้นเหลือ 1 (steppers D8) |
| 29 | ช่องแนบไฟล์รายรายการรูปของทรัพย์สิน | `Field hideLabel label={item.label}` | ทุกช่องเคยมีชื่อเดียวกัน |
| 30 | ช่องไอคอนพื้นสีของหัวกล่องหลักฐาน 3 จุด + หัวข้อซ้ำ `asset-form.tsx:1305` | ลบ | 2A ลบช่องแบบนี้ออกจากช่องแนบไฟล์แล้ว (`field-primitives.test.ts:130`) · I22 |
| 31 | ขอบของ canvas ลายเซ็น | `border-input` ประ | เป็นพื้นที่ให้ "ทำ" แบบเดียวกับช่องแนบไฟล์ · ขอบเดิม 1.35:1 แทบมองไม่เห็นบนพื้นเทา |
| 32 | ชื่อกลุ่มของ T3 | key ใหม่ `asset.createModeLabel` ไม่แสดงบนจอ | Segmented ต้องมี `aria-label` (`role="group"`) |

### 7.14 ความเสี่ยง

1. **Enter เปลี่ยนพฤติกรรม** ใน R1–R3 (เดิม Enter บน radio submit ฟอร์ม) · ถ้ามีคนพึ่ง Enter เพื่อบันทึกจาก radio จะไม่ได้แล้ว · ตรวจด้วยคีย์บอร์ดตามข้อ 7.11 · ถ้าลืมใส่ guard ที่ T6 Enter จะบันทึกหน้าตั้งค่าทั้งหน้า
2. **ขัดกับร่างของส่วนปุ่ม** ตารางปุ่มให้ `checkin-form.tsx:520` = `outline` `icon`, `disposal-batch-form.tsx:121` = `danger` `icon`, `disposal-request-form.tsx:196` = `danger` `sm` แต่ทั้ง 3 ถูกแทนด้วย `FileQueueList` (ข้อตัดสินย่อย 26) · และให้ `signature-pad.tsx:115` = `outline` `sm` ในหัว ซึ่งขัดกับ K25 (`ghost` `sm` ใต้ canvas) · ต้องตัดแถวเหล่านี้ออกจากตารางปุ่มตอนรวมสเปก
3. **ขึ้นกับงานอื่น** `fieldLabelClasses` (K27, ส่วนช่องกรอก) · API ของ `Segmented` (P0) · `Field` ของ 2A แทน `Field` ของไฟล์ใน checkout/checkin/repair/disposal (ส่วนช่องกรอก) ต้องลงในงานเดียวกันหรือก่อน · ถ้าส่วนช่องกรอกตั้งชื่อ export ต่างไป ให้ใช้ชื่อนั้น
4. **แก้หน้าที่ 2B ดูแล** `assets/page.tsx:451` และ `import-export/page.tsx:82` (batch 4) · `disposal/[id]/page.tsx:205-215` (batch 5) · `assets/[id]/components/page.tsx` (1e, แค่เพิ่ม label) · ทำหลัง 2B merge และ rebase ตามบรรทัดใหม่
5. **ผู้ใช้อ่าน S1 ต่างจากเดิม** ขั้นปัจจุบันขยับจาก "คำขอ" เป็น "พิจารณา" ตอนรออนุมัติ และ `<ol>` เปลี่ยนชื่อจากสถานะเป็น "ขั้นตอนการตัดจำหน่าย" (steppers risk 8) · แจ้งผู้ใช้ที่ทำงานตัดจำหน่ายในบันทึกการเปลี่ยนแปลง
6. **`has-checked:` ต้องการ `:has()`** (Safari 15.4+, Chrome 105+) · เครื่องเก่าจะไม่เห็นพื้นของการ์ดที่เลือก แต่ input ยังบอกสถานะ (เหตุผลที่ input แสดงเสมอ)
7. **ช่องแนบไฟล์งานซ่อมทำงานต่างจากเดิม** ต่อท้ายแทนแทนที่ · รูปถูกบีบอัดก่อนส่ง (`Promise.all` ทุกรูปพร้อมกัน) เลือกรูปใหญ่หลายรูปบนมือถือเก่าอาจช้าหรือกินหน่วยความจำ · ลองเลือก 5 รูปบนเครื่องจริง
8. **หน้าตั้งค่าไม่มีการ์ดชั้นที่ 3** กล่องในเนื้อหาที่เคยตัดกับพื้นเทา (`bg-background`) ของการ์ดตอนนี้อยู่บนพื้นขาว ต้องดูภาพก่อน/หลังที่ 1440 และ 375
9. **T4 ยังมีพฤติกรรมเดิมที่แปลก** chip ที่มีค่ารายแถวกดเอาออกแล้วยัง checked (ซ่อนไม่ได้ตอนยังมีค่า) · เดิมเป็นแบบนี้อยู่แล้ว ส่วนนี้ไม่แก้ ถ้าจะแก้ต้องตัดสินแยก
10. **pin ที่ขึ้นกับรูปแบบการเขียน** `multiple` ต้องอยู่บรรทัดเดียว (`audit-scan-search-ui.test.ts:147`) · `FileDropzone file={removeEvidence}` (`confirm-text-dialog-ui.test.ts:21`) · ลำดับใน `asset-batch-form-layout.test.ts:11-13` · formatter ห้ามจัด JSX ของ 3 จุดนี้ใหม่
11. **คำใหม่ 22 key และลบ 4 key** ต้องผ่าน `thai-glossary.test.ts` และ `messages-parity.test.ts` · `common.selectedFiles` ภาษาอังกฤษใช้ plural (มีที่ใช้แบบนี้แล้ว 2 key)
12. **ความสูงเพิ่ม** ช่องแนบไฟล์ที่มี `description` สูงขึ้น 1 บรรทัด (ประมาณ 150px ที่ 375) โดยเฉพาะใน dialog ปิดงานซ่อม · การ์ด radio ของส่งมอบเตี้ยลงจาก `min-h-16` เป็นตามเนื้อหา
