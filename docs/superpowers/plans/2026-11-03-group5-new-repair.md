# Page group 5, plan 2: บันทึกซ่อม (MT-New) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[locale]/maintenance/new` to board MT-New, in three numbered sections with a summary column and a sticky footer.
- The page shows the picked asset, whether a new record is allowed, and what the save will do to its status, before the save.
- It refuses early what the server would refuse.
- It pre-picks no answer, except ซ่อมเสร็จแล้ว on the PM path.

**Architecture:**
- **One server read** gives the asset facts the form needs (status, holder, department, room, branch, photo, open record, open handover). The page load uses it, and so does the picker's by-id read.
- **One pure, client-safe helper** turns facts and answers into what will happen. It is built on `getRepairRecordCreateEffect`.
- **The form** uses the group 3 parts: `OperationFormFrame`, which gains optional breadcrumbs and a back link, `FormSection` and `OperationSummaryCard`.
- **Plan 3 reuses** the asset card and the held-asset notice.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, `node --test` (`npx tsx --test`), Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-03-page-group-5-maintenance-design.md`, which this plan follows:
- §7 (all of it);
- §5: early refusal, ON_LOAN wording, no default, status line, way back;
- §6: the MT-New rows;
- §13: "repairRecord (new)";
- §16: the specs that change, and the new specs this page owns;
- §17: row 2;
- decisions 1, 2, 10.5, 10.8 and 11;
- Appendix A "New".

It also takes over G5P1-R1 from plan 1 (`docs/superpowers/plans/2026-11-03-group5-rules.md`): the "what will happen" helper and the asset facts read.

**Board:** session scratchpad `artifact-files/182f6683-…/project/MT-New.dc.html` (PNG `g5/boards/MT-New.png`). **Recon:** `g5/recon/r-new.md`. Scratchpad: `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/`.

## Global Constraints

- **Branch and repo:**
  - Branch `feat/group5-new-repair` from `master` `3de1fa6f`. No push.
  - No schema change, no migration and no database command.
  - Implementer tasks run no build, no dev server and no E2E. `npx playwright test --list` is fine.
- **Files to leave alone:**
  - Never read `.env*`.
  - Leave the untracked paths alone: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- **Parts and tokens:**
  - Use the shared parts only (spec §5): `OperationFormFrame`, `FormSection`, `OperationSummaryCard`, `ChoiceCard`, `FieldGroup`, `Field`, `AssetConditionChoice`, `MaintenanceOptionSelect`, `FileDropzone`, `FileQueueList`, `FormContextBanner`, `Notice`, `StatusBadge`, `AssetThumbnail`.
  - No hex or rgba, no `dark:`, no `/NN` tints, no dashed borders. Both themes.
  - State colour lives only in badges and `Notice` tones.
- **Pickers:** keep "code - name". The card and the summary show the name first, then the tag.
- **Words:**
  - Change messages only through `node scripts/messages-edit.mjs <file>`. Change files go in `<scratchpad>/g5/msg/p2-*.json`, Thai and English.
  - Use the values of spec §13 "repairRecord (new)" verbatim. "บันทึก" (not "ใบงาน") names a record.
  - The glossary test must stay green.
- **Bangkok days:** the date input's default and its `max` come from `getBangkokDateKey(new Date())`, not from the browser's zone.
- **Stable hooks:**
  - These ids stay: `#repair-record-asset`, `#repair-record-asset-value`, `#repair-record-problem`, `#repair-record-date`, `#repair-record-done`, `#repair-record-outcome`, `#repair-create-condition`, `#repair-record-reporter`, `#repair-record-vendor`, `#repair-record-cost`, `#repair-record-invoice-no`, `#repair-record-remark`.
  - New: `data-repair-eligibility="ok|openRecord|writtenOff"` on the eligibility line, `data-repair-status-line` on the status line, and `data-repair-held` on the held-asset notice.
- **Guards:**
  - Every source-reading test that pins a changed file moves in the same task, with exact counts.
  - `/th/maintenance/new` joins `STICKY_FOOTER_ROUTES` under `operation-form-frame.tsx` (`tests/form-migration-guards.test.ts`).
