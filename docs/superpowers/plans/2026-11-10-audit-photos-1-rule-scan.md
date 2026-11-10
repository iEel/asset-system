# รูปกับการตรวจนับ แผน 1: กฎรูปของรอบ การจดรอบตอนอัปโหลด และรูปบนหน้าตรวจนับ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Photos taken on the scan page record the round they were taken in. The scan page shows each asset's photo
(own → model → empty), including components. A pure rule says which round any photo belongs to.

**Architecture:**
- One pure rules file for the round rule and the `photoEvidence` link format.
- The upload route and the scan route write the link.
- One server-safe reader picks the scan page's photo, asset first, in chunks.
- The scan loaders and the lookup route carry a `photo` field.
- One small client component draws it.
- Plan 2 adds the loader that applies the round rule to the files tab, the round page and the history.

**Tech Stack:** Next.js 16 (App Router; read `node_modules/next/dist/docs/` before writing code), next-intl, Prisma 7 on
SQL Server, `node --test` via `npm test`, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-11-10-audit-photos-design.md` (§2, §3; §1 anti-goals).

## Global Constraints

- **Photo order on the scan page:** the asset's own newest photo, else the model's newest photo with the label
  "รูปประจำรุ่น", else the empty frame "ยังไม่มีรูป".
- **Which files count as photos:** the thumbnail route's image types only (`isThumbnailable` in
  `src/lib/attachment-thumbnail.ts`: jpeg, png, webp, gif, avif). Never `startsWith("image/")`, because a HEIC would
  draw a broken image.
- **Round rule:**
  - The link wins.
  - Otherwise a scan of the same asset in the round, at or before the upload and less than 30 minutes before it.
  - The latest matching scan wins.
  - Cancelled rounds count.
  - The window is one constant: `AUDIT_PHOTO_WINDOW_MINUTES = 30`.
- **The link (`audit_items.photoEvidence`, NVARCHAR(500)):**
  - It is a JSON array of attachment ids, at most 12 ids, and never over 500 characters.
  - A photo past the cap is not linked and falls back to the time rule.
  - A link is refused for an item of a cancelled round.
- **SQL Server's 2,100-parameter limit:**
  - No `in:` list may carry more than 2,000 ids. Chunk at 2,000, as `audit-round-page-data.ts` does, or filter
    through a relation.
  - A round can hold every active asset (1,781 on Production).
- **Permissions:**
  - Send an asset photo only when `hasAttachmentPermission(user, "asset", "view")`.
  - Send a model photo only when `hasAttachmentPermission(user, "asset_model", "view")`.
  - Both come from `src/lib/attachment-access.ts`.
  - Otherwise send `photo: null` and draw no frame.
  - The thumbnail route does not change.
- **Messages:** new words go through `node scripts/messages-edit.mjs`, for th and en. Reuse these keys:
  - `asset.modelPhoto` ("รูปประจำรุ่น")
  - `asset.photoFrame.emptyTitle` ("ยังไม่มีรูป")
- **Keep every existing feature** of the scan page: search, room list, check form, components panel, offline queue,
  photo retry.
- **No migration.** E2E runs on the dev DB with run-marked data only.

## Review Focus

1. **A round of 1,781 items on the first load:** the photo reads must chunk. The test `readAuditScanPhotos chunks the
   own-photo read at 2,000 ids` is in Task 3.
2. **A photo upload whose item id is wrong** (another asset's item, a cancelled round, a missing item): the photo
   still saves and only the link is skipped. Photos are never lost to a bad link. The test is in Task 2.
3. **The 13th photo on one item:** not linked, and the column never goes over 500 characters. The test is in Task 1.
4. **A viewer without `asset:view` on the scan page:** no photo field and no broken image. The test is in Task 3.
5. **The offline queue sent later:** its photos are linked to the item the `/scan` response returns, not to an id saved
   before going offline. The pin is in Task 2.

---

### Task 1: The round rule and the link format (pure)

**Files:**
- Create: `src/lib/audit-round-photos-rules.ts`
- Test: `tests/audit-round-photos-rules.test.ts`

**Interfaces:**
- Produces:
  - `AUDIT_PHOTO_WINDOW_MINUTES = 30`
  - `AUDIT_PHOTO_EVIDENCE_MAX_IDS = 12`
  - `parsePhotoEvidence(value: string | null | undefined): string[]`
    - Returns `[]` for null, empty, non-JSON, or a non-array.
    - Keeps string entries only.
  - `appendPhotoEvidence(value: string | null | undefined, attachmentIds: readonly string[]): { value: string | null; linked: string[] }`
    - Dedupes.
    - Appends up to the cap and the 500-character limit.
    - `value` is the new JSON, or the old value when nothing was added.
  - `type AuditPhotoInput = { id: string; assetId: string; uploadedAt: Date }`
  - `type AuditPhotoLinkInput = { auditRoundId: string; assetId: string; photoEvidence: string | null }`
  - `type AuditPhotoScanInput = { auditRoundId: string; assetId: string; scannedAt: Date }`
  - `assignAuditRoundPhotos(input: { photos: readonly AuditPhotoInput[]; links: readonly AuditPhotoLinkInput[]; scans: readonly AuditPhotoScanInput[] }): Map<string, string>`
    - Maps photo id to round id.
    - A photo with no round is absent.
    - A link counts only when its `assetId` equals the photo's.

- [ ] **Step 1: Write the failing tests** in `tests/audit-round-photos-rules.test.ts` (node:test, `assert/strict`, as
  `tests/asset-photo-preview.test.ts`):
  - `parsePhotoEvidence reads a JSON array of ids and nothing else`:
    - `'["a","b"]'` → `["a","b"]`
    - `null`, `""`, `"x"` and `'{"a":1}'` → `[]`
    - `'["a",3]'` → `["a"]`
  - `appendPhotoEvidence adds new ids once, up to 12, never past 500 characters`:
    - from null with `["a"]` → value `'["a"]'`, linked `["a"]`
    - appending `["a","b"]` to `'["a"]'` → `'["a","b"]'`, linked `["b"]`
    - 12 uuids then a 13th → linked `[]` and the value unchanged
    - 12 uuids give a value of 12×36 + 12×2 + 11 + 2 = 469 characters, which must be ≤ 500
  - `assignAuditRoundPhotos: the link wins over the time rule`:
    - The photo is linked by round R1's item.
    - A scan in R2 lies 1 minute before the upload.
    - Result: R1.
  - `assignAuditRoundPhotos: the time window is [scan, scan + 30 min)`:
    - Uploads at +0 s and +29 min 59 s map.
    - Uploads at +30 min and −1 s do not.
  - `assignAuditRoundPhotos: the latest matching scan wins`: scans in R1 at −20 min and in R2 at −5 min → R2.
  - `assignAuditRoundPhotos: another asset's scan or link never assigns`: the same times but a different assetId → absent.

