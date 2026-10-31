# Page Group 3 (Transactions), Plan 3: โอนย้าย — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The โอนย้าย page is rebuilt to the TX-Transfer boards: three numbered sections, a ตอนนี้ → ปลายทาง table, reason chips, a "สรุปก่อนบันทึก" card, a sticky footer, and a stacked phone layout. The transfer route writes the department by the spec's rule (§6), refuses inactive destinations, ignores destinations equal to the current value, and refuses a broken asset only when it goes to a new holder.

**Architecture:**
- **Pure rules hold every decision.** The route and the page call the same function:
  - the department (`asset-department-rule.ts`);
  - the equal-to-current normalizer (`transfer-rules.ts`);
  - the broken-asset verdict (`getTransferVerdict`);
  - the form's rows, lead, footer, review and chips (`transfer-form-rules.ts`).
- **One normalized change set** drives the payload, the summary, the review, the S-R40 re-ask and the route's operation and status.
- **The form** is rebuilt on plans 1-2's shared frame and summary card, in รับคืน's shape: one stacked page on the phone, no steps.
- **No schema change and no migration.**

**Tech Stack:**
- Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next-specific code) and React 19.
- next-intl (Thai first).
- Prisma 7 on SQL Server, zod 4.
- Tailwind 4 tokens, shadcn/Radix parts.
- `node --test` (`npm test`).
- Playwright E2E in 4 projects: desktop and phone × light and dark. The transaction specs run Chromium on the phone; only the files that call `runPhoneOnWebKit()` run WebKit.

**Spec:** `docs/superpowers/specs/2026-10-30-page-group-3-transactions-design.md`, with its addendum §19 (2026-10-31). This plan covers:
- §5: the โอนย้าย parts, footer, review, field errors and permissions;
- §6: the โอนย้าย rows and the ส่วนกลาง exception (plan 1's ruling P1-R1 moved the transfer route's rule here);
- §9: the desktop page (§9.1-9.3) and the phone (§9.4);
- §13: the transfer keys;
- §17: transfer;
- §19: the recorded question, answered by P3-R1;
- Appendix A, โอนย้าย.

Plan 4 covers ย้ายที่ตั้งหลายรายการ.

**Base:** `feat/group3-tx-checkin` at `5176554f`, which holds plan 2. Plan 2 is stacked on `feat/group3-tx-checkout` (plan 1 and its addendum). None of the three is merged.
**Branch:** `feat/group3-tx-transfer`.
**Dry run:** none. The plan follows the frame, card and rule-file pattern plans 1-2 already built, changes one route, and has no migration. The controller recommended none on 2026-10-31 and the user said "ทำแผน 3 ต่อเลย".

**Execution:**
- Subagent-driven: implementers are the `opus-medium-implementer` agent type, and the main session reviews each task itself.
- Tasks run in order 1 → 7.
- Line numbers are those of `5176554f`. A task names each block by its content where an earlier task moved it.

**E2E:** after Task 7 the controller runs `e2e/transactions e2e/cross-cutting e2e/asset-detail e2e/smoke` from a clean build, in all four projects. The whole suite runs once at the end of page group 3 (after plan 4).

## Global Constraints

**Words and messages**
- Words follow `docs/19_THAI_GLOSSARY.md`. "ตรวจทาน" is a dropped word: the footer says "ตรวจสอบและบันทึก".
- Rooms and employees read "code - name" in the pickers, the ตอนนี้ cells and the review. The summary card, the lead, the footer line and the locked department text use names alone (look L1). No raw code or id reaches the screen.
- Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together. Change files live in the session scratchpad folder `tx-group/msg/`. `common.save` does not change.

**Design**
- Shared parts and tokens only (DESIGN.md): no hex or rgba in tsx, no `dark:`, no `/NN` tints. Both themes.

**One rule, one function**

| Decision | Where it lives |
|---|---|
| Where the department comes from, and its value | `getTransferDepartmentSource` / `getTransferNextDepartmentId` in `src/lib/asset-department-rule.ts` (Task 1) |
| A destination equal to the current value is not a change | `normalizeTransferDestinations` in `src/lib/transfer-rules.ts` (Task 1), called by the route and the form |
| Whether a broken asset may go to a new holder | `getTransferVerdict` (Task 1), through the existing `getCheckoutConditionBlock` |
| What the form shows before saving | `src/lib/transfer-form-rules.ts` (Task 5), built on `getTransferFormChange` |

- **One normalized change set** drives:
  - the payload and the at-least-one check;
  - the card's rows and lead, the footer and the review;
  - the picker's `context.assignCustodian` and the S-R40 re-ask;
  - the route's operation and target status.

  Raw picks never decide any of these.
- **ส่วนกลาง and ส่วนควบ assets keep a free department** on โอนย้าย (spec §6, decision 10; P3-R2). บุคคล and Stock follow the holder.
- **The transfer never writes `branchId` or `assetTag`**, as today.

**Bounded reads**
- The search answers ≤20 rows and one total. The by-id detail reads one asset.
- The two new master-option flags are used by the transfer page only. The other three pages, their payloads and their pins are unchanged.

**Permissions**
- The page and the route need `asset:edit`, as today. Nothing on this page needs `maintenance:create`.

**V-form rules**
- Errors appear under the field, and focus goes to the first error.
- Toasts are only for what has no field.
- A 409 for a field that is not on screen or is disabled is a toast with a re-read, never a hidden field error.

**Code shape**
- No schema change and no migration.
- Pure rule files use relative `.ts` imports and `import type` only.
- Production is read only.

**Checks and commits**
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors) before its commit.
- A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Keep each file's line endings: CRLF files stay CRLF (`sed -i` converts them to LF). Leave no stray blank lines.
- Implementers run no build, no E2E and no database command; the controller does.
- Commit with the message each task gives. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Secrets and E2E**
- Never read or print `.env`, `.env.prod-admin` or `.env.e2e`.
- E2E runs on the dev DB only. It never runs LDAP sync, the settings save, Excel import, a failed login or a delete, and it never changes master data (rooms, employees, departments).

## Review Focus

1. **A held asset moved only to another room, whose stored department differs from its holder's:**
   - the card shows the department change;
   - the save writes the holder's department with a `department_change` line;
   - cancelling the TR- restores the old department.

   Task 1 (rule), Task 2 (route and a cancellation test), Task 5 (rows) and Task 7 (TR2) pin it.
2. **A destination equal to the current value, from a stale tab or an API caller:**
   - it is dropped;
   - a holder equal to the current one does not switch the status to ใช้งานอยู่;
   - with nothing left the route answers 400 under `toLocationId`, and a set that changed inside the transaction answers 409.

   Tasks 1 and 2 pin it.
3. **A holder chosen, then cleared with ×:** the department row unlocks, the department picked before stays cleared, the status row returns to คงสถานะเดิม, and the payload sends no holder. Tasks 5 and 6 pin it.
4. **A broken Ready asset:**
   - a room-only move saves;
   - picking a holder clears it with "นำ … ออกแล้ว: <reason>";
   - an API save with a holder is refused with 409 `ASSET_TRANSFER_CONDITION_BLOCKED` under `assetId`.

   Tasks 1, 2 and 7 (TR5) pin it.
5. **The detail read fails (VPN), or answers late after the asset was switched:** the department row is disabled, the card shows the failed notice with ลองอีกครั้ง, the review does not open, and a late answer for the old asset is dropped. Tasks 5 and 6 pin it.

## Rulings

These are the controller's calls on the spec. Each task copies the ones it carries. The appendix (Y1-Y20) records the calls made on the cross-check of the drafts.

- **P3-R1 (§19's question, for the user to confirm):** โอนย้าย refuses a broken asset **only when a real new holder is chosen**.
  - **Refused:** เสียหาย and ใช้งานไม่ได้ read "ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่"; ซาก reads "เป็นซาก รอตัดจำหน่าย โอนย้ายให้ผู้ถือครองใหม่ไม่ได้".
  - **Allowed:** moving a broken asset to another room (for example IT storage), or changing its department.
  - **Where it lives:** the verdict's last rule, through the existing `getCheckoutConditionBlock`. The route gives 409 `ASSET_TRANSFER_CONDITION_BLOCKED` under `assetId`.
  - **On the page:** the S-R40 re-ask clears the asset with "นำ … ออกแล้ว: <reason>". There is no ส่งซ่อม link.
  - **Side effect:** the asset page disables โอนย้าย for a broken บุคคล asset, as S-R40 does for Pending Repair.
- **P3-R2:** a ส่วนควบ moved on its own keeps a free department, as ส่วนกลาง does.
- **P3-R3 (the department):** the rule works on normalized ids.
  - **Source:** `getTransferDepartmentSource` answers `newHolder`, `currentHolder` or `free`:
    - ส่วนกลาง, ส่วนควบ and License answer `free`;
    - otherwise a new holder answers `newHolder`, and a current holder answers `currentHolder`.
  - **Value:** `getTransferNextDepartmentId` writes, for each source:
    - `newHolder`: the new holder's department;
    - `currentHolder`: the current holder's department, read without `isActive`;
    - `free`: the chosen department, or the current one.
  - **Inactive departments:** an inactive department on an active employee is written as it is.
  - **Old holders:** a Ready asset that carries an old holder follows that holder.
- **P3-R4 (equal to the current value):** a destination equal to the current value is not a change.
  - **The normalizer:** `normalizeTransferDestinations` drops it, and the form and the route both call it. A holder equal to the current one is dropped too, so the status stays.
  - **What counts:** the department correction alone is not a change.
  - **Route answers:**
    - nothing left before the transaction: 400 with the zod body (`toLocationId: transferDestinationRequired`);
    - a set that differs inside the transaction: 409 `ASSET_CHANGED_DURING_OPERATION`.
- **P3-R5 (the locked แผนก row):** the row is locked when the source is `newHolder` or `currentHolder`.
  - **How it shows:** a disabled `SearchableSelect id="transfer-to-department"` with the placeholder "ตามผู้ถือครอง: <name>".
  - **Without an asset:** the placeholder reads "เลือกทรัพย์สินก่อน" (Y5).
  - **Clearing:** choosing a holder that locks the row clears a picked department.
  - **The payload** never sends a locked department.
  - **Server:** a different department while locked gets 409 `ASSET_TRANSFER_DEPARTMENT_LOCKED`, with no field. The form answers with a toast and a re-read.
- **P3-R6 (inactive destinations):** every inactive room, holder or free department, all at once, gets 409 `ASSET_TRANSFER_DESTINATION_INACTIVE`.
  - **Field keys:** the refusal reuses checkout's field keys (`checkoutLocationInactive`, `checkoutReceiverInactive`, `checkoutDepartmentInactive`).
  - **New ids:** `transfer-to-custodian` and `transfer-to-department`.
  - **Field order:** asset → location → custodian → department → reason.
- **P3-R7 (`department_change`):** the route writes a `department_change` line on the parent only when the department changes.
  - It carries the transfer reference, `referenceType: "transfer"` with the transfer's id.
  - The history shows the department twice: the transfer line and this one. This is accepted.
  - `logAudit` gains `previousDepartmentId`.
- **P3-R8 (the TR- page):** it prints "แผนกเดิม".
- **P3-R9 (data):**
  - **The detail** gains `holderId`, `holderActive`, `holderDepartmentId`, `holderDepartmentName` and `ownerBranchId`.
  - **The master options** gain two flags, `employeeDepartment` and `locationBranch`, for the transfer page only.
  - **The preselect** reads the detail.
  - **Branches** are compared by id.
- **P3-R10 (a former holder):** a holder who has left reads "(พ้นสภาพ)".
- **P3-R11 (shared parts):**
  - `SearchableSelect` gains `currentValue`, `currentMark` and `labelVisuallyHidden`. The current option is disabled and marked "ตอนนี้".
  - `OperationSummaryCard` gains `lead`.
- **P3-R12 (summary words):**
  - **Lead:** "เปลี่ยน {count} อย่าง: {list}". The department correction counts. When the holder and the department both stay, the lead adds "· ผู้ถือครองและแผนกคงเดิม". The same text is the phone footer line.
  - **Rows:** ที่ตั้ง, ผู้ถือครอง, แผนก, สถานะ and ส่วนควบ. The ส่วนควบ row reads "ย้ายตาม {count} รายการ", plus "· ค้างคืน {count} รายการ" when components are outstanding.
  - **Desktop footer:** "โอนย้าย {tag}: {changes}".
  - **Checklist:** ทรัพย์สิน, เปลี่ยนอย่างน้อย 1 อย่าง, เหตุผล.
- **P3-R13 (cross-branch):** the line "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ {branch} ตามเดิม" shows when the destination room's branch id differs from the asset's own branch id. It depends on the room only.
- **P3-R14 (components):**
  - **Under the table:** "ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย".
  - **Section 1:** an info Notice for components with their own handover, and a warning Notice for outstanding components.
- **P3-R15 (detail reads):** the detail is read on every pick and again on submit, with the normalized holder.
  - **On failure:** the review does not open, and the card shows ลองอีกครั้ง.
  - **On a lock or changed-asset 409:** a toast and a re-read.
- **P3-R16 (reason chips):** four `aria-pressed` buttons in a labelled group.
  - **Writing:** a chip writes "<word>: " and replaces an earlier chip's prefix. อื่น ๆ only focuses the field.
  - **On the phone:** the chip reads "ปรับโครงสร้าง".
  - **Length:** text over 500 characters is refused under the field.
- **P3-R17 (section 2):** a CSS grid with the columns รายการ / ตอนนี้ / → / ปลายทาง.
  - **ตอนนี้ cells:** "code - name"; the room adds its branch.
  - **Labels:** the fields' labels are visually hidden.
  - **On the phone:** the rows stack.
- **P3-R18 (the review):** it lists real changes only.
  - **Codes:** the room and the employee keep "code - name".
  - **Extra lines:** a department line and the ส่วนควบ line (label ส่วนควบ, value "ย้ายตาม {count} รายการ").
  - **Last:** the status, then the reason.
- **P3-R19 (section 1):** a card with tag, status, name and photo, and the photo on the summary card. The arrival banner takes checkout's shape.
- **P3-R20:** no `expectedDepartmentId` guard.
- **P3-R21 (switching the asset):** the picks stay and everything is recomputed. Until the detail is ready the department row is disabled.
- **P3-R22:** a transfer to a holder still creates no HO-.
- **P3-R23 (phone E2E):** the specs centre controls before clicking.

## Recorded deviations and notes (Y8, Y11)

- **The E2E specs move one commit after the page.** They change in Task 7, the commit after Task 6. Spec §17 says "in the same task"; no E2E runs in between.
- **Lock order in the route:** the route reads the holders, the room and the department before it judges the lock. The refusal order is unchanged: the lock comes before the inactive fields.
- **Chip prefix:** a prefix is recognised as "<word>:" with any spaces after the colon.
- **Inactive current room:** the card shows the room as "code - name" only when the current room is inactive.
- **In Use asset with a new holder:** it reads คงสถานะเดิม.
- **Former holder:** the "(พ้นสภาพ)" mark shows in the card's holder "now" too.
- **Department preview:** the rows preview the department correction before any destination is picked. The lead, the footer and the checklist wait for a real change.
- **No re-read on `ASSET_TRANSFER_CONDITION_BLOCKED`:** the field error is enough.
- **A holder picked before the asset:** the list judges each asset as an assignment. So an asset that holder already has, and that is Pending Repair or broken, is refused until the asset is picked first (Y8; in the docs and UAT).

---

### Task 1: The transfer rules: the department, a destination equal to the current value, and a broken asset given to a new holder (spec §6, §9.2, §19 recorded question; P3-R1, P3-R2, P3-R3, P3-R4)

Three pure rules that the route (Task 2) and the form (Tasks 5-6) both call, so the summary and the save cannot disagree:
- where a transfer's department comes from, and its value;
- dropping a destination equal to the asset's current value;
- the verdict refusing a เสียหาย, ใช้งานไม่ได้ or ซาก asset, but only when a real new holder is chosen.

This task writes no route, page or form code. It is the plan's first task, so every line number below is HEAD `5176554f`'s.

The rulings this task carries:
- **P3-R1 (verdict part):** โอนย้าย refuses a broken asset **only when a real (normalized) new holder is chosen**.
  - `getTransferVerdict` adds one last rule, after the outstanding link, the ownership, the status and the open handover (as checkout's A1-R2): when `context.assignCustodian` is true and `getCheckoutConditionBlock(facts.conditionName)` gives a block, it returns `no(transferConditionBlockReasonKeys[block])`.
  - A room-only or department-only move of a broken asset stays allowed (moving it to IT storage is a real need). The bulk move does not read the condition.
  - The reason keys are new `asset.*` keys with transfer words. Checkout's keys say "ก่อนส่งมอบ" and are not reused.
  - **Accepted side effect:** the asset page asks บุคคล as an assign (`asset-actions.ts:153-155`), so it disables โอนย้าย for a broken บุคคล asset, as S-R40 already does for Pending Repair. A room-only move then starts from the menu.
  - No client code here: the picker and the S-R40 re-ask already read the verdict through the search. Task 2 adds the route's refusal.
- **P3-R2:** a ส่วนควบ (`component`) moved on its own keeps a free department, like ส่วนกลาง (`keepsOwnDepartment`). There is no refusal and no warning. License never reaches a transfer: the route refuses it first.
- **P3-R3:** one rule on **normalized** ids, in `src/lib/asset-department-rule.ts`:
  - `keepsOwnDepartment(ownership)` → `"free"`; else a new holder → `"newHolder"`; else a current holder → `"currentHolder"`; else `"free"`.
  - `"newHolder"` → `newHolderDepartmentId ?? currentDepartmentId`; `"currentHolder"` → `currentHolderDepartmentId ?? currentDepartmentId`; `"free"` → `chosenDepartmentId ?? currentDepartmentId`.
  - `"newHolder"` and `"currentHolder"` lock the แผนก row; a chosen department is then ignored by the rule (Task 2 refuses a different one before calling it).
  - The callers read the current holder's department **without** `isActive` (a holder who left still decides it). An inactive department on an active employee is written as it is (spec call 5). Neither is this rule's concern: it takes ids.
  - A Ready asset carrying an old holder (ข้อมูลเก่า) follows the spec literally: a holder is present, so it takes the holder's department (GP D21; the user is asked in the plan's list).
- **P3-R4 (the rule-file part):** a destination equal to the current value is not a change.
  - `normalizeTransferDestinations` drops each destination equal to the asset's current value, the holder included. A holder equal to the current one is therefore no new holder: the operation is `move_scope` and the status stays.
  - An empty string (the form's "ไม่เปลี่ยนแปลง", and `toDepartmentId: ""` from `e2e/asset-detail/detail-steps.ts`) and a missing field are no destination.
  - The implicit department correction (`"currentHolder"`) alone is **not** a change: `hasTransferChange` looks only at the normalized destinations.
  - `sameTransferDestinations` is the route's in-transaction re-check (Task 2: any difference → 409 `ASSET_CHANGED_DURING_OPERATION`).

**Files:**
- Create: `src/lib/transfer-rules.ts`
- Create: `tests/transfer-rules.test.ts`
- Modify: `src/lib/asset-department-rule.ts`
  - the header comment `:1-5` (its last line `// Plan 3 adds the transfer rule here.` is the slot);
  - the transfer type and the two functions go after `getLateReturnDepartmentId` (`:40-50`), before `function keepsOwnDepartment` (`:52-54`).
- Modify: `src/lib/asset-lifecycle-policy.ts`
  - the comment above `export type CheckoutConditionBlock` (`:215-216`);
  - `transferConditionBlockReasonKeys` right after `checkoutConditionBlockReasonKeys` (`:229-234`), before `// The server's legacy return …` (`:236`).
- Modify: `src/lib/asset-operation-eligibility.ts`
  - the import block `:1-8`;
  - the comment above `getTransferVerdict` (`:133-134`) and its body (`:135-144`).
- Modify: `src/lib/asset-actions.ts`: the `conditionName` doc comment (`:62`) only, widened to name โอนย้าย to a new holder (ruling Y14). No code changes there.
- Modify: `messages/th.json`, `messages/en.json`, through `node scripts/messages-edit.mjs` only (three `asset.*` keys).
- Test: `tests/asset-department-rule.test.ts` (the import `:4`; four tests appended).
- Test: `tests/asset-operation-eligibility.test.ts` (`:68-72` rewritten; one test after `:73`; the parity test's tail after `:190`; the words test after `:204` and its key list `:221-222`).
- Test: `tests/asset-operation-condition-policy.test.ts` (the import `:4-16`; one assertion after `:83`).

**Existing pins this task breaks, rewritten in this commit:**
- `tests/asset-operation-eligibility.test.ts:68-72` (A1-R3: `getTransferVerdict(broken, { assignCustodian: true })` is `yes`). Under P3-R1 it is refused; the move and the bulk move stay `yes` (Step 1).
- `tests/asset-operation-eligibility.test.ts:221-222`: the list of every reason key the verdicts can give gains the three transfer keys. The loop at `:215-220` already reaches them: `getTransferVerdict(f, { assignCustodian: true })` over `conditionNames` (Step 1).
- `tests/asset-department-rule.test.ts:4`: the import line names the two new exports.

**These stay green with no edit.** Name any that does not in the report.
- `tests/asset-operation-search-rules.test.ts:236-243`: the transfer row is built without `assignCustodian`, so it is judged as `move_scope` and a Damaged asset stays eligible (GP W10).
- `tests/asset-operation-search-rules.test.ts:206-212`: the search verdict equals `getTransferVerdict` with and without `assignCustodian=1`. It delegates, so it follows.
- `tests/asset-operation-eligibility.test.ts:111-124` (โอนย้าย statuses, `conditionName: null`), `:136-145` (the outstanding link first), and the parity loop `:172-186`: `getAssetActions` calls the same verdict with the same context, so it follows.
- `tests/asset-register-transactions.test.ts:76-83` (the `"asset.transactionReasonOpenCheckout"` literal stays in the eligibility file).
- `tests/asset-register-transactions.test.ts:98-99` (`asset-actions.ts` stays pure) and `tests/open-repair-filter.test.ts:23` (its `maintenance/new?assetId=` link): both read `asset-actions.ts`'s source, and Step 3f changes only a comment there.
- `tests/asset-transfer-status.test.ts` (`getTransferTargetStatusName` is unchanged).
- `tests/checkout-form-rules.test.ts`: `isCheckoutConditionReasonKey` and `checkoutRepairLinkShown` read `checkoutConditionBlockReasonKeys` only. The transfer keys are not condition keys for the ส่งมอบ picker, and no transfer picker gets `pickBlocked`.
- `tests/thai-glossary.test.ts` and `tests/messages-parity.test.ts`.

**Interfaces:**
- Consumes:
  - `type AssetOwnershipType` (`src/lib/asset-ownership.ts:6`), already imported as a type by `asset-department-rule.ts:6`;
  - the private `keepsOwnDepartment(ownership)` (`asset-department-rule.ts:52-54`: shared, component, software_license);
  - `type CheckoutConditionBlock = "damaged" | "nonFunctional" | "salvage"` (`asset-lifecycle-policy.ts:217`);
  - `getCheckoutConditionBlock(conditionName: string | null | undefined): CheckoutConditionBlock | null` (`:225-227`). It folds case and surrounding spaces; Not Assessed is not blocked;
  - `AssetOperationFacts.conditionName` (`asset-operation-eligibility.ts:27-28`), filled by every facts builder (`asset-actions.ts:122-131`, the search);
  - `getTransferTargetStatusName(toCustodianId?: string | null): "In Use" | null` (`asset-lifecycle-policy.ts:303-305`), in one test only.
- Produces (the names are the skeleton's; Tasks 2, 5 and 6 import them):
  ```ts
  // src/lib/asset-department-rule.ts (pure; import type only)
  export type TransferDepartmentSource = "newHolder" | "currentHolder" | "free"
  export function getTransferDepartmentSource(input: {
    ownership: AssetOwnershipType
    currentCustodianId: string | null
    newCustodianId: string | null      // normalized: a holder equal to the current one arrives as null
  }): TransferDepartmentSource
  export function getTransferNextDepartmentId(input: {
    ownership: AssetOwnershipType
    currentCustodianId: string | null
    newCustodianId: string | null
    currentDepartmentId: string | null
    currentHolderDepartmentId: string | null
    newHolderDepartmentId: string | null
    chosenDepartmentId: string | null
  }): string | null

  // src/lib/transfer-rules.ts (pure, client-safe, no imports)
  export type TransferDestinations = { toLocationId: string | null; toCustodianId: string | null; toDepartmentId: string | null }
  export type TransferCurrentValues = { currentLocationId: string; custodianId: string | null; departmentId: string | null }
  export function normalizeTransferDestinations(sent: Partial<TransferDestinations>, current: TransferCurrentValues): TransferDestinations
  export function hasTransferChange(destinations: TransferDestinations): boolean
  export function sameTransferDestinations(a: TransferDestinations, b: TransferDestinations): boolean

  // src/lib/asset-lifecycle-policy.ts
  export const transferConditionBlockReasonKeys: Readonly<Record<CheckoutConditionBlock, string>>

  // src/lib/asset-operation-eligibility.ts: signature unchanged; one rule added last
  export function getTransferVerdict(facts: AssetOperationFacts, context: { assignCustodian: boolean }): AssetOperationVerdict
  ```
  - **The normalizer** returns exactly `{ toLocationId, toCustodianId, toDepartmentId }`, with each field being one of:
    - null when the sent value is `undefined`, `null` or `""`;
    - null when the sent value equals the current one (`toLocationId` against `currentLocationId`, `toCustodianId` against `custodianId`, `toDepartmentId` against the **stored** `departmentId`);
    - otherwise the sent value.

    It does not trim: zod's `optionalText` trims for the route, and the form sends option ids.
  - **`sent` is `Partial<TransferDestinations>`**, so the callers can pass what they already hold:
    - Task 2 passes the parsed body (`optionalText` gives `string | null | undefined`) and the asset row (`currentLocationId`, `custodianId`, `departmentId`) directly;
    - Task 5 passes its `TransferFormDestinations` (`""` = ไม่เปลี่ยนแปลง).
  - **`hasTransferChange`** is true when any normalized field is non-null. **`sameTransferDestinations`** compares the three fields with `===`; its inputs are normalizer outputs.
  - **`getTransferVerdict`'s `context.assignCustodian`** must mean "a normalized new holder is chosen". The asset page keeps `ownership === "personal"` (`asset-actions.ts:155`). Task 6 sends the normalized holder as the picker's context and on the submit's re-read; the S-R40 re-ask keeps firing on a non-empty holder pick, and the picker's disabled current holder keeps that pick a real change.
  - **For Task 2:** the field keys `apiErrors.transferConditionDamaged|NonFunctional|Salvage` carry the same th and en words as this task's `asset.transactionReasonTransferCondition*` keys, as checkout's `checkoutCondition*` mirror `transactionReasonCondition*` (pinned by `tests/api-error-catalog.test.ts:148-160`). The route maps `getCheckoutConditionBlock(...)` to its own field keys; it does not read `transferConditionBlockReasonKeys`.
  - **A `toDepartmentId` equal to the stored `departmentId` is dropped before Task 2's lock check**, even when the row is locked to a holder whose department differs; the rule then writes the holder's department ("equal is not a change", and the rule decides a locked department). Task 2's lock test therefore uses a department that differs from both the stored one and the holder's.

- [ ] **Step 1: Write the failing tests.**
  - `tests/asset-department-rule.test.ts`: the import (`:4`) becomes
```ts
import {
  getCheckinNextDepartmentId, getCheckoutNextDepartmentId, getLateReturnDepartmentId, getOutstandingComponentCustody, getTransferDepartmentSource,
  getTransferNextDepartmentId,
} from "../src/lib/asset-department-rule.ts"
```
    Append (the file's purity pin `:33-37` then covers the new code too):
```ts

// โอนย้าย (group 3 spec §6, §9.2, call 4; group 3 plan 3, P3-R2, P3-R3). The holder ids are already normalized: a holder
// equal to the current one reaches these rules as no new holder (tests/transfer-rules.test.ts).
type TransferInput = Parameters<typeof getTransferNextDepartmentId>[0]
const transferDepartment = (ownership: AssetOwnershipType, holders: { current: string | null; next: string | null }, overrides: Partial<TransferInput> = {}) =>
  getTransferNextDepartmentId({
    ownership, currentCustodianId: holders.current, newCustodianId: holders.next, currentDepartmentId: "dept-now",
    currentHolderDepartmentId: "dept-holder", newHolderDepartmentId: "dept-new", chosenDepartmentId: "dept-chosen", ...overrides,
  })
// Held + a new holder, no holder + a new holder, held + no new holder, no holder + no new holder.
const holderCases = [
  { current: "emp-old", next: "emp-new" }, { current: null, next: "emp-new" }, { current: "emp-old", next: null }, { current: null, next: null },
] as const

test("โอนย้าย: where the department comes from, per ownership and holder; a ส่วนควบ moved on its own stays free like ส่วนกลาง (group 3 spec §6, §9.2; P3-R2, P3-R3)", () => {
  const source = (ownership: AssetOwnershipType) =>
    holderCases.map(({ current, next }) => getTransferDepartmentSource({ ownership, currentCustodianId: current, newCustodianId: next }))
  for (const ownership of ["personal", "stock"] as const) assert.deepEqual(source(ownership), ["newHolder", "newHolder", "currentHolder", "free"], ownership)
  for (const ownership of ["shared", "component", "software_license"] as const) assert.deepEqual(source(ownership), ["free", "free", "free", "free"], ownership)
})

test("โอนย้าย: บุคคล and Stock follow the new holder, else the current holder, else the chosen department; ส่วนกลาง and ส่วนควบ take the chosen one or keep theirs (spec §6, decision 10, P3-R2, P3-R3)", () => {
  for (const ownership of ["personal", "stock"] as const) {
    assert.deepEqual(holderCases.map((holders) => transferDepartment(ownership, holders)), ["dept-new", "dept-new", "dept-holder", "dept-chosen"], ownership)
  }
  for (const ownership of ["shared", "component", "software_license"] as const) {
    assert.deepEqual(holderCases.map((holders) => transferDepartment(ownership, holders)), ["dept-chosen", "dept-chosen", "dept-chosen", "dept-chosen"], ownership)
    assert.deepEqual(holderCases.map((holders) => transferDepartment(ownership, holders, { chosenDepartmentId: null })), ["dept-now", "dept-now", "dept-now", "dept-now"], `${ownership}, none chosen`)
  }
})

test("โอนย้าย: a held asset moved only to another room takes its holder's department, which corrects a stored mismatch; a locked row ignores a chosen department (spec §6 call 4, P3-R3, Review Focus 1)", () => {
  const roomOnly = { current: "emp-old", next: null }
  assert.equal(transferDepartment("personal", roomOnly, { currentDepartmentId: "dept-stale" }), "dept-holder")
  assert.equal(transferDepartment("stock", roomOnly, { currentDepartmentId: "dept-holder" }), "dept-holder", "already the holder's: no change")
  assert.equal(transferDepartment("personal", { current: "emp-old", next: "emp-new" }, { chosenDepartmentId: "dept-other" }), "dept-new")
  assert.equal(transferDepartment("personal", roomOnly, { chosenDepartmentId: "dept-other" }), "dept-holder")
})

test("โอนย้าย: an unread holder department falls back to the current one, and an asset with no department stays with none (P3-R3)", () => {
  assert.equal(transferDepartment("personal", { current: null, next: "emp-new" }, { newHolderDepartmentId: null }), "dept-now", "the new holder's department unread")
  assert.equal(transferDepartment("stock", { current: "emp-old", next: null }, { currentHolderDepartmentId: null }), "dept-now", "the current holder's row missing")
  assert.equal(transferDepartment("personal", { current: null, next: null }, { chosenDepartmentId: null }), "dept-now", "nothing chosen")
  const none = { currentDepartmentId: null, currentHolderDepartmentId: null, newHolderDepartmentId: null, chosenDepartmentId: null }
  for (const ownership of ["personal", "stock", "shared", "component"] as const) {
    assert.deepEqual(holderCases.map((holders) => transferDepartment(ownership, holders, none)), [null, null, null, null], ownership)
  }
})
```
  - Create `tests/transfer-rules.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getTransferDepartmentSource, getTransferNextDepartmentId } from "../src/lib/asset-department-rule.ts"
import { getTransferTargetStatusName } from "../src/lib/asset-lifecycle-policy.ts"
import {
  hasTransferChange, normalizeTransferDestinations, sameTransferDestinations, type TransferCurrentValues, type TransferDestinations,
} from "../src/lib/transfer-rules.ts"

// The asset now: room loc-now, held by emp-now, department dept-now.
const current: TransferCurrentValues = { currentLocationId: "loc-now", custodianId: "emp-now", departmentId: "dept-now" }
const none: TransferDestinations = { toLocationId: null, toCustodianId: null, toDepartmentId: null }
const sent = (overrides: Partial<TransferDestinations>): TransferDestinations => ({ ...none, ...overrides })

test("a destination equal to the current value is dropped, field by field; a different one is kept (group 3 spec §9.2, call 17; P3-R4)", () => {
  assert.deepEqual(normalizeTransferDestinations(sent({ toLocationId: "loc-now" }), current), none)
  assert.deepEqual(normalizeTransferDestinations(sent({ toCustodianId: "emp-now" }), current), none)
  assert.deepEqual(normalizeTransferDestinations(sent({ toDepartmentId: "dept-now" }), current), none)
  assert.deepEqual(normalizeTransferDestinations(sent({ toLocationId: "loc-2" }), current), sent({ toLocationId: "loc-2" }))
  assert.deepEqual(normalizeTransferDestinations(sent({ toCustodianId: "emp-2" }), current), sent({ toCustodianId: "emp-2" }))
  assert.deepEqual(normalizeTransferDestinations(sent({ toDepartmentId: "dept-2" }), current), sent({ toDepartmentId: "dept-2" }))
  assert.deepEqual(
    normalizeTransferDestinations({ toLocationId: "loc-2", toCustodianId: "emp-now", toDepartmentId: "dept-now" }, current),
    sent({ toLocationId: "loc-2" }),
    "only the room changes",
  )
  assert.deepEqual(
    normalizeTransferDestinations({ toLocationId: "loc-2", toCustodianId: "emp-2", toDepartmentId: "dept-2" }, current),
    { toLocationId: "loc-2", toCustodianId: "emp-2", toDepartmentId: "dept-2" },
  )
})

test("an empty string or a missing field is no destination; an asset with no holder or department compares against null (P3-R4)", () => {
  assert.deepEqual(normalizeTransferDestinations({ toLocationId: "", toCustodianId: "", toDepartmentId: "" }, current), none, "the form's ไม่เปลี่ยนแปลง")
  assert.deepEqual(normalizeTransferDestinations({ toDepartmentId: "" }, current), none, "an API caller's toDepartmentId: \"\"")
  assert.deepEqual(normalizeTransferDestinations({}, current), none)
  const unheld: TransferCurrentValues = { currentLocationId: "loc-now", custodianId: null, departmentId: null }
  assert.deepEqual(normalizeTransferDestinations(sent({ toCustodianId: "emp-2", toDepartmentId: "dept-2" }), unheld), sent({ toCustodianId: "emp-2", toDepartmentId: "dept-2" }))
  assert.deepEqual(normalizeTransferDestinations({ toLocationId: "", toCustodianId: "", toDepartmentId: "" }, unheld), none)
})

test("a transfer needs at least one destination left after normalizing (P3-R4)", () => {
  assert.equal(hasTransferChange(none), false)
  for (const field of ["toLocationId", "toCustodianId", "toDepartmentId"] as const) assert.equal(hasTransferChange(sent({ [field]: "x-2" })), true, field)
  assert.equal(hasTransferChange(normalizeTransferDestinations({ toLocationId: "loc-now", toCustodianId: "emp-now", toDepartmentId: "dept-now" }, current)), false, "all equal: nothing left")
})

test("two normalized sets are the same only when every field is (the route's in-transaction re-check, P3-R4)", () => {
  const set = { toLocationId: "loc-2", toCustodianId: "emp-2", toDepartmentId: null }
  assert.equal(sameTransferDestinations(set, { ...set }), true)
  assert.equal(sameTransferDestinations(none, sent({})), true)
  assert.equal(sameTransferDestinations(set, { ...set, toLocationId: "loc-3" }), false)
  assert.equal(sameTransferDestinations(set, { ...set, toCustodianId: null }), false, "the chosen holder became the current one")
  assert.equal(sameTransferDestinations(set, { ...set, toDepartmentId: "dept-2" }), false)
})

test("re-picking the current holder is not a new holder: the status stays and the department follows the current holder (Review Focus 2, P3-R3, P3-R4)", () => {
  const destinations = normalizeTransferDestinations(sent({ toLocationId: "loc-2", toCustodianId: "emp-now" }), current)
  assert.deepEqual(destinations, sent({ toLocationId: "loc-2" }))
  assert.equal(getTransferTargetStatusName(destinations.toCustodianId), null, "no switch to ใช้งานอยู่")
  const holders = { ownership: "personal" as const, currentCustodianId: current.custodianId, newCustodianId: destinations.toCustodianId }
  assert.equal(getTransferDepartmentSource(holders), "currentHolder")
  assert.equal(getTransferNextDepartmentId({
    ...holders, currentDepartmentId: "dept-now", currentHolderDepartmentId: "dept-holder", newHolderDepartmentId: null, chosenDepartmentId: destinations.toDepartmentId,
  }), "dept-holder")
})

test("the rules stay pure and client-safe: import type only, relative .ts paths, no database", () => {
  const source = readFileSync("src/lib/transfer-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\.|server-only/)
  for (const line of source.split(/\r?\n/).filter((line) => line.startsWith("import "))) assert.match(line, /^import type \{[^}]+\} from "\.\/[\w-]+\.ts"$/, line)
})
```
  - `tests/asset-operation-eligibility.test.ts`:
    - Replace `:68-72` (from the comment `// The condition is ส่งมอบ's rule only …` to `assert.deepEqual(getBulkMoveVerdict(broken), yes)`) with:
```ts
  // รับคืน and the bulk move do not read the condition; โอนย้าย reads it only for a new holder (P3-R1, which answers A1-R3).
  const broken = facts({ statusName: "In Use", custodianId: "e-1", conditionName: "Damaged" })
  assert.deepEqual(getCheckinVerdict(broken), { ...yes, path: "legacy" })
  assert.deepEqual(getTransferVerdict(broken, { assignCustodian: true }), no("asset.transactionReasonTransferConditionDamaged"))
  assert.deepEqual(getTransferVerdict(broken, { assignCustodian: false }), yes)
  assert.deepEqual(getBulkMoveVerdict(broken), yes)
```
    - After that test's closing `})` (`:73`), add:
```ts

test("โอนย้าย refuses a เสียหาย, ใช้งานไม่ได้ or ซาก asset only for a new holder, last, after the outstanding link, the ownership, the status and the open handover (group 3 spec §19 recorded question; plan 3 P3-R1)", () => {
  const assign = { assignCustodian: true }
  const move = { assignCustodian: false }
  const blocks = [
    ["Damaged", "asset.transactionReasonTransferConditionDamaged"],
    ["Non-functional", "asset.transactionReasonTransferConditionNonFunctional"],
    ["Salvage", "asset.transactionReasonTransferConditionSalvage"],
  ] as const
  for (const ownership of ["personal", "shared", "stock", "component"] as const) for (const statusName of ["Ready", "In Use"]) {
    for (const [conditionName, reasonKey] of blocks) {
      const where = `${ownership} ${statusName} ${conditionName}`
      assert.deepEqual(getTransferVerdict(facts({ ownership, statusName, conditionName }), assign), no(reasonKey), where)
      assert.deepEqual(getTransferVerdict(facts({ ownership, statusName, conditionName }), move), yes, `${where}: a room or department move stays allowed`)
    }
  }
  for (const conditionName of [null, "Not Assessed", "New", "Good", "Fair"]) assert.deepEqual(getTransferVerdict(facts({ conditionName }), assign), yes, String(conditionName))
  assert.deepEqual(getTransferVerdict(facts({ conditionName: " damaged " }), assign), no("asset.transactionReasonTransferConditionDamaged"), "the master name folded as checkout's")
  // The condition is the last rule: every earlier refusal keeps its own reason.
  assert.deepEqual(getTransferVerdict(facts({ conditionName: "Salvage", outstanding }), assign), no("asset.transactionReasonComponentOutstanding"), "the outstanding link first")
  assert.deepEqual(getTransferVerdict(facts({ ownership: "software_license", conditionName: "Damaged" }), assign), no("asset.transactionReasonLicenseMove"), "ownership first")
  assert.deepEqual(getTransferVerdict(facts({ statusName: "Pending Repair", conditionName: "Damaged" }), assign), no("asset.transactionReasonStatusNotTransferable"), "the status first")
  assert.deepEqual(getTransferVerdict(facts({ statusName: "In Use", openCheckout: handover("permanent_assignment"), conditionName: "Damaged" }), assign), no("asset.transactionReasonOpenCheckout"), "the open handover first")
  // A move to the repair room or IT storage: any status but Disposed/Retired, broken or not.
  assert.deepEqual(getTransferVerdict(facts({ statusName: "Pending Repair", conditionName: "Damaged" }), move), yes)
  assert.deepEqual(getBulkMoveVerdict(facts({ statusName: "Ready", conditionName: "Salvage" })), yes, "the bulk move does not read it")
})
```
    - In the parity test, after `assert.deepEqual(getTransferVerdict(inspected, { assignCustodian: false }), yes)` (`:190`) and before its closing `})`, add:
```ts
  // P3-R1, the same model: the asset page asks บุคคล as an assign, so a broken บุคคล asset's โอนย้าย is disabled with the
  // transfer words; ส่วนกลาง, Stock and ส่วนควบ move, and a room-only move of a บุคคล one starts from the menu.
  const brokenTransfer = (ownership: AssetActionInput["ownership"]) => {
    const set = getAssetActions({ ...base, ownership, statusName: "In Use", custodianId: "e-1", conditionName: "Damaged" })
    const action = [...(set.primary ? [set.primary] : []), ...set.transactions].find((item) => item.key === "transfer")
    return [action?.enabled, action?.reasonKey]
  }
  assert.deepEqual(brokenTransfer("personal"), [false, "asset.transactionReasonTransferConditionDamaged"])
  for (const ownership of ["shared", "stock", "component"] as const) assert.deepEqual(brokenTransfer(ownership), [true, null], ownership)
```
    - In the words test, after the checkout condition words (`:199-204`, ending `["เป็นซาก รอตัดจำหน่าย ส่งมอบไม่ได้", "Salvage awaiting disposal. It cannot be handed over."],\n  ])`), add:
```ts
  // โอนย้าย to a new holder (plan 3 P3-R1): its own words; checkout's say "ก่อนส่งมอบ".
  assert.deepEqual(["Damaged", "NonFunctional", "Salvage"].map((name) => [th.asset[`transactionReasonTransferCondition${name}`], en.asset[`transactionReasonTransferCondition${name}`]]), [
    ["สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "Damaged: send it for repair before giving it to a new holder"],
    ["ใช้งานไม่ได้ ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "Not working: send it for repair before giving it to a new holder"],
    ["เป็นซาก รอตัดจำหน่าย โอนย้ายให้ผู้ถือครองใหม่ไม่ได้", "Salvage awaiting disposal: it cannot go to a new holder"],
  ])
```
    - In the same test's key list (`:221-222`), `"StatusNotReady", "StatusNotReturnable", "StatusNotTransferable", "WrittenOff"]` becomes `"StatusNotReady", "StatusNotReturnable", "StatusNotTransferable", "TransferConditionDamaged",` with `"TransferConditionNonFunctional", "TransferConditionSalvage", "WrittenOff"]` on the next line. The list stays in sort order: `[...keys].sort()` puts `Transfer…` after `StatusNot…` and before `WrittenOff`.
  - `tests/asset-operation-condition-policy.test.ts`: the import block (`:4-16`) gains `  transferConditionBlockReasonKeys,` after `  repairUsableConditionNames,`. In the test at `:68`, after the `checkoutConditionBlockReasonKeys` deepEqual (`:79-83`) and before the closing `})`, add:
```ts
  // โอนย้าย to a new holder refuses the same blocks with its own words (group 3 plan 3, P3-R1).
  assert.deepEqual(transferConditionBlockReasonKeys, {
    damaged: "asset.transactionReasonTransferConditionDamaged",
    nonFunctional: "asset.transactionReasonTransferConditionNonFunctional",
    salvage: "asset.transactionReasonTransferConditionSalvage",
  })
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/asset-department-rule.test.ts tests/transfer-rules.test.ts tests/asset-operation-eligibility.test.ts tests/asset-operation-condition-policy.test.ts`. Expected:
  - `asset-department-rule`: the file fails to load (`does not provide an export named 'getTransferDepartmentSource'`).
  - `transfer-rules`: `ERR_MODULE_NOT_FOUND` for `src/lib/transfer-rules.ts`.
  - `asset-operation-condition-policy`: the file fails to load (no export named `transferConditionBlockReasonKeys`).
  - `asset-operation-eligibility`: four tests fail and ten pass. The four are:
    - the ส่งมอบ condition test (the rewritten line gets `yes`);
    - the new โอนย้าย test (first message `personal Ready Damaged`);
    - the parity test (its new tail gets `[true, null]` for บุคคล);
    - the words test (the transfer words are `undefined`).

- [ ] **Step 3: Implement.**
  - **3a. The department rule.** In `src/lib/asset-department-rule.ts`:
    - Replace the header `:1-5` with:
      ```ts
      // The department a transaction save writes (group 3 spec §6, decisions 1, 2, 10).
      // Pure and client-safe: the checkout route and the checkout summary call getCheckoutNextDepartmentId; the checkin
      // route and the รับคืน summary call getCheckinNextDepartmentId; the late component return route and the late-return
      // summary call getLateReturnDepartmentId; the transfer route and the โอนย้าย form's rules call
      // getTransferDepartmentSource and getTransferNextDepartmentId (group 3 plan 3, P3-R3).
      ```
    - After `getLateReturnDepartmentId` (`:40-50`) and before `function keepsOwnDepartment` (`:52`), add `TransferDepartmentSource`, `getTransferDepartmentSource` and `getTransferNextDepartmentId` with the Produces signatures and P3-R3's table.
      - `getTransferNextDepartmentId` asks `getTransferDepartmentSource(input)` and switches on it, so the lock and the value cannot drift.
      - Above them, this comment:
        ```ts
        // โอนย้าย (spec §6, §9.2, call 4; group 3 plan 3, P3-R2, P3-R3). The ids are normalized first
        // (normalizeTransferDestinations): a holder equal to the current one is not a new holder. ส่วนกลาง, ส่วนควบ and License
        // keep a free department; บุคคล and Stock follow the new holder, else the current holder (the caller reads it without
        // isActive), else the chosen department. "newHolder" and "currentHolder" lock the แผนก row.
        ```
    - Keep `import type` only, and reuse the existing private `keepsOwnDepartment`. Do not export it.
  - **3b. The normalizer.** Create `src/lib/transfer-rules.ts` with the Produces exports and no imports. Its header comment:
    ```ts
    // A transfer destination equal to the asset's current value is not a change (group 3 spec §9.2, call 17; group 3 plan 3,
    // P3-R4). Pure and client-safe: the transfer route (before and inside its transaction) and the โอนย้าย form's rules call
    // it, and the normalized holder alone decides the operation, the status and the department's source.
    ```
    - One private helper may hold the per-field rule: `undefined`, `null` and `""` → null; equal to the current value → null; otherwise the value.
    - Write no trimming and no lock logic here. The form drops a locked department (Task 5) and the route refuses a different one (Task 2).
  - **3c. The reason keys.** In `src/lib/asset-lifecycle-policy.ts`:
    - The comment above `export type CheckoutConditionBlock` (`:215-216`) becomes:
      ```ts
      // A recorded เสียหาย, ใช้งานไม่ได้ or ซาก refuses a handover (group 3 spec §19.2) and a transfer to a new holder (group 3
      // plan 3, P3-R1): the pickers, the asset page and the checkout and transfer routes all ask this. ยังไม่ประเมิน is not refused.
      ```
    - After `checkoutConditionBlockReasonKeys` (`:229-234`), add `transferConditionBlockReasonKeys`, typed `Readonly<Record<CheckoutConditionBlock, string>>` as checkout's, with the three keys the test pins. Its doc comment: `/** โอนย้าย to a new holder refuses the same blocks with its own words (group 3 plan 3, P3-R1); checkout's say "ก่อนส่งมอบ". */`.
  - **3d. The verdict.** In `src/lib/asset-operation-eligibility.ts`:
    - Add `transferConditionBlockReasonKeys,` to the import from `./asset-lifecycle-policy.ts` (`:1-8`), after `normalizeAssetStateName,`. The purity pin `:226-230` holds.
    - In `getTransferVerdict` (`:135-144`), after `if (facts.openCheckout) return no("asset.transactionReasonOpenCheckout")` and before `return yes`: when `context.assignCustodian` is true, `const block = getCheckoutConditionBlock(facts.conditionName)`, then `if (block) return no(transferConditionBlockReasonKeys[block])`.
    - The comment above it (`:133-134`) becomes:
      ```ts
      // api/assets/[id]/transfer: a custodian is assign_custodian, a move without one is move_scope; then the open handover
      // (user decision 2026-10-21 Y2; S-R40: the caller says which); last, a new holder never takes a เสียหาย, ใช้งานไม่ได้ or
      // ซาก asset (group 3 spec §19 recorded question; plan 3 P3-R1). A move of a broken asset stays allowed.
      // assignCustodian means a normalized new holder (normalizeTransferDestinations).
      ```
    - `getBulkMoveVerdict` and `getCheckoutVerdict` do not change.
  - **3e. The words.** Save `<scratchpad>/tx-group/msg/p3-t1-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/tx-group/msg/p3-t1-messages.json`. Expected output: `messages updated: 3 th, 3 en, 0 deleted`.
```json
{ "set": {
  "th": {
    "asset.transactionReasonTransferConditionDamaged": "สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่",
    "asset.transactionReasonTransferConditionNonFunctional": "ใช้งานไม่ได้ ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่",
    "asset.transactionReasonTransferConditionSalvage": "เป็นซาก รอตัดจำหน่าย โอนย้ายให้ผู้ถือครองใหม่ไม่ได้"
  },
  "en": {
    "asset.transactionReasonTransferConditionDamaged": "Damaged: send it for repair before giving it to a new holder",
    "asset.transactionReasonTransferConditionNonFunctional": "Not working: send it for repair before giving it to a new holder",
    "asset.transactionReasonTransferConditionSalvage": "Salvage awaiting disposal: it cannot go to a new holder"
  }
} }
```
    The Thai words use ผู้ถือครอง and ส่งซ่อม (docs/19_THAI_GLOSSARY.md) and pass `tests/thai-glossary.test.ts`. There is no ตรวจทาน, no ผู้ถือ without ครอง, and no ชำรุด.
  - **3f. The facts comment (ruling Y14).** In `src/lib/asset-actions.ts`, the `conditionName` doc comment (`:62`) becomes:
    ```ts
      /** The condition master's `name` ("Good", "Damaged", …): ส่งมอบ refuses a broken or salvage asset, and โอนย้าย to a new holder (group 3 spec §19.2; plan 3 P3-R1). */
    ```
    Nothing else in the file changes.

- [ ] **Step 4: Run the tests and the checks.**
  - Re-run the Step 2 command; every test passes.
  - Run the neighbours: `node --test tests/asset-operation-search-rules.test.ts tests/asset-actions.test.ts tests/asset-register-transactions.test.ts tests/asset-operation-picker-rules.test.ts tests/checkout-form-rules.test.ts tests/asset-transfer-status.test.ts tests/api-error-catalog.test.ts tests/open-repair-filter.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts`. Every test passes, with no edit to them.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - There is no E2E and no docs change here. No E2E today transfers a broken asset to a holder. Task 7 writes the docs and answers `DEVELOPER_HANDOFF.md`'s A1-R3 sentence (`:1296`).

- [ ] **Step 5: Commit.**
```
git add src/lib/asset-department-rule.ts src/lib/transfer-rules.ts src/lib/asset-lifecycle-policy.ts src/lib/asset-operation-eligibility.ts src/lib/asset-actions.ts messages/th.json messages/en.json tests/asset-department-rule.test.ts tests/transfer-rules.test.ts tests/asset-operation-eligibility.test.ts tests/asset-operation-condition-policy.test.ts
git commit -m "feat(transfer): the department follows the new or the current holder (ส่วนกลาง and ส่วนควบ stay free), a destination equal to the current value is not a change, and a broken asset cannot go to a new holder (group 3 spec §6, §9.2, §19; plan 3 P3-R1 to P3-R4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

---

### Task 2: The transfer route and the TR- page: the department, no change, a broken asset to a new holder, the locked department, inactive destinations, and "แผนกเดิม" (spec §5, §6, §9.2 server, §9.3 server, §19; P3-R1, P3-R3, P3-R4, P3-R5, P3-R6, P3-R7, P3-R8, P3-R20)

Today `POST /api/assets/[id]/transfer` writes the ids as sent. It writes any department sent, whatever the holder (`route.ts:96`). It never checks that a room, an employee or a department is active. A destination equal to the current value counts as a change, and a re-picked holder still makes the asset ใช้งานอยู่ (`:52`, `:64`). A broken asset can go to a new holder. After this task the route:
- normalizes the destinations with T1's rule;
- writes the department from T1's rule, with a `department_change` line;
- refuses a broken asset that goes to a new holder, a department sent while the department follows the holder, and every inactive destination, both before and inside the transaction, and always before the TR- number;
- prints the old department on the TR- page.

This task changes the server only. Today's form already sends this body. T6 rebuilds the form, its new field ids and its toast-and-re-read handling. Line numbers are HEAD's (`5176554f`). T1 changed no file this task edits, except `messages/*.json`.

**Rulings this task carries (from the skeleton):**
- **P3-R1 (route part):** โอนย้าย refuses a broken asset **only when a real (normalized) new holder is chosen**. The route reads `condition { name }`. When the normalized holder is set, it refuses 409 `ASSET_TRANSFER_CONDITION_BLOCKED` with `fieldErrors.assetId` = `transferConditionDamaged` | `transferConditionNonFunctional` | `transferConditionSalvage`. These are new `apiErrors` keys with the same words as T1's `asset.transactionReasonTransferCondition*`. The condition is checked again inside the transaction, before the document number. Catalog key: `transferConditionBlocked` "โอนย้ายให้ผู้ถือครองใหม่ไม่ได้เพราะสภาพของทรัพย์สิน". A room-only or department-only move of a broken asset still saves.
- **P3-R3:** the department written comes from `getTransferNextDepartmentId` on **normalized** ids.
  - The current holder's department is read **without** `isActive`: a holder who has left still decides it.
  - An inactive department on an active new holder is written as it is (spec call 5).
  - A ส่วนควบ moved on its own keeps a free department, like ส่วนกลาง (P3-R2). T1's rule already says so.
- **P3-R4:**
  - A destination equal to the current value is not a change (an empty string is treated as null). A holder equal to the current holder is dropped too, so the operation is `move_scope` and the status stays.
  - If nothing is left before the transaction, answer 400 with exactly the body zod gives today for no destination at all: `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { toLocationId: "transferDestinationRequired" } }`.
  - Inside the transaction, re-normalize on `beforeAsset`. If the set differs from the pre-check set in any field, answer 409 `ASSET_CHANGED_DURING_OPERATION`.
  - The implicit department correction alone is not a change.
- **P3-R5 (server):**
  - The department is locked when `getTransferDepartmentSource` is `"newHolder"` or `"currentHolder"`.
  - While it is locked, a normalized `toDepartmentId` that differs from `getTransferNextDepartmentId`'s value is refused: 409 `ASSET_TRANSFER_DEPARTMENT_LOCKED`, **without** `fieldErrors`. The same value is accepted.
  - The lock is refused before the active refusal, both before and inside the transaction.
  - Catalog key: `transferDepartmentLocked` "ข้อมูลผู้ถือครองของทรัพย์สินเปลี่ยนไป แผนกจึงเป็นไปตามผู้ถือครอง ตรวจสอบแล้วบันทึกอีกครั้ง".
- **P3-R6:**
  - The destination room, the new holder and a free department must exist and be active. They are read before the transaction and again inside it, after the claim and the outstanding re-read and before `generateTransferDocumentNo`.
  - Refusal: 409 `ASSET_TRANSFER_DESTINATION_INACTIVE`, with `fieldErrors` for **every** failing field: `toLocationId: "checkoutLocationInactive"`, `toCustodianId: "checkoutReceiverInactive"`, `toDepartmentId: "checkoutDepartmentInactive"`. These field keys are reused.
  - The catalog maps the code to the existing `checkoutDestinationInactive` toast key. The code is new, so logs do not say checkout.
- **P3-R7:**
  - The parent gets a `department_change` line only when the next department differs from `beforeAsset.departmentId`: `{ movementType: "department_change", fromValue: before, toValue: next, reason: "Asset transfer", referenceType: "transfer", referenceId: transferId, performedBy }`. It has no `remark`.
  - It is written after the `transfer` line and before the component sync.
  - A ส่วนกลาง save that keeps its department writes none.
  - `logAudit` adds `previousDepartmentId`. `departmentId` is already in it, from `toSnapshot`.
  - Cancelling needs no code: the line carries the transfer's reference, and nothing writes the asset after `afterAsset`.
- **P3-R8:** the TR- page adds a "แผนกเดิม" row (new key `transfer.fromDepartment`) before the existing department row. The before department is already loaded (`transfers/[id]/page.tsx:55`). The cancel dialog stays "status · room".
- **P3-R20:** no `expectedDepartmentId` guard. The body does not change.

**Cross-check rulings this task carries:** Y10 (the department table pins the asset update's five fields), Y16 (the Consumes block copies T1's Produces), Y19 (the English words are approved; the three `transferCondition*` equal T1's). Y11 records this task's read order in the plan header.

**Decisions:**
- **One helper, two calls.** `checkTransferDestinations(db, …)` reads the rows the department rule and the active check need, refuses the lock, then refuses the inactive fields, and returns the next department. The route calls it before the transaction and again inside it.
  - The lock value for a new holder is that holder's department, so the holders, the room and a free department are all read before the lock is judged (the skeleton's in-transaction step 8 puts the lock re-check before the active re-read; this accepted deviation is recorded in the plan header, Y11).
  - The refusal order is the skeleton's (lock, then inactive), both before and inside the transaction.
  - The one visible effect: an API caller that sends a holder who has left together with a different department gets the lock 409, because the new holder's department falls back to the current one; it does not get the field error under the holder. The form never sends a department while the row is locked.
- **The no-change 400 is zod's own body** (P3-R4), not GP W6's `{ error: "At least one transfer destination is required", … }`. The equal-to-current test compares the two answers.
- **The current holder is read only when the source is `"currentHolder"`.** That is the only source that uses it, and it is read with `employee.findUnique({ where: { id } })` and no `isActive`. A free department is read only when the source is `"free"`. A locked department is never read for `isActive`.
- **The route tests stay in `tests/asset-custody-route-claims.test.ts`**, which already loads the transfer route with its stand-ins. The TR- cancellation test runs there too. It uses the real cancellation repository (`asset-transaction-cancellation-prisma.ts`) on a small fake DB that holds the rows this route wrote. Its shape was checked in a scratch probe against HEAD: it passes once a `department_change` row with the transfer reference is added, and gives `downstream_work` without the reference.
- **Until T6:** today's form can send a holder and a department together, which now gets the lock toast, or a room equal to the current one, which now gets the 400 under ที่ตั้งปลายทาง. `fieldErrors.toCustodianId` and `fieldErrors.toDepartmentId` have no field on today's form yet, so they fall back to the code's toast (`checkoutDestinationInactive`). E2E does not run before T7.

**Files:**
- Modify: `src/app/api/assets/[id]/transfer/route.ts`. The import block is `:1-23`. In order, the edits are:
  - the asset read `:43-46`;
  - after the 404 `:47`;
  - `operation` `:52`;
  - after the open-handover refusal `:62`;
  - the target status `:64`;
  - in the transaction:
    - after `assertNoOutstandingComponentLinks(tx, [id])` `:71`;
    - the `beforeAsset` select `:74-83`;
    - between `if (!beforeAsset) …` `:85` and `const transferId` `:99`;
    - `toSnapshot` `:93-98`;
    - after the `transfer` movement `:123-135`;
    - the sync's `departmentId` `:142`;
  - the `logAudit` `newValue` `:191`;
  - the catch `:195-203`;
  - new helpers after the handler.
- Modify: `src/lib/api-error-catalog.ts`. Add three rows after `"ASSET_STATUS_TRANSFER_NOT_ALLOWED": "statusBlocksTransfer",` (`:57`).
- Modify: `src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx`. Add one field between `:121` (`tAsset("currentLocation")`) and `:122` (`tAsset("department")`).
- Modify: `messages/th.json` and `messages/en.json`, through `node scripts/messages-edit.mjs` with the change file `<session scratchpad>/tx-group/msg/p3-t2-messages.json`.
- Test: `tests/asset-custody-route-claims.test.ts`:
  - the harness (`:1-5`, `:7-30`, `:32-51`, `:69-78`, `:87-100`, `:108`, `:112-115`, `:187-206`);
  - the race pin `:227-236`;
  - new tests appended at the end.
- Test: `tests/api-error-catalog.test.ts`. Append one test after `:204`.
- Test: `tests/transfer-document-signatures.test.ts`. Append one test after the last `test(…)`, before `function read`.

**Pins this task breaks (rewritten in the same commit):**
- `tests/asset-custody-route-claims.test.ts:227-236` ("a transfer that loses the race…") posts `toCustodianId: "emp-3"`, which is not in the fixture.
  - After this task the destination check refuses it 409 `ASSET_TRANSFER_DESTINATION_INACTIVE` before the claim. The test's `409` and "no create" would still pass, but for the wrong reason.
  - Rewrite it to post `emp-2` and assert `code: "ASSET_CHANGED_DURING_OPERATION"` (Step 1).
- The same file's fake asset always holds `custodianId: "emp-9"`, `departmentId: "dept-1"`, `currentLocationId: "location-1"` (`:93-96`). Two more gaps:
  - `employee.findUnique` falls to the generic `null` (`:122`), so the current-holder rule would always fall back to `dept-1` and test nothing;
  - nothing records `generateTransferDocumentNo` or the component sync.

  Step 1 changes the harness.

**Pins that must hold (no edit):**
- `tests/asset-transaction-snapshot-routes.test.ts:66-98`: the before, after and component snapshots; `tx.assetTransfer.create`; `generateTransferDocumentNo`; `referenceId: transferId`; `NextResponse.json(transfer`; and the open-handover read's `isReturned: false … transactionStatus: "active"`.
- `tests/e2e-fixes.test.ts:171-187` (FX10: `const transfer = await tx.assetTransfer.create(`, `return NextResponse.json(transfer, { status: 201 })`). Also `:212-223`, the TR- page's `originalOperator=…`, `label: t("fromCustodian")` and `label: t("toCustodian")`.
- `tests/asset-component-sync-routes.test.ts:20-40`:
  - the route imports `syncInstalledComponentsWithParent` and writes `parent_transfer_sync`;
  - the `logAudit` `newValue: { … componentSync … }` stays **on one line**.
- `tests/asset-movement-labels.test.ts`: the route is already in `WRITERS` (`:37`), and `department_change` is already labelled.
- `tests/api-error-catalog.test.ts:69-80`: the scanner. Every new `error: "…"` literal must be in the catalog.
- `tests/transfer-document-signatures.test.ts:29-33`: the TR- signatures call.
- `e2e/cross-cutting/support/refusals.ts:56` posts `{}` as a viewer and expects 403. Auth stays first.
- `e2e/asset-detail/detail-steps.ts:202-205` (`transferByApi`, AD2): it sends a ส่วนกลาง asset to a room and a holder with `toDepartmentId: ""`. Its department stays, so it writes no `department_change`, and AD2's "latest 3" holds.

**Interfaces:**
- Consumes:
  - **T1, already committed** (copied from T1's Produces, Y16):
    ```ts
    // src/lib/asset-department-rule.ts (pure; import type only)
    export type TransferDepartmentSource = "newHolder" | "currentHolder" | "free"
    export function getTransferDepartmentSource(input: {
      ownership: AssetOwnershipType
      currentCustodianId: string | null
      newCustodianId: string | null      // normalized: a holder equal to the current one arrives as null
    }): TransferDepartmentSource
    export function getTransferNextDepartmentId(input: {
      ownership: AssetOwnershipType
      currentCustodianId: string | null
      newCustodianId: string | null
      currentDepartmentId: string | null
      currentHolderDepartmentId: string | null
      newHolderDepartmentId: string | null
      chosenDepartmentId: string | null
    }): string | null

    // src/lib/transfer-rules.ts (pure, client-safe, no imports)
    export type TransferDestinations = { toLocationId: string | null; toCustodianId: string | null; toDepartmentId: string | null }
    export type TransferCurrentValues = { currentLocationId: string; custodianId: string | null; departmentId: string | null }
    export function normalizeTransferDestinations(sent: Partial<TransferDestinations>, current: TransferCurrentValues): TransferDestinations
    export function hasTransferChange(destinations: TransferDestinations): boolean
    export function sameTransferDestinations(a: TransferDestinations, b: TransferDestinations): boolean
    ```
    - The normalizer gives null for a sent value that is `undefined`, `null` or `""`, or that equals the current one (the department against the asset's **stored** `departmentId`); otherwise the sent value. It does not trim. This task builds an explicit `sent` from the parsed body (a `Partial<TransferDestinations>` accepts it) and keeps it, so the transaction re-normalizes the same sent values against `beforeAsset`.
    - T1's other two products, `transferConditionBlockReasonKeys` and the widened `getTransferVerdict`, are not read here: the route maps `getCheckoutConditionBlock(...)` to its own field keys.
    - T1's messages are `asset.transactionReasonTransferConditionDamaged`, `…NonFunctional` and `…Salvage`.
      - th: "สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "ใช้งานไม่ได้ ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "เป็นซาก รอตัดจำหน่าย โอนย้ายให้ผู้ถือครองใหม่ไม่ได้".
      - en: "Damaged: send it for repair before giving it to a new holder", "Not working: send it for repair before giving it to a new holder", "Salvage awaiting disposal: it cannot go to a new holder".
    - This task's three `apiErrors` field keys copy these values word for word in both locales (checked against T1's change file, Y19), and its catalog test pins the equality.
  - Existing:
    - `getCheckoutConditionBlock(conditionName: string | null | undefined): CheckoutConditionBlock | null` and `type CheckoutConditionBlock = "damaged" | "nonFunctional" | "salvage"` (`src/lib/asset-lifecycle-policy.ts:217-227`);
    - `getTransferTargetStatusName(toCustodianId?: string | null): "In Use" | null` (`:303-305`);
    - `normalizeAssetOwnershipType(value?: string | null): AssetOwnershipType` and `type AssetOwnershipType` (`src/lib/asset-ownership.ts:6-14`);
    - `AssetOperationConflictError(code: "ASSET_CHANGED_DURING_OPERATION" | …, message: string)` (`src/lib/asset-operation-claim.ts:5-13`). The message `"Asset status changed while this request was being saved. Reload the asset and try again."` is catalogued (`api-error-catalog.ts:20`).
    - The zod body for a request with no destination (`assetTransferSchema`, `validations/asset-operations.ts:78-94` → `validationFailedBody`, `api-error-exposure.ts:35-38`) is `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { toLocationId: "transferDestinationRequired" } }`.
- Produces (T6 and T7 read these; nothing new is exported from the route file):
  - **The route's answers:**
    - 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { toLocationId: "transferDestinationRequired" } }`: every destination is equal to the current value.
    - 409 `{ code: "ASSET_TRANSFER_CONDITION_BLOCKED", error: "ASSET_TRANSFER_CONDITION_BLOCKED", fieldErrors: { assetId: "transferConditionDamaged" | "transferConditionNonFunctional" | "transferConditionSalvage" } }`. It lands under `assetId`, today's `#transfer-asset` field.
    - 409 `{ code: "ASSET_TRANSFER_DEPARTMENT_LOCKED", error: "ASSET_TRANSFER_DEPARTMENT_LOCKED" }`. There are no `fieldErrors`; T6 answers it with the toast and a re-read of the detail.
    - 409 `{ code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE", fieldErrors: { toLocationId?: "checkoutLocationInactive", toCustodianId?: "checkoutReceiverInactive", toDepartmentId?: "checkoutDepartmentInactive" } }`. T6 maps `toCustodianId` → `#transfer-to-custodian` and `toDepartmentId` → `#transfer-to-department`.
    - 409 `{ code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }`: the set changed inside the transaction, or the claim was lost. T6 answers it with the toast and a re-read.
    - Unchanged: 404, 409 outstanding, 409 License, 409 `ASSET_STATUS_TRANSFER_NOT_ALLOWED`, 400 `{ error: "Asset already has an active checkout" }` (no code), 201 = the `AssetTransfer` row.
  - **Writes:**
    - the asset update's data is exactly `currentLocationId`, `custodianId`, `departmentId`, `statusId`, `updatedBy`, as today: never `branchId` or `assetTag`;
    - `asset.departmentId` = the rule's value;
    - the `transfer` line's `toValue` JSON `departmentId` = the same value;
    - the sync's `changes.departmentId` = the same value;
    - a `department_change` line only when the value changes, `reason: "Asset transfer"`. Its history label is "เปลี่ยนแผนก" (`asset.movementTypes.department_change`), which T7 asserts. A ส่วนกลาง save that keeps its department, and a ส่วนควบ moved alone without a chosen department, write none.
    - Audit: `newValue.previousDepartmentId`.
  - **Catalog:**
    - `ASSET_TRANSFER_CONDITION_BLOCKED → transferConditionBlocked`;
    - `ASSET_TRANSFER_DEPARTMENT_LOCKED → transferDepartmentLocked`;
    - `ASSET_TRANSFER_DESTINATION_INACTIVE → checkoutDestinationInactive`.
  - **Message keys:** `apiErrors.transferConditionBlocked`, `apiErrors.transferConditionDamaged`, `apiErrors.transferConditionNonFunctional`, `apiErrors.transferConditionSalvage`, `apiErrors.transferDepartmentLocked`, `transfer.fromDepartment`. T6 must not add a key with any of these names.

- [ ] **Step 1: Write the failing tests.**
  - **`tests/asset-custody-route-claims.test.ts`, harness.** Make these changes:
    1. **Imports.** After `:5` (`import { pathToFileURL } from "node:url"`), add:
```ts
import { createPrismaAssetTransactionCancellationRepository } from "../src/lib/asset-transaction-cancellation-prisma.ts"
import { cancelAssetTransaction, previewAssetTransactionCancellation } from "../src/lib/asset-transaction-cancellation-service.ts"
```
    2. **The state type.** Above `type CustodyRouteState` (`:7`), add:
```ts
/** The asset's holder, department and room. */
type AssetFields = { custodianId: string | null; departmentId: string | null; currentLocationId: string }
```
    3. **`CustodyRouteState`.**
       - `:13` becomes:
```ts
  /** `employee.findFirst` with `isActive: true` skips one marked `isActive: false`; `employee.findUnique` (the current holder, read without isActive) answers it. */
  employees: Record<string, { id: string; departmentId: string; isActive?: boolean }>
```
       - After `outstandingAnswers: string[][]` (`:29`), add:
```ts
  /** Each asset findFirst/findUnique merges the next of assetAnswers over assetFields first, if any. */
  assetFields: AssetFields
  assetAnswers: Array<Partial<AssetFields>>
```
    4. **The state literal.** The literal `const state: CustodyRouteState = { … }` (`:32-51`) becomes `const state: CustodyRouteState = defaultState()`. `:52` (`Object.assign(globalThis, …)`) stays.
    5. **The document-number stand-in.** In `@/lib/operation-document-number` (`:69-72`), the transfer line becomes `export async function generateTransferDocumentNo() { globalThis.__custodyRouteState.calls.push("generateTransferDocumentNo"); return "TR-202610-0001" }`.
    6. **The sync stand-in.** In `@/lib/asset-component-sync` (`:73-78`), the first line of the function body becomes `globalThis.__custodyRouteState.calls.push("syncInstalledComponentsWithParent")`, followed by the existing `syncChanges.push(args.changes)`.
    7. **The fake asset.** In `@/lib/db`, the fake asset's three lines `currentLocationId: "location-1",`, `custodianId: "emp-9",` and `departmentId: "dept-1",` (`:94-96`) become one line, `...state().assetFields,`.
    8. **The asset reads.** `:108` becomes:
```js
            if (name === "asset" && (method === "findFirst" || method === "findUnique")) return { ...asset(), ...(state().assetAnswers.length > 0 ? state().assetAnswers.shift() : {}) }
```
    9. **The employee reads.** The `employee.findFirst` branch (`:112-115`) becomes:
```js
            if (name === "employee" && method === "findFirst") {
              if (state().employeeAnswers.length > 0) return state().employeeAnswers.shift()
              const employee = state().employees[args?.where?.id]
              return args?.where?.isActive === true && employee && employee.isActive !== false ? employee : null
            }
            // The current holder is read without isActive (group 3 spec §6, P3-R3): one who has left still answers.
            if (name === "employee" && method === "findUnique") return state().employees[args?.where?.id] ?? null
```
    10. **The `beforeEach`.** The `beforeEach(() => { … })` (`:187-206`) is replaced by:
```ts
// Every test starts from these; a test that runs several cases calls resetState() between them.
function defaultState(): CustodyRouteState {
  return {
    claimCount: 1,
    assetStatusName: "Ready",
    assetOwnershipType: "personal",
    openCheckoutAssetIds: [],
    calls: [],
    // emp-9 holds the fake asset, in the asset's own department.
    employees: { "emp-2": { id: "emp-2", departmentId: "dept-2" }, "emp-9": { id: "emp-9", departmentId: "dept-1" } },
    employeeAnswers: [],
    activeDepartmentIds: ["dept-3"],
    activeLocationIds: ["location-2"],
    writes: [],
    syncChanges: [],
    audits: [],
    assetConditionName: "Good",
    assetConditionId: "condition-good",
    conditionAnswers: [],
    conditionMasters: {},
    outstandingAssetIds: [],
    outstandingAnswers: [],
    assetFields: { custodianId: "emp-9", departmentId: "dept-1", currentLocationId: "location-1" },
    assetAnswers: [],
  }
}

function resetState() {
  Object.assign(state, defaultState())
}

beforeEach(resetState)
```
    `defaultState` is a function declaration, so `const state = defaultState()` at `:32` can call it.
  - **The race pin `:227-236`** becomes:
```ts
test("a transfer that loses the race for the asset returns 409 and records nothing", async () => {
  state.assetStatusName = "In Use"
  state.claimCount = 0

  // emp-2 is an active employee, so the refusal is the lost claim, not the destination check (P3-R6).
  const response = await post(transferRoute, { toCustodianId: "emp-2", reason: "ย้ายแผนก" })

  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, "ASSET_CHANGED_DURING_OPERATION")
  assert.equal(state.calls.some((call) => call.startsWith("assetTransfer.create")), false)
  assert.equal(state.calls.includes("asset.update"), false)
  assert.equal(state.calls.includes("generateTransferDocumentNo"), false)
})
```
  - **Append to the end of `tests/asset-custody-route-claims.test.ts`:**
```ts
// Group 3 plan 3 Task 2: the transfer route (group 3 spec §6, §9.2, §9.3, §19; P3-R1, P3-R3 to P3-R7).
const wasCalled = (call: string) => state.calls.includes(call)
const positionsOf = (call: string) => state.calls.flatMap((name, index) => (name === call ? [index] : []))
const noHolder: AssetFields = { custodianId: null, departmentId: "dept-1", currentLocationId: "location-1" }
// emp-9 holds the fake asset; here in the department given.
const holderDepartment = (departmentId: string, isActive = true): CustodyRouteState["employees"] => ({
  "emp-2": { id: "emp-2", departmentId: "dept-2" },
  "emp-9": { id: "emp-9", departmentId, isActive },
})
const transferDepartmentLine = (toValue: string, transferId: string) => ({
  assetId: "asset-1", movementType: "department_change", fromValue: "dept-1", toValue, reason: "Asset transfer", referenceType: "transfer", referenceId: transferId, performedBy: "user-1",
})
const noDestination = [400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { toLocationId: "transferDestinationRequired" } }]
const changedMeanwhile = { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }
const departmentLocked = { code: "ASSET_TRANSFER_DEPARTMENT_LOCKED", error: "ASSET_TRANSFER_DEPARTMENT_LOCKED" }
const transferInactive = (fieldErrors: Record<string, string>) => ({ code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE", fieldErrors })
const transferConditionRefusal = (key: string) => ({ code: "ASSET_TRANSFER_CONDITION_BLOCKED", error: "ASSET_TRANSFER_CONDITION_BLOCKED", fieldErrors: { assetId: key } })

// One transfer from the defaults plus the case's own state.
async function transferWith(setup: Partial<CustodyRouteState>, body: Record<string, unknown>) {
  resetState()
  Object.assign(state, setup)
  return post(transferRoute, { reason: "ย้ายห้อง", ...body })
}

test("a transfer writes the department of spec §6 to the asset, its transfer line and its components, with a department_change line only when it changes, and writes no other asset field (group 3 spec §6, §9.2; P3-R2, P3-R3, P3-R7; Review Focus 1)", async () => {
  const rows: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>, string]> = [
    ["บุคคล to a new holder", {}, { toCustodianId: "emp-2" }, "dept-2"],
    ["Stock to a new holder", { assetOwnershipType: "stock" }, { toCustodianId: "emp-2" }, "dept-2"],
    ["บุคคล held, room only: the holder's department (call 4)", { employees: holderDepartment("dept-9") }, moveBody, "dept-9"],
    ["Stock held, room only", { assetOwnershipType: "stock", employees: holderDepartment("dept-9") }, moveBody, "dept-9"],
    ["an unknown ownership reads as บุคคล", { assetOwnershipType: "legacy", employees: holderDepartment("dept-9") }, moveBody, "dept-9"],
    // The stand-in answers a holder who has left only to a read without isActive.
    ["a holder who has left still decides", { employees: holderDepartment("dept-9", false) }, moveBody, "dept-9"],
    ["held, the holder already in the asset's department", {}, moveBody, "dept-1"],
    ["held, the holder's row missing: unchanged", { employees: { "emp-2": { id: "emp-2", departmentId: "dept-2" } } }, moveBody, "dept-1"],
    ["no holder: the chosen department", { assetFields: noHolder }, { toDepartmentId: "dept-3" }, "dept-3"],
    ["no holder, room only: unchanged", { assetFields: noHolder }, moveBody, "dept-1"],
    ["ส่วนกลาง held, room only: keeps its own", { assetOwnershipType: "shared", employees: holderDepartment("dept-9") }, moveBody, "dept-1"],
    ["ส่วนกลาง to a new holder: keeps its own", { assetOwnershipType: "shared" }, { toCustodianId: "emp-2" }, "dept-1"],
    ["ส่วนกลาง with a holder: the chosen department, the row stays free", { assetOwnershipType: "shared", employees: holderDepartment("dept-9") }, { toDepartmentId: "dept-3" }, "dept-3"],
    ["ส่วนควบ held, room only: keeps its own (P3-R2)", { assetOwnershipType: "component", employees: holderDepartment("dept-9") }, moveBody, "dept-1"],
    ["ส่วนควบ: the chosen department", { assetOwnershipType: "component" }, { toDepartmentId: "dept-3" }, "dept-3"],
  ]
  for (const [name, setup, body, departmentId] of rows) {
    const response = await transferWith(setup, body)
    assert.equal(response.status, 201, `${name}: ${await response.clone().text()}`)
    const [record] = written("assetTransfer.create")
    assert.equal(written("asset.update")[0].departmentId, departmentId, name)
    // The transfer never writes branchId or assetTag (Global Constraint): the asset update carries exactly these five fields.
    assert.deepEqual(Object.keys(written("asset.update")[0]).sort(), ["currentLocationId", "custodianId", "departmentId", "statusId", "updatedBy"], `${name}: the fields written`)
    assert.equal(JSON.parse(String(written("assetMovement.create")[0].toValue)).departmentId, departmentId, `${name}: the transfer line`)
    assert.equal(state.syncChanges[0].departmentId, departmentId, `${name}: the components`)
    assert.deepEqual(written("assetMovement.create").filter((row) => row.movementType === "department_change"),
      departmentId === "dept-1" ? [] : [transferDepartmentLine(departmentId, String(record.id))], name)
  }
})

test("the system log records the department the transfer wrote and the one it replaced (checkout M9 parity, P3-R7)", async () => {
  for (const [ownership, expected] of [["personal", ["dept-9", "dept-1"]], ["shared", ["dept-1", "dept-1"]]] as const) {
    assert.equal((await transferWith({ assetOwnershipType: ownership, employees: holderDepartment("dept-9") }, moveBody)).status, 201, ownership)
    const [audit] = state.audits.filter((entry) => entry.action === "transfer")
    assert.deepEqual([audit.newValue.departmentId, audit.newValue.previousDepartmentId], expected, ownership)
  }
})

test("inside the transaction the checks come after the claim and the outstanding re-read and before the TR- number; the department_change line follows the transfer line before the components move; nothing writes the asset after its update (spec §5; P3-R6, P3-R7)", async () => {
  assert.equal((await transferWith({ employees: holderDepartment("dept-9") }, moveBody)).status, 201)
  const at = (call: string, nth = 0) => positionsOf(call)[nth]
  const order = [at("asset.updateMany"), at("assetComponent.findMany", 1), at("asset.findUnique"), at("employee.findUnique", 1), at("location.findFirst", 1), at("generateTransferDocumentNo"), at("asset.update")]
  assert.ok(order.every((position) => position !== undefined), JSON.stringify(state.calls))
  assert.deepEqual([...order].sort((a, b) => a - b), order, JSON.stringify(state.calls))
  const [transferLine, departmentLine] = positionsOf("assetMovement.create")
  assert.deepEqual(written("assetMovement.create").map((row) => row.movementType), ["transfer", "department_change"])
  assert.ok(at("asset.update") < transferLine && transferLine < departmentLine, JSON.stringify(state.calls))
  assert.ok(departmentLine < at("syncInstalledComponentsWithParent") && at("syncInstalledComponentsWithParent") < at("assetTransfer.create"), JSON.stringify(state.calls))
  assert.equal(positionsOf("asset.update").length, 1)
  assert.ok(Math.max(...positionsOf("asset.updateMany")) < at("asset.update"), "the claim is the only other asset write, and it comes first")
})

test("a destination equal to the asset's current value is no change: all equal is the schema's own 400 under ที่ตั้งปลายทาง, before any other read; a re-picked holder is no assign and keeps the status (spec §9.2, call 17; P3-R4; Review Focus 2)", async () => {
  assert.deepEqual(await refusal(await post(transferRoute, { reason: "ย้ายห้อง" })), noDestination, "the schema's answer for no destination")
  for (const body of [
    { toLocationId: "location-1" },
    { toCustodianId: "emp-9" },
    { toDepartmentId: "dept-1" },
    { toLocationId: "location-1", toCustodianId: "emp-9", toDepartmentId: "dept-1" },
    { toLocationId: "location-1", toCustodianId: "", toDepartmentId: "" },
  ]) {
    assert.deepEqual(await refusal(await transferWith({}, body)), noDestination, JSON.stringify(body))
    assert.deepEqual(state.calls, ["asset.findFirst"], `${JSON.stringify(body)}: nothing read after the asset, nothing written`)
  }
  // A Pending Repair asset re-picking its own holder with a new room is a room move (move_scope), not an assign: it saves
  // and keeps its status and its holder.
  assert.equal((await transferWith({ assetStatusName: "Pending Repair" }, { ...moveBody, toCustodianId: "emp-9" })).status, 201)
  const [update] = written("asset.update")
  assert.deepEqual([update.statusId, update.custodianId, update.currentLocationId], ["status-current", "emp-9", "location-2"])
  // A department equal to the current one is dropped before any read.
  assert.equal((await transferWith({ assetFields: noHolder }, { ...moveBody, toDepartmentId: "dept-1" })).status, 201)
  assert.equal(wasCalled("department.findFirst"), false)
  assert.deepEqual(written("assetMovement.create").map((row) => row.movementType), ["transfer"])
})

test("โอนย้าย refuses a broken asset only when it goes to a new holder, under the asset field and after the outstanding, status and open-handover rules; a room-only move and its own holder re-picked still save (spec §19, P3-R1; Review Focus 4)", async () => {
  const toNewHolder = { toCustodianId: "emp-2", reason: "เปลี่ยนผู้ใช้งาน" }
  for (const [conditionName, key] of [["Damaged", "transferConditionDamaged"], ["Non-functional", "transferConditionNonFunctional"], ["Salvage", "transferConditionSalvage"]] as const) {
    assert.deepEqual(await refusal(await transferWith({ assetConditionName: conditionName }, toNewHolder)), [409, transferConditionRefusal(key)], conditionName)
    assert.equal(wasCalled("asset.updateMany"), false, conditionName)
    // A room-only move, e.g. to the IT store, saves.
    assert.equal((await transferWith({ assetConditionName: conditionName }, moveBody)).status, 201, `${conditionName}: room only`)
    // Its own holder is no new holder (P3-R4): it saves, and the status stays.
    assert.equal((await transferWith({ assetConditionName: conditionName }, { ...moveBody, toCustodianId: "emp-9" })).status, 201, `${conditionName}: same holder`)
    assert.equal(written("asset.update")[0].statusId, "status-current", conditionName)
  }
  // The earlier rules read their own refusals first (A1-R2's order).
  assert.deepEqual(await refusal(await transferWith({ assetConditionName: "Damaged", assetStatusName: "Pending Repair" }, toNewHolder)),
    [409, { code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", error: "ASSET_STATUS_TRANSFER_NOT_ALLOWED" }])
  assert.deepEqual(await refusal(await transferWith({ assetConditionName: "Damaged", openCheckoutAssetIds: ["asset-1"] }, toNewHolder)),
    [400, { error: "Asset already has an active checkout" }])
  assert.deepEqual(await refusal(await transferWith({ assetConditionName: "Damaged", outstandingAssetIds: ["asset-1"] }, toNewHolder)), outstandingAtAsset)
  assert.equal((await transferWith({ assetConditionName: "Not Assessed" }, toNewHolder)).status, 201, "ยังไม่ประเมิน is not refused")
})

test("a department sent while it follows the holder is refused 409 with no field, before the active check, unless it is the holder's own (spec §6, §9.2; P3-R5)", async () => {
  const refused: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>]> = [
    ["held, a room and another department", { employees: holderDepartment("dept-9") }, { toLocationId: "location-2", toDepartmentId: "dept-3" }],
    ["held, a closed room too: the lock reads first", { employees: holderDepartment("dept-9") }, { toLocationId: "location-closed", toDepartmentId: "dept-3" }],
    ["a new holder and another department", {}, { toCustodianId: "emp-2", toDepartmentId: "dept-3" }],
  ]
  for (const [name, setup, body] of refused) {
    assert.deepEqual(await refusal(await transferWith(setup, body)), [409, departmentLocked], name)
    assert.equal(wasCalled("asset.updateMany"), false, name)
    assert.equal(wasCalled("department.findFirst"), false, `${name}: a locked department is not read`)
  }
  // The holder's own department is what the save writes, so it is accepted. dept-9 is not an active department, and a
  // locked department is not read.
  const accepted: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>, string]> = [
    ["held, the holder's department", { employees: holderDepartment("dept-9") }, { ...moveBody, toDepartmentId: "dept-9" }, "dept-9"],
    ["a new holder's own department", {}, { toCustodianId: "emp-2", toDepartmentId: "dept-2" }, "dept-2"],
  ]
  for (const [name, setup, body, departmentId] of accepted) {
    assert.equal((await transferWith(setup, body)).status, 201, name)
    assert.equal(written("asset.update")[0].departmentId, departmentId, name)
    assert.equal(wasCalled("department.findFirst"), false, name)
  }
})

test("a missing or inactive room, new holder or free department is refused under every failing field at once, before the asset is claimed (spec §6, §9.3; P3-R6)", async () => {
  const staff: CustodyRouteState["employees"] = {
    "emp-2": { id: "emp-2", departmentId: "dept-2" },
    "emp-9": { id: "emp-9", departmentId: "dept-1" },
    "emp-gone": { id: "emp-gone", departmentId: "dept-2", isActive: false },
  }
  const cases: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>, Record<string, string>]> = [
    ["a closed room", {}, { toLocationId: "location-closed" }, { toLocationId: "checkoutLocationInactive" }],
    ["an unknown employee", {}, { toCustodianId: "emp-unknown" }, { toCustodianId: "checkoutReceiverInactive" }],
    ["an employee who has left", {}, { toCustodianId: "emp-gone" }, { toCustodianId: "checkoutReceiverInactive" }],
    ["a closed department on an asset with no holder", { assetFields: noHolder }, { toDepartmentId: "dept-closed" }, { toDepartmentId: "checkoutDepartmentInactive" }],
    ["a closed room and an employee who has left", {}, { toLocationId: "location-closed", toCustodianId: "emp-gone" },
      { toLocationId: "checkoutLocationInactive", toCustodianId: "checkoutReceiverInactive" }],
    ["all three on a ส่วนกลาง asset, whose department stays free", { assetOwnershipType: "shared" }, { toLocationId: "location-closed", toCustodianId: "emp-gone", toDepartmentId: "dept-closed" },
      { toLocationId: "checkoutLocationInactive", toCustodianId: "checkoutReceiverInactive", toDepartmentId: "checkoutDepartmentInactive" }],
  ]
  for (const [name, setup, body, fieldErrors] of cases) {
    assert.deepEqual(await refusal(await transferWith({ employees: staff, ...setup }, body)), [409, transferInactive(fieldErrors)], name)
    assert.equal(wasCalled("asset.updateMany"), false, name)
    assert.equal(wasCalled("assetTransfer.create"), false, name)
  }
})

test("an active new holder whose department is closed still receives the asset, with that department, which is not read (spec §6, call 5)", async () => {
  assert.equal((await transferWith({ employees: { "emp-2": { id: "emp-2", departmentId: "dept-closed" } } }, { toCustodianId: "emp-2" })).status, 201)
  assert.equal(written("asset.update")[0].departmentId, "dept-closed")
  assert.equal(wasCalled("department.findFirst"), false)
})

test("every refusal inside the transaction comes after the claim and before the TR- number, and nothing is written (spec §5; P3-R1, P3-R4, P3-R5, P3-R6; Review Focus 2)", async () => {
  const cases: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>, unknown]> = [
    ["the chosen holder became the holder", { assetStatusName: "In Use", assetAnswers: [{}, { custodianId: "emp-2" }] }, { toCustodianId: "emp-2" }, changedMeanwhile],
    ["the chosen room became the room", { assetAnswers: [{}, { currentLocationId: "location-2" }] }, moveBody, changedMeanwhile],
    ["the condition became ซาก", { conditionAnswers: ["Good", "Salvage"] }, { toCustodianId: "emp-2" }, transferConditionRefusal("transferConditionSalvage")],
    ["the asset gained a holder, so the chosen department is now locked",
      { assetFields: noHolder, assetAnswers: [{}, { custodianId: "emp-9" }], employees: holderDepartment("dept-9") }, { toDepartmentId: "dept-3" }, departmentLocked],
    ["the new holder was deactivated", { employeeAnswers: [{ id: "emp-2", departmentId: "dept-2" }, null] }, { toCustodianId: "emp-2" }, transferInactive({ toCustodianId: "checkoutReceiverInactive" })],
  ]
  for (const [name, setup, body, answer] of cases) {
    assert.deepEqual(await refusal(await transferWith(setup, body)), [409, answer], name)
    assert.ok(wasCalled("asset.updateMany"), `${name}: the pre-check passed and the asset was claimed`)
    for (const call of ["generateTransferDocumentNo", "asset.update", "assetMovement.create", "assetTransfer.create"]) assert.equal(wasCalled(call), false, `${name}: ${call}`)
    assert.deepEqual(state.audits, [], name)
  }
})

test("a TR- whose save corrected the department can be cancelled: its department_change line carries the transfer's reference, so it is no downstream work, and the cancel puts the old department back (spec §5, §6; P3-R7; Review Focus 1)", async () => {
  assert.equal((await transferWith({ employees: holderDepartment("dept-9") }, moveBody)).status, 201)
  const record = written("assetTransfer.create")[0]
  const transactionId = String(record.id)
  assert.deepEqual(written("assetMovement.create").filter((row) => row.movementType === "department_change"), [transferDepartmentLine("dept-9", transactionId)])
  const update = written("asset.update")[0]
  const createdAt = new Date("2026-10-07T03:00:01Z")
  // The asset as the save left it (the fake update's updatedAt). The save's lines are dated after the TR- row, so only
  // their reference keeps them out of the downstream check.
  const afterAsset = {
    id: "asset-1", updatedAt: new Date("2026-10-07T03:00:00Z"), statusId: update.statusId, conditionId: "condition-good", branchId: "branch-1",
    currentLocationId: update.currentLocationId, custodianId: update.custodianId, departmentId: update.departmentId,
  }
  const lines = written("assetMovement.create").map((row) => ({ ...row, performedAt: new Date(createdAt.getTime() + 1_000) }))
  const restored: Array<Record<string, unknown>> = []
  // Only the calls the cancellation repository makes for a TR- with no components.
  const repository = (movements: typeof lines) => {
    const db = {
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
      assetTransfer: {
        findUnique: async () => ({
          id: record.id, assetId: "asset-1", transactionStatus: "active", createdAt, updatedAt: createdAt,
          beforeSnapshotJson: record.beforeSnapshotJson, afterSnapshotJson: record.afterSnapshotJson, voidedAt: null,
        }),
        count: async () => 0,
        updateMany: async () => ({ count: 1 }),
      },
      assetCheckout: { count: async () => 0 },
      assetCheckin: { count: async () => 0 },
      asset: {
        findUnique: async () => afterAsset,
        updateMany: async ({ data }: { data: Record<string, unknown> }) => {
          restored.push(data)
          return { count: 1 }
        },
      },
      assetMovement: {
        findMany: async ({ where }: { where: { assetId: string; performedAt: { gt: Date }; NOT: { referenceType: string; referenceId: string } } }) =>
          movements.filter((row) => row.assetId === where.assetId && row.performedAt > where.performedAt.gt
            && !(row.referenceType === where.NOT.referenceType && row.referenceId === where.NOT.referenceId)).map((row) => ({ movementType: row.movementType })),
        create: async () => ({ id: "movement-cancel" }),
      },
      systemLog: { create: async () => ({}) },
    }
    return createPrismaAssetTransactionCancellationRepository(db as never)
  }
  assert.deepEqual(await previewAssetTransactionCancellation({ type: "transfer", transactionId }, repository(lines)), { eligible: true })
  // Without the transfer's reference the same line would be later work, and the TR- could not be cancelled.
  const unreferenced = lines.map((row) => (row.movementType === "department_change" ? { ...row, referenceId: "other-document" } : row))
  assert.deepEqual(await previewAssetTransactionCancellation({ type: "transfer", transactionId }, repository(unreferenced)), { eligible: false, reasons: ["downstream_work"] })
  const result = await cancelAssetTransaction(
    { type: "transfer", transactionId, userId: "user-9", reason: "บันทึกผิดห้อง", expectedUpdatedAt: createdAt.toISOString() },
    repository(lines),
  )
  assert.equal(result.status, "cancelled", JSON.stringify(result))
  assert.deepEqual([restored[0].departmentId, restored[0].currentLocationId, restored[0].custodianId], ["dept-1", "location-1", "emp-9"])
})
```
    These helper names do not collide with the file's existing `refusal`, `moveBody`, `written`, `toDepartment`, `toRoom`, `departmentLine`, `inactiveKeys`, `inactive`, `conditionBlocked` and `outstandingAtAsset`. The new tests use `written`, `moveBody`, `refusal` and `outstandingAtAsset` as they stand.

  - **`tests/api-error-catalog.test.ts`, append:**
```ts
test("โอนย้าย's own refusals read their words: the toast per code, a broken asset's reason under the asset field as the picker says it, and an inactive destination reuses ส่งมอบ's words (group 3 plan 3; P3-R1, P3-R5, P3-R6)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
  assert.equal(getApiErrorKey("ASSET_TRANSFER_CONDITION_BLOCKED"), "transferConditionBlocked")
  assert.equal(getApiErrorKey("ASSET_TRANSFER_DEPARTMENT_LOCKED"), "transferDepartmentLocked")
  assert.equal(getApiErrorKey("ASSET_TRANSFER_DESTINATION_INACTIVE"), "checkoutDestinationInactive")
  for (const [key, th, en] of [
    ["transferConditionBlocked", "โอนย้ายให้ผู้ถือครองใหม่ไม่ได้เพราะสภาพของทรัพย์สิน", "This asset cannot go to a new holder in its condition."],
    ["transferDepartmentLocked", "ข้อมูลผู้ถือครองของทรัพย์สินเปลี่ยนไป แผนกจึงเป็นไปตามผู้ถือครอง ตรวจสอบแล้วบันทึกอีกครั้ง", "The asset's holder has changed, so its department follows the holder. Check it and save again."],
    ["transferConditionDamaged", "สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "Damaged: send it for repair before giving it to a new holder"],
    ["transferConditionNonFunctional", "ใช้งานไม่ได้ ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "Not working: send it for repair before giving it to a new holder"],
    ["transferConditionSalvage", "เป็นซาก รอตัดจำหน่าย โอนย้ายให้ผู้ถือครองใหม่ไม่ได้", "Salvage awaiting disposal: it cannot go to a new holder"],
  ]) assert.deepEqual([messages("th").apiErrors[key], messages("en").apiErrors[key]], [th, en], key)
  // Under the asset field, the picker's own words (T1's asset.transactionReasonTransferCondition*), word for word.
  for (const name of ["Damaged", "NonFunctional", "Salvage"]) {
    for (const locale of ["th", "en"] as const) {
      assert.equal(messages(locale).apiErrors[`transferCondition${name}`], messages(locale).asset[`transactionReasonTransferCondition${name}`], `${locale} ${name}`)
    }
  }
})
```
  - **`tests/transfer-document-signatures.test.ts`, append** after the last `test(…)` and before `function read`:
```ts
test("the TR- document prints the department before the transfer above the one after it, so a room-only move that corrected the department shows both (group 3 plan 3, P3-R8)", () => {
  const print = read("src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx").replace(/\r\n/g, "\n")
  assert.match(print, /\{ label: t\("fromDepartment"\), value: labelOrDash\(labels, beforeSnapshot\?\.departmentId\) \},\n\s*\{ label: tAsset\("department"\), value: labelOrDash\(labels, afterSnapshot\?\.departmentId\) \},/)
  // The before department is already among the labels read.
  assert.match(print, /beforeSnapshot\?\.departmentId,\n/)
  const words = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).transfer.fromDepartment
  assert.deepEqual([words("th"), words("en")], ["แผนกเดิม", "Previous Department"])
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/asset-custody-route-claims.test.ts tests/api-error-catalog.test.ts tests/transfer-document-signatures.test.ts`.
  - **`asset-custody-route-claims`.** The harness change alone keeps every existing test green. The rewritten race test passes already: at HEAD, `emp-2` loses the claim as it should. The new tests fail as follows:
    - the department table: `'dept-1' !== 'dept-2'` on the first row, because HEAD writes `input.toDepartmentId ?? before`. Its five-field assertion already holds at HEAD (`route.ts:104-110`); it guards the Global Constraint that no `branchId` or `assetTag` is written;
    - the log: `previousDepartmentId` is `undefined`;
    - the order test: there is no `employee.findUnique` position;
    - equal-to-current: `201` instead of the 400;
    - the broken asset: `201` instead of the 409;
    - the lock: `201` instead of the 409;
    - inactive: `201` instead of the 409;
    - the closed department of a new holder: `'dept-1' !== 'dept-closed'`, because HEAD never reads the holder's department;
    - in-transaction: `201` instead of the 409;
    - the cancellation: no `department_change` line.
  - **`api-error-catalog`:** `null !== 'transferConditionBlocked'`.
  - **`transfer-document-signatures`:** the `fromDepartment` regex does not match.

- [ ] **Step 3: Implement.**
  - **Imports** (`route.ts:1-23`):
    - Add `import type { Prisma } from "@prisma/client"`.
    - `:13` becomes `import { getAssetLifecycleTransitionError, getCheckoutConditionBlock, getTransferTargetStatusName, type CheckoutConditionBlock } from "@/lib/asset-lifecycle-policy"`.
    - Add:
      - `import { getTransferDepartmentSource, getTransferNextDepartmentId } from "@/lib/asset-department-rule"`;
      - `import { normalizeAssetOwnershipType, type AssetOwnershipType } from "@/lib/asset-ownership"`;
      - `import { hasTransferChange, normalizeTransferDestinations, sameTransferDestinations, type TransferDestinations } from "@/lib/transfer-rules"`.
  - **Before the transaction, in this order.** Each step answers before anything is written.
    1. Auth, `assetTransferSchema.parse`, then the asset read (`:43-46`). The read's `include` gains `condition: { select: { name: true } }`. The 404 is unchanged.
    2. **Normalize.** After the 404:
       ```ts
       const sent: TransferDestinations = { toLocationId: input.toLocationId ?? null, toCustodianId: input.toCustodianId ?? null, toDepartmentId: input.toDepartmentId ?? null }
       const destinations = normalizeTransferDestinations(sent, asset)
       if (!hasTransferChange(destinations)) return noTransferChangeResponse()
       ```
       Add the comment: a destination equal to the current value is no change (spec §9.2, call 17; P3-R4), and nothing left reads as the schema's "at least one destination".
    3. The outstanding pre-check, the ownership refusal, the lifecycle check and the open handover, as today. `:52` becomes `const operation = destinations.toCustodianId ? "assign_custodian" : "move_scope"`.
    4. **The condition**, right after the open-handover refusal (`:62`). If `destinations.toCustodianId` is set, compute `getCheckoutConditionBlock(asset.condition?.name)`; a block answers `return conditionBlockedResponse(block)`. Comment: a broken asset does not go to a new holder (spec §19, P3-R1); a room or a department alone still moves; it is the last pre-check, as checkout's (A1-R2).
    5. **The destinations:** `await checkTransferDestinations(prisma, { ownership: normalizeAssetOwnershipType(asset.ownershipType), current: asset, destinations })`. It throws the lock or the inactive refusal, and the catch answers both.
    6. **The target status** (`:64`): `getTransferTargetStatusName(destinations.toCustodianId)`.
  - **Inside the transaction, in this order.**
    1. The claim and the outstanding re-read (`:70-71`) stay first.
    2. `beforeAsset`'s select (`:74-83`) gains `ownershipType: true` and `condition: { select: { name: true } }`. `createAssetTransactionSnapshot` picks its own fields, so the snapshots do not change.
    3. After `if (!beforeAsset) throw new Error("Asset not found")`:
       - **Re-normalize:** `if (!sameTransferDestinations(normalizeTransferDestinations(sent, beforeAsset), destinations)) throw new AssetOperationConflictError("ASSET_CHANGED_DURING_OPERATION", "Asset status changed while this request was being saved. Reload the asset and try again.")`. Comment: the operation and the target status were computed from the pre-check set (P3-R4).
       - **The condition again:** if `destinations.toCustodianId` is set and `getCheckoutConditionBlock(beforeAsset.condition?.name)` gives a block, `throw new TransferConditionBlockedError(block)`.
       - **The destinations again:** `const { nextDepartmentId } = await checkTransferDestinations(tx, { ownership: normalizeAssetOwnershipType(beforeAsset.ownershipType), current: beforeAsset, destinations })`.
    4. Then `const transferId = randomUUID()` and `generateTransferDocumentNo`, unmoved. Nothing that can refuse comes after them.
    5. `toSnapshot` (`:93-98`):
       ```ts
       locationId: destinations.toLocationId ?? beforeAsset.currentLocationId,
       custodianId: destinations.toCustodianId ?? beforeAsset.custodianId,
       departmentId: nextDepartmentId,
       statusId: targetStatusId,
       ```
       The asset update and the sync read it unchanged (`departmentId: toSnapshot.departmentId`).
    6. **The `department_change` line.** Directly after the `transfer` movement's `create` (`:123-135`), and before `syncInstalledComponentsWithParent`:
       ```ts
       if (nextDepartmentId !== beforeAsset.departmentId) await tx.assetMovement.create({ data: { assetId: id, movementType: "department_change", fromValue: beforeAsset.departmentId, toValue: nextDepartmentId, reason: "Asset transfer", referenceType: "transfer", referenceId: transferId, performedBy: user.id } })
       ```
       It has no `remark`. Comment: spec §6 call 6. The line carries the TR-'s reference, so cancelling the TR- does not count it as later work. Nothing writes the asset after `afterAsset`, or every TR- would read `asset_changed` (P3-R7).
  - **`logAudit`** (`:191`) stays on one line:
    ```ts
    newValue: { ...toSnapshot, reason: input.reason, remark: input.remark, componentSync, previousDepartmentId: fromSnapshot.departmentId },
    ```
  - **The catch** (`:195-203`): after the `AssetComponentOutstandingError` branch and before the `AssetOperationConflictError` branch, add:
    ```ts
    if (error instanceof TransferConditionBlockedError) return conditionBlockedResponse(error.block)
    if (error instanceof TransferDepartmentLockedError) return departmentLockedResponse()
    if (error instanceof TransferDestinationInactiveError) return destinationInactiveResponse(error.fields)
    ```
  - **Helpers after the handler.** None is exported: a route file exports its handlers only.
    - `type TransferDestinationField = "toLocationId" | "toCustodianId" | "toDepartmentId"`.
    - `const DESTINATION_INACTIVE_KEYS: Record<TransferDestinationField, string> = { toLocationId: "checkoutLocationInactive", toCustodianId: "checkoutReceiverInactive", toDepartmentId: "checkoutDepartmentInactive" }`. Comment: the checkout field words fit the transfer word for word; the code is the transfer's own (P3-R6).
    - `const CONDITION_BLOCKED_KEYS: Record<CheckoutConditionBlock, string> = { damaged: "transferConditionDamaged", nonFunctional: "transferConditionNonFunctional", salvage: "transferConditionSalvage" }`.
    - `checkTransferDestinations`:
      ```ts
      async function checkTransferDestinations(
        db: Pick<Prisma.TransactionClient, "employee" | "department" | "location">,
        input: { ownership: AssetOwnershipType; current: { custodianId: string | null; departmentId: string | null }; destinations: TransferDestinations },
      ): Promise<{ nextDepartmentId: string | null }>
      ```
      1. **The source:** `source = getTransferDepartmentSource({ ownership, currentCustodianId: current.custodianId, newCustodianId: destinations.toCustodianId })`.
      2. **The reads, in this order, each only when it applies:**
         1. when `source === "currentHolder"`, the current holder: `db.employee.findUnique({ where: { id: current.custodianId }, select: { departmentId: true } })`, with **no** `isActive`;
         2. when `destinations.toCustodianId` is set, the new holder: `db.employee.findFirst({ where: { id, isActive: true }, select: { departmentId: true } })`;
         3. when `destinations.toLocationId` is set, the room: `db.location.findFirst({ where: { id, isActive: true }, select: { id: true } })`;
         4. when `source === "free"` and `destinations.toDepartmentId` is set, the department: `db.department.findFirst({ where: { id, isActive: true }, select: { id: true } })`.
      3. **The next department:** `nextDepartmentId = getTransferNextDepartmentId({ ownership, currentCustodianId: current.custodianId, newCustodianId: destinations.toCustodianId, currentDepartmentId: current.departmentId, currentHolderDepartmentId: holder?.departmentId ?? null, newHolderDepartmentId: newHolder?.departmentId ?? null, chosenDepartmentId: destinations.toDepartmentId })`.
      4. **The lock:** if `source !== "free"` and `destinations.toDepartmentId !== null` and `destinations.toDepartmentId !== nextDepartmentId`, throw `new TransferDepartmentLockedError()`.
      5. **The inactive fields, in this order:**
         1. `toLocationId`, when it was sent and no room was found;
         2. `toCustodianId`, when it was sent and no new holder was found;
         3. `toDepartmentId`, when the source is `"free"`, it was sent and no department was found.

         Any failing field throws `new TransferDestinationInactiveError(fields)`.
      6. Otherwise return `{ nextDepartmentId }`.

      Its comment: the rows the department rule (spec §6, P3-R3) and the active check (P3-R6) need. The current holder is read without `isActive`, because one who has left still decides the department. The lock is refused before the inactive fields (P3-R5). A locked department is never read for `isActive`, because an inactive department on an active employee is written as it is (call 5). It is called before the transaction and again inside it.
    - **The three classes.** Declare their fields in the class body; use no parameter properties, because `node --test` strips types only. Each sets `this.name`.
      - `class TransferConditionBlockedError extends Error { readonly block: CheckoutConditionBlock }`; its constructor calls `super("ASSET_TRANSFER_CONDITION_BLOCKED")`.
      - `class TransferDepartmentLockedError extends Error`; its constructor calls `super("ASSET_TRANSFER_DEPARTMENT_LOCKED")`.
      - `class TransferDestinationInactiveError extends Error { readonly fields: TransferDestinationField[] }`; its constructor calls `super("ASSET_TRANSFER_DESTINATION_INACTIVE")`.
    - **The four responses,** with `error:` written as literals so the catalog scanner sees them:
      - `noTransferChangeResponse()` → `NextResponse.json({ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { toLocationId: "transferDestinationRequired" } }, { status: 400 })`;
      - `conditionBlockedResponse(block)` → 409 `{ code: "ASSET_TRANSFER_CONDITION_BLOCKED", error: "ASSET_TRANSFER_CONDITION_BLOCKED", fieldErrors: { assetId: CONDITION_BLOCKED_KEYS[block] } }`;
      - `departmentLockedResponse()` → 409 `{ code: "ASSET_TRANSFER_DEPARTMENT_LOCKED", error: "ASSET_TRANSFER_DEPARTMENT_LOCKED" }`. Comment: no field, because the department row is disabled on the form and cannot take focus; the form toasts and reads the asset again (P3-R5, P3-R15);
      - `destinationInactiveResponse(fields)` → 409 `{ code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE", fieldErrors: Object.fromEntries(fields.map((field) => [field, DESTINATION_INACTIVE_KEYS[field]])) }`.
  - **The catalog.** In `src/lib/api-error-catalog.ts`, directly after `"ASSET_STATUS_TRANSFER_NOT_ALLOWED": "statusBlocksTransfer",` (`:57`), add:
    ```ts
      // โอนย้าย's own refusals (group 3 plan 3); an inactive destination reads ส่งมอบ's toast words.
      "ASSET_TRANSFER_CONDITION_BLOCKED": "transferConditionBlocked",
      "ASSET_TRANSFER_DEPARTMENT_LOCKED": "transferDepartmentLocked",
      "ASSET_TRANSFER_DESTINATION_INACTIVE": "checkoutDestinationInactive",
    ```
  - **The TR- page.** In `transfers/[id]/page.tsx`, between `{ label: tAsset("currentLocation"), … }` (`:121`) and `{ label: tAsset("department"), … }` (`:122`), add this line at the same indentation as its neighbours:
    ```tsx
                { label: t("fromDepartment"), value: labelOrDash(labels, beforeSnapshot?.departmentId) },
    ```
    The labels map already reads `beforeSnapshot?.departmentId` (`:55`). `TransactionCancelDialog` and `formatSnapshotState` do not change.
  - **The words.** Save `<session scratchpad>/tx-group/msg/p3-t2-messages.json`, then run `node scripts/messages-edit.mjs <that file>`. Expected: `messages updated: 6 th, 6 en, 0 deleted`.
```json
{ "set": {
  "th": {
    "apiErrors.transferConditionBlocked": "โอนย้ายให้ผู้ถือครองใหม่ไม่ได้เพราะสภาพของทรัพย์สิน",
    "apiErrors.transferConditionDamaged": "สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่",
    "apiErrors.transferConditionNonFunctional": "ใช้งานไม่ได้ ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่",
    "apiErrors.transferConditionSalvage": "เป็นซาก รอตัดจำหน่าย โอนย้ายให้ผู้ถือครองใหม่ไม่ได้",
    "apiErrors.transferDepartmentLocked": "ข้อมูลผู้ถือครองของทรัพย์สินเปลี่ยนไป แผนกจึงเป็นไปตามผู้ถือครอง ตรวจสอบแล้วบันทึกอีกครั้ง",
    "transfer.fromDepartment": "แผนกเดิม"
  },
  "en": {
    "apiErrors.transferConditionBlocked": "This asset cannot go to a new holder in its condition.",
    "apiErrors.transferConditionDamaged": "Damaged: send it for repair before giving it to a new holder",
    "apiErrors.transferConditionNonFunctional": "Not working: send it for repair before giving it to a new holder",
    "apiErrors.transferConditionSalvage": "Salvage awaiting disposal: it cannot go to a new holder",
    "apiErrors.transferDepartmentLocked": "The asset's holder has changed, so its department follows the holder. Check it and save again.",
    "transfer.fromDepartment": "Previous Department"
  }
} }
```
    The three `transferCondition*` values equal T1's `asset.transactionReasonTransferCondition*` word for word in both locales (Y19), and the catalog test pins that. The English of `transferConditionBlocked`, `transferDepartmentLocked` and `transfer.fromDepartment` (the sibling of "Previous Custodian") is approved as written (Y19). Every Thai string passes `tests/thai-glossary.test.ts`: it uses ผู้ถือครอง in full, and neither ตรวจทาน nor พื้นที่.

- [ ] **Step 4: Run the focused tests, then the full checks.**
  - Run `node --test tests/asset-custody-route-claims.test.ts tests/api-error-catalog.test.ts tests/transfer-document-signatures.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/e2e-fixes.test.ts tests/asset-component-sync-routes.test.ts tests/asset-movement-labels.test.ts tests/asset-transaction-cancellation-prisma.test.ts tests/thai-glossary.test.ts`. Expected: all pass.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors.
  - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add "src/app/api/assets/[id]/transfer/route.ts" src/lib/api-error-catalog.ts "src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx" messages/th.json messages/en.json tests/asset-custody-route-claims.test.ts tests/api-error-catalog.test.ts tests/transfer-document-signatures.test.ts
git commit -m "feat(transfer): the route writes the holder's department with its own history line and drops a destination equal to the current value; it refuses a broken asset going to a new holder, a department sent while it follows the holder, and an inactive room, holder or department, before the TR- number; the TR- prints แผนกเดิม (group 3 spec §6, §9.2, §9.3, §19; P3-R1, P3-R3 to P3-R8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The data for the form: the chosen asset's holder and branch, and โอนย้าย's master options (spec §9.1-§9.3, §6 call 5; P3-R9, with the read parts of P3-R3, P3-R10, P3-R13, P3-R15)

The โอนย้าย form (T5, T6) has to decide, before saving, whether แผนก is locked, what "ตามผู้ถือครอง: <แผนก>" reads, whether a pick equals the current value, whether a room is in another branch, and what the summary names. Today the chosen asset's detail carries labels only, and the master options carry no employee department name and no room branch. This task adds the five detail fields and two option flags that only the transfer page will pass. It changes no page and no form: T6 passes the flags and `{ detail: true }`.

**Rulings this task carries (copied from the skeleton):**
- **P3-R9 (data).**
  - **Detail** (`AssetOperationChosenDetail`) gains required fields: `holderId: string | null`, `holderActive: boolean | null` (null when no holder), `holderDepartmentId: string | null`, `holderDepartmentName: string | null` (the custodian's own department relation, active or not), `ownerBranchId: string`. The detail select overrides `custodian` with `{ code, fullNameTh, isActive, departmentId, department: { select: { name } } }` and adds `branchId`. The five typed fixtures are rewritten in the same commit.
  - **Master options:** two new flags on `getAssetOperationMasterOptions`, used by the transfer page only:
    - `employeeDepartment: true` → employees are `AssetOperationEmployeeDepartmentOption` (`name` = fullNameTh alone for the card, look L1; `departmentName` from the employee's own department relation, inactive included);
    - `locationBranch: true` → locations are `AssetOperationLocationBranchOption` (`branchId`, `branchName`).
    - Do not use `employeeDetail` (it runs the held-count groupBy).
  - **Branches are compared by id, never by name** (branch names repeat across companies: `Branch` is unique per `[companyId, code]`, `prisma/schema.prisma`).
- **P3-R3 (read part):** the current holder's department is read **without** `isActive` (a holder who left still decides it). An inactive department on an active employee is written as it is (spec §6 call 5), so its name must reach the form.
- **P3-R10 (read part):** a former holder (`holderActive === false`) is shown as such by T5; the detail only carries the flag.
- **P3-R15 (read part):** the form reads the detail with `buildAssetOperationSearchHref({ mode: "transfer", id, detail: true, assignCustodian })`. That works today with no server change (`asset-operation-search.ts:225` attaches the detail in every mode); this task pins it.
- **Global Constraints, bounded reads:** the search answers ≤20 rows; the by-id detail reads one asset. The new options flags are used by the transfer page only; the other three pages and their pins are unchanged.

**Decisions (beyond the skeleton):**
- **`AssetOperationLocationBranchOption` keeps `name`:** it is `AssetOperationNamedOption & { branchId: string; branchName: string }`. The skeleton wrote `AssetOperationOption & …`; T5's footer and lead name the room alone (look L1), and every location option already carries `name`. It is a superset, so a consumer written to the skeleton's shape still compiles.
- **`AssetOperationEmployeeDepartmentOption`** is written `AssetOperationEmployeePlainOption & { name: string; departmentName: string }`: structurally the skeleton's `AssetOperationOption & { departmentId; name; departmentName }`.
- **`AssetOperationMasterOptions` gains a second type parameter** `Location extends AssetOperationNamedOption = AssetOperationNamedOption`, so `locations` is typed by the flag. Every existing use keeps its default.
- **One new overload, for the pair** `{ employeeDepartment: true; locationBranch: true; conditionsFor? }`: the transfer page passes both. At runtime each flag reads only its own list (pinned), so plan 4's bulk move can add a `locationBranch`-only overload line without touching the body. `employeeDetail` (a superset) wins over `employeeDepartment` if both reach the body; no overload allows both.
- **The flagged employee select reads `department: { select: { code: true, name: true } }`**, the same relation select as `employeeDetail`, so the internal `EmployeeRow` type stays one shape. Only `departmentName` reaches the page.
- **`holderId` is `asset.custodianId`**, already in the list select (`:182`); no select change for it.
- **`src/lib/asset-operation-search.ts` does not change:** no read is added (one more JOIN on the same by-id read), its read-budget comment stays true, and the cast `assets[0] as AssetOperationSearchDetailAsset` (`:225`) still type-checks with the wider `custodian`.
- **`tests/e2e-transactions.test.ts:136` holds as it is:** the plain overload's text does not change. This task adds a sibling pin for the new overload (Step 1). T6 rewrites `:137` (the transfer page's call).

**Files:**
- Modify:
  - `src/lib/asset-operation-search-rules.ts`: the detail select and its comment (`:192-200`); `AssetOperationChosenDetail` and its comment (`:307-328`); the return object of `buildAssetOperationRowDetail` (`:612-624`).
  - `src/lib/asset-operation-options.ts`: `EmployeeRow` (`:10`); the plain option's comment (`:12`); after `:13`, the two new option types; `AssetOperationMasterOptions` (`:26-32`); the comment and overloads (`:34-41`); the flags (`:42`); the employee select (`:46-48`); the location read (`:56-60`); the employee and location mappings (`:87-98`, `:100`).
- Test (modify):
  - `tests/asset-operation-search-rules.test.ts`, `tests/asset-operation-search.test.ts`, `tests/asset-operation-master-options.test.ts`, `tests/e2e-transactions.test.ts`;
  - the typed fixtures in `tests/checkin-form-rules.test.ts`, `tests/checkin-late-return-rules.test.ts`, `tests/checkout-form-rules.test.ts` (the other two of the five are in `asset-operation-search-rules.test.ts` and `asset-operation-search.test.ts`).
- **Do not touch:**
  - `src/lib/asset-operation-search.ts` (above);
  - `src/components/asset-operations/transfer-form.tsx` and `src/app/[locale]/(dashboard)/asset-management/transfer/page.tsx` (T6 passes the flags and `{ detail: true }`);
  - the ส่งมอบ, รับคืน and ย้ายหลายรายการ pages and their option calls; `AssetOperationEmployeeOption`; `checkout-form-rules.ts`, `checkin-form-rules.ts`;
  - messages (this task has no words).

**Pins this task breaks (each rewritten in this commit, Step 1):**
- `tests/asset-operation-search-rules.test.ts:85-103`: the detail deep-equal (new fields), and `chosen` no longer type-checks (`held`'s `custodian` lacks `isActive`, `departmentId`, `department`; no `branchId`).
- `tests/asset-operation-search.test.ts`: `:28-33` (`detailAsset`: no `branchId`, and the spread's `custodian` type is the list's), `:222` and `:326` (`custodian: somchai` no longer type-checks), `:226-230` (the detail deep-equal).
- The typed fixtures (type-check only; `node --test` strips types): `tests/checkin-form-rules.test.ts:25-26`, `tests/checkin-late-return-rules.test.ts:22-28`, `tests/checkout-form-rules.test.ts:39-52`.

**Pins that hold unchanged:** `tests/asset-operation-master-options.test.ts:73-84`, `:86-116`, `:118-132`, `:134-149` (the location fixture gains a branch, and none of these answers may show it); `tests/e2e-transactions.test.ts:136-139`; `tests/list-frame-guards.test.ts:177` (LV2 counts 2 raw `"-"` in `asset-operation-search-rules.ts`: add none, and none to `asset-operation-options.ts`, which has no entry); `tests/asset-operation-search-rules.test.ts:242-243` (P3-R1, GP W10); `tests/asset-operation-picker-forms.test.ts:29-35` (T6's).

**Interfaces:**
- Consumes:
  - Prisma relations (`prisma/schema.prisma`): `Asset.branchId` (required), `Asset.custodian` → `Employee` (`isActive`, `departmentId` required, `department` required relation), `Location.branchId` (required) and `Location.branch`.
  - `buildAssetOperationSearchHref` (`asset-operation-search-rules.ts:89-103`), unchanged: it appends `mode, q, id, assignCustodian=1, detail=1`.
  - Nothing from T1 or T2. The new search test's verdict (`asset.transactionReasonStatusNotTransferable` for an Under Maintenance asset with `assignCustodian`) is the same before and after T1, whose condition rule comes last and the fixture's condition is Good.
- Produces (names binding for T5 and T6):
  ```ts
  // src/lib/asset-operation-search-rules.ts
  export type AssetOperationChosenDetail = {
    /* today's fields, unchanged */
    holderId: string | null              // asset.custodianId
    holderActive: boolean | null         // the holder's Employee.isActive; null when there is no holder
    holderDepartmentId: string | null    // the holder's Employee.departmentId, read without isActive
    holderDepartmentName: string | null  // that department's name alone, active or not
    ownerBranchId: string                // asset.branchId; compare by id with a room's branchId
  }
  // assetOperationSearchDetailAssetSelect gains branchId: true and
  //   custodian: { select: { code: true, fullNameTh: true, isActive: true, departmentId: true, department: { select: { name: true } } } }
  // so AssetOperationSearchDetailAsset has branchId: string and
  //   custodian: { code: string; fullNameTh: string; isActive: boolean; departmentId: string; department: { name: string } } | null

  // src/lib/asset-operation-options.ts
  export type AssetOperationEmployeeDepartmentOption = AssetOperationEmployeePlainOption & { name: string; departmentName: string }
  export type AssetOperationLocationBranchOption = AssetOperationNamedOption & { branchId: string; branchName: string }
  export type AssetOperationMasterOptions<
    Employee extends AssetOperationEmployeePlainOption = AssetOperationEmployeePlainOption,
    Location extends AssetOperationNamedOption = AssetOperationNamedOption,
  > = { employees: Employee[]; departments: AssetOperationNamedOption[]; locations: Location[]; statuses: AssetOperationNamedOption[]; conditions: AssetOperationNamedOption[] }
  export async function getAssetOperationMasterOptions(options: { employeeDepartment: true; locationBranch: true; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions<AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption>>
  ```
  - **What each field is, for T5 and T6:**
    - employee: `label` "code - fullNameTh" (the picker option), `departmentId` (`Employee.departmentId`, what the route writes for a new holder), `name` (fullNameTh alone), `departmentName` (the employee's own department's name, active or not);
    - location: `label` "code - name", `name` (the room alone), `branchId` (compare with `detail.ownerBranchId`), `branchName`;
    - `departments` stays the active-only picker list (`{ id, label, name }`); never join a new holder's department name from it (an inactive one would be missing);
    - detail: the ตอนนี้ cells keep reading `row.locationLabel` + `detail.locationBranchLabel`, `detail.holderLabel`, `detail.departmentLabel`; the cross-branch line's `{branch}` is `detail.ownerBranchLabel`.

- [ ] **Step 1: Write the failing tests, and rewrite the pins above.**

`tests/asset-operation-search-rules.test.ts`:
- Add `assetOperationSearchAssetSelect` and `assetOperationSearchDetailAssetSelect` to the import from `../src/lib/asset-operation-search-rules.ts` (`:11-21`).
- After `:28` (`const somchai = …`), add:
```ts
/** The detail read's holder (plan 3 P3-R9): the active flag and the holder's own department, read through the relation. */
const somchaiDetail = { ...somchai, isActive: true, departmentId: "dep-it", department: { name: "ฝ่ายไอที" } }
```
- Replace the test at `:85-103` with the test below, and insert the two tests after it (before the "the text matches 6 of the register's own conditions" test):
```ts
test("the chosen asset's detail: ownership, the status's English name, department and holder as 'code - name' (null when none), the holder's id, active flag and own department, the asset's branch id and both branch names, each installed component once by tag with whether it travels (group 3 plan 1 Task 4, spec §7.1; plan 3 P3-R9)", () => {
  const chosen: AssetOperationSearchDetailAsset = { ...held, custodian: somchaiDetail, ownershipType: "stock", departmentId: "dep-acc", department: { code: "ACC", name: "บัญชี" },
    branchId: "br-hq", branch: { name: "สำนักงานใหญ่" }, currentLocation: { code: "RY-01", name: "ห้องบัญชี", branch: { name: "สาขาระยอง" } } }
  const link = (id: string, assetTag: string, name: string) => ({ componentAssetId: id, componentAsset: { assetTag, name, currentLocation: { code: "RY-01", name: "ห้องบัญชี" } } })
  const links = [link("c-2", "NB-0017-02", "Mouse ไร้สาย"), link("c-1", "NB-0017-01", "Adapter 65W"), link("c-2", "NB-0017-02", "Mouse ไร้สาย")]
  const expected: AssetOperationChosenDetail = {
    ownership: "stock", statusName: "In Use", departmentId: "dep-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี", holderLabel: "EMP-0412 - สมชาย ใจดี", holderName: "สมชาย ใจดี",
    holderId: "emp-1", holderActive: true, holderDepartmentId: "dep-it", holderDepartmentName: "ฝ่ายไอที",
    ownerBranchId: "br-hq", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สาขาระยอง",
    components: [{ id: "c-1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true, locationLabel: "RY-01 - ห้องบัญชี" }, { id: "c-2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: false, locationLabel: "RY-01 - ห้องบัญชี" }],
    outstandingComponents: [],
  }
  assert.deepEqual(buildAssetOperationRowDetail(chosen, links, new Set(["c-2"]), []), expected)
  const bare = buildAssetOperationRowDetail({ ...chosen, ownershipType: "bogus", departmentId: null, department: null, custodianId: null, custodian: null }, [], new Set(), [])
  assert.deepEqual([bare.ownership, bare.departmentId, bare.departmentLabel, bare.departmentName, bare.holderLabel, bare.holderName, bare.components], ["personal", null, null, null, null, null, []])
  assert.deepEqual([bare.holderId, bare.holderActive, bare.holderDepartmentId, bare.holderDepartmentName], [null, null, null, null], "no holder: every holder field is null")
  // The same links the sync moves with the parent (asset-component-sync.ts:115-122).
  assert.deepEqual(buildAssetOperationComponentLinkWhere("asset-1"), { parentAssetId: "asset-1", status: "installed", removedAt: null, componentAsset: { isActive: true } })
  const sync = readFileSync("src/lib/asset-component-sync.ts", "utf8")
  for (const part of ['status: "installed"', "removedAt: null", "componentAsset: { isActive: true }"]) assert.ok(sync.includes(part), part)
})

test("a holder who left: the detail keeps their id, says they left, and still names their own department, apart from the asset's (group 3 plan 3 P3-R3, P3-R9, P3-R10)", () => {
  const leaver = { code: "EMP-0099", fullNameTh: "สมศรี ลาออก", isActive: false, departmentId: "dep-old", department: { name: "ฝ่ายขายเดิม" } }
  const chosen: AssetOperationSearchDetailAsset = { ...held, custodianId: "emp-9", custodian: leaver, departmentId: "dep-acc", department: { code: "ACC", name: "บัญชี" },
    branchId: "br-hq-2", branch: { name: "สำนักงานใหญ่" }, currentLocation: { code: "HQ-01", name: "ห้อง 101", branch: { name: "สำนักงานใหญ่" } } }
  const detail = buildAssetOperationRowDetail(chosen, [], new Set(), [])
  assert.deepEqual(
    [detail.holderId, detail.holderActive, detail.holderLabel, detail.holderName, detail.holderDepartmentId, detail.holderDepartmentName, detail.departmentId, detail.departmentName],
    ["emp-9", false, "EMP-0099 - สมศรี ลาออก", "สมศรี ลาออก", "dep-old", "ฝ่ายขายเดิม", "dep-acc", "บัญชี"],
  )
  // The branch is carried by id: another company's head office has the same name (Branch is unique per [companyId, code]).
  assert.deepEqual([detail.ownerBranchId, detail.ownerBranchLabel, detail.locationBranchLabel], ["br-hq-2", "สำนักงานใหญ่", "สำนักงานใหญ่"])
})

test("the detail read adds the asset's branch id, and the holder's active flag and own department with no isActive filter; the list read keeps its select (group 3 plan 3 P3-R9; server search spec bounded reads)", () => {
  assert.deepEqual(assetOperationSearchDetailAssetSelect, {
    ...assetOperationSearchAssetSelect,
    departmentId: true,
    branchId: true,
    department: { select: { code: true, name: true } },
    branch: { select: { name: true } },
    currentLocation: { select: { code: true, name: true, branch: { select: { name: true } } } },
    custodian: { select: { code: true, fullNameTh: true, isActive: true, departmentId: true, department: { select: { name: true } } } },
  })
  assert.deepEqual(assetOperationSearchAssetSelect.custodian, { select: { code: true, fullNameTh: true } })
  assert.equal("branchId" in assetOperationSearchAssetSelect, false)
})
```
A fake cannot model an inactive department; the select pin is the guard: a to-one relation select carries no `where`, so `department.name` comes back whatever the department's `isActive`.

`tests/asset-operation-search.test.ts`:
- Add `buildAssetOperationSearchHref` to the import from `../src/lib/asset-operation-search-rules.ts` (`:5-11`).
- After `:19` (`const somchai = …`), add:
```ts
/** The detail read's holder (plan 3 P3-R9): the active flag and the holder's own department. */
const somchaiDetail = { ...somchai, isActive: true, departmentId: "dep-it", department: { name: "ฝ่ายไอที" } }
```
- `:30` becomes `    ...asset(tag), custodian: null, departmentId: null, department: null, branchId: "br-hq", branch: { name: "สำนักงานใหญ่" },`. The explicit `custodian: null` is needed: the spread's `custodian` has the list's type, which `tsc` rejects for the detail type.
- `:222` and `:326`: `custodian: somchai` becomes `custodian: somchaiDetail`.
- `:227` becomes two lines:
```ts
    ownership: "personal", statusName: "Ready", departmentId: "dep-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี", holderLabel: "EMP-0412 - สมชาย ใจดี", holderName: "สมชาย ใจดี",
    holderId: "emp-1", holderActive: true, holderDepartmentId: "dep-it", holderDepartmentName: "ฝ่ายไอที", ownerBranchId: "br-hq", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สาขาระยอง",
```
- After `:244`, add:
```ts
  assert.deepEqual([shared.detail?.holderId, shared.detail?.holderActive, shared.detail?.holderDepartmentId, shared.detail?.holderDepartmentName, shared.detail?.ownerBranchId], [null, null, null, null, "br-hq"])
```
- Append:
```ts
test("โอนย้าย reads its chosen asset by id with detail=1, and with assignCustodian=1 once a holder is picked: one detail read, the verdict under the holder rule (group 3 plan 3 P3-R15)", async () => {
  const repairing = detailAsset("NB-0228", { id: "asset-1", custodianId: "emp-1", custodian: somchaiDetail, status: { name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม" } })
  for (const [assignCustodian, verdict] of [[false, [true, null]], [true, [false, "asset.transactionReasonStatusNotTransferable"]]] as const) {
    const { db, calls } = fakeDb({ contains: [repairing] })
    const href = buildAssetOperationSearchHref({ mode: "transfer", id: "asset-1", detail: true, assignCustodian })
    const [row] = (await searchAssetOperationOptions(db, input(href.slice(href.indexOf("?") + 1)))).rows
    assert.deepEqual([row.eligible, row.reasonKey], verdict, href)
    assert.deepEqual([row.detail?.holderId, row.detail?.holderActive, row.detail?.holderDepartmentId, row.detail?.ownerBranchId], ["emp-1", true, "dep-it", "br-hq"], href)
    assert.deepEqual(calls.filter((call) => call.call === "asset.findMany").map((call) => call.args.select), [assetOperationSearchDetailAssetSelect], href)
  }
})
```

`tests/asset-operation-master-options.test.ts`:
- The location fixture (`:19`) becomes `  location: [{ id: "l1", code: "HQ-01", name: "ห้อง 101", branchId: "b-hq", branch: { name: "สำนักงานใหญ่" } }],`. The existing deep-equals (`:95`) still expect `{ id, label, name }` only: without the flag the branch must not leak.
- The first test (`:73`): the title becomes `"without employeeDetail (รับคืน, ย้ายหลายรายการ) the employees carry their department id only and the rooms no branch: no department or branch read, no held-count groupBy (final review M4, group 3 plan 3 P3-R9)"`. After `:83`, add:
```ts
  assert.deepEqual(plain.locations, [{ id: "l1", label: "HQ-01 - ห้อง 101", name: "ห้อง 101" }], "the row's branch is not passed on")
  assert.deepEqual((state.args["location.findMany"] as { select: unknown }).select, { id: true, code: true, name: true })
```
- Insert before the conditions test (`:118`):
```ts
test("with employeeDepartment and locationBranch (โอนย้าย) each employee carries its name and its own department's name, read through the relation, so an inactive department is still named; each room carries its branch id and name; no held count (group 3 plan 3 P3-R9, spec §6 call 5, §9.3)", async () => {
  const saved = fixtures.location
  fixtures.location = [
    { id: "l1", code: "HQ-01", name: "ห้อง 101", branchId: "b-hq", branch: { name: "สำนักงานใหญ่" } },
    // Another company's head office: the same branch name, another id. The form compares branchId (P3-R13).
    { id: "l2", code: "HQ2-01", name: "ห้องประชุม", branchId: "b-hq-2", branch: { name: "สำนักงานใหญ่" } },
  ]
  try {
    state.calls = []
    state.args = {}
    assert.deepEqual(await options.getAssetOperationMasterOptions({ employeeDepartment: true, locationBranch: true }), {
      // E001's department d2 is not in the active list below: its name comes from the employee's own relation.
      employees: [
        { id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d2", name: "สมชาย ใจดี", departmentName: "บัญชี" },
        { id: "e2", label: "E002 - สมหญิง รักงาน", departmentId: "d1", name: "สมหญิง รักงาน", departmentName: "ไอที" },
      ],
      departments: [{ id: "d1", label: "IT - ไอที", name: "ไอที" }],
      locations: [
        { id: "l1", label: "HQ-01 - ห้อง 101", name: "ห้อง 101", branchId: "b-hq", branchName: "สำนักงานใหญ่" },
        { id: "l2", label: "HQ2-01 - ห้องประชุม", name: "ห้องประชุม", branchId: "b-hq-2", branchName: "สำนักงานใหญ่" },
      ],
      statuses: [{ id: "s1", label: "พร้อมใช้งาน", name: "Ready" }],
      conditions: [{ id: "c1", label: "ดี", name: "Good" }],
    })
    assert.deepEqual([...state.calls].sort(), ["assetCondition.findMany", "assetStatus.findMany", "department.findMany", "employee.findMany", "location.findMany"])
    assert.deepEqual(state.args["employee.findMany"], {
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true, departmentId: true, department: { select: { code: true, name: true } } },
      orderBy: { code: "asc" },
    })
    assert.deepEqual(state.args["location.findMany"], {
      where: { isActive: true },
      select: { id: true, code: true, name: true, branchId: true, branch: { select: { name: true } } },
      orderBy: { code: "asc" },
    })
    assert.deepEqual((state.args["department.findMany"] as { where: unknown }).where, { isActive: true }, "the destination list stays active only")
  } finally {
    fixtures.location = saved
  }
})

test("each transfer flag reads only its own list: employeeDepartment leaves the rooms plain, locationBranch the employees (group 3 plan 3 P3-R9)", async () => {
  state.calls = []
  state.args = {}
  const named = await options.getAssetOperationMasterOptions({ employeeDepartment: true })
  assert.deepEqual(named.employees[0], { id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d2", name: "สมชาย ใจดี", departmentName: "บัญชี" })
  assert.deepEqual(named.locations, [{ id: "l1", label: "HQ-01 - ห้อง 101", name: "ห้อง 101" }])
  assert.deepEqual((state.args["location.findMany"] as { select: unknown }).select, { id: true, code: true, name: true })
  const branched = await options.getAssetOperationMasterOptions({ locationBranch: true })
  assert.deepEqual(branched.employees[0], { id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d2" })
  assert.deepEqual((state.args["employee.findMany"] as { select: unknown }).select, { id: true, code: true, fullNameTh: true, departmentId: true })
  assert.deepEqual(branched.locations, [{ id: "l1", label: "HQ-01 - ห้อง 101", name: "ห้อง 101", branchId: "b-hq", branchName: "สำนักงานใหญ่" }])
  assert.equal(state.calls.includes("asset.groupBy"), false)
})
```
The module is imported dynamically (`:71`), so the single-flag calls type-check; at the type level only the pair has an overload.

`tests/e2e-transactions.test.ts`: after `:136`, add:
```ts
  // โอนย้าย alone reads the employees' own department and the rooms' branch, with no held count (group 3 plan 3 P3-R9).
  assert.match(read("src/lib/asset-operation-options.ts"), /export async function getAssetOperationMasterOptions\(options: \{ employeeDepartment: true; locationBranch: true; conditionsFor\?: AssetOperationConditionOperation \}\): Promise<AssetOperationMasterOptions<AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption>>/)
```

The typed fixtures (each `detail` gains the five fields):
- `tests/checkin-form-rules.test.ts:26` becomes two lines:
```ts
      holderLabel: "E001 - สมชาย ใจดี", holderName: "สมชาย ใจดี", holderId: "e1", holderActive: true, holderDepartmentId: "d-acc", holderDepartmentName: "บัญชี",
      ownerBranchId: "b-hq", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่", components: [], outstandingComponents: [], ...d },
```
- `tests/checkin-late-return-rules.test.ts:24` becomes two lines:
```ts
      holderLabel: "EMP-0412 - สมชาย ใจดี", holderName: "สมชาย ใจดี", holderId: "emp-1", holderActive: true, holderDepartmentId: "dep-acc", holderDepartmentName: "บัญชี",
      ownerBranchId: "br-hq", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่",
```
- `tests/checkout-form-rules.test.ts`: after `holderName: null,` (`:46`), add five lines: `holderId: null,`, `holderActive: null,`, `holderDepartmentId: null,`, `holderDepartmentName: null,`, `ownerBranchId: "b-hq",` (same indentation).

These builders' overrides (e.g. `{ holderLabel: null, holderName: null }` at `checkin-form-rules.test.ts:58`) do not touch the new fields; the ส่งมอบ and รับคืน rules never read them.

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-master-options.test.ts tests/e2e-transactions.test.ts tests/checkin-form-rules.test.ts tests/checkin-late-return-rules.test.ts tests/checkout-form-rules.test.ts`. Expected:
  - `asset-operation-search-rules`: 3 failures, all strict deep-equal: the rewritten detail test (the detail has no `holderId` … `ownerBranchId`), the holder-who-left test, the select test (no `branchId`, the list's `custodian`).
  - `asset-operation-search`: 3 failures: the `detail=1` test (`:221`), the without-`detail=1` test (`:236`: the added line reads `undefined`, not `null`) and the new โอนย้าย test.
  - `asset-operation-master-options`: 2 failures, the two new tests. The first test passes already: it pins today's answer with the richer fixture.
  - `e2e-transactions`: the TX1 test (`:24`) fails on the new pin, "The input did not match the regular expression".
  - The three fixture files pass (`node --test` strips types). `npx tsc --noEmit` flags their new keys as unknown properties until Step 3.

- [ ] **Step 3: Implement.**

**3a. The detail** (`src/lib/asset-operation-search-rules.ts`).
- The detail select (`:192-199`) becomes exactly Step 1's pin: add `branchId: true` after `departmentId: true`, and, last, `custodian: { select: { code: true, fullNameTh: true, isActive: true, departmentId: true, department: { select: { name: true } } } }`, which overrides the spread list select's `custodian`. Keep `satisfies Prisma.AssetSelect`. Its comment becomes:
  "The by-id read with detail=1 (group 3 spec §7.1, §9.2): the list select, plus the department, the asset's branch (its id too: branch names repeat across companies) and the room's branch, and the holder's active flag and own department. The holder and their department are read without isActive: a holder who left still decides a held asset's department (plan 3 P3-R3, P3-R10)."
- `assetOperationSearchAssetSelect` (`:175-189`) does not change: list rows do not take the JOIN.
- `AssetOperationChosenDetail`: its comment (`:307`) reads "The chosen asset's detail on ส่งมอบ, รับคืน and โอนย้าย (group 3 spec §7.1, §7.3, §9.2). Labels are null when there is none, never "-"." After `holderName` (`:320`), add, in this order and with these comments:
  ```ts
  /** The asset's custodianId: a holder equal to the current one is not a change (plan 3 P3-R4). */
  holderId: string | null
  /** The holder's Employee.isActive, null when there is no holder: false is a holder who left (P3-R10). */
  holderActive: boolean | null
  /** The holder's own department (Employee.departmentId), active or not: what a held asset's department follows (§6, P3-R3). */
  holderDepartmentId: string | null
  /** That department's name alone, active or not (look L1). */
  holderDepartmentName: string | null
  /** asset.branchId: the branch the asset tag belongs to, compared by id with a room's branch (P3-R13). */
  ownerBranchId: string
  ```
- `buildAssetOperationRowDetail`'s return object (`:612-624`), after `holderName`:
  - `holderId: asset.custodianId`;
  - `holderActive: asset.custodian ? asset.custodian.isActive : null`;
  - `holderDepartmentId: asset.custodian?.departmentId ?? null`;
  - `holderDepartmentName: asset.custodian?.department.name ?? null`;
  - `ownerBranchId: asset.branchId`, before `ownerBranchLabel`.
- `buildAssetOperationSearchRow` and `getCheckinHolder` take the list type and read only `custodian.code` / `fullNameTh`, so the wider detail asset still passes. No other change.

**3b. The options** (`src/lib/asset-operation-options.ts`).
- After `EmployeeRow` (`:10`, unchanged), add `type LocationRow = { id: string; code: string; name: string; branchId?: string; branch?: { name: string } }`.
- The plain option's comment (`:12`) becomes "An employee on รับคืน and ย้ายหลายรายการ: the department id comes free with the row." After `:13`, add the two types of Produces, with these comments:
  - `AssetOperationEmployeeDepartmentOption`: "โอนย้าย's employee (group 3 plan 3 P3-R9): the name the summary shows (look L1) and the employee's own department's name, read through the relation, so an inactive department is still named (spec §6 call 5: it is written as it is)."
  - `AssetOperationLocationBranchOption`: "โอนย้าย's room (P3-R9, P3-R13): its branch id, compared with the asset's own by id (names repeat across companies), and the branch name."
- `AssetOperationMasterOptions` (`:26-32`) takes the second parameter of Produces; `locations: Location[]`.
- The comment above the overloads (`:34-38`) gains, at its end: "{ employeeDepartment: true, locationBranch: true } (โอนย้าย, group 3 plan 3 P3-R9) reads each employee's own department name and each room's branch, with no groupBy; each flag reads only its own list, and employeeDetail, a superset, wins over employeeDepartment."
- The overloads (`:39-41`) become four lines. The first and third are today's, unchanged byte for byte (`tests/e2e-transactions.test.ts:136` pins the third):
  ```ts
  export async function getAssetOperationMasterOptions(options: { employeeDetail: true; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions<AssetOperationEmployeeOption>>
  export async function getAssetOperationMasterOptions(options: { employeeDepartment: true; locationBranch: true; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions<AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption>>
  export async function getAssetOperationMasterOptions(options?: { employeeDetail?: false; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions>
  export async function getAssetOperationMasterOptions(options?: { employeeDetail?: boolean; employeeDepartment?: boolean; locationBranch?: boolean; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions<AssetOperationEmployeePlainOption | AssetOperationEmployeeOption | AssetOperationEmployeeDepartmentOption, AssetOperationNamedOption | AssetOperationLocationBranchOption>> {
  ```
- After `const employeeDetail = …` (`:42`), add `const employeeDepartment = options?.employeeDepartment === true` and `const locationBranch = options?.locationBranch === true`.
- **The reads** (the selects are Step 1's pins; the `where` and `orderBy` do not change):
  - employees: `employeeDetail` → today's detail select; else `employeeDepartment` → `{ id: true, code: true, fullNameTh: true, departmentId: true, department: { select: { code: true, name: true } } }`; else today's plain select. Still cast `as Promise<EmployeeRow[]>`.
  - locations: `locationBranch` → `{ id: true, code: true, name: true, branchId: true, branch: { select: { name: true } } }`; else today's `{ id: true, code: true, name: true }`. Cast `as Promise<LocationRow[]>`.
  - departments, statuses, conditions and the groupBy (still `employeeDetail` only) do not change.
- **The mappings** (keys in this order, so an unflagged answer is byte-for-byte today's JSON):
  - employee: build `plain` as today; return today's detail object when `employeeDetail && employee.department && employee.branch`; else `{ ...plain, name: employee.fullNameTh, departmentName: employee.department.name }` when `employeeDepartment && employee.department`; else `plain`.
  - location: `{ id, label: "<code> - <name>", name }` as today; when `locationBranch && location.branchId && location.branch`, return it spread with `branchId: location.branchId, branchName: location.branch.name` after `name`.
- No `"-"` fallback anywhere (LV2).

- [ ] **Step 4: Run the checks.**
  - Re-run the Step 2 command, plus `node --test tests/list-frame-guards.test.ts tests/asset-operation-picker-forms.test.ts tests/asset-operation-picker-rules.test.ts tests/checkin-choice.test.ts`. Expected: all pass (the `checkin-form-rules`, `checkin-late-return-rules` and `checkout-form-rules` counts are unchanged from before this task).
  - Then `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. `tsc` is the check that every `AssetOperationChosenDetail` and `AssetOperationSearchDetailAsset` builder carries the new fields, and that the ส่งมอบ, รับคืน, โอนย้าย and ย้ายหลายรายการ pages still resolve to their old overloads.
  - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/asset-operation-search-rules.ts src/lib/asset-operation-options.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-master-options.test.ts tests/e2e-transactions.test.ts tests/checkin-form-rules.test.ts tests/checkin-late-return-rules.test.ts tests/checkout-form-rules.test.ts
git commit -m "feat(transfer): the chosen asset's detail carries its holder's id, active flag and own department and the asset's branch id; โอนย้าย's master options name each employee's own department and each room's branch, behind two flags the other pages do not pass (group 3 spec §9.1-§9.3, plan 3 P3-R9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Shared parts for the table and the card: the current-value mark, the visually hidden label, the card's lead (spec §9.2, §9.3; P3-R11, with the parts of P3-R4, P3-R5, P3-R12 and P3-R17 that use them)

T6's "เปลี่ยนอะไร" table needs three things that `SearchableSelect` cannot do today, and T6's summary card needs one slot that `OperationSummaryCard` lacks. This task adds them as optional props and changes no caller: ส่งมอบ, รับคืน and every other `SearchableSelect` pass none of them, so their DOM stays the same. The marker word is passed by the caller, so this task adds no message.

**Rulings this task follows (copied from the skeleton, with the controller's rulings Y5, Y7, Y18 and Y20 applied):**
- **P3-R11:**
  - `SearchableSelect` gains `currentValue?: string`, `currentMark?: string` (the marker word, passed by the caller) and `labelVisuallyHidden?: boolean`. With `currentValue` and `currentMark` set, the option whose id equals `currentValue` renders **disabled** with a muted marker after its label (`data-searchable-current`); the filter still reads `label`. `labelVisuallyHidden` renders `FieldLabel visuallyHidden`, so the trigger's accessible name stays the label.
  - `OperationSummaryCard` gains `lead?: ReactNode`, rendered under the asset line and photo, above the rows (`data-summary-lead`).
  - Pins rewritten in this task: `tests/field-primitives.test.ts:106`, `tests/menu-primitives-ui.test.ts:181-186`, `tests/searchable-select-accessibility.test.ts`, `tests/operation-form-parts-ui.test.ts:12` (the signature regex; the skeleton's `:13` is the comment above the asset-line pin, Y20), and DESIGN.md / `docs/14_UI_UX_DESIGN_SYSTEM.md` where they describe these parts.
- **P3-R4 (picker part):** a destination equal to the current value is not a change. The current option is marked and **disabled**, so the UI cannot send it; the normalizer (T1) is the backstop for stale tabs and API callers.
- **P3-R5 (display part):** the locked แผนก row is `<SearchableSelect id="transfer-to-department" disabled value="" placeholder={<the text of T5's transferDepartmentLockText> ?? t("noChange")} …>`; × is hidden when disabled. The placeholder is "ตามผู้ถือครอง: <department name>" when the holder decides the department, "เลือกทรัพย์สินก่อน" when no asset is chosen, and "ไม่เปลี่ยนแปลง" while a newly picked asset has no detail yet or after its read failed (Y5; a same-asset re-read that still carries its detail stays ready, so nothing flickers; T5 computes the text, T6 renders it). This already works (`showClear = Boolean(value) && !required && !disabled`, `searchable-select.tsx:75`); this task keeps it.
- **P3-R12 (placement only):** the lead "เปลี่ยน {count} อย่าง: {list}" goes in the card's `lead`. Its text is T5's `buildTransferLead`; the card only draws what it is given.
- **P3-R17 (use only):** the three pickers keep their labels ที่ตั้งปลายทาง / ผู้ถือครองปลายทาง / แผนกปลายทาง as visually hidden labels (`labelVisuallyHidden`), so the accessible names (and E2E `/^ผู้ถือครองปลายทาง/`) stay, and each passes `currentValue` and `currentMark={tOperation("summaryNow")}` ("ตอนนี้", the card's existing column head; no new key, Y7). T6 passes them; this task only provides them.
- No caller changes in this task (skeleton T4).

**Decisions:**
- **The marker sits between the label and the check, with no `ml-auto`.** The check keeps `ml-auto` and stays at the end. Two `ml-auto` children would split the free space and leave the marker mid-row. When `value === currentValue` (P3-R21: switching the asset keeps an earlier pick, which can equal the new asset's current value), the option shows both the marker and the check and stays disabled. The trigger still shows the pick, and × still clears it. The payload drops such a pick (P3-R21, T5's normalized change set); T4 only draws it.
- **The marker's colour.** A disabled item is `text-faint-foreground` (`command.tsx:117`, `data-[disabled=true]:text-faint-foreground`). The marker is `text-meta text-muted-foreground`, one step darker, so the word that explains why the row is disabled is the readable part.
- **`data-searchable-current` is on the option (`CommandItem`), not on the marker span.** One node then carries `role="option"`, `aria-disabled="true"` and both texts. Its `textContent` is the label followed by the mark with no space between them. A test or a spec checks each text with its own `toContainText`.
- **The current option stays in the list and is not moved.** Search, order and cmdk's keyboard behaviour are unchanged. cmdk skips a disabled item with the arrows, gives it no `onClick`, and never calls its `onSelect` (`node_modules/cmdk/dist/index.mjs`, the Item's `onClick: A ? void 0 : C`).
- **The hidden label is never dropped.** `{label ? (<FieldLabel …>) : null}` stays; `visuallyHidden` adds `sr-only` (`field.tsx:80-90`, "visuallyHidden, not hidden"). The `aria-labelledby={label ? `${labelId} ${valueId}` : undefined}` line is unchanged, so the trigger is named "<label> <value>" (for example "ผู้ถือครองปลายทาง ไม่เปลี่ยนแปลง"). An `sr-only` label is absolutely positioned, so it takes no row of the wrapper's grid and leaves no `gap-1.5` above the trigger.
- **The lead is a `<p>` drawn only when given, as the footnote is** (`{footnote ? <p …>{footnote}</p> : null}`). Its own class is `text-sm font-medium text-foreground`, medium weight, so it reads as the card's first line above the rows; the footnote's `text-meta text-muted-foreground` is not copied (Y18). T5's `buildTransferLead` returns `string | null`, and null draws nothing.
- **Docs.** DESIGN.md (`:463` Command lists, `:551` the summary card sub-bullet) and docs/14 (`:66`, the `SearchableSelect` row) describe these parts, so each gains the new behaviour in one sentence or clause (Y20: these three lines, though neither file lists the props by name). DESIGN.md `:551` also gains "the asset line (`photo` and `assetLabel`)": plan 1's addendum added those props without a DESIGN.md mention, and the lead's place is defined relative to them. docs/14 `:104` (the frame row) is unchanged.

**Files:**
- Modify: `src/components/ui/searchable-select.tsx` (the props type, the destructure, one const after `showClear`, the `FieldLabel` line, the option map).
- Modify: `src/components/asset-operations/operation-summary-card.tsx` (the props type, the header comment, the signature, one line after the asset line).
- Modify: `DESIGN.md` (`:463`, `:551`), `docs/14_UI_UX_DESIGN_SYSTEM.md` (`:66`).
- Test (pins this task breaks, rewritten in this commit):
  - `tests/field-primitives.test.ts:106`: the exact `FieldLabel` line;
  - `tests/menu-primitives-ui.test.ts:184` (in the test at `:181-186`): the label span directly followed by the Check expression;
  - `tests/searchable-select-accessibility.test.ts:13`: `disabled={option.disabled}`;
  - `tests/operation-form-parts-ui.test.ts:12`: the exact `OperationSummaryCard` signature.
- Test (new tests, in existing files):
  - `tests/searchable-select-accessibility.test.ts`: two new tests (the current-value mark; the visually hidden label);
  - `tests/operation-form-parts-ui.test.ts`: one new test (the lead).
- Checked and not broken (keep them green; no edit):
  - `tests/field-primitives.test.ts:104-123`, all but `:106`: the trigger class string, `showClear ? "pr-24 md:pr-20" : "pr-9"`, the `aria-labelledby` and `aria-describedby` lines, `data-invalid`, `triggerInvalidClasses`, the ChevronDown, `<FieldHint id={hintId}>`, `<FieldError id={errorId}>`. Also `:91` (`visuallyHidden && "sr-only"` in `field.tsx`) and `:203-204` (the wrapper `<div className="grid min-w-0 max-w-full content-start gap-1.5">`).
  - `tests/searchable-select-accessibility.test.ts`, all but `:13`: `<Popover modal={false} open={open && !disabled} onOpenChange={setOpenState}>`, `<Command shouldFilter={false} loop`, `filterSearchableOptions(options, query)`, the list slice starting `<CommandList className="max-h-64" hidden={filteredOptions.length === 0}>`, `<CommandEmpty>{emptyLabel}</CommandEmpty>\n\s*<CommandList`, `selectValue`, the scroll-lock lines.
  - `tests/menu-primitives-ui.test.ts:183,185` (the `font-medium` className and no `text-transparent`); `:160-170` read `command.tsx`, which this task does not touch.
  - `tests/v-track-f.test.ts:209,220-226` (`<FieldError id={errorId}>`, the field-variants import, `data-invalid`, `triggerInvalidClasses`, the `triggerId` line).
  - `tests/visual-foundation-guards.test.ts:369` (N3): the file still owns its two raw `<button>`s and adds none.
  - `tests/operation-form-parts-ui.test.ts:14-27` (the asset line, the parts list, the heads outside the `<dl>`, RAW) and `:72-86` (the DESIGN.md block phrases and the docs/14 frame row).
  - `tests/asset-photo-preview.test.ts:115-119` (`photo?: ReactNode`, `data-summary-asset`, RAW on the card).
  - `tests/asset-operation-picker-ui.test.ts:186` (the docs/14 row still starts `| A searchable picker | \`SearchableSelect\` |`).
  - `tests/v-track-final.test.ts:131`, `tests/dark-mode-docs.test.ts:19,37,61`, `tests/phase2d-docs.test.ts:26,46` (DESIGN.md and docs/14 bans; the new sentences use none of their words).
  - `tests/validation-guards.test.ts` (V4) and `tests/form-migration-guards.test.ts:278,326`: no caller changes.

**Interfaces:**
- Consumes (existing, unchanged):
  - `FieldLabel` with `visuallyHidden?: boolean` (`src/components/ui/field.tsx:80-90`), which adds `sr-only`;
  - `CommandItem` (`src/components/ui/command.tsx:109-121`), which passes extra props to cmdk's Item: `disabled` gives `aria-disabled="true"`, `data-disabled="true"`, the faint ink, no pointer selection and no `onSelect`;
  - `filterSearchableOptions(options, query)` and `SearchableSelectOption = { id: string; label: string; disabled?: boolean }` (`src/lib/searchable-select-filter.ts`), unchanged.
- Produces (names binding for T5, T6 and T7):
  ```ts
  // src/components/ui/searchable-select.tsx: three new optional props; every other prop is unchanged.
  currentValue?: string          // the id the record holds now
  currentMark?: string           // the word after that option's label; T6 passes tOperation("summaryNow") "ตอนนี้" (Y7: no new key)
  labelVisuallyHidden?: boolean  // FieldLabel visuallyHidden: off screen, still the trigger's name

  // src/components/asset-operations/operation-summary-card.tsx
  export type OperationSummaryCardProps = { /* as today */ …; lead?: ReactNode }
  // OperationSummaryRow and OperationSummaryCheck are unchanged; T5's row and check types stay structurally
  // compatible with them, as CheckoutSummaryRow and CheckinSummaryRow are (checkout-form-rules.ts:39, checkin-form-rules.ts:39).
  ```
  - DOM hooks:
    - the current option: `[cmdk-item][data-searchable-current]` with `role="option"`, `aria-disabled="true"`, `data-disabled="true"`, and two child spans: the label, then the mark. It renders only when both `currentValue` and `currentMark` are non-empty and an option with that id is in the filtered list. A former holder is not in the active list, so nothing is marked for them.
    - the hidden label: `<label data-slot="field-label" class="… sr-only" id="<triggerId>-label" for="<triggerId>">`, still in the DOM;
    - the lead: `[data-slot="operation-summary-card"] [data-summary-lead]`, a `<p>`, between `[data-summary-asset]` and the rows.
  - What T7 relies on: a disabled option cannot be clicked, so `pickSearchable` / `choose` on a value equal to the current one waits on a disabled option and times out. A spec never picks the asset's own room, holder or department (gaps R2).
  - Messages: none in this task.

- [ ] **Step 1: Write the failing tests, and rewrite the four pins.**

  1. `tests/field-primitives.test.ts:106`, in the test "SearchableSelect uses the field look, a real label, and announces the chosen value". Replace the line with:
     ```ts
     assert.match(source, /<FieldLabel id=\{labelId\} htmlFor=\{triggerId\} required=\{required\} visuallyHidden=\{labelVisuallyHidden\}>/)
     ```
  2. `tests/menu-primitives-ui.test.ts:181-186`. Replace the whole test with:
     ```ts
     test("searchable select marks the chosen option with weight and a trailing check, and the current value with its word between the label and the check (group 3 plan 3, P3-R11)", () => {
       const source = read("src/components/ui/searchable-select.tsx")
       assert.match(source, /className=\{option\.id === value \? "font-medium" : undefined\}/)
       assert.match(source, /<span className="min-w-0 truncate">\{option\.label\}<\/span>\s*\{current \? <span className="shrink-0 text-meta text-muted-foreground">\{currentMark\}<\/span> : null\}\s*\{option\.id === value \? <Check className="ml-auto size-4 text-primary" aria-hidden="true" \/> : null\}/)
       assert.doesNotMatch(source, /text-transparent/)
     })
     ```
  3. `tests/searchable-select-accessibility.test.ts:13`, in the first test. Replace the line with:
     ```ts
     assert.match(source, /<CommandItem[\s\S]*?disabled=\{option\.disabled \|\| current\}/)
     ```
  4. `tests/searchable-select-accessibility.test.ts`, append two tests at the end of the file. The file already imports `readFileSync`.
     ```ts
     test("the current value is marked after its label and cannot be picked; the search still reads the label alone (group 3 plan 3, P3-R11, P3-R4)", () => {
       const source = read()
       for (const part of [
         "currentValue?: string",
         "currentMark?: string",
         "const markCurrent = Boolean(currentValue && currentMark)",
         "const current = markCurrent && option.id === currentValue",
         "disabled={option.disabled || current}",
         "data-searchable-current={current || undefined}",
         '{current ? <span className="shrink-0 text-meta text-muted-foreground">{currentMark}</span> : null}',
         "const filteredOptions = useMemo(() => filterSearchableOptions(options, query), [options, query])",
       ]) assert.ok(source.includes(part), part)
       // The word is drawn beside the label, never joined to it: the filter reads the caller's options as given, so typing
       // ตอนนี้ finds nothing and a code or a name still finds the current option.
       assert.doesNotMatch(source, /label: [^\n]*currentMark|\$\{currentMark\}|currentMark \+|\+ currentMark/)
       // cmdk gives a disabled item aria-disabled and calls no onSelect for it, so the current value is never sent as a change.
       assert.match(source, /<CommandItem[\s\S]*?disabled=\{option\.disabled \|\| current\}[\s\S]*?onSelect=\{\(\) => selectValue\(option\.id\)\}/)
       // Docs: DESIGN.md's command lists and docs/14's SearchableSelect row name the props.
       assert.ok(readFileSync("DESIGN.md", "utf8").includes("passes `currentValue` and `currentMark`"), "DESIGN.md")
       const row = readFileSync("docs/14_UI_UX_DESIGN_SYSTEM.md", "utf8").split(/\r?\n/).find((line) => line.startsWith("| A searchable picker | `SearchableSelect` |"))
       assert.ok(row?.includes("`currentValue` with `currentMark`"), "docs/14")
     })

     test("a visually hidden label stays the trigger's name: FieldLabel visuallyHidden, never dropped (group 3 plan 3, P3-R11, P3-R17)", () => {
       const source = read()
       assert.ok(source.includes("labelVisuallyHidden?: boolean"), "the prop")
       assert.match(source, /\{label \? \(\n\s+<FieldLabel id=\{labelId\} htmlFor=\{triggerId\} required=\{required\} visuallyHidden=\{labelVisuallyHidden\}>\n\s+\{label\}\n\s+<\/FieldLabel>\n\s+\) : null\}/)
       // The trigger is still named "<label> <value>", so E2E finds ผู้ถือครองปลายทาง by /^ผู้ถือครองปลายทาง/.
       assert.match(source, /aria-labelledby=\{label \? `\$\{labelId\} \$\{valueId\}` : undefined\}/)
       // sr-only keeps the label in the accessibility tree and off screen; the prop never removes it.
       assert.match(readFileSync("src/components/ui/field.tsx", "utf8"), /visuallyHidden && "sr-only"/)
       assert.doesNotMatch(source, /!labelVisuallyHidden|labelVisuallyHidden \?|labelVisuallyHidden &&/)
       assert.ok(readFileSync("DESIGN.md", "utf8").includes("`labelVisuallyHidden` keeps the label for screen readers only"), "DESIGN.md")
       const row = readFileSync("docs/14_UI_UX_DESIGN_SYSTEM.md", "utf8").split(/\r?\n/).find((line) => line.startsWith("| A searchable picker | `SearchableSelect` |"))
       assert.ok(row?.includes("`labelVisuallyHidden`"), "docs/14")
     })
     ```
  5. `tests/operation-form-parts-ui.test.ts:12`, in the first test. Replace the line with:
     ```ts
     assert.match(source, /^export function OperationSummaryCard\(\{ title, nowLabel, nextLabel, rows, checklist = \[\], warnings = \[\], footnote, photo, assetLabel, lead \}: OperationSummaryCardProps\) \{$/m)
     ```
  6. `tests/operation-form-parts-ui.test.ts`: add this test right after the first test (before the `OperationFormFrame` test):
     ```ts
     test("OperationSummaryCard: an optional lead line under the asset line, above the rows (group 3 spec §9.3, plan 3 P3-R11)", () => {
       const source = read(`${DIR}operation-summary-card.tsx`)
       assert.ok(source.includes("  lead?: ReactNode\n"), "the prop")
       assert.ok(source.includes('{lead ? <p data-summary-lead className="min-w-0 break-words text-sm font-medium text-foreground">{lead}</p> : null}'), "the lead, only when given")
       const at = (text: string) => {
         const index = source.indexOf(text)
         assert.ok(index >= 0, text)
         return index
       }
       assert.ok(at("<div data-summary-asset") < at("<p data-summary-lead") && at("<p data-summary-lead") < at("{rows.length > 0 ? ("), "the asset line, the lead, then the rows")
       const design = read("DESIGN.md")
       const block = design.slice(design.indexOf("- **`OperationFormFrame`**"), design.indexOf("\n### Forms: Errors Under the Field\n"))
       assert.ok(block.includes("an optional `lead`"), "DESIGN.md names the lead")
     })
     ```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/field-primitives.test.ts tests/menu-primitives-ui.test.ts tests/searchable-select-accessibility.test.ts tests/operation-form-parts-ui.test.ts`. Expected failures, and only these:
  - field-primitives: "SearchableSelect uses the field look, a real label, and announces the chosen value" (the `FieldLabel` line);
  - menu-primitives-ui: "searchable select marks the chosen option with weight and a trailing check, and the current value …";
  - searchable-select-accessibility: "searchable select is a non-modal Radix popover with a cmdk listbox" (`:13`), "the current value is marked after its label …" and "a visually hidden label stays the trigger's name …";
  - operation-form-parts-ui: "OperationSummaryCard: ตอนนี้ then หลังบันทึก per row, …" (the signature) and "OperationSummaryCard: an optional lead line …".

- [ ] **Step 3: Implement.**
  1. **`src/components/ui/searchable-select.tsx`:**
     - **The props type.** After `fieldSize?: FieldSize`, add:
       ```ts
       /** The id the record holds now (group 3 plan 3, P3-R11): with currentMark, that option shows the word after its label and is disabled, so it cannot be picked as a change. */
       currentValue?: string
       currentMark?: string
       /** The label stays the trigger's name but only screen readers get it, where a row name on screen already says it (โอนย้าย's table). */
       labelVisuallyHidden?: boolean
       ```
     - **The destructure.** Add `currentValue,`, `currentMark,` and `labelVisuallyHidden,` after `fieldSize,`, one per line.
     - **After `const showClear = …`:** `const markCurrent = Boolean(currentValue && currentMark)`.
     - **The label:** `<FieldLabel id={labelId} htmlFor={triggerId} required={required} visuallyHidden={labelVisuallyHidden}>`. The `{label ? ( … ) : null}` around it and `{label}` inside it stay.
     - **The option map.** The arrow gets a block body. Attributes stay one per line, in this order:
       ```tsx
       {filteredOptions.map((option) => {
         const current = markCurrent && option.id === currentValue
         return (
           <CommandItem
             key={option.id}
             value={option.id}
             disabled={option.disabled || current}
             data-searchable-current={current || undefined}
             onSelect={() => selectValue(option.id)}
             className={option.id === value ? "font-medium" : undefined}
           >
             <span className="min-w-0 truncate">{option.label}</span>
             {current ? <span className="shrink-0 text-meta text-muted-foreground">{currentMark}</span> : null}
             {option.id === value ? <Check className="ml-auto size-4 text-primary" aria-hidden="true" /> : null}
           </CommandItem>
         )
       })}
       ```
     - Nothing else changes: the trigger, `showClear`, the clear button, the hint and the error.
  2. **`src/components/asset-operations/operation-summary-card.tsx`:**
     - **The props type.** After `assetLabel?: ReactNode`, add:
       ```ts
       /** One line under the asset line, above the rows: what the save changes, such as โอนย้าย's "เปลี่ยน N อย่าง: …" (group 3 spec §9.3, plan 3 P3-R12). */
       lead?: ReactNode
       ```
     - **The header comment** (the two lines above the function). After "the new value semibold only when it changes;", insert "an optional lead line under the asset line, above the rows;". The rest of the comment stays.
     - **The signature:** `export function OperationSummaryCard({ title, nowLabel, nextLabel, rows, checklist = [], warnings = [], footnote, photo, assetLabel, lead }: OperationSummaryCardProps) {`.
     - **The lead.** Insert this line after the asset line's closing `) : null}` and before `{rows.length > 0 ? (`, at the same 6-space indent:
       `{lead ? <p data-summary-lead className="min-w-0 break-words text-sm font-medium text-foreground">{lead}</p> : null}`
  3. **`DESIGN.md`** (the text in each block below is literal, backticks included):
     - **`:463`**, the bullet that starts `- **Command lists** (`. Find this text in it:
       ```text
       and only the chosen option shows a check, at the end. Its trigger is a button
       ```
       Replace it with:
       ```text
       and only the chosen option shows a check, at the end. A page that shows the current value beside the picker passes `currentValue` and `currentMark` (the word, such as ตอนนี้): that option shows the word after its label in `muted-foreground` and is disabled, so it cannot be picked as a change, and the search still reads the label alone (โอนย้าย, group 3 plan 3). `labelVisuallyHidden` keeps the label for screen readers only, where a row name on screen already says it (โอนย้าย's table); the trigger's name is still the label and the value. Its trigger is a button
       ```
     - **`:551`**, the sub-bullet that starts `  - The summary card "สรุปก่อนบันทึก":`. Find:
       ```text
       - The summary card "สรุปก่อนบันทึก": one row per field the save writes,
       ```
       Replace it with:
       ```text
       - The summary card "สรุปก่อนบันทึก": under the title, the asset line (`photo` and `assetLabel`) and an optional `lead`, one medium-weight line of what the save changes (โอนย้าย's "เปลี่ยน N อย่าง: …"); then one row per field the save writes,
       ```
       The rest of the line stays.
  4. **`docs/14_UI_UX_DESIGN_SYSTEM.md:66`**, the row that starts `| A searchable picker | `. Find:
     ```text
     (its button trigger takes no `aria-invalid`) |
     ```
     Replace it with:
     ```text
     (its button trigger takes no `aria-invalid`); `labelVisuallyHidden` where a row name on screen says the label (the trigger keeps it as its name); `currentValue` with `currentMark` marks the current value and disables it |
     ```
  5. **No caller changes.** Do not touch `checkout-form.tsx`, `checkin-form.tsx`, `transfer-form.tsx` or any other `SearchableSelect` / `OperationSummaryCard` caller. No messages change.

- [ ] **Step 4: Run the focused tests, then the full checks.**
  - Run `node --test tests/field-primitives.test.ts tests/menu-primitives-ui.test.ts tests/searchable-select-accessibility.test.ts tests/operation-form-parts-ui.test.ts tests/v-track-f.test.ts tests/asset-photo-preview.test.ts tests/visual-foundation-guards.test.ts tests/asset-operation-picker-ui.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/v-track-final.test.ts tests/dark-mode-docs.test.ts tests/phase2d-docs.test.ts`. Expected: all pass.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. A pin outside this task's list that fails is rewritten in this commit and named in the report.

- [ ] **Step 5: Commit.**
```
git add src/components/ui/searchable-select.tsx src/components/asset-operations/operation-summary-card.tsx DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md tests/field-primitives.test.ts tests/menu-primitives-ui.test.ts tests/searchable-select-accessibility.test.ts tests/operation-form-parts-ui.test.ts
git commit -m "feat(ui): SearchableSelect marks the current value and disables it, and can keep its label for screen readers only; the summary card takes a lead line above its rows (group 3 spec §9.2-§9.3, plan 3 P3-R11)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Add any other pin file that Step 4 rewrote to the `git add` line.

---

### Task 5: โอนย้าย's form rules: one change set for the ตอนนี้ cells, the แผนก lock, the summary, the footer, the review and the reason chips (spec §9.2, §9.3, §9.4; P3-R3, P3-R4, P3-R10, P3-R12 to P3-R18, P3-R21)

Everything the โอนย้าย form shows before saving is decided in one pure, client-safe file, `src/lib/transfer-form-rules.ts`. `getTransferFormChange` normalizes the picks with T1's normalizer, finds the department with T1's rule, and drops a locked department. The cells, the lock text, the card rows and lead, the checklist, the footer, the warnings, the component lines and the review all read that one change set, and so does T6's payload. This task changes no existing file and no message: T6 renders these values and writes the words, and T6's change file is the only source of message values (Y6).

**Rulings this task follows (copied from the skeleton):**
- **P3-R3:** the department comes from T1's `getTransferDepartmentSource` / `getTransferNextDepartmentId`, on **normalized** ids.
  - `keepsOwnDepartment(ownership)` (ส่วนกลาง, ส่วนควบ, License) → `"free"`; else a new holder → `"newHolder"`; else a current holder → `"currentHolder"`; else `"free"`.
  - `"newHolder"` → `newHolderDepartmentId ?? currentDepartmentId`; `"currentHolder"` → `currentHolderDepartmentId ?? currentDepartmentId`; `"free"` → `chosenDepartmentId ?? currentDepartmentId`.
  - A holder who left still decides it. An inactive department on an active employee is written as it is (spec call 5), so its name comes from the employee's own relation (T3's `departmentName`), never from the active-only `departments` list.
- **P3-R4:** a destination equal to the current value is not a change.
  - An empty string is null. A holder equal to the current holder is dropped too, so the status stays.
  - The implicit department correction (`"currentHolder"`) alone is **not** a change: a TR- needs at least one chosen destination that differs.
- **P3-R5 (the rule's part):** the แผนก row is locked when the source is `"newHolder"` or `"currentHolder"`, and also while there is no detail to judge it (no asset, a row without its detail, a failed read; Y5). The payload never sends a department while locked. T6 renders the lock (`disabled`, and the placeholder `transferDepartmentLockText(...) ?? t("noChange")`: the `followsHolder` text when a holder locks it, "เลือกทรัพย์สินก่อน" when no asset is chosen, "ไม่เปลี่ยนแปลง" while a chosen asset's detail is loading or failed) and clears a picked department when a holder locks the row.
- **P3-R10:** a former holder (`holderActive === false`) reads "<code - name> (พ้นสภาพ)" in the ตอนนี้ cell, with รับคืน's word (`checkin.returnByFormer`, S-R46). The department still follows that holder.
- **P3-R12 (words of the summary):**
  - **Lead** (card `lead`, and the phone footer line): "เปลี่ยน {count} อย่าง: {list}". `list` joins the changed row names among ที่ตั้ง, ผู้ถือครอง and แผนก; the implicit department correction counts, status and components do not. When holder and department both stay, append " · ผู้ถือครองและแผนกคงเดิม". Null when there is no asset, no detail, or no change.
  - **Rows** (`data-summary-row`): `location`, `holder`, `department`, `status`, `components`. Names, not codes (look L1). Unchanged rows read `summaryKept` "{value} (คงเดิม)".
    - Status: next "ใช้งานอยู่" when a normalized new holder is chosen and the status is not already In Use, else "คงสถานะเดิม".
    - Components: "ย้ายตาม {count} รายการ" plus " · ค้างคืน {count} รายการ" when any is outstanding (P2-R19 parity; Y6 sets both words: the skeleton's "ย้ายตาม {count}" / "ค้างคืน {count}" are superseded); drawn when either count is above 0.
  - **Desktop footer line:** "โอนย้าย {tag}: {changes}", where `changes` = "ที่ตั้ง → <room name> · ผู้ถือครอง → <name> · แผนก → <name>" for the changed rows only (names). Otherwise `footerIncomplete` "เลือกทรัพย์สินและสิ่งที่จะเปลี่ยน".
  - **Checklist (still missing):** ทรัพย์สิน (eligible), เปลี่ยนอย่างน้อย 1 อย่าง, เหตุผล.
- **P3-R13:** the cross-branch line "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ {branch} ตามเดิม" shows when a normalized destination room's `branchId` differs from `detail.ownerBranchId`; `{branch}` = `detail.ownerBranchLabel`. Branches are compared by id, never by name. Room only: a holder from another branch does not show it.
- **P3-R14:** components.
  - Under the table: "ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย", from `checkoutComponents(row).travelling` (the sync's filter); hidden when 0.
  - Components with their own open handover (`staying`): "ส่วนควบที่มีใบส่งมอบของตัวเองไม่ย้ายตาม: {list}".
  - Outstanding components, through `checkoutOutstandingLines`: "ส่วนควบค้างคืน {count} รายการ ไม่ย้ายตาม: {list}".
- **P3-R15 (the rule's part):** without a detail (loading, failed), the rules promise nothing: no rows, no lead, no review, a locked แผนก row. T6 owns the reads, the failed notice and the late-answer drop.
- **P3-R16:** reason chips.
  - The chips are ย้ายสาขา / เปลี่ยนผู้ใช้งาน / ปรับโครงสร้างแผนก / อื่น ๆ.
  - A chip writes "<full chip word>: " at the start. It replaces a leading "<any chip word>:" (the colon required, any spaces after it; Y11 accepted this over the skeleton's "<word>: ") and keeps the rest.
  - The pressed chip is the one whose "<word>:" starts the text. อื่น ๆ never writes and is never pressed.
  - The written prefix is always the full word, even where the phone shows the short "ปรับโครงสร้าง".
  - Past 500 characters the text is refused by `validate()`, never truncated.
- **P3-R17 (the cells):** the ตอนนี้ cells read "code - name": the room with " · <branch name>", the holder (P3-R10) and the department; "ไม่มี" when empty. Until the detail is ready they read "…".
- **P3-R18:** the review lists real changes only. The room and the employee read "code - name" (E2E asserts `room.code` and the receiver's name). A department line shows when the department changes, implicitly too. A components line, label "ส่วนควบ" and value `summaryComponentsMove` "ย้ายตาม {count} รายการ", shows when any component travels (Y3 supersedes the skeleton's "ส่วนควบย้ายตาม {count}"). The next status, the reason and the evidence line follow. The next status comes only from this task's `buildTransferReviewDetails`, as its last item (Y2).
- **P3-R21:** switching the asset keeps the picked destinations, but everything is recomputed from the new detail. Until it is ready the rows read "…" and the department row is disabled. The payload drops a locked department and equal destinations.

**The controller's rulings this task follows (binding; they win over the skeleton text above):**
- **Y1:** this task's `TransferWords` (with the new `departmentChooseAssetFirst`, Y5) is the one T6 builds, field for field. There is no `pending` word: the "…" is `TRANSFER_NOW_PENDING`.
- **Y5 (not ready):** no row, a row without `detail`, or `"failed"` → not ready: the department is locked and dropped, the location and holder picks pass through raw (`""` → null), and `departmentSource` is null. A same-asset re-read in `"loading"` that still carries `row.detail` stays ready, so the card does not flicker on submit. With no asset, `transferDepartmentLockText` returns `departmentChooseAssetFirst` "เลือกทรัพย์สินก่อน"; with an asset whose detail is loading or failed it returns null, so the placeholder stays "ไม่เปลี่ยนแปลง".
- **Y6:** T6's change file is the only source of message values; the words table under Interfaces names T6's keys and values. This task's tests carry their own fixture words, equal to those values where a test asserts text.
- **Y9 (for T6, kept here as the rule's contract):** see "How T6 reads them".
- **Y16:** the Consumes lines for T1's normalizer and T3's two option types below are copied verbatim from those tasks' Produces.
- **Y11 / Y20 (accepted as drafted):** `TransferFormChoice.departments` is `AssetOperationNamedOption[]`; `transferComponentLines`, `TRANSFER_NOW_PENDING` and the exported `TransferSummaryRow`, `TransferCheck` and `TransferReviewDetail` are part of this task's Produces; the review carries the status as its last detail, so T6 passes neither `destinationLabels` nor `nextStatusLabel`; an In Use asset given a new holder reads คงสถานะเดิม; the card's location reads room names, and the current room falls back to `row.locationLabel` ("code - name") only when it is inactive; the former-holder mark shows in the card's holder "now" too, while "next" reads `kept(name)` without it; the rows preview the implicit department correction before any destination is picked, while the lead, the footer and the checklist wait for a real change; a chip prefix is detected as "<word>:" with any spaces after the colon.

**Review Focus this task tests:** 1 (rows: a held asset moved only to another room, stored department differs from its holder's), 3 (rules: a holder chosen, then cleared), 5 (detail-state rules).

**Files:**
- Create: `src/lib/transfer-form-rules.ts` (pure, client-safe) and `tests/transfer-form-rules.test.ts`.
- Modify: none. No message changes in this task. T6 adds the `transfer.*` words listed under Interfaces and passes them in.
- Pins this task breaks: none. These guards were checked:
  - `tests/api-error-catalog.test.ts:69-80` scans `src/lib` for `error:` / `message:` literals, and this file has none;
  - `tests/asset-movement-labels.test.ts` lists movement writers, and this file writes no movement;
  - no guard lists the rule files of `src/lib`.

**Interfaces:**
- Consumes:
  - **T1** (`src/lib/asset-department-rule.ts`):
    - `export type TransferDepartmentSource = "newHolder" | "currentHolder" | "free"`;
    - `getTransferDepartmentSource(input: { ownership: AssetOwnershipType; currentCustodianId: string | null; newCustodianId: string | null }): TransferDepartmentSource`;
    - `getTransferNextDepartmentId(input: { ownership: AssetOwnershipType; currentCustodianId: string | null; newCustodianId: string | null; currentDepartmentId: string | null; currentHolderDepartmentId: string | null; newHolderDepartmentId: string | null; chosenDepartmentId: string | null }): string | null`.
  - **T1** (`src/lib/transfer-rules.ts`):
    - `export type TransferDestinations = { toLocationId: string | null; toCustodianId: string | null; toDepartmentId: string | null }`;
    - `export type TransferCurrentValues = { currentLocationId: string; custodianId: string | null; departmentId: string | null }`;
    - `export function normalizeTransferDestinations(sent: Partial<TransferDestinations>, current: TransferCurrentValues): TransferDestinations` ("" is null; a field equal to its current value becomes null). This task passes its all-string `TransferFormDestinations` (`""` = ไม่เปลี่ยนแปลง) as `sent`;
    - `hasTransferChange(destinations: TransferDestinations): boolean`.
  - **T3** (`src/lib/asset-operation-search-rules.ts`): `AssetOperationChosenDetail` gains `holderId: string | null`, `holderActive: boolean | null` (null when no holder), `holderDepartmentId: string | null`, `holderDepartmentName: string | null` (the custodian's own department, active or not), `ownerBranchId: string`. The fields used here that are already there: `ownership`, `statusName`, `departmentId`, `departmentLabel`, `departmentName`, `holderLabel`, `holderName`, `ownerBranchLabel`, `locationBranchLabel`, `components`, `outstandingComponents`.
  - **T3** (`src/lib/asset-operation-options.ts`), as T3 writes them:
    - `export type AssetOperationEmployeeDepartmentOption = AssetOperationEmployeePlainOption & { name: string; departmentName: string }` (`AssetOperationEmployeePlainOption` is today's `AssetOperationOption & { departmentId: string }`, `:13`): `label` "code - fullNameTh", `departmentId`, `name` (fullNameTh alone), `departmentName` (the employee's own department, active or not);
    - `export type AssetOperationLocationBranchOption = AssetOperationNamedOption & { branchId: string; branchName: string }`: `label` "code - name", `name` (the room alone), `branchId` (compared with `detail.ownerBranchId`). `branchName` is not read here; the ตอนนี้ cell uses `detail.locationBranchLabel`.
  - **Plan 1/2** (`src/lib/checkout-form-rules.ts`):
    - `type CheckoutDetailState = "loading" | "failed" | "ready"` (`:14`);
    - `type CheckoutOutstandingWords = { with: (holder: string) => string; since: (documentNo: string) => string }` (`:38`);
    - `checkoutComponents(row)` → `{ travelling, staying }` (`:55-58`);
    - `checkoutOutstandingComponents(row)` (`:61-63`);
    - `checkoutOutstandingLines(row, words)` (`:66-73`).
  - **Existing** (`src/lib/asset-lifecycle-policy.ts`): `getTransferTargetStatusName(toCustodianId?: string | null): "In Use" | null` (`:303`) and `normalizeAssetStateName(value)` (`:322`).
  - **Existing** (`src/lib/validation-rules.ts`): `required(value)` (`:23`) and `maxLength(value, max)` (`:36`), the same rules T6's `validate()` uses for the reason.
  - **Card and review shapes** this task's types fit, structurally, without importing them:
    - `OperationSummaryRow = { key: string; label: string; now: ReactNode; next: ReactNode; changed: boolean }` and `OperationSummaryCheck = { key: string; label: string; done: boolean; note?: string }` (`src/components/asset-operations/operation-summary-card.tsx:8-9`);
    - `OperationReviewItem = { key?: string; label: string; value: string }` (`src/lib/asset-operation-review.ts:1-6`).
- Produces (names binding for T6 and T7):
  ```ts
  // src/lib/transfer-form-rules.ts. Values only from ./asset-department-rule.ts, ./transfer-rules.ts, ./checkout-form-rules.ts,
  // ./asset-lifecycle-policy.ts and ./validation-rules.ts; types with `import type` or inline `type`; relative .ts paths only.
  export type TransferFormDestinations = { toLocationId: string; toCustodianId: string; toDepartmentId: string } // "" = ไม่เปลี่ยนแปลง
  export type TransferFormChoice = {
    row: AssetOperationSearchRow | null
    detail: CheckoutDetailState
    destinations: TransferFormDestinations
    employees: AssetOperationEmployeeDepartmentOption[]
    departments: AssetOperationNamedOption[]          // the page's options.departments (named: the card reads a free pick by name)
    locations: AssetOperationLocationBranchOption[]
  }
  export type TransferFormChange = {
    ready: boolean                                   // the row carries its detail and the read has not failed
    destinations: TransferDestinations               // normalized, a locked department dropped: what the payload sends
    departmentSource: TransferDepartmentSource | null // null when not ready
    departmentLocked: boolean                        // true also when not ready (no asset, detail not read yet, read failed)
    nextDepartmentId: string | null                  // null when not ready
    changed: { location: boolean; holder: boolean; department: boolean }   // department counts the implicit correction
    changedCount: number
    crossBranch: boolean
  }
  export type TransferSummaryRow = { key: "location" | "holder" | "department" | "status" | "components"; label: string; now: string; next: string; changed: boolean }
  export type TransferCheck = { key: "asset" | "change" | "reason"; label: string; done: boolean }
  export type TransferReviewDetail = { key: "location" | "holder" | "department" | "components" | "status"; label: string; value: string }
  export type TransferWords = {
    location: string; holder: string; department: string; status: string; components: string
    none: string
    kept: (value: string) => string
    formerHolder: (name: string) => string
    followsHolder: (department: string) => string
    departmentChooseAssetFirst: string               // the locked แผนก row's text while no asset is chosen (Y5)
    inUse: string; statusUnchanged: string
    count: (count: number) => string
    summaryComponentsMove: (count: number) => string
    summaryComponentsOutstanding: (count: number) => string
    summaryLead: (count: number, list: string) => string
    summaryHolderDepartmentKept: string
    summaryCrossBranch: (branch: string) => string
    footerDescription: (tag: string, changes: string) => string
    footerIncomplete: string
    checkAsset: string; checkChange: string; checkReason: string
    toLocation: string; toCustodian: string; toDepartment: string; nextStatus: string
    componentsMove: (count: number, list: string) => string
    componentsStaying: (list: string) => string
    componentsOutstanding: (count: number, list: string) => string
    outstandingLine: CheckoutOutstandingWords
  }
  export const TRANSFER_NOW_PENDING = "…"
  export const TRANSFER_REASON_CHIPS = ["branch", "user", "restructure", "other"] as const
  export type TransferReasonChip = (typeof TRANSFER_REASON_CHIPS)[number]
  export type TransferChipWords = Record<Exclude<TransferReasonChip, "other">, string>
  export function getTransferFormChange(choice: TransferFormChoice): TransferFormChange
  export function transferNowCells(choice: TransferFormChoice, words: TransferWords): { location: string; holder: string; department: string }
  export function transferDepartmentLockText(choice: TransferFormChoice, words: TransferWords): string | null   // followsHolder when ready and locked; departmentChooseAssetFirst with no asset; else null
  export function buildTransferSummaryRows(choice: TransferFormChoice, words: TransferWords): TransferSummaryRow[]
  export function buildTransferLead(choice: TransferFormChoice, words: TransferWords): string | null
  export function buildTransferChecklist(choice: TransferFormChoice, reason: string, words: TransferWords): TransferCheck[]
  export function buildTransferFooterLine(choice: TransferFormChoice, words: TransferWords): string
  export function transferWarningLines(choice: TransferFormChoice, words: TransferWords): string[]   // cross-branch only; the detail-failed notice stays a node in the form
  export function buildTransferReviewDetails(choice: TransferFormChoice, words: TransferWords): TransferReviewDetail[]
  export function transferComponentLines(choice: TransferFormChoice, words: TransferWords): { travelling: string | null; staying: string | null; outstanding: string | null }
  export function applyTransferReasonChip(text: string, chip: Exclude<TransferReasonChip, "other">, words: TransferChipWords): string
  export function pressedTransferReasonChip(text: string, words: TransferChipWords): TransferReasonChip | null
  ```
- **The words T6 passes** (`TransferWords` field ← message key, th value). T6's change file is the only source of message values (Y6); this table names T6's keys and values and adds none of its own. "new" keys are T6's to add through `node scripts/messages-edit.mjs`, th and en; "existing" keys are read as they are at HEAD (`tAll` for another namespace):

  | Field | Message key | th |
  |---|---|---|
  | `location`, `holder`, `department`, `status`, `components` | `assetOperation.summaryLocation` / `summaryHolder` / `summaryDepartment` / `summaryStatus` / `summaryComponents` (existing) | ที่ตั้ง / ผู้ถือครอง / แผนก / สถานะ / ส่วนควบ |
  | `none` | `assetOperation.summaryNone` (existing) | ไม่มี |
  | `kept` | `assetOperation.summaryKept` (existing) | {value} (คงเดิม) |
  | `formerHolder` | `checkin.returnByFormer` (existing, through `tAll`) | {name} (พ้นสภาพ) |
  | `followsHolder` | `transfer.followsHolder` (new) | ตามผู้ถือครอง: {department} |
  | `departmentChooseAssetFirst` | `transfer.departmentChooseAssetFirst` (new; en "Choose the asset first"; Y5) | เลือกทรัพย์สินก่อน |
  | `inUse`, `statusUnchanged` | `transfer.inUseStatus`, `transfer.statusUnchanged` (existing) | ใช้งานอยู่, คงสถานะเดิม |
  | `count` | `assetOperation.summaryCount` (existing) | {count} รายการ |
  | `summaryComponentsMove` | `transfer.summaryComponentsMove` (new) | ย้ายตาม {count} รายการ |
  | `summaryComponentsOutstanding` | `checkout.summaryComponentsOutstanding` (existing, through `tAll`; no `transfer.*` key, Y6) | ค้างคืน {count} รายการ |
  | `summaryLead` | `transfer.summaryLead` (new) | เปลี่ยน {count} อย่าง: {list} |
  | `summaryHolderDepartmentKept` | `transfer.summaryHolderDepartmentKept` (new) | ผู้ถือครองและแผนกคงเดิม (alone; `buildTransferLead` joins it with " · ") |
  | `summaryCrossBranch` | `transfer.summaryCrossBranch` (new) | ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ {branch} ตามเดิม |
  | `footerDescription` | `transfer.footerDescription` (new) | โอนย้าย {tag}: {changes} |
  | `footerIncomplete` | `transfer.footerIncomplete` (new) | เลือกทรัพย์สินและสิ่งที่จะเปลี่ยน |
  | `checkAsset` | `transfer.asset` (existing) | ทรัพย์สิน |
  | `checkReason` | `transfer.sectionReason` (new: section 3's title, Y6) | เหตุผล |
  | `checkChange` | `transfer.checkChange` (new) | เปลี่ยนอย่างน้อย 1 อย่าง |
  | `toLocation`, `toCustodian`, `toDepartment`, `nextStatus` | `transfer.toLocation` / `toCustodian` / `toDepartment` / `reviewNextStatus` (existing) | ที่ตั้งปลายทาง / ผู้ถือครองปลายทาง / แผนกปลายทาง / สถานะถัดไป |
  | `componentsMove` | `transfer.componentsMove` (new) | ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย |
  | `componentsStaying` | `transfer.componentsStaying` (new) | ส่วนควบที่มีใบส่งมอบของตัวเองไม่ย้ายตาม: {list} |
  | `componentsOutstanding` | `transfer.componentsOutstanding` (new) | ส่วนควบค้างคืน {count} รายการ ไม่ย้ายตาม: {list} |
  | `outstandingLine` | `checkout.outstandingWith` / `checkout.outstandingSince` (existing, through `tAll`) | อยู่กับ {holder} / ตั้งแต่ {documentNo} |
  | `TransferChipWords` `branch` / `user` / `restructure` | `transfer.reasonChipBranch` / `reasonChipUser` / `reasonChipRestructure` (new) | ย้ายสาขา / เปลี่ยนผู้ใช้งาน / ปรับโครงสร้างแผนก |

  `transfer.componentsMove` is the line under the table; `transfer.summaryComponentsMove` is the card's components "next" and the review's components value. The "…" of a cell that is not ready is `TRANSFER_NOW_PENDING`, not a message (there is no `transfer.nowPending`, Y1).

- **How T6 reads them** (one change set; raw picks decide nothing; T6's word object is `const transferWords: TransferWords = {…}`, exactly this task's type, Y1):
  - The choice is built from the form's state: `{ row: values.asset, detail: assetDetail, destinations: { toLocationId: values.toLocationId, toCustodianId: values.toCustodianId, toDepartmentId: values.toDepartmentId }, employees, departments, locations }`, and `const change = getTransferFormChange(transferChoice)`.
  - The payload sends `change.destinations` with the reason and remark. `validate()`'s at-least-one reads `hasTransferChange(change.destinations)`. The picker's `context.assignCustodian` reads `Boolean(change.destinations.toCustodianId)`. The S-R40 re-ask line pinned at `tests/asset-operation-picker-forms.test.ts:56` stays as T6 keeps it; the picker's disabled current holder (P3-R11) keeps a raw pick from equalling the current holder.
  - The แผนก picker: `const lockText = transferDepartmentLockText(transferChoice, transferWords)`, then `disabled={change.departmentLocked}` and `placeholder={lockText ?? t("noChange")}` (Y5: "ตามผู้ถือครอง: <แผนก>" when a holder locks it, "เลือกทรัพย์สินก่อน" with no asset, "ไม่เปลี่ยนแปลง" while a chosen asset's detail is loading or failed, and when the row is free).
  - The holder pick clears `toDepartmentId` only when the change computed with the new holder has `departmentSource === "newHolder"`; ส่วนกลาง and ส่วนควบ stay free (spec §9.2; Y9). The rule keeps no memory of a department it dropped (tested), so this clear is T6's.
  - After the submit's detail re-read answers, T6 validates again: it re-checks `hasTransferChange(getTransferFormChange(<the answered choice>).destinations)` before opening the review, so a pick that stopped being a change (a holder that turned out to be the current one) lands under `#transfer-to-location` instead of opening an empty review (Y9).
  - The card takes `rows` (`buildTransferSummaryRows`), `lead` (`buildTransferLead`) and `checklist` (`buildTransferChecklist(transferChoice, values.reason, transferWords)`). Its `warnings` are `transferWarningLines(...)` plus the detail-failed node.
  - The component lines: `const componentLines = transferComponentLines(transferChoice, transferWords)`. `.staying` is an info Notice in section 1 (`data-transfer-staying`), `.outstanding` a warning Notice in section 1 (`data-transfer-outstanding`), `.travelling` a `<p data-transfer-components>` under the table; each is hidden when null (Y4).
  - The footer's desktop span is `buildTransferFooterLine(...)`; its phone span is `transferLead ?? footerLine` (the same text as `lead ?? footerIncomplete`, since the two share one condition, tested).
  - The review: `buildOperationReviewSummary({ assetLabel, details: [...transferReviewDetails, { key: "reason", label: t("reason"), value: values.reason }], evidenceLabel: t("reviewNoEvidence"), labels })`, where `transferReviewDetails = buildTransferReviewDetails(transferChoice, transferWords)`, with **no** `destinationLabels` and **no** `nextStatusLabel`. The status is the last item `buildTransferReviewDetails` returns; T6 adds no status line of its own (Y2).

Decisions (what each function returns; the tests pin every one):
- **`getTransferFormChange(choice)`**, in this order:
  1. `ready` = `choice.row !== null && choice.row.detail !== undefined && choice.detail !== "failed"`. A re-read of the same asset (the submit's re-read, ลองอีกครั้ง) keeps its last answer while it loads, so the card does not flicker. A switched asset is a list row with no detail, so it is not ready until its read answers (P3-R21).
  2. **Not ready** (no asset, a row without `detail`, or a failed read; Y5):
     - `destinations` = `{ toLocationId: <pick> || null, toCustodianId: <pick> || null, toDepartmentId: null }`: the location and holder picks pass through raw, since there is nothing to compare them with;
     - `departmentSource: null`, `departmentLocked: true`, `nextDepartmentId: null`;
     - every `changed` false, `changedCount: 0`, `crossBranch: false`.
  3. **Ready:**
     - `normalized = normalizeTransferDestinations(<the three picks>, { currentLocationId: row.currentLocationId, custodianId: detail.holderId, departmentId: detail.departmentId })`;
     - `departmentSource = getTransferDepartmentSource({ ownership: detail.ownership, currentCustodianId: detail.holderId, newCustodianId: normalized.toCustodianId })`;
     - `departmentLocked = departmentSource !== "free"`;
     - `destinations` = `normalized`, with `toDepartmentId: null` when locked.
  4. `newHolder` = the employee whose id is `destinations.toCustodianId`. Then `nextDepartmentId = getTransferNextDepartmentId({ ownership, currentCustodianId: detail.holderId, newCustodianId: destinations.toCustodianId, currentDepartmentId: detail.departmentId, currentHolderDepartmentId: detail.holderDepartmentId, newHolderDepartmentId: newHolder?.departmentId ?? null, chosenDepartmentId: destinations.toDepartmentId })`.
  5. `changed`:
     - `location` = `destinations.toLocationId !== null`;
     - `holder` = `destinations.toCustodianId !== null`;
     - `department` = `nextDepartmentId !== detail.departmentId`.

     `changedCount` counts the true ones.
  6. `crossBranch` = a destination room was found in `choice.locations` and its `branchId !== detail.ownerBranchId`.
  - Every other builder calls `getTransferFormChange(choice)` itself. None reads the raw picks.
- **Names** (look L1). These are private helpers:
  - **The current room's name:** the `locations` option whose id is `row.currentLocationId`. An inactive room is not in that list, so the fallback is `row.locationLabel`.
  - **A department's name, by id:**
    - the current id gives `detail.departmentName`;
    - the new holder's `departmentId` gives their `departmentName` (an inactive department included, spec call 5);
    - `detail.holderDepartmentId` gives `detail.holderDepartmentName`;
    - otherwise the `departments` option's `name`;
    - a null id, or an unknown one, gives `none`.
  - The new holder reads `newHolder.name`, and the destination room reads its option's `name`.
- **`transferNowCells`:**
  - Not ready: all three cells are `TRANSFER_NOW_PENDING`.
  - Ready:
    - `location` = `` `${row.locationLabel} · ${detail.locationBranchLabel}` ``;
    - `holder` = `detail.holderLabel`, wrapped in `formerHolder(...)` when `detail.holderActive === false`, or `none`;
    - `department` = `detail.departmentLabel ?? none`.
- **`transferDepartmentLockText`:**
  - `departmentChooseAssetFirst` when no asset is chosen (`choice.row === null`; Y5), so the disabled แผนก row says why;
  - `followsHolder(<the name of nextDepartmentId>)` when ready and locked;
  - else `null`: a chosen asset whose detail is loading (a row without `detail`) or failed, or a free row. T6 then shows "ไม่เปลี่ยนแปลง".
- **`buildTransferSummaryRows`:** `[]` when not ready. Otherwise these rows, in order:
  - **`location`:**
    - now = the current room's name;
    - next = the destination's name when `changed.location`, else `kept(now)`;
    - `changed = changed.location`.
  - **`holder`:**
    - now = `detail.holderName`, wrapped in `formerHolder(...)` when `holderActive === false`, or `none`;
    - next = `newHolder.name` when `changed.holder`, else `kept(detail.holderName)` (without the former mark), or `none` when there is no holder;
    - `changed = changed.holder`.
  - **`department`:**
    - now = `detail.departmentName ?? none`;
    - next = the name of `nextDepartmentId` when `changed.department`, else `kept(departmentName)`, or `none`;
    - `changed = changed.department`.

    The row previews the implicit correction even before a destination is picked. The lead, the footer and the checklist still wait for a real change (P3-R4).
  - **`status`:**
    - now = `row.statusLabel`;
    - next = `inUse` when `getTransferTargetStatusName(destinations.toCustodianId)` is `"In Use"` and `normalizeAssetStateName(detail.statusName)` is not `"in use"`, else `statusUnchanged`;
    - `changed` follows that same condition.
  - **`components`**, only when `travelling.length > 0 || outstanding.length > 0` (`travelling` from `checkoutComponents`, `outstanding` from `checkoutOutstandingComponents`):
    - now = `count(detail.components.length + outstanding.length)` (checkout's count);
    - next = `summaryComponentsMove(travelling.length)`, with `` ` · ${summaryComponentsOutstanding(outstanding.length)}` `` when any is outstanding;
    - `changed = travelling.length > 0`.
- **`buildTransferLead`:**
  - `null` unless ready and `hasTransferChange(change.destinations)`.
  - Otherwise `summaryLead(changedCount, list)`. `list` joins with `", "` the row names `location`, `holder` and `department` whose `changed` is true, in that order.
  - Then `` ` · ${summaryHolderDepartmentKept}` `` is appended when neither `changed.holder` nor `changed.department`.
- **`buildTransferFooterLine`:**
  - `footerIncomplete` unless ready and `hasTransferChange(change.destinations)`. This is the lead's condition, so the phone line is `lead ?? footerIncomplete`.
  - Otherwise `footerDescription(row.assetTag, changes)`. `changes` joins with `" · "` the changed rows as `` `${words.location} → <room name>` ``, `` `${words.holder} → <new holder name>` `` and `` `${words.department} → <name of nextDepartmentId>` ``.
- **`buildTransferChecklist`**, three items in this order:
  - `asset`: `checkAsset`, done when `row?.eligible === true`;
  - `change`: `checkChange`, done when ready and `hasTransferChange(change.destinations)`;
  - `reason`: `checkReason`, done when `(required(reason) ?? maxLength(reason, 500)) === null`.

  No `note`.
- **`transferWarningLines`:** `[summaryCrossBranch(detail.ownerBranchLabel)]` when ready and `crossBranch`; else `[]`.
- **`buildTransferReviewDetails`:** `[]` when not ready. Otherwise, in order:
  - `location` (`toLocation`): the destination option's `label` ("code - name"), when `changed.location`;
  - `holder` (`toCustodian`): `newHolder.label` ("code - name"), when `changed.holder`;
  - `department` (`toDepartment`): the name of `nextDepartmentId`, when `changed.department` (implicit too);
  - `components` (`components`): `summaryComponentsMove(travelling.length)`, when `travelling.length > 0`;
  - `status` (`nextStatus`): the status row's next value. It is always present.
- **`transferComponentLines`:** all three `null` when not ready. Otherwise:
  - `travelling` = `componentsMove(n, <travelling names joined ", ">)`;
  - `staying` = `componentsStaying(<staying tags joined ", ">)`;
  - `outstanding` = `componentsOutstanding(n, checkoutOutstandingLines(row, words.outstandingLine).join(", "))`.

  Each is `null` when its list is empty.
- **Chips:**
  - A text "starts with a chip" when it starts with `` `${words[chip]}:` ``. The colon is required; the space after it may be missing. The three words are tested in `TRANSFER_REASON_CHIPS` order.
  - `applyTransferReasonChip` removes such a leading prefix and the spaces after it (`trimStart`), then returns `` `${words[chip]}: ${rest}` ``. With no prefix it prepends to the whole text.
  - `pressedTransferReasonChip` returns that chip, or `null`. It never returns `"other"`.
  - No length cut: `validate()` refuses past 500 under the field.
- **The file's header comment** says:
  - these are โอนย้าย's form rules (group 3 spec §9.2-§9.4, plan 3 Task 5);
  - one normalized change set drives the cells, the lock, the card, the footer, the review and T6's payload;
  - the module is pure and client-safe;
  - the department reads the rule the transfer route calls, and the destinations the route's normalizer, so the card never promises what the save does not write.

  The file must not contain the text `prisma.` (the purity pin), and it takes no device (P3-R16).

- [ ] **Step 1: Write the failing tests.**

Create `tests/transfer-form-rules.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  applyTransferReasonChip, buildTransferChecklist, buildTransferFooterLine, buildTransferLead, buildTransferReviewDetails,
  buildTransferSummaryRows, getTransferFormChange, pressedTransferReasonChip, transferComponentLines, transferDepartmentLockText,
  transferNowCells, transferWarningLines, TRANSFER_NOW_PENDING, TRANSFER_REASON_CHIPS,
  type TransferChipWords, type TransferFormChoice, type TransferFormDestinations, type TransferSummaryRow, type TransferWords,
} from "../src/lib/transfer-form-rules.ts"
import type { AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption, AssetOperationNamedOption } from "../src/lib/asset-operation-options.ts"
import type { AssetOperationChosenDetail, AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// โอนย้าย's pure rules (group 3 plan 3 Task 5, spec §9.2-§9.4): one normalized change set behind the ตอนนี้ cells, the
// แผนก lock, the สรุปก่อนบันทึก rows and lead, the checklist, the footer, the warnings, the review and the reason chips.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")

const rooms: AssetOperationLocationBranchOption[] = [
  { id: "l1", label: "HQ-01 - คลัง IT", name: "คลัง IT", branchId: "b-hq", branchName: "สำนักงานใหญ่" },
  { id: "l2", label: "HQ-02 - ห้อง 2", name: "ห้อง 2", branchId: "b-hq", branchName: "สำนักงานใหญ่" },
  { id: "l3", label: "BN-01 - ชั้น 2 ฝ่ายขาย", name: "ชั้น 2 ฝ่ายขาย", branchId: "b-bn", branchName: "สาขาบางนา" },
  // Another company's head office: the same branch name, another branch id (Branch is unique per company and code).
  { id: "l4", label: "XC-01 - ห้องรับรอง", name: "ห้องรับรอง", branchId: "b-xc", branchName: "สำนักงานใหญ่" },
]
const employees: AssetOperationEmployeeDepartmentOption[] = [
  { id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d-acc", name: "สมชาย ใจดี", departmentName: "บัญชี" },
  { id: "e2", label: "E002 - สมหญิง ใจงาม", departmentId: "d-sales", name: "สมหญิง ใจงาม", departmentName: "ขาย" },
  // An active employee in an inactive department (spec §6 call 5): not in `departments`, named by the employee's own relation.
  { id: "e3", label: "E003 - วิชัย กล้าหาญ", departmentId: "d-closed", name: "วิชัย กล้าหาญ", departmentName: "ฝ่ายที่ปิดแล้ว" },
]
const departments: AssetOperationNamedOption[] = [
  { id: "d-acc", label: "ACC - บัญชี", name: "บัญชี" },
  { id: "d-sales", label: "SAL - ขาย", name: "ขาย" },
  { id: "d-it", label: "IT - Information Technology", name: "Information Technology" },
]
const adapter = { id: "k1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true, locationLabel: "HQ-01 - คลัง IT" }
const mouse = { id: "k2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: true, locationLabel: "HQ-01 - คลัง IT" }
const dock = { id: "k3", assetTag: "NB-0017-03", name: "Dock", travels: false, locationLabel: "HQ-01 - คลัง IT" }
const keyboard = { assetTag: "NB-0017-04", name: "Keyboard", holderName: "สมศรี ทองดี", checkinNo: "RT-202610-0003" }

// A บุคคล asset in use, held by E001 of บัญชี, its stored department บัญชี too, in คลัง IT at the head office.
function row(o: Partial<AssetOperationSearchRow> = {}, d: Partial<AssetOperationChosenDetail> = {}): AssetOperationSearchRow {
  return {
    id: "a1", assetTag: "NB-0017", name: "Notebook", serialNumber: "SN-1", statusLabel: "ใช้งานอยู่", placeLabel: "E001 - สมชาย ใจดี",
    locationLabel: "HQ-01 - คลัง IT", currentLocationId: "l1", conditionId: "c-good", eligible: true, reasonKey: null, photo: null,
    detail: {
      ownership: "personal", statusName: "In Use",
      departmentId: "d-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี",
      holderId: "e1", holderActive: true, holderLabel: "E001 - สมชาย ใจดี", holderName: "สมชาย ใจดี",
      holderDepartmentId: "d-acc", holderDepartmentName: "บัญชี",
      ownerBranchId: "b-hq", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่",
      components: [], outstandingComponents: [], ...d,
    },
    ...o,
  }
}
// The same asset whose stored department is ขาย while its holder is in บัญชี (spec §6 call 4).
const mismatched = () => row({}, { departmentId: "d-sales", departmentLabel: "SAL - ขาย", departmentName: "ขาย" })
// A พร้อมใช้งาน asset with no holder, in IT.
const free = (d: Partial<AssetOperationChosenDetail> = {}) => row({ statusLabel: "พร้อมใช้งาน", placeLabel: "HQ-01 - คลัง IT" }, {
  statusName: "Ready", holderId: null, holderActive: null, holderLabel: null, holderName: null, holderDepartmentId: null, holderDepartmentName: null,
  departmentId: "d-it", departmentLabel: "IT - Information Technology", departmentName: "Information Technology", ...d,
})
const choose = (to: Partial<TransferFormDestinations> = {}, o: Partial<TransferFormChoice> = {}): TransferFormChoice => ({
  row: row(), detail: "ready", employees, departments, locations: rooms, ...o,
  destinations: { toLocationId: "", toCustodianId: "", toDepartmentId: "", ...to },
})
const words: TransferWords = {
  location: "ที่ตั้ง", holder: "ผู้ถือครอง", department: "แผนก", status: "สถานะ", components: "ส่วนควบ", none: "ไม่มี",
  kept: (value) => `${value} (คงเดิม)`, formerHolder: (name) => `${name} (พ้นสภาพ)`, followsHolder: (department) => `ตามผู้ถือครอง: ${department}`,
  departmentChooseAssetFirst: "เลือกทรัพย์สินก่อน", inUse: "ใช้งานอยู่", statusUnchanged: "คงสถานะเดิม", count: (count) => `${count} รายการ`,
  summaryComponentsMove: (count) => `ย้ายตาม ${count} รายการ`, summaryComponentsOutstanding: (count) => `ค้างคืน ${count} รายการ`,
  summaryLead: (count, list) => `เปลี่ยน ${count} อย่าง: ${list}`, summaryHolderDepartmentKept: "ผู้ถือครองและแผนกคงเดิม",
  summaryCrossBranch: (branch) => `ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ ${branch} ตามเดิม`,
  footerDescription: (tag, changes) => `โอนย้าย ${tag}: ${changes}`, footerIncomplete: "เลือกทรัพย์สินและสิ่งที่จะเปลี่ยน",
  checkAsset: "ทรัพย์สิน", checkChange: "เปลี่ยนอย่างน้อย 1 อย่าง", checkReason: "เหตุผล",
  toLocation: "ที่ตั้งปลายทาง", toCustodian: "ผู้ถือครองปลายทาง", toDepartment: "แผนกปลายทาง", nextStatus: "สถานะถัดไป",
  componentsMove: (count, list) => `ส่วนควบ ${count} รายการ (${list}) ย้ายตามไปด้วย`,
  componentsStaying: (list) => `ส่วนควบที่มีใบส่งมอบของตัวเองไม่ย้ายตาม: ${list}`,
  componentsOutstanding: (count, list) => `ส่วนควบค้างคืน ${count} รายการ ไม่ย้ายตาม: ${list}`,
  outstandingLine: { with: (holder) => `อยู่กับ ${holder}`, since: (documentNo) => `ตั้งแต่ ${documentNo}` },
}
const chipWords: TransferChipWords = { branch: "ย้ายสาขา", user: "เปลี่ยนผู้ใช้งาน", restructure: "ปรับโครงสร้างแผนก" }
const INCOMPLETE = "เลือกทรัพย์สินและสิ่งที่จะเปลี่ยน"
const pick = (rows: TransferSummaryRow[]) => rows.map(({ key, now, next, changed }) => [key, now, next, changed])
const nothing = { location: false, holder: false, department: false }
const none = { toLocationId: null, toCustodianId: null, toDepartmentId: null }

test("a held asset moved only to another room takes its holder's department: the rows, the lead, the footer, the lock and the review all say so (Review Focus 1, spec §6 call 4, P3-R3, P3-R12)", () => {
  const choice = choose({ toLocationId: "l2" }, { row: mismatched() })
  assert.deepEqual(getTransferFormChange(choice), {
    ready: true, destinations: { toLocationId: "l2", toCustodianId: null, toDepartmentId: null },
    departmentSource: "currentHolder", departmentLocked: true, nextDepartmentId: "d-acc",
    changed: { location: true, holder: false, department: true }, changedCount: 2, crossBranch: false,
  })
  const rows = buildTransferSummaryRows(choice, words)
  assert.deepEqual(rows.map((r) => r.label), ["ที่ตั้ง", "ผู้ถือครอง", "แผนก", "สถานะ"])
  assert.deepEqual(pick(rows), [
    ["location", "คลัง IT", "ห้อง 2", true],
    ["holder", "สมชาย ใจดี", "สมชาย ใจดี (คงเดิม)", false],
    ["department", "ขาย", "บัญชี", true],
    ["status", "ใช้งานอยู่", "คงสถานะเดิม", false],
  ])
  assert.equal(buildTransferLead(choice, words), "เปลี่ยน 2 อย่าง: ที่ตั้ง, แผนก")
  assert.equal(buildTransferFooterLine(choice, words), "โอนย้าย NB-0017: ที่ตั้ง → ห้อง 2 · แผนก → บัญชี")
  assert.equal(transferDepartmentLockText(choice, words), "ตามผู้ถือครอง: บัญชี")
  assert.deepEqual(buildTransferReviewDetails(choice, words), [
    { key: "location", label: "ที่ตั้งปลายทาง", value: "HQ-02 - ห้อง 2" },
    { key: "department", label: "แผนกปลายทาง", value: "บัญชี" },
    { key: "status", label: "สถานะถัดไป", value: "คงสถานะเดิม" },
  ])
})

test("a room-only move that keeps the holder and the department: เปลี่ยน 1 อย่าง with ผู้ถือครองและแผนกคงเดิม; an inactive current room falls back to its code - name (spec §9.3, P3-R12)", () => {
  const choice = choose({ toLocationId: "l2" })
  assert.equal(buildTransferLead(choice, words), "เปลี่ยน 1 อย่าง: ที่ตั้ง · ผู้ถือครองและแผนกคงเดิม")
  assert.deepEqual(pick(buildTransferSummaryRows(choice, words))[2], ["department", "บัญชี", "บัญชี (คงเดิม)", false])
  assert.equal(buildTransferFooterLine(choice, words), "โอนย้าย NB-0017: ที่ตั้ง → ห้อง 2")
  assert.deepEqual(buildTransferReviewDetails(choice, words).map((detail) => detail.key), ["location", "status"])
  const closedRoom = choose({ toLocationId: "l2" }, { row: row({ currentLocationId: "l9", locationLabel: "OLD-9 - ห้องเก่า" }) })
  assert.deepEqual(pick(buildTransferSummaryRows(closedRoom, words))[0], ["location", "OLD-9 - ห้องเก่า", "ห้อง 2", true])
})

test("a new holder: the department follows them and cannot be picked, a picked department is not sent, and พร้อมใช้งาน goes to ใช้งานอยู่ (spec §6, §9.2, §9.3, P3-R5)", () => {
  const choice = choose({ toCustodianId: "e2", toDepartmentId: "d-acc" }, { row: free() })
  assert.deepEqual(getTransferFormChange(choice), {
    ready: true, destinations: { toLocationId: null, toCustodianId: "e2", toDepartmentId: null },
    departmentSource: "newHolder", departmentLocked: true, nextDepartmentId: "d-sales",
    changed: { location: false, holder: true, department: true }, changedCount: 2, crossBranch: false,
  })
  assert.deepEqual(pick(buildTransferSummaryRows(choice, words)), [
    ["location", "คลัง IT", "คลัง IT (คงเดิม)", false],
    ["holder", "ไม่มี", "สมหญิง ใจงาม", true],
    ["department", "Information Technology", "ขาย", true],
    ["status", "พร้อมใช้งาน", "ใช้งานอยู่", true],
  ])
  assert.equal(transferDepartmentLockText(choice, words), "ตามผู้ถือครอง: ขาย")
  assert.equal(buildTransferLead(choice, words), "เปลี่ยน 2 อย่าง: ผู้ถือครอง, แผนก")
  assert.equal(buildTransferFooterLine(choice, words), "โอนย้าย NB-0017: ผู้ถือครอง → สมหญิง ใจงาม · แผนก → ขาย")
  assert.deepEqual(buildTransferReviewDetails(choice, words), [
    { key: "holder", label: "ผู้ถือครองปลายทาง", value: "E002 - สมหญิง ใจงาม" },
    { key: "department", label: "แผนกปลายทาง", value: "ขาย" },
    { key: "status", label: "สถานะถัดไป", value: "ใช้งานอยู่" },
  ])
})

test("ใช้งานอยู่ stays ใช้งานอยู่ under a new holder; an inactive department of an active holder is named as it will be written; Stock follows the holder; three changes (spec §6 call 5, P3-R12)", () => {
  assert.deepEqual(pick(buildTransferSummaryRows(choose({ toCustodianId: "e2" }), words)).slice(1), [
    ["holder", "สมชาย ใจดี", "สมหญิง ใจงาม", true],
    ["department", "บัญชี", "ขาย", true],
    ["status", "ใช้งานอยู่", "คงสถานะเดิม", false],
  ])
  const closed = choose({ toCustodianId: "e3" })
  assert.equal(getTransferFormChange(closed).nextDepartmentId, "d-closed")
  assert.equal(transferDepartmentLockText(closed, words), "ตามผู้ถือครอง: ฝ่ายที่ปิดแล้ว")
  assert.deepEqual(pick(buildTransferSummaryRows(closed, words))[2], ["department", "บัญชี", "ฝ่ายที่ปิดแล้ว", true])
  assert.equal(getTransferFormChange(choose({ toCustodianId: "e2" }, { row: free({ ownership: "stock" }) })).departmentSource, "newHolder")
  const all = choose({ toLocationId: "l3", toCustodianId: "e2" })
  assert.equal(buildTransferLead(all, words), "เปลี่ยน 3 อย่าง: ที่ตั้ง, ผู้ถือครอง, แผนก")
  assert.equal(buildTransferFooterLine(all, words), "โอนย้าย NB-0017: ที่ตั้ง → ชั้น 2 ฝ่ายขาย · ผู้ถือครอง → สมหญิง ใจงาม · แผนก → ขาย")
})

test("a destination equal to the current value is not a change: not sent, not counted, and a re-picked holder keeps the status (Review Focus 2, spec §9.2 call 17, P3-R4)", () => {
  const same = choose({ toLocationId: "l1", toCustodianId: "e1" })
  assert.deepEqual([getTransferFormChange(same).destinations, getTransferFormChange(same).changed], [none, nothing])
  assert.equal(buildTransferLead(same, words), null)
  assert.equal(buildTransferFooterLine(same, words), INCOMPLETE)
  assert.equal(buildTransferChecklist(same, "เปลี่ยนผู้ใช้งาน: ตามคำขอ", words)[1].done, false)
  assert.deepEqual(buildTransferReviewDetails(same, words), [{ key: "status", label: "สถานะถัดไป", value: "คงสถานะเดิม" }])
  // A พร้อมใช้งาน asset still carrying an old holder (ข้อมูลเก่า) re-picks that holder: no ใช้งานอยู่, and no assignCustodian for the picker.
  const legacy = choose({ toCustodianId: "e1" }, { row: row({ statusLabel: "พร้อมใช้งาน" }, { statusName: "Ready" }) })
  assert.equal(getTransferFormChange(legacy).destinations.toCustodianId, null)
  assert.deepEqual(pick(buildTransferSummaryRows(legacy, words))[3], ["status", "พร้อมใช้งาน", "คงสถานะเดิม", false])
  // A free asset's own department, picked again, is dropped too.
  assert.deepEqual(getTransferFormChange(choose({ toDepartmentId: "d-it" }, { row: free() })), {
    ready: true, destinations: none, departmentSource: "free", departmentLocked: false, nextDepartmentId: "d-it",
    changed: nothing, changedCount: 0, crossBranch: false,
  })
})

test("the department correction alone is not a change: the row previews it, but there is no lead, the footer asks for a change and the checklist waits (P3-R4, P3-R12)", () => {
  const choice = choose({}, { row: mismatched() })
  const change = getTransferFormChange(choice)
  assert.deepEqual([change.destinations, change.changed, change.changedCount], [none, { location: false, holder: false, department: true }, 1])
  assert.deepEqual(pick(buildTransferSummaryRows(choice, words))[2], ["department", "ขาย", "บัญชี", true])
  assert.equal(buildTransferLead(choice, words), null)
  assert.equal(buildTransferFooterLine(choice, words), INCOMPLETE)
  assert.equal(buildTransferChecklist(choice, "ย้ายสาขา: ไปบางนา", words)[1].done, false)
})

test("a holder chosen, then cleared with ×: the row unlocks, nothing is sent and the status returns to คงสถานะเดิม; the rule keeps no memory, so the form clears the department it locked (Review Focus 3, P3-R5)", () => {
  const chosen = choose({ toCustodianId: "e2" }, { row: free() })
  assert.equal(getTransferFormChange(chosen).departmentLocked, true)
  assert.deepEqual(pick(buildTransferSummaryRows(chosen, words))[3], ["status", "พร้อมใช้งาน", "ใช้งานอยู่", true])
  const cleared = choose({ toCustodianId: "" }, { row: free() })
  assert.deepEqual(getTransferFormChange(cleared), {
    ready: true, destinations: none, departmentSource: "free", departmentLocked: false, nextDepartmentId: "d-it",
    changed: nothing, changedCount: 0, crossBranch: false,
  })
  assert.equal(transferDepartmentLockText(cleared, words), null)
  assert.deepEqual(pick(buildTransferSummaryRows(cleared, words))[3], ["status", "พร้อมใช้งาน", "คงสถานะเดิม", false])
  // A department still in the form's state comes back once the holder goes: T6 clears it when a holder locks the row.
  assert.equal(getTransferFormChange(choose({ toDepartmentId: "d-acc" }, { row: free() })).destinations.toDepartmentId, "d-acc")
})

test("no detail to judge (a switched asset still loading, a failed read, no asset): the แผนก row is locked and nothing is promised (Review Focus 5, P3-R15, P3-R21)", () => {
  const picks = { toLocationId: "l2", toCustodianId: "e2", toDepartmentId: "d-acc" }
  const listed = row({ detail: undefined })
  for (const choice of [choose(picks, { row: listed, detail: "loading" }), choose(picks, { detail: "failed" }), choose(picks, { row: listed, detail: "failed" }), choose(picks, { row: listed }), choose(picks, { row: null })]) {
    assert.deepEqual(getTransferFormChange(choice), {
      ready: false, destinations: { toLocationId: "l2", toCustodianId: "e2", toDepartmentId: null },
      departmentSource: null, departmentLocked: true, nextDepartmentId: null, changed: nothing, changedCount: 0, crossBranch: false,
    })
    assert.deepEqual(buildTransferSummaryRows(choice, words), [])
    assert.deepEqual(transferNowCells(choice, words), { location: "…", holder: "…", department: "…" })
    assert.equal(transferDepartmentLockText(choice, words), choice.row === null ? "เลือกทรัพย์สินก่อน" : null)
    assert.equal(buildTransferLead(choice, words), null)
    assert.equal(buildTransferFooterLine(choice, words), INCOMPLETE)
    assert.deepEqual(transferWarningLines(choice, words), [])
    assert.deepEqual(buildTransferReviewDetails(choice, words), [])
    assert.deepEqual(transferComponentLines(choice, words), { travelling: null, staying: null, outstanding: null })
    assert.equal(buildTransferChecklist(choice, "ย้ายสาขา: ไปบางนา", words)[1].done, false)
  }
  assert.equal(TRANSFER_NOW_PENDING, "…")
  // The same asset read again (the submit's re-read, ลองอีกครั้ง) keeps its last answer while it loads: no flicker.
  assert.equal(getTransferFormChange(choose(picks, { detail: "loading" })).ready, true)
  assert.equal(buildTransferSummaryRows(choose(picks, { detail: "loading" }), words).length, 4)
})

test("no asset chosen: the locked แผนก row says เลือกทรัพย์สินก่อน; a chosen asset whose detail is loading or failed keeps ไม่เปลี่ยนแปลง (null), and a ready free asset unlocks the row (Y5, P3-R5, P3-R21)", () => {
  const noAsset = choose({ toDepartmentId: "d-acc" }, { row: null })
  assert.deepEqual([getTransferFormChange(noAsset).departmentLocked, getTransferFormChange(noAsset).destinations.toDepartmentId], [true, null])
  assert.equal(transferDepartmentLockText(noAsset, words), "เลือกทรัพย์สินก่อน")
  assert.equal(transferDepartmentLockText(choose({}, { row: row({ detail: undefined }), detail: "loading" }), words), null, "a switched asset still loading")
  assert.equal(transferDepartmentLockText(choose({}, { row: free(), detail: "failed" }), words), null, "a failed read")
  const ready = choose({ toDepartmentId: "d-acc" }, { row: free() })
  assert.deepEqual([getTransferFormChange(ready).departmentLocked, transferDepartmentLockText(ready, words)], [false, null])
})

test("ส่วนกลาง and a ส่วนควบ moved alone keep a free department, even with a holder, and a holder still makes them ใช้งานอยู่ (spec §6 Q1, P3-R2)", () => {
  for (const ownership of ["shared", "component"] as const) {
    const choice = choose({ toCustodianId: "e2", toDepartmentId: "d-acc" }, { row: free({ ownership }) })
    const change = getTransferFormChange(choice)
    assert.deepEqual([change.departmentSource, change.departmentLocked, change.destinations, change.nextDepartmentId],
      ["free", false, { toLocationId: null, toCustodianId: "e2", toDepartmentId: "d-acc" }, "d-acc"], ownership)
    assert.equal(transferDepartmentLockText(choice, words), null, ownership)
    assert.deepEqual(pick(buildTransferSummaryRows(choice, words)).slice(2), [
      ["department", "Information Technology", "บัญชี", true], ["status", "พร้อมใช้งาน", "ใช้งานอยู่", true]], ownership)
  }
  // A held ส่วนกลาง asset moved only to another room keeps its department: no correction to the holder's.
  const shared = choose({ toLocationId: "l2" }, { row: row({}, { ownership: "shared", departmentId: "d-it", departmentLabel: "IT - Information Technology", departmentName: "Information Technology" }) })
  assert.deepEqual(getTransferFormChange(shared).changed, { location: true, holder: false, department: false })
  assert.equal(buildTransferLead(shared, words), "เปลี่ยน 1 อย่าง: ที่ตั้ง · ผู้ถือครองและแผนกคงเดิม")
})

test("the ตอนนี้ cells read code - name: the room with its branch, the holder, the department; a former holder is marked and still decides the department (P3-R10, P3-R17)", () => {
  assert.deepEqual(transferNowCells(choose(), words), { location: "HQ-01 - คลัง IT · สำนักงานใหญ่", holder: "E001 - สมชาย ใจดี", department: "ACC - บัญชี" })
  assert.deepEqual(transferNowCells(choose({}, { row: free({ departmentId: null, departmentLabel: null, departmentName: null }) }), words),
    { location: "HQ-01 - คลัง IT · สำนักงานใหญ่", holder: "ไม่มี", department: "ไม่มี" })
  const former = choose({ toLocationId: "l2" }, { row: row({}, { holderActive: false, departmentId: "d-sales", departmentLabel: "SAL - ขาย", departmentName: "ขาย" }) })
  assert.equal(transferNowCells(former, words).holder, "E001 - สมชาย ใจดี (พ้นสภาพ)")
  assert.equal(transferDepartmentLockText(former, words), "ตามผู้ถือครอง: บัญชี")
  assert.deepEqual(pick(buildTransferSummaryRows(former, words)).slice(1, 3), [
    ["holder", "สมชาย ใจดี (พ้นสภาพ)", "สมชาย ใจดี (คงเดิม)", false], ["department", "ขาย", "บัญชี", true]])
})

test("the cross-branch line: a new room in another branch than the asset's own, compared by branch id and never by name, for a room only (P3-R13)", () => {
  const line = "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ สำนักงานใหญ่ ตามเดิม"
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l3" }), words), [line])
  assert.equal(getTransferFormChange(choose({ toLocationId: "l3" })).crossBranch, true)
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l4" }), words), [line], "same branch name, another branch id")
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l2" }, { row: row({}, { ownerBranchLabel: "Head Office" }) }), words), [], "same branch id, another name")
  assert.deepEqual(transferWarningLines(choose({ toCustodianId: "e2" }), words), [], "a holder alone")
  // An asset owned by สาขาบางนา sitting at the head office: a move within the head office still names its owner's branch.
  const away = row({}, { ownerBranchId: "b-bn", ownerBranchLabel: "สาขาบางนา" })
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l2" }, { row: away }), words), ["ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ สาขาบางนา ตามเดิม"])
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l1" }, { row: away }), words), [], "its own room again is no move")
})

test("components: the line under the table lists what moves (the sync's filter), those with their own handover and the outstanding ones apart, and the card counts them (P3-R12, P3-R14)", () => {
  const withAll = choose({ toLocationId: "l2" }, { row: row({}, { components: [adapter, mouse, dock], outstandingComponents: [keyboard] }) })
  assert.deepEqual(transferComponentLines(withAll, words), {
    travelling: "ส่วนควบ 2 รายการ (Adapter 65W, Mouse ไร้สาย) ย้ายตามไปด้วย",
    staying: "ส่วนควบที่มีใบส่งมอบของตัวเองไม่ย้ายตาม: NB-0017-03",
    outstanding: "ส่วนควบค้างคืน 1 รายการ ไม่ย้ายตาม: NB-0017-04 Keyboard · อยู่กับ สมศรี ทองดี · ตั้งแต่ RT-202610-0003",
  })
  assert.deepEqual(pick(buildTransferSummaryRows(withAll, words))[4], ["components", "4 รายการ", "ย้ายตาม 2 รายการ · ค้างคืน 1 รายการ", true])
  assert.deepEqual(buildTransferReviewDetails(withAll, words).find((detail) => detail.key === "components"), { key: "components", label: "ส่วนควบ", value: "ย้ายตาม 2 รายการ" })
  const one = choose({ toLocationId: "l2" }, { row: row({}, { components: [adapter] }) })
  assert.deepEqual(pick(buildTransferSummaryRows(one, words))[4], ["components", "1 รายการ", "ย้ายตาม 1 รายการ", true])
  assert.deepEqual(transferComponentLines(one, words), { travelling: "ส่วนควบ 1 รายการ (Adapter 65W) ย้ายตามไปด้วย", staying: null, outstanding: null })
  const onlyOutstanding = choose({ toLocationId: "l2" }, { row: row({}, { outstandingComponents: [keyboard] }) })
  assert.deepEqual(pick(buildTransferSummaryRows(onlyOutstanding, words))[4], ["components", "1 รายการ", "ย้ายตาม 0 รายการ · ค้างคืน 1 รายการ", false])
  assert.equal(buildTransferReviewDetails(onlyOutstanding, words).some((detail) => detail.key === "components"), false)
  // Only a component with its own handover: nothing moves and none is outstanding, so there is no components row.
  assert.deepEqual(buildTransferSummaryRows(choose({ toLocationId: "l2" }, { row: row({}, { components: [dock] }) }), words).map((r) => r.key), ["location", "holder", "department", "status"])
  assert.deepEqual(transferComponentLines(choose(), words), { travelling: null, staying: null, outstanding: null })
})

test("the checklist: the asset can be moved, at least one real change, and the reason by validate()'s own rule (P3-R12, P3-R16)", () => {
  const choice = choose({ toLocationId: "l2" })
  assert.deepEqual(buildTransferChecklist(choice, "ย้ายสาขา: ไปบางนา", words), [
    { key: "asset", label: "ทรัพย์สิน", done: true },
    { key: "change", label: "เปลี่ยนอย่างน้อย 1 อย่าง", done: true },
    { key: "reason", label: "เหตุผล", done: true },
  ])
  const blocked = choose({ toLocationId: "l2" }, { row: row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotTransferable" }) })
  assert.equal(buildTransferChecklist(blocked, "ย้ายสาขา: ไปบางนา", words)[0].done, false)
  assert.equal(buildTransferChecklist(choose({ toLocationId: "l2" }, { row: null }), "x", words)[0].done, false)
  assert.equal(buildTransferChecklist(choice, "   ", words)[2].done, false)
  assert.equal(buildTransferChecklist(choice, "ก".repeat(501), words)[2].done, false)
  assert.equal(buildTransferChecklist(choice, "ก".repeat(500), words)[2].done, true)
})

test("the lead and the footer share one condition, so the phone's footer line is the lead or footerIncomplete (P3-R12, spec §9.4)", () => {
  const choices = [choose(), choose({ toLocationId: "l2" }), choose({ toCustodianId: "e2" }, { row: free() }), choose({ toLocationId: "l2" }, { row: row({ detail: undefined }), detail: "loading" }), choose({}, { row: mismatched() }), choose({ toLocationId: "l1" })]
  for (const choice of choices) assert.equal(buildTransferLead(choice, words) === null, buildTransferFooterLine(choice, words) === INCOMPLETE)
})

test("the review lists real changes only, in order: the room and the employee by code - name, the department by name, the components and the next status (P3-R18)", () => {
  const choice = choose({ toLocationId: "l3", toCustodianId: "e2", toDepartmentId: "d-it" }, { row: row({}, { components: [adapter] }) })
  assert.deepEqual(buildTransferReviewDetails(choice, words), [
    { key: "location", label: "ที่ตั้งปลายทาง", value: "BN-01 - ชั้น 2 ฝ่ายขาย" },
    { key: "holder", label: "ผู้ถือครองปลายทาง", value: "E002 - สมหญิง ใจงาม" },
    { key: "department", label: "แผนกปลายทาง", value: "ขาย" },
    { key: "components", label: "ส่วนควบ", value: "ย้ายตาม 1 รายการ" },
    { key: "status", label: "สถานะถัดไป", value: "คงสถานะเดิม" },
  ])
  const department = choose({ toDepartmentId: "d-acc" }, { row: free() })
  assert.deepEqual(buildTransferReviewDetails(department, words), [
    { key: "department", label: "แผนกปลายทาง", value: "บัญชี" },
    { key: "status", label: "สถานะถัดไป", value: "คงสถานะเดิม" },
  ])
  assert.equal(buildTransferLead(department, words), "เปลี่ยน 1 อย่าง: แผนก")
  assert.equal(buildTransferFooterLine(department, words), "โอนย้าย NB-0017: แผนก → บัญชี")
})

test("a chip writes its full word and a colon at the start, replacing an earlier chip's and keeping the rest, never cut (spec §9.3 call 18, P3-R16)", () => {
  assert.deepEqual(TRANSFER_REASON_CHIPS, ["branch", "user", "restructure", "other"])
  assert.equal(applyTransferReasonChip("", "branch", chipWords), "ย้ายสาขา: ")
  assert.equal(applyTransferReasonChip("ไปสาขาบางนา", "branch", chipWords), "ย้ายสาขา: ไปสาขาบางนา")
  assert.equal(applyTransferReasonChip("ย้ายสาขา: ไปสาขาบางนา", "user", chipWords), "เปลี่ยนผู้ใช้งาน: ไปสาขาบางนา")
  assert.equal(applyTransferReasonChip("เปลี่ยนผู้ใช้งาน:ให้คุณสมหญิง", "restructure", chipWords), "ปรับโครงสร้างแผนก: ให้คุณสมหญิง")
  assert.equal(applyTransferReasonChip("ปรับโครงสร้างแผนก: รวมฝ่าย", "restructure", chipWords), "ปรับโครงสร้างแผนก: รวมฝ่าย")
  // Only a leading prefix is replaced, and the phone's short ปรับโครงสร้าง is a label, never a prefix.
  assert.equal(applyTransferReasonChip("ตามคำขอ ย้ายสาขา: ด่วน", "user", chipWords), "เปลี่ยนผู้ใช้งาน: ตามคำขอ ย้ายสาขา: ด่วน")
  assert.equal(applyTransferReasonChip("ปรับโครงสร้าง: รวมฝ่าย", "branch", chipWords), "ย้ายสาขา: ปรับโครงสร้าง: รวมฝ่าย")
  const long = "ก".repeat(495)
  assert.equal(applyTransferReasonChip(long, "restructure", chipWords), `ปรับโครงสร้างแผนก: ${long}`)
})

test("the pressed chip is the one whose word and colon start the text; อื่น ๆ never writes and is never pressed (P3-R16)", () => {
  assert.equal(pressedTransferReasonChip("ย้ายสาขา: ไปบางนา", chipWords), "branch")
  assert.equal(pressedTransferReasonChip("เปลี่ยนผู้ใช้งาน:", chipWords), "user")
  assert.equal(pressedTransferReasonChip("ปรับโครงสร้างแผนก: ", chipWords), "restructure")
  for (const text of ["", "ไปบางนา", "อื่น ๆ: ไปบางนา", " ย้ายสาขา: ไปบางนา", "ปรับโครงสร้าง: รวมฝ่าย", "ย้ายสาขา"]) assert.equal(pressedTransferReasonChip(text, chipWords), null, text)
  // @ts-expect-error อื่น ๆ only focuses the text (spec §9.3): the chip function does not take it.
  const writeOther = () => applyTransferReasonChip("x", "other", chipWords)
  assert.equal(typeof writeOther, "function")
})

test("one rule, one function: the rules read T1's department rule and normalizer and checkout's component filter, stay pure and take no device (plan 3 Global Constraints, P3-R16)", () => {
  const source = read("src/lib/transfer-form-rules.ts")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
  for (const call of ["getTransferDepartmentSource(", "getTransferNextDepartmentId(", "normalizeTransferDestinations(", "hasTransferChange(",
    "getTransferTargetStatusName(", "checkoutComponents(", "checkoutOutstandingLines("]) assert.ok(source.includes(call), call)
  assert.doesNotMatch(source, /isDesktop|matchMedia|\bwindow\.\w|\bdocument\.\w/)
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/transfer-form-rules.test.ts`. Expected: the file fails to load with `ERR_MODULE_NOT_FOUND` for `src/lib/transfer-form-rules.ts`, so every test fails.

- [ ] **Step 3: Implement** `src/lib/transfer-form-rules.ts` with the exports, types and decisions above:
  - The imports are exactly these:
    ```ts
    import { getTransferDepartmentSource, getTransferNextDepartmentId, type TransferDepartmentSource } from "./asset-department-rule.ts"
    import { getTransferTargetStatusName, normalizeAssetStateName } from "./asset-lifecycle-policy.ts"
    import type { AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption, AssetOperationNamedOption } from "./asset-operation-options.ts"
    import type { AssetOperationSearchRow } from "./asset-operation-search-rules.ts"
    import { checkoutComponents, checkoutOutstandingComponents, checkoutOutstandingLines, type CheckoutDetailState, type CheckoutOutstandingWords } from "./checkout-form-rules.ts"
    import { hasTransferChange, normalizeTransferDestinations, type TransferDestinations } from "./transfer-rules.ts"
    import { maxLength, required } from "./validation-rules.ts"
    ```
  - Copy no rule. The department comes only through T1's two functions, equality only through T1's normalizer, the travelling and outstanding components only through checkout's functions, and the status only through `getTransferTargetStatusName`.
  - Keep the name helpers (the current room, a department by id) private (not exported).
  - No React, no `next-intl`, no message keys: the words come in.

- [ ] **Step 4: Run them and see them pass, then the full checks.**
  - Re-run `node --test tests/transfer-form-rules.test.ts`: every test passes.
  - Then run the neighbours: `node --test tests/checkout-form-rules.test.ts tests/checkin-form-rules.test.ts tests/transfer-rules.test.ts tests/asset-department-rule.test.ts tests/thai-glossary.test.ts`. Every test passes, and this task changes none of their files.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`: no failures and 0 lint errors.
    - `tsc` also checks the `@ts-expect-error` line: it fails if `applyTransferReasonChip` ever accepts `"other"`.
    - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - No E2E and no build (header facts).

- [ ] **Step 5: Commit.**
```
git add src/lib/transfer-form-rules.ts tests/transfer-form-rules.test.ts
git commit -m "feat(transfer): the form's rules: one normalized change set behind the ตอนนี้ cells, the แผนก lock, the summary rows and lead, the checklist, the footer, the cross-branch line, the component lines and the review, and the reason chips (group 3 spec §9.2-§9.4; P3-R12 to P3-R18, P3-R21)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The โอนย้าย page and form, desktop and phone (spec §9.1-§9.4, §5, §13, Appendix A โอนย้าย; P3-R4, P3-R5, P3-R6, P3-R9, P3-R10 to P3-R19, P3-R21, P3-R23)

The transfer form is rebuilt on plan 1's frame and summary card, in รับคืน's shape: one `<form id>` wraps `OperationFormFrame` with `summaryOnPhone={false}`, the review dialog follows the form, and below lg the footer carries one summary line and a block repeats the card's warnings. Section 2 becomes the "เปลี่ยนอะไร" table (รายการ / ตอนนี้ / → / ปลายทาง) whose แผนก row follows the holder, and section 3 gets the reason chips. Every value the form shows or sends comes from T5's `getTransferFormChange` and its builders, so the picker's context, `validate()`, the card, the footer, the review and the payload read one normalized change set (GP X2).

**Rulings this task follows (copied from the skeleton, as the controller's rulings Y1-Y20 amend them):**
- **P3-R4 (form part):** a destination equal to the current value is not a change. The payload is `getTransferFormChange(...).destinations` (normalized, a locked department dropped), and the at-least-one rule reads T1's `hasTransferChange` on it, under `toLocationId` with the server's code `transferDestinationRequired`. The pickers mark and disable the current value (P3-R11), so the UI cannot send it.
- **P3-R5 (form part, with Y5 and Y9):** the แผนก row is locked when T5 says `departmentLocked`: the department follows a new or the current holder, and also while there is nothing to judge it (no asset, a detail not read yet, a failed read). The picker is `<SearchableSelect id="transfer-to-department" disabled value="" placeholder={lockText ?? t("noChange")}>`, where T5's `transferDepartmentLockText` reads "ตามผู้ถือครอง: <name>" when the department follows a holder, "เลือกทรัพย์สินก่อน" when no asset is chosen, and null (so "ไม่เปลี่ยนแปลง") while the chosen asset's detail is loading or failed; × hides itself when disabled. Choosing a holder clears a picked department when the change computed with that holder has `departmentSource !== "free"`: a holder the department follows, or a holder picked while the detail is not ready (source null). A ส่วนกลาง or ส่วนควบ asset with a ready detail stays free and keeps its pick (spec §9.2; Y9, Y21); clearing the holder with × unlocks the row and the cleared department does not come back. A 409 `ASSET_TRANSFER_DEPARTMENT_LOCKED` (no `fieldErrors`) is a toast with a re-read.
- **P3-R6 (form part):** literal ids `transfer-to-custodian` and `transfer-to-department`; `FIELD_IDS` / `FIELD_ORDER` are asset → location → custodian → department → reason, so T2's `ASSET_TRANSFER_DESTINATION_INACTIVE` lands under each failing field.
- **P3-R9 (page part):** `getAssetOperationMasterOptions({ employeeDepartment: true, locationBranch: true })` and `getAssetOperationPreselect("transfer", filters.assetId, { detail: true })`.
- **P3-R10:** a former holder reads "<code - name> (พ้นสภาพ)" in the ตอนนี้ cell with รับคืน's key `checkin.returnByFormer` (T5 draws it from the word this task passes).
- **P3-R11 (caller side, with Y7):** each picker passes `currentValue`, `currentMark={tOperation("summaryNow")}` ("ตอนนี้", the card's own head; no new key) and `labelVisuallyHidden`; the card gets `lead`.
- **P3-R12:** the card's `lead` and the phone footer line are `buildTransferLead`; the desktop footer line is `buildTransferFooterLine`; the checklist is ทรัพย์สิน, เปลี่ยนอย่างน้อย 1 อย่าง, เหตุผล; the footnote "เลขเอกสารโอนย้ายออกให้หลังบันทึก แล้วเปิดเอกสารให้พิมพ์ทันที".
- **P3-R13:** the cross-branch line is a card warning (`transferWarningLines`), repeated in the phone warnings block.
- **P3-R14 (with Y4):** the form renders T5's `transferComponentLines(transferChoice, transferWords)` and builds no component text itself: `.travelling` is the line `data-transfer-components` under the table, `.staying` (components with their own open handover) an info Notice in section 1, `.outstanding` a warning Notice in section 1; each is hidden when T5 answers null.
- **P3-R15 (with Y7, Y9):** the detail is read once per pick and again on submit; field checks run first; a refused re-read puts the reason under the asset; after the re-read `validate()` runs again on the answer, so a pick that stopped being a change lands under `#transfer-to-location` instead of opening the review; a failed re-read keeps the review shut and shows "อ่านข้อมูลสรุปไม่สำเร็จ" (`checkout.detailReadFailed` through `tAll`; no new key) with ลองอีกครั้ง in the card and the phone warnings; a late answer for another asset is dropped (`assetIdRef`); a 409 `ASSET_TRANSFER_DEPARTMENT_LOCKED` or `ASSET_CHANGED_DURING_OPERATION` closes the review, reads the detail again and toasts.
- **P3-R16:** the chips are a `role="group"` of four `Button variant="outline" size="sm"` with `aria-pressed` and `data-transfer-reason-chip`, outside the pinned `<Field … id="transfer-reason">` + `<Input … required maxLength={500} />` pair; a chip writes "<full word>: " at the start (replacing another chip's prefix, keeping the rest) and focuses `#transfer-reason` with the caret at the end; อื่น ๆ never writes and is never pressed; on the phone ปรับโครงสร้างแผนก shows "ปรับโครงสร้าง"; past 500 characters `validate()` refuses under the field, nothing is cut.
- **P3-R17:** the table is a CSS grid in this file (no `<table>`); the heads row and the → cell are `aria-hidden`; three rows `data-transfer-row="location|holder|department"`; each ตอนนี้ cell `data-transfer-now` with a "ตอนนี้: " prefix that is sr-only from lg and visible below; the pickers keep "code - name", placeholder "ไม่เปลี่ยนแปลง", × and their labels ที่ตั้งปลายทาง / ผู้ถือครองปลายทาง / แผนกปลายทาง (visually hidden). Phone: row name, then "ตอนนี้: …", then the picker.
- **P3-R18 (with Y2, Y3):** the review keeps its title and confirm, lists real changes only ("code - name" for the room and the employee), a department line when the department changes (implicitly too), the components line (label "ส่วนควบ", value `transfer.summaryComponentsMove` "ย้ายตาม {count} รายการ"; the skeleton's "ส่วนควบย้ายตาม {count}" is superseded), the next status, the reason and the evidence line. Every line up to the next status is T5's `buildTransferReviewDetails`, whose last item is the status; the form adds only the reason.
- **P3-R19:** section 1 shows a local `TransferAssetCard` (photo, tag, `StatusBadge`, name) through `pickedBody`, placed after `onChange`; the card gets `photo` and `assetLabel`; the arrival banner takes checkout's shape (no `md:col-span-2` div).
- **P3-R21:** switching the asset keeps the picks; everything is recomputed from the new detail (T5); until it is ready the department row is disabled and the submit's re-read decides.
- **P3-R23:** on the phone the footer sits right under the chips and `#transfer-reason`; a chip's focus goes through `focusField`, which scrolls the field clear of the bar.

**Files:**
- Modify:
  - `src/app/[locale]/(dashboard)/asset-management/transfer/page.tsx` (the `Promise.all` only);
  - `src/components/asset-operations/transfer-form.tsx` (rewrite; HEAD has 252 lines);
  - `messages/th.json` and `messages/en.json`, only through `node scripts/messages-edit.mjs` with `<scratchpad>/tx-group/msg/p3-t6-messages.json`.
- Create: `tests/transfer-form-ui.test.ts`.
- Test (pins this task breaks, rewritten in this commit; Step 1 gives each new text):
  - `tests/operations-sweep-ui.test.ts:76-88` (the transfer lines `:79-81`; the bulk-move lines and the `<section|rounded-lg border|…` loop stay);
  - `tests/form-frames-ui.test.ts:101-106`;
  - `tests/asset-operation-confirmation-ui.test.ts:35-40` (`:39`, the inline submit Button; `:37-38` hold);
  - `tests/asset-operation-picker-forms.test.ts:29-40` (the page test) and `:55`, `:60` (the picker regex and the arrival banner);
  - `tests/e2e-transactions.test.ts`: the line `for (const page of ["transfer", "bulk-move"]) … getAssetOperationMasterOptions\(\)` (HEAD `:137`; moved 2 lines down by Task 3, which keeps `:136` and adds a sibling pin after it; start from T3's version of the file);
  - `tests/v-track2-o.test.ts:218-245` (the transfer test);
  - `tests/form-migration-guards.test.ts:60-61` (the frame's `STICKY_FOOTER_ROUTES` row gains `/th/asset-management/transfer`);
  - `tests/e2e-fixes.test.ts:173` (the import pin; the form imports `appendReturnTo` and `getOperationCancelHref` on one line, as checkout and checkin do, Y17).
- Checked and not broken (keep them green; the implementation below is written so they hold):
  - `tests/asset-operation-picker-forms.test.ts:56-59` (the exact re-ask lines: `if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)`, `buildAssetOperationSearchHref({ mode: "transfer", id: assetId, assignCustodian: true })`, `const cleared = transferAssetToClear(current, rechecked)`, the `assetClearedForCustodian` call) and `:72-78` (one `<FormContextBanner `, its condition);
  - `tests/asset-operation-confirmation-ui.test.ts:5-17, 37-38, 47-49` (the dialog and `buildOperationReviewSummary`; the exact Field/Input pair; no `closeLabel=`);
  - `tests/e2e-fixes.test.ts:174-176` (the `documentHref` line, the `router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)` line and the old push that must stay gone; `:173` is rewritten above);
  - `tests/e2e-cross-cutting.test.ts:230, 258`; `tests/e2e-transactions.test.ts:339-341`;
  - `tests/validation-guards.test.ts:28, 83` (one form; V2-V4: no required select here except the asset picker, which has `id` and `error`);
  - `tests/form-migration-guards.test.ts:93` (GF5 floor `[1, 1, 0]`: the reason `Input` keeps `required maxLength={500}`; Buttons do not count);
  - `tests/mobile-field-navigation.test.ts:48`; `tests/thai-glossary.test.ts`; `tests/messages-parity.test.ts`.
- **E2E:** not changed here. T7 rewrites `e2e/transactions/transfer.spec.ts`, `findings.spec.ts:39` and `field-errors.spec.ts:203,208`; until then they press "บันทึก", which this task removes. No E2E runs before T7 (header facts).

**Interfaces:**
- Consumes:
  - **T1** (`src/lib/transfer-rules.ts`): `type TransferDestinations = { toLocationId: string | null; toCustodianId: string | null; toDepartmentId: string | null }`; `hasTransferChange(destinations: TransferDestinations): boolean`.
  - **T2** (the route's answers this form reads):
    - 400 `VALIDATION_FAILED` with `fieldErrors.toLocationId: "transferDestinationRequired"` (nothing left after normalization);
    - 409 `ASSET_TRANSFER_DESTINATION_INACTIVE` with `fieldErrors` `toLocationId: "checkoutLocationInactive"`, `toCustodianId: "checkoutReceiverInactive"`, `toDepartmentId: "checkoutDepartmentInactive"` (any of them);
    - 409 `ASSET_TRANSFER_CONDITION_BLOCKED` with `fieldErrors.assetId: "transferConditionDamaged" | "transferConditionNonFunctional" | "transferConditionSalvage"`;
    - 409 `{ code: "ASSET_TRANSFER_DEPARTMENT_LOCKED" }` with no `fieldErrors`, and 409 `{ code: "ASSET_CHANGED_DURING_OPERATION" }`; both codes catalogued (`transferDepartmentLocked`, `assetChangedDuringOperation`).
  - **T3** (its Produces, verbatim; Y16):
    ```ts
    // src/lib/asset-operation-search-rules.ts
    export type AssetOperationChosenDetail = {
      /* today's fields, unchanged */
      holderId: string | null              // asset.custodianId
      holderActive: boolean | null         // the holder's Employee.isActive; null when there is no holder
      holderDepartmentId: string | null    // the holder's Employee.departmentId, read without isActive
      holderDepartmentName: string | null  // that department's name alone, active or not
      ownerBranchId: string                // asset.branchId; compare by id with a room's branchId
    }
    // assetOperationSearchDetailAssetSelect gains branchId: true and
    //   custodian: { select: { code: true, fullNameTh: true, isActive: true, departmentId: true, department: { select: { name: true } } } }
    // so AssetOperationSearchDetailAsset has branchId: string and
    //   custodian: { code: string; fullNameTh: string; isActive: boolean; departmentId: string; department: { name: string } } | null

    // src/lib/asset-operation-options.ts
    export type AssetOperationEmployeeDepartmentOption = AssetOperationEmployeePlainOption & { name: string; departmentName: string }
    export type AssetOperationLocationBranchOption = AssetOperationNamedOption & { branchId: string; branchName: string }
    export type AssetOperationMasterOptions<
      Employee extends AssetOperationEmployeePlainOption = AssetOperationEmployeePlainOption,
      Location extends AssetOperationNamedOption = AssetOperationNamedOption,
    > = { employees: Employee[]; departments: AssetOperationNamedOption[]; locations: Location[]; statuses: AssetOperationNamedOption[]; conditions: AssetOperationNamedOption[] }
    export async function getAssetOperationMasterOptions(options: { employeeDepartment: true; locationBranch: true; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions<AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption>>
    ```
    So the page's `getAssetOperationMasterOptions({ employeeDepartment: true, locationBranch: true })` answers `employees: AssetOperationEmployeeDepartmentOption[]`, `departments: AssetOperationNamedOption[]` and `locations: AssetOperationLocationBranchOption[]`, the three props of `TransferForm`.
  - **T4:** `SearchableSelect` props `currentValue?: string`, `currentMark?: string` (this task passes `tOperation("summaryNow")`, Y7), `labelVisuallyHidden?: boolean`; `OperationSummaryCard` prop `lead?: ReactNode` (`data-summary-lead`).
  - **T5** (`src/lib/transfer-form-rules.ts`), its Produces verbatim (Y1, Y16); `TransferWords` is the type this task's word object builds, field for field:
    ```ts
    // src/lib/transfer-form-rules.ts. Values only from ./asset-department-rule.ts, ./transfer-rules.ts, ./checkout-form-rules.ts,
    // ./asset-lifecycle-policy.ts and ./validation-rules.ts; types with `import type` or inline `type`; relative .ts paths only.
    export type TransferFormDestinations = { toLocationId: string; toCustodianId: string; toDepartmentId: string } // "" = ไม่เปลี่ยนแปลง
    export type TransferFormChoice = {
      row: AssetOperationSearchRow | null
      detail: CheckoutDetailState
      destinations: TransferFormDestinations
      employees: AssetOperationEmployeeDepartmentOption[]
      departments: AssetOperationNamedOption[]          // the page's options.departments (named: the card reads a free pick by name)
      locations: AssetOperationLocationBranchOption[]
    }
    export type TransferFormChange = {
      ready: boolean                                   // the row carries its detail and the read has not failed
      destinations: TransferDestinations               // normalized, a locked department dropped: what the payload sends
      departmentSource: TransferDepartmentSource | null // null when not ready
      departmentLocked: boolean                        // true also when not ready (no asset, detail not read yet, read failed)
      nextDepartmentId: string | null                  // null when not ready
      changed: { location: boolean; holder: boolean; department: boolean }   // department counts the implicit correction
      changedCount: number
      crossBranch: boolean
    }
    export type TransferSummaryRow = { key: "location" | "holder" | "department" | "status" | "components"; label: string; now: string; next: string; changed: boolean }
    export type TransferCheck = { key: "asset" | "change" | "reason"; label: string; done: boolean }
    export type TransferReviewDetail = { key: "location" | "holder" | "department" | "components" | "status"; label: string; value: string }
    export type TransferWords = {
      location: string; holder: string; department: string; status: string; components: string
      none: string
      kept: (value: string) => string
      formerHolder: (name: string) => string
      followsHolder: (department: string) => string
      departmentChooseAssetFirst: string               // the locked แผนก row's text while no asset is chosen (Y5)
      inUse: string; statusUnchanged: string
      count: (count: number) => string
      summaryComponentsMove: (count: number) => string
      summaryComponentsOutstanding: (count: number) => string
      summaryLead: (count: number, list: string) => string
      summaryHolderDepartmentKept: string
      summaryCrossBranch: (branch: string) => string
      footerDescription: (tag: string, changes: string) => string
      footerIncomplete: string
      checkAsset: string; checkChange: string; checkReason: string
      toLocation: string; toCustodian: string; toDepartment: string; nextStatus: string
      componentsMove: (count: number, list: string) => string
      componentsStaying: (list: string) => string
      componentsOutstanding: (count: number, list: string) => string
      outstandingLine: CheckoutOutstandingWords
    }
    export const TRANSFER_NOW_PENDING = "…"
    export const TRANSFER_REASON_CHIPS = ["branch", "user", "restructure", "other"] as const
    export type TransferReasonChip = (typeof TRANSFER_REASON_CHIPS)[number]
    export type TransferChipWords = Record<Exclude<TransferReasonChip, "other">, string>
    export function getTransferFormChange(choice: TransferFormChoice): TransferFormChange
    export function transferNowCells(choice: TransferFormChoice, words: TransferWords): { location: string; holder: string; department: string }
    export function transferDepartmentLockText(choice: TransferFormChoice, words: TransferWords): string | null   // followsHolder when ready and locked; departmentChooseAssetFirst with no asset; else null
    export function buildTransferSummaryRows(choice: TransferFormChoice, words: TransferWords): TransferSummaryRow[]
    export function buildTransferLead(choice: TransferFormChoice, words: TransferWords): string | null
    export function buildTransferChecklist(choice: TransferFormChoice, reason: string, words: TransferWords): TransferCheck[]
    export function buildTransferFooterLine(choice: TransferFormChoice, words: TransferWords): string
    export function transferWarningLines(choice: TransferFormChoice, words: TransferWords): string[]   // cross-branch only; the detail-failed notice stays a node in the form
    export function buildTransferReviewDetails(choice: TransferFormChoice, words: TransferWords): TransferReviewDetail[]
    export function transferComponentLines(choice: TransferFormChoice, words: TransferWords): { travelling: string | null; staying: string | null; outstanding: string | null }
    export function applyTransferReasonChip(text: string, chip: Exclude<TransferReasonChip, "other">, words: TransferChipWords): string
    export function pressedTransferReasonChip(text: string, words: TransferChipWords): TransferReasonChip | null
    ```
    What this task relies on in T5's change set (Y5; T5's tests pin each):
    - **Not ready** is no row, a row without `detail`, or `detail: "failed"`: `departmentLocked: true` and `destinations.toDepartmentId: null` (the department is locked and dropped), `destinations.toLocationId` and `toCustodianId` the picks passed through raw (`""` as null; nothing is compared), `departmentSource: null`, `nextDepartmentId: null`, nothing `changed`. So the แผนก row is disabled until an asset is chosen and its detail answers.
    - A re-read of the same asset in `"loading"` whose row still carries `detail` stays **ready**, so the card, the cells and the แผนก row do not flicker on ตรวจสอบและบันทึก (the submit's re-read) or ลองอีกครั้ง.
    - `transferDepartmentLockText` answers `words.departmentChooseAssetFirst` ("เลือกทรัพย์สินก่อน") when no asset is chosen, `followsHolder(<name>)` when ready and locked, and `null` otherwise (an asset whose detail is loading or failed, or a free department), so `placeholder={lockText ?? t("noChange")}` reads "ไม่เปลี่ยนแปลง" then.
    - With a ready detail, `departmentSource` comes from T1's `getTransferDepartmentSource` on the normalized ids: `"newHolder"` for a normalized new holder, `"free"` for ส่วนกลาง and ส่วนควบ whatever the holder.
    - The picker's `context.assignCustodian` (`Boolean(transferChange.destinations.toCustodianId)`) and the `dropsDepartment` rule (`departmentSource !== "free"`, Y9 and Y21) read these.
  - **Plan 1-2 parts:** `OperationFormFrame`, `OperationSummaryCard`, `getOperationCancelHref(locale, returnTo)`, `withCheckoutAssetDetail`, `type CheckoutDetailState` (`src/lib/checkout-form-rules.ts`; the component lines come from T5, so the form imports no other checkout rule, Y4), `focusField` (`src/lib/field-focus.ts`), `useMediaQuery`.
- Produces:
  ```ts
  // src/components/asset-operations/transfer-form.tsx
  export function TransferForm(props: {
    employees: AssetOperationEmployeeDepartmentOption[]
    departments: AssetOperationNamedOption[]
    locations: AssetOperationLocationBranchOption[]
    /** ?assetId=: the search's by-id answer with its detail, takeable or not (spec 6.4, §9.1). */
    initialAsset: AssetOperationSearchRow | null
    returnTo?: string
  })
  ```
  - **DOM hooks for T7** (besides today's `#transfer-asset`, `[data-asset-picked]`, `#transfer-to-location`, `#transfer-reason`, the `-error` ids, the dialog "ตรวจสอบก่อนโอนย้าย" / "ยืนยันโอนย้าย"):
    - `#transfer-to-custodian` and `#transfer-to-department` (the triggers; names start "ผู้ถือครองปลายทาง" / "แผนกปลายทาง"; a locked department is `disabled` and its name reads "แผนกปลายทาง ตามผู้ถือครอง: <name>"; with no asset chosen it is `disabled` and reads "แผนกปลายทาง เลือกทรัพย์สินก่อน", Y5);
    - `[data-transfer-table]`, `[data-transfer-row="location|holder|department"]`, each holding one `[data-transfer-now]`;
    - `[data-transfer-components]` (section 2), `[data-transfer-staying]` and `[data-transfer-outstanding]` (section 1);
    - `[data-transfer-reason-chips]` (`role="group"`, named "เหตุผลการโอนย้าย") with `[data-transfer-reason-chip="branch|user|restructure|other"]` (`aria-pressed`);
    - in `[data-slot="sticky-form-footer"]`: `[data-transfer-footer="desktop"]` (`max-lg:hidden`) and `[data-transfer-footer="phone"]` (`lg:hidden`);
    - `[data-transfer-phone-warnings]` (rendered only below lg);
    - the card: `[data-slot="operation-summary-card"]` with `[data-summary-lead]`, `[data-summary-row="location|holder|department|status|components"]`, `[data-summary-check="asset|change|reason"]`.
  - Message keys: listed in Step 3.

- [ ] **Step 1: Write the failing tests.**

  **1a. New file `tests/transfer-form-ui.test.ts`** (source pins, in the style of `tests/checkin-form-rules.test.ts:142-180`):
  ```ts
  import assert from "node:assert/strict"
  import { readFileSync } from "node:fs"
  import test from "node:test"

  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  const FORM = "src/components/asset-operations/transfer-form.tsx"
  const PAGE = "src/app/[locale]/(dashboard)/asset-management/transfer/page.tsx"
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>
  const has = (source: string, parts: string[]) => { for (const part of parts) assert.ok(source.includes(part), part) }
  const count = (source: string, text: string) => source.split(text).length - 1
  function at(source: string, text: string, from = 0) {
    const index = source.indexOf(text, from)
    assert.ok(index >= 0, text)
    return index
  }
  ```
  Then these tests:

  1. **"the page: the masters with the employees' own department and the rooms' branch, the preselect with its detail, after the permission (spec §9, P3-R9)"**
     - `has(page, [...])`: `'await requirePagePermission(locale, "asset", "edit")'`, `"const [options, initialAsset] = await Promise.all(["`, `"getAssetOperationMasterOptions({ employeeDepartment: true, locationBranch: true }),"`, `'getAssetOperationPreselect("transfer", filters.assetId, { detail: true }),'`, `"employees={options.employees}"`, `"departments={options.departments}"`, `"locations={options.locations}"`, `"initialAsset={initialAsset}"`, `"returnTo={filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined}"`.
     - `at(page, "await requirePagePermission(") < at(page, "await Promise.all([")`.
     - `assert.doesNotMatch(page, /employeeDetail|conditionsFor|canCreateRepair|hasPermission|maintenance/)` (no held count, no conditions, no repair link on โอนย้าย: P3-R1, P3-R9).

  2. **"the form: the form wraps the frame with no summary column on the phone; three sections; the card with its lead, photo, rows, checklist, warnings and footnote; the footer; the review after the form (spec §5, §9.1-§9.3, P3-R12, P3-R19)"**
     - `has(form, [...])`:
       - `'const TRANSFER_FORM_ID = "transfer-form"'`, `"<form onSubmit={handleSubmit} noValidate id={TRANSFER_FORM_ID}>"`;
       - `'import { appendReturnTo, getOperationCancelHref } from "@/lib/asset-return-navigation"'` (one line, as checkout and checkin, Y17), `"const cancelHref = getOperationCancelHref(locale, returnTo)"`;
       - `"summary={<OperationSummaryCard"`, `'title={tOperation("summaryTitle")}'`, `'nowLabel={tOperation("summaryNow")}'`, `'nextLabel={tOperation("summaryNext")}'`, `"lead={transferLead}"`, `"rows={summaryRows}"`, `"checklist={checklist}"`, `"warnings={summaryWarnings}"`, `'footnote={t("summaryFootnote")}'`;
       - `"photo={values.asset ? <AssetThumbnail photo={values.asset.photo} assetTag={values.asset.assetTag} assetName={values.asset.name} size={64} /> : undefined}"`, `"assetLabel={values.asset ? assetOperationRowLabel(values.asset) : undefined}"`;
       - `"const summaryRows = buildTransferSummaryRows(transferChoice, transferWords)"`, `"const checklist = buildTransferChecklist(transferChoice, values.reason, transferWords)"`, `"const transferLead = buildTransferLead(transferChoice, transferWords)"`, `"const footerLine = buildTransferFooterLine(transferChoice, transferWords)"`;
       - `"cancelHref,"`, `'cancelLabel: tCommon("cancel"),'`, `'submitLabel: tOperation("reviewAndSave"),'`, `"busy: saving || readingForSubmit,"`, `"formId: TRANSFER_FORM_ID,"`;
       - `"pickedBody={(row) => <TransferAssetCard row={row} />}"`, `"function TransferAssetCard({ row }: { row: AssetOperationSearchRow }) {"`, `"<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />"`, `"<AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} />"`;
       - `'title={t("reviewTitle")}'`, `'confirmLabel={t("reviewConfirm")}'`, `"items={reviewItems}"`, `"onConfirm={() => void submitTransfer()}"`, `'toast.success(t("success"))'`;
       - `"const transferWords: TransferWords = {"`, and the word lines whose key, namespace or arity a slip could change (T5's field names and arities, Y1; Y5; Y6): `'formerHolder: (name) => tAll("checkin.returnByFormer", { name }),'`, `'departmentChooseAssetFirst: t("departmentChooseAssetFirst"),'`, `'inUse: t("inUseStatus"),'`, `'statusUnchanged: t("statusUnchanged"),'`, `'summaryComponentsMove: (count) => t("summaryComponentsMove", { count }),'`, `'summaryComponentsOutstanding: (count) => tAll("checkout.summaryComponentsOutstanding", { count }),'`, `'checkAsset: t("asset"),'`, `'checkReason: t("sectionReason"),'`, `'nextStatus: t("reviewNextStatus"),'`, `'componentsMove: (count, list) => t("componentsMove", { count, list }),'`, `'componentsStaying: (list) => t("componentsStaying", { list }),'`, `'componentsOutstanding: (count, list) => t("componentsOutstanding", { count, list }),'`, `'outstandingLine: { with: (holder) => tAll("checkout.outstandingWith", { holder }), since: (documentNo) => tAll("checkout.outstandingSince", { documentNo }) },'`.
     - `assert.doesNotMatch(form, /nowPending|\bpending: |statusKept: |leadKept: |currentMark"\)|"detailReadFailed"\)|t\("summaryComponentsOutstanding"/)` (no word T5's type does not have, and no key the rulings dropped: Y1, Y6, Y7).
     - `assert.match(form, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}\n\s+summaryOnPhone=\{false\}\n\s+summary=\{<OperationSummaryCard\n/)`.
     - `at(form, "<form onSubmit=") < at(form, "<OperationFormFrame")`, `at(form, "</OperationFormFrame>") < at(form, "</form>")`, `at(form, "</form>") < at(form, "<OperationReviewDialog")` (the form wraps the frame; the review follows the form).
     - Order, each `<` the next: `"<FormSection number={1}"`, `'id="transfer-asset"'`, `"<FormSection number={2}"`, `"data-transfer-table"`, `"data-transfer-components"`, `"<FormSection number={3}"`, `"data-transfer-reason-chips"`, `'id="transfer-reason"'`, `"<Textarea"`.
     - `assert.doesNotMatch(form, /<PageHeader\b|<ContentPanel\b|<StickyFormFooter\b|phoneSteps|tCommon\("save"\)|<Save\b|pickBlocked|canCreateRepair|<table\b|<thead\b|<tr\b|<Segmented\b|<ChoiceChip\b|from "next\/link"/)`.

  3. **"section 1 and 2: the asset card, the components with their own handover and the outstanding ones in section 1; the heads, three rows with a ตอนนี้ cell, an arrow and a picker with a hidden label and the current value marked; the department follows the holder; the travelling line (spec §9.1, §9.2, §9.4, P3-R5, P3-R11, P3-R14, P3-R17)"**
     - `has(form, [...])`:
       - `'const TRANSFER_ROW_CLASSES = "grid min-w-0 gap-1.5 lg:grid-cols-[8rem_minmax(0,1fr)_1rem_minmax(0,1fr)] lg:items-start lg:gap-3"'`;
       - `'<div data-transfer-table className="grid gap-4 lg:gap-3">'`;
       - `'<div aria-hidden="true" className={cn(TRANSFER_ROW_CLASSES, "text-meta text-muted-foreground max-lg:hidden")}>'`, `'<span>{t("columnItem")}</span>'`, `'<span>{t("columnNow")}</span>'`, `'<span>{t("columnTarget")}</span>'`;
       - `"const nowCells = transferNowCells(transferChoice, transferWords)"`, `"const lockText = transferDepartmentLockText(transferChoice, transferWords)"` (Y5);
       - the three pickers, each one line, exactly (the current mark is the card's `summaryNow`, Y7):
         - `'<SearchableSelect id="transfer-to-location" label={t("toLocation")} labelVisuallyHidden value={values.toLocationId} options={locations} currentValue={values.asset?.currentLocationId} currentMark={tOperation("summaryNow")} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toLocationId")} onChange={(value) => setField("toLocationId", value)} />'`
         - `'<SearchableSelect id="transfer-to-custodian" label={t("toCustodian")} labelVisuallyHidden value={values.toCustodianId} options={employees} currentValue={values.asset?.detail?.holderId ?? undefined} currentMark={tOperation("summaryNow")} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toCustodianId")} onChange={(value) => setField("toCustodianId", value)} />'`
         - `'<SearchableSelect id="transfer-to-department" label={t("toDepartment")} labelVisuallyHidden value={transferChange.departmentLocked ? "" : values.toDepartmentId} options={departments} currentValue={values.asset?.detail?.departmentId ?? undefined} currentMark={tOperation("summaryNow")} disabled={transferChange.departmentLocked} placeholder={lockText ?? t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toDepartmentId")} onChange={(value) => setField("toDepartmentId", value)} />'`
       - the component lines are T5's (Y4): `"const componentLines = transferComponentLines(transferChoice, transferWords)"`;
       - `'{componentLines.staying ? <Notice tone="info" data-transfer-staying>{componentLines.staying}</Notice> : null}'`;
       - `'{componentLines.outstanding ? <Notice tone="warning" role="status" data-transfer-outstanding>{componentLines.outstanding}</Notice> : null}'`;
       - `'{componentLines.travelling ? <p data-transfer-components className="text-sm text-muted-foreground">{componentLines.travelling}</p> : null}'`.
     - `assert.doesNotMatch(form, /checkoutComponents|checkoutOutstandingComponents|checkoutOutstandingLines/)` (the form builds no component text of its own; T5's `transferComponentLines` is the one source, Y4).
     - Each row, by a regex built in the test:
       ```ts
       const row = (key: string, label: string, id: string) => new RegExp(
         `<div data-transfer-row="${key}" className=\\{TRANSFER_ROW_CLASSES\\}>\\n\\s+` +
         `<span className="text-sm font-medium text-foreground lg:pt-2">\\{tOperation\\("${label}"\\)\\}</span>\\n\\s+` +
         `<p data-transfer-now className="min-w-0 break-words text-sm text-foreground lg:pt-2"><span className="text-muted-foreground lg:sr-only">\\{t\\("columnNow"\\)\\}: </span>\\{nowCells\\.${key}\\}</p>\\n\\s+` +
         `<ArrowRight aria-hidden="true" className="size-4 text-muted-foreground max-lg:hidden lg:mt-2\\.5" />\\n\\s+` +
         `<SearchableSelect id="${id}" `,
       )
       assert.match(form, row("location", "summaryLocation", "transfer-to-location"))
       assert.match(form, row("holder", "summaryHolder", "transfer-to-custodian"))
       assert.match(form, row("department", "summaryDepartment", "transfer-to-department"))
       ```
     - `count(form, "data-transfer-row=") === 3`, `count(form, "<p data-transfer-now ") === 3`, `count(form, "<ArrowRight ") === 3`; and `at(form, 'data-transfer-row="location"') < at(form, 'data-transfer-row="holder"') < at(form, 'data-transfer-row="department"')`.
     - Section 1 holds the two Notices: `at(form, "<FormSection number={1}") < at(form, "data-transfer-staying") < at(form, "data-transfer-outstanding") < at(form, "<FormSection number={2}")`.
     - The arrival banner, checkout's shape: `assert.match(form, /\{initialAsset\?\.eligible && values\.asset\?\.id === initialAsset\.id \? \(\n\s+<FormContextBanner label=\{t\("asset"\)\} value=\{assetOperationRowLabel\(initialAsset\)\} \/>/)` and `assert.doesNotMatch(form, /md:col-span-2/)`.

  4. **"one change set: the picker's context, validate(), the payload and the review read getTransferFormChange; a holder the department follows drops a picked department, and clearing the holder brings nothing back; the review's status is T5's last line (P3-R4, P3-R5, P3-R18, P3-R21, Review Focus 3; Y2, Y9)"**
     - `assert.match(form, /const transferChoice: TransferFormChoice = \{\n\s+row: values\.asset,\n\s+detail: assetDetail,\n\s+destinations: \{ toLocationId: values\.toLocationId, toCustodianId: values\.toCustodianId, toDepartmentId: values\.toDepartmentId \},\n\s+employees,\n\s+departments,\n\s+locations,\n\s+\}\n\s+const transferChange = getTransferFormChange\(transferChoice\)\n/)`.
     - `has(form, [...])`: `"context={{ assignCustodian: Boolean(transferChange.destinations.toCustodianId) }}"`, `"body: JSON.stringify({ ...transferChange.destinations, reason: values.reason, remark: values.remark }),"`, `'check("toLocationId", hasTransferChange(change.destinations) ? null : "transferDestinationRequired")'`, `"const transferReviewDetails = buildTransferReviewDetails(transferChoice, transferWords)"`, `'details: [...transferReviewDetails, { key: "reason", label: t("reason"), value: values.reason }],'`, `'evidenceLabel: t("reviewNoEvidence"),'`.
     - `assert.doesNotMatch(form, /values\.to(?:Location|Custodian|Department)Id \|\| null|destinationLabels:|nextStatusLabel:|values\.toCustodianId \? t\("inUseStatus"\)|statusNext|key: "nextStatus"/)` (no raw pick reaches the payload or the review, and the review has one status line, T5's last detail: Y2).
     - The clear path: `const setField = form.slice(at(form, "function setField(field: string, value: string) {"), at(form, "function setAsset("))`, then `has(setField, [...])`:
       - `'if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")'`;
       - `'if (field !== "toLocationId" && field in FIELD_IDS) fieldErrors.clear(field as TransferField)'`;
       - `'const dropsDepartment = field === "toCustodianId" && value !== "" && getTransferFormChange({ ...transferChoice, destinations: { ...transferChoice.destinations, toCustodianId: value } }).departmentSource !== "free"'` (Y9, Y21: a ready ส่วนกลาง or ส่วนควบ stays free and keeps its pick; a holder picked while the detail is not ready clears it);
       - `'if (dropsDepartment) fieldErrors.clear("toDepartmentId")'`;
       - `'setValues((current) => ({ ...current, [field]: value, ...(dropsDepartment ? { toDepartmentId: "" } : {}) }))'`;
       - `'if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)'`.
     - `assert.equal(count(form, 'toDepartmentId: ""'), 2, "the initial value and the drop: nothing puts a cleared department back")`.

  5. **"the detail: read at the pick and again on submit with the holder the save sends; a failed read keeps the review shut with ลองอีกครั้ง; a late answer is dropped; the two 409s close the review, read again and toast (P3-R15, Review Focus 5)"**
     - `has(form, [...])`:
       - `'const [assetDetail, setAssetDetail] = useState<CheckoutDetailState>(initialAsset && !initialAsset.detail ? "failed" : "ready")'`, `"const assetIdRef = useRef(initialAsset?.id ?? null)"`, `"const [readingForSubmit, setReadingForSubmit] = useState(false)"`;
       - `"async function loadAssetDetail(assetId: string, assignCustodian: boolean): Promise<AssetOperationSearchRow | null> {"`;
       - `'const response = await fetch(buildAssetOperationSearchHref({ mode: "transfer", id: assetId, detail: true, assignCustodian })).catch(() => null)'`;
       - `"if (assetIdRef.current !== assetId) return null"`, `"setValues((current) => ({ ...current, asset: withCheckoutAssetDetail(current.asset, answered) }))"`, `'setAssetDetail(answered ? "ready" : "failed")'`;
       - in `setAsset`: `"assetIdRef.current = asset?.id ?? null"`, `'setAssetDetail(asset && !asset.detail ? "loading" : "ready")'`, `"if (asset && !asset.detail) void loadAssetDetail(asset.id, Boolean(values.toCustodianId))"`;
       - `'const detailFailedNotice = values.asset && assetDetail === "failed" ? ('`, `'<span>{tAll("checkout.detailReadFailed")}</span>'` (ส่งมอบ's word, no new key: Y7), `'{tCommon("tryAgain")}'`, `"onClick={() => values.asset && void loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId))}"`;
       - `"const summaryWarnings = [...transferWarningLines(transferChoice, transferWords), ...(detailFailedNotice ? [detailFailedNotice] : [])]"`.
     - The submit's order: `const submit = form.slice(at(form, "async function handleSubmit("), at(form, "const detailFailedNotice ="))`, then each found after the previous one: `"if (readingForSubmit) return"`, `"fieldErrors.setErrors(validate(values, transferChange))"`, `"if (focusFirstError()) return"`, `"if (!values.asset) return"`, `"setReadingForSubmit(true)"`, `"const answered = await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId)).finally(() => setReadingForSubmit(false))"`, `"if (!answered) return"`, `'fieldErrors.setErrors(validate({ ...values, asset: answered }, getTransferFormChange({ ...transferChoice, row: answered, detail: "ready" })))'`, `"if (focusFirstError()) return"`, `"setReviewOpen(true)"`; and `count(submit, "setReviewOpen(true)") === 1`.
     - The 409s: `const start = at(form, "async function submitTransfer(")`, `const save = form.slice(start, at(form, "\n  return (\n", start))`, then in order: `"if (fieldErrors.applyServer(payload) && focusFirstError()) return"`, `'if (payload?.code === "ASSET_TRANSFER_DEPARTMENT_LOCKED" || payload?.code === "ASSET_CHANGED_DURING_OPERATION") {'`, `"setReviewOpen(false)"`, `"if (values.asset) await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId))"`, `'throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))'`; and `save.includes("apiError.toast(error)")`.

  6. **"section 3: the reason chips write their word at the start and focus the text; อื่น ๆ only focuses; the reason field and หมายเหตุ as before (spec §9.3, §9.4, P3-R16)"**
     - `has(form, [...])`:
       - `'const chipWords: TransferChipWords = { branch: t("reasonChipBranch"), user: t("reasonChipUser"), restructure: t("reasonChipRestructure") }'`;
       - `"const pressedChip = pressedTransferReasonChip(values.reason, chipWords)"`;
       - `'const TRANSFER_CHIP_PRESSED_CLASSES = "border-primary bg-primary-soft font-semibold text-primary-hover hover:bg-primary-soft"'`;
       - `'<div role="group" aria-label={t("reason")} aria-describedby="transfer-reason-chips-hint" data-transfer-reason-chips className="grid gap-2">'`;
       - `"{TRANSFER_REASON_CHIPS.map((chip) => ("`, `'{pressedChip === chip ? <Check aria-hidden="true" /> : null}'`;
       - `'<span className="lg:hidden">{t("reasonChipRestructureShort")}</span>'`, `'<span className="max-lg:hidden">{chipWords.restructure}</span>'`, `'chip === "other" ? t("reasonChipOther") : chipWords[chip]'`;
       - `'<p id="transfer-reason-chips-hint" className="text-meta text-muted-foreground">{t("reasonChipHint")}</p>'`;
       - `'if (chip !== "other") setField("reason", applyTransferReasonChip(values.reason, chip, chipWords))'`, `"const input = document.getElementById(FIELD_IDS.reason)"`, `"if (!(input instanceof HTMLInputElement)) return"`, `"focusField(input)"`, `"input.setSelectionRange(input.value.length, input.value.length)"`;
       - `'<Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />'`.
     - `assert.match(form, /<Button\n\s+key=\{chip\}\n\s+variant="outline"\n\s+size="sm"\n\s+aria-pressed=\{pressedChip === chip\}\n\s+data-transfer-reason-chip=\{chip\}\n\s+className=\{cn\(pressedChip === chip && TRANSFER_CHIP_PRESSED_CLASSES\)\}\n\s+onClick=\{\(\) => chooseReasonChip\(chip\)\}\n\s+>/)`.
     - Outside the pinned pair: `const group = form.slice(at(form, "data-transfer-reason-chips"), at(form, '<Field label={t("reason")} id="transfer-reason"'))` is not empty and `assert.doesNotMatch(group, /<Input\b|id="transfer-reason"/)`.
     - `assert.doesNotMatch(form, /\.slice\(0, 500\)|\.substring\(0, 500\)/)` (nothing is cut; `validate()` refuses past 500).

  7. **"the phone: the footer's line is the lead, and the card's warnings show above the bar below lg only (spec §9.4, P3-R12, P3-R13, P3-R23)"**
     - `has(form, ['const isDesktop = useMediaQuery("(min-width: 64rem)")'])`.
     - `assert.match(form, /description: \(\n\s+<>\n\s+<span data-transfer-footer="desktop" className="max-lg:hidden">\{footerLine\}<\/span>\n\s+<span data-transfer-footer="phone" className="lg:hidden">\{transferLead \?\? footerLine\}<\/span>\n\s+<\/>\n\s+\),/)`.
     - `assert.match(form, /\{!isDesktop && summaryWarnings\.length > 0 \? \(\n\s+<div data-transfer-phone-warnings className="grid gap-2 lg:hidden">\n\s+\{summaryWarnings\.map\(\(warning, index\) => \(\n\s+<Notice key=\{index\} tone="warning">[\s\S]*?\) : null\}\n\s+<\/OperationFormFrame>/)` (the frame's last child, as รับคืน's).
     - `assert.equal(count(form, "isDesktop"), 2, "the media query serves only the warnings block")`.

  8. **"the words: the new transfer keys in Thai and English, and none of the keys the rulings reuse instead (spec §9, §13; Y1, Y6, Y7)"**: for every key of Step 3's change file, `assert.equal(messages("th")[ns][name], <th>)` and `assert.equal(messages("en")[ns][name], <en>)` with the exact values of Step 3 (27 keys); then, for both locales, `assert.equal(messages(locale).transfer.nowPending, undefined)`, `assert.equal(messages(locale).transfer.summaryComponentsOutstanding, undefined)`, `assert.equal(messages(locale).transfer.detailReadFailed, undefined)` and `assert.equal(messages(locale).assetOperation.currentMark, undefined)` (the "…" is T5's `TRANSFER_NOW_PENDING`; the other three read `checkout.summaryComponentsOutstanding`, `checkout.detailReadFailed` and `assetOperation.summaryNow`).

  **1b. Rewrites of the pins this task breaks** (each in its file, same commit):
  - `tests/operations-sweep-ui.test.ts:76-88`: retitle the test "check-out and transfer forms are the operation frame's numbered sections, and the bulk move's form panel is a ContentPanel whose empty answer is the picker's (spec 2D D9, M21, M25; server search Task 7; group 3 plan 3 Task 6)". Replace `:80-81` with:
    ```ts
    assert.match(transfer, /<form onSubmit=\{handleSubmit\} noValidate id=\{TRANSFER_FORM_ID\}>\n\s+<OperationFormFrame\n/)
    assert.match(transfer, /<FormSection number=\{1\} title=\{t\("sectionAsset"\)\}>/)
    assert.match(transfer, /<FormSection number=\{2\} title=\{<>\{t\("sectionChanges"\)\} <span className="font-normal text-muted-foreground">\{t\("sectionChangesHint"\)\}<\/span><\/>\}>/)
    assert.match(transfer, /<FormSection number=\{3\} title=\{t\("sectionReason"\)\}>/)
    assert.match(transfer, /<\/form>\n\s+<OperationReviewDialog\n/, "the review dialog follows the form, as on ส่งมอบ and รับคืน")
    assert.doesNotMatch(transfer, /<ContentPanel\b/)
    ```
    The bulk-move lines and the `for … of [["checkout", checkout], ["transfer", transfer], ["bulk move", bulkMove]]` loop stay.
  - `tests/form-frames-ui.test.ts:101-106` becomes:
    ```ts
    test("the transfer form is the operation frame (group 3 plan 3 Task 6)", () => {
      const source = read(`${C}asset-operations/transfer-form.tsx`)
      assert.ok(source.includes('import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"'), "transfer-form.tsx imports OperationFormFrame")
      assert.match(source, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}\n\s+summaryOnPhone=\{false\}\n/)
      assert.doesNotMatch(source, /<h1\b|PageBackLink|PageHeader|ContentPanel/, "the operation forms keep having no back button (B2)")
    })
    ```
  - `tests/asset-operation-confirmation-ui.test.ts:35-40`: retitle "the transfer form uses the shared fields, and its submit is the frame's footer (2C batch 1b; group 3 plan 3 Task 6)"; keep `:37-38`; replace `:39` with `assert.ok(source.includes('submitLabel: tOperation("reviewAndSave"),'))` and `assert.doesNotMatch(source, /type="submit"|<Save\b|tCommon\("save"\)/)`.
  - `tests/asset-operation-picker-forms.test.ts:29-40` becomes:
    ```ts
    test("the four pages load the master lists; ส่งมอบ and โอนย้าย start from the by-id answer with its detail, asked after the permission (spec §3, 6.4; group 3 P3-R9)", () => {
      for (const [page, call, masters] of [
        ["checkout", 'getAssetOperationPreselect("checkout", filters.assetId, { detail: true })', 'getAssetOperationMasterOptions({ employeeDetail: true, conditionsFor: "checkout" })'],
        ["transfer", 'getAssetOperationPreselect("transfer", filters.assetId, { detail: true })', "getAssetOperationMasterOptions({ employeeDepartment: true, locationBranch: true })"],
      ]) {
        const source = read(`${P}${page}/page.tsx`)
        const permission = source.indexOf('await requirePagePermission(locale, "asset", "edit")')
        assert.ok(permission >= 0 && permission < source.indexOf(call), page)
        // ส่งมอบ alone reads the employees' detail and held count (final review M4); โอนย้าย reads their own department and the rooms' branch (P3-R9).
        assert.ok(source.includes(masters) && source.includes("initialAsset={initialAsset}"), page)
        assert.doesNotMatch(source, /getAssetOperationAssetLists|initialAssetId|assets=/, page)
      }
      assert.doesNotMatch(read(`${P}transfer/page.tsx`), /employeeDetail/, "โอนย้าย never runs the held-count groupBy (P3-R9)")
      for (const page of ["checkout", "checkin", "transfer", "bulk-move"]) assert.doesNotMatch(read(`${P}${page}/page.tsx`), /getAssetOperationOptions\(/, page)
    })
    ```
  - `tests/asset-operation-picker-forms.test.ts:55` becomes `assert.match(source, /<AssetOperationPicker\n\s+id="transfer-asset"\n\s+label=\{t\("asset"\)\}\n\s+mode="transfer"\n\s+context=\{\{ assignCustodian: Boolean\(transferChange\.destinations\.toCustodianId\) \}\}\n\s+value=\{values\.asset\}\n\s+required\n\s+error=\{assetError\}\n\s+onChange=\{setAsset\}\n\s+pickedBody=\{\(row\) => <TransferAssetCard row=\{row\} \/>\}\n\s+\/>/)` (the context reads the normalized holder, GP X2). `:60` becomes `assert.match(source, /\{initialAsset\?\.eligible && values\.asset\?\.id === initialAsset\.id \? \(\n\s+<FormContextBanner label=\{t\("asset"\)\} value=\{assetOperationRowLabel\(initialAsset\)\} \/>/)` (checkout's shape, `:48`). `:56-59` and `:61-69` stay.
  - `tests/e2e-transactions.test.ts`: the line `for (const page of ["transfer", "bulk-move"]) … getAssetOperationMasterOptions\(\)` (HEAD `:137`; moved 2 lines down by Task 3) becomes two lines:
    ```ts
    assert.match(read("src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx"), /getAssetOperationMasterOptions\(\)/, "bulk-move")
    assert.match(read("src/app/[locale]/(dashboard)/asset-management/transfer/page.tsx"), /getAssetOperationMasterOptions\(\{ employeeDepartment: true, locationBranch: true \}\)/, "โอนย้าย reads the employees' own department and the rooms' branch (group 3 plan 3 P3-R9)")
    ```
  - `tests/v-track2-o.test.ts:218-245` becomes (the helper `assertOperationForm`, `validateBody` and `messagesOf` are unchanged):
    ```ts
    test("transfer: errors under the field, the at-least-one change under the location with the server's code, the holder's and the department's own refusals under them, and a refusal from the review back on its field (v-track O4; group 3 plan 3 P3-R4, P3-R6)", () => {
      const source = read(`${C}asset-operations/transfer-form.tsx`)
      const ids = { assetId: "transfer-asset", toLocationId: "transfer-to-location", toCustodianId: "transfer-to-custodian", toDepartmentId: "transfer-to-department", reason: "transfer-reason" }
      assertOperationForm(source, { ids })
      assert.match(source, /^function validate\(values: TransferFormValues, change: TransferFormChange\): Partial<Record<TransferField, string>> \{$/m)
      const rules = validateBody(source)
      for (const rule of [
        'check("assetId", required(values.asset) ?? (values.asset?.eligible === false ? "invalid" : null))',
        'check("toLocationId", hasTransferChange(change.destinations) ? null : "transferDestinationRequired")',
        'check("reason", required(values.reason) ?? maxLength(values.reason, 500))',
      ]) assert.ok(rules.includes(rule), rule)
      // The at-least-one rule counts real changes (P3-R4), never the picks.
      assert.doesNotMatch(source, /atLeastOne\(/)
      for (const key of ["toLocationId", "toCustodianId", "toDepartmentId", "reason"]) assert.ok(source.includes(`error={fieldErrors.message("${key}")}`), key)
      // The asset's error is its reason, the cleared-for-custodian line or the field's code, in that order (server search Task 5).
      assert.ok(source.includes("error={assetError}"))
      assert.match(source, /<AssetOperationPicker\n\s+id="transfer-asset"\n\s+label=\{t\("asset"\)\}\n[\s\S]*?error=\{assetError\}/)
      // Each destination picker is one line with its id, its hidden label and its error (P3-R6, P3-R17).
      assert.match(source, /<SearchableSelect id="transfer-to-location" label=\{t\("toLocation"\)\} labelVisuallyHidden [^\n]*error=\{fieldErrors\.message\("toLocationId"\)\}/)
      assert.match(source, /<SearchableSelect id="transfer-to-custodian" label=\{t\("toCustodian"\)\} labelVisuallyHidden [^\n]*error=\{fieldErrors\.message\("toCustodianId"\)\}/)
      assert.match(source, /<SearchableSelect id="transfer-to-department" label=\{t\("toDepartment"\)\} labelVisuallyHidden [^\n]*error=\{fieldErrors\.message\("toDepartmentId"\)\}/)
      assert.match(source, /<Field label=\{t\("reason"\)\} id="transfer-reason" required error=\{fieldErrors\.message\("reason"\)\}>/)
      // The three destinations are one rule: a change of any clears it (spec §4.3); a holder's or a department's own refusal clears with its field.
      assert.ok(source.includes('if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")'))
      assert.ok(source.includes('if (field !== "toLocationId" && field in FIELD_IDS) fieldErrors.clear(field as TransferField)'))
      // A refusal from the review closes it, and the field takes focus once the dialog has gone (O-R1).
      assert.match(source, /const closed = waitForDialogToClose\(\)\n\s+setReviewOpen\(false\)\n\s+await closed\n/)
      assert.ok(source.includes("fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
      assert.doesNotMatch(source, /destinationRequired"\)/)
      for (const locale of ["th", "en"]) {
        assert.equal(messagesOf(locale).transfer.destinationRequired, undefined, `${locale}.transfer.destinationRequired has no reader and is removed`)
      }
    })
    ```
  - `tests/form-migration-guards.test.ts:60-61` become:
    ```ts
      // Group 3: the frame of ส่งมอบ, รับคืน and โอนย้าย (plan 2 added /th/asset-management/checkin, plan 3 Task 6 /th/asset-management/transfer).
      [`${C}asset-operations/operation-form-frame.tsx`]: ["/th/asset-management/checkout", "/th/asset-management/checkin", "/th/asset-management/transfer"],
    ```
    (`transfer-form.tsx` renders no `StickyFormFooter` of its own, so it gets no row.)
  - `tests/e2e-fixes.test.ts:173` becomes (Y17; the test's other lines stay):
    ```ts
      assert.match(form, /import \{ appendReturnTo(?:, getOperationCancelHref)? \} from "@\/lib\/asset-return-navigation"/)
    ```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/transfer-form-ui.test.ts tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/asset-operation-confirmation-ui.test.ts tests/asset-operation-picker-forms.test.ts tests/e2e-transactions.test.ts tests/v-track2-o.test.ts tests/form-migration-guards.test.ts tests/e2e-fixes.test.ts`. Expected: every test of `tests/transfer-form-ui.test.ts` fails (no frame, no table, no chips, no new words); the rewritten tests fail on HEAD's ContentPanel form, its three FIELD_IDS, its presence-based `atLeastOne` and the page's plain `getAssetOperationMasterOptions()`. `form-migration-guards` passes already (the frame's row may list a route before the form uses it; the route is a focus route), and so does `e2e-fixes` (its rewritten pin accepts HEAD's one-name import too).

- [ ] **Step 3: Implement.**

  **3a. Words.** Save `<scratchpad>/tx-group/msg/p3-t6-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/tx-group/msg/p3-t6-messages.json`. Expected output: `messages updated: 27 th, 27 en, 0 deleted`. This file is the only source of the plan's message values (Y6); T5's words table names these keys.
  ```json
  { "set": {
    "th": {
      "transfer.description": "เปลี่ยนที่ตั้ง ผู้ถือครอง หรือแผนกของทรัพย์สิน 1 รายการ เลือกเปลี่ยนเฉพาะสิ่งที่ต้องการ",
      "transfer.sectionAsset": "ทรัพย์สิน",
      "transfer.sectionChanges": "เปลี่ยนอะไร",
      "transfer.sectionChangesHint": "เลือกอย่างน้อย 1 อย่าง",
      "transfer.sectionReason": "เหตุผล",
      "transfer.columnItem": "รายการ",
      "transfer.columnNow": "ตอนนี้",
      "transfer.columnTarget": "ปลายทาง",
      "transfer.followsHolder": "ตามผู้ถือครอง: {department}",
      "transfer.departmentChooseAssetFirst": "เลือกทรัพย์สินก่อน",
      "transfer.componentsMove": "ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย",
      "transfer.componentsStaying": "ส่วนควบที่มีใบส่งมอบของตัวเองไม่ย้ายตาม: {list}",
      "transfer.componentsOutstanding": "ส่วนควบค้างคืน {count} รายการ ไม่ย้ายตาม: {list}",
      "transfer.reasonChipBranch": "ย้ายสาขา",
      "transfer.reasonChipUser": "เปลี่ยนผู้ใช้งาน",
      "transfer.reasonChipRestructure": "ปรับโครงสร้างแผนก",
      "transfer.reasonChipRestructureShort": "ปรับโครงสร้าง",
      "transfer.reasonChipOther": "อื่น ๆ",
      "transfer.reasonChipHint": "กดปุ่มเพื่อเติมข้อความตั้งต้น แล้วแก้ต่อได้",
      "transfer.summaryLead": "เปลี่ยน {count} อย่าง: {list}",
      "transfer.summaryHolderDepartmentKept": "ผู้ถือครองและแผนกคงเดิม",
      "transfer.summaryComponentsMove": "ย้ายตาม {count} รายการ",
      "transfer.summaryCrossBranch": "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ {branch} ตามเดิม",
      "transfer.summaryFootnote": "เลขเอกสารโอนย้ายออกให้หลังบันทึก แล้วเปิดเอกสารให้พิมพ์ทันที",
      "transfer.footerDescription": "โอนย้าย {tag}: {changes}",
      "transfer.footerIncomplete": "เลือกทรัพย์สินและสิ่งที่จะเปลี่ยน",
      "transfer.checkChange": "เปลี่ยนอย่างน้อย 1 อย่าง"
    },
    "en": {
      "transfer.description": "Change the location, holder or department of one asset. Change only what you need.",
      "transfer.sectionAsset": "Asset",
      "transfer.sectionChanges": "What changes",
      "transfer.sectionChangesHint": "Choose at least one",
      "transfer.sectionReason": "Reason",
      "transfer.columnItem": "Item",
      "transfer.columnNow": "Now",
      "transfer.columnTarget": "Destination",
      "transfer.followsHolder": "Follows the holder: {department}",
      "transfer.departmentChooseAssetFirst": "Choose the asset first",
      "transfer.componentsMove": "{count, plural, one {# component ({list}) moves with it} other {# components ({list}) move with it}}",
      "transfer.componentsStaying": "Components with their own handover do not move: {list}",
      "transfer.componentsOutstanding": "{count, plural, one {# outstanding component does not move: {list}} other {# outstanding components do not move: {list}}}",
      "transfer.reasonChipBranch": "Branch move",
      "transfer.reasonChipUser": "New user",
      "transfer.reasonChipRestructure": "Department restructure",
      "transfer.reasonChipRestructureShort": "Restructure",
      "transfer.reasonChipOther": "Other",
      "transfer.reasonChipHint": "Press a button to start the text, then edit it",
      "transfer.summaryLead": "{count, plural, one {# change} other {# changes}}: {list}",
      "transfer.summaryHolderDepartmentKept": "Holder and department unchanged",
      "transfer.summaryComponentsMove": "{count, plural, one {# moves with it} other {# move with it}}",
      "transfer.summaryCrossBranch": "Moving to another branch: the asset code stays with {branch}",
      "transfer.summaryFootnote": "The transfer document number is issued on saving, and the document opens for printing.",
      "transfer.footerDescription": "Transfer {tag}: {changes}",
      "transfer.footerIncomplete": "Choose the asset and what changes",
      "transfer.checkChange": "At least one change"
    }
  } }
  ```
  Kept and reused (no change): `transfer.title`, `asset`, `toLocation`, `toCustodian`, `toDepartment`, `reason`, `remark`, `noChange`, `success`, `from`, `review*` (`reviewNextStatus` is T5's `nextStatus`), `inUseStatus`, `statusUnchanged`, `assetClearedForCustodian`; `assetOperation.summary*` (`summaryNow` is also the pickers' current mark, Y7), `reviewAndSave`; `checkin.returnByFormer`; `checkout.outstandingWith` / `outstandingSince`, `checkout.summaryComponentsOutstanding` "ค้างคืน {count} รายการ" (Y6) and `checkout.detailReadFailed` "อ่านข้อมูลสรุปไม่สำเร็จ" (Y7), each through `tAll`; `common.cancel`, `tryAgain`, `searchSelectPlaceholder`, `searchSelectNoResults`. Not added: `transfer.nowPending` (T5's `TRANSFER_NOW_PENDING`, Y1), `transfer.summaryComponentsOutstanding` (Y6), `transfer.detailReadFailed` and `assetOperation.currentMark` (Y7). Every new Thai value passes `tests/thai-glossary.test.ts` (no ตรวจทาน, ผู้ถือ alone, พื้นที่ or English words).

  **3b. The page.** In `transfer/page.tsx` only the `Promise.all` changes:
  ```tsx
  const [options, initialAsset] = await Promise.all([
    getAssetOperationMasterOptions({ employeeDepartment: true, locationBranch: true }),
    getAssetOperationPreselect("transfer", filters.assetId, { detail: true }),
  ])
  ```
  The permission line, the imports and the `<TransferForm …>` props stay as they are.

  **3c. The form** (`transfer-form.tsx`, rewritten).
  - **Module level:**
    - imports: drop `Save`, `ContentPanel`, `PageHeader`, `atLeastOne`; add `useRef`; `ArrowRight`, `Check` from `lucide-react`; `OperationFormFrame`, `OperationSummaryCard`, `AssetThumbnail`, `FormSection`, `Notice`, `StatusBadge`; `import type { AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption, AssetOperationNamedOption } from "@/lib/asset-operation-options"`; HEAD's `appendReturnTo` import becomes `import { appendReturnTo, getOperationCancelHref } from "@/lib/asset-return-navigation"` (one line, as `checkout-form.tsx:36` and `checkin-form.tsx:39`; Y17); `withCheckoutAssetDetail, type CheckoutDetailState` from `@/lib/checkout-form-rules` (and nothing else from it: the component lines are T5's, Y4); `getAssetStateTone` from `@/lib/design-system`; `focusField, waitForDialogToClose` from `@/lib/field-focus`; `hasTransferChange` from `@/lib/transfer-rules`; from `@/lib/transfer-form-rules`: `getTransferFormChange`, `transferNowCells`, `transferDepartmentLockText`, `buildTransferSummaryRows`, `buildTransferLead`, `buildTransferChecklist`, `buildTransferFooterLine`, `transferWarningLines`, `buildTransferReviewDetails`, `transferComponentLines`, `applyTransferReasonChip`, `pressedTransferReasonChip`, `TRANSFER_REASON_CHIPS` and the types `TransferFormChoice`, `TransferFormChange`, `TransferWords`, `TransferChipWords`, `TransferReasonChip`; `cn`; `useMediaQuery`. HEAD's local `type Option` goes.
    - `TransferFormValues` is unchanged.
    - `const TRANSFER_FORM_ID = "transfer-form"`, with the comment "The form's id: the frame's footer submit names it (group 3 spec §5)."
    - `FIELD_IDS`, in this order, one entry per line: `assetId: "transfer-asset"`, `toLocationId: "transfer-to-location"`, `toCustodianId: "transfer-to-custodian"`, `toDepartmentId: "transfer-to-department"`, `reason: "transfer-reason"`; `TransferField` and `FIELD_ORDER` as today. Update the comment above it: the server names "at least one change" under `toLocationId`; a holder or a department it refuses (P3-R6) shows under its own field.
    - `validate(values: TransferFormValues, change: TransferFormChange)`, module level, three rules in this order: the asset rule as today; `check("toLocationId", hasTransferChange(change.destinations) ? null : "transferDestinationRequired")`; the reason rule as today.
    - `TRANSFER_ROW_CLASSES` and `TRANSFER_CHIP_PRESSED_CLASSES` with the exact strings pinned in Step 1 (one class string for the heads and the three rows, as the card's `SUMMARY_ROW_CLASSES`; the pressed chip takes Segmented's pressed look, `segmented.tsx:33`, on a Button).
  - **In the component, in this order** (the tests slice by these names):
    1. hooks and state: `locale`, `apiError`, `router`, `t = useTranslations("transfer")`, `tOperation = useTranslations("assetOperation")`, `tCommon`, `tAll`, `saving`, `reviewOpen`, `fieldErrors`, `assetDetail` / `assetIdRef` / `readingForSubmit` (Step 1 lines), `isDesktop`, `values` (initial as today).
    2. `const transferWords: TransferWords = {…}`: T5's type field for field (Y1), one field per line with a trailing comma, in T5's order (the Step 1 pins are whole lines):
       - `location`, `holder`, `department`, `status`, `components`, `none` from `tOperation("summaryLocation" | "summaryHolder" | "summaryDepartment" | "summaryStatus" | "summaryComponents" | "summaryNone")`;
       - `kept: (value) => tOperation("summaryKept", { value })`;
       - `formerHolder: (name) => tAll("checkin.returnByFormer", { name })`;
       - `followsHolder: (department) => t("followsHolder", { department })`;
       - `departmentChooseAssetFirst: t("departmentChooseAssetFirst")` (Y5);
       - `inUse: t("inUseStatus")`, `statusUnchanged: t("statusUnchanged")`;
       - `count: (count) => tOperation("summaryCount", { count })`;
       - `summaryComponentsMove: (count) => t("summaryComponentsMove", { count })`;
       - `summaryComponentsOutstanding: (count) => tAll("checkout.summaryComponentsOutstanding", { count })` (ส่งมอบ's word, Y6);
       - `summaryLead: (count, list) => t("summaryLead", { count, list })`;
       - `summaryHolderDepartmentKept: t("summaryHolderDepartmentKept")` (the words alone; T5 joins them with " · ", Y6);
       - `summaryCrossBranch: (branch) => t("summaryCrossBranch", { branch })`;
       - `footerDescription: (tag, changes) => t("footerDescription", { tag, changes })`;
       - `footerIncomplete: t("footerIncomplete")`;
       - `checkAsset: t("asset")`, `checkChange: t("checkChange")`, `checkReason: t("sectionReason")` (Y6);
       - `toLocation: t("toLocation")`, `toCustodian: t("toCustodian")`, `toDepartment: t("toDepartment")`, `nextStatus: t("reviewNextStatus")` (the label of T5's status line in the review, Y2);
       - `componentsMove: (count, list) => t("componentsMove", { count, list })`;
       - `componentsStaying: (list) => t("componentsStaying", { list })`;
       - `componentsOutstanding: (count, list) => t("componentsOutstanding", { count, list })`;
       - `outstandingLine: { with: (holder) => tAll("checkout.outstandingWith", { holder }), since: (documentNo) => tAll("checkout.outstandingSince", { documentNo }) }`.

       Then `chipWords` (Step 1 line).
    3. `transferChoice` and `transferChange` (Step 1 regex).
    4. Derived values, each a Step 1 line: `cancelHref`, `nowCells`, `lockText`, `summaryRows`, `checklist`, `transferLead`, `footerLine`, `componentLines`, `pressedChip`; HEAD's `assetReasonKey` / `assetError` verbatim; `transferReviewDetails`; then `reviewItems = buildOperationReviewSummary({ assetLabel: values.asset ? assetOperationRowLabel(values.asset) : "", details: [...transferReviewDetails, { key: "reason", label: t("reason"), value: values.reason }], evidenceLabel: t("reviewNoEvidence"), labels: { asset: t("asset"), source: t("from"), destination: t("reviewDestination"), nextStatus: t("reviewNextStatus"), evidence: t("reviewEvidence") } })`, with no `destinationLabels` and no `nextStatusLabel` (HEAD's two go; the `labels` object stays as HEAD passes it, since the function's type requires it). The review lists: the asset, then T5's details (each real change, the components line, the next status as T5's last item: Y2, Y3), the reason, the evidence line.
    5. `leaveReview` and `focusFirstError`, verbatim from HEAD.
    6. Handlers:
       ```ts
       function setField(field: string, value: string) {
         // The three destinations are one rule, so a change of any clears it (spec §4.3).
         if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")
         // A holder's or a free department's own refusal (P3-R6) clears with its field, as every other field's does.
         if (field !== "toLocationId" && field in FIELD_IDS) fieldErrors.clear(field as TransferField)
         // §9.2, P3-R5: a new holder the department follows locks it to them, so a department picked before goes, and it does
         // not come back when the holder is cleared with ×. ส่วนกลาง and ส่วนควบ stay free with any holder and keep it (P3-R2).
         // Without a ready detail (no asset, a detail not read yet, a failed read) the source is null: nothing can judge the
         // pick yet, so it is cleared too and cannot come back once the detail locks the row (Y21).
         const dropsDepartment = field === "toCustodianId" && value !== "" && getTransferFormChange({ ...transferChoice, destinations: { ...transferChoice.destinations, toCustodianId: value } }).departmentSource !== "free"
         if (dropsDepartment) fieldErrors.clear("toDepartmentId")
         setValues((current) => ({ ...current, [field]: value, ...(dropsDepartment ? { toDepartmentId: "" } : {}) }))
         if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)
       }
       ```
       - `setAsset(asset)`: HEAD's two lines, then `assetIdRef.current = asset?.id ?? null`, `setAssetDetail(asset && !asset.detail ? "loading" : "ready")`, `if (asset && !asset.detail) void loadAssetDetail(asset.id, Boolean(values.toCustodianId))`. The picks stay (P3-R21). The pick-time read sends the holder as picked: the new asset's holder is not known until this read answers, and a row refused under that rule then reads its reason under the asset field (accepted, Y8: a holder picked before the asset judges the list and this read as an assignment, so an asset that holder already holds and that is Pending Repair or broken is refused until the holder is cleared or the asset is picked first; T7 records it in the docs and the UAT list).
       - `recheckAssetForCustodian`: verbatim from HEAD (S-R40).
       - `loadAssetDetail(assetId, assignCustodian)`: checkout's `loadAssetDetail` (`checkout-form.tsx:354-364`) with the fetch line of Step 1 (mode `transfer`, `detail: true`, the given `assignCustodian`); same comment, same `assetIdRef` drop, same `withCheckoutAssetDetail` and `"ready"` / `"failed"`.
       - `chooseReasonChip(chip: TransferReasonChip)`: for a chip other than `"other"`, `setField("reason", applyTransferReasonChip(values.reason, chip, chipWords))`; then in one `requestAnimationFrame` (after React commits the text): read `document.getElementById(FIELD_IDS.reason)`, return unless it is an `HTMLInputElement`, `focusField(input)` (it scrolls the field clear of the phone's bar, P3-R23), then `input.setSelectionRange(input.value.length, input.value.length)`.
       - `handleSubmit`:
         ```ts
         async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
           event.preventDefault()
           if (readingForSubmit) return
           // Field checks first, so a wrong entry shows its errors at once (P3-R15).
           fieldErrors.setErrors(validate(values, transferChange))
           if (focusFirstError()) return
           if (!values.asset) return
           // The review reads the asset again, under the holder the save sends (P3-R15): the lock, the current values and the
           // components it shows are the asset's as it is now.
           setReadingForSubmit(true)
           const answered = await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId)).finally(() => setReadingForSubmit(false))
           // A failed read stops here, and the card and the phone's warnings show อ่านข้อมูลสรุปไม่สำเร็จ with ลองอีกครั้ง.
           if (!answered) return
           // The checks again on the answer: an asset no longer takeable reads its reason under the field, and a pick that is no
           // longer a change (another save got there first) stops under the location instead of opening an empty review.
           fieldErrors.setErrors(validate({ ...values, asset: answered }, getTransferFormChange({ ...transferChoice, row: answered, detail: "ready" })))
           if (focusFirstError()) return
           setReviewOpen(true)
         }
         ```
    7. `detailFailedNotice`: checkout's node (`checkout-form.tsx:395-402`) with `<span>{tAll("checkout.detailReadFailed")}</span>` (Y7), `tCommon("tryAgain")` and the Step 1 `onClick`; then `summaryWarnings` (Step 1 line).
    8. `submitTransfer`: HEAD's, with the body `JSON.stringify({ ...transferChange.destinations, reason: values.reason, remark: values.remark })` and this refusal branch:
       ```ts
       if (!response.ok) {
         // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
         if (fieldErrors.applyServer(payload) && focusFirstError()) return
         // The holder or the asset changed under the page (P3-R5, P3-R4): the review closes and the asset is read again, so the
         // rows, the lock and the card show it as it is now; then the toast says why. Its field is not on screen (V-form rule).
         if (payload?.code === "ASSET_TRANSFER_DEPARTMENT_LOCKED" || payload?.code === "ASSET_CHANGED_DURING_OPERATION") {
           setReviewOpen(false)
           if (values.asset) await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId))
         }
         throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))
       }
       ```
       The success path (toast, `documentHref`, `router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)`, `router.refresh()`) and the catch's `apiError.toast(error)` stay verbatim. `ASSET_TRANSFER_CONDITION_BLOCKED` lands under `assetId` through `applyServer` with no re-read: a re-read under the new holder would leave a chosen-but-blocked row that clearing the holder cannot unblock; the next submit's checks and re-read decide again.
  - **Render** (props one per line where the Step 1 regexes say so):
    ```tsx
    <>
      <form onSubmit={handleSubmit} noValidate id={TRANSFER_FORM_ID}>
        <OperationFormFrame
          title={t("title")}
          description={t("description")}
          summaryOnPhone={false}
          summary={<OperationSummaryCard
            title=… nowLabel=… nextLabel=… lead={transferLead} rows={summaryRows} checklist={checklist}
            warnings={summaryWarnings} footnote={t("summaryFootnote")} photo=… assetLabel=…   // Step 1 lines
          />}
          footer={{
            description: (
              <>
                <span data-transfer-footer="desktop" className="max-lg:hidden">{footerLine}</span>
                <span data-transfer-footer="phone" className="lg:hidden">{transferLead ?? footerLine}</span>
              </>
            ),
            cancelHref, cancelLabel, submitLabel, busy, formId                                  // Step 1 lines, one per line
          }}
        >
          <FormSection number={1} title={t("sectionAsset")}>
            <div className="grid gap-4">
              {arrival banner, checkout's shape}
              <AssetOperationPicker … (Step 1b regex, pickedBody last) />
              {componentLines.staying ? <Notice tone="info" data-transfer-staying>{componentLines.staying}</Notice> : null}
              {componentLines.outstanding ? <Notice tone="warning" role="status" data-transfer-outstanding>{componentLines.outstanding}</Notice> : null}
            </div>
          </FormSection>
          <FormSection number={2} title={<>{t("sectionChanges")} <span className="font-normal text-muted-foreground">{t("sectionChangesHint")}</span></>}>
            <div className="grid gap-4">
              <div data-transfer-table className="grid gap-4 lg:gap-3">
                <div aria-hidden="true" className={cn(TRANSFER_ROW_CLASSES, "text-meta text-muted-foreground max-lg:hidden")}>
                  <span>{t("columnItem")}</span>
                  <span>{t("columnNow")}</span>
                  <span />
                  <span>{t("columnTarget")}</span>
                </div>
                <div data-transfer-row="location" className={TRANSFER_ROW_CLASSES}>
                  <span className="text-sm font-medium text-foreground lg:pt-2">{tOperation("summaryLocation")}</span>
                  <p data-transfer-now className="min-w-0 break-words text-sm text-foreground lg:pt-2"><span className="text-muted-foreground lg:sr-only">{t("columnNow")}: </span>{nowCells.location}</p>
                  <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground max-lg:hidden lg:mt-2.5" />
                  <SearchableSelect id="transfer-to-location" … />
                </div>
                {the holder row: summaryHolder, nowCells.holder, #transfer-to-custodian}
                {the department row: summaryDepartment, nowCells.department, #transfer-to-department}
              </div>
              {componentLines.travelling ? <p data-transfer-components className="text-sm text-muted-foreground">{componentLines.travelling}</p> : null}
            </div>
          </FormSection>
          <FormSection number={3} title={t("sectionReason")}>
            <div className="grid gap-4">
              <div role="group" aria-label={t("reason")} aria-describedby="transfer-reason-chips-hint" data-transfer-reason-chips className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  {TRANSFER_REASON_CHIPS.map((chip) => (
                    <Button key={chip} … (Step 1 regex) >
                      {pressedChip === chip ? <Check aria-hidden="true" /> : null}
                      {chip === "restructure" ? (
                        <>
                          <span className="lg:hidden">{t("reasonChipRestructureShort")}</span>
                          <span className="max-lg:hidden">{chipWords.restructure}</span>
                        </>
                      ) : chip === "other" ? t("reasonChipOther") : chipWords[chip]}
                    </Button>
                  ))}
                </div>
                <p id="transfer-reason-chips-hint" className="text-meta text-muted-foreground">{t("reasonChipHint")}</p>
              </div>
              {HEAD's reason Field + Input pair, verbatim}
              {HEAD's หมายเหตุ Field + Textarea, verbatim, without its md:col-span-2 div}
            </div>
          </FormSection>
          {!isDesktop && summaryWarnings.length > 0 ? (
            <div data-transfer-phone-warnings className="grid gap-2 lg:hidden">
              {summaryWarnings.map((warning, index) => (
                <Notice key={index} tone="warning">
                  {warning}
                </Notice>
              ))}
            </div>
          ) : null}
        </OperationFormFrame>
      </form>
      <OperationReviewDialog … HEAD's props, items={reviewItems} />
    </>
    ```
    - The heads' third cell is empty: each row draws its own arrow.
    - The chips group is labelled with `aria-label={t("reason")}` (the Field's label has no id to point at) and sits above the Field, outside the pinned pair. No chip is disabled while saving (the review dialog covers the page then).
    - `TransferAssetCard` (module level, after the component): `CheckinAssetCard`'s markup (in `checkin-form.tsx`) without the serial line; it needs no translator. Comment: "The chosen box of section 1 (spec §9.1, P3-R19): the photo, the tag and the status, the name. Where it is and who holds it read in section 2's ตอนนี้ column."
    - HEAD's top-of-component comment becomes: "โอนย้าย (group 3 spec §9): three sections in the shared operation frame, the สรุปก่อนบันทึก card beside them and the footer ตรวจสอบและบันทึก / ยกเลิก. Below lg the card is hidden; the footer's line is the lead and the card's warnings repeat above the bar (spec §9.4). Everything shown or sent reads one change set, T5's getTransferFormChange."

- [ ] **Step 4: Run the focused tests, then the full checks.**
  - Re-run the Step 2 command, plus `node --test tests/e2e-cross-cutting.test.ts tests/validation-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/mobile-field-navigation.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass.
  - Then `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures, 0 lint errors.
  - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add "src/app/[locale]/(dashboard)/asset-management/transfer/page.tsx" src/components/asset-operations/transfer-form.tsx messages/th.json messages/en.json tests/transfer-form-ui.test.ts tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/asset-operation-confirmation-ui.test.ts tests/asset-operation-picker-forms.test.ts tests/e2e-transactions.test.ts tests/v-track2-o.test.ts tests/form-migration-guards.test.ts tests/e2e-fixes.test.ts
git commit -m "feat(transfer): โอนย้าย on the operation frame: the เปลี่ยนอะไร table with ตอนนี้, the current value marked and the department that follows the holder, the reason chips, the summary card and the footer read one change set, the detail read again before the review, and the phone's line and warnings (group 3 spec §9, §5, §13; P3-R4 to P3-R6, P3-R9 to P3-R19, P3-R21, P3-R23)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: E2E of โอนย้าย (the department, ส่วนกลาง, a component, a broken asset) and the docs (spec §17, §6, §9, §19; P3-R1, P3-R7, P3-R8, P3-R22, P3-R23)

The transfer specs follow the new page: the footer's ตรวจสอบและบันทึก, the ตอนนี้ → ปลายทาง table, the แผนก row locked to the holder, a reason chip, the summary on the desktop and the footer line on the phone. `transfer.spec.ts` reads the department back from the asset, the history and the TR-, and four new tests cover spec §14 call 4 (a held asset moved only to another room), ส่วนกลาง, a component that follows its parent, and P3-R1 (a broken asset refused a new holder). Then come the docs and the controller's run.

T1 to T6 have changed the files below, so each block is named by its content. Line numbers are HEAD `5176554f`'s.

**Rulings this task applies:**
- **P3-R1:** โอนย้าย refuses a broken asset (เสียหาย, ใช้งานไม่ได้, ซาก) only when a real (normalized) new holder is chosen. A room-only or department-only move of it is allowed.
  - The page has no `pickBlocked` and no ส่งซ่อม link. The S-R40 re-ask clears the asset with "นำ <tag> ออกแล้ว: <reason>".
  - The route refuses 409 `ASSET_TRANSFER_CONDITION_BLOCKED` with `fieldErrors.assetId` = `transferConditionDamaged` | `transferConditionNonFunctional` | `transferConditionSalvage`.
  - Accepted side effect: the asset page disables โอนย้าย for a broken บุคคล asset.
  - It is the user's call: it comes first in "เรื่องที่ผู้ใช้ควรตรวจ", and `DEVELOPER_HANDOFF.md`'s A1-R3 sentence is answered here.
- **P3-R7:** the route writes a `department_change` movement on the parent only when the department changes (referenceType `transfer`, the TR- id), after the `transfer` movement. The history then shows the department twice: the transfer line's change and this line. This is accepted. A ส่วนกลาง save that keeps its department writes none, which keeps AD2's "latest 3" (`e2e/asset-detail/asset-detail.spec.ts:78-90`, unchanged here).
- **P3-R8:** the TR- page prints "แผนกเดิม" (`transfer.fromDepartment`) before the existing "แผนก". The stale TX-A6 comment at `e2e/transactions/transfer.spec.ts:106-107` is corrected here.
- **P3-R22:** a transfer to a holder still creates no HO-, so the asset returns through รับคืน's ข้อมูลเก่า row. The ข้อมูลเก่า test (`transfer.spec.ts:117-131`) stays, and the docs and UAT say so.
- **P3-R23:** on the phone the frame's footer sits right under the chips and `#transfer-reason`. A spec scrolls a control there to the centre of the screen before clicking it (plan 2's `signOnPad` lesson, E2E-1031K).
- **The skeleton's E2E data rule:**
  - run-scoped assets only (keys TR2 to TR5, plus `TR4C` for TR4's component);
  - no master-data change;
  - the cross-branch line, inactive masters and the TR- cancel stay with unit tests and UAT;
  - wait for the ตอนนี้ cells before the footer click (request noise);
  - scope chips to their group and use เปลี่ยนผู้ใช้งาน (never an unscoped "อื่น ๆ": the asset page's ⋯ menu has the same name).

**Files:**
- Modify (rewritten): `e2e/transactions/transfer.spec.ts` (CRLF; keep CRLF)
- Modify: `e2e/transactions/tx-support.ts` (CRLF):
  - `CreateAssetOptions` (`:56`) and `createAsset`'s body (`:66-73`);
  - new: `readConditionId` after `createTxAsset` (`:83-86`);
  - new: `transferNowCell` and `pickTransferHolder` after `expectNoAssetFound` (`:245-254`);
  - new: `centreInView` after `expectReachable` (`:319-328`);
  - new: `SavedTransfer` and `saveTransferForm` after `saveLateReturn` (`:381-393`).
- Modify: `e2e/transactions/tx-words.ts` (15 keys, Step 3b)
- Modify: `e2e/transactions/findings.spec.ts` (CRLF): the import line `:6` and TX-A8's save click `:39`
- Modify: `e2e/cross-cutting/field-errors.spec.ts:203` and `:208` (`await save(page)` → `await reviewAndSave(page)`; `reviewAndSave` is already imported at `:7`)
- Test (pins rewritten in the E2E commit):
  - `tests/e2e-transactions.test.ts` (CRLF; keep CRLF):
    - TX4 (`:269-280`), replaced;
    - the plan-1 department test's `CreateAssetOptions` line (`:363`).
  - `tests/e2e-cross-cutting.test.ts`: EM3 gains a transfer block before the line `// The spec: the suite's fixtures, and findings M3, M8 and M9` (`:287`).
- Pins that still pass, unchanged:
  - `e2e-transactions.test.ts:148`: transfer.spec keeps exactly one `toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })`. TR1 keeps its arrival from the asset page, and the new tests arrive through `visit`, which waits itself.
  - `:149`: findings keeps one; `:151`: field-errors keeps 4 arrival checks.
  - `:319-321`: TX7's spec list (no new spec file).
  - `:343-347`: no picker by id on `transfer-asset`. TR5 reads `#transfer-asset-error` through `expectFieldError`, as `handover.spec.ts` reads `checkout-asset`.
  - `:350-357`: every TX_WORDS value is a th.json value.
  - `tests/e2e-fixes.test.ts:183`: TR1 keeps the exact line ``await page.waitForURL(new RegExp(`/th/asset-management/transfers/${transfer.id}(?:[?#]|$)`))``. Its `:185`, field-errors' `toHaveURL` line, is untouched.
  - `tests/e2e-asset-detail.test.ts:74-75`: TR1 keeps ``await menuItem(await openMoreActions(page, e2eDevice), "โอนย้าย").click()``, and TX-A4 keeps `for (const view of [undefined, "history"] as const)`.
  - `tests/e2e-cross-cutting.test.ts:208-218`: field-errors keeps the transfer dialog and confirm, and `save()` stays in `forms.ts`.
  - `tests/e2e-review.test.ts:89-104`: no DELETE, no settings page, no LDAP, no import, no Production name.
- Unchanged, checked only:
  - `e2e/asset-detail/detail-steps.ts` `transferByApi` (`:201-205`): its `toDepartmentId: ""` is dropped by T1's normalizer;
  - AD2 is ส่วนกลาง, so its transfer writes no `department_change`;
  - `e2e/cross-cutting/support/refusals.ts`: no new endpoint;
  - `docs/14_UI_UX_DESIGN_SYSTEM.md:104` (the frame's row): it names no `summaryOnPhone`, so Y13's addition has no place there.
- Docs:
  - `docs/99_CHANGELOG.md`;
  - `DEVELOPER_HANDOFF.md`: the A1-R3 sentence at `:1296`, a plan-3 bullet after plan 2's (before `## Open Go-Live Decisions`, `:1315`), and one Go-Live line after `:1331`;
  - `docs/05_ASSET_LIFECYCLE.md` (CRLF): `:123`, a new bullet after it, and two after `:141`;
  - `docs/06_WORKFLOWS.md`: the picker bullet, a page bullet after the รับคืน one, and the Transfer bullet;
  - `docs/07_UAT_CHECKLIST.md`: before `## Sign-Off` (`:606`);
  - `docs/11_FEATURE_LIST.md` (CRLF): `:152`, `:170`;
  - `docs/12_HANDOUT.md` (CRLF): `:50`;
  - `DESIGN.md` (CRLF): `:550`, the frame's sentence on `summaryOnPhone={false}` (Y13).

**Interfaces:**
- Consumes (Step 0 checks each against the code):
  - **T1:**
    - th `asset.transactionReasonTransferConditionDamaged` = "สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่".
    - `getTransferVerdict` refuses a broken asset with `assignCustodian`, and allows it without.
    - The normalizer drops a destination equal to the current value.
  - **T2:**
    - `POST /api/assets/[id]/transfer` answers 201 with the created `AssetTransfer` (`id`, `documentNo`).
    - With a normalized holder on a broken asset it answers 409 `{ code: "ASSET_TRANSFER_CONDITION_BLOCKED", error: …, fieldErrors: { assetId: "transferConditionDamaged" } }` (checkout's `conditionBlockedResponse` shape).
    - It writes the department by `getTransferNextDepartmentId`, a `department_change` movement only on a change ("เปลี่ยนแผนก" in the history), and the components' department through the sync.
    - The TR- page has a `{ label: t("fromDepartment"), value: labelOrDash(labels, beforeSnapshot?.departmentId) }` row before `tAsset("department")`. Both values read "code - name", and th `transfer.fromDepartment` = "แผนกเดิม".
  - **T3:** the detail fields `holderId`, `holderActive`, `holderDepartmentId`, `holderDepartmentName` and `ownerBranchId`, which fill the ตอนนี้ cells and the แผนก lock.
  - **T4:**
    - `SearchableSelect`'s `labelVisuallyHidden` keeps the trigger's accessible name as "<label> <value>";
    - the current option is disabled;
    - `OperationSummaryCard` renders `lead` in `[data-summary-lead]`.
  - **T5:**
    - the card rows `data-summary-row` = `location | holder | department | status | components`, in names;
    - an unchanged row's next value is `assetOperation.summaryKept` "{value} (คงเดิม)";
    - the lead "เปลี่ยน {count} อย่าง: {list}", plus "ผู้ถือครองและแผนกคงเดิม" when holder and department both stay (the key holds it alone; T5 joins it with " · ");
    - the desktop footer line "โอนย้าย {tag}: {changes}";
    - the components line "ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย", `transferComponentLines(...).travelling`, whose `list` holds the travelling components' names;
    - the card's components "ย้ายตาม {count} รายการ" (`transfer.summaryComponentsMove`, Y6);
    - the review (`buildTransferReviewDetails`): real changes only, room and employee as "code - name", a department line when it changes, the components as the label "ส่วนควบ" with the value `transfer.summaryComponentsMove` "ย้ายตาม {count} รายการ" (Y3), and last the next status "ใช้งานอยู่" or "คงสถานะเดิม" (Y2).
  - **T6 (the page):**
    - the page's preselect carries the detail (`getAssetOperationPreselect("transfer", filters.assetId, { detail: true })`), and the masters carry the flags `employeeDepartment` and `locationBranch`;
    - `#transfer-to-location`, and the literal ids `#transfer-to-custodian` and `#transfer-to-department`;
    - the custodian trigger's name starts "ผู้ถือครองปลายทาง";
    - `#transfer-to-department` is `disabled` with the placeholder "ตามผู้ถือครอง: <department name>" while it follows a holder, "เลือกทรัพย์สินก่อน" before an asset is chosen, and "ไม่เปลี่ยนแปลง" while the chosen asset's detail is loading or failed; it is enabled when free (ส่วนกลาง, or no holder now and none chosen);
    - the table rows `[data-transfer-row="location|holder|department"]`, each with a `[data-transfer-now]` cell ("code - name", the room with " · <branch>", "ไม่มี" when empty, "…" until the detail is ready);
    - `[data-transfer-components]` under the table, rendering T5's `transferComponentLines(transferChoice, transferWords).travelling` and hidden when it is null (Y4);
    - a `role="group"` named by "เหตุผลการโอนย้าย" holding four buttons `[data-transfer-reason-chip]` with `aria-pressed`. "เปลี่ยนผู้ใช้งาน" writes "เปลี่ยนผู้ใช้งาน: " at the start of `#transfer-reason` and focuses it;
    - the frame's `[data-slot="sticky-form-footer"]` holds the desktop line (`max-lg:hidden`) and the lead (`lg:hidden`), and the button "ตรวจสอบและบันทึก";
    - the review dialog "ตรวจสอบก่อนโอนย้าย" and its confirm "ยืนยันโอนย้าย";
    - the asset field's line `#transfer-asset-error`;
    - the S-R40 re-ask on every non-empty holder pick with an asset chosen: `buildAssetOperationSearchHref({ mode: "transfer", id: assetId, assignCustodian: true })`, pinned at `tests/asset-operation-picker-forms.test.ts:56-57`.
  - **Existing:**
    - `fillTemplate(template, values)` and `templatePattern(template, placeholders)` (`e2e/shell/shell-words.ts:24`, `:29`): a placeholder left out of `placeholders` matches `[^]*?`;
    - `valueBeside(scope, label)` (`e2e/repair/repair-data.ts:121`): the `<dd>` beside the `<dt>` whose text is exactly `label`;
    - `installComponentByApi`, `readSecondDepartment`, `ensureSecondLocation`, `readAsset` (`AssetRead` has `departmentId`) in `tx-support.ts`;
    - `runRecords(runId)` (`e2e/support/run-plan.ts:70`, `department` and `location` with `code` and `name`);
    - `POST /api/assets` takes `custodianId` and any selectable condition (`Damaged` is one) and creates only Draft or Ready (`assetCreateStatusNames`, `src/lib/asset-lifecycle-policy.ts:43`).
- Produces:
  ```ts
  // e2e/transactions/tx-support.ts
  export type CreateAssetOptions = { ownershipType?: "personal" | "shared" | "component"; departmentId?: string; custodianId?: string; conditionId?: string }
  export async function readConditionId(page: Page, label: string): Promise<string>
  export function transferNowCell(page: Page, row: "location" | "holder" | "department"): Locator
  export async function pickTransferHolder(page: Page, assetId: string, employee: { code: string; fullNameTh: string }): Promise<void>
  export async function centreInView(locator: Locator): Promise<void>
  export type SavedTransfer = { id: string; documentNo: string }
  export async function saveTransferForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedTransfer>
  // e2e/transactions/tx-words.ts: TX_WORDS gains the 15 keys of Step 3b
  ```

**Decisions:**
- **Placement.** Every new test goes in `transfer.spec.ts`, so TX7's spec list does not change.
  - TR1 and the three tests that read its TR- (TX-A4, TX-A6, ข้อมูลเก่า) stay one serial describe, since they share the `transfers` map.
  - TR2 to TR5 make their own assets, so they sit in a second describe with no serial mode: a TR1 failure skips none of them.
  - The config runs one worker with `fullyParallel: false`, so the file still runs in order.
- **Devices.** Every test runs in all four projects. โอนย้าย has no phone steps (§9.4), so both devices save through `saveTransferForm`.
  - The card shows from `lg` only (`summaryOnPhone={false}`), so it is read on the desktop.
  - The phone reads the footer's lead line instead.
  - The footer holds both lines in its DOM (one hidden per breakpoint), so a check of one line never proves the other is hidden. That is accepted, as on รับคืน.
- **TR2's held asset is Ready with a holder.** `POST /api/assets` creates only Draft or Ready, so the one-call held asset has the ข้อมูลเก่า shape (D21). The rule is the same for an In Use holder ("a holder is present"); T1 and T2's unit tests cover In Use.
- **TR5 makes the asset broken at creation** (`conditionId` of เสียหาย, read from the new asset form by `readConditionId`). It does not go through the edit form, which `handover-condition.spec.ts` already drives.
  - It also posts once to the route through `page.request` to read the 409 body (Review Focus 4). Those calls are not page network events, as in `field-errors.spec.ts:98`, so the measure does not count the 409.
- **Request noise.**
  - `pickTransferHolder` waits for the S-R40 re-ask's answer (`assignCustodian=1`).
  - Every test waits for a ตอนนี้ cell before its first footer click.
  - The submit's own re-read is awaited by the page before the review opens.
  - So no search is in flight when the save leaves the page.
- **Data:** +5 assets per project (TR2, TR3, TR4, TR4C, TR5), +20 per run. TR1 now starts in the second department (as before, +1 per project). TR1 to TR4 start in `readSecondDepartment()` (IT first) and stay there or in the run's department on dev. No department, room or employee is made.
- **Not driven** (unit tests and Step 8's UAT list cover them):
  - the cross-branch line (both run rooms are in the run's branch; TR1 asserts it is absent);
  - an inactive room, employee or department;
  - the TR- cancel restoring the department;
  - the 409 `ASSET_TRANSFER_DEPARTMENT_LOCKED` / `ASSET_CHANGED_DURING_OPERATION` toast and re-read;
  - the detail-failed notice;
  - the × clear of a holder (Review Focus 3, T5 and T6);
  - a former holder's "(พ้นสภาพ)";
  - components with their own handover or outstanding;
  - the asset page's disabled โอนย้าย for a broken บุคคล asset;
  - a holder picked before the asset (Y8): an asset that holder already holds and that is รอซ่อม or broken is refused at the pick.

- [ ] **Step 0: Read what T1-T6 committed.**
  - Run `git log --oneline 5176554f..HEAD`. The T1-T6 commits are expected.
  - **The words.** Print every th.json string the new TX_WORDS copy:
    ```bash
    node -e "const th=require('./messages/th.json');const frags=['ตามผู้ถือครอง','อย่าง:','คงเดิม','โอนย้าย {','ย้ายตาม','ย้ายไปสาขาอื่น','เปลี่ยนผู้ใช้งาน','แผนกเดิม','ก่อนโอนย้ายให้ผู้ถือครองใหม่'];const walk=(o,p)=>{for(const[k,v]of Object.entries(o)){const key=p?p+'.'+k:k;if(typeof v==='string'){if(frags.some((f)=>v.includes(f)))console.log(key,'=',JSON.stringify(v))}else walk(v,key)}};walk(th,'')"
    ```
    Each row of this table must be one of them. T6's change file is the only source of these values (Y6). The `TX_WORDS` value is the th.json value exactly, placeholder names included. The spec's `fillTemplate` / `templatePattern` calls use the placeholder names written below; if T6 committed other names, use T6's names in those calls.

    | `TX_WORDS` key | Expected th value | th.json key (task) |
    |---|---|---|
    | `noneNow` | `ไม่มี` | `assetOperation.summaryNone` (HEAD), the word T6 shows in an empty ตอนนี้ cell |
    | `inUseStatus` | `ใช้งานอยู่` | `transfer.inUseStatus` (HEAD) |
    | `statusUnchanged` | `คงสถานะเดิม` | `transfer.statusUnchanged` (HEAD) |
    | `summaryKept` | `{value} (คงเดิม)` | `assetOperation.summaryKept` (HEAD) |
    | `assetClearedForCustodian` | `นำ {assetTag} ออกแล้ว: {reason}` | `transfer.assetClearedForCustodian` (HEAD, pinned) |
    | `reasonTransferDamaged` | `สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่` | `asset.transactionReasonTransferConditionDamaged` (T1) |
    | `fromDepartment` | `แผนกเดิม` | `transfer.fromDepartment` (T2) |
    | `transferFollowsHolder` | `ตามผู้ถือครอง: {department}` | `transfer.followsHolder` (T6) |
    | `transferLead` | `เปลี่ยน {count} อย่าง: {list}` | `transfer.summaryLead` (T6) |
    | `transferKeptBoth` | `ผู้ถือครองและแผนกคงเดิม` | `transfer.summaryHolderDepartmentKept` (T6; alone, no leading " · ") |
    | `transferFooter` | `โอนย้าย {tag}: {changes}` | `transfer.footerDescription` (T6) |
    | `transferComponentsMove` | `ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย` | `transfer.componentsMove` (T6) |
    | `transferSummaryComponents` | `ย้ายตาม {count} รายการ` | `transfer.summaryComponentsMove` (T6; the card's components row and the review's ส่วนควบ value) |
    | `transferCrossBranch` | `ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ {branch} ตามเดิม` | `transfer.summaryCrossBranch` (T6) |
    | `reasonChipUser` | `เปลี่ยนผู้ใช้งาน` | `transfer.reasonChipUser` (T6) |

  - **The hooks.** Each grep prints at least one line:
    - in `src/components/asset-operations/transfer-form.tsx`:
      - `id="transfer-to-custodian"`, `id="transfer-to-department"`;
      - `data-transfer-row`, `data-transfer-now`, `data-transfer-components`, `data-transfer-reason-chip`;
      - `role="group"`, `aria-pressed`, `labelVisuallyHidden`;
      - the line `if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)`;
      - the component lines from T5 (Y4): `const componentLines = transferComponentLines(transferChoice, transferWords)`, and `componentLines.travelling` inside the `<p data-transfer-components` element (with `data-transfer-staying` and `data-transfer-outstanding` on the two Notices).
    - `data-summary-lead` in `src/components/asset-operations/operation-summary-card.tsx`.
    - `t("fromDepartment")` before `tAsset("department")` in `src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx`.
    - `ASSET_TRANSFER_CONDITION_BLOCKED`, `transferConditionDamaged` and `fieldErrors: { assetId` in `src/app/api/assets/[id]/transfer/route.ts`.
    - In `src/lib/transfer-form-rules.ts`, `transferComponentLines`' `travelling`: the `componentsMove(count, list)` call, whose `list` joins the travelling components' names with ", ". If T5 joined tags instead, TR4's `toContainText(component.name)` becomes `toContainText(component.assetTag)`; report it.
  - If a committed value or hook still differs from this step, the earlier task drifted from its plan. Stop and report it to the controller instead of copying the drift.

- [ ] **Step 1: Write the failing pins.**
  - **`tests/e2e-transactions.test.ts` `:363`** becomes:
```ts
    'export type CreateAssetOptions = { ownershipType?: "personal" | "shared" | "component"; departmentId?: string; custodianId?: string; conditionId?: string }',
```
  - **TX4** (`:269-280`, the whole test) becomes:
```ts
test("โอนย้าย through the footer: the second room and a new holder whose department the asset takes, read back with its history line and the TR-'s แผนกเดิม; a held asset moved only to another room; a ส่วนกลาง asset that keeps its department; a computer whose component follows; a broken asset refused a holder (e2e transactions task 4, TX4; group 3 plan 3 task 7)", () => {
  const spec = readTxSpec("e2e/transactions/transfer.spec.ts")
  const support = read("e2e/transactions/tx-support.ts")
  // TR1 keeps the wrong entry, the custodian, the TR- document and its print; TX-A4, TX-A6 and the ข้อมูลเก่า row stay.
  assert.match(spec, /await expectFieldError\(page, "transfer-to-location", "เลือกปลายทางการโอนย้ายอย่างน้อย 1 รายการ"\)/)
  assert.match(spec, /await expectFieldError\(page, "transfer-reason", "กรุณาระบุข้อมูลนี้"\)/)
  assert.match(spec, /expect\(after\.custodianId\)\.toBe\(receiver\.id\)/)
  assert.match(spec, /await visit\(measure, `\/th\/asset-management\/transfers\/\$\{transfer\.id\}`, "TR- document", testInfo\)/)
  assert.match(spec, /await expectPrints\(page, "พิมพ์เอกสารโอนย้าย"\)/)
  assert.deepEqual(expectedFailures(spec), [], "TX-A4 (FX10) and TX-A6 (FX13) are fixed")
  assert.ok(spec.includes('await expect(row).toContainText(TX_WORDS.legacyRow.replace("{location}", `${room.code} - ${room.name}`))'), "the ข้อมูลเก่า line names the room (S-R47)")
  assert.ok(!spec.includes("legacy-checkout") && !spec.includes("pickAsset("), "the ข้อมูลเก่า row is read, never picked")
  assert.match(spec, /test\.describe\.configure\(\{ mode: "serial" \}\)/)
  assert.ok(!spec.includes("prints the status, room and department before and after"), "TX-A6's comment says what the TR- printed (P3-R8)")
  // The footer's ตรวจสอบและบันทึก (spec §5, §17), here and in TX-A8; the other forms keep common.save.
  for (const file of ["e2e/transactions/transfer.spec.ts", "e2e/transactions/findings.spec.ts"]) {
    const source = read(file)
    assert.ok(!source.includes('{ name: "บันทึก", exact: true }'), `${file}: no exact บันทึก`)
    assert.ok(source.includes("{ name: TX_WORDS.reviewAndSave, exact: true }"), `${file}: the footer's word`)
  }
  // The helpers. The save sets its wait first, then the footer, the review and its confirm, and the TR- opens. A holder
  // pick waits for the page's re-ask under the holder's rule (S-R40), so no search is in flight when a save leaves.
  for (const signature of [
    "export async function readConditionId(page: Page, label: string): Promise<string>",
    'export function transferNowCell(page: Page, row: "location" | "holder" | "department"): Locator',
    "export async function pickTransferHolder(page: Page, assetId: string, employee: { code: string; fullNameTh: string }): Promise<void>",
    "export async function centreInView(locator: Locator): Promise<void>",
    "export type SavedTransfer = { id: string; documentNo: string }",
    "export async function saveTransferForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedTransfer>",
  ]) assert.ok(support.includes(signature), signature)
  const body = (name: string) => {
    const start = support.indexOf(`export async function ${name}(`)
    return support.slice(start, support.indexOf("\nexport ", start + 1))
  }
  const save = body("saveTransferForm")
  const at = ["TX_WORDS.reviewAndSave", '"ตรวจสอบก่อนโอนย้าย"', '"ยืนยันโอนย้าย"'].map((word) => save.indexOf(word))
  assert.ok(at.every((index, i) => index >= 0 && (i === 0 || index > at[i - 1])), "saveTransferForm: footer, review, confirm")
  assert.ok(save.indexOf("page.waitForResponse(") >= 0 && save.indexOf("page.waitForResponse(") < at[0], "saveTransferForm: the wait first")
  assert.ok(save.includes("/transfer`") && save.includes("/th/asset-management/transfers/"), "saveTransferForm: the route, then the TR-")
  const holder = body("pickTransferHolder")
  assert.ok(holder.indexOf("page.waitForResponse(") >= 0 && holder.indexOf("page.waitForResponse(") < holder.indexOf('pickSearchable(page, "transfer-to-custodian"'), "pickTransferHolder: the wait before the pick")
  assert.ok(holder.includes('url.searchParams.get("assignCustodian") === "1"'), "pickTransferHolder: the re-ask under the holder's rule")
  const condition = body("readConditionId")
  assert.ok(condition.includes('page.goto("/th/assets/new")') && condition.includes('page.locator("#asset-condition option"'), "readConditionId: the new asset form's conditions")
  // TR1 (spec §6, §9, §17): ตอนนี้, the picker's name in the table, the locked row, a chip, the summary or the footer
  // line, the department read back from the asset, the history and the TR-.
  for (const part of [
    '"TR1", "โน้ตบุ๊กโอนย้าย", { departmentId: second.id })',
    'await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)',
    'await expect(page.locator("#transfer-to-custodian")).toHaveAccessibleName(/^ผู้ถือครองปลายทาง/)',
    "await expect(department).toContainText(fillTemplate(TX_WORDS.transferFollowsHolder, { department: runDepartment.name }))",
    'page.getByRole("group", { name: /^เหตุผลการโอนย้าย/ }).getByRole("button", { name: TX_WORDS.reasonChipUser, exact: true })',
    "await centreInView(chip)",
    "await expect(reason).toHaveValue(`${TX_WORDS.reasonChipUser}: `)",
    'await expect(chip).toHaveAttribute("aria-pressed", "true")',
    'templatePattern(TX_WORDS.transferLead, { count: "3" })',
    "await expect(summary).not.toContainText(templatePattern(TX_WORDS.transferCrossBranch, {}))",
    "await expect(footer).toContainText(templatePattern(TX_WORDS.transferFooter, { tag: asset.assetTag }))",
    "await page.waitForURL(new RegExp(`/th/asset-management/transfers/${transfer.id}(?:[?#]|$)`))",
    "expect(after.departmentId).toBe(data.departmentId)",
    'await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)',
    "await expect(valueBeside(page, TX_WORDS.fromDepartment)).toHaveText(`${second.code} - ${second.name}`)",
  ]) assert.ok(spec.includes(part), part)
  // TR2 (call 4), TR3 (ส่วนกลาง), TR4 (a component), TR5 (a broken asset, P3-R1).
  for (const part of [
    '"TR2", "โน้ตบุ๊กย้ายห้องตามผู้ถือครอง", { departmentId: second.id, custodianId: holder.id })',
    'toEqual([room.id, holder.id, data.departmentId, "Ready"])',
    'await expect(footer).not.toContainText(holder.fullNameTh)',
    '"TR3", "จอส่วนกลางโอนย้าย", { ownershipType: "shared", departmentId: second.id })',
    "await expect(department).toBeEnabled()",
    'toEqual([receiver.id, second.id, "In Use", data.locationId])',
    'await expect(page.getByRole("main")).not.toContainText(TX_WORDS.departmentChange)',
    '"TR4C", "เมาส์ติดเครื่องโอนย้าย", { ownershipType: "component", departmentId: second.id })',
    'await installComponentByApi(page, asset.id, component.id, "เมาส์", "1")',
    'page.locator("[data-transfer-components]")',
    'await expect(valueBeside(review, "ส่วนควบ")).toHaveText(fillTemplate(TX_WORDS.transferSummaryComponents, { count: 1 }))',
    "toEqual([receiver.id, room.id, data.departmentId])",
    'const damaged = await readConditionId(page, "เสียหาย")',
    '"TR5", "โน้ตบุ๊กเสียโอนย้าย", { conditionId: damaged })',
    "fillTemplate(TX_WORDS.assetClearedForCustodian, { assetTag: asset.assetTag, reason: TX_WORDS.reasonTransferDamaged })",
    'toEqual([409, "ASSET_TRANSFER_CONDITION_BLOCKED", "transferConditionDamaged"])',
    'toEqual([room.id, null, "Ready", data.departmentId])',
    "await expect(changes).toContainText(TX_WORDS.transferKeptBoth)",
  ]) assert.ok(spec.includes(part), part)
  assert.equal(spec.split("await saveTransferForm(page, asset.id").length - 1, 5, "every save through the footer and the review")
  assert.equal(spec.split("await pickTransferHolder(page, asset.id, ").length - 1, 4, "every holder pick waits for the re-ask")
  assert.equal(spec.split("await readSecondDepartment()").length - 1, 4)
  assert.equal(spec.split('if (e2eDevice === "desktop")').length - 1, 4, "the summary on the desktop only")
  for (const banned of ["request.delete", "/api/admin/settings", "/api/departments", "/api/locations", "ldap", "import-confirm", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
})
```
  - **`tests/e2e-cross-cutting.test.ts` EM3:** before the line `// The spec: the suite's fixtures, and findings M3, M8 and M9 expected to fail until fixed (M9 on the phone only).` (`:287`), add:
```ts
  // โอนย้าย (group 3 plan 3 task 7): the footer's ตรวจสอบและบันทึก for both presses, and the custodian picker found by its
  // accessible name inside the page's table.
  const transferTest = spec.slice(spec.indexOf('test("transfer: '), spec.indexOf('test("repair record: '))
  assert.equal(transferTest.split("await reviewAndSave(page)").length - 1, 2)
  assert.ok(!transferTest.includes("await save(page)"))
  assert.ok(transferTest.includes('await choose(page, page.getByRole("button", { name: /^ผู้ถือครองปลายทาง/ }), run.employees.receiver1.code)'))
```

- [ ] **Step 2: Run the pins and see them fail.** Run `node --test tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts`.
  - Expected failures: TX4 (no helpers, old spec), the plan-1 department test (`CreateAssetOptions`) and EM3 (`save(page)` twice).
  - Everything else passes.

- [ ] **Step 3: The helpers and the words.**
  - **3a. `tx-support.ts`:**
    - **`CreateAssetOptions`** takes the Produces type. The comment above it gains: "a held asset (`custodianId`, a holder whose department differs from the asset's: group 3 spec §14 call 4) and a broken one (`conditionId`) for plan 3's โอนย้าย".
    - **`createAsset`'s body:**
      - after `departmentId: options.departmentId ?? data.departmentId,` add `custodianId: options.custodianId ?? "",`;
      - `conditionId: masters.goodConditionId,` becomes `conditionId: options.conditionId ?? masters.goodConditionId,`.
    - **`readConditionId`**, after `createTxAsset` (outside the `readAssetMasters` … `export type CreatedAsset` slice that `tests/e2e-transactions.test.ts:122` reads):
```ts
// One condition master's id by its Thai name, as the new asset form offers it (the masters have no API of their own, as
// readAssetMasters says): an asset registered broken, for โอนย้าย's holder rule (group 3 plan 3, P3-R1).
export async function readConditionId(page: Page, label: string): Promise<string> {
  await page.goto("/th/assets/new")
  const option = page.locator("#asset-condition option", { hasText: new RegExp(`^${label}$`) })
  await expect(option).toHaveCount(1)
  const value = await option.getAttribute("value")
  if (!value) throw new Error(`the new asset form offers no condition named ${label}`)
  return value
}
```
    - **`transferNowCell` and `pickTransferHolder`**, after `expectNoAssetFound`:
```ts
// One ตอนนี้ cell of โอนย้าย's table (group 3 spec §9.2, P3-R17): the row's current room, holder or department as
// "code - name", or ไม่มี. It fills from the chosen asset's detail, so a spec waits on it before a save leaves the page.
export function transferNowCell(page: Page, row: "location" | "holder" | "department"): Locator {
  return page.locator(`[data-transfer-row="${row}"] [data-transfer-now]`)
}
// โอนย้าย's ผู้ถือครองปลายทาง (group 3 spec §9.1, S-R40): choose the employee, then wait for the page's re-ask of the chosen
// asset under the holder's rule (assignCustodian=1). A search still in flight when a later save leaves the page would be
// a cancelled request the allow-list does not cover.
export async function pickTransferHolder(page: Page, assetId: string, employee: { code: string; fullNameTh: string }): Promise<void> {
  const asked = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === ASSET_SEARCH_PATH && url.searchParams.get("id") === assetId && url.searchParams.get("assignCustodian") === "1"
  })
  await pickSearchable(page, "transfer-to-custodian", employee.code, `${employee.code} - ${employee.fullNameTh}`)
  expect((await asked).status(), `${ASSET_SEARCH_PATH} id=${assetId} assignCustodian=1`).toBe(200)
}
```
    - **`centreInView`**, after `expectReachable`:
```ts
// A control scrolled to the middle of the screen before a click: on the phone the sticky footer covers the bottom, and a
// control scrolled only to the edge takes the finger on the footer (group 3 plan 2 E2E-1031K, plan 3 P3-R23).
export async function centreInView(locator: Locator): Promise<void> {
  await locator.evaluate((element) => element.scrollIntoView({ block: "center" }))
}
```
    - **`SavedTransfer` and `saveTransferForm`**, after `saveLateReturn`:
```ts
// Save โอนย้าย (group 3 spec §5, §9.3): the footer's ตรวจสอบและบันทึก (the page reads the asset again first), the review
// "ตรวจสอบก่อนโอนย้าย" (read by atReview), then ยืนยันโอนย้าย. The TR- document then opens. The same on both devices,
// since โอนย้าย has no phone steps (§9.4).
export type SavedTransfer = { id: string; documentNo: string }
export async function saveTransferForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedTransfer> {
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${assetId}/transfer`) && response.request().method() === "POST")
  await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนโอนย้าย" })
  await expect(review).toBeVisible()
  await atReview?.(review)
  await review.getByRole("button", { name: "ยืนยันโอนย้าย" }).click()
  const response = await saved
  expect(response.status(), `POST /api/assets/${assetId}/transfer: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const transfer = (await response.json()) as SavedTransfer
  await page.waitForURL((url) => url.pathname === `/th/asset-management/transfers/${transfer.id}`)
  return transfer
}
```
  - **3b. `tx-words.ts`**, after `repairJoined`, the 15 keys with the values of Step 0's table:
```ts
  // โอนย้าย (group 3 plan 3): an empty ตอนนี้ cell (assetOperation.summaryNone), the next status (transfer.inUseStatus,
  // transfer.statusUnchanged), a row that stays (assetOperation.summaryKept), the S-R40 line with the broken asset's
  // reason for a new holder (transfer.assetClearedForCustodian, asset.transactionReasonTransferConditionDamaged), the
  // TR-'s แผนกเดิม (transfer.fromDepartment), and the page's own words (transfer.*): the locked แผนก row, the card's
  // lead and its "both stay" part, the footer, the components line, the components count of the card and the review,
  // the cross-branch line, the chip.
  noneNow: "ไม่มี",
  inUseStatus: "ใช้งานอยู่",
  statusUnchanged: "คงสถานะเดิม",
  summaryKept: "{value} (คงเดิม)",
  assetClearedForCustodian: "นำ {assetTag} ออกแล้ว: {reason}",
  reasonTransferDamaged: "สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่",
  fromDepartment: "แผนกเดิม",
  transferFollowsHolder: "ตามผู้ถือครอง: {department}",
  transferLead: "เปลี่ยน {count} อย่าง: {list}",
  transferKeptBoth: "ผู้ถือครองและแผนกคงเดิม",
  transferFooter: "โอนย้าย {tag}: {changes}",
  transferComponentsMove: "ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย",
  transferSummaryComponents: "ย้ายตาม {count} รายการ",
  transferCrossBranch: "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ {branch} ตามเดิม",
  reasonChipUser: "เปลี่ยนผู้ใช้งาน",
```

- [ ] **Step 4: Rewrite `e2e/transactions/transfer.spec.ts`.** Write the file below, then make it CRLF again:
  ```bash
  node -e "const fs=require('fs');const f='e2e/transactions/transfer.spec.ts';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r?\n/g,'\r\n'))"
  ```
  The three tests marked "unchanged" are HEAD's `:92-131` copied as they are, except TX-A6's comment, which is given.
```ts
// Spec §6.1.5: IT staff transfer (โอนย้าย) an E2E asset to the run's second room and a new custodian: the TR- document,
// the new room and custodian. Transfer had no data in the dev database and its print page had never been previewed
// (wiki #22). A wrong entry first shows its errors under the fields (spec §6.7).
// Group 3 plan 3 (spec §6, §9, §17): the page's footer ตรวจสอบและบันทึก, the ตอนนี้ → ปลายทาง table, the แผนก row that
// follows the holder, a reason chip, the summary on the desktop and the footer's line on the phone. The asset takes its
// holder's department, read back from the asset, its history (เปลี่ยนแผนก) and the TR- (แผนกเดิม). A held asset moved
// only to another room takes its holder's department (spec §14 call 4); a ส่วนกลาง asset keeps its own; a computer's
// component follows it; a broken asset is refused a new holder but still moves room (P3-R1). A transfer to a holder
// makes no HO-, so the asset comes back as a ข้อมูลเก่า row (P3-R22). The cross-branch line, inactive rooms, employees
// and departments, and the TR- cancel are the unit tests' and UAT's: both run rooms are in the run's branch, and E2E
// never changes master data.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { valueBeside } from "../repair/repair-data.ts"
import {
  centreInView,
  createTxAsset,
  ensureSecondLocation,
  expectFieldError,
  expectPrints,
  findAssetRow,
  installComponentByApi,
  pickedAsset,
  pickSearchable,
  pickTransferHolder,
  readAsset,
  readAssetMasters,
  readConditionId,
  readSecondDepartment,
  record,
  saveTransferForm,
  transferNowCell,
  visit,
  visitAssetPage,
  TRANSACTION_PAGE_ARRIVAL_MS,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"
import { menuItem, openMoreActions, primaryAction } from "../asset-detail/detail-steps.ts"

asUser("itStaff")

const transfers = new Map<string, { assetId: string; assetTag: string; transferId: string; documentNo: string; custodian: string }>()

test.describe("transfer", () => {
  test.describe.configure({ mode: "serial" })

  test("a transfer to the second room and a new custodian through the footer: the แผนก row follows the holder, a reason chip starts the text, the asset takes the holder's department, and the TR- document opens, names the department before and prints", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver2
    const { department: runDepartment, location: runRoom } = runRecords(readRunState().runId)
    const room = await ensureSecondLocation()
    // The asset starts in another department, so the new holder's department is a change (spec §6, §17).
    const second = await readSecondDepartment()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "TR1", "โน้ตบุ๊กโอนย้าย", { departmentId: second.id })

    await visitAssetPage(measure, asset.id, "asset before the transfer", testInfo)
    // A Ready asset's primary is ส่งมอบ; its transfer is in "อื่น ๆ" (spec §7.1).
    await expect(primaryAction(page, e2eDevice)).toHaveAccessibleName("ส่งมอบ")
    await menuItem(await openMoreActions(page, e2eDevice), "โอนย้าย").click()
    await expect(page).toHaveURL(new RegExp(`/th/asset-management/transfer\\?assetId=${asset.id}`))
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    // ตอนนี้ (spec §9.2): the room, no holder, the department. The cells fill from the asset's detail, so the detail has
    // landed before any save leaves the page.
    await expect(transferNowCell(page, "location")).toContainText(`${runRoom.code} - ${runRoom.name}`)
    await expect(transferNowCell(page, "holder")).toContainText(TX_WORDS.noneNow)
    await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)
    // No holder now and none chosen: the แผนก row is free (spec §6).
    const department = page.locator("#transfer-to-department")
    await expect(department).toBeEnabled()
    await record(measure, "transfer form", testInfo)

    // A wrong entry first: no destination and no reason.
    await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()
    await expectFieldError(page, "transfer-to-location", "เลือกปลายทางการโอนย้ายอย่างน้อย 1 รายการ")
    await expectFieldError(page, "transfer-reason", "กรุณาระบุข้อมูลนี้")
    await expect(page.locator("#transfer-to-location")).toBeFocused()

    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    // The table keeps the picker's name (P3-R17): its label is hidden from sight, not dropped.
    await expect(page.locator("#transfer-to-custodian")).toHaveAccessibleName(/^ผู้ถือครองปลายทาง/)
    await pickTransferHolder(page, asset.id, receiver)
    // A holder chosen: the แผนก row follows them and cannot be picked (spec §6, §9.2).
    await expect(department).toBeDisabled()
    await expect(department).toContainText(fillTemplate(TX_WORDS.transferFollowsHolder, { department: runDepartment.name }))

    // A reason chip writes its word at the start of the text, focuses it and shows pressed; the person types on (§9.3).
    const chip = page.getByRole("group", { name: /^เหตุผลการโอนย้าย/ }).getByRole("button", { name: TX_WORDS.reasonChipUser, exact: true })
    await expect(chip).toHaveAttribute("data-transfer-reason-chip", "user")
    // Centred first: on the phone the footer sits right under the chips (P3-R23).
    await centreInView(chip)
    await chip.click()
    const reason = page.locator("#transfer-reason")
    await expect(reason).toHaveValue(`${TX_WORDS.reasonChipUser}: `)
    await expect(reason).toBeFocused()
    await expect(chip).toHaveAttribute("aria-pressed", "true")
    await reason.press("End")
    await reason.pressSequentially(`${asset.assetTag} ย้ายไปห้องปลายทาง`)
    await expect(reason).toHaveValue(`${TX_WORDS.reasonChipUser}: ${asset.assetTag} ย้ายไปห้องปลายทาง`)
    await expect(page.locator("#transfer-to-location-error")).toHaveCount(0)

    const footer = page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })
    if (e2eDevice === "desktop") {
      // สรุปก่อนบันทึก (§9.3): three changes, each row by name, the next status, and no cross-branch line (both rooms are
      // in the run's branch). The footer names the changes.
      const summary = page.locator('[data-slot="operation-summary-card"]')
      const lead = summary.locator("[data-summary-lead]")
      await expect(lead).toContainText(templatePattern(TX_WORDS.transferLead, { count: "3" }))
      await expect(lead).not.toContainText(TX_WORDS.transferKeptBoth)
      await expect(summary.locator('[data-summary-row="location"]')).toContainText(room.name)
      await expect(summary.locator('[data-summary-row="holder"]')).toContainText(receiver.fullNameTh)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(second.name)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(runDepartment.name)
      await expect(summary.locator('[data-summary-row="status"]')).toContainText(TX_WORDS.inUseStatus)
      await expect(summary).not.toContainText(templatePattern(TX_WORDS.transferCrossBranch, {}))
      await expect(footer).toContainText(templatePattern(TX_WORDS.transferFooter, { tag: asset.assetTag }))
      for (const name of [room.name, receiver.fullNameTh, runDepartment.name]) await expect(footer).toContainText(name)
    } else {
      // The phone has no card: the footer's one line counts the changes (§9.4).
      await expect(footer).toContainText(templatePattern(TX_WORDS.transferLead, { count: "3" }))
    }
    await record(measure, "transfer form, filled", testInfo)

    const transfer = await saveTransferForm(page, asset.id, async (review) => {
      // The review lists the changes; the room and the employee read code - name (P3-R18).
      await expect(review).toContainText(room.code)
      await expect(review).toContainText(receiver.fullNameTh)
      await expect(review).toContainText(runDepartment.name)
      await expect(review).toContainText(TX_WORDS.inUseStatus)
      await record(measure, "transfer review", testInfo)
    })
    expect(transfer.documentNo).toMatch(/^TR-/)
    transfers.set(testInfo.project.name, { assetId: asset.id, assetTag: asset.assetTag, transferId: transfer.id, documentNo: transfer.documentNo, custodian: receiver.fullNameTh })

    // The form opens the TR- document, with the asset page's returnTo (user decision 2026-10-21, FX10).
    await page.waitForURL(new RegExp(`/th/asset-management/transfers/${transfer.id}(?:[?#]|$)`))
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible()
    const after = await readAsset(page, asset.id)
    expect(after.currentLocationId).toBe(room.id)
    expect(after.custodianId).toBe(receiver.id)
    expect(after.status.name).toBe("In Use")
    // The new holder's department (spec §6), with its own history line (spec §14 call 6).
    expect(after.departmentId).toBe(data.departmentId)
    await visitAssetPage(measure, asset.id, "asset after the transfer", testInfo)
    await expect(page.getByRole("main")).toContainText(room.name)
    await expect(page.getByRole("main")).toContainText(receiver.fullNameTh)
    await visitAssetPage(measure, asset.id, "asset history after the transfer", testInfo, "history")
    await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)

    // The TR- document (wiki #22: never previewed before), opened at its address: the department before and after (P3-R8).
    await visit(measure, `/th/asset-management/transfers/${transfer.id}`, "TR- document", testInfo)
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible()
    await expect(page.getByText(transfer.documentNo, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole("main")).toContainText(room.name)
    await expect(page.getByRole("main")).toContainText(`${asset.assetTag} ย้ายไปห้องปลายทาง`)
    await expect(valueBeside(page, TX_WORDS.fromDepartment)).toHaveText(`${second.code} - ${second.name}`)
    await expect(valueBeside(page, "แผนก")).toHaveText(`${runDepartment.code} - ${runDepartment.name}`)
    await expectPrints(page, "พิมพ์เอกสารโอนย้าย")
  })

  // … TX-A4 (HEAD :92-104), unchanged.

  // Finding TX-A6: the TR- document printed the status and room before and after, and the department after, but not the
  // custodian, so a transfer that hands the asset to a new holder had no paper naming them. Since group 3 plan 3 it also
  // prints แผนกเดิม (P3-R8; the first test reads it).
  // … the TX-A6 test (HEAD :108-115), unchanged.

  // … the ข้อมูลเก่า test with its comment (HEAD :117-131), unchanged.
})

// Group 3 plan 3 (spec §6, §9.2, §14 call 4, and §19's question, answered by P3-R1). Each test makes its own assets, so
// these are not serial: one failing skips none of the others.
test.describe("transfer: the department rule, ส่วนกลาง, a component and a broken asset", () => {
  test("a held asset moved only to another room takes its holder's department: the row is locked from the start, the summary shows the change, and the holder and the status stay (spec §6, §14 call 4)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const holder = data.employees.receiver1
    const runDepartment = runRecords(readRunState().runId).department
    const room = await ensureSecondLocation()
    const second = await readSecondDepartment()
    // A Ready asset with a holder and a department other than theirs (an old mismatch), made in one call: the asset API
    // creates only Draft or Ready, so this is the ข้อมูลเก่า shape (D21); the rule is the same for an In Use holder.
    const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "TR2", "โน้ตบุ๊กย้ายห้องตามผู้ถือครอง", { departmentId: second.id, custodianId: holder.id })
    const before = await readAsset(page, asset.id)
    expect([before.custodianId, before.departmentId, before.status.name]).toEqual([holder.id, second.id, "Ready"])

    await visit(measure, `/th/asset-management/transfer?assetId=${asset.id}`, "transfer form, a held asset in another department", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expect(transferNowCell(page, "holder")).toContainText(`${holder.code} - ${holder.fullNameTh}`)
    await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)
    // The asset has a holder: the แผนก row follows them before anything is chosen.
    const department = page.locator("#transfer-to-department")
    await expect(department).toBeDisabled()
    await expect(department).toContainText(fillTemplate(TX_WORDS.transferFollowsHolder, { department: runDepartment.name }))

    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ย้ายห้องอย่างเดียว`)
    const footer = page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })
    if (e2eDevice === "desktop") {
      // Two changes: the room, and the department the holder's corrects. The holder and the status stay.
      const summary = page.locator('[data-slot="operation-summary-card"]')
      await expect(summary.locator("[data-summary-lead]")).toContainText(templatePattern(TX_WORDS.transferLead, { count: "2" }))
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(second.name)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(runDepartment.name)
      await expect(summary.locator('[data-summary-row="holder"]')).toContainText(fillTemplate(TX_WORDS.summaryKept, { value: holder.fullNameTh }))
      await expect(summary.locator('[data-summary-row="status"]')).toContainText(TX_WORDS.statusUnchanged)
      // The footer names the changed rows only (P3-R12).
      await expect(footer).toContainText(templatePattern(TX_WORDS.transferFooter, { tag: asset.assetTag }))
      await expect(footer).toContainText(runDepartment.name)
      await expect(footer).not.toContainText(holder.fullNameTh)
    } else {
      await expect(footer).toContainText(templatePattern(TX_WORDS.transferLead, { count: "2" }))
    }
    await record(measure, "transfer form, a held asset moved only to another room", testInfo)

    await saveTransferForm(page, asset.id, async (review) => {
      // Real changes only (P3-R18): the room and the department, not the holder who stays.
      await expect(review).toContainText(room.code)
      await expect(review).toContainText(runDepartment.name)
      await expect(review).toContainText(TX_WORDS.statusUnchanged)
      await expect(review).not.toContainText(holder.fullNameTh)
    })
    const after = await readAsset(page, asset.id)
    expect([after.currentLocationId, after.custodianId, after.departmentId, after.status.name]).toEqual([room.id, holder.id, data.departmentId, "Ready"])
    await visitAssetPage(measure, asset.id, "asset history after a room-only transfer", testInfo, "history")
    await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)
  })

  test("a ส่วนกลาง asset given a holder keeps its own department: the row stays free, and the save writes no department and no เปลี่ยนแผนก line (spec §6, Q1)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver1
    const runDepartment = runRecords(readRunState().runId).department
    const second = await readSecondDepartment()
    const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "TR3", "จอส่วนกลางโอนย้าย", { ownershipType: "shared", departmentId: second.id })
    await visit(measure, `/th/asset-management/transfer?assetId=${asset.id}`, "transfer form, a ส่วนกลาง asset", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)
    await pickTransferHolder(page, asset.id, receiver)
    // ส่วนกลาง: the row stays free with a holder chosen (spec §9.2, Q1).
    const department = page.locator("#transfer-to-department")
    await expect(department).toBeEnabled()
    await expect(department).not.toContainText(templatePattern(TX_WORDS.transferFollowsHolder, {}))
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ให้ผู้ใช้งานดูแล`)
    if (e2eDevice === "desktop") {
      // The card keeps the department and never promises the holder's.
      const summary = page.locator('[data-slot="operation-summary-card"]')
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(fillTemplate(TX_WORDS.summaryKept, { value: second.name }))
      await expect(summary).not.toContainText(runDepartment.name)
      await expect(summary.locator('[data-summary-row="status"]')).toContainText(TX_WORDS.inUseStatus)
    }
    await record(measure, "transfer form, a ส่วนกลาง asset to a holder", testInfo)

    const transfer = await saveTransferForm(page, asset.id)
    const after = await readAsset(page, asset.id)
    expect([after.custodianId, after.departmentId, after.status.name, after.currentLocationId]).toEqual([receiver.id, second.id, "In Use", data.locationId])
    // The history links the TR- and has no department line (P3-R7; one would also push AD2's three documents out).
    await visitAssetPage(measure, asset.id, "asset history after a ส่วนกลาง transfer", testInfo, "history")
    await expect(page.locator(`a[href*="/asset-management/transfers/${transfer.id}"]`).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole("main")).not.toContainText(TX_WORDS.departmentChange)
  })

  test("a computer with an installed ส่วนควบ: the line under the table names it, and the component's room, holder and department follow the computer's (spec §9.2, §6)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver2
    const room = await ensureSecondLocation()
    const second = await readSecondDepartment()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "TR4", "คอมพิวเตอร์โอนย้ายพร้อมส่วนควบ", { departmentId: second.id })
    const component = await createTxAsset(page, masters, testInfo.project.name, "TR4C", "เมาส์ติดเครื่องโอนย้าย", { ownershipType: "component", departmentId: second.id })
    await installComponentByApi(page, asset.id, component.id, "เมาส์", "1")

    await visit(measure, `/th/asset-management/transfer?assetId=${asset.id}`, "transfer form, a computer with a component", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)
    // Under the table, from the sync's own filter (P3-R14).
    const travelling = page.locator("[data-transfer-components]")
    await expect(travelling).toContainText(templatePattern(TX_WORDS.transferComponentsMove, { count: "1" }))
    await expect(travelling).toContainText(component.name)
    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    await pickTransferHolder(page, asset.id, receiver)
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ย้ายพร้อมส่วนควบ`)
    if (e2eDevice === "desktop") {
      await expect(page.locator('[data-slot="operation-summary-card"] [data-summary-row="components"]')).toContainText(fillTemplate(TX_WORDS.transferSummaryComponents, { count: 1 }))
    }
    await record(measure, "transfer form, a computer with a component", testInfo)

    await saveTransferForm(page, asset.id, async (review) => {
      // The review's components line is the label ส่วนควบ beside the card's count (Y3).
      await expect(valueBeside(review, "ส่วนควบ")).toHaveText(fillTemplate(TX_WORDS.transferSummaryComponents, { count: 1 }))
    })
    // The computer and its component: the new room, the new holder and the holder's department (the sync, spec §6).
    for (const [assetId, label] of [[asset.id, "the computer"], [component.id, "its component"]] as const) {
      const after = await readAsset(page, assetId)
      expect([after.custodianId, after.currentLocationId, after.departmentId], label).toEqual([receiver.id, room.id, data.departmentId])
    }
  })

  test("a broken asset is refused a new holder: picking one removes it with the reason, the route refuses the same, and a room-only move saves (P3-R1, spec §19)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver1
    const room = await ensureSecondLocation()
    const masters = await readAssetMasters(page)
    const damaged = await readConditionId(page, "เสียหาย")
    const asset = await createTxAsset(page, masters, testInfo.project.name, "TR5", "โน้ตบุ๊กเสียโอนย้าย", { conditionId: damaged })
    const path = `/th/asset-management/transfer?assetId=${asset.id}`

    // With no holder chosen it only moves, so the page takes it.
    await visit(measure, path, "transfer form, a broken asset", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    // A holder chosen: the page asks again under the holder's rule and removes it, with the reason (S-R40, P3-R1).
    await pickTransferHolder(page, asset.id, receiver)
    await expectFieldError(page, "transfer-asset", fillTemplate(TX_WORDS.assetClearedForCustodian, { assetTag: asset.assetTag, reason: TX_WORDS.reasonTransferDamaged }))
    await expect(page.locator("[data-asset-picked]")).toHaveCount(0)
    await record(measure, "transfer form, a broken asset removed for a holder", testInfo)

    // The route refuses the same under the asset field (a stale tab or an API caller), and nothing changes.
    const refused = await page.request.post(`/api/assets/${asset.id}/transfer`, {
      data: { toLocationId: "", toCustodianId: receiver.id, toDepartmentId: "", reason: `${asset.assetTag} ให้ผู้ถือครองใหม่`, remark: "" },
    })
    const refusal = (await refused.json()) as { code?: string; fieldErrors?: Record<string, string> }
    expect([refused.status(), refusal.code, refusal.fieldErrors?.assetId]).toEqual([409, "ASSET_TRANSFER_CONDITION_BLOCKED", "transferConditionDamaged"])
    expect((await readAsset(page, asset.id)).custodianId).toBeNull()

    // Another room needs no holder: it saves, and the asset keeps no holder, its status and its department.
    await visit(measure, path, "transfer form, a broken asset, room only", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expect(transferNowCell(page, "holder")).toContainText(TX_WORDS.noneNow)
    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ย้ายเข้าห้องเก็บ`)
    // One change; the holder and the department stay (§9.3): the card's lead, or the phone's footer line.
    const changes = e2eDevice === "desktop" ? page.locator('[data-slot="operation-summary-card"] [data-summary-lead]') : page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })
    await expect(changes).toContainText(templatePattern(TX_WORDS.transferLead, { count: "1" }))
    await expect(changes).toContainText(TX_WORDS.transferKeptBoth)
    await saveTransferForm(page, asset.id)
    const after = await readAsset(page, asset.id)
    expect([after.currentLocationId, after.custodianId, after.status.name, after.departmentId]).toEqual([room.id, null, "Ready", data.departmentId])
  })
})
```
  - The `transfers` map, its key and its value shape stay as HEAD's, since TX-A4, TX-A6 and the ข้อมูลเก่า test read them.
  - TR1 drops HEAD's hand-made `waitForResponse`, the `measure.timed("transfer save", …)` and the two `"บันทึก"` clicks. The field-errors test still times "transfer save".

- [ ] **Step 5: TX-A8 and the field-error test.**
  - **`findings.spec.ts`:**
    - after the `./tx-support.ts` import (`:6`), add `import { TX_WORDS } from "./tx-words.ts"`;
    - `:39` becomes `await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()`.
    - The custodian pick by `/^ผู้ถือครองปลายทาง/` stays: it keeps the picker's accessible name checked on the phone.
  - **`field-errors.spec.ts`:** `:203` and `:208`, `await save(page)`, both become `await reviewAndSave(page)`. Nothing else in the test changes:
    - `choose(...)` by role name;
    - the dialog and confirm;
    - `measure.timed("transfer save", …)`;
    - the `toHaveURL` line;
    - the custodian read-back.

- [ ] **Step 6: Run the pins, the repo checks and the list.**
  - Run `node --test tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-asset-detail.test.ts tests/e2e-fixes.test.ts tests/e2e-review.test.ts tests/e2e-suite.test.ts`. Expected: PASS.
  - Then `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS with 0 lint errors. `tsc` covers `e2e/`.
  - Then `npx playwright test e2e/transactions/transfer.spec.ts e2e/transactions/findings.spec.ts e2e/cross-cutting/field-errors.spec.ts --list`.
    - It prints the titles only and runs nothing. The config's env guard reads the env files itself; never print them.
    - Expected: `transfer.spec.ts` lists 8 tests in each of the four projects (desktop-light, desktop-dark, phone-light, phone-dark), and no error.
  - Check the line endings: `file e2e/transactions/transfer.spec.ts e2e/transactions/tx-support.ts e2e/transactions/findings.spec.ts tests/e2e-transactions.test.ts` says "with CRLF line terminators" for each.
  - Run no test run and no build. The controller builds and runs the specs (Step 10). Your report names anything in the specs you could not check without a run.

- [ ] **Step 7: Commit the E2E.**
```bash
git add e2e/transactions/transfer.spec.ts e2e/transactions/tx-support.ts e2e/transactions/tx-words.ts e2e/transactions/findings.spec.ts e2e/cross-cutting/field-errors.spec.ts tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts
git commit -m "test(e2e): โอนย้าย through the footer: the แผนก row locked to the holder, a reason chip, the summary and the footer line, the holder's department read back with its history line and the TR-'s แผนกเดิม; a held asset moved only to another room, a ส่วนกลาง asset that keeps its department, a component that follows, a broken asset refused a holder (group 3 plan 3 task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: The docs.**
  - Name every file, function, code, key and word as T1-T6 committed them: read `git log --stat 5176554f..HEAD`, then the files.
  - Leave no template marker. These tests reject them:
    - `tests/e2e-docs.test.ts:34` (`<today>`, `<N>`);
    - `shell-docs.test.ts:36` (`<run id>`, `<commit>`, `<plan file>`);
    - `phase2d-docs.test.ts:100` (also `<P3>` / `<P3F>`);
    - `dark-mode-docs.test.ts:128`, `v-track-docs.test.ts:28`.
  - Write the date in. Place-holders such as `<tag>` or `<แผนก>` inside quoted UI words are fine, as plan 2's docs use them.
  - Keep CRLF in `docs/05`, `docs/11`, `docs/12` and `DESIGN.md`.
  - **`docs/99_CHANGELOG.md`:** add `### กลุ่มหน้า 3 แผน 3: หน้าโอนย้ายและแผนกของการโอนย้าย` under the commit date's `## ` heading. When that date is 2026-10-31 it goes above plan 2's `###`; otherwise it goes under a new `## YYYY-MM-DD` heading above `## 2026-10-31`. In Thai, in plan 2's shape, it covers:
    - the branch `feat/group3-tx-transfer` (ต่อจาก `feat/group3-tx-checkin` `5176554f` ซึ่งยังไม่ merge), the spec (§5, §6, §9, §13, §17, §19's question) and the plan `docs/superpowers/plans/2026-10-31-group3-tx-transfer.md` (ข้อตัดสิน P3-R1 ถึง P3-R23);
    - **แผนกตอนโอนย้าย (spec §6, P3-R2, P3-R3, P3-R7):**
      - `getTransferDepartmentSource` / `getTransferNextDepartmentId` in `src/lib/asset-department-rule.ts`, the one rule the route and the page call:
        - a new holder: their department;
        - a holder now and none chosen: the current holder's, read even when they have left, which also corrects an old mismatch on a room-only move (call 4);
        - no holder: the chosen department, or unchanged;
        - ส่วนกลาง and ส่วนควบ: free (`keepsOwnDepartment`).
      - An inactive department on an active new holder is written as it is (call 5).
      - A change writes `department_change` (referenceType `transfer`), so "เปลี่ยนแผนก" shows beside the transfer line in the history.
      - The components that travel follow. Cancelling the TR- restores the department from the snapshot.
    - **ปลายทางเท่าค่าเดิมไม่นับ (P3-R4):**
      - `normalizeTransferDestinations`, `hasTransferChange` and `sameTransferDestinations` in `src/lib/transfer-rules.ts`, used by the route and the page;
      - nothing left → 400 `transferDestinationRequired` under ที่ตั้งปลายทาง;
      - a set that changed inside the transaction → 409 `ASSET_CHANGED_DURING_OPERATION`;
      - the picker marks the current option "ตอนนี้" and does not offer it.
    - **route โอนย้าย** `POST /api/assets/[id]/transfer` (P3-R1, P3-R5, P3-R6):
      - a broken asset (เสียหาย ใช้งานไม่ได้ ซาก) with a new holder: 409 `ASSET_TRANSFER_CONDITION_BLOCKED` under the asset field (`transferConditionDamaged` / `NonFunctional` / `Salvage`);
      - a department sent while it follows the holder: 409 `ASSET_TRANSFER_DEPARTMENT_LOCKED`, a toast and a re-read, no field error;
      - an inactive room, employee or department: 409 `ASSET_TRANSFER_DESTINATION_INACTIVE` under every failing field, with ส่งมอบ's words;
      - all checked before and inside the transaction, before the TR- number;
      - `logAudit` gains `previousDepartmentId`; its `departmentId` is the rule's value;
      - it still never writes `branchId` or the asset tag.
    - **ใบ TR- (P3-R8):** the "แผนกเดิม" row before "แผนก". The cancel dialog still shows status · room.
    - **ข้อมูลของหน้า (P3-R9):**
      - the detail's `holderId`, `holderActive`, `holderDepartmentId`, `holderDepartmentName`, `ownerBranchId`;
      - the master-option flags `employeeDepartment` and `locationBranch`, used by โอนย้าย only;
      - the preselect with the detail.
    - **ชิ้นส่วนกลาง (P3-R11):** `SearchableSelect` `currentValue` / `currentMark` / `labelVisuallyHidden`, and `OperationSummaryCard` `lead`.
    - **หน้าโอนย้าย, desktop:**
      - the three sections and the ตอนนี้ → ปลายทาง table: "code - name", the room with its branch, "(พ้นสภาพ)" for a holder who left;
      - the locked แผนก row "ตามผู้ถือครอง: …" (before an asset is chosen it reads "เลือกทรัพย์สินก่อน"), and choosing a holder clears a picked department;
      - the components line under the table, and the notices for components with their own handover and outstanding ones;
      - the four chips and the hint;
      - the card: the lead "เปลี่ยน N อย่าง: …", "ผู้ถือครองและแผนกคงเดิม", the rows, the next status, the components, the cross-branch line by branch id;
      - the footer line and the footnote;
      - the review: real changes only;
      - the re-read before the review, the failed-read notice with ลองอีกครั้ง, and the toast + re-read on the two 409s.
    - **หน้าโอนย้าย, phone:** the stacked rows with "ตอนนี้: …", the short ปรับโครงสร้าง (it still writes the full word), the footer's lead line, and the warnings above the bar.
    - **E2E:**
      - `transfer.spec.ts`: 8 tests in four projects. TR1 through the footer, with the locked row, a chip, the summary or the footer line, the department read back, เปลี่ยนแผนก and แผนกเดิม. TX-A4, TX-A6 and the ข้อมูลเก่า row. TR2 call 4. TR3 ส่วนกลาง. TR4 a component. TR5 a broken asset (removed with its reason, refused 409 by the route, moved room).
      - The field-errors transfer test and TX-A8 use ตรวจสอบและบันทึก.
      - The helpers `saveTransferForm`, `pickTransferHolder`, `transferNowCell`, `centreInView`, `readConditionId`; `createAsset` / `createTxAsset` take `custodianId` and `conditionId`.
      - +20 assets per run. No department, room or employee is made.
      - What is left to unit tests and UAT: this task's "Not driven" list.
    - **เรื่องที่ผู้ใช้ควรตรวจ** (P3-R1 first):
      - P3-R1: a broken asset is refused only for a new holder, a room or department move is allowed, and the asset page then shows โอนย้าย disabled for a broken บุคคล asset (a room move starts from the menu's โอนย้าย);
      - spec §14 calls 4, 5, 6, 17 and 18;
      - D21: a พร้อมใช้งาน asset still carrying an old holder (ข้อมูลเก่า), moved only to another room, takes that holder's department;
      - P3-R2: a ส่วนควบ moved on its own keeps a free department, with no warning when it is still installed;
      - P3-R14: components with their own handover, and outstanding ones, named in notices (the spec only says "not listed");
      - P3-R12: the lead counts the department the holder's corrects;
      - P3-R13: the cross-branch line is for the room only;
      - P3-R7: the department shows twice in the history;
      - Y12: the chip "เปลี่ยนผู้ใช้งาน" is the spec's word (§9.3, decision 6); ask whether "เปลี่ยนผู้ถือครอง" is preferred (the glossary's word for the person who holds the asset).
    - **บันทึกไว้ (P3-R20, P3-R22, Y8):**
      - the page re-sends no expected department. A change of the holder's department in HR between the page load and the save is written as the server reads it.
      - A transfer to a holder makes no HO-, and the asset comes back through รับคืน's ข้อมูลเก่า row.
      - A holder picked before the asset: the picker's list and the pick-time read judge the asset as given to that holder (the raw pick, since the asset's own holder is not known yet). So an asset that holder already holds and that is รอซ่อม or broken is refused at the pick, until the holder is cleared or the asset is picked first.
    - "ยังไม่ deploy · ไม่มี migration".

    The controller adds "ผล E2E".
  - **`DEVELOPER_HANDOFF.md`:**
    - **`:1296`** (the addendum's sub-bullet) becomes: "โอนย้าย has no condition input. Plan 3 answered A1-R3 (P3-R1): a transfer refuses a broken asset only when it gives the asset a new holder (409 `ASSET_TRANSFER_CONDITION_BLOCKED`); a room-only or department-only move of it is allowed."
    - **After plan 2's last sub-bullet** ("Calls for the user to check", before `## Open Go-Live Decisions`), add a bullet "Page group 3, plan 3: โอนย้าย." in plan 2's shape.
      - The opening sub-bullet: the date, branch `feat/group3-tx-transfer` stacked on `feat/group3-tx-checkin` at `5176554f` (not merged), "Not deployed, no migration", the spec sections and the plan with rulings P3-R1 to P3-R23.
      - Then the sub-bullets **Department rule**, **Equal-to-current**, **Transfer route**, **TR- page**, **Data**, **Shared parts**, **โอนย้าย page** (desktop, then phone), **E2E**, **Recorded (P3-R20, P3-R22, Y8)** and **Calls for the user to check**. Their content is the changelog's, in English, with the same names and codes: **Transfer route** says "`logAudit` gains `previousDepartmentId`; its `departmentId` is the rule's value" (Y15), **Recorded** carries the holder-picked-first item (Y8), and **Calls for the user to check** ends with the chip word, "เปลี่ยนผู้ใช้งาน" (spec §9.3, decision 6) or "เปลี่ยนผู้ถือครอง" (Y12).
      - The controller adds the E2E result line after the run.
    - **Under `## Open Go-Live Decisions`**, after the plan-2 line (`:1331`), add: "Before deploying page group 3: read on Production (SELECT only, with the full SQL shown to the user) how many held assets have a department other than their holder's (group 3 spec §15). From plan 3 a transfer of such an asset writes the holder's department, even a room-only move (spec §14 call 4); correcting the rest at once is a Production write that needs the user's approval."
  - **`docs/05_ASSET_LIFECYCLE.md`:**
    - **`:123`** (the Transfer bullet) becomes:
      - "Transfer requires `asset:edit`, blocks assets that already have an active checkout, refuses License assets (409 `ASSET_LICENSE_MOVE_NOT_ALLOWED`) and an outstanding component (409 `ASSET_COMPONENT_OUTSTANDING`), and accepts personal custody assignment only from `Ready` or `In Use`; `Under Inspection` therefore remains blocked.
      - The destinations are normalized first (`normalizeTransferDestinations`, `src/lib/transfer-rules.ts`, group 3 plan 3): a room, holder or department equal to the asset's current one is dropped, so a re-picked current holder neither assigns nor changes the status. Nothing left answers 400 `transferDestinationRequired` under `toLocationId`. A set that differs inside the transaction answers 409 `ASSET_CHANGED_DURING_OPERATION`.
      - A transfer with a normalized `toCustodianId` resolves the required `In Use` status server-side and updates it atomically with the new custodian; location-only or department-only transfers preserve the current status.
      - With a new holder, a broken asset (`Damaged`, `Non-functional`, `Salvage`, by `getCheckoutConditionBlock`) is refused with 409 `ASSET_TRANSFER_CONDITION_BLOCKED` under the asset field (P3-R1); a move without one is allowed.
      - The destination room, the new holder and a chosen department must exist and be active: 409 `ASSET_TRANSFER_DESTINATION_INACTIVE`, with every failing field at once.
      - Each refusal is checked before and inside the transaction, before the TR- number."
    - **A new bullet after it:**
      - "Transfer sets the department by `getTransferNextDepartmentId` (`src/lib/asset-department-rule.ts`, group 3 spec §6; `getTransferDepartmentSource` says where it comes from):
        - a บุคคล or Stock asset takes the new holder's department;
        - with no new holder, an asset that has a holder takes that holder's department. The holder is read even when they have left, and this also corrects an old mismatch on a room-only move (spec §14 call 4);
        - an asset with no holder takes the chosen department or keeps its own;
        - ส่วนกลาง and ส่วนควบ assets keep a free department (P3-R2).
      - While the department follows a holder, a different `toDepartmentId` answers 409 `ASSET_TRANSFER_DEPARTMENT_LOCKED` with no field error, since the field is locked on the page.
      - An inactive department on an active new holder is written as it is (spec §14 call 5).
      - A change writes a `department_change` movement (referenceType `transfer`, the TR- id) after the `transfer` movement. The installed components follow through `syncInstalledComponentsWithParent`, and cancelling the TR- restores the department from the snapshot.
      - The transfer never writes `branchId` or the Asset Tag."
    - **After `:141`, two bullets:**
      - "A transfer destination equal to the current value is not a change (group 3 spec §9.2, §14 call 17); the page marks the current option ตอนนี้ and does not offer it."
      - "A broken asset is not given a new holder by a transfer (P3-R1); it moves room or department without one."
  - **`docs/06_WORKFLOWS.md`:**
    - **The shared picker bullet** ("Check-out, Check-in, Transfer and Bulk move pick their assets in one shared picker …"): after its last sentence ("… Asset Detail's โอนย้าย reads the custodian rule and stays disabled for it."), add: "A broken asset (เสียหาย, ใช้งานไม่ได้, ซาก) is the same since group 3 plan 3: it moves with no holder chosen, is cleared with "นำ … ออกแล้ว: <reason>" when one is, and Asset Detail's โอนย้าย is disabled for a broken บุคคล asset (P3-R1)."
    - **After the รับคืน page bullet** ("The รับคืน page (group 3 plan 2) …"), add a bullet "The โอนย้าย page (group 3 plan 3)" in its shape:
      - three sections (ทรัพย์สิน, เปลี่ยนอะไร, เหตุผล) beside "สรุปก่อนบันทึก";
      - the table of ที่ตั้ง, ผู้ถือครอง and แผนก. ตอนนี้ reads "code - name": the room with its branch, and a holder who left with "(พ้นสภาพ)". ปลายทาง is a searchable picker with "ไม่เปลี่ยนแปลง" and ×, and the current option is marked ตอนนี้ and cannot be picked;
      - the แผนก row "ตามผู้ถือครอง: <แผนก>", locked while the asset has a holder or one is chosen (free for ส่วนกลาง and ส่วนควบ). Before an asset is chosen the row reads "เลือกทรัพย์สินก่อน", and while the asset's detail is loading or failed it stays disabled. Choosing a holder clears a picked department;
      - "ส่วนควบ N รายการ (…) ย้ายตามไปด้วย" under the table, and the components with their own handover and the outstanding ones named in section 1;
      - the chips ย้ายสาขา / เปลี่ยนผู้ใช้งาน / ปรับโครงสร้างแผนก / อื่น ๆ, which write "<chip>: " at the start of the required text; อื่น ๆ only focuses it;
      - the card's lead "เปลี่ยน N อย่าง: …" (plus "ผู้ถือครองและแผนกคงเดิม"), the rows, the next status, the components, and for a room in another branch "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ <สาขา> ตามเดิม";
      - the footer "โอนย้าย <tag>: …". "ตรวจสอบและบันทึก" reads the asset again, then opens "ตรวจสอบก่อนโอนย้าย" (real changes only), which saves and opens the TR-;
      - on the phone, the rows stack with "ตอนนี้: …" above each picker, the chip reads ปรับโครงสร้าง, and the footer carries the "เปลี่ยน N อย่าง" line.
    - **The Transfer bullet** ("Transfer records location/custodian/department movement. …") becomes:
      - "Transfer records location/custodian/department movement. Choosing a destination custodian other than the current one sets the asset status to `In Use` in the API transaction; location-only or department-only transfers keep the current status.
      - The department follows the transfer rule (`getTransferNextDepartmentId`): a บุคคล or Stock asset takes the new holder's department, or the current holder's when no new one is chosen; ส่วนกลาง and ส่วนควบ keep a free department. A change has its own เปลี่ยนแผนก history line beside the transfer's.
      - The TR- prints แผนกเดิม and แผนก.
      - A transfer to a holder still creates no handover, so the asset later returns through รับคืน's ข้อมูลเก่า row (P3-R22)."
  - **`docs/07_UAT_CHECKLIST.md`:** before `## Sign-Off`, add `## Transactions Group 3 Plan 3 UAT (โอนย้าย, YYYY-MM-DD)` with the commit date written in.
    - It opens with what E2E covers, in all four projects:
      - `e2e/transactions/transfer.spec.ts`: TR1 with the locked แผนก row, a chip, the summary or the footer line, the department read back with เปลี่ยนแผนก and แผนกเดิม; a held asset moved only to another room; a ส่วนกลาง asset keeping its department; a component following its computer; a broken asset removed for a holder, refused by the route, and moved room; the TR- links, its custodian and the ข้อมูลเก่า row;
      - `e2e/cross-cutting/field-errors.spec.ts`: the empty reason;
      - `findings.spec.ts`: the phone's review.
    - Then the checks:
      - [ ] **For the user to decide first (P3-R1, spec §19's question):** โอนย้าย refuses a broken asset (เสียหาย, ใช้งานไม่ได้, ซาก) only when it goes to a new holder; a room-only or department-only move is allowed. The asset page then shows โอนย้าย disabled with the reason for a broken บุคคล asset, so its room move starts from the menu's โอนย้าย. Is that the rule wanted?
      - [ ] Desktop 1440, both themes:
        - the three sections and the table: ตอนนี้ with the room's branch, × on each picker, the current option marked ตอนนี้ and not selectable;
        - the locked แผนก row, and the chips with their pressed state and the hint;
        - the card's lead, rows (bold when changed), status, components and footnote;
        - the footer line, and ยกเลิก.
      - [ ] Phone (iOS Safari, Android Chrome):
        - the rows stacked with "ตอนนี้: …";
        - the short ปรับโครงสร้าง chip writing the full "ปรับโครงสร้างแผนก: ";
        - the footer line and the warnings above the bar;
        - the chips and the reason are not hidden under the bar with the keyboard open.
      - [ ] Cross-branch, on dev: choose a room in another branch. The card (on the phone, the block above the bar) reads "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ <สาขา> ตามเดิม". A holder from another branch with a room in the same branch shows nothing. After saving, the asset's company, branch and Asset Tag are unchanged.
      - [ ] On dev, an inactive destination: pick a room, a holder and a free department, then deactivate one of them in another tab as an admin and save.
        - The save is refused under that field, in ส่งมอบ's words.
        - A holder whose department is inactive is still accepted, and the asset takes that department (spec §14 call 5).
        - Reactivate it afterwards.
      - [ ] A held asset whose holder has left: the ตอนนี้ cell reads "(พ้นสภาพ)", and the แผนก row follows that holder's department.
      - [ ] For the user to confirm (D21): a พร้อมใช้งาน asset still carrying an old holder (ข้อมูลเก่า), moved only to another room, takes that holder's department.
      - [ ] Cancel a TR- that changed the department (from the TR- page): the department, room, holder and status come back, and the history shows ยกเลิกการโอนย้าย.
      - [ ] A page left open while the asset gets a holder elsewhere: the save is refused with a toast and the page reads the asset again, with no field error.
      - [ ] A holder picked before the asset (Y8): choose ผู้ถือครองปลายทาง first, then an asset that employee already holds and that is รอซ่อม or broken. The pick is refused with its reason, as if the asset were going to a new holder. Clear the holder, or pick the asset first: it is then taken, and the holder picker shows that employee as ตอนนี้.
      - [ ] A computer with a component on its own handover, and one left out of a return: section 1 names each in its notice, and neither moves.
      - [ ] Open โอนย้าย from the menu with no asset: the แผนก row is disabled and reads "เลือกทรัพย์สินก่อน"; after picking an asset it follows the holder or becomes free.
      - [ ] The VPN dropped after the pick (the detail read failed): the card (on the phone, the block above the bar) reads "อ่านข้อมูลสรุปไม่สำเร็จ" with ลองอีกครั้ง, the แผนก row stays disabled, and the review does not open.
      - [ ] A transfer to a holder creates no handover: the asset returns through รับคืน's ข้อมูลเก่า row (P3-R22).
      - [ ] NVDA and VoiceOver on the table (each picker named ที่ตั้งปลายทาง / ผู้ถือครองปลายทาง / แผนกปลายทาง), the chips group and the card; an English pass.
  - **`docs/11_FEATURE_LIST.md`:**
    - **`:152`:** "| Transfer | Move an asset's location, custodian and department in one controlled operation: destinations equal to the current value are ignored, the department follows the transfer rule (the holder's for บุคคล and Stock, free for ส่วนกลาง and ส่วนควบ), inactive destinations are refused, a broken asset is not given a new holder, and the TR- prints แผนกเดิม |".
    - **`:170`:** "- Personal transfer accepts only `Ready` or `In Use` and blocks assets with an active checkout; location-only or department-only movement preserves the current status. A destination equal to the current value is not a change, and a broken asset (เสียหาย, ใช้งานไม่ได้, ซาก) is not given a new holder."
  - **`docs/12_HANDOUT.md` `:50`:** "- โอนย้ายที่ตั้ง ผู้ถือครอง และแผนก เลือกเฉพาะสิ่งที่จะเปลี่ยน ค่าเดิมไม่นับเป็นการเปลี่ยน แผนกของทรัพย์สินบุคคลและ Stock ตามผู้ถือครอง (ทรัพย์สินส่วนกลางเลือกแผนกเองได้) ปุ่มเหตุผลเติมข้อความตั้งต้นให้แก้ต่อ ทรัพย์สินที่สภาพเสียโอนให้ผู้ถือครองใหม่ไม่ได้แต่ย้ายที่ตั้งได้ และใบโอนย้ายมีแผนกเดิม".
  - **`DESIGN.md` `:550`** (Y13): in the frame's sentence, "`summaryOnPhone={false}` hides the summary column below `lg` while the bar stays (รับคืน, spec §8.8)" becomes "… while the bar stays (รับคืน, spec §8.8, and โอนย้าย, spec §9.4)". The rest of the bullet stays: `tests/operation-form-parts-ui.test.ts:72-89` reads its phrases, `` `summaryOnPhone={false}` `` among them. `docs/14_UI_UX_DESIGN_SYSTEM.md:104` names no `summaryOnPhone` and stays as it is.

- [ ] **Step 9: Run the checks and commit the docs.**
  - Run `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS.
  - The docs pins still find their text: `e2e-docs`, `shell-docs`, `phase2d-docs`, `dark-mode-docs`, `v-track-docs`, `audit-round-cancellation` (`:144-157`), and `operation-form-parts-ui` (`:72-89`, DESIGN.md's frame bullet).
```bash
git add docs/99_CHANGELOG.md DEVELOPER_HANDOFF.md docs/05_ASSET_LIFECYCLE.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/12_HANDOUT.md DESIGN.md
git commit -m "docs: page group 3 plan 3 (โอนย้าย, the transfer's department rule, destinations equal to the current value, the broken-asset answer, the TR-'s แผนกเดิม): changelog, handoff, lifecycle rules, workflows, UAT, feature list, handout, the frame's summaryOnPhone in DESIGN.md (group 3 plan 3 task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10 (the controller): the run and the round notes.**
  - **Before the run:** the VPN, `scratchpad/stay-awake.ps1`, the DB probe, and a clean build (`rm -rf .next && npm run build`).
  - **The run:** `npx playwright test e2e/transactions e2e/cross-cutting e2e/asset-detail e2e/smoke`, in all four projects.
    - Expected: every test passes, with axe 0.
    - `transfer.spec.ts` runs 8 tests per project. AD2 still shows its three documents.
  - **Docs:** add "ผล E2E" (the run id, and passed / failed / skipped per project) to the changelog entry, and the run id to the handoff bullet, in one commit.
  - **Round notes, not in the repo's code:**
    - the wiki's `ams-status`;
    - `ams-open-questions`:
      - P3-R2's drift (a ส่วนควบ moved on its own while still installed);
      - spec §15's Production count of held assets in another department;
      - P3-R20's HR window;
      - P3-R1, D21 and the chip word (Y12) until the user answers;
    - `ams-log`;
    - then `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` (at `D:\Obsidian\Eltross`), and the vault commit with `ingest:`.

---

## Appendix: the controller's rulings on the cross-check of the drafts (Y1-Y21)

Three cross-checks (interfaces, coverage, realism) read the seven drafts against each other, the spec and the code; a fourth checked the fixes. These are the calls made on their findings and on the drafters' notes. The task texts above already apply them; each ruling names the tasks it changed.

- **Y1 (B1 everywhere: two `TransferWords`):** T5's `TransferWords` type wins (its 18 tests ran green on a prototype). T6 builds exactly T5's object: `statusUnchanged`, `summaryComponentsMove(count)`, `summaryComponentsOutstanding(count)`, `summaryLead(count, list)`, `summaryHolderDepartmentKept`, `summaryCrossBranch(branch)`, `footerDescription(tag, changes)`, `nextStatus`, `componentsMove(count, list)`, `componentsStaying(list)`, `componentsOutstanding(count, list)`, `outstandingLine: { with, since }`, plus every other field T5's type has, and the new `departmentChooseAssetFirst` (Y5). Drop `pending` and the key `transfer.nowPending`; T5's `TRANSFER_NOW_PENDING = "…"` stays. T6's Consumes block becomes T5's Produces text verbatim; T6 test 2's word pins follow T5's names. **Tasks:** T5 (add `departmentChooseAssetFirst`), T6.
- **Y2 (B2: the status twice in the review):** the status comes only from T5's `buildTransferReviewDetails` (its last item). T6 drops `statusNext` and its own `nextStatus` item: `details: [...transferReviewDetails, { key: "reason", label: t("reason"), value: values.reason }]`. **Tasks:** T6.
- **Y3 (B3: `transferReviewComponents`):** the review's components line is label "ส่วนควบ" + value `transfer.summaryComponentsMove` (T5/T6's shape). P3-R18's "ส่วนควบย้ายตาม {count}" is superseded. T7 removes `TX_WORDS.transferReviewComponents` (Step 0 table, Step 3b, Consumes, notes, docs text that quotes it); TR4 asserts `await expect(valueBeside(review, "ส่วนควบ")).toHaveText(fillTemplate(TX_WORDS.transferSummaryComponents, { count: 1 }))`. **Tasks:** T7.
- **Y4 (the component lines built twice):** T6 renders T5's `transferComponentLines(transferChoice, transferWords)`: `.staying` (info Notice, section 1, `data-transfer-staying`), `.outstanding` (warning Notice, section 1, `data-transfer-outstanding`), `.travelling` (`<p data-transfer-components>` under the table), each hidden when null. T6 drops its imports of `checkoutComponents`, `checkoutOutstandingComponents`, `checkoutOutstandingLines` (keeps `withCheckoutAssetDetail`, `CheckoutDetailState`) and rewrites test 3's pins to `componentLines.*`. T7's Step 0 grep follows. **Tasks:** T6, T7.
- **Y5 (the "not ready" contract):** T5's semantics stand: no row, a row without `detail`, or `"failed"` → not ready: department locked and dropped, location and holder picks passed through raw (`""` → null), `departmentSource` null; a same-asset re-read in `"loading"` that still carries `row.detail` stays ready (no flicker on submit). New: when **no asset** is chosen, `transferDepartmentLockText` returns `words.departmentChooseAssetFirst` "เลือกทรัพย์สินก่อน" (en "Choose the asset first"), so the disabled แผนก row says why; with an asset whose detail is loading or failed it returns null and the placeholder stays "ไม่เปลี่ยนแปลง". T6 adds the key `transfer.departmentChooseAssetFirst` and renders `placeholder={lockText ?? t("noChange")}`. T6 rewrites its "What this task relies on" bullets, its `dropsDepartment` comment and note 2 to these rules. **Tasks:** T5 (a test for the no-asset text), T6.
- **Y6 (one word source):** T6's change file is the only source of message values. Values: `transfer.summaryComponentsMove` = "ย้ายตาม {count} รายการ"; the outstanding count **reuses** `checkout.summaryComponentsOutstanding` "ค้างคืน {count} รายการ" through `tAll` (T6 drops its own `transfer.summaryComponentsOutstanding`); the checklist's reason item reads `transfer.sectionReason` "เหตุผล". T5's words table is rewritten to name T6's keys and values (its tests keep their own fixture words, aligned to these values where they assert text). T7's `TX_WORDS.transferSummaryComponents` = "ย้ายตาม {count} รายการ". `transfer.summaryHolderDepartmentKept` is "ผู้ถือครองและแผนกคงเดิม" alone (no leading " · "; T5 joins it). **Tasks:** T5, T6, T7.
- **Y7 (repeated Thai):** reuse `assetOperation.summaryNow` for the picker mark (`currentMark={tOperation("summaryNow")}`) and `checkout.detailReadFailed` through `tAll`. Drop the new keys `assetOperation.currentMark` and `transfer.detailReadFailed`. T6's key count, its change file and test 8 follow. **Tasks:** T6.
- **Y8 (pick-time detail with the raw holder):** accepted (T6 note 3). Recorded: a holder picked before the asset judges the list and the pick-time read as an assignment, so an asset that holder already holds and that is Pending Repair or broken is refused until the holder is cleared or the asset is picked first. Goes in the docs' notes and UAT. **Tasks:** T7.
- **Y9 (after the submit re-read, validate again):** accepted (T6 note 4, T5 note 13): a pick that stopped being a change lands under `#transfer-to-location` instead of opening the review. The holder pick clears `toDepartmentId` only when the change computed with the new holder has `departmentSource === "newHolder"` (ส่วนกลาง and ส่วนควบ stay free, spec §9.2). **Tasks:** T6 (keep), T5 (keep).
- **Y10 (no `branchId`/`assetTag` write pinned):** T2's department-table test asserts the `asset.update` data keys are exactly `currentLocationId, custodianId, departmentId, statusId, updatedBy`. **Tasks:** T2.
- **Y11 (accepted deviations, recorded in the plan header's notes):** the E2E specs move in T7, one commit after the page (spec §17 says "same task"; no E2E runs in between); T2 reads the holders, room and department before judging the lock, refusal order unchanged (lock before inactive); the chip prefix is detected as "<word>:" with any spaces after the colon; the card's current room falls back to `row.locationLabel` ("code - name") only when the current room is inactive; an In Use asset given a new holder reads คงสถานะเดิม; the former-holder mark shows in the card's holder "now" too; the rows preview the implicit department correction before any destination is picked (the lead, footer and checklist still wait for a real change); no re-read on `ASSET_TRANSFER_CONDITION_BLOCKED` (the field error is enough). **Tasks:** none (header).
- **Y12 (chip word):** "เปลี่ยนผู้ใช้งาน" is the spec's word (§9.3, decision 6); T7's changelog and handoff user-check list add: ask whether "เปลี่ยนผู้ถือครอง" is preferred. **Tasks:** T7.
- **Y13 (DESIGN.md:550, docs/14:104):** T7's docs step adds "and โอนย้าย, spec §9.4" where `summaryOnPhone={false}` is named as รับคืน's only. **Tasks:** T7.
- **Y14 (`asset-actions.ts:62` comment):** T1 widens it to "ส่งมอบ refuses a broken or salvage asset, and โอนย้าย to a new holder (P3-R1)". **Tasks:** T1.
- **Y15 (`logAudit` wording):** T7's docs say "`logAudit` gains `previousDepartmentId`; its `departmentId` is the rule's value". **Tasks:** T7.
- **Y16 (Consumes blocks copy the producers):** T2 and T5 cite `normalizeTransferDestinations(sent: Partial<TransferDestinations>, current: TransferCurrentValues)`; T5 and T6 cite T3's `AssetOperationLocationBranchOption = AssetOperationNamedOption & { branchId: string; branchName: string }` and `AssetOperationEmployeeDepartmentOption` as T3 writes it; T6 cites T5's `TransferFormChoice` (with `departments: AssetOperationNamedOption[]`) and the exported `TransferSummaryRow`, `TransferCheck`, `TransferReviewDetail`. Delete T6's "names this task fixes" block. **Tasks:** T2, T5, T6.
- **Y17 (one import line):** T6 imports `{ appendReturnTo, getOperationCancelHref }` on one line, as checkout and checkin do, and rewrites `tests/e2e-fixes.test.ts:173` to `assert.match(form, /import \{ appendReturnTo(?:, getOperationCancelHref)? \} from "@\/lib\/asset-return-navigation"/)` in its commit (pin list and `git add`). **Tasks:** T6.
- **Y18 (citations):** T6 cites `CheckinAssetCard` by name only, and names the `tests/e2e-transactions.test.ts` loop by content ("the line `for (const page of ["transfer", "bulk-move"]) … getAssetOperationMasterOptions\(\)` (HEAD `:137`; moved 2 lines down by Task 3)"); T4 rewords the lead's comparison to "a `<p>` drawn only when given, as the footnote is"; T7 attributes the preselect `{ detail: true }` and the flags to T6 and the detail fields to T3; T1's sentence on the re-ask becomes "Task 6 sends the normalized holder as the picker's context and on the submit's re-read; the S-R40 re-ask keeps firing on a non-empty holder pick, and the picker's disabled current holder keeps that pick a real change." **Tasks:** T1, T4, T6, T7.
- **Y19 (English words of T2):** approved as drafted ("This asset cannot go to a new holder in its condition.", "The asset's holder has changed, so its department follows the holder. Check it and save again.", "Previous Department"). The three `transferCondition*` English values equal T1's verbatim. **Tasks:** none (check T2 = T1).
- **Y20 (accepted as drafted):** T1 notes 1-4 (Partial input; Readonly map; the two extra test files; a department equal to the stored one is dropped before the lock check — T2's lock test uses a department that differs from both the stored one and the holder's); T2 notes 1-3, 6-9; T3 notes 1-8 (Named location option; `:136` kept with a sibling pin; one overload for the pair); T4 notes 1-7 (pin at `:12`; `data-searchable-current` on the option; the three doc lines); T5 notes 3, 4, 6-10, 12; T6 notes 5 (minus `nowPending`), 6, 9, 10; T7 notes 1, 3-10 (`tests/e2e-cross-cutting.test.ts` added; +5 assets per project; the Go-Live SELECT line).
- **Y21 (the department picked before the detail is ready):** a holder picked while the detail is not ready (source null) clears a picked department too (`departmentSource !== "free"`), so a department the holder pick replaced cannot come back when the detail later locks the row and the holder is cleared (P3-R5). The cost: a ส่วนกลาง or ส่วนควบ pick made in that window is cleared as well and is picked again. **Tasks:** T6. Also: T7 names Y5's other two disabled states ("เลือกทรัพย์สินก่อน" before an asset is chosen; disabled while the detail is loading or failed) in its hooks, docs and UAT.
