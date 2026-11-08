# Page group 12, plan 3: data quality and storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/data-quality` (board `AD-DataQuality`) and `/admin/storage` (board `AD-Storage`).
- **Data quality:**
  - Two tabs.
  - Rule cards with a switch and a severity control.
  - A distribution bar.
  - A sticky save bar.
  - Counts that refresh after saving.
- **Storage:**
  - Chips and missing files first.
  - Rows that expand.
  - Asset names.
  - Thai labels.
  - Show-all.

**Architecture:**
- Pure page models:
  - `src/lib/data-quality-page-model.ts`
  - `src/lib/storage-page-model.ts`
- Each page keeps its file. UI parts go in `src/components/admin/data-quality/` and `src/components/admin/storage/`.
- The rule save, the review workspace and the archive API stay as they are.
- No migration.

**Tech Stack:** Next.js 16, Prisma 7, next-intl, Tailwind, `node --test`, Playwright.

**Spec:**
- `docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md` §7, §8, §12, §15 item 10.
- Recon (kept features): `docs/superpowers/specs/2026-11-08-page-group-12-admin-recon.md` §3, §4.

**Boards:**
- `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g13-boards\project\AD-DataQuality.dc.html`
- `AD-Storage.dc.html` in the same folder.

## Global Constraints

**Keep everything in recon §3 and §4:**
- **Data quality:**
  - The "เปิดรายงาน" link.
  - The 6 rules with their register links (`buildDataQualityRuleHref`).
  - The review workspace: scan, filters, table and cards, resolve and dismiss dialogs, viewer read-only, pager, errors.
  - The rule form's field errors.
  - Gates: `setting:view` for the page, `setting:edit` for edits.
- **Storage:**
  - The stats.
  - The orphan archive with its confirm dialog, the server 409 check, and the `setting:edit` gate.
  - The missing-file review.
  - The module breakdown.
  - The duplicate and empty path review.
  - The largest files.
  - The `setting:view` gate.

**Rules that do not change:**
- The rules still save through the existing `PUT /api/admin/settings` with key `asset_data_quality_rules`. The payload
  shape is unchanged.
- **The archive API is unchanged.**
- The UI never promises an in-app restore. Use "ผู้ดูแลเซิร์ฟเวอร์ย้ายกลับได้".

**Words and messages:**
- Thai first. Use the terms in `docs/19_THAI_GLOSSARY.md`.
- Edit messages only through `node scripts/messages-edit.mjs`, in both th and en.
- English uses ICU plurals. Thai uses `{x, number}`.

**Look:**
- Tokens only. Both themes.
- 44px targets below `md`.
- No horizontal page scroll at 390 or 1024.

**Tests:**
- Source pins must be CRLF-safe.
- When you break an existing pin, update it and keep what it protects. Find them with
  `grep -l "data-quality\|storage" tests`.

**E2E** (spec §12):
- Never call `PUT /api/admin/settings` or `/api/admin/storage/*`.
- Never press scan, resolve or dismiss.
- Never send DELETE.

## Review Focus

1. **A rule switched off, then on again before saving.**
   - Expected: the save bar shows no change, and no "นับหลังบันทึก" appears.
   - Task 1 test: `toggling back clears the change`.
2. **All rules switched off.**
   - Expected: the distribution bar shows an empty state, with no bar and no division by zero.
   - Task 1 test: `no enabled rules gives an empty distribution`.
3. **A storage folder with 0 orphans and 0 missing files.**
   - Expected: the chips show 0, the table shows its empty text, and no show-all appears.
   - Task 3 test: `clean storage has no rows and no show-all`.
4. **An attachment whose asset was deleted, or has no `assetId` and an unknown module.**
   - Expected: the row shows the module and "ไม่พบทรัพย์สิน", and nothing crashes.
   - Task 3 test: `unknown or missing asset resolves to null`.
5. **A very long file name on the phone.**
   - Expected: one line with an ellipsis, and the full name shows in the expanded row.
   - Task 4 pin: `file names truncate and expand shows the full path`.

---

### Task 1: Data-quality page model (`src/lib/data-quality-page-model.ts`)

**Files:**
- Create: `src/lib/data-quality-page-model.ts`
- Test: `tests/data-quality-page-model.test.ts`