- **Commits:**
  - CRLF files keep CRLF.
  - Before each commit, run the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors).
  - Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings made while planning

- **G5P2-R1 (one facts read):**
  - `loadRepairAssetFacts(db, assetId)` is the one read.
  - The picker's by-id read is `GET /api/maintenance-options?type=asset&id=<id>`. It returns the option with `facts`, so no new route and no new RBAC row. Search results (`q=`) carry no facts.
  - After a pick, the form fetches the by-id read once. The select itself stops fetching by id when the picked option is already in its list (spec §7.2, call 7).
- **G5P2-R2 (holder on an open handover):** the handover's holder is named from its `checkoutType`:
  - `user`: the custodian's `fullNameTh`;
  - `department`: the department's name;
  - `location`: the room's name;
  - `asset`: the parent asset's name.

  Names only, no codes, in the sentence "อยู่กับ {holder} ตามใบส่งมอบ {documentNo} ต้องรับคืนก่อน".
- **G5P2-R3 (done without a result):**
  - With ซ่อมเสร็จแล้ว chosen and no result yet, the status row reads "ขึ้นกับผลการซ่อม" (new key `createForm.dependsOnOutcome`).
  - The block "ถ้าตอบว่าซ่อมเสร็จแล้ว" shows while the done question is unanswered, answered not done, or answered done without a result. It always shows both results.
- **G5P2-R4 (the save stays enabled):** the save is never disabled by a refusal (spec §5). The server answers it, and its field and toast handling stay as today.
- **G5P2-R5 (switching answers):**
  - Leaving ซ่อมเสร็จแล้ว clears the result and the condition from the payload; the page keeps them in state, so going back restores them.
  - The payload sends `outcome` and `conditionId` only for a done record.
- **G5P2-R6 (the PM path):**
  - `?planId=` pre-picks ซ่อมเสร็จแล้ว and shows no "ระบบไม่เลือกไว้ให้". The result starts empty.
  - The summary row แผน PM reads "ครั้งถัดไป <plan's nextDueDate>" → `calculateNextMaintenanceDueDate(<record date>, frequency, intervalDays)` when done, or "ไม่เลื่อน จนกว่าจะกดซ่อมเสร็จ" when not done.
- **G5P2-R7 (status names):** the page passes `statusLabels` (every active status, `name` → `nameTh`), so the client names the next status without a fetch. Badges take `getAssetStateTone(name)`.
- **G5P2-R8 (the เปลี่ยน button):** "เปลี่ยน" clears the picked asset and opens the picker again. It is hidden on the PM path. Clearing also clears the facts and the condition default.
- **G5P2-R9 (the record link):** "เปิดบันทึกที่ยังไม่เสร็จ" opens `/{locale}/maintenance/<openRecord.id>` with this page's `returnTo` (spec call 8).
- **G5P2-R10 (the submit key):** `repairRecord.save` becomes "บันทึกซ่อม". The form is its only reader; the dialogs use `common.save`.

## Review Focus

1. **`?assetId=` of an asset that already has an open record.** The card shows "มีบันทึกซ่อมที่ยังไม่เสร็จ MT-…" with its link at once, before any save (Task 3, Task 4).
2. **The asset changed after answering.** The status line, the refusal and the summary follow the new asset. A slow facts answer for the old asset never overwrites the new one: the fetch is aborted, and the answer is checked against the current id (Task 3).
3. **Answer flips:** ซ่อมเสร็จแล้ว + ซ่อมไม่ได้, then ยังซ่อมไม่เสร็จ. The payload carries `done: false`, `outcome: null` and `conditionId: null`. The refusal for a held asset disappears when the answer no longer hits it (Task 2).
4. **A held asset whose handover has no `documentNo` (a backfill).** The notice reads "อยู่กับ {holder} ตามใบส่งมอบที่ยังไม่รับคืน ต้องรับคืนก่อน" (Task 1, Task 2).
5. **A user without `asset:edit`.** The held notice shows its text without the รับคืน link (Task 3).

---

### Task 1: The asset facts read and the "what will happen" helper

**Files:**
- Create:
  - `src/lib/repair-record-outlook.ts`: client-safe and pure. Relative imports only; Prisma for types only.
  - `src/lib/repair-asset-facts.ts`: the server read. The db is injected; the file never imports `./db`.
