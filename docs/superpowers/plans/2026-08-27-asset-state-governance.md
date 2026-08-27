# Asset State Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize asset lifecycle rules, harden every status-changing workflow, simplify selectable physical conditions, and add a human-reviewed queue for historical inconsistencies without automatically changing existing assets.

**Architecture:** Pure policy modules define selectable values, valid operation sources, valid targets, and stable error codes. Transaction services enforce those policies and preserve prior operational context. A persisted `AssetStateReview` queue detects inconsistencies without mutating assets; explicit administrator resolutions revalidate snapshots and write both movement and audit history.

**Tech Stack:** Next.js 16.2.4 App Router, React 19, TypeScript, Prisma 7.8.0 with SQL Server, next-intl, Zod, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-27-asset-state-governance-design.md`

## Global Constraints

- Read relevant Next.js 16.2.4 guides from `node_modules/next/dist/docs/` before changing pages or Route Handlers.
- Existing asset status, condition, custody, checkout, maintenance, and disposal rows must not be automatically rewritten by migration or detection.
- Use allowlists, fail closed when required master data is missing, and return stable error codes.
- Generic Asset Create/Edit cannot bypass workflow-owned states.
- Every approved review correction requires a reason and writes Asset Movement plus System Audit Log.
- Historical status and condition labels remain readable even when non-selectable.
- Preserve unrelated dirty-worktree changes and stage only task-owned files.
- Use `apply_patch` for hand-written file edits.

---

## File Map

- `src/lib/asset-lifecycle-policy.ts`: canonical pure status and condition policy.
- `src/lib/asset-operation-policy.ts`, `src/lib/asset-lifecycle-exception-policy.ts`, `src/lib/asset-status-flow.ts`: compatibility façades during migration; delegate to the canonical policy and can be removed only after all callers move.
- `src/lib/asset-state-review-types.ts`: issue types, severities, DTOs, and stable error codes.
- `src/lib/asset-state-review-detector.ts`: pure issue derivation from bounded snapshots.
- `src/lib/asset-state-review-service.ts`: database scan/upsert, list, resolve, and dismiss transactions.
- `src/components/admin/asset-state-review-workspace.tsx`: interactive review queue.
- `prisma/schema.prisma`: review queue and disposal prior-status relations.
- `prisma/manual-migrations/2026-08-27-add-asset-state-governance.sql`: idempotent SQL Server deployment migration.

---

### Task 1: Canonical Lifecycle And Condition Policy

**Files:**
- Create: `src/lib/asset-lifecycle-policy.ts`
- Modify: `src/lib/asset-operation-policy.ts`
- Modify: `src/lib/asset-lifecycle-exception-policy.ts`
- Modify: `src/lib/asset-status-flow.ts`
- Test: `tests/asset-lifecycle-policy.test.ts`
- Test: `tests/asset-operation-status-policy.test.ts`
- Test: `tests/asset-transfer-status.test.ts`

**Interfaces:**
- Produces: `AssetLifecycleOperation`, `AssetLifecycleErrorCode`, `getAssetLifecycleTransitionError(operation: AssetLifecycleOperation, currentStatusName: string | null | undefined, targetStatusName?: string | null): AssetLifecycleErrorCode | null`, `getAssetCreateStatusNames()`, `getAssetRegisterStatusNames()`, `getSelectableConditionNames()`, `getMaintenanceCloseStatusNames()`, `getMaintenanceOperationalTarget()`, and `getTransferTargetStatusName()`.
- Consumes: canonical English master names from `prisma/seed.ts`.

- [ ] **Step 1: Write failing transition-matrix tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  getAssetLifecycleTransitionError,
  getAssetCreateStatusNames,
  getAssetRegisterStatusNames,
  getSelectableConditionNames,
  getMaintenanceOperationalTarget,
} from "../src/lib/asset-lifecycle-policy.ts"

test("checkout only accepts Ready", () => {
  assert.equal(getAssetLifecycleTransitionError("checkout", "Ready"), null)
  for (const status of ["Draft", "In Use", "Pending Repair", "Under Maintenance", "Missing", "Lost", "Under Inspection", "Disposed"]) {
    assert.equal(getAssetLifecycleTransitionError("checkout", status), "ASSET_STATUS_CHECKOUT_NOT_ALLOWED", status)
  }
})

test("personal transfer accepts only Ready or In Use", () => {
  assert.equal(getAssetLifecycleTransitionError("assign_custodian", "Ready"), null)
  assert.equal(getAssetLifecycleTransitionError("assign_custodian", "In Use"), null)
  assert.equal(getAssetLifecycleTransitionError("assign_custodian", "Pending Repair"), "ASSET_STATUS_TRANSFER_NOT_ALLOWED")
  assert.equal(getAssetLifecycleTransitionError("assign_custodian", "Missing"), "ASSET_STATUS_TRANSFER_NOT_ALLOWED")
})

test("generic forms expose only owned status and condition values", () => {
  assert.deepEqual(getAssetCreateStatusNames(), ["Draft", "Ready"])
  assert.deepEqual(getAssetRegisterStatusNames("Draft"), ["Draft", "Ready"])
  assert.deepEqual(getAssetRegisterStatusNames("Ready"), ["Ready"])
  assert.deepEqual(getSelectableConditionNames(), ["Not Assessed", "New", "Good", "Fair", "Damaged", "Non-functional", "Salvage"])
})

test("maintenance restoration follows custody context", () => {
  assert.equal(getMaintenanceOperationalTarget({ ownershipType: "personal", custodianId: "employee-1" }), "In Use")
  assert.equal(getMaintenanceOperationalTarget({ ownershipType: "personal", custodianId: null }), "Ready")
  assert.equal(getMaintenanceOperationalTarget({ ownershipType: "shared", custodianId: null }), "Ready")
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/asset-lifecycle-policy.test.ts tests/asset-operation-status-policy.test.ts tests/asset-transfer-status.test.ts`

