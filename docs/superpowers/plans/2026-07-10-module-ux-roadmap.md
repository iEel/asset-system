# Module UX Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make high-traffic operational modules faster to scan and act on while preserving the existing Asset, Audit, RBAC, approval, and lifecycle workflows.

**Architecture:** Keep pages server-rendered and encode durable workspace choices in their existing query parameters. Add small pure view helpers for URL parsing, stage summaries, and confirmation summaries so behavior is regression-testable; use local client state only for transient confirmation and local user preferences. Reuse the established Navy/White/Action Blue system, Lucide icons, responsive card/table patterns, and page permissions.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, next-intl, Tailwind CSS 4, Prisma/SQL Server, Node test runner.

## Global Constraints

- Do not rewrite Asset, Audit Round, approval, custody, attachment, RBAC, SOD, or API workflows.
- Desktop remains a management/review workspace; mobile remains an adaptive field workspace using the same URLs and data contracts.
- Use `Action Blue #2563EB` for normal white-text primary actions, `Electric Blue #3B82F6` for focus/selection, and Lucide icons only.
- Preserve filters whenever a page view is changed; do not add global horizontal scrolling.
- Every production behavior change begins with a focused failing Node test.
- Keep Thai and English messages aligned for newly visible labels.

---

### Task 1: Correct completed Audit Scan documentation

**Files:**
- Modify: `docs/06_WORKFLOWS.md`

- [ ] Replace the deferred `scanFeedback` debt note with the current behavior: clearing or selecting a target clears transient feedback.
- [ ] Verify the referenced implementation in `src/components/audit/audit-scan-form.tsx` still clears feedback before committing.
- [ ] Commit this documentation-only correction before any UI behavior work.

### Task 2: Make Dashboard an overview and Work Center today’s queue

**Files:**
- Modify: `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/work-center/page.tsx`
- Modify: `src/lib/work-center-view.ts`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/work-center-view.test.ts`, `tests/work-center-metrics.test.ts`, `tests/dashboard-action-cards.test.ts`

**Interfaces:**
- Extend `WorkCenterParams` with a safe queue preference only if it can be represented in the URL without changing existing links.
- Preserve `buildWorkCenterHref(locale, current, overrides)` as the only place that serializes Work Center query state.

- [ ] Write a failing test that an urgency-first Work Center URL preserves `view=mine` and does not reintroduce duplicated approval metrics.
- [ ] Implement compact dashboard escalation links and group Work Center panels by actionable queue rather than repeating dashboard totals.
- [ ] Confirm all/mine state, counts, and permission guards remain unchanged; run focused tests and commit.

### Task 3: Add Asset Detail view presets and operation review summaries

**Files:**
- Create: `src/lib/asset-detail-view.ts`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `src/components/asset-operations/checkout-form.tsx`
- Modify: `src/components/asset-operations/checkin-form.tsx`
- Modify: `src/components/asset-operations/transfer-form.tsx`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/asset-detail-view.test.ts`, `tests/asset-detail-anchor-layout.test.ts`, `tests/asset-operation-confirmation-ui.test.ts`

**Interfaces:**
- `parseAssetDetailView(value)` returns a known preset and falls back to `overview`.
- `buildAssetDetailViewHref(locale, assetId, currentSearch, view)` preserves safe return context while adding `view`.
- `buildOperationConfirmationSummary(input)` returns the selected asset, recipient/destination, resulting status, and evidence indicators without performing an API request.

- [ ] Write failing tests for safe preset parsing, link preservation, and a checkout/return/transfer confirmation summary.
- [ ] Add a compact desktop section navigator with role-neutral presets; do not remove sections or permission checks.
- [ ] Interpose a review/confirm state before the existing POST calls; the final submit must reuse the current payload and validation.
- [ ] Run focused tests, inspect mobile action placement, and commit.

### Task 4: Separate Maintenance board/table and make Disposal next actions explicit

