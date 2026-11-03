# Page group 5 (maintenance): design

**Status:** draft for the user's approval (2026-11-03)
**Base:** `master` at `cc8f7887`. Page groups 1 to 4 are merged and pushed; nothing is deployed.
**Order of the remaining work:** this group → the other page groups of the canvas → the "ยืนยันผลตรวจ" feature (last, user 2026-10-29) → ของใช้สิ้นเปลือง (after everything) → E2E → UAT → the one Production deploy.
**Visual source:** the design canvas https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p, variant B, boards MT-List, MT-Detail, MT-Detail-Phone, MT-New, MT-PM and MT-PM-Form. Where this document and a board differ, this document wins. The boards predate three rules that bind here: the condition after repair (group 3 §19.4), the return into ส่งซ่อม under an open repair (S-R43, S-R48) and decisions 1 to 10 below. The boards' own assumptions are in `.impeccable/critique/2026-10-20-canvas-assumptions.md` (section "ซ่อมบำรุง" and the MT-New / MT-PM-Form parts of "ฟอร์มและรายการที่เหลือ").
**Recon:** six readers compared each board with today's code and a seventh checked them (2026-11-03). Their notes, with file:line, are in the session scratchpad `g5/recon/` (r-list.md, r-detail.md, r-new.md, r-pm.md, r-model.md, r-debt.md, critic.md). Where the critic corrects a reader, the critic wins. The critic's open point U7 is settled: with an open repair a return must go to ส่งซ่อม under that repair, any other next status is refused, and the return clears the holder (`src/app/api/assets/[id]/checkin/route.ts:96-107, 143-148, 262, 315`).

*My call* marks a choice the user did not make. Each one is listed again in §14 for the user to check.

## 1. Intent

Maintenance is where IT records what broke, sends it out, and closes it when it comes back; PM plans remind IT of the checks that come round every month, quarter or year.

- **The list (MT-List)** mixes three jobs today: the history of every repair, the assets stuck in a repair status with no record, and the PM plans that are due. The two work boxes list up to 20 rows each above the history, the table has 9 columns and scrolls at 1440, and nothing says how many repairs are still open.
- **The record (MT-Detail)** does not say what happens next. Pressing ซ่อมเสร็จ pre-picks ใช้งานได้, a red ยกเลิกบันทึก sits beside the primary, the history reads newest first with no actor, and the phone's main button opens the asset page instead of finishing the repair.
- **The new record (MT-New)** pre-picks "ซ่อมเสร็จแล้ว · ใช้งานได้", so one careless save changes the asset's status. It shows no asset facts, and it says that ซ่อมไม่ได้ is refused for a handed-over asset only after the save, worded as a loan.
- **The PM page (MT-PM)** is one list of every state with four buttons per row, no tabs, no search and no counts, and its "ใกล้ถึงกำหนด" (14 days, server time) disagrees with the list's box and the bell (7 days, Bangkok time).
- **The PM form (MT-PM-Form)** does not say what an edit changes, and a PM visit recorded while the form is open is overwritten by the old date.

## 2. Decisions the user made (2026-11-03)

