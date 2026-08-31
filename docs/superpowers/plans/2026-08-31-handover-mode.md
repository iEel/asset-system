# Permanent Assignment And Temporary Loan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Check-out explicitly distinguish permanent employee assignment from temporary borrowing, derive `In Use` versus `Checked Out` safely, and backfill the two operator-confirmed active assignments without guessing historical records.

**Architecture:** Add one nullable persistence field to the existing `AssetCheckout` document and centralize mode rules in a small domain module consumed by validation, Checkout, Check-in, Data Quality, notifications, and presentation. Preserve the existing Check-out/Check-in routes, evidence, snapshots, cancellation, and print documents; use a guarded SQL Server migration for the two confirmed production records and leave completed legacy rows unclassified.

**Tech Stack:** Next.js 16.2.4 App Router, React 19, TypeScript 5, Prisma 7, SQL Server, Zod 4, `next-intl`, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-31-handover-mode-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, and `node_modules/next/dist/docs/01-app/02-guides/forms.md` before editing Next.js route, page, or form code.
- Do not apply the manual migration until the operator confirms a fresh verified backup and explicitly authorizes `migration:apply`.
- Preserve existing RBAC (`asset:edit` mutations, `asset:view` documents), serializable writes, snapshots, VOID history, component sync, return navigation, and evidence behavior.
- New Check-outs require an explicit mode; completed legacy Check-outs may retain `NULL` and must display as unspecified.
- Never infer permanent assignment from a missing expected-return date.
- Permanent assignment is valid only for `checkoutType = user`; temporary loan requires a date on or after the Check-out date.
- Use existing design tokens/components, Thai/English localization, visible focus, and 44px mobile targets; add no new navigation item or persistent Asset Register action.
- Preserve unrelated dirty `.agents`, `.codex`, `.impeccable`, `.superpowers`, and backup-plan files.

---

### Task 1: Central Handover-Mode Policy And Validation

**Files:**
- Create: `src/lib/asset-handover-mode.ts`
- Create: `tests/asset-handover-mode.test.ts`
- Modify: `src/lib/validations/asset-operations.ts`

**Interfaces:**
- Produces: `assetHandoverModes`, `AssetHandoverMode`, `getHandoverTargetStatusName()`, `getHandoverRequiredSourceStatusName()`, `isAssetHandoverMode()`, and `assertHandoverModeFields()`.
- Consumed by: Checkout/Check-in routes, option loaders, state-review detection, notifications, and presentation tasks.

- [ ] **Step 1: Write the failing domain-policy tests**

Create `tests/asset-handover-mode.test.ts` with explicit cases:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  assertHandoverModeFields,
  getHandoverRequiredSourceStatusName,
  getHandoverTargetStatusName,
} from "../src/lib/asset-handover-mode.ts"

test("derives status from explicit handover mode", () => {
  assert.equal(getHandoverTargetStatusName("permanent_assignment"), "In Use")
  assert.equal(getHandoverTargetStatusName("temporary_loan"), "Checked Out")
  assert.equal(getHandoverRequiredSourceStatusName("permanent_assignment"), "In Use")
  assert.equal(getHandoverRequiredSourceStatusName("temporary_loan"), "Checked Out")
})

test("permanent assignment requires a user and forbids a due date", () => {
  assert.doesNotThrow(() => assertHandoverModeFields({
    handoverMode: "permanent_assignment", checkoutType: "user",
    custodianId: "employee-1", checkoutDate: new Date("2026-08-31"), expectedReturnDate: null,
  }))
  assert.throws(() => assertHandoverModeFields({
    handoverMode: "permanent_assignment", checkoutType: "department",
    custodianId: null, checkoutDate: new Date("2026-08-31"), expectedReturnDate: null,
  }), /HANDOVER_PERMANENT_USER_ONLY/)
  assert.throws(() => assertHandoverModeFields({
    handoverMode: "permanent_assignment", checkoutType: "user",
    custodianId: "employee-1", checkoutDate: new Date("2026-08-31"), expectedReturnDate: new Date("2026-09-30"),
  }), /HANDOVER_PERMANENT_DUE_DATE_NOT_ALLOWED/)
})

