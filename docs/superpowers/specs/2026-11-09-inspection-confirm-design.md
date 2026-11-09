# ยืนยันผลตรวจ (confirm audit results for assets stuck in อยู่ระหว่างตรวจสอบ)

**Inputs:**
- Memory of the 2026-10-28 decision: 190 active Production assets sit in `Under Inspection` (อยู่ระหว่างตรวจสอบ), 177 of
  them from the June 2026 import. Staff asked to fix them after the field audit. The user agreed on a "ยืนยันผลตรวจ"
  feature and asked (2026-10-29) to build it after every other page group. Groups 1-12 are now merged (master `600dc902`).
- Brainstorm 2026-11-09 in chat, with two mockups (bulk page, round steps). Calls marked **(my call)** were played back
  and accepted ("ครบแล้ว เขียนเอกสารออกแบบได้เลย").

**User decisions 2026-11-09:**
- **Source of truth:** staff confirm from the results of the audit round they are running. They do not re-check by hand.
- **Bulk:** a page that confirms many assets at once, not only one at a time.
- **Not found:** the end result is a disposal request (ตัดจำหน่าย).
- **Placement:** inside the audit round, not under the assets menu. No new menu entry.
- **Rename:** "รายการไม่ตรง" becomes **"รายการไม่ตรงทะเบียน"** everywhere.
- **Operator confusion:** the round page must tell staff where to go next, in order. It shows 4 steps:
  ตรวจนับครบ → อนุมัติรายการไม่ตรงทะเบียน → ยืนยันผลตรวจ → ปิดรอบ.
- **Blocking:** a round **cannot be closed** while any of its own assets is still `Under Inspection`. The page blocks it
  and the server refuses it too.

## 1. Why

- **Nothing releases the status today.** Approving a finding in รายการไม่ตรงทะเบียน updates the location, holder,
  department or condition (`src/app/api/audit-findings/[id]/review/route.ts`), but the status stays `Under Inspection`.
- **The existing correction is too narrow.** The detail page's "แก้ไขสถานะ" correction
  (`src/app/api/assets/[id]/status-correction/route.ts`, `asset-lifecycle-exception-policy.ts`) only returns to
  `Ready`, works on one asset at a time, and ignores the audit result.
- **Matched assets have no screen.** Assets that matched the register produce no finding, so รายการไม่ตรงทะเบียน never
  shows them. They need a screen of their own.
- **Success:** after the field audit, staff can release the ~190 assets in a few sittings, every one with history, and
  the round cannot be closed with any left behind.

## 2. Goals, non-goals, anti-goals

**Goals:**
- Add a confirm page per round that releases `Under Inspection` assets in bulk, driven by the round's results.
- Add a 4th step on the round page, and block the close on it.
- Send not-found assets to หาไม่พบ (`Missing`), then into a lost disposal batch.
- Damaged assets: confirm one at a time and go straight to repair or disposal (§6a); disposals from a round are
  executed together (§6b).
- Add a single-asset path on the detail page for assets that are not in any round.
- Rename "รายการไม่ตรง" across the app.

**Non-goals:**
- **Editing location or holder on the round confirm page.** Those still change only through รายการไม่ตรงทะเบียน
  approvals, so two screens never edit the same data.
- **Automatic release** when a scan matches. A person always confirms, with a reason.
- **Writing to Production now.** Production data changes only through the app after deploy.
- **A new status, permission or migration.** If the plan finds it needs a migration, stop and ask.

**Anti-goals (a failure even if it works):**
- **Operators get lost.** They should never wonder which page comes next.
- **Two pages edit the same data.** The round confirm page must not change location or holder.
- **A confirmed asset carries no record of why.** Every one keeps the reason, who confirmed it and when.
- **An asset leaves `Under Inspection` silently**, without a movement row and a system log.

## 3. Round page: the steps card (`src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`)

**Steps:**
- `auditRoundPageStepKeys` (`src/lib/audit-round-page-rules.ts`) grows from `walk · review · close` to
  `walk · review · confirm · close`.
- Step labels are ตรวจนับครบทุกชิ้น · อนุมัติรายการไม่ตรงทะเบียน · ยืนยันผลตรวจ · ปิดรอบตรวจนับ.
- **Current step:**
  - `walk` while items are pending;
  - else `review` while findings are pending;
  - else `confirm` while the round has unconfirmed assets;
  - else `close`.

**Unconfirmed assets of a round:** active assets whose current status is `Under Inspection` and that have an audit item
in the round.
- Out-of-scope finds count too, if the asset is `Under Inspection` **(my call)**.
- Use the same own/out-of-scope helpers as the round counts (`audit-round-counts-rules.ts`).