Expected: FAIL because `src/lib/asset-lifecycle-policy.ts` and the new allowlist behavior do not exist.

- [ ] **Step 3: Implement the canonical pure policy**

```ts
export type AssetLifecycleOperation =
  | "create"
  | "register_edit"
  | "checkout"
  | "checkin"
  | "assign_custodian"
  | "move_scope"
  | "maintenance_create"
  | "maintenance_start"
  | "maintenance_close"
  | "disposal_create"
  | "disposal_execute"

export type AssetLifecycleErrorCode =
  | "ASSET_STATUS_CREATE_NOT_ALLOWED"
  | "ASSET_STATUS_EDIT_NOT_ALLOWED"
  | "ASSET_STATUS_CHECKOUT_NOT_ALLOWED"
  | "ASSET_STATUS_CHECKIN_NOT_ALLOWED"
  | "ASSET_STATUS_TRANSFER_NOT_ALLOWED"
  | "ASSET_STATUS_MAINTENANCE_NOT_ALLOWED"
  | "ASSET_STATUS_DISPOSAL_NOT_ALLOWED"

const allowedSources: Partial<Record<AssetLifecycleOperation, ReadonlySet<string>>> = {
  checkout: new Set(["ready"]),
  checkin: new Set(["checked out"]),
  assign_custodian: new Set(["ready", "in use"]),
  maintenance_create: new Set(["ready", "in use"]),
  maintenance_start: new Set(["pending repair"]),
  disposal_execute: new Set(["pending disposal"]),
}

export const assetCreateStatusNames = ["Draft", "Ready"] as const
export const selectableConditionNames = ["Not Assessed", "New", "Good", "Fair", "Damaged", "Non-functional", "Salvage"] as const
```

Implement exact error mapping, source normalization, `Draft -> Ready` register-edit handling, location/department moves that preserve the status, maintenance close targets, and condition compatibility helpers. Keep old exported helpers as thin delegates so existing imports remain stable during later tasks.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test tests/asset-lifecycle-policy.test.ts tests/asset-operation-status-policy.test.ts tests/asset-transfer-status.test.ts`

Expected: PASS with all matrix cases green.

- [ ] **Step 5: Commit the policy slice**

```powershell
git add -- src/lib/asset-lifecycle-policy.ts src/lib/asset-operation-policy.ts src/lib/asset-lifecycle-exception-policy.ts src/lib/asset-status-flow.ts tests/asset-lifecycle-policy.test.ts tests/asset-operation-status-policy.test.ts tests/asset-transfer-status.test.ts
git commit -m "refactor: centralize asset lifecycle policy"
```

---

### Task 2: Master Descriptions And Safe Create/Edit Options

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `src/lib/asset-form-options.ts`
- Modify: `src/lib/validations/asset.ts`
- Modify: `src/app/api/assets/route.ts`
- Modify: `src/app/api/assets/[id]/route.ts`
- Modify: `src/components/assets/asset-form.tsx`
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `src/lib/asset-import-preview.ts`
- Modify: `src/app/api/assets/import-confirm/route.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/asset-state-form-policy.test.ts`
- Test: `tests/asset-batch-route.test.ts`
- Test: `tests/asset-import-batch.test.ts`

**Interfaces:**
- Consumes: Task 1 status/condition selection functions.
- Produces: active master records with `description`, `Not Assessed`, server-side master validation, and form option DTOs containing `{ id, name, label, description }`.

- [ ] **Step 1: Write failing tests for form/API selection safety**

```ts
test("asset create exposes only Draft and Ready and hides deprecated conditions", () => {
  assert.deepEqual(filterAssetCreateStatuses(masterStatuses).map((item) => item.name), ["Draft", "Ready"])
  assert.deepEqual(filterSelectableConditions(masterConditions).map((item) => item.name), [
    "Not Assessed", "New", "Good", "Fair", "Damaged", "Non-functional", "Salvage",
  ])
})

test("generic edit rejects workflow-owned target statuses", () => {
  assert.equal(getAssetLifecycleTransitionError("register_edit", "Ready", "Checked Out"), "ASSET_STATUS_EDIT_NOT_ALLOWED")
  assert.equal(getAssetLifecycleTransitionError("register_edit", "Ready", "Pending Repair"), "ASSET_STATUS_EDIT_NOT_ALLOWED")
})
```

Add source assertions proving POST and PUT load active status/condition masters and call the policy before writing.

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/asset-state-form-policy.test.ts tests/asset-batch-route.test.ts tests/asset-import-batch.test.ts`

Expected: FAIL because `Not Assessed`, descriptions, filtered options, and API master checks are missing.

- [ ] **Step 3: Add master values and descriptions without changing assets**

Add to `prisma/seed.ts`:

```ts
{ name: "Not Assessed", nameTh: "ยังไม่ประเมิน", description: "ยังไม่ได้ตรวจยืนยันสภาพจริงของทรัพย์สิน", colorCode: "#64748B", sortOrder: 1 },
```

Populate descriptions for all status and condition seed rows. Keep `Excellent` and `Poor` in seed for historical readability, but exclude them through `getSelectableConditionNames()` rather than deleting or reassigning records.

- [ ] **Step 4: Enforce active masters and policy in every create path**