- [ ] **Step 2: Run them to see them fail.** Run `npx tsx --test tests/audit-round-photos-rules.test.ts`. Expected:
  FAIL, the module cannot be found.

- [ ] **Step 3: Implement** `src/lib/audit-round-photos-rules.ts` with no runtime imports (server- and client-safe, as
  `asset-photo-preview.ts`). Index links and scans by assetId once; do not use nested loops over all photos × all
  scans.

- [ ] **Step 4: Run them to see them pass.** Same command. Expected: PASS.

- [ ] **Step 5: Commit.** Message: `feat(audit-photos): the round rule and the photoEvidence link format (plan 1 task 1)`.

### Task 2: Write the link on upload and on an out-of-scope find

**Files:**
- Modify: `src/app/api/assets/[id]/attachments/route.ts`:
  - optional form field `auditItemId`;
  - the link in a transaction after the attachment is created;
  - the response adds `auditLinked: boolean`.
- Modify: `src/app/api/audit-rounds/[id]/scan/route.ts`:
  - L146-186: the out-of-scope create writes `photoEvidence`;
  - around L305-311: the re-scan of a recorded find appends its `evidenceAttachmentIds`.
- Modify: `src/components/audit/audit-scan-workspace.tsx`:
  - `uploadPhotoFile(assetId, file, label, auditItemId?: string)`;
  - `uploadPhotos(...)`, the photo retry and `sendQueue` pass the item id.
- Test: `tests/audit-photo-link-route.test.ts` (source pins in the style of `tests/audit-scan-check-ui.test.ts`).

**Interfaces:**
- Consumes: `appendPhotoEvidence`, `AUDIT_PHOTO_EVIDENCE_MAX_IDS` (Task 1).
- Produces:
  - POST `/api/assets/[id]/attachments` accepts `auditItemId`, and its JSON adds `auditLinked`.
  - `photoRetry` state gains `auditItemId: string | null`.