**Files:**
- Modify: `src/lib/maintenance-view.ts`
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Create: `src/lib/disposal-stage.ts`
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/maintenance-view.test.ts`, `tests/disposal-stage.test.ts`, `tests/maintenance-disposal-ui.test.ts`

**Interfaces:**
- Extend `buildMaintenanceViewHref(locale, view, assetId, layout)` to preserve filters and set only valid `layout=table|board` values.
- `getDisposalStage(requestStatus)` returns one of `pending_approval`, `awaiting_execution`, `complete`, or `rejected`.
- `getDisposalNextAction(stage, canApprove, canExecute)` returns one labelled action, never competing actions.

- [ ] Write failing tests for layout URL parsing and disposal stage/action mapping.
- [ ] Render only the selected Maintenance representation at a time while retaining the existing filters and ticket/PM split.
- [ ] Add a concise stage and one contextual next action to each Disposal row/card; retain existing approval/execution controls and RBAC checks.
- [ ] Run focused tests and commit.

### Task 5: Add named Report presets and findable Settings

**Files:**
- Create: `src/lib/report-presets.ts`
- Create: `src/components/reports/report-preset-controls.tsx`
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`
- Create: `src/lib/settings-search.ts`
- Modify: `src/components/admin/system-settings-form.tsx`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/report-presets.test.ts`, `tests/report-presets-ui.test.ts`, `tests/settings-search.test.ts`, `tests/settings-search-ui.test.ts`

**Interfaces:**
- `normalizeReportPreset(input)` accepts only a bounded label and safe report query fields.
- `findSettingsSections(query, sections)` returns matching tab/field references and no hidden or permission-only data.

- [ ] Write failing tests for preset normalization and setting-field search rankings.
- [ ] Add client-side named presets scoped to the current browser profile, clearly labelled as local shortcuts; existing export permissions must remain in their current protected paths.
- [ ] Add Settings search that moves to the matching tab and a changed-field summary that links back to the section before save.
- [ ] Run focused tests and commit.

### Task 6: Resume Audit work by existing round scope

**Files:**
- Create: `src/lib/audit-field-workspace.ts`
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx`
- Modify: `src/components/audit/audit-scan-form.tsx`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/audit-field-workspace.test.ts`, `tests/audit-pending-mobile-ux.test.ts`, `tests/audit-scan-field-mode-ux.test.ts`

**Interfaces:**
- `parseAuditFieldWorkspace(search)` accepts only an existing `zone`/`location` scope encoded by the round page.
- `buildAuditFieldWorkspaceHref(locale, auditRoundId, current, overrides)` preserves audit round identity and existing mobile scan behavior.

- [ ] Write failing tests proving a saved location/department selection never creates a new Audit Round or mutates audit item status.
- [ ] Add per-location/department progress and a resume link inside the existing round, with pending cards retaining `Mark Not Found` only for expected assets.
- [ ] Store the last local field scope as a client preference and offer it only when still present in the current round.
- [ ] Run focused tests and commit.

### Task 7: Normalize Master Data workspace behavior

**Files:**
- Modify: `src/components/master-data/master-data-layout.tsx`
- Modify: `src/app/[locale]/(dashboard)/master-data/{companies,branches,locations,employees,suppliers}/page.tsx`
- Modify: `src/lib/master-data-query.ts`
- Test: `tests/master-data-workspace-ui.test.ts`, `tests/master-data-return-navigation.test.ts`, `tests/organization-master-query.test.ts`

**Interfaces:**
- `buildMasterDataQueryString(current, overrides)` remains the canonical query serializer and must preserve active state, page size, sort, and search.

- [ ] Write failing tests for a shared active/inactive control and stable row action semantics across the five target masters.
- [ ] Extend the existing shared master-data layout rather than creating a second shell; apply it only to the target pages.
- [ ] Run focused tests on master data query and return-navigation behavior, then commit.

### Task 8: Standardize page-state copy and UAT coverage

**Files:**
- Modify: `src/components/ui/action-empty-state.tsx`
- Modify: `src/app/[locale]/(dashboard)/error.tsx`
- Modify: `src/app/[locale]/(dashboard)/access-denied/page.tsx`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `DEVELOPER_HANDOFF.md`
- Test: `tests/action-empty-state-ui.test.ts`, `tests/page-state-consistency-ui.test.ts`

- [ ] Write failing source tests for consistent empty/error/permission-denied action hierarchy and 44px mobile actions.
- [ ] Consolidate copy/action props through the existing shared empty-state component; preserve route-specific recovery links and error IDs.
- [ ] Add UAT cases for Work Center, operation review, Maintenance layout, Report local presets, Settings search, and Audit resume.
- [ ] Run focused tests and commit.

### Task 9: Integrated verification and release evidence

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/99_CHANGELOG.md`

- [ ] Run `npm run lint`, `npm test`, and `npm run verify -- --skip-build`.
- [ ] Run `npm run build`; if the isolated environment lacks SQL Server configuration, record the exact data-collection limitation rather than treating it as a UI failure.
- [ ] Inspect Dashboard, Work Center, Asset Detail, Maintenance, Disposal, Reports, Settings, Audit Scan, and two Master Data pages at 375px, 768px, and desktop using the local server/session where available.
- [ ] Update handoff/change history with completed work and manual-device gates, inspect the complete diff, commit, and push the branch.
