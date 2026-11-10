# รูปกับการตรวจนับ แผน 2: แท็บไฟล์กรองตามรอบ หน้ารอบกด "มี" ดูรูป และ "ดูรูป" จากประวัติ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every place that talks about a round's photos uses plan 1's rule:
- the files tab marks and filters photos by round;
- the round page's "มี" opens that item's photos, and its count follows the same rule;
- the history's audit rows link to them.

**Architecture:**
- One loader applies plan 1's `assignAuditRoundPhotos` to the assets it is given, in chunks.
- The files tab, the round page and the history each call the loader once.
- The round page's photo dialog reads through one GET route, when the person opens it.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before writing code), next-intl, Prisma 7 on SQL Server,
`node --test` via `npm test`, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-11-10-audit-photos-design.md` (§2, §4, §5, §6). Depends on plan 1
(`docs/superpowers/plans/2026-11-10-audit-photos-1-rule-scan.md`), merged on the same branch first.

## Global Constraints

- **One rule:** plan 1's `assignAuditRoundPhotos`, through this plan's loader only. No caller computes a round's photos
  any other way.
- **Photos:** `attachments` with module `asset`, active, and a type from `THUMBNAILABLE_IMAGE_TYPES` (plan 1 Task 3).
- **SQL Server's 2,100-parameter limit:** every `in:` list is chunked at 2,000 ids, using the existing
  `chunkAuditIds`.
- **Files tab (user, option ข):**
  - It stays one "รูปถ่าย" list. The primary chip, the checklist order, the "show all" fold, uploads, deletes, the
    missing-checklist hints and the evidence groups stay unchanged.
  - Each round photo gets a round chip on its tile.
  - Filter chips sit above the tiles, in this order:
    - "ทั้งหมด n", selected by default;
    - one chip per round, the latest first;
    - "ไม่ได้มาจากการตรวจนับ n".
  - The selection lives in the URL `photoRound`, with `none` for the last chip. An unknown value falls back to
    "ทั้งหมด".
  - **A selected round's line** shows four facts:
    - the round number, linked with `audit:view`;
    - the scan date;
    - the result in words;
    - who scanned.
  - A cancelled round adds "ยกเลิกแล้ว".
- **Links to the files tab:** `/${locale}/assets/${assetId}?view=files&photoRound=${auditNo}`, the detail page's
  existing `view` param.
- **Round page:**
  - "มี" becomes a button that opens a dialog. The dialog loads on open.
  - The evidence line's "มีรูป" count and the column use the same rule.
- **History:** "ดูรูป" shows only when that round has photos for the asset. It needs `asset:view` only, and it stays
  when the round link is dropped for lack of `audit:view`.
- **Messages** go through `node scripts/messages-edit.mjs`, th and en, glossary words only.
  - New words: "ดูรูป", "ไม่ได้มาจากการตรวจนับ", "ยกเลิกแล้ว", the dialog title "รูปของ {assetTag} ในรอบ {auditNo}",
    and "ทั้งหมด" if no shared key fits.
- **Keep every existing feature;** the final review compares old vs new item by item. No migration.

## Review Focus

1. **A round photo that is also the primary photo:** both chips show on one tile, and the primary stays first in
   "ทั้งหมด". The test is in Task 2.
2. **`?photoRound=` naming a round the asset has no photo in, or junk:** "ทั้งหมด" is selected and nothing breaks.
   The test is in Task 2.
3. **The round page of a 1,781-item round:** the photo count reads in chunks and the page loads no image. The pin is in
   Task 3.
4. **The dialog for an item whose photos were deleted after the page loaded:** an empty state, not an error. The test
   is in Task 3.
5. **A viewer with `asset:view` but no `audit:view`:**
   - in history, "ดูรูป" shows but the round link does not;
   - on the files tab, the round number is plain text.

   The test is in Task 4.

---

### Task 1: The loader of round photos

**Files:**
- Create: `src/lib/audit-round-photos-data.ts`
- Test: `tests/audit-round-photos-data.test.ts`, with a fake db as in `tests/asset-photo-preview.test.ts`

**Interfaces:**
- Consumes: `assignAuditRoundPhotos`, `AUDIT_PHOTO_WINDOW_MINUTES` (plan 1 Task 1), `THUMBNAILABLE_IMAGE_TYPES` (plan 1
  Task 3), `chunkAuditIds` (existing).
- Produces:
  - `type AuditRoundPhotoDb = { attachment: { findMany(args: object): Promise<unknown[]> }; auditItem: { findMany(args: object): Promise<unknown[]> }; auditScanHistory: { findMany(args: object): Promise<unknown[]> } }`
  - `type AuditRoundPhoto = { id: string; assetId: string; originalName: string; uploadedAt: Date; auditRoundId: string | null }`
  - `loadAuditRoundPhotos(db: AuditRoundPhotoDb, assetIds: readonly string[], options?: { uploadedFrom?: Date }): Promise<AuditRoundPhoto[]>`
    - Every photo of those assets, newest first, each with its round (null when it has none).
    - The reads, in order:
      - photos, filtered by `uploadedFrom` when it is given;
      - the assets' items that have a `photoEvidence`, with `auditRoundId`, `assetId` and `photoEvidence`;
      - their scans, `scannedAt >= (uploadedFrom ?? the oldest photo) − AUDIT_PHOTO_WINDOW_MINUTES`.
    - Each read is chunked.

- [ ] **Step 1: Write the failing tests:**
  - `loadAuditRoundPhotos maps a linked photo and a timed photo, and leaves an unmatched photo with no round`.
  - `loadAuditRoundPhotos reads only the thumbnail types of module asset, active`.
  - `loadAuditRoundPhotos chunks every id list at 2,000`: 2,500 asset ids give two calls per read.
  - `loadAuditRoundPhotos with uploadedFrom reads scans from 30 minutes before it`.
  - `loadAuditRoundPhotos with no asset ids reads nothing`.
- [ ] **Step 2: Run** `npx tsx --test tests/audit-round-photos-data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The db is injected, so this file never imports `@/lib/db`. Callers pass
  `prisma as unknown as AuditRoundPhotoDb`.
