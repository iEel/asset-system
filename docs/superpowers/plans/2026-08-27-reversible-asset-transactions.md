# Reversible Asset Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe self-service cancellation for new Checkout, Check-in, and Transfer documents without deleting historical records.

**Architecture:** Store versioned before/after snapshots on every new transaction, introduce `AssetTransfer` as a real document, and run cancellation through one service that verifies latest-operation, downstream-work, optimistic-concurrency, and component-state guards. Ineligible or historical requests create a deduplicated Asset State Review rather than applying a partial rollback.

**Tech Stack:** Next.js 16.2.4 App Router, TypeScript, Prisma 7.8.0, SQL Server manual migrations, next-intl, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-27-asset-workflow-safety-and-follow-up-design.md`

## Global Constraints

- Read the relevant files in `node_modules/next/dist/docs/` before changing Route Handlers or pages.
- Require `asset:edit`; the requester may cancel another user's eligible transaction without a second approver.
- Never delete transaction documents, evidence, signatures, movements, or logs.
- Only documents created with a complete supported snapshot are automatically reversible.
- Restore parent and affected installed components atomically or restore nothing.
- Do not run the production migration without a verified backup and separate explicit approval.
- Preserve unrelated dirty `.agents`, `.codex`, `.impeccable`, and `.superpowers/brainstorm` files.

---

### Task 1: Define versioned snapshots and cancellation policy

**Files:**
- Create: `src/lib/asset-transaction-snapshot.ts`
- Create: `src/lib/asset-transaction-cancellation-policy.ts`
- Test: `tests/asset-transaction-cancellation-policy.test.ts`

**Interfaces:**
- Produces: `AssetTransactionSnapshotV1`, `AssetComponentTransactionSnapshotV1`, `parseAssetTransactionSnapshot(json)`, and `evaluateAssetTransactionCancellation(input)`.
- `evaluateAssetTransactionCancellation` returns `{ eligible: true }` or `{ eligible: false; reasons: AssetTransactionCancellationReason[] }`.

- [ ] **Step 1: Write the failing policy tests**

```ts
test("allows the latest active transaction when asset and components match", () => {
  assert.deepEqual(evaluateAssetTransactionCancellation(eligibleInput), { eligible: true })
})

