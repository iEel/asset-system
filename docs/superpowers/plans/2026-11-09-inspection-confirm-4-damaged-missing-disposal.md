# ยืนยันผลตรวจ plan 4 of 5: damaged rows, not found → หาไม่พบ → lost disposal, disposals executed together

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the confirm page's last two tabs and connect them to the existing repair and disposal flows.
- A damaged asset is confirmed one at a time, then the user goes straight to the repair form or the disposal form.
- Not-found assets are set to หาไม่พบ in bulk, then requested for disposal as lost.
- Every disposal made from a round names that round, so the approved ones can be put in one disposal round together.

**Architecture:**
- **Server:**
  - The disposal policy accepts `Missing` for the `lost` type only.
  - The batch API takes a source.
  - The disposal list gains an "audit round" filter.
  - `disposal-source.ts` learns `audit_round`.
- **Confirm page:** the damaged and not-found tabs get their actions, and the page gets a line about its disposals.
  These reuse plan 2's route (`outcome: "damaged"` and `outcome: "missing"`) and plan 3's dialog.
- **Batch form:** it can open pre-filled from a round.

**Tech Stack:** Next 16, Prisma 7 / SQL Server, next-intl, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-inspection-confirm-design.md` §6 (not found → lost), §6a (damaged), §6b
(executed together), §9.

## Global Constraints

**Disposal policy:**
- `Missing` (หาไม่พบ) may start a disposal request only when `disposalType === "lost"`. Every other type still refuses
  it.
- Every server check reads one function: `getDisposalAssetEligibilityError(status, disposalType?)` in
  `src/lib/disposal-policy.ts`. Its callers are `api/disposal-requests`, `api/disposal-batches`,
  `api/disposal-assets` (the picker) and `disposal/new/page.tsx` (the prefill).
- **Asset-detail callers** (`asset-detail-frame-rules.ts`) pass no type, so they keep refusing `Missing`.

**Source of a request made from the confirm page** (my call, simplifies spec §6b): always
`sourceType: "audit_round"` with `sourceId: <round id>`.
- The disposal list's round filter matches `audit_round` with that id, or `audit_finding` whose finding belongs to the
  round. That second case is the existing findings-page action.
- `disposal-source.ts` shows `audit_round` as "ตรวจนับ <auditNo>", linking to the round page.

**Batch:**
- At most `DISPOSAL_BATCH_MAX_ASSETS` (100) assets, at least `DISPOSAL_BATCH_MIN_ASSETS`.
- With fewer assets than the minimum, the confirm page links to the single request form instead (one asset → its
  `?assetId=`).

**returnTo:**
- `normalizeMaintenanceReturnTo` must also accept `/<locale>/audit/rounds/<uuid>/confirm` with its query, so the
  repair form's back link returns to the confirm page.
- The single disposal form already accepts internal paths.

**Confirm page:**
- The damaged tab has no ticks and no bulk bar. The not-found tab has ticks and a bulk "ตั้งเป็นหาไม่พบ" with the same
  dialog shape as พร้อมยืนยัน.
- **Default reasons:**
  - damaged: `ยืนยันตามผลตรวจนับรอบ {auditNo}`;
  - missing: `ตรวจนับรอบ {auditNo} ไม่พบ`.

**Copy and process:**
- Thai follows `docs/19_THAI_GLOSSARY.md`. Repair actions read **บันทึกซ่อม**, never "แจ้งซ่อม", because the glossary
  test refuses "แจ้งซ่อม" at the start of an action label. So the damaged buttons read "ยืนยันแล้วบันทึกซ่อม" and
  "ยืนยันแล้วขอตัดจำหน่าย".
- Add messages only through `node scripts/messages-edit.mjs`. ICU plurals in English, `{x, number}` in Thai. Update
  `tests/i18n-plural-count.test.ts`.
- Source pins must be CRLF-safe.
- Never touch `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`,
  `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- No Playwright, `next build` or DB commands by implementers.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Interfaces on the branch:**
- `POST /api/audit-rounds/[id]/confirm-results` with `{ assetIds, reason, outcome: "confirm" | "damaged" | "missing" }`.
  The `damaged` outcome takes exactly 1 id. The answers are 200 / 409 `blocked` / 400 `fieldErrors`.
