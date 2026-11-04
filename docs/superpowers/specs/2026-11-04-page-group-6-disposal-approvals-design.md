# Page group 6 (disposal and approvals): design

**Status:** draft for the user's approval (2026-11-04)

**Base:** `master` at `fa4465c5`. Page groups 1 to 5 are merged and pushed; nothing is deployed.

**Order of the remaining work:**
1. This group.
2. The other page groups of the canvas.
3. The "ยืนยันผลตรวจ" feature, last of the page work (user 2026-10-29).
4. ของใช้สิ้นเปลือง, after everything else.
5. E2E, then UAT, then the one Production deploy.

**Visual source:** the design canvas https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p, variant B.
- Boards used: AP, AP-Phone, DP-Queue, DP-Request, DP-Request-Phone, DP-New.
- The boards DP-Batch, DP-Batches and DP-Batch-New lend their **look** to the new disposal-round pages (§11); the request-batch pages themselves are not rebuilt (§4).
- Where this document and a board differ, this document wins.
- The boards' own assumptions are in `.impeccable/critique/2026-10-20-canvas-assumptions.md` (sections "งานรออนุมัติ" and "ตัดจำหน่าย").

**Recon:** four readers compared the boards with today's code and a fifth checked them (2026-11-04).
- Their notes, with file:line, are in the session scratchpad `g6/recon/` (r-inbox.md, r-queue.md, r-form.md, r-round.md, critic.md). Where the critic corrects a reader, the critic wins.
- The user's own words are in `g6/decisions.md`. The board renders are in `g6/boards/`.

*My call* marks a choice the user did not make. Each one is listed again in §14 for the user to check.

## 1. Intent

The real work, in the user's words (2026-11-04):
- An IT staff member asks to write an asset off and photographs it.
- The IT head looks at the photos and the asset details and approves, many at once. The IT head also approves the audit work (findings and round close).
- Later an IT staff member records the actual disposal **in groups formed at disposal time**: approved machines from several requests, sold, donated or destroyed together, for example to one buyer on one day.
- Someone sends accounting a list of what left the books: the asset code, the name and a photo.

Today the app does not fit this:
- **The approvals inbox (AP)** is a page of links. Before the queue come a policy panel and an approver matrix, about 1,800 px on desktop. Each row opens the record's own page, so approving ten requests means ten round trips.
  - Nothing shows a photo.
  - Audit rows print user ids and raw finding keys.
  - The page lists the viewer's own requests and fails only on the approve.
- **The request form (DP-New)** starts the method at "ตัดจำหน่าย" and leaves the requester empty. It treats the photo as optional.
- **The request page (DP-Request)** does not say who it waits for. It has one "พิจารณาคำขอ" button with a select inside, and shows the source as `maintenance / <uuid>`.
- **The queue (DP-Queue)** filters status twice (tabs and a select) and scrolls at 1440. Approving and executing are hidden behind "เลือกหลายรายการ".
- **Disposal is recorded per request.** A group sold for one price must be split into made-up per-machine prices, and nothing in the app answers "what did we sell to whom, for how much, and which machines were in it".
- **The accounting list** can only come from the generic export: 23 English columns, no photo.

## 2. Decisions the user made (2026-11-04)

| # | Decision |
|---|---|
| 1 | **The accounting report is an Excel** with the asset code the system uses (`SNI-…`, the asset tag), the asset name and a photo. I proposed Serial as a fourth column and the user did not object. It has **no** purchase data, no disposal method or value, no approval trail, and no `fixedAssetCode`. It is sent by hand, with no schedule. |
| 2 | **Approving uses layout B** (board AP): the list on the left; clicking a row shows its photos large and the asset's details in a right panel; tick many and approve at once. Rejecting is one at a time, with a reason. |
| 3 | **The IT head approves the audit work too**, so the approvals inbox (`/admin/approvals`) is the place to approve, with layout B for all three kinds. |
| 4 | **IT staff record the actual disposal, in groups formed at disposal time**, from many requests. |
| 5 | **A sale in a group has one lump price** for the whole group. |
| 6 | **A new table, the disposal round** (the user said "รอบจำหน่าย"; the word is settled in §13): number, date, method, buyer or recipient, document number, lump price, and the machines in it. This needs a migration. |
| 7 | **The report lives on the round's page**, as a button "ส่งออกรายงานส่งบัญชี" that gives that round's Excel. You reach it straight after creating the round (the app goes there) or later from the disposal page's rounds list. The date-range report proposed before is dropped. No link from the Reports page ("แค่นี้พอ"). |
| 8 | **Every request has at least one photo** (an image, not a PDF) before it is sent. |
| 9 | **Every recorded disposal goes through a round, even a single machine** (after the builder check). The per-row "บันทึกตัดจำหน่าย" and the bulk-execution dialog go (§9.4). A sale is stored one way: a lump price on the round. |
| 10 | **Everyone who can see disposal (`disposal:view`) may press "ส่งออกรายงานส่งบัญชี"**, so the IT staff member who creates the round can send it straight away. |
| 11 | **The round's method is chosen when the round is recorded**, not taken from the requests. Approved machines asked under different methods can share one round. The round's method is written onto every request in it (§11.2). |

## 3. Goals

1. The IT head decides a day's requests from one page: sees each machine's photos and facts, ticks the ones that look right, and approves them in one go. The audit work waits in the same queue.
2. Nothing the inbox offers fails on the click. A request the viewer cannot decide (their own) says so before anyone ticks it.
3. A disposal round answers in one place: what left, on what date, by which method, to whom, under which document, for what lump price.
4. Accounting gets the round's machines, with tag, name, Serial and photo, in one click from the round.
5. No request goes to the approver without a photo, and the approver sees when one is missing.
6. The pages match their boards in both themes, with the phone patterns of §5. Nothing the pages do today is lost (Appendix A, binding).

## 4. Non-goals and anti-goals

- **Non-goals:**
  - **The request-batch pages are not redesigned.** These are `/disposal/batch/new`, `/disposal/batches` and `/disposal/batches/[id]` (boards DP-Batch-New, DP-Batch, DP-Batches). They keep working. Two things change: they move into a header menu (§10.1), and the batch form gets the photo rule (§8.6).
  - **No multi-step approval.** `minApprovers` stays a display value, as today.
  - **No change to the findings page** (`/audit/findings`, group 2). Its own bulk approve and bulk reject stay. The inbox borrows its panel (§7.5).
  - **No round close from the inbox.** A close row opens the round page, where the checklist guards it.
  - **No undo of a round.** Execution is permanent today and stays so.
  - **No files on the round.** The document number names the paper. The request photos stay the evidence.
  - **No accounting fields in the report**, and no "sent to accounting" mark (decision 1). The file name carries the round number, so the sender can tell rounds apart.
  - **No change to the bell's kinds** or to the digest's structure (§12).
- **One schema change:** a new table `disposal_rounds` and a nullable `disposal_requests.roundId` (§11.1), as a manual migration.
- **Anti-goals:**
  - A tick box that the server would refuse.
  - A round that half-saves. A round is all its machines or none.
  - A sale price on a machine that nobody actually quoted.
  - A request that reaches the approver without a photo and without saying so.
  - Two ways to record a disposal that store a sale in two different shapes (§9.4).

## 5. Rules that bind every page

