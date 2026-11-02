# Page group 4, plan 3: purchase documents in the asset form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the asset form's 300-checkbox purchase-document box with a search over documents (including the model, name and tag of the assets already linked) beside an always-visible upload of new documents, created and linked in one request after the asset is saved, with unlinking on the edit page and the same field in batch mode.

**Architecture:** Shared server helpers in `src/lib/purchase-documents.ts` (duplicate finder that ignores `isActive`, record creation in a transaction, linking with a db argument) serve four routes: the search (`GET /api/purchase-documents/search`, copied from the asset-operation search pattern with an injectable db), a duplicate pre-check, a multipart create-and-link on `POST /api/assets/[id]/purchase-documents`, and an unlink `DELETE`. One client picker (`purchase-document-picker.tsx`) serves the single form and the batch form; the server renders the empty-query list so no request runs on page load.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, `node --test` with source and module-swap tests, Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md` (§2 decisions 7, 8, 9; §5; §8 "Batch mode"; §9; §15 calls 17-18; §16.1; §17; Appendix A "Purchase documents"). Recon with file:line: session scratchpad `g4/recon3/` (`server.md`, `client.md`, `tests.md`, `critic.md`).

## Global Constraints

- Branch `feat/group4-purchase-docs` from `master` `636fe540`. No push. No schema change, no migration, no new index, no database command, no build, no dev server, no E2E run in implementer tasks (`npx playwright test --list` is fine).
- Never read `.env*`. Do not touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- Shared parts and tokens only (DESIGN.md): no hex/rgba in tsx, no `dark:`, no `/NN` tints, no raw `<button>`, `<input>`, `<select>`, `<textarea>`. Both themes.
- Pickers keep "code - name" labels; rows and results show the name first (spec §5).
- Words follow `docs/19_THAI_GLOSSARY.md` (rows added before use); messages change only through `node scripts/messages-edit.mjs <change file>`, change files in `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/g4/msg/p3-*.json`. Thai and English; en counts ICU plural with the raw number, th `{count, number}`.
- Every new route: `requirePermission(user, …)` before any `prisma.`; an entry in `src/lib/rbac-route-matrix.ts` with a pin in `tests/rbac-route-matrix.test.ts`; a viewer refusal row in `e2e/cross-cutting/support/refusals.ts` when it refuses a viewer (not for DELETE: the E2E suite bans DELETE, `tests/e2e-review.test.ts:99`); every English `error:` literal in `src/lib/api-error-catalog.ts`.
- Every upload route keeps the `tests/upload-cleanup-routes.test.ts` shape: tracker before the try, file saved after every check, one `uploads.commit()` right after the transaction, `discardIfUncommitted` in `finally`.
- Every guard that pins a changed file is updated in the same task with exact counts (`form-migration-guards`, `v-track2-a`, `assets-sweep-ui`, `file-evidence-ui`, `asset-forms-ui`, `asset-form-layout-ui`, `asset-partial-save`, `i18n-plural-count`, … recon `client.md` §7).
- CRLF files keep CRLF. Before each commit: the focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors). Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stable E2E hooks: `#asset-purchase-document-no`, `#asset-purchase-document-amount`, `#asset-purchase-document-file` on the active upload draft (register-asset.spec); the batch POST `/api/assets/batch` and its `{ created, assetIds, assets }` answer (bulk-move.spec); the section title "เอกสารจัดซื้อ".

## Rulings made while planning

