> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2c-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** (I1–I36) · ตัวเลขและบรรทัดอ้างที่ `master` `5ffee76`

## 9. guard และ test

ส่วนนี้ถือ 4 เรื่อง:
- ไฟล์ guard ใหม่ของ 2C ไฟล์เดียว `tests/form-migration-guards.test.ts` และ helper อ่าน JSX ใน `tests/helpers/source-files.ts`
- รายการ test เดิมที่ต้องแก้ ตามชุด (อ่านเนื้อทุกบรรทัดที่ `5ffee76` แล้ว)
- รายการ test ไฟล์ใหม่ทั้งหมด และส่วนที่เป็นเจ้าของเนื้อ assert
- pin ที่ formatter ทำพังได้ (critic ความเสี่ยงข้อ 6) และค่าตั้งต้นของทุก budget

ส่วนนี้ไม่ได้ถือ (ชี้ไปเจ้าของ แล้วหยุด):
- เนื้อ assert ของ primitive ใหม่แต่ละตัว (string ของ class, API, server-safe) → ส่วนที่ถือ K ของ primitive นั้น (ข้อ 3, 5, 6, 7) · ส่วนนี้กำหนดแค่ว่าอยู่ไฟล์ไหน (ข้อ 9.6)
- test ของการแก้บั๊ก ZodError → ข้อ 8.5.4
- เนื้อข้อความใหม่ และ test ข้อความ (`thai-glossary`, `messages-parity`) → ส่วนที่เพิ่ม key
- ตรวจบนแอป dev → ข้อ 8.8

path ที่ไม่ขึ้นด้วย `src/` หรือ `tests/` อยู่ใต้ `src/components/` · สคริปต์นับทั้งหมดอยู่ที่ `scratchpad/p2c-spec/scripts-09b/` (อ่านอย่างเดียว ไม่แตะ repo): `base.mjs` (รายชื่อไฟล์ตามชุด) · `jsx-tags.mjs` (ตัวอ่าน tag ตัวเดียวกับที่เสนอใน helper) · `fields.mjs` · `fieldclass.mjs` · `actions.mjs` · `extra.mjs` · `table.mjs` · `routes.mjs` · `pins.mjs` · ผลอยู่ใน `out-*.txt` ข้างกัน

### 9.1 ตัวเลขฐานที่ `5ffee76` (นับซ้ำ)

"ไฟล์ของ 2C" = 66 ไฟล์ในชุด 1a–5 ของข้อ 8.6/8.9 (รวม `signature-pad`, `operation-review-dialog`, `audit-scan-check-panel`, `maintenance-plan-state-actions`, `asset-import-preview-panel`, `asset-evidence-drawer`, `asset-create-workspace`, `ui/activity-drawer` และไฟล์ชุด 5)

| เรื่อง | ที่ `5ffee76` | เทียบแผนที่ |
|---|---|---|
| ช่องที่เขียนเอง (`<input>` ที่ไม่ใช่ checkbox/radio/hidden/file + `<select>` + `<textarea>`) | ทั้ง `src` 317 ใน 72 ไฟล์ (รวม primitive 2A 3 ไฟล์) · ไฟล์ของ 2C **273 ใน 51 ไฟล์** · ชุด 1 = 179 | ตรงกับ `critic-2c-fields-perfile.json` ทุกไฟล์ (281 = 273 + 8 ของ 2B และเฟส 3) · ข้อ 4.1 เขียน 272 เพราะไม่นับ `audit-scan-room-picker.tsx:75` |
| class string ของช่องที่เขียนเอง (นิยามใน GF3) | ไฟล์ของ 2C **232 ใน 49 ไฟล์** · ชุด 1 = 147 | ใหม่ |
| `function Field(` ของไฟล์ | 25 ไฟล์ · `<Field` 197 ครั้ง · มี `required` 71 ครั้ง | ตรง |
| `Field required` ที่ไม่ตรงกับ `required` ของช่อง | 4: `asset-operations/checkin-form.tsx:400` · `assets/asset-form.tsx:987`, `:1115` (ดอกจันอย่างเดียว) · `disposal/disposal-batch-form.tsx:118` (ช่องมี `required` แต่ไม่มีดอกจัน) | ตรงกับข้อ 4.1 และ 4.3 F5 |
| `required` / `maxLength` / `minLength` บนช่อง ตัวเลือก และ wrapper (ชุด tag ของ GF5) | **111 / 97 / 7 ใน 38 ไฟล์** (เฉพาะช่อง 87 / 97 / 7) | ข้อ 4.14 นับเฉพาะช่อง (87) |
| markup เก่าของป้าย ดอกจัน legend และ checkbox (regex GF7) | 132 ใน 40 ไฟล์ · นอกไฟล์ของ 2C 0 | ข้อ 4.16 G6–G9 = 46 + 32 + 48 + 6 |
| ช่องเงิน `step="0.01"` | 14 ใน 8 ไฟล์ · มี `inputMode="decimal"` 3 (`step={0.01}` อีก 2 ช่องใน `admin/depreciation-policy-builder.tsx:186`, `:241` เป็นร้อยละ ไม่นับ) | ตรง |
| `<Loader2` | ทั้ง `src` 93 ใน 60 ไฟล์ · ไฟล์ของ 2C **74 ใน 46 ไฟล์** (ในปุ่ม 62 · นอกปุ่ม 12) · หลัง 2C เหลือ **18 ใน 12 ไฟล์** | ข้อ 6.5.3 ให้ 16 ใน 10 ไฟล์: ขาด 3 จุด และนับ `disposal-bulk-execution.tsx:971` ที่ข้อ 5 ลบ (ข้อ 9.11) |
| tag ที่มี `busy=` | 34 (`AccessibleDialog` 22 · component อื่นที่รับ `busy` 11 · `Button` 1 `ui/data-freshness-banner.tsx:87`) · มี `disabled` ที่อ้างตัวแปรเดียวกัน **0** | — |
| `flex-col-reverse` | 10 บรรทัดใน 9 ไฟล์: `disposal-batch-form.tsx:84` · `asset-component-manager.tsx:373`, `:399` · `asset-form.tsx:1503` · `system-settings-form.tsx:1464` · `disposal-bulk-execution.tsx:939` · `maintenance-plan-state-actions.tsx:67` · `IntegrationClientManager.tsx:432` · `ui/alert-dialog.tsx:94` · `ui/dialog.tsx:112` | — |
| `<AccessibleDialog` | 23 ใน 19 ไฟล์ · `<form>` ที่อยู่ข้างใน 14 · `<AccessibleDialog>` ที่อยู่ใน `<form>` 1 (`system-settings-form.tsx:1347` ใน `:936`) และ dialog นั้นมีแต่ปุ่ม `type="button"` | ตรงกับ critic P13 |
| ชื่อปุ่มปิดภาษาอังกฤษ | `ui/dialog.tsx:54` และ `ui/sheet.tsx:51` `closeLabel = "Close"` · `ui/dialog.tsx:120` `>Close<` · `closeLabel={labels.cancel}` 2 (`IntegrationClientManager.tsx:395`, `system-settings-form.tsx:1352`) · `aria-label`/`title` ที่เป็น "Close" 0 | ตรงกับ K10 |
| แถบ `fixed` ด้านล่าง (class string ที่มี `fixed` และ `bottom-`) | ไฟล์ของ 2C 4: `asset-form.tsx:1501` · `asset-register-table.tsx:455` (ของ 2B) · `ui/mobile-action-bar.tsx:18` · `disposal/disposal-mobile-action-bar.tsx:21` | — |
| ตัวช่วยเก่าที่ต้องหาย (`function FormStep\|WizardStep\|Choice\|AssetStateFieldLabel` + `aria-label={t("batchAssetTagHelp")}`) | 8 ใน 7 ไฟล์ | ข้อ 7.9 และ 4.16 G10 |
| route ของหน้าใน `src/app/[locale]/(dashboard)` | 79 · หน้าฟอร์ม (`new`, `[id]/edit`, `admin/settings`) 31: focus 6 · navigation **25** · หน้ารายการที่เป็น focus โดยบังเอิญ 2 (`/maintenance/pm`, `/disposal/batches`) | ตรงกับข้อ 6.9 (25 route) |

ไม่ได้รัน `npm test` (ส่วนนี้อ่านอย่างเดียว) จึงไม่มีจำนวน test ฐาน · ทุก guard ในข้อ 9.3 ลองด้วยสคริปต์ `.mjs` ที่ใช้ตัวอ่านเดียวกันแล้ว ได้ค่าตามตาราง

### 9.2 ไฟล์ guard และ helper

**ไฟล์เดียว:** `tests/form-migration-guards.test.ts` (ชื่อตามข้อ 8.4 และ 6.11) สร้างในงาน 2C-0 0d · ไม่เพิ่ม guard ใน `tests/visual-foundation-guards.test.ts` ที่ 2B ก็แก้ (ข้อ 8.2 กฎ 6) · guard ที่ส่วนอื่นเสนอไว้รวมเข้าไฟล์นี้และใช้ชื่อใหม่ (ชื่อเดิมชนกัน: G2 ของข้อ 4 คือ budget ช่อง แต่ G2 ของข้อ 8 คือ busy)

| guard ส่วนนี้ | เดิม |
|---|---|
| GF1 `function Field` | ข้อ 4 G1 · ข้อ 8 G1 |
| GF2 ช่องที่เขียนเอง | ข้อ 4 G2 · ข้อ 8 G4 |
| GF3 class string ของช่อง | ใหม่ (critic §5 "per-file budget of hand-written field class strings") |
| GF4 `Field required` ↔ `required` | ข้อ 4 G3 · ข้อ 8 G3 · critic ความเสี่ยง 5 |
| GF5 floor ของ `required`/`maxLength`/`minLength` | ข้อ 4 G4 (ขยายชุด tag) |
| GF6 ช่องเงินมี `inputMode="decimal"` | ข้อ 4 G5 ส่วน `inputMode` (ส่วน key `*Baht` ยังเป็น test ข้อความของข้อ 4) |
| GF7 markup เก่าของป้าย ดอกจัน legend checkbox | ข้อ 4 G6–G9 (รวมเป็น regex เดียว) |
| GF8 ไม่มีป้ายซ้อน | ใหม่ (2A `06-fields.md` ความเสี่ยงข้อ 7) |
| GB1 `<Loader2` budget | ข้อ 6 G6 |
| GB2 spinner นอกปุ่มหยุดหมุนเมื่อลดการเคลื่อนไหว | ใหม่ (ขยายข้อ 6.5.3) |
| GB3 ไม่สลับป้ายตอน busy | ข้อ 6 G5 |
| GB4 `busy` ไม่ซ้ำใน `disabled` | ข้อ 6 G2 · ข้อ 8 G2 |
| GD1 ชื่อปุ่มปิด | ข้อ 5 E (ขยาย) |
| GD2 dialog ใช้ part ส่วนท้าย | ข้อ 5 B |
| GD3 ส่วนท้ายมีแต่ `Button` | ข้อ 5 C |
| GD4 ลำดับปุ่ม (K8) | ใหม่ + ส่วน `flex-col-reverse` ของข้อ 5 C |
| GD5 dialog ใน `<form>` ไม่มี `<form>` ของตัวเอง | ข้อ 5 D (ทำให้ใช้ได้ทุกไฟล์) |
| GD6 `<form>` ที่ห่อส่วนท้ายเป็น flex column | ข้อ 3 ตาราง B (guard ใน `form-dialog-primitives`) |
| GL1 `StickyFormFooter` ไม่ `fixed` และอยู่บน focus route | บางข้อของข้อ 6 `sticky-form-footer-ui` + ใหม่ |
| GL2 route ฟอร์มซ่อนเมนูล่าง (K15) | ใหม่ (อ่านจากโฟลเดอร์ route) |
| GL3 ตัวช่วยเก่าหาย | ข้อ 7.9 + ข้อ 4 G10 |

