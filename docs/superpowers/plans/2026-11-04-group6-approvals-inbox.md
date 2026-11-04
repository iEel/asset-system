# Page group 6, plan 2: the approvals inbox (AP, AP-Phone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/approvals` as layout B (boards AP, AP-Phone):
- a policy line;
- a three-cell strip;
- tabs, search and an overdue toggle;
- a paged queue with ticks;
- a right panel showing the chosen item's photos, details and decision for each of the three kinds;
- bulk approve across pages, up to 200, with a not-opened warning;
- the phone layout.

The disposal queue stops offering bulk approval and links to the inbox instead.

**Architecture:**
- The page is a server component on plan 1's `getApprovalInboxPage`. This plan extends the read model with the filtered ids and the neighbours, and adds three panel loaders.
- Three client islands:
  - the selection provider (sessionStorage, the bar, the confirm, the bulk run);
  - the disposal decision (remark, approve/reject, go to next);
  - a tiny "seen" marker.
- The findings panel is the group-2 `AuditFindingReviewPanel`, fed by a panel-only loader extracted from the findings page's loader. The findings page uses the same loader and keeps working.

**Tech Stack:** Next.js 16 App Router (server components, `searchParams` as a Promise), next-intl, Prisma 7, the shared UI parts, `node --test`, Playwright (four projects).