- [ ] **Step 4: Run it again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(audit-photos): the loader of a round's photos (plan 2 task 1)`.

### Task 2: Files tab: the round chip and the round filter

**Files:**
- Modify: `src/lib/asset-files-rules.ts`:
  - `AssetFilePhoto` gains `round: { auditNo: string; roundId: string } | null`.
  - New pure `buildAssetPhotoRoundFilter(photos, rounds, selected)`.
- Modify: `src/lib/asset-files-data.ts`:
  - call `loadAuditRoundPhotos(db, [asset.id])`;
  - read the matched rounds (`id, auditNo, status`) and the asset's items in them (`lastScanAt`, `scannedBy`,
    `auditStatus`, `auditResult`);
  - resolve the scanner names;
  - pass the round facts through.
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`: read `photoRound` and pass it to the files tab.
- Modify: `src/components/assets/asset-attachments.tsx`:
  - the chip row above the tiles, using the app's shared filter chip or tab-nav component (the one the register and
    the round page use);
  - the round chip on the tile;
  - the selected round's line;
  - the fold applies to the filtered tiles.
- Test:
  - `tests/asset-files-rules.test.ts` (extend);
  - `tests/asset-photo-round-filter-ui.test.ts` (source pins).

**Interfaces:**
- Consumes: `loadAuditRoundPhotos` (Task 1).
- Produces:
  - `type AssetPhotoRoundFacts = { roundId: string; auditNo: string; cancelled: boolean; scannedAtIso: string | null; resultKey: string | null; scannedBy: string | null }`
  - `type AssetPhotoRoundFilter = { chips: Array<{ key: string; label: string; count: number; href: string; selected: boolean }>; selected: AssetPhotoRoundFacts | "none" | null; visiblePhotoIds: string[] }`
    - `selected === null` means "ทั้งหมด".
  - `buildAssetPhotoRoundFilter(input: { photos: readonly AssetFilePhoto[]; rounds: readonly AssetPhotoRoundFacts[]; selected: string | null; hrefFor: (key: string | null) => string }): AssetPhotoRoundFilter | null`
    - It returns null when no photo has a round, so there are no chips.

- [ ] **Step 1: Write the failing tests:**
  - `groupAssetFiles keeps the primary first and sets round on each photo`.
  - `buildAssetPhotoRoundFilter gives ทั้งหมด, then the rounds latest first, then ไม่ได้มาจากการตรวจนับ, each count its tiles`.
  - `an unknown or junk photoRound falls back to ทั้งหมด`.
  - `no round photo, no chips`.
  - `none selects the photos without a round`.
  - Pins:
    - the tile renders the round chip and the primary chip together;
    - the line links the round only with `can.auditView`;
    - a cancelled round shows `ยกเลิกแล้ว`;
    - uploads, deletes and the checklist hints are unchanged.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The scanner's name comes from the item's `scannedBy`, resolved through users the same way the history does.
  - Use the history's result words, `auditItemResultKey`.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`. Expected: green.
- [ ] **Step 5: Commit** `feat(audit-photos): the files tab marks and filters photos by round (plan 2 task 2)`.

### Task 3: Round page: "มี" opens the item's photos, the count follows the rule

**Files:**
- Modify: `src/lib/audit-round-page-data.ts`, around L170-236:
  - replace the `uploadedAt >= round.startDate` read with `loadAuditRoundPhotos(db, evidenceAssetIds, { uploadedFrom: round.startDate })`;
  - keep the photos whose `auditRoundId === roundId`;
  - build `attachmentNamesByAssetId` from them, so `foldAuditRoundEvidence` and `hasPhoto` both use them, and the
    checklist names still match.