- **Parts and look:** the shared parts and tokens only (DESIGN.md):
  - page frame: `PageHeader`, `ContentPanel`, `StatStrip` (`href`, `current`, `attention`), `TabNav`, `SearchField`, `FilterMenuChip`;
  - tables: `DataTable` + `ClickableTableRow` (`scroll={false}`), `Pagination` (link mode; button mode for the phone's "แสดงเพิ่ม");
  - selection and dialogs: `DesktopSelectionBar`, `AccessibleDialog`, `ConfirmTextDialog`, `useFieldErrors`;
  - messages: `Notice`, `StatusBadge`, `EmptyNote`, `ActionEmptyState`;
  - forms: `OperationFormFrame`, `OperationSummaryCard`, `FormSection`, `Field`, `ChoiceCard`, `FileDropzone`;
  - photos and details: `KeyValueList`, `AssetPhotoFrame`, `AttachmentPreviewDialog`, `thumbnailUrl()`;
  - from group 2: `AuditFindingReviewPanel`, `AuditFindingDecision`;
  - from group 5: `RowActions`, `Steps`, `ActionBar`.
- **Names first:** rows, cards and panels show the asset name first, with the tag and document numbers under it in mono. Pickers keep "code - name" (group 3 §5).
- **Bangkok days** *(my call)*: the inbox's age, "เกิน SLA", "ครบ SLA วันนี้" and "รอนานสุด" use Bangkok date keys (`bangkokDayDiff`, `src/lib/waiting-work-rules.ts:205-206`), the same as the bell. Today the inbox uses server-local midnight (`src/lib/approval-aging.ts:52-54`). Round numbers and round dates use the Bangkok day too (§11.1).
- **One status vocabulary for disposal**, the words in use today *(my call, keeping critique decision D3, pinned by `tests/e2e-disposal.test.ts:118-126`)*: รอพิจารณา · อนุมัติแล้ว รอตัดจำหน่าย · ตัดจำหน่ายแล้ว · ไม่อนุมัติ. The board's shorter "อนุมัติแล้ว" and "ปฏิเสธ" are not adopted. The tabs are the only status filter (§10.2).
- **Photos are images:**
  - The disposal photo inputs accept `image/jpeg`, `image/png`, `image/webp`. A phone camera upload arrives as JPEG.
  - HEIC/HEIF is refused on the request-photo input and by the disposal attachment route for image slots *(my call)*. Today it would neither show in the panel nor go into the Excel.
  - PDFs stay allowed as **extra** evidence; they never count as the photo.
- **A lost machine cannot be photographed** *(my call, after the builder check)*:
  - For the method สูญหาย, the form needs at least one file of any allowed type (a police report or an incident record as PDF), and the label reads "หลักฐาน \* อย่างน้อย 1 ไฟล์".
  - The inbox and the request page show "ไม่มีรูป · สูญหาย" as a muted note instead of the "ยังไม่มีรูป" warning.
  - The report falls back as §11.5 says and writes "ไม่มีรูป".
- **"Has a photo"** = at least one active attachment of the request (`module: "disposal"`) with `fileType` starting `image/`, or, for a request created in a batch, one of its batch (`module: "disposal_batch"`). One helper serves the inbox, the request page and the report.
- **Words:** `docs/19_THAI_GLOSSARY.md`. Messages go only through `node scripts/messages-edit.mjs`, in Thai and English. The inbox's hard-coded copy (`src/lib/approval-inbox.ts:130-150`) moves into `messages/*.json`, so the glossary test can see it. No "Inbox" in Thai text.
- **Stable hooks:** the ids and `data-*` hooks E2E uses stay unless §15 says otherwise. Each source-reading test that pins a changed file is rewritten in the same task (list in §15).
- **Phone:** pages without a phone board follow the shared patterns (DataTable phone cards, `OperationFormFrame` with the summary on the phone). `/disposal/rounds` and `/disposal/rounds/[id]` are list and detail pages, not focus routes. The focus-route rule in `src/lib/mobile-field-navigation.ts:23` must stop matching `rounds` as a request id.

## 6. Permissions

As today unless the table says otherwise. The roles in play are IT staff (`disposal:view/create/edit`) and the IT head (the same, plus `disposal:approve`, `disposal:export`, `audit:approve`). These are the E2E roles (`e2e/support/run-plan.ts:12-27`). Production roles are set in Admin > Roles.

| Page | Action | Needs |
|---|---|---|
| Inbox | the page | `disposal:approve` or `audit:approve` (as today) |
| Inbox | disposal rows, the disposal panel, its photos | `disposal:approve` *(my call: `src/lib/attachment-access.ts` also lets `disposal:approve` view `disposal` and `disposal_batch` files, so an approver without `disposal:view` still sees photos)* |
| Inbox | audit rows and panels | `audit:approve` |
| Inbox | the policy disclosure's "ตั้งค่านโยบายอนุมัติ" link | as today (the settings page's own gate) |
| DP-New | the page and the send | `disposal:create` |
| DP-Request | Approve / Reject | `disposal:approve`, and not stopped by separation of duties |
| DP-Request | add a photo | `disposal:create` or `disposal:approve`, while the request is not executed (as today) |
| DP-Request | delete a file | `disposal:edit` (as today); the delete button is hidden from anyone without it; the last image of a request that is not executed cannot be deleted (§9.5) |
| Queue | pending tab link "พิจารณาในงานรออนุมัติ" | `disposal:approve` |
| Queue | approved tab ticks and "สร้างรอบตัดจำหน่าย" | `disposal:edit` |
| Rounds | list and round page | `disposal:view` |
| Rounds | create | `disposal:edit` |
| Rounds | "ส่งออกรายงานส่งบัญชี" | `disposal:view` (decision 10) |
| Queue | ส่งออก Excel | `disposal:export` (as today) |

**Separation of duties stays as the server applies it** (`src/lib/disposal-policy.ts:124-161`). The page only reads it earlier:
- **Approver:** must not be the requester or the creating user, and must have an employee link.
- **Executor:** must not be the item's approver.

The block reasons get separate codes so the page can say which one applies (§7.3).

## 7. งานรออนุมัติ (AP, AP-Phone)

### 7.1 Header
- H1 "งานรออนุมัติ".
- One policy line: "SLA {n} วัน · ผู้อนุมัติขั้นต่ำ {n} คน · บังคับแยกผู้ทำรายการ/ผู้อนุมัติ" (or "ไม่บังคับแยก…") "· ผู้อนุมัติ {พร้อม|ยังไม่พร้อม} ตัดจำหน่าย {n} คน · ตรวจนับ {n} คน".
- Buttons: "นโยบายและผู้อนุมัติ ▾" (`FormDisclosure`, closed, `aria-expanded`) and "ประวัติการตัดสินใจ" (link to `/admin/approvals/history`).
- The disclosure holds today's policy panel and approver matrix unchanged, plus the "ตั้งค่านโยบายอนุมัติ" link.

### 7.2 Strip, tabs, filters
- **StatStrip, three cells:**
  - **เกิน SLA:** `attention` when > 0. Its foot says "ตัดจำหน่าย {a} · ตรวจนับ {b}". Its link is "แสดงเฉพาะรายการนี้" → `?overdue=1`.
  - **รอนานสุด:** "{n} วัน". The foot names the item and its sent date, and the cell links to that item (`?item=`).
  - **รอทั้งหมด:** the foot says "เกิน SLA {x} + ภายใน SLA {y} = {total}".
  - All three cells count every pending item the viewer may see, the viewer's own disposal requests included (as the bell does). The counts are uncapped.