**Interfaces:**

Produces:

```ts
export type DataQualityTab = "rules" | "review"
export function parseDataQualityTab(value: string | string[] | undefined): DataQualityTab // default "rules"
export type RuleCount = { key: AssetDataQualityRuleKey; count: number }
export function distribution(rules: readonly AssetDataQualityRule[], counts: readonly RuleCount[]): { total: number; segments: { key: AssetDataQualityRuleKey; count: number; share: number }[] } // enabled rules only, count > 0, share = count/total (0..1); total 0 → segments []
export function rulesChange(saved: readonly AssetDataQualityRule[], draft: readonly AssetDataQualityRule[]): {
  changed: number // rules whose enabled or severity differ
  enabledBefore: number; enabledAfter: number
  turnedOn: AssetDataQualityRuleKey[]; turnedOff: AssetDataQualityRuleKey[]
}
export function countsAfterSave(rule: AssetDataQualityRule, saved: AssetDataQualityRule | undefined): "count" | "afterSave" | "off" // afterSave = enabled in draft but not in saved
```

- [ ] **Step 1: Write the failing tests:**
  - `parses the tab with rules as default`.
  - `distribution counts enabled rules only and sums to the total`.
  - `no enabled rules gives an empty distribution`: `total 0`, `segments []`.
  - `rulesChange counts switches and severities`: turning one rule on and changing one severity gives `changed 2`,
    `enabledBefore 4`, `enabledAfter 5`, `turnedOn [key]`.
  - `toggling back clears the change`: with draft equal to saved, `changed` is 0.
  - `a rule switched on but not saved counts after save`.

- [ ] **Step 2: Run the tests and see them fail.**

- [ ] **Step 3: Implement.** Use relative imports.

- [ ] **Step 4: Run the tests.**
  - Run: the tests, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(data-quality): page model: tabs, distribution and rule change summary (group 12 plan 3 task 1)`

### Task 2: Data-quality page (`AD-DataQuality`)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx`
- Modify: `src/components/admin/data-quality-rule-form.tsx`, which becomes the rule cards plus the sticky save bar. It
  keeps its export name.
- Create: `src/components/admin/data-quality/rule-card.tsx`
- Modify: messages
- Test: `tests/data-quality-board.test.ts` (pins), plus updates to existing pins

**Interfaces:**

Consumes from Task 1:
- `parseDataQualityTab`
- `distribution`
- `rulesChange`
- `countsAfterSave`

**Page layout:**
- **Header:** as today, with "เปิดรายงาน".
- **Tabs** (`TabNav`, `tab=`), each with its number:
  - ข้อมูลไม่ครบ {issues of enabled rules}
  - สถานะไม่สอดคล้อง รอตรวจสอบ {pending review count}
  - The pending count shows for every viewer of the page.
- **Rules tab:**
  - A `DistributionBar` (`src/components/ui/distribution-bar.tsx`) built from `distribution`, with a legend naming
    each rule.
  - The StatStrip is removed. The bar and the tab carry its numbers.
  - One card per rule:
    - The name and description.
    - A `Switch` or checkbox styled as a switch. Use the app's existing control: grep `role="switch"`.
    - A `Segmented` severity control, เตือน or เร่งด่วน.
    - An off rule is dimmed and shows no count.
    - An `afterSave` rule shows "นับหลังบันทึก".
    - Otherwise the count is the link "ดูทรัพย์สิน {n} รายการ" (`buildDataQualityRuleHref`).
  - Viewers without `setting:edit` see the cards with the controls disabled, plus the line "ดูอย่างเดียว".
- **Review tab:** the existing workspace, unchanged.

**Sticky save bar** (`StickyFormFooter`):
- It shows only with `setting:edit`.
- Text: "ปิด → เปิด {turnedOn names} · กฎที่เปิด {before} → {after}", or "ยังไม่มีการเปลี่ยนแปลง".
- **ยกเลิก** resets the draft.
- **บันทึกกฎ** saves through the existing PUT, then calls `router.refresh()` so the counts update. The toast stays as
  today.

