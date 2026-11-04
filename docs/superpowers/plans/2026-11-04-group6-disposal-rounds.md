# Page group 6, plan 4: the disposal queue and disposal rounds (DP-Queue, round pages, the accounting Excel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every actual disposal is recorded through a **รอบตัดจำหน่าย** (a disposal round):
- one method chosen at the round;
- one date, one buyer or recipient, one document;
- one lump sale price;
- up to 200 machines;
- all or nothing.

The round has its own page and an accounting Excel (asset tag, name, Serial, photo). The queue becomes board DP-Queue, its approved tab gains ticks that persist across pages and "สร้างรอบตัดจำหน่าย". Per-row and bulk execution are retired.

**Architecture:**
- **Schema:** a new table `disposal_rounds` and a nullable `disposal_requests.roundId`, added as an idempotent manual migration. It is applied to the dev DB by the controller, and to Production on deploy day with approval.
- **Round service:**
  - It reuses today's execution checks through an extracted in-transaction helper.
  - It writes set-based for 200 machines inside one Serializable transaction.
  - It has a preview mode that names every blocked machine.
- **Pages:** `/disposal/rounds`, `/disposal/rounds/new` and `/disposal/rounds/[id]`, in the look of DP-Batches, DP-Batch-New and DP-Batch.
- **Report:** `exceljs` with images converted by `sharp`.

