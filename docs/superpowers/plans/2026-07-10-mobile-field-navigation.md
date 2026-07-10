# Mobile Field Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permission-aware five-item mobile field navigation bar that is mutually exclusive with scanner and contextual action bars.

**Architecture:** Put pure pathname and keyboard decisions in `src/lib/mobile-field-navigation.ts`, render one client navigation component from the existing `DashboardShell`, and reuse the current Sidebar for More. `DashboardShell` remains the single owner of shell mode, bottom padding, and topbar visibility.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, next-intl, Lucide React, Node test runner.

## Global Constraints

- Preserve all Asset, Audit, QR, manual entry, offline queue, RBAC, SOD, API, and database behavior.
- Never display Mobile Field Navigation and a contextual bottom action bar on the same route.
- Use Lucide icons and 44px minimum mobile touch targets.
- Keep Thai and English messages complete.
- Use Navigation Mode for Audit Pending and Focus Task Mode for Audit Scan.

---

### Task 1: Route And Keyboard Policy

**Files:**
- Create: `src/lib/mobile-field-navigation.ts`
- Create: `tests/mobile-field-navigation.test.ts`

**Interfaces:**
- Produces: `getMobileShellMode(pathname)`, `getMobileFieldNavigationActiveItem(pathname)`, `isMobileVirtualKeyboardVisible(viewportHeight, layoutHeight)`.

- [ ] **Step 1: Write the failing policy tests**

Cover locale-prefixed dashboard/assets/audit paths, general and audit scanner focus paths, Audit Pending navigation mode, detail/action-bar focus paths, active item mapping, and the 120px virtual-keyboard threshold.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test --experimental-strip-types tests/mobile-field-navigation.test.ts`

Expected: FAIL because `src/lib/mobile-field-navigation.ts` does not exist.

- [ ] **Step 3: Implement the pure policy helpers**

Normalize query/hash/trailing slashes, remove the leading locale segment, evaluate explicit focus route patterns, and return one active destination from `home | assets | scan | audit | more`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test --experimental-strip-types tests/mobile-field-navigation.test.ts`

Expected: all mobile field navigation policy tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mobile-field-navigation.ts tests/mobile-field-navigation.test.ts
git commit -m "test: define mobile shell route policy"
```

### Task 2: Permission-Aware Navigation Shell

**Files:**
- Create: `src/components/layout/mobile-field-navigation.tsx`
- Modify: `src/components/layout/dashboard-shell.tsx`
- Modify: `src/components/layout/topbar.tsx`
- Modify: `src/lib/navigation-permissions.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Create: `tests/mobile-field-navigation-ui.test.ts`

**Interfaces:**
- Consumes: Task 1 policy helpers and existing `SessionUser`/navigation permission rules.
- Produces: `MobileFieldNavigation({ user, onOpenMore })` and a `mobileFieldNavigationVisible` topbar prop.

- [ ] **Step 1: Write the failing UI contract tests**

Assert five Lucide destinations, permission-aware asset/audit/scan visibility, employee My Assets fallback, labelled nav and `aria-current`, More opening the existing sidebar, route-driven shell padding, and topbar shortcut deduplication.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test --experimental-strip-types tests/mobile-field-navigation-ui.test.ts`

Expected: FAIL because the navigation component and shell integration do not exist.

- [ ] **Step 3: Build the mobile field navigation component**

Use `House`, `Package`, `ScanLine`, `ClipboardCheck`, and `Ellipsis`; use Link for destinations and a button for More. Filter items using the existing permission semantics and elevate only the center Scan action.

- [ ] **Step 4: Integrate shell mode and virtual keyboard behavior**

Use `usePathname()` in `DashboardShell`, add safe-area bottom padding only in Navigation Mode, observe `visualViewport`, render one bottom bar, and pass its visibility to Topbar so mobile menu/scan shortcuts are not duplicated.

- [ ] **Step 5: Add Thai and English labels**

Add `mobileNavigationLabel`, `mobileHome`, `mobileAssets`, `mobileScan`, `mobileAudit`, and `mobileMore` under `nav` in both message files.

- [ ] **Step 6: Run focused and regression tests**

Run: `node --test --experimental-strip-types tests/mobile-field-navigation.test.ts tests/mobile-field-navigation-ui.test.ts tests/dashboard-shell-theme.test.ts tests/navigation-permissions.test.ts`

Expected: all focused tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout src/lib/navigation-permissions.ts messages tests/mobile-field-navigation-ui.test.ts
git commit -m "feat: add adaptive mobile field navigation"
```

### Task 3: Quality Gate And Documentation

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/99_CHANGELOG.md`

**Interfaces:**
- Consumes: completed navigation and focus-mode behavior.
- Produces: durable mobile QA instructions and release history.

- [ ] **Step 1: Document the navigation/focus-mode acceptance criteria**

Record that only one bottom bar is visible, Audit Pending owns Not Found, manual Asset Tag/Serial entry remains available, and scanner routes retain existing workflows.

- [ ] **Step 2: Run the full verification suite**

Run: `npm run verify`

Expected: lint, 665+ tests, Prisma generation, TypeScript, and production build pass.

- [ ] **Step 3: Browser-test mobile navigation and focus routes**

At 375px and 390px, inspect Dashboard, Assets, Audit Rounds, Audit Pending, General Scan, and Audit Scan. Confirm no body overflow, 44px targets, correct safe-area spacing, and exactly one bottom bar.

- [ ] **Step 4: Commit**

```bash
git add DEVELOPER_HANDOFF.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md
git commit -m "docs: record mobile field navigation QA"
```
