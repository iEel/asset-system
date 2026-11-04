# Page group 6, plan 3: the disposal request form and the request page (DP-New, DP-Request, DP-Request-Phone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/disposal/new` as board DP-New and `/disposal/[id]` as boards DP-Request and DP-Request-Phone. The batch form gains the photo rule, and the method `dispose` is renamed "จำหน่าย".

DP-New:
- the asset card with its readiness line;
- method cards with no default;
- the requester preset to the signed-in user;
- the reason rule stated up front;
- a required photo;
- the summary "หลังส่งคำขอ";
- the sticky footer.

DP-Request:
- the next-step card with separate approve and reject buttons, or the reason why the viewer cannot decide;
- the effect of each decision, with the real previous status;
- the asset panel with all photos;
- the source link;
- a no-photo notice;
- the phone layout with a ⋯ menu and an action bar only when there is a next step.

**Architecture:**
- **The form** moves onto the shared `OperationFormFrame`, as group 5's repair form did. Pure rules are client-safe libs with tests: the photo rule, the readiness line, the requester default, the summary rows.
- **The request page** keeps its server loader. It gains `previousAssetStatus`, the photo list (plan 1's `listDisposalPhotos`) and the source link (plan 1's `readDisposalSourceLinks`). It reuses plan 2's `ApprovalPhotoGallery`.
- **The decision dialog** (`DisposalDecisionButton`) takes a preset decision and stops sending `nextStatusId`.
- **Execution stays as it is until plan 4:** the approved state still offers today's "บันทึกตัดจำหน่าย", and a disposed request shows today's execution facts. Plan 4 replaces both with the round.

**Tech Stack:** Next.js 16 App Router, next-intl, Prisma 7, the shared UI parts, `node --test`, Playwright (four projects).

**Spec:** `docs/superpowers/specs/2026-11-04-page-group-6-disposal-approvals-design.md`. This plan covers §16 row 3:
- §8 (all of it);
- §9.1–9.3, §9.5, §9.6 (§9.4 is plan 4);
- §5 "a lost machine", "photos are images" and "has a photo";
- §13 (the method word, ยื่นคำขอตัดจำหน่าย);
- §14.1 calls 3, 4, 13, 14, 20, 21.

## Global Constraints

- **Words:**
  - Thai first; words from `docs/19_THAI_GLOSSARY.md`.
  - Messages change only through `node scripts/messages-edit.mjs <change.json>`, whose keys are **dotted paths** (`{ "set": { "th": { "disposalPage.types.dispose": "จำหน่าย" }, "en": { … } }, "delete": [] }`). A nested object replaces a whole namespace, so never pass one.
