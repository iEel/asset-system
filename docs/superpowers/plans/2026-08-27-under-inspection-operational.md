# Under Inspection Operational Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `Under Inspection` as an active controlled asset status without generating false-positive legacy review items.

**Architecture:** Preserve generic create/edit restrictions and normal checkout/transfer blocks in the centralized lifecycle policy. Remove only the obsolete legacy detector classification, make controlled correction back to `Ready` available, keep maintenance/disposal as their own workflows, and update master-data wording and operator documentation.

**Tech Stack:** Next.js 16.2.4, TypeScript, Prisma 7.8.0, SQL Server, Node test runner

**Spec:** `docs/05_ASSET_LIFECYCLE.md`

## Global Constraints

- `Under Inspection` remains active and readable.
- Generic asset create/edit must not select workflow-owned status transitions.
- Checkout and normal personal transfer must remain blocked while inspection is active.
- Scanning may create, refresh, or auto-close review records but must never rewrite an asset.
- Existing user changes and unrelated untracked files must remain untouched.

---

### Task 1: Lifecycle policy and detector

**Files:**
- Modify: `tests/asset-state-review-detector.test.ts`
- Modify: `tests/asset-operation-status-policy.test.ts`
- Modify: `src/lib/asset-state-review-detector.ts`
- Modify: `src/lib/asset-lifecycle-exception-policy.ts`

**Interfaces:**
- Consumes: `detectAssetStateIssues(snapshot)` and `getAssetStatusCorrectionError(current, next)`.
- Produces: active inspection classification and controlled recovery to `Ready`.

- [x] **Step 1: Write failing regression tests**

Assert that `Under Inspection` does not emit `controlled_legacy_status`, while `Reserved` and `In Transit` still do. Assert that inspection is a recoverable protected state and still fails checkout/transfer checks.

- [x] **Step 2: Run focused tests and verify RED**

Run `node --import tsx --test tests/asset-state-review-detector.test.ts tests/asset-operation-status-policy.test.ts` and confirm the new detector/correction expectations fail.

- [x] **Step 3: Implement the minimal policy change**

Remove `under inspection` from `controlledLegacyStatuses` and add it to the controlled correction source set. Do not add it to checkout, transfer, generic create, or generic edit allowed sources.

- [x] **Step 4: Run focused tests and verify GREEN**

Run the same focused test command and require all tests to pass.

### Task 2: Master data and durable documentation

**Files:**
- Modify: `prisma/seed.ts`
- Create: `prisma/manual-migrations/2026-08-27-keep-under-inspection-operational.sql`
- Modify: `docs/05_ASSET_LIFECYCLE.md`
- Modify: `docs/15_ASSET_STATUS_USER_GUIDE_TH.md`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/99_CHANGELOG.md`

**Interfaces:**
- Consumes: the lifecycle behavior from Task 1.
- Produces: reproducible active-status description and operator/developer guidance.

- [x] **Step 1: Update master-data wording**

Change the seed description and add an idempotent SQL Server update scoped to `asset_statuses.name = 'Under Inspection'`.

- [x] **Step 2: Update lifecycle and user guidance**

Document inspection as active/controlled, list its workflow outcomes, state that checkout/transfer are blocked, and remove the future recommendation to introduce it later.

- [x] **Step 3: Update handoff and changelog**

Record the corrected detector meaning, database follow-up, and expected rescan auto-close behavior.

### Task 3: Database reconciliation and release verification

**Files:**
- No schema changes.

**Interfaces:**
- Consumes: detector and SQL from Tasks 1-2.
- Produces: reconciled pending review queue and verified release commit.

- [x] **Step 1: Apply the idempotent master-data SQL**

Run the follow-up SQL against the configured database and verify the `Under Inspection` row remains active with the new description.

- [x] **Step 2: Re-run the asset-state scan**

Run `scanAssetStateReviews` and verify the 191 obsolete `controlled_legacy_status` findings auto-close while asset status/condition values remain unchanged.

- [x] **Step 3: Run release verification**

Run focused tests, `npm run verify`, and `git diff --check`; inspect the final diff and status.

- [x] **Step 4: Commit and push**

Stage only the scoped files, create one descriptive commit, push `master`, and verify local and remote commit hashes match.
