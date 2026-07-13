# Disposal Historical Evidence Exception Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent, system-admin-only path for recording verified historical disposals that have no remaining photo or document evidence while preserving approval, SOD, lifecycle, and normal evidence controls.

**Architecture:** A pure evidence policy decides whether normal or historical execution is allowed. Nullable exception metadata persists on `DisposalRequest`; an idempotent SQL Server migration adds the columns. The existing execution route remains the only mutation endpoint, counts item and shared-batch evidence, and writes disposal state plus the audit log atomically. The existing execution dialog progressively reveals the exception controls only to `system_admin` when effective evidence is zero.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2.4, TypeScript, next-intl, Prisma 7.8 with SQL Server, Zod 4.4, Lucide React, Node test runner.

## Global Constraints

- Only the exact `system_admin` role may use the historical evidence exception.
- `disposal:edit` without `system_admin` is insufficient.
- The request must remain active and `approved`; approval and SOD are never bypassed.
- Final asset status remains limited to Disposed or Retired.
- Normal disposal execution still requires evidence and a document number.
- Historical execution is one request at a time; bulk historical execution is out of scope.
- Effective evidence means active item evidence plus active shared batch evidence.
- Historical reason is trimmed and must contain 20-2,000 characters.
- Use the existing Navy/White/Blue product design, semantic warning state, Lucide icons, accessible dialog, and Thai/English messages.
- Do not add CI work.
- Do not apply the manual migration without a fresh verified SQL Server backup.
- Do not stage or modify unrelated `.agents`, `.gemini`, `.codex`, or `.impeccable` worktree changes.

---

## File Structure

- Create `src/lib/disposal-evidence-exception.ts`: pure authorization/evidence decision policy and stable exception error codes.
- Modify `src/lib/disposal-type-policy.ts`: make the document-number requirement conditional on historical exception mode.
- Modify `src/lib/validations/disposal.ts`: parse the three exception input fields and feed mode into type validation.
- Create `tests/disposal-evidence-exception.test.ts`: focused policy, validation, schema, migration, route, UI, and presentation regression tests.
- Modify `prisma/schema.prisma`: persist reason, granting user ID, and grant timestamp.
- Create `prisma/manual-migrations/2026-07-13-add-disposal-evidence-exception.sql`: idempotent SQL Server column additions.
- Modify `src/lib/disposal-api-errors.ts` and `src/lib/disposal-error-message.ts`: register stable exception errors.
- Modify `src/app/api/disposal-requests/[id]/route.ts`: count effective evidence, enforce exact role, persist exception metadata, and make execution auditing transactional.
- Modify `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`: pass evidence/role context and present completed exceptions.
- Modify `src/components/disposal/disposal-execution-button.tsx`: add warning disclosure, reason, acknowledgement, and blocked normal state.
- Modify `src/app/[locale]/(print)/disposal/[id]/print/page.tsx`: print exception metadata and effective evidence count.
- Modify `messages/th.json` and `messages/en.json`: localized labels, explanations, and API errors.
- Modify `docs/03_DATABASE.md`, `docs/06_WORKFLOWS.md`, `docs/07_UAT_CHECKLIST.md`, `docs/08_PRODUCTION_READINESS.md`, and `docs/99_CHANGELOG.md`: operational and migration documentation.

---

### Task 1: Evidence Policy And Validation

**Files:**
- Create: `src/lib/disposal-evidence-exception.ts`
- Modify: `src/lib/disposal-type-policy.ts`
- Modify: `src/lib/validations/disposal.ts`
- Create: `tests/disposal-evidence-exception.test.ts`

**Interfaces:**
- Produces: `getDisposalExecutionEvidenceError(input): DisposalExecutionEvidenceErrorCode | null`.
- Produces: `canUseHistoricalDisposalEvidenceException(roles: string[]): boolean`.
- Produces: `disposalExecutionSchema` fields `useHistoricalEvidenceException`, `evidenceExceptionReason`, and `evidenceExceptionAcknowledged`.
- Consumes: existing `getDisposalExecutionFieldErrors` and type-specific disposal requirements.

- [ ] **Step 1: Write failing policy tests**