Before Asset POST/PUT, batch create, clone confirmation, and import confirmation, load the submitted status and condition with:

```ts
const [status, condition] = await Promise.all([
  prisma.assetStatus.findFirst({ where: { id: input.statusId, isActive: true }, select: { id: true, name: true } }),
  prisma.assetCondition.findFirst({ where: { id: input.conditionId, isActive: true }, select: { id: true, name: true } }),
])
if (!status || !condition) return NextResponse.json({ code: "ASSET_STATE_MASTER_NOT_FOUND", error: "Asset status or condition is inactive or missing" }, { status: 400 })
```

Apply create/edit policy after master resolution. Filter form options by Task 1 helpers, pass descriptions to UI, render description under the selected status/condition, and prevent batch/import from using hidden legacy values unless preserving an unchanged existing record.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `node --test tests/asset-state-form-policy.test.ts tests/asset-batch-route.test.ts tests/asset-import-batch.test.ts tests/asset-status-help-ui.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit master and form safety**

```powershell
git add -- prisma/seed.ts src/lib/asset-form-options.ts src/lib/validations/asset.ts src/app/api/assets/route.ts 'src/app/api/assets/[id]/route.ts' src/components/assets/asset-form.tsx src/components/assets/asset-batch-form.tsx src/lib/asset-import-preview.ts src/app/api/assets/import-confirm/route.ts messages/th.json messages/en.json tests/asset-state-form-policy.test.ts tests/asset-batch-route.test.ts tests/asset-import-batch.test.ts
git commit -m "feat: govern selectable asset states"
```

---

### Task 3: Harden Checkout And Transfer Workflows

**Files:**
- Modify: `src/app/api/assets/[id]/checkout/route.ts`
- Modify: `src/app/api/assets/[id]/legacy-checkout/route.ts`
- Modify: `src/app/api/assets/[id]/transfer/route.ts`
- Modify: `src/lib/asset-operation-options.ts`
- Modify: `src/components/asset-operations/checkout-form.tsx`
- Modify: `src/components/asset-operations/transfer-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/asset-operation-status-policy.test.ts`
- Test: `tests/asset-transfer-status.test.ts`
- Test: `tests/asset-operation-options.test.ts`

**Interfaces:**
- Consumes: Task 1 `getAssetLifecycleTransitionError()` and `getTransferTargetStatusName()`.
- Produces: fail-closed route behavior and UI lists containing only eligible assets.

- [ ] **Step 1: Add failing route and option tests**

```ts
test("checkout options contain only Ready assets", () => {
  assert.equal(getAssetLifecycleTransitionError("checkout", "Ready"), null)
  assert.equal(getAssetLifecycleTransitionError("checkout", "Pending Repair"), "ASSET_STATUS_CHECKOUT_NOT_ALLOWED")
  assert.equal(getAssetLifecycleTransitionError("checkout", "Under Inspection"), "ASSET_STATUS_CHECKOUT_NOT_ALLOWED")
})

test("personal transfer cannot overwrite repair or loss lifecycle", () => {
  for (const status of ["Pending Repair", "Under Maintenance", "Missing", "Lost", "Pending Disposal", "Disposed", "Retired"]) {
    assert.equal(getAssetLifecycleTransitionError("assign_custodian", status), "ASSET_STATUS_TRANSFER_NOT_ALLOWED", status)
  }
})
```

Add source assertions that all three routes call the canonical policy after loading the current status and before opening a transaction.

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/asset-operation-status-policy.test.ts tests/asset-transfer-status.test.ts tests/asset-operation-options.test.ts`

Expected: FAIL on currently permitted repair/inspection transfer or checkout cases.

- [ ] **Step 3: Wire canonical guards and eligible option queries**

For personal transfers call `assign_custodian`; for location/department-only moves call `move_scope` and preserve `asset.statusId`. Return stable code and 409:

```ts
const operation = input.toCustodianId ? "assign_custodian" : "move_scope"
const lifecycleError = getAssetLifecycleTransitionError(operation, asset.status.name)
if (lifecycleError) return NextResponse.json({ code: lifecycleError, error: lifecycleError }, { status: 409 })
```

Filter server-side operation options to `Ready` for checkout and `Ready`/`In Use` for personal assignment. Keep direct route guards even when an asset is not offered by the UI.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test tests/asset-operation-status-policy.test.ts tests/asset-transfer-status.test.ts tests/asset-operation-options.test.ts tests/asset-operation-review.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit operation hardening**

```powershell
git add -- 'src/app/api/assets/[id]/checkout/route.ts' 'src/app/api/assets/[id]/legacy-checkout/route.ts' 'src/app/api/assets/[id]/transfer/route.ts' src/lib/asset-operation-options.ts src/components/asset-operations/checkout-form.tsx src/components/asset-operations/transfer-form.tsx messages/th.json messages/en.json tests/asset-operation-status-policy.test.ts tests/asset-transfer-status.test.ts tests/asset-operation-options.test.ts
git commit -m "fix: prevent asset lifecycle bypasses"
```

---

### Task 4: Make Maintenance Close Custody-Aware

**Files:**
- Modify: `src/lib/maintenance-ticket-service.ts`
- Modify: `src/lib/maintenance-policy.ts`
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- Modify: `src/components/maintenance/maintenance-ticket-close-button.tsx`
- Modify: `src/lib/validations/maintenance.ts`
- Modify: `src/lib/maintenance-api-errors.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/maintenance-ticket-service.test.ts`
- Test: `tests/maintenance-policy.test.ts`
- Test: `tests/maintenance-i18n.test.ts`

