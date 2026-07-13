# Task 6: Disposal Bulk Approval Documentation And Verification Report

## Scope

Updated only the requested operational documentation:

- `DEVELOPER_HANDOFF.md`
- `docs/06_WORKFLOWS.md`
- `docs/07_UAT_CHECKLIST.md`

The documentation covers approval-only bulk queue behavior, `disposal:approve` RBAC and SOD, advisory preview with authoritative commit revalidation, 50-item current-page selection, optional shared remarks that preserve item-specific data, partial results, unavailable bulk rejection/execution, and mobile selection behavior. UAT coverage includes desktop, mobile, keyboard, permission/SOD, concurrency, and partial-result scenarios.

## Command-Line Verification

| Command | Result | Evidence |
|---|---|---|
| `node --test tests/disposal-bulk-approval.test.ts tests/disposal-validation.test.ts tests/disposal-policy.test.ts tests/disposal-route-structure.test.ts tests/disposal-queue-ux.test.ts` | PASS | Exit 0; 48/48 tests passed. |
| `npm test` | PASS | Exit 0; 849/849 tests passed. |
| `npm run verify` | PASS | Exit 0; lint completed with warnings only, 849/849 tests passed, Prisma Client 7.8.0 generated, and the Next.js 16.2.4 production build completed with 57/57 static pages. |
| `npm run build` | PASS | Exit 0; Prisma Client 7.8.0 generated, Next.js 16.2.4 compiled and type-checked, and 57/57 static pages generated. The route manifest includes `/[locale]/disposal` and `/api/disposal-requests/bulk-decision`. |

## Environment Caveats

- Node emitted `MODULE_TYPELESS_PACKAGE_JSON` warnings while loading TypeScript test files as ES modules because `package.json` does not declare `"type": "module"`. The focused and full suites still passed.
- `npm run verify` linted pre-existing bundled `.agents` and `.gemini` Impeccable tooling and reported warnings there. The command exited 0 with no lint errors. No source, dependency, or configuration changes were made to mask those warnings.
- Browser QA was intentionally not run in this task; it is owned by the controller.

## Controller Browser Evidence

Browser QA was run against `http://localhost:3000/th/disposal` with an
authenticated system administrator session:

- Desktop 1280x900 has no horizontal body overflow and exposes page selection
  for all 25 loaded rows.
- Mobile 390x844 has no horizontal body overflow. Explicit selection mode,
  accessible row labels, selected-count copy, and card selection work without
  colliding with Mobile Field Navigation.
- Read-only preflight was exercised with 25 eligible rows on desktop and one
  eligible row on mobile. The confirm action was intentionally not executed, so
  browser QA did not mutate disposal data.
- After commit `1546c9c`, the page contains no unresolved bulk-approval
  message keys and no new console formatting errors were observed.
- Successful commit, partial-result, and two-session concurrency browser cases
  remain operator-controlled UAT items because they mutate disposal workflow
  records. They must be run against dedicated `TEST-` fixtures (or a disposable
  UAT database), not silently against the business records in this development
  database. Concurrency safety is covered structurally and at service level
  until that fixture-backed UAT is executed.

## Commit Scope

The production documentation was committed separately in `a670834`. This
tracked SDD report records verification evidence only; unrelated `.agents`,
`.gemini`, `.codex`, and `.impeccable` worktree changes remain excluded.

## Task 6 Intl Formatting Fix (2026-07-13)

### Scope

- Updated `src/app/[locale]/(dashboard)/disposal/page.tsx` so the four ICU templates passed to the client formatter use the supported `next-intl` raw API: `t.raw("bulkSelectedCount")`, `t.raw("bulkSelectItem")`, `t.raw("bulkRemarkLimit")`, and `t.raw("bulkConfirmApproval")`.
- Added a regression test to `tests/disposal-queue-ux.test.ts` that requires raw retrieval and rejects plain `t(...)` for all four placeholder templates.
- No change was needed in `tests/disposal-bulk-approval.test.ts`.

### TDD And Verification

| Command | Result | Evidence |
|---|---|---|
| `node --test tests/disposal-queue-ux.test.ts` (before implementation) | EXPECTED FAIL | Exit 1; 6/7 tests passed, and the new regression failed at `bulkSelectedCount must use raw template retrieval`. |
| `node --test tests/disposal-queue-ux.test.ts tests/disposal-bulk-approval.test.ts` | PASS | Exit 0; 17/17 tests passed. Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for TypeScript test files. |
| `npx tsc --noEmit` | PASS | Exit 0; no diagnostics. |
| `npx eslint -- 'src/app/[locale]/(dashboard)/disposal/page.tsx' 'tests/disposal-queue-ux.test.ts' 'tests/disposal-bulk-approval.test.ts'` | PASS | Exit 0; no diagnostics. |

## Final Review Fixes (2026-07-13)

The final whole-feature review found and resolved five release-relevant edge
cases:

- Unknown preview/settings failures now log server-side and return a stable
  `DISPOSAL_APPROVAL_FAILED` response with HTTP 500 instead of raw database
  messages.
- Approval candidate queries omit `batchId` until disposal batch schema
  readiness is confirmed, preserving the existing additive-migration fallback
  for single approval.
- The bulk dialog focuses its stable container while busy, focuses the close
  action when ready, traps focus when no controls are available, and restores
  focus to either the original trigger or the persistent queue scope.
- Mobile row selection uses a 44 by 44 pixel label target. Ineligible rows
  expose a focusable, localized blocked reason instead of relying on a disabled
  checkbox title.
- The provider now wraps filters and stage navigation, so changing queue scope
  while rows are selected uses the existing discard confirmation.
- `DISPOSAL_FORBIDDEN` is part of the typed, localized bulk result contract.

### Regression And Browser Evidence

- The new regression tests failed first (7 failures) before the production
  changes, then the focused suite passed 36/36 and `npx tsc --noEmit` passed.
- Scoped ESLint completed with no errors. A ref-cleanup warning was then fixed
  by capturing the fallback focus target inside the effect.
- Authenticated mobile QA at 390x844 confirmed a 44x44 selection target, no
  horizontal overflow, close-button focus after preflight, trigger focus after
  dismissal, and blocked stage navigation while a selection remained active.
- No disposal approval was committed during browser QA.
