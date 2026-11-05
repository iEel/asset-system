# Disposal request batches (DP-Batch-New, DP-Batch, DP-Batches) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the three request-batch pages: the form gains an optional photo per machine beside the required lot photo; the batch page shows progress through approval and rounds, each machine with its own photo or "ใช้รูปรวม", and starts a round from the batch; the list shows a name and progress per batch.

**Architecture:**
- **Read model:** a new `src/lib/disposal-batch-page-data.ts` (list + one batch), the same shape as `src/lib/disposal-round-page-data.ts`, reusing `buildDisposalRoundTitle`, `listDisposalPhotos` and `getDisposalRoundTickBlocks`.
- **Form rules:** a new pure `src/lib/disposal-batch-form-rules.ts` (validation, the count line, the summary, the upload jobs and their outcome), so `node --test` covers them.
- **Pages:** the form on `OperationFormFrame` (like `disposal-request-form.tsx` and `disposal-round-form.tsx`); the batch page and list in the look of the round pages.
- **No migration, no API change except** the asset search's `q=` items gaining `assetTag`, `name` and `serialNumber` (additive).

**Tech Stack:** Next.js 16, Prisma 7 on SQL Server, next-intl, `node --test`, Playwright (4 projects).

**Spec:** `docs/superpowers/specs/2026-11-05-disposal-request-batches-design.md` (approved 2026-11-05, commit `2907fc10`).

## Global Constraints

- Thai first; words from `docs/19_THAI_GLOSSARY.md`: ชุดคำขอ, รอบตัดจำหน่าย, บันทึกตัดจำหน่าย (no "จริง"), the method `dispose` reads ตัดจำหน่าย. Messages change only through `node scripts/messages-edit.mjs <change.json>` with **dotted keys**; check `git diff --stat messages/` after each run. `tests/thai-glossary.test.ts` must stay green.
- A batch holds **2–100** machines (`src/lib/disposal-batch.ts`); unchanged.
- **A machine's own photo is optional; the lot photo is required** (a lost batch: one file of any kind; a lost batch's rows have no photo slot). No Serial check step; the Serial is shown read-only ("–" when the register has none).
- Photo rules as plan 3: JPG, PNG, WEBP count as photos; HEIC refused at once (`getDisposalQueuedFileError`, `disposalEvidenceAccept`).
- Evidence rules unchanged: the lot photo counts for every machine (`src/lib/disposal-photo.ts` is not edited).
- Permissions: form `disposal:create`; pages `disposal:view`; the round button `disposal:edit`.
- No price fields anywhere in the form.
- Errors under their fields (V-track): `useFieldErrors`, focus the first error.
- E2E on the dev DB only, run-marked data; never read `.env*`.

## Plan rulings (made while writing; the spec left them to the builder)