- [ ] **Step 1: Write the failing pins:**
  - `two tabs with their numbers, the pending count for every viewer`
  - `rule cards use a switch and a two-choice severity`
  - `off rules show no count; unsaved on rules say นับหลังบันทึก`
  - `the save bar summarises the change and refreshes after save`
  - `viewers without setting:edit see disabled controls and no save bar`
  - `kept: report link, rule register links, review workspace untouched, field errors`

- [ ] **Step 2: Run the pins and see them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests.**
  - Run: the pins, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. List the pins you changed.

- [ ] **Step 5: Commit.**
  - Message: `feat(data-quality): data quality to board AD-DataQuality: tabs, distribution, rule cards with switch and severity, sticky save bar with refresh (group 12 plan 3 task 2)`

### Task 3: Storage page model (`src/lib/storage-page-model.ts`)

**Files:**
- Create: `src/lib/storage-page-model.ts`
- Modify: `src/lib/storage-governance.ts`. Export one pure helper `archiveDestinationPreview(relativePath, at: Date)`,
  using the same date-folder rule as `archiveOrphanUploadFile`. The server may add a suffix when a name collides; the
  preview says "ประมาณ" for that reason.
- Test: `tests/storage-page-model.test.ts`

**Interfaces:**

Produces:

```ts
export type StorageFilter = "all" | "missing" | "orphan"
export function parseStorageFilter(value: string | string[] | undefined): StorageFilter
export const STORAGE_ROWS_PREVIEW = 8
export type StorageRow =
  | { kind: "missing"; filePath: string; module: string; expectedSizeBytes: number; asset: AssetRef | null; batch: { id: string; number: string } | null }
  | { kind: "orphan"; relativePath: string; sizeBytes: number; destination: string }
export type AssetRef = { id: string; name: string; assetTag: string }
export function buildStorageRows(actions: StorageGovernanceDryRunAction[], refs: StorageRefs, now: Date): StorageRow[] // missing first, then orphan, each by path
export function filterStorageRows(rows: StorageRow[], filter: StorageFilter, showAll: boolean): { rows: StorageRow[]; total: number; hidden: number }
export type StorageRefs = { assetByPath: Map<string, AssetRef | null>; batchByPath: Map<string, { id: string; number: string }> }
export const STORAGE_MODULE_KEYS: readonly string[] // every module with a Thai label (existing + checkout_receiver_signature, checkin_*_signature, checkout_photo_before, checkin_photo_after, disposal_batch)
export function storageModuleLabelKey(module: string): string | null // message key under storagePage.*, null = show the raw code
```

**How to resolve assets** (spec §15 item 10):
- Use `Attachment.assetId` when it is set.
- Otherwise resolve through `referenceId` for each module. Read checkout and checkin from their records' `assetId`.
- Leave other modules unresolved (null).
- `disposal_batch` gives the batch number instead of an asset.
- Do the queries in the page data, batched per module. Keep the model pure.

- [ ] **Step 1: Write the failing tests:**
  - `missing rows come first`
  - `filter and show-all`: 12 rows give `rows.length` 8 and `hidden` 4. With `showAll`, `hidden` is 0.
  - `clean storage has no rows and no show-all`
  - `unknown or missing asset resolves to null`
  - `disposal batch shows the batch, not an asset`
  - `every module key has a Thai label`: each `STORAGE_MODULE_KEYS` entry exists in `messages/th.json`.
  - `archive destination keeps the date folder rule`

- [ ] **Step 2: Run the tests and see them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests.**
  - Run: the tests, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(storage): storage page model: rows, filters, show-all, asset refs and Thai module labels (group 12 plan 3 task 3)`

### Task 4: Storage page (`AD-Storage`)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/storage/page.tsx`
- Create: `src/components/admin/storage/storage-row.tsx` (`"use client"`, for expand and copy)
- Keep: `src/components/admin/storage-archive-button.tsx` (restyle it to an outline button labelled "ย้ายไปที่เก็บถาวร")
- Modify: messages
- Test: `tests/storage-board.test.ts` (pins), plus updates to existing pins

**Interfaces:**

Consumes from Task 3:
- `parseStorageFilter`
- `buildStorageRows`
- `filterStorageRows`
- `STORAGE_ROWS_PREVIEW`
- `storageModuleLabelKey`
- `archiveDestinationPreview`