- Modify:
  - `src/lib/maintenance-options.ts`: the by-id read of type `asset` attaches `facts`.
  - `src/app/api/maintenance-options/route.ts`: passes a db that can do the facts read.
- Test: new `tests/repair-record-outlook.test.ts`, new `tests/repair-asset-facts.test.ts`, `tests/maintenance-options.test.ts`.

**Interfaces:**
- Produces in `repair-record-outlook.ts`:
  - `type RepairAssetFacts = { id: string; assetTag: string; name: string; statusName: string; statusLabel: string; conditionId: string; conditionLabel: string; ownershipType: string | null; custodianId: string | null; holderName: string | null; departmentName: string | null; roomName: string | null; branchName: string | null; photo: AssetPhotoPreview | null; openRecord: { id: string; repairNo: string } | null; activeCheckout: { id: string; documentNo: string | null; holderName: string | null } | null }`.
  - `toRepairAssetContext(facts): RepairAssetContext`.
  - `getRepairEligibility(facts): "ok" | "openRecord" | "writtenOff"`. Written off is Disposed or Retired by `normalizeAssetStateName`.
  - `type RepairCreateAnswer = { done: boolean | null; outcome: RepairOutcome | null }`.
  - `type RepairHeld = { checkoutId: string; documentNo: string | null; holderName: string | null }`.
  - `type RepairCreateOutlook = { kind: "unanswered" } | { kind: "dependsOnOutcome" } | { kind: "refused"; error: RepairRecordErrorCode; held: RepairHeld | null } | { kind: "status"; nextStatusName: string; changes: boolean }`.
  - `getRepairCreateOutlook(facts, answer): RepairCreateOutlook`:
    - `done === null` → unanswered;
    - done with no outcome → dependsOnOutcome;
    - otherwise `getRepairRecordCreateEffect(toRepairAssetContext(facts), answer)`. An error becomes refused, with `held` = `facts.activeCheckout` (as `RepairHeld`) for `MAINTENANCE_ASSET_ON_LOAN`, else null. Success becomes status, with `nextStatusName` = the effect's name or the current one, and `changes` = whether it differs.
- Produces in `repair-asset-facts.ts`: `loadRepairAssetFacts(db: RepairAssetFactsDb, assetId: string): Promise<RepairAssetFacts | null>`.
  - It reads the active asset (status `name`/`nameTh`, condition `nameTh`, custodian `fullNameTh`, department `name`, currentLocation `name` with its branch `name`, `modelId`).
  - It reads the open record (`openRepairRecordWhere`, newest, `id`/`repairNo`) and the open handover (`isReturned: false, transactionStatus: "active"`, newest), with the holder named per G5P2-R2.
  - It reads the photo through `readAssetPhotoPreviews`.
  - An inactive or unknown id gives null.
- Produces in `maintenance-options.ts`: `MaintenanceOption.facts?: RepairAssetFacts`, set only on `type: "asset"` with `id`.

- [ ] **Step 1: Write the failing tests.**
  - Outlook, with facts of a Ready shared asset:
    - `{ done: null }` → unanswered;
    - `{ done: true, outcome: null }` → dependsOnOutcome;
    - `{ done: false }` → status "Under Maintenance", changes true;
    - `{ done: true, outcome: "usable" }` → status "Ready", changes false.
  - An In Use personal asset with an open handover `{ id: "co-1", documentNo: "HO-1", holderName: "สมชาย" }` and `{ done: true, outcome: "beyond_repair" }` → `{ kind: "refused", error: "MAINTENANCE_ASSET_ON_LOAN", held: { checkoutId: "co-1", documentNo: "HO-1", holderName: "สมชาย" } }`. The same with `documentNo: null` keeps null (Review Focus 4).
  - Under Maintenance, not done → status "Under Maintenance", changes false (decision 11). Under Inspection, not done → refused `MAINTENANCE_ASSET_INELIGIBLE` with held null.
  - Eligibility: an open record → "openRecord"; Disposed → "writtenOff"; else "ok".
  - Facts with a fake db:
    - a `department` handover → `holderName` = the department's name;
    - an `asset` handover → the parent's name;
    - no open record → `openRecord: null`;
    - an inactive asset → null.
  - Options: `type: "asset", id: "a-1"` returns one option with `facts`; `q: "ab"` returns options without `facts`.