- **TabNav:** ทั้งหมด / ตัดจำหน่าย / ตรวจนับ, each with its count. Beside the tabs, a note: "ตรวจนับ = รายการไม่ตรง {f} · ปิดรอบตรวจนับ {c}".
- **Filters:**
  - A pressed-toggle link "เกิน SLA เท่านั้น" (`?overdue=1`).
  - A search "ค้นหาชื่อ รหัส เลขที่คำขอ", matching asset name, tag, `DP-…` number and `AUD-…` number.
  - The tab counts follow the search and the overdue filter. The strip does not *(my call, as group 5's strip)*.
- **The disposal setting `disposalRequired` no longer hides disposal from the inbox** *(my call)*. Approval is mandatory in code (`src/app/api/disposal-requests/[id]/route.ts` always needs it), so hiding it only made requests invisible (`src/lib/approval-inbox-query.ts:38`). The setting still shows in the policy line.

### 7.3 The queue (left, `xl` and up two panes `grid-cols-[minmax(0,1fr)_420px]`, as the findings page)
- **Columns:**
  1. Tick.
  2. **ประเภท:** a chip, and under it the method ("วิธี: ขาย"), the finding type in Thai ("ไม่ตรง · ที่ตั้ง", via `auditFindingTypeShortLabelKeys`), or "ปิดรอบตรวจนับ".
  3. **รายการ:** the asset name in bold, then "tag · DP-/AUD- no" in mono. A round shows "ตรวจนับ {round name}" and "AUD-… · ไม่มีรายการค้าง".
  4. **ผู้ทำรายการ:** the name, with "ส่งเรื่อง {d MMM}" under it. Audit rows resolve the user id to the person's name; today they print the raw id (`approval-inbox-query.ts:83`).
  5. **รอ ↓:** an SLA badge ("เกิน SLA {n} วัน" danger, or "รอ {n} วัน" muted), with "รอ {n} วัน" or **"ครบ SLA วันนี้"** (age = SLA) under it.
- **A disposal request with no photo** shows a warning badge "ยังไม่มีรูป" under the name. It can still be ticked (decision 8 fallback).
- **The viewer's own request** reads "คุณ" with the badge "อนุมัติเองไม่ได้", and its tick is disabled.
  - The block reason comes from a split of today's `DISPOSAL_SOD_CONFLICT` into `DISPOSAL_SOD_REQUESTER`, `DISPOSAL_SOD_CREATOR` and `DISPOSAL_SOD_NO_EMPLOYEE`. The API keeps answering 403 with the old code in its body for old callers, plus a `reason` field.
  - Each reason has its own line: "คุณเป็นผู้ขอ" / "คุณสร้างคำขอนี้" / "บัญชีของคุณยังไม่ผูกกับพนักงาน".
  - The other block codes of `getDisposalBulkApprovalBlockCode` disable the tick with their own line.
- **Round-close rows are never tickable.** Findings and disposal rows are.
- **Order:** overdue first, then the oldest, then the kind (today's `sortApprovalInboxItemsByAge`).
- **Paging:** the app standard, 25/50/100 *(my call; the board's 10 is off-standard)*, with "แสดง {a}–{b} จาก {n} · เรียงเกิน SLA ก่อน แล้วรอนานสุด".
  - The query loads every pending item's id, kind and date across the three sources. Today each source is capped at 50 or 100 (`approval-inbox-query.ts:47,58,170`). The query sorts and slices in memory, then loads the visible rows' details.
- **Clicking a row** sets `?item=<kind>:<id>` (kept with the tab, search, overdue filter and page). The row is marked `current`.
- **Empty states:**
  - "ไม่มีงานรออนุมัติ" when nothing is pending.
  - "ไม่พบรายการที่ตรงกับการค้นหา" with a clear link when the filters hide everything.

### 7.4 Ticking and the selection bar
- **One kind per selection** (board): disposal requests, or findings. Ticking a row of the other kind replaces the selection *(my call)*, with a polite live note "เลือกได้ทีละประเภท · เริ่มเลือกใหม่เป็น{kind}".
- **The bar is a sticky `DesktopSelectionBar`:** "{n} เลือกแล้ว {n} รายการ · {kind}", "ล้างรายการเลือก", the note "อนุมัติแบบกลุ่มทำได้ทีละประเภท · คำขอตัดจำหน่ายปฏิเสธทีละรายการเพราะต้องระบุเหตุผล", and the primary "ตรวจสอบและอนุมัติ {n} รายการ".
- **Disposal:**
  - The bar opens today's review-then-approve dialog (`DisposalBulkApprovalProvider` and its dialog, moved from the disposal page).
  - The dialog runs `POST /api/disposal-requests/bulk-decision`: a preview first, then the commit. The limit stays 50, and the optional shared remark stays.
  - The preview lists any item that became blocked since the page loaded; those items are left out.
- **Findings:**
  - The bar opens a confirm dialog with an optional remark, then runs today's client loop (`runAuditFindingBatchReview`, approve only).
  - A 409 conflict or an "already reviewed" answer is counted as "ต้องตัดสินในแผงด้านขวา", not as a failure.
- **Selection is per page:** it resets when the page, tab or filter changes, as the disposal list does today. The bar says "เลือกได้สูงสุด 50 รายการต่อครั้ง".
- **After a bulk approve:** the page refreshes, the selection clears, and a toast says "อนุมัติแล้ว {n} รายการ" (plus "ข้ามไป {m} รายการ" when some were blocked).

### 7.5 The right panel (`?item=`)
- **No item chosen:** the panel shows an empty note: "เลือกรายการทางซ้ายเพื่อดูรูปและรายละเอียด".
- **Disposal request:**
  - **Head:**
    - chips: the method, and the SLA badge;
    - the `DP-…` number on the right;
    - the asset name as the title;
    - under it, "tag · เปิดคำขอตัดจำหน่าย" (a link to `/disposal/[id]`).
  - **Photos (decision 2):**
    - one large photo (`AssetPhotoFrame`, the card-size thumbnail), with "รูปที่ {i} / {n}";
    - a strip of 64 px thumbnails under it; clicking one changes the large photo; the large photo opens `AttachmentPreviewDialog`;
    - PDFs follow the thumbnails as file chips;
    - with no image: a `Notice` warning, "คำขอนี้ยังไม่มีรูปทรัพย์สิน", with the same badge as the row.
  - **Details (`KeyValueList`, labels on top on narrow widths):**
    - เหตุผล;
    - ผู้ขอ ("name · d MMM yyyy HH:mm");
    - ที่มา: "งานซ่อม MT-…" or "รายการไม่ตรง AUD-…", linked, the same helper as §9.3;
    - Serial;
    - ราคาซื้อ: the price · "ซื้อปี {yyyy}", shown only when the data exists;
    - ที่ตั้ง: room · branch;
    - ผู้ถือครอง;
    - สภาพ.
  - **Effect (decision table):**
    - "ถ้าอนุมัติ": the request becomes อนุมัติแล้ว รอตัดจำหน่าย; the asset stays รอตัดจำหน่าย until it is recorded in a disposal round.
    - "ถ้าปฏิเสธ": the request becomes ไม่อนุมัติ; the asset returns to **{its status before the request}**, read from `previousAssetStatus`. The board's fixed "ใช้งานอยู่" is replaced.
  - **Separation-of-duties line:**
    - when allowed: "แยกหน้าที่: คุณไม่ใช่ผู้ขอหรือผู้สร้างคำขอนี้ จึงอนุมัติได้ · เมื่ออนุมัติแล้ว คุณจะเป็นผู้บันทึกตัดจำหน่ายรายการนี้เองไม่ได้";
    - when blocked: the reason from §7.3, and the buttons are hidden.
  - **Decision area:**
    - a remark field "หมายเหตุการพิจารณา", with the hint "ต้องกรอกเมื่อปฏิเสธ";
    - the buttons "อนุมัติ" (success) and "ปฏิเสธ" (danger outline);
    - Reject with an empty remark shows the field error (`getDisposalDecisionFieldErrors`).
  - **After a decision:**
    - the app goes to the **next inbox item** in the current order (`?item=` of the next row, or the panel's empty note when none is left);
    - a toast confirms;
    - the foot says "ตัดสินใจแล้วไปรายการถัดไปอัตโนมัติ · {i} จาก {n}".
- **Audit finding:**
  - The group-2 `AuditFindingReviewPanel` with `AuditFindingDecision`.
  - Its data comes from a **panel-only loader** extracted from `getAuditFindingsPageData` (`src/lib/audit-findings-page-data.ts:113-256`). The findings page uses the same loader, so it keeps working.
  - The inbox feeds the panel the next href. The panel's own approve and reject stay, including the 409 confirm.
- **Round close:**
  - A small panel: the round name, `AUD-…`, the dates, "ไม่มีรายการค้าง · ไม่มีรายการไม่ตรงค้าง · ไม่มีแผนแก้ไขค้าง" (from `getAuditRoundCloseChecklist`), and who created it.
  - One primary link, "เปิดรอบตรวจนับเพื่อปิดรอบ", to `/audit/rounds/[id]`.
- **A stale item** (decided by someone else, or gone) shows a `Notice` saying "รายการนี้ถูกตัดสินแล้วหรือไม่อยู่ในคิว", with a link to the next item.

### 7.6 Server changes the panel needs
- **Single approve without `nextStatusId`:** `disposalDecisionSchema` makes `nextStatusId` optional. The route resolves "Pending Disposal" by name, as create does (`src/app/api/disposal-requests/route.ts:87-90`). The request page and the inbox both use this PATCH.
- **Reject is guarded:**
  - The reject path moves into a Serializable transaction, with `updateMany … where requestStatus: "pending"`, as approve does (`src/lib/disposal-approval-service.ts:172-186`).
  - It answers `DISPOSAL_CONCURRENT_UPDATE` when the request is no longer pending.
  - Today two approvers can produce "approved, then overwritten to rejected" (critic §3.2).
- **The inbox item href** becomes `/{locale}/admin/approvals?item=<kind>:<id>` for every kind. The work center rows (`src/app/[locale]/(dashboard)/work-center/page.tsx:654`) use it, so they land on the panel.

### 7.7 Phone (AP-Phone)
- **Top of the page:**
  - the three stat cards stacked as a 3-cell strip;
  - the policy disclosure as a card;
  - the tabs;
  - "เรียงเกิน SLA ก่อน แล้วรอนานสุด · แสดง {n} จาก {total}".
- **Cards:** each card is a link to `?item=` and the whole card is tappable, ≥ 44 px. A card holds:
  - the kind chip, the SLA badge and "รอ {n} วัน";
  - the name, then the codes;
  - "{requester} · {date}";
  - a next-step line, "พิจารณาตัดจำหน่าย ›" or "พิจารณารายการไม่ตรง ›" or "เปิดรอบตรวจนับ ›".
- **More:** "แสดงเพิ่มอีก 10 รายการ · เหลือ {n}" (`Pagination` button mode) *(my call: the board's 5)*.
- **No ticks on the phone** *(my call)*.
- **Opening an item:** the panel takes the page, as on the findings page below `xl`. It has a back link "กลับไปงานรออนุมัติ", and after a decision it goes to the next item.
- The bottom nav stays, with "เพิ่มเติม" active (not a focus route).

## 8. ยื่นคำขอตัดจำหน่าย (DP-New)

### 8.1 Frame
- `OperationFormFrame`, with breadcrumbs "ตัดจำหน่าย › ยื่นคำขอตัดจำหน่าย".
- H1 "ยื่นคำขอตัดจำหน่าย" *(my call: the glossary row at `docs/19_THAI_GLOSSARY.md:56`, not the board's "ขอตัดจำหน่าย")*.
- Subtitle: "เลือกทรัพย์สิน ระบุวิธีและเหตุผล แนบรูป แล้วส่งให้ผู้มีสิทธิ์พิจารณา".
- The summary sits on the right; on the phone it stacks below (`summaryOnPhone`).

### 8.2 Section 1 "ทรัพย์สิน"
- **The picker:** today's `DisposalAssetPicker`, with the eligible and blocked rows and its blocker lines.
- **The chosen asset as a card:**
  - the asset photo, or an icon;
  - the name, the mono tag and a status badge;
  - "อยู่ที่ {room} · {branch} · {holder | ไม่มีผู้ถือครอง}";
  - a "เปลี่ยน" button.
- **The readiness line** under the card: "ไม่มีงานค้าง: รับคืนแล้ว · ไม่มีงานซ่อม · ไม่อยู่ในรอบตรวจนับ · ไม่มีส่วนควบติดตั้ง". It is derived from the same blockers the server checks: an eligible row has none.
- **`?assetId=` prefill** (from the repair page, group 5 decision 9) keeps working.

### 8.3 Section 2 "วิธีและเหตุผล"
- **วิธีจำหน่ายที่เสนอ \***: five `ChoiceCard` radios with **no default**: ขาย · บริจาค · ทำลาย · สูญหาย · จำหน่าย. The hint reads "เปลี่ยนได้ตอนบันทึกรอบตัดจำหน่าย" (decision 11).
  - `types.dispose` reads "จำหน่าย" *(my call: the glossary keeps "ตัดจำหน่าย" for leaving the books)*.
  - Under the chosen card, one line on what the round will need:
    - ขาย: "ตอนบันทึกรอบต้องมีผู้ซื้อ ราคาขายเหมาของรอบ และเลขที่เอกสาร";
    - บริจาค and จำหน่าย: "…ผู้รับและเลขที่เอกสาร";
    - ทำลาย and สูญหาย: "…เลขที่เอกสารและรายละเอียดการดำเนินการ".
  - The error "เลือกวิธีจำหน่าย" appears under the group.
- **The estimate fields stay optional, as today:**
  - มูลค่าขายที่ประเมิน, shown for ขาย;
  - มูลค่าซาก.
  - Both have the hint "ไม่บังคับ · ใช้ประกอบการพิจารณา".
- **ผู้ขอ:**
  - Preset to the signed-in user's employee, with the hint "ตั้งเป็นคุณไว้ให้ · เปลี่ยนได้เมื่อขอแทนคนอื่น".
  - The picker shows "code - name · department".
  - With no employee link, it stays empty with the hint "บัญชีของคุณยังไม่ผูกกับพนักงาน เลือกผู้ขอเอง".
- **ผู้พิจารณา (ไม่บังคับ):** advisory, as the code is today *(my call, after the builder check)*.
  - The server does not limit approval to the named person, and the approver who decides is stored (`src/lib/disposal-approval-service.ts:177`).
  - The hint: "ระบุเพื่อแจ้งว่าขอให้ใครพิจารณา · ผู้มีสิทธิ์คนอื่นพิจารณาได้เช่นกัน ยกเว้นผู้ขอและผู้สร้างคำขอ".
  - §9.2's "รอใคร" reads "{name} (ระบุไว้) หรือผู้มีสิทธิ์คนอื่น".
- **เหตุผล \* "อย่างน้อย 12 ตัวอักษร"**, said in the label.
  - The live line reads "ครบ 12 ตัวอักษรแล้ว" once the trimmed length reaches 12, otherwise "อีก {n} ตัวอักษร".
  - The count shows "{n} / 4,000 ตัวอักษร" (trimmed).

### 8.4 Section 3 "รูปทรัพย์สิน" (decision 8)
- Label: "รูปทรัพย์สิน \* อย่างน้อย 1 รูป".
- **The dropzone** takes camera capture on the phone (`capture="environment"`). Its accept list is jpeg, png, webp and PDF; PDFs are extra documents.
- **The queue shows thumbnails** for images and a file chip for PDFs, each with a remove ×.
- **The error** "ต้องมีรูปทรัพย์สินอย่างน้อย 1 รูป" shows when no image is queued: on send, and on blur of the section after a try.
- **A HEIC file** is refused at once, with "ใช้ไฟล์ JPG, PNG หรือ WEBP".

### 8.5 Summary "หลังส่งคำขอ" (`OperationSummaryCard`)
- **Rows:**
  - สถานะทรัพย์สิน: "{now}" → **รอตัดจำหน่าย**;
  - คำขอ: ยังไม่มี → **รอพิจารณา**;
  - ผู้พิจารณา: the chosen approver or "ผู้มีสิทธิ์คนใดก็ได้".
- **Three steps:** ยื่นคำขอ → พิจารณา → บันทึกในรอบตัดจำหน่าย.
- **The line** "ถ้าไม่อนุมัติ ทรัพย์สินกลับเป็น{now}".
- **The checklist:** ทรัพย์สิน, วิธี, ผู้ขอและเหตุผล, รูป {n}.

### 8.6 Send
- **The sticky footer:** "ยื่นคำขอตัดจำหน่าย {name} {tag} · {method}", "ยกเลิก", and the primary "ส่งคำขอตัดจำหน่าย →".
- **The flow stays create-then-upload:**
  - POST JSON as today, then upload each file to `/api/disposal-requests/[id]/attachments`, then go to the request page.
  - The photo rule is a client gate. The server POST stays as it is, so API callers keep working.
- **If an upload fails:**
  - The request page shows a `Notice`: "อัปโหลดไม่สำเร็จ {n} ไฟล์ · คำขอนี้ยังไม่มีรูป" (or "…ยังขาด {n} ไฟล์"), with the photo upload right there.
  - The dead `?uploadErrors=` (`disposal-request-form.tsx:174`) is replaced by the derived "has a photo" state plus that query for the count.
- **The batch form** (`/disposal/batch/new`) gets the same rule for its shared evidence: at least one image among the shared files, the same accept list and error. Nothing else on that form changes.

## 9. The request page (DP-Request, DP-Request-Phone)

### 9.1 Header
- The breadcrumb "ตัดจำหน่าย › DP-…".
- H1: the asset name. Under it: "tag · คำขอ DP-…", the status badge and the method chip.
- Right side: "พิมพ์คำขอ" (after execution, "พิมพ์เอกสาร…") and "ประวัติ" in a ⋯ menu *(board)*.

### 9.2 The next-step card (full width, `Steps` with 3 steps: ยื่นคำขอ ✓ · พิจารณา · บันทึกในรอบตัดจำหน่าย)
- **Pending, the viewer can decide:**
  - "รอคุณพิจารณา".
  - The effect table: "ถ้าอนุมัติ" and "ถ้าปฏิเสธ", the same as §7.5, including the real previous status.
  - The separation-of-duties note.
  - Two buttons, "อนุมัติ" and "ปฏิเสธ". Each opens today's decision dialog (`DisposalDecisionButton`) with its outcome already chosen and the remark field. Reject needs a remark.
- **Pending, the viewer cannot decide:**
  - Their own request: a warning `Notice` "คุณพิจารณาคำขอนี้เองไม่ได้", with the reason from §7.3.
  - Without the permission: "รอผู้มีสิทธิ์พิจารณา".
  - Both show "รอใคร: {approver or คิวอนุมัติส่วนกลาง}", with "ผู้มีสิทธิ์พิจารณาคนใดก็ได้ที่ไม่ใช่คุณ", and "รอมาแล้ว ตั้งแต่ {date}".
- **Approved:** "อนุมัติแล้ว · รอบันทึกในรอบตัดจำหน่าย".
  - With `disposal:edit`, a link "ไปเลือกในแท็บอนุมัติแล้ว" leads to `/disposal?status=approved`.
  - The approver sees "คุณอนุมัติคำขอนี้ จึงบันทึกตัดจำหน่ายรายการนี้เองไม่ได้".
- **Disposed:** "ตัดจำหน่ายแล้วในรอบ DPR-… · {date}", linked to the round. A request executed before rounds existed shows its own execution facts, as today.
- **Rejected:** "ไม่อนุมัติ · {remark}", with "ทรัพย์สินกลับเป็น{status}".

### 9.3 Panels
- **The asset panel** (380 px, labels above values, `overflow-wrap:anywhere`, empty rows hidden *(board)*):
  - the photos (large, plus thumbnails, as §7.5);
  - tag, Serial, category, location, holder, condition, purchase price.
- **Request details:**
  - ผู้ขอ;
  - the estimates;
  - **ที่มา**: "งานซ่อม MT-…", linked to `/maintenance/[id]`, or "รายการไม่ตรง AUD-…", linked to `/audit/findings?finding=<id>`. Both come from one helper that reads `repairNo` or `auditNo`. Today `formatSource` prints `maintenance / <uuid>`. The print page uses the same helper.
  - เหตุผล;
  - the batch link when there is one ("สร้างจากชุด DPB-…").
- **Execution (when disposed in a round):** the round's number (linked), date, method, buyer or recipient, document number, and "ราคาขายเหมาของรอบ {x} บาท · {n} เครื่อง" for a sale.
- **Evidence:** today's `DisposalAttachments`, showing images as thumbnails with the preview dialog.
  - The no-photo `Notice` of §8.6 sits on top when there is no image.
  - The hint: "เพิ่มรูปได้ระหว่างรอพิจารณา ผู้พิจารณาจะเห็นทันที".

### 9.4 One way to record a disposal (decision 9)
- Recording an actual disposal happens only through a round (§11), including a round of one machine.
- Removed: the per-row "บันทึกตัดจำหน่าย" (`DisposalExecutionButton` on the queue and the request page) and the bulk-execution dialog.
- Retired: `PATCH /api/disposal-requests/[id]` `action:"execute"` and `POST /api/disposal-requests/bulk-execution`. Both answer 410 with `DISPOSAL_USE_ROUND`, and the refusal matrix and RBAC matrix are updated.
- Why: a sale stored per machine on one path and as a lump on the round on the other would make "how much did we sell" depend on the path.

### 9.5 Files
- The last image of a request that is not executed cannot be deleted. The server answers `DISPOSAL_LAST_PHOTO`, and the page hides that × with the hint "ต้องเหลือรูปอย่างน้อย 1 รูป".
- The delete button shows only with `disposal:edit`. Today a create-only user sees it and gets a 403.

### 9.6 Phone (DP-Request-Phone)
- **Header:** back to the queue, the title, and a ⋯ menu (print, history).
- **Cards, top to bottom:**
  - the next-step card with the 3-step bar, the notice, "รอใคร" and "รอมาแล้ว";
  - "สถานะทรัพย์สิน", with the effect lines;
  - "รายละเอียดคำขอ";
  - "หลักฐาน", with 64 px thumbnails and the add tile (camera).
- **The bottom action bar shows only when the viewer has a next step** (Approve / Reject). Otherwise it is hidden, as the board shows. The old "เปิดทรัพย์สิน" button is dropped (the name links to the asset).

## 10. The queue (DP-Queue)

### 10.1 Header
- H1 "ตัดจำหน่าย", subtitle "ติดตามคำขอที่รอพิจารณา รอตัดจำหน่าย และรอบตัดจำหน่าย".
- **Buttons:**
  - the primary "ยื่นคำขอตัดจำหน่าย";
  - "รอบตัดจำหน่าย" (link to `/disposal/rounds`);
  - a menu "ชุดคำขอ ▾" with "สร้างชุดคำขอ" and "ประวัติชุดคำขอ";
  - "ส่งออก" (`disposal:export`).

### 10.2 Tabs, filters, table
- **TabNav with counts:** ทั้งหมด · รอพิจารณา · อนุมัติแล้ว รอตัดจำหน่าย · ตัดจำหน่ายแล้ว · ไม่อนุมัติ. The tab labels may be shortened to "อนุมัติแล้ว" if the width needs it *(builder's call; the badge keeps the full word)*.
- **The status select leaves the filter form.** What remains: the search "ค้นหาเลขคำขอ ชื่อ รหัส ผู้ขอ", ประเภท, and a date chip "วันที่ขอ" (`FilterMenuChip`, as group 5's chip).
- **Columns (no horizontal scroll at 1440):**
  1. the tick (approved tab only);
  2. ทรัพย์สิน: name, with the mono tag under it;
  3. เลขที่คำขอ · สถานะ: `DP-…` with the badge, and "{date} · {n} วัน" under it;
  4. ประเภท: the method, with the estimate or "ไม่มีมูลค่า" under it;
  5. ผู้ขอ: the name, with "(คุณ)" for the viewer;
  6. ขั้นถัดไป.
  - In the ตัดจำหน่ายแล้ว tab, column 6 shows the round, "DPR-… · {date}", linked.
- **Pending tab:**
  - For `disposal:approve`, the next-step column holds "พิจารณาในงานรออนุมัติ", a link to `/admin/approvals?item=disposal:<id>`. For the viewer's own row it reads "ดู", with "คุณเป็นผู้ขอ พิจารณาเองไม่ได้" under it.
  - A one-line note above the table: "คุณพิจารณาได้ {a} จาก {b} รายการ · อนุมัติหลายรายการได้ที่งานรออนุมัติ", with that link.
  - **No ticks here** (decision 3). The bulk approval provider moves to the inbox.
- **Approved tab (with `disposal:edit`):**
  - ticks on every row the viewer may execute. A row is disabled with its reason when:
    - the viewer approved it: "คุณอนุมัติรายการนี้";
    - it has no evidence: "ยังไม่มีหลักฐาน".
  - the "เลือกทั้ง {n} รายการที่เลือกได้" control;
  - the sticky bar "{n} เลือกแล้ว · ล้างรายการเลือก" with the primary **"สร้างรอบตัดจำหน่าย {n} รายการ →"**.
  - Machines asked under different methods may be ticked together (decision 11). The limit is 50 per round *(my call; today's bulk is 20)*.
  - The tab's page size may be raised to 100 so one round fits on one page.
- **Row click** opens the request (`ClickableTableRow`).
- **Phone:** cards with name, tag, number, status, method and requester, and the next step as a link. The approved tab on the phone has no ticks: "สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์" *(my call)*.
- **The footer line** "แสดง {a}–{b} จาก {n}" stays. The board's "ชื่อสถานะชุดเดียว… 4 + 3 + 20 + 2 = 29" note becomes the sum in the ทั้งหมด tab's tooltip-free foot *(builder's call whether to show it)*.

## 11. รอบตัดจำหน่าย (new; the look of DP-Batch, DP-Batches and DP-Batch-New)

### 11.1 The table (one migration)
```prisma
model DisposalRound {
  id            String    @id @default(uuid())
  roundNo       String    @unique(map: "UX_disposal_rounds_roundNo") @db.NVarChar(50)   // DPR-yyyyMMdd-NNNN, Bangkok day
  disposalType  String    @db.NVarChar(30)        // one method per round
  executionDate DateTime                           // the disposal date, Bangkok day, not in the future
  executedById  String                             // employee
  executedBy    Employee  @relation("DisposalRoundExecutedBy", fields: [executedById], references: [id], onDelete: NoAction, onUpdate: NoAction)
  recipientName String?   @db.NVarChar(200)        // required for sell / donate / dispose
  documentNo    String    @db.NVarChar(100)        // required
  saleValue     Decimal?  @db.Decimal(18, 2)       // the lump price, required for sell, empty otherwise
  remark        String?   @db.NVarChar(Max)        // required for destroy / lost
  createdBy     String    @db.NVarChar(100)
  updatedBy     String?   @db.NVarChar(100)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  isActive      Boolean   @default(true)
  disposalRequests DisposalRequest[]
  @@index([isActive, executionDate], map: "IX_disposal_rounds_isActive_executionDate")
  @@index([executedById], map: "IX_disposal_rounds_executedById")
  @@map("disposal_rounds")
}
// DisposalRequest gains: roundId String? + relation + @@index([roundId], map: "IX_disposal_requests_roundId")
// Employee gains: executedDisposalRounds DisposalRound[] @relation("DisposalRoundExecutedBy")
```
- **No status column:** a round exists only once all its machines are executed.
- **No salvage field:** not asked.
- **No backfill:** requests executed before rounds belong to none.
- **The machine count and the title** ("Monitor LG 22MK430H 2 เครื่อง", or "{first name} และอีก {n} รายการ") come from the requests.
- **The migration file** is `prisma/manual-migrations/2026-11-xx-add-disposal-rounds.sql`. It is idempotent and has the same shape as `2026-07-13-add-disposal-batches.sql`:
  - named `PK_`/`DF_`/`FK_`/`UX_`/`IX_` objects;
  - `NVARCHAR(1000)` ids;
  - `COL_LENGTH` and `sys.*` guards;
  - a rollback note.
- **Applying it:**
  - On the dev DB `asset_management_dev`, with `npm run migration:apply` in the plan that adds the table.
  - On Production on deploy day, through `--db-env .env.prod-admin`, after the user approves the full SQL. It joins the two scripts already waiting (`docs/03_DATABASE.md:76-77`).
  - **It must run before the deploy:** once `roundId` is in the Prisma client, every DisposalRequest read fails on a database without the column. It is not gated with `omit`.

### 11.2 Creating a round (from the approved tab)
- **The page:** "สร้างรอบตัดจำหน่าย {n} รายการ" opens `/disposal/rounds/new?ids=…`. This is an `OperationFormFrame` page and a focus route on the phone *(my call: a page, not a dialog, for its length and its review)*.
- **Section 1 "เครื่องในรอบ":**
  - The chosen machines as rows (name, tag, `DP-…`, approver), each with a ×.
  - "เพิ่มจากรายการอนุมัติแล้ว" goes back to the tab with the selection kept in the query.
- **Section 2 "ข้อมูลการจำหน่าย":**
  - **วิธีจำหน่าย \*** (decision 11): five `ChoiceCard` radios, ขาย · บริจาค · ทำลาย · สูญหาย · จำหน่าย.
    - No default when the machines were asked under different methods. When they all share one method, that method is pre-chosen.
    - Each row of section 1 shows the method it was asked under ("ขอเป็น: บริจาค").
    - When the chosen method differs from a request's, a line says "จะเปลี่ยนวิธีของ {n} คำขอเป็น {method}".
    - The fields below follow the chosen method;
  - วันที่จำหน่าย \*: default today, not later than today;
  - ผู้ดำเนินการ \*: preset to the signed-in user's employee; the options exclude every selected machine's approver;
  - ผู้ซื้อ / ผู้รับ / ปลายทาง: \* for ขาย, บริจาค and จำหน่าย;
  - เลขที่เอกสารอ้างอิง \*;
  - **ราคาขายเหมาทั้งรอบ (บาท) \*** for ขาย, with the hint "ราคาเดียวสำหรับ {n} เครื่องในรอบนี้";
  - รายละเอียดการดำเนินการ: \* for ทำลาย and สูญหาย, optional otherwise.
- **The summary "หลังบันทึกรอบ":**
  - คำขอ {n} รายการ: อนุมัติแล้ว → **ตัดจำหน่ายแล้ว**;
  - ทรัพย์สิน {n} รายการ: รอตัดจำหน่าย → **ตัดจำหน่ายแล้ว**;
  - แผน PM ของเครื่องเหล่านี้: จบแผน (as execution does today);
  - "บันทึกแล้วแก้หรือยกเลิกไม่ได้".
- **The record-back exception survives** *(my call, after the builder check)*:
  - A system admin sees one extra checkbox, "บันทึกย้อนหลังโดยไม่มีหลักฐาน (เฉพาะผู้ดูแลระบบ)", with a required reason. It is the round-level form of today's `useHistoricalEvidenceException` (`src/lib/disposal-evidence-exception.ts`).
  - It lets machines without evidence into the round, and each one is logged as today (`execute_historical_without_evidence`).
  - Other users see such machines as blocked, with "ยังไม่มีหลักฐาน · ให้ผู้ดูแลระบบบันทึก".
- **Review step:** "ตรวจสอบรอบ" runs a preview. The page lists every machine that would be refused, with its reason:
  - "คุณอนุมัติรายการนี้";
  - "คำขอไม่อยู่ในสถานะอนุมัติแล้ว";
  - "ทรัพย์สินไม่อยู่ในสถานะรอตัดจำหน่าย";
  - "ยังไม่มีหลักฐาน".
  - Saving is disabled until those machines are removed. The primary is then "บันทึกรอบตัดจำหน่าย {n} รายการ".
- **Save (`POST /api/disposal-rounds`, `disposal:edit`, preview | commit):**
  - **One Serializable transaction** with a 60 s timeout:
    - create the round with the next `DPR-` number (`withPrismaUniqueRetry`);
    - execute every request through the extracted `executeDisposalRequestInTransaction(tx, …, { roundId })`:
      - set the request `disposed` with the round's date, executor, recipient, document and remark;
      - set the request's `disposalType` to the round's method; the audit log entry keeps the method it was asked under (`fromDisposalType`); the per-request type check of today's execution (`src/lib/disposal-execution-service.ts:139`) does not apply to a round;
      - `actualSaleValue` stays empty;
      - the asset becomes **Disposed** for every method *(my call)*;
      - its PM plans end;
      - the movement `disposal_execute` carries `remark: round=<DPR-…>`;
    - write the audit log: `create_round` on the round, `execute` per request.
  - **Any refusal rolls back everything** and answers with the per-item codes.
- **The sell rule:** `getDisposalExecutionFieldErrors` checks the round's `saleValue` for a round sale instead of the request's `actualSaleValue`.
- **After the save** the app goes to the round page, with a toast "บันทึกรอบตัดจำหน่าย DPR-… แล้ว".

### 11.3 The round page (`/disposal/rounds/[id]`, the look of DP-Batch)
- Breadcrumb "ตัดจำหน่าย › รอบตัดจำหน่าย › DPR-…".
- H1 "รอบตัดจำหน่าย · {title}", with the meta line "DPR-… · {method} · {date} · บันทึกโดย {name}".
- **The header button "ส่งออกรายงานส่งบัญชี"** (decision 7).
- **The info panel "ข้อมูลรอบ":** วิธี, วันที่จำหน่าย, ผู้ซื้อ/ผู้รับ, เลขที่เอกสาร, ราคาขายเหมา (for a sale), รายละเอียด, ผู้ดำเนินการ.
- **The machines table "เครื่องในรอบ ({n})":** photo thumbnail (or "ไม่มีรูป"), name, tag, Serial, `DP-…` (linked), approver. Phone cards.
- **No progress card and no 5-cell strip:** a round is always complete.

### 11.4 The rounds list (`/disposal/rounds`, the look of DP-Batches)
- **Columns:** เลขที่รอบ · ทรัพย์สินในรอบ (title, "{n} เครื่อง") · วิธี · ผู้ซื้อ/ผู้รับ · วันที่จำหน่าย · ราคาเหมา (sale only).
- Newest first; search by number, document number, buyer and asset; paging 25/50/100; phone cards.
- Empty: "ยังไม่มีรอบตัดจำหน่าย · สร้างรอบจากแท็บอนุมัติแล้ว", with that link.

### 11.5 The accounting Excel (`GET /api/disposal-rounds/[id]/report`)
- **File:** `รอบตัดจำหน่าย-DPR-…-yyyy-mm-dd.xlsx` (Thai file name through `workbookResponse`).
- **Sheet "รายการ":**
  - one title row: "รอบตัดจำหน่าย DPR-… · วันที่ {d/m/yyyy พ.ศ.}" *(my call: identifies the round, holds no method or value)*;
  - the header row, styled by `styleWorksheetHeader`: ลำดับ · รหัสทรัพย์สิน · ชื่อทรัพย์สิน · Serial · รูป;
  - one row per machine, in the round's order.
- **The photo:**
  - Use the request's first image by upload time, else its batch's first image.
  - Read it safely (`assertSafeUploadPath`), convert it with `sharp` (rotate, fit inside 240 px, JPEG 80), then embed it with `workbook.addImage` and `worksheet.addImage` (one cell, `editAs: "oneCell"`), with the row height set to fit.
  - A missing file or a failed conversion writes "ไม่มีรูป" in the cell, never a 500.
- **Limits:** up to 50 machines; images are read one at a time; the file is about 1–2 MB.
- **Permission:** `disposal:view` (decision 10). It is not one of the `disposal:export` exports, so `export-rights.ts` lists it as a view-gated report and its pin says so.
- **Tests:** the route is classified in `src/lib/rbac-route-matrix.ts` and added to the refusal matrix and the export-rights pin.

## 12. Outside the pages (only these changes)
- **The bell, digest and dashboard counts** keep their numbers, which match the inbox's รอทั้งหมด (the viewer's own requests included).
  - `notifications.approvedDisposalsDetail` reads "ยังไม่ได้บันทึกในรอบตัดจำหน่าย". It still links to `/disposal?status=approved`.
  - The digest's hard-coded "อนุมัติแล้ว รอตัดจำหน่าย" (`src/lib/notification-digest-format.ts:39-40`) is unchanged, since the words stay (§5).
- **The work center's approvals panel** links each row to the inbox item (§7.6).
- **The existing disposal export gets Thai headers** and a "เลขที่รอบ" column. It writes Thai type, status and source words instead of keys. The headers use รหัสทรัพย์สิน, not "Asset Tag".
- **The system log** knows the round: its record label and its link to `/disposal/rounds/[id]` (`src/lib/system-log-record-labels.ts`, `src/lib/system-log-presenter.ts:433`).
- **The print page** shows the round (number, buyer, document, lump price, machines) for a request in a round, and the source through the §9.3 helper.

## 13. Words
- **รอบตัดจำหน่าย** is the round *(my call)*. The user said "รอบจำหน่าย", but the glossary keeps "จำหน่าย" for a method (`docs/19_THAI_GLOSSARY.md:22`) and already names the flow "รอบตัดจำหน่าย" (`:55`). A round of method จำหน่าย would otherwise read "รอบจำหน่าย · จำหน่าย".
- **ยื่นคำขอตัดจำหน่าย** is the main button and the form's H1 (glossary `:56`).
- **Methods:** ขาย · บริจาค · ทำลาย · สูญหาย · จำหน่าย (`types.dispose`).
- **Statuses:** as §5.
- **งานรออนุมัติ** is the inbox. "Inbox" is removed from the Thai text (`policyTitle`).
- **New glossary rows** (added before use): รอบตัดจำหน่าย; ราคาขายเหมา; ส่งออกรายงานส่งบัญชี; "ครบ SLA วันนี้". `tests/thai-glossary.test.ts` gains a pin that "รอบจำหน่าย" does not appear in `messages/th.json`.

## 14. Calls I made, and questions

### 14.1 Calls (for the user to check)
1. Inbox ages, SLA and round numbers use Bangkok days.
2. Disposal status words stay as today (D3); the board's shorter words are not adopted.
3. `types.dispose` reads "จำหน่าย"; the round is "รอบตัดจำหน่าย"; the main button is "ยื่นคำขอตัดจำหน่าย".
4. HEIC is refused for disposal photos; PDFs are extra and never count as the photo.
5. A batch's shared image counts as a batch request's photo; the report falls back to it.
6. The inbox shows disposal even with the `disposalRequired` setting off.
7. The inbox's tab counts follow the search and the overdue filter; the strip does not.
8. The inbox pages by 25/50/100; the phone shows 10 more at a time and has no ticks.
9. Ticking the other kind restarts the selection; close rows are never tickable; findings bulk is approve only in the inbox.
10. Approvers may see disposal photos with `disposal:approve` alone.
11. The separation-of-duties refusal gets three reason codes.
12. Reject is guarded against a concurrent approve.
13. The last image of an unexecuted request cannot be deleted; the delete button shows only to `disposal:edit`.
14. The requester is preset to the signed-in user and stays changeable.
15. The request-batch pages are not redesigned; they move into the "ชุดคำขอ ▾" menu and gain the photo rule.
16. Round creation is a page; one method per round, chosen there (decision 11); at most 50 machines; all or nothing; the asset becomes Disposed for every method; no undo; no files on the round.
17. A round's machines keep `actualSaleValue` empty; the lump price lives on the round only.
18. The report's title row shows the round number and date.
19. Work center rows open the inbox item.
20. A lost machine needs any file, not a photo, and shows a muted "ไม่มีรูป · สูญหาย".
21. The named approver on a request is advisory, as today.
22. The system admin's record-back exception moves onto the round form.

### 14.2 Questions for the user
All three were answered after the builder check and became decisions 9, 10 and 11 (§2).

## 15. E2E and tests
- **Specs that change in the task that changes their page:**
  - `e2e/disposal/single-request.spec.ts` (photo, method, the Approve and Reject buttons);
  - `open-audit-block.spec.ts`;
  - `e2e/cross-cutting/field-errors.spec.ts:288-303`;
  - `batch-bulk-approval.spec.ts` (bulk approval moves to the inbox);
  - `disposal-support.ts:171-189` (execution through a round);
  - `e2e/dashboard/dashboard.spec.ts:67-68` (the inbox's cell is "รอทั้งหมด");
  - `e2e/cross-cutting/reports.spec.ts:119-120`;
  - `e2e/cross-cutting/support/refusals.ts` (new pages and routes; 410 routes).
- **Source pins rewritten with them:**
  - `tests/e2e-disposal.test.ts`;
  - `approval-inbox.test.ts` (hrefs);
  - `disposal-forms-ux.test.ts`, `disposal-queue-ux.test.ts`;
  - `disposal-bulk-execution*.test.ts`, `disposal-execution-service.test.ts`;
  - `disposal-validation.test.ts`, `disposal-policy.test.ts`;
  - `waiting-work-links.test.ts:90-91`, `notification-center.test.ts:73`, `waiting-work-source.test.ts:202`;
  - `rbac-route-matrix.test.ts`, `e2e-cross-cutting.test.ts`, `mobile-field-navigation*.test.ts`.
- **New E2E, run-marked data on the dev DB only:**
  - **Inbox:** a run-marked request with a photo; the IT head ticks it with another and approves both; the panel moves to the next item; the viewer's own request shows "อนุมัติเองไม่ได้"; reject needs a remark.
  - **Form:** sending without a photo shows the error; with a JPG it goes through.
  - **Round:** IT staff select 2 approved run-marked requests and create a sale round with a lump price; the round page lists both; the report downloads an `.xlsx` whose sheet has 2 rows and 2 images (read with exceljs in the test).
  - **Refusals and method:** a machine the user approved is shown as blocked; two machines asked as บริจาค and จำหน่าย join one ขาย round, and both requests read ขาย afterwards.
- **Run cadence:** targeted specs per plan; the whole suite once at the end of the group (memory: e2e-run-cadence).

## 16. Build order (one plan each)

| # | Plan | Covers | Depends on |
|---|---|---|---|
| 1 | **Rules and server** | the "has a photo" helper and image-only rules; HEIC refusal; the last-photo guard; approve without `nextStatusId`; the guarded reject; the SoD reason codes; `disposal:approve` viewing disposal files; the source helper (MT-/AUD-); Bangkok-day aging; inbox query rework (all pending, paging, search, overdue, names, block codes, `?item=` hrefs); messages and glossary rows | decisions 2, 3, 8 |
| 2 | **งานรออนุมัติ (AP, AP-Phone)** | §7: header, strip, tabs, queue, selection bar (moving the bulk provider), the three panels with the extracted findings loader, phone, work center links | 1 |
| 3 | **Form and request page (DP-New, DP-Request, -Phone)** | §8, §9.1–9.3, §9.5–9.6, the batch form's photo rule | 1 |
| 4 | **Queue and rounds** | migration on dev; round service and APIs; §9.4 retirement; §10; §11 pages; the accounting Excel; §12; then the whole suite and the look step in both themes | 1, 3; decisions 4–7 |

## Appendix A. What the boards leave out, and stays (binding)
- **The approvals history page** (`/admin/approvals/history`) and its filters.
- **The policy and approver-matrix content:** behind the disclosure, not deleted.
- **The findings page's own decision panel and its bulk approve and reject.**
- **Request batches:**
  - creating a batch;
  - its history list;
  - its page;
  - its shared evidence.
- **The disposal print pages:** request and final document.
- **The queue's Excel export.**
- **Uploading evidence while pending:** for create and approve.
- **The asset page's links into disposal**, and `?assetId=` prefill from the repair page.
- **Readiness blockers** on the asset picker.
- **The bell, digest and dashboard counts.**

## Appendix B. Board elements replaced or dropped
- **AP:**
  - 10 rows per page → 25/50/100;
  - the phone's "+5" → "+10";
  - the fixed "ใช้งานอยู่" on reject → the real previous status;
  - the finding sub-type "ส่วนควบ" is a board artefact (not one of the six types);
  - the round row's tick is dropped.
- **DP-Queue:**
  - ticks and bulk approve in the pending tab → the inbox link;
  - the status words "อนุมัติแล้ว" / "ปฏิเสธ" → today's words (§5).
- **DP-Request:**
  - "ขั้นที่ 3 ตัดจำหน่ายจริง" → "บันทึกในรอบตัดจำหน่าย";
  - the per-request execution form → the round.
- **DP-New:**
  - "ขอตัดจำหน่าย" → "ยื่นคำขอตัดจำหน่าย";
  - the evidence section "ไม่บังคับตอนขอ" → the required photo.
- **DP-Batch / DP-Batches / DP-Batch-New:**
  - used as the look of the round pages; the request-batch pages keep today's design;
  - DP-Batch's progress card, 5-cell strip and "บันทึกตัดจำหน่าย 1 รายการที่รออยู่" do not apply to a round.