- [ ] **Step 1: Write the failing pins** in `tests/audit-photo-link-route.test.ts`:
  - `the upload links a photo to its audit item only for the same asset and a round that is not cancelled`:
    - the route source reads `formData.get("auditItemId")`;
    - it finds the item with `assetId: asset.id`;
    - it checks `auditRound: { isActive: true` and a status other than `"cancelled"`;
    - it calls `appendPhotoEvidence(`.
  - `a refused link never refuses the photo`:
    - the `auditLinked: false` path returns 201 with the attachment;
    - no `return NextResponse.json({ error` sits between the `auditItemId` read and `prisma.attachment.create`.
  - `an out-of-scope find writes its evidence ids into the new item's photoEvidence`:
    - the scan route's `tx.auditItem.create` data contains `photoEvidence: appendPhotoEvidence(null, evidenceAttachmentIds).value`;
    - the recorded-find path calls `appendPhotoEvidence(` with the existing item's `photoEvidence`.
  - `the scan page links each photo to the item the /scan response returned`:
    - the workspace calls `uploadPhotos(row.assetId, submission.photos, result.item.id)`;
    - `sendQueue` passes the item id from its own `/scan` response, not from the queued payload;
    - the retry keeps `auditItemId`.

- [ ] **Step 2: Run them to see them fail.** Run `npx tsx --test tests/audit-photo-link-route.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **Upload route:**
    - After the attachment is created, when `auditItemId` is a non-empty string, run `prisma.$transaction` with
      `isolationLevel: Serializable`. It reads the item (`id, assetId, photoEvidence`, `auditRound.status`,
      `auditRound.isActive`) and updates `photoEvidence` when allowed.
    - Any refusal or error in that step logs nothing new, leaves the attachment in place, and answers
      `auditLinked: false`.
    - A link counts only when `appendPhotoEvidence` returns the new id in `linked`.
  - **Scan route:** the out-of-scope create and the recorded-find re-scan as pinned.
  - **Workspace:** the id comes from `result.item.id` of the `/scan` response, in both the online submit and
    `sendQueue`.

- [ ] **Step 4: Run them to see them pass.** Same command, then `npm test`. Expected: the new pins PASS and the whole
  suite stays green.

- [ ] **Step 5: Commit.** Message: `feat(audit-photos): scan photos record their round in photoEvidence (plan 1 task 2)`.

### Task 3: The scan page's photo, asset first, chunked and by permission

**Files:**
- Create: `src/lib/audit-scan-photos.ts`
- Modify: `src/lib/attachment-thumbnail.ts` (export `THUMBNAILABLE_IMAGE_TYPES`; `isThumbnailable` unchanged in behaviour)
- Test: `tests/audit-scan-photos.test.ts` (and `tests/attachment-thumbnail.test.ts` stays green)

**Interfaces:**
- Produces:
  - `type AuditScanPhoto = { attachmentId: string; fromModel: boolean }`
  - `type AuditScanPhotoAccess = { assetPhotos: boolean; modelPhotos: boolean }`
  - `auditScanPhotoAccess(user: { permissions: ... }): AuditScanPhotoAccess`
    - It uses `hasAttachmentPermission(user, "asset", "view")` and `hasAttachmentPermission(user, "asset_model", "view")`.
    - The type is whatever `hasAttachmentPermission` takes.
  - `chooseAuditScanPhoto(own: string | null | undefined, model: string | null | undefined, access: AuditScanPhotoAccess): AuditScanPhoto | null`
    - The own photo when `assetPhotos`.
    - Else the model photo when `modelPhotos`.
    - Else null.
  - `readAuditScanPhotos(db: AssetPhotoPreviewDb, assets: readonly { id: string; modelId: string | null }[], access: AuditScanPhotoAccess): Promise<Map<string, AuditScanPhoto>>`
    - It reuses the `AssetPhotoPreviewDb` type from `src/lib/asset-photo-preview.ts`.

- [ ] **Step 1: Write the failing tests** (a fake db as in `tests/asset-photo-preview.test.ts`):
  - `chooseAuditScanPhoto: the asset's own photo wins, the model's is the fallback, marked fromModel`.
  - `chooseAuditScanPhoto: without asset:view the own photo is skipped; without either view there is no photo`.
  - `readAuditScanPhotos reads only the thumbnail route's image types, newest first`:
    - the `where` has `fileType: { in: [...] }` with exactly the five types;
    - `orderBy` is `uploadedAt desc`.
  - `readAuditScanPhotos reads the model photo only for assets without their own photo`.
  - `readAuditScanPhotos chunks the own-photo read at 2,000 ids`:
    - 4,100 assets give three `findMany` calls for `module: "asset"`, with 2,000, 2,000 and 100 ids.
  - `readAuditScanPhotos makes no read for photos the viewer may not see`:
    - `assetPhotos: false` → no `module: "asset"` call;
    - both false → no call at all.