**Main action and bar:**
- On the `confirm` step, the main link reads "ยืนยันผลตรวจ n ชิ้น" and opens the confirm page.
- Staff without `asset:edit` get a neutral link instead. It mirrors how step 2 treats people without `audit:approve`.

**Close conditions card:** gains a line.
- While assets are left: "ยังมี n ชิ้นค้างสถานะอยู่ระหว่างตรวจสอบ", linked to the confirm page.
- When none are left: "ยืนยันผลตรวจครบแล้ว".

**Close API:**
- `getAuditRoundCloseChecklist` (`src/lib/audit-round-close.ts`) gains `unconfirmedAssets`, and `canClose` requires it to
  be 0.
- The PATCH close in `src/app/api/audit-rounds/[id]/route.ts` already refuses on the checklist. The page and the API keep
  reading this one function.

**Closed rounds:**
- A closed round still shows a link to its confirm page while it has unconfirmed assets **(my call)**. A round closed
  before this deploy (in the old build) can still be used to confirm.
- Cancelled rounds get no confirm page.

## 4. Confirm page: `/[locale]/audit/rounds/[id]/confirm`

**Page frame:**
- Gated `asset:edit` plus the audit view permission the round page uses. Viewers without `asset:edit` are refused like
  other gated pages (`requirePagePermission`).
- Header: breadcrumb ตรวจนับ › รอบตรวจนับ › <auditNo> › ยืนยันผลตรวจ.
- Eyebrow: "รอบ <auditNo> · ขั้นที่ 3 จาก 4".
- Title: "ยืนยันผลตรวจ".
- Lead: "ปลดสถานะ อยู่ระหว่างตรวจสอบ ตามผลตรวจนับ".
- Back link to the round.
- **Rows:** only unconfirmed assets of this round (§3).

**Tabs** (chips with counts; the order below is the display order):

| Tab | Rows | Action |
|---|---|---|
| พร้อมยืนยัน | Result found (`successfulAuditResults`), or every finding decided (approved, rejected, exception), and the asset's recorded condition is not damaged | Bulk confirm (§5) |
| รออนุมัติ | Any finding of this item still `pending`, including the pending `not_found` finding that mark-not-found creates. This tab wins over ไม่พบ. | None. Each row links to its finding in รายการไม่ตรงทะเบียน. A banner links to the round's pending findings. |
| สภาพเสียหาย | As พร้อมยืนยัน, but the condition is เสียหาย, ใช้งานไม่ได้ or ซาก (`getCheckoutConditionBlock`) | **One at a time (user, 2026-11-09, option ข).** No ticks and no bulk confirm. Each row has two buttons, "ยืนยันแล้วแจ้งซ่อม" and "ยืนยันแล้วขอตัดจำหน่าย" (§6a). |
| ไม่พบ | Result `not_found` and its `not_found` finding **approved** **(my call, builder check)**. A *rejected* not-found means the approver did not accept it as lost, so that row goes to พร้อมยืนยัน (or สภาพเสียหาย) instead, and never blocks the close forever. | Bulk "ตั้งเป็นหาไม่พบ" (§6). Rows already `Missing` leave the page, because they are no longer `Under Inspection`. |
| ยังไม่ได้ตรวจนับ | Item still pending | None. Links to the round's pending list (step 1). |

- **Default tab:** the first non-empty one in table order.
- **Table columns:** tick · ครุภัณฑ์ (tag + name) · ผลตรวจนับ (result + date + condition) · ที่ตั้ง · ผู้ถือครอง ·
  จะตั้งสถานะเป็น.
- **Phone:** each row is a card.
- **ที่ตั้ง and ผู้ถือครอง are the register's current values**, after approvals. The page does not edit them. Use the
  glossary words, ที่ตั้ง and ผู้ถือครอง (`docs/19_THAI_GLOSSARY.md`).

**Target status per row** **(my call, builder check):** the existing rule, not a new one.
- Use `getMaintenanceOperationalTarget` (`src/lib/asset-lifecycle-policy.ts`): **ใช้งานอยู่** (`In Use`) for a *personal*
  asset with a holder, else **พร้อมใช้งาน** (`Ready`). Repair close-out and the data-quality detector use the same rule.
- This matches the 2026-10-28 count of the stuck assets: 35 personal with a holder → In Use, the rest → Ready.
- **An open temporary loan** (ยืม) means the target is **ถูกยืม** (`Checked Out`), as the detector expects. Reuse the
  detector's open-handover read, so the confirm never creates an `open_checkout_status_mismatch`.