- `src/lib/inspection-confirm-data.ts` `loadRoundInspectionRows`; `src/lib/inspection-confirm-page-model.ts`.
- The confirm page and components in `src/components/audit/inspection-confirm/`:
  - the workspace, the row and the dialog;
  - the result provider in `confirm/layout.tsx`.

## Review Focus

1. **A user leaves the repair or disposal form after confirming a damaged asset.** The asset stays confirmed, and the
   confirm row is gone. The data-quality flag is the reminder (spec §6a). Task 3 pins that the navigation happens only
   after a 200.
2. **A Missing asset is offered for a sale or destroy request.** Every disposal type except `lost` refuses it, in the
   API and in the picker. Task 1 tests each caller.
3. **A round has exactly 1 not-found asset left for disposal.** The link goes to the single form, not the batch form
   (minimum 2). Task 3 pins both branches.
4. **More than 100 lost assets.** The batch form pre-ticks the first 100 and says so. Task 4 pins the cap.
5. **The disposal round filter catches requests from both sources.** Requests made from the confirm page
   (`audit_round`) and from the findings page (`audit_finding` of a finding in the round). Task 2 tests the where.

---

### Task 1: Disposal policy for lost Missing assets, and a source on batches

**Files:**
- Modify: `src/lib/disposal-policy.ts`, `src/app/api/disposal-requests/route.ts`,
  `src/app/api/disposal-batches/route.ts`, `src/app/api/disposal-assets/route.ts`,
  `src/app/[locale]/(dashboard)/disposal/new/page.tsx`
- Modify: the batch request schema (find it from `api/disposal-batches/route.ts`) and `src/lib/disposal-batch.ts`
  (`DisposalBatchPacketInput` and `DisposalBatchPacket`)
- Test: `tests/disposal-policy-lost-missing.test.ts`; extend the existing disposal-batch tests

**Interfaces — Produces:**
- `getDisposalAssetEligibilityError(status, disposalType?: string | null): string | null`. `Missing` passes only for
  `"lost"`.
- **The picker:** `GET /api/disposal-assets?type=lost` treats `Missing` as eligible. Without `type`, nothing changes.
- **The batch body:** gains optional `sourceType`/`sourceId`, with the same validation as the single request
  (`optionalText`). Every request of the batch is created with them.

