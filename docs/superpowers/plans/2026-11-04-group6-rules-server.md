# Page group 6, plan 1: rules and server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server rules the four group-6 pages stand on:
- the disposal photo rules;
- the approve and reject paths and the separation-of-duties reasons;
- the source labels and Bangkok-day aging;
- a paged, searchable approvals-inbox read model.

The pages themselves are not changed (plans 2 to 4).

**Architecture:**
- New small libs: `disposal-photo.ts`, `disposal-source.ts`, and an inbox read model inside `approval-inbox-query.ts`. Each has pure, testable functions and a thin DB read that takes `db` as a parameter.
- The routes change only where the spec moves a rule to the server:
  - upload type;
  - last photo;
  - approve without a status id;
  - a guarded reject;
  - the reason field on separation-of-duties refusals;
  - photo view for approvers.
- The approvals page and the work center keep compiling on the old snapshot until plan 2 replaces the page.

**Tech Stack:** Next.js 16 route handlers, Prisma 7 (SQL Server), next-intl messages, `node --test` via `npm test` (`scripts/run-tests.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-04-page-group-6-disposal-approvals-design.md`. This plan covers §16 row 1. The sections it implements are §5 (photos, Bangkok days, words), §6, §7.2–7.3 (data only), §7.6, §8.6 (server side), §9.3 (source helper), §9.5, §13 and §14.1 calls 1, 4, 5, 6, 10, 11, 12, 13, 20.

## Global Constraints

- **Language:** Thai first. Messages change only through `node scripts/messages-edit.mjs <change.json>` (format `{ "set": {"th":{},"en":{}}, "delete": [] }`), in both languages. Words follow `docs/19_THAI_GLOSSARY.md`.
- **Disposal status words stay:** รอพิจารณา · อนุมัติแล้ว รอตัดจำหน่าย · ตัดจำหน่ายแล้ว · ไม่อนุมัติ.
- **Photo types:**
  - Disposal photo uploads accept `image/jpeg`, `image/png` and `image/webp`. Any other `image/*` (HEIC, HEIF, GIF, AVIF) is refused on the disposal and disposal-batch upload routes with `DISPOSAL_PHOTO_TYPE`.
  - Non-image types keep the general upload rules.
  - **"Has a photo"** = an active attachment whose `fileType` starts with `image/`, on the request (`module: "disposal"`) or on its batch (`module: "disposal_batch"`).
- **Bangkok days** for inbox age (`bangkokDayDiff`, `startOfBangkokDay` from `src/lib/preventive-maintenance.ts`), never server-local midnight.
- **The inbox ignores `policy.disposalRequired`** everywhere: rows, counts, the oldest item and the item builder. Approval is always required in code.
- **Separation of duties stays as the server applies it:** only its reason is exposed. A refused approve or reject still answers 403 with `code: "DISPOSAL_SOD_CONFLICT"`, and the body gains `reason`, one of `requester`, `creator` or `no_employee`.
- **Old callers keep working:** the PATCH decision still accepts `nextStatusId`, and the bulk-decision route and the `DISPOSAL_SOD_CONFLICT` code stay.
- **No schema change, no migration, no page redesign.** Only the two `formatSource` call sites and the work-center's item hrefs change visibly.
- **Tests:** `npm test` must pass with 0 failures. E2E runs only against `asset_management_dev`; no LDAP sync, no settings save, no delete, no master-data changes.

## Review Focus

1. **The only image is on the batch.** A request created in a batch whose only image is on the batch counts as having a photo. Deleting that batch image while a child still needs it is refused. *(Task 1 tests.)*
2. **An old client sends a stale `nextStatusId`.** The approve still succeeds when the id is Pending Disposal, still refuses another status, and succeeds with no id at all. *(Task 2 tests.)*
3. **Two approvers decide one request at the same moment.** A reject after an approve answers 409 `DISPOSAL_CONCURRENT_UPDATE`; the request is not overwritten and the asset is not restored. *(Task 2 tests.)*
4. **A finding's reporter or a round's creator id has no user row** (a removed account). The row shows the raw id rather than failing or showing blank. *(Task 4 tests.)*
5. **`?item=` is malformed, unknown or stale, or the page number is past the last page.** The parser returns null; the page clamps to the last page; nothing throws. *(Task 4 tests.)*

---

### Task 1: Disposal photos: type rule, has-a-photo read, last-photo guard, approver view

**Files:**
- Create: `src/lib/disposal-photo.ts`
- Modify: `src/app/api/disposal-requests/[id]/attachments/route.ts`, `src/app/api/disposal-batches/[id]/attachments/route.ts`, `src/app/api/attachments/[id]/route.ts` (DELETE), `src/lib/attachment-access.ts`, `src/lib/disposal-api-error-codes.ts`, `src/lib/disposal-error-message.ts`, `src/lib/api-error-catalog.ts`, `messages/th.json`, `messages/en.json` (via the script)
- Test: `tests/disposal-photo.test.ts` (new); extend `tests/disposal-upload-recovery.test.ts` or a new `tests/disposal-photo-routes.test.ts` for route source pins; update `tests/attachment-*.test.ts` if a pin breaks

**Interfaces:**
- Produces (used by plans 2–4 and Task 4):
  - `disposalPhotoMimeTypes: readonly ["image/jpeg", "image/png", "image/webp"]`
  - `disposalPhotoAccept = "image/jpeg,image/png,image/webp"`
  - `disposalEvidenceAccept = "image/jpeg,image/png,image/webp,application/pdf"`
  - `isDisposalPhotoFile(fileType: string | null | undefined): boolean`: true when the type starts with `image/` ("has a photo" counting)
  - `getDisposalUploadTypeError(fileType: string): "DISPOSAL_PHOTO_TYPE" | null`: non-null for `image/*` outside the three
  - `type DisposalPhotoOwner = { id: string; batchId: string | null }`
  - `type DisposalPhotoRef = { id: string; originalName: string; fileType: string; uploadedAt: Date; source: "request" | "batch" }`
  - `listDisposalPhotos(db: DisposalPhotoDb, owners: DisposalPhotoOwner[]): Promise<Map<string, DisposalPhotoRef[]>>`: per request, its own active images by `uploadedAt` asc, then its batch's. Every owner has a key (an empty array when there are none). One `attachment.findMany` per module.
  - `getDisposalLastFileBlock(db: DisposalPhotoDb, attachment: { id: string; module: string; referenceId: string; fileType: string }): Promise<"DISPOSAL_LAST_PHOTO" | null>`
  - `DisposalPhotoDb` = the narrow Prisma shape these use (`attachment.findMany`, `disposalRequest.findFirst/findMany`), so tests pass a fake.
  - New API codes `DISPOSAL_PHOTO_TYPE` and `DISPOSAL_LAST_PHOTO`.

- [ ] **Step 1: Write the failing tests** in `tests/disposal-photo.test.ts`:
  - `isDisposalPhotoFile`: true for `image/jpeg`, `image/heic`, `image/gif`; false for `application/pdf`, `""`, null.
  - `getDisposalUploadTypeError`:
    - null for the three photo types, `application/pdf` and `text/plain`;
    - `"DISPOSAL_PHOTO_TYPE"` for `image/heic`, `image/heif`, `image/gif`, `image/avif`.
  - `listDisposalPhotos` with a fake db holding:
    - request A with one PDF and two images (uploaded 10:00 and 09:00);
    - request B with no own file and batch X holding one image;
    - request C with nothing.

    Assert:
    - A → its two images, the 09:00 one first, `source: "request"`, no PDF;
    - B → `[batch image]` with `source: "batch"`;
    - C → `[]`.
  - `getDisposalLastFileBlock` (fake db). Assert:
    - pending request, deleting its only image → `"DISPOSAL_LAST_PHOTO"`;
    - pending request with two images → null;
    - pending request whose only image is deleted but whose batch has an image → null;
    - approved request, only image → `"DISPOSAL_LAST_PHOTO"`;
    - disposed or rejected request → null;
    - pending request with method `lost`:
      - its only file is a PDF → `"DISPOSAL_LAST_PHOTO"`;
      - it has a PDF and an image, deleting the image → null;
    - deleting a PDF from a non-lost pending request → null;
    - `module: "disposal_batch"`: deleting the batch's only image while a pending child has no own image → `"DISPOSAL_LAST_PHOTO"`; when every child has its own image → null;
    - any other module → null.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/disposal-photo.test.ts`
  Expected: FAIL, "Cannot find module '../src/lib/disposal-photo.ts'".

- [ ] **Step 3: Implement `src/lib/disposal-photo.ts`**
  - `.ts` imports, as the other libs that tests import directly.
  - The block rule applies only when the owning request is active and its `requestStatus` is `pending` or `approved`.
  - **Lost requests** (`disposalType === "lost"`) count every active file, not only images.
  - A batch file counts for every child request, and is "needed" by a child only when that child has no qualifying file of its own.

- [ ] **Step 4: Wire the routes**
  - Both disposal upload routes call `getDisposalUploadTypeError(file.type)` after `validateUploadFile` and answer `disposalApiError("DISPOSAL_PHOTO_TYPE", "Use a JPG, PNG or WEBP photo", 400)`. The batch route currently answers with plain JSON errors; use `disposalApiError` for this one code.
  - `DELETE /api/attachments/[id]`: after `requireAttachmentPermission`, for `module` `disposal` or `disposal_batch`, call `getDisposalLastFileBlock(prisma, existing)` and answer 409 `{ code: "DISPOSAL_LAST_PHOTO", error: "DISPOSAL_LAST_PHOTO" }`.
  - `src/lib/attachment-access.ts` `hasAttachmentPermission`: for `module` `disposal` or `disposal_batch` with `action === "view"`, `hasPermission(user, "disposal", "approve")` also allows. Edit stays `disposal:edit`.
  - Add both codes to `disposalApiErrorCodes`, `localizedDisposalErrorCodes` and `api-error-catalog.ts`. Messages through the script:
    - `apiErrors.disposalPhotoType`: th "ใช้ไฟล์ JPG, PNG หรือ WEBP", en "Use a JPG, PNG or WEBP file";
    - `apiErrors.disposalLastPhoto`: th "ต้องเหลือรูปอย่างน้อย 1 รูป", en "At least one photo must remain";
    - the same pairs under the disposal error namespace that holds `DISPOSAL_INVALID_STAGE` at `messages/th.json:3849` (read `src/lib/disposal-error-message.ts` for which namespace it resolves).
  - Add source pins, in the existing source-reading style:
    - each disposal upload route contains `getDisposalUploadTypeError(`;
    - the DELETE route contains `getDisposalLastFileBlock(`;
    - `attachment-access.ts` grants `"approve"` for view on the disposal modules.

- [ ] **Step 5: Run the tests**

  Run: `node --test tests/disposal-photo.test.ts` and then `npm test`
  Expected: PASS; `npm test` 0 failures.

- [ ] **Step 6: Commit**
  ```bash
  git add src/lib/disposal-photo.ts src/app/api/disposal-requests/[id]/attachments/route.ts src/app/api/disposal-batches/[id]/attachments/route.ts src/app/api/attachments/[id]/route.ts src/lib/attachment-access.ts src/lib/disposal-api-error-codes.ts src/lib/disposal-error-message.ts src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/
  git commit -m "feat(disposal): photo rules: JPG/PNG/WEBP uploads, has-a-photo read with the batch fallback, the last-photo guard and approver photo view (group 6 plan 1)"
  ```

### Task 2: Decisions: separation-of-duties reasons, approve without a status id, guarded reject

**Files:**
- Modify: `src/lib/disposal-policy.ts`, `src/lib/disposal-bulk-approval.ts`, `src/lib/disposal-approval-service.ts`, `src/lib/validations/disposal.ts`, `src/app/api/disposal-requests/[id]/route.ts`, `src/app/api/disposal-requests/bulk-decision/route.ts`, `src/lib/disposal-api-errors.ts`
- Test: `tests/disposal-policy.test.ts`, `tests/disposal-bulk-approval.test.ts`, `tests/disposal-validation.test.ts`, `tests/disposal-route-structure.test.ts`, new `tests/disposal-reject-service.test.ts`

**Interfaces:**
- Produces:
  - `type DisposalSodReason = "requester" | "creator" | "no_employee"`
  - `getDisposalApprovalSodReason(input: Omit<DisposalSegregationInput, "action" | "approverId" | "executedById">): DisposalSodReason | null`, in `disposal-policy.ts`. `getDisposalSegregationError` keeps its English strings and is rewritten on top of it for `approve` and `reject`.
  - `type DisposalApprovalBlock = { code: DisposalBulkApprovalCode; sodReason: DisposalSodReason | null }`
  - `getDisposalApprovalBlock(candidate, actor, segregationRequired): DisposalApprovalBlock | null`, in `disposal-bulk-approval.ts`. `getDisposalBulkApprovalBlockCode` returns `getDisposalApprovalBlock(...)?.code ?? null`.
  - `DisposalBulkApprovalItem` gains `sodReason: DisposalSodReason | null`, filled by the preview.
  - `rejectDisposalRequest(command: { requestId: string; actor: DisposalApprovalActor; segregationRequired: boolean; approvalRemark: string | null | undefined; saleValue?: number | null; salvageValue?: number | null }): Promise<{ request: DisposalRequest }>`, in `disposal-approval-service.ts`. It throws `DisposalApprovalServiceError` with codes `DISPOSAL_REQUEST_NOT_FOUND`, `DISPOSAL_INVALID_STAGE`, `DISPOSAL_SOD_CONFLICT` (with `sodReason`), `DISPOSAL_PREVIOUS_STATUS_MISSING`, `DISPOSAL_PREVIOUS_STATUS_INACTIVE`, `DISPOSAL_ASSET_STATUS_CHANGED` (the restore errors), and `DISPOSAL_CONCURRENT_UPDATE`.
  - `DisposalApprovalServiceError` gains an optional `sodReason`.
  - `disposalApiError(code, error, status, fieldErrors?, extra?: { reason?: DisposalSodReason })` adds `reason` to the body when given.
  - The bulk-decision limit rises to 200 (spec §7.4, user 2026-11-04): the max of `requestIds` in the bulk-decision schema in `src/lib/validations/disposal.ts` (today 50, near `:63`) becomes 200. It becomes a named export `MAX_DISPOSAL_BULK_DECISION_ITEMS = 200`. The client constant `MAX_DISPOSAL_BULK_APPROVAL_ITEMS` in `disposal-bulk-approval.tsx` is left for plan 2, and the bulk-execution limit of 20 is unchanged.

- [ ] **Step 1: Write the failing tests**
  - `disposal-policy.test.ts`, `getDisposalApprovalSodReason`, with segregation required:
    - no `actorEmployeeId` → `"no_employee"`;
    - `actorEmployeeId === requestedById` → `"requester"`;
    - `actorUserId === createdByUserId` (different employee) → `"creator"`;
    - otherwise null;
    - segregation not required → null in all cases.
    - Requester wins over creator when both match.
  - `disposal-bulk-approval.test.ts`: `getDisposalApprovalBlock` returns `{ code: "DISPOSAL_SOD_CONFLICT", sodReason: "requester" }` for the viewer's own request, `{ code: "DISPOSAL_INVALID_STAGE", sodReason: null }` for an approved one, and null for an eligible one. `getDisposalBulkApprovalBlockCode` still returns `"DISPOSAL_SOD_CONFLICT"` for the own request.
  - `disposal-validation.test.ts`: the bulk-decision schema accepts 200 unique uuids and refuses 201.
  - `disposal-validation.test.ts`: `disposalDecisionSchema` parses `{ decision: "approve" }` with no `nextStatusId`, `{ decision: "reject", approvalRemark: "เครื่องยังใช้งานได้ดี" }`, and still `{ decision: "approve", nextStatusId: "x" }`. A reject without a remark still fails on `approvalRemark`.
  - `tests/disposal-reject-service.test.ts`, with a fake transactional db in the style of `tests/disposal-execution-service.test.ts`:
    - (a) pending → rejected: the request row is updated through `updateMany` with `where: { id, isActive: true, requestStatus: "pending" }`; the asset gets `previousAssetStatusId`; a `disposal_reject` movement is written.
    - (b) `updateMany` returns `{ count: 0 }` → throws `DISPOSAL_CONCURRENT_UPDATE`; no asset update; no movement.
    - (c) the request is already `approved` at the read → `DISPOSAL_INVALID_STAGE`.
    - (d) the viewer is the requester → `DISPOSAL_SOD_CONFLICT` with `sodReason: "requester"`.
  - `disposal-route-structure.test.ts`, source pins:
    - the PATCH route no longer contains `tx.disposalRequest.update({` for the reject; it calls `rejectDisposalRequest(`;
    - it resolves the Pending Disposal status with `{ name: "Pending Disposal" }` when `nextStatusId` is absent;
    - SoD answers pass `{ reason:`.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/disposal-policy.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-validation.test.ts tests/disposal-reject-service.test.ts tests/disposal-route-structure.test.ts`
  Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement**
  - **`disposalDecisionSchema`:** `nextStatusId: optionalText`.
  - **PATCH approve:**
    - When `input.nextStatusId` is set, keep today's lookup and target check.
    - Otherwise resolve `prisma.assetStatus.findFirst({ where: { OR: [{ name: "Pending Disposal" }, { nameTh: "รอตัดจำหน่าย" }] } })` as the create route does (`src/app/api/disposal-requests/route.ts:87-90`). Answer `DISPOSAL_PENDING_STATUS_MISSING` when it is absent.
    - The approve service does not use the status id; the check only refuses a wrong explicit target.
  - **PATCH reject:**
    - Replace the inline transaction (`route.ts` reject block) with `rejectDisposalRequest`.
    - The service runs the stage, SoD and restore checks and all writes inside one `$transaction(..., { isolationLevel: "Serializable" })`, and keeps the batch-status re-derive and the audit log.
    - Map its codes to statuses like the approve branch: 409 for concurrent and the restore errors, 403 for SoD, 404 for not found, else 400.
  - **SoD 403 bodies** (approve, reject and the bulk preview item) carry the reason.
  - **`DisposalBulkApprovalProvider`** and other UI need no change in this plan.

- [ ] **Step 4: Run the tests**

  Run: the command from Step 2, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/disposal-policy.ts src/lib/disposal-bulk-approval.ts src/lib/disposal-approval-service.ts src/lib/validations/disposal.ts src/lib/disposal-api-errors.ts src/app/api/disposal-requests tests/
  git commit -m "feat(disposal): separation-of-duties reasons, approve without a status id and a reject guarded against a concurrent decision (group 6 plan 1)"
  ```

### Task 3: Source labels, Bangkok-day aging, glossary rows

**Files:**
- Create: `src/lib/disposal-source.ts`
- Modify: `src/lib/approval-aging.ts`, `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx` (only the `formatSource` call and its function), `src/app/[locale]/(print)/disposal/[id]/print/page.tsx` (the same), `docs/19_THAI_GLOSSARY.md`, `tests/thai-glossary.test.ts`, messages via the script
- Test: `tests/disposal-source.test.ts` (new), `tests/approval-aging.test.ts`

**Interfaces:**
- Produces:
  - `type DisposalSourceLink = { kind: "maintenance" | "audit_finding"; number: string; href: string } | { kind: "other"; text: string; href: null }`
  - `toDisposalSourceLink(locale: string, source: { sourceType: string | null; sourceId: string | null }, numbers: { repairNo?: string | null; auditNo?: string | null }): DisposalSourceLink | null`. It is pure. Its hrefs:
    - maintenance → `/{locale}/maintenance/{sourceId}`;
    - audit_finding → `/{locale}/audit/findings?finding={sourceId}`;
    - a known type with no number found → `{ kind: "other", text: sourceType label key fallback }`, see Step 3.
  - `readDisposalSourceLinks(db, locale, requests: Array<{ id: string; sourceType: string | null; sourceId: string | null }>): Promise<Map<string, DisposalSourceLink | null>>`. It makes one `maintenanceTicket.findMany` (select `id, repairNo`) and one `auditFinding.findMany` (select `id, auditRound.auditNo`).
  - Messages `disposalPage.sourceMaintenance` (th "งานซ่อม {number}", en "Repair {number}") and `disposalPage.sourceAuditFinding` (th "รายการไม่ตรง {number}", en "Discrepancy {number}").
  - `getApprovalAgeStatus(requestedAt, now, slaDays)` returns `{ ageDays, daysOverdue, isOverdue, isDueToday }`. Ages are Bangkok days. `isDueToday` = `ageDays === slaDays`.

- [ ] **Step 1: Write the failing tests**
  - `tests/disposal-source.test.ts`, `toDisposalSourceLink("th", …)`:
    - maintenance with `repairNo: "MT-20261012-0045"` → `{ kind: "maintenance", number: "MT-20261012-0045", href: "/th/maintenance/<id>" }`;
    - audit_finding with `auditNo: "AUD-2026-0003"` → `href: "/th/audit/findings?finding=<id>"`;
    - both null → null;
    - an unknown `sourceType: "manual"` with `sourceId: "abc"` → `{ kind: "other", text: "manual / abc", href: null }`, so today's text is kept;
    - maintenance with no number found → `{ kind: "other", text: "maintenance / <id>", href: null }`.
  - `tests/approval-aging.test.ts`, with `slaDays: 3`:
    - requested `2026-11-01T17:30:00Z` (02 Nov 00:30 Bangkok), now `2026-11-04T16:59:00Z` (04 Nov 23:59 Bangkok) → `ageDays: 2, isOverdue: false, isDueToday: false`;
    - requested `2026-11-01T16:30:00Z` (01 Nov 23:30 Bangkok), same now → `ageDays: 3, isDueToday: true, isOverdue: false`;
    - requested `2026-10-31T16:30:00Z` → `ageDays: 4, daysOverdue: 1, isOverdue: true`.

    The test must pass whatever the machine's `TZ` is: set `process.env.TZ = "UTC"` at the top of the file to prove it.
  - `tests/thai-glossary.test.ts`: a new pin that `messages/th.json` contains no "รอบจำหน่าย" (the glossary word is รอบตัดจำหน่าย).

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/disposal-source.test.ts tests/approval-aging.test.ts tests/thai-glossary.test.ts`
  Expected: FAIL (missing module; `isDueToday` undefined; the glossary pin passes already, which is fine).

- [ ] **Step 3: Implement**
  - **`disposal-source.ts`:** the `other` text keeps today's `[sourceType, sourceId].filter(Boolean).join(" / ")`.
  - **The two pages** replace their local `formatSource` with `readDisposalSourceLinks` for the one request. They render the label `t("sourceMaintenance", { number })` or `t("sourceAuditFinding", { number })` as a link (the detail page) or as text (the print page), and the `other` text as plain text. Delete both local `formatSource` functions.
  - **`approval-aging.ts`:** compute `ageDays = Math.max(0, bangkokDayDiff(requestedAt, now))`. Check the argument order in `src/lib/preventive-maintenance.ts:68`. Remove `startOfDay`. `sortApprovalInboxItemsByAge` is unchanged apart from using it.
  - **`docs/19_THAI_GLOSSARY.md`:** add rows in the table's format:
    - รอบตัดจำหน่าย: a group of approved requests disposed together in one go, with one method, date, buyer or recipient and document; not "รอบจำหน่าย";
    - ราคาขายเหมา: one price for a whole sale round;
    - ส่งออกรายงานส่งบัญชี: the round's Excel for accounting;
    - ครบ SLA วันนี้: an approval whose age equals the SLA.

- [ ] **Step 4: Run the tests**

  Run: the command from Step 2, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/disposal-source.ts src/lib/approval-aging.ts "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" "src/app/[locale]/(print)/disposal/[id]/print/page.tsx" docs/19_THAI_GLOSSARY.md messages tests/
  git commit -m "feat(disposal): the source reads งานซ่อม MT-… / รายการไม่ตรง AUD-… with a link, inbox age in Bangkok days with ครบ SLA วันนี้, glossary rows (group 6 plan 1)"
  ```

### Task 4: The inbox read model

**Files:**
- Modify: `src/lib/approval-inbox.ts`, `src/lib/approval-inbox-query.ts`, `src/app/[locale]/(dashboard)/admin/approvals/page.tsx` (only to pass the copy and keep compiling), `src/app/[locale]/(dashboard)/work-center/page.tsx` (only if the snapshot signature changes), messages via the script
- Test: `tests/approval-inbox.test.ts`, new `tests/approval-inbox-page.test.ts`

**Interfaces:**
- Consumes:
  - `getApprovalAgeStatus` (Task 3);
  - `getDisposalApprovalBlock` and `DisposalSodReason` (Task 2);
  - `listDisposalPhotos` (Task 1);
  - `auditFindingTypeShortLabelKeys` (`src/lib/audit-finding-filters.ts:99`).
- Produces (plan 2 builds the page on these):
  - `type ApprovalInboxItemKey = "disposal" | "finding" | "round"` and `approvalInboxItemHref(locale: string, key: ApprovalInboxItemKey, id: string): string`, returning `/{locale}/admin/approvals?item={key}:{id}`.
  - `parseApprovalInboxItemParam(value: string | string[] | undefined): { key: ApprovalInboxItemKey; id: string } | null`. The id must be a non-empty string of `[A-Za-z0-9-]`, up to 100 characters; anything else returns null.
  - `type ApprovalInboxTab = "all" | "disposal" | "audit"`
  - `type ApprovalInboxQuery = { tab: ApprovalInboxTab; search: string; overdue: boolean; page: number; pageSize: 25 | 50 | 100 }` and `parseApprovalInboxQuery(searchParams: Record<string, string | string[] | undefined>): ApprovalInboxQuery`. It reads `tab`, `search` (trimmed, max 100), `overdue=1`, `page` (≥ 1) and `pageSize` (defaults 25; anything else becomes 25).
  - `type ApprovalInboxRow`, pure data with no hrefs other than `href`:
    - `key: ApprovalInboxItemKey`; `id`; `href`;
    - `kind`: `"disposal_review" | "audit_finding_review" | "audit_round_close"`;
    - `subtype`: `{ kind: "method"; disposalType: string } | { kind: "finding"; findingType: string } | { kind: "close" }`;
    - `title` (asset name, or the round name); `codes` (e.g. `"GRL-PRN-24-0008 · DP-20261011-0041"`); `searchText`;
    - `requesterName`; `isOwn: boolean`; `requestedAt: Date`;
    - `age: ApprovalAgeStatus`;
    - `block: DisposalApprovalBlock | null` (disposal only);
    - `photoCount: number | null` (disposal only; null for the other kinds);
    - `tickable: boolean`: false for close rows and for blocked rows.
  - `type ApprovalInboxPage`, with these fields:
    - `access`, `policy`;
    - `strip: { overdue: { total; disposal; audit }; oldest: { key; id; title; ageDays; requestedAt } | null; total: { total; overdue; within } }`, which is unfiltered;
    - `tabs: { all; disposal; audit; findings; rounds }`, which follows the search and the overdue filter;
    - `rows: ApprovalInboxRow[]`, the current page;
    - `filteredTotal`, `page` (clamped), `pageSize`.
  - `buildApprovalInboxPage(source: ApprovalInboxPageSource, query: ApprovalInboxQuery, now: Date): Omit<ApprovalInboxPage, "access" | "policy">`, pure. `ApprovalInboxPageSource` = every pending row already loaded: `rows: ApprovalInboxRow[]`, unsorted and before photo counts.
  - `getApprovalInboxPage(user: SessionUser, locale: string, query: ApprovalInboxQuery, now?: Date): Promise<ApprovalInboxPage>`, in the query file. It:
    - loads **every** pending row of the three sources the user may see, with no `take` and no `disposalRequired` gate;
    - resolves audit user ids to `User.displayName` with one `user.findMany`, falling back to the raw id;
    - computes `block` per disposal row (actor `{ userId, employeeId }`, the policy's `segregationRequired`);
    - calls `buildApprovalInboxPage`;
    - fills `photoCount` for the visible disposal rows only, from `listDisposalPhotos(...).get(id)?.length ?? 0`. It reads `batchId` only when `isDisposalBatchSchemaReady()`, else null.
  - `buildApprovalInboxItems` and `getApprovalInboxSnapshot` stay for the work center and today's page. They change in three ways:
    - their `href`s use `approvalInboxItemHref`;
    - their copy comes from a `copy: ApprovalInboxCopy` argument, built by the caller with `getTranslations({ locale, namespace: "approvalInboxPage" })`, instead of the hard-coded `approvalInboxCopy`;
    - the `disposalRequired` gate is gone from the builder, the snapshot, `countApprovalInbox` and `getApprovalInboxOldest`.

- [ ] **Step 1: Write the failing tests**
  - **`tests/approval-inbox-page.test.ts`** (pure, `buildApprovalInboxPage`), using rows built by a local `row(…)` helper. Fix now = `2026-11-04T05:00:00Z` and SLA 3.
    - **Order and paging:**
      - rows overdue first, then oldest;
      - 30 rows with `pageSize: 25`, `page: 2` → 5 rows, `filteredTotal: 30`, `page: 2`;
      - `page: 9` → clamped to 2.
    - **Search:** `"ThinkPad"` matches a disposal row by title, `"AUD-2026-0003"` matches a finding by code, and the match ignores case and surrounding spaces.
    - **Tabs:**
      - with `tab: "audit"`, rows hold findings and rounds only;
      - the `tabs` counts follow `search` and `overdue`;
      - the `strip` counts do not: assert a search that hides everything leaves `strip.total.total` unchanged.
    - **Strip numbers:** `strip.total.overdue + strip.total.within === strip.total.total`; `strip.oldest` is the oldest row by `requestedAt`; `overdue: true` keeps only `age.isOverdue` rows.
    - **The viewer's own disposal row:** `isOwn: true` with `block.sodReason: "requester"` stays in the rows and counts, with `tickable: false`.
    - **Round rows** are always `tickable: false`.
  - **`tests/approval-inbox-page.test.ts`**, also for `parseApprovalInboxItemParam`:
    - `"disposal:3f2a-…"` → `{ key: "disposal", id }`;
    - `"finding:x"` → ok;
    - `"round:"`, `"bad:1"`, `"disposal:../etc"`, `["disposal:a","x"]` and `undefined` → null.
  - **`tests/approval-inbox-page.test.ts`**, also for `parseApprovalInboxQuery`: `pageSize: "40"` → 25; `page: "-2"` → 1; a `search` over 100 characters is cut to 100.
  - **`tests/approval-inbox.test.ts`:**
    - hrefs become `/th/admin/approvals?item=disposal:disposal-1`, `…?item=finding:finding-1` and `…?item=round:round-1`;
    - items are built with a passed copy object;
    - with `policy.disposalRequired: false`, disposal items are still built.
  - **Source pins:**
    - `approval-inbox-query.ts` contains no `disposalRequired` and no `take: 50`;
    - `approval-inbox.ts` contains no `function approvalInboxCopy`;
    - `getApprovalInboxPage` reads `displayName`.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/approval-inbox-page.test.ts tests/approval-inbox.test.ts`
  Expected: FAIL (missing exports; old hrefs).

- [ ] **Step 3: Implement**
  - **Search text:** for a disposal row, asset name, tag and `disposalNo`; for a finding, asset name, tag, `auditNo` and the Thai finding-type label; for a round, the round name and `auditNo`. Lowercased once.
  - **Finding rows** need the asset `name`: add it to the include.
  - **Round "requested at"** stays `updatedAt` (the spec takes it as approximate).
  - **The copy moves into `approvalInboxPage` messages**, Thai copied from today's `approvalInboxCopy` with these changes:
    - `kindDisposal`: "ตัดจำหน่าย";
    - `kindAudit`: "ตรวจนับ";
    - `actionDisposal`: "พิจารณาตัดจำหน่าย";
    - `actionFinding`: "พิจารณารายการไม่ตรง";
    - `actionRound`: "เปิดรอบตรวจนับ";
    - `roundReady`: "รอบตรวจนับพร้อมปิด ไม่มีรายการค้าง";
    - `findingReview`: "รายการไม่ตรงรอพิจารณา";
    - `disposalReady`: "คำขอตัดจำหน่าย {assetName} รอพิจารณา".
  - **`policyTitle`:** change it from "นโยบายที่ใช้กับ Inbox นี้" to "นโยบายที่ใช้กับงานรออนุมัติ" (no "Inbox" in Thai).
  - **The two callers** (`admin/approvals/page.tsx`, `work-center/page.tsx`) pass the translated copy.
  - **The approvals page** keeps today's look. Remove only its `disposalPolicyOn` use of `disposalRequired`, so disposal items show. Plan 2 replaces the page.

- [ ] **Step 4: Run the tests**

  Run: the command from Step 2, then `npm test`
  Expected: PASS; 0 failures. Fix any other pin that read the old hrefs, for example `tests/waiting-work-links.test.ts` or `notification-center.test.ts`, in this task.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/approval-inbox.ts src/lib/approval-inbox-query.ts "src/app/[locale]/(dashboard)/admin/approvals/page.tsx" "src/app/[locale]/(dashboard)/work-center/page.tsx" messages tests/
  git commit -m "feat(approvals): the inbox read model: every pending item, Bangkok ages, search, overdue filter, paging, names, block reasons, photo counts and ?item= links (group 6 plan 1)"
  ```

### Task 5 (controller): E2E checkpoint and docs

- [ ] **Step 1: Targeted E2E on the dev DB, four projects.** Do the probe, keep-awake and build as in the earlier plans, then run `npx playwright test e2e/disposal e2e/dashboard e2e/cross-cutting e2e/work-center --reporter=line` (drop any folder that does not exist).
  Expected: 0 failed. The inbox look does not change in this plan; a failure on approvals hrefs or SoD bodies is fixed in the owning task's files.
- [ ] **Step 2: Docs.** Record the plan in:
  - `docs/06_WORKFLOWS.md`: approve without a status id, the guarded reject, the SoD reasons, the photo rules;
  - `docs/99_CHANGELOG.md`;
  - `DEVELOPER_HANDOFF.md`.

  Commit them as `docs(disposal): group 6 plan 1 …`.