**Tech Stack:** Next.js 16, Prisma 7 on SQL Server, `exceljs` 4.4, `sharp`, next-intl, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-page-group-6-disposal-approvals-design.md`. This plan covers §16 row 4:
- §9.4 and §10;
- §11.1–11.5;
- §12;
- §14.1 calls 15, 16, 17, 18, 22;
- decisions 4, 5, 6, 7, 9, 10, 11.

## Global Constraints

- **Words:**
  - Thai first; words from `docs/19_THAI_GLOSSARY.md`.
  - The round is **รอบตัดจำหน่าย**; "รอบจำหน่าย" is pinned out.
  - The execute action reads **บันทึกตัดจำหน่าย** (no "จริง").
  - The method `dispose` reads **ตัดจำหน่าย**.
  - Value labels: **มูลค่าขาย / มูลค่าซาก**. The round's price is **ราคาขายเหมา**.
  - Messages change only through `node scripts/messages-edit.mjs <change.json>` with **dotted keys**. A nested object replaces a namespace; check `git diff --stat messages/` after each run.
- **No price at request time:** the round's lump price is the only price (user 2026-11-04). A request executed in a round keeps `actualSaleValue` empty.
- **The round:**
  - **Machines:** at most **200**, from the approved tab.
  - **Method:** one method, **chosen at the round**; it is written onto each request, and the audit log keeps `fromDisposalType`.
  - **Executor:** the executor is preset to the signed-in user's employee. The options exclude every selected machine's approver, as separation of duties requires.
  - **Required fields:**
    - วันที่จำหน่าย, not in the future, by the Bangkok day;
    - เลขที่เอกสาร;
    - ผู้ซื้อ/ผู้รับ for ขาย, บริจาค and ตัดจำหน่าย;
    - ราคาขายเหมา for ขาย;
    - รายละเอียดการดำเนินการ for ทำลาย and สูญหาย.
  - **Asset status:** the asset becomes **Disposed** for every method, and its PM plans end.
  - **All or nothing:** one Serializable transaction (timeout 120 s). Any refusal rolls back everything. There is no undo.
  - **Evidence exception:** the evidence-exception option (system admin only) moves onto the round form: one checkbox and a required reason, logged per machine as `execute_historical_without_evidence`.
- **Numbering:** `DPR-yyyyMMdd-NNNN` by the **Bangkok** day, inside `withPrismaUniqueRetry`.
- **Report permission:** `disposal:view` (decision 10).
- **Production safety:**
  - The migration is idempotent T-SQL, in the shape of `prisma/manual-migrations/2026-07-13-add-disposal-batches.sql`.
  - It is applied to the **dev DB only** in this plan, through `npm run migration:apply`, and by the controller.
  - Production is applied on deploy day through `--db-env .env.prod-admin`, after the user approves the full SQL.
  - **It must run before the deploy:** once `roundId` is in the Prisma client, every DisposalRequest read fails without the column. It is not gated with `omit`.
- **Line endings:** the migration file is committed, then applied from the committed working copy. The dev ledger shows `2026-10-20-users-employee-filtered-unique.sql` as `checksum_mismatch` (CRLF in this checkout against the bytes applied); that is a deploy-day note, not this plan's to fix.
- **E2E:** runs only on `asset_management_dev`, with run-marked data; no LDAP sync, no settings save, no delete, no master-data change.

## Rulings (made while writing; the controller records them in the ledger)

- **P4-R1:** the retired execution routes (`PATCH /api/disposal-requests/[id]` `action:"execute"` and `POST /api/disposal-requests/bulk-execution`) answer **410** with `{ code: "DISPOSAL_USE_ROUND" }`. Their UI, `disposal-execution-button.tsx` and `disposal-bulk-execution.tsx`, is deleted with the tests that only pin it. `src/lib/disposal-bulk-execution*.ts` is kept only where the round service reuses it; otherwise it goes too. *Cost if wrong:* a stale client gets a clear 410.
- **P4-R2:** the selected ids travel to `/disposal/rounds/new` in `sessionStorage` (`disposal-round-selection`), as the inbox selection does. A direct visit with no selection shows "ยังไม่ได้เลือกเครื่อง · เลือกจากแท็บอนุมัติแล้ว" with that link. *Cost if wrong:* a refresh on another device loses the selection.
- **P4-R3:** the round page lists machines with photo thumbnails; a request with no image reads "ไม่มีรูป". The round has no files of its own (spec §4). *Cost if wrong:* no place on the round for the buyer's receipt; the document number names it.
- **P4-R4:** request batches (`/disposal/batches`) keep today's pages and move into a "ชุดคำขอ ▾" header menu (spec §10.1); nothing else in them changes. *Cost if wrong:* none.

## Review Focus

1. **A machine in the selection was rejected, executed or re-approved by someone else between the preview and the save.** The transaction re-checks every machine, refuses the whole round and names the machine, so nothing half-saves. *(Task 2 test.)*
2. **The executor is the approver of one of the 150 machines.** The preview names that machine with "คุณอนุมัติรายการนี้", and the executor list never offers an approver of any selected machine. *(Task 2 test.)*
3. **A request's only photo file is missing on disk, or is an old HEIC.** The Excel cell reads "ไม่มีรูป" and the file still downloads; nothing answers 500. *(Task 5 test.)*
4. **Two rounds saved at the same moment on the same Bangkok day** get distinct `DPR-` numbers (the unique retry), and neither loses machines. *(Task 2 test of the numbering helper; Task 2 service test with a forced unique error.)*
5. **200 machines on the dev DB.** The save finishes within the 120 s timeout. *(Task 7 timing, controller.)*

---

### Task 1: Schema, migration and numbering

**Files:**
- Modify: `prisma/schema.prisma` (the `DisposalRound` model, `DisposalRequest.roundId` and relation and index, the `Employee` back-relation; spec §11.1 has the model verbatim)
- Create: `prisma/manual-migrations/2026-11-05-add-disposal-rounds.sql`
- Create: `src/lib/disposal-round-number.ts`
- Modify: `docs/03_DATABASE.md` (the migration's paragraph in the policy list)
- Test: new `tests/disposal-round-number.test.ts`, new `tests/disposal-round-migration.test.ts` (source pins)

**Interfaces:**
- Produces:
  - Prisma `DisposalRound` (spec §11.1) and `DisposalRequest.roundId: string | null`.
  - `formatDisposalRoundNumber(bangkokDateKey: string, sequence: number): string`, giving `DPR-yyyyMMdd-NNNN` with 4 digits.
  - `nextDisposalRoundSequence(db, bangkokDateKey: string): Promise<number>`, the count of that day's rounds plus one.

- [ ] **Step 1: Write the failing tests**
  - `formatDisposalRoundNumber("2026-11-05", 7)` → `"DPR-20261105-0007"`; `(…, 12)` → `"DPR-20261105-0012"`.
  - `nextDisposalRoundSequence` with a fake db of 2 rounds that day → 3.
  - The migration pins: the SQL has
    - `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[disposal_rounds]')`;
    - `COL_LENGTH('dbo.disposal_requests', 'roundId') IS NULL`;
    - the named `PK_disposal_rounds`, `FK_disposal_rounds_executedById`, `FK_disposal_requests_roundId`, `UX_disposal_rounds_roundNo`, `IX_disposal_rounds_isActive_executionDate`, `IX_disposal_rounds_executedById`, `IX_disposal_requests_roundId`;
    - and **no** `DROP`, `DELETE` or `UPDATE`.
  - `schema.prisma`'s index map names equal the SQL's.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/disposal-round-number.test.ts tests/disposal-round-migration.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - **The SQL:** idempotent T-SQL in the batch migration's shape:
    - `NVARCHAR(1000)` ids, `DATETIME2` with `SYSUTCDATETIME()` defaults, `DECIMAL(18, 2)` for `saleValue`, `NVARCHAR(MAX)` for `remark`;
    - `documentNo NVARCHAR(100) NOT NULL`;
    - `executionDate DATETIME2 NOT NULL`;
    - named constraints;
    - a header comment with the rollback (`ALTER TABLE disposal_requests DROP CONSTRAINT FK_…; DROP INDEX …; ALTER TABLE … DROP COLUMN roundId; DROP TABLE disposal_rounds;`), written as a comment only.
  - **Prisma:** run `npx prisma generate` (no DB access); do **not** run `db push` or migrate.
  - **Numbering:** the day key comes from `getBangkokDateKey` (`src/lib/preventive-maintenance.ts`), with the dashes stripped.
  - **Docs:** one paragraph in `docs/03_DATABASE.md` saying what the script adds and that it must run on Production before the deploy.