**Interfaces:**
- Consumes: Task 1 `getMaintenanceOperationalTarget()` and allowed close targets.
- Produces: corrective close validation that permits only contextual operational target or `Pending Disposal`; preventive tickets remain lifecycle-neutral.

- [ ] **Step 1: Write failing custody-aware close tests**

```ts
test("corrective close restores In Use when personal custodian remains", async () => {
  const db = fakeDb({ ticketStatus: "completed", assetStatus: "Under Maintenance", ownershipType: "personal", custodianId: "employee-1", statusIds: { "In Use": "status-in-use" } })
  await closeMaintenanceTicket(db, "ticket-1", closeInput({ nextStatusId: "status-in-use" }), { id: "user-1" })
  assert.ok(db.events.includes("asset:In Use"))
})

test("corrective close rejects Ready when personal custodian remains", async () => {
  const db = fakeDb({ ticketStatus: "completed", assetStatus: "Under Maintenance", ownershipType: "personal", custodianId: "employee-1", statusIds: { Ready: "status-ready" } })
  await assert.rejects(() => closeMaintenanceTicket(db, "ticket-1", closeInput({ nextStatusId: "status-ready" }), { id: "user-1" }), hasMaintenanceCode("MAINTENANCE_INVALID_CLOSE_STATUS"))
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/maintenance-ticket-service.test.ts tests/maintenance-policy.test.ts`

Expected: FAIL because mutation ticket asset projection and close options do not include custody context or `In Use`.

- [ ] **Step 3: Implement contextual close target**

Extend the mutation asset select with `ownershipType` and `custodianId`. Resolve active `Ready`, `In Use`, and `Pending Disposal` masters by exact English name. For corrective tickets, accept only:

```ts
const operationalTarget = getMaintenanceOperationalTarget(ticket.asset)
const allowedTargetNames = new Set([operationalTarget, "Pending Disposal"])
if (!allowedTargetNames.has(nextStatus.name)) {
  throw new MaintenanceApiError("MAINTENANCE_INVALID_CLOSE_STATUS", `Close target must be ${operationalTarget} or Pending Disposal`)
}
```

Pass `recommendedStatusId` to the close component, display why it is recommended, and do not fall back to `statuses[0]` when a required master is absent.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test tests/maintenance-ticket-service.test.ts tests/maintenance-policy.test.ts tests/maintenance-i18n.test.ts tests/maintenance-option-select.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit maintenance restoration**

```powershell
git add -- src/lib/maintenance-ticket-service.ts src/lib/maintenance-policy.ts 'src/app/[locale]/(dashboard)/maintenance/page.tsx' 'src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx' src/components/maintenance/maintenance-ticket-close-button.tsx src/lib/validations/maintenance.ts src/lib/maintenance-api-errors.ts messages/th.json messages/en.json tests/maintenance-ticket-service.test.ts tests/maintenance-policy.test.ts tests/maintenance-i18n.test.ts
git commit -m "fix: restore maintenance assets by custody"
```

---

### Task 5: Preserve Disposal Prior Status

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/manual-migrations/2026-08-27-add-asset-state-governance.sql`
- Modify: `src/app/api/disposal-requests/route.ts`
- Modify: `src/app/api/disposal-batches/route.ts`
- Modify: `src/app/api/disposal-requests/[id]/route.ts`
- Modify: `src/lib/disposal-policy.ts`
- Modify: `src/lib/disposal-approval-service.ts`
- Modify: `src/lib/disposal-bulk-approval.ts`
- Modify: `src/lib/disposal-api-error-codes.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/disposal-prior-status.test.ts`
- Test: `tests/disposal-policy.test.ts`
- Test: `tests/disposal-bulk-approval.test.ts`

**Interfaces:**
- Produces: `DisposalRequest.previousAssetStatusId`, `previousAssetStatus` relation, and `getDisposalRestoreStatusError()`.
- Consumes: Task 1 canonical status normalization and allowed operational states.

- [ ] **Step 1: Write failing schema and behavior tests**

```ts
test("disposal request snapshots the asset status before Pending Disposal", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const route = readFileSync("src/app/api/disposal-requests/route.ts", "utf8")
  assert.match(schema, /previousAssetStatusId\s+String\?/)
  assert.match(route, /previousAssetStatusId:\s*asset\.statusId/)
})