- **The method `dispose` reads "ตัดจำหน่าย", unchanged (user 2026-11-04: "ใช้คำว่าตัดจำหน่าย ดีกว่า").
- **The page's H1 and the main button** read "ยื่นคำขอตัดจำหน่าย"; the submit button reads "ส่งคำขอตัดจำหน่าย".
- **Disposal status words stay:** รอพิจารณา · อนุมัติแล้ว รอตัดจำหน่าย · ตัดจำหน่ายแล้ว · ไม่อนุมัติ.
- **Photo rule** (plan 1's `src/lib/disposal-photo.ts` is the source):
  - The photo input accepts `disposalEvidenceAccept` (jpeg, png, webp, pdf).
  - A request needs at least one image (jpeg, png or webp) before it is sent. A **lost** request (`disposalType === "lost"`) needs at least one file of any accepted type.
  - HEIC/HEIF is refused at once with "ใช้ไฟล์ JPG, PNG หรือ WEBP".
  - The server refuses other image types (`DISPOSAL_PHOTO_TYPE`, plan 1).
- **Create-then-upload stays:** POST JSON, then one upload per file, then the request page. The photo rule is a client gate; the server POST is unchanged.
- **Separation of duties:** the server's rules and reasons from plan 1 (`getDisposalApprovalSodReason`, reasons `requester` / `creator` / `no_employee`). The page only reads them earlier.
- **Shared parts only:**
  - forms: `OperationFormFrame`, `OperationSummaryCard`, `FormSection`, `Field`, `ChoiceCard`, `FileDropzone`, `FileQueueList`;
  - page structure: `PageHeader`, `ContentPanel`, `KeyValueList`, `Steps`, `Notice`, `StatusBadge`, `ActionBar`, `RowActions` (⋯);
  - photos: `AssetPhotoFrame`, `AttachmentPreviewDialog`;
  - plan 2's `ApprovalPhotoGallery`.
- **Stable hooks:** the ids E2E uses stay (`#disposal-request-asset`, `#disposal-request-reason`, `#disposal-request-requested-by`, and the like; check `e2e/disposal/*` before renaming any). New hooks are `data-disposal-*`.
- **E2E** runs only on `asset_management_dev`: run-marked data, no LDAP sync, no settings save, no delete, no master-data change.

## Rulings (made while writing; the controller records them in the ledger)

- **P3-R1:** the approved state keeps today's "บันทึกตัดจำหน่าย" (`DisposalExecutionButton`), and a disposed request keeps today's execution panel. Plan 4 retires both for the round (spec §9.4). The next-step card's approved line reads "อนุมัติแล้ว · รอบันทึกตัดจำหน่าย". *Cost if wrong:* nothing; plan 4 changes these lines.
- **P3-R2:** the request page's photos reuse plan 2's `ApprovalPhotoGallery`; it moves from `components/approvals` to `src/components/disposal/disposal-photo-gallery.tsx`, and both pages import it there. *Cost if wrong:* a file move.
- **P3-R3:** the batch form keeps its look (spec §4) and gains only the photo rule. That is at least one image among its shared files, or one file of any kind when the batch's method is `lost`, with the same accept list and error. *Cost if wrong:* none; the spec says so.

## Review Focus

1. **The method is changed to สูญหาย after a PDF is queued, then back to ขาย.** The photo error comes and goes with the method, and the send stays blocked until an image is queued. *(Task 1 test of the pure rule; Task 2 E2E.)*
2. **Every upload fails after the request is created.** The request page shows "อัปโหลดไม่สำเร็จ {n} ไฟล์ · คำขอนี้ยังไม่มีรูป" with the upload right there, and the inbox row reads "ยังไม่มีรูป". *(Task 3 pin; Task 5 E2E with a refused HEIC.)*
3. **A user with no employee link opens the form.** The requester starts empty, with the hint "บัญชีของคุณยังไม่ผูกกับพนักงาน เลือกผู้ขอเอง". The send still needs a requester. *(Task 1 test.)*
4. **A requester opens their own pending request on the phone.** They see the separation-of-duties notice, no action bar, and the photo upload. Print and history are in the ⋯ menu. *(Task 4 E2E.)*
5. **`?assetId=` names an asset that has an open checkout or repair** (a readiness blocker). The asset is not preselected, the picker shows it disabled with its reason, and the page says why. *(Task 1 test of the page helper; Task 2 pin.)*

---

### Task 1: Rules, words and the asset read

**Files:**
- Create: `src/lib/disposal-request-form-rules.ts` (client-safe, `.ts` relative imports)
- Modify: `src/app/api/disposal-assets/route.ts` (`?id=` returns the card's fields), `src/app/[locale]/(dashboard)/disposal/new/page.tsx` (the prefill rule only), messages via the script
- Test: new `tests/disposal-request-form-rules.test.ts`; update pins that read `types.dispose` text

**Interfaces:**
- Produces:
  - `getDisposalPhotoRequirementError(files: ReadonlyArray<{ type: string }>, disposalType: string | ""): "photoRequired" | "fileRequired" | null`:
    - `lost` → `"fileRequired"` when there are no files;
    - any other method, or none chosen → `"photoRequired"` unless a file has a type in `disposalPhotoMimeTypes`.
  - `getDisposalQueuedFileError(file: { type: string; name: string }): "DISPOSAL_PHOTO_TYPE" | null`: refuses HEIC/HEIF (and any image type outside the three) by type, or by the `.heic`/`.heif` extension when the type is empty.
  - `disposalReadinessLine(asset: { eligible: boolean; blockers: string[] }): "ready" | "blocked"`: the form shows the "ไม่มีงานค้าง: …" line only for `ready`.
  - `defaultDisposalRequester(user: { employeeId: string | null }, employees: ReadonlyArray<{ id: string }>): { requestedById: string; needsChoice: boolean }`: the signed-in user's employee when it is in the list, else `""` with `needsChoice: true`.
  - `buildDisposalRequestSummary(input: { assetStatusName: string | null; disposalType: string | ""; approverLabel: string | null; photoCount: number; fileCount: number; requesterChosen: boolean; reasonOk: boolean }): { rows: Array<{ key: "assetStatus" | "request" | "approver"; now: string | null; next: string }>; checks: Array<{ key: "asset" | "method" | "requesterReason" | "photo"; done: boolean }> }`. It returns message keys and raw values; the form translates them.
  - `GET /api/disposal-assets?id=<id>` returns, besides today's fields, `card: { name, assetTag, statusName, statusNameTh, locationName, branchName, custodianName, photoAttachmentId | null }`. The photo is the asset's register photo (`module: "asset"`), as the asset page reads it.
- Messages (all through the script, dotted keys):
  - `disposalPage.types.dispose` stays "ตัดจำหน่าย" (user 2026-11-04);
  - `disposalPage.photoRequired` "ต้องมีรูปทรัพย์สินอย่างน้อย 1 รูป";
  - `disposalPage.fileRequired` "แนบหลักฐานอย่างน้อย 1 ไฟล์";
  - `disposalPage.photoTypeRefused` "ใช้ไฟล์ JPG, PNG หรือ WEBP";
  - `disposalPage.readyLine` "ไม่มีงานค้าง: รับคืนแล้ว · ไม่มีงานซ่อม · ไม่อยู่ในรอบตรวจนับ · ไม่มีส่วนควบติดตั้ง";
  - `disposalPage.requesterPresetHint` "ตั้งเป็นคุณไว้ให้ · เปลี่ยนได้เมื่อขอแทนคนอื่น";
  - `disposalPage.requesterNoEmployeeHint` "บัญชีของคุณยังไม่ผูกกับพนักงาน เลือกผู้ขอเอง";
  - `disposalPage.approverHint` "ระบุเพื่อแจ้งว่าขอให้ใครพิจารณา · ผู้มีสิทธิ์คนอื่นพิจารณาได้เช่นกัน ยกเว้นผู้ขอและผู้สร้างคำขอ";
  - `disposalPage.reasonRule` "อย่างน้อย 12 ตัวอักษร";
  - `disposalPage.reasonReady` "ครบ 12 ตัวอักษรแล้ว";
  - `disposalPage.reasonMore` "อีก {count} ตัวอักษร";
  - `disposalPage.methodNeeds.sell` "ตอนบันทึกรอบต้องมีผู้ซื้อ ราคาขายเหมาของรอบ และเลขที่เอกสาร";
  - `disposalPage.methodNeeds.donate` and `disposalPage.methodNeeds.dispose` "ตอนบันทึกรอบต้องมีผู้รับและเลขที่เอกสาร";
  - `disposalPage.methodNeeds.destroy` and `disposalPage.methodNeeds.lost` "ตอนบันทึกรอบต้องมีเลขที่เอกสารและรายละเอียดการดำเนินการ";
  - `disposalPage.methodHint` "เปลี่ยนได้ตอนบันทึกรอบตัดจำหน่าย";
  - `disposalPage.createTitle` "ยื่นคำขอตัดจำหน่าย";
  - `disposalPage.createSubtitle` "เลือกทรัพย์สิน ระบุวิธีและเหตุผล แนบรูป แล้วส่งให้ผู้มีสิทธิ์พิจารณา";
  - `disposalPage.submitRequest` "ส่งคำขอตัดจำหน่าย".
  - The English for each, as plain English.
  - **No "จริง" in the execute words** (user 2026-11-04: "ใช้คำว่า บันทึกตัดจำหน่าย"). These change through the script:
    - `disposalPage.executeDisposal` "บันทึกตัดจำหน่าย";
    - `disposalPage.executionTitle` "บันทึกตัดจำหน่าย";
    - `disposalPage.executionSuccess` "บันทึกตัดจำหน่ายแล้ว";
    - `disposalPage.approveKeepsPendingDisposal` "อนุมัติแล้วจะยังคงสถานะทรัพย์สินไว้ก่อน จนกว่าจะบันทึกตัดจำหน่าย";
    - `disposalPage.emptyHistoryHelp` "เมื่ออนุมัติหรือบันทึกตัดจำหน่าย ระบบจะแสดงประวัติที่นี่";
    - the `DISPOSAL_EVIDENCE_REQUIRED` texts "กรุณาแนบหลักฐานก่อนบันทึกตัดจำหน่าย";
    - `notifications.approvedDisposalsDetail` "ยังไม่ได้บันทึกตัดจำหน่าย";
    - the stage word `…execution` "บันทึกตัดจำหน่าย";
    - the bulk-execution texts that say "ผลตัดจำหน่ายจริง" → "ตัดจำหน่าย".
  - **Glossary:** the row **บันทึกตัดจำหน่าย** (retired: บันทึกตัดจำหน่ายจริง). `tests/thai-glossary.test.ts` pins that `messages/th.json` has no "ตัดจำหน่ายจริง".
  - **E2E:** the E2E specs and helpers that click or read the old words follow (Task 5 owns `single-request.spec.ts` and `batch-bulk-approval.spec.ts`; this task updates only the pins in `tests/`).

- [ ] **Step 1: Write the failing tests** (`tests/disposal-request-form-rules.test.ts`)
  - `getDisposalPhotoRequirementError`:
    - `([], "sell")` → `"photoRequired"`;
    - `([{type:"application/pdf"}], "sell")` → `"photoRequired"`;
    - `([{type:"image/jpeg"}], "sell")` → null;
    - `([{type:"application/pdf"}], "lost")` → null;
    - `([], "lost")` → `"fileRequired"`;
    - `([{type:"image/png"}], "")` → null.
  - `getDisposalQueuedFileError`:
    - `{type:"image/heic",name:"a.heic"}` → `"DISPOSAL_PHOTO_TYPE"`;
    - `{type:"",name:"IMG_1.HEIC"}` → `"DISPOSAL_PHOTO_TYPE"`;
    - `{type:"image/jpeg",name:"a.jpg"}` → null;
    - `{type:"application/pdf",name:"a.pdf"}` → null.
  - `defaultDisposalRequester`:
    - an employee id in the list → `{ requestedById: id, needsChoice: false }`;
    - null, or an id missing from the list → `{ requestedById: "", needsChoice: true }`.
  - `buildDisposalRequestSummary` with a status "พร้อมใช้งาน", method "", 0 photos:
    - rows: assetStatus now "พร้อมใช้งาน" → next key `pendingDisposal`;
    - checks: `method.done === false`, `photo.done === false`;
    - with a method and one photo, both are done.
  - The prefill rule is a pure helper exported from the rules file, `initialDisposalAsset(asset: { eligible: boolean; blockers: string[] } | null): "use" | "blocked" | "none"`:
    - eligible with no blockers → `"use"`;
    - eligible with a blocker → `"blocked"`;
    - null → `"none"`.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/disposal-request-form-rules.test.ts`
  Expected: FAIL (missing module).

- [ ] **Step 3: Implement**
  - **The rules file:** as above.
  - **`?id=` on the asset search route:** add the card's fields to that branch only; the `q=` branch is unchanged.
  - **`/disposal/new`:** compute readiness for `?assetId=` with `getDisposalReadinessBlockersForAsset`, as the POST does. Pass the asset only when `initialDisposalAsset` says `"use"`; pass the blocked asset's reason when it says `"blocked"`.
  - **Messages:** through the script. Update every pin that reads the old `types.dispose` text: grep `tests/` and `e2e/` for `"ตัดจำหน่าย"` used as a method, including the E2E helpers that pick the method by its label.

- [ ] **Step 4: Run the tests**

  Run: the command from Step 2, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/disposal-request-form-rules.ts src/app/api/disposal-assets/route.ts "src/app/[locale]/(dashboard)/disposal/new/page.tsx" messages tests
  git commit -m "feat(disposal): request form rules (photo or file by method, HEIC refused, requester preset, readiness line, summary), the asset card read, and the method word จำหน่าย (group 6 plan 3)"
  ```

### Task 2: The request form (DP-New) and the batch form's photo rule

**Files:**
- Modify (rewrite): `src/components/disposal/disposal-request-form.tsx`, `src/app/[locale]/(dashboard)/disposal/new/page.tsx`
- Create: `src/components/disposal/disposal-asset-card.tsx` (modelled on `src/components/maintenance/repair-asset-card.tsx`)
- Modify: `src/components/disposal/disposal-batch-form.tsx` (the photo rule only), `tests/form-migration-guards.test.ts` (`STICKY_FOOTER_ROUTES`, the operation-form-frame entry: add `/th/disposal/new`)
- Test: new `tests/disposal-request-form-ui.test.ts` (pins); update `tests/disposal-forms-ux.test.ts`

**Interfaces:**
- Consumes: Task 1's rules, messages and the `?id=` card read; plan 1's `disposalEvidenceAccept` and `disposalPhotoMimeTypes`.
- Produces: none for later tasks.

- [ ] **Step 1: Write the failing pins** (`tests/disposal-request-form-ui.test.ts`)
  - **The form:**
    - renders `OperationFormFrame` with breadcrumbs, `ChoiceCard` for the methods, and no `NativeSelect` for the type;
    - starts `disposalType` as `""`;
    - calls `getDisposalPhotoRequirementError(` and `getDisposalQueuedFileError(`;
    - its `FileDropzone` uses `accept={disposalEvidenceAccept}`;
    - the footer's submit label key is `submitRequest`.
  - **The page:**
    - passes the requester default from `defaultDisposalRequester(`;
    - `/th/disposal/new` is in the sticky-footer routes.
  - **The batch form:** calls `getDisposalPhotoRequirementError(`.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/disposal-request-form-ui.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement (spec §8.1–8.6)**
  - **The frame:** `OperationFormFrame` with breadcrumbs "ตัดจำหน่าย › ยื่นคำขอตัดจำหน่าย", the back link, the title and subtitle of Task 1, the summary on the right (`summaryOnPhone`), and the footer:
    - description "ยื่นคำขอตัดจำหน่าย {name} {tag} · {method}", or "เลือกทรัพย์สิน" while empty;
    - "ยกเลิก";
    - the primary "ส่งคำขอตัดจำหน่าย".
  - **Section 1 "ทรัพย์สิน":** the existing `DisposalAssetPicker`. Once chosen, `DisposalAssetCard` shows:
    - the photo or an icon;
    - the name, the mono tag and a status badge;
    - "อยู่ที่ {room} · {branch} · {holder | ไม่มีผู้ถือครอง}";
    - "เปลี่ยน";
    - the ready line under the card.

    A blocked `?assetId=` shows a `Notice` with the blocker words over the picker.
  - **Section 2 "วิธีและเหตุผล":**
    - **Methods:** five `ChoiceCard` radios (ขาย · บริจาค · ทำลาย · สูญหาย · ตัดจำหน่าย) with no default. The hint `methodHint` shows, and under the chosen card the `methodNeeds` line. The error "เลือกวิธีจำหน่าย" (an existing key, or add `disposalPage.methodRequired`) goes under the group.
    - **Estimates:** sale value for ขาย, salvage value for ขาย and จำหน่าย (today's `showsEstimated*`), each with "ไม่บังคับ · ใช้ประกอบการพิจารณา".
    - **ผู้ขอ:** preset from the page; hint `requesterPresetHint` or `requesterNoEmployeeHint`. The picker labels read "code - name · department": the page adds the department.
    - **ผู้พิจารณา (ไม่บังคับ):** with `approverHint`. The options still exclude the requester.
    - **เหตุผล \*:** the label carries `reasonRule`. The live line reads `reasonReady` or `reasonMore`, counted on the trimmed text. The count reads "{n} / 4,000 ตัวอักษร".
  - **Section 3 "รูปทรัพย์สิน":**
    - The label reads "รูปทรัพย์สิน \* อย่างน้อย 1 รูป", or "หลักฐาน \* อย่างน้อย 1 ไฟล์" for สูญหาย.
    - `FileDropzone` with `capture="environment"` and `accept={disposalEvidenceAccept}`.
    - A file refused by `getDisposalQueuedFileError` is not queued, and `photoTypeRefused` shows under the dropzone.
    - The queue shows a thumbnail for an image (`ChosenPhotoPreview` or an object-URL `<img>`, revoked on remove) and a file chip for a PDF, each with ×.
    - The section's error comes from `getDisposalPhotoRequirementError`. It shows on send, and focus goes to the dropzone.
  - **Summary:** `OperationSummaryCard` titled "หลังส่งคำขอ", with the rows and checks from `buildDisposalRequestSummary`, the steps line "ยื่นคำขอ → พิจารณา → บันทึกในรอบตัดจำหน่าย", and the footnote "ถ้าไม่อนุมัติ ทรัพย์สินกลับเป็น{status}".
  - **Send:** the same POST and uploads as today. On partial upload failure, push `?uploadErrors=<n>` (Task 3 reads it).
  - **Batch form:** add the photo rule to its `validate()`. Its accept list becomes `disposalEvidenceAccept`, and HEIC is refused with the same message. Nothing else changes.

- [ ] **Step 4: Run the tests**

  Run: `node --test tests/disposal-request-form-ui.test.ts tests/disposal-forms-ux.test.ts`, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/disposal "src/app/[locale]/(dashboard)/disposal/new" src/lib messages tests
  git commit -m "feat(disposal): the request form as board DP-New: the asset card and its readiness line, method cards with no default, the requester preset, the reason rule up front, the required photo, the summary and the sticky footer; the batch form's photo rule (group 6 plan 3)"
  ```

### Task 3: The request page on desktop (DP-Request)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`, `src/components/disposal/disposal-decision-button.tsx`, `src/components/disposal/disposal-attachments.tsx`, `src/components/disposal/disposal-workflow-stepper.tsx` (or replace it with a next-step card)
- Move: `src/components/approvals/approval-photo-gallery.tsx` → `src/components/disposal/disposal-photo-gallery.tsx` (update plan 2's import)
- Create: `src/components/disposal/disposal-next-step-card.tsx` (modelled on `src/components/maintenance/repair-next-step-card.tsx`)
- Test: new `tests/disposal-request-page-ui.test.ts`; update `tests/disposal-detail-workspace.test.ts` and others that pin the page

**Interfaces:**
- Consumes:
  - plan 1's `listDisposalPhotos`, `readDisposalSourceLinks`, `getDisposalApprovalSodReason` and `isDisposalPhotoFile`;
  - Task 1's messages.
- Produces:
  - `DisposalDecisionButton` gains `initialDecision?: "approve" | "reject"` and `triggerLabel?: string`, and stops sending `nextStatusId`; the next-status select goes. Task 4 uses it.
  - `DisposalNextStepCard` props, for Task 4: `{ state: "decide" | "own" | "waiting" | "approved" | "disposed" | "rejected"; sodReason; approverLabel; waitingSince; effect: { approve: string; reject: string }; actions?: ReactNode; executionAction?: ReactNode; roundOrExecution?: ReactNode; rejectRemark?: string }`.

- [ ] **Step 1: Write the failing pins** (`tests/disposal-request-page-ui.test.ts`)
  - **The page:**
    - loads `previousAssetStatus` and calls `listDisposalPhotos(` and `readDisposalSourceLinks(`;
    - renders `DisposalNextStepCard`, and `DisposalPhotoGallery` in an aside of `lg:w-[380px]` (or `lg:grid-cols-[minmax(0,1fr)_380px]`);
    - reads `searchParams.uploadErrors`;
    - shows the delete button only when `canEdit`.
  - **The decision button:**
    - has no `nextStatusId` in the PATCH body;
    - takes `initialDecision`;
    - the page renders two triggers with the labels "อนุมัติ" and "ปฏิเสธ".
  - **`disposal-attachments.tsx`:** images use `thumbnailUrl(` with `AttachmentPreviewDialog`, not a full-size `?inline=1` `<img>`; the last image's × is hidden while the request is pending or approved.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/disposal-request-page-ui.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement (spec §9.1–9.3, §9.5)**
  - **Header:**
    - breadcrumbs "ตัดจำหน่าย › DP-…";
    - H1 the asset name;
    - meta "tag · คำขอ DP-…", the status badge and the method chip;
    - actions: "พิมพ์คำขอ" (or "พิมพ์เอกสาร…" once disposed) and a `RowActions` ⋯ holding "ประวัติ" (`#history`) and "เปิดหน้าทรัพย์สิน".
  - **`DisposalNextStepCard`** (full width): `Steps` with ยื่นคำขอ ✓ · พิจารณา · บันทึกในรอบตัดจำหน่าย, then by state:
    - **`decide`** (pending; the viewer has `disposal:approve`; no SoD reason):
      - "รอคุณพิจารณา";
      - the effect lines: "ถ้าอนุมัติ: คำขอเป็น อนุมัติแล้ว รอตัดจำหน่าย · ทรัพย์สินยังเป็นรอตัดจำหน่าย จนกว่าจะบันทึกในรอบตัดจำหน่าย" and "ถ้าปฏิเสธ: คำขอเป็น ไม่อนุมัติ · ทรัพย์สินกลับเป็น{previous status}";
      - the SoD note when the policy requires it;
      - two `DisposalDecisionButton`s, `initialDecision` approve and reject.
    - **`own`** (pending with an SoD reason): a warning `Notice` "คุณพิจารณาคำขอนี้เองไม่ได้", with the reason line from plan 2's words.
    - **`waiting`** (pending; no `disposal:approve`): "รอผู้มีสิทธิ์พิจารณา".
    - **`own` and `waiting`** both show "รอใคร: {approver} (ระบุไว้) หรือผู้มีสิทธิ์คนอื่น", or "คิวอนุมัติส่วนกลาง · ผู้มีสิทธิ์พิจารณาคนใดก็ได้ที่ไม่ใช่คุณ", and "รอมาแล้ว ตั้งแต่ {date}".
    - **`approved`:** "อนุมัติแล้ว · รอบันทึกตัดจำหน่าย". The approver sees "คุณอนุมัติคำขอนี้ จึงบันทึกตัดจำหน่ายรายการนี้เองไม่ได้". Today's `DisposalExecutionButton` stays for `disposal:edit` (P3-R1).
    - **`disposed`:** "ตัดจำหน่ายแล้ว · {date}"; today's execution panel stays below.
    - **`rejected`:** "ไม่อนุมัติ · {remark}" and "ทรัพย์สินกลับเป็น{status}".
  - **Main column:**
    - "รายละเอียดคำขอ" as a `KeyValueList` with labels above, without the duplicated status:
      - วิธี;
      - the estimates;
      - ผู้ขอ;
      - ผู้พิจารณา;
      - วันที่ขอ;
      - **ที่มา** (plan 1's link; this replaces the hand-styled link from plan 1 with `linkVariants`);
      - "สร้างจากชุด DPB-…" when in a batch;
      - เหตุผล, inside the same panel.
    - Then the decision panel when decided, the execution panel when disposed (today's), and the history (today's, `id="history"`).
  - **Aside, 380 px:**
    - the asset panel: `DisposalPhotoGallery` with all request and batch photos, then the asset `KeyValueList` with labels above, empty rows hidden and `[overflow-wrap:anywhere]`;
    - then the evidence (`DisposalAttachments`).
    - **No-photo notice:** with no image (and not lost), a warning `Notice` sits on top: "คำขอนี้ยังไม่มีรูป · แนบรูปได้ที่นี่", or "อัปโหลดไม่สำเร็จ {n} ไฟล์ · คำขอนี้ยังไม่มีรูป" when `?uploadErrors=` is set.
    - The hint reads "เพิ่มรูปได้ระหว่างรอพิจารณา ผู้พิจารณาจะเห็นทันที".
  - **`DisposalAttachments`:**
    - images are 96 px thumbnails (`thumbnailUrl`) opening `AttachmentPreviewDialog`; PDFs are file rows;
    - its accept list is `disposalEvidenceAccept`, and HEIC is refused before upload with `photoTypeRefused`;
    - the × shows only with `canEdit`, and is hidden on the last qualifying file of a pending or approved request (plan 1's rule; the server refuses it anyway with `DISPOSAL_LAST_PHOTO`);
    - a 409 shows the message.
  - **The decision button:** `initialDecision` presets the outcome and hides the decision select. The trigger label is "อนุมัติ" (primary) or "ปฏิเสธ" (danger outline). The status select is removed, and the PATCH sends `{ decision, approvalRemark, saleValue?, salvageValue? }`.

- [ ] **Step 4: Run the tests**

  Run: `node --test tests/disposal-request-page-ui.test.ts`, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components "src/app/[locale]/(dashboard)/disposal/[id]" src/lib messages tests
  git commit -m "feat(disposal): the request page as board DP-Request: the next-step card with approve and reject or the reason you cannot decide, the real previous status, all photos in the asset panel, the source link, the no-photo notice and thumbnails (group 6 plan 3)"
  ```

### Task 4: The request page on the phone (DP-Request-Phone)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx` (the phone parts), and the phone bar component if the page uses one
- Test: `tests/disposal-request-page-ui.test.ts`

**Interfaces:**
- Consumes: Task 3's `DisposalNextStepCard` and `DisposalDecisionButton` (`initialDecision`).

- [ ] **Step 1: Write the failing pins.** The phone `ActionBar`:
  - renders only when the state is `decide` (its buttons are "ปฏิเสธ" and "อนุมัติ") or `approved` with `canEdit` ("บันทึกตัดจำหน่าย", P3-R1);
  - is never the old "เปิดรายละเอียดทรัพย์สิน" primary.

  The page's mobile header has a ⋯ (`RowActions`) holding print and history.

- [ ] **Step 2: Run them to see them fail.**

- [ ] **Step 3: Implement (spec §9.6):**
  - **Order below `lg`:**
    1. the next-step card with the 3-step bar ("ขั้นที่ {n} จาก 3"), the notice, "รอใคร" and "รอมาแล้ว";
    2. a "สถานะทรัพย์สิน" card: "ตอนนี้: {badge}", then "ถ้าอนุมัติ / ถ้าปฏิเสธ";
    3. "รายละเอียดคำขอ";
    4. "หลักฐาน" with 64 px tiles and the dashed add tile (camera).
  - **Header actions** go into the ⋯ menu. The action bar follows Step 1.

- [ ] **Step 4: Run the tests** (`npm test`; expected 0 failures) **and commit**
  ```bash
  git add "src/app/[locale]/(dashboard)/disposal/[id]" src/components tests
  git commit -m "feat(disposal): the request page on the phone as board DP-Request-Phone: the step card, the asset status card, the ⋯ menu, and the action bar only with a next step (group 6 plan 3)"
  ```

### Task 5: E2E

**Files:**
- Modify:
  - `e2e/disposal/single-request.spec.ts`: choose the method, attach a photo, the Approve and Reject buttons;
  - `e2e/disposal/open-audit-block.spec.ts`;
  - `e2e/cross-cutting/field-errors.spec.ts:288-303`: the photo error and the method error;
  - `e2e/disposal/disposal-support.ts`: helpers that pick the method by its new word;
  - `tests/e2e-disposal.test.ts` (pins).
- Create: `e2e/disposal/request-form.spec.ts`

- [ ] **Step 1: Write the specs** (run-marked records, `e2e/fixtures/photo.png`):
  - **The form:**
    - IT staff open the form with `?assetId=` of a ready run asset: the card and the ready line show.
    - "ส่งคำขอตัดจำหน่าย" with no method and no photo shows both errors, and focus goes to the method group.
    - Choosing สูญหาย with a PDF clears the photo error; switching back to ขาย brings it back.
    - A HEIC name is refused at once. This needs no real HEIC file: use a tiny buffer named `x.heic` with type `image/heic` via `setInputFiles` with a payload.
    - With a PNG it sends and lands on the request page.
  - **The request page as the requester:** "คุณพิจารณาคำขอนี้เองไม่ได้" and no Approve button. On the phone there is no action bar, and the ⋯ menu holds print.
  - **As the IT head:** "อนุมัติ" opens the dialog with approve preset; confirming reads อนุมัติแล้ว รอตัดจำหน่าย. Another run request's "ปฏิเสธ" needs a remark, and the effect line names the real previous status.
  - **A failed upload:** create a request through the API with no file, open it: the no-photo notice shows, and the inbox row reads "ยังไม่มีรูป".
  - **axe** on the form and the request page, both themes.
- [ ] **Step 2: Run** on a fresh build, four projects.

  Run: `npx playwright test e2e/disposal e2e/approvals e2e/cross-cutting --reporter=line`
  Expected: 0 failed.
- [ ] **Step 3:** update the pins and run `npm test` (0 failures). **Commit:** `test(e2e): the disposal request form and page (group 6 plan 3)`.

### Task 6 (controller): look step, final review, docs

- [ ] **Look step:** `next start` on port 3300. Cover:
  - the form at 1440 (both themes), 1024 and 390 (both themes): empty, with errors, filled with a photo;
  - the request page in each state (decide, own, approved, rejected, disposed), desktop and phone;
  - the batch form's photo error.

  Fix what it finds, then re-shoot.
- [ ] **Final whole-branch review:** an opus Workflow, 3 lenses, 2 adversarial skeptics per finding; one fix pass.
- [ ] **Docs:** `docs/06_WORKFLOWS.md`, `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md`, `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `docs/17_*` (only if a disposal guide exists).