**Selection:**
- A tick per row, plus select-all on the visible page and select-all across the tab.
- A sticky selection bar: "เลือก n ชิ้น · ใช้งานอยู่ a · พร้อมใช้งาน b" and the primary "ยืนยันผลตรวจ…".
- Reuse the list selection pattern already in the app (e.g. `audit-findings-batch-actions.tsx`, the bulk-move list).

## 5. Bulk confirm (server)

**Route:** `POST /api/audit-rounds/[id]/confirm-results` with body `{ assetIds: string[], reason: string }`.
- **Cap:** 500 ids per call **(my call)**.
- **Reason:** required, trimmed, 3-500 characters. Same limits as the status-correction schema.

**Permission:** `asset:edit` (same as status correction).

**Server re-checks:** for each id, inside one transaction:
- the asset is active;
- it is still `Under Inspection`;
- it has an item in this round;
- the item is not pending and has no pending finding;
- the result is not `not_found`.

The server computes the target status itself (§4 rule). The client never sends it.

**Writes per asset:** the same three writes as the status-correction route, so history reads alike.
- the asset's `statusId`;
- an `asset_movements` row with `movementType: "status_correction"`, `referenceType: "audit_round"`,
  `referenceId: <round id>`, and the reason;
- a `system_logs` `correct_status` entry with the round number in its new value.

**All or nothing:**
- If any id fails a check, nothing is written. The answer is 409 with the refused ids and why each was refused.
- The page then reloads and explains: "บางชิ้นเปลี่ยนไปแล้ว โหลดใหม่และลองอีกครั้ง".
- **(My call:)** all-or-nothing keeps the history and the counts simple.

**Answer:** `{ confirmed: n, inUse: a, ready: b }`.
- The page shows a success notice and refreshes.
- When the tab empties, the page moves to the next non-empty tab.
- When the whole page is empty: "ยืนยันผลตรวจครบแล้ว" with a link back to the round (step 4).

**Confirm dialog** (AccessibleDialog):
- Title: "ยืนยันผลตรวจ n ชิ้น".
- Count lines: ใช้งานอยู่ a · พร้อมใช้งาน b.
- เหตุผล field, prefilled "ยืนยันตามผลตรวจนับรอบ <auditNo>", editable, required.
- Note: "บันทึกลงประวัติของแต่ละชิ้น".
- Buttons: ยกเลิก · "ยืนยัน n ชิ้น".
- While busy: the dialog cannot close, and a second submit is refused.

## 6. Not found → หาไม่พบ → lost disposal

**Step 1, "ตั้งเป็นหาไม่พบ":**
- Bulk, same dialog shape as §5.
- Route: `POST /api/audit-rounds/[id]/confirm-results` with `{ assetIds, reason, outcome: "missing" }`.
- Server checks: the item's result is `not_found`, and the asset is `Under Inspection`.
- Target status: `Missing` (หาไม่พบ). Same three writes as §5.
- Default reason: "ตรวจนับรอบ <auditNo> ไม่พบ".

**Step 2, "ขอตัดจำหน่ายแบบสูญหาย":**
- The ไม่พบ tab keeps a link block "ชิ้นที่ตั้งเป็นหาไม่พบจากรอบนี้: n ชิ้น · ขอตัดจำหน่ายแบบสูญหาย…".
- The link opens the existing batch request form `/[locale]/disposal/batch/new` with `?type=lost&fromAuditRound=<id>`.
- The form pre-ticks this round's `not_found` items whose asset is now `Missing` and not already in an open disposal
  request.
- **(My call:)** pass the round id, not a list of asset ids. This avoids long URLs, and the server re-reads the
  eligible assets.
- The existing batch rules still apply unchanged: a lost batch needs one file of any kind, plus the method and the
  reason. The form only gains the pre-tick.
- **The batch form refuses `Missing` today:** `disposal_create` allows only `ready` and `in use`
  (`allowedSources` in `src/lib/asset-lifecycle-policy.ts`). Add `missing` as an allowed source **for the `lost` type
  only**, in the policy and in every server check that reads it **(my call)**.
- **Cap:** the batch form takes at most 100 assets (`DISPOSAL_BATCH_MAX_ASSETS`). The pre-tick takes the first 100 and
  shows "เลือกให้ 100 ชิ้นแรก ส่งชุดนี้แล้วกลับมาขอชุดถัดไป" when there are more **(my call)**.