- [ ] **Step 2: Run** `npx tsx --test tests/repair-record-outlook.test.ts tests/repair-asset-facts.test.ts tests/maintenance-options.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** as the Interfaces say.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5: Commit** `feat(maintenance): one read of a repair's asset facts and a pure helper for what the save will do (group 5 plan 2)`

### Task 2: The form's rules (pure)

**Files:**
- Create: `src/lib/repair-record-form-rules.ts`, client-safe and pure.
- Test: new `tests/repair-record-form-rules.test.ts`.

**Interfaces:**
- Consumes: Task 1's types and `getRepairCreateOutlook`, `getRepairEligibility`.
- Produces:
  - `type RepairFormValues = { assetId: string; reportedDate: string; problem: string; done: boolean | null; outcome: RepairOutcome | null; conditionId: string; reportedById: string; vendorId: string; repairCost: string; invoiceNo: string; remark: string }`.
  - `validateRepairForm(values, options: { needsReporter: boolean; todayKey: string }): Partial<Record<RepairField, string>>`. It keeps today's checks (`repair-record-form.tsx:84-99`) and adds:
    - `done` null → `"repairDoneRequired"`;
    - done with no outcome → `"repairOutcomeRequired"`;
    - `reportedDate > todayKey` → `"repairDateInFuture"`.
  - `repairFieldOrder(values, needsReporter): RepairField[]`, today's rule with `done === true`.
  - `buildRepairCreatePayload(values, options: { planId: string | null; needsReporter: boolean })`: G5P2-R5. `outcome` and `conditionId` only when done (condition only when usable), else null.
  - `type RepairSummaryRow = { key: "status" | "holder" | "record" | "condition" | "plan"; now: RepairSummaryValue; next: RepairSummaryValue; changed: boolean }`, where `RepairSummaryValue = { kind: "status"; name: string } | { kind: "text"; messageKey: string; values?: Record<string, string> } | { kind: "plain"; text: string }`.
  - `buildRepairCreateSummary(input: { facts: RepairAssetFacts | null; values: RepairFormValues; conditionLabels: Record<string, string>; salvageLabel: string; plan: { nextDueDate: string; frequency: MaintenancePlanFrequency; intervalDays: number | null } | null }): { rows: RepairSummaryRow[]; ifDone: { usable: RepairCreateOutlook; beyondRepair: RepairCreateOutlook } | null; checklist: Array<{ key: "asset" | "dateProblem" | "done" | "outcome" | "condition"; done: boolean }> }`. Values per spec §7.5:
    - The status row's next comes from the outlook. Unanswered → text `createForm.dependsOnAnswer`; dependsOnOutcome → `createForm.dependsOnOutcome`; refused → the current status, unchanged.
    - holder → `createForm.noChange`.
    - record: now `createForm.noOpenRecord`; next per answer.
    - condition: only when done.
    - plan: only with a plan (G5P2-R6).
    - `ifDone` per G5P2-R3.
    - checklist: the outcome item only when done, the condition item only when done + usable.
  - `repairFooterAnswerKey(values): "doneNo" | "doneUsable" | "doneBeyond" | "doneNoOutcome" | "unanswered"`.

- [ ] **Step 1: Write the failing tests.**
  - `validateRepairForm` with `todayKey "2026-11-03"`:
    - empty done → `{ done: "repairDoneRequired" }` among the errors;
    - done with no outcome → `{ outcome: "repairOutcomeRequired" }`;
    - date `"2026-11-04"` → `{ reportedDate: "repairDateInFuture" }`;
    - done + usable without a condition → `conditionAfterRepairRequired`.
  - `buildRepairCreatePayload`: values `{ done: false, outcome: "beyond_repair", conditionId: "c-1" }` → `{ done: false, outcome: null, conditionId: null }` (Review Focus 3). With done + usable → the outcome and the condition.
  - `buildRepairCreateSummary`:
    - A Ready asset, not done → status row now `{ kind: "status", name: "Ready" }`, next `"Under Maintenance"`, changed true; `ifDone` not null.
    - Done + usable → `ifDone` null; the condition row next = the chosen label.
    - A plan with `nextDueDate "2026-01-31"`, monthly, record date `"2026-01-31"`, done → plan row next `{ kind: "plain", text: "2026-02-28" }` (an ISO day the component formats).
    - Not done → next text `createForm.planNotMoved`.
  - `repairFooterAnswerKey` covers its five values.
