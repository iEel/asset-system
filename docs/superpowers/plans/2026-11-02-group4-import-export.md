# Page group 4, plan 5: import / export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the import/export page to board AR-ImportExport. The import steps are open on arrival, with a dropzone, Thai errors that name the field, the value in the file and the asset that already holds it, a row filter and a confirm that imports exactly the N it promises. Export says how many rows it writes. History is titled by file name and lists the skipped rows. The E2E suite may now run a real import on the dev DB (user, 2026-11-02).

**Architecture:**
- A pure validator (`asset-import-validate.ts`) turns sheet rows plus reference maps into rows with structured issues (`{ code, field, value, conflict }`). The page builds every sentence from messages.
- The preview route stays stateless. Confirm re-parses the file the client snapshotted at pick time and refuses with 409 when the ready count differs from the one the person confirmed. It writes the whole batch, including its history entry, in one transaction, so a failure imports nothing.
- The page is two columns from `lg`: the import card and, on the right, the export card and the history.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, ExcelJS, zod 4, `node --test`, Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md`, sections:
- §4 (anti-goals: an N that is not what will be added; no schema change)
- §5
- §13
- §15 call 21
- §16.1, §16.2
- §17
- Appendix A "Import / export"

**Board:** session scratchpad `artifact-files/182f6683-…/project/AR-ImportExport.dc.html` (PNG `g4/recon5/AR-ImportExport.png`).

**Recon with file:line:** session scratchpad `g4/recon5/`: `pipeline.md`, `ui.md`, `export.md`, `e2e.md`, `critic.md`. The scratchpad is `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/`.

## Global Constraints

- **Branch, push and tools:**
  - Branch `feat/group4-import-export` from `master` `853dc3c8`. No push.
  - No schema change, no migration, no database command.
  - Implementer tasks run no build, no dev server and no E2E. `npx playwright test --list` is fine.
- **Files to leave alone:**
  - Never read `.env*`.
  - Do not touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- **Shared parts and tokens only (DESIGN.md):**
  - Parts: `PageHeader`, `ContentPanel`, `FileDropzone`, `Steps`, `StatStrip`, `DistributionBar`, `Segmented`, `DataTable`, `Notice`, `StatusBadge`, `KeyValueList`.
  - No hex or rgba in tsx, no `dark:`, no `/NN` tints, no raw controls. Both themes.
- **Rows show the name first**, with the tag under it (spec §5).
- **Words:**
  - Glossary rows in `docs/19_THAI_GLOSSARY.md` before use.
  - Messages change only through `node scripts/messages-edit.mjs <change file>`, with change files in `<scratchpad>/g4/msg/p5-*.json`.
  - Thai and English. en uses ICU plural with the raw number; th uses `{count, number}`.
  - Existing message key names stay (tests pin them); only their text changes.
- **Permissions:**
  - Export needs `asset:view`. Template, preview and confirm need `asset:create`.
  - Each route calls `requirePermission` before any read or parse, and has an `rbac-route-matrix` entry with its pin.
- **Guards that pin a changed file move in the same task, with exact counts.** The list is in recon `critic.md` §0 and `ui.md` §4.
- **Before each commit:**
  - CRLF files keep CRLF.
  - Run the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors).
  - Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Stable hooks:**
  - The dropzone input id `asset-import-file`.
  - `data-import-filter="error|ready|all"` on the filter options.
  - `data-import-row="<rowNumber>"` on each preview row.
  - The confirm button's name "ยืนยันนำเข้า {count} รายการ".
  - The template link keeps `href="/api/assets/import-template"` with `download`.
  - The export link keeps `href="/api/assets/export"`.

## Rulings made while planning

- **P5-R1 (E2E may import, user 2026-11-02):**
  - The browser hazard `excel-import` goes.
  - The source ban on the route names stays for every `e2e/` file except the new import spec, its helper and `refusals.ts`.
  - A new guard allows only the import spec to name `#asset-import-file`.
  - All the other E2E bans stay: LDAP sync, the settings save, a failed sign-in, DELETE, and master-data changes.
  - The spec builds its own `.xlsx` with ExcelJS from `assetImportColumns`. It never fetches the template body, because the template lists every active employee of a Production copy and failure traces keep network bodies.
