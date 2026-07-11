# Asset Detail UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Asset Detail usability on mobile and desktop while preserving existing lifecycle, component relationship, RBAC, evidence, and return-navigation behavior.

**Architecture:** Keep the URL-backed four-view Asset Detail route and existing APIs. Extract small presentation helpers and view-aware data boundaries from the large server page, retain the full relationship map, and adapt only its responsive presentation. Every behavior change starts with a focused failing test and ends with browser verification.

**Tech Stack:** Next.js 16.2.4 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 7 SQL Server, next-intl, lucide-react, Node test runner.

## Global Constraints

- Preserve `view=overview|custody|operations|audit`, `returnTo`, RBAC, SOD, audit trail, lifecycle APIs, and evidence permissions.
- Keep the full relationship map and its parent/current/children meaning.
- Use existing Navy/White/Action Blue tokens and Lucide icons.
- Mobile touch targets remain at least 44px and body-level horizontal scrolling is forbidden.
- Do not change database schema or API contracts.

---

### Task 1: Mobile Action Bar And Header Accessibility

**Files:**
- Modify: `src/components/ui/mobile-action-bar.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Test: `tests/mobile-action-bar.test.ts`
- Test: `tests/asset-detail-ux.test.ts`

- [ ] Add failing tests for one-to-three adaptive action columns and a named mobile back link.
- [ ] Run the focused tests and confirm the expected failures.
- [ ] Implement static column mappings and an accessible back label without changing actions.
- [ ] Run focused tests and commit.

### Task 2: Discoverable Mobile Detail Tabs

**Files:**
- Modify: `src/components/assets/asset-detail-tabs.tsx`
- Test: `tests/asset-detail-tabs.test.ts`

- [ ] Add failing tests for scroll snap, edge affordance, and active-tab visibility hooks.
- [ ] Run the focused test and confirm failure.
- [ ] Implement a compact scrollable tab strip with a right-edge cue and snap alignment.
- [ ] Run focused tests and commit.

### Task 3: Responsive Relationship Map

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Test: `tests/asset-relationship-map-ui.test.ts`

- [ ] Add failing tests for vertical mobile relationship flow, full-card links, and bounded child previews.
- [ ] Run focused tests and confirm failure.
- [ ] Preserve the full map on desktop while stacking parent/current/children on mobile and limiting initial child rows.
- [ ] Run focused tests and commit.

### Task 4: First Viewport Hierarchy And Activity Copy

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/asset-detail-ux.test.ts`

- [ ] Add failing tests for compact identity status/responsibility content, one actionable follow-up surface, and localized audit status copy.
- [ ] Run focused tests and confirm failure.
- [ ] Move status, condition, location, and responsibility into the identity summary; remove repeated overview summary facts; keep full details below.
- [ ] Format activity copy without duplicated titles or raw workflow enums.
- [ ] Run focused tests and commit.

### Task 5: View-Aware Asset Detail Data

**Files:**
- Create: `src/lib/asset-detail-data.ts`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Test: `tests/asset-detail-data-boundaries.test.ts`

- [ ] Add failing tests that define common and per-view relation/evidence loading boundaries.
- [ ] Run focused tests and confirm failure.
- [ ] Extract view predicates and condition heavy Prisma includes/secondary queries by active view while retaining lightweight header data.
- [ ] Keep Evidence Center complete by loading its index through the existing drawer path or an explicit on-demand boundary.
- [ ] Run focused tests and commit.

### Task 6: Regression QA And Documentation

**Files:**
- Modify: `tests/asset-detail-ux.test.ts`
- Modify: `tests/asset-return-navigation.test.ts`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/superpowers/specs/2026-07-10-asset-detail-components-ux-design.md`

- [ ] Add regression coverage for tab navigation, return context, permission-filtered actions, and responsive map/action patterns.
- [ ] Run focused tests, lint, typecheck, full tests, build, and verify.
- [ ] Inspect the authenticated page in Chrome at 390px, 768px, and desktop and retain screenshots outside Git.
- [ ] Update handoff and UAT notes with implemented behavior and remaining real-device/limited-role checks.
- [ ] Commit documentation and verification evidence summary.