**helper ที่เพิ่มใน `tests/helpers/source-files.ts`** (งาน 0d · ของเดิม 3 ฟังก์ชันไม่แก้) · ตัวอ่านเดียวกับ `scripts-09b/jsx-tags.mjs` ที่ใช้นับตัวเลขในส่วนนี้ ได้ 273 ช่อง · 197 `<Field` · 23 `<AccessibleDialog` เท่ากับ AST ของ critic

```ts
export type JsxTag = { name: string; start: number; end: number; line: number; text: string; selfClosing: boolean }
export type JsxElement = JsxTag & { children: string | null; closeEnd: number }

// ตำแหน่งหลัง ">" ที่ปิด opening tag · ข้าม {…}, ค่าใน "…" '…' `…` และ comment ใน {…}
// ดังนั้น `=>` และ `[&>svg]` ไม่ปิด tag · -1 ถ้าไฟล์จบก่อน
export function endOfOpeningTag(source: string, from: number): number
// names เป็น regex ทีละชื่อ (เช่น "input", "[A-Z][\\w.]*") · ข้ามบรรทัดที่ขึ้นต้นด้วย // /* *
export function findJsxTags(source: string, names: readonly string[]): JsxTag[]
// opening tag ถึง closing tag ของชื่อเดียวกัน (นับ tag ซ้อนชื่อเดียวกัน) · children = null ถ้าหา closing ไม่เจอ
export function findJsxElements(source: string, name: string): JsxElement[]
// ค่าใน {…} หรือ "…" · "" ถ้าเป็น attribute เปล่า · null ถ้าไม่มี (ไม่ดูชื่อที่อยู่ใน {…})
export function jsxAttrValue(tagText: string, attr: string): string | null
export function hasJsxAttr(tagText: string, attr: string): boolean
export function countByFile(files: SourceFile[], count: (file: SourceFile) => number, allow?: (path: string) => boolean): Record<string, number>
// "path: count > budget" ของทุกไฟล์ที่เกิน · ไฟล์ที่ไม่อยู่ใน budget ได้ 0
export function budgetOverruns(counts: Record<string, number>, budget: Record<string, number>): string[]
```

**โครงไฟล์ guard**

```ts
import assert from "node:assert/strict"
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { getMobileShellMode } from "../src/lib/mobile-field-navigation.ts"
import { budgetOverruns, countByFile, countMatchesByFile, findJsxElements, findJsxTags, findMatches, hasJsxAttr, jsxAttrValue, readSourceFiles } from "./helpers/source-files.ts"

const sources = readSourceFiles("src")
const C = "src/components/"
// ไฟล์ของ 2C ตามชุด (ข้อ 8.6, 8.9) · path ใต้ src/components/
const BATCH_FILES = { "1a": [/* … */], "1b": [], "1c": [], "1d": [], "1g": [], "1e": [], "1f": [], "2": [], "3": [], "4": [], "5": [] } as const
// primitive ที่ 2C สร้าง: ต้องผ่านทุก guard ตั้งแต่วันแรก
const NEW_2C_FILES = ["ui/segmented.tsx", "ui/sticky-form-footer.tsx", "ui/form-section.tsx", "ui/choice-card.tsx", "ui/file-queue-list.tsx", "ui/steps.tsx", "ui/action-bar.tsx"].map((p) => C + p)
// ไฟล์ที่ย้ายแล้ว · commit ของแต่ละไฟล์เพิ่มชื่อตัวเองพร้อมกับลด budget (ข้อ 4.3 F8) · ห้ามลบ
const MIGRATED_FILES: string[] = []
const owned = new Set([...Object.values(BATCH_FILES).flat().map((p) => C + p), ...NEW_2C_FILES])
const migrated = new Set([...NEW_2C_FILES, ...MIGRATED_FILES])
const notOwned = (path: string) => !owned.has(path)
const migratedSources = () => sources.filter((file) => migrated.has(file.path))
const read = (path: string) => sources.find((file) => file.path === path)?.source ?? ""

// เหมือน assertWithinBudget ของ visual-foundation-guards.test.ts:203 แต่รับ counts ที่นับแล้ว (นับด้วย JSX ได้)
function assertWithinBudget(counts: Record<string, number>, budget: Record<string, number>, what: string) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  assert.deepEqual(budgetOverruns(counts, budget), [], `${what}: ${total} in ${Object.keys(counts).length} files. Lower a number in the task that removes a site; never raise one. Phase 2D widens every guard to all of src and sets the budgets to {}.`)
}
```

- budget ของ GF1, GF2, GF3, GF7, GB1, GL1c และ GL3 นับเฉพาะไฟล์ของ 2C (`owned`) · ไฟล์ของ 2B, 2D และเฟส 3 จึงไม่ต้องอยู่ในไฟล์นี้ และ 2B ไม่ต้องแก้ไฟล์นี้เลย · ไฟล์ใหม่ที่ 2C สร้างได้ 0 ทุกตัว
- GF4, GF6, GF8, GB2 และ GB3 ตรวจเฉพาะไฟล์ใน `migrated`
- GB4, GD1–GD6, GL1a–b และ GL2 ตรวจทั้ง `src`

### 9.3 guard ทีละข้อ

| ID | ตรวจ | วิธี (ไฟล์ที่ตรวจ) | ที่ `5ffee76` | หลัง 2C | ลงงาน |
|---|---|---|---|---|---|
| GF1 | ไม่มี `function Field(` ของไฟล์ | `countMatchesByFile(sources, /\bfunction Field\s*\(/g, notOwned)` ≤ `LOCAL_FIELD` (owned) | 25 ไฟล์ × 1 | `{}` | 0d · ลดทุกไฟล์ที่ย้าย |
| GF2 | ช่องที่เขียนเองไม่เพิ่ม | `findJsxTags(…, ["input","select","textarea"])` ไม่นับ `type` checkbox/radio/hidden/file ≤ `RAW_FIELDS` (owned) | 273 ใน 51 ไฟล์ | `{ "…/assets/asset-label-print.tsx": 2, "…/audit/audit-scan-room-picker.tsx": 1 }` (แถบเครื่องมือ K21 · `:75` O20) | 0d |
| GF3 | class string ของช่องที่เขียนเองไม่เพิ่ม | string ใน `"…"` บรรทัดเดียว ที่ `isFieldClassString` เป็นจริง ≤ `FIELD_CLASS_STRINGS` (owned) | 232 ใน 49 ไฟล์ | `{}` | 0d |
| GF4 | `Field` ที่มีดอกจันยังมี `required` บนช่อง และกลับกัน · ไม่มี `SearchableSelect` ใน `Field` | ทุก `findJsxElements(…, "Field")` ใน `migrated`: ช่องตัวแรกใน children จาก `CONTROL_TAGS` · ยกเว้น `STAR_ONLY` 3 จุด · ไฟล์ที่มีทั้ง `noValidate` และ `validate(` (V track) ไม่ต้องมี `required` บนช่อง | 4 ไม่ตรง (ข้อ 9.1) | 0 นอก `STAR_ONLY` | 0d |
| GF5 | `required` `maxLength` `minLength` ไม่หายเงียบ | นับ attribute บน `CONSTRAINT_TAGS` ต่อไฟล์ ≥ `CONSTRAINT_FLOORS` | 111/97/7 ใน 38 ไฟล์ | ไม่น้อยกว่าเดิม | 0d |
| GF6 | ช่องเงินเปิดแป้นทศนิยม (K26) | ทุก tag `Input`/`input` ที่มี `step="0.01"` ใน `migrated` มี `inputMode="decimal"` | 3 จาก 14 | 14 จาก 14 | 0d |
| GF7 | ป้าย ดอกจัน legend และ checkbox แบบเก่าไม่เพิ่ม | `countMatchesByFile(sources, OLD_FIELD_MARKUP, notOwned)` ≤ `OLD_MARKUP` | 132 ใน 40 ไฟล์ | checkbox ของ 2B 7 (ข้อ 9.4) | 0d |
| GF8 | ไม่มีป้ายซ้อน | ใน `migrated` ทุก `<label>` ไม่มี `<Field`, `<FileDropzone`, `<ScannerTextInput`, `<SearchableSelect`, `<label` ใน children | 0 แบบ lexical (3 จุดซ้อนผ่าน `Field` ของไฟล์ที่ render `<label>`: `checkout-form.tsx:306`, `asset-batch-form.tsx:869`, `asset-form.tsx:896` · หายเมื่อ GF1 เป็น 0) | 0 | 0d |
| GB1 | ไม่มี spinner เขียนเองเหลือ | `countMatchesByFile(sources, /<Loader2\b/g, notOwned)` ≤ `LOADER2` · นับทุก tag ไม่ใช่แค่ในปุ่ม จึงจับไอคอนที่เก็บในตัวแปรได้ (`audit-mark-not-found-button.tsx:64`) | 74 ใน 46 ไฟล์ | 18 ใน 12 ไฟล์ (ข้อ 9.4) | 0d |
| GB2 | spinner ที่เหลือนอกปุ่มหยุดหมุนเมื่อผู้ใช้ลดการเคลื่อนไหว | ใน `migrated`: `<Loader2` ที่ไม่อยู่ใน children ของ `<Button>`/`<button>` ต้องมี `motion-reduce:animate-none` | 12 tag ไม่มี | 0 | 0d |
| GB3 | ป้ายไม่สลับตอน busy (K13) | ไฟล์ใน `BUSY_LABEL_SWAPS` ที่อยู่ใน `migrated` ต้องไม่มีนิพจน์ของตัวเอง | 10 จุดใน 8 ไฟล์ | 0 | 0d |
| GB4 | `disabled` ไม่มีตัวแปรของ `busy` (โฟกัสไม่หลุด) | ทุก tag ใน `src` ที่มี `busy={A}` และ `disabled={B}`: B ต้องไม่มี A แบบเต็มคำ (`(?<![\w.$])A(?![\w$])`) · `syncingLdap === "preview"` กับ `syncingLdap === "apply"` ผ่าน | 0 จาก 34 tag | 0 | 0d |
| GD1 | ชื่อปุ่มปิดไม่ใช่ภาษาอังกฤษ และไม่ใช่ "ยกเลิก" | `ui/{dialog,sheet,alert-dialog,accessible-dialog}.tsx` ไม่มี `/"Close"\|>\s*Close\s*</` · `findMatches(sources, LITERAL_CLOSE_LABEL)` เป็น `[]` · `countMatchesByFile(sources, CLOSE_IS_CANCEL)` ≤ `CLOSE_LABEL_IS_CANCEL` (`copy.cancelPreview` ของ `disposal-bulk-execution.tsx:818` ไม่เข้า เพราะ `\bcancel\b`) | 3 + 2 | 0 · `{}` | 0d (หลัง 0a) |
| GD2 | dialog ที่ย้ายแล้วใช้ part ส่วนท้าย | ทุกไฟล์ที่มี `<AccessibleDialog` (ไม่นับ `ui/accessible-dialog.tsx`): จำนวน `<AccessibleDialogFooter` ≥ จำนวน `<AccessibleDialog` · ไฟล์ใน `PENDING_FOOTER_PARTS` ต้อง**ยังไม่มี** part และยังมี `<AccessibleDialog` (ชุดไม่ค้าง) | 19 ไฟล์ pending | ชุดว่าง (หลังชุด 5) | 0d |
| GD3 | ส่วนท้าย dialog มีแต่ `Button` | ทุก `findJsxElements(…, "AccessibleDialogFooter")`: children ไม่มี `/<button(?=[\s/>])\|<Loader2\b\|className=\|flex-col-reverse\|\bsticky\b\|opacity-/` | ยังไม่มี part | 0 | 0d |
| GD4 | ปุ่มรองก่อนปุ่มหลัก ไม่เรียงกลับ (K8) | ใน `<AccessibleDialogFooter>` และ `<StickyFormFooter>`: ตำแหน่งแรกของ `/<AccessibleDialogCancel\b\|variant(?:=\|: )"outline"/` < ตำแหน่งแรกของ `type="submit"` (ถ้ามีทั้งคู่) · `countMatchesByFile(sources, /\bflex-col-reverse\b/g, (p) => notOwned(p) && !p.startsWith(C + "ui/"))` ≤ `REVERSE` | 10 บรรทัดใน 9 ไฟล์ | `{}` | 0d |
| GD5 | dialog ที่อยู่ใน `<form>` ไม่มี `<form>` หรือปุ่ม submit ของตัวเอง (P13, R4) | ทุก `<form>` ใน `src` → ทุก `<AccessibleDialog>` ใน children → children ไม่มี `/<form(?=[\s/>])\|type="submit"/` | 1 คู่ ผ่าน | ผ่าน | 0d |
| GD6 | `<form>` ที่ห่อส่วนท้ายเป็น flex column (ส่วนท้ายติดล่างจริง) | ทุก `<form>` ที่ children มี `<AccessibleDialogFooter` ต้องมี `className={accessibleDialogFormClasses}` (ค่าตรงตัว) | ยังไม่มี part | ผ่าน | 0d |
| GL1 | แถบบันทึกฟอร์มยาวเป็น sticky แบน และอยู่บน focus route เท่านั้น | (a) `ui/sticky-form-footer.tsx` มี `\bsticky\b` และไม่มี `/\bfixed\b\|\bshadow-\|backdrop-blur\|\bbg-[\w-]+\/\d+/` · (b) ทุกไฟล์ที่มี `<StickyFormFooter` อยู่ใน `STICKY_FOOTER_ROUTES` และทุก route ของมันได้ `getMobileShellMode(route) === "focus"` · (c) class string ที่มีทั้ง `fixed` และ `bottom-` ≤ `FIXED_BOTTOM_BARS` (owned) | (c) 4 | (c) `asset-register-table.tsx` 1 (2B) + `ui/action-bar.tsx` 1 | 0d · (b) ใช้จริงใน 1e, 1f |
| GL2 | route ฟอร์มซ่อนเมนูล่าง หน้ารายการคงไว้ (K15) | อ่านทุก `page.tsx` ใต้ `src/app/[locale]/(dashboard)` · route ที่ลงท้าย `/new`, `/[…]/edit` หรือเป็น `admin/settings` ต้องได้ `"focus"` · route ที่ไม่มี `[` และไม่ใช่ 4 หน้างาน `asset-management/{checkout,checkin,transfer,bulk-move}` ต้องได้ `"navigation"` · `[…]` แทนด้วย `sample-1` | ผิด 27 (ฟอร์ม 25 + หน้ารายการ 2) | 0 | **1f** (commit K15) |
| GL3 | ตัวช่วยเก่าหาย | `/\bfunction (?:FormStep\|WizardStep\|Choice\|AssetStateFieldLabel)\b\|aria-label=\{t\("batchAssetTagHelp"\)\}/g` ≤ `OLD_HELPERS` (owned) | 8 ใน 7 ไฟล์ | `{}` | 0d |
| — | ตัวอ่าน JSX ทำงานถูก | test ตัวอย่างของ helper (ข้างล่าง) | — | — | 0d |