**Timing:** the two steps are separate on purpose. หาไม่พบ means "still looking". Staff may wait before giving up and
requesting disposal.

## 6a. Damaged rows: confirm, then go straight on (user, 2026-11-09)

**Why:**
- `maintenance_create` and `disposal_create` accept only `ready` and `in use` (`allowedSources` in
  `asset-lifecycle-policy.ts`), so a damaged asset must be confirmed first.
- Once confirmed as Ready or In Use, the data-quality detector flags it as critical (`operational_asset_is_damaged`,
  `getAssetConditionCompatibilityIssue`) until a repair or disposal starts.
- The user chose to keep that window short: confirm one asset, then go to the form at once.

**Each button:**
- Opens a small confirm dialog: the asset, the target status (§4 rule), and เหตุผล (prefilled, required).
- On success, it navigates to the next form:
  - **ยืนยันแล้วแจ้งซ่อม** → the existing new-repair form (MT-New) with the asset preselected;
  - **ยืนยันแล้วขอตัดจำหน่าย** → the existing single disposal request form with the asset preselected, and the source
    set to this audit round (§6b).
- Both forms get a return link back to the confirm page.
- **Same server route as §5:** `confirm-results` with one id and `outcome: "damaged"`. The server checks that the
  condition is damaged; the target status follows the §4 rule.
- **If the user leaves the form without sending:** the asset stays confirmed. The data-quality flag then acts as the
  reminder. The confirm page row is gone, because the asset is no longer `Under Inspection`.

## 6b. Disposals from an audit round are executed together (user, 2026-11-09)

The user's words: "การขอตัดจำหน่ายถ้ามาจากรอบตรวจนับ จะทำการจำหน่ายเป็นรอบพร้อมกัน".

**Source on the request:**
- Every disposal request made from the confirm page carries the audit round as its source. That covers the lost batch
  (§6) and the damaged rows (§6a).
- Reuse the existing `sourceType` / `sourceId` columns on `disposal_requests` (no migration):
  - `sourceType: "audit_finding"` with the finding id when the asset has an approved finding (the existing source kind,
    `src/lib/disposal-source.ts`, already links to the finding and shows the audit number);
  - otherwise a new `sourceType: "audit_round"` with the round id.
- Add `audit_round` to `disposal-source.ts`, so the request page shows "ตรวจนับ <auditNo>" with a link to the round.

**Executing together:**
- A disposal is executed through a disposal round (`disposal-round-service.ts`), built from a selection in the
  approved tab of `/disposal`.
- Add a filter to that tab, "มาจากรอบตรวจนับ", with a value per audit round. It matches requests whose source is that
  round or one of its findings.
- With the filter on, "เลือกทั้งหมด" then "สร้างรอบตัดจำหน่าย" takes them all at once.
- **One method per disposal round** (existing rule): lost assets and, say, destroyed damaged assets from the same audit
  go into two disposal rounds, each holding all the requests of its method.

**Link from the confirm page:**
- The confirm page shows a line "ขอตัดจำหน่ายจากรอบนี้: n รายการ · อนุมัติแล้ว m".
- When m > 0, a button "ไปสร้างรอบตัดจำหน่าย" opens `/disposal?status=approved&auditRound=<id>`.
- **(My call:)** the confirm page does not block on disposals. The audit round can close while its disposal requests
  are still waiting for approval or execution. Only `Under Inspection` blocks the close.

## 7. Single asset: detail page

**When it shows:** the asset is `Under Inspection`.
- The overview shows a notice: "ครุภัณฑ์นี้ค้างสถานะอยู่ระหว่างตรวจสอบ".
- The notice carries one action, chosen as below.

**If the asset has an item in a non-cancelled round:**
- The action is a link "ยืนยันผลตรวจในรอบ <auditNo>". It opens that round's confirm page on the asset's tab.
- **Several rounds** **(my call, builder check):**
  - Pick the newest round, by start date, where the asset sits in an actionable tab (พร้อมยืนยัน, สภาพเสียหาย or ไม่พบ).
  - If no round can act, link to the newest round, on its tab (รออนุมัติ or ยังไม่ได้ตรวจนับ). That tab says what must
    happen first.
  - The dialog stays only for assets in no round.
- No editing happens here, so two screens never edit the same data.

**If the asset is in no round:** the action is a "ยืนยันผลตรวจ" button that opens a dialog (agreed 2026-10-28).
- **Status:** พร้อมใช้งาน, or ใช้งานอยู่, which needs a holder.
- **ผู้ถือครอง:** an employee picker, prefilled with the current holder, clearable.
- **ที่ตั้ง:** a location picker, prefilled, required.
- **เหตุผล:** required.
- **Route:** `POST /api/assets/[id]/confirm-inspection`. In one transaction it writes:
  - the status, holder and location;
  - a movement row per changed field, using the existing movement types (`location_change`, `custodian_change`,
    `status_correction`);
  - one `correct_status` log.