- **P5-R2 (confirm imports what it promised):**
  - **Client:** it snapshots the file's bytes when the file is picked, so edits on disk after the preview do not matter. Confirm sends `expectedReadyRows` and the preview's `batchId`.
  - **Server checks:**
    - re-parses the file;
    - refuses with **409** and the fresh preview when its ready count differs;
    - refuses with 400 when the `batchId` does not match `^IMPORT-\d{14}-[A-Z0-9-]{1,24}-[0-9A-Z]{4}$`;
    - refuses with 409 when that `batchId` already has an `import_batch` log.
  - **No stored preview:** no schema change.
- **P5-R3 (all or nothing):**
  - Blank tags are generated before the transaction with `generateAssetTags`. Rows are grouped by company, branch and category, at most 100 per call, with the file's and earlier generated tags passed as `reservedAssetTags`.
  - Then one `prisma.$transaction` (`{ maxWait: 10_000, timeout: 120_000 }`), inside `withDeadlockRetry`, writes:
    - the assets with ids from `randomUUID()`;
    - their `import` movements;
    - their `import` logs;
    - the `import_batch` log.
  - The writes use `createMany` in chunks of 50 rows per table.
  - A unique clash (a concurrent create or a double confirm) rolls the whole batch back and answers 409.
  - **Row cap: 1,000 data rows per file.** The preview checks it as a file-level `_form: outOfRange` error with its own message.
- **P5-R4 (structured issues):**
  - `issues: Array<{ code, field, value, parent?, conflict?, max? }>` replaces `errors: string[]`. `status` is `"ready"` when `issues` is empty.
  - `conflict` is `{ assetId, assetTag, inactive }` for a tag or Serial already in the register, or `{ row }` for an earlier row of the same file.
  - The preview response drops `resolved`; confirm keeps its own copy.
  - Codes (Thai text in `asset.importError.<code>`):

    | code | th |
    |---|---|
    | `required` | ต้องระบุ |
    | `notFound` | ไม่พบในข้อมูลอ้างอิง |
    | `notUnder` | ไม่อยู่ภายใต้{parent}ที่ระบุ |
    | `duplicateExisting` | ซ้ำกับข้อมูลที่มีอยู่แล้ว |
    | `duplicateInFile` | ซ้ำกับแถว {row} ในไฟล์ |
    | `invalidDate` | ต้องเป็นวันที่ที่ถูกต้อง |
    | `buddhistYear` | ปีเป็น พ.ศ. ให้ใช้ปี ค.ศ. |
    | `invalidNumber` | ต้องเป็นตัวเลข 0 ขึ้นไป |
    | `invalidInteger` | ต้องเป็นจำนวนเต็ม 0 ขึ้นไป |
    | `seatsOverTotal` | ต้องไม่เกินจำนวนสิทธิ์ทั้งหมด |
    | `licenceOnlyForLicence` | ใช้ได้เฉพาะประเภทการถือครอง License |
    | `invalidOwnership` | ไม่ใช่ประเภทการถือครองที่รองรับ |
    | `statusNotAllowed` | นำเข้าได้เฉพาะสถานะร่างหรือพร้อมใช้งาน |
    | `conditionNotAllowed` | ใช้สภาพนี้ตอนนำเข้าไม่ได้ |
    | `tooLong` | ยาวเกิน {max} ตัวอักษร |

  - **The line on the page:**
    - It reads "<ชื่อช่อง>: <ปัญหา>". The field name comes from the existing `asset.importField`.
    - A second line follows: "ค่าในไฟล์: <value>", then " · ใช้อยู่กับ <tag>" (a link to `/<locale>/assets/<assetId>`) when there is a conflict. For an inactive asset it reads "ใช้อยู่กับ <tag> ที่ปิดใช้งานแล้ว".
    - Two lines as on the board; the words as in spec §13.