Create tests that import the missing policy and assert the complete decision table:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  canUseHistoricalDisposalEvidenceException,
  getDisposalExecutionEvidenceError,
} from "../src/lib/disposal-evidence-exception.ts"
import { disposalExecutionSchema } from "../src/lib/validations/disposal.ts"

test("restricts historical evidence exceptions to system administrators", () => {
  assert.equal(canUseHistoricalDisposalEvidenceException(["system_admin"]), true)
  assert.equal(canUseHistoricalDisposalEvidenceException(["asset_admin"]), false)
})

test("keeps normal execution blocked when effective evidence is missing", () => {
  assert.equal(getDisposalExecutionEvidenceError({
    roles: ["asset_admin"], effectiveEvidenceCount: 0,
    useHistoricalEvidenceException: false, evidenceExceptionReason: null,
    evidenceExceptionAcknowledged: false,
  }), "DISPOSAL_EVIDENCE_REQUIRED")
})

test("accepts a fully acknowledged system-admin historical exception", () => {
  assert.equal(getDisposalExecutionEvidenceError({
    roles: ["system_admin"], effectiveEvidenceCount: 0,
    useHistoricalEvidenceException: true,
    evidenceExceptionReason: "ทรัพย์สินถูกตัดจำหน่ายก่อนเริ่มใช้ระบบและไม่มีหลักฐานหลงเหลือ",
    evidenceExceptionAcknowledged: true,
  }), null)
})
```

Add separate assertions for forbidden role, active evidence, reason shorter than 20 characters, missing acknowledgement, and exception-only metadata submitted while mode is false.

```ts
const baseException = {
  roles: ["system_admin"], effectiveEvidenceCount: 0,
  useHistoricalEvidenceException: true,
  evidenceExceptionReason: "ทรัพย์สินถูกตัดจำหน่ายก่อนเริ่มใช้ระบบและไม่มีหลักฐานหลงเหลือ",
  evidenceExceptionAcknowledged: true,
}
assert.equal(getDisposalExecutionEvidenceError({ ...baseException, roles: ["asset_admin"] }), "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN")
assert.equal(getDisposalExecutionEvidenceError({ ...baseException, effectiveEvidenceCount: 1 }), "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE")
assert.equal(getDisposalExecutionEvidenceError({ ...baseException, evidenceExceptionReason: "สั้นเกินไป" }), "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED")
assert.equal(getDisposalExecutionEvidenceError({ ...baseException, evidenceExceptionAcknowledged: false }), "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED")
assert.equal(getDisposalExecutionEvidenceError({
  ...baseException,
  useHistoricalEvidenceException: false,
}), "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE")
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/disposal-evidence-exception.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/disposal-evidence-exception.ts`.

- [ ] **Step 3: Implement the pure policy**

Create the exact error union and decision order:

```ts
export type DisposalExecutionEvidenceErrorCode =
  | "DISPOSAL_EVIDENCE_REQUIRED"
  | "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN"
  | "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED"
  | "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED"
  | "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE"

export function canUseHistoricalDisposalEvidenceException(roles: string[]) {
  return roles.includes("system_admin")
}

export function getDisposalExecutionEvidenceError(input: {
  roles: string[]
  effectiveEvidenceCount: number
  useHistoricalEvidenceException: boolean
  evidenceExceptionReason?: string | null
  evidenceExceptionAcknowledged: boolean
}): DisposalExecutionEvidenceErrorCode | null {
  const reason = input.evidenceExceptionReason?.trim() ?? ""
  if (!input.useHistoricalEvidenceException) {
    if (reason || input.evidenceExceptionAcknowledged) return "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE"
    return input.effectiveEvidenceCount > 0 ? null : "DISPOSAL_EVIDENCE_REQUIRED"
  }
  if (!canUseHistoricalDisposalEvidenceException(input.roles)) return "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN"
  if (input.effectiveEvidenceCount > 0) return "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE"
  if (reason.length < 20) return "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED"
  if (!input.evidenceExceptionAcknowledged) return "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED"
  return null
}
```

- [ ] **Step 4: Make type-aware validation exception-aware**

Add `useHistoricalEvidenceException?: boolean` to `DisposalExecutionFields`; require `documentNo` only when it is false. Extend `disposalExecutionSchema`:

```ts
useHistoricalEvidenceException: z.boolean().optional().default(false),
evidenceExceptionReason: z.preprocess(
  (value) => typeof value === "string" ? value.trim() || null : value,
  z.string().max(2000).nullable().optional(),
),
evidenceExceptionAcknowledged: z.boolean().optional().default(false),
```

Pass `useHistoricalEvidenceException` through `getDisposalExecutionFieldErrors(input)`. Add schema assertions proving a sale still requires recipient and value, while only `documentNo` becomes optional in historical mode.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/disposal-evidence-exception.test.ts tests/disposal-validation.test.ts`