**Spec:** `docs/superpowers/specs/2026-11-04-page-group-6-disposal-approvals-design.md`. This plan covers §16 row 2:
- §7.1–7.7;
- §10.2, the pending tab's link only;
- §14.1 calls 7, 8, 9, 10, 19;
- Appendix A (the history page, the policy and approver-matrix content, the findings page's own panel).

## Global Constraints

- **Words:**
  - Thai first; words from `docs/19_THAI_GLOSSARY.md`.
  - Messages change only through `node scripts/messages-edit.mjs <change.json>`, Thai and English.
  - The page title is "งานรออนุมัติ".
  - No "Inbox" in Thai text.
- **Disposal status words stay:** รอพิจารณา · อนุมัติแล้ว รอตัดจำหน่าย · ตัดจำหน่ายแล้ว · ไม่อนุมัติ.
- **Shared parts only** (DESIGN.md, spec §5):
  - layout: `PageHeader`, `StatStrip` (`href`, `current`, `attention`, `foot`), `TabNav`, `SearchField`, `FormDisclosure`;
  - lists: `DataTable` + `ClickableTableRow` (`scroll={false}`), `Pagination`, `DesktopSelectionBar`;
  - dialogs: `AccessibleDialog`;
  - badges and notes: `Notice`, `StatusBadge`, `EmptyNote`;
  - details and photos: `KeyValueList`, `AssetPhotoFrame`, `AttachmentPreviewDialog`, `thumbnailUrl()`.
- **Names first:** rows and panels show the asset name first, with the tag and document numbers under it in mono.
- **Layout:** two panes from `xl`, `grid xl:grid-cols-[minmax(0,1fr)_420px]`, as `/audit/findings`. Below `xl`, an open item takes the page, the list is hidden, and a back link "กลับไปงานรออนุมัติ" shows.
- **Paging** is 25/50/100 on desktop and phone *(ruling P2-R1, see below)*.
- **Bulk approve:**
  - Up to 200 items, one kind at a time (disposal or finding); round-close rows are never tickable.
  - The selection survives paging in `sessionStorage`. It resets when the tab, search or overdue filter changes, after a bulk approve, and on "ล้างรายการเลือก".
  - Disposal goes through `POST /api/disposal-requests/bulk-decision` (preview, then commit; `MAX_DISPOSAL_BULK_DECISION_ITEMS = 200`).
  - Findings go through `runAuditFindingBatchReview` (approve only). A 409 or an already-reviewed answer counts as "ต้องตัดสินในแผงด้านขวา".
- **The confirm before a bulk approve** shows "อนุมัติ {n} รายการ" and, when some were not opened in the panel this session, "ยังไม่ได้เปิดดูรูป {m} รายการ". The not-opened items are listed by name and tag in a scrolling list of at most 8 lines, with "และอีก {k} รายการ". It warns; it never blocks.
- **Single decision:**
  - Disposal: `PATCH /api/disposal-requests/[id]` `{ decision, approvalRemark }`, with no `nextStatusId` (plan 1).
  - Findings: the group-2 `AuditFindingDecision`.
  - After a decision the app goes to the next item in the inbox's current order, across pages. A 409 or a stale item shows "รายการนี้ถูกตัดสินแล้วหรือไม่อยู่ในคิว" with a link to the next item.
- **Never on the phone:** ticks and the selection bar.
- **Stable hooks:**
  - Kept: `data-*` on rows (`data-approval-row="<key>:<id>"`), the strip (`data-approval-strip-cell`), tabs (`data-approval-tabs`) and the panel (`data-approval-panel="<key>"`).
  - E2E reads the old StatStrip cell "ทั้งหมด", which becomes "รอทั้งหมด" (`e2e/support/dashboard-words.ts`).
- **E2E** runs only on `asset_management_dev`: run-marked data, no LDAP sync, no settings save, no delete, no master-data change.

## Rulings (made while writing; the controller records them in the ledger)

- **P2-R1:** the phone pages with the same 25/50/100 `Pagination`, not the spec's "แสดงเพิ่มอีก 10 รายการ". The list is server-rendered and a growing list would need a client list or an off-standard page size. *Cost if wrong:* a phone user taps "ถัดไป" instead of "แสดงเพิ่ม"; changing it later is one component.
- **P2-R2:** the disposal queue's bulk-approval provider is removed from `/disposal` and replaced by the pending tab's link (spec §10.2, decision 3). `DisposalBulkApprovalProvider` and its file are deleted if nothing else imports them; their unit tests go with them. *Cost if wrong:* bulk approval lives only in the inbox, which is what the spec decided.
- **P2-R3:** the inbox selection is a new client provider. It calls the existing bulk-decision API but does not reuse `DisposalBulkApprovalProvider`, whose selection is per page and per queue. *Cost if wrong:* a little duplicated dialog wiring.

## Review Focus

1. **Select-all with more than 200 tickable items in the filtered list** picks the first 200 in inbox order and says "เลือกได้สูงสุด 200 รายการต่อครั้ง". *(Task 1 and Task 3 tests.)*
2. **A stored selection that refers to items no longer pending** (decided elsewhere, or now out of the filter) is pruned on load against the current tickable ids. The bar's count never includes them. *(Task 3 test.)*
3. **The last item of the last page is decided.** Next goes to the first remaining item, or to the empty panel "ไม่มีงานรออนุมัติ"; it never goes to a stale `?item=`. *(Task 1 test.)*
4. **`?item=` names an item the viewer may not decide** (their own request) **or not see** (a finding without `audit:approve`). Their own request shows the panel with the separation-of-duties notice and no buttons. A kind they cannot see shows the "ไม่อยู่ในคิว" notice, never a 500 or another user's data. *(Task 2 and Task 4 tests.)*
5. **The phone with `?item=`.** The list is hidden, the panel shows full width with its back link, and the bottom nav stays. *(Task 4 E2E.)*

---

### Task 1: Read model: filtered ids and neighbours; the panel loaders

**Files:**
- Modify: `src/lib/approval-inbox.ts` (pure), `src/lib/approval-inbox-query.ts`
- Create: `src/lib/approval-inbox-panels.ts` (the server loaders)
- Modify: `src/lib/audit-findings-page-data.ts` (extract the panel loader), `src/app/[locale]/(dashboard)/audit/findings/page.tsx` (only where it builds the panel, if the extraction changes a name)
- Test: `tests/approval-inbox-page.test.ts`, new `tests/approval-inbox-panels.test.ts`, the existing findings-page tests (they must still pass)

**Interfaces:**
- Consumes: plan 1's `ApprovalInboxRow`, `buildApprovalInboxPage`, `getApprovalInboxPage`, `approvalInboxItemHref`, `listDisposalPhotos`, `readDisposalSourceLinks`, `getDisposalApprovalBlock`, `getApprovalAgeStatus`.
- Produces:
  - `ApprovalInboxPage` gains three fields:
    - `order: Array<{ key: ApprovalInboxItemKey; id: string }>`: every row of the filtered list in the current tab, in inbox order, all pages;
    - `tickable: { disposal: Array<{ id: string; title: string; codes: string }>; finding: Array<{ id: string; title: string; codes: string }> }`: the tickable rows of the filtered list in the current tab, in inbox order, all pages, **not** capped (select-all caps at 200 on the client);
    - `titles: Record<string, { title: string; codes: string }>` keyed `"<key>:<id>"`, for every row in `order`, for the not-opened list.
  - `approvalInboxNeighbours(order: ApprovalInboxPage["order"], current: { key; id }, skip?: ReadonlySet<string>): { position: number | null; total: number; next: { key; id } | null }` (pure):
    - `position` is the 1-based index of the current item in `order`, or null when it is absent;
    - `next` is the first item after it not in `skip` (the keys `"<key>:<id>"`), else the first item from the start not in `skip` and not the current, else null.
  - `loadDisposalInboxPanel(db, { requestId, locale, viewer: { userId; employeeId }, segregationRequired, slaDays, now }): Promise<DisposalInboxPanel | null>`. It returns null when the request is missing or inactive. `DisposalInboxPanel` holds:
    - `request: { id; disposalNo; disposalType; reason; requestStatus; requestDate; approvalRemark | null }`;
    - `asset: { id; name; assetTag; serialNumber | null; purchasePrice: string | null; purchaseYear: number | null; locationName | null; branchName | null; custodianName | null; conditionName | null }`;
    - `requesterName`;
    - `photos: DisposalPhotoRef[]`;
    - `documents: Array<{ id; originalName; fileType }>` (the request's and its batch's active non-image files);
    - `source: DisposalSourceLink | null`;
    - `previousStatusName: string | null` (Thai `nameTh`, else `name`);
    - `block: DisposalApprovalBlock | null`;
    - `age: ApprovalAgeStatus`;
    - `isPending: boolean`.
  - `loadAuditFindingPanel({ locale, findingId, user, canApprove, now }): Promise<{ panel: AuditFindingsPanelCore; employees: { id: string; label: string }[] } | null>`. It lives in `audit-findings-page-data.ts`; `AuditFindingsPanelCore` = today's `panel` without `queue`. `getAuditFindingsPageData` calls it and adds its own `queue`, so the findings page is unchanged.
  - `loadAuditRoundClosePanel(db, roundId): Promise<{ id; auditNo; name; startDate; endDate | null; createdByName; checklist: AuditRoundCloseChecklist; ready: boolean } | null>`

- [ ] **Step 1: Write the failing tests**
  - `tests/approval-inbox-page.test.ts`, with 30 disposal rows (2 own) and 5 findings:
    - `buildApprovalInboxPage` with `tab: "all"`, `pageSize: 25`, `page: 1` returns `order.length === 35`, `tickable.disposal.length === 28`, `tickable.finding.length === 5`, and `titles["disposal:<id>"]` for a row on page 2;
    - with `tab: "audit"`, `order` holds findings and rounds only;
    - with `search: "nothing"`, `order` and `tickable` are empty.
  - `approvalInboxNeighbours`:
    - for the 3rd of 5 → `position: 3, next: 4th`;
    - the last → `next: 1st`;
    - the only item → `next: null`;
    - an item absent from `order` → `position: null, next: 1st`;
    - with `skip` holding the 4th → `next: 5th`.
  - `tests/approval-inbox-panels.test.ts` (fake db), `loadDisposalInboxPanel`:
    - (a) a pending request with 2 images and a PDF → `photos.length === 2`, `documents.length === 1`, `previousStatusName === "ใช้งานอยู่"`, `block === null`;
    - (b) the viewer's own request → `block.sodReason === "requester"`;
    - (c) a request already approved → `isPending: false`, `block.code === "DISPOSAL_INVALID_STAGE"`;
    - (d) a missing id → null.
  - `loadAuditRoundClosePanel` on a fake round with 0 pending → `ready: true`.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/approval-inbox-page.test.ts tests/approval-inbox-panels.test.ts`
  Expected: FAIL (missing exports).

- [ ] **Step 3: Implement**
  - `order`, `tickable` and `titles` come from the same `inTab` list `buildApprovalInboxPage` already filters.
  - `loadDisposalInboxPanel` reads with `select`, reading `batchId` only when `isDisposalBatchSchemaReady()`, as `getApprovalInboxPage` does. It uses one `attachment.findMany` for documents, and photos from `listDisposalPhotos`.
  - `loadAuditFindingPanel` is the chosen-finding half of `getAuditFindingsPageData`: section A without the list counts, plus the siblings, the labels, the evidence, the users and the employees. Move it; do not copy it. `getAuditFindingsPageData` calls it.
  - `loadAuditRoundClosePanel` uses `getAuditRoundCloseChecklist` (`src/lib/audit-round-close.ts:9`) and resolves `createdBy` to `User.displayName`, falling back to the id.

- [ ] **Step 4: Run the tests**

  Run: the command from Step 2, then `npm test`
  Expected: PASS; 0 failures. The group-2 findings tests pass unchanged.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib tests "src/app/[locale]/(dashboard)/audit/findings/page.tsx"
  git commit -m "feat(approvals): the inbox read model's order, tickable ids and neighbours, and the disposal, finding and round-close panel loaders (group 6 plan 2)"
  ```

### Task 2: The page: header, strip, tabs, filters, queue, paging, phone cards

**Files:**
- Modify (rewrite): `src/app/[locale]/(dashboard)/admin/approvals/page.tsx`
- Create: `src/components/approvals/approval-inbox-policy.tsx` (the header line and disclosure, server)
- Modify: messages via the script; `e2e/support/dashboard-words.ts` (`approvalsTotal: "รอทั้งหมด"`)
- Test: new `tests/approval-inbox-ui.test.ts` (source pins); update `tests/waiting-work-links.test.ts:90-91` for the new cells

**Interfaces:**
- Consumes: Task 1's `getApprovalInboxPage` (with `order`, `tickable`, `titles`) and `parseApprovalInboxItemParam`; plan 1's `parseApprovalInboxQuery`.
- Produces:
  - `buildApprovalInboxHref(locale, query: ApprovalInboxQuery, patch: Partial<ApprovalInboxQuery> & { item?: string | null }): string` (pure, in `approval-inbox.ts`). It keeps `tab`, `search`, `overdue`, `page` and a `pageSize` other than 25, and drops defaults. Task 4 and the panels use it.
  - The page renders a right-hand slot `<section data-approval-panel …>` that Task 4 fills. In this task it holds the empty note.

- [ ] **Step 1: Write the failing tests**
  - `buildApprovalInboxHref`:
    - `("th", default, { tab: "disposal" })` → `/th/admin/approvals?tab=disposal`;
    - with `search: "ThinkPad"`, `overdue: true`, `page: 2`, `item: "disposal:abc"` → `/th/admin/approvals?tab=all&search=ThinkPad&overdue=1&page=2&item=disposal%3Aabc`. The order of keys is the builder's; the test parses the URL rather than comparing strings;
    - `item: null` drops `item`.
  - Source pins in `tests/approval-inbox-ui.test.ts`. The page:
    - uses `getApprovalInboxPage(`;
    - renders `StatStrip` with `data-approval-strip-cell`, `TabNav` with `data-approval-tabs`, rows with `data-approval-row` and `ClickableTableRow`;
    - uses `grid xl:grid-cols-[minmax(0,1fr)_420px]`;
    - has no `take: 50`;
    - does not render the old full "นโยบายที่ใช้กับ" panel outside the disclosure.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/approval-inbox-page.test.ts tests/approval-inbox-ui.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement (spec §7.1–7.3, §7.7)**
  - **Header:**
    - H1 "งานรออนุมัติ".
    - The policy line: "SLA {n} วัน · ผู้อนุมัติขั้นต่ำ {n} คน · บังคับแยกผู้ทำรายการ/ผู้อนุมัติ" (or "ไม่บังคับแยก…") "· ผู้อนุมัติ {พร้อม|ยังไม่พร้อม} ตัดจำหน่าย {n} คน · ตรวจนับ {n} คน". The counts and readiness come from today's approver-matrix data.
    - Buttons: "นโยบายและผู้อนุมัติ ▾" (`FormDisclosure`, closed) holding today's policy panel, approver matrix and the "ตั้งค่านโยบายอนุมัติ" link, unchanged; and "ประวัติการตัดสินใจ" (link).
  - **Strip, three cells** (spec §7.2):
    - เกิน SLA: `attention` when > 0; foot "ตัดจำหน่าย {a} · ตรวจนับ {b}"; links to `?overdue=1`, `current` when on.
    - รอนานสุด: "{n} วัน"; the foot names the item and "ส่งเรื่อง {d MMM yyyy}"; links to that item's `?item=`.
    - รอทั้งหมด: foot "เกิน SLA {x} + ภายใน SLA {y} = {total}".
    - With nothing pending, the strip still shows, with 0s.
  - **Tabs:**
    - ทั้งหมด / ตัดจำหน่าย / ตรวจนับ with counts (`tabs`).
    - Beside them, the note "ตรวจนับ = รายการไม่ตรง {f} · ปิดรอบตรวจนับ {c}".
    - A GET form with `SearchField` "ค้นหาชื่อ รหัส เลขที่คำขอ" keeps the tab and the overdue filter.
    - The pressed toggle link "เกิน SLA เท่านั้น" (`aria-pressed`).
  - **Queue table:**
    - Columns: an empty first column (Task 3 adds the tick) · ประเภท · รายการ · ผู้ทำรายการ · รอ ↓, with the content of spec §7.3.
      - **ประเภท:** a chip "ตัดจำหน่าย" / "ตรวจนับ", and under it "วิธี: {method}", or "ไม่ตรง · {finding word}", or "ปิดรอบตรวจนับ". The method word comes from `disposalPage.types`; the finding word from `auditRound` via `auditFindingTypeShortLabelKeys`.
      - **รายการ:** the title in bold, the codes in mono.
      - **ผู้ทำรายการ:** the name, or "คุณ" with the badge "อนุมัติเองไม่ได้" for the viewer's own; under it "ส่งเรื่อง {d MMM}".
      - **รอ:** a danger badge "เกิน SLA {n} วัน" or a muted "รอ {n} วัน", with "ครบ SLA วันนี้" under it when `isDueToday`.
    - Badges on the title: "ยังไม่มีรูป" (warning) when a disposal row has `photoCount === 0`.
    - **Blocked rows** show their reason line, mapped through one table of message keys:
      - `requester` → "คุณเป็นผู้ขอ";
      - `creator` → "คุณสร้างคำขอนี้";
      - `no_employee` → "บัญชีของคุณยังไม่ผูกกับพนักงาน";
      - other codes → their `disposalPage.errors` text.
    - Rows are `ClickableTableRow` to `buildApprovalInboxHref(…, { item })`, `current` when chosen.
  - **The foot** reads "แสดง {a}–{b} จาก {n} · เรียงเกิน SLA ก่อน แล้วรอนานสุด", with `Pagination` (link mode, 25/50/100).
  - **Empty states:** "ไม่มีงานรออนุมัติ"; and, with filters on, "ไม่พบรายการที่ตรงกับการค้นหา" with a clear link.
  - **Phone:** cards are whole-card links (≥ 44 px), with the content of spec §7.7. With `?item=`, the list column is `hidden xl:block`; the same as the findings page.
  - **Work center:** its approvals rows already link to `?item=` (plan 1). No change.
  - **Messages:** every new string through the script, Thai and English.

- [ ] **Step 4: Run the tests**

  Run: the command from Step 2, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add "src/app/[locale]/(dashboard)/admin/approvals/page.tsx" src/components/approvals src/lib/approval-inbox.ts messages e2e/support/dashboard-words.ts tests
  git commit -m "feat(approvals): the approvals page as board AP: the policy line, the overdue / oldest / total strip, tabs, search, the overdue toggle, the paged queue and phone cards (group 6 plan 2)"
  ```

### Task 3: Ticks, the selection bar and bulk approve; the disposal queue's link

**Files:**
- Create: `src/components/approvals/approval-inbox-selection.tsx` (client), `src/lib/approval-inbox-selection.ts` (pure helpers)
- Modify: the approvals page (the tick column, the provider), `src/app/[locale]/(dashboard)/disposal/page.tsx` (the pending tab), messages
- Delete (if no importer remains): `src/components/disposal/disposal-bulk-approval.tsx` and its source-pin tests
- Test: new `tests/approval-inbox-selection.test.ts`; update `tests/disposal-queue-ux.test.ts`

**Interfaces:**
- Consumes: Task 1's `tickable` and `titles`; Task 2's page and `buildApprovalInboxHref`.
- Produces:
  - `approvalInboxSelectionStorageKey = "approval-inbox-selection"` and `approvalInboxSeenStorageKey = "approval-inbox-seen"`.
  - `type StoredSelection = { kind: "disposal" | "finding"; ids: string[]; scope: string }`, where `scope` = the tab, search and overdue values joined.
  - `restoreSelection(stored: StoredSelection | null, scope: string, tickable: { disposal: string[]; finding: string[] }): StoredSelection | null`. It returns null when the scope differs; otherwise it keeps only ids still tickable for that kind, and returns null if none are left.
  - `toggleSelection(current: StoredSelection | null, kind, id, scope, max = 200): { next: StoredSelection | null; refused: "limit" | null; restarted: boolean }`. Ticking another kind restarts the selection with this id (`restarted: true`); over `max` it is refused.
  - `selectAll(kind, tickableIds: string[], scope, max = 200): { next: StoredSelection; capped: boolean }`.
  - `unopened(ids: string[], seen: ReadonlySet<string>, kind): string[]`, where seen keys are `"<key>:<id>"`.
  - `<ApprovalInboxSelectionProvider scope tickable titles copy>` with `<ApprovalInboxTick kind id label disabled reason?>` and `<ApprovalInboxSelectionBar/>`.

- [ ] **Step 1: Write the failing tests** (`tests/approval-inbox-selection.test.ts`, pure)
  - `restoreSelection`:
    - drops ids that are no longer tickable;
    - returns null when the scope changed;
    - returns null when nothing is left.
  - `toggleSelection`:
    - ticking a finding while disposal ids are held → `restarted: true`, `kind: "finding"`, one id;
    - the 201st tick → `refused: "limit"`;
    - unticking the last id → `next: null`.
  - `selectAll` with 250 ids → 200 ids, the first 200 in order, `capped: true`.
  - `unopened(["a","b","c"], new Set(["disposal:b"]), "disposal")` → `["a","c"]`.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/approval-inbox-selection.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement (spec §7.4)**
  - **Storage:**
    - The provider keeps the selection in `sessionStorage`, wrapped in try/catch (an empty or blocked storage means "no selection").
    - It restores with `restoreSelection` on mount and whenever `scope` or `tickable` changes.
    - It keeps `seen` from `approvalInboxSeenStorageKey` (written by Task 4).
  - **Ticks:** `ApprovalInboxTick` is a checkbox in the first column. It is hidden below `md`, and disabled with the reason as its `title` for blocked rows. Close rows render no tick.
  - **The bar** is a `DesktopSelectionBar`, only from `md`, while something is ticked. It shows:
    - "{n} เลือกแล้ว (จากทุกหน้า) · {kind word}";
    - "ล้างรายการเลือก";
    - the note "อนุมัติแบบกลุ่มทำได้ทีละประเภท · คำขอตัดจำหน่ายปฏิเสธทีละรายการเพราะต้องระบุเหตุผล · เลือกได้สูงสุด 200 รายการต่อครั้ง";
    - a "เลือกทั้งหมดที่อนุมัติได้ ({n})" button, which selects every tickable row of the current tab's kind, or, on the ทั้งหมด tab, the kind already ticked (disposal when nothing is ticked);
    - the primary "ตรวจสอบและอนุมัติ {n} รายการ".
  - **A restarted selection** (another kind ticked) announces "เลือกได้ทีละประเภท · เริ่มเลือกใหม่เป็น{kind}" in a polite live region.
  - **The confirm** is an `AccessibleDialog`. It holds:
    - the title "อนุมัติ {n} รายการ";
    - for disposal, the preview result first (`POST bulk-decision` `{ mode: "preview" }`): eligible and blocked counts, with the blocked items named and their reasons;
    - "ยังไม่ได้เปิดดูรูป {m} รายการ", with up to 8 names ("{title} · {codes}") in a scrolling list and "และอีก {k} รายการ";
    - the optional remark (max 4,000 characters);
    - "ยกเลิก" and the primary "อนุมัติ {eligible} รายการ".
  - **Commit:**
    - Disposal commits with the eligible ids.
    - Findings run `runAuditFindingBatchReview(ids, { action: "approve", reviewRemark }, send)`, with the progress shown in the bar's `status`.
    - Then clear the selection, `router.refresh()`, and show the toast "อนุมัติแล้ว {n} รายการ" (plus "ข้ามไป {m} รายการ" and "ต้องตัดสินในแผงด้านขวา {k} รายการ" when any).
  - **The disposal page:**
    - Remove `DisposalBulkApprovalProvider`, its toolbar, checkboxes and select-page control.
    - In the pending tab, for `disposal:approve`, each row's next-step cell shows the link "พิจารณาในงานรออนุมัติ" to `approvalInboxItemHref(locale, "disposal", id)`. For the viewer's own row it shows "ดู", with "คุณเป็นผู้ขอ พิจารณาเองไม่ได้" under it.
    - A note above the table: "คุณพิจารณาได้ {a} จาก {b} รายการ · อนุมัติหลายรายการได้ที่งานรออนุมัติ", linking to `/{locale}/admin/approvals?tab=disposal`.
    - Bulk execution in the approved tab stays as it is (plan 4 replaces it).
    - Delete `disposal-bulk-approval.tsx` when no file imports it, with the tests that only pin it. Keep `src/lib/disposal-bulk-approval.ts` (the server uses it).

- [ ] **Step 4: Run the tests**

  Run: `node --test tests/approval-inbox-selection.test.ts`, then `npm test`
  Expected: PASS; 0 failures.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components src/lib "src/app/[locale]/(dashboard)" messages tests
  git commit -m "feat(approvals): ticks across pages, approve all approvable up to 200 with the not-opened warning; the disposal queue links to the approvals page (group 6 plan 2)"
  ```

### Task 4: The right panel: disposal, finding and round close; decisions and the next item

**Files:**
- Create: `src/components/approvals/approval-disposal-panel.tsx` (server), `src/components/approvals/approval-disposal-decision.tsx` (client), `src/components/approvals/approval-photo-gallery.tsx` (client), `src/components/approvals/approval-round-close-panel.tsx` (server), `src/components/approvals/approval-inbox-seen.tsx` (client, writes `seen`)
- Modify: the approvals page (the panel slot); `src/components/audit/audit-finding-review-panel.tsx` only if it needs a prop to take an outside `queue`
- Test: new `tests/approval-inbox-panel-ui.test.ts` (pins); `tests/approval-inbox-page.test.ts` for any pure helper added

**Interfaces:**
- Consumes:
  - Task 1's loaders and `approvalInboxNeighbours`;
  - Task 2's `buildApprovalInboxHref`;
  - Task 3's `approvalInboxSeenStorageKey`;
  - plan 1's PATCH decision and `DISPOSAL_CONCURRENT_UPDATE`;
  - group 2's `AuditFindingReviewPanel` and `AuditFindingDecision` (`nextHref`, `nextHrefAfterSiblings`, `position`, `total`, `closeHref`).
- Produces: none for later plans.

- [ ] **Step 1: Write the failing tests** (pins in `tests/approval-inbox-panel-ui.test.ts`)
  - **The disposal panel:**
    - renders `AssetPhotoFrame` and `AttachmentPreviewDialog`;
    - the effect lines use `previousStatusName`;
    - has the remark field `id="approval-disposal-remark"`;
    - has buttons "อนุมัติ" and "ปฏิเสธ";
    - does **not** send `nextStatusId`.
  - **The decision client:**
    - calls `router.replace(nextHref` after success;
    - shows the stale notice on 409 and on `DISPOSAL_INVALID_STAGE`;
    - a reject with an empty remark shows the field error before any request.
  - **The seen writer** adds `"<key>:<id>"` to `approval-inbox-seen` inside try/catch.
  - **The page** passes `nextHref` from `approvalInboxNeighbours`. For a finding, `nextHrefAfterSiblings` skips the sibling ids.

- [ ] **Step 2: Run them to see them fail**

  Run: `node --test tests/approval-inbox-panel-ui.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement (spec §7.5, §7.6)**
  - **Disposal panel:**
    - **Head:** a method chip, the SLA badge and the `DP-…` number; the asset name as `h2`; "{tag} · เปิดคำขอตัดจำหน่าย" (link `/disposal/[id]`).
    - **`ApprovalPhotoGallery`:**
      - the large photo uses `thumbnailUrl(id, "card")` in `AssetPhotoFrame`, with "รูปที่ {i} / {n}";
      - 64 px thumbnail buttons change it;
      - the large photo opens `AttachmentPreviewDialog`;
      - PDFs follow as file chips linking `/api/attachments/{id}?inline=1`;
      - with no photo, a warning `Notice` "คำขอนี้ยังไม่มีรูปทรัพย์สิน", or the muted "ไม่มีรูป · สูญหาย" when the method is `lost`.
    - **`KeyValueList`:**
      - เหตุผล;
      - ผู้ขอ;
      - ที่มา (the source link);
      - Serial;
      - ราคาซื้อ "{price} บาท · ซื้อปี {yyyy}", when the data exists;
      - ที่ตั้ง;
      - ผู้ถือครอง;
      - สภาพ.
      - Empty rows are hidden; labels go on top below `sm`.
    - **The effect table** "ผลของการตัดสินใจ": ถ้าอนุมัติ / ถ้าปฏิเสธ, as spec §7.5, with the real previous status.
    - **The separation-of-duties line:** allowed or blocked, as spec §7.5. When blocked, there is no decision area.
    - **`ApprovalDisposalDecision`:**
      - the remark `Textarea` "หมายเหตุการพิจารณา · ต้องกรอกเมื่อปฏิเสธ";
      - the buttons "อนุมัติ" (success) and "ปฏิเสธ" (danger outline);
      - while sending, the buttons are busy;
      - on success, a toast and `router.replace(nextHref ?? closeHref, { scroll: false })` then `router.refresh()`;
      - on 409 `DISPOSAL_CONCURRENT_UPDATE`, or 400 `DISPOSAL_INVALID_STAGE`, show the stale `Notice` with the link to next.
    - **The foot:** "ตัดสินใจแล้วไปรายการถัดไปอัตโนมัติ · {position} จาก {total}".
  - **Finding panel:**
    - `AuditFindingReviewPanel` with `data` from `loadAuditFindingPanel` plus an inbox `queue`. Its `position` and `total` come from `approvalInboxNeighbours`. Its `nextHref` and `nextHrefAfterSiblings` are `buildApprovalInboxHref(…, { item: "finding:<id>" })`, the latter skipping the sibling ids. `closeHref` is the inbox without `item`.
    - `evidence` is the findings page's evidence list, moved to `src/components/audit/audit-finding-evidence-list.tsx` and imported by both pages.
    - `disposalHref` is built as the findings page builds it.
  - **Round-close panel:** the content of spec §7.5, with one primary link "เปิดรอบตรวจนับเพื่อปิดรอบ" → `/{locale}/audit/rounds/{id}`.
  - **Panel guards:**
    - A loader returns null, or the viewer lacks the kind's permission (disposal: `disposal:approve`; finding and round: `audit:approve`) → the `Notice` "รายการนี้ถูกตัดสินแล้วหรือไม่อยู่ในคิว", with the link to the next item.
    - With no `?item=`, the empty note "เลือกรายการทางซ้ายเพื่อดูรูปและรายละเอียด".
  - **`ApprovalInboxSeen`** is mounted in each panel and records `"<key>:<id>"` once.
  - **Phone:** with `?item=`, the panel is full width under a "กลับไปงานรออนุมัติ" link (`PageBackLink`) to the list without `item`.

- [ ] **Step 4: Run the tests**

  Run: `node --test tests/approval-inbox-panel-ui.test.ts`, then `npm test`
  Expected: PASS; 0 failures, findings-page tests included.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components "src/app/[locale]/(dashboard)" src/lib messages tests
  git commit -m "feat(approvals): the right panel: the disposal photos, details, effect and decision, the group-2 finding panel on the inbox queue, the round-close summary; each decision goes to the next item (group 6 plan 2)"
  ```

### Task 5: E2E

**Files:**
- Create: `e2e/approvals/approvals-inbox.spec.ts`, `e2e/approvals/approvals-support.ts`
- Modify:
  - `e2e/disposal/batch-bulk-approval.spec.ts`: the bulk approval moves to the inbox; the rest of the serial chain (execution) stays;
  - `e2e/disposal/single-request.spec.ts`: the decision through the request page's dialog stays, since plan 3 changes it;
  - `e2e/dashboard/dashboard.spec.ts` (the cell word);
  - `e2e/cross-cutting/support/refusals.ts`, only if a path changed;
  - `tests/e2e-disposal.test.ts` (the source pins of the specs it reads).
- Test: the specs themselves; `npm test` for the pins

**Interfaces:**
- Consumes: the page's hooks (`data-approval-row`, `data-approval-strip-cell`, `data-approval-tabs`, `data-approval-panel`), the tick checkboxes (accessible name "เลือก {title}"), the bar's buttons, the dialog title "อนุมัติ {n} รายการ", and the panel's buttons.

- [ ] **Step 1: Write the specs.** Each one uses run-marked records, created through the API helpers that `e2e/disposal/disposal-support.ts` already has (`createAssets`, the request creation, the attachment upload with a JPG fixture). It runs as the IT head (`asUser("itHead")`), except where noted.
  - **The strip and the tabs:** the run's 3 requests appear under ตัดจำหน่าย. The tab count equals the rows' total. A search for the run prefix leaves only them.
  - **The panel:** clicking a row sets `?item=disposal:<id>`; the panel shows "รูปที่ 1 / 1", the reason and "ถ้าปฏิเสธ".
  - **Rejecting:** with an empty remark it shows the field error; with a remark it goes to the next item, and the first request reads ไม่อนุมัติ on its page.
  - **Bulk approve:**
    - tick 2 rows on page 1;
    - change to `pageSize=25&page=2` when a second page exists, else skip that step, and come back: the bar still says 2;
    - "ตรวจสอบและอนุมัติ 2 รายการ" opens the dialog with "ยังไม่ได้เปิดดูรูป 1 รายการ" (one of the two was opened);
    - confirm: the toast says "อนุมัติแล้ว 2 รายการ"; both requests read อนุมัติแล้ว รอตัดจำหน่าย.
  - **The viewer's own request:** as IT head, their own run request shows "อนุมัติเองไม่ได้" and a disabled tick, and its panel has no buttons.
  - **Phone (the phone projects):** a card opens the item full width with the back link; no ticks are visible.
  - **axe** on the page with the panel open, both themes, as earlier groups do.

- [ ] **Step 2: Run the specs** on a fresh build, four projects.

  Run: `npx playwright test e2e/approvals e2e/disposal e2e/dashboard e2e/cross-cutting --reporter=line`
  Expected: 0 failed.

- [ ] **Step 3: Update the source pins** (`tests/e2e-disposal.test.ts` and any `tests/e2e-*.test.ts` that read the changed specs), then run `npm test`.
  Expected: 0 failures.

- [ ] **Step 4: Commit**
  ```bash
  git add e2e tests
  git commit -m "test(e2e): the approvals page: strip, tabs, search, the panel, reject with a remark, bulk approve across pages with the not-opened warning, own requests, the phone; bulk approval moves off the disposal queue (group 6 plan 2)"
  ```

### Task 6 (controller): look step, final review, docs

- [ ] **Look step:** run `next start` on port 3300. Shoot 1440 (both themes), 1024 and 390 (both themes) as the IT head, and 1440 as IT staff, who are refused the page (not found, as today). Cover:
  - the strip with 0 and with items;
  - a disposal panel with 3 photos;
  - a finding panel;
  - a round-close panel;
  - the selection bar with the dialog;
  - the phone list and the open item;
  - the empty inbox.

  Fix what it finds, rebuild, and re-shoot only what changed.
- [ ] **Final whole-branch review:** an opus Workflow, 3 lenses, 2 adversarial skeptics per finding. Make one fix pass.
- [ ] **Docs:** `docs/06_WORKFLOWS.md` (approvals), `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md`, `docs/07_UAT_CHECKLIST.md` (the inbox lines), `docs/11_FEATURE_LIST.md`.