- [ ] **Step 2: Run them to see them fail.** Run `npx tsx --test tests/audit-scan-photos.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** `src/lib/audit-scan-photos.ts`.
  - Export the five image types from `src/lib/attachment-thumbnail.ts` as `THUMBNAILABLE_IMAGE_TYPES`. Keep
    `isThumbnailable` working on top of it.
  - Model ids are at most a few hundred, but chunk them the same way.
  - Do not change `readAssetPhotoPreviews` or its model-first order. The pickers keep it.

- [ ] **Step 4: Run them to see them pass.** Same command. Expected: PASS.

- [ ] **Step 5: Commit.** Message: `feat(audit-photos): the scan page's photo reader, asset first (plan 1 task 3)`.

### Task 4: Carry `photo` to the scan page (rows, poll, lookup, components)

**Files:**
- Modify:
  - `src/lib/audit-scan-session.ts`: `AuditScanItemRow.photo`
  - `src/lib/audit-scan-rows.ts`: `toAuditScanItemRow` takes `photos`
  - `src/lib/audit-scan-data.ts`: select `asset.modelId`; `loadAuditScanRows(roundId, { since?, photoAccess })`
- Modify the callers:
  - `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx`
  - `src/app/api/audit-rounds/[id]/scan-status/route.ts`
- Modify: `src/app/api/audit-rounds/[id]/scan-lookup/route.ts`. Select `modelId` on the asset, on each
  `componentAsset` and on each `parentAsset`. Fill `photo` on the asset, on each component and on each installed-in
  parent with one `readAuditScanPhotos` call.
- Modify: `src/components/audit/audit-scan-types.ts`. Add `photo: AuditScanPhoto | null` to:
  - `AuditScanComponent`
  - `AuditInstalledInParent`
  - `AuditLookupAsset`
  - `AuditLookupComponent`
- Modify: `src/components/audit/audit-scan-helpers.ts`. These carry `photo` through:
  - `normalizeAuditLookupComponents`
  - `normalizeAuditLookupInstalledIn`
  - `auditScanRowFromRecordedFind`, which takes the lookup asset's `photo`
- Test: extend `tests/audit-scan-context.test.ts`, or the existing test file of the rows mapper, with pure tests of the
  mappers.

**Interfaces:**
- Consumes: `readAuditScanPhotos`, `auditScanPhotoAccess`, `AuditScanPhoto` (Task 3).
- Produces: every scan-page row, lookup asset, component and installed-in parent has
  `photo: AuditScanPhoto | null`.

- [ ] **Step 1: Write the failing tests:**
  - `toAuditScanItemRow sets photo from the photos map, null when absent`.
  - `normalizeAuditLookupComponents and normalizeAuditLookupInstalledIn keep photo`.
  - `auditScanRowFromRecordedFind takes the lookup asset's photo`.
  - A source pin: `loadAuditScanRows` and the lookup route call `readAuditScanPhotos` once each, never inside a
    `.map(`.

- [ ] **Step 2: Run them to see them fail.** Run `npx tsx --test` on those files. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **The poll:** with `since`, the poll reads photos only for the changed rows, because the photos are read for the
    `records` it already has.
  - **The page and the route:** they build `photoAccess` from the session user with `auditScanPhotoAccess`.

- [ ] **Step 4: Run them to see them pass.** Run `npm test` and `npx tsc --noEmit`. Expected: green, no type errors.

- [ ] **Step 5: Commit.** Message: `feat(audit-photos): scan rows, the poll and the lookup carry the asset's photo (plan 1 task 4)`.

### Task 5: Draw the photo on the scan page, then E2E

**Files:**
- Create: `src/components/audit/audit-scan-photo.tsx`, which exports two components.
  - `AuditScanPhotoCard({ photo, alt }: { photo: AuditScanPhoto | null; alt: string })`
    - Card size.
    - It uses `AssetPhotoFrame` with `canUpload={false}`.
    - With `fromModel` it overlays a chip with `t("asset.modelPhoto")`.
    - With `photo === null` it renders nothing.
  - `AuditScanPhotoThumb({ photo, alt, emptyFrame }: { photo: AuditScanPhoto | null; alt: string; emptyFrame: boolean })`
    - A 48 px square that shows the thumbnail route's small size (`thumbnailUrl(id)`, 96 px).
    - `loading="lazy"`, `decoding="async"`, and a fixed width and height so rows do not jump.
    - An error falls back to the neutral square.
    - With `photo === null` and `emptyFrame` it renders the neutral square; with `photo === null` and no
      `emptyFrame` it renders nothing.