- **PB-R1** The old review step (`batchReview` dialog) is removed: the summary panel and the footer replace it, as on the single form and the round form. Cost if wrong: one confirm step to add back.
- **PB-R2** The batch name reuses `buildDisposalRoundTitle` exactly ("{name} {n} เครื่อง" / "{name} และอีก {n} รายการ"); the spec's example "และอีก 4 เครื่อง" is read as an example of the same rule. Cost if wrong: one words object.
- **PB-R3** Upload failures: when any upload fails, the form does **not** navigate; it shows a notice listing the machines whose photo failed (each with "แนบรูป" → that request's page `#files`) and whether the lot photo failed, with the button "เปิดหน้าชุดคำขอ". All uploads fine → toast and go to the batch page. Nothing is stored. Cost if wrong: a little UI.
- **PB-R4** Uploads run in a pool of 4 (the round report's pool size).
- **PB-R5** The list keeps a strip: requests in all batches by stage, with "{n} คำขอจาก {m} ชุด" (cheap: one groupBy). Cost if wrong: delete one component.
- **PB-R6** "สร้างรอบตัดจำหน่ายจากชุดนี้" writes the plan 4 hand-over (`sessionStorage` key `disposal-round-selection`, scope `disposalRoundSelectionScope({ search: "", disposalType: "", dateFrom: "", dateTo: "" })`) with the batch's joinable ids and pushes `/disposal/rounds/new`.

## Review Focus

1. A batch made before this change (lot photo only, no own photos): every row reads "ใช้รูปรวม" and the page still works — Task 1 test `readDisposalBatch: a batch with only the lot photo gives every machine ownPhotoId null`.
2. A machine whose register has no Serial: the form row and the batch page show "–", not "null" or an empty cell — Task 1 and Task 2 tests.
3. One machine's photo upload fails out of many: the batch exists, the failed machine is named with its link, the others' photos are attached — Task 2 test `summarizeDisposalBatchUploads names each failed machine`.
4. A lost batch: no row photo slots, the lot slot accepts a PDF alone and sends — Task 2 test and E2E (Task 5).
5. The round button when some approved machines cannot join (e.g. the viewer approved them): the button counts only joinable ones and names the rest with the reason; no button when none can join — Task 1 test `readDisposalBatch: roundCandidates splits joinable and blocked`.

---

### Task 1: Read model and the asset search fields

**Files:**
- Create: `src/lib/disposal-batch-page-data.ts`
- Modify: `src/app/api/disposal-assets/route.ts` (the `q=` items: add `assetTag`, `name`, `serialNumber`; select `serialNumber`)
- Modify: `src/components/disposal/disposal-asset-picker.tsx` (`DisposalAssetOption` gains optional `assetTag?: string; name?: string; serialNumber?: string | null`)
- Test: `tests/disposal-batch-page-data.test.ts`, extend the asset-search test that covers `disposal-assets` (find it with `grep -ln "disposal-assets" tests`)

**Interfaces:**
- Consumes: `buildDisposalRoundTitle` (`disposal-round-page-data.ts`), `listDisposalPhotos`, `getDisposalRoundTickBlocks(db, ids, actor)` (`disposal-round-service.ts`, same actor shape the queue passes), `listPageWindow`.
- Produces:
  - `export type DisposalBatchStageCounts = { pending: number; approved: number; disposed: number; rejected: number; total: number }`
  - `export type DisposalBatchListRow = { id: string; batchNo: string; title: string; machineCount: number; disposalType: string; requestedByName: string | null; requestDate: Date; counts: DisposalBatchStageCounts }`
  - `export function disposalBatchListWhere(search: string): Prisma.DisposalBatchWhereInput` — batch number, any machine's tag or name, requester name.
  - `export async function readDisposalBatchList(db, query: { search: string; page: number; pageSize: ListPageSize }): Promise<{ rows: DisposalBatchListRow[]; total: number; strip: DisposalBatchStageCounts & { batches: number } }>` — newest first by `requestDate`, then `batchNo` desc.
  - `export type DisposalBatchMachine = { requestId: string; disposalNo: string; assetTag: string; assetName: string; serialNumber: string | null; requestStatus: string; ownPhotoId: string | null; round: { id: string; roundNo: string; executionDate: Date } | null }`
  - `export type DisposalBatchDetail = { batch: { id: string; batchNo: string; title: string; disposalType: string; requestedByName: string | null; approverName: string | null; reason: string; requestDate: Date }; counts: DisposalBatchStageCounts; machines: DisposalBatchMachine[]; lotPhotos: DisposalPhotoRef[]; roundCandidates: { joinableIds: string[]; blocked: Array<{ requestId: string; code: DisposalRoundBlockCode }> } }`
  - `export async function readDisposalBatch(db, id: string, actor: DisposalRoundActor | null): Promise<DisposalBatchDetail | null>` (null = the viewer has no `disposal:edit`; the page builds the actor the way the queue page does for its tick blocks) — `ownPhotoId` is the first **own** (not batch) showable photo (jpeg/png/webp/gif); `roundCandidates` only from requests `approved` with `roundId` null; tick blocks only when `actor` is given, else `joinableIds: []` and `blocked: []`.
  - The q= item: `{ …existing, assetTag: string, name: string, serialNumber: string | null }`.

- [ ] **Step 1: Write the failing tests** (fake db, the style of `tests/disposal-round-page-data.test.ts`):
  - `readDisposalBatch: a batch with only the lot photo gives every machine ownPhotoId null` — two requests, one batch image → both `ownPhotoId === null`, `lotPhotos.length === 1`.
  - `readDisposalBatch: a machine's own JPEG is its ownPhotoId, a HEIC is skipped` — own files `[heic, jpeg]` → the jpeg's id.
  - `readDisposalBatch: counts by stage and a disposed machine carries its round` — statuses `pending, approved, disposed, rejected` → `{1,1,1,1,total 4}`; the disposed row's `round.roundNo === "DPR-20261105-0001"`.
  - `readDisposalBatch: roundCandidates splits joinable and blocked` — two approved without round, tick blocks `{a: null, b: "DISPOSAL_SOD_CONFLICT"}` → `joinableIds ["a"]`, `blocked [{requestId:"b", code:"DISPOSAL_SOD_CONFLICT"}]`; an approved one already in a round is in neither.
  - `readDisposalBatch: a viewer without disposal:edit gets no candidates`.
  - `readDisposalBatch: serialNumber null stays null` and the title follows `buildDisposalRoundTitle` (`["Monitor","Monitor"]` → `"Monitor 2 เครื่อง"`).
  - `readDisposalBatchList: newest first, the strip sums every batch's requests` and `disposalBatchListWhere("DPB-2026")` contains the batchNo `contains`.
  - The q= item carries `assetTag`, `name`, `serialNumber` (null when none).
- [ ] **Step 2:** `node --test tests/disposal-batch-page-data.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement. Chunk every `IN` list by 2,000 ids (SQL Server's 2,100-parameter limit; a batch has ≤ 100 but the list strip may read many).
- [ ] **Step 4:** the tests pass; `npm test` green; `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: Commit** `feat(disposal): batch page and list read model, the Serial in the asset search (request batches Task 1)`

### Task 2: The batch form (DP-Batch-New)

**Files:**
- Create: `src/lib/disposal-batch-form-rules.ts`
- Rewrite: `src/components/disposal/disposal-batch-form.tsx` (on `OperationFormFrame`)
- Create: `src/components/disposal/disposal-batch-machine-row.tsx` (one row: name, tag, Serial, optional photo slot, remove)
- Modify: `src/app/[locale]/(dashboard)/disposal/batch/new/page.tsx` (phone notice; requester preset to the signed-in user's employee, as the single form's page does)
- Modify: `messages/th.json`, `messages/en.json` (via the script)
- Test: `tests/disposal-batch-form-rules.test.ts`, update source pins in `tests/form-frames-ui.test.ts`, `tests/disposal-sweep-ui.test.ts`, `tests/e2e-disposal.test.ts` as needed

**Interfaces:**
- Consumes: Task 1's q= fields (`assetTag`, `name`, `serialNumber`); `getDisposalPhotoRequirementError`, `getDisposalQueuedFileError`, `getDisposalRequestReasonError`; `POST /api/disposal-batches` (body unchanged; result `{ batch, requests }`, each request has `id`, `assetId`, `disposalNo`).
- Produces:
  - `export type DisposalBatchFormField = "assets" | "lotFiles" | "disposalType" | "reason" | "requestedById"`
  - `export function validateDisposalBatchForm(input: { assetCount: number; lotFiles: readonly { type: string; name: string }[]; disposalType: string; reason: string; requestedById: string }): Partial<Record<DisposalBatchFormField, string>>` — assets `< 2` → `"batchMinAssets"`; lot files by `getDisposalPhotoRequirementError(lotFiles, disposalType)`; method required; reason rules as the single form; requester required. **Never** an error for a row's own photo.
  - `export function disposalBatchPhotoCount(rows: readonly { files: readonly unknown[] }[]): { machines: number; withOwnPhoto: number }`
  - `export type DisposalBatchUploadJob = { kind: "machine"; requestId: string; disposalNo: string; assetTag: string; file: File } | { kind: "lot"; batchId: string; file: File }`
  - `export function planDisposalBatchUploads(created: { batch: { id: string }; requests: { id: string; assetId: string; disposalNo: string }[] }, rows: readonly { assetId: string; assetTag: string; files: readonly File[] }[], lotFiles: readonly File[]): DisposalBatchUploadJob[]` — lot jobs first, then machines in row order.
  - `export function summarizeDisposalBatchUploads(results: readonly { job: DisposalBatchUploadJob; ok: boolean }[]): { lotFailed: number; machines: Array<{ requestId: string; disposalNo: string; assetTag: string; failed: number }> }` — only failed machines listed.
- **Copy (exact, th):**
  - section titles `เลือกทรัพย์สิน` · `รูปรวมของชุด` · `ประเภทและข้อมูลคำขอ`
  - row photo `รูปของเครื่องนี้ (ไม่บังคับ)`; Serial label `Serial`; none `–`
  - count line `{n} เครื่อง · มีรูปของเครื่อง {b} · ที่เหลือใช้รูปรวม`
  - lot slot help `ต้องมีรูปอย่างน้อย 1 รูป · สูญหายแนบไฟล์อะไรก็ได้ เช่น ใบแจ้งความ`
  - min assets `เลือกอย่างน้อย 2 เครื่อง`
  - footer `ส่งคำขอ {n} เครื่อง`
  - phone `สร้างชุดคำขอได้บนคอมพิวเตอร์` with link `ยื่นคำขอทีละเครื่อง` → `/disposal/new`
  - failure notice title `ส่งรูปไม่สำเร็จ {n} ไฟล์`; per machine `{disposalNo} · {assetTag} · แนบรูป`; lot line `รูปรวมของชุดส่งไม่สำเร็จ {n} ไฟล์`; button `เปิดหน้าชุดคำขอ`
  - summary title `หลังส่งคำขอ` (reuse the single form's summary words for asset status → รอตัดจำหน่าย, request → รอพิจารณา, approver)

- [ ] **Step 1: Failing tests** in `tests/disposal-batch-form-rules.test.ts`:
  - `validateDisposalBatchForm: one machine is refused, a row without its own photo is not` → `{ assets: "batchMinAssets" }` only for 1 asset; with 2 assets, a lot JPEG, method, reason of 12+ chars, requester → `{}`.
  - `validateDisposalBatchForm: no lot photo is refused; a lost batch accepts a PDF alone` → `lotFiles: "photoRequired"` for `[]` with `dispose`; `{}` for `[pdf]` with `lost`.
  - `disposalBatchPhotoCount` → `{ machines: 3, withOwnPhoto: 1 }`.
  - `planDisposalBatchUploads maps each row's files to its own request by assetId and the lot files to the batch` (lot first).
  - `summarizeDisposalBatchUploads names each failed machine` → one failed of three, plus `lotFailed: 1`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement the rules; rebuild the form:
  - Section 1: `DisposalAssetPicker` (`max` 100) for search only; the chosen machines render as `DisposalBatchMachineRow`s (not the picker's own list); the count line.
  - Row photo slot: `FileDropzone` / `ChosenPhotoPreview` with `disposalEvidenceAccept`, HEIC refused at once via `getDisposalQueuedFileError`; hidden when the method is `lost`.
  - Section 2 lot slot, Section 3 method cards (`ChoiceCard`, no default, "เปลี่ยนได้ตอนบันทึกรอบตัดจำหน่าย"), reason with live count, requester (preset), advisory approver.
  - Summary panel; sticky footer button; submit = create, then `planDisposalBatchUploads` → pool of 4 → `summarizeDisposalBatchUploads` → PB-R3.
  - Below `md` the form is not rendered; the phone notice shows instead.
- [ ] **Step 4:** tests pass; `npm test`, `tsc`, `npx eslint` on the touched files clean.
- [ ] **Step 5: Commit** `feat(disposal): the batch form on the operation frame: optional photo per machine, the required lot photo, the Serial shown (request batches Task 2)`

### Task 3: The batch page (DP-Batch)

**Files:**
- Rewrite: `src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx`
- Create: `src/components/disposal/disposal-batch-round-button.tsx` (client; PB-R6)
- Modify: the request page `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`: give its files section `id="files"` (no anchor exists today) so "แนบรูป" lands on it
- Modify: messages (script)
- Test: `tests/disposal-batch-page-ui.test.ts` (source pins), update `tests/list-pages-ui.test.ts` pins for the batch page

**Interfaces:**
- Consumes: `readDisposalBatch` (Task 1); `disposalRoundSelectionStorageKey`, `disposalRoundSelectionScope` (`src/lib/disposal-round-selection.ts`); `DisposalPhotoGallery` (`src/components/disposal/disposal-photo-gallery.tsx`); the attachments thumbnail route the round page uses.
- Produces: `DisposalBatchRoundButton({ ids, href, label }: { ids: string[]; href: string; label: string })`.
- **Copy (exact, th):** progress `ตัดจำหน่ายแล้ว {x}/{y}`; stage words from `disposalPage.statuses`; `ใช้รูปรวม`; `แนบรูป` (→ `/disposal/{requestId}#files`); round button `สร้างรอบตัดจำหน่ายจากชุดนี้ ({n} เครื่อง)`; blocked line `เข้ารอบไม่ได้ {n} เครื่อง: {reasons}` (reasons = the queue's tick reasons); phone note: reuse `disposalPage.queue.roundPhoneNote`.

- [ ] **Step 1: Failing source-pin tests:** the page calls `readDisposalBatch(prisma, id,`; renders `DisposalPhotoGallery` for `lotPhotos`; a row with `ownPhotoId === null` renders the `ใช้รูปรวม` key and the `#files` link; a recorded row links `/disposal/rounds/${machine.round.id}`; `DisposalBatchRoundButton` only when `joinableIds.length > 0` and `hasPermission(user, "disposal", "edit")`, wrapped `hidden md:…`; the button writes `disposalRoundSelectionStorageKey` with `disposalRoundSelectionScope({ search: "", disposalType: "", dateFrom: "", dateTo: "" })`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement: header (batch number as `h1`, the title, method · requester · date; back to the list keeping `returnTo` as today); progress bar + four stage counts; side panel with the lot gallery and other batch files (`DisposalAttachments` for the batch as today); machines `DataTable` (desktop) / cards (phone) with thumbnail, name, tag, Serial (`–`), request link, stage badge, round link.
- [ ] **Step 4:** tests, `npm test`, `tsc`, eslint clean.
- [ ] **Step 5: Commit** `feat(disposal): the batch page: progress, the lot photo, each machine with its own photo or ใช้รูปรวม, a round from the batch (request batches Task 3)`

### Task 4: The batch list (DP-Batches)

**Files:**
- Rewrite: `src/app/[locale]/(dashboard)/disposal/batches/page.tsx`
- Modify: messages (script)
- Test: update `tests/list-pages-ui.test.ts`, `tests/operational-return-navigation.test.ts` pins; add list cases to `tests/disposal-batch-page-ui.test.ts`

**Interfaces:**
- Consumes: `readDisposalBatchList`, `disposalBatchListWhere` (Task 1).
- **Copy (exact, th):** search placeholder `ค้นหาเลขชุด ชื่อทรัพย์สิน รหัส หรือผู้ขอ`; progress `ตัดจำหน่ายแล้ว {x}/{y}`; machine count `{y} เครื่อง`; strip line `{n} คำขอจาก {m} ชุด`; empty `ยังไม่มีชุดคำขอ`.

- [ ] **Step 1: Failing pins:** `readDisposalBatchList(prisma, {`; a search form with `name="q"`; the columns batch number · name + count · method · requester · date · progress (with a bar element `data-batch-progress`) · open; the strip; `Pagination` with 25/50/100; a page past the end redirects to the last (as today).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement (min widths so 1024 does not squeeze the name column; the round list's `min-w-56` lesson).
- [ ] **Step 4:** tests, `npm test`, `tsc`, eslint clean.
- [ ] **Step 5: Commit** `feat(disposal): the batch list: a name and progress per batch, search, the strip (request batches Task 4)`

### Task 5: E2E

**Files:**
- Modify: `e2e/disposal/batch-bulk-approval.spec.ts` (the new form: no review dialog; on phone projects the batch is created on a desktop-sized context or through the API — the form is desktop-only)
- Create: `e2e/disposal/batch-pages.spec.ts`
- Modify: `e2e/disposal/disposal-support.ts` (helpers for the batch form)

- [ ] **Step 1:** `batch-pages.spec.ts` (run-marked prefix via `recordPrefix`):
  - IT staff create a batch of 3 on the desktop: one machine with its own photo, two without, one lot photo; the count line reads `3 เครื่อง · มีรูปของเครื่อง 1 · ที่เหลือใช้รูปรวม`; the batch page opens; the row with a photo shows a thumbnail, the other two `ใช้รูปรวม`; Serial shown (or `–`).
  - The IT head opens the machine with its own photo in the approvals page: the first image is that photo (not the lot photo); a machine without one shows the lot photo.
  - After approval, IT staff press `สร้างรอบตัดจำหน่ายจากชุดนี้ (3 เครื่อง)`, save a round; the batch page reads `ตัดจำหน่ายแล้ว 3/3` and each row links its round; the round's Excel row of the machine with its own photo has an image (the plan 4 report check).
  - A lost batch with a PDF lot file and no row slots sends.
  - The list finds the batch by its number and shows `ตัดจำหน่ายแล้ว 3/3`.
  - Phone: `/disposal/batch/new` shows `สร้างชุดคำขอได้บนคอมพิวเตอร์`; the batch page is readable as cards with no round button.
  - axe: no serious/critical on the three pages (use `recordSettled`).
- [ ] **Step 2:** controller runs `e2e/disposal` four projects; fix; commit `test(e2e): request batch pages (request batches Task 5)`.

### Task 6 (controller): verification, look step, final review, docs

- [ ] E2E: `e2e/disposal`, `e2e/approvals`, `e2e/cross-cutting`, four projects (targeted; the whole suite ran at the end of group 6).
- [ ] Look step on 3300: the form (empty, 3 machines with and without photos, a failed-upload notice is hard to stage — check by source), the batch page (old batch with lot photo only, a mixed batch, a finished batch), the list; 1440 both themes, 1024, 390 both themes. Fix what it finds.
- [ ] Final review: opus Workflow, 3 lenses × 2 adversarial skeptics, base master `2907fc10`; one fix pass.
- [ ] Docs: `docs/06_WORKFLOWS.md`, `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`, `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md`; wiki (`ams-status`, open question 79, `ams-log`, lint, `ingest:` commit); memory.
