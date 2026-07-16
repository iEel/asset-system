# General Asset Scan Mobile UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the General Asset Scan mobile navigation continuity, touch sizing, scanner control clarity, accessible labeling, and asset-specific copy without changing business behavior.

**Architecture:** Keep route ownership in the shared mobile-shell policy, but classify General Asset Scan as Navigation Mode because it has no fixed contextual action bar. Improve the reusable scanner through an optional native-input `id` and mobile-first control classes; keep page-specific labeling and copy in the asset scan page.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, next-intl, Node test runner.

## Global Constraints

- No API, schema, RBAC, SOD, audit workflow, exact QR routing, camera runtime, or dependency changes.
- General Asset Scan shows Mobile Field Navigation; Audit Scan and contextual-action routes remain Focus Task routes.
- Mobile interactive controls are at least 44px and do not depend on icon-only meaning.
- Thai and English copy must describe asset-only search.

---

### Task 1: Lock the approved behavior with failing tests

**Files:**
- Modify: `tests/mobile-field-navigation.test.ts`
- Modify: `tests/asset-scan-search-tool.test.ts`
- Modify: `tests/scanner-text-input.test.ts`

**Interfaces:**
- Consumes: `getMobileShellMode(pathname): "navigation" | "focus"`
- Produces: regression contracts for navigation, page semantics/copy, and shared scanner controls.

- [ ] Change the route-policy assertion so `/th/asset-management/scan` is expected in Navigation Mode while `/th/audit/rounds/round-1/scan` remains Focus Mode.
- [ ] Add source tests requiring an explicit label/input association, the asset-specific translation key in both locales, and removal of the Global Search placeholder.
- [ ] Add shared scanner tests requiring an optional input `id`, a 44px minimum input, visible mobile toggle text, and exactly one stop control.
- [ ] Run `node --test tests/mobile-field-navigation.test.ts tests/asset-scan-search-tool.test.ts tests/scanner-text-input.test.ts` and confirm failures are caused by the missing behavior.

### Task 2: Implement navigation continuity and scan-page semantics

**Files:**
- Modify: `src/lib/mobile-field-navigation.ts`
- Modify: `src/components/assets/asset-scan-search-tool.tsx`
- Modify: `src/app/[locale]/(dashboard)/asset-management/scan/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes: `getMobileShellMode`, `AssetScanSearchTool` labels, `assetTools.scanPlaceholder`.
- Produces: General Asset Scan Navigation Mode and an explicitly labelled asset-only search input.

- [ ] Remove only the General Asset Scan branch from `focusTaskRoutes`.
- [ ] Replace the wrapping field label with a label using `htmlFor="asset-scan-query"` and pass `id="asset-scan-query"` to `ScannerTextInput`.
- [ ] Add `assetTools.scanPlaceholder` in Thai and English and pass it from the page instead of `globalSearch.placeholder`.
- [ ] Run the focused route and asset-scan tests and confirm they pass.

### Task 3: Implement the reusable mobile scanner control fixes

**Files:**
- Modify: `src/components/ui/scanner-text-input.tsx`
- Test: `tests/scanner-text-input.test.ts`

**Interfaces:**
- Consumes: existing scanner labels and optional `id?: string`.
- Produces: one labelled start/stop toggle, native input association, and minimum 44px mobile sizing.

- [ ] Add optional `id?: string` to `ScannerTextInputProps` and apply it to the input.
- [ ] Make the input `min-h-11 w-full` on mobile and restrict flex growth to the row layout at `sm`.
- [ ] Keep toggle text visible on mobile and remove the duplicate scanner-panel stop button.
- [ ] Preserve scanner start/stop behavior, loading feedback, preview, torch, zoom, and desktop sizing.
- [ ] Run the scanner and asset-scan tests and confirm they pass.

### Task 4: Reconcile documentation and verify the complete change

**Files:**
- Modify: `docs/superpowers/specs/2026-07-10-mobile-field-navigation-design.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/99_CHANGELOG.md`

**Interfaces:**
- Produces: current route-policy and UAT documentation that no longer claims General Asset Scan is Focus Mode.

- [ ] Document that General Asset Scan stays in Navigation Mode because its scanner controls are inline; Audit Scan remains Focus Mode.
- [ ] Run focused tests, scoped ESLint, `npx tsc --noEmit`, `npm test`, and `npm run verify`.
- [ ] Browser-test at 390x844 before and after opening the scanner: one active Scan dock, 44px input, visible toggle copy, one stop control, no horizontal overflow, and no console errors.
- [ ] Review `git diff --check` and `git status --short`, preserving unrelated dirty files.