- [ ] **Step 4: Run the tests**

  Run: the command from Step 2, then `npx tsc --noEmit`, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add prisma src/lib/disposal-round-number.ts docs/03_DATABASE.md tests
  git commit -m "feat(disposal): the disposal_rounds table and requests.roundId as an idempotent manual migration, and DPR- numbering by the Bangkok day (group 6 plan 4)"
  ```

- [ ] **Step 6 (controller, not the implementer):** apply the migration to the dev DB.
  ```
  npm run migration:status
  npm run migration:apply -- 2026-11-05-add-disposal-rounds.sql --backup-confirmed --reason "Group 6 plan 4 dev: disposal rounds"
  npm run migration:status
  ```
  Then rerun the SQL once more through the same tool's idempotency check (status `applied`, no second run). Record the result in the ledger.

### Task 2: The round service and API; retire per-row and bulk execution

**Files:**
- Modify: `src/lib/disposal-execution-service.ts` (extract `executeDisposalRequestInTransaction`)
- Create: `src/lib/disposal-round-service.ts`, `src/lib/validations/disposal-round.ts`, `src/app/api/disposal-rounds/route.ts`
- Modify:
  - `src/app/api/disposal-requests/[id]/route.ts` (`action:"execute"` → 410);
  - `src/app/api/disposal-requests/bulk-execution/route.ts` (→ 410);
  - `src/lib/rbac-route-matrix.ts`;
  - `src/lib/disposal-api-error-codes.ts` and the error message maps;
  - `src/lib/disposal-type-policy.ts` (the round's field rules);
  - messages.
- Test: new `tests/disposal-round-service.test.ts`, `tests/disposal-round-validation.test.ts`; update `tests/rbac-route-matrix.test.ts`, `tests/disposal-execution-service.test.ts`, `tests/disposal-route-structure.test.ts`; delete the bulk-execution tests when their code goes (P4-R1)

**Interfaces:**
- Consumes: Task 1's model and numbering; plan 1's `getDisposalApprovalSodReason`; today's `getDisposalEvidenceExecutionError` / `getDisposalEvidenceFieldErrors` (`src/lib/disposal-evidence-exception.ts`).
- Produces (Tasks 3–5 use these):
  - `disposalRoundInputSchema` (zod):
    - `requestIds`: 1–200 unique uuids;
    - `disposalType`: one of `disposalTypes`;
    - `executionDate`: coerced date;
    - `executedById`;
    - `recipientName?`, `documentNo`, `saleValue?` (decimal ≥ 0, 2 places), `remark?`;
    - `useHistoricalEvidenceException?`, `evidenceExceptionReason?`;
    - `mode`: `"preview" | "commit"`.
  - `getDisposalRoundFieldErrors(input): Array<{ field; message }>`:
    - `recipientName` required for sell, donate and dispose;
    - `documentNo` always required;
    - `saleValue` required for sell;
    - `remark` required for destroy and lost;
    - `executionDate` not after the Bangkok today.
  - `type DisposalRoundItem = { requestId; disposalNo; assetTag; assetName; fromDisposalType; outcome: "eligible" | "blocked"; code: DisposalRoundBlockCode | null }`.
  - `DisposalRoundBlockCode` covers:
    - `DISPOSAL_REQUEST_NOT_FOUND`;
    - `DISPOSAL_INVALID_STAGE` (not approved);
    - `DISPOSAL_ASSET_INELIGIBLE`;
    - `DISPOSAL_SOD_CONFLICT` (the executor approved it);
    - `DISPOSAL_EVIDENCE_REQUIRED`.
  - `previewDisposalRound(db, input, actor): Promise<{ items: DisposalRoundItem[]; executorOptions: Array<{ id; label }> }>`. The executor options are active employees minus every selected machine's `approverId`.
  - `createDisposalRound(db, input, actor, now): Promise<{ id; roundNo }>`. It throws `DisposalRoundServiceError` with `code` and `items` when any item is blocked at commit time.
  - The extracted helper `executeDisposalRequestInTransaction(tx, candidate, round: { id; disposalType; executionDate; executedById; recipientName; documentNo; remark; evidenceException? }, actor, now)`. Today's single-request path is retired, so only the round calls it.
  - `POST /api/disposal-rounds`, gate `disposal:edit`:
    - `mode: "preview"` → 200 `{ items, executorOptions }`;
    - `mode: "commit"` → 201 `{ id, roundNo }`;
    - 409 `{ code: "DISPOSAL_ROUND_BLOCKED", items }` when blocked;
    - 400 `fieldErrors`.

- [ ] **Step 1: Write the failing tests**
  - `disposal-round-validation.test.ts`:
    - 201 ids refused;
    - sell without `saleValue` → `saleValue` error;
    - destroy without `remark` → `remark` error;
    - donate without `recipientName` → its error;
    - a future `executionDate` → its error;
    - lost with a remark, a document, no recipient and no price → no errors.
  - `disposal-round-service.test.ts` (fake transactional db, in the style of plan 1's reject test):
    - (a) three approved requests (donate, dispose, donate), round method `sell` with `saleValue` 3000:
      - one round row is created with `roundNo` `DPR-…-0001`;
      - every request becomes `disposed` with `disposalType: "sell"`, `roundId`, the round's date, executor, recipient, document and remark, and `actualSaleValue` null;
      - every asset gets the Disposed status;
      - PM plans end;
      - one `disposal_execute` movement per asset with `remark` `round=DPR-…`;
      - an audit `create_round`, and `execute` per request with `fromDisposalType`.
    - (b) one request turned `rejected` between preview and commit → throws `DISPOSAL_ROUND_BLOCKED` naming it; no request, asset, round or movement written.
    - (c) the executor is the approver of one request → that item `DISPOSAL_SOD_CONFLICT`; preview's `executorOptions` omit every approver.
    - (d) a request with no evidence and no exception → `DISPOSAL_EVIDENCE_REQUIRED`. With `useHistoricalEvidenceException` by a system admin and a reason → eligible, and the audit action is `execute_historical_without_evidence`. The same by a non-admin → `DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN`.
    - (e) a unique-constraint error on the first `roundNo` → retried with the next sequence.
    - (f) 200 items → the request and asset writes are `updateMany`/`createMany` calls. Assert the call counts are constant, not 200 of each.
  - Route pins:
    - `POST /api/disposal-rounds` is in `rbac-route-matrix.ts` with `disposal:edit`;
    - the PATCH `execute` branch and the bulk-execution route answer 410 `DISPOSAL_USE_ROUND`.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/disposal-round-validation.test.ts tests/disposal-round-service.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - **The commit**, in one `$transaction(…, { isolationLevel: Serializable, timeout: 120_000, maxWait: 10_000 })`:
    1. read every candidate (one `findMany` with the execution candidate select, chunked by 2,000 ids for the parameter limit);
    2. re-check each with the preview rules;
    3. create the round;
    4. `updateMany` the requests (`where: { id: { in }, requestStatus: "approved", isActive: true }`), and assert the count equals the selection, else throw a concurrent update;
    5. `updateMany` the assets to Disposed (resolved by name, as create resolves Pending Disposal);
    6. `createMany` the movements;
    7. end the PM plans of those assets with one `updateMany` (as today's execution does per asset; read `disposal-execution-service.ts:243-246`);
    8. `createMany` the audit rows, or `writeAuditLog` in a loop if no batch writer exists; that is acceptable at 200.
  - **Concurrency:** a P2034 deadlock maps to `DISPOSAL_CONCURRENT_UPDATE`, as plan 1 does.
  - **Retired routes:** 410, and their tests change (P4-R1). Delete the UI components and their now-dead message keys.
  - **New codes:** `DISPOSAL_USE_ROUND`, `DISPOSAL_ROUND_BLOCKED`, with Thai messages:
    - "บันทึกตัดจำหน่ายผ่านรอบตัดจำหน่าย";
    - "มีเครื่องที่บันทึกไม่ได้ในรอบนี้ · ดูรายการด้านล่าง".

- [ ] **Step 4: Run the tests**

  Run: the command from Step 2, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add src tests messages
  git commit -m "feat(disposal): the disposal round service and API (preview and all-or-nothing commit, set-based for 200 machines, the method chosen at the round, the lump price); per-row and bulk execution retired with 410 (group 6 plan 4)"
  ```