- [ ] **Step 2: Run** `npx tsx --test tests/repair-record-form-rules.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5: Commit** `feat(maintenance): the repair form's rules: no default answer, the summary, the payload and the footer line (group 5 plan 2)`

### Task 3: The page and the form

**Files:**
- Modify:
  - `src/components/asset-operations/operation-form-frame.tsx`: optional `breadcrumbs?: BreadcrumbItem[]` and `back?: ReactNode`, passed to `PageHeader`. The comment "no breadcrumb" is updated. ส่งมอบ, รับคืน and โอนย้าย pass neither, so they do not change.
  - `src/app/[locale]/(dashboard)/maintenance/new/page.tsx`:
    - facts through `loadRepairAssetFacts` for `?assetId=` or the plan's asset;
    - `statusLabels` (G5P2-R7), the condition options and their labels;
    - the plan with `nextDueDate`, `frequency` and `intervalDays`;
    - `canReturn = hasPermission(user, "asset", "edit")`;
    - the reporter's name for the footnote (`user.employeeId` → the employee's `fullNameTh`);
    - `todayKey = getBangkokDateKey(new Date())`.
  - `src/components/maintenance/repair-record-form.tsx`, rewritten on the frame:
    - **Section 1** "ทรัพย์สินที่ซ่อม": the picker before a pick; the card after it; the PM banner.
    - **Section 2** "อาการและความคืบหน้า":
      - date (`max={todayKey}`), problem, the reporter picker when needed;
      - the done question: two `ChoiceCard`s, each a label with a line under it; the faint note "ระบบไม่เลือกไว้ให้" off the PM path;
      - with ซ่อมเสร็จแล้ว, the result question, then สภาพหลังซ่อม for ใช้งานได้, or the ซาก line for ซ่อมไม่ได้;
      - the status line or the refusal `Notice` (spec §7.3), with MT-New's extra hint after a held refusal.
    - **Section 3** "รายละเอียดเพิ่มเติม" with the tag "ไม่บังคับ": open, no toggle (call 10). It holds the vendor, cost (placeholder "ใส่ตอนซ่อมเสร็จได้"), invoice (placeholder "ยังไม่มี"), files (hint by answer, §7.4) and remark.
    - **The summary:** `OperationSummaryCard` from `buildRepairCreateSummary`, plus the "ถ้าตอบว่าซ่อมเสร็จแล้ว" block and the footnote (§7.5).
    - **The footer:** "บันทึกซ่อม **<name>** <tag> · <answer>", ยกเลิก → `returnTo`, primary "บันทึกซ่อม".
    - **The status line by outlook:**
      - unanswered or dependsOnOutcome: no line;
      - status: "สถานะทรัพย์สิน: <badge> → <badge> จนกว่าจะกดซ่อมเสร็จ" when not done, "→ <badge>" when done, "สถานะทรัพย์สินคงเป็น <badge>" when done without a change;
      - refused `MAINTENANCE_ASSET_ON_LOAN`: `RepairHeldNotice`; with `held` null, the reworded ON_LOAN message;
      - refused `MAINTENANCE_ASSET_INELIGIBLE`: a warning `Notice` "สถานะ <status> บันทึกว่ายังซ่อมไม่เสร็จไม่ได้";
      - refused for an open record or a written-off asset: no line (the card's eligibility line says it).
    - **The save** keeps today's flow (§7.6): the POST with `buildRepairCreatePayload`, the uploads one by one by answer, the toasts, the open-record and field-error handling, then the record page with `returnTo`.
    - **The facts fetch** after a pick: `AbortController`, and the answer is ignored unless its `id` equals the current `assetId` (Review Focus 2).
  - `src/components/maintenance/maintenance-option-select.tsx`: no by-id fetch when the value's option is already known (G5P2-R1).
- Create:
  - `src/components/maintenance/repair-asset-card.tsx`: the photo or its empty frame (`AssetThumbnail` 44), the name, the tag, the status badge, the line "ผู้ถือครอง <holder> · <แผนก> · <room> · <branch>" (parts left out when null; "ไม่มีผู้ถือครอง"), and the eligibility line with its record link (G5P2-R9). Its "เปลี่ยน" button is optional (G5P2-R8). Plan 3 reuses it.
  - `src/components/maintenance/repair-held-notice.tsx`: the early-refusal `Notice` (warning tone, `data-repair-held`). It holds:
    - the text by `documentNo`;
    - the link "รับคืน" to `buildAssetRegisterTransactionHref(locale, assetId, "checkin", \`/${locale}/assets/${assetId}\`, checkoutId)`, only when `canReturn` (Review Focus 5);
    - an optional `hint` line.

    Plan 3 reuses it.
  - Messages through `<scratchpad>/g5/msg/p2-new.json`:
    - New keys under `repairRecord.createForm.*`, with the values of spec §13 "repairRecord (new)" and `dependsOnOutcome` "ขึ้นกับผลการซ่อม".
    - Changed: `repairRecord.createSubtitle`, `doneNo` "ยังซ่อมไม่เสร็จ", `filesHelp`, `save` "บันทึกซ่อม".
    - New: `doneNoHelp`, `doneYesHelp`.
    - The field codes `repairDoneRequired` "เลือกว่าซ่อมเสร็จหรือยัง" and `repairOutcomeRequired` (exists) in `apiErrors`, so `useValidationMessage` resolves them.
    - Removed: `repairRecord.assetStatusEffect.*` and `moreDetails`.
- Test:
  - `tests/repair-record-ui.test.ts` (rewritten pins: sections, no default `done`, the frame, the footer, the held notice, the abort guard, `max`);
  - `tests/form-migration-guards.test.ts` (`STICKY_FOOTER_ROUTES`);
  - `tests/form-frames-ui.test.ts`;
  - `tests/maintenance-option-select.test.ts`;
  - `tests/maintenance-i18n.test.ts` when it pins removed keys.

**Interfaces:**
- Consumes: Task 1 (`loadRepairAssetFacts`, `getRepairEligibility`, `getRepairCreateOutlook`, `RepairAssetFacts`) and Task 2 (all of it).
- Produces:
  - `RepairAssetCard({ facts, locale, returnTo, onChange?: () => void })`;
  - `RepairHeldNotice({ held: RepairHeld, assetId: string, locale: string, canReturn: boolean, hint?: ReactNode })`;
  - `OperationFormFrameProps.breadcrumbs` and `.back`.

- [ ] **Step 1: Write the failing pins.**
  - The form source has no `done: true` default.
  - The form renders `OperationFormFrame` with `breadcrumbs`, three `FormSection`s and `OperationSummaryCard`.
  - The card source has `data-repair-eligibility`; the held notice has `data-repair-held` and renders the รับคืน link only under `canReturn`.
  - The facts fetch uses `AbortController` and compares the answer's id.
  - The date input has `max={todayKey}`.
  - The routes guard lists `/th/maintenance/new`.
  - Th `repairRecord.save` is "บันทึกซ่อม" and `doneNo` "ยังซ่อมไม่เสร็จ".
- [ ] **Step 2: Run** `npx tsx --test tests/repair-record-ui.test.ts tests/form-migration-guards.test.ts tests/form-frames-ui.test.ts tests/maintenance-option-select.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint` and `npx playwright test --list e2e/repair`.
- [ ] **Step 5: Commit** `feat(maintenance): บันทึกซ่อม on the operation frame with the asset card, no default answer, the status line, the early refusal and the summary (group 5 plan 2)`

### Task 4: E2E

**Files:**
- Modify:
  - `e2e/repair/repair-data.ts`:
    - `saveRepairForm` presses the sticky footer's "บันทึกซ่อม";
    - new `answerRepair(page, answer: { done: boolean; outcome?: "ใช้งานได้" | "ซ่อมไม่ได้ เสนอจำหน่าย"; condition?: "ดี" | "พอใช้" })` checks the radios by name and the condition when asked.
  - `e2e/repair/repair-record.spec.ts`:
    - the radio is "ยังซ่อมไม่เสร็จ";
    - the old status text becomes the status line: `data-repair-status-line` contains "อยู่ระหว่างซ่อม";
    - the save button name;
    - the eligibility line "ไม่มีบันทึกซ่อมที่ยังไม่เสร็จ บันทึกใหม่ได้" after the pick;
    - ER3: `?assetId=` of the asset under repair shows `data-repair-eligibility="openRecord"` with "มีบันทึกซ่อมที่ยังไม่เสร็จ <repairNo>" and its link to the record (Review Focus 1).
  - `e2e/repair/pm-plan.spec.ts`: ซ่อมเสร็จแล้ว pre-checked, no result checked; choose ใช้งานได้ (and ดี if no condition is pre-chosen) before saving.
  - `e2e/transactions/handover-condition.spec.ts:87-100`: answer ซ่อมเสร็จแล้ว and ใช้งานได้ explicitly.
  - `e2e/dashboard/dashboard-words.ts`: `repairNotDone` "ยังซ่อมไม่เสร็จ".
- Create, in `e2e/repair/repair-record.spec.ts`:
  - **"a held asset is refused at once"** (IT staff):
    - create a personal asset;
    - hand it over permanently (`handOverPermanently`);
    - open `/th/maintenance/new?assetId=…`;
    - answer ซ่อมเสร็จแล้ว + ซ่อมไม่ได้ เสนอจำหน่าย;
    - `data-repair-held` contains "อยู่กับ" and the handover's HO- number, and its "รับคืน" link's href holds `/th/asset-management/checkin?checkoutId=` and `returnTo=%2Fth%2Fassets%2F<id>`;
    - switch to ยังซ่อมไม่เสร็จ: the notice goes and the status line reads "ใช้งานอยู่" → "อยู่ระหว่างซ่อม" (Review Focus 3).
  - **"a PM visit saved not done leaves its plan's date"** (IT staff):
    - create a run-marked monthly plan through `POST /api/maintenance-plans`;
    - open `?planId=`: ซ่อมเสร็จแล้ว is checked and no result is checked;
    - answer ยังซ่อมไม่เสร็จ and save;
    - the plan's `nextDueDate` (read through the PM edit page's date input) is unchanged;
    - end the plan through `PATCH {action:"end"}`.
  - Pins in `tests/e2e-repair.test.ts`.

