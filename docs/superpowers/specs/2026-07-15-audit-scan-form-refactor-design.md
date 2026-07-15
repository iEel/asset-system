# Audit Scan Form Conservative Refactor Design

**Date:** 2026-07-15

**Status:** Approved

**Scope:** `src/components/audit/audit-scan-form.tsx`

## Goal

Reduce the size and responsibility of `audit-scan-form.tsx` without changing Audit Scan behavior, public interfaces, visual presentation, adaptive behavior, scanner lifecycle, or API contracts.

The first refactor targets the largest frontend file only. `system-settings-form.tsx` and the other large files remain outside this design and will be assessed after this refactor is complete.

## Selected Approach

Use a conservative extraction. Keep `AuditScanForm` as the workflow controller and extract only boundaries that are already present:

- shared types and constants;
- pure data transformation and presentation helpers;
- presentational panels and small form primitives.

Camera/scanner callbacks, React state, effects, API calls, offline synchronization, routing, focus and scroll orchestration, toast sequencing, and submit behavior remain in `AuditScanForm` during this refactor.

This approach is preferred over extracting feature hooks or introducing a reducer/controller because it materially reduces file size while minimizing stale-closure, effect-order, camera cleanup, and workflow regression risk.

## File Structure

### `src/components/audit/audit-scan-types.ts`

Owns the types and constants shared by the controller, helpers, and panels, including scan items, component relationships, lookup responses, feedback, recent scans, queued photo metadata, option maps, camera readiness, and `MAX_RECENT_AUDIT_SCANS`.

The module contains no React components, browser access, or side effects.

### `src/components/audit/audit-scan-helpers.ts`

Owns deterministic transformations and selectors, including:

- lookup asset/component normalization;
- expected, editable, actual, and out-of-scope value construction;
- mismatch detection;
- empty-string normalization;
- asset lookup and manual suggestion construction;
- option label maps;
- system-data and pending-queue context rows;
- asset picker search text and readable scan values;
- offline photo payload conversion;
- initial form value creation;
- scan feedback and component status metadata where they remain pure.

Every exported helper receives its dependencies as arguments, does not mutate its inputs, and returns the same shapes currently consumed by the form and API payload builders.

### `src/components/audit/audit-scan-panels.tsx`

Owns presentational components that already receive data and callbacks from the controller:

- `ScanResultPanel`;
- `RecentScansPanel` and its compact row;
- `AuditComponentPanel`;
- `ManualScanSuggestionList`;
- `PendingQueuePanel` and its item;
- `AssetFallbackPicker`;
- context chips;
- QR scanner overlay;
- small select/field/option primitives used by these presentations.

Panels do not call application APIs, access routing or storage, manage camera streams, or own audit workflow state. Existing markup, class names, ARIA attributes, responsive breakpoints, touch targets, and callback order stay unchanged.

### `src/components/audit/audit-scan-form.tsx`

Remains the client controller and owns:

- React state, refs, memoization, subscriptions, and effects;
- QR camera start/stop, torch, zoom, device selection, and cleanup;
- target selection and recent-scan orchestration;
- online lookup, submit, upload, and retry flows;
- offline queue storage and synchronization;
- focus, scroll, router, toast, and error sequencing;
- the page-level form and adaptive layout composition.

The target size is approximately 1,700–2,000 lines after extraction. No newly created file should exceed approximately 700 lines.

## Data Flow

Data flow remains unidirectional:

1. `AuditScanForm` owns runtime and workflow state.
2. It derives presentation data directly or through pure helpers.
3. It passes data and callbacks into extracted panels.
4. Panels report user intent through callbacks.
5. `AuditScanForm` performs mutations, side effects, navigation, and error handling.

No second workflow controller or duplicated state is introduced.

## Error Handling

Existing error ownership does not change. `AuditScanForm` continues to handle:

- lookup and API failures;
- camera availability and permission failures;
- offline storage and synchronization failures;
- photo upload failures;
- scan submission and retry failures.

Presentational panels receive resolved status and localized copy. Extraction must not change toast ordering, focus restoration, scroll positioning, retry availability, queued-photo cleanup, or camera shutdown behavior.

## Compatibility Constraints

- Do not change `AuditScanForm` props.
- Do not change API routes, request payloads, response interpretation, or translation keys.
- Do not change the Prisma schema or create a database migration.
- Do not add dependencies.
- Do not change scanner constraints, decoder selection, camera fallback, torch, or zoom behavior.
- Do not change offline queue formats or storage keys.
- Do not change DOM semantics, ARIA labels, class names, responsive breakpoints, safe-area behavior, or minimum touch targets.
- Preserve Thai and English behavior.

## Test Strategy

Use characterization-driven TDD for each extraction boundary:

1. Add a failing test that imports the planned helper/types module or asserts the planned component ownership before the new module exists.
2. Run the focused test and confirm it fails for the missing module or export.
3. Extract the minimum production code required for the test to pass.
4. Run focused Audit Scan regression tests after each extraction.
5. Update source-ownership assertions to inspect the new owning file without removing behavioral or accessibility assertions.

Final verification includes:

- all focused Audit Scan tests;
- the complete project test suite;
- TypeScript with no emit;
- scoped ESLint for changed source and test files;
- Prisma generation and production build through the repository verification workflow;
- authenticated mobile and desktop Audit Scan smoke checks for overflow, focus, responsive presentation, and console errors.

## Acceptance Criteria

- All existing tests continue to pass and new extraction tests are added.
- TypeScript, scoped ESLint, and the production build pass.
- `audit-scan-form.tsx` is approximately 1,700–2,000 lines.
- No new file exceeds approximately 700 lines.
- Audit Scan public props, API behavior, offline behavior, scanner lifecycle, translations, DOM semantics, accessibility, and adaptive UI are unchanged.
- No database migration or dependency change is introduced.

## Deferred Work

The following remain explicitly outside this refactor:

- feature-hook extraction for camera, offline queue, target selection, or recent scans;
- reducer or controller architecture changes;
- UI redesign or copy changes;
- performance behavior changes;
- refactoring `system-settings-form.tsx` or other large files.

These may be evaluated as separate, independently approved changes after the conservative extraction is verified.
