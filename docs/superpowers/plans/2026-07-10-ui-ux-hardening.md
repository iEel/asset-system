# UI/UX Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Asset Scan, Audit Scan, shared controls, employee self-service, and high-traffic UI surfaces safer and easier to use without changing business workflows.

**Architecture:** Preserve server-side permissions and existing route ownership. Add small pure helpers where behavior needs regression tests, use shared components for repeated interaction semantics, and retain the current responsive desktop/mobile split.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, next-intl, Tailwind CSS 4, Prisma/SQL Server, Node test runner.

## Global Constraints

- Do not rewrite audit, lifecycle, RBAC, SOD, attachment, or API behavior.
- Use the existing Navy/White/Electric Blue semantic token system and Lucide icons.
- Keep mobile field tasks free of colliding fixed navigation and action bars.
- Keep `returnTo` values internal and allowlisted.
- Maintain Thai and English messages for new user-visible copy.
- Write a failing test before each production behavior change.

---

### Task 1: Stabilize field scan context and return navigation

**Files:**
- Modify: `src/components/audit/audit-scan-form.tsx`
- Modify: `src/components/assets/asset-scan-search-tool.tsx`
- Modify: `src/lib/asset-return-navigation.ts`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/audit-scan-field-ux.test.ts`, `tests/asset-scan-return-navigation.test.ts`

- [ ] Write failing source/route tests for clearing old feedback and preserving the General Scan return path.
- [ ] Run the focused tests and confirm they fail because the current target and route only retain the previous state.
- [ ] Clear feedback on target change, allowlist the scanner return route, and expose a mobile scan-next action only for scanner-origin detail views.
- [ ] Add polite live announcements to current scan feedback and offline queue state.
- [ ] Run focused tests, lint, commit, and push.

### Task 2: Make shared selects and confirmations accessible

**Files:**
- Create: `src/lib/searchable-select-navigation.ts`
- Modify: `src/components/ui/searchable-select.tsx`
- Create: `src/components/ui/confirm-text-dialog.tsx`
- Modify: `src/components/audit/audit-findings-batch-actions.tsx`
- Modify: `src/components/assets/asset-components-panel.tsx`
- Test: `tests/searchable-select-navigation.test.ts`, `tests/searchable-select-accessibility.test.ts`, `tests/confirm-text-dialog-ui.test.ts`

- [ ] Write pure failing tests for enabled-option keyboard navigation and source tests for combobox/dialog semantics.
- [ ] Run focused tests and confirm the current control has no active-option keyboard behavior and prompts remain native browser prompts.
- [ ] Implement the reusable navigation helper, keyboard-complete select, and focus-managed confirmation/reason dialog.
- [ ] Replace batch-review and component-removal prompts with the shared dialog.
- [ ] Run focused tests, lint, commit, and push.

### Task 3: Add employee-scoped My Asset detail

**Files:**
- Modify: `src/lib/my-assets.ts`
- Create: `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/my-assets/page.tsx`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/my-assets-detail.test.ts`, `tests/my-assets-route-ui.test.ts`

- [ ] Write failing tests for custodian-scoped detail queries, protected fields, and links from both card and table views.
- [ ] Run focused tests and confirm the current My Assets list has no scoped detail route or links.
- [ ] Implement the read-only scoped detail page and link list surfaces to it.
- [ ] Run focused tests, lint, commit, and push.

### Task 4: Improve settings persistence and loading feedback

**Files:**
- Create: `src/lib/system-settings-tabs.ts`
- Modify: `src/components/admin/system-settings-form.tsx`
- Create: `src/app/[locale]/(dashboard)/assets/[id]/loading.tsx`
- Create: `src/app/[locale]/(dashboard)/reports/loading.tsx`
- Test: `tests/system-settings-tabs.test.ts`, `tests/settings-information-architecture.test.ts`, `tests/loading-boundaries.test.ts`

- [ ] Write failing tests for tab parsing, URL-backed tab state, unload warning, and route-specific loading boundaries.
- [ ] Run focused tests and confirm settings always restart on the first tab and high-cost routes lack dedicated loading files.
- [ ] Implement safe tab parsing, query-state synchronization, browser unload protection, and visual loading boundaries based on existing skeletons.
- [ ] Run focused tests, lint, commit, and push.

### Task 5: Complete visual consistency and release evidence

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/manifest.ts`, `src/app/globals.css`
- Modify: `src/components/ui/action-empty-state.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `docs/07_UAT_CHECKLIST.md`, `DEVELOPER_HANDOFF.md`
- Test: `tests/pwa-install-prompt.test.ts`, `tests/asset-detail-ui.test.ts`, `tests/action-empty-state-ui.test.ts`

- [ ] Write failing tests for documented theme colors, Thai-capable font selection, semantic status UI, and 44px empty-state action targets.
- [ ] Run focused tests and confirm current raw colors and compact CTA behavior.
- [ ] Implement semantic status presentation, token-aligned PWA chrome, Thai-capable typography, and touch-safe empty-state actions.
- [ ] Update UAT/Handoff with completed automated coverage and retained real-device UAT requirements.
- [ ] Run `npm run lint`, `npm test`, `npm run verify`, inspect the diff, commit, and push.