| # | Decision |
|---|---|
| 1 | **ซ่อมไม่ได้ on an asset with an open handover (HO-) stays refused (ก), but the page says so as soon as ซ่อมไม่ได้ is chosen**: "อยู่กับ <holder> ตามใบส่งมอบ <HO-> ต้องรับคืนก่อน", with a link to รับคืน prefilled with the asset. A return of an asset with an open repair goes into ส่งซ่อม under that repair and clears the holder, so ซ่อมไม่ได้ then works. |
| 2 | **No default answer on "ซ่อมเสร็จหรือยัง" and "ผลการซ่อม"**, on the new form and in the ซ่อมเสร็จ dialog (ข), **except** that "บันทึกว่าทำแล้ว" from a PM plan pre-picks "ซ่อมเสร็จแล้ว"; the outcome is still chosen there. The condition rule stays as group 3 §19.4. |
| 3 | **A PM plan moves to its next round only when the record is done** (ข): a record created already done moves it from the record date; a record finished later with ซ่อมเสร็จ moves it from the completion date. A record created not done, and a cancel, do not touch the plan. |
| 4 | **Two due-soon windows, each labelled with its days on screen** (ก): 7 days for the reminders (the list's box "ครบกำหนดใน 7 วัน", the bell, the digest) and 14 days on the PM page ("ใกล้ถึงกำหนด · ภายใน 14 วัน"). All counts use Bangkok days and one scope *(my call, accepted with the decision)*. |
| 5 | **One overdue word, "เกินกำหนด", across the whole app** (ก), dashboard and audit included, with a glossary row; `tests/thai-glossary.test.ts` forbids "เลยกำหนด". |
| 6 | **The list's "ต้องจัดการ" strip and two cards, as proposed:** 3 rows per card; the stuck card's "ดูทั้งหมด" opens the same card in full on the same page (`?stuck=all#stuck`); the PM card's "ดูทั้งหมด" goes to `/maintenance/pm?due=overdue`; the four strip cells are links (ยังซ่อมไม่เสร็จ → `?status=in_progress`, ค้างสถานะ → `#stuck`, the PM cells → the PM page's due filters); the bell and work-center links (`#stuck`, `#pm-due`, `?status=in_progress`) keep working; no tinted tiles (the attention foot line instead). |
| 7 | **The cost total is the sum of the whole filtered list** (ก), "ค่าใช้จ่ายรวม N รายการ" (status, search, date range, asset), cancelled records left out, open records counted with the cost already typed (§11.3, my call after the builder check); the status chip counts follow the same filters. |
| 8 | **Way back** (ก): the repair and PM forms also accept the asset page (`/assets/<id>?view=maintenance`) and the PM list as `returnTo`. ส่งมอบ and the scan page stay out (group 3's call). |
| 9 | **After ซ่อมไม่ได้:** (i) "ยื่นคำขอตัดจำหน่าย" shows at once as the next step (with `disposal:create`), not only past 3 repairs or 50% of the price; (ii) the holder is kept while the asset is รอตัดจำหน่าย: group 5 writes no holder. |
| 10 | **Small items, all as proposed:** (10.1) the ended tab's "จบแผนเมื่อ" is the plan's `updatedAt` (no migration); (10.2) a plan title links to its edit page (active and paused), an ended plan's title is plain text, no read-only plan page yet; (10.3) **no expected-pickup date field**: the user found the board's "ศูนย์นัดรับเครื่อง 21 ต.ค." odd; หมายเหตุ shows only what IT typed, and the future step of the history reads "ซ่อมเสร็จ · ยังไม่ถึง" with no date and no generated sentence (a วันนัดรับคืน field, with a migration, can come later); (10.4) a PM plan may be set up for an asset under repair; only Disposed and Retired assets are blocked, and the server refuses them too; (10.5) statuses outside พร้อมใช้งาน, ใช้งานอยู่ and รอซ่อม are still refused for "ยังซ่อมไม่เสร็จ" (the ยืนยันผลตรวจ feature handles them later); (10.6) no clean-up of the E2E PM plans on the dev DB, and the look step judges layout only; (10.7) "ส่งซ่อมมา N วัน" for a record with a vendor, "ซ่อมมา N วัน" without one; (10.8) pages without a phone board follow the shared patterns (DataTable phone cards, `OperationFormFrame` with the summary on the phone). |
| 11 | **"ยังซ่อมไม่เสร็จ" on an อยู่ระหว่างซ่อม asset with no open record is allowed** (ก, after the builder check): the status stays อยู่ระหว่างซ่อม and an open record is created, so the stuck card can record a repair that is still at the shop. อยู่ระหว่างตรวจสอบ and every other status outside พร้อมใช้งาน / ใช้งานอยู่ / รอซ่อม / อยู่ระหว่างซ่อม stay refused (10.5). |

## 3. Goals

1. Before any save that changes an asset's status, the page shows the status now and after, computed from the same rule the server applies, and refuses early what the server would refuse.
2. Nobody changes an asset's status by leaving a pre-picked answer (decision 2).
3. One due rule: every PM count and badge uses Bangkok days and one scope; each window says its days; one overdue word (decisions 4, 5).
4. A PM plan's next date moves only when the visit is really done (decision 3), and an edit cannot overwrite a visit recorded meanwhile.
5. The list says, in one strip, how much maintenance work is waiting and opens each part; every link that reaches the list today still lands.
6. The five pages match their boards in both themes, with the phone patterns of §5, and nothing the pages do today is lost (Appendix A, binding).

## 4. Non-goals and anti-goals

- **Non-goals:**
  - No expected-pickup date, no PM checklist, no plan history page, no labour/parts cost split (decision 10.3, 10.2).
  - No change to how รับคืน creates or joins a repair record (group 3 decision 4; the check-in route stays the second writer of repair records, `src/app/api/assets/[id]/checkin/route.ts:332-345`).
  - No holder, room or department write by any repair action (decision 9 ii).
  - No change to the disposal flow; the disposal page's own `returnTo` stays `/disposal` only.
  - No change to the print route `/maintenance/[id]/print` beyond the words of §13; new detail facts (day count, timeline) do not reach the print sheet *(my call)*.
- **No schema change and no migration.** "จบแผนเมื่อ" reads `updatedAt`; the cancel reason is read from the existing `maintenance_cancel` movement; attachment types stay the file-name prefix.
- **Anti-goals:**
  - A "หลังบันทึก" or "หลังกดซ่อมเสร็จ" value that the server does not write, or a refusal the page did not warn about.
  - A count whose link opens a list of a different size.
  - A pre-picked answer that changes an asset's status.
  - A PM plan that moves forward for a visit that never finished.

## 5. Rules that bind every page

- **Parts and look:** the shared parts and tokens only (DESIGN.md): `PageHeader`, `ContentPanel`, `FormSection`, `OperationFormFrame`, `OperationSummaryCard`, `AssetConditionChoice`, `ChoiceCard`, `Segmented`, `StatStrip` (`href`, `current`, `attention`, `filterNote`), `TabNav`, `SearchField`, `FilterMenuChip`, `FilterChipList`, `DataTable`, `ClickableTableRow`, `DataTableFoot`, `Pagination`, `RowActions`, `DropdownMenu`, `ActionBar`, `StatusBadge`, `KeyValueList`, `Notice`, `FileDropzone`, `AttachmentPreviewDialog`, `ActionEmptyState`, `Nil`. No hex or rgba in tsx, no `dark:`, no `/NN` tints; both themes from the tokens; the print sheet stays light. Board fills that DESIGN.md forbids are replaced (Appendix B): state color lives only in badges (`DESIGN.md:290`), a cell that needs action takes `attention` (`DESIGN.md:486`), no dashed borders (the dashed-border guard).
- **Pickers keep "code - name"** (group 3 §5, group 4 §5); rows, cards and results show the name first with the code under it.
- **Bangkok days, one scope** (decision 4): every PM due count, badge and day count compares Bangkok date keys (`getBangkokDateKey`, `startOfBangkokDay`, `bangkokDayDiff`; `src/lib/preventive-maintenance.ts:48-52`, `src/lib/waiting-work-rules.ts:44-53`), never server-local midnight (today `src/lib/preventive-maintenance.ts:65-73, 132-136`). One scope for every PM count: plan `isActive` and `planState = "active"`, asset `isActive` and its status not Disposed or Retired (today's reminder where, `src/lib/preventive-maintenance.ts:54-63`). One helper returns, for that scope and a day: overdue, due within 7 days (not overdue), due within 14 days (not overdue), later, and the earliest `nextDueDate` of each; the list, the PM page, the asset tab and waiting work all read it. The repair list's date filter moves to Bangkok days too (today server-local, `src/lib/maintenance-query.ts:97-130`).
- **Two windows, each labelled** (decision 4):
  - **Reminder, 7 days:** due day ≤ today + 7 (overdue included), as `buildDuePmPlanWhere` today. Shown as "ครบกำหนดใน 7 วัน" on the list's cell and card, and as "PM ครบกำหนดใน 7 วัน" in the bell, digest and work center.
  - **PM page, 14 days:** overdue = due day < today; ใกล้ถึงกำหนด = today ≤ due day ≤ today + 14; รอบถัดไป = later. Shown as "ใกล้ถึงกำหนด · ภายใน 14 วัน" (cell foot) and "ไกลกว่า 14 วัน".
- **"เกินกำหนด" everywhere** (decision 5), with "เกินกำหนด N วัน" for a day count; §13 lists every key that changes; the glossary gains the row and the glossary test the pattern `/เลยกำหนด/`.
- **PM advance only on done** (decision 3): `createRepairRecord` calls `advancePlan` only when `done` (from the record date); `completeRepairRecord` calls it when the record has a plan (from the completion date). Cancel never touches the plan (today `src/lib/repair-record-service.ts:109, 114-149, 336-349`).
  - **The plan check stays on every create:** a `maintenancePlanId` must be an active plan of the same asset whether or not the record is done, still 409 `MAINTENANCE_PLAN_INVALID_TRANSITION` (today that check lives only inside `advancePlan`, `:336-341`, which a not-done create no longer calls).
  - **ซ่อมเสร็จ never fails on the plan** *(my call after the builder check)*: when the record's plan was paused or ended while the repair was open, ซ่อมเสร็จ closes the record and leaves the plan as it is (no 409; today `advancePlan` would throw and block the close). An active plan moves from the completion date.
- **No default answer** (decision 2): the done question and the outcome start empty on MT-New and in the complete dialog, with a required error under each. The only pre-pick is "ซ่อมเสร็จแล้ว" on the PM path (`?planId=`). The create API stops defaulting the outcome: with `done` it requires `outcome` *(my call; today `.default("usable")`, `src/lib/validations/maintenance.ts:68`)*.
- **ยังซ่อมไม่เสร็จ on อยู่ระหว่างซ่อม** (decision 11): `unfinishedRepairSources` (`src/lib/repair-record-policy.ts:45`) gains "under maintenance"; the effect is no status change (the status line reads "สถานะทรัพย์สินคงเป็น อยู่ระหว่างซ่อม"), so no status movement is written. Cancelling that record later restores the status by the holder, as every cancel does (`getRepairRecordCancelEffect`, `:79-82`) *(my call: the stuck state does not come back after a cancel)*.
- **Condition after repair, unchanged** (group 3 §19.4, `docs/superpowers/specs/2026-10-30-page-group-3-transactions-design.md:364-367`): ใช้งานได้ asks สภาพหลังซ่อม (ดี or พอใช้, required), starting at the asset's condition when that is ดี or พอใช้, else none; ซ่อมไม่ได้ sets ซาก.
- **Way back** (decision 8): the repair new page, the repair detail page (so new → record → back works) and the PM new and edit pages accept as `returnTo`: `/{locale}/maintenance` (with its query and hash), `/{locale}/maintenance/pm` (with its query) and `/{locale}/assets/<id>` (with its query, e.g. `?view=maintenance`); anything else falls back as today (`src/lib/operational-return-navigation.ts:3-11, 16-23`). Links from the asset page and its maintenance tab pass it (§12.1). ส่งมอบ (`src/lib/checkout-form-rules.ts:212-217`) and scan stay out.
- **Early refusal on a held asset** (decision 1): wherever an answer would hit `MAINTENANCE_ASSET_ON_LOAN` (MT-New: ซ่อมไม่ได้ on an asset with an active checkout, or ยังซ่อมไม่เสร็จ on a ถูกยืม asset; the complete dialog and the next-step card: ซ่อมไม่ได้ with an active checkout; `src/lib/repair-record-policy.ts:61-62, 67-69, 76-77`), a warning `Notice` shows under that answer as soon as it is chosen:
  - Text: **"อยู่กับ {holder} ตามใบส่งมอบ {documentNo} ต้องรับคืนก่อน"**, where holder is the checkout's employee, department or room name by its `checkoutType`; with no `documentNo` (a backfilled handover): **"อยู่กับ {holder} ตามใบส่งมอบที่ยังไม่รับคืน ต้องรับคืนก่อน"**.
  - Link **"รับคืน"** to `/{locale}/asset-management/checkin?checkoutId=<id>&returnTo=/{locale}/assets/<assetId>` (`buildAssetRegisterTransactionHref`, `src/lib/asset-operation-policy.ts:24-40`; the check-in page accepts the asset page as `returnTo`, `src/lib/asset-return-navigation.ts:3-18`). It shows only with `asset:edit` (the check-in page's permission, `asset-management/checkin/page.tsx:24`); without it the text stands alone.
  - The save button stays enabled; the server still refuses, and its message is the reworded one below.
- **The ON_LOAN message covers assignments too:** `maintenancePage.errors.MAINTENANCE_ASSET_ON_LOAN` and `apiErrors.maintenanceAssetOnLoan` read **"ทรัพย์สินนี้มีใบส่งมอบที่ยังไม่รับคืน ต้องรับคืนก่อน"** (today "…ถูกยืมอยู่…", `messages/th.json:3355, 5058`), English "This asset has a handover that is not returned yet. Record the return first."
- **After ซ่อมไม่ได้** (decision 9): a closed record with outcome ซ่อมไม่ได้, whose asset is รอตัดจำหน่าย and has no open disposal request, shows "ยื่นคำขอตัดจำหน่าย" as its next step with `disposal:create` (the link of today, `maintenance/[id]/page.tsx:115-119`); an open request (`requestStatus` pending or approved, as `src/lib/asset-detail-frame.ts:45-48`) shows "มีคำขอตัดจำหน่าย {disposalNo} แล้ว" with a link to it instead. The holder is not written (§4).
- **Dates:** a repair date (MT-New) and a completion date (complete dialog) cannot be later than Bangkok today, on the client and the server *(my call, as รับคืน, group 3 §8.3)*. Buddhist year in Thai.
- **Words:** `docs/19_THAI_GLOSSARY.md`; messages only through `node scripts/messages-edit.mjs`, Thai and English; the glossary rows of §15.1 are added before the words are used. "บันทึก" (not "ใบงาน") names a repair record on these pages.
- **Stable hooks:** the ids E2E uses stay (`#repair-record-asset`, `#repair-record-asset-value`, `#repair-record-problem`, `#repair-record-date`, `#maintenance-plan-title(-error)`, `#maintenance-plan-frequency` (now on the `Segmented` group), `#maintenance-plan-next-due-date`, `section#stuck`, `section#pm-due`), unless §16 lists the change.
- **Guards:** each source-reading test that pins a changed file is rewritten in the same task (`tests/maintenance-sweep-ui.test.ts`, `repair-record-list-ui`, `repair-record-detail-ui`, `repair-record-ui`, `pm-plans-ui`, `maintenance-attachments-ui`, `maintenance-pagination-ui`, `waiting-work-links`, `form-frames-ui`, `operational-return-navigation`); `/th/maintenance/new`, `/th/maintenance/pm/new` and `/th/maintenance/pm/<id>/edit` join `STICKY_FOOTER_ROUTES` (`tests/form-migration-guards.test.ts:70-78`); they are already focus-task routes (`src/lib/mobile-field-navigation.ts:22, 27`).

## 6. Permissions

As today unless the table says otherwise (`docs/06_WORKFLOWS.md:228`). Roles: **viewer** (`maintenance:view`), **create-only** (view + create), **edit** (view + create + edit), plus `disposal:create`, `maintenance:export` and `asset:edit` where named.

| Page | Action | Needs | Viewer | Create-only |
|---|---|---|---|---|
| MT-List | the page, the strip, both cards, the table, "ดูทั้งหมด" | view | sees | sees |
| MT-List | header "บันทึกซ่อม", the stuck row's "บันทึกซ่อม", the PM row's "บันทึกว่าทำแล้ว" | create | hidden | shown |
| MT-List | header "จัดการแผน PM" | view (the PM page is a view page) | shown | shown |
| MT-List | ส่งออก Excel | export | hidden | hidden |
| MT-Detail | the page, print, "เปิดหน้าทรัพย์สิน", "ประวัติซ่อมทั้งหมด…" | view | sees | sees |
| MT-Detail | ซ่อมเสร็จ (header, card, phone bar) | edit | hidden | hidden; the card shows "ผู้มีสิทธิ์แก้ไขบันทึกซ่อมเป็นผู้กดซ่อมเสร็จ" |
| MT-Detail | "อื่น ๆ": แก้ไขรายละเอียด, ยกเลิกบันทึก | edit | menu hidden | menu hidden |
| MT-Detail | upload a file | edit, or create on own record (`src/lib/repair-record-policy.ts:96-101`) | hidden | own record only |
| MT-Detail | delete a file | edit | hidden | hidden; the notice of §8.5 |
| MT-Detail | "รับคืน" in the refusal | `asset:edit` | text only | as their `asset:edit` |
| MT-Detail | "ยื่นคำขอตัดจำหน่าย" (next step and the review panel) | `disposal:create` | hidden; "ผู้มีสิทธิ์ยื่นคำขอตัดจำหน่ายเป็นผู้ยื่นต่อ" | same |
| MT-New | the page and the save | create | refused (page) | allowed |
| MT-PM | the page, tabs, cells, search | view | sees | sees |
| MT-PM | "เพิ่มแผน PM", "บันทึกว่าทำแล้ว" | create | hidden | shown |
| MT-PM | ⋯ (แก้ไข, พักแผน, เปิดใช้งานต่อ, จบแผน), the title link and the row click to the edit page | edit | no ⋯, plain title | no ⋯, plain title |
| MT-PM-Form | create / edit | create / edit | refused (page) | create only |

## 7. บันทึกซ่อม (MT-New)

### 7.1 Frame
- `OperationFormFrame` (as ส่งมอบ) with an optional `breadcrumbs` prop added *(my call: the board and today's page have one; the frame has none, `src/components/asset-operations/operation-form-frame.tsx:9-27`)*: ซ่อมบำรุง › บันทึกซ่อม; the back link stays.
- H1 "บันทึกซ่อม"; subtitle "บันทึกว่าซ่อมอะไร เมื่อไหร่ และผลเป็นอย่างไร เมื่อบันทึกแล้วระบบจะออกเลขที่บันทึกให้" (PM path: today's `pmCreateSubtitle`).
- Footer: "บันทึกซ่อม **<name>** <tag> · <answer>" (answer: ยังซ่อมไม่เสร็จ / ซ่อมเสร็จแล้ว · <outcome> / ยังไม่ได้เลือกว่าซ่อมเสร็จหรือยัง), ยกเลิก (link to `returnTo`), primary **"บันทึกซ่อม"**. No review dialog (the board saves directly).
- Phone: one column, the summary below the sections (`summaryOnPhone`), the footer line above the buttons (decision 10.8).

### 7.2 Section 1 "ทรัพย์สินที่ซ่อม"
- Before a pick: today's `MaintenanceOptionSelect` (searchable, "code - name (status)", rows disabled with their reason, `src/lib/maintenance-options.ts:75-88`); it no longer searches again after a pick *(my call; the E2E waits of `965e58df` / `800a2969` then go)*.
- After a pick (or `?assetId=`, `?planId=`): a card with the register photo (group 3 §19.5) or its empty frame, the name, the tag, the status badge, and "ผู้ถือครอง <name> · <แผนก> · <room> · <branch>" ("ไม่มีผู้ถือครอง" when none); "เปลี่ยน" reopens the picker (hidden on the PM path, where the asset is fixed).
- **The eligibility line**, computed on load and on pick from the asset facts (status, ownership type, holder, active checkout with its document, open record):
  - "ไม่มีบันทึกซ่อมที่ยังไม่เสร็จ บันทึกใหม่ได้";
  - an open record: "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}" with "เปิดบันทึกที่ยังไม่เสร็จ" to that record *(my call: today the list `?assetId=&status=in_progress`, `repair-record-form.tsx:239`; the list URL stays valid)*; the save is refused as today;
  - Disposed or Retired: "ตัดจำหน่ายหรือปลดระวางแล้ว บันทึกซ่อมไม่ได้".
- The facts come from one server read used by the page load and by the picker's by-id read; the page and the client share one pure "what will happen" helper built on `getRepairRecordCreateEffect` (`src/lib/repair-record-policy.ts:53-73`).
- PM path: the plan banner (`FormContextBanner`, "แผน PM <title> · <planNo>") sits in this section; problem and vendor prefill as today.

### 7.3 Section 2 "อาการและความคืบหน้า"
- วันที่ * (native date input, today by default, not after today), อาการ / สิ่งที่ซ่อม *.
- ผู้บันทึก: the employee picker only for an account without a linked employee, as today (`src/lib/repair-record-service.ts:53-56`).
- **"ซ่อมเสร็จหรือยัง *"** with the faint note "ระบบไม่เลือกไว้ให้" (PM path: "ซ่อมเสร็จแล้ว" pre-picked and no note). Two `ChoiceCard`s, label and line split:
  - "ซ่อมเสร็จแล้ว" · "ต้องเลือกผลการซ่อมต่อ: ใช้งานได้ หรือ ซ่อมไม่ได้ เสนอจำหน่าย";
  - "ยังซ่อมไม่เสร็จ" · "ส่งซ่อม / รออะไหล่ · กด "ซ่อมเสร็จ" ทีหลังที่หน้าบันทึก".
- With ซ่อมเสร็จแล้ว: **"ผลการซ่อม *"** (ใช้งานได้ / ซ่อมไม่ได้ เสนอจำหน่าย, no default), then สภาพหลังซ่อม for ใช้งานได้ (§5) or "สภาพของทรัพย์สินจะเปลี่ยนเป็น ซาก" for ซ่อมไม่ได้.
- **Status line** under the answers, from the helper: "สถานะทรัพย์สิน: <badge now> → <badge after> จนกว่าจะกดซ่อมเสร็จ" (not done), "→ <after>" (done), "สถานะทรัพย์สินคงเป็น <now>" (done, usable, no change). Plain text with badges; a refusal replaces it with a warning `Notice`: the early refusal of §5 (on MT-New it adds "ตอนรับคืนเลือก ส่งซ่อม ระบบจะเปิดบันทึกซ่อมให้ แล้วกดซ่อมเสร็จที่บันทึกนั้น" *(my call)*), or, for ยังซ่อมไม่เสร็จ on a status outside พร้อมใช้งาน / ใช้งานอยู่ / รอซ่อม / อยู่ระหว่างซ่อม, "สถานะ <status> บันทึกว่ายังซ่อมไม่เสร็จไม่ได้" (decisions 10.5, 11).

### 7.4 Section 3 "รายละเอียดเพิ่มเติม" · ไม่บังคับ
- Open, a plain `FormSection` as on the board *(my call; today a toggle button)*: ร้าน / ผู้ซ่อมภายนอก (supplier picker, "code - name"), ค่าใช้จ่ายรวม (บาท) (placeholder "ใส่ตอนซ่อมเสร็จได้"), เลขใบเสร็จ / ใบกำกับภาษี (placeholder "ยังไม่มี"), รูปหรือใบเสร็จ (several files, images and PDF), หมายเหตุ.
- File hint: "ระบบจะอัปโหลดหลังบันทึก · ตอนยังไม่เสร็จนับเป็นรูปก่อนซ่อม" (not done) or "· นับเป็นรูปหลังซ่อม" (done); PDFs as today (`src/lib/repair-record-upload.ts:12`).

### 7.5 Summary "สรุปก่อนบันทึก"
- `OperationSummaryCard`, asset line with the photo. Rows ตอนนี้ → หลังบันทึก, only what the save writes:
  - สถานะทรัพย์สิน (after: from the helper; before the done answer "ขึ้นกับคำตอบ ซ่อมเสร็จหรือยัง");
  - ผู้ถือครอง → "ไม่เปลี่ยน";
  - บันทึกการซ่อม: "ไม่มีที่ค้าง" → "ยังซ่อมไม่เสร็จ" / "ซ่อมเสร็จแล้ว";
  - สภาพ (done only) → ดี / พอใช้ / ซาก;
  - แผน PM (PM path): "ครั้งถัดไป <date>" → the next date when done, "ไม่เลื่อน จนกว่าจะกดซ่อมเสร็จ" when not done (decision 3).
- "ถ้าตอบว่าซ่อมเสร็จแล้ว" (while unanswered or not done): "ใช้งานได้ → <status>" and "ซ่อมไม่ได้ เสนอจำหน่าย → รอตัดจำหน่าย" or the early refusal text.
- Checklist: ทรัพย์สิน · วันที่และอาการ · ซ่อมเสร็จหรือยัง · ผลการซ่อม (done) · สภาพหลังซ่อม (usable).
- Footnote: "ผู้บันทึกคือ <employee> ตามบัญชีที่ล็อกอิน · เลขที่บันทึก MT-… ออกให้หลังบันทึก" (with the picker: "ผู้บันทึกตามที่เลือกในส่วนที่ 2").

### 7.6 Save
- As today: POST, then files one by one, then the record page with `returnTo`; a failed upload keeps today's toast and lands on the record (`repair-record-form.tsx:175-203`).
- The server applies decision 3 and the date rule; nothing else changes in `createRepairRecord`.

## 8. The repair record (MT-Detail, MT-Detail-Phone)

### 8.1 Header
- Trail ซ่อมบำรุง › <repairNo>; h1 the asset name; meta: repairNo, status badge, "ทรัพย์สิน <tag>", and "แจ้งซ่อม <date> · ส่งซ่อมมา N วัน" / "· ซ่อมมา N วัน" while open (decision 10.7; N from `repairDays`, `src/lib/asset-repair-rules.ts:31-35`; N = 0 reads "ส่งซ่อมวันนี้" / "ซ่อมวันนี้"), "ซ่อมเสร็จ <date>" when closed, "ยกเลิก <date>" when cancelled.
- Actions (`md` and up): back, "อื่น ๆ" (`DropdownMenu`: แก้ไขรายละเอียด; separator; ยกเลิกบันทึก (destructive, open records only)), "พิมพ์", and the primary "ซ่อมเสร็จ" while open. The menu is hidden when empty. The board puts ซ่อมเสร็จ in the card only; it stays in the header too *(my call: the header is where every detail page keeps its next step)*.
- One client wrapper owns the three dialogs (complete, cancel confirm, edit) for the header, the card and the phone bar; dialogs never sit inside the menu (`DESIGN.md:651`; today `src/components/maintenance/repair-record-actions.tsx:104-114, 229-241`).

### 8.2 The next-step card (full width, a plain `ContentPanel` as the audit round's next step)
- **Open record:**
  - Title: `ขั้นถัดไป: เมื่อรับเครื่องคืนจาก <vendor> แล้ว กด "ซ่อมเสร็จ"`; without a vendor `ขั้นถัดไป: เมื่อซ่อมเสร็จแล้ว กด "ซ่อมเสร็จ"`.
  - Line: "ตอนกดจะถามวันที่ซ่อมเสร็จกับผลการซ่อม ระบบไม่เลือกผลไว้ให้ สถานะทรัพย์สินจะเปลี่ยนตามผลที่เลือก".
  - Table ถ้าผลการซ่อมเป็น / สถานะทรัพย์สินตอนนี้ / หลังกดซ่อมเสร็จ, from `getRepairRecordCompleteEffect` with the asset's facts (`src/lib/repair-record-policy.ts:75-81`):
    - ใช้งานได้ → ใช้งานอยู่ "กลับไปที่ <holder> ตามใบส่งมอบ <HO->" (active checkout) / ใช้งานอยู่ "ผู้ถือครอง <holder> คงเดิม" (บุคคล with a holder, no HO-) / พร้อมใช้งาน "ไม่มีผู้ถือครอง" (otherwise; e.g. a repair opened by a return).
    - ซ่อมไม่ได้ เสนอจำหน่าย → รอตัดจำหน่าย "แล้วยื่นคำขอตัดจำหน่ายต่อ" (plus "ผู้ถือครอง <holder> คงเดิม" when a holder stays, decision 9 ii), or the early refusal of §5 with its รับคืน link when a checkout is open.
  - Buttons: ซ่อมเสร็จ (edit), แนบรูปก่อนซ่อม (to `#attachments`, when the person may upload), เปิดหน้าทรัพย์สิน.
  - Create-only: no ซ่อมเสร็จ; the line "ผู้มีสิทธิ์แก้ไขบันทึกซ่อมเป็นผู้กดซ่อมเสร็จ". Viewer: the table and เปิดหน้าทรัพย์สิน only.
- **Closed, ใช้งานได้:** "ซ่อมเสร็จแล้ว <date> · ใช้งานได้" and "สถานะทรัพย์สินตอนนี้ <badge>"; เปิดหน้าทรัพย์สิน.
- **Closed, ซ่อมไม่ได้:** "ขั้นถัดไป: ยื่นคำขอตัดจำหน่าย" with the button (§5, decision 9); an open request or a disposed asset says so instead. The disposal-review panel then hides its own button, so the page never offers the request twice *(my call)*.
- **Closed, no outcome (old record):** "ซ่อมเสร็จแล้ว <date>" with no outcome step. **Cancelled:** "ยกเลิกบันทึกนี้แล้ว <date>" with the reason when one was written.

### 8.3 Details, history, asset
- **รายละเอียดการซ่อม:** `KeyValueList`: วันที่แจ้งซ่อม; ร้าน / ผู้ซ่อมภายนอก (name, code under it; "ช่างภายใน"); ผู้บันทึก (name, code under it); ผลการซ่อม ("รอกดซ่อมเสร็จ" while open, "ไม่ระบุ" on an old closed record, kept); วันที่ซ่อมเสร็จ (closed); ค่าใช้จ่ายรวม (บาท) and เลขใบเสร็จ / ใบกำกับภาษี ("ยังไม่ระบุ" when empty, as `nilLabel`); แผน PM when linked. Then อาการ / สิ่งที่ซ่อม and หมายเหตุ, exactly as typed (decision 10.3). The legacy panel "ข้อมูลจากขั้นตอนเดิม" stays.
- **ประวัติ** ("ลำดับเหตุการณ์ของบันทึกนี้"), oldest first:
  - each movement with its label, date-time and actor (`assetHistoryActorLabel`, `src/lib/asset-history-rules.ts:375`), from → to as `StatusBadge`s for a status, as names for a condition; `condition_change` gets its own label "เปลี่ยนสภาพ" (today "รายการอื่น", `src/lib/movement-labels.ts:22-29`); the reason line only when it is not the problem text (a cancel reason);
  - attachment events from `Attachment.uploadedAt`, grouped by type, uploader and 10 minutes: "แนบ<type> N ไฟล์" *(my call)*;
  - while open, a last hollow step "ซ่อมเสร็จ · ยังไม่ถึง", no date, no sentence (decision 10.3). The board's "รับเครื่องจาก <holder> <room> แล้วส่ง<vendor>" is dropped: the holder and room at record time are not stored.
- **ทรัพย์สิน** card: photo, the name (link to the asset), tag; สถานะปัจจุบัน as a badge; ผู้ถือครอง (name, department under it); ที่ตั้ง (room, branch under it); link **"ประวัติซ่อมทั้งหมดของทรัพย์สินนี้ · N รายการ"** to `/maintenance?assetId=<id>`, N = the asset's active records (`{assetId, isActive}`, the same count as the asset tab, `src/lib/asset-detail-data.ts:40-42`), so it equals the list it opens *(my call: the board's "เครื่องนี้ (1)" counted differently)*.
- **The disposal-review panel** stays, on **one rule**: `summarizeAssetRepairs` (repairs that are not cancelled and not PM visits, `src/lib/asset-repair-rules.ts:49-62`) replaces the page's own count (`maintenance/[id]/page.tsx:77-81`), so the record and the asset tab agree *(my call)*. Its link reads "ยื่นคำขอตัดจำหน่าย".

### 8.4 Dialogs
- **ซ่อมเสร็จ:** as today, but ผลการซ่อม starts empty with a required error "เลือกผลการซ่อม"; ซ่อมไม่ได้ with an open checkout shows the early refusal under the outcome; the completion date cannot be after today; files upload as รูปหลังซ่อม as today.
- **ยกเลิกบันทึก:** today's confirm ("ยกเลิกบันทึกนี้?", optional reason, ไม่ยกเลิก / ยืนยันยกเลิก).
- **แก้ไขรายละเอียด:** as today, on open and closed records; editHelp reworded (§13).
- A 409 `MAINTENANCE_CONFLICT` from any dialog, opened from the header, the card or the phone bar, shows today's message in the dialog.

### 8.5 Attachments ("เอกสารแนบงานซ่อม", `#attachments`)
- Count in the head ("N ไฟล์"); groups by type with small thumbnails (open the preview dialog; PDF and other files as a named tile), download and delete kept in each tile's preview.
- The type select defaults to รูปก่อนซ่อม while open and รูปหลังซ่อม when closed (today always หลังซ่อม, `maintenance-attachments.tsx:52`), with the hint "ตั้งเป็น<type>ไว้ให้ เพราะ<บันทึกยังไม่ซ่อมเสร็จ | ซ่อมเสร็จแล้ว>".
- The drop zone reads "ถ่ายรูปหรือแนบใบเสร็จ"; on the phone it uses `capture="environment"` when the chosen type is a photo type, and none for the others, so a PDF can still be chosen *(my call: the board drops the type select on the phone; it stays)*.
- The notice for a person who can upload but not delete reads "ลบไฟล์ได้เฉพาะผู้มีสิทธิ์แก้ไขบันทึกซ่อม ถ้าแนบผิดให้แจ้งผู้มีสิทธิ์" (today the "ใบงานนี้ปิดแล้ว…" text shows on open records too, `maintenance-attachments.tsx:109`). Empty: "ยังไม่มีไฟล์แนบ".

### 8.6 Phone (MT-Detail-Phone)
- The shared `PageHeader` with its back link (the board's own top bar is not used; DESIGN.md page header rule); the meta row as §8.1.
- The next-step card compact: the title, "สถานะทรัพย์สินตอนนี้ <badge> หลังกดซ่อมเสร็จจะเป็นไปตามผลที่เลือก", one block per outcome; no buttons inside.
- Details with every field (the board's four-field cut is not used: outcome and invoice number stay); asset card; history with short dates; attachments.
- `ActionBar`: `primaryAction` "ซ่อมเสร็จ" (edit, open record) and `more` "เพิ่มเติม": เปิดหน้าทรัพย์สิน, พิมพ์, แก้ไขรายละเอียด, ยกเลิกบันทึก (each by its permission). Without the primary: เปิดหน้าทรัพย์สิน, พิมพ์ and "เพิ่มเติม" as links. Padding `actionBarPagePadding.withPrimary` when the primary shows, else `.single` (`DESIGN.md:797-798`).

## 9. แผนบำรุงรักษาตามรอบ (PM) (MT-PM)

- Header: trail ซ่อมบำรุง › แผนบำรุงรักษาตามรอบ (PM); back link kept; h1; subtitle "ติดตามรอบ PM ของทรัพย์สินสำคัญก่อนกลายเป็นงานซ่อมฉุกเฉิน · ทั้งหมด N แผน"; primary "เพิ่มแผน PM".
- **Tabs** (`TabNav`, `?state=active|paused|ended`, default active) "ใช้งาน N · พักแผน N · จบแผน N", counts by `groupBy planState` (one state per page; `planStatePageSlices` leaves the list; DESIGN.md's list rule is updated). **Search** `?q=` over title, planNo, asset name and tag (`SearchField`, "ค้นหาชื่อแผน ชื่อหรือรหัสทรัพย์สิน"). Paging 25/50/100 as every list.
- **Due cells** (ใช้งาน tab only), `StatStrip` links `?due=`:
  - เกินกำหนด N, foot "นานสุด N วัน", `attention` when N > 0;
  - ใกล้ถึงกำหนด N, foot "ภายใน 14 วัน · ครบ <earliest date>";
  - รอบถัดไป N, foot "ไกลกว่า 14 วัน";
  - the cell in use is `current`; a second click goes back to no filter. The board's fourth dashed cell becomes a `filterNote` line under the strip: "6 + 1 + 1 = 8 แผนที่ใช้งาน".
  - One more value `?due=week` (not overdue, due within 7 days: the list's fourth cell) shows as a removable `FilterChipList` chip "ครบกำหนดใน 7 วัน", so the list's link opens a list of its own size *(my call)*.
- **Scope note:** an active plan whose asset is Disposed, Retired or inactive (left over from paths other than disposal, which ends plans) stays in the ใช้งาน tab with the asset's status badge in place of a due badge and is not counted in the cells; the sum line then adds "· ไม่นับ N แผนของทรัพย์สินที่ตัดจำหน่ายหรือปลดระวางแล้ว" *(my call)*.
- **Table** (`DataTable`): แผน (title, planNo under it) · ทรัพย์สิน (name, tag under it) · ความถี่ (`Chip`) · กำหนด PM ครั้งถัดไป (date, then the badge "เกินกำหนด N วัน" / "ใกล้ถึงกำหนด · อีก N วัน" / "ใกล้ถึงกำหนด · วันนี้" / "รอบถัดไป · อีก N วัน") · ผู้ให้บริการภายนอก (name, code under it, or `Nil`) · the actions.
  - Active: `RowActions`, next step "บันทึกว่าทำแล้ว" (create; `/maintenance/new?planId=…&returnTo=<this page>`), ⋯ แก้ไข · พักแผน · separator · จบแผน (edit).
  - **A plan whose asset has an open repair record** *(my call after the builder check)*: the next step becomes the link "มีบันทึกซ่อมที่ยังไม่เสร็จ <repairNo>" to that record (`/maintenance/<id>?returnTo=<this page>`), shown to anyone who can read the page, because a new record would hit `MAINTENANCE_OPEN_RECORD_EXISTS`. The plan still counts by its due date (เกินกำหนด stays เกินกำหนด until the record is done, decision 3). The open records are read once for the page by asset.
  - Paused: no due badge (the date only); ⋯ แก้ไข · เปิดใช้งานต่อ · จบแผน.
  - Ended: the due column reads "จบแผนเมื่อ <updatedAt date>" (decision 10.1); no actions; sorted newest ended first *(my call)*.
  - Pause, resume and end keep their confirm dialogs (จบแผน "ถาวร · มีให้ยืนยัน"), opened from ⋯ through a wrapper with an `open()` handle (`DESIGN.md:651`; today inline, `src/components/maintenance/maintenance-plan-state-actions.tsx:51-56`).
  - The title links to the edit page for active and paused plans with edit; plain otherwise (decision 10.2); the row click follows the same rule.
- Foot: "แสดง a–b จาก N · เรียงจากกำหนดที่ถึงก่อน" (ended: "· เรียงจากที่จบแผนล่าสุด") and "“–” คือช่างภายในทำเอง ไม่มีผู้ให้บริการภายนอก".
- Empty states: no plans ("ยังไม่มีแผน PM" with เพิ่มแผน PM), an empty tab ("ไม่มีแผนที่พักไว้" / "ยังไม่มีแผนที่จบแล้ว"), no match ("ไม่พบแผนที่ตรงกับการค้นหาหรือตัวกรอง").
- Phone: DataTable phone cards (decision 10.8): title, planNo, "<asset name> · <tag>", the date and badge, "บันทึกว่าทำแล้ว" and ⋯; the cells two per row; the page keeps the bottom navigation.

## 10. PM form (MT-PM-Form, edit and create)

- `OperationFormFrame` with breadcrumbs, three `FormSection`s, the summary, and the sticky footer.
- **Edit header:** trail ซ่อมบำรุง › แผนบำรุงรักษาตามรอบ (PM) › แก้ไขแผน PM; h1 "แก้ไขแผน PM · <title>"; meta planNo, plan-state badge, "<frequency> · เดิมกำหนด <date>", "พักแผนหรือจบแผนทำจากเมนู ⋯ ในหน้ารายการแผน". An ended plan is still 404 (`pm/[id]/edit/page.tsx:24-27`). **Create header:** trail ซ่อมบำรุง › แผนบำรุงรักษาตามรอบ (PM) › เพิ่มแผน PM; h1 "เพิ่มแผน PM".
- **1 "ทรัพย์สินของแผน":** edit: a locked card (photo, name, tag, status badge, "<room> · <branch>", "แก้ไขไม่ได้" with the lock) and "ถ้าจะใช้แผนนี้กับทรัพย์สินอื่น ให้จบแผนนี้แล้วเพิ่มแผนใหม่". Create: a picker from new PM asset options that disable only written-off and inactive assets (decision 10.4; today the repair options also block an open repair, `src/lib/maintenance-options.ts:80-81`), then the same card; `?assetId=` preselects.
- **2 "รายละเอียดแผน":** ชื่อแผน *, ผู้ให้บริการภายนอก (ไม่บังคับ, "code - name"), รายละเอียดแผน.
- **3 "รอบและกำหนด":** ความถี่ * as `Segmented` รายเดือน / รายไตรมาส / รายปี / กำหนดเอง; for กำหนดเอง "รอบทุกกี่วัน" with "ใส่จำนวนวันต่อรอบได้ 1–3,650 วัน"; กำหนด PM ครั้งถัดไป *; then the preview "กำหนดรอบถัดไป · ถ้าบันทึกว่าทำแล้วตรงวันทุกรอบ": four dates chained through `calculateNextMaintenanceDueDate` (so the month clamp shows as it will happen, `src/lib/preventive-maintenance.ts:20-44`), the first with its due badge, the others "+1 เดือน" / "+3 เดือน" / "+1 ปี" / "+N วัน"; note "ระบบนับรอบถัดไปจากวันที่บันทึกว่าทำแล้วจริง ถ้าทำช้าหรือเร็วกว่ากำหนด วันรอบต่อไปจะเลื่อนตาม".
- **Changed fields (edit):** "เดิม <value> · แก้แล้ว" and "คืนค่าเดิม", from group 4's changed-field part lifted into a shared part (`src/components/assets/asset-form-changed-field.tsx`) *(my call)*.
- **Summary:** edit "สรุปก่อนบันทึก · แก้ N ช่อง", rows ก่อนแก้ → หลังแก้: ชื่อแผน, กำหนดครั้งถัดไป, สถานะกำหนด (badges), ความถี่, ผู้ให้บริการ ("ไม่เปลี่ยน" when unchanged). Create: rows ทรัพย์สิน, ความถี่, กำหนดครั้งถัดไป with its badge. Then "ผลต่อหน้าแผน PM (ใช้งาน N แผน)": เกินกำหนด / ใกล้ถึงกำหนด / รอบถัดไป, old → new (the server passes the three counts; the client moves this plan), and one line: "อยู่ในกล่อง PM ครบกำหนดใน 7 วันของหน้าซ่อมบำรุง" or "ไม่อยู่ในกล่อง PM ครบกำหนดใน 7 วันของหน้าซ่อมบำรุง". For a paused plan the block reads "แผนพักอยู่ ไม่นับในหน้าแผน PM".
- **Footer:** edit "แก้ไขแผน <title> <planNo> · แก้ N ช่อง", "ยกเลิกการแก้ไข", "บันทึกการแก้ไข"; create "เพิ่มแผน PM <title> · <asset>", "ยกเลิก", "บันทึก". After saving, today's toasts and the `returnTo` (§5).
- **Server:** POST refuses a Disposed or Retired asset with a new catalogued `MAINTENANCE_PLAN_ASSET_WRITTEN_OFF` ("ทรัพย์สินนี้ตัดจำหน่ายหรือปลดระวางแล้ว ตั้งแผน PM ไม่ได้") (today `src/app/api/maintenance-plans/route.ts:45-49`); planNo takes the Bangkok day and a unique retry (today server-local, no retry, `:90-105`) *(my call)*; the update action carries `expectedUpdatedAt` and a stale save is a 409 `MAINTENANCE_PLAN_CONFLICT` "แผนนี้ถูกแก้ไขหรือบันทึกว่าทำแล้วระหว่างที่เปิดหน้านี้ โหลดหน้าใหม่แล้วแก้อีกครั้ง" (today none, `src/lib/validations/maintenance.ts:23-31`) *(my call)*.
- Phone: one column, the summary below the sections, the preview two per row.

## 11. The maintenance list (MT-List)

### 11.1 Header and strip
- H1 "ซ่อมบำรุง"; subtitle "ประวัติการซ่อมของทรัพย์สินทุกชิ้น และงานที่ต้องจัดการต่อ"; secondary "จัดการแผน PM" (moves out of the PM box), primary "บันทึกซ่อม".
- **"ต้องจัดการ N เรื่อง"** with "4 + 9 + 6 + 1" in the `filterNote` style; at 0 "ไม่มีงานที่ต้องจัดการ". `StatStrip`, four link cells (decision 6):
  - **ยังซ่อมไม่เสร็จ** N (`openRepairRecordWhere`, the bell's `openRepairs`) → `?status=in_progress`; foot "นานสุด N วัน" *(my call: the board's "บันทึกที่รอรับเครื่องคืน" is wrong for internal repairs)*.
  - **ค้างสถานะซ่อมไม่มีบันทึก** N (`stuckRepairsWhere`, `src/lib/waiting-work-rules.ts:91-95`) → `#stuck`; foot "สถานะกับประวัติยังไม่ตรงกัน"; `attention` when N > 0.
  - **PM เกินกำหนด** N → `/maintenance/pm?due=overdue`; foot "นานสุด N วัน"; `attention` when N > 0.
  - **PM ครบกำหนดใน 7 วัน** N (not overdue) → `/maintenance/pm?due=week`; foot "ครบกำหนด <earliest date>" or "ไม่มีแผนที่ครบกำหนด".
  - Cells are links with `current` (the open-repairs cell when `status=in_progress`), not the board's `aria-pressed` toggles, so the bell's links and the back button keep working *(my call)*. Viewers see the strip.

### 11.2 The two cards (half width each from `lg`, stacked below)
- **`section#stuck` "ทรัพย์สินค้างสถานะซ่อมแต่ไม่มีบันทึก"**, badge "N ชิ้น", the warning line "บันทึกการซ่อมให้ชิ้นเหล่านี้ เพื่อให้สถานะกับประวัติตรงกัน"; 3 rows: the name (link to the asset), "tag · room" (the status name goes); outline "บันทึกซ่อม" (create; `/maintenance/new?assetId=…&returnTo=`). Foot "แสดง 3 จาก N" and "ดูทั้งหมด N ชิ้น" → `?stuck=all#stuck`, which lists every row in the same card (with today's other query kept) and offers "แสดงน้อยลง" *(my call)*. Empty: "ไม่มีทรัพย์สินค้างสถานะซ่อม".
- **`section#pm-due` "บำรุงรักษาตามรอบ (PM) ครบกำหนดใน 7 วัน"**, badge "N แผน" (the reminder set), line "เกินกำหนด a · ครบกำหนดใน 7 วัน b · เรียงจากที่เกินกำหนดนานที่สุด"; 3 rows: the title, the badge "เกินกำหนด N วัน" or "ครบกำหนด <date>", "<asset name> · <tag>" (planNo and vendor dropped, as the board); primary "บันทึกว่าทำแล้ว" (create; returnTo this page), or the link "มีบันทึกซ่อมที่ยังไม่เสร็จ <repairNo>" when the asset has an open record (§9). Foot "แสดง 3 จาก N" and the link: when a ≥ 1, "ดูแผนที่เกินกำหนด a แผน" → `/maintenance/pm?due=overdue` (decision 6); when a = 0, "ดูแผนที่ครบกำหนดใน 7 วัน b แผน" → `?due=week`, so the link names the size of the list it opens *(my call)*. Empty: "ไม่มีแผน PM ที่ครบกำหนดใน 7 วัน".
- Both cards always render, so `#stuck` and `#pm-due` always land *(my call; today the stuck box hides at 0)*.

### 11.3 The records ("บันทึกการซ่อม")
- Toolbar (a GET form): status `TabNav` "ทั้งหมด N · ยังซ่อมไม่เสร็จ N · ซ่อมเสร็จแล้ว N · ยกเลิก N" (`?status=` values unchanged; counts by one `groupBy` on the filtered where without its status, old workflow statuses folded into ยังซ่อมไม่เสร็จ; decision 7) *(my call: tabs are links, as the register)*; `SearchField` "ค้นหาเลขที่ ทรัพย์สิน อาการ เลขใบเสร็จ หรือร้าน" over today's nine fields (`src/lib/maintenance-query.ts:59-72`); the date range as `FilterMenuChip` "ช่วงวันที่" holding the two date inputs (applied: "ช่วงวันที่: <from> – <to>"); "ส่งออก Excel" (export) with the same query; `FilterChipList` keeps "เฉพาะทรัพย์สินนี้" for `?assetId=`; the invalid-range danger `Notice` stays.
- Table (6 columns, `ClickableTableRow` to `/maintenance/<id>?returnTo=`): วันที่ · เลขที่ (date, repairNo under it) · ทรัพย์สิน (name, tag under it; plain text, no nested link) · อาการ / สิ่งที่ซ่อม (two lines, then "…") · สถานะ · ผลการซ่อม (badge, then one plain secondary line: "ใช้งานได้" / "ซ่อมไม่ได้ เสนอจำหน่าย" / "ไม่ระบุ" for closed; "ส่งซ่อมมา N วัน" / "ซ่อมมา N วัน" for open; the cancel reason from the `maintenance_cancel` movement, one read for the page, nothing when empty) · ร้าน / ผู้ซ่อมภายนอก (name or "ช่างภายใน", "บันทึกโดย <name>" under it) · ค่าใช้จ่ายรวม (บาท) (`formatMoney` or `Nil`).
- `DataTableFoot`: "ค่าใช้จ่ายรวม N รายการ" and the `_sum` of `repairCost` over the whole filtered list less cancelled records; N counts the rows summed (the filtered rows that are not cancelled). Open records count with whatever cost is already typed (a cost can be saved at create and changed in the edit dialog, `src/lib/repair-record-service.ts:85, 160`). Under it, when the filter holds cancelled records, "ไม่นับ M รายการที่ยกเลิก"; on the ยกเลิก tab the foot shows nothing *(my calls after the builder check; decision 7)*.
- `Pagination` 25/50/100, past-the-end redirect, sort `reportedDate desc, createdAt desc`, as today.
- Phone: cards (decision 10.8): the name first, the tag, the badge (`shrink-0`, the tag breaks), the status line, "<date> · <vendor or ช่างภายใน> · <cost>"; the strip two per row and the cards stacked above.
- Empty states: today's two (`maintenance/page.tsx:247-254`).

## 12. Outside the five pages (only these changes)

### 12.1 The asset's ซ่อม / PM tab (group 1, B-Detail-maintenance)
- PM rows take the shared due badge: Bangkok days, the 14-day window, the words "เกินกำหนด N วัน" / "ใกล้ถึงกำหนด · อีก N วัน" / "รอบถัดไป · อีก N วัน" (today server-local, no day count, `src/components/assets/detail/asset-maintenance-tab.tsx:205-228`).
- "ตั้งรอบ PM" (`:195`) and the asset page's "บันทึกซ่อม" (`src/lib/asset-actions.ts:186`) pass `returnTo` to the asset page (`?view=maintenance` from the tab), so the forms come back there (decision 8).
- Nothing else: the strip, the replacement notice (already `summarizeAssetRepairs`), the repair table and the empty state stay.

### 12.2 Bell, digest and work center
- The `duePm` label reads "PM ครบกำหนดใน 7 วัน" (`notifications.duePm`, the digest's own word `src/lib/notification-digest-format.ts:35`, English "PM due within 7 days"). The count, the where and the links (`/maintenance#pm-due`, `#stuck`, `?status=in_progress`, `src/lib/waiting-work-rules.ts:168-170`) do not change. `openRepairs` and `stuckRepairs` keep their words.

### 12.3 Dashboard, audit and other overdue words (decision 5)
- `dashboard.waitingOverdue` and `auditRound.daysOverdue` read "เกินกำหนด {days} วัน"; `notifications.returnsDueSoon` and `asset.dataQualityReturnDue` "ใกล้/เกินกำหนดคืน"; `systemSettingsPage.notificationDaysHelp` "…ที่ถึงกำหนดวันนี้หรือเกินกำหนดแล้ว…". No other change on those pages.

## 13. Words

New and changed values (Thai shown; English follows the same meaning), through `messages-edit.mjs`:

- **repairRecord (list):** `subtitle` "ประวัติการซ่อมของทรัพย์สินทุกชิ้น และงานที่ต้องจัดการต่อ"; strip "ต้องจัดการ {count} เรื่อง", "ไม่มีงานที่ต้องจัดการ", cells "ยังซ่อมไม่เสร็จ", "ค้างสถานะซ่อมไม่มีบันทึก", "PM เกินกำหนด", "PM ครบกำหนดใน 7 วัน", feet "นานสุด {days} วัน", "สถานะกับประวัติยังไม่ตรงกัน", "ครบกำหนด {date}", "ไม่มีแผนที่ครบกำหนด"; `stuckCount` "{count} ชิ้น", "แสดง {shown} จาก {total}", "ดูทั้งหมด {count} ชิ้น", "แสดงน้อยลง", "ไม่มีทรัพย์สินค้างสถานะซ่อม"; `pmDueTitle` "บำรุงรักษาตามรอบ (PM) ครบกำหนดใน 7 วัน", `pmDueCount` "{count} แผน", `pmDueHelp` "เกินกำหนด {overdue} · ครบกำหนดใน 7 วัน {soon} · เรียงจากที่เกินกำหนดนานที่สุด", `pmOverdue` "เกินกำหนด {days} วัน", "ดูแผนที่เกินกำหนด {count} แผน", "ดูแผนที่ครบกำหนดใน 7 วัน {count} แผน", "ไม่มีแผน PM ที่ครบกำหนดใน 7 วัน"; `searchPlaceholder` "ค้นหาเลขที่ ทรัพย์สิน อาการ เลขใบเสร็จ หรือร้าน"; "ช่วงวันที่", "ช่วงวันที่: {from} – {to}"; columns "วันที่ · เลขที่", "สถานะ · ผลการซ่อม"; "บันทึกโดย {name}"; "ส่งซ่อมมา {days} วัน", "ซ่อมมา {days} วัน", "ส่งซ่อมวันนี้", "ซ่อมวันนี้"; "ค่าใช้จ่ายรวม {count} รายการ", "ไม่นับ {count} รายการที่ยกเลิก"; the PM row link reuses "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}". Removed: `stuckMore`, `pmDueMore`.
- **repairRecord (new):** `createSubtitle` "บันทึกว่าซ่อมอะไร เมื่อไหร่ และผลเป็นอย่างไร เมื่อบันทึกแล้วระบบจะออกเลขที่บันทึกให้"; sections "ทรัพย์สินที่ซ่อม", "อาการและความคืบหน้า", "รายละเอียดเพิ่มเติม", tag "ไม่บังคับ"; "เปลี่ยน"; "ไม่มีบันทึกซ่อมที่ยังไม่เสร็จ บันทึกใหม่ได้", "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}", "ตัดจำหน่ายหรือปลดระวางแล้ว บันทึกซ่อมไม่ได้"; "ระบบไม่เลือกไว้ให้"; `doneNo` "ยังซ่อมไม่เสร็จ" with `doneNoHelp` "ส่งซ่อม / รออะไหล่ · กด \"ซ่อมเสร็จ\" ทีหลังที่หน้าบันทึก", `doneYesHelp` "ต้องเลือกผลการซ่อมต่อ: ใช้งานได้ หรือ ซ่อมไม่ได้ เสนอจำหน่าย"; errors "เลือกว่าซ่อมเสร็จหรือยัง", "เลือกผลการซ่อม", "วันที่ต้องไม่หลังวันนี้"; status lines "สถานะทรัพย์สิน:", "จนกว่าจะกดซ่อมเสร็จ", "สถานะทรัพย์สินคงเป็น {status}", "สถานะ {status} บันทึกว่ายังซ่อมไม่เสร็จไม่ได้"; the early refusal "อยู่กับ {holder} ตามใบส่งมอบ {documentNo} ต้องรับคืนก่อน", "อยู่กับ {holder} ตามใบส่งมอบที่ยังไม่รับคืน ต้องรับคืนก่อน", link "รับคืน", hint "ตอนรับคืนเลือก ส่งซ่อม ระบบจะเปิดบันทึกซ่อมให้ แล้วกดซ่อมเสร็จที่บันทึกนั้น"; placeholders "ใส่ตอนซ่อมเสร็จได้", "ยังไม่มี"; `filesHelp` "ระบบจะอัปโหลดหลังบันทึก · ตอนยังไม่เสร็จนับเป็นรูปก่อนซ่อม" and "… · นับเป็นรูปหลังซ่อม"; summary "ขึ้นกับคำตอบ ซ่อมเสร็จหรือยัง", "ไม่เปลี่ยน", "ไม่มีที่ค้าง", "ครั้งถัดไป {date}", "ไม่เลื่อน จนกว่าจะกดซ่อมเสร็จ", "ถ้าตอบว่าซ่อมเสร็จแล้ว", "ผู้บันทึกคือ {name} ตามบัญชีที่ล็อกอิน · เลขที่บันทึก MT-… ออกให้หลังบันทึก", "ผู้บันทึกตามที่เลือกในส่วนที่ 2"; footer "บันทึกซ่อม {name}", "ยังไม่ได้เลือกว่าซ่อมเสร็จหรือยัง"; `save` on this page "บันทึกซ่อม".
- **repairRecord (detail):** meta "แจ้งซ่อม {date}", "ซ่อมเสร็จ {date}", "ยกเลิก {date}"; "อื่น ๆ", "เพิ่มเติม"; next step `ขั้นถัดไป: เมื่อรับเครื่องคืนจาก {vendor} แล้ว กด "ซ่อมเสร็จ"`, `ขั้นถัดไป: เมื่อซ่อมเสร็จแล้ว กด "ซ่อมเสร็จ"`, "ตอนกดจะถามวันที่ซ่อมเสร็จกับผลการซ่อม ระบบไม่เลือกผลไว้ให้ สถานะทรัพย์สินจะเปลี่ยนตามผลที่เลือก", heads "ถ้าผลการซ่อมเป็น", "สถานะทรัพย์สินตอนนี้", "หลังกดซ่อมเสร็จ", "กลับไปที่ {holder} ตามใบส่งมอบ {documentNo}", "ผู้ถือครอง {holder} คงเดิม", "ไม่มีผู้ถือครอง", "แล้วยื่นคำขอตัดจำหน่ายต่อ", "แนบรูปก่อนซ่อม", "ผู้มีสิทธิ์แก้ไขบันทึกซ่อมเป็นผู้กดซ่อมเสร็จ", "สถานะทรัพย์สินตอนนี้ {status} หลังกดซ่อมเสร็จจะเป็นไปตามผลที่เลือก", "ถ้าใช้งานได้", "ถ้าซ่อมไม่ได้ เสนอจำหน่าย", "ซ่อมเสร็จแล้ว {date} · {outcome}", "ขั้นถัดไป: ยื่นคำขอตัดจำหน่าย", "มีคำขอตัดจำหน่าย {disposalNo} แล้ว", "ผู้มีสิทธิ์ยื่นคำขอตัดจำหน่ายเป็นผู้ยื่นต่อ", "ยกเลิกบันทึกนี้แล้ว {date}"; `openDisposalRequest` "ยื่นคำขอตัดจำหน่าย"; details "รอกดซ่อมเสร็จ", "ยังไม่ระบุ"; history "ลำดับเหตุการณ์ของบันทึกนี้", `movement.conditionChange` "เปลี่ยนสภาพ", "แนบ{type} {count} ไฟล์", "ยังไม่ถึง"; asset card "ประวัติซ่อมทั้งหมดของทรัพย์สินนี้ · {count} รายการ"; `editHelp` "เปลี่ยนสถานะหรือผลการซ่อมที่นี่ไม่ได้ ถ้าผลผิด ให้แก้สถานะที่หน้าทรัพย์สิน (แก้สถานะ) แล้วระบุในหมายเหตุ".
- **maintenancePage:** `cancelHelp` "ใช้ได้กับบันทึกที่ยังซ่อมไม่เสร็จ ระบบจะคืนสถานะทรัพย์สินตามผู้ถือครองปัจจุบันและเก็บประวัติการยกเลิก"; `closedEvidenceAppendOnlyHelp` → "ลบไฟล์ได้เฉพาะผู้มีสิทธิ์แก้ไขบันทึกซ่อม ถ้าแนบผิดให้แจ้งผู้มีสิทธิ์"; "{count} ไฟล์", "ยังไม่มีไฟล์แนบ", "ตั้งเป็น{type}ไว้ให้ เพราะบันทึกยังไม่ซ่อมเสร็จ" / "…เพราะซ่อมเสร็จแล้ว", "ถ่ายรูปก่อนซ่อม", "ถ่ายรูปหลังซ่อม"; `errors.MAINTENANCE_ASSET_ON_LOAN` (§5), `errors.MAINTENANCE_PLAN_ASSET_WRITTEN_OFF`, `errors.MAINTENANCE_PLAN_CONFLICT` (§10); PM page "· ทั้งหมด {count} แผน", search placeholder "ค้นหาชื่อแผน ชื่อหรือรหัสทรัพย์สิน", cell feet "นานสุด {days} วัน", "ภายใน 14 วัน · ครบ {date}", "ไกลกว่า 14 วัน", sum "{overdue} + {soon} + {later} = {total} แผนที่ใช้งาน", "· ไม่นับ {count} แผนของทรัพย์สินที่ตัดจำหน่ายหรือปลดระวางแล้ว", chip "ครบกำหนดใน 7 วัน", badges "เกินกำหนด {days} วัน", "ใกล้ถึงกำหนด · อีก {days} วัน", "ใกล้ถึงกำหนด · วันนี้", "รอบถัดไป · อีก {days} วัน", "จบแผนเมื่อ {date}", foot "เรียงจากกำหนดที่ถึงก่อน", "เรียงจากที่จบแผนล่าสุด", "“–” คือช่างภายในทำเอง ไม่มีผู้ให้บริการภายนอก", empties "ไม่มีแผนที่พักไว้", "ยังไม่มีแผนที่จบแล้ว", "ไม่พบแผนที่ตรงกับการค้นหาหรือตัวกรอง", "การดำเนินการของแผน {planNo}", the open-record link "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}"; `pmActions.pauseHelp` "แผนนี้จะไม่แสดงในกล่อง PM ครบกำหนดใน 7 วัน จนกว่าจะเปิดใช้งานต่อ", `pmActions.resumeHelp` "แผนนี้จะกลับมาแสดงในกล่อง PM ครบกำหนดใน 7 วันเมื่อใกล้ครบกำหนด", `pmActions.endHint` "ถาวร · มีให้ยืนยัน"; PM form "แก้ไขแผน PM", "แก้ไขแผน PM · {title}", "เดิมกำหนด {date}", "พักแผนหรือจบแผนทำจากเมนู ⋯ ในหน้ารายการแผน", "ทรัพย์สินของแผน", "แก้ไขไม่ได้", "ถ้าจะใช้แผนนี้กับทรัพย์สินอื่น ให้จบแผนนี้แล้วเพิ่มแผนใหม่", "รายละเอียดแผน", "รอบและกำหนด", "ใส่จำนวนวันต่อรอบได้ 1–3,650 วัน", "กำหนดรอบถัดไป", "ถ้าบันทึกว่าทำแล้วตรงวันทุกรอบ", "ครั้งถัดไป", "รอบที่ {n}", "+{n} เดือน", "+1 ปี", "+{n} วัน", the note of §10, "สรุปก่อนบันทึก", "แก้ {count} ช่อง", "ก่อนแก้", "หลังแก้", "สถานะกำหนด", "ผลต่อหน้าแผน PM (ใช้งาน {count} แผน)", "อยู่ใน…" / "ไม่อยู่ในกล่อง PM ครบกำหนดใน 7 วันของหน้าซ่อมบำรุง", "แผนพักอยู่ ไม่นับในหน้าแผน PM", footer "แก้ไขแผน {title}", "ยกเลิกการแก้ไข", "บันทึกการแก้ไข", "เพิ่มแผน PM {title}".
- **apiErrors:** `maintenanceAssetOnLoan` (§5) and the two new PM errors in `src/lib/api-error-catalog.ts`.
- **Outside the group:** `notifications.duePm`, digest `duePm`, and the six overdue keys of §12.3.
- The same Thai for the same thing: the two status label sets (`repairRecord.status`, `maintenancePage.statuses`) keep their values; new code reads `repairRecord.status`.

## 14. Calls I made (for the user to check)

1. No schema change and no migration (§4).
2. The print sheet does not gain the day count or the timeline (§4).
3. The create API requires the outcome when done instead of defaulting to ใช้งานได้ (§5): a caller that forgets it is refused, not silently "usable".
4. A repair date and a completion date cannot be after today (§5), as รับคืน.
5. The repair detail page accepts the same wider `returnTo` as the forms, so new → record → back works (§5).
6. `OperationFormFrame` gains optional breadcrumbs (§7.1): the board and today's page have them.
7. The asset picker stops searching again after a pick (§7.2): the cause of the E2E waits.
8. "เปิดบันทึกที่ยังไม่เสร็จ" opens the record itself (§7.2): its id is known.
9. On MT-New the refusal adds how to go on after the return (§7.3).
10. Section 3 of MT-New is open, as on the board (§7.4).
11. ซ่อมเสร็จ stays in the header as well as in the card (§8.1).
12. The disposal-review panel hides its button when the next step already offers the request; its link reads "ยื่นคำขอตัดจำหน่าย" (§8.2, §8.3).
13. Attachment events in the history group by type, uploader and 10 minutes (§8.3).
14. "ประวัติซ่อมทั้งหมดของทรัพย์สินนี้ · N รายการ" counts every active record, so N equals the list it opens (§8.3).
15. One replacement rule (`summarizeAssetRepairs`) on the record and the asset tab (§8.3).
16. The phone keeps the attachment type select; the camera opens only for photo types (§8.5).
17. The phone uses the shared header and keeps every detail field (§8.6).
18. The PM page's extra `?due=week` filter as a chip, so the list's 7-day cell opens a list of its own size (§9).
19. Active plans on written-off assets stay in the ใช้งาน tab, outside the cells, with a note (§9).
20. Ended plans sort newest ended first (§9).
21. PM plan numbers use the Bangkok day with a unique retry; a stale PM edit is refused (§10).
22. The changed-field part of group 4 becomes shared (§10).
23. The strip cell feet "นานสุด N วัน" for open repairs and overdue PM (§11.1).
24. Strip cells and status tabs are links, not toggles (§11.1, §11.3).
25. The stuck card's "ดูทั้งหมด" expands in place with "แสดงน้อยลง"; both cards always render (§11.2).
26. The PM card's link goes to the overdue list when there is any, else to the 7-day list, and names its size (§11.2).
27. The asset name in the list table is plain text; the row opens the record (§11.3).
28. The bell, digest and work center say "PM ครบกำหนดใน 7 วัน", the same name as the list's card (§12.2).
29. The create-only next-step variant and its E2E coverage by unit and source tests only; no new E2E role (§16).
30. ซ่อมเสร็จ on a PM record whose plan was paused or ended meanwhile closes the record and leaves the plan alone; the plan check stays on every create (§5).
31. A PM plan whose asset has an open record shows "มีบันทึกซ่อมที่ยังไม่เสร็จ <repairNo>" in place of บันทึกว่าทำแล้ว and still counts as เกินกำหนด (§9, §11.2).
32. The cost total leaves out cancelled records, counts open records with the cost already typed, and N is the rows summed (§11.3).
33. Cancelling a record opened on an อยู่ระหว่างซ่อม asset restores the status by the holder, as every cancel (§5, decision 11).

## 15. Questions for the user

None remain: decisions 1 to 10 settle every open point the readers raised, and decision 11 the one question of the builder check.

### 15.1 Glossary rows to add
- **เกินกำหนด** · "เกินกำหนด N วัน" (every due date: PM, audit rounds, dashboard, returns) | เลยกำหนด. The glossary test gains `/เลยกำหนด/`.
- **PM windows:** "ครบกำหนดใน 7 วัน" for the reminders (the list's card and cell, bell, digest, work center; overdue counted in the card and the bell) · "ใกล้ถึงกำหนด · ภายใน 14 วัน" and "รอบถัดไป · ไกลกว่า 14 วัน" on the PM page | "PM ถึงกำหนด" without days.
- **Days at repair:** "ส่งซ่อมมา N วัน" (with a vendor) · "ซ่อมมา N วัน" (ช่างภายใน) | "ส่งซ่อมมา" for an internal repair.
- **A repair record is "บันทึก" / "บันทึกการซ่อม"** on the maintenance pages | "ใบงาน" (the disposal batch keeps its own word).
- **ยื่นคำขอตัดจำหน่าย** for the action that opens a disposal request | "ขอจำหน่าย".

### 15.2 Recorded for later (wiki)
- A วันนัดรับคืน field on the repair record (decision 10.3; a migration).
- A read-only plan page with its PM history (decision 10.2).
- `returnTo` from ส่งมอบ and the scan page into the repair form, and from the disposal page back to the repair record (wiki L53, L138, L175).
- One writer of repair records (the check-in route writes its own, without a unique retry on repairNo); repairNo still counts the server-local day.
- The unused `GET /api/maintenance-tickets` and `GET /api/maintenance-plans`; the export's English headers.
- A create-only user cannot delete a wrong upload on their own record.
- The attachment type as a column instead of a file-name prefix.
- Disposal ends plans without a per-plan audit row (`src/lib/disposal-execution-service.ts:242-246`).
- **Deploy day (for the handoff, not tasks):** the `outcome` column migration `prisma/manual-migrations/2026-10-07-add-maintenance-outcome.sql` is still pending on Production and every ผลการซ่อม element needs it; check the Production server's time zone (the due rules no longer depend on it, but the list's repair numbers do); check that a timer runs `npm run notifications:digest`; `MAINTENANCE_PM_GENERATION_TOKEN` can leave the Production env; the 10 Production assets stuck in a repair status are recorded after the deploy through the stuck card.

## 16. E2E

- Each plan updates the specs of its page in the same task and runs them on the dev DB (`asset_management_dev`) only; the whole suite (four projects, light and dark) runs once after plan 5. E2E never runs LDAP sync, a settings save, a failed login, a delete or a master-data change; run-marked setup data is fine. The ~103 old PM plans stay (decision 10.6); specs find their own plan by search, never by position.
- **Specs that change:**
  - `e2e/repair/repair-data.ts` (`saveRepairForm`): answers the done question and the outcome explicitly; the done radio's name is "ยังซ่อมไม่เสร็จ" (the description is separate); the submit is "บันทึกซ่อม". Its users follow: `e2e/transactions/handover-condition.spec.ts` (ส่งซ่อม link), `e2e/dashboard/dashboard.spec.ts:142-160`.
  - `e2e/repair/repair-record.spec.ts`: the sections, the eligibility line, the footer, the next-step card, "อื่น ๆ" for edit and cancel, the complete dialog with no outcome until chosen, the history oldest first, the phone bar's ซ่อมเสร็จ.
  - `e2e/repair/pm-plan.spec.ts`: finds its plan on the PM page by search (`?q=<planNo>`, `?due=overdue`) instead of `#pm-due li` (3 rows), reads "เกินกำหนด N วัน", records it done and sees the date advance from the record date, keeps the 31 Jan → 28 Feb clamp, the `Segmented` frequency, pause / resume / end from ⋯, and ends its plan.
  - `e2e/cross-cutting/support/refusals.ts`: พักแผน / จบแผน are inside ⋯, so the viewer check asserts no ⋯ on the PM page (`:124-127`); the page and API rows stay; no new route.
  - Word lists: `e2e/dashboard/dashboard-words.ts` (`duePm`, `returnsDueSoon`, the done radio), `tests/notification-announcement.test.ts`, `tests/notification-digest.test.ts`, `tests/asset-register-view-model.test.ts:195`.
- **New specs:**
  - ซ่อมไม่ได้ on an asset with an open HO-: the refusal text with the HO- number shows on choosing it (MT-New and the complete dialog); "รับคืน" opens รับคืน with the asset; the return goes into ส่งซ่อม under the open repair; then ซ่อมเสร็จ with ซ่อมไม่ได้ ends at รอตัดจำหน่าย and the next step offers "ยื่นคำขอตัดจำหน่าย" (IT staff has `disposal:create`).
  - The PM path pre-picks ซ่อมเสร็จแล้ว with no outcome; a PM record saved not done leaves the plan's date, and its ซ่อมเสร็จ moves it from the completion date; while that record is open the PM page row shows "มีบันทึกซ่อมที่ยังไม่เสร็จ <repairNo>".
  - From the stuck card, an อยู่ระหว่างซ่อม asset (run-marked) is recorded ยังซ่อมไม่เสร็จ: the status stays and the asset leaves the card. Unit tests cover the policy row, ซ่อมเสร็จ on a paused and an ended plan, the plan check on a not-done create, and the cost total with cancelled and open records.
  - The list's strip: each cell's link opens a list whose count equals the cell; `?stuck=all#stuck` expands the card; the status tab counts and the cost total follow a search.
  - A PM plan for an asset under repair can be created; the PM page tabs, search and due cells; the ended tab's "จบแผนเมื่อ".
  - The PM edit summary "แก้ 1 ช่อง" and the stale-edit refusal (two pages, run-marked plan).
  - `returnTo` from the asset tab: ตั้งรอบ PM and บันทึกซ่อม come back to the tab.
  - axe on every new state in both themes.

## 17. Build order and what is left to the builder

Each plan merges after its own unit tests, its source-reading guards and its page's E2E specs (the critic's split, recon `critic.md` §4).

| # | Plan | Covers | Depends on |
|---|---|---|---|
| 1 | **Rules first** (lib and server, little UI) | §5's Bangkok-day due helper with one scope and `_min` (list, PM page, asset tab, waiting work); the overdue word and every key of §12.3, the glossary row and test, the bell, digest and asset-tab words (§12); the PM advance rule (decision 3) with the plan check on every create and ซ่อมเสร็จ that leaves a paused or ended plan alone; ยังซ่อมไม่เสร็จ on อยู่ระหว่างซ่อม (decision 11); PM server guards (written-off refusal, `expectedUpdatedAt`, planNo retry, PM asset options); one replacement rule; wider `returnTo` and the asset links that pass it; the ON_LOAN wording; the date rule; the create API's required outcome; the client-safe "what will happen" helper and the asset facts read (holder, department, room, branch, photo, open record, active checkout with its document). | decisions 3, 4, 5, 8, 10.4, 11 |
| 2 | **บันทึกซ่อม (MT-New)** | §7, the frame's breadcrumbs, `STICKY_FOOTER_ROUTES`, the phone; `saveRepairForm` and its users. | 1; decisions 1, 2 |
| 3 | **The record (MT-Detail, -Phone)** | §8: the card in all states, the dialog wrapper, the menu, the phone bar, history, asset card, attachments. | 1, 2 (asset card, helper); decisions 1, 2, 9, 10.3 |
| 4 | **PM page and PM form (MT-PM, MT-PM-Form)** | §9, §10, the shared changed-field part, the ⋯ wrapper for the state dialogs, `pm-plan.spec.ts` and the refusal list. | 1; decisions 10.1, 10.2, 10.4 |
| 5 | **The list (MT-List)**, last | §11: strip, cards, anchors, status tabs with counts, date chip, 6 columns, cost total, phone; `maintenance-sweep-ui`, `repair-record-list-ui`, `waiting-work-links`; then the whole suite and the look step in both themes. | 1, 4 (`?due=`); decisions 6, 7 |

**Why this order:** the list, the PM page, the asset tab and the bell read the same due rule and words, so they change once, in plan 1. MT-New comes before the record, which reuses its asset card and helper. The list collects everything and rewrites the anchor contracts once; it can link to `/maintenance/pm` until plan 4's `?due=` exists. **Dry run:** none needed for plans 2 to 5 (pages and specs on the dev DB); plan 1 touches the bell, dashboard and audit words, so its unit tests and the dashboard specs run before merge.

**Left to the builder:** the exact names and shapes of the helpers, the facts read and the new keys; how the dialog wrapper exposes `open()`; the phone breakpoints (as the shell); the attachment-event grouping inside the 10-minute rule; the order of tasks inside each plan; the DESIGN.md and `docs/06_WORKFLOWS.md` / `docs/17_REPAIR_RECORD_GUIDE_TH.md` text for the new rules (the user guide no longer calls "ซ่อมเสร็จแล้ว" the default).

## Appendix A. What the boards leave out, and stays (binding)

- **List:** `?assetId=` with the chip "เฉพาะทรัพย์สินนี้" (used by the asset tab and the form); `?status=in_progress|closed|cancelled` as a URL contract; the anchors `section#stuck` and `section#pm-due`; search over invoice number, resolution and reporter; the invalid date range notice; the past-the-end redirect; page sizes 25/50/100; old workflow statuses folded into ยังซ่อมไม่เสร็จ; the create and export gates; `returnTo` on every outbound link; the row opens the record; "ไม่ระบุ" for a closed record without an outcome; the two empty states; the export's 5,000-row cap and filters.
- **Record:** the legacy panel "ข้อมูลจากขั้นตอนเดิม"; the disposal-review panel (3 repairs or 50% of the price, `disposal:create`); the PM plan line; วันที่ซ่อมเสร็จ on a closed record; edit on closed records; the cancel confirm with its optional reason; the `expectedUpdatedAt` guard and 409; the condition after repair and its history line; preview, download and delete of files; upload rights (edit, or create on own record); the print route and its link; the `actionBarPagePadding` rule.
- **New:** the reporter picker for an account without an employee; the PM banner, plan prefill and the locked asset; condition after repair (§19.4); files uploaded after the save, before/after by the answer, PDFs as ใบแจ้งหนี้; the upload-failure toast; the refusals for an open record, a written-off asset and an ineligible status; the field errors and focus-first; `?assetId=` and `?planId=`.
- **PM page:** the create gate; the pause / resume / end confirms; ended plans readable; paging; the state machine (`src/lib/maintenance-plan-service.ts:16-34`).
- **PM form:** create from `?assetId=`; the client checks (1–3,650 days); the asset locked on edit; the 404 for an ended plan; the toasts; the vendor picker; `#maintenance-plan-*` ids.
- **Everywhere:** the bell, dashboard and work-center links; the waiting-work counts; the viewer refusal list; the RBAC route matrix rows.

## Appendix B. Board elements replaced or dropped

| Board element | Here | Why |
|---|---|---|
| Tinted red and amber tiles (MT-List, MT-PM) | `StatStrip` cells with the `attention` foot line | `DESIGN.md:290, 486` |
| Tiles as `aria-pressed` toggles | `StatStrip` links with `current` | URL state, bell links, back button (§11.1) |
| MT-PM's dashed sum cell | a `filterNote` line under the strip | no dashed borders |
| Blue-tinted next-step card border | plain `ContentPanel` | state color only in badges |
| Green and orange outcome text, orange "ส่งซ่อมมา N วัน" | plain secondary text | same |
| Dashed future dot in the history | a hollow marker | no dashed borders |
| "ศูนย์นัดรับเครื่อง 21 ต.ค." and the generated "รับเครื่องจาก … แล้วส่ง…" | dropped | decision 10.3; holder and room at record time are not stored |
| "กลับไปที่ <holder> ตามใบส่งมอบเดิม" fixed for every asset | computed per asset (§8.2) | the real restore rule |
| ซ่อมไม่ได้ → รอตัดจำหน่าย on a held asset | the early refusal with รับคืน | decision 1 |
| "ค่าใช้จ่ายรวม 8 รายการในหน้านี้" | the whole filtered list | decision 7 |
| Asset name as a link inside the table row | plain text | no nested link in `ClickableTableRow` |
| PM due rows' planNo and vendor | dropped (as the board) | the PM page shows them |
| Phone detail's own top bar; four-field details; no type select | shared header; all fields; the select stays | DESIGN.md header rule; Appendix A |
| "ประวัติซ่อมทั้งหมดของเครื่องนี้ (1)" | "…ของทรัพย์สินนี้ · N รายการ", N = the list's count | glossary; the count must match |
| Board pickers "name CODE" | "code - name" | §5 |
| The board's category icon tile | the register photo | group 3 §19.5 |
| MT-PM-Form note "บันทึกแล้วจะขึ้นข้อความ…" | dropped | the toast says it |
| The board's date shown as "14 ต.ค. 2569" in a custom field | native date input | every form uses it |