- **P5-R5 (validation the create path already has):**
  - **Tags:** the tag check covers inactive assets too, because the DB index is unique over all rows.
  - **Lengths:** name 200, tag 50, Serial 100, fixed-asset code, PO and invoice 50.
  - **Models:** a model is resolved by brand and name.
  - **Status and condition:**
    - A status or condition that exists but cannot be imported gets its own code.
    - The template's Statuses and Conditions sheets list only importable values, and its example row uses them.
  - **Dates:** a date with a year from 2400 to 2700 is `buddhistYear`; any other year outside 1950–2100 is `invalidDate`.
  - **Dead code:** the dead check "Branch Code ไม่อยู่ภายใต้ Company Code" goes.
  - **Headers:** the Thai field labels of `asset.importField` become header aliases, and the 6 keys without aliases get them. The English headers stay.
- **P5-R6 (department rule on import, spec goal 4 / call 16):** each row's department comes from `getRegisterDepartment` with the holder's department (references carry `employees: Map<code, { id, departmentId }>`). Each per-asset log carries `custodianScope` from `buildCustodianScopeAudit` (`src/lib/asset-custodian-scope.ts`), as create does.
- **P5-R7 (history):**
  - The `import_batch` value gains `skippedRows: Array<{ row, name, assetTag, issues }>`, capped at 50, with `skippedRowsHidden`. History reads it defensively; old rows have none.
  - **`rollbackPlan`:** still written (the later undo, spec §16.2) and never shown. The rollback badge, the asset list and the `importHistoryRollback*` messages go (call 21).
  - **History status:** words for what happened: "นำเข้าครบ" (skipped 0) and "นำเข้าบางส่วน" (skipped > 0). The preview keeps its own status words.
