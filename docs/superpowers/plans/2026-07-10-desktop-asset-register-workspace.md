# Desktop Asset Register Workspace Implementation Plan

> **For the implementation agent:** Execute the tasks in order, keeping the current Asset Register URL contract and permission checks intact.

## Task 1: Add deterministic browser-view memory helpers

**Files:**
- Create: `src/lib/asset-register-view-memory.ts`
- Create: `tests/asset-register-view-memory.test.ts`

**Steps:**
1. Write tests for extracting only persisted Asset Register parameters, ignoring pagination and unknown parameters.
2. Write tests for stable local/session storage keys.
3. Implement the helper functions until tests pass.

## Task 2: Restore the saved view and detail-return scroll position

**Files:**
- Create: `src/components/assets/asset-register-view-memory.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx`
- Modify: `src/components/assets/asset-register-table.tsx`
- Modify: `src/components/layout/dashboard-shell.tsx`
- Modify: `tests/asset-register-ux.test.ts`

**Steps:**
1. Mount a small client component on Asset Register to update browser-local view memory and restore a bare register route.
2. Give the dashboard content scroller a stable hook.
3. Capture scroll position before detail navigation and restore it only for matching return URLs.
4. Assert bulk controls stay conditional on selection and detail links use the scroll-memory handoff.

## Task 3: Standardize state surfaces

**Files:**
- Modify: `src/components/ui/action-empty-state.tsx`
- Modify: `src/components/assets/asset-register-table.tsx`
- Modify: `src/app/[locale]/(dashboard)/access-denied/page.tsx`
- Create: `src/app/[locale]/(dashboard)/error.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/asset-register-ux.test.ts`

**Steps:**
1. Extend the existing reusable state component with semantic empty/error/denied tones and optional secondary action.
2. Use it for zero-result Asset Register states, access denied, and a client dashboard error boundary.
3. Add Thai and English state copy.
4. Test source integration and translation coverage.

## Task 4: Verify and publish

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/99_CHANGELOG.md`

**Steps:**
1. Run focused tests, then `npm test`, `npm run build`, and `npm run verify`.
2. Inspect Asset Register in desktop browser with a filtered URL and detail-return path.
3. Update the handoff and changelog with the browser-local scope and manual verification steps.
4. Commit only files from this feature branch and push `codex/desktop-register-workspace`.
