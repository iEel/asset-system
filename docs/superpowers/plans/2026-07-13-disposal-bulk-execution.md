# Controlled Bulk Disposal Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permission-aware, preflighted bulk actual-disposal workflow for up to 20 approved requests of one disposal type while preserving independent transactions, evidence policy, SOD, movements, audit logs, and request-specific execution data.

**Architecture:** Add a pure bulk policy/types module, a server orchestration service that converts each approved request plus shared execution fields into the existing `DisposalExecutionCommand`, and a dedicated non-cached POST Route Handler with preview/commit modes. Add a separate client provider for approved-queue selection and a responsive review/result dialog; the existing single-item execution service remains authoritative and runs one serializable transaction per successful item.

**Tech Stack:** Next.js 16.2.4 App Router Route Handlers, React 19, TypeScript, Prisma 7 with SQL Server adapter, Zod 4, next-intl, Tailwind CSS, Lucide React, Node test runner.

## Global Constraints

- Maximum selection is exactly 20 unique request IDs from the currently loaded approved queue page.
- One operation contains exactly one disposal type.
- Shared inputs are actual date, active executor, and active final `Disposed` or `Retired` status.
- Recipient, document number, sale/salvage values, and execution detail come from each request and are never copied across requests.
- Historical no-evidence mode requires exact `system_admin`, zero active item and inherited batch evidence per executable item, a 20-2,000 character reason, and acknowledgement.
- Normal and historical modes are never mixed in one commit.
- Every item executes through `executeDisposalRequest` in its own serializable transaction.
- No schema or migration changes.
- Preserve existing bulk approval behavior, RBAC, SOD, audit logs, batch derivation, locale routing, Navy/White/Action Blue design tokens, 44px mobile targets, and Lucide icons.
- Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` before implementing the Route Handler.

---

### Task 1: Bulk Execution Policy And Validation

**Files:**
- Create: `src/lib/disposal-bulk-execution.ts`
- Modify: `src/lib/validations/disposal.ts`
- Modify: `src/lib/disposal-api-errors.ts`
- Modify: `src/lib/disposal-error-message.ts`
- Test: `tests/disposal-bulk-execution.test.ts`

**Interfaces:**
- Produces `MAX_DISPOSAL_BULK_EXECUTION_ITEMS`, `DisposalBulkExecutionCode`, `DisposalBulkExecutionItem`, `DisposalBulkExecutionResponse`, `normalizeDisposalBulkExecutionIds`, `getDisposalBulkSelectionBlockCode`, and `summarizeDisposalBulkExecution`.
- Produces `disposalBulkExecutionSchema` and `DisposalBulkExecutionInput` with `mode`, `requestIds`, shared execution values, and historical exception fields.
- Consumes existing `DisposalType`, `DisposalApiErrorCode`, lifecycle policy, and evidence-exception policy.

- [ ] **Step 1: Write failing pure-policy tests**

Add tests that assert:

```ts
assert.deepEqual(normalizeDisposalBulkExecutionIds(["r1", "r1", " r2 "]), ["r1", "r2"])
assert.throws(() => disposalBulkExecutionSchema.parse({ ...validInput, requestIds: [] }))
assert.throws(() => disposalBulkExecutionSchema.parse({ ...validInput, requestIds: Array.from({ length: 21 }, (_, index) => `r${index}`) }))
assert.equal(getDisposalBulkSelectionBlockCode(sellCandidate, "sell"), null)
assert.equal(getDisposalBulkSelectionBlockCode(destroyCandidate, "sell"), "DISPOSAL_BULK_MIXED_TYPES")
assert.deepEqual(summarizeDisposalBulkExecution(items), {
  selected: 3,
  eligible: 0,
  blocked: 1,
  executed: 1,
  failed: 1,
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --import tsx --test tests/disposal-bulk-execution.test.ts`

Expected: FAIL because the bulk execution module and schema do not exist.

- [ ] **Step 3: Implement the pure types, limits, normalization, and schema**

Define the request schema with these exact fields:

```ts
export const disposalBulkExecutionSchema = z.object({
  mode: z.enum(["preview", "commit"]),
  requestIds: z.array(z.string().trim().min(1)).min(1).max(20)
    .transform((ids) => [...new Set(ids)]),
  executionDate: z.coerce.date(),
  executedById: z.string().trim().min(1),
  nextStatusId: z.string().trim().min(1),
  useHistoricalEvidenceException: z.boolean().optional().default(false),
  evidenceExceptionReason: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().trim().max(2000).nullable().optional(),
  ),
  evidenceExceptionAcknowledged: z.boolean().optional().default(false),
})
```

Use stable bulk-only codes for invalid/mixed selection and generic bulk failure while allowing item results to carry existing disposal API codes.

- [ ] **Step 4: Run focused validation tests and confirm GREEN**

Run: `node --import tsx --test tests/disposal-bulk-execution.test.ts tests/disposal-validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/disposal-bulk-execution.ts src/lib/validations/disposal.ts src/lib/disposal-api-errors.ts src/lib/disposal-error-message.ts tests/disposal-bulk-execution.test.ts tests/disposal-validation.test.ts
git commit -m "feat: define disposal bulk execution policy"
```

### Task 2: Preview And Commit Orchestration Service

**Files:**
- Create: `src/lib/disposal-bulk-execution-service.ts`
- Modify: `src/lib/disposal-execution-service.ts`
- Modify: `tests/disposal-execution-service.test.ts`
- Test: `tests/disposal-bulk-execution-service.test.ts`

**Interfaces:**
- Consumes `DisposalBulkExecutionInput`, `DisposalExecutionActor`, `DisposalExecutionDatabase`, `DisposalBatchSchemaReadiness`, and `executeDisposalRequest`.
- Produces `inspectDisposalBulkExecution(command, dependencies)` and `commitDisposalBulkExecution(command, dependencies)`.
- Produces request-specific command mapping that reads `disposalType`, `recipientName`, `documentNo`, `saleValue`, `salvageValue`, and `executionRemark` from each authoritative request.

- [ ] **Step 1: Write failing service behavior tests**

Build a fake database and injected single-item executor. Cover:

```ts
test("preview preserves input order and blocks mixed types and missing per-item fields", async () => {})
test("commit executes each eligible item independently with shared date executor and status", async () => {})
test("commit preserves each request recipient values and money fields", async () => {})
test("historical mode blocks evidence rows and requires exact system_admin", async () => {})
test("normal mode blocks rows without evidence", async () => {})
test("one executor failure produces partial success and retryable unresolved rows", async () => {})
test("already executed requests return blocked without a second executor call", async () => {})
test("unknown batch schema readiness fails closed for every selected row", async () => {})
```

Assert that successful rows invoke `executeDisposalRequest` once each, not one shared database transaction.

- [ ] **Step 2: Run the service test and confirm RED**

Run: `node --import tsx --test tests/disposal-bulk-execution-service.test.ts`

Expected: FAIL because the orchestration service does not exist.

- [ ] **Step 3: Expose a read-only execution candidate contract**

Refactor only the reusable candidate selection and command-building inputs from `disposal-execution-service.ts`. Do not weaken transaction validation. Keep `executeDisposalRequest` as the sole mutating function and retain its fresh serializable checks.

The bulk service must create each input as:

```ts
const executionInput: DisposalExecutionInput = {
  disposalType: candidate.disposalType,
  executionDate: shared.executionDate,
  executedById: shared.executedById,
  nextStatusId: shared.nextStatusId,
  recipientName: candidate.recipientName,
  documentNo: candidate.documentNo,
  actualSaleValue: candidate.saleValue == null ? null : Number(candidate.saleValue),
  actualSalvageValue: candidate.salvageValue == null ? null : Number(candidate.salvageValue),
  executionRemark: candidate.executionRemark,
  useHistoricalEvidenceException: shared.useHistoricalEvidenceException,
  evidenceExceptionReason: shared.evidenceExceptionReason,
  evidenceExceptionAcknowledged: shared.evidenceExceptionAcknowledged,
}
```

- [ ] **Step 4: Implement advisory preview**

Load all selected requests in one bounded query, preserving caller order. Use bounded aggregate evidence queries, lifecycle/SOD/type-specific field policy, shared executor/status checks, same-type enforcement, and exact-role historical policy. Return `eligible` or `blocked`; do not mutate.

- [ ] **Step 5: Implement independent commit orchestration**

Re-read each unresolved request immediately before execution, rebuild its command, and call `executeDisposalRequest`. Convert known `DisposalExecutionServiceError` values to item-level `blocked` outcomes. Convert unexpected per-item failures to `failed` with `DISPOSAL_BULK_EXECUTION_FAILED`, log server-side without sensitive details, and continue remaining items.

- [ ] **Step 6: Run service and single-item regression tests**

Run: `node --import tsx --test tests/disposal-bulk-execution-service.test.ts tests/disposal-execution-service.test.ts tests/disposal-evidence-exception.test.ts`

Expected: PASS with no duplicate movement/audit behavior regressions.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/lib/disposal-bulk-execution-service.ts src/lib/disposal-execution-service.ts tests/disposal-bulk-execution-service.test.ts tests/disposal-execution-service.test.ts
git commit -m "feat: orchestrate disposal bulk execution"
```

### Task 3: Authenticated Bulk Execution Route

**Files:**
- Create: `src/app/api/disposal-requests/bulk-execution/route.ts`
- Modify: `src/lib/rbac-route-matrix.ts`
- Modify: `tests/rbac-route-matrix.test.ts`
- Test: `tests/disposal-bulk-execution-route.test.ts`

**Interfaces:**
- Consumes `disposalBulkExecutionSchema`, `inspectDisposalBulkExecution`, `commitDisposalBulkExecution`, `getDisposalBatchSchemaReadiness`, `requireAuth`, and `requirePermission`.
- Produces `POST /api/disposal-requests/bulk-execution` returning `DisposalBulkExecutionResponse`.

- [ ] **Step 1: Write failing route-structure and RBAC tests**

Assert the route:

```ts
assert.match(source, /requireAuth\(\)/)
assert.match(source, /requirePermission\(user, "disposal", "edit"\)/)
assert.match(source, /disposalBulkExecutionSchema\.parse/)
assert.match(source, /mode === "preview"/)
assert.match(source, /inspectDisposalBulkExecution/)
assert.match(source, /commitDisposalBulkExecution/)
assert.doesNotMatch(source, /error\.stack|DATABASE_URL/)
```

Add the route to the RBAC matrix as `disposal:edit`.

- [ ] **Step 2: Run route tests and confirm RED**

Run: `node --import tsx --test tests/disposal-bulk-execution-route.test.ts tests/rbac-route-matrix.test.ts`

Expected: FAIL because the route and matrix entry do not exist.

- [ ] **Step 3: Implement the POST Route Handler**

Follow the checked-in Next.js 16 Route Handler guide. Parse one JSON body, enforce `disposal:edit`, construct the actor from authenticated user ID/employee/roles/permissions, resolve tri-state batch schema readiness once, call preview or commit, and return JSON. Map malformed requests to 400, authorization failures to 401/403 using project helpers, and unexpected errors to a sanitized 500 response.

- [ ] **Step 4: Run route and RBAC tests**

Run: `node --import tsx --test tests/disposal-bulk-execution-route.test.ts tests/rbac-route-matrix.test.ts tests/disposal-route-structure.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/app/api/disposal-requests/bulk-execution/route.ts src/lib/rbac-route-matrix.ts tests/disposal-bulk-execution-route.test.ts tests/rbac-route-matrix.test.ts
git commit -m "feat: add disposal bulk execution API"
```

### Task 4: Approved-Queue Selection And Review Dialog

**Files:**
- Create: `src/components/disposal/disposal-bulk-execution.tsx`
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/disposal-bulk-execution-ui.test.ts`

**Interfaces:**
- Consumes page-scoped approved request metadata, execution status options, executor options, `canUseHistoricalEvidenceException`, the selection key, and localized copy.
- Produces `DisposalBulkExecutionProvider`, `DisposalBulkExecutionSelectionToggle`, `DisposalBulkExecutionCheckbox`, `DisposalBulkExecutionSelectPageControl`, and `DisposalBulkExecutionToolbar`.
- Posts preview/commit payloads to `/api/disposal-requests/bulk-execution`.

- [ ] **Step 1: Write failing UI source and message-coverage tests**

Assert:

```ts
assert.match(source, /MAX_DISPOSAL_BULK_EXECUTION_ITEMS/)
assert.match(source, /mode:\s*"preview"/)
assert.match(source, /mode:\s*"commit"/)
assert.match(source, /aria-live="polite"/)
assert.match(source, /role="dialog"/)
assert.match(source, /aria-modal="true"/)
assert.match(source, /min-h-11 min-w-11/)
assert.doesNotMatch(source, /fixed\s+bottom-0/)
```

Verify every visible key and every bulk execution error exists in Thai and English.

- [ ] **Step 2: Run UI tests and confirm RED**

Run: `node --import tsx --test tests/disposal-bulk-execution-ui.test.ts`

Expected: FAIL because the component and messages do not exist.

- [ ] **Step 3: Implement selection state and same-type constraint**

Use the existing bulk approval component's generation counters, AbortController handling, selection-key clearing, discard confirmation, focus restoration, and 44px controls as the local pattern. The first selected row sets the type. Disable other types with a visible and accessible explanation. Limit selection to 20.

- [ ] **Step 4: Implement the review, confirmation, and result states**

The dialog must contain shared date/executor/final-status controls, progressive historical exception controls, preview totals and item reasons, permanent-action confirmation, commit progress, and final executed/blocked/failed groups. Retry sends only blocked/failed IDs that remain selected. Do not add a fixed mobile action bar.

- [ ] **Step 5: Integrate only with the approved queue**

On `page.tsx`, create bulk execution items only when `canEdit` and the active status filter is `approved`. Render only one bulk selection system at a time:

- pending queue + `canApprove`: existing bulk approval controls;
- approved queue + `canEdit`: new bulk execution controls;
- every other stage: no bulk controls.

Pass evidence counts, disposal type, asset label, existing request-specific execution values, SOD metadata, employees, and final statuses without introducing per-row queries.

- [ ] **Step 6: Run UI and existing bulk approval regression tests**

Run: `node --import tsx --test tests/disposal-bulk-execution-ui.test.ts tests/disposal-bulk-approval.test.ts`

Expected: PASS; both desktop and mobile source rules remain satisfied.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/components/disposal/disposal-bulk-execution.tsx 'src/app/[locale]/(dashboard)/disposal/page.tsx' messages/th.json messages/en.json tests/disposal-bulk-execution-ui.test.ts
git commit -m "feat: add disposal bulk execution workspace"
```

### Task 5: Documentation, Regression Verification, And UAT Readiness

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/08_PRODUCTION_READINESS.md`
- Modify: `docs/99_CHANGELOG.md`
- Test: all disposal-focused tests and full project verification.

**Interfaces:**
- Documents the shipped endpoint, 20-item same-type limit, shared/per-item field behavior, historical system-admin policy, partial results, retry, and no-migration requirement.

- [ ] **Step 1: Update workflow documentation**

Replace statements that bulk execution is unavailable. State explicitly that bulk rejection remains unavailable, bulk approval stays capped at 50 pending requests, and bulk execution is capped at 20 approved same-type requests with independent item transactions.

- [ ] **Step 2: Add role-based UAT scenarios**

Add desktop and mobile scenarios for normal evidence, historical no-evidence, mixed-type disabled selection, SOD blocks, missing per-item data, partial success, stale preview, retry, movement/audit history, approval history, system log presentation, and parent-batch status.

- [ ] **Step 3: Run focused tests**

Run:

```bash
node --import tsx --test \
  tests/disposal-bulk-execution.test.ts \
  tests/disposal-bulk-execution-service.test.ts \
  tests/disposal-bulk-execution-route.test.ts \
  tests/disposal-bulk-execution-ui.test.ts \
  tests/disposal-execution-service.test.ts \
  tests/disposal-bulk-approval.test.ts \
  tests/disposal-validation.test.ts \
  tests/rbac-route-matrix.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run verify
npm run build
git diff --check
```

Expected: tests, TypeScript, lint, and diff check pass. `verify` and `build` must pass when SQL Server environment settings are available; otherwise record the exact page-data collection limitation without exposing connection values.

- [ ] **Step 5: Perform browser QA**

Using the authenticated local app, verify `/th/disposal?status=approved` at 1440x900, 390x844, and 375x812. Confirm selection controls do not collide with mobile navigation, the dialog fits without horizontal overflow, focus returns after close, and result groups remain readable with long Thai labels.

- [ ] **Step 6: Commit Task 5**

```bash
git add DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/08_PRODUCTION_READINESS.md docs/99_CHANGELOG.md
git commit -m "docs: document disposal bulk execution"
```

## Final Review Gate

- Review the complete diff from the plan-start commit through HEAD for authorization, SOD, item independence, evidence handling, type-specific data preservation, error sanitization, accessibility, localization, and regressions.
- Fix all Critical and Important findings before integration.
- Do not run a database migration because this feature has no schema changes.
- Merge only after focused tests, full `npm test`, TypeScript, lint, and final review are clean.