- **Department:** the department rule of the asset form (department follows the holder for personal/stock with a
  holder) applies. Reuse the existing helper; do not invent a new rule.

**The existing "แก้ไขสถานะ" correction stays** for every other protected status (`Missing`, `Lost`, `Pending Repair`
…). For `Under Inspection` the new notice replaces it, so there are not two buttons for the same thing **(my call)**.

## 8. รายการไม่ตรงทะเบียน: the rename and the hand-off

**Thai rename:**
- Every Thai string with "รายการไม่ตรง" becomes "รายการไม่ตรงทะเบียน". There were 89 hits in `messages/th.json` on
  2026-11-09. Phrases follow: "ประเภทรายการไม่ตรง" becomes "ประเภทรายการไม่ตรงทะเบียน", and so on.
- Edit only through `node scripts/messages-edit.mjs`.
- Read each string. Where the word "ทะเบียน" already follows, or the result would be clumsy, word it by hand. List those
  in the plan.
- Glossary: `docs/19_THAI_GLOSSARY.md` row "ผลตรวจที่ไม่ตรงระบบ" becomes **รายการไม่ตรงทะเบียน**, and "รายการไม่ตรง" (alone)
  is added as a retired word.
- `tests/thai-glossary.test.ts`: map Finding to the new word, and refuse bare "รายการไม่ตรง" not followed by "ทะเบียน".

**English:**
- Unchanged (Discrepancy).
- Keys stay. Only values change.

**Hand-off banner:**
- On `/audit/findings` filtered to a round, when that round has no pending finding left but has unconfirmed assets,
  show a banner: "อนุมัติรายการของรอบ <auditNo> ครบแล้ว · ขั้นต่อไป: ยืนยันผลตรวจ n ชิ้น", with a button to the
  confirm page.
- Unfiltered: no banner **(my call)**.

## 9. Constraints

**Stack and process:**
- Next 16, next-intl Thai-first, Prisma 7 on SQL Server.
- Read `node_modules/next/dist/docs/` before new route or page code.

**Words:**
- Thai copy follows the glossary: ที่ตั้ง, ผู้ถือครอง, หาไม่พบ, ตัดจำหน่าย, รายการไม่ตรงทะเบียน.
- English messages use ICU plurals.
- Thai uses `{x, number}`.
- Update the plural count test when keys are added.

**Data:**
- **No migration expected.** Statuses `In Use`, `Ready`, `Missing` and `Under Inspection` exist (seed).
- Movement `referenceType` is a free string (`audit_round`).

**Kept features:**
- The steps card's existing conditions (pending items, pending findings, open actions, the opener rule) all stay.
- Every feature of the findings page stays.
- The status-correction dialog stays for the other statuses.

**E2E** (dev DB only, run-marked data):
- The spec creates its own round with run-marked assets set to `Under Inspection`.
- Covered: confirm in bulk, set หาไม่พบ, the close refusal, the pre-ticked lost batch form. The form is not sent, so
  no disposal is created.
- Restore nothing shared.
- The usual hazard aborts stay on.

**Production:** no writes. The ~190 assets are released after deploy, by staff, in the app.

## 10. Review focus (what could bite)

- **Stale counts:** a finding approved between page load and confirm. The server re-check refuses with 409, and the page
  reloads.
- **The close check and the page disagree:** both read `getAuditRoundCloseChecklist`. Pin this with a test.
- **An asset in two rounds:** the confirm page of either round may release it. Once it is released, the other round no
  longer counts it. That is correct, and is pinned by a test.
- **A damaged asset confirmed to ใช้งานอยู่:** it is allowed. Make sure no handover or transfer path treats ใช้งานอยู่
  as "condition is fine".
- **The rename breaks old pins:** source-pin tests and E2E word files match "รายการไม่ตรง". Update them together with the
  messages.

## 11. Left to the builder

- Which components to reuse for the selection bar, chips and cards. Prefer existing ones over new ones.
- Exact Thai copy beyond the strings named here, within the glossary.
- How to split the work into plans. Suggested:
  1. Rename and glossary.
  2. Close rule, steps card and confirm API.
  3. Confirm page.
  4. Not-found path and lost-batch pre-tick.
  5. Single-asset dialog and hand-off banner.