- [ ] **Step 1: Write the failing pins** in `tests/e2e-repair.test.ts`: the new test titles exist, `saveRepairForm` names "บันทึกซ่อม", and no spec names "ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)". **Step 2: Run** them. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** the pins, `npx playwright test --list e2e/repair e2e/transactions e2e/dashboard`, `npm test`, `npx tsc --noEmit` and `npm run lint`. **Step 5: Commit** `test(e2e): บันทึกซ่อม answers its questions, refuses a held asset at once, and a PM visit not done leaves its plan (group 5 plan 2)`

### Task 5: Docs, the targeted E2E and the look step (controller)

**Docs:**
- `docs/06_WORKFLOWS.md` and `docs/17_REPAIR_RECORD_GUIDE_TH.md`: no pre-chosen answer, ระบบไม่เลือกไว้ให้, the early refusal with รับคืน.
- `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `DESIGN.md`: the frame's optional breadcrumbs, the repair asset card and the held notice.
- `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md`.
- The wiki: status, open questions, log, then lint.

**E2E on the dev DB** (VPN probe, keep-awake), 4 projects: `e2e/repair`, `e2e/transactions/handover-condition.spec.ts`, `e2e/dashboard`, `e2e/smoke`.

**Look step:** `/th/maintenance/new` at 1440, 1024 and 390, in both themes:
- empty;
- a picked asset not done;
- done + ใช้งานได้;
- a held asset refused;
- the PM path;
- an asset with an open record.

**Dry run:** none. No migration and no Production data. The page and its specs run on the dev DB.