Expected: PASS.

Commit:

```bash
git add src/lib/disposal-evidence-exception.ts src/lib/disposal-type-policy.ts src/lib/validations/disposal.ts tests/disposal-evidence-exception.test.ts tests/disposal-validation.test.ts
git commit -m "feat: define disposal evidence exception policy"
```

---

### Task 2: Persistent Exception Metadata And Manual Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/manual-migrations/2026-07-13-add-disposal-evidence-exception.sql`
- Modify: `tests/disposal-evidence-exception.test.ts`

**Interfaces:**
- Produces: nullable Prisma fields `evidenceExceptionReason`, `evidenceExceptionGrantedBy`, and `evidenceExceptionGrantedAt` on `DisposalRequest`.
- Consumes: the execution policy from Task 1.

- [ ] **Step 1: Add failing schema and migration assertions**

```ts
import { readFileSync } from "node:fs"

test("persists disposal evidence exception metadata with an idempotent migration", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const migration = readFileSync("prisma/manual-migrations/2026-07-13-add-disposal-evidence-exception.sql", "utf8")
  assert.match(schema, /evidenceExceptionReason\s+String\?\s+@db\.NVarChar\(Max\)/)
  assert.match(schema, /evidenceExceptionGrantedBy\s+String\?\s+@db\.NVarChar\(100\)/)
  assert.match(schema, /evidenceExceptionGrantedAt\s+DateTime\?/)
  for (const column of ["evidenceExceptionReason", "evidenceExceptionGrantedBy", "evidenceExceptionGrantedAt"]) {
    assert.match(migration, new RegExp(`COL_LENGTH\\('dbo\\.disposal_requests', '${column}'\\) IS NULL`, "i"))
  }
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/disposal-evidence-exception.test.ts`

Expected: FAIL because the Prisma fields and migration file do not exist.

- [ ] **Step 3: Add Prisma fields and idempotent SQL**

Add to `DisposalRequest`:

```prisma
evidenceExceptionReason    String?   @db.NVarChar(Max)
evidenceExceptionGrantedBy String?   @db.NVarChar(100)
evidenceExceptionGrantedAt DateTime?
```

Create the migration with one guarded block per column:

```sql
IF COL_LENGTH('dbo.disposal_requests', 'evidenceExceptionReason') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [evidenceExceptionReason] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.disposal_requests', 'evidenceExceptionGrantedBy') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [evidenceExceptionGrantedBy] NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.disposal_requests', 'evidenceExceptionGrantedAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [evidenceExceptionGrantedAt] DATETIME2 NULL;
END;
```

- [ ] **Step 4: Generate Prisma client and run focused tests**

Run: `npm run prisma:generate`

Expected: Prisma Client generation succeeds.

