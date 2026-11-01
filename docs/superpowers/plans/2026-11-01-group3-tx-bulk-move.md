# Page Group 3 (Transactions), Plan 4: ย้ายที่ตั้งหลายรายการ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The ย้ายที่ตั้งหลายรายการ page is rebuilt to the TX-Bulk board as a desktop-only, server-paged table. The person filters, ticks rows across pages (at most 100), picks one room and a reason in a bottom selection bar, checks a review that says what moves with each asset, and stays on the page with a result line. On a phone the page shows only a notice. The bulk-move route caps the selection, checks the room, names every refused asset in one answer, and writes nothing for an asset already in the room.

**Architecture:**
- **Pure rules hold every decision.** The list endpoint, the save route and the page call the same function:
  - which rows can move and in which words (`getBulkMoveVerdict`, `bulkMoveBlockedReasonKey`);
  - the list query, its where clause and its row (`src/lib/bulk-move-list-rules.ts`);
  - the selection, the cap, the review's counts and the result line (`src/lib/bulk-move-form-rules.ts`).
- **One list reader** (`readBulkMoveListPage` in `src/lib/bulk-move-list.ts`, the db injected) serves the first page that `page.tsx` renders on the server and every later page the new `GET /api/asset-operations/bulk-move-list` answers.
- **The selection is a map of row snapshots** keyed by asset id, so ticks survive page and filter changes and the bar and the review never need the rows on screen.
- **No schema change and no migration.**

**Tech Stack:**
- Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next-specific code) and React 19.
- next-intl (Thai first).
- Prisma 7 on SQL Server, zod 4.
- Tailwind 4 tokens, shadcn/Radix parts.
- `node --test` (`npm test`).
- Playwright E2E in 4 projects: desktop and phone × light and dark. The transaction specs run Chromium on the phone.

**Spec:** `docs/superpowers/specs/2026-10-30-page-group-3-transactions-design.md`. This plan covers:
- §5: the parts, words, permissions, field errors and stable hooks as they apply to ย้ายที่ตั้งหลายรายการ;
- §6: the bulk-move row ("Unchanged (as today)");
- §10: the table (§10.1), the bar and the review (§10.2), the server (§10.3) and the phone (§10.4);
- §11: the multi-word rule in the list's search;
- §13: the bulk-move keys and `nav.bulkMove`;
- §14 calls 19 and 20;
- §17: bulk-move.spec.ts rewritten, the list endpoint in the viewer refusal list, axe on every new state;
- Appendix A, ย้ายที่ตั้งหลายรายการ.

This is the last plan of page group 3.

**Base:** `master` at `020a8533` (plans 1-3 and the หาไม่พบ late return merged and pushed).
**Branch:** `feat/group3-tx-bulk-move`.
**Dry run:** none. The plan reuses the list, bar and review parts the register, the audit findings and plans 1-3 already use, changes one route and adds one bounded read endpoint, and has no migration. The controller recommends none; the user said "เริ่มแผน 4 ได้เลย" (2026-11-01).

**Execution:**
- Subagent-driven: implementers are the `opus-medium-implementer` agent type, and the main session reviews each task itself.
- Tasks run in order 1 → 8.
- Line numbers are those of `020a8533`. A task names each block by its content where an earlier task moved it.

**E2E:** after Task 8 the controller runs the targeted set (`e2e/transactions/bulk-move.spec.ts e2e/cross-cutting`) from a clean build, then, because this is the last plan of page group 3, the whole suite once, in all four projects.

## Global Constraints

**Words and messages**
- Words follow `docs/19_THAI_GLOSSARY.md`. "ตรวจทาน" is a dropped word: the bar's button says "ตรวจสอบและย้าย {count} รายการ".
- Rooms read "code - name" and holders "code - fullNameTh" in the table, the filters, the bar's picker and the review. No raw id reaches the screen.
- Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together. Change files live in the session scratchpad folder `tx-group/msg/` as `p4-tN-messages.json`. The exact Thai values are in P4-R20; a task copies them verbatim.

**Design**
- Shared parts and tokens only (DESIGN.md): no hex or rgba in tsx, no `dark:`, no `/NN` tints. Both themes.
- The table is `DataTable` with `TableEmptyRow`; paging is the shared `Pagination`; the bar is `DesktopSelectionBar`; the review is `OperationReviewDialog`; the phone notice is a `Notice`. No local look-alike of a shared part (list-frame guard LN2).

**One rule, one function**

| Decision | Where it lives |
|---|---|
| Whether a row can move, and its reason key | `getBulkMoveVerdict` in `src/lib/asset-operation-eligibility.ts` (Task 1 changes its open-handover key) |
| The words of a refusal code from the save | `bulkMoveBlockedReasonKey` in `src/lib/bulk-move-blocked.ts` (Task 1) |
| The list's query, where clause, href and row | `src/lib/bulk-move-list-rules.ts` (Task 1) |
| The list's reads | `readBulkMoveListPage` in `src/lib/bulk-move-list.ts` (Task 2) |
| The selection, the cap, the review counts, the result line | `src/lib/bulk-move-form-rules.ts` (Task 5) |

- **The bulk move never writes `custodianId`, `departmentId`, `branchId` or `assetTag`** (spec §6, §10.2), as today.
- **Components travel by the sync's own filter.** A component counts as travelling only if `syncInstalledComponentsWithParent` would move it: link `status: "installed"`, `removedAt: null`, the component active, no open handover of its own. The list reads exactly that set (Task 2); the review subtracts what is ticked itself or already in the room (Task 5).

**Bounded reads**
- The list answers at most 25 rows and one total. Every per-page read uses an `in` list of at most 25 ids (or the components of those 25).
- The page loads active rooms (with their branch) and active categories only, never `getAssetOperationMasterOptions()`.
- The page never renders more than one page of rows.

**Permissions**
- The page, the list endpoint and the save route need `asset:edit`. The list endpoint checks it before any read.

**V-form rules**
- Errors appear under the field, and focus goes to the first error. The bar's fields are `#bulk-move-to-location` and `#bulk-move-reason`; the refused list sits under the table in `#bulk-move-selection`. `FIELD_IDS` keys the selection as `assetIds: "bulk-move-selection"`, so the route's `fieldErrors.assetIds` (the 100 cap) lands there.
- Toasts are only for what has no field.

**Code shape**
- No schema change and no migration.
- Pure rule files use relative `.ts` imports and `import type` only.
- Production is read only.

**Checks and commits**
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors) before its commit.
- A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Keep each file's line endings: CRLF files stay CRLF (`sed -i` converts them to LF). Leave no stray blank lines.
- Implementers run no build, no E2E and no database command; the controller does.
- Commit with the message each task gives. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Rulings are cited as "group 3 plan 4 P4-R…" (page group 2 also had a plan 4).

**Secrets and E2E**
- Never read or print `.env`, `.env.prod-admin` or `.env.e2e`.
- E2E runs on the dev DB only. It never runs LDAP sync, the settings save, Excel import, a failed login or a delete, and it never changes master data (rooms, employees, departments, categories).

## Review Focus

1. **A parent and one of its installed components are both ticked, and another component is already in the destination room:**
   - the review's "ส่วนควบย้ายตาม M ชิ้น" counts neither;
   - the save writes one movement for the ticked component (its own) and none for the one already there;
   - the result line's M comes from the answer's `componentSync.updated`.

   Task 5 (counts), Task 3 (route) and Task 8 (BM1) pin it.
2. **A tick made on page 1 under one filter, then the filter changed and a tick made on page 2:** both stay ticked, the bar counts 2, the review lists both tags, and the header checkbox of each page shows only that page's state. Tasks 5 and 6 (and Task 8, BM1) pin it.
3. **A stale selection: a ticked asset gets an open handover in another tab before the save:**
   - the save answers 409 with every refused asset named, each with its own code (outstanding, License, open handover, written off in one answer);
   - the list under the table reads the same words as the row's reason;
   - "นำรายการที่ย้ายไม่ได้ออก" unticks exactly those, and the person can save the rest.

   Tasks 1, 3 and 6 pin it.
4. **The 101st tick, or "เลือกทั้งหมดในหน้านี้" with 90 ticked:** the selection stops at 100, the rest of the page's boxes are disabled with "เลือกได้สูงสุด 100 รายการต่อครั้ง", and an API call with 101 ids is refused 400 under `assetIds`. Tasks 3, 5 and 6 pin it.
5. **The list request fails (VPN) or answers late after the filter changed again:** the table keeps the last rows with a failed notice and ลองอีกครั้ง, the ticks stay, and an answer for an older query is dropped. Task 6 pins it.

## Rulings

These are the controller's calls on the spec. Each task copies the ones it carries.

- **P4-R1 (an installed ส่วนควบ ticked alone):** it can move, as today (the spec's rule list has no refusal for it). Its row reads "ส่วนควบของ <parent tag>". The review shows "ส่วนควบที่เลือกเอง N รายการ ย้ายแยกจากเครื่องหลัก" when any of the ticked rows that move (not already in the room) is a component whose parent is not ticked. The link stays `installed`; the docs say that the parent's next move pulls it back.
- **P4-R2 (what travels):** each eligible list row carries `travellingComponents: { id, currentLocationId }[]`, the components the sync would move (see Global Constraints). A refused row carries `[]`: the route refuses it, so the sync never runs for it. A row's "+N ส่วนควบย้ายตาม" uses N = that length; the line shows only when N > 0.
- **P4-R3 (the review's M):** M = the number of distinct component ids over the ticked rows that are not already in the room, taken from their `travellingComponents`, minus ids that are themselves ticked, minus components whose `currentLocationId` equals the room. The result line's M is the answer's `componentSync.updated`.
- **P4-R4 (one answer names every refused asset):** before the transaction the route reads all four reasons and answers one 409 `{ code, error, blocked }` whose `blocked` lists every refused asset with its own code, in the verdict's order per asset: `ASSET_COMPONENT_OUTSTANDING`, `ASSET_LICENSE_MOVE_NOT_ALLOWED`, `ASSET_ACTIVE_CHECKOUT_EXISTS`, `ASSET_STATUS_TRANSFER_NOT_ALLOWED`. The top-level `code` and `error` are the code of the first entry in that order, so a caller that reads `code` keeps working. The in-transaction re-read of outstanding links stays as it is (`assertNoOutstandingComponentLinks`, its own 409 body).
- **P4-R5 (the open handover is named):** the open-handover refusal becomes an entry with code `ASSET_ACTIVE_CHECKOUT_EXISTS` in that list; the unnamed 400 "Some assets already have active checkouts" is gone from the route. The literal `isReturned: false … transactionStatus: "active"` stays in the route (tests/asset-transaction-cancellation-routes.test.ts:20-38).
- **P4-R6 (one set of words):** the list under the table words each code with the row's reason key, through `bulkMoveBlockedReasonKey(code)`: outstanding → `asset.transactionReasonComponentOutstanding`, License → `asset.transactionReasonLicenseMove`, open handover → `asset.transactionReasonOpenCheckoutBulkMove`, written off → `asset.transactionReasonWrittenOff`; an unknown code → `apiErrors.unknown`-style fallback through `apiError.describe(code)` as today.
- **P4-R7 (the bulk open-handover words):** a new key `asset.transactionReasonOpenCheckoutBulkMove` "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงย้ายได้"; `getBulkMoveVerdict` returns it. `getTransferVerdict` keeps `asset.transactionReasonOpenCheckout`.
- **P4-R8 (removing refused rows):** under the table, the refused list ends with a button "นำรายการที่ย้ายไม่ได้ออก" that unticks every refused id, wherever its row is. The list clears when the selection changes.
- **P4-R9 (a ticked row that comes back refused):** when a fetched page shows a ticked row as not eligible, its snapshot is replaced by the fresh row; the row stays ticked with its checkbox enabled (so it can be unticked) and shows its reason; the save names it.
- **P4-R10 (the cap):** at most 100 ids per move (`bulkMoveMaxAssets = 100`). In the page, once 100 are ticked every unticked box is disabled with the reason "เลือกได้สูงสุด 100 รายการต่อครั้ง". "เลือกทั้งหมดในหน้านี้" ticks the page's eligible rows in order up to the cap and then shows the same line in the bar's status. The route's zod schema adds `.max(100)` on `assetIds` (a 400 `VALIDATION_FAILED` under `assetIds`).
- **P4-R11 (the list query):** `q` is trimmed; empty means no text filter; 1 character or more than 100 code points answers 400 `{ error: "Invalid list" }` (the client sends `q` only when `isAssetOperationSearchReady`). Words: `splitAssetOperationSearchWords` (at most 5), each `{ OR: assetOperationTextConditions(word) }`, AND across words (spec §11; the 8 fields include both department names). `locationId` and `categoryId` are exact ids (an unknown id gives no rows). `page` is an integer ≥ 1; past the last page it is clamped to the last page and the answer carries the page used. Page size is fixed at 25. Order `[{ assetTag: "asc" }, { id: "asc" }]`. The list shows every active asset, refused ones included as disabled rows. No highlight in the table *(my call: the highlight is the picker's)*.
- **P4-R12 (paging):** `page.tsx` renders the first page on the server through `readBulkMoveListPage`, so the first paint has rows. Every later page, filter or refresh is fetched from `GET /api/asset-operations/bulk-move-list` by the client, which keeps its ticks. The shared `Pagination` gains a button mode (`onPrevious` / `onNext`) used when there are no hrefs. The search box fetches 300 ms after the last keystroke; a filter change resets to page 1. An answer for an older request is dropped.
- **P4-R13 (range words):** the table's foot uses the shared `Pagination` words, "{from}–{to} จาก {total} รายการ · หน้า {page} จาก {pages}" (`common.showingRange`, `common.pageOf`), not the spec's "แสดง a–b จาก N" *(my call: the register's words)*. "พบ {count} รายการ" uses `bulkMove.foundCount` with `formatCount(total)`: en `common.searchSelectResultCount` is an ICU plural, and a grouped count from `formatCount` reads "NaN results" past 999.
- **P4-R14 (the room in the bar):** the room picker is a `SearchableSelect` (`#bulk-move-to-location`, "code - name", searchable by code, required) over the page's active rooms. A room that is inactive at save time is refused 409 `ASSET_TRANSFER_DESTINATION_INACTIVE` with `fieldErrors: { toLocationId: "checkoutLocationInactive" }`, checked before the transaction and again inside it (transfer's `checkTransferDestinations` pattern). The form leaves the review and focuses the room.
- **P4-R15 (an asset already in the room):** the route counts it as `unchanged` and writes nothing for it: no claim, no movement, no system log, no component sync. The answer is `{ updated, unchanged, componentSync: { updated, skipped, movements } }`. The review shows "อยู่ที่ตั้งนี้แล้ว N รายการ ไม่บันทึกการย้าย" when N > 0.
- **P4-R16 (the transaction):** the bulk-move transaction takes `{ maxWait: 10_000, timeout: 60_000 }` *(my call: up to 100 claims and syncs over the VPN can pass Prisma's 5 s default; unmeasured)*. The reference stays `referenceType`/`referenceId` "bulk_move" (no batch id).
- **P4-R17 (the review):** `OperationReviewDialog` title "ตรวจสอบก่อนย้ายที่ตั้ง", confirm "ยืนยันย้ายที่ตั้ง". Items in order: ทรัพย์สิน "{count} รายการ: {tags}" (every ticked tag, comma-joined); ย้ายไป (room "code - name"); เหตุผล; then the lines that apply: "ส่วนควบย้ายตาม {count} ชิ้น" (M > 0), "อยู่ที่ตั้งนี้แล้ว {count} รายการ ไม่บันทึกการย้าย", "ย้ายไปสาขาอื่น {count} รายการ รหัสยังเป็นของสาขาเดิม" (ticked rows that move whose `branchId` differs from the room's; a row already in the room writes nothing, P4-R15), "ส่วนควบที่เลือกเอง {count} รายการ ย้ายแยกจากเครื่องหลัก"; and always "ผู้ถือครองและแผนกคงเดิม". Below the items, หมายเหตุ (`#bulk-move-remark`, optional, no length rule, as today) through a new `children` slot on `OperationReviewDialog`.
- **P4-R18 (after the save):** the page stays. The ticks, the room, the reason and the remark clear; the current page is fetched again with the current filters; a success `Notice` with `role="status"` above the table reads "ย้ายแล้ว {count} รายการไป {room}" (`{room}` is the room's "code - name"), then " · ส่วนควบย้ายตาม {count} ชิ้น" when `componentSync.updated` > 0, then " · อยู่ที่ตั้งนี้แล้ว {count} รายการ" when `unchanged` > 0. It stays until the next tick. No toast. A 409 `ASSET_CHANGED_DURING_OPERATION` goes to `apiError.toast` and fetches the page again. A 409 with `blocked` closes the review and focuses `#bulk-move-selection`, which sits in the bar's `children` (focus scrolling clears only the sticky footer, and the bar is always on screen while something is ticked).
- **P4-R19 (phone):** one `PageHeader` (h1 ย้ายที่ตั้งหลายรายการ) at every width. Below `md` the page shows only a `Notice` (tone `info`) "หน้านี้ใช้บนคอมพิวเตอร์" with a body line and a link to `/{locale}/assets`; the filters, table and bar are `max-md:hidden` and nothing is fetched on the client below `md` (the first page is server-rendered and simply hidden). The route stays a focus-task route. The bar sits at the bottom between `md` and `lg` (a focus route has no bottom nav): pass `className` to `DesktopSelectionBar` to drop its bottom-nav offset.
- **P4-R20 (words):** th values, verbatim (en values are the task's call, plain English):

  | Key | th |
  |---|---|
  | `nav.bulkMove` | ย้ายที่ตั้งหลายรายการ |
  | `asset.transactionReasonOpenCheckoutBulkMove` | มีการส่งมอบค้างอยู่ รับคืนก่อนจึงย้ายได้ |
  | `bulkMove.subtitle` | เลือกทรัพย์สินที่จะย้ายไปที่ตั้งเดียวกัน ผู้ถือครองและแผนกคงเดิม |
  | `bulkMove.searchLabel` | ค้นหา |
  | `bulkMove.searchPlaceholder` | ค้นหารหัส ชื่อ หรือผู้ถือครอง |
  | `bulkMove.filterLocation` | ที่ตั้งตอนนี้ |
  | `bulkMove.filterCategory` | หมวดหมู่ |
  | `bulkMove.filterAll` | ทั้งหมด |
  | `bulkMove.foundCount` | พบ {count} รายการ |
  | `bulkMove.tableCaption` | ทรัพย์สินที่ย้ายได้และย้ายไม่ได้ |
  | `bulkMove.colTag` | รหัส |
  | `bulkMove.colName` | ชื่อ |
  | `bulkMove.colCategory` | หมวดหมู่ |
  | `bulkMove.colLocation` | ที่ตั้งตอนนี้ |
  | `bulkMove.colHolder` | ผู้ถือครอง |
  | `bulkMove.noHolder` | ไม่มี |
  | `bulkMove.selectPage` | เลือกทั้งหมดในหน้านี้ |
  | `bulkMove.selectRow` | เลือก {tag} |
  | `bulkMove.componentsFollow` | +{count} ส่วนควบย้ายตาม |
  | `bulkMove.componentOf` | ส่วนควบของ {tag} |
  | `bulkMove.capReached` | เลือกได้สูงสุด {max} รายการต่อครั้ง |
  | `bulkMove.nothingSelected` | ยังไม่ได้เลือกทรัพย์สิน เลือกรายการในตารางเพื่อย้าย |
  | `bulkMove.listFailed` | โหลดรายการไม่สำเร็จ |
  | `bulkMove.selectedCount` (value changes) | {count} รายการที่เลือก |
  | `bulkMove.clear` | ล้าง |
  | `bulkMove.toLocation` (value changes) | ย้ายไป |
  | `bulkMove.reason` (value changes) | เหตุผล |
  | `bulkMove.reviewAndMove` | ตรวจสอบและย้าย {count} รายการ |
  | `bulkMove.reviewTitle` | ตรวจสอบก่อนย้ายที่ตั้ง |
  | `bulkMove.reviewConfirm` | ยืนยันย้ายที่ตั้ง |
  | `bulkMove.reviewAssets` | ทรัพย์สิน |
  | `bulkMove.reviewAssetsValue` | {count} รายการ: {tags} |
  | `bulkMove.reviewComponents` | ส่วนควบย้ายตาม {count} ชิ้น |
  | `bulkMove.reviewAlreadyThere` | อยู่ที่ตั้งนี้แล้ว {count} รายการ ไม่บันทึกการย้าย |
  | `bulkMove.reviewOtherBranch` | ย้ายไปสาขาอื่น {count} รายการ รหัสยังเป็นของสาขาเดิม |
  | `bulkMove.reviewComponentsAlone` | ส่วนควบที่เลือกเอง {count} รายการ ย้ายแยกจากเครื่องหลัก |
  | `bulkMove.reviewKept` | ผู้ถือครองและแผนกคงเดิม |
  | `bulkMove.resultMoved` | ย้ายแล้ว {count} รายการไป {room} |
  | `bulkMove.resultComponents` | ส่วนควบย้ายตาม {count} ชิ้น |
  | `bulkMove.resultUnchanged` | อยู่ที่ตั้งนี้แล้ว {count} รายการ |
  | `bulkMove.blockedAssets` (value changes) | ย้ายไม่ได้ {count} รายการ: {list} |
  | `bulkMove.removeBlocked` | นำรายการที่ย้ายไม่ได้ออก |
  | `bulkMove.desktopOnlyTitle` | หน้านี้ใช้บนคอมพิวเตอร์ |
  | `bulkMove.desktopOnlyBody` | ย้ายที่ตั้งหลายรายการต้องเลือกจากตาราง เปิดหน้านี้บนคอมพิวเตอร์ |
  | `bulkMove.backToRegister` | ไปที่ทะเบียนทรัพย์สิน |

  Kept as they are: `bulkMove.title`, `bulkMove.selectLocation`, `bulkMove.remark`. Deleted: `bulkMove.assets`, `bulkMove.selectAssets`, `bulkMove.success` (no field, no toast left). `checkoutLocationInactive`, `common.showingRange`, `common.pageOf`, `common.previous`, `common.next`, `common.tryAgain` are reused. `bulkMove.foundCount`'s en is "{count} found", with no plural.
- **P4-R21 (filters):** a `role="search"` region outside the save form: the search (`SearchField`, `#bulk-move-search`), "ที่ตั้งตอนนี้" (`SearchableSelect` `#bulk-move-filter-location`, not required, so its × clears to ทั้งหมด; active rooms "code - name"; exact room *(spec call)*; assets in an inactive room cannot be filtered by room, recorded), "หมวดหมู่" (`FilterSelect` `#bulk-move-filter-category`, ทั้งหมด or one active category, label as the register shows it), and "พบ {count} รายการ".
- **P4-R22 (the row):** columns checkbox, รหัส (mono), ชื่อ with a status line under it (`StatusBadge` toned by `getAssetStateTone(statusName)`) and, when they apply, "+N ส่วนควบย้ายตาม" or "ส่วนควบของ <tag>", หมวดหมู่, ที่ตั้งตอนนี้, ผู้ถือครอง (or "ไม่มี", muted). A refused row keeps its holder and shows its reason on its own line under the name; its checkbox is disabled with the reason as its accessible description. Checkboxes are native `<input type="checkbox" className={checkboxVariants()}>` in a 44px label, the header one with `indeterminate` and `aria-checked="mixed"` (disposal-bulk-approval's pattern).
- **P4-R23 (DESIGN.md):** DesktopSelectionBar's "a selection belongs to the page on screen" rule gets one written exception: ย้ายที่ตั้งหลายรายการ keeps ticks across pages and filters, with row snapshots, because its job is to gather assets from several rooms into one. The phrases pinned by tests/desktop-selection-bar.test.ts stay.
- **P4-R24 (the picker's `multiple` mode):** bulk-move was its only user. Task 7 removes it with its pins and the docs/14 row.
- **P4-R25 (permissions map):** the list endpoint joins `src/lib/rbac-route-matrix.ts` beside the search's row, `VIEWER_API_REFUSALS`, and the e2e-cross-cutting assertion.

## Tasks

| # | Task | Owns |
|---|---|---|
| 1 | Pure rules: the list query and row, the bulk verdict's words, the refusal words | `bulk-move-list-rules.ts`, `bulk-move-blocked.ts`, `getBulkMoveVerdict` |
| 2 | The list reader, the endpoint and the page options | `bulk-move-list.ts`, `api/asset-operations/bulk-move-list/route.ts`, refusal lists, rbac matrix |
| 3 | The save route | `api/assets/bulk-move/route.ts`, `validations/asset-operations.ts` |
| 4 | Shared parts: Pagination buttons, review dialog slot, DESIGN.md exception | `pagination.tsx`, `operation-review-dialog.tsx`, DESIGN.md, docs/14 |
| 5 | Pure form rules: selection, cap, review counts, result line | `bulk-move-form-rules.ts` |
| 6 | The page and the form | `bulk-move/page.tsx`, `bulk-move-form.tsx` (+ table file), messages, pins |
| 7 | Remove the picker's `multiple` mode | `asset-operation-picker.tsx`, `asset-operation-picker-rules.ts` (the dead "chosen" row note), `tests/asset-operation-picker-ui.test.ts`, `tests/asset-operation-picker-rules.test.ts`, the DESIGN.md picker bullet, docs/14 |
| 8 | E2E and docs | `bulk-move.spec.ts`, tx-support, tx-words, pins, docs |

### Interfaces between tasks (binding)

```ts
// Task 1 — src/lib/bulk-move-list-rules.ts (client-safe, pure; `import type { Prisma } from "@prisma/client"`, types only)
export const bulkMoveListPath = "/api/asset-operations/bulk-move-list"
export const bulkMoveListPageSize = 25
export const bulkMoveMaxAssets = 100
export const bulkMoveListOrderBy = [{ assetTag: "asc" }, { id: "asc" }] satisfies Prisma.AssetOrderByWithRelationInput[] // Task 2 orders by it
export type BulkMoveListInput = { q: string; locationId: string | null; categoryId: string | null; page: number }
export function parseBulkMoveListQuery(params: URLSearchParams): BulkMoveListInput | null // null → 400
export function buildBulkMoveListHref(input: BulkMoveListInput): string // omits empty q/ids and page 1
export function buildBulkMoveListWhere(input: Pick<BulkMoveListInput, "q" | "locationId" | "categoryId">): Prisma.AssetWhereInput
export type BulkMoveTravellingComponent = { id: string; currentLocationId: string | null }
export type BulkMoveListRow = {
  id: string
  assetTag: string
  name: string
  categoryLabel: string | null
  statusName: string // English master name, for the badge tone
  statusLabel: string // nameTh
  locationId: string | null
  locationLabel: string | null // "code - name"
  holderLabel: string | null // "code - fullNameTh"
  branchId: string
  eligible: boolean
  reasonKey: string | null
  travellingComponents: BulkMoveTravellingComponent[]
  componentOf: { parentId: string; parentTag: string } | null
}
export type BulkMoveListPage = { total: number; page: number; pageSize: number; rows: BulkMoveListRow[] }
export type BulkMoveRoomOption = { id: string; label: string; branchId: string } // label "code - name"
export type BulkMoveCategoryOption = { id: string; label: string }
export const bulkMoveListAssetSelect = { ...assetOperationSearchAssetSelect, branchId: true, category: { select: { code: true, name: true } } } satisfies Prisma.AssetSelect
export type BulkMoveListAsset = Prisma.AssetGetPayload<{ select: typeof bulkMoveListAssetSelect }>
export type BulkMoveListRowFacts = {
  openCheckout: { id: string; handoverMode: string | null } | null
  outstanding: AssetOperationOutstandingFact | null
  travellingComponents: BulkMoveTravellingComponent[]
  componentOf: { parentId: string; parentTag: string } | null
}
export function buildBulkMoveListRow(asset: BulkMoveListAsset, facts: BulkMoveListRowFacts): BulkMoveListRow // verdict through getBulkMoveVerdict; a refused row's travellingComponents is []

// Task 1 — src/lib/bulk-move-blocked.ts (existing file, pure)
export type BulkMoveBlockedCode = "ASSET_COMPONENT_OUTSTANDING" | "ASSET_LICENSE_MOVE_NOT_ALLOWED" | "ASSET_ACTIVE_CHECKOUT_EXISTS" | "ASSET_STATUS_TRANSFER_NOT_ALLOWED"
export const bulkMoveBlockedOrder: readonly BulkMoveBlockedCode[]
export function bulkMoveBlockedReasonKey(code: string): string | null // null → caller falls back to apiError.describe(code)
// readBulkMoveBlocked and bulkMoveBlockedList stay

// Task 2 — src/lib/bulk-move-list.ts (server)
export type BulkMoveListDb = { /* method-syntax prisma subset, as AssetOperationSearchDb */ }
export function readBulkMoveListPage(db: BulkMoveListDb, input: BulkMoveListInput): Promise<BulkMoveListPage>
export function readBulkMovePageOptions(db: BulkMoveListDb): Promise<{ rooms: BulkMoveRoomOption[]; categories: BulkMoveCategoryOption[] }>
// GET /api/asset-operations/bulk-move-list → 200 { data: BulkMoveListPage } | 400 { error: "Invalid list" }

// Task 3 — POST /api/assets/bulk-move
// body { assetIds: string[] (1..100), toLocationId: string, reason: string (≤500), remark?: string }
// 200 { updated: number; unchanged: number; componentSync: { updated: number; skipped: number; movements: number } }
// 409 { code: BulkMoveBlockedCode; error: same; blocked: { assetId; assetTag; code: BulkMoveBlockedCode }[] }
// 409 { code: "ASSET_TRANSFER_DESTINATION_INACTIVE"; error: same; fieldErrors: { toLocationId: "checkoutLocationInactive" } }
// 409 { code: "ASSET_CHANGED_DURING_OPERATION"; error } ; 400 VALIDATION_FAILED fieldErrors.assetIds when > 100

// Task 4 — shared parts
// Pagination (server-safe, no directive): PaginationProps = PaginationBaseProps & (links | buttons), never both
//   links mode, as today:  { previousHref: string; nextHref: string; onPrevious?: never; onNext?: never }  (pageSizes allowed)
//   buttons mode:          { onPrevious: () => void; onNext: () => void; previousHref?: never; nextHref?: never; pageSizes?: never }
//   buttons mode draws the shared Button, aria-disabled with no handler at either end
// OperationReviewDialog: + children?: ReactNode (rendered after the item list, inside the body)

// Task 5 — src/lib/bulk-move-form-rules.ts (client-safe, pure)
export type BulkMoveSelection = ReadonlyMap<string, BulkMoveListRow>
export type BulkMoveTickResult = { selection: BulkMoveSelection; capped: boolean }
export function toggleBulkMoveRow(selection: BulkMoveSelection, row: BulkMoveListRow, checked: boolean): BulkMoveTickResult
export function setBulkMovePage(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[], checked: boolean): BulkMoveTickResult
export function getBulkMovePageState(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[]): "none" | "some" | "all"
export function getBulkMoveRowLock(selection: BulkMoveSelection, row: BulkMoveListRow): "blocked" | "cap" | null // null = the box is enabled
export function refreshBulkMoveSelection(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[]): BulkMoveSelection
export function removeBulkMoveIds(selection: BulkMoveSelection, ids: readonly string[]): BulkMoveSelection
export type BulkMoveReviewCounts = { assets: number; tags: string[]; componentsFollow: number; alreadyThere: number; otherBranch: number; componentsAlone: number }
export function getBulkMoveReviewCounts(selection: BulkMoveSelection, room: BulkMoveRoomOption): BulkMoveReviewCounts
export type BulkMoveSaveAnswer = { updated: number; unchanged: number; componentSync: { updated: number; skipped: number; movements: number } }
export function readBulkMoveSaveAnswer(payload: unknown): BulkMoveSaveAnswer | null
export function getBulkMoveResultParts(answer: BulkMoveSaveAnswer): { moved: number; components: number; unchanged: number }
```

---

## Recorded deviations and notes (Z12, Z13, Z21)

- **Z12:** the batch-create test in bulk-move.spec.ts still runs in all four projects; it never opens the bulk-move page on the phone, so §17's "on the phone projects only the notice is checked" holds for this page.
- **Z13:** bulk-move.spec.ts is rewritten in Task 8, one task after the page (§17 says the same task). No E2E runs between Tasks 6 and 8.
- **Z21:** the search's `bulkMove` mode has no UI caller after Task 6 and stays for a later cleanup.
- **Counts in en plurals:** the en plural values of `componentsFollow`, `reviewComponents`, `reviewComponentsAlone` and `resultComponents` take `formatCount` strings; these counts never pass 100, so they never group. The picker's own count line (`asset-operation-picker.tsx:112`) has the latent "NaN results" bug at HEAD; it is outside this plan.

---

### Task 1: The bulk-move rules: the list's query, where clause and row, the bulk verdict's open-handover words, and the refusal codes' words (spec §10.1, §10.2, §10.3, §11, §13; P4-R1, P4-R2, P4-R4, P4-R6, P4-R7, P4-R11, P4-R22)

Pure rules that the list reader and endpoint (Task 2), the save route (Task 3), the form rules (Task 5) and the page (Task 6) all call, so the row, the save and the list under the table cannot disagree:
- the list's constants, query parse, href, where clause, order, select and row (`src/lib/bulk-move-list-rules.ts`, new, client-safe);
- the save's four refusal codes, their order, and the row's words for each (`src/lib/bulk-move-blocked.ts`);
- `getBulkMoveVerdict`'s open-handover reason becomes a bulk-move wording.

This task writes no route, page, form or reader code. It is the plan's first task, so every line number below is `020a8533`'s.

**The rulings this task carries**
- **P4-R1:** an installed ส่วนควบ ticked alone can move; its row carries `componentOf` ("ส่วนควบของ <tag>"). No refusal is added.
- **P4-R2 (row part):** each eligible row carries `travellingComponents: { id, currentLocationId }[]` as Task 2 reads them; the "+N ส่วนควบย้ายตาม" N is its length. A refused row carries `[]` (Decision 7).
- **P4-R4 (order part):** `bulkMoveBlockedOrder` is the verdict's order: outstanding, License, open handover, written off.
- **P4-R6:** `bulkMoveBlockedReasonKey(code)` gives the row's reason key for each code; an unknown code gives null (the caller falls back to `apiError.describe(code)`).
- **P4-R7:** new key `asset.transactionReasonOpenCheckoutBulkMove` "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงย้ายได้"; `getBulkMoveVerdict` returns it; `getTransferVerdict` keeps `asset.transactionReasonOpenCheckout`.
- **P4-R11 (rule part):** `q` trimmed, empty = no text filter, 1 character or more than 100 code points refused; at most 5 words, each `{ OR: assetOperationTextConditions(word) }`, AND across words; exact `locationId` and `categoryId`; `page` an integer ≥ 1; 25 rows a page; order `[{ assetTag: "asc" }, { id: "asc" }]`; every active asset is listed, refused ones included. (The clamp past the last page is Task 2's reader.)
- **P4-R22 (data part):** a refused row keeps its holder and carries its reason key; labels are "code - name" and "code - fullNameTh", never an id.
- **Appendix Z (the controller's rulings on the cross-check):** Z4 (`bulkMoveListOrderBy` is the one order; Task 2 imports it), Z14 (a refused row's `travellingComponents` is `[]`), Z15 (the select `satisfies Prisma.AssetSelect` with Prisma as a type only, `BulkMoveListAsset` from `Prisma.AssetGetPayload`, the where as `Prisma.AssetWhereInput`, and the exports `bulkMoveListOrderBy` and `BulkMoveListRowFacts`).

**Decisions** (what the skeleton leaves open)
1. **The select spreads the search's.** `bulkMoveListAssetSelect = { ...assetOperationSearchAssetSelect, branchId: true, category: { select: { code: true, name: true } } } satisfies Prisma.AssetSelect`. It is a plain object value: `asset-operation-search-rules.ts` imports Prisma as a type only (`:1`) and every value import there is a pure relative module, and the client already imports that file (`src/components/ui/asset-operation-picker.tsx`, the four forms). The spread brings four columns the row does not use (`serialNumber`, `modelId`, `conditionId`, `condition`); that is accepted for one shared base. `BulkMoveListAsset = Prisma.AssetGetPayload<{ select: typeof bulkMoveListAssetSelect }>`. The const is declared with `satisfies`, not annotated, so the payload type survives (Z15, the skeleton's Interfaces block).
2. **`buildBulkMoveListWhere` is typed `Prisma.AssetWhereInput`** (Z15), so Task 2 passes it to `findMany`/`count` without a cast. With no words it has **no `AND` key** (unlike `buildAssetOperationSearchWheres`, which gives `AND: []`); with one or more words it is always `AND: [...]`, one clause per word.
3. **One more export, `bulkMoveListOrderBy`** = `[{ assetTag: "asc" }, { id: "asc" }]` `satisfies Prisma.AssetOrderByWithRelationInput[]`. Task 2 imports it and passes `orderBy: bulkMoveListOrderBy`; the reader writes no literal order (Z4).
4. **The parse.** Absent or empty `page` → 1; otherwise it must match `/^\d+$/` and be a safe integer ≥ 1, or the parse gives null (`"0"`, `"-1"`, `"1.5"`, `"2e3"`, `" 2"`, `"abc"`, `"9007199254740993"`). `locationId` and `categoryId` are trimmed; empty → null; longer than 64 characters → null (ids are uuids, 36). Repeated params: `URLSearchParams.get` takes the first.
5. **The href** appends, in this order, `q` (trimmed, when non-empty), `locationId`, `categoryId` (when non-null) and `page` (when not 1). With nothing to send it is `bulkMoveListPath` with no `?`. `parseBulkMoveListQuery` of the href's params gives the input back.
6. **The row's facts.** `buildBulkMoveListRow` builds `AssetOperationFacts` from the asset and the passed facts: `statusName: asset.status.name`, `ownership: normalizeAssetOwnershipType(asset.ownershipType)`, `custodianId`, `openCheckout`, `outstanding`, `conditionName: asset.condition?.name ?? null`, and `hasOpenRepair: false`. The bulk verdict reads neither the condition (plan 3 P3-R1, pinned at `tests/asset-operation-eligibility.test.ts:73`, `:100`) nor the repair, so Task 2 reads no repairs; the test below pins that a Salvage or Under Maintenance row is eligible.
7. **Nothing travels with a refused row** (Z14). When the verdict refuses, the row's `travellingComponents` is `[]`, whatever Task 2 passed: the route refuses the asset, so the sync never runs for it, and the row shows no "+N ส่วนควบย้ายตาม". `componentOf` is kept on a refused row (it says what the asset is).
8. **Labels.** `categoryLabel` is `"${category.code} - ${category.name}"` (the register's form, `src/app/[locale]/(dashboard)/assets/page.tsx:334`); `locationLabel` is `"${code} - ${name}"`; `holderLabel` is `"${code} - ${fullNameTh}"` or null with no holder. `categoryId`, `currentLocationId` and `branchId` are required columns (`prisma/schema.prisma:254`, `:268`, `:277`), so the builder always fills `categoryLabel`, `locationId` and `locationLabel`; the skeleton's `| null` stays in the types.
9. **The refusal map lives in `bulk-move-blocked.ts`.** Outstanding and License read `assetOperationRefusalReasonKeys` (`src/lib/asset-operation-eligibility.ts:51-58`); open handover and written off are literals (the eligibility file's convention, `:15`). A parity test pins each code's key to the key `getBulkMoveVerdict` gives for a fact that triggers that code, so the two cannot drift. Lookup uses `Object.hasOwn`, so `"toString"` or `"__proto__"` read null.

**Files:**
- Create: `src/lib/bulk-move-list-rules.ts` (CRLF, as `src/lib/transfer-rules.ts`).
- Create: `tests/bulk-move-list-rules.test.ts`.
- Modify: `src/lib/asset-operation-eligibility.ts`: the comment `:154` and `:159` in `getBulkMoveVerdict` (`:155-162`). Nothing else.
- Modify: `src/lib/bulk-move-blocked.ts`: the header comment `:1-3`; after the type `:4`, add the import (at the top), `BulkMoveBlockedCode`, `bulkMoveBlockedOrder` and `bulkMoveBlockedReasonKey`. `readBulkMoveBlocked` (`:6-17`) and `bulkMoveBlockedList` (`:20-28`) are unchanged.
- Modify: `messages/th.json`, `messages/en.json`, through `node scripts/messages-edit.mjs` only (one key).
- Test: `tests/asset-operation-eligibility.test.ts`: `:154-162` (the bulk test), `:248-252` (one assertion added after the outstanding words) and `:264-266` (the key list).
- Test: `tests/bulk-move-blocked.test.ts`: the import `:3`; three tests appended.

**Existing pins this task breaks, rewritten in this commit:**
- `tests/asset-operation-eligibility.test.ts:159` becomes `assert.deepEqual(getBulkMoveVerdict(facts({ openCheckout: handover("temporary_loan") })), no("asset.transactionReasonOpenCheckoutBulkMove"))`.
- `tests/asset-operation-eligibility.test.ts:161` becomes `assert.deepEqual(getBulkMoveVerdict(facts({ statusName: "Disposed", openCheckout: handover("temporary_loan") })), no("asset.transactionReasonOpenCheckoutBulkMove"), "the open handover before the status, as the route")`.
- `tests/asset-operation-eligibility.test.ts:154`, the test title, becomes `"ย้ายที่ตั้งหลายรายการ: not a License, no open handover (in its own words), not Disposed/Retired, in the route's order (spec 6.3; group 3 spec §10.1; P4-R7)"`.
- `tests/asset-operation-eligibility.test.ts:264-266`: the sorted key list gains `"OpenCheckoutBulkMove"` between `"OpenCheckout"` and `"OpenCheckoutHandover"`. The loop at `:258-263` already reaches it through `getBulkMoveVerdict(f)` with a handover and no outstanding link; `"OpenCheckout"` stays, from `getTransferVerdict`.

**These stay green with no edit.** Name any that does not in the report.
- `tests/asset-operation-eligibility.test.ts:147`, `:150`, `:97`: `getTransferVerdict` keeps `asset.transactionReasonOpenCheckout`.
- `tests/asset-register-transactions.test.ts:76-83`: the literal `"asset.transactionReasonOpenCheckout"` stays in the eligibility file (`:146`), and its th/en words do not change.
- `tests/asset-actions.test.ts:94`, `:108`, `:172`; `tests/e2e-asset-detail.test.ts:23` and `e2e/asset-detail/detail-words.ts:10`: all transfer words.
- `tests/asset-operation-search-rules.test.ts:228-243` (the search verdict equals `getBulkMoveVerdict`; it delegates) and `:385-389` (bulkMove refuses an outstanding component first).
- `tests/bulk-move-blocked.test.ts:11-21`: `readBulkMoveBlocked` and `bulkMoveBlockedList` do not change; `:14`'s old 400 body still reads `[]`.
- `tests/v-track2-o.test.ts:273-275`: `bulk-move-form.tsx` is untouched here (Task 6 rewrites it).
- `tests/asset-bulk-custody-routes.test.ts`: the route is untouched (Task 3).
- `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/messages-edit.test.ts`.

**Interfaces:**
- Consumes:
  - `getBulkMoveVerdict(facts: AssetOperationFacts): AssetOperationVerdict`, `type AssetOperationFacts`, `type AssetOperationOutstandingFact`, `assetOperationRefusalReasonKeys` (`src/lib/asset-operation-eligibility.ts:155-162`, `:20-32`, `:35`, `:51-58`);
  - `normalizeAssetOwnershipType(value?: string | null): AssetOwnershipType` (`src/lib/asset-ownership.ts:10-14`);
  - from `src/lib/asset-operation-search-rules.ts`: `isAssetOperationSearchReady` (`:30-32`), `isAssetOperationSearchTooLong` (`:35-37`), `splitAssetOperationSearchWords` (`:43-55`, at most 5, duplicates dropped case-insensitively), `assetOperationTextConditions(word)` (`:111-122`, the 8 fields incl. `department.name` and `custodian.department.name`), `assetOperationSearchAssetSelect` (`:175-189`).
- Produces (the skeleton's names; Tasks 2, 3, 5 and 6 import them):
  ```ts
  // src/lib/bulk-move-list-rules.ts (client-safe, pure; Prisma as a type only)
  export const bulkMoveListPath = "/api/asset-operations/bulk-move-list"
  export const bulkMoveListPageSize = 25
  export const bulkMoveMaxAssets = 100
  export const bulkMoveListOrderBy = [{ assetTag: "asc" }, { id: "asc" }] satisfies Prisma.AssetOrderByWithRelationInput[] // Decision 3; no `as const` (findMany's orderBy takes no readonly tuple)
  export type BulkMoveListInput = { q: string; locationId: string | null; categoryId: string | null; page: number }
  export function parseBulkMoveListQuery(params: URLSearchParams): BulkMoveListInput | null
  export function buildBulkMoveListHref(input: BulkMoveListInput): string
  export function buildBulkMoveListWhere(input: Pick<BulkMoveListInput, "q" | "locationId" | "categoryId">): Prisma.AssetWhereInput
  export type BulkMoveTravellingComponent = { id: string; currentLocationId: string | null }
  export type BulkMoveListRow = { /* exactly the skeleton's 14 fields */ }
  export type BulkMoveListPage = { total: number; page: number; pageSize: number; rows: BulkMoveListRow[] }
  export type BulkMoveRoomOption = { id: string; label: string; branchId: string }
  export type BulkMoveCategoryOption = { id: string; label: string }
  export const bulkMoveListAssetSelect // { ...assetOperationSearchAssetSelect, branchId: true, category: { select: { code: true, name: true } } } satisfies Prisma.AssetSelect
  export type BulkMoveListAsset = Prisma.AssetGetPayload<{ select: typeof bulkMoveListAssetSelect }>
  export type BulkMoveListRowFacts = {
    openCheckout: { id: string; handoverMode: string | null } | null
    outstanding: AssetOperationOutstandingFact | null
    travellingComponents: BulkMoveTravellingComponent[]
    componentOf: { parentId: string; parentTag: string } | null
  }
  export function buildBulkMoveListRow(asset: BulkMoveListAsset, facts: BulkMoveListRowFacts): BulkMoveListRow

  // src/lib/bulk-move-blocked.ts (pure; relative .ts imports)
  export type BulkMoveBlockedCode = "ASSET_COMPONENT_OUTSTANDING" | "ASSET_LICENSE_MOVE_NOT_ALLOWED" | "ASSET_ACTIVE_CHECKOUT_EXISTS" | "ASSET_STATUS_TRANSFER_NOT_ALLOWED"
  export const bulkMoveBlockedOrder: readonly BulkMoveBlockedCode[]
  export function bulkMoveBlockedReasonKey(code: string): string | null
  // unchanged: BulkMoveBlockedAsset, readBulkMoveBlocked, bulkMoveBlockedList

  // src/lib/asset-operation-eligibility.ts: signature unchanged; the open handover's key is asset.transactionReasonOpenCheckoutBulkMove
  export function getBulkMoveVerdict(facts: AssetOperationFacts): AssetOperationVerdict
  ```
  `BulkMoveListRowFacts` is the skeleton's named `facts` type (Z15), exported so Task 2 can build it.

- [ ] **Step 1: Write the failing tests.**
  - `tests/asset-operation-eligibility.test.ts`: rewrite `:154`, `:159`, `:161` and `:264-266` as listed above. In the words test, after the outstanding words (`:248-252`), add:
```ts
  // The bulk move's open handover (group 3 spec §10.1; plan 4 P4-R7); โอนย้าย keeps "…จึงโอนย้ายได้".
  assert.deepEqual([th.asset.transactionReasonOpenCheckoutBulkMove, en.asset.transactionReasonOpenCheckoutBulkMove], [
    "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงย้ายได้", "A handover is open: return the asset before moving it",
  ])
```
  - `tests/bulk-move-blocked.test.ts`: the import `:3` becomes
```ts
import { getBulkMoveVerdict, type AssetOperationFacts } from "../src/lib/asset-operation-eligibility.ts"
import {
  bulkMoveBlockedList, bulkMoveBlockedOrder, bulkMoveBlockedReasonKey, readBulkMoveBlocked, type BulkMoveBlockedCode,
} from "../src/lib/bulk-move-blocked.ts"
```
    (add `import { readFileSync } from "node:fs"` after `:1`), and append:
```ts

test("the save's refusal codes, in the verdict's order (group 3 spec §10.2; P4-R4)", () => {
  assert.deepEqual([...bulkMoveBlockedOrder], ["ASSET_COMPONENT_OUTSTANDING", "ASSET_LICENSE_MOVE_NOT_ALLOWED", "ASSET_ACTIVE_CHECKOUT_EXISTS", "ASSET_STATUS_TRANSFER_NOT_ALLOWED"])
})

test("a refusal code reads the row's reason words, one set of words; any other code reads null (group 3 spec §10.2; P4-R6, P4-R7)", () => {
  assert.deepEqual(bulkMoveBlockedOrder.map(bulkMoveBlockedReasonKey), [
    "asset.transactionReasonComponentOutstanding", "asset.transactionReasonLicenseMove", "asset.transactionReasonOpenCheckoutBulkMove", "asset.transactionReasonWrittenOff",
  ])
  const base: AssetOperationFacts = { statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null }
  const trigger: Record<BulkMoveBlockedCode, Partial<AssetOperationFacts>> = {
    ASSET_COMPONENT_OUTSTANDING: { outstanding: { linkId: "link-1", checkinId: "rt-1" } },
    ASSET_LICENSE_MOVE_NOT_ALLOWED: { ownership: "software_license" },
    ASSET_ACTIVE_CHECKOUT_EXISTS: { openCheckout: { id: "co-1", handoverMode: "temporary_loan" } },
    ASSET_STATUS_TRANSFER_NOT_ALLOWED: { statusName: "Disposed" },
  }
  for (const code of bulkMoveBlockedOrder) assert.equal(bulkMoveBlockedReasonKey(code), getBulkMoveVerdict({ ...base, ...trigger[code] }).reasonKey, code)
  for (const code of ["", "ASSET_CHANGED_DURING_OPERATION", "ASSET_TRANSFER_DESTINATION_INACTIVE", "VALIDATION_FAILED", "asset_license_move_not_allowed", "toString", "__proto__"]) {
    assert.equal(bulkMoveBlockedReasonKey(code), null, code)
  }
})

test("the refusal rules stay pure: relative .ts imports, no database (P4 Global Constraints)", () => {
  const source = readFileSync("src/lib/bulk-move-blocked.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|from "@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})
```
  - Create `tests/bulk-move-list-rules.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { assetOperationSearchAssetSelect, assetOperationTextConditions } from "../src/lib/asset-operation-search-rules.ts"
import {
  buildBulkMoveListHref, buildBulkMoveListRow, buildBulkMoveListWhere, bulkMoveListAssetSelect, bulkMoveListOrderBy, bulkMoveListPageSize,
  bulkMoveListPath, bulkMoveMaxAssets, parseBulkMoveListQuery, type BulkMoveListAsset, type BulkMoveListInput, type BulkMoveListRowFacts,
} from "../src/lib/bulk-move-list-rules.ts"

const parse = (params: Record<string, string>) => parseBulkMoveListQuery(new URLSearchParams(params))
const blank: BulkMoveListInput = { q: "", locationId: null, categoryId: null, page: 1 }
const asset: BulkMoveListAsset = {
  id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", serialNumber: "SN-1", ownershipType: "personal",
  modelId: null, custodianId: "emp-1", currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "In Use", nameTh: "ใช้งานอยู่" },
  condition: { name: "Good" }, currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: { code: "EMP-001", fullNameTh: "สมชาย ใจดี" },
  branchId: "br-1", category: { code: "NB", name: "โน้ตบุ๊ก" },
}
const none: BulkMoveListRowFacts = { openCheckout: null, outstanding: null, travellingComponents: [], componentOf: null }
const ram = { id: "ram-1", currentLocationId: "loc-1" }
const ssd = { id: "ssd-1", currentLocationId: "loc-9" }

test("the list's constants: its path, 25 rows a page, at most 100 per move, ordered by tag then id (group 3 spec §10.1, §10.3; P4-R10, P4-R11)", () => {
  assert.equal(bulkMoveListPath, "/api/asset-operations/bulk-move-list")
  assert.equal(bulkMoveListPageSize, 25)
  assert.equal(bulkMoveMaxAssets, 100)
  assert.deepEqual(bulkMoveListOrderBy, [{ assetTag: "asc" }, { id: "asc" }])
})

test("the query: empty text lists everything, 1 character or more than 100 code points is refused, ids are exact, page 1 by default (group 3 spec §10.3, §11; P4-R11)", () => {
  assert.deepEqual(parse({}), blank)
  assert.deepEqual(parse({ q: "  ", locationId: "", categoryId: " ", page: "" }), blank, "blank values are no filter")
  assert.deepEqual(parse({ q: " notebook บัญชี ", locationId: " loc-1 ", categoryId: "cat-1", page: "3" }), { q: "notebook บัญชี", locationId: "loc-1", categoryId: "cat-1", page: 3 })
  assert.deepEqual(parse({ q: "สม" }), { ...blank, q: "สม" })
  for (const q of ["a", " a "]) assert.equal(parse({ q }), null, `1 character: ${JSON.stringify(q)}`)
  assert.deepEqual(parse({ q: "ก".repeat(100) }), { ...blank, q: "ก".repeat(100) })
  assert.equal(parse({ q: "ก".repeat(101) }), null, "more than 100")
  assert.notEqual(parse({ q: "😀".repeat(100) }), null, "code points, not UTF-16 units")
  for (const page of ["0", "-1", "1.5", "2e3", " 2", "abc", "9007199254740993"]) assert.equal(parse({ page }), null, page)
  assert.deepEqual(parse({ page: "007" }), { ...blank, page: 7 })
  for (const key of ["locationId", "categoryId"]) {
    assert.equal(parse({ [key]: "x".repeat(65) }), null, `${key} longer than 64`)
    assert.notEqual(parse({ [key]: "x".repeat(64) }), null, key)
  }
})

test("the href sends what the parse reads, in a fixed order, and leaves out empty text, no filter and page 1 (P4-R11, P4-R12)", () => {
  assert.equal(buildBulkMoveListHref(blank), bulkMoveListPath)
  assert.equal(buildBulkMoveListHref({ ...blank, page: 2 }), `${bulkMoveListPath}?page=2`)
  assert.equal(buildBulkMoveListHref({ ...blank, locationId: "loc-1" }), `${bulkMoveListPath}?locationId=loc-1`)
  const input: BulkMoveListInput = { q: "notebook บัญชี", locationId: "loc-1", categoryId: "cat-1", page: 4 }
  const href = buildBulkMoveListHref(input)
  assert.ok(href.startsWith(`${bulkMoveListPath}?`), href)
  const params = new URL(href, "http://localhost").searchParams
  assert.deepEqual([...params.keys()], ["q", "locationId", "categoryId", "page"])
  assert.deepEqual(parseBulkMoveListQuery(params), input)
})

test("the where: active assets, the exact room and category, and every word (at most 5) in one of the 8 fields (group 3 spec §10.1, §11; P4-R11)", () => {
  assert.deepEqual(buildBulkMoveListWhere(blank), { isActive: true }, "no words: no AND key")
  assert.deepEqual(buildBulkMoveListWhere({ q: "", locationId: "loc-1", categoryId: "cat-1" }), { isActive: true, currentLocationId: "loc-1", categoryId: "cat-1" })
  assert.deepEqual(buildBulkMoveListWhere({ q: "notebook", locationId: null, categoryId: null }), { isActive: true, AND: [{ OR: assetOperationTextConditions("notebook") }] })
  assert.deepEqual(buildBulkMoveListWhere({ q: "notebook บัญชี", locationId: "loc-1", categoryId: null }), {
    isActive: true, currentLocationId: "loc-1", AND: [{ OR: assetOperationTextConditions("notebook") }, { OR: assetOperationTextConditions("บัญชี") }],
  })
  assert.deepEqual(
    buildBulkMoveListWhere({ q: "w1 w2 W1 w3 w4 w5 w6", locationId: null, categoryId: null }),
    { isActive: true, AND: ["w1", "w2", "w3", "w4", "w5"].map((word) => ({ OR: assetOperationTextConditions(word) })) },
    "duplicates dropped, the first 5 kept",
  )
})

test("the row's select is the search's plus the branch and the category (P4-R11, P4-R22)", () => {
  assert.deepEqual(bulkMoveListAssetSelect, { ...assetOperationSearchAssetSelect, branchId: true, category: { select: { code: true, name: true } } })
})

test("a row: code - name labels, the holder or none, the badge's status name, what travels and what it belongs to (group 3 spec §10.1; P4-R1, P4-R2, P4-R22)", () => {
  assert.deepEqual(buildBulkMoveListRow(asset, { ...none, travellingComponents: [ram, ssd] }), {
    id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", categoryLabel: "NB - โน้ตบุ๊ก",
    statusName: "In Use", statusLabel: "ใช้งานอยู่", locationId: "loc-1", locationLabel: "IT-2 - ห้อง IT ชั้น 2", holderLabel: "EMP-001 - สมชาย ใจดี",
    branchId: "br-1", eligible: true, reasonKey: null, travellingComponents: [ram, ssd], componentOf: null,
  })
  assert.equal(buildBulkMoveListRow({ ...asset, custodianId: null, custodian: null }, none).holderLabel, null)
  // P4-R1: an installed ส่วนควบ ticked alone moves, and names its parent.
  const parent = { parentId: "asset-1", parentTag: "SNI-EQU-25-0228" }
  const alone = buildBulkMoveListRow({ ...asset, id: "ram-1", ownershipType: "component", custodianId: null, custodian: null }, { ...none, componentOf: parent })
  assert.deepEqual([alone.eligible, alone.reasonKey, alone.componentOf], [true, null, parent])
})

test("a row's verdict is getBulkMoveVerdict's, in its order; a refused row keeps its holder and nothing travels with it (group 3 spec §10.1; P4-R7, P4-R22)", () => {
  const handover = { id: "co-1", handoverMode: "temporary_loan" }
  const outstanding = { linkId: "link-1", checkinId: "rt-1" }
  const status = (name: string) => ({ status: { name, nameTh: name } })
  const cases: [Partial<BulkMoveListAsset>, Partial<BulkMoveListRowFacts>, string | null][] = [
    [{}, {}, null],
    [{ ownershipType: "software_license" }, {}, "asset.transactionReasonLicenseMove"],
    [{}, { openCheckout: handover }, "asset.transactionReasonOpenCheckoutBulkMove"],
    [status("Disposed"), {}, "asset.transactionReasonWrittenOff"],
    [status("Retired"), {}, "asset.transactionReasonWrittenOff"],
    [{ ownershipType: "component" }, { outstanding }, "asset.transactionReasonComponentOutstanding"],
    [{ ownershipType: "software_license" }, { outstanding, openCheckout: handover }, "asset.transactionReasonComponentOutstanding"],
    [status("Disposed"), { openCheckout: handover }, "asset.transactionReasonOpenCheckoutBulkMove"],
    // The bulk move reads neither the condition nor a repair (P3-R1; spec §10.1: อยู่ระหว่างซ่อม can move).
    [{ condition: { name: "Salvage" } }, {}, null],
    ...["Under Maintenance", "Pending Repair", "Lost", "Missing", "Under Inspection", "Pending Disposal"].map((name) => [status(name), {}, null] as [Partial<BulkMoveListAsset>, Partial<BulkMoveListRowFacts>, null]),
  ]
  for (const [assetOverrides, factOverrides, reasonKey] of cases) {
    const row = buildBulkMoveListRow({ ...asset, ...assetOverrides }, { ...none, travellingComponents: [ram], ...factOverrides })
    const where = `${JSON.stringify(assetOverrides)} ${JSON.stringify(factOverrides)}`
    assert.deepEqual([row.eligible, row.reasonKey], [reasonKey === null, reasonKey], where)
    assert.deepEqual(row.travellingComponents, reasonKey === null ? [ram] : [], where)
    assert.equal(row.holderLabel, "EMP-001 - สมชาย ใจดี", where)
  }
})

test("the list rules are client-safe: relative .ts imports, Prisma as a type only, no database (P4 Global Constraints)", () => {
  const source = readFileSync("src/lib/bulk-move-list-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|\bprisma\.|from "\.\/(db|asset-operation-search)\.ts"/)
  assert.equal([...source.matchAll(/from "@prisma\/client"/g)].length, 1)
  assert.match(source, /^import type \{ Prisma \} from "@prisma\/client"\r?$/m)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^(\.\/[\w-]+\.ts|@prisma\/client)$/, path)
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/bulk-move-list-rules.test.ts tests/bulk-move-blocked.test.ts tests/asset-operation-eligibility.test.ts`. Expected:
  - `bulk-move-list-rules`: `ERR_MODULE_NOT_FOUND` for `src/lib/bulk-move-list-rules.ts`.
  - `bulk-move-blocked`: the file fails to load (`does not provide an export named 'bulkMoveBlockedOrder'`).
  - `asset-operation-eligibility`: two tests fail and twelve pass: the bulk test (`:154`, the open handover gets `asset.transactionReasonOpenCheckout`) and the words test (`:230`, the new words are `undefined`).

- [ ] **Step 3: Implement.**
  - **3a. The verdict.** In `src/lib/asset-operation-eligibility.ts`, `:159` becomes `if (facts.openCheckout) return no("asset.transactionReasonOpenCheckoutBulkMove")`, and the comment `:154` becomes:
    ```ts
    // The bulk move: the outstanding link, the ownership, the open handover (its own words, group 3 plan 4 P4-R7), then not
    // Disposed/Retired, in the route's order. bulkMoveBlockedReasonKey (bulk-move-blocked.ts) words the save's codes the same way.
    ```
    `getTransferVerdict` and every other verdict are unchanged.
  - **3b. The refusal words.** In `src/lib/bulk-move-blocked.ts`:
    - At the top: `import { assetOperationRefusalReasonKeys } from "./asset-operation-eligibility.ts"`.
    - The header `:1-3` becomes:
      ```ts
      // The assets a ย้ายที่ตั้งหลายรายการ refusal names: the 409 of /api/assets/bulk-move carries `blocked: [{ assetId, assetTag,
      // code }]`, one entry per refused asset with its own code, in bulkMoveBlockedOrder (group 3 plan 4 P4-R4). The list under
      // the table words each code with the row's reason key (bulkMoveBlockedReasonKey, P4-R6), so the row and the refusal agree.
      ```
    - After `BulkMoveBlockedAsset` (`:4`): `BulkMoveBlockedCode`; `bulkMoveBlockedOrder` as a `readonly BulkMoveBlockedCode[]` (`as const satisfies`); a private `Readonly<Record<BulkMoveBlockedCode, string>>` with outstanding → `assetOperationRefusalReasonKeys.ASSET_COMPONENT_OUTSTANDING`, License → `assetOperationRefusalReasonKeys.ASSET_LICENSE_MOVE_NOT_ALLOWED`, open handover → `"asset.transactionReasonOpenCheckoutBulkMove"`, written off → `"asset.transactionReasonWrittenOff"`; and `bulkMoveBlockedReasonKey(code)` returning the map's value when `Object.hasOwn(map, code)`, else null.
    - The client form imports this file (`src/components/asset-operations/bulk-move-form.tsx:19`); the eligibility module is already client-safe, so the new import adds no server code.
  - **3c. The list rules.** Create `src/lib/bulk-move-list-rules.ts` with the Produces exports. Header:
    ```ts
    // The rules of the ย้ายที่ตั้งหลายรายการ list (group 3 spec §10.1, §10.3, §11; group 3 plan 4 P4-R2, P4-R11, P4-R22): the
    // query, the href, the where clause, the order, the select and the row. Client-safe and pure: the list reader and endpoint
    // (bulk-move-list.ts), the save route's cap and the page import it. A row's verdict is getBulkMoveVerdict's.
    ```
    - Imports: `import type { Prisma } from "@prisma/client"`, then values from `./asset-operation-eligibility.ts`, `./asset-ownership.ts` and `./asset-operation-search-rules.ts` only. Never `./asset-operation-search.ts` or `./db.ts`.
    - `parseBulkMoveListQuery`: `q = params.get("q")?.trim() ?? ""`; refuse when `q !== "" && !isAssetOperationSearchReady(q)` or `isAssetOperationSearchTooLong(q)`; ids and page per Decision 4.
    - `buildBulkMoveListWhere`:
      ```ts
      const words = splitAssetOperationSearchWords(input.q)
      return {
        isActive: true,
        ...(input.locationId ? { currentLocationId: input.locationId } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(words.length > 0 ? { AND: words.map((word) => ({ OR: assetOperationTextConditions(word) })) } : {}),
      }
      ```
    - `buildBulkMoveListRow`: the facts per Decision 6, with this comment on `hasOpenRepair: false`: `// not read: the bulk move refuses no repair (spec §10.1), so the list reads none`. The verdict is `getBulkMoveVerdict(facts)`; the row is built per Decisions 7 and 8, with `statusName: asset.status.name` and `statusLabel: asset.status.nameTh`. `travellingComponents` and `componentOf` are copied as given (Task 2 filters and orders them).
  - **3d. The words.** Save `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/tx-group/msg/p4-t1-messages.json` and run `node scripts/messages-edit.mjs <that path>`. Expected output: `messages updated: 1 th, 1 en, 0 deleted`.
```json
{ "set": {
  "th": { "asset.transactionReasonOpenCheckoutBulkMove": "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงย้ายได้" },
  "en": { "asset.transactionReasonOpenCheckoutBulkMove": "A handover is open: return the asset before moving it" }
}, "delete": [] }
```
    The Thai is P4-R20's, verbatim. It uses ส่งมอบ and รับคืน (docs/19_THAI_GLOSSARY.md) and no dropped word.

- [ ] **Step 4: Run the tests and the checks.**
  - Re-run the Step 2 command; every test passes.
  - Run the neighbours: `node --test tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-actions.test.ts tests/asset-register-transactions.test.ts tests/e2e-asset-detail.test.ts tests/v-track2-o.test.ts tests/asset-bulk-custody-routes.test.ts tests/api-error-catalog.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts`. Every test passes with no edit.
  - Then `npm test`, `npx tsc --noEmit` and `npm run lint`: no failures and 0 lint errors. `tsc` checks that `BulkMoveListAsset` fixtures match the select's payload and that `buildBulkMoveListWhere` is a `Prisma.AssetWhereInput`. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - No E2E and no docs here. The old bulk-move picker now shows the new open-handover words; no E2E pins the old ones for bulk move. Task 8 writes the docs (`DEVELOPER_HANDOFF.md:1276`).

- [ ] **Step 5: Commit.**
```
git add src/lib/bulk-move-list-rules.ts src/lib/bulk-move-blocked.ts src/lib/asset-operation-eligibility.ts messages/th.json messages/en.json tests/bulk-move-list-rules.test.ts tests/bulk-move-blocked.test.ts tests/asset-operation-eligibility.test.ts
git commit -m "feat(bulk-move): the list's query, where clause, order and row are pure rules, each save refusal code reads the row's own words, and an open handover refuses a bulk move in its own words (group 3 spec §10.1, §10.2, §10.3, §11; plan 4 P4-R1, P4-R2, P4-R4, P4-R6, P4-R7, P4-R11, P4-R22)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The list reader, the list endpoint and the page options (spec §10.1, §10.3, §11, §17; P4-R1, P4-R2, P4-R11, P4-R12, P4-R14, P4-R21, P4-R25)

One server reader serves every page of the bulk-move table: `page.tsx` calls it for the first page (Task 6), and the new `GET /api/asset-operations/bulk-move-list` calls it for every later page, filter and refresh. After this task:
- `readBulkMoveListPage` counts the matches, reads one page of 25 in tag order with the page clamped, and reads each row's facts for that page only: the open handover, the outstanding link, the components the parent's sync would move, and the parent an installed component belongs to. It builds every row with Task 1's `buildBulkMoveListRow`, so the verdict and the words are Task 1's.
- `readBulkMovePageOptions` reads the active rooms (with their branch) and the active categories, each labelled "code - name". It never reads `getAssetOperationMasterOptions()`.
- The endpoint needs `asset:edit` before any read and answers `{ data }` or 400 `{ error: "Invalid list" }`. It joins the viewer refusal list, its e2e-cross-cutting pin and the RBAC matrix, as the search did.

This task writes no page, form or message. The db is injected as in `src/lib/asset-operation-search.ts`, so the tests use fakes and run no database.

**The rulings this task carries:**
- **P4-R1 (data part):** an installed ส่วนควบ's row carries `componentOf: { parentId, parentTag }`, read from its installed link. The reader refuses nothing for it: the row's verdict stays `getBulkMoveVerdict`'s (Task 1).
- **P4-R2:** each eligible row's `travellingComponents` is exactly the set `syncInstalledComponentsWithParent` would move (`src/lib/asset-component-sync.ts:115-122`, `:144-162`). That means link `status: "installed"`, `removedAt: null`, the component active, no open handover of its own, and each component once. A refused row carries `[]`: the reader passes what it read, and Task 1's `buildBulkMoveListRow` empties it when the verdict refuses (the route refuses the asset, so the sync never runs for it).
- **P4-R11 (reader part):** the where clause is Task 1's `buildBulkMoveListWhere`. The order is Task 1's `bulkMoveListOrderBy` (`[{ assetTag: "asc" }, { id: "asc" }]`), imported, never retyped; the page size is fixed at 25, and a page past the last one is clamped to the last. The answer carries the page it used. The parse is Task 1's `parseBulkMoveListQuery`, and `null` gives 400 `{ error: "Invalid list" }`.
- **P4-R12 (server part):** one reader serves both the server render and the endpoint.
- **P4-R14, P4-R21 (options part):** the active rooms are labelled "code - name" and carry their `branchId`, sorted by code. The active categories carry the label the register's category filter shows ("code - name": `src/components/assets/asset-register-toolbar.tsx:83`, `asset-register-filter-sheet.tsx:134`), sorted by code.
- **P4-R25:** the endpoint joins `src/lib/rbac-route-matrix.ts` beside the search's row, `VIEWER_API_REFUSALS` and the e2e-cross-cutting assertion.
- **Global Constraints, bounded reads and permissions:** at most 25 rows and one total. Each per-page read takes an `in` list of the page's ids only, and `asset:edit` is checked before any read.
- **Appendix Z (the controller's rulings on the cross-check):** Z4 (the reader imports `bulkMoveListOrderBy` and writes no literal order), Z5 (this task inserts `"Invalid list"` after `"Invalid JSON body"`; Task 3 names the lines it deletes by content), Z7 (Decision 4's wording), Z14 (a refused row's `travellingComponents` is `[]`), Z15 (the Prisma types of Task 1's select, payload, where and `BulkMoveListRowFacts`), Z23 (the search-rules line numbers).

**Decisions** (the skeleton leaves these open):
1. **The count goes first, except on page 1.**
   - Page 1 reads the count and the rows together (`Promise.all`), because page 1 is always valid. It is also the common case: the server render, and every filter change resets to page 1.
   - Any other page reads the count first. Then it clamps (`Math.min(input.page, Math.max(1, Math.ceil(total / 25)))`) and reads that page once.
   - So a stale page (after a save shrank the list) or a crafted `page=1000000000` never sends Prisma a `skip` past the end, and it never sends one past the 32-bit `Int`.
   - There is no re-read loop.
2. **An open handover of a travelling component is counted in the same query.** The installed-links read selects `componentAsset: { select: { currentLocationId: true, _count: { select: { checkouts: { where: openCheckoutWhere } } } } }`. The precedent is the `_count` in `assetOperationOutstandingLinkSelect`, `src/lib/asset-operation-search-rules.ts:283-288`. A component with a count above 0 is left out, because the sync skips it (`asset-component-sync.ts:146-162`). This saves the second round trip that a separate checkout read of the components would cost.
3. **The four fact reads run in parallel, and only when the page has rows.** An empty page answers `{ total, page, pageSize: 25, rows: [] }` with no fact read.
4. **`componentOf` needs an active parent.** The read is `{ componentAssetId: { in: ids }, status: "installed", removedAt: null, parentAsset: { isActive: true } }`. A deactivated parent can never be ticked or moved, so naming it would mislead. Such a component reads as a plain row (`componentOf: null`), so Task 5 never counts it under ส่วนควบที่เลือกเอง (Z7).
5. **Newest wins, as in the search.**
   - The open handovers are read `orderBy: { checkoutDate: "desc" }`, and the first per asset gives `{ id, handoverMode }`.
   - The outstanding links and the parent links are read `orderBy: [{ updatedAt: "desc" }, { id: "asc" }]`, and the first per component wins. The outstanding fact is `{ linkId: link.id, checkinId: link.referenceId }` (`AssetOperationOutstandingFact`, `src/lib/asset-operation-eligibility.ts:35`).
6. **The timing label is `"bulk-move-list"`.**
   - Its meta is `{ page: input.page, text: input.q !== "", room: input.locationId !== null, category: input.categoryId !== null }`.
   - The search text itself is never logged: it can hold a person's name.
7. **The 400 text is `"Invalid list"`.** It maps to the existing `apiErrors.invalidRequest`, as `"Invalid search"` does (`src/lib/api-error-catalog.ts:200`). The client never shows it: it sends only a query that `parseBulkMoveListQuery` accepts.
8. **The endpoint is GET only** and lives in its own directory (`asset-operations/bulk-move-list`). `assets/bulk-move/route.ts` stays POST only.
9. **There are no messages in this task**, so there is no `p4-t2-messages.json`.

**Files:**
- Create: `src/lib/bulk-move-list.ts`. It is server-side, with the db injected. It uses relative `.ts` imports and has no `@/lib/db`.
- Create: `src/app/api/asset-operations/bulk-move-list/route.ts`.
- Create: `tests/bulk-move-list.test.ts`.
- Modify: `src/lib/api-error-catalog.ts`: one entry, `"Invalid list": "invalidRequest",`, between `"Invalid JSON body"` (`:192`) and `"Invalid maintenance option type"` (`:193`).
- Modify: `src/lib/rbac-route-matrix.ts`: one row after the search's row (`:61`).
- Modify: `e2e/cross-cutting/support/refusals.ts`: one `VIEWER_API_REFUSALS` entry after the search's (`:59`).
- Test: `tests/e2e-cross-cutting.test.ts:139-140` (rewritten).
- Test: `tests/rbac-route-matrix.test.ts`: one test after `:57-60`.
- Every modified file is CRLF. Edit them with the Edit tool, not `sed -i`.

**Existing pins this task breaks, rewritten in this commit:**
- `tests/e2e-cross-cutting.test.ts:140` deep-equals the viewer's GET refusals to `["/api/asset-operations/search"]`. It becomes:
  ```ts
    // The transaction pickers' search and the bulk-move list need asset:edit like their pages (server asset search; group 3
    // spec §10.3, §17): the viewer's GETs are refused.
    assert.deepEqual(refusals.VIEWER_API_REFUSALS.filter((refusal) => refusal.method === "GET").map((refusal) => refusal.path), ["/api/asset-operations/search", "/api/asset-operations/bulk-move-list"])
  ```
  These lines replace `:139-140`. The old comment at `:139` was "The transaction pickers' search needs asset:edit … the viewer's GET is refused."
- `tests/api-error-catalog.test.ts:69-80` ("every literal error message the server can send has a Thai translation") fails as soon as the route holds `error: "Invalid list"`. The test file needs no edit. Its fix is the catalog entry above.

**These stay green with no edit.** Name any that does not in the report.
- `tests/e2e-cross-cutting.test.ts:132-138` passes for the new refusal:
  - the GET handler contains `requirePermission(user, "asset", "edit")`, and no `prisma.` comes before it (the route's only use is `prisma as unknown as`);
  - the path equals `/api/` + the file minus `/route.ts`.
- `tests/rbac-route-matrix.test.ts:40-47`: the new row's source has `requireAuth(` and `"asset", "edit"`.
- `tests/rbac-route-matrix.test.ts:62-89`: the route classifies as `matrix`.
- `tests/api-error-catalog.test.ts:82-89`: `invalidRequest` already has th and en text.
- `tests/asset-operation-search.test.ts`, `tests/asset-operation-search-route.test.ts` and `tests/asset-operation-search-rules.test.ts`: no search file changes.
- `tests/e2e-transactions.test.ts:139` (the page still calls `getAssetOperationMasterOptions()`): Task 6 moves the page to `readBulkMovePageOptions` and rewrites that pin.
- Task 1's `tests/bulk-move-list-rules.test.ts` (or whatever name Task 1 gives its tests).

**Interfaces:**
- Consumes:
  - Task 1, from `src/lib/bulk-move-list-rules.ts`:
    - `bulkMoveListPageSize` (25) and `bulkMoveListOrderBy` (`[{ assetTag: "asc" }, { id: "asc" }]`, Z4);
    - `type BulkMoveListInput`, and `parseBulkMoveListQuery(params): BulkMoveListInput | null`;
    - `buildBulkMoveListWhere(input): Prisma.AssetWhereInput`;
    - `bulkMoveListAssetSelect` (`satisfies Prisma.AssetSelect`) and `type BulkMoveListAsset` (`Prisma.AssetGetPayload<{ select: typeof bulkMoveListAssetSelect }>`);
    - `buildBulkMoveListRow(asset, facts: BulkMoveListRowFacts)`, which empties a refused row's `travellingComponents`;
    - the types `BulkMoveListPage`, `BulkMoveListRowFacts`, `BulkMoveTravellingComponent`, `BulkMoveRoomOption` and `BulkMoveCategoryOption`.
  - `openCheckoutWhere` is `{ isReturned: false, transactionStatus: "active" }` (`src/lib/asset-operation-search-rules.ts:105`). It is the sync's own checkout filter (`asset-component-sync.ts:148`).
  - `outstandingLinkWhere` is `{ status: "outstanding", removedAt: null }` (`src/lib/asset-component-outstanding.ts:7-10`).
  - The sync's link filter is `parentAssetId`, `status: "installed"`, `removedAt: null` and `componentAsset: { isActive: true }` (`src/lib/asset-component-sync.ts:115-122`; the same filter as `buildAssetOperationComponentLinkWhere`, `asset-operation-search-rules.ts:263-265`, which takes only one id).
  - `type AssetOperationOutstandingFact = { linkId: string; checkinId: string | null }` (`src/lib/asset-operation-eligibility.ts:35`).
  - From the route side:
    - `withPerformanceTiming(label, operation, meta)` (`src/lib/performance-timing.ts:25-30`);
    - `requireAuth`, `requirePermission` (`@/lib/auth-utils`) and `errorResponse` (`@/lib/api-response`), used as in `src/app/api/asset-operations/search/route.ts:10-25`.
  - The Prisma relations used: `Asset.checkouts` (`prisma/schema.prisma`, model Asset), and `AssetComponent.parentAsset` / `componentAsset`.
- Produces (the skeleton's names; Task 6 imports them):
  ```ts
  // src/lib/bulk-move-list.ts (server; db injected)
  // Method syntax, so fakes may narrow args; callers pass `prisma as unknown as BulkMoveListDb`.
  export type BulkMoveListDb = {
    asset: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
    assetCheckout: { findMany(args: object): Promise<unknown[]> }
    assetComponent: { findMany(args: object): Promise<unknown[]> }
    location: { findMany(args: object): Promise<unknown[]> }
    assetCategory: { findMany(args: object): Promise<unknown[]> }
  }
  export function readBulkMoveListPage(db: BulkMoveListDb, input: BulkMoveListInput): Promise<BulkMoveListPage>
  export function readBulkMovePageOptions(db: BulkMoveListDb): Promise<{ rooms: BulkMoveRoomOption[]; categories: BulkMoveCategoryOption[] }>

  // GET /api/asset-operations/bulk-move-list?q=&locationId=&categoryId=&page=   (Task 1's buildBulkMoveListHref)
  // 200 { data: BulkMoveListPage } | 400 { error: "Invalid list" } | 401/403 via errorResponse
  ```

- [ ] **Step 1: Write the failing tests.**
  - Create `tests/bulk-move-list.test.ts`.
  - The asset fixture is a `BulkMoveListAsset`, Task 1's `Prisma.AssetGetPayload` of `bulkMoveListAssetSelect`: `assetOperationSearchAssetSelect`'s fields + `category { code, name }` + `branchId`. If Task 1's select differs, adapt the fixture to it, never the assertions.
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getApiErrorKey } from "../src/lib/api-error-catalog.ts"
import { readBulkMoveListPage, readBulkMovePageOptions, type BulkMoveListDb } from "../src/lib/bulk-move-list.ts"
import {
  bulkMoveListAssetSelect, bulkMoveListPageSize, buildBulkMoveListWhere, type BulkMoveListAsset, type BulkMoveListInput,
} from "../src/lib/bulk-move-list-rules.ts"

function asset(tag: string, overrides: Partial<BulkMoveListAsset> = {}): BulkMoveListAsset {
  return {
    id: `id-${tag}`, assetTag: tag, name: `ชื่อ ${tag}`, serialNumber: null, ownershipType: "personal", modelId: null, custodianId: null,
    currentLocationId: "loc-it2", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" }, condition: { name: "Good" },
    currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null, category: { code: "NB", name: "โน้ตบุ๊ก" }, branchId: "br-hq",
    ...overrides,
  }
}
const tags = (count: number) => Array.from({ length: count }, (_, index) => `BM-${String(index + 1).padStart(3, "0")}`)
const input = (overrides: Partial<BulkMoveListInput> = {}): BulkMoveListInput => ({ q: "", locationId: null, categoryId: null, page: 1, ...overrides })

type Args = { where: Record<string, unknown>; select?: unknown; orderBy?: unknown; skip?: number; take?: number }
type InstalledLink = { parentAssetId: string; componentAssetId: string; componentAsset: { currentLocationId: string | null; _count: { checkouts: number } } }
type ParentLink = { componentAssetId: string; parentAssetId: string; parentAsset: { assetTag: string } }
// The fake stands in for SQL: it returns what the where would match, and the tests pin each where exactly.
function fakeDb(data: {
  assets?: BulkMoveListAsset[]; checkouts?: Array<{ id: string; assetId: string; handoverMode: string | null }>
  outstanding?: Array<{ id: string; componentAssetId: string; referenceId: string | null }>; installed?: InstalledLink[]; parents?: ParentLink[]
  rooms?: Array<{ id: string; code: string; name: string; branchId: string }>; categories?: Array<{ id: string; code: string; name: string }>
} = {}) {
  const calls: Array<{ call: string; args: Args }> = []
  const within = (args: Args, field: string, value: string) => (args.where[field] as { in: string[] }).in.includes(value)
  const db: BulkMoveListDb = {
    asset: {
      async findMany(args: Args) { calls.push({ call: "asset.findMany", args }); return (data.assets ?? []).slice(args.skip, (args.skip ?? 0) + (args.take ?? 0)) },
      async count(args: Args) { calls.push({ call: "asset.count", args }); return (data.assets ?? []).length },
    },
    assetCheckout: { async findMany(args: Args) { calls.push({ call: "checkouts", args }); return (data.checkouts ?? []).filter((row) => within(args, "assetId", row.assetId)) } },
    assetComponent: {
      async findMany(args: Args) {
        if (args.where.status === "outstanding") { calls.push({ call: "outstanding", args }); return (data.outstanding ?? []).filter((row) => within(args, "componentAssetId", row.componentAssetId)) }
        if (args.where.parentAssetId) { calls.push({ call: "installed", args }); return (data.installed ?? []).filter((row) => within(args, "parentAssetId", row.parentAssetId)) }
        calls.push({ call: "parents", args }); return (data.parents ?? []).filter((row) => within(args, "componentAssetId", row.componentAssetId))
      },
    },
    location: { async findMany(args: Args) { calls.push({ call: "location.findMany", args }); return data.rooms ?? [] } },
    assetCategory: { async findMany(args: Args) { calls.push({ call: "assetCategory.findMany", args }); return data.categories ?? [] } },
  }
  return { db, calls }
}
const open = { isReturned: false, transactionStatus: "active" }

test("a page counts the matches and reads 25 rows by tag then id, with the list's where (group 3 spec §10.1, §10.3; P4-R11)", async () => {
  const { db, calls } = fakeDb({ assets: tags(30).map((tag) => asset(tag)) })
  const query = input({ q: "notebook บัญชี", locationId: "loc-it2", categoryId: "cat-nb" })
  const page = await readBulkMoveListPage(db, query)
  const where = buildBulkMoveListWhere(query)
  assert.deepEqual(calls.find((call) => call.call === "asset.count")?.args, { where })
  assert.deepEqual(calls.find((call) => call.call === "asset.findMany")?.args,
    { where, select: bulkMoveListAssetSelect, orderBy: [{ assetTag: "asc" }, { id: "asc" }], skip: 0, take: 25 })
  assert.deepEqual([page.total, page.page, page.pageSize, page.rows.length, page.rows[0].assetTag, page.rows[24].assetTag],
    [30, 1, bulkMoveListPageSize, 25, "BM-001", "BM-025"])
})

test("past page 1 the count comes first and a page past the last is clamped to it; an empty list answers page 1 with no fact read (group 3 spec §10.1; P4-R11)", async () => {
  for (const asked of [2, 5, 1_000_000_000]) {
    const { db, calls } = fakeDb({ assets: tags(30).map((tag) => asset(tag)) })
    const page = await readBulkMoveListPage(db, input({ page: asked }))
    assert.deepEqual([page.page, page.total, page.rows.length, page.rows[0].assetTag], [2, 30, 5, "BM-026"], `page ${asked}`)
    // One row read, already at the clamped page: no skip past the end ever reaches the database.
    assert.deepEqual(calls.filter((call) => call.call.startsWith("asset.")).map((call) => [call.call, call.args.skip]),
      [["asset.count", undefined], ["asset.findMany", 25]], `page ${asked}`)
  }
  for (const asked of [1, 3]) {
    const { db, calls } = fakeDb()
    assert.deepEqual(await readBulkMoveListPage(db, input({ page: asked })), { total: 0, page: 1, pageSize: 25, rows: [] })
    assert.deepEqual(calls.filter((call) => !call.call.startsWith("asset.")), [], `page ${asked}: no fact read`)
  }
})

test("the fact reads ask only the page's 25 ids: open handovers, outstanding links, the sync's installed links and the links holding the page's components (group 3 spec §10.3; P4-R2, bounded reads)", async () => {
  const { db, calls } = fakeDb({ assets: tags(30).map((tag) => asset(tag)) })
  await readBulkMoveListPage(db, input())
  const ids = tags(25).map((tag) => `id-${tag}`)
  const argsOf = (name: string) => { const found = calls.filter((call) => call.call === name); assert.equal(found.length, 1, name); return found[0].args }
  assert.deepEqual(argsOf("checkouts"), { where: { assetId: { in: ids }, ...open }, select: { id: true, assetId: true, handoverMode: true }, orderBy: { checkoutDate: "desc" } })
  assert.deepEqual(argsOf("outstanding"), {
    where: { componentAssetId: { in: ids }, status: "outstanding", removedAt: null }, select: { id: true, componentAssetId: true, referenceId: true },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })
  // syncInstalledComponentsWithParent's own filter, with each component's open handover counted in the same query.
  assert.deepEqual(argsOf("installed"), {
    where: { parentAssetId: { in: ids }, status: "installed", removedAt: null, componentAsset: { isActive: true } },
    select: { parentAssetId: true, componentAssetId: true, componentAsset: { select: { currentLocationId: true, _count: { select: { checkouts: { where: open } } } } } },
  })
  assert.deepEqual(argsOf("parents"), {
    where: { componentAssetId: { in: ids }, status: "installed", removedAt: null, parentAsset: { isActive: true } },
    select: { componentAssetId: true, parentAssetId: true, parentAsset: { select: { assetTag: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })
  assert.equal(calls.length, 6)
})

test("each row gets its facts: an open handover or an outstanding link refuses it, a parent lists what its sync would move, once each and none handed over, and an installed ส่วนควบ names its parent (group 3 spec §10.1; P4-R1, P4-R2, P4-R7)", async () => {
  const { db } = fakeDb({
    assets: [asset("LOAN-001"), asset("MON-001", { ownershipType: "component" }), asset("OUT-001", { ownershipType: "component" }), asset("PC-001")],
    checkouts: [{ id: "co-new", assetId: "id-LOAN-001", handoverMode: "temporary_loan" }, { id: "co-old", assetId: "id-LOAN-001", handoverMode: "permanent_assignment" }],
    outstanding: [{ id: "link-out", componentAssetId: "id-OUT-001", referenceId: "rt-1" }],
    installed: [
      { parentAssetId: "id-PC-001", componentAssetId: "id-MON-001", componentAsset: { currentLocationId: "loc-it2", _count: { checkouts: 0 } } },
      { parentAssetId: "id-PC-001", componentAssetId: "id-RAM-001", componentAsset: { currentLocationId: "loc-store", _count: { checkouts: 0 } } },
      { parentAssetId: "id-PC-001", componentAssetId: "id-RAM-001", componentAsset: { currentLocationId: "loc-store", _count: { checkouts: 0 } } },
      { parentAssetId: "id-PC-001", componentAssetId: "id-KB-001", componentAsset: { currentLocationId: "loc-it2", _count: { checkouts: 1 } } },
      // A refused parent's installed component: the route refuses LOAN-001, so nothing travels with it (Z14).
      { parentAssetId: "id-LOAN-001", componentAssetId: "id-SSD-001", componentAsset: { currentLocationId: "loc-it2", _count: { checkouts: 0 } } },
    ],
    parents: [
      { componentAssetId: "id-MON-001", parentAssetId: "id-PC-001", parentAsset: { assetTag: "PC-001" } },
      { componentAssetId: "id-MON-001", parentAssetId: "id-PC-OLD", parentAsset: { assetTag: "PC-OLD" } },
    ],
  })
  const rows = new Map((await readBulkMoveListPage(db, input())).rows.map((row) => [row.assetTag, row]))
  const facts = (tag: string) => { const row = rows.get(tag)!; return [row.eligible, row.reasonKey, row.travellingComponents, row.componentOf] }
  assert.deepEqual(facts("LOAN-001"), [false, "asset.transactionReasonOpenCheckoutBulkMove", [], null])
  assert.deepEqual(facts("OUT-001"), [false, "asset.transactionReasonComponentOutstanding", [], null])
  assert.deepEqual(facts("MON-001"), [true, null, [], { parentId: "id-PC-001", parentTag: "PC-001" }], "the newest installed link names the parent")
  assert.deepEqual(facts("PC-001"), [true, null, [{ id: "id-MON-001", currentLocationId: "loc-it2" }, { id: "id-RAM-001", currentLocationId: "loc-store" }], null])
})

test("the page's options: active rooms with their branch and active categories, each 'code - name', by code (group 3 spec §10.3; P4-R14, P4-R21)", async () => {
  const { db, calls } = fakeDb({
    rooms: [{ id: "loc-cm", code: "CM-01", name: "ห้องประชุม", branchId: "br-cm" }, { id: "loc-it2", code: "IT-2", name: "ห้อง IT ชั้น 2", branchId: "br-hq" }],
    categories: [{ id: "cat-nb", code: "NB", name: "โน้ตบุ๊ก" }],
  })
  assert.deepEqual(await readBulkMovePageOptions(db), {
    rooms: [{ id: "loc-cm", label: "CM-01 - ห้องประชุม", branchId: "br-cm" }, { id: "loc-it2", label: "IT-2 - ห้อง IT ชั้น 2", branchId: "br-hq" }],
    categories: [{ id: "cat-nb", label: "NB - โน้ตบุ๊ก" }],
  })
  assert.deepEqual(calls.map((call) => [call.call, call.args]), [
    ["location.findMany", { where: { isActive: true }, select: { id: true, code: true, name: true, branchId: true }, orderBy: { code: "asc" } }],
    ["assetCategory.findMany", { where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }],
  ])
})

test("the reader takes its db from the caller, reads nothing else, and orders by the rule file's order (group 3 spec §10.3; P4-R11, P4-R12)", () => {
  const source = readFileSync("src/lib/bulk-move-list.ts", "utf8")
  assert.doesNotMatch(source, /@\/lib\/db|getAssetOperationMasterOptions|from "@\//)
  assert.match(source, /orderBy: bulkMoveListOrderBy\b/)
  assert.doesNotMatch(source, /assetTag: "asc"/, "one order, in bulk-move-list-rules.ts (Z4)")
})

test("GET /api/asset-operations/bulk-move-list: asset:edit before any read, 'Invalid list' on a bad query, timed, { data } (group 3 spec §10.3, §17; P4-R11, P4-R25)", () => {
  const source = readFileSync("src/app/api/asset-operations/bulk-move-list/route.ts", "utf8")
  const steps = [
    "const user = await requireAuth()",
    'requirePermission(user, "asset", "edit")',
    "const input = parseBulkMoveListQuery(new URL(request.url).searchParams)",
    'if (!input) return NextResponse.json({ error: "Invalid list" }, { status: 400 })',
    "readBulkMoveListPage(prisma as unknown as BulkMoveListDb, input)",
    "return NextResponse.json({ data })",
    "return errorResponse(error)",
  ]
  const at = steps.map((step) => { const index = source.indexOf(step); assert.ok(index >= 0, step); return index })
  assert.deepEqual(at, [...at].sort((a, b) => a - b))
  assert.match(source, /withPerformanceTiming\(\s*"bulk-move-list"/)
  assert.doesNotMatch(source, /export async function (POST|PUT|PATCH|DELETE)\b/)
  assert.doesNotMatch(source, /input\.q[,\s]*}/, "the search text is never logged")
  assert.equal(getApiErrorKey("Invalid list"), "invalidRequest")
})
```
  - `tests/rbac-route-matrix.test.ts`: after the search's test (`:57-60`) add
```ts

test("the bulk-move list is registered for asset edit, as its page and the bulk-move save (group 3 spec §10.3; P4-R25)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/asset-operations/bulk-move-list/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "edit" }])
})
```
  - `tests/e2e-cross-cutting.test.ts:139-140`: rewrite as given under "Existing pins".

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/bulk-move-list.test.ts tests/rbac-route-matrix.test.ts tests/e2e-cross-cutting.test.ts`. Expected:
  - `bulk-move-list`: the file fails to load (`ERR_MODULE_NOT_FOUND` for `src/lib/bulk-move-list.ts`).
  - `rbac-route-matrix`: the new test fails (`entry` is undefined), and the others pass.
  - `e2e-cross-cutting`: the roles test fails at the `:140` deepEqual (the actual list holds only `/api/asset-operations/search`).
  - If Task 1 has not landed, `bulk-move-list` fails on `bulk-move-list-rules.ts` instead. Stop and report it: Task 2 runs after Task 1.

- [ ] **Step 3: Implement.**
  - **3a. The reader.** Create `src/lib/bulk-move-list.ts`.
    - Imports:
      - from `./bulk-move-list-rules.ts`: the Consumes names (`buildBulkMoveListRow`, `buildBulkMoveListWhere`, `bulkMoveListAssetSelect`, `bulkMoveListOrderBy` and `bulkMoveListPageSize` as values, the rest, `BulkMoveListRowFacts` included, as types);
      - `openCheckoutWhere` from `./asset-operation-search-rules.ts`;
      - `outstandingLinkWhere` from `./asset-component-outstanding.ts`;
      - `type AssetOperationOutstandingFact` from `./asset-operation-eligibility.ts`.
    - No `@/` import. Its header comment:
      ```ts
      // The bulk-move table's reads (group 3 spec §10.1, §10.3; plan 4 P4-R2, P4-R11, P4-R12): page.tsx renders the first
      // page through readBulkMoveListPage and GET /api/asset-operations/bulk-move-list answers every later one. Bounded: one
      // count, one page of 25 rows, then four fact reads whose `in` lists hold the page's ids only. A row's components are
      // those syncInstalledComponentsWithParent would move (installed, not removed, active, no open handover of their own).
      // The db is injected, as AssetOperationSearchDb, so the page passes prisma and the tests fake it.
      ```
    - `BulkMoveListDb` is as in Produces.
    - Three private selects hold the read shapes the test pins: the checkout select, the installed-link select with `_count`, and the parent-link select. Type them with `satisfies Prisma.AssetComponentSelect` / `Prisma.AssetCheckoutSelect` through `import type { Prisma } from "@prisma/client"`, and derive their record types with `Prisma.AssetComponentGetPayload`. This follows `asset-operation-search-rules.ts:271-292` (the outstanding-link select, then `AssetOperationOutstandingLinkRecord`).
    - `readBulkMoveListPage(db, input)`:
      1. `where = buildBulkMoveListWhere(input)`. `readRows(page)` is `db.asset.findMany({ where, select: bulkMoveListAssetSelect, orderBy: bulkMoveListOrderBy, skip: (page - 1) * bulkMoveListPageSize, take: bulkMoveListPageSize })`.
      2. Page 1 runs `Promise.all([db.asset.count({ where }), readRows(1)])`. Any other page awaits the count, clamps (Decision 1) and then awaits `readRows(page)`.
      3. No rows: return `{ total, page, pageSize: bulkMoveListPageSize, rows: [] }`.
      4. `ids` is the page's ids. Run the four reads of the test in one `Promise.all`, with the wheres, selects and orders it pins. Spread `openCheckoutWhere` and `outstandingLinkWhere`; do not retype them.
      5. Group the results, first per key wins (Decision 5):
         - `openCheckoutByAssetId` holds `{ id, handoverMode }`;
         - `outstandingByComponentId` holds `{ linkId, checkinId }`;
         - `parentByComponentId` holds `{ parentId, parentTag }`.
      6. The travelling components follow the sync. This loop is load-bearing, so write it this way:
         ```ts
         const travellingByParentId = new Map<string, BulkMoveTravellingComponent[]>()
         for (const link of installed) {
           if (link.componentAsset._count.checkouts > 0) continue // the sync skips it (asset-component-sync.ts:159-162)
           const list = travellingByParentId.get(link.parentAssetId) ?? []
           if (!list.some((component) => component.id === link.componentAssetId)) list.push({ id: link.componentAssetId, currentLocationId: link.componentAsset.currentLocationId })
           travellingByParentId.set(link.parentAssetId, list)
         }
         ```
      7. Return the page, with `rows` built as `assets.map((asset) => buildBulkMoveListRow(asset, { openCheckout: … ?? null, outstanding: … ?? null, travellingComponents: … ?? [], componentOf: … ?? null }))`, the facts typed `BulkMoveListRowFacts`. The reader passes a refused parent's components as read; the builder empties them (Z14).
    - `readBulkMovePageOptions(db)` runs the two reads the test pins in one `Promise.all`, rooms first. It maps them to `{ id, label: \`${code} - ${name}\`, branchId }` and `{ id, label: \`${code} - ${name}\` }`.
  - **3b. The route.** Create `src/app/api/asset-operations/bulk-move-list/route.ts`, modelled line for line on `src/app/api/asset-operations/search/route.ts:1-25`:
    - imports: `NextRequest`/`NextResponse`, `prisma` from `@/lib/db`, the auth helpers, `errorResponse`, `withPerformanceTiming`, `readBulkMoveListPage` + `type BulkMoveListDb` from `@/lib/bulk-move-list`, and `parseBulkMoveListQuery` from `@/lib/bulk-move-list-rules`;
    - a one-line comment: `// The bulk-move table's pages (group 3 spec §10.3; plan 4 P4-R11, P4-R12): asset:edit, as the page and the bulk-move save.`;
    - `export async function GET(request: NextRequest)`, in the order the source pin gives;
    - `withPerformanceTiming("bulk-move-list", () => readBulkMoveListPage(prisma as unknown as BulkMoveListDb, input), { page: input.page, text: input.q !== "", room: input.locationId !== null, category: input.categoryId !== null })`.
  - **3c. The catalog.** In `src/lib/api-error-catalog.ts`, after `"Invalid JSON body": "invalidRequest",` (`:192`), add `"Invalid list": "invalidRequest",`.
  - **3d. The RBAC matrix.** In `src/lib/rbac-route-matrix.ts`, after the search's row (`:61`), add
    `  { filePath: "src/app/api/asset-operations/bulk-move-list/route.ts", label: "Bulk move list", checks: [{ module: "asset", action: "edit" }] },`
  - **3e. The viewer refusal.** In `e2e/cross-cutting/support/refusals.ts`, after the search's entry (`:59`), add
    `  { method: "GET", path: "/api/asset-operations/bulk-move-list", file: "asset-operations/bulk-move-list/route.ts", permission: "asset:edit", body: {} },`
    - `roles.spec.ts` sends it as a GET with no body (`e2e/cross-cutting/support/roles-ui.ts`, pinned at `tests/e2e-cross-cutting.test.ts:141`).
    - The viewer gets 403 before the parse, so the missing query does not matter.

- [ ] **Step 4: Run the tests and the checks.**
  - Re-run the Step 2 command; every test passes.
  - Neighbours: run `node --test tests/api-error-catalog.test.ts tests/asset-operation-search.test.ts tests/asset-operation-search-route.test.ts tests/asset-operation-search-rules.test.ts tests/bulk-move-blocked.test.ts tests/asset-component-sync-routes.test.ts` plus Task 1's test file. Everything passes with no edit.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`: no failures and 0 lint errors.
    - Under `tsc`, the fake's narrowed `args: Args` is accepted because `BulkMoveListDb` uses method syntax.
    - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - Run no build, no E2E and no database. The controller runs the cross-cutting E2E after Task 8, and that includes the viewer's GET refusal.
  - No docs change here. Task 8 adds the endpoint to `docs/04_AUTH_RBAC.md`, `docs/06_WORKFLOWS.md` and the changelog.

- [ ] **Step 5: Commit.**
```
git add src/lib/bulk-move-list.ts src/app/api/asset-operations/bulk-move-list/route.ts src/lib/api-error-catalog.ts src/lib/rbac-route-matrix.ts e2e/cross-cutting/support/refusals.ts tests/bulk-move-list.test.ts tests/rbac-route-matrix.test.ts tests/e2e-cross-cutting.test.ts
git commit -m "feat(bulk-move): the bulk-move list reads one page of 25 by tag with the page clamped, each row's open handover, outstanding link, the components its sync would move and its parent, behind asset:edit at GET /api/asset-operations/bulk-move-list, and the page's options read only active rooms with their branch and active categories (group 3 spec §10.1, §10.3, §17; plan 4 P4-R2, P4-R11, P4-R12, P4-R25)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The save route: the cap, one answer naming every refused asset, the active room, and nothing written for an asset already in the room (spec §5, §10.2, §10.3, Appendix A; P4-R4, P4-R5, P4-R10, P4-R14, P4-R15, P4-R16)

`POST /api/assets/bulk-move` moves to the answer the page (Task 6) needs:
- it refuses more than 100 ids;
- it names every refused asset in one 409, the open handover included;
- it refuses a room that is inactive, both before the transaction and inside it;
- it writes nothing for an asset already in the room, and reports it as `unchanged`.

This task writes no page, form or list code. The current form keeps working in the meantime: it already reads `blocked` through `readBulkMoveBlocked`, and the inactive-room `fieldErrors` through `applyServer`. Line numbers are `020a8533`'s. Task 1 has added `bulkMoveMaxAssets` and `bulkMoveBlockedOrder` but has not touched these files, apart from one message key. Task 2 added one catalog line (`"Invalid list"`) after `"Invalid JSON body"`, so in `src/lib/api-error-catalog.ts` this task finds the two lines it deletes by their content, not by number. In th.json and en.json the numbers shift by Task 1's key; that does no harm, because `messages-edit` deletes by key.

**The rulings this task carries:**
- **P4-R4:** before the transaction the route reads all four reasons, then answers **one** 409 `{ code, error, blocked }`.
  - `blocked` names every refused asset with its own code.
  - The top-level `code` and `error` are both the first entry's code.
  - The in-transaction re-read of outstanding links stays as it is (`assertNoOutstandingComponentLinks`, which has its own 409 body).
- **P4-R5:** the open handover becomes an `ASSET_ACTIVE_CHECKOUT_EXISTS` entry, and the unnamed 400 "Some assets already have active checkouts" is gone. The literal `isReturned: false, transactionStatus: "active"` stays in the route.
- **P4-R10:** `assetIds` takes `.max(bulkMoveMaxAssets)` (100). More than that is a 400 `VALIDATION_FAILED` under `assetIds`.
- **P4-R14:** an inactive (or unknown) room gets 409 `ASSET_TRANSFER_DESTINATION_INACTIVE` with `fieldErrors: { toLocationId: "checkoutLocationInactive" }`. It is checked before the transaction and again inside it, as transfer's `checkTransferDestinations` does.
- **P4-R15:** an asset already in the room counts as `unchanged`. It gets no claim, no movement, no system log and no component sync. The answer is `{ updated, unchanged, componentSync: { updated, skipped, movements } }`.
- **P4-R16:** the transaction takes `{ maxWait: 10_000, timeout: 60_000 }`. The reference stays `"bulk_move"` / `"bulk_move"`.
- **P4-R3 (route part):** every claim runs before the first component sync. A ticked component therefore moves by its own claim, and its parent's sync finds it already in the room and writes nothing for it (`asset-component-sync.ts:164-165`). The answer's `componentSync.updated` is the result line's M.
- **Global Constraints:** the bulk move never writes `custodianId`, `departmentId`, `branchId` or `assetTag`. A claim's data is exactly `currentLocationId` and `updatedBy`, and a test pins it.
- **Appendix Z (the controller's rulings on the cross-check):** Z5 (the two catalog lines are named by content, after Task 2's insertion), Z16 (this task's calls are accepted: `readOutstandingComponentLinks` in `asset-operation-claim.ts`, one `findMany` per call; the two dead texts and their `apiErrors` keys deleted; all already in the room → 200 with no transaction; a refused asset already in the room still named; `blocked` sorted by `bulkMoveBlockedOrder`, request order within a code, one code per asset), Z22 (a claim writes only `currentLocationId` and `updatedBy`), Z23 (`tests/asset-movement-labels.test.ts`'s 49 written types are at `:82`).

**Decisions** (the skeleton leaves these open):
1. **One code per asset, its first reason in the verdict's order:** outstanding, License, open handover, written off. An asset that is both handed over and Disposed is named once, as `ASSET_ACTIVE_CHECKOUT_EXISTS`.
2. **The `blocked` order:** entries are sorted by the code's index in `bulkMoveBlockedOrder`, and keep request order within one code. The route walks the deduplicated `assetIds` (request order), not the database's row order. `blocked[0].code` is therefore the top-level code, and `bulkMoveBlockedList` groups in the verdict's order.
3. **The written-off `error` becomes the code** (`"ASSET_STATUS_TRANSFER_NOT_ALLOWED"`), like every other entry. The English text "Disposed or retired assets cannot be moved." leaves the route.
4. **The two dead texts are deleted:**
   - the catalog entries `"Disposed or retired assets cannot be moved.": "disposedAssetCannotMove",` and `"Some assets already have active checkouts": "someAssetsOnCheckout",` in `api-error-catalog.ts`, found by that content (`:139` and `:264` at `020a8533`; the second is `:265` after Task 2's `"Invalid list"` line);
   - their message keys `apiErrors.disposedAssetCannotMove` and `apiErrors.someAssetsOnCheckout` (th.json `:4677`, `:4755`; en.json `:4659`, `:4722` at `020a8533`; deleted by key).

   No other file uses them. `tests/bulk-move-blocked.test.ts:14` keeps the old 400 body only as data that reads nothing.
5. **The order of the checks:**
   1. auth and `asset:edit`;
   2. zod (the cap);
   3. dedupe;
   4. the active-asset read;
   5. the 404;
   6. the outstanding read and the open-handover read, in parallel;
   7. the `blocked` 409;
   8. the room (an asset refusal comes before the room, as in transfer: `transfer/route.ts:59-78`);
   9. the unchanged split;
   10. the transaction.

   Inside the transaction: the room again, then the claims, then the outstanding re-read, then movements, syncs and logs.
6. **Refusals look at every id, an unchanged one included.** The row's verdict does not know the room, so a refused asset that sits in the destination is still named.
7. **Nothing to move means no transaction.** When every asset is already in the room, the route answers 200 `{ updated: 0, unchanged: N, componentSync: { updated: 0, skipped: 0, movements: 0 } }` after the room check, and opens no transaction. The in-transaction outstanding re-read covers only the assets that move.
8. **The outstanding read without a throw** is a new export, `readOutstandingComponentLinks`, in `src/lib/asset-operation-claim.ts`. `assertNoOutstandingComponentLinks` calls it. It is still one `assetComponent.findMany` per call, so the test mock's answer queue (`tests/asset-bulk-custody-routes.test.ts:92-94`) keeps its meaning: answer 1 goes to the pre-check, answer 2 to the re-read.
9. **No new code, no new key, and no new movement type.** `ASSET_TRANSFER_DESTINATION_INACTIVE` and `checkoutLocationInactive` are reused.

**Files:**
- Modify: `src/lib/validations/asset-operations.ts`
  - the imports at `:1-4` gain `import { bulkMoveMaxAssets } from "../bulk-move-list-rules.ts"`;
  - in `assetBulkMoveSchema` (`:96-101`), `assetIds` (`:97`) becomes `z.array(z.string().trim().min(1)).min(1).max(bulkMoveMaxAssets)`.
- Modify: `src/lib/asset-operation-claim.ts`
  - `:79-95`: add `readOutstandingComponentLinks` above `assertNoOutstandingComponentLinks`;
  - the assert's body becomes `const blocked = await readOutstandingComponentLinks(db, assetIds); if (blocked.length > 0) throw new AssetComponentOutstandingError(blocked)`.
- Modify: `src/app/api/assets/bulk-move/route.ts`
  - the imports `:1-13`;
  - the pre-checks `:39-69` are rewritten;
  - the transaction `:71-137`: the room re-read, the claims over `moving` only, and the options;
  - the catch `:140-152` gains the room branch;
  - a private `bulkMoveRefusal`, an `assertActiveDestination` and a `BulkMoveDestinationInactiveError` after `POST`.
- Modify: `src/lib/api-error-catalog.ts`: delete the two lines named in Decision 4, found by content (Task 2 moved the second).
- Modify: `messages/th.json` and `messages/en.json`, through `node scripts/messages-edit.mjs` only (two deletions).
- Test: `tests/asset-bulk-custody-routes.test.ts`
  - the mock (`:16-25`, `:43-47`, `:98`, `:108`, `:153-165`);
  - new helpers after `:151`;
  - `:192-198`, `:210-216`, `:218-222` and `:263-269` rewritten;
  - new tests appended.
- Test: `tests/asset-operation-claim.test.ts`: the import at `:5-7`, and one test appended.
- Test: `tests/api-error-catalog.test.ts`: one test appended after `:224`.

**Existing pins this task breaks, rewritten in this commit:**
- `tests/asset-bulk-custody-routes.test.ts:196`: `error` was `"Disposed or retired assets cannot be moved."`. It becomes `error: "ASSET_STATUS_TRANSFER_NOT_ALLOWED"`, with the rest of the body unchanged (Decision 3).
- `tests/asset-bulk-custody-routes.test.ts:210-216`: this test expected the License alone. It is replaced by the two "every refused asset" tests in Step 1. For `["disposed-1", "loaned-1", "license-1"]` with both loaned-1 and disposed-1 handed over, `blocked` is `[license-1 LICENSE, disposed-1 ACTIVE_CHECKOUT, loaned-1 ACTIVE_CHECKOUT]`.
- `tests/asset-bulk-custody-routes.test.ts:221`: the answer becomes `{ updated: 2, unchanged: 0, componentSync: { updated: 0, skipped: 0, movements: 0 } }`.
- `tests/asset-bulk-custody-routes.test.ts:267`: this test expected only component-1 to be named. license-1 is in that request too, so `blocked` becomes `[outstandingBlocked("component-1"), blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED")]`. The task brief named only `:192-222`.

**These stay green with no edit.** Name any that does not in the report.
- `tests/asset-transaction-cancellation-routes.test.ts:20-38`: the literal stays in the `assetCheckout.findMany` where.
- `tests/asset-component-sync-routes.test.ts`, which pins:
  - the sync import (`:20-25`) and `parent_bulk_move_sync` (`:32`);
  - `componentSync.<field> += result.<field>` (`:43-54`), so the sync result keeps the name `result`;
  - a one-line `return { … componentSync … }`.
- `tests/asset-movement-labels.test.ts`:
  - the WRITERS list at `:39`, since `assetMovement.createMany(` stays;
  - 49 written types at `:82` (`assert.equal(written.size, 49, …)`, in the test at `:80`), since `movementType: "bulk_location_move"` stays;
  - the mirror list at `:118`;
  - `"bulk_move"` with no document at `:138`.
- `tests/asset-bulk-custody-routes.test.ts`:
  - `:200-208`, the License case;
  - `:271-279`, the re-read: the pre-check takes `[]`, and the re-read inside the transaction takes `["ready-1"]` after the claim;
  - the bulk-update tests at `:167-190` and the register tests at `:247-259`. The new mock branches answer as before: a room is active and a sync answers zeros.
- `tests/asset-operation-claim.test.ts:68-79` (one read, the same args, the same error).
- `tests/bulk-move-blocked.test.ts`.
- `tests/e2e-fixes.test.ts:127-144`: `ASSET_STATUS_TRANSFER_NOT_ALLOWED` → `statusBlocksTransfer` is unchanged.
- `tests/e2e-cross-cutting.test.ts:113-140`: `requirePermission` still comes before the first `prisma.`.
- `tests/messages-parity.test.ts` and `tests/thai-glossary.test.ts`.
- `tests/api-error-catalog.test.ts:69-80`: no new English literal reaches a response.

**Interfaces:**
- Consumes:
  - `bulkMoveMaxAssets` (`src/lib/bulk-move-list-rules.ts`, Task 1; pure, so the validations file imports it relatively);
  - `bulkMoveBlockedOrder` and `type BulkMoveBlockedCode` (`src/lib/bulk-move-blocked.ts`, Task 1), with the order `ASSET_COMPONENT_OUTSTANDING`, `ASSET_LICENSE_MOVE_NOT_ALLOWED`, `ASSET_ACTIVE_CHECKOUT_EXISTS`, `ASSET_STATUS_TRANSFER_NOT_ALLOWED`;
  - `getAssetOperationOwnershipRefusal("move", ownership)` (`asset-operation-eligibility.ts:67-73`). For a move it refuses only `software_license` (`:61`);
  - `getBulkCustodyChangeError({ statusName, hasActiveCheckout, changesCustodian: false })` (`asset-custody-policy.ts:16-23`). It returns the open handover first, then `move_scope`'s written-off code;
  - `assertNoOutstandingComponentLinks` and `AssetComponentOutstandingError` (`asset-operation-claim.ts:67-95`);
  - `syncInstalledComponentsWithParent` (`asset-component-sync.ts`);
  - transfer's room read, as a pattern (`transfer/route.ts:270-272`, `:339-346`).
- Produces:
  ```ts
  // src/lib/asset-operation-claim.ts
  export async function readOutstandingComponentLinks(db: OutstandingLinkReader, assetIds: readonly string[]): Promise<Array<{ assetId: string; assetTag: string }>>
  // the given ids that have an outstanding link, each once, in the order given; one findMany, never throws

  // POST /api/assets/bulk-move (as the skeleton's Interfaces block)
  // body { assetIds: string[] (1..100), toLocationId: string, reason: string (≤500), remark?: string }
  // 200 { updated: number; unchanged: number; componentSync: { updated: number; skipped: number; movements: number } }
  // 409 { code: BulkMoveBlockedCode; error: same; blocked: { assetId: string; assetTag: string; code: BulkMoveBlockedCode }[] }
  // 409 { code: "ASSET_TRANSFER_DESTINATION_INACTIVE"; error: same; fieldErrors: { toLocationId: "checkoutLocationInactive" } }
  // 409 { code: "ASSET_COMPONENT_OUTSTANDING"; error: same; blocked } (the in-transaction re-read, unchanged)
  // 409 { code: "ASSET_CHANGED_DURING_OPERATION"; error: <English message> }
  // 400 { error: "Invalid request data"; code: "VALIDATION_FAILED"; fieldErrors: { assetIds: "outOfRange" } } when > 100
  // 404 { error: "Some assets were not found" } (unchanged)
  ```

- [ ] **Step 1: Write the failing tests.**
  - **1a. The mock** (`tests/asset-bulk-custody-routes.test.ts`):
    - `BulkCustodyState` (`:16-23`) gains three queues:
      - `inactiveLocationIds: string[]`;
      - `locationAnswers: boolean[]`, where each `location.findFirst` takes the next answer first and `true` means active;
      - `syncAnswers: Array<{ updated: number; skipped: number; movements: number }>`.
    - `:25` and `beforeEach` (`:153-165`) set all three to `[]`.
    - The sync mock (`:43-47`) becomes:
      ```js
      export async function syncInstalledComponentsWithParent(_tx, input) {
        const state = globalThis.__bulkCustodyState
        state.calls.push({ call: "sync", args: input })
        const answer = state.syncAnswers.length > 0 ? state.syncAnswers.shift() : { updated: 0, skipped: 0, movements: 0 }
        return { ...answer, componentSnapshots: [] }
      }
      ```
    - Before the generic `findFirst` at `:98`:
      ```js
      if (name === "location" && method === "findFirst") {
        const active = state().locationAnswers.length > 0 ? state().locationAnswers.shift() : !state().inactiveLocationIds.includes(args?.where?.id)
        return active ? { id: args?.where?.id ?? "row-1" } : null
      }
      ```
    - `$transaction` (`:108`) records its options:
      ```js
      if (key === "$transaction") return async (callback, options) => { state().calls.push({ call: "$transaction", args: options }); return callback(client) }
      ```
    - After `assetWrites` (`:151`):
      ```ts
      const callNames = () => state.calls.map(({ call }) => call)
      const callsOf = (name: string) => state.calls.filter(({ call }) => call === name).map(({ args }) => args)
      const moveBulk = (assetIds: string[], toLocationId = "loc-2") => bulkMoveRoute.POST(jsonRequest("POST", { assetIds, toLocationId, reason: "ย้ายคลัง" }))
      const blockedEntry = (assetId: string, code: string) => ({ assetId, assetTag: assetId.toUpperCase(), code })
      const inactiveRoom = { code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE", fieldErrors: { toLocationId: "checkoutLocationInactive" } }
      ```
  - **1b. The rewritten pins.**
    - `:192-198`: rename to `"bulk move refuses written-off assets, the code as its error (group 3 spec §10.3; P4-R4)"`, and the deepEqual becomes:
      ```ts
      { code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", error: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", blocked: [blockedEntry("disposed-1", "ASSET_STATUS_TRANSFER_NOT_ALLOWED")] }
      ```
    - `:210-216` is replaced by:
      ```ts
      test("one 409 names every refused asset with its own code, in the verdict's order: outstanding, License, open handover, written off (group 3 spec §10.2, §10.3; P4-R4, P4-R5)", async () => {
        state.outstandingAssetIds = ["component-1"]
        const response = await moveBulk(["disposed-1", "loaned-1", "ready-1", "license-1", "component-1"])
        assert.equal(response.status, 409)
        assert.deepEqual(await response.json(), {
          code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING",
          blocked: [
            blockedEntry("component-1", "ASSET_COMPONENT_OUTSTANDING"),
            blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED"),
            blockedEntry("loaned-1", "ASSET_ACTIVE_CHECKOUT_EXISTS"),
            blockedEntry("disposed-1", "ASSET_STATUS_TRANSFER_NOT_ALLOWED"),
          ],
        })
        assert.equal(callNames().filter((call) => call === "assetComponent.findMany").length, 1, "one outstanding read, no throw before the other reasons")
        for (const call of ["$transaction", "location.findFirst", "asset.updateMany", "assetMovement.createMany"]) assert.equal(callNames().includes(call), false, call)
      })

      test("each refused asset is named once under its first reason, request order within one code, and the first code leads the answer (group 3 spec §10.3; P4-R4)", async () => {
        state.activeCheckoutAssetIds = ["loaned-1", "disposed-1"]
        const response = await moveBulk(["disposed-1", "loaned-1", "license-1"])
        assert.equal(response.status, 409)
        assert.deepEqual(await response.json(), {
          code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: "ASSET_LICENSE_MOVE_NOT_ALLOWED",
          blocked: [
            blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED"),
            blockedEntry("disposed-1", "ASSET_ACTIVE_CHECKOUT_EXISTS"),
            blockedEntry("loaned-1", "ASSET_ACTIVE_CHECKOUT_EXISTS"),
          ],
        })
      })
      ```
    - `:218-222`: the name gains `" (group 3 spec §10.2; P4-R15)"`, and the deepEqual becomes `{ updated: 2, unchanged: 0, componentSync: { updated: 0, skipped: 0, movements: 0 } }`.
    - `:263-269`: rename to `"bulk move names an outstanding component first and every other refused asset after it (group 3 spec §8.5, §10.2; P2-R17, P4-R4)"`, and the deepEqual becomes:
      ```ts
      { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING", blocked: [outstandingBlocked("component-1"), blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED")] }
      ```
  - **1c. New route tests** (append at the end of the file):
    ```ts
    test("an open handover is named in the 409 with its own code, no longer an unnamed 400 (group 3 spec §10.2, §10.3; P4-R5)", async () => {
      const response = await moveBulk(["ready-1", "loaned-1"])
      assert.equal(response.status, 409)
      assert.deepEqual(await response.json(), { code: "ASSET_ACTIVE_CHECKOUT_EXISTS", error: "ASSET_ACTIVE_CHECKOUT_EXISTS", blocked: [blockedEntry("loaned-1", "ASSET_ACTIVE_CHECKOUT_EXISTS")] })
      assert.deepEqual(callsOf("assetCheckout.findMany"), [{ where: { assetId: { in: ["ready-1", "loaned-1"] }, isReturned: false, transactionStatus: "active" }, select: { assetId: true } }])
      assert.deepEqual(assetWrites(), [])
    })

    test("more than 100 assets are refused 400 under assetIds before any read, and 100 pass the check (group 3 spec §10.1, §10.3; P4-R10)", async () => {
      const ids = (count: number) => Array.from({ length: count }, (_, index) => `asset-${index + 1}`)
      const tooMany = await moveBulk(ids(101))
      assert.equal(tooMany.status, 400)
      assert.deepEqual(await tooMany.json(), { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { assetIds: "outOfRange" } })
      assert.deepEqual(state.calls, [])
      const hundred = await moveBulk(ids(100))
      assert.equal(hundred.status, 404)
      assert.deepEqual(await hundred.json(), { error: "Some assets were not found" })
    })

    test("an inactive room is refused 409 under toLocationId before the transaction (group 3 spec §5, §10.3; P4-R14)", async () => {
      state.inactiveLocationIds = ["loc-closed"]
      const response = await moveBulk(["ready-1"], "loc-closed")
      assert.equal(response.status, 409)
      assert.deepEqual(await response.json(), inactiveRoom)
      assert.deepEqual(callsOf("location.findFirst"), [{ where: { id: "loc-closed", isActive: true }, select: { id: true } }])
      assert.equal(callNames().includes("$transaction"), false)
      assert.deepEqual(assetWrites(), [])
    })

    test("a room closed while the move is saved is refused by the read inside the transaction, before any claim (group 3 spec §10.3; P4-R14)", async () => {
      state.locationAnswers = [true, false]
      const response = await moveBulk(["ready-1"])
      assert.equal(response.status, 409)
      assert.deepEqual(await response.json(), inactiveRoom)
      const calls = callNames()
      assert.ok(calls.lastIndexOf("location.findFirst") > calls.indexOf("$transaction"), "read again inside the transaction")
      for (const call of ["asset.updateMany", "assetMovement.createMany", "systemLog.createMany"]) assert.equal(calls.includes(call), false, call)
    })

    test("an asset already in the room is counted unchanged and gets no claim, movement, log or sync (group 3 spec §10.2; P4-R15)", async () => {
      state.assets[0].currentLocationId = "loc-2"
      const response = await moveBulk(["ready-1", "component-1"])
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { updated: 1, unchanged: 1, componentSync: { updated: 0, skipped: 0, movements: 0 } })
      assert.deepEqual(assetWrites().map(({ args }) => (args as { where: { id: string } }).where.id), ["component-1"])
      assert.deepEqual((callsOf("assetMovement.createMany")[0] as { data: Array<{ assetId: string }> }).data.map((row) => row.assetId), ["component-1"])
      assert.deepEqual((callsOf("systemLog.createMany")[0] as { data: Array<{ recordId: string }> }).data.map((row) => row.recordId), ["component-1"])
      assert.deepEqual(callsOf("sync").map((args) => (args as { parentAssetId: string }).parentAssetId), ["component-1"])
    })

    test("a selection already all in the room answers 200 after the room check, without a transaction (group 3 spec §10.2; P4-R15)", async () => {
      const response = await moveBulk(["ready-1", "component-1"], "loc-1")
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { updated: 0, unchanged: 2, componentSync: { updated: 0, skipped: 0, movements: 0 } })
      assert.equal(callsOf("location.findFirst").length, 1)
      for (const call of ["$transaction", "asset.updateMany", "assetMovement.createMany", "systemLog.createMany", "sync"]) assert.equal(callNames().includes(call), false, call)
    })

    test("every claim comes before the first component sync, writes only the room and who moved it, the answer sums the syncs, and the transaction allows 60 s (group 3 spec §6, §10.2; P4-R3, P4-R16)", async () => {
      state.syncAnswers = [{ updated: 2, skipped: 1, movements: 2 }, { updated: 0, skipped: 0, movements: 0 }]
      const response = await moveBulk(["ready-1", "component-1"])
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { updated: 2, unchanged: 0, componentSync: { updated: 2, skipped: 1, movements: 2 } })
      const calls = callNames()
      assert.ok(calls.lastIndexOf("asset.updateMany") < calls.indexOf("sync"), "a ticked component moves by its own claim, so its parent's sync finds it in the room")
      // Never the holder, the department, the branch or the tag (spec §6 "Unchanged (as today)"; Z22).
      assert.equal(assetWrites().length, 2)
      for (const { args } of assetWrites()) assert.deepEqual(Object.keys((args as { data: Record<string, unknown> }).data).sort(), ["currentLocationId", "updatedBy"])
      assert.deepEqual(callsOf("$transaction"), [{ maxWait: 10_000, timeout: 60_000 }])
      const rows = (callsOf("assetMovement.createMany")[0] as { data: Array<{ assetId: string; movementType: string; referenceType: string; referenceId: string }> }).data
      assert.deepEqual(rows.map((row) => [row.assetId, row.movementType, row.referenceType, row.referenceId]), [
        ["ready-1", "bulk_location_move", "bulk_move", "bulk_move"],
        ["component-1", "bulk_location_move", "bulk_move", "bulk_move"],
      ])
    })
    ```
  - **1d.** `tests/asset-operation-claim.test.ts`: the import at `:5-7` adds `readOutstandingComponentLinks`. Append:
    ```ts
    test("the outstanding links of the given ids are read once without a throw, each asset named once in the order given (group 3 spec §10.3; P4-R4)", async () => {
      const calls: unknown[] = []
      const rows = [{ componentAssetId: "a-2", componentAsset: { assetTag: "TAG-2" } }, { componentAssetId: "a-2", componentAsset: { assetTag: "TAG-2" } }, { componentAssetId: "a-1", componentAsset: { assetTag: "TAG-1" } }]
      const db = { assetComponent: { findMany: async (args: unknown) => { calls.push(args); return rows } } }
      assert.deepEqual(await readOutstandingComponentLinks(db, ["a-1", "a-2", "a-3"]), [{ assetId: "a-1", assetTag: "TAG-1" }, { assetId: "a-2", assetTag: "TAG-2" }])
      assert.deepEqual(calls, [{ where: { componentAssetId: { in: ["a-1", "a-2", "a-3"] }, ...outstandingLinkWhere }, select: { componentAssetId: true, componentAsset: { select: { assetTag: true } } } }])
      assert.deepEqual(await readOutstandingComponentLinks({ assetComponent: { findMany: async () => [] } }, ["a-1"]), [])
    })
    ```
  - **1e.** `tests/api-error-catalog.test.ts`: add `import { bulkMoveBlockedOrder } from "../src/lib/bulk-move-blocked.ts"` after `:7`. Append:
    ```ts
    test("every answer of the bulk move reads through the catalog, and its two old texts are gone (group 3 spec §5, §10.3; P4-R4, P4-R5, P4-R14)", () => {
      assert.deepEqual(bulkMoveBlockedOrder.map((code) => getApiErrorKey(code)), ["componentOutstanding", "licenseMoveNotAllowed", "assetActiveCheckoutExists", "statusBlocksTransfer"])
      assert.equal(getApiErrorKey("ASSET_TRANSFER_DESTINATION_INACTIVE"), "checkoutDestinationInactive")
      assert.equal(getApiErrorKey("ASSET_CHANGED_DURING_OPERATION"), "assetChangedDuringOperation")
      assert.equal(getApiErrorKey("Disposed or retired assets cannot be moved."), null)
      assert.equal(getApiErrorKey("Some assets already have active checkouts"), null)
      for (const locale of ["th", "en"] as const) {
        const apiErrors = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors as Record<string, string | undefined>
        assert.equal(apiErrors.disposedAssetCannotMove, undefined, locale)
        assert.equal(apiErrors.someAssetsOnCheckout, undefined, locale)
        assert.equal(typeof apiErrors.checkoutLocationInactive, "string", locale)
      }
    })
    ```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/asset-bulk-custody-routes.test.ts tests/asset-operation-claim.test.ts tests/api-error-catalog.test.ts`. Expected failures:
  - the written-off pin (the `error` text);
  - both "every refused asset" tests (only the first category comes back);
  - the outstanding pin (no License entry);
  - the 200 shape (no `unchanged`);
  - the open handover (400 `{ error: "Some assets already have active checkouts" }`);
  - the cap (`hundred` passes, `tooMany` answers 404 after a read);
  - both room tests (no `location.findFirst`; 200);
  - the unchanged tests (2 claims; a transaction opened);
  - the options test (`$transaction` args `undefined`; its claim-data assertion already passes, since today's claim writes only `currentLocationId` and `updatedBy`);
  - `readOutstandingComponentLinks` is not exported (the claim test file fails to load);
  - the catalog test (the old texts still map).

  `:200-208` and `:271-279` pass.

- [ ] **Step 3: Implement.**
  - **3a. The schema.** In `src/lib/validations/asset-operations.ts`:
    - `assetIds: z.array(z.string().trim().min(1)).min(1).max(bulkMoveMaxAssets)`, with the comment `// At most 100 per move (group 3 spec §10.1; plan 4 P4-R10): one transaction, and SQL Server's parameter limit.`;
    - the import `../bulk-move-list-rules.ts`;
    - nothing else changes. `AssetBulkMoveInput` (`:161`) follows.
  - **3b. The reader.** In `src/lib/asset-operation-claim.ts`, move the body of `assertNoOutstandingComponentLinks` (`:82-93`, the read and the tags in the given order) into `readOutstandingComponentLinks`, which returns `blocked`. The assert keeps its comment and becomes the two lines named under Files. The `findMany` args stay byte for byte.
  - **3c. The route.** In `src/app/api/assets/bulk-move/route.ts`:
    - **Imports:** add `import type { Prisma } from "@prisma/client"`, `readOutstandingComponentLinks`, and `bulkMoveBlockedOrder, type BulkMoveBlockedCode` from `@/lib/bulk-move-blocked`. Keep `getBulkCustodyChangeError` and `getAssetOperationOwnershipRefusal`.
    - **`:21-37`:** unchanged.
    - **After the 404:** walk the request order (Decision 2):
      ```ts
      const assetsById = new Map(assets.map((asset) => [asset.id, asset]))
      const ordered = uniqueAssetIds.flatMap((id) => { const asset = assetsById.get(id); return asset ? [asset] : [] })
      // Every reason is read before any refusal, so one answer names every refused asset (group 3 spec §10.2; plan 4 P4-R4, P4-R5).
      const [outstanding, activeCheckouts] = await Promise.all([
        readOutstandingComponentLinks(prisma, uniqueAssetIds),
        prisma.assetCheckout.findMany({
          where: { assetId: { in: uniqueAssetIds }, isReturned: false, transactionStatus: "active" },
          select: { assetId: true },
        }),
      ])
      ```
      - Build `blocked` from `bulkMoveRefusal(asset, { outstanding: outstandingIds.has(asset.id), openCheckout: openIds.has(asset.id) })`.
      - Sort it stably by `bulkMoveBlockedOrder.indexOf(code)`.
      - When it is not empty, answer `NextResponse.json({ code: blocked[0].code, error: blocked[0].code, blocked }, { status: 409 })`.
    - **Then:** `await assertActiveDestination(prisma, input.toLocationId)`.
    - **Then the split:** `const moving = ordered.filter((asset) => asset.currentLocationId !== input.toLocationId)` and `const unchanged = ordered.length - moving.length`.
      - When `moving.length === 0`, return the 200 of Decision 7.
    - **The transaction:** `prisma.$transaction(async (tx) => { … }, bulkMoveTransactionOptions)`, with `const bulkMoveTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const` at module level and the comment `// Up to 100 claims and syncs over the VPN can pass Prisma's 5 s default; unmeasured (plan 4 P4-R16).`
      - The body is today's, with these changes:
        1. `await assertActiveDestination(tx, input.toLocationId)` first;
        2. the claims, the movement rows, the sync loop and the system log rows run over `moving`, not `assets`; a claim's `data` stays `{ currentLocationId, updatedBy }` (Z22);
        3. `assertNoOutstandingComponentLinks(tx, moving.map((asset) => asset.id))`;
        4. `return { updated: moving.length, unchanged, componentSync }`.
      - Every claim runs before the movement rows and the syncs, as today (P4-R3).
    - **The catch:** before the conflict branch, add `if (error instanceof BulkMoveDestinationInactiveError)`, which returns `NextResponse.json({ code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE", fieldErrors: { toLocationId: "checkoutLocationInactive" } }, { status: 409 })`.
    - **The private helpers after `POST`:**
      ```ts
      // One code per asset, its first reason in getBulkMoveVerdict's order (plan 4 P4-R4).
      function bulkMoveRefusal(asset: { ownershipType: string; status: { name: string } }, facts: { outstanding: boolean; openCheckout: boolean }): BulkMoveBlockedCode | null
      // the room read of transfer's checkTransferDestinations; before the transaction and inside it (plan 4 P4-R14)
      async function assertActiveDestination(db: Pick<Prisma.TransactionClient, "location">, toLocationId: string): Promise<void>
      class BulkMoveDestinationInactiveError extends Error // super("ASSET_TRANSFER_DESTINATION_INACTIVE"); fields in the class body
      ```
      - `bulkMoveRefusal` returns:
        - `"ASSET_COMPONENT_OUTSTANDING"` when `facts.outstanding`;
        - the ownership code when `getAssetOperationOwnershipRefusal("move", asset.ownershipType) === "ASSET_LICENSE_MOVE_NOT_ALLOWED"`;
        - otherwise `getBulkCustodyChangeError({ statusName: asset.status.name, hasActiveCheckout: facts.openCheckout, changesCustodian: false })`, narrowed to `"ASSET_ACTIVE_CHECKOUT_EXISTS" | "ASSET_STATUS_TRANSFER_NOT_ALLOWED"`, else `null`.
      - `ownershipType` is a non-null `String` (`prisma/schema.prisma:270`).
    - **The header comment of the pre-checks** names the order of Decision 5.
    - The file is CRLF: edit it with the Edit tool, not `sed -i`.
  - **3d. The catalog.** Find by content and delete `"Disposed or retired assets cannot be moved.": "disposedAssetCannotMove",` and `"Some assets already have active checkouts": "someAssetsOnCheckout",`. Do not delete by line number: Task 2 inserted `"Invalid list"` above the second one.
  - **3e. Messages.** Write `tx-group/msg/p4-t3-messages.json`:
    ```json
    { "delete": ["apiErrors.disposedAssetCannotMove", "apiErrors.someAssetsOnCheckout"] }
    ```
    Run `node scripts/messages-edit.mjs <that file>`. It prints `messages updated: 0 th, 0 en, 2 deleted`. No key is added.

- [ ] **Step 4: Run the tests and the checks.**
  - Re-run the Step 2 command; every test passes.
  - Run the neighbours: `node --test tests/asset-transaction-cancellation-routes.test.ts tests/asset-component-sync-routes.test.ts tests/asset-movement-labels.test.ts tests/asset-component-sync.test.ts tests/bulk-move-blocked.test.ts tests/e2e-fixes.test.ts tests/e2e-cross-cutting.test.ts tests/asset-history-rules.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`. Every test passes with no edit.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - There is no E2E here. `e2e/transactions/bulk-move.spec.ts` still waits for a 200 and moves three Ready assets to a second room, so it is not affected. Task 8 writes the docs: the answer shape and the 409s in the API docs, and the changelog.

- [ ] **Step 5: Commit.**
```
git add src/app/api/assets/bulk-move/route.ts src/lib/validations/asset-operations.ts src/lib/asset-operation-claim.ts src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/asset-bulk-custody-routes.test.ts tests/asset-operation-claim.test.ts tests/api-error-catalog.test.ts
git commit -m "feat(bulk-move): the save takes at most 100 assets, names every refused asset in one 409 with its own code (the open handover included), refuses an inactive room before and inside the transaction, and writes nothing for an asset already in the room (group 3 spec §10.2, §10.3; plan 4 P4-R4, P4-R5, P4-R10, P4-R14, P4-R15, P4-R16)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Shared parts: Pagination pages in place with buttons, the review dialog takes a field, and DESIGN.md writes the bulk-move exception (spec §5, §10.1, §10.2; P4-R12, P4-R17, P4-R19, P4-R23)

Task 6 needs three things the shared parts cannot do today, and this task adds them before the page is built:
- **Paging without links.** `Pagination` is href-only (`src/components/ui/pagination.tsx:22-34`, `:72-73`, `:79-103`). The bulk-move list pages on the client, so the ticks survive a page change.
- **A field in the review.** `OperationReviewDialog` draws only its label and value items (`operation-review-dialog.tsx:47-56`), and §10.2 moves หมายเหตุ into the review.
- **A written exception.** DESIGN.md says a selection belongs to the page on screen and that a page lives in the URL (`DESIGN.md:635`). ย้ายที่ตั้งหลายรายการ breaks both on purpose.

This task touches no page, form, route or message. Every line number below is from `020a8533`; Tasks 1-3 do not touch these files.

**The rulings this task carries:**
- **P4-R12 (the shared-part side):** `Pagination` gains a button mode (`onPrevious` / `onNext`), which the bulk-move list uses because it has no hrefs.
- **P4-R17 (the shared-part side):** `OperationReviewDialog` gains a `children` slot, drawn after the item list and inside the body. Task 6 puts the review's sentence lines (a `<ul>`) and then หมายเหตุ (`#bulk-move-remark`) there. The lines are not dialog items, because the dialog keys its items by label; the items stay ทรัพย์สิน, ย้ายไป and เหตุผล, and Task 6 passes `description={null}`.
- **P4-R19 (the docs side):** the bulk-move page is a focus-task route, so it passes `className` to `DesktopSelectionBar` to drop the bar's bottom-nav offset. This task writes only the sentence; Task 6 picks the class.
- **P4-R23:** DESIGN.md gains one written exception to the selection rule. The phrases that `tests/desktop-selection-bar.test.ts:29-41` pins stay word for word.
- **Global (Design):** shared parts only. Nothing fades (list-frame guard LT5, visual-foundation guard N4), there is no raw `<button>` outside its owners (visual-foundation guard N3), and there is no local look-alike (LN2).
- **Appendix Z (the controller's rulings on the cross-check):** Z6 (the review's `<ul>` has no border of its own; it and the หมายเหตุ field sit in one `grid gap-3` wrapper inside `children`, so this task's wrapper border is the only line under the items), Z17 (`Pagination` is a union, links or buttons, never both; the button mode takes no `pageSizes`, uses the shared `Button`, `aria-disabled` with no handler at either end, and stays server-safe; DESIGN.md records the change from "a disabled one is a `span`", and the bulk-move exception covers both the selection rule and `page`/`pageSize` in the URL), Z19 (the review's sentences are lines in `children`, not items).

**Decisions** (the skeleton leaves these open; each is final):
1. **Pagination stays server-safe, with no `"use client"`.** The button mode adds no hook. A client caller passes the handlers, as `DesktopSelectionBar`'s `onClear` already does (tests/desktop-selection-bar.test.ts:5-6). Next's rule (`node_modules/next/dist/docs/01-app/02-guides/server-and-client-boundary.md:157-164`) says a module that a client component imports joins the client graph, and only a Server Component passing a function throws. No server caller can do that here, because the server callers pass hrefs (decision 2). The pins `tests/asset-register-building-blocks-ui.test.ts:11` and `tests/list-primitives-ui.test.ts:145` therefore hold.
2. **Links or buttons, never both** (Z17, the skeleton's Interfaces block). `PaginationProps` becomes a union:
   - the link mode takes both hrefs and no handlers;
   - the button mode takes both handlers, no hrefs and no `pageSizes`, because the page-size options are links.

   All 21 importers pass both hrefs today, so tsc accepts them unchanged. The skeleton's names and handler types are kept.
3. **In button mode, previous and next are always the shared `Button` (`variant="outline" size="sm"`).**
   - At either end the button gets `aria-disabled` and no handler; it does **not** turn into the link mode's `<span>`. A button that turned into a span (or got a real `disabled`) would lose focus when the person reaches the last page with the keyboard, and in place there is no navigation to put focus anywhere.
   - `buttonVariants`' `aria-disabled:` classes (`button-variants.ts:18`) give it the shared disabled look without opacity, so LT5 and N4 hold.
   - It is `Button`, not a raw `<button>`, because N3 allows a raw button only in its owners (`tests/visual-foundation-guards.test.ts:369`, `:392-396`).
   - The link mode is unchanged: its disabled control stays a `<span aria-disabled="true">`. DESIGN.md's Foot bullet, which says "A disabled one is a `span`", gains the sentence that in button mode a disabled one stays a focusable `Button` (`FOOT_BUTTONS`, Z17).
4. **Where `children` go, and their look.** `children` render after `</dl>`, inside `AccessibleDialogBody`, as `{children ? <div className="border-t border-border py-3">{children}</div> : null}`, so what they hold reads as one more row under the items' divider. Task 6's children are one `<div className="grid gap-3">` holding the lines `<ul>` (no border of its own, `grid gap-1.5 text-sm text-foreground`) and the หมายเหตุ field, so this wrapper's border is the only line (Z6). The dialog adds no `disabled` while busy: Task 6 passes `disabled={saving}` to its own Textarea.
5. **Docs:**
   - DESIGN.md gets three appended sentences: the Foot bullet `:625`, the Pages on the server bullet `:635` and the bar's "The caller" bullet `:648`.
   - docs/14 gets a longer Pagination row (`:80`) and a **new** `OperationReviewDialog` row. There is no row for it today; the new one goes right after the OperationFormFrame row (`:104`), before FormContextBanner (`:105`).
   - The exception at `:635` covers both rules of that bullet (Z17): the selection that belongs to the page on screen, and "`page` and `pageSize` … live in the URL", which would otherwise contradict P4-R12. Bulk-move's `page` and filters are client state, it has no `pageSize`, and a page past the end clamps instead of redirecting.
6. **No messages.** The labels come from the caller (`common.previous`, `common.next`, `common.pageOf`, `common.showingRange`, all of which exist). No `p4-t4-messages.json` is written.

**Files:**
- Modify `src/components/ui/pagination.tsx` (CRLF):
  - the import block `:1-3` adds `import { Button } from "@/components/ui/button"`;
  - `PaginationProps` `:22-34` becomes `PaginationBaseProps` plus the union (Step 3);
  - the comment `:36-39` gains the button mode;
  - the destructuring `:47`;
  - the two `<PaginationControl … />` lines `:72-73` gain `onClick`;
  - `PaginationControl` `:79-103` gains the button branch first, and its span guard becomes `!enabled || href === undefined`.
- Modify `src/components/ui/operation-review-dialog.tsx` (CRLF):
  - the props type `:8-20` gets `children?: ReactNode` last, with a doc comment;
  - the destructuring `:22-33` gets `children,` after `onConfirm,`;
  - the body `:47-56` gets one line after `</dl>`.
- Modify `DESIGN.md` (CRLF): `:625`, `:635` and `:648`, each with one sentence appended at the end of the line (Step 3).
- Modify `docs/14_UI_UX_DESIGN_SYSTEM.md` (CRLF): the row `:80` gets a longer tail; a new row is inserted after `:104`.
- Create `tests/bulk-move-shared-parts.test.ts`.
- Test: `tests/list-primitives-ui.test.ts:159-160` is rewritten (below).

**Existing pins this task breaks, rewritten in this commit:**
- `tests/list-primitives-ui.test.ts:159`: the regex ends in `label=\{labels\.previous\} \/>`, and the line gains `onClick={onPrevious}`. The new assertion is:
  `assert.match(source, /<PaginationControl href=\{previousHref\} enabled=\{page > 1\} rel="prev" label=\{labels\.previous\} onClick=\{onPrevious\} \/>/)`
- `tests/list-primitives-ui.test.ts:160`: the same change for next. The new assertion is:
  `assert.match(source, /<PaginationControl href=\{nextHref\} enabled=\{page < totalPages\} rel="next" label=\{labels\.next\} onClick=\{onNext\} \/>/)`

**These stay green with no edit.** Name any that does not in the report.
- `tests/e2e-repair.test.ts:138-139`: `/<PaginationControl href=\{nextHref\} enabled=\{page < totalPages\} rel="next"/` has no end anchor, so the appended `onClick` keeps it. `/<Link href=\{href\} rel=\{rel\}/` is kept, because the Link return is not touched.
- `tests/list-primitives-ui.test.ts:141-158, :161-164`:
  - server-safe with no hooks; no `opacity-`, `shadow-*`, chevrons or `bg-muted`;
  - `controlClasses`, the nav and the live line;
  - the page-size constants and `aria-current`;
  - the span `<span aria-disabled="true" className={controlClasses}>` and the Link line;
  - `pageSizes?: readonly PaginationPageSize[]`, which stays in `PaginationBaseProps`.
- `tests/asset-register-building-blocks-ui.test.ts:8-17` (no `"use client"`, the nav, `aria-disabled="true"`, `min-h-11`, `<Link`, no `opacity-`) and `:42-49`.
- `tests/maintenance-pagination-ui.test.ts:15-16` (`<p aria-live="polite"`).
- `tests/list-frame-guards.test.ts`:
  - LT4: the owner is `pagination.tsx` (`:128`), and `PaginationControl` does not end in `Pagination`, so it is not counted (`:27-35`);
  - LT5: the new code has no opacity;
  - LN1: `pagination.tsx` is in `NAV_PRIMITIVES` (`:120`);
  - LN2: the owner list (`:132`); the task adds no new function named like a shared part.
- `tests/visual-foundation-guards.test.ts:392-396` (N3: `Button`, no raw `<button>`), `:404-409` (N4) and the N5 height rule (`Button` with `size="sm"` and no extra classes).
- `tests/list-pages-ui.test.ts` (every `<Pagination` caller pin), plus `:459-470`, the data-quality review queue's own client pager. It stays as it is; moving it onto the button mode is not part of this plan.
- `tests/asset-register-table-ui.test.ts:95, :246`, `tests/audit-findings-selection-ui.test.ts:99`, `tests/audit-round-result-drilldown.test.ts:88`, `tests/disposal-route-structure.test.ts:17`, `tests/supplier-adaptive-ui.test.ts:41`.
- `tests/asset-operation-confirmation-ui.test.ts:5-17, :25-33, :43-51`:
  - `:45` matches `<AccessibleDialogBody className="py-2">\n\s+<dl …>`, and the new line goes after `</dl>`;
  - `:46` the footer;
  - `:47` no `disabled={busy}`, `sm:grid-cols-2` or `px-4 py-2`; the new wrapper is `border-t border-border py-3`;
  - `:48-50` no host passes `closeLabel=`.
- `tests/accessible-dialog.test.ts:70-76` (`\n  description: ReactNode\n`, `\n  closeLabel?: string\n`).
- `tests/checkin-form-rules.test.ts:177`, `tests/checkout-form-rules.test.ts:170`, `tests/operations-sweep-ui.test.ts:84`, `tests/transfer-form-ui.test.ts:96`, `tests/checkin-late-return-rules.test.ts:193`: the three hosts self-close `<OperationReviewDialog … />` and are not edited.
- `tests/desktop-selection-bar.test.ts:25-50`: every phrase it pins stays in the block (`:29-40`), and so does the sentence at `:41`. The new text is appended after them, and the block still ends at "**Asset register pattern (2026-10-07).**".
- `tests/operation-form-parts-ui.test.ts:98-101`: the OperationFormFrame row stays after FormSection, and the new row goes after it.
- `tests/mobile-action-bar.test.ts:80-82`, `tests/searchable-select-accessibility.test.ts:58, :72`, `tests/phase2d-docs.test.ts:46-47` (no 2D-stale phrase), `tests/dark-mode-docs.test.ts:61-63, :157`.

**Interfaces:**
- Consumes:
  - `Button` (`src/components/ui/button.tsx:32-66`). It has no directive and no hook. Its `aria-disabled` and `onClick` pass through (`:41-59`), and its default `type` is `"button"` (`:53`).
  - `buttonVariants`' disabled look (`src/components/ui/button-variants.ts:18`: `aria-disabled:pointer-events-none aria-disabled:border-border aria-disabled:bg-background aria-disabled:text-faint-foreground`).
  - `AccessibleDialogBody` (`src/components/ui/accessible-dialog.tsx`), as used at `operation-review-dialog.tsx:47`.
- Produces (the names are the skeleton's; Task 6 imports them, and decision 2 narrows the types):
  ```ts
  // src/components/ui/pagination.tsx (server-safe, no directive, no hook)
  type PaginationBaseProps = {
    page: number
    totalPages: number
    labels: PaginationLabels
    pageSize?: number
    pageSizes?: readonly PaginationPageSize[]
    className?: string
  }
  type PaginationLinkProps = { previousHref: string; nextHref: string; onPrevious?: never; onNext?: never }
  type PaginationButtonProps = { previousHref?: never; nextHref?: never; onPrevious: () => void; onNext: () => void; pageSizes?: never }
  export type PaginationProps = PaginationBaseProps & (PaginationLinkProps | PaginationButtonProps)
  // Button mode: previous/next are <Button variant="outline" size="sm">, aria-disabled with no handler at either end.

  // src/components/ui/operation-review-dialog.tsx ("use client", as today)
  // OperationReviewDialogProps gains, last:  children?: ReactNode   // drawn after the <dl>, inside AccessibleDialogBody
  ```
  - Task 6 calls `<Pagination page={listPage.page} totalPages={…} onPrevious={…} onNext={…} labels={{ navigation, previous, next, pageOf, range }} />` inside `DataTableFoot`, with no `pageSizes` (the size is fixed at 25).
  - Task 6 calls `<OperationReviewDialog … description={null} items={/* ทรัพย์สิน, ย้ายไป, เหตุผล */}><div className="grid gap-3">{/* <ul data-bulk-move-review-lines> + หมายเหตุ: <Field id="bulk-move-remark"> + <Textarea> */}</div></OperationReviewDialog>` (Z6, Z19).

- [ ] **Step 1: Write the failing tests.**
  - In `tests/list-primitives-ui.test.ts`, rewrite `:159-160` to the two assertions listed above.
  - Create `tests/bulk-move-shared-parts.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 3 plan 4 Task 4: what ย้ายที่ตั้งหลายรายการ needs from the shared parts. Pagination's button mode (P4-R12), the
// review dialog's children (P4-R17) and DESIGN.md's one exception to the page-bound selection (P4-R23).
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGINATION = "src/components/ui/pagination.tsx"
const REVIEW = "src/components/ui/operation-review-dialog.tsx"

const FOOT_BUTTONS = " A client list that pages in place (ย้ายที่ตั้งหลายรายการ) passes `onPrevious` and `onNext` instead of the hrefs, and no page sizes: previous and next are then outline `sm` `Button`s, and a disabled one stays a focusable `Button` instead of the `span`, `aria-disabled` with no handler, so keyboard paging keeps its focus."
const PAGES_EXCEPTION = " One written exception: ย้ายที่ตั้งหลายรายการ keeps its ticks across pages and filters, as a snapshot of each ticked row keyed by asset id, because its job is to gather assets from several rooms into one move (at most 100); its `page` (25 rows, no `pageSize`) and its filters are client state that its own list endpoint answers, not the URL, and a page past the end clamps to the last (group 3 plan 4)."
const CALLER_EXCEPTION = " ย้ายที่ตั้งหลายรายการ is the exception (**Pages on the server**): its ticks outlive the page and the filters, so its bar, its review and its save read the snapshots, never the rows on screen; it is a focus-task route with no Mobile Field Navigation, so it passes `className` to drop the bar's bottom offset below `lg`."
const DOCS14_PAGER_TAIL = "; a client list that pages in place passes `onPrevious` and `onNext` and no hrefs or page sizes (ย้ายที่ตั้งหลายรายการ: 25 rows, a page past the end clamps) |"
const DOCS14_REVIEW_ROW = "| The last check before a transaction saves | `OperationReviewDialog`, its items from `buildOperationReviewSummary` (`src/lib/asset-operation-review.ts`) on the single-asset pages | rendered after the page's `</form>`, never inside it; one label and value per item, and a value may be a node; focus opens on the confirm, which keeps it while `busy`; `children` sit under the items for what is not one label and value (ย้ายที่ตั้งหลายรายการ's sentence lines and its หมายเหตุ); a server refusal on a field closes it first and then focuses the field (`waitForDialogToClose`) |"

test("Pagination takes links or buttons, never both; a button pages in place and keeps focus at either end (group 3 spec §10.1; P4-R12)", () => {
  const source = read(PAGINATION)
  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /^type PaginationLinkProps = \{ previousHref: string; nextHref: string; onPrevious\?: never; onNext\?: never \}$/m)
  assert.match(source, /^type PaginationButtonProps = \{ previousHref\?: never; nextHref\?: never; onPrevious: \(\) => void; onNext: \(\) => void; pageSizes\?: never \}$/m)
  assert.match(source, /^export type PaginationProps = PaginationBaseProps & \(PaginationLinkProps \| PaginationButtonProps\)$/m)
  assert.match(source, /export function Pagination\(\{ page, totalPages, previousHref, nextHref, onPrevious, onNext, labels, pageSize, pageSizes, className \}: PaginationProps\)/)
  assert.match(source, /<PaginationControl href=\{previousHref\} enabled=\{page > 1\} rel="prev" label=\{labels\.previous\} onClick=\{onPrevious\} \/>/)
  assert.match(source, /<PaginationControl href=\{nextHref\} enabled=\{page < totalPages\} rel="next" label=\{labels\.next\} onClick=\{onNext\} \/>/)
  const control = source.slice(source.indexOf("function PaginationControl("))
  assert.match(control, /if \(onClick\) \{\n\s+return \(\n\s+<Button variant="outline" size="sm" aria-disabled=\{enabled \? undefined : true\} onClick=\{enabled \? onClick : undefined\}>\n\s+\{label\}\n\s+<\/Button>\n\s+\)\n\s+\}\n\s+if \(!enabled \|\| href === undefined\) \{/)
  assert.ok(control.indexOf("if (onClick)") < control.indexOf('<span aria-disabled="true" className={controlClasses}>'), "the button mode is decided before the link mode's span")
  // Still server-safe: the client caller passes the handlers, as DesktopSelectionBar's onClear. No raw <button> (VFG N3),
  // no real disabled (it would drop focus at the last page), nothing that fades (LFG LT5, VFG N4).
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|LayoutEffect|Context|Ref)\b/)
  assert.doesNotMatch(source, /<button\b|(?<![\w-])disabled=\{|opacity-/)
})

test("OperationReviewDialog takes children under its items, inside the body; the three single-asset forms pass none (group 3 spec §10.2; P4-R17)", () => {
  const source = read(REVIEW)
  assert.match(source, /\n  onConfirm: \(\) => void\n  \/\*\* [^\n]+ \*\/\n  children\?: ReactNode\n\}/)
  assert.match(source, /\n  onConfirm,\n  children,\n\}: OperationReviewDialogProps\) \{/)
  assert.match(source, /<\/dl>\n\s+\{children \? <div className="border-t border-border py-3">\{children\}<\/div> : null\}\n\s+<\/AccessibleDialogBody>/)
  for (const host of ["checkout-form", "checkin-form", "transfer-form"]) {
    assert.doesNotMatch(read(`src/components/asset-operations/${host}.tsx`), /<\/OperationReviewDialog>/, host)
  }
})

test("DESIGN.md writes the bulk move's one exception to the page-bound selection, and Pagination's button mode (group 3 spec §10.1; P4-R12, P4-R19, P4-R23)", () => {
  const lines = read("DESIGN.md").split("\n")
  const line = (start: string) => lines.find((text) => text.startsWith(start)) ?? ""
  assert.ok(line("- **Foot:** `DataTable footer={<Pagination … />}`").endsWith("(guards LT4, LT5)." + FOOT_BUTTONS), "Foot")
  assert.ok(line("- **Pages on the server:**").endsWith("(the disposal providers take `selectionKey`, the findings selection provider takes it as its `key`)." + PAGES_EXCEPTION), "Pages on the server")
  assert.ok(line("- **The caller** mounts it").endsWith("The provider that holds the ticks takes `selectionKey` as its `key`." + CALLER_EXCEPTION), "The caller")
})

test("docs/14 names Pagination's button mode and gives OperationReviewDialog its own row after the operation frame (group 3 spec §10.1, §10.2; P4-R12, P4-R17)", () => {
  const lines = read("docs/14_UI_UX_DESIGN_SYSTEM.md").split("\n")
  const at = (start: string) => lines.findIndex((text) => text.startsWith(start))
  assert.ok(lines[at("| Page links under a table | `Pagination`")].endsWith("counts above the list cover every page" + DOCS14_PAGER_TAIL))
  const review = at("| The last check before a transaction saves | `OperationReviewDialog`")
  assert.equal(review, at("| The frame of ส่งมอบ, รับคืน and โอนย้าย | `OperationFormFrame`") + 1, "right after the frame's row")
  assert.equal(lines[review + 1].startsWith("| The record a form is about | `FormContextBanner`"), true, "before FormContextBanner")
  assert.equal(lines[review], DOCS14_REVIEW_ROW)
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/bulk-move-shared-parts.test.ts tests/list-primitives-ui.test.ts`. Expected:
  - `bulk-move-shared-parts`: 4 tests, all failing.
    - The Pagination test fails first on the `Button` import.
    - The dialog test fails on the `children?: ReactNode` prop. Its host loop would pass today.
    - The DESIGN.md test fails at "Foot".
    - The docs/14 test fails on the Pagination row's tail.
  - `list-primitives-ui`: only "Pagination puts the range left, …" fails, at the rewritten `:159`. Every other test in the file passes.

- [ ] **Step 3: Implement.**
  - **3a. `src/components/ui/pagination.tsx`.**
    - Import `Button` from `@/components/ui/button`, after `buttonVariants`.
    - Replace `PaginationProps` `:22-34` with the Produces block. Keep the existing doc comments on `page`, `pageSize` and `pageSizes`. Above the union, add the comment `/** Links for a server list; buttons for a client list that pages in place (ย้ายที่ตั้งหลายรายการ, group 3 plan 4). Never both. */`.
    - Rewrite the comment `:36-39`. Keep its meaning and add: "In button mode previous and next are `Button`s that stay focusable at either end (`aria-disabled`, no handler), so keyboard paging keeps its focus. Server-safe: no directive and no hooks; a client caller passes the handlers."
    - `:47` destructures `onPrevious, onNext` after `nextHref`, in the order the test pins.
    - In `:72-73`, append `onClick={onPrevious}` and `onClick={onNext}` before ` />`.
    - `PaginationControl` takes `{ href?: string; enabled: boolean; rel: "prev" | "next"; label: string; onClick?: () => void }`, in this order:
      1. `if (onClick)` returns the `Button` exactly as the test pins it;
      2. `if (!enabled || href === undefined)` returns the existing span, unchanged;
      3. otherwise, the existing Link return, unchanged. `href` is narrowed to `string` here.

      `rel` is used only by the Link.
  - **3b. `src/components/ui/operation-review-dialog.tsx`.**
    - After `onConfirm: () => void`, add:
      ```ts
        /** Under the items, inside the body: what is not one label and value (ย้ายที่ตั้งหลายรายการ's sentence lines and หมายเหตุ; group 3 plan 4 P4-R17). */
        children?: ReactNode
      ```
    - Destructure `children,` after `onConfirm,`.
    - After `</dl>` (`:55`), add `{children ? <div className="border-t border-border py-3">{children}</div> : null}` at the `dl`'s indent.
    - Nothing else changes. `ReactNode` is already imported (`:3`).
  - **3c. `DESIGN.md`.** Append to the end of each line, using the Edit tool (no `sed`, the file is CRLF), exactly the test's constants. Each constant starts with a space.
    - `:625`, after "(guards LT4, LT5).": `FOOT_BUTTONS`.
    - `:635`, after "…takes it as its `key`).": `PAGES_EXCEPTION`.
    - `:648`, after "…takes `selectionKey` as its `key`.": `CALLER_EXCEPTION`.
  - **3d. `docs/14_UI_UX_DESIGN_SYSTEM.md`.**
    - In row `:80`, replace the final ` |` after "counts above the list cover every page" with `DOCS14_PAGER_TAIL`.
    - Insert `DOCS14_REVIEW_ROW` as a new line between `:104` and `:105`.

- [ ] **Step 4: Run the focused tests, then the neighbours and the full checks.**
  - Re-run the Step 2 command; every test passes.
  - Neighbours: `node --test tests/asset-register-building-blocks-ui.test.ts tests/e2e-repair.test.ts tests/maintenance-pagination-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-pages-ui.test.ts tests/accessible-dialog.test.ts tests/asset-operation-confirmation-ui.test.ts tests/desktop-selection-bar.test.ts tests/operation-form-parts-ui.test.ts tests/mobile-action-bar.test.ts tests/searchable-select-accessibility.test.ts tests/phase2d-docs.test.ts tests/dark-mode-docs.test.ts tests/form-migration-guards.test.ts`. Every test passes.
  - Then `npm test`, `npx tsc --noEmit` (the 21 importers of `pagination.tsx` must compile against the union unchanged) and `npm run lint` (0 errors). If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - No E2E: nothing on screen changes until Task 6 uses the new modes. The link-mode markup is the same as before.

- [ ] **Step 5: Commit.**
```
git add src/components/ui/pagination.tsx src/components/ui/operation-review-dialog.tsx DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md tests/bulk-move-shared-parts.test.ts tests/list-primitives-ui.test.ts
git commit -m "feat(ui): Pagination pages in place with focusable buttons for a client list, the review dialog takes a field under its items, and DESIGN.md writes ย้ายที่ตั้งหลายรายการ's one exception to the page-bound selection (group 3 spec §10.1, §10.2; plan 4 P4-R12, P4-R17, P4-R19, P4-R23)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: ย้ายที่ตั้งหลายรายการ's form rules: the selection across pages, the cap, the header state, a ticked row that comes back refused, the review's counts and the result line (spec §10.1, §10.2; P4-R1, P4-R3, P4-R8, P4-R9, P4-R10, P4-R15, P4-R17, P4-R18)

Every decision the bulk-move page makes about ticks is made in one pure, client-safe file, `src/lib/bulk-move-form-rules.ts`:
- what a tick, an untick and "เลือกทั้งหมดในหน้านี้" do to the selection, and where the cap stops them;
- the header checkbox's state for the page on screen, and whether each row's box is enabled;
- how a fetched page refreshes the snapshots of ticked rows;
- the review's numbers, read from the snapshots only, never from the rows on screen;
- reading the save's answer and the result line's numbers.

Task 6 renders these values and writes the words. This task changes no existing file and no message: Task 6's change file `p4-t6-messages.json` is the only source of the `bulkMove.*` values, so there is no `p4-t5-messages.json`. Every line number below is HEAD `020a8533`'s; Task 1's file does not exist there, so its names are cited from the skeleton's Interfaces block.

**The rulings this task carries:**
- **P4-R1:** an installed ส่วนควบ ticked alone can move. The review counts "ส่วนควบที่เลือกเอง N รายการ ย้ายแยกจากเครื่องหลัก": ticked rows that move (not already in the room) and are a component (`componentOf` set) whose parent is not ticked.
- **P4-R3:** the review's M is the number of **distinct** component ids taken from the `travellingComponents` of the ticked rows that are not already in the room, minus ids that are themselves ticked, minus components whose `currentLocationId` equals the room. The result line's M is the answer's `componentSync.updated`.
- **P4-R8:** "นำรายการที่ย้ายไม่ได้ออก" unticks every refused id, wherever its row is (`removeBulkMoveIds`).
- **P4-R9:** a fetched page that shows a ticked row replaces its snapshot with the fresh row. The row stays ticked, its box stays enabled (so it can be unticked) even when it is now refused, and the save names it.
- **P4-R10:** at most `bulkMoveMaxAssets` (100) ids. Once 100 are ticked every unticked box is disabled with the cap reason. "เลือกทั้งหมดในหน้านี้" ticks the page's eligible rows in order up to the cap and then reports the cap.
- **P4-R15:** an asset already in the room is counted as "อยู่ที่ตั้งนี้แล้ว N รายการ ไม่บันทึกการย้าย"; the route writes nothing for it and syncs none of its components.
- **P4-R17:** the review lists every ticked tag, comma-joined, then the lines that apply: ส่วนควบย้ายตาม (M > 0), อยู่ที่ตั้งนี้แล้ว, ย้ายไปสาขาอื่น (ticked rows that move, by `branchId`, never by name), ส่วนควบที่เลือกเอง.
- **P4-R18:** the result line reads moved, then components when `componentSync.updated` > 0, then unchanged when `unchanged` > 0.
- **Appendix Z (the controller's rulings on the cross-check):** Z2 (the header box's disabled rule, which Task 6 writes and pins), Z3 (`capped` is informational; the cap line follows the selection's size), Z11 (`otherBranch` and `componentsAlone` count only ticked rows that move; P4-R1 and P4-R17 read "ticked rows that move").

**Review Focus this task tests:** 1 (the review's M with a ticked component and one already in the room), 2 (ticks on two pages under two filters, each header showing its own page), 4 (the 101st tick and "เลือกทั้งหมดในหน้านี้" with 90 ticked).

**Decisions** (the skeleton leaves these open; each is binding for Task 6):
- **Order.** The selection is a `Map` and its insertion order is the order rows were ticked. A refresh replaces a snapshot with `Map.set` on the existing key, so the row keeps its place. `tags` follows that order.
- **Nothing changes, nothing new.** Every function returns its input `selection` itself (the same instance) when it changes nothing, so React skips the render. It never mutates its input.
- **`capped`** is true only when at least one tick the caller asked for was refused because the selection already held `bulkMoveMaxAssets`. Reaching exactly 100 is not `capped`; the boxes then lock through `getBulkMoveRowLock`. `capped` is informational and has no required reader (Z3): the page shows `bulkMove.capReached` in the bar's `status` whenever `selection.size >= bulkMoveMaxAssets` (P4-R10; Task 6 Decision 9).
- **A tick is refused without a word** when the row is already ticked or is not `eligible` (its box is disabled; this is only the guard). An untick always works, refused or not.
- **The header state** (`getBulkMovePageState`), over the rows of the page on screen only:
  - `"none"` when no row of the page is ticked;
  - `"some"` when a row is ticked and an eligible unticked row of the page could still be ticked (the selection is below the cap);
  - `"all"` otherwise: a row is ticked and nothing more on the page can be ticked, because every eligible row is ticked or the cap is reached (disposal-bulk-approval's slice-to-cap reading, `src/components/disposal/disposal-bulk-approval.tsx:151-153`, `:240-253`).
  - Task 6's header calls `setBulkMovePage(selection, rows, state !== "all")`, so a header at the cap never sticks. Its header box is `disabled={disabled || (pageState === "none" && rows.every((row) => getBulkMoveRowLock(selection, row) !== null))}` (Z2; Task 6 pins it): a page whose ticked row came back refused (`"all"`) can still be unticked from the header, and a page with nothing tickable at the cap is disabled.
- **Untick a page** (`setBulkMovePage(…, false)`) removes every id of the page that is ticked, a refused one included (P4-R9).
- **The row lock** (`getBulkMoveRowLock`): a ticked row → `null`; else a row that is not `eligible` → `"blocked"` (its own reason wins over the cap); else a full selection → `"cap"`; else `null`.
- **The refresh** replaces the snapshot of **every** ticked row on the fetched page, eligible or not, so the review reads fresh rooms and components. It never ticks or unticks. A ticked asset that no longer appears in any list keeps its old snapshot; the save answers for it.
- **The review's move lines skip rows already in the room.** A row whose `locationId` equals the room counts in `alreadyThere` only: its components do not follow (P4-R15), and it adds nothing to `otherBranch` or `componentsAlone`, because nothing about it is written. `assets` and `tags` count every ticked row. The controller ruled this way (Z11): P4-R1 and P4-R17 now read "ticked rows that move".
- **`componentsAlone`** asks only whether `componentOf.parentId` is ticked (on any page), not whether the parent moves.
- **`readBulkMoveSaveAnswer`** accepts a body whose `updated`, `unchanged` and three `componentSync` numbers are non-negative integers, and returns a new object with exactly those six numbers (extra fields dropped). Anything else, today's answer without `unchanged` included, reads `null`. What the page does with a `null` 200 is Task 6's call.
- **`getBulkMoveResultParts`** maps `updated` → `moved`, `componentSync.updated` → `components`, `unchanged` → `unchanged`. `skipped` and `movements` are not shown. "ย้ายแล้ว 0 รายการไป …" when every ticked asset was already there is accepted: it is true, and the unchanged part follows it.

**Files:**
- Create: `src/lib/bulk-move-form-rules.ts` (pure, client-safe; CRLF like `src/lib/transfer-form-rules.ts`).
- Create: `tests/bulk-move-form-rules.test.ts` (CRLF like `tests/transfer-form-rules.test.ts`).
- Modify: none. No messages.

**Existing pins this task breaks, rewritten in this commit:** none.

**These stay green with no edit.** Name any that does not in the report.
- `tests/api-error-catalog.test.ts:69-80` walks `src/lib` for `error:` / `message:` literals; the new file has none (it reads no `error` field).
- `tests/bulk-move-blocked.test.ts` (this task only reads `readBulkMoveBlocked` in a test).
- Task 1's tests of `src/lib/bulk-move-list-rules.ts`: this task imports from it and changes nothing there.
- `tests/thai-glossary.test.ts` and `tests/messages-parity.test.ts`: no message changes.

**Interfaces:**
- Consumes:
  - **Task 1** (`src/lib/bulk-move-list-rules.ts`, the skeleton's Interfaces block): `export const bulkMoveMaxAssets = 100`; `type BulkMoveListRow` (fields read here: `id`, `assetTag`, `locationId`, `branchId`, `eligible`, `travellingComponents`, `componentOf`); `type BulkMoveTravellingComponent = { id: string; currentLocationId: string | null }`; `type BulkMoveRoomOption = { id: string; label: string; branchId: string }`.
  - **Existing** (`src/lib/bulk-move-blocked.ts:4-17`): `BulkMoveBlockedAsset = { assetId; assetTag; code }` and `readBulkMoveBlocked(payload)`. The test feeds its ids to `removeBulkMoveIds`, as Task 6 will.
  - **Facts the counts mirror:** the sync moves only links `status: "installed"`, `removedAt: null`, component active (`src/lib/asset-component-sync.ts:115-122`); it skips a component with its own open handover (`:159-161`) and writes nothing for one already at the destination (`:164-165`). The route's answer today is `{ updated: assets.length, componentSync }` (`src/app/api/assets/bulk-move/route.ts:136`); Task 3 adds `unchanged`.
- Produces (the skeleton's names and types, exactly):
  ```ts
  // src/lib/bulk-move-form-rules.ts. Values only from ./bulk-move-list-rules.ts; types with `import type` or inline `type`.
  export type BulkMoveSelection = ReadonlyMap<string, BulkMoveListRow>
  export type BulkMoveTickResult = { selection: BulkMoveSelection; capped: boolean }
  export function toggleBulkMoveRow(selection: BulkMoveSelection, row: BulkMoveListRow, checked: boolean): BulkMoveTickResult
  export function setBulkMovePage(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[], checked: boolean): BulkMoveTickResult
  export function getBulkMovePageState(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[]): "none" | "some" | "all"
  export function getBulkMoveRowLock(selection: BulkMoveSelection, row: BulkMoveListRow): "blocked" | "cap" | null // null = the box is enabled
  export function refreshBulkMoveSelection(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[]): BulkMoveSelection
  export function removeBulkMoveIds(selection: BulkMoveSelection, ids: readonly string[]): BulkMoveSelection
  export type BulkMoveReviewCounts = { assets: number; tags: string[]; componentsFollow: number; alreadyThere: number; otherBranch: number; componentsAlone: number }
  export function getBulkMoveReviewCounts(selection: BulkMoveSelection, room: BulkMoveRoomOption): BulkMoveReviewCounts
  export type BulkMoveSaveAnswer = { updated: number; unchanged: number; componentSync: { updated: number; skipped: number; movements: number } }
  export function readBulkMoveSaveAnswer(payload: unknown): BulkMoveSaveAnswer | null
  export function getBulkMoveResultParts(answer: BulkMoveSaveAnswer): { moved: number; components: number; unchanged: number }
  ```
  - **How Task 6 reads them:** the review's `tags` joins with ", " into `bulkMove.reviewAssetsValue`; each count line shows only when its number is above 0 (`bulkMove.reviewKept` always shows). The refused list's "นำรายการที่ย้ายไม่ได้ออก" calls `removeBulkMoveIds(selection, readBulkMoveBlocked(payload).map((asset) => asset.assetId))`. Every fetched page passes through `refreshBulkMoveSelection` before it is drawn.

- [ ] **Step 1: Write the failing tests.** Create `tests/bulk-move-form-rules.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readBulkMoveBlocked } from "../src/lib/bulk-move-blocked.ts"
import {
  getBulkMovePageState, getBulkMoveResultParts, getBulkMoveReviewCounts, getBulkMoveRowLock, readBulkMoveSaveAnswer,
  refreshBulkMoveSelection, removeBulkMoveIds, setBulkMovePage, toggleBulkMoveRow, type BulkMoveSelection,
} from "../src/lib/bulk-move-form-rules.ts"
import { bulkMoveMaxAssets, type BulkMoveListRow, type BulkMoveRoomOption } from "../src/lib/bulk-move-list-rules.ts"

// ย้ายที่ตั้งหลายรายการ's pure form rules (group 3 plan 4 Task 5, spec §10.1-§10.2): a selection of row snapshots keyed
// by asset id, kept across pages and filters in the order rows were ticked, at most bulkMoveMaxAssets.
const row = (id: string, overrides: Partial<BulkMoveListRow> = {}): BulkMoveListRow => ({
  id, assetTag: id.toUpperCase(), name: `เครื่อง ${id}`, categoryLabel: "NB - Notebook", statusName: "Ready", statusLabel: "พร้อมใช้งาน",
  locationId: "loc-a", locationLabel: "A-01 - ห้อง A", holderLabel: null, branchId: "b-hq", eligible: true, reasonKey: null,
  travellingComponents: [], componentOf: null, ...overrides,
})
const refusedRow = (id: string, reasonKey = "asset.transactionReasonLicenseMove") => row(id, { eligible: false, reasonKey })
const room: BulkMoveRoomOption = { id: "loc-room", label: "HQ-09 - คลัง IT", branchId: "b-hq" }
const empty: BulkMoveSelection = new Map()
const tick = (selection: BulkMoveSelection, ...rows: BulkMoveListRow[]) =>
  rows.reduce((current, next) => toggleBulkMoveRow(current, next, true).selection, selection)
const ids = (selection: BulkMoveSelection) => [...selection.keys()]
const many = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => row(`${prefix}${String(i).padStart(3, "0")}`))

test("a tick adds the row's snapshot last, an untick drops it, a refused row is never ticked, and no change returns the same selection (group 3 spec §10.1; P4-R9, P4-R10)", () => {
  const a = row("a"), b = row("b"), c = row("c")
  const one = toggleBulkMoveRow(empty, a, true)
  assert.equal(one.capped, false)
  assert.equal(one.selection.get("a"), a, "the snapshot is the row itself")
  const three = tick(one.selection, c, b)
  assert.deepEqual(ids(three), ["a", "c", "b"], "the order the rows were ticked")
  assert.equal(empty.size, 0, "the input is never changed")
  const dropped = toggleBulkMoveRow(three, c, false)
  assert.deepEqual(ids(dropped.selection), ["a", "b"])
  assert.equal(dropped.capped, false)
  assert.deepEqual(ids(three), ["a", "c", "b"], "the input is never changed")
  assert.equal(toggleBulkMoveRow(three, a, true).selection, three, "already ticked")
  assert.equal(toggleBulkMoveRow(three, row("z"), false).selection, three, "not ticked")
  const refused = toggleBulkMoveRow(three, refusedRow("lic"), true)
  assert.equal(refused.selection, three, "a refused row is never ticked")
  assert.equal(refused.capped, false)
})

test("a fetched page refreshes the snapshot of each ticked row in its place; a ticked row that comes back refused stays ticked with its box enabled (group 3 spec §10.1; P4-R9)", () => {
  const a = row("a"), b = row("b"), c = row("c")
  const selection = tick(empty, a, b, c)
  const freshB = row("b", { eligible: false, reasonKey: "asset.transactionReasonOpenCheckoutBulkMove", holderLabel: "E001 - สมชาย ใจดี" })
  const refreshed = refreshBulkMoveSelection(selection, [row("x"), freshB])
  assert.deepEqual(ids(refreshed), ["a", "b", "c"], "still ticked, in its place; an unticked row is not ticked")
  assert.equal(refreshed.get("b"), freshB)
  assert.equal(refreshed.get("a"), a, "a row off this page keeps its snapshot")
  assert.equal(selection.get("b"), b, "the input is never changed")
  assert.equal(getBulkMoveRowLock(refreshed, freshB), null, "its box stays enabled so it can be unticked")
  assert.equal(getBulkMoveRowLock(empty, freshB), "blocked", "unticked, the same row is locked with its reason")
  assert.deepEqual(ids(toggleBulkMoveRow(refreshed, freshB, false).selection), ["a", "c"])
  assert.equal(getBulkMoveReviewCounts(refreshed, room).tags.length, 3, "the save names it; the review still lists it")
  assert.equal(refreshBulkMoveSelection(selection, [row("x"), row("y")]), selection, "a page with no ticked row changes nothing")
})

test("ticks on page 1 under one filter and page 2 under another both stay; each header shows only its own page (group 3 spec §10.1; Review Focus 2)", () => {
  const page1 = [row("p1-a"), row("p1-b"), refusedRow("p1-lic")]
  const page2 = [row("p2-a", { locationId: "loc-b" }), row("p2-b", { locationId: "loc-b" })]
  assert.equal(getBulkMovePageState(empty, page1), "none")
  const both = tick(empty, page1[0], page2[1])
  assert.equal(both.size, 2)
  assert.deepEqual(getBulkMoveReviewCounts(both, room).tags, ["P1-A", "P2-B"])
  assert.equal(getBulkMovePageState(both, page1), "some")
  assert.equal(getBulkMovePageState(both, page2), "some")
  assert.equal(getBulkMovePageState(both, [row("p3-a")]), "none")
  const page1All = setBulkMovePage(both, page1, true)
  assert.equal(page1All.capped, false)
  assert.deepEqual(ids(page1All.selection), ["p1-a", "p2-b", "p1-b"], "only the rows that can move, in page order")
  assert.equal(getBulkMovePageState(page1All.selection, page1), "all", "the refused row does not hold the header back")
  assert.equal(getBulkMovePageState(page1All.selection, page2), "some")
  assert.equal(setBulkMovePage(page1All.selection, page1, true).selection, page1All.selection, "nothing left to tick")
  const page1None = setBulkMovePage(page1All.selection, page1, false)
  assert.deepEqual(ids(page1None.selection), ["p2-b"], "unticking a page leaves the other page's tick")
  assert.equal(getBulkMovePageState(page1None.selection, page1), "none")
  assert.deepEqual(page1.map((r) => getBulkMoveRowLock(page1None.selection, r)), [null, null, "blocked"])
  // A page whose only ticked row came back refused (P4-R9): nothing more can be ticked, and unticking the page drops it.
  const staleOnly = refreshBulkMoveSelection(tick(empty, row("s")), [refusedRow("s", "asset.transactionReasonWrittenOff")])
  assert.equal(getBulkMovePageState(staleOnly, [refusedRow("s", "asset.transactionReasonWrittenOff")]), "all")
  assert.equal(setBulkMovePage(staleOnly, [refusedRow("s")], false).selection.size, 0)
  assert.equal(getBulkMovePageState(empty, [refusedRow("r1"), refusedRow("r2")]), "none")
})

test("the selection stops at bulkMoveMaxAssets: เลือกทั้งหมดในหน้านี้ with 90 ticked adds 10 in page order, the rest lock with the cap, and the 101st tick changes nothing (group 3 spec §10.1; P4-R10, Review Focus 4)", () => {
  assert.equal(bulkMoveMaxAssets, 100)
  const ninety = tick(empty, ...many("t", 90))
  assert.equal(ninety.size, 90)
  const page = many("p", 25)
  const all = setBulkMovePage(ninety, page, true)
  assert.equal(all.capped, true)
  assert.equal(all.selection.size, 100)
  assert.deepEqual(ids(all.selection).slice(90), page.slice(0, 10).map((r) => r.id))
  assert.deepEqual(page.map((r) => getBulkMoveRowLock(all.selection, r)), [...Array(10).fill(null), ...Array(15).fill("cap")])
  assert.equal(getBulkMovePageState(all.selection, page), "all", "nothing more on the page can be ticked")
  const extra = toggleBulkMoveRow(all.selection, page[10], true)
  assert.equal(extra.capped, true)
  assert.equal(extra.selection, all.selection, "the 101st tick changes nothing")
  assert.equal(getBulkMoveRowLock(all.selection, refusedRow("lic")), "blocked", "a refused row keeps its own reason past the cap")
  assert.equal(toggleBulkMoveRow(all.selection, refusedRow("lic"), true).capped, false, "refused, not capped")
  const ninetyNine = toggleBulkMoveRow(all.selection, page[0], false).selection
  assert.equal(ninetyNine.size, 99)
  assert.equal(getBulkMoveRowLock(ninetyNine, page[10]), null, "below the cap the boxes come back")
  assert.equal(getBulkMovePageState(ninetyNine, page), "some")
  // Exactly to the cap is not capped; refused rows take no place under it.
  const exact = setBulkMovePage(tick(empty, ...many("t", 75)), [...page.slice(0, 5), refusedRow("lic"), ...page.slice(5)], true)
  assert.equal(exact.selection.size, 100)
  assert.equal(exact.capped, false)
  // A full selection and a page with none of it: the header ticks nothing and reports the cap.
  const other = [row("q1"), row("q2")]
  assert.equal(getBulkMovePageState(all.selection, other), "none")
  const refusedPage = setBulkMovePage(all.selection, other, true)
  assert.equal(refusedPage.selection, all.selection)
  assert.equal(refusedPage.capped, true)
  assert.deepEqual(other.map((r) => getBulkMoveRowLock(all.selection, r)), ["cap", "cap"])
})

test("the review's ส่วนควบย้ายตาม counts neither a ticked component nor one already in the room, and counts each component once (group 3 spec §10.2; P4-R2, P4-R3, Review Focus 1)", () => {
  const parent = row("p", { assetTag: "NB-P", travellingComponents: [
    { id: "c1", currentLocationId: "loc-a" }, { id: "c2", currentLocationId: "loc-room" }, { id: "c3", currentLocationId: "loc-a" },
  ] })
  const c1 = row("c1", { assetTag: "RAM-1", componentOf: { parentId: "p", parentTag: "NB-P" } })
  assert.deepEqual(getBulkMoveReviewCounts(tick(empty, parent, c1), room),
    { assets: 2, tags: ["NB-P", "RAM-1"], componentsFollow: 1, alreadyThere: 0, otherBranch: 0, componentsAlone: 0 })
  const bare = row("p", { assetTag: "NB-P", travellingComponents: parent.travellingComponents.slice(0, 2) })
  assert.equal(getBulkMoveReviewCounts(tick(empty, bare, c1), room).componentsFollow, 0, "C1 is ticked, C2 is already there")
  // Two ticked rows naming one component id (a stale snapshot) count it once; a component with no room counts.
  const twice = tick(empty, row("x", { travellingComponents: [{ id: "k", currentLocationId: "loc-a" }] }),
    row("y", { travellingComponents: [{ id: "k", currentLocationId: "loc-b" }, { id: "n", currentLocationId: null }] }))
  assert.equal(getBulkMoveReviewCounts(twice, room).componentsFollow, 2)
})

test("an asset already in the room counts once as อยู่ที่ตั้งนี้แล้ว and moves nothing: no components, no other-branch line, no ส่วนควบที่เลือกเอง (group 3 spec §10.2; P4-R15, P4-R17)", () => {
  const there = row("t", { locationId: "loc-room", branchId: "b-bn", travellingComponents: [{ id: "tc", currentLocationId: "loc-a" }] })
  const thereComponent = row("tcx", { locationId: "loc-room", componentOf: { parentId: "far", parentTag: "NB-FAR" } })
  const moving = row("m", { travellingComponents: [{ id: "mc", currentLocationId: "loc-b" }] })
  assert.deepEqual(getBulkMoveReviewCounts(tick(empty, there, thereComponent, moving), room),
    { assets: 3, tags: ["T", "TCX", "M"], componentsFollow: 1, alreadyThere: 2, otherBranch: 0, componentsAlone: 0 })
  assert.deepEqual(getBulkMoveReviewCounts(empty, room),
    { assets: 0, tags: [], componentsFollow: 0, alreadyThere: 0, otherBranch: 0, componentsAlone: 0 })
})

test("the review counts rows moving to another branch by branchId and installed ส่วนควบ ticked without their parent (group 3 spec §10.2, call 19; P4-R1, P4-R17)", () => {
  const bnRoom: BulkMoveRoomOption = { id: "loc-bn", label: "BN-01 - ชั้น 2 ฝ่ายขาย", branchId: "b-bn" }
  const hq = row("h1")
  const bn = row("bn", { branchId: "b-bn", locationId: "loc-b" })
  const alone = row("ram", { assetTag: "RAM-9", componentOf: { parentId: "nb-9", parentTag: "NB-9" } })
  const withParent = row("ssd", { componentOf: { parentId: "h1", parentTag: "H1" } })
  const selection = tick(empty, hq, bn, alone, withParent)
  assert.deepEqual(getBulkMoveReviewCounts(selection, bnRoom),
    { assets: 4, tags: ["H1", "BN", "RAM-9", "SSD"], componentsFollow: 0, alreadyThere: 0, otherBranch: 3, componentsAlone: 1 })
  assert.equal(getBulkMoveReviewCounts(selection, room).otherBranch, 1, "only BN is of another branch than HQ-09")
  const parentOnOtherPage = tick(selection, row("nb-9"))
  assert.equal(getBulkMoveReviewCounts(parentOnOtherPage, room).componentsAlone, 0, "its parent is ticked, on whatever page")
})

test("the refused list's นำรายการที่ย้ายไม่ได้ออก unticks every named id, wherever its row is (group 3 spec §10.2; P4-R8)", () => {
  const selection = tick(empty, row("a"), row("b"), row("c"), row("d"))
  assert.deepEqual(ids(removeBulkMoveIds(selection, ["d", "b", "zz"])), ["a", "c"])
  assert.equal(removeBulkMoveIds(selection, []), selection)
  assert.equal(removeBulkMoveIds(selection, ["zz"]), selection)
  assert.equal(selection.size, 4, "the input is never changed")
  const blocked = readBulkMoveBlocked({ code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: "ASSET_LICENSE_MOVE_NOT_ALLOWED", blocked: [
    { assetId: "a", assetTag: "A", code: "ASSET_LICENSE_MOVE_NOT_ALLOWED" }, { assetId: "c", assetTag: "C", code: "ASSET_ACTIVE_CHECKOUT_EXISTS" },
  ] })
  assert.deepEqual(ids(removeBulkMoveIds(selection, blocked.map((asset) => asset.assetId))), ["b", "d"])
})

test("the save's answer is read only with its six counts, and the result line takes M from componentSync.updated (group 3 spec §10.2; P4-R3, P4-R15, P4-R18, Review Focus 1)", () => {
  const answer = { updated: 3, unchanged: 1, componentSync: { updated: 2, skipped: 1, movements: 2 } }
  assert.deepEqual(readBulkMoveSaveAnswer(answer), answer)
  assert.deepEqual(readBulkMoveSaveAnswer({ ...answer, extra: "x", componentSync: { ...answer.componentSync, componentSnapshots: [] } }), answer)
  for (const payload of [
    null, undefined, "x", [], {}, { code: "ASSET_CHANGED_DURING_OPERATION", error: "x" },
    { updated: 2, componentSync: { updated: 0, skipped: 0, movements: 0 } },
    { ...answer, updated: "3" }, { ...answer, unchanged: -1 }, { ...answer, updated: 1.5 }, { ...answer, componentSync: null },
    { ...answer, componentSync: { updated: 2, skipped: 1 } },
  ]) assert.equal(readBulkMoveSaveAnswer(payload), null, String(JSON.stringify(payload)))
  assert.deepEqual(getBulkMoveResultParts(answer), { moved: 3, components: 2, unchanged: 1 })
  // Review Focus 1 saved: the parent and its ticked component move on their own claims; the one already there is not counted.
  assert.deepEqual(getBulkMoveResultParts({ updated: 2, unchanged: 0, componentSync: { updated: 0, skipped: 0, movements: 0 } }),
    { moved: 2, components: 0, unchanged: 0 })
})

test("one rule, one function: the form rules read the cap from bulk-move-list-rules.ts, stay pure and take no device or network (group 3 plan 4 Global Constraints; P4-R10)", () => {
  const source = readFileSync("src/lib/bulk-move-form-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
  assert.match(source, /import \{[^}]*\bbulkMoveMaxAssets\b[^}]*\} from "\.\/bulk-move-list-rules\.ts"/)
  assert.doesNotMatch(source, /\b100\b/, "the cap is bulkMoveMaxAssets, never a literal")
  assert.doesNotMatch(source, /isDesktop|matchMedia|\bwindow\.\w|\bdocument\.\w|\bfetch\(/)
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/bulk-move-form-rules.test.ts`. Expected: the file fails to load with `ERR_MODULE_NOT_FOUND` for `src/lib/bulk-move-form-rules.ts` (Task 1's `bulk-move-list-rules.ts` is already committed; if it is not, stop and report).

- [ ] **Step 3: Implement.** Create `src/lib/bulk-move-form-rules.ts` with the Produces exports and no other export.
  - Header comment (no literal cap number anywhere in the file, comments included; the purity test reads the whole source):
    ```ts
    // ย้ายที่ตั้งหลายรายการ's form rules (group 3 spec §10.1-§10.2; plan 4 Task 5, P4-R1, P4-R3, P4-R8 to P4-R10, P4-R15,
    // P4-R17, P4-R18). The selection is a map of row snapshots keyed by asset id, in the order the rows were ticked, kept
    // across pages and filters (DESIGN.md's bulk-move exception) and capped at bulkMoveMaxAssets. Pure and client-safe:
    // the page draws the header, the boxes, the review and the result line from these values and writes the words.
    ```
  - One import line: `import { bulkMoveMaxAssets, type BulkMoveListRow, type BulkMoveRoomOption } from "./bulk-move-list-rules.ts"`.
  - Every function copies into a `new Map(selection)` only when it will change something, and returns `selection` itself otherwise (Decisions). Adding uses `set` on a new key (appends); refreshing uses `set` on an existing key (keeps the place); removing uses `delete`.
  - `toggleBulkMoveRow`: `checked` false → drop the id if ticked. `checked` true → unchanged when ticked or not `eligible`; `{ selection, capped: true }` when `selection.size >= bulkMoveMaxAssets`; else append.
  - `setBulkMovePage`: `checked` true walks `rows` in order, skipping ticked and not-eligible rows; at the cap it stops and sets `capped` if any eligible unticked row was left. `checked` false drops every page id that is ticked; `capped` false.
  - `getBulkMovePageState` and `getBulkMoveRowLock`: exactly the Decisions' rules.
  - `getBulkMoveReviewCounts(selection, room)`, one pass over `selection.values()`:
    - `tags` push every `assetTag`; `assets = selection.size`;
    - a row with `locationId === room.id` adds to `alreadyThere` and nothing else;
    - otherwise: `branchId !== room.branchId` → `otherBranch`; `componentOf && !selection.has(componentOf.parentId)` → `componentsAlone`; each `travellingComponents` entry with `!selection.has(id) && currentLocationId !== room.id` goes into one `Set<string>`, whose size is `componentsFollow`.
  - `readBulkMoveSaveAnswer`: a private `count(value: unknown): value is number` (`Number.isInteger(value) && value >= 0`); the payload and its `componentSync` must be non-null, non-array objects. Return a fresh `{ updated, unchanged, componentSync: { updated, skipped, movements } }`.
  - `getBulkMoveResultParts`: the three fields, nothing computed.

- [ ] **Step 4: Run the tests and the checks.**
  - Re-run `node --test tests/bulk-move-form-rules.test.ts`: every test passes.
  - Neighbours: `node --test tests/bulk-move-blocked.test.ts tests/api-error-catalog.test.ts` and Task 1's test file for `src/lib/bulk-move-list-rules.ts`. Every test passes with no edit.
  - Then `npm test`, `npx tsc --noEmit` and `npm run lint`: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - No E2E and no docs here: Task 8's BM1 drives Review Focus 1 and 2 through the page, and Task 8 writes the docs.

- [ ] **Step 5: Commit.**
```
git add src/lib/bulk-move-form-rules.ts tests/bulk-move-form-rules.test.ts
git commit -m "feat(bulk-move): the selection keeps row snapshots across pages and filters in the order they were ticked, stops at the cap, keeps a ticked row that comes back refused, and the review counts the ส่วนควบ that follow, the assets already in the room, other branches and ส่วนควบ ticked alone (group 3 spec §10.1, §10.2; plan 4 P4-R1, P4-R3, P4-R8 to P4-R10, P4-R15, P4-R17, P4-R18)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The ย้ายที่ตั้งหลายรายการ page and form: filters, table, bar, review, result line, phone notice (spec §10.1-§10.4, §11, §13, §5, Appendix A ย้ายที่ตั้งหลายรายการ; P4-R1 to P4-R4, P4-R6, P4-R8 to P4-R22)

The picker form becomes a desktop list page. `page.tsx` renders the first page on the server through Task 2's reader. `bulk-move-form.tsx` holds the state: the query, the fetch, the selection map, the bar's fields, the review and the result line. The new `bulk-move-table.tsx` draws the rows, the ticks and the pager from props. Every decision comes from Tasks 1 and 5: which row moves, the cap, the review counts and the result numbers. This file only wires them. The task writes no route, no rule file and no E2E: Task 8 rewrites `e2e/transactions/bulk-move.spec.ts`, which fails until then, and no E2E runs before Task 8. That is a recorded deviation from §17's "in the same task as the change" (Z13). Line numbers are those of `020a8533`.

**The rulings this task carries:**
- **P4-R1:** a component row reads "ส่วนควบของ <parent tag>". The review shows "ส่วนควบที่เลือกเอง N รายการ ย้ายแยกจากเครื่องหลัก" when Task 5 counts `componentsAlone > 0`.
- **P4-R2:** "+N ส่วนควบย้ายตาม", where N = `row.travellingComponents.length`. The line shows only when N > 0.
- **P4-R3, P4-R15:** the review's M and "อยู่ที่ตั้งนี้แล้ว N" come from Task 5's `getBulkMoveReviewCounts`. The result line's numbers come from the answer through `getBulkMoveResultParts`.
- **P4-R4, P4-R6, P4-R8:** a 409 with `blocked` names every refused asset in the place under the table. Each reason reads in the row's words through `bulkMoveBlockedReasonKey(code)`, with `apiError.describe(code)` as the fallback. "นำรายการที่ย้ายไม่ได้ออก" unticks them all, and any change to the selection clears the list.
- **P4-R9:** a ticked row that comes back refused stays ticked and enabled, and shows its reason. This is Task 5's `refreshBulkMoveSelection` / `getBulkMoveRowLock`.
- **P4-R10:** at 100 ticks every unticked box is disabled, and the reason "เลือกได้สูงสุด 100 รายการต่อครั้ง" is its description and the bar's status line.
- **P4-R11 (client part):** `q` is sent only when `isAssetOperationSearchReady`, and the search box takes at most 100 characters. The table has no highlight.
- **P4-R12, P4-R13:** the first page is server-rendered. Every later page, filter or refresh is fetched by the client: the text 300 ms after the last keystroke, and a filter change resets to page 1. An older answer is dropped. The pager is the shared `Pagination` in button mode, with the register's range words. "พบ {count} รายการ" is `bulkMove.foundCount` with `formatCount(total)`, never the plural `common.searchSelectResultCount` (Z8).
- **P4-R14:** the room is a required `SearchableSelect` `#bulk-move-to-location` over the page's active rooms. `ASSET_TRANSFER_DESTINATION_INACTIVE` (`fieldErrors.toLocationId`) leaves the review and focuses the room.
- **P4-R17:** `OperationReviewDialog` "ตรวจสอบก่อนย้ายที่ตั้ง" / "ยืนยันย้ายที่ตั้ง", then the lines, then หมายเหตุ `#bulk-move-remark` (optional, no length rule) in Task 4's `children` slot. The ย้ายไปสาขาอื่น and ส่วนควบที่เลือกเอง lines count only ticked rows that move (Task 5).
- **P4-R18:** the page stays after a save. The ticks, room, reason and remark clear, the current page is fetched again, and the success line shows until the next tick; its `{room}` is the room's "code - name". There is no toast. A 409 `ASSET_CHANGED_DURING_OPERATION` closes the review, fetches the page again, and goes to `apiError.toast`. A 409 with `blocked` closes the review and focuses `#bulk-move-selection` (Decision 4).
- **P4-R19:** one `PageHeader` at every width. Below `md` only an info `Notice` shows, with a link to `/{locale}/assets`. The filters, table and bar are `max-md:hidden`, and nothing is fetched below `md`. The bar gets `className` so it drops the bottom-nav offset.
- **P4-R20:** the words, verbatim (Step 3a).
- **P4-R21:** the filters sit in a `role="search"` region outside the save form: `#bulk-move-search`, `#bulk-move-filter-location` (not required), `#bulk-move-filter-category`, and "พบ {count} รายการ".
- **P4-R22:** the row's columns, a native checkbox in a 44px label, and the header box mixed.
- **Appendix Z (the controller's rulings on the cross-check):** Z2 (the header box's disabled rule, pinned in the row test), Z3 (the cap line follows `selection.size`; `capped` is not read), Z6 (the review's `<ul>` has no border; it and หมายเหตุ share one `grid gap-3` wrapper), Z8 (the count line is `bulkMove.foundCount`), Z11 (the review counts only ticked rows that move), Z13 (the spec is rewritten in Task 8, a recorded deviation), Z18 (`FIELD_IDS` keys the selection as `assetIds: "bulk-move-selection"`), Z19 (the lines are a `<ul>` in `children`, not items; `description={null}`), Z20 (a `blocked` 409 closes the review and focuses `#bulk-move-selection`; the result's `{room}` is "code - name"), Z23 (the `SearchableSelect` and `:136` citations).

**Decisions** (each is a firm call; the skeleton leaves these open):
1. **`FIELD_IDS` keys the selection as `assetIds: "bulk-move-selection"`** (Z18; the skeleton's V-form rules). The route's 400 for more than 100 ids says `fieldErrors.assetIds`, and `applyServer` stores server keys as they are (src/components/ui/use-field-errors.ts:68-76), so it lands in `#bulk-move-selection`. A key named `selection` would never receive it.
2. **Two files.** `bulk-move-form.tsx` keeps the state, the filters (they drive the query), the fetch, the save `<form>`, the bar, the review and the notices. `bulk-move-table.tsx` (`"use client"`, for the header box's `indeterminate` effect) draws only what its props say. `DesktopSelectionBar` itself is not changed: it stays server-safe with no hooks and only receives a `className`.
3. **The save `<form>` wraps the table and the bar.** A sticky element sticks only inside its parent (desktop-selection-bar.tsx:18-21), so a form around the bar alone would not stick. The filters region comes before the form. Enter in the reason box submits; the table's boxes and the pager's `Button`s do not, because `Button` defaults to `type="button"` (button.tsx:53).
4. **The refused list is the bar's `children`:** `<div id="bulk-move-selection">` holds a `FieldError` and the remove button. It sits directly under the table and its pager, inside the sticky bar, so the bar never covers it. `focusField` focuses its first control, the button (src/lib/field-focus.ts:36-40), and the button's `aria-describedby` points at the error. A 409 with `blocked` therefore closes the review (`focusFirstError` reveals through `leaveReview`) and focuses `#bulk-move-selection`'s button (Z20). Focus scrolling clears only the sticky footer, and the bar is always on screen while something is ticked, so the focused list is never hidden behind it.
5. **The review's sentence lines go into the `children` slot as a `<ul data-bulk-move-review-lines>`, followed by the remark** (Z19). The dialog keys its rows by label (operation-review-dialog.tsx:50), and the sentences have no label. The three items stay: ทรัพย์สิน, ย้ายไป, เหตุผล. `description={null}`: the dialog then drops `aria-describedby` (accessible-dialog.tsx:63). The ul has no border of its own (`grid gap-1.5 text-sm text-foreground`), and it and the หมายเหตุ field sit in one `<div className="grid gap-3">`, so Task 4's wrapper border is the only line under the items (Z6).
6. **Empty states.** When no rows match, the table shows `<TableEmptyRow colSpan={6}>{tAll("asset.noResultsTitle")}</TableEmptyRow>`, reusing "ไม่พบทรัพย์สินตามเงื่อนไขที่เลือก" because P4-R20 has no key for it. When nothing is ticked, `<EmptyNote data-bulk-move-nothing-selected>{t("nothingSelected")}</EmptyNote>` takes the bar's place: the bar mounts only while `selection.size > 0` (DESIGN.md:648).
7. **The result line is a live region that is always rendered:** `<div role="status" data-bulk-move-result>`, with the success `Notice` inside while there is a result. A region added together with its text is not read (desktop-selection-bar.tsx:47).
8. **The fetch.** The form keeps `query: BulkMoveListInput`, `searchText`, `list: { href; page: BulkMoveListPage }`, `failedHref` and `attempt`.
   - A 1-character text changes nothing: the last answer stays, as the picker keeps its hint.
   - A `serverPage` ref skips the first run on `initialHref`.
   - The effect aborts the previous request, and an answer that arrives after an abort is ignored.
   - A failure sets `failedHref` and keeps `list`, so the rows and the ticks stay.
   - The pager moves from the page the answer used (`list.page.page ± 1`), because the server clamps it.
9. **The cap.** The bar's status reads `capReached` whenever `selection.size >= bulkMoveMaxAssets`, which covers both a 100th single tick and "เลือกทั้งหมดในหน้านี้" past the cap (Z3). `BulkMoveTickResult.capped` is informational: the form reads only `.selection`. A box locked by the cap is described by one sr-only `<p id="bulk-move-cap-reason">` in the table. A box locked because its row is refused is described by that row's reason line.
10. **The search box takes `maxLength={assetOperationSearchMaxChars}`.** 100 UTF-16 units is never more than 100 code points, so the 400 for a long text cannot happen. The GF5 floor of `bulk-move-form.tsx` rises to `[1, 2, 0]`.
11. **No `NON_VALIDATION_TOASTS` row.** `ASSET_CHANGED_DURING_OPERATION` is thrown and reaches the catch's `apiError.toast`, as today.
12. **A 200 whose body `readBulkMoveSaveAnswer` cannot read** still clears and refreshes, but shows no line.
13. **The bar's `className="-bottom-6"`.** tailwind-merge drops `bottom-[calc(3.75rem…)]` and keeps `lg:-bottom-6`. `main` is `sm:py-6` (dashboard-shell.tsx:171), so the bar rests on the same line from `md`.

**Files:**
- Modify `src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx` (:1-15, CRLF): replace `getAssetOperationMasterOptions()` with Task 2's two readers; the props change.
- Modify `src/components/asset-operations/bulk-move-form.tsx` (:1-157, CRLF): rewrite it.
- Create `src/components/asset-operations/bulk-move-table.tsx` (CRLF, as the plan-3 files).
- Modify `messages/th.json` and `messages/en.json`, only through `node scripts/messages-edit.mjs <scratchpad>/tx-group/msg/p4-t6-messages.json`.
- Create `tests/bulk-move-form-ui.test.ts` (CRLF).
- Test (rewritten pins, below): `tests/v-track2-o.test.ts:257-276`, `tests/choice-controls-ui.test.ts:83-89`, `tests/operations-sweep-ui.test.ts:76, 86-91`, `tests/form-frames-ui.test.ts:108-113`, `tests/e2e-transactions.test.ts:139, 458-461`, `tests/form-migration-guards.test.ts:94`.

**Existing pins this task breaks, rewritten in this commit:**
- `tests/v-track2-o.test.ts:257-276` (O5): replaced by the test in Step 1b.
- `tests/choice-controls-ui.test.ts:83-89`: replaced by the test in Step 1c.
- `tests/operations-sweep-ui.test.ts`, the test title at :76 and lines :86-91:
  - The title ends "…, and the bulk move is a list page with no panel (spec 2D D9, M21, M25; server search Task 7; group 3 plan 3 Task 6; group 3 plan 4 P4-R19)".
  - :86-91 become the following, with the loop keeping its pattern:
    ```ts
      const bulkMove = read(`${C}asset-operations/bulk-move-form.tsx`)
      assert.match(bulkMove, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
      assert.doesNotMatch(bulkMove, /<ContentPanel\b/)
      const bulkTable = read(`${C}asset-operations/bulk-move-table.tsx`)
      for (const [name, source] of [["checkout", checkout], ["transfer", transfer], ["bulk move", bulkMove], ["bulk move table", bulkTable]]) {
    ```
- `tests/form-frames-ui.test.ts:108-113`:
  ```ts
  test("ย้ายที่ตั้งหลายรายการ: one PageHeader with the subtitle at every width, and the count in the bar (2B-1 task 23, I13; group 3 spec §10.1, §10.2; plan 4 P4-R19)", () => {
    const source = read(`${C}asset-operations/bulk-move-form.tsx`)
    assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "bulk-move-form.tsx imports PageHeader")
    assert.equal(source.match(/<PageHeader\b/g)?.length, 1)
    assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
    assert.match(source, /countLabel=\{t\("selectedCount", \{ count: formatCount\(selection\.size\) \}\)\}/)
    assert.doesNotMatch(source, /<h1\b|PageBackLink|meta=\{t\("selectedCount"/)
  })
  ```
- `tests/e2e-transactions.test.ts:139` becomes two lines:
  ```ts
    assert.match(read("src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx"), /readBulkMovePageOptions\(db\)/, "bulk-move reads its active rooms and categories only (group 3 spec §10.3; plan 4 P4-R12)")
    assert.doesNotMatch(read("src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx"), /getAssetOperationMasterOptions/, "bulk-move")
  ```
  The no-options overload pin at :136 holds because it pins the declaration in `src/lib/asset-operation-options.ts`, not a caller; the page's change does not touch it.
- `tests/e2e-transactions.test.ts:458-461`: the tuple list drops `["bulk-move-form.tsx", "bulk-move-assets"]`, and a line follows the loop:
  ```ts
    assert.doesNotMatch(read("src/components/asset-operations/bulk-move-form.tsx"), /<AssetOperationPicker\b/, "ย้ายที่ตั้งหลายรายการ ticks rows in its table (group 3 spec §10.1)")
  ```
  `:465` keeps `bulk-move-assets` in its regex; no spec uses it.
- `tests/form-migration-guards.test.ts:94` becomes:
  ```ts
    // Group 3 plan 4 Task 6: the reason Input (required, maxLength 500) and the list search (maxLength 100).
    [`${C}asset-operations/bulk-move-form.tsx`]: [1, 2, 0],
  ```

**These stay green with no edit. Name any that does not in the report.**
- `tests/validation-guards.test.ts`: :29 (`bulk-move-form.tsx: 1`, since the filters are a `<div role="search">` and the table file has no form), :82, :189 (total 51), V2-V4 (the required room select has `id=` and `error=`; the filter room select is not required), V3 (no toast outside a catch).
- `tests/list-frame-guards.test.ts`, which counts the new table file too: LH1, LT3, LT4, LT5, LV1, LV2 (holder null reads ไม่มี, labels null through `Nil`) and LN2.
- `tests/desktop-selection-bar.test.ts`, `tests/mobile-field-navigation.test.ts:49`, `tests/sidebar-menu-structure.test.ts:67`, `tests/asset-operation-picker-forms.test.ts:42` and `tests/asset-operation-picker-ui.test.ts` (`multiple` stays until Task 7).
- `tests/e2e-cross-cutting.test.ts:113-126`: the permission comes before any `prisma.`.
- `tests/e2e-transactions.test.ts`: :136-138, :145-146, :382-395 (TX5 reads the spec, which is unchanged until Task 8) and :475 (TX_WORDS).
- `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/visual-foundation-guards.test.ts`, `tests/ui-overlay-guards.test.ts`.

**Interfaces:**
- Consumes:
  - **Task 1 (`src/lib/bulk-move-list-rules.ts`):**
    - `bulkMoveListPageSize`, `bulkMoveMaxAssets`, `type BulkMoveListInput`, `type BulkMoveListRow`, `type BulkMoveListPage`, `type BulkMoveRoomOption`, `type BulkMoveCategoryOption`.
    - `buildBulkMoveListHref(input)`. The form fetches its result as is: the path and the query, with empty values and page 1 omitted.
    - From `src/lib/bulk-move-blocked.ts`: `bulkMoveBlockedReasonKey(code): string | null`, plus `readBulkMoveBlocked` and `bulkMoveBlockedList` (:6-28, unchanged).
    - The message `asset.transactionReasonOpenCheckoutBulkMove` is Task 1's.
  - **Task 2 (`src/lib/bulk-move-list.ts`):** `type BulkMoveListDb`, `readBulkMoveListPage(db, input)`, `readBulkMovePageOptions(db)`. Also `GET bulkMoveListPath` → `{ data: BulkMoveListPage }`.
  - **Task 3:** the save answers in the skeleton's Interfaces: 200 `{ updated, unchanged, componentSync }`; 409 `blocked`; 409 inactive room with `fieldErrors.toLocationId`; 409 `ASSET_CHANGED_DURING_OPERATION`; 400 `fieldErrors.assetIds`.
  - **Task 4:**
    - `Pagination`'s button member of `PaginationProps` (`onPrevious` / `onNext`, no hrefs, no `pageSizes`; Z17). The link member keeps both hrefs required: never mark them optional.
    - `OperationReviewDialog` `children`.
  - **Task 5 (`src/lib/bulk-move-form-rules.ts`):** `BulkMoveSelection`, `toggleBulkMoveRow`, `setBulkMovePage`, `getBulkMovePageState`, `getBulkMoveRowLock`, `refreshBulkMoveSelection`, `removeBulkMoveIds`, `getBulkMoveReviewCounts`, `readBulkMoveSaveAnswer`, `getBulkMoveResultParts`.
  - **Existing parts:** `DesktopSelectionBar` (desktop-selection-bar.tsx:5-15, 30), `SearchableSelect` (searchable-select.tsx:31, its props type :50-71), `FilterSelect` (filter-select.tsx:8-27; the child's `id` wins, field.tsx:41), `SearchField` (search-field.tsx:7-13), `Notice` (notice.tsx:6-15), `EmptyNote` (empty-note.tsx:19), `DataTable` and `TableEmptyRow` (data-table.tsx:34-49, 171-186), `StatusBadge`, `getAssetStateTone` (design-system.ts:15), `checkboxVariants` (field-variants.ts:54), `buttonVariants`, `useMediaQuery` (use-media-query.ts:6-16, false on the server), `useFieldErrors`, `FieldError`, `waitForDialogToClose` (field-focus.ts:119), `isAssetOperationSearchReady` and `assetOperationSearchMaxChars` (asset-operation-search-rules.ts:25-32), `formatCount` (display-format.ts:15).
- Produces:
  ```ts
  // src/components/asset-operations/bulk-move-form.tsx ("use client")
  export function BulkMoveForm(props: { rooms: BulkMoveRoomOption[]; categories: BulkMoveCategoryOption[]; initialPage: BulkMoveListPage })
  // src/components/asset-operations/bulk-move-table.tsx ("use client")
  export type BulkMoveTableProps = {
    listPage: BulkMoveListPage
    selection: BulkMoveSelection
    disabled: boolean // while saving
    onToggleRow: (row: BulkMoveListRow, checked: boolean) => void
    onTogglePage: (checked: boolean) => void
    onPage: (page: number) => void
  }
  export function BulkMoveTable(props: BulkMoveTableProps)
  ```
  - **DOM hooks for Task 8:**
    - Fields:
      - `#bulk-move-to-location` and `#bulk-move-reason`, with their `-error` ids, unchanged;
      - `#bulk-move-search`, `#bulk-move-filter-location` and `#bulk-move-filter-category`, inside `[data-bulk-move-filters]` (`role="search"`);
      - `[data-bulk-move-count]`.
    - Rows: `[data-bulk-move-row="<tag>"]`, each holding:
      - its box, named "เลือก <tag>";
      - `[data-bulk-move-reason]`;
      - `[data-bulk-move-follow]`;
      - `[data-bulk-move-component-of]`.
    - The header box, named "เลือกทั้งหมดในหน้านี้".
    - The bar `[data-slot="desktop-selection-bar"]`, holding:
      - the button "ตรวจสอบและย้าย N รายการ";
      - `#bulk-move-selection`, with `#bulk-move-selection-error` and the button "นำรายการที่ย้ายไม่ได้ออก".
    - Notices:
      - `[data-bulk-move-nothing-selected]`;
      - `[data-bulk-move-list-failed]`, with "ลองอีกครั้ง";
      - `[data-bulk-move-result]` (`role="status"`);
      - `[data-bulk-move-desktop-only]`.
    - The review: the dialog "ตรวจสอบก่อนย้ายที่ตั้ง" / "ยืนยันย้ายที่ตั้ง", holding `[data-bulk-move-review-lines]` and `#bulk-move-remark`.

- [ ] **Step 1: Write the failing tests.**

  **1a. New file `tests/bulk-move-form-ui.test.ts`:**
  ```ts
  import assert from "node:assert/strict"
  import { readFileSync } from "node:fs"
  import test from "node:test"

  // Group 3 plan 4 Task 6: the ย้ายที่ตั้งหลายรายการ page, its form and its table. Sources read with LF line endings.
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  const PAGE = "src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx"
  const FORM = "src/components/asset-operations/bulk-move-form.tsx"
  const TABLE = "src/components/asset-operations/bulk-move-table.tsx"
  const messagesOf = (locale: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string | undefined>>
  const FIRST = '{ q: "", locationId: null, categoryId: null, page: 1 }'

  test("ย้ายที่ตั้งหลายรายการ page: asset:edit first, then the active rooms and categories and the first page through the list reader, never the master lists (group 3 spec §10.3; P4-R12)", () => {
    const page = read(PAGE)
    const permission = page.indexOf('await requirePagePermission(locale, "asset", "edit")')
    assert.ok(permission > 0 && permission < page.indexOf("readBulkMovePageOptions(db)"))
    assert.ok(page.includes("const db = prisma as unknown as BulkMoveListDb"))
    assert.ok(page.includes(`const [options, firstPage] = await Promise.all([readBulkMovePageOptions(db), readBulkMoveListPage(db, ${FIRST})])`))
    assert.ok(page.includes("<BulkMoveForm rooms={options.rooms} categories={options.categories} initialPage={firstPage} />"))
    assert.doesNotMatch(page, /getAssetOperationMasterOptions|searchParams/)
    assert.ok(read(FORM).includes(`const FIRST_QUERY: BulkMoveListInput = ${FIRST}`), "the form starts from the query the page read")
  })

  test("ย้ายที่ตั้งหลายรายการ: the filters are a search region before the save form: the words, the room as it is now, the category and the count (group 3 spec §10.1, §11; P4-R11, P4-R13, P4-R21)", () => {
    const form = read(FORM)
    const start = form.indexOf('<div role="search"')
    assert.ok(start > 0 && start < form.indexOf("<form onSubmit={handleSubmit} noValidate"))
    const filters = form.slice(start, form.indexOf("<form onSubmit={handleSubmit} noValidate"))
    assert.match(filters, /^<div role="search" aria-label=\{t\("searchLabel"\)\} data-bulk-move-filters /)
    assert.match(filters, /<Field label=\{t\("searchLabel"\)\} id="bulk-move-search">\n\s+<SearchField value=\{searchText\} [^\n]*maxLength=\{assetOperationSearchMaxChars\}/)
    const room = filters.match(/<SearchableSelect id="bulk-move-filter-location" [^\n]*/)?.[0] ?? ""
    assert.match(room, /label=\{t\("filterLocation"\)\} value=\{query\.locationId \?\? ""\} options=\{rooms\} placeholder=\{t\("filterAll"\)\}/)
    assert.doesNotMatch(room, /\brequired\b/, "not required, so its × clears to ทั้งหมด")
    assert.match(filters, /<FilterSelect id="bulk-move-filter-category" label=\{t\("filterCategory"\)\} allLabel=\{t\("filterAll"\)\} /)
    // Not common.searchSelectResultCount: its en is an ICU plural, and formatCount's "1,234" reads "NaN results" (Z8).
    assert.ok(filters.includes('t("foundCount", { count: formatCount(list.page.total) })'))
    assert.doesNotMatch(form, /searchSelectResultCount/)
    assert.match(form, /function changeFilter\(patch: Partial<Pick<BulkMoveListInput, "locationId" \| "categoryId">>\) \{\n\s+setQuery\(\(current\) => \(\{ \.\.\.current, \.\.\.patch, page: 1 \}\)\)/)
    assert.doesNotMatch(read(TABLE), /highlight/i, "no highlight in the table (P4-R11)")
  })

  test("ย้ายที่ตั้งหลายรายการ: the list is fetched 300 ms after the last keystroke, an older answer is dropped, a failure keeps the rows and the ticks with ลองอีกครั้ง, and nothing is fetched below md (group 3 spec §10.3, §10.4; P4-R12, P4-R19)", () => {
    const form = read(FORM)
    assert.match(form, /^const bulkMoveSearchDebounceMs = 300$/m)
    assert.ok(form.includes('if (text !== "" && !isAssetOperationSearchReady(text)) return'))
    assert.ok(form.includes('const isDesktop = useMediaQuery("(min-width: 48rem)")'))
    for (const line of [
      "if (!isDesktop) return",
      "const response = await fetch(href, { signal: controller.signal })",
      "if (controller.signal.aborted) return",
      "setSelection((current) => refreshBulkMoveSelection(current, answer.rows))",
      "return () => controller.abort()",
      "const listFailed = failedHref === href",
    ]) assert.ok(form.includes(line), line)
    assert.match(form, /<Notice tone="warning" role="alert" data-bulk-move-list-failed action=\{<Button variant="secondary" size="sm" onClick=\{\(\) => setAttempt\(\(count\) => count \+ 1\)\}>\{tCommon\("tryAgain"\)\}<\/Button>\}>\n\s+\{t\("listFailed"\)\}/)
    assert.ok(form.includes("<BulkMoveTable listPage={list.page} "), "the last rows stay on screen while a request fails")
  })

  test("ย้ายที่ตั้งหลายรายการ: a row shows the tag, the name with its status, what travels or whose component it is, the room, the holder or ไม่มี; a locked box says why (group 3 spec §10.1; P4-R1, P4-R2, P4-R9, P4-R10, P4-R22)", () => {
    const table = read(TABLE)
    assert.match(table, /<DataTable caption=\{t\("tableCaption"\)\}/)
    assert.ok(table.includes('<TableEmptyRow colSpan={6}>{tAll("asset.noResultsTitle")}</TableEmptyRow>'))
    assert.ok(table.includes("<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.statusName)} />"))
    assert.ok(table.includes('row.travellingComponents.length > 0 ? <p data-bulk-move-follow className="text-meta text-muted-foreground">{t("componentsFollow", { count: formatCount(row.travellingComponents.length) })}</p> : null'))
    assert.ok(table.includes('row.componentOf ? <p data-bulk-move-component-of className="text-meta text-muted-foreground">{t("componentOf", { tag: row.componentOf.parentTag })}</p> : null'))
    assert.ok(table.includes('!row.eligible && row.reasonKey ? <p id={`bulk-move-row-reason-${row.id}`} data-bulk-move-reason className="text-meta text-warning">{tAll(row.reasonKey)}</p> : null'))
    assert.ok(table.includes('{row.holderLabel ?? <span className="text-muted-foreground">{t("noHolder")}</span>}'))
    assert.ok(table.includes("const lock = getBulkMoveRowLock(selection, row)"))
    assert.ok(table.includes("disabled={disabled || lock !== null}"))
    assert.ok(table.includes('aria-describedby={lock === "cap" ? CAP_REASON_ID : !row.eligible && row.reasonKey ? `bulk-move-row-reason-${row.id}` : undefined}'))
    assert.ok(table.includes('aria-label={t("selectRow", { tag: row.assetTag })}'))
    assert.match(table, /^const CAP_REASON_ID = "bulk-move-cap-reason"$/m)
    assert.ok(table.includes("const pageState = getBulkMovePageState(selection, rows)"))
    assert.ok(table.includes('onChange={() => onTogglePage(pageState !== "all")}'))
    // A page whose ticked row came back refused can still be unticked; nothing tickable at the cap is disabled (Z2).
    assert.ok(table.includes('disabled={disabled || (pageState === "none" && rows.every((row) => getBulkMoveRowLock(selection, row) !== null))}'))
    assert.ok(table.includes('aria-label={t("selectPage")}'))
  })

  test("ย้ายที่ตั้งหลายรายการ: the pager is the shared Pagination with buttons and the register's range words (group 3 spec §10.1; P4-R12, P4-R13)", () => {
    const table = read(TABLE)
    assert.match(table, /<Pagination\n\s+page=\{page\}\n\s+totalPages=\{totalPages\}\n\s+onPrevious=\{\(\) => onPage\(page - 1\)\}\n\s+onNext=\{\(\) => onPage\(page \+ 1\)\}\n/)
    assert.doesNotMatch(table, /previousHref|nextHref/)
    assert.ok(table.includes("const totalPages = Math.max(1, Math.ceil(total / pageSize))"))
    assert.ok(table.includes('range: tCommon("showingRange", { from: formatCount(from), to: formatCount(to), total: formatCount(total) }),'))
    assert.ok(table.includes('pageOf: tCommon("pageOf", { page: formatCount(page), total: formatCount(totalPages) }),'))
    assert.ok(read(FORM).includes("onPage={(page) => setQuery((current) => ({ ...current, page }))}"))
  })

  test("ย้ายที่ตั้งหลายรายการ: the bar inside the save form while anything is ticked: the count, ล้าง, ย้ายไป, เหตุผล, ตรวจสอบและย้าย N รายการ and the cap line, with no nav offset (group 3 spec §10.2; P4-R10, P4-R14, P4-R19)", () => {
    const form = read(FORM)
    assert.match(form, /\{selection\.size > 0 \? \(\n\s+<DesktopSelectionBar\n\s+label=\{t\("title"\)\}\n\s+countLabel=\{t\("selectedCount", \{ count: formatCount\(selection\.size\) \}\)\}\n\s+clearLabel=\{t\("clear"\)\}\n\s+onClear=\{clearSelection\}\n\s+clearDisabled=\{saving\}\n\s+className="-bottom-6"\n/)
    assert.ok(form.includes('status={selection.size >= bulkMoveMaxAssets ? t("capReached", { max: formatCount(bulkMoveMaxAssets) }) : null}'))
    assert.ok(form.includes('{t("reviewAndMove", { count: formatCount(selection.size) })}'))
    assert.ok(form.includes('<EmptyNote data-bulk-move-nothing-selected>{t("nothingSelected")}</EmptyNote>'))
    const at = (text: string) => form.indexOf(text)
    assert.ok(at("<form onSubmit={handleSubmit} noValidate") < at("<BulkMoveTable") && at("<BulkMoveTable") < at("<DesktopSelectionBar") && at("<DesktopSelectionBar") < at("</form>"), "the form is the list's column, so the bar sticks within it")
  })

  test("ย้ายที่ตั้งหลายรายการ: the review names every tag, the room and the reason, then the lines that apply and ผู้ถือครองและแผนกคงเดิม, then หมายเหตุ (group 3 spec §10.2; P4-R1, P4-R3, P4-R15, P4-R17)", () => {
    const form = read(FORM)
    assert.match(form, /<OperationReviewDialog\n\s+open=\{reviewOpen\}\n\s+title=\{t\("reviewTitle"\)\}\n\s+description=\{null\}\n\s+items=\{reviewItems\}\n\s+confirmLabel=\{t\("reviewConfirm"\)\}\n\s+cancelLabel=\{tCommon\("cancel"\)\}\n\s+busy=\{saving\}\n/)
    assert.ok(form.includes("const counts = room ? getBulkMoveReviewCounts(selection, room) : null"))
    const lines = [
      '{ label: t("reviewAssets"), value: t("reviewAssetsValue", { count: formatCount(counts.assets), tags: counts.tags.join(", ") }) },',
      '{ label: t("toLocation"), value: room.label },',
      '{ label: t("reason"), value: values.reason },',
      'counts.componentsFollow > 0 ? t("reviewComponents", { count: formatCount(counts.componentsFollow) }) : null,',
      'counts.alreadyThere > 0 ? t("reviewAlreadyThere", { count: formatCount(counts.alreadyThere) }) : null,',
      'counts.otherBranch > 0 ? t("reviewOtherBranch", { count: formatCount(counts.otherBranch) }) : null,',
      'counts.componentsAlone > 0 ? t("reviewComponentsAlone", { count: formatCount(counts.componentsAlone) }) : null,',
      't("reviewKept"),',
    ]
    lines.forEach((line, index) => {
      assert.ok(form.includes(line), line)
      if (index > 0) assert.ok(form.indexOf(line) > form.indexOf(lines[index - 1]), `in order: ${line}`)
    })
    const dialog = form.slice(form.indexOf("<OperationReviewDialog"), form.indexOf("</OperationReviewDialog>"))
    // The lines and หมายเหตุ in one wrapper; the dialog's own border is the only line under the items (Z6, Z19).
    assert.match(dialog, /<div className="grid gap-3">\n\s+<ul data-bulk-move-review-lines className="grid gap-1\.5 text-sm text-foreground">\n\s+\{reviewLines\.map\(\(line\) => <li key=\{line\}>\{line\}<\/li>\)\}/)
    assert.match(dialog, /<Field label=\{t\("remark"\)\} id="bulk-move-remark">\n\s+<Textarea value=\{values\.remark\} [^\n]*\/>/)
    assert.doesNotMatch(dialog.match(/<Textarea [^\n]*/)?.[0] ?? "", /maxLength|required/)
  })

  test("ย้ายที่ตั้งหลายรายการ: after the save the page stays: everything clears, the page is fetched again, one line says what moved; refused assets go out with one button (group 3 spec §10.2; P4-R4, P4-R8, P4-R18)", () => {
    const form = read(FORM)
    assert.ok(form.includes("body: JSON.stringify({ assetIds: [...selection.keys()], toLocationId: values.toLocationId, reason: values.reason, remark: values.remark }),"))
    assert.ok(form.includes("const answer = readBulkMoveSaveAnswer(payload)"))
    assert.ok(form.includes("setResult(answer ? { room: room.label, ...getBulkMoveResultParts(answer) } : null)"), "the result's room reads code - name (Z20)")
    assert.match(form, /if \(payload\?\.code === "ASSET_CHANGED_DURING_OPERATION"\) \{\n\s+setReviewOpen\(false\)\n\s+setAttempt\(\(count\) => count \+ 1\)\n\s+\}\n\s+throw new Error\(payload\?\.code \?\? payload\?\.error \?\? tCommon\("error"\)\)/)
    assert.match(form, /<div role="status" data-bulk-move-result>\n\s+\{resultText \? <Notice tone="success">\{resultText\}<\/Notice> : null\}/)
    for (const line of [
      't("resultMoved", { count: formatCount(result.moved), room: result.room }),',
      'result.components > 0 ? t("resultComponents", { count: formatCount(result.components) }) : null,',
      'result.unchanged > 0 ? t("resultUnchanged", { count: formatCount(result.unchanged) }) : null,',
    ]) assert.ok(form.includes(line), line)
    assert.match(form, /function changeSelection\(next: BulkMoveSelection\) \{\n\s+setSelection\(next\)\n\s+setResult\(null\)\n\s+setBlocked\(\[\]\)\n\s+fieldErrors\.clear\("assetIds"\)\n\s+\}/)
    assert.ok(form.includes("changeSelection(removeBulkMoveIds(selection, blocked.map((asset) => asset.assetId)))"))
    assert.ok(form.includes('<Button variant="secondary" size="md" aria-describedby="bulk-move-selection-error" onClick={removeBlocked}>'))
    assert.doesNotMatch(form, /toast\.success|router\.push|useRouter|from "sonner"/)
  })

  test("ย้ายที่ตั้งหลายรายการ on a phone: one header, then only a notice with a link to the register; the filters, table and bar are hidden below md (group 3 spec §10.4; P4-R19)", () => {
    const form = read(FORM)
    assert.match(form, /<Notice tone="info" title=\{t\("desktopOnlyTitle"\)\} data-bulk-move-desktop-only className="md:hidden" action=\{<Link href=\{`\/\$\{locale\}\/assets`\} className=\{buttonVariants\(\{ variant: "secondary", size: "md" \}\)\}>\{t\("backToRegister"\)\}<\/Link>\}>\n\s+\{t\("desktopOnlyBody"\)\}/)
    assert.ok(form.includes('<div data-bulk-move-desktop className="grid min-w-0 gap-4 max-md:hidden">'))
    const at = (text: string) => form.indexOf(text)
    assert.ok(at("<PageHeader") < at("data-bulk-move-desktop-only") && at("data-bulk-move-desktop-only") < at("data-bulk-move-desktop ") && at("data-bulk-move-desktop ") < at('<div role="search"'))
  })

  test("ย้ายที่ตั้งหลายรายการ: the page's words and the menu's (group 3 spec §10, §13; P4-R20)", () => {
    const th = messagesOf("th")
    const en = messagesOf("en")
    assert.equal(th.nav.bulkMove, "ย้ายที่ตั้งหลายรายการ")
    const words: Record<string, string> = {
      subtitle: "เลือกทรัพย์สินที่จะย้ายไปที่ตั้งเดียวกัน ผู้ถือครองและแผนกคงเดิม", searchLabel: "ค้นหา", searchPlaceholder: "ค้นหารหัส ชื่อ หรือผู้ถือครอง",
      filterLocation: "ที่ตั้งตอนนี้", filterCategory: "หมวดหมู่", filterAll: "ทั้งหมด", foundCount: "พบ {count} รายการ", tableCaption: "ทรัพย์สินที่ย้ายได้และย้ายไม่ได้",
      colTag: "รหัส", colName: "ชื่อ", colCategory: "หมวดหมู่", colLocation: "ที่ตั้งตอนนี้", colHolder: "ผู้ถือครอง", noHolder: "ไม่มี",
      selectPage: "เลือกทั้งหมดในหน้านี้", selectRow: "เลือก {tag}", componentsFollow: "+{count} ส่วนควบย้ายตาม", componentOf: "ส่วนควบของ {tag}",
      capReached: "เลือกได้สูงสุด {max} รายการต่อครั้ง", nothingSelected: "ยังไม่ได้เลือกทรัพย์สิน เลือกรายการในตารางเพื่อย้าย", listFailed: "โหลดรายการไม่สำเร็จ",
      selectedCount: "{count} รายการที่เลือก", clear: "ล้าง", toLocation: "ย้ายไป", reason: "เหตุผล", reviewAndMove: "ตรวจสอบและย้าย {count} รายการ",
      reviewTitle: "ตรวจสอบก่อนย้ายที่ตั้ง", reviewConfirm: "ยืนยันย้ายที่ตั้ง", reviewAssets: "ทรัพย์สิน", reviewAssetsValue: "{count} รายการ: {tags}",
      reviewComponents: "ส่วนควบย้ายตาม {count} ชิ้น", reviewAlreadyThere: "อยู่ที่ตั้งนี้แล้ว {count} รายการ ไม่บันทึกการย้าย",
      reviewOtherBranch: "ย้ายไปสาขาอื่น {count} รายการ รหัสยังเป็นของสาขาเดิม", reviewComponentsAlone: "ส่วนควบที่เลือกเอง {count} รายการ ย้ายแยกจากเครื่องหลัก",
      reviewKept: "ผู้ถือครองและแผนกคงเดิม", resultMoved: "ย้ายแล้ว {count} รายการไป {room}", resultComponents: "ส่วนควบย้ายตาม {count} ชิ้น",
      resultUnchanged: "อยู่ที่ตั้งนี้แล้ว {count} รายการ", blockedAssets: "ย้ายไม่ได้ {count} รายการ: {list}", removeBlocked: "นำรายการที่ย้ายไม่ได้ออก",
      desktopOnlyTitle: "หน้านี้ใช้บนคอมพิวเตอร์", desktopOnlyBody: "ย้ายที่ตั้งหลายรายการต้องเลือกจากตาราง เปิดหน้านี้บนคอมพิวเตอร์",
      backToRegister: "ไปที่ทะเบียนทรัพย์สิน",
    }
    for (const [key, value] of Object.entries(words)) {
      assert.equal(th.bulkMove[key], value, `th.bulkMove.${key}`)
      assert.ok(en.bulkMove[key], `en.bulkMove.${key}`)
    }
    for (const key of ["title", "selectLocation", "remark"]) assert.ok(th.bulkMove[key] && en.bulkMove[key], `${key} is kept`)
    for (const key of ["assets", "selectAssets", "success"]) for (const messages of [th, en]) assert.equal(messages.bulkMove[key], undefined, `bulkMove.${key} has no reader and is removed`)
  })
  ```

  **1b. `tests/v-track2-o.test.ts:257-276` (O5) is replaced by:**
  ```ts
  test("bulk move: the room and the reason in the bar are checked first, the refused assets land in the selection's place under the table in the row's words, and a refusal from the review comes back to its field (v-track O5; group 3 spec §10.2; plan 4 P4-R6, P4-R8, P4-R14)", () => {
    const source = read(`${C}asset-operations/bulk-move-form.tsx`)
    assertOperationForm(source, { ids: { assetIds: "bulk-move-selection", toLocationId: "bulk-move-to-location", reason: "bulk-move-reason" } })
    const rules = validateBody(source)
    for (const rule of [
      'check("assetIds", required(values.assetIds))',
      'check("toLocationId", required(values.toLocationId))',
      'check("reason", required(values.reason) ?? maxLength(values.reason, 500))',
    ]) assert.ok(rules.includes(rule), rule)
    assert.match(source, /fieldErrors\.setErrors\(validate\(\{ \.\.\.values, assetIds: \[\.\.\.selection\.keys\(\)\] \}\)\)/)
    assert.match(source, /<SearchableSelect id="bulk-move-to-location" label=\{t\("toLocation"\)\} value=\{values\.toLocationId\} required options=\{rooms\} [^\n]*error=\{fieldErrors\.message\("toLocationId"\)\}/)
    assert.match(source, /<Field label=\{t\("reason"\)\} id="bulk-move-reason" required error=\{fieldErrors\.message\("reason"\)\} className="w-80">\n\s+<Input value=\{values\.reason\} [^\n]*required maxLength=\{500\} \/>/)
    assert.match(source, /fieldErrors\.errors\.assetIds === "blocked"\s+\? t\("blockedAssets", \{ count: formatCount\(blocked\.length\), list: bulkMoveBlockedList\(blocked, blockedReason\) \}\)\s+: fieldErrors\.errors\.assetIds === "required"\s+\? t\("nothingSelected"\)\s+: fieldErrors\.message\("assetIds"\)/)
    assert.match(source, /const key = bulkMoveBlockedReasonKey\(code\)\n\s+return key \? tAll\(key\) : apiError\.describe\(code\)\.message/)
    assert.match(source, /const refused = readBulkMoveBlocked\(payload\)\n\s+if \(refused\.length > 0\) \{\n\s+setBlocked\(refused\)\n\s+fieldErrors\.setErrors\(\{ assetIds: "blocked" \}\)\n\s+focusFirstError\(\)\n\s+return\n\s+\}\n\s+if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/)
    assert.match(source, /const closed = waitForDialogToClose\(\)\n\s+setReviewOpen\(false\)\n\s+await closed\n/)
    assert.ok(source.includes("fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
    assert.ok(source.includes('<FieldError id="bulk-move-selection-error">{selectionError}</FieldError>'))
  })
  ```

  **1c. `tests/choice-controls-ui.test.ts:83-89` is replaced by:**
  ```ts
  test("bulk move ticks rows in its table: native checkboxes in a 44px label, the header one mixed, and no picker (P1, server search Task 7; group 3 spec §10.1; plan 4 P4-R22)", () => {
    const form = readFileSync("src/components/asset-operations/bulk-move-form.tsx", "utf8").replace(/\r\n/g, "\n")
    const table = readFileSync("src/components/asset-operations/bulk-move-table.tsx", "utf8").replace(/\r\n/g, "\n")
    assert.doesNotMatch(form, /<AssetOperationPicker\b|type="checkbox"/)
    assert.equal(table.match(/type="checkbox"/g)?.length, 2, "the header box and the row box")
    assert.equal(table.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2)
    assert.equal(table.match(/<label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center" data-no-row-click>/g)?.length, 2)
    assert.ok(table.includes('aria-checked={pageState === "some" ? "mixed" : pageState === "all"}'))
    assert.ok(table.includes('input.indeterminate = pageState === "some"'))
    for (const source of [form, table]) assert.doesNotMatch(source, /<button\b|rounded border \$\{checked|function Field\(|Loader2/)
    assert.match(form, /<Button type="submit" size="md" busy=\{saving\}>/)
  })
  ```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/bulk-move-form-ui.test.ts tests/v-track2-o.test.ts tests/choice-controls-ui.test.ts tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/e2e-transactions.test.ts tests/form-migration-guards.test.ts`. Expected failures:
  - every test in the new file, since there is no table file, the old page, and no new words;
  - O5, choice-controls, operations-sweep, form-frames, and e2e-transactions :139 and :458-461, all on HEAD's picker form and the page's `getAssetOperationMasterOptions()`;
  - GF5 on `maxLength 1 < 2`.

  The rest of each file passes.

- [ ] **Step 3: Implement.**

  **3a. Words.** Save `<scratchpad>/tx-group/msg/p4-t6-messages.json` and run `node scripts/messages-edit.mjs` on it. Expected output: `messages updated: 44 th, 44 en, 3 deleted`.
  - `set.th` is `"nav.bulkMove": "ย้ายที่ตั้งหลายรายการ"` and, as `"bulkMove.<key>"`, every value of Step 1a's `words` object, verbatim from P4-R20 (43 keys, `bulkMove.foundCount` "พบ {count} รายการ" included; Z8).
  - `delete` is `["bulkMove.assets", "bulkMove.selectAssets", "bulkMove.success"]`.
  - `set.en` has the same keys. The English is the task's own wording:
    - `nav.bulkMove` "Bulk Move Locations"; `subtitle` "Choose the assets to move to one location. Holders and departments stay the same.";
    - `searchLabel` "Search"; `searchPlaceholder` "Search code, name or holder"; `filterLocation` and `colLocation` "Current location"; `filterCategory` and `colCategory` "Category"; `filterAll` "All"; `foundCount` "{count} found" (no plural: it takes `formatCount`'s grouped string, Z8);
    - `tableCaption` "Assets that can and cannot be moved"; `colTag` "Code"; `colName` "Name"; `colHolder` "Holder"; `noHolder` "None"; `selectPage` "Select all on this page"; `selectRow` "Select {tag}";
    - `componentsFollow` "{count, plural, one {+# component moves with it} other {+# components move with it}}"; `componentOf` "Component of {tag}"; `capReached` "You can select up to {max} at a time";
    - `nothingSelected` "No assets selected. Tick rows in the table to move them."; `listFailed` "The list did not load"; `selectedCount` "{count} selected"; `clear` "Clear"; `toLocation` "Move to"; `reason` "Reason";
    - `reviewAndMove` "Review and move {count}"; `reviewTitle` "Review before moving"; `reviewConfirm` "Confirm move"; `reviewAssets` "Assets"; `reviewAssetsValue` "{count}: {tags}";
    - `reviewComponents` "{count, plural, one {# component moves with them} other {# components move with them}}"; `reviewAlreadyThere` "{count} already at this location; no move recorded"; `reviewOtherBranch` "{count} going to another branch; their codes stay with the original branch";
    - `reviewComponentsAlone` "{count, plural, one {# component chosen on its own moves apart from its parent} other {# components chosen on their own move apart from their parents}}"; `reviewKept` "Holders and departments stay the same";
    - `resultMoved` "Moved {count} to {room}"; `resultComponents` "{count, plural, one {# component moved with them} other {# components moved with them}}"; `resultUnchanged` "{count} already there";
    - `blockedAssets` "{count} cannot be moved: {list}"; `removeBlocked` "Remove the assets that cannot move"; `desktopOnlyTitle` "This page is for computers"; `desktopOnlyBody` "Bulk move needs the table. Open this page on a computer."; `backToRegister` "Go to the asset register".

  Every count is passed through `formatCount`. The count line uses `bulkMove.foundCount`, not `common.searchSelectResultCount`, whose en `{count, plural, …}` reads a grouped "1,234" as "NaN results" (Z8; the unfiltered list counts every active asset, about 8,800 on dev).

  **3b. The page** (`page.tsx`): drop the master-options import. Import `prisma` from `@/lib/db`, and `readBulkMoveListPage, readBulkMovePageOptions, type BulkMoveListDb` from `@/lib/bulk-move-list`. After the permission line comes the comment "Active rooms and categories only, and the first page, so the first paint has rows (group 3 spec §10.3; P4-R12)." Then the Step 1a lines `const db = …`, the `Promise.all` and the `<BulkMoveForm …/>`.

  **3c. The table** (`bulk-move-table.tsx`):
  - Hooks: `t = useTranslations("bulkMove")`, `tCommon`, `tAll = useTranslations()`, and a ref on the header input with `useEffect(() => { const input = headerRef.current; if (input) input.indeterminate = pageState === "some" }, [pageState])`.
  - From `listPage`:
    ```ts
    const { rows, total, page, pageSize } = listPage
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, total)
    ```
  - The `DataTable` has `caption={t("tableCaption")}`. Its `footer` is the `Pagination` from the Step 1a lines (labels `navigation: tCommon("pagination")`, `previous`, `next`, `pageOf`, `range`), shown only when `total > 0`.
  - Six heads:
    - the header box: aria-label `selectPage`, `checked={pageState === "all"}`, `disabled={disabled || (pageState === "none" && rows.every((row) => getBulkMoveRowLock(selection, row) !== null))}` (Z2, Task 5's Decision, pinned in Step 1a's row test);
    - then `colTag`, `colName`, `colCategory`, `colLocation`, `colHolder`.
  - Each row is `<DataTableRow data-bulk-move-row={row.assetTag}>`. Its box takes `checked={selection.has(row.id)}` and `onChange={(event) => onToggleRow(row, event.target.checked)}`.
  - The cells:
    - the tag in `font-mono`;
    - the name cell: the name, the status badge, the follow line, the component-of line, the reason line;
    - the category, the room, and the holder (the Step 1a line). A null category or room label renders `Nil` (LV2).
  - The sr-only cap line `{selection.size >= bulkMoveMaxAssets ? <p id={CAP_REASON_ID} className="sr-only">{t("capReached", { max: formatCount(bulkMoveMaxAssets) })}</p> : null}` comes before the table.

  **3d. The form** (`bulk-move-form.tsx`, rewritten).
  - **Module level:** `FIRST_QUERY`; `bulkMoveSearchDebounceMs`; `BulkMoveFormValues = { assetIds: readonly string[]; toLocationId: string; reason: string; remark: string }`; `FIELD_IDS` (Decision 1, one entry per line) and `FIELD_ORDER`; `validate(values: BulkMoveFormValues)` with the three Step 1b rules; `type BulkMoveResult = { room: string; moved: number; components: number; unchanged: number }`.
  - **State:** `selection` (`new Map()`), `values` (`{ toLocationId: "", reason: "", remark: "" }`), `searchText`, `query` (`FIRST_QUERY`), `list` (`{ href: initialHref, page: initialPage }` with `initialHref = buildBulkMoveListHref(FIRST_QUERY)`), `failedHref`, `attempt`, `blocked`, `result`, `reviewOpen`, `saving`, the `serverPage` ref (true), and `const href = buildBulkMoveListHref(query)`.
  - **The text effect** (Decision 8): `const text = searchText.trim()`, then the Step 1a return line, then `setTimeout(() => setQuery((current) => (current.q === text ? current : { ...current, q: text, page: 1 })), bulkMoveSearchDebounceMs)`, which is cleared on the next change.
  - The list effect, deps `[href, attempt, isDesktop, initialHref]`:
    ```ts
    useEffect(() => {
      if (!isDesktop) return
      // The server rendered the first page (P4-R12): the first run on it asks nothing.
      if (serverPage.current) {
        serverPage.current = false
        if (href === initialHref) return
      }
      const controller = new AbortController()
      void (async () => {
        try {
          const response = await fetch(href, { signal: controller.signal })
          const payload = response.ok ? await response.json().catch(() => null) : null
          if (controller.signal.aborted) return
          const answer = (payload?.data ?? null) as BulkMoveListPage | null
          if (!answer) return setFailedHref(href)
          setFailedHref(null)
          setList({ href, page: answer })
          setSelection((current) => refreshBulkMoveSelection(current, answer.rows))
        } catch {
          if (!controller.signal.aborted) setFailedHref(href)
        }
      })()
      // A newer query or a refresh drops this answer (Review Focus 5).
      return () => controller.abort()
    }, [href, attempt, isDesktop, initialHref])
    ```
    `listLoading = isDesktop && list.href !== href && !listFailed` feeds `SearchField`'s `loading`.
  - **Handlers:**
    - `changeSelection` (Step 1a), which every tick goes through:
      - `toggleRow(row, checked)` → `changeSelection(toggleBulkMoveRow(selection, row, checked).selection)`;
      - `togglePage(checked)` → `changeSelection(setBulkMovePage(selection, list.page.rows, checked).selection)`;
      - `clearSelection()` → `changeSelection(new Map())`.
    - `removeBlocked()` and `changeFilter` (Step 1a).
    - `setField(field: "toLocationId" | "reason" | "remark", value)` also clears that field's error when the field is in `FIELD_IDS`.
  - **Words:**
    - `blockedReason(code)` (the two lines of Step 1b) and `selectionError`.
    - `room`, `counts`, and `reviewItems`: the three items, or `[]` when no room is picked.
    - `reviewLines`: the five lines, `.filter((line): line is string => line !== null)`.
    - `resultText`: the three parts, `.filter(Boolean).join(" · ")`, or null.
  - **Review flow:** `leaveReview` and `focusFirstError` take transfer's shape (Step 1b pins). `handleSubmit` runs `event.preventDefault()`, the Step 1b `setErrors(validate(…))` line, `if (focusFirstError()) return`, then `setReviewOpen(true)`.
  - `submitMove`:
    - `if (!room) return` and `setSaving(true)`.
    - `fetch("/api/assets/bulk-move", { method: "POST", headers: { "Content-Type": "application/json" }, body: … })` with the Step 1a body.
    - On `!response.ok`: the Step 1b refused branch, the `applyServer` line, then the Step 1a `ASSET_CHANGED_DURING_OPERATION` block and its throw.
    - On success:
      ```ts
      const answer = readBulkMoveSaveAnswer(payload)
      setReviewOpen(false)
      setSelection(new Map())
      setBlocked([])
      setValues({ toLocationId: "", reason: "", remark: "" })
      fieldErrors.setErrors({})
      setResult(answer ? { room: room.label, ...getBulkMoveResultParts(answer) } : null)
      setAttempt((count) => count + 1)
      ```
    - `catch (error) { apiError.toast(error) } finally { setSaving(false) }`.
  - **Render.** A root `<div className="grid min-w-0 gap-4">` holds, in order:
    1. `<PageHeader title={t("title")} meta={t("subtitle")} />`.
    2. The phone `Notice` (Step 1a).
    3. `<div data-bulk-move-desktop …>` (Step 1a), which holds:
       - the filters: a 3-column grid from md;
       - the room filter, with `searchPlaceholder={tCommon("searchSelectPlaceholder")}` and `emptyLabel={tCommon("searchSelectNoResults")}` (as HEAD's bulk-move form passes them) and `onChange={(value) => changeFilter({ locationId: value || null })}`;
       - the category filter, with `options={categories.map((category) => ({ value: category.id, label: category.label }))}`, `value={query.categoryId ?? ""}` and `onChange={(event) => changeFilter({ categoryId: event.target.value || null })}`;
       - `<p data-bulk-move-count aria-live="polite" className="text-meta text-muted-foreground num">{t("foundCount", { count: formatCount(list.page.total) })}</p>`;
       - the result region;
       - the failed `Notice`;
       - `<form onSubmit={handleSubmit} noValidate className="grid min-w-0 gap-4">`, holding `<BulkMoveTable listPage={list.page} selection={selection} disabled={saving} onToggleRow={toggleRow} onTogglePage={togglePage} onPage={…} />`, then the `EmptyNote` or the bar.
    4. The `OperationReviewDialog`.
  - **The bar:**
    - `actions` is one `<div className="flex flex-wrap items-start gap-3">` holding:
      - `<div className="w-72">` with HEAD's room `SearchableSelect` line, using `options={rooms}`;
      - the reason `Field`;
      - the submit `Button`.
    - `children` is `{selectionError ? <div id="bulk-move-selection" className="grid justify-items-start gap-2"><FieldError id="bulk-move-selection-error">{selectionError}</FieldError>{blocked.length > 0 ? <Button … onClick={removeBlocked}>{t("removeBlocked")}</Button> : null}</div> : null}`.
  - **The dialog:**
    - `onClose={() => setReviewOpen(false)}` and `onConfirm={() => void submitMove()}`.
    - Its children are one `<div className="grid gap-3">` holding `<ul data-bulk-move-review-lines className="grid gap-1.5 text-sm text-foreground">` (no border of its own: Task 4's wrapper draws the line under the items; Z6) and then the remark `Field`, with `rows={3}` and `onChange={(event) => setField("remark", event.target.value)}`.
  - Top-of-component comment: "ย้ายที่ตั้งหลายรายการ (group 3 spec §10): a server-paged table whose ticks survive pages and filters (row snapshots, Task 5), a bar with the room and the reason, a review that says what moves, and the page stays after the save. Below md only a notice (§10.4)."

- [ ] **Step 4: Run the tests and the checks.**
  - Re-run the Step 2 command, plus `node --test tests/validation-guards.test.ts tests/list-frame-guards.test.ts tests/desktop-selection-bar.test.ts tests/e2e-cross-cutting.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/mobile-field-navigation.test.ts tests/sidebar-menu-structure.test.ts tests/asset-operation-picker-forms.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts` and Task 5's form-rules test file. Expected: all pass.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors.
  - A pin outside this list that fails is rewritten in this commit and named in the report.

- [ ] **Step 5: Commit.**
```
git add "src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx" src/components/asset-operations/bulk-move-form.tsx src/components/asset-operations/bulk-move-table.tsx messages/th.json messages/en.json tests/bulk-move-form-ui.test.ts tests/v-track2-o.test.ts tests/choice-controls-ui.test.ts tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/e2e-transactions.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(bulk-move): ย้ายที่ตั้งหลายรายการ is a server-paged table with filters in a search region, ticks that survive pages and filters up to 100, a bar with the room and the reason, a review that says what moves, the refused assets named under the table with one button to remove them, a result line on the same page, and a notice alone on a phone (group 3 spec §10, §11, §13; plan 4 P4-R1 to P4-R4, P4-R6, P4-R8 to P4-R22)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `AssetOperationPicker` takes one asset per field: the `multiple` mode, its chosen list and its "เลือกแล้ว" row note are removed (spec §10.1; P4-R24)

ย้ายที่ตั้งหลายรายการ was the only page that used the picker's `multiple` mode. Since Task 6 it ticks rows in its own `DataTable`, so the mode has no user left. This task removes:
- the mode;
- its chosen list with a remove button per row;
- its "pick keeps the list open" path (S-R44) and its live announcement;
- the `"chosen"` row note it fed into `getAssetOperationRowView`.

The three single-pick users (ส่งมอบ `checkout-asset`, รับคืน `checkin-checkout`, โอนย้าย `transfer-asset`) behave exactly as before. This task changes no message: the three keys only the mode read are deleted by Task 8 (see Decisions).

Every line number below is HEAD `020a8533`'s. Tasks 1-6 do not touch `src/components/ui/asset-operation-picker.tsx`, `src/lib/asset-operation-picker-rules.ts` or their two test files, so those line numbers hold. Task 4 edits `DESIGN.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md` (other bullets and rows), so in those two files this task finds its lines by their content.

**The rulings this task carries:**
- **P4-R24:** bulk-move was the `multiple` mode's only user. Task 7 removes the mode, rewrites its pins and changes the docs/14 row.
- **Global Constraints, Code shape:** pure rule files keep their relative `.ts` imports and `import type` only. CRLF files stay CRLF.
- **Appendix Z (the controller's rulings on the cross-check):** Z1 (this task keeps the three picker keys; Task 8 deletes them in the commit that drops `TX_WORDS.chosenList` and `alreadyChosen`, with the "has no reader" assertions), Z21 (the search's `bulkMove` mode stays, note only), Z24 (this task also owns `src/lib/asset-operation-picker-rules.ts`, `tests/asset-operation-picker-rules.test.ts` and the DESIGN.md picker bullet; the skeleton's Tasks table says so).

**Decisions** (the skeleton leaves these open):
- **Message order: Task 7 keeps the keys and Task 8 deletes them.**
  - After this task, `assetOperation.selectedTitle` ("ที่เลือกแล้ว {count} รายการ"), `assetOperation.chosen` ("เลือกแล้ว") and `assetOperation.removeNamed` ("นำ {tag} ออก") are read only by the old e2e spec, through `TX_WORDS.chosenList` / `TX_WORDS.alreadyChosen` (`e2e/transactions/tx-words.ts:7-8`, `e2e/transactions/bulk-move.spec.ts:73,77`).
  - `tests/e2e-transactions.test.ts:475` requires every `TX_WORDS` value to exist in `messages/th.json`. `tsconfig.json` includes `**/*.ts`, so dropping the two `TX_WORDS` entries here would break `npx tsc --noEmit` on the old spec, which Task 8 rewrites whole.
  - So this task writes **no** `p4-t7-messages.json`.
  - **Task 8 must (Z1; Task 8's Decision 9 and Step 3c carry it):**
    - write `tx-group/msg/p4-t8-messages.json` = `{ "delete": ["assetOperation.selectedTitle", "assetOperation.chosen", "assetOperation.removeNamed"] }` and run it (expected `messages updated: 0 th, 0 en, 3 deleted`), in the same commit as the next bullet, because `tests/e2e-transactions.test.ts:475` needs every `TX_WORDS` value in th.json;
    - drop `TX_WORDS.alreadyChosen` and `TX_WORDS.chosenList`, and the pin `tests/e2e-transactions.test.ts:389`;
    - add "has no reader and is removed" assertions for the three keys in `tests/asset-operation-picker-ui.test.ts`'s words test (th and en);
    - fix the comment `e2e/transactions/tx-support.ts:236` ("or bulk-move's chosen list"), `DEVELOPER_HANDOFF.md:1279` (`bulk-move-assets` (`multiple`)) and `docs/07_UAT_CHECKLIST.md:540`.
- **The `"chosen"` row note goes too.** Once the mode is gone, `chosenIds` is always empty, so `t("chosen")` and the muted note would be dead code that keeps a message alive.
  - `getAssetOperationRowView` loses its `chosenIds` parameter and becomes `(row, pickBlocked?)`.
  - `AssetOperationRowNote` becomes `{ kind: "reason"; key: string } | null`. The `kind` field stays, so every expected `{ kind: "reason", key }` in the rules tests stays as written.
  - So Task 7 owns `src/lib/asset-operation-picker-rules.ts` and `tests/asset-operation-picker-rules.test.ts` too (Z24, the skeleton's Tasks table).
- **One props type.** `AssetOperationPickerBaseProps` and the two-member union merge into one exported `type AssetOperationPickerProps = { … }`:
  - the base fields in today's order, then `value`, `onChange` and `pickBlocked` with today's single-pick types and doc comment;
  - the component destructures `value`, `onChange` and `pickBlocked` with the rest;
  - the name `AssetOperationPickerProps` and the signature `AssetOperationPicker(props: AssetOperationPickerProps)` (pinned at `:13`) stay.
- **No live announcement state.** `announcement` / `setAnnouncement` existed only for the many-pick count.
  - `liveText` becomes `open && state !== "hint" ? stateText : ""`.
  - A single pick closes the list and moves focus to "เปลี่ยน", whose `aria-label` already names the asset (`changeNamed`).
- **`DESIGN.md` is edited here too.** Its `AssetOperationPicker` bullet describes the mode (`DESIGN.md:510`, `:513`, `:514`, `:516-517` at HEAD). Task 7 owns that bullet (Z24); leaving DESIGN.md describing a removed mode would contradict the code.
- **The search's `bulkMove` mode stays** (Z21, note only). It remains in `assetOperationModes` (`src/lib/asset-operation-eligibility.ts:17`) and in `src/lib/asset-operation-search-rules.ts:464`, together with its ~10 search pins (tests.md). It has no UI caller after Task 6, but `getBulkMoveVerdict` and those pins share it. It is the server search's mode, not the picker's `multiple` mode, and P4-R24 does not rule on it. The controller recorded it for a later cleanup; this task does not touch it.

**Precondition (check before Step 1):**
- `grep -rn -A8 "<AssetOperationPicker" src | grep -w multiple` prints nothing, because Task 6 removed the bulk-move form's picker.
- If it prints a line, stop and report.

**Files:**
- Modify: `src/components/ui/asset-operation-picker.tsx` (CRLF):
  - `:4` `import { Search, X }` → `import { Search }` (`X` is used only by the remove button);
  - `:39-63`: the base type and the union → one `export type AssetOperationPickerProps`;
  - `:66`: `noIds` deleted. `noRows` (`:65`) stays: `:109` uses it;
  - `:71`: the destructure adds `value, onChange, pickBlocked`;
  - `:85`: the `announcement` state deleted;
  - `:93-95` → `const showSearch = !value`;
  - `:102-103` (`chosenIds`, the `pickBlocked` ternary) deleted;
  - `:105`: `rowView` passes `pickBlocked && (() => pickBlocked(row))` as the second argument;
  - `:119-120`: the S-R44 comment and `liveText`, as decided above;
  - `:149`: the focus effect's deps → `[value]`;
  - `:165-184`: `pick` keeps the guard and the single branch only;
  - `:186-192`: `change` loses `if (props.multiple) return` and calls `onChange(null)`;
  - `:194-199`: `remove` deleted;
  - `:205`: `setAnnouncement("")` deleted;
  - `:277-281`: the note span (Step 3);
  - `:403-421`: the chosen list deleted.
- Modify: `src/lib/asset-operation-picker-rules.ts` (CRLF), `:62-78`: `AssetOperationRowNote`, the doc comment and `getAssetOperationRowView`.
- Modify: `DESIGN.md` (CRLF), the `AssetOperationPicker` bullet (Step 3).
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (CRLF), the row that starts `| An asset for a transaction` (`:67` at HEAD).
- Test: `tests/asset-operation-picker-ui.test.ts` (CRLF): the pins below.
- Test: `tests/asset-operation-picker-rules.test.ts` (CRLF): `:66-73` and `:122-131`.
- Messages: none (Decisions).

**Existing pins this task breaks, rewritten in this commit** (all in Step 1):
- `tests/asset-operation-picker-ui.test.ts`:
  - `:10` (title "one pick or many") and `:15-16` (both members of the union);
  - `:39` (title "the chosen rows");
  - `:58-62` (S-R44 `liveText`, the remove's and the typing's `setAnnouncement`);
  - `:70-71` (`rowView` with `chosenIds`; `props.multiple ? undefined : props.pickBlocked`);
  - `:86` (`'t("chosen")'` and `'t("selectedTitle", { count: values.length })'` in the words list);
  - `:94-109` (the S-R44 test; its single-pick check `:108` reads `props.onChange(row)`);
  - `:125-129` (M-6: the muted "chosen" note);
  - `:151-152` and `:155` (`selectedTitle`, `chosen` and `removeNamed` in the words map);
  - `:187` (docs/14 phrase "`multiple` with `values`");
  - `:201` (`props.multiple || !value`).
  - The skeleton listed only `:15-16`, `:58-62`, `:71`, `:94-107`, `:187` and `:201`.
- `tests/asset-operation-picker-rules.test.ts`:
  - `:66-73` (the "chosen" assertions and the 2-argument calls);
  - `:122-131` (calls with `none` and the "chosen still wins" line).

**These stay green with no edit.** Name any that does not in the report.
- `tests/e2e-transactions.test.ts:443-476`:
  - the picker hooks at `:456-457`: `data-asset-picked=` stays on the single box `:300`;
  - `:475`: the three keys are kept.
  - Its `bulk-move-form.tsx` tuple at `:458` is Task 6's rewrite, not this task's.
- `tests/e2e-transactions.test.ts:382-395`: the old spec's text, which Task 8 rewrites.
- `tests/asset-photo-preview.test.ts:104-108`: the thumbnail, `data-asset-option={row.id}`, `aria-disabled` and `data-asset-option-reason`.
- `tests/checkout-form-rules.test.ts:174-175`: `pickedBody?: …` and `{pickedBody ? pickedBody(value) : (`.
- `tests/asset-operation-picker-forms.test.ts`: the three single-pick JSX pins.
- `tests/form-migration-guards.test.ts:134`: `[0, 1, 0]` for the picker; `maxLength={assetOperationSearchMaxChars}` stays.
- `tests/list-frame-guards.test.ts:132` and `tests/validation-guards.test.ts` (`SELECT_TAGS`).
- `tests/messages-parity.test.ts` and `tests/thai-glossary.test.ts`: no message changes.

**Interfaces:**
- Consumes:
  - `moveAssetOperationActive`, `resolveAssetOperationActive` (`src/lib/asset-operation-picker-rules.ts:138` and above). Both are unchanged, and the arrows still use `moveAssetOperationActive`.
  - Task 6's form: no `multiple` user remains (Precondition).
- Produces:
  ```ts
  // src/components/ui/asset-operation-picker.tsx
  export type AssetOperationPickerProps = {
    id: string
    label: string
    mode: AssetOperationMode
    context?: AssetOperationPickerContext
    hint?: React.ReactNode
    error?: React.ReactNode
    required?: boolean
    initialQuery?: string
    pickedBody?: (row: AssetOperationSearchRow) => React.ReactNode
    value: AssetOperationSearchRow | null
    onChange: (row: AssetOperationSearchRow | null) => void
    /** A refused row this accepts can still be picked, so its reason reads under the field (group 3 spec §19.3, A1-R1). */
    pickBlocked?: (row: AssetOperationSearchRow) => boolean
  }
  export function AssetOperationPicker(props: AssetOperationPickerProps): React.JSX.Element

  // src/lib/asset-operation-picker-rules.ts
  export type AssetOperationRowNote = { kind: "reason"; key: string } | null
  export function getAssetOperationRowView(
    row: Pick<AssetOperationSearchRow, "id" | "eligible" | "reasonKey">,
    pickBlocked?: (row: Pick<AssetOperationSearchRow, "id" | "eligible" | "reasonKey">) => boolean,
  ): { selectable: boolean; note: AssetOperationRowNote }
  ```
  - The base fields keep their doc comments (`:40`, `:45`, `:49`, `:51`).

- [ ] **Step 1: Write the failing tests, and rewrite the pins above.**
  - `tests/asset-operation-picker-rules.test.ts:66-73` becomes:
```ts
test("a row: takeable, or not takeable with its reason key; there are no chosen ids (spec 6.1; group 3 spec §10.1; P4-R24)", () => {
  assert.deepEqual(getAssetOperationRowView(row()), { selectable: true, note: null })
  assert.deepEqual(getAssetOperationRowView(row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" })), { selectable: false, note: { kind: "reason", key: "asset.transactionReasonStatusNotReady" } })
  assert.deepEqual(getAssetOperationRowView(row({ eligible: false, reasonKey: null })), { selectable: false, note: null })
  assert.equal(getAssetOperationRowView.length, 2, "the row and pickBlocked")
})
```
  - `:122-131` becomes:
```ts
test("pickBlocked: a refused row it accepts can be picked and keeps its reason (group 3 spec §19.3, A1-R1; §10.1, P4-R24)", () => {
  const damaged = row({ eligible: false, reasonKey: "asset.transactionReasonConditionDamaged" })
  const condition = (candidate: Pick<AssetOperationSearchRow, "reasonKey">) => candidate.reasonKey === "asset.transactionReasonConditionDamaged"
  assert.deepEqual(getAssetOperationRowView(damaged, condition), { selectable: true, note: { kind: "reason", key: "asset.transactionReasonConditionDamaged" } })
  assert.deepEqual(getAssetOperationRowView(damaged, () => false), { selectable: false, note: { kind: "reason", key: "asset.transactionReasonConditionDamaged" } })
  assert.deepEqual(getAssetOperationRowView(damaged), { selectable: false, note: { kind: "reason", key: "asset.transactionReasonConditionDamaged" } })
  assert.deepEqual(getAssetOperationRowView(row(), () => true), { selectable: true, note: null }, "a takeable row is unchanged")
})
```
  - `tests/asset-operation-picker-ui.test.ts`:
    - **`:10`**: the title becomes `"AssetOperationPicker: a client part that takes one asset per field; the field's id names its root and the search field is <id>-search (group 3 spec §10.1; P4-R24)"`.
      - In the parts list, `:15-16` become
        ```ts
            "value: AssetOperationSearchRow | null", "onChange: (row: AssetOperationSearchRow | null) => void",
            "pickBlocked?: (row: AssetOperationSearchRow) => boolean",
        ```
      - After the loop (before the `<div` match), add:
        ```ts
          assert.match(source, /^export type AssetOperationPickerProps = \{$/m, "one shape, no union")
          assert.doesNotMatch(source, /\bmultiple\b|\bvalues\b|chosenIds|noIds|selectedTitle|removeNamed|t\("chosen"\)|announcement|S-R44|function remove\(/)
        ```
    - **`:39`**: the title's "the chosen rows" becomes "the chosen asset". The rest of the title and `:40-57` stay.
    - **`:58-62`** become:
      ```ts
        // The polite region reads the state and the count while the list is open; a pick closes it and focus names the asset.
        assert.match(source, /const liveText = open && state !== "hint" \? stateText : ""/)
        assert.ok(source.includes('aria-live="polite">{liveText}</span>'), "the region reads nothing while the list is closed")
      ```
    - **`:70-71`** become:
      ```ts
        assert.match(source, /const rowView = \(row: AssetOperationSearchRow\) => getAssetOperationRowView\(row, pickBlocked && \(\(\) => pickBlocked\(row\)\)\)/)
        assert.match(source, /const \{ id, label, mode, context, hint, error, required, initialQuery, pickedBody, value, onChange, pickBlocked \} = props/)
      ```
    - **`:86`**: drop `'t("chosen")', ` and `'t("selectedTitle", { count: values.length })', ` from the list. Every other entry stays.
    - **`:94-109`** (the whole S-R44 test) are replaced by:
      ```ts
      test("one pick: the field takes the row, the list closes and focus goes to เปลี่ยน; เปลี่ยน empties the field and focuses the search (group 3 spec §10.1; P4-R24)", () => {
        const source = read(PART)
        const body = (head: string) => {
          const start = source.indexOf(head)
          assert.ok(start > 0, head)
          return source.slice(start, source.indexOf("\n  }\n", start))
        }
        assert.match(body("  function pick(row: AssetOperationSearchRow) {"), /\{\n\s+if \(!rowView\(row\)\.selectable\) return\n\s+onChange\(row\)\n\s+setOpen\(false\)\n\s+focusRequest\.current = "change"$/)
        assert.match(body("  function change() {"), /\{\n\s+onChange\(null\)\n\s+setQuery\(""\)\n\s+setActiveId\(null\)\n\s+focusRequest\.current = "search"$/)
        assert.match(source, /else searchRef\.current\?\.focus\(\)\n\s+\}, \[value\]\)/, "focus moves once the page has taken the pick or the change")
      })
      ```
    - **`:125-129`**: the title becomes `"final review M-1, M-6: the counts are grouped, a reason under a row reads as a warning, the search text is capped (M-11's muted เลือกแล้ว went with the multiple mode, group 3 spec §10.1; P4-R24)"`.
      - `:128-129` become:
        ```ts
          assert.ok(source.includes('<span data-asset-option-reason className="text-meta text-warning">'))
          assert.doesNotMatch(source, /note\.kind === "chosen"|text-muted-foreground" : "text-warning"/)
        ```
      - `:130-131` stay.
    - **`:151-152`, `:155`**: delete the `selectedTitle`, `chosen` and `removeNamed` rows of `words`. Task 8 adds their "has no reader" assertions when it deletes the keys.
    - **`:173-195`**:
      - After the DESIGN.md phrase loop (`:183`), add:
        ```ts
          assert.ok(!block.includes("`multiple`") && !block.includes("Many picks") && !block.includes("เลือกแล้ว"), "DESIGN.md describes one asset per field (P4-R24)")
          assert.ok(block.includes("one asset per field"))
        ```
      - `:187`'s phrase list becomes `["`AssetOperationPicker`", "never holds a list of the register", "stays listed with its reason", "one asset per field", "never inside `Field`"]`, followed by:
        ```ts
          assert.ok(row.startsWith("\n| An asset for a transaction (ส่งมอบ, รับคืน, โอนย้าย) |") && !row.includes("`multiple`"), "docs/14: no multiple mode (P4-R24)")
        ```
      - The title gains ` (group 3 spec §10.1; P4-R24)`.
    - **`:201`** becomes `assert.match(source, /const showSearch = !value\n/)`.

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts`. Expected failures, and only these:
  - **rules**, 2 tests:
    - "a row: …" fails with `TypeError: Cannot read properties of undefined (reading 'has')`, because today's second parameter is `chosenIds`;
    - "pickBlocked: …" fails with `TypeError: chosenIds.has is not a function`.
  - **ui**, 7 tests:
    - `:10` (the `pickBlocked?:` part and the `doesNotMatch`);
    - `:39` (`liveText`);
    - the keys test (`rowView` and the destructure);
    - the new one-pick test (`pick` still holds `if (props.multiple)`);
    - M-6 (the `cn(` ternary);
    - the docs test (no "one asset per field" in DESIGN.md);
    - the look step (`props.multiple || !value`).
  - The words tests pass already, since they lost entries.

- [ ] **Step 3: Implement.**
  - **3a. The rule** (`src/lib/asset-operation-picker-rules.ts:62-78`):
    - Apply the Produces types.
    - The body: `if (!row.eligible) return { selectable: pickBlocked?.(row) === true, note: row.reasonKey ? { kind: "reason", key: row.reasonKey } : null }`, then `return { selectable: true, note: null }`.
    - The doc comment becomes:
      ```ts
      /**
       * A refused row that pickBlocked accepts can still be picked, so its reason reads under the field (ส่งมอบ's condition
       * refusal, group 3 spec §19.3, A1-R1); it keeps its reason note. One asset per field: no row is "chosen" (plan 4 P4-R24).
       */
      ```
  - **3b. The part** (`src/components/ui/asset-operation-picker.tsx`): make the line edits listed under Files.
    - `pick` becomes `if (!rowView(row).selectable) return` / `onChange(row)` / `setOpen(false)` / `focusRequest.current = "change"`. Its S-R44 comment goes.
    - `change` becomes `onChange(null)` / `setQuery("")` / `setActiveId(null)` / `focusRequest.current = "search"`.
    - The `liveText` comment is `// The polite region reads the state and the count while the list is open (spec 6.1).`
    - The row note (`:277-281`) becomes:
      ```tsx
                {note ? (
                  <span data-asset-option-reason className="text-meta text-warning">
                    {tAll(note.key)}
                  </span>
                ) : null}
      ```
    - The `{props.multiple && values.length > 0 ? (…) : null}` block (`:403-421`) is removed. The live region `<span className="sr-only" aria-live="polite">{liveText}</span>` stays as the root's last child.
    - Nothing else moves: the effects, the keys, `renderRow`, `RowDetail`, `RowBadge` and `WordsHighlight` are unchanged.
    - Leave no stray blank line where blocks were removed.
  - **3c. DESIGN.md**, the `- **`AssetOperationPicker`**` bullet and its sub-bullets:
    - Head sentence: "the asset field of ส่งมอบ, รับคืน, โอนย้าย and ย้ายที่ตั้งหลายรายการ." becomes "the asset field of ส่งมอบ, รับคืน and โอนย้าย, one asset per field (ย้ายที่ตั้งหลายรายการ ticks its assets in a `DataTable` since group 3 plan 4)."
    - The refused-row sub-bullet: delete its last sentence, ` A row already chosen reads "เลือกแล้ว" the same way.`
    - The States sub-bullet: "…reads them and the count while the list is open, and the chosen count after a pick or a remove." becomes "…reads them and the count while the list is open."
    - "  - One pick: the chosen asset shows in the field with…" becomes "  - The chosen asset shows in the field with…" (the rest unchanged).
    - Delete the whole "  - Many picks (`multiple`): …" sub-bullet.
  - **3d. docs/14**: the row becomes exactly:
    ```
    | An asset for a transaction (ส่งมอบ, รับคืน, โอนย้าย) | `AssetOperationPicker` | asks the server search with the page's `mode` and `context` and never holds a list of the register; a row it cannot take stays listed with its reason; one asset per field (ย้ายที่ตั้งหลายรายการ ticks its assets in a `DataTable`); `id` and `error` as `SearchableSelect` (the search field is `<id>-search`); never inside `Field` |
    ```
  - Keep CRLF in all six files. Use the Edit tool, not `sed -i`.

- [ ] **Step 4: Run the tests and the checks.**
  - Re-run the Step 2 command: every test passes.
  - Run the neighbours: `node --test tests/asset-operation-picker-forms.test.ts tests/asset-photo-preview.test.ts tests/checkout-form-rules.test.ts tests/e2e-transactions.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/validation-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`. Every test passes with no edit.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`: no failures and 0 lint errors.
    - tsc also proves that the three single-pick forms still type-check against the merged props.
    - Lint proves that no unused import (`X`) or variable (`noIds`) is left.
  - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - `git grep -n "multiple" -- src/components/ui/asset-operation-picker.tsx` prints nothing.
  - No E2E here. Task 8's run covers the three single pickers (ส่งมอบ, รับคืน, โอนย้าย specs) through the whole suite.

- [ ] **Step 5: Commit.**
```
git add src/components/ui/asset-operation-picker.tsx src/lib/asset-operation-picker-rules.ts DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md tests/asset-operation-picker-ui.test.ts tests/asset-operation-picker-rules.test.ts
git commit -m "refactor(asset-picker): AssetOperationPicker takes one asset per field; the multiple mode, its chosen list with remove buttons, its pick-keeps-the-list-open path and the เลือกแล้ว row note go, now that ย้ายที่ตั้งหลายรายการ ticks rows in its own table (group 3 spec §10.1; plan 4 P4-R24)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: E2E of ย้ายที่ตั้งหลายรายการ, the docs, and the run of the whole suite (spec §10, §11, §17; P4-R1, P4-R3, P4-R4, P4-R6, P4-R8, P4-R10, P4-R12, P4-R15, P4-R17, P4-R18, P4-R19, P4-R22)

`bulk-move.spec.ts` follows the new page:
- the batch form's three assets stay, in all four projects;
- on the desktop, BM1 gathers rows from two filters into one selection and moves them, with the review's lines and the result line, then reads the assets back;
- BM2 covers a stale tick named under the table, then the refused row and the route's named 409 and cap;
- the phone checks only the notice.

Then come the docs and the controller's run. This is the last plan of page group 3, so the controller also runs the whole suite. T1 to T7 have changed the files below, so each block is named by its content. Line numbers are `020a8533`'s.

**The rulings this task carries:**
- **P4-R1:** an installed ส่วนควบ ticked alone moves alone, and its link stays `installed`. BM1 moves C2 that way through the route before the page's move, and after the save reads the parent's row "+3 ส่วนควบย้ายตาม" (all three links still installed). The docs say that the parent's next move pulls it back.
- **P4-R3:** the review's M leaves out components that are themselves ticked or already in the room. The result line's M is the answer's `componentSync.updated`. BM1 pins both, with one component of each kind (Review Focus 1).
- **P4-R4, P4-R5, P4-R6:** one 409 names every refused asset with its own code. An open handover is `ASSET_ACTIVE_CHECKOUT_EXISTS`. The list under the table uses the row's reason words.
- **P4-R8:** "นำรายการที่ย้ายไม่ได้ออก" unticks the refused ids.
- **P4-R10:** the cap is 100; 101 ids answer 400 `VALIDATION_FAILED` under `assetIds`.
- **P4-R12:** the first page is server-rendered. Every filter change is a client fetch of `GET /api/asset-operations/bulk-move-list`, and the spec waits for each answer.
- **P4-R15, P4-R18:** an unchanged count, and the page stays after the save. The ticks clear, the page is fetched again, and the result `Notice` (`role="status"`) shows. There is no toast.
- **P4-R17:** the review's items and lines.
- **P4-R19:** below `md`, one h1, the notice and the link, and nothing fetched.
- **P4-R22:** the row checkbox is named "เลือก {tag}". The header checkbox shows `aria-checked="mixed"`. A refused box is disabled, with the reason as its accessible description.
- **The skeleton's E2E rule:** run-scoped assets only, and no master-data change. The second room is the run's own (`ensureSecondLocation`).
- **P4-R24 (messages part):** the three picker keys the `multiple` mode read are deleted here, with their "has no reader" assertions (Task 7 handed them over).
- **Appendix Z (the controller's rulings on the cross-check):** Z1 (the three picker keys deleted through `p4-t8-messages.json`, with the no-reader assertions, in the commit that drops `TX_WORDS.chosenList` and `alreadyChosen`), Z8 (`TX_WORDS.bulkFound` copies `bulkMove.foundCount`), Z9 (BM1's filter 2 word is "ครบชุด", which only the BM1 assets carry), Z10 (Step 5 says what `--list` counts), Z12 (the batch test stays in all four projects: a recorded call against §17's "only the notice"), Z13 (the spec is rewritten here, one task after the page: a recorded deviation), Z20 (a `blocked` 409 closes the review and focuses `#bulk-move-selection`; the result's room reads "code - name"), Z22 (BM1 reads the parent's "+3" after the save and `branchId` back; the changelog adds P4-R11 and P4-R15 for the user), Z23 (the `returnChecklistBox` lines).

**Decisions:**
1. **One file, four tests** (`bulk-move.spec.ts`), so TX7's spec list (`tests/e2e-transactions.test.ts:438-440`) does not change.
   - Describe 1 is serial: the batch test (all four projects) hands its three assets to BM1 (desktop) through a map keyed by project, as transfer's `transfers` map does.
   - Describe 2 is not serial: BM2 (desktop) and the phone notice make their own data, so a batch failure skips neither.
   - The spec is rewritten here, not with the page in Task 6, as §17 ("in the same task as the change") asks. No E2E runs between Task 6 and this task. Recorded deviation (Z13).
2. **The batch half stays in all four projects.** It is the only E2E of the batch form and of its phone cards (`:31-60` today, unchanged apart from the map line). On the phone its three assets are not moved, and the bulk-move page is never opened. This is a recorded call against §17's "on the phone projects only the notice is checked" (Z12).
3. **BM1's data:** the three batch assets, and a computer `BMP` held by `receiver1` with three installed components `BMC1`-`BMC3` (`installComponentByApi`, slots 1-3). Each of these four names carries the word "ครบชุด" (Decision 4).
   - Before the page opens, `BMC2` is moved alone to the second room through the route (P4-R1, `page.request`).
   - On the page, `BMC1` is ticked with its computer, and `BMC3` follows.
   - So the review reads "ส่วนควบย้ายตาม 1 ชิ้น", and the answer is `componentSync.updated === 1`.
   - The computer's row reads "+3 ส่วนควบย้ายตาม" (P4-R2: N counts every component that travels).
   - The holder makes "ผู้ถือครองและแผนกคงเดิม" checkable: the read-back shows `custodianId` equal to `receiver1`, and `departmentId` and `branchId` unchanged (spec §6; Z22).
4. **The two filters:**
   - Filter 1 is three words in another order than the name's, `"<code> จอภาพย้ายที่ตั้ง <runId>"` (spec §11 AND across words), which gives the three batch assets.
   - Filter 2 is `"<runId> <code> ครบชุด"` (Z9). Without a room it lists 4 rows; with the run's first room picked in "ที่ตั้งตอนนี้" it lists 3, because BMC2 sits in the second room (an exact room, P4-R21).
     - The word is never "ส่วนควบ": RCP "โน้ตบุ๊กคืนส่วนควบ" (`return-components.spec.ts:53`) and TR4 "คอมพิวเตอร์โอนย้ายพร้อมส่วนควบ" (`transfer.spec.ts:313`) carry it with the same run id and code, so the count would hang on the spec order.
     - At `020a8533`, "ครบชุด" appears nowhere in `e2e/`, `tests/`, `src/` or `messages/`: no other transaction spec's asset name, room, holder or department name holds it, and neither the batch's "จอภาพย้ายที่ตั้ง" nor BM2's BMO does. The search matches words with `contains`, so a Thai word inside a longer name counts; the four names below each hold it.
   - After the save the same filters find nothing ("พบ 0 รายการ"), which shows the list refreshed with the current filters.
   - Then "ที่ตั้งตอนนี้" set to the destination room lists the four, and the parent's row still reads "+3 ส่วนควบย้ายตาม": every link stayed `installed`, BMC2's (moved alone) included (P4-R1; Z22).
5. **BM2 drives Review Focus 3 through the page.**
   - Tick a Ready asset `BMO`, hand it over through the API (the "other tab"), and save.
   - The save answers 409, a refusal the test declares with `measure.expectRefusal` (`e2e/support/measure.ts:68`). The review closes, focus lands on the button inside `#bulk-move-selection` (Z20), and the list under the table names it in the row's words.
   - "นำรายการที่ย้ายไม่ได้ออก" unticks it. A fresh visit then shows the row disabled, with its reason and its holder.
   - Two `page.request` posts read the route's exact 409 body and the 400 for 101 ids. These are not page events, so the measure does not count them (plan 3 TR5).
6. **Request noise.**
   - `searchBulkMoveList` and `bulkMoveListAnswer` wait for each list answer before the next step.
   - `saveBulkMove` waits for the save and for the page's fetch after it.
   - So no list request is in flight when a test leaves the page.
7. **Data:**
   - The batch adds 3 assets per project (12 per run, as today).
   - BM1 adds 4 per desktop project, and BM2 adds 1 plus one HO-.
   - That is 22 assets per run (+10).
   - No room, department or employee is made.
8. **Not driven** (unit tests, and Step 8's UAT list):
   - paging with the button-mode `Pagination`, and "เลือกทั้งหมดในหน้านี้" with the cap at 100 (Review Focus 4: the run's rooms do not reliably hold more than 25 rows);
   - the category filter;
   - the cross-branch, "อยู่ที่ตั้งนี้แล้ว" and "ส่วนควบที่เลือกเอง" lines;
   - an inactive room;
   - the 409 `ASSET_CHANGED_DURING_OPERATION` toast;
   - a failed list with ลองอีกครั้ง (Review Focus 5);
   - License, written-off and outstanding rows.
9. **One change file** (Z1): `tx-group/msg/p4-t8-messages.json` = `{ "delete": ["assetOperation.selectedTitle", "assetOperation.chosen", "assetOperation.removeNamed"] }`. Expected output: `messages updated: 0 th, 0 en, 3 deleted`.
   - Their only reader was the picker's `multiple` mode, which Task 7 removed; the old spec read them through `TX_WORDS.chosenList` / `alreadyChosen`.
   - It runs in Step 3, after those two `TX_WORDS` entries are removed, and lands in the same commit: `tests/e2e-transactions.test.ts:475` needs every `TX_WORDS` value to be in th.json.
   - `tests/asset-operation-picker-ui.test.ts`'s words test gains "has no reader and is removed" assertions for the three keys, th and en (Step 1).

**Files:**
- Modify (rewritten, CRLF; keep CRLF): `e2e/transactions/bulk-move.spec.ts` (all 100 lines).
- Modify `e2e/transactions/tx-support.ts` (CRLF):
  - `:5` adds `type Response` to the `@playwright/test` import;
  - `AssetRead` (`:133-143`) gains `branchId: string` (`GET /api/assets/[id]` returns every scalar, `include` only), so BM1 reads the branch back (Z22);
  - the comment at `:236` drops "(or bulk-move's chosen list)";
  - after `returnChecklistBox` (`:292-294`), the bulk-move list helpers;
  - after `saveTransferForm` (`:454-467`), `SavedBulkMove` and `saveBulkMove`;
  - the comment at `:481-486`: three pages read their master lists, and ย้ายที่ตั้งหลายรายการ reads active rooms, categories and its first 25 rows (group 3 plan 4). The constant and the regex at `:487-488` are unchanged.
- Modify `e2e/transactions/tx-words.ts` (CRLF): remove `alreadyChosen` (`:7`) and `chosenList` (`:8`), which Task 7 left for this task (the old spec was their only user), and add the 23 keys of Step 3b.
- Modify `messages/th.json` and `messages/en.json`, only through `node scripts/messages-edit.mjs <scratchpad>/tx-group/msg/p4-t8-messages.json` (three deletions, Decision 9).
- Test (CRLF): `tests/e2e-transactions.test.ts` TX5 (`:382-395`), replaced (Step 1).
- Test (CRLF): `tests/asset-operation-picker-ui.test.ts`, the words test ("the picker's words, Thai and English …"): the no-reader assertions after the `legacyLine` pair (`:167-168` at `020a8533`; Task 7 removed three rows above them, so find them by content).
- Docs, in their own commit (all CRLF):
  - `docs/99_CHANGELOG.md`;
  - `DEVELOPER_HANDOFF.md` (`:1275`, `:1276`, `:1279`, and a new bullet before `## Open Go-Live Decisions` at `:1330`);
  - `docs/04_AUTH_RBAC.md:75`;
  - `docs/05_ASSET_LIFECYCLE.md` (`:125`, and a new bullet after `:124`);
  - `docs/06_WORKFLOWS.md` (`:57`, and a new bullet after `:51`);
  - `docs/07_UAT_CHECKLIST.md` (`:536`, `:540`, `:550`, and a new section before `## Sign-Off` at `:627`);
  - `docs/11_FEATURE_LIST.md` (`:157`, and a line after `:337`);
  - `docs/12_HANDOUT.md` (a line after `:50`).

**Existing pins this task breaks, rewritten in this commit:**
- `tests/e2e-transactions.test.ts:382-395` (TX5) pins the old picker spec:
  - `:386-389`: `bulk-move-assets`, `pickAsset`, `#bulk-move-assets-search` and `TX_WORDS.chosenList`;
  - `:390` forbids `getByRole("checkbox"`, which the ticks now need;
  - `:393` pins `networkidle`, which was there only for the old redirect.
  
  It is replaced by Step 1's test.

**These stay green with no edit. Name any that does not in the report.**
- `tests/e2e-transactions.test.ts`:
  - `:138-146`: `TRANSACTION_PAGE_PATH` still lists bulk-move, so the phone's `visit` waits for the h1 (P4-R19);
  - `:139`: rewritten by Task 2 or Task 6; Step 0 checks it;
  - `:147-155`: bulk-move.spec has no arrival check of its own, since `visit` waits;
  - `:438-440`: no new spec file;
  - `:458-466`: the bulk-move tuple was dropped by Task 6, and the spec never calls `pickSearchable(page, "bulk-move-assets"`;
  - `:475`: every `TX_WORDS` value is a th.json value.
- `tests/e2e-cross-cutting.test.ts:140`: Task 2 added the list path. `tests/e2e-review.test.ts:89-104`: no DELETE, no settings, no LDAP, no import, no Production name.
- `tests/e2e-docs.test.ts:34`, `shell-docs.test.ts:36`, `phase2d-docs.test.ts:100`, `dark-mode-docs.test.ts:128` and `v-track-docs.test.ts:28` reject template markers. `tests/asset-detail-outstanding-ui.test.ts:76` reads `docs/06`, and `tests/audit-round-cancellation.test.ts:144-157` reads the docs list.

**Interfaces:**
- Consumes (Step 0 checks each in the code):
  - **T1-T3:**
    - `bulkMoveListPath` = `/api/asset-operations/bulk-move-list`, with the params `q`, `locationId`, `categoryId` and `page`, omitted when empty;
    - the 200 answer `{ updated, unchanged, componentSync: { updated, skipped, movements } }`;
    - the 409 `{ code, error: code, blocked: [{ assetId, assetTag, code }] }`;
    - the 400 for 101 ids, `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { assetIds: "outOfRange" } }` (task-3 test at its `:219`).
  - **T6 (the hooks this spec reads; a missing one is a T6 fix, not a spec workaround):**
    - the h1 "ย้ายที่ตั้งหลายรายการ" at every width;
    - `#bulk-move-search` (SearchField) and `#bulk-move-filter-location` (a SearchableSelect trigger);
    - "พบ {count} รายการ" in `main`;
    - table rows with a native checkbox named "เลือก {tag}", and the header checkbox "เลือกทั้งหมดในหน้านี้" with `aria-checked="mixed"` when some rows are ticked;
    - a refused box that is `disabled`, with an accessible description equal to the reason, and the reason and the holder ("code - fullNameTh") in its row;
    - "+{count} ส่วนควบย้ายตาม" and "ส่วนควบของ {tag}" in the row;
    - "ยังไม่ได้เลือกทรัพย์สิน …" in `main` before the first tick;
    - the bar `[data-slot="desktop-selection-bar"]` (`src/components/ui/desktop-selection-bar.tsx:35`) with "{count} รายการที่เลือก" and the button "ตรวจสอบและย้าย {count} รายการ";
    - the field errors `#bulk-move-to-location-error` and `#bulk-move-reason-error`, with focus on `#bulk-move-to-location`;
    - the dialog "ตรวจสอบก่อนย้ายที่ตั้ง", whose `dt`/`dd` items are ทรัพย์สิน, ย้ายไป and เหตุผล, with `#bulk-move-remark` inside it and the confirm "ยืนยันย้ายที่ตั้ง";
    - the result `Notice` with `role="status"`;
    - **the review closes on a `blocked` 409**, focus lands on the button "นำรายการที่ย้ายไม่ได้ออก" inside `#bulk-move-selection` (Z20), and the list under the table reads "ย้ายไม่ได้ {count} รายการ: {list}" with the row's reason, followed by that button;
    - the result line's room as "code - name" (Z20);
    - the phone `Notice` (title, body, a link to `/th/assets`), with the table and filters `max-md:hidden` and no client fetch below `md`.
  - **Existing helpers:**
    - `createTxAsset` and `CreateAssetOptions` (`e2e/transactions/tx-support.ts:57-88`);
    - `installComponentByApi` (`:126`), `handoverByApi` (`:103`), `readAsset` (`:145`), `ensureSecondLocation` (`:152`), `pickSearchable` (`:203`), `expectFieldError` (`:297`), `record` (`:477`), `visit` and `visitAssetPage` (`:492-499`);
    - `fillTemplate` and `templatePattern` (`e2e/shell/shell-words.ts:24`, `:29`);
    - `valueBeside` (`e2e/repair/repair-data.ts:121`);
    - `runRecords(runId).location` (`e2e/support/run-plan.ts:70`, `:84`);
    - `projectCode` (`e2e/transactions/tx-plan.ts:13`);
    - `measure.timed` (`e2e/support/measure.ts:116`) and `measure.expectRefusal` (`:68`).
- Produces:
  ```ts
  // e2e/transactions/tx-support.ts
  export const BULK_MOVE_LIST_PATH = "/api/asset-operations/bulk-move-list"
  export type BulkMoveListQuery = { q?: string; locationId?: string; categoryId?: string; page?: string }
  export function bulkMoveListAnswer(page: Page, query: BulkMoveListQuery = {}): Promise<Response> // every named param equal ("" when absent)
  export async function searchBulkMoveList(page: Page, text: string): Promise<void> // wait set before the fill; 200
  export function bulkMoveRowBox(page: Page, assetTag: string): Locator // getByRole("checkbox", { name: "เลือก <tag>", exact: true })
  export function bulkMoveRow(page: Page, assetTag: string): Locator // getByRole("row").filter({ has: bulkMoveRowBox(page, assetTag) })
  export type SavedBulkMove = { updated: number; unchanged: number; componentSync: { updated: number; skipped: number; movements: number } }
  export async function saveBulkMove(page: Page, measure: Measure, count: number, atReview?: (review: Locator) => Promise<void>): Promise<SavedBulkMove>
  ```
  `bulkMoveRow` filters by the checkbox, not by the tag's text: a component's "ส่วนควบของ <tag>" may hold the parent's tag in its own element.

- [ ] **Step 0: Read what T1-T7 committed.**
  - `git log --oneline 020a8533..HEAD` should show the T1-T7 commits, and `npm test` should be green before you start.
  - `grep -n 'bulk-move-search\|bulk-move-filter-location\|bulk-move-remark\|bulk-move-selection\|selectRow\|removeBlocked' src/components/asset-operations/*.tsx` must show each T6 hook above.
  - Print the th values the new `TX_WORDS` copy (`node -e "const th=require('./messages/th.json');console.log(JSON.stringify({bulkMove:th.bulkMove,reason:th.asset.transactionReasonOpenCheckoutBulkMove},null,1))"`; `bulkFound` copies `bulkMove.foundCount`, Z8). Each must equal the value in Step 3b, which is P4-R20 verbatim. If T6 committed other placeholder names, use T6's names in the `fillTemplate` calls.
  - `grep -rn "chosenList\|alreadyChosen" e2e tests` must show only `tx-words.ts`, `bulk-move.spec.ts` and the TX5 pin.
  - `grep -n 'selectedTitle\|t("chosen")\|removeNamed' src/components/ui/asset-operation-picker.tsx` must print nothing: Task 7 removed the last reader of the three `assetOperation` keys (Decision 9). (`selectedTitle` elsewhere in `src` is the label batch tool's own prop, not this key.)

- [ ] **Step 1: Write the failing pin.** Replace TX5 (`tests/e2e-transactions.test.ts:382-395`) with:
```ts
test("ย้ายที่ตั้งหลายรายการ: the batch form's three assets and a held computer with its components gathered from two filters into one move, the bar's errors, the review's lines, the page stays with the result line; a stale tick named under the table and taken out, the refused row disabled with its reason, the route's named 409 and its cap; the phone's notice only (group 3 spec §10, §11, §17; P4-R1, P4-R3, P4-R4, P4-R8, P4-R10, P4-R18, P4-R19, P4-R22)", () => {
  const spec = readTxSpec("e2e/transactions/bulk-move.spec.ts")
  assert.match(spec, /getByRole\("button", \{ name: "เพิ่มเป็นชุด" \}\)/)
  assert.match(spec, /expect\(batch\.created\)\.toBe\(3\)/)
  assert.equal(spec.split('test.skip(e2eDevice === "phone", DESKTOP_ONLY)').length - 1, 2, "BM1 and BM2 on the desktop")
  assert.equal(spec.split('test.skip(e2eDevice !== "phone", PHONE_ONLY)').length - 1, 1, "the notice on the phone")
  const bm1 = [
    "await searchBulkMoveList(page, `${code} จอภาพย้ายที่ตั้ง ${runId}`)",
    'await expect(pageBox).toHaveAttribute("aria-checked", "mixed")',
    "const words = `${runId} ${code} ครบชุด`",
    "await searchBulkMoveList(page, words)",
    'await pickSearchable(page, "bulk-move-filter-location", runRoom.code, `${runRoom.code} - ${runRoom.name}`)',
    "await expect(bulkMoveRow(page, c2.assetTag)).toHaveCount(0)",
    "fillTemplate(TX_WORDS.bulkSelectedCount, { count: 4 })",
    'await expectFieldError(page, "bulk-move-to-location", "กรุณาระบุข้อมูลนี้")',
    'await expect(page.locator("#bulk-move-to-location")).toBeFocused()',
    'await pickSearchable(page, "bulk-move-to-location", room.code, `${room.code} - ${room.name}`)',
    "await expect(review).toContainText(fillTemplate(TX_WORDS.bulkComponentsMoved, { count: 1 }))",
    "await expect(review).toContainText(TX_WORDS.transferKeptBoth)",
    "expect(saved).toMatchObject({ updated: 4, unchanged: 0, componentSync: { updated: 1, skipped: 0 } })",
    "await expect(page).toHaveURL(/\\/th\\/asset-management\\/bulk-move(?:[?#]|$)/)",
    "await expect(result).toContainText(`${room.code} - ${room.name}`)",
    "fillTemplate(TX_WORDS.bulkFound, { count: 0 })",
    "await expect(bulkMoveRow(page, parent.assetTag)).toContainText(fillTemplate(TX_WORDS.bulkComponentsFollow, { count: 3 }))",
    "expect(after.departmentId, asset.assetTag).toBe(data.departmentId)",
    "expect(after.branchId, asset.assetTag).toBe(data.branchId)",
    'expect((await readAsset(page, parent.id)).custodianId, "the holder stays (spec §6, §10.2)").toBe(receiver.id)',
  ]
  let from = 0
  for (const step of bm1) {
    const index = spec.indexOf(step, from)
    assert.ok(index >= 0, `BM1 in order: ${step}`)
    from = index + step.length
  }
  for (const part of [
    'measure.expectRefusal({ method: "POST", url: /\\/api\\/assets\\/bulk-move$/, status: 409,',
    'await expect(page.locator("#bulk-move-selection").getByRole("button", { name: TX_WORDS.bulkRemoveBlocked, exact: true })).toBeFocused()',
    "await page.getByRole(\"button\", { name: TX_WORDS.bulkRemoveBlocked, exact: true }).click()",
    "await expect(box).toHaveAccessibleDescription(TX_WORDS.bulkReasonOpenCheckout)",
    'code: "ASSET_ACTIVE_CHECKOUT_EXISTS", error: "ASSET_ACTIVE_CHECKOUT_EXISTS", blocked: [{ assetId: asset.id, assetTag: asset.assetTag, code: "ASSET_ACTIVE_CHECKOUT_EXISTS" }]',
    'fieldErrors: { assetIds: "outOfRange" }',
    'await expect(page.getByRole("link", { name: TX_WORDS.bulkBackToRegister, exact: true })).toHaveAttribute("href", "/th/assets")',
    'expect(asked, "nothing is fetched below md (P4-R19)").toEqual([])',
  ]) assert.ok(spec.includes(part), part)
  // "ส่วนควบ" is no filter word: RCP and TR4 carry it with the same run id and code (Z9).
  for (const old of ["bulk-move-assets", "pickAsset(", "chosenList", "alreadyChosen", "networkidle", 'waitForURL("**/th/assets")', "${code} ส่วนควบ`"]) assert.ok(!spec.includes(old), old)
  for (const banned of ["request.delete", "/api/admin/settings", "/api/departments", "/api/locations", "ldap", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
  const support = read("e2e/transactions/tx-support.ts")
  for (const signature of [
    'export const BULK_MOVE_LIST_PATH = "/api/asset-operations/bulk-move-list"',
    "export function bulkMoveListAnswer(page: Page, query: BulkMoveListQuery = {}): Promise<Response>",
    "export async function searchBulkMoveList(page: Page, text: string): Promise<void>",
    "export function bulkMoveRowBox(page: Page, assetTag: string): Locator",
    "export async function saveBulkMove(page: Page, measure: Measure, count: number, atReview?: (review: Locator) => Promise<void>): Promise<SavedBulkMove>",
  ]) assert.ok(support.includes(signature), signature)
  const start = support.indexOf("export async function saveBulkMove(")
  const save = support.slice(start, support.indexOf("\nexport ", start + 1))
  const confirm = save.indexOf("TX_WORDS.bulkReviewConfirm")
  assert.ok(save.indexOf("page.waitForResponse(") < confirm && save.indexOf("bulkMoveListAnswer(page)") < confirm, "the save and the page's fetch after it are waited for from before the click")
  assert.deepEqual(expectedFailures(spec), [])
})
```
  - In `tests/asset-operation-picker-ui.test.ts`'s words test, right after `assert.equal(en.assetOperation?.legacyLine, undefined)`, add (Z1; P4-R24):
```ts
  // Group 3 plan 4 P4-R24: the picker's multiple mode was the only reader of these three (Task 7 removed it).
  for (const key of ["selectedTitle", "chosen", "removeNamed"]) {
    for (const [locale, messages] of [["th", th], ["en", en]] as const) {
      assert.equal(messages.assetOperation?.[key], undefined, `${locale}.assetOperation.${key} has no reader and is removed`)
    }
  }
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/e2e-transactions.test.ts tests/asset-operation-picker-ui.test.ts`. Expected, and only these:
  - TX5 fails at the `DESKTOP_ONLY` count (0 ≠ 2);
  - the picker's words test fails at `th.assetOperation.selectedTitle has no reader and is removed` (the key is still there).

- [ ] **Step 3: The helpers and the words.**
  - **3a. `tx-support.ts`**, the Produces block:
    - `bulkMoveListAnswer` is `page.waitForResponse` on `url.pathname === BULK_MOVE_LIST_PATH` with `Object.entries(query).every(([key, value]) => (url.searchParams.get(key) ?? "") === value)`.
    - `searchBulkMoveList` sets `bulkMoveListAnswer(page, { q: text })` before `page.locator("#bulk-move-search").fill(text)` and expects 200 (P4-R12: one fill, one fetch after 300 ms).
    - `saveBulkMove` does the following, in order:
      1. clicks "ตรวจสอบและย้าย {count} รายการ" (exact);
      2. waits for the dialog `TX_WORDS.bulkReviewTitle` and runs `atReview`;
      3. sets the `POST /api/assets/bulk-move` wait and `bulkMoveListAnswer(page)`;
      4. inside `measure.timed("bulk move save", …)`, clicks `TX_WORDS.bulkReviewConfirm` and awaits the save;
      5. expects 200 (with the body's first 300 characters in the message), then 200 for the fetch after it, then the dialog count 0;
      6. returns the JSON.
      
      The timing is P4-R16's first measure.
  - **3b. `tx-words.ts`:** remove `alreadyChosen` and `chosenList`. Then a comment line "ย้ายที่ตั้งหลายรายการ (group 3 plan 4, bulkMove.* and P4-R20; bulkFound is bulkMove.foundCount)", then the 23 keys below (Z8: `bulkFound` copies `bulkMove.foundCount`, not `common.searchSelectResultCount`). "ผู้ถือครองและแผนกคงเดิม" reuses `transferKeptBoth`. `bulkComponentsMoved` serves the review and the result, and `bulkAlreadyThere` also matches the review's longer line.

    | key | value | key | value |
    |---|---|---|---|
    | `bulkTitle` | ย้ายที่ตั้งหลายรายการ | `bulkReviewAssets` | {count} รายการ: {tags} |
    | `bulkFound` | พบ {count} รายการ | `bulkComponentsMoved` | ส่วนควบย้ายตาม {count} ชิ้น |
    | `bulkSelectPage` | เลือกทั้งหมดในหน้านี้ | `bulkAlreadyThere` | อยู่ที่ตั้งนี้แล้ว {count} รายการ |
    | `bulkSelectRow` | เลือก {tag} | `bulkOtherBranch` | ย้ายไปสาขาอื่น {count} รายการ รหัสยังเป็นของสาขาเดิม |
    | `bulkComponentsFollow` | +{count} ส่วนควบย้ายตาม | `bulkComponentsAlone` | ส่วนควบที่เลือกเอง {count} รายการ ย้ายแยกจากเครื่องหลัก |
    | `bulkComponentOf` | ส่วนควบของ {tag} | `bulkResultMoved` | ย้ายแล้ว {count} รายการไป {room} |
    | `bulkNothingSelected` | ยังไม่ได้เลือกทรัพย์สิน เลือกรายการในตารางเพื่อย้าย | `bulkReasonOpenCheckout` | มีการส่งมอบค้างอยู่ รับคืนก่อนจึงย้ายได้ |
    | `bulkSelectedCount` | {count} รายการที่เลือก | `bulkBlocked` | ย้ายไม่ได้ {count} รายการ: {list} |
    | `bulkReviewAndMove` | ตรวจสอบและย้าย {count} รายการ | `bulkRemoveBlocked` | นำรายการที่ย้ายไม่ได้ออก |
    | `bulkReviewTitle` | ตรวจสอบก่อนย้ายที่ตั้ง | `bulkDesktopOnlyTitle` | หน้านี้ใช้บนคอมพิวเตอร์ |
    | `bulkReviewConfirm` | ยืนยันย้ายที่ตั้ง | `bulkDesktopOnlyBody` | ย้ายที่ตั้งหลายรายการต้องเลือกจากตาราง เปิดหน้านี้บนคอมพิวเตอร์ |
    |  |  | `bulkBackToRegister` | ไปที่ทะเบียนทรัพย์สิน |

  - **3c. The three picker keys** (Decision 9, Z1), after 3b has removed `alreadyChosen` and `chosenList`. Save `<scratchpad>/tx-group/msg/p4-t8-messages.json`:
    ```json
    { "delete": ["assetOperation.selectedTitle", "assetOperation.chosen", "assetOperation.removeNamed"] }
    ```
    Run `node scripts/messages-edit.mjs <that file>`. Expected output: `messages updated: 0 th, 0 en, 3 deleted`. Then `node --test tests/asset-operation-picker-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts` passes. The deletion and the `TX_WORDS` removal go into the Step 6 commit together (`tests/e2e-transactions.test.ts:475`).

- [ ] **Step 4: Rewrite the spec** (CRLF). The header comment says what the four tests cover, with Decision 8's list. Then:
  - the imports;
  - `asUser("itStaff")`;
  - `const PAGE = "/th/asset-management/bulk-move"`, `DESKTOP_ONLY = "ย้ายที่ตั้งหลายรายการ works from the table on the desktop (group 3 spec §10.4)"`, `PHONE_ONLY = "the phone shows only the notice (group 3 spec §10.4, §17)"`, `BAR = '[data-slot="desktop-selection-bar"]'`;
  - `const batches = new Map<string, { id: string; assetTag: string }[]>()`.
  - **Describe 1 "the batch form, then one bulk move"** (serial):
    - **The batch test:** today's `:23-60` as they stand, plus `batches.set(testInfo.project.name, batch.assets)`.
    - **BM1** (`test.skip(e2eDevice === "phone", DESKTOP_ONLY)` first). The core, in this order:
```ts
const [bm1, bm2, bm3] = batches.get(testInfo.project.name) ?? []
expect(bm3, "the batch test made this project's three assets").toBeDefined()
// "ครบชุด" in all four names, and in no other spec's asset: filter 2's own word (Z9)
const parent = await createTxAsset(page, masters, testInfo.project.name, "BMP", "โน้ตบุ๊กครบชุดพร้อมส่วนควบ", { custodianId: receiver.id })
// c1 ticked with its computer, c2 already in the room, c3 follows (Review Focus 1; P4-R3)
// c1..c3: createTxAsset(…, "BMC1".."BMC3", "เมาส์ส่วนควบครบชุดเลือกเอง" / "อะแดปเตอร์ส่วนควบครบชุดอยู่ห้องปลายทาง" / "คีย์บอร์ดส่วนควบครบชุดย้ายตาม", { ownershipType: "component" }), installComponentByApi(page, parent.id, cN.id, <role>, "N")
const alone = await page.request.post("/api/assets/bulk-move", { data: { assetIds: [c2.id], toLocationId: room.id, reason: `${runId} ส่วนควบย้ายเดี่ยว`, remark: "" } })
expect(alone.status()).toBe(200)
expect(await alone.json(), "an installed ส่วนควบ moves alone (P4-R1)").toMatchObject({ updated: 1, unchanged: 0, componentSync: { updated: 0 } })
await visit(measure, PAGE, "bulk move, the first page", testInfo)
await expect(page.getByRole("main")).toContainText(TX_WORDS.bulkNothingSelected)
await expect(page.getByText(TX_WORDS.bulkDesktopOnlyTitle, { exact: true })).toBeHidden()
const code = projectCode(testInfo.project.name)
await searchBulkMoveList(page, `${code} จอภาพย้ายที่ตั้ง ${runId}`)
await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 3 }))
for (const asset of [bm1, bm2]) await bulkMoveRowBox(page, asset.assetTag).check()
const pageBox = page.getByRole("checkbox", { name: TX_WORDS.bulkSelectPage, exact: true })
await expect(pageBox).toHaveAttribute("aria-checked", "mixed")
await expect(page.locator(BAR)).toContainText(fillTemplate(TX_WORDS.bulkSelectedCount, { count: 2 }))
const words = `${runId} ${code} ครบชุด`
await searchBulkMoveList(page, words)
await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 4 }))
const inRoom = bulkMoveListAnswer(page, { q: words, locationId: data.locationId })
await pickSearchable(page, "bulk-move-filter-location", runRoom.code, `${runRoom.code} - ${runRoom.name}`)
expect((await inRoom).status()).toBe(200)
await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 3 }))
await expect(bulkMoveRow(page, c2.assetTag)).toHaveCount(0)
await expect(pageBox).not.toHaveAttribute("aria-checked", "mixed")
await expect(pageBox).not.toBeChecked()
// the parent row: "+3", its holder "code - fullNameTh"; c1's row: fillTemplate(TX_WORDS.bulkComponentOf, { tag: parent.assetTag })
for (const asset of [parent, c1]) await bulkMoveRowBox(page, asset.assetTag).check()
await expect(page.locator(BAR)).toContainText(fillTemplate(TX_WORDS.bulkSelectedCount, { count: 4 }))
await record(measure, "bulk move, four ticked across two filters", testInfo)
await page.getByRole("button", { name: fillTemplate(TX_WORDS.bulkReviewAndMove, { count: 4 }), exact: true }).click()
await expectFieldError(page, "bulk-move-to-location", "กรุณาระบุข้อมูลนี้")
await expectFieldError(page, "bulk-move-reason", "กรุณาระบุข้อมูลนี้")
await expect(page.locator("#bulk-move-to-location")).toBeFocused()
await expect(page.getByRole("dialog")).toHaveCount(0)
await record(measure, "bulk move, the bar's errors", testInfo)
await pickSearchable(page, "bulk-move-to-location", room.code, `${room.code} - ${room.name}`)
const reason = `${runId} ย้ายรวมไปห้องปลายทาง`
await page.locator("#bulk-move-reason").fill(reason)
const saved = await saveBulkMove(page, measure, 4, async (review) => {
  await expect(valueBeside(review, "ทรัพย์สิน")).toHaveText(fillTemplate(TX_WORDS.bulkReviewAssets, { count: 4, tags: [bm1, bm2, parent, c1].map((asset) => asset.assetTag).join(", ") }))
  await expect(valueBeside(review, "ย้ายไป")).toHaveText(`${room.code} - ${room.name}`)
  await expect(valueBeside(review, "เหตุผล")).toHaveText(reason)
  await expect(review).toContainText(fillTemplate(TX_WORDS.bulkComponentsMoved, { count: 1 }))
  await expect(review).toContainText(TX_WORDS.transferKeptBoth)
  for (const absent of [TX_WORDS.bulkAlreadyThere, TX_WORDS.bulkOtherBranch, TX_WORDS.bulkComponentsAlone]) await expect(review).not.toContainText(templatePattern(absent, {}))
  await review.locator("#bulk-move-remark").fill(`${runId} หมายเหตุย้ายรวม`)
  await record(measure, "bulk move review", testInfo)
})
expect(saved).toMatchObject({ updated: 4, unchanged: 0, componentSync: { updated: 1, skipped: 0 } })
await expect(page).toHaveURL(/\/th\/asset-management\/bulk-move(?:[?#]|$)/)
const result = page.getByRole("status").filter({ hasText: templatePattern(TX_WORDS.bulkResultMoved, { count: "4" }) })
// the result's {room} is the room's "code - name" (P4-R18; Z20)
await expect(result).toContainText(`${room.code} - ${room.name}`)
// result: contains fillTemplate(TX_WORDS.bulkComponentsMoved, { count: 1 }), not templatePattern(TX_WORDS.bulkAlreadyThere, {})
// the bar no longer shows a count: expect(page.locator(BAR)).not.toContainText(templatePattern(TX_WORDS.bulkSelectedCount, {}))
await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 0 }))
await record(measure, "bulk move result line", testInfo)
// The four now sit in the destination; every link stayed installed, c2's (moved alone) included (P4-R1; Z22)
const inDestination = bulkMoveListAnswer(page, { q: words, locationId: room.id })
await pickSearchable(page, "bulk-move-filter-location", room.code, `${room.code} - ${room.name}`)
expect((await inDestination).status()).toBe(200)
await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.bulkFound, { count: 4 }))
await expect(bulkMoveRow(page, parent.assetTag)).toContainText(fillTemplate(TX_WORDS.bulkComponentsFollow, { count: 3 }))
for (const asset of [bm1, bm2, parent, c1, c3]) {
  const after = await readAsset(page, asset.id)
  expect(after.currentLocationId, asset.assetTag).toBe(room.id)
  expect(after.departmentId, asset.assetTag).toBe(data.departmentId)
  expect(after.branchId, asset.assetTag).toBe(data.branchId)
  expect(after.status.name, asset.assetTag).toBe("Ready")
}
expect((await readAsset(page, parent.id)).custodianId, "the holder stays (spec §6, §10.2)").toBe(receiver.id)
// bm1's custodianId stays null; bm3 (not ticked) stays in data.locationId
await visitAssetPage(measure, parent.id, "a bulk-moved computer's history", testInfo, "history")
// main contains TX_WORDS.bulkTitle (asset.movementTypes.bulk_location_move has the same words) and room.name
```
  - **Describe 2 "refusals and the phone"** (not serial):
    - **BM2** (`test.skip(e2eDevice === "phone", DESKTOP_ONLY)` first). `asset = createTxAsset(…, "BMO", "โน้ตบุ๊กส่งมอบระหว่างเลือก")`. Then:
      1. `visit` the page, `searchBulkMoveList(page, asset.assetTag)`, and check its box;
      2. `handoverByApi(page, asset.id, receiver2.id, masters.goodConditionId)`, the other tab;
      3. pick the room, fill the reason, and click "ตรวจสอบและย้าย 1 รายการ";
      4. `measure.expectRefusal({ method: "POST", url: /\/api\/assets\/bulk-move$/, status: 409, reason: "handed over in another tab after the tick (group 3 plan 4 Review Focus 3)" })`;
      5. set the POST wait, click `bulkReviewConfirm`, and expect 409;
      6. expect the review count 0, focus on the remove button inside `#bulk-move-selection` (the Step 1 line; Z20), and `main` to contain `templatePattern(TX_WORDS.bulkBlocked, { count: "1" })`, `asset.assetTag` and `TX_WORDS.bulkReasonOpenCheckout`;
      7. `record` "bulk move, a refused asset named under the table";
      8. click `bulkRemoveBlocked`: the box is not checked, and `main` no longer contains `templatePattern(TX_WORDS.bulkBlocked, {})`;
      9. `visit` the page again and search the tag: `const box = bulkMoveRowBox(…)` is disabled, `toHaveAccessibleDescription(TX_WORDS.bulkReasonOpenCheckout)`, and the row contains the reason and `${receiver2.code} - ${receiver2.fullNameTh}`;
      10. `record` "bulk move, a row with an open handover";
      11. `page.request.post` the move again: 409 `toEqual({ code: "ASSET_ACTIVE_CHECKOUT_EXISTS", error: "ASSET_ACTIVE_CHECKOUT_EXISTS", blocked: [{ assetId: asset.id, assetTag: asset.assetTag, code: "ASSET_ACTIVE_CHECKOUT_EXISTS" }] })`;
      12. post 101 ids `` `${runId}-cap-${index}` ``: 400 `toEqual({ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { assetIds: "outOfRange" } })`;
      13. `readAsset`: still `data.locationId`.
    - **The phone notice** (`test.skip(e2eDevice !== "phone", PHONE_ONLY)` first):
      1. `const asked: string[] = []` and `page.on("request", …)`, which pushes every URL whose pathname is `BULK_MOVE_LIST_PATH`;
      2. `visit` "bulk move on the phone, the notice";
      3. the h1 `TX_WORDS.bulkTitle`, `bulkDesktopOnlyTitle` and `bulkDesktopOnlyBody` (exact) are visible;
      4. the link line from Step 1;
      5. `page.getByRole("table")` count 0, and `#bulk-move-search` hidden;
      6. `expect(asked, "nothing is fetched below md (P4-R19)").toEqual([])`.

- [ ] **Step 5: Run the pins, the checks and the list.**
  - `node --test tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-review.test.ts tests/e2e-suite.test.ts tests/asset-operation-picker-ui.test.ts tests/messages-parity.test.ts`: PASS.
  - `npm test && npx tsc --noEmit && npm run lint`: PASS with 0 lint errors. `tsc` covers `e2e/`.
  - `npx playwright test e2e/transactions/bulk-move.spec.ts --list`: no error, and 4 tests in each of the four projects (16). If `--list` also prints the `setup` project's tests (`playwright.config.ts:56-65`, `e2e/setup/run-data.setup.ts`, the four projects' dependency), the total is 16 plus those. Report the number it printed and what it counts (Z10). It lists only; never print the env files.
  - `file e2e/transactions/bulk-move.spec.ts e2e/transactions/tx-support.ts e2e/transactions/tx-words.ts tests/e2e-transactions.test.ts tests/asset-operation-picker-ui.test.ts`: each "with CRLF line terminators".
  - Run no test run and no build. Your report names what you could not check without a run.

- [ ] **Step 6: Commit the E2E.**
```bash
git add e2e/transactions/bulk-move.spec.ts e2e/transactions/tx-support.ts e2e/transactions/tx-words.ts tests/e2e-transactions.test.ts messages/th.json messages/en.json tests/asset-operation-picker-ui.test.ts
git commit -m "test(e2e): ย้ายที่ตั้งหลายรายการ from the table: ticks gathered across two filters with the bar's count, the bar's errors, a review that counts only the component that follows and keeps holder and department, the page stays with the result line and the refreshed list, the links still installed and the assets read back with their branch; a stale tick named under the table in the row's words and taken out, the refused row disabled with its reason, the route's named 409 and its cap of 100; the phone's notice only; the picker's three multiple-mode keys deleted with their no-reader pins (group 3 spec §10, §11, §17; plan 4 P4-R1, P4-R3, P4-R4, P4-R8, P4-R10, P4-R18, P4-R19, P4-R22, P4-R24)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: The docs.**
  - Name every file, function, code, key and word as T1-T7 committed them (`git log --stat 020a8533..HEAD`).
  - Leave no template marker, and write the date in.
  - Keep CRLF.
  - Cite rulings as "group 3 plan 4 P4-R…" (page group 2 also had a plan 4).
  - **`docs/99_CHANGELOG.md`:** add `### กลุ่มหน้า 3 แผน 4: หน้าย้ายที่ตั้งหลายรายการ` right under `## 2026-11-01` (`:7`), above the late-return `###` (`:9`). If the commit date is later, it goes under a new `## YYYY-MM-DD` above `:7`. In Thai, in plan 3's shape (`:21-74`):
    - the branch `feat/group3-tx-bulk-move` (จาก `master` `020a8533`), the spec sections, and the plan file with P4-R1 ถึง P4-R25;
    - **กฎ:**
      - `getBulkMoveVerdict`'s new words (P4-R7);
      - `bulkMoveBlockedReasonKey`: one set of words (P4-R6);
    - **รายการฝั่งเซิร์ฟเวอร์:**
      - `GET /api/asset-operations/bulk-move-list`: `asset:edit` before any read, 25 rows, the `q` rule, the clamped page and the order;
      - `readBulkMoveListPage` and `readBulkMovePageOptions`;
      - the refusal lists and the rbac matrix;
    - **route ย้ายที่ตั้ง:**
      - at most 100;
      - the inactive room (409, before and inside);
      - one 409 naming every refused asset in the verdict's order;
      - `unchanged` with nothing written;
      - claims before syncs, and the answer's shape;
      - `{ maxWait: 10_000, timeout: 60_000 }`;
      - still never `custodianId`, `departmentId`, `branchId` or the tag;
    - **ชิ้นส่วนกลาง:**
      - `Pagination`'s button mode;
      - `OperationReviewDialog`'s `children`;
      - DESIGN.md's exception (P4-R23);
      - the picker's `multiple` removed, with its three `assetOperation` keys (P4-R24);
    - **หน้า desktop:**
      - the filters, the columns, the status line, "+N" and "ส่วนควบของ";
      - the refused rows;
      - ticks kept across pages and filters, at most 100;
      - the bar, the review's lines, หมายเหตุ in the review;
      - the page stays, with the result line;
      - the list under the table with นำรายการที่ย้ายไม่ได้ออก;
      - a failed list with ลองอีกครั้ง;
    - **มือถือ:** the notice only, nothing fetched;
    - **เมนู:** `nav.bulkMove`;
    - **E2E:** Decisions 1-8 in short: 4 tests, +22 assets per run, and the "Not driven" list;
    - **เรื่องที่ผู้ใช้ควรตรวจ:**
      - P4-R1 first;
      - P4-R13's range words, versus the spec's "แสดง a–b จาก N";
      - P4-R21: assets in an inactive room cannot be filtered by room;
      - P4-R11: the table highlights no search word (the highlight is the picker's);
      - P4-R15: an asset already in the room writes nothing (no movement, no log), and the result line counts it apart;
      - the review's M is counted from the list, while the result's comes from the save;
      - the cap of 100;
    - **บันทึกไว้:**
      - P4-R16's timeout, unmeasured until this run's "bulk move save" timing;
      - the 2,100-parameter question, unverified and moot under the cap;
      - Z12: the batch test still runs on the phone projects inside bulk-move.spec.ts, a call against §17's "only the notice" (it never opens the bulk-move page there);
      - Z13: bulk-move.spec.ts was rewritten in Task 8, one task after the page, against §17's "same task"; no E2E ran in between;
      - Z21: the search's `bulkMove` mode has no UI caller left, kept for `getBulkMoveVerdict` and its pins, for a later cleanup;
    - "ยังไม่ deploy · ไม่มี migration".
    
    The controller adds "ผล E2E".
  - **`DEVELOPER_HANDOFF.md`:**
    - `:1275`: ย้ายที่ตั้งหลายรายการ now reads `readBulkMovePageOptions` (active rooms and categories), not `getAssetOperationMasterOptions()`.
    - `:1276`: `getBulkMoveVerdict` reads `asset.transactionReasonOpenCheckoutBulkMove`, and bulk-move names every refused asset in `blocked`, not only License.
    - `:1279`: the ย้ายที่ตั้งหลายรายการ sentence (`bulk-move-assets`, `multiple`) becomes "since group 3 plan 4 a server-paged table (below)".
    - A new bullet "Page group 3, plan 4: ย้ายที่ตั้งหลายรายการ." after plan 3's "Calls for the user to check" and before `## Open Go-Live Decisions`. It has the changelog's content in English, with the sub-bullets **Rules**, **List endpoint**, **Bulk-move route**, **Shared parts**, **Page** (desktop, phone), **E2E**, **Recorded** and **Calls for the user to check**. Its first line says it is the last plan of page group 3.
  - **`docs/04_AUTH_RBAC.md:75`:** add the sentence "The ย้ายที่ตั้งหลายรายการ list (`GET /api/asset-operations/bulk-move-list`, group 3 plan 4) needs `asset:edit` too, checked before any read; it answers at most 25 rows and a total, each with the bulk move's verdict, and the viewer is refused it."
  - **`docs/05_ASSET_LIFECYCLE.md`:**
    - `:120` stays (its "the bulk move … refuse the component" is still true).
    - `:125` drops its last-but-one sentence ("Bulk move refuses License assets …").
    - A new bullet after `:124`, "Bulk move (`POST /api/assets/bulk-move`, `asset:edit`, group 3 plan 4)". It covers:
      - 1 to 100 ids;
      - the active room;
      - one 409 with every refused asset and its own code (outstanding, License, open handover, written off), the top-level `code` being the first;
      - the in-transaction outstanding re-read;
      - an asset already in the room counted `unchanged` with nothing written;
      - every claim before the first component sync;
      - `componentSync` in the answer;
      - reference `bulk_move`;
      - the 60 s transaction;
      - never the holder, the department, the branch or the tag;
      - P4-R1's component moved alone, whose link stays installed and which the parent's next move pulls back.
  - **`docs/06_WORKFLOWS.md`:**
    - `:57` "Check-out, Check-in, Transfer and Bulk move pick their assets" becomes "Check-out, Check-in and Transfer pick their assets".
    - A new bullet after `:51`, "The ย้ายที่ตั้งหลายรายการ page (group 3 plan 4)", in the โอนย้าย bullet's shape. It covers:
      - desktop only;
      - the filters and "พบ N รายการ";
      - the columns and the row lines;
      - the refused rows;
      - ticks across pages and filters (at most 100);
      - the bar;
      - the review's lines and หมายเหตุ;
      - the save that stays, with the result line;
      - the refused list with its button;
      - the phone's notice;
      - the list endpoint.
  - **`docs/07_UAT_CHECKLIST.md`:**
    - `:536` drops "and ย้ายที่ตั้งหลายรายการ" from the picker's pages.
    - `:540` becomes "- ย้ายที่ตั้งหลายรายการ: no longer on the picker since group 3 plan 4 (see its own section).".
    - `:550` becomes "- [ ] ย้ายที่ตั้งหลายรายการ: checked in Transactions Group 3 Plan 4 UAT.".
    - A new `## Transactions Group 3 Plan 4 UAT (ย้ายที่ตั้งหลายรายการ, YYYY-MM-DD)` before `## Sign-Off`. It opens with what the four tests cover, then lists these checks:
      - [ ] **For the user to decide first (P4-R1):** a ส่วนควบ ticked alone moves alone, the link stays, and the parent's next move pulls it back.
      - [ ] Desktop 1440, both themes, and 768-1023 with the bar at the bottom: the table, status badges, "+N", "ส่วนควบของ", refused rows, the bar's picker width, and the review.
      - [ ] Paging (Review Focus 2): with ticks on page 1 under one filter and on page 2 under another, ก่อนหน้า/ถัดไป keep the ticks, and each page's header box shows only its own rows.
      - [ ] The cap (Review Focus 4): with 90 ticked, เลือกทั้งหมดในหน้านี้ stops at 100, and the rest of the boxes are disabled with "เลือกได้สูงสุด 100 รายการต่อครั้ง".
      - [ ] หมวดหมู่ filters.
      - [ ] A room in another branch: the review's line appears, and branch and tag are unchanged after the save.
      - [ ] An asset already in the room: the review's line, and "อยู่ที่ตั้งนี้แล้ว" in the result.
      - [ ] A room deactivated in another tab: refused under ย้ายไป.
      - [ ] License, written-off and outstanding rows each show their reason, and one save names all of them.
      - [ ] The VPN dropped while paging (Review Focus 5): the failed notice with ลองอีกครั้ง, and the ticks stay.
      - [ ] 100 assets with components over the VPN save inside the 60 s transaction (P4-R16).
      - [ ] The phone notice and its link on iOS Safari and Android Chrome.
      - [ ] The menu reads "ย้ายที่ตั้งหลายรายการ".
      - [ ] NVDA and VoiceOver: the box names, the reason read as a description, and the mixed header box.
      - [ ] An English pass.
  - **`docs/11_FEATURE_LIST.md`:**
    - `:157` becomes "| Bulk move | Move up to 100 assets to one room from a server-paged table (desktop only): filter by words, current room and category, tick across pages and filters, review what moves with each asset (installed components follow; holder and department stay), and stay on the page with the result; refused assets are named with their reason |".
    - After `:337` add "- `api/asset-operations` for the transaction pages' asset search and the ย้ายที่ตั้งหลายรายการ list (`asset:edit`).".
  - **`docs/12_HANDOUT.md`:** after `:50` add "- ย้ายที่ตั้งหลายรายการบนคอมพิวเตอร์ กรองด้วยคำค้น ที่ตั้งตอนนี้ และหมวดหมู่ เลือกจากตารางข้ามหน้าได้ครั้งละไม่เกิน 100 รายการ ส่วนควบที่ติดตั้งอยู่ย้ายตามเครื่องหลัก ผู้ถือครองและแผนกคงเดิม บันทึกแล้วอยู่หน้าเดิมพร้อมสรุปผล บนมือถือหน้านี้แจ้งให้เปิดบนคอมพิวเตอร์".

- [ ] **Step 8: Run the checks and commit the docs.**
  - `npm test && npx tsc --noEmit && npm run lint`: PASS.
  - Commit:
```bash
git add docs/99_CHANGELOG.md DEVELOPER_HANDOFF.md docs/04_AUTH_RBAC.md docs/05_ASSET_LIFECYCLE.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/12_HANDOUT.md
git commit -m "docs: page group 3 plan 4 (ย้ายที่ตั้งหลายรายการ as a server-paged table, the list endpoint, the bulk move's named refusals, cap and unchanged count, the phone's notice): changelog, handoff, permissions, lifecycle rules, workflows, UAT, feature list, handout (group 3 plan 4 task 8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9 (the controller): the runs and the round notes.**
  - **Before:**
    1. the VPN probe and the DB probe, as in plan 3's Step 10;
    2. `scratchpad/stay-awake.ps1`;
    3. `rm -rf .next && npm run build`, run twice: the first stops on Next's security nudge. Never run the upgrade it suggests.
  - **The targeted run:** `npx playwright test e2e/transactions/bulk-move.spec.ts e2e/cross-cutting`, in four projects.
    - Expected: all pass with axe 0.
    - bulk-move runs 3 tests per desktop project (the batch, BM1 and BM2; the notice is skipped) and 2 per phone project (the batch and the notice; BM1 and BM2 are skipped).
    - The viewer is refused the list (403).
    - A failure here is fixed before the whole suite.
  - **The whole suite**, the last plan of page group 3: `npx playwright test`, in all four projects, from the same build. It takes about an hour, and dev data grows by about 230 assets.
    - Expected: every test passes or is skipped as planned, with axe 0.
    - Compare with `E2E-1028F` (373/0/13): the new tests of plans 1-4 add to it.
  - **Docs, in one commit:**
    - "ผล E2E" goes into the changelog entry: both run ids, passed / failed / skipped per run, and the "bulk move save" timing for P4-R16.
    - The run ids go into the handoff bullet.
  - **Round notes**, not in the repo's code:
    - `AssetSystem/ams-status`: page group 3 complete, not deployed, the next step per the user's order.
    - `ams-open-questions`:
      - P4-R1's drift;
      - P4-R21's inactive-room filter;
      - P4-R13's words;
      - the review's M as an estimate;
      - P4-R16's measured time.
    - `ams-log`.
    - Then `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` (at `D:\Obsidian\Eltross`), and the vault commit `ingest: …`.

---

## Appendix: the controller's rulings on the cross-check of the drafts (Z1-Z24)

Three cross-checks (interfaces, coverage, realism) read the eight drafts against the skeleton, the spec and HEAD `020a8533`. These are the rulings; the tasks carry them.

- **Z1 (the picker's three keys):** Task 8 deletes `assetOperation.selectedTitle`, `assetOperation.chosen` and `assetOperation.removeNamed` through `tx-group/msg/p4-t8-messages.json` (`{ "delete": [...] }`, expected `messages updated: 0 th, 0 en, 3 deleted`), in the same commit that drops `TX_WORDS.chosenList` and `alreadyChosen`, and adds "has no reader and is removed" assertions for the three keys (th and en) to `tests/asset-operation-picker-ui.test.ts`. **Tasks:** T7, T8.
- **Z2 (the header checkbox):** disabled when `disabled || (pageState === "none" && rows.every((row) => getBulkMoveRowLock(selection, row) !== null))`; pinned in Task 6's row test. **Tasks:** T5, T6.
- **Z3 (the cap line):** the bar's status shows `bulkMove.capReached` whenever `selection.size >= bulkMoveMaxAssets` (P4-R10). `BulkMoveTickResult.capped` is informational and has no required reader. **Tasks:** T5, T6.
- **Z4 (one order):** Task 2 imports `bulkMoveListOrderBy` from Task 1 and uses it; no literal order in the reader. **Tasks:** T1, T2.
- **Z5 (catalog lines by content):** Task 3 names the two catalog lines it deletes by content (`"Disposed or retired assets cannot be moved."`, `"Some assets already have active checkouts"`); Task 2 has inserted `"Invalid list"` before them. **Tasks:** T2, T3.
- **Z6 (the review's lines):** the `<ul data-bulk-move-review-lines>` has no border of its own (`grid gap-1.5 text-sm text-foreground`); the ul and the หมายเหตุ field sit in one `grid gap-3` wrapper inside the dialog's `children`. **Tasks:** T4, T6.
- **Z7 (wording):** a component whose parent is inactive reads as a plain row (`componentOf: null`), so Task 5 never counts it under ส่วนควบที่เลือกเอง. **Tasks:** T2.
- **Z8 (the count line, a real bug):** en `common.searchSelectResultCount` is an ICU plural, and a grouped string from `formatCount` reads "NaN results" past 999. A new key `bulkMove.foundCount` (th "พบ {count} รายการ", en "{count} found", no plural) takes `formatCount(total)`. Added to P4-R20; Task 6 writes it, Task 8's `TX_WORDS` uses it. **Tasks:** T6, T8.
- **Z9 (a filter word only this spec's assets carry):** BM1's multi-word filter uses a word that only the BM assets carry, never "ส่วนควบ" (RCP in return-components.spec.ts and TR4 in transfer.spec.ts carry it with the same run id). **Tasks:** T8.
- **Z10 (`--list`):** Task 8's Step 5 says what the count includes (the four projects; the `setup` project's tests if `--list` prints them) and the implementer reports the printed number. **Tasks:** T8.
- **Z11 (the review counts rows that move):** `otherBranch` and `componentsAlone` count only ticked rows not already in the room, because nothing is written for those (P4-R15). P4-R1 and P4-R17 read "ticked rows that move". **Tasks:** T5, T6.
- **Z12 (the batch test on the phone):** the batch-create test stays in all four projects inside bulk-move.spec.ts; it never opens the bulk-move page on the phone. Recorded as a call against §17's "only the notice". **Tasks:** T8.
- **Z13 (E2E one task later):** bulk-move.spec.ts is rewritten in Task 8, not with the page in Task 6 (§17 says the same task). No E2E runs between them. Recorded deviation. **Tasks:** T6, T8.
- **Z14 (a refused row carries nothing):** a refused row's `travellingComponents` is `[]`, because the route refuses it and the sync never runs for it. P4-R2 reads "each eligible row". **Tasks:** T1, T2.
- **Z15 (types):** `bulkMoveListAssetSelect` is declared `satisfies Prisma.AssetSelect` (type-only Prisma import), `BulkMoveListAsset = Prisma.AssetGetPayload<{ select: typeof bulkMoveListAssetSelect }>`, `buildBulkMoveListWhere` returns `Prisma.AssetWhereInput`; Task 1 also exports `bulkMoveListOrderBy` and `BulkMoveListRowFacts`. **Tasks:** T1, T2.
- **Z16 (Task 3's calls, accepted):** a non-throwing `readOutstandingComponentLinks` in `src/lib/asset-operation-claim.ts`, which `assertNoOutstandingComponentLinks` calls (one `findMany` per call, so the test mock's queue holds); the two dead catalog texts and their `apiErrors` keys are deleted (`p4-t3-messages.json`); every asset already in the room → 200 with no transaction; a refused asset already in the room is still named; `blocked` is sorted by `bulkMoveBlockedOrder`, request order within a code, one code per asset. **Tasks:** T3.
- **Z17 (Pagination):** a union type, links or buttons, never both; the button mode takes no `pageSizes` and uses the shared `Button`, `aria-disabled` with no handler at either end; it stays server-safe. DESIGN.md records the change from "a disabled one is a span", and the bulk-move exception covers both the selection rule and page/pageSize in the URL. **Tasks:** T4.
- **Z18 (the selection's field key):** `FIELD_IDS` keys the selection as `assetIds: "bulk-move-selection"`, so the route's `fieldErrors.assetIds` (the 100 cap) lands there. **Tasks:** T6.
- **Z19 (the review's sentences):** P4-R17's lines are not dialog items (items are keyed by label). The items are ทรัพย์สิน, ย้ายไป, เหตุผล; the lines are a `<ul>` in `children` before หมายเหตุ; `description={null}`. **Tasks:** T4, T6.
- **Z20 (after a refusal; the result's room):** a 409 with `blocked` closes the review and focuses `#bulk-move-selection`, which sits in the bar's `children` (focus scrolling clears only the sticky footer, and the bar is always on screen while something is ticked). The result line's `{room}` is "code - name". **Tasks:** T6, T8.
- **Z21 (the search's `bulkMove` mode stays):** it has no UI caller after Task 6, but `getBulkMoveVerdict` and about ten search pins share it. Recorded for a later cleanup. **Tasks:** T7 (note only).
- **Z22 (coverage added):** Task 3 asserts the asset update's data keys are exactly `currentLocationId` and `updatedBy` (no `branchId`, `assetTag`, `custodianId`, `departmentId`). Task 8's BM1 reads the parent row's "+N ส่วนควบย้ายตาม" after the save (the link stays installed) and reads back `branchId` unchanged. Task 8's changelog "เรื่องที่ผู้ใช้ควรตรวจ" adds P4-R11 (no highlight in the table) and P4-R15 (an asset already in the room writes nothing). **Tasks:** T3, T8.
- **Z23 (line numbers):** corrected where the realism check found them off (search-rules `_count` :283-288 and select :271-292; asset-movement-labels written types :82; tx-support `returnChecklistBox` :292-294; `SearchableSelect` :31; the reason the e2e-transactions :136 pin holds is that it pins the declaration). **Tasks:** T2, T3, T6, T8.
- **Z24 (Task 7 owns more):** Task 7 also owns `src/lib/asset-operation-picker-rules.ts` (the dead "chosen" row note), `tests/asset-operation-picker-rules.test.ts` and the DESIGN.md picker bullet. **Tasks:** T7.