test("temporary loan requires a non-past due date", () => {
  assert.throws(() => assertHandoverModeFields({
    handoverMode: "temporary_loan", checkoutType: "user",
    custodianId: "employee-1", checkoutDate: new Date("2026-08-31"), expectedReturnDate: null,
  }), /HANDOVER_TEMPORARY_DUE_DATE_REQUIRED/)
  assert.throws(() => assertHandoverModeFields({
    handoverMode: "temporary_loan", checkoutType: "user",
    custodianId: "employee-1", checkoutDate: new Date("2026-08-31"), expectedReturnDate: new Date("2026-08-30"),
  }), /HANDOVER_RETURN_BEFORE_CHECKOUT/)
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/asset-handover-mode.test.ts`

Expected: FAIL because `src/lib/asset-handover-mode.ts` does not exist.

- [ ] **Step 3: Implement the isolated policy module**

Create the module with these public definitions and stable error codes:

```ts
export const assetHandoverModes = ["permanent_assignment", "temporary_loan"] as const
export type AssetHandoverMode = (typeof assetHandoverModes)[number]

export type AssetHandoverModeErrorCode =
  | "HANDOVER_MODE_REQUIRED"
  | "HANDOVER_PERMANENT_USER_ONLY"
  | "HANDOVER_PERMANENT_CUSTODIAN_REQUIRED"
  | "HANDOVER_PERMANENT_DUE_DATE_NOT_ALLOWED"
  | "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED"
  | "HANDOVER_RETURN_BEFORE_CHECKOUT"

export function getHandoverTargetStatusName(mode: AssetHandoverMode): "In Use" | "Checked Out"
export function getHandoverRequiredSourceStatusName(mode: AssetHandoverMode): "In Use" | "Checked Out"
export function isAssetHandoverMode(value: unknown): value is AssetHandoverMode
export function assertHandoverModeFields(input: {
  handoverMode: AssetHandoverMode
  checkoutType: "user" | "department" | "location" | "asset"
  custodianId?: string | null
  checkoutDate: Date
  expectedReturnDate?: Date | null
}): void
```

Throw an `Error` whose message is exactly the stable code; API mapping remains in route code.

- [ ] **Step 4: Extend Zod validation with the required mode**

Import `assetHandoverModes`, add `handoverMode: z.enum(assetHandoverModes)`, and call `assertHandoverModeFields()` inside `assetCheckoutSchema.superRefine`. Map its stable error code to the relevant path (`handoverMode` or `expectedReturnDate`) so form/API errors identify the corrective field.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `node --test tests/asset-handover-mode.test.ts tests/asset-operation-status-policy.test.ts tests/asset-lifecycle-policy.test.ts`

Expected: all tests pass with zero failures.

- [ ] **Step 6: Commit the policy unit**

```powershell
git add src/lib/asset-handover-mode.ts src/lib/validations/asset-operations.ts tests/asset-handover-mode.test.ts
git commit -m "feat: define asset handover modes"
```

---

### Task 2: Prisma Schema And Guarded SQL Server Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/manual-migrations/2026-08-31-add-checkout-handover-mode.sql`
- Create: `tests/asset-handover-mode-schema.test.ts`

**Interfaces:**
- Consumes: the exact mode strings from Task 1 and the approved Asset Tag/document pairs from the spec.
- Produces: nullable `AssetCheckout.handoverMode`, SQL constraint, guarded two-record backfill, Movement/System Log evidence, and aligned authoritative after snapshots.

- [ ] **Step 1: Write failing schema and migration-contract tests**

The test must read the Prisma schema and migration text and assert exact safety properties:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const schema = readFileSync("prisma/schema.prisma", "utf8")
const migrationPath = "prisma/manual-migrations/2026-08-31-add-checkout-handover-mode.sql"

test("AssetCheckout stores nullable handover mode for legacy history", () => {
  const body = schema.match(/model AssetCheckout \{([\s\S]*?)\n\}/)?.[1] ?? ""
  assert.match(body, /handoverMode\s+String\?\s+@db\.NVarChar\(30\)/)
})

test("migration guards the exact approved active assignments", () => {
  const sql = readFileSync(migrationPath, "utf8")
  assert.match(sql, /GRL-COM-06-0001/)
  assert.match(sql, /HO-202606-0002/)
  assert.match(sql, /SNI-EQU-19-0336/)
  assert.match(sql, /HO-202608-0003/)
  assert.match(sql, /THROW/)
  assert.match(sql, /XACT_ABORT ON/)
  assert.match(sql, /permanent_assignment/)
  assert.match(sql, /temporary_loan/)
  assert.match(sql, /asset_movements/)
  assert.match(sql, /system_logs/)
  assert.match(sql, /afterSnapshotJson/)
  assert.doesNotMatch(sql, /UPDATE[\s\S]+WHERE \[expectedReturnDate\] IS NULL[\s\S]+COMMIT/i)
})
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test tests/asset-handover-mode-schema.test.ts`

Expected: FAIL because the field and migration file do not exist.

- [ ] **Step 3: Add the nullable Prisma field**

Add exactly:

```prisma
handoverMode String? @db.NVarChar(30)
```

Keep it adjacent to `checkoutType`. Do not add a Prisma enum because this repository uses SQL Server string workflow values and Zod/domain validation.

- [ ] **Step 4: Write the idempotent guarded migration**

The SQL must use `SET XACT_ABORT ON`, `BEGIN TRY/BEGIN TRANSACTION`, and `BEGIN CATCH/ROLLBACK/THROW`. It must:

```sql
IF COL_LENGTH('dbo.asset_checkouts', 'handoverMode') IS NULL
  ALTER TABLE [dbo].[asset_checkouts] ADD [handoverMode] NVARCHAR(30) NULL;
```

Then create a named check constraint if absent, lock the candidate rows with `UPDLOCK, HOLDLOCK`, populate a two-row table variable containing the exact approved Asset Tag/document pairs, and throw unless the database candidate set and every invariant match exactly. Resolve the active `In Use` status ID uniquely; update only those two Check-outs/assets; insert one movement and one System Log per asset using actor `migration:handover-mode-backfill`; preserve old after-snapshot JSON in the System Log; update `afterSnapshotJson.statusId` with SQL Server JSON functions only when `ISJSON(afterSnapshotJson) = 1` and the expected snapshot shape/status exists. Re-query all postconditions before commit.

- [ ] **Step 5: Run schema tests and Prisma validation**

Run:

```powershell
node --test tests/asset-handover-mode-schema.test.ts tests/asset-transaction-cancellation-schema.test.ts
npx prisma validate
npm run prisma:generate
```

Expected: all commands exit 0; the migration remains pending and is not applied.

- [ ] **Step 6: Confirm read-only migration status**

Run: `npm run migration:status`

Expected: the new file is `pending`; all previously accepted files remain `applied` with no checksum mismatch.

- [ ] **Step 7: Commit schema and pending migration**

```powershell
git add prisma/schema.prisma prisma/manual-migrations/2026-08-31-add-checkout-handover-mode.sql tests/asset-handover-mode-schema.test.ts
git commit -m "feat: add guarded handover mode schema"
```

Do not run `migration:apply` in this task.

---

### Task 3: Mode-Aware Check-out API And Form

**Files:**
- Modify: `src/app/api/assets/[id]/checkout/route.ts`
- Modify: `src/components/asset-operations/checkout-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Create: `tests/asset-handover-checkout.test.ts`
- Modify: `tests/asset-operation-confirmation-ui.test.ts`

**Interfaces:**
- Consumes: `AssetHandoverMode`, `getHandoverTargetStatusName()`, and Zod input from Task 1; Prisma field from Task 2.
- Produces: persisted mode, server-derived target status, explicit UI selection, conditional date input, and mode/status review summary.

- [ ] **Step 1: Read the repository-specific Next.js guides**

Read the three guide files named in Global Constraints completely before editing route/form code. Record no generated artifact.

- [ ] **Step 2: Write failing route and UI contract tests**

Cover these exact expectations:

```ts
test("checkout route persists mode and derives status server-side", () => {
  assert.match(routeSource, /handoverMode:\s*input\.handoverMode/)
  assert.match(routeSource, /getHandoverTargetStatusName\(input\.handoverMode\)/)
  assert.doesNotMatch(routeSource, /body\.set\("statusId"/)
})

test("checkout form requires an explicit user handover mode", () => {
  assert.match(formSource, /handoverMode:\s*""/)
  assert.match(formSource, /permanent_assignment/)
  assert.match(formSource, /temporary_loan/)
  assert.match(formSource, /values\.handoverMode === "temporary_loan"/)
})
```

Also assert Thai/English keys for mode label, permanent/temporary labels and helpers, resulting status, and the four recovery-oriented validation messages.

- [ ] **Step 3: Run focused tests and confirm RED**

Run: `node --test tests/asset-handover-checkout.test.ts tests/asset-operation-confirmation-ui.test.ts`

Expected: FAIL on missing persistence, derivation, selection, and translations.

- [ ] **Step 4: Implement server-derived Checkout state**

In the route:

- resolve `targetStatusName = getHandoverTargetStatusName(input.handoverMode)`;
- call `getRequiredAssetStatusId(targetStatusName)`;
- persist `handoverMode` on `AssetCheckout`;
- keep the current source eligibility (`Ready`), duplicate-active guard, transaction, snapshot, evidence, movement, component sync, and audit log;
- include `handoverMode` and `targetStatusName` in safe audit metadata;
- return stable error codes through the existing error response path.

- [ ] **Step 5: Implement the mode selection UX**

In `CheckoutForm`:

```ts
type HandoverModeSelection = "" | AssetHandoverMode
```

- Default user mode to `""` and require explicit selection.
- When destination type becomes non-user, set `temporary_loan` and render the mode as read-only context.
- When switching back to user, reset mode and due date so a prior choice is not silently reused.
- Render two accessible radio-card choices for user destination using existing border/background/focus tokens.
- Show expected-return date only for temporary mode and mark it required.
- Send `handoverMode` in `FormData`.
- Add mode and derived lifecycle status to `OperationReviewDialog`.
- Keep the existing primary button, evidence, signature, return navigation, and responsive layout.

- [ ] **Step 6: Add localized copy**

Under both `checkout` namespaces add matching keys for:

```json
{
  "handoverMode": "ลักษณะการส่งมอบ",
  "permanentAssignment": "มอบหมายใช้งานประจำ",
  "permanentAssignmentHelp": "ใช้งานต่อเนื่องโดยไม่มีกำหนดคืน",
  "temporaryLoan": "เบิกใช้งานชั่วคราว",
  "temporaryLoanHelp": "ยืมใช้และต้องส่งคืนภายในวันที่กำหนด",
  "resultingStatus": "สถานะหลังบันทึก"
}
```

Use equivalent concise English, plus localized messages for each stable validation error.

- [ ] **Step 7: Run focused tests and scoped lint**

Run:

```powershell
node --test tests/asset-handover-mode.test.ts tests/asset-handover-checkout.test.ts tests/asset-operation-confirmation-ui.test.ts tests/asset-transaction-snapshot-routes.test.ts
npx eslint "src/app/api/assets/[id]/checkout/route.ts" src/components/asset-operations/checkout-form.tsx src/lib/asset-handover-mode.ts src/lib/validations/asset-operations.ts
```

Expected: tests pass and ESLint exits 0.

- [ ] **Step 8: Commit Check-out behavior**

```powershell
git add "src/app/api/assets/[id]/checkout/route.ts" src/components/asset-operations/checkout-form.tsx messages/th.json messages/en.json tests/asset-handover-checkout.test.ts tests/asset-operation-confirmation-ui.test.ts
git commit -m "feat: choose permanent or temporary handover"
```

---

### Task 4: Mode-Aware Check-in And Current-Custody Summary

**Files:**
- Modify: `src/lib/asset-lifecycle-policy.ts`
- Modify: `src/lib/asset-operation-options.ts`
- Modify: `src/app/api/assets/[id]/checkin/route.ts`
- Modify: `src/components/asset-operations/checkin-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Create: `tests/asset-handover-checkin.test.ts`
- Modify: `tests/asset-operation-options.test.ts`
- Modify: `tests/asset-lifecycle-policy.test.ts`

**Interfaces:**
- Consumes: `getHandoverRequiredSourceStatusName()` and persisted `handoverMode`.
- Produces: active Checkout option data with mode, server-side mode/status eligibility, and read-only current-custody UI.

- [ ] **Step 1: Write failing mode-aware Check-in tests**

Add pure lifecycle coverage and route/UI contracts:

```ts
test("checkin requires the mode-authoritative source status", () => {
  assert.equal(getCheckinHandoverStatusError("permanent_assignment", "In Use"), null)
  assert.equal(getCheckinHandoverStatusError("temporary_loan", "Checked Out"), null)
  assert.equal(getCheckinHandoverStatusError("permanent_assignment", "Checked Out"), "ASSET_HANDOVER_STATUS_MISMATCH")
  assert.equal(getCheckinHandoverStatusError(null, "In Use"), "ASSET_HANDOVER_MODE_MISSING")
})
```

Assert option loading selects `handoverMode`, Check-in API loads asset status and validates the pair inside the transaction, and the form renders current-custody labels without an editable mode control.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test tests/asset-handover-checkin.test.ts tests/asset-operation-options.test.ts tests/asset-lifecycle-policy.test.ts`

Expected: FAIL because mode-aware Check-in policy and option data do not exist.

- [ ] **Step 3: Add mode-aware Check-in policy**

Export:

```ts
export function getCheckinHandoverStatusError(
  mode: AssetHandoverMode | null | undefined,
  currentStatusName: string | null | undefined,
): "ASSET_HANDOVER_MODE_MISSING" | "ASSET_HANDOVER_STATUS_MISMATCH" | null
```

Keep the existing allowed next statuses unchanged. Do not broaden generic `checkin` eligibility without the related active Check-out mode.

- [ ] **Step 4: Enrich operation options**

Select and return `handoverMode` for each active Checkout. Include short display label inputs: document number, mode, destination, start date, expected return, and asset status. Active null-mode records may remain visible but disabled with a review-required reason; they must not fall into legacy-return backfill because an active Checkout exists.

- [ ] **Step 5: Enforce the pair inside Check-in transaction**

The Check-in route must re-read the active Checkout and asset status inside its existing transaction, call `getCheckinHandoverStatusError`, and abort before document/evidence/asset/movement writes when invalid. Keep cancellation snapshots: the Check-in before snapshot captures `In Use` for permanent mode or `Checked Out` for temporary mode, so cancelling Check-in restores the correct state and reopens the same Checkout.

- [ ] **Step 6: Render the read-only current-custody summary**

Above return-decision fields, show a compact `FormContextBanner`/structured panel containing document, short custody type (`ใช้งานประจำ` / `เบิกชั่วคราว`), destination, start date, optional expected return, and current status. Do not add a mode input. For null legacy history use the approved unspecified label.

- [ ] **Step 7: Run focused regressions**

Run:

```powershell
node --test tests/asset-handover-checkin.test.ts tests/asset-operation-options.test.ts tests/asset-lifecycle-policy.test.ts tests/legacy-checkin-flow.test.ts tests/asset-transaction-cancellation-service.test.ts tests/asset-transaction-cancellation-routes.test.ts
npx eslint src/lib/asset-lifecycle-policy.ts src/lib/asset-operation-options.ts "src/app/api/assets/[id]/checkin/route.ts" src/components/asset-operations/checkin-form.tsx
```

Expected: all tests pass; ESLint exits 0.

- [ ] **Step 8: Commit Check-in behavior**

```powershell
git add src/lib/asset-lifecycle-policy.ts src/lib/asset-operation-options.ts "src/app/api/assets/[id]/checkin/route.ts" src/components/asset-operations/checkin-form.tsx messages/th.json messages/en.json tests/asset-handover-checkin.test.ts tests/asset-operation-options.test.ts tests/asset-lifecycle-policy.test.ts
git commit -m "feat: return permanent assignments safely"
```

---

### Task 5: Mode-Aware Asset State Review

**Files:**
- Modify: `src/lib/asset-state-review-types.ts`
- Modify: `src/lib/asset-state-review-detector.ts`
- Modify: `src/lib/asset-state-review-service.ts`
- Modify: `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/asset-state-review-types.test.ts`
- Modify: `tests/asset-state-review-detector.test.ts`
- Modify: `tests/asset-state-review-scan-service.test.ts`
- Modify: `tests/asset-state-review-resolution.test.ts`
- Modify: `tests/asset-state-review-ui.test.ts`

**Interfaces:**
- Consumes: persisted mode and `getHandoverRequiredSourceStatusName()`.
- Produces: separate `openPermanentAssignments`, `openTemporaryLoans`, `openUnknownHandovers`, new unknown-mode issue, and mode-correct status suggestions.

- [ ] **Step 1: Write failing detector and snapshot tests**

Extend the observed snapshot and assert:

```ts
assert.deepEqual(issueTypes(snapshot({
  statusName: "In Use", openCheckouts: 1, openPermanentAssignments: 1,
})), [])
assert.deepEqual(issueTypes(snapshot({
  statusName: "Checked Out", openCheckouts: 1, openTemporaryLoans: 1,
})), [])
assert.deepEqual(issueTypes(snapshot({
  statusName: "Checked Out", openCheckouts: 1, openPermanentAssignments: 1,
})), ["open_checkout_status_mismatch"])
assert.deepEqual(issueTypes(snapshot({
  statusName: "In Use", openCheckouts: 1, openUnknownHandovers: 1,
})), ["open_checkout_mode_missing"])
```

Update all test snapshot builders with zero defaults for the three mode counts.

- [ ] **Step 2: Run state-review tests and confirm RED**

Run: `node --test tests/asset-state-review-types.test.ts tests/asset-state-review-detector.test.ts tests/asset-state-review-scan-service.test.ts tests/asset-state-review-resolution.test.ts tests/asset-state-review-ui.test.ts`

Expected: FAIL on missing fields/issue type and old count-only logic.

- [ ] **Step 3: Implement mode-specific snapshot loading**

Replace count-only Checkout grouping with a query/grouping that returns active Checkout `assetId` and `handoverMode`, then build all four counts without N+1 queries. Keep 250-asset paging. Add `open_checkout_mode_missing` to issue types and localized Data Quality labels.

- [ ] **Step 4: Implement detector and resolution targets**

- Valid permanent assignment requires `In Use`.
- Valid temporary loan requires `Checked Out`.
- Unknown active mode creates critical `open_checkout_mode_missing` with no automatic status target because mode must be corrected first.
- `checked_out_without_open_checkout` now means no active temporary loan.
- `open_checkout_status_mismatch` suggests `In Use` or `Checked Out` from the single authoritative active mode.
- Conflicting/multiple active mode counts produce critical metadata and no unsafe auto-resolution.

Keep stale-snapshot, reason length, movement, System Log, dismissal, and auto-close behavior.

- [ ] **Step 5: Run focused tests and scoped lint**

Run:

```powershell
node --test tests/asset-state-review-types.test.ts tests/asset-state-review-detector.test.ts tests/asset-state-review-scan-service.test.ts tests/asset-state-review-resolution.test.ts tests/asset-state-review-ui.test.ts tests/asset-state-review-api-validation.test.ts tests/asset-state-review-route-contract.test.ts
npx eslint src/lib/asset-state-review-types.ts src/lib/asset-state-review-detector.ts src/lib/asset-state-review-service.ts "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx"
```

Expected: all tests pass and ESLint exits 0.

- [ ] **Step 6: Commit governance changes**

```powershell
git add src/lib/asset-state-review-types.ts src/lib/asset-state-review-detector.ts src/lib/asset-state-review-service.ts "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" messages/th.json messages/en.json tests/asset-state-review-types.test.ts tests/asset-state-review-detector.test.ts tests/asset-state-review-scan-service.test.ts tests/asset-state-review-resolution.test.ts tests/asset-state-review-ui.test.ts
git commit -m "feat: audit handover mode state consistency"
```

---

### Task 6: Notifications, Asset Detail, Timeline, And Print Documents

**Files:**
- Modify: `src/lib/notification-summary.ts`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx`
- Modify: `src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Create: `tests/asset-handover-presentation.test.ts`
- Modify: `tests/notification-summary.test.ts`
- Modify: `tests/asset-detail-data-boundaries.test.ts`
- Modify: `tests/asset-detail-ux.test.ts`

**Interfaces:**
- Consumes: nullable persisted mode and localized short/full labels.
- Produces: temporary-only due notifications and consistent mode display across detail/history/print.

- [ ] **Step 1: Write failing notification and presentation tests**

Assert the due query includes `handoverMode: "temporary_loan"`, Checkout/Check-in print queries select mode, and detail cards/timeline render localized mode plus the legacy unspecified fallback. Assert expected return is omitted for permanent assignments rather than rendered as a meaningless dash in the primary summary.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test tests/asset-handover-presentation.test.ts tests/notification-summary.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-ux.test.ts`

Expected: FAIL on the missing mode filter/data/presentation.

- [ ] **Step 3: Filter due notifications by mode**

Add `handoverMode: "temporary_loan"` alongside active/non-returned and due-date conditions. Preserve permission gating and existing notification item generation.

- [ ] **Step 4: Display mode consistently**

- Select `handoverMode` in Asset Detail Checkout history and Check-in source Checkout.
- Show full label on Checkout detail/print and short custody label on Check-in context/print.
- Show expected return only for temporary loans.
- Display `Legacy record — handover mode not recorded` for null historical records.
- Preserve VOID, cancellation toolbar, signatures, evidence, returnTo, snapshots, and responsive card/table behavior.
- The current repository has no Checkout-history export surface, so this task does not create a new export solely for the mode column. Future exports that include `AssetCheckout` must include the localized mode.

- [ ] **Step 5: Run focused tests and scoped lint**

Run:

```powershell
node --test tests/asset-handover-presentation.test.ts tests/notification-summary.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-ux.test.ts tests/asset-transaction-cancellation-ui.test.ts
npx eslint src/lib/notification-summary.ts "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx" "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx"
```

Expected: tests pass and ESLint exits 0.

- [ ] **Step 6: Commit presentation and notification behavior**

```powershell
git add src/lib/notification-summary.ts "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx" "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx" messages/th.json messages/en.json tests/asset-handover-presentation.test.ts tests/notification-summary.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-ux.test.ts
git commit -m "feat: present handover modes across operations"
```

---

### Task 7: Documentation And Production Acceptance Contract

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/03_DATABASE.md`
- Modify: `docs/05_ASSET_LIFECYCLE.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/08_PRODUCTION_READINESS.md`
- Modify: `docs/11_FEATURE_LIST.md`
- Modify: `docs/12_HANDOUT.md`
- Modify: `docs/15_ASSET_STATUS_USER_GUIDE_TH.md`
- Modify: `docs/16_ASSET_STATUS_WORKFLOW_TH.md`
- Modify: `docs/99_CHANGELOG.md`

**Interfaces:**
- Consumes: completed runtime behavior and pending migration checksum/status.
- Produces: one consistent operator/developer explanation and explicit pending-migration/UAT gates.

- [ ] **Step 1: Update lifecycle and workflow truth**

Document the explicit mode choice, mode-derived statuses, mode-aware return, Data Quality rules, legacy null behavior, and why users must not manually change an active handover status.

- [ ] **Step 2: Update user-facing Thai guidance**

Use the approved copy:

```text
หน้าส่งมอบ: มอบหมายใช้งานประจำ / เบิกใช้งานชั่วคราว
หน้ารับคืน: ลักษณะการถือครอง — ใช้งานประจำ / เบิกชั่วคราว
```

Explain that permanent assignment has no due date and temporary loan requires one.

- [ ] **Step 3: Add UAT and readiness gates**

Add unchecked UAT cases for both creation modes, mode/status mismatch, Check-in, Check-in cancellation, Check-out cancellation, due notification exclusion, detail/print, Thai/English mobile/desktop, and the two backfilled assets. Record the migration as pending; do not claim it was applied.

- [ ] **Step 4: Update handoff and changelog**

Record implementation verification evidence available at that point, the pending migration filename, the two approved backfill pairs, and the rule that apply requires a verified backup and explicit approval.

- [ ] **Step 5: Check documentation consistency**

Run:

```powershell
rg -n "handoverMode|permanent_assignment|temporary_loan|มอบหมายใช้งานประจำ|เบิกใช้งานชั่วคราว" DEVELOPER_HANDOFF.md docs
rg -n "migration.*applied|was applied|บันทึกว่า.*applied" DEVELOPER_HANDOFF.md docs/03_DATABASE.md docs/08_PRODUCTION_READINESS.md docs/99_CHANGELOG.md
git diff --check
```

Expected: current docs describe the new migration as pending, historical records remain untouched, and diff check exits 0.

- [ ] **Step 6: Commit documentation**

```powershell
git add DEVELOPER_HANDOFF.md docs/03_DATABASE.md docs/05_ASSET_LIFECYCLE.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/08_PRODUCTION_READINESS.md docs/11_FEATURE_LIST.md docs/12_HANDOUT.md docs/15_ASSET_STATUS_USER_GUIDE_TH.md docs/16_ASSET_STATUS_WORKFLOW_TH.md docs/99_CHANGELOG.md
git commit -m "docs: document permanent and temporary handovers"
```

---

### Task 8: Full Verification, Bounded Browser QA, And Migration Handoff

**Files:**
- Modify only if verification finds an in-scope defect: files already listed in Tasks 1-7 and their focused tests.
- Do not modify or apply: accepted historical migration files.

**Interfaces:**
- Consumes: all Tasks 1-7.
- Produces: repository verification evidence, desktop/mobile UI evidence, pending migration checksum/status, and a clean handoff for backup approval.

- [ ] **Step 1: Run the complete automated verification**

Run:

```powershell
npm run verify
npx tsc --noEmit
git diff --check
```

Expected: lint has zero errors, all tests pass, Prisma generation succeeds, TypeScript succeeds, Next.js build succeeds, and diff check exits 0. Record exact test/page counts and any inherited warnings.

- [ ] **Step 2: Run read-only migration status**

Run: `npm run migration:status`

Expected: `2026-08-31-add-checkout-handover-mode.sql` is `pending`; the eleven previously accepted files remain `applied`; no checksum mismatch exists.

- [ ] **Step 3: Perform one bounded desktop/mobile browser QA pass**

Use an authenticated local session and verify together at 1440x900 and 390x844:

- user Checkout shows two initially unselected mode choices;
- permanent choice hides due date and previews `In Use`;
- temporary choice requires due date and previews `Checked Out`;
- non-user destination forces temporary mode;
- Check-in shows read-only current-custody context;
- Asset Detail and print views show mode consistently;
- focus order, 44px mobile targets, Thai/English wrapping, and body overflow are acceptable.

Capture one desktop and one mobile screenshot outside Git or in the established ignored QA location.

- [ ] **Step 4: Fix one batched set of observed in-scope defects, if any**

For every observed defect, first add or update the smallest focused regression test, confirm RED, apply the minimal fix, and rerun the focused test. Do not perform unrelated polish.

- [ ] **Step 5: Run one confirmation pass**

Repeat the two viewports once after any fixes. Stop after this confirmation pass and record remaining real-device/manual UAT items without claiming them passed.

- [ ] **Step 6: Commit verification evidence or return fixes to their owning task**

If browser QA exposes a code defect, return to the owning Task 3-6 RED/GREEN step and use that task's exact staging list and commit boundary; do not create a mixed verification commit. If only handoff/UAT evidence changed, run:

```powershell
git add DEVELOPER_HANDOFF.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md
git commit -m "docs: record handover mode verification"
```

If neither code nor documentation changed, create no commit in this step.

- [ ] **Step 7: Stop before production mutation**

Report the pending migration filename, checksum from `migration:status`, exact two-record backfill scope, verification results, and backup/restore prerequisite. Ask the operator to confirm a fresh verified backup and explicitly approve:

```powershell
npm run migration:apply -- 2026-08-31-add-checkout-handover-mode.sql --backup-confirmed --reason "Approved permanent assignment handover mode backfill"
```

Do not run the command in the implementation turn without that later approval.