- **P5-R8 (page layout):**
  - **Steps:** five steps (แม่แบบ, อัปโหลด, ตรวจสอบ, นำเข้า, เสร็จสิ้น). The board has five; the spec's four do not forbid the done state.
  - **Upload:** `FileDropzone` as it is (spec §5 over the board's file row):
    - title = the file name;
    - hint = "<size> · <n> แถว · ตรวจเมื่อ <date>";
    - description = "ลากไฟล์ใหม่มาวาง หรือเลือกไฟล์อื่น".
  - **Footer:**
    - It sits inside the import card, `lg:sticky lg:bottom-0`, and is in flow below `lg` (not `StickyFormFooter`: GL1 allows that part only on focus routes).
    - "อัปโหลดไฟล์ที่แก้แล้ว" is a `<label htmlFor="asset-import-file">` styled as a button.
  - **Row filter:**
    - `Segmented` with counts: มีข้อผิดพลาด / พร้อมนำเข้า / ทั้งหมด.
    - Default: มีข้อผิดพลาด when there are errors.
    - The table shows at most 100 rows after the filter, with a note when there are more.
  - **No-tag row:** shows "สร้างรหัสอัตโนมัติ" under the name.
  - **Dates:** the app's `formatDateTime`, not the board's short month.
  - **Left out:** no breadcrumbs and no numbered body markers.
  - **Done state:** the result stays until "นำเข้าไฟล์ใหม่". It shows:
    - "นำเข้าแล้ว {imported} รายการ · ข้าม {skipped} แถว";
    - the file name and batch id;
    - links to up to 5 imported assets;
    - "ดูในทะเบียนทรัพย์สิน".
  - **A new pick keeps the old preview** until the new one arrives.
- **P5-R9 (viewer, spec "export part only" vs Appendix A "the last 10 batches"):** the viewer sees the export card and the history, read only, in one column. No dropzone, template or confirm. The history holds no secret.
- **P5-R10 (export):**
  - **Count line:**
    - "ส่งออกทั้งหมด (Excel)" shows "{count} รายการ · ไม่ใช้ตัวกรอง".
    - Above 5,000 it adds "· ไฟล์มี {max} รายการที่เพิ่มล่าสุด".
    - The count is one `prisma.asset.count` with `assetExportAllWhere()` = `buildAssetWhere(parseAssetListParams({}))`.
  - **Wording:** "ตามสิทธิ์" goes.
  - **Register link:** "ส่งออกตามตัวกรองในทะเบียน" links to `/<locale>/assets`, from `md` up only, because the register's export menu is desktop only.
  - **No route change.**

## Review Focus

1. **The same Serial already on two active assets:** the conflict names one of them (the oldest by `createdAt`) and never throws (Task 1).
2. **A file whose rows were ready at preview, but someone created one of their Serials before confirm:** confirm answers 409 with the fresh preview and imports nothing. The page shows the new result and a notice (Task 2, Task 4).
3. **A sheet with 1,001 data rows:** the preview refuses the file with the cap message and does not return 1,001 rows (Task 1).
4. **A tag in the file that belongs to an inactive asset:** the preview says so ("ใช้อยู่กับ <tag> ที่ปิดใช้งานแล้ว"); confirm is never reached with it, so there is no 500 mid-batch (Task 1).
5. **An old `import_batch` log with no `skippedRows` and an old status:** history still renders it, with the outcome badge from its counts (Task 2).

---

### Task 1: The validator and structured issues

**Files:**
- Create: `src/lib/asset-import-validate.ts` (pure; relative `./x.ts` imports only)
- Modify:
  - `src/lib/asset-import-preview.ts`: references and parsing call the validator; the row cap.
  - `src/lib/asset-import-mapping.ts`: aliases (P5-R5).
  - `src/lib/asset-excel.ts`: `required: true` on the 7 required columns.
  - `src/app/api/assets/import-preview/route.ts`: no `resolved` in the answer.
- Test:
  - Create `tests/asset-import-validate.test.ts`.
  - Update `tests/asset-import-mapping.test.ts`, `tests/asset-import-field-labels.test.ts`, `tests/upload-validation.test.ts:95-105` (the names it greps) and `tests/v-track-s.test.ts:466-478` (add the row-cap `_form` case).

**Interfaces:**
- Produces:
  - `type AssetImportIssueCode` (the 15 codes of P5-R4).
  - `type AssetImportIssue = { code: AssetImportIssueCode; field: string; value: string | number | null; parent?: string; conflict?: { assetId: string; assetTag: string; inactive: boolean } | { row: number }; max?: number }`.
  - `type AssetImportValidatedRow = { rowNumber: number; status: "ready" | "error"; issues: AssetImportIssue[]; values: Record<string, string | number | null>; resolved: Record<string, string | null> }`.
  - `validateAssetImportRows(rows: Array<{ rowNumber: number; values: Record<string, AssetImportCellValue> }>, references: AssetImportReferences): AssetImportValidatedRow[]`.
  - `ASSET_IMPORT_MAX_ROWS = 1000`.
- `AssetImportReferences` changes (it moves to the validator file and the preview re-exports it):
  - `assetsByTag: Map<lowerTag, { id, assetTag, active }>` (every asset);
  - `assetsBySerial: Map<lowerSerial, { id, assetTag }>` (active, oldest kept);
  - `models: Map<"brandId|lowerName", …>`;
  - `employees: Map<code, { id, departmentId }>`;
  - `importableStatuses` and `importableConditions` beside the full maps.
- `AssetImportPreviewRow` becomes `{ rowNumber, status, issues, values }`.
- `parseAssetImportWorkbook` keeps its name and returns `{ summary, rows, mapping }` with `resolved` kept on an internal `rowsWithResolved` for confirm (`parseAssetImportWorkbookForConfirm` or a flag; pick one and name it in the report).

- [ ] **Step 1: Write the failing tests.** One case per code. Plus:
  - a Serial held by two active assets → `conflict` is the oldest (Review Focus 1);
  - an inactive tag → `conflict.inactive === true` (Review Focus 4);
  - the same Serial in rows 3 and 7 → row 7 `{ row: 3 }`;
  - `tooLong` with `max: 200` on a 201-character name;
  - "ใช้งานอยู่" → `statusNotAllowed`;
  - "2569-05-01" → `buddhistYear`, "1890-01-01" → `invalidDate`;
  - a model name shared by two brands resolves by brand;
  - a Thai header "รหัสที่ตั้งปัจจุบัน" maps to `currentLocationCode`.
  - In `v-track-s`: 1,001 rows → 400 `_form: outOfRange` (Review Focus 3).
- [ ] **Step 2: Run** `npx tsx --test tests/asset-import-validate.test.ts tests/asset-import-mapping.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The rules are in P5-R4 and P5-R5. The tag and Serial maps are read in one query each (select `id, assetTag, serialNumber, isActive, createdAt`).
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(import): structured issues with the file value and the asset that holds it, inactive tags, lengths, model by brand, Buddhist years, Thai headers, a 1,000-row cap (group 4 plan 5)`

### Task 2: Confirm, history data, template and route matrix

**Files:**
- Modify:
  - `src/app/api/assets/import-confirm/route.ts` (P5-R2, P5-R3, P5-R6). The answer is `{ batchId, imported, skipped, assets: Array<{ id, assetTag }> }`. A 409 body is `{ error, code: "previewChanged" | "batchUsed" | "changedDuringImport", preview? }`. Each English `error` literal joins `src/lib/api-error-catalog.ts`.
  - `src/lib/asset-import-batch.ts` (`skippedRows`, `skippedRowsHidden`, the cap 50).
  - `src/lib/asset-import-history.ts`:
    - `outcome: "complete" | "partial"` from the counts;
    - `skippedRows` read defensively;
    - `rollbackSummary` removed from the item. The lib's plan builder stays.
  - `src/app/api/assets/import-template/route.ts` (importable statuses and conditions only, the example row from them).
  - `src/lib/rbac-route-matrix.ts`: rows for `assets/export` (`asset:view`), `assets/import-preview` and `assets/import-template` (`asset:create`).
- Test:
  - Create `tests/asset-import-confirm-route.test.ts`, with the route loaded on a stubbed prisma as `tests/v-track-s.test.ts:20-61` does.
  - Update `tests/asset-import-batch.test.ts`, `tests/asset-import-history.test.ts`, `tests/rbac-route-matrix.test.ts`, `tests/api-error-catalog.test.ts`, `tests/list-frame-guards.test.ts:176` (the `"-"` count, if it moves).

**Interfaces:**
- Consumes: Task 1's types and the confirm parse.
- Produces:
  - `AssetImportHistoryItem` gains `outcome`, `skippedRows: Array<{ row: number; name: string | null; assetTag: string | null; issues: AssetImportIssue[] }>`, `skippedRowsHidden: number`, and loses `rollbackSummary`.
  - Confirm request fields: `file`, `batchId`, `expectedReadyRows`.

- [ ] **Step 1: Write the failing tests.**
  - **Route:**
    - an expected count of 3 while 2 are ready → 409 `previewChanged` with `preview`, and no `$transaction` call (Review Focus 2);
    - a used `batchId` → 409 `batchUsed`;
    - a malformed `batchId` → 400;
    - a P2002 thrown inside the transaction → 409 `changedDuringImport`;
    - a success writes the `import_batch` log inside the same transaction, with `skippedRows` listing the error rows;
    - a held บุคคล row takes the holder's department.
  - **History:** an old log without `skippedRows` and with `status: "ready"` reads `outcome: "complete"` and `skippedRows: []` (Review Focus 5).
  - **Batch:** 60 error rows store 50 and `skippedRowsHidden: 10`.
- [ ] **Step 2: Run** the new and updated tests. Expected: FAIL.
- [ ] **Step 3: Implement** as P5-R2, P5-R3 and P5-R6 say. Pre-generate tags. Use `createMany` in chunks of 50 inside the one transaction.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(import): confirm imports what the preview promised in one transaction, refuses a changed preview or a used batch, records skipped rows, follows the department rule; importable-only template sheets; route matrix rows (group 4 plan 5)`

### Task 3: Words

**Files:**
- Modify:
  - `docs/19_THAI_GLOSSARY.md`: rows for นำเข้า / ส่งออก (page title "นำเข้า / ส่งออกทรัพย์สิน"), ค่าในไฟล์, ใช้อยู่กับ, อัปโหลดไฟล์ที่แก้แล้ว, ไม่ใช้ตัวกรอง, สร้างรหัสอัตโนมัติ, นำเข้าครบ / นำเข้าบางส่วน.
  - Messages through `scripts/messages-edit.mjs`:
    - `asset.importError.*` (P5-R4) in th and en;
    - `importWizardTitle` → "นำเข้าทรัพย์สินจาก Excel";
    - every board string of P5-R8 and P5-R10;
    - the 409 notices ("ข้อมูลเปลี่ยนไปหลังตรวจไฟล์ ตรวจผลใหม่ด้านล่างแล้วยืนยันอีกครั้ง", "รอบนำเข้านี้นำเข้าไปแล้ว");
    - remove `importHistoryRollback*`, `openImportWizard` and the "ตามสิทธิ์" text.
- Test:
  - `tests/thai-glossary.test.ts`.
  - A new case in `tests/asset-import-validate.test.ts`: every issue code has th and en text.
  - `tests/i18n-plural-count.test.ts`.

- [ ] **Step 1: Write the failing test** (codes ↔ messages). **Step 2: Run** it. Expected: FAIL. **Step 3:** glossary rows, then the change files. **Step 4: Run** the focused tests and `npm test`. **Step 5: Commit** `feat(import): words for the import and export page (group 4 plan 5)`

### Task 4: The import card

**Files:**
- Modify:
  - `src/components/assets/asset-import-preview-panel.tsx` (keep the path; `tests/validation-guards.test.ts:25`, `:107` name it). It takes `useTranslations("asset")` itself (ui.md D13); the page stops passing labels.
  - `src/lib/asset-import-wizard.ts`: pure helpers:
    - `buildImportIssueParts(issue, t)`;
    - `defaultImportFilter(summary)`;
    - `filterImportRows(rows, filter, limit = 100)`;
    - `summarizeAssetImportPreviewIssues` grouped by `field + code`.
- Test:
  - `tests/asset-import-wizard.test.ts`.
  - The pins in `tests/asset-register-ux.test.ts:159-195`, `tests/assets-sweep-ui.test.ts:130-143`, `tests/steps-ui.test.ts:107-125`, `tests/v-track2-a.test.ts:313-325`, `tests/asset-import-field-labels.test.ts:25-33`, `tests/file-evidence-ui.test.ts:117`, `tests/dead-code-cleanup.test.ts:56`, `:60`, `tests/form-migration-guards.test.ts` (GL1 sees no fixed bar).

- [ ] **Step 1: Write the failing tests:**
  - the issue parts for a Serial clash (field name, problem, value, tag, link href) and for an inactive tag;
  - the default filter;
  - the 100-row cut after the filter, with the hidden count;
  - the grouping key;
  - source pins:
    - open on arrival;
    - `FileDropzone id="asset-import-file"`;
    - `data-import-filter`, `data-import-row`;
    - the footer's two actions;
    - on 409, `previewChanged` replaces the preview and shows the notice;
    - the bytes are snapshotted (`arrayBuffer`) at pick.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** as P5-R4 and P5-R8 say. On the phone, the table uses `DataTable`'s phone rows.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(import): the import card open on arrival with a dropzone, Thai error lines, a row filter, an honest confirm and a done state (group 4 plan 5)`

### Task 5: The page: two columns, export card, history

**Files:**
- Modify:
  - `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx`:
    - grid `minmax(0,1fr) 350px` from `lg`;
    - the subtitle;
    - drop the three link cards and the "กลับ" link;
    - the export card (P5-R10);
    - history titled by file name, with "นำเข้าแล้ว a/b · ข้าม c", "<ชื่อ> · <วันที่>", the outcome badge, and the first 3 skipped rows in a disclosure;
    - "10 รอบล่าสุด";
    - the viewer layout (P5-R9).
  - `src/lib/asset-export-limits.ts`: `assetExportAllWhere()`, and `exportAllCountKey(count): "exportAllCount" | "exportAllCapped"`.
  - `DESIGN.md` (the back link, if listed).
- Test:
  - `tests/asset-export-limits.test.ts` (create if missing): `deepEqual(assetExportAllWhere(), { isActive: true })`; the key at 5,000 and 5,001.
  - Pins in `tests/assets-sweep-ui.test.ts:145-157`, `:229-253`, `tests/e2e-fixes.test.ts:76-85`, `tests/asset-register-ux.test.ts:280-287`, `tests/dead-code-cleanup.test.ts:19-28`.

- [ ] **Step 1: Write the failing tests.** **Step 2: Run** them. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint`. **Step 5: Commit** `feat(import-export): two-column page, export count, history by file name with skipped rows, viewer sees export and history (group 4 plan 5)`

### Task 6: E2E may import, and the import spec

**Files:**
- Modify:
  - `e2e/support/hazards.ts`: remove `excel-import`.
  - `e2e/support/fixtures.ts:32-34`: the comment.
  - `tests/e2e-review.test.ts:22-30`, `:66-67`, `:74`, `:94`, `:104` (P5-R1 allow-list).
  - `e2e/cross-cutting/support/refusals.ts`:
    - POST rows for both import routes (`asset:create`, body `{}`);
    - replace "เปิดตัวช่วยนำเข้า" in `WRITE_BUTTON_NAMES` with a control only an importer sees on arrival, and pin it.
  - Its pins in `tests/e2e-cross-cutting.test.ts:154-168` and `tests/e2e-register.test.ts:68-79`.
  - Docs: `docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md:72`, `:95` and `DEVELOPER_HANDOFF.md:1204` (a dated line: user 2026-11-02, import allowed on the dev DB).
- Create:
  - `e2e/assets/import-export.spec.ts`;
  - `e2e/assets/import-export-words.ts` (pinned to `messages/th.json`);
  - `e2e/assets/import-file.ts` (builds the `.xlsx` in memory with headers from `assetImportColumns`; MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
- Test: a new pin in `tests/e2e-register.test.ts`:
  - fixtures and `asUser("itStaff")`;
  - run-marked tag (`txAssetTag(runId, project, "IMP1")`), Serial and file name `${runId}-${projectCode}-import.xlsx`;
  - no blank tag;
  - no template fetch;
  - no master-data write and no `"DELETE"`;
  - only this spec names `#asset-import-file`;
  - the hooks exist in the app.

**What the spec does (IT staff, each of the 4 projects):**
1. Create a Serial holder with `createTxAsset(…, "IMPS", …, { serialNumber })`.
2. Read the company, branch and category codes from the `/th/assets/new` option labels ("code - name") of the run's company, branch and the คอมพิวเตอร์พกพา category. The room is `${runId}-L`.
3. Build the file with 3 rows:
   - one ready row (status พร้อมใช้งาน, condition ดี, no holder);
   - one with the room `${runId}-${projectCode}-NOLOC`;
   - one with the holder's Serial.
4. On the page:
   - upload;
   - check the stat tiles 3 / 1 / 2;
   - check the two Thai lines, including "ใช้อยู่กับ <IMPS tag>";
   - switch the filter;
   - confirm "ยืนยันนำเข้า 1 รายการ";
   - check the done state;
   - find the history row by the file name ("นำเข้าแล้ว 1/3 · ข้าม 2");
   - open the imported asset from the done state.
5. Run axe on the review and done states.

**Viewer:**
- sees the export card with a count line that matches `/รายการ · ไม่ใช้ตัวกรอง/` (the number is never pinned, because dev data grows);
- sees no dropzone and no template link;
- gets the API refusals.

- [ ] **Step 1: Write the failing pins.** **Step 2: Run** `npx tsx --test tests/e2e-review.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-register.test.ts`. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** the pins, `npx playwright test --list e2e/assets/import-export.spec.ts`, `npm test`, `npx tsc --noEmit`, `npm run lint`. **Step 5: Commit** `test(e2e): the suite may run the Excel import on the dev DB (user 2026-11-02); import-export spec (group 4 plan 5)`

### Task 7: Docs, the targeted E2E run and the look step (controller)

**Docs:**
- `docs/06_WORKFLOWS.md:18`, `:26`;
- `docs/11_FEATURE_LIST.md:107`;
- `docs/07_UAT_CHECKLIST.md` (an import of a real lot on Production is a UAT line);
- `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DESIGN.md`;
- `docs/99_CHANGELOG.md`;
- `DEVELOPER_HANDOFF.md` (the E2E run id and the counts);
- the wiki (`ams-` pages, `ams-log.md`, lint; wiki item 36's "ห้ามกดนำเข้า" gets a dated note).

**E2E run** (VPN probe, keep-awake), 4 projects:
- `e2e/assets/import-export.spec.ts`
- `e2e/cross-cutting/roles.spec.ts`
- `e2e/cross-cutting/reports.spec.ts`
- `e2e/assets/register-bulk-correction.spec.ts`
- `e2e/smoke`

**Look step:** the page at 1440, 1024 and phone, both themes:
- an error preview;
- the done state;
- the viewer.

**Commit:** `docs: group 4 plan 5 E2E results, the look step and the changelog`