### Task 3: The queue (DP-Queue)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`, `src/components/disposal/disposal-row-actions.tsx`
- Create: `src/components/disposal/disposal-round-selection.tsx` (client), `src/lib/disposal-round-selection.ts` (pure)
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx` (the approved state's link, the disposed state's round link)
- Test: new `tests/disposal-round-selection.test.ts`; update `tests/disposal-queue-ux.test.ts`, `disposal-sweep-ui.test.ts`, `disposal-request-page-ui.test.ts`

**Interfaces:**
- Consumes: Task 2's API. Plan 2's selection helpers in `src/lib/approval-inbox-selection.ts` are the pattern; mirror them, do not import them.
- Produces:
  - `disposalRoundSelectionStorageKey = "disposal-round-selection"`;
  - `type StoredRoundSelection = { ids: string[]; scope: string }`;
  - `restoreRoundSelection`, `toggleRoundSelection` (cap 200) and `selectAllRound(tickableIds, scope)` (first 200), with the same shapes as plan 2's.

- [ ] **Step 1: Write the failing tests:**
  - the pure helpers, the same cases as plan 2's (prune, cap 200, select all → 200);
  - the queue page:
    - renders `TabNav` with the five status tabs and counts, and no status `NativeSelect` in the filter form;
    - the approved tab renders `DisposalRoundSelectionProvider` and the bar's primary "สร้างรอบตัดจำหน่าย {n} รายการ";
    - no `DisposalBulkExecution*` and no `DisposalExecutionButton`;
  - the disposed tab shows a `roundNo` link column;
  - the request page:
    - the approved card shows "ไปเลือกในแท็บอนุมัติแล้ว" for `disposal:edit`;
    - the disposed card links "รอบตัดจำหน่าย DPR-…" when `roundId` is set.

- [ ] **Step 2: Run them to see them fail.**

- [ ] **Step 3: Implement (spec §10)**
  - **Header:**
    - the primary "ยื่นคำขอตัดจำหน่าย";
    - the "รอบตัดจำหน่าย" link;
    - the "ชุดคำขอ ▾" menu (`RowActions`) with "สร้างชุดคำขอ" and "ประวัติชุดคำขอ";
    - "ส่งออก" (`disposal:export`).
  - **Tabs:** ทั้งหมด · รอพิจารณา · อนุมัติแล้ว รอตัดจำหน่าย · ตัดจำหน่ายแล้ว · ไม่อนุมัติ. Remove the status select.
  - **Filters:** search, ประเภท, and the date chip "วันที่ขอ", modelled on `RepairDateRangeChip`.
  - **Six columns** (spec §10.2), with no horizontal scroll at 1440.
  - **Pending tab:** keeps plan 2's link.
  - **Approved tab** (`disposal:edit`):
    - Ticks across pages, sessionStorage scoped by the search, type and date.
    - Disabled ticks with a reason: "คุณอนุมัติรายการนี้", or "ยังไม่มีหลักฐาน" (unless the viewer is a system admin).
    - "เลือกทั้ง {n} รายการที่เลือกได้" picks the filtered list's first 200.
    - The sticky bar reads "{n} เลือกแล้ว (จากทุกหน้า) · ล้างรายการเลือก", with the primary "สร้างรอบตัดจำหน่าย {n} รายการ →". It writes the ids to `disposal-round-selection` and goes to `/disposal/rounds/new`.
    - The page sizes 25/50/100 stay.
  - **Phone:** cards, no ticks, and the line "สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์" in the approved tab.

- [ ] **Step 4: Run the tests** (`npm test`; expected 0 failures) **and commit**
  ```bash
  git add src tests messages
  git commit -m "feat(disposal): the queue as board DP-Queue: tabs as the only status filter, six columns, the date chip, the ชุดคำขอ menu, and the approved tab's ticks across pages up to 200 with สร้างรอบตัดจำหน่าย (group 6 plan 4)"
  ```

### Task 4: The round pages (create, the round, the list)

**Files:**
- Create:
  - `src/app/[locale]/(dashboard)/disposal/rounds/page.tsx`;
  - `src/app/[locale]/(dashboard)/disposal/rounds/new/page.tsx` and `src/components/disposal/disposal-round-form.tsx`;
  - `src/app/[locale]/(dashboard)/disposal/rounds/[id]/page.tsx`;
  - `src/lib/disposal-round-page-data.ts`.
- Modify:
  - `src/lib/mobile-field-navigation.ts` (`rounds` and `rounds/[id]` are not focus routes; `rounds/new` is one);
  - the request page and the print page (a request in a round shows the round);
  - `tests/form-migration-guards.test.ts` (`STICKY_FOOTER_ROUTES`: `/th/disposal/rounds/new`);
  - messages.
- Test: new `tests/disposal-round-pages-ui.test.ts`, `tests/disposal-round-page-data.test.ts`; update `tests/mobile-field-navigation*.test.ts`

**Interfaces:**
- Consumes: Task 2's API (preview and commit) and Task 3's `disposal-round-selection`.
- Produces:
  - `readDisposalRoundList(db, { search, page, pageSize }): Promise<{ rows: Array<{ id; roundNo; title; machineCount; disposalType; recipientName; executionDate; saleValue }>; total }>`. The title is "{first name} {n} เครื่อง" when every name is the same, else "{first name} และอีก {n-1} รายการ".
  - `readDisposalRound(db, id): Promise<{ round; machines: Array<{ requestId; disposalNo; assetTag; assetName; serialNumber; approverName; firstPhotoId: string | null }> } | null>`.

- [ ] **Step 1: Write the failing tests:**
  - the page-data tests (fake db): the title rule for the same and for mixed names; machines in `disposalNo` order; `firstPhotoId` from plan 1's `listDisposalPhotos`;
  - pins for the three pages:
    - the form: `OperationFormFrame`, five method `ChoiceCard`s, and `saleValue` only for `sell`, labelled "ราคาขายเหมาทั้งรอบ (บาท)";
    - the save goes to `router.push(\`/${locale}/disposal/rounds/${id}\`)`;
    - the round page has the header button "ส่งออกรายงานส่งบัญชี" linking `/api/disposal-rounds/${id}/report`;
    - the list's empty state;
    - the mobile navigation table.

- [ ] **Step 2: Run them to see them fail.**

- [ ] **Step 3: Implement (spec §11.2–11.4)**
  - **Create** (`/disposal/rounds/new`, focus route, `OperationFormFrame`, breadcrumbs "ตัดจำหน่าย › รอบตัดจำหน่าย › สร้างรอบ"):
    - **Section 1 "เครื่องในรอบ":** the machines from storage, each with "ขอเป็น: {method}" and a ×. The link "เพิ่มจากรายการอนุมัติแล้ว" keeps the selection.
    - **Section 2 "ข้อมูลการตัดจำหน่าย":**
      - the method cards, preset only when every machine shares one method, with "จะเปลี่ยนวิธีของ {n} คำขอเป็น {method}" when it differs;
      - วันที่จำหน่าย (default today);
      - ผู้ดำเนินการ (preset, options from the preview);
      - ผู้ซื้อ / ผู้รับ / ปลายทาง;
      - เลขที่เอกสารอ้างอิง;
      - ราคาขายเหมาทั้งรอบ (บาท), for ขาย, with "ราคาเดียวสำหรับ {n} เครื่องในรอบนี้";
      - รายละเอียดการดำเนินการ;
      - for a system admin only, the checkbox "บันทึกย้อนหลังโดยไม่มีหลักฐาน (เฉพาะผู้ดูแลระบบ)" with its reason.
    - **The summary "หลังบันทึกรอบ":**
      - คำขอ {n}: อนุมัติแล้ว → ตัดจำหน่ายแล้ว;
      - ทรัพย์สิน {n}: รอตัดจำหน่าย → ตัดจำหน่ายแล้ว;
      - แผน PM: จบแผน;
      - "บันทึกแล้วแก้หรือยกเลิกไม่ได้".
    - **The footer:** "ตรวจสอบรอบ" (preview) lists the blocked machines with their reasons and disables saving until they are removed; then "บันทึกรอบตัดจำหน่าย {n} รายการ".
    - **After the save:** clear storage, toast "บันทึกรอบตัดจำหน่าย DPR-… แล้ว", go to the round page.
  - **The round page** (DP-Batch look):
    - the breadcrumb, then H1 "รอบตัดจำหน่าย · {title}" and the meta line;
    - the header button "ส่งออกรายงานส่งบัญชี";
    - the panel "ข้อมูลรอบ";
    - "เครื่องในรอบ ({n})": a table with a thumbnail or "ไม่มีรูป", name, tag, Serial, the `DP-…` link and the approver; phone cards.
  - **The list** (DP-Batches look):
    - columns: เลขที่รอบ · ทรัพย์สินในรอบ · วิธี · ผู้ซื้อ/ผู้รับ · วันที่จำหน่าย · ราคาเหมา;
    - search, paging 25/50/100;
    - empty: "ยังไม่มีรอบตัดจำหน่าย · สร้างรอบจากแท็บอนุมัติแล้ว", with the link.
  - **Request page and print:** a request in a round shows the round's number (link), date, method, buyer, document, and "ราคาขายเหมาของรอบ {x} บาท · {n} เครื่อง" for a sale.

- [ ] **Step 4: Run the tests** (`npm test`; expected 0 failures) **and commit**
  ```bash
  git add src tests messages
  git commit -m "feat(disposal): the round pages: create (method chosen at the round, the lump price, preview of blocked machines, all or nothing), the round with its machines, and the rounds list (group 6 plan 4)"
  ```

### Task 5: The accounting Excel; export and other readers

**Files:**
- Create: `src/app/api/disposal-rounds/[id]/report/route.ts`, `src/lib/disposal-round-report.ts`
- Modify:
  - `src/app/api/disposal-requests/export/route.ts` (Thai headers, Thai type, status and source words, a "เลขที่รอบ" column);
  - `src/lib/system-log-record-labels.ts` and `src/lib/system-log-presenter.ts` (the round module or record);
  - `src/lib/rbac-route-matrix.ts`;
  - the export-rights pin (`tests/e2e-cross-cutting.test.ts` / `export-rights`) as a `disposal:view` report;
  - `e2e/cross-cutting/support/refusals.ts` (the new routes);
  - messages.
- Test: new `tests/disposal-round-report.test.ts`

**Interfaces:**
- Consumes: Task 4's `readDisposalRound`, plan 1's `listDisposalPhotos`, and `createWorkbook` / `styleWorksheetHeader` / `workbookResponse` from `src/lib/asset-excel.ts`.
- Produces:
  - `buildDisposalRoundReport(input: { roundNo; executionDate; machines: Array<{ assetTag; assetName; serialNumber; photo: Buffer | null }> }): Promise<ExcelJS.Buffer>`, which is pure given the buffers;
  - `loadRoundReportPhoto(filePath: string): Promise<Buffer | null>`, which uses `assertSafeUploadPath` and `sharp(...).rotate().resize(240, 240, { fit: "inside" }).jpeg({ quality: 80 })`, and returns null on any error.

- [ ] **Step 1: Write the failing tests** (`tests/disposal-round-report.test.ts`)
  - `buildDisposalRoundReport` with two machines, one with a tiny JPEG buffer and one with `null`. Read the result back with `exceljs`:
    - sheet "รายการ";
    - row 1 is the title "รอบตัดจำหน่าย DPR-… · วันที่ {d/m/yyyy พ.ศ.}";
    - the header row reads ลำดับ · รหัสทรัพย์สิน · ชื่อทรัพย์สิน · Serial · รูป;
    - two data rows in order;
    - exactly one image in the sheet;
    - the second row's photo cell reads "ไม่มีรูป".
  - `loadRoundReportPhoto` on a missing path → null, and does not throw.
  - Route pins: gate `disposal:view`; the filename `รอบตัดจำหน่าย-${roundNo}-…xlsx` through `workbookResponse`; at most 4 photo reads at once.
  - The export: its headers include "รหัสทรัพย์สิน" and "เลขที่รอบ", and do not include "Asset Tag".

- [ ] **Step 2: Run them to see them fail.**

- [ ] **Step 3: Implement (spec §11.5, §12).**
  - For each machine the photo is the request's first image, else its batch's (`listDisposalPhotos`); only `fileType` jpeg/png/webp/gif are converted, anything else gives "ไม่มีรูป".
  - The row height fits the image (≈ px × 0.75 pt).
  - **Export:** Thai headers through messages.
  - **System log:** labels the round module.
  - **Notifications:** `approvedDisposalsDetail` already reads "ยังไม่ได้บันทึกตัดจำหน่าย" (plan 3); make it "ยังไม่ได้บันทึกในรอบตัดจำหน่าย".

- [ ] **Step 4: Run the tests** (`npm test`; expected 0 failures) **and commit**
  ```bash
  git add src tests messages e2e/cross-cutting/support
  git commit -m "feat(disposal): the accounting Excel of a round (tag, name, Serial, photo), Thai headers and the round number on the disposal export, the round in the system log (group 6 plan 4)"
  ```

### Task 6: E2E

**Files:**
- Create: `e2e/disposal/disposal-round.spec.ts`
- Modify: `e2e/disposal/batch-bulk-approval.spec.ts` (its execution steps now make a round), `single-request.spec.ts` (execution through a round), `disposal-support.ts` (a `createRound` helper through the UI), `tests/e2e-disposal.test.ts` (pins)

- [ ] **Step 1: Write the specs** (run-marked records; `itStaff` executes; `itHead` approves):
  - **Three approved run requests,** asked as บริจาค, ตัดจำหน่าย and บริจาค:
    - IT staff tick them on two pages of the approved tab (`pageSize=25` when there are more; otherwise one page);
    - "สร้างรอบตัดจำหน่าย 3 รายการ";
    - choose ขาย, which shows "จะเปลี่ยนวิธีของ 3 คำขอเป็น ขาย";
    - fill in the buyer, the document and "ราคาขายเหมาทั้งรอบ" 3,000.00, then "ตรวจสอบรอบ", then save.
    - It lands on the round page "รอบตัดจำหน่าย · …" with 3 machines.
    - Each request reads ตัดจำหน่ายแล้ว and method ขาย, and links the round.
    - The rounds list shows the round.
  - **The report:** fetch `/api/disposal-rounds/<id>/report` as IT staff; status 200 and the xlsx type. Read it with exceljs in the test: 3 data rows and 3 images (the requests carry photos).
  - **Refusals:**
    - The IT head's own approval: as the IT head, the approved run request they approved shows a disabled tick "คุณอนุมัติรายการนี้".
    - A run request rejected after the selection: the preview names it and saving waits.
  - **The retired paths:** `PATCH {action:"execute"}` answers 410.
  - **Phone:** the approved tab has no ticks and shows the desktop line; the round page shows phone cards.
  - **axe** on the queue, the create page and the round page, in both themes.
- [ ] **Step 2: Run** on a fresh build, four projects.

  Run: `npx playwright test e2e/disposal e2e/approvals e2e/cross-cutting --reporter=line`
  Expected: 0 failed.
- [ ] **Step 3:** update the pins, run `npm test` (0 failures), and commit: `test(e2e): disposal rounds and the accounting Excel (group 6 plan 4)`.

### Task 7 (controller): timing, whole suite, look step, final review, docs

- [ ] **200-machine timing on the dev DB:**
  - Make 200 run-marked approved requests through the API, with a photo each.
  - Save one round, timing the commit; expect well under 120 s.
  - Download its report and record the file size.
  - Record the numbers in the ledger.
- [ ] **The whole E2E suite once** (the group's last plan), four projects.
- [ ] **Look step:** the queue (each tab), the create page (empty, with a preview listing blocked machines), the round page, the rounds list and the report opened in a viewer. Cover 1440 (both themes), 1024 and 390 (both themes). Fix what it finds.
- [ ] **Final whole-branch review:** an opus Workflow, 3 lenses, 2 adversarial skeptics per finding; one fix pass.
- [ ] **Docs:**
  - `docs/06_WORKFLOWS.md`, `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md`, `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`;
  - `docs/03_DATABASE.md`: the deploy-day order. The rounds script **before** the deploy, beside `2026-10-07-add-maintenance-outcome.sql` and `2026-10-20-users-employee-filtered-unique.sql`, with the line-ending note.