**Header:**
- The title.
- The upload folder in mono. The readiness page already shows the same value to the same gate.

**Tiles:**
- **Files in use:**
  - The count.
  - "ไม่ใช้งาน {n}" as a foot line.
- **Total size.**
- **Large files (≥10 MB).**
- **Needs review:**
  - The count, with an attention style.
  - The breakdown "หลุด {n} · หาย {n} · path ซ้ำ {n} · path ว่าง {n}".
- **Equation line:** "{files on disk} = {in use} + {orphans}".

**Rows section:**
- Chips (`filter=`), with counts: ทั้งหมด, ไฟล์หาย, ไฟล์หลุด.
- **Each row:**
  - The file name on one line with an ellipsis, and its folder.
  - The ที่มา column, with the Thai module label.
  - The size.
- **Missing rows:**
  - The asset name and tag, with a "เปิดทรัพย์สิน" link. A batch shows its number and a link to the batch.
  - The badge "ตรวจสอบเท่านั้น".
- **Orphan rows:** the restyled archive button. Its confirm dialog is unchanged.
- **Expanding a row** (`aria-expanded`) shows:
  - the path relative to the upload root;
  - a copy button: `navigator.clipboard`, plus a toast "คัดลอกแล้ว";
  - for orphans, the destination preview "ย้ายไป {destination} (ประมาณ)" and "ไม่มีรายการใดอ้างถึง";
  - the note "ผู้ดูแลเซิร์ฟเวอร์ย้ายกลับได้".
- **Show-all:**
  - "แสดง {shown} จาก {total} · ดูทั้งหมด" links to `showAll=1`.
  - With show-all on, the link changes to "แสดงน้อยลง".

**Module table:**
- Thai labels.
- A share bar per row.
- A total row.

**Review list (duplicate or empty paths):**
- Asset name and tag, not the raw reference id.
- "ชี้ไฟล์เดียวกับรายการบน" where it applies.

**Largest files:** each row shows the module, the asset and the date.

**Wording:** Thai words replace "Dry-run", "flag" and "Archive".

- [ ] **Step 1: Write the failing pins:**
  - `tiles show the review breakdown and the equation`
  - `chips filter rows and missing files come first`
  - `file names truncate and expand shows the full path`
  - `the archive button keeps its confirm and gate`
  - `the restore note says ผู้ดูแลเซิร์ฟเวอร์ย้ายกลับได้`
  - `show-all toggles with a URL param`
  - `kept: module breakdown, review list, largest files, setting:view gate`

- [ ] **Step 2: Run the pins and see them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests.**
  - Run: the pins, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. List the pins you changed.

- [ ] **Step 5: Commit.**
  - Message: `feat(storage): storage to board AD-Storage: tiles with breakdown, filter chips, expandable rows with copy path, asset names, Thai labels, show-all (group 12 plan 3 task 4)`

### Task 5: E2E

**Files:**
- Create: `e2e/admin/data-quality-storage.spec.ts`
- Create: `e2e/admin/data-quality-storage-words.ts`

**Tests** (seed-admin session):
1. **Desktop: `data quality tabs and rule cards`**
   1. The rules tab shows 6 cards and the distribution bar, or its empty state.
   2. Toggle one switch. The save bar shows the change. Press ยกเลิก, and the bar returns to "ยังไม่มีการเปลี่ยนแปลง".
   3. The review tab shows the workspace.
   4. **Never press บันทึกกฎ, scan, resolve or dismiss.**
2. **Desktop: `storage chips, expand and archive confirm cancelled`**
   1. The chips switch the filter (check the URL).
   2. Expand the first row: the relative path shows.
   3. If an orphan row exists, open its archive confirm and press ยกเลิก.
   4. **Never confirm.**
3. **Phone: `both pages fit the phone`**
   1. No horizontal scroll.
   2. The tabs and chips are reachable.

**Writes:** none.

- [ ] **Step 1: Write the spec.**

- [ ] **Step 2: Run the checks.**
  - Run: `npm test` and `npx tsc --noEmit`.
  - Expected: PASS. Do not run Playwright.

- [ ] **Step 3: Commit.**
  - Message: `test(admin): E2E for data quality and storage (group 12 plan 3 task 5)`