**ค่าคงที่ที่ใช้ร่วม**

```ts
const NON_FIELD_INPUT = /^(?:checkbox|radio|hidden|file)$/
const CONTROL_TAGS = ["Input", "NativeSelect", "Textarea", "SearchField", "ScannerTextInput", "FileDropzone", "input", "select", "textarea", "Select", "SelectField", "QueueSelect"]
const CONSTRAINT_TAGS = [...CONTROL_TAGS, "ChoiceCard", "ChoiceChip"]
// "class string" = string ใน "…" บรรทัดเดียว (นิยามเดียวกับ visual-foundation-guards.test.ts:177)
const isFieldClassString = (text: string) =>
  !/\bhover:/.test(text) &&
  (/\bfocus(?:-visible)?:border-ring\b/.test(text) ||
    (/\bborder-(?:border|input)\b/.test(text) && /\brounded(?:-md)?\b/.test(text) && /\b(?:px-3|px-2|pl-9|pl-10)\b/.test(text) &&
      /\b(?:w-full|min-h-\d+|h-(?:9|10|11))\b/.test(text) && !/\b(?:inline-flex|flex|grid|justify-center|font-medium|font-semibold)\b|\bfile:/.test(text)))
// GD1: ค่าตั้งต้นหรือค่าที่ส่งเป็น string ตรง ๆ (ทั้งอังกฤษและไทย ต้องมาจาก tCommon("close") หรือ key) · ป้าย X ภาษาอังกฤษ
const LITERAL_CLOSE_LABEL = /closeLabel(?:Prop)?\s*=\s*"|closeLabel=\{["`]|(?:aria-label|title)="(?:Close|Cancel|Dismiss)"/g
const CLOSE_IS_CANCEL = /closeLabel=\{[^}]*\bcancel\b[^}]*\}/g
const OLD_FIELD_MARKUP = /ml-1 text-danger">\*|mb-1\.5 block text-sm font-medium text-foreground|<legend className="mb-2 text-sm font-medium text-foreground"|\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b/g
// ดอกจันที่เซิร์ฟเวอร์บังคับแต่ช่องไม่มี required (ข้อ 4.3 F5) · ระบุด้วยนิพจน์ label ไม่ใช่เลขบรรทัด
const STAR_ONLY = new Set([`${C}asset-operations/checkin-form.tsx|t("returnDate")`, `${C}assets/asset-form.tsx|t("licenseTotalSeats")`, `${C}assets/asset-form.tsx|t("componentRole")`])
const BUSY_LABEL_SWAPS: Record<string, RegExp> = {
  [`${C}admin/asset-state-review-dialog.tsx`]: /labels\.saving\b/,                              // :102
  [`${C}asset-operations/checkin-form.tsx`]: /t\("legacyReturnCreating"\)/,                     // :389
  [`${C}assets/asset-batch-form.tsx`]: /t\("batchCheckDuplicatesRunning"\)/,                    // :802
  [`${C}assets/asset-component-manager.tsx`]: /labels\.(?:installing|removing)\b/,              // :405, :580
  [`${C}assets/asset-status-correction-button.tsx`]: /labels\.submitting\b/,                    // :96
  [`${C}auth/login-form.tsx`]: /t\("loggingIn"\)/,                                              // :142
  [`${C}assets/asset-import-preview-panel.tsx`]: /\$\{labels\.chooseFile\}\.\.\.|labels\.importing\b/, // :216, :393
  [`${C}assets/asset-label-print.tsx`]: /translations\.recordingPrint\b/,                       // :261
}
const STICKY_FOOTER_ROUTES: Record<string, string[]> = {
  [`${C}assets/asset-form.tsx`]: ["/th/assets/new", "/th/assets/sample-1/edit"],
  [`${C}admin/system-settings-form.tsx`]: ["/th/admin/settings"],
}
```

ทุกนิพจน์ใน `BUSY_LABEL_SWAPS` มีที่เดียวในไฟล์ของมันที่ `5ffee76` (ตรวจแล้ว) จึงใช้ "ไม่มีเลย" ได้

**GF4 (ข้อที่ซับซ้อนที่สุด)**

```ts
test("GF4 a Field that shows the required star keeps native required on its control (critic risk 5)", () => {
  const problems: string[] = []
  for (const file of migratedSources()) {
    const vTrack = /\bnoValidate\b/.test(file.source) && /\bvalidate\(/.test(file.source)
    for (const field of findJsxElements(file.source, "Field")) {
      const where = `${file.path}:${field.line}`
      const children = field.children ?? ""
      if (findJsxTags(children, ["SearchableSelect"]).length > 0) problems.push(`${where}: SearchableSelect inside Field`)
      // ช่องตัวแรก (input file นับ · checkbox, radio, hidden ไม่นับ)
      const control = findJsxTags(children, CONTROL_TAGS).find((tag) => !/^(?:checkbox|radio|hidden)$/.test(jsxAttrValue(tag.text, "type") ?? ""))
      const star = hasJsxAttr(field.text, "required")
      const native = control ? hasJsxAttr(control.text, "required") : /\brequired\b/.test(children)
      const exempt = STAR_ONLY.has(`${file.path}|${jsxAttrValue(field.text, "label")}`)
      if (star && !native && !vTrack && !exempt) problems.push(`${where}: star without native required (the only browser check would disappear)`)
      if (native && !star) problems.push(`${where}: native required without the star`)
    }
  }
  assert.deepEqual(problems, [])
})
```

**GL2**

```ts
function dashboardRoutes(dir = "src/app/[locale]/(dashboard)", prefix = ""): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return dashboardRoutes(path, prefix ? `${prefix}/${entry}` : entry)
    return entry === "page.tsx" ? [prefix] : []
  })
}
const TASK_ROUTES = new Set(["asset-management/checkout", "asset-management/checkin", "asset-management/transfer", "asset-management/bulk-move"])
test("GL2 form routes hide the bottom navigation and list routes keep it (K15)", () => {
  const wrong: string[] = []
  for (const route of dashboardRoutes()) {
    const mode = getMobileShellMode(`/th/${route.replace(/\[[^\]]+\]/g, "sample-1")}`)
    const isForm = /(?:^|\/)new$|\/\[[^\]]+\]\/edit$/.test(route) || route === "admin/settings"
    const isList = !route.includes("[") && !isForm && !TASK_ROUTES.has(route)
    if (isForm && mode !== "focus") wrong.push(`${route}: ${mode}, a form route must be focus`)
    if (isList && mode !== "navigation") wrong.push(`${route}: ${mode}, a list route keeps the bottom navigation`)
  }
  assert.deepEqual(wrong, [])
})
```

**test ของ helper** (ใส่ในไฟล์ guard)

```ts
test("the JSX tag reader skips arrows, selectors and braces", () => {
  const source = '<input onChange={(e) => set(e.target.value)} className="[&>svg]:size-4" required />\n<Field label={t("a")} required>\n  <Input value={x > 1 ? "a" : "b"} />\n</Field>'
  const [input] = findJsxTags(source, ["input"])
  assert.equal(hasJsxAttr(input.text, "required"), true)
  assert.equal(jsxAttrValue(input.text, "className"), "[&>svg]:size-4")
  const [field] = findJsxElements(source, "Field")
  assert.equal(field.line, 2)
  assert.match(field.children ?? "", /<Input value=/)
  assert.equal(hasJsxAttr("<Input value={required} />", "required"), false)
  assert.deepEqual(budgetOverruns({ "src/a.tsx": 2, "src/b.tsx": 1 }, { "src/a.tsx": 2 }), ["src/b.tsx: 1 > 0"])
})
```

### 9.4 ค่าตั้งต้นต่อไฟล์ (seed ของ budget และ floor)

ค่าในตารางคือค่าที่ `5ffee76` · `n→r` = ต้องเหลือ r หลังไฟล์นั้นย้าย (ที่เหลือเป็นของ 2B, 2D หรือคงไว้ตามเหตุผลในคอลัมน์ท้าย) · ไม่มีลูกศร = ต้องเป็น 0 · "–" = 0 ตั้งแต่ต้น · GF5 = required/maxLength/minLength (floor ไม่ลดลง) · GD2 = จำนวน `<AccessibleDialog` (ไฟล์ที่มีค่าอยู่ใน `PENDING_FOOTER_PARTS` จนถึงชุดของมัน)

| ชุด | ไฟล์ | GF1 | GF2 | GF3 | GF7 | GB1 | GD4 | GD2 | GL3 | GF5 | ที่เหลือ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0a | `ui/dialog.tsx` | – | – | – | – | – | 1 | – | – | – | `DialogFooter` :112 (ข้อ 3.6) |
| 1a | `maintenance/maintenance-plan-form.tsx` | 1 | 5 | 5 | 2 | 1 | – | – | – | 4/2/0 | |
| 1a | `maintenance/repair-record-form.tsx` | 1 | 5 | 2 | 7 | 1 | – | – | 1 | 2/3/0 | |
| 1a | `maintenance/repair-record-actions.tsx` | 1 | 10 | 2 | 5 | 2 | – | 3 | – | 3/6/0 | |
| 1a | `maintenance/maintenance-attachments.tsx` | – | 1 | 1 | 1 | 1→1 | – | 1 | – | – | GB1 :210 ปุ่มลบของ 2D · GD2 ค้างถึงชุด 5 (K12) |
| 1b | `asset-operations/checkin-form.tsx` | 1 | 7 | 7 | 2 | 2 | – | – | – | 4/0/0 | |
| 1b | `asset-operations/checkout-form.tsx` | 1 | 4 | 4 | 5 | 1 | – | – | – | 6/0/0 | |
| 1b | `asset-operations/transfer-form.tsx` | 1 | 2 | 2 | 2 | 1 | – | – | – | 1/1/0 | |
| 1b | `asset-operations/bulk-move-form.tsx` | 1 | 3 | 2 | 4 | 1 | – | – | – | 1/1/0 | |
| 1b | `asset-operations/signature-pad.tsx` | – | – | – | – | – | – | – | – | – | |
| 1b | `ui/operation-review-dialog.tsx` | – | – | – | – | – | – | 1 | – | – | |
| 1c | `disposal/disposal-request-form.tsx` | 1 | 4 | 4 | 2 | 1 | – | – | 1 | 3/1/1 | |
| 1c | `disposal/disposal-batch-form.tsx` | 1 | 4 | 4 | 1 | 1 | 1 | – | 1 | 1/1/1 | GD4 :84 แถวท้ายฟอร์ม |
| 1c | `disposal/disposal-execution-button.tsx` | 1 | 8 | 8 | 4 | 1 | – | 1 | – | 8/4/1 | |
| 1c | `disposal/disposal-asset-picker.tsx` | – | 1 | 1 | 1 | 1→1 | – | – | – | – | GB1 :58 spinner ในช่องค้นหา |
| 1c | `disposal/disposal-decision-button.tsx` | 1 | 5 | 5 | 2 | 1 | – | 1 | – | 3/1/0 | |
| 1d | `audit/audit-scan-check-form.tsx` | – | 2 | 2 | – | 2→1 | – | – | – | – | GB1 :242 หัวข้อพับได้ (ข้อ 6.14) |
| 1d | `audit/audit-finding-review-actions.tsx` | – | 5 | 5 | 5 | 5→2 | – | 3 | – | 1/3/0 | GB1 :102, :112 trigger ที่แถวของ 2B (O21) |
| 1d | `audit/audit-mark-not-found-button.tsx` | – | 1 | 1 | – | 2 | – | 1 | – | – | |
| 1d | `audit/audit-scan-component-missing-dialog.tsx` | – | 1 | 1 | – | 1 | – | 1 | – | – | |
| 1g | `master-data/asset-model-form.tsx` | 1 | 6 | 6 | 3 | 2 | – | – | – | 3/1/0 | |
| 1e | `assets/asset-form.tsx` | 1 | 27 | 27 | 10 | 1 | 1 | – | 1 | 12/10/0 | GL3 `AssetStateFieldLabel` :1544 |
| 1e | `assets/asset-batch-form.tsx` | 1 | 13 | 1 | 5 | 2 | – | – | 2 | 10/5/0 | GL3 `aria-label={t("batchAssetTagHelp")}` :866, :917 |
| 1e | `assets/asset-component-manager.tsx` | – | 5 | 5 | 4 | 3→1 | 2 | 1 | – | 0/4/0 | GB1 :474 บรรทัดสถานะ |
| 1e | `assets/asset-attachments.tsx` | – | 1 | 1 | – | 2 | – | – | – | – | |
| 1f | `admin/system-settings-form.tsx` | 1 | 50 | 48 | 4 | 4 | 1 | 1 | 1 | 0/1/0 | |
| 1f | `admin/depreciation-policy-builder.tsx` | – | 9 | 3 | – | – | – | – | – | – | |
| 2 | `master-data/branch-form.tsx` | 1 | 5 | 5 | 3 | 1 | – | – | – | 3/4/0 | |
| 2 | `master-data/brand-form.tsx` | – | 1 | 1 | 3 | 1 | – | – | – | 1/1/0 | |
| 2 | `master-data/category-form.tsx` | 1 | 9 | 9 | 4 | 1 | – | – | – | 4/7/0 | |
| 2 | `master-data/company-form.tsx` | 1 | 6 | 6 | 3 | 1 | – | – | – | 2/6/0 | |
| 2 | `master-data/department-form.tsx` | 1 | 3 | 3 | 3 | 1 | – | – | – | 2/2/0 | |
| 2 | `master-data/employee-form.tsx` | 1 | 10 | 10 | 3 | 1 | – | – | – | 6/5/0 | |
| 2 | `master-data/location-form.tsx` | 1 | 6 | 6 | 3 | 1 | – | – | – | 4/3/0 | |
| 2 | `master-data/supplier-form.tsx` | 1 | 6 | 1 | 3 | 1 | – | – | – | 2/6/0 | |
| 3 | `disposal/disposal-bulk-approval.tsx` | – | 1 | 1 | 3→2 | 4→3 | – | 1 | – | 0/1/0 | GF7 checkbox :456, :499 ของ 2B · GB1 :424 (2B) + :546, :547 บรรทัดสถานะ |
| 3 | `disposal/disposal-bulk-execution.tsx` | – | 5 | 5 | 5→2 | 2→1 | 1 | 1 | – | 5/2/1 | GF7 checkbox :689, :738 ของ 2B · GB1 :993 `BusyLabel` (:971 หายตาม GD3) |
| 3 | `audit/audit-round-form.tsx` | 1 | 6 | 6 | 3 | 2 | – | – | – | 7/1/0 | |
| 3 | `audit/audit-round-cancel-button.tsx` | – | 1 | 1 | – | 2 | – | 1 | – | 1/0/0 | |
| 3 | `audit/audit-findings-batch-actions.tsx` | – | – | – | 1→1 | 2→2 | – | – | – | – | checkbox :113 และปุ่ม :88, :97 ของ 2B (O5) |
| 3 | `audit/audit-scan-room-picker.tsx` | – | 2→1 | – | – | – | – | – | – | – | `:75` ไม่แตะ (O20) |
| 3 | `audit/audit-scan-check-panel.tsx` | – | – | – | – | – | – | – | – | – | |
| 3 | `maintenance/maintenance-plan-state-actions.tsx` | – | – | – | – | 1 | 1 | 1 | – | – | |
| 3 | `ui/confirm-text-dialog.tsx` | – | 1 | 1 | – | – | – | 1 | – | – | |
| 4 | `admin/admin-user-form.tsx` | 1 | 5 | 5 | 4 | 1 | – | – | – | 3/4/1 | |
| 4 | `admin/role-permission-form.tsx` | 1 | 4 | 4 | 5 | 1 | – | – | – | 2/3/0 | |
| 4 | `admin/IntegrationClientManager.tsx` | – | 3 | 3 | 5 | 4→2 | 1 | 1 | – | 3/3/1 | GB1 :528 บรรทัดสถานะ · :863 ปุ่มแถวของ 2D |
| 4 | `admin/asset-state-review-dialog.tsx` | – | 3 | 3 | – | – | – | 1 | – | 1/1/1 | |
| 4 | `admin/data-quality-rule-form.tsx` | – | 1 | 1 | 1 | – | – | – | – | – | |
| 4 | `assets/asset-label-batch-tool.tsx` | – | 4 | 4 | 1 | 2→2 | – | – | – | – | GB1 :321, :469 บรรทัดสถานะ |
| 4 | `assets/asset-label-print.tsx` | – | 2→2 | – | – | 1 | – | – | – | 0/1/0 | GF2 แถบเครื่องมือ :225, :236 (K21) |
| 4 | `assets/asset-scan-search-tool.tsx` | – | – | – | 1 | 1→1 | – | – | – | – | GB1 :146 บรรทัดสถานะ |
| 4 | `assets/asset-status-correction-button.tsx` | – | 1 | 1 | – | – | – | – | – | – | |
| 4 | `assets/asset-register-table.tsx` | – | 4 | 4 | 6→2 | 1 | – | 1 | – | 1/1/0 | GF7 checkbox :549, :620 ของ 2B (O1) |
| 4 | `assets/asset-import-preview-panel.tsx` | – | – | – | – | – | – | – | 1 | – | |
| 4 | `asset-operations/transaction-cancel-dialog.tsx` | – | 1 | 1 | – | 2→1 | – | 1 | – | 0/1/0 | GB1 :131 บรรทัดสถานะ |
| 4 | `auth/login-form.tsx` | – | 2 | 2 | 2 | 1 | – | – | – | 2/0/0 | |
| 4 | `reports/report-preset-controls.tsx` | – | 1 | 1 | 1 | – | – | – | – | 0/1/0 | |
| 4 | `notifications/notification-center-actions.tsx` | – | 1 | 1 | – | – | – | – | – | – | |
| 5 | `ui/alert-dialog.tsx` | – | – | – | – | – | 1 | – | – | – | `:94` (ข้อ 9.11 ข้อ 6) |

ไฟล์ของ 2C ที่ไม่มีแถวในตาราง (0 ทุกคอลัมน์): `assets/asset-evidence-drawer.tsx`, `assets/asset-create-workspace.tsx`, `ui/activity-drawer.tsx`, `disposal/disposal-workflow-stepper.tsx`, `ui/confirm-dialog.tsx`, `ui/mobile-action-bar.tsx`, `disposal/disposal-mobile-action-bar.tsx` · 2 ไฟล์สุดท้ายมีค่าแค่ใน GL1c (`FIXED_BOTTOM_BARS` ข้างล่าง)

GL3 รวม 8 ใน 7 ไฟล์: `Choice` 1 · `FormStep` 2 · `WizardStep` 2 · `AssetStateFieldLabel` 1 · `batchAssetTagHelp` 2

budget เล็กที่เขียนเต็ม:

```ts
const CLOSE_LABEL_IS_CANCEL = { [`${C}admin/system-settings-form.tsx`]: 1, [`${C}admin/IntegrationClientManager.tsx`]: 1 } // 1f → ลบแถวแรก · 4 → {}
const FIXED_BOTTOM_BARS = {
  [`${C}assets/asset-form.tsx`]: 1,                    // :1501 → StickyFormFooter (1e) แล้วลบแถว
  [`${C}assets/asset-register-table.tsx`]: 1,          // :455 แถบเลือกหลายรายการบนมือถือ (2B / เฟส 3)
  [`${C}ui/mobile-action-bar.tsx`]: 1,                 // :18 } ชุด 5: ลบทั้ง 2 ไฟล์
  [`${C}disposal/disposal-mobile-action-bar.tsx`]: 1,  // :21 } แล้วเพิ่ม "ui/action-bar.tsx": 1
}
const PENDING_FOOTER_PARTS = new Set([/* 19 ไฟล์ในคอลัมน์ GD2 */])
```

**ผลรวมต่อชุด** (ค่าที่ลดลงเมื่อชุดนั้นเสร็จ)

| ชุด | ไฟล์ | GF1 | GF2 | GF3 | GF7 | GB1 (→ เหลือ) | GD4 | dialog (ไฟล์) | GL3 | GF5 floor |
|---|---|---|---|---|---|---|---|---|---|---|
| 0a | 1 | – | – | – | – | – | 1 (+ `alert-dialog` 1 ถ้าทำตามข้อ 8) | – | – | – |
| 1a | 4 | 3 | 21 | 10 | 15 | 5 (→1) | – | 4 (2) · ลด pending 1 ไฟล์ | 1 | 9/11/0 |
| 1b | 6 | 4 | 16 | 15 | 13 | 5 (→0) | – | 1 (1) | – | 12/2/0 |
| 1c | 5 | 4 | 22 | 22 | 10 | 5 (→1) | 1 | 2 (2) | 2 | 15/7/3 |
| 1d | 4 | – | 9 | 9 | 5 | 10 (→3) | – | 5 (3) | – | 1/3/0 |
| 1g | 1 | 1 | 6 | 6 | 3 | 2 (→0) | – | – | – | 3/1/0 |
| 1e | 4 | 2 | 46 | 34 | 19 | 8 (→1) | 3 | 1 (1) | 3 | 22/19/0 |
| 1f | 2 | 1 | 59 | 51 | 4 | 4 (→0) | 1 | 1 (1) | 1 | 0/1/0 |
| **ชุด 1** | **26** | **15** | **179** | **147** | **69** | **39 (→6)** | **5** | **14 (10)** | **7** | 62/44/3 |
| 2 | 8 | 7 | 46 | 41 | 25 | 8 (→0) | – | – | – | 24/34/0 |
| 3 | 9 | 1 | 16 (→1) | 14 | 12 (→5) | 13 (→6) | 2 | 5 (5) | – | 13/4/1 |
| 4 | 18 | 2 | 32 (→2) | 30 | 26 (→2) | 14 (→6) | 1 | 4 (4) | 1 | 12/15/3 |
| 5 | 5 | – | – | – | – | – | 1 ถ้ายังไม่ทำใน 0a | ลด pending ไฟล์สุดท้าย (`maintenance-attachments`) | – | – |
| **รวม** | **66** | **25** | **273 (→3)** | **232** | **132 (→7)** | **74 (→18)** | **10** | **23 (19)** | **8** | 111/97/7 |

`PENDING_FOOTER_PARTS` ตามลำดับงาน: 2C-0 = 19 ไฟล์ · หลัง 1a 18 · 1b 17 · 1c 15 · 1d 12 · 1e 11 · 1f 10 · ชุด 3 5 · ชุด 4 1 · ชุด 5 ว่าง

### 9.5 test เดิมที่ต้องแก้ (ตามชุด · อ่านเนื้อทุกบรรทัดที่ `5ffee76`)

แก้ใน commit เดียวกับที่ทำให้พัง · คอลัมน์ "แก้เป็น" ใช้ของส่วนที่ถือเรื่องนั้น ถ้าสองส่วนเขียนต่างกัน ส่วนนี้เลือกแบบที่ผ่านทั้งสองแบบ หรือระบุไว้ในข้อ 9.11

| ชุด | test:บรรทัด | ตอนนี้ยึด (ตรวจแล้ว) | แก้เป็น | เจ้าของ |
|---|---|---|---|---|
| P0 | `visual-foundation-guards.test.ts:275-290` | class ของ segmented 2 จุด (`:281` room list · `:286`, `:288`, `:289` หน้าตั้งค่า) · `:278` `--radius-control: 6px;` | อ่าน `ui/segmented.tsx` ตามข้อ 8.3.1 / 3.2 · ทั้ง 2 ไฟล์มี `<Segmented` · คง `:278` | ข้อ 3, 8 |
| P0 | `asset-label-print-ui.test.ts:51`, `:53` | `aria-pressed={isActive}` · `? "bg-primary-soft font-semibold text-primary-hover"` | `:51` → `/<Segmented[\s\S]*?showCheck/` ในฟอร์ม · `:53` → อ่าน `ui/segmented.tsx` · `:52`, `:54`, `:55` ผ่านต่อ (`:51` วันนี้ผ่านเพราะแถบแท็บ `:949` ด้วย) | ข้อ 3 |
| P0 | `audit-scan-room-ui.test.ts:37`, `:83` | `aria-pressed={tab === key}` · `role="group" aria-label={t("roomListTabs")}` | `/<Segmented[\s\S]*?value=\{tab\}/` · `/<Segmented[\s\S]*?aria-label=\{t\("roomListTabs"\)\}/` | ข้อ 3, 8 |
| 0a | `accessible-dialog.test.ts:28` | `closeLabel = "Close"` | `/closeLabelProp \?\? tCommon\("close"\)/` + `doesNotMatch(/"Close"\|>\s*Close\s*</)` | ข้อ 5 |
| 0a | `accessible-dialog.test.ts:31` | `min-h-11 min-w-11` | `/<DialogPrimitive\.Close[^>]*asChild>\s*<Button variant="ghost" size="icon"/` (ผ่านทั้งแบบมีและไม่มี `data-slot`) + `doesNotMatch(/opacity-/)` · `:29`, `:30` ผ่านต่อ | ข้อ 3, 5 |
| 0a | `sheet-drawers-ui.test.ts:9`, `:11` | เหมือน 2 แถวบนใน `ui/sheet.tsx` | regex เดียวกันกับ `SheetPrimitive.Close` · `:10` ผ่านต่อ | ข้อ 5 |
| 0b | `field-primitives.test.ts:131` | `"mt-1 block text-meta text-faint-foreground"` มี 2 ครั้งใน `file-dropzone.tsx` | ถ้าใช้ markup ข้อ 3.7 (description เป็น `FieldHint` นอก `<label>`): ไม่แก้ · ถ้าใช้ข้อ 7.6.1 (`subLineClasses`): `/const subLineClasses = "mt-1 block text-meta text-faint-foreground"/` 1 ครั้ง + `className=\{subLineClasses\}` 3 ครั้ง | ข้อ 3 / 7 (ข้อ 9.11) |
| 1c | `disposal-forms-ux.test.ts:11`, `:12` | `/FormStep/` ทั้ง 2 ฟอร์ม | ชื่อ component ตามที่ข้อ 3.12/7.3 ตกลง (`FormSectionHeader` หรือ `<FormSection number=`) ทั้ง 2 ฟอร์ม + `doesNotMatch(/function FormStep/)` · `:13-14` (`reasonCharacterCount`) ผ่านต่อ | ข้อ 7 |
| 1d | `audit-scan-check-ui.test.ts:22` | `disabled={saving \|\| disabled \|\| missingPhoto}` | `/busy=\{saving\}/` + `/disabled=\{disabled \|\| missingPhoto\}/` · `:23` ผ่านต่อ | ข้อ 6 |
| 1d | `audit-not-found-dialog.test.ts:14` | `/<textarea/` | `/<Textarea/` | ข้อ 4 |
| 1e | `asset-form-sticky-actions.test.ts:7-17` | `pb-36 sm:pb-24` · `fixed bottom-3` · `lg:left-[calc(16rem+1.5rem)]` · `bg-surface/95` · `backdrop-blur` · `sm:flex-row sm:items-center sm:justify-end` · `<Save className="h-4 w-4" />` | `/<StickyFormFooter[\s>]/` + `doesNotMatch(/fixed bottom-3\|lg:left-\[calc\|bg-surface\/95\|backdrop-blur\|pb-36 sm:pb-24/)` · ชื่อ test ใหม่ "asset form keeps save actions in a sticky form footer" | ข้อ 6 |
| 1e | `asset-form-sticky-actions.test.ts:19-26` | `disabled={saving \|\| isProtectedStatusChange \|\| duplicateState.checking \|\| …}` | `/busy=\{saving\}/` + `/disabled=\{isProtectedStatusChange\s*\|\|\s*duplicateState\.checking\s*\|\|\s*duplicateState\.assetTagExists\s*\|\|\s*duplicateState\.serialNumberExists\}/` + `doesNotMatch(/disabled=\{saving/)` (`\s*` กัน formatter ตัดบรรทัด) | ข้อ 6 |
| 1e | `visual-foundation-guards.test.ts:267` | `asset-form.tsx: 1` (R2) | ลบแถว | ข้อ 6 |
| 1f | `visual-foundation-guards.test.ts:266` | `system-settings-form.tsx: 2` | `1, // label preview` | ข้อ 6 |
| 1f | `settings-depreciation-policy-ui.test.ts:53` | `/<textarea[\s\S]*onPolicyJsonChange/` | `/<Textarea[\s\S]*onPolicyJsonChange/` | ข้อ 4 |
| 1f | `mobile-field-navigation.test.ts:13-26` | หน้า navigation 8 หน้า | เพิ่ม `/th/maintenance/pm`, `/th/disposal/batches`, `/th/disposal/batches/batch-1`, `/th/admin/users`, `/th/admin/roles`, `/th/admin/data-quality`, `/th/admin/integrations`, `/th/master-data/brands`, `/th/master-data/employees/employee-1`, `/th/master-data/suppliers/supplier-1` | ข้อ 6 |
| 1f | `mobile-field-navigation.test.ts` (test ใหม่ต่อจาก `:46`) | — | "form routes hide the field navigation (K15)": 25 route ได้ `"focus"` + `/en/admin/settings` 1 ตัว | ข้อ 6 |
| 2 | `supplier-form-ui.test.ts:18-20` | `/aria-invalid=/` · `/aria-describedby=/` · `/role="alert"/` ในไฟล์ | ตามข้อ 4.16 (`import { Field }` · `id="supplier-…"` ครบ 6 · `error={fieldErrors.… ? getErrorMessage(…) : undefined}` 6 ครั้ง · ไม่มี `errorId=` และ `function Field(`) · `:17`, `:21` ผ่านต่อ | ข้อ 4 |
| 3 | `disposal-bulk-execution-ui.test.ts:31` | `<footer className="[^"]*sticky bottom-0[^"]*"` | `/<AccessibleDialogFooter>/` + `doesNotMatch(/<footer\|sticky bottom-0/)` | ข้อ 5 |
| 4 | `login-form-ui.test.ts:29` | `aria-busy={loading}` | `/<Button[\s\S]*?type="submit"[\s\S]*?busy=\{loading\}/` + `doesNotMatch(/aria-busy=/)` | ข้อ 6 |
| 4 | `login-form-ui.test.ts:30` | `loading ? t("loggingIn") : t("login")` | `/\{t\("login"\)\}/` + `doesNotMatch(/t\("loggingIn"\)/)` · `:49`, `:52` (key) ผ่านต่อ | ข้อ 6 |
| 4 | `asset-label-print-ui.test.ts:155` | `<p className="mt-2 text-xs text-muted-foreground">{labels.minChars}</p>` | `/hint=\{trimmedQuery\.length < 2 \? labels\.minChars : undefined\}/` · `:156` ผ่านต่อ | ข้อ 4 |
| 4 | `asset-transaction-cancellation-ui.test.ts:13` | `/min-h-11/` (วันนี้มีที่ `:123`, `:155`, `:156` ซึ่งเป็นปุ่มทั้งหมด จะหายหลังแปลง) | `/<Button[\s\S]*?variant="danger"/` (trigger) + `/<AccessibleDialogFooter>[\s\S]*?variant="destructive"[\s\S]*?busy=\{saving\}/` | ข้อ 5, 6 |
| 4 | `asset-scan-search-tool.test.ts:43` | `/<label[^>]+htmlFor="asset-scan-query"/` | `/<Field label=\{labels\.queryLabel\}>\s*<ScannerTextInput\s+id="asset-scan-query"/` · `:44-46` ผ่านต่อ | ข้อ 4 |
| 5 | `mobile-action-bar.test.ts:17` | อ่าน `ui/mobile-action-bar.tsx` | อ่าน `ui/action-bar.tsx` · `:19`, `:20` ผ่านต่อ | ข้อ 6 |
| 5 | `visual-foundation-guards.test.ts:91` | path ของแถบเก่า 2 ไฟล์ | `["src/components/ui/action-bar.tsx"]` · `:92` regex เดิม | ข้อ 6 |
| 5 | `audit-scan-search-ui.test.ts:182` | อ่าน `ui/mobile-action-bar.tsx` | อ่าน `ui/action-bar.tsx` · `:187` ผ่าน · `:188` (string ของ `design-system.ts`) ไม่แตะ | ข้อ 6 |
| 5 | `disposal-detail-workspace.test.ts:35` | `/<DisposalMobileActionBar/` | `/<ActionBar/` | ข้อ 6 |
| 5 | `disposal-detail-workspace.test.ts:42` | อ่าน `disposal/disposal-mobile-action-bar.tsx` | อ่าน `ui/action-bar.tsx` · `:44-48` ผ่านต่อ | ข้อ 6 |
| 5 | `confirm-dialog-ui.test.ts:25-31` | รายการไฟล์ที่ลบแล้วบอก "ลบแล้ว" | เพิ่ม `src/components/maintenance/maintenance-attachments.tsx` + `doesNotMatch(/AccessibleDialog/)` ในไฟล์นั้น | ข้อ 5 |
| 5 | `confirm-dialog-ui.test.ts:13` | `variant={current.tone === "destructive" ? "destructive" : "default"}` | แก้เฉพาะเมื่อ K12 เขียนนิพจน์นี้ใหม่ · ถ้าคงไว้ไม่ต้องแก้ | ข้อ 5 |

รวม **21 ไฟล์ test** ที่ต้องแก้ (critic กลุ่ม A 16 ไฟล์ + `audit-scan-room-ui` (P0) + `disposal-forms-ux` (K18) + `supplier-form-ui` (K4 ให้ย้าย error ของ supplier) + `asset-scan-search-tool` (ข้อ 4) + `confirm-dialog-ui` (K12)) · `field-primitives.test.ts:131` เป็นเงื่อนไข

### 9.6 test ไฟล์ใหม่ และที่เพิ่มในไฟล์เดิม

| ไฟล์ | ตรวจ | เจ้าของเนื้อ | งาน |
|---|---|---|---|
| `tests/form-migration-guards.test.ts` (ใหม่) | GF1–GF8 · GB1–GB4 · GD1–GD6 · GL1, GL3 + test ของ helper | ข้อ 9 | 0d แล้วลด budget และเพิ่ม `MIGRATED_FILES` ทุกไฟล์ · GL2 เพิ่มใน commit K15 ของ 1f |
| `tests/helpers/source-files.ts` (เพิ่ม) | helper ในข้อ 9.2 | ข้อ 9 | 0d |
| `tests/dialog-trigger-handles.test.ts` (ใหม่) | handle `open()`/`hideTrigger`/`returnFocusRef` ของ 3 ไฟล์ trigger | ข้อ 8.3.3 (ข้อ 3.4 เสนอให้ใส่ใน `dropdown-menus-ui.test.ts` · ส่วนนี้เลือกไฟล์ใหม่) | P0 |
| `tests/field-primitives.test.ts` (เพิ่ม) | `labelAction` · `fieldLabelClasses` · `FieldRequiredMark` · prop ของ `FileDropzone` (`description`, `id`, `aria-*`) | ข้อ 3.3, 3.7 / 4.16 | P0, 0b, 0c |
| `tests/scanner-text-input.test.ts` (เพิ่ม) | `"aria-label"?: string` และส่งต่อให้ `Input` · ยังไม่มี `aria-label={labels.stop}` | ข้อ 3.9 | 0b |
| `tests/accessible-dialog.test.ts` (เพิ่ม test) | part `Body`/`Footer`/`Cancel` · class · `description?: ReactNode` · safe area · ไม่มี `flex-col-reverse` | ข้อ 5.11 A (ข้อ 3 ตาราง B ซ้ำ) | 0a |
| `tests/sheet-drawers-ui.test.ts` (เพิ่ม test) | sheet พื้นขาว · safe area ของ `side="bottom"` · หัวเดียวกัน · drawer ใช้ `EmptyNote` | ข้อ 5.11 I | 0a, 4 |
| `tests/confirm-dialog-ui.test.ts` (เพิ่ม test) | `AlertDialog` หน้าตาใหม่ · ทุก `confirm()` มี `confirmLabel` · key คำกริยา 3 ตัว | ข้อ 5.11 F, G, H | 5 |
| `tests/sticky-form-footer-ui.test.ts` (ใหม่) | string ของ `StickyFormFooter` · 2 ไฟล์ใช้ · อยู่ท้าย `<form>` | ข้อ 6.11 (ข้อ 3 ตาราง B ซ้ำ) | 0d, 1e, 1f |
| `tests/mobile-action-bar.test.ts` (เพิ่ม) | ไฟล์เก่าถูกลบ · `ActionBar` · `actionBarPagePadding` · 4 หน้า | ข้อ 6.11 | 5 |
| `tests/step-states.test.ts` (ใหม่) | ฟังก์ชันสถานะของขั้น (import ตรง) | ข้อ 7.9 (ชื่อฟังก์ชันขัดกับข้อ 3.14 · ข้อ 9.11) | 0c |
| `tests/steps-ui.test.ts` (ใหม่) | `Steps` · `FormSection` · จุดเรียก S1, S5, ติดตั้งส่วนควบ, หน้าตั้งค่า | ข้อ 7.9 | 0c → 5 |
| `tests/choice-controls-ui.test.ts` (ใหม่) | `ChoiceCard`/`ChoiceChip` · จุดเรียก · ทั้ง `src` ไม่มี `accent-primary` | ข้อ 7.9 | 0c → 4 |
| `tests/file-evidence-ui.test.ts` (ใหม่) | `FileDropzone` · `FileQueueList` · 17 จุดเรียก · `SignaturePad` | ข้อ 7.9 | 0b → 1e |
| `tests/api-error-exposure.test.ts`, `tests/api-error-catalog.test.ts` (เพิ่ม) | `validationFailedBody` · key `validationFailed` | ข้อ 8.5.4 | งาน ZodError |
| `tests/mobile-field-navigation.test.ts` (เพิ่ม) | ข้อ 9.5 แถว 1f | ข้อ 6.9 | 1f |

`tests/form-dialog-primitives.test.ts` ที่ข้อ 3.17 ตาราง B เสนอ ซ้ำกับ 5 ไฟล์ข้างบน ส่วนนี้ให้แยกตามเจ้าของ K: ส่วน dialog → `accessible-dialog.test.ts` · `StickyFormFooter` → `sticky-form-footer-ui.test.ts` · `Steps`/`FormSection` → `steps-ui.test.ts` · ตัวเลือก → `choice-controls-ui.test.ts` · ไฟล์ → `file-evidence-ui.test.ts` · `FormContextBanner` และ `Segmented` → `field-primitives.test.ts` · ข้อ "server-safe" (ไม่มี `"use client"`, `useState`, `useEffect`, `createContext`, `useContext`) ใส่ในไฟล์ของ primitive แต่ละตัว · guard `accessibleDialogFormClasses` ย้ายมาเป็น GD6

### 9.7 test ที่ต้องผ่านต่อโดยไม่แก้ (เขียนเป็นข้อห้ามใน task)

| ชุด | test:บรรทัด → ต้องคง |
|---|---|
| 0a–0d | `visual-foundation-guards.test.ts:67-84` (scrim · `shadow-overlay…motion-reduce:animate-none!` ใน string เดียวกัน · `:83` duration ของ sheet) · `accessible-dialog.test.ts:7-24` · `field-primitives.test.ts:82-93` (`:92` `Field` ไม่ใส่ `required`), `:124-130` · `scanner-text-input.test.ts:192-201` (`:196` `<Field label={labels.cameraDevice} className="mb-3">` · `:200` ห้าม `aria-label={labels.stop}`) · `audit-scan-search-ui.test.ts:153-155` (`multiple?: boolean`, `onFilesChange?`, `Array.from(event.target.files`) · R2 `:261-272` (ไฟล์ใหม่ที่ไม่อยู่ใน budget = 0 เงา) |
| 1a | `repair-record-ui.test.ts:38` (`uploadRepairFiles(payload.id, files`) · `repair-record-detail-ui.test.ts:13`, `:16`, `:21-23` · `maintenance-attachments-ui.test.ts:7-11` (1a ไม่แตะ dialog `:239-256`) |
| 1b | `asset-operation-confirmation-ui.test.ts:21`, `:29-32` (`initialFocusRef={confirmButtonRef}`, `<Button`) · `legacy-checkin-flow.test.ts:63` (key คงไว้ K13) · `asset-handover-checkout.test.ts:16-20` |
| 1c | `disposal-detail-workspace.test.ts:77-79`, `:83` (`<AccessibleDialog[\s\S]*?busy={saving}`, `returnFocusRef={triggerRef}`, `initialFocusRef={executionDateRef}`) · `disposal-evidence-exception.test.ts:157-162` (`aria-describedby={evidenceExceptionReasonHelpId}`, `aria-describedby={historicalEvidenceWarningId}`, `minLength={20}`, `maxLength={2000}` อยู่บนช่อง) · `disposal-forms-ux.test.ts:13-14`, `:17-24` |
| 1d | `audit-scan-check-ui.test.ts:23`, `:41-42` (checkbox แก้ข้อมูลอยู่หลัง `{saveLabel}`), `:50` (`border-warning-border bg-warning-soft` ใน `audit-scan-check-field.tsx`) · `audit-scan-search-ui.test.ts:146-151` · `audit-not-found-dialog.test.ts:12`, `:15-16` · `audit-mobile-flow-completion.test.ts:10-14` · `ui-overlay-guards.test.ts:51-55` |
| 1g, 1e | `confirm-dialog-ui.test.ts:27`, `:30`, `:33-34` (`asset-attachments.tsx`, `asset-model-form.tsx` คง `tCommon("deletedSuccess")` และ `tone: "destructive"`) · `confirm-text-dialog-ui.test.ts:20-21` · `asset-batch-form-layout.test.ts:8-59` · `asset-component-manager.test.ts:26-30` · `asset-status-help-ui.test.ts:29-31` · `attachment-preview-dialog-ui.test.ts:24-34` |
| 1f | `settings-depreciation-policy-ui.test.ts:50`, `:55-57`, `:69`, `:77` (V track) · `settings-ldap-role-ui.test.ts:12-15`, `:20-21` (ไม่แตะแผง LDAP · ห้าม `id="ldap-default-role"` บน `<input`) · `settings-tab-persistence-ui.test.ts:8-13` (ไม่แตะ `:937-956`) · `asset-label-print-ui.test.ts:48-50`, `:52`, `:54-56` |
| 2 | `supplier-form-ui.test.ts:8-13` (`min-h-11` ผ่านเพราะแถว checkbox `:229`), `:17`, `:21`, `:25-28` · `ui-overlay-guards.test.ts:39-49` (`shouldGuardLinkClick(`, `confirm({`) |
| 3 | `disposal-bulk-execution-ui.test.ts:24-30` (`:27` `aria-busy={busy}` บน `<form>` `:824` ห้ามลบ), `:33`, `:56`, `:85-92` · `disposal-bulk-approval.test.ts:78-86` (`:82` `data-disposal-bulk-dialog="true"` บน `<form>` `:544`), `:92`, `:144` · `visual-foundation-guards.test.ts:26-28` · `audit-scan-check-ui.test.ts:53-58`, `:68-77` · `audit-scan-room-ui.test.ts:24-31`, `:45-50` · `confirm-text-dialog-ui.test.ts:9-12` · `html-lang-and-years.test.ts:19-23` · `audit-round-cancellation.test.ts:107-108` · `ui-overlay-guards.test.ts:39-49` |
| 4 | `login-form-ui.test.ts:13-20`, `:25-28`, `:35-40` (`role="alert"` และ `aria-live="polite"` ไปอยู่บน `Notice`) · `asset-state-review-ui.test.ts:14-15` (`minLength={10}`) · `integration-api-client-admin.test.ts:128-146` · `sheet-drawers-ui.test.ts:15-28` · `asset-transaction-cancellation-ui.test.ts:7-12` · `asset-scan-search-tool.test.ts:44-46` · `dropdown-menus-ui.test.ts:20-25` |
| 5 | `confirm-dialog-ui.test.ts:9-16`, `:19-22` · `disposal-detail-workspace.test.ts:9`, `:12`, `:44-48` · `mobile-action-bar.test.ts:7-14`, `:19-20` · `dropdown-menus-ui.test.ts:65-76` · `supplier-form-ui.test.ts:27` · `disposal-bulk-execution-ui.test.ts:56` · `disposal-bulk-approval.test.ts:144` |

### 9.8 pin ที่ formatter ทำพังได้ (critic ความเสี่ยงข้อ 6)

repo ไม่มี formatter (ไม่มี prettier · `eslint.config.mjs` ใช้แค่ `eslint-config-next` ที่ไม่มีกฎจัดรูป JSX) ความเสี่ยงจึงมาจาก format-on-save ของ editor หรือ `npx prettier` · กติกา: ห้ามรัน formatter ใน commit ของ 2C และดู `git diff --stat` ว่าไม่มีไฟล์ที่ถูกเขียนใหม่ทั้งไฟล์ · ใส่รายการนี้ในข้อจำกัดของ task ที่แตะไฟล์นั้น

| test:บรรทัด | pin | ไฟล์ (ชุด) | ต้องคง |
|---|---|---|---|
| `asset-batch-form-layout.test.ts:11-13` | ลำดับ `{t("batchOptionalColumns")}` → `batchOptionalColumnKeys` → `<BatchOptionalColumnToggle` | `asset-batch-form.tsx` (1e) | legend มีนิพจน์ `{t("batchOptionalColumns")}` ตามตัวอักษร |
| `asset-batch-form-layout.test.ts:21-28` | `<div className="grid gap-3 md:hidden">` · `Field label={t("batchAssetTag")}` · `Field label={t("batchSerialNumber")}` · `showRowCustodian ?` … | เดียวกัน | `label=` อยู่ติดชื่อ tag (prop แรก บรรทัดเดียวกัน) · class ของ div ไม่เรียงใหม่ |
| `asset-batch-form-layout.test.ts:36-42`, `:50-56` | `<table className="min-w-[760px] w-full text-sm">` · `<th className="w-56 px-3 py-2">{t("batchAssetTag")}</th>` … | เดียวกัน | หัวตารางบรรทัดละ 1 `<th>` · ห้ามใช้ตัวเรียง class ของ Tailwind (จะย้าย `w-full` มาก่อน `min-w-[760px]`) |
| `confirm-text-dialog-ui.test.ts:21` | `FileDropzone file={removeEvidence}` | `asset-component-manager.tsx:574` (1e) | `file=` เป็น attribute แรกบรรทัดเดียวกับชื่อ tag |
| `audit-scan-search-ui.test.ts:147` | `/\n\s+multiple\n/` | `audit-scan-check-form.tsx` (1d) | `multiple` อยู่บรรทัดของตัวเอง ไม่มีค่า |
| `visual-foundation-guards.test.ts:26`, `:27` | `tabIndex={-1} className="text-base font-semibold text-foreground outline-none"` · `tabIndex={-1} className={cn("outline-none", className)}` | `audit-scan-check-panel.tsx`, `disposal-bulk-approval.tsx` (3) | 2 attribute ติดกันบรรทัดเดียว และ class string เดิม · `:28` (`bulk-execution`) ยอม `\s*` |
| `audit-scan-check-ui.test.ts:71`, `:76`, `:77` | `if (target?.isConnected) target.focus()` ขึ้นบรรทัดใหม่ `else …` · `<h2 ref={headingRef} tabIndex={-1}` · `useEffect(() => {` / `if (isWide && open) …` / `}, [isWide, open, title])` คนละบรรทัด | `audit-scan-check-panel.tsx` (3) | รูปบรรทัดเดิม |
| `audit-scan-room-ui.test.ts:47-49` | `<ul ref={listRef}` · `onOpenAutoFocus={(event) => {` ตามด้วย `event.preventDefault()` · string ของ `querySelector` | `audit-scan-room-picker.tsx` (3) | ลำดับและ string เดิม |
| `html-lang-and-years.test.ts:21` | `min={yearRange.min} max={yearRange.max}` | `audit-round-form.tsx` (3) | 2 attribute ติดกันตามลำดับนี้ใน `Input` |
| `settings-depreciation-policy-ui.test.ts:50` | `type="text"` → `inputMode="decimal"` → `formatPurchasePriceInput(previewPurchasePrice)` | `depreciation-policy-builder.tsx` (1f) | ลำดับ attribute ของช่องตัวอย่าง |
| `login-form-ui.test.ts:13`, `:17`, `:39` | `htmlFor="login-username"` / `"login-password"` (ค่าตรงตัว) · `onChange={(event) => {` → `setUsername(event.target.value)` → `setError("")` | `login-form.tsx` (4) | `FieldLabel htmlFor="…"` เป็น string ไม่ใช่ตัวแปร · ลำดับ 2 คำสั่ง |
| `disposal-bulk-approval.test.ts:84-86` | ตัดข้อความจาก `function DisposalBulkApprovalDialog` ถึง `\nfunction ` ถัดไป | `disposal-bulk-approval.tsx` (3) | ชื่อและลำดับฟังก์ชัน · ไม่มี `tabIndex={-1}` ใน dialog |
| `disposal-bulk-approval.test.ts:144` · `disposal-bulk-execution-ui.test.ts:56` · `supplier-form-ui.test.ts:27` | `confirm({ title:` | 3 ไฟล์ (5) | `title` เป็น property แรกบรรทัดเดียวกับ `confirm({` |
| `asset-form-sticky-actions.test.ts:19-26` (ใหม่ใน 1e) | `disabled={isProtectedStatusChange \|\| …}` | `asset-form.tsx` (1e) | regex ใหม่ใช้ `\s*` รอบ `\|\|` (ข้อ 9.5) |

และทุก test ที่อ่านไฟล์ด้วย `readFileSync(path, "utf8")` โดยไม่แปลง CRLF: บนเครื่องนี้ `core.autocrlf=true` working tree เป็น CRLF (ตรวจ `audit-scan-check-form.tsx`, `asset-form.tsx` แล้ว) · pin ใหม่ที่มี `\n` ต้องอ่านผ่าน `.replace(/\r\n/g, "\n")` หรือ `readSourceFiles` เสมอ

### 9.9 ลำดับใน commit และการรัน

- ทุก commit ผ่าน `npm test` และ tsc (หลักเดียวกับ 2A) · งานสุดท้ายของ plan รัน `npm run verify`
- งาน 0d: เพิ่ม helper → สร้างไฟล์ guard พร้อม budget ทั้งหมดตามข้อ 9.4 · `MIGRATED_FILES = []` · `PENDING_FOOTER_PARTS` 19 ไฟล์ · `CLOSE_LABEL_IS_CANCEL` 2 แถว · `REVERSE` 7 แถว (8 ถ้า `alert-dialog.tsx:94` ยังไม่แก้ · `ui/dialog.tsx` หายไปแล้วในงาน 0a) · GL2 ยังไม่ใส่
- commit ของแต่ละไฟล์ (ข้อ 4.3 F8): ย้ายไฟล์ → แก้ test ของไฟล์ (ข้อ 9.5) → ลดตัวเลขของไฟล์ใน budget ทุกตัว (ลบแถวที่เป็น 0) → เพิ่ม path ใน `MIGRATED_FILES` → ถ้าย้าย dialog ครบไฟล์ เอาออกจาก `PENDING_FOOTER_PARTS`
- 1f: commit K15 (`src/lib/mobile-field-navigation.ts` + `mobile-field-navigation.test.ts` + GL2) ต้องมาก่อนหรืออยู่ใน commit เดียวกับ `StickyFormFooter` ของหน้าตั้งค่า เพราะ GL1(b) จะไม่ผ่านถ้า `/th/admin/settings` ยังเป็น navigation
- ชุด 5: ลบ `ui/mobile-action-bar.tsx` และ `disposal/disposal-mobile-action-bar.tsx` → แก้ `FIXED_BOTTOM_BARS` (ลบ 2 แถว เพิ่ม `ui/action-bar.tsx: 1`) · `PENDING_FOOTER_PARTS` ว่าง
- ถ้า `master` ไม่ใช่ `5ffee76` ตอนเริ่ม ให้รัน `node scripts-09b/table.mjs` (และ `fields.mjs`, `actions.mjs`, `extra.mjs`, `routes.mjs`) ใหม่ก่อนเชื่อตัวเลข

### 9.10 ข้อความใหม่

ไม่มี key ใหม่ · ข้อความใน assert ของ guard เป็นภาษาอังกฤษแบบ test เดิมของ repo

### 9.11 ข้อที่ส่วนอื่นเขียนไว้ต่างกัน (ส่วนนี้เลือกให้ guard และ test)

| # | เรื่อง | ต่างกันอย่างไร | ส่วนนี้ใช้ |
|---|---|---|---|
| 1 | ไฟล์ guard | ข้อ 4.16 `tests/form-field-guards.test.ts` (G1–G10) · ข้อ 8.4 และ 6.11 `tests/form-migration-guards.test.ts` (G1–G6) · ข้อ 5.11 `tests/dialog-structure-ui.test.ts` (B–E) · เลข G ชนกัน | ไฟล์เดียว `form-migration-guards.test.ts` ชื่อ GF/GB/GD/GL (ข้อ 9.2) |
| 2 | ชื่อ class ของ `<form>` ใน dialog | ข้อ 3.5 `accessibleDialogFormClasses` · ข้อ 5.2 `accessibleDialogFormClassName` | `accessibleDialogFormClasses` (ชื่อแบบ `fieldReadOnlyClasses`, `textareaClasses` ของ 2A) |
| 3 | `Loader2` ที่เหลือ | ข้อ 6.5.3 = 16 ใน 10 ไฟล์ · ขาด `disposal-asset-picker.tsx:58` (spinner ในช่องค้นหา) และ `audit-findings-batch-actions.tsx:88`, `:97` (ปุ่มของ 2B ตาม O5) · ข้อ 6 ให้ `disposal-bulk-execution.tsx:971` อยู่ต่อ แต่ข้อ 5 ด13 ลบ div `:970` ที่ห่อมัน | 18 ใน 12 ไฟล์ · `:971` หายตามข้อ 5 (GD3 ห้าม `Loader2` ในส่วนท้าย) |
| 4 | `motion-reduce` ของ spinner นอกปุ่ม | ข้อ 6.5.3 ใส่ 7 จุด | ใส่ทุกจุดที่เหลือในไฟล์ที่ย้าย: เพิ่ม `disposal-asset-picker.tsx:58` (1c) · `asset-label-batch-tool.tsx:321`, `:469` · `asset-scan-search-tool.tsx:146` (4) |
| 5 | `flex-col-reverse` นอก dialog | ข้อ 6 แก้แค่ `asset-form.tsx:1503` | K8 "ปุ่มหลักท้ายทุกที่": `disposal-batch-form.tsx:84` (1c) และ `asset-component-manager.tsx:373`, `:399` (1e) เป็น `flex flex-col gap-2 sm:flex-row sm:justify-end` ด้วย (DOM ยกเลิกก่อนอยู่แล้ว) |
| 6 | `ui/alert-dialog.tsx:94` | ข้อ 8 ข้อตัดสินย่อย 8: แก้ class เดียวใน 2C-0 · ข้อ 5 ตาราง B ข้อ C: ชุด 5 | budget `REVERSE` ลดในงานที่แก้บรรทัดนี้ ไม่ว่าจะเป็นงานไหน |
| 7 | markup ของ `FileDropzone` | ข้อ 3.7: `description` เป็น `FieldHint` นอก `<label>` (`field-primitives.test.ts:131` ไม่ต้องแก้) · ข้อ 7.6.1: `subLineClasses` 3 บรรทัด (ต้องแก้) | ข้อ 9.5 ให้ทั้ง 2 ทาง · ส่วนรวมต้องเลือก |
| 8 | ฟังก์ชันสถานะของขั้น | ข้อ 3.14 `getStepStates(total, current, { rejected })` · ข้อ 7.2.1 `getLinearStepStates(count, current, outcome)` + `getStepFocusIndex` | ไม่มี guard ขึ้นกับชื่อนี้ · test อยู่ `step-states.test.ts` ตามชื่อที่ส่วนรวมเลือก |
| 9 | หัวข้อมีเลขของฟอร์มตัดจำหน่าย | ข้อ 3.12/3.17 ตาราง C `FormSectionHeader` · ข้อ 7.9 `<FormSection number={1} …` | regex ของ `disposal-forms-ux.test.ts:11-12` ตามชื่อที่ส่วนรวมเลือก · GL3 ตรวจแค่ว่า `function FormStep` หาย |
| 10 | class ของ `StickyFormFooter` | ข้อ 3.11 `sticky bottom-0 … bg-canvas` · ข้อ 6.8 `sticky -bottom-4 sm:-bottom-6 … bg-surface` | GL1(a) ตรวจแค่ "sticky ไม่ fixed ไม่มีเงา ไม่ blur ไม่โปร่ง" จึงผ่านทั้งสองแบบ |
| 11 | test ของ handle trigger | ข้อ 3.17 ใส่ใน `dropdown-menus-ui.test.ts` · ข้อ 8.3.3 ไฟล์ใหม่ `dialog-trigger-handles.test.ts` | ไฟล์ใหม่ (ไม่แก้ test เมนูของ 2A) |
| 12 | `Segmented` | ข้อ 3 ข้อตัดสินย่อย 3, 5: สูง `md:min-h-8`/`md:min-h-9` ไม่มี `ring-offset` · ข้อ 8.3.1 และ 8.14 ข้อ 10: `md:h-8 md:min-h-0` มี `focus-visible:ring-offset-2` | ไม่มี guard ของส่วนนี้ขึ้นกับเรื่องนี้ · `visual-foundation-guards.test.ts:275-290` เขียนตามแบบที่ส่วนรวมเลือก |

### ข้อตัดสินย่อย

1. **guard ของ 2C อยู่ไฟล์เดียว** และใช้ชื่อ GF/GB/GD/GL เพื่อไม่ชนกับ G ของข้อ 4, 6, 8 และ F1–F8 ของข้อ 4.3
2. **ไม่เพิ่ม guard ใน `visual-foundation-guards.test.ts`** · 2C แก้ไฟล์นั้นแค่บรรทัดที่ยึดของที่เปลี่ยน (`:266`, `:267`, `:91`, `:275-290`) เพราะ 2B ก็ลด budget ในไฟล์นั้น
3. **อ่าน JSX ด้วยตัวอ่านที่ข้าม `{…}`** ไม่ใช้ compiler API ของ `typescript` (ข้อ 4.16 เสนอ) · ใช้ helper ไฟล์เดียวกับ 2A ได้ · เร็ว · ผลเท่ากับ AST ของ critic ทุกตัวเลขที่เทียบ (273 ช่อง · 197 `<Field` · 23 dialog · 25 `function Field`) · มี test ตัวอย่างกันถอย
4. **budget นับเฉพาะไฟล์ของ 2C** (`owned`) · 2B ไม่ต้องแตะไฟล์นี้ · ไฟล์ใหม่ที่ 2C สร้างได้ 0 · 2D ขยายเป็นทั้ง `src` แล้วตั้ง `{}`
5. **นิยาม class string ของช่อง (GF3):** มี `focus:border-ring` หรือ `focus-visible:border-ring` · หรือมีขอบ + มุม + padding ของช่อง + ความกว้าง/ความสูงของช่อง และไม่มีคำของปุ่มหรือกล่อง (`flex`, `justify-center`, `font-medium`, `file:`) · ตัด string ที่มี `hover:` (ช่องไม่มี hover · ตัดปุ่มรายการ `system-settings-form.tsx:1032`) · ได้ 232 ใน 49 ไฟล์ ครอบค่าคงที่ class ทั้ง 8 ตัวของข้อ 4.3 F3 และ class ที่เขียนลงใน `className` ของ `Input` ทีหลัง
6. **GF5 นับรวม wrapper ตัวเลือก และไฟล์** (`Select`, `SelectField`, `QueueSelect`, `ChoiceCard`, `ChoiceChip`, `FileDropzone`, `<input>` ทุก type) ได้ 111 แทน 87 · radio `required` ของ `checkout-form.tsx:248` ที่จะเป็น `ChoiceCard` และ `SelectField` 14 ครั้งจึงถูกนับด้วย
7. **GB1 นับ `<Loader2` ทุกตัวในไฟล์** ไม่ใช่แค่ในปุ่ม · จับไอคอนที่เก็บในตัวแปร (`audit-mark-not-found-button.tsx:64`) ได้ · ตัวที่เหลือมีเหตุผลกำกับทุกตัวในข้อ 9.4
8. **GB2 ใส่ `motion-reduce:animate-none` ให้ spinner นอกปุ่มทุกตัวที่เหลือในไฟล์ที่ย้าย** (10 จุด: 7 จุดของข้อ 6.5.3 ไม่นับ `disposal-bulk-execution.tsx:971` ที่หายตาม GD3 + 4 จุดในข้อ 9.11 ข้อ 4) แก้ class อย่างเดียวใน commit ของไฟล์นั้น
9. **GD4 ตรวจลำดับด้วยตำแหน่งข้อความ:** ปุ่มยกเลิก (`AccessibleDialogCancel` หรือ outline ตัวแรก) ต้องมาก่อน `type="submit"` · ไม่ตรวจว่าปุ่มสุดท้ายเป็นปุ่มหลัก เพราะส่วนท้ายที่สลับตามสถานะ (`disposal-bulk-execution.tsx:939`) มีหลายชุดในบล็อกเดียว
10. **GD2 นับต่อไฟล์** (`AccessibleDialogFooter` ≥ `AccessibleDialog`) ไม่ใช่ต่อ element เพราะ `ui/confirm-text-dialog.tsx` วางส่วนท้ายไว้ใน `ConfirmTextForm` อีกฟังก์ชัน · ชุด pending ตรวจสองทาง ชื่อจึงไม่ค้าง
11. **GD5 ใช้ได้ทุกไฟล์** ไม่ล็อกแค่หน้าตั้งค่า · ห้ามทั้ง `<form>` และ `type="submit"` ใน dialog ที่อยู่ใน `<form>` อื่น
12. **GL2 อ่านจากโฟลเดอร์ route** หน้าใหม่ใน 2B หรือ 2D จึงถูกตรวจเอง · หน้ารายการ = route ที่ไม่มี `[` ยกเว้น 4 หน้างาน · `assets/[id]/components` ไม่ถูกบังคับ (ไม่ใช่ `new`/`edit`)
13. **K15 ก่อนแถบบันทึกของหน้าตั้งค่า** ใน 1f (GL1 b)
14. **`MIGRATED_FILES` เพิ่มทีละไฟล์** (commit ละไฟล์ตามข้อ 4.3 F8) ไม่ใช่ทีละชุดย่อย (ข้อ 8.4) · guard ที่ตรวจไฟล์ที่ย้ายแล้วจึงทำงานตั้งแต่ commit แรกของไฟล์
15. **ข้อยกเว้นของ GF4 ระบุด้วยนิพจน์ `label`** (`t("returnDate")`, `t("licenseTotalSeats")`, `t("componentRole")`) ไม่ใช้เลขบรรทัดที่ขยับได้
16. **regex ใหม่ใน test ที่แก้ใช้ `\s*` รอบ `||` และ `[^>]*` หลังชื่อ tag** ที่ attribute อาจเพิ่ม (`DialogPrimitive.Close`) ให้ทนการจัดบรรทัดและผ่านทั้งแบบของข้อ 3 และข้อ 5
17. **test ของ primitive ใหม่แยกตามเจ้าของ K** แทน `form-dialog-primitives.test.ts` ไฟล์รวมของข้อ 3 (ข้อ 9.6)
18. **ไม่มีข้อความใหม่** และไม่แก้ `messages/*.json`

### ความเสี่ยง

1. **ตัวอ่าน JSX ไม่ใช่ parser** · type generic แบบ `<T,>(x) =>`, `>` ในข้อความ JSX ที่ไม่ได้อยู่ใน `{…}` หรือ tag ที่สร้างจาก string จะอ่านพลาดได้ · ป้องกันด้วย test ตัวอย่างของ helper และผลที่ตรงกับ AST ของ critic ที่ `5ffee76` · ถ้า guard แจ้งผิด ให้แก้ helper พร้อมเพิ่มกรณีใน test ตัวอย่าง ไม่ใช่เพิ่ม budget
2. **budget ลดด้วยมือ** · ผู้ทำอาจลดผิดไฟล์หรือลืมเพิ่ม `MIGRATED_FILES` · ตอน review ดูว่า diff ของไฟล์ guard ลดเฉพาะแถวของไฟล์ที่ย้ายใน commit นั้น และค่าตรงกับคอลัมน์ "ที่เหลือ" ข้อ 9.4
3. **ไฟล์ที่แบ่งกับ 2B** (`asset-register-table`, bulk 2 ไฟล์, `audit-findings-batch-actions`) มีค่าเหลือที่เป็นของ 2B · ถ้า 2B แปลงส่วนของตัวเองก่อน guard ไม่พัง (budget เป็นค่าสูงสุด) แต่ตัวเลขจะค้างสูงเกินจริงจนถึง 2D
4. **GF4 ดูแค่ช่องตัวแรกใน `Field`** · wrapper (`Select`, `SelectField`) ต้องส่ง `required` ต่อเอง guard เชื่อว่า wrapper ทำ · GF5 ช่วยจับถ้าคำว่า `required` หายจาก wrapper หรือจุดเรียก
5. **GF5 มองไม่เห็นค่าที่ส่งผ่าน spread หรือ object** · ที่ `5ffee76` ไม่มี spread บนช่อง (ข้อ 4.1) ถ้าวันหลังมี ต้องเขียน attribute ตรง
6. **GD4 ใช้ตำแหน่งข้อความ** · ส่วนท้ายที่ปุ่ม outline ตัวแรกไม่ใช่ปุ่มยกเลิกและวางหลังปุ่ม submit จะแจ้งผิด ทางแก้คือวางยกเลิกก่อนตาม K8 อยู่แล้ว
7. **pin ตามรูปแบบโค้ด** (ข้อ 9.8) พังได้จาก format-on-save · ใส่ในข้อจำกัดของ task และ review `git diff --stat`
8. **working tree เป็น CRLF** · pin ใหม่ที่มี `\n` และอ่านด้วย `readFileSync` ตรง ๆ จะผ่านบนเครื่องที่เป็น LF แต่พังบนเครื่องนี้ (หรือกลับกัน)
9. **ตัวเลขผูกกับ `5ffee76`** · P0 ขยับบรรทัดของ 3 ไฟล์ trigger และ `system-settings-form.tsx` · budget เป็นจำนวนต่อไฟล์ จึงไม่ขึ้นกับเลขบรรทัด แต่ถ้า `master` มี commit อื่นก่อนเริ่มต้องนับใหม่ (ข้อ 9.9)
10. **ไม่ได้รัน `npm test`** · guard ลองด้วยสคริปต์ `.mjs` ไม่ได้รันใน `node --test` · การแปลงเป็น TypeScript (type stripping ของ Node 24 · ห้าม enum และ parameter property) ต้องรันจริงในงาน 0d
11. **2D ต้องขยาย guard** เป็นทั้ง `src` และย้าย helper `assertWithinBudget` ไปไว้ที่เดียวกับของ 2A · ถ้าไม่ทำ ไฟล์นอก 2C จะเพิ่มช่องเขียนเองได้โดยไม่มีอะไรจับ