- **P3-R1 (words, spec §16.1):** documents are counted with **ใบ** ("เลือกแล้ว n ใบ", "ผูกไว้ n ใบ", "พบ n ใบ จากเอกสารกลาง N ใบ", "+ เพิ่มอีกใบ"); plan 2's "…ฉบับ" summaries change to ใบ. Assets linked to a document are counted with **เครื่อง** in the picker ("ผูกกับ n เครื่อง: <ชื่อ 3 รายการแรก>", the user's example in decision 7), in the results and the chips alike; the old chip text "ผูกแล้ว n ทรัพย์สิน" goes. The upload fields keep their pinned labels "วันที่เอกสาร" and "ยอดรวม (บาท)" (the spec's "วันที่", "ยอดเงิน" lack the unit).
- **P3-R2 (permissions):** the search and the pre-check need `asset:create` or `asset:edit` (`if (!hasPermission(user, "asset", "create")) requirePermission(user, "asset", "edit")`, the viewer row says `asset:edit`), checked before the query is parsed. Creating a purchase document always needs `asset:edit`, as today: create-and-link and unlink are `asset:edit`, and the batch refuses new documents without `asset:edit` (the batch itself stays `asset:create`).
- **P3-R3 (duplicates):** type + number is a duplicate whether the stored document is active or not (the database unique covers both); every create path maps a P2002 on it to the same 409 body `{ error: "Purchase document already exists", id, code: "DUPLICATE", fieldErrors: { documentNo: "duplicate" } }`.
- **P3-R4 (no fetch on load):** the server renders the empty-query list (10 newest active documents, the form's supplier first when it has one, and the active total) as props in place of the 300 options; the client calls the search only when the person types (debounced) or changes the supplier. This keeps E2E specs that open `/th/assets/new` and leave free of cancelled requests.
- **P3-R5 (edit page):** on edit, linking and unlinking happen at **บันทึกการแก้ไข**, not on click: a chip's × marks the document for removal, the change list shows "เอกสารจัดซื้อ: เอา <เลขที่> ออก" / "เพิ่ม <เลขที่>", and the save runs PUT, then the links, the unlinks (DELETE) and the uploads. ยกเลิก leaves every link as it was.
- **P3-R6 (failure):** a document step that fails after the asset is saved goes to `/<locale>/assets/<id>/edit?documents=failed#documents` with เอกสารจัดซื้อ open and a `Notice` naming each failed document (type, number, file name) to upload again; the files themselves are not carried over. A duplicate never reaches this point: the pre-check refuses it under the field before the asset is saved, with the file and fields still on the page.
- **P3-R7 (inactive documents):** a linked document that is no longer active still shows as a chip (marked "ปิดใช้งาน"), counts in "ผูกไว้ n ใบ" (as the asset page lists it), and can be removed; the search never offers it.
- **P3-R8 (batch, spec §8):** one search and **one** new-document draft for the whole batch; the batch POST becomes multipart when a draft exists (`payload` JSON + `newDocument` JSON + `file`), the document is created and linked to every row inside the batch transaction, which gains `{ maxWait: 10_000, timeout: 60_000 }`; the upload-cleanup pin's regex is relaxed to allow `}, options)`.
- **P3-R9:** the unused `GET /api/purchase-documents` (300 documents with every link, no caller) is removed. The file stays optional on a new document, as today. The chosen state of a result is marked on the client (no `chosen` query parameter).

## Review Focus

1. A new document whose type and number belong to an **inactive** stored document: refused under the field before the asset is saved, never a 500 (Tasks 1, 3, 5).
2. A two-word query where one word matches only a linked asset's model and the other only the document number finds the document; a word matching nothing returns nothing (Task 2).
3. The upload's virus scan or file check fails after the asset was saved: the asset stays, no document and no file are left behind, and the edit page names the failed document (Tasks 3, 5).
4. On the edit page, × on a chip then ยกเลิก: nothing is unlinked; × then บันทึกการแก้ไข: one DELETE and an audit entry, the document still exists (Task 5).
5. A batch whose new document duplicates an existing one: the whole batch is refused before any tag, file or asset is written (Task 6).

---

### Task 1: Shared purchase-document helpers

**Files:**
- Modify: `src/lib/purchase-documents.ts`, `src/app/api/purchase-documents/route.ts` (POST uses the helpers; the GET handler is removed, P3-R9), `src/lib/validations/purchase-document.ts` (bound `purchaseDocumentIds` to 50)
- Test: `tests/purchase-documents-lib.test.ts` (new), `tests/v-track-s.test.ts:427-431` (keep the exact 409 body)

**Interfaces:**
- Produces (all in `src/lib/purchase-documents.ts`):
  - `type PurchaseDocumentDb = Pick<Prisma.TransactionClient, "purchaseDocument" | "purchaseDocumentAsset" | "attachment">`
  - `findPurchaseDocumentDuplicates(db, drafts: Array<{ documentType: PurchaseDocumentType; documentNo: string }>): Promise<Array<{ index: number; id: string | null; reason: "exists" | "repeated" }>>` — no `isActive` filter; `repeated` when two drafts share type+number.
  - `parseMultipartPurchaseDocument(request: Request): Promise<{ input: PurchaseDocumentInput; file: File | null }>` (moved from the route).
  - `createPurchaseDocumentRecord(tx, { input, savedFile, userId }): Promise<{ id: string; documentType; documentNo }>` — the document and its `attachment` (`module: "purchase_document"`).
  - `linkPurchaseDocumentsToAsset(db, { assetId, purchaseDocumentIds, userId }): Promise<string[]>` — now takes a db; an already-existing link (including a P2002 race) counts as linked, not an error.
  - `purchaseDocumentDuplicateResponse(id: string | null): NextResponse` (the 409 body of P3-R3) — or a plain body builder if a route file must own `NextResponse`.

- [ ] **Step 1: Write the failing tests**: duplicates found for an inactive stored row; two drafts with the same type+number → `repeated` for the second; `linkPurchaseDocumentsToAsset` with a db fake skips existing links and returns the new ids; `POST /api/purchase-documents` on a P2002 from `create` answers the 409 body; the route file has no `export async function GET`.
- [ ] **Step 2: Run** `npx tsx --test tests/purchase-documents-lib.test.ts` and `node --test tests/v-track-s.test.ts` — FAIL on the new cases.
- [ ] **Step 3: Implement**; keep the route's upload-cleanup shape and its pin (`tests/upload-cleanup-routes.test.ts:286`).
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `refactor(purchase-documents): shared duplicate finder (any stored row), record creation and linking with a db; P2002 answers the duplicate; the unused list GET goes (group 4 plan 3)`

### Task 2: The search route

**Files:**
- Create: `src/lib/purchase-document-search-rules.ts` (client-safe), `src/lib/purchase-document-search.ts` (reads, injectable db), `src/app/api/purchase-documents/search/route.ts`
- Modify: `src/lib/rbac-route-matrix.ts`, `e2e/cross-cutting/support/refusals.ts` (GET row), `tests/e2e-cross-cutting.test.ts:141` (GET list), `tests/rbac-route-matrix.test.ts`
- Test: `tests/purchase-document-search.test.ts`, `tests/purchase-document-search-route.test.ts` (new; the `asset-operation-search*` tests are the model)

**Interfaces:**
- Produces:
  - Constants `purchaseDocumentSearchLimit = 20`, `purchaseDocumentRecentLimit = 10`, `purchaseDocumentLinkedNamesShown = 3`, `purchaseDocumentSearchPath = "/api/purchase-documents/search"`; reuse `splitAssetOperationSearchWords` and the 2-100 code-point rules of `asset-operation-search-rules.ts`.
  - `parsePurchaseDocumentSearch(params: URLSearchParams): { q: string; supplierId: string | null } | { error: "Invalid search" }` (`q` "" allowed; 1 character or > 100 → error).
  - `buildPurchaseDocumentSearchWheres(input) → { text, exact, prefix }`: base `{ isActive: true }`; each word (≤ 5) matches `documentNo` / `poNumber` / `invoiceNumber` / `supplier.code` / `supplier.name` contains, or an **active** linked asset's `assetTag` / `name` / `model.name` contains; words AND-ed; `exact` and `prefix` on the whole `q` over the three numbers.
  - `type PurchaseDocumentSearchRow = { id; documentType: PurchaseDocumentType; documentNo; poNumber: string | null; invoiceNumber: string | null; supplier: { id; code; name } | null; documentDate: string | null; totalAmount: string | null; linkedAssetCount: number; linkedAssetNames: string[]; isActive: boolean }`; `type PurchaseDocumentSearchAnswer = { total: number; activeTotal: number; rows: PurchaseDocumentSearchRow[] }`.
  - `searchPurchaseDocuments(db: PurchaseDocumentSearchDb, input): Promise<PurchaseDocumentSearchAnswer>` — with `q`: exact, then prefix, then text by `documentDate desc, createdAt desc, id asc`, ≤ 20, `total = count(text)`; with `q` "": the 10 newest, the supplier's newest first, `total` = rows shown.
  - `readPurchaseDocumentChoices(db, ids: string[]): Promise<PurchaseDocumentSearchRow[]>` — includes inactive documents (P3-R7).
  - Route answer `{ data: PurchaseDocumentSearchAnswer }`; permission per P3-R2 before parsing.

- [ ] **Step 1: Write the failing tests**: parse (empty ok, 1 char error, 101 error, 6 words keep 5); wheres contain the linked-asset `model.name` clause with `asset: { isActive: true }`; ranking exact > prefix > text, no duplicates, ≤ 20; empty `q` with a supplier puts that supplier's documents first, ≤ 10; linked names are the first 3 active, count is active only (Review Focus 2); route: viewer 403 with nothing read, `asset:create` only allowed, 400 on a 1-character `q`, `{ data }` shape; refusal row and matrix entry pinned.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** with `withPerformanceTiming("purchase-document-search", …)`; no new index.
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(purchase-documents): GET /api/purchase-documents/search over numbers, supplier and the linked assets' tag, name and model (group 4 plan 3)`

### Task 3: Pre-check, create-and-link, unlink

**Files:**
- Create: `src/app/api/purchase-documents/check-duplicates/route.ts`, `src/app/api/assets/[id]/purchase-documents/[documentId]/route.ts`
- Modify: `src/app/api/assets/[id]/purchase-documents/route.ts` (JSON link kept in a helper after POST; multipart branch), `src/lib/api-error-catalog.ts`, messages (`apiErrors` for the new literals; `action_link_purchase_documents`, `action_unlink_purchase_documents` beside the other `action_*` keys), `src/lib/rbac-route-matrix.ts`, `e2e/cross-cutting/support/refusals.ts` (the multipart POST row; the pre-check row), `tests/upload-cleanup-routes.test.ts` (add the asset route)
- Test: `tests/asset-purchase-documents-route.test.ts` (new, module swap), `tests/rbac-route-matrix.test.ts`, `tests/e2e-cross-cutting.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces:
  - `POST /api/purchase-documents/check-duplicates` body `{ documents: Array<{ documentType; documentNo }> }` (≤ 20) → 200 `{ duplicates: Array<{ index: number; id: string | null; reason: "exists" | "repeated" }> }`.
  - `POST /api/assets/[id]/purchase-documents` multipart (one draft: `documentType`, `documentNo`, `documentDate?`, `totalAmount?`, `supplierId?` defaulting to the asset's supplier, `poNumber?`/`invoiceNumber?` by type as today, `file?`) → 201 `{ document: PurchaseDocumentSearchRow, linkedIds: [id] }`; duplicate → the P3-R3 409 before the file is saved; JSON body → today's additive link `{ linkedIds }`.
  - `DELETE /api/assets/[id]/purchase-documents/[documentId]` (`asset:edit`) → 200 `{ unlinkedId }`; 404 `{ code: "PURCHASE_DOCUMENT_LINK_NOT_FOUND", error: "Purchase document link not found" }` when the link is not this asset's; the link row and an audit entry (`unlink_purchase_documents`, oldValue with the type and number) in one transaction; the document and its attachments stay.

- [ ] **Step 1: Write the failing tests**: pre-check finds an inactive twin and a repeated pair (Review Focus 1); multipart create-and-link writes the document, the attachment and the link in one transaction, then commits the upload; a duplicate answers 409 with no file saved; a scan failure (savePurchaseDocumentFile throws) answers an error, writes nothing and discards nothing it did not save (Review Focus 3); the supplier defaults to the asset's; DELETE removes only this asset's link, writes the audit inside the transaction, keeps the document; another asset's document id → 404; every route refuses a viewer before reading; the upload-cleanup pin passes for the asset route.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** (P3-R2, P3-R3). The multipart transaction must be the first `await prisma.$transaction(` in the asset route file (the pin indexes the whole file).
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(purchase-documents): a duplicate pre-check, create-and-link in one request, and unlink from an asset (group 4 plan 3)`

### Task 4: The picker (no form change yet)

**Files:**
- Create: `src/components/assets/purchase-document-picker.tsx` (search field, results, chips, the footer line), `src/lib/purchase-document-picker-rules.ts` (pure: chip label, result line, summary "ใบ PO … · ใบกำกับ …", badge counts)
- Modify: `docs/19_THAI_GLOSSARY.md` (P3-R1 rows), messages (new picker words; plan 2's `sectionSummary.documentsSelected/Queued` to ใบ), `tests/thai-glossary.test.ts` if a banned word is added (keep "ฉบับสมบูรณ์" elsewhere legal)
- Test: `tests/purchase-document-picker-rules.test.ts`, `tests/purchase-document-picker-ui.test.ts` (source pins)

**Interfaces:**
- Consumes: Task 2 `PurchaseDocumentSearchRow`, `purchaseDocumentSearchPath`, the rules' 2-100 check.
- Produces: `PurchaseDocumentPicker({ id, chosen: PurchaseDocumentSearchRow[], recent: PurchaseDocumentSearchAnswer, supplierId: string | null, onChoose(row), onRemove(id), removedIds?: Set<string>, disabled? })` — debounced 300 ms fetch only on typed text ≥ 2 characters or a changed `supplierId` (P3-R4), abort on change; a result shows type and number, supplier name, date, amount, "ผูกกับ {count} เครื่อง: {names}" and "เลือกแล้ว" when chosen; a chip shows "{type} · {number} · {supplier} · ผูกกับ {count} เครื่อง" with × (`aria-label` "เอา {number} ออก"), and "ปิดใช้งาน" for an inactive document; the footer `asset.purchaseDocumentSearchFooter` "พบ {count} ใบ จากเอกสารกลาง {total} ใบ · ค้นหาได้ด้วยเลขที่เอกสาร เลข PO เลขใบกำกับ ผู้ขาย หรือชื่อรุ่นของเครื่องที่ผูกไว้".

- [ ] **Step 1: Write the failing tests** for the pure rules (summary text for two chosen documents, the result line with 8 linked and 3 names, the badge) and the source pins (no fetch in a mount effect without typed text; uses `SearchField`/listbox semantics of the shared search part the app uses for pickers; no raw controls).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; glossary rows first.
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(purchase-documents): a search picker with chosen chips and the linked assets (group 4 plan 3)`

### Task 5: The single form uses the picker and uploads after save

**Files:**
- Modify: `src/components/assets/asset-form-documents.tsx` (two parts: left เลือกเอกสารที่มีอยู่ = the picker; right อัปโหลดเอกสารใหม่ = `FileDropzone`, ประเภทเอกสาร, เลขที่เอกสาร, วันที่เอกสาร, ยอดรวม (บาท), ผู้ขาย (default the asset's), "+ เพิ่มอีกใบ"; stacked below 1024 px, the upload second), `asset-form.tsx` (state, the pre-check before POST/PUT, the follow-up chain, the failure landing, `openSections`: create open, edit folded, `?documents=failed` opens it), `src/lib/asset-form-diff.ts` (document rows), `src/lib/asset-form-summary.ts`, `src/lib/asset-form-options.ts` (keep `purchaseDocuments` until Task 6), the new and edit pages (chosen by id through `readPurchaseDocumentChoices`, the recent list, clone)
- Modify E2E: `e2e/transactions/register-asset.spec.ts` (the upload part still fills `#asset-purchase-document-no` and `-file`; its wait on the POST to `/api/assets/*/purchase-documents` stays)
- Test: `tests/asset-form-documents-ui.test.ts` (new), and the pins this changes (`asset-partial-save` failure landing, `asset-form-layout-ui:76`, `assets-sweep-ui` ChoiceCard pin and EmptyNote counts, `file-evidence-ui:195`, `v-track2-a`, GF5 floors)

**Interfaces:**
- Consumes: Task 3 routes, Task 4 picker.

- [ ] **Step 1: Write the failing tests**: on create the section is open with both parts and the badge "เลือกแล้ว {count} ใบ"; on edit it is folded with the summary "ใบ PO … · ใบกำกับ …" and "ผูกไว้ {count} ใบ", and `?documents=failed` opens it with the Notice (P3-R6); บันทึก first posts the drafts to the pre-check and stops with the error under `#asset-purchase-document-no` (or the queued draft's row) and nothing else posted (Review Focus 1); after the asset save each draft is one multipart POST, then the chosen ids one JSON link, then (edit) one DELETE per removed chip (P3-R5, Review Focus 4); a failed step pushes to the edit page with `documents=failed`; the change list names added and removed documents; the PUT body no longer carries `purchaseDocumentIds` semantics beyond what the links do.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; keep the active draft's ids; one `liveError` count change if the pre-check shows live (update `tests/v-track-final.test.ts:89-94` exactly).
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx playwright test --list`.
- [ ] **Step 5: Commit** `feat(asset-form): the purchase-document search beside a new-document upload, created and linked after the save, removed on the edit page at save (group 4 plan 3)`

### Task 6: Batch mode, and the 300-document load goes

**Files:**
- Modify: `src/components/assets/asset-batch-form.tsx` (the picker and one upload draft, P3-R8), `src/app/api/assets/batch/route.ts` (multipart when a draft exists; pre-check of the draft with the other checks before tags, files and writes; the document created and linked to every row inside the transaction with `{ maxWait: 10_000, timeout: 60_000 }`; `asset:edit` needed for a new document, P3-R2), `src/lib/validations/asset-batch.ts` (`purchaseDocumentIds` ≤ 50), `tests/upload-cleanup-routes.test.ts` (regex allows `}, options)`; the batch route joins the list), `src/lib/asset-form-options.ts` and every caller (drop `purchaseDocuments`)
- Test: `tests/asset-batch-documents-route.test.ts` (new), `tests/asset-batch-create.test.ts`, `tests/asset-batch-form-layout.test.ts`

- [ ] **Step 1: Write the failing tests**: a batch with a duplicate draft is refused before tag generation, file save or any write (Review Focus 5); a batch with a draft creates one document linked to every created asset in the transaction; a create-only user sending a draft is refused; JSON batches work as before (`bulk-move.spec.ts` answer unchanged); `getAssetFormOptions` no longer reads `purchaseDocument`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx playwright test --list`.
- [ ] **Step 5: Commit** `feat(asset-batch): one purchase-document search and one upload for the whole batch, linked inside the batch transaction; the form options stop loading 300 documents (group 4 plan 3)`

### Task 7: E2E and docs

**Files:**
- Create: `e2e/assets/register-purchase-documents.spec.ts`; helpers `readOneModel()` (seed admin read of an active model, no master-data change), `createPurchaseDocumentByApi(page, assetId, fields)`, `searchPurchaseDocuments(page, text)` in `e2e/transactions/tx-support.ts` or a new `e2e/assets/purchase-steps.ts`; `CreateAssetOptions` gains `categoryId?`, `brandId?`, `modelId?`
- Modify: `e2e/assets/register-words.ts`, `tests/e2e-register.test.ts` (pins)
- Docs: `docs/04_AUTH_RBAC.md` (new routes and permissions), `docs/06_WORKFLOWS.md`, `docs/07_UAT_CHECKLIST.md` (unlink at save, the failure landing, the batch upload — the parts E2E cannot drive), `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DESIGN.md` (the two-part document section and the picker), `docs/99_CHANGELOG.md` (`## 2026-11-02` block, E2E placeholders), `DEVELOPER_HANDOFF.md` (placeholders)

- [ ] **Step 1: Write the spec** (itStaff): **PD1, all four projects**: asset A with an existing model (API), document D1 created and linked by API; on `/th/assets/new` fill B's required fields; search "<model name> <A tag>" → only D1, with "ผูกกับ 1 เครื่อง: <A name>" and the footer line; choose it (chip, badge "เลือกแล้ว 1 ใบ"); upload a draft with D1's number → the duplicate under the field, nothing posted, the file still shown; change to ใบกำกับ `<B tag>-INV`; save → the asset, the create-and-link and the link all ok; the search API now shows D1 linked to 2; B's edit page shows the section folded with "ผูกไว้ 2 ใบ" and the summary, opened shows both chips (never click ×). **PD2, desktop**: the batch with 2 rows, D1 chosen and one upload → `created: 2`, D1 linked to 4, the new document to 2. Record each new state.
- [ ] **Step 2: Run** `npx playwright test --list e2e/assets/register-purchase-documents.spec.ts`, `npx tsx --test tests/e2e-register.test.ts`.
- [ ] **Step 3: Write the docs**; leave E2E results as placeholders for the controller.
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `test(purchase-documents): E2E for a document found by a linked asset's model, a new one uploaded with a new asset, and the batch; docs (group 4 plan 3)`

**After Task 7 (controller):** `rm -rf .next`, build, then the targeted E2E set on dev, 4 projects: `register-purchase-documents`, `register-asset`, `bulk-move`, `asset-detail`, `register-edit-correction`, `field-errors`, `roles`; the look step (create, edit folded and open, the picker results, the batch) at 1440, 1024 and 390 in both themes; the final whole-branch review.