- [ ] **Step 1: Write the failing tests:**
  - **"lost takes Missing":** `getDisposalAssetEligibilityError({ name: "Missing" }, "lost")` is `null`.
  - **"other types refuse Missing":** with `"sell"` it is the existing message, and with no type it is the existing
    message.
  - **"Lost stays refused":** `getDisposalAssetEligibilityError({ name: "Lost" }, "lost")` is still refused.
  - **source pins:**
    - each of the three routes passes the request's `disposalType` (or the `type` query for the picker) to the
      function;
    - the batch route writes `sourceType: packet.sourceType ?? null` and `sourceId` on each request it creates.
  - **schema:** the batch schema accepts `sourceType: "audit_round"` with a uuid `sourceId`, and accepts their absence.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
  - **Prefill page:** `disposal/new/page.tsx` passes the URL's type when it has one. Otherwise it keeps today's
    behaviour, and the form re-checks when the type is chosen. If the form already re-validates the asset on type
    change through the picker, reuse that path. Do not invent a new one.
  - **Batch form picker:** it passes `?type=` when the chosen type is `lost`. Find the picker's fetch in
    `src/components/disposal/` and add the parameter there.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(disposal): lost requests take หาไม่พบ assets; batches carry a source
  (inspection-confirm plan 4 task 1)`.

---

### Task 2: The disposal list's round filter and the audit_round source label

**Files:**
- Modify: `src/lib/disposal-query.ts` (`parseDisposalListParams`, `buildDisposalWhere`, the href builder)
- Modify: the `/disposal` list page, to show the active filter as a removable chip with the round number. Find how the
  page renders its other filter chips.
- Modify: `src/lib/disposal-source.ts` (and wherever it resolves numbers for `audit_finding`)
- Modify: `messages/*.json`
- Test: extend the disposal-query and disposal-source tests (grep `tests/` for them)

**Interfaces — Produces:**
- **Param:** `auditRound` (uuid).
- **`buildDisposalWhere`** adds
  `OR: [{ sourceType: "audit_round", sourceId: id }, { sourceType: "audit_finding", sourceId: { in: <finding ids of round> } }]`.
  Since the where builder is sync, take the round's finding ids as an input resolved by the page or the API. Name it
  `auditRoundFindingIds`. Reading them must use `auditFinding.findMany({ where: { auditRoundId }, select: { id } })`.
- **Source link:** `disposal-source.ts` gives `audit_round` the kind `"audit_round"`, the number `auditNo`, and the href
  `/${locale}/audit/rounds/${sourceId}`.

**Messages:**
- `disposalPage.filterAuditRound`: th `มาจากรอบตรวจนับ {auditNo}`, en `From audit round {auditNo}`.
- The source label for `audit_round`: th `ตรวจนับ {number}`, en `Audit {number}`. Mirror the existing
  `sourceAuditFinding` key's shape.

- [ ] **Step 1: Write the failing tests:**
  - parse keeps a valid uuid `auditRound` and drops anything else;
  - the where has the OR above, with both branches;
  - the href builder keeps `auditRound` with `status=approved`;
  - `disposal-source` resolves `audit_round` to the round link.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement**, and make sure the export route applies the filter if it reads the same params.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(disposal): filter the queue by audit round; requests from a round link it
  (inspection-confirm plan 4 task 2)`.

---

### Task 3: The confirm page's damaged and not-found tabs, and its disposal line

**Files:**
- Modify: `src/components/audit/inspection-confirm/inspection-confirm-workspace.tsx`, `inspection-row.tsx`,
  `inspection-confirm-dialog.tsx` (an `outcome` prop)
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/confirm/page.tsx`
- Modify: `src/lib/inspection-confirm-data.ts`, adding
  `loadRoundDisposalSummary(db, auditRoundId): Promise<{ missingForDisposal: Array<{ assetId: string; assetTag: string }>; requests: number; approved: number }>`
- Modify: `src/lib/inspection-confirm-page-model.ts`, adding
  `lostDisposalHref(locale, roundId, missing: readonly { assetId: string }[], returnTo: string): string | null`.
  It returns null for 0 assets, the single form for 1, and the batch form (`?type=lost&fromAuditRound=`) for 2 or more.
- Modify: `src/lib/operational-return-navigation.ts` (`normalizeMaintenanceReturnTo`)
- Modify: `messages/*.json`; remove the now-unused `laterTabNote` usage (keep or delete the key; delete it if unused)
- Test: extend `tests/inspection-confirm-page-model.test.ts`, `tests/inspection-confirm-page-ui.test.ts` and the
  return-navigation tests

**`loadRoundDisposalSummary`:**
- **`missingForDisposal`:** assets of the round whose item has `auditResult: "not_found"`, whose current status name is
  `Missing`, and which have no disposal request with `requestStatus` in `pending`/`approved` and `isActive`. Order them
  by tag.
- **`requests` / `approved`:** active disposal requests whose source is this round (both branches of Task 2's where),
  counted all together and then with `requestStatus: "approved"`.

**Damaged tab:**
- Each row gets two buttons, "ยืนยันแล้วบันทึกซ่อม" and "ยืนยันแล้วขอตัดจำหน่าย". Each opens the dialog with
  `outcome: "damaged"` for one asset.
- On 200, navigate with `router.push` to the matching form:
  - **บันทึกซ่อม:** `/${locale}/maintenance/new?assetId=<id>&returnTo=<this page with tab=damaged>`.
  - **ขอตัดจำหน่าย:** `/${locale}/disposal/new?assetId=<id>&sourceType=audit_round&sourceId=<roundId>&returnTo=<same>`.
- On 409 or 400, behave as plan 3 does.
- The buttons show only with `canConfirm`. The repair button also needs `maintenance:create` and the disposal button
  `disposal:create`. The page passes the three flags. A missing permission hides that button.

**Not-found tab:**
- Ticks and select-all as in พร้อมยืนยัน: every row is selectable, and its target is `Missing`.
- The bar's primary is "ตั้งเป็นหาไม่พบ…". It opens the dialog with `outcome: "missing"`, the lines
  "ตั้งเป็น หาไม่พบ n", and the missing default reason.
- **The lost-disposal block:** below the tab's table, and also when the tab is empty, while `missingForDisposal` is not
  empty. It reads "ชิ้นที่ตั้งเป็นหาไม่พบจากรอบนี้: n ชิ้น", with a link "ขอตัดจำหน่ายแบบสูญหาย…" from
  `lostDisposalHref`. It shows only with `disposal:create`.

**Disposal line:**
- Under the page header: "ขอตัดจำหน่ายจากรอบนี้: {requests, number} รายการ · อนุมัติแล้ว {approved, number}", shown
  while `requests > 0`.
- When `approved > 0`, add a link "ไปสร้างรอบตัดจำหน่าย" to `/${locale}/disposal?status=approved&auditRound=<id>`.

**Messages** (`inspectionConfirmPage.*`, th / en):

| Key | th | en |
|---|---|---|
| `damagedRepair` | ยืนยันแล้วบันทึกซ่อม | Confirm, then record a repair |
| `damagedDispose` | ยืนยันแล้วขอตัดจำหน่าย | Confirm, then request disposal |
| `damagedReasonDefault` | ยืนยันตามผลตรวจนับรอบ {auditNo} | Confirmed by audit round {auditNo} |
| `missingOpen` | ตั้งเป็นหาไม่พบ… | Set as not found… |
| `missingDialogTitle` | ตั้งเป็นหาไม่พบ {count, number} ชิ้น | ICU plural |
| `missingDialogLine` | ตั้งเป็น หาไม่พบ | Set to Not found |
| `missingReasonDefault` | ตรวจนับรอบ {auditNo} ไม่พบ | Not found in audit round {auditNo} |
| `missingSubmit` | ตั้งเป็นหาไม่พบ {count, number} ชิ้น | ICU plural |
| `missingSuccess` | ตั้งเป็นหาไม่พบแล้ว {count, number} ชิ้น | ICU plural |
| `lostBlock` | ชิ้นที่ตั้งเป็นหาไม่พบจากรอบนี้: {count, number} ชิ้น | ICU plural |
| `lostLink` | ขอตัดจำหน่ายแบบสูญหาย… | Request disposal as lost… |
| `disposalLine` | ขอตัดจำหน่ายจากรอบนี้: {requests, number} รายการ · อนุมัติแล้ว {approved, number} | ICU |
| `disposalRoundLink` | ไปสร้างรอบตัดจำหน่าย | Create a disposal round |

- [ ] **Step 1: Write the failing tests:**
  - **`lostDisposalHref`:**
    - 0 assets → `null`;
    - 1 asset → `/th/disposal/new?assetId=a1&sourceType=audit_round&sourceId=r1&returnTo=…`;
    - 3 assets → `/th/disposal/batch/new?type=lost&fromAuditRound=r1&returnTo=…`.
  - **Return navigation:**
    - `normalizeMaintenanceReturnTo("th", "/th/audit/rounds/<uuid>/confirm?tab=damaged", "maintenance")` keeps it;
    - `/th/audit/rounds/x/confirm` is not a uuid, so it falls back.
  - **UI source pins:**
    - the damaged buttons post `outcome: "damaged"`, and navigate with `router.push` only inside the 200 branch;
    - the not-found bar posts `outcome: "missing"`;
    - the page passes `canRepair` / `canDispose` from `hasPermission(user, "maintenance", "create")` and
      `hasPermission(user, "disposal", "create")`;
    - the disposal line links `status=approved&auditRound=`.
  - **Data pin:** `loadRoundDisposalSummary` filters `requestStatus: { in: ["pending", "approved"] }` and the
    `Missing` status by name.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(audit): damaged rows confirm and go on to the repair or disposal form; not-found rows
  become หาไม่พบ in bulk; the page links its disposals (inspection-confirm plan 4 task 3)`.

---

### Task 4: The batch form opens pre-filled from a round

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/batch/new/page.tsx`
- Modify: `src/components/disposal/disposal-batch-form.tsx`
- Test: extend the batch form/page tests

**Behaviour:**
- With `?type=lost&fromAuditRound=<uuid>`, the page reads `loadRoundDisposalSummary(prisma, id).missingForDisposal`.
  It keeps the first `DISPOSAL_BATCH_MAX_ASSETS` and builds the picker options for them the same way
  `/api/disposal-assets` builds its options. Extract that mapper into a shared function; do not copy it.
- The form gets these new props:
  - `initialMachines`;
  - `initialDisposalType: "lost"`;
  - `source: { sourceType: "audit_round"; sourceId }`, sent in the POST body;
  - `capNotice` when more than 100 were left out.
- It shows a notice "เลือกทรัพย์สินที่ตั้งเป็นหาไม่พบจากรอบ {auditNo} ไว้ให้ {count, number} ชิ้น" with a link back to
  the round's confirm page.
- The `returnTo` param (normalized as internal) drives the back link.
- **Ignored params:** without the params, or with an invalid id, the page behaves as today.

**Messages:**
- `disposalPage.batchForm.fromRoundNotice` (ICU plural in English).
- `disposalPage.batchForm.fromRoundCapped`: th `เลือกให้ 100 ชิ้นแรก ส่งชุดนี้แล้วกลับมาขอชุดถัดไป`.

- [ ] **Step 1: Write the failing tests:**
  - the page calls `loadRoundDisposalSummary(` only when both params are valid;
  - it slices to `DISPOSAL_BATCH_MAX_ASSETS`;
  - the form's POST body includes `sourceType` and `sourceId` when `source` is given;
  - the initial type is `"lost"`;
  - the shared option mapper is used by both the route and the page.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(disposal): the batch form opens with a round's หาไม่พบ assets for a lost request
  (inspection-confirm plan 4 task 4)`.

---

### Task 5: E2E — damaged and not-found paths

**Files:**
- Modify: `e2e/audit/inspection-confirm.spec.ts` and its words; or create `e2e/audit/inspection-confirm-more.spec.ts`
  if the first spec would grow past one story. Prefer a new spec.

**Story** (desktop-light and phone-light, as the plan 3 spec):
- **Setup:**
  - A run round with 4 run assets: two not found, and one checked with condition เสียหาย. The scan then files a
    `wrong_condition` finding, as the walk does today.
  - The IT head approves the findings.
  - `markUnderInspection` marks all of them. This uses the one allowed DB-write helper; no new DB access.
- **Damaged:**
  - The tab lists the damaged asset.
  - "ยืนยันแล้วบันทึกซ่อม" → dialog → confirm → the repair form opens with the asset preselected and a back link to
    the confirm page.
  - **Do not submit the repair form.**
  - The asset's status is the §4 target.
- **Not found:**
  - Select both → "ตั้งเป็นหาไม่พบ…" → confirm → both rows leave.
  - The lost block shows 2 with the link.
  - Open it: the batch form shows both pre-ticked and the type `lost`.
  - **Do not submit.**
- **Wrong type:** the picker with type sell does not offer a หาไม่พบ asset. Check it on the batch form by switching the
  type, if the form allows; otherwise skip this check.

- [ ] **Step 1: Write the spec and the words.** Copy the words from `messages/th.json`.
- [ ] **Step 2: Run** `npm test`, which includes the e2e word pins.
- [ ] **Step 3: Commit:** `test(audit): E2E for damaged and not-found confirmation and the lost batch prefill
  (inspection-confirm plan 4 task 5)`.

---

## Controller steps after Task 5 (not for implementers)

- **Build:** `(npx next build || npx next build)`, then probe the dev DB.
- **E2E:** `npx playwright test e2e/audit e2e/disposal e2e/repair e2e/cross-cutting --reporter=line`. The disposal and
  repair specs run because their policy and forms changed.
- **Look step:**
  - the damaged and not-found tabs;
  - the batch form pre-filled;
  - the disposal list with the round chip.
- **Final review:** 3 lenses, then one fix wave.
- **Docs:** changelog, handoff, wiki and memory.
