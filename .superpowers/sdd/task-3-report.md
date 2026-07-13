# Task 3 Report: Backend Enforcement And Transactional Audit

## RED

- Added structural tests for batch-level evidence, pure policy enforcement, exception audit action, transactional audit writes, and removal of the post-transaction execution audit.
- Added registry tests for all four historical evidence exception codes.
- Ran `node --test tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts`.
- Result: failed as expected because the route and error registries did not yet contain the required enforcement.

## GREEN

- Execution now counts active request and batch evidence as one effective evidence count.
- The route delegates exception eligibility to `getDisposalExecutionEvidenceError`, returning 403 only for `DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN` and 400 for all other evidence decisions.
- The exception metadata and the execution audit are persisted inside the execution transaction. The audit action is `execute` or `execute_historical_without_evidence`.
- Preserved the approved-stage guard, segregation-of-duties check, target-status validation, active-executor validation, request and asset updates, movement creation, and batch-status derivation.

## Files

- `src/app/api/disposal-requests/[id]/route.ts`
- `src/lib/disposal-api-errors.ts`
- `src/lib/disposal-error-message.ts`
- `tests/disposal-evidence-exception.test.ts`
- `tests/disposal-route-structure.test.ts`

## Commit

- `85a6498 feat: enforce disposal evidence exceptions`

## Self-Review

- Confirmed item and shared batch evidence are both included in `effectiveEvidenceCount`.
- Confirmed the committed policy supplies the exact `system_admin` authorization rule.
- Confirmed audit creation uses `writeAuditLog(tx, ...)` in the transaction callback and records the exception grant timestamp and actor.
- Confirmed no database migration was run or changed.

## Concerns

- The requested Node test command emits existing module-type warnings for TypeScript test files; tests still pass.
- A pre-existing `package-lock.json` change remains unstaged and untouched.

## Reviewer P1 Fix: Sanitize Disposal Execution Failures

### RED

Added focused assertions for the stable execution-failure code, localized Thai and English messages, server-side logging, and sanitized 500 handling.

Command:

```powershell
node --test tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts
```

Output:

```text
24 passed, 2 failed
Failed: registers the execution failure code with localized client messages
  AssertionError: src/lib/disposal-api-errors.ts did not contain "DISPOSAL_EXECUTION_FAILED"
Failed: execution sanitizes unexpected infrastructure failures
  AssertionError: src/app/api/disposal-requests/[id]/route.ts did not contain the ZodError-preserving sanitized catch
Exit code: 1
```

The command also emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warnings for TypeScript test files.

### GREEN

Implemented the P1 fix by preserving Zod and auth responses, logging the underlying route failure with `console.error`, and returning `{ code: "DISPOSAL_EXECUTION_FAILED", error: "DISPOSAL_EXECUTION_FAILED" }` with HTTP 500. Registered the code in both disposal API registries and added `disposalPage.errors.DISPOSAL_EXECUTION_FAILED` in Thai and English.

Focused command:

```powershell
node --test tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts
```

Output:

```text
26 tests, 26 passed, 0 failed
Exit code: 0
```

Covering Task 3 command:

```powershell
node --test tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts tests/disposal-validation.test.ts tests/disposal-policy.test.ts
```

Output:

```text
46 tests, 46 passed, 0 failed
Exit code: 0
```

Scoped lint command:

```powershell
npx eslint 'src/app/api/disposal-requests/[id]/route.ts' src/lib/disposal-api-errors.ts src/lib/disposal-error-message.ts tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts
```

Output:

```text
No output
Exit code: 0
```

### Fix Concerns

- Node continues to emit the existing module-type warnings for TypeScript test files; all covering tests pass.
- The pre-existing `package-lock.json` modification remains unstaged and untouched.
