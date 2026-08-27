# Asset Missing and Lost Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auditable Missing/Lost investigation, assignment, evidence, recovery, inspection, and SLA handling without breaking open custody records.

**Architecture:** Store investigation truth in `AssetLossCase`, drive transitions through a pure state-machine policy and one transactional service, and link cases to optional Audit Findings and existing Attachments. Missing/Lost may coexist with an open Checkout only through a linked case; recovery uses Under Inspection before restoring Checked Out, custody-derived operational state, or Pending Repair.

**Tech Stack:** Next.js 16.2.4 App Router, TypeScript, Prisma 7.8.0, SQL Server manual migrations, next-intl, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-27-asset-workflow-safety-and-follow-up-design.md`

## Global Constraints

- Read relevant `node_modules/next/dist/docs/` guides before changing Route Handlers or pages.
- Require `asset:edit` for mutations; no second approver is required.
- Audit Mark Not Found remains review-first and never changes Asset status automatically.
- Preserve open Checkout accountability through Missing/Lost and recovery.
- Confirm Lost only with evidence or a nonblank evidence-exception reason.
- Allow one active investigating/recovered-inspection case per Asset.
- Do not run the production migration without verified backup confirmation and separate approval.

---

### Task 1: Define loss-case states, transitions, and validation

**Files:**
- Create: `src/lib/asset-loss-case-policy.ts`
- Create: `src/lib/validations/asset-loss-case.ts`
- Test: `tests/asset-loss-case-policy.test.ts`

**Interfaces:**
- Produces: `AssetLossCaseStatus`, `AssetLossCaseAction`, `evaluateAssetLossTransition(input)`, and Zod schemas for report, assign, follow-up, confirm-lost, recover, and complete-inspection.

- [ ] **Step 1: Write failing transition tests**

```ts
test("preserves open checkout accountability through recovery", () => {
  assert.deepEqual(evaluateAssetLossTransition({
    caseStatus: "recovered_inspection",
    action: "complete_inspection",
    hasOpenCheckout: true,
    damaged: false,
    hasPersonalCustodian: true,
  }), { allowed: true, nextCaseStatus: "closed_recovered", nextAssetStatus: "Checked Out" })
})

