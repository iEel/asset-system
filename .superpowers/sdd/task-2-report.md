# Task 2 Report: Preview And Commit Orchestration Service

## Status

Completed and committed on `codex/disposal-bulk-execution`.

## Commit

- SHA: `c6b8da6`
- Message: `feat: orchestrate disposal bulk execution`

## Files

- Created: `src/lib/disposal-bulk-execution-service.ts`
- Modified: `src/lib/disposal-execution-service.ts`
- Created: `tests/disposal-bulk-execution-service.test.ts`
- Modified: `tests/disposal-execution-service.test.ts`
- Not modified: `package-lock.json`

## RED Evidence

1. `node --test tests/disposal-bulk-execution-service.test.ts`
   - Exit: `1`
   - Result: `0` pass, `1` fail.
   - Expected failure: `ERR_MODULE_NOT_FOUND` for `src/lib/disposal-bulk-execution-service.ts` before the service existed.

2. `node --test tests/disposal-execution-service.test.ts`
   - Exit: `1`
   - Result: `0` pass, `1` fail.
   - Expected failure: the existing service did not yet export `buildDisposalExecutionInput`.

Both commands use Node 24 native TypeScript stripping; no unavailable `tsx` import was used.

## GREEN Evidence

1. `node --test tests/disposal-bulk-execution-service.test.ts tests/disposal-execution-service.test.ts tests/disposal-evidence-exception.test.ts`
   - Exit: `0`
   - Result: `30` pass, `0` fail.

2. `npx eslint src/lib/disposal-bulk-execution-service.ts src/lib/disposal-execution-service.ts tests/disposal-bulk-execution-service.test.ts tests/disposal-execution-service.test.ts`
   - Exit: `0`
   - Result: no errors or warnings.

3. `npx tsc --noEmit`
   - Exit: `0`
   - Result: no TypeScript errors.

4. `npm test`
   - Exit: `0`
   - Result: `899` pass, `0` fail, `0` skipped, `0` todo.

5. `git diff --cached --check`
   - Exit: `0`
   - Result: no whitespace errors before commit.

## Self-Review

- Preview uses one bounded candidate query, bounded evidence aggregates, caller-order reconstruction, and no mutations.
- Candidate mapping uses shared date, executor, status, and historical fields while retaining each request's disposal type, recipient, document, sale value, salvage value, and execution remark.
- Preview and revalidation enforce permission, batch-schema readiness, same-type selection, stage, asset lifecycle, SOD, active executor/status, type-specific fields, and exact-role historical evidence policy.
- Commit re-runs the advisory checks before each initially eligible item, then invokes only `executeDisposalRequest`; the bulk service opens no shared transaction.
- Reload and executor exceptions are logged with a fixed server-side message, return `DISPOSAL_BULK_EXECUTION_FAILED`, and do not halt sibling items.
- The single-item executor still owns its fresh serializable validation, guarded updates, movement, audit log, and batch-status derivation.

## Concerns

- Node emits the repository-wide pre-existing `MODULE_TYPELESS_PACKAGE_JSON` warnings during TypeScript test execution. Task 2 does not alter `package.json` or module configuration.
- This task supplies the orchestration service only. The endpoint and UI integration remain for their later scoped tasks.

## Reviewed Task 2 Fixes

- Moved each per-item authoritative reload inside the item failure boundary. Reload and execution exceptions now produce `failed` with `DISPOSAL_BULK_EXECUTION_FAILED`, emit only `Disposal bulk execution item failed`, and allow later items to continue.
- Replaced the no-transaction executor assertion with a transaction-capable fake that records one independent `Serializable` transaction per executor invocation.
- Expanded retry coverage to three items. The middle item fails, the first and last states persist, the last item still executes, and retrying the identical command executes only the unresolved middle item.
- Varied request fields across authoritative reads and asserted that each execution receives the reloaded values.
- Asserted the exact fixed log message and verified serialized responses exclude injected database connection details.

## Reviewed Fix Verification

1. `node --test tests/disposal-bulk-execution-service.test.ts tests/disposal-execution-service.test.ts tests/disposal-evidence-exception.test.ts`
   - Exit: `0`
   - Result: `31` pass, `0` fail, `0` skipped, `0` todo.
   - Repeated after the TypeScript-only fixture annotation correction with the same result.

2. `npm test`
   - Exit: `0`
   - Result: `900` pass, `0` fail, `0` skipped, `0` todo.
   - Repeated after the TypeScript-only fixture annotation correction with the same result.

3. `npx tsc --noEmit`
   - First exit: `1`.
   - First result: two test-fixture annotation errors (`TS2345` for literal map keys and `TS2322` for an optional execution remark).
   - Final exit: `0`.
   - Final result: no TypeScript errors.

4. `npm run lint`
   - Exit: `0`.
   - Result: `0` errors and `257` pre-existing warnings outside the owned service and test files.

5. `npx eslint src/lib/disposal-bulk-execution-service.ts tests/disposal-bulk-execution-service.test.ts`
   - Exit: `0`.
   - Result: no errors or warnings.

6. `git diff --check`
   - Exit: `0`.
   - Result: no whitespace errors.

7. `git status --short`
   - Before report update: only `src/lib/disposal-bulk-execution-service.ts` and `tests/disposal-bulk-execution-service.test.ts` were modified.
   - `package-lock.json` was not modified.