- Create: GET `src/app/api/audit-rounds/[id]/items/[itemId]/photos/route.ts`:
  - it requires `audit:view` and `asset:view`;
  - it returns `{ assetTag, auditNo, photos: Array<{ id: string; originalName: string; uploadedAtIso: string }> }`
    from `loadAuditRoundPhotos(db, [item.assetId])`, filtered to this round;
  - it answers 404 when the item is not in the round.
- Create: `src/components/audit/audit-round-photos-dialog.tsx`:
  - a button "มี" (the `photoAttached` word) that opens the shared dialog;
  - card-size tiles through the thumbnail route; a tile opens the existing attachment preview;
  - a link "ดูในแท็บไฟล์" to the files tab with `photoRound`;
  - an empty state when the list comes back empty;
  - a retry when the request fails.
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`, L313, L585 and L657: the button replaces the "มี"
  text on the desktop table and the phone card. "ไม่มี" stays text.
- Test:
  - `tests/audit-round-photos-route.test.ts` (pins);
  - `tests/audit-round-page-photos-ui.test.ts` (pins);
  - the existing tests of `foldAuditRoundEvidence` stay green.

**Interfaces:**
- Consumes: `loadAuditRoundPhotos` (Task 1).
- Produces: GET `/api/audit-rounds/[id]/items/[itemId]/photos`.

- [ ] **Step 1: Write the failing pins:**
  - the page data calls `loadAuditRoundPhotos(` with `uploadedFrom: round.startDate` and filters on `auditRoundId === roundId`;
  - no `uploadedAt: { gte: round.startDate }` read is left;
  - the route checks both permissions and the item's round;
  - the dialog loads on open, not on render;
  - "ไม่มี" stays plain text.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`. Expected: green.
- [ ] **Step 5: Commit** `feat(audit-photos): the round page's มี opens the item's photos for the round (plan 2 task 3)`.

### Task 4: History: "ดูรูป" on an audit row

**Files:**
- Modify: `src/lib/asset-history-rules.ts`: `AssetHistoryEvent` gains
  `auditPhotos: { auditNo: string; href: string } | null`.
- Modify: `src/lib/asset-history.ts`:
  - one `loadAuditRoundPhotos(db, [assetId])` call;
  - each audit event sets `auditPhotos` when that round has a photo of the asset;
  - the href is the files-tab link with `photoRound`.
- Modify: `src/lib/asset-history-view.ts`:
  - `AssetHistoryRow` gains `photosHref: string | null`;
  - `buildAssetHistoryRows` keeps it even when it drops `document`.
- Modify: `src/components/assets/asset-history-panel.tsx`, desktop L161-169 and phone L194-213: a "ดูรูป" link beside
  the round code.
- Test: extend the history tests (`tests/asset-history*.test.ts`) and add a pin for the panel.

**Interfaces:**
- Consumes: `loadAuditRoundPhotos` (Task 1).

- [ ] **Step 1: Write the failing tests:**
  - `an audit event of a round with photos carries auditPhotos, one without carries null`;
  - `buildAssetHistoryRows keeps photosHref for a viewer without audit:view, while document is dropped`;
  - a panel pin: the link shows on desktop and phone.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Movement events (not audit) always carry `auditPhotos: null`.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`. Expected: green.
- [ ] **Step 5: Commit** `feat(audit-photos): history audit rows link to the round's photos (plan 2 task 4)`.

### Task 5: E2E, look step, docs

**Files:**
- Extend `e2e/audit/scan-photos.spec.ts` (plan 1) with plan 2 tests in the same run round.
- Extend `e2e/audit/scan-photos-words.ts`.
- Extend the pin in `tests/e2e-audit-rounds.test.ts`.

- [ ] **Step 1: Write the E2E,** after plan 1's test 4 linked a photo to A's item:
  - **Files tab:** A's files tab shows the run round's chip with count 1 and the round chip on the tile. Pressing it
    shows the round's line (round, date, result, IT staff's name). `?photoRound=JUNK` shows "ทั้งหมด".
  - **Round page:** A's row reads "มี". Pressing it opens the dialog with one tile. Its "ดูในแท็บไฟล์" lands on the
    files tab with the chip selected. C's row reads "ไม่มี", as text.
  - **History:** A's history audit row has "ดูรูป", which lands on the same chip. C's row has none.
  - **Viewer:** as the viewer (`asset:view`, no `audit:view`), A's history row still has "ดูรูป" and no round link.
    Skip this test if the run's viewer role holds `audit:view`, and say so in the test.
- [ ] **Step 2: Build and run.**
  - `npm test`
  - `(npx next build || npx next build)`
  - `npx playwright test e2e/audit/scan-photos.spec.ts`
  - Then the audit and asset-detail folders on all four projects.
  - Expected: green.
- [ ] **Step 3: Look step.**
  - Port 3300.
  - The files tab, the round page with its dialog, and the history tab.
  - Sizes: 1440 light and dark, 1024, 390 light and dark.
  - Fix layout issues in one batch.
- [ ] **Step 4: Commit** `test(audit-photos): E2E for the files tab, the round dialog and history (plan 2 task 5)`.