test("rejects stale, downstream, and incomplete historical transactions", () => {
  assert.deepEqual(evaluateAssetTransactionCancellation({ ...eligibleInput, snapshot: null }), {
    eligible: false,
    reasons: ["unsupported_snapshot"],
  })
  assert.deepEqual(evaluateAssetTransactionCancellation({ ...eligibleInput, downstreamTypes: ["maintenance"] }), {
    eligible: false,
    reasons: ["downstream_work"],
  })
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-transaction-cancellation-policy.test.ts`

Expected: FAIL because the snapshot parser and eligibility policy do not exist.

- [ ] **Step 3: Implement the minimal pure policy**

```ts
export type AssetTransactionSnapshotV1 = {
  version: 1
  assetId: string
  assetUpdatedAt: string
  statusId: string
  conditionId: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  checkout?: { id: string; isReturned: boolean } | null
  components: AssetComponentTransactionSnapshotV1[]
}

export function evaluateAssetTransactionCancellation(input: CancellationPolicyInput) {
  const reasons: AssetTransactionCancellationReason[] = []
  if (!input.snapshot) reasons.push("unsupported_snapshot")
  if (input.transactionStatus !== "active") reasons.push("not_active")
  if (!input.isLatestTransaction) reasons.push("not_latest")
  if (!input.assetMatchesAfterSnapshot) reasons.push("asset_changed")
  if (!input.componentsMatchAfterSnapshot) reasons.push("components_changed")
  if (input.downstreamTypes.length > 0) reasons.push("downstream_work")
  return reasons.length === 0 ? { eligible: true as const } : { eligible: false as const, reasons }
}
```

- [ ] **Step 4: Run GREEN and full lifecycle policy tests**

Run: `node --test --experimental-strip-types tests/asset-transaction-cancellation-policy.test.ts tests/asset-lifecycle-policy.test.ts tests/asset-operation-status-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/asset-transaction-snapshot.ts src/lib/asset-transaction-cancellation-policy.ts tests/asset-transaction-cancellation-policy.test.ts
git commit -m "feat: define asset transaction cancellation policy"
```

### Task 2: Add reversible transaction schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/manual-migrations/2026-08-27-add-reversible-asset-transactions.sql`
- Test: `tests/asset-transaction-cancellation-schema.test.ts`

**Interfaces:**
- Adds reversible metadata to `AssetCheckout` and `AssetCheckin`.
- Produces Prisma model `AssetTransfer` and Asset relation `transfers`.

- [ ] **Step 1: Write the failing schema contract test**

```ts
test("schema stores immutable cancellation metadata and transfer documents", () => {
  assert.match(schema, /model AssetTransfer[\s\S]*beforeSnapshotJson[\s\S]*voidReason/)
  assert.match(schema, /model AssetCheckout[\s\S]*transactionStatus[\s\S]*afterSnapshotJson/)
  assert.match(migration, /CREATE TABLE \[asset_transfers\]/)
  assert.match(migration, /transactionStatus|transaction_status/)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-transaction-cancellation-schema.test.ts`

Expected: FAIL because the fields, model, and migration are absent.

- [ ] **Step 3: Add Prisma fields and idempotent SQL Server DDL**

Use `transactionStatus @default("active")`, nullable snapshot fields for legacy rows, `voidedAt`, `voidedBy`, `voidReason`, and `updatedAt @updatedAt`. Create indexes for `assetId, transactionStatus, createdAt` and `documentNo`. Guard every SQL object/column/index with `OBJECT_ID`, `COL_LENGTH`, or `sys.indexes` checks.

- [ ] **Step 4: Verify schema and generation**

Run: `node --test --experimental-strip-types tests/asset-transaction-cancellation-schema.test.ts && npm run prisma:generate && npx tsc --noEmit`

Expected: PASS with Prisma Client generated successfully.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/manual-migrations/2026-08-27-add-reversible-asset-transactions.sql tests/asset-transaction-cancellation-schema.test.ts
git commit -m "feat: add reversible asset transaction records"
```

### Task 3: Capture snapshots and create Transfer documents

**Files:**
- Modify: `src/app/api/assets/[id]/checkout/route.ts`
- Modify: `src/app/api/assets/[id]/checkin/route.ts`
- Modify: `src/app/api/assets/[id]/transfer/route.ts`
- Modify: `src/lib/operation-document-number.ts`
- Modify: `src/lib/asset-component-sync.ts`
- Test: `tests/asset-transaction-snapshot-routes.test.ts`
- Test: `tests/asset-transfer-status.test.ts`

**Interfaces:**
- Consumes: `AssetTransactionSnapshotV1` and snapshot serialization from Task 1.
- Produces: Checkout/Check-in/Transfer records with complete snapshots; Transfer response contains `id` and `documentNo`.

- [ ] **Step 1: Write failing route contract tests**

```ts
test("operation routes persist before and after snapshots", () => {
  for (const source of [checkoutRoute, checkinRoute, transferRoute]) {
    assert.match(source, /beforeSnapshotJson/)
    assert.match(source, /afterSnapshotJson/)
    assert.match(source, /componentSnapshotJson/)
  }
  assert.match(transferRoute, /assetTransfer\.create/)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-transaction-snapshot-routes.test.ts tests/asset-transfer-status.test.ts`

Expected: FAIL because the routes do not persist versioned snapshots or Transfer documents.

- [ ] **Step 3: Implement snapshot-aware writes**

Build snapshots from the transaction's authoritative database rows inside the same Prisma transaction. Make `syncInstalledComponentsWithParent` return explicit component before/after records for serialization. Generate Transfer document numbers with prefix `TR-YYYYMM-NNNN`, then use the Transfer ID for parent and component movement references.

- [ ] **Step 4: Run GREEN**

Run: `node --test --experimental-strip-types tests/asset-transaction-snapshot-routes.test.ts tests/asset-transfer-status.test.ts tests/asset-component-sync-routes.test.ts tests/asset-component-sync.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assets src/lib/operation-document-number.ts src/lib/asset-component-sync.ts tests/asset-transaction-snapshot-routes.test.ts tests/asset-transfer-status.test.ts
git commit -m "feat: capture reversible asset operation snapshots"
```

### Task 4: Implement cancellation preview, commit, and blocked review

**Files:**
- Create: `src/lib/asset-transaction-cancellation-service.ts`
- Create: `src/lib/validations/asset-transaction-cancellation.ts`
- Create: `src/app/api/asset-checkouts/[id]/cancel-preview/route.ts`
- Create: `src/app/api/asset-checkouts/[id]/cancel/route.ts`
- Create: `src/app/api/asset-checkins/[id]/cancel-preview/route.ts`
- Create: `src/app/api/asset-checkins/[id]/cancel/route.ts`
- Create: `src/app/api/asset-transfers/[id]/cancel-preview/route.ts`
- Create: `src/app/api/asset-transfers/[id]/cancel/route.ts`
- Modify: `src/lib/asset-state-review-types.ts`
- Modify: `src/lib/asset-state-review-service.ts`
- Test: `tests/asset-transaction-cancellation-service.test.ts`
- Test: `tests/asset-transaction-cancellation-routes.test.ts`

**Interfaces:**
- Produces: `previewAssetTransactionCancellation(input)` and `cancelAssetTransaction(input)`.
- Input includes `{ type, transactionId, userId, reason, expectedUpdatedAt }`.
- Output is `{ status: "cancelled"; movementId }` or `{ status: "blocked"; reviewId; reasons }`.

- [ ] **Step 1: Write failing service tests**

```ts
test("checkin cancellation reopens checkout and restores the full snapshot atomically", async () => {
  const result = await cancelAssetTransaction(eligibleCheckinInput, fakeRepository)
  assert.equal(result.status, "cancelled")
  assert.equal(fakeRepository.checkout.isReturned, false)
  assert.deepEqual(fakeRepository.asset, beforeSnapshotAsset)
  assert.equal(fakeRepository.movements.at(-1)?.movementType, "checkin_cancel")
})

test("blocked cancellation creates one review and changes no asset state", async () => {
  const result = await cancelAssetTransaction(blockedInput, fakeRepository)
  assert.equal(result.status, "blocked")
  assert.equal(fakeRepository.reviews.length, 1)
  assert.deepEqual(fakeRepository.asset, currentAsset)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-transaction-cancellation-service.test.ts tests/asset-transaction-cancellation-routes.test.ts`

Expected: FAIL because service and routes do not exist.

- [ ] **Step 3: Implement transactional cancellation and stable errors**

Use one serializable Prisma transaction for reread, policy evaluation, document voiding, asset/component restoration, Checkout reopening, compensating movement, and System Log data assembly. Upsert the blocked review by asset + issue type and metadata transaction identity. Return stable codes `TRANSACTION_NOT_FOUND`, `TRANSACTION_NOT_ACTIVE`, `TRANSACTION_STALE`, `TRANSACTION_CANCELLATION_BLOCKED`, and `TRANSACTION_SNAPSHOT_UNSUPPORTED`.

- [ ] **Step 4: Run GREEN**

Run: `node --test --experimental-strip-types tests/asset-transaction-cancellation-service.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/asset-state-review-types.test.ts tests/asset-state-review-resolution.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/asset-transaction-cancellation-service.ts src/lib/validations/asset-transaction-cancellation.ts src/lib/asset-state-review-types.ts src/lib/asset-state-review-service.ts src/app/api/asset-checkouts src/app/api/asset-checkins src/app/api/asset-transfers tests/asset-transaction-cancellation-service.test.ts tests/asset-transaction-cancellation-routes.test.ts
git commit -m "feat: cancel eligible asset transactions safely"
```

### Task 5: Add cancellation UI and void documents

**Files:**
- Create: `src/components/asset-operations/transaction-cancel-dialog.tsx`
- Create: `src/components/asset-operations/void-document-banner.tsx`
- Modify: `src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx`
- Modify: `src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx`
- Create: `src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `src/components/asset-operations/operation-document-print.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/asset-transaction-cancellation-ui.test.ts`

**Interfaces:**
- Consumes: preview and cancel APIs from Task 4.
- Produces: accessible cancel dialog, persistent void banner, and print watermark.

- [ ] **Step 1: Write failing UI contract tests**

```ts
test("void documents retain evidence and render cancellation metadata", () => {
  assert.match(printSource, /VoidDocumentBanner/)
  assert.match(documentComponent, /data-void-watermark/)
  assert.match(dialogSource, /expectedUpdatedAt/)
  assert.match(dialogSource, /reason/)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-transaction-cancellation-ui.test.ts`

Expected: FAIL because the dialog and void presentation do not exist.

- [ ] **Step 3: Implement accessible preview-and-confirm UI**

Use the existing accessible dialog and review-summary patterns. Show original operator, current state, restore state, component count, blockers, and required reason. Preserve input after recoverable API errors. Disable repeat cancellation and keep evidence links visible on void documents.

- [ ] **Step 4: Run GREEN and scoped lint**

Run: `node --test --experimental-strip-types tests/asset-transaction-cancellation-ui.test.ts tests/accessible-dialog.test.ts && npx eslint src/components/asset-operations src/app/[locale]/\(print\)/asset-management messages`

Expected: PASS with zero ESLint errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/asset-operations src/app/[locale] messages tests/asset-transaction-cancellation-ui.test.ts
git commit -m "feat: expose safe asset transaction cancellation"
```

### Task 6: Document, verify, and stop before production migration

**Files:**
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT.md`
- Modify: `docs/12_HANDOUT.md`
- Modify: `docs/99_CHANGELOG.md`
- Modify: `DEVELOPER_HANDOFF.md`

**Interfaces:**
- Documents migration filename, legacy limitations, permission rules, blocked-review behavior, and read-only production UAT.

- [ ] **Step 1: Update operator and developer documentation**

State explicitly that legacy documents without complete snapshots cannot be auto-cancelled and that the migration file has been created but not applied.

- [ ] **Step 2: Run complete verification**

Run: `npm test && npm run lint && npm run prisma:generate && npx tsc --noEmit && npm run build && git diff --check`

Expected: tests report zero failures, lint reports zero errors, Prisma generation and build exit 0, and diff check is clean.

- [ ] **Step 3: Commit documentation and verification record**

```bash
git add docs DEVELOPER_HANDOFF.md
git commit -m "docs: hand off reversible asset transactions"
```

- [ ] **Step 4: Stop at the migration gate**

Do not run `npm run migration:apply`. Report the pending migration and request verified-backup confirmation in a later user turn.