- Modify these files.
  - `audit-scan-check-form.tsx`: card at the top, for both target kinds.
  - `audit-scan-lookup-card.tsx`: the out-of-scope asset's card. Candidates get no photo (spec §3).
  - `audit-scan-room-list.tsx` and `audit-scan-search.tsx`: thumb at the row's start. When the row's photo is from the
    model, the meta line adds the text `t("asset.modelPhoto")`.
  - `audit-scan-panels.tsx` (`AuditComponentPanel`): a thumb on each component row.
  - The installed-in line: the parent's thumb.
- Pass `emptyFrame` as `access.assetPhotos || access.modelPhotos`, so a viewer who can see photos gets aligned rows,
  and a viewer who cannot gets no frames. Send this one boolean to the page as `canSeePhotos`.
- Test: `tests/audit-scan-photo-ui.test.ts` (source pins).
- E2E:
  - Create: `e2e/audit/scan-photos.spec.ts`
  - Create: `e2e/audit/scan-photos-words.ts`
  - Pin it in `tests/e2e-audit-rounds.test.ts`, in the same style as the other audit specs.

**Interfaces:**
- Consumes: `photo` on every scan-page shape (Task 4).

- [ ] **Step 1: Write the failing pins** in `tests/audit-scan-photo-ui.test.ts`:
  - `the check form and the out-of-scope card show the card photo`;
  - `room rows, search rows and component rows show the lazy thumb`: `loading="lazy"`, plus a width and a height;
  - `a model photo is named รูปประจำรุ่น, on the card as a chip and on rows in the meta line`;
  - `no frame is drawn for a viewer who may not see photos`: the `canSeePhotos` flow.

- [ ] **Step 2: Run them to see them fail.** Run `npx tsx --test tests/audit-scan-photo-ui.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement the components and their placement.**
  - Use the design tokens and shared components only.
  - Phone: the card sits at the top of the sheet. Desktop: it sits at the top of the side panel.

- [ ] **Step 4: Write the E2E** in `e2e/audit/scan-photos.spec.ts`. It is modelled on `e2e/audit/walk-search.spec.ts`
  (its own room, run assets via `createAssets`, its own round via POST `/api/audit-rounds`, cancelled in `finally` by
  the IT head). It runs as IT staff on all four projects.
  - **Data:**
    - Run asset A gets its own PNG, uploaded through POST `/api/assets/{id}/attachments`.
    - Run asset B has a run model with a model photo, uploaded through POST `/api/models/{id}/attachments` by a user
      with `brand:edit`, on a run-marked model only. B has no photo of its own.
    - Run asset C has neither.
    - Run asset D is a parent with run component E installed, through the existing component API the register specs
      use.
  - **Test 1: the room list shows A's thumb, B's thumb with รูปประจำรุ่น in its meta line, and C's neutral square.**
  - **Test 2: the check form shows A's card without the chip and B's card with the chip, and C shows no card.**
  - **Test 3: D's check form lists E with E's thumb.**
  - **Test 4: a photo taken in A's check form uploads with the item id.**
    - Wait for the upload response and expect `auditLinked: true`.
    - This is the only check of the link in this plan. Plan 2 shows the link on the files tab.
  - Pages pass axe and `measure` as the other audit specs do.
  - No DELETE requests, and no shared master data: the model, the room and the assets are the run's own.

- [ ] **Step 5: Build, then run the E2E and the unit tests.**
  - Run `npm test`.
  - Run `(npx next build || npx next build)`.
  - Run `npx playwright test e2e/audit/scan-photos.spec.ts`.
  - Expected: all green on desktop and phone, light and dark.

- [ ] **Step 6: Look step.**
  - Serve the build on port 3300.
  - Screenshot the scan page of a dev round at 1440 light and dark, 1024, and 390 light and dark, with non-GET `/api`
    requests aborted.
  - Check the room rows, the check form card, the model chip and a parent's components.
  - Fix layout issues in one batch.

- [ ] **Step 7: Commit.** Message: `feat(audit-photos): the scan page shows the asset's photo, the model's as the fallback (plan 1 task 5)`.