test("requires evidence or an exception before confirming Lost", () => {
  assert.deepEqual(evaluateAssetLossTransition({
    caseStatus: "investigating",
    action: "confirm_lost",
    evidenceCount: 0,
    evidenceExceptionReason: "",
  }), { allowed: false, code: "LOSS_EVIDENCE_REQUIRED" })
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-loss-case-policy.test.ts`

Expected: FAIL because loss policy and schemas do not exist.

- [ ] **Step 3: Implement the pure state machine and exact validations**

Allow `investigating -> lost|recovered_inspection`, `lost -> recovered_inspection`, and `recovered_inspection -> closed_recovered`. When an open Checkout exists, always restore Checked Out and require any later physical return or damage handling to use normal Check-in. Without an open Checkout, derive In Use for personal custody, Ready without personal custody, or Pending Repair only when maintenance creation is requested with a reporter and problem.

- [ ] **Step 4: Run GREEN**

Run: `node --test --experimental-strip-types tests/asset-loss-case-policy.test.ts tests/asset-lifecycle-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/asset-loss-case-policy.ts src/lib/validations/asset-loss-case.ts tests/asset-loss-case-policy.test.ts
git commit -m "feat: define missing and lost asset policy"
```

### Task 2: Add loss-case schema and idempotent migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/manual-migrations/2026-08-27-add-asset-loss-cases.sql`
- Test: `tests/asset-loss-case-schema.test.ts`

**Interfaces:**
- Produces Prisma model `AssetLossCase`, Asset relation `lossCases`, optional relations to Employee, Location, and AuditFinding, and filtered unique active-case enforcement.

- [ ] **Step 1: Write failing schema tests**

```ts
test("loss cases retain assignment, SLA, source, evidence exception, and recovery history", () => {
  assert.match(schema, /model AssetLossCase[\s\S]*caseStatus[\s\S]*investigatorId[\s\S]*dueDate/)
  assert.match(schema, /beforeSnapshotJson[\s\S]*openCheckoutId[\s\S]*evidenceExceptionReason/)
  assert.match(migration, /CREATE UNIQUE INDEX \[UX_asset_loss_cases_active_asset\]/)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-loss-case-schema.test.ts`

Expected: FAIL because model and SQL are absent.

- [ ] **Step 3: Add schema and guarded SQL Server DDL**

Use `NVARCHAR` lengths matching the design, indexes for status/due date/investigator/asset/source, and a filtered unique index where `case_status IN ('investigating','recovered_inspection')`. Do not create cases for existing Missing/Lost rows in SQL.

- [ ] **Step 4: Verify schema**

Run: `node --test --experimental-strip-types tests/asset-loss-case-schema.test.ts && npm run prisma:generate && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/manual-migrations/2026-08-27-add-asset-loss-cases.sql tests/asset-loss-case-schema.test.ts
git commit -m "feat: add asset loss case records"
```

### Task 3: Implement transactional loss-case service and routes

**Files:**
- Create: `src/lib/asset-loss-case-service.ts`
- Create: `src/lib/asset-loss-case-number.ts`
- Create: `src/app/api/assets/[id]/loss-cases/route.ts`
- Create: `src/app/api/asset-loss-cases/[id]/assign/route.ts`
- Create: `src/app/api/asset-loss-cases/[id]/follow-up/route.ts`
- Create: `src/app/api/asset-loss-cases/[id]/confirm-lost/route.ts`
- Create: `src/app/api/asset-loss-cases/[id]/recover/route.ts`
- Create: `src/app/api/asset-loss-cases/[id]/complete-inspection/route.ts`
- Test: `tests/asset-loss-case-service.test.ts`
- Test: `tests/asset-loss-case-routes.test.ts`

**Interfaces:**
- Produces: `reportAssetMissing`, `assignAssetLossCase`, `recordLossFollowUp`, `confirmAssetLost`, `recoverAsset`, and `completeRecoveredAssetInspection`.
- All mutation inputs include `userId` and `expectedUpdatedAt`.

- [ ] **Step 1: Write failing service tests**

```ts
test("reporting Missing preserves an open checkout and writes movement history", async () => {
  const result = await reportAssetMissing(reportInput, repository)
  assert.equal(result.caseStatus, "investigating")
  assert.equal(repository.checkout.isReturned, false)
  assert.equal(repository.asset.statusName, "Missing")
  assert.equal(repository.movements.at(-1)?.movementType, "loss_reported")
})

test("damaged recovery without an open checkout creates maintenance atomically", async () => {
  const result = await completeRecoveredAssetInspection({ ...damagedInput, openCheckoutId: null }, repository)
  assert.equal(result.assetStatus, "Pending Repair")
  assert.equal(repository.maintenanceTickets.length, 1)
  assert.equal(result.caseStatus, "closed_recovered")
})

test("damaged recovery with an open checkout restores custody for normal check-in", async () => {
  const result = await completeRecoveredAssetInspection({ ...damagedInput, openCheckoutId: "co-1" }, repository)
  assert.equal(result.assetStatus, "Checked Out")
  assert.equal(repository.maintenanceTickets.length, 0)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-loss-case-service.test.ts tests/asset-loss-case-routes.test.ts`

Expected: FAIL because service and routes are missing.

- [ ] **Step 3: Implement serializable transitions and stable errors**

Reread Asset, status, case, Checkout, evidence count, and version inside one transaction. Write case, Asset, movement, optional maintenance, and log snapshot atomically. Return codes `LOSS_CASE_NOT_FOUND`, `LOSS_CASE_ALREADY_ACTIVE`, `LOSS_CASE_STALE`, `LOSS_TRANSITION_NOT_ALLOWED`, `LOSS_EVIDENCE_REQUIRED`, and `LOSS_MAINTENANCE_DETAILS_REQUIRED`.

- [ ] **Step 4: Run GREEN**

Run: `node --test --experimental-strip-types tests/asset-loss-case-service.test.ts tests/asset-loss-case-routes.test.ts tests/asset-operation-condition-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/asset-loss-case-service.ts src/lib/asset-loss-case-number.ts src/app/api/assets/[id]/loss-cases src/app/api/asset-loss-cases tests/asset-loss-case-service.test.ts tests/asset-loss-case-routes.test.ts
git commit -m "feat: implement asset missing and lost transitions"
```

### Task 4: Add evidence, Audit Finding handoff, and Data Quality rules

**Files:**
- Create: `src/app/api/asset-loss-cases/[id]/attachments/route.ts`
- Modify: `src/app/api/audit-findings/[id]/review/route.ts`
- Modify: `src/components/audit/audit-finding-review-actions.tsx`
- Modify: `src/lib/asset-state-review-detector.ts`
- Modify: `src/lib/asset-state-review-types.ts`
- Test: `tests/asset-loss-case-audit-integration.test.ts`
- Test: `tests/asset-state-review-detector.test.ts`

**Interfaces:**
- Audit approval provides a prefilled `openLossCaseHref` without mutating Asset state.
- Detector accepts Open Checkout + Missing/Lost only when linked to the matching current loss case.

- [ ] **Step 1: Write failing integration tests**

```ts
test("approved not-found finding offers case creation without changing asset status", () => {
  assert.match(reviewRoute, /openLossCaseHref/)
  assert.doesNotMatch(reviewRoute, /statusName:\s*["']Missing/)
})

test("open checkout status mismatch is suppressed only by a linked loss case", () => {
  assert.equal(detect(linkedMissingSnapshot).some(isOpenCheckoutMismatch), false)
  assert.equal(detect(unlinkedMissingSnapshot).some(isOpenCheckoutMismatch), true)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-loss-case-audit-integration.test.ts tests/asset-state-review-detector.test.ts`

Expected: FAIL on missing handoff and detector exception.

- [ ] **Step 3: Implement evidence and review-first handoff**

Reuse upload validation and `module=asset_loss_case`. Prefill source type/id, last-seen date from the audit event, and existing evidence references; require an explicit case submit. Extend observed snapshots with active loss-case identity for detector decisions.

- [ ] **Step 4: Run GREEN**

Run: `node --test --experimental-strip-types tests/asset-loss-case-audit-integration.test.ts tests/asset-state-review-detector.test.ts tests/upload-validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/asset-loss-cases/[id]/attachments src/app/api/audit-findings src/components/audit src/lib/asset-state-review-detector.ts src/lib/asset-state-review-types.ts tests/asset-loss-case-audit-integration.test.ts tests/asset-state-review-detector.test.ts
git commit -m "feat: connect loss cases to audit review"
```

### Task 5: Build responsive loss-case center and Asset actions

**Files:**
- Create: `src/app/[locale]/(dashboard)/asset-management/loss-cases/page.tsx`
- Create: `src/app/[locale]/(dashboard)/asset-management/loss-cases/[id]/page.tsx`
- Create: `src/components/asset-loss/asset-loss-case-form.tsx`
- Create: `src/components/asset-loss/asset-loss-case-actions.tsx`
- Create: `src/components/asset-loss/asset-loss-case-timeline.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/asset-loss-case-ui.test.ts`

**Interfaces:**
- Consumes Task 3/4 APIs.
- Produces searchable center, case detail timeline, assignment/follow-up/actions, and contextual Asset Detail entry points.

- [ ] **Step 1: Write failing UI contract tests**

```ts
test("loss center provides operational filters and mobile cards", () => {
  assert.match(pageSource, /caseStatus/)
  assert.match(pageSource, /investigatorId/)
  assert.match(pageSource, /data-loss-case-mobile-card/)
})

test("asset detail exposes only the action valid for the current case state", () => {
  assert.match(detailSource, /AssetLossCaseActions/)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --experimental-strip-types tests/asset-loss-case-ui.test.ts`

Expected: FAIL because the center and actions do not exist.

- [ ] **Step 3: Implement Operate-mode UI**

Use server-side bounded queries, URL-backed filters, semantic desktop tables, mobile cards, accessible dialogs, evidence dropzone, and one timeline. Keep one primary action and no more than three visible secondary actions. Preserve return navigation to the originating Asset or Audit Finding.

- [ ] **Step 4: Run GREEN and scoped lint**

Run: `node --test --experimental-strip-types tests/asset-loss-case-ui.test.ts tests/accessible-dialog.test.ts && npx eslint src/components/asset-loss src/app/[locale]/\(dashboard\)/asset-management/loss-cases messages`

Expected: PASS with zero ESLint errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/\(dashboard\)/asset-management/loss-cases src/app/[locale]/\(dashboard\)/assets/[id]/page.tsx src/components/asset-loss messages tests/asset-loss-case-ui.test.ts
git commit -m "feat: add missing and lost asset workspace"
```

### Task 6: Document, verify, and stop before production migration

**Files:**
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT.md`
- Modify: `docs/12_HANDOUT.md`
- Modify: `docs/15_ASSET_STATUS_USER_GUIDE_TH.md`
- Modify: `docs/16_ASSET_STATUS_WORKFLOW_TH.md`
- Modify: `docs/99_CHANGELOG.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Document Missing, Lost, recovery, open Checkout, Audit handoff, evidence, and SLA behavior**

Explicitly state that Audit Mark Not Found does not automatically change Asset status and that existing Missing/Lost rows are reviewed rather than auto-backfilled into cases.

- [ ] **Step 2: Run complete verification**

Run: `npm test && npm run lint && npm run prisma:generate && npx tsc --noEmit && npm run build && git diff --check`

Expected: zero test failures, zero lint errors, successful Prisma generation/build, and clean diff check.

- [ ] **Step 3: Commit**

```bash
git add docs DEVELOPER_HANDOFF.md
git commit -m "docs: hand off missing and lost asset workflow"
```

- [ ] **Step 4: Stop at the migration gate**

Do not apply `2026-08-27-add-asset-loss-cases.sql` until the user confirms a verified backup and explicitly authorizes migration execution.