test("rejection restores only the recorded prior status", () => {
  assert.equal(getDisposalRestoreStatusError({ name: "In Use" }), null)
  assert.equal(getDisposalRestoreStatusError({ name: "Ready" }), null)
  assert.equal(getDisposalRestoreStatusError(null), "DISPOSAL_PREVIOUS_STATUS_MISSING")
  assert.equal(getDisposalRestoreStatusError({ name: "Pending Disposal" }), "DISPOSAL_PREVIOUS_STATUS_INVALID")
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/disposal-prior-status.test.ts tests/disposal-policy.test.ts tests/disposal-bulk-approval.test.ts`

Expected: FAIL because the snapshot field and restore policy are missing.

- [ ] **Step 3: Add Prisma relation and idempotent SQL column**

Add to `DisposalRequest`:

```prisma
previousAssetStatusId String?
previousAssetStatus   AssetStatus? @relation("DisposalPreviousAssetStatus", fields: [previousAssetStatusId], references: [id], onDelete: NoAction, onUpdate: NoAction)
@@index([previousAssetStatusId], map: "IX_disposal_requests_previousAssetStatusId")
```

Add the inverse relation to `AssetStatus`. In the manual SQL migration use `COL_LENGTH`, named foreign-key existence checks, and `sys.indexes`; do not backfill the column.

- [ ] **Step 4: Snapshot and restore prior status**

Set `previousAssetStatusId: asset.statusId` for single and batch request creation in the same transaction that claims `Pending Disposal`. On rejection, ignore client-provided `nextStatusId`; load the recorded active prior status and validate it. If absent, return 409 code `DISPOSAL_PREVIOUS_STATUS_MISSING` and let Task 7 detect the review issue. Update decision UI copy to say the prior state will be restored.

- [ ] **Step 5: Generate Prisma Client and run focused tests**

Run: `npm run prisma:generate`

Run: `node --test tests/disposal-prior-status.test.ts tests/disposal-policy.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-route-structure.test.ts`

Expected: Prisma generation and all focused tests PASS.

- [ ] **Step 6: Commit disposal preservation**

```powershell
git add -- prisma/schema.prisma prisma/manual-migrations/2026-08-27-add-asset-state-governance.sql src/app/api/disposal-requests/route.ts src/app/api/disposal-batches/route.ts 'src/app/api/disposal-requests/[id]/route.ts' src/lib/disposal-policy.ts src/lib/disposal-approval-service.ts src/lib/disposal-bulk-approval.ts src/lib/disposal-api-error-codes.ts messages/th.json messages/en.json tests/disposal-prior-status.test.ts tests/disposal-policy.test.ts tests/disposal-bulk-approval.test.ts
git commit -m "feat: preserve disposal prior status"
```

---

### Task 6: Add Persistent Asset State Review Queue

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/manual-migrations/2026-08-27-add-asset-state-governance.sql`
- Create: `src/lib/asset-state-review-types.ts`
- Test: `tests/asset-state-review-schema.test.ts`
- Test: `tests/asset-state-review-types.test.ts`

**Interfaces:**
- Produces: Prisma `AssetStateReview`, `asset.stateReviews`, review issue/severity/status constants, `AssetStateObservedSnapshot`, and stable review error codes.
- Consumes: Task 5 migration file and existing Asset/User relations.

- [ ] **Step 1: Write failing schema/type tests**

```ts
test("review queue stores immutable observed and resolution fields", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  assert.match(schema, /model AssetStateReview/)
  for (const field of ["issueType", "reviewStatus", "severity", "observedStatusId", "observedConditionId", "observedAssetUpdatedAt", "resolutionReason"]) {
    assert.match(schema, new RegExp(`\\b${field}\\b`), field)
  }
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/asset-state-review-schema.test.ts tests/asset-state-review-types.test.ts`

Expected: FAIL because the model and types do not exist.

- [ ] **Step 3: Add the Prisma model and pure types**

Use this public type contract:

```ts
export const assetStateReviewIssueTypes = [
  "repair_status_without_active_ticket",
  "active_repair_ticket_status_mismatch",
  "checked_out_without_open_checkout",
  "open_checkout_status_mismatch",
  "personal_in_use_without_custodian",
  "personal_ready_with_custodian",
  "incompatible_status_condition",
  "legacy_condition_value",
  "controlled_legacy_status",
  "legacy_disposal_missing_previous_status",
] as const

export type AssetStateReviewIssueType = typeof assetStateReviewIssueTypes[number]
export type AssetStateReviewStatus = "pending" | "resolved" | "dismissed"
export type AssetStateReviewSeverity = "critical" | "warning" | "info"
```

The Prisma model includes observed and resolved foreign-key IDs as scalar snapshot fields; only `assetId` needs a navigable required relation. Add indexes for `(reviewStatus, severity, lastDetectedAt)`, `(assetId, issueType)`, company/branch list access through the asset relation, and a filtered unique SQL index:

```sql
CREATE UNIQUE INDEX [UX_asset_state_reviews_pending_asset_issue]
ON [dbo].[asset_state_reviews]([assetId], [issueType])
WHERE [reviewStatus] = N'pending';
```

- [ ] **Step 4: Add `Not Assessed` and descriptions to the same migration**

Use `MERGE` or guarded `INSERT`/`UPDATE` against `asset_conditions` and exact-name updates for descriptions. Do not update `assets.conditionId`. Include SQL assertions in the test that reject any `UPDATE [dbo].[assets]` statement.

- [ ] **Step 5: Generate Prisma Client and run focused tests**

Run: `npm run prisma:generate`

Run: `node --test tests/asset-state-review-schema.test.ts tests/asset-state-review-types.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit review persistence**

```powershell
git add -- prisma/schema.prisma prisma/manual-migrations/2026-08-27-add-asset-state-governance.sql src/lib/asset-state-review-types.ts tests/asset-state-review-schema.test.ts tests/asset-state-review-types.test.ts
git commit -m "feat: add asset state review queue"
```

---

### Task 7: Detect And Refresh Review Issues Without Asset Mutation

**Files:**
- Create: `src/lib/asset-state-review-detector.ts`
- Create: `src/lib/asset-state-review-service.ts`
- Create: `src/app/api/admin/asset-state-reviews/scan/route.ts`
- Create: `src/app/api/admin/asset-state-reviews/route.ts`
- Test: `tests/asset-state-review-detector.test.ts`
- Test: `tests/asset-state-review-scan-service.test.ts`
- Test: `tests/asset-state-review-routes.test.ts`

**Interfaces:**
- Consumes: Task 6 types/model and Task 1 condition compatibility helper.
- Produces: `detectAssetStateIssues(snapshot)`, `scanAssetStateReviews(db, actorId)`, `listAssetStateReviews(db, filters)`, and JSON list/scan endpoints.

- [ ] **Step 1: Write failing pure detector tests for every issue type**

```ts
test("detects repair status without active corrective ticket", () => {
  assert.deepEqual(
    detectAssetStateIssues(snapshot({ statusName: "Pending Repair", activeCorrectiveTickets: 0 })),
    [issue("repair_status_without_active_ticket", "critical")],
  )
})

test("does not treat disposed Good condition as incompatible", () => {
  assert.deepEqual(detectAssetStateIssues(snapshot({ statusName: "Disposed", conditionName: "Good" })), [])
})

test("detects controlled legacy and legacy condition values", () => {
  const issues = detectAssetStateIssues(snapshot({ statusName: "Under Inspection", conditionName: "Excellent" }))
  assert.deepEqual(issues.map((item) => item.issueType).sort(), ["controlled_legacy_status", "legacy_condition_value"])
})
```

- [ ] **Step 2: Run detector tests and confirm RED**

Run: `node --test tests/asset-state-review-detector.test.ts`

Expected: FAIL because the detector does not exist.

- [ ] **Step 3: Implement pure issue derivation**

Define one bounded snapshot with status, condition, ownership/custody, open-checkout count, active-corrective count/status, and legacy-disposal flags. Return deterministic issue candidates with severity and suggested targets but no database calls.

- [ ] **Step 4: Write failing scan-service idempotency tests**

```ts
test("scan upserts one pending issue and never updates the asset", async () => {
  const db = fakeReviewDb([snapshot({ statusName: "Checked Out", openCheckouts: 0 })])
  await scanAssetStateReviews(db, "admin-1")
  await scanAssetStateReviews(db, "admin-1")
  assert.equal(db.pendingReviews.length, 1)
  assert.equal(db.assetUpdates.length, 0)
  assert.equal(db.pendingReviews[0].refreshCount, 2)
})
```

- [ ] **Step 5: Implement bounded scan, stale close, and list service**

Load active assets in pages of exactly 250 records, aggregate open checkouts and corrective tickets only for those asset IDs, derive candidates, and transactionally upsert pending reviews. When a previously pending issue is no longer detected, mark it `resolved` with system reason `condition_no_longer_detected` but do not alter the asset. Preserve dismissed history; create a new pending issue only when the observed `assetUpdatedAt` differs from the dismissal snapshot.

- [ ] **Step 6: Add permission-checked list and scan routes**

Both routes require `setting:view`; scan additionally requires `setting:edit`. Parse allowlisted filters and page size with Zod. `POST scan` returns `{ scannedAssets, created, refreshed, autoClosed }`; `GET` returns `{ data, total, page, pageSize, summary }`.

- [ ] **Step 7: Run focused tests and confirm GREEN**

Run: `node --test tests/asset-state-review-detector.test.ts tests/asset-state-review-scan-service.test.ts tests/asset-state-review-routes.test.ts`

Expected: PASS and fake DB reports zero asset writes during scan.

- [ ] **Step 8: Commit detection and listing**

```powershell
git add -- src/lib/asset-state-review-detector.ts src/lib/asset-state-review-service.ts src/app/api/admin/asset-state-reviews/scan/route.ts src/app/api/admin/asset-state-reviews/route.ts tests/asset-state-review-detector.test.ts tests/asset-state-review-scan-service.test.ts tests/asset-state-review-routes.test.ts
git commit -m "feat: detect asset state review issues"
```

---

### Task 8: Resolve Or Dismiss Reviews Safely

**Files:**
- Modify: `src/lib/asset-state-review-service.ts`
- Create: `src/lib/validations/asset-state-review.ts`
- Create: `src/app/api/admin/asset-state-reviews/[id]/resolve/route.ts`
- Create: `src/app/api/admin/asset-state-reviews/[id]/dismiss/route.ts`
- Modify: `src/lib/system-log-presenter.ts`
- Modify: `src/lib/system-log-record-label-refs.ts`
- Test: `tests/asset-state-review-resolution.test.ts`
- Test: `tests/asset-state-review-routes.test.ts`
- Test: `tests/system-log-presenter.test.ts`

**Interfaces:**
- Produces: `resolveAssetStateReview()`, `dismissAssetStateReview()`, `assetStateReviewResolutionSchema`, and localized stable conflict responses.
- Consumes: Task 7 pending reviews, Task 1 allowed targets, `writeAuditLog()` inside the same transaction where supported.

- [ ] **Step 1: Write failing resolution and stale-snapshot tests**

```ts
test("resolution rejects a stale asset snapshot", async () => {
  const db = fakeResolutionDb({ reviewAssetUpdatedAt: "2026-08-01T00:00:00.000Z", currentAssetUpdatedAt: "2026-08-02T00:00:00.000Z" })
  await assert.rejects(
    () => resolveAssetStateReview(db, command({ statusName: "Ready", reason: "ตรวจสอบจากเอกสารส่งคืนแล้ว" }), actor),
    hasReviewCode("ASSET_STATE_REVIEW_STALE"),
  )
  assert.deepEqual(db.events, [])
})

test("resolution changes only an allowed field and records history", async () => {
  const db = fakeResolutionDb({ issueType: "personal_ready_with_custodian", currentStatus: "Ready" })
  await resolveAssetStateReview(db, command({ statusName: "In Use", reason: "ยืนยันผู้ครอบครองจากเอกสารล่าสุด" }), actor)
  assert.deepEqual(db.events, ["asset:In Use", "movement:state_review_resolution", "audit:asset_state_review_resolve", "review:resolved"])
})
```

- [ ] **Step 2: Run resolution tests and confirm RED**

Run: `node --test tests/asset-state-review-resolution.test.ts tests/asset-state-review-routes.test.ts`

Expected: FAIL because resolution APIs and service functions are missing.

- [ ] **Step 3: Implement issue-specific target maps and transaction**

Require a trimmed reason of at least 10 characters. Resolve submitted IDs to active masters and validate against issue-specific targets:

```ts
const allowedTargets: Record<AssetStateReviewIssueType, readonly string[]> = {
  checked_out_without_open_checkout: ["Ready", "In Use"],
  personal_ready_with_custodian: ["In Use"],
  personal_in_use_without_custodian: ["Ready"],
  repair_status_without_active_ticket: ["Ready", "In Use"],
  active_repair_ticket_status_mismatch: ["Pending Repair", "Under Maintenance"],
  open_checkout_status_mismatch: ["Checked Out"],
  incompatible_status_condition: [],
  legacy_condition_value: [],
  controlled_legacy_status: ["Ready", "In Use", "Missing", "Lost"],
  legacy_disposal_missing_previous_status: ["Ready", "In Use"],
}
```

Condition-only issues use suggested `Good`/`Damaged` or another selectable submitted condition. Re-read the asset and relationship evidence in the transaction; compare observed status, condition, custodian, and `updatedAt`. Use `updateMany` with all observed fields for optimistic concurrency. Write movement, audit, and resolved review before commit.

- [ ] **Step 4: Implement dismissal and routes**

Dismiss requires the same reason length, changes no asset fields, writes `asset_state_review_dismiss` audit data, and records actor/time/reason. Routes require `setting:edit`, translate stable service errors to 400/404/409, and do not expose stack traces.

- [ ] **Step 5: Add readable System Log summaries**

Map `asset_state_review_resolve` and `asset_state_review_dismiss` to asset/review labels, issue type, reason, and before/after status/condition without exposing raw metadata JSON.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run: `node --test tests/asset-state-review-resolution.test.ts tests/asset-state-review-routes.test.ts tests/system-log-presenter.test.ts tests/system-log-record-labels.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit controlled resolution**

```powershell
git add -- src/lib/asset-state-review-service.ts src/lib/validations/asset-state-review.ts 'src/app/api/admin/asset-state-reviews/[id]/resolve/route.ts' 'src/app/api/admin/asset-state-reviews/[id]/dismiss/route.ts' src/lib/system-log-presenter.ts src/lib/system-log-record-label-refs.ts tests/asset-state-review-resolution.test.ts tests/asset-state-review-routes.test.ts tests/system-log-presenter.test.ts
git commit -m "feat: resolve asset state reviews safely"
```

---

### Task 9: Build The Admin Review Workspace

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx`
- Create: `src/components/admin/asset-state-review-workspace.tsx`
- Create: `src/components/admin/asset-state-review-dialog.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/asset-state-review-ui.test.ts`
- Test: `tests/data-quality-drilldown.test.ts`

**Interfaces:**
- Consumes: Task 7 GET/scan DTOs and Task 8 resolve/dismiss endpoints.
- Produces: localized status/condition review section with filters, summary, asset/workflow links, scan action, required-reason dialogs, and post-action refresh.

- [ ] **Step 1: Write failing UI contract tests**

```ts
test("data quality page exposes asset state review workspace", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx", "utf8")
  const workspace = readFileSync("src/components/admin/asset-state-review-workspace.tsx", "utf8")
  assert.match(page, /AssetStateReviewWorkspace/)
  assert.match(workspace, /\/api\/admin\/asset-state-reviews\/scan/)
  assert.match(workspace, /resolutionReason/)
  assert.match(workspace, /minLength=\{10\}/)
  assert.match(workspace, /statusId/)
  assert.match(workspace, /conditionId/)
})
```

Verify every `dataQualityPage.assetStateReviews.*` key used by the components exists in Thai and English.

- [ ] **Step 2: Run UI tests and confirm RED**

Run: `node --test tests/asset-state-review-ui.test.ts tests/data-quality-drilldown.test.ts`

Expected: FAIL because the workspace and message keys do not exist.

- [ ] **Step 3: Build the server-loaded section and client workspace**

The page loads the first pending page and summaries server-side. The client supports issue/severity/status/company/branch filtering, paginated refresh, and a scan button visible only when the page user has `setting:edit`. Render semantic desktop table and labelled mobile cards without a horizontal page overflow.

Each row shows Asset Tag/name, current status/condition, ownership responsibility, issue explanation, detected/last-detected time, suggested action, Asset Detail link, and applicable workflow link. Do not offer a state-changing button when the issue requires creating a real transaction; link to that workflow and retain dismiss/review actions.

- [ ] **Step 4: Implement accessible resolve/dismiss dialogs**

Use the existing shared dialog pattern, focus trap/return, labelled select controls, 10-character required reason, stale-conflict message, pending state, and success refresh. For a condition-only issue, show only the condition selector; for a status-only issue, show only status targets returned by the server DTO.

- [ ] **Step 5: Run focused tests and scoped lint**

Run: `node --test tests/asset-state-review-ui.test.ts tests/data-quality-drilldown.test.ts`

Run: `npx eslint "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" src/components/admin/asset-state-review-workspace.tsx src/components/admin/asset-state-review-dialog.tsx`

Expected: tests PASS and ESLint exits 0.

- [ ] **Step 6: Commit the review workspace**

```powershell
git add -- 'src/app/[locale]/(dashboard)/admin/data-quality/page.tsx' src/components/admin/asset-state-review-workspace.tsx src/components/admin/asset-state-review-dialog.tsx messages/th.json messages/en.json tests/asset-state-review-ui.test.ts tests/data-quality-drilldown.test.ts
git commit -m "feat: add asset state review workspace"
```

---

### Task 10: Documentation, Migration QA, And Final Verification

**Files:**
- Modify: `docs/05_ASSET_LIFECYCLE.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/08_PRODUCTION_READINESS.md`
- Modify: `docs/15_ASSET_STATUS_USER_GUIDE_TH.md`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/99_CHANGELOG.md`
- Modify: `tests/asset-status-help-ui.test.ts`
- Create: `tests/asset-state-governance-docs.test.ts`

**Interfaces:**
- Consumes: all implemented behavior and exact migration name.
- Produces: deployable handoff, operator guidance, UAT checklist, and final verification evidence.

- [ ] **Step 1: Write failing documentation contract tests**

```ts
test("handoff documents review-first state governance", () => {
  const lifecycle = readFileSync("docs/05_ASSET_LIFECYCLE.md", "utf8")
  const readiness = readFileSync("docs/08_PRODUCTION_READINESS.md", "utf8")
  const handoff = readFileSync("DEVELOPER_HANDOFF.md", "utf8")
  assert.match(lifecycle, /asset_state_reviews/)
  assert.match(lifecycle, /Not Assessed/)
  assert.match(readiness, /2026-08-27-add-asset-state-governance\.sql/)
  assert.match(handoff, /ไม่มีการเปลี่ยนสถานะหรือสภาพเดิมโดยอัตโนมัติ|does not automatically change existing asset states/)
})
```

- [ ] **Step 2: Run docs tests and confirm RED**

Run: `node --test tests/asset-state-governance-docs.test.ts tests/asset-status-help-ui.test.ts`

Expected: FAIL because current docs do not describe the queue, migration, or new condition model.

- [ ] **Step 3: Update lifecycle, workflow, user, UAT, readiness, and handoff docs**

Document:

- exact status ownership and transition table
- `Checked Out` temporary versus `In Use` long-term
- selectable condition definitions and legacy values
- review scan, resolve, dismiss, stale conflict, movement, and audit behavior
- production deployment order: verified backup, SQL migration, `npm run prisma:generate`, build, restart, scan, administrator review
- explicit statement that migration and scan do not rewrite existing assets
- UAT cases for rejected checkout/transfer, contextual maintenance close, disposal rejection restore, scan idempotency, stale resolution, mobile review cards, and permission-limited user

- [ ] **Step 4: Validate the SQL migration against a disposable database or transaction**

Preferred command for a disposable SQL Server test database configured through temporary environment values. The guard refuses to run unless both values are set and the database name clearly identifies a test database:

```powershell
if (-not $env:ASSET_STATE_TEST_DB_SERVER -or -not $env:ASSET_STATE_TEST_DB_NAME -or $env:ASSET_STATE_TEST_DB_NAME -notmatch '(?i)(test|sandbox|temp|dev)') {
  throw 'Set ASSET_STATE_TEST_DB_SERVER and a clearly disposable ASSET_STATE_TEST_DB_NAME before migration QA.'
}
sqlcmd -S $env:ASSET_STATE_TEST_DB_SERVER -d $env:ASSET_STATE_TEST_DB_NAME -E -b -i prisma/manual-migrations/2026-08-27-add-asset-state-governance.sql
sqlcmd -S $env:ASSET_STATE_TEST_DB_SERVER -d $env:ASSET_STATE_TEST_DB_NAME -E -b -i prisma/manual-migrations/2026-08-27-add-asset-state-governance.sql
```

Expected: both runs exit 0, proving idempotency. If no disposable database is available, run the schema/migration source tests and record the SQL execution as an explicit production UAT gate; do not run the migration against the current operational database merely for verification.

- [ ] **Step 5: Run the complete focused suite**

Run:

```powershell
node --test tests/asset-lifecycle-policy.test.ts tests/asset-state-form-policy.test.ts tests/asset-operation-status-policy.test.ts tests/asset-transfer-status.test.ts tests/asset-operation-options.test.ts tests/maintenance-ticket-service.test.ts tests/maintenance-policy.test.ts tests/disposal-prior-status.test.ts tests/disposal-policy.test.ts tests/asset-state-review-schema.test.ts tests/asset-state-review-types.test.ts tests/asset-state-review-detector.test.ts tests/asset-state-review-scan-service.test.ts tests/asset-state-review-resolution.test.ts tests/asset-state-review-routes.test.ts tests/asset-state-review-ui.test.ts tests/asset-state-governance-docs.test.ts
```

Expected: all focused tests PASS with 0 failures.

- [ ] **Step 6: Run full repository verification**

Run: `npm run verify`

Expected: lint exits with 0 errors, all tests pass, Prisma Client generates, TypeScript passes, and Next.js production build completes.

- [ ] **Step 7: Inspect only task-owned changes**

Run:

```powershell
git diff --check
git status --short
git diff --stat
git log --oneline -12
```

Expected: no whitespace errors; unrelated pre-existing `.agents`, `.codex`, `.impeccable`, `.superpowers`, or backup-file changes remain unstaged and uncommitted.

- [ ] **Step 8: Commit documentation and final evidence**

```powershell
git add -- docs/05_ASSET_LIFECYCLE.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/08_PRODUCTION_READINESS.md docs/15_ASSET_STATUS_USER_GUIDE_TH.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/asset-status-help-ui.test.ts tests/asset-state-governance-docs.test.ts
git commit -m "docs: hand off asset state governance"
```

- [ ] **Step 9: Push only after requested or explicitly authorized**

Run: `git push origin master`

Expected: remote accepts the lifecycle-governance commit sequence and `git rev-parse HEAD` equals `git rev-parse origin/master`.