Run: `node --test tests/disposal-evidence-exception.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit persistence changes**

```bash
git add prisma/schema.prisma prisma/manual-migrations/2026-07-13-add-disposal-evidence-exception.sql tests/disposal-evidence-exception.test.ts
git commit -m "feat: persist disposal evidence exceptions"
```

Do not execute the migration against a database in this task.

---

### Task 3: Backend Enforcement And Transactional Audit

**Files:**
- Modify: `src/app/api/disposal-requests/[id]/route.ts`
- Modify: `src/lib/disposal-api-errors.ts`
- Modify: `src/lib/disposal-error-message.ts`
- Modify: `tests/disposal-evidence-exception.test.ts`
- Modify: `tests/disposal-route-structure.test.ts`

**Interfaces:**
- Consumes: `getDisposalExecutionEvidenceError` and generated Prisma exception fields.
- Produces: stable API error codes and atomic `execute` / `execute_historical_without_evidence` audit actions.

- [ ] **Step 1: Add failing route-structure assertions**

Assert that the execution route:

```ts
const route = readFileSync("src/app/api/disposal-requests/[id]/route.ts", "utf8")
assert.match(route, /module:\s*"disposal_batch"/)
assert.match(route, /getDisposalExecutionEvidenceError/)
assert.match(route, /execute_historical_without_evidence/)
assert.match(route, /writeAuditLog\(tx/)
assert.doesNotMatch(route, /await logAudit\([\s\S]*?action:\s*"execute"/)
```

Also assert all four exception codes appear in both API-code registries.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts`

Expected: FAIL because route enforcement and error registration are absent.

- [ ] **Step 3: Count effective item and batch evidence**

After parsing execution input, count both sources and derive one number:

```ts
const [itemEvidenceCount, batchEvidenceCount] = await Promise.all([
  prisma.attachment.count({ where: { module: "disposal", referenceId: disposalRequest.id, isActive: true } }),
  disposalBatchId
    ? prisma.attachment.count({ where: { module: "disposal_batch", referenceId: disposalBatchId, isActive: true } })
    : Promise.resolve(0),
])
const effectiveEvidenceCount = itemEvidenceCount + batchEvidenceCount
```

Call the pure policy with `user.roles` and parsed exception fields. Return 403 only for `DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN`; return 400 for the other evidence decision errors.

- [ ] **Step 4: Persist exception metadata and audit in the transaction**

Compute one timestamp before the transaction and update fields conditionally:

```ts
const exceptionGrantedAt = input.useHistoricalEvidenceException ? new Date() : null

evidenceExceptionReason: input.useHistoricalEvidenceException ? input.evidenceExceptionReason : null,
evidenceExceptionGrantedBy: input.useHistoricalEvidenceException ? user.id : null,
evidenceExceptionGrantedAt: exceptionGrantedAt,
```

Replace the post-transaction best-effort execution log with:

```ts
await writeAuditLog(tx, {
  userId: user.id,
  action: input.useHistoricalEvidenceException ? "execute_historical_without_evidence" : "execute",
  module: "disposal",
  recordId: id,
  oldValue: { requestStatus: disposalRequest.requestStatus, assetStatusId: disposalRequest.asset.statusId },
  newValue: {
    ...input,
    requestStatus: "disposed",
    effectiveEvidenceCount,
    evidenceExceptionGrantedBy: input.useHistoricalEvidenceException ? user.id : null,
    evidenceExceptionGrantedAt: exceptionGrantedAt,
  },
})
```

Keep the request update, asset update, movement creation, batch status derivation, and audit write inside the same `$transaction` callback.

- [ ] **Step 5: Run backend tests and commit**

Run: `node --test tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts tests/disposal-validation.test.ts tests/disposal-policy.test.ts`

Expected: PASS.

Commit:

```bash
git add src/app/api/disposal-requests/[id]/route.ts src/lib/disposal-api-errors.ts src/lib/disposal-error-message.ts tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts
git commit -m "feat: enforce disposal evidence exceptions"
```

---

### Task 4: Accessible Execution Dialog

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`
- Modify: `src/components/disposal/disposal-execution-button.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/disposal-evidence-exception.test.ts`

**Interfaces:**
- Consumes: effective evidence count, exact `system_admin` role, execution API payload from Tasks 1-3.
- Produces: `effectiveEvidenceCount` and `canUseHistoricalEvidenceException` props on `DisposalExecutionButton`.

- [ ] **Step 1: Add failing UI and localization assertions**

Assert the detail page passes `attachments.length + batchAttachments.length`, uses `user.roles.includes("system_admin")`, and the client submits all three exception fields. Parse both message JSON files and assert these keys exist:

```ts
const detailPage = readFileSync("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx", "utf8")
const executionButton = readFileSync("src/components/disposal/disposal-execution-button.tsx", "utf8")
assert.match(detailPage, /effectiveEvidenceCount=\{attachments\.length \+ batchAttachments\.length\}/)
assert.match(detailPage, /canUseHistoricalEvidenceException=\{user\.roles\.includes\("system_admin"\)\}/)
assert.match(executionButton, /useHistoricalEvidenceException/)
assert.match(executionButton, /evidenceExceptionReason/)
assert.match(executionButton, /evidenceExceptionAcknowledged/)

for (const messages of [thMessages, enMessages]) {
  assert.equal(typeof messages.disposalPage.historicalEvidenceException, "string")
  assert.equal(typeof messages.disposalPage.historicalEvidenceReason, "string")
  assert.equal(typeof messages.disposalPage.historicalEvidenceAcknowledgement, "string")
  for (const code of [
    "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN",
    "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
    "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED",
    "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE",
  ]) assert.equal(typeof messages.disposalPage.errors[code], "string")
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/disposal-evidence-exception.test.ts`

Expected: FAIL because the props, fields, and messages are absent.

- [ ] **Step 3: Pass evidence and role context from the server page**

```tsx
<DisposalExecutionButton
  requestId={disposalRequest.id}
  disposalNo={disposalRequest.disposalNo}
  disposalType={disposalRequest.disposalType}
  statuses={executionStatuses}
  employees={executorOptions}
  defaultActualSaleValue={disposalRequest.saleValue?.toString()}
  defaultActualSalvageValue={disposalRequest.salvageValue?.toString()}
  effectiveEvidenceCount={attachments.length + batchAttachments.length}
  canUseHistoricalEvidenceException={user.roles.includes("system_admin")}
/>
```

- [ ] **Step 4: Add progressive exception controls**

Extend `ExecutionValues` with boolean mode/acknowledgement and a reason string. Submit them in the PATCH payload. When evidence is zero:

```ts
type ExecutionValues = {
  executionDate: string
  executedById: string
  nextStatusId: string
  recipientName: string
  documentNo: string
  actualSaleValue: string
  actualSalvageValue: string
  executionRemark: string
  useHistoricalEvidenceException: boolean
  evidenceExceptionReason: string
  evidenceExceptionAcknowledged: boolean
}

const exceptionPayload = {
  useHistoricalEvidenceException: values.useHistoricalEvidenceException,
  evidenceExceptionReason: values.useHistoricalEvidenceException ? values.evidenceExceptionReason : null,
  evidenceExceptionAcknowledged: values.useHistoricalEvidenceException && values.evidenceExceptionAcknowledged,
}
```

- render an amber `AlertTriangle` notice;
- block normal submission for non-admin users;
- show the exception mode checkbox only to system administrators;
- reveal a 20-2,000 character textarea and required acknowledgement checkbox after selection;
- remove HTML `required` from document number only while exception mode is active;
- change the submit label to the historical confirmation label;
- retain the existing focus trap, Escape handling, backdrop behavior, and focus restoration.

Use this submit block condition:

```ts
const evidenceBlocked = effectiveEvidenceCount === 0 && !values.useHistoricalEvidenceException
const historicalInputInvalid = values.useHistoricalEvidenceException && (
  values.evidenceExceptionReason.trim().length < 20 || !values.evidenceExceptionAcknowledged
)
const submitDisabled = saving || evidenceBlocked || historicalInputInvalid
```

- [ ] **Step 5: Run UI tests, lint changed files, and commit**

Run: `node --test tests/disposal-evidence-exception.test.ts tests/disposal-detail-workspace.test.ts`

Run: `npx eslint "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" "src/components/disposal/disposal-execution-button.tsx" "src/lib/disposal-evidence-exception.ts" "src/lib/disposal-type-policy.ts" "src/lib/validations/disposal.ts"`

Expected: all commands PASS.

Commit:

```bash
git add src/app/[locale]/(dashboard)/disposal/[id]/page.tsx src/components/disposal/disposal-execution-button.tsx messages/th.json messages/en.json tests/disposal-evidence-exception.test.ts
git commit -m "feat: add historical disposal execution UI"
```

---

### Task 5: Completed Record And Print Presentation

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`
- Modify: `src/app/[locale]/(print)/disposal/[id]/print/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/disposal-evidence-exception.test.ts`

**Interfaces:**
- Consumes: persisted exception metadata from Task 2.
- Produces: visible exception label, reason, granting administrator, and grant timestamp in detail and print views.

- [ ] **Step 1: Add failing presentation assertions**

Assert both pages reference all three exception fields, query `prisma.user` for the granting user's `displayName`/`username`, and render localized labels only when `evidenceExceptionReason` is non-null.

```ts
const detail = readFileSync("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx", "utf8")
const print = readFileSync("src/app/[locale]/(print)/disposal/[id]/print/page.tsx", "utf8")
for (const source of [detail, print]) {
  assert.match(source, /evidenceExceptionReason/)
  assert.match(source, /evidenceExceptionGrantedBy/)
  assert.match(source, /evidenceExceptionGrantedAt/)
  assert.match(source, /prisma\.user\.findUnique/)
  assert.match(source, /historicalEvidenceBadge/)
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/disposal-evidence-exception.test.ts`

Expected: FAIL because completed-record presentation is absent.

- [ ] **Step 3: Add the detail exception panel**

Resolve the granting user by ID and render one warning-toned, full-border panel in the execution section:

```tsx
{disposalRequest.evidenceExceptionReason ? (
  <section aria-label={t("historicalEvidenceSummary")} className="rounded-lg border border-warning/40 bg-warning/10 p-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div>
        <p className="font-medium text-foreground">{t("historicalEvidenceBadge")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{disposalRequest.evidenceExceptionReason}</p>
      </div>
    </div>
  </section>
) : null}
```

Add administrator and grant timestamp as normal `Info` rows. Do not create a new lifecycle status.

- [ ] **Step 4: Add print fields and effective evidence count**

Resolve the batch link when the disposal batch schema is ready, count item plus batch evidence, and add exception fields to the execution section. Normal records receive no exception rows because `OperationDocumentPrint` omits null fields.

- [ ] **Step 5: Run presentation tests and commit**

Run: `node --test tests/disposal-evidence-exception.test.ts tests/disposal-detail-workspace.test.ts`

Expected: PASS.

Commit:

```bash
git add src/app/[locale]/(dashboard)/disposal/[id]/page.tsx src/app/[locale]/(print)/disposal/[id]/print/page.tsx messages/th.json messages/en.json tests/disposal-evidence-exception.test.ts
git commit -m "feat: surface disposal evidence exceptions"
```

---

### Task 6: Documentation, Full Verification, And Migration Handoff

**Files:**
- Modify: `docs/03_DATABASE.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/08_PRODUCTION_READINESS.md`
- Modify: `docs/99_CHANGELOG.md`

**Interfaces:**
- Consumes: completed implementation from Tasks 1-5.
- Produces: operator instructions and a verified release candidate. No application interface is introduced.

- [ ] **Step 1: Document the controlled exception**

Record these exact operational rules:

- only `system_admin` may authorize the exception;
- request approval, execution permission, SOD, and final-status validation still apply;
- item and shared batch evidence both prevent exception mode;
- historical reason and acknowledgement are mandatory;
- ordinary disposal work continues to require evidence;
- bulk historical execution is unavailable;
- apply `prisma/manual-migrations/2026-07-13-add-disposal-evidence-exception.sql` only after a fresh verified backup.

Add UAT rows for normal executor blocked, system admin success, evidence-present rejection, print visibility, and audit-log inspection.

- [ ] **Step 2: Run focused and full automated verification**

Run:

```bash
node --test tests/disposal-evidence-exception.test.ts tests/disposal-validation.test.ts tests/disposal-route-structure.test.ts tests/disposal-detail-workspace.test.ts tests/disposal-policy.test.ts
npm test
npm run verify
npm run build
```

Expected: every command exits 0 with no missing translation, TypeScript, ESLint, Prisma generation, test, or build error.

- [ ] **Step 3: Inspect the final diff and preserve unrelated changes**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: feature files and documentation are clean; unrelated pre-existing skill/tool changes remain unstaged and untouched.

- [ ] **Step 4: Commit documentation**

```bash
git add docs/03_DATABASE.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/08_PRODUCTION_READINESS.md docs/99_CHANGELOG.md
git commit -m "docs: document disposal evidence exceptions"
```

- [ ] **Step 5: Prepare database migration handoff**

After the operator confirms a fresh backup, run:

```bash
npx prisma db execute --file prisma/manual-migrations/2026-07-13-add-disposal-evidence-exception.sql
npm run prisma:generate
```

Then manually verify one approved historical request without attachments and one normal approved request with evidence. Do not run the migration before explicit backup confirmation.
